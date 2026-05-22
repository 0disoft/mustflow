import { spawnSync } from 'node:child_process';
import { existsSync, lstatSync, readdirSync, realpathSync, statSync } from 'node:fs';
import path from 'node:path';

import { toPosixPath } from './filesystem.js';
import {
	getRepoMapSourceFingerprint,
	renderRepoMapFrontmatter,
	type RepoMapGitLsFilesStatus,
} from './repo-map-frontmatter.js';
import { writeUtf8FileInsideWithoutSymlinks } from '../../core/safe-filesystem.js';
import { isRecord } from './command-contract.js';
import { readMustflowTomlFile } from './toml.js';

const DEFAULT_DEPTH = 3;
const GIT_LS_FILES_TIMEOUT_MS = 5_000;
const GIT_LS_FILES_MAX_BUFFER_BYTES = 1_048_576;
const EXCLUDED_SEGMENTS = new Set([
	'.astro',
	'.cache',
	'.git',
	'build',
	'cache',
	'coverage',
	'dist',
	'node_modules',
]);
const EXCLUDED_PREFIXES = ['.mustflow/backups/'];
const GENERATED_FILES = new Set(['REPO_MAP.md']);
const DEFAULT_PRIORITY_PATHS = [
	'AGENTS.md',
	'.mustflow/docs/agent-workflow.md',
	'.mustflow/config/mustflow.toml',
	'.mustflow/config/commands.toml',
	'.mustflow/config/preferences.toml',
	'.mustflow/context/INDEX.md',
	'.mustflow/skills/INDEX.md',
];
const ROOT_OPTIONAL_MARKDOWN_ANCHOR_FILES = [
	'README.md',
	'PROJECT.md',
	'ROADMAP.md',
	'DESIGN.md',
	'CONTRIBUTING.md',
	'SECURITY.md',
	'CHANGELOG.md',
	'CODE_OF_CONDUCT.md',
	'SUPPORT.md',
	'GOVERNANCE.md',
	'MAINTAINERS.md',
	'RELEASING.md',
	'RELEASE.md',
	'TESTING.md',
	'DEPLOYMENT.md',
	'OPERATIONS.md',
	'RUNBOOK.md',
	'CONFIGURATION.md',
	'DATA_MODEL.md',
	'SCHEMA.md',
	'PRIVACY.md',
	'TROUBLESHOOTING.md',
	'ARCHITECTURE.md',
	'API.md',
];
const MACHINE_CONTRACT_ANCHOR_FILES = [
	'project.contract.json',
	'project.constants.json',
	'design-tokens.json',
	'openapi.json',
	'openapi.yaml',
	'openapi.yml',
	'asyncapi.json',
	'asyncapi.yaml',
	'asyncapi.yml',
	'schema.graphql',
	'schema.prisma',
];
const DEFAULT_NESTED_ANCHOR_FILES = [
	'AGENTS.md',
	'REPO_MAP.md',
	'.gitattributes',
	'.editorconfig',
	'.mustflow/config/mustflow.toml',
	'.mustflow/config/commands.toml',
	'.mustflow/config/preferences.toml',
	'.mustflow/context/INDEX.md',
	'.mustflow/context/PROJECT.md',
	'.mustflow/skills/INDEX.md',
	...ROOT_OPTIONAL_MARKDOWN_ANCHOR_FILES,
	...MACHINE_CONTRACT_ANCHOR_FILES,
	'package.json',
	'pyproject.toml',
	'go.mod',
	'Cargo.toml',
	'deno.json',
	'deno.jsonc',
	'justfile',
	'Justfile',
	'Makefile',
	'Taskfile.yml',
	'Taskfile.yaml',
];
const MANIFEST_ANCHORS = new Set(['package.json', 'pyproject.toml', 'go.mod', 'Cargo.toml', 'deno.json', 'deno.jsonc']);
const COMMAND_ADAPTER_ANCHORS = new Set(['justfile', 'Justfile', 'Makefile', 'Taskfile.yml', 'Taskfile.yaml']);
const EDITING_POLICY_ANCHORS = new Set(['.gitattributes', '.editorconfig']);
const NESTED_ROOT_DOC_LABELS = new Map<string, string>([
	['README.md', 'human overview'],
	['PROJECT.md', 'project brief'],
	['ROADMAP.md', 'planning context'],
	['DESIGN.md', 'visual design'],
	['CONTRIBUTING.md', 'contribution guide'],
	['SECURITY.md', 'security policy'],
	['CHANGELOG.md', 'changelog'],
	['CODE_OF_CONDUCT.md', 'code of conduct'],
	['SUPPORT.md', 'support guide'],
	['GOVERNANCE.md', 'governance'],
	['MAINTAINERS.md', 'maintainers'],
	['RELEASING.md', 'release guide'],
	['RELEASE.md', 'release guide'],
	['TESTING.md', 'testing guide'],
	['DEPLOYMENT.md', 'deployment guide'],
	['OPERATIONS.md', 'operations guide'],
	['RUNBOOK.md', 'runbook'],
	['CONFIGURATION.md', 'configuration guide'],
	['DATA_MODEL.md', 'data model'],
	['SCHEMA.md', 'schema reference'],
	['PRIVACY.md', 'privacy policy'],
	['TROUBLESHOOTING.md', 'troubleshooting guide'],
	['ARCHITECTURE.md', 'architecture reference'],
	['API.md', 'API reference'],
]);
const EXACT_ANCHOR_DESCRIPTIONS = new Map<string, string>([
	['AGENTS.md', 'Root agent operating rules. Read this before changing files.'],
	['.gitattributes', 'Git text, binary, and line-ending policy. Check before normalizing files.'],
	['.editorconfig', 'Editor formatting defaults such as indentation, charset, and final newline.'],
	['README.md', 'Human-facing project overview. Use it as context, not as agent policy.'],
	['PROJECT.md', 'Optional project-owned brief. Use below .mustflow/context/PROJECT.md when both exist.'],
	['ROADMAP.md', 'Optional project planning, priority, milestone, and non-goal context.'],
	['DESIGN.md', 'Optional visual identity and design-token reference for UI work.'],
	['CONTRIBUTING.md', 'Optional contribution workflow and pull request guidance.'],
	['SECURITY.md', 'Optional security policy, vulnerability reporting, and sensitive-change guidance.'],
	['CHANGELOG.md', 'Optional release history and user-visible change log.'],
	['CODE_OF_CONDUCT.md', 'Optional community participation and conduct expectations.'],
	['SUPPORT.md', 'Optional support channels and maintenance expectations.'],
	['GOVERNANCE.md', 'Optional governance, decision-making, and maintainer authority reference.'],
	['MAINTAINERS.md', 'Optional maintainer list, review ownership, and escalation reference.'],
	['RELEASING.md', 'Optional release procedure and publishing checklist.'],
	['RELEASE.md', 'Optional release procedure and publishing checklist.'],
	['TESTING.md', 'Optional testing strategy, required checks, and verification guidance.'],
	['DEPLOYMENT.md', 'Optional deployment environments, release targets, and rollout guidance.'],
	['OPERATIONS.md', 'Optional production operations and incident-response guidance.'],
	['RUNBOOK.md', 'Optional operational runbook for recurring procedures and incidents.'],
	['CONFIGURATION.md', 'Optional environment, feature flag, and runtime configuration guide.'],
	['DATA_MODEL.md', 'Optional domain data model and persistence contract reference.'],
	['SCHEMA.md', 'Optional schema reference for domain, data, or validation models.'],
	['PRIVACY.md', 'Optional privacy, data handling, and retention guidance.'],
	['TROUBLESHOOTING.md', 'Optional known-failure and recovery guide.'],
	['ARCHITECTURE.md', 'Optional system structure, module boundaries, and architectural decisions.'],
	['API.md', 'Optional API surface and integration contract reference.'],
	['project.contract.json', 'Machine-readable project contract. Prefer domain-specific names over catch-all files.'],
	['project.constants.json', 'Machine-readable project constants. Prefer domain-specific names over catch-all files.'],
	['design-tokens.json', 'Machine-readable design token contract.'],
	['openapi.json', 'Machine-readable OpenAPI contract.'],
	['openapi.yaml', 'Machine-readable OpenAPI contract.'],
	['openapi.yml', 'Machine-readable OpenAPI contract.'],
	['asyncapi.json', 'Machine-readable AsyncAPI contract.'],
	['asyncapi.yaml', 'Machine-readable AsyncAPI contract.'],
	['asyncapi.yml', 'Machine-readable AsyncAPI contract.'],
	['schema.graphql', 'Machine-readable GraphQL schema contract.'],
	['schema.prisma', 'Machine-readable Prisma data schema contract.'],
	['package.json', 'Node.js package manifest, binary entry points, and package scripts.'],
	['pyproject.toml', 'Python project metadata and tool configuration.'],
	['go.mod', 'Go module definition and dependency boundary.'],
	['Cargo.toml', 'Rust package manifest and workspace configuration.'],
	['deno.json', 'Deno configuration, tasks, and permissions.'],
	['deno.jsonc', 'Deno configuration, tasks, and permissions.'],
	['justfile', 'Local command recipes. Verify command intent before relying on a recipe.'],
	['Justfile', 'Local command recipes. Verify command intent before relying on a recipe.'],
	['Taskfile.yml', 'Task runner entry point for local automation.'],
	['Taskfile.yaml', 'Task runner entry point for local automation.'],
	['Makefile', 'Make-based command adapter for common local tasks.'],
	['Dockerfile', 'Container image build definition.'],
	['compose.yaml', 'Local service composition file.'],
	['compose.yml', 'Local service composition file.'],
	['docker-compose.yaml', 'Local service composition file.'],
	['docker-compose.yml', 'Local service composition file.'],
	['tsconfig.json', 'TypeScript compiler configuration.'],
	['ruff.toml', 'Python lint and formatting configuration.'],
	['.golangci.yml', 'Go lint configuration.'],
	['.golangci.yaml', 'Go lint configuration.'],
	['AGENT.md', 'Legacy or project-local agent note. Prefer AGENTS.md for mustflow workflows.'],
	['.mustflow/config/mustflow.toml', 'Mustflow read order, authority, document roots, and protected paths.'],
	['.mustflow/config/commands.toml', 'Command intent contract. Check this before running project commands.'],
	['.mustflow/config/preferences.toml', 'Repository-level agent preferences. Treat them as defaults below user instructions and local style.'],
	['.mustflow/context/INDEX.md', 'Task-specific project context router. Read only when context is needed.'],
	['.mustflow/context/PROJECT.md', 'Project goals, non-goals, terms, and repository-wide promises for agents.'],
	['.mustflow/docs/agent-workflow.md', 'Shared workflow policy for agent work.'],
	['.mustflow/skills/INDEX.md', 'Index of available procedural skills.'],
]);

