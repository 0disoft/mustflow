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

const SKILL_ROUTE_SOURCE_FILES = [
	'.mustflow/skills/INDEX.md',
	'.mustflow/skills/*/SKILL.md',
	'.mustflow/config/commands.toml',
	'.mustflow/docs/agent-workflow.md',
] as const;
const MARKDOWN_TABLE_SEPARATOR_PATTERN = /^:?-{3,}:?$/u;
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

function pluralize(count: number, singular: string, plural: string): string {
	return count === 1 ? singular : plural;
}

export function isSkillRouteAlignmentIssue(issue: string): boolean {
	return (
		issue.includes('.mustflow/skills/INDEX.md route') ||
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
