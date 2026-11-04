import assert from 'node:assert/strict';
import { EventEmitter, getEventListeners, once } from 'node:events';
import { writeFileSync } from 'node:fs';
import http from 'node:http';
import net from 'node:net';
import path from 'node:path';
import { after, test } from 'node:test';
import { runDashboard } from '../../dist/cli/commands/dashboard.js';
import { createMinimalWorkflowProject } from './index-support.js';
import { removeTempProject, runCliCommand } from './helpers/cli-harness.js';

const root = createMinimalWorkflowProject('mustflow-dashboard-lifecycle-');
writeFileSync(path.join(root, '.mustflow/config/preferences.toml'), '[git]\nauto_stage = false\n');
after(() => removeTempProject(root));
const signals = ['SIGINT', 'SIGTERM'];
const signalCounts = () => signals.map((name) => process.listenerCount(name));
function deferred() {
	let resolve;
	const promise = new Promise((done) => { resolve = done; });
	return { promise, resolve };
}

function fixture({ autoClose = true, listenError, closeError, stdoutError, stderrError, abortOnCreate = false } = {}) {
	const baseline = signalCounts();
	const controller = new AbortController();
	const closeRequested = deferred();
	const sockets = [];
	let closeCallback;
	const server = Object.assign(new EventEmitter(), {
		listening: false, listenCalls: 0, closeCalls: 0,
		address: () => ({ port: 12345 }),
		listen(options, onListening) {
			this.listenCalls += 1;
			this.listenOptions = options;
			this.once('listening', onListening);
			if (listenError) throw listenError;
			this.listening = true;
			return this;
		},
		close(callback) {
			this.closeCalls += 1;
			closeCallback = callback;
			closeRequested.resolve();
			if (autoClose) queueMicrotask(() => finishClose());
			return this;
		},
	});
	function finishClose() {
		assert.ok(sockets.every((socket) => socket.destroyed));
		for (const socket of sockets) socket.emit('close');
		server.listening = false;
		server.emit('close');
		closeCallback?.(closeError);
	}
	const pending = runCliCommand(root, ['dashboard', '--json'], (args, reporter) => runDashboard(args, {
		stdout(message) { if (stdoutError) throw stdoutError; reporter.stdout(message); },
		stderr(message) { if (stderrError) throw stderrError; reporter.stderr(message); },
	}, 'en', {
		signal: controller.signal,
		createServer() { if (abortOnCreate) controller.abort(); return server; },
	}));
	return {
		server, controller, pending, closeRequested, finishClose,
		connect() {
			const socket = Object.assign(new EventEmitter(), {
				destroyed: false, destroys: 0,
				destroy() { this.destroyed = true; this.destroys += 1; return this; },
			});
			sockets.push(socket);
			server.emit('connection', socket);
			return socket;
		},
		assertClean() {
			assert.equal(server.listening, false);
			assert.ok(server.closeCalls > 0);
			assert.deepEqual(signalCounts(), baseline);
			assert.equal(getEventListeners(controller.signal, 'abort').length, 0);
			for (const name of ['connection', 'listening', 'error', 'close']) assert.equal(server.listenerCount(name), 0, name);
			for (const socket of sockets) {
				assert.equal(socket.destroyed, true);
				assert.equal(socket.destroys, 1);
				assert.equal(socket.listenerCount('close'), 0);
			}
		},
	};
}

test('server errors release every open connection and process listener before returning', async () => {
	const f = fixture();
	for (let index = 0; index < 100; index += 1) f.connect();
	f.server.emit('error', new Error('controlled accept failure'));
	const result = await f.pending;
	assert.equal(result.status, 1);
	assert.match(result.stderr, /controlled accept failure/);
	f.assertClean();
});

test('25 consecutive startup failures do not accumulate server or process listeners', async () => {
	const baseline = signalCounts();
	for (let index = 0; index < 25; index += 1) {
		const f = fixture();
		f.server.emit('error', Object.assign(new Error('port in use'), { code: 'EADDRINUSE' }));
		assert.equal((await f.pending).status, 1);
		f.assertClean();
	}
	assert.deepEqual(signalCounts(), baseline);
});

