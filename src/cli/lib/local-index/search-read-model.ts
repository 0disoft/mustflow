import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

import { isRecord, readStringArray, type TomlTable } from '../command-contract.js';
import { toPosixPath } from '../filesystem.js';
import type { NormalizedCommandEffect } from '../../../core/command-effects.js';
import type { SourceAnchorStatus } from '../../../core/source-anchor-status.js';
import {
	DEFAULT_PROMPT_CACHE_STABLE_READ,
	DEFAULT_PROMPT_CACHE_TASK_SOURCES,
	DEFAULT_PROMPT_CACHE_VOLATILE_SOURCES,
	LOCAL_INDEX_SCHEMA_VERSION,
	SEARCH_BACKEND_FTS5,
	SEARCH_BACKEND_TABLE_SCAN,
} from './constants.js';
import { getLocalIndexDatabasePath } from './database-path.js';
import {
	hasTable,
	queryRows,
	readStoredSearchCapabilities,
	searchCapabilities,
	sqlPlaceholders,
	toSearchString,
} from './database-read.js';
import {
	getStalePaths,
	isLocalIndexRuntimeUnavailableError,
	isLocalIndexStaleError,
} from './freshness.js';
import {
	buildFtsQuery,
	buildSearchNgrams,
	getMatchSnippet,
	isMatched,
	normalizeSearchText,
	scoreMatch,
} from './search-text.js';
import { loadSqlJs, type SqlJsDatabase, type SqlValue } from './sql.js';
import { readMustflowToml } from './source-index.js';
import type {
	CacheLayer,
	IndexDocument,
	LocalSearchItem,
	LocalSearchOptions,
	LocalSearchResult,
	LocalSearchScope,
	SearchNgramTargetKind,
} from './types.js';
import {
	collectDocumentsFromPaths,
	collectSkills,
	getExistingIndexablePaths,
	readText,
	skillRouteKey,
	splitVerificationIntents,
} from './workflow-documents.js';

const DIRECT_SEARCH_MAX_WORKFLOW_FILES = 200;

interface CacheLayerSets {
	readonly stable: ReadonlySet<string>;
	readonly task: ReadonlySet<string>;
	readonly volatile: ReadonlySet<string>;
}

function readNestedTable(table: TomlTable | undefined, key: string): TomlTable | undefined {
	if (!table || !isRecord(table[key])) {
		return undefined;
	}

	return table[key];
}

function readOptionalStringArray(table: TomlTable | undefined, key: string): readonly string[] | null {
	return table ? readStringArray(table, key) ?? null : null;
}

function readCacheLayerSets(projectRoot: string): CacheLayerSets {
	const mustflow = readMustflowToml(projectRoot);
	const promptCache = readNestedTable(mustflow, 'prompt_cache');
	const layers = readNestedTable(promptCache, 'layers');
	const stable = readNestedTable(layers, 'stable');
	const task = readNestedTable(layers, 'task');
	const volatile = readNestedTable(layers, 'volatile');
	const normalize = (values: readonly string[]) => new Set(values.map((value) => toPosixPath(value)));

	return {
		stable: normalize(readOptionalStringArray(stable, 'read') ?? [...DEFAULT_PROMPT_CACHE_STABLE_READ]),
		task: normalize(readOptionalStringArray(task, 'sources') ?? [...DEFAULT_PROMPT_CACHE_TASK_SOURCES]),
		volatile: normalize(readOptionalStringArray(volatile, 'sources') ?? [...DEFAULT_PROMPT_CACHE_VOLATILE_SOURCES]),
	};
}

function inferCacheLayer(relativePath: string | null, kind: LocalSearchItem['kind'], cacheLayers: CacheLayerSets): CacheLayer {
	const normalized = relativePath ? toPosixPath(relativePath) : null;

	if (normalized && cacheLayers.volatile.has(normalized)) {
		return 'volatile';
	}

	if (normalized && cacheLayers.stable.has(normalized)) {
		return 'stable';
	}

	if (kind === 'command_intent' && cacheLayers.stable.has('.mustflow/config/commands.toml')) {
		return 'stable';
	}

	if (
		normalized &&
		(cacheLayers.task.has(normalized) || normalized.startsWith('.mustflow/context/') || normalized.endsWith('/SKILL.md'))
	) {
		return 'task';
	}

	if (normalized?.startsWith('.mustflow/state/') || normalized?.startsWith('.mustflow/cache/')) {
		return 'volatile';
	}

	return 'task';
}

