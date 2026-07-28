import { createHash } from 'node:crypto';
import { existsSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';

import { isRecord, readMustflowOwnedTomlFile, type TomlTable } from './config-loading.js';
import { readUtf8FileInsideWithoutSymlinks, writeUtf8FileInsideWithoutSymlinks } from './safe-filesystem.js';
import { type SkillIndexRoute, type SkillRouteCategory } from './skill-route-alignment.js';

const MUSTFLOW_TEXT_MAX_BYTES = 1024 * 1024;
const SKILL_INDEX_PATH = '.mustflow/skills/INDEX.md';
const SKILL_ROUTER_PATH = '.mustflow/skills/router.toml';
const SKILL_ROUTES_METADATA_PATH = '.mustflow/skills/routes.toml';
export const SKILL_ROUTE_CATALOG_PATH = '.mustflow/skills/catalog.v2.json';
const TEMPLATE_SKILL_ROUTE_CATALOG_PATH = 'templates/default/locales/en/.mustflow/skills/catalog.v2.json';
const BUILT_IN_SKILL_PATH_PATTERN = /^\.mustflow\/skills\/([a-z0-9]+(?:-[a-z0-9]+)*)\/SKILL\.md$/u;
const SKILL_FRONTMATTER_SOURCE = '.mustflow/skills/*/SKILL.md';
const EXTERNAL_SKILL_FRONTMATTER_SOURCE = '.mustflow/external-skills/*/SKILL.md';
const EXTERNAL_SKILL_PROVENANCE_FILE = 'mustflow-skill-source.json';
const DEFAULT_MAX_CANDIDATES = 5;
const DEFAULT_MAX_MAIN = 1;
const DEFAULT_MAX_ADJUNCTS = 2;
const PATH_SKILL_HINT_SCORE = 15;
const PATTERN_SIGNAL_TERM_SCORE = 20;
const PATTERN_SIGNAL_MAX_SCORE = 60;
const NEGATIVE_SIGNAL_TERM_PENALTY = -25;
const NEGATIVE_SIGNAL_MAX_PENALTY = -75;
const DOCS_TREE_MARKDOWN_PATH_PATTERN =
	/(?:^|\/)(?:docs|docs-site|documentation|\.mustflow\/docs|\.mustflow\/context)\/.+\.(?:md|mdx)$/u;
const ROOT_DOCUMENT_BASENAMES = [
	'readme',
	'changelog',
	'contributing',
	'security',
	'support',
	'governance',
	'maintainers',
	'releasing',
	'release',
	'testing',
	'deployment',
	'operations',
	'runbook',
	'configuration',
	'troubleshooting',
	'architecture',
	'api',
] as const;

export interface SkillRouteResolveInput {
	readonly taskText: string | null;
	readonly paths: readonly string[];
	readonly reasons: readonly string[];
	readonly maxCandidates?: number;
}

export type SkillRouteSelectionAxis = 'language' | 'task' | 'risk' | 'workflow';

export interface SkillRouterConfig {
	readonly selectionLimit: number;
	readonly mainLimit: number;
	readonly adjunctLimit: number;
	readonly axisLimits: Readonly<Record<SkillRouteSelectionAxis, number>>;
}

export interface SkillRouteSignalSummary {
	readonly task_terms: readonly string[];
	readonly path_terms: readonly string[];
	readonly reasons: readonly string[];
	readonly read_shards: readonly string[];
}

export interface SkillRouteScoreBreakdown {
	readonly reason_match: number;
	readonly task_text_match: number;
	readonly path_match: number;
	readonly pattern_signal_match: number;
	readonly negative_signal_penalty: number;
	readonly route_type_weight: number;
	readonly priority_weight: number;
}

export interface SkillRouteExcerptReference {
	readonly source_path: string;
	readonly section: 'use-when' | 'do-not-use-when';
	readonly read_when: readonly string[];
}

export interface SkillRouteUnlockRule {
	readonly signal: string;
	readonly skill: string;
}

export interface SkillRouteDependencies {
	readonly requires_skills: readonly string[];
	readonly suggests_adjuncts: readonly string[];
	readonly conflicts_with: readonly string[];
	readonly unlocks_on: readonly SkillRouteUnlockRule[];
}

export interface SkillRouteCard {
	readonly source: 'route_metadata_and_catalog' | 'route_metadata_and_skill_frontmatter';
	readonly index_read_policy: 'fallback_only';
	readonly compact_fields: readonly string[];
	readonly matched_dimensions: readonly string[];
	readonly route_dependencies: SkillRouteDependencies;
	readonly use_when_excerpt: SkillRouteExcerptReference;
	readonly do_not_use_excerpt: SkillRouteExcerptReference;
	readonly read_strategy: readonly string[];
}

export interface SkillRouteResolvedCandidate {
	readonly skill: string;
	readonly skill_path: string;
	readonly trigger: string;
	readonly category: SkillRouteCategory | null;
	readonly route_type: string;
	readonly selection_axis: SkillRouteSelectionAxis;
	readonly priority: number;
	readonly applies_to_reasons: readonly string[];
	readonly score: number;
	readonly score_breakdown: SkillRouteScoreBreakdown;
	readonly selection_reasons: readonly string[];
	readonly matched_dimensions: readonly string[];
	readonly route_card: SkillRouteCard;
	readonly verification_intents: readonly string[];
}

export interface SkillRouteSelectedSummary {
	readonly main: SkillRouteResolvedCandidate | null;
	readonly adjuncts: readonly SkillRouteResolvedCandidate[];
	readonly axes: Readonly<Record<SkillRouteSelectionAxis, readonly SkillRouteResolvedCandidate[]>>;
}

export interface SkillRouteReadPlanFile {
	readonly path: string;
	readonly read_when: readonly string[];
}

export interface SkillRouteReadPlan {
	readonly selection_limits: {
		readonly candidates: number;
		readonly main: number;
		readonly adjuncts: number;
	};
	readonly stable_kernel: readonly string[];
	readonly selected_skill_paths: readonly string[];
	readonly candidate_skill_paths: readonly string[];
	readonly fallback_route_metadata: SkillRouteReadPlanFile;
	readonly expanded_index: SkillRouteReadPlanFile;
	readonly avoid_by_default: readonly string[];
	readonly notes: readonly string[];
}

export interface SkillRouteResolveReport {
	readonly schema_version: '1';
	readonly kind: 'skill_route_resolution';
	readonly input: {
		readonly task_text_present: boolean;
		readonly paths: readonly string[];
		readonly reasons: readonly string[];
		readonly max_candidates: number;
	};
	readonly signals: SkillRouteSignalSummary;
	readonly selected: SkillRouteSelectedSummary;
	readonly candidates: readonly SkillRouteResolvedCandidate[];
	readonly read_plan: SkillRouteReadPlan;
	readonly source_files: readonly string[];
	readonly gap_notes: readonly string[];
}

interface SkillRouteMetadata {
	readonly category: SkillRouteCategory | null;
	readonly routeType: string;
	readonly selectionAxis: SkillRouteSelectionAxis;
	readonly priority: number;
	readonly appliesToReasons: readonly string[];
	readonly mutuallyExclusiveWith: readonly string[];
	readonly signalProfile: RouteSignalProfile;
	readonly dependencies: SkillRouteDependencies;
}

interface SkillFrontmatterSummary {
	readonly name: string | null;
	readonly description: string | null;
	readonly commandIntents: readonly string[];
}

interface SkillRouteCatalogEntry {
	readonly skill: string;
	readonly skill_path: string;
	readonly category: SkillRouteCategory | null;
	readonly route_type: string;
	readonly selection_axis: SkillRouteSelectionAxis;
	readonly priority: number;
	readonly applies_to_reasons: readonly string[];
	readonly mutually_exclusive_with: readonly string[];
	readonly positive_signals: readonly string[];
	readonly negative_signals: readonly string[];
	readonly dependencies: SkillRouteDependencies;
	readonly trigger: string;
	readonly command_intents: readonly string[];
}

export interface SkillRouteCatalog {
	readonly schema_version: '2';
	readonly kind: 'skill_route_catalog';
	readonly source_fingerprint: string;
	readonly entries: readonly SkillRouteCatalogEntry[];
}

interface RouteSignalProfile {
	readonly positiveSignals: readonly string[];
	readonly negativeSignals: readonly string[];
}

const EMPTY_ROUTE_DEPENDENCIES: SkillRouteDependencies = {
	requires_skills: [],
	suggests_adjuncts: [],
	conflicts_with: [],
	unlocks_on: [],
};

const ROUTE_TYPE_WEIGHTS: Readonly<Record<string, number>> = {
	primary: 4,
	authoring: 4,
	adjunct: 2,
	event: 1,
	external: 1,
};

const SKILL_ROUTE_SELECTION_AXES = new Set<SkillRouteSelectionAxis>(['language', 'task', 'risk', 'workflow']);
const SKILL_ROUTE_CATEGORIES = new Set<SkillRouteCategory>([
	'bug_failure',
	'general_code',
	'tests',
	'docs_release',
	'security_privacy',
	'data_external',
	'ui_assets',
	'architecture_patterns',
	'workflow_contracts',
]);
const SKILL_ROUTE_TYPES = new Set(['primary', 'adjunct', 'event', 'authoring']);

function readBoundedInteger(value: unknown, fallback: number, minimum: number, maximum: number): number {
	return Number.isInteger(value) ? Math.max(minimum, Math.min(Number(value), maximum)) : fallback;
}

export function readSkillRouterConfig(projectRoot: string): SkillRouterConfig {
	let router: TomlTable = {};
	try {
		const parsed = readMustflowOwnedTomlFile(projectRoot, SKILL_ROUTER_PATH);
		router = isRecord(parsed) ? parsed : {};
	} catch {
		// Defaults keep routing available when the compact router needs repair.
	}

	const axes = isRecord(router.selection_axes) ? router.selection_axes : {};

	return {
		selectionLimit: readBoundedInteger(router.selection_limit, DEFAULT_MAX_CANDIDATES, 1, 10),
		mainLimit: readBoundedInteger(router.main_limit, DEFAULT_MAX_MAIN, 1, 1),
		adjunctLimit: readBoundedInteger(router.adjunct_limit, DEFAULT_MAX_ADJUNCTS, 0, 4),
		axisLimits: {
			language: readBoundedInteger(axes.language, 1, 0, 2),
			task: readBoundedInteger(axes.task, 1, 0, 2),
			risk: readBoundedInteger(axes.risk, 1, 0, 2),
			workflow: readBoundedInteger(axes.workflow, 1, 0, 2),
		},
	};
}

function normalizeSkillPath(value: string): string {
	return value.replace(/\\/gu, '/');
}

function skillNameFromPath(skillPath: string): string {
	const match = /^\.mustflow\/skills\/([^/]+)\/SKILL\.md$/u.exec(skillPath);
	const externalMatch = /^\.mustflow\/external-skills\/([^/]+)\/SKILL\.md$/u.exec(skillPath);
	return match?.[1] ?? externalMatch?.[1] ?? skillPath;
}

function normalizeRouteText(value: string): string {
	return value
		.normalize('NFKC')
		.toLocaleLowerCase('en-US')
		.replace(/\.mustflow\/skills\/[^/\s]+\/skill\.md/giu, ' ')
		.replace(/[^\p{L}\p{N}]+/gu, ' ')
		.trim()
		.replace(/\s+/gu, ' ');
}

function tokenize(value: string): string[] {
	return [
		...new Set(
			normalizeRouteText(value)
				.split(/\s+/u)
				.map((token) => token.trim())
				.filter((token) => token.length >= 2),
		),
	].sort((left, right) => left.localeCompare(right));
}

function normalizeSignals(values: readonly string[]): string[] {
	return [...new Set(values.map(normalizeRouteText).filter(Boolean))].sort((left, right) =>
		left.localeCompare(right),
	);
}

function collectPathSkillHints(paths: readonly string[]): Set<string> {
	const hints = new Set<string>();

	for (const pathValue of paths) {
		const lower = pathValue.toLowerCase();

		if (/\.(?:cts|mts|ts|tsx)$/u.test(lower) || lower.endsWith('tsconfig.json')) {
			hints.add('typescript-code-change');
		}

		if (/\.(?:cjs|mjs|js|jsx)$/u.test(lower)) {
			hints.add('javascript-code-change');
		}

		if (/\.py$/u.test(lower) || /(?:^|\/)(?:pyproject\.toml|requirements\.txt|poetry\.lock)$/u.test(lower)) {
			hints.add('python-code-change');
		}

		if (/\.go$/u.test(lower) || /(?:^|\/)go\.(?:mod|sum)$/u.test(lower)) {
			hints.add('go-code-change');
		}

		if (/\.rs$/u.test(lower) || /(?:^|\/)(?:cargo\.toml|cargo\.lock)$/u.test(lower)) {
			hints.add('rust-code-change');
		}

		if (/\.ps1$/u.test(lower)) {
			hints.add('powershell-code-change');
		}

		if (DOCS_TREE_MARKDOWN_PATH_PATTERN.test(lower) || isRootDocumentationPath(lower)) {
			hints.add('docs-update');
		}
	}

	return hints;
}

function isRootDocumentationPath(lowercasePath: string): boolean {
	const basename = lowercasePath.split('/').pop();
	if (!basename?.endsWith('.md')) {
		return false;
	}

	const rootName = basename.replace(/\.md$/u, '');

	return ROOT_DOCUMENT_BASENAMES.includes(rootName as (typeof ROOT_DOCUMENT_BASENAMES)[number]);
}

function readStringArrayFromTable(table: TomlTable, key: string): string[] {
	const value = table[key];

	return Array.isArray(value) && value.every((entry) => typeof entry === 'string')
		? value.map((entry) => entry.trim()).filter(Boolean)
		: [];
}

function readRouteSignalProfile(route: TomlTable): RouteSignalProfile {
	const contexts = route.contexts;
	if (!isRecord(contexts)) {
		return {
			positiveSignals: [],
			negativeSignals: [],
		};
	}

	return {
		positiveSignals: normalizeSignals([
			...readStringArrayFromTable(contexts, 'positive_terms'),
			...readStringArrayFromTable(contexts, 'concept_aliases'),
		]),
		negativeSignals: normalizeSignals(readStringArrayFromTable(contexts, 'negative_terms')),
	};
}

function readRouteUnlockRules(table: TomlTable): SkillRouteUnlockRule[] {
	const value = table.unlocks_on;
	if (!Array.isArray(value)) {
		return [];
	}

	return value
		.filter(isRecord)
		.map((entry) => {
			return {
				signal: typeof entry.signal === 'string' ? entry.signal.trim() : '',
				skill: typeof entry.skill === 'string' ? entry.skill.trim() : '',
			};
		})
		.filter((entry) => entry.signal && entry.skill);
}

function readRouteDependencies(route: TomlTable): SkillRouteDependencies {
	const dependencies = route.dependencies;
	if (!isRecord(dependencies)) {
		return EMPTY_ROUTE_DEPENDENCIES;
	}

	return {
		requires_skills: readStringArrayFromTable(dependencies, 'requires_skills'),
		suggests_adjuncts: readStringArrayFromTable(dependencies, 'suggests_adjuncts'),
		conflicts_with: readStringArrayFromTable(dependencies, 'conflicts_with'),
		unlocks_on: readRouteUnlockRules(dependencies),
	};
}

function readFrontmatterBlock(content: string): string[] {
	if (!content.startsWith('---')) {
		return [];
	}

	const firstLineEnd = content.indexOf('\n');
	if (firstLineEnd < 0) {
		return [];
	}

	const end = content.indexOf('\n---', firstLineEnd + 1);
	if (end < 0) {
		return [];
	}

	return content.slice(firstLineEnd + 1, end).split(/\r?\n/u);
}

function readFrontmatterScalar(lines: readonly string[], key: string): string | null {
	for (const line of lines) {
		const match = /^([a-zA-Z0-9_]+):\s*(.*)$/u.exec(line);
		if (match?.[1] === key) {
			return match[2].trim().replace(/^["']|["']$/gu, '') || null;
		}
	}

	return null;
}

function readFrontmatterList(lines: readonly string[], key: string): string[] {
	const values: string[] = [];
	let inList = false;
	let baseIndent = 0;

	for (const line of lines) {
		const keyMatch = new RegExp(`^(\\s*)${key}:\\s*$`, 'u').exec(line);
		if (keyMatch) {
			inList = true;
			baseIndent = keyMatch[1].length;
			continue;
		}

		if (!inList) {
			continue;
		}

		const itemMatch = /^(\s*)-\s+(.+?)\s*$/u.exec(line);
		if (itemMatch && itemMatch[1].length > baseIndent) {
			values.push(itemMatch[2].trim().replace(/^["']|["']$/gu, ''));
			continue;
		}

		if (line.trim() && !line.startsWith(' '.repeat(baseIndent + 1))) {
			break;
		}
	}

	return values;
}

function readSkillFrontmatterSummary(content: string): SkillFrontmatterSummary {
	const lines = readFrontmatterBlock(content);

	return {
		name: readFrontmatterScalar(lines, 'name'),
		description: readFrontmatterScalar(lines, 'description'),
		commandIntents: readFrontmatterList(lines, 'command_intents'),
	};
}

function readSkillRouteMetadata(projectRoot: string): Map<string, SkillRouteMetadata> {
	const metadata = new Map<string, SkillRouteMetadata>();

	try {
		const parsed = readMustflowOwnedTomlFile(projectRoot, SKILL_ROUTES_METADATA_PATH);
		if (!isRecord(parsed) || !isRecord(parsed.routes)) {
			return metadata;
		}

		for (const [skillName, route] of Object.entries(parsed.routes)) {
			if (!isRecord(route)) {
				continue;
			}

			metadata.set(skillName, {
				category: typeof route.category === 'string' ? (route.category as SkillRouteCategory) : null,
				routeType: typeof route.route_type === 'string' ? route.route_type : 'unknown',
				selectionAxis: typeof route.selection_axis === 'string' &&
					SKILL_ROUTE_SELECTION_AXES.has(route.selection_axis as SkillRouteSelectionAxis)
					? (route.selection_axis as SkillRouteSelectionAxis)
					: 'task',
				priority: Number.isInteger(route.priority) ? Number(route.priority) : 0,
				appliesToReasons: readStringArrayFromTable(route, 'applies_to_reasons'),
				mutuallyExclusiveWith: readStringArrayFromTable(route, 'mutually_exclusive_with'),
				signalProfile: readRouteSignalProfile(route),
				dependencies: readRouteDependencies(route),
			});
		}
	} catch {
		return metadata;
	}

	return metadata;
}

function readSkillFrontmatterRoutes(projectRoot: string): SkillIndexRoute[] {
	const skillRoot = path.join(projectRoot, '.mustflow', 'skills');
	if (!existsSync(skillRoot)) {
		return [];
	}

	const routes: SkillIndexRoute[] = [];
	const skillDirectories = readdirSync(skillRoot, { withFileTypes: true })
		.filter((entry) => entry.isDirectory())
		.map((entry) => entry.name)
		.sort((left, right) => left.localeCompare(right));

	for (const skillDirectory of skillDirectories) {
		const skillPath = `.mustflow/skills/${skillDirectory}/SKILL.md`;
		const absoluteSkillPath = path.join(projectRoot, ...skillPath.split('/'));
		if (!existsSync(absoluteSkillPath)) {
			continue;
		}

		const content = readUtf8FileInsideWithoutSymlinks(projectRoot, absoluteSkillPath, {
			maxBytes: MUSTFLOW_TEXT_MAX_BYTES,
		});
		const summary = readSkillFrontmatterSummary(content);
		const skillName = summary.name ?? skillDirectory;

		routes.push({
			trigger: summary.description ?? skillName,
			skillPath,
			requiredInput: '',
			editScope: '',
			risk: '',
			commandIntents: summary.commandIntents,
			expectedOutput: '',
		});
	}

	return routes;
}

function createSkillRouteCatalog(
	routes: readonly SkillIndexRoute[],
	metadata: ReadonlyMap<string, SkillRouteMetadata>,
): SkillRouteCatalog {
	const entries = routes
		.map((route) => {
			const skill = skillNameFromPath(route.skillPath);
			const routeMetadata = metadata.get(skill);
			if (!routeMetadata) {
				throw new Error(`${SKILL_ROUTES_METADATA_PATH} is missing metadata for ${skill}`);
			}
			return {
				skill,
				skill_path: route.skillPath,
				category: routeMetadata.category,
				route_type: routeMetadata.routeType,
				selection_axis: routeMetadata.selectionAxis,
				priority: routeMetadata.priority,
				applies_to_reasons: [...routeMetadata.appliesToReasons],
				mutually_exclusive_with: [...routeMetadata.mutuallyExclusiveWith],
				positive_signals: [...routeMetadata.signalProfile.positiveSignals],
				negative_signals: [...routeMetadata.signalProfile.negativeSignals],
				dependencies: routeMetadata.dependencies,
				trigger: route.trigger,
				command_intents: [...route.commandIntents],
			};
		})
		.sort((left, right) => left.skill.localeCompare(right.skill));
	const fingerprintInput = JSON.stringify(entries);

	return {
		schema_version: '2',
		kind: 'skill_route_catalog',
		source_fingerprint: `sha256:${createHash('sha256').update(fingerprintInput).digest('hex')}`,
		entries,
	};
}

export function buildSkillRouteCatalog(projectRoot: string): SkillRouteCatalog {
	return createSkillRouteCatalog(readSkillFrontmatterRoutes(projectRoot), readSkillRouteMetadata(projectRoot));
}

export function serializeSkillRouteCatalog(catalog: SkillRouteCatalog): string {
	return `${JSON.stringify(catalog, null, 2)}\n`;
}

export function writeSkillRouteCatalogs(projectRoot: string): readonly string[] {
	const content = serializeSkillRouteCatalog(buildSkillRouteCatalog(projectRoot));
	const writtenPaths = [SKILL_ROUTE_CATALOG_PATH, TEMPLATE_SKILL_ROUTE_CATALOG_PATH];

	for (const relativePath of writtenPaths) {
		writeUtf8FileInsideWithoutSymlinks(projectRoot, path.join(projectRoot, ...relativePath.split('/')), content);
	}

	return writtenPaths;
}

function parseSkillRouteCatalog(content: string): SkillRouteCatalog | null {
	let parsed: unknown;
	try {
		parsed = JSON.parse(content);
	} catch {
		return null;
	}
	if (
		!isRecord(parsed) ||
		parsed.schema_version !== '2' ||
		parsed.kind !== 'skill_route_catalog' ||
		typeof parsed.source_fingerprint !== 'string' ||
		!Array.isArray(parsed.entries)
	) {
		return null;
	}

	const entries: SkillRouteCatalogEntry[] = [];
	const seenSkills = new Set<string>();
	const seenPaths = new Set<string>();
	let previousSkill = '';
	for (const entry of parsed.entries) {
		const skillPathMatch = isRecord(entry) && typeof entry.skill_path === 'string'
			? BUILT_IN_SKILL_PATH_PATTERN.exec(entry.skill_path)
			: null;
		if (
			!isRecord(entry) ||
			typeof entry.skill !== 'string' ||
			typeof entry.skill_path !== 'string' ||
			!skillPathMatch ||
			skillPathMatch[1] !== entry.skill ||
			(entry.category !== null &&
				(typeof entry.category !== 'string' || !SKILL_ROUTE_CATEGORIES.has(entry.category as SkillRouteCategory))) ||
			typeof entry.route_type !== 'string' ||
			!SKILL_ROUTE_TYPES.has(entry.route_type) ||
			typeof entry.selection_axis !== 'string' ||
			!SKILL_ROUTE_SELECTION_AXES.has(entry.selection_axis as SkillRouteSelectionAxis) ||
			!Number.isInteger(entry.priority) ||
			Number(entry.priority) <= 0 ||
			!isCatalogStringArray(entry.applies_to_reasons) ||
			!isCatalogStringArray(entry.mutually_exclusive_with) ||
			!isCatalogStringArray(entry.positive_signals) ||
			!isCatalogStringArray(entry.negative_signals) ||
			!isCatalogDependencies(entry.dependencies) ||
			typeof entry.trigger !== 'string' ||
			entry.trigger.trim().length === 0 ||
			!Array.isArray(entry.command_intents) ||
			!entry.command_intents.every((intent) => typeof intent === 'string' && intent.trim().length > 0) ||
			new Set(entry.command_intents).size !== entry.command_intents.length ||
			seenSkills.has(entry.skill) ||
			seenPaths.has(entry.skill_path) ||
			(previousSkill !== '' && previousSkill.localeCompare(entry.skill) >= 0)
		) {
			return null;
		}
		seenSkills.add(entry.skill);
		seenPaths.add(entry.skill_path);
		previousSkill = entry.skill;
		entries.push({
			skill: entry.skill,
			skill_path: entry.skill_path,
			category: entry.category as SkillRouteCategory | null,
			route_type: entry.route_type,
			selection_axis: entry.selection_axis as SkillRouteSelectionAxis,
			priority: Number(entry.priority),
			applies_to_reasons: entry.applies_to_reasons as string[],
			mutually_exclusive_with: entry.mutually_exclusive_with as string[],
			positive_signals: entry.positive_signals as string[],
			negative_signals: entry.negative_signals as string[],
			dependencies: entry.dependencies as unknown as SkillRouteDependencies,
			trigger: entry.trigger,
			command_intents: entry.command_intents,
		});
	}

	const catalog: SkillRouteCatalog = {
		schema_version: '2',
		kind: 'skill_route_catalog',
		source_fingerprint: `sha256:${createHash('sha256').update(JSON.stringify(entries)).digest('hex')}`,
		entries,
	};
	return catalog.source_fingerprint === parsed.source_fingerprint ? catalog : null;
}

interface InstalledSkillRouteCatalog {
	readonly routes: readonly SkillIndexRoute[];
	readonly metadata: ReadonlyMap<string, SkillRouteMetadata>;
}

interface SkillRouteCatalogCacheEntry {
	readonly signature: string;
	readonly catalog: SkillRouteCatalog | null;
}

const skillRouteCatalogCache = new Map<string, SkillRouteCatalogCacheEntry>();
let skillRouteCatalogCacheHits = 0;
let skillRouteCatalogCacheMisses = 0;

export function resetSkillRouteCatalogCache(): void {
	skillRouteCatalogCache.clear();
	skillRouteCatalogCacheHits = 0;
	skillRouteCatalogCacheMisses = 0;
}

export function readSkillRouteCatalogCacheStats(): { readonly hits: number; readonly misses: number } {
	return { hits: skillRouteCatalogCacheHits, misses: skillRouteCatalogCacheMisses };
}

function skillRouteCatalogFileSignature(absolutePath: string): string | null {
	try {
		const stats = statSync(absolutePath, { bigint: true });
		return `${stats.size}:${stats.mtimeNs}:${stats.ctimeNs}`;
	} catch {
		return null;
	}
}

function isCatalogStringArray(value: unknown): value is string[] {
	return Array.isArray(value) && value.every((entry) => typeof entry === 'string' && entry.trim().length > 0);
}

function isCatalogDependencies(value: unknown): boolean {
	if (!isRecord(value)) {
		return false;
	}
	return isCatalogStringArray(value.requires_skills) &&
		isCatalogStringArray(value.suggests_adjuncts) &&
		isCatalogStringArray(value.conflicts_with) &&
		Array.isArray(value.unlocks_on) &&
		value.unlocks_on.every((rule) =>
			isRecord(rule) && typeof rule.signal === 'string' && rule.signal.length > 0 &&
			typeof rule.skill === 'string' && rule.skill.length > 0);
}

function readSkillRouteCatalog(projectRoot: string): InstalledSkillRouteCatalog | null {
	const absolutePath = path.join(projectRoot, ...SKILL_ROUTE_CATALOG_PATH.split('/'));
	const signature = skillRouteCatalogFileSignature(absolutePath);
	if (signature === null) {
		skillRouteCatalogCache.delete(absolutePath);
		return null;
	}
	const cached = skillRouteCatalogCache.get(absolutePath);
	let catalog: SkillRouteCatalog | null;
	if (cached?.signature === signature) {
		skillRouteCatalogCacheHits += 1;
		catalog = cached.catalog;
	} else {
		skillRouteCatalogCacheMisses += 1;
		try {
			catalog = parseSkillRouteCatalog(
				readUtf8FileInsideWithoutSymlinks(projectRoot, absolutePath, { maxBytes: MUSTFLOW_TEXT_MAX_BYTES }),
			);
		} catch {
			catalog = null;
		}
		skillRouteCatalogCache.set(absolutePath, { signature, catalog });
	}
	if (!catalog) {
		return null;
	}

	const installedEntries = catalog.entries.filter((entry) =>
		existsSync(path.join(projectRoot, ...entry.skill_path.split('/'))));
	const routes = installedEntries.map((entry) => ({
		trigger: entry.trigger,
		skillPath: entry.skill_path,
		requiredInput: '',
		editScope: '',
		risk: '',
		commandIntents: entry.command_intents,
		expectedOutput: '',
	}));
	const metadata = new Map(installedEntries.map((entry) => [entry.skill, {
		category: entry.category,
		routeType: entry.route_type,
		selectionAxis: entry.selection_axis,
		priority: entry.priority,
		appliesToReasons: entry.applies_to_reasons,
		mutuallyExclusiveWith: entry.mutually_exclusive_with,
		signalProfile: {
			positiveSignals: entry.positive_signals,
			negativeSignals: entry.negative_signals,
		},
		dependencies: entry.dependencies,
	}] satisfies [string, SkillRouteMetadata]));

	return { routes, metadata };
}

export function validateSkillRouteCatalogs(projectRoot: string): readonly string[] {
	let expectedCatalog: SkillRouteCatalog;
	try {
		expectedCatalog = buildSkillRouteCatalog(projectRoot);
	} catch (error) {
		const message = error instanceof Error ? error.message : String(error);
		return [`${SKILL_ROUTE_CATALOG_PATH} cannot be generated from canonical sources: ${message}`];
	}
	const expected = serializeSkillRouteCatalog(expectedCatalog);
	const issues: string[] = [];

	for (const relativePath of [SKILL_ROUTE_CATALOG_PATH, TEMPLATE_SKILL_ROUTE_CATALOG_PATH]) {
		const absolutePath = path.join(projectRoot, ...relativePath.split('/'));
		if (relativePath === TEMPLATE_SKILL_ROUTE_CATALOG_PATH && !existsSync(path.dirname(absolutePath))) {
			continue;
		}
		if (!existsSync(absolutePath)) {
			issues.push(`${relativePath} is missing; run the configured skill route catalog generator`);
			continue;
		}
		const actual = readUtf8FileInsideWithoutSymlinks(projectRoot, absolutePath, {
			maxBytes: MUSTFLOW_TEXT_MAX_BYTES,
		});
		const parsed = parseSkillRouteCatalog(actual);
		const comparableActual = relativePath === SKILL_ROUTE_CATALOG_PATH && parsed
			? serializeSkillRouteCatalog({
				schema_version: '2',
				kind: 'skill_route_catalog',
				source_fingerprint: `sha256:${createHash('sha256')
					.update(JSON.stringify(parsed.entries.filter((entry) =>
						existsSync(path.join(projectRoot, ...entry.skill_path.split('/'))))))
					.digest('hex')}`,
				entries: parsed.entries.filter((entry) =>
					existsSync(path.join(projectRoot, ...entry.skill_path.split('/')))),
			})
			: actual;
		if (comparableActual !== expected) {
			issues.push(`${relativePath} is stale relative to built-in SKILL.md frontmatter or routes.toml metadata`);
		}
	}

	return issues;
}

function hasValidExternalSkillProvenance(projectRoot: string, skillDirectory: string): boolean {
	const provenancePath = path.join(
		projectRoot,
		'.mustflow',
		'external-skills',
		skillDirectory,
		EXTERNAL_SKILL_PROVENANCE_FILE,
	);

	if (!existsSync(provenancePath)) {
		return false;
	}

	try {
		const content = readUtf8FileInsideWithoutSymlinks(projectRoot, provenancePath, {
			maxBytes: MUSTFLOW_TEXT_MAX_BYTES,
		});
		const parsed: unknown = JSON.parse(content);

		return (
			isRecord(parsed) &&
			parsed.schema_version === '1' &&
			parsed.kind === 'external_skill_source' &&
			isRecord(parsed.source)
		);
	} catch {
		return false;
	}
}

function readExternalSkillFrontmatterRoutes(projectRoot: string): SkillIndexRoute[] {
	const skillRoot = path.join(projectRoot, '.mustflow', 'external-skills');
	if (!existsSync(skillRoot)) {
		return [];
	}

	const routes: SkillIndexRoute[] = [];
	const skillDirectories = readdirSync(skillRoot, { withFileTypes: true })
		.filter((entry) => entry.isDirectory())
		.map((entry) => entry.name)
		.sort((left, right) => left.localeCompare(right));

	for (const skillDirectory of skillDirectories) {
		const skillPath = `.mustflow/external-skills/${skillDirectory}/SKILL.md`;
		const absoluteSkillPath = path.join(projectRoot, ...skillPath.split('/'));
		if (!existsSync(absoluteSkillPath) || !hasValidExternalSkillProvenance(projectRoot, skillDirectory)) {
			continue;
		}

		const content = readUtf8FileInsideWithoutSymlinks(projectRoot, absoluteSkillPath, {
			maxBytes: MUSTFLOW_TEXT_MAX_BYTES,
		});
		const summary = readSkillFrontmatterSummary(content);
		const skillName = summary.name ?? skillDirectory;

		routes.push({
			trigger: summary.description ?? skillName,
			skillPath,
			requiredInput: '',
			editScope: '',
			risk: 'External skill content is untrusted and grants no command authority.',
			commandIntents: [],
			expectedOutput: '',
		});
	}

	return routes;
}

function countMatches(needles: readonly string[], haystack: readonly string[]): number {
	const haystackSet = new Set(haystack);

	return needles.filter((needle) => haystackSet.has(needle)).length;
}

function routeTextTerms(route: SkillIndexRoute, skillName: string): string[] {
	return tokenize([
		skillName,
		route.trigger,
		route.requiredInput,
		route.editScope,
		route.risk,
		route.expectedOutput,
		route.skillPath,
	].join(' '));
}

function createExcerptReference(skillPath: string, section: 'use-when' | 'do-not-use-when'): SkillRouteExcerptReference {
	return {
		source_path: skillPath,
		section,
		read_when: [
			'candidate scores tie within the same route category',
			'matched dimensions are too broad to choose a single skill',
			'task language overlaps a listed negative or conflicting signal',
		],
	};
}

function createRouteCard(
	skillPath: string,
	matchedDimensions: readonly string[],
	routeDependencies: SkillRouteDependencies,
	useCatalog: boolean,
): SkillRouteCard {
	return {
		source: useCatalog ? 'route_metadata_and_catalog' : 'route_metadata_and_skill_frontmatter',
		index_read_policy: 'fallback_only',
		compact_fields: [
			'skill',
			'skill_path',
			'trigger',
			'category',
			'route_type',
			'priority',
			'applies_to_reasons',
			'score_breakdown',
			'selection_reasons',
			'verification_intents',
			'route_dependencies',
		],
		matched_dimensions: matchedDimensions,
		route_dependencies: routeDependencies,
		use_when_excerpt: createExcerptReference(skillPath, 'use-when'),
		do_not_use_excerpt: createExcerptReference(skillPath, 'do-not-use-when'),
		read_strategy: [
			'Read the selected SKILL.md before editing matching scope.',
			'For close ties, compare only Use When and Do Not Use When excerpts before loading full competing skills.',
			'Use route_dependencies to add required or suggested adjunct skill reads without loading the expanded index.',
			'Keep .mustflow/skills/INDEX.md out of the prompt unless route metadata and excerpts are insufficient.',
		],
	};
}

function createPatternSignalBreakdown(
	signalProfile: RouteSignalProfile,
	taskText: string,
	pathText: string,
): {
	readonly positiveMatches: readonly string[];
	readonly negativeMatches: readonly string[];
	readonly patternScore: number;
	readonly negativePenalty: number;
} {
	if (signalProfile.positiveSignals.length === 0 && signalProfile.negativeSignals.length === 0) {
		return {
			positiveMatches: [],
			negativeMatches: [],
			patternScore: 0,
			negativePenalty: 0,
		};
	}

	const normalizedText = normalizeRouteText(`${taskText} ${pathText}`);
	const normalizedInput = ` ${normalizedText} `;
	const matchesSignal = (signal: string): boolean =>
		/[\p{Script=Han}\p{Script=Hangul}]/u.test(signal)
			? normalizedText.includes(signal)
			: normalizedInput.includes(` ${signal} `);
	const positiveMatches = signalProfile.positiveSignals.filter(matchesSignal);
	const negativeMatches = signalProfile.negativeSignals.filter(matchesSignal);

	return {
		positiveMatches,
		negativeMatches,
		patternScore: Math.min(positiveMatches.length * PATTERN_SIGNAL_TERM_SCORE, PATTERN_SIGNAL_MAX_SCORE),
		negativePenalty: Math.max(negativeMatches.length * NEGATIVE_SIGNAL_TERM_PENALTY, NEGATIVE_SIGNAL_MAX_PENALTY),
	};
}

function createCandidate(
	route: SkillIndexRoute,
	metadata: SkillRouteMetadata,
	taskTerms: readonly string[],
	pathTerms: readonly string[],
	pathSkillHints: ReadonlySet<string>,
	reasons: readonly string[],
	taskText: string,
	pathText: string,
	useCatalog: boolean,
): SkillRouteResolvedCandidate {
	const skill = skillNameFromPath(route.skillPath);
	const terms = routeTextTerms(route, skill);
	const matchedReasons = reasons.filter((reason) => metadata.appliesToReasons.includes(reason));
	const taskMatches = countMatches(taskTerms, terms);
	const pathMatches = countMatches(pathTerms, terms);
	const pathSkillHintMatched = pathSkillHints.has(skill);
	const patternSignals = createPatternSignalBreakdown(metadata.signalProfile, taskText, pathText);
	const breakdown = {
		reason_match: matchedReasons.length * 4,
		task_text_match: taskMatches * 3,
		path_match: pathMatches * 3 + (pathSkillHintMatched ? PATH_SKILL_HINT_SCORE : 0),
		pattern_signal_match: patternSignals.patternScore,
		negative_signal_penalty: patternSignals.negativePenalty,
		route_type_weight: ROUTE_TYPE_WEIGHTS[metadata.routeType] ?? 0,
		priority_weight: Math.max(0, Math.min(metadata.priority, 100)) / 25,
	} satisfies SkillRouteScoreBreakdown;
	const score = Object.values(breakdown).reduce((total, value) => total + value, 0);
	const matchedDimensions = [
		...(matchedReasons.length > 0 ? ['reason'] : []),
		...(taskMatches > 0 ? ['task_terms'] : []),
		...(pathMatches > 0 ? ['path_terms'] : []),
		...(pathSkillHintMatched ? ['path_skill_hint'] : []),
		...(patternSignals.positiveMatches.length > 0 ? ['pattern_signal'] : []),
		...(patternSignals.negativeMatches.length > 0 ? ['negative_signal'] : []),
	];
	const selectionReasons = [
		...matchedReasons.map((reason) => `reason:${reason}`),
		...(taskMatches > 0 ? [`task_terms:${taskMatches}`] : []),
		...(pathMatches > 0 ? [`path_terms:${pathMatches}`] : []),
		...(pathSkillHintMatched ? [`path_skill_hint:${skill}`] : []),
		...(patternSignals.positiveMatches.length > 0
			? [`pattern_terms:${patternSignals.positiveMatches.join('|')}`]
			: []),
		...(patternSignals.negativeMatches.length > 0
			? [`negative_terms:${patternSignals.negativeMatches.join('|')}`]
			: []),
		`route_type:${metadata.routeType}`,
		`priority:${metadata.priority}`,
	];

	return {
		skill,
		skill_path: route.skillPath,
		trigger: route.trigger,
		category: metadata.category,
		route_type: metadata.routeType,
		selection_axis: metadata.selectionAxis,
		priority: metadata.priority,
		applies_to_reasons: metadata.appliesToReasons,
		score,
		score_breakdown: breakdown,
		selection_reasons: selectionReasons,
		matched_dimensions: matchedDimensions,
		route_card: createRouteCard(route.skillPath, matchedDimensions, metadata.dependencies, useCatalog),
		verification_intents: route.commandIntents,
	};
}

function hasCandidateEvidence(candidate: SkillRouteResolvedCandidate): boolean {
	const breakdown = candidate.score_breakdown;
	const hasExactPathHint = candidate.selection_reasons.some((reason) => reason.startsWith('path_skill_hint:'));
	const hasStructuredReasonWithCorroboration =
		breakdown.reason_match > 0 && (breakdown.task_text_match > 0 || breakdown.path_match > 0);

	return (
		hasExactPathHint ||
		breakdown.pattern_signal_match > 0 ||
		breakdown.task_text_match >= 6 ||
		breakdown.path_match >= 6 ||
		hasStructuredReasonWithCorroboration
	);
}

function sortCandidates(
	left: SkillRouteResolvedCandidate,
	right: SkillRouteResolvedCandidate,
): number {
	const score = right.score - left.score;
	if (score !== 0) {
		return score;
	}

	const priority = right.priority - left.priority;
	if (priority !== 0) {
		return priority;
	}

	return left.skill.localeCompare(right.skill);
}

function isSelectableMain(candidate: SkillRouteResolvedCandidate): boolean {
	return candidate.route_type === 'primary' || candidate.route_type === 'authoring' || candidate.route_type === 'external';
}

function hasDependencySignal(
	signal: string,
	dependencySignals: ReadonlySet<string>,
	taskTerms: readonly string[],
	pathTerms: readonly string[],
): boolean {
	if (dependencySignals.has(signal)) {
		return true;
	}

	const inputTerms = new Set([...taskTerms, ...pathTerms]);
	const signalTerms = signal
		.split('_')
		.map((term) => (term === 'changed' ? 'change' : term))
		.filter((term) => term !== 'or');

	return signalTerms.length > 0 && signalTerms.every((term) => inputTerms.has(term));
}

function collectDependencySignals(
	paths: readonly string[],
	reasons: readonly string[],
	taskTerms: readonly string[],
	pathTerms: readonly string[],
): Set<string> {
	const dependencySignals = new Set(reasons);
	const inputTerms = new Set([...taskTerms, ...pathTerms]);
	const hasAnyInputTerm = (...terms: readonly string[]): boolean => terms.some((term) => inputTerms.has(term));

	if (
		inputTerms.has('output') &&
		(inputTerms.has('machine') || inputTerms.has('json') || inputTerms.has('jsonl') || inputTerms.has('cli'))
	) {
		dependencySignals.add('machine_output_changed');
	}

	if (
		inputTerms.has('schema') ||
		inputTerms.has('fixture') ||
		paths.some((pathValue) => /(?:^|\/)(?:schemas|fixtures|tests\/fixtures)(?:\/|$)/u.test(pathValue))
	) {
		dependencySignals.add('schema_or_fixture_changed');
	}

	if (
		inputTerms.has('followup') ||
		(inputTerms.has('follow') && inputTerms.has('up')) ||
		(inputTerms.has('next') && inputTerms.has('action'))
	) {
		dependencySignals.add('concrete_followup_exists');
	}

	if (
		hasAnyInputTerm('commit', 'committed') &&
		hasAnyInputTerm('publish', 'published', 'publisher') &&
		hasAnyInputTerm('split', 'outbox', 'reconcile', 'reconciliation')
	) {
		dependencySignals.add('commit_publish_split');
	}

	if (
		inputTerms.has('capability') &&
		hasAnyInputTerm('scope', 'scoped') &&
		hasAnyInputTerm('tool', 'tools')
	) {
		dependencySignals.add('capability_scoped_tool');
	}

	if (inputTerms.has('allow') && inputTerms.has('deny') && inputTerms.has('approval')) {
		dependencySignals.add('allow_deny_approval');
	}

	if (
		inputTerms.has('contract') &&
		inputTerms.has('version') &&
		hasAnyInputTerm('migrate', 'migrated', 'migration')
	) {
		dependencySignals.add('contract_version_migration');
	}

	const hasReservationTerm = hasAnyInputTerm('reserve', 'reserved', 'reserves', 'reservation');
	if (inputTerms.has('budget') && hasReservationTerm) {
		dependencySignals.add('budget_reservation');
	}
	if (hasReservationTerm && hasAnyInputTerm('settle', 'settled', 'settles', 'settlement')) {
		dependencySignals.add('reservation_settlement');
	}

	if (
		hasAnyInputTerm('child', 'children') &&
		hasAnyInputTerm('join', 'joined') &&
		hasAnyInputTerm('cancel', 'cancelled', 'cancellation')
	) {
		dependencySignals.add('child_join_cancel');
	}

	return dependencySignals;
}

function addDependencySelectionReason(
	candidate: SkillRouteResolvedCandidate,
	reason: string,
): SkillRouteResolvedCandidate {
	const matchedDimensions = [...new Set([...candidate.matched_dimensions, 'route_dependency'])];

	return {
		...candidate,
		selection_reasons: [...new Set([...candidate.selection_reasons, reason])],
		matched_dimensions: matchedDimensions,
		route_card: {
			...candidate.route_card,
			matched_dimensions: matchedDimensions,
		},
	};
}

function routeConflictsFor(
	candidate: SkillRouteResolvedCandidate,
	metadata: ReadonlyMap<string, SkillRouteMetadata>,
): Set<string> {
	const routeMetadata = metadata.get(candidate.skill);

	return new Set([
		...(routeMetadata?.mutuallyExclusiveWith ?? []),
		...candidate.route_card.route_dependencies.conflicts_with,
	]);
}

function routesConflict(
	left: SkillRouteResolvedCandidate,
	right: SkillRouteResolvedCandidate,
	metadata: ReadonlyMap<string, SkillRouteMetadata>,
): boolean {
	return routeConflictsFor(left, metadata).has(right.skill) || routeConflictsFor(right, metadata).has(left.skill);
}

function selectAdjuncts(
	main: SkillRouteResolvedCandidate | null,
	scoredCandidates: readonly SkillRouteResolvedCandidate[],
	allCandidatesBySkill: ReadonlyMap<string, SkillRouteResolvedCandidate>,
	metadata: ReadonlyMap<string, SkillRouteMetadata>,
	dependencySignals: ReadonlySet<string>,
	taskTerms: readonly string[],
	pathTerms: readonly string[],
	adjunctLimit: number,
): SkillRouteResolvedCandidate[] {
	if (!main || adjunctLimit === 0) {
		return [];
	}

	const selectedMain = main;
	const mainMetadata = metadata.get(selectedMain.skill);
	const excluded = new Set([
		selectedMain.skill,
		...(mainMetadata?.mutuallyExclusiveWith ?? []),
		...selectedMain.route_card.route_dependencies.conflicts_with,
	]);
	const selected: SkillRouteResolvedCandidate[] = [];

	function addDependencySkill(skill: string, reason: string): void {
		const dependencyCandidate = allCandidatesBySkill.get(skill);
		if (!dependencyCandidate || excluded.has(dependencyCandidate.skill)) {
			return;
		}
		if ([selectedMain, ...selected].some((candidate) => routesConflict(candidate, dependencyCandidate, metadata))) {
			return;
		}
		if (selected.some((candidate) => candidate.skill === dependencyCandidate.skill)) {
			return;
		}
		selected.push(addDependencySelectionReason(dependencyCandidate, reason));
	}

	for (const skill of selectedMain.route_card.route_dependencies.requires_skills) {
		addDependencySkill(skill, `route_dependency:requires:${selectedMain.skill}`);
	}

	for (const unlockRule of selectedMain.route_card.route_dependencies.unlocks_on) {
		if (hasDependencySignal(unlockRule.signal, dependencySignals, taskTerms, pathTerms)) {
			addDependencySkill(unlockRule.skill, `route_dependency:unlocked_by:${selectedMain.skill}:${unlockRule.signal}`);
		}
	}

	if (selected.length >= adjunctLimit) {
		return selected.slice(0, adjunctLimit);
	}

	const scoredAdjuncts = scoredCandidates
		.filter((candidate) => {
			return (
				candidate.route_type === 'adjunct' &&
				!excluded.has(candidate.skill) &&
				!selected.some((selectedCandidate) => selectedCandidate.skill === candidate.skill) &&
				![selectedMain, ...selected].some((selectedCandidate) => routesConflict(selectedCandidate, candidate, metadata))
			);
		})
		.sort(sortCandidates);

	for (const candidate of scoredAdjuncts) {
		if (selected.length >= adjunctLimit) {
			break;
		}
		selected.push(candidate);
	}

	for (const skill of selectedMain.route_card.route_dependencies.suggests_adjuncts) {
		if (selected.length >= adjunctLimit) {
			break;
		}
		addDependencySkill(skill, `route_dependency:suggested_by:${selectedMain.skill}`);
	}

	return selected.slice(0, adjunctLimit);
}

function selectCandidatesByAxis(
	candidates: readonly SkillRouteResolvedCandidate[],
	config: SkillRouterConfig,
	metadata: ReadonlyMap<string, SkillRouteMetadata>,
): Readonly<Record<SkillRouteSelectionAxis, readonly SkillRouteResolvedCandidate[]>> {
	const selected: Record<SkillRouteSelectionAxis, SkillRouteResolvedCandidate[]> = {
		language: [],
		task: [],
		risk: [],
		workflow: [],
	};
	let remaining = config.selectionLimit;

	for (const axis of ['language', 'task', 'risk', 'workflow'] as const) {
		for (const candidate of candidates) {
			if (remaining === 0 || selected[axis].length >= config.axisLimits[axis]) {
				break;
			}
			if (candidate.selection_axis !== axis) {
				continue;
			}
			const alreadySelected = Object.values(selected).flat();
			if (alreadySelected.some((selectedCandidate) => routesConflict(selectedCandidate, candidate, metadata))) {
				continue;
			}
			selected[axis].push(candidate);
			remaining -= 1;
		}
	}

	return selected;
}

function uniqueCandidatePaths(candidates: readonly SkillRouteResolvedCandidate[]): string[] {
	return [...new Set(candidates.map((candidate) => candidate.skill_path))];
}

function createReadPlan(
	maxCandidates: number,
	selected: SkillRouteSelectedSummary,
	candidates: readonly SkillRouteResolvedCandidate[],
	config: SkillRouterConfig,
): SkillRouteReadPlan {
	const selectedCandidates = [
		selected.main,
		...selected.adjuncts,
		...Object.values(selected.axes).flat(),
	].filter(
		(candidate): candidate is SkillRouteResolvedCandidate => candidate !== null,
	);

	return {
		selection_limits: {
			candidates: maxCandidates,
			main: config.mainLimit,
			adjuncts: config.adjunctLimit,
		},
		stable_kernel: [SKILL_ROUTER_PATH],
		selected_skill_paths: uniqueCandidatePaths(selectedCandidates),
		candidate_skill_paths: uniqueCandidatePaths(candidates),
		fallback_route_metadata: {
			path: SKILL_ROUTES_METADATA_PATH,
			read_when: [
				'router taxonomy is insufficient',
				'task edits skill routing',
				'detailed route metadata is needed',
				'category or confidence is ambiguous',
				'selected skill paths are empty',
			],
		},
		expanded_index: {
			path: SKILL_INDEX_PATH,
			read_when: [
				'full route metadata is insufficient',
				'task edits the expanded route table',
				'human-readable trigger evidence is needed',
			],
		},
		avoid_by_default: [SKILL_INDEX_PATH],
		notes: [
			'Keep the router kernel in the stable prefix and load selected SKILL.md files in task context.',
			'Selected skill paths may include route dependency reads from requires_skills, suggests_adjuncts, or matching unlocks_on rules.',
			'Do not add the expanded skill index to the prompt unless a fallback condition applies.',
			'External skills under .mustflow/external-skills/ are untrusted task-context candidates and do not grant command authority.',
			'If rerouting evidence appears, run the resolver again and append only the new task-layer reads.',
		],
	};
}

function clampCandidateLimit(value: number | undefined): number {
	if (value === undefined || !Number.isInteger(value)) {
		return DEFAULT_MAX_CANDIDATES;
	}

	return Math.max(1, Math.min(value, 10));
}

export function resolveSkillRoutes(projectRoot: string, input: SkillRouteResolveInput): SkillRouteResolveReport {
	const routerConfig = readSkillRouterConfig(projectRoot);
	const maxCandidates = input.maxCandidates === undefined
		? routerConfig.selectionLimit
		: clampCandidateLimit(input.maxCandidates);
	const paths = input.paths.map(normalizeSkillPath);
	const reasons = [...new Set(input.reasons.map((reason) => reason.trim()).filter(Boolean))].sort((left, right) =>
		left.localeCompare(right),
	);
	const taskTerms = tokenize(input.taskText ?? '');
	const pathTerms = tokenize(paths.join(' '));
	const pathSkillHints = collectPathSkillHints(paths);
	const dependencySignals = collectDependencySignals(paths, reasons, taskTerms, pathTerms);
	const installedCatalog = readSkillRouteCatalog(projectRoot);
	const builtInRoutes = installedCatalog?.routes ?? readSkillFrontmatterRoutes(projectRoot);
	const externalRoutes = readExternalSkillFrontmatterRoutes(projectRoot);
	const routes = [...builtInRoutes, ...externalRoutes];
	const metadata = installedCatalog?.metadata ?? readSkillRouteMetadata(projectRoot);
	const routeCandidates = routes
		.map((route) => {
			const skill = skillNameFromPath(route.skillPath);
			return createCandidate(
				route,
				metadata.get(skill) ?? {
					category: route.category ?? null,
					routeType: route.skillPath.startsWith('.mustflow/external-skills/') ? 'external' : 'unknown',
					selectionAxis: 'task',
					priority: 0,
					appliesToReasons: [],
					mutuallyExclusiveWith: [],
					signalProfile: {
						positiveSignals: [],
						negativeSignals: [],
					},
					dependencies: EMPTY_ROUTE_DEPENDENCIES,
				},
				taskTerms,
				pathTerms,
				pathSkillHints,
				reasons,
				input.taskText ?? '',
				paths.join(' '),
				installedCatalog !== null && !route.skillPath.startsWith('.mustflow/external-skills/'),
			);
		})
		.sort(sortCandidates);
	const allCandidatesBySkill = new Map(routeCandidates.map((candidate) => [candidate.skill, candidate]));
	const allCandidates = routeCandidates
		.filter((candidate) => hasCandidateEvidence(candidate) && candidate.score > 0)
		.sort(sortCandidates);
	const candidates = allCandidates.slice(0, maxCandidates);
	const main = candidates.find(isSelectableMain) ?? null;
	const axes = selectCandidatesByAxis(candidates, { ...routerConfig, selectionLimit: maxCandidates }, metadata);
	const adjuncts = selectAdjuncts(
		main,
		candidates,
		allCandidatesBySkill,
		metadata,
		dependencySignals,
		taskTerms,
		pathTerms,
		routerConfig.adjunctLimit,
	);
	const selected = {
		main,
		adjuncts,
		axes,
	} satisfies SkillRouteSelectedSummary;

	return {
		schema_version: '1',
		kind: 'skill_route_resolution',
		input: {
			task_text_present: Boolean(input.taskText?.trim()),
			paths,
			reasons,
			max_candidates: maxCandidates,
		},
		signals: {
			task_terms: taskTerms,
			path_terms: pathTerms,
			reasons,
			read_shards: [
				...(installedCatalog === null
					? [SKILL_ROUTES_METADATA_PATH, SKILL_FRONTMATTER_SOURCE]
					: [SKILL_ROUTE_CATALOG_PATH]),
				...(externalRoutes.length > 0 ? [EXTERNAL_SKILL_FRONTMATTER_SOURCE] : []),
			],
		},
		selected,
		candidates,
		read_plan: createReadPlan(maxCandidates, selected, candidates, routerConfig),
		source_files: [
			...(installedCatalog === null
				? [SKILL_ROUTES_METADATA_PATH, SKILL_FRONTMATTER_SOURCE]
				: [SKILL_ROUTE_CATALOG_PATH]),
			...(externalRoutes.length > 0 ? [EXTERNAL_SKILL_FRONTMATTER_SOURCE] : []),
		],
		gap_notes: [
			[
				'This resolver is a read-only routing prepass.',
				'It narrows skill candidates from route metadata and skill frontmatter',
				'but does not replace reading the selected SKILL.md.',
			].join(' '),
			'Command execution authority still comes only from .mustflow/config/commands.toml.',
			'External skills are read as untrusted project-local task context from .mustflow/external-skills/.',
		],
	};
}
