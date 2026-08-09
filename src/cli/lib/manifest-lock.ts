import { createHash, randomUUID } from 'node:crypto';
import { closeSync, existsSync, mkdirSync, openSync, readFileSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';

import {
	ensureFileTargetInsideWithoutSymlinks,
	ensureInside,
	readFileInsideWithoutSymlinks,
	readUtf8FileInsideWithoutSymlinks,
	writeUtf8FileInsideWithoutSymlinks,
} from './filesystem.js';
import { isRecord, type TomlTable } from './command-contract.js';
import { parseTomlText, stringifyToml } from './toml.js';
import { processStartTokensProveMismatch, readCurrentProcessStartToken, readProcessStartToken } from '../../core/process-identity.js';

export const MANIFEST_LOCK_RELATIVE_PATH = '.mustflow/config/manifest.lock.toml';

export interface LockedFile {
	readonly relativePath: string;
	readonly source: string;
	readonly lastAction: string;
	readonly contentHash: string;
}

export interface ManifestLock {
	readonly schemaVersion: string;
	readonly templateId: string;
	readonly templateVersion: string;
	readonly templateProfile?: string;
	readonly templateLocale?: string;
	readonly files: readonly LockedFile[];
}

export type ManifestLockReadResult =
	| { readonly kind: 'missing'; readonly lockPath: string }
	| { readonly kind: 'invalid'; readonly lockPath: string; readonly message: string }
	| { readonly kind: 'present'; readonly lockPath: string; readonly lock: ManifestLock };

export interface ManifestLockInspection {
	readonly readResult: ManifestLockReadResult;
	readonly changedFiles: readonly string[];
	readonly missingFiles: readonly string[];
	readonly issues: readonly string[];
}

export interface ManifestLockCustomizationPlanFile {
	readonly relative_path: string;
	readonly content_hash: string;
}

export interface ManifestLockCustomizationPlan {
	readonly schema_version: '1';
	readonly manifest_lock_hash: string;
	readonly files: readonly ManifestLockCustomizationPlanFile[];
}

interface ManifestLockCasOwner {
	readonly schema_version: '1';
	readonly pid: number;
	readonly process_start_token: string;
	readonly owner_token: string;
}

function readString(table: TomlTable, key: string, label: string): string {
	const value = table[key];

	if (typeof value !== 'string' || value.trim().length === 0) {
		throw new Error(`${label} must be a non-empty string`);
	}

	return value;
}

function parseManifestLock(raw: unknown): ManifestLock {
	if (!isRecord(raw)) {
		throw new Error('manifest lock must contain a TOML table');
	}

	const template = raw.template;
	const files = raw.files;

	if (!isRecord(template)) {
		throw new Error('[template] must be a TOML table');
	}

	if (!isRecord(files)) {
		throw new Error('[files] must be a TOML table');
	}

	const lockedFiles: LockedFile[] = [];

	for (const [relativePath, file] of Object.entries(files)) {
		if (!isRecord(file)) {
			throw new Error(`[files.${relativePath}] must be a TOML table`);
		}

		lockedFiles.push({
			relativePath,
			source: readString(file, 'source', `[files.${relativePath}].source`),
			lastAction: readString(file, 'last_action', `[files.${relativePath}].last_action`),
			contentHash: readString(file, 'content_hash', `[files.${relativePath}].content_hash`),
		});
	}

	return {
		schemaVersion: readString(raw, 'schema_version', 'schema_version'),
		templateId: readString(template, 'id', '[template].id'),
		templateVersion: readString(template, 'version', '[template].version'),
		templateProfile: typeof template.profile === 'string' ? template.profile : undefined,
		templateLocale: typeof template.locale === 'string' ? template.locale : undefined,
		files: lockedFiles,
	};
}

export function sha256File(filePath: string): string {
	return `sha256:${createHash('sha256')
		.update(readFileInsideWithoutSymlinks(path.dirname(filePath), filePath))
		.digest('hex')}`;
}

function sha256ProjectFile(projectRoot: string, filePath: string): string {
	return `sha256:${createHash('sha256').update(readFileInsideWithoutSymlinks(projectRoot, filePath)).digest('hex')}`;
}

function sha256Content(content: string | Buffer): string {
	return `sha256:${createHash('sha256').update(content).digest('hex')}`;
}

function normalizeManifestPlanPath(relativePath: string): string {
	const normalized = relativePath.replace(/\\/gu, '/').replace(/^\.\//u, '');
	const segments = normalized.split('/');
	if (
		normalized.length === 0 ||
		path.posix.isAbsolute(normalized) ||
		path.win32.isAbsolute(relativePath) ||
		segments.some((segment) => segment.length === 0 || segment === '.' || segment === '..')
	) {
		throw new Error(`Manifest lock plan path must be a normalized repository-relative path: ${relativePath}`);
	}
	return normalized;
}

function isProcessLive(pid: number): boolean {
	try {
		process.kill(pid, 0);
		return true;
	} catch (error) {
		return typeof error === 'object' && error !== null && 'code' in error && error.code === 'EPERM';
	}
}

function parseCasOwner(value: unknown): ManifestLockCasOwner | null {
	if (!isRecord(value)) {
		return null;
	}
	return value.schema_version === '1' &&
		Number.isInteger(value.pid) && Number(value.pid) > 0 &&
		typeof value.process_start_token === 'string' && value.process_start_token.length > 0 &&
		typeof value.owner_token === 'string' && value.owner_token.length > 0
		? {
			schema_version: '1',
			pid: Number(value.pid),
			process_start_token: value.process_start_token,
			owner_token: value.owner_token,
		}
		: null;
}

function acquireManifestLockCas(projectRoot: string): () => void {
	const cacheDirectory = path.join(projectRoot, '.mustflow', 'cache');
	ensureInside(projectRoot, cacheDirectory);
	mkdirSync(cacheDirectory, { recursive: true });
	const ownerPath = path.join(cacheDirectory, 'manifest-lock-accept.owner.json');
	ensureFileTargetInsideWithoutSymlinks(projectRoot, ownerPath, { allowMissingLeaf: true });
	const owner: ManifestLockCasOwner = {
		schema_version: '1',
		pid: process.pid,
		process_start_token: readCurrentProcessStartToken(),
		owner_token: randomUUID(),
	};

	for (let attempt = 0; attempt < 2; attempt += 1) {
		try {
			const descriptor = openSync(ownerPath, 'wx');
			try {
				writeFileSync(descriptor, `${JSON.stringify(owner)}\n`, 'utf8');
			} finally {
				closeSync(descriptor);
			}
			return () => {
				try {
					const current = parseCasOwner(JSON.parse(readFileSync(ownerPath, 'utf8')));
					if (current?.owner_token === owner.owner_token) {
						rmSync(ownerPath, { force: true });
					}
				} catch {
					// Preserve an owner record that can no longer be proven to belong to this process.
				}
			};
		} catch (error) {
			if (!(typeof error === 'object' && error !== null && 'code' in error && error.code === 'EEXIST')) {
				throw error;
			}
			let existing: ManifestLockCasOwner | null = null;
			try {
				existing = parseCasOwner(JSON.parse(readFileSync(ownerPath, 'utf8')));
			} catch {
				throw new Error('Manifest lock CAS owner record is unreadable; refusing concurrent baseline acceptance');
			}
			if (!existing) {
				throw new Error('Manifest lock CAS owner record is invalid; refusing concurrent baseline acceptance');
			}
			const currentToken = isProcessLive(existing.pid) ? readProcessStartToken(existing.pid) : null;
			if (isProcessLive(existing.pid) && !processStartTokensProveMismatch(existing.process_start_token, currentToken)) {
				throw new Error(`Manifest lock baseline update already owned by live process ${existing.pid}`);
			}
			rmSync(ownerPath, { force: true });
		}
	}

	throw new Error('Cannot acquire manifest lock CAS ownership');
}

function writeManifestLockAtomically(projectRoot: string, content: string): void {
	const lockPath = path.join(projectRoot, MANIFEST_LOCK_RELATIVE_PATH);
	const tempRelativePath = `.mustflow/config/.manifest.lock.${process.pid}.${randomUUID()}.tmp`;
	const tempPath = path.join(projectRoot, tempRelativePath);
	ensureFileTargetInsideWithoutSymlinks(projectRoot, tempPath, { allowMissingLeaf: true });
	try {
		writeUtf8FileInsideWithoutSymlinks(projectRoot, tempPath, content);
		renameSync(tempPath, lockPath);
	} finally {
		rmSync(tempPath, { force: true });
	}
}

export function parseManifestLockCustomizationPlan(value: unknown): ManifestLockCustomizationPlan {
	if (!isRecord(value) || value.schema_version !== '1' || typeof value.manifest_lock_hash !== 'string' || !Array.isArray(value.files)) {
		throw new Error('Invalid manifest lock customization plan');
	}
	const files = value.files.map((entry) => {
		if (!isRecord(entry) || typeof entry.relative_path !== 'string' || typeof entry.content_hash !== 'string') {
			throw new Error('Invalid manifest lock customization plan file entry');
		}
		return {
			relative_path: normalizeManifestPlanPath(entry.relative_path),
			content_hash: entry.content_hash,
		};
	});
	if (files.length === 0 || new Set(files.map((entry) => entry.relative_path)).size !== files.length) {
		throw new Error('Manifest lock customization plan must contain unique files');
	}
	return {
		schema_version: '1',
		manifest_lock_hash: value.manifest_lock_hash,
		files,
	};
}

export function createManifestLockCustomizationPlan(
	projectRoot: string,
	relativePaths: readonly string[],
): ManifestLockCustomizationPlan {
	if (!ensureManifestLockTargetSafe(projectRoot)) {
		throw new Error(`Cannot plan customization without ${MANIFEST_LOCK_RELATIVE_PATH}`);
	}
	const lockPath = path.join(projectRoot, MANIFEST_LOCK_RELATIVE_PATH);
	const files = [...new Set(relativePaths.map(normalizeManifestPlanPath))].map((relativePath) => {
		const filePath = path.join(projectRoot, relativePath);
		ensureInside(projectRoot, filePath);
		ensureFileTargetInsideWithoutSymlinks(projectRoot, filePath, { allowMissingLeaf: true });
		if (!existsSync(filePath)) {
			throw new Error(`Cannot plan manifest lock customization for missing file: ${relativePath}`);
		}
		return { relative_path: relativePath, content_hash: sha256ProjectFile(projectRoot, filePath) };
	});
	if (files.length === 0) {
		throw new Error('Manifest lock customization plan requires at least one file');
	}
	return {
		schema_version: '1',
		manifest_lock_hash: sha256Content(readUtf8FileInsideWithoutSymlinks(projectRoot, lockPath)),
		files,
	};
}

export function applyManifestLockCustomizationPlan(
	projectRoot: string,
	rawPlan: unknown,
): readonly string[] {
	const plan = parseManifestLockCustomizationPlan(rawPlan);
	const release = acquireManifestLockCas(projectRoot);
	try {
		const lockPath = path.join(projectRoot, MANIFEST_LOCK_RELATIVE_PATH);
		const lockContent = readUtf8FileInsideWithoutSymlinks(projectRoot, lockPath);
		if (sha256Content(lockContent) !== plan.manifest_lock_hash) {
			throw new Error('Manifest lock CAS conflict: manifest.lock.toml changed after the plan was created');
		}
		for (const file of plan.files) {
			const filePath = path.join(projectRoot, file.relative_path);
			if (!existsSync(filePath) || sha256ProjectFile(projectRoot, filePath) !== file.content_hash) {
				throw new Error(`Manifest lock CAS conflict: ${file.relative_path} changed after the plan was created`);
			}
		}

		const parsed = parseTomlText(lockContent);
		if (!isRecord(parsed)) {
			throw new Error(`Invalid manifest lock: ${MANIFEST_LOCK_RELATIVE_PATH} must contain a TOML table`);
		}
		const filesTable = isRecord(parsed.files) ? parsed.files : {};
		for (const file of plan.files) {
			const existing = filesTable[file.relative_path];
			const existingTable = isRecord(existing) ? existing : {};
			filesTable[file.relative_path] = {
				source: typeof existingTable.source === 'string' ? existingTable.source : 'template_common',
				last_action: 'customized',
				content_hash: file.content_hash,
			};
		}
		parsed.files = filesTable;

		if (sha256Content(readUtf8FileInsideWithoutSymlinks(projectRoot, lockPath)) !== plan.manifest_lock_hash) {
			throw new Error('Manifest lock CAS conflict: manifest.lock.toml changed during baseline acceptance');
		}
		for (const file of plan.files) {
			if (sha256ProjectFile(projectRoot, path.join(projectRoot, file.relative_path)) !== file.content_hash) {
				throw new Error(`Manifest lock CAS conflict: ${file.relative_path} changed during baseline acceptance`);
			}
		}

		writeManifestLockAtomically(projectRoot, stringifyToml(parsed));
		return plan.files.map((file) => file.relative_path);
	} finally {
		release();
	}
}

export function ensureManifestLockTargetSafe(projectRoot: string): boolean {
	const lockPath = path.join(projectRoot, MANIFEST_LOCK_RELATIVE_PATH);
	ensureInside(projectRoot, lockPath);
	ensureFileTargetInsideWithoutSymlinks(projectRoot, lockPath, { allowMissingLeaf: true });
	return existsSync(lockPath);
}

export function markManifestLockFileCustomized(projectRoot: string, relativePath: string): boolean {
	if (!ensureManifestLockTargetSafe(projectRoot)) {
		return false;
	}
	applyManifestLockCustomizationPlan(projectRoot, createManifestLockCustomizationPlan(projectRoot, [relativePath]));
	return true;
}

export function readManifestLock(projectRoot: string): ManifestLockReadResult {
	const lockPath = path.join(projectRoot, MANIFEST_LOCK_RELATIVE_PATH);
	try {
		ensureInside(projectRoot, lockPath);
		ensureFileTargetInsideWithoutSymlinks(projectRoot, lockPath, { allowMissingLeaf: true });
	} catch (error) {
		const message = error instanceof Error ? error.message : String(error);
		return { kind: 'invalid', lockPath, message };
	}

	if (!existsSync(lockPath)) {
		return { kind: 'missing', lockPath };
	}

	try {
		return { kind: 'present', lockPath, lock: parseManifestLock(parseTomlText(readUtf8FileInsideWithoutSymlinks(projectRoot, lockPath))) };
	} catch (error) {
		const message = error instanceof Error ? error.message : String(error);
		return { kind: 'invalid', lockPath, message };
	}
}

function inspectManifestLockEntries(
	projectRoot: string,
	requiredPaths?: ReadonlySet<string>,
): ManifestLockInspection {
	const readResult = readManifestLock(projectRoot);
	const changedFiles: string[] = [];
	const missingFiles: string[] = [];
	const issues: string[] = [];

	if (readResult.kind === 'missing') {
		return { readResult, changedFiles, missingFiles, issues };
	}

	if (readResult.kind === 'invalid') {
		return {
			readResult,
			changedFiles,
			missingFiles,
			issues: [`Invalid manifest lock: ${readResult.message}`],
		};
	}

	for (const lockedFile of readResult.lock.files) {
		if (requiredPaths && !requiredPaths.has(lockedFile.relativePath)) {
			continue;
		}
		const filePath = path.join(projectRoot, lockedFile.relativePath);

		try {
			ensureInside(projectRoot, filePath);
		} catch {
			issues.push(`Locked file path escapes project root: ${lockedFile.relativePath}`);
			continue;
		}

		if (!existsSync(filePath)) {
			missingFiles.push(lockedFile.relativePath);
			issues.push(`Locked file missing: ${lockedFile.relativePath}`);
			continue;
		}

		let actualHash: string;
		try {
			actualHash = sha256ProjectFile(projectRoot, filePath);
		} catch (error) {
			const message = error instanceof Error ? error.message : String(error);
			issues.push(`Locked file cannot be read safely: ${lockedFile.relativePath}: ${message}`);
			continue;
		}

		if (actualHash !== lockedFile.contentHash) {
			changedFiles.push(lockedFile.relativePath);
			issues.push(`Lock hash mismatch: ${lockedFile.relativePath}`);
		}
	}

	return { readResult, changedFiles, missingFiles, issues };
}

export function inspectManifestLock(projectRoot: string): ManifestLockInspection {
	return inspectManifestLockEntries(projectRoot);
}

export function inspectManifestLockPaths(
	projectRoot: string,
	requiredPaths: readonly string[],
): ManifestLockInspection {
	return inspectManifestLockEntries(projectRoot, new Set(requiredPaths));
}
