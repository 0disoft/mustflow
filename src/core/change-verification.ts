import type {
	ChangeClassification,
	ChangeClassificationReport,
	ChangeClassificationSummary,
	ChangeSource,
	PublicSurfaceUpdatePolicy,
} from './change-classification.js';
import { isRecord, readStringArray, type CommandContract } from './config-loading.js';
import {
	CHANGE_CLASSIFICATION_SURFACE_AUTHORITY,
	createPathTarget,
	type SurfaceDecision,
	type SurfaceReason,
} from './surface-decision-model.js';
import {
	classifyVerificationCandidate,
	createVerificationPlan,
	type VerificationCandidate,
	type VerificationRunnableStatus,
	type VerificationSkipReason,
} from './verification-plan.js';
import {
	createVerificationDecisionGraph,
	type VerificationDecisionGraph,
} from './verification-decision-graph.js';
import {
	createVerificationSchedule,
	type VerificationSchedule,
} from './verification-scheduler.js';
import {
	createProjectTestSelectionPlan,
	type TestSelectionReport,
} from './test-selection.js';

export const CHANGE_VERIFICATION_SCHEMA_VERSION = '1';

export type VerificationReason = SurfaceReason;

export interface VerificationRequirement {
	readonly reason: VerificationReason;
	readonly files: readonly string[];
	readonly surfaces: readonly string[];
	readonly affectedContracts: readonly string[];
	readonly driftChecks: readonly string[];
	readonly updatePolicies: readonly PublicSurfaceUpdatePolicy[];
	readonly source: 'change_classification';
}

export type VerificationCandidateState = 'candidate' | 'gap';
export type VerificationEligibilityState = 'eligible' | 'ineligible' | 'missing';
export type VerificationSelectionState = 'selected' | 'not_selected' | 'not_applicable';

export interface ChangeVerificationCandidate {
	readonly reason: VerificationReason;
	readonly intent: string | null;
	readonly status: VerificationRunnableStatus;
	readonly skipReason: VerificationSkipReason | null;
	readonly detail: string | null;
	readonly candidateState: VerificationCandidateState;
	readonly eligibilityState: VerificationEligibilityState;
	readonly selectionState: VerificationSelectionState;
}

export interface ChangeVerificationGap {
	readonly reason: VerificationReason;
	readonly files: readonly string[];
	readonly surfaces: readonly string[];
	readonly detail: string;
}

export interface ChangeVerificationReport {
	readonly schema_version: typeof CHANGE_VERIFICATION_SCHEMA_VERSION;
	readonly source: ChangeSource;
	readonly files: readonly string[];
	readonly classification_summary: ChangeClassificationSummary;
	readonly requirements: readonly VerificationRequirement[];
	readonly candidates: readonly ChangeVerificationCandidate[];
	readonly gaps: readonly ChangeVerificationGap[];
	readonly schedule: VerificationSchedule;
	readonly decision_graph: VerificationDecisionGraph;
	readonly test_selection: TestSelectionReport;
}

function uniqueSorted(values: Iterable<string>): string[] {
	return [...new Set(values)].sort((left, right) => left.localeCompare(right));
}

function uniqueUpdatePolicies(values: Iterable<PublicSurfaceUpdatePolicy>): PublicSurfaceUpdatePolicy[] {
	return uniqueSorted([...values].filter((value) => value !== 'not_applicable')) as PublicSurfaceUpdatePolicy[];
}

const DECLARED_ESCALATION_SIGNALS = [
	'public_api',
	'release',
	'package',
	'packaging',
	'security',
	'selector',
	'command contract',
	'classifier',
	'classification',
	'verification planner',
	'verification planning',
	'machine-readable output contract',
	'JSON schema',
] as const;

function classificationsForReason(
	classificationReport: ChangeClassificationReport,
	reason: VerificationReason,
): ChangeClassification[] {
	return classificationReport.classifications.filter((classification) =>
		classification.surface.validationReasons.includes(reason),
	);
}

