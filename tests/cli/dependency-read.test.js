import assert from 'node:assert/strict';
import { test } from 'node:test';
import { setTimeout as delay } from 'node:timers/promises';
import { httpFailure, readBoundedResponseText, readHttp } from '../../dist/core/dependency-read.js';
import { checkNpmLatestVersion, checkNpmPackageExists } from '../../dist/cli/lib/npm-version-check.js';
import { createExternalSkillImportReport } from '../../dist/cli/lib/external-skill-import.js';
import { runUpgrade } from '../../dist/cli/commands/upgrade.js';

async function text(response, signal) {
	if (!response.ok) throw httpFailure(response, `HTTP ${response.status}`);
	return readBoundedResponseText(response, 128, signal);
}

test('GET retries transient failures and releases failed response bodies', async () => {
	let calls = 0;
	let cancelled = 0;
	const result = await readHttp('https://example.test', text, { fetch: async (_url, options) => {
		assert.equal(options.method, 'GET');
		if (++calls === 1) return new Response(new ReadableStream({ cancel() { cancelled++; } }), { status: 503 });
		return new Response('ok');
	} });
	assert.equal(result, 'ok');
	assert.equal(calls, 2);
	assert.equal(cancelled, 1);
});

for (const status of [400, 401, 403, 404]) {
	test(`HTTP ${status} is never retried`, async () => {
		let calls = 0;
		await assert.rejects(readHttp('https://example.test', text, { fetch: async () => {
			calls++;
			return new Response('', { status });
		} }), (error) => error.status === status);
		assert.equal(calls, 1);
	});
}

test('a stalled fetch has a deadline and its late response is discarded', async () => {
	let finish;
	let cancelled = false;
	let signal;
	await assert.rejects(readHttp('https://example.test', text, { timeoutMs: 30, fetch: (_url, options) => {
		signal = options.signal;
		return new Promise((resolve) => { finish = resolve; });
	} }), (error) => error.code === 'ETIMEDOUT');
	assert.equal(signal.aborted, true);
	finish(new Response(new ReadableStream({ cancel() { cancelled = true; } })));
	await delay(0);
	assert.equal(cancelled, true);
});

test('deadline includes a stalled response body and cancels its stream', async () => {
	let cancelled = false;
	await assert.rejects(readHttp('https://example.test', text, { timeoutMs: 30,
		fetch: async () => new Response(new ReadableStream({ cancel() { cancelled = true; } })) }),
	(error) => error.code === 'ETIMEDOUT');
	assert.equal(cancelled, true);
});

test('Retry-After waiting remains within the whole operation deadline', async () => {
	let calls = 0;
	await assert.rejects(readHttp('https://example.test', text, { timeoutMs: 30, fetch: async () => {
		calls++;
		return new Response('', { status: 429, headers: { 'retry-after': '60' } });
	} }), (error) => error.code === 'ETIMEDOUT');
	assert.equal(calls, 1);
});

test('abort stops retry waiting and preserves the caller reason', async () => {
	const controller = new AbortController();
	const reason = new Error('request disconnected');
	let calls = 0;
	const work = readHttp('https://example.test', text, { signal: controller.signal, fetch: async () => {
		calls++;
		setTimeout(() => controller.abort(reason), 10);
		return new Response('', { status: 503 });
	} });
	await assert.rejects(work, (error) => error.code === 'EINTERRUPTED' && error.cause === reason);
	assert.equal(calls, 1);
});

test('dependency errors preserve cause and malformed responses are not retried', async () => {
	const original = new TypeError('fetch failed', { cause: Object.assign(new Error('dns'), { code: 'EAI_AGAIN' }) });
	await assert.rejects(readHttp('https://example.test', text, { maxRetries: 0, fetch: async () => { throw original; } }),
		(error) => error.cause === original);
	let calls = 0;
	await assert.rejects(readHttp('https://example.test', async (response) => response.json(), { fetch: async () => {
		calls++;
		return new Response('{');
	} }), (error) => error.cause instanceof SyntaxError);
	assert.equal(calls, 1);
});

test('oversized bodies stop consumption without retrying', async () => {
	let calls = 0;
	await assert.rejects(readHttp('https://example.test', text, { fetch: async () => {
		calls++;
		return new Response('x'.repeat(129));
	} }), /exceeds 128 bytes/u);
	assert.equal(calls, 1);
});

test('npm lookup keeps not-found semantics and version parsing', async () => {
	const missing = await checkNpmPackageExists('missing', { fetch: async () => new Response('', { status: 404 }) });
	assert.equal(missing.exists, false);
	const latest = await checkNpmLatestVersion({ name: 'mustflow', version: '1.0.0' }, {
		fetch: async () => Response.json({ version: '2.0.0' }),
	});
	assert.equal(latest.latestVersion, '2.0.0');
	assert.equal(latest.updateAvailable, true);
});

test('external skill downloads have an overall deadline and retain diagnostic causes', async () => {
	await assert.rejects(createExternalSkillImportReport('.', 'https://github.com/example/skills/tree/main/review', {
		mode: 'dry_run', timeoutMs: 30, fetch: () => new Promise(() => {}),
	}), (error) => error.code === 'ETIMEDOUT');
	const cause = new Error('network unavailable');
	let diagnostic;
	const report = await createExternalSkillImportReport('.', 'https://github.com/example/skills/tree/main/review', {
		mode: 'dry_run', maxRetries: 0, fetch: async () => { throw cause; }, onError: (error) => { diagnostic = error; },
	});
	assert.equal(report.ok, false);
	assert.equal(diagnostic.cause, cause);
});

test('cancelled upgrade never continues to bundled-template writes', async () => {
	const controller = new AbortController();
	const reason = new Error('cancel upgrade');
	controller.abort(reason);
	await assert.rejects(runUpgrade([], { stdout() {}, stderr() {} }, 'en', { signal: controller.signal }),
		(error) => error === reason);
});
