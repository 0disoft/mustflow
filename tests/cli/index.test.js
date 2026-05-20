import assert from 'node:assert/strict';
import { appendFileSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { test } from 'node:test';
import { createTempProject, removeTempProject, runCli } from './helpers/cli-harness.js';
import {
	cloneCachedIndexedProjectFixture,
	createLocalIndexDirect,
	getCachedIndexedProjectFixture,
	readLatestLocalVerificationReadModelQueriesDirect,
} from './helpers/local-index-fixtures.js';
import { loadSqlJsCached, queryRows } from './helpers/sqlite-assertions.js';

const LOCAL_INDEX_BASE_TABLES = new Set([
	'acceptance_criteria',
	'command_effects',
	'command_intents',
	'command_receipt_summaries',
	'completion_verdict_summaries',
	'criterion_coverage',
	'document_terms',
	'documents',
	'failure_fingerprints',
	'indexed_files',
	'metadata',
	'path_surface_reasons',
	'path_surfaces',
	'search_ngrams',
	'sections',
	'skill_routes',
	'skills',
	'source_anchor_fingerprints',
	'source_anchor_risk_signals',
	'source_anchor_status',
	'source_anchors',
	'repro_observations',
	'repro_routes',
	'verification_coverage_states',
	'verification_evidence_summaries',
	'verification_failure_fingerprints',
	'verification_plans',
	'verification_receipt_summaries',
	'verification_risk_signals',
	'validation_ratchet_signals',
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
	'excluded_raw_data_kinds',
	'index_mode',
	'max_snippet_bytes_per_document',
	'parser_version',
	'schema_version',
	'search_backend',
	'search_fts5_available',
	'search_ngram_max_grams_per_target',
	'search_ngram_max_token_chars',
	'source_index_enabled',
	'source_index_max_file_bytes',
	'source_scope_hash',
	'store_full_content',
];

const LOCAL_INDEX_EXCLUDED_RAW_DATA_KINDS = [
	'full_source_text',
	'raw_diffs',
	'raw_terminal_logs',
	'full_transcripts',
	'hidden_reasoning',
	'environment_values',
	'secrets',
	'personal_data',
	'long_term_memory_summaries',
];

const LOCAL_INDEX_ALLOWED_COLUMNS = {
	acceptance_criteria: ['criterion_id', 'plan_id', 'source', 'statement_hash', 'reason', 'surface', 'path_hash'],
	command_effects: ['intent', 'source', 'access', 'mode', 'path', 'lock', 'concurrency'],
	command_intents: ['name', 'status', 'lifecycle', 'run_policy', 'description'],
	command_receipt_summaries: [
		'receipt_hash',
		'plan_id',
		'intent',
		'status',
		'command_fingerprint',
		'contract_fingerprint',
		'current_state_hash',
		'write_drift_status',
	],
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
	completion_verdict_summaries: [
		'claim_id',
		'plan_id',
		'status',
		'primary_reason',
		'risk_count',
		'contradiction_count',
		'blocker_count',
	],
	criterion_coverage: ['criterion_id', 'plan_id', 'status', 'receipt_count', 'gap_count', 'risk_count'],
	document_terms: ['document_path', 'term', 'source'],
	documents: ['path', 'type', 'title', 'locale', 'revision', 'content_hash', 'content_snippet'],
	failure_fingerprints: [
		'fingerprint',
		'plan_id',
		'failed_intents_hash',
		'risk_codes_hash',
		'seen_count',
		'first_seen_at',
		'last_seen_at',
	],
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
	repro_observations: ['route_id', 'phase', 'outcome', 'receipt_hash', 'diagnostic_fingerprint'],
	repro_routes: ['route_id', 'task_hash', 'route_digest', 'route_kind', 'failure_oracle_hash'],
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
	source_anchor_risk_signals: [
		'anchor_id',
		'path_hash',
		'status',
		'risk_signal',
		'confidence',
		'navigation_only',
		'can_instruct_agent',
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
	verification_coverage_states: [
		'source_path',
		'criterion_id',
		'source',
		'status',
		'requirement_reason',
		'intents',
		'receipt_count',
		'gap_count',
		'source_anchor_count',
	],
	verification_evidence_summaries: [
		'source_path',
		'source_hash',
		'command',
		'kind',
		'status',
		'run_dir',
		'manifest_path',
		'verification_plan_id',
		'completion_status',
		'primary_reason',
		'matched_intents',
		'ran_intents',
		'passed_intents',
		'failed_intents',
		'skipped_intents',
		'receipt_count',
		'coverage_count',
		'remaining_risk_count',
		'failure_fingerprint',
	],
	verification_failure_fingerprints: [
		'source_path',
		'fingerprint',
		'verification_plan_id',
		'status',
		'failed_intents',
		'primary_reason',
		'failed_intents_hash',
		'risk_codes_hash',
		'affected_surfaces_hash',
		'first_seen_at',
		'last_seen_at',
		'seen_count',
		'requires_new_evidence',
	],
	verification_plans: [
		'plan_id',
		'source_path',
		'classification_hash',
		'command_contract_hash',
		'selected_intents_hash',
		'created_at',
		'source_hash',
	],
	verification_receipt_summaries: [
		'source_path',
		'ordinal',
		'intent',
		'status',
		'skipped',
		'verification_plan_id',
		'receipt_path',
		'receipt_sha256',
	],
	verification_risk_signals: ['source_path', 'ordinal', 'code', 'severity', 'detail_hash'],
	validation_ratchet_signals: ['signal_id', 'plan_id', 'code', 'severity', 'path_hash', 'before_hash', 'after_hash'],
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

		assert.equal(output.schema_version, '20');
		assert.equal(output.ok, true);
		assert.equal(output.content_mode, 'metadata_and_snippets');
		assert.equal(output.store_full_content, false);
		assert.equal(output.max_snippet_bytes_per_document, 2048);
		assert.deepEqual(output.excluded_raw_data_kinds, LOCAL_INDEX_EXCLUDED_RAW_DATA_KINDS);
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
		assert.equal(output.verification_evidence_summary_count, 0);
		assert.equal(output.verification_plan_count, 0);
		assert.equal(output.acceptance_criteria_count, 0);
		assert.equal(output.criterion_coverage_count, 0);
		assert.equal(output.verification_receipt_summary_count, 0);
		assert.equal(output.command_receipt_summary_count, 0);
		assert.equal(output.verification_coverage_state_count, 0);
		assert.equal(output.verification_risk_signal_count, 0);
		assert.equal(output.validation_ratchet_signal_count, 0);
		assert.equal(output.completion_verdict_summary_count, 0);
		assert.equal(output.repro_route_count, 0);
		assert.equal(output.repro_observation_count, 0);
		assert.equal(output.failure_fingerprint_count, 0);
		assert.equal(output.source_anchor_risk_signal_count, 0);
		assert.equal(header, 'SQLite format 3\0');
		assertLocalIndexStorageBoundary(database, tableNames, viewNames);
		assert.equal(metadata.schema_version, '20');
		assert.equal(metadata.content_mode, 'metadata_and_snippets');
		assert.equal(metadata.store_full_content, 'false');
		assert.equal(metadata.max_snippet_bytes_per_document, '2048');
		assert.equal(metadata.search_ngram_max_grams_per_target, '512');
		assert.equal(metadata.search_ngram_max_token_chars, '64');
		assert.equal(metadata.source_index_max_file_bytes, '262144');
		assert.equal(metadata.excluded_raw_data_kinds, LOCAL_INDEX_EXCLUDED_RAW_DATA_KINDS.join(','));
		assert.equal(metadata.search_backend, output.search_backend);
		assert.equal(metadata.search_fts5_available, String(output.search_fts5_available));
		assert.equal(metadata.parser_version, '1');
		assert.match(metadata.source_scope_hash, /^sha256:/);
		assert.equal(metadata.source_index_enabled, 'false');
		assert.equal(metadata.index_mode, 'full');
		for (const tableName of [
			'acceptance_criteria',
			'command_effects',
			'command_intents',
			'command_receipt_summaries',
			'completion_verdict_summaries',
			'criterion_coverage',
			'document_terms',
			'documents',
			'failure_fingerprints',
			'indexed_files',
			'metadata',
			'path_surface_reasons',
			'path_surfaces',
			'search_ngrams',
			'sections',
			'skill_routes',
			'skills',
			'source_anchor_fingerprints',
			'source_anchor_risk_signals',
			'source_anchor_status',
			'source_anchors',
			'repro_observations',
			'repro_routes',
			'verification_coverage_states',
			'verification_evidence_summaries',
			'verification_failure_fingerprints',
			'verification_plans',
			'verification_receipt_summaries',
			'verification_risk_signals',
			'validation_ratchet_signals',
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

test('bounds search n-grams for unusually long tokens', async () => {
	const projectPath = createMinimalWorkflowProject('mustflow-index-ngram-limits-');
	const alphabet = 'abcdefghijklmnopqrstuvwxy0123456789';
	const prefixToken = `${'a'.repeat(64)}zzzzzzzzzzzzzzzz`;
	const longTokens = [
		prefixToken,
		...Array.from({ length: 12 }, (_, tokenIndex) =>
			Array.from({ length: 120 }, (_, charIndex) => alphabet[(tokenIndex * 11 + charIndex * 7) % alphabet.length]).join(''),
		),
	];

	try {
		writeFileSync(path.join(projectPath, 'AGENTS.md'), `# AGENTS.md\n\n${longTokens.join(' ')}\n`);

		const result = runCli(projectPath, ['index', '--json']);
		assert.equal(result.status, 0, result.stderr || result.stdout);

		const indexPath = path.join(projectPath, '.mustflow', 'cache', 'mustflow.sqlite');
		const SQL = await loadSqlJsCached();
		const database = new SQL.Database(readFileSync(indexPath));
		const [ngramCount] = queryRows(
			database,
			'SELECT COUNT(*) AS count FROM search_ngrams WHERE target_kind = "document" AND target_key = "AGENTS.md"',
		);
		const [lateGram] = queryRows(
			database,
			'SELECT gram FROM search_ngrams WHERE target_kind = "document" AND target_key = "AGENTS.md" AND gram = ?',
			['zz'],
		);
		const metadata = Object.fromEntries(queryRows(database, 'SELECT key, value FROM metadata').map((row) => [row.key, row.value]));

		assert.ok(ngramCount.count <= 512);
		assert.equal(metadata.search_ngram_max_grams_per_target, '512');
		assert.equal(metadata.search_ngram_max_token_chars, '64');
		assert.equal(lateGram, undefined);
		database.close();
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

test('incremental mode rebuilds when indexed verification evidence changes', async () => {
	const projectPath = createMinimalWorkflowProject('mustflow-index-evidence-incremental-');

	try {
		await createLocalIndexDirect(projectPath);
		mkdirSync(path.join(projectPath, '.mustflow', 'state', 'runs'), { recursive: true });
		writeFileSync(
			path.join(projectPath, '.mustflow', 'state', 'runs', 'latest.json'),
			JSON.stringify(
				{
					schema_version: '1',
					command: 'verify',
					status: 'failed',
					verification_plan_id: 'plan-evidence-incremental',
					evidence_model: {
						verification_plan_id: 'plan-evidence-incremental',
						receipts: [],
						requirements: [],
						coverage_matrix: [],
						remaining_risks: [{ code: 'missing_evidence', severity: 'medium', detail: 'bounded detail' }],
					},
				},
				null,
				2,
			),
		);

		const output = await createLocalIndexDirect(projectPath, { incremental: true });
		const indexPath = path.join(projectPath, '.mustflow', 'cache', 'mustflow.sqlite');
		const SQL = await loadSqlJsCached();
		const database = new SQL.Database(readFileSync(indexPath));
		const [stateIndexedFile] = queryRows(
			database,
			'SELECT source_scope, index_mode FROM indexed_files WHERE path = ".mustflow/state/runs/latest.json"',
		);
		const [riskSignal] = queryRows(
			database,
			'SELECT code, severity FROM verification_risk_signals WHERE source_path = ".mustflow/state/runs/latest.json"',
		);

		assert.equal(output.index_mode, 'incremental');
		assert.equal(output.reused_existing, false);
		assert.equal(output.rebuild_reason, 'file_fingerprint_mismatch');
		assert.equal(output.wrote_files, true);
		assert.equal(output.verification_risk_signal_count, 1);
		assert.deepEqual(stateIndexedFile, {
			source_scope: 'state',
			index_mode: 'incremental',
		});
		assert.deepEqual(riskSignal, {
			code: 'missing_evidence',
			severity: 'medium',
		});
		database.close();
	} finally {
		removeTempProject(projectPath);
	}
});

test('indexes latest verification evidence as bounded read-model summaries', async () => {
	const projectPath = createMinimalWorkflowProject('mustflow-index-verdict-evidence-');

	try {
		mkdirSync(path.join(projectPath, '.mustflow', 'state', 'runs'), { recursive: true });
		writeFileSync(
			path.join(projectPath, '.mustflow', 'state', 'runs', 'latest.json'),
			JSON.stringify(
				{
					schema_version: '1',
					command: 'verify',
					kind: 'verify_run_summary',
					reason: 'code_change',
					reasons: ['code_change'],
					plan_source: null,
					verification_plan_id: 'sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
					status: 'failed',
					completion_verdict: {
						schema_version: '1',
						status: 'contradicted',
						primary_reason: 'one_or_more_selected_verification_intents_failed',
						evidence: {
							source: 'mf_verify',
							verification_plan_id: 'sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
							changed_file_count: 1,
							matched_intents: 1,
							ran_intents: 1,
							passed_intents: 0,
							failed_intents: 1,
							skipped_intents: 0,
							receipt_count: 1,
							gap_count: 0,
							source_anchor_risk_count: 1,
							scope_diff_risk_count: 0,
							repeated_failure_count: 1,
							validation_ratchet_risk_count: 1,
							repro_evidence_risk_count: 0,
							external_evidence_risk_count: 0,
							write_drift_risk_count: 0,
							receipt_binding_risk_count: 0,
							stale_receipt_count: 0,
							plan_mismatch_count: 0,
							risks: {
								source_anchor: 1,
								scope_diff: 0,
								repeated_failure: 1,
								validation_ratchet: 1,
								repro_evidence: 0,
								external_evidence: 0,
								write_drift: 0,
								receipt_binding: 0,
								stale_receipt: 0,
								plan_mismatch: 0,
							},
							receipt_binding: {
								plan_bound_count: 1,
								plan_unbound_count: 0,
								fingerprint_bound_count: 1,
								fingerprint_unbound_count: 0,
								current_state_bound_count: 0,
								current_state_unavailable_count: 1,
								stale_count: 0,
								plan_mismatch_count: 0,
							},
							latest_run_status: 'failed',
						},
						blockers: [],
						contradictions: ['one_or_more_selected_verification_intents_failed'],
						limitations: [],
					},
					failure_fingerprint: {
						schema_version: '1',
						fingerprint: `sha256:${'f'.repeat(64)}`,
						verification_plan_id: 'sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
						failed_intents_hash: `sha256:${'c'.repeat(64)}`,
						exit_code_classes_hash: `sha256:${'1'.repeat(64)}`,
						timeout_flags_hash: `sha256:${'2'.repeat(64)}`,
						error_kinds_hash: `sha256:${'3'.repeat(64)}`,
						diagnostic_hash: `sha256:${'4'.repeat(64)}`,
						risk_codes_hash: `sha256:${'d'.repeat(64)}`,
						affected_surfaces_hash: `sha256:${'e'.repeat(64)}`,
						command_fingerprints_hash: `sha256:${'5'.repeat(64)}`,
					},
					repeated_failure_summary: {
						schema_version: '1',
						fingerprint: `sha256:${'f'.repeat(64)}`,
						verification_plan_id: 'sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
						status: 'failed',
						failed_intents_hash: `sha256:${'c'.repeat(64)}`,
						risk_codes_hash: `sha256:${'d'.repeat(64)}`,
						affected_surfaces_hash: `sha256:${'e'.repeat(64)}`,
						first_seen_at: '2026-05-17T00:00:00.000Z',
						last_seen_at: '2026-05-17T00:01:00.000Z',
						seen_count: 2,
						requires_new_evidence: true,
					},
					repro_evidence: {
						source: 'repro_first_debug',
						authority: 'claim_evidence',
						reported_symptom: 'RAW_REPRO_SYMPTOM_SHOULD_NOT_BE_STORED',
						expected_behavior: 'RAW_REPRO_EXPECTED_SHOULD_NOT_BE_STORED',
						observed_behavior: 'RAW_REPRO_OBSERVED_SHOULD_NOT_BE_STORED',
						reproduction_route: {
							route_id: 'route:index-repro',
							route_kind: 'cli',
							route_digest: `sha256:${'6'.repeat(64)}`,
							failure_oracle_hash: `sha256:${'7'.repeat(64)}`,
							steps: [
								{
									ordinal: 1,
									action: 'RAW_REPRO_ACTION_SHOULD_NOT_BE_STORED',
									target: 'verify fixture',
									input_digest: `sha256:${'8'.repeat(64)}`,
									observation_digest: `sha256:${'9'.repeat(64)}`,
									summary: 'RAW_REPRO_STEP_SHOULD_NOT_BE_STORED',
								},
							],
						},
						before_fix: {
							status: 'reproduced',
							outcome: 'failed_as_expected',
							receipt_path: '.mustflow/state/runs/verify-latest/test_related.json',
							receipt_sha256: 'sha256:bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
							verification_plan_id: 'sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
							summary: 'RAW_BEFORE_FIX_SUMMARY_SHOULD_NOT_BE_STORED',
							reason: null,
						},
						after_fix: {
							status: 'passed',
							outcome: 'passed_expected_behavior',
							same_route_as: 'route:index-repro',
							receipt_path: '.mustflow/state/runs/verify-latest/test_related.json',
							receipt_sha256: 'sha256:bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
							verification_plan_id: 'sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
							summary: 'RAW_AFTER_FIX_SUMMARY_SHOULD_NOT_BE_STORED',
							reason: null,
						},
						regression_guard: {
							status: 'passed',
							intent: 'test_related',
							test_path: null,
							receipt_path: '.mustflow/state/runs/verify-latest/test_related.json',
							receipt_sha256: 'sha256:bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
							verification_plan_id: 'sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
							summary: 'RAW_GUARD_SUMMARY_SHOULD_NOT_BE_STORED',
							reason: null,
						},
					},
					evidence_model: {
						schema_version: '1',
						source: 'mf_verify',
						verification_plan_id: 'sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
						requirements: [],
						coverage_matrix: [
							{
								criterion_id: 'verification_requirement:1:code_change',
								source: 'verification_requirement',
								statement: 'RAW_STATEMENT_MARKER_SHOULD_NOT_BE_STORED',
								status: 'contradicted',
								requirement_reason: 'code_change',
								evidence: {
									intents: ['test_related'],
									receipt_paths: ['.mustflow/state/runs/verify-latest/test_related.json'],
									gap_reasons: ['RAW_GAP_MARKER_SHOULD_NOT_BE_STORED'],
									source_anchor_ids: ['auth.critical'],
								},
							},
						],
						receipts: [
							{
								intent: 'test_related',
								status: 'failed',
								skipped: false,
								verification_plan_id: 'sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
								receipt_path: '.mustflow/state/runs/verify-latest/test_related.json',
								receipt_sha256: 'sha256:bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
								command_fingerprint: 'sha256:cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc',
								contract_fingerprint: 'sha256:dddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddd',
								head_tree_hash: 'sha256:eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee',
								write_drift_status: 'clean',
							},
						],
						skipped_checks: [],
						gaps: [],
						remaining_risks: [
							{
								code: 'source_anchor_invariant_review_required',
								severity: 'high',
								detail: 'RAW_RISK_MARKER_SHOULD_NOT_BE_STORED',
							},
							{
								code: 'assertion_count_decreased',
								severity: 'high',
								path: 'tests/auth.test.ts',
								before_hash: `sha256:${'a'.repeat(64)}`,
								after_hash: `sha256:${'b'.repeat(64)}`,
								detail: 'RAW_VALIDATION_RATCHET_DETAIL_SHOULD_NOT_BE_STORED',
							},
						],
						explanation: {
							verified_by: [],
							downgraded_by: [],
							blocked_by: [],
							contradicted_by: ['one_or_more_selected_verification_intents_failed'],
						},
					},
					summary: {
						matched: 1,
						ran: 1,
						passed: 0,
						failed: 1,
						skipped: 0,
					},
					run_dir: '.mustflow/state/runs/verify-latest',
					manifest_path: '.mustflow/state/runs/verify-latest/manifest.json',
					stdout: {
						tail: 'RAW_STDOUT_MARKER_SHOULD_NOT_BE_STORED',
					},
				},
				null,
				2,
			),
		);

		const output = await createLocalIndexDirect(projectPath);
		const indexPath = path.join(projectPath, '.mustflow', 'cache', 'mustflow.sqlite');
		const SQL = await loadSqlJsCached();
		const database = new SQL.Database(readFileSync(indexPath));
		const [summary] = queryRows(database, 'SELECT * FROM verification_evidence_summaries');
		const [receipt] = queryRows(database, 'SELECT * FROM verification_receipt_summaries');
		const [coverage] = queryRows(database, 'SELECT * FROM verification_coverage_states');
		const [risk] = queryRows(database, 'SELECT * FROM verification_risk_signals');
		const [validationRatchetSignal] = queryRows(database, 'SELECT * FROM validation_ratchet_signals');
		const [fingerprint] = queryRows(database, 'SELECT * FROM verification_failure_fingerprints');
		const [plan] = queryRows(database, 'SELECT * FROM verification_plans');
		const [criterion] = queryRows(database, 'SELECT * FROM acceptance_criteria');
		const [criterionReadModelCoverage] = queryRows(database, 'SELECT * FROM criterion_coverage');
		const [commandReceipt] = queryRows(database, 'SELECT * FROM command_receipt_summaries');
		const [verdictSummary] = queryRows(database, 'SELECT * FROM completion_verdict_summaries');
		const [reproRoute] = queryRows(database, 'SELECT * FROM repro_routes');
		const reproObservations = queryRows(database, 'SELECT * FROM repro_observations ORDER BY phase');
		const [failureReadModel] = queryRows(database, 'SELECT * FROM failure_fingerprints');
		const databaseText = Buffer.from(database.export()).toString('utf8');

		assert.equal(output.schema_version, '20');
		assert.equal(output.verification_evidence_summary_count, 1);
		assert.equal(output.verification_plan_count, 1);
		assert.equal(output.acceptance_criteria_count, 1);
		assert.equal(output.criterion_coverage_count, 1);
		assert.equal(output.verification_receipt_summary_count, 1);
		assert.equal(output.command_receipt_summary_count, 1);
		assert.equal(output.verification_coverage_state_count, 1);
		assert.equal(output.verification_risk_signal_count, 2);
		assert.equal(output.validation_ratchet_signal_count, 1);
		assert.equal(output.completion_verdict_summary_count, 1);
		assert.equal(output.repro_route_count, 1);
		assert.equal(output.repro_observation_count, 3);
		assert.equal(output.failure_fingerprint_count, 1);
		assert.equal(summary.source_path, '.mustflow/state/runs/latest.json');
		assert.match(summary.source_hash, /^sha256:/);
		assert.equal(summary.command, 'verify');
		assert.equal(summary.kind, 'verify_run_summary');
		assert.equal(summary.completion_status, 'contradicted');
		assert.equal(summary.primary_reason, 'one_or_more_selected_verification_intents_failed');
		assert.equal(summary.failed_intents, 1);
		assert.match(summary.failure_fingerprint, /^sha256:/);
		assert.equal(receipt.intent, 'test_related');
		assert.equal(receipt.status, 'failed');
		assert.equal(receipt.skipped, 0);
		assert.equal(receipt.receipt_path, '.mustflow/state/runs/verify-latest/test_related.json');
		assert.equal(coverage.status, 'contradicted');
		assert.equal(coverage.intents, 'test_related');
		assert.equal(coverage.receipt_count, 1);
		assert.equal(coverage.gap_count, 1);
		assert.equal(coverage.source_anchor_count, 1);
		assert.equal(risk.code, 'source_anchor_invariant_review_required');
		assert.equal(risk.severity, 'high');
		assert.match(risk.detail_hash, /^sha256:/);
		assert.equal(fingerprint.failed_intents, 'test_related');
		assert.equal(fingerprint.failed_intents_hash, `sha256:${'c'.repeat(64)}`);
		assert.equal(fingerprint.risk_codes_hash, `sha256:${'d'.repeat(64)}`);
		assert.equal(fingerprint.affected_surfaces_hash, `sha256:${'e'.repeat(64)}`);
		assert.equal(fingerprint.first_seen_at, '2026-05-17T00:00:00.000Z');
		assert.equal(fingerprint.last_seen_at, '2026-05-17T00:01:00.000Z');
		assert.equal(fingerprint.seen_count, 2);
		assert.equal(fingerprint.requires_new_evidence, 1);
		assert.equal(plan.plan_id, 'sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa');
		assert.equal(plan.source_path, '.mustflow/state/runs/latest.json');
		assert.match(plan.classification_hash, /^sha256:/);
		assert.match(plan.command_contract_hash, /^sha256:/);
		assert.match(plan.selected_intents_hash, /^sha256:/);
		assert.match(plan.source_hash, /^sha256:/);
		assert.equal(criterion.criterion_id, 'verification_requirement:1:code_change');
		assert.equal(criterion.plan_id, 'sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa');
		assert.equal(criterion.source, 'verification_requirement');
		assert.match(criterion.statement_hash, /^sha256:/);
		assert.notEqual(criterion.statement_hash, 'RAW_STATEMENT_MARKER_SHOULD_NOT_BE_STORED');
		assert.equal(criterion.reason, 'code_change');
		assert.match(criterion.path_hash, /^sha256:/);
		assert.equal(criterionReadModelCoverage.criterion_id, 'verification_requirement:1:code_change');
		assert.equal(criterionReadModelCoverage.status, 'contradicted');
		assert.equal(criterionReadModelCoverage.receipt_count, 1);
		assert.equal(criterionReadModelCoverage.gap_count, 1);
		assert.equal(criterionReadModelCoverage.risk_count, 1);
		assert.equal(commandReceipt.receipt_hash, 'sha256:bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb');
		assert.equal(commandReceipt.plan_id, 'sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa');
		assert.equal(commandReceipt.intent, 'test_related');
		assert.equal(commandReceipt.status, 'failed');
		assert.equal(commandReceipt.command_fingerprint, 'sha256:cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc');
		assert.equal(commandReceipt.contract_fingerprint, 'sha256:dddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddd');
		assert.equal(commandReceipt.current_state_hash, 'sha256:eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee');
		assert.equal(commandReceipt.write_drift_status, 'clean');
		assert.match(verdictSummary.claim_id, /^sha256:/);
		assert.equal(verdictSummary.plan_id, 'sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa');
		assert.equal(verdictSummary.status, 'contradicted');
		assert.equal(verdictSummary.primary_reason, 'one_or_more_selected_verification_intents_failed');
		assert.equal(verdictSummary.risk_count, 2);
		assert.equal(verdictSummary.contradiction_count, 1);
		assert.equal(verdictSummary.blocker_count, 0);
		assert.equal(reproRoute.route_id, 'route:index-repro');
		assert.match(reproRoute.task_hash, /^sha256:/);
		assert.equal(reproRoute.route_digest, `sha256:${'6'.repeat(64)}`);
		assert.equal(reproRoute.route_kind, 'cli');
		assert.equal(reproRoute.failure_oracle_hash, `sha256:${'7'.repeat(64)}`);
		assert.deepEqual(
			reproObservations.map((observation) => ({
				phase: observation.phase,
				outcome: observation.outcome,
				receipt_hash: observation.receipt_hash,
				diagnostic_fingerprint_matches: /^sha256:/u.test(observation.diagnostic_fingerprint),
			})),
			[
				{
					phase: 'after_fix',
					outcome: 'passed_expected_behavior',
					receipt_hash: 'sha256:bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
					diagnostic_fingerprint_matches: true,
				},
				{
					phase: 'before_fix',
					outcome: 'failed_as_expected',
					receipt_hash: 'sha256:bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
					diagnostic_fingerprint_matches: true,
				},
				{
					phase: 'regression_guard',
					outcome: 'passed',
					receipt_hash: 'sha256:bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
					diagnostic_fingerprint_matches: true,
				},
			],
		);
		assert.equal(failureReadModel.fingerprint, `sha256:${'f'.repeat(64)}`);
		assert.equal(failureReadModel.plan_id, 'sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa');
		assert.equal(failureReadModel.failed_intents_hash, `sha256:${'c'.repeat(64)}`);
		assert.equal(failureReadModel.risk_codes_hash, `sha256:${'d'.repeat(64)}`);
		assert.equal(failureReadModel.seen_count, 2);
		assert.equal(failureReadModel.first_seen_at, '2026-05-17T00:00:00.000Z');
		assert.equal(failureReadModel.last_seen_at, '2026-05-17T00:01:00.000Z');
		assert.match(validationRatchetSignal.signal_id, /^sha256:/);
		assert.equal(validationRatchetSignal.plan_id, 'sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa');
		assert.equal(validationRatchetSignal.code, 'assertion_count_decreased');
		assert.equal(validationRatchetSignal.severity, 'high');
		assert.match(validationRatchetSignal.path_hash, /^sha256:/);
		assert.equal(validationRatchetSignal.before_hash, `sha256:${'a'.repeat(64)}`);
		assert.equal(validationRatchetSignal.after_hash, `sha256:${'b'.repeat(64)}`);
		const readModel = await readLatestLocalVerificationReadModelQueriesDirect(projectPath);
		assert.equal(readModel.authority, 'evidence_only');
		assert.equal(readModel.commandAuthority, '.mustflow/config/commands.toml');
		assert.equal(readModel.grantsCommandAuthority, false);
		assert.equal(readModel.status, 'fresh');
		assert.equal(readModel.planId, 'sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa');
		assert.deepEqual(
			readModel.uncoveredCriteria.map((criterion) => ({
				criterionId: criterion.criterionId,
				coverageStatus: criterion.coverageStatus,
				gapCount: criterion.gapCount,
				riskCount: criterion.riskCount,
			})),
			[
				{
					criterionId: 'verification_requirement:1:code_change',
					coverageStatus: 'contradicted',
					gapCount: 1,
					riskCount: 1,
				},
			],
		);
		assert.deepEqual(
			readModel.severeRisks.map((risk) => risk.code).sort(),
			['assertion_count_decreased', 'source_anchor_invariant_review_required'],
		);
		assert.deepEqual(
			readModel.nonPassingReceipts.map((receipt) => ({
				intent: receipt.intent,
				status: receipt.status,
				writeDriftStatus: receipt.writeDriftStatus,
			})),
			[{ intent: 'test_related', status: 'failed', writeDriftStatus: 'clean' }],
		);
		assert.deepEqual(
			readModel.repeatedFailureFingerprints.map((fingerprint) => ({
				failedIntents: fingerprint.failedIntents,
				seenCount: fingerprint.seenCount,
				requiresNewEvidence: fingerprint.requiresNewEvidence,
			})),
			[{ failedIntents: ['test_related'], seenCount: 2, requiresNewEvidence: true }],
		);
		assert.deepEqual(
			readModel.validationWeakeningSignals.map((signal) => ({
				code: signal.code,
				severity: signal.severity,
				beforeHash: signal.beforeHash,
				afterHash: signal.afterHash,
			})),
			[
				{
					code: 'assertion_count_decreased',
					severity: 'high',
					beforeHash: `sha256:${'a'.repeat(64)}`,
					afterHash: `sha256:${'b'.repeat(64)}`,
				},
			],
		);
		const readModelText = JSON.stringify(readModel);
		assert.equal(readModelText.includes('RAW_RISK_MARKER_SHOULD_NOT_BE_STORED'), false);
		assert.equal(readModelText.includes('RAW_VALIDATION_RATCHET_DETAIL_SHOULD_NOT_BE_STORED'), false);
		assert.equal(readModelText.includes('tests/auth.test.ts'), false);
		assert.equal(databaseText.includes('RAW_STDOUT_MARKER_SHOULD_NOT_BE_STORED'), false);
		assert.equal(databaseText.includes('RAW_GAP_MARKER_SHOULD_NOT_BE_STORED'), false);
		assert.equal(databaseText.includes('RAW_RISK_MARKER_SHOULD_NOT_BE_STORED'), false);
		assert.equal(databaseText.includes('RAW_STATEMENT_MARKER_SHOULD_NOT_BE_STORED'), false);
		assert.equal(databaseText.includes('RAW_REPRO_SYMPTOM_SHOULD_NOT_BE_STORED'), false);
		assert.equal(databaseText.includes('RAW_REPRO_ACTION_SHOULD_NOT_BE_STORED'), false);
		assert.equal(databaseText.includes('RAW_BEFORE_FIX_SUMMARY_SHOULD_NOT_BE_STORED'), false);
		assert.equal(databaseText.includes('RAW_AFTER_FIX_SUMMARY_SHOULD_NOT_BE_STORED'), false);
		assert.equal(databaseText.includes('RAW_GUARD_SUMMARY_SHOULD_NOT_BE_STORED'), false);
		assert.equal(databaseText.includes('RAW_VALIDATION_RATCHET_DETAIL_SHOULD_NOT_BE_STORED'), false);
		assert.equal(databaseText.includes('tests/auth.test.ts'), false);
		database.close();
	} finally {
		removeTempProject(projectPath);
	}
});

test('does not index source anchors unless source indexing is requested', async () => {
	const projectPath = createMinimalWorkflowProject('mustflow-index-source-opt-in-');

	try {
		prepareSourceAnchorProject(projectPath);

		const output = await createLocalIndexDirect(projectPath);
		const indexPath = path.join(projectPath, '.mustflow', 'cache', 'mustflow.sqlite');
		const SQL = await loadSqlJsCached();
		const database = new SQL.Database(readFileSync(indexPath));
		const [anchorCount] = queryRows(database, 'SELECT COUNT(*) AS count FROM source_anchors');
		const [sourceIndexedFileCount] = queryRows(
			database,
			'SELECT COUNT(*) AS count FROM indexed_files WHERE source_scope = "source_anchor"',
		);

		assert.equal(output.source_index_enabled, false);
		assert.equal(output.source_anchor_count, 0);
		assert.equal(anchorCount.count, 0);
		assert.equal(sourceIndexedFileCount.count, 0);
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

		assert.equal(output.schema_version, '20');
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

test('source incremental index reuses unchanged candidate metadata before parsing anchors', async () => {
	const projectPath = createMinimalWorkflowProject('mustflow-index-source-preflight-');

	try {
		mkdirSync(path.join(projectPath, 'src'), { recursive: true });
		writeFileSync(
			path.join(projectPath, 'src', 'with-anchor.ts'),
			`/**
 * mf:anchor source.preflight.cached
 * purpose: Track source index preflight reuse.
 * search: source index preflight
 * invariant: Candidate metadata can prove unchanged source files before parsing.
 * risk: cache
 */
export const cachedAnchor = true;
`,
		);
		writeFileSync(path.join(projectPath, 'src', 'plain.ts'), 'export const plainSource = true;\n');

		const firstOutput = await createLocalIndexDirect(projectPath, { includeSource: true });
		const secondOutput = await createLocalIndexDirect(projectPath, { includeSource: true, incremental: true });
		const indexPath = path.join(projectPath, '.mustflow', 'cache', 'mustflow.sqlite');
		const SQL = await loadSqlJsCached();
		const database = new SQL.Database(readFileSync(indexPath));
		const indexedSourcePaths = queryRows(
			database,
			'SELECT path FROM indexed_files WHERE source_scope = "source_anchor" ORDER BY path',
		).map((row) => row.path);
		const anchorRows = queryRows(database, 'SELECT id, path FROM source_anchors ORDER BY id');

		assert.equal(firstOutput.source_anchor_count, 1);
		assert.equal(secondOutput.index_mode, 'incremental');
		assert.equal(secondOutput.reused_existing, true);
		assert.equal(secondOutput.wrote_files, false);
		assert.equal(secondOutput.rebuild_reason, null);
		assert.equal(secondOutput.source_anchor_count, 1);
		assert.deepEqual(indexedSourcePaths, ['src/plain.ts', 'src/with-anchor.ts']);
		assert.deepEqual(anchorRows, [{ id: 'source.preflight.cached', path: 'src/with-anchor.ts' }]);
		database.close();
	} finally {
		removeTempProject(projectPath);
	}
});

test('source incremental index rebuilds when the candidate source set changes', async () => {
	const projectPath = createMinimalWorkflowProject('mustflow-index-source-candidate-change-');

	try {
		mkdirSync(path.join(projectPath, 'src'), { recursive: true });
		writeFileSync(
			path.join(projectPath, 'src', 'with-anchor.ts'),
			`/**
 * mf:anchor source.preflight.changed-set
 * purpose: Track source index candidate set changes.
 * search: source index candidate set
 * invariant: New candidate source files force a deterministic incremental rebuild.
 * risk: cache
 */
export const changedSetAnchor = true;
`,
		);
		await createLocalIndexDirect(projectPath, { includeSource: true });
		writeFileSync(path.join(projectPath, 'src', 'new-plain.ts'), 'export const newPlainSource = true;\n');

		const output = await createLocalIndexDirect(projectPath, { includeSource: true, incremental: true });
		const indexPath = path.join(projectPath, '.mustflow', 'cache', 'mustflow.sqlite');
		const SQL = await loadSqlJsCached();
		const database = new SQL.Database(readFileSync(indexPath));
		const indexedSourcePaths = queryRows(
			database,
			'SELECT path FROM indexed_files WHERE source_scope = "source_anchor" ORDER BY path',
		).map((row) => row.path);
		const anchorRows = queryRows(database, 'SELECT id, path FROM source_anchors ORDER BY id');

		assert.equal(output.index_mode, 'incremental');
		assert.equal(output.reused_existing, false);
		assert.equal(output.rebuild_reason, 'file_fingerprint_mismatch');
		assert.equal(output.source_anchor_count, 1);
		assert.deepEqual(indexedSourcePaths, ['src/new-plain.ts', 'src/with-anchor.ts']);
		assert.deepEqual(anchorRows, [{ id: 'source.preflight.changed-set', path: 'src/with-anchor.ts' }]);
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

test('applies the default source index file-size ceiling', async () => {
	const projectPath = createMinimalWorkflowProject('mustflow-index-source-hard-limit-');

	try {
		mkdirSync(path.join(projectPath, 'src'), { recursive: true });
		writeFileSync(
			path.join(projectPath, '.mustflow', 'config', 'index.toml'),
			['[source_index]', 'enabled_by_default = true', 'include = ["src/**/*.ts"]', 'allowed_extensions = [".ts"]', ''].join('\n'),
		);
		writeFileSync(
			path.join(projectPath, 'src', 'small.ts'),
			`/**
 * mf:anchor source.default.small
 * purpose: Keep this bounded source anchor.
 * search: default source limit
 * invariant: Default source indexing can read small source files.
 */
export const smallAnchor = true;
`,
		);
		writeFileSync(
			path.join(projectPath, 'src', 'large.ts'),
			`/**
 * mf:anchor source.default.large
 * purpose: This oversized source anchor should be skipped by the default source limit.
 * search: oversized source limit
 * invariant: Default source indexing skips oversized source files.
 */
export const largeAnchor = true;
${'x'.repeat(270000)}
`,
		);

		const result = runCli(projectPath, ['index', '--json']);
		assert.equal(result.status, 0, result.stderr || result.stdout);

		const indexPath = path.join(projectPath, '.mustflow', 'cache', 'mustflow.sqlite');
		const SQL = await loadSqlJsCached();
		const database = new SQL.Database(readFileSync(indexPath));
		const anchorRows = queryRows(database, 'SELECT id, path FROM source_anchors ORDER BY id');
		const [metadataLimit] = queryRows(database, 'SELECT value FROM metadata WHERE key = "source_index_max_file_bytes"');

		assert.deepEqual(anchorRows, [{ id: 'source.default.small', path: 'src/small.ts' }]);
		assert.equal(metadataLimit.value, '262144');
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
		const riskSignals = queryRows(database, 'SELECT * FROM source_anchor_risk_signals ORDER BY anchor_id');

		assert.equal(output.index_mode, 'incremental');
		assert.equal(output.reused_existing, false);
		assert.equal(output.rebuild_reason, 'file_fingerprint_mismatch');
		assert.equal(output.source_anchor_count, 4);
		assert.equal(output.source_anchor_risk_signal_count, 3);
		assert.equal(statuses['docs.helper'].status, 'changed');
		assert.equal(statuses['auth.critical'].status, 'review');
		assert.equal(statuses['auth.critical'].risk_signal, 'high_risk_anchor_requires_review_after_change');
		assert.equal(statuses['moved.target'].status, 'moved');
		assert.equal(statuses['stale.target'].status, 'stale');
		assert.ok(statuses['stale.target'].confidence < 0.5);
		assert.deepEqual(
			riskSignals.map((signal) => ({
				anchor_id: signal.anchor_id,
				status: signal.status,
				risk_signal: signal.risk_signal,
				path_hash_matches: /^sha256:/u.test(signal.path_hash),
				navigation_only: signal.navigation_only,
				can_instruct_agent: signal.can_instruct_agent,
			})),
			[
				{
					anchor_id: 'auth.critical',
					status: 'review',
					risk_signal: 'high_risk_anchor_requires_review_after_change',
					path_hash_matches: true,
					navigation_only: 1,
					can_instruct_agent: 0,
				},
				{
					anchor_id: 'docs.helper',
					status: 'changed',
					risk_signal: 'no_risk_tags',
					path_hash_matches: true,
					navigation_only: 1,
					can_instruct_agent: 0,
				},
				{
					anchor_id: 'stale.target',
					status: 'stale',
					risk_signal: 'previous_risk_tags_only',
					path_hash_matches: true,
					navigation_only: 1,
					can_instruct_agent: 0,
				},
			],
		);
		database.close();
	} finally {
		removeTempProject(projectPath);
	}
});
