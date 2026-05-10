import type { DashboardPreferencesSnapshot } from './dashboard-preferences.js';
import { getDashboardLocaleBundle } from './dashboard-locale.js';

export interface DashboardDocReviewSnapshot {
	readonly schema_version: '1';
	readonly command: 'docs review list';
	readonly ledger_path: string;
	readonly count: number;
	readonly documents: readonly unknown[];
}

export interface DashboardStatusSnapshot {
	readonly schema_version: '1';
	readonly command: 'dashboard status';
	readonly installed: boolean;
	readonly manifest_lock: 'missing' | 'invalid' | 'present';
	readonly template: { readonly id: string; readonly version: string } | null;
	readonly release: {
		readonly package_name: string;
		readonly package_version: string;
		readonly version_sources: readonly {
			readonly path: string;
			readonly kind: string;
			readonly declared?: boolean;
			readonly authority?: string;
		}[];
		readonly release_sensitive_changed_files: readonly string[];
	};
	readonly update: {
		readonly command: 'update';
		readonly mode: 'dry-run';
		readonly dry_run_command: string;
		readonly apply_command: string;
		readonly ok: boolean;
		readonly apply_ready: boolean;
		readonly error?: string;
		readonly summary: {
			readonly blockedLocalChanges: number;
			readonly manualReview: number;
			readonly wouldUpdate: number;
			readonly wouldCreate: number;
			readonly unchanged: number;
		};
		readonly blockers: readonly {
			readonly relativePath: string;
			readonly sourceKind: string;
			readonly action: string;
			readonly reason: string;
		}[];
		readonly changes: readonly {
			readonly relativePath: string;
			readonly sourceKind: string;
			readonly action: string;
			readonly reason: string;
		}[];
	};
	readonly run_history:
		| { readonly path: string; readonly exists: false }
		| { readonly path: string; readonly exists: true; readonly valid: false; readonly error: string }
		| {
				readonly path: string;
				readonly exists: true;
				readonly valid: true;
				readonly intent: string;
				readonly status: string;
				readonly timed_out: boolean;
				readonly started_at: string;
				readonly finished_at: string;
				readonly duration_ms: number;
				readonly cwd: string;
				readonly lifecycle: string;
				readonly run_policy: string;
				readonly mode: string;
				readonly command_line: readonly string[];
				readonly timeout_seconds: number;
				readonly max_output_bytes: number;
				readonly success_exit_codes: readonly number[];
				readonly exit_code: number | null;
				readonly signal: string | null;
				readonly error: string | null;
				readonly kill_method: string | null;
				readonly receipt_path: string;
				readonly stdout: { readonly bytes: number; readonly truncated: boolean; readonly tail: string };
				readonly stderr: { readonly bytes: number; readonly truncated: boolean; readonly tail: string };
		  };
	readonly skills: {
		readonly index_path: string;
		readonly exists: boolean;
		readonly count: number;
		readonly routes: readonly {
			readonly skill: string;
			readonly skill_path: string;
			readonly trigger: string;
			readonly required_input: string;
			readonly edit_scope: string;
			readonly risk: string;
			readonly verification_intents: readonly string[];
			readonly declared_command_intents: readonly string[];
			readonly expected_output: string;
			readonly exists: boolean;
			readonly aligned: boolean;
		}[];
	};
	readonly tracked_files: number;
	readonly changed_files: readonly string[];
	readonly missing_files: readonly string[];
	readonly issues: readonly string[];
	readonly runnable_intents: readonly string[];
	readonly command_contract: {
		readonly path: string;
		readonly exists: boolean;
		readonly intents: readonly {
			readonly name: string;
			readonly status: string;
			readonly lifecycle: string | null;
			readonly run_policy: string | null;
			readonly stdin: string | null;
			readonly timeout_seconds: number | null;
			readonly cwd: string | null;
			readonly description: string | null;
			readonly reason: string | null;
			readonly agent_action: string | null;
			readonly writes: readonly string[];
			readonly required_after: readonly string[];
			readonly runnable: boolean;
		}[];
	};
	readonly verification: {
		readonly changed_files: readonly string[];
		readonly surfaces: readonly string[];
		readonly recommendations: readonly {
			readonly intent: string;
			readonly command: string;
			readonly reason_key: string;
			readonly files: readonly string[];
			readonly runnable: boolean;
		}[];
		readonly skipped: readonly {
			readonly intent: string;
			readonly reason_key: string;
		}[];
	};
	readonly latest_run:
		| { readonly path: string; readonly exists: false }
		| { readonly path: string; readonly exists: true; readonly valid: false; readonly error: string }
		| {
				readonly path: string;
				readonly exists: true;
				readonly valid: true;
				readonly intent: string;
				readonly status: string;
				readonly timed_out: boolean;
				readonly exit_code: number | null;
				readonly finished_at: string | null;
				readonly duration_ms: number | null;
		  };
	readonly active_review_documents: number;
}

