import type { VerificationReceipt, VerificationResult, VerificationResultStatus, VerificationSummary } from './verify/result-types.js';
import { summarizeResults, objectField, createFailureFingerprintForVerify, riskCodesForFailureFingerprint } from './verify/result-analysis.js';
import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import type { ClassifyOutput } from './classify.js';
import { createChangeVerificationReport, type ChangeVerificationReport } from '../../core/change-verification.js';
import { createCorrelationId } from '../../core/correlation-id.js';
import { readUtf8FileInsideWithoutSymlinks, writeJsonFileInsideWithoutSymlinks } from '../../core/safe-filesystem.js';
import { type CompletionVerdict } from '../../core/completion-verdict.js';
import { createExternalEvidenceRisks, type ExternalEvidenceCheck } from '../../core/external-evidence.js';
import { createFailureReplayCapsule, type FailureReplayCapsule } from '../../core/failure-replay-capsule.js';
import { createRepeatedFailureRisks, updateRepeatedFailureState, type RepeatedFailureSummary, type VerificationFailureFingerprint } from '../../core/repeated-failure.js';
import { createVerificationPlanId } from '../../core/verification-plan-id.js';
import type { VerificationProfile } from '../../core/verification-profile.js';
import { countReproEvidenceVerdictEffects, createReproEvidenceRisks, type ReproEvidenceReport } from '../../core/repro-evidence.js';
import { createVerifyEvidenceModel, type VerificationEvidenceModel } from '../../core/verification-evidence.js';
import { createScopeDiffRisks, type ScopeDiffRisk } from '../../core/scope-risk.js';
import { type VerificationRiskAssessment } from '../../core/risk-priced-evidence.js';
import { countValidationRatchetVerdictEffects, createValidationRatchetRisks, type ValidationRatchetRisk } from '../../core/validation-ratchet.js';
import { readCommandContract, readMustflowConfigIfExists } from '../../core/config-loading.js';
import { resolveRunReceiptRetentionPolicy } from '../../core/retention-policy.js';
import { updateRunReceiptState } from '../../core/run-receipt-state.js';
import { evaluateCommandPreconditions, type CommandPreconditionPlan } from '../../core/command-preconditions.js';
import { DEFAULT_VERIFY_PARALLELISM, parseVerifyArgs, resolveVerifyParallelism, type VerifyParallelismSettings } from './verify/args.js';
import { createInputFromChanged, createSyntheticClassificationReport, planErrorMessageKey, readInputFromClassificationReport, resolveVerifyInputPath, writeChangedPlan, type VerifyInput } from './verify/input.js';
import { readExternalEvidenceFile, readReproEvidenceFile } from './verify/evidence-input.js';
import { createVerifyIntentReceiptPath, createVerifyRunStatePaths, resolveLatestVerifyRunReceiptPath } from './verify/state-paths.js';
import { printUsageError, renderHelp } from '../lib/cli-output.js';
import { t, type CliLang } from '../lib/i18n.js';
import { readLocalCommandEffectGraphs, readLocalPathSurfaces, readLocalSourceAnchorVerdictRisks, type LocalCommandEffectGraph, type LocalPathSurfaceReadModel, type LocalSourceAnchorVerdictRisk } from '../lib/local-index.js';
import { hasCliOptionToken } from '../lib/option-parser.js';
import { resolveMustflowRoot } from '../lib/project-root.js';
import type { Reporter } from '../lib/reporter.js';

import { createSkippedResults, testTargetsByScheduledIntent, runScheduledVerificationIntents } from './verify/scheduled-execution.js';
import { createCompletionVerdictForResults } from './verify/completion-evidence.js';


export { planErrorMessageKey, readInputFromClassificationReport } from './verify/input.js';

const VERIFY_SCHEMA_VERSION = '1';

function hashTextSha256(content: string): string {
	return `sha256:${createHash('sha256').update(content).digest('hex')}`;
}

function createVerificationCurrentStateHash(projectRoot: string, report: ChangeVerificationReport, verificationPlanId: string): string | null {
	if (report.files.length === 0) return null;
	const hash = createHash('sha256').update(verificationPlanId);
	for (const relativePath of [...report.files].sort()) {
		hash.update(`\0${relativePath}\0`);
		const absolutePath = path.join(projectRoot, ...relativePath.split('/'));
		hash.update(existsSync(absolutePath) ? readFileSync(absolutePath) : Buffer.from('<missing>'));
	}
	return `sha256:${hash.digest('hex')}`;
}

