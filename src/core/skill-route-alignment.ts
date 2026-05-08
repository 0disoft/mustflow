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

const SKILL_ROUTE_SOURCE_FILES = [
	'.mustflow/skills/INDEX.md',
	'.mustflow/skills/*/SKILL.md',
	'.mustflow/config/commands.toml',
	'.mustflow/docs/agent-workflow.md',
] as const;

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
