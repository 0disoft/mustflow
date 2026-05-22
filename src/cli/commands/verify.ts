import { createHash } from 'node:crypto';

import type { ClassifyOutput } from './classify.js';
import { runRun } from './run.js';
import {
	createChangeVerificationReport,
	type ChangeVerificationCandidate,
	type ChangeVerificationReport,
} from '../../core/change-verification.js';
import { createCorrelationId } from '../../core/correlation-id.js';
import { readUtf8FileInsideWithoutSymlinks, writeJsonFileInsideWithoutSymlinks } from '../../core/safe-filesystem.js';
import {
	createVerifyCompletionVerdict,
	type CompletionVerdict,
	type CompletionVerdictCriteriaEvidence,
	type CompletionVerdictReceiptBindingEvidence,
} from '../../core/completion-verdict.js';
import {
	createExternalEvidenceRisks,
	type ExternalEvidenceCheck,
} from '../../core/external-evidence.js';
import {
	createRepeatedFailureRisks,
	createVerificationFailureFingerprint,
	updateRepeatedFailureState,
	type RepeatedFailureSummary,
	type RepeatedFailureRisk,
	type VerificationFailureFingerprint,
} from '../../core/repeated-failure.js';
import {
	countReproEvidenceVerdictEffects,
	createReproEvidenceRisks,
	type ReproEvidenceReport,
} from '../../core/repro-evidence.js';
import { createVerifyEvidenceModel, type VerificationEvidenceModel } from '../../core/verification-evidence.js';
import { createScopeDiffRisks, type ScopeDiffRisk } from '../../core/scope-risk.js';
import {
	countValidationRatchetVerdictEffects,
	createValidationRatchetRisks,
	type ValidationRatchetRisk,
} from '../../core/validation-ratchet.js';
import {
	finishRunWriteBatchTracking,
	startRunWriteBatchTracking,
	type RunWriteBatchIntent,
	type RunWriteDriftReceipt,
} from '../../core/run-write-drift.js';
import type { VerificationCandidate } from '../../core/verification-plan.js';
import { readCommandContract } from '../../core/config-loading.js';
import {
	evaluateCommandPreconditions,
	type CommandPreconditionPlan,
} from '../../core/command-preconditions.js';
import {
	DEFAULT_VERIFY_PARALLELISM,
	parseVerifyArgs,
	resolveVerifyParallelism,
	type VerifyParallelismSettings,
} from './verify/args.js';
import {
	createInputFromChanged,
	createSyntheticClassificationReport,
	planErrorMessageKey,
	readInputFromClassificationReport,
	resolveVerifyInputPath,
	writeChangedPlan,
	type VerifyInput,
} from './verify/input.js';
import { readExternalEvidenceFile, readReproEvidenceFile } from './verify/evidence-input.js';
import {
	createVerifyIntentReceiptPath,
	createVerifyRunStatePaths,
	resolveLatestVerifyRunReceiptPath,
} from './verify/state-paths.js';
import { printUsageError, renderHelp } from '../lib/cli-output.js';
import { t, type CliLang } from '../lib/i18n.js';
import {
	readLocalCommandEffectGraphs,
	readLocalPathSurfaces,
	readLocalSourceAnchorVerdictRisks,
	type LocalCommandEffectGraph,
	type LocalPathSurfaceReadModel,
	type LocalSourceAnchorVerdictRisk,
} from '../lib/local-index.js';
import { resolveMustflowRoot } from '../lib/project-root.js';
import type { Reporter } from '../lib/reporter.js';

export { planErrorMessageKey, readInputFromClassificationReport } from './verify/input.js';

const VERIFY_SCHEMA_VERSION = '1';

type VerificationStatus = 'passed' | 'partial' | 'failed' | 'blocked';
type VerificationResultStatus =
	| 'passed'
	| 'failed'
	| 'timed_out'
	| 'start_failed'
	| 'output_limit_exceeded'
	| 'skipped';

interface BufferedOutput {
	readonly reporter: Reporter;
	readonly stdout: () => string;
	readonly stderr: () => string;
}

