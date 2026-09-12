import assert from 'node:assert/strict';
import { test } from 'node:test';
import vm from 'node:vm';
import { dashboardRequestScript } from '../../dist/cli/lib/dashboard-html/request-script.js';
import { renderDashboardClientScript } from '../../dist/cli/lib/dashboard-html/client-script.js';

function deferred() {
	let resolve, reject;
	const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
	return { promise, resolve, reject };
}

function harness() {
	const calls = [], timers = new Map(), messages = [], applied = [];
	let nextTimer = 0, loading = 0;
	const context = vm.createContext({
		AbortController, DOMException, dashboardToken: 'test-token',
		fetch(url, options) {
			const result = deferred();
			calls.push({ url, options, ...result });
			return result.promise;
		},
		setTimeout(callback, ms) {
			assert.equal(ms, 30000);
			timers.set(++nextTimer, callback);
			return nextTimer;
		},
		clearTimeout(id) { timers.delete(id); },
		message: key => key,
		setLoading(value) { loading += value ? 1 : -1; },
		statusText(text) { messages.push(text); },
		applied,
	});
	vm.runInContext(dashboardRequestScript, context);
	return { context, calls, timers, messages, applied, loading: () => loading,
		run: source => vm.runInContext(source, context),
		expire() { for (const callback of [...timers.values()]) callback(); },
	};
}

const json = value => ({ ok: true, json: async () => value });

test('dashboard aborts superseded reads and ignores late responses and errors', async () => {
	const h = harness();
	const first = h.run('updateDashboardView("/old", {}, data => applied.push(data))');
	const second = h.run('updateDashboardView("/new", {}, data => applied.push(data))');
	assert.equal(h.calls[0].options.signal.aborted, true);
	h.calls[1].resolve(json('new'));
	await second;
	h.calls[0].resolve(json('old'));
	await first;
	assert.deepEqual(h.applied, ['new']);
	assert.deepEqual(h.messages, []);
	assert.equal(h.loading(), 0);
	assert.equal(h.timers.size, 0);

	const stale = h.run('updateDashboardView("/error", {}, data => applied.push(data))');
	h.run('invalidateDashboardView()');
	h.calls[2].reject(new Error('late failure'));
	await stale;
	assert.deepEqual(h.messages, []);
});

test('dashboard deadline covers stalled response bodies and releases loading state', async () => {
	const h = harness(), body = deferred(), entered = deferred();
	const request = h.run('updateDashboardView("/status", {}, data => applied.push(data))');
	h.calls[0].resolve({ ok: true, json() { entered.resolve(); return body.promise; } });
	await entered.promise;
	h.expire();
	await request;
	assert.equal(h.calls[0].options.signal.aborted, true);
	assert.deepEqual(h.messages, ['dashboard.ui.requestTimeout']);
	assert.equal(h.loading(), 0);
	assert.equal(h.timers.size, 0);
	body.resolve('late body');
	await body.promise;
	assert.deepEqual(h.applied, []);
});

test('dashboard timeout on a write is uncertain and never retries the mutation', async () => {
	const h = harness();
	const request = h.run('updateDashboardView("/preferences", { method: "POST", body: "{}" }, data => applied.push(data))');
	h.expire();
	await request;
	assert.equal(h.calls.length, 1);
	assert.equal(h.calls[0].options.headers['x-mustflow-dashboard-token'], 'test-token');
	assert.deepEqual(h.messages, ['dashboard.ui.writeTimeout']);
	assert.equal(h.loading(), 0);
	h.calls[0].resolve(json('saved on server'));
	assert.deepEqual(h.applied, []);
});

test('dashboard tab invalidation does not cancel a submitted write or apply its stale result', async () => {
	const h = harness();
	const write = h.run('updateDashboardView("/preferences", { method: "POST" }, data => applied.push(data))');
	h.run('invalidateDashboardView()');
	assert.equal(h.calls[0].options.signal.aborted, false);
	h.calls[0].resolve(json('saved'));
	await write;
	assert.deepEqual(h.applied, []);
	assert.deepEqual(h.messages, []);
	assert.equal(h.timers.size, 0);
});

test('dashboard requests preserve HTTP errors and consume successful text responses', async () => {
	const h = harness();
	const failed = h.run('requestDashboard("/bad")');
	const assertion = assert.rejects(failed, /denied/);
	h.calls[0].resolve({ ok: false, text: async () => 'denied' });
	await assertion;
	const opened = h.run('requestDashboard("/open", { method: "POST" }, undefined, "text")');
	h.calls[1].resolve({ ok: true, text: async () => 'opened' });
	assert.equal(await opened, 'opened');
	assert.equal(h.timers.size, 0);
});

test('rendered dashboard tab and filter loaders use current-view ownership', async () => {
	const h = harness();
	const script = renderDashboardClientScript({
		serializedSnapshot: '{}', serializedToken: '"test-token"',
		serializedLocaleBundle: '{}', serializedAvailableLocales: '[]',
		serializedStatusSnapshot: '{}', serializedDocReviewSnapshot: '{}',
	});
	assert.ok(script.includes(dashboardRequestScript));
	assert.equal((script.match(/await fetch\(/g) ?? []).length, 1);
	new vm.Script(script);
	h.context.currentTab = 'status';
	h.context.dashboardStatus = 'initial';
	h.context.docReview = 'initial';
	h.context.filter = '?status=active';
	h.context.docStatusQuery = () => h.context.filter;
	h.context.statusKey = key => h.messages.push(key);
	for (const name of ['renderTabState', 'renderStatusPanel', 'renderVerificationPanel',
		'renderCommandPanel', 'renderReleasePanel', 'renderUpdatePanel', 'renderRunsPanel',
		'renderSkillsPanel', 'renderChrome', 'renderDocuments', 'markDataUpdated']) {
		h.context[name] = () => {};
	}
	for (const name of ['loadCurrentTabData', 'activateTab', 'loadStatus', 'loadDocuments']) {
		const start = script.indexOf('function ' + name + '(');
		const asyncStart = script.slice(start - 6, start) === 'async ' ? start - 6 : start;
		h.run(script.slice(asyncStart, script.indexOf('\n}', start) + 2));
	}
	const old = h.run('loadStatus()');
	h.run('activateTab("settings")');
	await old;
	assert.equal(h.calls[0].options.signal.aborted, true);
	h.calls[0].resolve(json('obsolete'));
	assert.equal(h.context.dashboardStatus, 'initial');

	const firstFilter = h.run('loadDocuments()');
	h.context.filter = '?status=approved';
	const lastFilter = h.run('loadDocuments()');
	h.calls[2].resolve(json('approved'));
	await lastFilter;
	h.calls[1].resolve(json('active'));
	await firstFilter;
	assert.equal(h.context.docReview, 'approved');
	assert.equal(h.loading(), 0);
});
