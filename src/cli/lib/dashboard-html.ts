import type { DashboardPreferencesSnapshot } from './dashboard-preferences.js';
import { getDashboardLocaleBundle } from './dashboard-locale.js';

export interface DashboardDocReviewSnapshot {
	readonly schema_version: '1';
	readonly command: 'docs review list';
	readonly ledger_path: string;
	readonly count: number;
	readonly documents: readonly unknown[];
}

export type DashboardCommandEffectGraphStatusKind = 'fresh' | 'missing' | 'stale' | 'unreadable';

export interface DashboardCommandEffectGraphStatus {
	readonly source: 'local_index';
	readonly authority: 'explanation_only';
	readonly command_authority: '.mustflow/config/commands.toml';
	readonly grants_command_authority: false;
	readonly status: DashboardCommandEffectGraphStatusKind;
	readonly database_path: string;
	readonly index_fresh: boolean;
	readonly stale_paths: readonly string[];
	readonly refresh_hint: string | null;
}

export interface DashboardCommandWriteLock {
	readonly lock: string;
	readonly paths: readonly string[];
	readonly modes: readonly string[];
	readonly sources: readonly string[];
	readonly concurrencies: readonly string[];
	readonly effect_count: number;
}

export interface DashboardCommandLockConflict {
	readonly intent: string;
	readonly lock: string;
	readonly paths: readonly string[];
	readonly modes: readonly string[];
	readonly concurrencies: readonly string[];
	readonly conflicting_paths: readonly string[];
	readonly conflicting_modes: readonly string[];
	readonly conflicting_concurrencies: readonly string[];
}

