import type { ChangeClassificationReport } from './change-classification.js';

export type VersionBumpSuggestion = 'patch' | null;

export interface VersionImpactSource {
	readonly path: string;
}

export interface VersionImpactSummary {
	readonly requiresVersionDecision: boolean;
	readonly suggestedBump: VersionBumpSuggestion;
	readonly reasons: readonly string[];
	readonly affectedVersionSources: readonly string[];
	readonly affectedSurfaces: readonly string[];
}

const RELEASE_SENSITIVE_REASONS = new Set([
	'package_metadata_change',
	'template_version_change',
	'packaging_change',
	'public_api_change',
	'release_risk',
]);

function uniqueSorted(values: Iterable<string>): string[] {
	return [...new Set(values)].sort((left, right) => left.localeCompare(right));
}

export function summarizeVersionImpact(
	classificationReport: ChangeClassificationReport,
	versionSources: readonly VersionImpactSource[],
): VersionImpactSummary {
	const changedFiles = new Set(classificationReport.files);
	const affectedVersionSources = versionSources
		.filter((source) => changedFiles.has(source.path))
		.map((source) => source.path);
	const validationReasons = new Set(classificationReport.summary.validationReasons);
	const reasons: string[] = [];

	if (affectedVersionSources.length > 0) {
		reasons.push('version_source_changed');
	}

	if (validationReasons.has('package_metadata_change')) {
		reasons.push('package_metadata_changed');
	}

	if (validationReasons.has('template_version_change')) {
		reasons.push('template_surface_changed');
	}

	if (validationReasons.has('public_api_change')) {
		reasons.push('public_contract_changed');
	}

	if ([...validationReasons].some((reason) => RELEASE_SENSITIVE_REASONS.has(reason))) {
		reasons.push('release_sensitive_surface_changed');
	}

	const affectedSurfaces = uniqueSorted(
		classificationReport.classifications
			.filter((classification) => classification.surface.isPublicSurface)
			.map((classification) => classification.surface.kind),
	);
	const requiresVersionDecision = reasons.length > 0;

	return {
		requiresVersionDecision,
		suggestedBump: requiresVersionDecision ? 'patch' : null,
		reasons: uniqueSorted(reasons),
		affectedVersionSources: uniqueSorted(affectedVersionSources),
		affectedSurfaces,
	};
}