export interface RepoMapOptions {
	readonly depth?: number;
	readonly includeNested?: boolean;
}

interface MustflowConfig {
	readonly read_order?: unknown;
	readonly optional_read_order?: unknown;
	readonly map?: unknown;
	readonly workspace?: unknown;
}

interface AnchorFile {
	readonly relativePath: string;
	readonly description: string;
}

interface MapConfig {
	readonly includeNested: boolean;
	readonly anchorFiles: readonly string[];
}

interface WorkspaceConfig {
	readonly enabled: boolean;
	readonly roots: readonly string[];
	readonly maxDepth: number;
	readonly maxRepositories: number;
	readonly followSymlinks: boolean;
	readonly stopAtRepositoryRoot: boolean;
}

interface NestedAnchor {
	readonly label: string;
	readonly relativePath: string;
}

interface NestedRepository {
	readonly relativePath: string;
	readonly mustflow: boolean;
	readonly agentRules?: string;
	readonly repoMap?: string;
	readonly mustflowConfig?: string;
	readonly commandContract?: string;
	readonly contextIndex?: string;
	readonly skillIndex?: string;
	readonly rootDocuments: readonly NestedAnchor[];
	readonly machineContracts: readonly string[];
	readonly manifests: readonly string[];
	readonly commandAdapters: readonly string[];
	readonly editingPolicies: readonly string[];
}

