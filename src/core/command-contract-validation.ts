import path from 'node:path';

import {
	COMMAND_LIFECYCLES,
	COMMAND_RUN_POLICIES,
	LONG_RUNNING_LIFECYCLES,
	isRecord,
	readStringArray,
	type TomlTable,
} from './config-loading.js';
import {
	COMMAND_ENV_POLICIES,
	DEFAULT_COMMAND_ENV_POLICY,
	PROJECT_LOCAL_BIN_BARE_EXECUTABLE_ALLOWLIST_KEY,
	normalizeCommandExecutableName,
	readProjectLocalBinBareExecutableAllowlist,
	resolveAllowedProjectLocalBinExecutable,
	type CommandEnvPolicy,
} from './command-env.js';
import type { CheckIssueId } from './check-issues.js';
import {
	COMMAND_EFFECT_CONCURRENCY,
	COMMAND_EFFECT_MODES,
	COMMAND_EFFECT_TYPES,
	validateCommandEffectLockWarnings,
	validateCommandEffects,
} from './command-effects.js';
import { COMMAND_PRECONDITION_KINDS } from './command-preconditions.js';
import {
	commandIntentBlockedCommandPattern,
	commandIntentHasCommandSource,
	commandIntentNameIsSafe,
} from './command-contract-rules.js';
import { MAX_COMMAND_OUTPUT_BYTES, commandMaxOutputBytesLimitMessage } from './command-output-limits.js';
import { SUCCESS_EXIT_CODES_CONTRACT_DESCRIPTION, successExitCodesAreValid } from './success-exit-codes.js';

const COMMAND_INPUT_TYPES = new Set(['path', 'enum', 'boolean', 'integer', 'literal']);
const COMMAND_INPUT_NAME_PATTERN = /^[a-z][a-z0-9_]*$/u;
const COMMAND_ARGV_PLACEHOLDER_PATTERN = /^\{([a-z][a-z0-9_]*)\}$/u;
const COMMAND_ARGV_MIXED_PLACEHOLDER_PATTERN = /\{([a-z][a-z0-9_]*)\}/u;
const WINDOWS_RESERVED_PATH_SEGMENTS = /^(?:con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\..*)?$/iu;
const SAFE_PATH_EXTENSION_PATTERN = /^\.[A-Za-z0-9][A-Za-z0-9._-]*$/u;
const ALLOW_ENV_INHERITANCE_RISKS_KEY = 'allow_env_inheritance_risks';
const ALLOW_LONG_RUNNING_COMMAND_PATTERNS_KEY = 'allow_long_running_command_patterns';

export interface CommandContractValidationIssue {
	readonly id?: CheckIssueId;
	readonly message: string;
	readonly severity?: 'warning' | 'error';
}

function commandContractIssue(message: string, id?: CheckIssueId): CommandContractValidationIssue {
	return id ? { id, message } : { message };
}

function commandContractWarning(message: string, id?: CheckIssueId): CommandContractValidationIssue {
	return id ? { id, message, severity: 'warning' } : { message, severity: 'warning' };
}

function hasOwn(table: TomlTable, key: string): boolean {
	return Object.prototype.hasOwnProperty.call(table, key);
}

function isPositiveInteger(value: unknown): boolean {
	return Number.isInteger(value) && Number(value) > 0;
}

function isInteger(value: unknown): boolean {
	return Number.isInteger(value);
}

function validateTable(config: TomlTable, tableName: string, issues: CommandContractValidationIssue[]): TomlTable | undefined {
	if (!hasOwn(config, tableName)) {
		return undefined;
	}

	const table = config[tableName];

	if (!isRecord(table)) {
		issues.push(commandContractIssue(`[${tableName}] must be a TOML table`));
		return undefined;
	}

	return table;
}

function validateBooleanField(
	table: TomlTable,
	key: string,
	label: string,
	issues: CommandContractValidationIssue[],
): void {
	if (hasOwn(table, key) && typeof table[key] !== 'boolean') {
		issues.push(commandContractIssue(`${label} must be a boolean`));
	}
}

function validateStringField(
	table: TomlTable,
	key: string,
	label: string,
	issues: CommandContractValidationIssue[],
): void {
	if (hasOwn(table, key) && (typeof table[key] !== 'string' || table[key].trim().length === 0)) {
		issues.push(commandContractIssue(`${label} must be a string`));
	}
}

function validateStringArrayField(
	table: TomlTable,
	key: string,
	label: string,
	issues: CommandContractValidationIssue[],
): void {
	if (!hasOwn(table, key)) {
		return;
	}

	const value = table[key];
	if (!Array.isArray(value) || value.some((entry) => typeof entry !== 'string' || entry.trim().length === 0)) {
		issues.push(commandContractIssue(`${label} must be a string array`));
	}
}

