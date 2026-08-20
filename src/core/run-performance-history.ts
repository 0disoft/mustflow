import { createHash } from 'node:crypto';
import { existsSync, readdirSync, rmSync } from 'node:fs';
import path from 'node:path';

import {
	isRunStateMutexBusyError,
	RUN_STATE_MUTEX_SCOPES,
	withRunStateUpdateMutex,
} from './run-state-mutex.js';
import type { RunReceipt, RunReceiptPerformance } from './run-receipt.js';
import {
	ensureInside,
	readUtf8FileInsideWithoutSymlinks,
	writeJsonFileInsideWithoutSymlinks,
} from './safe-filesystem.js';

const PERFORMANCE_HISTORY_SCHEMA_VERSION = '1';
const PERFORMANCE_HISTORY_DIR = path.join('.mustflow', 'state', 'perf');
const PERFORMANCE_SAMPLES_FILE = 'samples.json';
const PERFORMANCE_SUMMARY_FILE = 'summary.json';
const PERFORMANCE_RECORDS_DIRECTORY = 'records';
const PERFORMANCE_RECORD_SCHEMA_VERSION = '1';
const PERFORMANCE_RECORD_KIND = 'run_performance_sample';
const MAX_PERFORMANCE_RECORD_BYTES = 128 * 1024;
const MAX_PENDING_RECORDS_PER_COMPACTION = 2_048;
const PERFORMANCE_RECORD_ID_PATTERN = /^[a-f0-9]{64}$/u;
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
	readonly generation?: string;
	readonly record_ids?: readonly string[];
	readonly record_sort_keys?: readonly string[];
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
	readonly generation: string;
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

interface RunPerformanceRecord {
	readonly schema_version: typeof PERFORMANCE_RECORD_SCHEMA_VERSION;
	readonly kind: typeof PERFORMANCE_RECORD_KIND;
	readonly record_id: string;
	readonly recorded_at: string;
	readonly receipt_path: string;
	readonly sample: RunPerformanceSample;
}

interface StoredPerformanceSample {
	readonly recordId: string;
	readonly sortKey: string;
	readonly sample: RunPerformanceSample;
	readonly pendingPath: string | null;
}

