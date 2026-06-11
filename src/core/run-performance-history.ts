import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

import type { RunReceipt, RunReceiptPerformance } from './run-receipt.js';
import { writeJsonFileInsideWithoutSymlinks } from './safe-filesystem.js';

const PERFORMANCE_HISTORY_SCHEMA_VERSION = '1';
const PERFORMANCE_HISTORY_DIR = path.join('.mustflow', 'state', 'perf');
const PERFORMANCE_SAMPLES_FILE = 'samples.json';
const PERFORMANCE_SUMMARY_FILE = 'summary.json';
const MAX_AGE_DAYS = 30;
const MAX_TOTAL_KB = 256;
const MAX_TOTAL_BYTES = MAX_TOTAL_KB * 1024;
const MAX_SAMPLES_TOTAL = 500;
const MAX_SAMPLES_PER_INTENT = 40;
const MAX_SAMPLES_PER_INTENT_FINGERPRINT = 20;
const MAX_FAILED_SAMPLES_PER_INTENT = 5;
const MAX_FINGERPRINTS_PER_INTENT = 3;
const EWMA_ALPHA = 0.3;

type ExitCodeClass = RunReceiptPerformance['result_summary']['exit_code_class'];
type ErrorKind = RunReceiptPerformance['result_summary']['error_kind'];

export interface RunPerformanceSample {
	readonly observed_day: string;
	readonly intent: string;
	readonly intent_fingerprint: string;
	readonly command_fingerprint: string;
	readonly contract_fingerprint: string;
	readonly runner_bucket: string;
	readonly duration_ms: number;
	readonly executor_overhead_ms?: number;
	readonly timeout_ratio: number;
	readonly status: 'passed' | 'failed';
	readonly exit_code_class: ExitCodeClass;
	readonly timed_out: false;
	readonly error_kind: ErrorKind;
	readonly stdout_bytes: number;
	readonly stderr_bytes: number;
	readonly phase_durations_ms?: Record<string, number>;
	readonly selection_strategy?: string;
	readonly changed_file_count?: number;
	readonly changed_surface_counts?: Record<string, number>;
	readonly selected_target_count?: number;
	readonly fallback_used?: boolean;
}

interface RunPerformanceSamplesFile {
	readonly schema_version: string;
	readonly retention: RunPerformanceRetention;
	readonly samples: readonly RunPerformanceSample[];
}

interface RunPerformanceRetention {
	readonly max_age_days: number;
	readonly max_total_kb: number;
	readonly max_samples_total: number;
	readonly max_samples_per_intent: number;
	readonly max_samples_per_intent_fingerprint: number;
	readonly max_failed_samples_per_intent: number;
	readonly max_fingerprints_per_intent: number;
	readonly timestamp_granularity: 'day';
	readonly stores_output_tails: false;
	readonly stores_command_line: false;
	readonly stores_environment_values: false;
	readonly stores_absolute_paths: false;
	readonly stores_test_names: false;
}

interface RunPerformanceSummaryFile {
	readonly schema_version: string;
	readonly generated_day: string;
	readonly retention: RunPerformanceRetention;
	readonly intents: Record<string, RunPerformanceIntentSummary>;
}

interface RunPerformanceIntentSummary {
	readonly fingerprints: Record<string, RunPerformanceFingerprintSummary>;
}

interface RunPerformanceFingerprintSummary {
	readonly sample_count: number;
	readonly success_count: number;
	readonly timeout_count: number;
	readonly failure_count: number;
	readonly p50_duration_ms: number;
	readonly p75_duration_ms: number;
	readonly p95_duration_ms: number;
	readonly min_duration_ms: number;
	readonly max_duration_ms: number;
	readonly ewma_duration_ms: number;
	readonly last_success_duration_ms: number | null;
	readonly last_observed_day: string;
	readonly runner_buckets: Record<string, RunPerformanceRunnerSummary>;
}

interface RunPerformanceRunnerSummary {
	readonly sample_count: number;
	readonly p50_duration_ms: number;
}

function getRetention(): RunPerformanceRetention {
	return {
		max_age_days: MAX_AGE_DAYS,
		max_total_kb: MAX_TOTAL_KB,
		max_samples_total: MAX_SAMPLES_TOTAL,
		max_samples_per_intent: MAX_SAMPLES_PER_INTENT,
		max_samples_per_intent_fingerprint: MAX_SAMPLES_PER_INTENT_FINGERPRINT,
		max_failed_samples_per_intent: MAX_FAILED_SAMPLES_PER_INTENT,
		max_fingerprints_per_intent: MAX_FINGERPRINTS_PER_INTENT,
		timestamp_granularity: 'day',
		stores_output_tails: false,
		stores_command_line: false,
		stores_environment_values: false,
		stores_absolute_paths: false,
		stores_test_names: false,
	};
}

