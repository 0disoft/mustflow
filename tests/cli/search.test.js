import assert from 'node:assert/strict';
import { writeFileSync } from 'node:fs';
import path from 'node:path';
import { after, before, test } from 'node:test';
import { cloneProjectFixture, createTempProject, initProject, removeTempProject, runCli } from './helpers/cli-harness.js';
import { indexProject, searchLocalIndexDirect } from './helpers/local-index-fixtures.js';

const expectedMaxSearchMatchSnippetChars = 240;
let indexedProjectFixture;

before(() => {
	indexedProjectFixture = createTempProject('mustflow-search-fixture-');
	initProject(indexedProjectFixture);
	indexProject(indexedProjectFixture);
});

after(() => {
	if (indexedProjectFixture) {
		removeTempProject(indexedProjectFixture);
	}
});

function cloneIndexedProject() {
	return cloneProjectFixture(indexedProjectFixture, 'mustflow-search-indexed-');
}

test('prints matching documents skills and command intents from the local index', () => {
	const projectPath = cloneIndexedProject();

	try {
		const result = runCli(projectPath, ['search', 'mustflow_check', '--json']);
		const output = JSON.parse(result.stdout);

		assert.equal(result.status, 0, result.stderr || result.stdout);
		assert.equal(output.schema_version, '12');
		assert.equal(output.command, 'search');
		assert.equal(output.ok, true);
		assert.equal(output.index_fresh, true);
		assert.deepEqual(output.stale_paths, []);
		assert.ok(['fts5', 'table_scan'].includes(output.search_backend));
		assert.equal(typeof output.search_fts5_available, 'boolean');
		assert.equal(output.query, 'mustflow_check');
		assert.ok(output.result_count > 0);
		assert.ok(
			output.results.some(
				(item) =>
					item.kind === 'command_intent' &&
					item.name === 'mustflow_check' &&
					item.cache_layer === 'stable' &&
					item.volatile === false,
			),
		);
		assert.ok(
			output.results.some(
				(item) =>
					item.kind === 'document' &&
					item.path === '.mustflow/config/commands.toml' &&
					item.cache_layer === 'stable' &&
					item.volatile === false,
			),
		);
	} finally {
		removeTempProject(projectPath);
	}
});

test('searches skill routes from the local index', async () => {
	const projectPath = cloneIndexedProject();

	try {
		const output = await searchLocalIndexDirect(projectPath, 'Code changes need review');
		const codeReviewRoute = output.results.find((item) => item.kind === 'skill_route' && item.name === 'code-review');

		assert.ok(codeReviewRoute);
		assert.equal(codeReviewRoute.path, '.mustflow/skills/code-review/SKILL.md');
		assert.match(codeReviewRoute.route_trigger, /Code changes need review/);
		assert.ok(codeReviewRoute.verification_intents.includes('test_related'));
	} finally {
		removeTempProject(projectPath);
	}
});

test('searches command effect paths and locks from the local index', async () => {
	const projectPath = cloneIndexedProject();

	try {
		const output = await searchLocalIndexDirect(projectPath, 'REPO_MAP.md');
		const repoMapIntent = output.results.find((item) => item.kind === 'command_intent' && item.name === 'repo_map');

		assert.ok(repoMapIntent);
		assert.deepEqual(repoMapIntent.effect_paths, ['REPO_MAP.md']);
		assert.deepEqual(repoMapIntent.effect_locks, ['path:REPO_MAP.md']);
		assert.deepEqual(repoMapIntent.effect_modes, ['write']);
	} finally {
		removeTempProject(projectPath);
	}
});

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

test('prints cache-layer hints for task-scoped search results', async () => {
	const projectPath = cloneIndexedProject();

	try {
		const output = await searchLocalIndexDirect(projectPath, 'code-review');
		const skill = output.results.find((item) => item.kind === 'skill' && item.name === 'code-review');

		assert.equal(skill.cache_layer, 'task');
		assert.equal(skill.volatile, false);
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
