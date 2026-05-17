import assert from 'node:assert/strict';
import { test } from 'node:test';
import { removeTempProject, runCli } from './helpers/cli-harness.js';
import { cloneCachedIndexedProjectFixture, searchLocalIndexDirect } from './helpers/local-index-fixtures.js';

function cloneIndexedProject() {
	return cloneCachedIndexedProjectFixture({ variant: 'workflow' }, 'mustflow-search-indexed-');
}

function assertSearchSemantics(item, expected) {
	assert.equal(item.authority_rank, expected.authority_rank);
	assert.equal(item.authority_label, expected.authority_label);
	assert.equal(item.source_scope, expected.source_scope);
	assert.equal(item.navigation_only, expected.navigation_only);
	assert.equal(item.can_instruct_agent, expected.can_instruct_agent);
	assert.equal(item.cache_layer, expected.cache_layer);
	assert.equal(item.volatile, expected.volatile);
}

test('prints matching documents skills and command intents from the local index', () => {
	const projectPath = cloneIndexedProject();

	try {
		const result = runCli(projectPath, ['search', 'mustflow_check', '--json']);
		const output = JSON.parse(result.stdout);

		assert.equal(result.status, 0, result.stderr || result.stdout);
		assert.equal(output.schema_version, '19');
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

test('preserves authority and cache semantics for workflow search result kinds', async () => {
	const projectPath = cloneIndexedProject();

	try {
		const commandOutput = await searchLocalIndexDirect(projectPath, 'mustflow_check', { limit: 20 });
		const command = commandOutput.results.find((item) => item.kind === 'command_intent' && item.name === 'mustflow_check');
		const authorityDocument = commandOutput.results.find(
			(item) => item.kind === 'document' && item.path === '.mustflow/config/commands.toml',
		);
		const contextOutput = await searchLocalIndexDirect(projectPath, 'Project Context', { limit: 20 });
		const contextDocument = contextOutput.results.find(
			(item) => item.kind === 'document' && item.path === '.mustflow/context/PROJECT.md',
		);
		const skillOutput = await searchLocalIndexDirect(projectPath, 'code-review', { limit: 20 });
		const skill = skillOutput.results.find((item) => item.kind === 'skill' && item.name === 'code-review');
		const routeOutput = await searchLocalIndexDirect(projectPath, 'Code changes need review', { limit: 20 });
		const route = routeOutput.results.find((item) => item.kind === 'skill_route' && item.name === 'code-review');

		assert.ok(command);
		assertSearchSemantics(command, {
			authority_rank: 1,
			authority_label: 'command_contract',
			source_scope: 'workflow',
			navigation_only: false,
			can_instruct_agent: true,
			cache_layer: 'stable',
			volatile: false,
		});
		assert.ok(authorityDocument);
		assertSearchSemantics(authorityDocument, {
			authority_rank: 2,
			authority_label: 'workflow_authority',
			source_scope: 'workflow',
			navigation_only: false,
			can_instruct_agent: true,
			cache_layer: 'stable',
			volatile: false,
		});
		assert.ok(contextDocument);
		assertSearchSemantics(contextDocument, {
			authority_rank: 4,
			authority_label: 'workflow_context',
			source_scope: 'workflow',
			navigation_only: false,
			can_instruct_agent: false,
			cache_layer: 'task',
			volatile: false,
		});
		assert.ok(skill);
		assertSearchSemantics(skill, {
			authority_rank: 3,
			authority_label: 'skill_procedure',
			source_scope: 'workflow',
			navigation_only: false,
			can_instruct_agent: true,
			cache_layer: 'task',
			volatile: false,
		});
		assert.ok(route);
		assertSearchSemantics(route, {
			authority_rank: 3,
			authority_label: 'skill_procedure',
			source_scope: 'workflow',
			navigation_only: false,
			can_instruct_agent: true,
			cache_layer: 'task',
			volatile: false,
		});
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
