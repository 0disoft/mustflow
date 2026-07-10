import { existsSync, statSync } from 'node:fs';
import path from 'node:path';

import { isRecord, readStringArray, type TomlTable } from '../command-contract.js';
import { MUSTFLOW_TEXT_MAX_BYTES, mustflowProjectPath } from '../mustflow-read.js';
import { readMustflowTomlFile } from '../toml.js';
import { ensureInsideWithoutSymlinks, readFileInsideWithoutSymlinks } from '../../../core/safe-filesystem.js';
import { listSourceAnchorFiles } from '../../../core/source-anchors.js';
import {
	INDEX_CONFIG_RELATIVE_PATH,
	LATEST_RUN_STATE_RELATIVE_PATH,
	MUSTFLOW_RELATIVE_PATH,
	SOURCE_INDEX_MAX_FILE_BYTES,
} from './constants.js';
import { sha256Bytes, sha256Text } from './hashing.js';
import type { SourceAnchorIndexRecord } from '../../../core/source-anchor-status.js';
import type { IndexedFileRecord, IndexDocument, LocalIndexSourceConfig } from './types.js';
import { getExistingIndexablePaths } from './workflow-documents.js';

export type IndexedFileMetadataRecord = Omit<IndexedFileRecord, 'contentHash'>;

export interface FastPreflightIndexedFiles {
	readonly records: readonly IndexedFileMetadataRecord[];
	readonly sourceCandidatePaths: readonly string[];
}

function indexedProjectPath(projectRoot: string, relativePath: string): string {
	if (
		relativePath.length === 0 ||
		relativePath.includes('\0') ||
		relativePath.includes('\\') ||
		path.posix.isAbsolute(relativePath) ||
		path.win32.isAbsolute(relativePath)
	) {
		throw new Error(`Indexed file path must be a canonical project-relative path: ${relativePath}`);
	}

	const segments = relativePath.split('/');
	if (segments.some((segment) => segment.length === 0 || segment === '.' || segment === '..')) {
		throw new Error(`Indexed file path must be a canonical project-relative path: ${relativePath}`);
	}

	const fullPath = mustflowProjectPath(projectRoot, relativePath);
	ensureInsideWithoutSymlinks(projectRoot, fullPath);
	return fullPath;
}

function readIndexedFileBytes(projectRoot: string, relativePath: string): Buffer {
	return readFileInsideWithoutSymlinks(projectRoot, indexedProjectPath(projectRoot, relativePath), {
		maxBytes: MUSTFLOW_TEXT_MAX_BYTES,
	});
}

function readIndexToml(projectRoot: string): TomlTable | undefined {
	const indexConfigPath = path.join(projectRoot, ...INDEX_CONFIG_RELATIVE_PATH.split('/'));

	if (!existsSync(indexConfigPath)) {
		return undefined;
	}

	const parsed = readMustflowTomlFile(projectRoot, INDEX_CONFIG_RELATIVE_PATH);
	return isRecord(parsed) ? parsed : undefined;
}

function readNestedTable(table: TomlTable | undefined, key: string): TomlTable | undefined {
	if (!table || !isRecord(table[key])) {
		return undefined;
	}

	return table[key];
}

function readOptionalStringArray(table: TomlTable | undefined, key: string): readonly string[] | null {
	return table ? readStringArray(table, key) ?? null : null;
}

function readBoolean(table: TomlTable | undefined, key: string): boolean | undefined {
	const value = table?.[key];
	return typeof value === 'boolean' ? value : undefined;
}

function readPositiveInteger(table: TomlTable | undefined, key: string): number | null {
	const value = table?.[key];

	if (typeof value !== 'number' || !Number.isInteger(value) || value <= 0) {
		return null;
	}

	return value;
}

export function readMustflowToml(projectRoot: string): TomlTable | undefined {
	const mustflowPath = path.join(projectRoot, ...MUSTFLOW_RELATIVE_PATH.split('/'));

	if (!existsSync(mustflowPath)) {
		return undefined;
	}

	const parsed = readMustflowTomlFile(projectRoot, MUSTFLOW_RELATIVE_PATH);
	return isRecord(parsed) ? parsed : undefined;
}

export function readLocalIndexSourceConfig(projectRoot: string): LocalIndexSourceConfig {
	const sourceIndexTable = readNestedTable(readIndexToml(projectRoot), 'source_index');
	const configuredMaxFileBytes = readPositiveInteger(sourceIndexTable, 'max_file_bytes');

	return {
		enabledByDefault: readBoolean(sourceIndexTable, 'enabled_by_default') === true,
		include: readOptionalStringArray(sourceIndexTable, 'include') ?? [],
		exclude: readOptionalStringArray(sourceIndexTable, 'exclude') ?? [],
		maxFileBytes: Math.min(configuredMaxFileBytes ?? SOURCE_INDEX_MAX_FILE_BYTES, SOURCE_INDEX_MAX_FILE_BYTES),
		allowedExtensions: readOptionalStringArray(sourceIndexTable, 'allowed_extensions') ?? [],
	};
}

export function getSourceScopeHash(includeSource: boolean, sourceConfig: LocalIndexSourceConfig): string {
	return sha256Text(
		JSON.stringify({
			includeSource,
			sourceConfig,
		}),
	);
}

export function normalizeIndexedFileSourceScope(value: string): IndexedFileRecord['sourceScope'] {
	if (value === 'source_anchor' || value === 'state') {
		return value;
	}

	return 'workflow';
}

