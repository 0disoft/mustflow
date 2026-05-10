import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import path from 'node:path';

import { runCheck } from './check.js';
import { runClassify } from './classify.js';
import { runContext } from './context.js';
import { runDoctor } from './doctor.js';
import { runExplain } from './explain.js';
import { runHelp } from './help.js';
import { runImpact } from './impact.js';
import { runLineEndings } from './line-endings.js';
import { runMap } from './map.js';
import { runStatus } from './status.js';
import { runUpdate } from './update.js';
import { runVerify } from './verify.js';
import { runVersionSources } from './version-sources.js';
import { canRunMustflowBuiltinInProcess, isMustflowBinName } from '../../core/command-classification.js';
import { resolveSafeProjectCwd } from '../../core/command-cwd.js';
import { evaluateCommandIntentEligibility } from '../../core/command-intent-eligibility.js';
import { printUsageError, renderCliError, renderHelp } from '../lib/cli-output.js';
import {
	isRecord,
	readCommandContract,
	readMustflowConfigIfExists,
	readPositiveInteger,
	readString,
	readStringArray,
	type TomlTable,
} from '../../core/config-loading.js';
import { resolveRunReceiptRetentionPolicy } from '../../core/retention-policy.js';
import { t, type CliLang } from '../lib/i18n.js';
import { getPackageVersion } from '../lib/package-info.js';
import { resolveMustflowRoot } from '../lib/project-root.js';
import type { Reporter } from '../lib/reporter.js';
import { createRunReceipt, writeRunReceipt, type RunReceiptStatus } from '../../core/run-receipt.js';

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

