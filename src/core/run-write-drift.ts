import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, lstatSync, readFileSync, readlinkSync, readdirSync } from 'node:fs';
import path from 'node:path';

import { normalizeCommandEffects } from './command-effects.js';
import type { CommandContract } from './config-loading.js';

const MAX_SNAPSHOT_FILES = 20_000;
const MAX_REPORTED_PATHS = 200;
const GIT_STATUS_TIMEOUT_MS = 10_000;
const GIT_STATUS_MAX_BUFFER_BYTES = 16 * 1024 * 1024;
const MAX_HASH_BYTES = 5 * 1024 * 1024;
const RECURSIVE_SNAPSHOT_ENV = 'MUSTFLOW_WRITE_DRIFT_SNAPSHOT';
const EXCLUDED_DIRECTORY_NAMES = new Set(['.git', 'node_modules']);
const EXCLUDED_RELATIVE_DIRECTORY_PATHS = new Set(['.mustflow/state/runs']);

type FileSignature = string;

interface SnapshotResult {
	readonly ok: boolean;
	readonly entries: ReadonlyMap<string, FileSignature>;
	readonly reason: string | null;
	readonly source: 'git_status' | 'recursive_snapshot' | 'unavailable';
}

export type RunWriteDriftStatus = 'checked' | 'unavailable';

export interface RunWriteDriftReceipt {
	readonly status: RunWriteDriftStatus;
	readonly declared_paths: readonly string[];
	readonly observed_paths: readonly string[];
	readonly declared_observed_paths: readonly string[];
	readonly undeclared_paths: readonly string[];
	readonly observed_count: number;
	readonly undeclared_count: number;
	readonly has_undeclared_changes: boolean;
	readonly truncated: boolean;
	readonly reason: string | null;
}

export interface RunWriteTracker {
	readonly projectRoot: string;
	readonly declaredPaths: readonly string[];
	readonly before: SnapshotResult;
}

function isRecursiveSnapshotEnabled(): boolean {
	const value = process.env[RECURSIVE_SNAPSHOT_ENV];

	return value === '1' || value?.toLowerCase() === 'true';
}

function toPosixPath(value: string): string {
	return value.split(path.sep).join('/');
}

function normalizeRelativePath(value: string): string {
	return toPosixPath(value).replace(/^\.\/+/u, '').replace(/\/+$/u, '') || '.';
}

function pathKey(value: string): string {
	const normalized = normalizeRelativePath(value);
	return process.platform === 'win32' ? normalized.toLowerCase() : normalized;
}

function isExcludedDirectory(relativePath: string, basename: string): boolean {
	const normalized = normalizeRelativePath(relativePath);
	return EXCLUDED_DIRECTORY_NAMES.has(basename) || EXCLUDED_RELATIVE_DIRECTORY_PATHS.has(normalized);
}

function signatureForPath(fullPath: string): FileSignature {
	const stat = lstatSync(fullPath);

	if (stat.isSymbolicLink()) {
		return `symlink:${readlinkSync(fullPath)}`;
	}

	const type = stat.isDirectory() ? 'directory' : stat.isFile() ? 'file' : 'other';
	return `${type}:${stat.size}:${stat.mtimeMs}`;
}

function signatureForGitStatusPath(projectRoot: string, relativePath: string, status: string): FileSignature {
	const fullPath = path.join(projectRoot, ...relativePath.split('/'));

	if (!existsSync(fullPath)) {
		return `git:${status}:missing`;
	}

	const stat = lstatSync(fullPath);

	if (stat.isSymbolicLink()) {
		return `git:${status}:symlink:${readlinkSync(fullPath)}`;
	}

	if (!stat.isFile()) {
		return `git:${status}:${stat.isDirectory() ? 'directory' : 'other'}:${stat.size}:${stat.mtimeMs}`;
	}

	if (stat.size > MAX_HASH_BYTES) {
		return `git:${status}:file:${stat.size}:${stat.mtimeMs}:unhashed`;
	}

	const digest = createHash('sha256').update(readFileSync(fullPath)).digest('hex');
	return `git:${status}:file:${stat.size}:${digest}`;
}

function collectSnapshotEntries(projectRoot: string, currentPath: string, entries: Map<string, FileSignature>): void {
	const names = readdirSync(currentPath).sort((left, right) => left.localeCompare(right));

	for (const name of names) {
		const fullPath = path.join(currentPath, name);
		const relativePath = normalizeRelativePath(path.relative(projectRoot, fullPath));
		const stat = lstatSync(fullPath);

		if (stat.isDirectory()) {
			if (isExcludedDirectory(relativePath, name)) {
				continue;
			}

			collectSnapshotEntries(projectRoot, fullPath, entries);
			continue;
		}

		if (entries.size >= MAX_SNAPSHOT_FILES) {
			throw new Error('snapshot_file_limit_exceeded');
		}

		entries.set(relativePath, signatureForPath(fullPath));
	}
}

function captureSnapshot(projectRoot: string): SnapshotResult {
	const gitSnapshot = captureGitStatusSnapshot(projectRoot);
	if (gitSnapshot) {
		return gitSnapshot;
	}

	if (!isRecursiveSnapshotEnabled()) {
		return {
			ok: false,
			entries: new Map<string, FileSignature>(),
			reason: 'git_status_unavailable_recursive_snapshot_disabled',
			source: 'unavailable',
		};
	}

	try {
		const entries = new Map<string, FileSignature>();
		collectSnapshotEntries(projectRoot, projectRoot, entries);
		return { ok: true, entries, reason: null, source: 'recursive_snapshot' };
	} catch (error) {
		return {
			ok: false,
			entries: new Map<string, FileSignature>(),
			reason: error instanceof Error && error.message.length > 0 ? error.message : 'snapshot_unavailable',
			source: 'unavailable',
		};
	}
}

