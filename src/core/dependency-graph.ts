import { createHash } from 'node:crypto';
import { existsSync, lstatSync, readdirSync } from 'node:fs';
import path from 'node:path';

import {
	type ScriptCheckFinding,
	type ScriptCheckFindingSeverity,
	type ScriptCheckStatus,
} from './script-check-result.js';
import { ensureInside, ensureInsideWithoutSymlinks, readFileInsideWithoutSymlinks } from './safe-filesystem.js';

export const DEPENDENCY_GRAPH_PACK_ID = 'code';
export const DEPENDENCY_GRAPH_SCRIPT_ID = 'dependency-graph';
export const DEPENDENCY_GRAPH_SCRIPT_REF = `${DEPENDENCY_GRAPH_PACK_ID}/${DEPENDENCY_GRAPH_SCRIPT_ID}`;

export type DependencyGraphLanguage =
	| 'typescript'
	| 'tsx'
	| 'javascript'
	| 'jsx'
	| 'javascript-module'
	| 'javascript-commonjs'
	| 'json'
	| 'other';

export type DependencyGraphTargetKind = 'file' | 'directory' | 'missing' | 'other' | 'unknown';
export type DependencyGraphEdgeKind = 'static_import' | 'static_export' | 'dynamic_import' | 'require';

export type DependencyGraphFindingCode =
	| 'dependency_graph_path_outside_root'
	| 'dependency_graph_unreadable_path'
	| 'dependency_graph_max_files_exceeded'
	| 'dependency_graph_max_nodes_exceeded'
	| 'dependency_graph_max_edges_exceeded';

export interface DependencyGraphPolicy {
	readonly max_file_bytes: number;
	readonly max_files: number;
	readonly max_depth: number;
	readonly max_nodes: number;
	readonly max_edges: number;
	readonly extensions: readonly string[];
	readonly ignored_directories: readonly string[];
}

export interface DependencyGraphTarget {
	readonly input: string;
	readonly path: string;
	readonly exists: boolean | null;
	readonly kind: DependencyGraphTargetKind;
	readonly language: DependencyGraphLanguage;
}

export interface DependencyGraphNode {
	readonly path: string;
	readonly language: DependencyGraphLanguage;
	readonly target: boolean;
	readonly depth: number;
	readonly import_count: number;
	readonly importer_count: number;
}

export interface DependencyGraphEdge {
	readonly source_path: string;
	readonly target_path: string;
	readonly specifier: string;
	readonly line: number;
	readonly kind: DependencyGraphEdgeKind;
}

export interface DependencyGraphFinding extends ScriptCheckFinding {
	readonly code: DependencyGraphFindingCode;
	readonly path: string;
}

export interface DependencyGraphReport {
	readonly schema_version: '1';
	readonly command: 'script-pack';
	readonly pack_id: typeof DEPENDENCY_GRAPH_PACK_ID;
	readonly script_id: typeof DEPENDENCY_GRAPH_SCRIPT_ID;
	readonly script_ref: typeof DEPENDENCY_GRAPH_SCRIPT_REF;
	readonly action: 'scan';
	readonly status: ScriptCheckStatus;
	readonly ok: boolean;
	readonly mustflow_root: string;
	readonly policy: DependencyGraphPolicy;
	readonly input_hash: string;
	readonly targets: readonly DependencyGraphTarget[];
	readonly nodes: readonly DependencyGraphNode[];
	readonly edges: readonly DependencyGraphEdge[];
	readonly cycles: readonly (readonly string[])[];
	readonly truncated: boolean;
	readonly findings: readonly DependencyGraphFinding[];
	readonly issues: readonly string[];
}

export interface InspectDependencyGraphOptions {
	readonly paths: readonly string[];
	readonly maxFileBytes?: number;
	readonly maxFiles?: number;
	readonly maxDepth?: number;
	readonly maxNodes?: number;
	readonly maxEdges?: number;
}

interface SourceFileCandidate {
	readonly absolutePath: string;
	readonly relativePath: string;
	readonly language: DependencyGraphLanguage;
}

interface ImportSpecifierMatch {
	readonly specifier: string;
	readonly index: number;
	readonly kind: DependencyGraphEdgeKind;
}

interface ImportReference {
	readonly specifier: string;
	readonly line: number;
	readonly kind: DependencyGraphEdgeKind;
	readonly resolvedPath: string | null;
}

