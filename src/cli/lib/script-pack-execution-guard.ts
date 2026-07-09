import { createRequire, syncBuiltinESMExports } from 'node:module';
import type * as ChildProcess from 'node:child_process';
import type * as Fs from 'node:fs';
import type * as WorkerThreads from 'node:worker_threads';

const require = createRequire(import.meta.url);
const childProcess = require('node:child_process') as typeof ChildProcess;
const fs = require('node:fs') as typeof Fs;
const workerThreads = require('node:worker_threads') as typeof WorkerThreads;

interface GuardedChildProcessFunctions {
	readonly exec: (...args: any[]) => unknown;
	readonly execFile: (...args: any[]) => unknown;
	readonly execFileSync: (...args: any[]) => unknown;
	readonly execSync: (...args: any[]) => unknown;
	readonly spawn: (...args: any[]) => unknown;
	readonly spawnSync: (...args: any[]) => unknown;
}

type GuardedFunction = (...args: any[]) => unknown;

interface GuardPatch {
	readonly restore: () => void;
}

export interface ScriptPackGuardDenial {
	readonly surface: string;
	readonly reason: string;
	readonly command: string;
	readonly args: readonly string[];
}

interface GuardContext {
	readonly denials: ScriptPackGuardDenial[];
}

const MAX_RECORDED_DENIALS = 20;
const READ_ONLY_GIT_SUBCOMMANDS = new Set(['check-ignore', 'config', 'diff', 'ls-files', 'rev-parse', 'show', 'status']);
const GIT_WRITE_SUBCOMMANDS = new Set([
	'add',
	'am',
	'apply',
	'bisect',
	'branch',
	'checkout',
	'cherry-pick',
	'clean',
	'clone',
	'commit',
	'fetch',
	'gc',
	'merge',
	'mv',
	'pull',
	'push',
	'rebase',
	'remote',
	'reset',
	'restore',
	'revert',
	'rm',
	'submodule',
	'switch',
	'tag',
	'worktree',
]);
const PACKAGE_MANAGER_COMMANDS = new Set(['bun', 'corepack', 'npm', 'npx', 'pnpm', 'pnpx', 'yarn', 'yarnpkg']);
const SHELL_COMMANDS = new Set(['bash', 'cmd', 'cmd.exe', 'fish', 'powershell', 'powershell.exe', 'pwsh', 'pwsh.exe', 'sh', 'sh.exe', 'zsh']);
const PUBLISH_COMMANDS = new Set(['curl', 'gh', 'hub', 'wget']);
const PACKAGE_MANAGER_DENIED_ARGS = new Set([
	'add',
	'audit',
	'build',
	'ci',
	'exec',
	'install',
	'i',
	'lint',
	'publish',
	'release',
	'run',
	'test',
	'upgrade',
	'update',
]);
const SHELL_WRAPPER_ARGS = new Set(['-c', '/c', 'eval']);
const FORBIDDEN_GIT_GLOBAL_OPTIONS = new Set([
	'-c',
	'--config-env',
	'--exec-path',
	'--git-dir',
	'--literal-pathspecs',
	'--namespace',
	'--work-tree',
]);
const FORBIDDEN_GIT_READ_OPTIONS = new Set([
	'--ext-diff',
	'--external-diff',
	'--textconv',
]);
const FORBIDDEN_ENV_PREFIXES = ['GIT_', 'NPM_', 'NODE_OPTIONS'];
const FORBIDDEN_ENV_NAMES = new Set([
	'BUN_AUTH_TOKEN',
	'COREPACK_HOME',
	'GITHUB_TOKEN',
	'NODE_AUTH_TOKEN',
	'PNPM_HOME',
	'YARN_ENABLE_SCRIPTS',
]);
const FS_WRITE_FUNCTIONS = [
	'appendFile',
	'appendFileSync',
	'chmod',
	'chmodSync',
	'chown',
	'chownSync',
	'copyFile',
	'copyFileSync',
	'cp',
	'cpSync',
	'createWriteStream',
	'lchmod',
	'lchmodSync',
	'lchown',
	'lchownSync',
	'link',
	'linkSync',
	'mkdir',
	'mkdirSync',
	'open',
	'openSync',
	'rename',
	'renameSync',
	'rm',
	'rmSync',
	'symlink',
	'symlinkSync',
	'truncate',
	'truncateSync',
	'unlink',
	'unlinkSync',
	'writeFile',
	'writeFileSync',
] as const;
const FS_PROMISE_WRITE_FUNCTIONS = [
	'appendFile',
	'chmod',
	'chown',
	'copyFile',
	'cp',
	'lchmod',
	'lchown',
	'link',
	'mkdir',
	'open',
	'rename',
	'rm',
	'symlink',
	'truncate',
	'unlink',
	'writeFile',
] as const;
const FS_WRITE_OPEN_FLAGS = /[+wax]/iu;
const FS_WRITE_OPEN_FLAG_BITS =
	fs.constants.O_WRONLY |
	fs.constants.O_RDWR |
	fs.constants.O_CREAT |
	fs.constants.O_TRUNC |
	fs.constants.O_APPEND;
