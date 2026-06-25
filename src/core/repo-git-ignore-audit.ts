import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { existsSync, lstatSync, readFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import type {
	ScriptCheckFinding,
	ScriptCheckFindingSeverity,
	ScriptCheckStatus,
} from './script-check-result.js';
import { ensureInside, ensureInsideWithoutSymlinks } from './safe-filesystem.js';

export const REPO_GIT_IGNORE_AUDIT_PACK_ID = 'repo';
export const REPO_GIT_IGNORE_AUDIT_SCRIPT_ID = 'git-ignore-audit';
export const REPO_GIT_IGNORE_AUDIT_SCRIPT_REF =
	`${REPO_GIT_IGNORE_AUDIT_PACK_ID}/${REPO_GIT_IGNORE_AUDIT_SCRIPT_ID}`;

export type GitIgnoreAuditSourceKind = 'repo_gitignore' | 'git_info_exclude' | 'core_excludes_file';
export type GitIgnoreAuditInputMode = 'explicit_paths' | 'git_changed_files';
export type GitIgnoreAuditPathStatus = 'ignored' | 'tracked' | 'untracked' | 'missing' | 'error';

export type GitIgnoreAuditFindingCode =
	| 'git_ignore_audit_git_unavailable'
	| 'git_ignore_audit_no_input_paths'
	| 'git_ignore_audit_max_paths_exceeded'
	| 'git_ignore_audit_path_outside_root'
	| 'git_ignore_audit_unreadable_path'
	| 'git_ignore_audit_ignored_path'
	| 'git_ignore_audit_tracked_path_matches_ignore';

export interface GitIgnoreAuditOptions {
	readonly paths: readonly string[];
	readonly maxPaths?: number;
}

export interface GitIgnoreAuditPolicy {
	readonly input_mode: GitIgnoreAuditInputMode;
	readonly max_paths: number;
	readonly source_kinds: readonly GitIgnoreAuditSourceKind[];
	readonly tracked_paths_can_match_ignore: boolean;
}

export interface GitIgnoreAuditInput {
	readonly paths: readonly string[];
}

export interface GitIgnoreAuditSource {
	readonly path: string;
	readonly kind: GitIgnoreAuditSourceKind;
	readonly exists: boolean;
	readonly scope: 'repository' | 'local_git' | 'external';
	readonly sha256: string | null;
}

export interface GitIgnoreAuditPath {
	readonly path: string;
	readonly status: GitIgnoreAuditPathStatus;
	readonly tracked: boolean;
	readonly ignored: boolean;
	readonly exists: boolean;
	readonly source_path: string | null;
	readonly source_line: number | null;
	readonly pattern: string | null;
}

export interface GitIgnoreAuditSummary {
	readonly paths_checked: number;
	readonly ignored_paths: number;
	readonly tracked_paths: number;
	readonly untracked_paths: number;
	readonly missing_paths: number;
	readonly ignore_sources: number;
	readonly findings: number;
}

export interface GitIgnoreAuditFinding extends ScriptCheckFinding {
	readonly code: GitIgnoreAuditFindingCode;
	readonly path: string;
	readonly source_path: string | null;
	readonly source_line: number | null;
	readonly pattern: string | null;
}

export interface GitIgnoreAuditReport {
	readonly schema_version: '1';
	readonly command: 'script-pack';
	readonly pack_id: typeof REPO_GIT_IGNORE_AUDIT_PACK_ID;
	readonly script_id: typeof REPO_GIT_IGNORE_AUDIT_SCRIPT_ID;
	readonly script_ref: typeof REPO_GIT_IGNORE_AUDIT_SCRIPT_REF;
	readonly action: 'audit';
	readonly status: ScriptCheckStatus;
	readonly ok: boolean;
	readonly mustflow_root: string;
	readonly input: GitIgnoreAuditInput;
	readonly policy: GitIgnoreAuditPolicy;
	readonly input_hash: string;
	readonly summary: GitIgnoreAuditSummary;
	readonly sources: readonly GitIgnoreAuditSource[];
	readonly paths: readonly GitIgnoreAuditPath[];
	readonly findings: readonly GitIgnoreAuditFinding[];
	readonly issues: readonly string[];
}

interface GitResult {
	readonly ok: boolean;
	readonly status: number | null;
	readonly stdout: string;
	readonly stderr: string;
}

interface IgnoreMatch {
	readonly sourcePath: string;
	readonly sourceLine: number;
	readonly pattern: string;
}

const DEFAULT_MAX_PATHS = 200;
const SOURCE_KINDS: readonly GitIgnoreAuditSourceKind[] = [
	'repo_gitignore',
	'git_info_exclude',
	'core_excludes_file',
];

function normalizeRelativePath(value: string): string {
	return value.replace(/\\/gu, '/').replace(/^\.\/+/u, '').replace(/\/+$/u, '') || '.';
}

function sha256(value: string | Buffer): string {
	return `sha256:${createHash('sha256').update(value).digest('hex')}`;
}

function positiveInteger(value: number | undefined, fallback: number): number {
	return typeof value === 'number' && Number.isInteger(value) && value > 0 ? value : fallback;
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
		status: result.status,
		stdout: result.stdout ?? '',
		stderr: result.stderr ?? '',
	};
}

