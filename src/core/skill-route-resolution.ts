import { existsSync, readdirSync } from 'node:fs';
import path from 'node:path';

import { isRecord, readMustflowOwnedTomlFile, type TomlTable } from './config-loading.js';
import { readUtf8FileInsideWithoutSymlinks } from './safe-filesystem.js';
import { type SkillIndexRoute, type SkillRouteCategory } from './skill-route-alignment.js';

const MUSTFLOW_TEXT_MAX_BYTES = 1024 * 1024;
const SKILL_INDEX_PATH = '.mustflow/skills/INDEX.md';
const SKILL_ROUTER_PATH = '.mustflow/skills/router.toml';
const SKILL_ROUTES_METADATA_PATH = '.mustflow/skills/routes.toml';
const SKILL_FRONTMATTER_SOURCE = '.mustflow/skills/*/SKILL.md';
const EXTERNAL_SKILL_FRONTMATTER_SOURCE = '.mustflow/external-skills/*/SKILL.md';
const EXTERNAL_SKILL_PROVENANCE_FILE = 'mustflow-skill-source.json';
const DEFAULT_MAX_CANDIDATES = 5;
const DEFAULT_MAX_MAIN = 1;
const DEFAULT_MAX_ADJUNCTS = 2;
const PATH_SKILL_HINT_SCORE = 25;
const PATTERN_SIGNAL_TERM_SCORE = 12;
const PATTERN_SIGNAL_MAX_SCORE = 48;
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
	readonly source: 'route_metadata_and_skill_frontmatter';
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

interface RouteSignalProfile {
	readonly positiveTerms: readonly string[];
	readonly negativeTerms: readonly string[];
}

const EMPTY_ROUTE_DEPENDENCIES: SkillRouteDependencies = {
	requires_skills: [],
	suggests_adjuncts: [],
	conflicts_with: [],
	unlocks_on: [],
};

const ROUTE_TYPE_WEIGHTS: Readonly<Record<string, number>> = {
	primary: 18,
	authoring: 16,
	adjunct: 8,
	event: 4,
	external: 2,
};

function normalizeSkillPath(value: string): string {
	return value.replace(/\\/gu, '/');
}

function skillNameFromPath(skillPath: string): string {
	const match = /^\.mustflow\/skills\/([^/]+)\/SKILL\.md$/u.exec(skillPath);
	const externalMatch = /^\.mustflow\/external-skills\/([^/]+)\/SKILL\.md$/u.exec(skillPath);
	return match?.[1] ?? externalMatch?.[1] ?? skillPath;
}