let activeGuardContext: GuardContext | null = null;

export class ScriptPackExecutionDeniedError extends Error {
	readonly command: string;
	readonly args: readonly string[];
	readonly reason: string;
	readonly denial: ScriptPackGuardDenial;

	constructor(command: string, args: readonly string[], reason: string, denial: ScriptPackGuardDenial = createGuardDenial(command, args, reason)) {
		super(`script-pack child process denied: ${reason}: ${formatCommand(command, args)}`);
		this.name = 'ScriptPackExecutionDeniedError';
		this.command = command;
		this.args = args;
		this.reason = reason;
		this.denial = denial;
	}
}

function basenameCommand(command: string): string {
	const normalized = command.replace(/\\/gu, '/').split('/').pop() ?? command;
	return normalized.toLowerCase();
}

function normalizeArg(value: unknown): string {
	return String(value).trim().toLowerCase();
}

function normalizeArgs(args: unknown): readonly string[] {
	return Array.isArray(args) ? args.map((arg) => String(arg)) : [];
}

function formatCommand(command: string, args: readonly string[]): string {
	return [command, ...args].join(' ');
}

function redactGuardToken(value: string): string {
	const trimmed = value.trim();
	if (trimmed.length > 160) {
		return `${trimmed.slice(0, 80)}...[truncated]`;
	}
	if (/^(?:https?:\/\/|ssh:\/\/)/iu.test(trimmed)) {
		return '[redacted-url]';
	}
	if (/(?:token|secret|password|passwd|authorization|credential|sshcommand|proxycommand)/iu.test(trimmed)) {
		const separatorIndex = trimmed.search(/[=:]/u);
		if (separatorIndex > 0) {
			return `${trimmed.slice(0, separatorIndex + 1)}[redacted]`;
		}
		return '[redacted-sensitive-arg]';
	}
	return trimmed;
}

function createGuardDenial(command: string, args: readonly string[], reason: string): ScriptPackGuardDenial {
	return {
		surface: basenameCommand(command),
		reason,
		command: redactGuardToken(command),
		args: args.map(redactGuardToken),
	};
}

function recordGuardDenial(denial: ScriptPackGuardDenial): void {
	if (!activeGuardContext || activeGuardContext.denials.length >= MAX_RECORDED_DENIALS) {
		return;
	}
	activeGuardContext.denials.push(denial);
}

function createDeniedError(command: string, args: readonly string[], reason: string): ScriptPackExecutionDeniedError {
	const denial = createGuardDenial(command, args, reason);
	recordGuardDenial(denial);
	return new ScriptPackExecutionDeniedError(command, args, reason, denial);
}

export function getCurrentScriptPackGuardDenials(): readonly ScriptPackGuardDenial[] {
	return activeGuardContext?.denials.map((denial) => ({
		surface: denial.surface,
		reason: denial.reason,
		command: denial.command,
		args: [...denial.args],
	})) ?? [];
}

function isObjectRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function normalizeEnvName(value: string): string {
	return value.trim().toUpperCase();
}

function assertChildProcessOptionsAllowed(command: string, args: readonly string[], options: unknown): void {
	if (!isObjectRecord(options)) {
		return;
	}

	if (options.shell === true || typeof options.shell === 'string') {
		deny(command, args, 'shell option is not allowed for script-pack child processes');
	}

	if (isObjectRecord(options.env)) {
		for (const key of Object.keys(options.env)) {
			const normalized = normalizeEnvName(key);
			if (FORBIDDEN_ENV_NAMES.has(normalized) || FORBIDDEN_ENV_PREFIXES.some((prefix) => normalized.startsWith(prefix))) {
				deny(command, args, `environment override ${key} is not allowed`);
			}
		}
	}
}