function validatePositiveIntegerField(
	table: TomlTable,
	key: string,
	label: string,
	issues: CommandContractValidationIssue[],
): void {
	if (hasOwn(table, key) && !isPositiveInteger(table[key])) {
		issues.push(commandContractIssue(`${label} must be a positive integer`));
	}
}

function validateIntegerField(
	table: TomlTable,
	key: string,
	label: string,
	issues: CommandContractValidationIssue[],
	id?: CheckIssueId,
): void {
	if (hasOwn(table, key) && !isInteger(table[key])) {
		issues.push(commandContractIssue(`${label} must be an integer`, id));
	}
}

function validateMaxOutputBytesField(
	table: TomlTable,
	key: string,
	label: string,
	issues: CommandContractValidationIssue[],
): void {
	validatePositiveIntegerField(table, key, label, issues);

	if (isPositiveInteger(table[key]) && Number(table[key]) > MAX_COMMAND_OUTPUT_BYTES) {
		issues.push(
			commandContractIssue(
				commandMaxOutputBytesLimitMessage(label),
				'mustflow.command_contract.max_output_bytes_exceeds_limit',
			),
		);
	}
}

function validateAllowedStringField(
	table: TomlTable,
	key: string,
	label: string,
	allowedValues: ReadonlySet<string>,
	issues: CommandContractValidationIssue[],
): void {
	if (!hasOwn(table, key)) {
		return;
	}

	if (typeof table[key] !== 'string' || !allowedValues.has(table[key])) {
		issues.push(commandContractIssue(`${label} must be ${Array.from(allowedValues).map((value) => `"${value}"`).join(' or ')}`));
	}
}

function normalizeContractPath(value: string): string {
	return value.trim().replace(/\\/gu, '/');
}

function contractPathIsUnsafe(value: string): boolean {
	const normalized = normalizeContractPath(value);
	const segments = normalized.split('/').filter((segment) => segment.length > 0);

	return (
		normalized.length === 0 ||
		normalized.includes('\0') ||
		normalized.startsWith('/') ||
		path.win32.isAbsolute(value) ||
		path.posix.isAbsolute(value) ||
		segments.some((segment) => segment === '.' || segment === '..' || WINDOWS_RESERVED_PATH_SEGMENTS.test(segment))
	);
}

function validateSafeRelativePathArrayField(
	table: TomlTable,
	key: string,
	label: string,
	issues: CommandContractValidationIssue[],
): void {
	validateStringArrayField(table, key, label, issues);

	if (!Array.isArray(table[key])) {
		return;
	}

	for (const entry of table[key]) {
		if (typeof entry === 'string' && contractPathIsUnsafe(entry)) {
			issues.push(
				commandContractIssue(
					`${label} entry "${entry}" must be a normalized repository-relative path without traversal or reserved device names`,
					'mustflow.command_contract.inputs_invalid',
				),
			);
		}
	}
}

function validateAllowedExtensionsField(
	table: TomlTable,
	key: string,
	label: string,
	issues: CommandContractValidationIssue[],
): void {
	validateStringArrayField(table, key, label, issues);

	if (!Array.isArray(table[key])) {
		return;
	}

	for (const entry of table[key]) {
		if (typeof entry === 'string' && !SAFE_PATH_EXTENSION_PATTERN.test(entry)) {
			issues.push(
				commandContractIssue(
					`${label} entry "${entry}" must start with "." and contain only letters, numbers, dots, underscores, or hyphens`,
					'mustflow.command_contract.inputs_invalid',
				),
			);
		}
	}
}

