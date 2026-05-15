import assert from 'node:assert/strict';
import { writeFileSync } from 'node:fs';
import path from 'node:path';
import { test } from 'node:test';
import { createTempProject, initProject, removeTempProject, runCli } from './helpers/cli-harness.js';
import { cloneCachedIndexedProjectFixture, indexProject, searchLocalIndexDirect } from './helpers/local-index-fixtures.js';

const expectedMaxSearchMatchSnippetChars = 240;

function cloneIndexedProject() {
	return cloneCachedIndexedProjectFixture({ variant: 'workflow' }, 'mustflow-search-output-indexed-');
}

test('keeps search result match snippets bounded for long matching text', async () => {
	const projectPath = createTempProject();

	try {
		initProject(projectPath);
		const longToken = `searchneedle${'x'.repeat(360)}`;
		writeFileSync(
			path.join(projectPath, '.mustflow', 'context', 'PROJECT.md'),
			[
				'---',
				'mustflow_doc: context.project',
				'kind: mustflow-context',
				'locale: en',
				'canonical: true',
				'revision: 1',
				'name: project',
				'authority: contextual',
				'lifecycle: user-editable',
				'---',
				'',
				'# Project Context',
				'',
				`${'Before '.repeat(40)}${longToken}${' after'.repeat(80)}`,
				'TAIL_MARKER_SHOULD_NOT_APPEAR_IN_SEARCH_MATCH',
				'',
			].join('\n'),
		);
		indexProject(projectPath);

		const output = await searchLocalIndexDirect(projectPath, longToken);
		const projectContext = output.results.find(
			(item) => item.kind === 'document' && item.path === '.mustflow/context/PROJECT.md',
		);

		assert.ok(projectContext);
		assert.ok(projectContext.match.length <= expectedMaxSearchMatchSnippetChars);
		assert.equal(projectContext.match.endsWith('...'), true);
		assert.equal(projectContext.match.includes('TAIL_MARKER_SHOULD_NOT_APPEAR_IN_SEARCH_MATCH'), false);
		assert.equal(output.results.every((item) => item.match.length <= expectedMaxSearchMatchSnippetChars), true);
	} finally {
		removeTempProject(projectPath);
	}
});

test('rejects unsupported search scope values', () => {
	const projectPath = cloneIndexedProject();

	try {
		const result = runCli(projectPath, ['search', 'mustflow_check', '--scope', 'source-code']);

		assert.equal(result.status, 1);
		assert.match(result.stderr, /Unsupported search scope "source-code"/);
	} finally {
		removeTempProject(projectPath);
	}
});

test('prints human readable search results with a configurable limit', () => {
	const projectPath = cloneIndexedProject();

	try {
		const result = runCli(projectPath, ['search', 'code-review', '--limit', '2']);

		assert.equal(result.status, 0, result.stderr || result.stdout);
		assert.match(result.stdout, /mustflow search/);
		assert.match(result.stdout, /\.mustflow\/skills\/code-review\/SKILL\.md/);
	} finally {
		removeTempProject(projectPath);
	}
});
