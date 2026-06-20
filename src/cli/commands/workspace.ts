import path from 'node:path';

import { createClassifyOutput, type ClassifyOutput } from './classify.js';
import {
	createChangeVerificationReport,
	type ChangeVerificationReport,
} from '../../core/change-verification.js';
import { createVerificationPlanId } from '../../core/verification-plan-id.js';
import type { VerificationRiskAssessment } from '../../core/risk-priced-evidence.js';
import type { TomlTable } from '../lib/command-contract.js';
import { printUsageError, renderHelp } from '../lib/cli-output.js';
import { t, type CliLang } from '../lib/i18n.js';
import {
	formatCliOptionParseError,
	hasCliOptionToken,
	hasParsedCliOption,
	parseCliOptions,
	type CliOptionSpec,
} from '../lib/option-parser.js';
import { resolveMustflowRoot } from '../lib/project-root.js';
import { getRepoMapConfig, discoverNestedRepositories, type NestedRepository } from '../lib/repo-map.js';
import { createRunPlan } from '../lib/run-plan.js';
import type { Reporter } from '../lib/reporter.js';
import { readCommandContract, readString, readStringArray, type CommandContract } from '../../core/config-loading.js';

const WORKSPACE_STATUS_SCHEMA_VERSION = '1';
const WORKSPACE_COMMAND_CATALOG_SCHEMA_VERSION = '1';
const WORKSPACE_VERIFICATION_PLAN_SCHEMA_VERSION = '1';
const WORKSPACE_STATUS_OPTIONS = [{ name: '--json', kind: 'boolean' }] as const satisfies readonly CliOptionSpec[];
const WORKSPACE_COMMAND_CATALOG_OPTIONS = [{ name: '--json', kind: 'boolean' }] as const satisfies readonly CliOptionSpec[];
const WORKSPACE_VERIFY_OPTIONS = [
	{ name: '--changed', kind: 'boolean' },
	{ name: '--plan-only', kind: 'boolean' },
	{ name: '--json', kind: 'boolean' },
] as const satisfies readonly CliOptionSpec[];

interface WorkspaceStatusConfig {
	readonly enabled: boolean;
	readonly roots: readonly string[];
	readonly max_depth: number;
	readonly max_repositories: number;
	readonly follow_symlinks: boolean;
	readonly stop_at_repository_root: boolean;
}

interface WorkspaceStatusPolicy {
	readonly mode: 'read_only';
	readonly grants_command_authority: false;
	readonly parent_root_grants_child_authority: false;
	readonly command_authority_per_root: '.mustflow/config/commands.toml';
	readonly run_entrypoint_per_root: 'mf run <intent>';
	readonly executes_commands: false;
	readonly raw_commands_included: false;
}

interface WorkspaceVerificationPlanPolicy extends WorkspaceStatusPolicy {
	readonly plan_command_per_root: 'mf verify --changed --plan-only --json';
	readonly selected_intents_run_via: 'mf run <intent>';
}

interface WorkspaceStatusCommandSurface {
	readonly path: string | null;
	readonly exists: boolean;
	readonly parse_error: string | null;
	readonly total_intents: number | null;
	readonly runnable_count: number | null;
	readonly runnable_intents: readonly string[];
	readonly blocked_count: number | null;
}

interface WorkspaceStatusRepository {
	readonly relative_path: string;
	readonly status: 'mustflow_ready' | 'contract_missing' | 'contract_invalid';
	readonly git_repository: true;
	readonly mustflow: boolean;
	readonly agent_rules: string | null;
	readonly repo_map: string | null;
	readonly mustflow_config: string | null;
	readonly command_contract: WorkspaceStatusCommandSurface;
	readonly context_index: string | null;
	readonly skill_index: string | null;
	readonly root_document_count: number;
	readonly machine_contract_count: number;
	readonly manifest_count: number;
	readonly command_adapter_count: number;
	readonly editing_policy_count: number;
	readonly issues: readonly string[];
}