function validateCommandInputDefinition(
	intentName: string,
	inputName: string,
	input: TomlTable,
	issues: CommandContractValidationIssue[],
): void {
	const label = `[commands.intents.${intentName}.inputs.${inputName}]`;

	if (!COMMAND_INPUT_NAME_PATTERN.test(inputName)) {
		issues.push(
			commandContractIssue(
				`Command input ${intentName}.${inputName} name must start with a lowercase letter and contain only lowercase letters, numbers, and underscores`,
				'mustflow.command_contract.inputs_invalid',
			),
		);
	}

	validateAllowedStringField(input, 'type', `${label}.type`, COMMAND_INPUT_TYPES, issues);
	validateBooleanField(input, 'required', `${label}.required`, issues);
	validateBooleanField(input, 'secret', `${label}.secret`, issues);
	validateStringField(input, 'description', `${label}.description`, issues);
	validateStringField(input, 'placeholder', `${label}.placeholder`, issues);
	validateStringArrayField(input, 'allowed_values', `${label}.allowed_values`, issues);
	validateSafeRelativePathArrayField(input, 'allowed_roots', `${label}.allowed_roots`, issues);
	validateAllowedExtensionsField(input, 'allowed_extensions', `${label}.allowed_extensions`, issues);
	validateIntegerField(input, 'min', `${label}.min`, issues, 'mustflow.command_contract.inputs_invalid');
	validateIntegerField(input, 'max', `${label}.max`, issues, 'mustflow.command_contract.inputs_invalid');

	if (input.type === 'path' && (!Array.isArray(input.allowed_roots) || input.allowed_roots.length === 0)) {
		issues.push(
			commandContractIssue(
				`${label}.allowed_roots must define at least one repository-relative root for path inputs`,
				'mustflow.command_contract.inputs_invalid',
			),
		);
	}

	if (input.type === 'enum' && (!Array.isArray(input.allowed_values) || input.allowed_values.length === 0)) {
		issues.push(
			commandContractIssue(
				`${label}.allowed_values must define at least one value for enum inputs`,
				'mustflow.command_contract.inputs_invalid',
			),
		);
	}

	if (input.type === 'literal' && !hasOwn(input, 'value')) {
		issues.push(
			commandContractIssue(
				`${label}.value must be defined for literal inputs`,
				'mustflow.command_contract.inputs_invalid',
			),
		);
	}

	if (hasOwn(input, 'value') && !['string', 'number', 'boolean'].includes(typeof input.value)) {
		issues.push(commandContractIssue(`${label}.value must be a string, number, or boolean`, 'mustflow.command_contract.inputs_invalid'));
	}

	if (isInteger(input.min) && isInteger(input.max) && Number(input.min) > Number(input.max)) {
		issues.push(commandContractIssue(`${label}.min must be less than or equal to ${label}.max`, 'mustflow.command_contract.inputs_invalid'));
	}
}

function validateCommandIntentInputs(intentName: string, intent: TomlTable, issues: CommandContractValidationIssue[]): void {
	if (!hasOwn(intent, 'inputs')) {
		return;
	}

	if (!isRecord(intent.inputs)) {
		issues.push(
			commandContractIssue(
				`[commands.intents.${intentName}.inputs] must be a TOML table`,
				'mustflow.command_contract.inputs_invalid',
			),
		);
		return;
	}

	if (intent.status === 'configured') {
		issues.push(
			commandContractIssue(
				`Configured intent ${intentName} must not declare inputs until typed input execution is implemented`,
				'mustflow.command_contract.inputs_invalid',
			),
		);
	}

	if (intent.mode === 'shell' || hasOwn(intent, 'cmd')) {
		issues.push(
			commandContractIssue(
				`[commands.intents.${intentName}.inputs] requires argv command mode; shell-string interpolation is not allowed`,
				'mustflow.command_contract.inputs_invalid',
			),
		);
	}

	if (!Array.isArray(intent.argv)) {
		issues.push(
			commandContractIssue(
				`[commands.intents.${intentName}.inputs] requires argv so typed input placeholders remain argument-bound`,
				'mustflow.command_contract.inputs_invalid',
			),
		);
	}

	const inputNames = new Set<string>();
	for (const [inputName, input] of Object.entries(intent.inputs)) {
		inputNames.add(inputName);

		if (!isRecord(input)) {
			issues.push(
				commandContractIssue(
					`[commands.intents.${intentName}.inputs.${inputName}] must be a TOML table`,
					'mustflow.command_contract.inputs_invalid',
				),
			);
			continue;
		}

		validateCommandInputDefinition(intentName, inputName, input, issues);
	}

	const argv = readStringArray(intent, 'argv');
	if (!argv) {
		return;
	}

	for (const token of argv) {
		const exactMatch = COMMAND_ARGV_PLACEHOLDER_PATTERN.exec(token);
		if (exactMatch) {
			const inputName = exactMatch[1];
			if (!inputNames.has(inputName)) {
				issues.push(
					commandContractIssue(
						`Command argv token "${token}" references undeclared input ${intentName}.${inputName}`,
						'mustflow.command_contract.inputs_invalid',
					),
				);
			}
			continue;
		}

		if (COMMAND_ARGV_MIXED_PLACEHOLDER_PATTERN.test(token)) {
			issues.push(
				commandContractIssue(
					`Command argv token "${token}" must use a whole-token typed input placeholder instead of string interpolation`,
					'mustflow.command_contract.inputs_invalid',
				),
			);
		}
	}
}

function validateSafeRelativePathField(
	table: TomlTable,
	key: string,
	label: string,
	issues: CommandContractValidationIssue[],
): void {
	validateStringField(table, key, label, issues);

	if (typeof table[key] === 'string' && contractPathIsUnsafe(table[key])) {
		issues.push(
			commandContractIssue(
				`${label} must be a normalized repository-relative path without traversal or reserved device names`,
				'mustflow.command_contract.preconditions_invalid',
			),
		);
	}
}

