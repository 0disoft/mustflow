import { createHash } from 'node:crypto';
import { existsSync } from 'node:fs';
import path from 'node:path';

import type { RunReceiptPerformancePhase } from './run-receipt.js';
import type {
	ScriptCheckFinding,
	ScriptCheckFindingSeverity,
	ScriptCheckStatus,
} from './script-check-result.js';
import { readUtf8FileInsideWithoutSymlinks } from './safe-filesystem.js';

export const TEST_PERFORMANCE_REPORT_PACK_ID = 'test';
export const TEST_PERFORMANCE_REPORT_SCRIPT_ID = 'performance-report';
export const TEST_PERFORMANCE_REPORT_SCRIPT_REF =
	`${TEST_PERFORMANCE_REPORT_PACK_ID}/${TEST_PERFORMANCE_REPORT_SCRIPT_ID}`;

export type TestPerformanceReportAction = 'summarize';
export type TestPerformanceEvidenceKind =
	| 'latest_run_receipt'
	| 'latest_run_profile'
	| 'performance_samples'
	| 'performance_summary';
export type TestPerformanceFindingCode =
	| 'test_performance_no_evidence'
	| 'test_performance_unreadable_evidence'
	| 'test_performance_previous_failure'
	| 'test_performance_slow_sample'
	| 'test_performance_slow_test_file'
	| 'test_performance_high_timeout_ratio'
	| 'test_performance_selection_fallback'
	| 'test_performance_phase_bottleneck';
export type TestPerformanceNextActionCode =
	| 'collect_profile_evidence'
	| 'investigate_previous_failure'
	| 'inspect_slowest_intents'
	| 'inspect_slowest_test_files'
	| 'review_timeout_budget'
	| 'review_selection_fallback';

export interface TestPerformancePolicy {
	readonly max_samples: number;
	readonly max_intents: number;
	readonly max_test_files: number;
	readonly max_findings: number;
	readonly slow_sample_threshold_ms: number;
	readonly high_timeout_ratio: number;
	readonly phase_bottleneck_threshold_ms: number;
}

export interface TestPerformanceEvidenceSource {
	readonly path: string;
	readonly kind: TestPerformanceEvidenceKind;
	readonly exists: boolean;
	readonly readable: boolean;
	readonly issue: string | null;
}

export interface TestPerformanceSample {
	readonly source: 'history' | 'latest_run';
	readonly observed_day: string;
	readonly intent: string;
	readonly status: 'passed' | 'failed';
	readonly duration_ms: number;
	readonly timeout_ratio: number;
	readonly runner_bucket: string | null;
	readonly phase_count: number;
	readonly selection_strategy: string | null;
	readonly changed_file_count: number | null;
	readonly selected_target_count: number | null;
	readonly fallback_used: boolean | null;
}

export interface TestPerformancePhaseSummary {
	readonly name: string;
	readonly sample_count: number;
	readonly total_duration_ms: number;
	readonly max_duration_ms: number;
	readonly p95_duration_ms: number;
}

export interface TestPerformanceIntentSummary {
	readonly intent: string;
	readonly sample_count: number;
	readonly success_count: number;
	readonly failure_count: number;
	readonly fallback_count: number;
	readonly latest_duration_ms: number;
	readonly min_duration_ms: number;
	readonly p50_duration_ms: number;
	readonly p95_duration_ms: number;
	readonly max_duration_ms: number;
	readonly max_timeout_ratio: number;
	readonly selected_target_count_max: number | null;
	readonly slowest_phase: TestPerformancePhaseSummary | null;
}

export interface TestPerformanceTestFileSummary {
	readonly path: string;
	readonly intent: string;
	readonly status: 'passed' | 'failed';
	readonly duration_ms: number;
	readonly source: 'latest_profile';
}

export interface TestPerformanceSummary {
	readonly evidence_source_count: number;
	readonly sample_count: number;
	readonly intent_count: number;
	readonly test_file_count: number;
	readonly finding_count: number;
	readonly latest_run_intent: string | null;
	readonly latest_run_status: string | null;
	readonly latest_run_duration_ms: number | null;
	readonly latest_profile_phase_count: number;
	readonly latest_profile_test_file_count: number;
	readonly latest_profile_declared_test_file_count: number | null;
	readonly latest_profile_generated_at: string | null;
	readonly latest_profile_age_ms: number | null;
	readonly latest_profile_test_file_coverage_ratio: number | null;
	readonly latest_profile_test_files_truncated: boolean;
	readonly retained_summary_intent_count: number | null;
}

export interface TestPerformanceFinding extends ScriptCheckFinding {
	readonly code: TestPerformanceFindingCode;
	readonly path?: string;
	readonly intent?: string;
	readonly phase?: string;
}

export interface TestPerformanceNextAction {
	readonly code: TestPerformanceNextActionCode;
	readonly message: string;
	readonly command_intent: string | null;
	readonly run_hint: string | null;
	readonly finding_codes: readonly TestPerformanceFindingCode[];
}

