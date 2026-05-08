import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync, unlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

const projectRoot = path.resolve(fileURLToPath(new URL('../..', import.meta.url)));
const cliPath = path.join(projectRoot, 'dist', 'cli', 'index.js');

function createTempProject() {
	return mkdtempSync(path.join(tmpdir(), 'mustflow-version-sources-'));
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
	assert.equal(result.status, 0);
}

test('prints detected template version source as json', () => {
	const projectPath = createTempProject();

	try {
		initProject(projectPath);

		const result = runCli(projectPath, ['version-sources', '--json']);
		const report = JSON.parse(result.stdout);

		assert.equal(result.status, 0);
		assert.equal(report.schema_version, '1');
		assert.equal(report.command, 'version-sources');
		assert.equal(report.versioning_enabled, true);
		assert.deepEqual(report.sources, [
			{
				path: '.mustflow/config/manifest.lock.toml',
				kind: 'template_lock',
			},
		]);
	} finally {
		removeTempProject(projectPath);
	}
});

test('prints package manifest version sources without assuming package json only', () => {
	const projectPath = createTempProject();

	try {
		initProject(projectPath);
		unlinkSync(path.join(projectPath, '.mustflow', 'config', 'manifest.lock.toml'));
		writeFileSync(
			path.join(projectPath, 'pyproject.toml'),
			['[project]', 'name = "example"', 'version = "0.1.0"', ''].join('\n'),
		);

		const result = runCli(projectPath, ['version-sources', '--json']);
		const report = JSON.parse(result.stdout);

		assert.equal(result.status, 0);
		assert.deepEqual(report.sources, [
			{
				path: 'pyproject.toml',
				kind: 'package_manifest',
			},
		]);
	} finally {
		removeTempProject(projectPath);
	}
});

test('prints declared version sources from versioning config', () => {
	const projectPath = createTempProject();

	try {
		initProject(projectPath);
		unlinkSync(path.join(projectPath, '.mustflow', 'config', 'manifest.lock.toml'));
		writeFileSync(
			path.join(projectPath, 'pyproject.toml'),
			['[project]', 'name = "example"', 'version = "0.1.0"', ''].join('\n'),
		);
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

		const result = runCli(projectPath, ['version-sources', '--json']);
		const report = JSON.parse(result.stdout);

		assert.equal(result.status, 0);
		assert.deepEqual(report.sources, [
			{
				path: 'pyproject.toml',
				kind: 'package_manifest',
				declared: true,
				authority: 'source',
			},
		]);
	} finally {
		removeTempProject(projectPath);
	}
});

test('prints human readable output when no version source is detected', () => {
	const projectPath = createTempProject();

	try {
		initProject(projectPath);
		unlinkSync(path.join(projectPath, '.mustflow', 'config', 'manifest.lock.toml'));

		const result = runCli(projectPath, ['version-sources']);

		assert.equal(result.status, 0);
		assert.match(result.stdout, /mustflow version sources/);
		assert.match(result.stdout, /Versioning preferences: enabled/);
		assert.match(result.stdout, /No version sources detected/);
	} finally {
		removeTempProject(projectPath);
	}
});
