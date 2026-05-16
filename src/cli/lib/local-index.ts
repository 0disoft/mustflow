import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { createHash } from 'node:crypto';
import path from 'node:path';

import { isRecord, readCommandContract, readString, readStringArray, type TomlTable } from './command-contract.js';
import { listFilesRecursive, toPosixPath } from './filesystem.js';
import { readTomlFile } from './toml.js';
import {
	collectSourceAnchorIndexRecords,
	type SourceAnchorIndexRecord,
	type SourceAnchorSnapshot,
	type SourceAnchorStatus,
	type SourceAnchorSymbol,
} from '../../core/source-anchor-status.js';
import { normalizeCommandEffects, type NormalizedCommandEffect } from '../../core/command-effects.js';
import { listChangeClassificationRuleDescriptors } from '../../core/change-classification.js';

const LOCAL_INDEX_SCHEMA_VERSION = '13';
const LOCAL_INDEX_PARSER_VERSION = '1';
const DEFAULT_DATABASE_RELATIVE_PATH = '.mustflow/cache/mustflow.sqlite';
const LOCAL_INDEX_CONTENT_MODE = 'metadata_and_snippets';
const LOCAL_INDEX_STORE_FULL_CONTENT = false;
const MAX_SNIPPET_BYTES_PER_DOCUMENT = 2048;
const MAX_SEARCH_MATCH_SNIPPET_CHARS = 240;
const SEARCH_MATCH_CONTEXT_BEFORE_CHARS = 48;
const SEARCH_MATCH_CONTEXT_AFTER_CHARS = 96;
const SEARCH_MATCH_TRUNCATION_MARKER = '...';
const SEARCH_NGRAM_MIN_LENGTH = 2;
const SEARCH_NGRAM_MAX_LENGTH = 3;
const SEARCH_BACKEND_FTS5 = 'fts5';
const SEARCH_BACKEND_TABLE_SCAN = 'table_scan';
const TEST_DISABLE_FTS5_ENV = 'MUSTFLOW_TEST_DISABLE_FTS5';
const MUSTFLOW_RELATIVE_PATH = '.mustflow/config/mustflow.toml';
const INDEX_CONFIG_RELATIVE_PATH = '.mustflow/config/index.toml';
const DEFAULT_PROMPT_CACHE_STABLE_READ = [
	'AGENTS.md',
	'.mustflow/docs/agent-workflow.md',
	'.mustflow/config/mustflow.toml',
	'.mustflow/config/commands.toml',
	'.mustflow/skills/INDEX.md',
] as const;
const DEFAULT_PROMPT_CACHE_TASK_SOURCES = [
	'.mustflow/context/INDEX.md',
	'REPO_MAP.md',
	'matching_skill',
	'relevant_source_files',
] as const;
const DEFAULT_PROMPT_CACHE_VOLATILE_SOURCES = [
	'.mustflow/state/runs/latest.json',
	'changed_files',
	'command_output_tail',
	'current_user_task',
] as const;

type SqlValue = number | string | Uint8Array | null;

interface SqlJsDatabase {
	run(sql: string, params?: SqlValue[] | Record<string, SqlValue> | null): SqlJsDatabase;
	exec(sql: string, params?: SqlValue[]): SqlJsQueryResult[];
	export(): Uint8Array;
	close(): void;
}

interface SqlJsStatic {
	readonly Database: new (data?: Uint8Array) => SqlJsDatabase;
}

type InitSqlJs = (config?: { locateFile?: (fileName: string) => string }) => Promise<SqlJsStatic>;

interface SqlJsQueryResult {
	readonly columns: readonly string[];
	readonly values: readonly (readonly SqlValue[])[];
}

export interface LocalIndexOptions {
	readonly dryRun?: boolean;
	readonly includeSource?: boolean;
	readonly incremental?: boolean;
}

interface IndexDocument {
	readonly path: string;
	readonly type: string;
	readonly title: string;
	readonly locale: string | null;
	readonly revision: number | null;
	readonly contentHash: string;
	readonly contentSnippet: string;
	readonly sections: readonly string[];
}

interface IndexSkill {
	readonly name: string;
	readonly path: string;
	readonly title: string;
}

interface IndexSkillRoute {
	readonly skillName: string;
	readonly skillPath: string;
	readonly trigger: string;
	readonly requiredInput: string;
	readonly editScope: string;
	readonly risk: string;
	readonly verificationIntents: readonly string[];
	readonly expectedOutput: string;
}

interface IndexCommandIntent {
	readonly name: string;
	readonly status: string;
	readonly lifecycle: string | null;
	readonly runPolicy: string | null;
	readonly description: string | null;
	readonly effects: readonly NormalizedCommandEffect[];
}

interface IndexedFileRecord {
	readonly path: string;
	readonly sourceScope: 'workflow' | 'source_anchor';
	readonly sizeBytes: number;
	readonly mtimeMs: number;
	readonly contentHash: string;
}

interface LocalIndexSourceConfig {
	readonly enabledByDefault: boolean;
	readonly include: readonly string[];
	readonly exclude: readonly string[];
	readonly maxFileBytes: number | null;
	readonly allowedExtensions: readonly string[];
}

export interface LocalIndexResult {
	readonly schema_version: string;
	readonly command: 'index';
	readonly ok: boolean;
	readonly mustflow_root: string;
	readonly database_path: string;
	readonly dry_run: boolean;
	readonly wrote_files: boolean;
	readonly index_mode: 'full' | 'incremental';
	readonly reused_existing: boolean;
	readonly rebuild_reason: string | null;
	readonly document_count: number;
	readonly skill_count: number;
	readonly skill_route_count: number;
	readonly command_intent_count: number;
	readonly command_effect_count: number;
	readonly source_index_enabled: boolean;
	readonly source_anchor_count: number;
	readonly search_backend: SearchBackendKind;
	readonly search_fts5_available: boolean;
	readonly content_mode: typeof LOCAL_INDEX_CONTENT_MODE;
	readonly store_full_content: typeof LOCAL_INDEX_STORE_FULL_CONTENT;
	readonly max_snippet_bytes_per_document: typeof MAX_SNIPPET_BYTES_PER_DOCUMENT;
	readonly indexed_file_count: number;
	readonly indexed_paths: readonly string[];
}

export interface LocalSearchOptions {
	readonly limit?: number;
	readonly scope?: LocalSearchScope;
}

type CacheLayer = 'stable' | 'task' | 'volatile';
export type LocalSearchScope = 'workflow' | 'source' | 'all';
type SearchSourceScope = 'workflow' | 'source';
type SearchBackendKind = typeof SEARCH_BACKEND_FTS5 | typeof SEARCH_BACKEND_TABLE_SCAN;
type SearchNgramTargetKind = 'document' | 'skill' | 'skill_route' | 'command_intent' | 'source_anchor';

export interface LocalSearchItem {
	readonly kind: 'document' | 'skill' | 'skill_route' | 'command_intent' | 'source_anchor';
	readonly path?: string;
	readonly name?: string;
	readonly title?: string;
	readonly document_type?: string;
	readonly anchor_id?: string;
	readonly line_start?: number;
	readonly risk?: string;
	readonly cache_layer: CacheLayer;
	readonly volatile: boolean;
	readonly authority_rank: number;
	readonly authority_label: string;
	readonly source_scope: SearchSourceScope;
	readonly navigation_only: boolean;
	readonly can_instruct_agent: boolean;
	readonly stale_status?: SourceAnchorStatus;
	readonly stale_confidence?: number;
	readonly effect_locks?: readonly string[];
	readonly effect_paths?: readonly string[];
	readonly effect_modes?: readonly string[];
	readonly route_trigger?: string;
	readonly route_risk?: string;
	readonly verification_intents?: readonly string[];
	readonly match: string;
	readonly score: number;
}

export interface LocalSearchResult {
	readonly schema_version: string;
	readonly command: 'search';
	readonly ok: boolean;
	readonly mustflow_root: string;
	readonly database_path: string;
	readonly query: string;
	readonly limit: number;
	readonly scope: LocalSearchScope;
	readonly index_fresh: boolean;
	readonly stale_paths: readonly string[];
	readonly search_backend: SearchBackendKind;
	readonly search_fts5_available: boolean;
	readonly result_count: number;
	readonly results: readonly LocalSearchItem[];
}

export type LocalCommandEffectGraphStatus = 'fresh' | 'missing' | 'stale' | 'unreadable';
export type LocalPathSurfaceReadModelStatus = 'fresh' | 'missing' | 'stale' | 'unreadable';
export type LocalIndexPromptContextStatus = 'fresh' | 'missing' | 'stale' | 'unreadable';

