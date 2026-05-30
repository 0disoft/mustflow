import { existsSync } from 'node:fs';
import path from 'node:path';

import { createClassifyOutput, type ClassifyOutput } from './classify.js';
import {
	createChangeVerificationReport,
	type ChangeVerificationReport,
	type VerificationRequirement,
} from '../../core/change-verification.js';
import { readUtf8FileInsideWithoutSymlinks } from '../../core/safe-filesystem.js';
import { createVerificationPlanId } from '../../core/verification-plan-id.js';
import { printUsageError, renderHelp } from '../lib/cli-output.js';
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
const COMMANDS_RELATIVE_PATH = '.mustflow/config/commands.toml';
const LATEST_RUN_RELATIVE_PATH = '.mustflow/state/runs/latest.json';
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
	readonly gap_count: number;
	readonly gaps: readonly ApiVerificationPlanGap[];
	readonly recommended_commands: readonly string[];
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

export function getApiHelp(lang: CliLang = 'en'): string {
	return renderHelp(
		{
			usage: 'mf api <action> [options]',
			summary: t(lang, 'api.help.summary'),
			commands: [
				{
					label: 'workspace-summary',
					description: t(lang, 'api.help.action.workspaceSummary'),
				},
				{
					label: 'command-catalog',
					description: t(lang, 'api.help.action.commandCatalog'),
				},
				{
					label: 'verification-plan',
					description: t(lang, 'api.help.action.verificationPlan'),
				},
				{
					label: 'latest-evidence',
					description: t(lang, 'api.help.action.latestEvidence'),
				},
				{
					label: 'diff-risk',
					description: t(lang, 'api.help.action.diffRisk'),
				},
				{
					label: 'health',
					description: t(lang, 'api.help.action.health'),
				},
			],
			options: [
				{ label: '--changed', description: t(lang, 'classify.help.option.changed') },
				{ label: '--json', description: t(lang, 'cli.option.json') },
				{ label: '-h, --help', description: t(lang, 'cli.option.help') },
			],
			examples: [
				'mf api workspace-summary --json',
				'mf api command-catalog --json',
				'mf api verification-plan --changed --json',
				'mf api latest-evidence --json',
				'mf api diff-risk --changed --json',
				'mf api health --json',
			],
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

function createRecommendedNextCommands(output: Pick<ApiWorkspaceSummaryOutput, 'installed' | 'check' | 'git_state'>): readonly string[] {
	if (!output.installed) {
		return ['mf init --dry-run', 'mf init --yes'];
	}

	if (!output.check.ok) {
		return ['mf check', 'mf status --json', 'mf update --dry-run'];
	}

	const commands = ['mf context --json', 'mf doctor --json', 'mf check --strict'];

	if (output.git_state.status === 'available' && output.git_state.changed_file_count !== null && output.git_state.changed_file_count > 0) {
		commands.push('mf classify --changed --json', 'mf verify --changed --plan-only --json');
	}

	return commands;
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
			gap_count: 0,
			gaps: [],
			recommended_commands: [],
			issues: [message],
		};
	}

	let report: ChangeVerificationReport | null = null;
	const issues: string[] = [];
	try {
		report = createChangeVerificationReport(classification, readCommandContract(mustflowRoot), mustflowRoot);
	} catch (error) {
		issues.push(error instanceof Error ? error.message : String(error));
	}

	const requiredVerification = report ? report.schedule.entries.map((entry) => entry.intent) : [];

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

function validateJsonOnlyAction(action: string, args: readonly string[], reporter: Reporter, lang: CliLang): boolean {
	if (args.includes('--help') || args.includes('-h')) {
		reporter.stdout(getApiHelp(lang));
		return false;
	}

	const supported = new Set(['--json']);
	const unsupported = args.filter((arg) => !supported.has(arg));

	if (unsupported.length > 0) {
		printUsageError(reporter, t(lang, 'cli.error.unknownOption', { option: unsupported[0] }), 'mf api --help', getApiHelp(lang), lang);
		return false;
	}

	if (!args.includes('--json')) {
		printUsageError(reporter, t(lang, 'api.error.actionRequiresJson', { action }), 'mf api --help', getApiHelp(lang), lang);
		return false;
	}

	return true;
}

function runWorkspaceSummary(args: readonly string[], reporter: Reporter, lang: CliLang): number {
	if (!validateJsonOnlyAction('workspace-summary', args, reporter, lang)) {
		return args.includes('--help') || args.includes('-h') ? 0 : 1;
	}

	reporter.stdout(JSON.stringify(createWorkspaceSummaryOutput(), null, 2));
	return 0;
}

function runCommandCatalog(args: readonly string[], reporter: Reporter, lang: CliLang): number {
	if (!validateJsonOnlyAction('command-catalog', args, reporter, lang)) {
		return args.includes('--help') || args.includes('-h') ? 0 : 1;
	}

	reporter.stdout(JSON.stringify(createCommandCatalogOutput(), null, 2));
	return 0;
}

function validateChangedJsonAction(action: string, args: readonly string[], reporter: Reporter, lang: CliLang): boolean {
	if (args.includes('--help') || args.includes('-h')) {
		reporter.stdout(getApiHelp(lang));
		return false;
	}

	const supported = new Set(['--changed', '--json']);
	const unsupported = args.filter((arg) => !supported.has(arg));

	if (unsupported.length > 0) {
		printUsageError(reporter, t(lang, 'cli.error.unknownOption', { option: unsupported[0] }), 'mf api --help', getApiHelp(lang), lang);
		return false;
	}

	if (!args.includes('--json')) {
		printUsageError(reporter, t(lang, 'api.error.actionRequiresJson', { action }), 'mf api --help', getApiHelp(lang), lang);
		return false;
	}

	if (!args.includes('--changed')) {
		printUsageError(reporter, t(lang, 'api.error.actionRequiresChanged', { action }), 'mf api --help', getApiHelp(lang), lang);
		return false;
	}

	return true;
}

function runVerificationPlan(args: readonly string[], reporter: Reporter, lang: CliLang): number {
	if (!validateChangedJsonAction('verification-plan', args, reporter, lang)) {
		return args.includes('--help') || args.includes('-h') ? 0 : 1;
	}

	reporter.stdout(JSON.stringify(createVerificationPlanOutput(), null, 2));
	return 0;
}

function runLatestEvidence(args: readonly string[], reporter: Reporter, lang: CliLang): number {
	if (!validateJsonOnlyAction('latest-evidence', args, reporter, lang)) {
		return args.includes('--help') || args.includes('-h') ? 0 : 1;
	}

	reporter.stdout(JSON.stringify(createLatestEvidenceOutput(), null, 2));
	return 0;
}

function runDiffRisk(args: readonly string[], reporter: Reporter, lang: CliLang): number {
	if (!validateChangedJsonAction('diff-risk', args, reporter, lang)) {
		return args.includes('--help') || args.includes('-h') ? 0 : 1;
	}

	reporter.stdout(JSON.stringify(createDiffRiskOutput(), null, 2));
	return 0;
}

function runHealth(args: readonly string[], reporter: Reporter, lang: CliLang): number {
	if (!validateJsonOnlyAction('health', args, reporter, lang)) {
		return args.includes('--help') || args.includes('-h') ? 0 : 1;
	}

	reporter.stdout(JSON.stringify(createHealthOutput(), null, 2));
	return 0;
}

export function runApi(args: string[], reporter: Reporter, lang: CliLang = 'en'): number {
	if (args.includes('--help') || args.includes('-h')) {
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

	if (action === 'workspace-summary') {
		return runWorkspaceSummary(rest, reporter, lang);
	}

	if (action === 'command-catalog') {
		return runCommandCatalog(rest, reporter, lang);
	}

	if (action === 'verification-plan') {
		return runVerificationPlan(rest, reporter, lang);
	}

	if (action === 'latest-evidence') {
		return runLatestEvidence(rest, reporter, lang);
	}

	if (action === 'diff-risk') {
		return runDiffRisk(rest, reporter, lang);
	}

	if (action === 'health') {
		return runHealth(rest, reporter, lang);
	}

	printUsageError(reporter, t(lang, 'api.error.unknownAction', { action }), 'mf api --help', getApiHelp(lang), lang);
	return 1;
}