interface RepoMapConfig {
	readonly priorityPaths: readonly string[];
	readonly map: MapConfig;
	readonly workspace: WorkspaceConfig;
}

interface SafeDirectoryTarget {
	readonly logicalPath: string;
	readonly realPath: string;
}

interface GitLsFilesResult {
	readonly status: number | null;
	readonly error?: Error;
	readonly stdout: string;
}

type GitLsFilesStatus = RepoMapGitLsFilesStatus;

interface GitFileDiscovery {
	readonly files: readonly string[];
	readonly status: GitLsFilesStatus;
}

interface GitLsFilesOptions {
	readonly maxBuffer?: number;
	readonly timeout?: number;
	readonly spawnGit?: (
		command: string,
		args: readonly string[],
		options: {
			readonly cwd: string;
			readonly encoding: 'utf8';
			readonly maxBuffer: number;
			readonly timeout: number;
			readonly windowsHide: true;
		},
	) => GitLsFilesResult;
}

interface RepositoryFiles {
	readonly files: readonly string[];
	readonly gitLsFilesStatus: GitLsFilesStatus;
}

interface AnchorDiscovery {
	readonly anchors: readonly AnchorFile[];
	readonly gitLsFilesStatus: GitLsFilesStatus;
}

function getStringArray(value: unknown): string[] {
	return Array.isArray(value) ? value.filter((entry): entry is string => typeof entry === 'string') : [];
}

function getBoolean(value: unknown, fallback: boolean): boolean {
	return typeof value === 'boolean' ? value : fallback;
}

