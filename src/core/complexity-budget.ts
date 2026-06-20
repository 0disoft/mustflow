import type { ChangeClassificationSummary } from './change-classification.js';
import type { ChangeVerificationReport } from './change-verification.js';

export type ComplexityBudgetStatus = 'within_budget' | 'review_required';
export type ComplexityBudgetRiskCode =
	| 'complexity_score_budget_exceeded'
	| 'dependency_surface_requires_justification'
	| 'helper_container_requires_justification'
	| 'configuration_surface_budget_exceeded'
	| 'schema_surface_budget_exceeded';

export interface ComplexityBudgetMetric {
	readonly name: string;
	readonly value: number;
	readonly weight: number;
	readonly weighted_score: number;
}

export interface ComplexityBudgetRisk {
	readonly code: ComplexityBudgetRiskCode;
	readonly severity: 'warning';
	readonly detail: string;
	readonly count: number;
	readonly limit: number;
	readonly paths: readonly string[];
}

export interface ComplexityBudgetReport {
	readonly schema_version: '1';
	readonly source: 'change_classification';
	readonly status: ComplexityBudgetStatus;
	readonly score: number;
	readonly budget: number;
	readonly metrics: readonly ComplexityBudgetMetric[];
	readonly risks: readonly ComplexityBudgetRisk[];
	readonly review_prompts: readonly string[];
}

interface ComplexityBudgetInput {
	readonly files: readonly string[];
	readonly summary: ChangeClassificationSummary;
}