const DEFAULT_MAX_FILE_BYTES = 256 * 1024;
const DEFAULT_MAX_FILES = 1000;
const DEFAULT_MAX_DEPTH = 2;
const DEFAULT_MAX_NODES = 300;
const DEFAULT_MAX_EDGES = 800;
const MAX_ISSUES = 50;
const MAX_CYCLES = 20;
const SOURCE_EXTENSIONS: readonly string[] = ['.ts', '.tsx', '.mts', '.cts', '.js', '.jsx', '.mjs', '.cjs'];
const RESOLVE_EXTENSIONS: readonly string[] = [...SOURCE_EXTENSIONS, '.json'];
const IGNORED_DIRECTORIES = [
	'.git',
	'.mustflow/cache',
	'.mustflow/state',
	'node_modules',
	'dist',
	'build',
	'coverage',
	'.next',
	'.turbo',
] as const;
const ERROR_CODES = new Set<DependencyGraphFindingCode>([
	'dependency_graph_path_outside_root',
	'dependency_graph_unreadable_path',
]);

function toPosixPath(value: string): string {
	return value.replace(/\\/gu, '/');
}

function normalizeRelativePath(value: string): string {
	return toPosixPath(value).replace(/^\.\/+/u, '') || '.';
}

function sha256Tagged(value: string): string {
	return `sha256:${createHash('sha256').update(value).digest('hex')}`;
}

function languageForPath(filePath: string): DependencyGraphLanguage {
	switch (path.extname(filePath).toLowerCase()) {
		case '.ts':
		case '.mts':
		case '.cts':
			return filePath.endsWith('.d.ts') ? 'other' : 'typescript';
		case '.tsx':
			return 'tsx';
		case '.js':
			return 'javascript';
		case '.jsx':
			return 'jsx';
		case '.mjs':
			return 'javascript-module';
		case '.cjs':
			return 'javascript-commonjs';
		case '.json':
			return 'json';
		default:
			return 'other';
	}
}

function isSourceLanguage(language: DependencyGraphLanguage): boolean {
	return language !== 'json' && language !== 'other';
}

function isIgnoredDirectory(relativePath: string): boolean {
	const normalized = normalizeRelativePath(relativePath);
	return IGNORED_DIRECTORIES.some((directory) => normalized === directory || normalized.startsWith(`${directory}/`));
}

function makeFinding(
	code: DependencyGraphFindingCode,
	severity: ScriptCheckFindingSeverity,
	pathValue: string,
	message: string,
): DependencyGraphFinding {
	return { code, severity, path: pathValue, message };
}

function pushIssue(issues: string[], issue: string): void {
	if (issues.length < MAX_ISSUES) {
		issues.push(issue);
	}
}

function normalizeTargetPath(projectRoot: string, targetPath: string): { readonly absolutePath: string; readonly relativePath: string } {
	const absolutePath = path.resolve(process.cwd(), targetPath);
	ensureInside(projectRoot, absolutePath);
	return {
		absolutePath,
		relativePath: normalizeRelativePath(path.relative(projectRoot, absolutePath)),
	};
}

function targetKind(absolutePath: string): { readonly exists: boolean; readonly kind: DependencyGraphTargetKind } {
	if (!existsSync(absolutePath)) {
		return { exists: false, kind: 'missing' };
	}

	const stats = lstatSync(absolutePath);
	if (stats.isFile()) {
		return { exists: true, kind: 'file' };
	}
	if (stats.isDirectory()) {
		return { exists: true, kind: 'directory' };
	}
	return { exists: true, kind: 'other' };
}

