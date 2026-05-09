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
		assert.equal(output.schema_version, '4');
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
		assert.equal(output.schema_version, '4');
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
		assert.equal(metadata.schema_version, '4');
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
`,
		);

		const result = runCli(projectPath, ['index', '--source', '--json']);
		const output = JSON.parse(result.stdout);
		const indexPath = path.join(projectPath, '.mustflow', 'cache', 'mustflow.sqlite');
		const SQL = await loadSqlJs();
		const database = new SQL.Database(readFileSync(indexPath));
		const [anchor] = queryRows(database, 'SELECT * FROM source_anchors WHERE id = "auth.session.resolve"');

		assert.equal(result.status, 0, result.stderr || result.stdout);
		assert.equal(output.schema_version, '4');
		assert.equal(output.source_index_enabled, true);
		assert.equal(output.source_anchor_count, 1);
		assert.equal(anchor.path, 'src/auth.ts');
		assert.equal(anchor.purpose, 'Map verified server session claims to app user context.');
		assert.equal(anchor.search_terms, 'login, session refresh, role mapping, authorization');
		assert.equal(anchor.risk, 'authz, pii');
		assert.equal(anchor.navigation_only, 1);
		assert.equal(anchor.can_instruct_agent, 0);
		assert.equal(Object.hasOwn(anchor, 'source_content'), false);
		database.close();
	} finally {
		removeTempProject(projectPath);
	}
});