interface VerificationResult {
	readonly intent: string | null;
	readonly status: VerificationResultStatus;
	readonly skipped: boolean;
	readonly reason: string | null;
	readonly detail: string | null;
	readonly exit_code: number | null;
	readonly verification_plan_id: string | null;
	readonly receipt_path: string | null;
	readonly receipt_sha256: string | null;
	readonly receipt: Record<string, unknown> | null;
}

interface VerificationSummary {
	readonly matched: number;
	readonly ran: number;
	readonly passed: number;
	readonly failed: number;
	readonly skipped: number;
}

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
	readonly completion_verdict: CompletionVerdict;
	readonly evidence_model: VerificationEvidenceModel;
	readonly failure_fingerprint: VerificationFailureFingerprint | null;
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
	readonly completion_verdict: CompletionVerdict;
	readonly evidence_model: VerificationEvidenceModel;
	readonly failure_fingerprint: VerificationFailureFingerprint | null;
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
	readonly completion_verdict: CompletionVerdict;
	readonly evidence_model: VerificationEvidenceModel;
	readonly failure_fingerprint: VerificationFailureFingerprint | null;
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

function createBufferedOutput(): BufferedOutput {
	const stdout: string[] = [];
	const stderr: string[] = [];

	return {
		reporter: {
			stdout(message) {
				stdout.push(`${message}\n`);
			},
			stderr(message) {
				stderr.push(`${message}\n`);
			},
		},
		stdout() {
			return stdout.join('');
		},
		stderr() {
			return stderr.join('');
		},
	};
}

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

function skippedResult(candidate: Pick<VerificationCandidate, 'intent' | 'reason' | 'detail'>): VerificationResult {
	return {
		intent: candidate.intent || null,
		status: 'skipped',
		skipped: true,
		reason: candidate.reason,
		detail: candidate.detail,
		exit_code: null,
		verification_plan_id: null,
		receipt_path: null,
		receipt_sha256: null,
		receipt: null,
	};
}

function stoppedAfterFailedBatchResult(entry: VerificationScheduleEntry, verificationPlanId: string): VerificationResult {
	return {
		intent: entry.intent,
		status: 'skipped',
		skipped: true,
		reason: 'stopped_after_failed_batch',
		detail: 'Skipped because an earlier verification batch failed and the schedule failure policy stops before the next batch.',
		exit_code: null,
		verification_plan_id: verificationPlanId,
		receipt_path: null,
		receipt_sha256: null,
		receipt: null,
	};
}

function candidateResultKey(candidate: ChangeVerificationCandidate): string {
	return candidate.intent
		? `intent:${candidate.intent}`
		: `missing:${candidate.reason}:${candidate.skipReason ?? ''}:${candidate.detail ?? ''}`;
}

function createSkippedResults(
	candidates: readonly ChangeVerificationCandidate[],
	scheduledIntents: ReadonlySet<string>,
	gaps: readonly ChangeVerificationReport['gaps'][number][],
): VerificationResult[] {
	const seen = new Set<string>();
	const results: VerificationResult[] = [];
	const activeGapReasons = new Set(gaps.map((gap) => gap.reason));

	for (const candidate of candidates) {
		if (candidate.status === 'runnable' || (candidate.intent && scheduledIntents.has(candidate.intent))) {
			continue;
		}

		if (candidate.candidateState === 'gap' && !activeGapReasons.has(candidate.reason)) {
			continue;
		}

		const key = candidateResultKey(candidate);
		if (seen.has(key)) {
			continue;
		}

		seen.add(key);
		results.push(
			skippedResult({
				intent: candidate.intent ?? '',
				reason: candidate.skipReason,
				detail: candidate.detail,
			}),
		);
	}

	return results;
}

function testTargetsByScheduledIntent(report: ChangeVerificationReport): ReadonlyMap<string, readonly string[]> {
	return new Map(
		report.test_selection.selected
			.filter(
				(candidate) =>
					candidate.status === 'runnable' &&
					candidate.testTargetsApplied &&
					candidate.appliedTestTargets.length > 0,
			)
			.map((candidate) => [candidate.intent, candidate.appliedTestTargets] as const),
	);
}