function readReusableVerificationResults(projectRoot: string, verificationPlanId: string, currentStateHash: string | null): ReadonlyMap<string, VerificationResult> {
	const reusable = new Map<string, VerificationResult>();
	if (!currentStateHash) return reusable;
	try {
		const latest = JSON.parse(readFileSync(resolveLatestVerifyRunReceiptPath(projectRoot), 'utf8')) as Record<string, unknown>;
		if (latest.verification_plan_id !== verificationPlanId || typeof latest.manifest_path !== 'string') return reusable;
		const manifest = JSON.parse(readFileSync(path.join(projectRoot, latest.manifest_path), 'utf8')) as { receipts?: Array<Record<string, unknown>> };
		for (const entry of manifest.receipts ?? []) {
			if (typeof entry.intent !== 'string' || typeof entry.receipt_path !== 'string' || entry.status !== 'passed') continue;
			const receipt = JSON.parse(readFileSync(path.join(projectRoot, entry.receipt_path), 'utf8')) as VerificationReceipt;
			if (receipt.current_state_hash !== currentStateHash || receipt.verification_plan_id !== verificationPlanId) continue;
			const drift = objectField(receipt.write_drift);
			if (drift?.has_undeclared_changes === true) continue;
			reusable.set(entry.intent, { intent: entry.intent, status: 'passed', skipped: false, reason: 'reused_input_hash', detail: null, exit_code: 0, verification_plan_id: verificationPlanId, receipt_path: null, receipt_sha256: null, receipt });
		}
	} catch {
		return reusable;
	}
	return reusable;
}

type VerificationStatus = 'passed' | 'partial' | 'failed' | 'blocked';
interface VerificationParallelismReport {
	readonly requested: number;
	readonly effective: number;
	readonly repository_max: number;
	readonly cpu_available: number | null;
	readonly capped: boolean;
	readonly mode: 'serial' | 'parallel_chunks';
	readonly note: string;
}

interface VerificationOutput {
	readonly schema_version: string;
	readonly command: 'verify';
	readonly correlation_id: string;
	readonly mustflow_root: string;
	readonly reason: string;
	readonly reasons: readonly string[];
	readonly plan_source: string | null;
	readonly verification_plan_id: string;
	readonly execution_status: VerificationStatus;
	readonly status: VerificationStatus;
	readonly risk_assessment: VerificationRiskAssessment;
	readonly completion_verdict: CompletionVerdict;
	readonly evidence_model: VerificationEvidenceModel;
	readonly conflict_ledger: VerificationEvidenceModel['conflict_ledger'];
	readonly failure_fingerprint: VerificationFailureFingerprint | null;
	readonly failure_replay_capsule: FailureReplayCapsule | null;
	readonly repeated_failure_summary: RepeatedFailureSummary | null;
	readonly summary: VerificationSummary;
	readonly parallelism?: VerificationParallelismReport;
	readonly repro_evidence?: ReproEvidenceReport;
	readonly external_checks?: readonly ExternalEvidenceCheck[];
	readonly run_dir: string;
	readonly manifest_path: string;
	readonly results: readonly VerificationResult[];
}

interface VerifyRunReceiptManifestEntry {
	readonly intent: string | null;
	readonly status: VerificationResultStatus;
	readonly skipped: boolean;
	readonly verification_plan_id: string | null;
	readonly receipt_path: string | null;
	readonly receipt_sha256: string | null;
}

interface VerifyRunReceiptManifest {
	readonly schema_version: string;
	readonly command: 'verify';
	readonly correlation_id: string;
	readonly reason: string;
	readonly reasons: readonly string[];
	readonly plan_source: string | null;
	readonly verification_plan_id: string;
	readonly execution_status: VerificationStatus;
	readonly status: VerificationStatus;
	readonly risk_assessment: VerificationRiskAssessment;
	readonly completion_verdict: CompletionVerdict;
	readonly evidence_model: VerificationEvidenceModel;
	readonly conflict_ledger: VerificationEvidenceModel['conflict_ledger'];
	readonly failure_fingerprint: VerificationFailureFingerprint | null;
	readonly failure_replay_capsule: FailureReplayCapsule | null;
	readonly repeated_failure_summary: RepeatedFailureSummary | null;
	readonly summary: VerificationSummary;
	readonly repro_evidence?: ReproEvidenceReport;
	readonly external_checks?: readonly ExternalEvidenceCheck[];
	readonly receipts: readonly VerifyRunReceiptManifestEntry[];
}

interface VerifyLatestRunPointer {
	readonly schema_version: string;
	readonly command: 'verify';
	readonly kind: 'verify_run_summary';
	readonly correlation_id: string;
	readonly reason: string;
	readonly reasons: readonly string[];
	readonly plan_source: string | null;
	readonly verification_plan_id: string;
	readonly execution_status: VerificationStatus;
	readonly status: VerificationStatus;
	readonly risk_assessment: VerificationRiskAssessment;
	readonly completion_verdict: CompletionVerdict;
	readonly evidence_model: VerificationEvidenceModel;
	readonly conflict_ledger: VerificationEvidenceModel['conflict_ledger'];
	readonly failure_fingerprint: VerificationFailureFingerprint | null;
	readonly failure_replay_capsule: FailureReplayCapsule | null;
	readonly repeated_failure_summary: RepeatedFailureSummary | null;
	readonly summary: VerificationSummary;
	readonly repro_evidence?: ReproEvidenceReport;
	readonly external_checks?: readonly ExternalEvidenceCheck[];
	readonly run_dir: string;
	readonly manifest_path: string;
}

interface PreviousVerifyLatestSummary {
	readonly verification_plan_id: string;
	readonly status: VerificationStatus;
	readonly failure_fingerprint: VerificationFailureFingerprint | null;
}

type PlanOnlyScheduleEntry = ChangeVerificationReport['schedule']['entries'][number] & {
	readonly effectGraph?: LocalCommandEffectGraph;
	readonly preconditions?: readonly CommandPreconditionPlan[];
};

