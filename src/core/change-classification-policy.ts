import type {
	ChangeClassificationRuleDescriptor,
	PublicSurfaceContract,
	PublicSurfaceUpdatePolicy,
} from './change-classification.js';

export const CHANGE_CLASSIFICATION_POLICY_VERSION = '1';

export interface ChangeClassificationPolicyRuleDefinition {
	readonly id: string;
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

export const UNKNOWN_CHANGE_REASON = 'unknown_change';

export const UNKNOWN_SURFACE = surface(
	'unclassified_path',
	'unknown',
	false,
	[UNKNOWN_CHANGE_REASON],
	['unclassified repository path'],
	'not_applicable',
	['classification rule coverage'],
);

function rule(
	id: string,
	match: RegExp,
	changeKinds: readonly string[],
	surfaceContract: PublicSurfaceContract,
): ChangeClassificationPolicyRuleDefinition {
	return {
		id,
		match,
		changeKinds,
		surface: surfaceContract,
	};
}

export const CHANGE_CLASSIFICATION_RULE_DEFINITIONS: readonly ChangeClassificationPolicyRuleDefinition[] = [
	rule(
		'readme_page',
		/^README\.md$/u,
		['documentation'],
		surface(
			'readme_page',
			'documentation',
			true,
			['docs_change', 'copy_change'],
			['public documentation', 'command examples'],
			'update',
			['link targets', 'command examples', 'package metadata references'],
		),
	),
	rule(
		'docs_site_translation',
		/^docs-site\/src\/content\/docs\/(?!en\/)[^/]+\//u,
		['documentation', 'translation'],
		surface(
			'docs_site_translation',
			'documentation',
			true,
			['docs_change', 'i18n_change'],
			['documentation site', 'localized content', 'navigation links'],
			'update_or_mark_stale',
			['source page parity', 'navigation links', 'localized examples'],
		),
	),
	rule(
		'docs_site_page',
		/^docs-site\/src\/content\/docs\//u,
		['documentation'],
		surface(
			'docs_site_page',
			'documentation',
			true,
			['docs_change'],
			['documentation site', 'navigation links', 'localized content'],
			'update',
			['navigation links', 'localized copies', 'command examples'],
		),
	),
	rule(
		'installed_template_translation',
		/^templates\/[^/]+\/locales\/[^/]+\//u,
		['installed_template', 'translation'],
		surface(
			'installed_template_translation',
			'installed-template',
			true,
			['i18n_change', 'template_version_change'],
			['installed template files', 'localized workflow documents', 'template i18n metadata'],
			'update_or_mark_stale',
			['template i18n metadata', 'localized frontmatter', 'source revision'],
		),
	),
	rule(
		'installed_template',
		/^templates\/[^/]+\//u,
		['installed_template'],
		surface(
			'installed_template',
			'installed-template',
			true,
			['template_version_change', 'packaging_change'],
			['installed template files', 'package contents', 'template manifest'],
			'update',
			['template manifest', 'package inventory', 'localized copies'],
		),
	),
	rule(
		'workflow_root',
		/^(AGENTS\.md|\.mustflow\/(?:docs|context|skills|config)\/)/u,
		['workflow'],
		surface(
			'workflow_root',
			'workflow',
			true,
			['mustflow_docs_change', 'mustflow_config_change'],
			['agent workflow contract', 'command contract', 'installed workflow files'],
			'update',
			['strict workflow validation', 'installed template parity', 'skill route alignment'],
		),
	),
	rule(
		'host_instruction',
		/^(CLAUDE\.md|GEMINI\.md|\.github\/copilot-instructions\.md|\.cursor\/rules\/[^/]+\.(?:md|mdc))$/u,
		['workflow', 'host_instruction'],
		surface(
			'host_instruction',
			'workflow',
			true,
			['mustflow_docs_change'],
			['host instruction compatibility', 'agent workflow contract', 'command contract boundary'],
			'update_or_mark_stale',
			['host instruction conflicts', 'command contract boundary'],
		),
	),
	rule(
		'example',
		/^examples\//u,
		['example'],
		surface(
			'example',
			'example',
			true,
			['docs_change', 'public_api_change'],
			['generated examples', 'human-readable examples'],
			'update',
			['example commands', 'linked docs', 'public behavior claims'],
		),
	),
	rule(
		'schema_contract',
		/^schemas\//u,
		['schema'],
		surface(
			'schema_contract',
			'contract',
			true,
			['public_api_change', 'release_risk'],
			['JSON schema', 'machine-readable output contract'],
			'update',
			['schema tests', 'documented JSON fields', 'package inventory'],
		),
	),
	rule(
		'package_metadata',
		/^package\.json$/u,
		['package_metadata'],
		surface(
			'package_metadata',
			'release',
			true,
			['package_metadata_change', 'release_risk'],
			['npm package metadata', 'published package contents'],
			'update',
			['package metadata tests', 'version source discovery', 'published file inventory'],
		),
	),
	rule(
		'test_fixture',
		/^tests\/fixtures\//u,
		['test_fixture'],
		surface(
			'test_fixture',
			'test',
			false,
			['test_change'],
			['regression fixture inputs'],
			'not_applicable',
			['fixture safety', 'test route coverage'],
		),
	),
	rule(
		'test_contract',
		/^tests\//u,
		['test'],
		surface(
			'test_contract',
			'test',
			false,
			['test_change'],
			['test behavior contract'],
			'not_applicable',
			['related test selection'],
		),
	),
	rule(
		'implementation',
		/^(src|scripts)\//u,
		['implementation'],
		surface(
			'implementation',
			'code',
			false,
			['code_change'],
			['runtime behavior when exported through CLI or package output'],
			'not_applicable',
			['related tests', 'build output'],
		),
	),
];

export function listChangeClassificationPolicyRuleDescriptors(): readonly ChangeClassificationRuleDescriptor[] {
	return CHANGE_CLASSIFICATION_RULE_DEFINITIONS.map((classificationRule) => ({
		id: classificationRule.id,
		patternKind: 'regexp',
		pattern: classificationRule.match.source,
		patternFlags: classificationRule.match.flags,
		changeKinds: classificationRule.changeKinds,
		surface: classificationRule.surface,
	}));
}
