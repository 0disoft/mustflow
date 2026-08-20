import { AsyncLocalStorage } from 'node:async_hooks';
import { existsSync, lstatSync } from 'node:fs';
import path from 'node:path';

import { readUtf8FileInsideWithoutSymlinks } from '../../../core/safe-filesystem.js';
import { DEFAULT_DATABASE_RELATIVE_PATH } from './constants.js';

export const LOCAL_INDEX_STORE_RELATIVE_PATH = '.mustflow/cache/local-index';
export const LOCAL_INDEX_GENERATIONS_RELATIVE_PATH = `${LOCAL_INDEX_STORE_RELATIVE_PATH}/generations`;
export const LOCAL_INDEX_STAGING_RELATIVE_PATH = `${LOCAL_INDEX_STORE_RELATIVE_PATH}/staging`;
export const LOCAL_INDEX_POINTER_RELATIVE_PATH = `${LOCAL_INDEX_STORE_RELATIVE_PATH}/current.json`;
export const LOCAL_INDEX_BUILD_LEASE_RELATIVE_PATH = `${LOCAL_INDEX_STORE_RELATIVE_PATH}/builder.lease`;
export const LOCAL_INDEX_POINTER_SCHEMA_VERSION = '1';

const LOCAL_INDEX_POINTER_MAX_BYTES = 16 * 1024;
const LOCAL_INDEX_GENERATION_FILE_PATTERN = /^sha256-([a-f0-9]{64})\.sqlite$/u;
const LOCAL_INDEX_COMPATIBILITY_MTIME_TOLERANCE_MS = 1;
const databasePathOverride = new AsyncLocalStorage<string>();

export interface LocalIndexGenerationPointer {
	readonly schema_version: typeof LOCAL_INDEX_POINTER_SCHEMA_VERSION;
	readonly kind: 'local_index_generation';
	readonly generation: string;
	readonly sha256: string;
	readonly database_path: string;
	readonly published_at: string;
	readonly compatibility_path: typeof DEFAULT_DATABASE_RELATIVE_PATH;
	readonly compatibility_size_bytes: number;
	readonly compatibility_mtime_ms: number;
	readonly compatibility_ctime_ns: string;
}

function toPosixPath(value: string): string {
	return value.split(path.sep).join('/');
}

function isNonNegativeFiniteNumber(value: unknown): value is number {
	return typeof value === 'number' && Number.isFinite(value) && value >= 0;
}

function isNonNegativeIntegerString(value: unknown): value is string {
	return typeof value === 'string' && /^(?:0|[1-9]\d*)$/u.test(value);
}

function parseGenerationFileName(value: string): string | null {
	return LOCAL_INDEX_GENERATION_FILE_PATTERN.exec(value)?.[1] ?? null;
}

function parseLocalIndexGenerationPointer(value: unknown): LocalIndexGenerationPointer | null {
	if (!value || typeof value !== 'object' || Array.isArray(value)) {
		return null;
	}

	const pointer = value as Record<string, unknown>;
	if (
		pointer.schema_version !== LOCAL_INDEX_POINTER_SCHEMA_VERSION ||
		pointer.kind !== 'local_index_generation' ||
		typeof pointer.generation !== 'string' ||
		typeof pointer.sha256 !== 'string' ||
		typeof pointer.database_path !== 'string' ||
		typeof pointer.published_at !== 'string' ||
		pointer.compatibility_path !== DEFAULT_DATABASE_RELATIVE_PATH ||
		!isNonNegativeFiniteNumber(pointer.compatibility_size_bytes) ||
		!isNonNegativeFiniteNumber(pointer.compatibility_mtime_ms) ||
		!isNonNegativeIntegerString(pointer.compatibility_ctime_ns)
	) {
		return null;
	}

	const fileName = path.posix.basename(pointer.database_path);
	const fileHash = parseGenerationFileName(fileName);
	const expectedPath = `${LOCAL_INDEX_GENERATIONS_RELATIVE_PATH}/${fileName}`;
	if (
		fileHash === null ||
		pointer.sha256 !== fileHash ||
		pointer.generation !== `sha256:${fileHash}` ||
		pointer.database_path !== expectedPath
	) {
		return null;
	}

	return {
		schema_version: LOCAL_INDEX_POINTER_SCHEMA_VERSION,
		kind: 'local_index_generation',
		generation: pointer.generation,
		sha256: pointer.sha256,
		database_path: pointer.database_path,
		published_at: pointer.published_at,
		compatibility_path: DEFAULT_DATABASE_RELATIVE_PATH,
		compatibility_size_bytes: pointer.compatibility_size_bytes,
		compatibility_mtime_ms: pointer.compatibility_mtime_ms,
		compatibility_ctime_ns: pointer.compatibility_ctime_ns,
	};
}

