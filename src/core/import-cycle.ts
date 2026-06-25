import { createHash } from 'node:crypto';
import path from 'node:path';

import {
	DEPENDENCY_GRAPH_SCRIPT_REF,
	inspectDependencyGraph,
	type DependencyGraphEdge,
	type DependencyGraphFinding,
	type DependencyGraphPolicy,
	type DependencyGraphReport,
} from './dependency-graph.js';
import type {
	ScriptCheckFinding,
	ScriptCheckFindingSeverity,
	ScriptCheckStatus,
} from './script-check-result.js';

export const IMPORT_CYCLE_PACK_ID = 'code';
export const IMPORT_CYCLE_SCRIPT_ID = 'import-cycle';
export const IMPORT_CYCLE_SCRIPT_REF = `${IMPORT_CYCLE_PACK_ID}/${IMPORT_CYCLE_SCRIPT_ID}`;

export type ImportCycleFindingCode =
	| DependencyGraphFinding['code']
	| 'import_cycle_detected'
	| 'import_cycle_max_cycles_exceeded';

export interface ImportCyclePolicy extends DependencyGraphPolicy {
	readonly max_cycles: number;
}

export interface ImportCycleGraphSummary {
	readonly script_ref: typeof DEPENDENCY_GRAPH_SCRIPT_REF;
	readonly status: ScriptCheckStatus;
	readonly node_count: number;
	readonly edge_count: number;
	readonly cycle_hint_count: number;
	readonly truncated: boolean;
}

export interface ImportCycleEdge {
	readonly source_path: string;
	readonly target_path: string;
	readonly specifier: string;
	readonly line: number;
	readonly kind: DependencyGraphEdge['kind'];
}

export interface ImportCycle {
	readonly cycle_id: string;
	readonly path_count: number;
	readonly paths: readonly string[];
	readonly edges: readonly ImportCycleEdge[];
}

export interface ImportCycleFinding extends ScriptCheckFinding {
	readonly code: ImportCycleFindingCode;
	readonly path: string;
	readonly cycle_id?: string;
}

export interface ImportCycleReport {
	readonly schema_version: '1';
	readonly command: 'script-pack';
	readonly pack_id: typeof IMPORT_CYCLE_PACK_ID;
	readonly script_id: typeof IMPORT_CYCLE_SCRIPT_ID;
	readonly script_ref: typeof IMPORT_CYCLE_SCRIPT_REF;
	readonly action: 'check';
	readonly status: ScriptCheckStatus;
	readonly ok: boolean;
	readonly mustflow_root: string;
	readonly policy: ImportCyclePolicy;
	readonly input_hash: string;
	readonly targets: DependencyGraphReport['targets'];
	readonly graph: ImportCycleGraphSummary;
	readonly cycles: readonly ImportCycle[];
	readonly truncated: boolean;
	readonly findings: readonly ImportCycleFinding[];
	readonly issues: readonly string[];
}

export interface InspectImportCyclesOptions {
	readonly paths: readonly string[];
	readonly maxFileBytes?: number;
	readonly maxFiles?: number;
	readonly maxDepth?: number;
	readonly maxNodes?: number;
	readonly maxEdges?: number;
	readonly maxCycles?: number;
}

const DEFAULT_MAX_DEPTH = 20;
const DEFAULT_MAX_CYCLES = 50;
const MAX_ISSUES = 50;

function sha256Tagged(value: string): string {
	return `sha256:${createHash('sha256').update(value).digest('hex')}`;
}

function cycleId(paths: readonly string[]): string {
	return `cycle:${createHash('sha256').update(paths.join('\0')).digest('hex').slice(0, 12)}`;
}

function edgeKey(sourcePath: string, targetPath: string): string {
	return `${sourcePath}\0${targetPath}`;
}

function buildEdgeIndex(edges: readonly DependencyGraphEdge[]): ReadonlyMap<string, DependencyGraphEdge[]> {
	const index = new Map<string, DependencyGraphEdge[]>();
	for (const edge of edges) {
		const key = edgeKey(edge.source_path, edge.target_path);
		const existing = index.get(key) ?? [];
		existing.push(edge);
		index.set(key, existing);
	}
	for (const indexedEdges of index.values()) {
		indexedEdges.sort(
			(left, right) =>
				left.line - right.line ||
				left.kind.localeCompare(right.kind) ||
				left.specifier.localeCompare(right.specifier),
		);
	}
	return index;
}

function importCycleEdges(
	cyclePaths: readonly string[],
	edgeIndex: ReadonlyMap<string, readonly DependencyGraphEdge[]>,
): readonly ImportCycleEdge[] {
	const edges: ImportCycleEdge[] = [];
	let index = 0;
	while (index < cyclePaths.length - 1) {
		const sourcePath = cyclePaths[index];
		const targetPath = cyclePaths[index + 1];
		if (!sourcePath || !targetPath) {
			index += 1;
			continue;
		}
		const [edge] = edgeIndex.get(edgeKey(sourcePath, targetPath)) ?? [];
		if (edge) {
			edges.push({
				source_path: edge.source_path,
				target_path: edge.target_path,
				specifier: edge.specifier,
				line: edge.line,
				kind: edge.kind,
			});
		}
		index += 1;
	}
	return edges;
}