function assertNoForbiddenGitReadOptions(command: string, args: readonly string[]): void {
	for (const arg of args) {
		const normalized = normalizeArg(arg);
		if (FORBIDDEN_GIT_READ_OPTIONS.has(normalized)) {
			deny(command, args, 'git external diff or text conversion hooks are not allowed');
		}
	}
}

function firstNonOptionGitArg(command: string, args: readonly string[]): string | null {
	for (let index = 0; index < args.length; index += 1) {
		const arg = args[index] ?? '';
		const normalized = normalizeArg(arg);
		if (arg === '-C') {
			index += 1;
			continue;
		}
		if (FORBIDDEN_GIT_GLOBAL_OPTIONS.has(normalized)) {
			deny(command, args, `git global option ${arg} is not allowed`);
		}
		if (arg.startsWith('-')) {
			deny(command, args, `git global option ${arg} is not allowed before the subcommand`);
		}
		if (normalized.length === 0) {
			continue;
		}
		return normalizeArg(arg);
	}
	return null;
}

function deny(command: string, args: readonly string[], reason: string): never {
	throw createDeniedError(command, args, reason);
}

function denyCapability(surface: string, reason: string): never {
	throw createDeniedError(surface, [], reason);
}

function isWriteOpenFlags(value: unknown): boolean {
	if (value === undefined || value === null) {
		return false;
	}
	if (typeof value === 'number') {
		return (value & FS_WRITE_OPEN_FLAG_BITS) !== 0;
	}
	return FS_WRITE_OPEN_FLAGS.test(String(value));
}

export function assertScriptPackChildProcessAllowed(command: string, args: readonly string[]): void {
	const executable = basenameCommand(command);
	const normalizedArgs = args.map(normalizeArg);

	if (SHELL_COMMANDS.has(executable)) {
		if (normalizedArgs.some((arg) => SHELL_WRAPPER_ARGS.has(arg))) {
			deny(command, args, 'shell wrapper execution is not allowed');
		}
		deny(command, args, 'shell execution is not allowed');
	}

	if (PACKAGE_MANAGER_COMMANDS.has(executable)) {
		if (normalizedArgs.some((arg) => PACKAGE_MANAGER_DENIED_ARGS.has(arg))) {
			deny(command, args, 'package manager, build, lint, or test execution is not allowed');
		}
		deny(command, args, 'package manager execution is not allowed');
	}

	if (PUBLISH_COMMANDS.has(executable)) {
		deny(command, args, 'network publishing or remote automation commands are not allowed');
	}

	if (executable !== 'git' && executable !== 'git.exe') {
		deny(command, args, 'only bounded read-only git probes are allowed');
	}

	const subcommand = firstNonOptionGitArg(command, args);
	if (!subcommand) {
		deny(command, args, 'git subcommand is missing');
	}
	if (GIT_WRITE_SUBCOMMANDS.has(subcommand)) {
		deny(command, args, 'git write, network, or ref mutation is not allowed');
	}
	if (!READ_ONLY_GIT_SUBCOMMANDS.has(subcommand)) {
		deny(command, args, 'git subcommand is not in the read-only allowlist');
	}
	assertNoForbiddenGitReadOptions(command, args);
	if (subcommand === 'config') {
		const nonOptionArgs = normalizedArgs.filter((arg) => !arg.startsWith('-'));
		const allowed =
			normalizedArgs.includes('--get') &&
			nonOptionArgs.length === 2 &&
			nonOptionArgs[0] === 'config' &&
			nonOptionArgs[1] === 'core.excludesfile' &&
			!normalizedArgs.some((arg) => arg === '--global' || arg === '--system' || arg === '--local');
		if (!allowed) {
			deny(command, args, 'git config is limited to repository-neutral read-only --get core.excludesFile probes');
		}
	}
}

function deniedSpawnSyncResult(error: ScriptPackExecutionDeniedError): ChildProcess.SpawnSyncReturns<string> {
	return {
		pid: 0,
		output: [null, '', `${error.message}\n`],
		stdout: '',
		stderr: `${error.message}\n`,
		status: 1,
		signal: null,
		error,
	} as ChildProcess.SpawnSyncReturns<string>;
}

