import {
	isRecord,
	readPositiveInteger,
	readString,
	readStringArray,
	type CommandContract,
	type TomlTable,
} from './config-loading.js';

export type CommandDecisionKind = 'allowed' | 'blocked' | 'unknown';

export interface CommandIntentSummary {
	readonly name: string;
	readonly status: string | null;
	readonly lifecycle: string | null;
	readonly runPolicy: string | null;
	readonly stdin: string | null;
	readonly timeoutSeconds: number | null;
	readonly mode: 'argv' | 'shell' | 'missing';
	readonly requiredAfter: readonly string[];
}

export interface CommandDecision {
	readonly kind: CommandDecisionKind;
	readonly inputCommand: string;
	readonly decision: string;
	readonly reason: string;
	readonly effectiveAction: string;
	readonly countsAsMustflowVerification: boolean;
	readonly sourceFiles: readonly string[];
	readonly intent: CommandIntentSummary | null;
}

const COMMAND_CONTRACT_SOURCE_FILES = [
	'AGENTS.md',
	'.mustflow/docs/agent-workflow.md',
	'.mustflow/config/commands.toml',
	'.mustflow/config/mustflow.toml',
];

function readOptionalStringArray(table: TomlTable, key: string): readonly string[] {
	return readStringArray(table, key) ?? [];
}

function resolveCommandMode(intent: TomlTable): 'argv' | 'shell' | 'missing' {
	const argv = readStringArray(intent, 'argv');
	const shellCommand = intent.mode === 'shell' ? readString(intent, 'cmd') : undefined;

	if (argv && argv.length > 0) {
		return 'argv';
	}

	if (shellCommand) {
		return 'shell';
	}

	return 'missing';
}

function summarizeIntent(name: string, intent: TomlTable): CommandIntentSummary {
	return {
		name,
		status: readString(intent, 'status') ?? null,
		lifecycle: readString(intent, 'lifecycle') ?? null,
		runPolicy: readString(intent, 'run_policy') ?? null,
		stdin: readString(intent, 'stdin') ?? null,
		timeoutSeconds: readPositiveInteger(intent, 'timeout_seconds') ?? null,
		mode: resolveCommandMode(intent),
		requiredAfter: readOptionalStringArray(intent, 'required_after'),
	};
}

function collectBlockingReasons(summary: CommandIntentSummary): string[] {
	const reasons: string[] = [];

	if (summary.status !== 'configured') {
		reasons.push(`status is ${summary.status ?? 'missing'}, not configured`);
	}

	if (summary.lifecycle !== 'oneshot') {
		reasons.push(`lifecycle is ${summary.lifecycle ?? 'missing'}, not oneshot`);
	}

	if (summary.runPolicy !== 'agent_allowed') {
		reasons.push(`run_policy is ${summary.runPolicy ?? 'missing'}, not agent_allowed`);
	}

	if (summary.stdin !== 'closed') {
		reasons.push(`stdin is ${summary.stdin ?? 'missing'}, not closed`);
	}

	if (summary.timeoutSeconds === null) {
		reasons.push('timeout_seconds is missing or invalid');
	}

	if (summary.mode === 'missing') {
		reasons.push('no argv command or shell cmd is declared');
	}

	return reasons;
}

export function explainCommandIntent(contract: CommandContract, commandName: string): CommandDecision {
	const intentCandidate = contract.intents[commandName];

	if (!isRecord(intentCandidate)) {
		return {
			kind: 'unknown',
			inputCommand: commandName,
			decision: `command intent "${commandName}" is not declared`,
			reason: 'mustflow does not infer commands from package manager files or repository conventions.',
			effectiveAction: 'Do not run a guessed command; add a configured intent or report the missing command contract.',
			countsAsMustflowVerification: false,
			sourceFiles: COMMAND_CONTRACT_SOURCE_FILES,
			intent: null,
		};
	}

	const intent = summarizeIntent(commandName, intentCandidate);
	const blockingReasons = collectBlockingReasons(intent);

	if (blockingReasons.length === 0) {
		return {
			kind: 'allowed',
			inputCommand: commandName,
			decision: `command intent "${commandName}" is allowed through mf run`,
			reason:
				'the intent is configured, one-shot, agent-allowed, closed-stdin, bounded by a timeout, and has an explicit command source.',
			effectiveAction: `Run mf run ${commandName} when this intent is required for the changed behavior.`,
			countsAsMustflowVerification: true,
			sourceFiles: COMMAND_CONTRACT_SOURCE_FILES,
			intent,
		};
	}

	return {
		kind: 'blocked',
		inputCommand: commandName,
		decision: `command intent "${commandName}" is not agent-runnable`,
		reason: blockingReasons.join('; '),
		effectiveAction: 'Do not run this command as verification; report the command-contract reason instead.',
		countsAsMustflowVerification: false,
		sourceFiles: COMMAND_CONTRACT_SOURCE_FILES,
		intent,
	};
}
