import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import { PassThrough } from 'node:stream';
import { test } from 'node:test';
import { readRegistryMetadata } from '../../scripts/lib/registry-metadata.mjs';

function fixture(start, statusCode = 200) {
	const response = Object.assign(new PassThrough(), { statusCode, complete: true });
	const request = new EventEmitter();
	request.destroy = () => { request.destroyed = true; };
	request.end = () => queueMicrotask(() => start(response));
	return { response, request, requestImpl: (_url, _options, callback) => {
		const end = request.end;
		request.end = () => { callback(response); end(); };
		return request;
	} };
}

test('registry metadata retains success and package-not-found results', async () => {
	for (const status of [200, 404]) {
		const f = fixture((response) => response.end(JSON.stringify({ versions: { '1.0.0': {} } })), status);
		const result = await readRegistryMetadata('https://example.test', f);
		assert.equal(result.exists, status === 200);
		assert.deepEqual(Object.keys(result.versions), status === 200 ? ['1.0.0'] : []);
	}
});

test('registry deadline covers connection establishment', async () => {
	const request = new EventEmitter();
	request.end = () => {};
	request.destroy = () => { request.destroyed = true; };
	await assert.rejects(readRegistryMetadata('https://example.test', { timeoutMs: 30, requestImpl: () => request }),
		(error) => error.code === 'ETIMEDOUT');
	assert.equal(request.destroyed, true);
});

test('trickle responses cannot extend the absolute registry deadline', async () => {
	let interval;
	const f = fixture((response) => { interval = setInterval(() => response.write(' '), 5); });
	try {
		await assert.rejects(readRegistryMetadata('https://example.test', { ...f, timeoutMs: 30 }),
			(error) => error.code === 'ETIMEDOUT');
		assert.equal(f.response.destroyed, true);
		assert.equal(f.request.destroyed, true);
	} finally {
		clearInterval(interval);
		f.response.destroy();
	}
});

test('registry response failures preserve causes and incomplete responses fail', async () => {
	const cause = new Error('socket failed');
	const f = fixture((response) => response.destroy(cause));
	await assert.rejects(readRegistryMetadata('https://example.test', f), (error) => error.cause === cause);
	const incomplete = fixture((response) => { response.complete = false; response.destroy(); });
	await assert.rejects(readRegistryMetadata('https://example.test', incomplete), /before completion/u);
});

test('registry bodies are size bounded and malformed JSON retains its cause', async () => {
	const oversized = fixture((response) => response.end('12345'));
	await assert.rejects(readRegistryMetadata('https://example.test', { ...oversized, maxBytes: 4 }), /exceeds 4 bytes/u);
	assert.equal(oversized.request.destroyed, true);
	const malformed = fixture((response) => response.end('{'));
	await assert.rejects(readRegistryMetadata('https://example.test', malformed), (error) => error.cause instanceof SyntaxError);
});

test('registry cancellation preserves caller reason and destroys in-flight work', async () => {
	const controller = new AbortController();
	const cause = new Error('cancel release check');
	const f = fixture(() => controller.abort(cause));
	await assert.rejects(readRegistryMetadata('https://example.test', { ...f, signal: controller.signal }),
		(error) => error.code === 'EINTERRUPTED' && error.cause === cause);
	assert.equal(f.request.destroyed, true);
});
