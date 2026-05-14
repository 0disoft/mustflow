import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdirSync, unlinkSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { test } from 'node:test';
import { createTempProject, initProject, removeTempProject, runCli } from './helpers/cli-harness.js';

function runGit(cwd, args) {
	return spawnSync('git', args, {
		cwd,
		encoding: 'utf8',
	});
}

function commitGitBaseline(projectPath) {
	assert.equal(runGit(projectPath, ['init']).status, 0);
	assert.equal(runGit(projectPath, ['config', 'user.name', 'mustflow test']).status, 0);
	assert.equal(runGit(projectPath, ['config', 'user.email', 'mustflow@example.invalid']).status, 0);
	assert.equal(runGit(projectPath, ['add', '.']).status, 0);
	assert.equal(runGit(projectPath, ['commit', '-m', 'baseline']).status, 0);
}

test('strict check fails enabled versioning preferences without a detected version source', () => {
	const projectPath = createTempProject('mustflow-check-versioning-');

	try {
		initProject(projectPath);
		unlinkSync(path.join(projectPath, '.mustflow', 'config', 'manifest.lock.toml'));

		const result = runCli(projectPath, ['check', '--strict', '--json']);
		const check = JSON.parse(result.stdout);

		assert.equal(result.status, 1);
		assert.ok(
			check.issues.some(
				(issue) =>
					issue ===
					'Strict: [release.versioning] is enabled but no version source was detected; add .mustflow/config/versioning.toml or a package/template version source',
			),
		);
		assert.ok(check.issueDetails.some((issue) => issue.severity === 'error' && issue.mode === 'strict'));
	} finally {
		removeTempProject(projectPath);
	}
});

test('strict check accepts a non-package-json version source', () => {
	const projectPath = createTempProject('mustflow-check-versioning-');

	try {
		initProject(projectPath);
		unlinkSync(path.join(projectPath, '.mustflow', 'config', 'manifest.lock.toml'));
		writeFileSync(
			path.join(projectPath, 'pyproject.toml'),
			['[project]', 'name = "example"', 'version = "0.1.0"', ''].join('\n'),
		);

		const result = runCli(projectPath, ['check', '--strict', '--json']);
		const check = JSON.parse(result.stdout);

		assert.equal(result.status, 0);
		assert.equal(check.ok, true);
		assert.deepEqual(check.issues, []);
	} finally {
		removeTempProject(projectPath);
	}
});

test('strict check fails package and template manifest version drift when template sync is enabled', () => {
	const projectPath = createTempProject('mustflow-check-versioning-');

	try {
		initProject(projectPath);
		writeFileSync(
			path.join(projectPath, 'package.json'),
			JSON.stringify({ name: 'example', version: '1.2.3' }, null, 2),
		);
		mkdirSync(path.join(projectPath, 'templates', 'default'), { recursive: true });
		writeFileSync(
			path.join(projectPath, 'templates', 'default', 'manifest.toml'),
			['id = "default"', 'name = "default"', 'version = "1.2.2"', ''].join('\n'),
		);

		const result = runCli(projectPath, ['check', '--strict', '--json']);
		const check = JSON.parse(result.stdout);

		assert.equal(result.status, 1);
		assert.ok(
			check.issues.some(
				(issue) =>
					issue ===
					'Strict: templates/default/manifest.toml version "1.2.2" must match package.json version "1.2.3" when [release.versioning].sync_template_version is true',
			),
		);
		assert.ok(
			check.issueDetails.some(
				(issue) =>
					issue.id === 'mustflow.release.template_version_mismatch' &&
					issue.severity === 'error' &&
					issue.mode === 'strict',
			),
		);
	} finally {
		removeTempProject(projectPath);
	}
});

test('strict check always fails when template manifest version is ahead of package version', () => {
	const projectPath = createTempProject('mustflow-check-versioning-');

	try {
		initProject(projectPath);
		writeFileSync(
			path.join(projectPath, 'package.json'),
			JSON.stringify({ name: 'example', version: '1.2.3' }, null, 2),
		);
		mkdirSync(path.join(projectPath, 'templates', 'default'), { recursive: true });
		writeFileSync(
			path.join(projectPath, 'templates', 'default', 'manifest.toml'),
			['id = "default"', 'name = "default"', 'version = "1.2.4"', ''].join('\n'),
		);

		const result = runCli(projectPath, ['check', '--strict', '--json']);
		const check = JSON.parse(result.stdout);

		assert.equal(result.status, 1);
		assert.ok(
			check.issues.some(
				(issue) =>
					issue ===
					'Strict: templates/default/manifest.toml version "1.2.4" must not be ahead of package.json version "1.2.3"',
			),
		);
		assert.ok(
			check.issueDetails.some(
				(issue) =>
					issue.id === 'mustflow.release.template_version_ahead' &&
					issue.severity === 'error' &&
					issue.mode === 'strict',
			),
		);
	} finally {
		removeTempProject(projectPath);
	}
});

