import path from 'node:path';

import { PUBLIC_SURFACE_UPDATE_POLICIES } from './change-classification.js';
import { isRecord, type TomlTable } from './config-loading.js';

export type ContractModelId = 'changes' | 'validations' | 'surfaces' | 'artifacts' | 'policy';

export type ContractModelStatus = 'candidate' | 'deferred';

export interface ContractModelDefinition {
	readonly id: ContractModelId;
	readonly filePath: string;
	readonly status: ContractModelStatus;
	readonly installByDefault: boolean;
	readonly purpose: string;
	readonly authority: 'planning' | 'policy';
}

export type ContractModelValidationIssueCode =
	| 'deferred_model_present'
	| 'root_not_table'
	| 'unknown_top_level_field'
	| 'missing_rules'
	| 'rules_not_array'
	| 'rule_not_table'
	| 'unknown_rule_field'
	| 'command_authority_field'
	| 'invalid_schema_version'
	| 'invalid_rule_id'
	| 'invalid_match'
	| 'invalid_match_kind'
	| 'invalid_match_path'
	| 'invalid_string_array'
	| 'invalid_boolean'
	| 'invalid_update_policy';

export interface ContractModelValidationIssue {
	readonly code: ContractModelValidationIssueCode;
	readonly path: string;
	readonly message: string;
}

export const CONTRACT_MODEL_DEFINITIONS: readonly ContractModelDefinition[] = [
	{
		id: 'changes',
		filePath: '.mustflow/config/changes.toml',
		status: 'candidate',
		installByDefault: false,
		purpose: 'Describe changed-file classes that can feed verification and surface planning.',
		authority: 'planning',
	},
	{
		id: 'validations',
		filePath: '.mustflow/config/validations.toml',
		status: 'candidate',
		installByDefault: false,
		purpose: 'Describe validation reasons and their relationship to configured command intents.',
		authority: 'planning',
	},
	{
		id: 'surfaces',
		filePath: '.mustflow/config/surfaces.toml',
		status: 'candidate',
		installByDefault: false,
		purpose: 'Describe public and installed surfaces that may need drift checks after changes.',
		authority: 'planning',
	},
	{
		id: 'artifacts',
		filePath: '.mustflow/config/artifacts.toml',
		status: 'candidate',
		installByDefault: false,
		purpose: 'Describe generated or packaged artifacts that need inclusion and freshness checks.',
		authority: 'planning',
	},
	{
		id: 'policy',
		filePath: '.mustflow/config/policy.toml',
		status: 'deferred',
		installByDefault: false,
		purpose: 'Reserved for future cross-cutting policy once smaller contract files have settled.',
		authority: 'policy',
	},
] as const;

export function getContractModelDefinitions(): readonly ContractModelDefinition[] {
	return CONTRACT_MODEL_DEFINITIONS;
}

export function getCandidateContractModelDefinitions(): readonly ContractModelDefinition[] {
	return CONTRACT_MODEL_DEFINITIONS.filter((model) => model.status === 'candidate');
}

export function getNonInstalledContractConfigPaths(): readonly string[] {
	return CONTRACT_MODEL_DEFINITIONS
		.filter((model) => !model.installByDefault)
		.map((model) => model.filePath);
}