function toObservedDay(value: string): string {
	return value.slice(0, 10);
}

function toDayIndex(day: string): number {
	const time = Date.parse(`${day}T00:00:00.000Z`);
	return Math.floor(time / 86_400_000);
}

function getRunnerBucket(runner: RunReceiptPerformance['runner']): string {
	return `${runner.kind}/${runner.platform_family}/${runner.arch_family}/${runner.runtime}@${runner.runtime_major}`;
}

function createSample(receipt: RunReceipt): RunPerformanceSample | null {
	if (!receipt.performance.quality.usable_for_history) {
		return null;
	}

	if (receipt.performance.result_summary.status !== 'passed' && receipt.performance.result_summary.status !== 'failed') {
		return null;
	}

	return {
		observed_day: toObservedDay(receipt.finished_at),
		intent: receipt.intent,
		intent_fingerprint: receipt.performance.intent_fingerprint,
		command_fingerprint: receipt.performance.command_fingerprint,
		contract_fingerprint: receipt.performance.contract_fingerprint,
		runner_bucket: getRunnerBucket(receipt.performance.runner),
		duration_ms: receipt.performance.duration_ms,
		...(typeof receipt.performance.executor_overhead_ms === 'number'
			? { executor_overhead_ms: receipt.performance.executor_overhead_ms }
			: {}),
		timeout_ratio: receipt.performance.timeout_ratio,
		status: receipt.performance.result_summary.status,
		exit_code_class: receipt.performance.result_summary.exit_code_class,
		timed_out: false,
		error_kind: receipt.performance.result_summary.error_kind,
		stdout_bytes: receipt.performance.output_summary.stdout_bytes,
		stderr_bytes: receipt.performance.output_summary.stderr_bytes,
		...(receipt.performance.phases && receipt.performance.phases.length > 0
			? { phase_durations_ms: toPhaseDurations(receipt.performance.phases) }
			: {}),
		...(receipt.performance.selection
			? {
					selection_strategy: receipt.performance.selection.strategy,
					changed_file_count: receipt.performance.selection.changed_file_count,
					changed_surface_counts: receipt.performance.selection.changed_surface_counts,
					selected_target_count: receipt.performance.selection.selected_target_count,
					fallback_used: receipt.performance.selection.fallback_used,
				}
			: {}),
	};
}

function toPhaseDurations(phases: NonNullable<RunReceiptPerformance['phases']>): Record<string, number> {
	const durations: Record<string, number> = {};

	for (const phase of phases) {
		durations[phase.name] = phase.duration_ms;
	}

	return durations;
}

function readSamples(samplesPath: string): readonly RunPerformanceSample[] {
	if (!existsSync(samplesPath)) {
		return [];
	}

	try {
		const parsed = JSON.parse(readFileSync(samplesPath, 'utf8')) as Partial<RunPerformanceSamplesFile>;
		return Array.isArray(parsed.samples) ? parsed.samples.filter(isRunPerformanceSample) : [];
	} catch {
		return [];
	}
}

function isRunPerformanceSample(value: unknown): value is RunPerformanceSample {
	if (!value || typeof value !== 'object') {
		return false;
	}

	const sample = value as Partial<RunPerformanceSample>;
	return (
		typeof sample.observed_day === 'string' &&
		typeof sample.intent === 'string' &&
		typeof sample.intent_fingerprint === 'string' &&
		typeof sample.command_fingerprint === 'string' &&
		typeof sample.contract_fingerprint === 'string' &&
		typeof sample.runner_bucket === 'string' &&
		typeof sample.duration_ms === 'number' &&
		typeof sample.timeout_ratio === 'number' &&
		(sample.status === 'passed' || sample.status === 'failed') &&
		typeof sample.stdout_bytes === 'number' &&
		typeof sample.stderr_bytes === 'number' &&
		(sample.selection_strategy === undefined || typeof sample.selection_strategy === 'string') &&
		(sample.changed_file_count === undefined || isNonNegativeNumber(sample.changed_file_count)) &&
		(sample.changed_surface_counts === undefined || isChangedSurfaceCounts(sample.changed_surface_counts)) &&
		(sample.selected_target_count === undefined || isNonNegativeNumber(sample.selected_target_count)) &&
		(sample.fallback_used === undefined || typeof sample.fallback_used === 'boolean')
	);
}

function isNonNegativeNumber(value: unknown): value is number {
	return typeof value === 'number' && Number.isFinite(value) && value >= 0;
}

function isChangedSurfaceCounts(value: unknown): value is Record<string, number> {
	if (!value || typeof value !== 'object' || Array.isArray(value)) {
		return false;
	}

	return Object.entries(value).every(([surface, count]) => /^[a-z][a-z0-9_]*$/.test(surface) && isNonNegativeNumber(count));
}

