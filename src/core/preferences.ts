import { existsSync } from 'node:fs';
import path from 'node:path';

import {
	isRecord,
	readMustflowOwnedTomlFile,
	type TomlTable,
} from './config-loading.js';

export const PREFERENCES_CONFIG_RELATIVE_PATH = '.mustflow/config/preferences.toml';

function hasMustflowMarker(directoryPath: string): boolean {
	return (
		existsSync(path.join(directoryPath, '.mustflow', 'config', 'mustflow.toml')) ||
		existsSync(path.join(directoryPath, '.mustflow', 'config', 'commands.toml'))
	);
}

function preferencesPath(projectRoot: string): string {
	return path.join(projectRoot, ...PREFERENCES_CONFIG_RELATIVE_PATH.split('/'));
}

function readPreferencesAtRoot(projectRoot: string): TomlTable | undefined {
	if (!existsSync(preferencesPath(projectRoot))) {
		return undefined;
	}

	const parsed = readMustflowOwnedTomlFile(projectRoot, PREFERENCES_CONFIG_RELATIVE_PATH);
	return isRecord(parsed) ? parsed : undefined;
}

function parentMustflowRoots(projectRoot: string): string[] {
	const roots: string[] = [];
	let current = path.dirname(path.resolve(projectRoot));

	while (true) {
		if (hasMustflowMarker(current)) {
			roots.push(current);
		}

		const parent = path.dirname(current);

		if (parent === current) {
			return roots;
		}

		current = parent;
	}
}

function clonePreferenceValue(value: unknown): unknown {
	if (Array.isArray(value)) {
		return value.map((entry) => clonePreferenceValue(entry));
	}

	if (isRecord(value)) {
		return mergePreferenceTables({}, value);
	}

	return value;
}

function mergePreferenceTables(base: TomlTable, override: TomlTable): TomlTable {
	const merged: TomlTable = {};

	for (const [key, value] of Object.entries(base)) {
		merged[key] = clonePreferenceValue(value);
	}

	for (const [key, value] of Object.entries(override)) {
		const existing = merged[key];

		if (isRecord(existing) && isRecord(value)) {
			merged[key] = mergePreferenceTables(existing, value);
		} else {
			merged[key] = clonePreferenceValue(value);
		}
	}

	return merged;
}

export function readLocalPreferencesToml(projectRoot: string): TomlTable | undefined {
	return readPreferencesAtRoot(projectRoot);
}

/**
 * mf:anchor core.preferences.inheritance
 * purpose: Resolve low-authority workflow preferences across nested mustflow roots.
 * search: preferences inheritance, parent workspace defaults, git auto push, release versioning
 * invariant: Parent preferences are defaults only; child-local values override field by field, and command contracts are never inherited here.
 * risk: config
 */
export function readEffectivePreferencesToml(projectRoot: string): TomlTable | undefined {
	const roots = [...parentMustflowRoots(projectRoot).reverse(), path.resolve(projectRoot)];
	let effective: TomlTable | undefined;

	for (const root of roots) {
		const preferences = readPreferencesAtRoot(root);

		if (!preferences) {
			continue;
		}

		effective = effective ? mergePreferenceTables(effective, preferences) : mergePreferenceTables({}, preferences);
	}

	return effective;
}