export interface RunPerformanceCompactionOptions {
	readonly waitMs?: number;
	readonly skipWhenBusy?: boolean;
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

function sha256Hex(parts: readonly string[]): string {
	const hash = createHash('sha256');
	for (const part of parts) {
		hash.update(part);
		hash.update('\0');
	}
	return hash.digest('hex');
}

function isPerformanceRecordId(value: unknown): value is string {
	return typeof value === 'string' && PERFORMANCE_RECORD_ID_PATTERN.test(value);
}

function legacyRecordId(sample: RunPerformanceSample, index: number): string {
	return sha256Hex(['legacy', String(index), JSON.stringify(sample)]);
}

function legacySortKey(sample: RunPerformanceSample, index: number): string {
	return `${sample.observed_day}T23:59:59.999Z:legacy:${String(index).padStart(6, '0')}`;
}

function readStoredSamples(projectRoot: string, samplesPath: string): readonly StoredPerformanceSample[] {
	if (!existsSync(samplesPath)) {
		return [];
	}

	try {
		const parsed = JSON.parse(
			readUtf8FileInsideWithoutSymlinks(projectRoot, samplesPath, {
				maxBytes: MAX_TOTAL_BYTES * 2,
			}),
		) as Partial<RunPerformanceSamplesFile>;
		const samples = Array.isArray(parsed.samples) ? parsed.samples.filter(isRunPerformanceSample) : [];
		const recordIds = Array.isArray(parsed.record_ids) &&
			parsed.record_ids.length === samples.length &&
			parsed.record_ids.every(isPerformanceRecordId) &&
			new Set(parsed.record_ids).size === parsed.record_ids.length
			? parsed.record_ids
			: null;
		const sortKeys = Array.isArray(parsed.record_sort_keys) &&
			parsed.record_sort_keys.length === samples.length &&
			parsed.record_sort_keys.every((value) => typeof value === 'string')
			? parsed.record_sort_keys
			: null;

		return samples.map((sample, index) => ({
			recordId: recordIds?.[index] ?? legacyRecordId(sample, index),
			sortKey: sortKeys?.[index] ?? legacySortKey(sample, index),
			sample,
			pendingPath: null,
		}));
	} catch {
		return [];
	}
}

function recordsDirectory(projectRoot: string): string {
	return path.join(projectRoot, PERFORMANCE_HISTORY_DIR, PERFORMANCE_RECORDS_DIRECTORY);
}

function performanceRecordPath(projectRoot: string, recordId: string): string {
	return path.join(recordsDirectory(projectRoot), `${recordId}.json`);
}

function createPerformanceRecord(receipt: RunReceipt, sample: RunPerformanceSample): RunPerformanceRecord {
	const recordId = sha256Hex([
		receipt.receipt_path,
		receipt.finished_at,
		receipt.correlation_id,
		JSON.stringify(sample),
	]);
	return {
		schema_version: PERFORMANCE_RECORD_SCHEMA_VERSION,
		kind: PERFORMANCE_RECORD_KIND,
		record_id: recordId,
		recorded_at: receipt.finished_at,
		receipt_path: receipt.receipt_path,
		sample,
	};
}

function parsePerformanceRecord(
	projectRoot: string,
	recordPath: string,
	expectedRecordId: string,
): RunPerformanceRecord | null {
	try {
		const parsed = JSON.parse(
			readUtf8FileInsideWithoutSymlinks(projectRoot, recordPath, {
				maxBytes: MAX_PERFORMANCE_RECORD_BYTES,
			}),
		) as Partial<RunPerformanceRecord>;
		if (
			parsed.schema_version !== PERFORMANCE_RECORD_SCHEMA_VERSION ||
			parsed.kind !== PERFORMANCE_RECORD_KIND ||
			parsed.record_id !== expectedRecordId ||
			typeof parsed.recorded_at !== 'string' ||
			typeof parsed.receipt_path !== 'string' ||
			!isRunPerformanceSample(parsed.sample)
		) {
			return null;
		}

		return parsed as RunPerformanceRecord;
	} catch {
		return null;
	}
}

function appendPerformanceRecord(projectRoot: string, receipt: RunReceipt, sample: RunPerformanceSample): void {
	const record = createPerformanceRecord(receipt, sample);
	const recordPath = performanceRecordPath(projectRoot, record.record_id);
	if (existsSync(recordPath) && parsePerformanceRecord(projectRoot, recordPath, record.record_id)) {
		return;
	}

	writeJsonFileInsideWithoutSymlinks(projectRoot, recordPath, record);
}

function readPendingRecords(projectRoot: string): readonly StoredPerformanceSample[] {
	const directory = recordsDirectory(projectRoot);
	if (!existsSync(directory)) {
		return [];
	}

	return readdirSync(directory, { withFileTypes: true })
		.filter((entry) => entry.isFile() && entry.name.endsWith('.json'))
		.map((entry) => entry.name)
		.sort()
		.slice(0, MAX_PENDING_RECORDS_PER_COMPACTION)
		.flatMap((name) => {
			const recordId = name.slice(0, -'.json'.length);
			if (!isPerformanceRecordId(recordId)) {
				return [];
			}

			const recordPath = path.join(directory, name);
			const record = parsePerformanceRecord(projectRoot, recordPath, recordId);
			return record
				? [{
						recordId,
						sortKey: `${record.recorded_at}:${recordId}`,
						sample: record.sample,
						pendingPath: recordPath,
					}]
				: [];
		});
}

function mergeStoredSamples(
	stored: readonly StoredPerformanceSample[],
	pending: readonly StoredPerformanceSample[],
): readonly StoredPerformanceSample[] {
	const byId = new Map<string, StoredPerformanceSample>();
	for (const entry of stored) {
		byId.set(entry.recordId, entry);
	}
	for (const entry of pending) {
		byId.set(entry.recordId, entry);
	}

	return [...byId.values()].sort(
		(left, right) => left.sortKey.localeCompare(right.sortKey) || left.recordId.localeCompare(right.recordId),
	);
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

function createSummary(
	samples: readonly RunPerformanceSample[],
	generatedDay: string,
	generation: string,
): RunPerformanceSummaryFile {
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
		generation,
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

function generationFor(entries: readonly StoredPerformanceSample[]): string {
	return `sha256:${sha256Hex(entries.map((entry) => entry.recordId))}`;
}

function createSamplesFile(
	entries: readonly StoredPerformanceSample[],
	generation: string,
): RunPerformanceSamplesFile {
	return {
		schema_version: PERFORMANCE_HISTORY_SCHEMA_VERSION,
		generation,
		record_ids: entries.map((entry) => entry.recordId),
		record_sort_keys: entries.map((entry) => entry.sortKey),
		retention: getRetention(),
		samples: entries.map((entry) => entry.sample),
	};
}

function serialize(value: unknown): string {
	return `${JSON.stringify(value, null, 2)}\n`;
}

function serializedHistorySize(entries: readonly StoredPerformanceSample[], today: string): number {
	const generation = generationFor(entries);
	const samples = entries.map((entry) => entry.sample);
	return (
		Buffer.byteLength(serialize(createSamplesFile(entries, generation)), 'utf8') +
		Buffer.byteLength(serialize(createSummary(samples, today, generation)), 'utf8')
	);
}

function enforceSizeLimit(
	entries: readonly StoredPerformanceSample[],
	today: string,
): readonly StoredPerformanceSample[] {
	const currentSize = serializedHistorySize(entries, today);
	if (currentSize <= MAX_TOTAL_BYTES) {
		return entries;
	}

	const averageBytesPerSample = Math.max(1, currentSize / Math.max(1, entries.length));
	const estimatedDropCount = Math.floor((currentSize - MAX_TOTAL_BYTES) / averageBytesPerSample);
	let low = 1;
	let high = entries.length;
	let firstFittingIndex = entries.length;
	const probeIndex = Math.max(1, Math.min(entries.length, estimatedDropCount));

	if (probeIndex > 1) {
		if (serializedHistorySize(entries.slice(probeIndex), today) <= MAX_TOTAL_BYTES) {
			firstFittingIndex = probeIndex;
			high = probeIndex - 1;
		} else {
			low = probeIndex + 1;
		}
	}

	while (low <= high) {
		const middle = Math.floor((low + high) / 2);
		const candidate = entries.slice(middle);

		if (serializedHistorySize(candidate, today) <= MAX_TOTAL_BYTES) {
			firstFittingIndex = middle;
			high = middle - 1;
			continue;
		}

		low = middle + 1;
	}

	return entries.slice(firstFittingIndex);
}

function pruneStoredSamples(
	entries: readonly StoredPerformanceSample[],
	today: string,
): readonly StoredPerformanceSample[] {
	const samples = entries.map((entry) => entry.sample);
	const retainedSamples = new Set(pruneSamples(samples, today));
	return entries.filter((entry) => retainedSamples.has(entry.sample));
}

function latestObservedDay(entries: readonly StoredPerformanceSample[]): string {
	return entries.reduce(
		(latest, entry) => entry.sample.observed_day > latest ? entry.sample.observed_day : latest,
		'1970-01-01',
	);
}

function removeCompactedRecords(projectRoot: string, pending: readonly StoredPerformanceSample[]): void {
	const directory = recordsDirectory(projectRoot);
	for (const entry of pending) {
		if (!entry.pendingPath) {
			continue;
		}

		ensureInside(directory, entry.pendingPath);
		rmSync(entry.pendingPath, { force: true });
	}
}

function compactPerformanceHistory(projectRoot: string): void {
	const historyDir = path.join(projectRoot, PERFORMANCE_HISTORY_DIR);
	const samplesPath = path.join(historyDir, PERFORMANCE_SAMPLES_FILE);
	const summaryPath = path.join(historyDir, PERFORMANCE_SUMMARY_FILE);
	const stored = readStoredSamples(projectRoot, samplesPath);
	const pending = readPendingRecords(projectRoot);
	const merged = mergeStoredSamples(stored, pending);
	if (merged.length === 0) {
		return;
	}

	const today = latestObservedDay(merged);
	const pruned = pruneStoredSamples(merged, today);
	const retained = enforceSizeLimit(pruned, today);
	const generation = generationFor(retained);
	const samples = retained.map((entry) => entry.sample);

	// Publish the matching summary first. A reader that understands generations can reject
	// a transient mismatch while legacy readers keep their existing files and shape.
	writeJsonFileInsideWithoutSymlinks(
		projectRoot,
		summaryPath,
		createSummary(samples, today, generation),
	);
	writeJsonFileInsideWithoutSymlinks(
		projectRoot,
		samplesPath,
		createSamplesFile(retained, generation),
	);
	removeCompactedRecords(projectRoot, pending);
}

export function compactRunPerformanceHistory(
	projectRoot: string,
	options: RunPerformanceCompactionOptions = {},
): boolean {
	try {
		withRunStateUpdateMutex(
			projectRoot,
			RUN_STATE_MUTEX_SCOPES.compaction,
			() => compactPerformanceHistory(projectRoot),
			{ waitMs: options.waitMs },
		);
		return true;
	} catch (error) {
		if (options.skipWhenBusy && isRunStateMutexBusyError(error, RUN_STATE_MUTEX_SCOPES.compaction)) {
			return false;
		}

		throw error;
	}
}

export function recordRunPerformanceHistory(projectRoot: string, receipt: RunReceipt): void {
	const sample = createSample(receipt);

	if (!sample) {
		return;
	}

	try {
		appendPerformanceRecord(projectRoot, receipt, sample);
		compactRunPerformanceHistory(projectRoot, {
			waitMs: 0,
			skipWhenBusy: true,
		});
	} catch {
		// Performance records are local optimization hints. A write or compaction failure
		// must not affect command execution.
	}
}