interface WorkspaceStatusOutput {
	readonly schema_version: typeof WORKSPACE_STATUS_SCHEMA_VERSION;
	readonly command: 'workspace status';
	readonly mustflow_root: string;
	readonly workspace: WorkspaceStatusConfig;
	readonly policy: WorkspaceStatusPolicy;
	readonly repository_count: number;
	readonly repositories: readonly WorkspaceStatusRepository[];
	readonly issues: readonly string[];
}

interface WorkspaceCommandCatalogIntent {
	readonly name: string;
	readonly description: string | null;
	readonly status: string | null;
	readonly lifecycle: string | null;
	readonly run_policy: string | null;
	readonly runnable: boolean;
	readonly reason_code: string | null;
	readonly detail: string | null;
	readonly run_command: string | null;
	readonly run_from_repository: string;
	readonly timeout_seconds: number | null;
	readonly required_after: readonly string[];
	readonly writes: readonly string[];
	readonly network: boolean | null;
	readonly destructive: boolean | null;
}

interface WorkspaceCommandCatalogRepository {
	readonly relative_path: string;
	readonly status: 'available' | 'contract_missing' | 'contract_invalid';
	readonly command_contract: WorkspaceStatusCommandSurface;
	readonly intent_count: number;
	readonly runnable_count: number;
	readonly blocked_count: number;
	readonly intents: readonly WorkspaceCommandCatalogIntent[];
	readonly issues: readonly string[];
}

interface WorkspaceCommandCatalogOutput {
	readonly schema_version: typeof WORKSPACE_COMMAND_CATALOG_SCHEMA_VERSION;
	readonly command: 'workspace command-catalog';
	readonly mustflow_root: string;
	readonly workspace: WorkspaceStatusConfig;
	readonly policy: WorkspaceStatusPolicy;
	readonly repository_count: number;
	readonly total_intent_count: number;
	readonly runnable_intent_count: number;
	readonly repositories: readonly WorkspaceCommandCatalogRepository[];
	readonly issues: readonly string[];
}

interface WorkspaceVerificationPlanSelectedIntent {
	readonly intent: string;
	readonly run_command: string | null;
	readonly run_from_repository: string;
	readonly locks: readonly string[];
	readonly conflict_count: number;
}

interface WorkspaceVerificationPlanGap {
	readonly reason: string;
	readonly files: readonly string[];
	readonly surfaces: readonly string[];
	readonly detail: string;
}

interface WorkspaceVerificationPlanRepository {
	readonly relative_path: string;
	readonly status:
		| 'available'
		| 'contract_missing'
		| 'contract_invalid'
		| 'git_unavailable'
		| 'plan_unavailable';
	readonly command_contract: WorkspaceStatusCommandSurface;
	readonly changed_file_count: number | null;
	readonly changed_files: readonly string[];
	readonly verification_plan_id: string | null;
	readonly risk_assessment: VerificationRiskAssessment | null;
	readonly requirement_count: number;
	readonly candidate_count: number;
	readonly selected_intent_count: number;
	readonly gap_count: number;
	readonly selected_intents: readonly WorkspaceVerificationPlanSelectedIntent[];
	readonly gaps: readonly WorkspaceVerificationPlanGap[];
	readonly issues: readonly string[];
}

interface WorkspaceVerificationPlanOutput {
	readonly schema_version: typeof WORKSPACE_VERIFICATION_PLAN_SCHEMA_VERSION;
	readonly command: 'workspace verify';
	readonly mustflow_root: string;
	readonly workspace: WorkspaceStatusConfig;
	readonly policy: WorkspaceVerificationPlanPolicy;
	readonly repository_count: number;
	readonly total_changed_file_count: number;
	readonly total_requirement_count: number;
	readonly total_selected_intent_count: number;
	readonly total_gap_count: number;
	readonly repositories: readonly WorkspaceVerificationPlanRepository[];
	readonly issues: readonly string[];
}

