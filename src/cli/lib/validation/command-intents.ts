import { isRecord, type TomlTable } from '../command-contract.js';

export function isDeclaredCommandIntent(commandsToml: TomlTable | undefined, intentName: string): boolean {
	return Boolean(commandsToml && isRecord(commandsToml.intents) && isRecord(commandsToml.intents[intentName]));
}

export function isConfiguredCommandIntent(commandsToml: TomlTable | undefined, intentName: string): boolean {
	if (!commandsToml || !isRecord(commandsToml.intents)) {
		return false;
	}

	const intent = commandsToml.intents[intentName];
	return isRecord(intent) && intent.status === 'configured';
}