function withCacheHint<T extends Omit<LocalSearchItem, 'cache_layer' | 'volatile'>>(
	item: T,
	cacheLayers: CacheLayerSets,
): T & Pick<LocalSearchItem, 'cache_layer' | 'volatile'> {
	const layer = inferCacheLayer(item.path ?? null, item.kind, cacheLayers);

	return {
		...item,
		cache_layer: layer,
		volatile: layer === 'volatile',
	};
}

function workflowAuthorityForDocument(documentType: string): Pick<
	LocalSearchItem,
	'authority_rank' | 'authority_label' | 'source_scope' | 'navigation_only' | 'can_instruct_agent'
> {
	if (documentType === 'agent_rules' || documentType === 'config' || documentType === 'workflow_doc') {
		return {
			authority_rank: 2,
			authority_label: 'workflow_authority',
			source_scope: 'workflow',
			navigation_only: false,
			can_instruct_agent: true,
		};
	}

	return {
		authority_rank: 4,
		authority_label: 'workflow_context',
		source_scope: 'workflow',
		navigation_only: false,
		can_instruct_agent: false,
	};
}

function skillAuthority(): Pick<
	LocalSearchItem,
	'authority_rank' | 'authority_label' | 'source_scope' | 'navigation_only' | 'can_instruct_agent'
> {
	return {
		authority_rank: 3,
		authority_label: 'skill_procedure',
		source_scope: 'workflow',
		navigation_only: false,
		can_instruct_agent: true,
	};
}

function commandIntentAuthority(): Pick<
	LocalSearchItem,
	'authority_rank' | 'authority_label' | 'source_scope' | 'navigation_only' | 'can_instruct_agent'
> {
	return {
		authority_rank: 1,
		authority_label: 'command_contract',
		source_scope: 'workflow',
		navigation_only: false,
		can_instruct_agent: true,
	};
}

function sourceAnchorAuthority(): Pick<
	LocalSearchItem,
	'authority_rank' | 'authority_label' | 'source_scope' | 'navigation_only' | 'can_instruct_agent'
> {
	return {
		authority_rank: 5,
		authority_label: 'source_navigation_hint',
		source_scope: 'source',
		navigation_only: true,
		can_instruct_agent: false,
	};
}

function getSectionHeadings(database: SqlJsDatabase, documentPath: string): string[] {
	return queryRows(database, 'SELECT heading FROM sections WHERE document_path = ? ORDER BY ordinal', [documentPath]).map((row) =>
		toSearchString(row.heading),
	);
}

function getDocumentTerms(database: SqlJsDatabase, documentPath: string): string[] {
	return queryRows(database, 'SELECT term FROM document_terms WHERE document_path = ? ORDER BY term', [documentPath]).map((row) =>
		toSearchString(row.term),
	);
}

function commandEffectFromRow(row: Record<string, SqlValue>): NormalizedCommandEffect {
	return {
		intent: toSearchString(row.intent),
		source: toSearchString(row.source) as NormalizedCommandEffect['source'],
		access: toSearchString(row.access) as NormalizedCommandEffect['access'],
		mode: toSearchString(row.mode) as NormalizedCommandEffect['mode'],
		path: row.path === null || row.path === undefined ? null : toSearchString(row.path),
		lock: toSearchString(row.lock),
		concurrency: toSearchString(row.concurrency) as NormalizedCommandEffect['concurrency'],
	};
}

interface IndexedSearchMatches {
	readonly active: boolean;
	readonly documents: ReadonlySet<string>;
	readonly skills: ReadonlySet<string>;
	readonly skillRoutes: ReadonlySet<string>;
	readonly commandIntents: ReadonlySet<string>;
	readonly sourceAnchors: ReadonlySet<string>;
}

