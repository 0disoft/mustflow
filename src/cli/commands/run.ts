import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import path from 'node:path';

import { printUsageError, renderCliError, renderHelp } from '../lib/cli-output.js';
import {
	isRecord,
	readCommandContract,
	readPositiveInteger,
	readString,
	readStringArray,
	type TomlTable,
} from '../lib/command-contract.js';
import type { CliLang } from '../lib/i18n.js';
import { resolveMustflowRoot } from '../lib/project-root.js';
import type { Reporter } from '../lib/reporter.js';
import { createRunReceipt, writeRunReceipt, type RunReceiptStatus } from '../lib/run-receipt.js';

function resolveSafeCwd(projectRoot: string, rawCwd: string | undefined): string {
	const cwd = rawCwd ?? '.';
	const resolved = path.resolve(projectRoot, cwd);
	const root = path.resolve(projectRoot);
	const resolvedLower = resolved.toLowerCase();
	const rootLower = root.toLowerCase();

	if (resolvedLower !== rootLower && !resolvedLower.startsWith(`${rootLower}${path.sep}`)) {
		throw new Error(`Intent cwd must stay inside the current root: ${cwd}`);
	}

	return resolved;
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
			summary:
				lang === 'ko'
					? '.mustflow/config/commands.toml에 설정된 끝나는 명령 의도를 실행합니다.'
					: 'Run a configured finite command intent from .mustflow/config/commands.toml.',
			options: [
				{ label: '--json', description: lang === 'ko' ? '실행 결과 영수증을 JSON으로 출력합니다' : 'Print the run receipt as JSON' },
				{ label: '-h, --help', description: lang === 'ko' ? '이 도움말을 보여줍니다' : 'Show this help message' },
			],
			examples: ['mf run test', 'mf run lint --json', 'mf run mustflow_check'],
			exitCodes: [
				{
					label: '0',
					description:
						lang === 'ko'
							? '명령 의도가 허용된 종료 코드로 끝났습니다'
							: 'The command intent completed with an allowed exit code',
				},
				{
					label: '1',
					description:
						lang === 'ko'
							? '의도가 잘못되었거나, 거부되었거나, 제한 시간을 넘겼거나, 실패했습니다'
							: 'The intent was invalid, refused, timed out, or failed',
				},
			],
		},
		lang,
	);
}

export function runRun(args: string[], reporter: Reporter, lang: CliLang = 'en'): number {
	if (args.includes('--help') || args.includes('-h')) {
		reporter.stdout(getRunHelp(lang));
		return 0;
	}

	const supportedOptions = new Set(['--json']);
	const unsupported = args.filter((arg) => arg.startsWith('-') && !supportedOptions.has(arg));

	if (unsupported.length > 0) {
		printUsageError(reporter, `Unknown option: ${unsupported[0]}`, 'mf run --help', getRunHelp(lang), lang);
		return 1;
	}

	const json = args.includes('--json');
	const positional = args.filter((arg) => !supportedOptions.has(arg));
	const [intentName, ...extra] = positional;

	if (!intentName) {
		printUsageError(reporter, 'Missing command intent name', 'mf run --help', getRunHelp(lang), lang);
		return 1;
	}

	if (extra.length > 0) {
		printUsageError(reporter, `Unexpected argument: ${extra[0]}`, 'mf run --help', getRunHelp(lang), lang);
		return 1;
	}

	const projectRoot = resolveMustflowRoot();
	const contract = readCommandContract(projectRoot);
	const intent = contract.intents[intentName];

	if (!isRecord(intent)) {
		reporter.stderr(renderCliError(`Unknown command intent: ${intentName}`, 'mf help commands', lang));
		return 1;
	}

	const intentStatus = readString(intent, 'status') ?? 'unknown';
	if (intentStatus !== 'configured') {
		reporter.stderr(
			renderCliError(`Intent "${intentName}" is ${intentStatus}; only configured intents can be run`, 'mf help commands', lang),
		);
		return 1;
	}

	const lifecycle = readString(intent, 'lifecycle');
	if (lifecycle !== 'oneshot') {
		reporter.stderr(
			renderCliError(
				`Refused: intent "${intentName}" has lifecycle = "${lifecycle ?? 'unknown'}"; mf run only executes oneshot intents`,
				'mf help commands',
				lang,
			),
		);
		return 1;
	}

	const runPolicy = readString(intent, 'run_policy');
	if (runPolicy !== 'agent_allowed') {
		reporter.stderr(
			renderCliError(`Intent "${intentName}" requires run_policy = "agent_allowed" for mf run`, 'mf help commands', lang),
		);
		return 1;
	}

	if (intent.stdin !== 'closed') {
		reporter.stderr(renderCliError(`Intent "${intentName}" must set stdin = "closed"`, 'mf help commands', lang));
		return 1;
	}

	const timeoutSeconds = readPositiveInteger(intent, 'timeout_seconds');
	if (!timeoutSeconds) {
		reporter.stderr(renderCliError(`Intent "${intentName}" must define timeout_seconds`, 'mf help commands', lang));
		return 1;
	}

	const maxOutputBytes =
		readPositiveInteger(intent, 'max_output_bytes') ?? readPositiveInteger(contract.defaults, 'max_output_bytes') ?? 1_048_576;
	const cwd = resolveSafeCwd(projectRoot, readString(intent, 'cwd') ?? readString(contract.defaults, 'default_cwd'));
	const successExitCodes = getSuccessExitCodes(intent);
	const argv = readStringArray(intent, 'argv');
	const commandArgv = argv && argv.length > 0 ? argv : undefined;
	const shellCommand = intent.mode === 'shell' ? readString(intent, 'cmd') : undefined;
	const env = createCommandEnv(projectRoot);

	if (!commandArgv && !shellCommand) {
		reporter.stderr(
			renderCliError(`Intent "${intentName}" must define argv or mode = "shell" with cmd`, 'mf help commands', lang),
		);
		return 1;
	}

	const mode = commandArgv ? 'argv' : 'shell';
	const startedAt = new Date();
	const argvExecutable = commandArgv ? resolveCommandExecutable(projectRoot, commandArgv[0] ?? '') : undefined;
	const result =
		commandArgv
			? spawnSync(argvExecutable ?? '', commandArgv.slice(1), {
					cwd,
					encoding: 'utf8',
					input: '',
					maxBuffer: maxOutputBytes,
					env,
					shell: shouldUseShellForArgvExecutable(argvExecutable ?? ''),
					stdio: ['ignore', 'pipe', 'pipe'],
					timeout: timeoutSeconds * 1000,
					windowsHide: true,
				})
			: spawnSync(shellCommand ?? '', {
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
		lifecycle,
		runPolicy,
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
			reporter.stderr(`Intent "${intentName}" timed out after ${timeoutSeconds} seconds`);
			return 1;
		}

		reporter.stderr(`Intent "${intentName}" failed to start: ${result.error.message}`);
		return 1;
	}

	return runStatus === 'passed' ? 0 : 1;
}
