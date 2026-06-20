import type { ChangeVerificationReport } from './change-verification.js';
import { createConflictLedger, type ConflictLedger } from './conflict-ledger.js';
import type { CompletionVerdict, CompletionVerdictStatus } from './completion-verdict.js';
import type { ExternalEvidenceCheck, ExternalEvidenceRisk } from './external-evidence.js';
import type { FailureReplayCapsule } from './failure-replay-capsule.js';
import type { RepeatedFailureRisk } from './repeated-failure.js';
import type { ReproEvidenceReport, ReproEvidenceRisk } from './repro-evidence.js';
import type { VerificationRiskAssessment } from './risk-priced-evidence.js';
import type { ScopeDiffRisk } from './scope-risk.js';
import type { ValidationRatchetRisk } from './validation-ratchet.js';

export interface VerificationEvidenceRunResult {
	readonly intent: string | null;
	readonly status: string;
	readonly skipped: boolean;
	readonly reason: string | null;
	readonly detail: string | null;
	readonly verification_plan_id: string | null;
	readonly receipt_path: string | null;
	readonly receipt_sha256: string | null;
}

export interface VerificationEvidenceRemainingRisk {
	readonly code: string;
	readonly severity: string;
	readonly detail: string;
}

export interface VerificationSourceAnchorRisk {
	readonly anchorId: string;
	readonly path: string;
	readonly lineStart: number;
	readonly status: 'changed' | 'review' | 'stale';
	readonly riskTags: readonly string[];
	readonly invariant: string | null;
}

export interface VerificationEvidenceRequirement {
	readonly reason: string;
	readonly files: readonly string[];
	readonly surfaces: readonly string[];
	readonly candidate_intents: readonly string[];
	readonly selected_intents: readonly string[];
	readonly skipped_intents: readonly string[];
	readonly gap_count: number;
	readonly outcome: CompletionVerdictStatus;
}

export interface VerificationEvidenceReceipt {
	readonly intent: string | null;
	readonly status: string;
	readonly skipped: boolean;
	readonly verification_plan_id: string | null;
	readonly receipt_path: string | null;
	readonly receipt_sha256: string | null;
}

export interface VerificationEvidenceSkippedCheck {
	readonly intent: string | null;
	readonly reason: string | null;
	readonly detail: string | null;
}

export interface VerificationEvidenceGap {
	readonly reason: string | null;
	readonly intent: string | null;
	readonly status: string | null;
	readonly detail: string | null;
	readonly files: readonly string[];
	readonly surfaces: readonly string[];
}

export interface VerificationEvidenceExplanation {
	readonly verified_by: readonly string[];
	readonly downgraded_by: readonly string[];
	readonly blocked_by: readonly string[];
	readonly contradicted_by: readonly string[];
}

export type VerificationCoverageStatus = 'covered' | 'partially_covered' | 'uncovered' | 'blocked' | 'contradicted';

export interface VerificationCoverageEvidenceLinks {
	readonly intents: readonly string[];
	readonly receipt_paths: readonly string[];
	readonly gap_reasons: readonly string[];
	readonly source_anchor_ids: readonly string[];
}

export interface VerificationCoverageCriterion {
	readonly criterion_id: string;
	readonly source: 'verification_requirement' | 'dashboard_snapshot';
	readonly statement: string;
	readonly status: VerificationCoverageStatus;
	readonly requirement_reason: string | null;
	readonly evidence: VerificationCoverageEvidenceLinks;
}

export interface VerificationEvidenceModel {
	readonly schema_version: '1';
	readonly source: 'mf_verify' | 'dashboard_export';
	readonly verification_plan_id: string | null;
	readonly requirements: readonly VerificationEvidenceRequirement[];
	readonly coverage_matrix: readonly VerificationCoverageCriterion[];
	readonly receipts: readonly VerificationEvidenceReceipt[];
	readonly skipped_checks: readonly VerificationEvidenceSkippedCheck[];
	readonly gaps: readonly VerificationEvidenceGap[];
	readonly risk_assessment?: VerificationRiskAssessment;
	readonly failure_replay_capsule?: FailureReplayCapsule;
	readonly remaining_risks: readonly VerificationEvidenceRemainingRisk[];
	readonly conflict_ledger: ConflictLedger;
	readonly repro_evidence?: ReproEvidenceReport;
	readonly external_checks?: readonly ExternalEvidenceCheck[];
	readonly explanation: VerificationEvidenceExplanation;
}

