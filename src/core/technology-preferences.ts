import { existsSync } from 'node:fs';
import path from 'node:path';

import { isRecord, type TomlTable } from './config-loading.js';

export const TECHNOLOGY_CONFIG_RELATIVE_PATH = '.mustflow/config/technology.toml';
export const TECHNOLOGY_SCHEMA_VERSION = '1';
export const TECHNOLOGY_AUTHORITY = 'hint';
export const TECHNOLOGY_GUIDANCE = [
	'Technology preferences are hints only; inspect the current repository stack before proposing changes.',
	'They do not authorize dependency installation, framework migration, command execution, or ignoring existing style.',
	'When adding packages, verify package reality and use the configured command contract or direct user approval.',
] as const;

export const TECHNOLOGY_KINDS = [
	'language',
	'runtime',
	'framework',
	'library',
	'tool',
	'service',
	'platform',
] as const;
export const TECHNOLOGY_STATUSES = ['preferred', 'allowed', 'avoid'] as const;

export type TechnologyKind = (typeof TECHNOLOGY_KINDS)[number];
export type TechnologyStatus = (typeof TECHNOLOGY_STATUSES)[number];

export interface TechnologyPreference {
	readonly id: string;
	readonly kind: TechnologyKind;
	readonly name: string;
	readonly status: TechnologyStatus;
	readonly authority: typeof TECHNOLOGY_AUTHORITY;
	readonly scope: readonly string[];
	readonly ecosystem: string | null;
	readonly packages: readonly string[];
	readonly rationale: string | null;
	readonly constraints: readonly string[];
}

export interface TechnologyPreferencesFile {
	readonly path: string;
	readonly exists: boolean;
	readonly schema_version: string;
	readonly authority: typeof TECHNOLOGY_AUTHORITY;
	readonly guidance: readonly string[];
	readonly preferences: readonly TechnologyPreference[];
	readonly issues: readonly string[];
}

function isTechnologyKind(value: string): value is TechnologyKind {
	return (TECHNOLOGY_KINDS as readonly string[]).includes(value);
}

function isTechnologyStatus(value: string): value is TechnologyStatus {
	return (TECHNOLOGY_STATUSES as readonly string[]).includes(value);
}

function readString(value: unknown): string | null {
	return typeof value === 'string' && value.trim().length > 0 ? value.trim() : null;
}

function readStringArray(value: unknown): readonly string[] | null {
	if (!Array.isArray(value)) {
		return null;
	}

	const entries = value
		.filter((entry): entry is string => typeof entry === 'string')
		.map((entry) => entry.trim())
		.filter((entry) => entry.length > 0);

	return entries.length === value.length ? entries : null;
}

function normalizeStringList(values: readonly string[]): readonly string[] {
	return [...new Set(values.map((value) => value.trim()).filter((value) => value.length > 0))];
}

export function normalizeTechnologyName(value: string): string {
	return value.trim().replace(/\s+/gu, ' ');
}

export function normalizeTechnologyKey(value: string): string {
	return normalizeTechnologyName(value).toLowerCase();
}

function slug(value: string): string {
	const normalized = normalizeTechnologyKey(value)
		.replace(/[^a-z0-9]+/gu, '-')
		.replace(/^-+|-+$/gu, '');

	return normalized.length > 0 ? normalized : 'item';
}

export function createTechnologyPreferenceId(kind: TechnologyKind, name: string, scope: readonly string[]): string {
	const scopePart = scope.length > 0 ? `${slug(scope[0])}.` : '';
	return `${kind}.${scopePart}${slug(name)}`;
}

function normalizePreference(raw: TomlTable, index: number, issues: string[]): TechnologyPreference | null {
	const rawKind = readString(raw.kind);
	if (!rawKind || !isTechnologyKind(rawKind)) {
		issues.push(`[preferences.${index}].kind must be one of ${TECHNOLOGY_KINDS.join(', ')}`);
		return null;
	}

	const rawName = readString(raw.name);
	if (!rawName) {
		issues.push(`[preferences.${index}].name must be a non-empty string`);
		return null;
	}

	const rawStatus = readString(raw.status) ?? 'preferred';
	if (!isTechnologyStatus(rawStatus)) {
		issues.push(`[preferences.${index}].status must be preferred, allowed, or avoid`);
		return null;
	}

	const rawAuthority = readString(raw.authority) ?? TECHNOLOGY_AUTHORITY;
	if (rawAuthority !== TECHNOLOGY_AUTHORITY) {
		issues.push(`[preferences.${index}].authority must be "${TECHNOLOGY_AUTHORITY}"`);
		return null;
	}

	const scope = normalizeStringList(readStringArray(raw.scope) ?? []);
	const packages = normalizeStringList(readStringArray(raw.packages) ?? []);
	const constraints = normalizeStringList(readStringArray(raw.constraints) ?? []);
	const id = readString(raw.id) ?? createTechnologyPreferenceId(rawKind, rawName, scope);

	return {
		id,
		kind: rawKind,
		name: normalizeTechnologyName(rawName),
		status: rawStatus,
		authority: TECHNOLOGY_AUTHORITY,
		scope,
		ecosystem: readString(raw.ecosystem),
		packages,
		rationale: readString(raw.rationale),
		constraints,
	};
}