function getWorkspaceHelp(lang: CliLang = 'en'): string {
	return renderHelp(
		{
			usage: 'mf workspace <action> [options]',
			summary: t(lang, 'workspace.help.summary'),
			commands: [
				{ label: 'status', description: t(lang, 'workspace.help.action.status') },
				{ label: 'command-catalog', description: t(lang, 'workspace.help.action.commandCatalog') },
				{ label: 'verify', description: t(lang, 'workspace.help.action.verify') },
			],
			options: [
				{ label: '--changed', description: t(lang, 'classify.help.option.changed') },
				{ label: '--plan-only', description: t(lang, 'verify.help.option.planOnly') },
				{ label: '--json', description: t(lang, 'cli.option.json') },
				{ label: '-h, --help', description: t(lang, 'cli.option.help') },
			],
			examples: [
				'mf workspace status --json',
				'mf workspace command-catalog --json',
				'mf workspace verify --changed --plan-only --json',
			],
			exitCodes: [
				{ label: '0', description: t(lang, 'workspace.help.exit.ok') },
				{ label: '1', description: t(lang, 'cli.common.invalidInput') },
			],
		},
		lang,
	);
}

function createWorkspaceStatusPolicy(): WorkspaceStatusPolicy {
	return {
		mode: 'read_only',
		grants_command_authority: false,
		parent_root_grants_child_authority: false,
		command_authority_per_root: '.mustflow/config/commands.toml',
		run_entrypoint_per_root: 'mf run <intent>',
		executes_commands: false,
		raw_commands_included: false,
	};
}

function createWorkspaceVerificationPlanPolicy(): WorkspaceVerificationPlanPolicy {
	return {
		...createWorkspaceStatusPolicy(),
		plan_command_per_root: 'mf verify --changed --plan-only --json',
		selected_intents_run_via: 'mf run <intent>',
	};
}

function getIntentNames(intents: TomlTable): readonly string[] {
	return Object.keys(intents).sort((left, right) => left.localeCompare(right));
}

function summarizeCommandSurface(repositoryRoot: string, repository: NestedRepository): WorkspaceStatusCommandSurface {
	if (!repository.commandContract) {
		return {
			path: null,
			exists: false,
			parse_error: null,
			total_intents: null,
			runnable_count: null,
			runnable_intents: [],
			blocked_count: null,
		};
	}

	try {
		const contract = readCommandContract(repositoryRoot);
		const intentNames = getIntentNames(contract.intents);
		const runnableIntents = intentNames.filter((intentName) => createRunPlan(repositoryRoot, contract, intentName).ok);

		return {
			path: repository.commandContract,
			exists: true,
			parse_error: null,
			total_intents: intentNames.length,
			runnable_count: runnableIntents.length,
			runnable_intents: runnableIntents,
			blocked_count: Math.max(0, intentNames.length - runnableIntents.length),
		};
	} catch (error) {
		return {
			path: repository.commandContract,
			exists: true,
			parse_error: error instanceof Error ? error.message : String(error),
			total_intents: null,
			runnable_count: null,
			runnable_intents: [],
			blocked_count: null,
		};
	}
}

function repositoryStatus(commandSurface: WorkspaceStatusCommandSurface): WorkspaceStatusRepository['status'] {
	if (!commandSurface.exists) {
		return 'contract_missing';
	}

	if (commandSurface.parse_error) {
		return 'contract_invalid';
	}

	return 'mustflow_ready';
}

function summarizeRepository(projectRoot: string, repository: NestedRepository): WorkspaceStatusRepository {
	const repositoryRoot = path.resolve(projectRoot, repository.relativePath);
	const commandSurface = summarizeCommandSurface(repositoryRoot, repository);
	const issues = commandSurface.parse_error ? [commandSurface.parse_error] : [];

	return {
		relative_path: repository.relativePath,
		status: repositoryStatus(commandSurface),
		git_repository: true,
		mustflow: repository.mustflow,
		agent_rules: repository.agentRules ?? null,
		repo_map: repository.repoMap ?? null,
		mustflow_config: repository.mustflowConfig ?? null,
		command_contract: commandSurface,
		context_index: repository.contextIndex ?? null,
		skill_index: repository.skillIndex ?? null,
		root_document_count: repository.rootDocuments.length,
		machine_contract_count: repository.machineContracts.length,
		manifest_count: repository.manifests.length,
		command_adapter_count: repository.commandAdapters.length,
		editing_policy_count: repository.editingPolicies.length,
		issues,
	};
}

