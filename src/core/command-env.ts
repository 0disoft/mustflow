import path from 'node:path';

import { readString, readStringArray, type CommandContract, type TomlTable } from './config-loading.js';

export type CommandEnvPolicy = 'inherit' | 'minimal' | 'allowlist';

export const COMMAND_ENV_POLICIES = new Set<CommandEnvPolicy>(['inherit', 'minimal', 'allowlist']);
export const DEFAULT_COMMAND_ENV_POLICY: CommandEnvPolicy = 'inherit';

const BASE_MINIMAL_ENV_KEYS = [
	'CI',
	'COLORTERM',
	'COMSPEC',
	'ComSpec',
	'FORCE_COLOR',
	'HOME',
	'HOMEDRIVE',
	'HOMEPATH',
	'LANG',
	'LC_ALL',
	'NO_COLOR',
	'PATHEXT',
	'Path',
	'SystemRoot',
	'TEMP',
	'TERM',
	'TMP',
	'TMPDIR',
	'USERPROFILE',
	'WINDIR',
	'windir',
] as const;

export interface CommandEnvResolution {
	readonly policy: CommandEnvPolicy;
	readonly allowlist: readonly string[];
}

function getPathEnvKey(env: NodeJS.ProcessEnv): string {
	return Object.keys(env).find((key) => key.toLowerCase() === 'path') ?? 'PATH';
}

function sameResolvedPath(left: string, right: string): boolean {
	const resolvedLeft = path.resolve(left);
	const resolvedRight = path.resolve(right);

	return process.platform === 'win32'
		? resolvedLeft.toLowerCase() === resolvedRight.toLowerCase()
		: resolvedLeft === resolvedRight;
}

function uniqueEnvNames(values: readonly string[]): string[] {
	return [...new Set(values.map((value) => value.trim()).filter((value) => value.length > 0))].sort((left, right) =>
		left.localeCompare(right),
	);
}

function readEnvPolicy(table: TomlTable | undefined): CommandEnvPolicy | undefined {
	if (!table) {
		return undefined;
	}

	const value = readString(table, 'env_policy');
	return value && COMMAND_ENV_POLICIES.has(value as CommandEnvPolicy) ? (value as CommandEnvPolicy) : undefined;
}

function readEnvAllowlist(table: TomlTable | undefined): string[] {
	return table ? (readStringArray(table, 'env_allowlist') ?? []) : [];
}

function pickEnv(source: NodeJS.ProcessEnv, names: readonly string[]): NodeJS.ProcessEnv {
	const output: NodeJS.ProcessEnv = {};

	for (const name of names) {
		const value = source[name];
		if (value !== undefined) {
			output[name] = value;
		}
	}

	return output;
}

function removeProjectLocalBinFromPath(env: NodeJS.ProcessEnv, projectRoot: string): NodeJS.ProcessEnv {
	const pathKey = getPathEnvKey(env);
	const currentPath = env[pathKey];

	if (!currentPath) {
		return env;
	}

	const localBinPath = path.join(projectRoot, 'node_modules', '.bin');
	env[pathKey] = currentPath
		.split(path.delimiter)
		.filter((entry) => entry.length > 0 && !sameResolvedPath(entry, localBinPath))
		.join(path.delimiter);

	return env;
}

export function resolveCommandEnv(contract: CommandContract, intent: TomlTable | undefined): CommandEnvResolution {
	const policy = readEnvPolicy(intent) ?? readEnvPolicy(contract.defaults) ?? DEFAULT_COMMAND_ENV_POLICY;
	const allowlist =
		policy === 'allowlist'
			? uniqueEnvNames([...readEnvAllowlist(contract.defaults), ...readEnvAllowlist(intent)])
			: [];

	return {
		policy,
		allowlist,
	};
}

export function createCommandEnv(
	projectRoot: string,
	resolution: CommandEnvResolution,
	sourceEnv: NodeJS.ProcessEnv = process.env,
): NodeJS.ProcessEnv {
	const pathKey = getPathEnvKey(sourceEnv);
	const minimalKeys = uniqueEnvNames([...BASE_MINIMAL_ENV_KEYS, pathKey]);
	const env =
		resolution.policy === 'inherit'
			? { ...sourceEnv }
			: pickEnv(sourceEnv, resolution.policy === 'allowlist' ? [...minimalKeys, ...resolution.allowlist] : minimalKeys);

	return removeProjectLocalBinFromPath(env, projectRoot);
}
