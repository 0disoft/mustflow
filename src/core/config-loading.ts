import { existsSync } from 'node:fs';
import path from 'node:path';

import { readUtf8FileInsideWithoutSymlinks } from './safe-filesystem.js';
import { parseTomlText } from './toml.js';

export type TomlTable = Record<string, unknown>;

export const COMMAND_LIFECYCLES = new Set(['oneshot', 'server', 'watch', 'interactive', 'browser', 'background']);
export const LONG_RUNNING_LIFECYCLES = new Set(['server', 'watch', 'interactive', 'browser', 'background']);
export const COMMAND_RUN_POLICIES = new Set(['agent_allowed', 'requires_explicit_user_request', 'manual_only']);

export const COMMANDS_CONFIG_RELATIVE_PATH = '.mustflow/config/commands.toml';
export const COMMANDS_CONFIG_DIRECTORY_RELATIVE_PATH = '.mustflow/config';
export const MUSTFLOW_CONFIG_RELATIVE_PATH = '.mustflow/config/mustflow.toml';

const COMMAND_INCLUDE_DIRECTORY = 'commands';
const COMMAND_INCLUDE_ALLOWED_TOP_LEVEL_KEYS = new Set(['intents', 'resources']);
const WINDOWS_RESERVED_PATH_SEGMENTS = /^(?:con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\..*)?$/iu;

export interface CommandContract {
	readonly defaults: TomlTable;
	readonly intents: TomlTable;
	readonly resources: TomlTable;
}

