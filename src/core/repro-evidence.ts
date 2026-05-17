export type ReproBeforeFixStatus = 'reproduced' | 'unavailable' | 'missing';
export type ReproBeforeFixOutcome = 'failed_as_expected' | 'failed_differently' | 'passed_unexpectedly' | null;

export type ReproAfterFixStatus = 'passed' | 'failed' | 'unavailable' | 'missing';
export type ReproAfterFixOutcome = 'passed_expected_behavior' | 'failed_same_route' | 'failed_differently' | null;

export type ReproRegressionGuardStatus = 'passed' | 'failed' | 'unavailable' | 'missing';
export type ReproRouteKind = 'test' | 'cli' | 'browser' | 'api' | 'manual' | 'unknown' | null;

export interface ReproRouteStep {
	readonly ordinal: number;
	readonly action: string | null;
	readonly target: string | null;
	readonly input_digest: string | null;
	readonly observation_digest: string | null;
	readonly summary: string | null;
}

export interface ReproRouteIdentity {
	readonly route_id: string | null;
	readonly route_kind: ReproRouteKind;
	readonly route_digest: string | null;
	readonly failure_oracle_hash: string | null;
	readonly steps: readonly ReproRouteStep[];
}

export interface ReproReceiptBinding {
	readonly receipt_path: string | null;
	readonly receipt_sha256: string | null;
	readonly verification_plan_id: string | null;
}

export interface ReproBeforeFixEvidence {
	readonly status: ReproBeforeFixStatus;
	readonly outcome: ReproBeforeFixOutcome;
	readonly receipt_path: string | null;
	readonly receipt_sha256: string | null;
	readonly verification_plan_id: string | null;
	readonly summary: string | null;
	readonly reason: string | null;
}

export interface ReproAfterFixEvidence {
	readonly status: ReproAfterFixStatus;
	readonly outcome: ReproAfterFixOutcome;
	readonly same_route_as: string | null;
	readonly receipt_path: string | null;
	readonly receipt_sha256: string | null;
	readonly verification_plan_id: string | null;
	readonly summary: string | null;
	readonly reason: string | null;
}

export interface ReproRegressionGuardEvidence {
	readonly status: ReproRegressionGuardStatus;
	readonly intent: string | null;
	readonly test_path: string | null;
	readonly receipt_path: string | null;
	readonly receipt_sha256: string | null;
	readonly verification_plan_id: string | null;
	readonly summary: string | null;
	readonly reason: string | null;
}

export interface ReproEvidenceReport {
	readonly source: 'repro_first_debug';
	readonly authority: 'claim_evidence';
	readonly reported_symptom: string | null;
	readonly expected_behavior: string | null;
	readonly observed_behavior: string | null;
	readonly reproduction_route: ReproRouteIdentity;
	readonly before_fix: ReproBeforeFixEvidence;
	readonly after_fix: ReproAfterFixEvidence;
	readonly regression_guard: ReproRegressionGuardEvidence;
}

export interface ReproEvidenceRisk {
	readonly code: 'repro_evidence_missing';
	readonly severity: 'high' | 'critical';
	readonly detail: string;
	readonly verdict_effect: 'partial' | 'unverified' | 'contradicted';
}

const TEXT_FIELD_LABELS = {
	reported_symptom: 'reported symptom',
	expected_behavior: 'expected behavior',
	observed_behavior: 'observed behavior',
} as const;

interface ReproEvidenceRiskOptions {
	readonly verificationPlanId?: string | null;
}

function pushRisk(
	risks: ReproEvidenceRisk[],
	detail: string,
	verdictEffect: ReproEvidenceRisk['verdict_effect'] = 'partial',
): void {
	risks.push({
		code: 'repro_evidence_missing',
		severity: verdictEffect === 'contradicted' ? 'critical' : 'high',
		detail,
		verdict_effect: verdictEffect,
	});
}

function collectReceiptBindingRisks(
	phaseLabel: 'before-fix' | 'after-fix' | 'regression-guard',
	evidence: ReproReceiptBinding,
	options: ReproEvidenceRiskOptions,
	risks: ReproEvidenceRisk[],
): void {
	if (!evidence.receipt_path || !evidence.receipt_sha256 || !evidence.verification_plan_id) {
		pushRisk(
			risks,
			`Bug-fix repro evidence ${phaseLabel} observation is not bound to receipt_path, receipt_sha256, and verification_plan_id.`,
		);
		return;
	}

	if (options.verificationPlanId && evidence.verification_plan_id !== options.verificationPlanId) {
		pushRisk(
			risks,
			`Bug-fix repro evidence ${phaseLabel} receipt is stale for the current verification plan.`,
		);
	}
}

function collectBeforeFixRisks(
	report: ReproEvidenceReport,
	options: ReproEvidenceRiskOptions,
	risks: ReproEvidenceRisk[],
): void {
	if (report.before_fix.status === 'missing') {
		pushRisk(
			risks,
			'Bug-fix repro evidence is missing before-fix reproduction; reproduce the original failure or mark it unavailable before claiming verification.',
		);
		return;
	}

	if (report.before_fix.status === 'unavailable') {
		pushRisk(
			risks,
			report.before_fix.reason
				? 'Bug-fix repro evidence marks before-fix reproduction unavailable; the result cannot be verified without the original failure being observed.'
				: 'Bug-fix repro evidence marks before-fix reproduction unavailable without explaining why.',
		);
		return;
	}

	if (!report.before_fix.summary) {
		pushRisk(risks, 'Bug-fix repro evidence reproduced the before-fix failure but does not summarize the evidence.');
	}

	if (report.before_fix.outcome !== 'failed_as_expected') {
		pushRisk(
			risks,
			'Bug-fix repro evidence reproduced the before-fix path without outcome failed_as_expected.',
		);
	}

	collectReceiptBindingRisks('before-fix', report.before_fix, options, risks);
}