export function readIndexedFileRecord(
	projectRoot: string,
	relativePath: string,
	sourceScope: IndexedFileRecord['sourceScope'],
	contentHash: string | null = null,
): IndexedFileRecord {
	const metadata = readIndexedFileMetadataRecord(projectRoot, relativePath, sourceScope);

	return {
		...metadata,
		contentHash: contentHash ?? sha256Bytes(readIndexedFileBytes(projectRoot, relativePath)),
	};
}

function hashIndexedFileMetadataRecord(projectRoot: string, metadata: IndexedFileMetadataRecord): IndexedFileRecord {
	return {
		...metadata,
		contentHash: sha256Bytes(readIndexedFileBytes(projectRoot, metadata.path)),
	};
}

function tryHashIndexedFileMetadataRecord(
	projectRoot: string,
	metadata: IndexedFileMetadataRecord,
): IndexedFileRecord | null {
	try {
		return hashIndexedFileMetadataRecord(projectRoot, metadata);
	} catch {
		return null;
	}
}

export function hashIndexedFileMetadataRecords(
	projectRoot: string,
	metadataRecords: readonly IndexedFileMetadataRecord[],
): IndexedFileRecord[] {
	return metadataRecords
		.map((metadata) => tryHashIndexedFileMetadataRecord(projectRoot, metadata))
		.filter((record): record is IndexedFileRecord => Boolean(record));
}

export function readIndexedFileMetadataRecord(
	projectRoot: string,
	relativePath: string,
	sourceScope: IndexedFileRecord['sourceScope'],
): IndexedFileMetadataRecord {
	const fullPath = indexedProjectPath(projectRoot, relativePath);
	const stats = statSync(fullPath);
	if (!stats.isFile()) {
		throw new Error(`Indexed path must be a regular file: ${relativePath}`);
	}

	return {
		path: relativePath,
		sourceScope,
		sizeBytes: stats.size,
		mtimeMs: Math.round(stats.mtimeMs),
	};
}

function tryReadIndexedFileRecord(
	projectRoot: string,
	relativePath: string,
	sourceScope: IndexedFileRecord['sourceScope'],
	contentHash: string | null = null,
): IndexedFileRecord | null {
	try {
		return readIndexedFileRecord(projectRoot, relativePath, sourceScope, contentHash);
	} catch {
		return null;
	}
}

export function collectIndexedFileRecords(
	projectRoot: string,
	documents: readonly IndexDocument[],
	sourceAnchors: readonly SourceAnchorIndexRecord[],
	sourceAnchorCandidatePaths: readonly string[] = [],
): IndexedFileRecord[] {
	const records = new Map<string, IndexedFileRecord>();

	for (const document of documents) {
		records.set(document.path, readIndexedFileRecord(projectRoot, document.path, 'workflow', document.contentHash));
	}

	const sourcePaths = new Set([...sourceAnchorCandidatePaths, ...sourceAnchors.map((anchor) => anchor.path)]);

	for (const anchorPath of [...sourcePaths].sort((left, right) => left.localeCompare(right))) {
		if (!records.has(anchorPath)) {
			records.set(anchorPath, readIndexedFileRecord(projectRoot, anchorPath, 'source_anchor'));
		}
	}

	if (existsSync(path.join(projectRoot, ...LATEST_RUN_STATE_RELATIVE_PATH.split('/')))) {
		const record = tryReadIndexedFileRecord(projectRoot, LATEST_RUN_STATE_RELATIVE_PATH, 'state');

		if (record) {
			records.set(LATEST_RUN_STATE_RELATIVE_PATH, record);
		}
	}

	return [...records.values()].sort((left, right) => left.path.localeCompare(right.path));
}

export function collectSourceAnchorCandidatePaths(projectRoot: string, sourceConfig: LocalIndexSourceConfig): string[] {
	const paths = listSourceAnchorFiles(projectRoot, {
		...sourceConfig,
		excludeGeneratedOrVendor: true,
	});

	for (const relativePath of paths) {
		indexedProjectPath(projectRoot, relativePath);
	}

	return paths;
}

export function collectFastPreflightIndexedFileMetadataRecords(
	projectRoot: string,
	includeSource: boolean,
	sourceConfig: LocalIndexSourceConfig,
): FastPreflightIndexedFiles | null {
	const records = new Map<string, IndexedFileMetadataRecord>();
	let sourceCandidatePaths: readonly string[] = [];

	for (const relativePath of getExistingIndexablePaths(projectRoot)) {
		records.set(relativePath, readIndexedFileMetadataRecord(projectRoot, relativePath, 'workflow'));
	}

	if (includeSource) {
		try {
			sourceCandidatePaths = collectSourceAnchorCandidatePaths(projectRoot, sourceConfig);
			for (const sourcePath of sourceCandidatePaths) {
				if (!records.has(sourcePath)) {
					records.set(sourcePath, readIndexedFileMetadataRecord(projectRoot, sourcePath, 'source_anchor'));
				}
			}
		} catch {
			return null;
		}
	}

	if (existsSync(path.join(projectRoot, ...LATEST_RUN_STATE_RELATIVE_PATH.split('/')))) {
		records.set(
			LATEST_RUN_STATE_RELATIVE_PATH,
			readIndexedFileMetadataRecord(projectRoot, LATEST_RUN_STATE_RELATIVE_PATH, 'state'),
		);
	}

	return {
		records: [...records.values()].sort((left, right) => left.path.localeCompare(right.path)),
		sourceCandidatePaths,
	};
}
