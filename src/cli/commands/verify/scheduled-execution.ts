import type { VerificationReceipt, VerificationResult, VerificationResultStatus } from './result-types.js';
import { objectField } from './result-analysis.js';
import { executeRunCommand } from '../run/execution.js';
import type { RunReceipt } from '../../../core/run-receipt.js';
import { type ChangeVerificationCandidate, type ChangeVerificationReport } from '../../../core/change-verification.js';
import { finishRunWriteBatchTracking, startRunWriteBatchTracking, type RunWriteBatchIntent, type RunWriteDriftReceipt } from '../../../core/run-write-drift.js';
import { createCommandEnv } from '../../../core/command-env.js';
import type { VerificationCandidate } from '../../../core/verification-plan.js';
import { type CliLang } from '../../lib/i18n.js';
import type { Reporter } from '../../lib/reporter.js';

interface BufferedOutput {
	readonly reporter: Reporter;
	readonly stdout: () => string;
	readonly stderr: () => string;
}

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

function toVerificationReceipt(receipt: RunReceipt | null): VerificationReceipt | null {
	return receipt ? { ...receipt } : null;
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

export function createSkippedResults(
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

export function testTargetsByScheduledIntent(report: ChangeVerificationReport): ReadonlyMap<string, readonly string[]> {
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
	writeDriftTracking: 'individual' | 'batch' = 'individual',
): Promise<VerificationResult> {
	const output = createBufferedOutput();
	const runResult = await executeRunCommand(
		{
			intentName: intent,
			outputMode: 'silent',
			allowUntrustedRoot: false,
			allowApprovals: [],
			wait: false,
			waitTimeoutSeconds: 1,
		},
		output.reporter,
		lang,
		{
			correlationId,
			writeLatestReceipt: false,
			writeLatestProfile: false,
			recordPerformanceHistory: false,
			testTargets,
			additionalDeclaredWritePaths,
			writeDriftTracking,
		},
	);
	const exitCode = runResult.exitCode;
	const receipt = toVerificationReceipt(runResult.receipt);
	let status: VerificationResultStatus = exitCode === 0 ? 'passed' : 'failed';
	if (runResult.receipt) {
		status = runResult.receipt.status;
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
		const batchTracker = startRunWriteBatchTracking(
			projectRoot,
			createCommandEnv(projectRoot, { policy: 'minimal', allowlist: [] }),
		);

		const chunkResults = await Promise.all(
			chunk.map((entry) =>
				runVerificationIntent(
					entry.intent,
					lang,
					verificationPlanId,
					correlationId,
					scheduledTestTargets.get(entry.intent) ?? [],
					[],
					'batch',
				),
			),
		);
		const chunkResultsByIntent = new Map(chunkResults.map((result) => [result.intent, result]));
		const writeDriftByIntent = finishRunWriteBatchTracking(
			batchTracker,
			chunk.map((entry) => ({
				intentName: entry.intent,
				declaredPaths: declaredWritePathsForScheduleEntry(entry),
				observedPaths: observedWriteDriftPaths(chunkResultsByIntent.get(entry.intent)),
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

export async function runScheduledVerificationIntents(
	report: ChangeVerificationReport,
	projectRoot: string,
	lang: CliLang,
	verificationPlanId: string,
	correlationId: string,
	scheduledTestTargets: ReadonlyMap<string, readonly string[]>,
	parallelism: number,
	reusableResults: ReadonlyMap<string, VerificationResult> = new Map(),
): Promise<VerificationResult[]> {
	const results: VerificationResult[] = [];

	for (let batchIndex = 0; batchIndex < report.schedule.batches.length; batchIndex += 1) {
		const batch = report.schedule.batches[batchIndex] as VerificationScheduleBatch;
		const entries = entriesForScheduleBatch(report.schedule.entries, batch);
		if (entries.length === 0) {
			continue;
		}

		const reused = entries.flatMap((entry) => reusableResults.get(entry.intent) ?? []);
		const runnableEntries = entries.filter((entry) => !reusableResults.has(entry.intent));
		let batchResults: VerificationResult[];
		if (runnableEntries.length === 0) {
			results.push(...reused);
			continue;
		}
		if (runnableEntries.length > 1 && runnableEntries.every((entry) => entry.parallelEligible)) {
			batchResults =
				parallelism > 1
					? await runVerificationEntriesInParallelChunks(
							projectRoot,
							runnableEntries,
							parallelism,
							lang,
							verificationPlanId,
							correlationId,
							scheduledTestTargets,
						)
					: await runVerificationEntriesSequentially(runnableEntries, lang, verificationPlanId, correlationId, scheduledTestTargets);
		} else {
			batchResults = await runVerificationEntriesSequentially(runnableEntries, lang, verificationPlanId, correlationId, scheduledTestTargets);
		}
		batchResults = [...reused, ...batchResults];

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