type PlanOnlyRequirement = ChangeVerificationReport['requirements'][number] & {
	readonly surfaceReadModels?: readonly LocalPathSurfaceReadModel[];
};

type PlanOnlyOutput = ChangeVerificationReport & {
	readonly correlation_id: string;
	readonly verification_plan_id: string;
	readonly requirements: readonly PlanOnlyRequirement[];
	readonly schedule: Omit<ChangeVerificationReport['schedule'], 'entries'> & {
		readonly entries: readonly PlanOnlyScheduleEntry[];
	};
};

export function getVerifyHelp(lang: CliLang = 'en'): string {
	return renderHelp(
		{
			usage:
				'mf verify --reason <event> [options] | mf verify --from-classification <path> [options] | mf verify --changed [options]',
			summary: t(lang, 'verify.help.summary'),
			options: [
				{ label: '--reason <event>', description: t(lang, 'verify.help.option.reason') },
				{ label: '--from-classification <path>', description: t(lang, 'verify.help.option.fromClassification') },
				{ label: '--from-plan <path>', description: t(lang, 'verify.help.option.fromPlan') },
				{ label: '--changed', description: t(lang, 'verify.help.option.changed') },
				{ label: '--write-plan <path>', description: t(lang, 'verify.help.option.writePlan') },
				{ label: '--repro-evidence <path>', description: t(lang, 'verify.help.option.reproEvidence') },
				{ label: '--external-evidence <path>', description: t(lang, 'verify.help.option.externalEvidence') },
				{ label: '--parallel <count>', description: t(lang, 'verify.help.option.parallel') },
				{ label: '--profile <edit|commit|release>', description: t(lang, 'verify.help.option.profile') },
				{ label: '--plan-only', description: t(lang, 'verify.help.option.planOnly') },
				{ label: '--json', description: t(lang, 'cli.option.json') },
				{ label: '-h, --help', description: t(lang, 'cli.option.help') },
			],
			examples: [
				'mf verify --reason code_change',
				'mf verify --reason docs_change --json',
				'mf verify --reason docs_change --plan-only --json',
				'mf verify --from-classification .mustflow/state/change-classification.json --json',
				'mf verify --reason bug_fix --repro-evidence repro-evidence.json --json',
				'mf verify --changed --plan-only --json',
				'mf verify --reason mustflow_docs_change',
			],
			exitCodes: [
				{ label: '0', description: t(lang, 'verify.help.exit.ok') },
				{ label: '1', description: t(lang, 'verify.help.exit.fail') },
			],
		},
		lang,
	);
}

function uniqueStrings(values: readonly string[]): string[] {
	return [...new Set(values.map((value) => value.trim()).filter((value) => value.length > 0))];
}

function getVerificationStatus(summary: VerificationSummary): VerificationStatus {
	if (summary.failed > 0) {
		return 'failed';
	}

	if (summary.ran === 0) {
		return 'blocked';
	}

	if (summary.skipped > 0) {
		return 'partial';
	}

	return 'passed';
}

function isVerificationStatus(value: unknown): value is VerificationStatus {
	return value === 'passed' || value === 'partial' || value === 'failed' || value === 'blocked';
}

function readVerificationFailureFingerprint(value: unknown): VerificationFailureFingerprint | null {
	const record = objectField(value);

	if (
		record?.schema_version !== '1' ||
		typeof record.fingerprint !== 'string' ||
		typeof record.verification_plan_id !== 'string' ||
		typeof record.failed_intents_hash !== 'string' ||
		typeof record.exit_code_classes_hash !== 'string' ||
		typeof record.timeout_flags_hash !== 'string' ||
		typeof record.error_kinds_hash !== 'string' ||
		typeof record.diagnostic_hash !== 'string' ||
		typeof record.risk_codes_hash !== 'string' ||
		typeof record.affected_surfaces_hash !== 'string' ||
		typeof record.command_fingerprints_hash !== 'string'
	) {
		return null;
	}

	return {
		schema_version: '1',
		fingerprint: record.fingerprint,
		verification_plan_id: record.verification_plan_id,
		failed_intents_hash: record.failed_intents_hash,
		exit_code_classes_hash: record.exit_code_classes_hash,
		timeout_flags_hash: record.timeout_flags_hash,
		error_kinds_hash: record.error_kinds_hash,
		diagnostic_hash: record.diagnostic_hash,
		risk_codes_hash: record.risk_codes_hash,
		affected_surfaces_hash: record.affected_surfaces_hash,
		command_fingerprints_hash: record.command_fingerprints_hash,
	};
}

function readPreviousVerifyLatestSummary(projectRoot: string): PreviousVerifyLatestSummary | null {
	try {
		const parsed = JSON.parse(
			readUtf8FileInsideWithoutSymlinks(projectRoot, resolveLatestVerifyRunReceiptPath(projectRoot)),
		) as Record<
			string,
			unknown
		>;

		if (
			parsed.command !== 'verify' ||
			parsed.kind !== 'verify_run_summary' ||
			typeof parsed.verification_plan_id !== 'string' ||
			!isVerificationStatus(parsed.status)
		) {
			return null;
		}

		return {
			verification_plan_id: parsed.verification_plan_id,
			status: parsed.status,
			failure_fingerprint: readVerificationFailureFingerprint(parsed.failure_fingerprint),
		};
	} catch {
		return null;
	}
}

