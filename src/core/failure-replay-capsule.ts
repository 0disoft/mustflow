import { createHash } from 'node:crypto';
import { existsSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';

import type { ChangeVerificationReport } from './change-verification.js';
import type { VerificationFailureFingerprint } from './repeated-failure.js';

export interface FailureReplayFileFingerprint {
	readonly path: string;
	readonly status: 'present' | 'missing' | 'unreadable' | 'outside_root';
	readonly sha256: string | null;
	readonly bytes: number | null;
}

export interface FailureReplayResult {
	readonly intent: string;
	readonly status: string;
	readonly exit_code: number | null;
	readonly exit_code_class: string | null;
	readonly error_kind: string | null;
	readonly timed_out: boolean;
	readonly receipt_path: string | null;
	readonly receipt_sha256: string | null;
	readonly command_fingerprint: string | null;
	readonly contract_fingerprint: string | null;
	readonly stdout_tail_hash: string | null;
	readonly stderr_tail_hash: string | null;
	readonly output_truncated: boolean;
	readonly replay_command: string;
}

export interface FailureReplayEnvironment {
	readonly platform_family: string | null;
	readonly arch_family: string | null;
	readonly runtimes: readonly string[];
	readonly env_policies: readonly string[];
	readonly env_allowlist: readonly string[];
	readonly timeout_seconds: readonly number[];
}

export interface FailureReplayPrivacy {
	readonly raw_output_included: false;
	readonly env_values_included: false;
	readonly receipt_paths_only: true;
	readonly redacted: boolean;
	readonly redaction_count: number;
	readonly redaction_kinds: readonly string[];
	readonly redaction_fields: readonly string[];
}

export interface FailureReplayCapsule {
	readonly schema_version: '1';
	readonly source: 'mf_verify_failure';
	readonly authority: 'replay_supporting_evidence';
	readonly created_at: string;
	readonly verification_plan_id: string;
	readonly failure_fingerprint: string | null;
	readonly reasons: readonly string[];
	readonly status: string;
	readonly replay_commands: readonly string[];
	readonly failed_results: readonly FailureReplayResult[];
	readonly affected_files: readonly FailureReplayFileFingerprint[];
	readonly affected_surfaces: readonly string[];
	readonly risk_codes: readonly string[];
	readonly environment: FailureReplayEnvironment;
	readonly privacy: FailureReplayPrivacy;
	readonly hashes: {
		readonly capsule_fingerprint: string;
		readonly changed_files_hash: string;
		readonly failed_results_hash: string;
		readonly command_fingerprints_hash: string;
		readonly output_tails_hash: string;
	};
}

export interface FailureReplayResultInput {
	readonly intent: string | null;
	readonly status: string;
	readonly skipped: boolean;
	readonly reason: string | null;
	readonly detail: string | null;
	readonly exit_code: number | null;
	readonly receipt_path: string | null;
	readonly receipt_sha256: string | null;
	readonly receipt: Record<string, unknown> | null;
}

export interface CreateFailureReplayCapsuleInput {
	readonly projectRoot: string;
	readonly verificationPlanId: string;
	readonly status: string;
	readonly reasons: readonly string[];
	readonly report: ChangeVerificationReport;
	readonly results: readonly FailureReplayResultInput[];
	readonly failureFingerprint: VerificationFailureFingerprint | null;
	readonly createdAt?: Date;
}

function stableJson(value: unknown): string {
	if (Array.isArray(value)) {
		return `[${value.map((entry) => stableJson(entry)).join(',')}]`;
	}

	if (value && typeof value === 'object') {
		const entries = Object.entries(value).sort(([left], [right]) => left.localeCompare(right));
		return `{${entries.map(([key, entry]) => `${JSON.stringify(key)}:${stableJson(entry)}`).join(',')}}`;
	}

	return JSON.stringify(value);
}

function sha256(value: string | Buffer): string {
	return `sha256:${createHash('sha256').update(value).digest('hex')}`;
}

function sha256Json(value: unknown): string {
	return sha256(stableJson(value));
}

function uniqueSorted(values: Iterable<string | null | undefined>): string[] {
	return [...new Set([...values].filter((value): value is string => typeof value === 'string' && value.length > 0))].sort(
		(left, right) => left.localeCompare(right),
	);
}

function numberArray(values: Iterable<number | null | undefined>): readonly number[] {
	return [...new Set([...values].filter((value): value is number => typeof value === 'number' && Number.isFinite(value)))]
		.sort((left, right) => left - right);
}

function objectField(value: unknown): Record<string, unknown> | null {
	return value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : null;
}

function stringField(record: Record<string, unknown> | null | undefined, key: string): string | null {
	const value = record?.[key];
	return typeof value === 'string' && value.length > 0 ? value : null;
}

function numberField(record: Record<string, unknown> | null | undefined, key: string): number | null {
	const value = record?.[key];
	return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function booleanField(record: Record<string, unknown> | null | undefined, key: string): boolean {
	return record?.[key] === true;
}

function stringArrayField(record: Record<string, unknown> | null | undefined, key: string): readonly string[] {
	const value = record?.[key];
	return Array.isArray(value) ? value.filter((entry): entry is string => typeof entry === 'string' && entry.length > 0) : [];
}

function hashTail(output: Record<string, unknown> | null): string | null {
	const tail = stringField(output, 'tail');
	return tail === null ? null : sha256(tail);
}

function isFailedResult(result: FailureReplayResultInput): boolean {
	return (
		!result.skipped &&
		result.intent !== null &&
		(result.status === 'failed' ||
			result.status === 'timed_out' ||
			result.status === 'start_failed' ||
			result.status === 'output_limit_exceeded')
	);
}

function createFailedResult(result: FailureReplayResultInput): FailureReplayResult {
	const receipt = result.receipt;
	const performance = objectField(receipt?.performance);
	const resultSummary = objectField(performance?.result_summary);
	const stdout = objectField(receipt?.stdout);
	const stderr = objectField(receipt?.stderr);
	const stdoutTruncated = booleanField(stdout, 'truncated');
	const stderrTruncated = booleanField(stderr, 'truncated');
	const intent = result.intent as string;

	return {
		intent,
		status: result.status,
		exit_code: result.exit_code,
		exit_code_class: stringField(resultSummary, 'exit_code_class'),
		error_kind: stringField(resultSummary, 'error_kind'),
		timed_out: result.status === 'timed_out' || booleanField(resultSummary, 'timed_out'),
		receipt_path: result.receipt_path,
		receipt_sha256: result.receipt_sha256,
		command_fingerprint: stringField(performance, 'command_fingerprint'),
		contract_fingerprint: stringField(performance, 'contract_fingerprint'),
		stdout_tail_hash: hashTail(stdout),
		stderr_tail_hash: hashTail(stderr),
		output_truncated: stdoutTruncated || stderrTruncated,
		replay_command: `mf run ${intent}`,
	};
}

function fileFingerprint(projectRoot: string, relativePath: string): FailureReplayFileFingerprint {
	const normalized = relativePath.split(path.sep).join('/');
	const absolute = path.resolve(projectRoot, ...normalized.split('/'));
	const relativeToRoot = path.relative(projectRoot, absolute);

	if (relativeToRoot.startsWith('..') || path.isAbsolute(relativeToRoot)) {
		return {
			path: normalized,
			status: 'outside_root',
			sha256: null,
			bytes: null,
		};
	}

	if (!existsSync(absolute)) {
		return {
			path: normalized,
			status: 'missing',
			sha256: null,
			bytes: null,
		};
	}

	try {
		const stats = statSync(absolute);
		if (!stats.isFile()) {
			return {
				path: normalized,
				status: 'unreadable',
				sha256: null,
				bytes: null,
			};
		}

		const content = readFileSync(absolute);
		return {
			path: normalized,
			status: 'present',
			sha256: sha256(content),
			bytes: content.byteLength,
		};
	} catch {
		return {
			path: normalized,
			status: 'unreadable',
			sha256: null,
			bytes: null,
		};
	}
}

function changedFileFingerprints(
	projectRoot: string,
	report: ChangeVerificationReport,
): readonly FailureReplayFileFingerprint[] {
	return uniqueSorted(report.files)
		.map((filePath) => fileFingerprint(projectRoot, filePath))
		.sort((left, right) => left.path.localeCompare(right.path));
}

function redactionSummary(results: readonly FailureReplayResultInput[]): FailureReplayPrivacy {
	const redactionRecords = results
		.map((result) => objectField(result.receipt?.redaction))
		.filter((record): record is Record<string, unknown> => record !== null);
	const redactionCount = redactionRecords.reduce((sum, record) => sum + (numberField(record, 'redaction_count') ?? 0), 0);

	return {
		raw_output_included: false,
		env_values_included: false,
		receipt_paths_only: true,
		redacted: redactionRecords.some((record) => booleanField(record, 'redacted')),
		redaction_count: redactionCount,
		redaction_kinds: uniqueSorted(redactionRecords.flatMap((record) => stringArrayField(record, 'redaction_kinds'))),
		redaction_fields: uniqueSorted(redactionRecords.flatMap((record) => stringArrayField(record, 'fields'))),
	};
}

function environmentSummary(results: readonly FailureReplayResultInput[]): FailureReplayEnvironment {
	const receipts = results.map((result) => result.receipt).filter((receipt): receipt is Record<string, unknown> => receipt !== null);
	const runners = receipts
		.map((receipt) => objectField(objectField(receipt.performance)?.runner))
		.filter((runner): runner is Record<string, unknown> => runner !== null);

	return {
		platform_family: uniqueSorted(runners.map((runner) => stringField(runner, 'platform_family')))[0] ?? null,
		arch_family: uniqueSorted(runners.map((runner) => stringField(runner, 'arch_family')))[0] ?? null,
		runtimes: uniqueSorted(
			runners.map((runner) => {
				const runtime = stringField(runner, 'runtime');
				const major = numberField(runner, 'runtime_major');
				return runtime === null ? null : `${runtime}${major === null ? '' : `@${major}`}`;
			}),
		),
		env_policies: uniqueSorted(receipts.map((receipt) => stringField(receipt, 'env_policy'))),
		env_allowlist: uniqueSorted(receipts.flatMap((receipt) => stringArrayField(receipt, 'env_allowlist'))),
		timeout_seconds: numberArray(receipts.map((receipt) => numberField(receipt, 'timeout_seconds'))),
	};
}

function riskCodes(report: ChangeVerificationReport): readonly string[] {
	return uniqueSorted([
		...report.risk_assessment.reasons,
		...report.risk_assessment.blocking_gaps,
		...report.gaps.map((gap) => gap.reason),
	]);
}

export function createFailureReplayCapsule(input: CreateFailureReplayCapsuleInput): FailureReplayCapsule | null {
	const failedResults = input.results.filter(isFailedResult).map(createFailedResult);

	if (failedResults.length === 0) {
		return null;
	}

	const affectedFiles = changedFileFingerprints(input.projectRoot, input.report);
	const affectedSurfaces = uniqueSorted(input.report.requirements.flatMap((requirement) => requirement.surfaces));
	const replayCommands = uniqueSorted([
		...failedResults.map((result) => result.replay_command),
		`mf verify --reason ${input.reasons[0] ?? 'unknown'} --json`,
	]);
	const base = {
		schema_version: '1' as const,
		source: 'mf_verify_failure' as const,
		authority: 'replay_supporting_evidence' as const,
		created_at: (input.createdAt ?? new Date()).toISOString(),
		verification_plan_id: input.verificationPlanId,
		failure_fingerprint: input.failureFingerprint?.fingerprint ?? null,
		reasons: uniqueSorted(input.reasons),
		status: input.status,
		replay_commands: replayCommands,
		failed_results: failedResults,
		affected_files: affectedFiles,
		affected_surfaces: affectedSurfaces,
		risk_codes: riskCodes(input.report),
		environment: environmentSummary(input.results),
		privacy: redactionSummary(input.results),
	};

	return {
		...base,
		hashes: {
			capsule_fingerprint: sha256Json(base),
			changed_files_hash: sha256Json(affectedFiles),
			failed_results_hash: sha256Json(failedResults),
			command_fingerprints_hash: sha256Json(failedResults.map((result) => result.command_fingerprint)),
			output_tails_hash: sha256Json(failedResults.flatMap((result) => [result.stdout_tail_hash, result.stderr_tail_hash])),
		},
	};
}