function collectFilesFromDirectory(
	projectRoot: string,
	absoluteDirectory: string,
	candidates: SourceFileCandidate[],
	findings: DependencyGraphFinding[],
	issues: string[],
	policy: DependencyGraphPolicy,
): void {
	const relativeDirectory = normalizeRelativePath(path.relative(projectRoot, absoluteDirectory));
	if (isIgnoredDirectory(relativeDirectory)) {
		return;
	}

	let entries;
	try {
		ensureInsideWithoutSymlinks(projectRoot, absoluteDirectory);
		entries = readdirSync(absoluteDirectory, { withFileTypes: true });
	} catch (error) {
		const message = error instanceof Error ? error.message : String(error);
		pushIssue(issues, `${relativeDirectory}: ${message}`);
		findings.push(makeFinding('dependency_graph_unreadable_path', 'high', relativeDirectory, message));
		return;
	}

	for (const entry of entries) {
		if (candidates.length >= policy.max_files) {
			const message = `Dependency graph scan matched more than ${policy.max_files} files; remaining files were skipped.`;
			pushIssue(issues, `${relativeDirectory}: ${message}`);
			if (!findings.some((finding) => finding.code === 'dependency_graph_max_files_exceeded')) {
				findings.push(makeFinding('dependency_graph_max_files_exceeded', 'medium', relativeDirectory, message));
			}
			return;
		}

		const absoluteEntry = path.join(absoluteDirectory, entry.name);
		const relativeEntry = normalizeRelativePath(path.relative(projectRoot, absoluteEntry));

		if (entry.isDirectory()) {
			collectFilesFromDirectory(projectRoot, absoluteEntry, candidates, findings, issues, policy);
			continue;
		}

		if (!entry.isFile() || !SOURCE_EXTENSIONS.includes(path.extname(entry.name).toLowerCase())) {
			continue;
		}

		candidates.push({ absolutePath: absoluteEntry, relativePath: relativeEntry, language: languageForPath(absoluteEntry) });
	}
}

function collectCandidateFiles(
	projectRoot: string,
	findings: DependencyGraphFinding[],
	issues: string[],
	policy: DependencyGraphPolicy,
): readonly SourceFileCandidate[] {
	const candidates: SourceFileCandidate[] = [];
	collectFilesFromDirectory(projectRoot, projectRoot, candidates, findings, issues, policy);
	return candidates.slice(0, policy.max_files);
}

function lineNumberAtIndex(text: string, index: number): number {
	let line = 1;
	let offset = 0;
	while (offset < index) {
		if (text.charCodeAt(offset) === 10) {
			line += 1;
		}
		offset += 1;
	}
	return line;
}

