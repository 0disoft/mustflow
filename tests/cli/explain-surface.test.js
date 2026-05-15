import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

const projectRoot = path.resolve(fileURLToPath(new URL('../..', import.meta.url)));
const cliPath = path.join(projectRoot, 'dist', 'cli', 'index.js');

function createTempProject() {
	return mkdtempSync(path.join(tmpdir(), 'mustflow-explain-surface-'));
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

test('explains public surface classification as json', () => {
	const projectPath = createTempProject();

	try {
		initProject(projectPath);

		const result = runCli(projectPath, ['explain', 'surface', 'README.md', '--json']);
		const report = JSON.parse(result.stdout);

		assert.equal(result.status, 0, result.stderr || result.stdout);
		assert.equal(report.topic, 'surface');
		assert.equal(report.decision.kind, 'classified');
		assert.equal(report.decision.inputPath, 'README.md');
		assert.equal(report.decision.countsAsMustflowVerification, false);
		assert.equal(report.decision.surface.kind, 'readme_page');
		assert.equal(report.decision.surface.category, 'documentation');
		assert.equal(report.decision.surface.isPublicSurface, true);
		assert.deepEqual(report.decision.surface.validationReasons, ['docs_change', 'copy_change']);
		assert.ok(report.decision.surface.affectedContracts.includes('public documentation'));
		assert.equal(report.decision.readModel.status, 'missing');
		assert.equal(report.decision.readModel.indexFresh, false);
		assert.equal(report.decision.readModel.match, null);
	} finally {
		removeTempProject(projectPath);
	}
});

test('explains public surface classification from a fresh local index read model', () => {
	const projectPath = createTempProject();

	try {
		initProject(projectPath);

		const indexResult = runCli(projectPath, ['index', '--json']);
		const result = runCli(projectPath, ['explain', 'surface', 'README.md', '--json']);
		const report = JSON.parse(result.stdout);

		assert.equal(indexResult.status, 0, indexResult.stderr || indexResult.stdout);
		assert.equal(result.status, 0, result.stderr || result.stdout);
		assert.equal(report.topic, 'surface');
		assert.equal(report.decision.surface.kind, 'readme_page');
		assert.equal(report.decision.readModel.status, 'fresh');
		assert.equal(report.decision.readModel.indexFresh, true);
		assert.equal(report.decision.readModel.match.ruleId, 'readme_page');
		assert.equal(report.decision.readModel.match.surface.kind, 'readme_page');
		assert.deepEqual(report.decision.readModel.match.surface.validationReasons, ['docs_change', 'copy_change']);
		assert.equal(report.decision.readModel.match.surface.isPublicSurface, true);
	} finally {
		removeTempProject(projectPath);
	}
});

test('explains installed template surface classification as text', () => {
	const projectPath = createTempProject();

	try {
		initProject(projectPath);

		const result = runCli(projectPath, ['explain', 'surface', 'templates/default/locales/ko/AGENTS.md']);

		assert.equal(result.status, 0, result.stderr || result.stdout);
		assert.match(result.stdout, /templates\/default\/locales\/ko\/AGENTS\.md is classified as installed_template_translation/);
		assert.match(result.stdout, /Public surface/);
		assert.match(result.stdout, /is_public_surface: yes/);
		assert.match(result.stdout, /i18n_change, template_version_change/);
		assert.match(result.stdout, /localized workflow documents/);
		assert.match(result.stdout, /Counts as mustflow verification: no/);
	} finally {
		removeTempProject(projectPath);
	}
});
