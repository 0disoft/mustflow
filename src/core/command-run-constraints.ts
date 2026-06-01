import { resolveSafeProjectCwd } from './command-cwd.js';
import {
	MAX_COMMAND_OUTPUT_BYTES,
	commandMaxOutputBytesLimitMessage,
} from './command-output-limits.js';
import {
	readPositiveInteger,
	readString,
	type CommandContract,
	type TomlTable,
} from './config-loading.js';

export type CommandRunStaticBlockerReason =
	| 'cwd_outside_project'
	| 'max_output_bytes_exceeds_limit';

export interface CommandRunStaticBlocker {
	readonly reason: CommandRunStaticBlockerReason;
	readonly detail: string;
}

export function readEffectiveCommandCwd(contract: CommandContract, intent: TomlTable): string {
	return readString(intent, 'cwd') ?? readString(contract.defaults, 'default_cwd') ?? '.';
}

export function readEffectiveCommandMaxOutputBytes(contract: CommandContract, intent: TomlTable, fallback: number): number {
	return readPositiveInteger(intent, 'max_output_bytes') ??
		readPositiveInteger(contract.defaults, 'max_output_bytes') ??
		fallback;
}

export function getCommandMaxOutputBytesLimitDetail(contract: CommandContract, intent: TomlTable): string | null {
	const intentValue = readPositiveInteger(intent, 'max_output_bytes');
	if (intentValue !== undefined) {
		return intentValue > MAX_COMMAND_OUTPUT_BYTES ?
			commandMaxOutputBytesLimitMessage('[commands.intents.<intent>].max_output_bytes') :
			null;
	}

	const defaultValue = readPositiveInteger(contract.defaults, 'max_output_bytes');
	if (defaultValue !== undefined && defaultValue > MAX_COMMAND_OUTPUT_BYTES) {
		return commandMaxOutputBytesLimitMessage('[commands.defaults].max_output_bytes');
	}

	return null;
}

export function getCommandRunStaticBlocker(
	projectRoot: string,
	contract: CommandContract,
	intent: TomlTable,
): CommandRunStaticBlocker | null {
	const maxOutputBytesLimitDetail = getCommandMaxOutputBytesLimitDetail(contract, intent);
	if (maxOutputBytesLimitDetail) {
		return {
			reason: 'max_output_bytes_exceeds_limit',
			detail: maxOutputBytesLimitDetail,
		};
	}

	try {
		resolveSafeProjectCwd(projectRoot, readEffectiveCommandCwd(contract, intent));
	} catch (error) {
		return {
			reason: 'cwd_outside_project',
			detail: error instanceof Error ? error.message : String(error),
		};
	}

	return null;
}