function makeFinding(
	code: ImportCycleFindingCode,
	severity: ScriptCheckFindingSeverity,
	pathValue: string,
	message: string,
	cycle_id?: string,
): ImportCycleFinding {
	return cycle_id
		? { code, severity, path: pathValue, message, cycle_id }
		: { code, severity, path: pathValue, message };
}

function normalizeGraphFinding(finding: DependencyGraphFinding): ImportCycleFinding {
	return {
		code: finding.code,
		severity: finding.severity,
		path: finding.path,
		message: finding.message,
	};
}

function pushIssue(issues: string[], issue: string): void {
	if (issues.length < MAX_ISSUES) {
		issues.push(issue);
	}
}

function importCycleStatus(
	graphStatus: ScriptCheckStatus,
	cycles: readonly ImportCycle[],
	findings: readonly ImportCycleFinding[],
): ScriptCheckStatus {
	if (graphStatus === 'error') {
		return 'error';
	}
	return cycles.length > 0 || findings.length > 0 ? 'failed' : 'passed';
}

function createInputHash(
	policy: ImportCyclePolicy,
	graph: DependencyGraphReport,
	cycles: readonly ImportCycle[],
	findings: readonly ImportCycleFinding[],
	issues: readonly string[],
): string {
	return sha256Tagged(
		JSON.stringify({
			policy,
			graph_input_hash: graph.input_hash,
			targets: graph.targets,
			cycles: cycles.map((cycle) => ({ cycle_id: cycle.cycle_id, paths: cycle.paths })),
			findings: findings.map((finding) => ({ code: finding.code, path: finding.path, cycle_id: finding.cycle_id })),
			issues,
		}),
	);
}

export function inspectImportCycles(projectRoot: string, options: InspectImportCyclesOptions): ImportCycleReport {
	const root = path.resolve(projectRoot);
	const graph = inspectDependencyGraph(root, {
		paths: options.paths,
		maxFiles: options.maxFiles,
		maxFileBytes: options.maxFileBytes,
		maxDepth: options.maxDepth ?? DEFAULT_MAX_DEPTH,
		maxNodes: options.maxNodes,
		maxEdges: options.maxEdges,
	});
	const policy: ImportCyclePolicy = {
		...graph.policy,
		max_cycles: options.maxCycles ?? DEFAULT_MAX_CYCLES,
	};
	const edgeIndex = buildEdgeIndex(graph.edges);
	const cycles = graph.cycles.slice(0, policy.max_cycles).map((cyclePaths) => ({
		cycle_id: cycleId(cyclePaths),
		path_count: Math.max(0, cyclePaths.length - 1),
		paths: cyclePaths,
		edges: importCycleEdges(cyclePaths, edgeIndex),
	}));
	const issues = [...graph.issues];
	const findings: ImportCycleFinding[] = graph.findings.map(normalizeGraphFinding);

	for (const cycle of cycles) {
		const [firstPath] = cycle.paths;
		findings.push(
			makeFinding(
				'import_cycle_detected',
				'high',
				firstPath ?? '.',
				`Import cycle detected: ${cycle.paths.join(' -> ')}`,
				cycle.cycle_id,
			),
		);
	}

	if (graph.cycles.length > cycles.length) {
		const message = `Import cycle scan found more than ${policy.max_cycles} cycles; remaining cycles were skipped.`;
		pushIssue(issues, message);
		findings.push(makeFinding('import_cycle_max_cycles_exceeded', 'medium', '.', message));
	}

	const status = importCycleStatus(graph.status, cycles, findings);
	const truncated = graph.truncated || graph.cycles.length > cycles.length;

	return {
		schema_version: '1',
		command: 'script-pack',
		pack_id: IMPORT_CYCLE_PACK_ID,
		script_id: IMPORT_CYCLE_SCRIPT_ID,
		script_ref: IMPORT_CYCLE_SCRIPT_REF,
		action: 'check',
		status,
		ok: status === 'passed',
		mustflow_root: root,
		policy,
		input_hash: createInputHash(policy, graph, cycles, findings, issues),
		targets: graph.targets,
		graph: {
			script_ref: DEPENDENCY_GRAPH_SCRIPT_REF,
			status: graph.status,
			node_count: graph.nodes.length,
			edge_count: graph.edges.length,
			cycle_hint_count: graph.cycles.length,
			truncated: graph.truncated,
		},
		cycles,
		truncated,
		findings,
		issues,
	};
}
