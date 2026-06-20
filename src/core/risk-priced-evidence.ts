import { isRecord, readString, readStringArray, type CommandContract } from './config-loading.js';

export type VerificationRiskLevel = 'low' | 'medium' | 'high' | 'critical';

export interface VerificationRiskAssessment {
	readonly schema_version: '1';
	readonly source: 'change_classification_and_command_contract';
	readonly level: VerificationRiskLevel;
	readonly reasons: readonly string[];
	readonly required_evidence: readonly string[];
	readonly blocking_gaps: readonly string[];
	readonly rollback_required: boolean;
	readonly human_approval_required: boolean;
	readonly manual_review_required: boolean;
}

interface RiskAssessmentClassificationSummary {
	readonly publicSurfaceCount: number;
	readonly changeKinds: readonly string[];
	readonly validationReasons: readonly string[];
	readonly driftChecks: readonly string[];
	readonly affectedContracts: readonly string[];
}

interface RiskAssessmentRequirement {
	readonly reason: string;
	readonly files: readonly string[];
	readonly surfaces: readonly string[];
	readonly affectedContracts: readonly string[];
	readonly driftChecks: readonly string[];
}

interface RiskAssessmentCandidate {
	readonly intent: string | null;
	readonly status: string;
	readonly selectionState: string;
	readonly skipReason: string | null;
	readonly detail: string | null;
}

interface RiskAssessmentGap {
	readonly reason: string;
	readonly detail: string;
}

export interface CreateVerificationRiskAssessmentInput {
	readonly classificationSummary: RiskAssessmentClassificationSummary;
	readonly requirements: readonly RiskAssessmentRequirement[];
	readonly candidates: readonly RiskAssessmentCandidate[];
	readonly gaps: readonly RiskAssessmentGap[];
	readonly commandContract: CommandContract;
	readonly selectedIntents: readonly string[];
}

const LEVEL_RANK: Record<VerificationRiskLevel, number> = {
	low: 0,
	medium: 1,
	high: 2,
	critical: 3,
};

const HIGH_RISK_REASONS = new Set([
	'public_api_change',
	'package_metadata_change',
	'template_version_change',
	'packaging_change',
	'release_risk',
	'before_publish',
	'security_change',
	'privacy_change',
	'data_change',
	'mustflow_config_change',
	'mustflow_docs_change',
	'auth_permission_change',
	'deployment_change',
]);

const CRITICAL_RISK_REASONS = new Set([
	'database_migration',
	'database_migration_change',
	'migration_change',
	'secret_exposure',
	'secret_change',
	'destructive_change',
]);

const MEDIUM_RISK_REASONS = new Set([
	'code_change',
	'behavior_change',
	'test_change',
	'unknown_change',
	'performance_change',
	'ui_change',
	'build_config_change',
	'dependency_change',
]);

const HIGH_RISK_TEXT = [
	'auth',
	'authorization',
	'permission',
	'security',
	'privacy',
	'pii',
	'token',
	'credential',
	'payment',
	'refund',
	'ledger',
	'billing',
	'public api',
	'json schema',
	'machine-readable output',
	'package',
	'release',
	'deployment',
	'production',
	'data contract',
];

const CRITICAL_RISK_TEXT = [
	'destructive',
	'delete',
	'drop table',
	'secret',
	'credential',
	'private key',
	'database migration',
	'payment settlement',
	'ledger mutation',
];

function uniqueSorted(values: Iterable<string | null | undefined>): string[] {
	return [...new Set([...values].filter((value): value is string => typeof value === 'string' && value.length > 0))].sort(
		(left, right) => left.localeCompare(right),
	);
}

function maxLevel(left: VerificationRiskLevel, right: VerificationRiskLevel): VerificationRiskLevel {
	return LEVEL_RANK[right] > LEVEL_RANK[left] ? right : left;
}

function includesAnySignal(values: readonly string[], signals: readonly string[]): boolean {
	const normalizedValues = values.map((value) => value.toLowerCase());
	return signals.some((signal) => normalizedValues.some((value) => value.includes(signal)));
}

function readBoolean(record: Record<string, unknown>, key: string): boolean | null {
	return typeof record[key] === 'boolean' ? record[key] : null;
}

function selectedIntentRecords(input: CreateVerificationRiskAssessmentInput): readonly Record<string, unknown>[] {
	return input.selectedIntents
		.map((intent) => input.commandContract.intents[intent])
		.filter((intent): intent is Record<string, unknown> => isRecord(intent));
}

function intentHasDeleteEffect(intent: Record<string, unknown>): boolean {
	if (!Array.isArray(intent.effects)) {
		return false;
	}

	return intent.effects.some((effect) => isRecord(effect) && readString(effect, 'mode') === 'delete_recreate');
}

