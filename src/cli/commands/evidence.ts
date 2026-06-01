import path from 'node:path';

import { createClassifyOutput, type ClassifyOutput } from './classify.js';
import {
	createChangeVerificationReport,
	type ChangeVerificationCandidate,
	type ChangeVerificationGap,
	type ChangeVerificationReport,
	type VerificationRequirement,
} from '../../core/change-verification.js';
import { readUtf8FileInsideWithoutSymlinks, writeJsonFileInsideWithoutSymlinks } from '../../core/safe-filesystem.js';
import { createVerificationPlanId } from '../../core/verification-plan-id.js';
import {
	isRecord,
	readCommandContract,
	readString,
	type CommandContract,
} from '../lib/command-contract.js';
import { printUsageError, renderHelp } from '../lib/cli-output.js';
import { t, type CliLang } from '../lib/i18n.js';
import {
	getParsedCliStringOption,
	hasCliOptionToken,
	hasParsedCliOption,
	parseCliOptions,
	type CliOptionParseError,
	type CliOptionSpec,
} from '../lib/option-parser.js';
import { resolveMustflowRoot } from '../lib/project-root.js';
import type { Reporter } from '../lib/reporter.js';

const EVIDENCE_SCHEMA_VERSION = '1';
const COMMAND_AUTHORITY = '.mustflow/config/commands.toml';
const LATEST_RUN_RELATIVE_PATH = '.mustflow/state/runs/latest.json';
const MAX_JSON_BYTES = 1024 * 1024;

const EVIDENCE_OPTIONS = [
	{ name: '--json', kind: 'boolean' },
	{ name: '--changed', kind: 'boolean' },
	{ name: '--latest', kind: 'boolean' },
	{ name: '--plan', kind: 'string' },
	{ name: '--export', kind: 'string' },
] as const satisfies readonly CliOptionSpec[];

const EVIDENCE_MISSING_VALUE_ERRORS = new Map<string, string>([
	['--plan', 'missing_plan_value'],
	['--export', 'missing_export_value'],
]);

type EvidenceSourceMode = 'changed' | 'latest' | 'plan';
type EvidenceStatus = 'verified' | 'unresolved' | 'needs_verification' | 'gaps' | 'latest_only' | 'no_changes' | 'unavailable';
type EvidencePlanSource = 'changed' | 'plan_file';

interface EvidenceArgs {
	readonly json: boolean;
	readonly mode: EvidenceSourceMode;
	readonly planPath: string | null;
	readonly exportPath: string | null;
	readonly error: string | null;
}

interface EvidencePolicy {
	readonly mode: 'read_only_report';
	readonly command_authority: typeof COMMAND_AUTHORITY;
	readonly direct_commands_allowed: false;
	readonly executes_commands: false;
	readonly grants_command_authority: false;
	readonly raw_output_included: false;
	readonly hidden_reasoning_included: false;
	readonly writes_files: boolean;
}

interface EvidenceSource {
	readonly mode: EvidenceSourceMode;
	readonly changed: boolean;
	readonly plan_path: string | null;
	readonly latest_path: typeof LATEST_RUN_RELATIVE_PATH;
}

interface EvidenceRequirementReport {
	readonly reason: string;
	readonly file_count: number;
	readonly files: readonly string[];
	readonly surfaces: readonly string[];
	readonly affected_contracts: readonly string[];
	readonly candidate_intents: readonly string[];
	readonly selected_intents: readonly string[];
	readonly skipped_intents: readonly string[];
	readonly status: 'covered_by_latest' | 'selected' | 'blocked' | 'unselected';
	readonly evidence_receipts: readonly string[];
	readonly gap_reasons: readonly string[];
}

interface EvidenceGapReport {
	readonly reason: string | null;
	readonly intent: string | null;
	readonly status: string | null;
	readonly files: readonly string[];
	readonly surfaces: readonly string[];
	readonly detail: string;
}

interface EvidencePlanReport {
	readonly source: EvidencePlanSource;
	readonly status: 'available' | 'unavailable' | 'no_changes';
	readonly verification_plan_id: string | null;
	readonly changed_file_count: number | null;
	readonly changed_files: readonly string[];
	readonly validation_reasons: readonly string[];
	readonly selected_intents: readonly string[];
	readonly requirement_count: number;
	readonly gap_count: number;
	readonly requirements: readonly EvidenceRequirementReport[];
	readonly gaps: readonly EvidenceGapReport[];
	readonly test_selection: {
		readonly status: string | null;
		readonly candidate_count: number | null;
		readonly selected_count: number | null;
		readonly note: string | null;
	} | null;
	readonly issues: readonly string[];
}

