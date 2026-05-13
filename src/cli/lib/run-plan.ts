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

interface RunIntentMetadata {
	readonly intentStatus: string;
	readonly lifecycle: string | null;
	readonly runPolicy: string | null;
	readonly kind: string | null;
	readonly configuredCwd: string;
	readonly timeoutSeconds: number | null;
	readonly maxOutputBytes: number;
	readonly successExitCodes: readonly number[];
	readonly commandArgv: readonly string[] | undefined;
	readonly shellCommand: string | undefined;
	readonly mode: RunCommandMode | null;
	readonly writes: readonly string[] | undefined;
	readonly effects: readonly unknown[] | undefined;
	readonly network: boolean | undefined;
	readonly destructive: boolean | undefined;
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

function readRunIntentMetadata(contract: CommandContract, intent: TomlTable): RunIntentMetadata {
	const configuredCwd = readString(intent, 'cwd') ?? readString(contract.defaults, 'default_cwd') ?? '.';
	const commandArgv = readStringArray(intent, 'argv');
	const shellCommand = intent.mode === 'shell' ? readString(intent, 'cmd') : undefined;

	return {
		intentStatus: readString(intent, 'status') ?? 'unknown',
		lifecycle: readString(intent, 'lifecycle') ?? null,
		runPolicy: readString(intent, 'run_policy') ?? null,
		kind: readString(intent, 'kind') ?? null,
		configuredCwd,
		timeoutSeconds: readPositiveInteger(intent, 'timeout_seconds') ?? null,
		maxOutputBytes:
			readPositiveInteger(intent, 'max_output_bytes') ?? readPositiveInteger(contract.defaults, 'max_output_bytes') ?? 1_048_576,
		successExitCodes: getSuccessExitCodes(intent),
		commandArgv,
		shellCommand,
		mode: getRunPlanMode(commandArgv, intent),
		writes: readStringArray(intent, 'writes'),
		effects: readArray(intent, 'effects'),
		network: readBoolean(intent, 'network'),
		destructive: readBoolean(intent, 'destructive'),
	};
}

function createBlockedRunPlan(
	contract: CommandContract,
	intentName: string,
	intent: TomlTable | undefined,
	eligibility: CommandIntentEligibilityResult,
	reasonCode: RunPlanReasonCode,
	detail: string | null,
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
	};
}

export function createRunPlan(projectRoot: string, contract: CommandContract, intentName: string): RunPlan {
	const rawIntent = contract.intents[intentName];
	const eligibility = evaluateCommandIntentEligibility(intentName, rawIntent);

	if (!isRecord(rawIntent)) {
		return createBlockedRunPlan(contract, intentName, undefined, eligibility, 'intent_not_table', eligibility.detail);
	}

	if (!eligibility.ok) {
		return createBlockedRunPlan(contract, intentName, rawIntent, eligibility, eligibility.code, eligibility.detail);
	}

	const metadata = readRunIntentMetadata(contract, rawIntent);
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
		);
	}

	if (!metadata.timeoutSeconds || !metadata.mode) {
		return createBlockedRunPlan(
			contract,
			intentName,
			rawIntent,
			eligibility,
			!metadata.timeoutSeconds ? 'missing_timeout' : 'missing_command_source',
			!metadata.timeoutSeconds ? 'Intent timeout_seconds is missing or invalid.' : 'Intent does not define argv or shell cmd.',
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
		maxOutputBytes: metadata.maxOutputBytes,
		successExitCodes: metadata.successExitCodes,
		commandArgv: metadata.commandArgv,
		shellCommand: metadata.shellCommand,
		mode: metadata.mode,
		argvCommand: metadata.commandArgv ? resolveArgvCommand(rawIntent, metadata.commandArgv) : undefined,
		writes: metadata.writes,
		effects: metadata.effects,
		network: metadata.network,
		destructive: metadata.destructive,
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