function toParallelismReport(settings: VerifyParallelismSettings): VerificationParallelismReport {
	return {
		requested: settings.requested,
		effective: settings.effective,
		repository_max: settings.repositoryMax,
		cpu_available: settings.cpuAvailable,
		capped: settings.capped,
		mode: settings.mode,
		note: settings.note,
	};
}

/**
 * mf:anchor cli.verify.receipt-manifest
 * purpose: Persist verify receipts, latest summary, failure evidence, and completion verdict in one state update boundary.
 * search: mf verify, receipt manifest, latest run, completion verdict, failure fingerprint
 * invariant: Receipt paths and verdict evidence must share the same verification_plan_id.
 * risk: state, data_consistency
 */
function writeVerifyRunReceipts(
	projectRoot: string,
	output: VerificationOutput,
	report: ChangeVerificationReport,
	sourceAnchorRisks: readonly LocalSourceAnchorVerdictRisk[],
	scopeDiffRisks: readonly ScopeDiffRisk[],
	validationRatchetRisks: readonly ValidationRatchetRisk[],
	reproEvidence: ReproEvidenceReport | null,
	externalChecks: readonly ExternalEvidenceCheck[],
): VerificationOutput {
	const currentStateHash = createVerificationCurrentStateHash(projectRoot, report, output.verification_plan_id);
	const statePaths = createVerifyRunStatePaths(projectRoot);
	const receipts: VerifyRunReceiptManifestEntry[] = [];
	const results: VerificationResult[] = [];

	for (const [index, result] of output.results.entries()) {
		let receiptPath: string | null = null;
		let receiptSha256: string | null = null;
		let receipt = result.receipt;

		if (result.intent && result.receipt) {
			const receiptStatePath = createVerifyIntentReceiptPath(statePaths, index + 1, result.intent);
			receiptPath = receiptStatePath.receiptPath;
			receipt = {
				...result.receipt,
				verification_plan_id: output.verification_plan_id,
				...(currentStateHash ? { current_state_hash: currentStateHash } : {}),
				receipt_path: receiptPath,
			};
			const receiptContent = `${JSON.stringify(receipt, null, 2)}\n`;
			receiptSha256 = hashTextSha256(receiptContent);
			writeJsonFileInsideWithoutSymlinks(projectRoot, receiptStatePath.absoluteReceiptPath, receipt);
		}

		receipts.push({
			intent: result.intent,
			status: result.status,
			skipped: result.skipped,
			verification_plan_id: result.skipped ? null : output.verification_plan_id,
			receipt_path: receiptPath,
			receipt_sha256: receiptSha256,
		});
		results.push({
			...result,
			verification_plan_id: result.skipped ? null : output.verification_plan_id,
			receipt_path: receiptPath,
			receipt_sha256: receiptSha256,
			receipt,
		});
	}

	const reproEvidenceRisks = createReproEvidenceRisks(reproEvidence, {
		verificationPlanId: output.verification_plan_id,
	});
	const reproEvidenceVerdictEffects = countReproEvidenceVerdictEffects(reproEvidenceRisks);
	const validationRatchetVerdictEffects = countValidationRatchetVerdictEffects(validationRatchetRisks);
	const externalEvidenceRisks = createExternalEvidenceRisks(externalChecks);
	const failureFingerprint = createFailureFingerprintForVerify({
		verificationPlanId: output.verification_plan_id,
		report,
		results,
		riskCodes: riskCodesForFailureFingerprint({
			sourceAnchorRisks,
			scopeDiffRisks,
			validationRatchetRisks,
			reproEvidenceRisks,
			externalEvidenceRisks,
			results,
		}),
	});
	const failureReplayCapsule = createFailureReplayCapsule({
		projectRoot,
		verificationPlanId: output.verification_plan_id,
		status: output.status,
		reasons: output.reasons,
		report,
		results,
		failureFingerprint,
	});
	const repeatedFailureSummary = updateRepeatedFailureState({
		projectRoot,
		failureFingerprint,
		status: output.status,
	});
	const previousVerifyLatest = readPreviousVerifyLatestSummary(projectRoot);
	const finalRepeatedFailureRisks = createRepeatedFailureRisks({
		previousFailureFingerprint: previousVerifyLatest?.failure_fingerprint ?? null,
		previousStatus: previousVerifyLatest?.status ?? null,
		currentFailureFingerprint: failureFingerprint,
		currentStatus: output.status,
		currentSummary: repeatedFailureSummary,
	});
	const completionVerdict = createCompletionVerdictForResults({
		report,
		verificationPlanId: output.verification_plan_id,
		summary: output.summary,
		results,
		sourceAnchorRiskCount: sourceAnchorRisks.length,
		scopeDiffRiskCount: scopeDiffRisks.length,
		repeatedFailureRisks: finalRepeatedFailureRisks,
		validationRatchetRiskCount: validationRatchetRisks.length,
		validationRatchetContradictionCount: validationRatchetVerdictEffects.contradicted,
		reproEvidenceRiskCount: reproEvidenceRisks.length,
		reproEvidenceContradictionCount: reproEvidenceVerdictEffects.contradicted,
		reproEvidenceUnverifiedCount: reproEvidenceVerdictEffects.unverified,
		externalEvidenceRiskCount: externalEvidenceRisks.length,
	});
	const evidenceModel = createVerifyEvidenceModel({
		report,
		results,
		verificationPlanId: output.verification_plan_id,
		verdict: completionVerdict,
		sourceAnchorRisks,
		scopeDiffRisks,
		repeatedFailureRisks: finalRepeatedFailureRisks,
		validationRatchetRisks,
		reproEvidence,
		reproEvidenceRisks,
		externalChecks,
		externalEvidenceRisks,
		failureReplayCapsule,
	});
	const outputWithReceiptPaths: VerificationOutput = {
		...output,
		completion_verdict: completionVerdict,
		evidence_model: evidenceModel,
		conflict_ledger: evidenceModel.conflict_ledger,
		failure_fingerprint: failureFingerprint,
		failure_replay_capsule: failureReplayCapsule,
		repeated_failure_summary: repeatedFailureSummary,
		run_dir: statePaths.runDir,
		manifest_path: statePaths.manifestPath,
		results,
	};

	const manifest: VerifyRunReceiptManifest = {
		schema_version: '1',
		command: 'verify',
		correlation_id: outputWithReceiptPaths.correlation_id,
		reason: outputWithReceiptPaths.reason,
		reasons: outputWithReceiptPaths.reasons,
		plan_source: outputWithReceiptPaths.plan_source,
		verification_plan_id: outputWithReceiptPaths.verification_plan_id,
		execution_status: outputWithReceiptPaths.execution_status,
		status: outputWithReceiptPaths.status,
		risk_assessment: outputWithReceiptPaths.risk_assessment,
		completion_verdict: outputWithReceiptPaths.completion_verdict,
		evidence_model: outputWithReceiptPaths.evidence_model,
		conflict_ledger: outputWithReceiptPaths.conflict_ledger,
		failure_fingerprint: outputWithReceiptPaths.failure_fingerprint,
		failure_replay_capsule: outputWithReceiptPaths.failure_replay_capsule,
		repeated_failure_summary: outputWithReceiptPaths.repeated_failure_summary,
		summary: outputWithReceiptPaths.summary,
		...(outputWithReceiptPaths.repro_evidence ? { repro_evidence: outputWithReceiptPaths.repro_evidence } : {}),
		...(outputWithReceiptPaths.external_checks ? { external_checks: outputWithReceiptPaths.external_checks } : {}),
		receipts,
	};

	writeJsonFileInsideWithoutSymlinks(projectRoot, statePaths.absoluteManifestPath, manifest);

	const latest: VerifyLatestRunPointer = {
		schema_version: '1',
		command: 'verify',
		kind: 'verify_run_summary',
		correlation_id: outputWithReceiptPaths.correlation_id,
		reason: outputWithReceiptPaths.reason,
		reasons: outputWithReceiptPaths.reasons,
		plan_source: outputWithReceiptPaths.plan_source,
		verification_plan_id: outputWithReceiptPaths.verification_plan_id,
		execution_status: outputWithReceiptPaths.execution_status,
		status: outputWithReceiptPaths.status,
		risk_assessment: outputWithReceiptPaths.risk_assessment,
		completion_verdict: outputWithReceiptPaths.completion_verdict,
		evidence_model: outputWithReceiptPaths.evidence_model,
		conflict_ledger: outputWithReceiptPaths.conflict_ledger,
		failure_fingerprint: outputWithReceiptPaths.failure_fingerprint,
		failure_replay_capsule: outputWithReceiptPaths.failure_replay_capsule,
		repeated_failure_summary: outputWithReceiptPaths.repeated_failure_summary,
		summary: outputWithReceiptPaths.summary,
		...(outputWithReceiptPaths.repro_evidence ? { repro_evidence: outputWithReceiptPaths.repro_evidence } : {}),
		...(outputWithReceiptPaths.external_checks ? { external_checks: outputWithReceiptPaths.external_checks } : {}),
		run_dir: statePaths.runDir,
		manifest_path: statePaths.manifestPath,
	};

	writeJsonFileInsideWithoutSymlinks(projectRoot, resolveLatestVerifyRunReceiptPath(projectRoot), latest);
	updateRunReceiptState(projectRoot, resolveRunReceiptRetentionPolicy(readMustflowConfigIfExists(projectRoot)));
	return outputWithReceiptPaths;
}

