import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync, unlinkSync, writeFileSync } from 'node:fs';
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

test('detects multi-language package version sources and ignores duplicate prose versions', () => {
	const projectPath = createTempProject();

	try {
		initProject(projectPath);
		unlinkSync(path.join(projectPath, '.mustflow', 'config', 'manifest.lock.toml'));
		writeFileSync(path.join(projectPath, 'README.md'), 'Current version: 9.9.9\n');
		mkdirSync(path.join(projectPath, 'src'), { recursive: true });
		writeFileSync(path.join(projectPath, 'src', 'version.ts'), 'export const VERSION = "9.9.9";\n');
		writeFileSync(path.join(projectPath, 'Cargo.toml'), ['[package]', 'name = "example"', 'version = "0.2.0"', ''].join('\n'));
		writeFileSync(path.join(projectPath, 'pom.xml'), '<project><version>0.3.0</version></project>\n');
		writeFileSync(path.join(projectPath, 'Example.csproj'), '<Project><PropertyGroup><Version>0.4.0</Version></PropertyGroup></Project>\n');
		writeFileSync(path.join(projectPath, 'example.gemspec'), 'Gem::Specification.new { |spec| spec.version = "0.5.0" }\n');

		const result = runCli(projectPath, ['version-sources', '--json']);
		const report = JSON.parse(result.stdout);

		assert.equal(result.status, 0);
		assert.deepEqual(report.sources, [
			{ path: 'Cargo.toml', kind: 'package_manifest' },
			{ path: 'Example.csproj', kind: 'package_manifest' },
			{ path: 'example.gemspec', kind: 'package_manifest' },
			{ path: 'pom.xml', kind: 'package_manifest' },
		]);
	} finally {
		removeTempProject(projectPath);
	}
});

test('detects Go module version source only with a semver release tag', () => {
	const projectPath = createTempProject();

	try {
		initProject(projectPath);
		unlinkSync(path.join(projectPath, '.mustflow', 'config', 'manifest.lock.toml'));
		writeFileSync(path.join(projectPath, 'go.mod'), 'module example.com/app\n\ngo 1.22\n');

		const withoutTag = runCli(projectPath, ['version-sources', '--json']);
		assert.equal(withoutTag.status, 0);
		assert.deepEqual(JSON.parse(withoutTag.stdout).sources, []);

		const tagDir = path.join(projectPath, '.git', 'refs', 'tags');
		mkdirSync(tagDir, { recursive: true });
		writeFileSync(path.join(tagDir, 'v1.2.3'), '0000000000000000000000000000000000000000\n');

		const withTag = runCli(projectPath, ['version-sources', '--json']);
		const report = JSON.parse(withTag.stdout);

		assert.equal(withTag.status, 0);
		assert.deepEqual(report.sources, [
			{
				path: 'go.mod',
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
