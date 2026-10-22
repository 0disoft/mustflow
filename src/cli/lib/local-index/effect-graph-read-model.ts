import { getLocalIndexDatabasePath } from './database-path.js';
import { queryRows, splitIndexedList, toSearchString } from './database-read.js';
import { withLocalIndexDatabase } from './read-session.js';
import type { SqlJsDatabase, SqlValue } from './sql.js';
import type {
	LocalCommandEffectGraph,
	LocalCommandEffectGraphStatus,
	LocalCommandLockConflict,
	LocalCommandWriteLock,
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
export function queryLocalCommandEffectGraphs(
	databasePath: string,
	database: SqlJsDatabase,
	intents: readonly string[],
): ReadonlyMap<string, LocalCommandEffectGraph> {
	const names = [...new Set(intents)];
	const graphs = new Map<string, LocalCommandEffectGraph>();
	const locksByIntent = new Map<string, LocalCommandWriteLock[]>();
	const conflictsByIntent = new Map<string, LocalCommandLockConflict[]>();
	for (const intent of names) {
		const writeLocks: LocalCommandWriteLock[] = [];
		const lockConflicts: LocalCommandLockConflict[] = [];
		locksByIntent.set(intent, writeLocks);
		conflictsByIntent.set(intent, lockConflicts);
		graphs.set(intent, { ...createCommandEffectGraphStatus(databasePath, 'fresh'), writeLocks, lockConflicts });
	}
	const chunkSize = 200;
	for (let start = 0; start < names.length; start += chunkSize) {
		const chunk = names.slice(start, start + chunkSize);
		const targets = new Set(chunk);
		const placeholders = chunk.map(() => '?').join(', ');
		for (const row of queryRows(
			database,
			`
SELECT intent, lock, paths, modes, sources, concurrencies, effect_count
FROM command_write_locks
WHERE intent IN (${placeholders})
ORDER BY intent, lock
`,
			chunk,
		)) locksByIntent.get(toSearchString(row.intent))!.push({
			lock: toSearchString(row.lock),
			paths: splitIndexedList(row.paths),
			modes: splitIndexedList(row.modes),
			sources: splitIndexedList(row.sources),
			concurrencies: splitIndexedList(row.concurrencies),
			effectCount: typeof row.effect_count === 'number' && Number.isFinite(row.effect_count) ? row.effect_count : 0,
			});

		for (const row of queryRows(
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
WHERE left_intent IN (${placeholders}) OR right_intent IN (${placeholders})
ORDER BY lock, left_intent, right_intent
`,
			[...chunk, ...chunk],
		)) {
			for (const intent of [toSearchString(row.left_intent), toSearchString(row.right_intent)]) {
			if (targets.has(intent)) conflictsByIntent.get(intent)!.push(mapCommandLockConflict(row, intent));
			}
		}
	}
	return graphs;
}

export async function readLocalCommandEffectGraph(projectRoot: string, intent: string): Promise<LocalCommandEffectGraph> {
	const graphs = await readLocalCommandEffectGraphs(projectRoot, [intent]);
	return graphs.get(intent) ?? createCommandEffectGraphStatus(getLocalIndexDatabasePath(projectRoot), 'unreadable');
}

export async function readLocalCommandEffectGraphs(
	projectRoot: string,
	intents: readonly string[],
): Promise<ReadonlyMap<string, LocalCommandEffectGraph>> {
	const intentNames = [...new Set(intents)];
	if (intentNames.length === 0) return new Map();
	return withLocalIndexDatabase(projectRoot, ({ databasePath, database, stalePaths, freshnessFailed }) => {
		const statusMap = (status: LocalCommandEffectGraphStatus, stalePaths: readonly string[] = []) =>
			new Map(intentNames.map((intent) => [intent, createCommandEffectGraphStatus(databasePath, status, stalePaths)] as const));
		if (!database) return statusMap('missing');
		if (freshnessFailed) return statusMap('unreadable');
		if (stalePaths.length > 0) {
			return statusMap('stale', stalePaths);
		}
		try {
			return queryLocalCommandEffectGraphs(databasePath, database, intentNames);
		} catch {
			return statusMap('unreadable');
		}
	});
}
