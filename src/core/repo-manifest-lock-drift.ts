import { createHash } from 'node:crypto';
import { existsSync } from 'node:fs';
import path from 'node:path';

import { isRecord } from './config-loading.js';
import { ensureInside, ensureInsideWithoutSymlinks, readFileInsideWithoutSymlinks, readUtf8FileInsideWithoutSymlinks } from './safe-filesystem.js';
import type { ScriptCheckFinding, ScriptCheckFindingSeverity, ScriptCheckStatus } from './script-check-result.js';
import { parseTomlText } from './toml.js';

export const REPO_MANIFEST_LOCK_DRIFT_PACK_ID = 'repo';
export const REPO_MANIFEST_LOCK_DRIFT_SCRIPT_ID = 'manifest-lock-drift';
export const REPO_MANIFEST_LOCK_DRIFT_SCRIPT_REF =
	`${REPO_MANIFEST_LOCK_DRIFT_PACK_ID}/${REPO_MANIFEST_LOCK_DRIFT_SCRIPT_ID}`;
export const REPO_MANIFEST_LOCK_DRIFT_LOCK_PATH = '.mustflow/config/manifest.lock.toml';

export type ManifestLockDriftInputMode = 'all_locked_files' | 'explicit_paths';
export type ManifestLockDriftEntryStatus =
	| 'clean'
	| 'hash_mismatch'
	| 'missing'
	| 'unreadable'
	| 'unsafe_path'
	| 'skipped';

export type ManifestLockDriftFindingCode =
	| 'manifest_lock_missing'
	| 'manifest_lock_invalid'
	| 'manifest_lock_max_entries_exceeded'
	| 'manifest_lock_entry_path_outside_root'
	| 'manifest_lock_entry_missing'
	| 'manifest_lock_entry_unreadable'
	| 'manifest_lock_entry_invalid_hash'
	| 'manifest_lock_hash_mismatch';

export interface ManifestLockDriftOptions {
	readonly paths: readonly string[];
	readonly maxEntries?: number;
}

export interface ManifestLockDriftInput {
	readonly paths: readonly string[];
}

export interface ManifestLockDriftPolicy {
	readonly lock_path: typeof REPO_MANIFEST_LOCK_DRIFT_LOCK_PATH;
	readonly input_mode: ManifestLockDriftInputMode;
	readonly max_entries: number;
	readonly extra_manifest_file_detection: 'not_authoritative';
}

export interface ManifestLockDriftLockMetadata {
	readonly path: typeof REPO_MANIFEST_LOCK_DRIFT_LOCK_PATH;
	readonly exists: boolean;
	readonly schema_version: string | null;
	readonly template_id: string | null;
	readonly template_version: string | null;
	readonly template_profile: string | null;
	readonly template_locale: string | null;
	readonly entries_total: number;
}

export interface ManifestLockDriftEntry {
	readonly path: string;
	readonly source: string | null;
	readonly last_action: string | null;
	readonly lock_hash: string | null;
	readonly actual_hash: string | null;
	readonly exists: boolean;
	readonly status: ManifestLockDriftEntryStatus;
}

export interface ManifestLockDriftSummary {
	readonly entries_total: number;
	readonly entries_checked: number;
	readonly clean_entries: number;
	readonly missing_entries: number;
	readonly hash_mismatches: number;
	readonly unreadable_entries: number;
	readonly unsafe_entries: number;
	readonly skipped_entries: number;
	readonly findings: number;
}

export interface ManifestLockDriftFinding extends ScriptCheckFinding {
	readonly code: ManifestLockDriftFindingCode;
	readonly path: string;
	readonly expected_hash: string | null;
	readonly actual_hash: string | null;
}

export interface ManifestLockDriftReport {
	readonly schema_version: '1';
	readonly command: 'script-pack';
	readonly pack_id: typeof REPO_MANIFEST_LOCK_DRIFT_PACK_ID;
	readonly script_id: typeof REPO_MANIFEST_LOCK_DRIFT_SCRIPT_ID;
	readonly script_ref: typeof REPO_MANIFEST_LOCK_DRIFT_SCRIPT_REF;
	readonly action: 'check';
	readonly status: ScriptCheckStatus;
	readonly ok: boolean;
	readonly mustflow_root: string;
	readonly input: ManifestLockDriftInput;
	readonly policy: ManifestLockDriftPolicy;
	readonly input_hash: string;
	readonly lock: ManifestLockDriftLockMetadata;
	readonly summary: ManifestLockDriftSummary;
	readonly entries: readonly ManifestLockDriftEntry[];
	readonly findings: readonly ManifestLockDriftFinding[];
	readonly issues: readonly string[];
}

interface RawLockedFile {
	readonly relativePath: string;
	readonly source: string | null;
	readonly lastAction: string | null;
	readonly contentHash: string | null;
}

