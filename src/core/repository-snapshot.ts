import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { lstatSync, readFileSync, readlinkSync, readdirSync, type BigIntStats } from 'node:fs';
import path from 'node:path';

const MAX_SNAPSHOT_FILES = 20_000;
const MAX_SNAPSHOT_DIRECTORY_DEPTH = 200;
const GIT_STATUS_TIMEOUT_MS = 10_000;
const GIT_STATUS_MAX_BUFFER_BYTES = 16 * 1024 * 1024;
const GIT_STATUS_UNTRACKED_MODE = 'all';
const MAX_HASH_BYTES = 5 * 1024 * 1024;
const RECURSIVE_SNAPSHOT_ENV = 'MUSTFLOW_WRITE_DRIFT_SNAPSHOT';
const EXCLUDED_DIRECTORY_NAMES = new Set(['.git', 'node_modules']);
const EXCLUDED_RELATIVE_DIRECTORY_PATHS = new Set(['.mustflow/state/perf', '.mustflow/state/runs']);

type RepositoryFileSignature = string;
export type RepositorySnapshotEnvironment = NodeJS.ProcessEnv;
export type RepositorySnapshotStatus = 'checked' | 'partial' | 'unavailable';
export type RepositorySnapshotSource = 'git_status' | 'recursive_snapshot' | 'unavailable';

export interface RepositorySnapshotMetrics {
	readonly git_process_count: number;
	readonly inspected_path_count: number;
	readonly hashed_file_count: number;
	readonly reused_file_hash_count: number;
}

export interface RepositorySnapshot {
	readonly status: RepositorySnapshotStatus;
	readonly entries: ReadonlyMap<string, RepositoryFileSignature>;
	readonly reason: string | null;
	readonly source: RepositorySnapshotSource;
	readonly metrics: RepositorySnapshotMetrics;
}

export interface CaptureRepositorySnapshotOptions {
	readonly env: RepositorySnapshotEnvironment;
	readonly previous?: RepositorySnapshot | null;
}

interface SnapshotData {
	readonly status: RepositorySnapshotStatus;
	readonly entries: ReadonlyMap<string, RepositoryFileSignature>;
	readonly reason: string | null;
	readonly source: RepositorySnapshotSource;
}

interface MutableRepositorySnapshotMetrics {
	gitProcessCount: number;
	inspectedPathCount: number;
	hashedFileCount: number;
	reusedFileHashCount: number;
}

interface SnapshotCaptureContext {
	readonly previousHashes: ReadonlyMap<string, string>;
	readonly currentHashes: Map<string, string>;
	readonly metrics: MutableRepositorySnapshotMetrics;
}

// Digest metadata stays process-local so repository receipts never persist cache internals.
const SNAPSHOT_HASHES = new WeakMap<RepositorySnapshot, ReadonlyMap<string, string>>();

function isRecursiveSnapshotEnabled(): boolean {
	const value = process.env[RECURSIVE_SNAPSHOT_ENV];

	return value === '1' || value?.toLowerCase() === 'true';
}

function toPosixPath(value: string): string {
	return value.split(path.sep).join('/');
}

export function normalizeRepositoryRelativePath(value: string): string {
	return toPosixPath(value).replace(/^\.\/+/u, '').replace(/\/+$/u, '') || '.';
}

export function repositoryPathKey(value: string): string {
	const normalized = normalizeRepositoryRelativePath(value);
	return process.platform === 'win32' ? normalized.toLowerCase() : normalized;
}

function isExcludedDirectory(relativePath: string, basename: string): boolean {
	const normalized = normalizeRepositoryRelativePath(relativePath);
	return EXCLUDED_DIRECTORY_NAMES.has(basename) || EXCLUDED_RELATIVE_DIRECTORY_PATHS.has(normalized);
}

function createMetrics(): MutableRepositorySnapshotMetrics {
	return {
		gitProcessCount: 0,
		inspectedPathCount: 0,
		hashedFileCount: 0,
		reusedFileHashCount: 0,
	};
}

function finalizeSnapshot(
	data: SnapshotData,
	metrics: MutableRepositorySnapshotMetrics,
	hashes: ReadonlyMap<string, string>,
): RepositorySnapshot {
	const snapshot: RepositorySnapshot = {
		...data,
		metrics: {
			git_process_count: metrics.gitProcessCount,
			inspected_path_count: metrics.inspectedPathCount,
			hashed_file_count: metrics.hashedFileCount,
			reused_file_hash_count: metrics.reusedFileHashCount,
		},
	};
	SNAPSHOT_HASHES.set(snapshot, hashes);
	return snapshot;
}

