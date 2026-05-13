import path from 'node:path';

import { isMustflowBinName } from '../../core/command-classification.js';
import { resolveSafeProjectCwd } from '../../core/command-cwd.js';
import {
	evaluateCommandIntentEligibility,
	type CommandIntentEligibilityCode,
	type CommandIntentEligibilityResult,
} from '../../core/command-intent-eligibility.js';
import {
	isRecord,
	readPositiveInteger,
	readString,
	readStringArray,
	type CommandContract,
	type TomlTable,
} from '../../core/config-loading.js';
import type { RunCommandMode } from '../../core/run-receipt.js';

export interface ResolvedArgvCommand {
	readonly executable: string;
	readonly args: string[];
	readonly shell: boolean;
}

export type RunPreviewMode = 'dry-run' | 'plan-only';
export type RunPlanReasonCode = Exclude<CommandIntentEligibilityCode, 'ok'> | 'cwd_outside_project';

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
	readonly maxOutputBytes: number;
	readonly successExitCodes: readonly number[];
	readonly mode: RunCommandMode;
}

export type RunPlan = BlockedRunPlan | RunnableRunPlan;

function getSuccessExitCodes(intent: TomlTable): number[] {
	const value = intent.success_exit_codes;

	if (!Array.isArray(value) || value.length === 0 || value.some((entry) => !Number.isInteger(entry))) {
		return [0];
	}

	return value.map(Number);
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

function resolveArgvCommand(intent: TomlTable, commandArgv: string[]): ResolvedArgvCommand {
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

function createBlockedRunPlan(
	contract: CommandContract,
	intentName: string,
	intent: TomlTable | undefined,
	eligibility: CommandIntentEligibilityResult,
	reasonCode: RunPlanReasonCode,
	detail: string | null,
): BlockedRunPlan {
	const configuredCwd = intent ? (readString(intent, 'cwd') ?? readString(contract.defaults, 'default_cwd') ?? '.') : null;
	const commandArgv = intent ? readStringArray(intent, 'argv') : undefined;
	const shellCommand = intent?.mode === 'shell' ? readString(intent, 'cmd') : undefined;
	const mode = intent ? getRunPlanMode(commandArgv, intent) : null;
	const maxOutputBytes = intent
		? (readPositiveInteger(intent, 'max_output_bytes') ?? readPositiveInteger(contract.defaults, 'max_output_bytes') ?? 1_048_576)
		: null;

	return {
		intentName,
		intent,
		ok: false,
		eligibility,
		reasonCode,
		detail,
		intentStatus: intent ? (readString(intent, 'status') ?? 'unknown') : null,
		lifecycle: intent ? (readString(intent, 'lifecycle') ?? null) : null,
		runPolicy: intent ? (readString(intent, 'run_policy') ?? null) : null,
		kind: intent ? (readString(intent, 'kind') ?? null) : null,
		configuredCwd,
		cwd: null,
		relativeCwd: null,
		timeoutSeconds: intent ? (readPositiveInteger(intent, 'timeout_seconds') ?? null) : null,
		maxOutputBytes,
		successExitCodes: intent ? getSuccessExitCodes(intent) : null,
		commandArgv,
		shellCommand,
		mode,
		argvCommand: undefined,
		writes: intent ? readStringArray(intent, 'writes') : undefined,
		effects: intent ? readArray(intent, 'effects') : undefined,
		network: intent ? readBoolean(intent, 'network') : undefined,
		destructive: intent ? readBoolean(intent, 'destructive') : undefined,
	};
}

export function createRunPlan(projectRoot: string, contract: CommandContract, intentName: string): RunPlan {
	const rawIntent = contract.intents[intentName];
	const eligibility = evaluateCommandIntentEligibility(intentName, rawIntent);

	if (!isRecord(rawIntent)) {
		const reasonCode = eligibility.ok ? 'intent_not_table' : eligibility.code;
		return createBlockedRunPlan(contract, intentName, undefined, eligibility, reasonCode, eligibility.detail);
	}

	if (!eligibility.ok) {
		return createBlockedRunPlan(contract, intentName, rawIntent, eligibility, eligibility.code, eligibility.detail);
	}

	const configuredCwd = readString(rawIntent, 'cwd') ?? readString(contract.defaults, 'default_cwd') ?? '.';
	let cwd: string;

	try {
		cwd = resolveSafeProjectCwd(projectRoot, configuredCwd);
	} catch (error) {
		return createBlockedRunPlan(
			contract,
			intentName,
			rawIntent,
			eligibility,
			'cwd_outside_project',
			error instanceof Error ? error.message : String(error),
		);
	}

	const commandArgv = readStringArray(rawIntent, 'argv');
	const shellCommand = rawIntent.mode === 'shell' ? readString(rawIntent, 'cmd') : undefined;
	const mode = getRunPlanMode(commandArgv, rawIntent);
	const timeoutSeconds = readPositiveInteger(rawIntent, 'timeout_seconds');

	if (!timeoutSeconds || !mode) {
		return createBlockedRunPlan(
			contract,
			intentName,
			rawIntent,
			eligibility,
			!timeoutSeconds ? 'missing_timeout' : 'missing_command_source',
			!timeoutSeconds ? 'Intent timeout_seconds is missing or invalid.' : 'Intent does not define argv or shell cmd.',
		);
	}

	return {
		intentName,
		intent: rawIntent,
		ok: true,
		eligibility,
		reasonCode: null,
		detail: null,
		intentStatus: readString(rawIntent, 'status') ?? 'unknown',
		lifecycle: readString(rawIntent, 'lifecycle') ?? null,
		runPolicy: readString(rawIntent, 'run_policy') ?? null,
		kind: readString(rawIntent, 'kind') ?? null,
		configuredCwd,
		cwd,
		relativeCwd: getRelativeProjectPath(projectRoot, cwd),
		timeoutSeconds,
		maxOutputBytes:
			readPositiveInteger(rawIntent, 'max_output_bytes') ?? readPositiveInteger(contract.defaults, 'max_output_bytes') ?? 1_048_576,
		successExitCodes: getSuccessExitCodes(rawIntent),
		commandArgv,
		shellCommand,
		mode,
		argvCommand: commandArgv ? resolveArgvCommand(rawIntent, commandArgv) : undefined,
		writes: readStringArray(rawIntent, 'writes'),
		effects: readArray(rawIntent, 'effects'),
		network: readBoolean(rawIntent, 'network'),
		destructive: readBoolean(rawIntent, 'destructive'),
	};
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
		max_output_bytes: plan.maxOutputBytes,
		mode: plan.mode,
		argv: plan.commandArgv,
		resolved_argv: plan.argvCommand,
		cmd: plan.shellCommand,
		writes: plan.writes,
		effects: plan.effects,
		network: plan.network,
		destructive: plan.destructive,
		success_exit_codes: plan.successExitCodes,
	};
}

export function renderRunPreviewText(plan: RunPlan, previewMode: RunPreviewMode): string {
	const lines = [
		`mf run ${previewMode}`,
		`Intent: ${plan.intentName}`,
		`Runnable: ${plan.ok ? 'yes' : 'no'}`,
	];

	if (!plan.ok) {
		lines.push(`Reason: ${plan.reasonCode}${plan.detail ? ` (${plan.detail})` : ''}`);
		return lines.join('\n');
	}

	lines.push(`Mode: ${plan.mode}`);
	lines.push(`Cwd: ${plan.relativeCwd}`);
	lines.push(`Timeout: ${plan.timeoutSeconds}s`);

	if (plan.commandArgv) {
		lines.push(`Argv: ${plan.commandArgv.join(' ')}`);
	} else if (plan.shellCommand) {
		lines.push(`Shell: ${plan.shellCommand}`);
	}

	return lines.join('\n');
}
