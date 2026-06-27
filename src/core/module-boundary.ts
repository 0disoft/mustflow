import { createHash } from 'node:crypto';
import { existsSync, lstatSync, readdirSync } from 'node:fs';
import path from 'node:path';

import {
	DEPENDENCY_GRAPH_SCRIPT_REF,
	inspectDependencyGraph,
	type DependencyGraphEdge,
	type DependencyGraphFinding,
	type DependencyGraphPolicy,
	type DependencyGraphReport,
	type DependencyGraphTarget,
} from './dependency-graph.js';
import { DEFAULT_IGNORED_DIRECTORIES, isIgnoredDirectoryPath } from './ignored-directories.js';
import { ensureInside, ensureInsideWithoutSymlinks, readFileInsideWithoutSymlinks } from './safe-filesystem.js';
import type {
	ScriptCheckFinding,
	ScriptCheckFindingSeverity,
	ScriptCheckStatus,
} from './script-check-result.js';
import { parseTomlText } from './toml.js';

export const MODULE_BOUNDARY_PACK_ID = 'code';
export const MODULE_BOUNDARY_SCRIPT_ID = 'module-boundary';
export const MODULE_BOUNDARY_SCRIPT_REF = `${MODULE_BOUNDARY_PACK_ID}/${MODULE_BOUNDARY_SCRIPT_ID}`;

export type ModuleBoundaryConfigStatus = 'found' | 'missing' | 'invalid';
export type ModuleBoundaryRuleKind =
	| 'layer_deny'
	| 'public_entrypoint'
	| 'feature_direct_import'
	| 'shared_budget'
	| 'import_cycle';

export type ModuleBoundaryFindingCode =
	| DependencyGraphFinding['code']
	| 'module_boundary_config_missing'
	| 'module_boundary_invalid_config'
	| 'module_boundary_forbidden_import'
	| 'module_boundary_public_entry_violation'
	| 'module_boundary_feature_direct_import'
	| 'module_boundary_shared_budget_exceeded'
	| 'module_boundary_import_cycle_detected';

export interface ModuleBoundaryPolicy extends DependencyGraphPolicy {
	readonly config_path: string;
	readonly max_cycles: number;
	readonly max_shared_files: number;
}

export interface ModuleBoundaryConfigSummary {
	readonly path: string;
	readonly status: ModuleBoundaryConfigStatus;
	readonly layer_rule_count: number;
	readonly public_entrypoint_rule_count: number;
	readonly feature_group_rule_count: number;
	readonly shared_budget_rule_count: number;
}

export interface ModuleBoundaryGraphSummary {
	readonly script_ref: typeof DEPENDENCY_GRAPH_SCRIPT_REF;
	readonly status: ScriptCheckStatus;
	readonly node_count: number;
	readonly edge_count: number;
	readonly cycle_hint_count: number;
	readonly truncated: boolean;
}

export interface ModuleBoundaryEdgeEvidence {
	readonly source_path: string;
	readonly target_path: string;
	readonly specifier: string;
	readonly line: number;
	readonly kind: DependencyGraphEdge['kind'];
}

export interface ModuleBoundaryCycle {
	readonly cycle_id: string;
	readonly path_count: number;
	readonly paths: readonly string[];
}

export interface ModuleBoundarySharedMetric {
	readonly rule_id: string;
	readonly path: string;
	readonly file_count: number;
	readonly export_count: number;
	readonly max_files: number | null;
	readonly max_exports: number | null;
}

export interface ModuleBoundaryRuleSummary {
	readonly rule_id: string;
	readonly kind: ModuleBoundaryRuleKind;
	readonly finding_count: number;
}

export interface ModuleBoundaryFinding extends ScriptCheckFinding {
	readonly code: ModuleBoundaryFindingCode;
	readonly path: string;
	readonly rule_id?: string;
	readonly source_path?: string;
	readonly target_path?: string;
	readonly line?: number;
	readonly cycle_id?: string;
}