function getPositiveInteger(value: unknown, fallback: number): number {
	return Number.isInteger(value) && Number(value) > 0 ? Number(value) : fallback;
}

function readMustflowConfig(projectRoot: string): MustflowConfig {
	const configPath = path.join(projectRoot, '.mustflow', 'config', 'mustflow.toml');

	if (!existsSync(configPath)) {
		return {};
	}

	try {
		const parsed = readMustflowTomlFile(projectRoot, '.mustflow/config/mustflow.toml');
		return isRecord(parsed) ? (parsed as MustflowConfig) : {};
	} catch {
		return {};
	}
}

function getRepoMapConfig(projectRoot: string): RepoMapConfig {
	const parsed = readMustflowConfig(projectRoot);
	const configuredPriorityPaths = [...getStringArray(parsed.read_order), ...getStringArray(parsed.optional_read_order)];
	const map = isRecord(parsed.map) ? parsed.map : {};
	const workspace = isRecord(parsed.workspace) ? parsed.workspace : {};
	const anchorFiles = getStringArray(map.anchor_files);

	return {
		priorityPaths: configuredPriorityPaths.length > 0 ? configuredPriorityPaths : DEFAULT_PRIORITY_PATHS,
		map: {
			includeNested: getBoolean(map.include_nested, false),
			anchorFiles: anchorFiles.length > 0 ? anchorFiles : DEFAULT_NESTED_ANCHOR_FILES,
		},
		workspace: {
			enabled: getBoolean(workspace.enabled, false),
			roots: getStringArray(workspace.roots),
			maxDepth: getPositiveInteger(workspace.max_depth, 4),
			maxRepositories: getPositiveInteger(workspace.max_repositories, 50),
			followSymlinks: getBoolean(workspace.follow_symlinks, false),
			stopAtRepositoryRoot: getBoolean(workspace.stop_at_repository_root, true),
		},
	};
}

function classifyGitLsFilesFailure(result: GitLsFilesResult): GitLsFilesStatus {
	const errorRecord = result.error as unknown as { readonly code?: unknown } | undefined;
	const errorCode = typeof errorRecord?.code === 'string' ? errorRecord.code : undefined;
	const errorMessage = result.error?.message ?? '';

	if (errorCode === 'ETIMEDOUT' || /timed?\s*out|ETIMEDOUT/iu.test(errorMessage)) {
		return 'timeout';
	}

	if (errorCode === 'ENOBUFS' || /maxBuffer|ENOBUFS|buffer/iu.test(errorMessage)) {
		return 'max_buffer';
	}

	return 'error';
}

export function discoverGitFilesForRepoMap(projectRoot: string, options: GitLsFilesOptions = {}): GitFileDiscovery {
	const spawnGit =
		options.spawnGit ??
		((command, args, spawnOptions) =>
			spawnSync(command, [...args], spawnOptions) as GitLsFilesResult);
	const result = spawnGit('git', ['ls-files', '-z'], {
		cwd: projectRoot,
		encoding: 'utf8',
		maxBuffer: options.maxBuffer ?? GIT_LS_FILES_MAX_BUFFER_BYTES,
		timeout: options.timeout ?? GIT_LS_FILES_TIMEOUT_MS,
		windowsHide: true,
	});

	if (result.status !== 0 || result.error) {
		return {
			files: [],
			status: classifyGitLsFilesFailure(result),
		};
	}

	return {
		files: result.stdout
			.split('\0')
			.map((line) => toPosixPath(line))
			.filter(Boolean),
		status: 'ok',
	};
}

export function listGitFilesForRepoMap(projectRoot: string, options: GitLsFilesOptions = {}): readonly string[] {
	return discoverGitFilesForRepoMap(projectRoot, options).files;
}

function isAnchorCandidatePath(relativePath: string, priorityPaths: ReadonlySet<string>): boolean {
	return priorityPaths.has(relativePath) || Boolean(getAnchorDescription(relativePath));
}

function listAnchorCandidateFilesRecursive(
	rootPath: string,
	depth: number,
	priorityPaths: ReadonlySet<string>,
): string[] {
	const results: string[] = [];

	function visit(currentPath: string, directoryDepth: number): void {
		for (const entry of readdirSync(currentPath, { withFileTypes: true })) {
			const entryPath = path.join(currentPath, entry.name);
			const relativePath = toPosixPath(path.relative(rootPath, entryPath));

			if (entry.isDirectory()) {
				if (EXCLUDED_SEGMENTS.has(entry.name) || directoryDepth >= depth) {
					continue;
				}

				visit(entryPath, directoryDepth + 1);
				continue;
			}

			if (entry.isFile() && isAnchorCandidatePath(relativePath, priorityPaths)) {
				results.push(relativePath);
			}
		}
	}

	if (!existsSync(rootPath) || !statSync(rootPath).isDirectory()) {
		return [];
	}

	visit(rootPath, 0);
	return results.sort();
}

