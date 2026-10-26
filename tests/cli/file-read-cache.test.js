import assert from 'node:assert/strict';
import fs from 'node:fs';
import { mkdirSync, unlinkSync, utimesSync, writeFileSync } from 'node:fs';
import { syncBuiltinESMExports } from 'node:module';
import path from 'node:path';
import { test } from 'node:test';
import { fileReadCacheStats, reuseFileRead, withFileReadCache } from '../../dist/core/file-read-cache.js';
import { readFileInsideWithoutSymlinks } from '../../dist/core/safe-filesystem.js';
import { createTempProject, removeTempProject } from './helpers/cli-harness.js';

test('inspection cache reuses bytes without sharing mutable buffers or crossing scopes', () => {
	let reads = 0;
	withFileReadCache(() => {
		const original = reuseFileRead('key', () => { reads++; return Buffer.from('safe'); });
		original[0] = 0;
		const reused = reuseFileRead('key', () => { throw new Error('unexpected read'); });
		assert.equal(reused.toString(), 'safe');
		reused[0] = 0;
		assert.equal(reuseFileRead('key', () => Buffer.alloc(0)).toString(), 'safe');
		assert.deepEqual(fileReadCacheStats(), { hits: 2, misses: 1, bytes: 4 });
	});
	assert.equal(fileReadCacheStats(), null);
	withFileReadCache(() => reuseFileRead('key', () => { reads++; return Buffer.from('new'); }));
	assert.equal(reads, 2);
});

test('cached safe reads still reject tighter budgets, deletions and nonfiles, and observe file changes', () => {
	const root = createTempProject();
	const target = path.join(root, 'input.txt');
	try {
		writeFileSync(target, 'first');
		withFileReadCache(() => {
			const read = maxBytes => readFileInsideWithoutSymlinks(root, target, { maxBytes }).toString();
			assert.equal(read(100), 'first');
			assert.equal(read(100), 'first');
			assert.equal(fileReadCacheStats().hits, 1);
			assert.throws(() => read(2), /maximum size/u);
			writeFileSync(target, 'other');
			utimesSync(target, new Date(100000), new Date(100000));
			assert.equal(read(100), 'other');
			unlinkSync(target);
			assert.throws(() => read(100));
			mkdirSync(target);
			assert.throws(() => read(100), /regular file|EISDIR|EPERM/u);
		});
	} finally { removeTempProject(root); }
});

for (const changedField of ['ino', 'mtimeNs', 'ctimeNs']) {
	test(`safe read cache distinguishes exact ${changedField} changes hidden by numeric rounding`, (t) => {
		const root = createTempProject();
		const target = path.join(root, 'input.txt');
		const originals = { openSync: fs.openSync, closeSync: fs.closeSync, fstatSync: fs.fstatSync };
		const descriptors = new Set();
		const before = { dev: 1n, ino: 9_007_199_254_740_992n, size: 4n,
			mtimeNs: 1_790_000_000_000_000_000n, ctimeNs: 1_790_000_000_000_000_000n };
		const after = { ...before, [changedField]: before[changedField] + (changedField === 'ino' ? 1n : 100n) };
		let changed = false;
		const numeric = value => ({ dev: Number(value.dev), ino: Number(value.ino), size: Number(value.size),
			mtimeMs: Number(value.mtimeNs) / 1e6, ctimeMs: Number(value.ctimeNs) / 1e6 });
		assert.deepEqual(numeric(before), numeric(after), 'fixture must collide only after numeric rounding');
		try {
			writeFileSync(target, 'old!');
			fs.openSync = (file, ...args) => {
				const fd = originals.openSync(file, ...args);
				if (file === target) descriptors.add(fd);
				return fd;
			};
			fs.closeSync = fd => { descriptors.delete(fd); return originals.closeSync(fd); };
			fs.fstatSync = (fd, options) => {
				const stats = originals.fstatSync(fd, options);
				if (!descriptors.has(fd)) return stats;
				const exact = changed ? after : before;
				return Object.assign(stats, options?.bigint ? exact : numeric(exact));
			};
			syncBuiltinESMExports();
			withFileReadCache(() => {
				assert.equal(readFileInsideWithoutSymlinks(root, target).toString(), 'old!');
				writeFileSync(target, 'new!');
				changed = true;
				const updated = readFileInsideWithoutSymlinks(root, target).toString();
				const repeated = readFileInsideWithoutSymlinks(root, target).toString();
				t.diagnostic(JSON.stringify({ changedField, staleRead: updated !== 'new!', ...fileReadCacheStats() }));
				assert.equal(updated, 'new!');
				assert.equal(repeated, 'new!');
				assert.equal(fileReadCacheStats().misses, 2);
				assert.equal(fileReadCacheStats().hits, 1);
			});
		} finally {
			Object.assign(fs, originals);
			syncBuiltinESMExports();
			removeTempProject(root);
		}
	});
}

test('inspection cache bounds stored bytes and isolates concurrent async checks', async () => {
	await Promise.all(['one', 'two'].map(value => withFileReadCache(async () => {
		reuseFileRead('shared-key', () => Buffer.from(value));
		await Promise.resolve();
		assert.equal(reuseFileRead('shared-key', () => Buffer.alloc(0)).toString(), value);
	})));
	withFileReadCache(() => {
		reuseFileRead('oversized', () => Buffer.alloc(1024 * 1024 + 1));
		assert.equal(fileReadCacheStats().bytes, 0);
		for (let index = 0; index < 20; index++) reuseFileRead(String(index), () => Buffer.alloc(1024 * 1024));
		assert.ok(fileReadCacheStats().bytes <= 16 * 1024 * 1024);
	});
});
