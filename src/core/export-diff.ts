import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

import { extractSymbols, languageForPath, type CodeOutlineLanguage, type CodeOutlineSymbol } from './code-outline.js';
import {
	type ScriptCheckArtifact,
	type ScriptCheckFinding,
	type ScriptCheckFindingSeverity,
	type ScriptCheckStatus,
} from './script-check-result.js';
import { DEFAULT_IGNORED_DIRECTORIES, isIgnoredDirectoryPath } from './ignored-directories.js';
import { ensureInsideWithoutSymlinks, readFileInsideWithoutSymlinks } from './safe-filesystem.js';

export const CODE_EXPORT_DIFF_SCRIPT_ID = 'export-diff';
export const CODE_EXPORT_DIFF_SCRIPT_REF = `code/${CODE_EXPORT_DIFF_SCRIPT_ID}`;

export type ExportDiffChange = 'added' | 'removed' | 'changed' | 'unchanged';
export type ExportDiffCompatibility =
	| 'additive'
	| 'removed_export'
	| 'signature_changed'
	| 'return_changed'
	| 'unchanged'
	| 'unknown';
export type ExportDiffFindingCode =
	| 'export_diff_git_unavailable'
	| 'export_diff_invalid_ref'
	| 'export_diff_unreadable_path'
	| 'export_diff_file_too_large'
	| 'export_diff_max_files_exceeded'
	| 'export_diff_duplicate_export'
	| 'export_diff_reexport_unresolved';

export interface ExportDiffPolicy {
	readonly base_ref: string;
	readonly head_ref: string | null;
	readonly compare_worktree: boolean;
	readonly max_files: number;
	readonly max_file_bytes: number;
	readonly extensions: readonly string[];
	readonly ignored_directories: readonly string[];
	readonly path_filters: readonly string[];
}

export interface ExportDiffPackageSurface {
	readonly package_json_present: boolean;
	readonly type: string | null;
	readonly exports: readonly string[];
	readonly bin: readonly string[];
	readonly types: string | null;
}

export interface ExportDiffFile extends ScriptCheckArtifact {
	readonly kind: 'source_file';
	readonly language: CodeOutlineLanguage;
	readonly base_sha256: string | null;
	readonly head_sha256: string | null;
	readonly base_exists: boolean;
	readonly head_exists: boolean;
	readonly exported_count_before: number;
	readonly exported_count_after: number;
}

export interface ExportDiffSymbolSnapshot {
	readonly path: string;
	readonly name: string;
	readonly kind: CodeOutlineSymbol['kind'];
	readonly language: CodeOutlineLanguage;
	readonly signature: string;
	readonly return_type: string | null;
	readonly return_behavior: CodeOutlineSymbol['return_behavior'];
	readonly async: boolean;
	readonly line: number;
}

export interface ExportDiffEntry {
	readonly id: string;
	readonly path: string;
	readonly name: string;
	readonly kind: CodeOutlineSymbol['kind'];
	readonly change: ExportDiffChange;
	readonly before: ExportDiffSymbolSnapshot | null;
	readonly after: ExportDiffSymbolSnapshot | null;
	readonly compatibility: ExportDiffCompatibility;
}

export interface ExportDiffSummary {
	readonly files_changed: number;
	readonly added: number;
	readonly removed: number;
	readonly changed: number;
	readonly unchanged: number;
}

export interface ExportDiffFinding extends ScriptCheckFinding {
	readonly code: ExportDiffFindingCode;
	readonly path: string;
}

export interface ExportDiffReport {
	readonly schema_version: '1';
	readonly command: 'script-pack';
	readonly pack_id: 'code';
	readonly script_id: typeof CODE_EXPORT_DIFF_SCRIPT_ID;
	readonly script_ref: typeof CODE_EXPORT_DIFF_SCRIPT_REF;
	readonly action: 'compare';
	readonly status: ScriptCheckStatus;
	readonly ok: boolean;
	readonly mustflow_root: string;
	readonly policy: ExportDiffPolicy;
	readonly input_hash: string;
	readonly package_surface: ExportDiffPackageSurface;
	readonly files: readonly ExportDiffFile[];
	readonly exports: readonly ExportDiffEntry[];
	readonly summary: ExportDiffSummary;
	readonly findings: readonly ExportDiffFinding[];
	readonly issues: readonly string[];
}

