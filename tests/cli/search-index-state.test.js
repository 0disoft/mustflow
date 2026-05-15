import assert from 'node:assert/strict';
import { appendFileSync } from 'node:fs';
import path from 'node:path';
import { test } from 'node:test';
import { createTempProject, initProject, removeTempProject, runCli } from './helpers/cli-harness.js';
import { cloneCachedIndexedProjectFixture } from './helpers/local-index-fixtures.js';

function cloneIndexedProject() {
	return cloneCachedIndexedProjectFixture({ variant: 'workflow' }, 'mustflow-search-index-state-indexed-');
}

test('fails clearly when local index is missing', () => {
	const projectPath = createTempProject();

	try {
		initProject(projectPath);
		const result = runCli(projectPath, ['search', 'mustflow_check', '--json']);

		assert.equal(result.status, 1);
		assert.match(result.stderr, /Local mustflow index not found/);
		assert.match(result.stderr, /Run `mf index` before searching\./);
		assert.equal(result.stdout, '');
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
