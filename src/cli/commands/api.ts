import { existsSync } from 'node:fs';
import path from 'node:path';

import { createClassifyOutput, type ClassifyOutput } from './classify.js';
import {
	API_REPORT_ACTIONS,
	apiReportActionSpec,
	isApiReportAction,
	type ApiReportAction,
} from './api/actions.js';
import { runChangedApiReport, runJsonOnlyApiReport } from './api/report-runner.js';
import { runApiServe } from './api/serve.js';
import { createRecommendedNextCommands } from './api/workspace-recommendations.js';
import { listActiveRunLocks, type ActiveRunLockEffect } from '../../core/active-run-locks.js';
import {
	createChangeVerificationReport,
	type ChangeVerificationReport,
	type VerificationRequirement,
} from '../../core/change-verification.js';
import {
	createComplexityBudgetReport,
	type ComplexityBudgetReport,
} from '../../core/complexity-budget.js';
import { readUtf8FileInsideWithoutSymlinks } from '../../core/safe-filesystem.js';
import { createVerificationPlanId } from '../../core/verification-plan-id.js';
import type { VerificationRiskAssessment } from '../../core/risk-priced-evidence.js';
import { printUsageError, renderHelp } from '../lib/cli-output.js';
import { hasCliOptionToken } from '../lib/option-parser.js';
import { getAgentContext, type AgentContext } from '../lib/agent-context.js';
import {
	isRecord,
	readCommandContract,
	readPositiveInteger,
	readString,
	readStringArray,
	type CommandContract,
	type TomlTable,
} from '../lib/command-contract.js';
import { readGitChangedFiles } from '../lib/git-changes.js';
import { t, type CliLang } from '../lib/i18n.js';
import { resolveMustflowRoot } from '../lib/project-root.js';
import { createRunPlan, type RunPlan } from '../lib/run-plan.js';
import type { Reporter } from '../lib/reporter.js';
import { checkMustflowProjectReport } from '../lib/validation.js';

const API_WORKSPACE_SUMMARY_SCHEMA_VERSION = '1';
const API_COMMAND_CATALOG_SCHEMA_VERSION = '1';
const API_VERIFICATION_PLAN_SCHEMA_VERSION = '1';
const API_LATEST_EVIDENCE_SCHEMA_VERSION = '1';
const API_DIFF_RISK_SCHEMA_VERSION = '1';
const API_HEALTH_SCHEMA_VERSION = '1';
const API_LOCKS_SCHEMA_VERSION = '1';
const COMMANDS_RELATIVE_PATH = '.mustflow/config/commands.toml';
const LATEST_RUN_RELATIVE_PATH = '.mustflow/state/runs/latest.json';
const LOCKS_RELATIVE_PATH = '.mustflow/state/locks';
const MUSTFLOW_JSON_MAX_BYTES = 1024 * 1024;

interface ApiWorkspaceSummaryCheck {
	readonly ok: boolean;
	readonly issue_count: number;
	readonly warning_count: number;
	readonly issues: readonly string[];
	readonly warnings: readonly string[];
}

interface ApiWorkspaceSummaryReadOrder {
	readonly required: readonly string[];
	readonly optional: readonly string[];
	readonly missing_required: readonly string[];
	readonly missing_optional: readonly string[];
}

interface ApiWorkspaceSummaryCommandSurface {
	readonly path: string;
	readonly exists: boolean;
	readonly total_intents: number;
	readonly runnable_intents: readonly string[];
	readonly runnable_count: number;
	readonly non_runnable_count: number;
}

interface ApiWorkspaceSummarySkillSurface {
	readonly index_path: '.mustflow/skills/INDEX.md';
	readonly index_exists: boolean;
	readonly routes_path: '.mustflow/skills/routes.toml';
	readonly routes_exists: boolean;
}

interface ApiWorkspaceSummaryGitState {
	readonly status: 'available' | 'unavailable';
	readonly changed_file_count: number | null;
	readonly changed_files: readonly string[];
	readonly error: string | null;
}

interface ApiWorkspaceSummaryOutput {
	readonly schema_version: string;
	readonly command: 'api workspace-summary';
	readonly mustflow_root: string;
	readonly installed: boolean;
	readonly manifest_lock: AgentContext['manifest_lock'];
	readonly template: AgentContext['template'];
	readonly check: ApiWorkspaceSummaryCheck;
	readonly read_order: ApiWorkspaceSummaryReadOrder;
	readonly command_surface: ApiWorkspaceSummaryCommandSurface;
	readonly skill_surface: ApiWorkspaceSummarySkillSurface;
	readonly git_state: ApiWorkspaceSummaryGitState;
	readonly latest_run: AgentContext['latest_run'];
	readonly effective_policy: AgentContext['effective_policy'];
	readonly state_policy: AgentContext['state_policy'];
	readonly blocked_actions: AgentContext['blocked_actions'];
	readonly recommended_read_surfaces: readonly string[];
	readonly recommended_next_commands: readonly string[];
	readonly issues: readonly string[];
}

interface ApiCommandCatalogContract {
	readonly path: typeof COMMANDS_RELATIVE_PATH;
	readonly exists: boolean;
	readonly parse_error: string | null;
	readonly total_intents: number;
	readonly runnable_count: number;
	readonly blocked_count: number;
}

interface ApiCommandCatalogExecutionPolicy {
	readonly command_authority: typeof COMMANDS_RELATIVE_PATH;
	readonly run_entrypoint: 'mf run <intent>';
	readonly preview_entrypoint: 'mf run <intent> --dry-run --json';
	readonly direct_commands_allowed: false;
	readonly requires_configured_oneshot_agent_allowed: true;
}

interface ApiCommandCatalogIntent {
	readonly name: string;
	readonly description: string | null;
	readonly kind: string | null;
	readonly status: string | null;
	readonly lifecycle: string | null;
	readonly run_policy: string | null;
	readonly runnable: boolean;
	readonly reason_code: string | null;
	readonly detail: string | null;
	readonly run_command: string | null;
	readonly preview_command: string | null;
	readonly mode: 'argv' | 'shell' | null;
	readonly cwd: string | null;
	readonly timeout_seconds: number | null;
	readonly kill_after_seconds: number | null;
	readonly max_output_bytes: number | null;
	readonly success_exit_codes: readonly number[] | null;
	readonly required_after: readonly string[];
	readonly writes: readonly string[];
	readonly effect_count: number;
	readonly network: boolean | null;
	readonly destructive: boolean | null;
	readonly accepts_test_targets: boolean;
	readonly env_policy: string | null;
	readonly env_allowlist: readonly string[];
	readonly precondition_count: number;
	readonly active_lock_conflict_count: number;
	readonly stale_active_lock_count: number;
	readonly agent_action: string | null;
	readonly manual_start_hint: string | null;
	readonly health_check_url: string | null;
	readonly stop_instruction: string | null;
	readonly related_oneshot_checks: readonly string[];
}

