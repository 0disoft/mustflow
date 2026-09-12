import assert from 'node:assert/strict';
import { test } from 'node:test';
import vm from 'node:vm';
import { dashboardRequestScript } from '../../dist/cli/lib/dashboard-html/request-script.js';
import { renderDashboardClientScript } from '../../dist/cli/lib/dashboard-html/client-script.js';
import { dashboardDocumentsScript, dashboardDocumentEventsScript } from '../../dist/cli/lib/dashboard-html/documents-script.js';
import { dashboardSettingsScript, dashboardSettingsEventsScript } from '../../dist/cli/lib/dashboard-html/settings-script.js';
import { dashboardReleaseUpdateScript } from '../../dist/cli/lib/dashboard-html/release-update-script.js';
import { dashboardListUiScript } from '../../dist/cli/lib/dashboard-html/list-ui-script.js';
import { dashboardVerificationCommandsScript } from '../../dist/cli/lib/dashboard-html/verification-commands-script.js';

test('verification and command tabs preserve filters, focus and filtered plan copying', async () => {
	const h = harness(), nodes = new Map(), copied = [], copiedFeedback = deferred();
	function element() {
		return {
			children: [], listeners: {},
			set id(value) { this.nodeId = value; nodes.set(value, this); },
			get id() { return this.nodeId; },
			set textContent(value) { this.text = value; this.children = []; },
			get textContent() { return this.text; },
			appendChild(child) { this.children.push(child); },
			setAttribute() {},
			addEventListener(name, callback) { this.listeners[name] = callback; },
			focus() { this.focused = true; },
			setSelectionRange(start, end) { this.selection = [start, end]; },
		};
	}
	const get = id => {
		if (!nodes.has(id)) nodes.set(id, element());
		return nodes.get(id);
	};
	const flat = node => [node, ...node.children.flatMap(flat)];
	h.context.document = { getElementById: get, createElement: element };
	h.context.messageFormat = key => key;
	h.context.statusKey = key => h.messages.push(key);
	h.context.navigator = { clipboard: { async writeText(text) { copied.push(text); } } };
	h.context.listFilters = { verification: { query: '', state: 'all' }, commands: { query: '', state: 'all' } };
	h.context.dashboardStatus = {
		verification: {
			changed_files: ['src/a.ts'], skipped: [],
			recommendations: [
				{ intent: 'test', command: 'mf run test', runnable: true, reason_key: 'test-reason', files: ['src/a.ts'] },
				{ intent: 'lint', command: 'mf run lint', runnable: false, reason_key: 'lint-reason', files: ['src/a.ts'] },
			],
			schedule: { entries: [], batches: [{ index: 1, locks: [], intents: ['test', 'lint'], commands: ['mf run test', 'mf run lint'] }] },
		},
		command_contract: { exists: true, intents: [
			{ name: 'test', runnable: true, writes: [], required_after: [] },
			{ name: 'lint', runnable: false, writes: [], required_after: [] },
		] },
	};
	h.run(dashboardListUiScript);
	h.run(dashboardVerificationCommandsScript);
	h.context.showCopyButtonFeedback = () => copiedFeedback.resolve();
	h.run('renderVerificationPanel(); renderCommandPanel()');
	let buttons = flat(get('dashboard-verification')).filter(node => node.className === 'verification-copy');
	assert.equal(buttons[1].disabled, true);
	const search = get('dashboard-verification-filter-search');
	search.value = 'test';
	search.selectionStart = 4;
	search.listeners.input();
	const restored = get('dashboard-verification-filter-search');
	assert.equal(restored.focused, true);
	assert.deepEqual(restored.selection, [4, 4]);
	buttons = flat(get('dashboard-verification')).filter(node => node.className === 'verification-copy');
	assert.equal(buttons.length, 2);
	buttons[1].listeners.click();
	await copiedFeedback.promise;
	assert.deepEqual(copied, ['mf run test']);
	assert.equal(h.calls.length, 0);

	const state = get('dashboard-commands-filter-state');
	state.value = 'unavailable';
	state.listeners.change();
	const names = flat(get('dashboard-commands')).filter(node => node.className === 'command-name').map(node => node.textContent);
	assert.deepEqual(names, ['lint']);
	h.context.listFilters.commands.query = 'missing';
	h.run('renderCommandPanel()');
	assert.ok(flat(get('dashboard-commands')).some(node => node.textContent === 'dashboard.filter.noMatches'));
});