for (const signal of ['SIGINT', 'SIGTERM', 'abort']) {
	test(`${signal} shutdown waits for physical close and releases concurrent connections once`, async () => {
		const f = fixture({ autoClose: false });
		const first = f.connect();
		const second = f.connect();
		let returned = false;
		void f.pending.then(() => { returned = true; });
		if (signal === 'abort') f.controller.abort();
		else process.emit(signal);
		await f.closeRequested.promise;
		assert.equal(first.destroyed, true);
		assert.equal(second.destroyed, true);
		assert.equal(returned, false);
		assert.equal(f.server.listenOptions.signal.aborted, true);
		f.finishClose();
		assert.equal((await f.pending).status, 0);
		f.assertClean();
	});
}

test('error followed by abort preserves failure and closes a connection queued during shutdown', async () => {
	const f = fixture({ autoClose: false });
	f.connect();
	f.server.emit('error', new Error('first failure'));
	f.controller.abort();
	const late = f.connect();
	assert.equal(late.destroyed, true);
	await f.closeRequested.promise;
	f.finishClose();
	const result = await f.pending;
	assert.equal(result.status, 1);
	assert.match(result.stderr, /first failure/);
	f.assertClean();
});

test('abort followed by a shutdown error retains normal cancellation and closes connections once', async () => {
	const f = fixture();
	f.connect();
	f.controller.abort();
	f.server.emit('error', new Error('late shutdown error'));
	assert.equal((await f.pending).status, 0);
	f.assertClean();
});

test('cancelling one server leaves another concurrent server and its sockets intact', async () => {
	const baseline = signalCounts();
	const first = fixture();
	const second = fixture();
	const peer = second.connect();
	try {
		first.controller.abort();
		assert.equal((await first.pending).status, 0);
		assert.equal(second.server.listening, true);
		assert.equal(peer.destroyed, false);
		assert.deepEqual(signalCounts(), baseline.map((count) => count + 1));
	} finally {
		second.controller.abort();
		await second.pending;
	}
	assert.equal(peer.destroys, 1);
	assert.deepEqual(signalCounts(), baseline);
	assert.equal(getEventListeners(second.controller.signal, 'abort').length, 0);
	first.assertClean();
});

test('a synchronous listen exception still closes the server and unregisters listeners', async () => {
	const f = fixture({ listenError: new Error('listen failed synchronously') });
	assert.equal((await f.pending).status, 1);
	f.assertClean();
});

test('an exception while reporting readiness releases sockets instead of escaping an event callback', async () => {
	const f = fixture({ stdoutError: new Error('reporter failed') });
	f.connect();
	f.server.emit('listening');
	const result = await f.pending;
	assert.equal(result.status, 1);
	assert.match(result.stderr, /reporter failed/);
	f.assertClean();
});

test('an error reporter throwing cannot bypass resource cleanup', async () => {
	const f = fixture({ stderrError: new Error('error reporter failed') });
	f.connect();
	f.server.emit('error', new Error('server failed'));
	assert.equal((await f.pending).status, 1);
	f.assertClean();
});

for (const code of ['ERR_SERVER_NOT_RUNNING', 'EIO']) {
	test(`cleanup handles ${code} and always removes signal listeners`, async () => {
		const f = fixture({ closeError: Object.assign(new Error(code), { code }) });
		f.connect();
		f.controller.abort();
		assert.equal((await f.pending).status, code === 'ERR_SERVER_NOT_RUNNING' ? 0 : 1);
		f.assertClean();
	});
}

test('cancellation during setup skips listen and removes all registered listeners', async () => {
	const f = fixture({ abortOnCreate: true });
	assert.equal((await f.pending).status, 0);
	assert.equal(f.server.listenCalls, 0);
	f.assertClean();
});

