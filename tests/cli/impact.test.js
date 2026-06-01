import assert from 'node:assert/strict';
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { after, before, test } from 'node:test';
import { runImpact } from '../../dist/cli/commands/impact.js';
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
	initializedProjectFixture = createTempProject('mustflow-impact-fixture-');
	initProject(initializedProjectFixture);
});

after(() => {
	if (initializedProjectFixture) {
		removeTempProject(initializedProjectFixture);
	}
});

function createImpactProject() {
	return cloneProjectFixture(initializedProjectFixture, 'mustflow-impact-');
}

function runCli(cwd, args) {
	return runCliCommand(cwd, args, runImpact);
}

function runGit(cwd, args) {
	const result = spawnSync('git', args, { cwd, encoding: 'utf8' });
	assert.equal(result.status, 0, result.stderr || result.stdout);
}

test('reports version impact for release-sensitive explicit paths', async () => {
	const projectPath = createImpactProject();

	try {
		writeFileSync(path.join(projectPath, 'package.json'), JSON.stringify({ name: 'example', version: '1.0.0' }, null, 2));

		const result = await runCli(projectPath, ['impact', 'package.json', 'schemas/impact-report.schema.json', '--json']);
		const report = JSON.parse(result.stdout);

		assert.equal(result.status, 0, result.stderr || result.stdout);
		assert.equal(report.schema_version, '1');
		assert.equal(report.command, 'impact');
		assert.equal(report.source, 'paths');
		assert.equal(report.versioning_enabled, true);
		assert.ok(report.version_sources.some((source) => source.path === 'package.json'));
		assert.equal(report.version_impact.requiresVersionDecision, true);
		assert.equal(report.version_impact.severity, 'contract');
		assert.equal(report.version_impact.suggestedBump, 'minor');
		assert.ok(report.version_impact.reasons.includes('package_metadata_changed'));
		assert.ok(report.version_impact.reasons.includes('public_contract_changed'));
		assert.ok(report.version_impact.affectedVersionSources.includes('package.json'));
		assert.ok(report.version_impact.affectedSurfaces.includes('schema_contract'));
	} finally {
		removeTempProject(projectPath);
	}
});

test('does not require a version decision for documentation-only paths', async () => {
	const projectPath = createImpactProject();

	try {
		const result = await runCli(projectPath, ['impact', 'README.md', '--json']);
		const report = JSON.parse(result.stdout);

		assert.equal(result.status, 0, result.stderr || result.stdout);
		assert.equal(report.version_impact.requiresVersionDecision, false);
		assert.equal(report.version_impact.severity, 'none');
		assert.equal(report.version_impact.suggestedBump, null);
		assert.deepEqual(report.version_impact.reasons, []);
		assert.deepEqual(report.version_impact.affectedVersionSources, []);
		assert.deepEqual(report.classification_summary.validationReasons, ['copy_change', 'docs_change']);
	} finally {
		removeTempProject(projectPath);
	}
});

test('reports changed version source impact from git status', async () => {
	const projectPath = createImpactProject();

	try {
		runGit(projectPath, ['init']);
		runGit(projectPath, ['config', 'user.email', 'test@example.com']);
		runGit(projectPath, ['config', 'user.name', 'Test User']);
		runGit(projectPath, ['add', '.']);
		runGit(projectPath, ['commit', '-m', 'init']);

		const manifestLockPath = path.join(projectPath, '.mustflow', 'config', 'manifest.lock.toml');
		const manifestLock = readFileSync(manifestLockPath, 'utf8').replace(/version = "[^"]+"/u, 'version = "9.9.9"');
		writeFileSync(manifestLockPath, manifestLock);

		const result = await runCli(projectPath, ['impact', '--changed', '--json']);
		const report = JSON.parse(result.stdout);

		assert.equal(result.status, 0, result.stderr || result.stdout);
		assert.equal(report.source, 'changed');
		assert.deepEqual(report.files, ['.mustflow/config/manifest.lock.toml']);
		assert.equal(report.version_impact.requiresVersionDecision, true);
		assert.equal(report.version_impact.severity, 'metadata');
		assert.equal(report.version_impact.suggestedBump, 'patch');
		assert.ok(report.version_impact.reasons.includes('version_source_changed'));
		assert.ok(report.version_impact.affectedVersionSources.includes('.mustflow/config/manifest.lock.toml'));
	} finally {
		removeTempProject(projectPath);
	}
});

test('fails changed impact when git status cannot be read', async () => {
	const projectPath = createImpactProject();

	try {
		const result = await runCli(projectPath, ['impact', '--changed', '--json']);

		assert.equal(result.status, 1);
		assert.match(result.stderr, /Unable to inspect changed files with git status/);
		assert.match(result.stderr, /Usage: mf impact/);
	} finally {
		removeTempProject(projectPath);
	}
});

test('fails impact without changed mode or explicit paths', async () => {
	const result = await runCli(projectRoot, ['impact', '--json']);

	assert.equal(result.status, 1);
	assert.match(result.stderr, /Specify --changed or at least one path/);
	assert.match(result.stderr, /Usage: mf impact/);
});

test('impact options use shared CLI option parsing', async () => {
	const missingPath = await runCli(projectRoot, ['impact', '--json=false']);
	const unknownOption = await runCli(projectRoot, ['impact', 'README.md', '--bad']);

	assert.equal(missingPath.status, 1);
	assert.match(missingPath.stderr, /Unknown option: --json=false/);
	assert.equal(unknownOption.status, 1);
	assert.match(unknownOption.stderr, /Unknown option: --bad/);
});
