import { existsSync } from 'node:fs';
import path from 'node:path';

import { createClassifyOutput, type ClassifyOutput } from './classify.js';
import {
	createChangeVerificationReport,
	type ChangeVerificationReport,
} from '../../core/change-verification.js';
import type { ChangeClassificationReport } from '../../core/change-classification.js';
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
import { getRepoMapConfig, discoverNestedRepositories, type NestedRepository, type WorkspaceConfig } from '../lib/repo-map.js';
import { createRunPlan } from '../lib/run-plan.js';
import { assertScopedCommandIntentIsolation } from '../lib/run-context.js';
import type { Reporter } from '../lib/reporter.js';
import {
	readCommandContract,
	readScopedCommandContract,
	readString,
	readStringArray,
	type CommandContract,
} from '../../core/config-loading.js';
import type { WorkspaceCommandContractScope } from '../../core/workspace-command-authority.js';

const DEFAULT_WORKSPACE_SCAN_ROOT = 'projects';
const WORKSPACE_SCAN_SCHEMA_VERSION = '1';
const WORKSPACE_STATUS_SCHEMA_VERSION = '1';
const WORKSPACE_COMMAND_CATALOG_SCHEMA_VERSION = '1';
const WORKSPACE_COMMAND_FRAGMENTS_SCHEMA_VERSION = '1';
const WORKSPACE_VERIFICATION_PLAN_SCHEMA_VERSION = '1';
const WORKSPACE_SCAN_OPTIONS = [
	{ name: '--json', kind: 'boolean' },
	{ name: '--projects-dir', kind: 'string' },
] as const satisfies readonly CliOptionSpec[];
const WORKSPACE_STATUS_OPTIONS = [{ name: '--json', kind: 'boolean' }] as const satisfies readonly CliOptionSpec[];
const WORKSPACE_COMMAND_CATALOG_OPTIONS = [{ name: '--json', kind: 'boolean' }] as const satisfies readonly CliOptionSpec[];
const WORKSPACE_COMMAND_FRAGMENTS_OPTIONS = [
	{ name: '--json', kind: 'boolean' },
	{ name: '--projects-dir', kind: 'string' },
] as const satisfies readonly CliOptionSpec[];
const WORKSPACE_VERIFY_OPTIONS = [
	{ name: '--changed', kind: 'boolean' },
	{ name: '--plan-only', kind: 'boolean' },
	{ name: '--json', kind: 'boolean' },
] as const satisfies readonly CliOptionSpec[];
const COMMAND_FRAGMENT_DIRECTORY = '.mustflow/config/commands';
const COMMAND_FRAGMENT_INCLUDE_PREFIX = 'commands';

