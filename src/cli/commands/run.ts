import { spawnSync } from 'node:child_process';

import { runCheck } from './check.js';
import { runClassify } from './classify.js';
import { runContext } from './context.js';
import { runDoctor } from './doctor.js';
import { runHelp } from './help.js';
import { runImpact } from './impact.js';
import { runLineEndings } from './line-endings.js';
import { runMap } from './map.js';
import { runStatus } from './status.js';
import { runUpdate } from './update.js';
import { runVersionSources } from './version-sources.js';
import { canRunMustflowBuiltinInProcess, isMustflowBinName } from '../../core/command-classification.js';
import { createCommandEnv } from '../../core/command-env.js';
import { printUsageError, renderCliError, renderHelp } from '../lib/cli-output.js';
import { readCommandContract, readMustflowConfigIfExists } from '../../core/config-loading.js';
import { resolveRunReceiptRetentionPolicy } from '../../core/retention-policy.js';
import { t, type CliLang, type MessageKey } from '../lib/i18n.js';
import { getPackageVersion } from '../lib/package-info.js';
import { resolveMustflowRoot } from '../lib/project-root.js';
import type { Reporter } from '../lib/reporter.js';
import {
	createRunPlan,
	createRunPreview,
	isMustflowBuiltinIntent,
	renderRunPreviewText,
	type BlockedRunPlan,
	type ResolvedArgvCommand,
	type RunPreviewMode,
} from '../lib/run-plan.js';
import { createRunReceipt, writeRunReceipt, type RunReceiptStatus } from '../../core/run-receipt.js';
import { finishRunWriteTracking, startRunWriteTracking } from '../../core/run-write-drift.js';

interface CommandResult {
	readonly status: number | null;
	readonly signal: string | null;
	readonly error?: Error;
	readonly stdout: string;
	readonly stderr: string;
	readonly pid?: number;
}

interface BufferedReporter {
	readonly reporter: Reporter;
	readonly stdout: () => string;
	readonly stderr: () => string;
}

function emitOutput(reporter: Reporter, output: string | Buffer | null, stream: 'stdout' | 'stderr'): void {
	if (!output) {
		return;
	}

	const text = output.toString().trimEnd();

	if (text.length === 0) {
		return;
	}

	reporter[stream](text);
}

function terminateProcessTree(pid: number | undefined): void {
	if (!pid || pid <= 0) {
		return;
	}

	if (process.platform === 'win32') {
		spawnSync('taskkill', ['/PID', String(pid), '/T', '/F'], {
			stdio: 'ignore',
			windowsHide: true,
		});
		return;
	}

	try {
		process.kill(-pid, 'SIGTERM');
	} catch {
		try {
			process.kill(pid, 'SIGTERM');
		} catch {
			// The child may already be gone after Node's spawn timeout handling.
		}
	}
}

function getKillMethod(): string {
	return process.platform === 'win32' ? 'taskkill_process_tree' : 'process_group_sigterm';
}

function createBufferedReporter(): BufferedReporter {
	const stdout: string[] = [];
	const stderr: string[] = [];

	return {
		reporter: {
			stdout(message) {
				stdout.push(`${message}\n`);
			},
			stderr(message) {
				stderr.push(`${message}\n`);
			},
		},
		stdout() {
			return stdout.join('');
		},
		stderr() {
			return stderr.join('');
		},
	};
}

/**
 * mf:anchor cli.run.builtin-inprocess
 * purpose: Dispatch selected mustflow built-in commands without spawning a nested CLI process.
 * search: builtin intent, in-process command, nested mf run, run receipt
 * invariant: Only commands classified by command-classification can use this path.
 * risk: config, state
 */
async function runKnownBuiltinCommand(args: readonly string[], reporter: Reporter, lang: CliLang): Promise<number | undefined> {
	const [command, ...commandArgs] = args;

	if ((command === '--version' || command === '-v' || command === 'version') && commandArgs.length === 0) {
		reporter.stdout(getPackageVersion());
		return 0;
	}

	if (!canRunMustflowBuiltinInProcess(command)) {
		return undefined;
	}

	if (command === 'check') {
		return runCheck(commandArgs, reporter, lang);
	}

	if (command === 'classify') {
		return runClassify(commandArgs, reporter, lang);
	}

	if (command === 'context') {
		return runContext(commandArgs, reporter, lang);
	}

	if (command === 'doctor') {
		return runDoctor(commandArgs, reporter, lang);
	}

	if (command === 'help') {
		return runHelp(commandArgs, reporter, lang);
	}

	if (command === 'impact') {
		return runImpact(commandArgs, reporter, lang);
	}

	if (command === 'line-endings') {
		return runLineEndings(commandArgs, reporter, lang);
	}

	if (command === 'map') {
		return runMap(commandArgs, reporter, lang);
	}

	if (command === 'status') {
		return runStatus(commandArgs, reporter, lang);
	}

	if (command === 'update') {
		return runUpdate(commandArgs, reporter, lang);
	}

	if (command === 'version-sources') {
		return runVersionSources(commandArgs, reporter, lang);
	}

	return undefined;
}