async function runVerificationIntent(
	intent: string,
	lang: CliLang,
	verificationPlanId: string,
	correlationId: string,
	testTargets: readonly string[] = [],
	additionalDeclaredWritePaths: readonly string[] = [],
): Promise<VerificationResult> {
	const output = createBufferedOutput();
	const exitCode = await runRun([intent, '--json'], output.reporter, lang, {
		correlationId,
		writeLatestReceipt: false,
		writeLatestProfile: false,
		recordPerformanceHistory: false,
		testTargets,
		additionalDeclaredWritePaths,
	});
	const rawStdout = output.stdout().trim();
	let receipt: Record<string, unknown> | null = null;
	let status: VerificationResultStatus = exitCode === 0 ? 'passed' : 'failed';

	try {
		const parsed = JSON.parse(rawStdout) as Record<string, unknown>;
		receipt = parsed;
		const receiptStatus = parsed.status;
		if (
			receiptStatus === 'passed' ||
			receiptStatus === 'failed' ||
			receiptStatus === 'timed_out' ||
			receiptStatus === 'start_failed' ||
			receiptStatus === 'output_limit_exceeded'
		) {
			status = receiptStatus;
		}
	} catch {
		status = 'failed';
	}

	return {
		intent,
		status,
		skipped: false,
		reason: exitCode === 0 ? null : 'run_failed',
		detail: output.stderr().trim() || null,
		exit_code: exitCode,
		verification_plan_id: verificationPlanId,
		receipt_path: null,
		receipt_sha256: null,
		receipt,
	};
}

type VerificationScheduleEntry = ChangeVerificationReport['schedule']['entries'][number];
type VerificationScheduleBatch = ChangeVerificationReport['schedule']['batches'][number];

function entriesForScheduleBatch(
	entries: readonly VerificationScheduleEntry[],
	batch: VerificationScheduleBatch,
): VerificationScheduleEntry[] {
	const batchIntents = new Set(batch.intents);
	return entries.filter((entry) => batchIntents.has(entry.intent));
}

async function runVerificationEntriesSequentially(
	entries: readonly VerificationScheduleEntry[],
	lang: CliLang,
	verificationPlanId: string,
	correlationId: string,
	scheduledTestTargets: ReadonlyMap<string, readonly string[]>,
): Promise<VerificationResult[]> {
	const results: VerificationResult[] = [];

	for (const entry of entries) {
		results.push(await runVerificationIntent(entry.intent, lang, verificationPlanId, correlationId, scheduledTestTargets.get(entry.intent) ?? []));
	}

	return results;
}

async function runVerificationEntriesInParallelChunks(
	projectRoot: string,
	entries: readonly VerificationScheduleEntry[],
	parallelism: number,
	lang: CliLang,
	verificationPlanId: string,
	correlationId: string,
	scheduledTestTargets: ReadonlyMap<string, readonly string[]>,
): Promise<VerificationResult[]> {
	const results: VerificationResult[] = [];

	for (let index = 0; index < entries.length; index += parallelism) {
		const chunk = entries.slice(index, index + parallelism);
		const batchTracker = startRunWriteBatchTracking(projectRoot);

		const chunkResults = await Promise.all(
			chunk.map((entry) =>
				runVerificationIntent(
					entry.intent,
					lang,
					verificationPlanId,
					correlationId,
					scheduledTestTargets.get(entry.intent) ?? [],
				),
			),
		);
		const writeDriftByIntent = finishRunWriteBatchTracking(
			batchTracker,
			chunk.map((entry) => ({
				intentName: entry.intent,
				declaredPaths: declaredWritePathsForScheduleEntry(entry),
				observedPaths: observedWriteDriftPaths(chunkResults.find((result) => result.intent === entry.intent)),
			} satisfies RunWriteBatchIntent)),
		);

		results.push(...chunkResults.map((result) => applyParallelChunkWriteDrift(result, writeDriftByIntent)));
	}

	return results;
}

function declaredWritePathsForScheduleEntry(entry: VerificationScheduleEntry): readonly string[] {
	return [
		...new Set(
			entry.effects
				.filter((effect) => effect.access === 'write' && typeof effect.path === 'string')
				.map((effect) => effect.path as string),
		),
	].sort((left, right) => left.localeCompare(right));
}