interface RawManifestLock {
	readonly schemaVersion: string | null;
	readonly templateId: string | null;
	readonly templateVersion: string | null;
	readonly templateProfile: string | null;
	readonly templateLocale: string | null;
	readonly files: readonly RawLockedFile[];
}

const DEFAULT_MAX_ENTRIES = 500;
const SHA256_PATTERN = /^sha256:[a-f0-9]{64}$/u;

function sha256(value: string | Buffer): string {
	return `sha256:${createHash('sha256').update(value).digest('hex')}`;
}

function positiveInteger(value: number | undefined, fallback: number): number {
	return typeof value === 'number' && Number.isInteger(value) && value > 0 ? value : fallback;
}

function normalizeRelativePath(value: string): string {
	return value.replace(/\\/gu, '/').replace(/^\.\/+/u, '').replace(/\/+$/u, '') || '.';
}

function readOptionalString(value: unknown): string | null {
	return typeof value === 'string' && value.trim().length > 0 ? value : null;
}

function parseManifestLock(content: string): RawManifestLock {
	const raw = parseTomlText(content);
	if (!isRecord(raw)) {
		throw new Error('manifest lock must contain a TOML table');
	}

	const template = isRecord(raw.template) ? raw.template : {};
	const files = raw.files;
	if (!isRecord(files)) {
		throw new Error('[files] must be a TOML table');
	}

	const lockedFiles: RawLockedFile[] = [];
	for (const [relativePath, file] of Object.entries(files)) {
		if (!isRecord(file)) {
			throw new Error(`[files.${relativePath}] must be a TOML table`);
		}

		lockedFiles.push({
			relativePath: normalizeRelativePath(relativePath),
			source: readOptionalString(file.source),
			lastAction: readOptionalString(file.last_action),
			contentHash: readOptionalString(file.content_hash),
		});
	}

	return {
		schemaVersion: readOptionalString(raw.schema_version),
		templateId: readOptionalString(template.id),
		templateVersion: readOptionalString(template.version),
		templateProfile: readOptionalString(template.profile),
		templateLocale: readOptionalString(template.locale),
		files: lockedFiles.sort((left, right) => left.relativePath.localeCompare(right.relativePath)),
	};
}

function makeFinding(
	code: ManifestLockDriftFindingCode,
	severity: ScriptCheckFindingSeverity,
	pathValue: string,
	message: string,
	expectedHash: string | null,
	actualHash: string | null,
): ManifestLockDriftFinding {
	return {
		code,
		severity,
		path: pathValue,
		expected_hash: expectedHash,
		actual_hash: actualHash,
		message,
		json_pointer: null,
		metric: null,
		actual: null,
		expected: null,
	};
}

function resolveRequestedPaths(
	root: string,
	paths: readonly string[],
	findings: ManifestLockDriftFinding[],
	issues: string[],
): readonly string[] {
	const resolved: string[] = [];
	const seen = new Set<string>();

	for (const inputPath of paths) {
		const absolutePath = path.resolve(root, inputPath);
		try {
			ensureInside(root, absolutePath);
			ensureInsideWithoutSymlinks(root, existsSync(absolutePath) ? absolutePath : path.dirname(absolutePath), {
				allowMissingDescendant: true,
			});
		} catch (error) {
			const message = error instanceof Error ? error.message : String(error);
			issues.push(`${inputPath}: ${message}`);
			findings.push(makeFinding('manifest_lock_entry_path_outside_root', 'high', inputPath, message, null, null));
			continue;
		}

		const relativePath = normalizeRelativePath(path.relative(root, absolutePath));
		if (!seen.has(relativePath)) {
			seen.add(relativePath);
			resolved.push(relativePath);
		}
	}

	return resolved.sort((left, right) => left.localeCompare(right));
}

function shouldCheckEntry(entryPath: string, requestedPaths: readonly string[]): boolean {
	if (requestedPaths.length === 0) {
		return true;
	}
	return requestedPaths.some((requestedPath) => entryPath === requestedPath || entryPath.startsWith(`${requestedPath}/`));
}

function hashProjectFile(root: string, relativePath: string): string {
	return sha256(readFileInsideWithoutSymlinks(root, path.join(root, ...relativePath.split('/'))));
}

function safeEntryExists(root: string, relativePath: string): boolean {
	const absolutePath = path.join(root, ...relativePath.split('/'));
	try {
		ensureInside(root, absolutePath);
		ensureInsideWithoutSymlinks(root, existsSync(absolutePath) ? absolutePath : path.dirname(absolutePath), {
			allowMissingDescendant: true,
		});
		return existsSync(absolutePath);
	} catch {
		return false;
	}
}

