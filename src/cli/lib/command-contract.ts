import path from 'node:path';

import { readTomlFile } from './toml.js';

export type TomlTable = Record<string, unknown>;

export const COMMAND_LIFECYCLES = new Set(['oneshot', 'server', 'watch', 'interactive', 'browser', 'background']);
export const LONG_RUNNING_LIFECYCLES = new Set(['server', 'watch', 'interactive', 'browser', 'background']);
export const COMMAND_RUN_POLICIES = new Set(['agent_allowed', 'requires_explicit_user_request', 'manual_only']);

export interface CommandContract {
	readonly defaults: TomlTable;
	readonly intents: TomlTable;
}

export function isRecord(value: unknown): value is TomlTable {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function readCommandContract(projectRoot: string): CommandContract {
	const parsed = readTomlFile(path.join(projectRoot, '.mustflow', 'config', 'commands.toml'));

	if (!isRecord(parsed)) {
		throw new Error('.mustflow/config/commands.toml must contain a TOML table');
	}

	if (!isRecord(parsed.intents)) {
		throw new Error('Missing [intents] table in .mustflow/config/commands.toml');
	}

	return {
		defaults: isRecord(parsed.defaults) ? parsed.defaults : {},
		intents: parsed.intents,
	};
}

export function readString(table: TomlTable, key: string): string | undefined {
	const value = table[key];

	return typeof value === 'string' && value.trim().length > 0 ? value : undefined;
}

export function readPositiveInteger(table: TomlTable, key: string): number | undefined {
	const value = table[key];

	return Number.isInteger(value) && Number(value) > 0 ? Number(value) : undefined;
}

export function readStringArray(table: TomlTable, key: string): string[] | undefined {
	const value = table[key];

	if (!Array.isArray(value) || value.some((entry) => typeof entry !== 'string')) {
		return undefined;
	}

	return [...value];
}