interface ApiCommandCatalogOutput {
	readonly schema_version: string;
	readonly command: 'api command-catalog';
	readonly mustflow_root: string;
	readonly command_contract: ApiCommandCatalogContract;
	readonly execution_policy: ApiCommandCatalogExecutionPolicy;
	readonly intents: readonly ApiCommandCatalogIntent[];
	readonly issues: readonly string[];
}

interface ApiVerificationPlanSource {
	readonly kind: 'changed';
	readonly command: 'mf verify --changed --plan-only --json';
}

interface ApiVerificationPlanClassification {
	readonly source: 'changed';
	readonly file_count: number;
	readonly files: readonly string[];
	readonly validation_reasons: readonly string[];
	readonly public_surface_count: number;
	readonly update_policies: readonly string[];
	readonly drift_checks: readonly string[];
}

interface ApiVerificationPlanRequirement {
	readonly reason: string;
	readonly file_count: number;
	readonly files: readonly string[];
	readonly surfaces: readonly string[];
	readonly affected_contracts: readonly string[];
	readonly drift_checks: readonly string[];
	readonly update_policies: readonly string[];
}

interface ApiVerificationPlanCandidate {
	readonly reason: string;
	readonly intent: string | null;
	readonly status: string;
	readonly selection_state: string;
	readonly eligibility_state: string;
	readonly candidate_state: string;
	readonly skip_reason: string | null;
	readonly detail: string | null;
}

interface ApiVerificationPlanGap {
	readonly reason: string;
	readonly files: readonly string[];
	readonly surfaces: readonly string[];
	readonly detail: string;
}

interface ApiVerificationPlanScheduleEntry {
	readonly intent: string;
	readonly run_command: string | null;
	readonly preview_command: string | null;
	readonly parallel_eligible: boolean;
	readonly parallel_reason: string;
	readonly locks: readonly string[];
	readonly conflict_count: number;
}

interface ApiVerificationPlanScheduleBatch {
	readonly index: number;
	readonly intents: readonly string[];
	readonly locks: readonly string[];
}

interface ApiVerificationPlanSchedule {
	readonly runner: string;
	readonly entry_count: number;
	readonly batch_count: number;
	readonly selected_intents: readonly string[];
	readonly entries: readonly ApiVerificationPlanScheduleEntry[];
	readonly batches: readonly ApiVerificationPlanScheduleBatch[];
	readonly notes: readonly string[];
}

interface ApiVerificationPlanTestSelection {
	readonly status: string;
	readonly candidate_count: number;
	readonly selected_count: number;
	readonly note: string | null;
}

interface ApiVerificationPlanExecutionPolicy {
	readonly plan_command: 'mf verify --changed --plan-only --json';
	readonly run_command: 'mf verify --changed --json';
	readonly direct_commands_allowed: false;
	readonly selected_intents_run_via: 'mf run <intent>';
}

interface ApiVerificationPlanOutput {
	readonly schema_version: string;
	readonly command: 'api verification-plan';
	readonly mustflow_root: string;
	readonly source: ApiVerificationPlanSource;
	readonly status: 'available' | 'unavailable';
	readonly verification_plan_id: string | null;
	readonly classification: ApiVerificationPlanClassification | null;
	readonly requirements: readonly ApiVerificationPlanRequirement[];
	readonly candidates: readonly ApiVerificationPlanCandidate[];
	readonly gaps: readonly ApiVerificationPlanGap[];
	readonly risk_assessment: VerificationRiskAssessment | null;
	readonly schedule: ApiVerificationPlanSchedule | null;
	readonly test_selection: ApiVerificationPlanTestSelection | null;
	readonly execution_policy: ApiVerificationPlanExecutionPolicy;
	readonly issues: readonly string[];
}

interface ApiLatestEvidenceSummary {
	readonly exists: boolean;
	readonly path: typeof LATEST_RUN_RELATIVE_PATH;
	readonly kind: 'run_receipt' | 'verify_run_summary' | 'unknown' | null;
	readonly status: string | null;
	readonly intent: string | null;
	readonly reason: string | null;
	readonly verification_plan_id: string | null;
	readonly completion_verdict_status: string | null;
	readonly manifest_path: string | null;
	readonly receipt_path: string | null;
	readonly run_dir: string | null;
	readonly exit_code: number | null;
	readonly timed_out: boolean | null;
	readonly duration_ms: number | null;
	readonly summary: Record<string, unknown> | null;
}

interface ApiLatestEvidenceOutput {
	readonly schema_version: string;
	readonly command: 'api latest-evidence';
	readonly mustflow_root: string;
	readonly latest: ApiLatestEvidenceSummary;
	readonly manifest: {
		readonly status: 'available' | 'missing' | 'unavailable' | 'not_applicable';
		readonly path: string | null;
		readonly receipt_count: number | null;
		readonly error: string | null;
	};
	readonly policy: {
		readonly raw_output_included: false;
		readonly hidden_reasoning_included: false;
		readonly max_bytes: typeof MUSTFLOW_JSON_MAX_BYTES;
	};
	readonly issues: readonly string[];
}

interface ApiDiffRiskOutput {
	readonly schema_version: string;
	readonly command: 'api diff-risk';
	readonly mustflow_root: string;
	readonly source: ApiVerificationPlanSource;
	readonly status: 'available' | 'unavailable';
	readonly risk_level: 'none' | 'low' | 'medium' | 'high' | 'unknown';
	readonly changed_file_count: number;
	readonly changed_files: readonly string[];
	readonly public_surface_count: number;
	readonly validation_reasons: readonly string[];
	readonly update_policies: readonly string[];
	readonly drift_checks: readonly string[];
	readonly required_verification: readonly string[];
	readonly complexity_budget: ComplexityBudgetReport | null;
	readonly residual_corrections: ApiResidualCorrections;
	readonly gap_count: number;
	readonly gaps: readonly ApiVerificationPlanGap[];
	readonly recommended_commands: readonly string[];
	readonly issues: readonly string[];
}

interface ApiResidualCorrectionSignal {
	readonly kind: 'latest_unresolved_plan' | 'repeated_failure' | 'remaining_risk';
	readonly confidence: 'low' | 'medium' | 'high';
	readonly evidence_count: number;
	readonly source: 'latest-evidence';
	readonly verification_plan_id: string | null;
	readonly affected_reasons: readonly string[];
	readonly affected_intents: readonly string[];
	readonly detail: string;
	readonly recommendation: 'provide_new_evidence' | 'review_remaining_risk';
}

interface ApiResidualCorrections {
	readonly status: 'not_enough_evidence' | 'available' | 'unavailable';
	readonly mode: 'read_only';
	readonly grants_command_authority: false;
	readonly applies_to_current_plan: boolean;
	readonly selected_intent_additions: readonly string[];
	readonly suggested_intent_additions: readonly string[];
	readonly recommended_commands: readonly string[];
	readonly signals: readonly ApiResidualCorrectionSignal[];
	readonly policy: {
		readonly single_observation_changes_plan: false;
		readonly minimum_repeated_samples_for_plan_change: 2;
		readonly automatic_intent_additions_enabled: false;
	};
	readonly issues: readonly string[];
}