export interface InspectExportDiffOptions {
	readonly baseRef?: string;
	readonly headRef?: string | null;
	readonly paths?: readonly string[];
	readonly maxFiles?: number;
	readonly maxFileBytes?: number;
}

interface GitResult {
	readonly ok: boolean;
	readonly stdout: string;
	readonly stderr: string;
	readonly status: number | null;
}

interface FileSnapshot {
	readonly exists: boolean;
	readonly text: string | null;
	readonly sha256: string | null;
}

const DEFAULT_BASE_REF = 'HEAD';
const DEFAULT_MAX_FILES = 100;
const DEFAULT_MAX_FILE_BYTES = 1024 * 1024;
const SUPPORTED_EXTENSIONS = ['.ts', '.tsx', '.mts', '.cts', '.js', '.jsx', '.mjs', '.cjs'] as const;
const IGNORED_DIRECTORIES = DEFAULT_IGNORED_DIRECTORIES;
const ERROR_CODES = new Set<ExportDiffFindingCode>([
	'export_diff_git_unavailable',
	'export_diff_invalid_ref',
	'export_diff_unreadable_path',
	'export_diff_file_too_large',
	'export_diff_max_files_exceeded',
]);

function toPosixPath(value: string): string {
	return value.replace(/\\/gu, '/');
}

function normalizeRelativePath(value: string): string {
	return toPosixPath(value).replace(/^\.\/+/u, '') || '.';
}

function sha256Tagged(value: Buffer | string): string {
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
	code: ExportDiffFindingCode,
	severity: ScriptCheckFindingSeverity,
	pathValue: string,
	message: string,
): ExportDiffFinding {
	return { code, severity, path: pathValue, message };
}

function isIgnoredPath(relativePath: string): boolean {
	return isIgnoredDirectoryPath(normalizeRelativePath(relativePath), IGNORED_DIRECTORIES);
}

function isSupportedPath(relativePath: string): boolean {
	return SUPPORTED_EXTENSIONS.includes(path.extname(relativePath).toLowerCase() as (typeof SUPPORTED_EXTENSIONS)[number]);
}

function splitGitPaths(stdout: string): readonly string[] {
	return stdout
		.split(/\r?\n/u)
		.map((entry) => normalizeRelativePath(entry.trim()))
		.filter((entry) => entry.length > 0 && entry !== '.');
}

function collectChangedPaths(root: string, policy: ExportDiffPolicy, findings: ExportDiffFinding[], issues: string[]): readonly string[] {
	const diffArgs = policy.head_ref
		? ['diff', '--name-only', '--diff-filter=ACMRTD', policy.base_ref, policy.head_ref, '--', ...policy.path_filters]
		: ['diff', '--name-only', '--diff-filter=ACMRTD', policy.base_ref, '--', ...policy.path_filters];
	const diff = runGit(root, diffArgs);
	if (!diff.ok) {
		const detail = diff.stderr.trim() || diff.stdout.trim() || `git diff exited with ${diff.status}`;
		issues.push(detail);
		findings.push(makeFinding('export_diff_invalid_ref', 'high', '.', detail));
		return [];
	}

	const changed = new Set(splitGitPaths(diff.stdout));
	if (!policy.head_ref) {
		const untracked = runGit(root, ['ls-files', '--others', '--exclude-standard', '--', ...policy.path_filters]);
		if (untracked.ok) {
			for (const entry of splitGitPaths(untracked.stdout)) {
				changed.add(entry);
			}
		}
	}

	const paths = [...changed]
		.filter((entry) => isSupportedPath(entry) && !isIgnoredPath(entry))
		.sort((left, right) => left.localeCompare(right));

	if (paths.length > policy.max_files) {
		const message = `Export diff matched ${paths.length} supported files; max_files is ${policy.max_files}.`;
		issues.push(message);
		findings.push(makeFinding('export_diff_max_files_exceeded', 'high', '.', message));
	}

	return paths.slice(0, policy.max_files);
}