function fileIdentity(stat: BigIntStats, relativePath: string): string {
	return stat.ino > 0n
		? `${stat.dev}:${stat.ino}`
		: `path:${repositoryPathKey(relativePath)}`;
}

function fileHashKey(stat: BigIntStats, relativePath: string): string {
	return [
		fileIdentity(stat, relativePath),
		stat.size,
		stat.mtimeNs,
		stat.ctimeNs,
	].join(':');
}

function hashFile(
	fullPath: string,
	relativePath: string,
	stat: BigIntStats,
	context: SnapshotCaptureContext,
): string {
	const key = fileHashKey(stat, relativePath);
	const reusable = context.previousHashes.get(key);

	if (reusable) {
		context.currentHashes.set(key, reusable);
		context.metrics.reusedFileHashCount += 1;
		return reusable;
	}

	const digest = createHash('sha256').update(readFileSync(fullPath)).digest('hex');
	context.currentHashes.set(key, digest);
	context.metrics.hashedFileCount += 1;
	return digest;
}

function signatureForPath(fullPath: string, stat: BigIntStats, context: SnapshotCaptureContext): RepositoryFileSignature {
	context.metrics.inspectedPathCount += 1;

	if (stat.isSymbolicLink()) {
		return `symlink:${readlinkSync(fullPath)}`;
	}

	const type = stat.isDirectory() ? 'directory' : stat.isFile() ? 'file' : 'other';
	return `${type}:${stat.size}:${stat.mtimeNs}`;
}

function signatureForGitStatusPath(
	fullPath: string,
	relativePath: string,
	status: string,
	stat: BigIntStats,
	context: SnapshotCaptureContext,
): RepositoryFileSignature {
	context.metrics.inspectedPathCount += 1;

	if (stat.isSymbolicLink()) {
		return `git:${status}:symlink:${readlinkSync(fullPath)}`;
	}

	if (!stat.isFile()) {
		return `git:${status}:${stat.isDirectory() ? 'directory' : 'other'}:${stat.size}:${stat.mtimeNs}`;
	}

	if (stat.size > BigInt(MAX_HASH_BYTES)) {
		return `git:${status}:file:${stat.size}:${stat.mtimeNs}:unhashed`;
	}

	return `git:${status}:file:${stat.size}:${hashFile(fullPath, relativePath, stat, context)}`;
}

function collectSnapshotEntries(
	currentPath: string,
	currentRelativePath: string,
	depth: number,
	entries: Map<string, RepositoryFileSignature>,
	context: SnapshotCaptureContext,
): void {
	if (depth > MAX_SNAPSHOT_DIRECTORY_DEPTH) {
		throw new Error('snapshot_directory_depth_limit_exceeded');
	}

	const names = readdirSync(currentPath).sort((left, right) => left.localeCompare(right));

	for (const name of names) {
		const fullPath = path.join(currentPath, name);
		const relativePath = currentRelativePath === '.' ? name : `${currentRelativePath}/${name}`;
		const stat = lstatSync(fullPath, { bigint: true });

		if (stat.isDirectory()) {
			if (isExcludedDirectory(relativePath, name)) {
				continue;
			}

			collectSnapshotEntries(fullPath, relativePath, depth + 1, entries, context);
			continue;
		}

		if (entries.size >= MAX_SNAPSHOT_FILES) {
			throw new Error('snapshot_file_limit_exceeded');
		}

		entries.set(relativePath, signatureForPath(fullPath, stat, context));
	}
}

function addGitStatusPath(
	projectRoot: string,
	relativePath: string,
	status: string,
	entries: Map<string, RepositoryFileSignature>,
	context: SnapshotCaptureContext,
): boolean {
	if (entries.size >= MAX_SNAPSHOT_FILES) {
		return false;
	}

	const fullPath = path.join(projectRoot, ...relativePath.split('/'));
	try {
		const stat = lstatSync(fullPath, { bigint: true });
		entries.set(relativePath, signatureForGitStatusPath(fullPath, relativePath, status, stat, context));
	} catch {
		context.metrics.inspectedPathCount += 1;
		entries.set(relativePath, `git:${status}:missing`);
	}
	return true;
}

