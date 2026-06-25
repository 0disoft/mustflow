import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync } from 'node:fs';
import path from 'node:path';

import { inspectDependencyGraph } from './dependency-graph.js';
import type {
	ScriptCheckFinding,
	ScriptCheckFindingSeverity,
	ScriptCheckStatus,
} from './script-check-result.js';

export const TEST_REGRESSION_SELECTOR_PACK_ID = 'test';
export const TEST_REGRESSION_SELECTOR_SCRIPT_ID = 'regression-selector';
export const TEST_REGRESSION_SELECTOR_SCRIPT_REF =
	`${TEST_REGRESSION_SELECTOR_PACK_ID}/${TEST_REGRESSION_SELECTOR_SCRIPT_ID}`;

export type TestRegressionSelectorAction = 'select';
export type TestRegressionSelectorSurface =
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
export type TestRegressionSelectorFileStatus = 'added' | 'modified' | 'deleted' | 'renamed' | 'type_changed' | 'untracked';
export type TestRegressionSelectorStatus = 'selected' | 'fallback' | 'empty';
export type TestRegressionSelectorConfidence = 'high' | 'medium' | 'low';
export type TestRegressionSelectorReason =
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
export type TestRegressionSelectorFindingCode =
	| 'test_regression_selector_git_unavailable'
	| 'test_regression_selector_invalid_ref'
	| 'test_regression_selector_max_files_exceeded'
	| 'test_regression_selector_max_tests_exceeded';

export interface TestRegressionSelectorPolicy {
	readonly base_ref: string;
	readonly head_ref: string | null;
	readonly compare_worktree: boolean;
	readonly max_files: number;
	readonly max_tests: number;
	readonly path_filters: readonly string[];
}

export interface TestRegressionSelectorChangedFile {
	readonly path: string;
	readonly previous_path: string | null;
	readonly status: TestRegressionSelectorFileStatus;
	readonly surface: TestRegressionSelectorSurface;
}

export interface TestRegressionSelectorTestCandidate {
	readonly path: string;
	readonly exists: boolean;
	readonly reason: TestRegressionSelectorReason;
	readonly reasons: readonly TestRegressionSelectorReason[];
	readonly source_path: string;
	readonly source_paths: readonly string[];
	readonly confidence: number;
}

export interface TestRegressionSelectorFallback {
	readonly reason: TestRegressionSelectorReason;
	readonly path: string;
	readonly message: string;
	readonly recommended_intent: string;
}

export interface TestRegressionSelectorSummary {
	readonly changed_file_count: number;
	readonly selected_test_count: number;
	readonly missing_candidate_count: number;
	readonly fallback_count: number;
	readonly selection_status: TestRegressionSelectorStatus;
	readonly confidence: TestRegressionSelectorConfidence;
	readonly recommended_intent: string;
}

export interface TestRegressionSelectorFinding extends ScriptCheckFinding {
	readonly code: TestRegressionSelectorFindingCode;
	readonly path: string;
}

export interface TestRegressionSelectorReport {
	readonly schema_version: '1';
	readonly command: 'script-pack';
	readonly pack_id: typeof TEST_REGRESSION_SELECTOR_PACK_ID;
	readonly script_id: typeof TEST_REGRESSION_SELECTOR_SCRIPT_ID;
	readonly script_ref: typeof TEST_REGRESSION_SELECTOR_SCRIPT_REF;
	readonly action: TestRegressionSelectorAction;
	readonly status: ScriptCheckStatus;
	readonly ok: boolean;
	readonly mustflow_root: string;
	readonly policy: TestRegressionSelectorPolicy;
	readonly input_hash: string;
	readonly summary: TestRegressionSelectorSummary;
	readonly changed_files: readonly TestRegressionSelectorChangedFile[];
	readonly selected_tests: readonly TestRegressionSelectorTestCandidate[];
	readonly missing_candidates: readonly TestRegressionSelectorTestCandidate[];
	readonly fallbacks: readonly TestRegressionSelectorFallback[];
	readonly run_hint: string | null;
	readonly truncated: boolean;
	readonly findings: readonly TestRegressionSelectorFinding[];
	readonly issues: readonly string[];
}

