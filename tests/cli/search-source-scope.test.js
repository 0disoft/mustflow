import assert from 'node:assert/strict';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { test } from 'node:test';
import { createTempProject, initProject, removeTempProject } from './helpers/cli-harness.js';
import { cloneCachedIndexedProjectFixture, indexProject, searchLocalIndexDirect } from './helpers/local-index-fixtures.js';

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

function cloneSourceIndexedProject() {
	return cloneCachedIndexedProjectFixture(
		{
			variant: 'source-anchor-v1',
			indexArgs: ['--source'],
			prepareKey: 'auth-session-source-anchor-v1',
			prepare: writeSourceAnchor,
		},
		'mustflow-search-source-indexed-',
	);
}

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
