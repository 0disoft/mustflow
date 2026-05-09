const MUSTFLOW_BIN_NAMES = new Set(['mf', 'mustflow']);
const IN_PROCESS_MUSTFLOW_BUILTIN_COMMANDS = new Set([
	'check',
	'classify',
	'context',
	'doctor',
	'explain',
	'help',
	'impact',
	'map',
	'status',
	'update',
	'version-sources',
	'verify',
]);

export function isMustflowBinName(command: string): boolean {
	return MUSTFLOW_BIN_NAMES.has(command.toLowerCase());
}

export function canRunMustflowBuiltinInProcess(command: string | undefined): boolean {
	return command !== undefined && IN_PROCESS_MUSTFLOW_BUILTIN_COMMANDS.has(command);
}
