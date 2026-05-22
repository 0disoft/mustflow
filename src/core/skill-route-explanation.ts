import { existsSync } from 'node:fs';
import path from 'node:path';

import { isRecord, readMustflowOwnedTomlFile, type TomlTable } from './config-loading.js';
import { readUtf8FileInsideWithoutSymlinks } from './safe-filesystem.js';
import { parseSkillIndexRoutes, type SkillIndexRoute, type SkillRouteCategory } from './skill-route-alignment.js';

const MUSTFLOW_TEXT_MAX_BYTES = 1024 * 1024;

export interface SkillRouteSummary {
	readonly skill: string;
	readonly skillPath: string;
	readonly trigger: string;
	readonly requiredInput: string;
	readonly editScope: string;
	readonly risk: string;
	readonly verificationIntents: readonly string[];
	readonly expectedOutput: string;
	readonly declaredCommandIntents: readonly string[];
}

export interface SkillSelectionEvidence {
	readonly matchedBy: readonly string[];
	readonly requiredInputs: readonly string[];
	readonly missingInputs: readonly string[];
	readonly candidateAdjuncts: readonly string[];
	readonly unmatchedPaths: readonly string[];
	readonly gapNotes: readonly string[];
}

export interface SkillRouteDecision {
	readonly kind: 'skill_route';
	readonly inputSkill: string;
	readonly decision: string;
	readonly reason: string;
	readonly effectiveAction: string;
	readonly countsAsMustflowVerification: false;
	readonly sourceFiles: readonly string[];
	readonly route: SkillRouteSummary | null;
	readonly selectionEvidence: SkillSelectionEvidence;
}

const SKILL_INDEX_PATH = '.mustflow/skills/INDEX.md';
const SKILL_ROUTES_METADATA_PATH = '.mustflow/skills/routes.toml';
const SKILL_ROUTE_SOURCE_FILES = [
	SKILL_INDEX_PATH,
	SKILL_ROUTES_METADATA_PATH,
	'.mustflow/skills/<skill>/SKILL.md',
	'.mustflow/config/commands.toml',
] as const;

interface SkillRouteMetadataSummary {
	readonly category?: SkillRouteCategory;
	readonly routeType?: string;
	readonly priority: number;
	readonly appliesToReasons: readonly string[];
	readonly mutuallyExclusiveWith: readonly string[];
}

function readFrontmatterLines(content: string): string[] {
	if (!content.startsWith('---')) {
		return [];
	}

	const end = content.indexOf('\n---', 3);
	if (end < 0) {
		return [];
	}

	return content.slice(3, end).split(/\r?\n/u);
}