function validateSafeRelativePathPatternArrayField(
	table: TomlTable,
	key: string,
	label: string,
	issues: CommandContractValidationIssue[],
): void {
	validateStringArrayField(table, key, label, issues);

	if (!Array.isArray(table[key])) {
		return;
	}

	for (const entry of table[key]) {
		if (typeof entry === 'string' && contractPathIsUnsafe(entry.replace(/\*/gu, 'wildcard'))) {
			issues.push(
				commandContractIssue(
					`${label} entry "${entry}" must be a normalized repository-relative path pattern without traversal or reserved device names`,
					'mustflow.command_contract.preconditions_invalid',
				),
			);
		}
	}
}

function validateCommandIntentPreconditions(
	intentName: string,
	intent: TomlTable,
	allIntents: TomlTable,
	issues: CommandContractValidationIssue[],
): void {
	if (!hasOwn(intent, 'preconditions')) {
		return;
	}

	if (!Array.isArray(intent.preconditions) || intent.preconditions.some((entry) => !isRecord(entry))) {
		issues.push(
			commandContractIssue(
				`[commands.intents.${intentName}].preconditions must be an array of tables`,
				'mustflow.command_contract.preconditions_invalid',
			),
		);
		return;
	}

	for (const [index, precondition] of intent.preconditions.entries()) {
		const preconditionTable = precondition as TomlTable;
		const label = `[commands.intents.${intentName}.preconditions.${index}]`;

		validateAllowedStringField(preconditionTable, 'kind', `${label}.kind`, COMMAND_PRECONDITION_KINDS, issues);
		validateStringField(preconditionTable, 'label', `${label}.label`, issues);
		validateSafeRelativePathField(preconditionTable, 'path', `${label}.path`, issues);
		validateSafeRelativePathField(preconditionTable, 'artifact', `${label}.artifact`, issues);
		validateSafeRelativePathPatternArrayField(preconditionTable, 'sources', `${label}.sources`, issues);
		validateStringField(preconditionTable, 'satisfy_intent', `${label}.satisfy_intent`, issues);

		if (preconditionTable.kind === 'path_exists' && !hasOwn(preconditionTable, 'path')) {
			issues.push(
				commandContractIssue(`${label}.path is required for kind = "path_exists"`, 'mustflow.command_contract.preconditions_invalid'),
			);
		}

		if (preconditionTable.kind === 'artifact_freshness') {
			if (!hasOwn(preconditionTable, 'artifact')) {
				issues.push(
					commandContractIssue(
						`${label}.artifact is required for kind = "artifact_freshness"`,
						'mustflow.command_contract.preconditions_invalid',
					),
				);
			}

			if (!Array.isArray(preconditionTable.sources) || preconditionTable.sources.length === 0) {
				issues.push(
					commandContractIssue(
						`${label}.sources must define at least one source path pattern for kind = "artifact_freshness"`,
						'mustflow.command_contract.preconditions_invalid',
					),
				);
			}
		}

		if (typeof preconditionTable.satisfy_intent === 'string' && !isRecord(allIntents[preconditionTable.satisfy_intent])) {
			issues.push(
				commandContractIssue(
					`${label}.satisfy_intent references unknown intent "${preconditionTable.satisfy_intent}"`,
					'mustflow.command_contract.preconditions_invalid',
				),
			);
		}
	}
}

function validateCommandDefaults(commandsToml: TomlTable, issues: CommandContractValidationIssue[]): void {
	const defaults = validateTable(commandsToml, 'defaults', issues);
	if (!defaults) {
		return;
	}

	validateStringField(defaults, 'missing_behavior', '[commands.defaults].missing_behavior', issues);
	validateBooleanField(defaults, 'allow_inferred_commands', '[commands.defaults].allow_inferred_commands', issues);
	validateBooleanField(defaults, 'require_lifecycle', '[commands.defaults].require_lifecycle', issues);
	validateBooleanField(
		defaults,
		'require_timeout_for_oneshot',
		'[commands.defaults].require_timeout_for_oneshot',
		issues,
	);
	validateBooleanField(
		defaults,
		'deny_unmanaged_long_running',
		'[commands.defaults].deny_unmanaged_long_running',
		issues,
	);
	validateStringField(defaults, 'default_cwd', '[commands.defaults].default_cwd', issues);
	validateStringField(defaults, 'stdin', '[commands.defaults].stdin', issues);
	validateStringField(defaults, 'on_timeout', '[commands.defaults].on_timeout', issues);
	validateAllowedStringField(defaults, 'env_policy', '[commands.defaults].env_policy', COMMAND_ENV_POLICIES, issues);
	validateStringArrayField(defaults, 'env_allowlist', '[commands.defaults].env_allowlist', issues);
	validateStringArrayField(
		defaults,
		PROJECT_LOCAL_BIN_BARE_EXECUTABLE_ALLOWLIST_KEY,
		`[commands.defaults].${PROJECT_LOCAL_BIN_BARE_EXECUTABLE_ALLOWLIST_KEY}`,
		issues,
	);
	validatePositiveIntegerField(defaults, 'default_timeout_seconds', '[commands.defaults].default_timeout_seconds', issues);
	validateMaxOutputBytesField(defaults, 'max_output_bytes', '[commands.defaults].max_output_bytes', issues);
	validatePositiveIntegerField(defaults, 'kill_after_seconds', '[commands.defaults].kill_after_seconds', issues);
}