interface WorkspaceStatusConfig {
	readonly enabled: boolean;
	readonly roots: readonly string[];
	readonly authority_mode: WorkspaceConfig['authorityMode'];
	readonly delegated_contract_count: number;
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

interface WorkspaceCommandFragmentsPolicy extends WorkspaceStatusPolicy {
	readonly writes_files: false;
	readonly suggestions_are_review_only: true;
	readonly parent_fragments_grant_child_authority: false;
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

type WorkspaceStatusCommandAuthority = 'repository_local' | 'delegated_scoped' | null;

interface WorkspaceStatusCommandSelection {
	readonly authority: WorkspaceStatusCommandAuthority;
	readonly surface: WorkspaceStatusCommandSurface;
	readonly contract: CommandContract | null;
	readonly scope: WorkspaceCommandContractScope | null;
	readonly planningRoot: string;
}

interface WorkspaceStatusRepository {
	readonly relative_path: string;
	readonly status: 'mustflow_ready' | 'delegated_ready' | 'contract_missing' | 'contract_invalid';
	readonly git_repository: true;
	readonly mustflow: boolean;
	readonly command_authority: WorkspaceStatusCommandAuthority;
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

interface WorkspaceScanOutput {
	readonly schema_version: typeof WORKSPACE_SCAN_SCHEMA_VERSION;
	readonly command: 'workspace scan';
	readonly mustflow_root: string;
	readonly workspace: WorkspaceStatusConfig;
	readonly policy: WorkspaceStatusPolicy;
	readonly repository_count: number;
	readonly repositories: readonly WorkspaceStatusRepository[];
	readonly issues: readonly string[];
	readonly projects_dir: string;
	readonly next_actions: readonly string[];
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
	readonly command_authority: WorkspaceStatusCommandAuthority;
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

interface WorkspaceCommandFragmentSuggestion {
	readonly repository: string;
	readonly status: 'child_contract_ready' | 'contract_missing' | 'contract_invalid';
	readonly suggested_fragment_path: string;
	readonly include_entry: string;
	readonly source_command_contract: string | null;
	readonly intent_count: number | null;
	readonly runnable_intent_count: number | null;
	readonly guidance: readonly string[];
}

interface WorkspaceCommandFragmentsOutput {
	readonly schema_version: typeof WORKSPACE_COMMAND_FRAGMENTS_SCHEMA_VERSION;
	readonly command: 'workspace command-fragments';
	readonly mustflow_root: string;
	readonly workspace: WorkspaceStatusConfig;
	readonly policy: WorkspaceCommandFragmentsPolicy;
	readonly repository_count: number;
	readonly fragment_directory: typeof COMMAND_FRAGMENT_DIRECTORY;
	readonly root_command_contract: '.mustflow/config/commands.toml';
	readonly root_include_snippet: string;
	readonly suggestions: readonly WorkspaceCommandFragmentSuggestion[];
	readonly issues: readonly string[];
	readonly projects_dir: string | null;
	readonly next_actions: readonly string[];
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
	readonly command_authority: WorkspaceStatusCommandAuthority;
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
				{ label: 'scan', description: t(lang, 'workspace.help.action.scan') },
				{ label: 'status', description: t(lang, 'workspace.help.action.status') },
				{ label: 'command-catalog', description: t(lang, 'workspace.help.action.commandCatalog') },
				{ label: 'command-fragments', description: t(lang, 'workspace.help.action.commandFragments') },
				{ label: 'verify', description: t(lang, 'workspace.help.action.verify') },
			],
			options: [
				{ label: '--changed', description: t(lang, 'classify.help.option.changed') },
				{ label: '--plan-only', description: t(lang, 'verify.help.option.planOnly') },
				{ label: '--projects-dir <path>', description: t(lang, 'workspace.help.option.projectsDir') },
				{ label: '--json', description: t(lang, 'cli.option.json') },
				{ label: '-h, --help', description: t(lang, 'cli.option.help') },
			],
			examples: [
				'mf workspace scan --json',
				'mf workspace scan --projects-dir projects --json',
				'mf workspace status --json',
				'mf workspace command-catalog --json',
				'mf workspace command-fragments --json',
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

function createWorkspaceCommandFragmentsPolicy(): WorkspaceCommandFragmentsPolicy {
	return {
		...createWorkspaceStatusPolicy(),
		writes_files: false,
		suggestions_are_review_only: true,
		parent_fragments_grant_child_authority: false,
	};
}

function createAdHocWorkspaceConfig(base: WorkspaceConfig, projectsDir: string): WorkspaceConfig {
	return {
		...base,
		enabled: true,
		roots: [projectsDir],
		authorityMode: 'repository_local',
		delegatedContracts: [],
		delegatedContractCount: 0,
	};
}

function slugCommandFragmentSegment(segment: string): string {
	const slug = segment
		.trim()
		.toLowerCase()
		.replace(/[^a-z0-9._-]+/gu, '-')
		.replace(/^-+|-+$/gu, '')
		.replace(/\.toml$/u, '');

	return slug.length > 0 ? slug : 'repository';
}

function repositoryPathSegments(repositoryPath: string): readonly string[] {
	return repositoryPath.split('/').filter((segment) => segment.length > 0);
}

function createCommandFragmentPaths(repositories: readonly WorkspaceStatusRepository[]): ReadonlyMap<string, string> {
	const leafSlugCounts = new Map<string, number>();

	for (const repository of repositories) {
		const segments = repositoryPathSegments(repository.relative_path);
		const leafSlug = slugCommandFragmentSegment(segments.at(-1) ?? repository.relative_path);
		leafSlugCounts.set(leafSlug, (leafSlugCounts.get(leafSlug) ?? 0) + 1);
	}

	const usedSlugs = new Set<string>();
	const paths = new Map<string, string>();

	for (const repository of repositories) {
		const segments = repositoryPathSegments(repository.relative_path);
		const leafSlug = slugCommandFragmentSegment(segments.at(-1) ?? repository.relative_path);
		const baseSlug = (leafSlugCounts.get(leafSlug) ?? 0) > 1
			? segments.map((segment) => slugCommandFragmentSegment(segment)).join('--')
			: leafSlug;
		let candidateSlug = baseSlug;
		let suffix = 2;

		while (usedSlugs.has(candidateSlug)) {
			candidateSlug = `${baseSlug}-${suffix}`;
			suffix += 1;
		}

		usedSlugs.add(candidateSlug);
		paths.set(repository.relative_path, `${COMMAND_FRAGMENT_INCLUDE_PREFIX}/${candidateSlug}.toml`);
	}

	return paths;
}

function createCommandFragmentGuidance(repository: WorkspaceStatusRepository): readonly string[] {
	if (repository.status === 'mustflow_ready') {
		return [
			'Prefer the child repository command contract for commands owned by this repository.',
			'Use the parent command fragment only for intentionally parent-owned orchestration or cross-repository workflows.',
		];
	}

	if (repository.status === 'contract_invalid') {
		return [
			'Fix the child repository command contract before copying or mirroring any intent shape.',
			'Keep the parent command fragment empty or review-only until the child contract parses cleanly.',
		];
	}

	return [
		'Initialize or author this repository command contract before adding runnable parent-level orchestration.',
		'If the parent root still needs orchestration, keep that repository-specific intent group in the suggested fragment.',
	];
}

function createCommandFragmentSuggestion(
	repository: WorkspaceStatusRepository,
	includeEntry: string,
): WorkspaceCommandFragmentSuggestion {
	const commandSurface = repository.command_contract;

	return {
		repository: repository.relative_path,
		status: repository.status === 'mustflow_ready'
			? 'child_contract_ready'
			: repository.status === 'contract_invalid'
				? 'contract_invalid'
				: 'contract_missing',
		suggested_fragment_path: `.mustflow/config/${includeEntry}`,
		include_entry: includeEntry,
		source_command_contract: commandSurface.path,
		intent_count: commandSurface.total_intents,
		runnable_intent_count: commandSurface.runnable_count,
		guidance: createCommandFragmentGuidance(repository),
	};
}

function renderCommandFragmentIncludeSnippet(includeEntries: readonly string[]): string {
	if (includeEntries.length === 0) {
		return '[include]\nfiles = []';
	}

	return [
		'[include]',
		'files = [',
		...includeEntries.map((entry) => `  "${entry}",`),
		']',
	].join('\n');
}

function commandFragmentNextActions(repositoryCount: number): readonly string[] {
	if (repositoryCount === 0) {
		return ['Run mf workspace scan --projects-dir <dir> --json against the directory that contains cloned repositories.'];
	}

	return [
		'Review each suggested fragment before editing .mustflow/config/commands.toml.',
		'Prefer child repository command contracts for repository-owned commands.',
		'Use parent command fragments only for intentionally parent-owned orchestration or cross-repository workflows.',
		'After accepting fragments, run the configured mustflow check intent.',
	];
}

function getIntentNames(intents: TomlTable): readonly string[] {
	return Object.keys(intents).sort((left, right) => left.localeCompare(right));
}

interface WorkspaceCommandSummary {
	readonly surface: WorkspaceStatusCommandSurface;
	readonly contract: CommandContract | null;
}

function summarizeLocalCommand(repositoryRoot: string, repository: NestedRepository): WorkspaceCommandSummary {
	if (!repository.commandContract) {
	return {
			surface: {
				path: null,
				exists: false,
				parse_error: null,
				total_intents: null,
				runnable_count: null,
				runnable_intents: [],
				blocked_count: null,
			},
			contract: null,
		};
	}

	try {
		const contract = readCommandContract(repositoryRoot);
		const intentNames = getIntentNames(contract.intents);
		const runnableIntents = intentNames.filter((intentName) => createRunPlan(repositoryRoot, contract, intentName).ok);

		return {
			surface: {
				path: repository.commandContract,
				exists: true,
				parse_error: null,
				total_intents: intentNames.length,
				runnable_count: runnableIntents.length,
				runnable_intents: runnableIntents,
				blocked_count: Math.max(0, intentNames.length - runnableIntents.length),
			},
			contract,
		};
	} catch (error) {
		return {
			surface: {
				path: repository.commandContract,
				exists: true,
				parse_error: error instanceof Error ? error.message : String(error),
				total_intents: null,
				runnable_count: null,
				runnable_intents: [],
				blocked_count: null,
			},
			contract: null,
		};
	}
}

function normalizeRepositoryPath(value: string): string {
	return value.replace(/\\/gu, '/').replace(/\/+$/gu, '');
}

function findDelegatedContract(
	workspace: WorkspaceConfig,
	repository: NestedRepository,
): WorkspaceCommandContractScope | undefined {
	if (workspace.authorityMode !== 'delegated_scoped' || repository.commandContract) {
		return undefined;
	}

	const repositoryPath = normalizeRepositoryPath(repository.relativePath);
	return workspace.delegatedContracts.find((contract) => contract.repository === repositoryPath);
}

function delegatedIntentIsRunnable(
	projectRoot: string,
	contract: CommandContract,
	scope: WorkspaceCommandContractScope,
	intentName: string,
): boolean {
	try {
		assertScopedCommandIntentIsolation(projectRoot, scope, contract, intentName);
		return createRunPlan(projectRoot, contract, intentName).ok;
	} catch {
		return false;
	}
}

function summarizeDelegatedCommand(
	projectRoot: string,
	scope: WorkspaceCommandContractScope,
): WorkspaceCommandSummary {
	const contractPath = `.mustflow/config/${scope.file}`;
	const contractExists = existsSync(path.resolve(projectRoot, '.mustflow', 'config', ...scope.file.split('/')));

	try {
		const contract = readScopedCommandContract(projectRoot, scope.file, `workspace:${scope.repository}`, scope.repository);
		const intentNames = getIntentNames(contract.intents);
		const runnableIntents = intentNames.filter((intentName) =>
			delegatedIntentIsRunnable(projectRoot, contract, scope, intentName),
		);

		return {
			surface: {
				path: contractPath,
				exists: true,
				parse_error: null,
				total_intents: intentNames.length,
				runnable_count: runnableIntents.length,
				runnable_intents: runnableIntents,
				blocked_count: Math.max(0, intentNames.length - runnableIntents.length),
			},
			contract,
		};
	} catch (error) {
		return {
			surface: {
				path: contractPath,
				exists: contractExists,
				parse_error: error instanceof Error ? error.message : String(error),
				total_intents: null,
				runnable_count: null,
				runnable_intents: [],
				blocked_count: null,
			},
			contract: null,
		};
	}
}

function summarizeCommandSelection(
	projectRoot: string,
	repositoryRoot: string,
	repository: NestedRepository,
	workspace: WorkspaceConfig,
): WorkspaceStatusCommandSelection {
	const delegatedContract = findDelegatedContract(workspace, repository);
	if (delegatedContract) {
		const summary = summarizeDelegatedCommand(projectRoot, delegatedContract);
		return {
			authority: 'delegated_scoped',
			...summary,
			scope: delegatedContract,
			planningRoot: projectRoot,
		};
	}

	const summary = summarizeLocalCommand(repositoryRoot, repository);
	return {
		authority: repository.commandContract ? 'repository_local' : null,
		...summary,
		scope: null,
		planningRoot: repositoryRoot,
	};
}

function repositoryStatus(
	commandSurface: WorkspaceStatusCommandSurface,
	authority: WorkspaceStatusCommandAuthority,
): WorkspaceStatusRepository['status'] {
	if (commandSurface.parse_error) {
		return 'contract_invalid';
	}
	if (!commandSurface.exists) {
		return 'contract_missing';
	}
	if (authority === 'delegated_scoped') {
		return 'delegated_ready';
	}

	return 'mustflow_ready';
}

function summarizeRepository(
	projectRoot: string,
	repository: NestedRepository,
	workspace: WorkspaceConfig,
): WorkspaceStatusRepository {
	const repositoryRoot = path.resolve(projectRoot, repository.relativePath);
	const commandSelection = summarizeCommandSelection(projectRoot, repositoryRoot, repository, workspace);
	const commandSurface = commandSelection.surface;
	const issues = commandSurface.parse_error ? [commandSurface.parse_error] : [];

	return {
		relative_path: repository.relativePath,
		status: repositoryStatus(commandSurface, commandSelection.authority),
		git_repository: true,
		mustflow: repository.mustflow,
		command_authority: commandSelection.authority,
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

/**
 * mf:anchor cli.workspace.status-read-model
 * purpose: Summarize nested repositories and command contracts without granting parent-root command authority.
 * search: workspace status, nested repositories, command contract, read only, runnable intents
 * invariant: Workspace status reports observable repo facts and never executes or authorizes child-repository commands.
 * risk: config, state
 */
function createWorkspaceStatusOutput(): WorkspaceStatusOutput {
	const projectRoot = resolveMustflowRoot();
	const config = getRepoMapConfig(projectRoot);
	const nestedRepositories = discoverNestedRepositories(
		projectRoot,
		{ ...config.map, includeNested: true },
		config.workspace,
	);
	const repositories = nestedRepositories.map((repository) => summarizeRepository(projectRoot, repository, config.workspace));
	const issues = config.workspace.enabled && config.workspace.roots.length > 0 && repositories.length === 0
		? ['No nested git repositories were discovered under configured workspace roots.']
		: [];

	return {
		schema_version: WORKSPACE_STATUS_SCHEMA_VERSION,
		command: 'workspace status',
		mustflow_root: projectRoot,
		workspace: workspaceConfigOutput(config.workspace),
		policy: createWorkspaceStatusPolicy(),
		repository_count: repositories.length,
		repositories,
		issues,
	};
}

function createWorkspaceScanOutput(projectsDir: string): WorkspaceScanOutput {
	const projectRoot = resolveMustflowRoot();
	const config = getRepoMapConfig(projectRoot);
	const workspace = createAdHocWorkspaceConfig(config.workspace, projectsDir);
	const repositories = discoverNestedRepositories(
		projectRoot,
		{ ...config.map, includeNested: true },
		workspace,
	).map((repository) => summarizeRepository(projectRoot, repository, workspace));
	const issues = repositories.length === 0
		? [t('en', 'workspace.scan.issue.noneDiscovered', { projectsDir })]
		: [];

	return {
		schema_version: WORKSPACE_SCAN_SCHEMA_VERSION,
		command: 'workspace scan',
		mustflow_root: projectRoot,
		workspace: workspaceConfigOutput(workspace),
		policy: createWorkspaceStatusPolicy(),
		repository_count: repositories.length,
		repositories,
		issues,
		projects_dir: projectsDir,
		next_actions: [
			'mf init inside one target repository',
			'mf workspace status --json after configuring workspace roots',
		],
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

function workspaceConfigOutput(config: WorkspaceConfig): WorkspaceStatusConfig {
	return {
		enabled: config.enabled,
		roots: config.roots,
		authority_mode: config.authorityMode,
		delegated_contract_count: config.delegatedContractCount,
		max_depth: config.maxDepth,
		max_repositories: config.maxRepositories,
		follow_symlinks: config.followSymlinks,
		stop_at_repository_root: config.stopAtRepositoryRoot,
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

function createCatalogIntent(
	planningRoot: string,
	scope: WorkspaceCommandContractScope | null,
	repositoryPath: string,
	contract: CommandContract,
	intentName: string,
): WorkspaceCommandCatalogIntent {
	const rawIntent = contract.intents[intentName];

	try {
		if (scope) {
			assertScopedCommandIntentIsolation(planningRoot, scope, contract, intentName);
		}
		const plan = createRunPlan(planningRoot, contract, intentName);
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

function createCatalogRepository(
	projectRoot: string,
	repository: NestedRepository,
	workspace: WorkspaceConfig,
): WorkspaceCommandCatalogRepository {
	const repositoryRoot = path.resolve(projectRoot, repository.relativePath);
	const commandSelection = summarizeCommandSelection(projectRoot, repositoryRoot, repository, workspace);
	const commandSurface = commandSelection.surface;

	if (!commandSelection.contract) {
		const contractInvalid = commandSurface.parse_error !== null;
		return {
			relative_path: repository.relativePath,
			status: contractInvalid ? 'contract_invalid' : 'contract_missing',
			command_authority: commandSelection.authority,
			command_contract: commandSurface,
			intent_count: 0,
			runnable_count: 0,
			blocked_count: 0,
			intents: [],
			issues: [commandSurface.parse_error ?? 'Command contract is missing.'],
		};
	}

	const contract = commandSelection.contract;
	const intents = getIntentNames(contract.intents).map((intentName) =>
		createCatalogIntent(
			commandSelection.planningRoot,
			commandSelection.scope,
			repository.relativePath,
			contract,
			intentName,
		),
	);
	const runnableCount = intents.filter((intent) => intent.runnable).length;

	return {
		relative_path: repository.relativePath,
		status: 'available',
		command_authority: commandSelection.authority,
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
	const repositories = nestedRepositories.map((repository) =>
		createCatalogRepository(projectRoot, repository, config.workspace),
	);

	return {
		schema_version: WORKSPACE_COMMAND_CATALOG_SCHEMA_VERSION,
		command: 'workspace command-catalog',
		mustflow_root: projectRoot,
		workspace: workspaceConfigOutput(config.workspace),
		policy: createWorkspaceStatusPolicy(),
		repository_count: repositories.length,
		total_intent_count: repositories.reduce((total, repository) => total + repository.intent_count, 0),
		runnable_intent_count: repositories.reduce((total, repository) => total + repository.runnable_count, 0),
		repositories,
		issues: createWorkspaceIssues(config, repositories.length),
	};
}

function createWorkspaceCommandFragmentsOutput(projectsDir?: string): WorkspaceCommandFragmentsOutput {
	const projectRoot = resolveMustflowRoot();
	const config = getRepoMapConfig(projectRoot);
	const workspace = projectsDir ? createAdHocWorkspaceConfig(config.workspace, projectsDir) : config.workspace;
	const nestedRepositories = discoverNestedRepositories(
		projectRoot,
		{ ...config.map, includeNested: true },
		workspace,
	);
	const repositoryLocalWorkspace: WorkspaceConfig = {
		...workspace,
		authorityMode: 'repository_local',
		delegatedContracts: [],
		delegatedContractCount: 0,
	};
	const repositories = nestedRepositories.map((repository) =>
		summarizeRepository(projectRoot, repository, repositoryLocalWorkspace),
	);
	const includePaths = createCommandFragmentPaths(repositories);
	const suggestions = repositories.map((repository) =>
		createCommandFragmentSuggestion(repository, includePaths.get(repository.relative_path) ?? `${COMMAND_FRAGMENT_INCLUDE_PREFIX}/repository.toml`),
	);
	const includeEntries = suggestions.map((suggestion) => suggestion.include_entry);
	const issues = projectsDir
		? repositories.length === 0
			? [t('en', 'workspace.scan.issue.noneDiscovered', { projectsDir })]
			: []
		: createWorkspaceIssues(config, repositories.length);

	return {
		schema_version: WORKSPACE_COMMAND_FRAGMENTS_SCHEMA_VERSION,
		command: 'workspace command-fragments',
		mustflow_root: projectRoot,
		workspace: workspaceConfigOutput(workspace),
		policy: createWorkspaceCommandFragmentsPolicy(),
		repository_count: repositories.length,
		fragment_directory: COMMAND_FRAGMENT_DIRECTORY,
		root_command_contract: '.mustflow/config/commands.toml',
		root_include_snippet: renderCommandFragmentIncludeSnippet(includeEntries),
		suggestions,
		issues,
		projects_dir: projectsDir ?? null,
		next_actions: commandFragmentNextActions(repositories.length),
	};
}

function createUnavailableVerificationRepository(
	repository: NestedRepository,
	authority: WorkspaceStatusCommandAuthority,
	commandSurface: WorkspaceStatusCommandSurface,
	status: WorkspaceVerificationPlanRepository['status'],
	classification: ClassifyOutput | null,
	issue: string,
): WorkspaceVerificationPlanRepository {
	return {
		relative_path: repository.relativePath,
		status,
		command_authority: authority,
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

function workspaceRelativeChangePath(repositoryPath: string, filePath: string): string {
	const repository = normalizeRepositoryPath(repositoryPath);
	const file = filePath.replace(/\\/gu, '/').replace(/^\.\//u, '');
	return `${repository}/${file}`;
}

function repositoryRelativeChangePath(repositoryPath: string, filePath: string): string {
	const prefix = `${normalizeRepositoryPath(repositoryPath)}/`;
	return filePath.startsWith(prefix) ? filePath.slice(prefix.length) : filePath;
}

function rebaseClassificationForWorkspaceRoot(
	classification: ClassifyOutput,
	repositoryPath: string,
): ChangeClassificationReport {
	return {
		source: classification.source,
		files: classification.files.map((filePath) => workspaceRelativeChangePath(repositoryPath, filePath)),
		classifications: classification.classifications.map((entry) => ({
			...entry,
			path: workspaceRelativeChangePath(repositoryPath, entry.path),
		})),
		summary: classification.summary,
	};
}

function scopedPlanningContract(
	projectRoot: string,
	contract: CommandContract,
	scope: WorkspaceCommandContractScope,
): CommandContract {
	return {
		...contract,
		intents: Object.fromEntries(
			Object.entries(contract.intents).filter(([intentName]) => {
				try {
					assertScopedCommandIntentIsolation(projectRoot, scope, contract, intentName);
					return true;
				} catch {
					return false;
				}
			}),
		),
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

/**
 * mf:anchor cli.workspace.verify-plan
 * purpose: Build per-repository verification plans from each repository's effective local or delegated scoped command contract.
 * search: workspace verify, changed files, plan only, command contract, delegated repository
 * invariant: Workspace verification output selects only repository-scoped intents and never runs their raw commands.
 * risk: config, state
 */
function createVerificationRepository(
	projectRoot: string,
	repository: NestedRepository,
	workspace: WorkspaceConfig,
): WorkspaceVerificationPlanRepository {
	const repositoryRoot = path.resolve(projectRoot, repository.relativePath);
	const commandSelection = summarizeCommandSelection(projectRoot, repositoryRoot, repository, workspace);
	const commandSurface = commandSelection.surface;
	let classification: ClassifyOutput | null = null;

	try {
		classification = createClassifyOutput(repositoryRoot, 'changed', []);
	} catch (error) {
		const message = error instanceof Error ? error.message : String(error);
		return createUnavailableVerificationRepository(
			repository,
			commandSelection.authority,
			commandSurface,
			'git_unavailable',
			null,
			message,
		);
	}

	if (!commandSelection.contract) {
		const contractInvalid = commandSurface.parse_error !== null;
		return createUnavailableVerificationRepository(
			repository,
			commandSelection.authority,
			commandSurface,
			contractInvalid ? 'contract_invalid' : 'contract_missing',
			classification,
			commandSurface.parse_error ?? 'Command contract is missing.',
		);
	}

	const contract = commandSelection.scope
		? scopedPlanningContract(projectRoot, commandSelection.contract, commandSelection.scope)
		: commandSelection.contract;
	const planningClassification = commandSelection.scope
		? rebaseClassificationForWorkspaceRoot(classification, repository.relativePath)
		: classification;

	let report: ChangeVerificationReport;
	try {
		report = createChangeVerificationReport(planningClassification, contract, commandSelection.planningRoot);
	} catch (error) {
		const message = error instanceof Error ? error.message : String(error);
		return createUnavailableVerificationRepository(
			repository,
			commandSelection.authority,
			commandSurface,
			'plan_unavailable',
			classification,
			message,
		);
	}

		return {
		relative_path: repository.relativePath,
		status: 'available',
		command_authority: commandSelection.authority,
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
			files: commandSelection.scope
				? gap.files.map((filePath) => repositoryRelativeChangePath(repository.relativePath, filePath))
				: gap.files,
			surfaces: gap.surfaces,
			detail: gap.detail,
		})),
		issues: [],
	};
}

function createWorkspaceVerificationPlanOutput(): WorkspaceVerificationPlanOutput {
	const projectRoot = resolveMustflowRoot();
	const { config, repositories: nestedRepositories } = readWorkspaceRepositories(projectRoot);
	const repositories = nestedRepositories.map((repository) =>
		createVerificationRepository(projectRoot, repository, config.workspace),
	);

	return {
		schema_version: WORKSPACE_VERIFICATION_PLAN_SCHEMA_VERSION,
		command: 'workspace verify',
		mustflow_root: projectRoot,
		workspace: workspaceConfigOutput(config.workspace),
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

function renderWorkspaceScan(output: WorkspaceScanOutput): string {
	const lines = [
		'mustflow workspace scan',
		`mustflow root: ${output.mustflow_root}`,
		`projects dir: ${output.projects_dir}`,
		`repositories: ${output.repository_count}`,
		'',
	];

	if (output.repositories.length === 0) {
		lines.push(`No nested repositories discovered under ${output.projects_dir}.`);
		return lines.join('\n');
	}

	for (const repository of output.repositories) {
		lines.push(`- ${repository.relative_path} (${repository.status})`);
		lines.push(`  mustflow: ${repository.mustflow ? 'yes' : 'no'}`);
		lines.push(`  command authority: ${repository.command_authority ?? 'none'}`);
		lines.push(`  command contract: ${repository.command_contract.path ?? 'missing'}`);
	}

	lines.push('', 'Next actions:');
	for (const action of output.next_actions) {
		lines.push(`- ${action}`);
	}

	return lines.join('\n');
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
		lines.push(`  command authority: ${repository.command_authority ?? 'none'}`);
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
		lines.push(`  command authority: ${repository.command_authority ?? 'none'}`);
		lines.push(`  command contract: ${repository.command_contract.path ?? 'missing'}`);
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

function renderWorkspaceCommandFragments(output: WorkspaceCommandFragmentsOutput): string {
	const lines = [
		'mustflow workspace command-fragments',
		`mustflow root: ${output.mustflow_root}`,
		`workspace enabled: ${output.workspace.enabled ? 'yes' : 'no'}`,
		`repositories: ${output.repository_count}`,
		`fragment directory: ${output.fragment_directory}`,
		'',
	];

	if (output.suggestions.length === 0) {
		lines.push('No nested repositories discovered.');
		return lines.join('\n');
	}

	lines.push('Root include snippet:');
	lines.push(output.root_include_snippet);
	lines.push('', 'Suggested fragments:');

	for (const suggestion of output.suggestions) {
		lines.push(`- ${suggestion.repository} -> ${suggestion.suggested_fragment_path} (${suggestion.status})`);
		if (suggestion.source_command_contract) {
			lines.push(`  source command contract: ${suggestion.source_command_contract}`);
		}
		for (const guidance of suggestion.guidance) {
			lines.push(`  - ${guidance}`);
		}
	}

	lines.push('', 'Next actions:');
	for (const action of output.next_actions) {
		lines.push(`- ${action}`);
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
		lines.push(`  command authority: ${repository.command_authority ?? 'none'}`);
		lines.push(`  command contract: ${repository.command_contract.path ?? 'missing'}`);
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

function runWorkspaceScan(args: readonly string[], reporter: Reporter, lang: CliLang): number {
	if (hasCliOptionToken(args, '--help', ['-h'])) {
		reporter.stdout(getWorkspaceHelp(lang));
		return 0;
	}

	const parsed = parseCliOptions(args, WORKSPACE_SCAN_OPTIONS);
	if (parsed.error) {
		printUsageError(reporter, formatCliOptionParseError(parsed.error, lang), 'mf workspace --help', getWorkspaceHelp(lang), lang);
		return 1;
	}

	const projectsDirValue = parsed.values.get('--projects-dir');
	const projectsDir = typeof projectsDirValue === 'string' ? projectsDirValue : DEFAULT_WORKSPACE_SCAN_ROOT;
	const output = createWorkspaceScanOutput(projectsDir);
	reporter.stdout(hasParsedCliOption(parsed, '--json') ? JSON.stringify(output, null, 2) : renderWorkspaceScan(output));
	return 0;
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

function runWorkspaceCommandFragments(args: readonly string[], reporter: Reporter, lang: CliLang): number {
	if (hasCliOptionToken(args, '--help', ['-h'])) {
		reporter.stdout(getWorkspaceHelp(lang));
		return 0;
	}

	const parsed = parseCliOptions(args, WORKSPACE_COMMAND_FRAGMENTS_OPTIONS);
	if (parsed.error) {
		printUsageError(reporter, formatCliOptionParseError(parsed.error, lang), 'mf workspace --help', getWorkspaceHelp(lang), lang);
		return 1;
	}

	const projectsDirValue = parsed.values.get('--projects-dir');
	const projectsDir = typeof projectsDirValue === 'string' ? projectsDirValue : undefined;
	const output = createWorkspaceCommandFragmentsOutput(projectsDir);
	reporter.stdout(hasParsedCliOption(parsed, '--json') ? JSON.stringify(output, null, 2) : renderWorkspaceCommandFragments(output));
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

	if (action === 'scan') {
		return runWorkspaceScan(rest, reporter, lang);
	}

	if (action === 'status') {
		return runWorkspaceStatus(rest, reporter, lang);
	}

	if (action === 'command-catalog') {
		return runWorkspaceCommandCatalog(rest, reporter, lang);
	}

	if (action === 'command-fragments') {
		return runWorkspaceCommandFragments(rest, reporter, lang);
	}

	if (action === 'verify') {
		return runWorkspaceVerify(rest, reporter, lang);
	}

	printUsageError(reporter, t(lang, 'workspace.error.unknownAction', { action }), 'mf workspace --help', getWorkspaceHelp(lang), lang);
	return 1;
}