test('release and update tabs preserve readiness gates, preview evidence and copy-only actions', async () => {
	const h = harness(), nodes = new Map(), copied = [], feedback = deferred();
	function element() {
		return {
			children: [], listeners: {}, attributes: {},
			set textContent(value) { this.text = value; this.children = []; },
			get textContent() { return this.text; },
			appendChild(child) { this.children.push(child); },
			setAttribute(key, value) { this.attributes[key] = value; },
			addEventListener(name, callback) { (this.listeners[name] ??= []).push(callback); },
		};
	}
	const get = id => {
		if (!nodes.has(id)) nodes.set(id, element());
		return nodes.get(id);
	};
	const flatten = node => [node, ...node.children.flatMap(flatten)];
	const buttons = id => flatten(get(id)).filter(node => node.className === 'verification-copy');
	h.context.document = { getElementById: get, createElement: element };
	h.context.navigator = { clipboard: { async writeText(value) { copied.push(value); } } };
	h.context.copyCommandLabel = command => 'Copy ' + command;
	h.context.setButtonAccessibleLabel = (button, label) => { button.textContent = label; };
	h.context.showCopyButtonFeedback = () => feedback.resolve();
	h.context.statusKey = key => h.messages.push(key);
	h.context.settingValue = () => false;
	h.context.formatBoolean = value => String(value);
	h.context.appendStatusItem = (root, key, value) => {
		const row = element(); row.textContent = key + ':' + value; root.appendChild(row);
	};
	h.context.appendCommandMeta = h.context.appendStatusItem;
	h.context.dashboardStatus = {
		command_contract: { intents: [{ name: 'version_check', runnable: true }, { name: 'test_release', runnable: false }] },
		template: { id: 'default', version: '2.0.0' },
		release: { package_name: 'example', package_version: '2.0.0',
			release_sensitive_changed_files: ['src/main.ts'], version_sources: [] },
		update: { ok: true, apply_ready: false, dry_run_command: 'mf update --dry-run', apply_command: 'mf update',
			summary: { wouldUpdate: 1, wouldCreate: 0, wouldRemove: 0, blockedLocalChanges: 1, manualReview: 0, unchanged: 2 },
			error: 'local changes', changes: [],
			blockers: [{ relativePath: 'AGENTS.md', action: 'blocked', sourceKind: 'template', reason: '<review first>' }] },
	};
	h.run(dashboardReleaseUpdateScript);
	h.run('renderReleasePanel(); renderUpdatePanel()');
	const releaseButtons = buttons('dashboard-release');
	assert.deepEqual(releaseButtons.map(button => button.disabled), [false, true, true]);
	assert.equal(releaseButtons[2].attributes['aria-disabled'], 'true');
	assert.deepEqual(buttons('dashboard-update').map(button => button.disabled), [false, true]);
	assert.ok(flatten(get('dashboard-release')).some(node => node.textContent === 'src/main.ts'));
	assert.ok(flatten(get('dashboard-update')).some(node => node.textContent === 'dashboard.update.reason: <review first>'));
	assert.ok(flatten(get('dashboard-update')).some(node => node.textContent === 'dashboard.update.error: local changes'));
	assert.equal(releaseButtons[0].listeners.click.length, 1);
	releaseButtons[0].listeners.click[0]();
	await feedback.promise;
	assert.deepEqual(copied, ['mf version --check']);
	assert.equal(h.calls.length, 0);

	h.context.dashboardStatus.update.apply_ready = true;
	h.run('renderUpdatePanel()');
	assert.deepEqual(buttons('dashboard-update').map(button => button.disabled), [false, false]);
	const updateFeedback = deferred();
	h.context.showCopyButtonFeedback = () => updateFeedback.resolve();
	buttons('dashboard-update')[1].listeners.click[0]();
	await updateFeedback.promise;
	assert.deepEqual(copied, ['mf version --check', 'mf update']);
	assert.equal(h.calls.length, 0);
	h.context.dashboardStatus.update.ok = false;
	h.run('renderUpdatePanel()');
	assert.deepEqual(buttons('dashboard-update').map(button => button.disabled), [true, true]);
});


