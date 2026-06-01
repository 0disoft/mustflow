import path from 'node:path';

import {
	isRecord,
	readString,
	readStringArray,
	type CommandContract,
	type TomlTable,
} from './config-loading.js';
import { resolveSafeProjectCwd } from './command-cwd.js';
import { readEffectiveCommandCwd } from './command-run-constraints.js';

export const COMMAND_EFFECT_MODES = new Set(['read', 'write', 'append', 'replace', 'delete_recreate']);
export const COMMAND_EFFECT_TYPES = new Set(['read', 'write']);
export const COMMAND_EFFECT_CONCURRENCY = new Set(['shared', 'exclusive']);

export type CommandEffectMode = 'read' | 'write' | 'append' | 'replace' | 'delete_recreate';
export type CommandEffectAccess = 'read' | 'write';
export type CommandEffectConcurrency = 'shared' | 'exclusive';
export type CommandEffectSource = 'effects' | 'writes';

export interface NormalizedCommandEffect {
	readonly intent: string;
	readonly source: CommandEffectSource;
	readonly access: CommandEffectAccess;
	readonly mode: CommandEffectMode;
	readonly path: string | null;
	readonly lock: string;
	readonly concurrency: CommandEffectConcurrency;
}

export interface CommandEffectIssue {
	readonly message: string;
	readonly severity?: 'warning' | 'error';
}

function hasOwn(table: TomlTable, key: string): boolean {
	return Object.prototype.hasOwnProperty.call(table, key);
}

function normalizeRelativePath(rawPath: string): string {
	return rawPath.replaceAll('\\', '/').replace(/^\.\/+/u, '').replace(/\/+$/u, '') || '.';
}

function pathLockKey(relativePath: string): string {
	return `path:${normalizeRelativePath(relativePath)}`;
}

function validateEffectPath(projectRoot: string, commandContract: CommandContract, intent: TomlTable, rawPath: string): string {
	const cwd = resolveSafeProjectCwd(projectRoot, readEffectiveCommandCwd(commandContract, intent));
	const resolved = path.resolve(cwd, rawPath);
	const root = path.resolve(projectRoot);
	const relative = path.relative(root, resolved);

	if (relative.startsWith('..') || path.isAbsolute(relative)) {
		throw new Error(`Command effect path must stay inside the current root: ${rawPath}`);
	}

	return normalizeRelativePath(relative);
}

function readResourcePaths(commandContract: CommandContract, lock: string): string[] {
	const resource = commandContract.resources[lock];
	if (!isRecord(resource)) {
		return [];
	}

	return readStringArray(resource, 'paths') ?? [];
}

function readEffectMode(effect: TomlTable): CommandEffectMode {
	const mode = readString(effect, 'mode');
	if (mode && COMMAND_EFFECT_MODES.has(mode)) {
		return mode as CommandEffectMode;
	}

	const type = readString(effect, 'type');
	return type === 'read' ? 'read' : 'write';
}

function effectAccess(mode: CommandEffectMode, effect: TomlTable): CommandEffectAccess {
	const type = readString(effect, 'type');
	if (type && COMMAND_EFFECT_TYPES.has(type)) {
		return type as CommandEffectAccess;
	}

	return mode === 'read' ? 'read' : 'write';
}

function readEffectConcurrency(effect: TomlTable, mode: CommandEffectMode, access: CommandEffectAccess): CommandEffectConcurrency {
	const concurrency = readString(effect, 'concurrency');
	if (concurrency && COMMAND_EFFECT_CONCURRENCY.has(concurrency)) {
		return concurrency as CommandEffectConcurrency;
	}

	if (mode === 'read' && access === 'read') {
		return 'shared';
	}

	return 'exclusive';
}

function normalizeDeclaredEffect(
	projectRoot: string,
	commandContract: CommandContract,
	intentName: string,
	intent: TomlTable,
	effect: TomlTable,
): NormalizedCommandEffect[] {
	const mode = readEffectMode(effect);
	const access = effectAccess(mode, effect);
	const concurrency = readEffectConcurrency(effect, mode, access);
	const lock = readString(effect, 'lock');
	const rawPaths = [
		...(readStringArray(effect, 'paths') ?? []),
		...(readString(effect, 'path') ? [readString(effect, 'path') as string] : []),
	];
	const fallbackPaths = lock ? readResourcePaths(commandContract, lock) : [];
	const paths = rawPaths.length > 0 ? rawPaths : fallbackPaths;

	if (!lock && paths.length === 0) {
		throw new Error(`Command effect for intent ${intentName} must define path, paths, or lock`);
	}

	if (paths.length === 0) {
		return [
			{
				intent: intentName,
				source: 'effects',
				access,
				mode,
				path: null,
				lock: lock as string,
				concurrency,
			},
		];
	}

	return paths.map((rawPath) => {
		const normalizedPath = validateEffectPath(projectRoot, commandContract, intent, rawPath);
		return {
			intent: intentName,
			source: 'effects',
			access,
			mode,
			path: normalizedPath,
			lock: lock ?? pathLockKey(normalizedPath),
			concurrency,
		};
	});
}

