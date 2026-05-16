import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';

import { createClassifyOutput, type ClassifyOutput } from './classify.js';
import { runRun } from './run.js';
import {
	createChangeVerificationReport,
	type ChangeVerificationCandidate,
	type ChangeVerificationReport,
} from '../../core/change-verification.js';
import type {
	ChangeClassification,
	ChangeClassificationReport,
	ChangeClassificationSummary,
	ChangeSource,
	PublicSurfaceUpdatePolicy,
} from '../../core/change-classification.js';
import type { VerificationCandidate } from '../../core/verification-plan.js';
import { readCommandContract } from '../../core/config-loading.js';
import { printUsageError, renderHelp } from '../lib/cli-output.js';
import { t, type CliLang, type MessageKey } from '../lib/i18n.js';
import {
	readLocalCommandEffectGraph,
	readLocalPathSurfaces,
	type LocalCommandEffectGraph,
	type LocalPathSurfaceReadModel,
} from '../lib/local-index.js';
import { resolveMustflowRoot } from '../lib/project-root.js';
import type { Reporter } from '../lib/reporter.js';

const VERIFY_SCHEMA_VERSION = '1';
const VERIFY_RUN_DIR = path.join('.mustflow', 'state', 'runs', 'verify-latest');
const LATEST_RUN_RECEIPT_PATH = path.join('.mustflow', 'state', 'runs', 'latest.json');

type VerificationStatus = 'passed' | 'partial' | 'failed' | 'blocked';
type VerificationResultStatus = 'passed' | 'failed' | 'timed_out' | 'start_failed' | 'skipped';

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
	readonly receipt: Record<string, unknown> | null;
}

interface VerificationSummary {
	readonly matched: number;
	readonly ran: number;
	readonly passed: number;
	readonly failed: number;
	readonly skipped: number;
}

interface VerificationOutput {
	readonly schema_version: string;
	readonly command: 'verify';
	readonly mustflow_root: string;
	readonly reason: string;
	readonly reasons: readonly string[];
	readonly plan_source: string | null;
	readonly status: VerificationStatus;
	readonly summary: VerificationSummary;
	readonly results: readonly VerificationResult[];
}

interface VerifyRunReceiptManifestEntry {
	readonly intent: string | null;
	readonly status: VerificationResultStatus;
	readonly skipped: boolean;
	readonly receipt_path: string | null;
}

interface VerifyRunReceiptManifest {
	readonly schema_version: string;
	readonly command: 'verify';
	readonly reason: string;
	readonly reasons: readonly string[];
	readonly plan_source: string | null;
	readonly status: VerificationStatus;
	readonly summary: VerificationSummary;
	readonly receipts: readonly VerifyRunReceiptManifestEntry[];
}

interface VerifyLatestRunPointer {
	readonly schema_version: string;
	readonly command: 'verify';
	readonly kind: 'verify_run_summary';
	readonly reason: string;
	readonly reasons: readonly string[];
	readonly plan_source: string | null;
	readonly status: VerificationStatus;
	readonly summary: VerificationSummary;
	readonly run_dir: string;
	readonly manifest_path: string;
}

export interface VerifyInput {
	readonly reasons: readonly string[];
	readonly classificationReport: ChangeClassificationReport;
}

type PlanOnlyScheduleEntry = ChangeVerificationReport['schedule']['entries'][number] & {
	readonly effectGraph?: LocalCommandEffectGraph;
};

type PlanOnlyRequirement = ChangeVerificationReport['requirements'][number] & {
	readonly surfaceReadModels?: readonly LocalPathSurfaceReadModel[];
};

