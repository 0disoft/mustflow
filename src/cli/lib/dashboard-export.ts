import { Buffer } from 'node:buffer';
import path from 'node:path';

import { createDashboardCompletionVerdict, type CompletionVerdict } from '../../core/completion-verdict.js';
import { createDashboardEvidenceModel, type VerificationEvidenceModel } from '../../core/verification-evidence.js';
import { redactSecretLikeText } from '../../core/secret-redaction.js';
import type { DashboardDocReviewSnapshot, DashboardStatusSnapshot } from './dashboard-html.js';
import type { DashboardPreferencesSnapshot } from './dashboard-preferences.js';
import {
	ensureFileTargetInsideWithoutSymlinks,
	ensureInside,
	toPosixPath,
	writeUtf8FileInsideWithoutSymlinks,
} from './filesystem.js';
import { safeJsonForInlineScript } from './html-json.js';

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
		readonly redacts_secret_like_values: true;
	};
	readonly limits: {
		readonly max_string_bytes: number;
		readonly max_array_items: number;
		readonly max_depth: number;
		readonly truncated_fields: readonly string[];
		readonly omitted_fields: readonly string[];
		readonly redacted_fields: readonly string[];
		readonly redaction_count: number;
		readonly redaction_kinds: readonly string[];
	};
	readonly preferences: unknown;
	readonly status: unknown;
	readonly docs_review: unknown;
	readonly harness_report: DashboardHarnessReport;
}

export type DashboardHarnessGapKind = 'manual_only' | 'blocked' | 'unknown' | 'missing';
export type DashboardHarnessRiskSeverity = 'info' | 'warning' | 'error';

export interface DashboardHarnessDecisionGraphSummary {
	readonly root: string;
	readonly node_count: number;
	readonly edge_count: number;
	readonly runnable: number;
	readonly skipped: number;
	readonly blocked: number;
	readonly manual_only: number;
	readonly unknown: number;
	readonly gap_count: number;
}

export interface DashboardHarnessVerificationGap {
	readonly kind: DashboardHarnessGapKind;
	readonly intent: string | null;
	readonly reason: string | null;
	readonly detail: string | null;
	readonly files: readonly string[];
	readonly surfaces: readonly string[];
}

export interface DashboardHarnessRisk {
	readonly code: string;
	readonly severity: DashboardHarnessRiskSeverity;
	readonly detail: string;
	readonly count?: number;
	readonly paths?: readonly string[];
}