export interface LocalCommandWriteLock {
	readonly lock: string;
	readonly paths: readonly string[];
	readonly modes: readonly string[];
	readonly sources: readonly string[];
	readonly concurrencies: readonly string[];
	readonly effectCount: number;
}

export interface LocalCommandLockConflict {
	readonly intent: string;
	readonly lock: string;
	readonly paths: readonly string[];
	readonly modes: readonly string[];
	readonly concurrencies: readonly string[];
	readonly conflictingPaths: readonly string[];
	readonly conflictingModes: readonly string[];
	readonly conflictingConcurrencies: readonly string[];
}

export interface LocalCommandEffectGraph {
	readonly source: 'local_index';
	readonly authority: 'explanation_only';
	readonly commandAuthority: '.mustflow/config/commands.toml';
	readonly grantsCommandAuthority: false;
	readonly status: LocalCommandEffectGraphStatus;
	readonly databasePath: string;
	readonly indexFresh: boolean;
	readonly stalePaths: readonly string[];
	readonly writeLocks: readonly LocalCommandWriteLock[];
	readonly lockConflicts: readonly LocalCommandLockConflict[];
	readonly refreshHint: string | null;
}

export interface LocalPathSurfaceRuleMatch {
	readonly ruleId: string;
	readonly patternKind: string;
	readonly pattern: string;
	readonly patternFlags: string;
	readonly changeKinds: readonly string[];
	readonly surface: {
		readonly kind: string;
		readonly category: string;
		readonly isPublicSurface: boolean;
		readonly validationReasons: readonly string[];
		readonly affectedContracts: readonly string[];
		readonly updatePolicy: string;
		readonly driftChecks: readonly string[];
	};
}

export interface LocalPathSurfaceReadModel {
	readonly source: 'local_index';
	readonly status: LocalPathSurfaceReadModelStatus;
	readonly databasePath: string;
	readonly indexFresh: boolean;
	readonly stalePaths: readonly string[];
	readonly inputPath: string | null;
	readonly match: LocalPathSurfaceRuleMatch | null;
	readonly refreshHint: string | null;
}

export interface LocalIndexPromptContext {
	readonly source: 'local_index';
	readonly status: LocalIndexPromptContextStatus;
	readonly databasePath: string;
	readonly indexFresh: boolean;
	readonly stalePaths: readonly string[];
	readonly searchBackend: SearchBackendKind | null;
	readonly searchFts5Available: boolean | null;
	readonly refreshHint: string | null;
}

export function getLocalIndexDatabasePath(projectRoot: string): string {
	return path.join(projectRoot, ...DEFAULT_DATABASE_RELATIVE_PATH.split('/'));
}

function getExistingIndexablePaths(projectRoot: string): string[] {
	const paths = new Set<string>();
	const addIfExists = (relativePath: string) => {
		if (existsSync(path.join(projectRoot, ...relativePath.split('/')))) {
			paths.add(relativePath);
		}
	};

	addIfExists('AGENTS.md');

	for (const relativePath of listFilesRecursive(path.join(projectRoot, '.mustflow', 'docs'))) {
		if (relativePath.endsWith('.md')) {
			paths.add(toPosixPath(path.join('.mustflow', 'docs', relativePath)));
		}
	}

	for (const relativePath of listFilesRecursive(path.join(projectRoot, '.mustflow', 'context'))) {
		if (relativePath.endsWith('.md')) {
			paths.add(toPosixPath(path.join('.mustflow', 'context', relativePath)));
		}
	}

	for (const relativePath of listFilesRecursive(path.join(projectRoot, '.mustflow', 'skills'))) {
		if (relativePath === 'INDEX.md' || relativePath.endsWith('/SKILL.md')) {
			paths.add(toPosixPath(path.join('.mustflow', 'skills', relativePath)));
		}
	}

	for (const relativePath of listFilesRecursive(path.join(projectRoot, '.mustflow', 'config'))) {
		if (relativePath.endsWith('.toml')) {
			paths.add(toPosixPath(path.join('.mustflow', 'config', relativePath)));
		}
	}

	return Array.from(paths).sort((left, right) => left.localeCompare(right));
}

function readText(projectRoot: string, relativePath: string): string {
	return readFileSync(path.join(projectRoot, ...relativePath.split('/')), 'utf8');
}

function readMustflowToml(projectRoot: string): TomlTable | undefined {
	const mustflowPath = path.join(projectRoot, ...MUSTFLOW_RELATIVE_PATH.split('/'));

	if (!existsSync(mustflowPath)) {
		return undefined;
	}

	const parsed = readTomlFile(mustflowPath);
	return isRecord(parsed) ? parsed : undefined;
}