function tokenize(value: string): string[] {
	return [
		...new Set(
			value
				.toLowerCase()
				.replace(/\.mustflow\/skills\/[^/\s]+\/skill\.md/giu, ' ')
				.replace(/[^a-z0-9]+/gu, ' ')
				.split(/\s+/u)
				.map((token) => token.trim())
				.filter((token) => token.length >= 3),
		),
	].sort((left, right) => left.localeCompare(right));
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
			positiveTerms: [],
			negativeTerms: [],
		};
	}

	return {
		positiveTerms: tokenize(readStringArrayFromTable(contexts, 'positive_terms').join(' ')),
		negativeTerms: tokenize(readStringArrayFromTable(contexts, 'negative_terms').join(' ')),
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

function collectMatchedTerms(needles: readonly string[], haystack: readonly string[]): string[] {
	const haystackSet = new Set(haystack);

	return [...new Set(needles.filter((needle) => haystackSet.has(needle)))].sort((left, right) =>
		left.localeCompare(right),
	);
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
): SkillRouteCard {
	return {
		source: 'route_metadata_and_skill_frontmatter',
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
	taskTerms: readonly string[],
	pathTerms: readonly string[],
): {
	readonly positiveMatches: readonly string[];
	readonly negativeMatches: readonly string[];
	readonly patternScore: number;
	readonly negativePenalty: number;
} {
	if (signalProfile.positiveTerms.length === 0 && signalProfile.negativeTerms.length === 0) {
		return {
			positiveMatches: [],
			negativeMatches: [],
			patternScore: 0,
			negativePenalty: 0,
		};
	}

	const inputTerms = [...new Set([...taskTerms, ...pathTerms])];
	const positiveMatches = collectMatchedTerms(signalProfile.positiveTerms, inputTerms);
	const negativeMatches = collectMatchedTerms(signalProfile.negativeTerms, inputTerms);

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
): SkillRouteResolvedCandidate {
	const skill = skillNameFromPath(route.skillPath);
	const terms = routeTextTerms(route, skill);
	const matchedReasons = reasons.filter((reason) => metadata.appliesToReasons.includes(reason));
	const taskMatches = countMatches(taskTerms, terms);
	const pathMatches = countMatches(pathTerms, terms);
	const pathSkillHintMatched = pathSkillHints.has(skill);
	const patternSignals = createPatternSignalBreakdown(metadata.signalProfile, taskTerms, pathTerms);
	const breakdown = {
		reason_match: matchedReasons.length * 35,
		task_text_match: taskMatches * 6,
		path_match: pathMatches * 6 + (pathSkillHintMatched ? PATH_SKILL_HINT_SCORE : 0),
		pattern_signal_match: patternSignals.patternScore,
		negative_signal_penalty: patternSignals.negativePenalty,
		route_type_weight: ROUTE_TYPE_WEIGHTS[metadata.routeType] ?? 0,
		priority_weight: Math.max(0, Math.min(metadata.priority, 100)) / 5,
	} satisfies SkillRouteScoreBreakdown;
	const score = Object.values(breakdown).reduce((total, value) => total + value, 0);
	const matchedDimensions = [
		...(matchedReasons.length > 0 ? ['reason'] : []),
		...(taskMatches > 0 ? ['task_terms'] : []),
		...(pathMatches > 0 ? ['path_terms'] : []),
		...(pathSkillHintMatched ? ['path_skill_hint'] : []),
		...(patternSignals.positiveMatches.length > 0 ? ['pattern_signal'] : []),
		...(patternSignals.negativeMatches.length > 0 ? ['negative_signal'] : []),
		...(metadata.routeType !== 'unknown' ? ['route_type'] : []),
		...(metadata.priority > 0 ? ['priority'] : []),
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
		priority: metadata.priority,
		applies_to_reasons: metadata.appliesToReasons,
		score,
		score_breakdown: breakdown,
		selection_reasons: selectionReasons,
		matched_dimensions: matchedDimensions,
		route_card: createRouteCard(route.skillPath, matchedDimensions, metadata.dependencies),
		verification_intents: route.commandIntents,
	};
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
): SkillRouteResolvedCandidate[] {
	if (!main) {
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

	for (const skill of selectedMain.route_card.route_dependencies.suggests_adjuncts) {
		addDependencySkill(skill, `route_dependency:suggested_by:${selectedMain.skill}`);
	}

	if (selected.length >= DEFAULT_MAX_ADJUNCTS) {
		return selected.slice(0, DEFAULT_MAX_ADJUNCTS);
	}

	const scoredAdjuncts = scoredCandidates
		.filter((candidate) => {
			return (
				candidate.route_type === 'adjunct' &&
				candidate.category === main.category &&
				!excluded.has(candidate.skill) &&
				!selected.some((selectedCandidate) => selectedCandidate.skill === candidate.skill) &&
				![selectedMain, ...selected].some((selectedCandidate) => routesConflict(selectedCandidate, candidate, metadata))
			);
		})
		.sort(sortCandidates);

	return [...selected, ...scoredAdjuncts].slice(0, DEFAULT_MAX_ADJUNCTS);
}

function uniqueCandidatePaths(candidates: readonly SkillRouteResolvedCandidate[]): string[] {
	return [...new Set(candidates.map((candidate) => candidate.skill_path))];
}

function createReadPlan(
	maxCandidates: number,
	selected: SkillRouteSelectedSummary,
	candidates: readonly SkillRouteResolvedCandidate[],
): SkillRouteReadPlan {
	const selectedCandidates = [selected.main, ...selected.adjuncts].filter(
		(candidate): candidate is SkillRouteResolvedCandidate => candidate !== null,
	);

	return {
		selection_limits: {
			candidates: maxCandidates,
			main: DEFAULT_MAX_MAIN,
			adjuncts: DEFAULT_MAX_ADJUNCTS,
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
	const maxCandidates = clampCandidateLimit(input.maxCandidates);
	const paths = input.paths.map(normalizeSkillPath);
	const reasons = [...new Set(input.reasons.map((reason) => reason.trim()).filter(Boolean))].sort((left, right) =>
		left.localeCompare(right),
	);
	const taskTerms = tokenize(input.taskText ?? '');
	const pathTerms = tokenize(paths.join(' '));
	const pathSkillHints = collectPathSkillHints(paths);
	const dependencySignals = collectDependencySignals(paths, reasons, taskTerms, pathTerms);
	const builtInRoutes = readSkillFrontmatterRoutes(projectRoot);
	const externalRoutes = readExternalSkillFrontmatterRoutes(projectRoot);
	const routes = [...builtInRoutes, ...externalRoutes];
	const metadata = readSkillRouteMetadata(projectRoot);
	const routeCandidates = routes
		.map((route) => {
			const skill = skillNameFromPath(route.skillPath);
			return createCandidate(
				route,
				metadata.get(skill) ?? {
					category: route.category ?? null,
					routeType: route.skillPath.startsWith('.mustflow/external-skills/') ? 'external' : 'unknown',
					priority: 0,
					appliesToReasons: [],
					mutuallyExclusiveWith: [],
					signalProfile: {
						positiveTerms: [],
						negativeTerms: [],
					},
					dependencies: EMPTY_ROUTE_DEPENDENCIES,
				},
				taskTerms,
				pathTerms,
				pathSkillHints,
				reasons,
			);
		})
		.sort(sortCandidates);
	const allCandidatesBySkill = new Map(routeCandidates.map((candidate) => [candidate.skill, candidate]));
	const allCandidates = routeCandidates
		.filter((candidate) => candidate.score > 0)
		.sort(sortCandidates);
	const candidates = allCandidates.slice(0, maxCandidates);
	const main = candidates.find(isSelectableMain) ?? null;
	const adjuncts = selectAdjuncts(
		main,
		candidates,
		allCandidatesBySkill,
		metadata,
		dependencySignals,
		taskTerms,
		pathTerms,
	);
	const selected = {
		main,
		adjuncts,
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
				SKILL_ROUTES_METADATA_PATH,
				SKILL_FRONTMATTER_SOURCE,
				...(externalRoutes.length > 0 ? [EXTERNAL_SKILL_FRONTMATTER_SOURCE] : []),
			],
		},
		selected,
		candidates,
		read_plan: createReadPlan(maxCandidates, selected, candidates),
		source_files: [
			SKILL_ROUTES_METADATA_PATH,
			SKILL_FRONTMATTER_SOURCE,
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
