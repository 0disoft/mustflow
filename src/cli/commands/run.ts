import { createHash } from 'node:crypto';
import { performance } from 'node:perf_hooks';

import { acquireActiveRunLock, type ActiveRunLockConflict } from '../../core/active-run-locks.js';
import { createCommandEnv } from '../../core/command-env.js';
import { createCorrelationId } from '../../core/correlation-id.js';
import { printUsageError, renderCliError, renderHelp } from '../lib/cli-output.js';
import { readCommandContract, readMustflowConfigIfExists } from '../../core/config-loading.js';
import { resolveRunReceiptRetentionPolicy } from '../../core/retention-policy.js';
import { t, type CliLang, type MessageKey } from '../lib/i18n.js';
import {
	formatCliOptionParseError,
	getParsedCliStringOption,
	hasCliOptionToken,
	hasParsedCliOption,
	parseCliOptions,
	type CliOptionParseError,
	type CliOptionSpec,
} from '../lib/option-parser.js';
import { resolveMustflowRoot } from '../lib/project-root.js';
import { ALLOW_UNTRUSTED_ROOT_OPTION, assessRunRootTrust } from '../lib/run-root-trust.js';
import type { Reporter } from '../lib/reporter.js';
import {
	createRunPlan,
	createRunPreview,
	renderRunPreviewText,
	type BlockedRunPlan,
	type RunnableRunPlan,
	type RunPreviewMode,
} from '../lib/run-plan.js';
import {
	writeRunReceipt,
	type RunTerminationReceipt,
} from '../../core/run-receipt.js';
import { recordRunPerformanceHistory } from '../../core/run-performance-history.js';
import { RunProfiler } from '../../core/run-profile.js';
import { finishRunWriteTracking, startRunWriteTracking } from '../../core/run-write-drift.js';
import { getRunStatus, runArgvCommandStreaming, runShellCommandStreaming } from './run/executor.js';
import { emitOutput, isOutputLimitExceededError } from './run/output.js';
import { createPendingTimeoutTermination, getKillMethod, terminateProcessTree } from './run/process-tree.js';
import { assembleRunReceipt } from './run/receipt.js';

export interface RunCommandOptions {
	readonly correlationId?: string;
	readonly writeLatestReceipt?: boolean;
	readonly writeLatestProfile?: boolean;
	readonly recordPerformanceHistory?: boolean;
	readonly testTargets?: readonly string[];
	readonly additionalDeclaredWritePaths?: readonly string[];
}

const DEFAULT_ACTIVE_LOCK_WAIT_TIMEOUT_SECONDS = 300;
const ACTIVE_LOCK_WAIT_POLL_MS = 1_000;
const RUN_OPTIONS = [
	{ name: '--json', kind: 'boolean' },
	{ name: '--dry-run', kind: 'boolean' },
	{ name: '--plan-only', kind: 'boolean' },
	{ name: '--wait', kind: 'boolean' },
	{ name: ALLOW_UNTRUSTED_ROOT_OPTION, kind: 'boolean' },
	{ name: '--wait-timeout', kind: 'string' },
] as const satisfies readonly CliOptionSpec[];

interface ParsedRunArguments {
	readonly json: boolean;
	readonly dryRun: boolean;
	readonly planOnly: boolean;
	readonly allowUntrustedRoot: boolean;
	readonly wait: boolean;
	readonly waitTimeoutSeconds: number;
	readonly intentName: string | null;
	readonly extra: readonly string[];
	readonly error: CliOptionParseError | 'invalid_wait_timeout' | null;
}

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

