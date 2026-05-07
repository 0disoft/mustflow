import { spawnSync } from 'node:child_process';
import { existsSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import path from 'node:path';

import { listFilesRecursive, toPosixPath } from './filesystem.js';
import { readTomlFile } from './toml.js';

const DEFAULT_DEPTH = 3;
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
const DEFAULT_NESTED_ANCHOR_FILES = [
	'AGENTS.md',
	'REPO_MAP.md',
	'.mustflow/config/mustflow.toml',
	'.mustflow/config/commands.toml',
	'.mustflow/config/preferences.toml',
	'.mustflow/context/INDEX.md',
	'.mustflow/context/PROJECT.md',
	'.mustflow/skills/INDEX.md',
	'README.md',
	'DESIGN.md',
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
const EXACT_ANCHOR_DESCRIPTIONS = new Map<string, string>([
	['AGENTS.md', 'Root agent operating rules. Read this before changing files.'],
	['README.md', 'Human-facing project overview. Use it as context, not as agent policy.'],
	['DESIGN.md', 'Optional visual identity and design-token reference for UI work.'],
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

interface NestedRepository {
	readonly relativePath: string;
	readonly mustflow: boolean;
	readonly agentRules?: string;
	readonly repoMap?: string;
	readonly mustflowConfig?: string;
	readonly commandContract?: string;
	readonly contextIndex?: string;
	readonly skillIndex?: string;
	readonly designReference?: string;
	readonly humanOverview?: string;
	readonly manifests: readonly string[];
	readonly commandAdapters: readonly string[];
}

interface RepoMapConfig {
	readonly priorityPaths: readonly string[];
	readonly map: MapConfig;
	readonly workspace: WorkspaceConfig;
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
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
		const parsed = readTomlFile(configPath);
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

function getGitFiles(projectRoot: string): string[] {
	const result = spawnSync('git', ['ls-files'], {
		cwd: projectRoot,
		encoding: 'utf8',
	});

	if (result.status !== 0 || result.error) {
		return [];
	}

	return result.stdout
		.split(/\r?\n/)
		.map((line) => line.trim())
		.filter(Boolean);
}

function getRepositoryFiles(projectRoot: string): string[] {
	const files = new Set<string>();

	for (const relativePath of getGitFiles(projectRoot)) {
		files.add(relativePath);
	}

	for (const relativePath of listFilesRecursive(projectRoot, { ignoredDirectoryNames: EXCLUDED_SEGMENTS })) {
		files.add(relativePath);
	}

	return Array.from(files);
}

function shouldIncludePath(relativePath: string): boolean {
	if (GENERATED_FILES.has(relativePath)) {
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
): AnchorFile[] {
	return getRepositoryFiles(projectRoot)
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

function isDirectory(directoryPath: string): boolean {
	try {
		return statSync(directoryPath).isDirectory();
	} catch {
		return false;
	}
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
		designReference: resolveAnchor('DESIGN.md'),
		humanOverview: resolveAnchor('README.md'),
		manifests,
		commandAdapters,
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

	function visit(directoryPath: string, depth: number): void {
		if (repositories.length >= workspaceConfig.maxRepositories || depth > workspaceConfig.maxDepth) {
			return;
		}

		if (hasGitMarker(directoryPath)) {
			const resolvedRepositoryPath = path.resolve(directoryPath);

			if (!seenRepositoryPaths.has(resolvedRepositoryPath)) {
				seenRepositoryPaths.add(resolvedRepositoryPath);
				repositories.push(collectNestedRepository(projectRoot, resolvedRepositoryPath, mapConfig.anchorFiles));
			}

			if (workspaceConfig.stopAtRepositoryRoot) {
				return;
			}
		}

		for (const entry of readdirSync(directoryPath, { withFileTypes: true })) {
			if (!entry.isDirectory()) {
				continue;
			}

			if (EXCLUDED_SEGMENTS.has(entry.name)) {
				continue;
			}

			if (entry.isSymbolicLink() && !workspaceConfig.followSymlinks) {
				continue;
			}

			visit(path.join(directoryPath, entry.name), depth + 1);
		}
	}

	for (const workspaceRoot of workspaceConfig.roots) {
		if (!isSafeWorkspaceRoot(projectRoot, workspaceRoot)) {
			continue;
		}

		const absoluteWorkspaceRoot = path.resolve(projectRoot, workspaceRoot);

		if (!isDirectory(absoluteWorkspaceRoot)) {
			continue;
		}

		visit(absoluteWorkspaceRoot, 0);
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

		if (repository.humanOverview) {
			lines.push(`- human overview: \`${repository.humanOverview}\``);
		}

		if (repository.designReference) {
			lines.push(`- visual design: \`${repository.designReference}\``);
		}

		lines.push('');
	}

	return lines;
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
	const anchors = discoverAnchors(projectRoot, depth, priorityPathSet, nestedRepositories, workspaceRootPrefixes);
	const priorityAnchors = configuredPriorityPaths
		.map((relativePath) => anchors.find((anchor) => anchor.relativePath === relativePath))
		.filter((anchor): anchor is AnchorFile => Boolean(anchor));
	const otherAnchors = anchors.filter((anchor) => !priorityPathSet.has(anchor.relativePath));

	return [
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
	writeFileSync(path.join(projectRoot, 'REPO_MAP.md'), content);
}
