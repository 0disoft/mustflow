export interface RepeatedFailureRisk {
	readonly code: 'repeated_verification_failure';
	readonly severity: 'high';
	readonly detail: string;
	readonly previous_status: string;
	readonly verification_plan_id: string;
}

export interface RepeatedFailureRiskInput {
	readonly previousVerificationPlanId: string | null;
	readonly previousStatus: string | null;
	readonly currentVerificationPlanId: string;
	readonly currentStatus: string;
}

const UNRESOLVED_VERIFY_STATUSES = new Set(['failed', 'blocked', 'partial']);

export function createRepeatedFailureRisk(input: RepeatedFailureRiskInput): RepeatedFailureRisk | null {
	if (
		input.previousVerificationPlanId === null ||
		input.previousStatus === null ||
		input.previousVerificationPlanId !== input.currentVerificationPlanId ||
		!UNRESOLVED_VERIFY_STATUSES.has(input.previousStatus) ||
		!UNRESOLVED_VERIFY_STATUSES.has(input.currentStatus)
	) {
		return null;
	}

	return {
		code: 'repeated_verification_failure',
		severity: 'high',
		previous_status: input.previousStatus,
		verification_plan_id: input.currentVerificationPlanId,
		detail:
			'The previous verify summary has the same verification_plan_id and an unresolved status; provide new evidence or a narrower hypothesis before marking the task complete.',
	};
}
