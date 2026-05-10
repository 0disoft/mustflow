import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
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

const LOCAL_INDEX_SCHEMA_VERSION = '7';
const DEFAULT_DATABASE_RELATIVE_PATH = '.mustflow/cache/mustflow.sqlite';
const LOCAL_INDEX_CONTENT_MODE = 'metadata_and_snippets';
const LOCAL_INDEX_STORE_FULL_CONTENT = false;
const MAX_SNIPPET_BYTES_PER_DOCUMENT = 2048;
const MUSTFLOW_RELATIVE_PATH = '.mustflow/config/mustflow.toml';
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
	readonly skill_route_count: number;
	readonly command_intent_count: number;
	readonly command_effect_count: number;
	readonly source_index_enabled: boolean;
	readonly source_anchor_count: number;
	readonly content_mode: typeof LOCAL_INDEX_CONTENT_MODE;
	readonly store_full_content: typeof LOCAL_INDEX_STORE_FULL_CONTENT;
	readonly max_snippet_bytes_per_document: typeof MAX_SNIPPET_BYTES_PER_DOCUMENT;
	readonly indexed_paths: readonly string[];
}

export interface LocalSearchOptions {
	readonly limit?: number;
	readonly scope?: LocalSearchScope;
}

type CacheLayer = 'stable' | 'task' | 'volatile';
export type LocalSearchScope = 'workflow' | 'source' | 'all';
type SearchSourceScope = 'workflow' | 'source';

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

function readMustflowToml(projectRoot: string): TomlTable | undefined {
	const mustflowPath = path.join(projectRoot, ...MUSTFLOW_RELATIVE_PATH.split('/'));

	if (!existsSync(mustflowPath)) {
		return undefined;
	}

	const parsed = readTomlFile(mustflowPath);
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

function toNullableNumber(value: SqlValue | undefined): number | null {
	if (typeof value !== 'number') {
		return null;
	}

	return Number.isFinite(value) ? value : null;
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
  path TEXT NOT NULL,
  lock TEXT NOT NULL,
  concurrency TEXT NOT NULL,
  PRIMARY KEY (intent, source, access, mode, path, lock, concurrency)
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

function populateDatabase(
	database: SqlJsDatabase,
	documents: readonly IndexDocument[],
	skills: readonly IndexSkill[],
	skillRoutes: readonly IndexSkillRoute[],
	commandIntents: readonly IndexCommandIntent[],
	sourceAnchors: readonly SourceAnchorIndexRecord[],
): void {
	database.run('INSERT INTO metadata (key, value) VALUES (?, ?)', ['schema_version', LOCAL_INDEX_SCHEMA_VERSION]);
	database.run('INSERT INTO metadata (key, value) VALUES (?, ?)', ['content_mode', LOCAL_INDEX_CONTENT_MODE]);
	database.run('INSERT INTO metadata (key, value) VALUES (?, ?)', [
		'store_full_content',
		String(LOCAL_INDEX_STORE_FULL_CONTENT),
	]);
	database.run('INSERT INTO metadata (key, value) VALUES (?, ?)', [
		'max_snippet_bytes_per_document',
		String(MAX_SNIPPET_BYTES_PER_DOCUMENT),
	]);

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
			insertDocumentTerm(database, '.mustflow/config/commands.toml', effect.path, 'command_effect_path');
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
}

/**
 * mf:anchor cli.index.create
 * purpose: Build the local SQLite index for workflow documents and optional source anchors.
 * search: mf index, local index, sqlite, source anchors, workflow documents
 * invariant: Source anchors are indexed only when source indexing is explicitly requested.
 * risk: cache, config
 */
export async function createLocalIndex(projectRoot: string, options: LocalIndexOptions = {}): Promise<LocalIndexResult> {
	const databasePath = getLocalIndexDatabasePath(projectRoot);
	const documents = collectDocuments(projectRoot);
	const skills = collectSkills(documents);
	const skillRoutes = collectSkillRoutes(projectRoot);
	const commandIntents = collectCommandIntents(projectRoot);
	const includeSource = options.includeSource === true;
	const previousSourceAnchors = includeSource ? await readPreviousSourceAnchorSnapshots(databasePath) : [];
	const sourceAnchors = includeSource ? collectSourceAnchorIndexRecords(projectRoot, previousSourceAnchors) : [];
	const dryRun = options.dryRun === true;

	if (!dryRun) {
		const SQL = await loadSqlJs();
		const database = new SQL.Database();

		createSchema(database);
		populateDatabase(database, documents, skills, skillRoutes, commandIntents, sourceAnchors);
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
		skill_route_count: skillRoutes.length,
		command_intent_count: commandIntents.length,
		command_effect_count: commandIntents.reduce((count, intent) => count + intent.effects.length, 0),
		source_index_enabled: includeSource,
		source_anchor_count: sourceAnchors.length,
		content_mode: LOCAL_INDEX_CONTENT_MODE,
		store_full_content: LOCAL_INDEX_STORE_FULL_CONTENT,
		max_snippet_bytes_per_document: MAX_SNIPPET_BYTES_PER_DOCUMENT,
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
		path: toSearchString(row.path),
		lock: toSearchString(row.lock),
		concurrency: toSearchString(row.concurrency) as NormalizedCommandEffect['concurrency'],
	}));
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
	const results: LocalSearchItem[] = [];

	try {
		const stalePaths = getStalePaths(projectRoot, database);

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

				if (!isMatched([...primaryFields, ...secondaryFields], normalizedQuery)) {
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
							match: getMatchSnippet([...primaryFields, ...secondaryFields], normalizedQuery),
							score: scoreMatch(primaryFields, secondaryFields, normalizedQuery),
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

				if (!isMatched(fields, normalizedQuery)) {
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
							score: scoreMatch([name, pathValue, title], [], normalizedQuery),
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

				if (!isMatched([...primaryFields, ...secondaryFields], normalizedQuery)) {
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
							match: getMatchSnippet([...primaryFields, ...secondaryFields], normalizedQuery),
							score: scoreMatch(primaryFields, secondaryFields, normalizedQuery),
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
				const effectPaths = [...new Set(effects.map((effect) => effect.path))].sort((left, right) =>
					left.localeCompare(right),
				);
				const effectModes = [...new Set(effects.map((effect) => effect.mode))].sort((left, right) =>
					left.localeCompare(right),
				);
				const primaryFields = [name];
				const secondaryFields = [status, lifecycle, runPolicy, description, ...effectLocks, ...effectPaths, ...effectModes];

				if (!isMatched([...primaryFields, ...secondaryFields], normalizedQuery)) {
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
							match: getMatchSnippet([...primaryFields, ...secondaryFields], normalizedQuery),
							score: scoreMatch(primaryFields, secondaryFields, normalizedQuery),
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

				if (!isMatched([...primaryFields, ...secondaryFields], normalizedQuery)) {
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
							match: getMatchSnippet([...primaryFields, ...secondaryFields], normalizedQuery),
							score: scoreMatch(primaryFields, secondaryFields, normalizedQuery),
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
		result_count: sortedResults.length,
		results: sortedResults,
	};
}