interface ApiHealthOutput {
	readonly schema_version: string;
	readonly command: 'api health';
	readonly mustflow_root: string;
	readonly status: 'ok' | 'degraded' | 'blocked';
	readonly installed: boolean;
	readonly check_ok: boolean;
	readonly command_contract_ok: boolean;
	readonly runnable_count: number;
	readonly git_status: ApiWorkspaceSummaryGitState['status'];
	readonly changed_file_count: number | null;
	readonly latest_run_exists: boolean;
	readonly blockers: readonly string[];
	readonly warnings: readonly string[];
	readonly recommended_next_commands: readonly string[];
}

interface ApiLocksOutput {
	readonly schema_version: string;
	readonly command: 'api locks';
	readonly mustflow_root: string;
	readonly status: 'clear' | 'active' | 'stale' | 'unavailable';
	readonly lock_root: typeof LOCKS_RELATIVE_PATH;
	readonly active_count: number;
	readonly stale_count: number;
	readonly active_locks: readonly ApiLockRecord[];
	readonly stale_locks: readonly ApiStaleLockRecord[];
	readonly policy: {
		readonly source: 'active-run-locks';
		readonly conflict_model: 'command_effects_and_writes';
		readonly direct_commands_bypass_locks: true;
		readonly wait_entrypoint: 'mf run <intent> --wait';
	};
	readonly recommended_commands: readonly string[];
	readonly issues: readonly string[];
}

interface ApiLockRecord {
	readonly run_id: string;
	readonly intent: string;
	readonly pid: number;
	readonly started_at: string;
	readonly command_hash: string | null;
	readonly effects: readonly ActiveRunLockEffect[];
	readonly writes: readonly string[];
}

interface ApiStaleLockRecord {
	readonly run_id: string;
	readonly intent: string;
	readonly pid: number;
	readonly reason: string;
}

type ApiReportOutput =
	| ApiWorkspaceSummaryOutput
	| ApiCommandCatalogOutput
	| ApiVerificationPlanOutput
	| ApiLatestEvidenceOutput
	| ApiDiffRiskOutput
	| ApiHealthOutput
	| ApiLocksOutput;

export function getApiHelp(lang: CliLang = 'en'): string {
	return renderHelp(
		{
			usage: 'mf api <action> [options]',
			summary: t(lang, 'api.help.summary'),
			commands: [
				...API_REPORT_ACTIONS.map((spec) => ({
					label: spec.action,
					description: t(lang, spec.helpKey),
				})),
				{ label: 'serve', description: t(lang, 'api.help.action.serve') },
			],
			options: [
				{ label: '--changed', description: t(lang, 'classify.help.option.changed') },
				{ label: '--json', description: t(lang, 'cli.option.json') },
				{ label: '--stdio', description: t(lang, 'api.help.option.stdio') },
				{ label: '-h, --help', description: t(lang, 'cli.option.help') },
			],
			examples: [...API_REPORT_ACTIONS.map((spec) => spec.example), 'mf api serve --stdio'],
			exitCodes: [
				{ label: '0', description: t(lang, 'api.help.exit.ok') },
				{ label: '1', description: t(lang, 'cli.common.invalidInput') },
			],
		},
		lang,
	);
}

function summarizeCheck(projectRoot: string): ApiWorkspaceSummaryCheck {
	const report = checkMustflowProjectReport(projectRoot, { strict: false });

	return {
		ok: report.issues.length === 0,
		issue_count: report.issues.length,
		warning_count: report.warnings.length,
		issues: report.issues,
		warnings: report.warnings,
	};
}

function summarizeReadOrder(context: AgentContext): ApiWorkspaceSummaryReadOrder {
	return {
		required: context.read_order.map((entry) => entry.path),
		optional: context.optional_read_order.map((entry) => entry.path),
		missing_required: context.read_order.filter((entry) => !entry.exists).map((entry) => entry.path),
		missing_optional: context.optional_read_order.filter((entry) => !entry.exists).map((entry) => entry.path),
	};
}

function summarizeCommandSurface(projectRoot: string, context: AgentContext): ApiWorkspaceSummaryCommandSurface {
	const catalog = createCommandCatalogOutputForRoot(projectRoot);
	const totalIntents = catalog.command_contract.parse_error === null ? catalog.command_contract.total_intents : context.command_contract.intents.length;
	const runnableIntents = catalog.command_contract.parse_error === null
		? catalog.intents.filter((intent) => intent.runnable).map((intent) => intent.name)
		: context.command_contract.runnable_intents;
	const runnableCount = runnableIntents.length;

	return {
		path: context.command_contract.path,
		exists: context.command_contract.exists,
		total_intents: totalIntents,
		runnable_intents: runnableIntents,
		runnable_count: runnableCount,
		non_runnable_count: Math.max(0, totalIntents - runnableCount),
	};
}

function pathExists(projectRoot: string, relativePath: string): boolean {
	const resolved = path.resolve(projectRoot, ...relativePath.split('/'));
	const root = path.resolve(projectRoot);
	const relative = path.relative(root, resolved);

	if (relative.startsWith('..') || path.isAbsolute(relative)) {
		return false;
	}

	return existsSync(resolved);
}

function summarizeSkillSurface(projectRoot: string): ApiWorkspaceSummarySkillSurface {
	return {
		index_path: '.mustflow/skills/INDEX.md',
		index_exists: pathExists(projectRoot, '.mustflow/skills/INDEX.md'),
		routes_path: '.mustflow/skills/routes.toml',
		routes_exists: pathExists(projectRoot, '.mustflow/skills/routes.toml'),
	};
}

function summarizeGitState(projectRoot: string): ApiWorkspaceSummaryGitState {
	const result = readGitChangedFiles(projectRoot);

	if (!result.ok) {
		return {
			status: 'unavailable',
			changed_file_count: null,
			changed_files: [],
			error: result.message,
		};
	}

	return {
		status: 'available',
		changed_file_count: result.files.length,
		changed_files: result.files,
		error: null,
	};
}

function createRecommendedReadSurfaces(context: AgentContext): readonly string[] {
	const surfaces = [
		...context.read_order.filter((entry) => entry.exists).map((entry) => entry.path),
		...context.optional_read_order.filter((entry) => entry.exists).map((entry) => entry.path),
	];

	return [...new Set(surfaces)];
}

function isSafeIntentName(value: string): boolean {
	return /^[A-Za-z0-9_-]+$/u.test(value);
}

function commandForIntent(kind: 'run' | 'preview', intentName: string): string | null {
	if (!isSafeIntentName(intentName)) {
		return null;
	}

	return kind === 'run' ? `mf run ${intentName}` : `mf run ${intentName} --dry-run --json`;
}

function acceptsTestTargets(intent: unknown): boolean {
	return isRecord(intent) && isRecord(intent.selection) && intent.selection.accepts_test_targets === true;
}

function readIntentStrings(intent: TomlTable | undefined, key: string): readonly string[] {
	return intent ? (readStringArray(intent, key) ?? []) : [];
}

