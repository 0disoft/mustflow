import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
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
	assert.equal(selected.has('verify-inputs.test.js'), true);
	assert.equal(selected.has('explain-verify.test.js'), true);
	assert.equal(selected.has('schema.test.js'), true);
	assert.equal(selected.has('schema-command-contracts.test.js'), true);
	assert.equal(selected.has('schema-explain-verify-output.test.js'), true);
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
	assert.equal(selected.has('verify-inputs.test.js'), true);
	assert.equal(selected.has('security-fuzz.test.js'), true);
	assert.equal(selected.has('schema.test.js'), true);
	assert.equal(selected.has('schema-command-contracts.test.js'), true);
	assert.equal(selected.has('schema-explain-verify-output.test.js'), true);
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
	assert.equal(selected.has('schema-command-contracts.test.js'), true);
	for (const testName of runTests) {
		assert.equal(selected.has(testName), true);
	}
	assert.equal(selected.has('verify.test.js'), true);
	assert.equal(selected.has('package.test.js'), false);
	assert.equal(selected.has('package-template.test.js'), false);
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

test('related selection maps code outline implementation changes to script-pack contract tests', () => {
	const coreSelected = selectedFor(['src/core/code-outline.ts']);
	const configChainSelected = selectedFor(['src/core/config-chain.ts']);
	const wrapperSelected = selectedFor(['src/cli/script-packs/code-outline.ts']);
	const configChainWrapperSelected = selectedFor(['src/cli/script-packs/repo-config-chain.ts']);
	const suggestionSelected = selectedFor(['src/core/script-pack-suggestions.ts']);

	for (const selected of [coreSelected, configChainSelected, wrapperSelected, configChainWrapperSelected, suggestionSelected]) {
		assert.equal(selected.has('text-budget.test.js'), true);
		assert.equal(selected.has('schema.test.js'), true);
		assert.equal(selected.has('schema-command-contracts.test.js'), true);
		assert.equal(selected.has('schema-explain-verify-output.test.js'), true);
	}
});

test('test runner refuses overlapping repository build and test locks', () => {
	const tempRoot = mkdtempSync(path.join(tmpdir(), 'mustflow-test-lock-'));
	const lockDir = path.join(tempRoot, 'lock');

	try {
		mkdirSync(lockDir);
		writeFileSync(
			path.join(lockDir, 'owner.json'),
			`${JSON.stringify({
				pid: process.pid,
				cwd: projectRoot,
				command: 'node scripts/run-cli-tests.mjs --build full-auto',
				started_at: new Date().toISOString(),
			})}\n`,
		);

		const result = spawnSync(process.execPath, ['scripts/run-cli-tests.mjs', '--build', 'fast', '--list'], {
			cwd: projectRoot,
			encoding: 'utf8',
			env: {
				...process.env,
				MUSTFLOW_TEST_RUNNER_LOCK_DIR: lockDir,
			},
		});

		assert.equal(result.status, 2);
		assert.match(result.stderr, /Another mustflow CLI test runner is already active/u);
		assert.match(result.stderr, /Owner PID:/u);
	} finally {
		rmSync(tempRoot, { recursive: true, force: true });
	}
});

test('related selection treats shared CLI harness changes as broad CLI risk', () => {
	const selected = selectedFor(['tests/cli/helpers/cli-harness.js']);

	assert.equal(selected.has('init.test.js'), true);
	assert.equal(selected.has('verify.test.js'), true);
	assert.equal(selected.has('verify-changed.test.js'), true);
	assert.equal(selected.has('package.test.js'), false);
	assert.equal(selected.has('package-template.test.js'), false);
});

test('related selection reports release-sensitive template changes', () => {
	const report = selectRelated(['templates/default/AGENTS.md']);

	assert.equal(report.release_sensitive, true);
	assert.deepEqual(report.selected.sort(), ['docs.test.js', 'init-default-template.test.js', 'init.test.js', 'update.test.js']);
});

test('related selection maps init command changes to default template installation', () => {
	const selected = selectedFor(['src/cli/commands/init.ts']);

	assert.equal(selected.has('init.test.js'), true);
	assert.equal(selected.has('init-default-template.test.js'), true);
	assert.equal(selected.has('workflow.test.js'), true);
});

test('related selection maps skill changes to authoring skill contracts', () => {
	const selected = selectedFor(['.mustflow/skills/cpp-code-change/SKILL.md']);

	assert.equal(selected.has('authoring-skill-contracts.test.js'), true);
	assert.equal(selected.has('authoring-fixtures.test.js'), false);
});

test('fast baseline keeps lightweight command and workflow contracts', () => {
	const report = listSuite('fast');

	assert.deepEqual(report.selected.slice(0, 11), [
		'adapters.test.js',
		'classify.test.js',
		'evidence.test.js',
		'impact.test.js',
		'handoff.test.js',
		'next.test.js',
		'onboard.test.js',
		'router.test.js',
		'status.test.js',
		'version-sources.test.js',
		'workspace.test.js',
	]);
	assert.equal(report.selected.includes('docs.test.js'), true);
	assert.equal(report.selected.includes('authoring-fixtures.test.js'), true);
	assert.equal(report.selected.includes('authoring-skill-contracts.test.js'), true);
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
	assert.equal(report.selected.includes('package-template.test.js'), false);
});

test('full-auto keeps the same coverage surface as the full suite', () => {
	const full = listSuite('full');
	const fullAuto = listSuite('full-auto');

	assert.deepEqual(fullAuto.selected, full.selected);
	assert.equal(fullAuto.selected.length > 0, true);
	assert.equal(fullAuto.selected.includes('package.test.js'), true);
	assert.equal(fullAuto.selected.includes('package-template.test.js'), true);
});
