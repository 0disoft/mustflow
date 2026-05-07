import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { createHash } from 'node:crypto';
import path from 'node:path';

import { isRecord, readCommandContract, readString } from './command-contract.js';
import { listFilesRecursive, toPosixPath } from './filesystem.js';

const LOCAL_INDEX_SCHEMA_VERSION = '2';
const DEFAULT_DATABASE_RELATIVE_PATH = '.mustflow/cache/mustflow.sqlite';

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
}

interface IndexDocument {
	readonly path: string;
	readonly type: string;
	readonly title: string;
	readonly locale: string | null;
	readonly revision: number | null;
	readonly contentHash: string;
	readonly content: string;
	readonly sections: readonly string[];
}

interface IndexSkill {
	readonly name: string;
	readonly path: string;
	readonly title: string;
}

interface IndexCommandIntent {
	readonly name: string;
	readonly status: string;
	readonly lifecycle: string | null;
	readonly runPolicy: string | null;
	readonly description: string | null;
}

export interface LocalIndexResult {
	readonly schema_version: string;
	readonly command: 'index';
	readonly ok: boolean;
	readonly mustflow_root: string;
	readonly database_path: string;
	readonly dry_run: boolean;
	readonly wrote_files: boolean;
	readonly document_count: number;
	readonly skill_count: number;
	readonly command_intent_count: number;
	readonly indexed_paths: readonly string[];
}

export interface LocalSearchOptions {
	readonly limit?: number;
}

export interface LocalSearchItem {
	readonly kind: 'document' | 'skill' | 'command_intent';
	readonly path?: string;
	readonly name?: string;
	readonly title?: string;
	readonly document_type?: string;
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
	readonly index_fresh: boolean;
	readonly stale_paths: readonly string[];
	readonly result_count: number;
	readonly results: readonly LocalSearchItem[];
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

function sha256Text(content: string): string {
	return `sha256:${createHash('sha256').update(content).digest('hex')}`;
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
			content,
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
		});
	}

	return intents;
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

function toSearchString(value: SqlValue | undefined): string {
	if (value === null || value === undefined) {
		return '';
	}

	if (value instanceof Uint8Array) {
		return '';
	}

	return String(value);
}