function getSuccessExitCodes(intent: TomlTable): number[] {
	const value = intent.success_exit_codes;

	if (!Array.isArray(value) || value.length === 0 || value.some((entry) => !Number.isInteger(entry))) {
		return [0];
	}

	return value.map(Number);
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

function getPathEnvKey(env: NodeJS.ProcessEnv): string {
	return Object.keys(env).find((key) => key.toLowerCase() === 'path') ?? 'PATH';
}

function createCommandEnv(projectRoot: string): NodeJS.ProcessEnv {
	const env = { ...process.env };
	const pathKey = getPathEnvKey(env);
	const localBinPath = path.join(projectRoot, 'node_modules', '.bin');
	const currentPath = env[pathKey];

	env[pathKey] = currentPath ? `${localBinPath}${path.delimiter}${currentPath}` : localBinPath;

	return env;
}

function hasPathSeparator(value: string): boolean {
	return value.includes('/') || value.includes('\\');
}

function resolveCommandExecutable(projectRoot: string, command: string): string {
	if (command.length === 0 || path.isAbsolute(command) || hasPathSeparator(command)) {
		return command;
	}

	const localBinPath = path.join(projectRoot, 'node_modules', '.bin');
	const candidateNames =
		process.platform === 'win32' ? [`${command}.cmd`, `${command}.exe`, command] : [command];

	for (const candidateName of candidateNames) {
		const candidatePath = path.join(localBinPath, candidateName);

		if (existsSync(candidatePath)) {
			return candidatePath;
		}
	}

	return command;
}

function shouldUseShellForArgvExecutable(executablePath: string): boolean {
	return process.platform === 'win32' && executablePath.toLowerCase().endsWith('.cmd');
}

interface ResolvedArgvCommand {
	readonly executable: string;
	readonly args: string[];
	readonly shell: boolean;
}

function isMustflowBuiltinIntent(intent: TomlTable): boolean {
	return readString(intent, 'kind') === 'mustflow_builtin';
}

function resolveCurrentCliEntrypoint(): string | undefined {
	const entrypoint = process.argv[1];

	return entrypoint ? path.resolve(entrypoint) : undefined;
}

function resolveArgvCommand(projectRoot: string, intent: TomlTable, commandArgv: string[]): ResolvedArgvCommand {
	const [command = '', ...args] = commandArgv;

	if (isMustflowBuiltinIntent(intent) && isMustflowBinName(command)) {
		const entrypoint = resolveCurrentCliEntrypoint();

		if (entrypoint) {
			return {
				executable: process.execPath,
				args: [entrypoint, ...args],
				shell: false,
			};
		}
	}

	const executable = resolveCommandExecutable(projectRoot, command);

	return {
		executable,
		args,
		shell: shouldUseShellForArgvExecutable(executable),
	};
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
function runKnownBuiltinCommand(args: readonly string[], reporter: Reporter, lang: CliLang): number | undefined {
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

	if (command === 'explain') {
		return runExplain(commandArgs, reporter, lang);
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

	if (command === 'verify') {
		return runVerify(commandArgs, reporter, lang);
	}

	return undefined;
}

function withWorkingDirectory<T>(cwd: string, callback: () => T): T {
	const previousCwd = process.cwd();

	process.chdir(cwd);

	try {
		return callback();
	} finally {
		process.chdir(previousCwd);
	}
}

function runBuiltinArgvInProcess(commandArgv: readonly string[], cwd: string, lang: CliLang): CommandResult | undefined {
	const [command = '', ...builtinArgs] = commandArgv;

	if (!isMustflowBinName(command)) {
		return undefined;
	}

	const output = createBufferedReporter();

	try {
		const status = withWorkingDirectory(cwd, () => runKnownBuiltinCommand(builtinArgs, output.reporter, lang));

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

export function getRunHelp(lang: CliLang = 'en'): string {
	return renderHelp(
		{
			usage: 'mf run <intent> [options]',
			summary: t(lang, 'run.help.summary'),
			options: [
				{ label: '--json', description: t(lang, 'run.help.option.json') },
				{ label: '-h, --help', description: t(lang, 'cli.option.help') },
			],
			examples: ['mf run test', 'mf run lint --json', 'mf run mustflow_check'],
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
export function runRun(args: string[], reporter: Reporter, lang: CliLang = 'en'): number {
	if (args.includes('--help') || args.includes('-h')) {
		reporter.stdout(getRunHelp(lang));
		return 0;
	}

	const supportedOptions = new Set(['--json']);
	const unsupported = args.filter((arg) => arg.startsWith('-') && !supportedOptions.has(arg));

	if (unsupported.length > 0) {
		printUsageError(reporter, t(lang, 'cli.error.unknownOption', { option: unsupported[0] }), 'mf run --help', getRunHelp(lang), lang);
		return 1;
	}

	const json = args.includes('--json');
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
	const runReceiptPolicy = resolveRunReceiptRetentionPolicy(readMustflowConfigIfExists(projectRoot));
	const intent = contract.intents[intentName];

	if (!isRecord(intent)) {
		reporter.stderr(renderCliError(t(lang, 'run.error.unknownIntent', { intent: intentName }), 'mf help commands', lang));
		return 1;
	}

	const eligibility = evaluateCommandIntentEligibility(intentName, intent);
	const intentStatus = readString(intent, 'status') ?? 'unknown';
	const lifecycle = readString(intent, 'lifecycle');
	const runPolicy = readString(intent, 'run_policy');
	const timeoutSeconds = readPositiveInteger(intent, 'timeout_seconds');

	if (!eligibility.ok) {
		if (eligibility.code === 'status_not_configured') {
			reporter.stderr(
				renderCliError(t(lang, 'run.error.statusNotConfigured', { intent: intentName, status: intentStatus }), 'mf help commands', lang),
			);
			return 1;
		}

		if (eligibility.code === 'lifecycle_not_oneshot') {
			reporter.stderr(
				renderCliError(
					t(lang, 'run.error.lifecycleNotOneshot', { intent: intentName, lifecycle: lifecycle ?? 'unknown' }),
					'mf help commands',
					lang,
				),
			);
			return 1;
		}

		if (eligibility.code === 'run_policy_not_agent_allowed') {
			reporter.stderr(
				renderCliError(t(lang, 'run.error.runPolicy', { intent: intentName }), 'mf help commands', lang),
			);
			return 1;
		}

		if (eligibility.code === 'stdin_not_closed') {
			reporter.stderr(renderCliError(t(lang, 'run.error.stdin', { intent: intentName }), 'mf help commands', lang));
			return 1;
		}

		if (eligibility.code === 'missing_timeout') {
			reporter.stderr(renderCliError(t(lang, 'run.error.timeout', { intent: intentName }), 'mf help commands', lang));
			return 1;
		}

		if (eligibility.code === 'missing_command_source') {
			reporter.stderr(
				renderCliError(t(lang, 'run.error.commandSource', { intent: intentName }), 'mf help commands', lang),
			);
			return 1;
		}

		reporter.stderr(renderCliError(t(lang, 'run.error.unknownIntent', { intent: intentName }), 'mf help commands', lang));
		return 1;
	}

	const maxOutputBytes =
		readPositiveInteger(intent, 'max_output_bytes') ?? readPositiveInteger(contract.defaults, 'max_output_bytes') ?? 1_048_576;
	if (!timeoutSeconds) {
		reporter.stderr(renderCliError(t(lang, 'run.error.timeout', { intent: intentName }), 'mf help commands', lang));
		return 1;
	}

	const cwd = resolveSafeProjectCwd(projectRoot, readString(intent, 'cwd') ?? readString(contract.defaults, 'default_cwd'));
	const successExitCodes = getSuccessExitCodes(intent);
	const argv = readStringArray(intent, 'argv');
	const commandArgv = argv && argv.length > 0 ? argv : undefined;
	const shellCommand = intent.mode === 'shell' ? readString(intent, 'cmd') : undefined;
	const env = createCommandEnv(projectRoot);
	const lifecycleValue = lifecycle ?? 'oneshot';
	const runPolicyValue = runPolicy ?? 'agent_allowed';

	const mode = commandArgv ? 'argv' : 'shell';
	const startedAt = new Date();
	const argvCommand = commandArgv ? resolveArgvCommand(projectRoot, intent, commandArgv) : undefined;
	const result =
		commandArgv && isMustflowBuiltinIntent(intent)
			? (runBuiltinArgvInProcess(commandArgv, cwd, lang) ??
				runArgvCommand(argvCommand, cwd, maxOutputBytes, env, timeoutSeconds))
		: commandArgv
			? runArgvCommand(argvCommand, cwd, maxOutputBytes, env, timeoutSeconds)
			: runShellCommand(shellCommand, cwd, maxOutputBytes, env, timeoutSeconds);
	const finishedAt = new Date();
	const exitCode = typeof result.status === 'number' ? result.status : null;
	const runStatus = getRunStatus(result.error, exitCode, successExitCodes);
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
		cwd,
		lifecycle: lifecycleValue,
		runPolicy: runPolicyValue,
		mode,
		argv: commandArgv,
		cmd: shellCommand,
		timeoutSeconds,
		maxOutputBytes,
		successExitCodes,
		exitCode,
		signal: result.signal,
		error: result.error?.message ?? null,
		killMethod,
		stdout: result.stdout,
		stderr: result.stderr,
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
			reporter.stderr(t(lang, 'run.error.timedOut', { intent: intentName, seconds: timeoutSeconds }));
			return 1;
		}

		reporter.stderr(t(lang, 'run.error.startFailed', { intent: intentName, message: result.error.message }));
		return 1;
	}

	return runStatus === 'passed' ? 0 : 1;
}
