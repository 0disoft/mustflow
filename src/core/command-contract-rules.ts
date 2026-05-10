import { readString, readStringArray, type TomlTable } from './config-loading.js';

const SAFE_COMMAND_INTENT_NAME_PATTERN = /^[A-Za-z0-9_-]+$/u;

export const BACKGROUND_SHELL_PATTERNS = [
	/\s&\s*$/u,
	/\bnohup\b/iu,
	/\bdisown\b/iu,
	/\bStart-Process\b/iu,
	/\bstart\s+/iu,
	/\bxdg-open\b/iu,
	/\bopen\s+/iu,
	/\bchrome(?:\.exe)?\b/iu,
	/\bchromium(?:\.exe)?\b/iu,
] as const;

export function commandIntentNameIsSafe(intentName: string): boolean {
	return SAFE_COMMAND_INTENT_NAME_PATTERN.test(intentName);
}

export function commandIntentHasCommandSource(intent: TomlTable): boolean {
	const argv = readStringArray(intent, 'argv');
	const shellCommand = intent.mode === 'shell' ? readString(intent, 'cmd') : undefined;

	return Boolean((argv && argv.length > 0) || shellCommand);
}

export function shellCommandHasBlockedBackgroundPattern(command: string): boolean {
	return BACKGROUND_SHELL_PATTERNS.some((pattern) => pattern.test(command));
}

export function commandIntentHasBlockedShellBackgroundPattern(intent: TomlTable): boolean {
	return intent.mode === 'shell' && typeof intent.cmd === 'string' && shellCommandHasBlockedBackgroundPattern(intent.cmd);
}