function createGuardedFunctions(original: GuardedChildProcessFunctions): GuardedChildProcessFunctions {
	return {
		exec(command: string, optionsOrCallback?: unknown, maybeCallback?: unknown): unknown {
			const commandText = String(command);
			assertChildProcessOptionsAllowed(commandText, [], typeof optionsOrCallback === 'function' ? undefined : optionsOrCallback);
			deny(commandText, [], 'shell string execution is not allowed');
			return original.exec(command, optionsOrCallback, maybeCallback);
		},
		execFile(file: string, argsOrOptionsOrCallback?: unknown, optionsOrCallback?: unknown, maybeCallback?: unknown): unknown {
			const args = normalizeArgs(argsOrOptionsOrCallback);
			const options = Array.isArray(argsOrOptionsOrCallback) ? optionsOrCallback : argsOrOptionsOrCallback;
			assertChildProcessOptionsAllowed(String(file), args, typeof options === 'function' ? undefined : options);
			assertScriptPackChildProcessAllowed(String(file), args);
			return original.execFile(file, argsOrOptionsOrCallback, optionsOrCallback, maybeCallback);
		},
		execFileSync(file: string, argsOrOptions?: unknown, options?: unknown): unknown {
			const args = normalizeArgs(argsOrOptions);
			const childOptions = Array.isArray(argsOrOptions) ? options : argsOrOptions;
			assertChildProcessOptionsAllowed(String(file), args, childOptions);
			assertScriptPackChildProcessAllowed(String(file), args);
			return original.execFileSync(file, argsOrOptions, options);
		},
		execSync(command: string, options?: unknown): unknown {
			const commandText = String(command);
			assertChildProcessOptionsAllowed(commandText, [], options);
			deny(commandText, [], 'shell string execution is not allowed');
			return original.execSync(command, options);
		},
		spawn(command: string, argsOrOptions?: unknown, options?: unknown): unknown {
			const args = normalizeArgs(argsOrOptions);
			const childOptions = Array.isArray(argsOrOptions) ? options : argsOrOptions;
			assertChildProcessOptionsAllowed(String(command), args, childOptions);
			assertScriptPackChildProcessAllowed(String(command), args);
			return original.spawn(command, argsOrOptions, options);
		},
		spawnSync(command: string, argsOrOptions?: unknown, options?: unknown): unknown {
			const args = normalizeArgs(argsOrOptions);
			const childOptions = Array.isArray(argsOrOptions) ? options : argsOrOptions;
			try {
				assertChildProcessOptionsAllowed(String(command), args, childOptions);
				assertScriptPackChildProcessAllowed(String(command), args);
			} catch (error) {
				if (error instanceof ScriptPackExecutionDeniedError) {
					return deniedSpawnSyncResult(error);
				}
				throw error;
			}
			return original.spawnSync(command, argsOrOptions, options);
		},
	};
}

function patchFunction(target: Record<string, unknown>, key: string, replacement: GuardedFunction): GuardPatch {
	const descriptor = Object.getOwnPropertyDescriptor(target, key);
	const original = target[key];
	Object.defineProperty(target, key, {
		configurable: true,
		enumerable: descriptor?.enumerable ?? true,
		writable: true,
		value: replacement,
	});
	return {
		restore: () => {
			if (descriptor) {
				Object.defineProperty(target, key, descriptor);
				return;
			}
			if (original === undefined) {
				delete target[key];
				return;
			}
			target[key] = original;
		},
	};
}

function createDeniedCapabilityFunction(surface: string, reason: string): GuardedFunction {
	return () => denyCapability(surface, reason);
}

function createDeniedAsyncCapabilityFunction(surface: string, reason: string): GuardedFunction {
	return () => Promise.reject(createDeniedError(surface, [], reason));
}

function createDeniedOpenFunction(surface: string, original: GuardedFunction): GuardedFunction {
	return (...args: any[]) => {
		const flags = args[1];
		if (isWriteOpenFlags(flags)) {
			denyCapability(surface, 'filesystem write handles are not allowed during script-pack runs');
		}
		return original(...args);
	};
}

