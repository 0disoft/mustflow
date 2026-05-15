export type SkillRouteAlignmentStatus = 'ok' | 'fail';

export interface SkillRouteAlignmentSummary {
	readonly status: SkillRouteAlignmentStatus;
	readonly issueCount: number;
	readonly issues: readonly string[];
	readonly summary: string;
	readonly action: string | null;
}

export interface SkillRouteAlignmentDecision {
	readonly kind: 'skill_routes';
	readonly decision: string;
	readonly reason: string;
	readonly effectiveAction: string;
	readonly countsAsMustflowVerification: false;
	readonly sourceFiles: readonly string[];
	readonly alignment: SkillRouteAlignmentSummary;
}

export interface SkillIndexRoute {
	readonly trigger: string;
	readonly skillPath: string;
	readonly requiredInput: string;
	readonly editScope: string;
	readonly risk: string;
	readonly commandIntents: readonly string[];
	readonly expectedOutput: string;
}

interface RoutePair {
	readonly left: SkillIndexRoute;
	readonly right: SkillIndexRoute;
}

const SKILL_ROUTE_SOURCE_FILES = [
	'.mustflow/skills/INDEX.md',
	'.mustflow/skills/*/SKILL.md',
	'.mustflow/config/commands.toml',
	'.mustflow/docs/agent-workflow.md',
] as const;
const MARKDOWN_TABLE_SEPARATOR_PATTERN = /^:?-{3,}:?$/u;
const BROAD_CATCH_ALL_TRIGGERS = new Set([
	'any request',
	'any task',
	'any change',
	'all requests',
	'all tasks',
	'all changes',
	'every request',
	'every task',
	'everything',
]);
export const SKILL_INDEX_ROUTE_COLUMN_COUNT = 7;
export const SKILL_INDEX_SKILL_PATH_COLUMN_INDEX = 1;
export const SKILL_INDEX_VERIFICATION_INTENTS_COLUMN_INDEX = 5;
export const SKILL_INDEX_ROUTE_COLUMNS =
	'Trigger, Skill Document, Required Input, Edit Scope, Risk, Verification Intents, Expected Output';

function splitMarkdownTableRow(line: string): string[] {
	return line
		.trim()
		.replace(/^\|/u, '')
		.replace(/\|$/u, '')
		.split('|')
		.map((cell) => cell.trim());
}

function isMarkdownTableSeparator(cells: readonly string[]): boolean {
	return cells.length > 0 && cells.every((cell) => MARKDOWN_TABLE_SEPARATOR_PATTERN.test(cell));
}

export function readBacktickValues(value: string): string[] {
	return [...value.matchAll(/`([^`]+)`/gu)].map((match) => match[1].trim()).filter(Boolean);
}

export function findSkillIndexRoutePathColumn(cells: readonly string[]): number {
	return cells.findIndex((cell) =>
		readBacktickValues(cell).some((value) => value.startsWith('.mustflow/skills/') && value.endsWith('/SKILL.md')),
	);
}

export function parseSkillIndexRoutes(content: string): SkillIndexRoute[] {
	const routes: SkillIndexRoute[] = [];

	for (const line of content.split(/\r?\n/u)) {
		if (!line.trim().startsWith('|')) {
			continue;
		}

		const cells = splitMarkdownTableRow(line);
		if (isMarkdownTableSeparator(cells)) {
			continue;
		}

		const skillPathColumn = findSkillIndexRoutePathColumn(cells);
		if (skillPathColumn < 0) {
			continue;
		}

		const [skillPath] = readBacktickValues(cells[skillPathColumn]);
		if (!skillPath) {
			continue;
		}

		routes.push({
			trigger: cells[0] ?? '',
			skillPath,
			requiredInput: cells[2] ?? '',
			editScope: cells[3] ?? '',
			risk: cells[4] ?? '',
			commandIntents: readBacktickValues(cells[SKILL_INDEX_VERIFICATION_INTENTS_COLUMN_INDEX] ?? ''),
			expectedOutput: cells[6] ?? '',
		});
	}

	return routes;
}

function normalizeRouteText(value: string): string {
	return value
		.toLowerCase()
		.replace(/`[^`]+`/gu, ' ')
		.replace(/<[^>]+>/gu, ' ')
		.replace(/[^a-z0-9]+/gu, ' ')
		.trim()
		.replace(/\s+/gu, ' ');
}

function collectRoutePairs(routes: readonly SkillIndexRoute[]): RoutePair[] {
	const pairs: RoutePair[] = [];

	for (let leftIndex = 0; leftIndex < routes.length; leftIndex += 1) {
		for (let rightIndex = leftIndex + 1; rightIndex < routes.length; rightIndex += 1) {
			const left = routes[leftIndex];
			const right = routes[rightIndex];

			if (left.skillPath !== right.skillPath) {
				pairs.push({ left, right });
			}
		}
	}

	return pairs;
}

function routePairLabel(pair: RoutePair): string {
	return `${pair.left.skillPath} and ${pair.right.skillPath}`;
}