const PATH_CLASSIFICATION_MODEL_IDS = new Set<ContractModelId>(['changes', 'surfaces']);
const ALLOWED_TOP_LEVEL_FIELDS = new Set(['schema_version', 'rules']);
const ALLOWED_RULE_FIELDS = new Set([
	'id',
	'description',
	'match',
	'change_kinds',
	'surface_kind',
	'category',
	'is_public_surface',
	'validation_reasons',
	'affected_contracts',
	'update_policy',
	'drift_checks',
]);
const ALLOWED_MATCH_FIELDS = new Set(['kind', 'path']);
const ALLOWED_MATCH_KINDS = new Set(['exact', 'prefix', 'glob']);
const ALLOWED_UPDATE_POLICIES = new Set<string>(PUBLIC_SURFACE_UPDATE_POLICIES);
const FORBIDDEN_PATH_CLASSIFICATION_AUTHORITY_FIELDS = new Set([
	'argv',
	'cmd',
	'run_policy',
	'lifecycle',
	'stdin',
	'timeout_seconds',
	'writes',
	'network',
	'destructive',
	'required_after',
	'skip_validation',
	'status',
	'intents',
	'command_intents',
	'commands',
	'command',
	'run',
	'execute',
	'action',
	'actions',
	'agent_action',
	'agent_actions',
]);

function pushIssue(
	issues: ContractModelValidationIssue[],
	code: ContractModelValidationIssueCode,
	pathLabel: string,
	message: string,
): void {
	issues.push({ code, path: pathLabel, message });
}

function isSafeRelativePath(value: unknown): value is string {
	if (typeof value !== 'string' || value.trim().length === 0) {
		return false;
	}

	const normalized = value.replaceAll('\\', '/');
	const segments = normalized.split('/').filter(Boolean);

	if (path.posix.isAbsolute(normalized) || path.win32.isAbsolute(value)) {
		return false;
	}

	return segments.length > 0 && segments.every((segment) => segment !== '.' && segment !== '..');
}

function validateStringArrayField(
	table: TomlTable,
	key: string,
	pathLabel: string,
	issues: ContractModelValidationIssue[],
): void {
	if (!Object.hasOwn(table, key)) {
		return;
	}

	const value = table[key];
	if (!Array.isArray(value) || value.some((entry) => typeof entry !== 'string' || entry.trim().length === 0)) {
		pushIssue(issues, 'invalid_string_array', `${pathLabel}.${key}`, `${pathLabel}.${key} must be a string array`);
	}
}

function validateForbiddenAuthorityFields(
	value: unknown,
	pathLabel: string,
	issues: ContractModelValidationIssue[],
): void {
	if (Array.isArray(value)) {
		value.forEach((entry, index) => validateForbiddenAuthorityFields(entry, `${pathLabel}[${index}]`, issues));
		return;
	}

	if (!isRecord(value)) {
		return;
	}

	for (const [key, nestedValue] of Object.entries(value)) {
		const fieldPath = pathLabel ? `${pathLabel}.${key}` : key;

		if (FORBIDDEN_PATH_CLASSIFICATION_AUTHORITY_FIELDS.has(key)) {
			pushIssue(
				issues,
				'command_authority_field',
				fieldPath,
				`${fieldPath} cannot define command authority; use .mustflow/config/commands.toml`,
			);
		}

		validateForbiddenAuthorityFields(nestedValue, fieldPath, issues);
	}
}

function validateMatchTable(
	match: unknown,
	pathLabel: string,
	issues: ContractModelValidationIssue[],
): void {
	if (!isRecord(match)) {
		pushIssue(issues, 'invalid_match', pathLabel, `${pathLabel} must be a TOML table`);
		return;
	}

	for (const key of Object.keys(match)) {
		if (!ALLOWED_MATCH_FIELDS.has(key)) {
			pushIssue(issues, 'unknown_rule_field', `${pathLabel}.${key}`, `${pathLabel}.${key} is not allowed`);
		}
	}

	if (!ALLOWED_MATCH_KINDS.has(String(match.kind))) {
		pushIssue(
			issues,
			'invalid_match_kind',
			`${pathLabel}.kind`,
			`${pathLabel}.kind must be "exact", "prefix", or "glob"; regular expressions are deferred`,
		);
	}

	if (!isSafeRelativePath(match.path)) {
		pushIssue(
			issues,
			'invalid_match_path',
			`${pathLabel}.path`,
			`${pathLabel}.path must be a non-empty relative path inside the current root`,
		);
	}
}