function validateCommandResources(commandsToml: TomlTable, issues: CommandContractValidationIssue[]): void {
	if (!hasOwn(commandsToml, 'resources')) {
		return;
	}

	if (!isRecord(commandsToml.resources)) {
		issues.push(commandContractIssue('[commands.resources] must be a TOML table'));
		return;
	}

	for (const [resourceName, resource] of Object.entries(commandsToml.resources)) {
		if (!isRecord(resource)) {
			issues.push(commandContractIssue(`[commands.resources.${resourceName}] must be a TOML table`));
			continue;
		}

		validateStringField(resource, 'type', `[commands.resources.${resourceName}].type`, issues);
		if (hasOwn(resource, 'paths')) {
			const paths = resource.paths;
			if (!Array.isArray(paths) || paths.some((entry) => typeof entry !== 'string' || entry.trim().length === 0)) {
				issues.push(commandContractIssue(`[commands.resources.${resourceName}].paths must be a string array`));
			}
		}

		validateAllowedStringField(
			resource,
			'concurrency',
			`[commands.resources.${resourceName}].concurrency`,
			new Set(['shared_reader', 'exclusive_writer', 'exclusive']),
			issues,
		);
		validateStringField(resource, 'description', `[commands.resources.${resourceName}].description`, issues);
	}
}

function validateCommandIntentEffects(intentName: string, intent: TomlTable, issues: CommandContractValidationIssue[]): void {
	if (!hasOwn(intent, 'effects')) {
		return;
	}

	if (!Array.isArray(intent.effects) || intent.effects.some((entry) => !isRecord(entry))) {
		issues.push(
			commandContractIssue(
				`[commands.intents.${intentName}].effects must be an array of tables`,
				'mustflow.command_contract.effects_invalid',
			),
		);
		return;
	}

	for (const effect of intent.effects) {
		const effectTable = effect as TomlTable;
		validateAllowedStringField(
			effectTable,
			'type',
			`[commands.intents.${intentName}].effects.type`,
			COMMAND_EFFECT_TYPES,
			issues,
		);
		validateAllowedStringField(
			effectTable,
			'mode',
			`[commands.intents.${intentName}].effects.mode`,
			COMMAND_EFFECT_MODES,
			issues,
		);
		validateAllowedStringField(
			effectTable,
			'concurrency',
			`[commands.intents.${intentName}].effects.concurrency`,
			COMMAND_EFFECT_CONCURRENCY,
			issues,
		);
		validateStringField(effectTable, 'path', `[commands.intents.${intentName}].effects.path`, issues);
		validateStringField(effectTable, 'lock', `[commands.intents.${intentName}].effects.lock`, issues);

		if (hasOwn(effectTable, 'paths')) {
			const paths = effectTable.paths;
			if (!Array.isArray(paths) || paths.some((entry) => typeof entry !== 'string' || entry.trim().length === 0)) {
				issues.push(commandContractIssue(`[commands.intents.${intentName}].effects.paths must be a string array`));
			}
		}
	}
}

function validateCommandIntentSelection(intentName: string, intent: TomlTable, issues: CommandContractValidationIssue[]): void {
	if (!hasOwn(intent, 'selection')) {
		return;
	}

	if (!isRecord(intent.selection)) {
		issues.push(commandContractIssue(`[commands.intents.${intentName}.selection] must be a TOML table`));
		return;
	}

	const selection = intent.selection;
	validateStringField(selection, 'coverage_level', `[commands.intents.${intentName}.selection].coverage_level`, issues);
	validateStringField(
		selection,
		'coverage_confidence',
		`[commands.intents.${intentName}.selection].coverage_confidence`,
		issues,
	);
	validateStringField(
		selection,
		'accepts_changed_files',
		`[commands.intents.${intentName}.selection].accepts_changed_files`,
		issues,
	);
	validateStringArrayField(
		selection,
		'fallback_intents',
		`[commands.intents.${intentName}.selection].fallback_intents`,
		issues,
	);
	validateStringArrayField(selection, 'escalate_to', `[commands.intents.${intentName}.selection].escalate_to`, issues);
	validateBooleanField(
		selection,
		'accepts_test_targets',
		`[commands.intents.${intentName}.selection].accepts_test_targets`,
		issues,
	);

	if (selection.accepts_test_targets === true && intent.status === 'configured' && !Array.isArray(intent.argv)) {
		issues.push(
			commandContractIssue(
				`[commands.intents.${intentName}.selection].accepts_test_targets requires argv command mode`,
			),
		);
	}
}