function createWorkspaceStatusOutput(): WorkspaceStatusOutput {
	const projectRoot = resolveMustflowRoot();
	const config = getRepoMapConfig(projectRoot);
	const nestedRepositories = discoverNestedRepositories(
		projectRoot,
		{ ...config.map, includeNested: true },
		config.workspace,
	);
	const repositories = nestedRepositories.map((repository) => summarizeRepository(projectRoot, repository));
	const issues = config.workspace.enabled && config.workspace.roots.length > 0 && repositories.length === 0
		? ['No nested git repositories were discovered under configured workspace roots.']
		: [];

	return {
		schema_version: WORKSPACE_STATUS_SCHEMA_VERSION,
		command: 'workspace status',
		mustflow_root: projectRoot,
		workspace: {
			enabled: config.workspace.enabled,
			roots: config.workspace.roots,
			max_depth: config.workspace.maxDepth,
			max_repositories: config.workspace.maxRepositories,
			follow_symlinks: config.workspace.followSymlinks,
			stop_at_repository_root: config.workspace.stopAtRepositoryRoot,
		},
		policy: createWorkspaceStatusPolicy(),
		repository_count: repositories.length,
		repositories,
		issues,
	};
}

function readWorkspaceRepositories(projectRoot: string): {
	readonly config: ReturnType<typeof getRepoMapConfig>;
	readonly repositories: readonly NestedRepository[];
} {
	const config = getRepoMapConfig(projectRoot);
	return {
		config,
		repositories: discoverNestedRepositories(
			projectRoot,
			{ ...config.map, includeNested: true },
			config.workspace,
		),
	};
}

function workspaceConfigOutput(config: ReturnType<typeof getRepoMapConfig>): WorkspaceStatusConfig {
	return {
		enabled: config.workspace.enabled,
		roots: config.workspace.roots,
		max_depth: config.workspace.maxDepth,
		max_repositories: config.workspace.maxRepositories,
		follow_symlinks: config.workspace.followSymlinks,
		stop_at_repository_root: config.workspace.stopAtRepositoryRoot,
	};
}

function createWorkspaceIssues(
	config: ReturnType<typeof getRepoMapConfig>,
	repositoryCount: number,
): readonly string[] {
	return config.workspace.enabled && config.workspace.roots.length > 0 && repositoryCount === 0
		? ['No nested git repositories were discovered under configured workspace roots.']
		: [];
}

function readIntentStrings(rawIntent: unknown, key: string): readonly string[] {
	return readStringArray(intentTable(rawIntent), key) ?? [];
}

function readIntentBoolean(rawIntent: unknown, key: string): boolean | null {
	const value = intentTable(rawIntent)[key];
	return typeof value === 'boolean' ? value : null;
}

function intentTable(rawIntent: unknown): TomlTable {
	return rawIntent && typeof rawIntent === 'object' && !Array.isArray(rawIntent) ? rawIntent as TomlTable : {};
}

function readIntentString(rawIntent: unknown, key: string): string | null {
	return readString(intentTable(rawIntent), key) ?? null;
}

function safeRunCommand(intentName: string): string | null {
	return /^[A-Za-z0-9_-]+$/u.test(intentName) ? `mf run ${intentName}` : null;
}