test('strict check warns instead of failing when only package version changed and template surface is unchanged', () => {
	const projectPath = createTempProject('mustflow-check-versioning-');

	try {
		initProject(projectPath);
		writeFileSync(
			path.join(projectPath, 'package.json'),
			JSON.stringify({ name: 'example', version: '1.2.2' }, null, 2),
		);
		mkdirSync(path.join(projectPath, 'templates', 'default'), { recursive: true });
		writeFileSync(
			path.join(projectPath, 'templates', 'default', 'manifest.toml'),
			['id = "default"', 'name = "default"', 'version = "1.2.2"', ''].join('\n'),
		);
		commitGitBaseline(projectPath);
		writeFileSync(
			path.join(projectPath, 'package.json'),
			JSON.stringify({ name: 'example', version: '1.2.3' }, null, 2),
		);

		const result = runCli(projectPath, ['check', '--strict', '--json']);
		const check = JSON.parse(result.stdout);

		assert.equal(result.status, 0);
		assert.equal(check.ok, true);
		assert.deepEqual(check.issues, []);
		assert.ok(
			check.warnings.some(
				(warning) =>
					warning ===
					'Strict warning: templates/default/manifest.toml version "1.2.2" is older than package.json version "1.2.3"; this is allowed only when the installed template surface is unchanged',
			),
		);
		assert.ok(
			check.issueDetails.some(
				(issue) =>
					issue.id === 'mustflow.release.template_version_intentionally_unchanged' &&
					issue.severity === 'warning' &&
					issue.mode === 'strict',
			),
		);
	} finally {
		removeTempProject(projectPath);
	}
});

test('strict check ignores package lockfile versions unless declared', () => {
	const projectPath = createTempProject('mustflow-check-versioning-');

	try {
		initProject(projectPath);
		unlinkSync(path.join(projectPath, '.mustflow', 'config', 'manifest.lock.toml'));
		writeFileSync(
			path.join(projectPath, 'package-lock.json'),
			JSON.stringify({ name: 'example', version: '1.0.0', lockfileVersion: 3 }, null, 2),
		);

		const automatic = runCli(projectPath, ['check', '--strict', '--json']);
		const automaticCheck = JSON.parse(automatic.stdout);

		assert.equal(automatic.status, 1);
		assert.ok(
			automaticCheck.issues.some(
				(issue) =>
					issue ===
					'Strict: [release.versioning] is enabled but no version source was detected; add .mustflow/config/versioning.toml or a package/template version source',
			),
		);

		writeFileSync(
			path.join(projectPath, '.mustflow', 'config', 'versioning.toml'),
			[
				'schema_version = "1"',
				'',
				'[[sources]]',
				'path = "package-lock.json"',
				'kind = "package_manifest"',
				'authority = "derived"',
				'',
			].join('\n'),
		);

		const declared = runCli(projectPath, ['check', '--strict', '--json']);
		const declaredCheck = JSON.parse(declared.stdout);

		assert.equal(declared.status, 0);
		assert.equal(declaredCheck.ok, true);
		assert.deepEqual(declaredCheck.issues, []);
	} finally {
		removeTempProject(projectPath);
	}
});

test('check fails invalid declared versioning source config', () => {
	const projectPath = createTempProject('mustflow-check-versioning-');

	try {
		initProject(projectPath);
		writeFileSync(
			path.join(projectPath, '.mustflow', 'config', 'versioning.toml'),
			[
				'schema_version = 1',
				'',
				'[[sources]]',
				'path = "../package.json"',
				'kind = "release_note"',
				'authority = "primary"',
				'',
			].join('\n'),
		);

		const result = runCli(projectPath, ['check']);

		assert.equal(result.status, 1);
		assert.match(result.stderr, /\[\.mustflow\/config\/versioning\.toml\]\.schema_version must be a string/);
		assert.match(result.stderr, /\.mustflow\/config\/versioning\.toml sources\[0\]\.path must be a non-empty relative path/);
		assert.match(result.stderr, /\.mustflow\/config\/versioning\.toml sources\[0\]\.kind must be/);
		assert.match(result.stderr, /\.mustflow\/config\/versioning\.toml sources\[0\]\.authority must be/);
	} finally {
		removeTempProject(projectPath);
	}
});

test('strict check fails declared versioning source that points to a missing file', () => {
	const projectPath = createTempProject('mustflow-check-versioning-');

	try {
		initProject(projectPath);
		unlinkSync(path.join(projectPath, '.mustflow', 'config', 'manifest.lock.toml'));
		writeFileSync(
			path.join(projectPath, '.mustflow', 'config', 'versioning.toml'),
			[
				'schema_version = "1"',
				'',
				'[[sources]]',
				'path = "pyproject.toml"',
				'kind = "package_manifest"',
				'authority = "source"',
				'',
			].join('\n'),
		);

		const result = runCli(projectPath, ['check', '--strict', '--json']);
		const check = JSON.parse(result.stdout);

		assert.equal(result.status, 1);
		assert.ok(
			check.issues.some(
				(issue) =>
					issue === 'Strict: .mustflow/config/versioning.toml source "pyproject.toml" does not exist',
			),
		);
		assert.ok(
			!check.issues.some(
				(issue) =>
					issue ===
					'Strict: [release.versioning] is enabled but no version source was detected; add .mustflow/config/versioning.toml or a package/template version source',
			),
		);
	} finally {
		removeTempProject(projectPath);
	}
});