export interface CreateVerifyEvidenceModelInput {
	readonly report: ChangeVerificationReport;
	readonly results: readonly VerificationEvidenceRunResult[];
	readonly verificationPlanId: string;
	readonly verdict: CompletionVerdict;
	readonly sourceAnchorRisks?: readonly VerificationSourceAnchorRisk[];
	readonly scopeDiffRisks?: readonly ScopeDiffRisk[];
	readonly repeatedFailureRisks?: readonly RepeatedFailureRisk[];
	readonly validationRatchetRisks?: readonly ValidationRatchetRisk[];
	readonly reproEvidence?: ReproEvidenceReport | null;
	readonly reproEvidenceRisks?: readonly ReproEvidenceRisk[];
	readonly externalChecks?: readonly ExternalEvidenceCheck[];
	readonly externalEvidenceRisks?: readonly ExternalEvidenceRisk[];
	readonly failureReplayCapsule?: FailureReplayCapsule | null;
}

export interface CreateDashboardEvidenceModelInput {
	readonly changedSurfaces: readonly string[];
	readonly runnableIntents: readonly string[];
	readonly skippedChecks: readonly VerificationEvidenceSkippedCheck[];
	readonly gaps: readonly VerificationEvidenceGap[];
	readonly latestReceipt: VerificationEvidenceReceipt | null;
	readonly remainingRisks: readonly VerificationEvidenceRemainingRisk[];
	readonly verdict: CompletionVerdict;
	readonly sourceAnchorRisks?: readonly VerificationSourceAnchorRisk[];
	readonly scopeDiffRisks?: readonly ScopeDiffRisk[];
}

function uniqueSorted(values: Iterable<string | null | undefined>): string[] {
	return [...new Set([...values].filter((value): value is string => typeof value === 'string' && value.length > 0))].sort(
		(left, right) => left.localeCompare(right),
	);
}

function receiptEntries(results: readonly VerificationEvidenceRunResult[]): VerificationEvidenceReceipt[] {
	return results
		.filter((result) => !result.skipped)
		.map((result) => ({
			intent: result.intent,
			status: result.status,
			skipped: false,
			verification_plan_id: result.verification_plan_id,
			receipt_path: result.receipt_path,
			receipt_sha256: result.receipt_sha256,
		}));
}

function skippedCheckEntries(results: readonly VerificationEvidenceRunResult[]): VerificationEvidenceSkippedCheck[] {
	return results
		.filter((result) => result.skipped)
		.map((result) => ({
			intent: result.intent,
			reason: result.reason,
			detail: result.detail,
		}));
}

function resultForIntent(
	results: readonly VerificationEvidenceRunResult[],
	intent: string,
): VerificationEvidenceRunResult | null {
	return results.find((result) => result.intent === intent && !result.skipped) ?? null;
}

function requirementOutcome(input: {
	readonly selectedIntents: readonly string[];
	readonly skippedIntents: readonly string[];
	readonly gapCount: number;
	readonly results: readonly VerificationEvidenceRunResult[];
}): CompletionVerdictStatus {
	if (input.selectedIntents.some((intent) => {
		const result = resultForIntent(input.results, intent);
		return (
			result?.status === 'failed' ||
			result?.status === 'timed_out' ||
			result?.status === 'start_failed' ||
			result?.status === 'output_limit_exceeded'
		);
	})) {
		return 'contradicted';
	}

	if (input.gapCount > 0 || (input.selectedIntents.length === 0 && input.skippedIntents.length > 0)) {
		return 'blocked';
	}

	if (input.selectedIntents.length === 0) {
		return 'unverified';
	}

	if (input.skippedIntents.length > 0) {
		return 'partially_verified';
	}

	return input.selectedIntents.every((intent) => resultForIntent(input.results, intent)?.status === 'passed')
		? 'verified'
		: 'unverified';
}

function explanationFromVerdict(verdict: CompletionVerdict): VerificationEvidenceExplanation {
	return {
		verified_by: verdict.status === 'verified' ? [verdict.primary_reason] : [],
		downgraded_by: verdict.status === 'partially_verified' || verdict.status === 'unverified' ? verdict.limitations : [],
		blocked_by: verdict.status === 'blocked' ? verdict.blockers : [],
		contradicted_by: verdict.status === 'contradicted' ? verdict.contradictions : [],
	};
}

function coverageStatusFromOutcome(outcome: CompletionVerdictStatus): VerificationCoverageStatus {
	if (outcome === 'verified') {
		return 'covered';
	}
	if (outcome === 'partially_verified') {
		return 'partially_covered';
	}
	if (outcome === 'unverified') {
		return 'uncovered';
	}
	return outcome;
}

function receiptPathsForIntents(
	receipts: readonly VerificationEvidenceReceipt[],
	intents: readonly string[],
): readonly string[] {
	const selected = new Set(intents);
	return uniqueSorted(
		receipts
			.filter((receipt) => receipt.intent !== null && selected.has(receipt.intent))
			.map((receipt) => receipt.receipt_path),
	);
}

