export type CompletionVerdictStatus = 'verified' | 'partially_verified' | 'unverified' | 'blocked' | 'contradicted';

export interface CompletionVerdictEvidence {
	readonly source: 'mf_verify' | 'dashboard_export';
	readonly verification_plan_id: string | null;
	readonly changed_file_count: number | null;
	readonly matched_intents: number;
	readonly ran_intents: number;
	readonly passed_intents: number;
	readonly failed_intents: number;
	readonly skipped_intents: number;
	readonly receipt_count: number;
	readonly gap_count: number;
	readonly source_anchor_risk_count: number;
	readonly scope_diff_risk_count: number;
	readonly repeated_failure_count: number;
	readonly validation_ratchet_risk_count: number;
	readonly latest_run_status: string | null;
}

export interface CompletionVerdict {
	readonly schema_version: '1';
	readonly status: CompletionVerdictStatus;
	readonly primary_reason: string;
	readonly evidence: CompletionVerdictEvidence;
	readonly blockers: readonly string[];
	readonly contradictions: readonly string[];
	readonly limitations: readonly string[];
}

export interface VerifyCompletionVerdictInput {
	readonly verificationPlanId: string;
	readonly matchedIntents: number;
	readonly ranIntents: number;
	readonly passedIntents: number;
	readonly failedIntents: number;
	readonly skippedIntents: number;
	readonly receiptCount: number;
	readonly sourceAnchorRiskCount?: number;
	readonly scopeDiffRiskCount?: number;
	readonly repeatedFailureCount?: number;
	readonly validationRatchetRiskCount?: number;
	readonly reproEvidenceRiskCount?: number;
	readonly externalEvidenceRiskCount?: number;
}

export interface DashboardCompletionVerdictInput {
	readonly changedFileCount: number;
	readonly runnableIntentCount: number;
	readonly skippedIntentCount: number;
	readonly gapCount: number;
	readonly latestRunExists: boolean;
	readonly latestRunValid: boolean;
	readonly latestRunStatus: string | null;
	readonly sourceAnchorRiskCount?: number;
	readonly scopeDiffRiskCount?: number;
	readonly repeatedFailureCount?: number;
	readonly validationRatchetRiskCount?: number;
}

function verifyStatus(input: VerifyCompletionVerdictInput): {
	readonly status: CompletionVerdictStatus;
	readonly primaryReason: string;
	readonly blockers: readonly string[];
	readonly contradictions: readonly string[];
	readonly limitations: readonly string[];
} {
	if (input.failedIntents > 0) {
		const contradictions = ['one_or_more_selected_verification_intents_failed'];
		if ((input.repeatedFailureCount ?? 0) > 0) {
			contradictions.push('repeated_verification_failure');
		}

		return {
			status: 'contradicted',
			primaryReason: 'verification_failed',
			blockers: [],
			contradictions,
			limitations: [],
		};
	}

	if (input.ranIntents === 0 && input.skippedIntents > 0) {
		const blockers = ['all_matching_verification_intents_were_skipped'];
		if ((input.repeatedFailureCount ?? 0) > 0) {
			blockers.push('repeated_verification_failure');
		}

		return {
			status: 'blocked',
			primaryReason: 'no_runnable_verification_intents',
			blockers,
			contradictions: [],
			limitations: [],
		};
	}

	if (input.ranIntents === 0) {
		const limitations = ['no_verification_intents_ran'];
		if ((input.repeatedFailureCount ?? 0) > 0) {
			limitations.push('repeated_verification_failure');
		}

		return {
			status: 'unverified',
			primaryReason: 'no_verification_evidence',
			blockers: [],
			contradictions: [],
			limitations,
		};
	}

	if (input.skippedIntents > 0) {
		const limitations = ['one_or_more_matching_verification_intents_were_skipped'];
		if ((input.repeatedFailureCount ?? 0) > 0) {
			limitations.push('repeated_verification_failure');
		}

		return {
			status: 'partially_verified',
			primaryReason: 'some_verification_skipped',
			blockers: [],
			contradictions: [],
			limitations,
		};
	}

	const downgradeLimitations: string[] = [];
	if ((input.sourceAnchorRiskCount ?? 0) > 0) {
		downgradeLimitations.push('high_risk_source_anchor_requires_review');
	}
	if ((input.scopeDiffRiskCount ?? 0) > 0) {
		downgradeLimitations.push('scope_diff_risk_requires_review');
	}
	if ((input.validationRatchetRiskCount ?? 0) > 0) {
		downgradeLimitations.push('validation_ratchet_risk_requires_review');
	}
	if ((input.reproEvidenceRiskCount ?? 0) > 0) {
		downgradeLimitations.push('repro_evidence_missing');
	}
	if ((input.externalEvidenceRiskCount ?? 0) > 0) {
		downgradeLimitations.push('external_evidence_requires_review');
	}

	if (downgradeLimitations.length > 0) {
		return {
			status: 'partially_verified',
			primaryReason:
				(input.sourceAnchorRiskCount ?? 0) > 0
					? 'source_anchor_invariant_review_required'
					: (input.scopeDiffRiskCount ?? 0) > 0
						? 'scope_diff_review_required'
						: (input.validationRatchetRiskCount ?? 0) > 0
							? 'validation_ratchet_review_required'
							: (input.reproEvidenceRiskCount ?? 0) > 0
								? 'repro_evidence_missing'
								: 'external_evidence_review_required',
			blockers: [],
			contradictions: [],
			limitations: downgradeLimitations,
		};
	}

	if (input.passedIntents === input.ranIntents) {
		return {
			status: 'verified',
			primaryReason: 'all_selected_verification_passed',
			blockers: [],
			contradictions: [],
			limitations: [],
		};
	}

	return {
		status: 'unverified',
		primaryReason: 'verification_evidence_inconclusive',
		blockers: [],
		contradictions: [],
		limitations: ['selected_verification_did_not_produce_a_clear_pass_or_fail'],
	};
}

