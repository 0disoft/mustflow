import { Buffer } from 'node:buffer';
import path from 'node:path';

import type { DashboardDocReviewSnapshot, DashboardStatusSnapshot } from './dashboard-html.js';
import type { DashboardPreferencesSnapshot } from './dashboard-preferences.js';
import {
	ensureFileTargetInsideWithoutSymlinks,
	ensureInside,
	toPosixPath,
	writeUtf8FileInsideWithoutSymlinks,
} from './filesystem.js';

export type DashboardExportFormat = 'html' | 'json';

export interface DashboardExportSnapshot {
	readonly schema_version: '1';
	readonly command: 'dashboard export';
	readonly format: DashboardExportFormat;
	readonly generated_at: string;
	readonly mustflow_root: string;
	readonly output_policy: {
		readonly bounded_to_mustflow_root: true;
		readonly starts_server: false;
		readonly static_html: boolean;
		readonly contains_mutation_controls: false;
		readonly omits_dashboard_token: true;
		readonly omits_raw_run_output: true;
	};
	readonly limits: {
		readonly max_string_bytes: number;
		readonly max_array_items: number;
		readonly max_depth: number;
		readonly truncated_fields: readonly string[];
		readonly omitted_fields: readonly string[];
	};
	readonly preferences: unknown;
	readonly status: unknown;
	readonly docs_review: unknown;
}

export interface DashboardExportInput {
	readonly projectRoot: string;
	readonly outputPath: string;
	readonly format: DashboardExportFormat;
	readonly preferences: DashboardPreferencesSnapshot;
	readonly status: DashboardStatusSnapshot;
	readonly docsReview: DashboardDocReviewSnapshot;
}

export interface DashboardExportWriteResult {
	readonly absolutePath: string;
	readonly relativePath: string;
	readonly bytes: number;
	readonly truncatedFields: readonly string[];
	readonly omittedFields: readonly string[];
}

export class DashboardExportPathError extends Error {
	constructor(readonly targetPath: string) {
		super(`Dashboard export path escapes mustflow root: ${targetPath}`);
	}
}

const DASHBOARD_EXPORT_MAX_STRING_BYTES = 8192;
const DASHBOARD_EXPORT_MAX_ARRAY_ITEMS = 200;
const DASHBOARD_EXPORT_MAX_DEPTH = 16;
const OMITTED_VALUE = '[omitted by mf dashboard export]';
const TRUNCATION_SUFFIX = '\n[truncated by mf dashboard export]';
const SENSITIVE_KEY_PATTERN = /(?:token|secret|password|credential|authorization|api[_-]?key)/iu;