function coverageMatrixFromRequirements(input: {
	readonly source: VerificationCoverageCriterion['source'];
	readonly requirements: readonly VerificationEvidenceRequirement[];
	readonly receipts: readonly VerificationEvidenceReceipt[];
	readonly gaps: readonly VerificationEvidenceGap[];
	readonly sourceAnchorRisks: readonly VerificationSourceAnchorRisk[];
}): VerificationCoverageCriterion[] {
	return input.requirements.map((requirement, index) => {
		const matchingGaps =
			input.source === 'dashboard_snapshot'
				? input.gaps
				: input.gaps.filter((gap) => gap.reason === requirement.reason);
		const matchingSourceAnchorRisks = input.sourceAnchorRisks.filter((risk) => requirement.files.includes(risk.path));
		const status = coverageStatusFromOutcome(requirement.outcome);

		return {
			criterion_id: `${input.source}:${index + 1}:${requirement.reason}`,
			source: input.source,
			statement: `Verification requirement: ${requirement.reason}`,
			status: matchingSourceAnchorRisks.length > 0 && status === 'covered' ? 'partially_covered' : status,
			requirement_reason: requirement.reason,
			evidence: {
				intents: uniqueSorted([...requirement.selected_intents, ...requirement.skipped_intents]),
				receipt_paths: receiptPathsForIntents(input.receipts, requirement.selected_intents),
				gap_reasons: uniqueSorted(matchingGaps.map((gap) => gap.detail)),
				source_anchor_ids: uniqueSorted(matchingSourceAnchorRisks.map((risk) => risk.anchorId)),
			},
		};
	});
}

function sourceAnchorRemainingRisks(
	sourceAnchorRisks: readonly VerificationSourceAnchorRisk[],
): VerificationEvidenceRemainingRisk[] {
	return sourceAnchorRisks.map((risk) => ({
		code: 'source_anchor_invariant_review_required',
		severity: 'high',
		detail: `${risk.anchorId} in ${risk.path}:${risk.lineStart} is ${risk.status}; review its invariant before marking the task verified.`,
	}));
}

function scopeDiffRemainingRisks(scopeDiffRisks: readonly ScopeDiffRisk[]): VerificationEvidenceRemainingRisk[] {
	return scopeDiffRisks.map((risk) => ({
		code: risk.code,
		severity: risk.severity,
		detail: risk.detail,
	}));
}

function repeatedFailureRemainingRisks(
	repeatedFailureRisks: readonly RepeatedFailureRisk[],
): VerificationEvidenceRemainingRisk[] {
	return repeatedFailureRisks.map((risk) => ({
		code: risk.code,
		severity: risk.severity,
		detail: risk.detail,
	}));
}

function validationRatchetRemainingRisks(
	validationRatchetRisks: readonly ValidationRatchetRisk[],
): VerificationEvidenceRemainingRisk[] {
	return validationRatchetRisks.map((risk) => ({
		code: risk.code,
		severity: risk.severity,
		detail: risk.detail,
	}));
}

function reproEvidenceRemainingRisks(reproEvidenceRisks: readonly ReproEvidenceRisk[]): VerificationEvidenceRemainingRisk[] {
	return reproEvidenceRisks.map((risk) => ({
		code: risk.code,
		severity: risk.severity,
		detail: risk.detail,
	}));
}

function externalEvidenceRemainingRisks(
	externalEvidenceRisks: readonly ExternalEvidenceRisk[],
): VerificationEvidenceRemainingRisk[] {
	return externalEvidenceRisks.map((risk) => ({
		code: risk.code,
		severity: risk.severity,
		detail: risk.detail,
	}));
}

function riskPricedEvidenceRemainingRisks(
	assessment: VerificationRiskAssessment | undefined,
): VerificationEvidenceRemainingRisk[] {
	if (!assessment?.manual_review_required) {
		return [];
	}

	return [
		{
			code: 'risk_priced_evidence_requires_review',
			severity: assessment.level,
			detail: `Verification risk is ${assessment.level}; required evidence: ${assessment.required_evidence.join(', ')}.`,
		},
	];
}

