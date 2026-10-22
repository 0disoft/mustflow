import assert from 'node:assert/strict';
import { Readable } from 'node:stream';
import { test } from 'node:test';
import { createDashboardRequestHandler } from '../../dist/cli/lib/dashboard-http.js';
import { applyDashboardPreferenceUpdates } from '../../dist/cli/lib/dashboard-preferences.js';

function fixture(overrides = {}) {
	const calls = [];
	return { calls, context: {
		token: 'test-token', reporter: { stderr: (message) => calls.push(['error', message]) },
		renderHome: async () => '<html></html>', readStatus: async () => { calls.push('status'); return {}; },
		readPreferences: () => { calls.push('readPreferences'); return {}; },
		updatePreferences: (body) => { calls.push(['updatePreferences', body]); return {}; },
		readDocReview: () => { calls.push('readReview'); return {}; },
		markDocReview: (body) => calls.push(['markReview', body]), openMustflow: () => 'opened',
		...overrides,
	} };
}

async function request(context, url, method, body = '', token = 'test-token') {
	const input = Readable.from([Buffer.from(body)]);
	Object.assign(input, { url, method, headers: { 'x-mustflow-dashboard-token': token } });
	const result = {};
	await createDashboardRequestHandler(context)(input, {
		writeHead(status, headers) { Object.assign(result, { status, headers }); },
		end(body) { result.body = body; },
	});
	return result;
}

test('authentication takes precedence over malformed bodies and route method errors', async () => {
	for (const [url, method] of [['/api/preferences', 'POST'], ['/api/open-mustflow', 'GET'], ['/api/docs/review', 'POST']]) {
		const { context, calls } = fixture();
		const result = await request(context, url, method, '{invalid', 'wrong-token');
		assert.equal(result.status, 403);
		assert.equal(result.body, 'Forbidden');
		assert.deepEqual(calls, []);
	}
});

test('unsupported methods preserve route-specific 404 and 405 responses', async () => {
	for (const [url, expected] of [['/api/status', 404], ['/api/preferences', 404], ['/api/docs/review', 404], ['/api/open-mustflow', 405], ['/unknown', 404]]) {
		const { context, calls } = fixture();
		assert.equal((await request(context, url, 'PUT', '{invalid')).status, expected);
		assert.deepEqual(calls, []);
	}
});

test('body parsing and mutation errors retain 400/500 classification and logging', async () => {
	const { context, calls } = fixture();
	assert.equal((await request(context, '/api/preferences', 'POST', '{invalid')).status, 400);
	assert.deepEqual(calls, []);
	const badUpdate = fixture({ updatePreferences() { throw new Error('git.auto_push is locked in the dashboard.'); } });
	assert.equal((await request(badUpdate.context, '/api/preferences', 'POST', '{}')).status, 400);
	assert.deepEqual(badUpdate.calls, []);
	const ioError = fixture({ updatePreferences() { throw new Error('missing preferences file'); } });
	assert.equal((await request(ioError.context, '/api/preferences', 'POST', '{}')).status, 500);
	assert.deepEqual(ioError.calls, [['error', 'missing preferences file']]);
});

test('review responses are read only after the mutation succeeds', async () => {
	const { context, calls } = fixture();
	const payload = { path: 'README.md', status: 'approved' };
	assert.equal((await request(context, '/api/docs/review', 'POST', JSON.stringify(payload))).status, 200);
	assert.deepEqual(calls, [['markReview', payload], 'readReview']);
});

test('preference calculation preserves first-error and duplicate-update ordering', () => {
	const updates = Object.freeze([Object.freeze({ id: 'git.auto_commit', value: true }), Object.freeze({ id: 'git.auto_commit', value: false })]);
	const content = '[git]\nauto_commit = true\n';
	assert.equal(applyDashboardPreferenceUpdates(content, updates), '[git]\nauto_commit = false\n');
	assert.throws(() => applyDashboardPreferenceUpdates(content, [{ id: 'unknown', value: 1 }, { id: 'git.auto_push', value: true }]), { message: 'Unknown dashboard preference: unknown' });
	assert.throws(() => applyDashboardPreferenceUpdates(content, [{ id: 'git.auto_push', value: true }, { id: 'unknown', value: 1 }]), { message: 'git.auto_push is locked in the dashboard.' });
});