export interface DashboardHarnessReport {
	readonly schema_version: '1';
	readonly generated_from: 'dashboard_status_snapshot';
	readonly install: {
		readonly installed: boolean;
		readonly manifest_lock: string;
		readonly tracked_files: number;
		readonly changed_files: number;
		readonly missing_files: number;
		readonly issues: number;
	};
	readonly verification: {
		readonly completion_verdict: CompletionVerdict;
		readonly evidence_model: VerificationEvidenceModel;
		readonly changed_file_count: number;
		readonly changed_surfaces: readonly string[];
		readonly decision_graph_summary: DashboardHarnessDecisionGraphSummary | null;
		readonly runnable_intents: readonly string[];
		readonly skipped_intents: readonly {
			readonly intent: string;
			readonly reason_key: string;
		}[];
		readonly gaps: readonly DashboardHarnessVerificationGap[];
	};
	readonly run_history: {
		readonly path: string;
		readonly exists: boolean;
		readonly valid: boolean;
		readonly intent: string | null;
		readonly status: string | null;
		readonly exit_code: number | null;
		readonly timed_out: boolean | null;
		readonly finished_at: string | null;
		readonly duration_ms: number | null;
		readonly receipt_path: string | null;
	};
	readonly docs_review: {
		readonly ledger_path: string;
		readonly active_documents: number;
	};
	readonly remaining_risks: readonly DashboardHarnessRisk[];
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
const DASHBOARD_HARNESS_MAX_ITEMS = 50;
const DASHBOARD_HARNESS_MAX_PATHS = 8;
const OMITTED_VALUE = '[omitted by mf dashboard export]';
const TRUNCATION_SUFFIX = '\n[truncated by mf dashboard export]';
const SENSITIVE_KEY_PATTERN = /(?:token|secret|password|credential|authorization|api[_-]?key)/iu;

interface SanitizeState {
	readonly truncatedFields: string[];
	readonly omittedFields: string[];
	readonly redactedFields: string[];
	readonly redactionKinds: Set<string>;
	redactionCount: number;
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
): {
	readonly bytes: number;
	readonly truncated: boolean;
	readonly tail_omitted: true;
	readonly redacted: boolean;
	readonly redaction_count: number;
	readonly redaction_kinds: readonly string[];
} {
	state.omittedFields.push(`${fieldPath(pathSegments)}.tail`);
	if (!isRecord(value)) {
		return {
			bytes: 0,
			truncated: false,
			tail_omitted: true,
			redacted: false,
			redaction_count: 0,
			redaction_kinds: [],
		};
	}

	return {
		bytes: typeof value.bytes === 'number' ? value.bytes : 0,
		truncated: value.truncated === true,
		tail_omitted: true,
		redacted: value.redacted === true,
		redaction_count: typeof value.redaction_count === 'number' ? value.redaction_count : 0,
		redaction_kinds: stringArray(value.redaction_kinds),
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
		const redaction = redactSecretLikeText(value);
		if (redaction.redacted) {
			state.redactedFields.push(fieldPath(pathSegments));
			state.redactionCount += redaction.redactionCount;
			for (const kind of redaction.redactionKinds) {
				state.redactionKinds.add(kind);
			}
		}
		const truncated = truncateUtf8(redaction.text, DASHBOARD_EXPORT_MAX_STRING_BYTES);
		if (truncated !== redaction.text) {
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

function stringOrNull(value: unknown): string | null {
	return typeof value === 'string' && value.length > 0 ? value : null;
}

function numberOrZero(value: unknown): number {
	return typeof value === 'number' && Number.isFinite(value) ? value : 0;
}

function numberOrNull(value: unknown): number | null {
	return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function stringArray(value: unknown, maxItems = DASHBOARD_HARNESS_MAX_ITEMS): string[] {
	return asArray(value)
		.filter((item): item is string => typeof item === 'string')
		.slice(0, maxItems);
}

function createDecisionGraphSummary(value: unknown): DashboardHarnessDecisionGraphSummary | null {
	const graph = asRecord(value);
	if (graph.root !== 'verification_decision') {
		return null;
	}

	const summary = asRecord(graph.summary);
	return {
		root: String(graph.root),
		node_count: numberOrZero(summary.nodeCount),
		edge_count: numberOrZero(summary.edgeCount),
		runnable: numberOrZero(summary.runnable),
		skipped: numberOrZero(summary.skipped),
		blocked: numberOrZero(summary.blocked),
		manual_only: numberOrZero(summary.manual_only),
		unknown: numberOrZero(summary.unknown),
		gap_count: numberOrZero(summary.gapCount),
	};
}

function createVerificationGap(node: Record<string, unknown>): DashboardHarnessVerificationGap | null {
	const kind = stringOrNull(node.kind);
	const status = stringOrNull(node.status);
	const data = asRecord(node.data);
	const gapKind: DashboardHarnessGapKind | null =
		kind === 'gap'
			? 'missing'
			: kind === 'command_candidate' && status === 'manual_only'
				? 'manual_only'
				: kind === 'command_candidate' && status === 'blocked'
					? 'blocked'
					: kind === 'command_candidate' && status === 'unknown'
						? 'unknown'
						: null;

	if (!gapKind) {
		return null;
	}

	return {
		kind: gapKind,
		intent: stringOrNull(node.intent),
		reason: stringOrNull(node.reason),
		detail: stringOrNull(data.detail) ?? stringOrNull(data.skipReason),
		files: stringArray(data.files, DASHBOARD_HARNESS_MAX_PATHS),
		surfaces: stringArray(data.surfaces, DASHBOARD_HARNESS_MAX_PATHS),
	};
}

function createVerificationGaps(decisionGraph: unknown): DashboardHarnessVerificationGap[] {
	const graph = asRecord(decisionGraph);
	const gaps: DashboardHarnessVerificationGap[] = [];
	const seen = new Set<string>();

	for (const entry of asArray(graph.nodes)) {
		const gap = createVerificationGap(asRecord(entry));
		if (!gap) {
			continue;
		}

		const key = [gap.kind, gap.intent ?? '', gap.reason ?? '', gap.detail ?? ''].join('\0');
		if (!seen.has(key)) {
			seen.add(key);
			gaps.push(gap);
		}
	}

	return gaps.slice(0, DASHBOARD_HARNESS_MAX_ITEMS);
}

function createRunHistorySummary(status: Record<string, unknown>): DashboardHarnessReport['run_history'] {
	const runHistory = asRecord(status.run_history);
	const exists = runHistory.exists === true;
	const valid = exists && runHistory.valid === true;

	return {
		path: stringOrNull(runHistory.path) ?? '.mustflow/state/runs/latest.json',
		exists,
		valid,
		intent: valid ? stringOrNull(runHistory.intent) : null,
		status: valid ? stringOrNull(runHistory.status) : null,
		exit_code: valid ? numberOrNull(runHistory.exit_code) : null,
		timed_out: valid ? runHistory.timed_out === true : null,
		finished_at: valid ? stringOrNull(runHistory.finished_at) : null,
		duration_ms: valid ? numberOrNull(runHistory.duration_ms) : null,
		receipt_path: valid ? stringOrNull(runHistory.receipt_path) : null,
	};
}

function addHarnessRisk(
	risks: DashboardHarnessRisk[],
	risk: DashboardHarnessRisk,
): void {
	if (risks.length < DASHBOARD_HARNESS_MAX_ITEMS) {
		risks.push(risk);
	}
}

function createRemainingRisks(
	status: Record<string, unknown>,
	docsReview: Record<string, unknown>,
	decisionGraphSummary: DashboardHarnessDecisionGraphSummary | null,
): DashboardHarnessRisk[] {
	const release = asRecord(status.release);
	const update = asRecord(status.update);
	const verification = asRecord(status.verification);
	const runHistory = createRunHistorySummary(status);
	const risks: DashboardHarnessRisk[] = [];
	const issues = stringArray(status.issues);
	const changedFiles = stringArray(status.changed_files);
	const missingFiles = stringArray(status.missing_files);
	const releaseSensitiveFiles = stringArray(release.release_sensitive_changed_files);
	const blockers = asArray(update.blockers);
	const activeDocs = numberOrZero(docsReview.count);
	const verificationChangedFiles = stringArray(verification.changed_files);
	const runnableRecommendations = asArray(verification.recommendations).filter(
		(entry) => asRecord(entry).runnable === true,
	);

	for (const issue of issues.slice(0, DASHBOARD_HARNESS_MAX_ITEMS)) {
		addHarnessRisk(risks, { code: 'manifest_issue', severity: 'warning', detail: issue });
	}

	if (changedFiles.length > 0) {
		addHarnessRisk(risks, {
			code: 'tracked_file_changes',
			severity: 'warning',
			detail: 'Tracked mustflow files differ from the manifest lock.',
			count: changedFiles.length,
			paths: changedFiles.slice(0, DASHBOARD_HARNESS_MAX_PATHS),
		});
	}

	if (missingFiles.length > 0) {
		addHarnessRisk(risks, {
			code: 'tracked_file_missing',
			severity: 'error',
			detail: 'Manifest-tracked mustflow files are missing.',
			count: missingFiles.length,
			paths: missingFiles.slice(0, DASHBOARD_HARNESS_MAX_PATHS),
		});
	}

	if (releaseSensitiveFiles.length > 0) {
		addHarnessRisk(risks, {
			code: 'release_sensitive_changes',
			severity: 'warning',
			detail: 'Release-sensitive files changed and may need release verification.',
			count: releaseSensitiveFiles.length,
			paths: releaseSensitiveFiles.slice(0, DASHBOARD_HARNESS_MAX_PATHS),
		});
	}

	if (update.ok === false) {
		addHarnessRisk(risks, {
			code: 'update_plan_unavailable',
			severity: 'warning',
			detail: stringOrNull(update.error) ?? 'Template update dry-run status is not available.',
		});
	}

	if (blockers.length > 0) {
		addHarnessRisk(risks, {
			code: 'template_update_blockers',
			severity: 'warning',
			detail: 'The template update plan has blockers.',
			count: blockers.length,
		});
	}

	if (activeDocs > 0) {
		addHarnessRisk(risks, {
			code: 'docs_review_pending',
			severity: 'warning',
			detail: 'Documentation review entries are still active.',
			count: activeDocs,
		});
	}

	if (verificationChangedFiles.length > 0 && !decisionGraphSummary) {
		addHarnessRisk(risks, {
			code: 'verification_decision_graph_missing',
			severity: 'warning',
			detail: 'Changed files exist, but no verification decision graph is available.',
			count: verificationChangedFiles.length,
			paths: verificationChangedFiles.slice(0, DASHBOARD_HARNESS_MAX_PATHS),
		});
	}

	if (verificationChangedFiles.length > 0 && runnableRecommendations.length === 0) {
		addHarnessRisk(risks, {
			code: 'no_runnable_verification_recommendation',
			severity: 'warning',
			detail: 'Changed files exist, but the dashboard report has no runnable verification recommendation.',
			count: verificationChangedFiles.length,
		});
	}

	if (decisionGraphSummary && decisionGraphSummary.manual_only > 0) {
		addHarnessRisk(risks, {
			code: 'manual_only_verification_gap',
			severity: 'warning',
			detail: 'Some matching verification intents require an explicit user request.',
			count: decisionGraphSummary.manual_only,
		});
	}

	if (decisionGraphSummary && decisionGraphSummary.blocked > 0) {
		addHarnessRisk(risks, {
			code: 'blocked_verification_gap',
			severity: 'warning',
			detail: 'Some matching verification intents are blocked by the command contract.',
			count: decisionGraphSummary.blocked,
		});
	}

	if (decisionGraphSummary && decisionGraphSummary.unknown > 0) {
		addHarnessRisk(risks, {
			code: 'unknown_verification_gap',
			severity: 'warning',
			detail: 'Some changed surfaces lack known runnable verification coverage.',
			count: decisionGraphSummary.unknown,
		});
	}

	if (decisionGraphSummary && decisionGraphSummary.gap_count > 0) {
		addHarnessRisk(risks, {
			code: 'missing_verification_gap',
			severity: 'warning',
			detail: 'The verification decision graph reports missing coverage gaps.',
			count: decisionGraphSummary.gap_count,
		});
	}

	if (!runHistory.exists) {
		addHarnessRisk(risks, {
			code: 'latest_run_missing',
			severity: 'info',
			detail: 'No latest mf run receipt is available.',
		});
	} else if (!runHistory.valid) {
		addHarnessRisk(risks, {
			code: 'latest_run_invalid',
			severity: 'warning',
			detail: 'The latest mf run receipt could not be read as a valid receipt.',
		});
	}

	return risks;
}

function createDashboardHarnessReport(statusValue: unknown, docsReviewValue: unknown): DashboardHarnessReport {
	const status = asRecord(statusValue);
	const docsReview = asRecord(docsReviewValue);
	const verification = asRecord(status.verification);
	const decisionGraphSummary = createDecisionGraphSummary(verification.decision_graph);
	const runnableIntents = asArray(verification.recommendations)
		.map(asRecord)
		.filter((entry) => entry.runnable === true)
		.map((entry) => stringOrNull(entry.intent))
		.filter((entry): entry is string => entry !== null)
		.slice(0, DASHBOARD_HARNESS_MAX_ITEMS);
	const skippedIntents = asArray(verification.skipped)
		.map(asRecord)
		.map((entry) => ({
			intent: text(entry.intent),
			reason_key: text(entry.reason_key),
		}))
		.slice(0, DASHBOARD_HARNESS_MAX_ITEMS);
	const verificationGaps = createVerificationGaps(verification.decision_graph);
	const runHistory = createRunHistorySummary(status);
	const changedFileCount = stringArray(verification.changed_files).length;
	const changedSurfaces = stringArray(verification.surfaces);
	const remainingRisks = createRemainingRisks(status, docsReview, decisionGraphSummary);
	const completionVerdict = createDashboardCompletionVerdict({
		changedFileCount,
		runnableIntentCount: runnableIntents.length,
		skippedIntentCount: skippedIntents.length,
		gapCount: verificationGaps.length,
		latestRunExists: runHistory.exists,
		latestRunValid: runHistory.valid,
		latestRunStatus: runHistory.status,
	});
	const evidenceModel = createDashboardEvidenceModel({
		changedSurfaces,
		runnableIntents,
		skippedChecks: skippedIntents.map((entry) => ({
			intent: entry.intent || null,
			reason: entry.reason_key || null,
			detail: null,
		})),
		gaps: verificationGaps.map((gap) => ({
			reason: gap.reason,
			intent: gap.intent,
			status: gap.kind,
			detail: gap.detail,
			files: gap.files,
			surfaces: gap.surfaces,
		})),
		latestReceipt:
			runHistory.exists && runHistory.valid
				? {
						intent: runHistory.intent,
						status: runHistory.status ?? 'unknown',
						skipped: false,
						verification_plan_id: null,
						receipt_path: runHistory.receipt_path,
						receipt_sha256: null,
					}
				: null,
		remainingRisks,
		verdict: completionVerdict,
	});

	return {
		schema_version: '1',
		generated_from: 'dashboard_status_snapshot',
		install: {
			installed: status.installed === true,
			manifest_lock: text(status.manifest_lock),
			tracked_files: numberOrZero(status.tracked_files),
			changed_files: stringArray(status.changed_files).length,
			missing_files: stringArray(status.missing_files).length,
			issues: stringArray(status.issues).length,
		},
		verification: {
			completion_verdict: completionVerdict,
			evidence_model: evidenceModel,
			changed_file_count: changedFileCount,
			changed_surfaces: changedSurfaces,
			decision_graph_summary: decisionGraphSummary,
			runnable_intents: runnableIntents,
			skipped_intents: skippedIntents,
			gaps: verificationGaps,
		},
		run_history: runHistory,
		docs_review: {
			ledger_path: text(docsReview.ledger_path),
			active_documents: numberOrZero(docsReview.count),
		},
		remaining_risks: remainingRisks,
	};
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
	const state: SanitizeState = {
		truncatedFields: [],
		omittedFields: [],
		redactedFields: [],
		redactionKinds: new Set(),
		redactionCount: 0,
	};
	const preferences = sanitizeValue(input.preferences, state, ['preferences']);
	const status = sanitizeStatus(input.status, state);
	const docsReview = sanitizeValue(input.docsReview, state, ['docs_review']);
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
			redacts_secret_like_values: true,
		},
		preferences,
		status,
		docs_review: docsReview,
		harness_report: createDashboardHarnessReport(status, docsReview),
	} satisfies Omit<DashboardExportSnapshot, 'limits'>;

	return {
		...snapshot,
		limits: {
			max_string_bytes: DASHBOARD_EXPORT_MAX_STRING_BYTES,
			max_array_items: DASHBOARD_EXPORT_MAX_ARRAY_ITEMS,
			max_depth: DASHBOARD_EXPORT_MAX_DEPTH,
			truncated_fields: [...new Set(state.truncatedFields)].sort(),
			omitted_fields: [...new Set(state.omittedFields)].sort(),
			redacted_fields: [...new Set(state.redactedFields)].sort(),
			redaction_count: state.redactionCount,
			redaction_kinds: [...state.redactionKinds].sort(),
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

function renderSkippedIntents(intents: readonly unknown[]): string {
	if (intents.length === 0) {
		return '<p class="empty">none</p>';
	}

	const rows = intents
		.map((entry) => {
			const intent = asRecord(entry);
			return `<tr><td>${escapeHtml(text(intent.intent))}</td><td>${escapeHtml(text(intent.reason_key))}</td></tr>`;
		})
		.join('');
	return `<table><thead><tr><th>Intent</th><th>Reason</th></tr></thead><tbody>${rows}</tbody></table>`;
}

function renderVerificationGaps(gaps: readonly unknown[]): string {
	if (gaps.length === 0) {
		return '<p class="empty">none</p>';
	}

	const rows = gaps
		.map((entry) => {
			const gap = asRecord(entry);
			return `<tr><td>${escapeHtml(text(gap.kind))}</td><td>${escapeHtml(text(gap.intent))}</td><td>${escapeHtml(
				text(gap.reason),
			)}</td><td>${escapeHtml(text(gap.detail))}</td></tr>`;
		})
		.join('');
	return `<table><thead><tr><th>Kind</th><th>Intent</th><th>Reason</th><th>Detail</th></tr></thead><tbody>${rows}</tbody></table>`;
}

function renderRemainingRisks(risks: readonly unknown[]): string {
	if (risks.length === 0) {
		return '<p class="empty">none</p>';
	}

	const rows = risks
		.map((entry) => {
			const risk = asRecord(entry);
			const paths = asArray(risk.paths).map(text).join(', ');
			return `<tr><td>${escapeHtml(text(risk.severity))}</td><td>${escapeHtml(text(risk.code))}</td><td>${escapeHtml(
				text(risk.count),
			)}</td><td>${escapeHtml(text(risk.detail))}${paths ? `<br>${escapeHtml(paths)}` : ''}</td></tr>`;
		})
		.join('');
	return `<table><thead><tr><th>Severity</th><th>Code</th><th>Count</th><th>Detail</th></tr></thead><tbody>${rows}</tbody></table>`;
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
	const harnessReport = asRecord(snapshot.harness_report);
	const harnessInstall = asRecord(harnessReport.install);
	const harnessVerification = asRecord(harnessReport.verification);
	const completionVerdict = asRecord(harnessVerification.completion_verdict);
	const graphSummary = asRecord(harnessVerification.decision_graph_summary);
	const harnessRunHistory = asRecord(harnessReport.run_history);
	const harnessDocsReview = asRecord(harnessReport.docs_review);
	const embeddedJson = safeJsonForInlineScript(snapshot);

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
<h2>Harness report</h2>
<dl>${[
		renderMetric('Installed', harnessInstall.installed),
		renderMetric('Manifest lock', harnessInstall.manifest_lock),
		renderMetric('Tracked files', harnessInstall.tracked_files),
		renderMetric('Changed files', harnessVerification.changed_file_count),
		renderMetric('Changed surfaces', asArray(harnessVerification.changed_surfaces).join(', ') || 'none'),
		renderMetric('Completion verdict', completionVerdict.status),
		renderMetric('Runnable verification intents', asArray(harnessVerification.runnable_intents).length),
		renderMetric('Skipped verification intents', asArray(harnessVerification.skipped_intents).length),
		renderMetric('Verification gaps', asArray(harnessVerification.gaps).length),
		renderMetric('Decision graph nodes', graphSummary.node_count),
		renderMetric('Decision graph edges', graphSummary.edge_count),
		renderMetric('Latest run intent', harnessRunHistory.intent),
		renderMetric('Latest run status', harnessRunHistory.status),
		renderMetric('Docs review entries', harnessDocsReview.active_documents),
		renderMetric('Remaining risks', asArray(harnessReport.remaining_risks).length),
	].join('')}</dl>
<h3>Runnable verification intents</h3>
${renderList(asArray(harnessVerification.runnable_intents))}
<h3>Skipped verification intents</h3>
${renderSkippedIntents(asArray(harnessVerification.skipped_intents))}
<h3>Verification gaps</h3>
${renderVerificationGaps(asArray(harnessVerification.gaps))}
<h3>Remaining risks</h3>
${renderRemainingRisks(asArray(harnessReport.remaining_risks))}
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
