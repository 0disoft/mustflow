import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import { syncBuiltinESMExports } from 'node:module';
import path from 'node:path';
import { test } from 'node:test';
import { createFailureReplayCapsule } from '../../dist/core/failure-replay-capsule.js';
import { createTempProject, removeTempProject } from './helpers/cli-harness.js';

function capsuleFor(projectRoot, files) {
	return createFailureReplayCapsule({
		projectRoot, verificationPlanId: 'sha256:fixture', status: 'failed', reasons: ['fixture'],
		failureFingerprint: null, createdAt: new Date('2026-10-27T00:00:00.000Z'),
		report: { files, requirements: [], risk_assessment: { reasons: [], blocking_gaps: [] }, gaps: [] },
		results: [{ intent: 'build', status: 'failed', skipped: false, reason: null, detail: null,
			exit_code: 1, receipt_path: null, receipt_sha256: null, receipt: null }],
	});
}

function measureReads(target, callback, failAfterBytes = Infinity) {
	const originals = Object.fromEntries(['openSync', 'closeSync', 'readSync', 'readFileSync'].map(name => [name, fs[name]]));
	const descriptors = new Set();
	const metrics = { largestBufferBytes: 0, contentBytesRead: 0, opened: 0, closed: 0 };
	try {
		fs.openSync = (file, ...args) => {
			const fd = originals.openSync(file, ...args);
			if (typeof file === 'string' && path.resolve(file) === target) { descriptors.add(fd); metrics.opened += 1; }
			return fd;
		};
		fs.closeSync = fd => {
			if (descriptors.delete(fd)) metrics.closed += 1;
			return originals.closeSync(fd);
		};
		fs.readSync = (fd, buffer, ...args) => {
			if (!descriptors.has(fd)) return originals.readSync(fd, buffer, ...args);
			metrics.largestBufferBytes = Math.max(metrics.largestBufferBytes, buffer.byteLength);
			if (metrics.contentBytesRead >= failAfterBytes) throw new Error('injected read failure');
			const count = originals.readSync(fd, buffer, ...args);
			metrics.contentBytesRead += count;
			return count;
		};
		fs.readFileSync = (file, ...args) => {
			const content = originals.readFileSync(file, ...args);
			if (file === target) metrics.largestBufferBytes = Math.max(metrics.largestBufferBytes, content.byteLength);
			return content;
		};
		syncBuiltinESMExports();
		return { result: callback(), metrics };
	} finally {
		Object.assign(fs, originals);
		syncBuiltinESMExports();
		for (const fd of descriptors) originals.closeSync(fd);
	}
}

test('failure replay fingerprints large files with bounded buffers and exact hashes', t => {
	const root = createTempProject('mustflow-replay-bounded-hash-');
	try {
		const target = path.join(root, 'data.bin');
		const chunk = Buffer.alloc(64 * 1024, 0xa5);
		const expectedHash = createHash('sha256');
		const fd = fs.openSync(target, 'w');
		try {
			for (let index = 0; index < 512; index += 1) { fs.writeSync(fd, chunk); expectedHash.update(chunk); }
			fs.writeSync(fd, chunk.subarray(0, 17));
			expectedHash.update(chunk.subarray(0, 17));
		} finally { fs.closeSync(fd); }
		const { result, metrics } = measureReads(target, () => capsuleFor(root, ['data.bin']));
		assert.deepEqual(result.affected_files, [{ path: 'data.bin', status: 'present',
			sha256: `sha256:${expectedHash.digest('hex')}`, bytes: 512 * chunk.length + 17 }]);
		t.diagnostic(JSON.stringify({ fileBytes: result.affected_files[0].bytes, ...metrics }));
		assert.ok(metrics.largestBufferBytes <= chunk.length, `unbounded read buffer: ${metrics.largestBufferBytes}`);
		assert.equal(metrics.contentBytesRead, result.affected_files[0].bytes);
		assert.equal(metrics.opened, 1);
		assert.equal(metrics.closed, 1);
	} finally { removeTempProject(root); }
});

test('failure replay closes the file on read failure and preserves file status behavior', () => {
	const root = createTempProject('mustflow-replay-read-failure-');
	try {
		const target = path.join(root, 'data.bin');
		fs.writeFileSync(target, Buffer.alloc(128 * 1024, 0xa5));
		const { result, metrics } = measureReads(target, () => capsuleFor(root, ['data.bin']), 64 * 1024);
		assert.deepEqual(result.affected_files, [{ path: 'data.bin', status: 'unreadable', sha256: null, bytes: null }]);
		assert.equal(metrics.opened, 1);
		assert.equal(metrics.closed, 1);
		fs.writeFileSync(path.join(root, 'empty.bin'), '');
		fs.mkdirSync(path.join(root, 'directory'));
		const files = capsuleFor(root, ['empty.bin', 'missing.bin', 'directory', '../outside.bin']).affected_files;
		assert.deepEqual(files.map(file => [file.path, file.status]), [
			['../outside.bin', 'outside_root'], ['directory', 'unreadable'], ['empty.bin', 'present'], ['missing.bin', 'missing'],
		]);
		assert.equal(files[2].bytes, 0);
		assert.equal(files[2].sha256, `sha256:${createHash('sha256').digest('hex')}`);
	} finally { removeTempProject(root); }
});
