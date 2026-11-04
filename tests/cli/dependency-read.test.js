import assert from 'node:assert/strict';
import { getEventListeners } from 'node:events';
import { test } from 'node:test';
import { setTimeout as delay } from 'node:timers/promises';
import { httpFailure, readBoundedResponseText, readHttp, withDependencyDeadline } from '../../dist/core/dependency-read.js';
import { checkNpmLatestVersion, checkNpmPackageExists } from '../../dist/cli/lib/npm-version-check.js';
import { createExternalSkillImportReport } from '../../dist/cli/lib/external-skill-import.js';
import { runUpgrade } from '../../dist/cli/commands/upgrade.js';

async function text(response, signal) {
	if (!response.ok) throw httpFailure(response, `HTTP ${response.status}`);
	return readBoundedResponseText(response, 128, signal);
}

function createDeadlineRuntime() {
	let now = 0;
	let timeout;
	const scheduled = [];
	return {
		runtime: {
			now: () => now,
			scheduleTimeout(callback, milliseconds) {
				scheduled.push(milliseconds);
				timeout = callback;
				return () => { timeout = undefined; };
			},
		},
		elapse(milliseconds) { now += milliseconds; },
		fireTimeout() { timeout?.(); },
		get pending() { return timeout !== undefined; },
		scheduled,
	};
}

for (const elapsed of [9, 10, 11]) {
	test(`deadline checks elapsed ${elapsed}ms against a 10ms budget before returning success`, async () => {
		const clock = createDeadlineRuntime();
		const result = withDependencyDeadline({ timeoutMs: 10, runtime: clock.runtime }, async () => {
			// Simulate a blocked event loop: elapsed time advances without delivering the timer.
			clock.elapse(elapsed);
			return 'finished';
		});
		if (elapsed < 10) assert.equal(await result, 'finished');
		else await assert.rejects(result, error => error.code === 'ETIMEDOUT');
		assert.deepEqual(clock.scheduled, [10]);
		assert.equal(clock.pending, false);
	});

	test(`deadline preserves an exception only while elapsed ${elapsed}ms is within budget`, async () => {
		const clock = createDeadlineRuntime();
		const failure = new Error('dependency failed');
		await assert.rejects(withDependencyDeadline({ timeoutMs: 10, runtime: clock.runtime }, () => {
			clock.elapse(elapsed);
			throw failure;
		}), error => elapsed < 10 ? error === failure : error.code === 'ETIMEDOUT');
		assert.equal(clock.pending, false);
	});
}

test('deadline accepts timer bounds and rejects invalid budgets before starting work', async () => {
	for (const timeoutMs of [1, 2_147_483_646, 2_147_483_647]) {
		const clock = createDeadlineRuntime();
		assert.equal(await withDependencyDeadline({ timeoutMs, runtime: clock.runtime }, async () => 'ok'), 'ok');
		assert.deepEqual(clock.scheduled, [timeoutMs]);
		assert.equal(clock.pending, false);
	}
	for (const timeoutMs of [-1, 0, 1.5, NaN, Infinity, 2_147_483_648]) {
		const clock = createDeadlineRuntime();
		await assert.rejects(withDependencyDeadline({ timeoutMs, runtime: clock.runtime }, async () => {
			assert.fail('invalid budget must not start external work');
		}), RangeError);
		assert.deepEqual(clock.scheduled, []);
	}
});

test('an already aborted deadline never schedules a timer or starts external work', async () => {
	const clock = createDeadlineRuntime();
	const controller = new AbortController();
	const reason = new Error('cancelled before start');
	controller.abort(reason);
	await assert.rejects(withDependencyDeadline({ signal: controller.signal, runtime: clock.runtime }, async () => {
		assert.fail('cancelled operation must not start');
	}), error => error.code === 'EINTERRUPTED' && error.cause === reason);
	assert.deepEqual(clock.scheduled, []);
	assert.equal(getEventListeners(controller.signal, 'abort').length, 0);
});

