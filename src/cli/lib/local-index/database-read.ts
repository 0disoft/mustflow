import {
	SEARCH_BACKEND_FTS5,
	SEARCH_BACKEND_TABLE_SCAN,
	TEST_DISABLE_FTS5_ENV,
} from './constants.js';
import type { SqlJsDatabase, SqlValue } from './sql.js';
import type { SearchBackendKind } from './types.js';

export interface LocalSearchCapabilities {
	readonly backend: SearchBackendKind;
	readonly fts5Available: boolean;
}

export function toSearchString(value: SqlValue | undefined): string {
	if (value === null || value === undefined) {
		return '';
	}

	if (value instanceof Uint8Array) {
		return '';
	}

	return String(value);
}

export function queryRows(database: SqlJsDatabase, sql: string, params: SqlValue[] = []): Record<string, SqlValue>[] {
	const [result] = database.exec(sql, params);

	if (!result) {
		return [];
	}

	return result.values.map((values) => {
		const row: Record<string, SqlValue> = {};

		result.columns.forEach((column, index) => {
			row[column] = values[index] ?? null;
		});

		return row;
	});
}

export function searchCapabilities(fts5Available: boolean): LocalSearchCapabilities {
	return {
		backend: fts5Available ? SEARCH_BACKEND_FTS5 : SEARCH_BACKEND_TABLE_SCAN,
		fts5Available,
	};
}

export function detectLocalSearchCapabilities(database: SqlJsDatabase): LocalSearchCapabilities {
	if (process.env[TEST_DISABLE_FTS5_ENV] === '1') {
		return searchCapabilities(false);
	}

	try {
		database.run('CREATE VIRTUAL TABLE temp.mustflow_fts5_probe USING fts5(value)');
		database.run('DROP TABLE temp.mustflow_fts5_probe');
		return searchCapabilities(true);
	} catch {
		return searchCapabilities(false);
	}
}

export function readMetadataValue(database: SqlJsDatabase, key: string): string | undefined {
	return toSearchString(queryRows(database, 'SELECT value FROM metadata WHERE key = ?', [key])[0]?.value) || undefined;
}

export function hasTable(database: SqlJsDatabase, tableName: string): boolean {
	return queryRows(database, 'SELECT name FROM sqlite_master WHERE type = "table" AND name = ?', [tableName]).length > 0;
}

export function readStoredSearchCapabilities(database: SqlJsDatabase): LocalSearchCapabilities {
	const fts5Available = readMetadataValue(database, 'search_fts5_available') === 'true';
	const backend = readMetadataValue(database, 'search_backend');

	if (backend === SEARCH_BACKEND_FTS5 && hasTable(database, 'search_documents_fts')) {
		return { backend: SEARCH_BACKEND_FTS5, fts5Available };
	}

	return { backend: SEARCH_BACKEND_TABLE_SCAN, fts5Available };
}

export function toNullableNumber(value: SqlValue | undefined): number | null {
	if (typeof value !== 'number') {
		return null;
	}

	return Number.isFinite(value) ? value : null;
}

export function splitIndexedList(value: SqlValue | undefined): string[] {
	return toSearchString(value)
		.split(',')
		.map((item) => item.trim())
		.filter(Boolean)
		.sort((left, right) => left.localeCompare(right));
}

export function readCount(database: SqlJsDatabase, tableName: string): number {
	if (!hasTable(database, tableName)) {
		return 0;
	}

	const [row] = queryRows(database, `SELECT COUNT(*) AS count FROM ${tableName}`);
	const count = row?.count;
	return typeof count === 'number' && Number.isFinite(count) ? count : 0;
}

export function readStoredIndexedPaths(database: SqlJsDatabase): string[] {
	if (!hasTable(database, 'documents')) {
		return [];
	}

	return queryRows(database, 'SELECT path FROM documents ORDER BY path')
		.map((row) => toSearchString(row.path))
		.filter(Boolean);
}

export function sqlPlaceholders(values: readonly unknown[]): string {
	return values.map(() => '?').join(', ');
}
