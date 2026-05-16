import { mkdirSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import path from 'node:path';

import type { CommandEnvPolicy } from './command-env.js';
import type { BoundedOutputSnapshot } from './bounded-output.js';
import { DEFAULT_RUN_RECEIPT_TAIL_BYTES } from './retention-policy.js';
import type { RunWriteDriftReceipt } from './run-write-drift.js';
import { redactSecretLikeText } from './secret-redaction.js';

const RUN_RECEIPT_SCHEMA_VERSION = '1';
const RUN_RECEIPT_DIR = path.join('.mustflow', 'state', 'runs');
const LATEST_RUN_RECEIPT = 'latest.json';

export type RunReceiptStatus = 'passed' | 'failed' | 'timed_out' | 'start_failed';
export type RunCommandMode = 'argv' | 'shell';

export interface RunOutputReceipt {
	readonly bytes: number;
	readonly truncated: boolean;
	readonly tail: string;
	readonly redacted: boolean;
	readonly redaction_count: number;
	readonly redaction_kinds: readonly string[];
}

export interface RunReceiptRedaction {
	readonly redacted: boolean;
	readonly redaction_count: number;
	readonly redaction_kinds: readonly string[];
	readonly fields: readonly string[];
}

export interface RunReceiptPerformance {
	readonly schema_version: string;
	readonly measurement: 'wall_clock';
	readonly duration_ms: number;
	readonly executor_overhead_ms?: number;
	readonly phases?: readonly RunReceiptPerformancePhase[];
	readonly selection?: RunReceiptPerformanceSelection;
	readonly timeout_ratio: number;
	readonly command_fingerprint: string;
	readonly intent_fingerprint: string;
	readonly contract_fingerprint: string;
	readonly runner: {
		readonly kind: 'local';
		readonly platform_family: string;
		readonly arch_family: string;
		readonly runtime: 'node' | 'bun';
		readonly runtime_major: number;
	};
	readonly output_summary: {
		readonly stdout_bytes: number;
		readonly stderr_bytes: number;
		readonly stdout_truncated: boolean;
		readonly stderr_truncated: boolean;
	};
	readonly result_summary: {
		readonly status: RunReceiptStatus;
		readonly exit_code_class: 'success' | 'failure' | 'no_exit_code';
		readonly timed_out: boolean;
		readonly error_kind: 'timeout' | 'start_failed' | 'exit_code' | null;
	};
	readonly quality: {
		readonly phase_timings_source: 'none' | 'structured_report';
		readonly target_timings_source: 'none';
		readonly usable_for_history: boolean;
	};
}

export interface RunReceiptPerformancePhase {
	readonly name: string;
	readonly duration_ms: number;
}

export interface RunReceiptPerformanceSelection {
	readonly strategy: string;
	readonly changed_file_count: number;
	readonly changed_surface_counts: Record<string, number>;
	readonly selected_target_count: number;
	readonly fallback_used: boolean;
}

export interface RunReceipt {
	readonly schema_version: string;
	readonly command: 'run';
	readonly intent: string;
	readonly status: RunReceiptStatus;
	readonly timed_out: boolean;
	readonly started_at: string;
	readonly finished_at: string;
	readonly duration_ms: number;
	readonly cwd: string;
	readonly lifecycle: string;
	readonly run_policy: string;
	readonly mode: RunCommandMode;
	readonly argv?: readonly string[];
	readonly cmd?: string;
	readonly env_policy: CommandEnvPolicy;
	readonly env_allowlist: readonly string[];
	readonly timeout_seconds: number;
	readonly max_output_bytes: number;
	readonly success_exit_codes: readonly number[];
	readonly exit_code: number | null;
	readonly signal: string | null;
	readonly error: string | null;
	readonly kill_method: string | null;
	readonly stdout: RunOutputReceipt;
	readonly stderr: RunOutputReceipt;
	readonly write_drift: RunWriteDriftReceipt;
	readonly performance: RunReceiptPerformance;
	readonly redaction: RunReceiptRedaction;
	readonly receipt_path: string;
}

export interface CreateRunReceiptInput {
	readonly intent: string;
	readonly status: RunReceiptStatus;
	readonly timedOut: boolean;
	readonly startedAt: Date;
	readonly finishedAt: Date;
	readonly projectRoot: string;
	readonly cwd: string;
	readonly lifecycle: string;
	readonly runPolicy: string;
	readonly mode: RunCommandMode;
	readonly argv?: readonly string[];
	readonly cmd?: string;
	readonly envPolicy: CommandEnvPolicy;
	readonly envAllowlist: readonly string[];
	readonly timeoutSeconds: number;
	readonly maxOutputBytes: number;
	readonly successExitCodes: readonly number[];
	readonly exitCode: number | null;
	readonly signal: string | null;
	readonly error: string | null;
	readonly killMethod: string | null;
	readonly stdout: string | Buffer | BoundedOutputSnapshot | null;
	readonly stderr: string | Buffer | BoundedOutputSnapshot | null;
	readonly writeDrift: RunWriteDriftReceipt;
	readonly executorOverheadMs?: number;
	readonly phaseTimings?: readonly RunReceiptPerformancePhase[];
	readonly selectionSummary?: RunReceiptPerformanceSelection;
	readonly stdoutTailBytes?: number;
	readonly stderrTailBytes?: number;
}

function toPosixPath(value: string): string {
	return value.split(path.sep).join('/');
}

function truncateTextByBytes(text: string, maxBytes: number): { text: string; truncated: boolean } {
	const buffer = Buffer.from(text, 'utf8');

	if (buffer.byteLength <= maxBytes) {
		return { text, truncated: false };
	}

	return {
		text: buffer.subarray(buffer.byteLength - maxBytes).toString('utf8'),
		truncated: true,
	};
}

interface RedactionState {
	readonly fields: Set<string>;
	readonly kinds: Set<string>;
	count: number;
}

function recordRedaction(state: RedactionState, field: string, result: { readonly redacted: boolean; readonly redactionCount: number; readonly redactionKinds: readonly string[] }): void {
	if (!result.redacted) {
		return;
	}

	state.fields.add(field);
	state.count += result.redactionCount;
	for (const kind of result.redactionKinds) {
		state.kinds.add(kind);
	}
}

function redactReceiptString(value: string, field: string, state: RedactionState): string {
	const redaction = redactSecretLikeText(value);
	recordRedaction(state, field, redaction);
	return redaction.text;
}

function summarizeOutput(
	output: string | Buffer | BoundedOutputSnapshot | null,
	maxOutputBytes: number,
	tailBytes: number,
	field: 'stdout' | 'stderr',
	state: RedactionState,
): RunOutputReceipt {
	if (!output) {
		return {
			bytes: 0,
			truncated: false,
			tail: '',
			redacted: false,
			redaction_count: 0,
			redaction_kinds: [],
		};
	}

	const tailLimit = Math.min(tailBytes, maxOutputBytes);
	const text = typeof output === 'object' && 'tail' in output && 'bytes' in output ? output.tail : output.toString();
	const bytes =
		typeof output === 'object' && 'tail' in output && 'bytes' in output
			? output.bytes
			: Buffer.byteLength(text, 'utf8');
	const tail = truncateTextByBytes(text, tailLimit);
	const redaction = redactSecretLikeText(tail.text);
	recordRedaction(state, `${field}.tail`, redaction);

	return {
		bytes,
		truncated: tail.truncated || bytes > Buffer.byteLength(tail.text, 'utf8'),
		tail: redaction.text,
		redacted: redaction.redacted,
		redaction_count: redaction.redactionCount,
		redaction_kinds: redaction.redactionKinds,
	};
}

function getReceiptRelativePath(): string {
	return toPosixPath(path.join(RUN_RECEIPT_DIR, LATEST_RUN_RECEIPT));
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

function fingerprint(value: unknown): string {
	return `sha256:${createHash('sha256').update(stableJson(value)).digest('hex')}`;
}

function getRuntimeMajor(): number {
	const version = getBunRuntimeVersion() ?? process.versions.node;
	const major = Number.parseInt(version.split('.')[0] ?? '', 10);
	return Number.isFinite(major) ? major : 0;
}

function getBunRuntimeVersion(): string | undefined {
	const versions = process.versions as typeof process.versions & { readonly bun?: string };
	return versions.bun;
}

function getExitCodeClass(status: RunReceiptStatus, exitCode: number | null): 'success' | 'failure' | 'no_exit_code' {
	if (exitCode === null) {
		return 'no_exit_code';
	}

	return status === 'passed' ? 'success' : 'failure';
}

function getErrorKind(
	status: RunReceiptStatus,
	exitCode: number | null,
): 'timeout' | 'start_failed' | 'exit_code' | null {
	if (status === 'timed_out') {
		return 'timeout';
	}

	if (status === 'start_failed') {
		return 'start_failed';
	}

	if (status === 'failed' && exitCode !== null) {
		return 'exit_code';
	}

	return null;
}

function createPerformanceSummary(input: {
	readonly intent: string;
	readonly status: RunReceiptStatus;
	readonly timedOut: boolean;
	readonly durationMs: number;
	readonly executorOverheadMs?: number;
	readonly mode: RunCommandMode;
	readonly argv?: readonly string[];
	readonly cmd?: string;
	readonly cwd: string;
	readonly lifecycle: string;
	readonly runPolicy: string;
	readonly envPolicy: CommandEnvPolicy;
	readonly envAllowlist: readonly string[];
	readonly timeoutSeconds: number;
	readonly maxOutputBytes: number;
	readonly successExitCodes: readonly number[];
	readonly exitCode: number | null;
	readonly stdout: RunOutputReceipt;
	readonly stderr: RunOutputReceipt;
	readonly phaseTimings?: readonly RunReceiptPerformancePhase[];
	readonly selectionSummary?: RunReceiptPerformanceSelection;
}): RunReceiptPerformance {
	const contractIdentity = {
		cwd: input.cwd,
		env_allowlist: input.envAllowlist,
		env_policy: input.envPolicy,
		lifecycle: input.lifecycle,
		max_output_bytes: input.maxOutputBytes,
		mode: input.mode,
		run_policy: input.runPolicy,
		success_exit_codes: input.successExitCodes,
		timeout_seconds: input.timeoutSeconds,
	};
	const commandIdentity = {
		argv: input.argv ?? null,
		cmd: input.cmd ?? null,
		mode: input.mode,
	};
	const timeoutBudgetMs = input.timeoutSeconds * 1000;
	const timeoutRatio = timeoutBudgetMs > 0 ? input.durationMs / timeoutBudgetMs : 0;
	const phaseTimings = sanitizePhaseTimings(input.phaseTimings ?? []);
	const selection = sanitizeSelectionSummary(input.selectionSummary);

	return {
		schema_version: '1',
		measurement: 'wall_clock',
		duration_ms: input.durationMs,
		...(typeof input.executorOverheadMs === 'number' ? { executor_overhead_ms: input.executorOverheadMs } : {}),
		...(phaseTimings.length > 0 ? { phases: phaseTimings } : {}),
		...(selection ? { selection } : {}),
		timeout_ratio: Number(timeoutRatio.toFixed(6)),
		command_fingerprint: fingerprint(commandIdentity),
		intent_fingerprint: fingerprint({ intent: input.intent, ...contractIdentity }),
		contract_fingerprint: fingerprint(contractIdentity),
		runner: {
			kind: 'local',
			platform_family: process.platform,
			arch_family: process.arch,
			runtime: getBunRuntimeVersion() ? 'bun' : 'node',
			runtime_major: getRuntimeMajor(),
		},
		output_summary: {
			stdout_bytes: input.stdout.bytes,
			stderr_bytes: input.stderr.bytes,
			stdout_truncated: input.stdout.truncated,
			stderr_truncated: input.stderr.truncated,
		},
		result_summary: {
			status: input.status,
			exit_code_class: getExitCodeClass(input.status, input.exitCode),
			timed_out: input.timedOut,
			error_kind: getErrorKind(input.status, input.exitCode),
		},
		quality: {
			phase_timings_source: phaseTimings.length > 0 ? 'structured_report' : 'none',
			target_timings_source: 'none',
			usable_for_history: input.status === 'passed' || input.status === 'failed',
		},
	};
}

function isSafePerformanceKey(value: string): boolean {
	return /^[a-z][a-z0-9_]*$/.test(value);
}

function toNonNegativeInteger(value: number): number | null {
	if (!Number.isFinite(value) || value < 0) {
		return null;
	}

	return Math.trunc(value);
}

function sanitizeSelectionSummary(selection: RunReceiptPerformanceSelection | undefined): RunReceiptPerformanceSelection | undefined {
	if (!selection || !isSafePerformanceKey(selection.strategy) || typeof selection.fallback_used !== 'boolean') {
		return undefined;
	}

	const changedFileCount = toNonNegativeInteger(selection.changed_file_count);
	const selectedTargetCount = toNonNegativeInteger(selection.selected_target_count);

	if (changedFileCount === null || selectedTargetCount === null) {
		return undefined;
	}

	const changedSurfaceCounts: Record<string, number> = {};
	for (const [surface, count] of Object.entries(selection.changed_surface_counts).sort(([left], [right]) => left.localeCompare(right))) {
		const sanitizedCount = toNonNegativeInteger(count);

		if (!isSafePerformanceKey(surface) || sanitizedCount === null) {
			return undefined;
		}

		changedSurfaceCounts[surface] = sanitizedCount;
	}

	return {
		strategy: selection.strategy,
		changed_file_count: changedFileCount,
		changed_surface_counts: changedSurfaceCounts,
		selected_target_count: selectedTargetCount,
		fallback_used: selection.fallback_used,
	};
}

function sanitizePhaseTimings(phases: readonly RunReceiptPerformancePhase[]): readonly RunReceiptPerformancePhase[] {
	return phases
		.filter((phase) => isSafePerformanceKey(phase.name) && Number.isFinite(phase.duration_ms) && phase.duration_ms >= 0)
		.map((phase) => ({
			name: phase.name,
			duration_ms: Math.round(phase.duration_ms * 1000) / 1000,
		}));
}

export function createRunReceipt(input: CreateRunReceiptInput): RunReceipt {
	const relativeCwd = path.relative(input.projectRoot, input.cwd);
	const stdoutTailBytes = input.stdoutTailBytes ?? DEFAULT_RUN_RECEIPT_TAIL_BYTES;
	const stderrTailBytes = input.stderrTailBytes ?? DEFAULT_RUN_RECEIPT_TAIL_BYTES;
	const redactionState: RedactionState = { fields: new Set(), kinds: new Set(), count: 0 };
	const argv = input.argv?.map((value, index) => redactReceiptString(value, `argv.${index}`, redactionState));
	const cmd = input.cmd ? redactReceiptString(input.cmd, 'cmd', redactionState) : undefined;
	const error = input.error ? redactReceiptString(input.error, 'error', redactionState) : null;
	const stdout = summarizeOutput(input.stdout, input.maxOutputBytes, stdoutTailBytes, 'stdout', redactionState);
	const stderr = summarizeOutput(input.stderr, input.maxOutputBytes, stderrTailBytes, 'stderr', redactionState);
	const durationMs = input.finishedAt.getTime() - input.startedAt.getTime();

	return {
		schema_version: RUN_RECEIPT_SCHEMA_VERSION,
		command: 'run',
		intent: input.intent,
		status: input.status,
		timed_out: input.timedOut,
		started_at: input.startedAt.toISOString(),
		finished_at: input.finishedAt.toISOString(),
		duration_ms: durationMs,
		cwd: relativeCwd.length > 0 ? toPosixPath(relativeCwd) : '.',
		lifecycle: input.lifecycle,
		run_policy: input.runPolicy,
		mode: input.mode,
		argv,
		cmd,
		env_policy: input.envPolicy,
		env_allowlist: input.envAllowlist,
		timeout_seconds: input.timeoutSeconds,
		max_output_bytes: input.maxOutputBytes,
		success_exit_codes: input.successExitCodes,
		exit_code: input.exitCode,
		signal: input.signal,
		error,
		kill_method: input.killMethod,
		stdout,
		stderr,
		write_drift: input.writeDrift,
		performance: createPerformanceSummary({
			intent: input.intent,
			status: input.status,
			timedOut: input.timedOut,
			durationMs,
			executorOverheadMs: input.executorOverheadMs,
			mode: input.mode,
			argv,
			cmd,
			cwd: relativeCwd.length > 0 ? toPosixPath(relativeCwd) : '.',
			lifecycle: input.lifecycle,
			runPolicy: input.runPolicy,
			envPolicy: input.envPolicy,
			envAllowlist: input.envAllowlist,
			timeoutSeconds: input.timeoutSeconds,
			maxOutputBytes: input.maxOutputBytes,
			successExitCodes: input.successExitCodes,
			exitCode: input.exitCode,
			stdout,
			stderr,
			phaseTimings: input.phaseTimings,
			selectionSummary: input.selectionSummary,
		}),
		redaction: {
			redacted: redactionState.count > 0,
			redaction_count: redactionState.count,
			redaction_kinds: [...redactionState.kinds].sort(),
			fields: [...redactionState.fields].sort(),
		},
		receipt_path: getReceiptRelativePath(),
	};
}

export function writeRunReceipt(projectRoot: string, receipt: RunReceipt): void {
	const receiptDir = path.join(projectRoot, RUN_RECEIPT_DIR);
	const latestPath = path.join(receiptDir, LATEST_RUN_RECEIPT);

	mkdirSync(receiptDir, { recursive: true });
	writeFileSync(latestPath, `${JSON.stringify(receipt, null, 2)}\n`);
}