function toSurfaceDecision(classification: ChangeClassification): SurfaceDecision {
	return {
		target: createPathTarget(classification.path),
		changeKinds: classification.changeKinds,
		surface: {
			kind: classification.surface.kind,
			category: classification.surface.category,
			isPublicSurface: classification.surface.isPublicSurface,
		},
		reasons: classification.surface.validationReasons,
		affectedContracts: classification.surface.affectedContracts,
		driftChecks: classification.surface.driftChecks,
		authority: CHANGE_CLASSIFICATION_SURFACE_AUTHORITY,
	};
}

function createVerificationRequirement(
	classificationReport: ChangeClassificationReport,
	reason: VerificationReason,
): VerificationRequirement {
	const classifications = classificationsForReason(classificationReport, reason);
	const decisions = classifications.map(toSurfaceDecision);

	return {
		reason,
		files: uniqueSorted(
			decisions.flatMap((decision) => (decision.target.kind === 'path' ? [decision.target.path] : [])),
		),
		surfaces: uniqueSorted(decisions.flatMap((decision) => (decision.surface ? [decision.surface.kind] : []))),
		affectedContracts: uniqueSorted(decisions.flatMap((decision) => decision.affectedContracts ?? [])),
		driftChecks: uniqueSorted(decisions.flatMap((decision) => decision.driftChecks ?? [])),
		updatePolicies: uniqueUpdatePolicies(classifications.map((classification) => classification.surface.updatePolicy)),
		source: 'change_classification',
	};
}

function candidateKey(reason: VerificationReason, intent: string): string {
	return `${reason}\0${intent}`;
}

function readIntentRelationList(commandContract: CommandContract, intent: string, key: string): readonly string[] {
	const rawIntent = commandContract.intents[intent];

	if (!isRecord(rawIntent) || !isRecord(rawIntent.relations)) {
		return [];
	}

	return readStringArray(rawIntent.relations, key) ?? [];
}

function readIntentSelectionList(commandContract: CommandContract, intent: string, key: string): readonly string[] {
	const rawIntent = commandContract.intents[intent];

	if (!isRecord(rawIntent) || !isRecord(rawIntent.selection)) {
		return [];
	}

	return readStringArray(rawIntent.selection, key) ?? [];
}

function readIntentCostExpectedSeconds(commandContract: CommandContract, intent: string): number | null {
	const rawIntent = commandContract.intents[intent];

	if (!isRecord(rawIntent) || !isRecord(rawIntent.cost)) {
		return null;
	}

	const expectedSeconds = rawIntent.cost.expected_seconds;
	return Number.isInteger(expectedSeconds) && Number(expectedSeconds) >= 0 ? Number(expectedSeconds) : null;
}

function intentCoverageSignature(commandContract: CommandContract, intent: string): string | null {
	const rawIntent = commandContract.intents[intent];

	if (!isRecord(rawIntent) || !isRecord(rawIntent.covers)) {
		return null;
	}

	const signature = {
		contracts: uniqueSorted(readStringArray(rawIntent.covers, 'contracts') ?? []),
		paths: uniqueSorted(readStringArray(rawIntent.covers, 'paths') ?? []),
		reasons: uniqueSorted(readStringArray(rawIntent.covers, 'reasons') ?? []),
		surfaces: uniqueSorted(readStringArray(rawIntent.covers, 'surfaces') ?? []),
	};

	if (
		signature.contracts.length === 0 &&
		signature.paths.length === 0 &&
		signature.reasons.length === 0 &&
		signature.surfaces.length === 0
	) {
		return null;
	}

	return JSON.stringify(signature);
}

function fallbackIntentsForCandidate(commandContract: CommandContract, candidate: VerificationCandidate): readonly string[] {
	if (candidate.intent.length === 0 || candidate.status === 'runnable') {
		return [];
	}

	return uniqueSorted([
		...readIntentSelectionList(commandContract, candidate.intent, 'fallback_intents'),
		...readIntentSelectionList(commandContract, candidate.intent, 'escalate_to'),
		...readIntentRelationList(commandContract, candidate.intent, 'escalate_to'),
	]);
}

