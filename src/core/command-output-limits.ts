export const DEFAULT_COMMAND_MAX_OUTPUT_BYTES = 1_048_576;
export const MAX_COMMAND_OUTPUT_BYTES = 16 * 1024 * 1024;

export function commandMaxOutputBytesLimitMessage(label: string): string {
	return `${label} must be less than or equal to ${MAX_COMMAND_OUTPUT_BYTES}`;
}