export function createVerifyCompletionVerdict(input: VerifyCompletionVerdictInput): CompletionVerdict {
	const result = verifyStatus(input);
	return {
		schema_version: '1',
		status: result.status,
		primary_reason: result.primaryReason,
		evidence: {
			source: 'mf_verify',
			verification_plan_id: input.verificationPlanId,
			changed_file_count: null,
			matched_intents: input.matchedIntents,
			ran_intents: input.ranIntents,
			passed_intents: input.passedIntents,
			failed_intents: input.failedIntents,
			skipped_intents: input.skippedIntents,
			receipt_count: input.receiptCount,
			gap_count: input.skippedIntents,
			source_anchor_risk_count: input.sourceAnchorRiskCount ?? 0,
			scope_diff_risk_count: input.scopeDiffRiskCount ?? 0,
			repeated_failure_count: input.repeatedFailureCount ?? 0,
			validation_ratchet_risk_count: input.validationRatchetRiskCount ?? 0,
			latest_run_status: null,
		},
		blockers: result.blockers,
		contradictions: result.contradictions,
		limitations: result.limitations,
	};
}

export function createDashboardCompletionVerdict(input: DashboardCompletionVerdictInput): CompletionVerdict {
	const latestRunFailed =
		input.latestRunStatus === 'failed' ||
		input.latestRunStatus === 'timed_out' ||
		input.latestRunStatus === 'start_failed';

	let status: CompletionVerdictStatus = 'unverified';
	let primaryReason = 'dashboard_does_not_execute_verification';
	const blockers: string[] = [];
	const contradictions: string[] = [];
	const limitations: string[] = ['dashboard_export_is_read_only'];

	if (latestRunFailed) {
		status = 'contradicted';
		primaryReason = 'latest_run_failed';
		contradictions.push('latest_run_status_is_not_passing');
	} else if ((input.sourceAnchorRiskCount ?? 0) > 0) {
		status = 'partially_verified';
		primaryReason = 'source_anchor_invariant_review_required';
		limitations.push('high_risk_source_anchor_requires_review');
		if ((input.scopeDiffRiskCount ?? 0) > 0) {
			limitations.push('scope_diff_risk_requires_review');
		}
	} else if ((input.scopeDiffRiskCount ?? 0) > 0) {
		status = 'partially_verified';
		primaryReason = 'scope_diff_review_required';
		limitations.push('scope_diff_risk_requires_review');
	} else if (input.gapCount > 0) {
		status = 'blocked';
		primaryReason = 'verification_gaps_present';
		blockers.push('dashboard_verification_graph_reports_gaps');
	} else if (input.changedFileCount > 0 && !input.latestRunExists) {
		status = 'unverified';
		primaryReason = 'changed_files_without_run_receipt';
		limitations.push('no_latest_run_receipt');
	} else if (input.changedFileCount > 0 && !input.latestRunValid) {
		status = 'unverified';
		primaryReason = 'changed_files_with_invalid_run_receipt';
		limitations.push('latest_run_receipt_is_invalid');
	} else if (input.changedFileCount > 0 && input.runnableIntentCount > 0) {
		status = 'partially_verified';
		primaryReason = 'verification_recommendations_available';
		limitations.push('dashboard_recommendations_are_not_executed_receipts');
	} else if (input.latestRunValid && input.latestRunStatus === 'passed') {
		status = 'partially_verified';
		primaryReason = 'latest_run_passed_without_current_claim_binding';
		limitations.push('latest_run_is_not_bound_to_a_current_completion_claim');
	}

	return {
		schema_version: '1',
		status,
		primary_reason: primaryReason,
		evidence: {
			source: 'dashboard_export',
			verification_plan_id: null,
			changed_file_count: input.changedFileCount,
			matched_intents: input.runnableIntentCount + input.skippedIntentCount,
			ran_intents: 0,
			passed_intents: 0,
			failed_intents: latestRunFailed ? 1 : 0,
			skipped_intents: input.skippedIntentCount,
			receipt_count: input.latestRunExists && input.latestRunValid ? 1 : 0,
			gap_count: input.gapCount,
			source_anchor_risk_count: input.sourceAnchorRiskCount ?? 0,
			scope_diff_risk_count: input.scopeDiffRiskCount ?? 0,
			repeated_failure_count: input.repeatedFailureCount ?? 0,
			validation_ratchet_risk_count: input.validationRatchetRiskCount ?? 0,
			latest_run_status: input.latestRunStatus,
		},
		blockers,
		contradictions,
		limitations,
	};
}
