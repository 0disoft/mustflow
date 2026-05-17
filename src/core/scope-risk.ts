import type { ChangeClassificationReport } from './change-classification.js';

export type ScopeDiffRiskCode =
	| 'diff_budget_exceeded'
	| 'public_surface_budget_exceeded'
	| 'mixed_change_kind_budget_exceeded';

export type ScopeDiffRiskSeverity = 'medium' | 'high';

export interface ScopeDiffRisk {
	readonly code: ScopeDiffRiskCode;
	readonly severity: ScopeDiffRiskSeverity;
	readonly detail: string;
	readonly count: number;
	readonly limit: number;
	readonly paths: readonly string[];
}

export const SCOPE_DIFF_BUDGET_DEFAULTS = {
	maxChangedFiles: 8,
	maxPublicSurfaces: 4,
	maxChangeKindFamilies: 3,
	maxPathsPerRisk: 8,
} as const;

const CHANGE_KIND_FAMILY_BY_KIND: Readonly<Record<string, string>> = {
	documentation: 'documentation',
	example: 'documentation',
	translation: 'documentation',
	workflow: 'workflow',
	host_instruction: 'workflow',
	installed_template: 'template',
	package_metadata: 'release',
	schema: 'contract',
	test: 'test',
	test_fixture: 'test',
	implementation: 'implementation',
	unknown: 'unknown',
};

function uniqueSorted(values: Iterable<string>): string[] {
	return [...new Set(values)].sort((left, right) => left.localeCompare(right));
}

function changeKindFamily(kind: string): string {
	return CHANGE_KIND_FAMILY_BY_KIND[kind] ?? kind;
}

function firstPaths(paths: readonly string[]): readonly string[] {
	return paths.slice(0, SCOPE_DIFF_BUDGET_DEFAULTS.maxPathsPerRisk);
}

export function createScopeDiffRisks(report: ChangeClassificationReport): readonly ScopeDiffRisk[] {
	const risks: ScopeDiffRisk[] = [];

	if (report.summary.fileCount > SCOPE_DIFF_BUDGET_DEFAULTS.maxChangedFiles) {
		risks.push({
			code: 'diff_budget_exceeded',
			severity: 'high',
			detail: `Changed file count ${report.summary.fileCount} exceeds the conservative completion budget of ${SCOPE_DIFF_BUDGET_DEFAULTS.maxChangedFiles}.`,
			count: report.summary.fileCount,
			limit: SCOPE_DIFF_BUDGET_DEFAULTS.maxChangedFiles,
			paths: firstPaths(report.files),
		});
	}

	if (report.summary.publicSurfaceCount > SCOPE_DIFF_BUDGET_DEFAULTS.maxPublicSurfaces) {
		risks.push({
			code: 'public_surface_budget_exceeded',
			severity: 'high',
			detail: `Public surface count ${report.summary.publicSurfaceCount} exceeds the conservative completion budget of ${SCOPE_DIFF_BUDGET_DEFAULTS.maxPublicSurfaces}.`,
			count: report.summary.publicSurfaceCount,
			limit: SCOPE_DIFF_BUDGET_DEFAULTS.maxPublicSurfaces,
			paths: firstPaths(report.classifications.filter((classification) => classification.surface.isPublicSurface).map((classification) => classification.path)),
		});
	}

	const changeKindFamilies = uniqueSorted(report.summary.changeKinds.map(changeKindFamily));
	if (changeKindFamilies.length > SCOPE_DIFF_BUDGET_DEFAULTS.maxChangeKindFamilies) {
		risks.push({
			code: 'mixed_change_kind_budget_exceeded',
			severity: 'medium',
			detail: `Change kind family count ${changeKindFamilies.length} exceeds the conservative completion budget of ${SCOPE_DIFF_BUDGET_DEFAULTS.maxChangeKindFamilies}: ${changeKindFamilies.join(', ')}.`,
			count: changeKindFamilies.length,
			limit: SCOPE_DIFF_BUDGET_DEFAULTS.maxChangeKindFamilies,
			paths: firstPaths(report.files),
		});
	}

	return risks;
}