function toNullableBoolean(value: boolean | undefined): boolean | null {
	return typeof value === 'boolean' ? value : null;
}

function readIntentBoolean(intent: TomlTable | undefined, key: string): boolean | null {
	const value = intent?.[key];
	return typeof value === 'boolean' ? value : null;
}

function getIntentMode(intent: TomlTable | undefined): 'argv' | 'shell' | null {
	if (!intent) {
		return null;
	}

	if (readStringArray(intent, 'argv')) {
		return 'argv';
	}

	return intent.mode === 'shell' && readString(intent, 'cmd') ? 'shell' : null;
}

function createCommandCatalogIntentFromError(contract: CommandContract, name: string, error: unknown): ApiCommandCatalogIntent {
	const rawIntent = isRecord(contract.intents[name]) ? contract.intents[name] : undefined;
	const message = error instanceof Error ? error.message : String(error);

	return {
		name,
		description: rawIntent ? readString(rawIntent, 'description') ?? null : null,
		kind: rawIntent ? readString(rawIntent, 'kind') ?? null : null,
		status: rawIntent ? readString(rawIntent, 'status') ?? null : null,
		lifecycle: rawIntent ? readString(rawIntent, 'lifecycle') ?? null : null,
		run_policy: rawIntent ? readString(rawIntent, 'run_policy') ?? null : null,
		runnable: false,
		reason_code: 'catalog_error',
		detail: message,
		run_command: null,
		preview_command: commandForIntent('preview', name),
		mode: getIntentMode(rawIntent),
		cwd: null,
		timeout_seconds: rawIntent ? readPositiveInteger(rawIntent, 'timeout_seconds') ?? null : null,
		kill_after_seconds: null,
		max_output_bytes: null,
		success_exit_codes: null,
		required_after: readIntentStrings(rawIntent, 'required_after'),
		writes: readIntentStrings(rawIntent, 'writes'),
		effect_count: Array.isArray(rawIntent?.effects) ? rawIntent.effects.length : 0,
		network: readIntentBoolean(rawIntent, 'network'),
		destructive: readIntentBoolean(rawIntent, 'destructive'),
		accepts_test_targets: acceptsTestTargets(rawIntent),
		env_policy: rawIntent ? readString(rawIntent, 'env_policy') ?? null : null,
		env_allowlist: readIntentStrings(rawIntent, 'env_allowlist'),
		precondition_count: 0,
		active_lock_conflict_count: 0,
		stale_active_lock_count: 0,
		agent_action: rawIntent ? readString(rawIntent, 'agent_action') ?? null : null,
		manual_start_hint: rawIntent ? readString(rawIntent, 'manual_start_hint') ?? null : null,
		health_check_url: rawIntent ? readString(rawIntent, 'health_check_url') ?? null : null,
		stop_instruction: rawIntent ? readString(rawIntent, 'stop_instruction') ?? null : null,
		related_oneshot_checks: readIntentStrings(rawIntent, 'related_oneshot_checks'),
	};
}

function createCommandCatalogIntent(projectRoot: string, contract: CommandContract, name: string): ApiCommandCatalogIntent {
	let plan: RunPlan;
	try {
		plan = createRunPlan(projectRoot, contract, name);
	} catch (error) {
		return createCommandCatalogIntentFromError(contract, name, error);
	}
	const rawIntent = isRecord(plan.intent) ? plan.intent : undefined;

	return {
		name,
		description: rawIntent ? readString(rawIntent, 'description') ?? null : null,
		kind: plan.kind,
		status: plan.intentStatus,
		lifecycle: plan.lifecycle,
		run_policy: plan.runPolicy,
		runnable: plan.ok,
		reason_code: plan.reasonCode,
		detail: plan.detail,
		run_command: plan.ok ? commandForIntent('run', name) : null,
		preview_command: commandForIntent('preview', name),
		mode: plan.mode,
		cwd: plan.relativeCwd,
		timeout_seconds: plan.timeoutSeconds,
		kill_after_seconds: plan.killAfterSeconds,
		max_output_bytes: plan.maxOutputBytes,
		success_exit_codes: plan.successExitCodes,
		required_after: readIntentStrings(rawIntent, 'required_after'),
		writes: plan.writes ?? [],
		effect_count: plan.effects?.length ?? 0,
		network: toNullableBoolean(plan.network),
		destructive: toNullableBoolean(plan.destructive),
		accepts_test_targets: acceptsTestTargets(rawIntent),
		env_policy: plan.envPolicy,
		env_allowlist: plan.envAllowlist,
		precondition_count: plan.preconditions.length,
		active_lock_conflict_count: plan.activeLockConflicts.length,
		stale_active_lock_count: plan.staleActiveLocks.length,
		agent_action: rawIntent ? readString(rawIntent, 'agent_action') ?? null : null,
		manual_start_hint: plan.manualStartHint,
		health_check_url: plan.healthCheckUrl,
		stop_instruction: plan.stopInstruction,
		related_oneshot_checks: plan.relatedOneshotChecks,
	};
}

function createEmptyCommandCatalogContract(exists: boolean, parseError: string | null): ApiCommandCatalogContract {
	return {
		path: COMMANDS_RELATIVE_PATH,
		exists,
		parse_error: parseError,
		total_intents: 0,
		runnable_count: 0,
		blocked_count: 0,
	};
}

function createCommandCatalogOutputForRoot(mustflowRoot: string): ApiCommandCatalogOutput {
	const executionPolicy: ApiCommandCatalogExecutionPolicy = {
		command_authority: COMMANDS_RELATIVE_PATH,
		run_entrypoint: 'mf run <intent>',
		preview_entrypoint: 'mf run <intent> --dry-run --json',
		direct_commands_allowed: false,
		requires_configured_oneshot_agent_allowed: true,
	};

	if (!pathExists(mustflowRoot, COMMANDS_RELATIVE_PATH)) {
		return {
			schema_version: API_COMMAND_CATALOG_SCHEMA_VERSION,
			command: 'api command-catalog',
			mustflow_root: mustflowRoot,
			command_contract: createEmptyCommandCatalogContract(false, null),
			execution_policy: executionPolicy,
			intents: [],
			issues: [`${COMMANDS_RELATIVE_PATH} is missing.`],
		};
	}

	let contract: CommandContract;
	try {
		contract = readCommandContract(mustflowRoot);
	} catch (error) {
		const message = error instanceof Error ? error.message : String(error);
		return {
			schema_version: API_COMMAND_CATALOG_SCHEMA_VERSION,
			command: 'api command-catalog',
			mustflow_root: mustflowRoot,
			command_contract: createEmptyCommandCatalogContract(true, message),
			execution_policy: executionPolicy,
			intents: [],
			issues: [message],
		};
	}

	const intents = Object.keys(contract.intents)
		.sort((left, right) => left.localeCompare(right))
		.map((name) => createCommandCatalogIntent(mustflowRoot, contract, name));
	const runnableCount = intents.filter((intent) => intent.runnable).length;

	return {
		schema_version: API_COMMAND_CATALOG_SCHEMA_VERSION,
		command: 'api command-catalog',
		mustflow_root: mustflowRoot,
		command_contract: {
			path: COMMANDS_RELATIVE_PATH,
			exists: true,
			parse_error: null,
			total_intents: intents.length,
			runnable_count: runnableCount,
			blocked_count: Math.max(0, intents.length - runnableCount),
		},
		execution_policy: executionPolicy,
		intents,
		issues: [],
	};
}

