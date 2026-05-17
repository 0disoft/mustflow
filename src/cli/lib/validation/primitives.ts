import { existsSync } from 'node:fs';
import path from 'node:path';

import { isRecord, type TomlTable } from '../command-contract.js';
import { readTomlFile } from '../toml.js';
import {
	REQUIRED_FILES,
} from './constants.js';
import { VERSIONING_CONFIG_PATH } from '../../../core/version-sources.js';
import type { CheckIssue, ParsedConfigFiles } from './types.js';

export function hasOwn(table: TomlTable, key: string): boolean {
	return Object.prototype.hasOwnProperty.call(table, key);
}

export function isPositiveInteger(value: unknown): boolean {
	return Number.isInteger(value) && Number(value) > 0;
}

export function isSafeRelativePath(value: unknown): value is string {
	if (typeof value !== 'string' || value.trim().length === 0) {
		return false;
	}

	const normalized = value.replace(/\\/g, '/');
	const segments = normalized.split('/').filter(Boolean);

	if (path.posix.isAbsolute(normalized) || path.win32.isAbsolute(value)) {
		return false;
	}

	return segments.length > 0 && segments.every((segment) => segment !== '.' && segment !== '..');
}

export function validateRequiredFiles(projectRoot: string, issues: CheckIssue[]): void {
	for (const relativePath of REQUIRED_FILES) {
		if (!existsSync(path.join(projectRoot, relativePath))) {
			issues.push({ message: `Missing ${relativePath}` });
		}
	}
}

export function validateToml(projectRoot: string, issues: CheckIssue[]): ParsedConfigFiles {
	const parsedFiles: {
		mustflowToml?: TomlTable;
		commandsToml?: TomlTable;
		preferencesToml?: TomlTable;
		versioningToml?: TomlTable;
	} = {};

	for (const relativePath of [
		'.mustflow/config/mustflow.toml',
		'.mustflow/config/commands.toml',
		'.mustflow/config/preferences.toml',
		VERSIONING_CONFIG_PATH,
	]) {
		const filePath = path.join(projectRoot, relativePath);

		if (!existsSync(filePath)) {
			continue;
		}

		try {
			const parsed = readTomlFile(filePath);

			if (!isRecord(parsed)) {
				issues.push({ message: `${relativePath} must contain a TOML table` });
				continue;
			}

			if (relativePath.endsWith('mustflow.toml')) {
				parsedFiles.mustflowToml = parsed;
			}

			if (relativePath.endsWith('commands.toml')) {
				parsedFiles.commandsToml = parsed;
			}

			if (relativePath.endsWith('preferences.toml')) {
				parsedFiles.preferencesToml = parsed;
			}

			if (relativePath.endsWith('versioning.toml')) {
				parsedFiles.versioningToml = parsed;
			}
		} catch (error) {
			const message = error instanceof Error ? error.message : String(error);
			issues.push({ message: `Invalid TOML in ${relativePath}: ${message}` });
		}
	}

	return parsedFiles;
}

export function validateTable(config: TomlTable, tableName: string, issues: CheckIssue[]): TomlTable | undefined {
	if (!hasOwn(config, tableName)) {
		return undefined;
	}

	const table = config[tableName];

	if (!isRecord(table)) {
		issues.push({ message: `[${tableName}] must be a TOML table` });
		return undefined;
	}

	return table;
}

export function validateBooleanField(table: TomlTable, key: string, label: string, issues: CheckIssue[]): void {
	if (hasOwn(table, key) && typeof table[key] !== 'boolean') {
		issues.push({ message: `${label} must be a boolean` });
	}
}

export function validateStringField(table: TomlTable, key: string, label: string, issues: CheckIssue[]): void {
	if (hasOwn(table, key) && (typeof table[key] !== 'string' || table[key].trim().length === 0)) {
		issues.push({ message: `${label} must be a string` });
	}
}

export function validateRequiredStringField(table: TomlTable, key: string, label: string, issues: CheckIssue[]): void {
	if (!hasOwn(table, key)) {
		issues.push({ message: `${label} must be a string` });
		return;
	}

	validateStringField(table, key, label, issues);
}

export function validateStringArrayField(table: TomlTable, key: string, label: string, issues: CheckIssue[]): void {
	if (!hasOwn(table, key)) {
		return;
	}

	const value = table[key];

	if (!Array.isArray(value) || value.some((entry) => typeof entry !== 'string' || entry.trim().length === 0)) {
		issues.push({ message: `${label} must be a string array` });
	}
}