function classifyReasonSignals(input: CreateVerificationRiskAssessmentInput): {
	readonly level: VerificationRiskLevel;
	readonly reasons: readonly string[];
} {
	let level: VerificationRiskLevel = 'low';
	const reasons: string[] = [];
	const validationReasons = input.classificationSummary.validationReasons;
	const signalText = uniqueSorted([
		...validationReasons,
		...input.classificationSummary.changeKinds,
		...input.classificationSummary.affectedContracts,
		...input.classificationSummary.driftChecks,
		...input.requirements.flatMap((requirement) => [
			requirement.reason,
			...requirement.surfaces,
			...requirement.affectedContracts,
			...requirement.driftChecks,
		]),
	]);

	for (const reason of validationReasons) {
		if (CRITICAL_RISK_REASONS.has(reason)) {
			level = maxLevel(level, 'critical');
			reasons.push(`critical validation reason: ${reason}`);
		} else if (HIGH_RISK_REASONS.has(reason)) {
			level = maxLevel(level, 'high');
			reasons.push(`high validation reason: ${reason}`);
		} else if (MEDIUM_RISK_REASONS.has(reason)) {
			level = maxLevel(level, 'medium');
			reasons.push(`medium validation reason: ${reason}`);
		}
	}

	if (includesAnySignal(signalText, CRITICAL_RISK_TEXT)) {
		level = maxLevel(level, 'critical');
		reasons.push('critical contract or surface signal');
	} else if (includesAnySignal(signalText, HIGH_RISK_TEXT)) {
		level = maxLevel(level, 'high');
		reasons.push('high contract or surface signal');
	}

	if (input.gaps.length > 0) {
		level = maxLevel(level, 'high');
		reasons.push('verification gaps exist');
	}

	if (level === 'low' && input.classificationSummary.publicSurfaceCount > 0 && validationReasons.length > 0) {
		reasons.push('public surface changed but no high-risk trigger matched');
	}

	return { level, reasons: uniqueSorted(reasons) };
}

function classifyCommandSignals(input: CreateVerificationRiskAssessmentInput): {
	readonly level: VerificationRiskLevel;
	readonly reasons: readonly string[];
} {
	let level: VerificationRiskLevel = 'low';
	const reasons: string[] = [];

	for (const intent of selectedIntentRecords(input)) {
		const intentName = readString(intent, 'name') ?? null;
		const label = intentName ?? 'selected intent';
		if (readBoolean(intent, 'destructive') === true) {
			level = maxLevel(level, 'critical');
			reasons.push(`${label} is destructive`);
		}
		if (readBoolean(intent, 'network') === true) {
			level = maxLevel(level, 'high');
			reasons.push(`${label} uses network`);
		}
		if (intentHasDeleteEffect(intent)) {
			level = maxLevel(level, 'medium');
			reasons.push(`${label} rewrites declared output paths`);
		}
		if ((readStringArray(intent, 'writes') ?? []).length > 0) {
			level = maxLevel(level, 'medium');
			reasons.push(`${label} writes files`);
		}
	}

	return { level, reasons: uniqueSorted(reasons) };
}

function requiredEvidence(level: VerificationRiskLevel): readonly string[] {
	if (level === 'critical') {
		return [
			'configured_mf_run_receipt',
			'receipt_bound_to_current_plan',
			'synchronized_contract_surfaces',
			'rollback_or_recovery_plan',
			'manual_approval_record',
			'remaining_risk_review',
		];
	}

	if (level === 'high') {
		return [
			'configured_mf_run_receipt',
			'receipt_bound_to_current_plan',
			'synchronized_contract_surfaces',
			'remaining_risk_review',
		];
	}

	if (level === 'medium') {
		return ['configured_mf_run_receipt', 'related_or_declared_verification'];
	}

	return ['changed_file_review'];
}

export function riskPricedEvidenceRiskCount(assessment: VerificationRiskAssessment): number {
	return assessment.level === 'high' || assessment.level === 'critical' ? 1 : 0;
}

export function createVerificationRiskAssessment(
	input: CreateVerificationRiskAssessmentInput,
): VerificationRiskAssessment {
	const reasonSignals = classifyReasonSignals(input);
	const commandSignals = classifyCommandSignals(input);
	const level = maxLevel(reasonSignals.level, commandSignals.level);
	const blockingGaps = input.gaps.map((gap) => `${gap.reason}: ${gap.detail}`);

	return {
		schema_version: '1',
		source: 'change_classification_and_command_contract',
		level,
		reasons: uniqueSorted([...reasonSignals.reasons, ...commandSignals.reasons]),
		required_evidence: requiredEvidence(level),
		blocking_gaps: blockingGaps,
		rollback_required: level === 'critical',
		human_approval_required: level === 'critical',
		manual_review_required: level === 'high' || level === 'critical',
	};
}
