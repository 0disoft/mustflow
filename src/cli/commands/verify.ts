import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';

import { createClassifyOutput, type ClassifyOutput } from './classify.js';
import { runRun } from './run.js';
import {
	createChangeVerificationReport,
	type ChangeVerificationCandidate,
	type ChangeVerificationReport,
} from '../../core/change-verification.js';
import { createVerifyCompletionVerdict, type CompletionVerdict } from '../../core/completion-verdict.js';
import {
	createExternalEvidenceRisks,
	type ExternalEvidenceCheck,
	type ExternalEvidenceStatus,
} from '../../core/external-evidence.js';
import { createRepeatedFailureRisk, type RepeatedFailureRisk } from '../../core/repeated-failure.js';
import {
	createReproEvidenceRisks,
	type ReproEvidenceItem,
	type ReproEvidenceReport,
	type ReproEvidenceStatus,
} from '../../core/repro-evidence.js';
import { createVerifyEvidenceModel, type VerificationEvidenceModel } from '../../core/verification-evidence.js';
import { createScopeDiffRisks, type ScopeDiffRisk } from '../../core/scope-risk.js';
import { createValidationRatchetRisks, type ValidationRatchetRisk } from '../../core/validation-ratchet.js';
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
	readLocalSourceAnchorVerdictRisks,
	type LocalCommandEffectGraph,
	type LocalPathSurfaceReadModel,
	type LocalSourceAnchorVerdictRisk,
} from '../lib/local-index.js';
import { resolveMustflowRoot } from '../lib/project-root.js';
import type { Reporter } from '../lib/reporter.js';

const VERIFY_SCHEMA_VERSION = '1';
const VERIFY_RUN_DIR = path.join('.mustflow', 'state', 'runs', 'verify-latest');
const VERIFY_MANIFEST_PATH = path.join(VERIFY_RUN_DIR, 'manifest.json');
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

interface VerificationOutput {
	readonly schema_version: string;
	readonly command: 'verify';
	readonly mustflow_root: string;
	readonly reason: string;
	readonly reasons: readonly string[];
	readonly plan_source: string | null;
	readonly verification_plan_id: string;
	readonly status: VerificationStatus;
	readonly completion_verdict: CompletionVerdict;
	readonly evidence_model: VerificationEvidenceModel;
	readonly summary: VerificationSummary;
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
	readonly reason: string;
	readonly reasons: readonly string[];
	readonly plan_source: string | null;
	readonly verification_plan_id: string;
	readonly status: VerificationStatus;
	readonly completion_verdict: CompletionVerdict;
	readonly evidence_model: VerificationEvidenceModel;
	readonly summary: VerificationSummary;
	readonly repro_evidence?: ReproEvidenceReport;
	readonly external_checks?: readonly ExternalEvidenceCheck[];
	readonly receipts: readonly VerifyRunReceiptManifestEntry[];
}

interface VerifyLatestRunPointer {
	readonly schema_version: string;
	readonly command: 'verify';
	readonly kind: 'verify_run_summary';
	readonly reason: string;
	readonly reasons: readonly string[];
	readonly plan_source: string | null;
	readonly verification_plan_id: string;
	readonly status: VerificationStatus;
	readonly completion_verdict: CompletionVerdict;
	readonly evidence_model: VerificationEvidenceModel;
	readonly summary: VerificationSummary;
	readonly repro_evidence?: ReproEvidenceReport;
	readonly external_checks?: readonly ExternalEvidenceCheck[];
	readonly run_dir: string;
	readonly manifest_path: string;
}

interface PreviousVerifyLatestSummary {
	readonly verification_plan_id: string;
	readonly status: VerificationStatus;
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

function parseVerifyArgs(args: readonly string[]): {
	json: boolean;
	planOnly: boolean;
	changed: boolean;
	reason?: string;
	fromClassification?: string;
	fromPlan?: string;
	writePlan?: string;
	reproEvidence?: string;
	externalEvidence?: string;
	error?: string;
} {
	let reason: string | undefined;
	let fromClassification: string | undefined;
	let fromPlan: string | undefined;
	let writePlan: string | undefined;
	let reproEvidence: string | undefined;
	let externalEvidence: string | undefined;
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
				return { json, planOnly, changed, reason, fromClassification, fromPlan, error: 'missing_from_plan_value' };
			}

