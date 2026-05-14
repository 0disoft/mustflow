import assert from 'node:assert/strict';
import { appendFileSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { after, before, test } from 'node:test';
import { cloneProjectFixture, createTempProject, initProject, removeTempProject, runCli } from './helpers/cli-harness.js';
import { indexProject, searchLocalIndexDirect } from './helpers/local-index-fixtures.js';

const expectedMaxSearchMatchSnippetChars = 240;
let indexedProjectFixture;
let sourceIndexedProjectFixture;
let tableScanIndexedProjectFixture;
let indexedProjectMetadata;
let tableScanIndexedProjectMetadata;

function writeSourceAnchor(projectPath) {
	mkdirSync(path.join(projectPath, 'src'), { recursive: true });
	writeFileSync(
		path.join(projectPath, 'src', 'auth.ts'),
		`/**
 * mf:anchor auth.session.resolve
 * purpose: Map verified server session claims to app user context.
 * search: login, session refresh, role mapping, mustflow_check
 * invariant: Do not trust client-provided role values.
 * risk: authz, pii
 */
export function resolveSessionUser() {
	return { ok: true };
}
`,
	);
}

before(() => {
	indexedProjectFixture = createTempProject('mustflow-search-fixture-');
	initProject(indexedProjectFixture);
	indexedProjectMetadata = indexProject(indexedProjectFixture);

	sourceIndexedProjectFixture = createTempProject('mustflow-search-source-fixture-');
	initProject(sourceIndexedProjectFixture);
	writeSourceAnchor(sourceIndexedProjectFixture);
	indexProject(sourceIndexedProjectFixture, ['--source']);

	tableScanIndexedProjectFixture = createTempProject('mustflow-search-table-scan-fixture-');
	initProject(tableScanIndexedProjectFixture);
	tableScanIndexedProjectMetadata = indexProject(tableScanIndexedProjectFixture, [], {
		env: { ...process.env, MUSTFLOW_TEST_DISABLE_FTS5: '1' },
	});
});

after(() => {
	for (const fixture of [indexedProjectFixture, sourceIndexedProjectFixture, tableScanIndexedProjectFixture]) {
		if (fixture) {
			removeTempProject(fixture);
		}
	}
});

function cloneIndexedProject() {
	return cloneProjectFixture(indexedProjectFixture, 'mustflow-search-indexed-');
}

function cloneSourceIndexedProject() {
	return cloneProjectFixture(sourceIndexedProjectFixture, 'mustflow-search-source-indexed-');
}

function cloneTableScanIndexedProject() {
	return cloneProjectFixture(tableScanIndexedProjectFixture, 'mustflow-search-table-scan-indexed-');
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

test('uses fts-backed token matching when the sqlite runtime supports it', async () => {
	const projectPath = cloneIndexedProject();

	try {
		const indexOutput = indexedProjectMetadata;

		if (indexOutput.search_backend !== 'fts5') {
			assert.equal(indexOutput.search_backend, 'table_scan');
			return;
		}

		const output = await searchLocalIndexDirect(projectPath, 'mustflow check');
		const mustflowCheck = output.results.find((item) => item.kind === 'command_intent' && item.name === 'mustflow_check');

		assert.equal(output.search_backend, 'fts5');
		assert.equal(output.search_fts5_available, true);
		assert.ok(mustflowCheck);
	} finally {
		removeTempProject(projectPath);
	}
});

test('falls back to table scan search when fts is unavailable', async () => {
	const projectPath = cloneTableScanIndexedProject();

	try {
		const indexOutput = tableScanIndexedProjectMetadata;
		const output = await searchLocalIndexDirect(projectPath, 'mustflow_check');
		const mustflowCheck = output.results.find((item) => item.kind === 'command_intent' && item.name === 'mustflow_check');

		assert.equal(indexOutput.search_backend, 'table_scan');
		assert.equal(indexOutput.search_fts5_available, false);
		assert.equal(output.search_backend, 'table_scan');
		assert.equal(output.search_fts5_available, false);
		assert.ok(mustflowCheck);
	} finally {
		removeTempProject(projectPath);
	}
});

test('uses n-gram fallback for multilingual queries when fts is unavailable', async () => {
	const projectPath = createTempProject();

	try {
		initProject(projectPath);
		writeFileSync(
			path.join(projectPath, '.mustflow', 'context', 'PROJECT.md'),
			[
				'---',
				'mustflow_doc: context.project',
				'kind: mustflow-context',
				'locale: ko',
				'canonical: false',
				'revision: 1',
				'name: project',
				'authority: contextual',
				'lifecycle: user-editable',
				'---',
				'',
				'# Project Context',
				'',
				'검증상태는 로컬 색인 설명과 분리해서 판단한다.',
				'',
			].join('\n'),
		);
		const env = { ...process.env, MUSTFLOW_TEST_DISABLE_FTS5: '1' };
		indexProject(projectPath, [], { env });

		const output = await searchLocalIndexDirect(projectPath, '검증 상태');
		const projectContext = output.results.find(
			(item) => item.kind === 'document' && item.path === '.mustflow/context/PROJECT.md',
		);

		assert.equal(output.search_backend, 'table_scan');
		assert.ok(projectContext);
		assert.match(projectContext.match, /검증상태/);
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

test('keeps source anchors out of default workflow search results', async () => {
	const projectPath = cloneSourceIndexedProject();

	try {
		const output = await searchLocalIndexDirect(projectPath, 'role mapping');

		assert.equal(output.scope, 'workflow');
		assert.equal(output.results.some((item) => item.kind === 'source_anchor'), false);
	} finally {
		removeTempProject(projectPath);
	}
});

test('searches source anchors only when source scope is requested', async () => {
	const projectPath = cloneSourceIndexedProject();

	try {
		const output = await searchLocalIndexDirect(projectPath, 'role mapping', { scope: 'source' });
		const anchor = output.results.find((item) => item.kind === 'source_anchor');

		assert.equal(output.scope, 'source');
		assert.equal(anchor.anchor_id, 'auth.session.resolve');
		assert.equal(anchor.path, 'src/auth.ts');
		assert.equal(anchor.line_start, 2);
		assert.equal(anchor.authority_rank, 5);
		assert.equal(anchor.authority_label, 'source_navigation_hint');
		assert.equal(anchor.source_scope, 'source');
		assert.equal(anchor.navigation_only, true);
		assert.equal(anchor.can_instruct_agent, false);
		assert.equal(anchor.stale_status, 'valid');
		assert.equal(anchor.stale_confidence, 1);
		assert.equal(anchor.cache_layer, 'task');
		assert.equal(anchor.volatile, false);
	} finally {
		removeTempProject(projectPath);
	}
});

test('keeps workflow authority above source anchors in all-scope search results', async () => {
	const projectPath = cloneSourceIndexedProject();

	try {
		const output = await searchLocalIndexDirect(projectPath, 'mustflow_check', { scope: 'all', limit: 50 });
		const commandIndex = output.results.findIndex(
			(item) => item.kind === 'command_intent' && item.name === 'mustflow_check',
		);
		const anchorIndex = output.results.findIndex(
			(item) => item.kind === 'source_anchor' && item.anchor_id === 'auth.session.resolve',
		);

		assert.equal(output.scope, 'all');
		assert.notEqual(commandIndex, -1);
		assert.notEqual(anchorIndex, -1);
		assert.ok(commandIndex < anchorIndex);
		assert.equal(output.results[commandIndex].authority_label, 'command_contract');
		assert.equal(output.results[anchorIndex].authority_label, 'source_navigation_hint');
		assert.equal(output.results[anchorIndex].navigation_only, true);
		assert.equal(output.results[anchorIndex].can_instruct_agent, false);
	} finally {
		removeTempProject(projectPath);
	}
});

test('keeps command authority above a stronger source-anchor text match', async () => {
	const projectPath = createTempProject();

	try {
		initProject(projectPath);
		const commandsPath = path.join(projectPath, '.mustflow', 'config', 'commands.toml');
		const commandsToml = readFileSync(commandsPath, 'utf8').replace(
			/(\[intents\.mustflow_check\][\s\S]*?description = ")[^"]+(")/u,
			'$1priorityprobe command contract term$2',
		);
		writeFileSync(commandsPath, commandsToml);
		mkdirSync(path.join(projectPath, 'src'), { recursive: true });
		writeFileSync(
			path.join(projectPath, 'src', 'priority.ts'),
			`/**
 * mf:anchor priorityprobe
 * purpose: priorityprobe
 * search: priorityprobe
 * invariant: This source anchor must stay navigation-only.
 */
export const priorityprobe = true;
`,
		);
		indexProject(projectPath, ['--source']);

		const output = await searchLocalIndexDirect(projectPath, 'priorityprobe', { scope: 'all', limit: 50 });
		const commandIndex = output.results.findIndex(
			(item) => item.kind === 'command_intent' && item.name === 'mustflow_check',
		);
		const anchorIndex = output.results.findIndex(
			(item) => item.kind === 'source_anchor' && item.anchor_id === 'priorityprobe',
		);

		assert.notEqual(commandIndex, -1);
		assert.notEqual(anchorIndex, -1);
		assert.ok(output.results[anchorIndex].score > output.results[commandIndex].score);
		assert.ok(commandIndex < anchorIndex);
		assert.equal(output.results[commandIndex].authority_label, 'command_contract');
		assert.equal(output.results[anchorIndex].authority_label, 'source_navigation_hint');
		assert.equal(output.results[anchorIndex].navigation_only, true);
		assert.equal(output.results[anchorIndex].can_instruct_agent, false);
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
