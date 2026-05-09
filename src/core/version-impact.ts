import type { ChangeClassificationReport } from './change-classification.js';

export type VersionBumpSuggestion = 'minor' | 'patch' | null;
export type VersionImpactSeverity = 'none' | 'metadata' | 'contract';

export interface VersionImpactSource {
	readonly path: string;
}

export interface VersionImpactSummary {
	readonly requiresVersionDecision: boolean;
	readonly severity: VersionImpactSeverity;
	readonly suggestedBump: VersionBumpSuggestion;
	readonly reasons: readonly string[];
	readonly affectedVersionSources: readonly string[];
	readonly affectedSurfaces: readonly string[];
}

const METADATA_REASONS = new Set([
	'package_metadata_change',
	'template_version_change',
	'packaging_change',
]);

const CONTRACT_REASONS = new Set([
	'public_api_change',
]);

const RELEASE_SENSITIVE_REASONS = new Set([
	...METADATA_REASONS,
	...CONTRACT_REASONS,
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
	const hasMetadataImpact =
		affectedVersionSources.length > 0 || [...validationReasons].some((reason) => METADATA_REASONS.has(reason));
	const hasContractImpact = [...validationReasons].some((reason) => CONTRACT_REASONS.has(reason));

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
	const severity: VersionImpactSeverity = hasContractImpact ? 'contract' : hasMetadataImpact ? 'metadata' : 'none';
	const requiresVersionDecision = reasons.length > 0;

	return {
		requiresVersionDecision,
		severity,
		suggestedBump: severity === 'contract' ? 'minor' : severity === 'metadata' ? 'patch' : null,
		reasons: uniqueSorted(reasons),
		affectedVersionSources: uniqueSorted(affectedVersionSources),
		affectedSurfaces,
	};
}
