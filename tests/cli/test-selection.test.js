import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

const projectRoot = path.resolve(fileURLToPath(new URL('../..', import.meta.url)));

function selectRelated(changedFiles) {
	const result = spawnSync(process.execPath, ['scripts/run-cli-tests.mjs', 'related', '--list'], {
		cwd: projectRoot,
		encoding: 'utf8',
		env: {
			...process.env,
			MUSTFLOW_TEST_CHANGED_FILES: JSON.stringify(changedFiles),
		},
	});

	assert.equal(result.status, 0, result.stderr || result.stdout);
	return JSON.parse(result.stdout);
}

function selectedFor(changedFiles) {
	return new Set(selectRelated(changedFiles).selected);
}

test('related selection uses explicit command test contracts', () => {
	const selected = selectedFor(['src/cli/commands/verify.ts']);

	assert.equal(selected.has('verify.test.js'), true);
	assert.equal(selected.has('explain-verify.test.js'), true);
	assert.equal(selected.has('router.test.js'), true);
	assert.equal(selected.has('schema.test.js'), true);
	assert.equal(selected.has('check.test.js'), false);
});

test('related selection keeps router changes out of local index suites', () => {
	const selected = selectedFor(['src/cli/index.ts']);

	assert.deepEqual([...selected].sort(), ['router.test.js', 'workflow.test.js']);
});

test('related selection covers shared command eligibility behavior', () => {
	const selected = selectedFor(['src/core/command-intent-eligibility.ts']);

	assert.equal(selected.has('run.test.js'), true);
	assert.equal(selected.has('verify.test.js'), true);
	assert.equal(selected.has('security-fuzz.test.js'), true);
	assert.equal(selected.has('schema.test.js'), true);
});

test('related selection covers the selector script itself', () => {
	const selected = selectedFor(['scripts/run-cli-tests.mjs']);

	assert.deepEqual([...selected], ['test-selection.test.js']);
});

test('related selection reports release-sensitive template changes', () => {
	const report = selectRelated(['templates/default/AGENTS.md']);

	assert.equal(report.release_sensitive, true);
	assert.deepEqual(report.selected.sort(), ['docs.test.js', 'init.test.js', 'update.test.js']);
});
