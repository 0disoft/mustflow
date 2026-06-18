import { existsSync } from 'node:fs';
import path from 'node:path';

import { isRecord, readMustflowOwnedTomlFile, type TomlTable } from './config-loading.js';
import { readUtf8FileInsideWithoutSymlinks } from './safe-filesystem.js';
import {
	parseSkillIndexRoutes,
	type SkillIndexRoute,
	type SkillRouteCategory,
} from './skill-route-alignment.js';

const MUSTFLOW_TEXT_MAX_BYTES = 1024 * 1024;
const SKILL_INDEX_PATH = '.mustflow/skills/INDEX.md';
const SKILL_ROUTES_METADATA_PATH = '.mustflow/skills/routes.toml';
const DEFAULT_MAX_CANDIDATES = 5;
const DEFAULT_MAX_ADJUNCTS = 2;
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
	readonly route_type_weight: number;
	readonly priority_weight: number;
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
	readonly verification_intents: readonly string[];
}

export interface SkillRouteSelectedSummary {
	readonly main: SkillRouteResolvedCandidate | null;
	readonly adjuncts: readonly SkillRouteResolvedCandidate[];
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
	readonly source_files: readonly string[];
	readonly gap_notes: readonly string[];
}

interface SkillRouteMetadata {
	readonly category: SkillRouteCategory | null;
	readonly routeType: string;
	readonly priority: number;
	readonly appliesToReasons: readonly string[];
	readonly mutuallyExclusiveWith: readonly string[];
}

const ROUTE_TYPE_WEIGHTS: Readonly<Record<string, number>> = {
	primary: 18,
	authoring: 16,
	adjunct: 8,
	event: 4,
};

function normalizeSkillPath(value: string): string {
	return value.replace(/\\/gu, '/');
}

function skillNameFromPath(skillPath: string): string {
	const match = /^\.mustflow\/skills\/([^/]+)\/SKILL\.md$/u.exec(skillPath);
	return match?.[1] ?? skillPath;
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
			});
		}
	} catch {
		return metadata;
	}

	return metadata;
}

function readSkillIndexRoutes(projectRoot: string): SkillIndexRoute[] {
	const indexPath = path.join(projectRoot, ...SKILL_INDEX_PATH.split('/'));
	const indexContent = existsSync(indexPath)
		? readUtf8FileInsideWithoutSymlinks(projectRoot, indexPath, { maxBytes: MUSTFLOW_TEXT_MAX_BYTES })
		: '';

	return parseSkillIndexRoutes(indexContent);
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
	const breakdown = {
		reason_match: matchedReasons.length * 35,
		task_text_match: taskMatches * 4,
		path_match: pathMatches * 6 + (pathSkillHintMatched ? 45 : 0),
		route_type_weight: ROUTE_TYPE_WEIGHTS[metadata.routeType] ?? 0,
		priority_weight: Math.max(0, Math.min(metadata.priority, 100)) / 5,
	} satisfies SkillRouteScoreBreakdown;
	const score = Object.values(breakdown).reduce((total, value) => total + value, 0);
	const selectionReasons = [
		...matchedReasons.map((reason) => `reason:${reason}`),
		...(taskMatches > 0 ? [`task_terms:${taskMatches}`] : []),
		...(pathMatches > 0 ? [`path_terms:${pathMatches}`] : []),
		...(pathSkillHintMatched ? [`path_skill_hint:${skill}`] : []),
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
	return candidate.route_type === 'primary' || candidate.route_type === 'authoring';
}

function selectAdjuncts(
	main: SkillRouteResolvedCandidate | null,
	allCandidates: readonly SkillRouteResolvedCandidate[],
	metadata: ReadonlyMap<string, SkillRouteMetadata>,
): SkillRouteResolvedCandidate[] {
	if (!main) {
		return [];
	}

	const mainMetadata = metadata.get(main.skill);
	const excluded = new Set([main.skill, ...(mainMetadata?.mutuallyExclusiveWith ?? [])]);

	return allCandidates
		.filter((candidate) => {
			return (
				candidate.route_type === 'adjunct' &&
				candidate.category === main.category &&
				!excluded.has(candidate.skill)
			);
		})
		.sort(sortCandidates)
		.slice(0, DEFAULT_MAX_ADJUNCTS);
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
	const routes = readSkillIndexRoutes(projectRoot);
	const metadata = readSkillRouteMetadata(projectRoot);
	const allCandidates = routes
		.map((route) => {
			const skill = skillNameFromPath(route.skillPath);
			return createCandidate(
				route,
				metadata.get(skill) ?? {
					category: route.category ?? null,
					routeType: 'unknown',
					priority: 0,
					appliesToReasons: [],
					mutuallyExclusiveWith: [],
				},
				taskTerms,
				pathTerms,
				pathSkillHints,
				reasons,
			);
		})
		.filter((candidate) => candidate.score > 0)
		.sort(sortCandidates);
	const candidates = allCandidates.slice(0, maxCandidates);
	const main = candidates.find(isSelectableMain) ?? null;
	const adjuncts = selectAdjuncts(main, allCandidates, metadata);

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
			read_shards: [SKILL_ROUTES_METADATA_PATH, SKILL_INDEX_PATH],
		},
		selected: {
			main,
			adjuncts,
		},
		candidates,
		source_files: [SKILL_ROUTES_METADATA_PATH, SKILL_INDEX_PATH],
		gap_notes: [
			'This resolver is a read-only routing prepass. It narrows skill candidates but does not replace reading the selected SKILL.md.',
			'Command execution authority still comes only from .mustflow/config/commands.toml.',
		],
	};
}
