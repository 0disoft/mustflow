import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

const projectRoot = path.resolve(fileURLToPath(new URL('../..', import.meta.url)));
const cliPath = path.join(projectRoot, 'dist', 'cli', 'index.js');
const require = createRequire(import.meta.url);

async function loadSqlJs() {
	const wasmPath = require.resolve('sql.js/dist/sql-wasm.wasm');
	const sqlJsModule = await import('sql.js');
	const initSqlJs = sqlJsModule.default;

	return initSqlJs({
		locateFile(fileName) {
			return fileName.endsWith('.wasm') ? wasmPath : fileName;
		},
	});
}

function queryRows(database, sql) {
	const [result] = database.exec(sql);

	if (!result) {
		return [];
	}

	return result.values.map((values) => {
		const row = {};

		result.columns.forEach((column, index) => {
			row[column] = values[index] ?? null;
		});

		return row;
	});
}

function createTempProject() {
	return mkdtempSync(path.join(tmpdir(), 'mustflow-index-'));
}

function removeTempProject(projectPath) {
	rmSync(projectPath, { recursive: true, force: true });
}

function runCli(cwd, args) {
	return spawnSync(process.execPath, [cliPath, ...args], {
		cwd,
		encoding: 'utf8',
	});
}

function initProject(projectPath) {
	const result = runCli(projectPath, ['init', '--yes']);
	assert.equal(result.status, 0, result.stderr || result.stdout);
}

test('prints a dry-run local index plan without writing sqlite', () => {
	const projectPath = createTempProject();

	try {
		initProject(projectPath);
		const result = runCli(projectPath, ['index', '--dry-run', '--json']);
		const output = JSON.parse(result.stdout);
		const indexPath = path.join(projectPath, '.mustflow', 'cache', 'mustflow.sqlite');

		assert.equal(result.status, 0, result.stderr || result.stdout);
		assert.equal(output.schema_version, '5');
		assert.equal(output.command, 'index');
		assert.equal(output.ok, true);
		assert.equal(output.content_mode, 'metadata_and_snippets');
		assert.equal(output.store_full_content, false);
		assert.equal(output.max_snippet_bytes_per_document, 2048);
		assert.equal(output.dry_run, true);
		assert.equal(output.wrote_files, false);
		assert.equal(path.resolve(output.database_path), indexPath);
		assert.ok(output.document_count >= 7);
		assert.ok(output.skill_count >= 4);
		assert.ok(output.command_intent_count >= 8);
		assert.equal(output.source_index_enabled, false);
		assert.equal(output.source_anchor_count, 0);
		assert.ok(output.indexed_paths.includes('.mustflow/context/INDEX.md'));
		assert.ok(output.indexed_paths.includes('.mustflow/context/PROJECT.md'));
		assert.equal(existsSync(indexPath), false);
	} finally {
		removeTempProject(projectPath);
	}
});

