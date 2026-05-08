import {
	isRecord,
	readString,
	readStringArray,
	type CommandContract,
	type TomlTable,
} from './config-loading.js';

export type VerificationRunnableStatus = 'runnable' | 'skipped';

export type VerificationSkipReason =
	| 'no_matching_intents'
	| 'intent_not_table'
	| 'status_not_configured'
	| 'lifecycle_not_oneshot'
	| 'run_policy_not_agent_allowed'
	| 'stdin_not_closed'
	| 'missing_timeout'
	| 'missing_command_source';

export interface VerificationCandidate {
	readonly intent: string;
	readonly status: VerificationRunnableStatus;
	readonly reason: VerificationSkipReason | null;
	readonly detail: string | null;
}

export interface VerificationPlan {
	readonly reason: string;
	readonly candidates: readonly VerificationCandidate[];
}

function hasRequiredAfter(intent: TomlTable, reason: string): boolean {
	return (readStringArray(intent, 'required_after') ?? []).includes(reason);
}

function hasCommandSource(intent: TomlTable): boolean {
	const argv = readStringArray(intent, 'argv');
	const shellCommand = intent.mode === 'shell' ? readString(intent, 'cmd') : undefined;

	return Boolean((argv && argv.length > 0) || shellCommand);
}

function classifyCandidate(intentName: string, rawIntent: unknown): VerificationCandidate {
	if (!isRecord(rawIntent)) {
		return {
			intent: intentName,
			status: 'skipped',
			reason: 'intent_not_table',
			detail: 'Intent is not a TOML table.',
		};
	}

	const status = readString(rawIntent, 'status') ?? 'unknown';
	if (status !== 'configured') {
		const reason = readString(rawIntent, 'reason');
		return {
			intent: intentName,
			status: 'skipped',
			reason: 'status_not_configured',
			detail: reason ?? `Intent status is ${status}.`,
		};
	}

	const lifecycle = readString(rawIntent, 'lifecycle');
	if (lifecycle !== 'oneshot') {
		return {
			intent: intentName,
			status: 'skipped',
			reason: 'lifecycle_not_oneshot',
			detail: `Intent lifecycle is ${lifecycle ?? 'unknown'}.`,
		};
	}

	const runPolicy = readString(rawIntent, 'run_policy');
	if (runPolicy !== 'agent_allowed') {
		return {
			intent: intentName,
			status: 'skipped',
			reason: 'run_policy_not_agent_allowed',
			detail: `Intent run_policy is ${runPolicy ?? 'unknown'}.`,
		};
	}

	if (rawIntent.stdin !== 'closed') {
		return {
			intent: intentName,
			status: 'skipped',
			reason: 'stdin_not_closed',
			detail: 'Intent stdin is not closed.',
		};
	}

	if (!Number.isInteger(rawIntent.timeout_seconds) || Number(rawIntent.timeout_seconds) <= 0) {
		return {
			intent: intentName,
			status: 'skipped',
			reason: 'missing_timeout',
			detail: 'Intent timeout_seconds is missing or invalid.',
		};
	}

	if (!hasCommandSource(rawIntent)) {
		return {
			intent: intentName,
			status: 'skipped',
			reason: 'missing_command_source',
			detail: 'Intent does not define argv or shell cmd.',
		};
	}

	return {
		intent: intentName,
		status: 'runnable',
		reason: null,
		detail: null,
	};
}

export function createVerificationPlan(contract: CommandContract, reason: string): VerificationPlan {
	const candidates = Object.entries(contract.intents)
		.filter(([, intent]) => isRecord(intent) && hasRequiredAfter(intent, reason))
		.map(([intentName, intent]) => classifyCandidate(intentName, intent))
		.sort((left, right) => left.intent.localeCompare(right.intent));

	return {
		reason,
		candidates:
			candidates.length > 0
				? candidates
				: [
						{
							intent: '',
							status: 'skipped',
							reason: 'no_matching_intents',
							detail: `No command intents declare required_after = "${reason}".`,
						},
					],
	};
}