function extractImportSpecifiers(text: string): readonly ImportSpecifierMatch[] {
	const results: ImportSpecifierMatch[] = [];
	const patterns = [
		{
			kind: 'static_import',
			pattern: /\bimport\s+(?:type\s+)?(?:[^'"]*?\s+from\s+)?['"](?<specifier>[^'"]+)['"]/gu,
		},
		{
			kind: 'static_export',
			pattern: /\bexport\s+(?:type\s+)?[^'"]*?\s+from\s+['"](?<specifier>[^'"]+)['"]/gu,
		},
		{
			kind: 'dynamic_import',
			pattern: /\bimport\s*\(\s*['"](?<specifier>[^'"]+)['"]\s*\)/gu,
		},
		{
			kind: 'require',
			pattern: /\brequire\s*\(\s*['"](?<specifier>[^'"]+)['"]\s*\)/gu,
		},
	] as const;

	for (const { kind, pattern } of patterns) {
		for (const match of text.matchAll(pattern)) {
			const specifier = match.groups?.specifier;
			if (specifier) {
				results.push({ specifier, index: match.index ?? 0, kind });
			}
		}
	}

	return results.sort((left, right) => left.index - right.index || left.specifier.localeCompare(right.specifier));
}

function isRelativeSpecifier(specifier: string): boolean {
	return specifier.startsWith('./') || specifier.startsWith('../');
}

function fileExists(absolutePath: string): boolean {
	try {
		return lstatSync(absolutePath).isFile();
	} catch {
		return false;
	}
}

function resolveRelativeImport(projectRoot: string, sourceAbsolutePath: string, specifier: string): string | null {
	if (!isRelativeSpecifier(specifier)) {
		return null;
	}

	const base = path.resolve(path.dirname(sourceAbsolutePath), specifier);
	const candidates = [
		base,
		...RESOLVE_EXTENSIONS.map((extension) => `${base}${extension}`),
		...RESOLVE_EXTENSIONS.map((extension) => path.join(base, `index${extension}`)),
	];

	for (const candidate of candidates) {
		try {
			ensureInside(projectRoot, candidate);
			if (fileExists(candidate)) {
				return normalizeRelativePath(path.relative(projectRoot, candidate));
			}
		} catch {
			return null;
		}
	}

	return null;
}

function readImportsForFile(
	projectRoot: string,
	candidate: SourceFileCandidate,
	policy: DependencyGraphPolicy,
	issues: string[],
): readonly ImportReference[] {
	if (!isSourceLanguage(candidate.language)) {
		return [];
	}

	let buffer: Buffer;
	try {
		buffer = readFileInsideWithoutSymlinks(projectRoot, candidate.absolutePath, { maxBytes: policy.max_file_bytes });
	} catch (error) {
		const message = error instanceof Error ? error.message : String(error);
		pushIssue(issues, `${candidate.relativePath}: ${message}`);
		return [];
	}

	const text = buffer.toString('utf8');
	return extractImportSpecifiers(text).map((entry) => ({
		specifier: entry.specifier,
		line: lineNumberAtIndex(text, entry.index),
		kind: entry.kind,
		resolvedPath: resolveRelativeImport(projectRoot, candidate.absolutePath, entry.specifier),
	}));
}

function edgeKey(edge: DependencyGraphEdge): string {
	return [edge.source_path, edge.target_path, edge.kind, edge.line, edge.specifier].join('\0');
}

function addGraphFinding(
	findings: DependencyGraphFinding[],
	issues: string[],
	code: DependencyGraphFindingCode,
	pathValue: string,
	message: string,
): void {
	if (!findings.some((finding) => finding.code === code)) {
		findings.push(makeFinding(code, 'medium', pathValue, message));
		pushIssue(issues, message);
	}
}

function addEdge(
	edges: Map<string, DependencyGraphEdge>,
	edge: DependencyGraphEdge,
	policy: DependencyGraphPolicy,
	findings: DependencyGraphFinding[],
	issues: string[],
): void {
	if (edges.has(edgeKey(edge))) {
		return;
	}
	if (edges.size >= policy.max_edges) {
		addGraphFinding(
			findings,
			issues,
			'dependency_graph_max_edges_exceeded',
			edge.source_path,
			`Dependency graph found more than ${policy.max_edges} edges; remaining edges were skipped.`,
		);
		return;
	}
	edges.set(edgeKey(edge), edge);
}

function targetSourceFiles(
	targets: readonly DependencyGraphTarget[],
	sourceFiles: readonly SourceFileCandidate[],
): readonly string[] {
	const sources = new Set(sourceFiles.map((file) => file.relativePath));
	const selected = new Set<string>();

	for (const target of targets) {
		if (target.kind === 'file' && sources.has(target.path)) {
			selected.add(target.path);
			continue;
		}
		if (target.kind !== 'directory') {
			continue;
		}
		const prefix = target.path === '.' ? '' : `${target.path}/`;
		for (const file of sourceFiles) {
			if (prefix === '' || file.relativePath.startsWith(prefix)) {
				selected.add(file.relativePath);
			}
		}
	}

	return [...selected].sort((left, right) => left.localeCompare(right));
}

function dependencyEdgesFor(
	sourcePath: string,
	importMap: ReadonlyMap<string, readonly ImportReference[]>,
): readonly DependencyGraphEdge[] {
	return (importMap.get(sourcePath) ?? [])
		.filter((reference) => reference.resolvedPath !== null)
		.map((reference) => ({
			source_path: sourcePath,
			target_path: reference.resolvedPath ?? '',
			specifier: reference.specifier,
			line: reference.line,
			kind: reference.kind,
		}));
}

function buildIncludedGraph(
	startPaths: readonly string[],
	importMap: ReadonlyMap<string, readonly ImportReference[]>,
	importerMap: ReadonlyMap<string, readonly DependencyGraphEdge[]>,
	policy: DependencyGraphPolicy,
	findings: DependencyGraphFinding[],
	issues: string[],
): { readonly nodeDepth: ReadonlyMap<string, number>; readonly edges: readonly DependencyGraphEdge[] } {
	const queue = startPaths.map((sourcePath) => ({ sourcePath, depth: 0 }));
	const nodeDepth = new Map<string, number>();
	const edgeMap = new Map<string, DependencyGraphEdge>();

	for (const sourcePath of startPaths) {
		nodeDepth.set(sourcePath, 0);
	}

	while (queue.length > 0) {
		const current = queue.shift();
		if (!current || current.depth >= policy.max_depth) {
			continue;
		}

		for (const edge of dependencyEdgesFor(current.sourcePath, importMap)) {
			addEdge(edgeMap, edge, policy, findings, issues);
			if (!nodeDepth.has(edge.target_path)) {
				if (nodeDepth.size >= policy.max_nodes) {
					addGraphFinding(
						findings,
						issues,
						'dependency_graph_max_nodes_exceeded',
						edge.target_path,
						`Dependency graph found more than ${policy.max_nodes} nodes; remaining nodes were skipped.`,
					);
					continue;
				}
				nodeDepth.set(edge.target_path, current.depth + 1);
				queue.push({ sourcePath: edge.target_path, depth: current.depth + 1 });
			}
		}
	}

	for (const sourcePath of [...nodeDepth.keys()]) {
		for (const edge of importerMap.get(sourcePath) ?? []) {
			if (nodeDepth.has(edge.source_path)) {
				addEdge(edgeMap, edge, policy, findings, issues);
				continue;
			}
			if (nodeDepth.size >= policy.max_nodes) {
				addGraphFinding(
					findings,
					issues,
					'dependency_graph_max_nodes_exceeded',
					edge.source_path,
					`Dependency graph found more than ${policy.max_nodes} nodes; remaining nodes were skipped.`,
				);
				continue;
			}
			nodeDepth.set(edge.source_path, Math.max(1, (nodeDepth.get(sourcePath) ?? 0) + 1));
			addEdge(edgeMap, edge, policy, findings, issues);
		}
	}

	return {
		nodeDepth,
		edges: [...edgeMap.values()].sort(
			(left, right) =>
				left.source_path.localeCompare(right.source_path) ||
				left.target_path.localeCompare(right.target_path) ||
				left.line - right.line ||
				left.kind.localeCompare(right.kind),
		),
	};
}

function findCycles(edges: readonly DependencyGraphEdge[]): readonly (readonly string[])[] {
	const adjacency = new Map<string, string[]>();
	for (const edge of edges) {
		const targets = adjacency.get(edge.source_path) ?? [];
		targets.push(edge.target_path);
		adjacency.set(edge.source_path, targets);
	}
	for (const targets of adjacency.values()) {
		targets.sort((left, right) => left.localeCompare(right));
	}

	const cycles = new Map<string, readonly string[]>();
	const visit = (node: string, stack: string[], seen: Set<string>): void => {
		if (cycles.size >= MAX_CYCLES) {
			return;
		}
		const existingIndex = stack.indexOf(node);
		if (existingIndex >= 0) {
			const cycle = [...stack.slice(existingIndex), node];
			const body = cycle.slice(0, -1);
			const sorted = [...body].sort((left, right) => left.localeCompare(right));
			cycles.set(sorted.join('\0'), cycle);
			return;
		}
		if (seen.has(node)) {
			return;
		}
		seen.add(node);
		for (const next of adjacency.get(node) ?? []) {
			visit(next, [...stack, node], seen);
		}
	};

	for (const node of [...adjacency.keys()].sort((left, right) => left.localeCompare(right))) {
		visit(node, [], new Set<string>());
	}

	return [...cycles.values()];
}

function dependencyGraphStatus(findings: readonly DependencyGraphFinding[]): ScriptCheckStatus {
	if (findings.some((finding) => ERROR_CODES.has(finding.code))) {
		return 'error';
	}
	return findings.length > 0 ? 'failed' : 'passed';
}

function createInputHash(
	policy: DependencyGraphPolicy,
	targets: readonly DependencyGraphTarget[],
	nodes: readonly DependencyGraphNode[],
	edges: readonly DependencyGraphEdge[],
	findings: readonly DependencyGraphFinding[],
	issues: readonly string[],
): string {
	return sha256Tagged(
		JSON.stringify({
			policy,
			targets,
			nodes: nodes.map((node) => node.path),
			edges: edges.map((edge) => [edge.source_path, edge.target_path, edge.kind, edge.line]),
			findings: findings.map((finding) => ({ code: finding.code, path: finding.path })),
			issues,
		}),
	);
}

export function inspectDependencyGraph(
	projectRoot: string,
	options: InspectDependencyGraphOptions,
): DependencyGraphReport {
	const root = path.resolve(projectRoot);
	const policy: DependencyGraphPolicy = {
		max_file_bytes: options.maxFileBytes ?? DEFAULT_MAX_FILE_BYTES,
		max_files: options.maxFiles ?? DEFAULT_MAX_FILES,
		max_depth: options.maxDepth ?? DEFAULT_MAX_DEPTH,
		max_nodes: options.maxNodes ?? DEFAULT_MAX_NODES,
		max_edges: options.maxEdges ?? DEFAULT_MAX_EDGES,
		extensions: [...SOURCE_EXTENSIONS],
		ignored_directories: [...IGNORED_DIRECTORIES],
	};
	const targets: DependencyGraphTarget[] = [];
	const findings: DependencyGraphFinding[] = [];
	const issues: string[] = [];

	for (const targetPath of options.paths) {
		let absolutePath: string;
		let relativePath: string;
		try {
			const normalized = normalizeTargetPath(root, targetPath);
			absolutePath = normalized.absolutePath;
			relativePath = normalized.relativePath;
			ensureInsideWithoutSymlinks(root, absolutePath, { allowMissingLeaf: true });
		} catch (error) {
			const message = error instanceof Error ? error.message : String(error);
			pushIssue(issues, message);
			targets.push({ input: targetPath, path: targetPath, exists: null, kind: 'unknown', language: 'other' });
			findings.push(makeFinding('dependency_graph_path_outside_root', 'high', targetPath, message));
			continue;
		}

		try {
			const existence = targetKind(absolutePath);
			targets.push({
				input: targetPath,
				path: relativePath,
				exists: existence.exists,
				kind: existence.kind,
				language: languageForPath(absolutePath),
			});
		} catch (error) {
			const message = error instanceof Error ? error.message : String(error);
			pushIssue(issues, `${relativePath}: ${message}`);
			targets.push({ input: targetPath, path: relativePath, exists: null, kind: 'unknown', language: 'other' });
			findings.push(makeFinding('dependency_graph_unreadable_path', 'high', relativePath, message));
		}
	}

	const sourceFiles = collectCandidateFiles(root, findings, issues, policy);
	const sourceByPath = new Map(sourceFiles.map((file) => [file.relativePath, file]));
	const importMap = new Map<string, readonly ImportReference[]>();
	const importerMap = new Map<string, DependencyGraphEdge[]>();

	for (const file of sourceFiles) {
		const references = readImportsForFile(root, file, policy, issues);
		importMap.set(file.relativePath, references);
		for (const edge of dependencyEdgesFor(file.relativePath, importMap)) {
			const importers = importerMap.get(edge.target_path) ?? [];
			importers.push(edge);
			importerMap.set(edge.target_path, importers);
		}
	}

	const startPaths = targetSourceFiles(targets, sourceFiles);
	const graph = buildIncludedGraph(startPaths, importMap, importerMap, policy, findings, issues);
	const targetSet = new Set(startPaths);
	const importCount = new Map<string, number>();
	const importerCount = new Map<string, number>();

	for (const edge of graph.edges) {
		importCount.set(edge.source_path, (importCount.get(edge.source_path) ?? 0) + 1);
		importerCount.set(edge.target_path, (importerCount.get(edge.target_path) ?? 0) + 1);
	}

	const nodes = [...graph.nodeDepth.entries()]
		.map(([nodePath, depth]) => ({
			path: nodePath,
			language: sourceByPath.get(nodePath)?.language ?? languageForPath(nodePath),
			target: targetSet.has(nodePath),
			depth,
			import_count: importCount.get(nodePath) ?? 0,
			importer_count: importerCount.get(nodePath) ?? 0,
		}))
		.sort((left, right) => left.depth - right.depth || left.path.localeCompare(right.path));
	const cycles = findCycles(graph.edges);
	const status = dependencyGraphStatus(findings);

	return {
		schema_version: '1',
		command: 'script-pack',
		pack_id: DEPENDENCY_GRAPH_PACK_ID,
		script_id: DEPENDENCY_GRAPH_SCRIPT_ID,
		script_ref: DEPENDENCY_GRAPH_SCRIPT_REF,
		action: 'scan',
		status,
		ok: status === 'passed',
		mustflow_root: root,
		policy,
		input_hash: createInputHash(policy, targets, nodes, graph.edges, findings, issues),
		targets,
		nodes,
		edges: graph.edges,
		cycles,
		truncated: findings.some((finding) =>
			[
				'dependency_graph_max_files_exceeded',
				'dependency_graph_max_nodes_exceeded',
				'dependency_graph_max_edges_exceeded',
			].includes(finding.code),
		),
		findings,
		issues,
	};
}
