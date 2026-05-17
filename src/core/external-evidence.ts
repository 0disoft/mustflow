export type ExternalEvidenceStatus = 'passed' | 'failed' | 'cancelled' | 'unknown';

export interface ExternalEvidenceCheck {
	readonly source: 'external_ci';
	readonly authority: 'supporting_only';
	readonly provider: string;
	readonly name: string;
	readonly status: ExternalEvidenceStatus;
	readonly url: string | null;
	readonly summary: string | null;
}

export interface ExternalEvidenceRisk {
	readonly code: 'external_evidence_requires_review';
	readonly severity: 'medium';
	readonly detail: string;
}

export function createExternalEvidenceRisks(
	checks: readonly ExternalEvidenceCheck[],
): readonly ExternalEvidenceRisk[] {
	return checks
		.filter((check) => check.status !== 'passed')
		.map((check) => ({
			code: 'external_evidence_requires_review',
			severity: 'medium',
			detail: `External ${check.provider} check ${check.name} reported ${check.status}; review it as supporting evidence, not command authority.`,
		}));
}