export const COMPLEXITY_BUDGET_DEFAULTS = {
	scoreBudget: 12,
	maxConfigSurfaces: 2,
	maxSchemaSurfaces: 2,
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

const DEPENDENCY_SURFACE_FILENAMES = new Set([
	'package.json',
	'package-lock.json',
	'pnpm-lock.yaml',
	'bun.lock',
	'bun.lockb',
	'yarn.lock',
	'Cargo.toml',
	'Cargo.lock',
	'go.mod',
	'go.sum',
	'pyproject.toml',
	'pom.xml',
	'build.gradle',
	'deno.json',
	'deno.jsonc',
]);
const CONFIG_SURFACE_FILENAMES = new Set(['Makefile', 'justfile', 'Dockerfile']);
const CONFIG_FILE_PATTERN = /(?:config|rc)\.(?:cjs|cts|js|json|mjs|mts|toml|ts|yaml|yml)$/u;
const HELPER_FILE_PATTERN =
	/.*(?:helper|helpers|util|utils|manager|common|misc).*\.(?:cjs|cts|go|java|js|jsx|kt|mjs|mts|php|ps1|py|rb|rs|swift|ts|tsx)$/u;
const REQUIREMENTS_FILE_PATTERN = /^requirements(?:-[^/]*)?\.txt$/u;
const TSCONFIG_FILE_PATTERN = /^tsconfig[^/]*\.json$/u;

function uniqueSorted(values: Iterable<string>): readonly string[] {
	return [...new Set(values)].sort((left, right) => left.localeCompare(right));
}

function changeKindFamily(kind: string): string {
	return CHANGE_KIND_FAMILY_BY_KIND[kind] ?? kind;
}

function baseName(file: string): string {
	const slashIndex = file.lastIndexOf('/');
	return slashIndex === -1 ? file : file.slice(slashIndex + 1);
}

function isDependencySurface(file: string): boolean {
	const name = baseName(file);
	return DEPENDENCY_SURFACE_FILENAMES.has(name) || REQUIREMENTS_FILE_PATTERN.test(name);
}

function isConfigurationSurface(file: string): boolean {
	const name = baseName(file);
	return (
		file.startsWith('.github/') ||
		file.startsWith('.mustflow/config/') ||
		CONFIG_SURFACE_FILENAMES.has(name) ||
		CONFIG_FILE_PATTERN.test(name) ||
		TSCONFIG_FILE_PATTERN.test(name)
	);
}

function isHelperContainer(file: string): boolean {
	return HELPER_FILE_PATTERN.test(baseName(file));
}

function isSchemaSurface(file: string): boolean {
	return file.startsWith('schemas/') && file.endsWith('.schema.json');
}

function matchingPaths(files: readonly string[], predicate: (file: string) => boolean): readonly string[] {
	return files.filter(predicate);
}

function firstPaths(paths: readonly string[]): readonly string[] {
	return paths.slice(0, COMPLEXITY_BUDGET_DEFAULTS.maxPathsPerRisk);
}

function metric(name: string, value: number, weight: number): ComplexityBudgetMetric {
	return {
		name,
		value,
		weight,
		weighted_score: value * weight,
	};
}

function scoreMetrics(input: ComplexityBudgetInput): readonly ComplexityBudgetMetric[] {
	const families = uniqueSorted(input.summary.changeKinds.map(changeKindFamily));
	const dependencySurfaces = matchingPaths(input.files, isDependencySurface);
	const configSurfaces = matchingPaths(input.files, isConfigurationSurface);
	const helperContainers = matchingPaths(input.files, isHelperContainer);
	const schemaSurfaces = matchingPaths(input.files, isSchemaSurface);

	return [
		metric('changed_files', input.summary.fileCount, 1),
		metric('public_surfaces', input.summary.publicSurfaceCount, 2),
		metric('change_kind_families_beyond_one', Math.max(0, families.length - 1), 2),
		metric('dependency_surfaces', dependencySurfaces.length, 5),
		metric('configuration_surfaces', configSurfaces.length, 3),
		metric('helper_containers', helperContainers.length, 3),
		metric('schema_surfaces', schemaSurfaces.length, 2),
	];
}

function risk(input: {
	readonly code: ComplexityBudgetRiskCode;
	readonly detail: string;
	readonly count: number;
	readonly limit: number;
	readonly paths: readonly string[];
}): ComplexityBudgetRisk {
	return {
		code: input.code,
		severity: 'warning',
		detail: input.detail,
		count: input.count,
		limit: input.limit,
		paths: firstPaths(input.paths),
	};
}

function createComplexityBudgetRisks(input: ComplexityBudgetInput, score: number): readonly ComplexityBudgetRisk[] {
	const dependencySurfaces = matchingPaths(input.files, isDependencySurface);
	const configSurfaces = matchingPaths(input.files, isConfigurationSurface);
	const helperContainers = matchingPaths(input.files, isHelperContainer);
	const schemaSurfaces = matchingPaths(input.files, isSchemaSurface);
	const risks: ComplexityBudgetRisk[] = [];

	if (score > COMPLEXITY_BUDGET_DEFAULTS.scoreBudget) {
		risks.push(risk({
			code: 'complexity_score_budget_exceeded',
			detail: `Complexity score ${score} exceeds the review budget of ${COMPLEXITY_BUDGET_DEFAULTS.scoreBudget}.`,
			count: score,
			limit: COMPLEXITY_BUDGET_DEFAULTS.scoreBudget,
			paths: input.files,
		}));
	}

	if (dependencySurfaces.length > 0) {
		risks.push(risk({
			code: 'dependency_surface_requires_justification',
			detail: [
				'Dependency or package manifest changes add operational cost;',
				'justify the dependency boundary and rollback path.',
			].join(' '),
			count: dependencySurfaces.length,
			limit: 0,
			paths: dependencySurfaces,
		}));
	}

	if (helperContainers.length > 0) {
		risks.push(risk({
			code: 'helper_container_requires_justification',
			detail: [
				'Helper, util, common, manager, or misc files tend to hide broad abstractions;',
				'justify why the new surface reduces net complexity.',
			].join(' '),
			count: helperContainers.length,
			limit: 0,
			paths: helperContainers,
		}));
	}

	if (configSurfaces.length > COMPLEXITY_BUDGET_DEFAULTS.maxConfigSurfaces) {
		risks.push(risk({
			code: 'configuration_surface_budget_exceeded',
			detail: [
				`Configuration surface count ${configSurfaces.length}`,
				`exceeds the review budget of ${COMPLEXITY_BUDGET_DEFAULTS.maxConfigSurfaces}.`,
			].join(' '),
			count: configSurfaces.length,
			limit: COMPLEXITY_BUDGET_DEFAULTS.maxConfigSurfaces,
			paths: configSurfaces,
		}));
	}

	if (schemaSurfaces.length > COMPLEXITY_BUDGET_DEFAULTS.maxSchemaSurfaces) {
		risks.push(risk({
			code: 'schema_surface_budget_exceeded',
			detail: [
				`Schema surface count ${schemaSurfaces.length}`,
				`exceeds the review budget of ${COMPLEXITY_BUDGET_DEFAULTS.maxSchemaSurfaces}.`,
			].join(' '),
			count: schemaSurfaces.length,
			limit: COMPLEXITY_BUDGET_DEFAULTS.maxSchemaSurfaces,
			paths: schemaSurfaces,
		}));
	}

	return risks;
}

function reviewPrompts(risks: readonly ComplexityBudgetRisk[]): readonly string[] {
	if (risks.length === 0) {
		return [];
	}

	return [
		'Explain why this added complexity is necessary for the requested outcome.',
		'Name the simpler alternative that was rejected and why it is not enough.',
		'Identify the rollback or removal path if the added surface proves unnecessary.',
	];
}

export function createComplexityBudgetReport(input: ComplexityBudgetInput): ComplexityBudgetReport {
	const metrics = scoreMetrics(input);
	const score = metrics.reduce((total, entry) => total + entry.weighted_score, 0);
	const risks = createComplexityBudgetRisks(input, score);

	return {
		schema_version: '1',
		source: 'change_classification',
		status: risks.length > 0 ? 'review_required' : 'within_budget',
		score,
		budget: COMPLEXITY_BUDGET_DEFAULTS.scoreBudget,
		metrics,
		risks,
		review_prompts: reviewPrompts(risks),
	};
}

export function createComplexityBudgetReportFromVerification(
	report: ChangeVerificationReport,
): ComplexityBudgetReport {
	return createComplexityBudgetReport({
		files: report.files,
		summary: report.classification_summary,
	});
}