function validateCommandIntent(
	intentName: string,
	intent: TomlTable,
	allIntents: TomlTable,
	issues: CommandContractValidationIssue[],
): void {
	if (!commandIntentNameIsSafe(intentName)) {
		issues.push(commandContractIssue(`Intent ${intentName} name must contain only letters, numbers, underscores, and hyphens`));
	}

	validateStringField(intent, 'status', `[commands.intents.${intentName}].status`, issues);
	validateAllowedStringField(
		intent,
		'lifecycle',
		`[commands.intents.${intentName}].lifecycle`,
		COMMAND_LIFECYCLES,
		issues,
	);
	validateAllowedStringField(
		intent,
		'run_policy',
		`[commands.intents.${intentName}].run_policy`,
		COMMAND_RUN_POLICIES,
		issues,
	);
	validateAllowedStringField(
		intent,
		'env_policy',
		`[commands.intents.${intentName}].env_policy`,
		COMMAND_ENV_POLICIES,
		issues,
	);
	validateBooleanField(intent, 'allow_shell', `[commands.intents.${intentName}].allow_shell`, issues);
	validateStringArrayField(intent, 'env_allowlist', `[commands.intents.${intentName}].env_allowlist`, issues);
	validateBooleanField(
		intent,
		ALLOW_ENV_INHERITANCE_RISKS_KEY,
		`[commands.intents.${intentName}].${ALLOW_ENV_INHERITANCE_RISKS_KEY}`,
		issues,
	);
	validateBooleanField(
		intent,
		ALLOW_LONG_RUNNING_COMMAND_PATTERNS_KEY,
		`[commands.intents.${intentName}].${ALLOW_LONG_RUNNING_COMMAND_PATTERNS_KEY}`,
		issues,
	);
	validateMaxOutputBytesField(intent, 'max_output_bytes', `[commands.intents.${intentName}].max_output_bytes`, issues);
	validatePositiveIntegerField(intent, 'kill_after_seconds', `[commands.intents.${intentName}].kill_after_seconds`, issues);
	validateCommandIntentSelection(intentName, intent, issues);
	validateCommandIntentInputs(intentName, intent, issues);
	validateCommandIntentPreconditions(intentName, intent, allIntents, issues);

	if (intent.status !== 'configured') {
		return;
	}

	const lifecycle = typeof intent.lifecycle === 'string' ? intent.lifecycle : undefined;
	const runPolicy = typeof intent.run_policy === 'string' ? intent.run_policy : undefined;

	if (!lifecycle) {
		issues.push(
			commandContractIssue(
				`Configured intent ${intentName} must define lifecycle`,
				'mustflow.command_contract.configured_missing_lifecycle',
			),
		);
	}

	if (!runPolicy) {
		issues.push(
			commandContractIssue(
				`Configured intent ${intentName} must define run_policy`,
				'mustflow.command_contract.configured_missing_run_policy',
			),
		);
	}

	if (lifecycle === 'oneshot') {
		validatePositiveIntegerField(intent, 'timeout_seconds', `[commands.intents.${intentName}].timeout_seconds`, issues);

		if (!hasOwn(intent, 'timeout_seconds')) {
			issues.push(
				commandContractIssue(
					`Oneshot intent ${intentName} must define timeout_seconds`,
					'mustflow.command_contract.oneshot_missing_timeout',
				),
			);
		}

		if (intent.stdin !== 'closed') {
			issues.push(
				commandContractIssue(
					`Oneshot intent ${intentName} must set stdin = "closed"`,
					'mustflow.command_contract.oneshot_stdin_not_closed',
				),
			);
		}
	}

	if (lifecycle && LONG_RUNNING_LIFECYCLES.has(lifecycle) && runPolicy === 'agent_allowed') {
		issues.push(
			commandContractIssue(
				`Long-running intent ${intentName} must not use run_policy = "agent_allowed"`,
				'mustflow.command_contract.long_running_agent_allowed',
			),
		);
	}

	if (intent.mode === 'shell' && runPolicy === 'agent_allowed' && intent.allow_shell !== true) {
		issues.push(
			commandContractIssue(
				`Agent-runnable shell intent ${intentName} must set allow_shell = true`,
				'mustflow.command_contract.agent_shell_requires_allow',
			),
		);
	}

	if (!commandIntentHasCommandSource(intent)) {
		issues.push(
			commandContractIssue(
				`Configured intent ${intentName} must define argv or mode = "shell" with cmd`,
				'mustflow.command_contract.executable_source_missing',
			),
		);
	}

	const blockedCommandPattern = commandIntentBlockedCommandPattern(intent);
	if (blockedCommandPattern?.code === 'shell_background_pattern') {
		issues.push(
			commandContractIssue(
				`Shell intent ${intentName} contains a blocked long-running or background pattern`,
				'mustflow.command_contract.shell_background_pattern',
			),
		);
	}

	if (blockedCommandPattern?.code === 'long_running_command_pattern' && intent[ALLOW_LONG_RUNNING_COMMAND_PATTERNS_KEY] !== true) {
		issues.push(
			commandContractIssue(
				`Intent ${intentName} contains a blocked long-running or background command pattern`,
				'mustflow.command_contract.long_running_command_pattern',
			),
		);
	}

	if (hasOwn(intent, 'success_exit_codes')) {
		if (!successExitCodesAreValid(intent.success_exit_codes)) {
			issues.push(
				commandContractIssue(
					`[commands.intents.${intentName}].success_exit_codes must be ${SUCCESS_EXIT_CODES_CONTRACT_DESCRIPTION}`,
					'mustflow.command_contract.success_exit_codes_invalid',
				),
			);
		}
	}

	validateCommandIntentEffects(intentName, intent, issues);
}