export function isRecord(value: unknown): value is TomlTable {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function hasOwn(table: TomlTable, key: string): boolean {
	return Object.prototype.hasOwnProperty.call(table, key);
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

function normalizeCommandIncludePath(rawPath: string): string {
	return rawPath.trim().replace(/\\/gu, '/');
}

function commandIncludePathIsUnsafe(rawPath: string): boolean {
	const normalized = normalizeCommandIncludePath(rawPath);
	const segments = normalized.split('/').filter((segment) => segment.length > 0);

	return (
		normalized.length === 0 ||
		normalized.includes('\0') ||
		normalized.startsWith('/') ||
		path.win32.isAbsolute(rawPath) ||
		path.posix.isAbsolute(normalized) ||
		segments.some((segment) => segment === '.' || segment === '..' || WINDOWS_RESERVED_PATH_SEGMENTS.test(segment)) ||
		!normalized.startsWith(`${COMMAND_INCLUDE_DIRECTORY}/`) ||
		!normalized.endsWith('.toml')
	);
}

function readCommandIncludePathsFromParsed(root: TomlTable): readonly string[] {
	if (!hasOwn(root, 'include')) {
		return [];
	}

	if (!isRecord(root.include)) {
		throw new Error(`[include] in ${COMMANDS_CONFIG_RELATIVE_PATH} must be a TOML table`);
	}

	const files = root.include.files;
	if (!Array.isArray(files) || files.some((entry) => typeof entry !== 'string' || entry.trim().length === 0)) {
		throw new Error(`[include].files in ${COMMANDS_CONFIG_RELATIVE_PATH} must be a string array`);
	}

	const normalizedPaths: string[] = [];
	const seen = new Set<string>();
	for (const file of files) {
		const normalized = normalizeCommandIncludePath(file);
		if (commandIncludePathIsUnsafe(file)) {
			throw new Error(
				`Command include path "${file}" must be a relative ${COMMAND_INCLUDE_DIRECTORY}/*.toml path under ${COMMANDS_CONFIG_DIRECTORY_RELATIVE_PATH}`,
			);
		}

		if (seen.has(normalized)) {
			throw new Error(`Duplicate command include path "${normalized}" in ${COMMANDS_CONFIG_RELATIVE_PATH}`);
		}

		seen.add(normalized);
		normalizedPaths.push(normalized);
	}

	return normalizedPaths;
}

export function readCommandContractIncludePaths(projectRoot: string): readonly string[] {
	const parsed = readMustflowOwnedTomlFile(projectRoot, COMMANDS_CONFIG_RELATIVE_PATH);

	if (!isRecord(parsed)) {
		throw new Error(`${COMMANDS_CONFIG_RELATIVE_PATH} must contain a TOML table`);
	}

	return readCommandIncludePathsFromParsed(parsed).map(
		(includePath) => `${COMMANDS_CONFIG_DIRECTORY_RELATIVE_PATH}/${includePath}`,
	);
}

function assertCommandIncludeTable(includePath: string, parsed: unknown): TomlTable {
	if (!isRecord(parsed)) {
		throw new Error(`${COMMANDS_CONFIG_DIRECTORY_RELATIVE_PATH}/${includePath} must contain a TOML table`);
	}

	for (const key of Object.keys(parsed)) {
		if (!COMMAND_INCLUDE_ALLOWED_TOP_LEVEL_KEYS.has(key)) {
			throw new Error(
				`${COMMANDS_CONFIG_DIRECTORY_RELATIVE_PATH}/${includePath} may define only [intents] and [resources] tables`,
			);
		}
	}

	return parsed;
}

function mergeCommandSection(
	target: TomlTable,
	source: unknown,
	sectionName: 'intents' | 'resources',
	sourceLabel: string,
	seenSources: Map<string, string>,
): void {
	if (source === undefined) {
		return;
	}

	if (!isRecord(source)) {
		throw new Error(`${sourceLabel} [${sectionName}] must be a TOML table`);
	}

	for (const [name, value] of Object.entries(source)) {
		const existingSource = seenSources.get(name);
		if (existingSource) {
			throw new Error(`Duplicate command ${sectionName.slice(0, -1)} "${name}" in ${sourceLabel}; already defined in ${existingSource}`);
		}

		target[name] = value;
		seenSources.set(name, sourceLabel);
	}
}

export function readResolvedCommandContractToml(projectRoot: string): TomlTable {
	const parsed = readMustflowOwnedTomlFile(projectRoot, COMMANDS_CONFIG_RELATIVE_PATH);

	if (!isRecord(parsed)) {
		throw new Error(`${COMMANDS_CONFIG_RELATIVE_PATH} must contain a TOML table`);
	}

	if (hasOwn(parsed, 'intents') && !isRecord(parsed.intents)) {
		throw new Error(`[intents] table in ${COMMANDS_CONFIG_RELATIVE_PATH} must be a TOML table`);
	}

	if (hasOwn(parsed, 'resources') && !isRecord(parsed.resources)) {
		throw new Error(`[resources] table in ${COMMANDS_CONFIG_RELATIVE_PATH} must be a TOML table`);
	}

	const merged: TomlTable = { ...parsed };
	const mergedIntents: TomlTable = {};
	const mergedResources: TomlTable = {};
	const intentSources = new Map<string, string>();
	const resourceSources = new Map<string, string>();
	const includePaths = readCommandIncludePathsFromParsed(parsed);
	let sawIntentTable = hasOwn(parsed, 'intents');

	mergeCommandSection(mergedResources, parsed.resources, 'resources', COMMANDS_CONFIG_RELATIVE_PATH, resourceSources);
	mergeCommandSection(mergedIntents, parsed.intents, 'intents', COMMANDS_CONFIG_RELATIVE_PATH, intentSources);

	for (const includePath of includePaths) {
		const includeRelativePath = `${COMMANDS_CONFIG_DIRECTORY_RELATIVE_PATH}/${includePath}`;
		const includeTable = assertCommandIncludeTable(
			includePath,
			readMustflowOwnedTomlFile(projectRoot, includeRelativePath),
		);

		sawIntentTable = sawIntentTable || hasOwn(includeTable, 'intents');
		mergeCommandSection(mergedResources, includeTable.resources, 'resources', includeRelativePath, resourceSources);
		mergeCommandSection(mergedIntents, includeTable.intents, 'intents', includeRelativePath, intentSources);
	}

	if (Object.keys(mergedResources).length > 0) {
		merged.resources = mergedResources;
	}

	if (sawIntentTable) {
		merged.intents = mergedIntents;
	} else {
		delete merged.intents;
	}

	return merged;
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
	const parsed = readResolvedCommandContractToml(projectRoot);

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
