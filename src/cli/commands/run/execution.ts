import { createHash } from 'node:crypto';
import { performance } from 'node:perf_hooks';

import { ACTIVE_RUN_LOCK_ID_ENV, acquireActiveRunLock, type ActiveRunLockConflict } from '../../../core/active-run-locks.js';
import { createCommandEnv } from '../../../core/command-env.js';
import { readCommandContract, readMustflowConfigIfExists } from '../../../core/config-loading.js';
import { createCorrelationId } from '../../../core/correlation-id.js';
import { recordRunPerformanceHistory } from '../../../core/run-performance-history.js';
import { RunProfiler } from '../../../core/run-profile.js';
import {
	writeRunReceipt,
	type RunReceipt,
	type RunTerminationReceipt,
} from '../../../core/run-receipt.js';
import { finishRunWriteTracking, startRunWriteTracking } from '../../../core/run-write-drift.js';
import { resolveRunReceiptRetentionPolicy } from '../../../core/retention-policy.js';
import { renderCliError } from '../../lib/cli-output.js';
import { t, type CliLang, type MessageKey } from '../../lib/i18n.js';
import { resolveMustflowRoot } from '../../lib/project-root.js';
import { assessRunRootTrust } from '../../lib/run-root-trust.js';
import type { Reporter } from '../../lib/reporter.js';
import {
	createRunPlan,
	createRunPreview,
	type BlockedRunPlan,
	type RunnableRunPlan,
} from '../../lib/run-plan.js';
import { getRunStatus, runArgvCommandStreaming, runShellCommandStreaming } from './executor.js';
import { emitOutput, isOutputLimitExceededError } from './output.js';
import { createPendingTimeoutTermination, getKillMethod, terminateProcessTree } from './process-tree.js';
import { writeLatestRunProfile } from './profile.js';
import { assembleRunReceipt } from './receipt.js';

export interface RunCommandOptions {
	readonly correlationId?: string;
	readonly writeLatestReceipt?: boolean;
	readonly writeLatestProfile?: boolean;
	readonly recordPerformanceHistory?: boolean;
	readonly testTargets?: readonly string[];
	readonly additionalDeclaredWritePaths?: readonly string[];
}

export type RunCommandExecutionOutputMode = 'text' | 'json' | 'silent';

export interface RunCommandExecutionRequest {
	readonly intentName: string;
	readonly outputMode: RunCommandExecutionOutputMode;
	readonly allowUntrustedRoot: boolean;
	readonly wait: boolean;
	readonly waitTimeoutSeconds: number;
}

export interface RunCommandExecutionResult {
	readonly exitCode: number;
	readonly receipt: RunReceipt | null;
}

const ACTIVE_LOCK_WAIT_POLL_MS = 1_000;

function delay(milliseconds: number): Promise<void> {
	return new Promise((resolve) => {
		setTimeout(resolve, milliseconds);
	});
}

function getRunPlanDetail(plan: BlockedRunPlan, lang: CliLang, fallbackKey: MessageKey): string {
	return plan.detail ?? t(lang, fallbackKey);
}