/**
 * mf:anchor cli.verify.output-model
 * purpose: Create the verification output from classification, command contract, selected intents, and evidence risk models.
 * search: verification output, risk assessment, source anchors, validation ratchet, external evidence
 * invariant: Completion verdict risk counts must be derived from the same report and results that produce receipts.
 * risk: state, data_consistency
 */
async function createVerifyOutput(
	input: VerifyInput,
	planSource: string | null,
	projectRoot: string,
	lang: CliLang,
	reproEvidence: ReproEvidenceReport | null = null,
	externalChecks: readonly ExternalEvidenceCheck[] = [],
	parallelism = DEFAULT_VERIFY_PARALLELISM,
	parallelismReport: VerificationParallelismReport | null = null,
	profile: VerificationProfile = 'edit',
): Promise<VerificationOutput> {
	const contract = readCommandContract(projectRoot);
	const report = createChangeVerificationReport(input.classificationReport, contract, projectRoot, profile);
	const verificationPlanId = createVerificationPlanId(report, contract);
	const scheduledIntents = new Set(report.schedule.entries.map((entry) => entry.intent));
	const scheduledTestTargets = testTargetsByScheduledIntent(report);
	const sourceAnchorRisks = await readLocalSourceAnchorVerdictRisks(projectRoot, report.files);
	const scopeDiffRisks = createScopeDiffRisks(input.classificationReport);
	const validationRatchetRisks = createValidationRatchetRisks(input.classificationReport, projectRoot);
	const validationRatchetVerdictEffects = countValidationRatchetVerdictEffects(validationRatchetRisks);
	const reproEvidenceRisks = createReproEvidenceRisks(reproEvidence, { verificationPlanId });
	const reproEvidenceVerdictEffects = countReproEvidenceVerdictEffects(reproEvidenceRisks);
	const externalEvidenceRisks = createExternalEvidenceRisks(externalChecks);
	const currentStateHash = createVerificationCurrentStateHash(projectRoot, report, verificationPlanId);
	const mayReuse = profile !== 'release' && !['high', 'critical'].includes(report.risk_assessment.level);
	const reusableResults = mayReuse ? readReusableVerificationResults(projectRoot, verificationPlanId, currentStateHash) : new Map<string, VerificationResult>();
	const results = await runScheduledVerificationIntents(report, projectRoot, lang, verificationPlanId, input.correlationId, scheduledTestTargets, parallelism, reusableResults);

	results.push(...createSkippedResults(report.candidates, scheduledIntents, report.gaps));
	const summary = summarizeResults(results);
	const status = getVerificationStatus(summary);
	const previousVerifyLatest = readPreviousVerifyLatestSummary(projectRoot);
	const failureFingerprint = createFailureFingerprintForVerify({
		verificationPlanId,
		report,
		results,
		riskCodes: riskCodesForFailureFingerprint({
			sourceAnchorRisks,
			scopeDiffRisks,
			validationRatchetRisks,
			reproEvidenceRisks,
			externalEvidenceRisks,
			results,
		}),
	});
	const repeatedFailureRisks = createRepeatedFailureRisks({
		previousFailureFingerprint: previousVerifyLatest?.failure_fingerprint ?? null,
		previousStatus: previousVerifyLatest?.status ?? null,
		currentFailureFingerprint: failureFingerprint,
		currentStatus: status,
	});
	const completionVerdict = createCompletionVerdictForResults({
		report,
		verificationPlanId,
		summary,
		results,
		sourceAnchorRiskCount: sourceAnchorRisks.length,
		scopeDiffRiskCount: scopeDiffRisks.length,
		repeatedFailureRisks,
		validationRatchetRiskCount: validationRatchetRisks.length,
		validationRatchetContradictionCount: validationRatchetVerdictEffects.contradicted,
		reproEvidenceRiskCount: reproEvidenceRisks.length,
		reproEvidenceContradictionCount: reproEvidenceVerdictEffects.contradicted,
		reproEvidenceUnverifiedCount: reproEvidenceVerdictEffects.unverified,
		externalEvidenceRiskCount: externalEvidenceRisks.length,
	});
	const evidenceModel = createVerifyEvidenceModel({
		report,
		results,
		verificationPlanId,
		verdict: completionVerdict,
		sourceAnchorRisks,
		scopeDiffRisks,
		repeatedFailureRisks,
		validationRatchetRisks,
		reproEvidence,
		reproEvidenceRisks,
		externalChecks,
		externalEvidenceRisks,
	});

	const output: VerificationOutput = {
		schema_version: VERIFY_SCHEMA_VERSION,
		command: 'verify',
		correlation_id: input.correlationId,
		mustflow_root: projectRoot,
		reason: input.reasons.join(', '),
		reasons: input.reasons,
		plan_source: planSource,
		verification_plan_id: verificationPlanId,
		execution_status: status,
		status,
		risk_assessment: report.risk_assessment,
		completion_verdict: completionVerdict,
		evidence_model: evidenceModel,
		conflict_ledger: evidenceModel.conflict_ledger,
		failure_fingerprint: failureFingerprint,
		failure_replay_capsule: null,
		repeated_failure_summary: null,
		summary,
		...(parallelismReport ? { parallelism: parallelismReport } : {}),
		...(reproEvidence ? { repro_evidence: reproEvidence } : {}),
		...(externalChecks.length > 0 ? { external_checks: externalChecks } : {}),
		run_dir: '',
		manifest_path: '',
		results,
	};

	return writeVerifyRunReceipts(
		projectRoot,
		output,
		report,
		sourceAnchorRisks,
		scopeDiffRisks,
		validationRatchetRisks,
		reproEvidence,
		externalChecks,
	);
}

