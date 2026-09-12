import assert from 'node:assert/strict';
import { mkdirSync, unlinkSync, utimesSync, writeFileSync } from 'node:fs';
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
