import { existsSync } from 'node:fs';
import path from 'node:path';

import { MUSTFLOW_JSON_MAX_BYTES, readMustflowTextFile } from '../mustflow-read.js';
import { LATEST_RUN_STATE_RELATIVE_PATH } from './constants.js';
import { sha256Bytes, sha256Text } from './hashing.js';

export interface VerificationEvidenceSummary {
	readonly sourcePath: string;
	readonly sourceHash: string;
	readonly command: string;
	readonly kind: string;
	readonly status: string;
	readonly runDir: string | null;
	readonly manifestPath: string | null;
	readonly verificationPlanId: string | null;
	readonly completionStatus: string | null;
	readonly primaryReason: string | null;
	readonly matchedIntents: number;
	readonly ranIntents: number;
	readonly passedIntents: number;
	readonly failedIntents: number;
	readonly skippedIntents: number;
	readonly receiptCount: number;
	readonly coverageCount: number;
	readonly remainingRiskCount: number;
	readonly failureFingerprint: string | null;
}

export interface VerificationReceiptSummary {
	readonly sourcePath: string;
	readonly ordinal: number;
	readonly intent: string | null;
	readonly status: string;
	readonly skipped: boolean;
	readonly verificationPlanId: string | null;
	readonly receiptPath: string | null;
	readonly receiptSha256: string | null;
	readonly commandFingerprint: string | null;
	readonly contractFingerprint: string | null;
	readonly currentStateHash: string | null;
	readonly writeDriftStatus: string | null;
}

export interface VerificationCoverageState {
	readonly sourcePath: string;
	readonly criterionId: string;
	readonly source: string;
	readonly status: string;
	readonly requirementReason: string | null;
	readonly intents: readonly string[];
	readonly receiptCount: number;
	readonly gapCount: number;
	readonly sourceAnchorCount: number;
}

export interface VerificationRiskSignal {
	readonly sourcePath: string;
	readonly ordinal: number;
	readonly code: string;
	readonly severity: string;
	readonly detailHash: string;
}

export interface ValidationRatchetSignalReadModel {
	readonly signalId: string;
	readonly planId: string | null;
	readonly code: string;
	readonly severity: string;
	readonly pathHash: string;
	readonly beforeHash: string | null;
	readonly afterHash: string | null;
}

export interface VerificationFailureFingerprint {
	readonly sourcePath: string;
	readonly fingerprint: string;
	readonly verificationPlanId: string | null;
	readonly status: string;
	readonly failedIntents: readonly string[];
	readonly primaryReason: string | null;
	readonly failedIntentsHash: string | null;
	readonly riskCodesHash: string | null;
	readonly affectedSurfacesHash: string | null;
	readonly firstSeenAt: string | null;
	readonly lastSeenAt: string | null;
	readonly seenCount: number;
	readonly requiresNewEvidence: boolean;
}

export interface VerificationPlanReadModel {
	readonly planId: string;
	readonly sourcePath: string;
	readonly classificationHash: string | null;
	readonly commandContractHash: string | null;
	readonly selectedIntentsHash: string | null;
	readonly createdAt: string | null;
	readonly sourceHash: string;
}

export interface AcceptanceCriterionReadModel {
	readonly criterionId: string;
	readonly planId: string;
	readonly source: string;
	readonly statementHash: string | null;
	readonly reason: string | null;
	readonly surface: string | null;
	readonly pathHash: string | null;
}

export interface CriterionCoverageReadModel {
	readonly criterionId: string;
	readonly planId: string;
	readonly status: string;
	readonly receiptCount: number;
	readonly gapCount: number;
	readonly riskCount: number;
}

export interface CommandReceiptReadModel {
	readonly receiptHash: string;
	readonly planId: string;
	readonly intent: string | null;
	readonly status: string;
	readonly commandFingerprint: string | null;
	readonly contractFingerprint: string | null;
	readonly currentStateHash: string | null;
	readonly writeDriftStatus: string | null;
}

export interface CompletionVerdictSummaryReadModel {
	readonly claimId: string;
	readonly planId: string;
	readonly status: string;
	readonly primaryReason: string | null;
	readonly riskCount: number;
	readonly contradictionCount: number;
	readonly blockerCount: number;
}

export interface ReproRouteReadModel {
	readonly routeId: string;
	readonly taskHash: string;
	readonly routeDigest: string | null;
	readonly routeKind: string | null;
	readonly failureOracleHash: string | null;
}

