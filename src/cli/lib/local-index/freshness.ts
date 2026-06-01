import { LOCAL_INDEX_SCHEMA_VERSION } from './constants.js';
import { hasTable, queryRows, readMetadataValue, toSearchString } from './database-read.js';
import type { SqlJsDatabase } from './sql.js';
import { normalizeIndexedFileSourceScope, readIndexedFileRecord } from './source-index.js';
import { collectDocuments } from './workflow-documents.js';

export function readStoredSchemaVersion(database: SqlJsDatabase): string | undefined {
	return readMetadataValue(database, 'schema_version');
}

export function getStalePaths(projectRoot: string, database: SqlJsDatabase): string[] {
	const schemaVersion = readStoredSchemaVersion(database);

	if (schemaVersion !== LOCAL_INDEX_SCHEMA_VERSION) {
		return ['.mustflow/cache/mustflow.sqlite'];
	}

	if (hasTable(database, 'indexed_files')) {
		const stalePaths = new Set<string>();
		const indexedRows = queryRows(database, 'SELECT path, source_scope, content_hash FROM indexed_files');
		const indexedPaths = new Set(indexedRows.map((row) => toSearchString(row.path)));

		for (const row of indexedRows) {
			const indexedPath = toSearchString(row.path);
			const sourceScope = normalizeIndexedFileSourceScope(toSearchString(row.source_scope));

			try {
				const current = readIndexedFileRecord(projectRoot, indexedPath, sourceScope);

				if (current.contentHash !== toSearchString(row.content_hash)) {
					stalePaths.add(indexedPath);
				}
			} catch {
				stalePaths.add(indexedPath);
			}
		}

		for (const document of collectDocuments(projectRoot)) {
			if (!indexedPaths.has(document.path)) {
				stalePaths.add(document.path);
			}
		}

		return Array.from(stalePaths).sort((left, right) => left.localeCompare(right));
	}

	const indexedRows = queryRows(database, 'SELECT path, content_hash FROM documents');
	const indexedHashes = new Map(indexedRows.map((row) => [toSearchString(row.path), toSearchString(row.content_hash)]));
	const currentDocuments = collectDocuments(projectRoot);
	const currentHashes = new Map(currentDocuments.map((document) => [document.path, document.contentHash]));
	const stalePaths = new Set<string>();

	for (const [indexedPath, indexedHash] of indexedHashes) {
		if (currentHashes.get(indexedPath) !== indexedHash) {
			stalePaths.add(indexedPath);
		}
	}

	for (const currentPath of currentHashes.keys()) {
		if (!indexedHashes.has(currentPath)) {
			stalePaths.add(currentPath);
		}
	}

	return Array.from(stalePaths).sort((left, right) => left.localeCompare(right));
}

export function isLocalIndexStaleError(error: unknown): boolean {
	return error instanceof Error && error.message.startsWith('Local mustflow index is stale:');
}

export function isLocalIndexRuntimeUnavailableError(error: unknown): boolean {
	const message = error instanceof Error ? error.message : String(error);

	return /file is not a database|database disk image is malformed|no such table|no such column|sqlite|sql\.js/iu.test(message);
}