async function withWorkingDirectory<T>(cwd: string, callback: () => T | Promise<T>): Promise<T> {
	const previousCwd = process.cwd();

	process.chdir(cwd);

	try {
		return await callback();
	} finally {
		process.chdir(previousCwd);
	}
}

async function runBuiltinArgvInProcess(commandArgv: readonly string[], cwd: string, lang: CliLang): Promise<CommandResult | undefined> {
	const [command = '', ...builtinArgs] = commandArgv;

	if (!isMustflowBinName(command)) {
		return undefined;
	}

	const output = createBufferedReporter();

	try {
		const status = await withWorkingDirectory(cwd, () => runKnownBuiltinCommand(builtinArgs, output.reporter, lang));

		if (status === undefined) {
			return undefined;
		}

		return {
			status,
			signal: null,
			stdout: output.stdout(),
			stderr: output.stderr(),
		};
	} catch (error) {
		const message = error instanceof Error ? error.message : String(error);

		return {
			status: 1,
			signal: null,
			stdout: output.stdout(),
			stderr: `${output.stderr()}${message}\n`,
		};
	}
}

function runArgvCommand(
	command: ResolvedArgvCommand | undefined,
	cwd: string,
	maxOutputBytes: number,
	env: NodeJS.ProcessEnv,
	timeoutSeconds: number,
): CommandResult {
	return spawnSync(command?.executable ?? '', command?.args ?? [], {
		cwd,
		encoding: 'utf8',
		input: '',
		maxBuffer: maxOutputBytes,
		env,
		shell: command?.shell ?? false,
		stdio: ['ignore', 'pipe', 'pipe'],
		timeout: timeoutSeconds * 1000,
		windowsHide: true,
	});
}

function runShellCommand(
	command: string | undefined,
	cwd: string,
	maxOutputBytes: number,
	env: NodeJS.ProcessEnv,
	timeoutSeconds: number,
): CommandResult {
	return spawnSync(command ?? '', {
		cwd,
		encoding: 'utf8',
		input: '',
		maxBuffer: maxOutputBytes,
		env,
		shell: true,
		stdio: ['ignore', 'pipe', 'pipe'],
		timeout: timeoutSeconds * 1000,
		windowsHide: true,
	});
}

