export type ChangeSource = 'changed' | 'paths';

export type PublicSurfaceUpdatePolicy = 'update' | 'update_or_mark_stale' | 'not_applicable';

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

interface ChangeClassificationRule {
	readonly match: RegExp;
	readonly changeKinds: readonly string[];
	readonly surface: PublicSurfaceContract;
}

function surface(
	kind: string,
	category: string,
	isPublicSurface: boolean,
	validationReasons: readonly string[],
	affectedContracts: readonly string[],
	updatePolicy: PublicSurfaceUpdatePolicy,
	driftChecks: readonly string[],
): PublicSurfaceContract {
	return {
		kind,
		category,
		isPublicSurface,
		validationReasons,
		affectedContracts,
		updatePolicy,
		driftChecks,
	};
}

const UNKNOWN_SURFACE = surface('unclassified_path', 'unknown', false, [], [], 'not_applicable', []);

const CHANGE_CLASSIFICATION_RULES: readonly ChangeClassificationRule[] = [
	{
		match: /^README\.md$/u,
		changeKinds: ['documentation'],
		surface: surface(
			'readme_page',
			'documentation',
			true,
			['docs_change', 'copy_change'],
			['public documentation', 'command examples'],
			'update',
			['link targets', 'command examples', 'package metadata references'],
		),
	},
	{
		match: /^docs-site\/src\/content\/docs\/(?!en\/)[^/]+\//u,
		changeKinds: ['documentation', 'translation'],
		surface: surface(
			'docs_site_translation',
			'documentation',
			true,
			['docs_change', 'i18n_change'],
			['documentation site', 'localized content', 'navigation links'],
			'update_or_mark_stale',
			['source page parity', 'navigation links', 'localized examples'],
		),
	},
	{
		match: /^docs-site\/src\/content\/docs\//u,
		changeKinds: ['documentation'],
		surface: surface(
			'docs_site_page',
			'documentation',
			true,
			['docs_change'],
			['documentation site', 'navigation links', 'localized content'],
			'update',
			['navigation links', 'localized copies', 'command examples'],
		),
	},
	{
		match: /^templates\/[^/]+\/locales\/[^/]+\//u,
		changeKinds: ['installed_template', 'translation'],
		surface: surface(
			'installed_template_translation',
			'installed-template',
			true,
			['i18n_change', 'template_version_change'],
			['installed template files', 'localized workflow documents', 'template i18n metadata'],
			'update_or_mark_stale',
			['template i18n metadata', 'localized frontmatter', 'source revision'],
		),
	},
	{
		match: /^templates\/[^/]+\//u,
		changeKinds: ['installed_template'],
		surface: surface(
			'installed_template',
			'installed-template',
			true,
			['template_version_change', 'packaging_change'],
			['installed template files', 'package contents', 'template manifest'],
			'update',
			['template manifest', 'package inventory', 'localized copies'],
		),
	},
	{
		match: /^(AGENTS\.md|\.mustflow\/(?:docs|context|skills|config)\/)/u,
		changeKinds: ['workflow'],
		surface: surface(
			'workflow_root',
			'workflow',
			true,
			['mustflow_docs_change', 'mustflow_config_change'],
			['agent workflow contract', 'command contract', 'installed workflow files'],
			'update',
			['strict workflow validation', 'installed template parity', 'skill route alignment'],
		),
	},
	{
		match: /^examples\//u,
		changeKinds: ['example'],
		surface: surface(
			'example',
			'example',
			true,
			['docs_change', 'public_api_change'],
			['generated examples', 'human-readable examples'],
			'update',
			['example commands', 'linked docs', 'public behavior claims'],
		),
	},
	{
		match: /^schemas\//u,
		changeKinds: ['schema'],
		surface: surface(
			'schema_contract',
			'contract',
			true,
			['public_api_change', 'release_risk'],
			['JSON schema', 'machine-readable output contract'],
			'update',
			['schema tests', 'documented JSON fields', 'package inventory'],
		),
	},
	{
		match: /^package\.json$/u,
		changeKinds: ['package_metadata'],
		surface: surface(
			'package_metadata',
			'release',
			true,
			['package_metadata_change', 'release_risk'],
			['npm package metadata', 'published package contents'],
			'update',
			['package metadata tests', 'version source discovery', 'published file inventory'],
		),
	},
	{
		match: /^tests\/fixtures\//u,
		changeKinds: ['test_fixture'],
		surface: surface(
			'test_fixture',
			'test',
			false,
			['test_change'],
			['regression fixture inputs'],
			'not_applicable',
			['fixture safety', 'test route coverage'],
		),
	},
	{
		match: /^tests\//u,
		changeKinds: ['test'],
		surface: surface(
			'test_contract',
			'test',
			false,
			['test_change'],
			['test behavior contract'],
			'not_applicable',
			['related test selection'],
		),
	},
	{
		match: /^(src|scripts)\//u,
		changeKinds: ['implementation'],
		surface: surface(
			'implementation',
			'code',
			false,
			['code_change'],
			['runtime behavior when exported through CLI or package output'],
			'not_applicable',
			['related tests', 'build output'],
		),
	},
];

function uniqueSorted(values: Iterable<string>): string[] {
	return [...new Set(values)].sort((left, right) => left.localeCompare(right));
}

function toPosixPath(value: string): string {
	return value.trim().replaceAll('\\', '/');
}

export function normalizeStatusPath(value: string): string {
	const pathText = toPosixPath(value);
	const renameTarget = pathText.includes(' -> ') ? (pathText.split(' -> ').pop() ?? pathText) : pathText;
	return renameTarget.replace(/^"|"$/gu, '');
}

export function parseGitStatusOutput(output: string): string[] {
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