function getRepositoryFiles(projectRoot: string, depth: number, priorityPaths: ReadonlySet<string>): RepositoryFiles {
	const files = new Set<string>();
	const gitFiles = discoverGitFilesForRepoMap(projectRoot);

	for (const relativePath of gitFiles.files) {
		files.add(relativePath);
	}

	for (const relativePath of listAnchorCandidateFilesRecursive(projectRoot, depth, priorityPaths)) {
		files.add(relativePath);
	}

	return {
		files: Array.from(files),
		gitLsFilesStatus: gitFiles.status,
	};
}

function shouldIncludePath(relativePath: string): boolean {
	if (GENERATED_FILES.has(relativePath)) {
		return false;
	}

	if (EXCLUDED_PREFIXES.some((prefix) => relativePath.startsWith(prefix))) {
		return false;
	}

	const segments = relativePath.split('/');
	return segments.every((segment) => !EXCLUDED_SEGMENTS.has(segment));
}

function getDirectoryDepth(relativePath: string): number {
	return Math.max(relativePath.split('/').length - 1, 0);
}

function getDirectoryName(relativePath: string): string {
	const directory = path.posix.dirname(relativePath);
	return directory === '.' ? '/' : `${directory}/`;
}

function getAnchorDescription(relativePath: string): string | undefined {
	if (EXACT_ANCHOR_DESCRIPTIONS.has(relativePath)) {
		return EXACT_ANCHOR_DESCRIPTIONS.get(relativePath);
	}

	const fileName = path.posix.basename(relativePath);

	if (fileName === 'AGENTS.md') {
		return 'Scoped agent operating rules for this directory.';
	}

	if (fileName === 'README.md') {
		return 'Directory guide for this area.';
	}

	if (fileName === 'package.json') {
		return 'Node.js package manifest for this directory.';
	}

	if (fileName === 'SKILL.md') {
		return 'Procedural skill document for a repeatable agent task.';
	}

	return EXACT_ANCHOR_DESCRIPTIONS.get(fileName);
}

function isUnderNestedRepository(relativePath: string, nestedRepositories: readonly NestedRepository[]): boolean {
	return nestedRepositories.some((repository) => relativePath.startsWith(repository.relativePath));
}

function isUnderExcludedPrefix(relativePath: string, excludedPrefixes: readonly string[]): boolean {
	return excludedPrefixes.some((prefix) => relativePath === prefix.slice(0, -1) || relativePath.startsWith(prefix));
}

function discoverAnchors(
	projectRoot: string,
	depth: number,
	priorityPaths: ReadonlySet<string>,
	nestedRepositories: readonly NestedRepository[],
	excludedPrefixes: readonly string[],
): AnchorDiscovery {
	const repositoryFiles = getRepositoryFiles(projectRoot, depth, priorityPaths);
	const anchors = repositoryFiles.files
		.filter(shouldIncludePath)
		.filter((relativePath) => !isUnderNestedRepository(relativePath, nestedRepositories))
		.filter((relativePath) => !isUnderExcludedPrefix(relativePath, excludedPrefixes))
		.map((relativePath) => {
			const description = getAnchorDescription(relativePath);
			return description ? { relativePath, description } : undefined;
		})
		.filter((anchor): anchor is AnchorFile => Boolean(anchor))
		.filter((anchor) => priorityPaths.has(anchor.relativePath) || getDirectoryDepth(anchor.relativePath) <= depth)
		.sort((left, right) => left.relativePath.localeCompare(right.relativePath));

	return {
		anchors,
		gitLsFilesStatus: repositoryFiles.gitLsFilesStatus,
	};
}

function renderAnchorList(anchors: readonly AnchorFile[]): string[] {
	return anchors.map((anchor) => `- \`${anchor.relativePath}\`: ${anchor.description}`);
}

function renderDirectoryAnchors(anchors: readonly AnchorFile[]): string[] {
	if (anchors.length === 0) {
		return ['No additional anchor files were found.'];
	}

	const lines: string[] = [];
	const grouped = new Map<string, AnchorFile[]>();

	for (const anchor of anchors) {
		const directory = getDirectoryName(anchor.relativePath);
		grouped.set(directory, [...(grouped.get(directory) ?? []), anchor]);
	}

	for (const directory of Array.from(grouped.keys()).sort((left, right) => {
		if (left === '/') {
			return -1;
		}

		if (right === '/') {
			return 1;
		}

		return left.localeCompare(right);
	})) {
		lines.push(`### ${directory}`);
		lines.push('');
		lines.push(...renderAnchorList(grouped.get(directory) ?? []));
		lines.push('');
	}

	return lines;
}

