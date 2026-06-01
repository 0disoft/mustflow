import path from 'node:path';

import { isMustflowBinName } from '../../core/command-classification.js';
import { resolveSafeProjectCwd } from '../../core/command-cwd.js';
import { resolveCommandEnv, type CommandEnvPolicy } from '../../core/command-env.js';
import {
	getCommandMaxOutputBytesLimitDetail,
	readEffectiveCommandCwd,
	readEffectiveCommandMaxOutputBytes,
} from '../../core/command-run-constraints.js';
import {
	evaluateCommandIntentEligibility,
	type CommandIntentEligibilityCode,
	type CommandIntentEligibilityResult,
} from '../../core/command-intent-eligibility.js';
import {
	inspectActiveRunLocks,
	type ActiveRunLockConflict,
	type ActiveRunLockStaleRecord,
} from '../../core/active-run-locks.js';
import {
	isRecord,
	readPositiveInteger,
	readString,
	readStringArray,
	type CommandContract,
	type TomlTable,
} from '../../core/config-loading.js';
import {
	DEFAULT_COMMAND_MAX_OUTPUT_BYTES,
	COMMAND_OUTPUT_LIMIT_SCOPE,
} from '../../core/command-output-limits.js';
import type { RunCommandMode } from '../../core/run-receipt.js';
import { normalizeSuccessExitCodes } from '../../core/success-exit-codes.js';
import { normalizeSafeTestTargetPath, TEST_TARGET_PATH_ERROR } from '../../core/test-target-paths.js';
import {
	evaluateCommandPreconditions,
	type CommandPreconditionPlan,
} from '../../core/command-preconditions.js';
import { t, type CliLang } from './i18n.js';

export interface ResolvedArgvCommand {
	readonly executable: string;
	readonly args: string[];
	readonly shell: boolean;
}

export interface RunPlanOptions {
	readonly testTargets?: readonly string[];
}

export type RunPreviewMode = 'dry-run' | 'plan-only';
export type RunPlanReasonCode =
	| Exclude<CommandIntentEligibilityCode, 'ok'>
	| 'cwd_outside_project'
	| 'invalid_test_target'
	| 'max_output_bytes_exceeds_limit';

interface RunIntentMetadata {
	readonly intentStatus: string;
	readonly lifecycle: string | null;
	readonly runPolicy: string | null;
	readonly kind: string | null;
	readonly configuredCwd: string;
	readonly timeoutSeconds: number | null;
	readonly killAfterSeconds: number;
	readonly maxOutputBytes: number;
	readonly successExitCodes: readonly number[];
	readonly commandArgv: readonly string[] | undefined;
	readonly shellCommand: string | undefined;
	readonly mode: RunCommandMode | null;
	readonly writes: readonly string[] | undefined;
	readonly effects: readonly unknown[] | undefined;
	readonly network: boolean | undefined;
	readonly destructive: boolean | undefined;
	readonly envPolicy: CommandEnvPolicy;
	readonly envAllowlist: readonly string[];
	readonly testTargets: readonly string[];
	readonly manualStartHint: string | null;
	readonly healthCheckUrl: string | null;
	readonly stopInstruction: string | null;
	readonly relatedOneshotChecks: readonly string[];
}