function escalationIntentsForCandidate(commandContract: CommandContract, candidate: VerificationCandidate): readonly string[] {
	if (candidate.intent.length === 0) {
		return [];
	}

	return uniqueSorted([
		...readIntentSelectionList(commandContract, candidate.intent, 'escalate_to'),
		...readIntentRelationList(commandContract, candidate.intent, 'escalate_to'),
	]);
}

function expandCandidatesWithDeclaredFallbacks(
	commandContract: CommandContract,
	projectRoot: string,
	candidates: readonly VerificationCandidate[],
): readonly VerificationCandidate[] {
	const hasRunnableCandidate = candidates.some(
		(candidate) => candidate.status === 'runnable' && candidate.intent.length > 0,
	);

	if (hasRunnableCandidate) {
		return candidates;
	}

	const existingIntents = new Set(candidates.map((candidate) => candidate.intent).filter((intent) => intent.length > 0));
	const fallbackIntents = uniqueSorted(candidates.flatMap((candidate) => fallbackIntentsForCandidate(commandContract, candidate))).filter(
		(intent) => !existingIntents.has(intent),
	);

	if (fallbackIntents.length === 0) {
		return candidates;
	}

	return [
		...candidates,
		...fallbackIntents.map((intent) => {
			const fallback = classifyVerificationCandidate(intent, commandContract.intents[intent], {
				commandContract,
				projectRoot,
			});

			return {
				...fallback,
				detail: fallback.status === 'runnable' ? 'Declared fallback for unavailable verification intent.' : fallback.detail,
			};
		}),
	];
}

function requirementNeedsDeclaredEscalation(requirement: VerificationRequirement): boolean {
	if (requirement.surfaces.length > 1) {
		return true;
	}

	const signalText = [
		requirement.reason,
		...requirement.affectedContracts,
		...requirement.driftChecks,
		...requirement.surfaces,
	].join('\n').toLowerCase();

	return DECLARED_ESCALATION_SIGNALS.some((signal) => signalText.includes(signal.toLowerCase()));
}

function expandCandidatesWithDeclaredEscalations(
	commandContract: CommandContract,
	projectRoot: string,
	requirement: VerificationRequirement,
	candidates: readonly VerificationCandidate[],
): readonly VerificationCandidate[] {
	if (!requirementNeedsDeclaredEscalation(requirement)) {
		return candidates;
	}

	const existingIntents = new Set(candidates.map((candidate) => candidate.intent).filter((intent) => intent.length > 0));
	const escalationIntents = uniqueSorted(
		candidates.flatMap((candidate) => escalationIntentsForCandidate(commandContract, candidate)),
	).filter((intent) => !existingIntents.has(intent));

	if (escalationIntents.length === 0) {
		return candidates;
	}

	return [
		...candidates,
		...escalationIntents.map((intent) => {
			const escalation = classifyVerificationCandidate(intent, commandContract.intents[intent], {
				commandContract,
				projectRoot,
			});

			return {
				...escalation,
				detail:
					escalation.status === 'runnable'
						? 'Declared escalation for a high-risk verification requirement.'
						: escalation.detail,
			};
		}),
	];
}

function intentExplicitlySubsumes(commandContract: CommandContract, broaderIntent: string, narrowerIntent: string): boolean {
	return readIntentRelationList(commandContract, broaderIntent, 'subsumes').includes(narrowerIntent);
}

function intentExplicitlySubsumedBy(commandContract: CommandContract, narrowerIntent: string, broaderIntent: string): boolean {
	return readIntentRelationList(commandContract, narrowerIntent, 'subsumed_by').includes(broaderIntent);
}

function intentRequiresCompanion(commandContract: CommandContract, intent: string): boolean {
	return readIntentRelationList(commandContract, intent, 'requires_with').length > 0;
}

