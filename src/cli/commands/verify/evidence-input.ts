import type { ExternalEvidenceCheck, ExternalEvidenceStatus } from '../../../core/external-evidence.js';
import type {
	ReproAfterFixEvidence,
	ReproBeforeFixEvidence,
	ReproEvidenceReport,
	ReproRouteIdentity,
	ReproRouteKind,
	ReproRouteStep,
	ReproRegressionGuardEvidence,
} from '../../../core/repro-evidence.js';
import { readVerifyJsonInputFile } from './input.js';

function isPlainRecord(value: unknown): value is Record<string, unknown> {
	return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function isExternalEvidenceStatus(value: unknown): value is ExternalEvidenceStatus {
	return value === 'passed' || value === 'failed' || value === 'cancelled' || value === 'unknown';
}

type LegacyReproEvidenceStatus = 'present' | 'unavailable' | 'missing';

interface LegacyReproEvidenceItem {
	readonly status: LegacyReproEvidenceStatus;
	readonly summary: string | null;
	readonly reason: string | null;
}

function isLegacyReproEvidenceStatus(value: unknown): value is LegacyReproEvidenceStatus {
	return value === 'present' || value === 'unavailable' || value === 'missing';
}

function isReproBeforeFixStatus(value: unknown): value is ReproBeforeFixEvidence['status'] {
	return value === 'reproduced' || value === 'unavailable' || value === 'missing';
}

function isReproBeforeFixOutcome(value: unknown): value is ReproBeforeFixEvidence['outcome'] {
	return value === 'failed_as_expected' || value === 'failed_differently' || value === 'passed_unexpectedly' || value === null;
}

function isReproAfterFixStatus(value: unknown): value is ReproAfterFixEvidence['status'] {
	return value === 'passed' || value === 'failed' || value === 'unavailable' || value === 'missing';
}

function isReproAfterFixOutcome(value: unknown): value is ReproAfterFixEvidence['outcome'] {
	return value === 'passed_expected_behavior' || value === 'failed_same_route' || value === 'failed_differently' || value === null;
}

function isReproRegressionGuardStatus(value: unknown): value is ReproRegressionGuardEvidence['status'] {
	return value === 'passed' || value === 'failed' || value === 'unavailable' || value === 'missing';
}

function isReproRouteKind(value: unknown): value is ReproRouteKind {
	return (
		value === 'test' ||
		value === 'cli' ||
		value === 'browser' ||
		value === 'api' ||
		value === 'manual' ||
		value === 'unknown' ||
		value === null
	);
}

function readOptionalString(value: unknown): string | null {
	return typeof value === 'string' && value.length > 0 ? value : null;
}

function readRouteStep(value: unknown, index: number): ReproRouteStep {
	if (!isPlainRecord(value)) {
		return {
			ordinal: index + 1,
			action: null,
			target: null,
			input_digest: null,
			observation_digest: null,
			summary: null,
		};
	}

	const ordinal = typeof value.ordinal === 'number' && Number.isInteger(value.ordinal) && value.ordinal > 0 ? value.ordinal : index + 1;
	return {
		ordinal,
		action: readOptionalString(value.action),
		target: readOptionalString(value.target),
		input_digest: readOptionalString(value.input_digest),
		observation_digest: readOptionalString(value.observation_digest),
		summary: readOptionalString(value.summary),
	};
}

function readReproductionRoute(value: unknown): ReproRouteIdentity {
	if (!isPlainRecord(value)) {
		return {
			route_id: null,
			route_kind: null,
			route_digest: null,
			failure_oracle_hash: null,
			steps: [],
		};
	}

	const routeKind = value.route_kind ?? null;
	if (!isReproRouteKind(routeKind)) {
		throw new Error('invalid_repro_evidence_file');
	}

	const rawSteps = Array.isArray(value.steps) ? value.steps : [];
	return {
		route_id: readOptionalString(value.route_id),
		route_kind: routeKind,
		route_digest: readOptionalString(value.route_digest),
		failure_oracle_hash: readOptionalString(value.failure_oracle_hash),
		steps: rawSteps.map((step, index) => readRouteStep(step, index)),
	};
}

function readLegacyReproEvidenceItem(value: unknown): LegacyReproEvidenceItem {
	if (!isPlainRecord(value)) {
		return {
			status: 'missing',
			summary: null,
			reason: null,
		};
	}

	if (!isLegacyReproEvidenceStatus(value.status)) {
		throw new Error('invalid_repro_evidence_file');
	}

	return {
		status: value.status,
		summary: readOptionalString(value.summary),
		reason: readOptionalString(value.reason),
	};
}

function legacyBeforeFixEvidence(value: unknown): ReproBeforeFixEvidence {
	const item = readLegacyReproEvidenceItem(value);
	return {
		status: item.status === 'present' ? 'reproduced' : item.status,
		outcome: item.status === 'present' ? 'failed_as_expected' : null,
		receipt_path: null,
		receipt_sha256: null,
		verification_plan_id: null,
		summary: item.summary,
		reason: item.reason,
	};
}

function legacyAfterFixEvidence(value: unknown): ReproAfterFixEvidence {
	const item = readLegacyReproEvidenceItem(value);
	return {
		status: item.status === 'present' ? 'passed' : item.status,
		outcome: item.status === 'present' ? 'passed_expected_behavior' : null,
		same_route_as: null,
		receipt_path: null,
		receipt_sha256: null,
		verification_plan_id: null,
		summary: item.summary,
		reason: item.reason,
	};
}

function legacyRegressionGuardEvidence(value: unknown): ReproRegressionGuardEvidence {
	const item = readLegacyReproEvidenceItem(value);
	return {
		status: item.status === 'present' ? 'passed' : item.status,
		intent: null,
		test_path: null,
		receipt_path: null,
		receipt_sha256: null,
		verification_plan_id: null,
		summary: item.summary,
		reason: item.reason,
	};
}

function readBeforeFixEvidence(value: unknown): ReproBeforeFixEvidence {
	if (!isPlainRecord(value)) {
		return {
			status: 'missing',
			outcome: null,
			receipt_path: null,
			receipt_sha256: null,
			verification_plan_id: null,
			summary: null,
			reason: null,
		};
	}

	const outcome = value.outcome ?? null;
	if (!isReproBeforeFixStatus(value.status) || !isReproBeforeFixOutcome(outcome)) {
		throw new Error('invalid_repro_evidence_file');
	}

	return {
		status: value.status,
		outcome,
		receipt_path: readOptionalString(value.receipt_path),
		receipt_sha256: readOptionalString(value.receipt_sha256),
		verification_plan_id: readOptionalString(value.verification_plan_id),
		summary: readOptionalString(value.summary),
		reason: readOptionalString(value.reason),
	};
}

function readAfterFixEvidence(value: unknown): ReproAfterFixEvidence {
	if (!isPlainRecord(value)) {
		return {
			status: 'missing',
			outcome: null,
			same_route_as: null,
			receipt_path: null,
			receipt_sha256: null,
			verification_plan_id: null,
			summary: null,
			reason: null,
		};
	}

	const outcome = value.outcome ?? null;
	if (!isReproAfterFixStatus(value.status) || !isReproAfterFixOutcome(outcome)) {
		throw new Error('invalid_repro_evidence_file');
	}

	return {
		status: value.status,
		outcome,
		same_route_as: readOptionalString(value.same_route_as),
		receipt_path: readOptionalString(value.receipt_path),
		receipt_sha256: readOptionalString(value.receipt_sha256),
		verification_plan_id: readOptionalString(value.verification_plan_id),
		summary: readOptionalString(value.summary),
		reason: readOptionalString(value.reason),
	};
}

function readRegressionGuardEvidence(value: unknown): ReproRegressionGuardEvidence {
	if (!isPlainRecord(value)) {
		return {
			status: 'missing',
			intent: null,
			test_path: null,
			receipt_path: null,
			receipt_sha256: null,
			verification_plan_id: null,
			summary: null,
			reason: null,
		};
	}

	if (!isReproRegressionGuardStatus(value.status)) {
		throw new Error('invalid_repro_evidence_file');
	}

	return {
		status: value.status,
		intent: readOptionalString(value.intent),
		test_path: readOptionalString(value.test_path),
		receipt_path: readOptionalString(value.receipt_path),
		receipt_sha256: readOptionalString(value.receipt_sha256),
		verification_plan_id: readOptionalString(value.verification_plan_id),
		summary: readOptionalString(value.summary),
		reason: readOptionalString(value.reason),
	};
}

export function readReproEvidenceFile(projectRoot: string, inputPath: string): ReproEvidenceReport {
	const parsed = readVerifyJsonInputFile(projectRoot, inputPath, 'invalid_repro_evidence_file');

	if (!isPlainRecord(parsed) || parsed.schema_version !== '1' || parsed.command !== 'repro-evidence') {
		throw new Error('unsupported_repro_evidence_source');
	}

	const regressionGuard =
		isPlainRecord(parsed.regression_guard) && isReproRegressionGuardStatus(parsed.regression_guard.status)
			? readRegressionGuardEvidence(parsed.regression_guard)
			: legacyRegressionGuardEvidence(parsed.regression_guard);

	return {
		source: 'repro_first_debug',
		authority: 'claim_evidence',
		reported_symptom: readOptionalString(parsed.reported_symptom),
		expected_behavior: readOptionalString(parsed.expected_behavior),
		observed_behavior: readOptionalString(parsed.observed_behavior),
		reproduction_route: readReproductionRoute(parsed.reproduction_route),
		before_fix: isPlainRecord(parsed.before_fix)
			? readBeforeFixEvidence(parsed.before_fix)
			: legacyBeforeFixEvidence(parsed.evidence_before_fix),
		after_fix: isPlainRecord(parsed.after_fix)
			? readAfterFixEvidence(parsed.after_fix)
			: legacyAfterFixEvidence(parsed.evidence_after_fix),
		regression_guard: regressionGuard,
	};
}

export function readExternalEvidenceFile(projectRoot: string, inputPath: string): readonly ExternalEvidenceCheck[] {
	const parsed = readVerifyJsonInputFile(projectRoot, inputPath, 'invalid_external_evidence_file');

	if (!isPlainRecord(parsed) || parsed.schema_version !== '1' || parsed.command !== 'external-evidence') {
		throw new Error('unsupported_external_evidence_source');
	}

	if (!Array.isArray(parsed.checks)) {
		throw new Error('invalid_external_evidence_file');
	}

	return parsed.checks.map((check) => {
		if (
			!isPlainRecord(check) ||
			typeof check.provider !== 'string' ||
			check.provider.length === 0 ||
			typeof check.name !== 'string' ||
			check.name.length === 0 ||
			!isExternalEvidenceStatus(check.status)
		) {
			throw new Error('invalid_external_evidence_file');
		}

		return {
			source: 'external_ci',
			authority: 'supporting_only',
			provider: check.provider,
			name: check.name,
			status: check.status,
			url: readOptionalString(check.url),
			summary: readOptionalString(check.summary),
		};
	});
}
