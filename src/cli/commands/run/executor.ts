import { spawn } from 'node:child_process';

import { BoundedOutputBuffer, type BoundedOutputSnapshot } from '../../../core/bounded-output.js';
import type { RunReceiptStatus, RunTerminationReceipt } from '../../../core/run-receipt.js';
import type { Reporter } from '../../lib/reporter.js';
import type { ResolvedArgvCommand } from '../../lib/run-plan.js';
import {
	createPendingTimeoutTermination,
	forceTerminateProcessTreeNonBlocking,
	getKillMethod,
	terminateProcessTreeNonBlocking,
} from './process-tree.js';
import { createOutputLimitError, isOutputLimitExceededError, writeStreamChunk } from './output.js';

export interface CommandResult {
	readonly status: number | null;
	readonly signal: string | null;
	readonly error?: Error;
	readonly stdout: string | Buffer | BoundedOutputSnapshot | null;
	readonly stderr: string | Buffer | BoundedOutputSnapshot | null;
	readonly pid?: number;
	readonly termination?: RunTerminationReceipt | null;
}

interface SpawnedCommandInput {
	readonly executable: string;
	readonly args?: readonly string[];
	readonly shell: boolean;
}

function runSpawnedCommandStreaming(
	command: SpawnedCommandInput,
	cwd: string,
	env: NodeJS.ProcessEnv,
	timeoutSeconds: number,
	maxOutputBytes: number,
	stdoutTailBytes: number,
	stderrTailBytes: number,
	reporter: Reporter,
	streamOutput: boolean,
	enforceOutputLimit: boolean,
): Promise<CommandResult> {
	return new Promise((resolve) => {
		const stdout = new BoundedOutputBuffer(stdoutTailBytes);
		const stderr = new BoundedOutputBuffer(stderrTailBytes);
		let settled = false;
		let timedOut = false;
		let childError: Error | undefined;
		let childPid: number | undefined;
		let stdoutBytes = 0;
		let stderrBytes = 0;
		let timeout: NodeJS.Timeout | undefined;
		let termination: RunTerminationReceipt | null = null;

		const child = spawn(command.executable, command.args ?? [], {
			cwd,
			env,
			shell: command.shell,
			stdio: ['ignore', 'pipe', 'pipe'],
			windowsHide: true,
			detached: process.platform !== 'win32',
		});
		childPid = child.pid;

		const finish = (status: number | null, signal: string | null): void => {
			if (settled) {
				return;
			}

			settled = true;

			if (timeout) {
				clearTimeout(timeout);
			}
			resolve({
				status: timedOut ? null : status,
				signal: timedOut ? null : signal,
				error: timedOut ? Object.assign(new Error('Command timed out'), { code: 'ETIMEDOUT' }) : childError,
				stdout: stdout.toSnapshot(),
				stderr: stderr.toSnapshot(),
				pid: childPid,
				termination,
			});
		};

		const stopForOutputLimit = (stream: 'stdout' | 'stderr'): void => {
			if (settled || childError) {
				return;
			}

			childError = createOutputLimitError(stream, maxOutputBytes);
			child.stdout?.destroy();
			child.stderr?.destroy();
			child.unref();
			terminateProcessTreeNonBlocking(childPid);
			forceTerminateProcessTreeNonBlocking(childPid);
			finish(null, null);
		};

		child.stdout?.on('data', (chunk: Buffer) => {
			stdout.append(chunk);
			stdoutBytes += chunk.byteLength;
			if (streamOutput) {
				writeStreamChunk(reporter, 'stdout', chunk);
			}
			if (enforceOutputLimit && stdoutBytes > maxOutputBytes) {
				stopForOutputLimit('stdout');
			}
		});
		child.stderr?.on('data', (chunk: Buffer) => {
			stderr.append(chunk);
			stderrBytes += chunk.byteLength;
			if (streamOutput) {
				writeStreamChunk(reporter, 'stderr', chunk);
			}
			if (enforceOutputLimit && stderrBytes > maxOutputBytes) {
				stopForOutputLimit('stderr');
			}
		});
		child.once('error', (error) => {
			childError = error;
		});
		child.once('close', (status, signal) => {
			finish(status, signal);
		});

		timeout = setTimeout(() => {
			timedOut = true;
			child.stdout?.destroy();
			child.stderr?.destroy();
			child.unref();
			termination = createPendingTimeoutTermination(getKillMethod());
			terminateProcessTreeNonBlocking(childPid);
			forceTerminateProcessTreeNonBlocking(childPid);
			finish(null, null);
		}, timeoutSeconds * 1000);
	});
}

export function runArgvCommandStreaming(
	command: ResolvedArgvCommand | undefined,
	cwd: string,
	env: NodeJS.ProcessEnv,
	timeoutSeconds: number,
	maxOutputBytes: number,
	stdoutTailBytes: number,
	stderrTailBytes: number,
	reporter: Reporter,
	streamOutput: boolean,
	enforceOutputLimit: boolean,
): Promise<CommandResult> {
	return runSpawnedCommandStreaming(
		{ executable: command?.executable ?? '', args: command?.args ?? [], shell: command?.shell ?? false },
		cwd,
		env,
		timeoutSeconds,
		maxOutputBytes,
		stdoutTailBytes,
		stderrTailBytes,
		reporter,
		streamOutput,
		enforceOutputLimit,
	);
}

export function runShellCommandStreaming(
	command: string | undefined,
	cwd: string,
	env: NodeJS.ProcessEnv,
	timeoutSeconds: number,
	maxOutputBytes: number,
	stdoutTailBytes: number,
	stderrTailBytes: number,
	reporter: Reporter,
	streamOutput: boolean,
	enforceOutputLimit: boolean,
): Promise<CommandResult> {
	return runSpawnedCommandStreaming(
		{ executable: command ?? '', shell: true },
		cwd,
		env,
		timeoutSeconds,
		maxOutputBytes,
		stdoutTailBytes,
		stderrTailBytes,
		reporter,
		streamOutput,
		enforceOutputLimit,
	);
}

export function getRunStatus(error: Error | undefined, exitCode: number | null, successExitCodes: readonly number[]): RunReceiptStatus {
	const errorWithCode = error as NodeJS.ErrnoException | undefined;

	if (errorWithCode?.code === 'ETIMEDOUT') {
		return 'timed_out';
	}

	if (isOutputLimitExceededError(error)) {
		return 'output_limit_exceeded';
	}

	if (error) {
		return 'start_failed';
	}

	return exitCode !== null && successExitCodes.includes(exitCode) ? 'passed' : 'failed';
}
