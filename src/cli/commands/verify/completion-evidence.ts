import type { VerificationResult, VerificationSummary } from './result-types.js';
import { countUndeclaredWriteDrift, stringField, objectField } from './result-analysis.js';
import { type ChangeVerificationReport } from '../../../core/change-verification.js';
import { createVerifyCompletionVerdict, type CompletionVerdict, type CompletionVerdictCriteriaEvidence, type CompletionVerdictReceiptBindingEvidence } from '../../../core/completion-verdict.js';
import { type RepeatedFailureRisk } from '../../../core/repeated-failure.js';
import { riskPricedEvidenceRiskCount } from '../../../core/risk-priced-evidence.js';

function createReceiptBindingEvidence(
	results: readonly VerificationResult[],
	verificationPlanId: string,
): CompletionVerdictReceiptBindingEvidence {
	let planBoundCount = 0;
	let planUnboundCount = 0;
	let fingerprintBoundCount = 0;
	let fingerprintUnboundCount = 0;
	let currentStateBoundCount = 0;
	let currentStateUnavailableCount = 0;
	let staleCount = 0;
	let planMismatchCount = 0;

	for (const result of results) {
		if (!result.receipt) {
			continue;
		}

		const receiptPlanId = stringField(result.receipt.verification_plan_id);
		const resultPlanId = result.verification_plan_id;
		const resultPlanMatches = resultPlanId === verificationPlanId;
		const receiptPlanMatches = receiptPlanId === verificationPlanId;
		if (resultPlanMatches && receiptPlanMatches) {
			planBoundCount += 1;
		} else if (
			(typeof resultPlanId === 'string' && resultPlanId !== verificationPlanId) ||
			(receiptPlanId !== null && receiptPlanId !== verificationPlanId)
		) {
			planMismatchCount += 1;
		} else {
			planUnboundCount += 1;
		}

		const performance = objectField(result.receipt.performance);
		const hasFingerprints =
			performance !== null &&
			stringField(performance.command_fingerprint) !== null &&
			stringField(performance.intent_fingerprint) !== null &&
			stringField(performance.contract_fingerprint) !== null;
		if (hasFingerprints) {
			fingerprintBoundCount += 1;
		} else {
			fingerprintUnboundCount += 1;
		}

		const currentStateBinding =
			stringField(result.receipt.head_tree_hash) ??
			stringField(result.receipt.changed_files_hash) ??
			stringField(result.receipt.current_state_hash);
		if (currentStateBinding !== null) {
			currentStateBoundCount += 1;
		} else {
			currentStateUnavailableCount += 1;
		}

		if (!result.receipt_path || !result.receipt_sha256) {
			staleCount += 1;
		}
	}

	return {
		plan_bound_count: planBoundCount,
		plan_unbound_count: planUnboundCount,
		fingerprint_bound_count: fingerprintBoundCount,
		fingerprint_unbound_count: fingerprintUnboundCount,
		current_state_bound_count: currentStateBoundCount,
		current_state_unavailable_count: currentStateUnavailableCount,
		stale_count: staleCount,
		plan_mismatch_count: planMismatchCount,
	};
}

function resultForSelectedIntent(results: readonly VerificationResult[], intent: string): VerificationResult | null {
	return results.find((result) => result.intent === intent && result.status !== 'skipped') ?? null;
}