function queryCandidateRows(
	database: SqlJsDatabase,
	sql: string,
	keyColumn: string,
	candidates: ReadonlySet<string>,
	indexedMatches: IndexedSearchMatches,
): Record<string, SqlValue>[] {
	if (!indexedMatches.active || candidates.size === 0) {
		return queryRows(database, sql);
	}

	const keys = [...candidates].sort((left, right) => left.localeCompare(right));

	return queryRows(database, `${sql} WHERE ${keyColumn} IN (${sqlPlaceholders(keys)})`, keys);
}

function getCommandEffectsByIntent(
	database: SqlJsDatabase,
	intents: readonly string[],
): ReadonlyMap<string, readonly NormalizedCommandEffect[]> {
	const uniqueIntents = [...new Set(intents)].sort((left, right) => left.localeCompare(right));
	const effectsByIntent = new Map<string, NormalizedCommandEffect[]>(uniqueIntents.map((intent) => [intent, []]));

	if (uniqueIntents.length === 0) {
		return effectsByIntent;
	}

	for (const row of queryRows(
		database,
		`SELECT intent, source, access, mode, path, lock, concurrency
FROM command_effects
WHERE intent IN (${sqlPlaceholders(uniqueIntents)})
ORDER BY intent, lock, path, mode`,
		uniqueIntents,
	)) {
		const effect = commandEffectFromRow(row);
		const effects = effectsByIntent.get(effect.intent);

		if (effects) {
			effects.push(effect);
		}
	}

	return effectsByIntent;
}

const EMPTY_INDEXED_SEARCH_MATCHES: IndexedSearchMatches = {
	active: false,
	documents: new Set(),
	skills: new Set(),
	skillRoutes: new Set(),
	commandIntents: new Set(),
	sourceAnchors: new Set(),
};

function queryFtsSet(database: SqlJsDatabase, sql: string, ftsQuery: string, column: string): ReadonlySet<string> {
	return new Set(queryRows(database, sql, [ftsQuery]).map((row) => toSearchString(row[column])));
}

function mergeSearchSets(left: ReadonlySet<string>, right: ReadonlySet<string>): ReadonlySet<string> {
	return new Set([...left, ...right]);
}

function mergeIndexedSearchMatches(left: IndexedSearchMatches, right: IndexedSearchMatches): IndexedSearchMatches {
	return {
		active: left.active || right.active,
		documents: mergeSearchSets(left.documents, right.documents),
		skills: mergeSearchSets(left.skills, right.skills),
		skillRoutes: mergeSearchSets(left.skillRoutes, right.skillRoutes),
		commandIntents: mergeSearchSets(left.commandIntents, right.commandIntents),
		sourceAnchors: mergeSearchSets(left.sourceAnchors, right.sourceAnchors),
	};
}

function queryNgramSet(
	database: SqlJsDatabase,
	targetKind: SearchNgramTargetKind,
	grams: readonly string[],
): ReadonlySet<string> {
	const placeholders = grams.map(() => '?').join(', ');

	if (!placeholders) {
		return new Set();
	}

	return new Set(
		queryRows(
			database,
			`SELECT target_key
FROM search_ngrams
WHERE target_kind = ? AND gram IN (${placeholders})
GROUP BY target_key
HAVING COUNT(DISTINCT gram) = ?`,
			[targetKind, ...grams, grams.length],
		).map((row) => toSearchString(row.target_key)),
	);
}

function getNgramSearchMatches(database: SqlJsDatabase, query: string): IndexedSearchMatches {
	if (!hasTable(database, 'search_ngrams')) {
		return EMPTY_INDEXED_SEARCH_MATCHES;
	}

	const grams = buildSearchNgrams([query]);

	if (grams.length === 0) {
		return EMPTY_INDEXED_SEARCH_MATCHES;
	}

	return {
		active: true,
		documents: queryNgramSet(database, 'document', grams),
		skills: queryNgramSet(database, 'skill', grams),
		skillRoutes: queryNgramSet(database, 'skill_route', grams),
		commandIntents: queryNgramSet(database, 'command_intent', grams),
		sourceAnchors: queryNgramSet(database, 'source_anchor', grams),
	};
}