interface RunPlanBase {
	readonly intentName: string;
	readonly intent: TomlTable | undefined;
	readonly ok: boolean;
	readonly eligibility: CommandIntentEligibilityResult;
	readonly reasonCode: RunPlanReasonCode | null;
	readonly detail: string | null;
	readonly intentStatus: string | null;
	readonly lifecycle: string | null;
	readonly runPolicy: string | null;
	readonly kind: string | null;
	readonly configuredCwd: string | null;
	readonly cwd: string | null;
	readonly relativeCwd: string | null;
	readonly timeoutSeconds: number | null;
	readonly killAfterSeconds: number | null;
	readonly maxOutputBytes: number | null;
	readonly successExitCodes: readonly number[] | null;
	readonly commandArgv: readonly string[] | undefined;
	readonly shellCommand: string | undefined;
	readonly mode: RunCommandMode | null;
	readonly argvCommand: ResolvedArgvCommand | undefined;
	readonly writes: readonly string[] | undefined;
	readonly effects: readonly unknown[] | undefined;
	readonly network: boolean | undefined;
	readonly destructive: boolean | undefined;
	readonly envPolicy: CommandEnvPolicy | null;
	readonly envAllowlist: readonly string[];
	readonly testTargets: readonly string[];
	readonly suggestedIntentSnippet: string | null;
	readonly manualStartHint: string | null;
	readonly healthCheckUrl: string | null;
	readonly stopInstruction: string | null;
	readonly relatedOneshotChecks: readonly string[];
	readonly preconditions: readonly CommandPreconditionPlan[];
	readonly activeLockConflicts: readonly ActiveRunLockConflict[];
	readonly staleActiveLocks: readonly ActiveRunLockStaleRecord[];
}

export interface BlockedRunPlan extends RunPlanBase {
	readonly ok: false;
	readonly reasonCode: RunPlanReasonCode;
}

export interface RunnableRunPlan extends RunPlanBase {
	readonly intent: TomlTable;
	readonly ok: true;
	readonly reasonCode: null;
	readonly detail: null;
	readonly cwd: string;
	readonly relativeCwd: string;
	readonly timeoutSeconds: number;
	readonly killAfterSeconds: number;
	readonly maxOutputBytes: number;
	readonly successExitCodes: readonly number[];
	readonly mode: RunCommandMode;
	readonly envPolicy: CommandEnvPolicy;
	readonly envAllowlist: readonly string[];
}

export type RunPlan = BlockedRunPlan | RunnableRunPlan;

function getSuccessExitCodes(intent: TomlTable): number[] {
	return normalizeSuccessExitCodes(intent.success_exit_codes);
}

function readBoolean(intent: TomlTable, key: string): boolean | undefined {
	const value = intent[key];

	return typeof value === 'boolean' ? value : undefined;
}

function readArray(intent: TomlTable, key: string): readonly unknown[] | undefined {
	const value = intent[key];

	return Array.isArray(value) ? value : undefined;
}

function toPosixPath(value: string): string {
	return value.split(path.sep).join('/');
}

function getRelativeProjectPath(projectRoot: string, targetPath: string): string {
	const relativePath = path.relative(projectRoot, targetPath);

	return relativePath.length > 0 ? toPosixPath(relativePath) : '.';
}

function normalizeTestTargets(values: readonly string[] | undefined):
	| { readonly ok: true; readonly values: readonly string[] }
	| { readonly ok: false; readonly detail: string } {
	const normalizedValues: string[] = [];

	for (const value of values ?? []) {
		const normalized = normalizeSafeTestTargetPath(value);
		if (normalized === null) {
			return { ok: false, detail: `Test target ${JSON.stringify(value)} is invalid: ${TEST_TARGET_PATH_ERROR}.` };
		}

		normalizedValues.push(normalized);
	}

	return {
		ok: true,
		values: [...new Set(normalizedValues)].sort((left, right) => left.localeCompare(right)),
	};
}

function commandAcceptsTestTargets(intent: TomlTable): boolean {
	return isRecord(intent.selection) && intent.selection.accepts_test_targets === true;
}

function shouldUseShellForArgvExecutable(executablePath: string): boolean {
	return process.platform === 'win32' && executablePath.toLowerCase().endsWith('.cmd');
}

export function isMustflowBuiltinIntent(intent: TomlTable): boolean {
	return readString(intent, 'kind') === 'mustflow_builtin';
}

function resolveCurrentCliEntrypoint(): string | undefined {
	const entrypoint = process.argv[1];

	return entrypoint ? path.resolve(entrypoint) : undefined;
}