function createCommandCatalogOutput(): ApiCommandCatalogOutput {
	return createCommandCatalogOutputForRoot(resolveMustflowRoot());
}

function createWorkspaceSummaryOutput(): ApiWorkspaceSummaryOutput {
	const mustflowRoot = resolveMustflowRoot();
	const context = getAgentContext(mustflowRoot);
	const check = summarizeCheck(mustflowRoot);
	const gitState = summarizeGitState(mustflowRoot);
	const partialOutput = {
		installed: context.installed,
		check,
		git_state: gitState,
	};

	return {
		schema_version: API_WORKSPACE_SUMMARY_SCHEMA_VERSION,
		command: 'api workspace-summary',
		mustflow_root: context.mustflow_root,
		installed: context.installed,
		manifest_lock: context.manifest_lock,
		template: context.template,
		check,
		read_order: summarizeReadOrder(context),
		command_surface: summarizeCommandSurface(mustflowRoot, context),
		skill_surface: summarizeSkillSurface(mustflowRoot),
		git_state: gitState,
		latest_run: context.latest_run,
		effective_policy: context.effective_policy,
		state_policy: context.state_policy,
		blocked_actions: context.blocked_actions,
		recommended_read_surfaces: createRecommendedReadSurfaces(context),
		recommended_next_commands: createRecommendedNextCommands(partialOutput),
		issues: context.issues,
	};
}

function createVerificationPlanExecutionPolicy(): ApiVerificationPlanExecutionPolicy {
	return {
		plan_command: 'mf verify --changed --plan-only --json',
		run_command: 'mf verify --changed --json',
		direct_commands_allowed: false,
		selected_intents_run_via: 'mf run <intent>',
	};
}

function createVerificationPlanSource(): ApiVerificationPlanSource {
	return {
		kind: 'changed',
		command: 'mf verify --changed --plan-only --json',
	};
}

function toVerificationPlanClassification(output: ClassifyOutput): ApiVerificationPlanClassification {
	return {
		source: 'changed',
		file_count: output.summary.fileCount,
		files: output.files,
		validation_reasons: output.summary.validationReasons,
		public_surface_count: output.summary.publicSurfaceCount,
		update_policies: output.summary.updatePolicies,
		drift_checks: output.summary.driftChecks,
	};
}

function toVerificationPlanRequirement(requirement: VerificationRequirement): ApiVerificationPlanRequirement {
	return {
		reason: requirement.reason,
		file_count: requirement.files.length,
		files: requirement.files,
		surfaces: requirement.surfaces,
		affected_contracts: requirement.affectedContracts,
		drift_checks: requirement.driftChecks,
		update_policies: requirement.updatePolicies,
	};
}

function toVerificationPlanSchedule(report: ChangeVerificationReport): ApiVerificationPlanSchedule {
	return {
		runner: report.schedule.runner,
		entry_count: report.schedule.entries.length,
		batch_count: report.schedule.batches.length,
		selected_intents: report.schedule.entries.map((entry) => entry.intent),
		entries: report.schedule.entries.map((entry) => ({
			intent: entry.intent,
			run_command: commandForIntent('run', entry.intent),
			preview_command: commandForIntent('preview', entry.intent),
			parallel_eligible: entry.parallelEligible,
			parallel_reason: entry.parallelReason,
			locks: entry.locks,
			conflict_count: entry.conflicts.length,
		})),
		batches: report.schedule.batches.map((batch) => ({
			index: batch.index,
			intents: batch.intents,
			locks: batch.locks,
		})),
		notes: report.schedule.notes,
	};
}

function toVerificationPlanTestSelection(report: ChangeVerificationReport): ApiVerificationPlanTestSelection {
	return {
		status: report.test_selection.status,
		candidate_count: report.test_selection.matches.length,
		selected_count: report.test_selection.selected.length,
		note: report.test_selection.notes[0] ?? null,
	};
}

function createUnavailableVerificationPlanOutput(
	mustflowRoot: string,
	classification: ClassifyOutput | null,
	issue: string,
): ApiVerificationPlanOutput {
	return {
		schema_version: API_VERIFICATION_PLAN_SCHEMA_VERSION,
		command: 'api verification-plan',
		mustflow_root: mustflowRoot,
		source: createVerificationPlanSource(),
		status: 'unavailable',
		verification_plan_id: null,
		classification: classification ? toVerificationPlanClassification(classification) : null,
		requirements: [],
		candidates: [],
		gaps: [],
		risk_assessment: null,
		schedule: null,
		test_selection: null,
		execution_policy: createVerificationPlanExecutionPolicy(),
		issues: [issue],
	};
}

function createVerificationPlanOutput(): ApiVerificationPlanOutput {
	const mustflowRoot = resolveMustflowRoot();
	let classification: ClassifyOutput | null = null;

	try {
		classification = createClassifyOutput(mustflowRoot, 'changed', []);
	} catch (error) {
		const message = error instanceof Error ? error.message : String(error);
		return createUnavailableVerificationPlanOutput(mustflowRoot, null, message);
	}

	let contract: CommandContract;
	try {
		contract = readCommandContract(mustflowRoot);
	} catch (error) {
		const message = error instanceof Error ? error.message : String(error);
		return createUnavailableVerificationPlanOutput(mustflowRoot, classification, message);
	}

	let report: ChangeVerificationReport;
	try {
		report = createChangeVerificationReport(classification, contract, mustflowRoot);
	} catch (error) {
		const message = error instanceof Error ? error.message : String(error);
		return createUnavailableVerificationPlanOutput(mustflowRoot, classification, message);
	}

	return {
		schema_version: API_VERIFICATION_PLAN_SCHEMA_VERSION,
		command: 'api verification-plan',
		mustflow_root: mustflowRoot,
		source: createVerificationPlanSource(),
		status: 'available',
		verification_plan_id: createVerificationPlanId(report, contract),
		classification: toVerificationPlanClassification(classification),
		requirements: report.requirements.map(toVerificationPlanRequirement),
		candidates: report.candidates.map((candidate) => ({
			reason: candidate.reason,
			intent: candidate.intent,
			status: candidate.status,
			selection_state: candidate.selectionState,
			eligibility_state: candidate.eligibilityState,
			candidate_state: candidate.candidateState,
			skip_reason: candidate.skipReason,
			detail: candidate.detail,
		})),
		gaps: report.gaps.map((gap) => ({
			reason: gap.reason,
			files: gap.files,
			surfaces: gap.surfaces,
			detail: gap.detail,
		})),
		risk_assessment: report.risk_assessment,
		schedule: toVerificationPlanSchedule(report),
		test_selection: toVerificationPlanTestSelection(report),
		execution_policy: createVerificationPlanExecutionPolicy(),
		issues: [],
	};
}

