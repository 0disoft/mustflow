import { existsSync, readFileSync } from 'node:fs';

import { getLocalIndexDatabasePath } from './database-path.js';
import { queryRows, splitIndexedList, toSearchString } from './database-read.js';
import { getStalePaths } from './freshness.js';
import { loadSqlJs, type SqlJsDatabase, type SqlValue } from './sql.js';
import type {
	LocalCommandEffectGraph,
	LocalCommandEffectGraphStatus,
	LocalCommandLockConflict,
} from './types.js';

function createCommandEffectGraphStatus(
	databasePath: string,
	status: LocalCommandEffectGraphStatus,
	stalePaths: readonly string[] = [],
): LocalCommandEffectGraph {
	return {
		source: 'local_index',
		authority: 'explanation_only',
		commandAuthority: '.mustflow/config/commands.toml',
		grantsCommandAuthority: false,
		status,
		databasePath,
		indexFresh: status === 'fresh',
		stalePaths,
		writeLocks: [],
		lockConflicts: [],
		refreshHint: status === 'fresh' ? null : 'Run `mf index` to refresh command-effect graph explanations.',
	};
}

function mapCommandLockConflict(row: Record<string, SqlValue>, intent: string): LocalCommandLockConflict {
	const targetIsLeft = toSearchString(row.left_intent) === intent;
	const targetPrefix = targetIsLeft ? 'left' : 'right';
	const otherPrefix = targetIsLeft ? 'right' : 'left';

	return {
		intent: toSearchString(row[`${otherPrefix}_intent`]),
		lock: toSearchString(row.lock),
		paths: splitIndexedList(row[`${targetPrefix}_paths`]),
		modes: splitIndexedList(row[`${targetPrefix}_modes`]),
		concurrencies: splitIndexedList(row[`${targetPrefix}_concurrencies`]),
		conflictingPaths: splitIndexedList(row[`${otherPrefix}_paths`]),
		conflictingModes: splitIndexedList(row[`${otherPrefix}_modes`]),
		conflictingConcurrencies: splitIndexedList(row[`${otherPrefix}_concurrencies`]),
	};
}

/**
 * mf:anchor cli.index.command-effect-graph
 * purpose: Read command-effect lock and conflict explanations from the local SQLite index.
 * search: mf explain command, command locks, local index, sqlite graph
 * invariant: Indexed command-effect rows explain current commands.toml only when the index is fresh and never grant command authority.
 * risk: cache, config
 */
function queryLocalCommandEffectGraph(
	databasePath: string,
	database: SqlJsDatabase,
	intent: string,
): LocalCommandEffectGraph {
	const writeLocks = queryRows(
		database,
		`
SELECT lock, paths, modes, sources, concurrencies, effect_count
FROM command_write_locks
WHERE intent = ?
ORDER BY lock
`,
		[intent],
	).map((row) => ({
		lock: toSearchString(row.lock),
		paths: splitIndexedList(row.paths),
		modes: splitIndexedList(row.modes),
		sources: splitIndexedList(row.sources),
		concurrencies: splitIndexedList(row.concurrencies),
		effectCount: typeof row.effect_count === 'number' && Number.isFinite(row.effect_count) ? row.effect_count : 0,
	}));

	const lockConflicts = queryRows(
		database,
		`
SELECT
  left_intent,
  right_intent,
  lock,
  left_paths,
  right_paths,
  left_modes,
  right_modes,
  left_concurrencies,
  right_concurrencies
FROM command_lock_conflicts
WHERE left_intent = ? OR right_intent = ?
ORDER BY lock, left_intent, right_intent
`,
		[intent, intent],
	).map((row) => mapCommandLockConflict(row, intent));

	return {
		source: 'local_index',
		authority: 'explanation_only',
		commandAuthority: '.mustflow/config/commands.toml',
		grantsCommandAuthority: false,
		status: 'fresh',
		databasePath,
		indexFresh: true,
		stalePaths: [],
		writeLocks,
		lockConflicts,
		refreshHint: null,
	};
}

export async function readLocalCommandEffectGraph(projectRoot: string, intent: string): Promise<LocalCommandEffectGraph> {
	const graphs = await readLocalCommandEffectGraphs(projectRoot, [intent]);
	return graphs.get(intent) ?? createCommandEffectGraphStatus(getLocalIndexDatabasePath(projectRoot), 'unreadable');
}

export async function readLocalCommandEffectGraphs(
	projectRoot: string,
	intents: readonly string[],
): Promise<ReadonlyMap<string, LocalCommandEffectGraph>> {
	const databasePath = getLocalIndexDatabasePath(projectRoot);
	const intentNames = [...new Set(intents)];
	const statusMap = (status: LocalCommandEffectGraphStatus, stalePaths: readonly string[] = []) =>
		new Map(intentNames.map((intent) => [intent, createCommandEffectGraphStatus(databasePath, status, stalePaths)] as const));

	if (!existsSync(databasePath)) {
		return statusMap('missing');
	}

	const SQL = await loadSqlJs();
	const database = new SQL.Database(readFileSync(databasePath));

	try {
		const stalePaths = getStalePaths(projectRoot, database);

		if (stalePaths.length > 0) {
			return statusMap('stale', stalePaths);
		}

		return new Map(intentNames.map((intent) => [intent, queryLocalCommandEffectGraph(databasePath, database, intent)] as const));
	} catch {
		return statusMap('unreadable');
	} finally {
		database.close();
	}
}