function validatePathClassificationRule(
	rule: unknown,
	index: number,
	issues: ContractModelValidationIssue[],
): void {
	const pathLabel = `rules[${index}]`;

	if (!isRecord(rule)) {
		pushIssue(issues, 'rule_not_table', pathLabel, `${pathLabel} must be a TOML table`);
		return;
	}

	for (const key of Object.keys(rule)) {
		if (!ALLOWED_RULE_FIELDS.has(key)) {
			pushIssue(issues, 'unknown_rule_field', `${pathLabel}.${key}`, `${pathLabel}.${key} is not allowed`);
		}
	}

	if (typeof rule.id !== 'string' || rule.id.trim().length === 0) {
		pushIssue(issues, 'invalid_rule_id', `${pathLabel}.id`, `${pathLabel}.id must be a non-empty string`);
	}

	validateMatchTable(rule.match, `${pathLabel}.match`, issues);
	validateStringArrayField(rule, 'change_kinds', pathLabel, issues);
	validateStringArrayField(rule, 'validation_reasons', pathLabel, issues);
	validateStringArrayField(rule, 'affected_contracts', pathLabel, issues);
	validateStringArrayField(rule, 'drift_checks', pathLabel, issues);

	if (Object.hasOwn(rule, 'is_public_surface') && typeof rule.is_public_surface !== 'boolean') {
		pushIssue(
			issues,
			'invalid_boolean',
			`${pathLabel}.is_public_surface`,
			`${pathLabel}.is_public_surface must be a boolean`,
		);
	}

	if (Object.hasOwn(rule, 'update_policy') && !ALLOWED_UPDATE_POLICIES.has(String(rule.update_policy))) {
		pushIssue(
			issues,
			'invalid_update_policy',
			`${pathLabel}.update_policy`,
			`${pathLabel}.update_policy must be "update", "update_or_mark_stale", or "not_applicable"`,
		);
	}
}

function validatePathClassificationModelConfig(value: unknown): ContractModelValidationIssue[] {
	const issues: ContractModelValidationIssue[] = [];

	if (!isRecord(value)) {
		pushIssue(issues, 'root_not_table', '', 'must contain a TOML table');
		return issues;
	}

	validateForbiddenAuthorityFields(value, '', issues);

	for (const key of Object.keys(value)) {
		if (!ALLOWED_TOP_LEVEL_FIELDS.has(key)) {
			pushIssue(issues, 'unknown_top_level_field', key, `${key} is not allowed at the top level`);
		}
	}

	if (Object.hasOwn(value, 'schema_version') && typeof value.schema_version !== 'string') {
		pushIssue(issues, 'invalid_schema_version', 'schema_version', 'schema_version must be a string');
	}

	if (!Object.hasOwn(value, 'rules')) {
		pushIssue(issues, 'missing_rules', 'rules', 'must define [[rules]]');
		return issues;
	}

	const rules = value.rules;
	if (!Array.isArray(rules) || rules.length === 0) {
		pushIssue(issues, 'rules_not_array', 'rules', 'rules must be a non-empty array of TOML tables');
		return issues;
	}

	rules.forEach((rule, index) => validatePathClassificationRule(rule, index, issues));

	return issues;
}

export function validateCandidateContractModelConfig(
	model: ContractModelDefinition,
	value: unknown,
): readonly ContractModelValidationIssue[] {
	if (model.status === 'deferred') {
		return [
			{
				code: 'deferred_model_present',
				path: model.filePath,
				message: `${model.filePath} is deferred; use narrow candidate contract files instead`,
			},
		];
	}

	if (!PATH_CLASSIFICATION_MODEL_IDS.has(model.id)) {
		return [];
	}

	return validatePathClassificationModelConfig(value).map((issue) => ({
		...issue,
		message: issue.path ? `${model.filePath} ${issue.message}` : `${model.filePath} ${issue.message}`,
	}));
}