export interface TestPerformanceReport {
	readonly schema_version: '1';
	readonly command: 'script-pack';
	readonly pack_id: typeof TEST_PERFORMANCE_REPORT_PACK_ID;
	readonly script_id: typeof TEST_PERFORMANCE_REPORT_SCRIPT_ID;
	readonly script_ref: typeof TEST_PERFORMANCE_REPORT_SCRIPT_REF;
	readonly action: TestPerformanceReportAction;
	readonly status: ScriptCheckStatus;
	readonly ok: boolean;
	readonly mustflow_root: string;
	readonly policy: TestPerformancePolicy;
	readonly input_hash: string;
	readonly evidence_sources: readonly TestPerformanceEvidenceSource[];
	readonly summary: TestPerformanceSummary;
	readonly intents: readonly TestPerformanceIntentSummary[];
	readonly phases: readonly TestPerformancePhaseSummary[];
	readonly test_files: readonly TestPerformanceTestFileSummary[];
	readonly recent_samples: readonly TestPerformanceSample[];
	readonly truncated: boolean;
	readonly findings: readonly TestPerformanceFinding[];
	readonly next_actions: readonly TestPerformanceNextAction[];
	readonly issues: readonly string[];
}

export interface CreateTestPerformanceReportOptions {
	readonly maxSamples?: number;
	readonly maxIntents?: number;
	readonly maxTestFiles?: number;
	readonly maxFindings?: number;
	readonly slowSampleThresholdMs?: number;
	readonly highTimeoutRatio?: number;
	readonly phaseBottleneckThresholdMs?: number;
}

interface HistorySample {
	readonly observed_day: string;
	readonly intent: string;
	readonly runner_bucket?: string;
	readonly duration_ms: number;
	readonly timeout_ratio: number;
	readonly status: 'passed' | 'failed';
	readonly phase_durations_ms?: Record<string, number>;
	readonly selection_strategy?: string;
	readonly changed_file_count?: number;
	readonly selected_target_count?: number;
	readonly fallback_used?: boolean;
}

interface PhaseEntry {
	readonly intent: string;
	readonly name: string;
	readonly duration_ms: number;
}

interface ReportRunReceiptSelection {
	readonly strategy: string;
	readonly changed_file_count: number;
	readonly selected_target_count: number;
	readonly fallback_used: boolean;
}

interface ReportRunReceipt {
	readonly command: 'run';
	readonly intent: string;
	readonly finished_at: string;
	readonly performance: {
		readonly duration_ms: number;
		readonly timeout_ratio: number;
		readonly phases?: readonly RunReceiptPerformancePhase[];
		readonly selection?: ReportRunReceiptSelection;
		readonly runner: {
			readonly kind: 'local';
			readonly platform_family: string;
			readonly arch_family: string;
			readonly runtime: 'node' | 'bun';
			readonly runtime_major: number;
		};
		readonly result_summary: {
			readonly status: string;
		};
	};
}

const LATEST_RUN_RECEIPT_PATH = path.join('.mustflow', 'state', 'runs', 'latest.json');
const LATEST_RUN_PROFILE_PATH = path.join('.mustflow', 'state', 'runs', 'latest.profile.json');
const PERFORMANCE_SAMPLES_PATH = path.join('.mustflow', 'state', 'perf', 'samples.json');
const PERFORMANCE_SUMMARY_PATH = path.join('.mustflow', 'state', 'perf', 'summary.json');
const DEFAULT_MAX_SAMPLES = 200;
const DEFAULT_MAX_INTENTS = 30;
const DEFAULT_MAX_TEST_FILES = 40;
const DEFAULT_MAX_FINDINGS = 80;
const DEFAULT_SLOW_SAMPLE_THRESHOLD_MS = 120_000;
const DEFAULT_HIGH_TIMEOUT_RATIO = 0.75;
const DEFAULT_PHASE_BOTTLENECK_THRESHOLD_MS = 30_000;
const MAX_EVIDENCE_BYTES = 512 * 1024;
const ERROR_CODES = new Set<TestPerformanceFindingCode>(['test_performance_unreadable_evidence']);

function normalizeRelativePath(value: string): string {
	return value.replace(/\\/gu, '/');
}