function getIndexedSearchMatches(database: SqlJsDatabase, query: string): IndexedSearchMatches {
	const capabilities = readStoredSearchCapabilities(database);
	const ftsQuery = capabilities.backend === SEARCH_BACKEND_FTS5 ? buildFtsQuery(query) : null;
	const ngramMatches = getNgramSearchMatches(database, query);

	if (!ftsQuery) {
		return ngramMatches;
	}

	try {
		const ftsMatches = {
			active: true,
			documents: queryFtsSet(
				database,
				'SELECT path FROM search_documents_fts WHERE search_documents_fts MATCH ?',
				ftsQuery,
				'path',
			),
			skills: queryFtsSet(database, 'SELECT name FROM search_skills_fts WHERE search_skills_fts MATCH ?', ftsQuery, 'name'),
			skillRoutes: queryFtsSet(
				database,
				'SELECT route_key FROM search_skill_routes_fts WHERE search_skill_routes_fts MATCH ?',
				ftsQuery,
				'route_key',
			),
			commandIntents: queryFtsSet(
				database,
				'SELECT name FROM search_command_intents_fts WHERE search_command_intents_fts MATCH ?',
				ftsQuery,
				'name',
			),
			sourceAnchors: queryFtsSet(
				database,
				'SELECT id FROM search_source_anchors_fts WHERE search_source_anchors_fts MATCH ?',
				ftsQuery,
				'id',
			),
		};

		return mergeIndexedSearchMatches(ftsMatches, ngramMatches);
	} catch {
		return ngramMatches;
	}
}

function matchesIndexedOrTableScan(
	fields: readonly string[],
	query: string,
	indexedMatches: IndexedSearchMatches,
	matchSet: ReadonlySet<string>,
	key: string,
): boolean {
	return indexedMatches.active && matchSet.size > 0 ? matchSet.has(key) : isMatched(fields, query);
}

function scoreIndexedOrTableScan(
	primaryFields: readonly string[],
	secondaryFields: readonly string[],
	query: string,
	indexedMatches: IndexedSearchMatches,
	matchSet: ReadonlySet<string>,
	key: string,
): number {
	const tableScore = scoreMatch(primaryFields, secondaryFields, query);
	return indexedMatches.active && matchSet.size > 0 && matchSet.has(key) ? Math.max(tableScore, 20) : tableScore;
}

function sortLocalSearchResults(
	results: readonly LocalSearchItem[],
	scope: LocalSearchScope,
	limit: number,
): LocalSearchItem[] {
	const sorted = [...results].sort((left, right) => {
		if (scope === 'all' && left.authority_rank !== right.authority_rank) {
			return left.authority_rank - right.authority_rank;
		}

		return right.score - left.score || (left.path ?? left.name ?? '').localeCompare(right.path ?? right.name ?? '');
	});
	const limited = sorted.slice(0, limit);

	if (scope !== 'all' || limited.some((item) => item.kind === 'source_anchor')) {
		return limited;
	}

	const sourceAnchor = sorted.find((item) => item.kind === 'source_anchor');
	if (!sourceAnchor) {
		return limited;
	}

	if (limited.length < limit) {
		return [...limited, sourceAnchor];
	}

	return [...limited.slice(0, Math.max(0, limit - 1)), sourceAnchor];
}

function collectBoundedDirectSearchDocuments(projectRoot: string): IndexDocument[] {
	const documents: IndexDocument[] = [];
	const relativePaths = getExistingIndexablePaths(projectRoot).slice(0, DIRECT_SEARCH_MAX_WORKFLOW_FILES);

	for (const relativePath of relativePaths) {
		try {
			documents.push(...collectDocumentsFromPaths(projectRoot, [relativePath]));
		} catch {
			continue;
		}
	}

	return documents;
}

