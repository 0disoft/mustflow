import assert from 'node:assert/strict';
import { appendFileSync, mkdirSync, readFileSync, rmSync, statSync, utimesSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { createTempProject, removeTempProject, runCli } from './helpers/cli-harness.js';
import {
	cloneCachedIndexedProjectFixture,
	createLocalIndexDirect,
	getCachedIndexedProjectFixture,
	readLatestLocalVerificationReadModelQueriesDirect,
} from './helpers/local-index-fixtures.js';
import { loadSqlJsCached, queryRows } from './helpers/sqlite-assertions.js';

export const LOCAL_INDEX_BASE_TABLES = new Set([
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

export const LOCAL_INDEX_VIRTUAL_FTS_TABLES = new Set([
	'search_command_intents_fts',
	'search_documents_fts',
	'search_skill_routes_fts',
	'search_skills_fts',
	'search_source_anchors_fts',
]);

export const LOCAL_INDEX_VIEWS = new Set(['command_lock_conflicts', 'command_write_locks']);

export const LOCAL_INDEX_METADATA_KEYS = [
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

export const LOCAL_INDEX_EXCLUDED_RAW_DATA_KINDS = [
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

export const LOCAL_INDEX_ALLOWED_COLUMNS = {
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

export const LOCAL_INDEX_FORBIDDEN_STORAGE_NAMES = [
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

export function isFtsShadowTableName(tableName) {
	return /^search_(?:command_intents|documents|skill_routes|skills|source_anchors)_fts_(?:data|idx|content|docsize|config)$/u.test(
		tableName,
	);
}

export function assertNoForbiddenStorageName(name, context) {
	for (const pattern of LOCAL_INDEX_FORBIDDEN_STORAGE_NAMES) {
		assert.equal(pattern.test(name), false, `${context} must not use forbidden local-index storage name "${name}"`);
	}
}

export function assertLocalIndexStorageBoundary(database, tableNames, viewNames) {
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

export function appendCommandGraphFixture(projectPath) {
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

export function prepareGraphIndexedProject(projectPath) {
	appendCommandGraphFixture(projectPath);
	writeFileSync(
		path.join(projectPath, '.mustflow', 'context', 'PROJECT.md'),
		`# Project Context\n\n${'A'.repeat(3000)}\nTAIL_MARKER_SHOULD_NOT_BE_STORED_IN_FULL\n`,
	);
}

export function cloneGraphIndexedProject() {
	return cloneCachedIndexedProjectFixture(
		{
			variant: 'workflow-graph-marker',
			prepare: prepareGraphIndexedProject,
			prepareKey: 'graph-marker-v1',
		},
		'mustflow-index-graph-',
	);
}

export function cloneWorkflowIndexedProject() {
	return cloneCachedIndexedProjectFixture({ variant: 'workflow' }, 'mustflow-index-workflow-');
}

export function createMinimalWorkflowProject(prefix = 'mustflow-index-minimal-') {
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

export function prepareSourceAnchorProject(projectPath) {
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

export function cloneSourceAnchorIndexedProject() {
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

export function prepareSourceIndexConfigProject(projectPath) {
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

export function cloneSourceIndexConfigProject() {
	return cloneCachedIndexedProjectFixture(
		{
			variant: 'source-index-config',
			prepare: prepareSourceIndexConfigProject,
			prepareKey: 'source-index-config-v1',
		},
		'mustflow-index-source-config-',
	);
}

export function prepareInvalidSourceAnchorProject(projectPath) {
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

export function cloneInvalidSourceAnchorProject() {
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

export function prepareSourceAnchorStatusProject(projectPath) {
	mkdirSync(path.join(projectPath, 'src'));
	writeFileSync(path.join(projectPath, 'src', 'anchors.ts'), sourceAnchorStatusInitialSource());
}

export function sourceAnchorStatusInitialSource() {
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

export function sourceAnchorStatusChangedSource() {
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

export {
	cloneCachedIndexedProjectFixture,
	createLocalIndexDirect,
	createTempProject,
	getCachedIndexedProjectFixture,
	loadSqlJsCached,
	queryRows,
	readLatestLocalVerificationReadModelQueriesDirect,
	removeTempProject,
	runCli,
};