export interface ReproObservationReadModel {
	readonly routeId: string;
	readonly phase: 'before_fix' | 'after_fix' | 'regression_guard';
	readonly outcome: string | null;
	readonly receiptHash: string | null;
	readonly diagnosticFingerprint: string;
}

export interface FailureFingerprintReadModel {
	readonly fingerprint: string;
	readonly planId: string | null;
	readonly failedIntentsHash: string | null;
	readonly riskCodesHash: string | null;
	readonly seenCount: number;
	readonly firstSeenAt: string | null;
	readonly lastSeenAt: string | null;
}

export interface VerificationEvidenceIndex {
	readonly summaries: readonly VerificationEvidenceSummary[];
	readonly verificationPlans: readonly VerificationPlanReadModel[];
	readonly acceptanceCriteria: readonly AcceptanceCriterionReadModel[];
	readonly criterionCoverage: readonly CriterionCoverageReadModel[];
	readonly receipts: readonly VerificationReceiptSummary[];
	readonly commandReceiptSummaries: readonly CommandReceiptReadModel[];
	readonly coverageStates: readonly VerificationCoverageState[];
	readonly riskSignals: readonly VerificationRiskSignal[];
	readonly validationRatchetSignals: readonly ValidationRatchetSignalReadModel[];
	readonly completionVerdictSummaries: readonly CompletionVerdictSummaryReadModel[];
	readonly failureFingerprints: readonly VerificationFailureFingerprint[];
	readonly reproRoutes: readonly ReproRouteReadModel[];
	readonly reproObservations: readonly ReproObservationReadModel[];
	readonly failureFingerprintReadModels: readonly FailureFingerprintReadModel[];
}

const VALIDATION_RATCHET_RISK_CODES = new Set([
	'related_test_deleted',
	'skip_or_only_marker_present',
	'todo_or_pending_marker_added',
	'assertion_count_decreased',
	'assertion_matcher_weakened',
	'negative_assertion_removed',
	'exception_assertion_removed',
	'snapshot_mass_updated',
	'golden_output_replaced',
	'verification_intent_disabled',
	'verification_required_after_removed',
	'success_exit_codes_widened',
	'command_allows_no_tests',
	'command_forces_snapshot_update',
	'command_hides_failure',
	'coverage_threshold_lowered',
	'test_selection_narrowed',
]);

function emptyVerificationEvidenceIndex(): VerificationEvidenceIndex {
	return {
		summaries: [],
		verificationPlans: [],
		acceptanceCriteria: [],
		criterionCoverage: [],
		receipts: [],
		commandReceiptSummaries: [],
		coverageStates: [],
		riskSignals: [],
		validationRatchetSignals: [],
		completionVerdictSummaries: [],
		failureFingerprints: [],
		reproRoutes: [],
		reproObservations: [],
		failureFingerprintReadModels: [],
	};
}

function isJsonRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function readJsonRecord(projectRoot: string, relativePath: string): { readonly content: string; readonly value: Record<string, unknown> } | null {
	try {
		const content = readMustflowTextFile(projectRoot, relativePath, { maxBytes: MUSTFLOW_JSON_MAX_BYTES });
		const parsed = JSON.parse(content) as unknown;
		return isJsonRecord(parsed) ? { content, value: parsed } : null;
	} catch {
		return null;
	}
}

function stringField(record: Record<string, unknown> | null | undefined, key: string): string | null {
	const value = record?.[key];
	return typeof value === 'string' ? value : null;
}

function booleanField(record: Record<string, unknown> | null | undefined, key: string): boolean {
	return record?.[key] === true;
}

function numberField(record: Record<string, unknown> | null | undefined, key: string): number {
	const value = record?.[key];
	return typeof value === 'number' && Number.isFinite(value) ? value : 0;
}

function recordField(record: Record<string, unknown> | null | undefined, key: string): Record<string, unknown> | null {
	const value = record?.[key];
	return isJsonRecord(value) ? value : null;
}

function recordArrayField(record: Record<string, unknown> | null | undefined, key: string): readonly Record<string, unknown>[] {
	const value = record?.[key];
	return Array.isArray(value) ? value.filter(isJsonRecord) : [];
}

function stringArrayField(record: Record<string, unknown> | null | undefined, key: string): readonly string[] {
	const value = record?.[key];
	return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [];
}

function hashJson(value: unknown): string {
	return sha256Text(JSON.stringify(value));
}

function stringListHash(values: readonly (string | null)[]): string | null {
	const normalized = values.filter((value): value is string => typeof value === 'string' && value.length > 0);
	return normalized.length > 0 ? hashJson([...normalized].sort((left, right) => left.localeCompare(right))) : null;
}

