import { AsyncLocalStorage } from 'node:async_hooks';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { getLocalIndexDatabasePath } from './database-path.js';
import { getStalePaths } from './freshness.js';
import { loadSqlJs, type SqlJsDatabase } from './sql.js';

interface LocalIndexSnapshot {
	readonly databasePath: string;
	readonly database: SqlJsDatabase | null;
	readonly stalePaths: readonly string[];
	readonly freshnessFailed?: boolean;
}

interface ReadSession {
	readonly root: string;
	database?: SqlJsDatabase;
	snapshot?: Promise<LocalIndexSnapshot>;
}

const sessions = new AsyncLocalStorage<ReadSession>();

export async function withLocalIndexReadSession<T>(projectRoot: string, read: () => Promise<T>): Promise<T> {
	const root = path.resolve(projectRoot);
	if (sessions.getStore()?.root === root) return read();
	const session: ReadSession = { root };
	return sessions.run(session, async () => {
		try {
			return await read();
		} finally {
			await session.snapshot?.catch(() => undefined);
			session.database?.close();
		}
	});
}

async function openSnapshot(session: ReadSession): Promise<LocalIndexSnapshot> {
	const databasePath = getLocalIndexDatabasePath(session.root);
	if (!existsSync(databasePath)) return { databasePath, database: null, stalePaths: [] };
	const SQL = await loadSqlJs();
	const database = new SQL.Database(readFileSync(databasePath));
	session.database = database;
	try {
		return { databasePath, database, stalePaths: getStalePaths(session.root, database) };
	} catch {
		return { databasePath, database, stalePaths: [], freshnessFailed: true };
	}
}

export async function withLocalIndexDatabase<T>(
	projectRoot: string,
	read: (snapshot: LocalIndexSnapshot) => T,
): Promise<T> {
	const session = sessions.getStore();
	if (!session || session.root !== path.resolve(projectRoot)) {
		return withLocalIndexReadSession(projectRoot, () => withLocalIndexDatabase(projectRoot, read));
	}
	session.snapshot ??= openSnapshot(session);
	return read(await session.snapshot);
}
