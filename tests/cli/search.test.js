import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { appendFileSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
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

function indexProject(projectPath, args = []) {
	const result = runCli(projectPath, ['index', ...args, '--json']);
	assert.equal(result.status, 0, result.stderr || result.stdout);
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
		assert.equal(output.schema_version, '6');
		assert.equal(output.command, 'search');
		assert.equal(output.ok, true);
		assert.equal(output.index_fresh, true);
		assert.deepEqual(output.stale_paths, []);
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
		assert.equal(output.results[anchorIndex].navigation_only, true);
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
