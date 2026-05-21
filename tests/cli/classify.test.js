import assert from 'node:assert/strict';
import { existsSync, mkdirSync, readFileSync, symlinkSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { after, before, test } from 'node:test';
import { runClassify } from '../../dist/cli/commands/classify.js';
import { parseGitStatusOutput } from '../../dist/core/change-classification.js';
import {
	cloneProjectFixture,
	createTempProject,
	initProject,
	projectRoot,
	removeTempProject,
	runCliCommand,
} from './helpers/cli-harness.js';

let initializedProjectFixture;

before(() => {
	initializedProjectFixture = createTempProject('mustflow-classify-fixture-');
	initProject(initializedProjectFixture);
});

after(() => {
	if (initializedProjectFixture) {
		removeTempProject(initializedProjectFixture);
	}
});

function createClassifyProject() {
	return cloneProjectFixture(initializedProjectFixture, 'mustflow-classify-');
}

function runCli(cwd, args) {
	return runCliCommand(cwd, args, runClassify);
}

function runGit(cwd, args) {
	const result = spawnSync('git', args, { cwd, encoding: 'utf8' });
	assert.equal(result.status, 0, result.stderr || result.stdout);
}

function trySymlink(target, linkPath, type = 'file') {
	try {
		symlinkSync(target, linkPath, type);
		return true;
	} catch (error) {
		if (
			error &&
			typeof error === 'object' &&
			'code' in error &&
			['EPERM', 'ENOTSUP'].includes(error.code)
		) {
			return false;
		}

		throw error;
	}
}

test('classifies explicit paths with public surface contracts as json', async () => {
	const projectPath = createClassifyProject();

	try {
		const result = await runCli(projectPath, [
			'classify',
			'README.md',
			'docs-site/src/content/docs/ko/commands/classify.md',
			'schemas/classify-report.schema.json',
			'tests/fixtures/authoring/readme-only/README.md',
			'unmapped/custom.file',
			'--json',
		]);
		const report = JSON.parse(result.stdout);

		assert.equal(result.status, 0, result.stderr || result.stdout);
		assert.equal(report.schema_version, '1');
		assert.equal(report.command, 'classify');
		assert.match(report.correlation_id, /^mf-classify-[0-9a-f]{16}$/u);
		assert.equal(report.source, 'paths');
		assert.deepEqual(report.summary.changeKinds, ['documentation', 'schema', 'test_fixture', 'translation', 'unknown']);
		assert.ok(report.summary.validationReasons.includes('docs_change'));
		assert.ok(report.summary.validationReasons.includes('public_api_change'));
		assert.ok(report.summary.validationReasons.includes('unknown_change'));
		assert.deepEqual(report.summary.updatePolicies, ['update', 'update_or_mark_stale']);
		assert.ok(report.summary.driftChecks.includes('command examples'));
		assert.ok(report.summary.driftChecks.includes('source page parity'));
		assert.ok(report.summary.driftChecks.includes('schema tests'));
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

		const unknown = report.classifications.find((entry) => entry.path === 'unmapped/custom.file');
		assert.equal(unknown.surface.kind, 'unclassified_path');
		assert.equal(unknown.surface.isPublicSurface, false);
		assert.deepEqual(unknown.surface.validationReasons, ['unknown_change']);
		assert.deepEqual(unknown.surface.affectedContracts, ['unclassified repository path']);
	} finally {
		removeTempProject(projectPath);
	}
});

test('keeps path classification rules canonical in TypeScript', async () => {
	const projectPath = createClassifyProject();

	try {
		writeFileSync(
			path.join(projectPath, '.mustflow', 'config', 'path-classification.toml'),
			`
[[rules]]
id = "attempted_readme_override"
pattern = "^README\\\\.md$"
change_kinds = ["unknown"]
validation_reasons = ["unknown_change"]
`,
		);

		const result = await runCli(projectPath, [
			'classify',
			'README.md',
			'.mustflow/config/path-classification.toml',
			'--json',
		]);
		const report = JSON.parse(result.stdout);
		const readme = report.classifications.find((entry) => entry.path === 'README.md');
		const localConfig = report.classifications.find(
			(entry) => entry.path === '.mustflow/config/path-classification.toml',
		);

		assert.equal(result.status, 0, result.stderr || result.stdout);
		assert.equal(readme.surface.kind, 'readme_page');
		assert.deepEqual(readme.changeKinds, ['documentation']);
		assert.deepEqual(readme.surface.validationReasons, ['docs_change', 'copy_change']);
		assert.equal(localConfig.surface.kind, 'workflow_root');
		assert.deepEqual(localConfig.surface.validationReasons, ['mustflow_docs_change', 'mustflow_config_change']);
	} finally {
		removeTempProject(projectPath);
	}
});

test('parses nul-delimited git status without treating arrows in filenames as renames', () => {
	const output = [
		'?? docs/a -> b.md',
		'R  docs/new name.md',
		'docs/old name.md',
		' M README.md',
		'',
	].join('\0');

	assert.deepEqual(parseGitStatusOutput(output), ['docs/a -> b.md', 'docs/new name.md', 'README.md']);
});

test('classifies changed git status paths', async () => {
	const projectPath = createClassifyProject();

	try {
		runGit(projectPath, ['init']);
		runGit(projectPath, ['config', 'user.email', 'test@example.com']);
		runGit(projectPath, ['config', 'user.name', 'Test User']);
		runGit(projectPath, ['add', '.']);
		runGit(projectPath, ['commit', '-m', 'init']);

		writeFileSync(path.join(projectPath, 'README.md'), '# Changed\n');
		mkdirSync(path.join(projectPath, 'schemas'), { recursive: true });
		writeFileSync(path.join(projectPath, 'schemas', 'example.schema.json'), '{}\n');

		const result = await runCli(projectPath, ['classify', '--changed', '--json']);
		const report = JSON.parse(result.stdout);

		assert.equal(result.status, 0, result.stderr || result.stdout);
		assert.equal(report.source, 'changed');
		assert.match(report.correlation_id, /^mf-classify-[0-9a-f]{16}$/u);
		assert.deepEqual(report.files, ['README.md', 'schemas/example.schema.json']);
		assert.ok(report.summary.affectedContracts.includes('JSON schema'));
		assert.ok(report.summary.affectedContracts.includes('public documentation'));
	} finally {
		removeTempProject(projectPath);
	}
});

test('fails changed classification when git status cannot be read', async () => {
	const projectPath = createClassifyProject();

	try {
		const result = await runCli(projectPath, ['classify', '--changed', '--json']);

		assert.equal(result.status, 1);
		assert.match(result.stderr, /Unable to inspect changed files with git status/);
		assert.match(result.stdout, /Usage: mf classify/);
	} finally {
		removeTempProject(projectPath);
	}
});

test('writes changed-file classification reports to repository-local paths', async () => {
	const projectPath = createClassifyProject();
	const reportPath = path.join(projectPath, '.mustflow', 'state', 'change-classification.json');

	try {
		runGit(projectPath, ['init']);
		runGit(projectPath, ['config', 'user.email', 'test@example.com']);
		runGit(projectPath, ['config', 'user.name', 'Test User']);
		runGit(projectPath, ['add', '.']);
		runGit(projectPath, ['commit', '-m', 'init']);

		writeFileSync(path.join(projectPath, 'README.md'), '# Changed\n');

		const result = await runCli(projectPath, [
			'classify',
			'--changed',
			'--write',
			'.mustflow/state/change-classification.json',
			'--json',
		]);
		const printedReport = JSON.parse(result.stdout);
		const writtenReport = JSON.parse(readFileSync(reportPath, 'utf8'));

		assert.equal(result.status, 0, result.stderr || result.stdout);
		assert.equal(existsSync(reportPath), true);
		assert.deepEqual(writtenReport, printedReport);
		assert.equal(writtenReport.command, 'classify');
		assert.match(writtenReport.correlation_id, /^mf-classify-[0-9a-f]{16}$/u);
		assert.equal(writtenReport.source, 'changed');
		assert.deepEqual(writtenReport.files, ['README.md']);
	} finally {
		removeTempProject(projectPath);
	}
});

test('refuses to write classification reports through symlink targets', async (t) => {
	const projectPath = createClassifyProject();
	const outsidePath = createTempProject('mustflow-classify-outside-');
	const outsideReportPath = path.join(outsidePath, 'classification.json');
	const linkPath = path.join(projectPath, '.mustflow', 'state', 'classification-link.json');

	try {
		writeFileSync(outsideReportPath, 'outside\n');
		mkdirSync(path.dirname(linkPath), { recursive: true });
		if (!trySymlink(outsideReportPath, linkPath)) {
			t.skip('file symlinks are not available in this environment');
			return;
		}

		const result = await runCli(projectPath, [
			'classify',
			'README.md',
			'--write',
			'.mustflow/state/classification-link.json',
			'--json',
		]);

		assert.equal(result.status, 1);
		assert.match(result.stderr, /Invalid input|Usage: mf classify/);
		assert.equal(readFileSync(outsideReportPath, 'utf8'), 'outside\n');
	} finally {
		removeTempProject(projectPath);
		removeTempProject(outsidePath);
	}
});

test('classifies host-specific instruction files as workflow surfaces without command authority', async () => {
	const projectPath = createClassifyProject();

	try {
		const result = await runCli(projectPath, ['classify', '.github/copilot-instructions.md', '--json']);
		const report = JSON.parse(result.stdout);
		const hostInstruction = report.classifications[0];

		assert.equal(result.status, 0, result.stderr || result.stdout);
		assert.deepEqual(report.summary.changeKinds, ['host_instruction', 'workflow']);
		assert.deepEqual(report.summary.validationReasons, ['mustflow_docs_change']);
		assert.deepEqual(report.summary.affectedContracts, [
			'agent workflow contract',
			'command contract boundary',
			'host instruction compatibility',
		]);
		assert.equal(hostInstruction.surface.kind, 'host_instruction');
		assert.equal(hostInstruction.surface.isPublicSurface, true);
		assert.equal(hostInstruction.surface.updatePolicy, 'update_or_mark_stale');
		assert.ok(hostInstruction.surface.driftChecks.includes('command contract boundary'));
	} finally {
		removeTempProject(projectPath);
	}
});

test('rejects classification report writes outside the mustflow root', async () => {
	const result = await runCli(projectRoot, ['classify', 'README.md', '--write', '../change-classification.json']);

	assert.equal(result.status, 1);
	assert.match(result.stderr, /Classification report path must stay inside the mustflow root/);
	assert.match(result.stdout, /Usage: mf classify/);
});

test('fails classify without changed mode or explicit paths', async () => {
	const result = await runCli(projectRoot, ['classify', '--json']);

	assert.equal(result.status, 1);
	assert.match(result.stderr, /Specify --changed or at least one path/);
	assert.match(result.stdout, /Usage: mf classify/);
});
