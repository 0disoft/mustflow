export type ReproEvidenceStatus = 'present' | 'unavailable' | 'missing';

export interface ReproEvidenceItem {
	readonly status: ReproEvidenceStatus;
	readonly summary: string | null;
	readonly reason: string | null;
}

export interface ReproEvidenceReport {
	readonly source: 'repro_first_debug';
	readonly authority: 'claim_evidence';
	readonly reported_symptom: string | null;
	readonly expected_behavior: string | null;
	readonly observed_behavior: string | null;
	readonly original_reproduction: ReproEvidenceItem;
	readonly evidence_before_fix: ReproEvidenceItem;
	readonly evidence_after_fix: ReproEvidenceItem;
	readonly regression_guard: ReproEvidenceItem;
}

export interface ReproEvidenceRisk {
	readonly code: 'repro_evidence_missing';
	readonly severity: 'high';
	readonly detail: string;
}

const TEXT_FIELD_LABELS = {
	reported_symptom: 'reported symptom',
	expected_behavior: 'expected behavior',
	observed_behavior: 'observed behavior',
} as const;

const ITEM_FIELD_LABELS = {
	original_reproduction: 'original reproduction path',
	evidence_before_fix: 'before-fix evidence',
	evidence_after_fix: 'after-fix evidence',
	regression_guard: 'regression guard',
} as const;

export function createReproEvidenceRisks(report: ReproEvidenceReport | null): readonly ReproEvidenceRisk[] {
	if (!report) {
		return [];
	}

	const risks: ReproEvidenceRisk[] = [];

	for (const [field, label] of Object.entries(TEXT_FIELD_LABELS)) {
		if (!report[field as keyof typeof TEXT_FIELD_LABELS]) {
			risks.push({
				code: 'repro_evidence_missing',
				severity: 'high',
				detail: `Bug-fix repro evidence is missing ${label}; do not mark the task verified from command receipts alone.`,
			});
		}
	}

	for (const [field, label] of Object.entries(ITEM_FIELD_LABELS)) {
		const item = report[field as keyof typeof ITEM_FIELD_LABELS] as ReproEvidenceItem;
		if (item.status === 'missing') {
			risks.push({
				code: 'repro_evidence_missing',
				severity: 'high',
				detail: `Bug-fix repro evidence is missing ${label}; rerun or explicitly mark it unavailable before claiming verification.`,
			});
			continue;
		}

		if (item.status === 'present' && !item.summary) {
			risks.push({
				code: 'repro_evidence_missing',
				severity: 'high',
				detail: `Bug-fix repro evidence marks ${label} present but does not summarize the evidence.`,
			});
			continue;
		}

		if (item.status === 'unavailable' && !item.reason) {
			risks.push({
				code: 'repro_evidence_missing',
				severity: 'high',
				detail: `Bug-fix repro evidence marks ${label} unavailable without explaining why.`,
			});
		}
	}

	return risks;
}
