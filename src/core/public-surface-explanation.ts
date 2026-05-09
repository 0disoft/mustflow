import { classifyChangePath, type PublicSurfaceContract } from './change-classification.js';

export type PublicSurfaceDecisionKind = 'overview' | 'classified';

export interface PublicSurfaceDecision {
	readonly kind: PublicSurfaceDecisionKind;
	readonly inputPath: string | null;
	readonly decision: string;
	readonly reason: string;
	readonly effectiveAction: string;
	readonly countsAsMustflowVerification: boolean;
	readonly sourceFiles: readonly string[];
	readonly surface: PublicSurfaceContract;
}

const SOURCE_FILES = [
	'ROADMAP.md',
	'README.md',
	'.mustflow/docs/agent-workflow.md',
	'.mustflow/config/commands.toml',
	'.mustflow/config/preferences.toml',
];

const OVERVIEW_CLASSIFICATION: PublicSurfaceContract = {
	kind: 'public_surface_model',
	category: 'policy',
	isPublicSurface: false,
	validationReasons: [],
	affectedContracts: ['change classification', 'verification selection', 'future public-surface drift checks'],
	updatePolicy: 'not_applicable',
	driftChecks: ['docs', 'templates', 'translations', 'examples', 'schemas'],
};

function toPosixPath(value: string): string {
	return value.split('\\').join('/');
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
	const surface = classifyChangePath(normalizedPath).surface;
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
