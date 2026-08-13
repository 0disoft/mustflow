import { isRecord, type CommandContract } from './config-loading.js';
import type { VerificationCandidate } from './verification-plan.js';

export const VERIFICATION_PROFILES = ['edit', 'commit', 'release'] as const;
export type VerificationProfile = (typeof VERIFICATION_PROFILES)[number];

export interface VerificationProfilePolicy {
	readonly profile: VerificationProfile;
	readonly budgetSeconds: number | null;
	readonly description: string;
}

const FULL_VERIFICATION_REASONS = new Set([
	'security_change', 'privacy_change', 'data_change', 'migration_change',
	'package_metadata_change', 'packaging_change', 'release_risk', 'before_publish',
]);

export function resolveVerificationProfile(profile: VerificationProfile): VerificationProfilePolicy {
	if (profile === 'edit') return { profile, budgetSeconds: 15, description: 'Fast feedback with the smallest sufficient configured checks.' };
	if (profile === 'commit') return { profile, budgetSeconds: 60, description: 'Commit confidence with bounded related checks.' };
	return { profile, budgetSeconds: null, description: 'Full applicable release and high-risk verification.' };
}

function expectedSeconds(contract: CommandContract, intent: string): number | null {
	const rawIntent = contract.intents[intent];
	if (!isRecord(rawIntent) || !isRecord(rawIntent.cost)) return null;
	const value = rawIntent.cost.expected_seconds;
	return Number.isInteger(value) && Number(value) >= 0 ? Number(value) : null;
}

export function applyVerificationProfile(
	contract: CommandContract,
	reason: string,
	candidates: readonly VerificationCandidate[],
	profile: VerificationProfile,
): readonly VerificationCandidate[] {
	const runnable = candidates.filter((candidate) => candidate.status === 'runnable' && candidate.intent.length > 0);
	if (profile === 'release' || FULL_VERIFICATION_REASONS.has(reason) || runnable.length < 2) return candidates;

	const budget = resolveVerificationProfile(profile).budgetSeconds as number;
	const withinBudget = runnable.filter((candidate) => {
		const cost = expectedSeconds(contract, candidate.intent);
		return cost !== null && cost <= budget;
	});
	const chosen = withinBudget.length > 0
		? withinBudget
		: runnable
			.map((candidate) => ({ candidate, cost: expectedSeconds(contract, candidate.intent) }))
			.filter((entry): entry is { candidate: VerificationCandidate; cost: number } => entry.cost !== null)
			.sort((left, right) => left.cost - right.cost || left.candidate.intent.localeCompare(right.candidate.intent))
			.slice(0, 1)
			.map((entry) => entry.candidate);
	if (chosen.length === 0) return candidates;

	const selected = new Set(chosen.map((candidate) => candidate.intent));
	return candidates.filter((candidate) => candidate.status !== 'runnable' || selected.has(candidate.intent));
}
