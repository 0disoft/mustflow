import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { existsSync, lstatSync, readdirSync, type Dirent } from 'node:fs';
import path from 'node:path';

import type {
	ScriptCheckFinding,
	ScriptCheckFindingSeverity,
	ScriptCheckStatus,
} from './script-check-result.js';
import { DEFAULT_IGNORED_DIRECTORIES, isIgnoredDirectoryPath } from './ignored-directories.js';
import { ensureInsideWithoutSymlinks, readUtf8FileInsideWithoutSymlinks } from './safe-filesystem.js';

export const REPO_MERGE_CONFLICT_SCAN_PACK_ID = 'repo';
export const REPO_MERGE_CONFLICT_SCAN_SCRIPT_ID = 'merge-conflict-scan';
export const REPO_MERGE_CONFLICT_SCAN_SCRIPT_REF =
	`${REPO_MERGE_CONFLICT_SCAN_PACK_ID}/${REPO_MERGE_CONFLICT_SCAN_SCRIPT_ID}`;

export type MergeConflictMarkerKind = 'start' | 'base' | 'separator' | 'end';

export type MergeConflictScanFindingCode =
	| 'merge_conflict_marker_detected'
	| 'merge_conflict_scan_git_unavailable'
	| 'merge_conflict_scan_no_input_files'
	| 'merge_conflict_scan_max_files_exceeded'
	| 'merge_conflict_scan_file_too_large'
	| 'merge_conflict_scan_unreadable_path'
	| 'merge_conflict_scan_path_outside_root';

export interface MergeConflictScanOptions {
	readonly paths: readonly string[];
	readonly maxFiles?: number;
	readonly maxFileBytes?: number;
}

export interface MergeConflictScanPolicy {
	readonly input_mode: 'explicit_paths' | 'git_changed_files';
	readonly marker_prefixes: readonly string[];
	readonly max_files: number;
	readonly max_file_bytes: number;
	readonly skipped_directories: readonly string[];
}

export interface MergeConflictScannedFile {
	readonly path: string;
	readonly sha256: string;
	readonly bytes: number;
	readonly markers: number;
}

export interface MergeConflictMarker {
	readonly path: string;
	readonly line: number;
	readonly column: number;
	readonly marker: MergeConflictMarkerKind;
	readonly marker_length: number;
}

export interface MergeConflictScanFinding extends ScriptCheckFinding {
	readonly code: MergeConflictScanFindingCode;
	readonly path: string;
	readonly line: number | null;
	readonly marker: MergeConflictMarkerKind | null;
}

export interface MergeConflictScanSummary {
	readonly files_checked: number;
	readonly markers_found: number;
	readonly files_with_markers: number;
	readonly issues: number;
}

export interface MergeConflictScanReport {
	readonly schema_version: '1';
	readonly command: 'script-pack';
	readonly pack_id: typeof REPO_MERGE_CONFLICT_SCAN_PACK_ID;
	readonly script_id: typeof REPO_MERGE_CONFLICT_SCAN_SCRIPT_ID;
	readonly script_ref: typeof REPO_MERGE_CONFLICT_SCAN_SCRIPT_REF;
	readonly action: 'check';
	readonly status: ScriptCheckStatus;
	readonly ok: boolean;
	readonly mustflow_root: string;
	readonly input: {
		readonly paths: readonly string[];
	};
	readonly policy: MergeConflictScanPolicy;
	readonly input_hash: string;
	readonly summary: MergeConflictScanSummary;
	readonly files: readonly MergeConflictScannedFile[];
	readonly markers: readonly MergeConflictMarker[];
	readonly findings: readonly MergeConflictScanFinding[];
	readonly issues: readonly string[];
}

interface GitResult {
	readonly ok: boolean;
	readonly stdout: string;
	readonly stderr: string;
}

const DEFAULT_MAX_FILES = 1000;
const DEFAULT_MAX_FILE_BYTES = 512 * 1024;
const MARKER_PATTERNS: readonly { readonly prefix: string; readonly marker: MergeConflictMarkerKind }[] = [
	{ prefix: '<<<<<<<', marker: 'start' },
	{ prefix: '|||||||', marker: 'base' },
	{ prefix: '=======', marker: 'separator' },
	{ prefix: '>>>>>>>', marker: 'end' },
];
const SKIPPED_DIRECTORY_NAMES = new Set([
	...DEFAULT_IGNORED_DIRECTORIES,
	'vendor',
	'third_party',
]);

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