interface EvidenceLatestReceipt {
	readonly intent: string | null;
	readonly status: string | null;
	readonly skipped: boolean;
	readonly verification_plan_id: string | null;
	readonly receipt_path: string | null;
	readonly receipt_sha256: string | null;
}

interface EvidenceLatestRequirement {
	readonly reason: string;
	readonly outcome: string | null;
	readonly selected_intents: readonly string[];
	readonly skipped_intents: readonly string[];
}

interface EvidenceLatestReport {
	readonly status: 'available' | 'missing' | 'unavailable' | 'not_requested';
	readonly exists: boolean;
	readonly path: typeof LATEST_RUN_RELATIVE_PATH;
	readonly kind: 'run_receipt' | 'verify_run_summary' | 'unknown' | null;
	readonly verification_plan_id: string | null;
	readonly applies_to_plan: boolean | null;
	readonly completion_verdict_status: string | null;
	readonly execution_status: string | null;
	readonly receipt_count: number | null;
	readonly skipped_check_count: number;
	readonly remaining_risk_count: number;
	readonly requirements: readonly EvidenceLatestRequirement[];
	readonly receipts: readonly EvidenceLatestReceipt[];
	readonly skipped_checks: readonly EvidenceGapReport[];
	readonly remaining_risks: readonly EvidenceGapReport[];
	readonly issues: readonly string[];
}

interface EvidenceCoverageSummary {
	readonly requirement_count: number;
	readonly covered_by_latest_count: number;
	readonly selected_requirement_count: number;
	readonly blocked_requirement_count: number;
	readonly unselected_requirement_count: number;
	readonly selected_intent_count: number;
	readonly receipt_count: number;
	readonly skipped_check_count: number;
	readonly remaining_risk_count: number;
	readonly gap_count: number;
}

interface EvidenceOutput {
	readonly schema_version: typeof EVIDENCE_SCHEMA_VERSION;
	readonly command: 'evidence';
	readonly mustflow_root: string;
	readonly status: EvidenceStatus;
	readonly source: EvidenceSource;
	readonly policy: EvidencePolicy;
	readonly plan: EvidencePlanReport | null;
	readonly latest: EvidenceLatestReport;
	readonly coverage: EvidenceCoverageSummary;
	readonly recommended_commands: readonly string[];
	readonly export_path: string | null;
	readonly issues: readonly string[];
}

function getEvidenceHelp(lang: CliLang = 'en'): string {
	return renderHelp(
		{
			usage: 'mf evidence [--changed | --latest | --plan <path>] [options]',
			summary: t(lang, 'evidence.help.summary'),
			options: [
				{ label: '--changed', description: t(lang, 'evidence.help.option.changed') },
				{ label: '--latest', description: t(lang, 'evidence.help.option.latest') },
				{ label: '--plan <path>', description: t(lang, 'evidence.help.option.plan') },
				{ label: '--export <path>', description: t(lang, 'evidence.help.option.export') },
				{ label: '--json', description: t(lang, 'cli.option.json') },
				{ label: '-h, --help', description: t(lang, 'cli.option.help') },
			],
			examples: [
				'mf evidence --changed',
				'mf evidence --changed --json',
				'mf evidence --latest --json',
				'mf evidence --plan .mustflow/state/verification-plan.json --json',
				'mf evidence --changed --export .mustflow/state/evidence.json',
			],
			exitCodes: [
				{ label: '0', description: t(lang, 'evidence.help.exit.ok') },
				{ label: '1', description: t(lang, 'evidence.help.exit.fail') },
			],
		},
		lang,
	);
}

function parseEvidenceArgs(args: readonly string[]): EvidenceArgs {
	const parsed = parseCliOptions(args, EVIDENCE_OPTIONS);
	const json = hasParsedCliOption(parsed, '--json');
	const changed = hasParsedCliOption(parsed, '--changed');
	const latest = hasParsedCliOption(parsed, '--latest');
	const planPath = getParsedCliStringOption(parsed, '--plan');
	const exportPath = getParsedCliStringOption(parsed, '--export');

	if (parsed.error) {
		return { json, mode: 'changed', planPath, exportPath, error: mapEvidenceOptionParseError(parsed.error) };
	}

	const selectedModes = [changed, latest, planPath !== null].filter(Boolean).length;
	if (selectedModes > 1) {
		return { json, mode: 'changed', planPath, exportPath, error: 'conflicting_inputs' };
	}

	return {
		json,
		mode: latest ? 'latest' : planPath ? 'plan' : 'changed',
		planPath,
		exportPath,
		error: null,
	};
}