function observedWriteDriftPaths(result: VerificationResult | undefined): readonly string[] {
	const writeDrift = objectField(result?.receipt?.write_drift);
	const observedPaths = writeDrift?.observed_paths;
	if (!Array.isArray(observedPaths)) {
		return [];
	}

	return observedPaths.filter((value): value is string => typeof value === 'string');
}

function applyParallelChunkWriteDrift(
	result: VerificationResult,
	writeDriftByIntent: ReadonlyMap<string, RunWriteDriftReceipt>,
): VerificationResult {
	if (!result.intent || !result.receipt) {
		return result;
	}

	const writeDrift = writeDriftByIntent.get(result.intent);
	if (!writeDrift) {
		return result;
	}

	return {
		...result,
		receipt: {
			...result.receipt,
			write_drift: writeDrift,
		},
	};
}

function verificationResultFailed(result: VerificationResult): boolean {
	return (
		!result.skipped &&
		(result.status === 'failed' ||
			result.status === 'timed_out' ||
			result.status === 'start_failed' ||
			result.status === 'output_limit_exceeded')
	);
}

async function runScheduledVerificationIntents(
	report: ChangeVerificationReport,
	projectRoot: string,
	lang: CliLang,
	verificationPlanId: string,
	correlationId: string,
	scheduledTestTargets: ReadonlyMap<string, readonly string[]>,
	parallelism: number,
): Promise<VerificationResult[]> {
	const results: VerificationResult[] = [];

	for (let batchIndex = 0; batchIndex < report.schedule.batches.length; batchIndex += 1) {
		const batch = report.schedule.batches[batchIndex] as VerificationScheduleBatch;
		const entries = entriesForScheduleBatch(report.schedule.entries, batch);
		if (entries.length === 0) {
			continue;
		}

		let batchResults: VerificationResult[];
		if (entries.length > 1 && entries.every((entry) => entry.parallelEligible)) {
			batchResults =
				parallelism > DEFAULT_VERIFY_PARALLELISM
					? await runVerificationEntriesInParallelChunks(
							projectRoot,
							entries,
							parallelism,
							lang,
							verificationPlanId,
							correlationId,
							scheduledTestTargets,
						)
					: await runVerificationEntriesSequentially(entries, lang, verificationPlanId, correlationId, scheduledTestTargets);
		} else {
			batchResults = await runVerificationEntriesSequentially(entries, lang, verificationPlanId, correlationId, scheduledTestTargets);
		}

		results.push(...batchResults);
		if (!batchResults.some(verificationResultFailed)) {
			continue;
		}

		const remainingEntries = report.schedule.batches
			.slice(batchIndex + 1)
			.flatMap((remainingBatch) => entriesForScheduleBatch(report.schedule.entries, remainingBatch));
		results.push(...remainingEntries.map((entry) => stoppedAfterFailedBatchResult(entry, verificationPlanId)));
		break;
	}

	return results;
}