function createCriteriaEvidence(
	report: ChangeVerificationReport,
	results: readonly VerificationResult[],
): CompletionVerdictCriteriaEvidence {
	const evidence: CompletionVerdictCriteriaEvidence = {
		total: report.requirements.length,
		covered: 0,
		partially_covered: 0,
		uncovered: 0,
		blocked: 0,
		contradicted: 0,
	};

	return report.requirements.reduce((current, requirement) => {
		const candidates = report.candidates.filter((candidate) => candidate.reason === requirement.reason);
		const selectedIntents = candidates
			.filter((candidate) => candidate.selectionState === 'selected')
			.map((candidate) => candidate.intent)
			.filter((intent): intent is string => intent !== null);
		const skippedIntents = candidates
			.filter((candidate) => candidate.status !== 'runnable')
			.map((candidate) => candidate.intent)
			.filter((intent): intent is string => intent !== null);
		const gapCount = report.gaps.filter((gap) => gap.reason === requirement.reason).length;
		const selectedResults = selectedIntents.map((intent) => resultForSelectedIntent(results, intent));

		if (
			selectedResults.some(
				(result) =>
					result?.status === 'failed' ||
					result?.status === 'timed_out' ||
					result?.status === 'start_failed' ||
					result?.status === 'output_limit_exceeded',
			)
		) {
			return { ...current, contradicted: current.contradicted + 1 };
		}

		if (gapCount > 0 || (selectedIntents.length === 0 && skippedIntents.length > 0)) {
			return { ...current, blocked: current.blocked + 1 };
		}

		if (selectedIntents.length === 0) {
			return { ...current, uncovered: current.uncovered + 1 };
		}

		if (skippedIntents.length > 0) {
			return { ...current, partially_covered: current.partially_covered + 1 };
		}

		if (selectedResults.every((result) => result?.status === 'passed')) {
			return { ...current, covered: current.covered + 1 };
		}

		return { ...current, uncovered: current.uncovered + 1 };
	}, evidence);
}

export function createCompletionVerdictForResults(input: {
	readonly report: ChangeVerificationReport;
	readonly verificationPlanId: string;
	readonly summary: VerificationSummary;
	readonly results: readonly VerificationResult[];
	readonly sourceAnchorRiskCount: number;
	readonly scopeDiffRiskCount: number;
	readonly repeatedFailureRisks: readonly RepeatedFailureRisk[];
	readonly validationRatchetRiskCount: number;
	readonly validationRatchetContradictionCount: number;
	readonly reproEvidenceRiskCount: number;
	readonly reproEvidenceContradictionCount: number;
	readonly reproEvidenceUnverifiedCount: number;
	readonly externalEvidenceRiskCount: number;
}): CompletionVerdict {
	const receiptBinding = createReceiptBindingEvidence(input.results, input.verificationPlanId);
	const receiptBindingRiskCount = receiptBinding.plan_unbound_count + receiptBinding.fingerprint_unbound_count;
	const repeatedFailureBlockerCount = input.repeatedFailureRisks.filter((risk) => risk.verdict_effect === 'blocker').length;
	const writeDriftRiskCount = countUndeclaredWriteDrift(input.results);
	const specificReviewRiskCount =
		input.sourceAnchorRiskCount +
		input.scopeDiffRiskCount +
		input.validationRatchetRiskCount +
		input.reproEvidenceRiskCount +
		input.externalEvidenceRiskCount +
		writeDriftRiskCount +
		receiptBindingRiskCount +
		receiptBinding.stale_count;
	const genericRiskPricedEvidenceRiskCount =
		specificReviewRiskCount === 0 ? riskPricedEvidenceRiskCount(input.report.risk_assessment) : 0;
	return createVerifyCompletionVerdict({
		verificationPlanId: input.verificationPlanId,
		matchedIntents: input.summary.matched,
		ranIntents: input.summary.ran,
		passedIntents: input.summary.passed,
		failedIntents: input.summary.failed,
		skippedIntents: input.summary.skipped,
		receiptCount: input.results.filter((result) => result.receipt !== null).length,
		gapCount: input.report.gaps.length,
		sourceAnchorRiskCount: input.sourceAnchorRiskCount,
		scopeDiffRiskCount: input.scopeDiffRiskCount,
		repeatedFailureCount: input.repeatedFailureRisks.length,
		repeatedFailureBlockerCount,
		validationRatchetRiskCount: input.validationRatchetRiskCount,
		validationRatchetContradictionCount: input.validationRatchetContradictionCount,
		reproEvidenceRiskCount: input.reproEvidenceRiskCount,
		reproEvidenceContradictionCount: input.reproEvidenceContradictionCount,
		reproEvidenceUnverifiedCount: input.reproEvidenceUnverifiedCount,
		externalEvidenceRiskCount: input.externalEvidenceRiskCount,
		riskPricedEvidenceRiskCount: genericRiskPricedEvidenceRiskCount,
		writeDriftRiskCount,
		receiptBindingRiskCount,
		staleReceiptCount: receiptBinding.stale_count,
		planMismatchCount: receiptBinding.plan_mismatch_count,
		criteria: createCriteriaEvidence(input.report, input.results),
		receiptBinding,
	});
}