function createCatalogIntent(repositoryRoot: string, repositoryPath: string, contract: CommandContract, intentName: string): WorkspaceCommandCatalogIntent {
	const rawIntent = contract.intents[intentName];

	try {
		const plan = createRunPlan(repositoryRoot, contract, intentName);
		return {
			name: intentName,
			description: readIntentString(rawIntent, 'description'),
			status: plan.intentStatus,
			lifecycle: plan.lifecycle,
			run_policy: plan.runPolicy,
			runnable: plan.ok,
			reason_code: plan.reasonCode,
			detail: plan.detail,
			run_command: plan.ok ? `mf run ${intentName}` : null,
			run_from_repository: repositoryPath,
			timeout_seconds: plan.timeoutSeconds,
			required_after: readIntentStrings(rawIntent, 'required_after'),
			writes: plan.writes ?? [],
			network: readIntentBoolean(rawIntent, 'network'),
			destructive: readIntentBoolean(rawIntent, 'destructive'),
		};
	} catch (error) {
		return {
			name: intentName,
			description: readIntentString(rawIntent, 'description'),
			status: readIntentString(rawIntent, 'status'),
			lifecycle: readIntentString(rawIntent, 'lifecycle'),
			run_policy: readIntentString(rawIntent, 'run_policy'),
			runnable: false,
			reason_code: 'plan_error',
			detail: error instanceof Error ? error.message : String(error),
			run_command: null,
			run_from_repository: repositoryPath,
			timeout_seconds: null,
			required_after: readIntentStrings(rawIntent, 'required_after'),
			writes: readIntentStrings(rawIntent, 'writes'),
			network: readIntentBoolean(rawIntent, 'network'),
			destructive: readIntentBoolean(rawIntent, 'destructive'),
		};
	}
}

function createCatalogRepository(projectRoot: string, repository: NestedRepository): WorkspaceCommandCatalogRepository {
	const repositoryRoot = path.resolve(projectRoot, repository.relativePath);
	const commandSurface = summarizeCommandSurface(repositoryRoot, repository);

	if (!repository.commandContract) {
		return {
			relative_path: repository.relativePath,
			status: 'contract_missing',
			command_contract: commandSurface,
			intent_count: 0,
			runnable_count: 0,
			blocked_count: 0,
			intents: [],
			issues: ['Command contract is missing.'],
		};
	}

	let contract: CommandContract;
	try {
		contract = readCommandContract(repositoryRoot);
	} catch (error) {
		const message = error instanceof Error ? error.message : String(error);
		return {
			relative_path: repository.relativePath,
			status: 'contract_invalid',
			command_contract: commandSurface,
			intent_count: 0,
			runnable_count: 0,
			blocked_count: 0,
			intents: [],
			issues: [message],
		};
	}

	const intents = getIntentNames(contract.intents).map((intentName) =>
		createCatalogIntent(repositoryRoot, repository.relativePath, contract, intentName),
	);
	const runnableCount = intents.filter((intent) => intent.runnable).length;

	return {
		relative_path: repository.relativePath,
		status: 'available',
		command_contract: commandSurface,
		intent_count: intents.length,
		runnable_count: runnableCount,
		blocked_count: Math.max(0, intents.length - runnableCount),
		intents,
		issues: [],
	};
}

function createWorkspaceCommandCatalogOutput(): WorkspaceCommandCatalogOutput {
	const projectRoot = resolveMustflowRoot();
	const { config, repositories: nestedRepositories } = readWorkspaceRepositories(projectRoot);
	const repositories = nestedRepositories.map((repository) => createCatalogRepository(projectRoot, repository));

	return {
		schema_version: WORKSPACE_COMMAND_CATALOG_SCHEMA_VERSION,
		command: 'workspace command-catalog',
		mustflow_root: projectRoot,
		workspace: workspaceConfigOutput(config),
		policy: createWorkspaceStatusPolicy(),
		repository_count: repositories.length,
		total_intent_count: repositories.reduce((total, repository) => total + repository.intent_count, 0),
		runnable_intent_count: repositories.reduce((total, repository) => total + repository.runnable_count, 0),
		repositories,
		issues: createWorkspaceIssues(config, repositories.length),
	};
}