function hasGitMarker(directoryPath: string): boolean {
	return existsSync(path.join(directoryPath, '.git'));
}

function isRealPathInside(parentRealPath: string, childRealPath: string): boolean {
	const relative = path.relative(parentRealPath, childRealPath);
	return relative === '' || (!relative.startsWith('..') && !path.isAbsolute(relative));
}

function isSafeWorkspaceRoot(projectRoot: string, workspaceRoot: string): boolean {
	const absoluteRoot = path.resolve(projectRoot, workspaceRoot);
	const relative = path.relative(projectRoot, absoluteRoot);
	return relative !== '' && !relative.startsWith('..') && !path.isAbsolute(relative);
}

function getWorkspaceRootPrefixes(projectRoot: string, workspaceConfig: WorkspaceConfig): string[] {
	if (!workspaceConfig.enabled) {
		return [];
	}

	return workspaceConfig.roots
		.filter((workspaceRoot) => isSafeWorkspaceRoot(projectRoot, workspaceRoot))
		.map((workspaceRoot) => `${toPosixPath(workspaceRoot).replace(/\/+$/, '')}/`);
}

function resolveSafeDirectoryTarget(
	projectRootRealPath: string,
	logicalPath: string,
	followSymlinks: boolean,
): SafeDirectoryTarget | undefined {
	try {
		const stats = lstatSync(logicalPath);

		if (stats.isSymbolicLink()) {
			if (!followSymlinks) {
				return undefined;
			}

			const realPath = realpathSync(logicalPath);

			if (!isRealPathInside(projectRootRealPath, realPath) || !statSync(realPath).isDirectory()) {
				return undefined;
			}

			return { logicalPath, realPath };
		}

		if (!stats.isDirectory()) {
			return undefined;
		}

		const realPath = realpathSync(logicalPath);

		if (!isRealPathInside(projectRootRealPath, realPath)) {
			return undefined;
		}

		return { logicalPath, realPath };
	} catch {
		return undefined;
	}
}

function collectNestedRepository(
	projectRoot: string,
	repositoryPath: string,
	anchorFiles: readonly string[],
): NestedRepository {
	const relativeRoot = `${toPosixPath(path.relative(projectRoot, repositoryPath))}/`;
	const existingAnchors = new Set<string>();

	for (const anchorFile of anchorFiles) {
		if (existsSync(path.join(repositoryPath, ...anchorFile.split('/')))) {
			existingAnchors.add(anchorFile);
		}
	}

	const resolveAnchor = (anchorFile: string): string | undefined =>
		existingAnchors.has(anchorFile) ? `${relativeRoot}${anchorFile}` : undefined;
	const manifests = anchorFiles
		.filter((anchorFile) => MANIFEST_ANCHORS.has(anchorFile) && existingAnchors.has(anchorFile))
		.map((anchorFile) => `${relativeRoot}${anchorFile}`);
	const commandAdapters = anchorFiles
		.filter((anchorFile) => COMMAND_ADAPTER_ANCHORS.has(anchorFile) && existingAnchors.has(anchorFile))
		.map((anchorFile) => `${relativeRoot}${anchorFile}`);
	const editingPolicies = anchorFiles
		.filter((anchorFile) => EDITING_POLICY_ANCHORS.has(anchorFile) && existingAnchors.has(anchorFile))
		.map((anchorFile) => `${relativeRoot}${anchorFile}`);
	const rootDocuments = anchorFiles
		.filter((anchorFile) => ROOT_OPTIONAL_MARKDOWN_ANCHOR_FILES.includes(anchorFile) && existingAnchors.has(anchorFile))
		.map((anchorFile) => ({
			label: NESTED_ROOT_DOC_LABELS.get(anchorFile) ?? 'root document',
			relativePath: `${relativeRoot}${anchorFile}`,
		}));
	const machineContracts = anchorFiles
		.filter((anchorFile) => MACHINE_CONTRACT_ANCHOR_FILES.includes(anchorFile) && existingAnchors.has(anchorFile))
		.map((anchorFile) => `${relativeRoot}${anchorFile}`);
	const mustflowConfig = resolveAnchor('.mustflow/config/mustflow.toml');
	const commandContract = resolveAnchor('.mustflow/config/commands.toml');

	return {
		relativePath: relativeRoot,
		mustflow: Boolean(mustflowConfig || commandContract),
		agentRules: resolveAnchor('AGENTS.md'),
		repoMap: resolveAnchor('REPO_MAP.md'),
		mustflowConfig,
		commandContract,
		contextIndex: resolveAnchor('.mustflow/context/INDEX.md'),
		skillIndex: resolveAnchor('.mustflow/skills/INDEX.md'),
		rootDocuments,
		machineContracts,
		manifests,
		commandAdapters,
		editingPolicies,
	};
}

