import assert from 'node:assert/strict';
import { appendFileSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { test } from 'node:test';
import { createTempProject, removeTempProject, runCli } from './helpers/cli-harness.js';
import { cloneCachedIndexedProjectFixture, createLocalIndexDirect, getCachedIndexedProjectFixture } from './helpers/local-index-fixtures.js';
import { loadSqlJsCached, queryRows } from './helpers/sqlite-assertions.js';

const LOCAL_INDEX_BASE_TABLES = new Set([
	'command_effects',
	'command_intents',
	'document_terms',
	'documents',
	'indexed_files',
	'metadata',
	'path_surface_reasons',
	'path_surfaces',
	'search_ngrams',
	'sections',
	'skill_routes',
	'skills',
	'source_anchor_fingerprints',
	'source_anchor_status',
	'source_anchors',
]);

const LOCAL_INDEX_VIRTUAL_FTS_TABLES = new Set([
	'search_command_intents_fts',
	'search_documents_fts',
	'search_skill_routes_fts',
	'search_skills_fts',
	'search_source_anchors_fts',
]);

const LOCAL_INDEX_VIEWS = new Set(['command_lock_conflicts', 'command_write_locks']);

const LOCAL_INDEX_METADATA_KEYS = [
	'content_mode',
	'index_mode',
	'max_snippet_bytes_per_document',
	'parser_version',
	'schema_version',
	'search_backend',
	'search_fts5_available',
	'source_index_enabled',
	'source_scope_hash',
	'store_full_content',
];

const LOCAL_INDEX_ALLOWED_COLUMNS = {
	command_effects: ['intent', 'source', 'access', 'mode', 'path', 'lock', 'concurrency'],
	command_intents: ['name', 'status', 'lifecycle', 'run_policy', 'description'],
	command_lock_conflicts: [
		'left_intent',
		'right_intent',
		'lock',
		'left_paths',
		'right_paths',
		'left_modes',
		'right_modes',
		'left_concurrencies',
		'right_concurrencies',
	],
	command_write_locks: ['intent', 'lock', 'paths', 'modes', 'sources', 'concurrencies', 'effect_count'],
	document_terms: ['document_path', 'term', 'source'],
	documents: ['path', 'type', 'title', 'locale', 'revision', 'content_hash', 'content_snippet'],
	indexed_files: ['path', 'source_scope', 'size_bytes', 'mtime_ms', 'content_hash', 'indexed_at', 'index_mode', 'parser_version'],
	metadata: ['key', 'value'],
	path_surface_reasons: ['rule_id', 'reason_kind', 'reason', 'ordinal'],
	path_surfaces: ['rule_id', 'pattern_kind', 'pattern', 'pattern_flags', 'surface_kind', 'category', 'is_public_surface', 'update_policy'],
	search_command_intents_fts: ['name', 'status', 'lifecycle', 'run_policy', 'description', 'effects'],
	search_documents_fts: ['path', 'type', 'title', 'sections', 'terms', 'snippet'],
	search_ngrams: ['target_kind', 'target_key', 'gram', 'source'],
	search_skill_routes_fts: [
		'route_key',
		'skill_name',
		'skill_path',
		'trigger',
		'required_input',
		'edit_scope',
		'risk',
		'verification_intents',
		'expected_output',
	],
	search_skills_fts: ['name', 'path', 'title'],
	search_source_anchors_fts: ['id', 'path', 'purpose', 'search_terms', 'invariant', 'risk'],
	sections: ['document_path', 'ordinal', 'heading'],
	skill_routes: ['skill_name', 'skill_path', 'trigger', 'required_input', 'edit_scope', 'risk', 'verification_intents', 'expected_output'],
	skills: ['name', 'path', 'title'],
	source_anchor_fingerprints: [
		'anchor_id',
		'path',
		'line_start',
		'anchor_metadata_hash',
		'anchor_text_hash',
		'context_hash',
		'search_terms_hash',
		'invariant_hash',
		'risk_hash',
		'symbol_kind',
		'symbol_name',
		'symbol_exported',
		'signature_hash',
		'body_hash',
		'symbol_start_line',
		'symbol_end_line',
	],
	source_anchor_status: [
		'anchor_id',
		'status',
		'confidence',
		'identity_signal',
		'location_signal',
		'symbol_signal',
		'body_signal',
		'metadata_signal',
		'semantic_signal',
		'risk_signal',
		'navigation_only',
		'can_instruct_agent',
	],
	source_anchors: ['id', 'path', 'line_start', 'purpose', 'search_terms', 'invariant', 'risk', 'navigation_only', 'can_instruct_agent'],
};

const LOCAL_INDEX_FORBIDDEN_STORAGE_NAMES = [
	/^api_?key$/u,
	/^chain_of_thought$/u,
	/^chat_?(history|message|messages|transcript)$/u,
	/^command_?(log|logs|output|outputs|transcript|transcripts)$/u,
	/^conversation$/u,
	/^conversation_(history|message|messages|transcript)$/u,
	/^document_content$/u,
	/^env$/u,
	/^env_(value|values|vars?)$/u,
	/^environment$/u,
	/^environment_(value|values|vars?)$/u,
	/^full_(content|source)$/u,
	/^hidden_reasoning$/u,
	/^message$/u,
	/^messages$/u,
	/^password$/u,
	/^raw_(log|logs|stdout|stderr)$/u,
	/^reasoning$/u,
	/^secret$/u,
	/^secrets$/u,
	/^source_(body|content)$/u,
	/^stderr$/u,
	/^stdout$/u,
	/^terminal_(output|transcript)$/u,
	/^token$/u,
	/^tokens$/u,
	/^transcript$/u,
	/^transcripts$/u,
];

function isFtsShadowTableName(tableName) {
	return /^search_(?:command_intents|documents|skill_routes|skills|source_anchors)_fts_(?:data|idx|content|docsize|config)$/u.test(
		tableName,
	);
}

function assertNoForbiddenStorageName(name, context) {
	for (const pattern of LOCAL_INDEX_FORBIDDEN_STORAGE_NAMES) {
		assert.equal(pattern.test(name), false, `${context} must not use forbidden local-index storage name "${name}"`);
	}
}

function assertLocalIndexStorageBoundary(database, tableNames, viewNames) {
	const metadataKeys = queryRows(database, 'SELECT key FROM metadata ORDER BY key').map((row) => row.key);
	assert.deepEqual(metadataKeys, LOCAL_INDEX_METADATA_KEYS, 'metadata keys should stay allowlisted');

	for (const key of metadataKeys) {
		assertNoForbiddenStorageName(key, 'metadata key');
	}

	for (const tableName of tableNames) {
		assert.equal(
			LOCAL_INDEX_BASE_TABLES.has(tableName) || LOCAL_INDEX_VIRTUAL_FTS_TABLES.has(tableName) || isFtsShadowTableName(tableName),
			true,
			`unexpected local-index table "${tableName}"`,
		);
		assertNoForbiddenStorageName(tableName, 'table');
	}

	for (const viewName of viewNames) {
		assert.equal(LOCAL_INDEX_VIEWS.has(viewName), true, `unexpected local-index view "${viewName}"`);
		assertNoForbiddenStorageName(viewName, 'view');
	}

	for (const tableOrViewName of [...LOCAL_INDEX_BASE_TABLES, ...LOCAL_INDEX_VIRTUAL_FTS_TABLES, ...LOCAL_INDEX_VIEWS]) {
		if (!tableNames.includes(tableOrViewName) && !viewNames.includes(tableOrViewName)) {
			continue;
		}

		const actualColumns = queryRows(database, `PRAGMA table_info(${tableOrViewName})`).map((row) => row.name);
		assert.deepEqual(actualColumns, LOCAL_INDEX_ALLOWED_COLUMNS[tableOrViewName], `${tableOrViewName} columns should stay allowlisted`);

		for (const columnName of actualColumns) {
			assertNoForbiddenStorageName(columnName, `${tableOrViewName} column`);
		}
	}
}

function appendCommandGraphFixture(projectPath) {
	appendFileSync(
		path.join(projectPath, '.mustflow', 'config', 'commands.toml'),
		`
[resources.graph_artifact]
type = "path"
paths = ["graph-output/**"]
concurrency = "exclusive_writer"
description = "Graph view test output."

[intents.graph_writer_a]
status = "configured"
lifecycle = "oneshot"
run_policy = "agent_allowed"
description = "Graph writer A."
argv = ["node", "-e", ""]
cwd = "."
timeout_seconds = 10
stdin = "closed"
success_exit_codes = [0]
writes = ["graph-output/"]
effects = [
  { type = "write", mode = "delete_recreate", path = "graph-output/**", lock = "graph_artifact", concurrency = "exclusive" },
]
network = false
destructive = false
required_after = ["graph_view_fixture"]

[intents.graph_writer_b]
status = "configured"
lifecycle = "oneshot"
run_policy = "agent_allowed"
description = "Graph writer B."
argv = ["node", "-e", ""]
cwd = "."
timeout_seconds = 10
stdin = "closed"
success_exit_codes = [0]
writes = ["graph-output/"]
effects = [
  { type = "write", mode = "delete_recreate", path = "graph-output/**", lock = "graph_artifact", concurrency = "exclusive" },
]
network = false
destructive = false
required_after = ["graph_view_fixture"]
`,
	);
}

function prepareGraphIndexedProject(projectPath) {
	appendCommandGraphFixture(projectPath);
	writeFileSync(
		path.join(projectPath, '.mustflow', 'context', 'PROJECT.md'),
		`# Project Context\n\n${'A'.repeat(3000)}\nTAIL_MARKER_SHOULD_NOT_BE_STORED_IN_FULL\n`,
	);
}

function cloneGraphIndexedProject() {
	return cloneCachedIndexedProjectFixture(
		{
			variant: 'workflow-graph-marker',
			prepare: prepareGraphIndexedProject,
			prepareKey: 'graph-marker-v1',
		},
		'mustflow-index-graph-',
	);
}

function cloneWorkflowIndexedProject() {
	return cloneCachedIndexedProjectFixture({ variant: 'workflow' }, 'mustflow-index-workflow-');
}

function createMinimalWorkflowProject(prefix = 'mustflow-index-minimal-') {
	const projectPath = createTempProject(prefix);

	mkdirSync(path.join(projectPath, '.mustflow', 'config'), { recursive: true });
	mkdirSync(path.join(projectPath, '.mustflow', 'context'), { recursive: true });
	mkdirSync(path.join(projectPath, '.mustflow', 'docs'), { recursive: true });
	mkdirSync(path.join(projectPath, '.mustflow', 'skills', 'code-review'), { recursive: true });
	writeFileSync(path.join(projectPath, 'AGENTS.md'), '# AGENTS.md\n\nMinimal workflow root.\n');
	writeFileSync(path.join(projectPath, '.mustflow', 'docs', 'agent-workflow.md'), '# Agent Workflow\n\nMinimal workflow doc.\n');
	writeFileSync(path.join(projectPath, '.mustflow', 'context', 'INDEX.md'), '# Context Index\n\nMinimal context index.\n');
	writeFileSync(path.join(projectPath, '.mustflow', 'context', 'PROJECT.md'), '# Project Context\n\nMinimal project context.\n');
	writeFileSync(
		path.join(projectPath, '.mustflow', 'skills', 'INDEX.md'),
		[
			'# Skills Index',
			'',
			'| Trigger | Skill Document | Required Input | Edit Scope | Risk | Verification Intents | Expected Output |',
			'| --- | --- | --- | --- | --- | --- | --- |',
			'| Code changes need review | `.mustflow/skills/code-review/SKILL.md` | Diff | Changed files | regression | `test_related` | Review note |',
			'',
		].join('\n'),
	);
	writeFileSync(path.join(projectPath, '.mustflow', 'skills', 'code-review', 'SKILL.md'), '# Code Review\n\nReview code changes.\n');
	writeFileSync(
		path.join(projectPath, '.mustflow', 'config', 'commands.toml'),
		[
			'[intents.mustflow_check]',
			'status = "configured"',
			'lifecycle = "oneshot"',
			'run_policy = "agent_allowed"',
			'description = "Minimal mustflow check."',
			'argv = ["node", "-e", ""]',
			'cwd = "."',
			'timeout_seconds = 10',
			'stdin = "closed"',
			'success_exit_codes = [0]',
			'writes = []',
			'effects = []',
			'network = false',
			'destructive = false',
			'required_after = ["workflow_change"]',
			'',
		].join('\n'),
	);

	return projectPath;
}

function prepareSourceAnchorProject(projectPath) {
	mkdirSync(path.join(projectPath, 'src'));
	writeFileSync(
		path.join(projectPath, 'src', 'auth.ts'),
		`/**
 * mf:anchor auth.session.resolve
 * purpose: Map verified server session claims to app user context.
 * search: login, session refresh, role mapping, authorization
 * invariant: Do not trust client-provided role values.
 * risk: authz, pii
 */
export function resolveSessionUser() {
	return null;
}

/**
 * mf:anchor auth.session.mapper
 * purpose: Convert session claims into app state.
 * search: session mapper
 * invariant: Keep the mapper pure.
 */
export const sessionMapper = () => ({});

/**
 * mf:anchor auth.session.store
 * purpose: Store session state in memory.
 * search: session store
 * invariant: Do not persist raw tokens.
 */
class SessionStore {
	/**
	 * mf:anchor auth.session.store.get-user
	 * purpose: Read the current session user.
	 * search: current user
	 * invariant: Keep token values out of the result.
	 */
	getUser() {
		return null;
	}
}
`,
	);
}

function cloneSourceAnchorIndexedProject() {
	return cloneCachedIndexedProjectFixture(
		{
			variant: 'source-anchors',
			indexArgs: ['--source'],
			prepare: prepareSourceAnchorProject,
			prepareKey: 'source-anchors-v1',
		},
		'mustflow-index-source-anchors-',
	);
}

function prepareSourceIndexConfigProject(projectPath) {
	mkdirSync(path.join(projectPath, '.mustflow', 'config'), { recursive: true });
	mkdirSync(path.join(projectPath, 'src', 'kept'), { recursive: true });
	mkdirSync(path.join(projectPath, 'src', 'ignored'), { recursive: true });
	mkdirSync(path.join(projectPath, 'src', 'generated'), { recursive: true });
	writeFileSync(
		path.join(projectPath, '.mustflow', 'config', 'index.toml'),
		[
			'[source_index]',
			'enabled_by_default = true',
			'include = ["src/**/*.ts"]',
			'exclude = ["src/ignored/**", "**/*.generated.ts"]',
			'max_file_bytes = 420',
			'allowed_extensions = [".ts"]',
			'',
		].join('\n'),
	);
	writeFileSync(
		path.join(projectPath, 'src', 'kept', 'anchor.ts'),
		`/**
 * mf:anchor source.config.kept
 * purpose: Keep this configured source anchor.
 * search: configured source scan
 * invariant: Configured source scans remain navigation-only.
 */
export const keptAnchor = true;
`,
	);
	writeFileSync(
		path.join(projectPath, 'src', 'ignored', 'anchor.ts'),
		`/**
 * mf:anchor source.config.ignored
 * purpose: Excluded by configured path.
 * search: ignored source scan
 * invariant: Excluded paths do not enter the local index.
 */
export const ignoredAnchor = true;
`,
	);
	writeFileSync(
		path.join(projectPath, 'src', 'generated', 'client.ts'),
		`/**
 * mf:anchor source.config.generated
 * purpose: Generated paths stay excluded from the local index.
 * search: generated source scan
 * invariant: Generated source anchors do not enter the local index.
 */
export const generatedAnchor = true;
`,
	);
	writeFileSync(
		path.join(projectPath, 'src', 'too-large.ts'),
		`/**
 * mf:anchor source.config.too-large
 * purpose: Oversized source files stay out of the local index.
 * search: large source scan
 * invariant: Maximum file size limits source scanning.
 */
export const tooLargeAnchor = true;
${'x'.repeat(500)}
`,
	);
	writeFileSync(
		path.join(projectPath, 'src', 'javascript.js'),
		`/**
 * mf:anchor source.config.javascript
 * purpose: Disallowed extensions stay out of the local index.
 * search: javascript source scan
 * invariant: Allowed extensions bound source scanning.
 */
export const javascriptAnchor = true;
`,
	);
	writeFileSync(
		path.join(projectPath, 'src', 'excluded.generated.ts'),
		`/**
 * mf:anchor source.config.generated-file
 * purpose: Exclude glob patterns apply after include patterns.
 * search: generated file source scan
 * invariant: Exclude patterns can narrow include patterns.
 */
export const generatedFileAnchor = true;
`,
	);
}

function cloneSourceIndexConfigProject() {
	return cloneCachedIndexedProjectFixture(
		{
			variant: 'source-index-config',
			prepare: prepareSourceIndexConfigProject,
			prepareKey: 'source-index-config-v1',
		},
		'mustflow-index-source-config-',
	);
}

function prepareInvalidSourceAnchorProject(projectPath) {
	mkdirSync(path.join(projectPath, 'src'));
	writeFileSync(
		path.join(projectPath, 'src', 'invalid-anchor.ts'),
		`/**
 * mf:anchor Invalid.Anchor
 * purpose: This malformed anchor should not enter the source index.
 * search: invalid source anchor
 * invariant: Strict validation reports the invalid format.
 */
export const invalidAnchor = true;
`,
	);
	writeFileSync(
		path.join(projectPath, 'src', 'secret-anchor.ts'),
		`/**
 * mf:anchor secrets.local-token
 * purpose: This valid anchor id should still stay out of the source index.
 * search: local token
 * invariant: api_key = "sk-1234567890abcdef"
 * risk: secrets
 */
export const secretAnchor = true;
`,
	);
}

function cloneInvalidSourceAnchorProject() {
	return cloneCachedIndexedProjectFixture(
		{
			variant: 'invalid-source-anchors',
			indexArgs: ['--source'],
			prepare: prepareInvalidSourceAnchorProject,
			prepareKey: 'invalid-source-anchors-v1',
		},
		'mustflow-index-invalid-source-',
	);
}

function prepareSourceAnchorStatusProject(projectPath) {
	mkdirSync(path.join(projectPath, 'src'));
	writeFileSync(path.join(projectPath, 'src', 'anchors.ts'), sourceAnchorStatusInitialSource());
}

function sourceAnchorStatusInitialSource() {
	return `/**
 * mf:anchor docs.helper
 * purpose: Track a low-risk helper.
 * search: helper
 * invariant: Keep helper deterministic.
 */
export function helper() {
	return 1;
}

/**
 * mf:anchor auth.critical
 * purpose: Track a high-risk auth decision.
 * search: auth decision
 * invariant: Never grant access by default.
 * risk: security
 */
export function criticalAuthDecision() {
	return true;
}

/**
 * mf:anchor stale.target
 * purpose: Track an anchor that will disappear.
 * search: stale target
 * invariant: Anchor should become stale when removed.
 */
export function staleTarget() {
	return 'old';
}

/**
 * mf:anchor moved.target
 * purpose: Track a moved function.
 * search: moved target
 * invariant: Moving the function should preserve the target.
 */
export function movedTarget() {
	return 'same';
}
`;
}

function sourceAnchorStatusChangedSource() {
	return `/**
 * mf:anchor docs.helper
 * purpose: Track a low-risk helper.
 * search: helper
 * invariant: Keep helper deterministic.
 */
export function helper() {
	return 2;
}

/**
 * mf:anchor auth.critical
 * purpose: Track a high-risk auth decision.
 * search: auth decision
 * invariant: Never grant access by default.
 * risk: security
 */
export function criticalAuthDecision() {
	return false;
}

const gap = 1;
const anotherGap = gap + 1;

/**
 * mf:anchor moved.target
 * purpose: Track a moved function.
 * search: moved target
 * invariant: Moving the function should preserve the target.
 */
export function movedTarget() {
	return 'same';
}
`;
}

test('writes a sqlite local index for mustflow documents and command intents', async () => {
	const projectPath = cloneGraphIndexedProject();
	const fixture = getCachedIndexedProjectFixture({
		variant: 'workflow-graph-marker',
		prepare: prepareGraphIndexedProject,
		prepareKey: 'graph-marker-v1',
	});

	try {
		const marker = 'TAIL_MARKER_SHOULD_NOT_BE_STORED_IN_FULL';
		const output = fixture.indexOutput;
		const indexPath = path.join(projectPath, '.mustflow', 'cache', 'mustflow.sqlite');
		const header = readFileSync(indexPath).subarray(0, 16).toString('utf8');
		const SQL = await loadSqlJsCached();
		const database = new SQL.Database(readFileSync(indexPath));
		const metadata = Object.fromEntries(queryRows(database, 'SELECT key, value FROM metadata').map((row) => [row.key, row.value]));
		const tableNames = queryRows(database, "SELECT name FROM sqlite_master WHERE type = 'table' ORDER BY name").map((row) => row.name);
		const viewNames = queryRows(database, "SELECT name FROM sqlite_master WHERE type = 'view' ORDER BY name").map((row) => row.name);
		const documentColumns = queryRows(database, 'PRAGMA table_info(documents)').map((row) => row.name);
		const indexedFileColumns = queryRows(database, 'PRAGMA table_info(indexed_files)').map((row) => row.name);
		const [agentsIndexedFile] = queryRows(database, 'SELECT * FROM indexed_files WHERE path = "AGENTS.md"');
		const [projectContext] = queryRows(
			database,
			'SELECT content_snippet FROM documents WHERE path = ".mustflow/context/PROJECT.md"',
		);
		const [commandTerm] = queryRows(
			database,
			'SELECT term FROM document_terms WHERE document_path = ".mustflow/config/commands.toml" AND term = "mustflow_check"',
		);
		const commandNgrams = queryRows(
			database,
			'SELECT gram FROM search_ngrams WHERE target_kind = "command_intent" AND target_key = "mustflow_check" ORDER BY gram',
		).map((row) => row.gram);

		assert.equal(output.schema_version, '12');
		assert.equal(output.ok, true);
		assert.equal(output.content_mode, 'metadata_and_snippets');
		assert.equal(output.store_full_content, false);
		assert.equal(output.max_snippet_bytes_per_document, 2048);
		assert.ok(['fts5', 'table_scan'].includes(output.search_backend));
		assert.equal(typeof output.search_fts5_available, 'boolean');
		assert.equal(output.dry_run, false);
		assert.equal(output.wrote_files, true);
		assert.equal(output.index_mode, 'full');
		assert.equal(output.reused_existing, false);
		assert.equal(output.rebuild_reason, null);
		assert.ok(output.indexed_file_count >= output.document_count);
		assert.equal(output.source_index_enabled, false);
		assert.equal(output.source_anchor_count, 0);
		assert.ok(output.skill_route_count >= 4);
		assert.ok(output.command_effect_count >= 1);
		assert.equal(header, 'SQLite format 3\0');
		assertLocalIndexStorageBoundary(database, tableNames, viewNames);
		assert.equal(metadata.schema_version, '12');
		assert.equal(metadata.content_mode, 'metadata_and_snippets');
		assert.equal(metadata.store_full_content, 'false');
		assert.equal(metadata.max_snippet_bytes_per_document, '2048');
		assert.equal(metadata.search_backend, output.search_backend);
		assert.equal(metadata.search_fts5_available, String(output.search_fts5_available));
		assert.equal(metadata.parser_version, '1');
		assert.match(metadata.source_scope_hash, /^sha256:/);
		assert.equal(metadata.source_index_enabled, 'false');
		assert.equal(metadata.index_mode, 'full');
		for (const tableName of [
			'command_effects',
			'command_intents',
			'document_terms',
			'documents',
			'indexed_files',
			'metadata',
			'path_surface_reasons',
			'path_surfaces',
			'search_ngrams',
			'sections',
			'skill_routes',
			'skills',
			'source_anchor_fingerprints',
			'source_anchor_status',
			'source_anchors',
		]) {
			assert.ok(tableNames.includes(tableName), `${tableName} should exist`);
		}
		if (output.search_backend === 'fts5') {
			for (const tableName of [
				'search_documents_fts',
				'search_skills_fts',
				'search_skill_routes_fts',
				'search_command_intents_fts',
				'search_source_anchors_fts',
			]) {
				assert.ok(tableNames.includes(tableName), `${tableName} should exist`);
			}
		}
		for (const viewName of ['command_lock_conflicts', 'command_write_locks']) {
			assert.ok(viewNames.includes(viewName), `${viewName} should exist`);
		}
		assert.ok(documentColumns.includes('content_snippet'));
		assert.equal(documentColumns.includes('content'), false);
		assert.deepEqual(indexedFileColumns, [
			'path',
			'source_scope',
			'size_bytes',
			'mtime_ms',
			'content_hash',
			'indexed_at',
			'index_mode',
			'parser_version',
		]);
		assert.deepEqual(queryRows(database, 'PRAGMA table_info(source_anchors)').map((row) => row.name), [
			'id',
			'path',
			'line_start',
			'purpose',
			'search_terms',
			'invariant',
			'risk',
			'navigation_only',
			'can_instruct_agent',
		]);
		assert.deepEqual(queryRows(database, 'PRAGMA table_info(source_anchor_fingerprints)').map((row) => row.name), [
			'anchor_id',
			'path',
			'line_start',
			'anchor_metadata_hash',
			'anchor_text_hash',
			'context_hash',
			'search_terms_hash',
			'invariant_hash',
			'risk_hash',
			'symbol_kind',
			'symbol_name',
			'symbol_exported',
			'signature_hash',
			'body_hash',
			'symbol_start_line',
			'symbol_end_line',
		]);
		assert.deepEqual(queryRows(database, 'PRAGMA table_info(source_anchor_status)').map((row) => row.name), [
			'anchor_id',
			'status',
			'confidence',
			'identity_signal',
			'location_signal',
			'symbol_signal',
			'body_signal',
			'metadata_signal',
			'semantic_signal',
			'risk_signal',
			'navigation_only',
			'can_instruct_agent',
		]);
		assert.deepEqual(queryRows(database, 'PRAGMA table_info(command_effects)').map((row) => row.name), [
			'intent',
			'source',
			'access',
			'mode',
			'path',
			'lock',
			'concurrency',
		]);
		assert.deepEqual(queryRows(database, 'PRAGMA table_info(search_ngrams)').map((row) => row.name), [
			'target_kind',
			'target_key',
			'gram',
			'source',
		]);
		assert.deepEqual(queryRows(database, 'PRAGMA table_info(command_write_locks)').map((row) => row.name), [
			'intent',
			'lock',
			'paths',
			'modes',
			'sources',
			'concurrencies',
			'effect_count',
		]);
		assert.deepEqual(queryRows(database, 'PRAGMA table_info(command_lock_conflicts)').map((row) => row.name), [
			'left_intent',
			'right_intent',
			'lock',
			'left_paths',
			'right_paths',
			'left_modes',
			'right_modes',
			'left_concurrencies',
			'right_concurrencies',
		]);
		assert.deepEqual(queryRows(database, 'PRAGMA table_info(path_surfaces)').map((row) => row.name), [
			'rule_id',
			'pattern_kind',
			'pattern',
			'pattern_flags',
			'surface_kind',
			'category',
			'is_public_surface',
			'update_policy',
		]);
		assert.deepEqual(queryRows(database, 'PRAGMA table_info(path_surface_reasons)').map((row) => row.name), [
			'rule_id',
			'reason_kind',
			'reason',
			'ordinal',
		]);
		assert.deepEqual(queryRows(database, 'PRAGMA table_info(skill_routes)').map((row) => row.name), [
			'skill_name',
			'skill_path',
			'trigger',
			'required_input',
			'edit_scope',
			'risk',
			'verification_intents',
			'expected_output',
		]);
		assert.ok(
			queryRows(database, 'SELECT * FROM skill_routes WHERE skill_name = "code-review"').some(
				(row) =>
					String(row.trigger).includes('Code changes need review') &&
					String(row.verification_intents).includes('test_related') &&
					row.skill_path === '.mustflow/skills/code-review/SKILL.md',
			),
		);
		assert.ok(
			queryRows(database, 'SELECT * FROM command_effects WHERE intent = "repo_map"').some(
				(row) =>
					row.source === 'writes' &&
					row.access === 'write' &&
					row.mode === 'write' &&
					row.path === 'REPO_MAP.md' &&
					row.lock === 'path:REPO_MAP.md' &&
					row.concurrency === 'exclusive',
			),
		);
		assert.deepEqual(queryRows(database, 'SELECT * FROM command_write_locks WHERE intent = "repo_map"'), [
			{
				intent: 'repo_map',
				lock: 'path:REPO_MAP.md',
				paths: 'REPO_MAP.md',
				modes: 'write',
				sources: 'writes',
				concurrencies: 'exclusive',
				effect_count: 1,
			},
		]);
		assert.ok(
			queryRows(database, 'SELECT * FROM command_lock_conflicts WHERE lock = "graph_artifact"').some(
				(row) =>
					row.left_intent === 'graph_writer_a' &&
					row.right_intent === 'graph_writer_b' &&
					row.left_paths === 'graph-output/**' &&
					row.right_paths === 'graph-output/**' &&
					row.left_modes === 'delete_recreate' &&
					row.right_modes === 'delete_recreate',
			),
		);
		assert.deepEqual(queryRows(database, 'SELECT * FROM path_surfaces WHERE rule_id = "readme_page"'), [
			{
				rule_id: 'readme_page',
				pattern_kind: 'regexp',
				pattern: '^README\\.md$',
				pattern_flags: 'u',
				surface_kind: 'readme_page',
				category: 'documentation',
				is_public_surface: 1,
				update_policy: 'update',
			},
		]);
		assert.deepEqual(
			queryRows(
				database,
				'SELECT reason FROM path_surface_reasons WHERE rule_id = "readme_page" AND reason_kind = "validation_reason" ORDER BY ordinal',
			).map((row) => row.reason),
			['docs_change', 'copy_change'],
		);
		assert.ok(
			queryRows(
				database,
				'SELECT reason FROM path_surface_reasons WHERE rule_id = "workflow_root" AND reason_kind = "affected_contract"',
			).some((row) => row.reason === 'command contract'),
		);
		assert.deepEqual(queryRows(database, 'SELECT id FROM source_anchors'), []);
		assert.equal(commandTerm.term, 'mustflow_check');
		assert.ok(commandNgrams.includes('mus'));
		assert.ok(commandNgrams.includes('che'));
		assert.equal(agentsIndexedFile.source_scope, 'workflow');
		assert.equal(typeof agentsIndexedFile.size_bytes, 'number');
		assert.equal(typeof agentsIndexedFile.mtime_ms, 'number');
		assert.match(agentsIndexedFile.content_hash, /^sha256:/);
		assert.match(agentsIndexedFile.indexed_at, /^\d{4}-\d{2}-\d{2}T/u);
		assert.equal(agentsIndexedFile.index_mode, 'full');
		assert.equal(agentsIndexedFile.parser_version, '1');
		assert.ok(projectContext.content_snippet.length <= 2048);
		assert.equal(projectContext.content_snippet.includes(marker), false);
		assert.ok(output.indexed_paths.includes('AGENTS.md'));
		assert.ok(output.indexed_paths.includes('.mustflow/context/INDEX.md'));
		assert.ok(output.indexed_paths.includes('.mustflow/context/PROJECT.md'));
		assert.ok(output.indexed_paths.includes('.mustflow/config/commands.toml'));
		assert.ok(output.indexed_paths.includes('.mustflow/skills/code-review/SKILL.md'));
		database.close();
	} finally {
		removeTempProject(projectPath);
	}
});

test('reuses a fresh sqlite local index in incremental mode', async () => {
	const projectPath = cloneWorkflowIndexedProject();

	try {
		const indexPath = path.join(projectPath, '.mustflow', 'cache', 'mustflow.sqlite');
		const firstBytes = readFileSync(indexPath).toString('base64');
		const secondOutput = await createLocalIndexDirect(projectPath, { incremental: true });
		const secondBytes = readFileSync(indexPath).toString('base64');

		assert.equal(secondOutput.index_mode, 'incremental');
		assert.equal(secondOutput.reused_existing, true);
		assert.equal(secondOutput.rebuild_reason, null);
		assert.equal(secondOutput.wrote_files, false);
		assert.equal(secondBytes, firstBytes);
	} finally {
		removeTempProject(projectPath);
	}
});

test('incremental mode rebuilds when indexed workflow files change', async () => {
	const projectPath = createMinimalWorkflowProject();

	try {
		await createLocalIndexDirect(projectPath);
		writeFileSync(
			path.join(projectPath, '.mustflow', 'context', 'INDEX.md'),
			'# Context Index\n\nChanged incremental marker.\n',
		);
		writeFileSync(path.join(projectPath, '.mustflow', 'context', 'EXTRA.md'), '# Extra Context\n\nNew context file.\n');
		rmSync(path.join(projectPath, '.mustflow', 'context', 'PROJECT.md'), { force: true });

		const output = await createLocalIndexDirect(projectPath, { incremental: true });
		const indexPath = path.join(projectPath, '.mustflow', 'cache', 'mustflow.sqlite');
		const SQL = await loadSqlJsCached();
		const database = new SQL.Database(readFileSync(indexPath));
		const [contextIndex] = queryRows(
			database,
			'SELECT content_snippet FROM documents WHERE path = ".mustflow/context/INDEX.md"',
		);
		const [extraContext] = queryRows(database, 'SELECT path FROM documents WHERE path = ".mustflow/context/EXTRA.md"');
		const [deletedProjectContext] = queryRows(
			database,
			'SELECT path FROM documents WHERE path = ".mustflow/context/PROJECT.md"',
		);
		const [extraIndexedFile] = queryRows(
			database,
			'SELECT source_scope, index_mode, parser_version FROM indexed_files WHERE path = ".mustflow/context/EXTRA.md"',
		);
		const [deletedIndexedFile] = queryRows(
			database,
			'SELECT path FROM indexed_files WHERE path = ".mustflow/context/PROJECT.md"',
		);

		assert.equal(output.index_mode, 'incremental');
		assert.equal(output.reused_existing, false);
		assert.equal(output.rebuild_reason, 'file_fingerprint_mismatch');
		assert.equal(output.wrote_files, true);
		assert.match(contextIndex.content_snippet, /Changed incremental marker/u);
		assert.equal(extraContext.path, '.mustflow/context/EXTRA.md');
		assert.equal(deletedProjectContext, undefined);
		assert.deepEqual(extraIndexedFile, {
			source_scope: 'workflow',
			index_mode: 'incremental',
			parser_version: '1',
		});
		assert.equal(deletedIndexedFile, undefined);
		database.close();
	} finally {
		removeTempProject(projectPath);
	}
});

test('indexes source anchors only when source indexing is requested', async () => {
	const projectPath = cloneSourceAnchorIndexedProject();
	const fixture = getCachedIndexedProjectFixture({
		variant: 'source-anchors',
		indexArgs: ['--source'],
		prepare: prepareSourceAnchorProject,
		prepareKey: 'source-anchors-v1',
	});

	try {
		const output = fixture.indexOutput;
		const indexPath = path.join(projectPath, '.mustflow', 'cache', 'mustflow.sqlite');
		const SQL = await loadSqlJsCached();
		const database = new SQL.Database(readFileSync(indexPath));
		const [anchor] = queryRows(database, 'SELECT * FROM source_anchors WHERE id = "auth.session.resolve"');
		const [fingerprint] = queryRows(database, 'SELECT * FROM source_anchor_fingerprints WHERE anchor_id = "auth.session.resolve"');
		const [constFingerprint] = queryRows(database, 'SELECT * FROM source_anchor_fingerprints WHERE anchor_id = "auth.session.mapper"');
		const [classFingerprint] = queryRows(database, 'SELECT * FROM source_anchor_fingerprints WHERE anchor_id = "auth.session.store"');
		const [methodFingerprint] = queryRows(database, 'SELECT * FROM source_anchor_fingerprints WHERE anchor_id = "auth.session.store.get-user"');
		const [status] = queryRows(database, 'SELECT * FROM source_anchor_status WHERE anchor_id = "auth.session.resolve"');

		assert.equal(output.schema_version, '12');
		assert.equal(output.source_index_enabled, true);
		assert.equal(output.source_anchor_count, 4);
		assert.equal(anchor.path, 'src/auth.ts');
		assert.equal(anchor.purpose, 'Map verified server session claims to app user context.');
		assert.equal(anchor.search_terms, 'login, session refresh, role mapping, authorization');
		assert.equal(anchor.risk, 'authz, pii');
		assert.equal(anchor.navigation_only, 1);
		assert.equal(anchor.can_instruct_agent, 0);
		assert.match(fingerprint.anchor_metadata_hash, /^sha256:/);
		assert.match(fingerprint.anchor_text_hash, /^sha256:/);
		assert.match(fingerprint.context_hash, /^sha256:/);
		assert.equal(fingerprint.symbol_kind, 'function');
		assert.equal(fingerprint.symbol_name, 'resolveSessionUser');
		assert.equal(fingerprint.symbol_exported, 1);
		assert.match(fingerprint.signature_hash, /^sha256:/);
		assert.match(fingerprint.body_hash, /^sha256:/);
		assert.equal(fingerprint.symbol_start_line, 8);
		assert.equal(fingerprint.symbol_end_line, 10);
		assert.equal(constFingerprint.symbol_kind, 'const');
		assert.equal(constFingerprint.symbol_name, 'sessionMapper');
		assert.equal(constFingerprint.symbol_exported, 1);
		assert.equal(classFingerprint.symbol_kind, 'class');
		assert.equal(classFingerprint.symbol_name, 'SessionStore');
		assert.equal(classFingerprint.symbol_exported, 0);
		assert.equal(methodFingerprint.symbol_kind, 'method');
		assert.equal(methodFingerprint.symbol_name, 'getUser');
		assert.equal(methodFingerprint.symbol_exported, 1);
		assert.equal(status.status, 'valid');
		assert.equal(status.confidence, 1);
		assert.equal(status.identity_signal, 'current_anchor_id_valid');
		assert.equal(status.symbol_signal, 'current_symbol_fingerprinted');
		assert.equal(status.body_signal, 'current_body_fingerprinted');
		assert.equal(status.navigation_only, 1);
		assert.equal(status.can_instruct_agent, 0);
		assert.equal(Object.hasOwn(anchor, 'source_content'), false);
		database.close();
	} finally {
		removeTempProject(projectPath);
	}
});

test('uses index config to bound source anchor scanning', async () => {
	const projectPath = cloneSourceIndexConfigProject();
	const fixture = getCachedIndexedProjectFixture({
		variant: 'source-index-config',
		prepare: prepareSourceIndexConfigProject,
		prepareKey: 'source-index-config-v1',
	});

	try {
		const output = fixture.indexOutput;
		const indexPath = path.join(projectPath, '.mustflow', 'cache', 'mustflow.sqlite');
		const SQL = await loadSqlJsCached();
		const database = new SQL.Database(readFileSync(indexPath));
		const anchorRows = queryRows(database, 'SELECT id, path, navigation_only, can_instruct_agent FROM source_anchors ORDER BY id');

		assert.equal(output.source_index_enabled, true);
		assert.equal(output.source_anchor_count, 1);
		assert.deepEqual(anchorRows, [
			{
				id: 'source.config.kept',
				path: 'src/kept/anchor.ts',
				navigation_only: 1,
				can_instruct_agent: 0,
			},
		]);
		database.close();
	} finally {
		removeTempProject(projectPath);
	}
});

test('does not index invalid source anchors and leaves them to strict validation', async () => {
	const projectPath = cloneInvalidSourceAnchorProject();
	const fixture = getCachedIndexedProjectFixture({
		variant: 'invalid-source-anchors',
		indexArgs: ['--source'],
		prepare: prepareInvalidSourceAnchorProject,
		prepareKey: 'invalid-source-anchors-v1',
	});

	try {
		const output = fixture.indexOutput;
		const indexPath = path.join(projectPath, '.mustflow', 'cache', 'mustflow.sqlite');
		const SQL = await loadSqlJsCached();
		const database = new SQL.Database(readFileSync(indexPath));
		const [anchorCount] = queryRows(database, 'SELECT COUNT(*) AS count FROM source_anchors');
		const [statusCount] = queryRows(database, 'SELECT COUNT(*) AS count FROM source_anchor_status');
		const checkResult = runCli(projectPath, ['check', '--strict', '--json']);
		const check = JSON.parse(checkResult.stdout);
		const issueIds = new Set(check.issueDetails.map((issue) => issue.id));

		assert.equal(output.source_index_enabled, true);
		assert.equal(output.source_anchor_count, 0);
		assert.equal(anchorCount.count, 0);
		assert.equal(statusCount.count, 0);
		assert.equal(checkResult.status, 1);
		assert.ok(issueIds.has('mustflow.source_anchor.invalid_format'));
		assert.ok(issueIds.has('mustflow.source_anchor.secret_like'));
		database.close();
	} finally {
		removeTempProject(projectPath);
	}
});

test('compares source anchor status against the previous fingerprint snapshot', async () => {
	const projectPath = createMinimalWorkflowProject('mustflow-index-source-status-');

	try {
		prepareSourceAnchorStatusProject(projectPath);
		await createLocalIndexDirect(projectPath, { includeSource: true });
		const sourcePath = path.join(projectPath, 'src', 'anchors.ts');
		writeFileSync(sourcePath, sourceAnchorStatusChangedSource());

		const output = await createLocalIndexDirect(projectPath, { includeSource: true, incremental: true });
		const indexPath = path.join(projectPath, '.mustflow', 'cache', 'mustflow.sqlite');
		const SQL = await loadSqlJsCached();
		const database = new SQL.Database(readFileSync(indexPath));
		const statuses = Object.fromEntries(
			queryRows(database, 'SELECT anchor_id, status, confidence, risk_signal FROM source_anchor_status').map((row) => [
				row.anchor_id,
				row,
			]),
		);

		assert.equal(output.index_mode, 'incremental');
		assert.equal(output.reused_existing, false);
		assert.equal(output.rebuild_reason, 'file_fingerprint_mismatch');
		assert.equal(output.source_anchor_count, 4);
		assert.equal(statuses['docs.helper'].status, 'changed');
		assert.equal(statuses['auth.critical'].status, 'review');
		assert.equal(statuses['auth.critical'].risk_signal, 'high_risk_anchor_requires_review_after_change');
		assert.equal(statuses['moved.target'].status, 'moved');
		assert.equal(statuses['stale.target'].status, 'stale');
		assert.ok(statuses['stale.target'].confidence < 0.5);
		database.close();
	} finally {
		removeTempProject(projectPath);
	}
});
