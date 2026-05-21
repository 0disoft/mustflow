import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

const projectRoot = path.resolve(fileURLToPath(new URL('../..', import.meta.url)));
const runTests = [
	'run-execution.test.js',
	'run-preview.test.js',
	'run-receipts.test.js',
	'run-safety.test.js',
];
const indexTests = [
	'index-workflow.test.js',
	'index-verification-evidence.test.js',
	'index-source-anchors.test.js',
];
const dashboardTests = [
	'dashboard-preferences.test.js',
	'dashboard-rendering.test.js',
	'dashboard-safety.test.js',
	'dashboard-verification.test.js',
];

function selectRelated(changedFiles) {
	return listSuite('related', changedFiles);
}

function listSuite(mode, changedFiles = []) {
	const result = spawnSync(process.execPath, ['scripts/run-cli-tests.mjs', mode, '--list'], {
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

test('related selection uses explicit command test contracts without router fallback', () => {
	const selected = selectedFor(['src/cli/commands/verify.ts']);

	assert.equal(selected.has('verify.test.js'), true);
	assert.equal(selected.has('explain-verify.test.js'), true);
	assert.equal(selected.has('schema.test.js'), true);
	assert.equal(selected.has('router.test.js'), false);
	assert.equal(selected.has('check.test.js'), false);
});

test('related selection keeps router changes out of local index suites', () => {
	const selected = selectedFor(['src/cli/index.ts']);

	assert.deepEqual([...selected].sort(), ['router.test.js', 'workflow.test.js']);
});

test('related selection covers shared command eligibility behavior', () => {
	const selected = selectedFor(['src/core/command-intent-eligibility.ts']);

	for (const testName of runTests) {
		assert.equal(selected.has(testName), true);
	}
	assert.equal(selected.has('verify.test.js'), true);
	assert.equal(selected.has('security-fuzz.test.js'), true);
	assert.equal(selected.has('schema.test.js'), true);
});

test('related selection keeps package surface checks release-sensitive instead of running package suite', () => {
	const report = selectRelated(['src/core/public-json-contracts.ts']);

	assert.equal(report.release_sensitive, true);
	assert.deepEqual(report.selected, ['schema.test.js']);
});

test('related selection maps command config changes to contract surfaces', () => {
	const report = selectRelated(['.mustflow/config/commands.toml']);
	const selected = new Set(report.selected);

	assert.equal(report.release_sensitive, true);
	assert.equal(selected.has('check-command-contracts.test.js'), true);
	assert.equal(selected.has('explain-command.test.js'), true);
	assert.equal(selected.has('index-workflow.test.js'), true);
	for (const testName of runTests) {
		assert.equal(selected.has(testName), true);
	}
	assert.equal(selected.has('verify.test.js'), true);
	assert.equal(selected.has('package.test.js'), false);
});

test('related selection maps package metadata helper changes to command consumers', () => {
	const selected = selectedFor(['src/cli/lib/package-info.ts']);

	for (const testName of dashboardTests) {
		assert.equal(selected.has(testName), true);
	}
	assert.equal(selected.has('router.test.js'), true);
	for (const testName of runTests) {
		assert.equal(selected.has(testName), true);
	}
	for (const testName of indexTests) {
		assert.equal(selected.has(testName), false);
	}
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

test('fast baseline keeps lightweight command and workflow contracts', () => {
	const report = listSuite('fast');

	assert.deepEqual(report.selected.slice(0, 7), [
		'adapters.test.js',
		'classify.test.js',
		'impact.test.js',
		'handoff.test.js',
		'router.test.js',
		'status.test.js',
		'version-sources.test.js',
	]);
	assert.equal(report.selected.includes('docs.test.js'), true);
	assert.equal(report.selected.includes('authoring-fixtures.test.js'), true);
	assert.equal(report.selected.includes('i18n-architecture.test.js'), true);
	assert.equal(report.selected.includes('pages-workflow.test.js'), true);
});

test('fast baseline keeps harness safety checks but excludes heavier feature suites', () => {
	const report = listSuite('fast');

	assert.equal(report.selected.includes('index-dry-run.test.js'), true);
	for (const testName of indexTests) {
		assert.equal(report.selected.includes(testName), true);
	}
	assert.equal(report.selected.includes('security-fuzz.test.js'), true);
	assert.equal(report.selected.includes('test-audit.test.js'), true);
	assert.equal(report.selected.includes('test-selection.test.js'), true);
	assert.equal(report.selected.includes('search.test.js'), false);
	for (const testName of runTests) {
		assert.equal(report.selected.includes(testName), false);
	}
	assert.equal(report.selected.includes('update.test.js'), false);
	assert.equal(report.selected.includes('package.test.js'), false);
});