function readValidCommandEnvPolicy(table: TomlTable | undefined): CommandEnvPolicy | undefined {
	if (!table || !hasOwn(table, 'env_policy')) {
		return undefined;
	}

	const value = table.env_policy;
	return typeof value === 'string' && COMMAND_ENV_POLICIES.has(value as CommandEnvPolicy)
		? (value as CommandEnvPolicy)
		: undefined;
}

function getEffectiveCommandEnvPolicy(
	defaults: TomlTable | undefined,
	intent: TomlTable,
): { policy: CommandEnvPolicy; source: 'intent' | 'defaults' | 'implicit' } {
	const intentPolicy = readValidCommandEnvPolicy(intent);
	if (intentPolicy) {
		return { policy: intentPolicy, source: 'intent' };
	}

	const defaultPolicy = readValidCommandEnvPolicy(defaults);
	if (defaultPolicy) {
		return { policy: defaultPolicy, source: 'defaults' };
	}

	return { policy: DEFAULT_COMMAND_ENV_POLICY, source: 'implicit' };
}

export interface CommandEnvInheritanceWarning {
	readonly intentName: string;
	readonly source: 'intent' | 'defaults' | 'implicit';
	readonly severity: 'warning' | 'error';
	readonly network: boolean;
	readonly reasons: readonly string[];
}

interface CommandEnvInheritanceSource {
	readonly defaults?: unknown;
	readonly intents?: unknown;
}

export function findCommandEnvInheritanceWarnings(commandsToml: CommandEnvInheritanceSource | undefined): readonly CommandEnvInheritanceWarning[] {
	const warnings: CommandEnvInheritanceWarning[] = [];

	if (!commandsToml || !isRecord(commandsToml.intents)) {
		return warnings;
	}

	const defaults = isRecord(commandsToml.defaults) ? commandsToml.defaults : undefined;

	for (const [intentName, intent] of Object.entries(commandsToml.intents)) {
		if (!isRecord(intent) || intent.status !== 'configured' || intent.run_policy !== 'agent_allowed') {
			continue;
		}

		const envPolicy = getEffectiveCommandEnvPolicy(defaults, intent);
		if (envPolicy.policy !== 'inherit') {
			continue;
		}

		if (intent[ALLOW_ENV_INHERITANCE_RISKS_KEY] === true) {
			continue;
		}

		const reasons = readCommandEnvInheritanceRiskReasons(intent);
		warnings.push({
			intentName,
			source: envPolicy.source,
			severity: reasons.length > 0 ? 'error' : 'warning',
			network: intent.network === true,
			reasons,
		});
	}

	return warnings;
}

function readCommandEnvInheritanceRiskReasons(intent: TomlTable): readonly string[] {
	const reasons: string[] = [];

	if (intent.network === true) {
		reasons.push('network = true');
	}

	if (intent.destructive === true) {
		reasons.push('destructive = true');
	}

	if (intent.mode === 'shell') {
		reasons.push('mode = "shell"');
	}

	if (Array.isArray(intent.writes) && intent.writes.length > 0) {
		reasons.push('declared writes');
	}

	return reasons;
}

function formatCommandEnvInheritanceWarning(warning: CommandEnvInheritanceWarning): string {
	const reasonScope = warning.reasons.length > 0 ? ` (${warning.reasons.join(', ')})` : '';
	const migration = 'set env_policy = "minimal" or "allowlist" unless broad host state is required';

	if (warning.source === 'implicit') {
		return `configured agent-runnable intent ${warning.intentName} implicitly inherits the host environment${reasonScope}; ${migration}`;
	}

	return `configured agent-runnable intent ${warning.intentName} uses env_policy = "inherit"${reasonScope}; ${migration}`;
}

