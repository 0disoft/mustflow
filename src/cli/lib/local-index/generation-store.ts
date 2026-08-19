import { createHash, randomUUID } from 'node:crypto';
import {
	constants as fsConstants,
	copyFileSync,
	existsSync,
	lstatSync,
	mkdirSync,
	rmSync,
} from 'node:fs';
import path from 'node:path';

import {
	ensureInsideWithoutSymlinks,
	readFileInsideWithoutSymlinks,
	writeFileInsideWithoutSymlinks,
	writeJsonFileInsideWithoutSymlinks,
} from '../../../core/safe-filesystem.js';
import { acquireLocalIndexBuildLease } from './builder-lease.js';
import { DEFAULT_DATABASE_RELATIVE_PATH } from './constants.js';
import {
	getLocalIndexCompatibilityDatabasePath,
	getLocalIndexDatabasePath,
	getLocalIndexGenerationDatabasePath,
	getLocalIndexPointerPath,
	getLocalIndexStagingDirectoryPath,
	localIndexCompatibilitySnapshotMatches,
	LOCAL_INDEX_POINTER_SCHEMA_VERSION,
	LOCAL_INDEX_GENERATIONS_RELATIVE_PATH,
	readLocalIndexGenerationPointer,
	resolveLocalIndexGenerationDatabasePath,
	withLocalIndexDatabasePath,
	type LocalIndexGenerationPointer,
} from './database-path.js';
import { createLocalIndex as createMutableLocalIndex } from './index.js';
import type { LocalIndexOptions, LocalIndexResult } from './types.js';

const SQLITE_GENERATION_FILE_PATTERN = /^sha256-[a-f0-9]{64}\.sqlite$/u;

function createRequestKey(options: LocalIndexOptions): string {
	return createHash('sha256')
		.update(JSON.stringify({
			include_source: options.includeSource === true,
			incremental: options.incremental === true,
		}))
		.digest('hex');
}

function createStagingDatabasePath(projectRoot: string): string {
	const stagingDirectory = getLocalIndexStagingDirectoryPath(projectRoot);
	mkdirSync(stagingDirectory, { recursive: true });
	ensureInsideWithoutSymlinks(projectRoot, stagingDirectory);

	return path.join(stagingDirectory, `${process.pid}-${randomUUID()}.sqlite`);
}

function seedStagingDatabase(projectRoot: string, stagingPath: string): void {
	const currentPath = getLocalIndexDatabasePath(projectRoot);
	if (!existsSync(currentPath)) {
		return;
	}

	ensureInsideWithoutSymlinks(projectRoot, currentPath);
	try {
		copyFileSync(currentPath, stagingPath, fsConstants.COPYFILE_FICLONE);
	} catch {
		writeFileInsideWithoutSymlinks(
			projectRoot,
			stagingPath,
			readFileInsideWithoutSymlinks(projectRoot, currentPath),
		);
	}
}

function hashDatabase(databaseBytes: Buffer): string {
	return createHash('sha256').update(databaseBytes).digest('hex');
}

function verifyExistingGeneration(
	projectRoot: string,
	generationPath: string,
	expectedHash: string,
): void {
	const existingBytes = readFileInsideWithoutSymlinks(projectRoot, generationPath);
	if (hashDatabase(existingBytes) !== expectedHash) {
		throw new Error(`local_index_generation_hash_mismatch:${path.basename(generationPath)}`);
	}
}

function generationRelativePath(sha256: string): string {
	const fileName = `sha256-${sha256}.sqlite`;
	if (!SQLITE_GENERATION_FILE_PATTERN.test(fileName)) {
		throw new Error('local_index_generation_name_invalid');
	}
	return `${LOCAL_INDEX_GENERATIONS_RELATIVE_PATH}/${fileName}`;
}

function publishLocalIndexGeneration(
	projectRoot: string,
	stagingPath: string,
): LocalIndexGenerationPointer {
	const databaseBytes = readFileInsideWithoutSymlinks(projectRoot, stagingPath);
	const sha256 = hashDatabase(databaseBytes);
	const generationPath = getLocalIndexGenerationDatabasePath(projectRoot, sha256);

	if (existsSync(generationPath)) {
		verifyExistingGeneration(projectRoot, generationPath, sha256);
	} else {
		writeFileInsideWithoutSymlinks(projectRoot, generationPath, databaseBytes);
	}

	const compatibilityPath = getLocalIndexCompatibilityDatabasePath(projectRoot);
	writeFileInsideWithoutSymlinks(projectRoot, compatibilityPath, databaseBytes);
	const compatibilityStats = lstatSync(compatibilityPath);
	const pointer: LocalIndexGenerationPointer = {
		schema_version: LOCAL_INDEX_POINTER_SCHEMA_VERSION,
		kind: 'local_index_generation',
		generation: `sha256:${sha256}`,
		sha256,
		database_path: generationRelativePath(sha256),
		published_at: new Date().toISOString(),
		compatibility_path: DEFAULT_DATABASE_RELATIVE_PATH,
		compatibility_size_bytes: compatibilityStats.size,
		compatibility_mtime_ms: compatibilityStats.mtimeMs,
	};

	writeJsonFileInsideWithoutSymlinks(projectRoot, getLocalIndexPointerPath(projectRoot), pointer);
	return pointer;
}

function currentGenerationIsHealthy(projectRoot: string): boolean {
	const pointer = readLocalIndexGenerationPointer(projectRoot);
	return (
		pointer !== null &&
		resolveLocalIndexGenerationDatabasePath(projectRoot, pointer) !== null &&
		localIndexCompatibilitySnapshotMatches(projectRoot, pointer)
	);
}

function normalizeResult(
	projectRoot: string,
	options: LocalIndexOptions,
	result: LocalIndexResult,
	published: boolean,
): LocalIndexResult {
	return {
		...result,
		database_path: getLocalIndexCompatibilityDatabasePath(projectRoot),
		dry_run: options.dryRun === true,
		wrote_files: published || result.wrote_files,
		index_mode: options.incremental === true ? 'incremental' : 'full',
	};
}

/**
 * mf:anchor cli.index.generation-store
 * purpose: Publish immutable content-addressed SQLite generations behind an atomic current pointer.
 * search: local index generations, current pointer, immutable sqlite, compatibility snapshot
 * invariant: A generation is complete before the compatibility snapshot and current pointer can reference it.
 * risk: cache, concurrency, filesystem
 */
export async function createLocalIndex(
	projectRoot: string,
	options: LocalIndexOptions = {},
): Promise<LocalIndexResult> {
	if (options.dryRun === true) {
		const result = await createMutableLocalIndex(projectRoot, options);
		return normalizeResult(projectRoot, options, result, false);
	}

	const requestKey = createRequestKey(options);
	const lease = await acquireLocalIndexBuildLease(projectRoot, requestKey);
	const stagingPath = createStagingDatabasePath(projectRoot);

	try {
		seedStagingDatabase(projectRoot, stagingPath);
		const effectiveOptions = lease.waitedForEquivalentBuild
			? { ...options, incremental: true }
			: options;
		const result = await withLocalIndexDatabasePath(stagingPath, () =>
			createMutableLocalIndex(projectRoot, effectiveOptions),
		);
		const shouldPublish = result.wrote_files || !currentGenerationIsHealthy(projectRoot);

		if (shouldPublish) {
			publishLocalIndexGeneration(projectRoot, stagingPath);
		}

		return normalizeResult(projectRoot, options, result, shouldPublish);
	} finally {
		rmSync(stagingPath, { force: true });
		lease.release();
	}
}
