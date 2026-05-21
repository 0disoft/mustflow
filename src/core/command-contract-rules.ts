import path from 'node:path';

import { readString, readStringArray, type TomlTable } from './config-loading.js';

const SAFE_COMMAND_INTENT_NAME_PATTERN = /^[A-Za-z0-9_-]+$/u;
const SHELL_WRAPPER_COMMANDS = new Set(['sh', 'bash', 'zsh', 'dash', 'ksh', 'cmd', 'powershell', 'pwsh']);
const SHELL_EVALUATION_FLAGS = new Set(['-c', '/c', '-command', '-commandwithargs']);
const INTERPRETER_EVALUATION_FLAGS = new Map<string, ReadonlySet<string>>([
	['node', new Set(['-e', '--eval'])],
	['python', new Set(['-c'])],
	['python3', new Set(['-c'])],
	['py', new Set(['-c'])],
	['ruby', new Set(['-e'])],
	['perl', new Set(['-e'])],
	['julia', new Set(['-e', '--eval'])],
]);
const INTERPRETER_LONG_RUNNING_MODULES = new Map<string, ReadonlySet<string>>([
	['python', new Set(['http.server', 'simplehttpserver'])],
	['python3', new Set(['http.server', 'simplehttpserver'])],
	['py', new Set(['http.server', 'simplehttpserver'])],
]);
const PACKAGE_SCRIPT_RUNNERS = new Set(['bun', 'npm', 'pnpm', 'yarn']);
const LONG_RUNNING_PACKAGE_SCRIPTS = new Set(['dev', 'start', 'serve', 'watch', 'preview']);
const LONG_RUNNING_EXECUTABLES = new Set(['nodemon', 'pm2', 'serve', 'http-server', 'live-server', 'webpack-dev-server']);
const PACKAGE_EXEC_RUNNERS = new Set(['npx', 'bunx']);
const ATTACHED_EVALUATION_FLAGS = new Set(['-command', '-commandwithargs']);

export const BACKGROUND_SHELL_PATTERNS = [
	/(?:^|[^&])&(?!&)\s*$/u,
	/\bnohup\b/iu,
	/\bdisown\b/iu,
	/\bStart-Process\b/iu,
	/(?:^|[;&|]\s*)start\s+/iu,
	/\bxdg-open\b/iu,
	/\bopen\s+/iu,
	/\bchrome(?:\.exe)?\b/iu,
	/\bchromium(?:\.exe)?\b/iu,
] as const;

