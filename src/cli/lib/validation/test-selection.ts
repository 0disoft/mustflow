import { existsSync } from 'node:fs';
import path from 'node:path';

import { isRecord, type TomlTable } from '../command-contract.js';
import { readMustflowTomlFile } from '../toml.js';
import {
	ALLOWED_TEST_SELECTION_RISKS,
	FORBIDDEN_TEST_SELECTION_COMMAND_AUTHORITY_FIELDS,
	TEST_SELECTION_CONFIG_PATH,
} from './constants.js';
import { isConfiguredCommandIntent, isDeclaredCommandIntent } from './command-intents.js';
import {
	hasOwn,
	pushStrictIssue,
	validateAllowedStringField,
	validateNestedTable,
	validatePathArrayField,
	validateRequiredStringField,
	validateStringArrayField,
} from './primitives.js';
import type { CheckIssue } from './types.js';
function validateNoTestSelectionCommandAuthorityFields(label: string, table: TomlTable, issues: CheckIssue[]): void {
	for (const field of FORBIDDEN_TEST_SELECTION_COMMAND_AUTHORITY_FIELDS) {
		if (hasOwn(table, field)) {
			pushStrictIssue(
				issues,
				`${TEST_SELECTION_CONFIG_PATH} ${label}.${field} cannot define command authority; use .mustflow/config/commands.toml`,
			);
		}
	}
}

function validateTestSelectionIntentReference(
	value: unknown,
	label: string,
	commandsToml: TomlTable | undefined,
	issues: CheckIssue[],
): void {
	if (typeof value !== 'string' || value.trim().length === 0) {
		pushStrictIssue(issues, `${TEST_SELECTION_CONFIG_PATH} ${label} must be a command intent name`);
		return;
	}

	if (!isDeclaredCommandIntent(commandsToml, value)) {
		pushStrictIssue(issues, `${TEST_SELECTION_CONFIG_PATH} ${label} references unknown command intent "${value}"`);
		return;
	}

	if (!isConfiguredCommandIntent(commandsToml, value)) {
		pushStrictIssue(issues, `${TEST_SELECTION_CONFIG_PATH} ${label} references command intent "${value}" that is not configured`);
	}
}

function validateTestSelectionRule(
	rule: unknown,
	index: number,
	commandsToml: TomlTable | undefined,
	issues: CheckIssue[],
): void {
	const label = `rules[${index}]`;

	if (!isRecord(rule)) {
		pushStrictIssue(issues, `${TEST_SELECTION_CONFIG_PATH} ${label} must be a TOML table`);
		return;
	}

	validateNoTestSelectionCommandAuthorityFields(label, rule, issues);
	validateRequiredStringField(rule, 'id', `${TEST_SELECTION_CONFIG_PATH} ${label}.id`, issues);
	validateRequiredStringField(rule, 'reason', `${TEST_SELECTION_CONFIG_PATH} ${label}.reason`, issues);
	validateRequiredStringField(rule, 'risk', `${TEST_SELECTION_CONFIG_PATH} ${label}.risk`, issues);
	validateAllowedStringField(rule, 'risk', `${TEST_SELECTION_CONFIG_PATH} ${label}.risk`, ALLOWED_TEST_SELECTION_RISKS, issues);

	const match = validateNestedTable(rule, 'match', `${TEST_SELECTION_CONFIG_PATH} ${label}.match`, issues);
	if (!hasOwn(rule, 'match')) {
		pushStrictIssue(issues, `${TEST_SELECTION_CONFIG_PATH} ${label} must define match`);
	}
	if (match) {
		validateNoTestSelectionCommandAuthorityFields(`${label}.match`, match, issues);
		validatePathArrayField(match, 'paths', `${TEST_SELECTION_CONFIG_PATH} ${label}.match.paths`, issues);
		validateStringArrayField(match, 'surfaces', `${TEST_SELECTION_CONFIG_PATH} ${label}.match.surfaces`, issues);
		if (!hasOwn(match, 'paths')) {
			pushStrictIssue(issues, `${TEST_SELECTION_CONFIG_PATH} ${label}.match must define paths`);
		}
		if (!hasOwn(match, 'surfaces')) {
			pushStrictIssue(issues, `${TEST_SELECTION_CONFIG_PATH} ${label}.match must define surfaces`);
		}
	}

	const select = validateNestedTable(rule, 'select', `${TEST_SELECTION_CONFIG_PATH} ${label}.select`, issues);
	if (!hasOwn(rule, 'select')) {
		pushStrictIssue(issues, `${TEST_SELECTION_CONFIG_PATH} ${label} must define select`);
	}
	if (select) {
		validateNoTestSelectionCommandAuthorityFields(`${label}.select`, select, issues);
		validateTestSelectionIntentReference(select.intent, `${label}.select.intent`, commandsToml, issues);
		validateTestSelectionIntentReference(select.fallback_intent, `${label}.select.fallback_intent`, commandsToml, issues);
		validatePathArrayField(select, 'test_targets', `${TEST_SELECTION_CONFIG_PATH} ${label}.select.test_targets`, issues);
	}
}

export function validateStrictTestSelectionConfig(
	projectRoot: string,
	commandsToml: TomlTable | undefined,
	issues: CheckIssue[],
): void {
	const configPath = path.join(projectRoot, ...TEST_SELECTION_CONFIG_PATH.split('/'));

	if (!existsSync(configPath)) {
		return;
	}

	let parsed: unknown;
	try {
		parsed = readMustflowTomlFile(projectRoot, TEST_SELECTION_CONFIG_PATH);
	} catch (error) {
		const message = error instanceof Error ? error.message : String(error);
		pushStrictIssue(issues, `Invalid TOML in ${TEST_SELECTION_CONFIG_PATH}: ${message}`);
		return;
	}

	if (!isRecord(parsed)) {
		pushStrictIssue(issues, `${TEST_SELECTION_CONFIG_PATH} must contain a TOML table`);
		return;
	}

	validateNoTestSelectionCommandAuthorityFields('root', parsed, issues);
	validateRequiredStringField(parsed, 'schema_version', `${TEST_SELECTION_CONFIG_PATH}.schema_version`, issues);
	if (parsed.schema_version !== '1') {
		pushStrictIssue(issues, `${TEST_SELECTION_CONFIG_PATH}.schema_version must be "1"`);
	}

	if (!Array.isArray(parsed.rules) || parsed.rules.length === 0) {
		pushStrictIssue(issues, `${TEST_SELECTION_CONFIG_PATH} must define [[rules]]`);
		return;
	}

	for (const [index, rule] of parsed.rules.entries()) {
		validateTestSelectionRule(rule, index, commandsToml, issues);
	}
}