interface SanitizeState {
	readonly truncatedFields: string[];
	readonly omittedFields: string[];
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function fieldPath(pathSegments: readonly string[]): string {
	return pathSegments.length === 0 ? '<root>' : pathSegments.join('.');
}

function truncateUtf8(value: string, maxBytes: number): string {
	if (Buffer.byteLength(value, 'utf8') <= maxBytes) {
		return value;
	}

	let end = value.length;
	while (end > 0 && Buffer.byteLength(value.slice(0, end) + TRUNCATION_SUFFIX, 'utf8') > maxBytes) {
		end -= 1;
	}

	return `${value.slice(0, end)}${TRUNCATION_SUFFIX}`;
}

function sanitizeRunOutput(
	value: unknown,
	state: SanitizeState,
	pathSegments: readonly string[],
): { readonly bytes: number; readonly truncated: boolean; readonly tail_omitted: true } {
	state.omittedFields.push(`${fieldPath(pathSegments)}.tail`);
	if (!isRecord(value)) {
		return { bytes: 0, truncated: false, tail_omitted: true };
	}

	return {
		bytes: typeof value.bytes === 'number' ? value.bytes : 0,
		truncated: value.truncated === true,
		tail_omitted: true,
	};
}

function sanitizeRunHistory(value: unknown, state: SanitizeState): unknown {
	if (!isRecord(value) || value.exists !== true || value.valid !== true) {
		return sanitizeValue(value, state, ['status', 'run_history']);
	}

	state.omittedFields.push('status.run_history.command_line');
	const sanitized: Record<string, unknown> = {};
	for (const [key, entry] of Object.entries(value)) {
		if (key === 'command_line') {
			sanitized.command_line_omitted = true;
			continue;
		}

		if (key === 'stdout' || key === 'stderr') {
			sanitized[key] = sanitizeRunOutput(entry, state, ['status', 'run_history', key]);
			continue;
		}

		sanitized[key] = sanitizeValue(entry, state, ['status', 'run_history', key]);
	}

	return sanitized;
}

function sanitizeStatus(value: DashboardStatusSnapshot, state: SanitizeState): unknown {
	const sanitized: Record<string, unknown> = {};
	for (const [key, entry] of Object.entries(value)) {
		sanitized[key] =
			key === 'run_history' ? sanitizeRunHistory(entry, state) : sanitizeValue(entry, state, ['status', key]);
	}
	return sanitized;
}

function sanitizeValue(value: unknown, state: SanitizeState, pathSegments: readonly string[], depth = 0): unknown {
	if (value === null || typeof value === 'boolean' || typeof value === 'number') {
		return value;
	}

	if (typeof value === 'string') {
		const truncated = truncateUtf8(value, DASHBOARD_EXPORT_MAX_STRING_BYTES);
		if (truncated !== value) {
			state.truncatedFields.push(fieldPath(pathSegments));
		}
		return truncated;
	}

	if (Array.isArray(value)) {
		const items = value.slice(0, DASHBOARD_EXPORT_MAX_ARRAY_ITEMS);
		if (items.length !== value.length) {
			state.truncatedFields.push(fieldPath(pathSegments));
		}
		return items.map((entry, index) => sanitizeValue(entry, state, [...pathSegments, String(index)], depth + 1));
	}

	if (isRecord(value)) {
		if (depth >= DASHBOARD_EXPORT_MAX_DEPTH) {
			state.truncatedFields.push(fieldPath(pathSegments));
			return '[max depth reached by mf dashboard export]';
		}

		const sanitized: Record<string, unknown> = {};
		for (const [key, entry] of Object.entries(value)) {
			const childPath = [...pathSegments, key];
			if (SENSITIVE_KEY_PATTERN.test(key)) {
				state.omittedFields.push(fieldPath(childPath));
				sanitized[key] = OMITTED_VALUE;
				continue;
			}
			sanitized[key] = sanitizeValue(entry, state, childPath, depth + 1);
		}
		return sanitized;
	}

	return String(value);
}

export function resolveDashboardExportPath(projectRoot: string, outputPath: string): string {
	const targetPath = path.resolve(projectRoot, outputPath);

	try {
		ensureInside(projectRoot, targetPath);
		ensureFileTargetInsideWithoutSymlinks(projectRoot, targetPath, { allowMissingLeaf: true });
	} catch {
		throw new DashboardExportPathError(outputPath);
	}

	return targetPath;
}

export function createDashboardExportSnapshot(input: DashboardExportInput): DashboardExportSnapshot {
	const state: SanitizeState = { truncatedFields: [], omittedFields: [] };
	const snapshot = {
		schema_version: '1',
		command: 'dashboard export',
		format: input.format,
		generated_at: new Date().toISOString(),
		mustflow_root: input.projectRoot,
		output_policy: {
			bounded_to_mustflow_root: true,
			starts_server: false,
			static_html: input.format === 'html',
			contains_mutation_controls: false,
			omits_dashboard_token: true,
			omits_raw_run_output: true,
		},
		preferences: sanitizeValue(input.preferences, state, ['preferences']),
		status: sanitizeStatus(input.status, state),
		docs_review: sanitizeValue(input.docsReview, state, ['docs_review']),
	} satisfies Omit<DashboardExportSnapshot, 'limits'>;

	return {
		...snapshot,
		limits: {
			max_string_bytes: DASHBOARD_EXPORT_MAX_STRING_BYTES,
			max_array_items: DASHBOARD_EXPORT_MAX_ARRAY_ITEMS,
			max_depth: DASHBOARD_EXPORT_MAX_DEPTH,
			truncated_fields: [...new Set(state.truncatedFields)].sort(),
			omitted_fields: [...new Set(state.omittedFields)].sort(),
		},
	};
}

function escapeHtml(value: string): string {
	return value
		.replace(/&/gu, '&amp;')
		.replace(/</gu, '&lt;')
		.replace(/>/gu, '&gt;')
		.replace(/"/gu, '&quot;')
		.replace(/'/gu, '&#39;');
}

function asRecord(value: unknown): Record<string, unknown> {
	return isRecord(value) ? value : {};
}

function asArray(value: unknown): readonly unknown[] {
	return Array.isArray(value) ? value : [];
}

function text(value: unknown): string {
	if (value === null || value === undefined || value === '') {
		return 'none';
	}
	return String(value);
}

function booleanText(value: unknown): string {
	return value === true ? 'yes' : value === false ? 'no' : text(value);
}

function renderMetric(label: string, value: unknown): string {
	return `<dt>${escapeHtml(label)}</dt><dd>${escapeHtml(text(value))}</dd>`;
}

function renderList(items: readonly unknown[]): string {
	if (items.length === 0) {
		return '<p class="empty">none</p>';
	}

	return `<ul>${items.map((item) => `<li>${escapeHtml(text(item))}</li>`).join('')}</ul>`;
}

function renderRecommendations(recommendations: readonly unknown[]): string {
	if (recommendations.length === 0) {
		return '<p class="empty">none</p>';
	}

	const rows = recommendations
		.map((entry) => {
			const recommendation = asRecord(entry);
			return `<tr><td>${escapeHtml(text(recommendation.intent))}</td><td>${escapeHtml(
				text(recommendation.command),
			)}</td><td>${escapeHtml(booleanText(recommendation.runnable))}</td></tr>`;
		})
		.join('');
	return `<table><thead><tr><th>Intent</th><th>Command</th><th>Runnable</th></tr></thead><tbody>${rows}</tbody></table>`;
}

function renderCommandIntents(intents: readonly unknown[]): string {
	if (intents.length === 0) {
		return '<p class="empty">none</p>';
	}

	const rows = intents
		.map((entry) => {
			const intent = asRecord(entry);
			return `<tr><td>${escapeHtml(text(intent.name))}</td><td>${escapeHtml(text(intent.status))}</td><td>${escapeHtml(
				text(intent.run_policy),
			)}</td><td>${escapeHtml(booleanText(intent.runnable))}</td></tr>`;
		})
		.join('');
	return `<table><thead><tr><th>Name</th><th>Status</th><th>Run policy</th><th>Runnable</th></tr></thead><tbody>${rows}</tbody></table>`;
}

function renderRunHistory(runHistory: Record<string, unknown>): string {
	if (runHistory.exists !== true) {
		return '<p class="empty">none</p>';
	}

	if (runHistory.valid !== true) {
		return `<p class="empty">${escapeHtml(text(runHistory.error))}</p>`;
	}

	return `<dl>${[
		renderMetric('Intent', runHistory.intent),
		renderMetric('Status', runHistory.status),
		renderMetric('Exit code', runHistory.exit_code),
		renderMetric('Finished', runHistory.finished_at),
		renderMetric('Output tails', 'omitted'),
	].join('')}</dl>`;
}

function renderTruncation(snapshot: DashboardExportSnapshot): string {
	const truncated = snapshot.limits.truncated_fields;
	const omitted = snapshot.limits.omitted_fields;

	return `<dl>${[
		renderMetric('Max string bytes', snapshot.limits.max_string_bytes),
		renderMetric('Max array items', snapshot.limits.max_array_items),
		renderMetric('Max depth', snapshot.limits.max_depth),
	].join('')}</dl><h3>Truncated fields</h3>${renderList(truncated)}<h3>Omitted fields</h3>${renderList(omitted)}`;
}

export function renderDashboardExportHtml(snapshot: DashboardExportSnapshot): string {
	const status = asRecord(snapshot.status);
	const preferences = asRecord(snapshot.preferences);
	const release = asRecord(status.release);
	const update = asRecord(status.update);
	const verification = asRecord(status.verification);
	const commandContract = asRecord(status.command_contract);
	const docsReview = asRecord(snapshot.docs_review);
	const embeddedJson = JSON.stringify(snapshot).replace(/</gu, '\\u003c');

	return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>mustflow dashboard export</title>
<style>
:root {
	color-scheme: light dark;
	--bg: #101216;
	--panel: #181b21;
	--line: #2a2f3a;
	--text: #eef1f7;
	--muted: #aeb6c5;
	--accent: #8fb4ff;
	font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
}
* { box-sizing: border-box; }
body {
	background: var(--bg);
	color: var(--text);
	font-size: 16px;
	line-height: 1.5;
	margin: 0;
}
header, main {
	margin: 0 auto;
	max-width: 1100px;
	padding: 18px;
}
header { border-bottom: 1px solid var(--line); }
h1 { font-size: 22px; margin: 0; }
h2 { font-size: 18px; margin: 0 0 12px; }
h3 { font-size: 15px; margin: 14px 0 8px; }
section {
	border-bottom: 1px solid var(--line);
	padding: 18px 0;
}
dl {
	display: grid;
	gap: 8px 16px;
	grid-template-columns: minmax(150px, 240px) minmax(0, 1fr);
	margin: 0;
}
dt { color: var(--muted); }
dd { margin: 0; overflow-wrap: anywhere; }
table {
	border-collapse: collapse;
	width: 100%;
}
th, td {
	border-top: 1px solid var(--line);
	padding: 8px;
	text-align: left;
	vertical-align: top;
}
th { color: var(--muted); font-weight: 600; }
ul { margin: 0; padding-left: 22px; }
.empty { color: var(--muted); margin: 0; }
.snapshot { color: var(--muted); font-size: 13px; overflow-wrap: anywhere; }
</style>
</head>
<body>
<header>
<h1>mustflow dashboard export</h1>
<p class="snapshot">${escapeHtml(snapshot.generated_at)}</p>
</header>
<main>
<section>
<h2>Dashboard status</h2>
<dl>${[
		renderMetric('mustflow root', snapshot.mustflow_root),
		renderMetric('Installed', status.installed),
		renderMetric('Manifest lock', status.manifest_lock),
		renderMetric('Template', text(asRecord(status.template).id) === 'none' ? 'none' : `${text(asRecord(status.template).id)} ${text(asRecord(status.template).version)}`),
		renderMetric('Tracked files', status.tracked_files),
		renderMetric('Changed files', asArray(status.changed_files).length),
		renderMetric('Missing files', asArray(status.missing_files).length),
		renderMetric('Runnable intents', asArray(status.runnable_intents).length),
		renderMetric('Documents needing review', status.active_review_documents),
	].join('')}</dl>
</section>
<section>
<h2>Release</h2>
<dl>${[
		renderMetric('Package', release.package_name),
		renderMetric('Version', release.package_version),
		renderMetric('Template version', text(asRecord(status.template).version)),
		renderMetric('Release-sensitive files', asArray(release.release_sensitive_changed_files).length),
	].join('')}</dl>
</section>
<section>
<h2>Verification</h2>
<dl>${[
		renderMetric('Changed files', asArray(verification.changed_files).length),
		renderMetric('Surfaces', asArray(verification.surfaces).join(', ') || 'none'),
	].join('')}</dl>
${renderRecommendations(asArray(verification.recommendations))}
</section>
<section>
<h2>Commands</h2>
${renderCommandIntents(asArray(commandContract.intents))}
</section>
<section>
<h2>Update plan</h2>
<dl>${[
		renderMetric('Dry run ok', update.ok),
		renderMetric('Apply ready', update.apply_ready),
		renderMetric('Blockers', asArray(update.blockers).length),
		renderMetric('Template changes', asArray(update.changes).length),
	].join('')}</dl>
</section>
<section>
<h2>Run history</h2>
${renderRunHistory(asRecord(status.run_history))}
</section>
<section>
<h2>Skills</h2>
<dl>${[
		renderMetric('Index path', text(asRecord(status.skills).index_path)),
		renderMetric('Route count', text(asRecord(status.skills).count)),
	].join('')}</dl>
</section>
<section>
<h2>Documents</h2>
<dl>${[
		renderMetric('Ledger path', docsReview.ledger_path),
		renderMetric('Documents', docsReview.count),
	].join('')}</dl>
</section>
<section>
<h2>Preferences</h2>
<dl>${[
		renderMetric('Path', preferences.preferencesPath),
		renderMetric('Settings', asArray(preferences.settings).length),
	].join('')}</dl>
</section>
<section>
<h2>Export limits</h2>
${renderTruncation(snapshot)}
</section>
</main>
<script id="dashboard-export-data" type="application/json">${embeddedJson}</script>
</body>
</html>
`;
}

export function writeDashboardExport(input: DashboardExportInput): DashboardExportWriteResult {
	const absolutePath = resolveDashboardExportPath(input.projectRoot, input.outputPath);
	const snapshot = createDashboardExportSnapshot(input);
	const content =
		input.format === 'json' ? `${JSON.stringify(snapshot, null, 2)}\n` : renderDashboardExportHtml(snapshot);

	writeUtf8FileInsideWithoutSymlinks(input.projectRoot, absolutePath, content);

	return {
		absolutePath,
		relativePath: toPosixPath(path.relative(input.projectRoot, absolutePath)),
		bytes: Buffer.byteLength(content, 'utf8'),
		truncatedFields: snapshot.limits.truncated_fields,
		omittedFields: snapshot.limits.omitted_fields,
	};
}