test('pre-aborted startup does not allocate a server', async () => {
	const baseline = signalCounts();
	const signal = AbortSignal.abort();
	const result = await runCliCommand(root, ['dashboard', '--json'], (args, reporter) => runDashboard(args, reporter, 'en', {
		signal, createServer() { assert.fail('must not allocate a server'); },
	}));
	assert.equal(result.status, 0);
	assert.deepEqual(signalCounts(), baseline);
});

test('native HTTP shutdown releases two TCP peers and its listening port after a server error', { timeout: 5000 }, async () => {
	const baseline = signalCounts();
	const controller = new AbortController();
	const ready = deferred();
	const peers = [];
	const accepted = [];
	let server;
	const pending = runCliCommand(root, ['dashboard', '--json', '--port', '0'], (args, reporter) => runDashboard(args, {
		...reporter, stdout(message) { ready.resolve(JSON.parse(message)); },
	}, 'en', {
		signal: controller.signal,
		createServer(handler) {
			server = http.createServer(handler);
			server.on('connection', (socket) => accepted.push(socket));
			return server;
		},
	}));
	try {
		const info = await ready.promise;
		const port = Number(new URL(info.url).port);
		for (let index = 0; index < 2; index += 1) {
			const peer = net.createConnection({ host: '127.0.0.1', port });
			peer.on('error', () => {});
			peers.push(peer);
			await once(peer, 'connect');
		}
		assert.equal(accepted.length, 2);
		const closed = peers.map((peer) => new Promise((resolve) => peer.once('close', resolve)));
		server.emit('error', new Error('controlled native server failure'));
		const result = await pending;
		await Promise.all(closed);
		assert.equal(result.status, 1);
		assert.equal(server.listening, false);
		assert.equal(server.address(), null);
		assert.ok(accepted.every((socket) => socket.destroyed));
		assert.ok(peers.every((peer) => peer.destroyed));
		assert.equal(await new Promise((resolve, reject) => server.getConnections((error, count) => error ? reject(error) : resolve(count))), 0);
		assert.deepEqual(signalCounts(), baseline);
		assert.equal(getEventListeners(controller.signal, 'abort').length, 0);
	} finally {
		controller.abort();
		for (const peer of peers) peer.destroy();
		await pending;
	}
});

test('native cancellation before listening completes cannot leave a late-bound server', { timeout: 5000 }, async () => {
	const controller = new AbortController();
	const baseline = signalCounts();
	let server;
	const pending = runCliCommand(root, ['dashboard', '--json', '--port', '0'], (args, reporter) => runDashboard(args, reporter, 'en', {
		signal: controller.signal,
		createServer(handler) { server = http.createServer(handler); return server; },
	}));
	controller.abort();
	try {
		assert.equal((await pending).status, 0);
		assert.equal(server.listening, false);
		assert.equal(server.address(), null);
		assert.deepEqual(signalCounts(), baseline);
	} finally {
		controller.abort();
	}
});

test('a native address-in-use failure leaves no server or process listeners behind', { timeout: 5000 }, async () => {
	const baseline = signalCounts();
	const occupied = http.createServer();
	occupied.listen(0, '127.0.0.1');
	await once(occupied, 'listening');
	let rejectedServer;
	let serverListeners;
	try {
		const result = await runCliCommand(root, ['dashboard', '--json', '--port', String(occupied.address().port)], (args, reporter) => runDashboard(args, reporter, 'en', {
			createServer(handler) {
				rejectedServer = http.createServer(handler);
				serverListeners = new Map(['connection', 'listening', 'close', 'error'].map((name) => [name, rejectedServer.listeners(name)]));
				return rejectedServer;
			},
		}));
		assert.equal(result.status, 1);
		assert.match(result.stderr, /EADDRINUSE/);
		assert.equal(rejectedServer.listening, false);
		assert.equal(rejectedServer.address(), null);
		for (const [name, listeners] of serverListeners) assert.deepEqual(rejectedServer.listeners(name), listeners);
		assert.deepEqual(signalCounts(), baseline);
	} finally {
		await new Promise((resolve) => occupied.close(resolve));
	}
});