function isRegularFileWithoutSymlink(filePath: string): boolean {
	try {
		const stats = lstatSync(filePath);
		return stats.isFile() && !stats.isSymbolicLink();
	} catch {
		return false;
	}
}

export function getLocalIndexCompatibilityDatabasePath(projectRoot: string): string {
	return path.join(projectRoot, ...DEFAULT_DATABASE_RELATIVE_PATH.split('/'));
}

export function getLocalIndexStorePath(projectRoot: string): string {
	return path.join(projectRoot, ...LOCAL_INDEX_STORE_RELATIVE_PATH.split('/'));
}

export function getLocalIndexGenerationDirectoryPath(projectRoot: string): string {
	return path.join(projectRoot, ...LOCAL_INDEX_GENERATIONS_RELATIVE_PATH.split('/'));
}

export function getLocalIndexGenerationDatabasePath(projectRoot: string, sha256: string): string {
	if (!/^[a-f0-9]{64}$/u.test(sha256)) {
		throw new Error('Local index generation hash must be a lowercase SHA-256 digest');
	}

	return path.join(getLocalIndexGenerationDirectoryPath(projectRoot), `sha256-${sha256}.sqlite`);
}

export function getLocalIndexStagingDirectoryPath(projectRoot: string): string {
	return path.join(projectRoot, ...LOCAL_INDEX_STAGING_RELATIVE_PATH.split('/'));
}

export function getLocalIndexPointerPath(projectRoot: string): string {
	return path.join(projectRoot, ...LOCAL_INDEX_POINTER_RELATIVE_PATH.split('/'));
}

export function getLocalIndexBuildLeasePath(projectRoot: string): string {
	return path.join(projectRoot, ...LOCAL_INDEX_BUILD_LEASE_RELATIVE_PATH.split('/'));
}

export function readLocalIndexGenerationPointer(projectRoot: string): LocalIndexGenerationPointer | null {
	const pointerPath = getLocalIndexPointerPath(projectRoot);
	if (!existsSync(pointerPath)) {
		return null;
	}

	try {
		return parseLocalIndexGenerationPointer(
			JSON.parse(
				readUtf8FileInsideWithoutSymlinks(projectRoot, pointerPath, {
					maxBytes: LOCAL_INDEX_POINTER_MAX_BYTES,
				}),
			),
		);
	} catch {
		return null;
	}
}

export function resolveLocalIndexGenerationDatabasePath(
	projectRoot: string,
	pointer: LocalIndexGenerationPointer,
): string | null {
	const generationPath = path.join(projectRoot, ...pointer.database_path.split('/'));
	const relativeGenerationPath = toPosixPath(path.relative(projectRoot, generationPath));

	return relativeGenerationPath === pointer.database_path && isRegularFileWithoutSymlink(generationPath)
		? generationPath
		: null;
}

export function localIndexCompatibilitySnapshotMatches(
	projectRoot: string,
	pointer: LocalIndexGenerationPointer,
): boolean {
	const compatibilityPath = getLocalIndexCompatibilityDatabasePath(projectRoot);

	try {
		const stats = lstatSync(compatibilityPath, { bigint: true });
		return (
			stats.isFile() &&
			!stats.isSymbolicLink() &&
			Number(stats.size) === pointer.compatibility_size_bytes &&
			Math.abs(Number(stats.mtimeNs) / 1_000_000 - pointer.compatibility_mtime_ms) <=
				LOCAL_INDEX_COMPATIBILITY_MTIME_TOLERANCE_MS &&
			stats.ctimeNs.toString() === pointer.compatibility_ctime_ns
		);
	} catch {
		return false;
	}
}

export function withLocalIndexDatabasePath<T>(databasePath: string, callback: () => T): T {
	return databasePathOverride.run(path.resolve(databasePath), callback);
}

export function getLocalIndexDatabasePath(projectRoot: string): string {
	const overridePath = databasePathOverride.getStore();
	if (overridePath) {
		return overridePath;
	}

	const compatibilityPath = getLocalIndexCompatibilityDatabasePath(projectRoot);
	const pointer = readLocalIndexGenerationPointer(projectRoot);
	if (!pointer) {
		return compatibilityPath;
	}

	const generationPath = resolveLocalIndexGenerationDatabasePath(projectRoot, pointer);
	if (!generationPath) {
		return compatibilityPath;
	}

	if (!existsSync(compatibilityPath)) {
		return generationPath;
	}

	return localIndexCompatibilitySnapshotMatches(projectRoot, pointer)
		? generationPath
		: compatibilityPath;
}