function resolveArgvCommand(intent: TomlTable, commandArgv: readonly string[]): ResolvedArgvCommand {
	const [command = '', ...args] = commandArgv;

	if (isMustflowBuiltinIntent(intent) && isMustflowBinName(command)) {
		const entrypoint = resolveCurrentCliEntrypoint();

		if (entrypoint) {
			return {
				executable: process.execPath,
				args: [entrypoint, ...args],
				shell: false,
			};
		}
	}

	return {
		executable: command,
		args,
		shell: shouldUseShellForArgvExecutable(command),
	};
}

function getRunPlanMode(commandArgv: readonly string[] | undefined, intent: TomlTable): RunCommandMode | null {
	if (commandArgv) {
		return 'argv';
	}

	return intent.mode === 'shell' ? 'shell' : null;
}

function readEffectiveKillAfterSeconds(contract: CommandContract, intent: TomlTable): number {
	return readPositiveInteger(intent, 'kill_after_seconds') ??
		readPositiveInteger(contract.defaults, 'kill_after_seconds') ??
		5;
}

function readRunIntentMetadata(contract: CommandContract, intent: TomlTable): RunIntentMetadata {
	const configuredCwd = readEffectiveCommandCwd(contract, intent);
	const commandArgv = readStringArray(intent, 'argv');
	const shellCommand = intent.mode === 'shell' ? readString(intent, 'cmd') : undefined;
	const env = resolveCommandEnv(contract, intent);

	return {
		intentStatus: readString(intent, 'status') ?? 'unknown',
		lifecycle: readString(intent, 'lifecycle') ?? null,
		runPolicy: readString(intent, 'run_policy') ?? null,
		kind: readString(intent, 'kind') ?? null,
		configuredCwd,
		timeoutSeconds: readPositiveInteger(intent, 'timeout_seconds') ?? null,
		killAfterSeconds: readEffectiveKillAfterSeconds(contract, intent),
		maxOutputBytes: readEffectiveCommandMaxOutputBytes(contract, intent, DEFAULT_COMMAND_MAX_OUTPUT_BYTES),
		successExitCodes: getSuccessExitCodes(intent),
		commandArgv,
		shellCommand,
		mode: getRunPlanMode(commandArgv, intent),
		writes: readStringArray(intent, 'writes'),
		effects: readArray(intent, 'effects'),
		network: readBoolean(intent, 'network'),
		destructive: readBoolean(intent, 'destructive'),
		envPolicy: env.policy,
		envAllowlist: env.allowlist,
		testTargets: [],
		manualStartHint: readString(intent, 'manual_start_hint') ?? null,
		healthCheckUrl: readString(intent, 'health_check_url') ?? null,
		stopInstruction: readString(intent, 'stop_instruction') ?? null,
		relatedOneshotChecks: readStringArray(intent, 'related_oneshot_checks') ?? [],
	};
}

function createBlockedRunPlan(
	contract: CommandContract,
	intentName: string,
	intent: TomlTable | undefined,
	eligibility: CommandIntentEligibilityResult,
	reasonCode: RunPlanReasonCode,
	detail: string | null,
	preconditions: readonly CommandPreconditionPlan[] = [],
): BlockedRunPlan {
	const metadata = intent ? readRunIntentMetadata(contract, intent) : null;

	return {
		intentName,
		intent,
		ok: false,
		eligibility,
		reasonCode,
		detail,
		intentStatus: metadata?.intentStatus ?? null,
		lifecycle: metadata?.lifecycle ?? null,
		runPolicy: metadata?.runPolicy ?? null,
		kind: metadata?.kind ?? null,
		configuredCwd: metadata?.configuredCwd ?? null,
		cwd: null,
		relativeCwd: null,
		timeoutSeconds: metadata?.timeoutSeconds ?? null,
		killAfterSeconds: metadata?.killAfterSeconds ?? null,
		maxOutputBytes: metadata?.maxOutputBytes ?? null,
		successExitCodes: metadata?.successExitCodes ?? null,
		commandArgv: metadata?.commandArgv,
		shellCommand: metadata?.shellCommand,
		mode: metadata?.mode ?? null,
		argvCommand: undefined,
		writes: metadata?.writes,
		effects: metadata?.effects,
		network: metadata?.network,
		destructive: metadata?.destructive,
		envPolicy: metadata?.envPolicy ?? null,
		envAllowlist: metadata?.envAllowlist ?? [],
		testTargets: [],
		suggestedIntentSnippet: createSuggestedIntentSnippet(intentName, metadata, reasonCode),
		manualStartHint: metadata?.manualStartHint ?? null,
		healthCheckUrl: metadata?.healthCheckUrl ?? null,
		stopInstruction: metadata?.stopInstruction ?? null,
		relatedOneshotChecks: metadata?.relatedOneshotChecks ?? [],
		preconditions,
		activeLockConflicts: [],
		staleActiveLocks: [],
	};
}

