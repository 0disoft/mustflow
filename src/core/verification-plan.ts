import {
	isRecord,
	readStringArray,
	type CommandContract,
} from './config-loading.js';
import {
	getCommandRunStaticBlocker,
	type CommandRunStaticBlocker,
} from './command-run-constraints.js';
import {
	COMMAND_INTENT_INELIGIBILITY_CODES,
	evaluateCommandIntentEligibility,
	type CommandIntentIneligibilityCode,
} from './command-intent-eligibility.js';

export type VerificationRunnableStatus = 'runnable' | 'skipped';

export type VerificationSkipReason =
	| 'no_matching_intents'
	| CommandIntentIneligibilityCode
	| 'cwd_outside_project'
	| 'max_output_bytes_exceeds_limit';

export const VERIFICATION_SKIP_REASONS = [
	'no_matching_intents',
	...COMMAND_INTENT_INELIGIBILITY_CODES,
	'cwd_outside_project',
	'max_output_bytes_exceeds_limit',
] as const satisfies readonly VerificationSkipReason[];

type VerificationSkipReasonContractComplete =
	Exclude<VerificationSkipReason, (typeof VERIFICATION_SKIP_REASONS)[number]> extends never ? true : never;

export const verificationSkipReasonContractComplete: VerificationSkipReasonContractComplete = true;

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

interface VerificationCandidateContext {
	readonly commandContract?: CommandContract;
	readonly projectRoot?: string;
}

function hasRequiredAfter(intent: Record<string, unknown>, reason: string): boolean {
	return (readStringArray(intent, 'required_after') ?? []).includes(reason);
}

function getRunPlanBlocker(rawIntent: Record<string, unknown>, context: VerificationCandidateContext): CommandRunStaticBlocker | null {
	if (!context.projectRoot || !context.commandContract) {
		return null;
	}

	return getCommandRunStaticBlocker(context.projectRoot, context.commandContract, rawIntent);
}

export function classifyVerificationCandidate(
	intentName: string,
	rawIntent: unknown,
	context: VerificationCandidateContext = {},
): VerificationCandidate {
	const eligibility = evaluateCommandIntentEligibility(intentName, rawIntent);

	if (!eligibility.ok) {
		return {
			intent: intentName,
			status: 'skipped',
			reason: eligibility.code,
			detail: eligibility.detail,
		};
	}

	if (isRecord(rawIntent)) {
		const blocker = getRunPlanBlocker(rawIntent, context);
		if (blocker) {
			return {
				intent: intentName,
				status: 'skipped',
				reason: blocker.reason,
				detail: blocker.detail,
			};
		}
	}

	return {
		intent: intentName,
		status: 'runnable',
		reason: null,
		detail: null,
	};
}

export function createVerificationPlan(contract: CommandContract, reason: string, projectRoot?: string): VerificationPlan {
	const candidates = Object.entries(contract.intents)
		.filter(([, intent]) => isRecord(intent) && hasRequiredAfter(intent, reason))
		.map(([intentName, intent]) => classifyVerificationCandidate(intentName, intent, {
			commandContract: contract,
			projectRoot,
		}))
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