function reproObservation(
	routeId: string,
	phase: ReproObservationReadModel['phase'],
	evidence: Record<string, unknown> | null,
): ReproObservationReadModel {
	const status = stringField(evidence, 'status');
	const outcome = stringField(evidence, 'outcome') ?? status;
	const receiptHash = stringField(evidence, 'receipt_sha256');
	const diagnosticFingerprint =
		stringField(evidence, 'diagnostic_fingerprint') ??
		stringField(evidence, 'diagnostic_hash') ??
		hashJson({
			phase,
			status,
			outcome,
			summary: stringField(evidence, 'summary'),
			reason: stringField(evidence, 'reason'),
		});

	return {
		routeId,
		phase,
		outcome,
		receiptHash,
		diagnosticFingerprint,
	};
}

function evidenceStatusForRunReceipt(latest: Record<string, unknown>): string {
	return stringField(latest, 'status') ?? (booleanField(latest, 'timed_out') ? 'timed_out' : 'unknown');
}

function failedIntentsFromReceipts(receipts: readonly VerificationReceiptSummary[]): readonly string[] {
	return receipts
		.filter((receipt) => ['failed', 'timed_out', 'start_failed'].includes(receipt.status))
		.map((receipt) => receipt.intent)
		.filter((intent): intent is string => typeof intent === 'string' && intent.length > 0)
		.sort((left, right) => left.localeCompare(right));
}

function createFailureFingerprint(input: {
	readonly command: string;
	readonly status: string;
	readonly verificationPlanId: string | null;
	readonly primaryReason: string | null;
	readonly failedIntents: readonly string[];
	readonly riskCodes: readonly string[];
	readonly runIntent?: string | null;
	readonly timedOut?: boolean;
	readonly exitCodeClass?: string | null;
	readonly errorKind?: string | null;
}): string | null {
	if (
		input.status === 'passed' ||
		input.status === 'verified' ||
		(input.failedIntents.length === 0 && input.riskCodes.length === 0 && input.timedOut !== true && !input.errorKind)
	) {
		return null;
	}

	return sha256Text(
		JSON.stringify({
			command: input.command,
			status: input.status,
			verificationPlanId: input.verificationPlanId,
			primaryReason: input.primaryReason,
			failedIntents: [...input.failedIntents].sort((left, right) => left.localeCompare(right)),
			riskCodes: [...input.riskCodes].sort((left, right) => left.localeCompare(right)),
			runIntent: input.runIntent ?? null,
			timedOut: input.timedOut === true,
			exitCodeClass: input.exitCodeClass ?? null,
			errorKind: input.errorKind ?? null,
		}),
	);
}