export interface CreateTestRegressionSelectorOptions {
	readonly baseRef?: string;
	readonly headRef?: string | null;
	readonly paths?: readonly string[];
	readonly maxFiles?: number;
	readonly maxTests?: number;
}

interface GitResult {
	readonly ok: boolean;
	readonly stdout: string;
	readonly stderr: string;
	readonly status: number | null;
}

const DEFAULT_BASE_REF = 'HEAD';
const DEFAULT_MAX_FILES = 200;
const DEFAULT_MAX_TESTS = 100;
const SOURCE_EXTENSIONS = ['.ts', '.tsx', '.mts', '.cts', '.js', '.jsx', '.mjs', '.cjs'] as const;
const PACKAGE_LOCKFILES = new Set(['bun.lock', 'package-lock.json', 'pnpm-lock.yaml', 'yarn.lock', 'deno.lock']);

function toPosixPath(value: string): string {
	return value.replace(/\\/gu, '/');
}

function normalizeRelativePath(value: string): string {
	return toPosixPath(value).replace(/^\.\/+/u, '') || '.';
}

function sha256Tagged(value: string): string {
	return `sha256:${createHash('sha256').update(value).digest('hex')}`;
}

function runGit(root: string, args: readonly string[]): GitResult {
	const result = spawnSync('git', [...args], {
		cwd: root,
		encoding: 'utf8',
		stdio: ['ignore', 'pipe', 'pipe'],
		windowsHide: true,
		maxBuffer: 16 * 1024 * 1024,
	});
	return {
		ok: result.status === 0,
		stdout: result.stdout ?? '',
		stderr: result.stderr ?? '',
		status: result.status,
	};
}

function isInsideGitWorktree(root: string): boolean {
	const result = runGit(root, ['rev-parse', '--is-inside-work-tree']);
	return result.ok && result.stdout.trim() === 'true';
}

function makeFinding(
	code: TestRegressionSelectorFindingCode,
	severity: ScriptCheckFindingSeverity,
	pathValue: string,
	message: string,
): TestRegressionSelectorFinding {
	return { code, severity, path: pathValue, message };
}

function surfaceForPath(relativePath: string): TestRegressionSelectorSurface {
	const normalized = normalizeRelativePath(relativePath);
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
	if (normalized.startsWith('docs') || normalized.startsWith('docs-site/') || ['.md', '.mdx'].includes(extension)) {
		return 'docs';
	}
	if (normalized.includes('/i18n/') || normalized.includes('/locales/') || basename.includes('i18n')) {
		return 'i18n';
	}
	if (
		['package.json', 'bun.lock', 'package-lock.json', 'pnpm-lock.yaml', 'yarn.lock', 'deno.lock'].includes(normalized)
	) {
		return 'package';
	}
	if (/^(?:tsconfig|eslint|vite|vitest|jest|playwright|astro|svelte|tailwind)\b/u.test(basename)) {
		return 'config';
	}
	if (normalized.startsWith('tests/') || /\.test\.[cm]?[jt]sx?$/u.test(normalized) || /\.spec\.[cm]?[jt]sx?$/u.test(normalized)) {
		return 'test';
	}
	if (SOURCE_EXTENSIONS.includes(extension as (typeof SOURCE_EXTENSIONS)[number])) {
		return 'source';
	}
	return 'unknown';
}

