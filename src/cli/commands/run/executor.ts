import { spawn } from 'node:child_process';
import { interruptionError } from '../../../core/cancellation.js';
import { commandTimersAreSafe, TERMINATION_CONFIRMATION_FALLBACK_MS } from '../../../core/command-time-limits.js';

import { BoundedOutputBuffer, type BoundedOutputSnapshot } from '../../../core/bounded-output.js';
import {
	ProcessSupervisor,
	type ProcessTerminationReason,
} from '../../../core/process-supervisor.js';
import type { RunReceiptStatus, RunTerminationReceipt } from '../../../core/run-receipt.js';
import type { Reporter } from '../../lib/reporter.js';
import type { ResolvedArgvCommand } from '../../lib/run-plan.js';
import {
	createProcessTreeBackend,
} from './process-tree.js';
import {
	createOutputLimitError,
	isOutputLimitExceededError,
	writeOutputLimitTerminationMarker,
	writeStreamChunk,
	writeStreamChunkPrefix,
} from './output.js';
import { createWindowsCommandScriptSpawn } from './windows-command-script.js';

import { commandLifecycleOutcome, createCommandLifecycleState, transitionCommandLifecycle, type CommandLifecycleEvent } from './lifecycle.js';

const TERMINATION_CONFIRMATION_POLL_MS = 25;

export interface CommandExecutionOptions {
	readonly signal?: AbortSignal;
}

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
	options: CommandExecutionOptions = {},
): Promise<CommandResult> {
	if (options.signal?.aborted) {
		return Promise.resolve({ status: null, signal: null, error: interruptionError(),
			stdout: createEmptyOutputSnapshot(stdoutTailBytes), stderr: createEmptyOutputSnapshot(stderrTailBytes), termination: null });
	}
	if (!commandTimersAreSafe(timeoutSeconds, killAfterSeconds)) {
		return Promise.resolve({ status: null, signal: null,
			error: Object.assign(new Error('Command timeout or kill delay exceeds safe timer bounds'), { code: 'EINVAL' }),
			stdout: createEmptyOutputSnapshot(stdoutTailBytes), stderr: createEmptyOutputSnapshot(stderrTailBytes), termination: null });
	}
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
		let state = createCommandLifecycleState();
		const updateState = (event: CommandLifecycleEvent): boolean => {
			const next = transitionCommandLifecycle(state, event);
			if (next === state) return false;
			state = next;
			return true;
		};
		let stdoutBytes = 0;
		let stderrBytes = 0;
		let timeout: NodeJS.Timeout | undefined;
		let forceKillTimeout: NodeJS.Timeout | undefined;
		let terminationFallbackTimeout: NodeJS.Timeout | undefined;
		let terminationPollTimeout: NodeJS.Timeout | undefined;
		let outputLimitMarkerWritten = false;
		let supervisor: ProcessSupervisor | null = null;

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
		const childPid = child.pid;

		const parentSignalHandlers = new Map<NodeJS.Signals, () => void>();
		const clearParentSignalHandlers = (): void => {
			for (const [signal, handler] of parentSignalHandlers) {
				process.off(signal, handler);
			}
			parentSignalHandlers.clear();
		};

		const finish = (status: number | null, signal: string | null): void => {
			if (!updateState({ type: 'settle' })) return;

			if (timeout) {
				clearTimeout(timeout);
			}
			if (forceKillTimeout) {
				clearTimeout(forceKillTimeout);
			}
			if (terminationFallbackTimeout) {
				clearTimeout(terminationFallbackTimeout);
			}
			if (terminationPollTimeout) {
				clearTimeout(terminationPollTimeout);
			}
			clearParentSignalHandlers();
			options.signal?.removeEventListener('abort', onAbort);
			const supervisorSnapshot = supervisor?.snapshot() ?? null;
			const termination = supervisorSnapshot === null ? null : (({ pid: _pid, ...receipt }) => receipt)(supervisorSnapshot);
			resolve({
				...commandLifecycleOutcome(state, status, signal),
				stdout: stdout.toSnapshot(),
				stderr: stderr.toSnapshot(),
				pid: childPid,
				termination: termination?.reason ? termination as RunTerminationReceipt : null,
			});
		};

		const pollForTermination = (): void => {
			if (state.settled || !supervisor) {
				return;
			}
			if (supervisor.refreshProcessTreeState() === 'gone' && state.childClosed) {
				finish(state.closeStatus, state.closeSignal);
				return;
			}
			terminationPollTimeout = setTimeout(pollForTermination, TERMINATION_CONFIRMATION_POLL_MS);
		};

		const beginTermination = (reason: ProcessTerminationReason): void => {
			if (!updateState({ type: 'begin_termination' })) return;
			child.stdout?.destroy();
			child.stderr?.destroy();
			if (childPid) {
				supervisor = new ProcessSupervisor(childPid, createProcessTreeBackend());
				supervisor.requestGracefulTermination(reason);
			}

			const forceAfterMs = killAfterSeconds * 1000;
			forceKillTimeout = setTimeout(() => {
				supervisor?.requestForceTermination(reason);
			}, forceAfterMs);

			terminationFallbackTimeout = setTimeout(() => {
				supervisor?.refreshProcessTreeState();
				child.unref();
				finish(state.closeStatus, state.closeSignal);
			}, forceAfterMs + TERMINATION_CONFIRMATION_FALLBACK_MS);
			pollForTermination();
		};

		const stopForOutputLimit = (stream: 'stdout' | 'stderr'): void => {
			if (!updateState({ type: 'output_limit', error: createOutputLimitError(stream, maxOutputBytes) })) return;
			if (timeout) {
				clearTimeout(timeout);
				timeout = undefined;
			}
			beginTermination('output_limit');
		};

		const onAbort = (): void => {
			if (!updateState({ type: 'abort', error: interruptionError() })) return;
			beginTermination('parent_signal');
		};
		options.signal?.addEventListener('abort', onAbort, { once: true });
		if (options.signal?.aborted) onAbort();

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
			updateState({ type: 'child_error', error });
		});
		child.once('close', (status, signal) => {
			updateState({ type: 'child_close', status, signal });
			if (!state.terminationStarted) {
				finish(status, signal);
				return;
			}
			supervisor?.markDirectChildClosed();
			if (supervisor?.refreshProcessTreeState() === 'gone') {
				finish(status, signal);
			}
		});

		for (const signal of ['SIGINT', 'SIGTERM', 'SIGHUP'] as const) {
			const handler = (): void => {
				updateState({ type: 'parent_signal', error: Object.assign(new Error(`Command interrupted by parent ${signal}`), { code: 'EINTERRUPTED' }) });
				beginTermination('parent_signal');
			};
			parentSignalHandlers.set(signal, handler);
			process.once(signal, handler);
		}

		timeout = setTimeout(() => {
			if (!updateState({ type: 'timeout' })) return;
			beginTermination('timeout');
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
	options: CommandExecutionOptions = {},
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
		options,
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
	options: CommandExecutionOptions = {},
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
		options,
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
	if (errorWithCode?.code === 'EINTERRUPTED') {
		return 'failed';
	}

	if (error) {
		return 'start_failed';
	}

	return exitCode !== null && successExitCodes.includes(exitCode) ? 'passed' : 'failed';
}