function mapEvidenceOptionParseError(error: CliOptionParseError): string {
	if (error.kind === 'missing_value') {
		return EVIDENCE_MISSING_VALUE_ERRORS.get(error.option) ?? error.option;
	}

	return error.option.startsWith('-') ? error.option : `unexpected:${error.option}`;
}

function uniqueSorted(values: Iterable<string | null | undefined>): readonly string[] {
	return [...new Set([...values].filter((value): value is string => typeof value === 'string' && value.length > 0))]
		.sort((left, right) => left.localeCompare(right));
}

function recordArray(value: unknown): readonly Record<string, unknown>[] {
	return Array.isArray(value) ? value.filter(isRecord) : [];
}

function stringArray(value: unknown): readonly string[] {
	return Array.isArray(value) ? uniqueSorted(value.filter((item): item is string => typeof item === 'string')) : [];
}

function readStringArrayField(record: Record<string, unknown>, key: string): readonly string[] {
	return stringArray(record[key]);
}

function readNumberField(record: Record<string, unknown>, key: string): number | null {
	const value = record[key];
	return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function readBooleanField(record: Record<string, unknown>, key: string): boolean | null {
	return typeof record[key] === 'boolean' ? record[key] : null;
}

function commandForIntent(intent: string): string {
	return `mf run ${intent}`;
}

function toGapReport(gap: ChangeVerificationGap | Record<string, unknown>): EvidenceGapReport {
	const record = isRecord(gap) ? gap : {};
	return {
		reason: readString(record, 'reason') ?? null,
		intent: readString(record, 'intent') ?? null,
		status: readString(record, 'status') ?? null,
		files: readStringArrayField(record, 'files'),
		surfaces: readStringArrayField(record, 'surfaces'),
		detail: readString(record, 'detail') ?? readString(record, 'code') ?? 'Evidence item has no detail.',
	};
}

function candidateIntent(candidate: ChangeVerificationCandidate | Record<string, unknown>): string | null {
	if ('intent' in candidate && typeof candidate.intent === 'string') {
		return candidate.intent.length > 0 ? candidate.intent : null;
	}
	return isRecord(candidate) ? readString(candidate, 'intent') ?? null : null;
}

function candidateReason(candidate: ChangeVerificationCandidate | Record<string, unknown>): string | null {
	if ('reason' in candidate && typeof candidate.reason === 'string') {
		return candidate.reason;
	}
	return isRecord(candidate) ? readString(candidate, 'reason') ?? null : null;
}

function candidateSelectionState(candidate: ChangeVerificationCandidate | Record<string, unknown>): string | null {
	if ('selectionState' in candidate && typeof candidate.selectionState === 'string') {
		return candidate.selectionState;
	}
	if ('selection_state' in candidate && typeof candidate.selection_state === 'string') {
		return candidate.selection_state;
	}
	return isRecord(candidate) ? readString(candidate, 'selection_state') ?? readString(candidate, 'selectionState') ?? null : null;
}

function candidateSkipReason(candidate: ChangeVerificationCandidate | Record<string, unknown>): string | null {
	if ('skipReason' in candidate && typeof candidate.skipReason === 'string') {
		return candidate.skipReason;
	}
	if ('skip_reason' in candidate && typeof candidate.skip_reason === 'string') {
		return candidate.skip_reason;
	}
	return isRecord(candidate) ? readString(candidate, 'skip_reason') ?? readString(candidate, 'skipReason') ?? null : null;
}

function requirementReason(requirement: VerificationRequirement | Record<string, unknown>): string {
	if ('reason' in requirement && typeof requirement.reason === 'string') {
		return requirement.reason;
	}
	return isRecord(requirement) ? readString(requirement, 'reason') ?? 'unknown' : 'unknown';
}

function requirementFiles(requirement: VerificationRequirement | Record<string, unknown>): readonly string[] {
	if ('files' in requirement && Array.isArray(requirement.files)) {
		return stringArray(requirement.files);
	}
	return isRecord(requirement) ? readStringArrayField(requirement, 'files') : [];
}

function requirementSurfaces(requirement: VerificationRequirement | Record<string, unknown>): readonly string[] {
	if ('surfaces' in requirement && Array.isArray(requirement.surfaces)) {
		return stringArray(requirement.surfaces);
	}
	return isRecord(requirement) ? readStringArrayField(requirement, 'surfaces') : [];
}

function requirementAffectedContracts(requirement: VerificationRequirement | Record<string, unknown>): readonly string[] {
	if ('affectedContracts' in requirement && Array.isArray(requirement.affectedContracts)) {
		return stringArray(requirement.affectedContracts);
	}
	if (isRecord(requirement)) {
		return uniqueSorted([
			...readStringArrayField(requirement, 'affected_contracts'),
			...readStringArrayField(requirement, 'affectedContracts'),
		]);
	}
	return [];
}

function latestReceiptPathsForIntents(latest: EvidenceLatestReport, intents: readonly string[]): readonly string[] {
	const selected = new Set(intents);
	return uniqueSorted(
		latest.receipts
			.filter((receipt) => receipt.intent !== null && selected.has(receipt.intent))
			.map((receipt) => receipt.receipt_path),
	);
}

function latestRequirementOutcome(latest: EvidenceLatestReport, reason: string): string | null {
	const matching = latest.requirements.find((requirement) => requirement.reason === reason);
	return matching?.outcome ?? null;
}

function createRequirementReport(input: {
	readonly requirement: VerificationRequirement | Record<string, unknown>;
	readonly candidates: readonly (ChangeVerificationCandidate | Record<string, unknown>)[];
	readonly gaps: readonly EvidenceGapReport[];
	readonly latest: EvidenceLatestReport;
}): EvidenceRequirementReport {
	const reason = requirementReason(input.requirement);
	const matchingCandidates = input.candidates.filter((candidate) => candidateReason(candidate) === reason);
	const candidateIntents = uniqueSorted(matchingCandidates.map(candidateIntent));
	const selectedIntents = uniqueSorted(
		matchingCandidates
			.filter((candidate) => candidateSelectionState(candidate) === 'selected')
			.map(candidateIntent),
	);
	const skippedIntents = uniqueSorted(
		matchingCandidates
			.filter((candidate) => candidateSkipReason(candidate) !== null || candidateSelectionState(candidate) === 'not_selected')
			.map(candidateIntent),
	);
	const matchingGaps = input.gaps.filter((gap) => gap.reason === reason);
	const latestOutcome = input.latest.applies_to_plan ? latestRequirementOutcome(input.latest, reason) : null;
	const status: EvidenceRequirementReport['status'] = latestOutcome === 'verified'
		? 'covered_by_latest'
		: matchingGaps.length > 0
			? 'blocked'
			: selectedIntents.length > 0
				? 'selected'
				: 'unselected';

	return {
		reason,
		file_count: requirementFiles(input.requirement).length,
		files: requirementFiles(input.requirement),
		surfaces: requirementSurfaces(input.requirement),
		affected_contracts: requirementAffectedContracts(input.requirement),
		candidate_intents: candidateIntents,
		selected_intents: selectedIntents,
		skipped_intents: skippedIntents,
		status,
		evidence_receipts: latestReceiptPathsForIntents(input.latest, selectedIntents),
		gap_reasons: matchingGaps.map((gap) => gap.detail),
	};
}

function selectedIntentsFromCandidates(candidates: readonly (ChangeVerificationCandidate | Record<string, unknown>)[]): readonly string[] {
	return uniqueSorted(
		candidates
			.filter((candidate) => candidateSelectionState(candidate) === 'selected')
			.map(candidateIntent),
	);
}

function createPlanFromReport(
	report: ChangeVerificationReport,
	contract: CommandContract,
	classification: ClassifyOutput,
	latest: EvidenceLatestReport,
): EvidencePlanReport {
	const gaps = report.gaps.map(toGapReport);
	const requirements = report.requirements.map((requirement) => createRequirementReport({
		requirement,
		candidates: report.candidates,
		gaps,
		latest,
	}));

	return {
		source: 'changed',
		status: classification.summary.fileCount === 0 ? 'no_changes' : 'available',
		verification_plan_id: createVerificationPlanId(report, contract),
		changed_file_count: classification.summary.fileCount,
		changed_files: classification.files,
		validation_reasons: classification.summary.validationReasons,
		selected_intents: report.schedule.entries.map((entry) => entry.intent),
		requirement_count: requirements.length,
		gap_count: gaps.length,
		requirements,
		gaps,
		test_selection: {
			status: report.test_selection.status,
			candidate_count: report.test_selection.matches.length,
			selected_count: report.test_selection.selected.length,
			note: report.test_selection.notes[0] ?? null,
		},
		issues: [],
	};
}

function createChangedPlan(mustflowRoot: string, latest: EvidenceLatestReport): EvidencePlanReport {
	let classification: ClassifyOutput;
	try {
		classification = createClassifyOutput(mustflowRoot, 'changed', []);
	} catch (error) {
		return unavailablePlan('changed', error);
	}

	let contract: CommandContract;
	try {
		contract = readCommandContract(mustflowRoot);
	} catch (error) {
		return unavailablePlan('changed', error, classification);
	}

	try {
		return createPlanFromReport(createChangeVerificationReport(classification, contract, mustflowRoot), contract, classification, latest);
	} catch (error) {
		return unavailablePlan('changed', error, classification);
	}
}

function unavailablePlan(source: EvidencePlanSource, error: unknown, classification: ClassifyOutput | null = null): EvidencePlanReport {
	return {
		source,
		status: 'unavailable',
		verification_plan_id: null,
		changed_file_count: classification?.summary.fileCount ?? null,
		changed_files: classification?.files ?? [],
		validation_reasons: classification?.summary.validationReasons ?? [],
		selected_intents: [],
		requirement_count: 0,
		gap_count: 0,
		requirements: [],
		gaps: [],
		test_selection: null,
		issues: [error instanceof Error ? error.message : String(error)],
	};
}

function createPlanFromFile(mustflowRoot: string, planPath: string, latest: EvidenceLatestReport): EvidencePlanReport {
	let parsed: unknown;
	try {
		parsed = readJsonInsideRoot(mustflowRoot, planPath);
	} catch (error) {
		return unavailablePlan('plan_file', error);
	}

	if (!isRecord(parsed)) {
		return unavailablePlan('plan_file', new Error('Plan file must contain a JSON object.'));
	}

	const apiVerificationPlan = readString(parsed, 'command') === 'api verification-plan';
	const requirements = recordArray(parsed.requirements);
	const candidates = recordArray(parsed.candidates);
	const gaps = recordArray(parsed.gaps).map(toGapReport);
	const schedule = isRecord(parsed.schedule) ? parsed.schedule : null;
	const testSelection = isRecord(parsed.test_selection) ? parsed.test_selection : null;
	const classification = isRecord(parsed.classification) ? parsed.classification : null;
	const selectedIntents = schedule
		? uniqueSorted([
			...readStringArrayField(schedule, 'selected_intents'),
			...recordArray(schedule.entries).map((entry) => readString(entry, 'intent')),
		])
		: selectedIntentsFromCandidates(candidates);
	const requirementReports = requirements.map((requirement) => createRequirementReport({
		requirement,
		candidates,
		gaps,
		latest,
	}));

	return {
		source: 'plan_file',
		status: 'available',
		verification_plan_id: readString(parsed, 'verification_plan_id') ?? null,
		changed_file_count: classification ? readNumberField(classification, 'file_count') : null,
		changed_files: classification ? readStringArrayField(classification, 'files') : readStringArrayField(parsed, 'files'),
		validation_reasons: classification ? readStringArrayField(classification, 'validation_reasons') : [],
		selected_intents: selectedIntents,
		requirement_count: requirementReports.length,
		gap_count: gaps.length,
		requirements: requirementReports,
		gaps,
		test_selection: testSelection
			? {
				status: readString(testSelection, 'status') ?? null,
				candidate_count: readNumberField(testSelection, 'candidate_count') ?? readNumberField(testSelection, 'matches_count'),
				selected_count: readNumberField(testSelection, 'selected_count'),
				note: readString(testSelection, 'note') ?? null,
			}
			: null,
		issues: apiVerificationPlan || requirements.length > 0 ? [] : ['Plan file is not a recognized mustflow verification-plan object.'],
	};
}

function readJsonInsideRoot(projectRoot: string, relativePath: string): unknown {
	return JSON.parse(
		readUtf8FileInsideWithoutSymlinks(projectRoot, path.join(projectRoot, ...relativePath.split('/')), {
			maxBytes: MAX_JSON_BYTES,
		}),
	);
}

function latestKind(parsed: Record<string, unknown>): EvidenceLatestReport['kind'] {
	if (readString(parsed, 'command') === 'run') {
		return 'run_receipt';
	}
	if (readString(parsed, 'command') === 'verify' && readString(parsed, 'kind') === 'verify_run_summary') {
		return 'verify_run_summary';
	}
	return 'unknown';
}

function readLatestReceipt(record: Record<string, unknown>): EvidenceLatestReceipt {
	return {
		intent: readString(record, 'intent') ?? null,
		status: readString(record, 'status') ?? null,
		skipped: readBooleanField(record, 'skipped') ?? false,
		verification_plan_id: readString(record, 'verification_plan_id') ?? null,
		receipt_path: readString(record, 'receipt_path') ?? null,
		receipt_sha256: readString(record, 'receipt_sha256') ?? null,
	};
}

function readLatestRequirement(record: Record<string, unknown>): EvidenceLatestRequirement {
	return {
		reason: readString(record, 'reason') ?? 'unknown',
		outcome: readString(record, 'outcome') ?? null,
		selected_intents: readStringArrayField(record, 'selected_intents'),
		skipped_intents: readStringArrayField(record, 'skipped_intents'),
	};
}

function createLatestReport(mustflowRoot: string, expectedPlanId: string | null, requested: boolean): EvidenceLatestReport {
	if (!requested) {
		return latestNotRequested();
	}

	let parsed: unknown;
	try {
		parsed = readJsonInsideRoot(mustflowRoot, LATEST_RUN_RELATIVE_PATH);
	} catch (error) {
		const message = error instanceof Error ? error.message : String(error);
		return {
			...latestEmpty('missing'),
			issues: message.includes('ENOENT') ? [] : [message],
			status: message.includes('ENOENT') ? 'missing' : 'unavailable',
		};
	}

	if (!isRecord(parsed)) {
		return { ...latestEmpty('unavailable'), exists: true, kind: 'unknown', issues: ['Latest evidence file must contain a JSON object.'] };
	}

	const evidenceModel = isRecord(parsed.evidence_model) ? parsed.evidence_model : null;
	const completionVerdict = isRecord(parsed.completion_verdict) ? parsed.completion_verdict : null;
	const requirements = evidenceModel ? recordArray(evidenceModel.requirements).map(readLatestRequirement) : [];
	const receipts = evidenceModel ? recordArray(evidenceModel.receipts).map(readLatestReceipt) : [];
	const skippedChecks = evidenceModel ? recordArray(evidenceModel.skipped_checks).map(toGapReport) : [];
	const remainingRisks = evidenceModel ? recordArray(evidenceModel.remaining_risks).map(toGapReport) : [];
	const latestPlanId = readString(parsed, 'verification_plan_id') ?? (evidenceModel ? readString(evidenceModel, 'verification_plan_id') : null) ?? null;
	const latest = {
		...latestEmpty('available'),
		exists: true,
		kind: latestKind(parsed),
		verification_plan_id: latestPlanId,
		applies_to_plan: expectedPlanId ? latestPlanId === expectedPlanId : null,
		completion_verdict_status: completionVerdict ? readString(completionVerdict, 'status') ?? null : null,
		execution_status: readString(parsed, 'execution_status') ?? readString(parsed, 'status') ?? null,
		receipt_count: receipts.length,
		skipped_check_count: skippedChecks.length,
		remaining_risk_count: remainingRisks.length,
		requirements,
		receipts,
		skipped_checks: skippedChecks,
		remaining_risks: remainingRisks,
	};

	return latest;
}

function latestEmpty(status: EvidenceLatestReport['status']): EvidenceLatestReport {
	return {
		status,
		exists: false,
		path: LATEST_RUN_RELATIVE_PATH,
		kind: null,
		verification_plan_id: null,
		applies_to_plan: null,
		completion_verdict_status: null,
		execution_status: null,
		receipt_count: null,
		skipped_check_count: 0,
		remaining_risk_count: 0,
		requirements: [],
		receipts: [],
		skipped_checks: [],
		remaining_risks: [],
		issues: [],
	};
}

function latestNotRequested(): EvidenceLatestReport {
	return latestEmpty('not_requested');
}

function createPolicy(writesFiles: boolean): EvidencePolicy {
	return {
		mode: 'read_only_report',
		command_authority: COMMAND_AUTHORITY,
		direct_commands_allowed: false,
		executes_commands: false,
		grants_command_authority: false,
		raw_output_included: false,
		hidden_reasoning_included: false,
		writes_files: writesFiles,
	};
}

function createCoverage(plan: EvidencePlanReport | null, latest: EvidenceLatestReport): EvidenceCoverageSummary {
	const requirements = plan?.requirements ?? [];
	return {
		requirement_count: requirements.length,
		covered_by_latest_count: requirements.filter((requirement) => requirement.status === 'covered_by_latest').length,
		selected_requirement_count: requirements.filter((requirement) => requirement.status === 'selected').length,
		blocked_requirement_count: requirements.filter((requirement) => requirement.status === 'blocked').length,
		unselected_requirement_count: requirements.filter((requirement) => requirement.status === 'unselected').length,
		selected_intent_count: plan?.selected_intents.length ?? 0,
		receipt_count: latest.receipts.length,
		skipped_check_count: latest.skipped_check_count,
		remaining_risk_count: latest.remaining_risk_count,
		gap_count: plan?.gap_count ?? 0,
	};
}

function alignPlanWithLatest(plan: EvidencePlanReport, latest: EvidenceLatestReport): EvidencePlanReport {
	if (!latest.applies_to_plan) {
		return plan;
	}

	return {
		...plan,
		requirements: plan.requirements.map((requirement) => {
			const latestOutcome = latestRequirementOutcome(latest, requirement.reason);
			return {
				...requirement,
				status: latestOutcome === 'verified' ? 'covered_by_latest' : requirement.status,
				evidence_receipts: latestReceiptPathsForIntents(latest, requirement.selected_intents),
			};
		}),
	};
}

function outputStatus(plan: EvidencePlanReport | null, latest: EvidenceLatestReport): EvidenceStatus {
	if (!plan) {
		return latest.status === 'available' ? 'latest_only' : 'unavailable';
	}
	if (plan.status === 'unavailable') {
		return 'unavailable';
	}
	if (plan.status === 'no_changes') {
		return 'no_changes';
	}
	if (latest.applies_to_plan && latest.completion_verdict_status === 'verified') {
		return 'verified';
	}
	if (latest.applies_to_plan && latest.completion_verdict_status && latest.completion_verdict_status !== 'verified') {
		return 'unresolved';
	}
	if (plan.gap_count > 0) {
		return 'gaps';
	}
	return plan.selected_intents.length > 0 ? 'needs_verification' : 'unresolved';
}

function recommendedCommands(plan: EvidencePlanReport | null, latest: EvidenceLatestReport): readonly string[] {
	if (!plan) {
		return latest.status === 'available' ? ['mf evidence --latest --json'] : ['mf verify --changed --json'];
	}
	if (plan.status === 'unavailable') {
		return ['mf doctor --json', 'mf api verification-plan --changed --json'];
	}
	if (plan.status === 'no_changes') {
		return ['mf doctor --json'];
	}
	if (plan.gap_count > 0) {
		return ['mf onboard commands', 'mf api verification-plan --changed --json'];
	}
	if (latest.applies_to_plan) {
		return ['mf api latest-evidence --json'];
	}
	if (plan.selected_intents.length > 0) {
		return ['mf verify --changed --json', ...plan.selected_intents.map(commandForIntent)];
	}
	return ['mf api verification-plan --changed --json'];
}

function createEvidenceOutput(args: EvidenceArgs): EvidenceOutput {
	const mustflowRoot = resolveMustflowRoot();
	const initialLatest = createLatestReport(mustflowRoot, null, args.mode !== 'plan');
	const initialPlan = args.mode === 'latest'
		? null
		: args.mode === 'plan' && args.planPath
			? createPlanFromFile(mustflowRoot, args.planPath, initialLatest)
			: createChangedPlan(mustflowRoot, initialLatest);
	const latest = args.mode === 'latest'
		? initialLatest
		: createLatestReport(mustflowRoot, initialPlan?.verification_plan_id ?? null, true);
	const plan = initialPlan ? alignPlanWithLatest(initialPlan, latest) : null;
	const issues = [...(plan?.issues ?? []), ...latest.issues];

	return {
		schema_version: EVIDENCE_SCHEMA_VERSION,
		command: 'evidence',
		mustflow_root: mustflowRoot,
		status: outputStatus(plan, latest),
		source: {
			mode: args.mode,
			changed: args.mode === 'changed',
			plan_path: args.planPath,
			latest_path: LATEST_RUN_RELATIVE_PATH,
		},
		policy: createPolicy(args.exportPath !== null),
		plan,
		latest,
		coverage: createCoverage(plan, latest),
		recommended_commands: recommendedCommands(plan, latest),
		export_path: args.exportPath,
		issues,
	};
}

function renderEvidence(output: EvidenceOutput, lang: CliLang): string {
	const lines = [
		t(lang, 'evidence.title'),
		`${t(lang, 'label.mustflowRoot')}: ${output.mustflow_root}`,
		`${t(lang, 'evidence.label.status')}: ${output.status}`,
		`${t(lang, 'evidence.label.source')}: ${output.source.mode}`,
		`${t(lang, 'evidence.label.plan')}: ${output.plan?.verification_plan_id ?? t(lang, 'value.none')}`,
		`${t(lang, 'evidence.label.requirements')}: ${output.coverage.requirement_count}`,
		`${t(lang, 'evidence.label.selectedIntents')}: ${output.plan?.selected_intents.join(', ') || t(lang, 'value.none')}`,
		`${t(lang, 'evidence.label.gaps')}: ${output.coverage.gap_count}`,
		`${t(lang, 'evidence.label.latest')}: ${output.latest.status}`,
	];

	if (output.plan && output.plan.requirements.length > 0) {
		lines.push('', t(lang, 'evidence.section.requirements'));
		for (const requirement of output.plan.requirements) {
			const intents = requirement.selected_intents.length > 0 ? requirement.selected_intents.join(', ') : t(lang, 'value.none');
			lines.push(`- ${requirement.reason}: ${requirement.status} (${intents})`);
		}
	}

	if (output.plan && output.plan.gaps.length > 0) {
		lines.push('', t(lang, 'evidence.section.gaps'));
		for (const gap of output.plan.gaps) {
			lines.push(`- ${gap.reason ?? t(lang, 'value.none')}: ${gap.detail}`);
		}
	}

	if (output.latest.remaining_risks.length > 0) {
		lines.push('', t(lang, 'evidence.section.remainingRisks'));
		for (const risk of output.latest.remaining_risks) {
			lines.push(`- ${risk.status ?? risk.reason ?? t(lang, 'value.none')}: ${risk.detail}`);
		}
	}

	lines.push('', t(lang, 'next.section.commands'));
	for (const command of output.recommended_commands) {
		lines.push(`- ${command}`);
	}

	return lines.join('\n');
}

function evidenceErrorMessage(error: string, lang: CliLang): string {
	if (error === 'missing_plan_value') {
		return t(lang, 'cli.error.missingValue', { option: '--plan' });
	}
	if (error === 'missing_export_value') {
		return t(lang, 'cli.error.missingValue', { option: '--export' });
	}
	if (error === 'conflicting_inputs') {
		return t(lang, 'evidence.error.conflictingInputs');
	}
	if (error.startsWith('unexpected:')) {
		return t(lang, 'cli.error.unexpectedArgument', { argument: error.slice('unexpected:'.length) });
	}
	return t(lang, 'cli.error.unknownOption', { option: error });
}

export function runEvidence(args: string[], reporter: Reporter, lang: CliLang = 'en'): number {
	if (hasCliOptionToken(args, '--help', ['-h'])) {
		reporter.stdout(getEvidenceHelp(lang));
		return 0;
	}

	const parsed = parseEvidenceArgs(args);
	if (parsed.error) {
		printUsageError(reporter, evidenceErrorMessage(parsed.error, lang), 'mf evidence --help', getEvidenceHelp(lang), lang);
		return 1;
	}

	let output: EvidenceOutput;
	try {
		output = createEvidenceOutput(parsed);
		if (parsed.exportPath) {
			const exportPath = path.isAbsolute(parsed.exportPath)
				? parsed.exportPath
				: path.join(output.mustflow_root, parsed.exportPath);
			writeJsonFileInsideWithoutSymlinks(output.mustflow_root, exportPath, output);
		}
	} catch (error) {
		printUsageError(reporter, error instanceof Error ? error.message : String(error), 'mf evidence --help', getEvidenceHelp(lang), lang);
		return 1;
	}

	if (parsed.json) {
		reporter.stdout(JSON.stringify(output, null, 2));
	} else {
		reporter.stdout(renderEvidence(output, lang));
	}

	return output.status === 'unavailable' ? 1 : 0;
}
