export type PublicSurfaceDecisionKind = 'overview' | 'classified';

export interface PublicSurfaceClassification {
	readonly kind: string;
	readonly category: string;
	readonly isPublicSurface: boolean;
	readonly validationReasons: readonly string[];
	readonly affectedContracts: readonly string[];
}

export interface PublicSurfaceDecision {
	readonly kind: PublicSurfaceDecisionKind;
	readonly inputPath: string | null;
	readonly decision: string;
	readonly reason: string;
	readonly effectiveAction: string;
	readonly countsAsMustflowVerification: boolean;
	readonly sourceFiles: readonly string[];
	readonly surface: PublicSurfaceClassification;
}

const SOURCE_FILES = [
	'ROADMAP.md',
	'README.md',
	'.mustflow/docs/agent-workflow.md',
	'.mustflow/config/commands.toml',
	'.mustflow/config/preferences.toml',
];

const OVERVIEW_CLASSIFICATION: PublicSurfaceClassification = {
	kind: 'public_surface_model',
	category: 'policy',
	isPublicSurface: false,
	validationReasons: [],
	affectedContracts: ['change classification', 'verification selection', 'future public-surface drift checks'],
};

function toPosixPath(value: string): string {
	return value.split('\\').join('/');
}

function classifyPublicSurface(normalizedPath: string): PublicSurfaceClassification {
	if (normalizedPath === 'README.md') {
		return {
			kind: 'readme_page',
			category: 'documentation',
			isPublicSurface: true,
			validationReasons: ['docs_change', 'copy_change'],
			affectedContracts: ['public documentation', 'command examples'],
		};
	}

	if (/^docs-site\/src\/content\/docs\//u.test(normalizedPath)) {
		return {
			kind: 'docs_site_page',
			category: 'documentation',
			isPublicSurface: true,
			validationReasons: ['docs_change'],
			affectedContracts: ['documentation site', 'navigation links', 'localized content'],
		};
	}

	if (/^templates\/[^/]+\/locales\/[^/]+\//u.test(normalizedPath)) {
		return {
			kind: 'installed_template_translation',
			category: 'installed-template',
			isPublicSurface: true,
			validationReasons: ['i18n_change', 'template_version_change'],
			affectedContracts: ['installed template files', 'localized workflow documents', 'template i18n metadata'],
		};
	}

	if (/^templates\/[^/]+\//u.test(normalizedPath)) {
		return {
			kind: 'installed_template',
			category: 'installed-template',
			isPublicSurface: true,
			validationReasons: ['template_version_change', 'packaging_change'],
			affectedContracts: ['installed template files', 'package contents', 'template manifest'],
		};
	}

	if (/^(AGENTS\.md|\.mustflow\/(?:docs|context|skills|config)\/)/u.test(normalizedPath)) {
		return {
			kind: 'workflow_root',
			category: 'workflow',
			isPublicSurface: true,
			validationReasons: ['mustflow_docs_change', 'mustflow_config_change'],
			affectedContracts: ['agent workflow contract', 'command contract', 'installed workflow files'],
		};
	}

	if (/^examples\//u.test(normalizedPath)) {
		return {
			kind: 'example',
			category: 'example',
			isPublicSurface: true,
			validationReasons: ['docs_change', 'public_api_change'],
			affectedContracts: ['generated examples', 'human-readable examples'],
		};
	}

	if (/^schemas\//u.test(normalizedPath)) {
		return {
			kind: 'schema_contract',
			category: 'contract',
			isPublicSurface: true,
			validationReasons: ['public_api_change', 'release_risk'],
			affectedContracts: ['JSON schema', 'machine-readable output contract'],
		};
	}

	if (normalizedPath === 'package.json') {
		return {
			kind: 'package_metadata',
			category: 'release',
			isPublicSurface: true,
			validationReasons: ['package_metadata_change', 'release_risk'],
			affectedContracts: ['npm package metadata', 'published package contents'],
		};
	}

	if (/^(src|scripts|tests)\//u.test(normalizedPath)) {
		return {
			kind: 'implementation',
			category: 'code',
			isPublicSurface: false,
			validationReasons: ['code_change'],
			affectedContracts: ['runtime behavior when exported through CLI or package output'],
		};
	}

	return {
		kind: 'unclassified_path',
		category: 'unknown',
		isPublicSurface: false,
		validationReasons: [],
		affectedContracts: [],
	};
}

export function explainPublicSurface(relativePath?: string): PublicSurfaceDecision {
	if (!relativePath) {
		return {
			kind: 'overview',
			inputPath: null,
			decision: 'public surfaces are classified from repository-relative paths',
			reason: 'mustflow needs a shared model for README pages, docs-site pages, installed templates, generated examples, translations, and workflow roots before stronger drift checks can depend on it.',
			effectiveAction: 'Use mf explain surface <path> to inspect how a changed file should affect future verification and contract checks.',
			countsAsMustflowVerification: false,
			sourceFiles: SOURCE_FILES,
			surface: OVERVIEW_CLASSIFICATION,
		};
	}

	const normalizedPath = toPosixPath(relativePath);
	const surface = classifyPublicSurface(normalizedPath);
	const publicLabel = surface.isPublicSurface ? 'public surface' : 'non-public or internal surface';

	return {
		kind: 'classified',
		inputPath: normalizedPath,
		decision: `${normalizedPath} is classified as ${surface.kind}`,
		reason: `The path matches the ${surface.category} ${publicLabel} rule.`,
		effectiveAction: surface.validationReasons.length > 0
			? `Consider verification reasons: ${surface.validationReasons.join(', ')}.`
			: 'No specific public-surface verification reason is declared for this path yet.',
		countsAsMustflowVerification: false,
		sourceFiles: SOURCE_FILES,
		surface,
	};
}