function createUnavailableVerificationRepository(
	repository: NestedRepository,
	commandSurface: WorkspaceStatusCommandSurface,
	status: WorkspaceVerificationPlanRepository['status'],
	classification: ClassifyOutput | null,
	issue: string,
): WorkspaceVerificationPlanRepository {
	return {
		relative_path: repository.relativePath,
		status,
		command_contract: commandSurface,
		changed_file_count: classification ? classification.summary.fileCount : null,
		changed_files: classification ? classification.files : [],
		verification_plan_id: null,
		risk_assessment: null,
		requirement_count: 0,
		candidate_count: 0,
		selected_intent_count: 0,
		gap_count: 0,
		selected_intents: [],
		gaps: [],
		issues: [issue],
	};
}

function selectedIntentsForVerificationReport(
	repositoryPath: string,
	report: ChangeVerificationReport,
): readonly WorkspaceVerificationPlanSelectedIntent[] {
	return report.schedule.entries.map((entry) => ({
		intent: entry.intent,
		run_command: safeRunCommand(entry.intent),
		run_from_repository: repositoryPath,
		locks: entry.locks,
		conflict_count: entry.conflicts.length,
	}));
}

function createVerificationRepository(projectRoot: string, repository: NestedRepository): WorkspaceVerificationPlanRepository {
	const repositoryRoot = path.resolve(projectRoot, repository.relativePath);
	const commandSurface = summarizeCommandSurface(repositoryRoot, repository);
	let classification: ClassifyOutput | null = null;

	try {
		classification = createClassifyOutput(repositoryRoot, 'changed', []);
	} catch (error) {
		const message = error instanceof Error ? error.message : String(error);
		return createUnavailableVerificationRepository(repository, commandSurface, 'git_unavailable', null, message);
	}

	if (!repository.commandContract) {
		return createUnavailableVerificationRepository(
			repository,
			commandSurface,
			'contract_missing',
			classification,
			'Command contract is missing.',
		);
	}

	let contract: CommandContract;
	try {
		contract = readCommandContract(repositoryRoot);
	} catch (error) {
		const message = error instanceof Error ? error.message : String(error);
		return createUnavailableVerificationRepository(repository, commandSurface, 'contract_invalid', classification, message);
	}

	let report: ChangeVerificationReport;
	try {
		report = createChangeVerificationReport(classification, contract, repositoryRoot);
	} catch (error) {
		const message = error instanceof Error ? error.message : String(error);
		return createUnavailableVerificationRepository(repository, commandSurface, 'plan_unavailable', classification, message);
	}

	return {
		relative_path: repository.relativePath,
		status: 'available',
		command_contract: commandSurface,
		changed_file_count: classification.summary.fileCount,
		changed_files: classification.files,
		verification_plan_id: createVerificationPlanId(report, contract),
		risk_assessment: report.risk_assessment,
		requirement_count: report.requirements.length,
		candidate_count: report.candidates.length,
		selected_intent_count: report.schedule.entries.length,
		gap_count: report.gaps.length,
		selected_intents: selectedIntentsForVerificationReport(repository.relativePath, report),
		gaps: report.gaps.map((gap) => ({
			reason: gap.reason,
			files: gap.files,
			surfaces: gap.surfaces,
			detail: gap.detail,
		})),
		issues: [],
	};
}

function createWorkspaceVerificationPlanOutput(): WorkspaceVerificationPlanOutput {
	const projectRoot = resolveMustflowRoot();
	const { config, repositories: nestedRepositories } = readWorkspaceRepositories(projectRoot);
	const repositories = nestedRepositories.map((repository) => createVerificationRepository(projectRoot, repository));

	return {
		schema_version: WORKSPACE_VERIFICATION_PLAN_SCHEMA_VERSION,
		command: 'workspace verify',
		mustflow_root: projectRoot,
		workspace: workspaceConfigOutput(config),
		policy: createWorkspaceVerificationPlanPolicy(),
		repository_count: repositories.length,
		total_changed_file_count: repositories.reduce((total, repository) => total + (repository.changed_file_count ?? 0), 0),
		total_requirement_count: repositories.reduce((total, repository) => total + repository.requirement_count, 0),
		total_selected_intent_count: repositories.reduce((total, repository) => total + repository.selected_intent_count, 0),
		total_gap_count: repositories.reduce((total, repository) => total + repository.gap_count, 0),
		repositories,
		issues: createWorkspaceIssues(config, repositories.length),
	};
}