function inspectEntry(root: string, lockedFile: RawLockedFile, findings: ManifestLockDriftFinding[]): ManifestLockDriftEntry {
	const relativePath = lockedFile.relativePath;
	const absolutePath = path.join(root, ...relativePath.split('/'));

	try {
		ensureInside(root, absolutePath);
		ensureInsideWithoutSymlinks(root, existsSync(absolutePath) ? absolutePath : path.dirname(absolutePath), {
			allowMissingDescendant: true,
		});
	} catch (error) {
		const message = error instanceof Error ? error.message : String(error);
		findings.push(makeFinding('manifest_lock_entry_path_outside_root', 'high', relativePath, message, lockedFile.contentHash, null));
		return {
			path: relativePath,
			source: lockedFile.source,
			last_action: lockedFile.lastAction,
			lock_hash: lockedFile.contentHash,
			actual_hash: null,
			exists: false,
			status: 'unsafe_path',
		};
	}

	if (!lockedFile.contentHash || !SHA256_PATTERN.test(lockedFile.contentHash)) {
		findings.push(
			makeFinding(
				'manifest_lock_entry_invalid_hash',
				'high',
				relativePath,
				`Manifest lock entry ${relativePath} has an invalid content_hash.`,
				lockedFile.contentHash,
				null,
			),
		);
		return {
			path: relativePath,
			source: lockedFile.source,
			last_action: lockedFile.lastAction,
			lock_hash: lockedFile.contentHash,
			actual_hash: null,
			exists: existsSync(absolutePath),
			status: 'unreadable',
		};
	}

	if (!existsSync(absolutePath)) {
		findings.push(
			makeFinding(
				'manifest_lock_entry_missing',
				'high',
				relativePath,
				`Manifest lock entry ${relativePath} points to a missing file.`,
				lockedFile.contentHash,
				null,
			),
		);
		return {
			path: relativePath,
			source: lockedFile.source,
			last_action: lockedFile.lastAction,
			lock_hash: lockedFile.contentHash,
			actual_hash: null,
			exists: false,
			status: 'missing',
		};
	}

	try {
		const actualHash = hashProjectFile(root, relativePath);
		if (actualHash !== lockedFile.contentHash) {
			findings.push(
				makeFinding(
					'manifest_lock_hash_mismatch',
					'medium',
					relativePath,
					`Manifest lock content_hash differs from the current file hash for ${relativePath}.`,
					lockedFile.contentHash,
					actualHash,
				),
			);
			return {
				path: relativePath,
				source: lockedFile.source,
				last_action: lockedFile.lastAction,
				lock_hash: lockedFile.contentHash,
				actual_hash: actualHash,
				exists: true,
				status: 'hash_mismatch',
			};
		}

		return {
			path: relativePath,
			source: lockedFile.source,
			last_action: lockedFile.lastAction,
			lock_hash: lockedFile.contentHash,
			actual_hash: actualHash,
			exists: true,
			status: 'clean',
		};
	} catch (error) {
		const message = error instanceof Error ? error.message : String(error);
		findings.push(makeFinding('manifest_lock_entry_unreadable', 'high', relativePath, message, lockedFile.contentHash, null));
		return {
			path: relativePath,
			source: lockedFile.source,
			last_action: lockedFile.lastAction,
			lock_hash: lockedFile.contentHash,
			actual_hash: null,
			exists: true,
			status: 'unreadable',
		};
	}
}

function summarize(entries: readonly ManifestLockDriftEntry[], entriesTotal: number, findings: readonly ManifestLockDriftFinding[]): ManifestLockDriftSummary {
	return {
		entries_total: entriesTotal,
		entries_checked: entries.filter((entry) => entry.status !== 'skipped').length,
		clean_entries: entries.filter((entry) => entry.status === 'clean').length,
		missing_entries: entries.filter((entry) => entry.status === 'missing').length,
		hash_mismatches: entries.filter((entry) => entry.status === 'hash_mismatch').length,
		unreadable_entries: entries.filter((entry) => entry.status === 'unreadable').length,
		unsafe_entries: entries.filter((entry) => entry.status === 'unsafe_path').length,
		skipped_entries: entries.filter((entry) => entry.status === 'skipped').length,
		findings: findings.length,
	};
}

function createInputHash(reportInput: {
	readonly inputPaths: readonly string[];
	readonly policy: ManifestLockDriftPolicy;
	readonly lock: ManifestLockDriftLockMetadata;
	readonly summary: ManifestLockDriftSummary;
	readonly entries: readonly ManifestLockDriftEntry[];
	readonly findings: readonly ManifestLockDriftFinding[];
	readonly issues: readonly string[];
}): string {
	return sha256(JSON.stringify(reportInput));
}