function isInsideGitWorktree(root: string): boolean {
	const result = runGit(root, ['rev-parse', '--is-inside-work-tree']);
	return result.ok && result.stdout.trim() === 'true';
}

function parseGitPaths(stdout: string): readonly string[] {
	const paths: string[] = [];
	const seen = new Set<string>();

	for (const line of stdout.split(/\r?\n/u)) {
		const relativePath = normalizeRelativePath(line.trim());
		if (!relativePath || relativePath === '.' || seen.has(relativePath)) {
			continue;
		}

		seen.add(relativePath);
		paths.push(relativePath);
	}

	return paths.sort((left, right) => left.localeCompare(right));
}

function collectGitChangedFiles(root: string, issues: string[], findings: GitIgnoreAuditFinding[]): readonly string[] {
	if (!isInsideGitWorktree(root)) {
		const message = 'Git worktree is unavailable; provide explicit paths to audit.';
		issues.push(message);
		findings.push(makeFinding('git_ignore_audit_git_unavailable', 'low', '.', message, null));
		return [];
	}

	const tracked = runGit(root, ['diff', '--name-only', '--diff-filter=ACMRTUXB', 'HEAD', '--']);
	const untracked = runGit(root, ['ls-files', '--others', '--exclude-standard', '--']);
	const paths = new Set<string>();

	if (tracked.ok) {
		for (const entry of parseGitPaths(tracked.stdout)) {
			paths.add(entry);
		}
	} else {
		issues.push(`Could not inspect changed tracked files: ${tracked.stderr.trim() || 'git diff failed'}`);
	}

	if (untracked.ok) {
		for (const entry of parseGitPaths(untracked.stdout)) {
			paths.add(entry);
		}
	} else {
		issues.push(`Could not inspect untracked files: ${untracked.stderr.trim() || 'git ls-files failed'}`);
	}

	return [...paths].sort((left, right) => left.localeCompare(right));
}

function resolveAuditPaths(
	root: string,
	inputPaths: readonly string[],
	maxPaths: number,
	findings: GitIgnoreAuditFinding[],
	issues: string[],
): readonly string[] {
	const paths: string[] = [];
	const seen = new Set<string>();

	for (const inputPath of inputPaths) {
		const absolutePath = path.resolve(root, inputPath);
		let relativePath: string;

		try {
			ensureInside(root, absolutePath);
			ensureInsideWithoutSymlinks(root, existsSync(absolutePath) ? absolutePath : path.dirname(absolutePath), {
				allowMissingDescendant: true,
			});
			relativePath = normalizeRelativePath(path.relative(root, absolutePath));
		} catch (error) {
			const message = error instanceof Error ? error.message : String(error);
			issues.push(`${inputPath}: ${message}`);
			findings.push(makeFinding('git_ignore_audit_path_outside_root', 'high', inputPath, message, null));
			continue;
		}

		if (seen.has(relativePath)) {
			continue;
		}

		if (paths.length >= maxPaths) {
			const message = `Git ignore audit reached max_paths ${maxPaths}; remaining paths were skipped.`;
			issues.push(message);
			findings.push(makeFinding('git_ignore_audit_max_paths_exceeded', 'high', relativePath, message, null));
			return paths;
		}

		seen.add(relativePath);
		paths.push(relativePath);
	}

	return paths.sort((left, right) => left.localeCompare(right));
}

function expandHome(value: string): string {
	if (value === '~') {
		return os.homedir();
	}
	if (value.startsWith('~/') || value.startsWith('~\\')) {
		return path.join(os.homedir(), value.slice(2));
	}
	return value;
}