function validateCommandEnvInheritanceWarnings(commandsToml: TomlTable | undefined): CommandContractValidationIssue[] {
	const issues: CommandContractValidationIssue[] = [];

	for (const warning of findCommandEnvInheritanceWarnings(commandsToml)) {
		const message = formatCommandEnvInheritanceWarning(warning);
		issues.push(
			warning.severity === 'warning'
				? commandContractWarning(message, 'mustflow.command_contract.broad_env_inheritance')
				: commandContractIssue(message, 'mustflow.command_contract.broad_env_inheritance'),
		);
	}

	return issues;
}

function projectLocalBinExecutableExists(projectRoot: string, executable: string): boolean {
	return resolveAllowedProjectLocalBinExecutable(projectRoot, executable, new Set([normalizeCommandExecutableName(executable)])) !== null;
}

function validateProjectLocalBinWarnings(projectRoot: string, commandsToml: TomlTable | undefined): CommandContractValidationIssue[] {
	const issues: CommandContractValidationIssue[] = [];

	if (!isRecord(commandsToml?.intents)) {
		return issues;
	}

	const allowedBareExecutables = readProjectLocalBinBareExecutableAllowlist(commandsToml);

	for (const [intentName, intent] of Object.entries(commandsToml.intents)) {
		if (!isRecord(intent)) {
			continue;
		}

		if (intent.status !== 'configured' || intent.lifecycle !== 'oneshot' || intent.run_policy !== 'agent_allowed') {
			continue;
		}

		const argv = readStringArray(intent, 'argv');
		const executable = argv?.[0];
		if (!executable || executable.includes('/') || executable.includes('\\')) {
			continue;
		}

		if (allowedBareExecutables.has(normalizeCommandExecutableName(executable))) {
			continue;
		}

		if (!projectLocalBinExecutableExists(projectRoot, executable)) {
			continue;
		}

		issues.push(
			commandContractWarning(
				`configured agent-runnable intent ${intentName} uses bare executable "${executable}" that matches project-local node_modules/.bin; use a package-manager mediated command such as npm exec, pnpm exec, bun x, or yarn exec`,
				'mustflow.command_contract.project_local_bin_bare_executable',
			),
		);
	}

	return issues;
}

/**
 * mf:anchor core.command-contract-validation
 * purpose: Validate command intent declarations that gate agent-executable repository commands.
 * search: commands.toml, intent status, lifecycle, run policy, timeout
 * invariant: Agent-executable commands need configured status, oneshot lifecycle, timeout, and explicit command source.
 * risk: config, security
 */
export function validateCommandContractConfig(commandsToml: TomlTable | undefined): CommandContractValidationIssue[] {
	const issues: CommandContractValidationIssue[] = [];

	if (!commandsToml) {
		return issues;
	}

	validateStringField(commandsToml, 'schema_version', '[commands].schema_version', issues);
	validateCommandDefaults(commandsToml, issues);
	validateCommandResources(commandsToml, issues);

	if (!isRecord(commandsToml.intents)) {
		issues.push(
			commandContractIssue(
				'Missing [intents] table in .mustflow/config/commands.toml',
				'mustflow.command_contract.intent_table_missing',
			),
		);
		return issues;
	}

	for (const [intentName, intent] of Object.entries(commandsToml.intents)) {
		if (!isRecord(intent)) {
			issues.push(
				commandContractIssue(
					`Intent ${intentName} must be a TOML table`,
					'mustflow.command_contract.intent_not_table',
				),
			);
			continue;
		}

		validateCommandIntent(intentName, intent, commandsToml.intents, issues);
	}

	return issues;
}

export function validateCommandContractStrictDefaults(
	projectRoot: string,
	commandsToml: TomlTable | undefined,
): CommandContractValidationIssue[] {
	const issues: CommandContractValidationIssue[] = [];

	if (!commandsToml) {
		return issues;
	}

	if (isRecord(commandsToml.defaults)) {
		if (!hasOwn(commandsToml.defaults, 'max_output_bytes')) {
			issues.push(commandContractIssue('[commands.defaults].max_output_bytes is required'));
		}

		if (!hasOwn(commandsToml.defaults, 'on_timeout')) {
			issues.push(commandContractIssue('[commands.defaults].on_timeout is required'));
		}
	}

	issues.push(...validateCommandEnvInheritanceWarnings(commandsToml));
	issues.push(...validateProjectLocalBinWarnings(projectRoot, commandsToml));
	issues.push(...validateCommandEffects(projectRoot, commandsToml));
	issues.push(...validateCommandEffectLockWarnings(projectRoot, commandsToml));

	return issues;
}