			fromPlan = value;
			index += 1;
			continue;
		}

		if (arg === '--from-classification') {
			const value = args[index + 1];
			if (!value || value.startsWith('-')) {
				return {
					json,
					planOnly,
					changed,
					reason,
					fromClassification,
					fromPlan,
					error: 'missing_from_classification_value',
				};
			}

			fromClassification = value;
			index += 1;
			continue;
		}

		if (arg === '--write-plan') {
			const value = args[index + 1];
			if (!value || value.startsWith('-')) {
				return {
					json,
					planOnly,
					changed,
					reason,
					fromClassification,
					fromPlan,
					writePlan,
					error: 'missing_write_plan_value',
				};
			}

			writePlan = value;
			index += 1;
			continue;
		}

		if (arg === '--external-evidence') {
			const value = args[index + 1];
			if (!value || value.startsWith('-')) {
				return {
					json,
					planOnly,
					changed,
					reason,
					fromClassification,
					fromPlan,
					writePlan,
					externalEvidence,
					error: 'missing_external_evidence_value',
				};
			}

			externalEvidence = value;
			index += 1;
			continue;
		}

		if (arg === '--repro-evidence') {
			const value = args[index + 1];
			if (!value || value.startsWith('-')) {
				return {
					json,
					planOnly,
					changed,
					reason,
					fromClassification,
					fromPlan,
					writePlan,
					reproEvidence,
					externalEvidence,
					error: 'missing_repro_evidence_value',
				};
			}

			reproEvidence = value;
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
				return { json, planOnly, changed, reason, fromClassification, fromPlan, error: 'missing_from_plan_value' };
			}

			fromPlan = value;
			continue;
		}

		if (arg.startsWith('--from-classification=')) {
			const value = arg.slice('--from-classification='.length);
			if (value.length === 0) {
				return {
					json,
					planOnly,
					changed,
					reason,
					fromClassification,
					fromPlan,
					error: 'missing_from_classification_value',
				};
			}

			fromClassification = value;
			continue;
		}

		if (arg.startsWith('--write-plan=')) {
			const value = arg.slice('--write-plan='.length);
			if (value.length === 0) {
				return {
					json,
					planOnly,
					changed,
					reason,
					fromClassification,
					fromPlan,
					writePlan,
					error: 'missing_write_plan_value',
				};
			}

			writePlan = value;
			continue;
		}

		if (arg.startsWith('--external-evidence=')) {
			const value = arg.slice('--external-evidence='.length);
			if (value.length === 0) {
				return {
					json,
					planOnly,
					changed,
					reason,
					fromClassification,
					fromPlan,
					writePlan,
					externalEvidence,
					error: 'missing_external_evidence_value',
				};
			}

			externalEvidence = value;
			continue;
		}

		if (arg.startsWith('--repro-evidence=')) {
			const value = arg.slice('--repro-evidence='.length);
			if (value.length === 0) {
				return {
					json,
					planOnly,
					changed,
					reason,
					fromClassification,
					fromPlan,
					writePlan,
					reproEvidence,
					externalEvidence,
					error: 'missing_repro_evidence_value',
				};
			}

			reproEvidence = value;
			continue;
		}

		if (arg.startsWith('-')) {
			return { json, planOnly, changed, reason, fromClassification, fromPlan, writePlan, reproEvidence, externalEvidence, error: arg };
		}

		return {
			json,
			planOnly,
			changed,
			reason,
			fromClassification,
			fromPlan,
			writePlan,
			reproEvidence,
			externalEvidence,
			error: `unexpected:${arg}`,
		};
	}

	return { json, planOnly, changed, reason, fromClassification, fromPlan, writePlan, reproEvidence, externalEvidence };
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