type PlanOnlyOutput = ChangeVerificationReport & {
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
			usage: 'mf verify --reason <event> [options] | mf verify --from-plan <path> [options] | mf verify --changed [options]',
			summary: t(lang, 'verify.help.summary'),
			options: [
				{ label: '--reason <event>', description: t(lang, 'verify.help.option.reason') },
				{ label: '--from-plan <path>', description: t(lang, 'verify.help.option.fromPlan') },
				{ label: '--changed', description: t(lang, 'verify.help.option.changed') },
				{ label: '--write-plan <path>', description: t(lang, 'verify.help.option.writePlan') },
				{ label: '--plan-only', description: t(lang, 'verify.help.option.planOnly') },
				{ label: '--json', description: t(lang, 'cli.option.json') },
				{ label: '-h, --help', description: t(lang, 'cli.option.help') },
			],
			examples: [
				'mf verify --reason code_change',
				'mf verify --reason docs_change --json',
				'mf verify --reason docs_change --plan-only --json',
				'mf verify --from-plan verify-plan.json --json',
				'mf verify --changed --plan-only --json',
				'mf verify --changed --write-plan .mustflow/state/change-plan.json --json',
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

function parseVerifyArgs(args: readonly string[]): {
	json: boolean;
	planOnly: boolean;
	changed: boolean;
	reason?: string;
	fromPlan?: string;
	writePlan?: string;
	error?: string;
} {
	let reason: string | undefined;
	let fromPlan: string | undefined;
	let writePlan: string | undefined;
	let json = false;
	let planOnly = false;
	let changed = false;

	for (let index = 0; index < args.length; index += 1) {
		const arg = args[index];

		if (arg === '--json') {
			json = true;
			continue;
		}

		if (arg === '--plan-only') {
			planOnly = true;
			continue;
		}

		if (arg === '--changed') {
			changed = true;
			continue;
		}

		if (arg === '--reason') {
			const value = args[index + 1];
			if (!value || value.startsWith('-')) {
				return { json, planOnly, changed, reason, error: 'missing_reason_value' };
			}

			reason = value;
			index += 1;
			continue;
		}

		if (arg === '--from-plan') {
			const value = args[index + 1];
			if (!value || value.startsWith('-')) {
				return { json, planOnly, changed, reason, fromPlan, error: 'missing_from_plan_value' };
			}

			fromPlan = value;
			index += 1;
			continue;
		}

		if (arg === '--write-plan') {
			const value = args[index + 1];
			if (!value || value.startsWith('-')) {
				return { json, planOnly, changed, reason, fromPlan, writePlan, error: 'missing_write_plan_value' };
			}

			writePlan = value;
			index += 1;
			continue;
		}

		if (arg.startsWith('--reason=')) {
			const value = arg.slice('--reason='.length);
			if (value.length === 0) {
				return { json, planOnly, changed, reason, error: 'missing_reason_value' };
			}

			reason = value;
			continue;
		}

		if (arg.startsWith('--from-plan=')) {
			const value = arg.slice('--from-plan='.length);
			if (value.length === 0) {
				return { json, planOnly, changed, reason, fromPlan, error: 'missing_from_plan_value' };
			}

			fromPlan = value;
			continue;
		}

		if (arg.startsWith('--write-plan=')) {
			const value = arg.slice('--write-plan='.length);
			if (value.length === 0) {
				return { json, planOnly, changed, reason, fromPlan, writePlan, error: 'missing_write_plan_value' };
			}

			writePlan = value;
			continue;
		}

		if (arg.startsWith('-')) {
			return { json, planOnly, changed, reason, fromPlan, writePlan, error: arg };
		}

		return { json, planOnly, changed, reason, fromPlan, writePlan, error: `unexpected:${arg}` };
	}

	return { json, planOnly, changed, reason, fromPlan, writePlan };
}

function uniqueStrings(values: readonly string[]): string[] {
	return [...new Set(values.map((value) => value.trim()).filter((value) => value.length > 0))];
}

function toPosixPath(value: string): string {
	return value.split(path.sep).join('/');
}

function sanitizeIntentFilePart(value: string): string {
	const sanitized = value.replace(/[^A-Za-z0-9._-]+/g, '_').replace(/^_+|_+$/g, '');
	return sanitized.length > 0 ? sanitized.slice(0, 80) : 'intent';
}

function readStringArray(value: unknown): string[] {
	if (!Array.isArray(value)) {
		return [];
	}

	return value.filter((item): item is string => typeof item === 'string');
}

function isStringArray(value: unknown): value is readonly string[] {
	return Array.isArray(value) && value.every((item) => typeof item === 'string');
}

function isPlainRecord(value: unknown): value is Record<string, unknown> {
	return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function isUpdatePolicy(value: unknown): value is PublicSurfaceUpdatePolicy {
	return value === 'update' || value === 'update_or_mark_stale' || value === 'not_applicable';
}

function isUpdatePolicyArray(value: unknown): value is readonly PublicSurfaceUpdatePolicy[] {
	return Array.isArray(value) && value.every((item): item is PublicSurfaceUpdatePolicy => isUpdatePolicy(item));
}

function readPlanRoot(value: unknown): string | null {
	if (!isPlainRecord(value)) {
		return null;
	}

	const root = value.mustflow_root;
	return typeof root === 'string' && root.length > 0 ? root : null;
}

function readStrictClassificationSummary(value: unknown): ChangeClassificationSummary | null {
	if (!isPlainRecord(value)) {
		return null;
	}

	if (
		!Number.isInteger(value.fileCount) ||
		Number(value.fileCount) < 0 ||
		!Number.isInteger(value.publicSurfaceCount) ||
		Number(value.publicSurfaceCount) < 0 ||
		!isStringArray(value.changeKinds) ||
		!isStringArray(value.validationReasons) ||
		!isUpdatePolicyArray(value.updatePolicies) ||
		!isStringArray(value.driftChecks) ||
		!isStringArray(value.affectedContracts)
	) {
		return null;
	}

	return {
		fileCount: Number(value.fileCount),
		publicSurfaceCount: Number(value.publicSurfaceCount),
		changeKinds: [...value.changeKinds],
		validationReasons: uniqueStrings(value.validationReasons),
		updatePolicies: [...value.updatePolicies],
		driftChecks: [...value.driftChecks],
		affectedContracts: [...value.affectedContracts],
	};
}

function readStrictClassification(value: unknown): ChangeClassification | null {
	if (!isPlainRecord(value) || typeof value.path !== 'string' || !isStringArray(value.changeKinds)) {
		return null;
	}

	const surface = value.surface;
	if (!isPlainRecord(surface)) {
		return null;
	}

	if (
		typeof surface.kind !== 'string' ||
		typeof surface.category !== 'string' ||
		typeof surface.isPublicSurface !== 'boolean' ||
		!isStringArray(surface.validationReasons) ||
		!isStringArray(surface.affectedContracts) ||
		!isUpdatePolicy(surface.updatePolicy) ||
		!isStringArray(surface.driftChecks)
	) {
		return null;
	}

	return {
		path: value.path,
		changeKinds: [...value.changeKinds],
		surface: {
			kind: surface.kind,
			category: surface.category,
			isPublicSurface: surface.isPublicSurface,
			validationReasons: [...surface.validationReasons],
			affectedContracts: [...surface.affectedContracts],
			updatePolicy: surface.updatePolicy,
			driftChecks: [...surface.driftChecks],
		},
	};
}

function readStrictClassifications(value: unknown): ChangeClassification[] | null {
	if (!Array.isArray(value)) {
		return null;
	}

	const classifications = value.map(readStrictClassification);
	return classifications.every((classification): classification is ChangeClassification => classification !== null)
		? classifications
		: null;
}

function readStrictClassifyPlan(projectRoot: string, plan: unknown): ChangeClassificationReport {
	if (!isPlainRecord(plan)) {
		throw new Error('unsupported_plan_source');
	}

	if (plan.schema_version !== '1' || plan.command !== 'classify') {
		throw new Error('unsupported_plan_source');
	}

	if (readPlanRoot(plan) !== projectRoot) {
		throw new Error('plan_root_mismatch');
	}

	const source = plan.source;
	const files = plan.files;
	const classifications = readStrictClassifications(plan.classifications);
	const summary = readStrictClassificationSummary(plan.summary);

	if ((source !== 'changed' && source !== 'paths') || !isStringArray(files) || !classifications || !summary) {
		throw new Error('invalid_plan_file');
	}

	if (summary.validationReasons.length === 0) {
		throw new Error('missing_plan_reasons');
	}

	return {
		source,
		files: [...files],
		classifications,
		summary,
	};
}

function emptyClassificationSummary(validationReasons: readonly string[]): ChangeClassificationSummary {
	return {
		fileCount: 0,
		publicSurfaceCount: 0,
		changeKinds: [],
		validationReasons,
		updatePolicies: [],
		driftChecks: [],
		affectedContracts: [],
	};
}

function createSyntheticClassificationReport(
	reasons: readonly string[],
	source: ChangeSource = 'paths',
	files: readonly string[] = [],
): ChangeClassificationReport {
	return {
		source,
		files,
		classifications: [],
		summary: emptyClassificationSummary(reasons),
	};
}

function resolvePlanPath(projectRoot: string, inputPath: string): string {
	const resolved = path.resolve(projectRoot, inputPath);
	const relative = path.relative(projectRoot, resolved);

	if (relative.startsWith('..') || path.isAbsolute(relative)) {
		throw new Error('plan_path_outside_root');
	}

	return resolved;
}

export function readInputFromPlan(projectRoot: string, inputPath: string): VerifyInput {
	let parsed: unknown;
	const planPath = resolvePlanPath(projectRoot, inputPath);

	try {
		parsed = JSON.parse(readFileSync(planPath, 'utf8'));
	} catch {
		throw new Error('invalid_plan_file');
	}

	const classificationReport = readStrictClassifyPlan(projectRoot, parsed);

	return {
		reasons: classificationReport.summary.validationReasons,
		classificationReport,
	};
}

function createInputFromChanged(projectRoot: string): { readonly input: VerifyInput; readonly plan: ClassifyOutput } {
	const plan = createClassifyOutput(projectRoot, 'changed', []);
	return {
		plan,
		input: {
			reasons: plan.summary.validationReasons,
			classificationReport: plan,
		},
	};
}

function writeChangedPlan(projectRoot: string, inputPath: string, plan: ClassifyOutput): void {
	const planPath = resolvePlanPath(projectRoot, inputPath);
	mkdirSync(path.dirname(planPath), { recursive: true });
	writeFileSync(planPath, `${JSON.stringify(plan, null, 2)}\n`, 'utf8');
}

export function planErrorMessageKey(code: string): MessageKey {
	switch (code) {
		case 'plan_path_outside_root':
			return 'verify.error.plan_path_outside_root';
		case 'missing_plan_reasons':
			return 'verify.error.missing_plan_reasons';
		case 'unsupported_plan_source':
			return 'verify.error.unsupported_plan_source';
		case 'plan_root_mismatch':
			return 'verify.error.plan_root_mismatch';
		default:
			return 'verify.error.invalid_plan_file';
	}
}

function skippedResult(candidate: Pick<VerificationCandidate, 'intent' | 'reason' | 'detail'>): VerificationResult {
	return {
		intent: candidate.intent || null,
		status: 'skipped',
		skipped: true,
		reason: candidate.reason,
		detail: candidate.detail,
		exit_code: null,
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
	testTargets: readonly string[] = [],
): Promise<VerificationResult> {
	const output = createBufferedOutput();
	const exitCode = await runRun([intent, '--json'], output.reporter, lang, {
		writeLatestReceipt: false,
		testTargets,
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
			receiptStatus === 'start_failed'
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
		receipt,
	};
}

function summarizeResults(results: readonly VerificationResult[]): VerificationSummary {
	const ran = results.filter((result) => !result.skipped).length;
	const passed = results.filter((result) => result.status === 'passed').length;
	const skipped = results.filter((result) => result.skipped).length;
	const failed = results.filter(
		(result) =>
			!result.skipped &&
			(result.status === 'failed' || result.status === 'timed_out' || result.status === 'start_failed'),
	).length;

	return {
		matched: results.filter((result) => result.intent !== null).length,
		ran,
		passed,
		failed,
		skipped,
	};
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

function writeVerifyRunReceipts(projectRoot: string, output: VerificationOutput): void {
	const runDir = path.join(projectRoot, VERIFY_RUN_DIR);
	const intentDir = path.join(runDir, 'intents');
	const receipts: VerifyRunReceiptManifestEntry[] = [];

	rmSync(runDir, { recursive: true, force: true });
	mkdirSync(intentDir, { recursive: true });

	for (const [index, result] of output.results.entries()) {
		let receiptPath: string | null = null;

		if (result.intent && result.receipt) {
			const fileName = `${String(index + 1).padStart(3, '0')}-${sanitizeIntentFilePart(result.intent)}.json`;
			const absoluteReceiptPath = path.join(intentDir, fileName);
			receiptPath = toPosixPath(path.join(VERIFY_RUN_DIR, 'intents', fileName));
			writeFileSync(
				absoluteReceiptPath,
				`${JSON.stringify({ ...result.receipt, receipt_path: receiptPath }, null, 2)}\n`,
				'utf8',
			);
		}

		receipts.push({
			intent: result.intent,
			status: result.status,
			skipped: result.skipped,
			receipt_path: receiptPath,
		});
	}

	const manifest: VerifyRunReceiptManifest = {
		schema_version: '1',
		command: 'verify',
		reason: output.reason,
		reasons: output.reasons,
		plan_source: output.plan_source,
		status: output.status,
		summary: output.summary,
		receipts,
	};

	writeFileSync(path.join(runDir, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');

	const latest: VerifyLatestRunPointer = {
		schema_version: '1',
		command: 'verify',
		kind: 'verify_run_summary',
		reason: output.reason,
		reasons: output.reasons,
		plan_source: output.plan_source,
		status: output.status,
		summary: output.summary,
		run_dir: toPosixPath(VERIFY_RUN_DIR),
		manifest_path: toPosixPath(path.join(VERIFY_RUN_DIR, 'manifest.json')),
	};

	writeFileSync(path.join(projectRoot, LATEST_RUN_RECEIPT_PATH), `${JSON.stringify(latest, null, 2)}\n`, 'utf8');
}

async function createVerifyOutput(
	input: VerifyInput,
	planSource: string | null,
	projectRoot: string,
	lang: CliLang,
): Promise<VerificationOutput> {
	const contract = readCommandContract(projectRoot);
	const report = createChangeVerificationReport(input.classificationReport, contract, projectRoot);
	const scheduledIntents = new Set(report.schedule.entries.map((entry) => entry.intent));
	const scheduledTestTargets = testTargetsByScheduledIntent(report);
	const results: VerificationResult[] = [];

	for (const entry of report.schedule.entries) {
		results.push(await runVerificationIntent(entry.intent, lang, scheduledTestTargets.get(entry.intent) ?? []));
	}

	results.push(...createSkippedResults(report.candidates, scheduledIntents, report.gaps));
	const summary = summarizeResults(results);

	const output: VerificationOutput = {
		schema_version: VERIFY_SCHEMA_VERSION,
		command: 'verify',
		mustflow_root: projectRoot,
		reason: input.reasons.join(', '),
		reasons: input.reasons,
		plan_source: planSource,
		status: getVerificationStatus(summary),
		summary,
		results,
	};

	writeVerifyRunReceipts(projectRoot, output);
	return output;
}

async function createPlanOnlyOutput(input: VerifyInput, projectRoot: string): Promise<PlanOnlyOutput> {
	const contract = readCommandContract(projectRoot);
	const report = createChangeVerificationReport(input.classificationReport, contract, projectRoot);
	const localSurfaceReadModels = await readLocalPathSurfaces(projectRoot, report.files);
	const [firstEntry] = report.schedule.entries;
	const requirements = report.requirements.map((requirement) => {
		const surfaceReadModels = requirement.files
			.map((filePath) => localSurfaceReadModels.get(filePath))
			.filter((readModel): readModel is LocalPathSurfaceReadModel => Boolean(readModel));

		return surfaceReadModels.length > 0 ? { ...requirement, surfaceReadModels } : requirement;
	});

	if (!firstEntry) {
		return { ...report, requirements };
	}

	const firstGraph = await readLocalCommandEffectGraph(projectRoot, firstEntry.intent);
	const graphsByIntent = new Map<string, LocalCommandEffectGraph>([[firstEntry.intent, firstGraph]]);

	if (firstGraph.status === 'fresh') {
		for (const entry of report.schedule.entries.slice(1)) {
			if (!graphsByIntent.has(entry.intent)) {
				graphsByIntent.set(entry.intent, await readLocalCommandEffectGraph(projectRoot, entry.intent));
			}
		}
	}

	return {
		...report,
		requirements,
		schedule: {
			...report.schedule,
			entries: report.schedule.entries.map((entry) => ({
				...entry,
				effectGraph: graphsByIntent.get(entry.intent) ?? firstGraph,
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
		`matched: ${output.summary.matched}`,
		`ran: ${output.summary.ran}`,
		`passed: ${output.summary.passed}`,
		`failed: ${output.summary.failed}`,
		`skipped: ${output.summary.skipped}`,
		'',
		t(lang, 'verify.label.results'),
	];

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
				: parsed.error === 'missing_from_plan_value'
					? t(lang, 'cli.error.missingValue', { option: '--from-plan' })
				: parsed.error === 'missing_write_plan_value'
					? t(lang, 'cli.error.missingValue', { option: '--write-plan' })
				: parsed.error.startsWith('unexpected:')
					? t(lang, 'cli.error.unexpectedArgument', { argument: parsed.error.slice('unexpected:'.length) })
					: t(lang, 'cli.error.unknownOption', { option: parsed.error });
		printUsageError(reporter, message, 'mf verify --help', getVerifyHelp(lang), lang);
		return 1;
	}

	const selectedInputCount = [parsed.reason, parsed.fromPlan, parsed.changed ? 'changed' : undefined].filter(Boolean).length;

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

	const projectRoot = resolveMustflowRoot();
	let input: VerifyInput;
	let changedPlan: ClassifyOutput | null = null;

	try {
		if (parsed.changed) {
			const changedInput = createInputFromChanged(projectRoot);
			input = changedInput.input;
			changedPlan = changedInput.plan;
		} else if (parsed.fromPlan) {
			input = readInputFromPlan(projectRoot, parsed.fromPlan);
		} else {
			input = {
					reasons: [parsed.reason as string],
					classificationReport: createSyntheticClassificationReport([parsed.reason as string]),
				};
		}

		if (parsed.writePlan && changedPlan) {
			writeChangedPlan(projectRoot, parsed.writePlan, changedPlan);
		}
	} catch (error) {
		const code = error instanceof Error ? error.message : 'invalid_plan_file';
		printUsageError(reporter, t(lang, planErrorMessageKey(code)), 'mf verify --help', getVerifyHelp(lang), lang);
		return 1;
	}

	if (parsed.planOnly) {
		reporter.stdout(JSON.stringify(await createPlanOnlyOutput(input, projectRoot), null, 2));
		return 0;
	}

	const output = await createVerifyOutput(input, parsed.fromPlan ?? (parsed.changed ? 'changed' : null), projectRoot, lang);

	if (parsed.json) {
		reporter.stdout(JSON.stringify(output, null, 2));
	} else {
		reporter.stdout(renderVerifyOutput(output, lang));
	}

	return output.status === 'passed' ? 0 : 1;
}