function readExternalCoreExcludesPath(root: string): string | null {
	const local = runGit(root, ['config', '--get', 'core.excludesFile']);
	if (!local.ok || local.stdout.trim().length === 0) {
		return null;
	}
	return expandHome(local.stdout.trim());
}

function makeSource(root: string, sourcePath: string, kind: GitIgnoreAuditSourceKind, scope: GitIgnoreAuditSource['scope']): GitIgnoreAuditSource {
	const absolutePath = scope === 'external' ? path.resolve(expandHome(sourcePath)) : path.join(root, ...sourcePath.split('/'));
	const exists = existsSync(absolutePath);

	if (!exists || scope === 'external') {
		return {
			path: scope === 'external' ? sourcePath : normalizeRelativePath(sourcePath),
			kind,
			exists,
			scope,
			sha256: null,
		};
	}

	try {
		const stats = lstatSync(absolutePath);
		if (!stats.isFile()) {
			return { path: normalizeRelativePath(sourcePath), kind, exists: true, scope, sha256: null };
		}
		return {
			path: normalizeRelativePath(sourcePath),
			kind,
			exists: true,
			scope,
			sha256: sha256(readFileSync(absolutePath)),
		};
	} catch {
		return { path: normalizeRelativePath(sourcePath), kind, exists: true, scope, sha256: null };
	}
}

function inspectIgnoreSources(root: string): readonly GitIgnoreAuditSource[] {
	const sources = [
		makeSource(root, '.gitignore', 'repo_gitignore', 'repository'),
		makeSource(root, '.git/info/exclude', 'git_info_exclude', 'local_git'),
	];
	const coreExcludesPath = readExternalCoreExcludesPath(root);
	if (coreExcludesPath) {
		sources.push(makeSource(root, coreExcludesPath, 'core_excludes_file', 'external'));
	}
	return sources;
}

function parseIgnoreMatch(output: string): IgnoreMatch | null {
	const line = output.split(/\r?\n/u).find((entry) => entry.trim().length > 0);
	if (!line) {
		return null;
	}

	const tabIndex = line.indexOf('\t');
	const evidence = tabIndex >= 0 ? line.slice(0, tabIndex) : line;
	const match = /^(?<sourcePath>.*):(?<sourceLine>\d+):(?<pattern>.*)$/u.exec(evidence);
	const sourcePath = match?.groups?.sourcePath ?? '';
	const sourceLine = Number(match?.groups?.sourceLine);
	const pattern = match?.groups?.pattern ?? '';
	if (!Number.isInteger(sourceLine) || sourceLine < 1 || pattern.length === 0) {
		return null;
	}

	return { sourcePath: normalizeRelativePath(sourcePath), sourceLine, pattern };
}

function checkIgnoreMatch(root: string, relativePath: string, issues: string[]): IgnoreMatch | null {
	const result = runGit(root, ['check-ignore', '-v', '--no-index', '--', relativePath]);
	if (result.ok) {
		return parseIgnoreMatch(result.stdout);
	}
	if (result.status !== 1 && result.stderr.trim().length > 0) {
		issues.push(`${relativePath}: ${result.stderr.trim()}`);
	}
	return null;
}

function isTrackedPath(root: string, relativePath: string): boolean {
	const result = runGit(root, ['ls-files', '--error-unmatch', '--', relativePath]);
	return result.ok;
}

function pathExists(root: string, relativePath: string): boolean {
	return existsSync(path.join(root, ...relativePath.split('/')));
}

function makeFinding(
	code: GitIgnoreAuditFindingCode,
	severity: ScriptCheckFindingSeverity,
	pathValue: string,
	message: string,
	match: IgnoreMatch | null,
): GitIgnoreAuditFinding {
	return {
		code,
		severity,
		path: pathValue,
		source_path: match?.sourcePath ?? null,
		source_line: match?.sourceLine ?? null,
		pattern: match?.pattern ?? null,
		message,
		json_pointer: null,
		metric: null,
		actual: null,
		expected: null,
	};
}