function intentIsExplicitlySubsumed(
	commandContract: CommandContract,
	narrowerIntent: string,
	broaderIntent: string,
): boolean {
	return (
		intentExplicitlySubsumedBy(commandContract, narrowerIntent, broaderIntent) ||
		intentExplicitlySubsumes(commandContract, broaderIntent, narrowerIntent)
	);
}

function minNumber(values: readonly number[]): number | null {
	let minimum: number | null = null;
	for (const value of values) {
		minimum = minimum === null ? value : Math.min(minimum, value);
	}

	return minimum;
}

function selectVerificationCandidates(
	commandContract: CommandContract,
	candidates: readonly VerificationCandidate[],
): readonly VerificationCandidate[] {
	const runnableCandidates = candidates.filter(
		(candidate) => candidate.status === 'runnable' && candidate.intent.length > 0,
	);
	const selectedIntents = new Set(runnableCandidates.map((candidate) => candidate.intent));

	for (const candidate of runnableCandidates) {
		const isSubsumed = runnableCandidates.some((other) => {
			if (other.intent === candidate.intent) {
				return false;
			}

			return (
				intentIsExplicitlySubsumed(commandContract, candidate.intent, other.intent) &&
				!intentIsExplicitlySubsumed(commandContract, other.intent, candidate.intent)
			);
		});

		if (isSubsumed) {
			selectedIntents.delete(candidate.intent);
		}
	}

	const costComparableCandidates = runnableCandidates.filter(
		(candidate) =>
			selectedIntents.has(candidate.intent) &&
			!intentRequiresCompanion(commandContract, candidate.intent) &&
			intentCoverageSignature(commandContract, candidate.intent) !== null &&
			readIntentCostExpectedSeconds(commandContract, candidate.intent) !== null,
	);
	const costComparableGroups = new Map<string, VerificationCandidate[]>();

	for (const candidate of costComparableCandidates) {
		const signature = intentCoverageSignature(commandContract, candidate.intent);
		if (signature === null) {
			continue;
		}

		costComparableGroups.set(signature, [...(costComparableGroups.get(signature) ?? []), candidate]);
	}

	for (const group of costComparableGroups.values()) {
		if (group.length < 2) {
			continue;
		}

		const costs = group.map((candidate) => readIntentCostExpectedSeconds(commandContract, candidate.intent));
		if (costs.some((cost) => cost === null)) {
			continue;
		}

		const minCost = minNumber(costs as number[]);
		if (minCost === null) {
			continue;
		}

		const winners = group.filter((candidate) => readIntentCostExpectedSeconds(commandContract, candidate.intent) === minCost);
		if (winners.length !== 1) {
			continue;
		}

		for (const candidate of group) {
			if (candidate.intent !== winners[0]?.intent) {
				selectedIntents.delete(candidate.intent);
			}
		}
	}

	if (selectedIntents.size === 0 && runnableCandidates.length > 0) {
		return runnableCandidates;
	}

	return runnableCandidates.filter((candidate) => selectedIntents.has(candidate.intent));
}

function uniqueVerificationCandidates(candidates: readonly VerificationCandidate[]): readonly VerificationCandidate[] {
	const byIntent = new Map<string, VerificationCandidate>();

	for (const candidate of candidates) {
		if (candidate.intent.length === 0 || byIntent.has(candidate.intent)) {
			continue;
		}

		byIntent.set(candidate.intent, candidate);
	}

	return [...byIntent.values()].sort((left, right) => left.intent.localeCompare(right.intent));
}

