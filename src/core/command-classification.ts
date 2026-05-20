const MUSTFLOW_BIN_NAMES = new Set(['mf', 'mustflow']);

export function isMustflowBinName(command: string): boolean {
	return MUSTFLOW_BIN_NAMES.has(command.toLowerCase());
}
