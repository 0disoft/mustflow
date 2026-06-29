import assert from 'node:assert/strict';
import { appendFileSync, mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { test } from 'node:test';
import { createTempProject, initProject, removeTempProject, runCli } from './helpers/cli-harness.js';
import { cloneCachedIndexedProjectFixture, indexProject } from './helpers/local-index-fixtures.js';

function cloneIndexedProject() {
	return cloneCachedIndexedProjectFixture({ variant: 'workflow' }, 'mustflow-search-index-state-indexed-');
}

test('falls back to bounded workflow file search when local index is missing', () => {
	const projectPath = createTempProject();

	try {
		initProject(projectPath);
		const result = runCli(projectPath, ['search', 'mustflow_check', '--json']);

		assert.equal(result.status, 0);
		assert.equal(result.stderr, '');

		const output = JSON.parse(result.stdout);
		assert.equal(output.ok, true);
		assert.equal(output.index_fresh, false);
		assert.equal(output.search_backend, 'table_scan');
		assert.equal(output.search_fts5_available, false);
		assert.equal(
			output.results.some((item) => item.kind === 'document' && item.path === '.mustflow/config/commands.toml'),
			true,
		);
	} finally {
		removeTempProject(projectPath);
	}
});

test('falls back to bounded workflow file search when local index is corrupt', () => {
	const projectPath = createTempProject();

	try {
		initProject(projectPath);
		mkdirSync(path.join(projectPath, '.mustflow', 'cache'), { recursive: true });
		writeFileSync(path.join(projectPath, '.mustflow', 'cache', 'mustflow.sqlite'), 'not a sqlite database');

		const result = runCli(projectPath, ['search', 'mustflow_check', '--json']);

		assert.equal(result.status, 0);
		assert.equal(result.stderr, '');

		const output = JSON.parse(result.stdout);
		assert.equal(output.ok, true);
		assert.equal(output.index_fresh, false);
		assert.equal(output.search_backend, 'table_scan');
		assert.equal(output.search_fts5_available, false);
		assert.equal(
			output.results.some((item) => item.kind === 'document' && item.path === '.mustflow/config/commands.toml'),
			true,
		);
	} finally {
		removeTempProject(projectPath);
	}
});

test('fails when indexed mustflow files changed after indexing', () => {
	const projectPath = cloneIndexedProject();

	try {
		appendFileSync(path.join(projectPath, 'AGENTS.md'), '\n추가 규칙\n');

		const result = runCli(projectPath, ['search', 'mustflow_check', '--json']);

		assert.equal(result.status, 1);
		assert.match(result.stderr, /Local mustflow index is stale/);
		assert.match(result.stderr, /AGENTS\.md/);
		assert.match(result.stderr, /Run `mf index` before searching\./);
		assert.match(result.stderr, /Refresh command: mf index/);
		assert.equal(result.stdout, '');
	} finally {
		removeTempProject(projectPath);
	}
});

test('ignores volatile run-state changes when searching workflow data', () => {
	const projectPath = createTempProject();

	try {
		initProject(projectPath);
		const latestPath = path.join(projectPath, '.mustflow', 'state', 'runs', 'latest.json');
		mkdirSync(path.dirname(latestPath), { recursive: true });
		writeFileSync(latestPath, `${JSON.stringify({ intent: 'local_index', status: 'passed' })}\n`);
		indexProject(projectPath);
		writeFileSync(latestPath, `${JSON.stringify({ intent: 'mustflow_check', status: 'passed' })}\n`);

		const result = runCli(projectPath, ['search', 'mustflow_check', '--json']);

		assert.equal(result.status, 0, result.stderr || result.stdout);
		assert.equal(result.stderr, '');

		const output = JSON.parse(result.stdout);
		assert.equal(output.ok, true);
		assert.equal(output.index_fresh, true);
		assert.equal(
			output.results.some((item) => item.kind === 'command_intent' && item.name === 'mustflow_check'),
			true,
		);
	} finally {
		removeTempProject(projectPath);
	}
});
