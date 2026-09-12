import type { ChangeVerificationReport } from '../../../core/change-verification.js';
import { createVerificationFailureFingerprint, type VerificationFailureFingerprint } from '../../../core/repeated-failure.js';
import type { ScopeDiffRisk } from '../../../core/scope-risk.js';
import type { ValidationRatchetRisk } from '../../../core/validation-ratchet.js';
import type { LocalSourceAnchorVerdictRisk } from '../../lib/local-index.js';
import type { VerificationResult, VerificationSummary } from './result-types.js';

export function summarizeResults(results: readonly VerificationResult[]): VerificationSummary {
	const ran = results.filter((result) => !result.skipped).length;
	const passed = results.filter((result) => result.status === 'passed').length;
	const skipped = results.filter((result) => result.skipped).length;
	const failed = results.filter(
		(result) =>
			!result.skipped &&
			(result.status === 'failed' ||
				result.status === 'timed_out' ||
				result.status === 'start_failed' ||
				result.status === 'output_limit_exceeded'),
	).length;

	return {
		matched: results.filter((result) => result.intent !== null).length,
		ran,
		passed,
		failed,
		skipped,
	};
}

export function countUndeclaredWriteDrift(results: readonly VerificationResult[]): number {
	return results.filter((result) => {
		const writeDrift = result.receipt?.write_drift;
		if (typeof writeDrift !== 'object' || writeDrift === null) {
			return false;
		}
		return (writeDrift as { readonly has_undeclared_changes?: unknown }).has_undeclared_changes === true;
	}).length;
}

export function stringField(value: unknown): string | null {
	return typeof value === 'string' && value.length > 0 ? value : null;
}

export function objectField(value: unknown): Record<string, unknown> | null {
	return typeof value === 'object' && value !== null ? (value as Record<string, unknown>) : null;
}

function performanceForResult(result: VerificationResult): Record<string, unknown> | null {
	return objectField(result.receipt?.performance);
}

function resultSummaryForResult(result: VerificationResult): Record<string, unknown> | null {
	return objectField(performanceForResult(result)?.result_summary);
}

function commandFingerprintForResult(result: VerificationResult): string | null {
	return stringField(performanceForResult(result)?.command_fingerprint);
}

function exitCodeClassForResult(result: VerificationResult): string | null {
	const resultSummary = resultSummaryForResult(result);
	const explicitClass = stringField(resultSummary?.exit_code_class);
	if (explicitClass) {
		return explicitClass;
	}

	if (result.exit_code === null) {
		return 'no_exit_code';
	}

	return result.exit_code === 0 ? 'success' : 'failure';
}

function timedOutForResult(result: VerificationResult): boolean {
	const resultSummary = resultSummaryForResult(result);
	return result.status === 'timed_out' || resultSummary?.timed_out === true;
}

function errorKindForResult(result: VerificationResult): string | null {
	return (
		stringField(resultSummaryForResult(result)?.error_kind) ??
		(result.status === 'start_failed' || result.status === 'output_limit_exceeded' ? result.status : null)
	);
}

function failedResults(results: readonly VerificationResult[]): readonly VerificationResult[] {
	return results.filter(
		(result) =>
			!result.skipped &&
			(result.status === 'failed' ||
				result.status === 'timed_out' ||
				result.status === 'start_failed' ||
				result.status === 'output_limit_exceeded'),
	);
}

export function createFailureFingerprintForVerify(input: {
	readonly verificationPlanId: string;
	readonly report: ChangeVerificationReport;
	readonly results: readonly VerificationResult[];
	readonly riskCodes: readonly string[];
}): VerificationFailureFingerprint | null {
	const failures = failedResults(input.results);

	return createVerificationFailureFingerprint({
		verificationPlanId: input.verificationPlanId,
		failedIntents: failures.map((result) => result.intent).filter((intent): intent is string => intent !== null),
		exitCodeClasses: failures.map(exitCodeClassForResult).filter((value): value is string => value !== null),
		timeoutFlags: failures.map(timedOutForResult),
		errorKinds: failures.map(errorKindForResult).filter((value): value is string => value !== null),
		riskCodes: input.riskCodes,
		affectedSurfaces: input.report.requirements.flatMap((requirement) => requirement.surfaces),
		commandFingerprints: failures.map(commandFingerprintForResult).filter((value): value is string => value !== null),
	});
}

export function riskCodesForFailureFingerprint(input: {
	readonly sourceAnchorRisks: readonly LocalSourceAnchorVerdictRisk[];
	readonly scopeDiffRisks: readonly ScopeDiffRisk[];
	readonly validationRatchetRisks: readonly ValidationRatchetRisk[];
	readonly reproEvidenceRisks: readonly { readonly code: string }[];
	readonly externalEvidenceRisks: readonly { readonly code: string }[];
	readonly results: readonly VerificationResult[];
}): readonly string[] {
	const writeDriftRiskCodes =
		countUndeclaredWriteDrift(input.results) > 0 ? ['undeclared_write_drift'] : [];

	return [
		...input.sourceAnchorRisks.map(() => 'source_anchor_invariant_review_required'),
		...input.scopeDiffRisks.map((risk) => risk.code),
		...input.validationRatchetRisks.map((risk) => risk.code),
		...input.reproEvidenceRisks.map((risk) => risk.code),
		...input.externalEvidenceRisks.map((risk) => risk.code),
		...writeDriftRiskCodes,
	];
}