function captureGitStatusSnapshot(projectRoot: string): SnapshotResult | null {
	const result = spawnSync('git', ['-C', projectRoot, 'status', '--porcelain=v1', '-z', '--untracked-files=all'], {
		encoding: 'utf8',
		input: '',
		maxBuffer: GIT_STATUS_MAX_BUFFER_BYTES,
		stdio: ['ignore', 'pipe', 'pipe'],
		timeout: GIT_STATUS_TIMEOUT_MS,
		windowsHide: true,
	});

	if (result.error || result.status !== 0) {
		return null;
	}

	const entries = new Map<string, FileSignature>();
	const parts = result.stdout.split('\0').filter((part) => part.length > 0);

	for (let index = 0; index < parts.length; index += 1) {
		const entry = parts[index] ?? '';
		const status = entry.slice(0, 2);
		const filePath = normalizeRelativePath(entry.slice(3));

		if (filePath.length === 0) {
			continue;
		}

		entries.set(filePath, signatureForGitStatusPath(projectRoot, filePath, status));

		if (status.includes('R') || status.includes('C')) {
			index += 1;
		}
	}

	return {
		ok: true,
		entries,
		reason: null,
		source: 'git_status',
	};
}

function listDeclaredWritePaths(projectRoot: string, contract: CommandContract, intentName: string): string[] {
	const paths = normalizeCommandEffects(projectRoot, contract, intentName)
		.filter((effect) => effect.access === 'write')
		.map((effect) => effect.path)
		.filter((effectPath): effectPath is string => typeof effectPath === 'string');

	return [...new Set(paths.map(normalizeRelativePath))].sort((left, right) => left.localeCompare(right));
}

function listObservedChangedPaths(before: ReadonlyMap<string, FileSignature>, after: ReadonlyMap<string, FileSignature>): string[] {
	const paths = new Set([...before.keys(), ...after.keys()]);
	const changed: string[] = [];

	for (const filePath of paths) {
		if (before.get(filePath) !== after.get(filePath)) {
			changed.push(filePath);
		}
	}

	return changed.sort((left, right) => left.localeCompare(right));
}

function declaredPathCoversObservedPath(declaredPath: string, observedPath: string): boolean {
	const declaredKey = pathKey(declaredPath);
	const observedKey = pathKey(observedPath);

	if (declaredKey.endsWith('/**')) {
		const baseKey = declaredKey.slice(0, -3) || '.';
		return baseKey === '.' || observedKey === baseKey || observedKey.startsWith(`${baseKey}/`);
	}

	return declaredKey === '.' || observedKey === declaredKey || observedKey.startsWith(`${declaredKey}/`);
}

function truncatePaths(paths: readonly string[]): { readonly paths: readonly string[]; readonly truncated: boolean } {
	if (paths.length <= MAX_REPORTED_PATHS) {
		return { paths, truncated: false };
	}

	return { paths: paths.slice(0, MAX_REPORTED_PATHS), truncated: true };
}

export function startRunWriteTracking(
	projectRoot: string,
	contract: CommandContract,
	intentName: string,
): RunWriteTracker {
	return {
		projectRoot,
		declaredPaths: listDeclaredWritePaths(projectRoot, contract, intentName),
		before: captureSnapshot(projectRoot),
	};
}

export function finishRunWriteTracking(tracker: RunWriteTracker): RunWriteDriftReceipt {
	if (!tracker.before.ok) {
		return {
			status: 'unavailable',
			declared_paths: tracker.declaredPaths,
			observed_paths: [],
			declared_observed_paths: [],
			undeclared_paths: [],
			observed_count: 0,
			undeclared_count: 0,
			has_undeclared_changes: false,
			truncated: false,
			reason: tracker.before.reason,
		};
	}

	const after = captureSnapshot(tracker.projectRoot);
	if (!after.ok) {
		return {
			status: 'unavailable',
			declared_paths: tracker.declaredPaths,
			observed_paths: [],
			declared_observed_paths: [],
			undeclared_paths: [],
			observed_count: 0,
			undeclared_count: 0,
			has_undeclared_changes: false,
			truncated: false,
			reason: after.reason,
		};
	}

	const observedPaths = listObservedChangedPaths(tracker.before.entries, after.entries);
	const declaredObservedPaths = observedPaths.filter((observedPath) =>
		tracker.declaredPaths.some((declaredPath) => declaredPathCoversObservedPath(declaredPath, observedPath)),
	);
	const undeclaredPaths = observedPaths.filter((observedPath) =>
		!tracker.declaredPaths.some((declaredPath) => declaredPathCoversObservedPath(declaredPath, observedPath)),
	);
	const observed = truncatePaths(observedPaths);
	const declaredObserved = truncatePaths(declaredObservedPaths);
	const undeclared = truncatePaths(undeclaredPaths);

	return {
		status: 'checked',
		declared_paths: tracker.declaredPaths,
		observed_paths: observed.paths,
		declared_observed_paths: declaredObserved.paths,
		undeclared_paths: undeclared.paths,
		observed_count: observedPaths.length,
		undeclared_count: undeclaredPaths.length,
		has_undeclared_changes: undeclaredPaths.length > 0,
		truncated: observed.truncated || declaredObserved.truncated || undeclared.truncated,
		reason: null,
	};
}
