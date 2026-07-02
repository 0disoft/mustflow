import { spawn } from 'node:child_process';

import { BoundedOutputBuffer, type BoundedOutputSnapshot } from '../../../core/bounded-output.js';
import type { RunReceiptStatus, RunTerminationReceipt } from '../../../core/run-receipt.js';
import type { Reporter } from '../../lib/reporter.js';
import type { ResolvedArgvCommand } from '../../lib/run-plan.js';
import {
	createPendingTimeoutTermination,
	forceTerminateProcessTree,
	getKillMethod,
	terminateProcessTree,
} from './process-tree.js';
import {
	createOutputLimitError,
	isOutputLimitExceededError,
	writeOutputLimitTerminationMarker,
	writeStreamChunk,
	writeStreamChunkPrefix,
} from './output.js';
import { createWindowsCommandScriptSpawn } from './windows-command-script.js';

const TERMINATION_CONFIRMATION_FALLBACK_MS = 1000;

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
	readonly windowsCommandScript?: boolean;
}

interface NormalizedSpawnedCommandInput {
	readonly executable: string;
	readonly args: readonly string[];
	readonly shell: boolean;
	readonly windowsVerbatimArguments: boolean;
}

function createEmptyOutputSnapshot(maxBytes: number): BoundedOutputSnapshot {
	return new BoundedOutputBuffer(maxBytes).toSnapshot();
}

function createInvalidExecutableError(): NodeJS.ErrnoException {
	return Object.assign(new Error('Command executable must not be empty'), { code: 'EINVAL' });
}

function normalizeSpawnedCommandInput(command: SpawnedCommandInput): NormalizedSpawnedCommandInput {
	if (process.platform === 'win32' && command.windowsCommandScript === true) {
		const windowsCommand = createWindowsCommandScriptSpawn(command.executable, command.args ?? []);

		return {
			executable: windowsCommand.executable,
			args: windowsCommand.args,
			shell: windowsCommand.shell,
			windowsVerbatimArguments: windowsCommand.windowsVerbatimArguments,
		};
	}

	return {
		executable: command.executable,
		args: command.args ?? [],
		shell: command.shell,
		windowsVerbatimArguments: false,
	};
}

/**
 * mf:anchor cli.run.process-lifecycle
 * purpose: Spawn configured commands with bounded output and deterministic timeout termination.
 * search: child process, timeout, process tree, output limit, kill after
 * invariant: Timed-out or output-limited commands must stop the process tree and return bounded stdout and stderr snapshots.
 * risk: state, security
 */