function reportRunPlanFailure(plan: BlockedRunPlan, reporter: Reporter, lang: CliLang): void {
	let message: string;

	switch (plan.reasonCode) {
		case 'status_not_configured':
			message = t(lang, 'run.error.statusNotConfigured', { intent: plan.intentName, status: plan.intentStatus ?? 'unknown' });
			break;
		case 'lifecycle_not_oneshot':
			message = t(lang, 'run.error.lifecycleNotOneshot', { intent: plan.intentName, lifecycle: plan.lifecycle ?? 'unknown' });
			break;
		case 'run_policy_not_agent_allowed':
			message = t(lang, 'run.error.runPolicy', { intent: plan.intentName });
			break;
		case 'stdin_not_closed':
			message = t(lang, 'run.error.stdin', { intent: plan.intentName });
			break;
		case 'agent_shell_requires_allow':
			message = t(lang, 'run.error.agentShellRequiresAllow', { intent: plan.intentName });
			break;
		case 'missing_timeout':
			message = t(lang, 'run.error.timeout', { intent: plan.intentName });
			break;
		case 'missing_command_source':
			message = t(lang, 'run.error.commandSource', { intent: plan.intentName });
			break;
		case 'unsafe_intent_name':
			message = t(lang, 'run.error.unsafeIntent', {
				intent: plan.intentName,
				detail: getRunPlanDetail(plan, lang, 'run.error.unsafeIntentDetail'),
			});
			break;
		case 'blocked_shell_background_pattern':
			message = t(lang, 'run.error.blockedShellBackground', {
				intent: plan.intentName,
				detail: getRunPlanDetail(plan, lang, 'run.error.blockedShellBackgroundDetail'),
			});
			break;
		case 'blocked_long_running_command_pattern':
			message = t(lang, 'run.error.blockedLongRunningCommand', {
				intent: plan.intentName,
				detail: getRunPlanDetail(plan, lang, 'run.error.blockedLongRunningCommandDetail'),
			});
			break;
		case 'network_requires_approval':
		case 'destructive_requires_approval':
		case 'approval_policy_unreadable':
			message = t(lang, 'run.error.approvalRequired', {
				intent: plan.intentName,
				detail: getRunPlanDetail(plan, lang, 'run.error.approvalRequiredDetail'),
			});
			break;
		case 'cwd_outside_project':
			message = t(lang, 'run.error.cwdOutsideProject', {
				intent: plan.intentName,
				detail: getRunPlanDetail(plan, lang, 'run.error.cwdOutsideProjectDetail'),
			});
			break;
		case 'invalid_test_target':
			message = t(lang, 'run.error.invalidTestTarget', {
				intent: plan.intentName,
				detail: getRunPlanDetail(plan, lang, 'run.error.invalidTestTargetDetail'),
			});
			break;
		case 'max_output_bytes_exceeds_limit':
			message = t(lang, 'run.error.maxOutputBytes', {
				intent: plan.intentName,
				detail: getRunPlanDetail(plan, lang, 'run.error.maxOutputBytesDetail'),
			});
			break;
		case 'intent_not_table':
		default:
			message = t(lang, 'run.error.unknownIntent', { intent: plan.intentName });
			break;
	}

	if (plan.suggestedIntentSnippet) {
		message = `${message}\n\n${t(lang, 'run.label.suggestedIntentSnippet')}:\n${plan.suggestedIntentSnippet}`;
	}

	reporter.stderr(renderCliError(message, 'mf help commands', lang));
}

function createPlanCommandHash(plan: RunnableRunPlan): string {
	const payload = {
		mode: plan.mode,
		cwd: plan.relativeCwd,
		argv: plan.commandArgv ?? null,
		cmd: plan.shellCommand ?? null,
	};

	return `sha256:${createHash('sha256').update(JSON.stringify(payload)).digest('hex')}`;
}

function renderActiveLockConflictMessage(intentName: string, conflicts: readonly ActiveRunLockConflict[], lang: CliLang): string {
	const [first] = conflicts;
	const detail = first
		? t(lang, 'run.error.activeLockConflictDetail', {
				lock: first.lock,
				intent: first.conflictsWithIntent,
				pid: first.conflictsWithPid,
			})
		: t(lang, 'run.error.activeLockConflictUnknown');

	return t(lang, 'run.error.activeLockConflict', { intent: intentName, detail });
}

async function acquireActiveRunLockWithOptionalWait(input: {
	readonly enabled: boolean;
	readonly waitTimeoutSeconds: number;
	readonly projectRoot: string;
	readonly contract: Parameters<typeof acquireActiveRunLock>[1];
	readonly intentName: string;
	readonly commandHash: string;
	readonly json: boolean;
	readonly reporter: Reporter;
	readonly lang: CliLang;
}): Promise<ReturnType<typeof acquireActiveRunLock>> {
	const startedAt = Date.now();
	let reportedWait = false;

	while (true) {
		const result = acquireActiveRunLock(input.projectRoot, input.contract, input.intentName, { commandHash: input.commandHash });
		if (result.ok || !input.enabled || result.conflicts.length === 0) {
			return result;
		}

		if (!input.json && !reportedWait) {
			const [first] = result.conflicts;
			input.reporter.stderr(t(input.lang, 'run.progress.waitingForActiveLock', {
				intent: input.intentName,
				activeIntent: first?.conflictsWithIntent ?? 'unknown',
				seconds: input.waitTimeoutSeconds,
			}));
			reportedWait = true;
		}

		if (Date.now() - startedAt >= input.waitTimeoutSeconds * 1000) {
			return result;
		}

		await delay(Math.min(ACTIVE_LOCK_WAIT_POLL_MS, Math.max(1, input.waitTimeoutSeconds * 1000 - (Date.now() - startedAt))));
	}
}