export function createRunPlan(
	projectRoot: string,
	contract: CommandContract,
	intentName: string,
	options: RunPlanOptions = {},
): RunPlan {
	const rawIntent = contract.intents[intentName];
	const eligibility = evaluateCommandIntentEligibility(intentName, rawIntent);

	if (!isRecord(rawIntent)) {
		return createBlockedRunPlan(contract, intentName, undefined, eligibility, 'intent_not_table', eligibility.detail);
	}

	const preconditions = evaluateCommandPreconditions(projectRoot, contract, intentName);
	const activeLocks = inspectActiveRunLocks(projectRoot, contract, intentName);

	if (!eligibility.ok) {
		return createBlockedRunPlan(contract, intentName, rawIntent, eligibility, eligibility.code, eligibility.detail, preconditions);
	}

	const metadata = readRunIntentMetadata(contract, rawIntent);
	const maxOutputBytesLimitDetail = getCommandMaxOutputBytesLimitDetail(contract, rawIntent);
	if (maxOutputBytesLimitDetail) {
		return createBlockedRunPlan(
			contract,
			intentName,
			rawIntent,
			eligibility,
			'max_output_bytes_exceeds_limit',
			maxOutputBytesLimitDetail,
			preconditions,
		);
	}

	let cwd: string;

	try {
		cwd = resolveSafeProjectCwd(projectRoot, metadata.configuredCwd);
	} catch (error) {
		return createBlockedRunPlan(
			contract,
			intentName,
			rawIntent,
			eligibility,
			'cwd_outside_project',
			error instanceof Error ? error.message : String(error),
			preconditions,
		);
	}

	const normalizedTestTargets = commandAcceptsTestTargets(rawIntent) ?
		normalizeTestTargets(options.testTargets) :
		({ ok: true, values: [] as readonly string[] } as const);
	if (!normalizedTestTargets.ok) {
		return createBlockedRunPlan(
			contract,
			intentName,
			rawIntent,
			eligibility,
			'invalid_test_target',
			normalizedTestTargets.detail,
			preconditions,
		);
	}

	const testTargets = normalizedTestTargets.values;
	const commandArgv = metadata.commandArgv && testTargets.length > 0 ? [...metadata.commandArgv, ...testTargets] : metadata.commandArgv;

	if (!metadata.timeoutSeconds || !metadata.mode) {
		return createBlockedRunPlan(
			contract,
			intentName,
			rawIntent,
			eligibility,
			!metadata.timeoutSeconds ? 'missing_timeout' : 'missing_command_source',
			!metadata.timeoutSeconds ? 'Intent timeout_seconds is missing or invalid.' : 'Intent does not define argv or shell cmd.',
			preconditions,
		);
	}

	return {
		intentName,
		intent: rawIntent,
		ok: true,
		eligibility,
		reasonCode: null,
		detail: null,
		intentStatus: metadata.intentStatus,
		lifecycle: metadata.lifecycle,
		runPolicy: metadata.runPolicy,
		kind: metadata.kind,
		configuredCwd: metadata.configuredCwd,
		cwd,
		relativeCwd: getRelativeProjectPath(projectRoot, cwd),
		timeoutSeconds: metadata.timeoutSeconds,
		killAfterSeconds: metadata.killAfterSeconds,
		maxOutputBytes: metadata.maxOutputBytes,
		successExitCodes: metadata.successExitCodes,
		commandArgv,
		shellCommand: metadata.shellCommand,
		mode: metadata.mode,
		argvCommand: commandArgv ? resolveArgvCommand(rawIntent, commandArgv) : undefined,
		writes: metadata.writes,
		effects: metadata.effects,
		network: metadata.network,
		destructive: metadata.destructive,
		envPolicy: metadata.envPolicy,
		envAllowlist: metadata.envAllowlist,
		testTargets,
		suggestedIntentSnippet: null,
		manualStartHint: metadata.manualStartHint,
		healthCheckUrl: metadata.healthCheckUrl,
		stopInstruction: metadata.stopInstruction,
		relatedOneshotChecks: metadata.relatedOneshotChecks,
		preconditions,
		activeLockConflicts: activeLocks.conflicts,
		staleActiveLocks: activeLocks.staleRecords,
	};
}