function readJsonInsideRoot(projectRoot: string, relativePath: string): unknown {
	return JSON.parse(
		readUtf8FileInsideWithoutSymlinks(projectRoot, path.join(projectRoot, ...relativePath.split('/')), {
			maxBytes: MUSTFLOW_JSON_MAX_BYTES,
		}),
	);
}

function readLatestEvidenceManifest(projectRoot: string, latest: ApiLatestEvidenceSummary): ApiLatestEvidenceOutput['manifest'] {
	if (latest.kind !== 'verify_run_summary' || !latest.manifest_path) {
		return {
			status: 'not_applicable',
			path: null,
			receipt_count: null,
			error: null,
		};
	}

	try {
		const manifest = readJsonInsideRoot(projectRoot, latest.manifest_path);
		const receiptCount = isRecord(manifest) && Array.isArray(manifest.receipts) ? manifest.receipts.length : null;

		return {
			status: receiptCount === null ? 'unavailable' : 'available',
			path: latest.manifest_path,
			receipt_count: receiptCount,
			error: receiptCount === null ? 'Verify manifest is not a recognized manifest object.' : null,
		};
	} catch (error) {
		return {
			status: 'unavailable',
			path: latest.manifest_path,
			receipt_count: null,
			error: error instanceof Error ? error.message : String(error),
		};
	}
}

function latestEvidenceSummaryFromParsed(parsed: unknown): ApiLatestEvidenceSummary {
	if (!isRecord(parsed)) {
		return {
			exists: true,
			path: LATEST_RUN_RELATIVE_PATH,
			kind: 'unknown',
			status: null,
			intent: null,
			reason: null,
			verification_plan_id: null,
			completion_verdict_status: null,
			manifest_path: null,
			receipt_path: null,
			run_dir: null,
			exit_code: null,
			timed_out: null,
			duration_ms: null,
			summary: null,
		};
	}

	const command = readString(parsed, 'command');
	const kind = command === 'run'
		? 'run_receipt'
		: command === 'verify' && readString(parsed, 'kind') === 'verify_run_summary'
			? 'verify_run_summary'
			: 'unknown';
	const completionVerdict = isRecord(parsed.completion_verdict) ? parsed.completion_verdict : null;

	return {
		exists: true,
		path: LATEST_RUN_RELATIVE_PATH,
		kind,
		status: readString(parsed, 'status') ?? null,
		intent: readString(parsed, 'intent') ?? null,
		reason: readString(parsed, 'reason') ?? null,
		verification_plan_id: readString(parsed, 'verification_plan_id') ?? null,
		completion_verdict_status: completionVerdict ? readString(completionVerdict, 'status') ?? null : null,
		manifest_path: readString(parsed, 'manifest_path') ?? null,
		receipt_path: readString(parsed, 'receipt_path') ?? null,
		run_dir: readString(parsed, 'run_dir') ?? null,
		exit_code: typeof parsed.exit_code === 'number' ? parsed.exit_code : null,
		timed_out: typeof parsed.timed_out === 'boolean' ? parsed.timed_out : null,
		duration_ms: typeof parsed.duration_ms === 'number' ? parsed.duration_ms : null,
		summary: isRecord(parsed.summary) ? parsed.summary : null,
	};
}

function createLatestEvidenceOutput(): ApiLatestEvidenceOutput {
	const mustflowRoot = resolveMustflowRoot();
	const issues: string[] = [];
	let latest: ApiLatestEvidenceSummary;

	try {
		latest = latestEvidenceSummaryFromParsed(readJsonInsideRoot(mustflowRoot, LATEST_RUN_RELATIVE_PATH));
	} catch (error) {
		const message = error instanceof Error ? error.message : String(error);
		latest = {
			exists: false,
			path: LATEST_RUN_RELATIVE_PATH,
			kind: null,
			status: null,
			intent: null,
			reason: null,
			verification_plan_id: null,
			completion_verdict_status: null,
			manifest_path: null,
			receipt_path: null,
			run_dir: null,
			exit_code: null,
			timed_out: null,
			duration_ms: null,
			summary: null,
		};
		if (!message.includes('ENOENT')) {
			issues.push(message);
		}
	}

	return {
		schema_version: API_LATEST_EVIDENCE_SCHEMA_VERSION,
		command: 'api latest-evidence',
		mustflow_root: mustflowRoot,
		latest,
		manifest: readLatestEvidenceManifest(mustflowRoot, latest),
		policy: {
			raw_output_included: false,
			hidden_reasoning_included: false,
			max_bytes: MUSTFLOW_JSON_MAX_BYTES,
		},
		issues,
	};
}

function getRiskLevel(classification: ClassifyOutput | null, report: ChangeVerificationReport | null): ApiDiffRiskOutput['risk_level'] {
	if (!classification || !report) {
		return 'unknown';
	}

	if (classification.summary.fileCount === 0) {
		return 'none';
	}

	if (report.risk_assessment.level === 'critical') {
		return 'high';
	}
	if (
		report.risk_assessment.level === 'high' ||
		report.risk_assessment.level === 'medium' ||
		report.risk_assessment.level === 'low'
	) {
		return report.risk_assessment.level;
	}

	const reasons = new Set(classification.summary.validationReasons);
	if (
		report.gaps.length > 0 ||
		classification.summary.publicSurfaceCount > 0 ||
		reasons.has('release_risk') ||
		reasons.has('package_metadata_change') ||
		reasons.has('mustflow_config_change') ||
		reasons.has('mustflow_docs_change')
	) {
		return 'high';
	}

	if (reasons.has('code_change') || reasons.has('behavior_change') || reasons.has('test_change') || reasons.has('unknown_change')) {
		return 'medium';
	}

	return 'low';
}

function uniqueSortedStrings(values: readonly unknown[]): readonly string[] {
	return [...new Set(values.filter((value): value is string => typeof value === 'string' && value.length > 0))]
		.sort((left, right) => left.localeCompare(right));
}

function readEvidenceRequirements(parsed: unknown): readonly Record<string, unknown>[] {
	if (!isRecord(parsed) || !isRecord(parsed.evidence_model) || !Array.isArray(parsed.evidence_model.requirements)) {
		return [];
	}

	return parsed.evidence_model.requirements.filter(isRecord);
}

function readEvidenceRemainingRisks(parsed: unknown): readonly Record<string, unknown>[] {
	if (!isRecord(parsed) || !isRecord(parsed.evidence_model) || !Array.isArray(parsed.evidence_model.remaining_risks)) {
		return [];
	}

	return parsed.evidence_model.remaining_risks.filter(isRecord);
}

function readEvidenceReceipts(parsed: unknown): readonly Record<string, unknown>[] {
	if (!isRecord(parsed) || !isRecord(parsed.evidence_model) || !Array.isArray(parsed.evidence_model.receipts)) {
		return [];
	}

	return parsed.evidence_model.receipts.filter(isRecord);
}

