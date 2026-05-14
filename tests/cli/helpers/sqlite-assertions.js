import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { profileOperationAsync } from './ops-profiler.js';

const require = createRequire(import.meta.url);
let sqlPromise;

export async function loadSqlJsCached() {
	if (!sqlPromise) {
		sqlPromise = profileOperationAsync('sqljs_load', {}, async () => {
			const wasmPath = require.resolve('sql.js/dist/sql-wasm.wasm');
			const sqlJsModule = await import('sql.js');
			const initSqlJs = sqlJsModule.default;

			return initSqlJs({
				locateFile(fileName) {
					return fileName.endsWith('.wasm') ? wasmPath : fileName;
				},
			});
		});
	}

	return sqlPromise;
}

export async function openSqliteDatabase(databasePath) {
	const SQL = await loadSqlJsCached();
	return new SQL.Database(readFileSync(databasePath));
}

export function queryRows(database, sql) {
	const [result] = database.exec(sql);

	if (!result) {
		return [];
	}

	return result.values.map((values) => {
		const row = {};

		result.columns.forEach((column, index) => {
			row[column] = values[index] ?? null;
		});

		return row;
	});
}
