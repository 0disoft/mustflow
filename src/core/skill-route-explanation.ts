import { existsSync } from 'node:fs';
import path from 'node:path';

import { readUtf8FileInsideWithoutSymlinks } from './safe-filesystem.js';
import { parseSkillIndexRoutes, type SkillIndexRoute } from './skill-route-alignment.js';

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

export interface SkillRouteDecision {
	readonly kind: 'skill_route';
	readonly inputSkill: string;
	readonly decision: string;
	readonly reason: string;
	readonly effectiveAction: string;
	readonly countsAsMustflowVerification: false;
	readonly sourceFiles: readonly string[];
	readonly route: SkillRouteSummary | null;
}

const SKILL_INDEX_PATH = '.mustflow/skills/INDEX.md';
const SKILL_ROUTE_SOURCE_FILES = [
	SKILL_INDEX_PATH,
	'.mustflow/skills/<skill>/SKILL.md',
	'.mustflow/config/commands.toml',
] as const;

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

function targetMatchesRoute(target: string, route: SkillIndexRoute, skillContent: string | null): boolean {
	const skillName = skillNameFromPath(route.skillPath);
	const normalizedTarget = target.replace(/\\/gu, '/');

	if (normalizedTarget === skillName || normalizedTarget === route.skillPath) {
		return true;
	}

	if (!skillContent) {
		return false;
	}

	return (
		readFrontmatterScalar(skillContent, 'name') === target ||
		readFrontmatterScalar(skillContent, 'skill_id') === target ||
		readFrontmatterScalar(skillContent, 'mustflow_doc') === target
	);
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

export function explainSkillRoute(projectRoot: string, target: string): SkillRouteDecision {
	const indexPath = path.join(projectRoot, ...SKILL_INDEX_PATH.split('/'));
	const indexContent = existsSync(indexPath)
		? readUtf8FileInsideWithoutSymlinks(projectRoot, indexPath, { maxBytes: MUSTFLOW_TEXT_MAX_BYTES })
		: '';
	const routes = parseSkillIndexRoutes(indexContent);

	for (const route of routes) {
		const absoluteSkillPath = path.join(projectRoot, ...route.skillPath.split('/'));
		const skillContent = existsSync(absoluteSkillPath)
			? readUtf8FileInsideWithoutSymlinks(projectRoot, absoluteSkillPath, { maxBytes: MUSTFLOW_TEXT_MAX_BYTES })
			: null;

		if (!targetMatchesRoute(target, route, skillContent)) {
			continue;
		}

		const summary = routeToSummary(route, skillContent);

		return {
			kind: 'skill_route',
			inputSkill: target,
			decision: `skill route "${summary.skill}" is declared`,
			reason: 'the skill index contains a route for the requested skill and exposes its trigger, scope, risk, checks, and output contract.',
			effectiveAction: `Read ${summary.skillPath} before editing work that matches: ${summary.trigger}`,
			countsAsMustflowVerification: false,
			sourceFiles: [SKILL_INDEX_PATH, route.skillPath, '.mustflow/config/commands.toml'],
			route: summary,
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
	};
}