async function createPlanOnlyOutput(input: VerifyInput, projectRoot: string, profile: VerificationProfile): Promise<PlanOnlyOutput> {
	const contract = readCommandContract(projectRoot);
	const report = createChangeVerificationReport(input.classificationReport, contract, projectRoot, profile);
	const verificationPlanId = createVerificationPlanId(report, contract);
	const localSurfaceReadModels = await readLocalPathSurfaces(projectRoot, report.files);
	const [firstEntry] = report.schedule.entries;
	const requirements = report.requirements.map((requirement) => {
		const surfaceReadModels = requirement.files
			.map((filePath) => localSurfaceReadModels.get(filePath))
			.filter((readModel): readModel is LocalPathSurfaceReadModel => Boolean(readModel));

		return surfaceReadModels.length > 0 ? { ...requirement, surfaceReadModels } : requirement;
	});

	if (!firstEntry) {
		return { ...report, correlation_id: input.correlationId, verification_plan_id: verificationPlanId, requirements };
	}

	const scheduledIntents = Array.from(new Set(report.schedule.entries.map((entry) => entry.intent)));
	const graphsByIntent = await readLocalCommandEffectGraphs(projectRoot, scheduledIntents);
	const preconditionsByIntent = new Map(
		scheduledIntents.map((intent) => [intent, evaluateCommandPreconditions(projectRoot, contract, intent)]),
	);
	const firstGraph = graphsByIntent.get(firstEntry.intent);

	if (!firstGraph) {
		return {
			...report,
			correlation_id: input.correlationId,
			verification_plan_id: verificationPlanId,
			requirements,
			schedule: {
				...report.schedule,
				entries: report.schedule.entries.map((entry) => ({
					...entry,
					preconditions: preconditionsByIntent.get(entry.intent) ?? [],
				})),
			},
		};
	}

	return {
		...report,
		correlation_id: input.correlationId,
		verification_plan_id: verificationPlanId,
		requirements,
		schedule: {
			...report.schedule,
			entries: report.schedule.entries.map((entry) => ({
				...entry,
				effectGraph: graphsByIntent.get(entry.intent) ?? firstGraph,
				preconditions: preconditionsByIntent.get(entry.intent) ?? [],
			})),
		},
	};
}