function discoverNestedRepositories(
	projectRoot: string,
	mapConfig: MapConfig,
	workspaceConfig: WorkspaceConfig,
): NestedRepository[] {
	if (!mapConfig.includeNested || !workspaceConfig.enabled || workspaceConfig.roots.length === 0) {
		return [];
	}

	const repositories: NestedRepository[] = [];
	const seenRepositoryPaths = new Set<string>();
	const seenDirectoryPaths = new Set<string>();
	const projectRootRealPath = realpathSync(projectRoot);

	function visit(directoryTarget: SafeDirectoryTarget, depth: number): void {
		if (repositories.length >= workspaceConfig.maxRepositories || depth > workspaceConfig.maxDepth) {
			return;
		}

		if (seenDirectoryPaths.has(directoryTarget.realPath)) {
			return;
		}

		seenDirectoryPaths.add(directoryTarget.realPath);

		if (hasGitMarker(directoryTarget.logicalPath)) {
			const resolvedRepositoryPath = directoryTarget.realPath;

			if (!seenRepositoryPaths.has(resolvedRepositoryPath)) {
				seenRepositoryPaths.add(resolvedRepositoryPath);
				repositories.push(collectNestedRepository(projectRoot, directoryTarget.logicalPath, mapConfig.anchorFiles));
			}

			if (workspaceConfig.stopAtRepositoryRoot) {
				return;
			}
		}

		for (const entry of readdirSync(directoryTarget.logicalPath, { withFileTypes: true })) {
			if (EXCLUDED_SEGMENTS.has(entry.name)) {
				continue;
			}

			const childDirectoryTarget = resolveSafeDirectoryTarget(
				projectRootRealPath,
				path.join(directoryTarget.logicalPath, entry.name),
				workspaceConfig.followSymlinks,
			);

			if (childDirectoryTarget) {
				visit(childDirectoryTarget, depth + 1);
			}
		}
	}

	for (const workspaceRoot of workspaceConfig.roots) {
		if (!isSafeWorkspaceRoot(projectRoot, workspaceRoot)) {
			continue;
		}

		const absoluteWorkspaceRoot = path.resolve(projectRoot, workspaceRoot);
		const workspaceTarget = resolveSafeDirectoryTarget(
			projectRootRealPath,
			absoluteWorkspaceRoot,
			workspaceConfig.followSymlinks,
		);

		if (!workspaceTarget) {
			continue;
		}

		visit(workspaceTarget, 0);
	}

	return repositories.sort((left, right) => left.relativePath.localeCompare(right.relativePath));
}

function renderNestedRepositories(nestedRepositories: readonly NestedRepository[]): string[] {
	if (nestedRepositories.length === 0) {
		return [];
	}

	const lines = [
		'## Nested Repositories',
		'',
		'These are independent repository roots discovered under configured workspace roots.',
		'Only entrypoints are listed. Open the nested repository before working inside it.',
		'',
	];

	for (const repository of nestedRepositories) {
		lines.push(`### \`${repository.relativePath}\``);
		lines.push('');
		lines.push('- git repository: yes');
		lines.push(`- mustflow: ${repository.mustflow ? 'yes' : 'no'}`);

		if (repository.agentRules) {
			lines.push(`- agent rules: \`${repository.agentRules}\``);
		}

		if (repository.repoMap) {
			lines.push(`- repo map: \`${repository.repoMap}\``);
		}

		if (repository.mustflowConfig) {
			lines.push(`- mustflow config: \`${repository.mustflowConfig}\``);
		}

		if (repository.commandContract) {
			lines.push(`- command contract: \`${repository.commandContract}\``);
		}

		if (repository.contextIndex) {
			lines.push(`- context index: \`${repository.contextIndex}\``);
		}

		if (repository.skillIndex) {
			lines.push(`- skill index: \`${repository.skillIndex}\``);
		}

		if (repository.manifests.length > 0) {
			lines.push('- manifests:');
			lines.push(...repository.manifests.map((manifest) => `  - \`${manifest}\``));
		}

		if (repository.commandAdapters.length > 0) {
			lines.push('- command adapters:');
			lines.push(...repository.commandAdapters.map((adapter) => `  - \`${adapter}\``));
		}

		if (repository.editingPolicies.length > 0) {
			lines.push('- editing policies:');
			lines.push(...repository.editingPolicies.map((policy) => `  - \`${policy}\``));
		}

		for (const document of repository.rootDocuments) {
			lines.push(`- ${document.label}: \`${document.relativePath}\``);
		}

		if (repository.machineContracts.length > 0) {
			lines.push('- machine-readable contracts:');
			lines.push(...repository.machineContracts.map((contract) => `  - \`${contract}\``));
		}

		lines.push('');
	}

	return lines;
}

