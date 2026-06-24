import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync } from 'node:fs';
import path from 'node:path';

import { inspectDependencyGraph } from './dependency-graph.js';
import {
	type ScriptCheckFinding,
	type ScriptCheckFindingSeverity,
	type ScriptCheckStatus,
} from './script-check-result.js';

export const CHANGE_IMPACT_PACK_ID = 'code';
export const CHANGE_IMPACT_SCRIPT_ID = 'change-impact';
export const CHANGE_IMPACT_SCRIPT_REF = `${CHANGE_IMPACT_PACK_ID}/${CHANGE_IMPACT_SCRIPT_ID}`;

export type ChangeImpactSurface =
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

export type ChangeImpactFileStatus = 'added' | 'modified' | 'deleted' | 'renamed' | 'type_changed' | 'untracked';
export type ChangeImpactRelationship =
	| 'changed_file'
	| 'imports_changed_file'
	| 'sibling_test'
	| 'sibling_source'
	| 'contract_doc'
	| 'contract_test'
	| 'package_surface'
	| 'workflow_surface';

export type ChangeImpactFindingCode =
	| 'change_impact_git_unavailable'
	| 'change_impact_invalid_ref'
	| 'change_impact_max_files_exceeded'
	| 'change_impact_max_impacts_exceeded';

export interface ChangeImpactPolicy {
	readonly base_ref: string;
	readonly head_ref: string | null;
	readonly compare_worktree: boolean;
	readonly max_files: number;
	readonly max_impacts: number;
	readonly max_file_bytes: number;
	readonly path_filters: readonly string[];
}

export interface ChangeImpactChangedFile {
	readonly path: string;
	readonly previous_path: string | null;
	readonly status: ChangeImpactFileStatus;
	readonly surface: ChangeImpactSurface;
}

export interface ChangeImpactCandidate {
	readonly path: string;
	readonly exists: boolean;
	readonly surface: ChangeImpactSurface;
	readonly relationship: ChangeImpactRelationship;
	readonly confidence: number;
	readonly reason: string;
	readonly source_path: string;
}

export interface ChangeImpactScriptHint {
	readonly script_ref: string;
	readonly command: string;
	readonly reason: string;
	readonly confidence: number;
}

export interface ChangeImpactVerificationHint {
	readonly intent: string;
	readonly reason: string;
	readonly confidence: number;
}

export interface ChangeImpactFinding extends ScriptCheckFinding {
	readonly code: ChangeImpactFindingCode;
	readonly path: string;
}

export interface ChangeImpactReport {
	readonly schema_version: '1';
	readonly command: 'script-pack';
	readonly pack_id: typeof CHANGE_IMPACT_PACK_ID;
	readonly script_id: typeof CHANGE_IMPACT_SCRIPT_ID;
	readonly script_ref: typeof CHANGE_IMPACT_SCRIPT_REF;
	readonly action: 'analyze';
	readonly status: ScriptCheckStatus;
	readonly ok: boolean;
	readonly mustflow_root: string;
	readonly policy: ChangeImpactPolicy;
	readonly input_hash: string;
	readonly changed_files: readonly ChangeImpactChangedFile[];
	readonly impacts: readonly ChangeImpactCandidate[];
	readonly script_hints: readonly ChangeImpactScriptHint[];
	readonly verification_hints: readonly ChangeImpactVerificationHint[];
	readonly truncated: boolean;
	readonly findings: readonly ChangeImpactFinding[];
	readonly issues: readonly string[];
}

export interface InspectChangeImpactOptions {
	readonly baseRef?: string;
	readonly headRef?: string | null;
	readonly paths?: readonly string[];
	readonly maxFiles?: number;
	readonly maxImpacts?: number;
	readonly maxFileBytes?: number;
}

interface GitResult {
	readonly ok: boolean;
	readonly stdout: string;
	readonly stderr: string;
	readonly status: number | null;
}

const DEFAULT_BASE_REF = 'HEAD';
const DEFAULT_MAX_FILES = 200;
const DEFAULT_MAX_IMPACTS = 300;
const DEFAULT_MAX_FILE_BYTES = 256 * 1024;
const SOURCE_EXTENSIONS = ['.ts', '.tsx', '.mts', '.cts', '.js', '.jsx', '.mjs', '.cjs'] as const;

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

