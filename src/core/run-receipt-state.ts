import { existsSync, lstatSync, readdirSync, readFileSync, rmSync } from 'node:fs';
import path from 'node:path';

import type { RunReceipt } from './run-receipt.js';
import type { RunReceiptRetentionPolicy } from './retention-policy.js';
import { ensureInside, writeJsonFileInsideWithoutSymlinks } from './safe-filesystem.js';

const RUN_RECEIPT_SCHEMA_VERSION = '1';
const RUN_RECEIPT_DIR = path.join('.mustflow', 'state', 'runs');
const LATEST_RUN_RECEIPT_INDEX = 'latest.index.json';
const STATE_DIR_PREFIXES = ['run-', 'verify-'] as const;
const MIN_RETAINED_RUN_DIRS = 1;

type RunStateDirectoryKind = (typeof STATE_DIR_PREFIXES)[number];

interface RetainedRunStateDirectory {
	readonly absolutePath: string;
	readonly relativePath: string;
	readonly name: string;
	readonly kind: RunStateDirectoryKind;
	readonly sortKey: string;
	readonly sizeBytes: number;
}

export interface RunReceiptIndexEntry {
	readonly command: 'run' | 'verify';
	readonly intent?: string | null;
	readonly status?: string | null;
	readonly cwd?: string | null;
	readonly started_at?: string | null;
	readonly finished_at?: string | null;
	readonly correlation_id?: string | null;
	readonly verification_plan_id?: string | null;
	readonly reason?: string | null;
	readonly reasons?: readonly string[];
	readonly receipt_path?: string | null;
	readonly manifest_path?: string | null;
	readonly run_dir: string;
}

export interface RunReceiptIndex {
	readonly schema_version: string;
	readonly kind: 'run_receipt_index';
	readonly generated_at: string;
	readonly retention: {
		readonly max_items: number;
		readonly max_total_mb: number;
		readonly retained_run_dirs: number;
	};
	readonly entries: readonly RunReceiptIndexEntry[];
	readonly latest_by_intent: Record<string, string>;
	readonly latest_by_cwd_intent: Record<string, string>;
}

interface VerifyManifestReceipt {
	readonly intent?: unknown;
	readonly status?: unknown;
	readonly receipt_path?: unknown;
}

interface VerifyManifest {
	readonly command?: unknown;
	readonly correlation_id?: unknown;
	readonly reason?: unknown;
	readonly reasons?: unknown;
	readonly verification_plan_id?: unknown;
	readonly status?: unknown;
	readonly execution_status?: unknown;
	readonly receipts?: unknown;
}

function toPosixPath(value: string): string {
	return value.split(path.sep).join('/');
}

function stateRunsDir(projectRoot: string): string {
	return path.join(projectRoot, RUN_RECEIPT_DIR);
}

function latestIndexPath(projectRoot: string): string {
	return path.join(stateRunsDir(projectRoot), LATEST_RUN_RECEIPT_INDEX);
}

function runStateKind(name: string): RunStateDirectoryKind | null {
	return STATE_DIR_PREFIXES.find((prefix) => name.startsWith(prefix)) ?? null;
}

function isMissingPathError(error: unknown): boolean {
	return error instanceof Error && 'code' in error && error.code === 'ENOENT';
}

function getStateRunSortKey(name: string): string {
	const match = /^(?:run|verify)-(.+)$/u.exec(name);
	return match?.[1] ?? name;
}

function fileSizeBytes(filePath: string): number {
	try {
		const stats = lstatSync(filePath);

		if (stats.isSymbolicLink()) {
			return 0;
		}

		if (stats.isFile()) {
			return stats.size;
		}

		if (!stats.isDirectory()) {
			return 0;
		}

		return readdirSync(filePath).reduce((total, entry) => total + fileSizeBytes(path.join(filePath, entry)), 0);
	} catch (error) {
		if (isMissingPathError(error)) {
			return 0;
		}

		throw error;
	}
}