function affectedReasonsFromLatest(parsed: unknown): readonly string[] {
	return uniqueSortedStrings(readEvidenceRequirements(parsed).map((requirement) => readString(requirement, 'reason')));
}

function affectedIntentsFromLatest(parsed: unknown): readonly string[] {
	const requirementIntents = readEvidenceRequirements(parsed).flatMap((requirement) => [
		...(Array.isArray(requirement.selected_intents) ? requirement.selected_intents : []),
		...(Array.isArray(requirement.skipped_intents) ? requirement.skipped_intents : []),
	]);
	const receiptIntents = readEvidenceReceipts(parsed).map((receipt) => readString(receipt, 'intent'));

	return uniqueSortedStrings([...requirementIntents, ...receiptIntents]);
}

function repeatedFailureConfidence(seenCount: number, requiresNewEvidence: boolean): ApiResidualCorrectionSignal['confidence'] {
	if (requiresNewEvidence || seenCount >= 3) {
		return 'high';
	}

	return seenCount >= 2 ? 'medium' : 'low';
}

function createResidualPolicy(): ApiResidualCorrections['policy'] {
	return {
		single_observation_changes_plan: false,
		minimum_repeated_samples_for_plan_change: 2,
		automatic_intent_additions_enabled: false,
	};
}

function createEmptyResidualCorrections(
	status: ApiResidualCorrections['status'],
	issues: readonly string[] = [],
): ApiResidualCorrections {
	return {
		status,
		mode: 'read_only',
		grants_command_authority: false,
		applies_to_current_plan: false,
		selected_intent_additions: [],
		suggested_intent_additions: [],
		recommended_commands: [],
		signals: [],
		policy: createResidualPolicy(),
		issues,
	};
}

function createResidualCorrections(projectRoot: string, verificationPlanId: string | null): ApiResidualCorrections {
	if (!verificationPlanId) {
		return createEmptyResidualCorrections('not_enough_evidence');
	}

	let parsed: unknown;
	try {
		parsed = readJsonInsideRoot(projectRoot, LATEST_RUN_RELATIVE_PATH);
	} catch (error) {
		const message = error instanceof Error ? error.message : String(error);
		return message.includes('ENOENT') ? createEmptyResidualCorrections('not_enough_evidence') : createEmptyResidualCorrections('unavailable', [message]);
	}

	if (!isRecord(parsed) || parsed.command !== 'verify' || parsed.kind !== 'verify_run_summary') {
		return createEmptyResidualCorrections('not_enough_evidence');
	}

	const latestPlanId = readString(parsed, 'verification_plan_id') ?? null;
	const appliesToCurrentPlan = latestPlanId === verificationPlanId;
	const affectedReasons = affectedReasonsFromLatest(parsed);
	const affectedIntents = affectedIntentsFromLatest(parsed);
	const completionVerdict = isRecord(parsed.completion_verdict) ? parsed.completion_verdict : null;
	const completionStatus = completionVerdict ? readString(completionVerdict, 'status') : null;
	const signals: ApiResidualCorrectionSignal[] = [];

	if (appliesToCurrentPlan && completionStatus && completionStatus !== 'verified') {
		signals.push({
			kind: 'latest_unresolved_plan',
			confidence: 'low',
			evidence_count: 1,
			source: 'latest-evidence',
			verification_plan_id: latestPlanId,
			affected_reasons: affectedReasons,
			affected_intents: affectedIntents,
			detail: `Latest verify evidence for this plan ended with completion verdict ${completionStatus}; do not treat the base plan as complete without new evidence.`,
			recommendation: 'provide_new_evidence',
		});
	}

	const repeatedFailure = isRecord(parsed.repeated_failure_summary) ? parsed.repeated_failure_summary : null;
	if (appliesToCurrentPlan && repeatedFailure) {
		const seenCount = typeof repeatedFailure.seen_count === 'number' && Number.isFinite(repeatedFailure.seen_count)
			? Math.max(1, Math.floor(repeatedFailure.seen_count))
			: 1;
		const requiresNewEvidence = repeatedFailure.requires_new_evidence === true;

		if (seenCount >= 2 || requiresNewEvidence) {
			signals.push({
				kind: 'repeated_failure',
				confidence: repeatedFailureConfidence(seenCount, requiresNewEvidence),
				evidence_count: seenCount,
				source: 'latest-evidence',
				verification_plan_id: latestPlanId,
				affected_reasons: affectedReasons,
				affected_intents: affectedIntents,
				detail: 'Latest evidence reports repeated unresolved verification for this plan; collect new evidence or narrow the hypothesis before claiming completion.',
				recommendation: 'provide_new_evidence',
			});
		}
	}

	if (appliesToCurrentPlan) {
		for (const risk of readEvidenceRemainingRisks(parsed).slice(0, 5)) {
			const detail = readString(risk, 'detail') ?? readString(risk, 'code') ?? 'Latest verify evidence has a remaining risk.';
			signals.push({
				kind: 'remaining_risk',
				confidence: 'low',
				evidence_count: 1,
				source: 'latest-evidence',
				verification_plan_id: latestPlanId,
				affected_reasons: affectedReasons,
				affected_intents: affectedIntents,
				detail,
				recommendation: 'review_remaining_risk',
			});
		}
	}

	return {
		status: signals.length > 0 ? 'available' : 'not_enough_evidence',
		mode: 'read_only',
		grants_command_authority: false,
		applies_to_current_plan: appliesToCurrentPlan,
		selected_intent_additions: [],
		suggested_intent_additions: [],
		recommended_commands: signals.length > 0 ? ['mf api latest-evidence --json'] : [],
		signals,
		policy: createResidualPolicy(),
		issues: [],
	};
}