function auditPath(
	root: string,
	relativePath: string,
	findings: GitIgnoreAuditFinding[],
	issues: string[],
): GitIgnoreAuditPath {
	const match = checkIgnoreMatch(root, relativePath, issues);
	const tracked = isTrackedPath(root, relativePath);
	const exists = pathExists(root, relativePath);
	const ignored = match !== null;
	const status: GitIgnoreAuditPathStatus = tracked ? 'tracked' : ignored ? 'ignored' : exists ? 'untracked' : 'missing';

	if (ignored && tracked) {
		findings.push(
			makeFinding(
				'git_ignore_audit_tracked_path_matches_ignore',
				'low',
				relativePath,
				`Tracked path ${relativePath} matches an ignore rule, but Git will keep tracking it.`,
				match,
			),
		);
	} else if (ignored) {
		findings.push(
			makeFinding(
				'git_ignore_audit_ignored_path',
				'medium',
				relativePath,
				`Path ${relativePath} is ignored by ${match.sourcePath}:${match.sourceLine}.`,
				match,
			),
		);
	}

	return {
		path: relativePath,
		status,
		tracked,
		ignored,
		exists,
		source_path: match?.sourcePath ?? null,
		source_line: match?.sourceLine ?? null,
		pattern: match?.pattern ?? null,
	};
}

function summarize(
	paths: readonly GitIgnoreAuditPath[],
	sources: readonly GitIgnoreAuditSource[],
	findings: readonly GitIgnoreAuditFinding[],
): GitIgnoreAuditSummary {
	return {
		paths_checked: paths.length,
		ignored_paths: paths.filter((entry) => entry.ignored).length,
		tracked_paths: paths.filter((entry) => entry.tracked).length,
		untracked_paths: paths.filter((entry) => entry.status === 'untracked').length,
		missing_paths: paths.filter((entry) => entry.status === 'missing').length,
		ignore_sources: sources.filter((source) => source.exists).length,
		findings: findings.length,
	};
}

function createInputHash(reportInput: {
	readonly inputPaths: readonly string[];
	readonly policy: GitIgnoreAuditPolicy;
	readonly sources: readonly GitIgnoreAuditSource[];
	readonly paths: readonly GitIgnoreAuditPath[];
	readonly findings: readonly GitIgnoreAuditFinding[];
	readonly issues: readonly string[];
}): string {
	return sha256(JSON.stringify(reportInput));
}

export function auditRepoGitIgnore(projectRoot: string, options: GitIgnoreAuditOptions): GitIgnoreAuditReport {
	const root = path.resolve(projectRoot);
	const requestedPaths = options.paths.length > 0 ? [...options.paths] : [];
	const findings: GitIgnoreAuditFinding[] = [];
	const issues: string[] = [];
	const policy: GitIgnoreAuditPolicy = {
		input_mode: requestedPaths.length > 0 ? 'explicit_paths' : 'git_changed_files',
		max_paths: positiveInteger(options.maxPaths, DEFAULT_MAX_PATHS),
		source_kinds: SOURCE_KINDS,
		tracked_paths_can_match_ignore: true,
	};
	const effectivePaths = requestedPaths.length > 0 ? requestedPaths : collectGitChangedFiles(root, issues, findings);
	const auditTargets = resolveAuditPaths(root, effectivePaths, policy.max_paths, findings, issues);
	const sources = inspectIgnoreSources(root);
	const paths = auditTargets.map((entry) => auditPath(root, entry, findings, issues));

	if (effectivePaths.length === 0 && issues.length === 0) {
		const message = 'No input paths were available for Git ignore auditing.';
		findings.push(makeFinding('git_ignore_audit_no_input_paths', 'low', '.', message, null));
	}

	const summary = summarize(paths, sources, findings);
	const hasHighFinding = findings.some((finding) => finding.severity === 'high' || finding.severity === 'critical');
	const status: ScriptCheckStatus = hasHighFinding || issues.length > 0 ? 'error' : findings.length > 0 ? 'failed' : 'passed';

	return {
		schema_version: '1',
		command: 'script-pack',
		pack_id: REPO_GIT_IGNORE_AUDIT_PACK_ID,
		script_id: REPO_GIT_IGNORE_AUDIT_SCRIPT_ID,
		script_ref: REPO_GIT_IGNORE_AUDIT_SCRIPT_REF,
		action: 'audit',
		status,
		ok: status === 'passed',
		mustflow_root: root,
		input: {
			paths: requestedPaths,
		},
		policy,
		input_hash: createInputHash({ inputPaths: requestedPaths, policy, sources, paths, findings, issues }),
		summary,
		sources,
		paths,
		findings,
		issues,
	};
}