function readIndexToml(projectRoot: string): TomlTable | undefined {
	const indexConfigPath = path.join(projectRoot, ...INDEX_CONFIG_RELATIVE_PATH.split('/'));

	if (!existsSync(indexConfigPath)) {
		return undefined;
	}

	const parsed = readTomlFile(indexConfigPath);
	return isRecord(parsed) ? parsed : undefined;
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

function readBoolean(table: TomlTable | undefined, key: string): boolean | undefined {
	const value = table?.[key];
	return typeof value === 'boolean' ? value : undefined;
}

function readPositiveInteger(table: TomlTable | undefined, key: string): number | null {
	const value = table?.[key];

	if (typeof value !== 'number' || !Number.isInteger(value) || value <= 0) {
		return null;
	}

	return value;
}

function readLocalIndexSourceConfig(projectRoot: string): LocalIndexSourceConfig {
	const sourceIndexTable = readNestedTable(readIndexToml(projectRoot), 'source_index');

	return {
		enabledByDefault: readBoolean(sourceIndexTable, 'enabled_by_default') === true,
		include: readOptionalStringArray(sourceIndexTable, 'include') ?? [],
		exclude: readOptionalStringArray(sourceIndexTable, 'exclude') ?? [],
		maxFileBytes: readPositiveInteger(sourceIndexTable, 'max_file_bytes'),
		allowedExtensions: readOptionalStringArray(sourceIndexTable, 'allowed_extensions') ?? [],
	};
}

function sha256Text(content: string): string {
	return `sha256:${createHash('sha256').update(content).digest('hex')}`;
}

function sha256Bytes(content: Uint8Array): string {
	return `sha256:${createHash('sha256').update(content).digest('hex')}`;
}

function getSourceScopeHash(includeSource: boolean, sourceConfig: LocalIndexSourceConfig): string {
	return sha256Text(
		JSON.stringify({
			includeSource,
			sourceConfig,
		}),
	);
}

function getDocumentType(relativePath: string): string {
	if (relativePath === 'AGENTS.md') {
		return 'agent_rules';
	}

	if (relativePath.startsWith('.mustflow/config/')) {
		return 'config';
	}

	if (relativePath === '.mustflow/skills/INDEX.md') {
		return 'skill_index';
	}

	if (relativePath === '.mustflow/context/INDEX.md') {
		return 'context_index';
	}

	if (relativePath.startsWith('.mustflow/context/')) {
		return 'context';
	}

	if (relativePath.endsWith('/SKILL.md')) {
		return 'skill';
	}

	if (relativePath.startsWith('.mustflow/docs/')) {
		return 'workflow_doc';
	}

	return 'document';
}

function parseFrontmatter(content: string): Record<string, string> {
	if (!content.startsWith('---')) {
		return {};
	}

	const end = content.indexOf('\n---', 3);

	if (end === -1) {
		return {};
	}

	const result: Record<string, string> = {};
	const rawFrontmatter = content.slice(3, end);

	for (const line of rawFrontmatter.split(/\r?\n/)) {
		const separatorIndex = line.indexOf(':');

		if (separatorIndex === -1) {
			continue;
		}

		const key = line.slice(0, separatorIndex).trim();
		const value = line.slice(separatorIndex + 1).trim();

		if (key.length > 0 && value.length > 0) {
			result[key] = value;
		}
	}

	return result;
}

function getTitle(relativePath: string, content: string): string {
	const heading = content.match(/^#\s+(.+)$/mu)?.[1]?.trim();
	return heading && heading.length > 0 ? heading : path.posix.basename(relativePath);
}

function getSections(content: string): string[] {
	return [...content.matchAll(/^##\s+(.+)$/gmu)].map((match) => match[1]?.trim()).filter((value): value is string => Boolean(value));
}

function truncateUtf8(value: string, maxBytes: number): string {
	const buffer = Buffer.from(value, 'utf8');

	if (buffer.byteLength <= maxBytes) {
		return value;
	}

	return buffer.subarray(0, maxBytes).toString('utf8').replace(/\uFFFD$/u, '');
}

function collectDocuments(projectRoot: string): IndexDocument[] {
	return getExistingIndexablePaths(projectRoot).map((relativePath) => {
		const content = readText(projectRoot, relativePath);
		const frontmatter = parseFrontmatter(content);
		const revision = Number.parseInt(frontmatter.revision ?? '', 10);

		return {
			path: relativePath,
			type: getDocumentType(relativePath),
			title: getTitle(relativePath, content),
			locale: frontmatter.locale ?? null,
			revision: Number.isInteger(revision) ? revision : null,
			contentHash: sha256Text(content),
			contentSnippet: truncateUtf8(content, MAX_SNIPPET_BYTES_PER_DOCUMENT),
			sections: getSections(content),
		};
	});
}

function collectSkills(documents: readonly IndexDocument[]): IndexSkill[] {
	return documents
		.filter((document) => document.type === 'skill')
		.map((document) => ({
			name: document.path.split('/').at(-2) ?? document.title,
			path: document.path,
			title: document.title,
		}))
		.sort((left, right) => left.name.localeCompare(right.name));
}

function normalizeMarkdownCell(value: string): string {
	return value
		.replace(/<br\s*\/?>/giu, ' ')
		.replace(/`([^`]+)`/gu, '$1')
		.replace(/\s+/gu, ' ')
		.trim();
}

function parseMarkdownTableRow(line: string): string[] {
	return line
		.trim()
		.replace(/^\|/u, '')
		.replace(/\|$/u, '')
		.split('|')
		.map((cell) => normalizeMarkdownCell(cell));
}

function isMarkdownSeparatorRow(cells: readonly string[]): boolean {
	return cells.length > 0 && cells.every((cell) => /^:?-{3,}:?$/u.test(cell));
}

function skillNameFromPath(skillPath: string): string {
	return skillPath.split('/').at(-2) ?? path.posix.basename(skillPath, '.md');
}

function splitVerificationIntents(value: string): string[] {
	return value
		.split(',')
		.map((item) => item.trim())
		.filter(Boolean)
		.sort((left, right) => left.localeCompare(right));
}

function collectSkillRoutes(projectRoot: string): IndexSkillRoute[] {
	const indexPath = path.join(projectRoot, '.mustflow', 'skills', 'INDEX.md');

	if (!existsSync(indexPath)) {
		return [];
	}

	const content = readFileSync(indexPath, 'utf8');
	const routes: IndexSkillRoute[] = [];
	let inRouteTable = false;

	for (const line of content.split(/\r?\n/u)) {
		if (!line.trim().startsWith('|')) {
			if (inRouteTable && line.trim() === '') {
				break;
			}

			continue;
		}

		const cells = parseMarkdownTableRow(line);

		if (cells.includes('Skill Document') && cells.includes('Trigger')) {
			inRouteTable = true;
			continue;
		}

		if (!inRouteTable || isMarkdownSeparatorRow(cells) || cells.length < 7) {
			continue;
		}

		const [trigger, skillPath, requiredInput, editScope, risk, verificationIntents, expectedOutput] = cells;

		if (!skillPath?.startsWith('.mustflow/skills/') || !skillPath.endsWith('/SKILL.md')) {
			continue;
		}

		routes.push({
			skillName: skillNameFromPath(skillPath),
			skillPath,
			trigger: trigger ?? '',
			requiredInput: requiredInput ?? '',
			editScope: editScope ?? '',
			risk: risk ?? '',
			verificationIntents: splitVerificationIntents(verificationIntents ?? ''),
			expectedOutput: expectedOutput ?? '',
		});
	}

	return routes.sort((left, right) => {
		const skillOrder = left.skillName.localeCompare(right.skillName);
		return skillOrder === 0 ? left.trigger.localeCompare(right.trigger) : skillOrder;
	});
}

function collectCommandIntents(projectRoot: string): IndexCommandIntent[] {
	if (!existsSync(path.join(projectRoot, '.mustflow', 'config', 'commands.toml'))) {
		return [];
	}

	const contract = readCommandContract(projectRoot);
	const intents: IndexCommandIntent[] = [];

	for (const [name, intent] of Object.entries(contract.intents).sort(([left], [right]) => left.localeCompare(right))) {
		if (!isRecord(intent)) {
			continue;
		}

		intents.push({
			name,
			status: readString(intent, 'status') ?? 'unknown',
			lifecycle: readString(intent, 'lifecycle') ?? null,
			runPolicy: readString(intent, 'run_policy') ?? null,
			description: readString(intent, 'description') ?? null,
			effects: normalizeCommandEffects(projectRoot, contract, name),
		});
	}

	return intents;
}

function readIndexedFileRecord(
	projectRoot: string,
	relativePath: string,
	sourceScope: IndexedFileRecord['sourceScope'],
	contentHash: string | null = null,
): IndexedFileRecord {
	const fullPath = path.join(projectRoot, ...relativePath.split('/'));
	const stats = statSync(fullPath);

	return {
		path: relativePath,
		sourceScope,
		sizeBytes: stats.size,
		mtimeMs: Math.round(stats.mtimeMs),
		contentHash: contentHash ?? sha256Bytes(readFileSync(fullPath)),
	};
}

function collectIndexedFileRecords(
	projectRoot: string,
	documents: readonly IndexDocument[],
	sourceAnchors: readonly SourceAnchorIndexRecord[],
): IndexedFileRecord[] {
	const records = new Map<string, IndexedFileRecord>();

	for (const document of documents) {
		records.set(document.path, readIndexedFileRecord(projectRoot, document.path, 'workflow', document.contentHash));
	}

	for (const anchorPath of [...new Set(sourceAnchors.map((anchor) => anchor.path))].sort((left, right) => left.localeCompare(right))) {
		if (!records.has(anchorPath)) {
			records.set(anchorPath, readIndexedFileRecord(projectRoot, anchorPath, 'source_anchor'));
		}
	}

	return [...records.values()].sort((left, right) => left.path.localeCompare(right.path));
}

async function loadSqlJs(): Promise<SqlJsStatic> {
	const require = createRequire(import.meta.url);
	const wasmPath = require.resolve('sql.js/dist/sql-wasm.wasm');
	const sqlJsModule = (await import('sql.js')) as { default?: InitSqlJs } | InitSqlJs;
	const initSqlJs = typeof sqlJsModule === 'function' ? sqlJsModule : sqlJsModule.default;

	if (!initSqlJs) {
		throw new Error('Unable to load sql.js');
	}

	return initSqlJs({
		locateFile(fileName) {
			return fileName.endsWith('.wasm') ? wasmPath : fileName;
		},
	});
}

function normalizeSearchText(value: string): string {
	return value.trim().replace(/\s+/g, ' ');
}

function normalizeSearchTokenText(value: string): string {
	return normalizeSearchText(value).normalize('NFKC').toLowerCase();
}

function extractSearchTokens(value: string): string[] {
	return [...normalizeSearchTokenText(value).matchAll(/[\p{L}\p{N}]+/gu)]
		.map((match) => match[0])
		.filter((token): token is string => Boolean(token));
}

function buildSearchNgrams(values: readonly string[]): string[] {
	const grams = new Set<string>();

	for (const value of values) {
		for (const token of extractSearchTokens(value)) {
			const maxLength = Math.min(SEARCH_NGRAM_MAX_LENGTH, token.length);

			for (let length = SEARCH_NGRAM_MIN_LENGTH; length <= maxLength; length += 1) {
				for (let index = 0; index <= token.length - length; index += 1) {
					grams.add(token.slice(index, index + length));
				}
			}
		}
	}

	return [...grams].sort((left, right) => left.localeCompare(right));
}

function toSearchString(value: SqlValue | undefined): string {
	if (value === null || value === undefined) {
		return '';
	}

	if (value instanceof Uint8Array) {
		return '';
	}

	return String(value);
}

function queryRows(database: SqlJsDatabase, sql: string, params: SqlValue[] = []): Record<string, SqlValue>[] {
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

interface LocalSearchCapabilities {
	readonly backend: SearchBackendKind;
	readonly fts5Available: boolean;
}

function searchCapabilities(fts5Available: boolean): LocalSearchCapabilities {
	return {
		backend: fts5Available ? SEARCH_BACKEND_FTS5 : SEARCH_BACKEND_TABLE_SCAN,
		fts5Available,
	};
}

function detectLocalSearchCapabilities(database: SqlJsDatabase): LocalSearchCapabilities {
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

function readMetadataValue(database: SqlJsDatabase, key: string): string | undefined {
	return toSearchString(queryRows(database, 'SELECT value FROM metadata WHERE key = ?', [key])[0]?.value) || undefined;
}

function hasTable(database: SqlJsDatabase, tableName: string): boolean {
	return queryRows(database, 'SELECT name FROM sqlite_master WHERE type = "table" AND name = ?', [tableName]).length > 0;
}

function readStoredSearchCapabilities(database: SqlJsDatabase): LocalSearchCapabilities {
	const fts5Available = readMetadataValue(database, 'search_fts5_available') === 'true';
	const backend = readMetadataValue(database, 'search_backend');

	if (backend === SEARCH_BACKEND_FTS5 && hasTable(database, 'search_documents_fts')) {
		return { backend: SEARCH_BACKEND_FTS5, fts5Available };
	}

	return { backend: SEARCH_BACKEND_TABLE_SCAN, fts5Available };
}

function toNullableNumber(value: SqlValue | undefined): number | null {
	if (typeof value !== 'number') {
		return null;
	}

	return Number.isFinite(value) ? value : null;
}

function splitIndexedList(value: SqlValue | undefined): string[] {
	return toSearchString(value)
		.split(',')
		.map((item) => item.trim())
		.filter(Boolean)
		.sort((left, right) => left.localeCompare(right));
}

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

async function readPreviousSourceAnchorSnapshots(databasePath: string): Promise<SourceAnchorSnapshot[]> {
	if (!existsSync(databasePath)) {
		return [];
	}

	const SQL = await loadSqlJs();
	const database = new SQL.Database(readFileSync(databasePath));

	try {
		const rows = queryRows(
			database,
			`
SELECT
  source_anchors.id,
  source_anchors.path,
  source_anchors.line_start,
  source_anchors.purpose,
  source_anchors.search_terms,
  source_anchors.invariant,
  source_anchors.risk,
  source_anchor_fingerprints.anchor_metadata_hash,
  source_anchor_fingerprints.anchor_text_hash,
  source_anchor_fingerprints.context_hash,
  source_anchor_fingerprints.search_terms_hash,
  source_anchor_fingerprints.invariant_hash,
  source_anchor_fingerprints.risk_hash,
  source_anchor_fingerprints.symbol_kind,
  source_anchor_fingerprints.symbol_name,
  source_anchor_fingerprints.symbol_exported,
  source_anchor_fingerprints.signature_hash,
  source_anchor_fingerprints.body_hash,
  source_anchor_fingerprints.symbol_start_line,
  source_anchor_fingerprints.symbol_end_line
FROM source_anchors
JOIN source_anchor_fingerprints ON source_anchor_fingerprints.anchor_id = source_anchors.id
`,
		);

		return rows.map((row) => {
			const symbol: SourceAnchorSymbol = {
				kind: toSearchString(row.symbol_kind) as SourceAnchorSymbol['kind'],
				name: toSearchString(row.symbol_name) || null,
				exported: Number(row.symbol_exported) === 1,
				signatureHash: toSearchString(row.signature_hash) || null,
				bodyHash: toSearchString(row.body_hash) || null,
				startLine: toNullableNumber(row.symbol_start_line),
				endLine: toNullableNumber(row.symbol_end_line),
			};

			return {
				id: toSearchString(row.id),
				path: toSearchString(row.path),
				lineStart: Number(row.line_start),
				purpose: toSearchString(row.purpose) || null,
				search: toSearchString(row.search_terms)
					.split(/[,;]/u)
					.map((value) => value.trim())
					.filter((value) => value.length > 0),
				invariant: toSearchString(row.invariant) || null,
				risk: toSearchString(row.risk)
					.split(/[,;]/u)
					.map((value) => value.trim())
					.filter((value) => value.length > 0),
				navigationOnly: true,
				canInstructAgent: false,
				fingerprint: {
					anchorMetadataHash: toSearchString(row.anchor_metadata_hash),
					anchorTextHash: toSearchString(row.anchor_text_hash),
					contextHash: toSearchString(row.context_hash),
					searchTermsHash: toSearchString(row.search_terms_hash) || null,
					invariantHash: toSearchString(row.invariant_hash) || null,
					riskHash: toSearchString(row.risk_hash),
					symbol,
				},
			};
		});
	} catch {
		return [];
	} finally {
		database.close();
	}
}

interface CacheLayerSets {
	readonly stable: ReadonlySet<string>;
	readonly task: ReadonlySet<string>;
	readonly volatile: ReadonlySet<string>;
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

function getMatchSnippet(fields: readonly string[], query: string): string {
	const normalized = normalizeSearchText(fields.join(' '));
	const lower = normalized.toLowerCase();
	let start = lower.indexOf(query.toLowerCase());
	let matchLength = query.length;

	if (start === -1) {
		const [firstGram] = buildSearchNgrams([query]).filter((gram) => lower.includes(gram));

		if (!firstGram) {
			return truncateSearchMatchSnippet(normalized);
		}

		start = lower.indexOf(firstGram);
		matchLength = firstGram.length;
	}

	const from = Math.max(0, start - SEARCH_MATCH_CONTEXT_BEFORE_CHARS);
	const to = Math.min(normalized.length, start + matchLength + SEARCH_MATCH_CONTEXT_AFTER_CHARS);
	const prefix = from > 0 ? SEARCH_MATCH_TRUNCATION_MARKER : '';
	const suffix = to < normalized.length ? SEARCH_MATCH_TRUNCATION_MARKER : '';

	return truncateSearchMatchSnippet(`${prefix}${normalized.slice(from, to)}${suffix}`);
}

function truncateSearchMatchSnippet(value: string): string {
	if (value.length <= MAX_SEARCH_MATCH_SNIPPET_CHARS) {
		return value;
	}

	return `${value.slice(0, MAX_SEARCH_MATCH_SNIPPET_CHARS - SEARCH_MATCH_TRUNCATION_MARKER.length)}${SEARCH_MATCH_TRUNCATION_MARKER}`;
}

function scoreMatch(primaryFields: readonly string[], secondaryFields: readonly string[], query: string): number {
	const lowerQuery = query.toLowerCase();

	if (primaryFields.some((field) => field.toLowerCase() === lowerQuery)) {
		return 100;
	}

	if (primaryFields.some((field) => field.toLowerCase().includes(lowerQuery))) {
		return 80;
	}

	if (secondaryFields.some((field) => field.toLowerCase().includes(lowerQuery))) {
		return 40;
	}

	return 0;
}

function isMatched(fields: readonly string[], query: string): boolean {
	const lowerQuery = query.toLowerCase();

	return fields.some((field) => field.toLowerCase().includes(lowerQuery));
}

function createSchema(database: SqlJsDatabase, capabilities: LocalSearchCapabilities): void {
	database.run(`
CREATE TABLE metadata (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

CREATE TABLE indexed_files (
  path TEXT PRIMARY KEY,
  source_scope TEXT NOT NULL,
  size_bytes INTEGER NOT NULL,
  mtime_ms INTEGER NOT NULL,
  content_hash TEXT NOT NULL,
  indexed_at TEXT NOT NULL,
  index_mode TEXT NOT NULL,
  parser_version TEXT NOT NULL
);

CREATE TABLE documents (
  path TEXT PRIMARY KEY,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  locale TEXT,
	revision INTEGER,
  content_hash TEXT NOT NULL,
  content_snippet TEXT NOT NULL
);

CREATE TABLE sections (
  document_path TEXT NOT NULL,
  ordinal INTEGER NOT NULL,
  heading TEXT NOT NULL,
  PRIMARY KEY (document_path, ordinal)
);

CREATE TABLE document_terms (
  document_path TEXT NOT NULL,
  term TEXT NOT NULL,
  source TEXT NOT NULL,
  PRIMARY KEY (document_path, term, source)
);

CREATE TABLE search_ngrams (
  target_kind TEXT NOT NULL,
  target_key TEXT NOT NULL,
  gram TEXT NOT NULL,
  source TEXT NOT NULL,
  PRIMARY KEY (target_kind, target_key, gram, source)
);

CREATE INDEX search_ngrams_lookup ON search_ngrams(target_kind, gram, target_key);

CREATE TABLE skills (
  name TEXT PRIMARY KEY,
  path TEXT NOT NULL,
  title TEXT NOT NULL
);

CREATE TABLE skill_routes (
  skill_name TEXT NOT NULL,
  skill_path TEXT NOT NULL,
  trigger TEXT NOT NULL,
  required_input TEXT NOT NULL,
  edit_scope TEXT NOT NULL,
  risk TEXT NOT NULL,
  verification_intents TEXT NOT NULL,
  expected_output TEXT NOT NULL,
  PRIMARY KEY (skill_name, trigger)
);

CREATE TABLE command_intents (
  name TEXT PRIMARY KEY,
  status TEXT NOT NULL,
  lifecycle TEXT,
  run_policy TEXT,
  description TEXT
);

CREATE TABLE command_effects (
  intent TEXT NOT NULL,
  source TEXT NOT NULL,
  access TEXT NOT NULL,
  mode TEXT NOT NULL,
  path TEXT,
  lock TEXT NOT NULL,
  concurrency TEXT NOT NULL
);

CREATE VIEW command_write_locks AS
SELECT
  intent,
  lock,
  group_concat(DISTINCT path) AS paths,
  group_concat(DISTINCT mode) AS modes,
  group_concat(DISTINCT source) AS sources,
  group_concat(DISTINCT concurrency) AS concurrencies,
  count(*) AS effect_count
FROM command_effects
WHERE access = 'write'
GROUP BY intent, lock;

CREATE VIEW command_lock_conflicts AS
SELECT
  a.intent AS left_intent,
  b.intent AS right_intent,
  a.lock AS lock,
  group_concat(DISTINCT a.path) AS left_paths,
  group_concat(DISTINCT b.path) AS right_paths,
  group_concat(DISTINCT a.mode) AS left_modes,
  group_concat(DISTINCT b.mode) AS right_modes,
  group_concat(DISTINCT a.concurrency) AS left_concurrencies,
  group_concat(DISTINCT b.concurrency) AS right_concurrencies
FROM command_effects a
JOIN command_effects b
  ON a.lock = b.lock
 AND a.intent < b.intent
WHERE
  a.access = 'write'
  OR b.access = 'write'
  OR a.concurrency = 'exclusive'
  OR b.concurrency = 'exclusive'
  OR a.mode = 'delete_recreate'
  OR b.mode = 'delete_recreate'
GROUP BY a.intent, b.intent, a.lock;

CREATE TABLE path_surfaces (
  rule_id TEXT PRIMARY KEY,
  pattern_kind TEXT NOT NULL,
  pattern TEXT NOT NULL,
  pattern_flags TEXT NOT NULL,
  surface_kind TEXT NOT NULL,
  category TEXT NOT NULL,
  is_public_surface INTEGER NOT NULL,
  update_policy TEXT NOT NULL
);

CREATE TABLE path_surface_reasons (
  rule_id TEXT NOT NULL,
  reason_kind TEXT NOT NULL,
  reason TEXT NOT NULL,
  ordinal INTEGER NOT NULL,
  PRIMARY KEY (rule_id, reason_kind, reason)
);

CREATE TABLE source_anchors (
  id TEXT PRIMARY KEY,
  path TEXT NOT NULL,
  line_start INTEGER NOT NULL,
  purpose TEXT,
  search_terms TEXT NOT NULL,
  invariant TEXT,
  risk TEXT NOT NULL,
  navigation_only INTEGER NOT NULL,
  can_instruct_agent INTEGER NOT NULL
);

CREATE TABLE source_anchor_fingerprints (
  anchor_id TEXT PRIMARY KEY,
  path TEXT NOT NULL,
  line_start INTEGER NOT NULL,
  anchor_metadata_hash TEXT NOT NULL,
  anchor_text_hash TEXT NOT NULL,
  context_hash TEXT NOT NULL,
  search_terms_hash TEXT,
  invariant_hash TEXT,
  risk_hash TEXT NOT NULL,
  symbol_kind TEXT NOT NULL,
  symbol_name TEXT,
  symbol_exported INTEGER NOT NULL,
  signature_hash TEXT,
  body_hash TEXT,
  symbol_start_line INTEGER,
  symbol_end_line INTEGER
);

CREATE TABLE source_anchor_status (
  anchor_id TEXT PRIMARY KEY,
  status TEXT NOT NULL,
  confidence REAL NOT NULL,
  identity_signal TEXT NOT NULL,
  location_signal TEXT NOT NULL,
  symbol_signal TEXT NOT NULL,
  body_signal TEXT NOT NULL,
  metadata_signal TEXT NOT NULL,
  semantic_signal TEXT NOT NULL,
  risk_signal TEXT NOT NULL,
  navigation_only INTEGER NOT NULL,
  can_instruct_agent INTEGER NOT NULL
);
`);

	if (capabilities.backend === SEARCH_BACKEND_FTS5) {
		database.run(`
CREATE VIRTUAL TABLE search_documents_fts USING fts5(
  path UNINDEXED,
  type UNINDEXED,
  title,
  sections,
  terms,
  snippet
);

CREATE VIRTUAL TABLE search_skills_fts USING fts5(
  name UNINDEXED,
  path UNINDEXED,
  title
);

CREATE VIRTUAL TABLE search_skill_routes_fts USING fts5(
  route_key UNINDEXED,
  skill_name UNINDEXED,
  skill_path UNINDEXED,
  trigger,
  required_input,
  edit_scope,
  risk,
  verification_intents,
  expected_output
);

CREATE VIRTUAL TABLE search_command_intents_fts USING fts5(
  name UNINDEXED,
  status UNINDEXED,
  lifecycle UNINDEXED,
  run_policy UNINDEXED,
  description,
  effects
);

CREATE VIRTUAL TABLE search_source_anchors_fts USING fts5(
  id UNINDEXED,
  path UNINDEXED,
  purpose,
  search_terms,
  invariant,
  risk
);
`);
	}
}

function insertDocumentTerm(database: SqlJsDatabase, documentPath: string, term: string | null, source: string): void {
	const normalized = normalizeSearchText(term ?? '');

	if (normalized.length === 0) {
		return;
	}

	database.run('INSERT OR IGNORE INTO document_terms (document_path, term, source) VALUES (?, ?, ?)', [
		documentPath,
		normalized,
		source,
	]);
}

function insertSearchNgrams(
	database: SqlJsDatabase,
	targetKind: SearchNgramTargetKind,
	targetKey: string,
	values: readonly string[],
	source: string,
): void {
	for (const gram of buildSearchNgrams(values)) {
		database.run(
			'INSERT OR IGNORE INTO search_ngrams (target_kind, target_key, gram, source) VALUES (?, ?, ?, ?)',
			[targetKind, targetKey, gram, source],
		);
	}
}

function insertPathSurfaceReasons(
	database: SqlJsDatabase,
	ruleId: string,
	reasonKind: string,
	values: readonly string[],
): void {
	values.forEach((value, index) => {
		database.run(
			'INSERT INTO path_surface_reasons (rule_id, reason_kind, reason, ordinal) VALUES (?, ?, ?, ?)',
			[ruleId, reasonKind, value, index + 1],
		);
	});
}

function populatePathSurfaceReadModel(database: SqlJsDatabase): void {
	for (const rule of listChangeClassificationRuleDescriptors()) {
		database.run(
			'INSERT INTO path_surfaces (rule_id, pattern_kind, pattern, pattern_flags, surface_kind, category, is_public_surface, update_policy) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
			[
				rule.id,
				rule.patternKind,
				rule.pattern,
				rule.patternFlags,
				rule.surface.kind,
				rule.surface.category,
				rule.surface.isPublicSurface ? 1 : 0,
				rule.surface.updatePolicy,
			],
		);

		insertPathSurfaceReasons(database, rule.id, 'change_kind', rule.changeKinds);
		insertPathSurfaceReasons(database, rule.id, 'validation_reason', rule.surface.validationReasons);
		insertPathSurfaceReasons(database, rule.id, 'affected_contract', rule.surface.affectedContracts);
		insertPathSurfaceReasons(database, rule.id, 'drift_check', rule.surface.driftChecks);
	}
}

function skillRouteKey(route: Pick<IndexSkillRoute, 'skillName' | 'trigger'>): string {
	return `${route.skillName}\u0000${route.trigger}`;
}

function populateSearchTables(
	database: SqlJsDatabase,
	capabilities: LocalSearchCapabilities,
	documents: readonly IndexDocument[],
	skills: readonly IndexSkill[],
	skillRoutes: readonly IndexSkillRoute[],
	commandIntents: readonly IndexCommandIntent[],
	sourceAnchors: readonly SourceAnchorIndexRecord[],
): void {
	for (const document of documents) {
		const documentTerms = queryRows(database, 'SELECT term FROM document_terms WHERE document_path = ? ORDER BY term', [
			document.path,
		]).map((row) => toSearchString(row.term));
		insertSearchNgrams(
			database,
			'document',
			document.path,
			[
				document.path,
				document.type,
				document.title,
				document.sections.join(' '),
				documentTerms.join(' '),
				document.contentSnippet,
			],
			'workflow_document',
		);

		if (capabilities.backend === SEARCH_BACKEND_FTS5) {
			database.run(
				'INSERT INTO search_documents_fts (path, type, title, sections, terms, snippet) VALUES (?, ?, ?, ?, ?, ?)',
				[
					document.path,
					document.type,
					document.title,
					document.sections.join(' '),
					documentTerms.join(' '),
					document.contentSnippet,
				],
			);
		}
	}

	for (const skill of skills) {
		insertSearchNgrams(database, 'skill', skill.name, [skill.name, skill.path, skill.title], 'skill');

		if (capabilities.backend === SEARCH_BACKEND_FTS5) {
			database.run('INSERT INTO search_skills_fts (name, path, title) VALUES (?, ?, ?)', [
				skill.name,
				skill.path,
				skill.title,
			]);
		}
	}

	for (const route of skillRoutes) {
		const verificationIntents = route.verificationIntents.join(' ');
		insertSearchNgrams(
			database,
			'skill_route',
			skillRouteKey(route),
			[
				skillRouteKey(route),
				route.skillName,
				route.skillPath,
				route.trigger,
				route.requiredInput,
				route.editScope,
				route.risk,
				verificationIntents,
				route.expectedOutput,
			],
			'skill_route',
		);

		if (capabilities.backend === SEARCH_BACKEND_FTS5) {
			database.run(
				'INSERT INTO search_skill_routes_fts (route_key, skill_name, skill_path, trigger, required_input, edit_scope, risk, verification_intents, expected_output) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
				[
					skillRouteKey(route),
					route.skillName,
					route.skillPath,
					route.trigger,
					route.requiredInput,
					route.editScope,
					route.risk,
					verificationIntents,
					route.expectedOutput,
				],
			);
		}
	}

	for (const intent of commandIntents) {
		const effects = intent.effects
			.flatMap((effect) => [effect.lock, effect.path ?? '', effect.mode, effect.access, effect.concurrency])
			.join(' ');
		insertSearchNgrams(
			database,
			'command_intent',
			intent.name,
			[intent.name, intent.status, intent.lifecycle ?? '', intent.runPolicy ?? '', intent.description ?? '', effects],
			'command_intent',
		);

		if (capabilities.backend === SEARCH_BACKEND_FTS5) {
			database.run(
				'INSERT INTO search_command_intents_fts (name, status, lifecycle, run_policy, description, effects) VALUES (?, ?, ?, ?, ?, ?)',
				[intent.name, intent.status, intent.lifecycle, intent.runPolicy, intent.description, effects],
			);
		}
	}

	for (const anchor of sourceAnchors) {
		insertSearchNgrams(
			database,
			'source_anchor',
			anchor.id,
			[
				anchor.id,
				anchor.path,
				anchor.purpose ?? '',
				anchor.search.join(' '),
				anchor.invariant ?? '',
				anchor.risk.join(' '),
			],
			'source_anchor',
		);

		if (capabilities.backend === SEARCH_BACKEND_FTS5) {
			database.run(
				'INSERT INTO search_source_anchors_fts (id, path, purpose, search_terms, invariant, risk) VALUES (?, ?, ?, ?, ?, ?)',
				[
					anchor.id,
					anchor.path,
					anchor.purpose,
					anchor.search.join(' '),
					anchor.invariant,
					anchor.risk.join(' '),
				],
			);
		}
	}
}

function populateDatabase(
	database: SqlJsDatabase,
	capabilities: LocalSearchCapabilities,
	documents: readonly IndexDocument[],
	skills: readonly IndexSkill[],
	skillRoutes: readonly IndexSkillRoute[],
	commandIntents: readonly IndexCommandIntent[],
	sourceAnchors: readonly SourceAnchorIndexRecord[],
	indexedFiles: readonly IndexedFileRecord[],
	indexMode: LocalIndexResult['index_mode'],
	sourceScopeHash: string,
	sourceIndexEnabled: boolean,
	indexedAt: string,
): void {
	database.run('INSERT INTO metadata (key, value) VALUES (?, ?)', ['schema_version', LOCAL_INDEX_SCHEMA_VERSION]);
	database.run('INSERT INTO metadata (key, value) VALUES (?, ?)', ['parser_version', LOCAL_INDEX_PARSER_VERSION]);
	database.run('INSERT INTO metadata (key, value) VALUES (?, ?)', ['content_mode', LOCAL_INDEX_CONTENT_MODE]);
	database.run('INSERT INTO metadata (key, value) VALUES (?, ?)', [
		'store_full_content',
		String(LOCAL_INDEX_STORE_FULL_CONTENT),
	]);
	database.run('INSERT INTO metadata (key, value) VALUES (?, ?)', [
		'max_snippet_bytes_per_document',
		String(MAX_SNIPPET_BYTES_PER_DOCUMENT),
	]);
	database.run('INSERT INTO metadata (key, value) VALUES (?, ?)', ['search_backend', capabilities.backend]);
	database.run('INSERT INTO metadata (key, value) VALUES (?, ?)', [
		'search_fts5_available',
		String(capabilities.fts5Available),
	]);
	database.run('INSERT INTO metadata (key, value) VALUES (?, ?)', ['source_scope_hash', sourceScopeHash]);
	database.run('INSERT INTO metadata (key, value) VALUES (?, ?)', ['source_index_enabled', String(sourceIndexEnabled)]);
	database.run('INSERT INTO metadata (key, value) VALUES (?, ?)', ['index_mode', indexMode]);

	for (const indexedFile of indexedFiles) {
		database.run(
			'INSERT INTO indexed_files (path, source_scope, size_bytes, mtime_ms, content_hash, indexed_at, index_mode, parser_version) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
			[
				indexedFile.path,
				indexedFile.sourceScope,
				indexedFile.sizeBytes,
				indexedFile.mtimeMs,
				indexedFile.contentHash,
				indexedAt,
				indexMode,
				LOCAL_INDEX_PARSER_VERSION,
			],
		);
	}

	for (const document of documents) {
		database.run(
			'INSERT INTO documents (path, type, title, locale, revision, content_hash, content_snippet) VALUES (?, ?, ?, ?, ?, ?, ?)',
			[
				document.path,
				document.type,
				document.title,
				document.locale,
				document.revision,
				document.contentHash,
				document.contentSnippet,
			],
		);

		document.sections.forEach((heading, index) => {
			database.run('INSERT INTO sections (document_path, ordinal, heading) VALUES (?, ?, ?)', [
				document.path,
				index + 1,
				heading,
			]);
		});
	}

	for (const skill of skills) {
		database.run('INSERT INTO skills (name, path, title) VALUES (?, ?, ?)', [skill.name, skill.path, skill.title]);
	}

	for (const route of skillRoutes) {
		const verificationIntents = route.verificationIntents.join(', ');
		database.run(
			'INSERT INTO skill_routes (skill_name, skill_path, trigger, required_input, edit_scope, risk, verification_intents, expected_output) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
			[
				route.skillName,
				route.skillPath,
				route.trigger,
				route.requiredInput,
				route.editScope,
				route.risk,
				verificationIntents,
				route.expectedOutput,
			],
		);
		insertDocumentTerm(database, '.mustflow/skills/INDEX.md', route.skillName, 'skill_route_name');
		insertDocumentTerm(database, '.mustflow/skills/INDEX.md', route.trigger, 'skill_route_trigger');
		insertDocumentTerm(database, '.mustflow/skills/INDEX.md', route.risk, 'skill_route_risk');
		insertDocumentTerm(database, '.mustflow/skills/INDEX.md', route.requiredInput, 'skill_route_required_input');
		insertDocumentTerm(database, '.mustflow/skills/INDEX.md', route.editScope, 'skill_route_edit_scope');
		insertDocumentTerm(database, '.mustflow/skills/INDEX.md', verificationIntents, 'skill_route_verification_intents');
	}

	for (const intent of commandIntents) {
		database.run(
			'INSERT INTO command_intents (name, status, lifecycle, run_policy, description) VALUES (?, ?, ?, ?, ?)',
			[intent.name, intent.status, intent.lifecycle, intent.runPolicy, intent.description],
		);

		insertDocumentTerm(database, '.mustflow/config/commands.toml', intent.name, 'command_intent');
		insertDocumentTerm(database, '.mustflow/config/commands.toml', intent.status, 'command_status');
		insertDocumentTerm(database, '.mustflow/config/commands.toml', intent.lifecycle, 'command_lifecycle');
		insertDocumentTerm(database, '.mustflow/config/commands.toml', intent.runPolicy, 'command_run_policy');
		insertDocumentTerm(database, '.mustflow/config/commands.toml', intent.description, 'command_description');

		for (const effect of intent.effects) {
			database.run(
				'INSERT INTO command_effects (intent, source, access, mode, path, lock, concurrency) VALUES (?, ?, ?, ?, ?, ?, ?)',
				[effect.intent, effect.source, effect.access, effect.mode, effect.path, effect.lock, effect.concurrency],
			);
			if (effect.path !== null) {
				insertDocumentTerm(database, '.mustflow/config/commands.toml', effect.path, 'command_effect_path');
			}
			insertDocumentTerm(database, '.mustflow/config/commands.toml', effect.lock, 'command_effect_lock');
			insertDocumentTerm(database, '.mustflow/config/commands.toml', effect.mode, 'command_effect_mode');
		}
	}

	for (const anchor of sourceAnchors) {
		database.run(
			'INSERT INTO source_anchors (id, path, line_start, purpose, search_terms, invariant, risk, navigation_only, can_instruct_agent) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
			[
				anchor.id,
				anchor.path,
				anchor.lineStart,
				anchor.purpose,
				anchor.search.join(', '),
				anchor.invariant,
				anchor.risk.join(', '),
				anchor.navigationOnly ? 1 : 0,
				anchor.canInstructAgent ? 1 : 0,
			],
		);
		database.run(
			'INSERT INTO source_anchor_fingerprints (anchor_id, path, line_start, anchor_metadata_hash, anchor_text_hash, context_hash, search_terms_hash, invariant_hash, risk_hash, symbol_kind, symbol_name, symbol_exported, signature_hash, body_hash, symbol_start_line, symbol_end_line) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
			[
				anchor.id,
				anchor.path,
				anchor.lineStart,
				anchor.fingerprint.anchorMetadataHash,
				anchor.fingerprint.anchorTextHash,
				anchor.fingerprint.contextHash,
				anchor.fingerprint.searchTermsHash,
				anchor.fingerprint.invariantHash,
				anchor.fingerprint.riskHash,
				anchor.fingerprint.symbol.kind,
				anchor.fingerprint.symbol.name,
				anchor.fingerprint.symbol.exported ? 1 : 0,
				anchor.fingerprint.symbol.signatureHash,
				anchor.fingerprint.symbol.bodyHash,
				anchor.fingerprint.symbol.startLine,
				anchor.fingerprint.symbol.endLine,
			],
		);
		database.run(
			'INSERT INTO source_anchor_status (anchor_id, status, confidence, identity_signal, location_signal, symbol_signal, body_signal, metadata_signal, semantic_signal, risk_signal, navigation_only, can_instruct_agent) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
			[
				anchor.id,
				anchor.status,
				anchor.confidence,
				anchor.signals.identity,
				anchor.signals.location,
				anchor.signals.symbol,
				anchor.signals.body,
				anchor.signals.metadata,
				anchor.signals.semantic,
				anchor.signals.risk,
				anchor.navigationOnly ? 1 : 0,
				anchor.canInstructAgent ? 1 : 0,
			],
		);
	}

	populatePathSurfaceReadModel(database);
	populateSearchTables(database, capabilities, documents, skills, skillRoutes, commandIntents, sourceAnchors);
}

type IncrementalRebuildReason =
	| 'missing_index'
	| 'schema_version_mismatch'
	| 'parser_version_mismatch'
	| 'source_scope_mismatch'
	| 'indexed_files_missing'
	| 'file_fingerprint_mismatch'
	| 'unreadable_index';

interface IncrementalReuseDecision {
	readonly reusable: boolean;
	readonly rebuildReason: IncrementalRebuildReason | null;
	readonly capabilities: LocalSearchCapabilities | null;
}

function indexedFilesMatch(database: SqlJsDatabase, currentFiles: readonly IndexedFileRecord[]): boolean {
	const rows = queryRows(
		database,
		'SELECT path, source_scope, content_hash, parser_version FROM indexed_files ORDER BY path',
	);

	if (rows.length !== currentFiles.length) {
		return false;
	}

	const currentByPath = new Map(currentFiles.map((file) => [file.path, file]));

	for (const row of rows) {
		const storedPath = toSearchString(row.path);
		const current = currentByPath.get(storedPath);

		if (!current) {
			return false;
		}

		if (
			toSearchString(row.source_scope) !== current.sourceScope ||
			toSearchString(row.content_hash) !== current.contentHash ||
			toSearchString(row.parser_version) !== LOCAL_INDEX_PARSER_VERSION
		) {
			return false;
		}
	}

	return true;
}

async function readIncrementalReuseDecision(
	SQL: SqlJsStatic,
	databasePath: string,
	currentFiles: readonly IndexedFileRecord[],
	sourceScopeHash: string,
): Promise<IncrementalReuseDecision> {
	if (!existsSync(databasePath)) {
		return { reusable: false, rebuildReason: 'missing_index', capabilities: null };
	}

	let database: SqlJsDatabase | undefined;

	try {
		database = new SQL.Database(readFileSync(databasePath));

		if (readStoredSchemaVersion(database) !== LOCAL_INDEX_SCHEMA_VERSION) {
			return { reusable: false, rebuildReason: 'schema_version_mismatch', capabilities: null };
		}

		if (readMetadataValue(database, 'parser_version') !== LOCAL_INDEX_PARSER_VERSION) {
			return { reusable: false, rebuildReason: 'parser_version_mismatch', capabilities: null };
		}

		if (readMetadataValue(database, 'source_scope_hash') !== sourceScopeHash) {
			return { reusable: false, rebuildReason: 'source_scope_mismatch', capabilities: null };
		}

		if (!hasTable(database, 'indexed_files')) {
			return { reusable: false, rebuildReason: 'indexed_files_missing', capabilities: null };
		}

		if (!indexedFilesMatch(database, currentFiles)) {
			return { reusable: false, rebuildReason: 'file_fingerprint_mismatch', capabilities: null };
		}

		return {
			reusable: true,
			rebuildReason: null,
			capabilities: readStoredSearchCapabilities(database),
		};
	} catch {
		return { reusable: false, rebuildReason: 'unreadable_index', capabilities: null };
	} finally {
		database?.close();
	}
}

/**
 * mf:anchor cli.index.create
 * purpose: Build the local SQLite index for workflow documents and optional source anchors.
 * search: mf index, local index, sqlite, source anchors, workflow documents
 * invariant: Source anchors are indexed only when requested by CLI flag or local index configuration.
 * risk: cache, config
 */
export async function createLocalIndex(projectRoot: string, options: LocalIndexOptions = {}): Promise<LocalIndexResult> {
	const databasePath = getLocalIndexDatabasePath(projectRoot);
	const dryRun = options.dryRun === true;
	const incremental = options.incremental === true;
	const indexMode: LocalIndexResult['index_mode'] = incremental ? 'incremental' : 'full';
	const documents = collectDocuments(projectRoot);
	const skills = collectSkills(documents);
	const skillRoutes = collectSkillRoutes(projectRoot);
	const commandIntents = collectCommandIntents(projectRoot);
	const sourceConfig = readLocalIndexSourceConfig(projectRoot);
	const includeSource = options.includeSource === true || sourceConfig.enabledByDefault;
	const sourceScopeHash = getSourceScopeHash(includeSource, sourceConfig);
	const previousSourceAnchors = includeSource
		? await readPreviousSourceAnchorSnapshots(databasePath).catch(() => [])
		: [];
	const sourceAnchors = includeSource
		? collectSourceAnchorIndexRecords(projectRoot, previousSourceAnchors, {
				...sourceConfig,
				excludeGeneratedOrVendor: true,
			})
		: [];
	const indexedFiles = collectIndexedFileRecords(projectRoot, documents, sourceAnchors);
	let capabilities = searchCapabilities(false);
	let reusedExisting = false;
	let rebuildReason: string | null = null;

	const SQL = await loadSqlJs();
	const capabilityDatabase = new SQL.Database();
	capabilities = detectLocalSearchCapabilities(capabilityDatabase);
	capabilityDatabase.close();

	if (incremental) {
		const reuseDecision = await readIncrementalReuseDecision(SQL, databasePath, indexedFiles, sourceScopeHash);
		reusedExisting = reuseDecision.reusable;
		rebuildReason = reuseDecision.rebuildReason;
		capabilities = reuseDecision.capabilities ?? capabilities;
	}

	if (!dryRun && !reusedExisting) {
		const database = new SQL.Database();

		createSchema(database, capabilities);
		populateDatabase(
			database,
			capabilities,
			documents,
			skills,
			skillRoutes,
			commandIntents,
			sourceAnchors,
			indexedFiles,
			indexMode,
			sourceScopeHash,
			includeSource,
			new Date().toISOString(),
		);
		mkdirSync(path.dirname(databasePath), { recursive: true });
		writeFileSync(databasePath, database.export());
		database.close();
	}

	return {
		schema_version: LOCAL_INDEX_SCHEMA_VERSION,
		command: 'index',
		ok: true,
		mustflow_root: path.resolve(projectRoot),
		database_path: databasePath,
		dry_run: dryRun,
		wrote_files: !dryRun && !reusedExisting,
		index_mode: indexMode,
		reused_existing: reusedExisting,
		rebuild_reason: rebuildReason,
		document_count: documents.length,
		skill_count: skills.length,
		skill_route_count: skillRoutes.length,
		command_intent_count: commandIntents.length,
		command_effect_count: commandIntents.reduce((count, intent) => count + intent.effects.length, 0),
		source_index_enabled: includeSource,
		source_anchor_count: sourceAnchors.length,
		search_backend: capabilities.backend,
		search_fts5_available: capabilities.fts5Available,
		content_mode: LOCAL_INDEX_CONTENT_MODE,
		store_full_content: LOCAL_INDEX_STORE_FULL_CONTENT,
		max_snippet_bytes_per_document: MAX_SNIPPET_BYTES_PER_DOCUMENT,
		indexed_file_count: indexedFiles.length,
		indexed_paths: documents.map((document) => document.path),
	};
}

function readStoredSchemaVersion(database: SqlJsDatabase): string | undefined {
	return readMetadataValue(database, 'schema_version');
}

function getStalePaths(projectRoot: string, database: SqlJsDatabase): string[] {
	const schemaVersion = readStoredSchemaVersion(database);

	if (schemaVersion !== LOCAL_INDEX_SCHEMA_VERSION) {
		return ['.mustflow/cache/mustflow.sqlite'];
	}

	if (hasTable(database, 'indexed_files')) {
		const stalePaths = new Set<string>();
		const indexedRows = queryRows(database, 'SELECT path, source_scope, content_hash FROM indexed_files');
		const indexedPaths = new Set(indexedRows.map((row) => toSearchString(row.path)));

		for (const row of indexedRows) {
			const indexedPath = toSearchString(row.path);
			const sourceScope = toSearchString(row.source_scope) === 'source_anchor' ? 'source_anchor' : 'workflow';

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

		return Array.from(stalePaths).sort((left, right) => left.localeCompare(right));
	}

	const indexedRows = queryRows(database, 'SELECT path, content_hash FROM documents');
	const indexedHashes = new Map(indexedRows.map((row) => [toSearchString(row.path), toSearchString(row.content_hash)]));
	const currentDocuments = collectDocuments(projectRoot);
	const currentHashes = new Map(currentDocuments.map((document) => [document.path, document.contentHash]));
	const stalePaths = new Set<string>();

	for (const [indexedPath, indexedHash] of indexedHashes) {
		if (currentHashes.get(indexedPath) !== indexedHash) {
			stalePaths.add(indexedPath);
		}
	}

	for (const currentPath of currentHashes.keys()) {
		if (!indexedHashes.has(currentPath)) {
			stalePaths.add(currentPath);
		}
	}

	return Array.from(stalePaths).sort((left, right) => left.localeCompare(right));
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

function createLocalIndexPromptContextStatus(
	databasePath: string,
	status: LocalIndexPromptContextStatus,
	stalePaths: readonly string[] = [],
	capabilities: LocalSearchCapabilities | null = null,
): LocalIndexPromptContext {
	return {
		source: 'local_index',
		status,
		databasePath,
		indexFresh: status === 'fresh',
		stalePaths,
		searchBackend: capabilities?.backend ?? null,
		searchFts5Available: capabilities?.fts5Available ?? null,
		refreshHint: status === 'fresh' ? null : 'Run `mf index` to refresh prompt-cache task context local-index metadata.',
	};
}

export async function readLocalIndexPromptContext(projectRoot: string): Promise<LocalIndexPromptContext> {
	const databasePath = getLocalIndexDatabasePath(projectRoot);

	if (!existsSync(databasePath)) {
		return createLocalIndexPromptContextStatus(databasePath, 'missing');
	}

	let database: SqlJsDatabase | undefined;

	try {
		const SQL = await loadSqlJs();
		database = new SQL.Database(readFileSync(databasePath));
		const capabilities = readStoredSearchCapabilities(database);
		const stalePaths = getStalePaths(projectRoot, database);

		if (stalePaths.length > 0) {
			return createLocalIndexPromptContextStatus(databasePath, 'stale', stalePaths, capabilities);
		}

		return createLocalIndexPromptContextStatus(databasePath, 'fresh', [], capabilities);
	} catch {
		return createLocalIndexPromptContextStatus(databasePath, 'unreadable');
	} finally {
		database?.close();
	}
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

function getCommandEffects(database: SqlJsDatabase, intent: string): NormalizedCommandEffect[] {
	return queryRows(
		database,
		'SELECT intent, source, access, mode, path, lock, concurrency FROM command_effects WHERE intent = ? ORDER BY lock, path, mode',
		[intent],
	).map((row) => ({
		intent: toSearchString(row.intent),
		source: toSearchString(row.source) as NormalizedCommandEffect['source'],
		access: toSearchString(row.access) as NormalizedCommandEffect['access'],
		mode: toSearchString(row.mode) as NormalizedCommandEffect['mode'],
		path: row.path === null || row.path === undefined ? null : toSearchString(row.path),
		lock: toSearchString(row.lock),
		concurrency: toSearchString(row.concurrency) as NormalizedCommandEffect['concurrency'],
	}));
}

interface IndexedSearchMatches {
	readonly active: boolean;
	readonly documents: ReadonlySet<string>;
	readonly skills: ReadonlySet<string>;
	readonly skillRoutes: ReadonlySet<string>;
	readonly commandIntents: ReadonlySet<string>;
	readonly sourceAnchors: ReadonlySet<string>;
}

const EMPTY_INDEXED_SEARCH_MATCHES: IndexedSearchMatches = {
	active: false,
	documents: new Set(),
	skills: new Set(),
	skillRoutes: new Set(),
	commandIntents: new Set(),
	sourceAnchors: new Set(),
};

function buildFtsQuery(query: string): string | null {
	const tokens = extractSearchTokens(query);

	if (tokens.length === 0) {
		return null;
	}

	return [...new Set(tokens)].map((token) => `"${token.replaceAll('"', '""')}"`).join(' AND ');
}

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
	return (indexedMatches.active && matchSet.has(key)) || isMatched(fields, query);
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
	return indexedMatches.active && matchSet.has(key) ? Math.max(tableScore, 20) : tableScore;
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

	if (!existsSync(databasePath)) {
		throw new Error('Local mustflow index not found. Run `mf index` before searching.');
	}

	if (normalizedQuery.length === 0) {
		throw new Error('Search query must not be empty.');
	}

	const SQL = await loadSqlJs();
	const database = new SQL.Database(readFileSync(databasePath));
	const cacheLayers = readCacheLayerSets(projectRoot);
	let capabilities = searchCapabilities(false);
	const results: LocalSearchItem[] = [];

	try {
		const stalePaths = getStalePaths(projectRoot, database);
		capabilities = readStoredSearchCapabilities(database);
		const indexedMatches = getIndexedSearchMatches(database, normalizedQuery);

		if (stalePaths.length > 0) {
			throw new Error(
				`Local mustflow index is stale: ${stalePaths.join(', ')}. Run \`mf index\` before searching. Refresh command: mf index`,
			);
		}

		if (scope === 'workflow' || scope === 'all') {
			for (const row of queryRows(database, 'SELECT path, type, title, content_snippet FROM documents')) {
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

			for (const row of queryRows(database, 'SELECT name, path, title FROM skills')) {
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

			for (const row of queryRows(
				database,
				'SELECT skill_name, skill_path, trigger, required_input, edit_scope, risk, verification_intents, expected_output FROM skill_routes',
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

				if (!matchesIndexedOrTableScan(fields, normalizedQuery, indexedMatches, indexedMatches.skillRoutes, routeKey)) {
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
							score: scoreIndexedOrTableScan(
								primaryFields,
								secondaryFields,
								normalizedQuery,
								indexedMatches,
								indexedMatches.skillRoutes,
								routeKey,
							),
						},
						cacheLayers,
					),
				);
			}

			for (const row of queryRows(database, 'SELECT name, status, lifecycle, run_policy, description FROM command_intents')) {
				const name = toSearchString(row.name);
				const status = toSearchString(row.status);
				const lifecycle = toSearchString(row.lifecycle);
				const runPolicy = toSearchString(row.run_policy);
				const description = toSearchString(row.description);
				const effects = getCommandEffects(database, name);
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
			for (const row of queryRows(
				database,
				'SELECT source_anchors.id, path, line_start, purpose, search_terms, invariant, risk, source_anchors.navigation_only, source_anchors.can_instruct_agent, status, confidence FROM source_anchors LEFT JOIN source_anchor_status ON source_anchor_status.anchor_id = source_anchors.id',
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
	} finally {
		database.close();
	}

	const sortedResults = results
		.sort((left, right) => {
			if (scope === 'all' && left.authority_rank !== right.authority_rank) {
				return left.authority_rank - right.authority_rank;
			}

			return right.score - left.score || (left.path ?? left.name ?? '').localeCompare(right.path ?? right.name ?? '');
		})
		.slice(0, limit);

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