function createLockMetadata(lock: RawManifestLock | null, exists: boolean): ManifestLockDriftLockMetadata {
	return {
		path: REPO_MANIFEST_LOCK_DRIFT_LOCK_PATH,
		exists,
		schema_version: lock?.schemaVersion ?? null,
		template_id: lock?.templateId ?? null,
		template_version: lock?.templateVersion ?? null,
		template_profile: lock?.templateProfile ?? null,
		template_locale: lock?.templateLocale ?? null,
		entries_total: lock?.files.length ?? 0,
	};
}

export function checkRepoManifestLockDrift(projectRoot: string, options: ManifestLockDriftOptions): ManifestLockDriftReport {
	const root = path.resolve(projectRoot);
	const findings: ManifestLockDriftFinding[] = [];
	const issues: string[] = [];
	const requestedPaths = [...options.paths];
	const policy: ManifestLockDriftPolicy = {
		lock_path: REPO_MANIFEST_LOCK_DRIFT_LOCK_PATH,
		input_mode: requestedPaths.length > 0 ? 'explicit_paths' : 'all_locked_files',
		max_entries: positiveInteger(options.maxEntries, DEFAULT_MAX_ENTRIES),
		extra_manifest_file_detection: 'not_authoritative',
	};
	const lockPath = path.join(root, ...REPO_MANIFEST_LOCK_DRIFT_LOCK_PATH.split('/'));
	const normalizedRequestedPaths = resolveRequestedPaths(root, requestedPaths, findings, issues);
	let lock: RawManifestLock | null = null;

	if (!existsSync(lockPath)) {
		const message = `Manifest lock is missing: ${REPO_MANIFEST_LOCK_DRIFT_LOCK_PATH}`;
		findings.push(makeFinding('manifest_lock_missing', 'high', REPO_MANIFEST_LOCK_DRIFT_LOCK_PATH, message, null, null));
		issues.push(message);
	} else {
		try {
			ensureInside(root, lockPath);
			ensureInsideWithoutSymlinks(root, lockPath);
			lock = parseManifestLock(readUtf8FileInsideWithoutSymlinks(root, lockPath, { maxBytes: 1024 * 1024 }));
		} catch (error) {
			const message = error instanceof Error ? error.message : String(error);
			findings.push(makeFinding('manifest_lock_invalid', 'high', REPO_MANIFEST_LOCK_DRIFT_LOCK_PATH, message, null, null));
			issues.push(`Invalid manifest lock: ${message}`);
		}
	}

	const entries: ManifestLockDriftEntry[] = [];
	if (lock) {
		let maxEntriesFindingReported = false;
		for (const lockedFile of lock.files) {
			if (!shouldCheckEntry(lockedFile.relativePath, normalizedRequestedPaths)) {
				entries.push({
					path: lockedFile.relativePath,
					source: lockedFile.source,
					last_action: lockedFile.lastAction,
					lock_hash: lockedFile.contentHash,
					actual_hash: null,
					exists: safeEntryExists(root, lockedFile.relativePath),
					status: 'skipped',
				});
				continue;
			}

			if (entries.filter((entry) => entry.status !== 'skipped').length >= policy.max_entries) {
				if (!maxEntriesFindingReported) {
					const message = `Manifest lock drift check reached max_entries ${policy.max_entries}; remaining entries were skipped.`;
					findings.push(
						makeFinding('manifest_lock_max_entries_exceeded', 'high', lockedFile.relativePath, message, lockedFile.contentHash, null),
					);
					maxEntriesFindingReported = true;
				}
				entries.push({
					path: lockedFile.relativePath,
					source: lockedFile.source,
					last_action: lockedFile.lastAction,
					lock_hash: lockedFile.contentHash,
					actual_hash: null,
					exists: safeEntryExists(root, lockedFile.relativePath),
					status: 'skipped',
				});
				continue;
			}

			entries.push(inspectEntry(root, lockedFile, findings));
		}
	}

	const lockMetadata = createLockMetadata(lock, existsSync(lockPath));
	const summary = summarize(entries, lockMetadata.entries_total, findings);
	const hasHighFinding = findings.some((finding) => finding.severity === 'high' || finding.severity === 'critical');
	const status: ScriptCheckStatus = issues.length > 0 || hasHighFinding ? 'error' : findings.length > 0 ? 'failed' : 'passed';

	return {
		schema_version: '1',
		command: 'script-pack',
		pack_id: REPO_MANIFEST_LOCK_DRIFT_PACK_ID,
		script_id: REPO_MANIFEST_LOCK_DRIFT_SCRIPT_ID,
		script_ref: REPO_MANIFEST_LOCK_DRIFT_SCRIPT_REF,
		action: 'check',
		status,
		ok: status === 'passed',
		mustflow_root: root,
		input: {
			paths: requestedPaths,
		},
		policy,
		input_hash: createInputHash({ inputPaths: requestedPaths, policy, lock: lockMetadata, summary, entries, findings, issues }),
		lock: lockMetadata,
		summary,
		entries,
		findings,
		issues,
	};
}
