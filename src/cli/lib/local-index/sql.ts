import { createRequire } from 'node:module';
import { withDependencyDeadline } from '../../../core/dependency-read.js';
import { throwIfInterrupted } from '../../../core/cancellation.js';

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

export async function loadSqlJs(options: { readonly signal?: AbortSignal } = {}): Promise<SqlJsStatic> {
	throwIfInterrupted(options.signal);
	sqlJsPromise ??= withDependencyDeadline({ timeoutMs: 10_000 }, initializeSqlJs).catch((error: unknown) => {
		sqlJsPromise = null;
		throw error;
	});

	// A cancelled caller stops waiting without aborting initialization shared by other requests.
	return options.signal ? withDependencyDeadline({ signal: options.signal, timeoutMs: 10_000 }, () => sqlJsPromise!) : sqlJsPromise;
}