function createRunProgressReporter(input: {
	readonly enabled: boolean;
	readonly intentName: string;
	readonly timeoutSeconds: number;
	readonly reporter: Reporter;
	readonly lang: CliLang;
}): () => void {
	if (!input.enabled) {
		return () => undefined;
	}

	input.reporter.stderr(t(input.lang, 'run.progress.started', { intent: input.intentName, seconds: input.timeoutSeconds }));

	const timers: NodeJS.Timeout[] = [];
	for (const ratio of [0.5, 0.8]) {
		const delayMs = Math.max(1, Math.floor(input.timeoutSeconds * 1000 * ratio));
		const elapsedSeconds = Math.max(1, Math.round(input.timeoutSeconds * ratio));
		const timer = setTimeout(() => {
			input.reporter.stderr(
				t(input.lang, 'run.progress.timeoutWarning', {
					intent: input.intentName,
					seconds: elapsedSeconds,
					percent: Math.round(ratio * 100),
				}),
			);
		}, delayMs);
		timer.unref?.();
		timers.push(timer);
	}

	return () => {
		for (const timer of timers) {
			clearTimeout(timer);
		}
	};
}

export async function executeRunCommand(
	request: RunCommandExecutionRequest,
	reporter: Reporter,
	lang: CliLang = 'en',
	options: RunCommandOptions = {},
): Promise<RunCommandExecutionResult> {
	const executorStartedAtMs = performance.now();
	const profiler = new RunProfiler();
	const projectRoot = profiler.measure('root_detection', () => resolveMustflowRoot());
	const rootTrust = profiler.measure('root_trust', () => assessRunRootTrust(projectRoot));
	const jsonLikeOutput = request.outputMode !== 'text';

	if (!request.allowUntrustedRoot && !rootTrust.trusted) {
		const message =
			rootTrust.reason === 'manifest_lock_invalid'
				? t(lang, 'run.error.untrustedRootInvalid', { detail: rootTrust.detail ?? rootTrust.manifestLockPath })
				: t(lang, 'run.error.untrustedRootMissing', { path: rootTrust.detail ?? rootTrust.manifestLockPath });
		reporter.stderr(renderCliError(message, 'mf run --help', lang));
		return { exitCode: 1, receipt: null };
	}

	const contract = profiler.measure('command_contract', () => readCommandContract(projectRoot));
	const plan = profiler.measure('plan_creation', () =>
		createRunPlan(projectRoot, contract, request.intentName, { testTargets: options.testTargets }),
	);

	if (!plan.ok) {
		if (request.outputMode === 'json') {
			reporter.stdout(JSON.stringify(createRunPreview(plan, 'plan-only'), null, 2));
		}
		reportRunPlanFailure(plan, reporter, lang);
		writeLatestRunProfile(profiler, options, {
			projectRoot,
			intent: request.intentName,
			status: 'blocked',
			previewMode: null,
		});
		return { exitCode: 1, receipt: null };
	}

	const activeRunLock = await profiler.measureAsync('active_lock_acquire', () =>
		acquireActiveRunLockWithOptionalWait({
			enabled: request.wait,
			waitTimeoutSeconds: request.waitTimeoutSeconds,
			projectRoot,
			contract,
			intentName: request.intentName,
			commandHash: createPlanCommandHash(plan),
			json: jsonLikeOutput,
			reporter,
			lang,
		}),
	);

	if (!activeRunLock.ok) {
		reporter.stderr(renderCliError(renderActiveLockConflictMessage(request.intentName, activeRunLock.conflicts, lang), 'mf run --dry-run --json', lang));
		writeLatestRunProfile(profiler, options, {
			projectRoot,
			intent: request.intentName,
			status: 'blocked',
			previewMode: null,
		});
		return { exitCode: 1, receipt: null };
	}

	try {
		const runReceiptPolicy = profiler.measure('retention_policy', () =>
			resolveRunReceiptRetentionPolicy(readMustflowConfigIfExists(projectRoot)),
		);
		const env = profiler.measure('environment', () =>
			createCommandEnv(projectRoot, { policy: plan.envPolicy, allowlist: plan.envAllowlist }),
		);
		env[ACTIVE_RUN_LOCK_ID_ENV] = activeRunLock.handle.record.run_id;
		const writeTracker = profiler.measure('write_drift_before', () =>
			startRunWriteTracking(projectRoot, contract, request.intentName, {
				additionalDeclaredPaths: options.additionalDeclaredWritePaths,
				env,
			}),
		);
		const stdoutTailBytes = Math.min(runReceiptPolicy.stdoutTailBytes, plan.maxOutputBytes);
		const stderrTailBytes = Math.min(runReceiptPolicy.stderrTailBytes, plan.maxOutputBytes);
		let streamedOutput = false;

		const childStartedAtMs = performance.now();
		const startedAt = new Date();
		const streamChildOutput = request.outputMode === 'text';
		const stopRunProgress = createRunProgressReporter({
			enabled: streamChildOutput && Boolean(reporter.writeStderr),
			intentName: request.intentName,
			timeoutSeconds: plan.timeoutSeconds,
			reporter,
			lang,
		});
		const result = await profiler.measureAsync('child_command', async () => {
			try {
				if (plan.commandArgv) {
					streamedOutput = streamChildOutput;
					return runArgvCommandStreaming(
						plan.argvCommand,
						plan.cwd,
						env,
						plan.timeoutSeconds,
						plan.killAfterSeconds,
						plan.maxOutputBytes,
						stdoutTailBytes,
						stderrTailBytes,
						reporter,
						streamChildOutput,
						true,
					);
				}

				streamedOutput = streamChildOutput;
				return runShellCommandStreaming(
					plan.shellCommand,
					plan.cwd,
					env,
					plan.timeoutSeconds,
					plan.killAfterSeconds,
					plan.maxOutputBytes,
					stdoutTailBytes,
					stderrTailBytes,
					reporter,
					streamChildOutput,
					true,
				);
			} finally {
				stopRunProgress();
			}
		});
		const childDurationMs = performance.now() - childStartedAtMs;
		const finishedAt = new Date();
		const writeDrift = profiler.measure('write_drift_after', () => finishRunWriteTracking(writeTracker));
		const exitCode = typeof result.status === 'number' ? result.status : null;
		const runStatus = getRunStatus(result.error, exitCode, plan.successExitCodes);
		let killMethod: string | null = null;
		let termination: RunTerminationReceipt | null = null;

		if (runStatus === 'timed_out') {
			termination = result.termination ?? createPendingTimeoutTermination(getKillMethod());
			killMethod = termination.method;
			if (!result.termination && result.pid) {
				terminateProcessTree(result.pid);
			}
		}

		const receipt = profiler.measure('receipt_create', () =>
			assembleRunReceipt({
				correlationId: options.correlationId ?? createCorrelationId('run'),
				intentName: request.intentName,
				runStatus,
				startedAt,
				finishedAt,
				projectRoot,
				plan,
				result,
				exitCode,
				killMethod,
				termination,
				writeDrift,
				executorOverheadMs: Math.max(0, Math.round((performance.now() - executorStartedAtMs - childDurationMs) * 1000) / 1000),
				phaseTimings: profiler.getReceiptPhases(),
				stdoutTailBytes: runReceiptPolicy.stdoutTailBytes,
				stderrTailBytes: runReceiptPolicy.stderrTailBytes,
			}),
		);

		if (options.writeLatestReceipt !== false) {
			profiler.measure('receipt_write', () => writeRunReceipt(projectRoot, receipt));
		}
		if (options.recordPerformanceHistory !== false) {
			profiler.measure('performance_history_write', () => recordRunPerformanceHistory(projectRoot, receipt));
		}
		writeLatestRunProfile(profiler, options, {
			projectRoot,
			intent: request.intentName,
			status: runStatus,
			previewMode: null,
		});

		const commandExitCode = runStatus === 'passed' ? 0 : 1;
		if (request.outputMode === 'json') {
			reporter.stdout(JSON.stringify(receipt, null, 2));
			return { exitCode: commandExitCode, receipt };
		}

		if (request.outputMode === 'silent') {
			return { exitCode: commandExitCode, receipt };
		}

		if (!streamedOutput) {
			emitOutput(reporter, result.stdout, 'stdout');
			emitOutput(reporter, result.stderr, 'stderr');
		}

		if (result.error) {
			const errorWithCode = result.error as NodeJS.ErrnoException;
			if (errorWithCode.code === 'ETIMEDOUT') {
				reporter.stderr(t(lang, 'run.error.timedOut', { intent: request.intentName, seconds: plan.timeoutSeconds }));
				return { exitCode: 1, receipt };
			}

			if (isOutputLimitExceededError(result.error)) {
				reporter.stderr(t(lang, 'run.error.outputLimitExceeded', { intent: request.intentName, message: result.error.message }));
				return { exitCode: 1, receipt };
			}

			reporter.stderr(t(lang, 'run.error.startFailed', { intent: request.intentName, message: result.error.message }));
			return { exitCode: 1, receipt };
		}

		return { exitCode: commandExitCode, receipt };
	} finally {
		activeRunLock.handle.release();
	}
}
