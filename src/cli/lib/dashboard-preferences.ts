import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

import { isRecord, type TomlTable } from './command-contract.js';
import { isLocaleTag } from './locale-tags.js';
import { markManifestLockFileCustomized } from './manifest-lock.js';
import { COMMIT_MESSAGE_STYLES, TEST_AUTHORING_POLICIES } from './preferences-options.js';
import { readTomlFile } from './toml.js';

export type DashboardSettingKind = 'boolean' | 'select' | 'number';

export interface DashboardSettingDefinition {
	readonly id: string;
	readonly path: readonly string[];
	readonly label: string;
	readonly kind: DashboardSettingKind;
	readonly fallback: string | boolean | number;
	readonly options?: readonly string[];
	readonly acceptsLocaleTag?: boolean;
	readonly min?: number;
	readonly max?: number;
	readonly locked?: boolean;
	readonly lockedReason?: string;
}

export interface DashboardSetting extends DashboardSettingDefinition {
	readonly value: string | boolean | number;
	readonly editable: boolean;
}

export interface DashboardPreferencesSnapshot {
	readonly projectRoot: string;
	readonly preferencesPath: string;
	readonly settings: readonly DashboardSetting[];
}

export interface DashboardPreferenceUpdate {
	readonly id: string;
	readonly value: unknown;
}

const PREFERENCES_RELATIVE_PATH = '.mustflow/config/preferences.toml';