function renderWorkspaceStatus(output: WorkspaceStatusOutput): string {
	const lines = [
		'mustflow workspace status',
		`mustflow root: ${output.mustflow_root}`,
		`workspace enabled: ${output.workspace.enabled ? 'yes' : 'no'}`,
		`configured roots: ${output.workspace.roots.length > 0 ? output.workspace.roots.join(', ') : 'none'}`,
		`repositories: ${output.repository_count}`,
		'',
	];

	if (output.repositories.length === 0) {
		lines.push('No nested repositories discovered.');
		return lines.join('\n');
	}

	for (const repository of output.repositories) {
		lines.push(`- ${repository.relative_path} (${repository.status})`);
		lines.push(`  mustflow: ${repository.mustflow ? 'yes' : 'no'}`);
		lines.push(`  command contract: ${repository.command_contract.path ?? 'missing'}`);
		if (repository.command_contract.runnable_count !== null) {
			lines.push(`  runnable intents: ${repository.command_contract.runnable_count}`);
		}
		if (repository.issues.length > 0) {
			lines.push(`  issues: ${repository.issues.join('; ')}`);
		}
	}

	return lines.join('\n');
}

function renderWorkspaceCommandCatalog(output: WorkspaceCommandCatalogOutput): string {
	const lines = [
		'mustflow workspace command-catalog',
		`mustflow root: ${output.mustflow_root}`,
		`workspace enabled: ${output.workspace.enabled ? 'yes' : 'no'}`,
		`repositories: ${output.repository_count}`,
		`intents: ${output.total_intent_count}`,
		`runnable intents: ${output.runnable_intent_count}`,
		'',
	];

	if (output.repositories.length === 0) {
		lines.push('No nested repositories discovered.');
		return lines.join('\n');
	}

	for (const repository of output.repositories) {
		lines.push(`- ${repository.relative_path} (${repository.status})`);
		if (repository.intents.length === 0) {
			lines.push(`  intents: none`);
		}
		for (const intent of repository.intents) {
			lines.push(`  - ${intent.name}: ${intent.runnable ? 'runnable' : intent.reason_code ?? 'blocked'}`);
		}
		if (repository.issues.length > 0) {
			lines.push(`  issues: ${repository.issues.join('; ')}`);
		}
	}

	return lines.join('\n');
}

function renderWorkspaceVerificationPlan(output: WorkspaceVerificationPlanOutput): string {
	const lines = [
		'mustflow workspace verify',
		`mustflow root: ${output.mustflow_root}`,
		`workspace enabled: ${output.workspace.enabled ? 'yes' : 'no'}`,
		`repositories: ${output.repository_count}`,
		`changed files: ${output.total_changed_file_count}`,
		`requirements: ${output.total_requirement_count}`,
		`selected intents: ${output.total_selected_intent_count}`,
		`gaps: ${output.total_gap_count}`,
		'',
	];

	if (output.repositories.length === 0) {
		lines.push('No nested repositories discovered.');
		return lines.join('\n');
	}

	for (const repository of output.repositories) {
		lines.push(`- ${repository.relative_path} (${repository.status})`);
		lines.push(`  changed files: ${repository.changed_file_count ?? 'unknown'}`);
		lines.push(`  selected intents: ${repository.selected_intent_count}`);
		for (const selected of repository.selected_intents) {
			lines.push(`  - ${selected.intent}: ${selected.run_command ?? 'unavailable'}`);
		}
		if (repository.gaps.length > 0) {
			lines.push(`  gaps: ${repository.gaps.map((gap) => gap.reason).join(', ')}`);
		}
		if (repository.issues.length > 0) {
			lines.push(`  issues: ${repository.issues.join('; ')}`);
		}
	}

	return lines.join('\n');
}