function readGitSnapshot(root: string, ref: string, relativePath: string, maxFileBytes: number): FileSnapshot {
	const result = runGit(root, ['show', `${ref}:${relativePath}`]);
	if (!result.ok) {
		return { exists: false, text: null, sha256: null };
	}

	const bytes = Buffer.byteLength(result.stdout, 'utf8');
	if (bytes > maxFileBytes) {
		throw new Error(`${relativePath} at ${ref} has ${bytes} bytes; max_file_bytes is ${maxFileBytes}.`);
	}

	return { exists: true, text: result.stdout, sha256: sha256Tagged(result.stdout) };
}

function readWorktreeSnapshot(root: string, relativePath: string, maxFileBytes: number): FileSnapshot {
	const absolutePath = path.join(root, ...relativePath.split('/'));
	if (!existsSync(absolutePath)) {
		return { exists: false, text: null, sha256: null };
	}

	ensureInsideWithoutSymlinks(root, absolutePath);
	const buffer = readFileInsideWithoutSymlinks(root, absolutePath, { maxBytes: maxFileBytes });
	return { exists: true, text: buffer.toString('utf8'), sha256: sha256Tagged(buffer) };
}

function snapshotSymbols(relativePath: string, snapshot: FileSnapshot): readonly ExportDiffSymbolSnapshot[] {
	if (!snapshot.exists || snapshot.text === null || snapshot.sha256 === null) {
		return [];
	}
	const language = languageForPath(relativePath);
	if (!language) {
		return [];
	}

	return extractSymbols(relativePath, language, snapshot.sha256, snapshot.text)
		.filter((symbol) => symbol.exported)
		.map((symbol) => ({
			path: symbol.path,
			name: symbol.name,
			kind: symbol.kind,
			language: symbol.language,
			signature: symbol.signature,
			return_type: symbol.return_type,
			return_behavior: symbol.return_behavior,
			async: symbol.async,
			line: symbol.start_line,
		}));
}

function symbolKey(symbol: ExportDiffSymbolSnapshot): string {
	return `${symbol.path}:${symbol.name}`;
}

function buildSymbolMap(
	symbols: readonly ExportDiffSymbolSnapshot[],
	findings: ExportDiffFinding[],
	issues: string[],
): Map<string, ExportDiffSymbolSnapshot> {
	const map = new Map<string, ExportDiffSymbolSnapshot>();
	for (const symbol of symbols) {
		const key = symbolKey(symbol);
		if (map.has(key)) {
			const message = `Multiple exported symbols named ${symbol.name} were found in ${symbol.path}; export diff kept the first match.`;
			issues.push(message);
			findings.push(makeFinding('export_diff_duplicate_export', 'medium', symbol.path, message));
			continue;
		}
		map.set(key, symbol);
	}
	return map;
}

function hasUnresolvedReexport(text: string | null): boolean {
	if (text === null) {
		return false;
	}
	return /^\s*export\s+(?:type\s+)?\{[^}]+\}\s+from\s+['"][^'"]+['"]/mu.test(text) || /^\s*export\s+\*\s+from\s+['"][^'"]+['"]/mu.test(text);
}

function compareSymbols(before: ExportDiffSymbolSnapshot | null, after: ExportDiffSymbolSnapshot | null): {
	readonly change: ExportDiffChange;
	readonly compatibility: ExportDiffCompatibility;
	readonly kind: CodeOutlineSymbol['kind'];
} {
	if (before === null && after !== null) {
		return { change: 'added', compatibility: 'additive', kind: after.kind };
	}
	if (before !== null && after === null) {
		return { change: 'removed', compatibility: 'removed_export', kind: before.kind };
	}
	if (before === null || after === null) {
		return { change: 'changed', compatibility: 'unknown', kind: 'function' };
	}
	if (
		before.kind === after.kind &&
		before.signature === after.signature &&
		before.return_type === after.return_type &&
		before.return_behavior === after.return_behavior &&
		before.async === after.async
	) {
		return { change: 'unchanged', compatibility: 'unchanged', kind: after.kind };
	}
	if (before.return_type !== after.return_type || before.return_behavior !== after.return_behavior) {
		return { change: 'changed', compatibility: 'return_changed', kind: after.kind };
	}
	return { change: 'changed', compatibility: 'signature_changed', kind: after.kind };
}