function searchLocalWorkflowFilesDirectly(
	projectRoot: string,
	databasePath: string,
	normalizedQuery: string,
	limit: number,
	scope: LocalSearchScope,
): LocalSearchResult {
	const cacheLayers = readCacheLayerSets(projectRoot);
	const results: LocalSearchItem[] = [];

	if (scope === 'workflow' || scope === 'all') {
		const documents = collectBoundedDirectSearchDocuments(projectRoot);

		for (const document of documents) {
			let searchableContent = document.contentSnippet;

			try {
				searchableContent = readText(projectRoot, document.path);
			} catch {
				searchableContent = document.contentSnippet;
			}

			const primaryFields = [document.path, document.title];
			const secondaryFields = [document.type, searchableContent, ...document.sections];
			const fields = [...primaryFields, ...secondaryFields];

			if (!isMatched(fields, normalizedQuery)) {
				continue;
			}

			results.push(
				withCacheHint(
					{
						kind: 'document',
						path: document.path,
						title: document.title,
						document_type: document.type,
						...workflowAuthorityForDocument(document.type),
						match: getMatchSnippet(fields, normalizedQuery),
						score: scoreMatch(primaryFields, secondaryFields, normalizedQuery),
					},
					cacheLayers,
				),
			);
		}

		for (const skill of collectSkills(documents)) {
			const fields = [skill.name, skill.path, skill.title];

			if (!isMatched(fields, normalizedQuery)) {
				continue;
			}

			results.push(
				withCacheHint(
					{
						kind: 'skill',
						name: skill.name,
						path: skill.path,
						title: skill.title,
						...skillAuthority(),
						match: getMatchSnippet(fields, normalizedQuery),
						score: scoreMatch(fields, [], normalizedQuery),
					},
					cacheLayers,
				),
			);
		}
	}

	const sortedResults = sortLocalSearchResults(results, scope, limit);

	return {
		schema_version: LOCAL_INDEX_SCHEMA_VERSION,
		command: 'search',
		ok: true,
		mustflow_root: path.resolve(projectRoot),
		database_path: databasePath,
		query: normalizedQuery,
		limit,
		scope,
		index_fresh: false,
		stale_paths: [],
		search_backend: SEARCH_BACKEND_TABLE_SCAN,
		search_fts5_available: false,
		result_count: sortedResults.length,
		results: sortedResults,
	};
}

/**
 * mf:anchor cli.search.local-index
 * purpose: Search the local index while preserving workflow authority above source navigation hints.
 * search: mf search, scope workflow source all, authority rank, navigation only
 * invariant: Source anchor results remain navigation-only and cannot outrank command or workflow authority.
 * risk: cache, config
 */