function sha256Tagged(value: string): string {
	return `sha256:${createHash('sha256').update(value).digest('hex')}`;
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function isNonNegativeNumber(value: unknown): value is number {
	return typeof value === 'number' && Number.isFinite(value) && value >= 0;
}

function isHistorySample(value: unknown): value is HistorySample {
	if (!isRecord(value)) {
		return false;
	}

	return (
		typeof value.observed_day === 'string' &&
		typeof value.intent === 'string' &&
		isNonNegativeNumber(value.duration_ms) &&
		isNonNegativeNumber(value.timeout_ratio) &&
		(value.status === 'passed' || value.status === 'failed')
	);
}

function isPhaseRecord(value: unknown): value is Record<string, number> {
	if (!isRecord(value)) {
		return false;
	}
	return Object.values(value).every(isNonNegativeNumber);
}

function isRunReceiptPhase(value: unknown): value is RunReceiptPerformancePhase {
	return isRecord(value) && typeof value.name === 'string' && isNonNegativeNumber(value.duration_ms);
}

function parseProfileTestFileStatus(value: unknown): 'passed' | 'failed' | null {
	if (value === 'passed' || value === 'ok' || value === 'success' || value === 0) {
		return 'passed';
	}
	if (value === 'failed' || value === 'failure' || value === 'error') {
		return 'failed';
	}
	if (typeof value === 'number' && Number.isInteger(value) && value > 0) {
		return 'failed';
	}
	return null;
}

function isReportRunReceiptSelection(value: unknown): value is ReportRunReceiptSelection {
	return (
		isRecord(value) &&
		typeof value.strategy === 'string' &&
		isNonNegativeNumber(value.changed_file_count) &&
		isNonNegativeNumber(value.selected_target_count) &&
		typeof value.fallback_used === 'boolean'
	);
}

function isReportRunReceiptRunner(value: unknown): value is ReportRunReceipt['performance']['runner'] {
	return (
		isRecord(value) &&
		value.kind === 'local' &&
		typeof value.platform_family === 'string' &&
		typeof value.arch_family === 'string' &&
		(value.runtime === 'node' || value.runtime === 'bun') &&
		isNonNegativeNumber(value.runtime_major)
	);
}

function isReportRunReceiptPerformance(value: unknown): value is ReportRunReceipt['performance'] {
	if (!isRecord(value) || !isRecord(value.result_summary)) {
		return false;
	}
	if (!isNonNegativeNumber(value.duration_ms) || !isNonNegativeNumber(value.timeout_ratio)) {
		return false;
	}
	if (!isReportRunReceiptRunner(value.runner) || typeof value.result_summary.status !== 'string') {
		return false;
	}
	if (value.phases !== undefined && (!Array.isArray(value.phases) || !value.phases.every(isRunReceiptPhase))) {
		return false;
	}
	if (value.selection !== undefined && !isReportRunReceiptSelection(value.selection)) {
		return false;
	}
	return true;
}

function isReportRunReceipt(value: unknown): value is ReportRunReceipt {
	return (
		isRecord(value) &&
		value.command === 'run' &&
		typeof value.intent === 'string' &&
		typeof value.finished_at === 'string' &&
		isReportRunReceiptPerformance(value.performance)
	);
}

function readJsonEvidence<T>(
	projectRoot: string,
	relativePath: string,
	kind: TestPerformanceEvidenceKind,
	parse: (value: unknown) => T | null,
	evidenceSources: TestPerformanceEvidenceSource[],
	findings: TestPerformanceFinding[],
	issues: string[],
): T | null {
	const normalizedPath = normalizeRelativePath(relativePath);
	const absolutePath = path.join(projectRoot, relativePath);

	if (!existsSync(absolutePath)) {
		evidenceSources.push({ path: normalizedPath, kind, exists: false, readable: false, issue: null });
		return null;
	}

	try {
		const parsed = JSON.parse(readUtf8FileInsideWithoutSymlinks(projectRoot, absolutePath, { maxBytes: MAX_EVIDENCE_BYTES }));
		const result = parse(parsed);
		if (!result) {
			const message = `${normalizedPath} did not match the expected performance evidence shape.`;
			evidenceSources.push({ path: normalizedPath, kind, exists: true, readable: false, issue: message });
			pushFinding(findings, {
				code: 'test_performance_unreadable_evidence',
				severity: 'high',
				path: normalizedPath,
				message,
			});
			issues.push(message);
			return null;
		}
		evidenceSources.push({ path: normalizedPath, kind, exists: true, readable: true, issue: null });
		return result;
	} catch (error) {
		const message = error instanceof Error ? error.message : String(error);
		evidenceSources.push({ path: normalizedPath, kind, exists: true, readable: false, issue: message });
		pushFinding(findings, {
			code: 'test_performance_unreadable_evidence',
			severity: 'high',
			path: normalizedPath,
			message,
		});
		issues.push(`${normalizedPath}: ${message}`);
		return null;
	}
}

function pushFinding(findings: TestPerformanceFinding[], finding: TestPerformanceFinding, maxFindings = DEFAULT_MAX_FINDINGS): void {
	if (findings.length < maxFindings) {
		findings.push(finding);
	}
}

function percentile(values: readonly number[], percentileValue: number): number {
	if (values.length === 0) {
		return 0;
	}

	const sorted = [...values].sort((left, right) => left - right);
	const index = Math.ceil((percentileValue / 100) * sorted.length) - 1;
	return sorted[Math.max(0, Math.min(sorted.length - 1, index))] ?? 0;
}

function groupBy<T>(items: readonly T[], keyFor: (item: T) => string): Map<string, T[]> {
	const groups = new Map<string, T[]>();
	for (const item of items) {
		const key = keyFor(item);
		const group = groups.get(key) ?? [];
		group.push(item);
		groups.set(key, group);
	}
	return groups;
}

function toDay(value: string): string {
	return value.slice(0, 10);
}

function getRunnerBucket(receipt: ReportRunReceipt): string {
	const runner = receipt.performance.runner;
	return `${runner.kind}/${runner.platform_family}/${runner.arch_family}/${runner.runtime}@${runner.runtime_major}`;
}

function historySampleToReportSample(sample: HistorySample): TestPerformanceSample {
	return {
		source: 'history',
		observed_day: sample.observed_day,
		intent: sample.intent,
		status: sample.status,
		duration_ms: sample.duration_ms,
		timeout_ratio: sample.timeout_ratio,
		runner_bucket: sample.runner_bucket ?? null,
		phase_count: isPhaseRecord(sample.phase_durations_ms) ? Object.keys(sample.phase_durations_ms).length : 0,
		selection_strategy: typeof sample.selection_strategy === 'string' ? sample.selection_strategy : null,
		changed_file_count: typeof sample.changed_file_count === 'number' ? sample.changed_file_count : null,
		selected_target_count: typeof sample.selected_target_count === 'number' ? sample.selected_target_count : null,
		fallback_used: typeof sample.fallback_used === 'boolean' ? sample.fallback_used : null,
	};
}

function receiptToReportSample(receipt: ReportRunReceipt): TestPerformanceSample | null {
	const status = receipt.performance.result_summary.status;
	if (status !== 'passed' && status !== 'failed') {
		return null;
	}

	const selection = receipt.performance.selection;
	return {
		source: 'latest_run',
		observed_day: toDay(receipt.finished_at),
		intent: receipt.intent,
		status,
		duration_ms: receipt.performance.duration_ms,
		timeout_ratio: receipt.performance.timeout_ratio,
		runner_bucket: getRunnerBucket(receipt),
		phase_count: receipt.performance.phases?.length ?? 0,
		selection_strategy: selection?.strategy ?? null,
		changed_file_count: selection?.changed_file_count ?? null,
		selected_target_count: selection?.selected_target_count ?? null,
		fallback_used: selection?.fallback_used ?? null,
	};
}

function collectHistoryPhases(samples: readonly HistorySample[]): readonly PhaseEntry[] {
	const phases: PhaseEntry[] = [];
	for (const sample of samples) {
		if (!isPhaseRecord(sample.phase_durations_ms)) {
			continue;
		}
		for (const [name, durationMs] of Object.entries(sample.phase_durations_ms)) {
			phases.push({ intent: sample.intent, name, duration_ms: durationMs });
		}
	}
	return phases;
}

function collectReceiptPhases(receipt: ReportRunReceipt | null): readonly PhaseEntry[] {
	return (receipt?.performance.phases ?? []).map((phase) => ({
		intent: receipt?.intent ?? 'unknown',
		name: phase.name,
		duration_ms: phase.duration_ms,
	}));
}

function summarizePhases(phases: readonly PhaseEntry[]): readonly TestPerformancePhaseSummary[] {
	return [...groupBy(phases, (phase) => phase.name).entries()]
		.map(([name, entries]) => {
			const durations = entries.map((entry) => entry.duration_ms);
			return {
				name,
				sample_count: entries.length,
				total_duration_ms: durations.reduce((sum, value) => sum + value, 0),
				max_duration_ms: Math.max(...durations),
				p95_duration_ms: percentile(durations, 95),
			};
		})
		.sort((left, right) => right.p95_duration_ms - left.p95_duration_ms || left.name.localeCompare(right.name));
}

function summarizeIntent(
	intent: string,
	samples: readonly TestPerformanceSample[],
	phaseSummaries: readonly TestPerformancePhaseSummary[],
): TestPerformanceIntentSummary {
	const durations = samples.map((sample) => sample.duration_ms);
	const selectedTargetCounts = samples
		.map((sample) => sample.selected_target_count)
		.filter((value): value is number => typeof value === 'number');

	return {
		intent,
		sample_count: samples.length,
		success_count: samples.filter((sample) => sample.status === 'passed').length,
		failure_count: samples.filter((sample) => sample.status === 'failed').length,
		fallback_count: samples.filter((sample) => sample.fallback_used === true).length,
		latest_duration_ms: samples.at(-1)?.duration_ms ?? 0,
		min_duration_ms: Math.min(...durations),
		p50_duration_ms: percentile(durations, 50),
		p95_duration_ms: percentile(durations, 95),
		max_duration_ms: Math.max(...durations),
		max_timeout_ratio: Math.max(...samples.map((sample) => sample.timeout_ratio)),
		selected_target_count_max: selectedTargetCounts.length > 0 ? Math.max(...selectedTargetCounts) : null,
		slowest_phase: phaseSummaries[0] ?? null,
	};
}

function summarizeIntents(
	samples: readonly TestPerformanceSample[],
	phases: readonly PhaseEntry[],
	maxIntents: number,
): readonly TestPerformanceIntentSummary[] {
	return [...groupBy(samples, (sample) => sample.intent).entries()]
		.map(([intent, intentSamples]) => {
			const intentPhases = phases.filter((phase) => phase.intent === intent);
			return summarizeIntent(intent, intentSamples, summarizePhases(intentPhases));
		})
		.sort((left, right) => right.p95_duration_ms - left.p95_duration_ms || left.intent.localeCompare(right.intent))
		.slice(0, maxIntents);
}

function summarizeLatestProfilePhases(profile: unknown): readonly RunReceiptPerformancePhase[] {
	if (!isRecord(profile) || !Array.isArray(profile.phases)) {
		return [];
	}
	return profile.phases.filter(
		(phase): phase is RunReceiptPerformancePhase =>
			isRunReceiptPhase(phase),
	);
}

function summarizeLatestProfileTestFiles(
	profile: unknown,
	intent: string | null,
	maxTestFiles: number,
): readonly TestPerformanceTestFileSummary[] {
	if (!isRecord(profile)) {
		return [];
	}

	const entries = Array.isArray(profile.test_files)
		? profile.test_files
		: Array.isArray(profile.files)
			? profile.files
			: Array.isArray(profile.timings)
				? profile.timings
				: [];

	return entries
		.flatMap((entry): TestPerformanceTestFileSummary[] => {
			if (!isRecord(entry)) {
				return [];
			}
			const rawPath = typeof entry.path === 'string'
				? entry.path
				: typeof entry.testPath === 'string'
					? entry.testPath
					: typeof entry.file === 'string'
						? entry.file
						: null;
			const rawDuration = isNonNegativeNumber(entry.duration_ms)
				? entry.duration_ms
				: isNonNegativeNumber(entry.durationMs)
					? entry.durationMs
					: null;
			const status = parseProfileTestFileStatus(entry.status ?? entry.exit_code ?? entry.exitCode);

			if (!rawPath || rawDuration === null || !status) {
				return [];
			}

			return [{
				path: normalizeRelativePath(rawPath),
				intent: typeof profile.intent === 'string' ? profile.intent : intent ?? 'latest_profile',
				status,
				duration_ms: rawDuration,
				source: 'latest_profile',
			}];
		})
		.sort((left, right) => right.duration_ms - left.duration_ms || left.path.localeCompare(right.path))
		.slice(0, maxTestFiles);
}

function extractLatestProfileGeneratedAt(profile: unknown): string | null {
	if (!isRecord(profile) || typeof profile.generated_at !== 'string') {
		return null;
	}
	return profile.generated_at;
}

function extractLatestProfileAgeMs(profile: unknown, nowMs: number): number | null {
	const generatedAt = extractLatestProfileGeneratedAt(profile);
	if (!generatedAt) {
		return null;
	}
	const generatedAtMs = Date.parse(generatedAt);
	if (!Number.isFinite(generatedAtMs)) {
		return null;
	}
	return Math.max(0, nowMs - generatedAtMs);
}

function extractLatestProfileDeclaredTestFileCount(profile: unknown): number | null {
	if (!isRecord(profile) || !isNonNegativeNumber(profile.file_count)) {
		return null;
	}
	return Math.floor(profile.file_count);
}

function latestProfileTestFileCoverageRatio(
	visibleTestFileCount: number,
	latestProfileTestFileCount: number,
	declaredTestFileCount: number | null,
): number | null {
	const denominator = Math.max(declaredTestFileCount ?? 0, latestProfileTestFileCount);
	if (denominator <= 0) {
		return null;
	}
	return visibleTestFileCount / denominator;
}

function extractRetainedSummaryIntentCount(summary: unknown): number | null {
	if (!isRecord(summary) || !isRecord(summary.intents)) {
		return null;
	}
	return Object.keys(summary.intents).length;
}

function createFindings(
	samples: readonly TestPerformanceSample[],
	phases: readonly TestPerformancePhaseSummary[],
	testFiles: readonly TestPerformanceTestFileSummary[],
	policy: TestPerformancePolicy,
	findings: TestPerformanceFinding[],
): void {
	if (samples.length === 0) {
		pushFinding(findings, {
			code: 'test_performance_no_evidence',
			severity: 'low',
			message: 'No run performance evidence was found under .mustflow/state.',
		}, policy.max_findings);
		return;
	}

	for (const sample of samples) {
		if (sample.status === 'failed') {
			pushFinding(findings, {
				code: 'test_performance_previous_failure',
				severity: 'medium',
				intent: sample.intent,
				message: `${sample.intent} has a failed performance sample.`,
			}, policy.max_findings);
		}
		if (sample.duration_ms >= policy.slow_sample_threshold_ms) {
			pushFinding(findings, {
				code: 'test_performance_slow_sample',
				severity: 'medium',
				intent: sample.intent,
				message: `${sample.intent} took ${sample.duration_ms}ms, above the ${policy.slow_sample_threshold_ms}ms threshold.`,
				metric: 'duration_ms',
				actual: sample.duration_ms,
				expected: policy.slow_sample_threshold_ms,
			}, policy.max_findings);
		}
		if (sample.timeout_ratio >= policy.high_timeout_ratio) {
			pushFinding(findings, {
				code: 'test_performance_high_timeout_ratio',
				severity: 'medium',
				intent: sample.intent,
				message: `${sample.intent} consumed ${(sample.timeout_ratio * 100).toFixed(1)}% of its timeout budget.`,
				metric: 'timeout_ratio',
				actual: sample.timeout_ratio,
				expected: policy.high_timeout_ratio,
			}, policy.max_findings);
		}
		if (sample.fallback_used) {
			pushFinding(findings, {
				code: 'test_performance_selection_fallback',
				severity: 'low',
				intent: sample.intent,
				message: `${sample.intent} used a selected-test fallback path.`,
			}, policy.max_findings);
		}
	}

	for (const testFile of testFiles) {
		if (testFile.status === 'failed') {
			pushFinding(findings, {
				code: 'test_performance_previous_failure',
				severity: 'medium',
				path: testFile.path,
				intent: testFile.intent,
				message: `${testFile.path} failed in the latest profiled test run.`,
			}, policy.max_findings);
		}
		if (testFile.duration_ms >= policy.slow_sample_threshold_ms) {
			pushFinding(findings, {
				code: 'test_performance_slow_test_file',
				severity: 'medium',
				path: testFile.path,
				intent: testFile.intent,
				message: `${testFile.path} took ${testFile.duration_ms}ms, above the ${policy.slow_sample_threshold_ms}ms threshold.`,
				metric: 'duration_ms',
				actual: testFile.duration_ms,
				expected: policy.slow_sample_threshold_ms,
			}, policy.max_findings);
		}
	}

	for (const phase of phases) {
		if (phase.p95_duration_ms >= policy.phase_bottleneck_threshold_ms) {
			pushFinding(findings, {
				code: 'test_performance_phase_bottleneck',
				severity: 'medium',
				phase: phase.name,
				message: `${phase.name} phase p95 is ${phase.p95_duration_ms}ms.`,
				metric: 'p95_duration_ms',
				actual: phase.p95_duration_ms,
				expected: policy.phase_bottleneck_threshold_ms,
			}, policy.max_findings);
		}
	}
}

function reportStatus(findings: readonly TestPerformanceFinding[]): ScriptCheckStatus {
	if (findings.some((finding) => ERROR_CODES.has(finding.code))) {
		return 'error';
	}
	return 'passed';
}

function hasFinding(findings: readonly TestPerformanceFinding[], code: TestPerformanceFindingCode): boolean {
	return findings.some((finding) => finding.code === code);
}

function profileTestFilesAreTruncated(
	testFiles: readonly TestPerformanceTestFileSummary[],
	latestProfileTestFileCount: number,
): boolean {
	return latestProfileTestFileCount > testFiles.length;
}

function profileTestFilesAreTopHeavy(
	testFiles: readonly TestPerformanceTestFileSummary[],
	policy: TestPerformancePolicy,
): boolean {
	if (testFiles.length < 2) {
		return false;
	}

	const totalDurationMs = testFiles.reduce((sum, testFile) => sum + testFile.duration_ms, 0);
	const slowestDurationMs = testFiles[0]?.duration_ms ?? 0;
	return (
		totalDurationMs > 0 &&
		slowestDurationMs >= policy.phase_bottleneck_threshold_ms &&
		slowestDurationMs / totalDurationMs >= 0.6
	);
}

function describeSlowestTestFileAction(
	testFiles: readonly TestPerformanceTestFileSummary[],
	latestProfileTestFileCount: number,
): string {
	const baseMessage =
		'Use the slowest profiled test-file rows to decide whether file-level sharding, fixture reuse, or test splitting is the bottleneck.';
	if (!profileTestFilesAreTruncated(testFiles, latestProfileTestFileCount)) {
		return baseMessage;
	}
	const truncationMessage =
		`The report shows ${testFiles.length} of ${latestProfileTestFileCount} profiled files; ` +
		'raise --max-test-files when the hidden tail matters.';
	return `${baseMessage} ${truncationMessage}`;
}

function createNextActions(
	samples: readonly TestPerformanceSample[],
	findings: readonly TestPerformanceFinding[],
	testFiles: readonly TestPerformanceTestFileSummary[],
	latestProfileTestFileCount: number,
	policy: TestPerformancePolicy,
): readonly TestPerformanceNextAction[] {
	const actions: TestPerformanceNextAction[] = [];

	if (samples.length === 0 && hasFinding(findings, 'test_performance_no_evidence')) {
		actions.push({
			code: 'collect_profile_evidence',
			message:
				'Run a configured profiling intent before changing test scheduling, caching, timeout, or selection policy.',
			command_intent: 'test_related_profile',
			run_hint: 'mf run test_related_profile',
			finding_codes: ['test_performance_no_evidence'],
		});
	}

	if (samples.length > 0 && latestProfileTestFileCount === 0) {
		actions.push({
			code: 'collect_profile_evidence',
			message:
				'Collect test-file profile evidence before changing file-level sharding, fixture reuse, or test splitting policy.',
			command_intent: 'test_related_profile',
			run_hint: 'mf run test_related_profile',
			finding_codes: [],
		});
	}

	if (hasFinding(findings, 'test_performance_previous_failure')) {
		actions.push({
			code: 'investigate_previous_failure',
			message:
				'Resolve or classify previous failed test runs before using timing data as optimization evidence.',
			command_intent: null,
			run_hint: null,
			finding_codes: ['test_performance_previous_failure'],
		});
	}

	const slowFindingCodes = findings
		.filter((finding) =>
			finding.code === 'test_performance_slow_sample' ||
			finding.code === 'test_performance_phase_bottleneck',
		)
		.map((finding) => finding.code);
	if (slowFindingCodes.length > 0) {
		actions.push({
			code: 'inspect_slowest_intents',
			message:
				'Use the slowest intent and phase rows to classify discovery, startup, fixture, scheduling, or artifact cost before optimizing.',
			command_intent: null,
			run_hint: null,
			finding_codes: [...new Set(slowFindingCodes)],
		});
	}

	if (hasFinding(findings, 'test_performance_slow_test_file')) {
		actions.push({
			code: 'inspect_slowest_test_files',
			message: describeSlowestTestFileAction(testFiles, latestProfileTestFileCount),
			command_intent: null,
			run_hint: null,
			finding_codes: ['test_performance_slow_test_file'],
		});
	} else if (
		profileTestFilesAreTruncated(testFiles, latestProfileTestFileCount) ||
		profileTestFilesAreTopHeavy(testFiles, policy)
	) {
		actions.push({
			code: 'inspect_slowest_test_files',
			message: describeSlowestTestFileAction(testFiles, latestProfileTestFileCount),
			command_intent: null,
			run_hint: null,
			finding_codes: [],
		});
	}

	if (hasFinding(findings, 'test_performance_high_timeout_ratio')) {
		actions.push({
			code: 'review_timeout_budget',
			message:
				'Review timeout pressure with fresh timing evidence before increasing command timeouts.',
			command_intent: 'test_related_profile',
			run_hint: 'mf run test_related_profile',
			finding_codes: ['test_performance_high_timeout_ratio'],
		});
	}

	if (hasFinding(findings, 'test_performance_selection_fallback')) {
		actions.push({
			code: 'review_selection_fallback',
			message:
				'Inspect selected-test fallback causes before relying on the fast related-test path for this change surface.',
			command_intent: null,
			run_hint: null,
			finding_codes: ['test_performance_selection_fallback'],
		});
	}

	return actions;
}

export function createTestPerformanceReport(
	projectRoot: string,
	options: CreateTestPerformanceReportOptions = {},
): TestPerformanceReport {
	const root = path.resolve(projectRoot);
	const policy: TestPerformancePolicy = {
		max_samples: options.maxSamples ?? DEFAULT_MAX_SAMPLES,
		max_intents: options.maxIntents ?? DEFAULT_MAX_INTENTS,
		max_test_files: options.maxTestFiles ?? DEFAULT_MAX_TEST_FILES,
		max_findings: options.maxFindings ?? DEFAULT_MAX_FINDINGS,
		slow_sample_threshold_ms: options.slowSampleThresholdMs ?? DEFAULT_SLOW_SAMPLE_THRESHOLD_MS,
		high_timeout_ratio: options.highTimeoutRatio ?? DEFAULT_HIGH_TIMEOUT_RATIO,
		phase_bottleneck_threshold_ms: options.phaseBottleneckThresholdMs ?? DEFAULT_PHASE_BOTTLENECK_THRESHOLD_MS,
	};
	const evidenceSources: TestPerformanceEvidenceSource[] = [];
	const findings: TestPerformanceFinding[] = [];
	const issues: string[] = [];
	const historySamples = readJsonEvidence(
		root,
		PERFORMANCE_SAMPLES_PATH,
		'performance_samples',
		(value) => (isRecord(value) && Array.isArray(value.samples) ? value.samples.filter(isHistorySample) : null),
		evidenceSources,
		findings,
		issues,
	) ?? [];
	const retainedSummaryIntentCount = readJsonEvidence(
		root,
		PERFORMANCE_SUMMARY_PATH,
		'performance_summary',
		(value) => value,
		evidenceSources,
		findings,
		issues,
	);
	const latestReceipt = readJsonEvidence(
		root,
		LATEST_RUN_RECEIPT_PATH,
		'latest_run_receipt',
		(value) => (isReportRunReceipt(value) ? value : null),
		evidenceSources,
		findings,
		issues,
	);
	const latestProfile = readJsonEvidence(
		root,
		LATEST_RUN_PROFILE_PATH,
		'latest_run_profile',
		(value) => value,
		evidenceSources,
		findings,
		issues,
	);
	const latestSample = latestReceipt ? receiptToReportSample(latestReceipt) : null;
	const allSamples = [
		...historySamples.map(historySampleToReportSample),
		...(latestSample ? [latestSample] : []),
	];
	const recentSamples = allSamples.slice(Math.max(0, allSamples.length - policy.max_samples));
	const phaseEntries = [
		...collectHistoryPhases(historySamples),
		...collectReceiptPhases(latestReceipt),
		...summarizeLatestProfilePhases(latestProfile).map((phase) => ({
			intent: latestReceipt?.intent ?? 'latest_profile',
			name: phase.name,
			duration_ms: phase.duration_ms,
		})),
	];
	const allTestFiles = summarizeLatestProfileTestFiles(latestProfile, latestReceipt?.intent ?? null, Number.MAX_SAFE_INTEGER);
	const testFiles = allTestFiles.slice(0, policy.max_test_files);
	const latestProfileDeclaredTestFileCount = extractLatestProfileDeclaredTestFileCount(latestProfile);
	const latestProfileCoverageRatio = latestProfileTestFileCoverageRatio(
		testFiles.length,
		allTestFiles.length,
		latestProfileDeclaredTestFileCount,
	);
	const phases = summarizePhases(phaseEntries);
	const intents = summarizeIntents(recentSamples, phaseEntries, policy.max_intents);
	const visibleFindings = findings;

	createFindings(recentSamples, phases, testFiles, policy, visibleFindings);

	const status = reportStatus(visibleFindings);
	const nextActions = createNextActions(recentSamples, visibleFindings, testFiles, allTestFiles.length, policy);
	const summary: TestPerformanceSummary = {
		evidence_source_count: evidenceSources.filter((source) => source.readable).length,
		sample_count: recentSamples.length,
		intent_count: new Set(recentSamples.map((sample) => sample.intent)).size,
		test_file_count: testFiles.length,
		finding_count: visibleFindings.length,
		latest_run_intent: latestReceipt?.intent ?? null,
		latest_run_status: latestReceipt?.performance.result_summary.status ?? null,
		latest_run_duration_ms: latestReceipt?.performance.duration_ms ?? null,
		latest_profile_phase_count: summarizeLatestProfilePhases(latestProfile).length,
		latest_profile_test_file_count: allTestFiles.length,
		latest_profile_declared_test_file_count: latestProfileDeclaredTestFileCount,
		latest_profile_generated_at: extractLatestProfileGeneratedAt(latestProfile),
		latest_profile_age_ms: extractLatestProfileAgeMs(latestProfile, Date.now()),
		latest_profile_test_file_coverage_ratio: latestProfileCoverageRatio,
		latest_profile_test_files_truncated: latestProfileCoverageRatio === null
			? false
			: latestProfileCoverageRatio < 1,
		retained_summary_intent_count: extractRetainedSummaryIntentCount(retainedSummaryIntentCount),
	};

	const hashSummary = {
		...summary,
		latest_profile_age_ms: null,
	};

	return {
		schema_version: '1',
		command: 'script-pack',
		pack_id: TEST_PERFORMANCE_REPORT_PACK_ID,
		script_id: TEST_PERFORMANCE_REPORT_SCRIPT_ID,
		script_ref: TEST_PERFORMANCE_REPORT_SCRIPT_REF,
		action: 'summarize',
		status,
		ok: status === 'passed',
		mustflow_root: root,
		policy,
		input_hash: sha256Tagged(JSON.stringify({ policy, evidenceSources, summary: hashSummary, recentSamples, nextActions })),
		evidence_sources: evidenceSources,
		summary,
		intents,
		phases,
		test_files: testFiles,
		recent_samples: recentSamples,
		truncated:
			allSamples.length > recentSamples.length ||
			new Set(allSamples.map((sample) => sample.intent)).size > intents.length ||
			allTestFiles.length > testFiles.length ||
			visibleFindings.length >= policy.max_findings,
		findings: visibleFindings,
		next_actions: nextActions,
		issues,
	};
}