function formatTomlString(value: string): string {
	return JSON.stringify(value);
}

function formatTomlStringArray(values: readonly string[]): string {
	return `[${values.map(formatTomlString).join(', ')}]`;
}

function createSuggestedIntentSnippet(
	intentName: string,
	metadata: RunIntentMetadata | null,
	reasonCode: RunPlanReasonCode,
): string | null {
	if (!/^[A-Za-z0-9_-]+$/u.test(intentName)) {
		return null;
	}

	let commandLines: readonly string[];
	if (reasonCode === 'blocked_shell_background_pattern' || reasonCode === 'blocked_long_running_command_pattern') {
		commandLines = [`argv = ${formatTomlStringArray(['TODO_REPLACE_WITH_FINITE_COMMAND'])}`];
	} else if (metadata?.shellCommand) {
		commandLines = [`mode = "shell"`, `cmd = ${formatTomlString(metadata.shellCommand)}`];
	} else {
		commandLines = [`argv = ${formatTomlStringArray(metadata?.commandArgv ?? ['TODO_REPLACE_WITH_COMMAND'])}`];
	}
	const lifecycle = metadata?.lifecycle && metadata.lifecycle !== 'oneshot' ? metadata.lifecycle : 'oneshot';
	const configuredCwd = reasonCode === 'cwd_outside_project' ? '.' : metadata?.configuredCwd ?? '.';

	return [
		`[intents.${intentName}]`,
		`status = "manual_only"`,
		`lifecycle = ${formatTomlString(lifecycle)}`,
		`run_policy = "requires_explicit_user_request"`,
		`description = "TODO: describe when this intent should run."`,
		...commandLines,
		`cwd = ${formatTomlString(configuredCwd)}`,
		`timeout_seconds = ${metadata?.timeoutSeconds ?? 600}`,
		`stdin = "closed"`,
		`success_exit_codes = ${metadata?.successExitCodes ? `[${metadata.successExitCodes.join(', ')}]` : '[0]'}`,
		`writes = ${metadata?.writes ? formatTomlStringArray(metadata.writes) : '[]'}`,
		`network = ${metadata?.network ?? false}`,
		`destructive = ${metadata?.destructive ?? false}`,
		`reason = "Review this suggested intent before enabling agent execution."`,
		`agent_action = "do_not_guess_report_missing"`,
	].join('\n');
}