export function validateStringArrayMembers(
	table: TomlTable,
	key: string,
	label: string,
	allowedValues: ReadonlySet<string>,
	unsupportedLabel: string,
	issues: CheckIssue[],
): void {
	if (!hasOwn(table, key)) {
		return;
	}

	const value = table[key];

	if (!Array.isArray(value) || value.some((entry) => typeof entry !== 'string' || entry.trim().length === 0)) {
		issues.push({ message: `${label} must be a string array` });
		return;
	}

	for (const entry of value) {
		if (!allowedValues.has(entry)) {
			issues.push({ message: `${label} contains unsupported ${unsupportedLabel} "${entry}"` });
		}
	}
}

export function validateExactStringArrayField(
	table: TomlTable,
	key: string,
	label: string,
	expectedValues: readonly string[],
	issues: CheckIssue[],
): void {
	if (!hasOwn(table, key)) {
		return;
	}

	const value = table[key];

	if (!Array.isArray(value) || value.length !== expectedValues.length) {
		issues.push({ message: `${label} must be ${expectedValues.map((entry) => `"${entry}"`).join(', ')}` });
		return;
	}

	const hasExpectedValues = expectedValues.every((entry, index) => value[index] === entry);

	if (!hasExpectedValues) {
		issues.push({ message: `${label} must be ${expectedValues.map((entry) => `"${entry}"`).join(', ')}` });
	}
}

export function validatePositiveIntegerField(table: TomlTable, key: string, label: string, issues: CheckIssue[]): void {
	if (hasOwn(table, key) && !isPositiveInteger(table[key])) {
		issues.push({ message: `${label} must be a positive integer` });
	}
}

export function validateNestedTable(table: TomlTable, key: string, label: string, issues: CheckIssue[]): TomlTable | undefined {
	if (!hasOwn(table, key)) {
		return undefined;
	}

	const value = table[key];

	if (!isRecord(value)) {
		issues.push({ message: `${label} must be a TOML table` });
		return undefined;
	}

	return value;
}

export function validateAllowedStringField(
	table: TomlTable,
	key: string,
	label: string,
	allowedValues: ReadonlySet<string>,
	issues: CheckIssue[],
): void {
	if (!hasOwn(table, key)) {
		return;
	}

	if (typeof table[key] !== 'string' || !allowedValues.has(table[key])) {
		issues.push({ message: `${label} must be ${Array.from(allowedValues).map((value) => `"${value}"`).join(' or ')}` });
	}
}

export function validatePathField(table: TomlTable, key: string, label: string, issues: CheckIssue[]): void {
	if (hasOwn(table, key) && !isSafeRelativePath(table[key])) {
		issues.push({ message: `${label} must be a non-empty relative path` });
	}
}

export function validateRequiredPathField(table: TomlTable, key: string, label: string, issues: CheckIssue[]): void {
	if (!hasOwn(table, key)) {
		issues.push({ message: `${label} must be a non-empty relative path` });
		return;
	}

	validatePathField(table, key, label, issues);
}

export function validatePathArrayField(table: TomlTable, key: string, label: string, issues: CheckIssue[]): string[] | undefined {
	if (!hasOwn(table, key)) {
		return undefined;
	}

	const value = table[key];

	if (!Array.isArray(value) || value.length === 0 || !value.every(isSafeRelativePath)) {
		issues.push({ message: `${label} entries must be non-empty relative paths` });
		return undefined;
	}

	return value;
}

export function validateWorkspaceRoots(table: TomlTable, issues: CheckIssue[]): string[] | undefined {
	if (!hasOwn(table, 'roots')) {
		return undefined;
	}

	const value = table.roots;

	if (!Array.isArray(value) || !value.every(isSafeRelativePath)) {
		issues.push({ message: '[workspace].roots entries must be relative paths inside the current root' });
		return undefined;
	}

	return value;
}

export function pushStrictIssue(issues: CheckIssue[], message: string): void {
	issues.push({ message: `Strict: ${message}` });
}

export function pushStrictWarning(issues: CheckIssue[], message: string): void {
	issues.push({ message: `Strict warning: ${message}`, severity: 'warning' });
}
