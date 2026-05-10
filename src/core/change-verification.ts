import type {
	ChangeClassification,
	ChangeClassificationReport,
	ChangeClassificationSummary,
	ChangeSource,
	PublicSurfaceUpdatePolicy,
} from './change-classification.js';
import type { CommandContract } from './config-loading.js';
import {
	createVerificationPlan,
	type VerificationCandidate,
	type VerificationRunnableStatus,
	type VerificationSkipReason,
} from './verification-plan.js';

export const CHANGE_VERIFICATION_SCHEMA_VERSION = '1';

export type VerificationReason = string;

export interface VerificationRequirement {
	readonly reason: VerificationReason;
	readonly files: readonly string[];
	readonly surfaces: readonly string[];
	readonly affectedContracts: readonly string[];
	readonly driftChecks: readonly string[];
	readonly updatePolicies: readonly PublicSurfaceUpdatePolicy[];
	readonly source: 'change_classification';
}

export interface ChangeVerificationCandidate {
	readonly reason: VerificationReason;
	readonly intent: string | null;
	readonly status: VerificationRunnableStatus;
	readonly skipReason: VerificationSkipReason | null;
	readonly detail: string | null;
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
}

function uniqueSorted(values: Iterable<string>): string[] {
	return [...new Set(values)].sort((left, right) => left.localeCompare(right));
}

function uniqueUpdatePolicies(values: Iterable<PublicSurfaceUpdatePolicy>): PublicSurfaceUpdatePolicy[] {
	return uniqueSorted([...values].filter((value) => value !== 'not_applicable')) as PublicSurfaceUpdatePolicy[];
}

function classificationsForReason(
	classificationReport: ChangeClassificationReport,
	reason: VerificationReason,
): ChangeClassification[] {
	return classificationReport.classifications.filter((classification) =>
		classification.surface.validationReasons.includes(reason),
	);
}

function createVerificationRequirement(
	classificationReport: ChangeClassificationReport,
	reason: VerificationReason,
): VerificationRequirement {
	const classifications = classificationsForReason(classificationReport, reason);

	return {
		reason,
		files: uniqueSorted(classifications.map((classification) => classification.path)),
		surfaces: uniqueSorted(classifications.map((classification) => classification.surface.kind)),
		affectedContracts: uniqueSorted(
			classifications.flatMap((classification) => classification.surface.affectedContracts),
		),
		driftChecks: uniqueSorted(classifications.flatMap((classification) => classification.surface.driftChecks)),
		updatePolicies: uniqueUpdatePolicies(classifications.map((classification) => classification.surface.updatePolicy)),
		source: 'change_classification',
	};
}

function toChangeVerificationCandidate(
	reason: VerificationReason,
	candidate: VerificationCandidate,
): ChangeVerificationCandidate {
	return {
		reason,
		intent: candidate.intent.length > 0 ? candidate.intent : null,
		status: candidate.status,
		skipReason: candidate.reason,
		detail: candidate.detail,
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
): ChangeVerificationReport {
	const requirements = classificationReport.summary.validationReasons.map((reason) =>
		createVerificationRequirement(classificationReport, reason),
	);
	const candidates = requirements.flatMap((requirement) =>
		createVerificationPlan(commandContract, requirement.reason).candidates.map((candidate) =>
			toChangeVerificationCandidate(requirement.reason, candidate),
		),
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
	};
}
