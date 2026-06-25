import path from 'node:path';

export type ChangeSurface =
	| 'source'
	| 'test'
	| 'docs'
	| 'schema'
	| 'config'
	| 'package'
	| 'template'
	| 'workflow'
	| 'i18n'
	| 'unknown';

export type ChangedPathStatus = 'added' | 'modified' | 'deleted' | 'renamed' | 'type_changed' | 'untracked';

export type SelectorFallbackReason =
	| 'changed_test'
	| 'sibling_test'
	| 'importer_sibling_test'
	| 'fallback_lockfile'
	| 'fallback_package_metadata'
	| 'fallback_template'
	| 'fallback_compiler_or_runner_config'
	| 'fallback_shared_test_fixture'
	| 'fallback_migration_or_database'
	| 'fallback_generated_contract'
	| 'fallback_ci_workflow'
	| 'fallback_mustflow_workflow'
	| 'fallback_deleted'
	| 'fallback_renamed'
	| 'fallback_type_changed'
	| 'fallback_package_or_template'
	| 'fallback_schema'
	| 'fallback_workflow_or_config'
	| 'fallback_deleted_or_renamed'
	| 'fallback_unknown'
	| 'fallback_truncated'
	| 'no_changed_files';

export interface ClassifyChangeSurfaceOptions {
	readonly includeDocsSite?: boolean;
}

export interface ChangedPathForFallback {
	readonly path: string;
	readonly status: ChangedPathStatus;
	readonly surface: ChangeSurface;
}

export interface SelectorFallbackDescriptor {
	readonly reason: SelectorFallbackReason;
	readonly path: string;
	readonly message: string;
	readonly recommended_intent: string;
}

export const CHANGE_SOURCE_EXTENSIONS = ['.ts', '.tsx', '.mts', '.cts', '.js', '.jsx', '.mjs', '.cjs'] as const;

const PACKAGE_LOCKFILES = new Set(['bun.lock', 'package-lock.json', 'pnpm-lock.yaml', 'yarn.lock', 'deno.lock']);

function toPosixPath(value: string): string {
	return value.replace(/\\/gu, '/');
}

export function normalizeChangePath(value: string): string {
	return toPosixPath(value).replace(/^\.\/+/u, '') || '.';
}

export function statusFromGitNameStatus(code: string): ChangedPathStatus {
	if (code.startsWith('A')) {
		return 'added';
	}
	if (code.startsWith('D')) {
		return 'deleted';
	}
	if (code.startsWith('R')) {
		return 'renamed';
	}
	if (code.startsWith('T')) {
		return 'type_changed';
	}
	return 'modified';
}

export function classifyChangeSurface(
	relativePath: string,
	options: ClassifyChangeSurfaceOptions = {},
): ChangeSurface {
	const normalized = normalizeChangePath(relativePath);
	const extension = path.extname(normalized).toLowerCase();
	const basename = path.basename(normalized).toLowerCase();

	if (normalized.startsWith('.github/workflows/')) {
		return 'workflow';
	}
	if (normalized.startsWith('.mustflow/')) {
		return 'workflow';
	}
	if (normalized.startsWith('templates/')) {
		return 'template';
	}
	if (normalized.startsWith('schemas/') || basename.endsWith('.schema.json')) {
		return 'schema';
	}
	if (
		normalized.startsWith('docs') ||
		(options.includeDocsSite === true && normalized.startsWith('docs-site/')) ||
		['.md', '.mdx'].includes(extension)
	) {
		return 'docs';
	}
	if (normalized.includes('/i18n/') || normalized.includes('/locales/') || basename.includes('i18n')) {
		return 'i18n';
	}
	if (normalized === 'package.json' || PACKAGE_LOCKFILES.has(normalized)) {
		return 'package';
	}
	if (/^(?:tsconfig|eslint|vite|vitest|jest|playwright|astro|svelte|tailwind)\b/u.test(basename)) {
		return 'config';
	}
	if (
		normalized.startsWith('tests/') ||
		/\.test\.[cm]?[jt]sx?$/u.test(normalized) ||
		/\.spec\.[cm]?[jt]sx?$/u.test(normalized)
	) {
		return 'test';
	}
	if (CHANGE_SOURCE_EXTENSIONS.includes(extension as (typeof CHANGE_SOURCE_EXTENSIONS)[number])) {
		return 'source';
	}
	return 'unknown';
}

export function selectorFallbackReasonForChangedPath(
	changedPath: ChangedPathForFallback,
): SelectorFallbackReason | null {
	const normalized = normalizeChangePath(changedPath.path);
	const basename = path.posix.basename(normalized).toLowerCase();

	if (changedPath.status === 'deleted') {
		return 'fallback_deleted';
	}
	if (changedPath.status === 'renamed') {
		return 'fallback_renamed';
	}
	if (changedPath.status === 'type_changed') {
		return 'fallback_type_changed';
	}
	if (PACKAGE_LOCKFILES.has(normalized)) {
		return 'fallback_lockfile';
	}
	if (basename === 'package.json') {
		return 'fallback_package_metadata';
	}
	if (changedPath.surface === 'template') {
		return 'fallback_template';
	}
	if (isGeneratedContractPath(normalized)) {
		return 'fallback_generated_contract';
	}
	if (isSharedTestFixturePath(normalized)) {
		return 'fallback_shared_test_fixture';
	}
	if (isMigrationOrDatabasePath(normalized)) {
		return 'fallback_migration_or_database';
	}
	if (normalized.startsWith('.github/workflows/')) {
		return 'fallback_ci_workflow';
	}
	if (normalized.startsWith('.mustflow/')) {
		return 'fallback_mustflow_workflow';
	}
	if (isCompilerOrRunnerConfigPath(normalized) || changedPath.surface === 'config') {
		return 'fallback_compiler_or_runner_config';
	}
	if (changedPath.surface === 'unknown') {
		return 'fallback_unknown';
	}
	return null;
}