export const DASHBOARD_PREFERENCE_SETTINGS: readonly DashboardSettingDefinition[] = [
	{
		id: 'git.auto_stage',
		path: ['git', 'auto_stage'],
		label: 'Git auto stage',
		kind: 'boolean',
		fallback: false,
	},
	{
		id: 'git.auto_commit',
		path: ['git', 'auto_commit'],
		label: 'Git auto commit',
		kind: 'boolean',
		fallback: false,
	},
	{
		id: 'git.auto_push',
		path: ['git', 'auto_push'],
		label: 'Git auto push',
		kind: 'boolean',
		fallback: false,
		locked: true,
		lockedReason: 'dashboard.locked.git.auto_push',
	},
	{
		id: 'git.commit_message.style',
		path: ['git', 'commit_message', 'style'],
		label: 'Commit message style',
		kind: 'select',
		fallback: 'conventional',
		options: COMMIT_MESSAGE_STYLES,
	},
	{
		id: 'git.commit_message.language',
		path: ['git', 'commit_message', 'language'],
		label: 'Commit message language',
		kind: 'select',
		fallback: 'preserve_existing',
		options: ['preserve_existing', 'agent_response', 'docs', 'en', 'ko', 'zh', 'es', 'fr', 'hi'],
		acceptsLocaleTag: true,
	},
	{
		id: 'git.commit_message.max_suggestions',
		path: ['git', 'commit_message', 'max_suggestions'],
		label: 'Commit message suggestion count',
		kind: 'number',
		fallback: 2,
		min: 1,
		max: 5,
	},
	{
		id: 'git.commit_message.include_body',
		path: ['git', 'commit_message', 'include_body'],
		label: 'Commit body',
		kind: 'select',
		fallback: 'when_non_trivial',
		options: ['never', 'when_non_trivial', 'always'],
	},
	{
		id: 'git.commit_message.split_when_multiple_concerns',
		path: ['git', 'commit_message', 'split_when_multiple_concerns'],
		label: 'Suggest split commits',
		kind: 'boolean',
		fallback: true,
	},
	{
		id: 'git.commit_message.avoid_sensitive_details',
		path: ['git', 'commit_message', 'avoid_sensitive_details'],
		label: 'Avoid sensitive details',
		kind: 'boolean',
		fallback: true,
	},
	{
		id: 'reporting.commit_suggestion.enabled',
		path: ['reporting', 'commit_suggestion', 'enabled'],
		label: 'Commit message suggestions',
		kind: 'boolean',
		fallback: true,
	},
	{
		id: 'verification.selection.strategy',
		path: ['verification', 'selection', 'strategy'],
		label: 'Verification strategy',
		kind: 'select',
		fallback: 'risk_based',
		options: ['risk_based', 'targeted', 'full'],
	},
	{
		id: 'verification.selection.prefer_related_tests',
		path: ['verification', 'selection', 'prefer_related_tests'],
		label: 'Prefer related tests',
		kind: 'boolean',
		fallback: true,
	},
	{
		id: 'verification.selection.skip_docs_only_full_test',
		path: ['verification', 'selection', 'skip_docs_only_full_test'],
		label: 'Skip full test for docs-only changes',
		kind: 'boolean',
		fallback: true,
	},
	{
		id: 'verification.selection.skip_low_risk_code_full_test',
		path: ['verification', 'selection', 'skip_low_risk_code_full_test'],
		label: 'Skip full test for low-risk code changes',
		kind: 'boolean',
		fallback: true,
	},
	{
		id: 'verification.selection.skip_translation_only_full_test',
		path: ['verification', 'selection', 'skip_translation_only_full_test'],
		label: 'Skip full test for translation-only changes',
		kind: 'boolean',
		fallback: true,
	},
	{
		id: 'verification.selection.skip_copy_only_full_test',
		path: ['verification', 'selection', 'skip_copy_only_full_test'],
		label: 'Skip full test for copy-only changes',
		kind: 'boolean',
		fallback: true,
	},
	{
		id: 'verification.selection.report_skipped',
		path: ['verification', 'selection', 'report_skipped'],
		label: 'Report skipped verification',
		kind: 'boolean',
		fallback: true,
	},
	{
		id: 'testing.authoring.new_test_policy',
		path: ['testing', 'authoring', 'new_test_policy'],
		label: 'New test policy',
		kind: 'select',
		fallback: 'evidence_required',
		options: TEST_AUTHORING_POLICIES,
	},
	{
		id: 'testing.authoring.prefer_existing_tests',
		path: ['testing', 'authoring', 'prefer_existing_tests'],
		label: 'Prefer existing tests',
		kind: 'boolean',
		fallback: true,
	},
	{
		id: 'testing.authoring.require_new_test_rationale',
		path: ['testing', 'authoring', 'require_new_test_rationale'],
		label: 'Require new test rationale',
		kind: 'boolean',
		fallback: true,
	},
	{
		id: 'code_style.avoid_drive_by_refactors',
		path: ['code_style', 'avoid_drive_by_refactors'],
		label: 'Avoid drive-by refactors',
		kind: 'boolean',
		fallback: true,
	},
	{
		id: 'refactoring.hotspots.large_file_candidate_kb',
		path: ['refactoring', 'hotspots', 'large_file_candidate_kb'],
		label: 'Large file candidate threshold',
		kind: 'number',
		fallback: 40,
		min: 1,
	},
	{
		id: 'refactoring.hotspots.history_days',
		path: ['refactoring', 'hotspots', 'history_days'],
		label: 'Hotspot history window',
		kind: 'number',
		fallback: 90,
		min: 1,
	},
	{
		id: 'refactoring.hotspots.primary_candidate_limit',
		path: ['refactoring', 'hotspots', 'primary_candidate_limit'],
		label: 'Primary hotspot candidate limit',
		kind: 'number',
		fallback: 50,
		min: 1,
	},
	{
		id: 'refactoring.hotspots.structure_candidate_limit',
		path: ['refactoring', 'hotspots', 'structure_candidate_limit'],
		label: 'Structure review candidate limit',
		kind: 'number',
		fallback: 10,
		min: 1,
	},
	{
		id: 'refactoring.hotspots.full_file_candidate_limit',
		path: ['refactoring', 'hotspots', 'full_file_candidate_limit'],
		label: 'Full-file review candidate limit',
		kind: 'number',
		fallback: 3,
		min: 1,
	},
	{
		id: 'release.versioning.impact_check',
		path: ['release', 'versioning', 'impact_check'],
		label: 'Version impact check',
		kind: 'boolean',
		fallback: true,
	},
	{
		id: 'release.versioning.suggest_bump',
		path: ['release', 'versioning', 'suggest_bump'],
		label: 'Suggest version bump',
		kind: 'boolean',
		fallback: true,
	},
	{
		id: 'release.versioning.auto_bump',
		path: ['release', 'versioning', 'auto_bump'],
		label: 'Auto bump versions',
		kind: 'boolean',
		fallback: false,
	},
	{
		id: 'release.versioning.require_user_confirmation',
		path: ['release', 'versioning', 'require_user_confirmation'],
		label: 'Require version confirmation',
		kind: 'boolean',
		fallback: true,
	},
	{
		id: 'release.versioning.sync_template_version',
		path: ['release', 'versioning', 'sync_template_version'],
		label: 'Sync template version',
		kind: 'boolean',
		fallback: true,
	},
	{
		id: 'release.versioning.sync_docs_examples',
		path: ['release', 'versioning', 'sync_docs_examples'],
		label: 'Sync docs examples',
		kind: 'boolean',
		fallback: true,
	},
	{
		id: 'release.versioning.sync_tests',
		path: ['release', 'versioning', 'sync_tests'],
		label: 'Sync tests',
		kind: 'boolean',
		fallback: true,
	},
];