export function createVerificationEvidenceIndex(projectRoot: string): VerificationEvidenceIndex {
	const latestPath = path.join(projectRoot, ...LATEST_RUN_STATE_RELATIVE_PATH.split('/'));

	if (!existsSync(latestPath)) {
		return emptyVerificationEvidenceIndex();
	}

	const latestRecord = readJsonRecord(projectRoot, LATEST_RUN_STATE_RELATIVE_PATH);

	if (!latestRecord) {
		return emptyVerificationEvidenceIndex();
	}

	const latest = latestRecord.value;
	const sourceHash = sha256Bytes(Buffer.from(latestRecord.content));
	const command = stringField(latest, 'command') ?? 'unknown';
	const kind = stringField(latest, 'kind') ?? (command === 'verify' ? 'verify_run_summary' : 'run_receipt');
	const evidenceModel = recordField(latest, 'evidence_model');
	const completionVerdict = recordField(latest, 'completion_verdict');
	const completionEvidence = recordField(completionVerdict, 'evidence');
	const verificationPlanId = stringField(latest, 'verification_plan_id') ?? stringField(evidenceModel, 'verification_plan_id');
	const primaryReason = stringField(completionVerdict, 'primary_reason');
	const status = stringField(latest, 'status') ?? stringField(completionVerdict, 'status') ?? 'unknown';
	const completionStatus = stringField(completionVerdict, 'status');
	const rawReceipts = recordArrayField(evidenceModel, 'receipts');
	const rawCoverage = recordArrayField(evidenceModel, 'coverage_matrix');
	const rawRequirements = recordArrayField(evidenceModel, 'requirements');
	const rawRisks = recordArrayField(evidenceModel, 'remaining_risks');
	const recordedFailureFingerprintRecord = recordField(latest, 'failure_fingerprint');
	const repeatedFailureSummary = recordField(latest, 'repeated_failure_summary');
	const reproEvidence = recordField(latest, 'repro_evidence') ?? recordField(evidenceModel, 'repro_evidence');
	const reproductionRoute = recordField(reproEvidence, 'reproduction_route');
	const recordedFailureFingerprint = stringField(recordedFailureFingerprintRecord, 'fingerprint');
	const receipts: VerificationReceiptSummary[] =
		rawReceipts.length > 0
			? rawReceipts.map((receipt, index) => ({
					sourcePath: LATEST_RUN_STATE_RELATIVE_PATH,
					ordinal: index + 1,
					intent: stringField(receipt, 'intent'),
					status: stringField(receipt, 'status') ?? 'unknown',
					skipped: booleanField(receipt, 'skipped'),
					verificationPlanId: stringField(receipt, 'verification_plan_id'),
					receiptPath: stringField(receipt, 'receipt_path'),
					receiptSha256: stringField(receipt, 'receipt_sha256'),
					commandFingerprint: stringField(receipt, 'command_fingerprint'),
					contractFingerprint: stringField(receipt, 'contract_fingerprint'),
					currentStateHash:
						stringField(receipt, 'head_tree_hash') ??
						stringField(receipt, 'changed_files_hash') ??
						stringField(receipt, 'changed_file_hash'),
					writeDriftStatus: stringField(receipt, 'write_drift_status'),
				}))
			: [
					{
						sourcePath: LATEST_RUN_STATE_RELATIVE_PATH,
						ordinal: 1,
						intent: stringField(latest, 'intent'),
						status: evidenceStatusForRunReceipt(latest),
						skipped: false,
						verificationPlanId: null,
						receiptPath: stringField(latest, 'receipt_path') ?? LATEST_RUN_STATE_RELATIVE_PATH,
						receiptSha256: sourceHash,
						commandFingerprint: stringField(recordField(latest, 'performance'), 'command_fingerprint'),
						contractFingerprint: stringField(recordField(latest, 'performance'), 'contract_fingerprint'),
						currentStateHash: stringField(latest, 'head_tree_hash') ?? stringField(latest, 'changed_files_hash'),
						writeDriftStatus: stringField(recordField(latest, 'write_drift'), 'status'),
					},
				];
	const coverageStates = rawCoverage.map((coverage): VerificationCoverageState => {
		const evidence = recordField(coverage, 'evidence');

		return {
			sourcePath: LATEST_RUN_STATE_RELATIVE_PATH,
			criterionId: stringField(coverage, 'criterion_id') ?? 'unknown',
			source: stringField(coverage, 'source') ?? 'unknown',
			status: stringField(coverage, 'status') ?? 'unknown',
			requirementReason: stringField(coverage, 'requirement_reason'),
			intents: stringArrayField(evidence, 'intents'),
			receiptCount: stringArrayField(evidence, 'receipt_paths').length,
			gapCount: stringArrayField(evidence, 'gap_reasons').length,
			sourceAnchorCount: stringArrayField(evidence, 'source_anchor_ids').length,
		};
	});
	const riskSignals = rawRisks.map((risk, index): VerificationRiskSignal => ({
		sourcePath: LATEST_RUN_STATE_RELATIVE_PATH,
		ordinal: index + 1,
		code: stringField(risk, 'code') ?? 'unknown',
		severity: stringField(risk, 'severity') ?? 'unknown',
		detailHash: sha256Text(stringField(risk, 'detail') ?? ''),
	}));
	const validationRatchetSignals = rawRisks
		.map((risk, index): ValidationRatchetSignalReadModel | null => {
			const code = stringField(risk, 'code') ?? 'unknown';
			if (!VALIDATION_RATCHET_RISK_CODES.has(code)) {
				return null;
			}

			const severity = stringField(risk, 'severity') ?? 'unknown';
			const pathValue = stringField(risk, 'path');
			const detailHash = sha256Text(stringField(risk, 'detail') ?? '');
			const pathHash = pathValue === null ? hashJson({ code, detailHash }) : sha256Text(pathValue);
			const beforeHash = stringField(risk, 'before_hash') ?? stringField(risk, 'before_digest');
			const afterHash = stringField(risk, 'after_hash') ?? stringField(risk, 'after_digest');

			return {
				signalId: hashJson({
					sourcePath: LATEST_RUN_STATE_RELATIVE_PATH,
					ordinal: index + 1,
					planId: verificationPlanId,
					code,
					pathHash,
					beforeHash,
					afterHash,
				}),
				planId: verificationPlanId,
				code,
				severity,
				pathHash,
				beforeHash,
				afterHash,
			};
		})
		.filter((signal): signal is ValidationRatchetSignalReadModel => signal !== null);
	const verificationPlans: VerificationPlanReadModel[] =
		verificationPlanId === null
			? []
			: [
					{
						planId: verificationPlanId,
						sourcePath: LATEST_RUN_STATE_RELATIVE_PATH,
						classificationHash:
							rawRequirements.length > 0 || rawCoverage.length > 0
								? hashJson({
										requirements: rawRequirements.map((requirement) => ({
											id: stringField(requirement, 'requirement_id') ?? stringField(requirement, 'id'),
											reason: stringField(requirement, 'reason'),
											source: stringField(requirement, 'source'),
										})),
										coverage: rawCoverage.map((coverage) => ({
											id: stringField(coverage, 'criterion_id'),
											reason: stringField(coverage, 'requirement_reason'),
											source: stringField(coverage, 'source'),
											status: stringField(coverage, 'status'),
										})),
									})
								: null,
						commandContractHash: stringListHash(receipts.map((receipt) => receipt.contractFingerprint)),
						selectedIntentsHash: stringListHash(receipts.map((receipt) => receipt.intent)),
						createdAt: stringField(latest, 'started_at') ?? stringField(latest, 'created_at'),
						sourceHash,
					},
				];
	const acceptanceCriteria =
		verificationPlanId === null
			? []
			: rawCoverage.map((coverage): AcceptanceCriterionReadModel => {
					const evidence = recordField(coverage, 'evidence');
					const pathRefs = [
						...stringArrayField(evidence, 'paths'),
						...stringArrayField(evidence, 'changed_paths'),
						...stringArrayField(evidence, 'source_anchor_ids'),
					];

					return {
						criterionId: stringField(coverage, 'criterion_id') ?? 'unknown',
						planId: verificationPlanId,
						source: stringField(coverage, 'source') ?? 'unknown',
						statementHash: stringField(coverage, 'statement') ? sha256Text(stringField(coverage, 'statement') ?? '') : null,
						reason: stringField(coverage, 'requirement_reason'),
						surface: stringField(coverage, 'surface'),
						pathHash: pathRefs.length > 0 ? stringListHash(pathRefs) : null,
					};
				});
	const criterionCoverage =
		verificationPlanId === null
			? []
			: coverageStates.map((coverage): CriterionCoverageReadModel => ({
					criterionId: coverage.criterionId,
					planId: verificationPlanId,
					status: coverage.status,
					receiptCount: coverage.receiptCount,
					gapCount: coverage.gapCount,
					riskCount: coverage.sourceAnchorCount,
				}));
	const commandReceiptSummaries =
		verificationPlanId === null
			? []
			: receipts
					.filter((receipt) => receipt.verificationPlanId === verificationPlanId || receipt.verificationPlanId === null)
					.map((receipt): CommandReceiptReadModel => ({
						receiptHash:
							receipt.receiptSha256 ??
							hashJson({
								sourcePath: receipt.sourcePath,
								ordinal: receipt.ordinal,
								intent: receipt.intent,
								status: receipt.status,
								verificationPlanId,
							}),
						planId: verificationPlanId,
						intent: receipt.intent,
						status: receipt.status,
						commandFingerprint: receipt.commandFingerprint,
						contractFingerprint: receipt.contractFingerprint,
						currentStateHash: receipt.currentStateHash,
						writeDriftStatus: receipt.writeDriftStatus,
					}));
	const completionVerdictSummaries =
		verificationPlanId === null || completionStatus === null
			? []
			: [
					{
						claimId: hashJson({
							sourceHash,
							verificationPlanId,
							completionStatus,
							primaryReason,
						}),
						planId: verificationPlanId,
						status: completionStatus,
						primaryReason,
						riskCount: riskSignals.length,
						contradictionCount: stringArrayField(completionVerdict, 'contradictions').length,
						blockerCount: stringArrayField(completionVerdict, 'blockers').length,
					},
				];
	const failedIntents = failedIntentsFromReceipts(receipts);
	const failureFingerprint =
		recordedFailureFingerprint ??
		createFailureFingerprint({
			command,
			status: completionStatus ?? status,
			verificationPlanId,
			primaryReason,
			failedIntents,
			riskCodes: riskSignals.map((risk) => risk.code),
			runIntent: stringField(latest, 'intent'),
			timedOut: booleanField(latest, 'timed_out'),
			exitCodeClass: stringField(recordField(recordField(latest, 'performance'), 'result_summary'), 'exit_code_class'),
			errorKind: stringField(recordField(recordField(latest, 'performance'), 'result_summary'), 'error_kind'),
		});
	const failureFingerprints =
		failureFingerprint === null
			? []
			: [
					{
						sourcePath: LATEST_RUN_STATE_RELATIVE_PATH,
						fingerprint: failureFingerprint,
						verificationPlanId,
						status: completionStatus ?? status,
						failedIntents,
						primaryReason,
						failedIntentsHash:
							stringField(recordedFailureFingerprintRecord, 'failed_intents_hash') ??
							stringField(repeatedFailureSummary, 'failed_intents_hash'),
						riskCodesHash:
							stringField(recordedFailureFingerprintRecord, 'risk_codes_hash') ??
							stringField(repeatedFailureSummary, 'risk_codes_hash'),
						affectedSurfacesHash:
							stringField(recordedFailureFingerprintRecord, 'affected_surfaces_hash') ??
							stringField(repeatedFailureSummary, 'affected_surfaces_hash'),
						firstSeenAt: stringField(repeatedFailureSummary, 'first_seen_at'),
						lastSeenAt: stringField(repeatedFailureSummary, 'last_seen_at'),
						seenCount: Math.max(1, numberField(repeatedFailureSummary, 'seen_count')),
						requiresNewEvidence: booleanField(repeatedFailureSummary, 'requires_new_evidence'),
					},
				];
	const routeId = stringField(reproductionRoute, 'route_id');
	const reproRoutes =
		routeId === null || reproEvidence === null
			? []
			: [
					{
						routeId,
						taskHash: hashJson({
							reported_symptom: stringField(reproEvidence, 'reported_symptom'),
							expected_behavior: stringField(reproEvidence, 'expected_behavior'),
							observed_behavior: stringField(reproEvidence, 'observed_behavior'),
						}),
						routeDigest: stringField(reproductionRoute, 'route_digest'),
						routeKind: stringField(reproductionRoute, 'route_kind'),
						failureOracleHash: stringField(reproductionRoute, 'failure_oracle_hash'),
					},
				];
	const reproObservations =
		routeId === null || reproEvidence === null
			? []
			: [
					reproObservation(routeId, 'before_fix', recordField(reproEvidence, 'before_fix')),
					reproObservation(routeId, 'after_fix', recordField(reproEvidence, 'after_fix')),
					reproObservation(routeId, 'regression_guard', recordField(reproEvidence, 'regression_guard')),
				];
	const failureFingerprintReadModels = failureFingerprints.map((fingerprint): FailureFingerprintReadModel => ({
		fingerprint: fingerprint.fingerprint,
		planId: fingerprint.verificationPlanId,
		failedIntentsHash: fingerprint.failedIntentsHash ?? stringListHash(fingerprint.failedIntents),
		riskCodesHash: fingerprint.riskCodesHash,
		seenCount: fingerprint.seenCount,
		firstSeenAt: fingerprint.firstSeenAt,
		lastSeenAt: fingerprint.lastSeenAt,
	}));

	return {
		summaries: [
			{
				sourcePath: LATEST_RUN_STATE_RELATIVE_PATH,
				sourceHash,
				command,
				kind,
				status,
				runDir: stringField(latest, 'run_dir'),
				manifestPath: stringField(latest, 'manifest_path'),
				verificationPlanId,
				completionStatus,
				primaryReason,
				matchedIntents: numberField(completionEvidence, 'matched_intents'),
				ranIntents: numberField(completionEvidence, 'ran_intents'),
				passedIntents: numberField(completionEvidence, 'passed_intents'),
				failedIntents: numberField(completionEvidence, 'failed_intents'),
				skippedIntents: numberField(completionEvidence, 'skipped_intents'),
				receiptCount: receipts.length,
				coverageCount: coverageStates.length,
				remainingRiskCount: riskSignals.length,
				failureFingerprint,
			},
		],
		verificationPlans,
		acceptanceCriteria,
		criterionCoverage,
		receipts,
		commandReceiptSummaries,
		coverageStates,
		riskSignals,
		validationRatchetSignals,
		completionVerdictSummaries,
		failureFingerprints,
		reproRoutes,
		reproObservations,
		failureFingerprintReadModels,
	};
}