function packageSurface(root: string): ExportDiffPackageSurface {
	const packageJsonPath = path.join(root, 'package.json');
	if (!existsSync(packageJsonPath)) {
		return { package_json_present: false, type: null, exports: [], bin: [], types: null };
	}

	try {
		const parsed = JSON.parse(readFileSync(packageJsonPath, 'utf8')) as {
			type?: unknown;
			exports?: unknown;
			bin?: unknown;
			types?: unknown;
			typings?: unknown;
		};
		const exportsValue = parsed.exports;
		const binValue = parsed.bin;
		return {
			package_json_present: true,
			type: typeof parsed.type === 'string' ? parsed.type : null,
			exports:
				typeof exportsValue === 'string'
					? ['.']
					: exportsValue && typeof exportsValue === 'object' && !Array.isArray(exportsValue)
						? Object.keys(exportsValue).sort((left, right) => left.localeCompare(right))
						: [],
			bin:
				typeof binValue === 'string'
					? ['.']
					: binValue && typeof binValue === 'object' && !Array.isArray(binValue)
						? Object.keys(binValue).sort((left, right) => left.localeCompare(right))
						: [],
			types: typeof parsed.types === 'string' ? parsed.types : typeof parsed.typings === 'string' ? parsed.typings : null,
		};
	} catch {
		return { package_json_present: true, type: null, exports: [], bin: [], types: null };
	}
}

function createInputHash(policy: ExportDiffPolicy, files: readonly ExportDiffFile[], entries: readonly ExportDiffEntry[]): string {
	return sha256Tagged(
		JSON.stringify({
			policy,
			files: files.map((file) => ({
				path: file.path,
				base_sha256: file.base_sha256,
				head_sha256: file.head_sha256,
				exported_count_before: file.exported_count_before,
				exported_count_after: file.exported_count_after,
			})),
			exports: entries.map((entry) => ({
				id: entry.id,
				change: entry.change,
				compatibility: entry.compatibility,
				before: entry.before?.signature ?? null,
				after: entry.after?.signature ?? null,
			})),
		}),
	);
}

function statusFromFindings(findings: readonly ExportDiffFinding[]): ScriptCheckStatus {
	return findings.some((finding) => ERROR_CODES.has(finding.code)) ? 'error' : 'passed';
}