function escapeHtml(value: string): string {
	return value
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;')
		.replace(/'/g, '&#39;');
}

export function renderDashboardHtml(
	snapshot: DashboardPreferencesSnapshot,
	token: string,
	statusSnapshot: DashboardStatusSnapshot,
	docReviewSnapshot: DashboardDocReviewSnapshot,
): string {
	const root = escapeHtml(snapshot.projectRoot);
	const preferencesPath = escapeHtml(snapshot.preferencesPath);
	const serializedSnapshot = JSON.stringify(snapshot);
	const serializedStatusSnapshot = JSON.stringify(statusSnapshot);
	const serializedDocReviewSnapshot = JSON.stringify(docReviewSnapshot);
	const serializedToken = JSON.stringify(token);
	const localeBundle = getDashboardLocaleBundle();
	const serializedLocaleBundle = JSON.stringify(localeBundle);
	const serializedAvailableLocales = JSON.stringify(localeBundle.locales);

	return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>mustflow dashboard</title>
<style>
:root {
	color-scheme: light dark;
	--bg: #101216;
	--panel: #181b21;
	--line: #2a2f3a;
	--text: #eef1f7;
	--muted: #aeb6c5;
	--accent: #8fb4ff;
	--danger: #ff9a9a;
	--ok: #9be7ba;
	font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
}
* { box-sizing: border-box; }
body {
	margin: 0;
	background: var(--bg);
	color: var(--text);
	font-size: 17px;
}
header {
	border-bottom: 1px solid var(--line);
	padding: 16px 20px;
}
.title-row {
	align-items: center;
	display: flex;
	gap: 8px;
	margin-bottom: 8px;
}
h1 {
	font-size: 22px;
	line-height: 1.2;
	margin: 0;
	font-weight: 650;
}
.icon-button {
	align-items: center;
	display: inline-flex;
	height: 34px;
	justify-content: center;
	padding: 0;
	width: 34px;
}
.icon-button svg {
	height: 18px;
	width: 18px;
}
.path {
	color: var(--muted);
	font-size: 14px;
	overflow-wrap: anywhere;
}
main {
	max-width: 980px;
	margin: 0 auto;
	padding: 20px;
}
.toolbar {
	align-items: center;
	display: flex;
	flex-wrap: wrap;
	gap: 12px;
	justify-content: flex-end;
	margin-bottom: 14px;
	min-height: 36px;
}
.tabs {
	display: flex;
	gap: 8px;
	margin-bottom: 14px;
	overflow-x: auto;
}
.tab {
	border-color: transparent;
	min-width: 110px;
}
.tab[aria-selected="true"] {
	background: var(--panel);
	border-color: var(--line);
}
.tab-panel[hidden] {
	display: none;
}
.language-picker {
	align-items: center;
	display: inline-flex;
	flex-shrink: 0;
	gap: 8px;
}
.language-picker span {
	color: var(--muted);
	font-size: 14px;
	white-space: nowrap;
}
.language-picker select {
	min-width: 130px;
}
.status {
	color: var(--muted);
	font-size: 15px;
	margin-right: auto;
}
.status.ok { color: var(--ok); }
.status.error { color: var(--danger); }
button, select, input {
	background: #11141a;
	border: 1px solid var(--line);
	border-radius: 6px;
	color: var(--text);
	font: inherit;
	min-height: 38px;
}
button {
	cursor: pointer;
	padding: 0 14px;
}
button:disabled {
	cursor: not-allowed;
	opacity: 0.6;
}
section {
	border-top: 1px solid var(--line);
	padding: 14px 0;
}
h2 {
	font-size: 15px;
	line-height: 1.25;
	margin: 0 0 8px;
	color: var(--muted);
	font-weight: 650;
}
.setting {
	align-items: center;
	display: grid;
	gap: 12px;
	grid-template-columns: minmax(220px, 1fr) minmax(120px, 240px);
	min-height: 48px;
	padding: 6px 0;
}
.label {
	font-size: 16px;
}
.value-description {
	color: var(--muted);
	font-size: 13px;
	line-height: 1.35;
	margin-left: 10px;
}
.meta {
	color: var(--muted);
	font-size: 13px;
	margin-top: 2px;
}
.status-grid {
	display: grid;
	gap: 8px;
	grid-template-columns: repeat(2, minmax(0, 1fr));
}
.status-item {
	border-bottom: 1px solid var(--line);
	display: grid;
	gap: 4px;
	padding: 8px 0;
}
.status-label {
	color: var(--muted);
	font-size: 13px;
}
.status-value {
	font-size: 15px;
	overflow-wrap: anywhere;
}
.status-value.ok { color: var(--ok); }
.status-value.warn { color: var(--danger); }
.issue-list {
	margin: 0;
	padding-left: 18px;
}
.issue-list li {
	margin: 4px 0;
	overflow-wrap: anywhere;
}
.command-row {
	border-bottom: 1px solid var(--line);
	display: grid;
	gap: 10px;
	grid-template-columns: minmax(160px, 220px) 1fr;
	padding: 10px 0;
}
.command-name {
	font-weight: 650;
	overflow-wrap: anywhere;
}
.command-state {
	color: var(--muted);
	font-size: 13px;
	margin-top: 4px;
}
.command-state.ok { color: var(--ok); }
.command-state.warn { color: var(--danger); }
.command-description {
	font-size: 15px;
	overflow-wrap: anywhere;
}
.command-meta {
	color: var(--muted);
	display: flex;
	flex-wrap: wrap;
	font-size: 13px;
	gap: 8px 14px;
	margin-top: 6px;
}
.command-note {
	color: var(--muted);
	font-size: 13px;
	margin-top: 6px;
	overflow-wrap: anywhere;
}
.verification-row {
	border-bottom: 1px solid var(--line);
	display: grid;
	gap: 10px;
	grid-template-columns: minmax(160px, 220px) 1fr auto;
	padding: 10px 0;
}
.verification-command {
	font-family: ui-monospace, SFMono-Regular, Consolas, "Liberation Mono", monospace;
	font-size: 14px;
	overflow-wrap: anywhere;
}
.verification-files {
	color: var(--muted);
	font-size: 13px;
	margin-top: 6px;
	overflow-wrap: anywhere;
}
.verification-copy {
	min-height: 34px;
	padding: 0 10px;
}
.doc-controls {
	display: grid;
	gap: 10px;
	margin-bottom: 14px;
}
.doc-filter-controls,
.doc-review-controls {
	align-items: end;
	display: grid;
	gap: 10px;
}
.doc-filter-controls {
	grid-template-columns: minmax(130px, 160px) minmax(180px, 1fr);
}
.doc-review-controls {
	grid-template-columns: minmax(130px, 170px) minmax(160px, 1fr) minmax(180px, 1fr);
}
.doc-controls label,
.doc-control-group-label {
	display: grid;
	gap: 5px;
}
.doc-controls span,
.doc-control-group-label {
	color: var(--muted);
	font-size: 13px;
}
.doc-list {
	border-top: 1px solid var(--line);
}
.doc-row {
	align-items: center;
	border-bottom: 1px solid var(--line);
	display: grid;
	gap: 12px;
	grid-template-columns: minmax(0, 1fr) minmax(90px, auto) auto;
	padding: 10px 0;
}
.doc-path {
	font-size: 15px;
	overflow-wrap: anywhere;
}
.doc-meta {
	color: var(--muted);
	font-size: 13px;
	margin-top: 3px;
	overflow-wrap: anywhere;
}
.doc-comment {
	background: rgba(255, 255, 255, 0.04);
	border: 1px solid var(--line);
	border-radius: 6px;
	color: var(--text);
	font: inherit;
	font-size: 13px;
	line-height: 1.45;
	margin: 8px 0 0;
	max-height: 180px;
	overflow: auto;
	padding: 8px;
	white-space: pre-wrap;
}
.doc-status {
	color: var(--muted);
	font-size: 13px;
	white-space: nowrap;
}
.doc-actions {
	display: flex;
	flex-wrap: wrap;
	gap: 8px;
	justify-content: flex-end;
}
.doc-actions button {
	min-height: 34px;
	padding: 0 10px;
}
.empty {
	color: var(--muted);
	padding: 14px 0;
}
select, input[type="number"], input[type="text"] {
	padding: 0 12px;
	width: 100%;
}
select {
	appearance: none;
	background-image:
		linear-gradient(45deg, transparent 50%, currentColor 50%),
		linear-gradient(135deg, currentColor 50%, transparent 50%);
	background-position:
		calc(100% - 22px) 50%,
		calc(100% - 16px) 50%;
	background-repeat: no-repeat;
	background-size: 6px 6px, 6px 6px;
	padding-right: 44px;
}
select::-ms-expand {
	display: none;
}
.setting-control {
	width: 100%;
}
.locale-tag-control {
	display: grid;
	gap: 8px;
	width: 100%;
}
.locale-tag-control input[hidden] {
	display: none;
}
input[type="checkbox"] {
	height: 22px;
	justify-self: end;
	min-height: 22px;
	width: 22px;
}
@media (max-width: 640px) {
	main { padding: 14px; }
	.setting {
		grid-template-columns: 1fr;
		gap: 6px;
	}
	input[type="checkbox"] {
		justify-self: start;
	}
	.doc-controls,
	.doc-filter-controls,
	.doc-review-controls,
	.doc-row,
	.verification-row,
	.status-grid {
		grid-template-columns: 1fr;
	}
	.doc-actions {
		justify-content: flex-start;
	}
}
</style>
</head>
<body>
<header>
	<div class="title-row">
		<h1 id="dashboard-title">mustflow dashboard</h1>
		<button id="open-mustflow" class="icon-button" type="button" aria-label="Open .mustflow folder" title="Open .mustflow folder">
			<svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
				<path d="M4 20h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.2a2 2 0 0 1-1.6-.8L10 4H4a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2Z"></path>
			</svg>
		</button>
	</div>
	<div class="path">${root}</div>
	<div class="path">${preferencesPath}</div>
</header>
<main>
	<nav class="tabs" aria-label="Dashboard sections">
		<button id="tab-status" class="tab" type="button" data-tab="status" aria-controls="panel-status" aria-selected="true">Status</button>
		<button id="tab-verification" class="tab" type="button" data-tab="verification" aria-controls="panel-verification" aria-selected="false">Verification</button>
		<button id="tab-commands" class="tab" type="button" data-tab="commands" aria-controls="panel-commands" aria-selected="false">Commands</button>
		<button id="tab-release" class="tab" type="button" data-tab="release" aria-controls="panel-release" aria-selected="false">Release</button>
		<button id="tab-update" class="tab" type="button" data-tab="update" aria-controls="panel-update" aria-selected="false">Update</button>
		<button id="tab-runs" class="tab" type="button" data-tab="runs" aria-controls="panel-runs" aria-selected="false">Runs</button>
		<button id="tab-skills" class="tab" type="button" data-tab="skills" aria-controls="panel-skills" aria-selected="false">Skills</button>
		<button id="tab-settings" class="tab" type="button" data-tab="settings" aria-controls="panel-settings" aria-selected="false">Settings</button>
		<button id="tab-documents" class="tab" type="button" data-tab="documents" aria-controls="panel-documents" aria-selected="false">Documents</button>
	</nav>
	<div class="toolbar">
		<div id="status" class="status">No changes</div>
		<label class="language-picker" for="dashboard-language">
			<span id="dashboard-language-label">Language</span>
			<select id="dashboard-language" name="dashboard-language"></select>
		</label>
		<button id="reload" type="button">Reload</button>
		<button id="save" type="button" disabled>Save</button>
	</div>
	<div id="panel-status" class="tab-panel">
		<div id="dashboard-status"></div>
	</div>
	<div id="panel-verification" class="tab-panel" hidden>
		<div id="dashboard-verification"></div>
	</div>
	<div id="panel-commands" class="tab-panel" hidden>
		<div id="dashboard-commands"></div>
	</div>
	<div id="panel-release" class="tab-panel" hidden>
		<div id="dashboard-release"></div>
	</div>
	<div id="panel-update" class="tab-panel" hidden>
		<div id="dashboard-update"></div>
	</div>
	<div id="panel-runs" class="tab-panel" hidden>
		<div id="dashboard-runs"></div>
	</div>
	<div id="panel-skills" class="tab-panel" hidden>
		<div id="dashboard-skills"></div>
	</div>
	<div id="panel-settings" class="tab-panel" hidden>
		<div id="settings"></div>
	</div>
	<div id="panel-documents" class="tab-panel" hidden>
		<div class="doc-controls">
			<div class="doc-filter-controls">
				<label for="doc-status-filter">
					<span id="doc-status-filter-label">Status</span>
					<select id="doc-status-filter"></select>
				</label>
				<label for="doc-path-filter">
					<span id="doc-path-filter-label">File name</span>
					<input id="doc-path-filter" type="text" autocomplete="off" spellcheck="false">
				</label>
			</div>
			<div class="doc-control-group-label" id="doc-review-fields-label">Review record</div>
			<div class="doc-review-controls">
				<label for="doc-reviewer-kind">
					<span id="doc-reviewer-kind-label">Reviewer kind</span>
					<select id="doc-reviewer-kind"></select>
				</label>
				<label for="doc-reviewer-id">
					<span id="doc-reviewer-id-label">Reviewer ID</span>
					<input id="doc-reviewer-id" type="text" autocomplete="off" spellcheck="false">
				</label>
				<label for="doc-review-summary">
					<span id="doc-review-summary-label">Summary</span>
					<input id="doc-review-summary" type="text" autocomplete="off">
				</label>
			</div>
		</div>
		<div id="docs-review-list" class="doc-list"></div>
	</div>
</main>
<script>
const initialSnapshot = ${serializedSnapshot};
const dashboardToken = ${serializedToken};
const dashboardLocales = ${serializedLocaleBundle};
const availableLocales = ${serializedAvailableLocales};
const initialStatusSnapshot = ${serializedStatusSnapshot};
const initialDocReview = ${serializedDocReviewSnapshot};
let snapshot = initialSnapshot;
let pending = new Map();
let currentLocale = resolveInitialLocale();
let statusState = { key: "dashboard.ui.noChanges", text: "", type: "" };
let currentTab = "status";
let dashboardStatus = initialStatusSnapshot;
let docReview = initialDocReview;

const groups = [
	["dashboard.group.git", ["git.auto_stage", "git.auto_commit", "git.auto_push"]],
	["dashboard.group.commitMessage", "git.commit_message."],
	["dashboard.group.reporting", "reporting."],
	["dashboard.group.verification", "verification.selection."],
	["dashboard.group.testAuthoring", "testing.authoring."],
	["dashboard.group.codeStyle", "code_style."],
	["dashboard.group.refactoring", "refactoring.hotspots."],
	["dashboard.group.versioning", "release.versioning."]
];
const docStatusFilters = ["active", "pending", "in_review", "changes_made", "needs_human", "approved", "ignored", "all"];
const reviewerKinds = ["human", "llm", "tool", "external"];

function resolveInitialLocale() {
	const stored = window.localStorage.getItem("mustflow.dashboard.language");
	if (availableLocales.includes(stored)) return stored;
	const browserLocale = (window.navigator.language || "").slice(0, 2).toLowerCase();
	return availableLocales.includes(browserLocale) ? browserLocale : "en";
}

function message(key) {
	return dashboardLocales.messages[currentLocale]?.[key] ?? dashboardLocales.messages.en[key] ?? key;
}

function messageExists(key) {
	return Boolean(dashboardLocales.messages[currentLocale]?.[key] ?? dashboardLocales.messages.en[key]);
}

function statusText(text, type = "") {
	statusState = { key: "", text, type };
	renderStatus();
}

function statusKey(key, type = "") {
	statusState = { key, text: "", type };
	renderStatus();
}

function renderStatus() {
	const element = document.getElementById("status");
	const text = statusState.key ? message(statusState.key) : statusState.text;
	element.textContent = text;
	element.className = statusState.type ? "status " + statusState.type : "status";
}

function settingValue(id) {
	return pending.has(id) ? pending.get(id) : snapshot.settings.find((setting) => setting.id === id)?.value;
}

function settingDescriptionKey(setting) {
	const valueSpecificKey = "dashboard.setting." + setting.id + ".description." + String(settingValue(setting.id));
	if (messageExists(valueSpecificKey)) return valueSpecificKey;
	const key = "dashboard.setting." + setting.id + ".description";
	return messageExists(key) ? key : "";
}

function settingDescription(setting) {
	const key = settingDescriptionKey(setting);
	return key ? message(key) : "";
}

function updateSettingDescription(id) {
	const setting = snapshot.settings.find((item) => item.id === id);
	if (!setting) return;
	const element = document.getElementById(controlId(setting) + "-description");
	if (element) element.textContent = settingDescription(setting);
}

function setPending(id, value) {
	const original = snapshot.settings.find((setting) => setting.id === id)?.value;
	if (Object.is(original, value)) {
		pending.delete(id);
	} else {
		pending.set(id, value);
	}
	document.getElementById("save").disabled = pending.size === 0;
	statusKey(pending.size === 0 ? "dashboard.ui.noChanges" : "dashboard.ui.unsavedChanges");
	updateSettingDescription(id);
}

function controlId(setting) {
	return "setting-" + setting.id.replace(/[^a-zA-Z0-9_-]/g, "-");
}

function renderInput(setting) {
	if (setting.kind === "boolean") {
		const input = document.createElement("input");
		const inputId = controlId(setting);
		input.id = inputId;
		input.name = setting.id;
		input.type = "checkbox";
		input.checked = Boolean(settingValue(setting.id));
		input.disabled = !setting.editable;
		input.addEventListener("change", () => setPending(setting.id, input.checked));
		return input;
	}

	if (setting.kind === "number") {
		const input = document.createElement("input");
		const inputId = controlId(setting);
		input.id = inputId;
		input.name = setting.id;
		input.type = "number";
		input.value = String(settingValue(setting.id));
		if (setting.min !== undefined) input.min = String(setting.min);
		if (setting.max !== undefined) input.max = String(setting.max);
		input.disabled = !setting.editable;
		input.addEventListener("input", () => setPending(setting.id, Number(input.value)));
		return input;
	}

	if (setting.acceptsLocaleTag) {
		const wrapper = document.createElement("div");
		const select = document.createElement("select");
		const customInput = document.createElement("input");
		const inputId = controlId(setting);
		const customInputId = inputId + "-custom";
		const optionValues = setting.options || [];
		const currentValue = String(settingValue(setting.id));
		const customLocaleOptionValue = "__mustflow_custom_locale__";
		const isCustomValue = !optionValues.includes(currentValue);
		wrapper.className = "locale-tag-control";
		select.id = inputId;
		select.name = setting.id;
		for (const option of optionValues) {
			const child = document.createElement("option");
			child.value = option;
			child.textContent = option;
			child.selected = option === currentValue;
			select.appendChild(child);
		}
		const customChild = document.createElement("option");
		customChild.value = customLocaleOptionValue;
		customChild.textContent = message("dashboard.ui.customLocale");
		customChild.selected = isCustomValue;
		select.appendChild(customChild);
		select.disabled = !setting.editable;

		customInput.id = customInputId;
		customInput.name = setting.id + ".custom";
		customInput.type = "text";
		customInput.autocomplete = "off";
		customInput.spellcheck = false;
		customInput.placeholder = "pt-BR";
		customInput.value = isCustomValue ? currentValue : "";
		customInput.hidden = !isCustomValue;
		customInput.disabled = !setting.editable || !isCustomValue;
		customInput.setAttribute("aria-label", message("dashboard.ui.customLocale"));

		function updateCustomPending() {
			const value = customInput.value.trim();
			if (value.length > 0) {
				setPending(setting.id, value);
			} else {
				const original = snapshot.settings.find((item) => item.id === setting.id)?.value;
				if (original !== undefined) {
					setPending(setting.id, original);
				}
			}
		}

		select.addEventListener("change", () => {
			const customSelected = select.value === customLocaleOptionValue;
			customInput.hidden = !customSelected;
			customInput.disabled = !setting.editable || !customSelected;
			if (customSelected) {
				customInput.focus();
				updateCustomPending();
			} else {
				setPending(setting.id, select.value);
			}
		});
		customInput.addEventListener("input", updateCustomPending);
		wrapper.appendChild(select);
		wrapper.appendChild(customInput);
		return wrapper;
	}

	const select = document.createElement("select");
	const inputId = controlId(setting);
	select.id = inputId;
	select.name = setting.id;
	for (const option of setting.options || []) {
		const child = document.createElement("option");
		child.value = option;
		child.textContent = option;
		child.selected = option === settingValue(setting.id);
		select.appendChild(child);
	}
	select.disabled = !setting.editable;
	select.addEventListener("change", () => setPending(setting.id, select.value));
	return select;
}

function render() {
	const root = document.getElementById("settings");
	root.textContent = "";
	for (const [titleKey, matcher] of groups) {
		const settings = Array.isArray(matcher)
			? snapshot.settings.filter((setting) => matcher.includes(setting.id))
			: snapshot.settings.filter((setting) => setting.id.startsWith(matcher));
		if (settings.length === 0) continue;
		const section = document.createElement("section");
		const heading = document.createElement("h2");
		heading.textContent = message(titleKey);
		section.appendChild(heading);
		for (const setting of settings) {
			const row = document.createElement("div");
			row.className = "setting";
			const label = document.createElement("label");
			label.htmlFor = controlId(setting);
			const labelText = document.createElement("div");
			labelText.className = "label";
			const labelName = document.createElement("span");
			labelName.textContent = message("dashboard.setting." + setting.id) || setting.label;
			labelText.appendChild(labelName);
			const descriptionText = settingDescription(setting);
			if (descriptionText) {
				const description = document.createElement("span");
				description.id = controlId(setting) + "-description";
				description.className = "value-description";
				description.textContent = descriptionText;
				labelText.appendChild(description);
			}
			label.appendChild(labelText);
			if (!setting.editable) {
				const meta = document.createElement("div");
				meta.className = "meta";
				meta.textContent = setting.lockedReason
					? message("dashboard.ui.locked") + ": " + message(setting.lockedReason)
					: message("dashboard.ui.locked");
				label.appendChild(meta);
			}
			row.appendChild(label);
			row.appendChild(renderInput(setting));
			section.appendChild(row);
		}
		root.appendChild(section);
	}
}

function renderLocaleSelector() {
	const select = document.getElementById("dashboard-language");
	select.textContent = "";
	for (const locale of availableLocales) {
		const option = document.createElement("option");
		option.value = locale;
		option.textContent = dashboardLocales.names[locale] ?? locale;
		option.selected = locale === currentLocale;
		select.appendChild(option);
	}
}

function renderChrome() {
	document.documentElement.lang = currentLocale;
	document.getElementById("dashboard-title").textContent = message("dashboard.ui.title");
	document.getElementById("tab-status").textContent = message("dashboard.tab.status");
	document.getElementById("tab-verification").textContent = message("dashboard.tab.verification") + " (" + dashboardStatus.verification.recommendations.length + ")";
	document.getElementById("tab-commands").textContent = message("dashboard.tab.commands");
	document.getElementById("tab-release").textContent = message("dashboard.tab.release");
	document.getElementById("tab-update").textContent = message("dashboard.tab.update") + " (" + (dashboardStatus.update.blockers.length + dashboardStatus.update.changes.length) + ")";
	document.getElementById("tab-runs").textContent = message("dashboard.tab.runs");
	document.getElementById("tab-skills").textContent = message("dashboard.tab.skills") + " (" + dashboardStatus.skills.count + ")";
	document.getElementById("tab-settings").textContent = message("dashboard.tab.settings");
	document.getElementById("tab-documents").textContent = message("dashboard.tab.documents") + " (" + docReview.count + ")";
	const openMustflow = document.getElementById("open-mustflow");
	openMustflow.title = message("dashboard.ui.openMustflow");
	openMustflow.setAttribute("aria-label", message("dashboard.ui.openMustflow"));
	document.getElementById("dashboard-language-label").textContent = message("dashboard.ui.language");
	document.getElementById("reload").textContent = message("dashboard.ui.reload");
	document.getElementById("save").textContent = message("dashboard.ui.save");
	document.getElementById("save").hidden = currentTab !== "settings";
	document.getElementById("doc-status-filter-label").textContent = message("dashboard.docs.statusFilter");
	document.getElementById("doc-path-filter-label").textContent = message("dashboard.docs.pathFilter");
	document.getElementById("doc-review-fields-label").textContent = message("dashboard.docs.reviewFields");
	document.getElementById("doc-reviewer-kind-label").textContent = message("dashboard.docs.reviewerKind");
	document.getElementById("doc-reviewer-id-label").textContent = message("dashboard.docs.reviewerId");
	document.getElementById("doc-review-summary-label").textContent = message("dashboard.docs.summary");
	document.getElementById("doc-path-filter").placeholder = message("dashboard.docs.pathFilterPlaceholder");
	document.getElementById("doc-reviewer-id").placeholder = message("dashboard.docs.reviewerIdPlaceholder");
	document.getElementById("doc-review-summary").placeholder = message("dashboard.docs.summaryPlaceholder");
	renderStatus();
}

function renderTabState() {
	for (const tab of document.querySelectorAll(".tab")) {
		const selected = tab.dataset.tab === currentTab;
		tab.setAttribute("aria-selected", selected ? "true" : "false");
	}
	document.getElementById("panel-status").hidden = currentTab !== "status";
	document.getElementById("panel-verification").hidden = currentTab !== "verification";
	document.getElementById("panel-commands").hidden = currentTab !== "commands";
	document.getElementById("panel-release").hidden = currentTab !== "release";
	document.getElementById("panel-update").hidden = currentTab !== "update";
	document.getElementById("panel-runs").hidden = currentTab !== "runs";
	document.getElementById("panel-skills").hidden = currentTab !== "skills";
	document.getElementById("panel-settings").hidden = currentTab !== "settings";
	document.getElementById("panel-documents").hidden = currentTab !== "documents";
	renderChrome();
}

async function openMustflowFolder() {
	const response = await fetch("/api/open-mustflow", {
		method: "POST",
		headers: { "x-mustflow-dashboard-token": dashboardToken }
	});
	if (!response.ok) throw new Error(await response.text());
	statusKey("dashboard.ui.openedMustflow", "ok");
}

async function loadSnapshot() {
	const response = await fetch("/api/preferences", {
		headers: { "x-mustflow-dashboard-token": dashboardToken }
	});
	if (!response.ok) throw new Error(await response.text());
	snapshot = await response.json();
	pending = new Map();
	document.getElementById("save").disabled = true;
	statusKey("dashboard.ui.reloaded", "ok");
	render();
}

async function loadStatus() {
	const response = await fetch("/api/status", {
		headers: { "x-mustflow-dashboard-token": dashboardToken }
	});
	if (!response.ok) throw new Error(await response.text());
	dashboardStatus = await response.json();
	statusKey(
		currentTab === "commands"
			? "dashboard.commands.reloaded"
			: currentTab === "verification"
				? "dashboard.verification.reloaded"
			: currentTab === "release"
				? "dashboard.release.reloaded"
			: currentTab === "update"
				? "dashboard.update.reloaded"
			: currentTab === "runs"
				? "dashboard.runs.reloaded"
				: currentTab === "skills"
					? "dashboard.skills.reloaded"
					: "dashboard.status.reloaded",
		"ok"
	);
	renderStatusPanel();
	renderVerificationPanel();
	renderCommandPanel();
	renderReleasePanel();
	renderUpdatePanel();
	renderRunsPanel();
	renderSkillsPanel();
}

function docStatusQuery() {
	const value = document.getElementById("doc-status-filter").value;
	if (value === "active") return "";
	if (value === "all") return "?all=1";
	return "?status=" + encodeURIComponent(value);
}

function formatBoolean(value) {
	return message(value ? "dashboard.status.yes" : "dashboard.status.no");
}

function formatLatestRun(latestRun) {
	if (!latestRun.exists) return message("dashboard.status.latestRunMissing");
	if (!latestRun.valid) return message("dashboard.status.latestRunInvalid") + ": " + latestRun.error;
	const parts = [latestRun.intent, latestRun.status];
	if (latestRun.exit_code !== null) parts.push("exit " + latestRun.exit_code);
	if (latestRun.finished_at) parts.push(latestRun.finished_at);
	return parts.join(" / ");
}

function appendStatusItem(root, labelKey, value, tone = "") {
	const item = document.createElement("div");
	item.className = "status-item";
	const label = document.createElement("div");
	label.className = "status-label";
	label.textContent = message(labelKey);
	const content = document.createElement("div");
	content.className = tone ? "status-value " + tone : "status-value";
	content.textContent = value;
	item.appendChild(label);
	item.appendChild(content);
	root.appendChild(item);
}

function renderStatusPanel() {
	const root = document.getElementById("dashboard-status");
	root.textContent = "";
	const section = document.createElement("section");
	const heading = document.createElement("h2");
	heading.textContent = message("dashboard.status.overview");
	const grid = document.createElement("div");
	grid.className = "status-grid";
	const hasIssues = dashboardStatus.issues.length > 0 || dashboardStatus.changed_files.length > 0 || dashboardStatus.missing_files.length > 0;
	appendStatusItem(grid, "dashboard.status.installed", formatBoolean(dashboardStatus.installed), dashboardStatus.installed ? "ok" : "warn");
	appendStatusItem(grid, "dashboard.status.manifestLock", dashboardStatus.manifest_lock, dashboardStatus.manifest_lock === "present" ? "ok" : "warn");
	appendStatusItem(grid, "dashboard.status.template", dashboardStatus.template ? dashboardStatus.template.id + " " + dashboardStatus.template.version : message("value.none"));
	appendStatusItem(grid, "dashboard.status.trackedFiles", String(dashboardStatus.tracked_files));
	appendStatusItem(grid, "dashboard.status.changedFiles", String(dashboardStatus.changed_files.length), dashboardStatus.changed_files.length === 0 ? "ok" : "warn");
	appendStatusItem(grid, "dashboard.status.missingFiles", String(dashboardStatus.missing_files.length), dashboardStatus.missing_files.length === 0 ? "ok" : "warn");
	appendStatusItem(grid, "dashboard.status.runnableIntents", String(dashboardStatus.runnable_intents.length));
	appendStatusItem(grid, "dashboard.status.activeReviewDocuments", String(dashboardStatus.active_review_documents));
	appendStatusItem(grid, "dashboard.status.latestRun", formatLatestRun(dashboardStatus.latest_run), dashboardStatus.latest_run.exists && dashboardStatus.latest_run.valid ? "ok" : "");
	section.appendChild(heading);
	section.appendChild(grid);
	root.appendChild(section);

	const issuesSection = document.createElement("section");
	const issuesHeading = document.createElement("h2");
	issuesHeading.textContent = message("dashboard.status.issues");
	issuesSection.appendChild(issuesHeading);
	if (!hasIssues) {
		const empty = document.createElement("div");
		empty.className = "empty";
		empty.textContent = message("dashboard.status.noIssues");
		issuesSection.appendChild(empty);
	} else {
		const list = document.createElement("ul");
		list.className = "issue-list";
		for (const issue of dashboardStatus.issues) {
			const item = document.createElement("li");
			item.textContent = issue;
			list.appendChild(item);
		}
		for (const changed of dashboardStatus.changed_files) {
			const item = document.createElement("li");
			item.textContent = message("dashboard.status.changedFile") + ": " + changed;
			list.appendChild(item);
		}
		for (const missing of dashboardStatus.missing_files) {
			const item = document.createElement("li");
			item.textContent = message("dashboard.status.missingFile") + ": " + missing;
			list.appendChild(item);
		}
		issuesSection.appendChild(list);
	}
	root.appendChild(issuesSection);
}

async function copyVerificationCommand(command) {
	await navigator.clipboard.writeText(command);
	statusKey("dashboard.verification.copied", "ok");
}

async function copyReleaseCommand(command) {
	await navigator.clipboard.writeText(command);
	statusKey("dashboard.release.copied", "ok");
}

async function copyUpdateCommand(command) {
	await navigator.clipboard.writeText(command);
	statusKey("dashboard.update.copied", "ok");
}

function appendVerificationFiles(root, files) {
	if (files.length === 0) return;
	const details = document.createElement("div");
	details.className = "verification-files";
	details.textContent = message("dashboard.verification.files") + ": " + files.join(", ");
	root.appendChild(details);
}

function renderVerificationPanel() {
	const root = document.getElementById("dashboard-verification");
	root.textContent = "";
	const verification = dashboardStatus.verification;

	const section = document.createElement("section");
	const heading = document.createElement("h2");
	heading.textContent = message("dashboard.verification.recommendations");
	section.appendChild(heading);

	if (verification.changed_files.length === 0) {
		const empty = document.createElement("div");
		empty.className = "empty";
		empty.textContent = message("dashboard.verification.empty");
		section.appendChild(empty);
		root.appendChild(section);
		return;
	}

	if (verification.recommendations.length === 0) {
		const empty = document.createElement("div");
		empty.className = "empty";
		empty.textContent = message("dashboard.verification.none");
		section.appendChild(empty);
		root.appendChild(section);
		return;
	}

	for (const recommendation of verification.recommendations) {
		const row = document.createElement("div");
		row.className = "verification-row";
		const summary = document.createElement("div");
		const name = document.createElement("div");
		name.className = "command-name";
		name.textContent = recommendation.intent;
		const state = document.createElement("div");
		state.className = recommendation.runnable ? "command-state ok" : "command-state warn";
		state.textContent = recommendation.runnable ? message("dashboard.commands.runnable") : message("dashboard.verification.unavailable");
		summary.appendChild(name);
		summary.appendChild(state);

		const details = document.createElement("div");
		const command = document.createElement("div");
		command.className = "verification-command";
		command.textContent = recommendation.command;
		const reason = document.createElement("div");
		reason.className = "command-note";
		reason.textContent = message(recommendation.reason_key);
		details.appendChild(command);
		details.appendChild(reason);
		appendVerificationFiles(details, recommendation.files);

		const copy = document.createElement("button");
		copy.type = "button";
		copy.className = "verification-copy";
		copy.textContent = message("dashboard.verification.copy");
		copy.title = message("dashboard.verification.copy");
		copy.setAttribute("aria-label", message("dashboard.verification.copy"));
		copy.disabled = !recommendation.runnable;
		copy.addEventListener("click", () => {
			copyVerificationCommand(recommendation.command).catch((error) => statusText(error.message, "error"));
		});

		row.appendChild(summary);
		row.appendChild(details);
		row.appendChild(copy);
		section.appendChild(row);
	}

	root.appendChild(section);

	if (verification.skipped.length > 0) {
		const skippedSection = document.createElement("section");
		const skippedHeading = document.createElement("h2");
		skippedHeading.textContent = message("dashboard.verification.skipped");
		skippedSection.appendChild(skippedHeading);
		for (const skipped of verification.skipped) {
			const row = document.createElement("div");
			row.className = "command-note";
			row.textContent = skipped.intent + ": " + message(skipped.reason_key);
			skippedSection.appendChild(row);
		}
		root.appendChild(skippedSection);
	}
}

function appendCommandMeta(root, labelKey, value) {
	if (value === null || value === undefined || value === "") return;
	const item = document.createElement("span");
	item.textContent = message(labelKey) + ": " + value;
	root.appendChild(item);
}

function commandStateKey(intent) {
	if (intent.runnable) return "dashboard.commands.runnable";
	if (intent.status === "manual_only") return "dashboard.commands.manualOnly";
	if (intent.status === "unknown") return "dashboard.commands.unavailable";
	return "dashboard.commands.blocked";
}

function formatList(values) {
	return values.length === 0 ? message("value.none") : values.join(", ");
}

function renderCommandPanel() {
	const root = document.getElementById("dashboard-commands");
	root.textContent = "";
	const section = document.createElement("section");
	const heading = document.createElement("h2");
	heading.textContent = message("dashboard.commands.heading");
	section.appendChild(heading);

	if (!dashboardStatus.command_contract.exists || dashboardStatus.command_contract.intents.length === 0) {
		const empty = document.createElement("div");
		empty.className = "empty";
		empty.textContent = message("dashboard.commands.empty");
		section.appendChild(empty);
		root.appendChild(section);
		return;
	}

	for (const intent of dashboardStatus.command_contract.intents) {
		const row = document.createElement("div");
		row.className = "command-row";
		const summary = document.createElement("div");
		const name = document.createElement("div");
		name.className = "command-name";
		name.textContent = intent.name;
		const state = document.createElement("div");
		state.className = intent.runnable ? "command-state ok" : "command-state warn";
		state.textContent = message(commandStateKey(intent));
		summary.appendChild(name);
		summary.appendChild(state);

		const details = document.createElement("div");
		const description = document.createElement("div");
		description.className = "command-description";
		description.textContent = intent.description || message("value.none");
		const meta = document.createElement("div");
		meta.className = "command-meta";
		appendCommandMeta(meta, "dashboard.commands.status", intent.status);
		appendCommandMeta(meta, "dashboard.commands.lifecycle", intent.lifecycle);
		appendCommandMeta(meta, "dashboard.commands.runPolicy", intent.run_policy);
		appendCommandMeta(meta, "dashboard.commands.stdin", intent.stdin);
		appendCommandMeta(meta, "dashboard.commands.timeout", intent.timeout_seconds);
		appendCommandMeta(meta, "dashboard.commands.cwd", intent.cwd);
		appendCommandMeta(meta, "dashboard.commands.writes", formatList(intent.writes));
		details.appendChild(description);
		details.appendChild(meta);
		if (intent.reason) {
			const reason = document.createElement("div");
			reason.className = "command-note";
			reason.textContent = message("dashboard.commands.reason") + ": " + intent.reason;
			details.appendChild(reason);
		}
		if (intent.agent_action) {
			const action = document.createElement("div");
			action.className = "command-note";
			action.textContent = message("dashboard.commands.agentAction") + ": " + intent.agent_action;
			details.appendChild(action);
		}

		row.appendChild(summary);
		row.appendChild(details);
		section.appendChild(row);
	}

	root.appendChild(section);
}

function findIntent(name) {
	return dashboardStatus.command_contract.intents.find((intent) => intent.name === name);
}

function renderReleaseCommand(root, intentName, fallbackCommand, reasonKey) {
	const intent = findIntent(intentName);
	const row = document.createElement("div");
	row.className = "verification-row";
	const summary = document.createElement("div");
	const name = document.createElement("div");
	name.className = "command-name";
	name.textContent = intentName;
	const state = document.createElement("div");
	const runnable = intentName === "version_check" ? true : intent ? intent.runnable : false;
	state.className = runnable ? "command-state ok" : "command-state warn";
	state.textContent = runnable ? message("dashboard.commands.runnable") : message("dashboard.verification.unavailable");
	summary.appendChild(name);
	summary.appendChild(state);

	const details = document.createElement("div");
	const command = document.createElement("div");
	command.className = "verification-command";
	command.textContent = fallbackCommand;
	const reason = document.createElement("div");
	reason.className = "command-note";
	reason.textContent = message(reasonKey);
	details.appendChild(command);
	details.appendChild(reason);

	const copy = document.createElement("button");
	copy.type = "button";
	copy.className = "verification-copy";
	copy.textContent = message("dashboard.verification.copy");
	copy.title = message("dashboard.verification.copy");
	copy.setAttribute("aria-label", message("dashboard.verification.copy"));
	copy.disabled = !runnable;
	copy.addEventListener("click", () => {
		copyReleaseCommand(fallbackCommand).catch((error) => statusText(error.message, "error"));
	});

	row.appendChild(summary);
	row.appendChild(details);
	row.appendChild(copy);
	root.appendChild(row);
}

function renderReleasePanel() {
	const root = document.getElementById("dashboard-release");
	root.textContent = "";
	const overview = document.createElement("section");
	const overviewHeading = document.createElement("h2");
	overviewHeading.textContent = message("dashboard.release.overview");
	const grid = document.createElement("div");
	grid.className = "status-grid";
	appendStatusItem(grid, "dashboard.release.packageVersion", dashboardStatus.release.package_name + " " + dashboardStatus.release.package_version);
	appendStatusItem(grid, "dashboard.release.templateVersion", dashboardStatus.template ? dashboardStatus.template.id + " " + dashboardStatus.template.version : message("value.none"));
	appendStatusItem(grid, "dashboard.release.autoBump", formatBoolean(Boolean(settingValue("release.versioning.auto_bump"))), settingValue("release.versioning.auto_bump") ? "ok" : "");
	appendStatusItem(grid, "dashboard.release.requireConfirmation", formatBoolean(Boolean(settingValue("release.versioning.require_user_confirmation"))));
	appendStatusItem(grid, "dashboard.release.changedFiles", String(dashboardStatus.release.release_sensitive_changed_files.length), dashboardStatus.release.release_sensitive_changed_files.length === 0 ? "ok" : "warn");
	overview.appendChild(overviewHeading);
	overview.appendChild(grid);
	root.appendChild(overview);

	const sources = document.createElement("section");
	const sourcesHeading = document.createElement("h2");
	sourcesHeading.textContent = message("dashboard.release.versionSources");
	sources.appendChild(sourcesHeading);
	if (dashboardStatus.release.version_sources.length === 0) {
		const empty = document.createElement("div");
		empty.className = "empty";
		empty.textContent = message("dashboard.release.noVersionSources");
		sources.appendChild(empty);
	} else {
		for (const source of dashboardStatus.release.version_sources) {
			const row = document.createElement("div");
			row.className = "command-row";
			const summary = document.createElement("div");
			const name = document.createElement("div");
			name.className = "command-name";
			name.textContent = source.path;
			const state = document.createElement("div");
			state.className = "command-state";
			state.textContent = source.kind;
			summary.appendChild(name);
			summary.appendChild(state);
			const details = document.createElement("div");
			const meta = document.createElement("div");
			meta.className = "command-meta";
			appendCommandMeta(meta, "dashboard.release.declared", source.declared ? message("dashboard.status.yes") : message("dashboard.status.no"));
			appendCommandMeta(meta, "dashboard.release.authority", source.authority || message("value.none"));
			details.appendChild(meta);
			row.appendChild(summary);
			row.appendChild(details);
			sources.appendChild(row);
		}
	}
	root.appendChild(sources);

	const changed = document.createElement("section");
	const changedHeading = document.createElement("h2");
	changedHeading.textContent = message("dashboard.release.changedFiles");
	changed.appendChild(changedHeading);
	if (dashboardStatus.release.release_sensitive_changed_files.length === 0) {
		const empty = document.createElement("div");
		empty.className = "empty";
		empty.textContent = message("dashboard.release.noChangedFiles");
		changed.appendChild(empty);
	} else {
		const list = document.createElement("ul");
		list.className = "issue-list";
		for (const file of dashboardStatus.release.release_sensitive_changed_files) {
			const item = document.createElement("li");
			item.textContent = file;
			list.appendChild(item);
		}
		changed.appendChild(list);
	}
	root.appendChild(changed);

	const commands = document.createElement("section");
	const commandsHeading = document.createElement("h2");
	commandsHeading.textContent = message("dashboard.release.commands");
	commands.appendChild(commandsHeading);
	renderReleaseCommand(commands, "version_check", "mf version --check", "dashboard.release.reason.versionCheck");
	renderReleaseCommand(commands, "test_release", "mf run test_release", "dashboard.release.reason.testRelease");
	renderReleaseCommand(commands, "docs_validate", "mf run docs_validate", "dashboard.release.reason.docsValidate");
	root.appendChild(commands);
}

function renderUpdateCommand(root, command, labelKey, reasonKey, enabled = true) {
	const row = document.createElement("div");
	row.className = "verification-row";
	const summary = document.createElement("div");
	const name = document.createElement("div");
	name.className = "command-name";
	name.textContent = message(labelKey);
	const state = document.createElement("div");
	state.className = enabled ? "command-state ok" : "command-state warn";
	state.textContent = enabled ? message("dashboard.commands.runnable") : message("dashboard.update.blocked");
	summary.appendChild(name);
	summary.appendChild(state);

	const details = document.createElement("div");
	const commandText = document.createElement("div");
	commandText.className = "verification-command";
	commandText.textContent = command;
	const reason = document.createElement("div");
	reason.className = "command-note";
	reason.textContent = message(reasonKey);
	details.appendChild(commandText);
	details.appendChild(reason);

	const copy = document.createElement("button");
	copy.type = "button";
	copy.className = "verification-copy";
	copy.textContent = message("dashboard.verification.copy");
	copy.title = message("dashboard.verification.copy");
	copy.setAttribute("aria-label", message("dashboard.verification.copy"));
	copy.disabled = !enabled;
	copy.addEventListener("click", () => {
		copyUpdateCommand(command).catch((error) => statusText(error.message, "error"));
	});

	row.appendChild(summary);
	row.appendChild(details);
	row.appendChild(copy);
	root.appendChild(row);
}

function renderUpdateItem(root, item) {
	const row = document.createElement("div");
	row.className = "command-row";
	const summary = document.createElement("div");
	const name = document.createElement("div");
	name.className = "command-name";
	name.textContent = item.relativePath;
	const state = document.createElement("div");
	state.className = item.action === "create" || item.action === "update" ? "command-state ok" : "command-state warn";
	state.textContent = message("dashboard.update.action." + item.action);
	summary.appendChild(name);
	summary.appendChild(state);

	const details = document.createElement("div");
	const meta = document.createElement("div");
	meta.className = "command-meta";
	appendCommandMeta(meta, "dashboard.update.source", item.sourceKind);
	const reason = document.createElement("div");
	reason.className = "command-note";
	reason.textContent = message("dashboard.update.reason") + ": " + item.reason;
	details.appendChild(meta);
	details.appendChild(reason);

	row.appendChild(summary);
	row.appendChild(details);
	root.appendChild(row);
}

function renderUpdateItemList(root, titleKey, emptyKey, items) {
	const section = document.createElement("section");
	const heading = document.createElement("h2");
	heading.textContent = message(titleKey);
	section.appendChild(heading);
	if (items.length === 0) {
		const empty = document.createElement("div");
		empty.className = "empty";
		empty.textContent = message(emptyKey);
		section.appendChild(empty);
	} else {
		for (const item of items) renderUpdateItem(section, item);
	}
	root.appendChild(section);
}

function renderUpdatePanel() {
	const root = document.getElementById("dashboard-update");
	root.textContent = "";
	const update = dashboardStatus.update;

	const overview = document.createElement("section");
	const heading = document.createElement("h2");
	heading.textContent = message("dashboard.update.overview");
	const grid = document.createElement("div");
	grid.className = "status-grid";
	appendStatusItem(grid, "dashboard.update.dryRun", update.ok ? message("dashboard.status.yes") : message("dashboard.status.no"), update.ok ? "ok" : "warn");
	appendStatusItem(grid, "dashboard.update.applyReady", update.apply_ready ? message("dashboard.status.yes") : message("dashboard.status.no"), update.apply_ready ? "ok" : "warn");
	appendStatusItem(grid, "dashboard.update.wouldUpdate", String(update.summary.wouldUpdate));
	appendStatusItem(grid, "dashboard.update.wouldCreate", String(update.summary.wouldCreate));
	appendStatusItem(grid, "dashboard.update.blockedLocalChanges", String(update.summary.blockedLocalChanges), update.summary.blockedLocalChanges === 0 ? "ok" : "warn");
	appendStatusItem(grid, "dashboard.update.manualReview", String(update.summary.manualReview), update.summary.manualReview === 0 ? "ok" : "warn");
	appendStatusItem(grid, "dashboard.update.unchanged", String(update.summary.unchanged));
	overview.appendChild(heading);
	overview.appendChild(grid);
	if (update.error) {
		const error = document.createElement("div");
		error.className = "command-note";
		error.textContent = message("dashboard.update.error") + ": " + update.error;
		overview.appendChild(error);
	}
	root.appendChild(overview);

	const commands = document.createElement("section");
	const commandsHeading = document.createElement("h2");
	commandsHeading.textContent = message("dashboard.update.commands");
	commands.appendChild(commandsHeading);
	renderUpdateCommand(commands, update.dry_run_command, "dashboard.update.command.dryRun", "dashboard.update.reason.dryRun", update.ok);
	renderUpdateCommand(commands, update.apply_command, "dashboard.update.command.apply", "dashboard.update.reason.apply", update.ok && update.apply_ready);
	root.appendChild(commands);

	renderUpdateItemList(root, "dashboard.update.blockers", "dashboard.update.noBlockers", update.blockers);
	renderUpdateItemList(root, "dashboard.update.changes", "dashboard.update.noChanges", update.changes);
}

function formatDuration(value) {
	if (typeof value !== "number") return message("value.none");
	if (value < 1000) return String(value) + " ms";
	return (value / 1000).toFixed(2) + " s";
}

function renderRunOutput(root, titleKey, output) {
	const section = document.createElement("section");
	const heading = document.createElement("h2");
	heading.textContent = message(titleKey);
	section.appendChild(heading);
	const meta = document.createElement("div");
	meta.className = "command-meta";
	appendCommandMeta(meta, "dashboard.runs.bytes", output.bytes);
	appendCommandMeta(meta, "dashboard.runs.truncated", formatBoolean(output.truncated));
	section.appendChild(meta);
	if (output.tail) {
		const pre = document.createElement("pre");
		pre.className = "doc-comment";
		pre.textContent = output.tail;
		section.appendChild(pre);
	} else {
		const empty = document.createElement("div");
		empty.className = "empty";
		empty.textContent = message("dashboard.runs.emptyOutput");
		section.appendChild(empty);
	}
	root.appendChild(section);
}

function renderRunsPanel() {
	const root = document.getElementById("dashboard-runs");
	root.textContent = "";
	const run = dashboardStatus.run_history;

	const overview = document.createElement("section");
	const heading = document.createElement("h2");
	heading.textContent = message("dashboard.runs.heading");
	overview.appendChild(heading);

	if (!run.exists) {
		const empty = document.createElement("div");
		empty.className = "empty";
		empty.textContent = message("dashboard.runs.empty");
		overview.appendChild(empty);
		root.appendChild(overview);
		return;
	}

	if (!run.valid) {
		const error = document.createElement("div");
		error.className = "command-note";
		error.textContent = message("dashboard.runs.invalid") + ": " + run.error;
		overview.appendChild(error);
		root.appendChild(overview);
		return;
	}

	const grid = document.createElement("div");
	grid.className = "status-grid";
	appendStatusItem(grid, "dashboard.runs.intent", run.intent);
	appendStatusItem(grid, "dashboard.runs.status", run.status, run.status === "passed" ? "ok" : "warn");
	appendStatusItem(grid, "dashboard.runs.exitCode", run.exit_code === null ? message("value.none") : String(run.exit_code));
	appendStatusItem(grid, "dashboard.runs.timedOut", formatBoolean(run.timed_out), run.timed_out ? "warn" : "ok");
	appendStatusItem(grid, "dashboard.runs.startedAt", run.started_at || message("value.none"));
	appendStatusItem(grid, "dashboard.runs.finishedAt", run.finished_at || message("value.none"));
	appendStatusItem(grid, "dashboard.runs.duration", formatDuration(run.duration_ms));
	appendStatusItem(grid, "dashboard.runs.cwd", run.cwd || message("value.none"));
	appendStatusItem(grid, "dashboard.runs.mode", run.mode || message("value.none"));
	appendStatusItem(grid, "dashboard.runs.timeout", String(run.timeout_seconds));
	appendStatusItem(grid, "dashboard.runs.receiptPath", run.receipt_path || run.path);
	overview.appendChild(grid);

	const meta = document.createElement("div");
	meta.className = "command-meta";
	appendCommandMeta(meta, "dashboard.runs.lifecycle", run.lifecycle);
	appendCommandMeta(meta, "dashboard.runs.runPolicy", run.run_policy);
	appendCommandMeta(meta, "dashboard.runs.successExitCodes", formatList(run.success_exit_codes.map(String)));
	appendCommandMeta(meta, "dashboard.runs.signal", run.signal || message("value.none"));
	appendCommandMeta(meta, "dashboard.runs.killMethod", run.kill_method || message("value.none"));
	overview.appendChild(meta);

	if (run.command_line.length > 0) {
		const command = document.createElement("div");
		command.className = "verification-command";
		command.textContent = run.command_line.join(" ");
		overview.appendChild(command);
	}

	if (run.error) {
		const error = document.createElement("div");
		error.className = "command-note";
		error.textContent = message("dashboard.runs.error") + ": " + run.error;
		overview.appendChild(error);
	}

	root.appendChild(overview);
	renderRunOutput(root, "dashboard.runs.stdout", run.stdout);
	renderRunOutput(root, "dashboard.runs.stderr", run.stderr);
}

function skillAlignmentKey(route) {
	if (!route.exists) return "dashboard.skills.missing";
	return route.aligned ? "dashboard.skills.aligned" : "dashboard.skills.mismatch";
}

function renderSkillsPanel() {
	const root = document.getElementById("dashboard-skills");
	root.textContent = "";
	const overview = document.createElement("section");
	const heading = document.createElement("h2");
	heading.textContent = message("dashboard.skills.heading");
	const grid = document.createElement("div");
	grid.className = "status-grid";
	appendStatusItem(grid, "dashboard.skills.indexPath", dashboardStatus.skills.index_path);
	appendStatusItem(grid, "dashboard.skills.routes", String(dashboardStatus.skills.count));
	overview.appendChild(heading);
	overview.appendChild(grid);
	root.appendChild(overview);

	const section = document.createElement("section");
	const routesHeading = document.createElement("h2");
	routesHeading.textContent = message("dashboard.skills.routes");
	section.appendChild(routesHeading);

	if (!dashboardStatus.skills.exists || dashboardStatus.skills.routes.length === 0) {
		const empty = document.createElement("div");
		empty.className = "empty";
		empty.textContent = message("dashboard.skills.empty");
		section.appendChild(empty);
		root.appendChild(section);
		return;
	}

	for (const route of dashboardStatus.skills.routes) {
		const row = document.createElement("div");
		row.className = "command-row";
		const summary = document.createElement("div");
		const name = document.createElement("div");
		name.className = "command-name";
		name.textContent = route.skill;
		const state = document.createElement("div");
		state.className = route.exists && route.aligned ? "command-state ok" : "command-state warn";
		state.textContent = message(skillAlignmentKey(route));
		summary.appendChild(name);
		summary.appendChild(state);

		const details = document.createElement("div");
		const trigger = document.createElement("div");
		trigger.className = "command-description";
		trigger.textContent = route.trigger;
		const meta = document.createElement("div");
		meta.className = "command-meta";
		appendCommandMeta(meta, "dashboard.skills.path", route.skill_path);
		appendCommandMeta(meta, "dashboard.skills.requiredInput", route.required_input);
		appendCommandMeta(meta, "dashboard.skills.editScope", route.edit_scope);
		appendCommandMeta(meta, "dashboard.skills.risk", route.risk);
		appendCommandMeta(meta, "dashboard.skills.verificationIntents", formatList(route.verification_intents));
		appendCommandMeta(meta, "dashboard.skills.declaredCommandIntents", formatList(route.declared_command_intents));
		details.appendChild(trigger);
		details.appendChild(meta);
		if (route.expected_output) {
			const output = document.createElement("div");
			output.className = "command-note";
			output.textContent = message("dashboard.skills.expectedOutput") + ": " + route.expected_output;
			details.appendChild(output);
		}

		row.appendChild(summary);
		row.appendChild(details);
		section.appendChild(row);
	}

	root.appendChild(section);
}

async function loadDocuments() {
	const response = await fetch("/api/docs/review" + docStatusQuery(), {
		headers: { "x-mustflow-dashboard-token": dashboardToken }
	});
	if (!response.ok) throw new Error(await response.text());
	docReview = await response.json();
	statusKey("dashboard.docs.reloaded", "ok");
	renderChrome();
	renderDocuments();
}

async function save() {
	const updates = Array.from(pending, ([id, value]) => ({ id, value }));
	const response = await fetch("/api/preferences", {
		method: "POST",
		headers: {
			"content-type": "application/json",
			"x-mustflow-dashboard-token": dashboardToken
		},
		body: JSON.stringify({ updates })
	});
	if (!response.ok) throw new Error(await response.text());
	snapshot = await response.json();
	pending = new Map();
	document.getElementById("save").disabled = true;
	statusKey("dashboard.ui.saved", "ok");
	render();
}

async function markDocument(path, status) {
	const reviewerId = document.getElementById("doc-reviewer-id").value.trim();
	if (!reviewerId) {
		statusKey("dashboard.docs.missingReviewerId", "error");
		return;
	}

	const response = await fetch("/api/docs/review" + docStatusQuery(), {
		method: "POST",
		headers: {
			"content-type": "application/json",
			"x-mustflow-dashboard-token": dashboardToken
		},
		body: JSON.stringify({
			path,
			status,
			reviewerKind: document.getElementById("doc-reviewer-kind").value,
			reviewerId,
			summary: document.getElementById("doc-review-summary").value.trim()
		})
	});
	if (!response.ok) throw new Error(await response.text());
	docReview = await response.json();
	statusKey("dashboard.docs.updated", "ok");
	renderChrome();
	renderDocuments();
}

function renderDocFilters() {
	const statusSelect = document.getElementById("doc-status-filter");
	const currentStatus = statusSelect.value || "active";
	statusSelect.textContent = "";
	for (const value of docStatusFilters) {
		const option = document.createElement("option");
		option.value = value;
		option.textContent = message("dashboard.docs.filter." + value);
		option.selected = value === currentStatus;
		statusSelect.appendChild(option);
	}

	const kindSelect = document.getElementById("doc-reviewer-kind");
	const currentKind = kindSelect.value || "human";
	kindSelect.textContent = "";
	for (const value of reviewerKinds) {
		const option = document.createElement("option");
		option.value = value;
		option.textContent = message("dashboard.docs.reviewerKind." + value);
		option.selected = value === currentKind;
		kindSelect.appendChild(option);
	}
}

function documentMatchesPathFilter(entry, query) {
	const normalizedQuery = query.trim().toLowerCase();
	if (!normalizedQuery) return true;
	const path = String(entry.path || "");
	const fileName = path.split(/[\\\\/]/u).pop() || path;
	return path.toLowerCase().includes(normalizedQuery) || fileName.toLowerCase().includes(normalizedQuery);
}

function currentReviewerId() {
	return document.getElementById("doc-reviewer-id").value.trim();
}

function renderDocuments() {
	const root = document.getElementById("docs-review-list");
	root.textContent = "";

	if (docReview.documents.length === 0) {
		const empty = document.createElement("div");
		empty.className = "empty";
		empty.textContent = message("dashboard.docs.empty");
		root.appendChild(empty);
		return;
	}

	const pathFilter = document.getElementById("doc-path-filter").value;
	const documents = docReview.documents.filter((entry) => documentMatchesPathFilter(entry, pathFilter));
	if (documents.length === 0) {
		const empty = document.createElement("div");
		empty.className = "empty";
		empty.textContent = message("dashboard.docs.noSearchMatches");
		root.appendChild(empty);
		return;
	}

	for (const entry of documents) {
		const row = document.createElement("div");
		row.className = "doc-row";
		const details = document.createElement("div");
		const docPath = document.createElement("div");
		docPath.className = "doc-path";
		docPath.textContent = entry.path;
		const meta = document.createElement("div");
		meta.className = "doc-meta";
		meta.textContent = entry.reason;
		details.appendChild(docPath);
		details.appendChild(meta);
		if (entry.review_comment) {
			const comment = document.createElement("pre");
			comment.className = "doc-comment";
			comment.textContent = message("dashboard.docs.comment") + ":\\n" + entry.review_comment;
			details.appendChild(comment);
		}

		const status = document.createElement("div");
		status.className = "doc-status";
		status.textContent = message("dashboard.docs.status." + entry.status);

		const actions = document.createElement("div");
		actions.className = "doc-actions";
		const reviewerIdMissing = currentReviewerId().length === 0;
		for (const [nextStatus, labelKey, tooltipKey] of [
			["approved", "dashboard.docs.action.approve", "dashboard.docs.action.approve.tooltip"],
			["needs_human", "dashboard.docs.action.needsReview", "dashboard.docs.action.needsReview.tooltip"],
			["ignored", "dashboard.docs.action.ignore", "dashboard.docs.action.ignore.tooltip"]
		]) {
			const button = document.createElement("button");
			button.type = "button";
			button.textContent = message(labelKey);
			const actionLabel = reviewerIdMissing ? message("dashboard.docs.missingReviewerId") : message(tooltipKey);
			button.title = actionLabel;
			button.setAttribute("aria-label", actionLabel);
			button.disabled = reviewerIdMissing || entry.status === nextStatus;
			button.addEventListener("click", () => {
				markDocument(entry.path, nextStatus).catch((error) => statusText(error.message, "error"));
			});
			actions.appendChild(button);
		}

		row.appendChild(details);
		row.appendChild(status);
		row.appendChild(actions);
		root.appendChild(row);
	}
}

document.getElementById("dashboard-language").addEventListener("change", (event) => {
	currentLocale = event.target.value;
	window.localStorage.setItem("mustflow.dashboard.language", currentLocale);
	renderLocaleSelector();
	renderChrome();
	renderDocFilters();
	renderStatusPanel();
	renderVerificationPanel();
	renderCommandPanel();
	renderReleasePanel();
	renderUpdatePanel();
	renderRunsPanel();
	renderSkillsPanel();
	render();
	renderDocuments();
});

document.getElementById("reload").addEventListener("click", () => {
	const action = currentTab === "documents" ? loadDocuments() : currentTab === "settings" ? loadSnapshot() : loadStatus();
	action.catch((error) => statusText(error.message, "error"));
});
document.getElementById("save").addEventListener("click", () => {
	save().catch((error) => statusText(error.message, "error"));
});
document.getElementById("open-mustflow").addEventListener("click", () => {
	openMustflowFolder().catch((error) => statusText(error.message, "error"));
});
document.getElementById("doc-status-filter").addEventListener("change", () => {
	loadDocuments().catch((error) => statusText(error.message, "error"));
});
document.getElementById("doc-path-filter").addEventListener("input", () => {
	renderDocuments();
});
document.getElementById("doc-reviewer-id").addEventListener("input", () => {
	renderDocuments();
});
for (const tab of document.querySelectorAll(".tab")) {
	tab.addEventListener("click", () => {
		currentTab = tab.dataset.tab;
		renderTabState();
		if (currentTab === "documents") {
			loadDocuments().catch((error) => statusText(error.message, "error"));
		} else if (currentTab === "status" || currentTab === "verification" || currentTab === "commands" || currentTab === "release" || currentTab === "update" || currentTab === "runs" || currentTab === "skills") {
			loadStatus().catch((error) => statusText(error.message, "error"));
		}
	});
}
renderLocaleSelector();
renderDocFilters();
renderChrome();
renderTabState();
renderStatusPanel();
renderVerificationPanel();
renderCommandPanel();
renderReleasePanel();
renderUpdatePanel();
renderRunsPanel();
renderSkillsPanel();
render();
renderDocuments();
</script>
</body>
</html>`;
}
