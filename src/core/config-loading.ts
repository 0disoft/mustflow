import { existsSync } from 'node:fs';
import path from 'node:path';

import { readUtf8FileInsideWithoutSymlinks } from './safe-filesystem.js';
import { parseTomlText } from './toml.js';

export type TomlTable = Record<string, unknown>;

export const COMMAND_LIFECYCLES = new Set(['oneshot', 'server', 'watch', 'interactive', 'browser', 'background']);
export const LONG_RUNNING_LIFECYCLES = new Set(['server', 'watch', 'interactive', 'browser', 'background']);
export const COMMAND_RUN_POLICIES = new Set(['agent_allowed', 'requires_explicit_user_request', 'manual_only']);

export const COMMANDS_CONFIG_RELATIVE_PATH = '.mustflow/config/commands.toml';
export const MUSTFLOW_CONFIG_RELATIVE_PATH = '.mustflow/config/mustflow.toml';

export interface CommandContract {
	readonly defaults: TomlTable;
	readonly intents: TomlTable;
	readonly resources: TomlTable;
}

export function isRecord(value: unknown): value is TomlTable {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function resolveMustflowConfigPath(projectRoot: string, relativePath: string): string {
	return path.join(projectRoot, ...relativePath.split('/'));
}

export function readMustflowOwnedTomlFile(projectRoot: string, relativePath: string): unknown {
	return parseTomlText(
		readUtf8FileInsideWithoutSymlinks(projectRoot, resolveMustflowConfigPath(projectRoot, relativePath), {
			maxBytes: 256 * 1024,
		}),
	);
}

export function readMustflowConfig(projectRoot: string): TomlTable {
	const parsed = readMustflowOwnedTomlFile(projectRoot, MUSTFLOW_CONFIG_RELATIVE_PATH);

	if (!isRecord(parsed)) {
		throw new Error(`${MUSTFLOW_CONFIG_RELATIVE_PATH} must contain a TOML table`);
	}

	return parsed;
}

export function readMustflowConfigIfExists(projectRoot: string): TomlTable | undefined {
	const configPath = resolveMustflowConfigPath(projectRoot, MUSTFLOW_CONFIG_RELATIVE_PATH);

	return existsSync(configPath) ? readMustflowConfig(projectRoot) : undefined;
}

export function readCommandContract(projectRoot: string): CommandContract {
	const parsed = readMustflowOwnedTomlFile(projectRoot, COMMANDS_CONFIG_RELATIVE_PATH);

	if (!isRecord(parsed)) {
		throw new Error(`${COMMANDS_CONFIG_RELATIVE_PATH} must contain a TOML table`);
	}

	if (!isRecord(parsed.intents)) {
		throw new Error(`Missing [intents] table in ${COMMANDS_CONFIG_RELATIVE_PATH}`);
	}

	return {
		defaults: isRecord(parsed.defaults) ? parsed.defaults : {},
		intents: parsed.intents,
		resources: isRecord(parsed.resources) ? parsed.resources : {},
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