function renderVerifyOutput(output: VerificationOutput, lang: CliLang): string {
	const lines = [
		t(lang, 'verify.title'),
		`${t(lang, 'label.mustflowRoot')}: ${output.mustflow_root}`,
		`${t(lang, 'verify.label.reason')}: ${output.reason}`,
		`${t(lang, 'verify.label.planSource')}: ${output.plan_source ?? t(lang, 'value.none')}`,
		`${t(lang, 'verify.label.status')}: ${output.status}`,
		`${t(lang, 'verify.label.completionVerdict')}: ${output.completion_verdict.status} (${output.completion_verdict.primary_reason})`,
		`${t(lang, 'verify.label.matched')}: ${output.summary.matched}`,
		`${t(lang, 'verify.label.ran')}: ${output.summary.ran}`,
		`${t(lang, 'verify.label.passed')}: ${output.summary.passed}`,
		`${t(lang, 'verify.label.failed')}: ${output.summary.failed}`,
		`${t(lang, 'verify.label.skipped')}: ${output.summary.skipped}`,
	];

	if (output.parallelism) {
		const cpuAvailable = output.parallelism.cpu_available ?? t(lang, 'value.none');
		lines.push(
			`${t(lang, 'verify.label.parallelism')}: ${t(lang, 'verify.parallelism.summary', {
				requested: output.parallelism.requested,
				effective: output.parallelism.effective,
				repositoryMax: output.parallelism.repository_max,
				cpuAvailable,
				mode: output.parallelism.mode,
			})}`,
		);
		if (output.parallelism.capped) {
			lines.push(`${t(lang, 'verify.label.parallelismNote')}: ${output.parallelism.note}`);
		}
	}

	lines.push('', t(lang, 'verify.label.results'));

	for (const result of output.results) {
		const intent = result.intent ?? t(lang, 'value.none');
		const reason = result.reason ? ` (${result.reason})` : '';
		lines.push(`- ${intent}: ${result.status}${reason}`);
	}

	return lines.join('\n');
}

