import {
	CHANGE_CLASSIFICATION_RULE_DEFINITIONS,
	UNKNOWN_SURFACE,
	listChangeClassificationPolicyRuleDescriptors,
	type ChangeClassificationPolicyRuleDefinition,
} from './change-classification-policy.js';

export type ChangeSource = 'changed' | 'paths';

export type PublicSurfaceUpdatePolicy = 'update' | 'update_or_mark_stale' | 'not_applicable';

export const PUBLIC_SURFACE_UPDATE_POLICIES = [
	'update',
	'update_or_mark_stale',
	'not_applicable',
] as const satisfies readonly PublicSurfaceUpdatePolicy[];

export interface PublicSurfaceContract {
	readonly kind: string;
	readonly category: string;
	readonly isPublicSurface: boolean;
	readonly validationReasons: readonly string[];
	readonly affectedContracts: readonly string[];
	readonly updatePolicy: PublicSurfaceUpdatePolicy;
	readonly driftChecks: readonly string[];
}

export interface ChangeClassification {
	readonly path: string;
	readonly changeKinds: readonly string[];
	readonly surface: PublicSurfaceContract;
}

export interface ChangeClassificationSummary {
	readonly fileCount: number;
	readonly publicSurfaceCount: number;
	readonly changeKinds: readonly string[];
	readonly validationReasons: readonly string[];
	readonly updatePolicies: readonly PublicSurfaceUpdatePolicy[];
	readonly driftChecks: readonly string[];
	readonly affectedContracts: readonly string[];
}

export interface ChangeClassificationReport {
	readonly source: ChangeSource;
	readonly files: readonly string[];
	readonly classifications: readonly ChangeClassification[];
	readonly summary: ChangeClassificationSummary;
}

export type ChangeClassificationRulePatternKind = 'regexp';

export interface ChangeClassificationRuleDescriptor {
	readonly id: string;
	readonly patternKind: ChangeClassificationRulePatternKind;
	readonly pattern: string;
	readonly patternFlags: string;
	readonly changeKinds: readonly string[];
	readonly surface: PublicSurfaceContract;
}

interface ChangeClassificationRule extends ChangeClassificationRuleDescriptor {
	readonly match: RegExp;
}

function compileRule(definition: ChangeClassificationPolicyRuleDefinition): ChangeClassificationRule {
	return {
		id: definition.id,
		patternKind: 'regexp',
		pattern: definition.match.source,
		patternFlags: definition.match.flags,
		match: definition.match,
		changeKinds: definition.changeKinds,
		surface: definition.surface,
	};
}

const CHANGE_CLASSIFICATION_RULES: readonly ChangeClassificationRule[] =
	CHANGE_CLASSIFICATION_RULE_DEFINITIONS.map(compileRule);

function uniqueSorted(values: Iterable<string>): string[] {
	return [...new Set(values)].sort((left, right) => left.localeCompare(right));
}

function toPosixPath(value: string): string {
	return value.replaceAll('\\', '/');
}

export function normalizeStatusPath(value: string): string {
	const pathText = toPosixPath(value.trim());
	const renameTarget = pathText.includes(' -> ') ? (pathText.split(' -> ').pop() ?? pathText) : pathText;
	return renameTarget.replace(/^"|"$/gu, '');
}

function normalizePorcelainStatusPath(value: string): string {
	return toPosixPath(value);
}

function parseGitPorcelainStatusOutput(output: string): string[] {
	const paths: string[] = [];
	const parts = output.split('\0').filter((part) => part.length > 0);

	for (let index = 0; index < parts.length; index += 1) {
		const entry = parts[index] ?? '';
		const status = entry.slice(0, 2);
		const filePath = normalizePorcelainStatusPath(entry.slice(3));

		if (filePath.length > 0) {
			paths.push(filePath);
		}

		if (status.includes('R') || status.includes('C')) {
			index += 1;
		}
	}

	return uniqueSorted(paths);
}

export function parseGitStatusOutput(output: string): string[] {
	if (output.includes('\0')) {
		return parseGitPorcelainStatusOutput(output);
	}

	const paths = output
		.split(/\r?\n/u)
		.map((line) => line.slice(3))
		.map(normalizeStatusPath)
		.filter((line) => line.length > 0);

	return uniqueSorted(paths);
}

export function classifyChangePath(relativePath: string): ChangeClassification {
	const normalizedPath = normalizeStatusPath(relativePath);
	const rule = CHANGE_CLASSIFICATION_RULES.find((candidate) => candidate.match.test(normalizedPath));

	return {
		path: normalizedPath,
		changeKinds: rule?.changeKinds ?? ['unknown'],
		surface: rule?.surface ?? UNKNOWN_SURFACE,
	};
}

export function listChangeClassificationRuleDescriptors(): readonly ChangeClassificationRuleDescriptor[] {
	return listChangeClassificationPolicyRuleDescriptors();
}

export function listChangeClassificationValidationReasons(): readonly string[] {
	return uniqueSorted([
		...CHANGE_CLASSIFICATION_RULES.flatMap((classificationRule) => classificationRule.surface.validationReasons),
		...UNKNOWN_SURFACE.validationReasons,
	]);
}

export function createChangeClassificationReport(
	source: ChangeSource,
	relativePaths: readonly string[],
): ChangeClassificationReport {
	const files = uniqueSorted(relativePaths.map(normalizeStatusPath).filter((filePath) => filePath.length > 0));
	const classifications = files.map(classifyChangePath);

	return {
		source,
		files,
		classifications,
		summary: {
			fileCount: files.length,
			publicSurfaceCount: classifications.filter((classification) => classification.surface.isPublicSurface).length,
			changeKinds: uniqueSorted(classifications.flatMap((classification) => classification.changeKinds)),
			validationReasons: uniqueSorted(
				classifications.flatMap((classification) => classification.surface.validationReasons),
			),
			updatePolicies: uniqueSorted(
				classifications
					.map((classification) => classification.surface.updatePolicy)
					.filter((updatePolicy) => updatePolicy !== 'not_applicable'),
			) as PublicSurfaceUpdatePolicy[],
			driftChecks: uniqueSorted(classifications.flatMap((classification) => classification.surface.driftChecks)),
			affectedContracts: uniqueSorted(
				classifications.flatMap((classification) => classification.surface.affectedContracts),
			),
		},
	};
}