function readRunStateDirectories(projectRoot: string): RetainedRunStateDirectory[] {
	const receiptDir = stateRunsDir(projectRoot);

	if (!existsSync(receiptDir)) {
		return [];
	}

	return readdirSync(receiptDir)
		.map((name) => {
			const kind = runStateKind(name);
			if (!kind) {
				return null;
			}

			const absolutePath = path.join(receiptDir, name);
			const relativePath = toPosixPath(path.join(RUN_RECEIPT_DIR, name));
			const stats = lstatSync(absolutePath);
			if (!stats.isDirectory() || stats.isSymbolicLink()) {
				return null;
			}

			return {
				absolutePath,
				relativePath,
				name,
				kind,
				sortKey: getStateRunSortKey(name),
				sizeBytes: fileSizeBytes(absolutePath),
			} satisfies RetainedRunStateDirectory;
		})
		.filter((entry): entry is RetainedRunStateDirectory => Boolean(entry))
		.sort(compareRunStateDirectoriesDescending);
}

function compareRunStateDirectoriesDescending(left: RetainedRunStateDirectory, right: RetainedRunStateDirectory): number {
	const bySortKey = right.sortKey.localeCompare(left.sortKey);
	if (bySortKey !== 0) {
		return bySortKey;
	}

	return right.name.localeCompare(left.name);
}

function removeRunStateDirectory(projectRoot: string, directory: RetainedRunStateDirectory): void {
	const runsDir = stateRunsDir(projectRoot);
	ensureInside(runsDir, directory.absolutePath);

	const relativeToRunsDir = path.relative(runsDir, directory.absolutePath);
	if (relativeToRunsDir.startsWith('..') || path.isAbsolute(relativeToRunsDir) || runStateKind(path.basename(directory.absolutePath)) === null) {
		throw new Error(`Refusing to remove unexpected run receipt path: ${directory.relativePath}`);
	}

	const stats = lstatSync(directory.absolutePath);
	if (!stats.isDirectory() || stats.isSymbolicLink()) {
		throw new Error(`Refusing to remove non-directory run receipt path: ${directory.relativePath}`);
	}

	rmSync(directory.absolutePath, { recursive: true, force: true });
}

function applyRunReceiptRetention(projectRoot: string, policy: RunReceiptRetentionPolicy): RetainedRunStateDirectory[] {
	const directories = readRunStateDirectories(projectRoot);
	const maxItems = Math.max(MIN_RETAINED_RUN_DIRS, policy.maxItems);
	const maxTotalBytes = Math.max(1, policy.maxTotalMb) * 1024 * 1024;
	const kept = new Set(directories.slice(0, maxItems).map((directory) => directory.name));

	let totalBytes = directories
		.filter((directory) => kept.has(directory.name))
		.reduce((total, directory) => total + directory.sizeBytes, 0);

	for (const directory of directories.slice(maxItems)) {
		removeRunStateDirectory(projectRoot, directory);
	}

	for (const directory of [...directories].reverse()) {
		if (kept.size <= MIN_RETAINED_RUN_DIRS || !kept.has(directory.name) || totalBytes <= maxTotalBytes) {
			continue;
		}

		removeRunStateDirectory(projectRoot, directory);
		kept.delete(directory.name);
		totalBytes -= directory.sizeBytes;
	}

	return readRunStateDirectories(projectRoot);
}

function readJsonObject(filePath: string): Record<string, unknown> | null {
	try {
		const parsed = JSON.parse(readFileSync(filePath, 'utf8'));
		return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed as Record<string, unknown> : null;
	} catch {
		return null;
	}
}

function stringField(value: unknown): string | null {
	return typeof value === 'string' ? value : null;
}

function stringArrayField(value: unknown): readonly string[] | undefined {
	return Array.isArray(value) && value.every((entry) => typeof entry === 'string') ? value : undefined;
}

function createRunEntry(directory: RetainedRunStateDirectory): RunReceiptIndexEntry | null {
	const receipt = readJsonObject(path.join(directory.absolutePath, 'receipt.json')) as RunReceipt | null;

	if (!receipt || receipt.command !== 'run' || typeof receipt.receipt_path !== 'string') {
		return null;
	}

	return {
		command: 'run',
		intent: stringField(receipt.intent),
		status: stringField(receipt.status),
		cwd: stringField(receipt.cwd),
		started_at: stringField(receipt.started_at),
		finished_at: stringField(receipt.finished_at),
		correlation_id: stringField(receipt.correlation_id),
		receipt_path: receipt.receipt_path,
		run_dir: directory.relativePath,
	};
}

