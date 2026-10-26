import assert from 'node:assert/strict';
import childProcess from 'node:child_process';
import { EventEmitter } from 'node:events';
import { syncBuiltinESMExports } from 'node:module';
import { performance } from 'node:perf_hooks';
import { test } from 'node:test';
import { createProcessTreeBackend, terminateProcessTreeNonBlocking } from '../../dist/cli/commands/run/process-tree.js';

test('Windows supervisor does not wait for a slow taskkill helper before returning to the event loop', {
	skip: process.platform !== 'win32',
}, async (t) => {
	const originalSpawn = childProcess.spawn;
	const originalSpawnSync = childProcess.spawnSync;
	const child = new EventEmitter();
	child.unref = () => {};
	let helperFinished = false;
	let timer;
	let synchronousCalls = 0;
	try {
		childProcess.spawnSync = () => {
			synchronousCalls++;
			Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 200);
			helperFinished = true;
			return { status: 0 };
		};
		childProcess.spawn = () => {
			timer = setTimeout(() => { helperFinished = true; child.emit('close', 0, null); }, 200);
			return child;
		};
		syncBuiltinESMExports();
		const started = performance.now();
		createProcessTreeBackend().requestGracefulTermination(123456);
		const elapsed = performance.now() - started;
		t.diagnostic(JSON.stringify({ simulatedHelperMs: 200, requestReturnedMs: elapsed, synchronousCalls }));
		assert.equal(synchronousCalls, 0);
		assert.equal(helperFinished, false);
		await new Promise((resolve) => setTimeout(resolve, 0));
	} finally {
		clearTimeout(timer);
		childProcess.spawn = originalSpawn;
		childProcess.spawnSync = originalSpawnSync;
		syncBuiltinESMExports();
	}
});

test('Windows nonblocking termination consumes taskkill spawn errors', {
	skip: process.platform !== 'win32',
}, () => {
	const originalSpawn = childProcess.spawn;
	const child = new EventEmitter();
	child.unref = () => {};
	try {
		childProcess.spawn = () => child;
		syncBuiltinESMExports();
		terminateProcessTreeNonBlocking(123456);
		assert.doesNotThrow(() => child.emit('error', Object.assign(new Error('fixture missing taskkill'), { code: 'ENOENT' })));
	} finally {
		childProcess.spawn = originalSpawn;
		syncBuiltinESMExports();
	}
});

test('Windows termination helper is tracked and a stalled helper is killed within its lifetime bound', {
	skip: process.platform !== 'win32',
}, async () => {
	const originalSpawn = childProcess.spawn;
	let child;
	let closed;
	let guard;
	try {
		childProcess.spawn = (_command, _args, options) => {
			child = originalSpawn(process.execPath, ['-e', 'setInterval(() => {}, 10000)'], options);
			closed = new Promise((resolve, reject) => {
				child.once('error', reject);
				child.once('close', (code, signal) => resolve({ code, signal }));
			});
			return child;
		};
		syncBuiltinESMExports();
		terminateProcessTreeNonBlocking(123456);
		const result = await Promise.race([closed, new Promise((_resolve, reject) => {
			guard = setTimeout(() => reject(new Error('taskkill helper exceeded 5000 ms')), 5000);
		})]);
		assert.equal(result.signal, 'SIGKILL');
	} finally {
		clearTimeout(guard);
		childProcess.spawn = originalSpawn;
		syncBuiltinESMExports();
		child?.kill('SIGKILL');
		await closed?.catch(() => {});
	}
});
