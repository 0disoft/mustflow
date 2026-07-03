import { createHash } from 'node:crypto';
import { existsSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';

import { isRecord, readMustflowOwnedTomlFile } from './config-loading.js';
import type { ScriptCheckFinding, ScriptCheckStatus } from './script-check-result.js';

export const REPO_TOOLCHAIN_PROVENANCE_PACK_ID = 'repo';
export const REPO_TOOLCHAIN_PROVENANCE_SCRIPT_ID = 'toolchain-provenance';
export const REPO_TOOLCHAIN_PROVENANCE_SCRIPT_REF =
	`${REPO_TOOLCHAIN_PROVENANCE_PACK_ID}/${REPO_TOOLCHAIN_PROVENANCE_SCRIPT_ID}`;

export type RepoToolchainKind = 'bun' | 'docker' | 'go' | 'node' | 'package_manager' | 'python' | 'rust';

export type RepoToolchainSourceKind =
	| 'ci_workflow'
	| 'dockerfile'
	| 'go_mod'
	| 'mise_toml'
	| 'node_version_file'
	| 'package_json'
	| 'python_version_file'
	| 'pyproject_toml'
	| 'rust_toolchain'
	| 'tool_versions';

export type RepoToolchainFindingCode =
	| 'conflicting_node_version_sources'
	| 'conflicting_package_manager_lockfiles'
	| 'package_manager_without_lockfile'
	| 'toolchain_declared_without_package_manager'
	| 'runtime_declared_in_ci_only';

export interface RepoToolchainProvenanceInput {
	readonly scanned_paths: readonly string[];
	readonly max_file_bytes: number;
}

export interface RepoToolchainSource {
	readonly kind: RepoToolchainKind;
	readonly source_kind: RepoToolchainSourceKind;
	readonly path: string;
	readonly line: number | null;
	readonly key: string;
	readonly value: string;
}

export interface RepoToolchainSummary {
	readonly source_count: number;
	readonly runtime_count: number;
	readonly package_manager_count: number;
	readonly lockfile_count: number;
	readonly ci_source_count: number;
	readonly finding_count: number;
}

export interface RepoToolchainFinding extends ScriptCheckFinding {
	readonly code: RepoToolchainFindingCode;
	readonly path: string;
}

export interface RepoToolchainProvenanceReport {
	readonly schema_version: '1';
	readonly command: 'script-pack';
	readonly pack_id: typeof REPO_TOOLCHAIN_PROVENANCE_PACK_ID;
	readonly script_id: typeof REPO_TOOLCHAIN_PROVENANCE_SCRIPT_ID;
	readonly script_ref: typeof REPO_TOOLCHAIN_PROVENANCE_SCRIPT_REF;
	readonly action: 'inspect';
	readonly status: ScriptCheckStatus;
	readonly ok: boolean;
	readonly mustflow_root: string;
	readonly input: RepoToolchainProvenanceInput;
	readonly input_hash: string;
	readonly summary: RepoToolchainSummary;
	readonly sources: readonly RepoToolchainSource[];
	readonly lockfiles: readonly string[];
	readonly findings: readonly RepoToolchainFinding[];
	readonly issues: readonly string[];
}

const DEFAULT_MAX_FILE_BYTES = 256 * 1024;
const NODE_VERSION_FILES = ['.node-version', '.nvmrc'];
const PACKAGE_LOCKFILES = ['package-lock.json', 'npm-shrinkwrap.json', 'pnpm-lock.yaml', 'yarn.lock', 'bun.lock', 'bun.lockb'];
const PYTHON_LOCKFILES = ['uv.lock', 'poetry.lock', 'Pipfile.lock'];
const RUST_LOCKFILES = ['Cargo.lock'];
const GO_LOCKFILES = ['go.sum'];
const STATIC_SOURCE_PATHS = [
	'package.json',
	'pyproject.toml',
	'go.mod',
	'rust-toolchain.toml',
	'rust-toolchain',
	'mise.toml',
	'.mise.toml',
	'.tool-versions',
	'.python-version',
	...NODE_VERSION_FILES,
	...PACKAGE_LOCKFILES,
	...PYTHON_LOCKFILES,
	...RUST_LOCKFILES,
	...GO_LOCKFILES,
	'Dockerfile',
];

function sha256(value: string): string {
	return `sha256:${createHash('sha256').update(value).digest('hex')}`;
}

function normalizeRelativePath(value: string): string {
	return value.replace(/\\/gu, '/').replace(/^\.\/+/u, '');
}

function lineForOffset(content: string, offset: number): number {
	let line = 1;
	for (let index = 0; index < offset; index += 1) {
		if (content.charCodeAt(index) === 10) {
			line += 1;
		}
	}
	return line;
}

function safeReadText(root: string, relativePath: string, maxFileBytes: number, issues: string[]): string | null {
	const normalized = normalizeRelativePath(relativePath);
	const absolute = path.join(root, ...normalized.split('/'));
	try {
		const stats = statSync(absolute);
		if (!stats.isFile()) {
			return null;
		}
		if (stats.size > maxFileBytes) {
			issues.push(`${normalized} exceeds max_file_bytes (${stats.size} > ${maxFileBytes}).`);
			return null;
		}
		return readFileSync(absolute, 'utf8');
	} catch (error) {
		if (!existsSync(absolute)) {
			return null;
		}
		const message = error instanceof Error ? error.message : String(error);
		issues.push(`Could not read ${normalized}: ${message}`);
		return null;
	}
}

function firstLine(content: string, pattern: RegExp): number | null {
	const match = pattern.exec(content);
	return match && match.index >= 0 ? lineForOffset(content, match.index) : null;
}

function uniqueStrings(values: Iterable<string>): readonly string[] {
	return [...new Set([...values].filter((value) => value.trim().length > 0))].sort((left, right) =>
		left.localeCompare(right),
	);
}

function addSource(
	sources: RepoToolchainSource[],
	source: Omit<RepoToolchainSource, 'value'> & { readonly value: unknown },
): void {
	if (typeof source.value !== 'string' || source.value.trim().length === 0) {
		return;
	}
	sources.push({ ...source, value: source.value.trim() });
}

function scanPackageJson(root: string, sources: RepoToolchainSource[], scannedPaths: Set<string>, issues: string[]): void {
	const relativePath = 'package.json';
	scannedPaths.add(relativePath);
	const content = safeReadText(root, relativePath, DEFAULT_MAX_FILE_BYTES, issues);
	if (content === null) {
		return;
	}

	let parsed: unknown;
	try {
		parsed = JSON.parse(content);
	} catch (error) {
		const message = error instanceof Error ? error.message : String(error);
		issues.push(`Could not parse ${relativePath}: ${message}`);
		return;
	}
	if (!isRecord(parsed)) {
		return;
	}

	addSource(sources, {
		kind: 'package_manager',
		source_kind: 'package_json',
		path: relativePath,
		line: firstLine(content, /"packageManager"\s*:/u),
		key: 'packageManager',
		value: parsed.packageManager,
	});

	const engines = isRecord(parsed.engines) ? parsed.engines : undefined;
	addSource(sources, {
		kind: 'node',
		source_kind: 'package_json',
		path: relativePath,
		line: firstLine(content, /"node"\s*:/u),
		key: 'engines.node',
		value: engines?.node,
	});

	const devEngines = isRecord(parsed.devEngines) ? parsed.devEngines : undefined;
	const packageManager = isRecord(devEngines?.packageManager) ? devEngines?.packageManager : undefined;
	addSource(sources, {
		kind: 'package_manager',
		source_kind: 'package_json',
		path: relativePath,
		line: firstLine(content, /"packageManager"\s*:/u),
		key: 'devEngines.packageManager.name',
		value: packageManager?.name,
	});
}

function scanLineFile(
	root: string,
	relativePath: string,
	kind: RepoToolchainKind,
	sourceKind: RepoToolchainSourceKind,
	key: string,
	sources: RepoToolchainSource[],
	scannedPaths: Set<string>,
	issues: string[],
): void {
	scannedPaths.add(relativePath);
	const content = safeReadText(root, relativePath, DEFAULT_MAX_FILE_BYTES, issues);
	if (content === null) {
		return;
	}
	const value = content
		.split(/\r?\n/u)
		.map((line) => line.trim())
		.find((line) => line.length > 0 && !line.startsWith('#'));
	addSource(sources, { kind, source_kind: sourceKind, path: relativePath, line: value ? 1 : null, key, value });
}

function scanGoMod(root: string, sources: RepoToolchainSource[], scannedPaths: Set<string>, issues: string[]): void {
	const relativePath = 'go.mod';
	scannedPaths.add(relativePath);
	const content = safeReadText(root, relativePath, DEFAULT_MAX_FILE_BYTES, issues);
	if (content === null) {
		return;
	}
	for (const [key, pattern] of [
		['go', /^go\s+([^\s]+)/mu],
		['toolchain', /^toolchain\s+([^\s]+)/mu],
	] as const) {
		const match = pattern.exec(content);
		addSource(sources, {
			kind: 'go',
			source_kind: 'go_mod',
			path: relativePath,
			line: match && match.index >= 0 ? lineForOffset(content, match.index) : null,
			key,
			value: match?.[1],
		});
	}
}

function scanRustToolchain(root: string, sources: RepoToolchainSource[], scannedPaths: Set<string>, issues: string[]): void {
	for (const relativePath of ['rust-toolchain.toml', 'rust-toolchain']) {
		scannedPaths.add(relativePath);
		const content = safeReadText(root, relativePath, DEFAULT_MAX_FILE_BYTES, issues);
		if (content === null) {
			continue;
		}
		const channel = /channel\s*=\s*["']([^"']+)["']/u.exec(content)?.[1] ?? content.trim().split(/\s+/u)[0];
		addSource(sources, {
			kind: 'rust',
			source_kind: 'rust_toolchain',
			path: relativePath,
			line: firstLine(content, /channel\s*=|^\s*[^\s#]+/u),
			key: 'channel',
			value: channel,
		});
	}
}

function scanPyproject(root: string, sources: RepoToolchainSource[], scannedPaths: Set<string>, issues: string[]): void {
	const relativePath = 'pyproject.toml';
	scannedPaths.add(relativePath);
	if (!existsSync(path.join(root, relativePath))) {
		return;
	}
	try {
		const parsed = readMustflowOwnedTomlFile(root, relativePath);
		if (!isRecord(parsed)) {
			return;
		}
		const project = isRecord(parsed.project) ? parsed.project : undefined;
		addSource(sources, {
			kind: 'python',
			source_kind: 'pyproject_toml',
			path: relativePath,
			line: null,
			key: 'project.requires-python',
			value: project?.['requires-python'],
		});
	} catch (error) {
		const message = error instanceof Error ? error.message : String(error);
		issues.push(`Could not parse ${relativePath}: ${message}`);
	}
}

function scanToolVersionFile(root: string, sources: RepoToolchainSource[], scannedPaths: Set<string>, issues: string[]): void {
	const relativePath = '.tool-versions';
	scannedPaths.add(relativePath);
	const content = safeReadText(root, relativePath, DEFAULT_MAX_FILE_BYTES, issues);
	if (content === null) {
		return;
	}
	for (const [index, line] of content.split(/\r?\n/u).entries()) {
		const trimmed = line.trim();
		if (!trimmed || trimmed.startsWith('#')) {
			continue;
		}
		const [name, value] = trimmed.split(/\s+/u);
		const kind = name === 'nodejs' ? 'node' : name === 'python' ? 'python' : name === 'golang' ? 'go' : name === 'rust' ? 'rust' : null;
		if (!kind) {
			continue;
		}
		addSource(sources, {
			kind,
			source_kind: 'tool_versions',
			path: relativePath,
			line: index + 1,
			key: name,
			value,
		});
	}
}

function scanMise(root: string, sources: RepoToolchainSource[], scannedPaths: Set<string>, issues: string[]): void {
	for (const relativePath of ['mise.toml', '.mise.toml']) {
		scannedPaths.add(relativePath);
		const content = safeReadText(root, relativePath, DEFAULT_MAX_FILE_BYTES, issues);
		if (content === null) {
			continue;
		}
		for (const [tool, kind] of [
			['node', 'node'],
			['nodejs', 'node'],
			['python', 'python'],
			['go', 'go'],
			['golang', 'go'],
			['rust', 'rust'],
			['bun', 'bun'],
		] as const) {
			const pattern = new RegExp(`^\\s*${tool}\\s*=\\s*["']?([^"'\\n#]+)`, 'mu');
			const match = pattern.exec(content);
			addSource(sources, {
				kind,
				source_kind: 'mise_toml',
				path: relativePath,
				line: match && match.index >= 0 ? lineForOffset(content, match.index) : null,
				key: tool,
				value: match?.[1],
			});
		}
	}
}

function scanDockerAndCi(root: string, sources: RepoToolchainSource[], scannedPaths: Set<string>, issues: string[]): void {
	for (const relativePath of ['Dockerfile', '.github/workflows/ci.yml', '.github/workflows/ci.yaml']) {
		scannedPaths.add(relativePath);
		const content = safeReadText(root, relativePath, DEFAULT_MAX_FILE_BYTES, issues);
		if (content === null) {
			continue;
		}
		const sourceKind: RepoToolchainSourceKind = relativePath === 'Dockerfile' ? 'dockerfile' : 'ci_workflow';
		for (const [kind, key, pattern] of [
			['node', 'node-version', /node-version:\s*['"]?([^'"\n]+)/u],
			['python', 'python-version', /python-version:\s*['"]?([^'"\n]+)/u],
			['go', 'go-version', /go-version:\s*['"]?([^'"\n]+)/u],
			['rust', 'rust-toolchain', /toolchain:\s*['"]?([^'"\n]+)/u],
			['docker', 'FROM', /^FROM\s+([^\s]+)/mu],
		] as const) {
			const match = pattern.exec(content);
			addSource(sources, {
				kind,
				source_kind: sourceKind,
				path: relativePath,
				line: match && match.index >= 0 ? lineForOffset(content, match.index) : null,
				key,
				value: match?.[1],
			});
		}
	}
}

function detectLockfiles(root: string, scannedPaths: Set<string>): readonly string[] {
	const lockfiles = [...PACKAGE_LOCKFILES, ...PYTHON_LOCKFILES, ...RUST_LOCKFILES, ...GO_LOCKFILES].filter((relativePath) => {
		scannedPaths.add(relativePath);
		return existsSync(path.join(root, relativePath));
	});
	return uniqueStrings(lockfiles);
}

function createFindings(sources: readonly RepoToolchainSource[], lockfiles: readonly string[]): readonly RepoToolchainFinding[] {
	const findings: RepoToolchainFinding[] = [];
	const nodeSources = sources.filter((source) => source.kind === 'node' && source.source_kind !== 'ci_workflow');
	const nodeValues = uniqueStrings(nodeSources.map((source) => source.value));
	if (nodeValues.length > 1) {
		findings.push({
			code: 'conflicting_node_version_sources',
			severity: 'medium',
			path: nodeSources[0]?.path ?? 'package.json',
			message: 'Multiple local Node version declarations were detected. Review which source owns the runtime contract.',
			json_pointer: null,
			metric: 'node_version_source_count',
			actual: nodeValues.length,
			expected: 1,
		});
	}

	const packageLockfiles = lockfiles.filter((lockfile) => PACKAGE_LOCKFILES.includes(lockfile));
	if (packageLockfiles.length > 1) {
		findings.push({
			code: 'conflicting_package_manager_lockfiles',
			severity: 'high',
			path: packageLockfiles[0] ?? 'package.json',
			message: 'Multiple JavaScript package-manager lockfiles were detected.',
			json_pointer: null,
			metric: 'package_manager_lockfile_count',
			actual: packageLockfiles.length,
			expected: 1,
		});
	}

	const packageManagerSources = sources.filter((source) => source.kind === 'package_manager');
	if (packageManagerSources.length > 0 && packageLockfiles.length === 0) {
		findings.push({
			code: 'package_manager_without_lockfile',
			severity: 'medium',
			path: packageManagerSources[0]?.path ?? 'package.json',
			message: 'A package manager is declared, but no JavaScript lockfile was detected.',
			json_pointer: null,
			metric: 'package_manager_lockfile_count',
			actual: 0,
			expected: 1,
		});
	}

	if (sources.some((source) => source.kind === 'node') && packageManagerSources.length === 0) {
		findings.push({
			code: 'toolchain_declared_without_package_manager',
			severity: 'low',
			path: sources.find((source) => source.kind === 'node')?.path ?? 'package.json',
			message: 'Node is declared, but no package manager provenance was detected.',
			json_pointer: null,
			metric: 'package_manager_source_count',
			actual: 0,
			expected: 1,
		});
	}

	for (const source of sources.filter((entry) => entry.source_kind === 'ci_workflow')) {
		const localSameKind = sources.some((entry) => entry.kind === source.kind && entry.source_kind !== 'ci_workflow');
		if (!localSameKind) {
			findings.push({
				code: 'runtime_declared_in_ci_only',
				severity: 'low',
				path: source.path,
				message: `${source.kind} runtime appears in CI, but no local repository contract was detected.`,
				json_pointer: null,
				metric: null,
				actual: null,
				expected: null,
			});
		}
	}

	return findings;
}

function createSummary(
	sources: readonly RepoToolchainSource[],
	lockfiles: readonly string[],
	findings: readonly RepoToolchainFinding[],
): RepoToolchainSummary {
	const runtimeKinds = uniqueStrings(sources.filter((source) => source.kind !== 'package_manager').map((source) => source.kind));
	return {
		source_count: sources.length,
		runtime_count: runtimeKinds.length,
		package_manager_count: sources.filter((source) => source.kind === 'package_manager').length,
		lockfile_count: lockfiles.length,
		ci_source_count: sources.filter((source) => source.source_kind === 'ci_workflow').length,
		finding_count: findings.length,
	};
}

export function inspectRepoToolchainProvenance(projectRoot: string): RepoToolchainProvenanceReport {
	const root = path.resolve(projectRoot);
	const issues: string[] = [];
	const scannedPaths = new Set<string>(STATIC_SOURCE_PATHS);
	const sources: RepoToolchainSource[] = [];

	scanPackageJson(root, sources, scannedPaths, issues);
	for (const nodePath of NODE_VERSION_FILES) {
		scanLineFile(root, nodePath, 'node', 'node_version_file', nodePath, sources, scannedPaths, issues);
	}
	scanLineFile(root, '.python-version', 'python', 'python_version_file', '.python-version', sources, scannedPaths, issues);
	scanPyproject(root, sources, scannedPaths, issues);
	scanGoMod(root, sources, scannedPaths, issues);
	scanRustToolchain(root, sources, scannedPaths, issues);
	scanToolVersionFile(root, sources, scannedPaths, issues);
	scanMise(root, sources, scannedPaths, issues);
	scanDockerAndCi(root, sources, scannedPaths, issues);

	const lockfiles = detectLockfiles(root, scannedPaths);
	const sortedSources = sources.sort((left, right) => left.path.localeCompare(right.path) || left.key.localeCompare(right.key));
	const findings = createFindings(sortedSources, lockfiles);
	const summary = createSummary(sortedSources, lockfiles, findings);
	const status: ScriptCheckStatus = issues.length > 0 ? 'error' : findings.length > 0 ? 'failed' : 'passed';

	return {
		schema_version: '1',
		command: 'script-pack',
		pack_id: REPO_TOOLCHAIN_PROVENANCE_PACK_ID,
		script_id: REPO_TOOLCHAIN_PROVENANCE_SCRIPT_ID,
		script_ref: REPO_TOOLCHAIN_PROVENANCE_SCRIPT_REF,
		action: 'inspect',
		status,
		ok: status === 'passed',
		mustflow_root: root,
		input: {
			scanned_paths: uniqueStrings(scannedPaths),
			max_file_bytes: DEFAULT_MAX_FILE_BYTES,
		},
		input_hash: sha256(JSON.stringify({ summary, sources: sortedSources, lockfiles, findings, issues })),
		summary,
		sources: sortedSources,
		lockfiles,
		findings,
		issues,
	};
}