export interface DashboardCommandEffectGraph extends DashboardCommandEffectGraphStatus {
	readonly write_locks: readonly DashboardCommandWriteLock[];
	readonly lock_conflicts: readonly DashboardCommandLockConflict[];
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
				readonly stdout: {
					readonly bytes: number;
					readonly truncated: boolean;
					readonly tail: string;
					readonly redacted: boolean;
					readonly redaction_count: number;
					readonly redaction_kinds: readonly string[];
				};
				readonly stderr: {
					readonly bytes: number;
					readonly truncated: boolean;
					readonly tail: string;
					readonly redacted: boolean;
					readonly redaction_count: number;
					readonly redaction_kinds: readonly string[];
				};
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
		readonly effect_graph_status?: DashboardCommandEffectGraphStatus;
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
			readonly effect_graph?: DashboardCommandEffectGraph;
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
		readonly schedule: {
			readonly runner: string;
			readonly failurePolicy: {
				readonly mode: string;
				readonly startedBatch: string;
				readonly nextBatch: string;
			};
			readonly batches: readonly {
				readonly index: number;
				readonly intents: readonly string[];
				readonly commands: readonly string[];
				readonly locks: readonly string[];
			}[];
			readonly entries: readonly {
				readonly intent: string;
				readonly command: string;
				readonly parallelEligible: boolean;
				readonly parallelReason: string;
				readonly locks: readonly string[];
				readonly effects: readonly {
					readonly access: string;
					readonly mode: string;
					readonly path: string | null;
					readonly lock: string;
					readonly concurrency: string;
				}[];
				readonly conflicts: readonly {
					readonly intent: string;
					readonly lock: string;
					readonly detail: string;
				}[];
			}[];
			readonly notes: readonly string[];
		};
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
	--row-bg: rgba(255, 255, 255, 0.018);
	--row-bg-alt: rgba(255, 255, 255, 0.035);
	--status-neutral-bg: rgba(174, 182, 197, 0.1);
	--status-ok-bg: rgba(155, 231, 186, 0.1);
	--status-warn-bg: rgba(255, 154, 154, 0.1);
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
button:focus-visible,
select:focus-visible,
input:focus-visible {
	outline: 2px solid var(--accent);
	outline-offset: 2px;
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
.last-updated {
	color: var(--muted);
	font-size: 13px;
	white-space: nowrap;
}
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
.settings-pending {
	border: 1px solid var(--line);
	border-radius: 6px;
	margin-bottom: 14px;
	padding: 10px 12px;
}
.settings-pending[hidden] {
	display: none;
}
.settings-pending-header {
	align-items: center;
	display: flex;
	flex-wrap: wrap;
	gap: 10px;
	justify-content: space-between;
}
.settings-pending-title {
	color: var(--text);
	font-size: 15px;
	font-weight: 650;
}
.settings-pending-list {
	color: var(--muted);
	font-size: 13px;
	line-height: 1.45;
	margin: 8px 0 0;
	padding-left: 18px;
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
	align-items: center;
	display: flex;
	flex-wrap: wrap;
	gap: 6px;
	font-size: 15px;
	overflow-wrap: anywhere;
}
.status-value.ok { color: var(--ok); }
.status-value.warn { color: var(--danger); }
.status-badge {
	border: 1px solid var(--line);
	border-radius: 999px;
	color: var(--text);
	display: inline-flex;
	font-size: 12px;
	font-weight: 650;
	line-height: 1;
	padding: 3px 7px;
	white-space: nowrap;
}
.status-badge.ok {
	border-color: rgba(155, 231, 186, 0.55);
	color: var(--ok);
}
.status-badge.warn {
	border-color: rgba(255, 154, 154, 0.55);
	color: var(--danger);
}
.next-actions {
	display: grid;
	gap: 0;
}
.next-action-row {
	align-items: center;
	border-bottom: 1px solid var(--line);
	display: grid;
	gap: 10px;
	grid-template-columns: minmax(0, 1fr) auto;
	padding: 8px 0;
}
.next-action-title {
	font-size: 15px;
	font-weight: 650;
	overflow-wrap: anywhere;
}
.next-action-meta {
	color: var(--muted);
	font-size: 13px;
	margin-top: 2px;
	overflow-wrap: anywhere;
}
.next-action-row button {
	min-height: 34px;
	padding: 0 10px;
}
.issue-list {
	margin: 0;
	padding-left: 18px;
}
.issue-list li {
	margin: 4px 0;
	overflow-wrap: anywhere;
}
.command-row {
	align-items: start;
	background: var(--row-bg);
	border-bottom: 1px solid var(--line);
	border-radius: 6px;
	display: grid;
	gap: 10px;
	grid-template-columns: minmax(160px, 220px) 1fr;
	margin-bottom: 6px;
	padding: 10px;
}
.command-row:nth-of-type(even) {
	background: var(--row-bg-alt);
}
.command-name {
	font-weight: 650;
	overflow-wrap: anywhere;
}
.command-state {
	align-items: center;
	background: var(--status-neutral-bg);
	border: 1px solid var(--line);
	border-radius: 999px;
	color: var(--muted);
	display: inline-flex;
	font-size: 13px;
	font-weight: 650;
	line-height: 1;
	margin-top: 4px;
	padding: 4px 7px;
	white-space: nowrap;
}
.command-state.ok {
	background: var(--status-ok-bg);
	border-color: rgba(155, 231, 186, 0.55);
	color: var(--ok);
}
.command-state.warn {
	background: var(--status-warn-bg);
	border-color: rgba(255, 154, 154, 0.55);
	color: var(--danger);
}
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
.collapsible-details {
	border-top: 1px solid var(--line);
	padding: 10px 0;
}
.collapsible-details > summary {
	color: var(--muted);
	cursor: pointer;
	font-size: 15px;
	font-weight: 650;
	overflow-wrap: anywhere;
}
.collapsible-details > summary:focus-visible {
	outline: 2px solid var(--accent);
	outline-offset: 2px;
}
.collapsible-details[open] > summary {
	color: var(--text);
	margin-bottom: 8px;
}
.verification-row {
	align-items: start;
	background: var(--row-bg);
	border-bottom: 1px solid var(--line);
	border-radius: 6px;
	display: grid;
	gap: 10px;
	grid-template-columns: minmax(160px, 220px) 1fr auto;
	margin-bottom: 6px;
	padding: 10px;
}
.verification-row:nth-of-type(even) {
	background: var(--row-bg-alt);
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
.list-filters {
	align-items: end;
	display: grid;
	gap: 10px;
	grid-template-columns: minmax(180px, 1fr) minmax(130px, 190px);
	margin: 0 0 12px;
}
.list-filters label {
	display: grid;
	gap: 5px;
}
.list-filters span {
	color: var(--muted);
	font-size: 13px;
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
.doc-reviewer-state {
	color: var(--muted);
	font-size: 13px;
	margin-bottom: 10px;
}
.doc-reviewer-state.warn {
	color: var(--danger);
}
.doc-list {
	border-top: 1px solid var(--line);
}
.doc-row {
	align-items: start;
	background: var(--row-bg);
	border-bottom: 1px solid var(--line);
	border-radius: 6px;
	display: grid;
	gap: 12px;
	grid-template-columns: minmax(0, 1fr) minmax(90px, auto) auto;
	margin-bottom: 6px;
	padding: 10px;
}
.doc-row:nth-of-type(even) {
	background: var(--row-bg-alt);
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
	align-items: center;
	background: var(--status-neutral-bg);
	border: 1px solid var(--line);
	border-radius: 999px;
	color: var(--muted);
	display: inline-flex;
	font-size: 13px;
	font-weight: 650;
	line-height: 1;
	padding: 4px 7px;
	white-space: nowrap;
}
.doc-status.approved {
	background: var(--status-ok-bg);
	border-color: rgba(155, 231, 186, 0.55);
	color: var(--ok);
}
.doc-status.needs_human {
	background: var(--status-warn-bg);
	border-color: rgba(255, 154, 154, 0.55);
	color: var(--danger);
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
	.list-filters,
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
	<nav class="tabs" role="tablist" aria-label="Dashboard sections">
		<button id="tab-status" class="tab" type="button" role="tab" data-tab="status" aria-controls="panel-status" aria-selected="true" tabindex="0">Status</button>
		<button id="tab-verification" class="tab" type="button" role="tab" data-tab="verification" aria-controls="panel-verification" aria-selected="false" tabindex="-1">Verification</button>
		<button id="tab-commands" class="tab" type="button" role="tab" data-tab="commands" aria-controls="panel-commands" aria-selected="false" tabindex="-1">Commands</button>
		<button id="tab-release" class="tab" type="button" role="tab" data-tab="release" aria-controls="panel-release" aria-selected="false" tabindex="-1">Release</button>
		<button id="tab-update" class="tab" type="button" role="tab" data-tab="update" aria-controls="panel-update" aria-selected="false" tabindex="-1">Update</button>
		<button id="tab-runs" class="tab" type="button" role="tab" data-tab="runs" aria-controls="panel-runs" aria-selected="false" tabindex="-1">Runs</button>
		<button id="tab-skills" class="tab" type="button" role="tab" data-tab="skills" aria-controls="panel-skills" aria-selected="false" tabindex="-1">Skills</button>
		<button id="tab-settings" class="tab" type="button" role="tab" data-tab="settings" aria-controls="panel-settings" aria-selected="false" tabindex="-1">Settings</button>
		<button id="tab-documents" class="tab" type="button" role="tab" data-tab="documents" aria-controls="panel-documents" aria-selected="false" tabindex="-1">Documents</button>
	</nav>
	<div class="toolbar">
		<div id="status" class="status" role="status" aria-live="polite">No changes</div>
		<div id="last-updated" class="last-updated" aria-live="polite"></div>
		<label class="language-picker" for="dashboard-language">
			<span id="dashboard-language-label">Language</span>
			<select id="dashboard-language" name="dashboard-language"></select>
		</label>
		<button id="reload" type="button">Reload</button>
		<button id="save" type="button" disabled>Save</button>
	</div>
	<div id="panel-status" class="tab-panel" role="tabpanel" aria-labelledby="tab-status">
		<div id="dashboard-status"></div>
	</div>
	<div id="panel-verification" class="tab-panel" role="tabpanel" aria-labelledby="tab-verification" hidden>
		<div id="dashboard-verification"></div>
	</div>
	<div id="panel-commands" class="tab-panel" role="tabpanel" aria-labelledby="tab-commands" hidden>
		<div id="dashboard-commands"></div>
	</div>
	<div id="panel-release" class="tab-panel" role="tabpanel" aria-labelledby="tab-release" hidden>
		<div id="dashboard-release"></div>
	</div>
	<div id="panel-update" class="tab-panel" role="tabpanel" aria-labelledby="tab-update" hidden>
		<div id="dashboard-update"></div>
	</div>
	<div id="panel-runs" class="tab-panel" role="tabpanel" aria-labelledby="tab-runs" hidden>
		<div id="dashboard-runs"></div>
	</div>
	<div id="panel-skills" class="tab-panel" role="tabpanel" aria-labelledby="tab-skills" hidden>
		<div id="dashboard-skills"></div>
	</div>
	<div id="panel-settings" class="tab-panel" role="tabpanel" aria-labelledby="tab-settings" hidden>
		<div id="settings-pending-summary" class="settings-pending" aria-live="polite" hidden></div>
		<div id="settings"></div>
	</div>
	<div id="panel-documents" class="tab-panel" role="tabpanel" aria-labelledby="tab-documents" hidden>
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
		<div id="doc-reviewer-state" class="doc-reviewer-state" aria-live="polite"></div>
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
let lastUpdatedAt = new Date();
let loadingCount = 0;
const listFilters = {
	verification: { query: "", state: "all" },
	commands: { query: "", state: "all" },
	skills: { query: "", state: "all" }
};

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
const copyFeedbackMs = 1500;
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

function messageWithTime(key, time) {
	return messageFormat(key, { time });
}

function messageWithCount(key, count) {
	return messageFormat(key, { count });
}

function messageFormat(key, values) {
	let text = message(key);
	for (const [name, value] of Object.entries(values)) {
		text = text.replaceAll("{" + name + "}", String(value));
	}
	return text;
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

function renderLastUpdated() {
	const element = document.getElementById("last-updated");
	const formatted = new Intl.DateTimeFormat(currentLocale, {
		hour: "2-digit",
		minute: "2-digit",
		second: "2-digit"
	}).format(lastUpdatedAt);
	element.textContent = messageWithTime("dashboard.ui.lastUpdated", formatted);
}

function setLoading(loading) {
	loadingCount = Math.max(0, loadingCount + (loading ? 1 : -1));
	const isLoading = loadingCount > 0;
	const reload = document.getElementById("reload");
	document.body.setAttribute("aria-busy", isLoading ? "true" : "false");
	reload.disabled = isLoading;
	reload.setAttribute("aria-disabled", isLoading ? "true" : "false");
	if (isLoading) statusKey("dashboard.ui.loading");
}

function markDataUpdated() {
	lastUpdatedAt = new Date();
	renderLastUpdated();
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

function formatSettingValue(value) {
	if (typeof value === "boolean") {
		return message(value ? "dashboard.status.yes" : "dashboard.status.no");
	}
	return String(value);
}

function settingDisplayName(setting) {
	return message("dashboard.setting." + setting.id) || setting.label;
}

function updateSaveState() {
	document.getElementById("save").disabled = pending.size === 0;
}

function setPending(id, value) {
	const original = snapshot.settings.find((setting) => setting.id === id)?.value;
	if (Object.is(original, value)) {
		pending.delete(id);
	} else {
		pending.set(id, value);
	}
	updateSaveState();
	statusKey(pending.size === 0 ? "dashboard.ui.noChanges" : "dashboard.ui.unsavedChanges");
	updateSettingDescription(id);
	renderSettingsPendingSummary();
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
	renderSettingsPendingSummary();
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
			labelName.textContent = settingDisplayName(setting);
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

function renderSettingsPendingSummary() {
	const root = document.getElementById("settings-pending-summary");
	if (!root) return;
	root.textContent = "";
	if (pending.size === 0) {
		root.hidden = true;
		return;
	}
	root.hidden = false;

	const header = document.createElement("div");
	header.className = "settings-pending-header";
	const title = document.createElement("div");
	title.className = "settings-pending-title";
	title.textContent = messageWithCount("dashboard.settings.pendingHeading", String(pending.size));
	const reset = document.createElement("button");
	reset.type = "button";
	reset.textContent = message("dashboard.settings.resetChanges");
	reset.addEventListener("click", resetPendingSettings);
	header.appendChild(title);
	header.appendChild(reset);
	root.appendChild(header);

	const list = document.createElement("ul");
	list.className = "settings-pending-list";
	for (const [id, value] of pending) {
		const setting = snapshot.settings.find((item) => item.id === id);
		if (!setting) continue;
		const item = document.createElement("li");
		item.textContent = messageFormat("dashboard.settings.pendingItem", {
			name: settingDisplayName(setting),
			from: formatSettingValue(setting.value),
			to: formatSettingValue(value),
		});
		list.appendChild(item);
	}
	root.appendChild(list);
}

function resetPendingSettings() {
	pending = new Map();
	updateSaveState();
	statusKey("dashboard.ui.noChanges");
	render();
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
	renderLastUpdated();
	renderDocumentReviewerState();
}

function renderTabState() {
	for (const tab of document.querySelectorAll(".tab")) {
		const selected = tab.dataset.tab === currentTab;
		tab.setAttribute("aria-selected", selected ? "true" : "false");
		tab.setAttribute("tabindex", selected ? "0" : "-1");
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

function loadCurrentTabData() {
	if (currentTab === "documents") return loadDocuments();
	if (currentTab === "settings") return Promise.resolve();
	return loadStatus();
}

function reloadCurrentTabData() {
	if (currentTab === "settings") return loadSnapshot();
	return loadCurrentTabData();
}

function activateTab(tabName, options = {}) {
	currentTab = tabName;
	renderTabState();
	if (options.focus) {
		const selectedTab = Array.from(document.querySelectorAll(".tab")).find((tab) => tab.dataset.tab === currentTab);
		if (selectedTab) selectedTab.focus();
	}
	loadCurrentTabData().catch((error) => statusText(error.message, "error"));
}

function handleTabKeydown(event) {
	const tabs = Array.from(document.querySelectorAll(".tab"));
	const currentIndex = tabs.findIndex((tab) => tab === event.currentTarget);
	if (currentIndex < 0) return;

	let nextIndex = null;
	if (event.key === "ArrowRight" || event.key === "ArrowDown") {
		nextIndex = (currentIndex + 1) % tabs.length;
	} else if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
		nextIndex = (currentIndex - 1 + tabs.length) % tabs.length;
	} else if (event.key === "Home") {
		nextIndex = 0;
	} else if (event.key === "End") {
		nextIndex = tabs.length - 1;
	}

	if (nextIndex === null) return;
	event.preventDefault();
	activateTab(tabs[nextIndex].dataset.tab, { focus: true });
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
	setLoading(true);
	try {
		const response = await fetch("/api/preferences", {
			headers: { "x-mustflow-dashboard-token": dashboardToken }
		});
		if (!response.ok) throw new Error(await response.text());
		snapshot = await response.json();
		pending = new Map();
		updateSaveState();
		markDataUpdated();
		statusKey("dashboard.ui.reloaded", "ok");
		render();
	} finally {
		setLoading(false);
	}
}

async function loadStatus() {
	setLoading(true);
	try {
		const response = await fetch("/api/status", {
			headers: { "x-mustflow-dashboard-token": dashboardToken }
		});
		if (!response.ok) throw new Error(await response.text());
		dashboardStatus = await response.json();
		markDataUpdated();
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
	} finally {
		setLoading(false);
	}
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

function statusStateLabel(tone) {
	if (tone === "ok") return message("dashboard.a11y.state.ok");
	if (tone === "warn") return message("dashboard.a11y.state.warn");
	return message("dashboard.a11y.state.neutral");
}

function appendStatusItem(root, labelKey, value, tone = "") {
	const item = document.createElement("div");
	item.className = "status-item";
	const label = document.createElement("div");
	label.className = "status-label";
	label.textContent = message(labelKey);
	const content = document.createElement("div");
	content.className = tone ? "status-value " + tone : "status-value";
	if (tone) {
		const badge = document.createElement("span");
		badge.className = "status-badge " + tone;
		badge.textContent = statusStateLabel(tone);
		content.appendChild(badge);
		content.appendChild(document.createTextNode(value));
	} else {
		content.textContent = value;
	}
	content.setAttribute(
		"aria-label",
		message(labelKey) + ": " + value + " (" + statusStateLabel(tone) + ")"
	);
	item.appendChild(label);
	item.appendChild(content);
	root.appendChild(item);
}

function latestRunNeedsAttention(latestRun) {
	if (!latestRun.exists) return false;
	if (!latestRun.valid) return true;
	return latestRun.status !== "passed" || latestRun.timed_out;
}

function deriveDashboardActions() {
	const actions = [];
	if (dashboardStatus.missing_files.length > 0) {
		actions.push({
			title: messageWithCount("dashboard.actions.missingFiles", dashboardStatus.missing_files.length),
			meta: dashboardStatus.missing_files.slice(0, 2).join(", "),
			tab: "status",
			buttonKey: "dashboard.actions.openStatus"
		});
	}
	if (dashboardStatus.issues.length > 0) {
		actions.push({
			title: messageWithCount("dashboard.actions.manifestIssues", dashboardStatus.issues.length),
			meta: dashboardStatus.issues[0],
			tab: "status",
			buttonKey: "dashboard.actions.openStatus"
		});
	}
	if (latestRunNeedsAttention(dashboardStatus.latest_run)) {
		actions.push({
			title: message("dashboard.actions.latestRun"),
			meta: formatLatestRun(dashboardStatus.latest_run),
			tab: "runs",
			buttonKey: "dashboard.actions.openRuns"
		});
	}
	if (dashboardStatus.update.blockers.length > 0) {
		actions.push({
			title: messageWithCount("dashboard.actions.updateBlockers", dashboardStatus.update.blockers.length),
			meta: dashboardStatus.update.blockers[0].relativePath,
			tab: "update",
			buttonKey: "dashboard.actions.openUpdate"
		});
	}
	if (dashboardStatus.verification.recommendations.length > 0) {
		actions.push({
			title: messageWithCount("dashboard.actions.verification", dashboardStatus.verification.recommendations.length),
			meta: dashboardStatus.verification.recommendations.map((recommendation) => recommendation.intent).slice(0, 3).join(", "),
			tab: "verification",
			buttonKey: "dashboard.actions.openVerification"
		});
	}
	if (dashboardStatus.active_review_documents > 0 || docReview.count > 0) {
		const count = Math.max(dashboardStatus.active_review_documents, docReview.count);
		actions.push({
			title: messageWithCount("dashboard.actions.documents", count),
			meta: docReview.items?.[0]?.path || "",
			tab: "documents",
			buttonKey: "dashboard.actions.openDocuments"
		});
	}
	return actions.slice(0, 5);
}

function renderNextActions(root) {
	const section = document.createElement("section");
	const heading = document.createElement("h2");
	heading.textContent = message("dashboard.actions.heading");
	section.appendChild(heading);
	const actions = deriveDashboardActions();
	if (actions.length === 0) {
		const empty = document.createElement("div");
		empty.className = "empty";
		empty.textContent = message("dashboard.actions.empty");
		section.appendChild(empty);
		root.appendChild(section);
		return;
	}
	const list = document.createElement("div");
	list.className = "next-actions";
	for (const action of actions) {
		const row = document.createElement("div");
		row.className = "next-action-row";
		const body = document.createElement("div");
		const title = document.createElement("div");
		title.className = "next-action-title";
		title.textContent = action.title;
		body.appendChild(title);
		if (action.meta) {
			const meta = document.createElement("div");
			meta.className = "next-action-meta";
			meta.textContent = action.meta;
			body.appendChild(meta);
		}
		const button = document.createElement("button");
		button.type = "button";
		button.textContent = message(action.buttonKey);
		button.addEventListener("click", () => activateTab(action.tab, { focus: true }));
		row.appendChild(body);
		row.appendChild(button);
		list.appendChild(row);
	}
	section.appendChild(list);
	root.appendChild(section);
}

function renderStatusPanel() {
	const root = document.getElementById("dashboard-status");
	root.textContent = "";
	renderNextActions(root);
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

async function copyVerificationPlan(commands) {
	await navigator.clipboard.writeText(commands.join("\\n"));
	statusKey("dashboard.verification.planCopied", "ok");
}

async function copyReleaseCommand(command) {
	await navigator.clipboard.writeText(command);
	statusKey("dashboard.release.copied", "ok");
}

async function copyUpdateCommand(command) {
	await navigator.clipboard.writeText(command);
	statusKey("dashboard.update.copied", "ok");
}

function setButtonAccessibleLabel(button, label) {
	button.textContent = label;
	button.title = label;
	button.setAttribute("aria-label", label);
}

function copyCommandLabel(command) {
	return messageFormat("dashboard.a11y.copyCommand", { command });
}

function showCopyButtonFeedback(button, restoreLabel) {
	if (button.copyFeedbackTimeout) window.clearTimeout(button.copyFeedbackTimeout);
	const originalDisabled = button.disabled;
	setButtonAccessibleLabel(button, message("dashboard.ui.copied"));
	button.disabled = true;
	button.copyFeedbackTimeout = window.setTimeout(() => {
		setButtonAccessibleLabel(button, restoreLabel);
		button.disabled = originalDisabled;
		button.copyFeedbackTimeout = null;
	}, copyFeedbackMs);
}

function appendVerificationFiles(root, files) {
	if (files.length === 0) return;
	const details = document.createElement("div");
	details.className = "verification-files";
	details.textContent = message("dashboard.verification.files") + ": " + files.join(", ");
	root.appendChild(details);
}

function normalizeFilterText(value) {
	return String(value || "").toLowerCase();
}

function filterTextMatches(query, values) {
	const normalizedQuery = normalizeFilterText(query).trim();
	if (!normalizedQuery) return true;
	return values.some((value) => normalizeFilterText(value).includes(normalizedQuery));
}

function renderListFilters(kind, stateOptions, rerender) {
	const filter = listFilters[kind];
	const wrapper = document.createElement("div");
	wrapper.className = "list-filters";

	const searchLabel = document.createElement("label");
	const searchText = document.createElement("span");
	searchText.textContent = message("dashboard.filter.search");
	const search = document.createElement("input");
	const searchId = "dashboard-" + kind + "-filter-search";
	search.id = searchId;
	search.type = "text";
	search.autocomplete = "off";
	search.spellcheck = false;
	search.value = filter.query;
	search.placeholder = message("dashboard.filter.searchPlaceholder");
	search.addEventListener("input", () => {
		const cursor = search.selectionStart;
		filter.query = search.value;
		rerender();
		const nextSearch = document.getElementById(searchId);
		if (nextSearch) {
			nextSearch.focus();
			if (cursor !== null) nextSearch.setSelectionRange(cursor, cursor);
		}
	});
	searchLabel.appendChild(searchText);
	searchLabel.appendChild(search);
	wrapper.appendChild(searchLabel);

	const stateLabel = document.createElement("label");
	const stateText = document.createElement("span");
	stateText.textContent = message("dashboard.filter.state");
	const state = document.createElement("select");
	const stateId = "dashboard-" + kind + "-filter-state";
	state.id = stateId;
	for (const option of stateOptions) {
		const child = document.createElement("option");
		child.value = option;
		child.textContent = message("dashboard.filter." + option);
		child.selected = option === filter.state;
		state.appendChild(child);
	}
	state.addEventListener("change", () => {
		filter.state = state.value;
		rerender();
		const nextState = document.getElementById(stateId);
		if (nextState) nextState.focus();
	});
	stateLabel.appendChild(stateText);
	stateLabel.appendChild(state);
	wrapper.appendChild(stateLabel);
	return wrapper;
}

function verificationStateMatches(recommendation) {
	const state = listFilters.verification.state;
	return state === "all" || (state === "runnable" && recommendation.runnable) || (state === "unavailable" && !recommendation.runnable);
}

function commandStateMatches(intent) {
	const state = listFilters.commands.state;
	return state === "all" || (state === "runnable" && intent.runnable) || (state === "unavailable" && !intent.runnable);
}

function skillRouteState(route) {
	if (!route.exists) return "missing";
	return route.aligned ? "aligned" : "mismatch";
}

function skillStateMatches(route) {
	const state = listFilters.skills.state;
	return state === "all" || skillRouteState(route) === state;
}

function createCollapsibleDetails(titleKey) {
	const details = document.createElement("details");
	details.className = "collapsible-details";
	const summary = document.createElement("summary");
	summary.textContent = message(titleKey);
	details.appendChild(summary);
	return details;
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

	section.appendChild(renderListFilters("verification", ["all", "runnable", "unavailable"], renderVerificationPanel));
	const recommendations = verification.recommendations.filter((recommendation) =>
		verificationStateMatches(recommendation) &&
		filterTextMatches(listFilters.verification.query, [
			recommendation.intent,
			recommendation.command,
			message(recommendation.reason_key),
			recommendation.files.join(" "),
		]),
	);

	if (recommendations.length === 0) {
		const empty = document.createElement("div");
		empty.className = "empty";
		empty.textContent = message("dashboard.filter.noMatches");
		section.appendChild(empty);
		root.appendChild(section);
		return;
	}

	for (const recommendation of recommendations) {
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
		const copyLabel = copyCommandLabel(recommendation.command);
		setButtonAccessibleLabel(copy, copyLabel);
		copy.disabled = !recommendation.runnable;
		copy.setAttribute("aria-disabled", copy.disabled ? "true" : "false");
		copy.addEventListener("click", () => {
			copyVerificationCommand(recommendation.command)
				.then(() => showCopyButtonFeedback(copy, copyLabel))
				.catch((error) => statusText(error.message, "error"));
		});

		row.appendChild(summary);
		row.appendChild(details);
		row.appendChild(copy);
		section.appendChild(row);
	}

	root.appendChild(section);

	if (verification.schedule.batches.length > 0) {
		const scheduleSection = document.createElement("section");
		const scheduleHeading = document.createElement("h2");
		scheduleHeading.textContent = message("dashboard.verification.schedule");
		scheduleSection.appendChild(scheduleHeading);
		const entriesByIntent = new Map(verification.schedule.entries.map((entry) => [entry.intent, entry]));
		const recommendedIntents = new Set(recommendations.map((recommendation) => recommendation.intent));
		const scheduleBatches = verification.schedule.batches
			.map((batch) => ({
				...batch,
				intents: batch.intents.filter((intent) => recommendedIntents.has(intent)),
				commands: batch.commands.filter((command) => recommendations.some((recommendation) => recommendation.command === command)),
			}))
			.filter((batch) => batch.intents.length > 0 || batch.commands.length > 0);
		const planCommands = scheduleBatches.flatMap((batch) => batch.commands);
		for (const batch of scheduleBatches) {
			const row = document.createElement("div");
			row.className = "verification-row";
			const summary = document.createElement("div");
			const name = document.createElement("div");
			name.className = "command-name";
			name.textContent = message("dashboard.verification.batch") + " " + batch.index;
			const state = document.createElement("div");
			state.className = "command-state ok";
			state.textContent = batch.locks.length > 0 ? message("dashboard.verification.locks") + ": " + batch.locks.join(", ") : message("dashboard.verification.noLocks");
			summary.appendChild(name);
			summary.appendChild(state);

			const details = document.createElement("div");
			const commands = document.createElement("div");
			commands.className = "verification-command";
			commands.textContent = batch.commands.join(" -> ");
			details.appendChild(commands);
			for (const intent of batch.intents) {
				const entry = entriesByIntent.get(intent);
				if (!entry) continue;
				const effects = document.createElement("div");
				effects.className = "verification-files";
				effects.textContent = message("dashboard.verification.effects") + ": " + entry.effects.map((effect) => effect.mode + " " + (effect.path || effect.lock) + " [" + effect.lock + "]").join(", ");
				details.appendChild(effects);
				if (entry.conflicts.length > 0) {
					const conflicts = document.createElement("div");
					conflicts.className = "command-note";
					conflicts.textContent = message("dashboard.verification.conflicts") + ": " + entry.conflicts.map((conflict) => conflict.intent + " (" + conflict.lock + ")").join(", ");
					details.appendChild(conflicts);
				}
			}

			const copy = document.createElement("button");
			copy.type = "button";
			copy.className = "verification-copy";
			const copyLabel = message("dashboard.a11y.copyVerificationPlan");
			setButtonAccessibleLabel(copy, copyLabel);
			copy.disabled = planCommands.length === 0;
			copy.setAttribute("aria-disabled", copy.disabled ? "true" : "false");
			copy.addEventListener("click", () => {
				copyVerificationPlan(planCommands)
					.then(() => showCopyButtonFeedback(copy, copyLabel))
					.catch((error) => statusText(error.message, "error"));
			});

			row.appendChild(summary);
			row.appendChild(details);
			row.appendChild(copy);
			scheduleSection.appendChild(row);
		}
		root.appendChild(scheduleSection);
	}

	if (verification.skipped.length > 0) {
		const skippedSection = createCollapsibleDetails("dashboard.verification.skipped");
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

function formatCommandWriteLock(writeLock) {
	const paths = writeLock.paths.length === 0 ? message("value.none") : writeLock.paths.join(", ");
	return writeLock.lock + ": " + paths;
}

function formatCommandLockConflict(conflict) {
	const paths = conflict.conflicting_paths.length === 0 ? "" : " / " + conflict.conflicting_paths.join(", ");
	return conflict.intent + " (" + conflict.lock + ")" + paths;
}

function appendCommandEffectGraph(root, intent) {
	const graph = intent.effect_graph;
	if (!graph || graph.status !== "fresh") return;
	if (graph.write_locks.length === 0 && graph.lock_conflicts.length === 0) return;

	const details = createCollapsibleDetails("dashboard.commands.effectGraph");

	if (graph.write_locks.length > 0) {
		const locks = document.createElement("div");
		locks.className = "verification-files";
		locks.textContent = message("dashboard.commands.effectGraph") + ": " + graph.write_locks.map(formatCommandWriteLock).join(", ");
		details.appendChild(locks);
	}

	if (graph.lock_conflicts.length > 0) {
		const conflicts = document.createElement("div");
		conflicts.className = "command-note";
		conflicts.textContent = message("dashboard.verification.conflicts") + ": " + graph.lock_conflicts.map(formatCommandLockConflict).join(", ");
		details.appendChild(conflicts);
	}

	root.appendChild(details);
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

	const graphStatus = dashboardStatus.command_contract.effect_graph_status;
	if (graphStatus && graphStatus.status !== "fresh") {
		const note = document.createElement("div");
		note.className = "command-note";
		note.textContent =
			message("dashboard.commands.effectGraphUnavailable") +
			": " +
			(graphStatus.refresh_hint || graphStatus.status);
		section.appendChild(note);
	}

	section.appendChild(renderListFilters("commands", ["all", "runnable", "unavailable"], renderCommandPanel));
	const intents = dashboardStatus.command_contract.intents.filter((intent) =>
		commandStateMatches(intent) &&
		filterTextMatches(listFilters.commands.query, [
			intent.name,
			intent.description,
			intent.status,
			intent.lifecycle,
			intent.run_policy,
			intent.stdin,
			intent.cwd,
			intent.reason,
			intent.agent_action,
			intent.writes.join(" "),
			intent.required_after.join(" "),
		]),
	);

	if (intents.length === 0) {
		const empty = document.createElement("div");
		empty.className = "empty";
		empty.textContent = message("dashboard.filter.noMatches");
		section.appendChild(empty);
		root.appendChild(section);
		return;
	}

	for (const intent of intents) {
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
		appendCommandEffectGraph(details, intent);

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
	const copyLabel = copyCommandLabel(fallbackCommand);
	setButtonAccessibleLabel(copy, copyLabel);
	copy.disabled = !runnable;
	copy.setAttribute("aria-disabled", copy.disabled ? "true" : "false");
	copy.addEventListener("click", () => {
		copyReleaseCommand(fallbackCommand)
			.then(() => showCopyButtonFeedback(copy, copyLabel))
			.catch((error) => statusText(error.message, "error"));
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
	const copyLabel = copyCommandLabel(command);
	setButtonAccessibleLabel(copy, copyLabel);
	copy.disabled = !enabled;
	copy.setAttribute("aria-disabled", copy.disabled ? "true" : "false");
	copy.addEventListener("click", () => {
		copyUpdateCommand(command)
			.then(() => showCopyButtonFeedback(copy, copyLabel))
			.catch((error) => statusText(error.message, "error"));
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
	const section = createCollapsibleDetails(titleKey);
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

	section.appendChild(renderListFilters("skills", ["all", "aligned", "mismatch", "missing"], renderSkillsPanel));
	const routes = dashboardStatus.skills.routes.filter((route) =>
		skillStateMatches(route) &&
		filterTextMatches(listFilters.skills.query, [
			route.skill,
			route.trigger,
			route.skill_path,
			route.required_input,
			route.edit_scope,
			route.risk,
			route.expected_output,
			route.verification_intents.join(" "),
			route.declared_command_intents.join(" "),
		]),
	);

	if (routes.length === 0) {
		const empty = document.createElement("div");
		empty.className = "empty";
		empty.textContent = message("dashboard.filter.noMatches");
		section.appendChild(empty);
		root.appendChild(section);
		return;
	}

	for (const route of routes) {
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
	setLoading(true);
	try {
		const response = await fetch("/api/docs/review" + docStatusQuery(), {
			headers: { "x-mustflow-dashboard-token": dashboardToken }
		});
		if (!response.ok) throw new Error(await response.text());
		docReview = await response.json();
		markDataUpdated();
		statusKey("dashboard.docs.reloaded", "ok");
		renderChrome();
		renderDocuments();
	} finally {
		setLoading(false);
	}
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
	updateSaveState();
	markDataUpdated();
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
	markDataUpdated();
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

function currentReviewerKind() {
	const value = document.getElementById("doc-reviewer-kind").value;
	return value || "human";
}

function renderDocumentReviewerState() {
	const element = document.getElementById("doc-reviewer-state");
	if (!element) return;
	const reviewerId = currentReviewerId();
	if (!reviewerId) {
		element.className = "doc-reviewer-state warn";
		element.textContent = message("dashboard.docs.reviewerStateMissing");
		return;
	}
	element.className = "doc-reviewer-state";
	element.textContent = messageFormat("dashboard.docs.reviewerState", {
		kind: message("dashboard.docs.reviewerKind." + currentReviewerKind()),
		id: reviewerId,
	});
}

function renderDocuments() {
	const root = document.getElementById("docs-review-list");
	root.textContent = "";
	renderDocumentReviewerState();

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
		status.className = "doc-status " + entry.status;
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
			const alreadySelected = entry.status === nextStatus;
			const actionLabel = reviewerIdMissing
				? message("dashboard.docs.missingReviewerId")
				: alreadySelected
					? messageFormat("dashboard.docs.action.currentStatus", { status: message("dashboard.docs.status." + nextStatus) })
					: message(tooltipKey);
			button.title = actionLabel;
			button.setAttribute("aria-label", actionLabel);
			button.disabled = reviewerIdMissing || alreadySelected;
			button.setAttribute("aria-disabled", button.disabled ? "true" : "false");
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
	reloadCurrentTabData().catch((error) => statusText(error.message, "error"));
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
document.getElementById("doc-reviewer-kind").addEventListener("change", () => {
	renderDocuments();
});
for (const tab of document.querySelectorAll(".tab")) {
	tab.addEventListener("click", () => {
		activateTab(tab.dataset.tab);
	});
	tab.addEventListener("keydown", handleTabKeydown);
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