function patchFilesystemGuards(): readonly GuardPatch[] {
	const patches: GuardPatch[] = [];
	const fsRecord = fs as unknown as Record<string, unknown>;
	for (const key of FS_WRITE_FUNCTIONS) {
		const original = fsRecord[key];
		if (typeof original !== 'function') {
			continue;
		}
		patches.push(
			patchFunction(
				fsRecord,
				key,
				key === 'open' || key === 'openSync'
					? createDeniedOpenFunction(`fs.${key}`, original as GuardedFunction)
					: createDeniedCapabilityFunction(`fs.${key}`, 'filesystem writes are not allowed during script-pack runs'),
			),
		);
	}

	const promisesRecord = fs.promises as unknown as Record<string, unknown>;
	for (const key of FS_PROMISE_WRITE_FUNCTIONS) {
		const original = promisesRecord[key];
		if (typeof original !== 'function') {
			continue;
		}
		patches.push(
			patchFunction(
				promisesRecord,
				key,
				key === 'open'
					? createDeniedOpenFunction(`fs.promises.${key}`, original as GuardedFunction)
					: createDeniedAsyncCapabilityFunction(`fs.promises.${key}`, 'filesystem writes are not allowed during script-pack runs'),
			),
		);
	}

	return patches;
}

function patchNetworkGuards(): readonly GuardPatch[] {
	const globalRecord = globalThis as unknown as Record<string, unknown>;
	const patches: GuardPatch[] = [];
	if (typeof globalRecord.fetch === 'function') {
		patches.push(
			patchFunction(globalRecord, 'fetch', createDeniedAsyncCapabilityFunction('fetch', 'network access is not allowed during script-pack runs')),
		);
	}
	return patches;
}

function patchWorkerGuards(): readonly GuardPatch[] {
	const workerRecord = workerThreads as unknown as Record<string, unknown>;
	if (typeof workerRecord.Worker !== 'function') {
		return [];
	}
	function deniedWorkerConstructor(): never {
		return denyCapability('worker_threads.Worker', 'worker threads are not allowed during script-pack runs');
	}
	return [
		patchFunction(
			workerRecord,
			'Worker',
			deniedWorkerConstructor,
		),
	];
}

function patchBunGuards(): readonly GuardPatch[] {
	const globalRecord = globalThis as unknown as Record<string, unknown>;
	const bunRecord = isObjectRecord(globalRecord.Bun) ? globalRecord.Bun : null;
	if (!bunRecord) {
		return [];
	}

	const patches: GuardPatch[] = [];
	for (const key of ['spawn', 'spawnSync', 'write', '$']) {
		if (typeof bunRecord[key] === 'function') {
			const reason =
				key === 'write'
					? 'Bun filesystem writes are not allowed during script-pack runs'
					: 'Bun process or shell execution is not allowed during script-pack runs';
			patches.push(patchFunction(bunRecord, key, createDeniedCapabilityFunction(`Bun.${key}`, reason)));
		}
	}
	return patches;
}

function patchProcessStateGuards(): readonly GuardPatch[] {
	const processRecord = process as unknown as Record<string, unknown>;
	const patches: GuardPatch[] = [];
	for (const [key, reason] of [
		['chdir', 'process working-directory changes are not allowed during script-pack runs'],
		['umask', 'process umask changes are not allowed during script-pack runs'],
	] as const) {
		if (typeof processRecord[key] === 'function') {
			patches.push(patchFunction(processRecord, key, createDeniedCapabilityFunction(`process.${key}`, reason)));
		}
	}
	return patches;
}

export async function withScriptPackChildProcessGuard<T>(callback: () => Promise<T>): Promise<T> {
	const original: GuardedChildProcessFunctions = {
		exec: childProcess.exec,
		execFile: childProcess.execFile,
		execFileSync: childProcess.execFileSync,
		execSync: childProcess.execSync,
		spawn: childProcess.spawn,
		spawnSync: childProcess.spawnSync,
	};
	const guarded = createGuardedFunctions(original);
	const patches = [
		...patchFilesystemGuards(),
		...patchNetworkGuards(),
		...patchWorkerGuards(),
		...patchBunGuards(),
		...patchProcessStateGuards(),
	];
	const parentGuardContext = activeGuardContext;
	const guardContext: GuardContext = { denials: [] };

	Object.assign(childProcess, guarded);
	syncBuiltinESMExports();
	activeGuardContext = guardContext;
	try {
		return await callback();
	} finally {
		activeGuardContext = parentGuardContext;
		for (const patch of [...patches].reverse()) {
			patch.restore();
		}
		Object.assign(childProcess, original);
		syncBuiltinESMExports();
	}
}
