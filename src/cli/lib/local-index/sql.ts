import { createRequire } from 'node:module';

export type SqlValue = number | string | Uint8Array | null;

export interface SqlJsDatabase {
	run(sql: string, params?: SqlValue[] | Record<string, SqlValue> | null): SqlJsDatabase;
	exec(sql: string, params?: SqlValue[]): SqlJsQueryResult[];
	export(): Uint8Array;
	close(): void;
}

export interface SqlJsStatic {
	readonly Database: new (data?: Uint8Array) => SqlJsDatabase;
}

type InitSqlJs = (config?: { locateFile?: (fileName: string) => string }) => Promise<SqlJsStatic>;

interface SqlJsQueryResult {
	readonly columns: readonly string[];
	readonly values: readonly (readonly SqlValue[])[];
}

let sqlJsPromise: Promise<SqlJsStatic> | null = null;

async function initializeSqlJs(): Promise<SqlJsStatic> {
	const require = createRequire(import.meta.url);
	const wasmPath = require.resolve('sql.js/dist/sql-wasm.wasm');
	const sqlJsModule = (await import('sql.js')) as { default?: InitSqlJs } | InitSqlJs;
	const initSqlJs = typeof sqlJsModule === 'function' ? sqlJsModule : sqlJsModule.default;

	if (!initSqlJs) {
		throw new Error('Unable to load sql.js.');
	}

	return initSqlJs({
		locateFile(fileName) {
			return fileName.endsWith('.wasm') ? wasmPath : fileName;
		},
	});
}

export async function loadSqlJs(): Promise<SqlJsStatic> {
	sqlJsPromise ??= initializeSqlJs().catch((error: unknown) => {
		sqlJsPromise = null;
		throw error;
	});

	return sqlJsPromise;
}