function isExternalEvidenceStatus(value: unknown): value is ExternalEvidenceStatus {
	return value === 'passed' || value === 'failed' || value === 'cancelled' || value === 'unknown';
}

function isReproEvidenceStatus(value: unknown): value is ReproEvidenceStatus {
	return value === 'present' || value === 'unavailable' || value === 'missing';
}

function readOptionalString(value: unknown): string | null {
	return typeof value === 'string' && value.length > 0 ? value : null;
}

function readReproEvidenceItem(value: unknown): ReproEvidenceItem {
	if (!isPlainRecord(value)) {
		return {
			status: 'missing',
			summary: null,
			reason: null,
		};
	}

	if (!isReproEvidenceStatus(value.status)) {
		throw new Error('invalid_repro_evidence_file');
	}

	return {
		status: value.status,
		summary: readOptionalString(value.summary),
		reason: readOptionalString(value.reason),
	};
}

function readReproEvidenceFile(projectRoot: string, inputPath: string): ReproEvidenceReport {
	let parsed: unknown;
	const evidencePath = resolvePlanPath(projectRoot, inputPath);

	try {
		parsed = JSON.parse(readFileSync(evidencePath, 'utf8'));
	} catch {
		throw new Error('invalid_repro_evidence_file');
	}

	if (!isPlainRecord(parsed) || parsed.schema_version !== '1' || parsed.command !== 'repro-evidence') {
		throw new Error('unsupported_repro_evidence_source');
	}

	return {
		source: 'repro_first_debug',
		authority: 'claim_evidence',
		reported_symptom: readOptionalString(parsed.reported_symptom),
		expected_behavior: readOptionalString(parsed.expected_behavior),
		observed_behavior: readOptionalString(parsed.observed_behavior),
		original_reproduction: readReproEvidenceItem(parsed.original_reproduction),
		evidence_before_fix: readReproEvidenceItem(parsed.evidence_before_fix),
		evidence_after_fix: readReproEvidenceItem(parsed.evidence_after_fix),
		regression_guard: readReproEvidenceItem(parsed.regression_guard),
	};
}

