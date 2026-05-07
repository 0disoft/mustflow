import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';

import { toPosixPath } from './filesystem.js';

const RUN_RECEIPT_SCHEMA_VERSION = '1';
const RUN_RECEIPT_TAIL_BYTES = 64 * 1024;
const RUN_RECEIPT_DIR = path.join('.mustflow', 'state', 'runs');
const LATEST_RUN_RECEIPT = 'latest.json';

export type RunReceiptStatus = 'passed' | 'failed' | 'timed_out' | 'start_failed';
export type RunCommandMode = 'argv' | 'shell';

export interface RunOutputReceipt {
	readonly bytes: number;
	readonly truncated: boolean;
	readonly tail: string;
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
	readonly timeout_seconds: number;
	readonly max_output_bytes: number;
	readonly success_exit_codes: readonly number[];
	readonly exit_code: number | null;
	readonly signal: string | null;
	readonly error: string | null;
	readonly kill_method: string | null;
	readonly stdout: RunOutputReceipt;
	readonly stderr: RunOutputReceipt;
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
	readonly timeoutSeconds: number;
	readonly maxOutputBytes: number;
	readonly successExitCodes: readonly number[];
	readonly exitCode: number | null;
	readonly signal: string | null;
	readonly error: string | null;
	readonly killMethod: string | null;
	readonly stdout: string | Buffer | null;
	readonly stderr: string | Buffer | null;
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

function summarizeOutput(output: string | Buffer | null, maxOutputBytes: number): RunOutputReceipt {
	if (!output) {
		return {
			bytes: 0,
			truncated: false,
			tail: '',
		};
	}

	const text = output.toString();
	const bytes = Buffer.byteLength(text, 'utf8');
	const tailLimit = Math.min(RUN_RECEIPT_TAIL_BYTES, maxOutputBytes);
	const tail = truncateTextByBytes(text, tailLimit);

	return {
		bytes,
		truncated: tail.truncated,
		tail: tail.text,
	};
}

function getReceiptRelativePath(): string {
	return toPosixPath(path.join(RUN_RECEIPT_DIR, LATEST_RUN_RECEIPT));
}

export function createRunReceipt(input: CreateRunReceiptInput): RunReceipt {
	const relativeCwd = path.relative(input.projectRoot, input.cwd);

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
		argv: input.argv,
		cmd: input.cmd,
		timeout_seconds: input.timeoutSeconds,
		max_output_bytes: input.maxOutputBytes,
		success_exit_codes: input.successExitCodes,
		exit_code: input.exitCode,
		signal: input.signal,
		error: input.error,
		kill_method: input.killMethod,
		stdout: summarizeOutput(input.stdout, input.maxOutputBytes),
		stderr: summarizeOutput(input.stderr, input.maxOutputBytes),
		receipt_path: getReceiptRelativePath(),
	};
}

export function writeRunReceipt(projectRoot: string, receipt: RunReceipt): void {
	const receiptDir = path.join(projectRoot, RUN_RECEIPT_DIR);
	const latestPath = path.join(receiptDir, LATEST_RUN_RECEIPT);

	mkdirSync(receiptDir, { recursive: true });
	writeFileSync(latestPath, `${JSON.stringify(receipt, null, 2)}\n`);
}