function normalizeWritesEffect(
	projectRoot: string,
	commandContract: CommandContract,
	intentName: string,
	intent: TomlTable,
): NormalizedCommandEffect[] {
	const writes = readStringArray(intent, 'writes') ?? [];

	return writes.map((rawPath) => {
		const normalizedPath = validateEffectPath(projectRoot, commandContract, intent, rawPath);
		return {
			intent: intentName,
			source: 'writes',
			access: 'write',
			mode: 'write',
			path: normalizedPath,
			lock: pathLockKey(normalizedPath),
			concurrency: 'exclusive',
		};
	});
}

export function normalizeCommandEffects(
	projectRoot: string,
	commandContract: CommandContract,
	intentName: string,
): NormalizedCommandEffect[] {
	const intent = commandContract.intents[intentName];
	if (!isRecord(intent)) {
		return [];
	}

	const rawEffects = intent.effects;
	if (Array.isArray(rawEffects) && rawEffects.length > 0) {
		return rawEffects.flatMap((effect) =>
			isRecord(effect) ? normalizeDeclaredEffect(projectRoot, commandContract, intentName, intent, effect) : [],
		);
	}

	return normalizeWritesEffect(projectRoot, commandContract, intentName, intent);
}

export function commandEffectsConflict(left: NormalizedCommandEffect, right: NormalizedCommandEffect): boolean {
	if (left.lock !== right.lock) {
		return false;
	}

	if (left.mode === 'delete_recreate' || right.mode === 'delete_recreate') {
		return true;
	}

	if (left.concurrency === 'exclusive' || right.concurrency === 'exclusive') {
		return true;
	}

	return left.access === 'write' || right.access === 'write';
}

export function validateCommandEffects(projectRoot: string, commandsToml: TomlTable | undefined): CommandEffectIssue[] {
	const issues: CommandEffectIssue[] = [];
	if (!commandsToml || !isRecord(commandsToml.intents)) {
		return issues;
	}

	const commandContract: CommandContract = {
		defaults: isRecord(commandsToml.defaults) ? commandsToml.defaults : {},
		intents: commandsToml.intents,
		resources: isRecord(commandsToml.resources) ? commandsToml.resources : {},
	};

	for (const [intentName, intent] of Object.entries(commandContract.intents)) {
		if (!isRecord(intent)) {
			continue;
		}

		if (hasOwn(intent, 'effects') && (!Array.isArray(intent.effects) || intent.effects.some((effect) => !isRecord(effect)))) {
			issues.push({ message: `[commands.intents.${intentName}].effects must be an array of tables` });
			continue;
		}

		try {
			normalizeCommandEffects(projectRoot, commandContract, intentName);
		} catch (error) {
			issues.push({ message: error instanceof Error ? error.message : String(error) });
		}
	}

	return issues;
}

export function validateCommandEffectLockWarnings(commandsToml: TomlTable | undefined): CommandEffectIssue[] {
	const issues: CommandEffectIssue[] = [];
	if (!commandsToml || !isRecord(commandsToml.intents)) {
		return issues;
	}

	const lockToIntents = new Map<string, string[]>();

	for (const [intentName, intent] of Object.entries(commandsToml.intents)) {
		if (!isRecord(intent)) {
			continue;
		}

		if (
			intent.status !== 'configured' ||
			intent.lifecycle !== 'oneshot' ||
			intent.run_policy !== 'agent_allowed' ||
			Array.isArray(intent.effects)
		) {
			continue;
		}

		for (const rawPath of readStringArray(intent, 'writes') ?? []) {
			const lock = pathLockKey(rawPath);
			lockToIntents.set(lock, [...(lockToIntents.get(lock) ?? []), intentName]);
		}
	}

	for (const [lock, intents] of lockToIntents) {
		if (intents.length < 2) {
			continue;
		}

		issues.push({
			severity: 'warning',
			message: `configured agent-runnable intents ${intents.sort((left, right) => left.localeCompare(right)).join(', ')} share ${lock} through writes without explicit effects or resource locks`,
		});
	}

	return issues;
}