function readExternalEvidenceFile(projectRoot: string, inputPath: string): readonly ExternalEvidenceCheck[] {
	let parsed: unknown;
	const evidencePath = resolvePlanPath(projectRoot, inputPath);

	try {
		parsed = JSON.parse(readFileSync(evidencePath, 'utf8'));
	} catch {
		throw new Error('invalid_external_evidence_file');
	}

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
		verification_plan_id: null,
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
		verification_plan_id: verificationPlanId,
		receipt_path: null,
		receipt_sha256: null,
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

function isVerificationStatus(value: unknown): value is VerificationStatus {
	return value === 'passed' || value === 'partial' || value === 'failed' || value === 'blocked';
}

function readPreviousVerifyLatestSummary(projectRoot: string): PreviousVerifyLatestSummary | null {
	try {
		const parsed = JSON.parse(readFileSync(path.join(projectRoot, LATEST_RUN_RECEIPT_PATH), 'utf8')) as Record<
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

function writeVerifyRunReceipts(
	projectRoot: string,
	output: VerificationOutput,
	report: ChangeVerificationReport,
	sourceAnchorRisks: readonly LocalSourceAnchorVerdictRisk[],
	scopeDiffRisks: readonly ScopeDiffRisk[],
	repeatedFailureRisks: readonly RepeatedFailureRisk[],
	validationRatchetRisks: readonly ValidationRatchetRisk[],
	reproEvidence: ReproEvidenceReport | null,
	externalChecks: readonly ExternalEvidenceCheck[],
): VerificationOutput {
	const runDir = path.join(projectRoot, VERIFY_RUN_DIR);
	const intentDir = path.join(runDir, 'intents');
	const receipts: VerifyRunReceiptManifestEntry[] = [];
	const results: VerificationResult[] = [];

	rmSync(runDir, { recursive: true, force: true });
	mkdirSync(intentDir, { recursive: true });

	for (const [index, result] of output.results.entries()) {
		let receiptPath: string | null = null;
		let receiptSha256: string | null = null;
		let receipt = result.receipt;

		if (result.intent && result.receipt) {
			const fileName = `${String(index + 1).padStart(3, '0')}-${sanitizeIntentFilePart(result.intent)}.json`;
			const absoluteReceiptPath = path.join(intentDir, fileName);
			receiptPath = toPosixPath(path.join(VERIFY_RUN_DIR, 'intents', fileName));
			receipt = {
				...result.receipt,
				verification_plan_id: output.verification_plan_id,
				receipt_path: receiptPath,
			};
			const receiptContent = `${JSON.stringify(receipt, null, 2)}\n`;
			receiptSha256 = hashTextSha256(receiptContent);
			writeFileSync(absoluteReceiptPath, receiptContent, 'utf8');
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

	const outputWithReceiptPaths: VerificationOutput = {
		...output,
		results,
		evidence_model: createVerifyEvidenceModel({
			report,
			results,
			verificationPlanId: output.verification_plan_id,
			verdict: output.completion_verdict,
			sourceAnchorRisks,
			scopeDiffRisks,
			repeatedFailureRisks,
			validationRatchetRisks,
			reproEvidence,
			reproEvidenceRisks: createReproEvidenceRisks(reproEvidence),
			externalChecks,
			externalEvidenceRisks: createExternalEvidenceRisks(externalChecks),
		}),
	};

	const manifest: VerifyRunReceiptManifest = {
		schema_version: '1',
		command: 'verify',
		reason: outputWithReceiptPaths.reason,
		reasons: outputWithReceiptPaths.reasons,
		plan_source: outputWithReceiptPaths.plan_source,
		verification_plan_id: outputWithReceiptPaths.verification_plan_id,
		status: outputWithReceiptPaths.status,
		completion_verdict: outputWithReceiptPaths.completion_verdict,
		evidence_model: outputWithReceiptPaths.evidence_model,
		summary: outputWithReceiptPaths.summary,
		...(outputWithReceiptPaths.repro_evidence ? { repro_evidence: outputWithReceiptPaths.repro_evidence } : {}),
		...(outputWithReceiptPaths.external_checks ? { external_checks: outputWithReceiptPaths.external_checks } : {}),
		receipts,
	};

	writeFileSync(path.join(runDir, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');

	const latest: VerifyLatestRunPointer = {
		schema_version: '1',
		command: 'verify',
		kind: 'verify_run_summary',
		reason: outputWithReceiptPaths.reason,
		reasons: outputWithReceiptPaths.reasons,
		plan_source: outputWithReceiptPaths.plan_source,
		verification_plan_id: outputWithReceiptPaths.verification_plan_id,
		status: outputWithReceiptPaths.status,
		completion_verdict: outputWithReceiptPaths.completion_verdict,
		evidence_model: outputWithReceiptPaths.evidence_model,
		summary: outputWithReceiptPaths.summary,
		...(outputWithReceiptPaths.repro_evidence ? { repro_evidence: outputWithReceiptPaths.repro_evidence } : {}),
		...(outputWithReceiptPaths.external_checks ? { external_checks: outputWithReceiptPaths.external_checks } : {}),
		run_dir: toPosixPath(VERIFY_RUN_DIR),
		manifest_path: toPosixPath(VERIFY_MANIFEST_PATH),
	};

	writeFileSync(path.join(projectRoot, LATEST_RUN_RECEIPT_PATH), `${JSON.stringify(latest, null, 2)}\n`, 'utf8');
	return outputWithReceiptPaths;
}

async function createVerifyOutput(
	input: VerifyInput,
	planSource: string | null,
	projectRoot: string,
	lang: CliLang,
	reproEvidence: ReproEvidenceReport | null = null,
	externalChecks: readonly ExternalEvidenceCheck[] = [],
): Promise<VerificationOutput> {
	const contract = readCommandContract(projectRoot);
	const report = createChangeVerificationReport(input.classificationReport, contract, projectRoot);
	const verificationPlanId = createVerificationPlanId(report, contract);
	const scheduledIntents = new Set(report.schedule.entries.map((entry) => entry.intent));
	const scheduledTestTargets = testTargetsByScheduledIntent(report);
	const sourceAnchorRisks = await readLocalSourceAnchorVerdictRisks(projectRoot, report.files);
	const scopeDiffRisks = createScopeDiffRisks(input.classificationReport);
	const validationRatchetRisks = createValidationRatchetRisks(input.classificationReport, projectRoot);
	const reproEvidenceRisks = createReproEvidenceRisks(reproEvidence);
	const externalEvidenceRisks = createExternalEvidenceRisks(externalChecks);
	const results: VerificationResult[] = [];

	for (const entry of report.schedule.entries) {
		results.push(await runVerificationIntent(entry.intent, lang, verificationPlanId, scheduledTestTargets.get(entry.intent) ?? []));
	}

	results.push(...createSkippedResults(report.candidates, scheduledIntents, report.gaps));
	const summary = summarizeResults(results);
	const status = getVerificationStatus(summary);
	const previousVerifyLatest = readPreviousVerifyLatestSummary(projectRoot);
	const repeatedFailureRisk = createRepeatedFailureRisk({
		previousVerificationPlanId: previousVerifyLatest?.verification_plan_id ?? null,
		previousStatus: previousVerifyLatest?.status ?? null,
		currentVerificationPlanId: verificationPlanId,
		currentStatus: status,
	});
	const repeatedFailureRisks = repeatedFailureRisk ? [repeatedFailureRisk] : [];
	const completionVerdict = createVerifyCompletionVerdict({
		verificationPlanId,
		matchedIntents: summary.matched,
		ranIntents: summary.ran,
		passedIntents: summary.passed,
		failedIntents: summary.failed,
		skippedIntents: summary.skipped,
		receiptCount: results.filter((result) => result.receipt !== null).length,
		sourceAnchorRiskCount: sourceAnchorRisks.length,
		scopeDiffRiskCount: scopeDiffRisks.length,
		repeatedFailureCount: repeatedFailureRisks.length,
		validationRatchetRiskCount: validationRatchetRisks.length,
		reproEvidenceRiskCount: reproEvidenceRisks.length,
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
		mustflow_root: projectRoot,
		reason: input.reasons.join(', '),
		reasons: input.reasons,
		plan_source: planSource,
		verification_plan_id: verificationPlanId,
		status,
		completion_verdict: completionVerdict,
		evidence_model: evidenceModel,
		summary,
		...(reproEvidence ? { repro_evidence: reproEvidence } : {}),
		...(externalChecks.length > 0 ? { external_checks: externalChecks } : {}),
		run_dir: toPosixPath(VERIFY_RUN_DIR),
		manifest_path: toPosixPath(VERIFY_MANIFEST_PATH),
		results,
	};

	return writeVerifyRunReceipts(
		projectRoot,
		output,
		report,
		sourceAnchorRisks,
		scopeDiffRisks,
		repeatedFailureRisks,
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
		return { ...report, verification_plan_id: verificationPlanId, requirements };
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
		verification_plan_id: verificationPlanId,
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
		`completion verdict: ${output.completion_verdict.status} (${output.completion_verdict.primary_reason})`,
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
		if (parsed.changed) {
			const changedInput = createInputFromChanged(projectRoot);
			input = changedInput.input;
			changedPlan = changedInput.plan;
		} else if (parsed.fromClassification || parsed.fromPlan) {
			input = readInputFromPlan(projectRoot, (parsed.fromClassification ?? parsed.fromPlan) as string);
		} else {
			input = {
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

	const output = await createVerifyOutput(
		input,
		parsed.fromClassification ?? parsed.fromPlan ?? (parsed.changed ? 'changed' : null),
		projectRoot,
		lang,
		reproEvidence,
		externalChecks,
	);

	if (parsed.json) {
		reporter.stdout(JSON.stringify(output, null, 2));
	} else {
		reporter.stdout(renderVerifyOutput(output, lang));
	}

	return output.status === 'passed' ? 0 : 1;
}
