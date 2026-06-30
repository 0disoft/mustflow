import { existsSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';

import { isRecord, readStringArray, type TomlTable } from '../command-contract.js';
import { readMustflowTomlFile } from '../toml.js';
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
		contentHash: contentHash ?? sha256Bytes(readFileSync(path.join(projectRoot, ...relativePath.split('/')))),
	};
}

function hashIndexedFileMetadataRecord(projectRoot: string, metadata: IndexedFileMetadataRecord): IndexedFileRecord {
	return {
		...metadata,
		contentHash: sha256Bytes(readFileSync(path.join(projectRoot, ...metadata.path.split('/')))),
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
	const fullPath = path.join(projectRoot, ...relativePath.split('/'));
	const stats = statSync(fullPath);

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
			const record = tryReadIndexedFileRecord(projectRoot, anchorPath, 'source_anchor');

			if (record) {
				records.set(anchorPath, record);
			}
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
	return listSourceAnchorFiles(projectRoot, {
		...sourceConfig,
		excludeGeneratedOrVendor: true,
	});
}

export function collectFastPreflightIndexedFileMetadataRecords(
	projectRoot: string,
	includeSource: boolean,
	sourceConfig: LocalIndexSourceConfig,
): IndexedFileMetadataRecord[] | null {
	const records = new Map<string, IndexedFileMetadataRecord>();

	for (const relativePath of getExistingIndexablePaths(projectRoot)) {
		records.set(relativePath, readIndexedFileMetadataRecord(projectRoot, relativePath, 'workflow'));
	}

	if (includeSource) {
		try {
			for (const sourcePath of collectSourceAnchorCandidatePaths(projectRoot, sourceConfig)) {
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

	return [...records.values()].sort((left, right) => left.path.localeCompare(right.path));
}