export interface ModuleBoundaryReport {
	readonly schema_version: '1';
	readonly command: 'script-pack';
	readonly pack_id: typeof MODULE_BOUNDARY_PACK_ID;
	readonly script_id: typeof MODULE_BOUNDARY_SCRIPT_ID;
	readonly script_ref: typeof MODULE_BOUNDARY_SCRIPT_REF;
	readonly action: 'check';
	readonly status: ScriptCheckStatus;
	readonly ok: boolean;
	readonly mustflow_root: string;
	readonly policy: ModuleBoundaryPolicy;
	readonly input_hash: string;
	readonly config: ModuleBoundaryConfigSummary;
	readonly targets: readonly DependencyGraphTarget[];
	readonly graph: ModuleBoundaryGraphSummary;
	readonly rules: readonly ModuleBoundaryRuleSummary[];
	readonly cycles: readonly ModuleBoundaryCycle[];
	readonly shared_metrics: readonly ModuleBoundarySharedMetric[];
	readonly truncated: boolean;
	readonly findings: readonly ModuleBoundaryFinding[];
	readonly issues: readonly string[];
}

export interface InspectModuleBoundaryOptions {
	readonly paths: readonly string[];
	readonly configPath?: string;
	readonly maxFileBytes?: number;
	readonly maxFiles?: number;
	readonly maxDepth?: number;
	readonly maxNodes?: number;
	readonly maxEdges?: number;
	readonly maxCycles?: number;
	readonly maxSharedFiles?: number;
}

interface LayerRule {
	readonly id: string;
	readonly paths: readonly string[];
	readonly denyImports: readonly string[];
}

interface PublicEntrypointRule {
	readonly id: string;
	readonly root: string;
	readonly entrypoint: string;
}

interface FeatureGroupRule {
	readonly id: string;
	readonly root: string;
	readonly allowEntrypointImports: boolean;
	readonly entrypointNames: readonly string[];
}

interface SharedBudgetRule {
	readonly id: string;
	readonly path: string;
	readonly maxFiles: number | null;
	readonly maxExports: number | null;
}

interface ModuleBoundaryConfig {
	readonly path: string;
	readonly status: ModuleBoundaryConfigStatus;
	readonly layers: readonly LayerRule[];
	readonly publicEntrypoints: readonly PublicEntrypointRule[];
	readonly featureGroups: readonly FeatureGroupRule[];
	readonly sharedBudgets: readonly SharedBudgetRule[];
	readonly findings: readonly ModuleBoundaryFinding[];
	readonly issues: readonly string[];
}

interface SourceFileCandidate {
	readonly absolutePath: string;
	readonly relativePath: string;
}

const DEFAULT_CONFIG_PATH = '.mustflow/config/module-boundaries.toml';
const DEFAULT_MAX_DEPTH = 20;
const DEFAULT_MAX_CYCLES = 50;
const DEFAULT_MAX_SHARED_FILES = 1000;
const MAX_ISSUES = 50;
const SOURCE_EXTENSIONS = new Set(['.ts', '.tsx', '.mts', '.cts', '.js', '.jsx', '.mjs', '.cjs']);
const DEFAULT_ENTRYPOINT_NAMES = ['index.ts', 'index.tsx', 'index.js', 'index.jsx', 'index.mts', 'index.mjs', 'index.cjs', 'index.cts'];
const ERROR_CODES = new Set<ModuleBoundaryFindingCode>([
	'dependency_graph_path_outside_root',
	'dependency_graph_unreadable_path',
	'module_boundary_invalid_config',
]);
const NON_BLOCKING_CODES = new Set<ModuleBoundaryFindingCode>(['module_boundary_config_missing']);

function toPosixPath(value: string): string {
	return value.replace(/\\/gu, '/');
}

function normalizeRelativePath(value: string): string {
	return toPosixPath(value).replace(/^\.\/+/u, '').replace(/\/+/gu, '/') || '.';
}