export const LONG_RUNNING_COMMAND_TEXT_PATTERNS = [
	/\b(?:npm|pnpm|bun|yarn)\s+(?:run\s+)?(?:dev|start|serve|watch|preview)\b/iu,
	/\b(?:npx|bunx)\s+(?:-[^\s]+\s+)*(?:vite|nodemon|pm2|serve|http-server|live-server|webpack-dev-server)\b/iu,
	/\b(?:npm|pnpm|yarn)\s+(?:exec|x|dlx)\s+(?:-[^\s]+\s+)*(?:vite|nodemon|pm2|serve|http-server|live-server|webpack-dev-server)\b/iu,
	/\bnext\s+(?:dev|start)\b/iu,
	/\bturbo\s+dev\b/iu,
	/\btsx\s+(?:watch|--watch|-w)\b/iu,
	/\bcargo\s+(?:watch|tauri\s+dev)\b/iu,
	/\bzig\s+build\b(?=.*(?:--watch|-w|\bwatch\b))/iu,
	/\btauri\s+dev\b/iu,
	/\bgh\s+(?:run\s+watch|codespace\s+ssh|codespace\s+logs\b.*(?:--follow|-f))\b/iu,
	/\bdeno\s+(?:serve|task\s+(?:dev|start|serve|watch|preview)|run\b.*(?:--watch|-w))\b/iu,
	/\bflutter\s+(?:run|attach|logs)\b/iu,
	/\bdart\s+run\s+build_runner\s+watch\b/iu,
	/\bgo\s+run\s+(?:(?:github\.com\/(?:air-verse|cosmtrek)\/air)(?:\/v\d+)?|.*\bair\b)/iu,
	/\b(?:python|python3|py)\s+-m\s+(?:http\.server|SimpleHTTPServer)\b/u,
	/\b(?:nohup|disown)\b/iu,
	/(?:^|[^&])&(?!&)\s*$/u,
	/\bsetInterval\s*\(/u,
	/\bwhile\s*(?:\(\s*true\s*\)|true)\b/iu,
	/\bserve_forever\s*\(/iu,
	/\bcreateServer\s*\([^)]*\)\s*\.listen\s*\(/u,
] as const;

export type BlockedCommandPatternCode = 'shell_background_pattern' | 'long_running_command_pattern';

export interface BlockedCommandPattern {
	readonly code: BlockedCommandPatternCode;
	readonly detail: string;
}

export function commandIntentNameIsSafe(intentName: string): boolean {
	return SAFE_COMMAND_INTENT_NAME_PATTERN.test(intentName);
}

export function commandIntentHasCommandSource(intent: TomlTable): boolean {
	const argv = readStringArray(intent, 'argv');
	const shellCommand = intent.mode === 'shell' ? readString(intent, 'cmd') : undefined;

	return Boolean((argv && argv.length > 0) || shellCommand);
}

export function shellCommandHasBlockedBackgroundPattern(command: string): boolean {
	return BACKGROUND_SHELL_PATTERNS.some((pattern) => pattern.test(command));
}

function normalizeExecutableName(value: string): string {
	return path.basename(value).replace(/\.(?:cmd|exe|ps1)$/iu, '').toLowerCase();
}

function flagAllowsAttachedPayload(flag: string): boolean {
	return (flag.startsWith('-') && !flag.startsWith('--') && flag.length === 2) || flag === '/c' || ATTACHED_EVALUATION_FLAGS.has(flag);
}

function findFlagPayload(argv: readonly string[], flags: ReadonlySet<string>): string | null {
	for (let index = 1; index < argv.length; index += 1) {
		const argument = argv[index] ?? '';
		const normalizedArgument = argument.toLowerCase();

		if (flags.has(normalizedArgument)) {
			return argv[index + 1] ?? null;
		}

		for (const flag of flags) {
			if (normalizedArgument.startsWith(`${flag}=`)) {
				return argument.slice(flag.length + 1);
			}

			if (flagAllowsAttachedPayload(flag) && normalizedArgument.startsWith(flag) && argument.length > flag.length) {
				return argument.slice(flag.length);
			}
		}
	}

	return null;
}

function commandTextHasLongRunningPattern(command: string): boolean {
	return LONG_RUNNING_COMMAND_TEXT_PATTERNS.some((pattern) => pattern.test(command));
}

function readPackageScriptName(command: string, args: readonly string[]): string | null {
	if (!PACKAGE_SCRIPT_RUNNERS.has(command)) {
		return null;
	}

	if (args[0] === 'run' && args[1] && !args[1].startsWith('-')) {
		return args[1];
	}

	if (args[0] && LONG_RUNNING_PACKAGE_SCRIPTS.has(args[0])) {
		return args[0];
	}

	return null;
}

function findFirstNonOptionArgument(args: readonly string[]): { readonly value: string; readonly index: number } | null {
	for (let index = 0; index < args.length; index += 1) {
		const argument = args[index] ?? '';

		if (argument === '--') {
			const value = args[index + 1];
			return value ? { value, index: index + 1 } : null;
		}

		if (argument.length > 0 && !argument.startsWith('-')) {
			return { value: argument, index };
		}
	}

	return null;
}

function readPackageExecCommand(command: string, args: readonly string[]): { readonly command: string; readonly args: readonly string[] } | null {
	if (PACKAGE_EXEC_RUNNERS.has(command)) {
		const target = findFirstNonOptionArgument(args);
		return target ? { command: normalizeExecutableName(target.value), args: args.slice(target.index + 1) } : null;
	}

	if (command === 'npm' && ['exec', 'x'].includes(args[0] ?? '')) {
		const target = findFirstNonOptionArgument(args.slice(1));
		return target ? { command: normalizeExecutableName(target.value), args: args.slice(target.index + 2) } : null;
	}

	if ((command === 'pnpm' || command === 'yarn') && ['exec', 'dlx'].includes(args[0] ?? '')) {
		const target = findFirstNonOptionArgument(args.slice(1));
		return target ? { command: normalizeExecutableName(target.value), args: args.slice(target.index + 2) } : null;
	}

	return null;
}

function hasWatchFlag(args: readonly string[]): boolean {
	return args.some((arg) => arg === '--watch' || arg === '-w' || arg === 'watch' || arg.startsWith('--watch='));
}

function longRunningExecutableDetail(command: string, args: readonly string[]): string | null {
	if (LONG_RUNNING_EXECUTABLES.has(command)) {
		return `executable "${command}" is commonly long-running`;
	}

	if (command === 'vite' && !args.includes('build')) {
		return 'vite without build is commonly a development server';
	}

	if (command === 'next' && ['dev', 'start'].includes(args[0] ?? '')) {
		return `next ${args[0]} is commonly long-running`;
	}

	if (command === 'webpack' && (args.includes('--watch') || args.includes('-w') || args.includes('serve'))) {
		return 'webpack watch or serve mode is commonly long-running';
	}

	if (command === 'tsc' && (args.includes('--watch') || args.includes('-w'))) {
		return 'tsc watch mode is long-running';
	}

	if (command === 'tsx' && ['watch', '--watch', '-w'].includes(args[0] ?? '')) {
		return `tsx ${args[0]} is commonly long-running`;
	}

	if (command === 'turbo' && args[0] === 'dev') {
		return 'turbo dev is commonly long-running';
	}

	if (command === 'cargo' && args[0] === 'watch') {
		return 'cargo watch is commonly long-running';
	}

	if (command === 'cargo' && args[0] === 'tauri' && args[1] === 'dev') {
		return 'cargo tauri dev is commonly long-running';
	}

	if (command === 'zig' && args[0] === 'build' && hasWatchFlag(args.slice(1))) {
		return 'zig build watch mode is commonly long-running';
	}

	if (command === 'tauri' && args[0] === 'dev') {
		return 'tauri dev is commonly long-running';
	}

	if (command === 'gh' && args[0] === 'run' && args[1] === 'watch') {
		return 'gh run watch is commonly long-running';
	}

	if (command === 'gh' && args[0] === 'codespace' && args[1] === 'ssh') {
		return 'gh codespace ssh is interactive and commonly long-running';
	}

	if (command === 'gh' && args[0] === 'codespace' && args[1] === 'logs' && (args.includes('--follow') || args.includes('-f'))) {
		return 'gh codespace logs follow mode is commonly long-running';
	}

	if (command === 'deno' && args[0] === 'task' && args[1] && LONG_RUNNING_PACKAGE_SCRIPTS.has(args[1])) {
		return `deno task ${args[1]} is commonly long-running`;
	}

	if (command === 'deno' && args[0] === 'serve') {
		return 'deno serve is commonly long-running';
	}

	if (command === 'deno' && args[0] === 'run' && hasWatchFlag(args.slice(1))) {
		return 'deno run watch mode is commonly long-running';
	}

	if (command === 'flutter' && ['run', 'attach', 'logs'].includes(args[0] ?? '')) {
		return `flutter ${args[0]} is commonly long-running`;
	}

	if (command === 'dart' && args[0] === 'run' && args[1] === 'build_runner' && args[2] === 'watch') {
		return 'dart build_runner watch is commonly long-running';
	}

	if (command === 'go' && args[0] === 'run' && args.some((arg) => /(?:^|\/)(?:air)(?:$|@)/iu.test(arg))) {
		return 'go run air is commonly long-running';
	}

	return null;
}

function argvHasBlockedLongRunningPattern(argv: readonly string[]): string | null {
	const [rawCommand = '', ...args] = argv;
	const command = normalizeExecutableName(rawCommand);

	const shellPayload = SHELL_WRAPPER_COMMANDS.has(command) ? findFlagPayload(argv, SHELL_EVALUATION_FLAGS) : null;
	if (shellPayload && (shellCommandHasBlockedBackgroundPattern(shellPayload) || commandTextHasLongRunningPattern(shellPayload))) {
		return `shell wrapper payload contains a blocked long-running or background pattern: ${shellPayload}`;
	}

	const interpreterFlags = INTERPRETER_EVALUATION_FLAGS.get(command);
	const interpreterPayload = interpreterFlags ? findFlagPayload(argv, interpreterFlags) : null;
	if (interpreterPayload && commandTextHasLongRunningPattern(interpreterPayload)) {
		return `interpreter evaluation payload contains a blocked long-running pattern: ${interpreterPayload}`;
	}

	const interpreterModules = INTERPRETER_LONG_RUNNING_MODULES.get(command);
	const moduleFlagIndex = args.indexOf('-m');
	const moduleName = moduleFlagIndex >= 0 ? args[moduleFlagIndex + 1]?.toLowerCase() : null;
	if (moduleName && interpreterModules?.has(moduleName)) {
		return `interpreter module "${moduleName}" is commonly long-running`;
	}

	const packageScriptName = readPackageScriptName(command, args);
	if (packageScriptName && LONG_RUNNING_PACKAGE_SCRIPTS.has(packageScriptName)) {
		return `package-manager script "${packageScriptName}" is commonly long-running`;
	}

	const packageExecCommand = readPackageExecCommand(command, args);
	if (packageExecCommand) {
		const detail = longRunningExecutableDetail(packageExecCommand.command, packageExecCommand.args);
		if (detail) {
			return `package-manager exec target ${detail}`;
		}
	}

	return longRunningExecutableDetail(command, args);
}

export function commandIntentBlockedCommandPattern(intent: TomlTable): BlockedCommandPattern | null {
	if (intent.mode === 'shell' && typeof intent.cmd === 'string' && shellCommandHasBlockedBackgroundPattern(intent.cmd)) {
		return {
			code: 'shell_background_pattern',
			detail: 'Shell command contains a blocked long-running or background pattern.',
		};
	}

	if (intent.mode === 'shell' && typeof intent.cmd === 'string' && commandTextHasLongRunningPattern(intent.cmd)) {
		return {
			code: 'long_running_command_pattern',
			detail: `Shell command contains a blocked long-running pattern: ${intent.cmd}.`,
		};
	}

	const argv = readStringArray(intent, 'argv');
	if (!argv) {
		return null;
	}

	const detail = argvHasBlockedLongRunningPattern(argv);
	if (!detail) {
		return null;
	}

	return {
		code: 'long_running_command_pattern',
		detail: `Argv command contains a blocked long-running or background pattern: ${detail}.`,
	};
}