export async function searchLocalIndex(projectRoot: string, query: string, options: LocalSearchOptions = {}): Promise<LocalSearchResult> {
	const normalizedQuery = normalizeSearchText(query);
	const limit = Math.max(1, Math.min(options.limit ?? 10, 50));
	const scope = options.scope ?? 'workflow';
	const databasePath = getLocalIndexDatabasePath(projectRoot);

	if (normalizedQuery.length === 0) {
		throw new Error('Search query must not be empty.');
	}

	if (!existsSync(databasePath)) {
		return searchLocalWorkflowFilesDirectly(projectRoot, databasePath, normalizedQuery, limit, scope);
	}

	let database: SqlJsDatabase;

	try {
		const SQL = await loadSqlJs();
		database = new SQL.Database(readFileSync(databasePath));
	} catch {
		return searchLocalWorkflowFilesDirectly(projectRoot, databasePath, normalizedQuery, limit, scope);
	}

	let capabilities = searchCapabilities(false);
	const results: LocalSearchItem[] = [];

	try {
		const cacheLayers = readCacheLayerSets(projectRoot);
		const stalePaths = getStalePaths(projectRoot, database);
		capabilities = readStoredSearchCapabilities(database);
		const indexedMatches = getIndexedSearchMatches(database, normalizedQuery);

		if (stalePaths.length > 0) {
			throw new Error(
				`Local mustflow index is stale: ${stalePaths.join(', ')}. Run \`mf index\` before searching. Refresh command: mf index`,
			);
		}

		if (scope === 'workflow' || scope === 'all') {
			for (const row of queryCandidateRows(
				database,
				'SELECT path, type, title, content_snippet FROM documents',
				'path',
				indexedMatches.documents,
				indexedMatches,
			)) {
				const pathValue = toSearchString(row.path);
				const typeValue = toSearchString(row.type);
				const title = toSearchString(row.title);
				const contentSnippet = toSearchString(row.content_snippet);
				const sectionHeadings = getSectionHeadings(database, pathValue);
				const documentTerms = getDocumentTerms(database, pathValue);
				const primaryFields = [pathValue, title];
				const secondaryFields = [typeValue, contentSnippet, ...sectionHeadings, ...documentTerms];
				const fields = [...primaryFields, ...secondaryFields];

				if (!matchesIndexedOrTableScan(fields, normalizedQuery, indexedMatches, indexedMatches.documents, pathValue)) {
					continue;
				}

				results.push(
					withCacheHint(
						{
							kind: 'document',
							path: pathValue,
							title,
							document_type: typeValue,
							...workflowAuthorityForDocument(typeValue),
							match: getMatchSnippet(fields, normalizedQuery),
							score: scoreIndexedOrTableScan(
								primaryFields,
								secondaryFields,
								normalizedQuery,
								indexedMatches,
								indexedMatches.documents,
								pathValue,
							),
						},
						cacheLayers,
					),
				);
			}

			for (const row of queryCandidateRows(
				database,
				'SELECT name, path, title FROM skills',
				'name',
				indexedMatches.skills,
				indexedMatches,
			)) {
				const name = toSearchString(row.name);
				const pathValue = toSearchString(row.path);
				const title = toSearchString(row.title);
				const fields = [name, pathValue, title];

				if (!matchesIndexedOrTableScan(fields, normalizedQuery, indexedMatches, indexedMatches.skills, name)) {
					continue;
				}

				results.push(
					withCacheHint(
						{
							kind: 'skill',
							name,
							path: pathValue,
							title,
							...skillAuthority(),
							match: getMatchSnippet(fields, normalizedQuery),
							score: scoreIndexedOrTableScan(
								[name, pathValue, title],
								[],
								normalizedQuery,
								indexedMatches,
								indexedMatches.skills,
								name,
							),
						},
						cacheLayers,
					),
				);
			}

			const matchedSkillRouteNames = new Set([...indexedMatches.skillRoutes].map((routeKey) => routeKey.split('\u0000')[0] ?? ''));

			for (const row of queryCandidateRows(
				database,
				'SELECT skill_name, skill_path, trigger, required_input, edit_scope, risk, verification_intents, expected_output FROM skill_routes',
				'skill_name',
				matchedSkillRouteNames,
				indexedMatches,
			)) {
				const name = toSearchString(row.skill_name);
				const pathValue = toSearchString(row.skill_path);
				const trigger = toSearchString(row.trigger);
				const requiredInput = toSearchString(row.required_input);
				const editScope = toSearchString(row.edit_scope);
				const risk = toSearchString(row.risk);
				const verificationIntents = splitVerificationIntents(toSearchString(row.verification_intents));
				const expectedOutput = toSearchString(row.expected_output);
				const primaryFields = [name, trigger];
				const secondaryFields = [pathValue, requiredInput, editScope, risk, expectedOutput];
				const fields = [...primaryFields, ...secondaryFields];
				const routeKey = skillRouteKey({ skillName: name, trigger });
				const indexedRouteMatch = indexedMatches.active && indexedMatches.skillRoutes.has(routeKey);

				if (!indexedRouteMatch && !isMatched(fields, normalizedQuery)) {
					continue;
				}

				results.push(
					withCacheHint(
						{
							kind: 'skill_route',
							name,
							path: pathValue,
							title: name,
							route_trigger: trigger,
							route_risk: risk,
							verification_intents: verificationIntents,
							...skillAuthority(),
							match: getMatchSnippet(fields, normalizedQuery),
							score: indexedRouteMatch
								? Math.max(scoreMatch(primaryFields, secondaryFields, normalizedQuery), 20)
								: scoreMatch(primaryFields, secondaryFields, normalizedQuery),
						},
						cacheLayers,
					),
				);
			}

			const commandRows = queryCandidateRows(
				database,
				'SELECT name, status, lifecycle, run_policy, description FROM command_intents',
				'name',
				indexedMatches.commandIntents,
				indexedMatches,
			);
			const effectsByIntent = getCommandEffectsByIntent(
				database,
				commandRows.map((row) => toSearchString(row.name)),
			);

			for (const row of commandRows) {
				const name = toSearchString(row.name);
				const status = toSearchString(row.status);
				const lifecycle = toSearchString(row.lifecycle);
				const runPolicy = toSearchString(row.run_policy);
				const description = toSearchString(row.description);
				const effects = effectsByIntent.get(name) ?? [];
				const effectLocks = [...new Set(effects.map((effect) => effect.lock))].sort((left, right) =>
					left.localeCompare(right),
				);
				const effectPaths = [
					...new Set(effects.map((effect) => effect.path).filter((effectPath): effectPath is string => effectPath !== null)),
				].sort((left, right) => left.localeCompare(right));
				const effectModes = [...new Set(effects.map((effect) => effect.mode))].sort((left, right) =>
					left.localeCompare(right),
				);
				const primaryFields = [name];
				const secondaryFields = [status, lifecycle, runPolicy, description, ...effectLocks, ...effectPaths, ...effectModes];
				const fields = [...primaryFields, ...secondaryFields];

				if (!matchesIndexedOrTableScan(fields, normalizedQuery, indexedMatches, indexedMatches.commandIntents, name)) {
					continue;
				}

				results.push(
					withCacheHint(
						{
							kind: 'command_intent',
							name,
							title: description || name,
							effect_locks: effectLocks,
							effect_paths: effectPaths,
							effect_modes: effectModes,
							...commandIntentAuthority(),
							match: getMatchSnippet(fields, normalizedQuery),
							score: scoreIndexedOrTableScan(
								primaryFields,
								secondaryFields,
								normalizedQuery,
								indexedMatches,
								indexedMatches.commandIntents,
								name,
							),
						},
						cacheLayers,
					),
				);
			}
		}

		if (scope === 'source' || scope === 'all') {
			for (const row of queryCandidateRows(
				database,
				'SELECT source_anchors.id, path, line_start, purpose, search_terms, invariant, risk, source_anchors.navigation_only, source_anchors.can_instruct_agent, status, confidence FROM source_anchors LEFT JOIN source_anchor_status ON source_anchor_status.anchor_id = source_anchors.id',
				'source_anchors.id',
				indexedMatches.sourceAnchors,
				indexedMatches,
			)) {
				const id = toSearchString(row.id);
				const pathValue = toSearchString(row.path);
				const purpose = toSearchString(row.purpose);
				const searchTerms = toSearchString(row.search_terms);
				const invariant = toSearchString(row.invariant);
				const risk = toSearchString(row.risk);
				const primaryFields = [id, pathValue];
				const secondaryFields = [purpose, searchTerms, invariant, risk];
				const fields = [...primaryFields, ...secondaryFields];

				if (!matchesIndexedOrTableScan(fields, normalizedQuery, indexedMatches, indexedMatches.sourceAnchors, id)) {
					continue;
				}

				results.push(
					withCacheHint(
						{
							kind: 'source_anchor',
							anchor_id: id,
							name: id,
							path: pathValue,
							line_start: Number(row.line_start),
							title: purpose || id,
							risk,
							...sourceAnchorAuthority(),
							stale_status: toSearchString(row.status) as SourceAnchorStatus,
							stale_confidence: Number(row.confidence),
							match: getMatchSnippet(fields, normalizedQuery),
							score: scoreIndexedOrTableScan(
								primaryFields,
								secondaryFields,
								normalizedQuery,
								indexedMatches,
								indexedMatches.sourceAnchors,
								id,
							),
						},
						cacheLayers,
					),
				);
			}
		}
	} catch (error) {
		if (isLocalIndexStaleError(error)) {
			throw error;
		}

		if (isLocalIndexRuntimeUnavailableError(error)) {
			return searchLocalWorkflowFilesDirectly(projectRoot, databasePath, normalizedQuery, limit, scope);
		}

		throw error;
	} finally {
		database.close();
	}

	const sortedResults = sortLocalSearchResults(results, scope, limit);

	return {
		schema_version: LOCAL_INDEX_SCHEMA_VERSION,
		command: 'search',
		ok: true,
		mustflow_root: path.resolve(projectRoot),
		database_path: databasePath,
		query: normalizedQuery,
		limit,
		scope,
		index_fresh: true,
		stale_paths: [],
		search_backend: capabilities.backend,
		search_fts5_available: capabilities.fts5Available,
		result_count: sortedResults.length,
		results: sortedResults,
	};
}
