import assert from 'node:assert/strict';
import { EventEmitter, getEventListeners } from 'node:events';
import { test } from 'node:test';
import { getRunStatus, runArgvCommandStreaming, runShellCommandStreaming } from '../../dist/cli/commands/run/executor.js';

const timestamp = '2026-11-04T00:00:00.000Z';
const parentSignals = ['SIGINT', 'SIGTERM', 'SIGHUP'];

function fixture() {
	let clock = 0;
	let inspection = 'gone';
	let unrefs = 0;
	const timers = new Set();
	const signals = [];
	const stdout = [];
	const stderr = [];
	const listeners = parentSignals.map((signal) => process.listenerCount(signal));
	const stream = () => Object.assign(new EventEmitter(), { destroy() {} });
	const child = Object.assign(new EventEmitter(), {
		pid: 123, stdout: stream(), stderr: stream(), unref() { unrefs += 1; },
	});
	const runtime = {
		now: () => clock,
		timestamp: () => timestamp,
		spawn: () => child,
		scheduleTimeout(callback, milliseconds) {
			const timer = { callback, milliseconds };
			timers.add(timer);
			return () => timers.delete(timer);
		},
		createProcessTreeBackend: () => ({
			method: 'controlled-process-tree', gracefulSignal: 'SIGTERM', forcedSignal: 'SIGKILL',
			requestGracefulTermination: (pid) => signals.push(['graceful', pid]),
			requestForceTermination: (pid) => signals.push(['force', pid]),
			inspectProcessTree: () => inspection,
		}),
	};
	return {
		child, runtime, timers, signals, stdout, stderr,
		setClock(value) { clock = value; },
		setInspection(value) { inspection = value; },
		unrefs: () => unrefs,
		start({ shell = false, signal } = {}) {
			const command = shell ? 'controlled-child' : { executable: 'controlled-child', args: [], shell: false };
			const run = shell ? runShellCommandStreaming : runArgvCommandStreaming;
			return run(command, '.', {}, 1, 1, 10, 64, 64,
				{ stdout: (text) => stdout.push(text), stderr: (text) => stderr.push(text) },
				true, true, { signal, runtime });
		},
		fire(milliseconds) {
			const timer = [...timers].find((entry) => entry.milliseconds === milliseconds);
			assert.ok(timer, `missing ${milliseconds}ms timer`);
			timers.delete(timer);
			timer.callback();
		},
		assertClean(signal) {
			assert.equal(timers.size, 0);
			assert.deepEqual(parentSignals.map((name) => process.listenerCount(name)), listeners);
			if (signal) assert.equal(getEventListeners(signal, 'abort').length, 0);
		},
	};
}

for (const shell of [false, true]) {
	for (const elapsed of [999, 1000, 1001]) {
		test(`${shell ? 'shell' : 'argv'} completion at ${elapsed}ms enforces the deadline without timer delivery`, async () => {
			const f = fixture();
			const pending = f.start({ shell });
			f.setClock(elapsed);
			f.child.emit('close', 0, null);
			const result = await pending;
			assert.equal(getRunStatus(result.error, result.status, [0]), elapsed < 1000 ? 'passed' : 'timed_out');
			if (elapsed < 1000) {
				assert.equal(result.termination, null);
				assert.deepEqual(f.signals, []);
			} else {
				assert.equal(result.error.code, 'ETIMEDOUT');
				assert.equal(result.termination.reason, 'timeout');
				assert.equal(result.termination.direct_child_closed_at, timestamp);
				assert.equal(result.termination.confirmed, true);
				assert.deepEqual(f.signals, [['graceful', 123]]);
			}
			f.assertClean();
		});
	}
}

test('output delivered at the deadline triggers termination before forwarding or buffering it', async () => {
	const f = fixture();
	const pending = f.start();
	f.setClock(1000);
	f.child.stdout.emit('data', Buffer.from('late'));
	f.child.emit('close', 0, null);
	const result = await pending;
	assert.equal(result.error.code, 'ETIMEDOUT');
	assert.equal(result.stdout.bytes, 0);
	assert.deepEqual(f.stdout, []);
	assert.deepEqual(f.signals, [['graceful', 123]]);
	f.assertClean();
});

test('output and completion immediately before the deadline preserve normal results', async () => {
	const f = fixture();
	const pending = f.start();
	f.setClock(999);
	f.child.stdout.emit('data', Buffer.from('on time'));
	f.child.emit('close', 0, null);
	const result = await pending;
	assert.equal(result.error, undefined);
	assert.deepEqual(result.stdout, { bytes: 7, tail: 'on time' });
	assert.deepEqual(f.stdout, ['on time']);
	f.assertClean();
});