function makeFinding(
	code: ChangeImpactFindingCode,
	severity: ScriptCheckFindingSeverity,
	pathValue: string,
	message: string,
): ChangeImpactFinding {
	return { code, severity, path: pathValue, message };
}

function surfaceForPath(relativePath: string): ChangeImpactSurface {
	const normalized = normalizeRelativePath(relativePath);
	const extension = path.extname(normalized).toLowerCase();
	const basename = path.basename(normalized).toLowerCase();

	if (normalized.startsWith('.mustflow/')) {
		return 'workflow';
	}
	if (normalized.startsWith('templates/')) {
		return 'template';
	}
	if (normalized.startsWith('schemas/') || basename.endsWith('.schema.json')) {
		return 'schema';
	}
	if (normalized.startsWith('docs') || ['.md', '.mdx'].includes(extension)) {
		return 'docs';
	}
	if (normalized.includes('/i18n/') || normalized.includes('/locales/') || basename.includes('i18n')) {
		return 'i18n';
	}
	if (['package.json', 'bun.lock', 'package-lock.json', 'pnpm-lock.yaml', 'yarn.lock'].includes(normalized)) {
		return 'package';
	}
	if (/^(?:tsconfig|eslint|vite|vitest|jest|playwright|astro|svelte|tailwind)\b/u.test(basename)) {
		return 'config';
	}
	if (normalized.startsWith('tests/') || /\.test\.[cm]?[jt]sx?$/u.test(normalized)) {
		return 'test';
	}
	if (SOURCE_EXTENSIONS.includes(extension as (typeof SOURCE_EXTENSIONS)[number])) {
		return 'source';
	}
	return 'unknown';
}