function getPreferencesPath(projectRoot: string): string {
	return path.join(projectRoot, PREFERENCES_RELATIVE_PATH);
}

function getNestedValue(table: TomlTable, settingPath: readonly string[]): unknown {
	let current: unknown = table;

	for (const segment of settingPath) {
		if (!isRecord(current)) {
			return undefined;
		}

		current = current[segment];
	}

	return current;
}

function normalizeValue(definition: DashboardSettingDefinition, value: unknown): string | boolean | number {
	if (definition.kind === 'boolean') {
		return typeof value === 'boolean' ? value : definition.fallback;
	}

	if (definition.kind === 'number') {
		return typeof value === 'number' && Number.isInteger(value) ? value : definition.fallback;
	}

	return typeof value === 'string' && value.trim().length > 0 ? value : definition.fallback;
}

export function readDashboardPreferences(projectRoot: string): DashboardPreferencesSnapshot {
	const preferencesPath = getPreferencesPath(projectRoot);

	if (!existsSync(preferencesPath)) {
		throw new Error('Missing .mustflow/config/preferences.toml. Run mf init first or switch to a mustflow root.');
	}

	const parsed = readTomlFile(preferencesPath);

	if (!isRecord(parsed)) {
		throw new Error('.mustflow/config/preferences.toml must contain a TOML table.');
	}

	const settings = DASHBOARD_PREFERENCE_SETTINGS.map((definition) => ({
		...definition,
		editable: definition.locked !== true,
		value: normalizeValue(definition, getNestedValue(parsed, definition.path)),
	}));

	return {
		projectRoot,
		preferencesPath,
		settings,
	};
}

function serializeTomlScalar(value: string | boolean | number): string {
	if (typeof value === 'string') {
		return JSON.stringify(value);
	}

	return String(value);
}

function escapeRegExp(value: string): string {
	return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function findSectionRange(lines: readonly string[], sectionPath: readonly string[]): [number, number] | undefined {
	const sectionName = sectionPath.join('.');
	const sectionPattern = new RegExp(`^\\s*\\[${escapeRegExp(sectionName)}\\]\\s*$`, 'u');
	const anySectionPattern = /^\s*\[[^\]]+\]\s*$/u;
	const start = lines.findIndex((line) => sectionPattern.test(line));

	if (start < 0) {
		return undefined;
	}

	let end = lines.length;
	for (let index = start + 1; index < lines.length; index += 1) {
		if (anySectionPattern.test(lines[index] ?? '')) {
			end = index;
			break;
		}
	}

	return [start, end];
}

