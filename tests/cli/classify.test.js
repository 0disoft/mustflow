import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

const projectRoot = path.resolve(fileURLToPath(new URL('../..', import.meta.url)));
const cliPath = path.join(projectRoot, 'dist', 'cli', 'index.js');

function createTempProject() {
	return mkdtempSync(path.join(tmpdir(), 'mustflow-classify-'));
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

function runGit(cwd, args) {
	const result = spawnSync('git', args, { cwd, encoding: 'utf8' });
	assert.equal(result.status, 0, result.stderr || result.stdout);
}

test('classifies explicit paths with public surface contracts as json', () => {
	const projectPath = createTempProject();

	try {
		initProject(projectPath);

		const result = runCli(projectPath, [
			'classify',
			'README.md',
			'docs-site/src/content/docs/ko/commands/classify.md',
			'schemas/classify-report.schema.json',
			'tests/fixtures/authoring/readme-only/README.md',
			'--json',
		]);
		const report = JSON.parse(result.stdout);

		assert.equal(result.status, 0, result.stderr || result.stdout);
		assert.equal(report.schema_version, '1');
		assert.equal(report.command, 'classify');
		assert.equal(report.source, 'paths');
		assert.deepEqual(report.summary.changeKinds, ['documentation', 'schema', 'test_fixture', 'translation']);
		assert.ok(report.summary.validationReasons.includes('docs_change'));
		assert.ok(report.summary.validationReasons.includes('public_api_change'));
		assert.equal(report.summary.publicSurfaceCount, 3);

		const readme = report.classifications.find((entry) => entry.path === 'README.md');
		assert.equal(readme.surface.kind, 'readme_page');
		assert.equal(readme.surface.isPublicSurface, true);
		assert.equal(readme.surface.updatePolicy, 'update');
		assert.ok(readme.surface.driftChecks.includes('command examples'));

		const translation = report.classifications.find(
			(entry) => entry.path === 'docs-site/src/content/docs/ko/commands/classify.md',
		);
		assert.equal(translation.surface.kind, 'docs_site_translation');
		assert.equal(translation.surface.updatePolicy, 'update_or_mark_stale');
		assert.ok(translation.changeKinds.includes('translation'));

		const fixture = report.classifications.find(
			(entry) => entry.path === 'tests/fixtures/authoring/readme-only/README.md',
		);
		assert.equal(fixture.surface.kind, 'test_fixture');
		assert.equal(fixture.surface.isPublicSurface, false);
		assert.deepEqual(fixture.surface.validationReasons, ['test_change']);
	} finally {
		removeTempProject(projectPath);
	}
});

test('classifies changed git status paths', () => {
	const projectPath = createTempProject();

	try {
		initProject(projectPath);
		runGit(projectPath, ['init']);
		runGit(projectPath, ['config', 'user.email', 'test@example.com']);
		runGit(projectPath, ['config', 'user.name', 'Test User']);
		runGit(projectPath, ['add', '.']);
		runGit(projectPath, ['commit', '-m', 'init']);

		writeFileSync(path.join(projectPath, 'README.md'), '# Changed\n');
		mkdirSync(path.join(projectPath, 'schemas'), { recursive: true });
		writeFileSync(path.join(projectPath, 'schemas', 'example.schema.json'), '{}\n');

		const result = runCli(projectPath, ['classify', '--changed', '--json']);
		const report = JSON.parse(result.stdout);

		assert.equal(result.status, 0, result.stderr || result.stdout);
		assert.equal(report.source, 'changed');
		assert.deepEqual(report.files, ['README.md', 'schemas/example.schema.json']);
		assert.ok(report.summary.affectedContracts.includes('JSON schema'));
		assert.ok(report.summary.affectedContracts.includes('public documentation'));
	} finally {
		removeTempProject(projectPath);
	}
});

test('fails classify without changed mode or explicit paths', () => {
	const result = runCli(projectRoot, ['classify', '--json']);

	assert.equal(result.status, 1);
	assert.match(result.stderr, /Specify --changed or at least one path/);
	assert.match(result.stdout, /Usage: mf classify/);
});
