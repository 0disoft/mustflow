import type { DashboardPreferencesSnapshot } from '../dashboard-preferences.js';
import { safeJsonForInlineScript } from '../html-json.js';
import { renderDashboardClientScript } from './client-script.js';
import { createDashboardLocaleBootstrap } from './locale-bootstrap.js';
import { renderDashboardStyles } from './styles.js';
import type { DashboardDocReviewSnapshot, DashboardStatusSnapshot } from './types.js';

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
	const serializedSnapshot = safeJsonForInlineScript(snapshot);
	const serializedStatusSnapshot = safeJsonForInlineScript(statusSnapshot);
	const serializedDocReviewSnapshot = safeJsonForInlineScript(docReviewSnapshot);
	const serializedToken = safeJsonForInlineScript(token);
	const { serializedLocaleBundle, serializedAvailableLocales } = createDashboardLocaleBootstrap();

	return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>mustflow dashboard</title>
<style>
${renderDashboardStyles()}
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
${renderDashboardClientScript({
		serializedSnapshot,
		serializedToken,
		serializedLocaleBundle,
		serializedAvailableLocales,
		serializedStatusSnapshot,
		serializedDocReviewSnapshot,
	})}
</script>
</body>
</html>`;
}