function runSpawnedCommandStreaming(
	command: SpawnedCommandInput,
	cwd: string,
	env: NodeJS.ProcessEnv,
	timeoutSeconds: number,
	killAfterSeconds: number,
	maxOutputBytes: number,
	stdoutTailBytes: number,
	stderrTailBytes: number,
	reporter: Reporter,
	streamOutput: boolean,
	enforceOutputLimit: boolean,
): Promise<CommandResult> {
	if (command.executable.trim().length === 0) {
		return Promise.resolve({
			status: null,
			signal: null,
			error: createInvalidExecutableError(),
			stdout: createEmptyOutputSnapshot(stdoutTailBytes),
			stderr: createEmptyOutputSnapshot(stderrTailBytes),
			termination: null,
		});
	}

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
		let forceKillTimeout: NodeJS.Timeout | undefined;
		let terminationFallbackTimeout: NodeJS.Timeout | undefined;
		let terminationStarted = false;
		let outputLimitMarkerWritten = false;
		let termination: RunTerminationReceipt | null = null;

		const spawnCommand = normalizeSpawnedCommandInput(command);
		const child = spawn(spawnCommand.executable, spawnCommand.args, {
			cwd,
			env,
			shell: spawnCommand.shell,
			stdio: ['ignore', 'pipe', 'pipe'],
			windowsHide: true,
			windowsVerbatimArguments: spawnCommand.windowsVerbatimArguments,
			detached: process.platform !== 'win32',
		});
		childPid = child.pid;

		const finish = (status: number | null, signal: string | null, terminationConfirmed = true): void => {
			if (settled) {
				return;
			}

			settled = true;

			if (timeout) {
				clearTimeout(timeout);
			}
			if (forceKillTimeout) {
				clearTimeout(forceKillTimeout);
			}
			if (terminationFallbackTimeout) {
				clearTimeout(terminationFallbackTimeout);
			}
			const confirmedTermination = termination ?
				{
					...termination,
					confirmed: terminationConfirmed,
					cleanup_pending: !terminationConfirmed,
				} :
				null;
			resolve({
				status: timedOut ? null : status,
				signal: timedOut ? null : signal,
				error: timedOut ? Object.assign(new Error('Command timed out'), { code: 'ETIMEDOUT' }) : childError,
				stdout: stdout.toSnapshot(),
				stderr: stderr.toSnapshot(),
				pid: childPid,
				termination: confirmedTermination,
			});
		};

		const beginTermination = (): void => {
			if (terminationStarted) {
				return;
			}

			terminationStarted = true;
			child.stdout?.destroy();
			child.stderr?.destroy();
			terminateProcessTree(childPid);

			const forceAfterMs = killAfterSeconds * 1000;
			forceKillTimeout = setTimeout(() => {
				if (termination) {
					termination = {
						...termination,
						forced_kill_attempted: true,
					};
				}
				forceTerminateProcessTree(childPid);
			}, forceAfterMs);

			terminationFallbackTimeout = setTimeout(() => {
				child.unref();
				finish(null, null, false);
			}, forceAfterMs + TERMINATION_CONFIRMATION_FALLBACK_MS);
		};

		const stopForOutputLimit = (stream: 'stdout' | 'stderr'): void => {
			if (settled || childError) {
				return;
			}

			childError = createOutputLimitError(stream, maxOutputBytes);
			if (timeout) {
				clearTimeout(timeout);
				timeout = undefined;
			}
			beginTermination();
		};

		const writeOutputLimitMarkerOnce = (): void => {
			if (!streamOutput || outputLimitMarkerWritten) {
				return;
			}

			outputLimitMarkerWritten = true;
			writeOutputLimitTerminationMarker(reporter);
		};

		const handleOutputChunk = (stream: 'stdout' | 'stderr', buffer: BoundedOutputBuffer, chunk: Buffer): void => {
			const previousBytes = stream === 'stdout' ? stdoutBytes : stderrBytes;
			const nextBytes = previousBytes + chunk.byteLength;
			const exceedsLimit = enforceOutputLimit && nextBytes > maxOutputBytes;
			const remainingStreamBytes = enforceOutputLimit ? Math.max(0, maxOutputBytes - previousBytes) : chunk.byteLength;

			buffer.append(chunk);

			if (stream === 'stdout') {
				stdoutBytes = nextBytes;
			} else {
				stderrBytes = nextBytes;
			}

			if (streamOutput) {
				if (exceedsLimit) {
					writeStreamChunkPrefix(reporter, stream, chunk, remainingStreamBytes);
					writeOutputLimitMarkerOnce();
				} else {
					writeStreamChunk(reporter, stream, chunk);
				}
			}

			if (exceedsLimit) {
				stopForOutputLimit(stream);
			}
		};

		child.stdout?.on('data', (chunk: Buffer) => {
			handleOutputChunk('stdout', stdout, chunk);
		});
		child.stderr?.on('data', (chunk: Buffer) => {
			handleOutputChunk('stderr', stderr, chunk);
		});
		child.once('error', (error) => {
			childError = error;
		});
		child.once('close', (status, signal) => {
			finish(status, signal);
		});

		timeout = setTimeout(() => {
			if (settled || childError) {
				return;
			}

			timedOut = true;
			termination = createPendingTimeoutTermination(getKillMethod());
			beginTermination();
		}, timeoutSeconds * 1000);
	});
}

export function runArgvCommandStreaming(
	command: ResolvedArgvCommand | undefined,
	cwd: string,
	env: NodeJS.ProcessEnv,
	timeoutSeconds: number,
	killAfterSeconds: number,
	maxOutputBytes: number,
	stdoutTailBytes: number,
	stderrTailBytes: number,
	reporter: Reporter,
	streamOutput: boolean,
	enforceOutputLimit: boolean,
): Promise<CommandResult> {
	return runSpawnedCommandStreaming(
		{
			executable: command?.executable ?? '',
			args: command?.args ?? [],
			shell: command?.shell ?? false,
			windowsCommandScript: command?.windowsCommandScript ?? false,
		},
		cwd,
		env,
		timeoutSeconds,
		killAfterSeconds,
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
	killAfterSeconds: number,
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
		killAfterSeconds,
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