for (const trigger of ['cancel', 'timeout']) {
	test(`deadline ${trigger} interrupts pending I/O and releases timer and signal listeners`, async () => {
		const clock = createDeadlineRuntime();
		const controller = new AbortController();
		const reason = new Error('cancel pending I/O');
		let workSignal;
		const result = withDependencyDeadline({ timeoutMs: 10, signal: controller.signal, runtime: clock.runtime }, signal => {
			workSignal = signal;
			return new Promise(() => {});
		});
		if (trigger === 'cancel') controller.abort(reason);
		else { clock.elapse(10); clock.fireTimeout(); }
		await assert.rejects(result, error => trigger === 'cancel'
			? error.code === 'EINTERRUPTED' && error.cause === reason
			: error.code === 'ETIMEDOUT');
		assert.equal(workSignal.aborted, true);
		assert.equal(clock.pending, false);
		assert.equal(getEventListeners(controller.signal, 'abort').length, 0);
		assert.equal(getEventListeners(workSignal, 'abort').length, 0);
	});
}

test('deadline scheduler failures remove the parent abort listener before propagating', async () => {
	const controller = new AbortController();
	const failure = new Error('scheduler unavailable');
	await assert.rejects(withDependencyDeadline({ signal: controller.signal, runtime: {
		now: () => 0,
		scheduleTimeout() { throw failure; },
	} }, async () => { assert.fail('failed scheduling must not start work'); }), error => error === failure);
	assert.equal(getEventListeners(controller.signal, 'abort').length, 0);
});

test('deadline timer cleanup failures still remove the parent abort listener', async () => {
	const controller = new AbortController();
	const failure = new Error('timer cleanup failed');
	await assert.rejects(withDependencyDeadline({ signal: controller.signal, runtime: {
		now: () => 0,
		scheduleTimeout: () => () => { throw failure; },
	} }, async () => 'finished'), error => error === failure);
	assert.equal(getEventListeners(controller.signal, 'abort').length, 0);
});

test('Retry-After saturates large values instead of wrapping back to immediate retry', () => {
	for (const [header, expected] of [
		['0', 0], ['1', 1000], ['2147483', 2_147_483_000], ['2147484', 2_147_483_647],
		['9'.repeat(306), 2_147_483_647], ['9'.repeat(309), 2_147_483_647], ['invalid', 0],
	]) {
		const failure = httpFailure(new Response(null, { status: 429, headers: { 'retry-after': header } }), 'busy');
		assert.equal(failure.retryAfterMs, expected, `Retry-After with ${header.length} characters`);
	}
});

test('Retry-After dates use an injected clock at the past/present/future boundary', () => {
	const expiresAt = Date.UTC(2026, 10, 4, 0, 0, 0);
	const response = new Response(null, { status: 503, headers: { 'retry-after': new Date(expiresAt).toUTCString() } });
	for (const [offset, expected] of [[-1, 1], [0, 0], [1, 0]]) {
		assert.equal(httpFailure(response, 'busy', () => expiresAt + offset).retryAfterMs, expected);
	}
});

for (const [random, expected] of [[0, [100, 200]], [1 - Number.EPSILON, [199, 299]]]) {
	test(`GET backoff is deterministic with injected jitter ${random}`, async () => {
		const clock = createDeadlineRuntime();
		const waits = [];
		let calls = 0;
		assert.equal(await readHttp('https://example.test', text, {
			maxRetries: 2,
			fetch: async () => ++calls < 3 ? new Response('', { status: 503 }) : new Response('ok'),
			runtime: { ...clock.runtime, random: () => random, sleep: async (milliseconds, signal) => {
				signal.throwIfAborted();
				waits.push(milliseconds);
				clock.elapse(milliseconds);
			} },
		}), 'ok');
		assert.equal(calls, 3);
		assert.deepEqual(waits, expected);
		assert.equal(clock.pending, false);
	});
}