export function createVerifyEvidenceModel(input: CreateVerifyEvidenceModelInput): VerificationEvidenceModel {
	const requirements = input.report.requirements.map((requirement) => {
		const candidates = input.report.candidates.filter((candidate) => candidate.reason === requirement.reason);
		const selectedIntents = uniqueSorted(
			candidates
				.filter((candidate) => candidate.selectionState === 'selected')
				.map((candidate) => candidate.intent),
		);
		const skippedIntents = uniqueSorted(
			candidates
				.filter((candidate) => candidate.status !== 'runnable')
				.map((candidate) => candidate.intent),
		);
		const gapCount = input.report.gaps.filter((gap) => gap.reason === requirement.reason).length;

		return {
			reason: requirement.reason,
			files: [...requirement.files],
			surfaces: [...requirement.surfaces],
			candidate_intents: uniqueSorted(candidates.map((candidate) => candidate.intent)),
			selected_intents: selectedIntents,
			skipped_intents: skippedIntents,
			gap_count: gapCount,
			outcome: requirementOutcome({
				selectedIntents,
				skippedIntents,
				gapCount,
				results: input.results,
			}),
		};
	});
	const receipts = receiptEntries(input.results);
	const sourceAnchorRisks = input.sourceAnchorRisks ?? [];
	const scopeDiffRisks = input.scopeDiffRisks ?? [];
	const repeatedFailureRisks = input.repeatedFailureRisks ?? [];
	const validationRatchetRisks = input.validationRatchetRisks ?? [];
	const reproEvidence = input.reproEvidence ?? null;
	const reproEvidenceRisks = input.reproEvidenceRisks ?? [];
	const externalChecks = input.externalChecks ?? [];
	const externalEvidenceRisks = input.externalEvidenceRisks ?? [];
	const hasSpecificRemainingRisks =
		sourceAnchorRisks.length > 0 ||
		scopeDiffRisks.length > 0 ||
		repeatedFailureRisks.length > 0 ||
		validationRatchetRisks.length > 0 ||
		reproEvidenceRisks.length > 0 ||
		externalEvidenceRisks.length > 0;
	const gaps = input.report.gaps.map((gap) => ({
		reason: gap.reason,
		intent: null,
		status: 'missing',
		detail: gap.detail,
		files: [...gap.files],
		surfaces: [...gap.surfaces],
	}));
	const remainingRisks = [
		...sourceAnchorRemainingRisks(sourceAnchorRisks),
		...scopeDiffRemainingRisks(scopeDiffRisks),
		...repeatedFailureRemainingRisks(repeatedFailureRisks),
		...validationRatchetRemainingRisks(validationRatchetRisks),
		...reproEvidenceRemainingRisks(reproEvidenceRisks),
		...externalEvidenceRemainingRisks(externalEvidenceRisks),
		...(hasSpecificRemainingRisks ? [] : riskPricedEvidenceRemainingRisks(input.report.risk_assessment)),
	];

	return {
		schema_version: '1',
		source: 'mf_verify',
		verification_plan_id: input.verificationPlanId,
		requirements,
		coverage_matrix: coverageMatrixFromRequirements({
			source: 'verification_requirement',
			requirements,
			receipts,
			gaps,
			sourceAnchorRisks,
		}),
		receipts,
		skipped_checks: skippedCheckEntries(input.results),
		gaps,
		risk_assessment: input.report.risk_assessment,
		...(input.failureReplayCapsule ? { failure_replay_capsule: input.failureReplayCapsule } : {}),
		remaining_risks: remainingRisks,
		conflict_ledger: createConflictLedger({
			verdict: input.verdict,
			gaps,
			remainingRisks,
		}),
		...(reproEvidence ? { repro_evidence: reproEvidence } : {}),
		...(externalChecks.length > 0 ? { external_checks: externalChecks } : {}),
		explanation: explanationFromVerdict(input.verdict),
	};
}

export function createDashboardEvidenceModel(input: CreateDashboardEvidenceModelInput): VerificationEvidenceModel {
	const requirements =
		input.changedSurfaces.length > 0 || input.runnableIntents.length > 0
			? [
					{
						reason: 'dashboard_snapshot',
						files: [],
						surfaces: [...input.changedSurfaces],
						candidate_intents: uniqueSorted(input.runnableIntents),
						selected_intents: [],
						skipped_intents: uniqueSorted(input.skippedChecks.map((check) => check.intent)),
						gap_count: input.gaps.length,
						outcome: input.verdict.status,
					},
				]
			: [];
	const receipts = input.latestReceipt ? [input.latestReceipt] : [];
	const sourceAnchorRisks = input.sourceAnchorRisks ?? [];
	const scopeDiffRisks = input.scopeDiffRisks ?? [];
	const remainingRisks = [
		...input.remainingRisks,
		...sourceAnchorRemainingRisks(sourceAnchorRisks),
		...scopeDiffRemainingRisks(scopeDiffRisks),
	];

	return {
		schema_version: '1',
		source: 'dashboard_export',
		verification_plan_id: null,
		requirements,
		coverage_matrix: coverageMatrixFromRequirements({
			source: 'dashboard_snapshot',
			requirements,
			receipts,
			gaps: input.gaps,
			sourceAnchorRisks,
		}),
		receipts,
		skipped_checks: input.skippedChecks,
		gaps: input.gaps,
		remaining_risks: remainingRisks,
		conflict_ledger: createConflictLedger({
			verdict: input.verdict,
			gaps: input.gaps,
			remainingRisks,
		}),
		explanation: explanationFromVerdict(input.verdict),
	};
}