function createDiffRiskOutput(): ApiDiffRiskOutput {
	const mustflowRoot = resolveMustflowRoot();
	let classification: ClassifyOutput | null = null;

	try {
		classification = createClassifyOutput(mustflowRoot, 'changed', []);
	} catch (error) {
		const message = error instanceof Error ? error.message : String(error);
		return {
			schema_version: API_DIFF_RISK_SCHEMA_VERSION,
			command: 'api diff-risk',
			mustflow_root: mustflowRoot,
			source: createVerificationPlanSource(),
			status: 'unavailable',
			risk_level: 'unknown',
			changed_file_count: 0,
			changed_files: [],
			public_surface_count: 0,
			validation_reasons: [],
			update_policies: [],
			drift_checks: [],
			required_verification: [],
			complexity_budget: null,
			residual_corrections: createResidualCorrections(mustflowRoot, null),
			gap_count: 0,
			gaps: [],
			recommended_commands: [],
			issues: [message],
		};
	}

	const issues: string[] = [];
	let contract: CommandContract | null = null;
	try {
		contract = readCommandContract(mustflowRoot);
	} catch (error) {
		issues.push(error instanceof Error ? error.message : String(error));
	}

	let report: ChangeVerificationReport | null = null;
	if (contract) {
		try {
			report = createChangeVerificationReport(classification, contract, mustflowRoot);
		} catch (error) {
			issues.push(error instanceof Error ? error.message : String(error));
		}
	}

	const requiredVerification = report ? report.schedule.entries.map((entry) => entry.intent) : [];
	const verificationPlanId = report && contract ? createVerificationPlanId(report, contract) : null;
	const complexityBudget = createComplexityBudgetReport({
		files: classification.files,
		summary: classification.summary,
	});

	return {
		schema_version: API_DIFF_RISK_SCHEMA_VERSION,
		command: 'api diff-risk',
		mustflow_root: mustflowRoot,
		source: createVerificationPlanSource(),
		status: report ? 'available' : 'unavailable',
		risk_level: getRiskLevel(classification, report),
		changed_file_count: classification.summary.fileCount,
		changed_files: classification.files,
		public_surface_count: classification.summary.publicSurfaceCount,
		validation_reasons: classification.summary.validationReasons,
		update_policies: classification.summary.updatePolicies,
		drift_checks: classification.summary.driftChecks,
		required_verification: requiredVerification,
		complexity_budget: complexityBudget,
		residual_corrections: createResidualCorrections(mustflowRoot, verificationPlanId),
		gap_count: report?.gaps.length ?? 0,
		gaps: report?.gaps.map((gap) => ({
			reason: gap.reason,
			files: gap.files,
			surfaces: gap.surfaces,
			detail: gap.detail,
		})) ?? [],
		recommended_commands: [
			'mf api verification-plan --changed --json',
			...(requiredVerification.length > 0 ? ['mf verify --changed --json'] : []),
		],
		issues,
	};
}

function createHealthOutput(): ApiHealthOutput {
	const workspace = createWorkspaceSummaryOutput();
	const catalog = createCommandCatalogOutputForRoot(workspace.mustflow_root);
	const blockers = [
		...workspace.check.issues,
		...catalog.issues,
	];
	const warnings = [
		...workspace.check.warnings,
		...(workspace.git_state.status === 'unavailable' && workspace.git_state.error ? [workspace.git_state.error] : []),
	];
	const commandContractOk = catalog.command_contract.exists && catalog.command_contract.parse_error === null;
	const status: ApiHealthOutput['status'] = blockers.length > 0 || !workspace.installed || !commandContractOk
		? 'blocked'
		: warnings.length > 0
			? 'degraded'
			: 'ok';

	return {
		schema_version: API_HEALTH_SCHEMA_VERSION,
		command: 'api health',
		mustflow_root: workspace.mustflow_root,
		status,
		installed: workspace.installed,
		check_ok: workspace.check.ok,
		command_contract_ok: commandContractOk,
		runnable_count: catalog.command_contract.runnable_count,
		git_status: workspace.git_state.status,
		changed_file_count: workspace.git_state.changed_file_count,
		latest_run_exists: workspace.latest_run.exists,
		blockers,
		warnings,
		recommended_next_commands: workspace.recommended_next_commands,
	};
}

function createLocksOutput(): ApiLocksOutput {
	const mustflowRoot = resolveMustflowRoot();
	try {
		const state = listActiveRunLocks(mustflowRoot);
		const activeLocks = state.activeRecords.map((record) => ({
			run_id: record.run_id,
			intent: record.intent,
			pid: record.pid,
			started_at: record.started_at,
			command_hash: record.command_hash,
			effects: record.effects,
			writes: record.writes,
		}));
		const staleLocks = state.staleRecords.map((record) => ({
			run_id: record.runId,
			intent: record.intent,
			pid: record.pid,
			reason: record.reason,
		}));
		const recommendedCommands = activeLocks.length > 0 ? ['mf api locks --json', 'mf run <intent> --wait'] : [];

		return {
			schema_version: API_LOCKS_SCHEMA_VERSION,
			command: 'api locks',
			mustflow_root: mustflowRoot,
			status: activeLocks.length > 0 ? 'active' : staleLocks.length > 0 ? 'stale' : 'clear',
			lock_root: LOCKS_RELATIVE_PATH,
			active_count: activeLocks.length,
			stale_count: staleLocks.length,
			active_locks: activeLocks,
			stale_locks: staleLocks,
			policy: {
				source: 'active-run-locks',
				conflict_model: 'command_effects_and_writes',
				direct_commands_bypass_locks: true,
				wait_entrypoint: 'mf run <intent> --wait',
			},
			recommended_commands: recommendedCommands,
			issues: [],
		};
	} catch (error) {
		return {
			schema_version: API_LOCKS_SCHEMA_VERSION,
			command: 'api locks',
			mustflow_root: mustflowRoot,
			status: 'unavailable',
			lock_root: LOCKS_RELATIVE_PATH,
			active_count: 0,
			stale_count: 0,
			active_locks: [],
			stale_locks: [],
			policy: {
				source: 'active-run-locks',
				conflict_model: 'command_effects_and_writes',
				direct_commands_bypass_locks: true,
				wait_entrypoint: 'mf run <intent> --wait',
			},
			recommended_commands: [],
			issues: [error instanceof Error ? error.message : String(error)],
		};
	}
}

function createApiReport(action: ApiReportAction): ApiReportOutput {
	switch (action) {
		case 'workspace-summary':
			return createWorkspaceSummaryOutput();
		case 'command-catalog':
			return createCommandCatalogOutput();
		case 'verification-plan':
			return createVerificationPlanOutput();
		case 'latest-evidence':
			return createLatestEvidenceOutput();
		case 'diff-risk':
			return createDiffRiskOutput();
		case 'health':
			return createHealthOutput();
		case 'locks':
			return createLocksOutput();
	}
}

function writeApiReport(action: ApiReportAction, reporter: Reporter): void {
	reporter.stdout(JSON.stringify(createApiReport(action), null, 2));
}

export function runApi(args: string[], reporter: Reporter, lang: CliLang = 'en'): number | Promise<number> {
	if (hasCliOptionToken(args, '--help', ['-h'])) {
		reporter.stdout(getApiHelp(lang));
		return 0;
	}

	const [action, ...rest] = args;

	if (!action) {
		printUsageError(reporter, t(lang, 'api.error.missingAction'), 'mf api --help', getApiHelp(lang), lang);
		return 1;
	}

	if (action.startsWith('-')) {
		printUsageError(reporter, t(lang, 'cli.error.unknownOption', { option: action }), 'mf api --help', getApiHelp(lang), lang);
		return 1;
	}

	if (action === 'serve') {
		return runApiServe(rest, reporter, lang, {
			createReport: createApiReport,
			getHelp: getApiHelp,
		});
	}

	if (isApiReportAction(action)) {
		const reportRuntime = {
			getHelp: getApiHelp,
			writeReport: writeApiReport,
		};
		return apiReportActionSpec(action).requiresChanged
			? runChangedApiReport(action, rest, reporter, lang, reportRuntime)
			: runJsonOnlyApiReport(action, rest, reporter, lang, reportRuntime);
	}

	printUsageError(reporter, t(lang, 'api.error.unknownAction', { action }), 'mf api --help', getApiHelp(lang), lang);
	return 1;
}