function collectRouteIdentityRisks(report: ReproEvidenceReport, risks: ReproEvidenceRisk[]): void {
	if (!report.reproduction_route.route_id) {
		pushRisk(risks, 'Bug-fix repro evidence is missing reproduction_route.route_id.', 'unverified');
	}

	if (!report.reproduction_route.route_kind) {
		pushRisk(risks, 'Bug-fix repro evidence is missing reproduction_route.route_kind.');
	}

	if (!report.reproduction_route.route_digest) {
		pushRisk(risks, 'Bug-fix repro evidence is missing reproduction_route.route_digest.', 'unverified');
	}

	if (!report.reproduction_route.failure_oracle_hash) {
		pushRisk(risks, 'Bug-fix repro evidence is missing reproduction_route.failure_oracle_hash.');
	}

	if (report.reproduction_route.steps.length === 0) {
		pushRisk(risks, 'Bug-fix repro evidence is missing bounded reproduction route steps.', 'unverified');
	}
}

function collectAfterFixRisks(
	report: ReproEvidenceReport,
	options: ReproEvidenceRiskOptions,
	risks: ReproEvidenceRisk[],
): void {
	if (report.after_fix.status === 'missing') {
		pushRisk(
			risks,
			'Bug-fix repro evidence is missing after-fix same-route evidence; rerun the original route after the fix before claiming verification.',
			'unverified',
		);
		return;
	}

	if (report.after_fix.status === 'unavailable') {
		pushRisk(
			risks,
			report.after_fix.reason
				? 'Bug-fix repro evidence marks after-fix same-route evidence unavailable; the result cannot be verified without a post-fix pass.'
				: 'Bug-fix repro evidence marks after-fix same-route evidence unavailable without explaining why.',
			'unverified',
		);
		return;
	}

	if (report.after_fix.status === 'failed') {
		pushRisk(risks, 'Bug-fix repro evidence says the after-fix route still failed.', 'contradicted');
		return;
	}

	if (!report.after_fix.summary) {
		pushRisk(risks, 'Bug-fix repro evidence marks after-fix evidence passed but does not summarize the evidence.');
	}

	if (report.after_fix.outcome !== 'passed_expected_behavior') {
		pushRisk(
			risks,
			'Bug-fix repro evidence marks after-fix evidence passed without outcome passed_expected_behavior.',
			'unverified',
		);
	}

	if (!report.after_fix.same_route_as) {
		pushRisk(risks, 'Bug-fix repro evidence marks after-fix evidence passed without same_route_as.', 'unverified');
	}

	if (
		report.reproduction_route.route_id &&
		report.after_fix.same_route_as &&
		report.after_fix.same_route_as !== report.reproduction_route.route_id
	) {
		pushRisk(risks, 'Bug-fix repro evidence after_fix.same_route_as does not match reproduction_route.route_id.');
	}

	collectReceiptBindingRisks('after-fix', report.after_fix, options, risks);
}

function collectRegressionGuardRisks(
	report: ReproEvidenceReport,
	options: ReproEvidenceRiskOptions,
	risks: ReproEvidenceRisk[],
): void {
	if (report.regression_guard.status === 'missing') {
		pushRisk(
			risks,
			'Bug-fix repro evidence is missing a regression guard; add or identify the guard before claiming verification.',
		);
		return;
	}

	if (report.regression_guard.status === 'unavailable') {
		pushRisk(
			risks,
			report.regression_guard.reason
				? 'Bug-fix repro evidence marks the regression guard unavailable; the result cannot be verified without a guard or explicit limitation.'
				: 'Bug-fix repro evidence marks the regression guard unavailable without explaining why.',
		);
		return;
	}

	if (report.regression_guard.status === 'failed') {
		pushRisk(risks, 'Bug-fix repro evidence says the regression guard failed.', 'contradicted');
		return;
	}

	if (!report.regression_guard.summary) {
		pushRisk(risks, 'Bug-fix repro evidence marks the regression guard passed but does not summarize the evidence.');
	}

	if (!report.regression_guard.intent && !report.regression_guard.test_path) {
		pushRisk(
			risks,
			'Bug-fix repro evidence marks the regression guard passed without an intent or test path.',
		);
	}

	collectReceiptBindingRisks('regression-guard', report.regression_guard, options, risks);
}

export function createReproEvidenceRisks(
	report: ReproEvidenceReport | null,
	options: ReproEvidenceRiskOptions = {},
): readonly ReproEvidenceRisk[] {
	if (!report) {
		return [];
	}

	const risks: ReproEvidenceRisk[] = [];

	for (const [field, label] of Object.entries(TEXT_FIELD_LABELS)) {
		if (!report[field as keyof typeof TEXT_FIELD_LABELS]) {
			pushRisk(
				risks,
				`Bug-fix repro evidence is missing ${label}; do not mark the task verified from command receipts alone.`,
			);
		}
	}

	collectRouteIdentityRisks(report, risks);
	collectBeforeFixRisks(report, options, risks);
	collectAfterFixRisks(report, options, risks);
	collectRegressionGuardRisks(report, options, risks);

	return risks;
}

export function countReproEvidenceVerdictEffects(risks: readonly ReproEvidenceRisk[]): {
	readonly contradicted: number;
	readonly unverified: number;
} {
	return {
		contradicted: risks.filter((risk) => risk.verdict_effect === 'contradicted').length,
		unverified: risks.filter((risk) => risk.verdict_effect === 'unverified').length,
	};
}
