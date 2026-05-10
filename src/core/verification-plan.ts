import {
	isRecord,
	readStringArray,
	type CommandContract,
	type TomlTable,
} from './config-loading.js';
import {
	evaluateCommandIntentEligibility,
	type CommandIntentEligibilityCode,
} from './command-intent-eligibility.js';

export type VerificationRunnableStatus = 'runnable' | 'skipped';

export type VerificationSkipReason =
	| 'no_matching_intents'
	| Exclude<CommandIntentEligibilityCode, 'ok'>;

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

export function classifyVerificationCandidate(intentName: string, rawIntent: unknown): VerificationCandidate {
	const eligibility = evaluateCommandIntentEligibility(intentName, rawIntent);

	if (!eligibility.ok) {
		return {
			intent: intentName,
			status: 'skipped',
			reason: eligibility.code,
			detail: eligibility.detail,
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
		.map(([intentName, intent]) => classifyVerificationCandidate(intentName, intent))
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
