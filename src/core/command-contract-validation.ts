import {
	COMMAND_LIFECYCLES,
	COMMAND_RUN_POLICIES,
	LONG_RUNNING_LIFECYCLES,
	isRecord,
	type TomlTable,
} from './config-loading.js';
import {
	COMMAND_EFFECT_CONCURRENCY,
	COMMAND_EFFECT_MODES,
	COMMAND_EFFECT_TYPES,
	validateCommandEffectLockWarnings,
	validateCommandEffects,
} from './command-effects.js';
import {
	commandIntentHasBlockedShellBackgroundPattern,
	commandIntentHasCommandSource,
	commandIntentNameIsSafe,
} from './command-contract-rules.js';

export interface CommandContractValidationIssue {
	readonly message: string;
	readonly severity?: 'warning' | 'error';
}

function commandContractIssue(message: string): CommandContractValidationIssue {
	return { message };
}

function hasOwn(table: TomlTable, key: string): boolean {
	return Object.prototype.hasOwnProperty.call(table, key);
}

function isPositiveInteger(value: unknown): boolean {
	return Number.isInteger(value) && Number(value) > 0;
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
	validatePositiveIntegerField(defaults, 'default_timeout_seconds', '[commands.defaults].default_timeout_seconds', issues);
	validatePositiveIntegerField(defaults, 'max_output_bytes', '[commands.defaults].max_output_bytes', issues);
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
		issues.push(commandContractIssue(`[commands.intents.${intentName}].effects must be an array of tables`));
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

function validateCommandIntent(intentName: string, intent: TomlTable, issues: CommandContractValidationIssue[]): void {
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

	if (intent.status !== 'configured') {
		return;
	}

	const lifecycle = typeof intent.lifecycle === 'string' ? intent.lifecycle : undefined;
	const runPolicy = typeof intent.run_policy === 'string' ? intent.run_policy : undefined;

	if (!lifecycle) {
		issues.push(commandContractIssue(`Configured intent ${intentName} must define lifecycle`));
	}

	if (!runPolicy) {
		issues.push(commandContractIssue(`Configured intent ${intentName} must define run_policy`));
	}

	if (lifecycle === 'oneshot') {
		validatePositiveIntegerField(intent, 'timeout_seconds', `[commands.intents.${intentName}].timeout_seconds`, issues);

		if (!hasOwn(intent, 'timeout_seconds')) {
			issues.push(commandContractIssue(`Oneshot intent ${intentName} must define timeout_seconds`));
		}

		if (intent.stdin !== 'closed') {
			issues.push(commandContractIssue(`Oneshot intent ${intentName} must set stdin = "closed"`));
		}
	}

	if (lifecycle && LONG_RUNNING_LIFECYCLES.has(lifecycle) && runPolicy === 'agent_allowed') {
		issues.push(commandContractIssue(`Long-running intent ${intentName} must not use run_policy = "agent_allowed"`));
	}

	if (!commandIntentHasCommandSource(intent)) {
		issues.push(commandContractIssue(`Configured intent ${intentName} must define argv or mode = "shell" with cmd`));
	}

	if (commandIntentHasBlockedShellBackgroundPattern(intent)) {
		issues.push(commandContractIssue(`Shell intent ${intentName} contains a blocked long-running or background pattern`));
	}

	if (hasOwn(intent, 'success_exit_codes')) {
		const value = intent.success_exit_codes;
		if (!Array.isArray(value) || value.length === 0 || value.some((entry) => !Number.isInteger(entry))) {
			issues.push(commandContractIssue(`[commands.intents.${intentName}].success_exit_codes must be an integer array`));
		}
	}

	validateCommandIntentEffects(intentName, intent, issues);
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
		issues.push(commandContractIssue('Missing [intents] table in .mustflow/config/commands.toml'));
		return issues;
	}

	for (const [intentName, intent] of Object.entries(commandsToml.intents)) {
		if (!isRecord(intent)) {
			issues.push(commandContractIssue(`Intent ${intentName} must be a TOML table`));
			continue;
		}

		validateCommandIntent(intentName, intent, issues);
	}

	return issues;
}

export function validateCommandContractStrictDefaults(
	projectRoot: string,
	commandsToml: TomlTable | undefined,
): CommandContractValidationIssue[] {
	const issues: CommandContractValidationIssue[] = [];

	if (!commandsToml || !isRecord(commandsToml.defaults)) {
		return issues;
	}

	if (!hasOwn(commandsToml.defaults, 'max_output_bytes')) {
		issues.push(commandContractIssue('[commands.defaults].max_output_bytes is required'));
	}

	if (!hasOwn(commandsToml.defaults, 'on_timeout')) {
		issues.push(commandContractIssue('[commands.defaults].on_timeout is required'));
	}

	issues.push(...validateCommandEffects(projectRoot, commandsToml));
	issues.push(...validateCommandEffectLockWarnings(commandsToml));

	return issues;
}
