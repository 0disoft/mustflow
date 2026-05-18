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
]);
const PACKAGE_SCRIPT_RUNNERS = new Set(['bun', 'npm', 'pnpm', 'yarn']);
const LONG_RUNNING_PACKAGE_SCRIPTS = new Set(['dev', 'start', 'serve', 'watch', 'preview']);
const LONG_RUNNING_EXECUTABLES = new Set(['nodemon', 'pm2', 'serve', 'http-server', 'live-server', 'webpack-dev-server']);

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

export function commandIntentHasBlockedShellBackgroundPattern(intent: TomlTable): boolean {
	return intent.mode === 'shell' && typeof intent.cmd === 'string' && shellCommandHasBlockedBackgroundPattern(intent.cmd);
}

function normalizeExecutableName(value: string): string {
	return path.basename(value).replace(/\.(?:cmd|exe|ps1)$/iu, '').toLowerCase();
}

function findFlagPayload(argv: readonly string[], flags: ReadonlySet<string>): string | null {
	for (let index = 1; index < argv.length - 1; index += 1) {
		if (flags.has(argv[index].toLowerCase())) {
			return argv[index + 1];
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

	const packageScriptName = readPackageScriptName(command, args);
	if (packageScriptName && LONG_RUNNING_PACKAGE_SCRIPTS.has(packageScriptName)) {
		return `package-manager script "${packageScriptName}" is commonly long-running`;
	}

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

	return null;
}

export function commandIntentBlockedCommandPattern(intent: TomlTable): BlockedCommandPattern | null {
	if (intent.mode === 'shell' && typeof intent.cmd === 'string' && shellCommandHasBlockedBackgroundPattern(intent.cmd)) {
		return {
			code: 'shell_background_pattern',
			detail: 'Shell command contains a blocked long-running or background pattern.',
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