test('settings controls preserve pending edits, unload warning, reset and save outcomes after extraction', async () => {
	const h = harness(), nodes = new Map(), jobs = [], windowEvents = {};
	function element() {
		return {
			children: [], listeners: {},
			set textContent(value) { this.text = value; this.children = []; },
			get textContent() { return this.text; },
			appendChild(child) { this.children.push(child); },
			setAttribute() {},
			addEventListener(name, callback) { (this.listeners[name] ??= []).push(callback); },
			focus() {},
		};
	}
	const get = id => {
		if (!nodes.has(id)) nodes.set(id, element());
		return nodes.get(id);
	};
	h.context.document = { getElementById: get, createElement: element };
	h.context.window = { addEventListener(name, callback) { (windowEvents[name] ??= []).push(callback); } };
	h.context.messageExists = () => false;
	h.context.messageFormat = key => key;
	h.context.messageWithCount = key => key;
	h.context.statusKey = key => h.messages.push(key);
	h.context.markDataUpdated = () => {};
	h.context.snapshot = { settings: [
		{ id: 'git.auto_stage', kind: 'boolean', value: false, editable: true },
		{ id: 'refactoring.hotspots.large_file_candidate_kb', kind: 'number', value: 40, min: 1, max: 100, editable: true },
		{ id: 'git.auto_push', kind: 'boolean', value: false, editable: false },
	] };
	h.context.pending = new Map();
	const update = h.context.updateDashboardView;
	h.context.updateDashboardView = (...args) => {
		const job = update(...args);
		jobs.push(job);
		return job;
	};
	h.run(dashboardSettingsScript);
	h.run(dashboardSettingsEventsScript);
	assert.equal(get('save').listeners.click.length, 1);
	assert.equal(windowEvents.beforeunload.length, 1);
	const warning = () => {
		const event = { prevented: false, preventDefault() { this.prevented = true; } };
		windowEvents.beforeunload[0](event);
		return event;
	};
	assert.equal(warning().prevented, false);
	const checkbox = h.run('renderInput(snapshot.settings[0])');
	checkbox.checked = true;
	checkbox.listeners.change[0]();
	assert.equal(h.context.pending.get('git.auto_stage'), true);
	assert.equal(get('save').disabled, false);
	assert.equal(warning().returnValue, '');
	assert.equal(warning().prevented, true);
	checkbox.checked = false;
	checkbox.listeners.change[0]();
	assert.equal(h.context.pending.size, 0);
	assert.equal(get('save').disabled, true);
	assert.equal(h.run('renderInput(snapshot.settings[2])').disabled, true);

	const number = h.run('renderInput(snapshot.settings[1])');
	assert.equal(number.min, '1');
	assert.equal(number.max, '100');
	number.value = '50';
	number.listeners.input[0]();
	assert.equal(h.context.pending.get('refactoring.hotspots.large_file_candidate_kb'), 50);
	get('settings-pending-summary').children[0].children[1].listeners.click[0]();
	assert.equal(h.context.pending.size, 0);
	assert.equal(warning().prevented, false);

	checkbox.checked = true;
	checkbox.listeners.change[0]();
	get('save').listeners.click[0]();
	assert.equal(h.calls.length, 1);
	assert.deepEqual(JSON.parse(h.calls[0].options.body), { updates: [{ id: 'git.auto_stage', value: true }] });
	h.calls[0].reject(new Error('save unavailable'));
	await jobs[0];
	assert.equal(h.context.pending.size, 1);
	assert.equal(warning().prevented, true);
	get('save').listeners.click[0]();
	const saved = { settings: h.context.snapshot.settings.map(setting =>
		setting.id === 'git.auto_stage' ? { ...setting, value: true } : setting) };
	h.calls[1].resolve(json(saved));
	await jobs[1];
	assert.equal(h.context.snapshot.settings[0].value, true);
	assert.equal(h.run('pending.size'), 0);
	assert.equal(get('save').disabled, true);
	assert.equal(warning().prevented, false);
});


