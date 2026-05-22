import { createHash } from 'node:crypto';
import { existsSync } from 'node:fs';
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

export function ensureManifestLockTargetSafe(projectRoot: string): boolean {
	const lockPath = path.join(projectRoot, MANIFEST_LOCK_RELATIVE_PATH);
	ensureInside(projectRoot, lockPath);
	ensureFileTargetInsideWithoutSymlinks(projectRoot, lockPath, { allowMissingLeaf: true });
	return existsSync(lockPath);
}

export function markManifestLockFileCustomized(projectRoot: string, relativePath: string): boolean {
	const lockPath = path.join(projectRoot, MANIFEST_LOCK_RELATIVE_PATH);
	const filePath = path.join(projectRoot, relativePath);
	ensureInside(projectRoot, filePath);

	if (!ensureManifestLockTargetSafe(projectRoot)) {
		return false;
	}

	ensureFileTargetInsideWithoutSymlinks(projectRoot, filePath, { allowMissingLeaf: true });
	if (!existsSync(filePath)) {
		throw new Error(`Cannot refresh manifest lock for missing file: ${relativePath}`);
	}

	const parsed = parseTomlText(readUtf8FileInsideWithoutSymlinks(projectRoot, lockPath));
	if (!isRecord(parsed)) {
		throw new Error(`Invalid manifest lock: ${MANIFEST_LOCK_RELATIVE_PATH} must contain a TOML table`);
	}

	const filesTable = isRecord(parsed.files) ? parsed.files : {};
	const existing = filesTable[relativePath];
	const existingTable = isRecord(existing) ? existing : {};

	filesTable[relativePath] = {
		source: typeof existingTable.source === 'string' ? existingTable.source : 'template_common',
		last_action: 'customized',
		content_hash: sha256ProjectFile(projectRoot, filePath),
	};
	parsed.files = filesTable;

	writeUtf8FileInsideWithoutSymlinks(projectRoot, lockPath, stringifyToml(parsed));
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

export function inspectManifestLock(projectRoot: string): ManifestLockInspection {
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