function toChangeVerificationCandidate(
	reason: VerificationReason,
	candidate: VerificationCandidate,
	selectedCandidateKeys: ReadonlySet<string>,
): ChangeVerificationCandidate {
	const hasIntent = candidate.intent.length > 0;
	const isMissingIntent = !hasIntent || candidate.reason === 'no_matching_intents';
	const isEligible = hasIntent && candidate.status === 'runnable';

	return {
		reason,
		intent: candidate.intent.length > 0 ? candidate.intent : null,
		status: candidate.status,
		skipReason: candidate.reason,
		detail: candidate.detail,
		candidateState: isMissingIntent ? 'gap' : 'candidate',
		eligibilityState: isMissingIntent ? 'missing' : isEligible ? 'eligible' : 'ineligible',
		selectionState: isEligible
			? selectedCandidateKeys.has(candidateKey(reason, candidate.intent))
				? 'selected'
				: 'not_selected'
			: 'not_applicable',
	};
}

function gapForRequirement(
	requirement: VerificationRequirement,
	candidates: readonly ChangeVerificationCandidate[],
): ChangeVerificationGap | null {
	const hasRunnableCandidate = candidates.some(
		(candidate) => candidate.reason === requirement.reason && candidate.status === 'runnable',
	);

	if (hasRunnableCandidate) {
		return null;
	}

	return {
		reason: requirement.reason,
		files: requirement.files,
		surfaces: requirement.surfaces,
		detail: `No runnable command intents cover required_after = "${requirement.reason}".`,
	};
}

export function createChangeVerificationReport(
	classificationReport: ChangeClassificationReport,
	commandContract: CommandContract,
	projectRoot: string,
): ChangeVerificationReport {
	const testSelectionPlan = createProjectTestSelectionPlan(projectRoot, classificationReport, commandContract);
	const requirements = classificationReport.summary.validationReasons.map((reason) =>
		createVerificationRequirement(classificationReport, reason),
	);
	const plans = requirements.map((requirement) => ({
		requirement,
		candidates: expandCandidatesWithDeclaredEscalations(
			commandContract,
			projectRoot,
			requirement,
			expandCandidatesWithDeclaredFallbacks(
				commandContract,
				projectRoot,
				createVerificationPlan(commandContract, requirement.reason, projectRoot).candidates,
			),
		),
	}));
	const plansWithProjectTestSelection = plans.map((plan) => {
		const additionalCandidates = testSelectionPlan.candidates
			.filter((candidate) => candidate.reason === plan.requirement.reason)
			.filter((candidate) => !plan.candidates.some((existing) => existing.intent === candidate.candidate.intent))
			.map((candidate) => candidate.candidate);

		return additionalCandidates.length > 0
			? { ...plan, candidates: [...plan.candidates, ...additionalCandidates] }
			: plan;
	});
	const selectedPlans = plansWithProjectTestSelection.map((plan) => ({
		...plan,
		selectedCandidates: uniqueVerificationCandidates([
			...selectVerificationCandidates(commandContract, plan.candidates),
			...testSelectionPlan.selectedCandidates
				.filter((candidate) => candidate.reason === plan.requirement.reason)
				.map((candidate) => candidate.candidate),
		]),
	}));
	const selectedCandidatePlans = selectedPlans.flatMap((plan) => plan.selectedCandidates);
	const selectedCandidateKeys = new Set(
		selectedPlans.flatMap((plan) =>
			plan.selectedCandidates.map((candidate) => candidateKey(plan.requirement.reason, candidate.intent)),
		),
	);
	const schedule = createVerificationSchedule(projectRoot, commandContract, selectedCandidatePlans);
	const candidates = plansWithProjectTestSelection.flatMap((plan) =>
		plan.candidates.map((candidate) => toChangeVerificationCandidate(plan.requirement.reason, candidate, selectedCandidateKeys)),
	);
	const gaps = requirements
		.map((requirement) => gapForRequirement(requirement, candidates))
		.filter((gap): gap is ChangeVerificationGap => gap !== null);

	return {
		schema_version: CHANGE_VERIFICATION_SCHEMA_VERSION,
		source: classificationReport.source,
		files: classificationReport.files,
		classification_summary: classificationReport.summary,
		requirements,
		candidates,
		gaps,
		schedule,
		decision_graph: createVerificationDecisionGraph(commandContract, requirements, candidates, gaps, schedule),
		test_selection: testSelectionPlan.report,
	};
}