test('process startup consumes the same deadline budget', async () => {
	const f = fixture();
	f.runtime.spawn = () => { f.setClock(1000); return f.child; };
	const pending = f.start();
	assert.deepEqual(f.signals, [['graceful', 123]]);
	f.child.emit('close', 0, null);
	assert.equal((await pending).error.code, 'ETIMEDOUT');
	f.assertClean();
});

test('fractional startup time rounds the remaining timer delay up instead of expiring early', async () => {
	const f = fixture();
	f.runtime.spawn = () => { f.setClock(9.2); return f.child; };
	const pending = f.start();
	assert.deepEqual([...f.timers].map((timer) => timer.milliseconds), [991]);
	f.setClock(999.9);
	f.child.emit('close', 0, null);
	assert.equal((await pending).error, undefined);
	f.assertClean();
});

test('a pre-aborted signal invokes neither the process port nor the scheduler', async () => {
	const f = fixture();
	const reason = new Error('cancel before spawn');
	const signal = AbortSignal.abort(reason);
	f.runtime.spawn = () => { assert.fail('must not spawn'); };
	const result = await f.start({ signal });
	assert.equal(result.error.code, 'EINTERRUPTED');
	assert.equal(result.error.cause, reason);
	assert.equal(result.pid, undefined);
	f.assertClean(signal);
});

test('an abort before expiry retains its cause when a late close crosses the deadline', async () => {
	const f = fixture();
	const controller = new AbortController();
	const reason = new Error('cancel running child');
	const pending = f.start({ signal: controller.signal });
	f.setClock(999);
	controller.abort(reason);
	f.setClock(1001);
	f.child.emit('close', 0, null);
	const result = await pending;
	assert.equal(result.error.code, 'EINTERRUPTED');
	assert.equal(result.error.cause, reason);
	assert.equal(result.termination.reason, 'parent_signal');
	f.assertClean(controller.signal);
});

test('expiry before abort preserves the timeout outcome', async () => {
	const f = fixture();
	const controller = new AbortController();
	const pending = f.start({ signal: controller.signal });
	f.setClock(1000);
	f.child.stderr.emit('data', Buffer.from('late'));
	controller.abort();
	f.child.emit('close', 0, null);
	const result = await pending;
	assert.equal(result.error.code, 'ETIMEDOUT');
	assert.equal(result.termination.reason, 'timeout');
	f.assertClean(controller.signal);
});

test('an earlier output limit error is preserved at a late close', async () => {
	const f = fixture();
	const pending = f.start();
	f.setClock(999);
	f.child.stdout.emit('data', Buffer.alloc(11, 'a'));
	f.setClock(1001);
	f.child.emit('close', 0, null);
	const result = await pending;
	assert.equal(result.error.code, 'ENOBUFS');
	assert.equal(result.termination.reason, 'output_limit');
	f.assertClean();
});

test('spawn errors are preserved instead of being replaced by a timeout at close', async () => {
	const f = fixture();
	const failure = Object.assign(new Error('spawn denied'), { code: 'EACCES' });
	const pending = f.start();
	f.child.emit('error', failure);
	f.setClock(1001);
	f.child.emit('close', -1, null);
	assert.equal((await pending).error, failure);
	assert.deepEqual(f.signals, []);
	f.assertClean();
});

test('a synchronous spawn exception rejects without installing timers or signal listeners', async () => {
	const f = fixture();
	const failure = new Error('spawn failed synchronously');
	f.runtime.spawn = () => { throw failure; };
	await assert.rejects(f.start(), (error) => error === failure);
	f.assertClean();
});

test('unconfirmed cleanup remains explicit after force termination and bounded fallback', async () => {
	const f = fixture();
	f.setInspection('unknown');
	const pending = f.start();
	f.setClock(1001);
	f.child.emit('close', 0, null);
	f.fire(1000);
	f.fire(2000);
	const result = await pending;
	assert.equal(result.error.code, 'ETIMEDOUT');
	assert.equal(result.termination.confirmed, false);
	assert.equal(result.termination.cleanup_pending, true);
	assert.equal(result.termination.forced_kill_attempted, true);
	assert.deepEqual(f.signals, [['graceful', 123], ['force', 123]]);
	assert.equal(f.unrefs(), 1);
	f.assertClean();
});