function writeLatestProfile(
	profiler: RunProfiler,
	options: RunCommandOptions,
	input: Parameters<RunProfiler['writeLatest']>[0],
): void {
	if (options.writeLatestProfile === false) {
		return;
	}

	profiler.writeLatest(input);
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

function parseRunArguments(args: readonly string[]): ParsedRunArguments {
	const parsed = parseCliOptions(args, RUN_OPTIONS, { allowPositionals: true });
	let waitTimeoutSeconds = DEFAULT_ACTIVE_LOCK_WAIT_TIMEOUT_SECONDS;

	if (parsed.error) {
		const [intentName, ...extra] = parsed.positionals;

		return {
			json: hasParsedCliOption(parsed, '--json'),
			dryRun: hasParsedCliOption(parsed, '--dry-run'),
			planOnly: hasParsedCliOption(parsed, '--plan-only'),
			allowUntrustedRoot: hasParsedCliOption(parsed, ALLOW_UNTRUSTED_ROOT_OPTION),
			wait: hasParsedCliOption(parsed, '--wait'),
			waitTimeoutSeconds,
			intentName: intentName ?? null,
			extra,
			error: parsed.error,
		};
	}

	const waitTimeoutValue = getParsedCliStringOption(parsed, '--wait-timeout');
	let error: ParsedRunArguments['error'] = null;
	if (waitTimeoutValue !== null) {
		const parsedWaitTimeout = Number(waitTimeoutValue);
		if (!Number.isInteger(parsedWaitTimeout) || parsedWaitTimeout <= 0) {
			error = 'invalid_wait_timeout';
		} else {
			waitTimeoutSeconds = parsedWaitTimeout;
		}
	}

	const [intentName, ...extra] = parsed.positionals;
	return {
		json: hasParsedCliOption(parsed, '--json'),
		dryRun: hasParsedCliOption(parsed, '--dry-run'),
		planOnly: hasParsedCliOption(parsed, '--plan-only'),
		allowUntrustedRoot: hasParsedCliOption(parsed, ALLOW_UNTRUSTED_ROOT_OPTION),
		wait: hasParsedCliOption(parsed, '--wait'),
		waitTimeoutSeconds,
		intentName: intentName ?? null,
		extra,
		error,
	};
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

export function getRunHelp(lang: CliLang = 'en'): string {
	return renderHelp(
		{
			usage: 'mf run <intent> [options]',
			summary: t(lang, 'run.help.summary'),
			options: [
				{ label: '--dry-run', description: t(lang, 'run.help.option.dryRun') },
				{ label: '--plan-only', description: t(lang, 'run.help.option.planOnly') },
				{ label: '--json', description: t(lang, 'run.help.option.json') },
				{ label: '--wait', description: t(lang, 'run.help.option.wait') },
				{ label: '--wait-timeout <seconds>', description: t(lang, 'run.help.option.waitTimeout') },
				{ label: ALLOW_UNTRUSTED_ROOT_OPTION, description: t(lang, 'run.help.option.allowUntrustedRoot') },
				{ label: '-h, --help', description: t(lang, 'cli.option.help') },
			],
			examples: ['mf run test', 'mf run lint --json', 'mf run mustflow_check --dry-run --json'],
			exitCodes: [
				{
					label: '0',
					description: t(lang, 'run.help.exit.ok'),
				},
				{
					label: '1',
					description: t(lang, 'run.help.exit.fail'),
				},
			],
		},
		lang,
	);
}

/**
 * mf:anchor cli.run.intent-contract
 * purpose: Enforce command intent eligibility before executing a configured oneshot command.
 * search: command contract, agent_allowed, oneshot, stdin closed, timeout
 * invariant: Execution requires configured status, oneshot lifecycle, agent_allowed policy, and closed stdin.
 * risk: config, security, state
 */
export async function runRun(
	args: string[],
	reporter: Reporter,
	lang: CliLang = 'en',
	options: RunCommandOptions = {},
): Promise<number> {
	const executorStartedAtMs = performance.now();
	const profiler = new RunProfiler();

	if (hasCliOptionToken(args, '--help', ['-h'])) {
		reporter.stdout(getRunHelp(lang));
		return 0;
	}

	const parsedArgs = parseRunArguments(args);

	if (parsedArgs.error && parsedArgs.error !== 'invalid_wait_timeout') {
		if (parsedArgs.error.kind === 'missing_value' && parsedArgs.error.option === '--wait-timeout') {
			printUsageError(reporter, t(lang, 'run.error.invalidWaitTimeout'), 'mf run --help', getRunHelp(lang), lang);
			return 1;
		}

		printUsageError(reporter, formatCliOptionParseError(parsedArgs.error, lang), 'mf run --help', getRunHelp(lang), lang);
		return 1;
	}

	if (parsedArgs.error === 'invalid_wait_timeout') {
		printUsageError(reporter, t(lang, 'run.error.invalidWaitTimeout'), 'mf run --help', getRunHelp(lang), lang);
		return 1;
	}

	const json = parsedArgs.json;
	const dryRun = parsedArgs.dryRun;
	const planOnly = parsedArgs.planOnly;
	const allowUntrustedRoot = parsedArgs.allowUntrustedRoot;
	const previewMode: RunPreviewMode | null = dryRun ? 'dry-run' : planOnly ? 'plan-only' : null;

	if (dryRun && planOnly) {
		printUsageError(reporter, t(lang, 'run.error.conflictingPreviewModes'), 'mf run --help', getRunHelp(lang), lang);
		return 1;
	}

	if (parsedArgs.wait && previewMode) {
		printUsageError(reporter, t(lang, 'run.error.waitRequiresExecution'), 'mf run --help', getRunHelp(lang), lang);
		return 1;
	}

	const intentName = parsedArgs.intentName;
	const extra = parsedArgs.extra;

	if (!intentName) {
		printUsageError(reporter, t(lang, 'run.error.missingIntent'), 'mf run --help', getRunHelp(lang), lang);
		return 1;
	}

	if (extra.length > 0) {
		printUsageError(reporter, t(lang, 'cli.error.unexpectedArgument', { argument: extra[0] }), 'mf run --help', getRunHelp(lang), lang);
		return 1;
	}

	const projectRoot = profiler.measure('root_detection', () => resolveMustflowRoot());
	const rootTrust = profiler.measure('root_trust', () => assessRunRootTrust(projectRoot));

	if (!previewMode && !allowUntrustedRoot && !rootTrust.trusted) {
		const message =
			rootTrust.reason === 'manifest_lock_invalid'
				? t(lang, 'run.error.untrustedRootInvalid', { detail: rootTrust.detail ?? rootTrust.manifestLockPath })
				: t(lang, 'run.error.untrustedRootMissing', { path: rootTrust.detail ?? rootTrust.manifestLockPath });
		reporter.stderr(renderCliError(message, 'mf run --help', lang));
		return 1;
	}

	const contract = profiler.measure('command_contract', () => readCommandContract(projectRoot));
	const plan = profiler.measure('plan_creation', () =>
		createRunPlan(projectRoot, contract, intentName, { testTargets: options.testTargets }),
	);

	if (previewMode) {
		profiler.measure('preview_render', () => {
			if (json) {
				reporter.stdout(JSON.stringify(createRunPreview(plan, previewMode), null, 2));
			} else {
				reporter.stdout(renderRunPreviewText(plan, previewMode, lang));
			}
		});
		writeLatestProfile(profiler, options, {
			projectRoot,
			intent: intentName,
			status: plan.ok ? 'previewed' : 'blocked',
			previewMode,
		});

		return plan.ok ? 0 : 1;
	}

	if (!plan.ok) {
		reportRunPlanFailure(plan, reporter, lang);
		writeLatestProfile(profiler, options, {
			projectRoot,
			intent: intentName,
			status: 'blocked',
			previewMode: null,
		});
		return 1;
	}

	const activeRunLock = await profiler.measureAsync('active_lock_acquire', () =>
		acquireActiveRunLockWithOptionalWait({
			enabled: parsedArgs.wait,
			waitTimeoutSeconds: parsedArgs.waitTimeoutSeconds,
			projectRoot,
			contract,
			intentName,
			commandHash: createPlanCommandHash(plan),
			json,
			reporter,
			lang,
		}),
	);

	if (!activeRunLock.ok) {
		reporter.stderr(renderCliError(renderActiveLockConflictMessage(intentName, activeRunLock.conflicts, lang), 'mf run --dry-run --json', lang));
		writeLatestProfile(profiler, options, {
			projectRoot,
			intent: intentName,
			status: 'blocked',
			previewMode: null,
		});
		return 1;
	}

	try {

	const runReceiptPolicy = profiler.measure('retention_policy', () =>
		resolveRunReceiptRetentionPolicy(readMustflowConfigIfExists(projectRoot)),
	);
	const env = profiler.measure('environment', () =>
		createCommandEnv(projectRoot, { policy: plan.envPolicy, allowlist: plan.envAllowlist }),
	);
	const writeTracker = profiler.measure('write_drift_before', () =>
		startRunWriteTracking(projectRoot, contract, intentName, {
			additionalDeclaredPaths: options.additionalDeclaredWritePaths,
			env,
		}),
	);
	const stdoutTailBytes = Math.min(runReceiptPolicy.stdoutTailBytes, plan.maxOutputBytes);
	const stderrTailBytes = Math.min(runReceiptPolicy.stderrTailBytes, plan.maxOutputBytes);
	let streamedOutput = false;

	const childStartedAtMs = performance.now();
	const startedAt = new Date();
	const stopRunProgress = createRunProgressReporter({
		enabled: !json && Boolean(reporter.writeStderr),
		intentName,
		timeoutSeconds: plan.timeoutSeconds,
		reporter,
		lang,
	});
	const result = await profiler.measureAsync('child_command', async () => {
		try {
			if (plan.commandArgv) {
				streamedOutput = !json;
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
					!json,
					true,
				);
			}

			streamedOutput = !json;
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
				!json,
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
			intentName,
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
	writeLatestProfile(profiler, options, {
		projectRoot,
		intent: intentName,
		status: runStatus,
		previewMode: null,
	});

	if (json) {
		reporter.stdout(JSON.stringify(receipt, null, 2));
		return runStatus === 'passed' ? 0 : 1;
	}

	if (!streamedOutput) {
		emitOutput(reporter, result.stdout, 'stdout');
		emitOutput(reporter, result.stderr, 'stderr');
	}

	if (result.error) {
		const errorWithCode = result.error as NodeJS.ErrnoException;
		if (errorWithCode.code === 'ETIMEDOUT') {
			reporter.stderr(t(lang, 'run.error.timedOut', { intent: intentName, seconds: plan.timeoutSeconds }));
			return 1;
		}

		if (isOutputLimitExceededError(result.error)) {
			reporter.stderr(t(lang, 'run.error.outputLimitExceeded', { intent: intentName, message: result.error.message }));
			return 1;
		}

		reporter.stderr(t(lang, 'run.error.startFailed', { intent: intentName, message: result.error.message }));
		return 1;
	}

	return runStatus === 'passed' ? 0 : 1;
	} finally {
		activeRunLock.handle.release();
	}
}