function summarizeResults(results: readonly VerificationResult[]): VerificationSummary {
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

function countUndeclaredWriteDrift(results: readonly VerificationResult[]): number {
	return results.filter((result) => {
		const writeDrift = result.receipt?.write_drift;
		if (typeof writeDrift !== 'object' || writeDrift === null) {
			return false;
		}
		return (writeDrift as { readonly has_undeclared_changes?: unknown }).has_undeclared_changes === true;
	}).length;
}

function stringField(value: unknown): string | null {
	return typeof value === 'string' && value.length > 0 ? value : null;
}

function objectField(value: unknown): Record<string, unknown> | null {
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

function createFailureFingerprintForVerify(input: {
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

function riskCodesForFailureFingerprint(input: {
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

function createReceiptBindingEvidence(
	results: readonly VerificationResult[],
	verificationPlanId: string,
): CompletionVerdictReceiptBindingEvidence {
	let planBoundCount = 0;
	let planUnboundCount = 0;
	let fingerprintBoundCount = 0;
	let fingerprintUnboundCount = 0;
	let currentStateBoundCount = 0;
	let currentStateUnavailableCount = 0;
	let staleCount = 0;
	let planMismatchCount = 0;

	for (const result of results) {
		if (!result.receipt) {
			continue;
		}

		const receiptPlanId = stringField(result.receipt.verification_plan_id);
		const resultPlanId = result.verification_plan_id;
		const resultPlanMatches = resultPlanId === verificationPlanId;
		const receiptPlanMatches = receiptPlanId === verificationPlanId;
		if (resultPlanMatches && receiptPlanMatches) {
			planBoundCount += 1;
		} else if (
			(typeof resultPlanId === 'string' && resultPlanId !== verificationPlanId) ||
			(receiptPlanId !== null && receiptPlanId !== verificationPlanId)
		) {
			planMismatchCount += 1;
		} else {
			planUnboundCount += 1;
		}

		const performance = objectField(result.receipt.performance);
		const hasFingerprints =
			performance !== null &&
			stringField(performance.command_fingerprint) !== null &&
			stringField(performance.intent_fingerprint) !== null &&
			stringField(performance.contract_fingerprint) !== null;
		if (hasFingerprints) {
			fingerprintBoundCount += 1;
		} else {
			fingerprintUnboundCount += 1;
		}

		const currentStateBinding =
			stringField(result.receipt.head_tree_hash) ??
			stringField(result.receipt.changed_files_hash) ??
			stringField(result.receipt.current_state_hash);
		if (currentStateBinding !== null) {
			currentStateBoundCount += 1;
		} else {
			currentStateUnavailableCount += 1;
		}

		if (!result.receipt_path || !result.receipt_sha256) {
			staleCount += 1;
		}
	}

	return {
		plan_bound_count: planBoundCount,
		plan_unbound_count: planUnboundCount,
		fingerprint_bound_count: fingerprintBoundCount,
		fingerprint_unbound_count: fingerprintUnboundCount,
		current_state_bound_count: currentStateBoundCount,
		current_state_unavailable_count: currentStateUnavailableCount,
		stale_count: staleCount,
		plan_mismatch_count: planMismatchCount,
	};
}

function resultForSelectedIntent(results: readonly VerificationResult[], intent: string): VerificationResult | null {
	return results.find((result) => result.intent === intent && result.status !== 'skipped') ?? null;
}

function createCriteriaEvidence(
	report: ChangeVerificationReport,
	results: readonly VerificationResult[],
): CompletionVerdictCriteriaEvidence {
	const evidence: CompletionVerdictCriteriaEvidence = {
		total: report.requirements.length,
		covered: 0,
		partially_covered: 0,
		uncovered: 0,
		blocked: 0,
		contradicted: 0,
	};

	return report.requirements.reduce((current, requirement) => {
		const candidates = report.candidates.filter((candidate) => candidate.reason === requirement.reason);
		const selectedIntents = candidates
			.filter((candidate) => candidate.selectionState === 'selected')
			.map((candidate) => candidate.intent)
			.filter((intent): intent is string => intent !== null);
		const skippedIntents = candidates
			.filter((candidate) => candidate.status !== 'runnable')
			.map((candidate) => candidate.intent)
			.filter((intent): intent is string => intent !== null);
		const gapCount = report.gaps.filter((gap) => gap.reason === requirement.reason).length;
		const selectedResults = selectedIntents.map((intent) => resultForSelectedIntent(results, intent));

		if (
			selectedResults.some(
				(result) =>
					result?.status === 'failed' ||
					result?.status === 'timed_out' ||
					result?.status === 'start_failed' ||
					result?.status === 'output_limit_exceeded',
			)
		) {
			return { ...current, contradicted: current.contradicted + 1 };
		}

		if (gapCount > 0 || (selectedIntents.length === 0 && skippedIntents.length > 0)) {
			return { ...current, blocked: current.blocked + 1 };
		}

		if (selectedIntents.length === 0) {
			return { ...current, uncovered: current.uncovered + 1 };
		}

		if (skippedIntents.length > 0) {
			return { ...current, partially_covered: current.partially_covered + 1 };
		}

		if (selectedResults.every((result) => result?.status === 'passed')) {
			return { ...current, covered: current.covered + 1 };
		}

		return { ...current, uncovered: current.uncovered + 1 };
	}, evidence);
}

function createCompletionVerdictForResults(input: {
	readonly report: ChangeVerificationReport;
	readonly verificationPlanId: string;
	readonly summary: VerificationSummary;
	readonly results: readonly VerificationResult[];
	readonly sourceAnchorRiskCount: number;
	readonly scopeDiffRiskCount: number;
	readonly repeatedFailureRisks: readonly RepeatedFailureRisk[];
	readonly validationRatchetRiskCount: number;
	readonly validationRatchetContradictionCount: number;
	readonly reproEvidenceRiskCount: number;
	readonly reproEvidenceContradictionCount: number;
	readonly reproEvidenceUnverifiedCount: number;
	readonly externalEvidenceRiskCount: number;
}): CompletionVerdict {
	const receiptBinding = createReceiptBindingEvidence(input.results, input.verificationPlanId);
	const receiptBindingRiskCount = receiptBinding.plan_unbound_count + receiptBinding.fingerprint_unbound_count;
	const repeatedFailureBlockerCount = input.repeatedFailureRisks.filter((risk) => risk.verdict_effect === 'blocker').length;
	return createVerifyCompletionVerdict({
		verificationPlanId: input.verificationPlanId,
		matchedIntents: input.summary.matched,
		ranIntents: input.summary.ran,
		passedIntents: input.summary.passed,
		failedIntents: input.summary.failed,
		skippedIntents: input.summary.skipped,
		receiptCount: input.results.filter((result) => result.receipt !== null).length,
		sourceAnchorRiskCount: input.sourceAnchorRiskCount,
		scopeDiffRiskCount: input.scopeDiffRiskCount,
		repeatedFailureCount: input.repeatedFailureRisks.length,
		repeatedFailureBlockerCount,
		validationRatchetRiskCount: input.validationRatchetRiskCount,
		validationRatchetContradictionCount: input.validationRatchetContradictionCount,
		reproEvidenceRiskCount: input.reproEvidenceRiskCount,
		reproEvidenceContradictionCount: input.reproEvidenceContradictionCount,
		reproEvidenceUnverifiedCount: input.reproEvidenceUnverifiedCount,
		externalEvidenceRiskCount: input.externalEvidenceRiskCount,
		writeDriftRiskCount: countUndeclaredWriteDrift(input.results),
		receiptBindingRiskCount,
		staleReceiptCount: receiptBinding.stale_count,
		planMismatchCount: receiptBinding.plan_mismatch_count,
		criteria: createCriteriaEvidence(input.report, input.results),
		receiptBinding,
	});
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

function hashTextSha256(content: string): string {
	return `sha256:${createHash('sha256').update(content).digest('hex')}`;
}

function stableJson(value: unknown): string {
	if (Array.isArray(value)) {
		return `[${value.map((entry) => stableJson(entry)).join(',')}]`;
	}

	if (value && typeof value === 'object') {
		const record = value as Record<string, unknown>;
		return `{${Object.keys(record)
			.sort((left, right) => left.localeCompare(right))
			.map((key) => `${JSON.stringify(key)}:${stableJson(record[key])}`)
			.join(',')}}`;
	}

	return JSON.stringify(value) ?? 'null';
}

function getCandidateIntentNames(report: ChangeVerificationReport): string[] {
	return [...new Set(report.candidates.map((candidate) => candidate.intent).filter((intent): intent is string => Boolean(intent)))]
		.sort((left, right) => left.localeCompare(right));
}

function createVerificationPlanId(report: ChangeVerificationReport, contract: ReturnType<typeof readCommandContract>): string {
	const relatedIntents = Object.fromEntries(
		getCandidateIntentNames(report).map((intent) => [intent, contract.intents[intent] ?? null]),
	);
	const fingerprintSource = {
		schema_version: '1',
		algorithm: 'mustflow.verify_plan_id.v1',
		report: {
			source: report.source,
			files: report.files,
			classification_summary: report.classification_summary,
			requirements: report.requirements,
			candidates: report.candidates,
			gaps: report.gaps,
			schedule: report.schedule,
			test_selection: report.test_selection,
		},
		command_contract: {
			defaults: contract.defaults,
			resources: contract.resources,
			intents: relatedIntents,
		},
	};

	return hashTextSha256(stableJson(fingerprintSource));
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
	const outputWithReceiptPaths: VerificationOutput = {
		...output,
		completion_verdict: completionVerdict,
		failure_fingerprint: failureFingerprint,
		repeated_failure_summary: repeatedFailureSummary,
		run_dir: statePaths.runDir,
		manifest_path: statePaths.manifestPath,
		results,
		evidence_model: createVerifyEvidenceModel({
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
		}),
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
		completion_verdict: outputWithReceiptPaths.completion_verdict,
		evidence_model: outputWithReceiptPaths.evidence_model,
		failure_fingerprint: outputWithReceiptPaths.failure_fingerprint,
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
		completion_verdict: outputWithReceiptPaths.completion_verdict,
		evidence_model: outputWithReceiptPaths.evidence_model,
		failure_fingerprint: outputWithReceiptPaths.failure_fingerprint,
		repeated_failure_summary: outputWithReceiptPaths.repeated_failure_summary,
		summary: outputWithReceiptPaths.summary,
		...(outputWithReceiptPaths.repro_evidence ? { repro_evidence: outputWithReceiptPaths.repro_evidence } : {}),
		...(outputWithReceiptPaths.external_checks ? { external_checks: outputWithReceiptPaths.external_checks } : {}),
		run_dir: statePaths.runDir,
		manifest_path: statePaths.manifestPath,
	};

	writeJsonFileInsideWithoutSymlinks(projectRoot, resolveLatestVerifyRunReceiptPath(projectRoot), latest);
	return outputWithReceiptPaths;
}

async function createVerifyOutput(
	input: VerifyInput,
	planSource: string | null,
	projectRoot: string,
	lang: CliLang,
	reproEvidence: ReproEvidenceReport | null = null,
	externalChecks: readonly ExternalEvidenceCheck[] = [],
	parallelism = DEFAULT_VERIFY_PARALLELISM,
	parallelismReport: VerificationParallelismReport | null = null,
): Promise<VerificationOutput> {
	const contract = readCommandContract(projectRoot);
	const report = createChangeVerificationReport(input.classificationReport, contract, projectRoot);
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
	const results = await runScheduledVerificationIntents(report, projectRoot, lang, verificationPlanId, input.correlationId, scheduledTestTargets, parallelism);

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
		completion_verdict: completionVerdict,
		evidence_model: evidenceModel,
		failure_fingerprint: failureFingerprint,
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

async function createPlanOnlyOutput(input: VerifyInput, projectRoot: string): Promise<PlanOnlyOutput> {
	const contract = readCommandContract(projectRoot);
	const report = createChangeVerificationReport(input.classificationReport, contract, projectRoot);
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
		`completion verdict: ${output.completion_verdict.status} (${output.completion_verdict.primary_reason})`,
		`matched: ${output.summary.matched}`,
		`ran: ${output.summary.ran}`,
		`passed: ${output.summary.passed}`,
		`failed: ${output.summary.failed}`,
		`skipped: ${output.summary.skipped}`,
	];

	if (output.parallelism) {
		const cpuAvailable = output.parallelism.cpu_available ?? t(lang, 'value.none');
		lines.push(
			`parallelism: requested ${output.parallelism.requested}, effective ${output.parallelism.effective}, repository max ${output.parallelism.repository_max}, cpu available ${cpuAvailable}, mode ${output.parallelism.mode}`,
		);
		if (output.parallelism.capped) {
			lines.push(`parallelism note: ${output.parallelism.note}`);
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
	if (args.includes('--help') || args.includes('-h')) {
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
		reporter.stdout(JSON.stringify(await createPlanOnlyOutput(input, projectRoot), null, 2));
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
	);

	if (parsed.json) {
		reporter.stdout(JSON.stringify(output, null, 2));
	} else {
		reporter.stdout(renderVerifyOutput(output, lang));
	}

	return output.completion_verdict.status === 'verified' ? 0 : 1;
}
