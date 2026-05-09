import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

const projectRoot = path.resolve(fileURLToPath(new URL('../..', import.meta.url)));
const cliPath = path.join(projectRoot, 'dist', 'cli', 'index.js');

function createTempProject() {
	return mkdtempSync(path.join(tmpdir(), 'mustflow-impact-'));
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

test('reports version impact for release-sensitive explicit paths', () => {
	const projectPath = createTempProject();

	try {
		initProject(projectPath);
		writeFileSync(path.join(projectPath, 'package.json'), JSON.stringify({ name: 'example', version: '1.0.0' }, null, 2));

		const result = runCli(projectPath, ['impact', 'package.json', 'schemas/impact-report.schema.json', '--json']);
		const report = JSON.parse(result.stdout);

		assert.equal(result.status, 0, result.stderr || result.stdout);
		assert.equal(report.schema_version, '1');
		assert.equal(report.command, 'impact');
		assert.equal(report.source, 'paths');
		assert.equal(report.versioning_enabled, true);
		assert.ok(report.version_sources.some((source) => source.path === 'package.json'));
		assert.equal(report.version_impact.requiresVersionDecision, true);
		assert.equal(report.version_impact.suggestedBump, 'patch');
		assert.ok(report.version_impact.reasons.includes('package_metadata_changed'));
		assert.ok(report.version_impact.reasons.includes('public_contract_changed'));
		assert.ok(report.version_impact.affectedVersionSources.includes('package.json'));
		assert.ok(report.version_impact.affectedSurfaces.includes('schema_contract'));
	} finally {
		removeTempProject(projectPath);
	}
});

test('does not require a version decision for documentation-only paths', () => {
	const projectPath = createTempProject();

	try {
		initProject(projectPath);

		const result = runCli(projectPath, ['impact', 'README.md', '--json']);
		const report = JSON.parse(result.stdout);

		assert.equal(result.status, 0, result.stderr || result.stdout);
		assert.equal(report.version_impact.requiresVersionDecision, false);
		assert.equal(report.version_impact.suggestedBump, null);
		assert.deepEqual(report.version_impact.reasons, []);
		assert.deepEqual(report.version_impact.affectedVersionSources, []);
		assert.deepEqual(report.classification_summary.validationReasons, ['copy_change', 'docs_change']);
	} finally {
		removeTempProject(projectPath);
	}
});

test('reports changed version source impact from git status', () => {
	const projectPath = createTempProject();

	try {
		initProject(projectPath);
		runGit(projectPath, ['init']);
		runGit(projectPath, ['config', 'user.email', 'test@example.com']);
		runGit(projectPath, ['config', 'user.name', 'Test User']);
		runGit(projectPath, ['add', '.']);
		runGit(projectPath, ['commit', '-m', 'init']);

		const manifestLockPath = path.join(projectPath, '.mustflow', 'config', 'manifest.lock.toml');
		const manifestLock = readFileSync(manifestLockPath, 'utf8').replace(/version = "[^"]+"/u, 'version = "9.9.9"');
		writeFileSync(manifestLockPath, manifestLock);

		const result = runCli(projectPath, ['impact', '--changed', '--json']);
		const report = JSON.parse(result.stdout);

		assert.equal(result.status, 0, result.stderr || result.stdout);
		assert.equal(report.source, 'changed');
		assert.deepEqual(report.files, ['.mustflow/config/manifest.lock.toml']);
		assert.equal(report.version_impact.requiresVersionDecision, true);
		assert.ok(report.version_impact.reasons.includes('version_source_changed'));
		assert.ok(report.version_impact.affectedVersionSources.includes('.mustflow/config/manifest.lock.toml'));
	} finally {
		removeTempProject(projectPath);
	}
});

test('fails impact without changed mode or explicit paths', () => {
	const result = runCli(projectRoot, ['impact', '--json']);

	assert.equal(result.status, 1);
	assert.match(result.stderr, /Specify --changed or at least one path/);
	assert.match(result.stdout, /Usage: mf impact/);
});