test('document review controls keep filtering, reviewer guards and single-action dispatch after extraction', async () => {
	const h = harness(), elements = new Map(), jobs = [];
	function element() {
		return {
			value: '', children: [], listeners: {}, attributes: {},
			set textContent(value) { this.text = value; this.children = []; },
			get textContent() { return this.text; },
			appendChild(child) { this.children.push(child); },
			setAttribute(key, value) { this.attributes[key] = value; },
			addEventListener(name, handler) { (this.listeners[name] ??= []).push(handler); },
		};
	}
	const get = id => {
		if (!elements.has(id)) elements.set(id, element());
		return elements.get(id);
	};
	h.context.document = { getElementById: get, createElement: element };
	h.context.messageFormat = (key, values) => key + JSON.stringify(values);
	h.context.statusKey = key => h.messages.push(key);
	h.context.markDataUpdated = () => {};
	h.context.renderChrome = () => {};
	const update = h.context.updateDashboardView;
	h.context.updateDashboardView = (...args) => {
		const job = update(...args);
		jobs.push(job);
		return job;
	};
	const entry = { path: 'docs\\Guide.md', status: 'pending', reason: 'changed', review_comment: '<script>text only</script>' };
	h.context.docReview = { documents: [entry] };
	h.run(dashboardDocumentsScript);
	h.run(dashboardDocumentEventsScript);
	for (const [id, event] of [
		['doc-status-filter', 'change'], ['doc-path-filter', 'input'],
		['doc-reviewer-id', 'input'], ['doc-reviewer-kind', 'change'],
	]) assert.equal(get(id).listeners[event].length, 1);

	get('doc-status-filter').value = 'active';
	assert.equal(h.run('docStatusQuery()'), '');
	get('doc-status-filter').value = 'all';
	assert.equal(h.run('docStatusQuery()'), '?all=1');
	get('doc-status-filter').value = 'approved';
	assert.equal(h.run('docStatusQuery()'), '?status=approved');

	get('doc-path-filter').value = ' GUIDE.MD ';
	h.run('renderDocuments()');
	let row = get('docs-review-list').children[0];
	assert.equal(row.className, 'doc-row');
	assert.equal(row.children[2].children[0].disabled, true);
	await h.run('markDocument("docs/Guide.md", "approved")');
	assert.equal(h.calls.length, 0);

	get('doc-reviewer-id').value = ' reviewer ';
	get('doc-reviewer-kind').value = 'human';
	get('doc-review-summary').value = ' checked ';
	get('doc-reviewer-id').listeners.input[0]();
	row = get('docs-review-list').children[0];
	assert.equal(row.children[0].children[2].textContent, 'dashboard.docs.comment:\n<script>text only</script>');
	const approve = row.children[2].children[0];
	assert.equal(approve.disabled, false);
	approve.listeners.click[0]();
	assert.equal(h.calls.length, 1);
	assert.equal(h.calls[0].url, '/api/docs/review?status=approved');
	assert.deepEqual(JSON.parse(h.calls[0].options.body), {
		path: entry.path, status: 'approved', reviewerKind: 'human',
		reviewerId: 'reviewer', summary: 'checked',
	});
	h.calls[0].resolve(json({ documents: [{ ...entry, status: 'approved' }] }));
	await jobs[0];
	assert.equal(get('docs-review-list').children[0].children[2].children[0].disabled, true);

	get('doc-path-filter').value = 'missing';
	get('doc-path-filter').listeners.input[0]();
	assert.equal(get('docs-review-list').children[0].textContent, 'dashboard.docs.noSearchMatches');
});


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