function getRunStatus(error: Error | undefined, exitCode: number | null, successExitCodes: readonly number[]): RunReceiptStatus {
	const errorWithCode = error as NodeJS.ErrnoException | undefined;

	if (errorWithCode?.code === 'ETIMEDOUT') {
		return 'timed_out';
	}

	if (error) {
		return 'start_failed';
	}

	return exitCode !== null && successExitCodes.includes(exitCode) ? 'passed' : 'failed';
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
		case 'cwd_outside_project':
			message = t(lang, 'run.error.cwdOutsideProject', {
				intent: plan.intentName,
				detail: getRunPlanDetail(plan, lang, 'run.error.cwdOutsideProjectDetail'),
			});
			break;
		case 'intent_not_table':
		default:
			message = t(lang, 'run.error.unknownIntent', { intent: plan.intentName });
			break;
	}

	reporter.stderr(renderCliError(message, 'mf help commands', lang));
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
export async function runRun(args: string[], reporter: Reporter, lang: CliLang = 'en'): Promise<number> {
	if (args.includes('--help') || args.includes('-h')) {
		reporter.stdout(getRunHelp(lang));
		return 0;
	}

	const supportedOptions = new Set(['--json', '--dry-run', '--plan-only']);
	const unsupported = args.filter((arg) => arg.startsWith('-') && !supportedOptions.has(arg));

	if (unsupported.length > 0) {
		printUsageError(reporter, t(lang, 'cli.error.unknownOption', { option: unsupported[0] }), 'mf run --help', getRunHelp(lang), lang);
		return 1;
	}

	const json = args.includes('--json');
	const dryRun = args.includes('--dry-run');
	const planOnly = args.includes('--plan-only');
	const previewMode: RunPreviewMode | null = dryRun ? 'dry-run' : planOnly ? 'plan-only' : null;

	if (dryRun && planOnly) {
		printUsageError(reporter, t(lang, 'run.error.conflictingPreviewModes'), 'mf run --help', getRunHelp(lang), lang);
		return 1;
	}

	const positional = args.filter((arg) => !supportedOptions.has(arg));
	const [intentName, ...extra] = positional;

	if (!intentName) {
		printUsageError(reporter, t(lang, 'run.error.missingIntent'), 'mf run --help', getRunHelp(lang), lang);
		return 1;
	}

	if (extra.length > 0) {
		printUsageError(reporter, t(lang, 'cli.error.unexpectedArgument', { argument: extra[0] }), 'mf run --help', getRunHelp(lang), lang);
		return 1;
	}

	const projectRoot = resolveMustflowRoot();
	const contract = readCommandContract(projectRoot);
	const plan = createRunPlan(projectRoot, contract, intentName);

	if (previewMode) {
		if (json) {
			reporter.stdout(JSON.stringify(createRunPreview(plan, previewMode), null, 2));
		} else {
			reporter.stdout(renderRunPreviewText(plan, previewMode));
		}

		return plan.ok ? 0 : 1;
	}

	if (!plan.ok) {
		reportRunPlanFailure(plan, reporter, lang);
		return 1;
	}

	const runReceiptPolicy = resolveRunReceiptRetentionPolicy(readMustflowConfigIfExists(projectRoot));
	const env = createCommandEnv(projectRoot, { policy: plan.envPolicy, allowlist: plan.envAllowlist });
	const lifecycleValue = plan.lifecycle ?? 'oneshot';
	const runPolicyValue = plan.runPolicy ?? 'agent_allowed';
	const writeTracker = startRunWriteTracking(projectRoot, contract, intentName);

	const startedAt = new Date();
	const result =
		plan.commandArgv && isMustflowBuiltinIntent(plan.intent)
			? ((await runBuiltinArgvInProcess(plan.commandArgv, plan.cwd, lang)) ??
				runArgvCommand(plan.argvCommand, plan.cwd, plan.maxOutputBytes, env, plan.timeoutSeconds))
		: plan.commandArgv
			? runArgvCommand(plan.argvCommand, plan.cwd, plan.maxOutputBytes, env, plan.timeoutSeconds)
			: runShellCommand(plan.shellCommand, plan.cwd, plan.maxOutputBytes, env, plan.timeoutSeconds);
	const finishedAt = new Date();
	const writeDrift = finishRunWriteTracking(writeTracker);
	const exitCode = typeof result.status === 'number' ? result.status : null;
	const runStatus = getRunStatus(result.error, exitCode, plan.successExitCodes);
	let killMethod: string | null = null;

	if (runStatus === 'timed_out') {
		killMethod = getKillMethod();
		terminateProcessTree(result.pid);
	}

	const receipt = createRunReceipt({
		intent: intentName,
		status: runStatus,
		timedOut: runStatus === 'timed_out',
		startedAt,
		finishedAt,
		projectRoot,
		cwd: plan.cwd,
		lifecycle: lifecycleValue,
		runPolicy: runPolicyValue,
		mode: plan.mode,
		argv: plan.commandArgv,
		cmd: plan.shellCommand,
		envPolicy: plan.envPolicy,
		envAllowlist: plan.envAllowlist,
		timeoutSeconds: plan.timeoutSeconds,
		maxOutputBytes: plan.maxOutputBytes,
		successExitCodes: plan.successExitCodes,
		exitCode,
		signal: result.signal,
		error: result.error?.message ?? null,
		killMethod,
		stdout: result.stdout,
		stderr: result.stderr,
		writeDrift,
		stdoutTailBytes: runReceiptPolicy.stdoutTailBytes,
		stderrTailBytes: runReceiptPolicy.stderrTailBytes,
	});

	writeRunReceipt(projectRoot, receipt);

	if (json) {
		reporter.stdout(JSON.stringify(receipt, null, 2));
		return runStatus === 'passed' ? 0 : 1;
	}

	emitOutput(reporter, result.stdout, 'stdout');
	emitOutput(reporter, result.stderr, 'stderr');

	if (result.error) {
		const errorWithCode = result.error as NodeJS.ErrnoException;
		if (errorWithCode.code === 'ETIMEDOUT') {
			reporter.stderr(t(lang, 'run.error.timedOut', { intent: intentName, seconds: plan.timeoutSeconds }));
			return 1;
		}

		reporter.stderr(t(lang, 'run.error.startFailed', { intent: intentName, message: result.error.message }));
		return 1;
	}

	return runStatus === 'passed' ? 0 : 1;
}