function keepMostRecentByLimit<T>(items: readonly T[], limit: number, key: (item: T) => string): readonly T[] {
	const counts = new Map<string, number>();
	const kept: T[] = [];

	for (let index = items.length - 1; index >= 0; index -= 1) {
		const item = items[index];
		const itemKey = key(item);
		const count = counts.get(itemKey) ?? 0;

		if (count < limit) {
			kept.push(item);
			counts.set(itemKey, count + 1);
		}
	}

	return kept.reverse();
}

function keepMostRecentFailuresByIntent(samples: readonly RunPerformanceSample[]): readonly RunPerformanceSample[] {
	const failures = new Map<string, number>();
	const keepIndexes = new Set<number>();

	for (let index = samples.length - 1; index >= 0; index -= 1) {
		const sample = samples[index];

		if (sample.status === 'passed') {
			keepIndexes.add(index);
			continue;
		}

		const count = failures.get(sample.intent) ?? 0;
		if (count < MAX_FAILED_SAMPLES_PER_INTENT) {
			keepIndexes.add(index);
			failures.set(sample.intent, count + 1);
		}
	}

	return samples.filter((_, index) => keepIndexes.has(index));
}

function keepRecentFingerprintsByIntent(samples: readonly RunPerformanceSample[]): readonly RunPerformanceSample[] {
	const latestByIntent = new Map<string, Map<string, number>>();

	for (const sample of samples) {
		const byFingerprint = latestByIntent.get(sample.intent) ?? new Map<string, number>();
		byFingerprint.set(sample.intent_fingerprint, Math.max(byFingerprint.get(sample.intent_fingerprint) ?? 0, toDayIndex(sample.observed_day)));
		latestByIntent.set(sample.intent, byFingerprint);
	}

	const allowed = new Map<string, Set<string>>();
	for (const [intent, fingerprints] of latestByIntent.entries()) {
		const allowedFingerprints = [...fingerprints.entries()]
			.sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]))
			.slice(0, MAX_FINGERPRINTS_PER_INTENT)
			.map(([fingerprint]) => fingerprint);
		allowed.set(intent, new Set(allowedFingerprints));
	}

	return samples.filter((sample) => allowed.get(sample.intent)?.has(sample.intent_fingerprint) ?? false);
}

function pruneSamples(samples: readonly RunPerformanceSample[], today: string): readonly RunPerformanceSample[] {
	const todayIndex = toDayIndex(today);
	let pruned: readonly RunPerformanceSample[] = samples.filter((sample) => todayIndex - toDayIndex(sample.observed_day) < MAX_AGE_DAYS);
	pruned = keepRecentFingerprintsByIntent(pruned);
	pruned = keepMostRecentByLimit(pruned, MAX_SAMPLES_PER_INTENT_FINGERPRINT, (sample) => `${sample.intent}\0${sample.intent_fingerprint}`);
	pruned = keepMostRecentByLimit(pruned, MAX_SAMPLES_PER_INTENT, (sample) => sample.intent);
	pruned = keepMostRecentFailuresByIntent(pruned);
	return pruned.slice(Math.max(0, pruned.length - MAX_SAMPLES_TOTAL));
}

function percentile(values: readonly number[], percentileValue: number): number {
	if (values.length === 0) {
		return 0;
	}

	const sorted = [...values].sort((left, right) => left - right);
	const index = Math.ceil((percentileValue / 100) * sorted.length) - 1;
	return sorted[Math.max(0, Math.min(sorted.length - 1, index))] ?? 0;
}

function calculateEwma(values: readonly number[]): number {
	if (values.length === 0) {
		return 0;
	}

	let current = values[0] ?? 0;
	for (const value of values.slice(1)) {
		current = EWMA_ALPHA * value + (1 - EWMA_ALPHA) * current;
	}

	return Math.round(current);
}

function summarizeRunnerBuckets(samples: readonly RunPerformanceSample[]): Record<string, RunPerformanceRunnerSummary> {
	const buckets: Record<string, RunPerformanceRunnerSummary> = {};
	const groups = groupBy(samples, (sample) => sample.runner_bucket);

	for (const [bucket, bucketSamples] of groups.entries()) {
		const durations = bucketSamples.map((sample) => sample.duration_ms);
		buckets[bucket] = {
			sample_count: bucketSamples.length,
			p50_duration_ms: percentile(durations, 50),
		};
	}

	return buckets;
}