function runWorkspaceStatus(args: readonly string[], reporter: Reporter, lang: CliLang): number {
	if (hasCliOptionToken(args, '--help', ['-h'])) {
		reporter.stdout(getWorkspaceHelp(lang));
		return 0;
	}

	const parsed = parseCliOptions(args, WORKSPACE_STATUS_OPTIONS);
	if (parsed.error) {
		printUsageError(reporter, formatCliOptionParseError(parsed.error, lang), 'mf workspace --help', getWorkspaceHelp(lang), lang);
		return 1;
	}

	const output = createWorkspaceStatusOutput();
	reporter.stdout(hasParsedCliOption(parsed, '--json') ? JSON.stringify(output, null, 2) : renderWorkspaceStatus(output));
	return 0;
}

function runWorkspaceCommandCatalog(args: readonly string[], reporter: Reporter, lang: CliLang): number {
	if (hasCliOptionToken(args, '--help', ['-h'])) {
		reporter.stdout(getWorkspaceHelp(lang));
		return 0;
	}

	const parsed = parseCliOptions(args, WORKSPACE_COMMAND_CATALOG_OPTIONS);
	if (parsed.error) {
		printUsageError(reporter, formatCliOptionParseError(parsed.error, lang), 'mf workspace --help', getWorkspaceHelp(lang), lang);
		return 1;
	}

	const output = createWorkspaceCommandCatalogOutput();
	reporter.stdout(hasParsedCliOption(parsed, '--json') ? JSON.stringify(output, null, 2) : renderWorkspaceCommandCatalog(output));
	return 0;
}

function runWorkspaceVerify(args: readonly string[], reporter: Reporter, lang: CliLang): number {
	if (hasCliOptionToken(args, '--help', ['-h'])) {
		reporter.stdout(getWorkspaceHelp(lang));
		return 0;
	}

	const parsed = parseCliOptions(args, WORKSPACE_VERIFY_OPTIONS);
	if (parsed.error) {
		printUsageError(reporter, formatCliOptionParseError(parsed.error, lang), 'mf workspace --help', getWorkspaceHelp(lang), lang);
		return 1;
	}

	if (!hasParsedCliOption(parsed, '--changed')) {
		printUsageError(reporter, t(lang, 'workspace.error.verifyRequiresChanged'), 'mf workspace --help', getWorkspaceHelp(lang), lang);
		return 1;
	}

	if (!hasParsedCliOption(parsed, '--plan-only')) {
		printUsageError(reporter, t(lang, 'workspace.error.verifyRequiresPlanOnly'), 'mf workspace --help', getWorkspaceHelp(lang), lang);
		return 1;
	}

	const output = createWorkspaceVerificationPlanOutput();
	reporter.stdout(hasParsedCliOption(parsed, '--json') ? JSON.stringify(output, null, 2) : renderWorkspaceVerificationPlan(output));
	return 0;
}

export function runWorkspace(args: string[], reporter: Reporter, lang: CliLang = 'en'): number {
	if (hasCliOptionToken(args, '--help', ['-h'])) {
		reporter.stdout(getWorkspaceHelp(lang));
		return 0;
	}

	const [action, ...rest] = args;

	if (!action) {
		printUsageError(reporter, t(lang, 'workspace.error.missingAction'), 'mf workspace --help', getWorkspaceHelp(lang), lang);
		return 1;
	}

	if (action.startsWith('-')) {
		printUsageError(reporter, t(lang, 'cli.error.unknownOption', { option: action }), 'mf workspace --help', getWorkspaceHelp(lang), lang);
		return 1;
	}

	if (action === 'status') {
		return runWorkspaceStatus(rest, reporter, lang);
	}

	if (action === 'command-catalog') {
		return runWorkspaceCommandCatalog(rest, reporter, lang);
	}

	if (action === 'verify') {
		return runWorkspaceVerify(rest, reporter, lang);
	}

	printUsageError(reporter, t(lang, 'workspace.error.unknownAction', { action }), 'mf workspace --help', getWorkspaceHelp(lang), lang);
	return 1;
}