function queryRows(database: SqlJsDatabase, sql: string): Record<string, SqlValue>[] {
	const [result] = database.exec(sql);

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

function getMatchSnippet(fields: readonly string[], query: string): string {
	const normalized = normalizeSearchText(fields.join(' '));
	const lower = normalized.toLowerCase();
	const start = lower.indexOf(query.toLowerCase());

	if (start === -1) {
		return normalized.slice(0, 160);
	}

	const from = Math.max(0, start - 48);
	const to = Math.min(normalized.length, start + query.length + 96);
	const prefix = from > 0 ? '...' : '';
	const suffix = to < normalized.length ? '...' : '';

	return `${prefix}${normalized.slice(from, to)}${suffix}`;
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

function createSchema(database: SqlJsDatabase): void {
	database.run(`
CREATE TABLE metadata (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

CREATE TABLE documents (
  path TEXT PRIMARY KEY,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  locale TEXT,
	revision INTEGER,
  content_hash TEXT NOT NULL,
  content TEXT NOT NULL
);

CREATE TABLE sections (
  document_path TEXT NOT NULL,
  ordinal INTEGER NOT NULL,
  heading TEXT NOT NULL,
  PRIMARY KEY (document_path, ordinal)
);

CREATE TABLE skills (
  name TEXT PRIMARY KEY,
  path TEXT NOT NULL,
  title TEXT NOT NULL
);

CREATE TABLE command_intents (
  name TEXT PRIMARY KEY,
  status TEXT NOT NULL,
  lifecycle TEXT,
  run_policy TEXT,
  description TEXT
);
`);
}

function populateDatabase(
	database: SqlJsDatabase,
	documents: readonly IndexDocument[],
	skills: readonly IndexSkill[],
	commandIntents: readonly IndexCommandIntent[],
): void {
	database.run('INSERT INTO metadata (key, value) VALUES (?, ?)', ['schema_version', LOCAL_INDEX_SCHEMA_VERSION]);

	for (const document of documents) {
		database.run(
			'INSERT INTO documents (path, type, title, locale, revision, content_hash, content) VALUES (?, ?, ?, ?, ?, ?, ?)',
			[document.path, document.type, document.title, document.locale, document.revision, document.contentHash, document.content],
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

	for (const intent of commandIntents) {
		database.run(
			'INSERT INTO command_intents (name, status, lifecycle, run_policy, description) VALUES (?, ?, ?, ?, ?)',
			[intent.name, intent.status, intent.lifecycle, intent.runPolicy, intent.description],
		);
	}
}

export async function createLocalIndex(projectRoot: string, options: LocalIndexOptions = {}): Promise<LocalIndexResult> {
	const databasePath = getLocalIndexDatabasePath(projectRoot);
	const documents = collectDocuments(projectRoot);
	const skills = collectSkills(documents);
	const commandIntents = collectCommandIntents(projectRoot);
	const dryRun = options.dryRun === true;

	if (!dryRun) {
		const SQL = await loadSqlJs();
		const database = new SQL.Database();

		createSchema(database);
		populateDatabase(database, documents, skills, commandIntents);
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
		wrote_files: !dryRun,
		document_count: documents.length,
		skill_count: skills.length,
		command_intent_count: commandIntents.length,
		indexed_paths: documents.map((document) => document.path),
	};
}

function readStoredSchemaVersion(database: SqlJsDatabase): string | undefined {
	return toSearchString(queryRows(database, 'SELECT value FROM metadata WHERE key = "schema_version"')[0]?.value) || undefined;
}

function getStalePaths(projectRoot: string, database: SqlJsDatabase): string[] {
	const schemaVersion = readStoredSchemaVersion(database);

	if (schemaVersion !== LOCAL_INDEX_SCHEMA_VERSION) {
		return ['.mustflow/cache/mustflow.sqlite'];
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

export async function searchLocalIndex(projectRoot: string, query: string, options: LocalSearchOptions = {}): Promise<LocalSearchResult> {
	const normalizedQuery = normalizeSearchText(query);
	const limit = Math.max(1, Math.min(options.limit ?? 10, 50));
	const databasePath = getLocalIndexDatabasePath(projectRoot);

	if (!existsSync(databasePath)) {
		throw new Error('Local mustflow index not found. Run `mf index` before searching.');
	}

	if (normalizedQuery.length === 0) {
		throw new Error('Search query must not be empty.');
	}

	const SQL = await loadSqlJs();
	const database = new SQL.Database(readFileSync(databasePath));
	const results: LocalSearchItem[] = [];

	try {
		const stalePaths = getStalePaths(projectRoot, database);

		if (stalePaths.length > 0) {
			throw new Error(`Local mustflow index is stale: ${stalePaths.join(', ')}. Run \`mf index\` before searching.`);
		}

		for (const row of queryRows(database, 'SELECT path, type, title, content FROM documents')) {
			const pathValue = toSearchString(row.path);
			const typeValue = toSearchString(row.type);
			const title = toSearchString(row.title);
			const content = toSearchString(row.content);
			const primaryFields = [pathValue, title];
			const secondaryFields = [typeValue, content];

			if (!isMatched([...primaryFields, ...secondaryFields], normalizedQuery)) {
				continue;
			}

			results.push({
				kind: 'document',
				path: pathValue,
				title,
				document_type: typeValue,
				match: getMatchSnippet([...primaryFields, ...secondaryFields], normalizedQuery),
				score: scoreMatch(primaryFields, secondaryFields, normalizedQuery),
			});
		}

		for (const row of queryRows(database, 'SELECT name, path, title FROM skills')) {
			const name = toSearchString(row.name);
			const pathValue = toSearchString(row.path);
			const title = toSearchString(row.title);
			const fields = [name, pathValue, title];

			if (!isMatched(fields, normalizedQuery)) {
				continue;
			}

			results.push({
				kind: 'skill',
				name,
				path: pathValue,
				title,
				match: getMatchSnippet(fields, normalizedQuery),
				score: scoreMatch([name, pathValue, title], [], normalizedQuery),
			});
		}

		for (const row of queryRows(database, 'SELECT name, status, lifecycle, run_policy, description FROM command_intents')) {
			const name = toSearchString(row.name);
			const status = toSearchString(row.status);
			const lifecycle = toSearchString(row.lifecycle);
			const runPolicy = toSearchString(row.run_policy);
			const description = toSearchString(row.description);
			const primaryFields = [name];
			const secondaryFields = [status, lifecycle, runPolicy, description];

			if (!isMatched([...primaryFields, ...secondaryFields], normalizedQuery)) {
				continue;
			}

			results.push({
				kind: 'command_intent',
				name,
				title: description || name,
				match: getMatchSnippet([...primaryFields, ...secondaryFields], normalizedQuery),
				score: scoreMatch(primaryFields, secondaryFields, normalizedQuery),
			});
		}
	} finally {
		database.close();
	}

	const sortedResults = results
		.sort((left, right) => right.score - left.score || (left.path ?? left.name ?? '').localeCompare(right.path ?? right.name ?? ''))
		.slice(0, limit);

	return {
		schema_version: LOCAL_INDEX_SCHEMA_VERSION,
		command: 'search',
		ok: true,
		mustflow_root: path.resolve(projectRoot),
		database_path: databasePath,
		query: normalizedQuery,
		limit,
		index_fresh: true,
		stale_paths: [],
		result_count: sortedResults.length,
		results: sortedResults,
	};
}
