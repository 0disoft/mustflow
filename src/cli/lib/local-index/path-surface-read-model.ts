import { existsSync, readFileSync } from 'node:fs';

import { toPosixPath } from '../filesystem.js';
import { getLocalIndexDatabasePath } from './database-path.js';
import { queryRows, toSearchString } from './database-read.js';
import { getStalePaths } from './freshness.js';
import { loadSqlJs, type SqlJsDatabase } from './sql.js';
import type {
	LocalPathSurfaceReadModel,
	LocalPathSurfaceReadModelStatus,
	LocalPathSurfaceRuleMatch,
} from './types.js';

function createPathSurfaceReadModelStatus(
	databasePath: string,
	status: LocalPathSurfaceReadModelStatus,
	inputPath: string | null,
	stalePaths: readonly string[] = [],
): LocalPathSurfaceReadModel {
	return {
		source: 'local_index',
		status,
		databasePath,
		indexFresh: status === 'fresh',
		stalePaths,
		inputPath,
		match: null,
		refreshHint: status === 'fresh' ? null : 'Run `mf index` to refresh path-surface explanations.',
	};
}

function pathSurfaceReadModelWithMatch(
	base: LocalPathSurfaceReadModel,
	match: LocalPathSurfaceRuleMatch | null,
): LocalPathSurfaceReadModel {
	return {
		...base,
		match,
	};
}

function readPathSurfaceReasonMap(database: SqlJsDatabase): ReadonlyMap<string, ReadonlyMap<string, readonly string[]>> {
	const byRule = new Map<string, Map<string, string[]>>();

	for (const row of queryRows(database, 'SELECT rule_id, reason_kind, reason FROM path_surface_reasons ORDER BY rule_id, reason_kind, ordinal')) {
		const ruleId = toSearchString(row.rule_id);
		const reasonKind = toSearchString(row.reason_kind);
		const reason = toSearchString(row.reason);
		let reasonsByKind = byRule.get(ruleId);

		if (!reasonsByKind) {
			reasonsByKind = new Map();
			byRule.set(ruleId, reasonsByKind);
		}

		const reasons = reasonsByKind.get(reasonKind) ?? [];
		reasons.push(reason);
		reasonsByKind.set(reasonKind, reasons);
	}

	return byRule;
}

function readPathSurfaceRuleMatches(database: SqlJsDatabase): readonly LocalPathSurfaceRuleMatch[] {
	const reasons = readPathSurfaceReasonMap(database);

	return queryRows(
		database,
		'SELECT rule_id, pattern_kind, pattern, pattern_flags, surface_kind, category, is_public_surface, update_policy FROM path_surfaces ORDER BY rowid',
	).map((row) => {
		const ruleId = toSearchString(row.rule_id);
		const reasonsByKind = reasons.get(ruleId);
		const reasonList = (kind: string) => reasonsByKind?.get(kind) ?? [];

		return {
			ruleId,
			patternKind: toSearchString(row.pattern_kind),
			pattern: toSearchString(row.pattern),
			patternFlags: toSearchString(row.pattern_flags),
			changeKinds: reasonList('change_kind'),
			surface: {
				kind: toSearchString(row.surface_kind),
				category: toSearchString(row.category),
				isPublicSurface: Number(row.is_public_surface) === 1,
				validationReasons: reasonList('validation_reason'),
				affectedContracts: reasonList('affected_contract'),
				updatePolicy: toSearchString(row.update_policy),
				driftChecks: reasonList('drift_check'),
			},
		};
	});
}

function matchPathSurfaceRule(
	relativePath: string | null,
	rules: readonly LocalPathSurfaceRuleMatch[],
): LocalPathSurfaceRuleMatch | null {
	if (!relativePath) {
		return null;
	}

	for (const rule of rules) {
		try {
			if (new RegExp(rule.pattern, rule.patternFlags).test(relativePath)) {
				return rule;
			}
		} catch {
			continue;
		}
	}

	return null;
}

export async function readLocalPathSurfaces(
	projectRoot: string,
	relativePaths: readonly string[],
): Promise<ReadonlyMap<string, LocalPathSurfaceReadModel>> {
	const databasePath = getLocalIndexDatabasePath(projectRoot);
	const normalizedPaths = [...new Set(relativePaths.map((relativePath) => toPosixPath(relativePath)).filter(Boolean))];
	const statusMap = (status: LocalPathSurfaceReadModelStatus, stalePaths: readonly string[] = []) =>
		new Map(
			normalizedPaths.map((relativePath) => [
				relativePath,
				createPathSurfaceReadModelStatus(databasePath, status, relativePath, stalePaths),
			] as const),
		);

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

		const rules = readPathSurfaceRuleMatches(database);
		return new Map(
			normalizedPaths.map((relativePath) => {
				const base = createPathSurfaceReadModelStatus(databasePath, 'fresh', relativePath);
				return [relativePath, pathSurfaceReadModelWithMatch(base, matchPathSurfaceRule(relativePath, rules))] as const;
			}),
		);
	} catch {
		return statusMap('unreadable');
	} finally {
		database.close();
	}
}

export async function readLocalPathSurface(
	projectRoot: string,
	relativePath: string | undefined,
): Promise<LocalPathSurfaceReadModel> {
	const databasePath = getLocalIndexDatabasePath(projectRoot);
	const inputPath = relativePath ? toPosixPath(relativePath) : null;

	if (!inputPath) {
		if (!existsSync(databasePath)) {
			return createPathSurfaceReadModelStatus(databasePath, 'missing', null);
		}

		const SQL = await loadSqlJs();
		const database = new SQL.Database(readFileSync(databasePath));

		try {
			const stalePaths = getStalePaths(projectRoot, database);
			return createPathSurfaceReadModelStatus(databasePath, stalePaths.length > 0 ? 'stale' : 'fresh', null, stalePaths);
		} catch {
			return createPathSurfaceReadModelStatus(databasePath, 'unreadable', null);
		} finally {
			database.close();
		}
	}

	const surfaces = await readLocalPathSurfaces(projectRoot, [inputPath]);
	return surfaces.get(inputPath) ?? createPathSurfaceReadModelStatus(databasePath, 'unreadable', inputPath);
}