test('writes a sqlite local index for mustflow documents and command intents', async () => {
	const projectPath = createTempProject();

	try {
		initProject(projectPath);
		const marker = 'TAIL_MARKER_SHOULD_NOT_BE_STORED_IN_FULL';
		writeFileSync(
			path.join(projectPath, '.mustflow', 'context', 'PROJECT.md'),
			`# Project Context\n\n${'A'.repeat(3000)}\n${marker}\n`,
		);
		const result = runCli(projectPath, ['index', '--json']);
		const output = JSON.parse(result.stdout);
		const indexPath = path.join(projectPath, '.mustflow', 'cache', 'mustflow.sqlite');
		const header = readFileSync(indexPath).subarray(0, 16).toString('utf8');
		const SQL = await loadSqlJs();
		const database = new SQL.Database(readFileSync(indexPath));
		const metadata = Object.fromEntries(queryRows(database, 'SELECT key, value FROM metadata').map((row) => [row.key, row.value]));
		const documentColumns = queryRows(database, 'PRAGMA table_info(documents)').map((row) => row.name);
		const [projectContext] = queryRows(
			database,
			'SELECT content_snippet FROM documents WHERE path = ".mustflow/context/PROJECT.md"',
		);
		const [commandTerm] = queryRows(
			database,
			'SELECT term FROM document_terms WHERE document_path = ".mustflow/config/commands.toml" AND term = "mustflow_check"',
		);

		assert.equal(result.status, 0, result.stderr || result.stdout);
		assert.equal(output.schema_version, '5');
		assert.equal(output.ok, true);
		assert.equal(output.content_mode, 'metadata_and_snippets');
		assert.equal(output.store_full_content, false);
		assert.equal(output.max_snippet_bytes_per_document, 2048);
		assert.equal(output.dry_run, false);
		assert.equal(output.wrote_files, true);
		assert.equal(output.source_index_enabled, false);
		assert.equal(output.source_anchor_count, 0);
		assert.equal(path.resolve(output.database_path), indexPath);
		assert.equal(header, 'SQLite format 3\0');
		assert.equal(metadata.schema_version, '5');
		assert.equal(metadata.content_mode, 'metadata_and_snippets');
		assert.equal(metadata.store_full_content, 'false');
		assert.equal(metadata.max_snippet_bytes_per_document, '2048');
		assert.ok(documentColumns.includes('content_snippet'));
		assert.equal(documentColumns.includes('content'), false);
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
		assert.deepEqual(queryRows(database, 'SELECT id FROM source_anchors'), []);
		assert.equal(commandTerm.term, 'mustflow_check');
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

test('indexes source anchors only when source indexing is requested', async () => {
	const projectPath = createTempProject();

	try {
		initProject(projectPath);
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

		const result = runCli(projectPath, ['index', '--source', '--json']);
		const output = JSON.parse(result.stdout);
		const indexPath = path.join(projectPath, '.mustflow', 'cache', 'mustflow.sqlite');
		const SQL = await loadSqlJs();
		const database = new SQL.Database(readFileSync(indexPath));
		const [anchor] = queryRows(database, 'SELECT * FROM source_anchors WHERE id = "auth.session.resolve"');
		const [fingerprint] = queryRows(database, 'SELECT * FROM source_anchor_fingerprints WHERE anchor_id = "auth.session.resolve"');
		const [constFingerprint] = queryRows(database, 'SELECT * FROM source_anchor_fingerprints WHERE anchor_id = "auth.session.mapper"');
		const [classFingerprint] = queryRows(database, 'SELECT * FROM source_anchor_fingerprints WHERE anchor_id = "auth.session.store"');
		const [methodFingerprint] = queryRows(database, 'SELECT * FROM source_anchor_fingerprints WHERE anchor_id = "auth.session.store.get-user"');
		const [status] = queryRows(database, 'SELECT * FROM source_anchor_status WHERE anchor_id = "auth.session.resolve"');

		assert.equal(result.status, 0, result.stderr || result.stdout);
		assert.equal(output.schema_version, '5');
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

test('does not index invalid source anchors and leaves them to strict validation', async () => {
	const projectPath = createTempProject();

	try {
		initProject(projectPath);
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

		const indexResult = runCli(projectPath, ['index', '--source', '--json']);
		const output = JSON.parse(indexResult.stdout);
		const indexPath = path.join(projectPath, '.mustflow', 'cache', 'mustflow.sqlite');
		const SQL = await loadSqlJs();
		const database = new SQL.Database(readFileSync(indexPath));
		const [anchorCount] = queryRows(database, 'SELECT COUNT(*) AS count FROM source_anchors');
		const [statusCount] = queryRows(database, 'SELECT COUNT(*) AS count FROM source_anchor_status');
		const checkResult = runCli(projectPath, ['check', '--strict', '--json']);
		const check = JSON.parse(checkResult.stdout);
		const issueIds = new Set(check.issueDetails.map((issue) => issue.id));

		assert.equal(indexResult.status, 0, indexResult.stderr || indexResult.stdout);
		assert.equal(output.source_index_enabled, true);
		assert.equal(output.source_anchor_count, 0);
		assert.equal(anchorCount.count, 0);
		assert.equal(statusCount.count, 0);
		assert.equal(checkResult.status, 1);
		assert.ok(issueIds.has('mustflow.source_anchor.invalid_format'));
		database.close();
	} finally {
		removeTempProject(projectPath);
	}
});

test('compares source anchor status against the previous fingerprint snapshot', async () => {
	const projectPath = createTempProject();

	try {
		initProject(projectPath);
		mkdirSync(path.join(projectPath, 'src'));
		const sourcePath = path.join(projectPath, 'src', 'anchors.ts');
		writeFileSync(
			sourcePath,
			`/**
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
`,
		);

		const firstIndex = runCli(projectPath, ['index', '--source', '--json']);
		assert.equal(firstIndex.status, 0, firstIndex.stderr || firstIndex.stdout);

		writeFileSync(
			sourcePath,
			`/**
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
`,
		);

		const secondIndex = runCli(projectPath, ['index', '--source', '--json']);
		const output = JSON.parse(secondIndex.stdout);
		const indexPath = path.join(projectPath, '.mustflow', 'cache', 'mustflow.sqlite');
		const SQL = await loadSqlJs();
		const database = new SQL.Database(readFileSync(indexPath));
		const statuses = Object.fromEntries(
			queryRows(database, 'SELECT anchor_id, status, confidence, risk_signal FROM source_anchor_status').map((row) => [
				row.anchor_id,
				row,
			]),
		);

		assert.equal(secondIndex.status, 0, secondIndex.stderr || secondIndex.stdout);
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