export function normalizeTechnologyPreferencesTable(
	table: TomlTable | undefined,
	exists: boolean,
): TechnologyPreferencesFile {
	const issues: string[] = [];
	const schemaVersion = table ? readString(table.schema_version) ?? '' : TECHNOLOGY_SCHEMA_VERSION;

	if (table && schemaVersion !== TECHNOLOGY_SCHEMA_VERSION) {
		issues.push(`[technology].schema_version must be "${TECHNOLOGY_SCHEMA_VERSION}"`);
	}

	const rawPreferences = table?.preferences;
	const preferences: TechnologyPreference[] = [];

	if (rawPreferences !== undefined) {
		if (!Array.isArray(rawPreferences)) {
			issues.push('[technology].preferences must be an array of tables');
		} else {
			for (const [index, rawPreference] of rawPreferences.entries()) {
				if (!isRecord(rawPreference)) {
					issues.push(`[preferences.${index}] must be a TOML table`);
					continue;
				}

				const preference = normalizePreference(rawPreference, index, issues);
				if (preference) {
					preferences.push(preference);
				}
			}
		}
	}

	const seenIds = new Set<string>();
	for (const preference of preferences) {
		if (seenIds.has(preference.id)) {
			issues.push(`[technology].preferences contains duplicate id "${preference.id}"`);
			continue;
		}

		seenIds.add(preference.id);
	}

	return {
		path: TECHNOLOGY_CONFIG_RELATIVE_PATH,
		exists,
		schema_version: schemaVersion || TECHNOLOGY_SCHEMA_VERSION,
		authority: TECHNOLOGY_AUTHORITY,
		guidance: TECHNOLOGY_GUIDANCE,
		preferences,
		issues,
	};
}

export function technologyPreferenceMatches(
	preference: TechnologyPreference,
	filters: {
		readonly scope?: string | null;
		readonly kind?: string | null;
		readonly status?: string | null;
	},
): boolean {
	if (filters.kind && preference.kind !== filters.kind) {
		return false;
	}

	if (filters.status && preference.status !== filters.status) {
		return false;
	}

	if (filters.scope) {
		const expectedScope = normalizeTechnologyKey(filters.scope);
		if (!preference.scope.some((scope) => normalizeTechnologyKey(scope) === expectedScope)) {
			return false;
		}
	}

	return true;
}

function quoteTomlString(value: string): string {
	return JSON.stringify(value);
}

function renderStringArray(values: readonly string[]): string {
	return `[${values.map((value) => quoteTomlString(value)).join(', ')}]`;
}

export function serializeTechnologyPreferences(preferences: readonly TechnologyPreference[]): string {
	const lines = [
		`schema_version = ${quoteTomlString(TECHNOLOGY_SCHEMA_VERSION)}`,
		'',
		'# Repository-local technology preferences for agents.',
		'# Entries here are low-authority hints. They do not authorize dependency installation,',
		'# migration, command execution, or ignoring current project style.',
	];

	for (const preference of [...preferences].sort((left, right) => left.id.localeCompare(right.id))) {
		lines.push(
			'',
			'[[preferences]]',
			`id = ${quoteTomlString(preference.id)}`,
			`kind = ${quoteTomlString(preference.kind)}`,
			`name = ${quoteTomlString(preference.name)}`,
			`status = ${quoteTomlString(preference.status)}`,
			`authority = ${quoteTomlString(TECHNOLOGY_AUTHORITY)}`,
			`scope = ${renderStringArray(preference.scope)}`,
		);

		if (preference.ecosystem) {
			lines.push(`ecosystem = ${quoteTomlString(preference.ecosystem)}`);
		}

		if (preference.packages.length > 0) {
			lines.push(`packages = ${renderStringArray(preference.packages)}`);
		}

		if (preference.rationale) {
			lines.push(`rationale = ${quoteTomlString(preference.rationale)}`);
		}

		if (preference.constraints.length > 0) {
			lines.push(`constraints = ${renderStringArray(preference.constraints)}`);
		}
	}

	return `${lines.join('\n')}\n`;
}

export function technologyConfigExists(projectRoot: string): boolean {
	return existsSync(path.join(projectRoot, ...TECHNOLOGY_CONFIG_RELATIVE_PATH.split('/')));
}