function statusFromCode(code: string): ChangeImpactFileStatus {
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

function parseNameStatus(stdout: string): ChangeImpactChangedFile[] {
	const files: ChangeImpactChangedFile[] = [];
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

function addUntrackedFiles(root: string, paths: readonly string[], files: ChangeImpactChangedFile[]): void {
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

function addImpact(
	root: string,
	impacts: Map<string, ChangeImpactCandidate>,
	candidate: Omit<ChangeImpactCandidate, 'exists' | 'surface'>,
	policy: ChangeImpactPolicy,
	findings: ChangeImpactFinding[],
	issues: string[],
): void {
	const normalized = normalizeRelativePath(candidate.path);
	const key = `${candidate.relationship}:${candidate.source_path}:${normalized}`;
	if (impacts.has(key)) {
		return;
	}
	if (impacts.size >= policy.max_impacts) {
		const message = `Change impact found more than ${policy.max_impacts} candidates; remaining candidates were skipped.`;
		findings.push(makeFinding('change_impact_max_impacts_exceeded', 'high', normalized, message));
		issues.push(message);
		return;
	}
	impacts.set(key, {
		...candidate,
		path: normalized,
		exists: existsSync(path.join(root, ...normalized.split('/'))),
		surface: surfaceForPath(normalized),
	});
}

function siblingBase(relativePath: string): string {
	const directory = path.posix.dirname(normalizeRelativePath(relativePath));
	const parsed = path.posix.parse(normalizeRelativePath(relativePath));
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

function sourceCandidatesFor(relativePath: string): readonly string[] {
	const normalized = normalizeRelativePath(relativePath);
	return [
		normalized.replace(/^tests\/cli\//u, 'src/cli/').replace(/\.test\.[cm]?[jt]sx?$/u, '.ts'),
		normalized.replace(/^tests\//u, 'src/').replace(/\.test\.[cm]?[jt]sx?$/u, '.ts'),
	];
}

function addSurfaceImpacts(
	root: string,
	changedFile: ChangeImpactChangedFile,
	impacts: Map<string, ChangeImpactCandidate>,
	policy: ChangeImpactPolicy,
	findings: ChangeImpactFinding[],
	issues: string[],
): void {
	addImpact(root, impacts, {
		path: changedFile.path,
		relationship: 'changed_file',
		confidence: 1,
		reason: 'Changed file should be reviewed directly.',
		source_path: changedFile.path,
	}, policy, findings, issues);

	if (changedFile.surface === 'source') {
		for (const candidatePath of testCandidatesFor(changedFile.path)) {
			addImpact(root, impacts, {
				path: candidatePath,
				relationship: 'sibling_test',
				confidence: 0.65,
				reason: 'Nearby test candidate for the changed source path.',
				source_path: changedFile.path,
			}, policy, findings, issues);
		}
	}

	if (changedFile.surface === 'test') {
		for (const candidatePath of sourceCandidatesFor(changedFile.path)) {
			addImpact(root, impacts, {
				path: candidatePath,
				relationship: 'sibling_source',
				confidence: 0.55,
				reason: 'Likely source file covered by the changed test path.',
				source_path: changedFile.path,
			}, policy, findings, issues);
		}
	}
}

function addContractImpacts(
	root: string,
	changedFile: ChangeImpactChangedFile,
	impacts: Map<string, ChangeImpactCandidate>,
	policy: ChangeImpactPolicy,
	findings: ChangeImpactFinding[],
	issues: string[],
): void {
	const contractPaths =
		changedFile.surface === 'schema'
			? ['schemas/README.md', 'src/core/public-json-contracts.ts', 'tests/cli/schema.test.js']
			: changedFile.surface === 'package' || changedFile.surface === 'template'
				? ['tests/cli/package.test.js', 'templates/default/manifest.toml']
				: changedFile.surface === 'workflow'
					? ['.mustflow/config/commands.toml', 'tests/cli/authoring-skill-contracts.test.js']
					: [];
	for (const candidatePath of contractPaths) {
		addImpact(root, impacts, {
			path: candidatePath,
			relationship: changedFile.surface === 'workflow' ? 'workflow_surface' : 'contract_test',
			confidence: 0.7,
			reason: `Contract surface related to changed ${changedFile.surface} file.`,
			source_path: changedFile.path,
		}, policy, findings, issues);
	}
}

function addDependencyImpacts(
	root: string,
	changedFiles: readonly ChangeImpactChangedFile[],
	impacts: Map<string, ChangeImpactCandidate>,
	policy: ChangeImpactPolicy,
	findings: ChangeImpactFinding[],
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
		maxFiles: policy.max_files,
		maxFileBytes: policy.max_file_bytes,
		maxNodes: policy.max_impacts,
		maxEdges: policy.max_impacts,
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
		addImpact(root, impacts, {
			path: edge.source_path,
			relationship: 'imports_changed_file',
			confidence: 0.8,
			reason: `Imports changed file ${edge.target_path} via ${edge.specifier}.`,
			source_path: edge.target_path,
		}, policy, findings, issues);
	}
}

function createScriptHints(changedFiles: readonly ChangeImpactChangedFile[]): readonly ChangeImpactScriptHint[] {
	const sourcePaths = changedFiles.filter((file) => file.surface === 'source').map((file) => file.path);
	const hasDocsOrSchema = changedFiles.some((file) => file.surface === 'docs' || file.surface === 'schema');
	const hints: ChangeImpactScriptHint[] = [];
	if (sourcePaths.length > 0) {
		const pathPart = sourcePaths.map((entry) => JSON.stringify(entry)).join(' ');
		hints.push({
			script_ref: 'code/dependency-graph',
			command: `mf script-pack run code/dependency-graph scan ${pathPart} --json`,
			reason: 'Trace importers and direct dependencies for changed source files.',
			confidence: 0.85,
		});
		hints.push({
			script_ref: 'repo/related-files',
			command: `mf script-pack run repo/related-files map ${pathPart} --json`,
			reason: 'Map nearby source, tests, docs, and config files for changed source paths.',
			confidence: 0.75,
		});
	}
	if (hasDocsOrSchema) {
		hints.push({
			script_ref: 'docs/reference-drift',
			command: 'mf script-pack run docs/reference-drift check README.md schemas/README.md --json',
			reason: 'Check documented command, schema, path, and script-pack references after docs or schema changes.',
			confidence: 0.7,
		});
	}
	return hints;
}

function createVerificationHints(changedFiles: readonly ChangeImpactChangedFile[]): readonly ChangeImpactVerificationHint[] {
	const surfaces = new Set(changedFiles.map((file) => file.surface));
	const hints: ChangeImpactVerificationHint[] = [];
	const add = (intent: string, reason: string, confidence: number): void => {
		if (!hints.some((hint) => hint.intent === intent)) {
			hints.push({ intent, reason, confidence });
		}
	};
	if (surfaces.has('source') || surfaces.has('test')) {
		add('test_related', 'Changed source or tests need related behavior coverage.', 0.85);
		add('build', 'Changed TypeScript or JavaScript source may affect compiled CLI output.', 0.7);
	}
	if (surfaces.has('schema') || surfaces.has('package') || surfaces.has('template')) {
		add('test_release', 'Package, template, or public schema surfaces changed.', 0.85);
	}
	if (surfaces.has('docs') || surfaces.has('schema') || surfaces.has('workflow')) {
		add('docs_validate_fast', 'Docs, schema docs, or workflow text changed.', 0.75);
	}
	if (surfaces.has('workflow') || surfaces.has('template')) {
		add('mustflow_check', 'Workflow or install template surfaces need strict mustflow validation.', 0.8);
	}
	return hints;
}

function collectChangedFiles(
	root: string,
	policy: ChangeImpactPolicy,
	findings: ChangeImpactFinding[],
	issues: string[],
): ChangeImpactChangedFile[] {
	const diffArgs = policy.head_ref
		? ['diff', '--name-status', '--diff-filter=ACMRTD', policy.base_ref, policy.head_ref, '--', ...policy.path_filters]
		: ['diff', '--name-status', '--diff-filter=ACMRTD', policy.base_ref, '--', ...policy.path_filters];
	const diff = runGit(root, diffArgs);
	if (!diff.ok) {
		const detail = diff.stderr.trim() || diff.stdout.trim() || `git diff exited with ${diff.status}`;
		findings.push(makeFinding('change_impact_invalid_ref', 'high', '.', detail));
		issues.push(detail);
		return [];
	}

	const files = parseNameStatus(diff.stdout);
	if (!policy.head_ref) {
		addUntrackedFiles(root, policy.path_filters, files);
	}
	files.sort((left, right) => left.path.localeCompare(right.path));
	if (files.length > policy.max_files) {
		const message = `Change impact matched ${files.length} files; max_files is ${policy.max_files}.`;
		findings.push(makeFinding('change_impact_max_files_exceeded', 'high', '.', message));
		issues.push(message);
	}
	return files.slice(0, policy.max_files);
}

export function inspectChangeImpact(projectRoot: string, options: InspectChangeImpactOptions = {}): ChangeImpactReport {
	const root = path.resolve(projectRoot);
	const policy: ChangeImpactPolicy = {
		base_ref: options.baseRef ?? DEFAULT_BASE_REF,
		head_ref: options.headRef ?? null,
		compare_worktree: options.headRef === undefined || options.headRef === null,
		max_files: options.maxFiles ?? DEFAULT_MAX_FILES,
		max_impacts: options.maxImpacts ?? DEFAULT_MAX_IMPACTS,
		max_file_bytes: options.maxFileBytes ?? DEFAULT_MAX_FILE_BYTES,
		path_filters: (options.paths ?? []).map(normalizeRelativePath),
	};
	const findings: ChangeImpactFinding[] = [];
	const issues: string[] = [];
	const changedFiles = collectChangedFiles(root, policy, findings, issues);
	const impacts = new Map<string, ChangeImpactCandidate>();

	for (const changedFile of changedFiles) {
		addSurfaceImpacts(root, changedFile, impacts, policy, findings, issues);
		addContractImpacts(root, changedFile, impacts, policy, findings, issues);
	}
	addDependencyImpacts(root, changedFiles, impacts, policy, findings, issues);

	const status: ScriptCheckStatus = findings.some((finding) => finding.severity === 'high' || finding.severity === 'critical')
		? 'failed'
		: 'passed';
	const inputHash = sha256Tagged(JSON.stringify({ policy, changedFiles }));
	return {
		schema_version: '1',
		command: 'script-pack',
		pack_id: CHANGE_IMPACT_PACK_ID,
		script_id: CHANGE_IMPACT_SCRIPT_ID,
		script_ref: CHANGE_IMPACT_SCRIPT_REF,
		action: 'analyze',
		status,
		ok: status === 'passed',
		mustflow_root: root,
		policy,
		input_hash: inputHash,
		changed_files: changedFiles,
		impacts: [...impacts.values()].sort(
			(left, right) => right.confidence - left.confidence || left.path.localeCompare(right.path),
		),
		script_hints: createScriptHints(changedFiles),
		verification_hints: createVerificationHints(changedFiles),
		truncated: findings.some(
			(finding) =>
				finding.code === 'change_impact_max_files_exceeded' ||
				finding.code === 'change_impact_max_impacts_exceeded',
		),
		findings,
		issues,
	};
}