function statusFromCode(code: string): TestRegressionSelectorFileStatus {
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

function parseNameStatus(stdout: string): TestRegressionSelectorChangedFile[] {
	const files: TestRegressionSelectorChangedFile[] = [];
	for (const line of stdout.split(/\r?\n/u)) {
		if (!line.trim()) {
			continue;
		}
		const [statusCode = 'M', firstPath = '', secondPath = ''] = line.split('\t');
		const currentPath = normalizeRelativePath(secondPath || firstPath);
		const previousPath = secondPath ? normalizeRelativePath(firstPath) : null;
		files.push({
			path: currentPath,
			previous_path: previousPath,
			status: statusFromCode(statusCode),
			surface: surfaceForPath(currentPath),
		});
	}
	return files;
}

function addUntrackedFiles(
	root: string,
	paths: readonly string[],
	files: TestRegressionSelectorChangedFile[],
): void {
	const untracked = runGit(root, ['ls-files', '--others', '--exclude-standard', '--', ...paths]);
	if (!untracked.ok) {
		return;
	}
	const known = new Set(files.map((file) => file.path));
	for (const line of untracked.stdout.split(/\r?\n/u)) {
		const relativePath = normalizeRelativePath(line.trim());
		if (!relativePath || relativePath === '.' || known.has(relativePath)) {
			continue;
		}
		files.push({
			path: relativePath,
			previous_path: null,
			status: 'untracked',
			surface: surfaceForPath(relativePath),
		});
	}
}

function collectChangedFiles(
	root: string,
	policy: TestRegressionSelectorPolicy,
	findings: TestRegressionSelectorFinding[],
	issues: string[],
): TestRegressionSelectorChangedFile[] {
	if (!isInsideGitWorktree(root)) {
		const message = 'Git worktree is unavailable; regression-selector cannot inspect changed files.';
		findings.push(makeFinding('test_regression_selector_git_unavailable', 'low', '.', message));
		issues.push(message);
		return [];
	}

	const diffArgs = policy.head_ref
		? ['diff', '--name-status', '--diff-filter=ACMRTD', policy.base_ref, policy.head_ref, '--', ...policy.path_filters]
		: ['diff', '--name-status', '--diff-filter=ACMRTD', policy.base_ref, '--', ...policy.path_filters];
	const diff = runGit(root, diffArgs);
	if (!diff.ok) {
		const detail = diff.stderr.trim() || diff.stdout.trim() || `git diff exited with ${diff.status}`;
		findings.push(makeFinding('test_regression_selector_invalid_ref', 'high', '.', detail));
		issues.push(detail);
		return [];
	}

	const files = parseNameStatus(diff.stdout);
	if (!policy.head_ref) {
		addUntrackedFiles(root, policy.path_filters, files);
	}
	files.sort((left, right) => left.path.localeCompare(right.path));
	if (files.length > policy.max_files) {
		const message = `Regression selector matched ${files.length} files; max_files is ${policy.max_files}.`;
		findings.push(makeFinding('test_regression_selector_max_files_exceeded', 'high', '.', message));
		issues.push(message);
	}
	return files.slice(0, policy.max_files);
}

function siblingBase(relativePath: string): string {
	const normalized = normalizeRelativePath(relativePath);
	const directory = path.posix.dirname(normalized);
	const parsed = path.posix.parse(normalized);
	return directory === '.' ? parsed.name : `${directory}/${parsed.name}`;
}

function testCandidatesFor(relativePath: string): readonly string[] {
	const base = siblingBase(relativePath);
	const name = path.posix.basename(base);
	return [
		`${base}.test.ts`,
		`${base}.test.js`,
		`${base}.spec.ts`,
		`${base}.spec.js`,
		`tests/${name}.test.js`,
		`tests/${name}.test.ts`,
		`tests/cli/${name}.test.js`,
	];
}

function addTestCandidate(
	root: string,
	candidates: Map<string, TestRegressionSelectorTestCandidate>,
	pathValue: string,
	reason: TestRegressionSelectorReason,
	sourcePath: string,
	confidence: number,
): void {
	const normalized = normalizeRelativePath(pathValue);
	const existing = candidates.get(normalized);
	if (existing) {
		const reasons = [...new Set([...existing.reasons, reason])];
		const sourcePaths = [...new Set([...existing.source_paths, sourcePath])];
		const primaryReason = confidence > existing.confidence ? reason : existing.reason;
		const primarySourcePath = confidence > existing.confidence ? sourcePath : existing.source_path;
		candidates.set(normalized, {
			...existing,
			reason: primaryReason,
			reasons,
			source_path: primarySourcePath,
			source_paths: sourcePaths,
			confidence: Math.max(existing.confidence, confidence),
		});
		return;
	}
	candidates.set(normalized, {
		path: normalized,
		exists: existsSync(path.join(root, ...normalized.split('/'))),
		reason,
		reasons: [reason],
		source_path: sourcePath,
		source_paths: [sourcePath],
		confidence,
	});
}

function addChangedFileCandidates(
	root: string,
	changedFiles: readonly TestRegressionSelectorChangedFile[],
	candidates: Map<string, TestRegressionSelectorTestCandidate>,
): void {
	for (const changedFile of changedFiles) {
		if (changedFile.surface === 'test' && changedFile.status !== 'deleted') {
			addTestCandidate(root, candidates, changedFile.path, 'changed_test', changedFile.path, 1);
		}
		if (changedFile.surface === 'source' && changedFile.status !== 'deleted') {
			for (const candidatePath of testCandidatesFor(changedFile.path)) {
				addTestCandidate(root, candidates, candidatePath, 'sibling_test', changedFile.path, 0.7);
			}
		}
	}
}

function addImporterCandidates(
	root: string,
	changedFiles: readonly TestRegressionSelectorChangedFile[],
	candidates: Map<string, TestRegressionSelectorTestCandidate>,
	issues: string[],
): void {
	const sourcePaths = changedFiles
		.filter((file) => file.surface === 'source' && file.status !== 'deleted')
		.map((file) => file.path);
	if (sourcePaths.length === 0) {
		return;
	}

	const dependencyReport = inspectDependencyGraph(root, {
		paths: sourcePaths,
		maxDepth: 1,
		maxFiles: Math.max(sourcePaths.length, 50),
		maxFileBytes: 256 * 1024,
		maxNodes: 200,
		maxEdges: 300,
	});
	if (!dependencyReport.ok) {
		for (const issue of dependencyReport.issues) {
			issues.push(`dependency-graph: ${issue}`);
		}
	}

	const changedPathSet = new Set(sourcePaths);
	for (const edge of dependencyReport.edges) {
		if (!changedPathSet.has(edge.target_path) || changedPathSet.has(edge.source_path)) {
			continue;
		}
		for (const candidatePath of testCandidatesFor(edge.source_path)) {
			addTestCandidate(root, candidates, candidatePath, 'importer_sibling_test', edge.target_path, 0.6);
		}
	}
}

function fallback(
	reason: TestRegressionSelectorReason,
	pathValue: string,
	message: string,
	recommendedIntent: string,
): TestRegressionSelectorFallback {
	return {
		reason,
		path: pathValue,
		message,
		recommended_intent: recommendedIntent,
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

function fallbackForChangedFile(changedFile: TestRegressionSelectorChangedFile): TestRegressionSelectorFallback | null {
	const normalized = normalizeRelativePath(changedFile.path);
	const basename = path.posix.basename(normalized).toLowerCase();

	if (changedFile.status === 'deleted') {
		return fallback(
			'fallback_deleted',
			changedFile.path,
			'Deleted files can invalidate stale tests, public exports, and static dependency mappings.',
			'test_related',
		);
	}
	if (changedFile.status === 'renamed') {
		return fallback(
			'fallback_renamed',
			changedFile.path,
			'Renamed files can leave stale import paths, test mappings, and documentation references behind.',
			'test_related',
		);
	}
	if (changedFile.status === 'type_changed') {
		return fallback(
			'fallback_type_changed',
			changedFile.path,
			'Type-changed files can change executable behavior in ways static test narrowing cannot classify.',
			'test_related',
		);
	}
	if (PACKAGE_LOCKFILES.has(normalized)) {
		return fallback(
			'fallback_lockfile',
			changedFile.path,
			'Lockfile changes can alter dependency resolution, toolchain behavior, and package artifacts.',
			'test_release',
		);
	}
	if (basename === 'package.json') {
		return fallback(
			'fallback_package_metadata',
			changedFile.path,
			'Package metadata can change runtime entrypoints, scripts, dependencies, files, and release behavior.',
			'test_release',
		);
	}
	if (changedFile.surface === 'template') {
		return fallback(
			'fallback_template',
			changedFile.path,
			'Template changes can alter installed workflow contracts and downstream repository behavior.',
			'test_release',
		);
	}
	if (isGeneratedContractPath(normalized)) {
		return fallback(
			'fallback_generated_contract',
			changedFile.path,
			'Schema, OpenAPI, GraphQL, or generated-contract changes need contract and release-sensitive verification.',
			'test_release',
		);
	}
	if (isSharedTestFixturePath(normalized)) {
		return fallback(
			'fallback_shared_test_fixture',
			changedFile.path,
			'Shared test fixtures or setup files can affect many tests outside the static source map.',
			'test_related',
		);
	}
	if (isMigrationOrDatabasePath(normalized)) {
		return fallback(
			'fallback_migration_or_database',
			changedFile.path,
			'Migration, database, or SQL changes can alter shared test state and runtime contracts.',
			'test',
		);
	}
	if (normalized.startsWith('.github/workflows/')) {
		return fallback(
			'fallback_ci_workflow',
			changedFile.path,
			'CI workflow changes can alter job ordering, environment, caches, and selected-test safety.',
			'test_related',
		);
	}
	if (normalized.startsWith('.mustflow/')) {
		return fallback(
			'fallback_mustflow_workflow',
			changedFile.path,
			'Mustflow workflow changes can alter command contracts, routing, skills, or verification policy.',
			'test_related',
		);
	}
	if (isCompilerOrRunnerConfigPath(normalized) || changedFile.surface === 'config') {
		return fallback(
			'fallback_compiler_or_runner_config',
			changedFile.path,
			'Compiler, bundler, lint, or test-runner config changes are unsafe for static test narrowing.',
			'test_related',
		);
	}
	if (changedFile.surface === 'unknown') {
		return fallback(
			'fallback_unknown',
			changedFile.path,
			'Unknown change surfaces need the configured fallback path instead of selected-test confidence.',
			'test',
		);
	}
	return null;
}

function chooseRecommendedIntent(
	selectedTests: readonly TestRegressionSelectorTestCandidate[],
	fallbacks: readonly TestRegressionSelectorFallback[],
	changedFiles: readonly TestRegressionSelectorChangedFile[],
): string {
	if (fallbacks.some((fallback) => fallback.recommended_intent === 'test')) {
		return 'test';
	}
	if (fallbacks.some((fallback) => fallback.recommended_intent === 'test_release')) {
		return 'test_release';
	}
	if (fallbacks.length > 0) {
		return 'test_related';
	}
	if (selectedTests.length > 0 || changedFiles.some((file) => file.surface === 'source' || file.surface === 'test')) {
		return 'test_related_cached';
	}
	return 'changes_status';
}

function confidenceFor(
	selectedTests: readonly TestRegressionSelectorTestCandidate[],
	fallbacks: readonly TestRegressionSelectorFallback[],
	changedFiles: readonly TestRegressionSelectorChangedFile[],
): TestRegressionSelectorConfidence {
	if (fallbacks.length > 0) {
		return 'low';
	}
	if (selectedTests.length === 0 || changedFiles.length === 0) {
		return 'low';
	}
	if (changedFiles.every((file) => file.surface === 'test')) {
		return 'high';
	}
	return 'medium';
}

function selectionStatus(
	selectedTests: readonly TestRegressionSelectorTestCandidate[],
	fallbacks: readonly TestRegressionSelectorFallback[],
	changedFiles: readonly TestRegressionSelectorChangedFile[],
): TestRegressionSelectorStatus {
	if (fallbacks.length > 0) {
		return 'fallback';
	}
	if (changedFiles.length === 0 || selectedTests.length === 0) {
		return 'empty';
	}
	return 'selected';
}

function createRunHint(
	selectedTests: readonly TestRegressionSelectorTestCandidate[],
	recommendedIntent: string,
): string | null {
	if (recommendedIntent === 'test_related_cached' && selectedTests.length > 0) {
		return `MUSTFLOW_TEST_CHANGED_FILES=${selectedTests.map((test) => test.path).join(',')} mf run test_related_cached`;
	}
	if (recommendedIntent === 'test_related' || recommendedIntent === 'test_release' || recommendedIntent === 'test') {
		return `mf run ${recommendedIntent}`;
	}
	return null;
}

export function createTestRegressionSelectorReport(
	projectRoot: string,
	options: CreateTestRegressionSelectorOptions = {},
): TestRegressionSelectorReport {
	const root = path.resolve(projectRoot);
	const policy: TestRegressionSelectorPolicy = {
		base_ref: options.baseRef ?? DEFAULT_BASE_REF,
		head_ref: options.headRef ?? null,
		compare_worktree: options.headRef === undefined || options.headRef === null,
		max_files: options.maxFiles ?? DEFAULT_MAX_FILES,
		max_tests: options.maxTests ?? DEFAULT_MAX_TESTS,
		path_filters: (options.paths ?? []).map(normalizeRelativePath),
	};
	const findings: TestRegressionSelectorFinding[] = [];
	const issues: string[] = [];
	const changedFiles = collectChangedFiles(root, policy, findings, issues);
	const candidates = new Map<string, TestRegressionSelectorTestCandidate>();

	addChangedFileCandidates(root, changedFiles, candidates);
	addImporterCandidates(root, changedFiles, candidates, issues);

	const fallbackMap = new Map<string, TestRegressionSelectorFallback>();
	for (const changedFile of changedFiles) {
		const fallback = fallbackForChangedFile(changedFile);
		if (fallback) {
			fallbackMap.set(`${fallback.reason}:${fallback.path}`, fallback);
		}
	}
	if (findings.some((finding) => finding.code === 'test_regression_selector_max_files_exceeded')) {
		fallbackMap.set('fallback_truncated:.', {
			reason: 'fallback_truncated',
			path: '.',
			message: 'Changed-file input was truncated by max_files.',
			recommended_intent: 'test',
		});
	}
	if (changedFiles.length === 0) {
		fallbackMap.set('no_changed_files:.', {
			reason: 'no_changed_files',
			path: '.',
			message: 'No changed files were detected for regression selection.',
			recommended_intent: 'changes_status',
		});
	}

	const sortedCandidates = [...candidates.values()].sort(
		(left, right) => Number(right.exists) - Number(left.exists) || right.confidence - left.confidence || left.path.localeCompare(right.path),
	);
	const selectedTests = sortedCandidates.filter((candidate) => candidate.exists).slice(0, policy.max_tests);
	const missingCandidates = sortedCandidates.filter((candidate) => !candidate.exists).slice(0, policy.max_tests);
	const truncated = sortedCandidates.filter((candidate) => candidate.exists).length > selectedTests.length;
	if (truncated) {
		const message = `Regression selector found more than ${policy.max_tests} existing test candidates.`;
		findings.push(makeFinding('test_regression_selector_max_tests_exceeded', 'medium', '.', message));
		issues.push(message);
	}

	const fallbacks = [...fallbackMap.values()].sort(
		(left, right) => left.recommended_intent.localeCompare(right.recommended_intent) || left.path.localeCompare(right.path),
	);
	const recommendedIntent = chooseRecommendedIntent(selectedTests, fallbacks, changedFiles);
	const selectorStatus = selectionStatus(selectedTests, fallbacks, changedFiles);
	const status: ScriptCheckStatus = findings.some((finding) => finding.severity === 'high' || finding.severity === 'critical')
		? 'failed'
		: 'passed';
	const summary: TestRegressionSelectorSummary = {
		changed_file_count: changedFiles.length,
		selected_test_count: selectedTests.length,
		missing_candidate_count: missingCandidates.length,
		fallback_count: fallbacks.length,
		selection_status: selectorStatus,
		confidence: confidenceFor(selectedTests, fallbacks, changedFiles),
		recommended_intent: recommendedIntent,
	};

	return {
		schema_version: '1',
		command: 'script-pack',
		pack_id: TEST_REGRESSION_SELECTOR_PACK_ID,
		script_id: TEST_REGRESSION_SELECTOR_SCRIPT_ID,
		script_ref: TEST_REGRESSION_SELECTOR_SCRIPT_REF,
		action: 'select',
		status,
		ok: status === 'passed',
		mustflow_root: root,
		policy,
		input_hash: sha256Tagged(JSON.stringify({ policy, changedFiles, selectedTests, fallbacks })),
		summary,
		changed_files: changedFiles,
		selected_tests: selectedTests,
		missing_candidates: missingCandidates,
		fallbacks,
		run_hint: createRunHint(selectedTests, recommendedIntent),
		truncated,
		findings,
		issues,
	};
}