export async function runVerify(args: string[], reporter: Reporter, lang: CliLang = 'en'): Promise<number> {
	if (hasCliOptionToken(args, '--help', ['-h'])) {
		reporter.stdout(getVerifyHelp(lang));
		return 0;
	}

	const parsed = parseVerifyArgs(args);

	if (parsed.error) {
		const message =
			parsed.error === 'missing_reason_value'
				? t(lang, 'cli.error.missingValue', { option: '--reason' })
				: parsed.error === 'missing_parallel_value'
					? t(lang, 'cli.error.missingValue', { option: '--parallel' })
				: parsed.error === 'invalid_parallel_value'
					? t(lang, 'verify.error.invalidParallel')
				: parsed.error === 'missing_profile_value'
					? t(lang, 'cli.error.missingValue', { option: '--profile' })
				: parsed.error === 'invalid_profile_value'
					? t(lang, 'verify.error.invalidProfile')
				: parsed.error === 'missing_from_classification_value'
					? t(lang, 'cli.error.missingValue', { option: '--from-classification' })
				: parsed.error === 'missing_from_plan_value'
					? t(lang, 'cli.error.missingValue', { option: '--from-plan' })
				: parsed.error === 'missing_write_plan_value'
					? t(lang, 'cli.error.missingValue', { option: '--write-plan' })
				: parsed.error === 'missing_repro_evidence_value'
					? t(lang, 'cli.error.missingValue', { option: '--repro-evidence' })
				: parsed.error === 'missing_external_evidence_value'
					? t(lang, 'cli.error.missingValue', { option: '--external-evidence' })
				: parsed.error.startsWith('unexpected:')
					? t(lang, 'cli.error.unexpectedArgument', { argument: parsed.error.slice('unexpected:'.length) })
					: t(lang, 'cli.error.unknownOption', { option: parsed.error });
		printUsageError(reporter, message, 'mf verify --help', getVerifyHelp(lang), lang);
		return 1;
	}

	const selectedInputCount = [
		parsed.reason,
		parsed.fromClassification,
		parsed.fromPlan,
		parsed.changed ? 'changed' : undefined,
	].filter(Boolean).length;

	if (selectedInputCount > 1) {
		printUsageError(reporter, t(lang, 'verify.error.conflictingInputs'), 'mf verify --help', getVerifyHelp(lang), lang);
		return 1;
	}

	if (selectedInputCount === 0) {
		printUsageError(reporter, t(lang, 'verify.error.missingReason'), 'mf verify --help', getVerifyHelp(lang), lang);
		return 1;
	}

	if (parsed.writePlan && !parsed.changed) {
		printUsageError(reporter, t(lang, 'verify.error.writePlanRequiresChanged'), 'mf verify --help', getVerifyHelp(lang), lang);
		return 1;
	}

	if (parsed.planOnly && !parsed.json) {
		printUsageError(reporter, t(lang, 'verify.error.planOnlyJson'), 'mf verify --help', getVerifyHelp(lang), lang);
		return 1;
	}

	if (parsed.planOnly && parsed.reproEvidence) {
		printUsageError(reporter, t(lang, 'verify.error.reproEvidenceRequiresRun'), 'mf verify --help', getVerifyHelp(lang), lang);
		return 1;
	}

	if (parsed.planOnly && parsed.externalEvidence) {
		printUsageError(reporter, t(lang, 'verify.error.externalEvidenceRequiresRun'), 'mf verify --help', getVerifyHelp(lang), lang);
		return 1;
	}

	const projectRoot = resolveMustflowRoot();
	let input: VerifyInput;
	let changedPlan: ClassifyOutput | null = null;
	let reproEvidence: ReproEvidenceReport | null = null;
	let externalChecks: readonly ExternalEvidenceCheck[] = [];

	try {
		if (parsed.writePlan) {
			resolveVerifyInputPath(projectRoot, parsed.writePlan);
		}

		if (parsed.changed) {
			const changedInput = createInputFromChanged(projectRoot);
			input = changedInput.input;
			changedPlan = changedInput.plan;
		} else if (parsed.fromClassification || parsed.fromPlan) {
			input = readInputFromClassificationReport(projectRoot, (parsed.fromClassification ?? parsed.fromPlan) as string);
		} else {
			input = {
				correlationId: createCorrelationId('verify'),
				reasons: [parsed.reason as string],
				classificationReport: createSyntheticClassificationReport([parsed.reason as string]),
			};
		}

		if (parsed.writePlan && changedPlan) {
			writeChangedPlan(projectRoot, parsed.writePlan, changedPlan);
		}

		if (parsed.reproEvidence) {
			reproEvidence = readReproEvidenceFile(projectRoot, parsed.reproEvidence);
		}

		if (parsed.externalEvidence) {
			externalChecks = readExternalEvidenceFile(projectRoot, parsed.externalEvidence);
		}
	} catch (error) {
		const code = error instanceof Error ? error.message : 'invalid_plan_file';
		const message =
			code === 'invalid_repro_evidence_file'
				? t(lang, 'verify.error.invalid_repro_evidence_file')
				: code === 'unsupported_repro_evidence_source'
					? t(lang, 'verify.error.unsupported_repro_evidence_source')
					: code === 'invalid_external_evidence_file'
						? t(lang, 'verify.error.invalid_external_evidence_file')
						: code === 'unsupported_external_evidence_source'
							? t(lang, 'verify.error.unsupported_external_evidence_source')
							: t(lang, planErrorMessageKey(code));
		printUsageError(reporter, message, 'mf verify --help', getVerifyHelp(lang), lang);
		return 1;
	}

	if (parsed.planOnly) {
		reporter.stdout(JSON.stringify(await createPlanOnlyOutput(input, projectRoot, parsed.profile), null, 2));
		return 0;
	}

	const parallelismSettings = resolveVerifyParallelism(parsed.parallelism ?? DEFAULT_VERIFY_PARALLELISM);
	const parallelismReport = parsed.parallelismSpecified ? toParallelismReport(parallelismSettings) : null;
	const output = await createVerifyOutput(
		input,
		parsed.fromClassification ?? parsed.fromPlan ?? (parsed.changed ? 'changed' : null),
		projectRoot,
		lang,
		reproEvidence,
		externalChecks,
		parallelismSettings.effective,
		parallelismReport,
		parsed.profile,
	);

	if (parsed.json) {
		reporter.stdout(JSON.stringify(output, null, 2));
	} else {
		reporter.stdout(renderVerifyOutput(output, lang));
	}

	return output.completion_verdict.status === 'verified' ? 0 : 1;
}
