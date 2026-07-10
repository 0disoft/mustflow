import { DEFAULT_DATABASE_RELATIVE_PATH, LOCAL_INDEX_SCHEMA_VERSION } from './constants.js';
import { hasTable, queryRows, readMetadataValue, toSearchString } from './database-read.js';
import type { SqlJsDatabase } from './sql.js';
import {
	collectSourceAnchorCandidatePaths,
	getSourceScopeHash,
	normalizeIndexedFileSourceScope,
	readIndexedFileRecord,
	readLocalIndexSourceConfig,
} from './source-index.js';
import { collectDocuments } from './workflow-documents.js';

interface StalePathOptions {
	readonly includeState?: boolean;
}

export function readStoredSchemaVersion(database: SqlJsDatabase): string | undefined {
	return readMetadataValue(database, 'schema_version');
}

export function getStalePaths(projectRoot: string, database: SqlJsDatabase, options: StalePathOptions = {}): string[] {
	const schemaVersion = readStoredSchemaVersion(database);
	const includeState = options.includeState ?? true;

	if (schemaVersion !== LOCAL_INDEX_SCHEMA_VERSION) {
		return ['.mustflow/cache/mustflow.sqlite'];
	}

	if (
		!hasTable(database, 'indexed_files') ||
		!hasTable(database, 'indexed_source_candidates') ||
		!hasTable(database, 'source_anchors') ||
		!hasTable(database, 'source_anchor_status')
	) {
		return [DEFAULT_DATABASE_RELATIVE_PATH];
	}

	const stalePaths = new Set<string>();
	const indexedRows = queryRows(database, 'SELECT path, source_scope, content_hash FROM indexed_files');
	const indexedPaths = new Set(indexedRows.map((row) => toSearchString(row.path)));
	const indexedSourcePaths = new Set(
		queryRows(database, 'SELECT path FROM indexed_source_candidates').map((row) => toSearchString(row.path)),
	);

	for (const sourcePath of indexedSourcePaths) {
		if (!indexedPaths.has(sourcePath)) {
			stalePaths.add(sourcePath);
		}
	}

	for (const row of indexedRows) {
		const indexedPath = toSearchString(row.path);
		const sourceScope = normalizeIndexedFileSourceScope(toSearchString(row.source_scope));

		if (!includeState && sourceScope === 'state') {
			continue;
		}

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

	const sourceIndexEnabledValue = readMetadataValue(database, 'source_index_enabled');
	if (sourceIndexEnabledValue !== 'true' && sourceIndexEnabledValue !== 'false') {
		stalePaths.add(DEFAULT_DATABASE_RELATIVE_PATH);
	} else {
		const sourceIndexEnabled = sourceIndexEnabledValue === 'true';
		const hasIndexedSourceScope = indexedRows.some(
			(row) => normalizeIndexedFileSourceScope(toSearchString(row.source_scope)) === 'source_anchor',
		);
		const hasSourceAnchorRows =
			hasTable(database, 'source_anchors') && queryRows(database, 'SELECT id FROM source_anchors LIMIT 1').length > 0;

		if (!sourceIndexEnabled && (indexedSourcePaths.size > 0 || hasIndexedSourceScope || hasSourceAnchorRows)) {
			stalePaths.add(DEFAULT_DATABASE_RELATIVE_PATH);
		}

		try {
			const sourceConfig = readLocalIndexSourceConfig(projectRoot);
			const storedSourceScopeHash = readMetadataValue(database, 'source_scope_hash');
			const currentSourceScopeHash = getSourceScopeHash(sourceIndexEnabled, sourceConfig);

			if (storedSourceScopeHash !== currentSourceScopeHash) {
				stalePaths.add(DEFAULT_DATABASE_RELATIVE_PATH);
			}

			if (sourceIndexEnabled) {
				const currentSourcePaths = new Set(collectSourceAnchorCandidatePaths(projectRoot, sourceConfig));

				for (const sourcePath of currentSourcePaths) {
					if (!indexedSourcePaths.has(sourcePath)) {
						stalePaths.add(sourcePath);
					}
				}

				for (const sourcePath of indexedSourcePaths) {
					if (!currentSourcePaths.has(sourcePath)) {
						stalePaths.add(sourcePath);
					}
				}
			}
		} catch {
			stalePaths.add(DEFAULT_DATABASE_RELATIVE_PATH);
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