/**
 * mf:anchor core.skill-route-conflict-lint
 * purpose: Keep skill routing warnings deterministic so broad or duplicate route rows are review candidates, not LLM guesses.
 * search: skill route conflict, duplicate trigger, broad catch-all route
 * invariant: Route conflict warnings are heuristic warnings only; missing routes and command-intent drift remain strict errors.
 * risk: config
 */
export function findSkillRouteConflictWarnings(routes: readonly SkillIndexRoute[]): string[] {
	const warnings: string[] = [];
	const triggerToRoutes = new Map<string, SkillIndexRoute[]>();
	const surfaceToRoutes = new Map<string, SkillIndexRoute[]>();

	for (const route of routes) {
		const trigger = normalizeRouteText(route.trigger);
		const editScope = normalizeRouteText(route.editScope);
		const risk = normalizeRouteText(route.risk);
		const expectedOutput = normalizeRouteText(route.expectedOutput);

		if (BROAD_CATCH_ALL_TRIGGERS.has(trigger)) {
			warnings.push(`${route.skillPath} route uses broad catch-all trigger "${route.trigger}" that can shadow narrower skills`);
		}

		if (trigger) {
			triggerToRoutes.set(trigger, [...(triggerToRoutes.get(trigger) ?? []), route]);
		}

		if (editScope && risk && expectedOutput) {
			const surfaceKey = `${editScope}\n${risk}\n${expectedOutput}`;
			surfaceToRoutes.set(surfaceKey, [...(surfaceToRoutes.get(surfaceKey) ?? []), route]);
		}
	}

	for (const pair of collectRoutePairs([...triggerToRoutes.values()].flatMap((matchingRoutes) => {
		return matchingRoutes.length > 1 ? matchingRoutes : [];
	}))) {
		if (normalizeRouteText(pair.left.trigger) === normalizeRouteText(pair.right.trigger)) {
			warnings.push(`${routePairLabel(pair)} have identical skill route trigger text`);
		}
	}

	for (const pair of collectRoutePairs([...surfaceToRoutes.values()].flatMap((matchingRoutes) => {
		return matchingRoutes.length > 1 ? matchingRoutes : [];
	}))) {
		const leftSurface = [
			normalizeRouteText(pair.left.editScope),
			normalizeRouteText(pair.left.risk),
			normalizeRouteText(pair.left.expectedOutput),
		].join('\n');
		const rightSurface = [
			normalizeRouteText(pair.right.editScope),
			normalizeRouteText(pair.right.risk),
			normalizeRouteText(pair.right.expectedOutput),
		].join('\n');

		if (leftSurface === rightSurface) {
			warnings.push(`${routePairLabel(pair)} have duplicate edit scope, risk, and expected output route surface`);
		}
	}

	return [...new Set(warnings)].sort((left, right) => left.localeCompare(right));
}

function pluralize(count: number, singular: string, plural: string): string {
	return count === 1 ? singular : plural;
}

export function isSkillRouteAlignmentIssue(issue: string): boolean {
	return (
		issue.includes('.mustflow/skills/INDEX.md route') ||
		issue.includes('.mustflow/skills/INDEX.md .mustflow/skills/') ||
		issue.includes('.mustflow/skills/INDEX.md has duplicate route') ||
		issue.endsWith(' is not listed in .mustflow/skills/INDEX.md')
	);
}

export function summarizeSkillRouteAlignment(issues: readonly string[]): SkillRouteAlignmentSummary {
	const skillRouteIssues = issues.filter(isSkillRouteAlignmentIssue);
	const issueCount = skillRouteIssues.length;

	return {
		status: issueCount === 0 ? 'ok' : 'fail',
		issueCount,
		issues: skillRouteIssues,
		summary: `${issueCount} skill index/body alignment ${pluralize(issueCount, 'issue', 'issues')}`,
		action: issueCount === 0 ? null : 'mf check --strict',
	};
}

export function explainSkillRouteAlignment(issues: readonly string[]): SkillRouteAlignmentDecision {
	const alignment = summarizeSkillRouteAlignment(issues);

	if (alignment.status === 'ok') {
		return {
			kind: 'skill_routes',
			decision: 'skill index and skill bodies are aligned',
			reason:
				'strict validation found every skill route points to a procedure body and every skill body is listed in the skill index.',
			effectiveAction: 'Use .mustflow/skills/INDEX.md to choose relevant skill procedures before editing.',
			countsAsMustflowVerification: false,
			sourceFiles: SKILL_ROUTE_SOURCE_FILES,
			alignment,
		};
	}

	return {
		kind: 'skill_routes',
		decision: 'skill index and skill bodies are not aligned',
		reason:
			'strict validation found skill routes or procedure bodies that do not agree with each other.',
		effectiveAction: 'Fix the skill index/body mismatch, then run mf check --strict or mf doctor --strict.',
		countsAsMustflowVerification: false,
		sourceFiles: SKILL_ROUTE_SOURCE_FILES,
		alignment,
	};
}