function readFrontmatterScalar(content: string, key: string): string | null {
	for (const line of readFrontmatterLines(content)) {
		const match = /^\s*([^:#]+):\s*(.+?)\s*$/u.exec(line);
		if (!match) {
			continue;
		}

		if (match[1].trim() === key) {
			return match[2].trim().replace(/^["']|["']$/gu, '') || null;
		}
	}

	return null;
}

function readFrontmatterList(content: string, key: string): string[] {
	const lines = readFrontmatterLines(content);
	const values: string[] = [];
	let keyIndent: number | undefined;

	for (const line of lines) {
		const keyMatch = /^(\s*)([^:#]+):\s*$/u.exec(line);
		if (keyMatch) {
			keyIndent = keyMatch[2].trim() === key ? keyMatch[1].length : undefined;
			continue;
		}

		if (keyIndent === undefined) {
			continue;
		}

		const valueMatch = /^(\s*)-\s*(.+?)\s*$/u.exec(line);
		if (!valueMatch || valueMatch[1].length <= keyIndent) {
			keyIndent = undefined;
			continue;
		}

		values.push(valueMatch[2].trim().replace(/^["']|["']$/gu, ''));
	}

	return values;
}

function skillNameFromPath(skillPath: string): string {
	const match = /^\.mustflow\/skills\/([^/]+)\/SKILL\.md$/u.exec(skillPath);
	return match?.[1] ?? skillPath;
}

function collectTargetMatches(target: string, route: SkillIndexRoute, skillContent: string | null): string[] {
	const matches: string[] = [];
	const skillName = skillNameFromPath(route.skillPath);
	const normalizedTarget = target.replace(/\\/gu, '/');

	if (normalizedTarget === skillName) {
		matches.push(`skill_name:${skillName}`);
	}

	if (normalizedTarget === route.skillPath) {
		matches.push(`skill_path:${route.skillPath}`);
	}

	if (!skillContent) {
		return matches;
	}

	const frontmatterName = readFrontmatterScalar(skillContent, 'name');
	const skillId = readFrontmatterScalar(skillContent, 'skill_id');
	const mustflowDoc = readFrontmatterScalar(skillContent, 'mustflow_doc');

	if (frontmatterName === target) {
		matches.push(`frontmatter.name:${frontmatterName}`);
	}

	if (skillId === target) {
		matches.push(`frontmatter.skill_id:${skillId}`);
	}

	if (mustflowDoc === target) {
		matches.push(`frontmatter.mustflow_doc:${mustflowDoc}`);
	}

	return matches;
}

function routeToSummary(route: SkillIndexRoute, skillContent: string | null): SkillRouteSummary {
	const declaredCommandIntents = skillContent ? readFrontmatterList(skillContent, 'command_intents') : [];

	return {
		skill: skillNameFromPath(route.skillPath),
		skillPath: route.skillPath,
		trigger: route.trigger,
		requiredInput: route.requiredInput,
		editScope: route.editScope,
		risk: route.risk,
		verificationIntents: route.commandIntents,
		expectedOutput: route.expectedOutput,
		declaredCommandIntents,
	};
}

function readStringArrayFromTable(table: TomlTable, key: string): string[] {
	const value = table[key];

	return Array.isArray(value) && value.every((entry) => typeof entry === 'string')
		? value.map((entry) => entry.trim()).filter(Boolean)
		: [];
}

function readSkillRouteMetadata(projectRoot: string): Map<string, SkillRouteMetadataSummary> {
	const metadata = new Map<string, SkillRouteMetadataSummary>();

	try {
		const parsed = readMustflowOwnedTomlFile(projectRoot, SKILL_ROUTES_METADATA_PATH);
		if (!isRecord(parsed) || !isRecord(parsed.routes)) {
			return metadata;
		}

		for (const [skillName, route] of Object.entries(parsed.routes)) {
			if (!isRecord(route)) {
				continue;
			}

			const priority = Number.isInteger(route.priority) ? Number(route.priority) : 0;
			const category = typeof route.category === 'string' ? (route.category as SkillRouteCategory) : undefined;
			const routeType = typeof route.route_type === 'string' ? route.route_type : undefined;

			metadata.set(skillName, {
				category,
				routeType,
				priority,
				appliesToReasons: readStringArrayFromTable(route, 'applies_to_reasons'),
				mutuallyExclusiveWith: readStringArrayFromTable(route, 'mutually_exclusive_with'),
			});
		}
	} catch {
		return metadata;
	}

	return metadata;
}

function valuesOverlap(left: readonly string[], right: readonly string[]): boolean {
	const rightValues = new Set(right);

	return left.some((value) => rightValues.has(value));
}

function findCandidateAdjuncts(
	skillName: string,
	routeMetadata: ReadonlyMap<string, SkillRouteMetadataSummary>,
): string[] {
	const current = routeMetadata.get(skillName);
	if (!current) {
		return [];
	}

	return [...routeMetadata.entries()]
		.filter(([candidateName, candidate]) => {
			return (
				candidateName !== skillName &&
				candidate.routeType === 'adjunct' &&
				candidate.category === current.category &&
				!current.mutuallyExclusiveWith.includes(candidateName) &&
				valuesOverlap(candidate.appliesToReasons, current.appliesToReasons)
			);
		})
		.sort((left, right) => {
			const priority = right[1].priority - left[1].priority;
			return priority === 0 ? left[0].localeCompare(right[0]) : priority;
		})
		.map(([candidateName]) => candidateName);
}

function splitRequiredInput(requiredInput: string): string[] {
	return requiredInput.trim().length > 0 ? [requiredInput.trim()] : [];
}

function buildMatchedSkillEvidence(
	summary: SkillRouteSummary,
	matchedBy: readonly string[],
	candidateAdjuncts: readonly string[],
): SkillSelectionEvidence {
	return {
		matchedBy,
		requiredInputs: splitRequiredInput(summary.requiredInput),
		missingInputs: [],
		candidateAdjuncts,
		unmatchedPaths: [],
		gapNotes: [
			'mf explain skill has no task paths or requirement text, so unmatched_paths and missing_inputs are only static route evidence.',
		],
	};
}

function buildMissingSkillEvidence(target: string): SkillSelectionEvidence {
	return {
		matchedBy: [],
		requiredInputs: [],
		missingInputs: [`No skill route matched "${target}".`],
		candidateAdjuncts: [],
		unmatchedPaths: [],
		gapNotes: [
			'No route was selected; update .mustflow/skills/INDEX.md and .mustflow/skills/routes.toml only if a repeatable procedure exists.',
		],
	};
}

export function explainSkillRoute(projectRoot: string, target: string): SkillRouteDecision {
	const indexPath = path.join(projectRoot, ...SKILL_INDEX_PATH.split('/'));
	const indexContent = existsSync(indexPath)
		? readUtf8FileInsideWithoutSymlinks(projectRoot, indexPath, { maxBytes: MUSTFLOW_TEXT_MAX_BYTES })
		: '';
	const routes = parseSkillIndexRoutes(indexContent);
	const routeMetadata = readSkillRouteMetadata(projectRoot);

	for (const route of routes) {
		const absoluteSkillPath = path.join(projectRoot, ...route.skillPath.split('/'));
		const skillContent = existsSync(absoluteSkillPath)
			? readUtf8FileInsideWithoutSymlinks(projectRoot, absoluteSkillPath, { maxBytes: MUSTFLOW_TEXT_MAX_BYTES })
			: null;
		const matchedBy = collectTargetMatches(target, route, skillContent);

		if (matchedBy.length === 0) {
			continue;
		}

		const summary = routeToSummary(route, skillContent);
		const candidateAdjuncts = findCandidateAdjuncts(summary.skill, routeMetadata);

		return {
			kind: 'skill_route',
			inputSkill: target,
			decision: `skill route "${summary.skill}" is declared`,
			reason: 'the skill index contains a route for the requested skill and exposes its trigger, scope, risk, checks, and output contract.',
			effectiveAction: `Read ${summary.skillPath} before editing work that matches: ${summary.trigger}`,
			countsAsMustflowVerification: false,
			sourceFiles: [SKILL_INDEX_PATH, SKILL_ROUTES_METADATA_PATH, route.skillPath, '.mustflow/config/commands.toml'],
			route: summary,
			selectionEvidence: buildMatchedSkillEvidence(summary, matchedBy, candidateAdjuncts),
		};
	}

	return {
		kind: 'skill_route',
		inputSkill: target,
		decision: `skill route "${target}" is not declared`,
		reason: 'the skill index has no matching route for the requested folder name, skill_id, mustflow_doc, or skill path.',
		effectiveAction: 'Use mf explain skills to inspect route alignment, then update .mustflow/skills/INDEX.md only if a real repeatable procedure exists.',
		countsAsMustflowVerification: false,
		sourceFiles: SKILL_ROUTE_SOURCE_FILES,
		route: null,
		selectionEvidence: buildMissingSkillEvidence(target),
	};
}
