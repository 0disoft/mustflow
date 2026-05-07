import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
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
		assert.equal(output.schema_version, '3');
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
		assert.equal(output.schema_version, '3');
		assert.equal(output.ok, true);
		assert.equal(output.content_mode, 'metadata_and_snippets');
		assert.equal(output.store_full_content, false);
		assert.equal(output.max_snippet_bytes_per_document, 2048);
		assert.equal(output.dry_run, false);
		assert.equal(output.wrote_files, true);
		assert.equal(path.resolve(output.database_path), indexPath);
		assert.equal(header, 'SQLite format 3\0');
		assert.equal(metadata.schema_version, '3');
		assert.equal(metadata.content_mode, 'metadata_and_snippets');
		assert.equal(metadata.store_full_content, 'false');
		assert.equal(metadata.max_snippet_bytes_per_document, '2048');
		assert.ok(documentColumns.includes('content_snippet'));
		assert.equal(documentColumns.includes('content'), false);
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