function countNestedEntrypoints(repository: NestedRepository): number {
	return [
		repository.agentRules,
		repository.repoMap,
		repository.mustflowConfig,
		repository.commandContract,
		repository.contextIndex,
		repository.skillIndex,
		...repository.rootDocuments.map((document) => document.relativePath),
		...repository.machineContracts,
		...repository.manifests,
		...repository.commandAdapters,
		...repository.editingPolicies,
	].filter(Boolean).length;
}

function renderSourceQuality(gitLsFilesStatus: GitLsFilesStatus): string[] {
	if (gitLsFilesStatus === 'ok') {
		return [];
	}

	return [
		'## Source Quality',
		'',
		`- \`git ls-files\` status: \`${gitLsFilesStatus}\``,
		'- Anchor discovery used the bounded recursive fallback. Treat this map as incomplete until regenerated after Git file discovery succeeds.',
		'',
	];
}

export function generateRepoMap(projectRoot: string, options: RepoMapOptions = {}): string {
	const depth = options.depth ?? DEFAULT_DEPTH;
	const config = getRepoMapConfig(projectRoot);
	const configuredPriorityPaths = config.priorityPaths;
	const priorityPathSet = new Set(configuredPriorityPaths);
	const mapConfig = {
		...config.map,
		includeNested: options.includeNested ?? config.map.includeNested,
	};
	const nestedRepositories = discoverNestedRepositories(projectRoot, mapConfig, config.workspace);
	const workspaceRootPrefixes = getWorkspaceRootPrefixes(projectRoot, config.workspace);
	const anchorDiscovery = discoverAnchors(projectRoot, depth, priorityPathSet, nestedRepositories, workspaceRootPrefixes);
	const anchors = anchorDiscovery.anchors;
	const gitLsFilesStatus = anchorDiscovery.gitLsFilesStatus;
	const priorityAnchors = configuredPriorityPaths
		.map((relativePath) => anchors.find((anchor) => anchor.relativePath === relativePath))
		.filter((anchor): anchor is AnchorFile => Boolean(anchor));
	const otherAnchors = anchors.filter((anchor) => !priorityPathSet.has(anchor.relativePath));
	const anchorCount =
		anchors.length + nestedRepositories.reduce((total, repository) => total + countNestedEntrypoints(repository), 0);
	const sourceFingerprint = getRepoMapSourceFingerprint({
		depth,
		includeNested: mapConfig.includeNested,
		configuredPriorityPaths,
		gitLsFilesStatus,
		anchors,
		nestedRepositories,
	});

	return [
		...renderRepoMapFrontmatter(anchorCount, sourceFingerprint, gitLsFilesStatus),
		'# REPO_MAP.md',
		'',
		'This file is an agent navigation map for the current mustflow root. It is not a full file listing.',
		'Regenerate it with `mf map --write` instead of editing it by hand.',
		'',
		'## How To Use',
		'',
		'- Start with `AGENTS.md` and the mustflow files listed in Priority Anchors.',
		'- Use Directory Anchors to find local rules, guides, package manifests, and command adapters.',
		...(nestedRepositories.length > 0
			? ['- Use Nested Repositories only as entrypoints into independent repositories.']
			: []),
		'- Use `git ls-files` or your editor when you need the complete file list.',
		'',
		...renderSourceQuality(gitLsFilesStatus),
		'## Priority Anchors',
		'',
		...(priorityAnchors.length > 0 ? renderAnchorList(priorityAnchors) : ['No mustflow priority anchors were found.']),
		'',
		'## Directory Anchors',
		'',
		...renderDirectoryAnchors(otherAnchors),
		...renderNestedRepositories(nestedRepositories),
		'## Generated Files',
		'',
		'- `REPO_MAP.md`: This generated navigation map. Do not treat it as a complete repository tree.',
		'',
		'## Excluded Areas',
		'',
		'- `.git/`',
		'- `node_modules/`',
		'- `dist/`, `build/`, and `coverage/`',
		'- cache directories such as `.cache/`, `cache/`, and `.astro/`',
		'',
	].join('\n');
}

export function writeRepoMap(projectRoot: string, content: string): void {
	writeUtf8FileInsideWithoutSymlinks(projectRoot, path.join(projectRoot, 'REPO_MAP.md'), content);
}