export function createRunPreview(plan: RunPlan, previewMode: RunPreviewMode): Record<string, unknown> {
	return {
		schema_version: '1',
		command: 'run',
		preview: true,
		preview_mode: previewMode,
		intent: plan.intentName,
		runnable: plan.ok,
		eligibility: plan.eligibility,
		reason_code: plan.reasonCode,
		detail: plan.detail,
		status: plan.intentStatus,
		lifecycle: plan.lifecycle,
		run_policy: plan.runPolicy,
		kind: plan.kind,
		configured_cwd: plan.configuredCwd,
		cwd: plan.relativeCwd,
		resolved_cwd: plan.cwd,
		timeout_seconds: plan.timeoutSeconds,
		kill_after_seconds: plan.killAfterSeconds,
		max_output_bytes: plan.maxOutputBytes,
		max_output_bytes_scope: plan.maxOutputBytes === null ? null : COMMAND_OUTPUT_LIMIT_SCOPE,
		mode: plan.mode,
		argv: plan.commandArgv,
		resolved_argv: plan.argvCommand,
		cmd: plan.shellCommand,
		writes: plan.writes,
		effects: plan.effects,
		network: plan.network,
		destructive: plan.destructive,
		env_policy: plan.envPolicy,
		env_allowlist: plan.envAllowlist,
		test_targets: plan.testTargets,
		success_exit_codes: plan.successExitCodes,
		suggested_intent_snippet: plan.suggestedIntentSnippet,
		manual_start_hint: plan.manualStartHint,
		health_check_url: plan.healthCheckUrl,
		stop_instruction: plan.stopInstruction,
		related_oneshot_checks: plan.relatedOneshotChecks,
		preconditions: plan.preconditions,
		active_lock_conflicts: plan.activeLockConflicts,
		stale_active_locks: plan.staleActiveLocks,
	};
}

export function renderRunPreviewText(plan: RunPlan, previewMode: RunPreviewMode, lang: CliLang = 'en'): string {
	const lines = [
		`mf run ${previewMode}`,
		`Intent: ${plan.intentName}`,
		`Runnable: ${plan.ok ? 'yes' : 'no'}`,
	];

	if (!plan.ok) {
		lines.push(`Reason: ${plan.reasonCode}${plan.detail ? ` (${plan.detail})` : ''}`);
		if (plan.suggestedIntentSnippet) {
			lines.push('', `${t(lang, 'run.label.suggestedIntentSnippet')}:`, plan.suggestedIntentSnippet);
		}
		if (plan.manualStartHint) {
			lines.push('', `Manual start: ${plan.manualStartHint}`);
		}
		if (plan.healthCheckUrl) {
			lines.push(`Health check: ${plan.healthCheckUrl}`);
		}
		if (plan.stopInstruction) {
			lines.push(`Stop: ${plan.stopInstruction}`);
		}
		if (plan.relatedOneshotChecks.length > 0) {
			lines.push(`Related oneshot checks: ${plan.relatedOneshotChecks.join(', ')}`);
		}
		return lines.join('\n');
	}

	lines.push(`Mode: ${plan.mode}`);
	lines.push(`Cwd: ${plan.relativeCwd}`);
	lines.push(`Timeout: ${plan.timeoutSeconds}s`);
	lines.push(`Environment: ${plan.envPolicy}${plan.envAllowlist.length > 0 ? ` (${plan.envAllowlist.join(', ')})` : ''}`);

	if (plan.preconditions.length > 0) {
		lines.push('Preconditions:');
		for (const precondition of plan.preconditions) {
			const target = precondition.path ?? precondition.artifact ?? precondition.label ?? precondition.kind;
			lines.push(`- ${precondition.kind} ${target}: ${precondition.status}`);
		}
	}

	if (plan.activeLockConflicts.length > 0) {
		lines.push('Active lock conflicts:');
		for (const conflict of plan.activeLockConflicts) {
			lines.push(`- ${conflict.lock}: ${conflict.detail}`);
		}
	}

	if (plan.commandArgv) {
		lines.push(`Argv: ${plan.commandArgv.join(' ')}`);
	} else if (plan.shellCommand) {
		lines.push(`Shell: ${plan.shellCommand}`);
	}

	return lines.join('\n');
}