function setTomlScalar(content: string, settingPath: readonly string[], value: string | boolean | number): string {
	const newline = content.includes('\r\n') ? '\r\n' : '\n';
	const lines = content.split(/\r?\n/u);
	const key = settingPath[settingPath.length - 1];
	const sectionPath = settingPath.slice(0, -1);
	const assignment = `${key} = ${serializeTomlScalar(value)}`;

	if (!key || sectionPath.length === 0) {
		throw new Error(`Unsupported dashboard preference path: ${settingPath.join('.')}`);
	}

	const sectionRange = findSectionRange(lines, sectionPath);

	if (!sectionRange) {
		const prefix = lines.length > 0 && lines[lines.length - 1] === '' ? '' : newline;
		return `${content}${prefix}${newline}[${sectionPath.join('.')}]${newline}${assignment}${newline}`;
	}

	const [start, end] = sectionRange;
	const keyPattern = new RegExp(`^\\s*${escapeRegExp(key)}\\s*=`, 'u');

	for (let index = start + 1; index < end; index += 1) {
		if (keyPattern.test(lines[index] ?? '')) {
			const updated = [...lines];
			updated[index] = assignment;
			return updated.join(newline);
		}
	}

	const updated = [...lines];
	updated.splice(end, 0, assignment);
	return updated.join(newline);
}

function coerceUpdateValue(definition: DashboardSettingDefinition, value: unknown): string | boolean | number {
	if (definition.locked) {
		throw new Error(`${definition.id} is locked in the dashboard.`);
	}

	if (definition.kind === 'boolean') {
		if (typeof value !== 'boolean') {
			throw new Error(`${definition.id} must be a boolean.`);
		}

		return value;
	}

	if (definition.kind === 'number') {
		if (!Number.isInteger(value)) {
			throw new Error(`${definition.id} must be an integer.`);
		}

		if (definition.min !== undefined && Number(value) < definition.min) {
			throw new Error(`${definition.id} must be at least ${definition.min}.`);
		}

		if (definition.max !== undefined && Number(value) > definition.max) {
			throw new Error(`${definition.id} must be at most ${definition.max}.`);
		}

		return Number(value);
	}

	if (typeof value !== 'string') {
		throw new Error(`${definition.id} must be a string.`);
	}

	const trimmedValue = value.trim();
	if (trimmedValue.length === 0) {
		throw new Error(`${definition.id} must not be empty.`);
	}

	if (definition.options && !definition.options.includes(trimmedValue)) {
		if (definition.acceptsLocaleTag && isLocaleTag(trimmedValue)) {
			return trimmedValue;
		}

		const extra = definition.acceptsLocaleTag ? ', or a valid locale tag' : '';
		throw new Error(`${definition.id} must be one of: ${definition.options.join(', ')}${extra}.`);
	}

	return trimmedValue;
}

export function updateDashboardPreferences(
	projectRoot: string,
	updates: readonly DashboardPreferenceUpdate[],
): DashboardPreferencesSnapshot {
	const preferencesPath = getPreferencesPath(projectRoot);
	const definitionsById = new Map(DASHBOARD_PREFERENCE_SETTINGS.map((definition) => [definition.id, definition]));
	let content = readFileSync(preferencesPath, 'utf8');

	for (const update of updates) {
		const definition = definitionsById.get(update.id);

		if (!definition) {
			throw new Error(`Unknown dashboard preference: ${update.id}`);
		}

		const value = coerceUpdateValue(definition, update.value);
		content = setTomlScalar(content, definition.path, value);
	}

	writeFileSync(preferencesPath, content);
	markManifestLockFileCustomized(projectRoot, PREFERENCES_RELATIVE_PATH);
	return readDashboardPreferences(projectRoot);
}
