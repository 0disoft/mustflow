import {
	COMMAND_LIFECYCLES,
	COMMAND_RUN_POLICIES,
	LONG_RUNNING_LIFECYCLES,
	isRecord,
	readPositiveInteger,
	readString,
	type CommandContract,
	type TomlTable,
} from './config-loading.js';
import { evaluateCommandIntentEligibility } from './command-intent-eligibility.js';
import {
	commandIntentHasBlockedShellBackgroundPattern,
	commandIntentHasCommandSource,
	commandIntentNameIsSafe,
} from './command-contract-rules.js';

export type ContractLintStatus = 'passed' | 'warning' | 'failed';
export type ContractLintSeverity = 'error' | 'warning';

export interface ContractLintIssue {
	readonly severity: ContractLintSeverity;
	readonly code: string;
	readonly intent: string | null;
	readonly message: string;
}

export interface ContractLintSummary {
	readonly totalIntents: number;
	readonly configured: number;
	readonly runnable: number;
	readonly manualOnly: number;
	readonly unknown: number;
	readonly errors: number;
	readonly warnings: number;
}

export interface ContractLintReport {
	readonly status: ContractLintStatus;
	readonly summary: ContractLintSummary;
	readonly issues: readonly ContractLintIssue[];
	readonly sourceFiles: readonly string[];
}

const CONTRACT_LINT_SOURCE_FILES = ['.mustflow/config/commands.toml', '.mustflow/docs/agent-workflow.md', 'AGENTS.md'];

function readBoolean(intent: TomlTable, key: string): boolean | null {
	const value = intent[key];
	return typeof value === 'boolean' ? value : null;
}

function successExitCodesAreValid(intent: TomlTable): boolean {
	const value = intent.success_exit_codes;
	return value === undefined || (Array.isArray(value) && value.every((entry) => Number.isInteger(entry)));
}

function writesAreValid(intent: TomlTable): boolean {
	const value = intent.writes;
	return value === undefined || (Array.isArray(value) && value.every((entry) => typeof entry === 'string'));
}

function pushIssue(
	issues: ContractLintIssue[],
	severity: ContractLintSeverity,
	code: string,
	intent: string | null,
	message: string,
): void {
	issues.push({ severity, code, intent, message });
}

function configuredIntentIsRunnable(intent: TomlTable): boolean {
	return evaluateCommandIntentEligibility('summary', intent).ok;
}

function lintIntent(name: string, value: unknown, issues: ContractLintIssue[]): TomlTable | null {
	if (!commandIntentNameIsSafe(name)) {
		pushIssue(
			issues,
			'error',
			'unsafe_intent_name',
			name,
			`Intent ${name} name must contain only letters, numbers, underscores, and hyphens.`,
		);
	}

	if (!isRecord(value)) {
		pushIssue(issues, 'error', 'intent_not_table', name, `Intent ${name} must be a TOML table.`);
		return null;
	}

	const status = readString(value, 'status');
	if (!status || !['configured', 'manual_only', 'unknown'].includes(status)) {
		pushIssue(issues, 'error', 'invalid_status', name, `Intent ${name} must set status to configured, manual_only, or unknown.`);
		return value;
	}

	if (status === 'unknown') {
		pushIssue(issues, 'warning', 'intent_unknown', name, `Intent ${name} is declared but has no configured command yet.`);
	}

	if (status === 'manual_only') {
		pushIssue(issues, 'warning', 'intent_manual_only', name, `Intent ${name} requires explicit manual handling.`);
	}

	if (status !== 'configured') {
		return value;
	}

	const lifecycle = readString(value, 'lifecycle');
	const runPolicy = readString(value, 'run_policy');

	if (!lifecycle || !COMMAND_LIFECYCLES.has(lifecycle)) {
		pushIssue(issues, 'error', 'invalid_lifecycle', name, `Configured intent ${name} must define a valid lifecycle.`);
	}

	if (!runPolicy || !COMMAND_RUN_POLICIES.has(runPolicy)) {
		pushIssue(issues, 'error', 'invalid_run_policy', name, `Configured intent ${name} must define a valid run_policy.`);
	}

	if (lifecycle === 'oneshot' && readPositiveInteger(value, 'timeout_seconds') === undefined) {
		pushIssue(issues, 'error', 'oneshot_missing_timeout', name, `Oneshot intent ${name} must define timeout_seconds.`);
	}

	if (lifecycle === 'oneshot' && readString(value, 'stdin') !== 'closed') {
		pushIssue(issues, 'error', 'oneshot_stdin_not_closed', name, `Oneshot intent ${name} must set stdin to closed.`);
	}

	if (lifecycle && LONG_RUNNING_LIFECYCLES.has(lifecycle) && runPolicy === 'agent_allowed') {
		pushIssue(issues, 'error', 'long_running_agent_allowed', name, `Long-running intent ${name} must not be agent_allowed.`);
	}

	if (!commandIntentHasCommandSource(value)) {
		pushIssue(issues, 'error', 'executable_source_missing', name, `Configured intent ${name} must define argv or shell cmd.`);
	}

	if (commandIntentHasBlockedShellBackgroundPattern(value)) {
		pushIssue(
			issues,
			'error',
			'shell_background_pattern',
			name,
			`Shell intent ${name} contains a blocked long-running or background pattern.`,
		);
	}

	if (!successExitCodesAreValid(value)) {
		pushIssue(issues, 'error', 'invalid_success_exit_codes', name, `Intent ${name} success_exit_codes must be an integer array.`);
	}

	if (!writesAreValid(value)) {
		pushIssue(issues, 'error', 'invalid_writes', name, `Intent ${name} writes must be a string array.`);
	}

	if (readBoolean(value, 'network') === null && Object.hasOwn(value, 'network')) {
		pushIssue(issues, 'error', 'invalid_network', name, `Intent ${name} network must be a boolean.`);
	}

	if (readBoolean(value, 'destructive') === null && Object.hasOwn(value, 'destructive')) {
		pushIssue(issues, 'error', 'invalid_destructive', name, `Intent ${name} destructive must be a boolean.`);
	}

	return value;
}

function getStatus(errors: number, warnings: number): ContractLintStatus {
	if (errors > 0) {
		return 'failed';
	}

	return warnings > 0 ? 'warning' : 'passed';
}

export function lintCommandContract(contract: CommandContract): ContractLintReport {
	const issues: ContractLintIssue[] = [];
	const intentEntries = Object.entries(contract.intents);
	const intentTables = intentEntries
		.map(([name, value]) => lintIntent(name, value, issues))
		.filter((intent): intent is TomlTable => intent !== null);
	const errors = issues.filter((issue) => issue.severity === 'error').length;
	const warnings = issues.length - errors;

	return {
		status: getStatus(errors, warnings),
		summary: {
			totalIntents: intentEntries.length,
			configured: intentTables.filter((intent) => readString(intent, 'status') === 'configured').length,
			runnable: intentTables.filter(configuredIntentIsRunnable).length,
			manualOnly: intentTables.filter((intent) => readString(intent, 'status') === 'manual_only').length,
			unknown: intentTables.filter((intent) => readString(intent, 'status') === 'unknown').length,
			errors,
			warnings,
		},
		issues,
		sourceFiles: CONTRACT_LINT_SOURCE_FILES,
	};
}