for (const elapsed of [499, 500, 501]) {
	test(`GET retry stops at elapsed ${elapsed}ms against a 500ms budget even before the timer runs`, async () => {
		const clock = createDeadlineRuntime();
		const cause = Object.assign(new Error('connection reset'), { code: 'ECONNRESET' });
		const waits = [];
		let calls = 0;
		let workSignal;
		let failure;
		await assert.rejects(readHttp('https://example.test', text, {
			timeoutMs: 500, maxRetries: 2,
			fetch: async (_url, { signal }) => {
				workSignal = signal;
				if (++calls === 1) clock.elapse(elapsed);
				throw cause;
			},
			runtime: { ...clock.runtime, random: () => 0, sleep: async (milliseconds) => {
				waits.push(milliseconds);
				clock.elapse(milliseconds);
			} },
		}), error => { failure = error; return error.code === 'ETIMEDOUT'; });
		assert.equal(calls, 1);
		assert.equal(failure.cause, cause);
		assert.deepEqual(waits, elapsed < 500 ? [100] : []);
		assert.equal(workSignal.aborted, true);
		assert.equal(clock.pending, false);
		assert.equal(getEventListeners(workSignal, 'abort').length, 0);
	});
}

test('a deadline during backoff preserves the most recent dependency failure', async () => {
	const clock = createDeadlineRuntime();
	const first = Object.assign(new Error('DNS lookup failed'), { code: 'EAI_AGAIN' });
	const last = Object.assign(new Error('connection reset'), { code: 'ECONNRESET' });
	let calls = 0;
	const waits = [];
	await assert.rejects(readHttp('https://example.test', text, {
		timeoutMs: 500, maxRetries: 2,
		fetch: async () => { throw ++calls === 1 ? first : last; },
		runtime: { ...clock.runtime, random: () => 0, sleep: async (milliseconds, signal) => {
			waits.push(milliseconds);
			clock.elapse(waits.length === 1 ? milliseconds : 400);
			if (waits.length === 2) clock.fireTimeout();
			signal.throwIfAborted();
		} },
	}), error => error.code === 'ETIMEDOUT' && error.cause === last);
	assert.equal(calls, 2);
	assert.deepEqual(waits, [100, 200]);
	assert.equal(clock.pending, false);
});

test('a fetch settling at the deadline never invokes response consumption', async () => {
	const clock = createDeadlineRuntime();
	let consumed = false;
	let discarded = false;
	await assert.rejects(readHttp('https://example.test', async () => { consumed = true; return 'late'; }, {
		timeoutMs: 500,
		fetch: async () => {
			clock.elapse(500);
			return new Response(new ReadableStream({ cancel() { discarded = true; } }));
		},
		runtime: clock.runtime,
	}), error => error.code === 'ETIMEDOUT');
	assert.equal(consumed, false);
	assert.equal(discarded, true);
	assert.equal(clock.pending, false);
});

test('overflowing Retry-After exhausts the deadline without making a second request', async () => {
	const clock = createDeadlineRuntime();
	const waits = [];
	let calls = 0;
	await assert.rejects(readHttp('https://example.test', text, {
		timeoutMs: 500,
		fetch: async () => ++calls === 1
			? new Response('', { status: 429, headers: { 'retry-after': '9'.repeat(309) } })
			: new Response('retried too early'),
		runtime: { ...clock.runtime, random: () => 0, sleep: async (milliseconds, signal) => {
			waits.push(milliseconds);
			clock.elapse(500);
			clock.fireTimeout();
			signal.throwIfAborted();
		} },
	}), error => error.code === 'ETIMEDOUT');
	assert.equal(calls, 1);
	assert.deepEqual(waits, [2_147_483_647]);
	assert.equal(clock.pending, false);
});

for (const cancelled of [false, true]) {
	test(`failed retry waiting stops further I/O with cancellation ${cancelled}`, async () => {
		const clock = createDeadlineRuntime();
		const controller = new AbortController();
		const failure = new Error('waiting interrupted');
		let calls = 0;
		await assert.rejects(readHttp('https://example.test', text, {
			signal: controller.signal,
			fetch: async () => { calls++; return new Response('', { status: 503 }); },
			runtime: { ...clock.runtime, random: () => 0, sleep: async (_milliseconds, signal) => {
				if (cancelled) { controller.abort(failure); signal.throwIfAborted(); }
				throw failure;
			} },
		}), error => cancelled ? error.code === 'EINTERRUPTED' && error.cause === failure : error === failure);
		assert.equal(calls, 1);
		assert.equal(clock.pending, false);
		assert.equal(getEventListeners(controller.signal, 'abort').length, 0);
	});
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
