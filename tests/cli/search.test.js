import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { appendFileSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

const projectRoot = path.resolve(fileURLToPath(new URL('../..', import.meta.url)));
const cliPath = path.join(projectRoot, 'dist', 'cli', 'index.js');

function createTempProject() {
	return mkdtempSync(path.join(tmpdir(), 'mustflow-search-'));
}

function removeTempProject(projectPath) {
	rmSync(projectPath, { recursive: true, force: true });
}

function runCli(cwd, args, options = {}) {
	return spawnSync(process.execPath, [cliPath, ...args], {
		cwd,
		encoding: 'utf8',
		env: options.env ?? process.env,
	});
}

function initProject(projectPath) {
	const result = runCli(projectPath, ['init', '--yes']);
	assert.equal(result.status, 0, result.stderr || result.stdout);
}

function indexProject(projectPath, args = [], options = {}) {
	const result = runCli(projectPath, ['index', ...args, '--json'], options);
	assert.equal(result.status, 0, result.stderr || result.stdout);
	return JSON.parse(result.stdout);
}

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
	const projectPath = createTempProject();

	try {
		initProject(projectPath);
		indexProject(projectPath);
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

test('searches skill routes from the local index', () => {
	const projectPath = createTempProject();

	try {
		initProject(projectPath);
		indexProject(projectPath);
		const result = runCli(projectPath, ['search', 'Code changes need review', '--json']);
		const output = JSON.parse(result.stdout);
		const codeReviewRoute = output.results.find((item) => item.kind === 'skill_route' && item.name === 'code-review');

		assert.equal(result.status, 0, result.stderr || result.stdout);
		assert.ok(codeReviewRoute);
		assert.equal(codeReviewRoute.path, '.mustflow/skills/code-review/SKILL.md');
		assert.match(codeReviewRoute.route_trigger, /Code changes need review/);
		assert.ok(codeReviewRoute.verification_intents.includes('test_related'));
	} finally {
		removeTempProject(projectPath);
	}
});

test('searches command effect paths and locks from the local index', () => {
	const projectPath = createTempProject();

	try {
		initProject(projectPath);
		indexProject(projectPath);
		const result = runCli(projectPath, ['search', 'REPO_MAP.md', '--json']);
		const output = JSON.parse(result.stdout);
		const repoMapIntent = output.results.find((item) => item.kind === 'command_intent' && item.name === 'repo_map');

		assert.equal(result.status, 0, result.stderr || result.stdout);
		assert.ok(repoMapIntent);
		assert.deepEqual(repoMapIntent.effect_paths, ['REPO_MAP.md']);
		assert.deepEqual(repoMapIntent.effect_locks, ['path:REPO_MAP.md']);
		assert.deepEqual(repoMapIntent.effect_modes, ['write']);
	} finally {
		removeTempProject(projectPath);
	}
});

test('uses fts-backed token matching when the sqlite runtime supports it', () => {
	const projectPath = createTempProject();

	try {
		initProject(projectPath);
		const indexOutput = indexProject(projectPath);

		if (indexOutput.search_backend !== 'fts5') {
			assert.equal(indexOutput.search_backend, 'table_scan');
			return;
		}

		const result = runCli(projectPath, ['search', 'mustflow check', '--json']);
		const output = JSON.parse(result.stdout);
		const mustflowCheck = output.results.find((item) => item.kind === 'command_intent' && item.name === 'mustflow_check');

		assert.equal(result.status, 0, result.stderr || result.stdout);
		assert.equal(output.search_backend, 'fts5');
		assert.equal(output.search_fts5_available, true);
		assert.ok(mustflowCheck);
	} finally {
		removeTempProject(projectPath);
	}
});

test('falls back to table scan search when fts is unavailable', () => {
	const projectPath = createTempProject();

	try {
		initProject(projectPath);
		const env = { ...process.env, MUSTFLOW_TEST_DISABLE_FTS5: '1' };
		const indexOutput = indexProject(projectPath, [], { env });
		const result = runCli(projectPath, ['search', 'mustflow_check', '--json']);
		const output = JSON.parse(result.stdout);
		const mustflowCheck = output.results.find((item) => item.kind === 'command_intent' && item.name === 'mustflow_check');

		assert.equal(indexOutput.search_backend, 'table_scan');
		assert.equal(indexOutput.search_fts5_available, false);
		assert.equal(result.status, 0, result.stderr || result.stdout);
		assert.equal(output.search_backend, 'table_scan');
		assert.equal(output.search_fts5_available, false);
		assert.ok(mustflowCheck);
	} finally {
		removeTempProject(projectPath);
	}
});

test('uses n-gram fallback for multilingual queries when fts is unavailable', () => {
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

		const result = runCli(projectPath, ['search', '검증 상태', '--json']);
		const output = JSON.parse(result.stdout);
		const projectContext = output.results.find(
			(item) => item.kind === 'document' && item.path === '.mustflow/context/PROJECT.md',
		);

		assert.equal(result.status, 0, result.stderr || result.stdout);
		assert.equal(output.search_backend, 'table_scan');
		assert.ok(projectContext);
		assert.match(projectContext.match, /검증상태/);
	} finally {
		removeTempProject(projectPath);
	}
});

test('keeps source anchors out of default workflow search results', () => {
	const projectPath = createTempProject();

	try {
		initProject(projectPath);
		writeSourceAnchor(projectPath);
		indexProject(projectPath, ['--source']);
		const result = runCli(projectPath, ['search', 'role mapping', '--json']);
		const output = JSON.parse(result.stdout);

		assert.equal(result.status, 0, result.stderr || result.stdout);
		assert.equal(output.scope, 'workflow');
		assert.equal(output.results.some((item) => item.kind === 'source_anchor'), false);
	} finally {
		removeTempProject(projectPath);
	}
});

test('searches source anchors only when source scope is requested', () => {
	const projectPath = createTempProject();

	try {
		initProject(projectPath);
		writeSourceAnchor(projectPath);
		indexProject(projectPath, ['--source']);
		const result = runCli(projectPath, ['search', 'role mapping', '--scope', 'source', '--json']);
		const output = JSON.parse(result.stdout);
		const anchor = output.results.find((item) => item.kind === 'source_anchor');

		assert.equal(result.status, 0, result.stderr || result.stdout);
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

test('keeps workflow authority above source anchors in all-scope search results', () => {
	const projectPath = createTempProject();

	try {
		initProject(projectPath);
		writeSourceAnchor(projectPath);
		indexProject(projectPath, ['--source']);
		const result = runCli(projectPath, ['search', 'mustflow_check', '--scope=all', '--limit', '50', '--json']);
		const output = JSON.parse(result.stdout);
		const commandIndex = output.results.findIndex(
			(item) => item.kind === 'command_intent' && item.name === 'mustflow_check',
		);
		const anchorIndex = output.results.findIndex(
			(item) => item.kind === 'source_anchor' && item.anchor_id === 'auth.session.resolve',
		);

		assert.equal(result.status, 0, result.stderr || result.stdout);
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

test('keeps command authority above a stronger source-anchor text match', () => {
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

		const result = runCli(projectPath, ['search', 'priorityprobe', '--scope=all', '--limit', '50', '--json']);
		const output = JSON.parse(result.stdout);
		const commandIndex = output.results.findIndex(
			(item) => item.kind === 'command_intent' && item.name === 'mustflow_check',
		);
		const anchorIndex = output.results.findIndex(
			(item) => item.kind === 'source_anchor' && item.anchor_id === 'priorityprobe',
		);

		assert.equal(result.status, 0, result.stderr || result.stdout);
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
	const projectPath = createTempProject();

	try {
		initProject(projectPath);
		indexProject(projectPath);
		const result = runCli(projectPath, ['search', 'mustflow_check', '--scope', 'source-code']);

		assert.equal(result.status, 1);
		assert.match(result.stderr, /Unsupported search scope "source-code"/);
	} finally {
		removeTempProject(projectPath);
	}
});

test('prints cache-layer hints for task-scoped search results', () => {
	const projectPath = createTempProject();

	try {
		initProject(projectPath);
		indexProject(projectPath);
		const result = runCli(projectPath, ['search', 'code-review', '--json']);
		const output = JSON.parse(result.stdout);
		const skill = output.results.find((item) => item.kind === 'skill' && item.name === 'code-review');

		assert.equal(result.status, 0, result.stderr || result.stdout);
		assert.equal(skill.cache_layer, 'task');
		assert.equal(skill.volatile, false);
	} finally {
		removeTempProject(projectPath);
	}
});

test('fails when indexed mustflow files changed after indexing', () => {
	const projectPath = createTempProject();

	try {
		initProject(projectPath);
		indexProject(projectPath);
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
	const projectPath = createTempProject();

	try {
		initProject(projectPath);
		indexProject(projectPath);
		const result = runCli(projectPath, ['search', 'code-review', '--limit', '2']);

		assert.equal(result.status, 0, result.stderr || result.stdout);
		assert.match(result.stdout, /mustflow search/);
		assert.match(result.stdout, /\.mustflow\/skills\/code-review\/SKILL\.md/);
	} finally {
		removeTempProject(projectPath);
	}
});