export function inspectExportDiff(projectRoot: string, options: InspectExportDiffOptions = {}): ExportDiffReport {
	const root = path.resolve(projectRoot);
	const policy: ExportDiffPolicy = {
		base_ref: options.baseRef ?? DEFAULT_BASE_REF,
		head_ref: options.headRef ?? null,
		compare_worktree: !options.headRef,
		max_files: options.maxFiles ?? DEFAULT_MAX_FILES,
		max_file_bytes: options.maxFileBytes ?? DEFAULT_MAX_FILE_BYTES,
		extensions: [...SUPPORTED_EXTENSIONS],
		ignored_directories: [...IGNORED_DIRECTORIES],
		path_filters: [...(options.paths ?? [])].map(normalizeRelativePath),
	};
	const findings: ExportDiffFinding[] = [];
	const issues: string[] = [];

	const gitProbe = runGit(root, ['rev-parse', '--is-inside-work-tree']);
	if (!gitProbe.ok || gitProbe.stdout.trim() !== 'true') {
		const detail = gitProbe.stderr.trim() || gitProbe.stdout.trim() || 'Not inside a git work tree.';
		findings.push(makeFinding('export_diff_git_unavailable', 'high', '.', detail));
		issues.push(detail);
		const status = statusFromFindings(findings);
		return {
			schema_version: '1',
			command: 'script-pack',
			pack_id: 'code',
			script_id: CODE_EXPORT_DIFF_SCRIPT_ID,
			script_ref: CODE_EXPORT_DIFF_SCRIPT_REF,
			action: 'compare',
			status,
			ok: false,
			mustflow_root: root,
			policy,
			input_hash: sha256Tagged(JSON.stringify({ policy, findings })),
			package_surface: packageSurface(root),
			files: [],
			exports: [],
			summary: { files_changed: 0, added: 0, removed: 0, changed: 0, unchanged: 0 },
			findings,
			issues,
		};
	}

	const changedPaths = collectChangedPaths(root, policy, findings, issues);
	const files: ExportDiffFile[] = [];
	const entries: ExportDiffEntry[] = [];

	for (const relativePath of changedPaths) {
		const language = languageForPath(relativePath);
		if (!language) {
			continue;
		}

		let baseSnapshot: FileSnapshot;
		let headSnapshot: FileSnapshot;
		try {
			baseSnapshot = readGitSnapshot(root, policy.base_ref, relativePath, policy.max_file_bytes);
			headSnapshot = policy.head_ref
				? readGitSnapshot(root, policy.head_ref, relativePath, policy.max_file_bytes)
				: readWorktreeSnapshot(root, relativePath, policy.max_file_bytes);
		} catch (error) {
			const message = error instanceof Error ? error.message : String(error);
			const code = message.includes('max_file_bytes') ? 'export_diff_file_too_large' : 'export_diff_unreadable_path';
			findings.push(makeFinding(code, 'high', relativePath, message));
			issues.push(`${relativePath}: ${message}`);
			continue;
		}

		if (hasUnresolvedReexport(baseSnapshot.text) || hasUnresolvedReexport(headSnapshot.text)) {
			const message = `${relativePath} contains re-export declarations; export diff does not resolve barrel targets.`;
			findings.push(makeFinding('export_diff_reexport_unresolved', 'low', relativePath, message));
		}

		const beforeSymbols = snapshotSymbols(relativePath, baseSnapshot);
		const afterSymbols = snapshotSymbols(relativePath, headSnapshot);
		const beforeMap = buildSymbolMap(beforeSymbols, findings, issues);
		const afterMap = buildSymbolMap(afterSymbols, findings, issues);
		const keys = [...new Set([...beforeMap.keys(), ...afterMap.keys()])].sort((left, right) => left.localeCompare(right));

		for (const key of keys) {
			const before = beforeMap.get(key) ?? null;
			const after = afterMap.get(key) ?? null;
			const comparison = compareSymbols(before, after);
			const current = after ?? before;
			if (!current) {
				continue;
			}
			entries.push({
				id: key,
				path: current.path,
				name: current.name,
				kind: comparison.kind,
				change: comparison.change,
				before,
				after,
				compatibility: comparison.compatibility,
			});
		}

		files.push({
			kind: 'source_file',
			path: relativePath,
			language,
			base_sha256: baseSnapshot.sha256,
			head_sha256: headSnapshot.sha256,
			base_exists: baseSnapshot.exists,
			head_exists: headSnapshot.exists,
			exported_count_before: beforeSymbols.length,
			exported_count_after: afterSymbols.length,
		});
	}

	const summary: ExportDiffSummary = {
		files_changed: files.length,
		added: entries.filter((entry) => entry.change === 'added').length,
		removed: entries.filter((entry) => entry.change === 'removed').length,
		changed: entries.filter((entry) => entry.change === 'changed').length,
		unchanged: entries.filter((entry) => entry.change === 'unchanged').length,
	};
	const status = statusFromFindings(findings);

	return {
		schema_version: '1',
		command: 'script-pack',
		pack_id: 'code',
		script_id: CODE_EXPORT_DIFF_SCRIPT_ID,
		script_ref: CODE_EXPORT_DIFF_SCRIPT_REF,
		action: 'compare',
		status,
		ok: status !== 'error',
		mustflow_root: root,
		policy,
		input_hash: createInputHash(policy, files, entries),
		package_surface: packageSurface(root),
		files,
		exports: entries.sort((left, right) => left.path.localeCompare(right.path) || left.name.localeCompare(right.name)),
		summary,
		findings,
		issues,
	};
}