function readVerifyIntentEntry(
	directory: RetainedRunStateDirectory,
	manifest: VerifyManifest,
	manifestPath: string,
	manifestReceipt: VerifyManifestReceipt,
): RunReceiptIndexEntry | null {
	const receiptPath = stringField(manifestReceipt.receipt_path);
	if (!receiptPath) {
		return null;
	}

	const runsDir = path.dirname(directory.absolutePath);
	const receiptAbsolutePath = path.resolve(runsDir, ...receiptPath.split('/').slice(3));
	ensureInside(runsDir, receiptAbsolutePath);
	const receipt = readJsonObject(receiptAbsolutePath);

	return {
		command: 'verify',
		intent: stringField(manifestReceipt.intent),
		status: stringField(manifestReceipt.status),
		cwd: stringField(receipt?.cwd),
		started_at: stringField(receipt?.started_at),
		finished_at: stringField(receipt?.finished_at),
		correlation_id: stringField(manifest.correlation_id),
		verification_plan_id: stringField(manifest.verification_plan_id),
		reason: stringField(manifest.reason),
		reasons: stringArrayField(manifest.reasons),
		receipt_path: receiptPath,
		manifest_path: manifestPath,
		run_dir: directory.relativePath,
	};
}

function createVerifyEntries(directory: RetainedRunStateDirectory): RunReceiptIndexEntry[] {
	const manifestPath = toPosixPath(path.join(directory.relativePath, 'manifest.json'));
	const manifest = readJsonObject(path.join(directory.absolutePath, 'manifest.json')) as VerifyManifest | null;

	if (!manifest || manifest.command !== 'verify') {
		return [];
	}

	const summaryEntry: RunReceiptIndexEntry = {
		command: 'verify',
		intent: null,
		status: stringField(manifest.status ?? manifest.execution_status),
		correlation_id: stringField(manifest.correlation_id),
		verification_plan_id: stringField(manifest.verification_plan_id),
		reason: stringField(manifest.reason),
		reasons: stringArrayField(manifest.reasons),
		manifest_path: manifestPath,
		run_dir: directory.relativePath,
	};
	const receiptEntries = Array.isArray(manifest.receipts)
		? manifest.receipts
				.map((receipt) =>
					receipt && typeof receipt === 'object'
						? readVerifyIntentEntry(directory, manifest, manifestPath, receipt as VerifyManifestReceipt)
						: null,
				)
				.filter((entry): entry is RunReceiptIndexEntry => Boolean(entry))
		: [];

	return [summaryEntry, ...receiptEntries];
}

function createIndexEntries(directories: readonly RetainedRunStateDirectory[]): RunReceiptIndexEntry[] {
	return directories.flatMap((directory) => {
		if (directory.kind === 'run-') {
			const entry = createRunEntry(directory);
			return entry ? [entry] : [];
		}

		return createVerifyEntries(directory);
	});
}

function entryTargetPath(entry: RunReceiptIndexEntry): string | null {
	return entry.receipt_path ?? entry.manifest_path ?? null;
}

function latestLookupEntries(entries: readonly RunReceiptIndexEntry[]): {
	readonly latestByIntent: Record<string, string>;
	readonly latestByCwdIntent: Record<string, string>;
} {
	const latestByIntent: Record<string, string> = {};
	const latestByCwdIntent: Record<string, string> = {};

	for (const entry of entries) {
		const targetPath = entryTargetPath(entry);
		if (!entry.intent || !targetPath) {
			continue;
		}

		latestByIntent[entry.intent] ??= targetPath;

		if (entry.cwd) {
			latestByCwdIntent[`${entry.cwd}::${entry.intent}`] ??= targetPath;
		}
	}

	return { latestByIntent, latestByCwdIntent };
}

export function updateRunReceiptState(projectRoot: string, policy: RunReceiptRetentionPolicy): void {
	const retainedDirectories = applyRunReceiptRetention(projectRoot, policy);
	const entries = createIndexEntries(retainedDirectories);
	const lookups = latestLookupEntries(entries);
	const index: RunReceiptIndex = {
		schema_version: RUN_RECEIPT_SCHEMA_VERSION,
		kind: 'run_receipt_index',
		generated_at: new Date().toISOString(),
		retention: {
			max_items: policy.maxItems,
			max_total_mb: policy.maxTotalMb,
			retained_run_dirs: retainedDirectories.length,
		},
		entries,
		latest_by_intent: lookups.latestByIntent,
		latest_by_cwd_intent: lookups.latestByCwdIntent,
	};

	writeJsonFileInsideWithoutSymlinks(projectRoot, latestIndexPath(projectRoot), index);
}