function collectGitChangedFiles(root: string, issues: string[], findings: MergeConflictScanFinding[]): readonly string[] {
	if (!isInsideGitWorktree(root)) {
		const message = 'Git worktree is unavailable; provide explicit paths to scan.';
		issues.push(message);
		findings.push(makeFinding('merge_conflict_scan_git_unavailable', 'low', '.', message, null, null));
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

function shouldSkipDirectory(relativePath: string): boolean {
	const normalized = normalizeRelativePath(relativePath);
	return isIgnoredDirectoryPath(normalized, [...SKIPPED_DIRECTORY_NAMES]);
}

function isLikelyTextFile(relativePath: string): boolean {
	const extension = path.posix.extname(relativePath).toLowerCase();
	if (!extension) {
		return true;
	}

	return ![
		'.png',
		'.jpg',
		'.jpeg',
		'.gif',
		'.webp',
		'.ico',
		'.pdf',
		'.zip',
		'.gz',
		'.tgz',
		'.wasm',
		'.sqlite',
		'.db',
		'.lockb',
	].includes(extension);
}

function listFilesUnder(root: string, relativePath: string, findings: MergeConflictScanFinding[], issues: string[]): readonly string[] {
	const absolutePath = path.join(root, ...relativePath.split('/'));
	let entries: Dirent<string>[];

	try {
		ensureInsideWithoutSymlinks(root, absolutePath);
		entries = readdirSync(absolutePath, { withFileTypes: true });
	} catch (error) {
		const message = error instanceof Error ? error.message : String(error);
		issues.push(`${relativePath}: ${message}`);
		findings.push(makeFinding('merge_conflict_scan_unreadable_path', 'high', relativePath, message, null, null));
		return [];
	}

	const files: string[] = [];
	for (const entry of entries.sort((left, right) => left.name.localeCompare(right.name))) {
		const child = normalizeRelativePath(relativePath === '.' ? entry.name : `${relativePath}/${entry.name}`);
		if (entry.isDirectory()) {
			if (!shouldSkipDirectory(child)) {
				files.push(...listFilesUnder(root, child, findings, issues));
			}
			continue;
		}

		if (entry.isFile() && isLikelyTextFile(child)) {
			files.push(child);
		}
	}

	return files;
}

function resolveInputFiles(
	root: string,
	inputPaths: readonly string[],
	policy: MergeConflictScanPolicy,
	findings: MergeConflictScanFinding[],
	issues: string[],
): readonly string[] {
	const files: string[] = [];
	const seen = new Set<string>();

	for (const inputPath of inputPaths) {
		const absolutePath = path.resolve(root, inputPath);
		let relativePath: string;

		try {
			ensureInsideWithoutSymlinks(root, absolutePath);
			relativePath = normalizeRelativePath(path.relative(root, absolutePath));
		} catch (error) {
			const message = error instanceof Error ? error.message : String(error);
			issues.push(`${inputPath}: ${message}`);
			findings.push(makeFinding('merge_conflict_scan_path_outside_root', 'high', inputPath, message, null, null));
			continue;
		}

		if (!existsSync(absolutePath)) {
			continue;
		}

		let stats: ReturnType<typeof lstatSync>;
		try {
			stats = lstatSync(absolutePath);
		} catch (error) {
			const message = error instanceof Error ? error.message : String(error);
			issues.push(`${relativePath}: ${message}`);
			findings.push(makeFinding('merge_conflict_scan_unreadable_path', 'high', relativePath, message, null, null));
			continue;
		}

		const candidates = stats.isDirectory()
			? listFilesUnder(root, relativePath, findings, issues)
			: stats.isFile() && isLikelyTextFile(relativePath)
				? [relativePath]
				: [];

		for (const candidate of candidates) {
			if (seen.has(candidate)) {
				continue;
			}
			if (files.length >= policy.max_files) {
				const message = `Merge-conflict scan reached max_files ${policy.max_files}; remaining files were skipped.`;
				issues.push(message);
				findings.push(makeFinding('merge_conflict_scan_max_files_exceeded', 'high', candidate, message, null, null));
				return files;
			}

			seen.add(candidate);
			files.push(candidate);
		}
	}

	return files.sort((left, right) => left.localeCompare(right));
}

function markerForLine(line: string): { readonly marker: MergeConflictMarkerKind; readonly markerLength: number } | null {
	const trimmedStart = line.trimStart();
	for (const pattern of MARKER_PATTERNS) {
		if (trimmedStart.startsWith(pattern.prefix)) {
			return { marker: pattern.marker, markerLength: pattern.prefix.length };
		}
	}
	return null;
}

function makeFinding(
	code: MergeConflictScanFindingCode,
	severity: ScriptCheckFindingSeverity,
	pathValue: string,
	message: string,
	line: number | null,
	marker: MergeConflictMarkerKind | null,
): MergeConflictScanFinding {
	return {
		code,
		severity,
		path: pathValue,
		line,
		marker,
		message,
		json_pointer: null,
		metric: null,
		actual: null,
		expected: null,
	};
}

function scanFile(
	root: string,
	relativePath: string,
	policy: MergeConflictScanPolicy,
	findings: MergeConflictScanFinding[],
	issues: string[],
): { readonly file: MergeConflictScannedFile | null; readonly markers: readonly MergeConflictMarker[] } {
	let content: string;
	try {
		content = readUtf8FileInsideWithoutSymlinks(root, path.join(root, ...relativePath.split('/')), {
			maxBytes: policy.max_file_bytes,
		});
	} catch (error) {
		const message = error instanceof Error ? error.message : String(error);
		const code = message.includes('exceeds maximum size')
			? 'merge_conflict_scan_file_too_large'
			: 'merge_conflict_scan_unreadable_path';
		const severity: ScriptCheckFindingSeverity = code === 'merge_conflict_scan_file_too_large' ? 'medium' : 'high';
		issues.push(`${relativePath}: ${message}`);
		findings.push(makeFinding(code, severity, relativePath, message, null, null));
		return { file: null, markers: [] };
	}

	const fileMarkers: MergeConflictMarker[] = [];
	const lines = content.split(/\r\n|\n|\r/u);
	for (const [index, line] of lines.entries()) {
		const marker = markerForLine(line);
		if (!marker) {
			continue;
		}

		const column = line.length - line.trimStart().length + 1;
		const lineNumber = index + 1;
		fileMarkers.push({
			path: relativePath,
			line: lineNumber,
			column,
			marker: marker.marker,
			marker_length: marker.markerLength,
		});
		findings.push(
			makeFinding(
				'merge_conflict_marker_detected',
				'high',
				relativePath,
				`Merge conflict marker "${marker.marker}" detected at ${relativePath}:${lineNumber}.`,
				lineNumber,
				marker.marker,
			),
		);
	}

	return {
		file: {
			path: relativePath,
			sha256: sha256(content),
			bytes: Buffer.byteLength(content, 'utf8'),
			markers: fileMarkers.length,
		},
		markers: fileMarkers,
	};
}

function summarize(
	files: readonly MergeConflictScannedFile[],
	markers: readonly MergeConflictMarker[],
	issues: readonly string[],
): MergeConflictScanSummary {
	return {
		files_checked: files.length,
		markers_found: markers.length,
		files_with_markers: files.filter((file) => file.markers > 0).length,
		issues: issues.length,
	};
}

function createInputHash(reportInput: {
	readonly inputPaths: readonly string[];
	readonly policy: MergeConflictScanPolicy;
	readonly files: readonly MergeConflictScannedFile[];
	readonly markers: readonly MergeConflictMarker[];
	readonly findings: readonly MergeConflictScanFinding[];
	readonly issues: readonly string[];
}): string {
	return sha256(JSON.stringify(reportInput));
}

export function checkRepoMergeConflictScan(
	projectRoot: string,
	options: MergeConflictScanOptions,
): MergeConflictScanReport {
	const root = path.resolve(projectRoot);
	const inputPaths = options.paths.length > 0 ? [...options.paths] : [];
	const findings: MergeConflictScanFinding[] = [];
	const issues: string[] = [];
	const policy: MergeConflictScanPolicy = {
		input_mode: inputPaths.length > 0 ? 'explicit_paths' : 'git_changed_files',
		marker_prefixes: MARKER_PATTERNS.map((pattern) => pattern.prefix),
		max_files: positiveInteger(options.maxFiles, DEFAULT_MAX_FILES),
		max_file_bytes: positiveInteger(options.maxFileBytes, DEFAULT_MAX_FILE_BYTES),
		skipped_directories: [...SKIPPED_DIRECTORY_NAMES].sort((left, right) => left.localeCompare(right)),
	};
	const effectivePaths = inputPaths.length > 0 ? inputPaths : collectGitChangedFiles(root, issues, findings);
	const scanTargets = resolveInputFiles(root, effectivePaths, policy, findings, issues);
	const files: MergeConflictScannedFile[] = [];
	const markers: MergeConflictMarker[] = [];

	for (const target of scanTargets) {
		const result = scanFile(root, target, policy, findings, issues);
		if (result.file) {
			files.push(result.file);
		}
		markers.push(...result.markers);
	}

	if (effectivePaths.length === 0 && issues.length === 0) {
		const message = 'No input files were available for merge-conflict scanning.';
		findings.push(makeFinding('merge_conflict_scan_no_input_files', 'low', '.', message, null, null));
	}

	const summary = summarize(files, markers, issues);
	const hasHighFinding = findings.some((finding) => finding.severity === 'high' || finding.severity === 'critical');
	const status: ScriptCheckStatus = findings.some(
		(finding) => finding.code === 'merge_conflict_scan_path_outside_root',
	)
		? 'error'
		: hasHighFinding
			? 'failed'
			: 'passed';

	return {
		schema_version: '1',
		command: 'script-pack',
		pack_id: REPO_MERGE_CONFLICT_SCAN_PACK_ID,
		script_id: REPO_MERGE_CONFLICT_SCAN_SCRIPT_ID,
		script_ref: REPO_MERGE_CONFLICT_SCAN_SCRIPT_REF,
		action: 'check',
		status,
		ok: status === 'passed',
		mustflow_root: root,
		input: {
			paths: inputPaths,
		},
		policy,
		input_hash: createInputHash({ inputPaths, policy, files, markers, findings, issues }),
		summary,
		files,
		markers,
		findings,
		issues,
	};
}