export function selectorFallbackForChangedPath(
	changedPath: ChangedPathForFallback,
): SelectorFallbackDescriptor | null {
	const reason = selectorFallbackReasonForChangedPath(changedPath);
	if (reason === null) {
		return null;
	}
	return {
		reason,
		path: changedPath.path,
		message: selectorFallbackMessage(reason),
		recommended_intent: selectorFallbackRecommendedIntent(reason),
	};
}

function isSharedTestFixturePath(normalized: string): boolean {
	return (
		normalized.startsWith('tests/fixtures/') ||
		normalized.startsWith('test/fixtures/') ||
		normalized.startsWith('fixtures/') ||
		/(?:^|\/)(?:test-)?setup\.[cm]?[jt]s$/u.test(normalized) ||
		/(?:^|\/)(?:global-)?setup\.[cm]?[jt]s$/u.test(normalized)
	);
}

function isMigrationOrDatabasePath(normalized: string): boolean {
	const basename = path.posix.basename(normalized).toLowerCase();
	return (
		normalized.includes('/migrations/') ||
		normalized.startsWith('migrations/') ||
		normalized.includes('/db/') ||
		normalized.includes('/database/') ||
		basename === 'schema.prisma' ||
		basename.endsWith('.sql')
	);
}

function isGeneratedContractPath(normalized: string): boolean {
	const basename = path.posix.basename(normalized).toLowerCase();
	return (
		normalized.startsWith('schemas/') ||
		basename.endsWith('.schema.json') ||
		basename === 'openapi.json' ||
		basename === 'openapi.yaml' ||
		basename === 'openapi.yml' ||
		basename === 'asyncapi.json' ||
		basename === 'asyncapi.yaml' ||
		basename === 'asyncapi.yml' ||
		basename === 'schema.graphql'
	);
}

function isCompilerOrRunnerConfigPath(normalized: string): boolean {
	const basename = path.posix.basename(normalized).toLowerCase();
	return /^(?:tsconfig|eslint|vite|vitest|jest|playwright|astro|svelte|tailwind|webpack|rollup|babel|nyc|c8)\b/u.test(
		basename,
	);
}

function selectorFallbackMessage(reason: SelectorFallbackReason): string {
	switch (reason) {
		case 'fallback_deleted':
			return 'Deleted files can invalidate stale tests, public exports, and static dependency mappings.';
		case 'fallback_renamed':
			return 'Renamed files can leave stale import paths, test mappings, and documentation references behind.';
		case 'fallback_type_changed':
			return 'Type-changed files can change executable behavior in ways static test narrowing cannot classify.';
		case 'fallback_lockfile':
			return 'Lockfile changes can alter dependency resolution, toolchain behavior, and package artifacts.';
		case 'fallback_package_metadata':
			return 'Package metadata can change runtime entrypoints, scripts, dependencies, files, and release behavior.';
		case 'fallback_template':
			return 'Template changes can alter installed workflow contracts and downstream repository behavior.';
		case 'fallback_generated_contract':
			return 'Schema, OpenAPI, GraphQL, or generated-contract changes need contract and release-sensitive verification.';
		case 'fallback_shared_test_fixture':
			return 'Shared test fixtures or setup files can affect many tests outside the static source map.';
		case 'fallback_migration_or_database':
			return 'Migration, database, or SQL changes can alter shared test state and runtime contracts.';
		case 'fallback_ci_workflow':
			return 'CI workflow changes can alter job ordering, environment, caches, and selected-test safety.';
		case 'fallback_mustflow_workflow':
			return 'Mustflow workflow changes can alter command contracts, routing, skills, or verification policy.';
		case 'fallback_compiler_or_runner_config':
			return 'Compiler, bundler, lint, or test-runner config changes are unsafe for static test narrowing.';
		case 'fallback_unknown':
			return 'Unknown change surfaces need the configured fallback path instead of selected-test confidence.';
		default:
			return 'Changed files need the configured fallback path instead of selected-test confidence.';
	}
}

function selectorFallbackRecommendedIntent(reason: SelectorFallbackReason): string {
	switch (reason) {
		case 'fallback_lockfile':
		case 'fallback_package_metadata':
		case 'fallback_template':
		case 'fallback_generated_contract':
			return 'test_release';
		case 'fallback_migration_or_database':
		case 'fallback_unknown':
			return 'test';
		default:
			return 'test_related';
	}
}