function summarizeFingerprint(samples: readonly RunPerformanceSample[]): RunPerformanceFingerprintSummary {
	const durations = samples.map((sample) => sample.duration_ms);
	const successes = samples.filter((sample) => sample.status === 'passed');
	const failures = samples.filter((sample) => sample.status !== 'passed');
	const lastSuccess = successes.at(-1);

	return {
		sample_count: samples.length,
		success_count: successes.length,
		timeout_count: samples.filter((sample) => sample.timed_out).length,
		failure_count: failures.length,
		p50_duration_ms: percentile(durations, 50),
		p75_duration_ms: percentile(durations, 75),
		p95_duration_ms: percentile(durations, 95),
		min_duration_ms: Math.min(...durations),
		max_duration_ms: Math.max(...durations),
		ewma_duration_ms: calculateEwma(durations),
		last_success_duration_ms: lastSuccess?.duration_ms ?? null,
		last_observed_day: samples.at(-1)?.observed_day ?? '',
		runner_buckets: summarizeRunnerBuckets(samples),
	};
}

function createSummary(samples: readonly RunPerformanceSample[], generatedDay: string): RunPerformanceSummaryFile {
	const intents: Record<string, RunPerformanceIntentSummary> = {};
	const byIntent = groupBy(samples, (sample) => sample.intent);

	for (const [intent, intentSamples] of byIntent.entries()) {
		const fingerprints: Record<string, RunPerformanceFingerprintSummary> = {};
		const byFingerprint = groupBy(intentSamples, (sample) => sample.intent_fingerprint);

		for (const [fingerprint, fingerprintSamples] of byFingerprint.entries()) {
			fingerprints[fingerprint] = summarizeFingerprint(fingerprintSamples);
		}

		intents[intent] = { fingerprints };
	}

	return {
		schema_version: PERFORMANCE_HISTORY_SCHEMA_VERSION,
		generated_day: generatedDay,
		retention: getRetention(),
		intents,
	};
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

function createSamplesFile(samples: readonly RunPerformanceSample[]): RunPerformanceSamplesFile {
	return {
		schema_version: PERFORMANCE_HISTORY_SCHEMA_VERSION,
		retention: getRetention(),
		samples,
	};
}

function serialize(value: unknown): string {
	return `${JSON.stringify(value, null, 2)}\n`;
}

function serializedHistorySize(samples: readonly RunPerformanceSample[], today: string): number {
	return (
		Buffer.byteLength(serialize(createSamplesFile(samples)), 'utf8') +
		Buffer.byteLength(serialize(createSummary(samples, today)), 'utf8')
	);
}

function enforceSizeLimit(samples: readonly RunPerformanceSample[], today: string): readonly RunPerformanceSample[] {
	const currentSize = serializedHistorySize(samples, today);
	if (currentSize <= MAX_TOTAL_BYTES) {
		return samples;
	}

	const averageBytesPerSample = Math.max(1, currentSize / Math.max(1, samples.length));
	const estimatedDropCount = Math.floor((currentSize - MAX_TOTAL_BYTES) / averageBytesPerSample);
	let low = 1;
	let high = samples.length;
	let firstFittingIndex = samples.length;
	const probeIndex = Math.max(1, Math.min(samples.length, estimatedDropCount));

	if (probeIndex > 1) {
		if (serializedHistorySize(samples.slice(probeIndex), today) <= MAX_TOTAL_BYTES) {
			firstFittingIndex = probeIndex;
			high = probeIndex - 1;
		} else {
			low = probeIndex + 1;
		}
	}

	while (low <= high) {
		const middle = Math.floor((low + high) / 2);
		const candidate = samples.slice(middle);

		if (serializedHistorySize(candidate, today) <= MAX_TOTAL_BYTES) {
			firstFittingIndex = middle;
			high = middle - 1;
			continue;
		}

		low = middle + 1;
	}

	return samples.slice(firstFittingIndex);
}

export function recordRunPerformanceHistory(projectRoot: string, receipt: RunReceipt): void {
	const sample = createSample(receipt);

	if (!sample) {
		return;
	}

	try {
		const historyDir = path.join(projectRoot, PERFORMANCE_HISTORY_DIR);
		const samplesPath = path.join(historyDir, PERFORMANCE_SAMPLES_FILE);
		const summaryPath = path.join(historyDir, PERFORMANCE_SUMMARY_FILE);
		const samples = enforceSizeLimit(pruneSamples([...readSamples(samplesPath), sample], sample.observed_day), sample.observed_day);
		const samplesFile = createSamplesFile(samples);
		const summaryFile = createSummary(samples, sample.observed_day);

		writeJsonFileInsideWithoutSymlinks(projectRoot, samplesPath, samplesFile);
		writeJsonFileInsideWithoutSymlinks(projectRoot, summaryPath, summaryFile);
	} catch {
		// Performance history is a local optimization hint. A write failure must not affect command execution.
	}
}
