import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';

import type { CommandEnvPolicy } from './command-env.js';
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
	readonly stdout: string | Buffer | null;
	readonly stderr: string | Buffer | null;
	readonly writeDrift: RunWriteDriftReceipt;
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
	output: string | Buffer | null,
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

	const text = output.toString();
	const bytes = Buffer.byteLength(text, 'utf8');
	const tailLimit = Math.min(tailBytes, maxOutputBytes);
	const tail = truncateTextByBytes(text, tailLimit);
	const redaction = redactSecretLikeText(tail.text);
	recordRedaction(state, `${field}.tail`, redaction);

	return {
		bytes,
		truncated: tail.truncated,
		tail: redaction.text,
		redacted: redaction.redacted,
		redaction_count: redaction.redactionCount,
		redaction_kinds: redaction.redactionKinds,
	};
}

function getReceiptRelativePath(): string {
	return toPosixPath(path.join(RUN_RECEIPT_DIR, LATEST_RUN_RECEIPT));
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

	return {
		schema_version: RUN_RECEIPT_SCHEMA_VERSION,
		command: 'run',
		intent: input.intent,
		status: input.status,
		timed_out: input.timedOut,
		started_at: input.startedAt.toISOString(),
		finished_at: input.finishedAt.toISOString(),
		duration_ms: input.finishedAt.getTime() - input.startedAt.getTime(),
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