function sha256Tagged(value: string): string {
	return `sha256:${createHash('sha256').update(value).digest('hex')}`;
}

function pushIssue(issues: string[], issue: string): void {
	if (issues.length < MAX_ISSUES) {
		issues.push(issue);
	}
}

function makeFinding(
	code: ModuleBoundaryFindingCode,
	severity: ScriptCheckFindingSeverity,
	pathValue: string,
	message: string,
	extras: Omit<ModuleBoundaryFinding, 'code' | 'severity' | 'path' | 'message'> = {},
): ModuleBoundaryFinding {
	return { code, severity, path: pathValue, message, ...extras };
}

function normalizeGraphFinding(finding: DependencyGraphFinding): ModuleBoundaryFinding {
	return {
		code: finding.code,
		severity: finding.severity,
		path: finding.path,
		message: finding.message,
	};
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function asRecordArray(value: unknown): readonly Record<string, unknown>[] {
	if (!Array.isArray(value)) {
		return [];
	}
	return value.filter(isRecord);
}

function asStringArray(value: unknown): readonly string[] {
	if (!Array.isArray(value)) {
		return [];
	}
	return value.filter((entry): entry is string => typeof entry === 'string').map(normalizeRelativePath);
}

function stringField(record: Record<string, unknown>, field: string): string | null {
	const value = record[field];
	return typeof value === 'string' && value.trim().length > 0 ? normalizeRelativePath(value) : null;
}

function booleanField(record: Record<string, unknown>, field: string, fallback: boolean): boolean {
	return typeof record[field] === 'boolean' ? record[field] : fallback;
}

function integerField(record: Record<string, unknown>, field: string): number | null {
	const value = record[field];
	return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0 ? value : null;
}

function ruleId(record: Record<string, unknown>, fallback: string): string {
	const value = record.id;
	return typeof value === 'string' && value.trim().length > 0 ? value : fallback;
}

function parseLayerRules(raw: unknown): readonly LayerRule[] {
	return asRecordArray(raw)
		.map((entry, index): LayerRule | null => {
			const paths = asStringArray(entry.paths);
			const denyImports = asStringArray(entry.deny_imports ?? entry.denyImports);
			if (paths.length === 0 || denyImports.length === 0) {
				return null;
			}
			return { id: ruleId(entry, `layer:${index + 1}`), paths, denyImports };
		})
		.filter((entry): entry is LayerRule => entry !== null);
}

function parsePublicEntrypointRules(raw: unknown): readonly PublicEntrypointRule[] {
	return asRecordArray(raw)
		.map((entry, index): PublicEntrypointRule | null => {
			const root = stringField(entry, 'root');
			const entrypoint = stringField(entry, 'entrypoint') ?? stringField(entry, 'entry');
			if (!root || !entrypoint) {
				return null;
			}
			return { id: ruleId(entry, `public_entrypoint:${index + 1}`), root, entrypoint };
		})
		.filter((entry): entry is PublicEntrypointRule => entry !== null);
}

function parseFeatureGroupRules(raw: unknown): readonly FeatureGroupRule[] {
	return asRecordArray(raw)
		.map((entry, index): FeatureGroupRule | null => {
			const root = stringField(entry, 'root');
			if (!root) {
				return null;
			}
			const entrypointNames = asStringArray(entry.entrypoint_names ?? entry.entrypointNames);
			return {
				id: ruleId(entry, `feature_group:${index + 1}`),
				root,
				allowEntrypointImports: booleanField(entry, 'allow_entrypoint_imports', true),
				entrypointNames: entrypointNames.length > 0 ? entrypointNames : DEFAULT_ENTRYPOINT_NAMES,
			};
		})
		.filter((entry): entry is FeatureGroupRule => entry !== null);
}

function parseSharedBudgetRules(raw: unknown): readonly SharedBudgetRule[] {
	return asRecordArray(raw)
		.map((entry, index): SharedBudgetRule | null => {
			const sharedPath = stringField(entry, 'path');
			if (!sharedPath) {
				return null;
			}
			return {
				id: ruleId(entry, `shared_budget:${index + 1}`),
				path: sharedPath,
				maxFiles: integerField(entry, 'max_files'),
				maxExports: integerField(entry, 'max_exports'),
			};
		})
		.filter((entry): entry is SharedBudgetRule => entry !== null);
}

function readModuleBoundaryConfig(projectRoot: string, configPath: string): ModuleBoundaryConfig {
	const relativeConfigPath = normalizeRelativePath(configPath);
	const absoluteConfigPath = path.resolve(projectRoot, relativeConfigPath);
	const findings: ModuleBoundaryFinding[] = [];
	const issues: string[] = [];

	try {
		ensureInside(projectRoot, absoluteConfigPath);
		ensureInsideWithoutSymlinks(projectRoot, absoluteConfigPath, { allowMissingLeaf: true });
	} catch (error) {
		const message = error instanceof Error ? error.message : String(error);
		return {
			path: relativeConfigPath,
			status: 'invalid',
			layers: [],
			publicEntrypoints: [],
			featureGroups: [],
			sharedBudgets: [],
			findings: [makeFinding('module_boundary_invalid_config', 'high', relativeConfigPath, message)],
			issues: [message],
		};
	}

	if (!existsSync(absoluteConfigPath)) {
		const message = `Module boundary config not found at ${relativeConfigPath}; no boundary rules were enforced.`;
		return {
			path: relativeConfigPath,
			status: 'missing',
			layers: [],
			publicEntrypoints: [],
			featureGroups: [],
			sharedBudgets: [],
			findings: [makeFinding('module_boundary_config_missing', 'low', relativeConfigPath, message)],
			issues: [message],
		};
	}

	let parsed: unknown;
	try {
		const content = readFileInsideWithoutSymlinks(projectRoot, absoluteConfigPath, { maxBytes: 256 * 1024 }).toString('utf8');
		parsed = parseTomlText(content);
	} catch (error) {
		const message = error instanceof Error ? error.message : String(error);
		return {
			path: relativeConfigPath,
			status: 'invalid',
			layers: [],
			publicEntrypoints: [],
			featureGroups: [],
			sharedBudgets: [],
			findings: [makeFinding('module_boundary_invalid_config', 'high', relativeConfigPath, message)],
			issues: [message],
		};
	}

	if (!isRecord(parsed)) {
		const message = 'Module boundary config must be a TOML table.';
		return {
			path: relativeConfigPath,
			status: 'invalid',
			layers: [],
			publicEntrypoints: [],
			featureGroups: [],
			sharedBudgets: [],
			findings: [makeFinding('module_boundary_invalid_config', 'high', relativeConfigPath, message)],
			issues: [message],
		};
	}

	const layers = parseLayerRules(parsed.layers);
	const publicEntrypoints = parsePublicEntrypointRules(parsed.public_entrypoints ?? parsed.publicEntrypoints);
	const featureGroups = parseFeatureGroupRules(parsed.feature_groups ?? parsed.featureGroups);
	const sharedBudgets = parseSharedBudgetRules(parsed.shared_budgets ?? parsed.sharedBudgets);

	if (layers.length + publicEntrypoints.length + featureGroups.length + sharedBudgets.length === 0) {
		pushIssue(issues, `Module boundary config ${relativeConfigPath} contains no usable rules.`);
	}

	return {
		path: relativeConfigPath,
		status: 'found',
		layers,
		publicEntrypoints,
		featureGroups,
		sharedBudgets,
		findings,
		issues,
	};
}

function patternToRegExp(pattern: string): RegExp {
	const normalized = normalizeRelativePath(pattern);
	const escaped = normalized.replace(/[.+?^${}()|[\]\\]/gu, '\\$&').replace(/\*\*/gu, '\u0000').replace(/\*/gu, '[^/]*');
	return new RegExp(`^${escaped.replace(/\u0000/gu, '.*')}$`, 'u');
}

function matchesPathPattern(pattern: string, relativePath: string): boolean {
	const normalizedPattern = normalizeRelativePath(pattern);
	const normalizedPath = normalizeRelativePath(relativePath);
	if (normalizedPattern.endsWith('/**')) {
		const prefix = normalizedPattern.slice(0, -3);
		return normalizedPath === prefix || normalizedPath.startsWith(`${prefix}/`);
	}
	if (normalizedPattern.includes('*')) {
		return patternToRegExp(normalizedPattern).test(normalizedPath);
	}
	return normalizedPath === normalizedPattern;
}

function isInsidePath(root: string, candidate: string): boolean {
	const normalizedRoot = normalizeRelativePath(root);
	const normalizedCandidate = normalizeRelativePath(candidate);
	return normalizedCandidate === normalizedRoot || normalizedCandidate.startsWith(`${normalizedRoot}/`);
}

function featureSegment(root: string, candidate: string): string | null {
	if (!isInsidePath(root, candidate)) {
		return null;
	}
	const rootPrefix = normalizeRelativePath(root);
	const rest = normalizeRelativePath(candidate).slice(rootPrefix.length).replace(/^\//u, '');
	const [segment] = rest.split('/');
	return segment && segment.length > 0 ? segment : null;
}

function isFeatureEntrypoint(rule: FeatureGroupRule, targetPath: string): boolean {
	const normalized = normalizeRelativePath(targetPath);
	return rule.entrypointNames.some((entrypointName) => normalized.endsWith(`/${normalizeRelativePath(entrypointName)}`));
}

function addEdgeFinding(
	findings: ModuleBoundaryFinding[],
	code: ModuleBoundaryFindingCode,
	severity: ScriptCheckFindingSeverity,
	ruleIdValue: string,
	edge: DependencyGraphEdge,
	message: string,
): void {
	findings.push(
		makeFinding(code, severity, edge.source_path, message, {
			rule_id: ruleIdValue,
			source_path: edge.source_path,
			target_path: edge.target_path,
			line: edge.line,
		}),
	);
}

function checkLayerRules(config: ModuleBoundaryConfig, edges: readonly DependencyGraphEdge[]): readonly ModuleBoundaryFinding[] {
	const findings: ModuleBoundaryFinding[] = [];
	for (const rule of config.layers) {
		for (const edge of edges) {
			if (!rule.paths.some((pattern) => matchesPathPattern(pattern, edge.source_path))) {
				continue;
			}
			if (!rule.denyImports.some((pattern) => matchesPathPattern(pattern, edge.target_path))) {
				continue;
			}
			addEdgeFinding(
				findings,
				'module_boundary_forbidden_import',
				'high',
				rule.id,
				edge,
				`${edge.source_path} imports forbidden boundary ${edge.target_path} by rule ${rule.id}.`,
			);
		}
	}
	return findings;
}

function checkPublicEntrypointRules(
	config: ModuleBoundaryConfig,
	edges: readonly DependencyGraphEdge[],
): readonly ModuleBoundaryFinding[] {
	const findings: ModuleBoundaryFinding[] = [];
	for (const rule of config.publicEntrypoints) {
		for (const edge of edges) {
			if (!isInsidePath(rule.root, edge.target_path) || edge.target_path === normalizeRelativePath(rule.entrypoint)) {
				continue;
			}
			if (isInsidePath(rule.root, edge.source_path)) {
				continue;
			}
			addEdgeFinding(
				findings,
				'module_boundary_public_entry_violation',
				'high',
				rule.id,
				edge,
				`${edge.source_path} imports ${edge.target_path} instead of public entrypoint ${rule.entrypoint}.`,
			);
		}
	}
	return findings;
}

function checkFeatureGroupRules(config: ModuleBoundaryConfig, edges: readonly DependencyGraphEdge[]): readonly ModuleBoundaryFinding[] {
	const findings: ModuleBoundaryFinding[] = [];
	for (const rule of config.featureGroups) {
		for (const edge of edges) {
			const sourceFeature = featureSegment(rule.root, edge.source_path);
			const targetFeature = featureSegment(rule.root, edge.target_path);
			if (!sourceFeature || !targetFeature || sourceFeature === targetFeature) {
				continue;
			}
			if (rule.allowEntrypointImports && isFeatureEntrypoint(rule, edge.target_path)) {
				continue;
			}
			addEdgeFinding(
				findings,
				'module_boundary_feature_direct_import',
				'medium',
				rule.id,
				edge,
				`${edge.source_path} imports another feature internals at ${edge.target_path} by rule ${rule.id}.`,
			);
		}
	}
	return findings;
}

function isSourceFile(relativePath: string): boolean {
	const extension = path.extname(relativePath).toLowerCase();
	return SOURCE_EXTENSIONS.has(extension) && !relativePath.endsWith('.d.ts');
}

function isIgnored(relativePath: string): boolean {
	return isIgnoredDirectoryPath(normalizeRelativePath(relativePath), DEFAULT_IGNORED_DIRECTORIES);
}

function collectSourceFiles(projectRoot: string, absoluteDirectory: string, maxFiles: number, issues: string[]): readonly SourceFileCandidate[] {
	const candidates: SourceFileCandidate[] = [];
	const visit = (directoryPath: string): void => {
		if (candidates.length >= maxFiles) {
			return;
		}
		const relativeDirectory = normalizeRelativePath(path.relative(projectRoot, directoryPath));
		if (isIgnored(relativeDirectory)) {
			return;
		}
		let entries;
		try {
			ensureInsideWithoutSymlinks(projectRoot, directoryPath);
			entries = readdirSync(directoryPath, { withFileTypes: true });
		} catch (error) {
			pushIssue(issues, `${relativeDirectory}: ${error instanceof Error ? error.message : String(error)}`);
			return;
		}
		for (const entry of entries) {
			if (candidates.length >= maxFiles) {
				return;
			}
			const absoluteEntryPath = path.join(directoryPath, entry.name);
			const relativeEntryPath = normalizeRelativePath(path.relative(projectRoot, absoluteEntryPath));
			if (entry.isDirectory()) {
				visit(absoluteEntryPath);
				continue;
			}
			if (entry.isFile() && isSourceFile(relativeEntryPath)) {
				candidates.push({ absolutePath: absoluteEntryPath, relativePath: relativeEntryPath });
			}
		}
	};
	visit(absoluteDirectory);
	return candidates;
}

function countExports(projectRoot: string, file: SourceFileCandidate, maxFileBytes: number, issues: string[]): number {
	try {
		const text = readFileInsideWithoutSymlinks(projectRoot, file.absolutePath, { maxBytes: maxFileBytes }).toString('utf8');
		return [...text.matchAll(/\bexport\s+(?:type\s+)?(?:\{|\*|default|class|function|const|let|var|interface|type|enum)\b/gu)].length;
	} catch (error) {
		pushIssue(issues, `${file.relativePath}: ${error instanceof Error ? error.message : String(error)}`);
		return 0;
	}
}

function checkSharedBudgets(
	projectRoot: string,
	config: ModuleBoundaryConfig,
	policy: ModuleBoundaryPolicy,
	issues: string[],
): { readonly metrics: readonly ModuleBoundarySharedMetric[]; readonly findings: readonly ModuleBoundaryFinding[] } {
	const metrics: ModuleBoundarySharedMetric[] = [];
	const findings: ModuleBoundaryFinding[] = [];

	for (const rule of config.sharedBudgets) {
		const absoluteSharedPath = path.resolve(projectRoot, rule.path);
		let files: readonly SourceFileCandidate[] = [];
		try {
			ensureInside(projectRoot, absoluteSharedPath);
			if (existsSync(absoluteSharedPath) && lstatSync(absoluteSharedPath).isDirectory()) {
				files = collectSourceFiles(projectRoot, absoluteSharedPath, policy.max_shared_files, issues);
			}
		} catch (error) {
			pushIssue(issues, `${rule.path}: ${error instanceof Error ? error.message : String(error)}`);
		}

		const exportCount = files.reduce((count, file) => count + countExports(projectRoot, file, policy.max_file_bytes, issues), 0);
		const metric: ModuleBoundarySharedMetric = {
			rule_id: rule.id,
			path: rule.path,
			file_count: files.length,
			export_count: exportCount,
			max_files: rule.maxFiles,
			max_exports: rule.maxExports,
		};
		metrics.push(metric);

		const fileExceeded = rule.maxFiles !== null && files.length > rule.maxFiles;
		const exportExceeded = rule.maxExports !== null && exportCount > rule.maxExports;
		if (fileExceeded || exportExceeded) {
			const parts = [
				fileExceeded ? `${files.length} files exceeds max_files ${rule.maxFiles}` : null,
				exportExceeded ? `${exportCount} exports exceeds max_exports ${rule.maxExports}` : null,
			].filter((entry): entry is string => entry !== null);
			findings.push(
				makeFinding(
					'module_boundary_shared_budget_exceeded',
					'medium',
					rule.path,
					`Shared budget exceeded for ${rule.path}: ${parts.join('; ')}.`,
					{ rule_id: rule.id },
				),
			);
		}
	}

	return { metrics, findings };
}

function cycleId(paths: readonly string[]): string {
	return `cycle:${createHash('sha256').update(paths.join('\0')).digest('hex').slice(0, 12)}`;
}

function cycleFindings(
	graph: DependencyGraphReport,
	maxCycles: number,
): { readonly cycles: readonly ModuleBoundaryCycle[]; readonly findings: readonly ModuleBoundaryFinding[] } {
	const cycles = graph.cycles.slice(0, maxCycles).map((cyclePaths) => ({
		cycle_id: cycleId(cyclePaths),
		path_count: Math.max(0, cyclePaths.length - 1),
		paths: cyclePaths,
	}));
	const findings = cycles.map((cycle) =>
		makeFinding(
			'module_boundary_import_cycle_detected',
			'high',
			cycle.paths[0] ?? '.',
			`Import cycle detected: ${cycle.paths.join(' -> ')}`,
			{ cycle_id: cycle.cycle_id },
		),
	);
	return { cycles, findings };
}

function ruleSummaries(
	config: ModuleBoundaryConfig,
	findings: readonly ModuleBoundaryFinding[],
	cycles: readonly ModuleBoundaryCycle[],
): readonly ModuleBoundaryRuleSummary[] {
	const rules: ModuleBoundaryRuleSummary[] = [];
	const countFor = (ruleIdValue: string): number => findings.filter((finding) => finding.rule_id === ruleIdValue).length;
	for (const rule of config.layers) {
		rules.push({ rule_id: rule.id, kind: 'layer_deny', finding_count: countFor(rule.id) });
	}
	for (const rule of config.publicEntrypoints) {
		rules.push({ rule_id: rule.id, kind: 'public_entrypoint', finding_count: countFor(rule.id) });
	}
	for (const rule of config.featureGroups) {
		rules.push({ rule_id: rule.id, kind: 'feature_direct_import', finding_count: countFor(rule.id) });
	}
	for (const rule of config.sharedBudgets) {
		rules.push({ rule_id: rule.id, kind: 'shared_budget', finding_count: countFor(rule.id) });
	}
	rules.push({ rule_id: 'import-cycle', kind: 'import_cycle', finding_count: cycles.length });
	return rules;
}

function moduleBoundaryStatus(findings: readonly ModuleBoundaryFinding[]): ScriptCheckStatus {
	if (findings.some((finding) => ERROR_CODES.has(finding.code))) {
		return 'error';
	}
	return findings.some((finding) => !NON_BLOCKING_CODES.has(finding.code)) ? 'failed' : 'passed';
}

function createInputHash(
	policy: ModuleBoundaryPolicy,
	config: ModuleBoundaryConfigSummary,
	graph: DependencyGraphReport,
	rules: readonly ModuleBoundaryRuleSummary[],
	cycles: readonly ModuleBoundaryCycle[],
	sharedMetrics: readonly ModuleBoundarySharedMetric[],
	findings: readonly ModuleBoundaryFinding[],
	issues: readonly string[],
): string {
	return sha256Tagged(
		JSON.stringify({
			policy,
			config,
			graph_input_hash: graph.input_hash,
			rules,
			cycles: cycles.map((cycle) => ({ cycle_id: cycle.cycle_id, paths: cycle.paths })),
			sharedMetrics,
			findings: findings.map((finding) => ({
				code: finding.code,
				path: finding.path,
				rule_id: finding.rule_id,
				cycle_id: finding.cycle_id,
			})),
			issues,
		}),
	);
}

export function inspectModuleBoundaries(
	projectRoot: string,
	options: InspectModuleBoundaryOptions,
): ModuleBoundaryReport {
	const root = path.resolve(projectRoot);
	const configPath = normalizeRelativePath(options.configPath ?? DEFAULT_CONFIG_PATH);
	const graph = inspectDependencyGraph(root, {
		paths: options.paths,
		maxFiles: options.maxFiles,
		maxFileBytes: options.maxFileBytes,
		maxDepth: options.maxDepth ?? DEFAULT_MAX_DEPTH,
		maxNodes: options.maxNodes,
		maxEdges: options.maxEdges,
	});
	const policy: ModuleBoundaryPolicy = {
		...graph.policy,
		config_path: configPath,
		max_cycles: options.maxCycles ?? DEFAULT_MAX_CYCLES,
		max_shared_files: options.maxSharedFiles ?? DEFAULT_MAX_SHARED_FILES,
	};
	const config = readModuleBoundaryConfig(root, configPath);
	const issues = [...graph.issues, ...config.issues];
	const boundaryFindings = [
		...graph.findings.map(normalizeGraphFinding),
		...config.findings,
		...checkLayerRules(config, graph.edges),
		...checkPublicEntrypointRules(config, graph.edges),
		...checkFeatureGroupRules(config, graph.edges),
	];
	const shared = checkSharedBudgets(root, config, policy, issues);
	const cycles = cycleFindings(graph, policy.max_cycles);
	const findings = [...boundaryFindings, ...shared.findings, ...cycles.findings];
	const configSummary: ModuleBoundaryConfigSummary = {
		path: config.path,
		status: config.status,
		layer_rule_count: config.layers.length,
		public_entrypoint_rule_count: config.publicEntrypoints.length,
		feature_group_rule_count: config.featureGroups.length,
		shared_budget_rule_count: config.sharedBudgets.length,
	};
	const rules = ruleSummaries(config, findings, cycles.cycles);
	const status = moduleBoundaryStatus(findings);
	const truncated = graph.truncated || graph.cycles.length > cycles.cycles.length;

	return {
		schema_version: '1',
		command: 'script-pack',
		pack_id: MODULE_BOUNDARY_PACK_ID,
		script_id: MODULE_BOUNDARY_SCRIPT_ID,
		script_ref: MODULE_BOUNDARY_SCRIPT_REF,
		action: 'check',
		status,
		ok: status === 'passed',
		mustflow_root: root,
		policy,
		input_hash: createInputHash(policy, configSummary, graph, rules, cycles.cycles, shared.metrics, findings, issues),
		config: configSummary,
		targets: graph.targets,
		graph: {
			script_ref: DEPENDENCY_GRAPH_SCRIPT_REF,
			status: graph.status,
			node_count: graph.nodes.length,
			edge_count: graph.edges.length,
			cycle_hint_count: graph.cycles.length,
			truncated: graph.truncated,
		},
		rules,
		cycles: cycles.cycles,
		shared_metrics: shared.metrics,
		truncated,
		findings,
		issues,
	};
}