function captureGitStatusSnapshot(
	projectRoot: string,
	env: RepositorySnapshotEnvironment,
	context: SnapshotCaptureContext,
): SnapshotData | null {
	context.metrics.gitProcessCount += 1;
	const result = spawnSync(
		'git',
		[
			'-C', projectRoot,
			'status', '--porcelain=v1', '-z',
			`--untracked-files=${GIT_STATUS_UNTRACKED_MODE}`,
			'--ignored',
			'--', '.', ':(exclude,glob)**/node_modules/**',
		],
		{
			encoding: 'utf8',
			env,
			input: '',
			maxBuffer: GIT_STATUS_MAX_BUFFER_BYTES,
			stdio: ['ignore', 'pipe', 'pipe'],
			timeout: GIT_STATUS_TIMEOUT_MS,
			windowsHide: true,
		},
	);

	const errorCode = typeof result.error === 'object' && result.error && 'code' in result.error
		? String(result.error.code)
		: null;

	if (errorCode === 'ETIMEDOUT') {
		return {
			status: 'unavailable',
			entries: new Map<string, RepositoryFileSignature>(),
			reason: 'git_status_timeout',
			source: 'unavailable',
		};
	}

	if (errorCode === 'ENOBUFS') {
		return {
			status: 'unavailable',
			entries: new Map<string, RepositoryFileSignature>(),
			reason: 'git_status_output_limit_exceeded',
			source: 'unavailable',
		};
	}

	if (result.error || result.status !== 0 || typeof result.stdout !== 'string') {
		return null;
	}

	const entries = new Map<string, RepositoryFileSignature>();
	const parts = result.stdout.split('\0').filter((part) => part.length > 0);

	for (let index = 0; index < parts.length; index += 1) {
		const entry = parts[index] ?? '';
		const status = entry.slice(0, 2);
		const filePath = normalizeRepositoryRelativePath(entry.slice(3));

		if (filePath.length === 0) {
			continue;
		}

		if (!addGitStatusPath(projectRoot, filePath, status, entries, context)) {
			return {
				status: 'partial',
				entries,
				reason: 'snapshot_file_limit_exceeded',
				source: 'git_status',
			};
		}

		if (status.includes('R') || status.includes('C')) {
			const rawSourcePath = parts[index + 1] ?? '';
			if (status.includes('R') && rawSourcePath.length > 0) {
				const sourcePath = normalizeRepositoryRelativePath(rawSourcePath);
				if (!addGitStatusPath(projectRoot, sourcePath, status, entries, context)) {
					return {
						status: 'partial',
						entries,
						reason: 'snapshot_file_limit_exceeded',
						source: 'git_status',
					};
				}
			}
			index += 1;
		}
	}

	return {
		status: 'checked',
		entries,
		reason: null,
		source: 'git_status',
	};
}

export function captureRepositorySnapshot(
	projectRoot: string,
	options: CaptureRepositorySnapshotOptions,
): RepositorySnapshot {
	const metrics = createMetrics();
	const previousHashes = options.previous
		? SNAPSHOT_HASHES.get(options.previous) ?? new Map<string, string>()
		: new Map<string, string>();
	const currentHashes = new Map<string, string>();
	const context: SnapshotCaptureContext = { previousHashes, currentHashes, metrics };
	const gitSnapshot = captureGitStatusSnapshot(projectRoot, options.env, context);

	if (gitSnapshot) {
		return finalizeSnapshot(gitSnapshot, metrics, currentHashes);
	}

	if (!isRecursiveSnapshotEnabled()) {
		return finalizeSnapshot(
			{
				status: 'unavailable',
				entries: new Map<string, RepositoryFileSignature>(),
				reason: 'git_status_unavailable_recursive_snapshot_disabled',
				source: 'unavailable',
			},
			metrics,
			currentHashes,
		);
	}

	try {
		const entries = new Map<string, RepositoryFileSignature>();
		collectSnapshotEntries(projectRoot, '.', 0, entries, context);
		return finalizeSnapshot(
			{ status: 'checked', entries, reason: null, source: 'recursive_snapshot' },
			metrics,
			currentHashes,
		);
	} catch (error) {
		return finalizeSnapshot(
			{
				status: 'unavailable',
				entries: new Map<string, RepositoryFileSignature>(),
				reason: error instanceof Error && error.message.length > 0 ? error.message : 'snapshot_unavailable',
				source: 'unavailable',
			},
			metrics,
			currentHashes,
		);
	}
}
