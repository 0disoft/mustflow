import assert from 'node:assert/strict';
import { mkdirSync, unlinkSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { after, before, test } from 'node:test';
import { runVersionSources } from '../../dist/cli/commands/version-sources.js';
import {
	cloneProjectFixture,
	createTempProject,
	removeTempProject,
	runCliCommand,
} from './helpers/cli-harness.js';

let initializedProjectFixture;

before(() => {
	initializedProjectFixture = createTempProject('mustflow-version-sources-fixture-');
	createVersionSourcesFixture(initializedProjectFixture);
});

after(() => {
	if (initializedProjectFixture) {
		removeTempProject(initializedProjectFixture);
	}
});

function createVersionSourcesProject() {
	return cloneProjectFixture(initializedProjectFixture, 'mustflow-version-sources-');
}

function createVersionSourcesFixture(projectPath) {
	mkdirSync(path.join(projectPath, '.mustflow', 'config'), { recursive: true });
	writeFileSync(path.join(projectPath, 'AGENTS.md'), '# Version sources fixture\n');
	writeFileSync(path.join(projectPath, '.mustflow', 'config', 'mustflow.toml'), 'version = 1\n');
	writeFileSync(
		path.join(projectPath, '.mustflow', 'config', 'preferences.toml'),
		[
			'[release.versioning]',
			'impact_check = true',
			'suggest_bump = true',
			'auto_bump = true',
			'sync_template_version = true',
			'sync_docs_examples = true',
			'sync_tests = true',
			'',
		].join('\n'),
	);
	writeFileSync(path.join(projectPath, '.mustflow', 'config', 'manifest.lock.toml'), 'version = "1.0.0"\n');
}

function runCli(cwd, args) {
	return runCliCommand(cwd, args, runVersionSources);
}

test('prints detected template version source as json', async () => {
	const projectPath = createVersionSourcesProject();

	try {
		const result = await runCli(projectPath, ['version-sources', '--json']);
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

test('prints package manifest version sources without assuming package json only', async () => {
	const projectPath = createVersionSourcesProject();

	try {
		unlinkSync(path.join(projectPath, '.mustflow', 'config', 'manifest.lock.toml'));
		writeFileSync(
			path.join(projectPath, 'pyproject.toml'),
			['[project]', 'name = "example"', 'version = "0.1.0"', ''].join('\n'),
		);

		const result = await runCli(projectPath, ['version-sources', '--json']);
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

test('detects multi-language package version sources and ignores duplicate prose versions', async () => {
	const projectPath = createVersionSourcesProject();

	try {
		unlinkSync(path.join(projectPath, '.mustflow', 'config', 'manifest.lock.toml'));
		writeFileSync(path.join(projectPath, 'README.md'), 'Current version: 9.9.9\n');
		mkdirSync(path.join(projectPath, 'src'), { recursive: true });
		writeFileSync(path.join(projectPath, 'src', 'version.ts'), 'export const VERSION = "9.9.9";\n');
		writeFileSync(path.join(projectPath, 'Cargo.toml'), ['[package]', 'name = "example"', 'version = "0.2.0"', ''].join('\n'));
		writeFileSync(path.join(projectPath, 'pom.xml'), '<project><version>0.3.0</version></project>\n');
		writeFileSync(path.join(projectPath, 'Example.csproj'), '<Project><PropertyGroup><Version>0.4.0</Version></PropertyGroup></Project>\n');
		writeFileSync(path.join(projectPath, 'example.gemspec'), 'Gem::Specification.new { |spec| spec.version = "0.5.0" }\n');

		const result = await runCli(projectPath, ['version-sources', '--json']);
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

test('detects Go module version source only with a semver release tag', async () => {
	const projectPath = createVersionSourcesProject();

	try {
		unlinkSync(path.join(projectPath, '.mustflow', 'config', 'manifest.lock.toml'));
		writeFileSync(path.join(projectPath, 'go.mod'), 'module example.com/app\n\ngo 1.22\n');

		const withoutTag = await runCli(projectPath, ['version-sources', '--json']);
		assert.equal(withoutTag.status, 0);
		assert.deepEqual(JSON.parse(withoutTag.stdout).sources, []);

		const tagDir = path.join(projectPath, '.git', 'refs', 'tags');
		mkdirSync(tagDir, { recursive: true });
		writeFileSync(path.join(tagDir, 'v1.2.3'), '0000000000000000000000000000000000000000\n');

		const withTag = await runCli(projectPath, ['version-sources', '--json']);
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

test('ignores package lockfiles unless a repository declares them as version sources', async () => {
	const projectPath = createVersionSourcesProject();

	try {
		unlinkSync(path.join(projectPath, '.mustflow', 'config', 'manifest.lock.toml'));
		writeFileSync(
			path.join(projectPath, 'package-lock.json'),
			JSON.stringify({ name: 'example', version: '1.0.0', lockfileVersion: 3 }, null, 2),
		);

		const automatic = await runCli(projectPath, ['version-sources', '--json']);
		assert.equal(automatic.status, 0);
		assert.deepEqual(JSON.parse(automatic.stdout).sources, []);

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

		const declared = await runCli(projectPath, ['version-sources', '--json']);
		const report = JSON.parse(declared.stdout);

		assert.equal(declared.status, 0);
		assert.deepEqual(report.sources, [
			{
				path: 'package-lock.json',
				kind: 'package_manifest',
				declared: true,
				authority: 'derived',
			},
		]);
	} finally {
		removeTempProject(projectPath);
	}
});

test('prints declared version sources from versioning config', async () => {
	const projectPath = createVersionSourcesProject();

	try {
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

		const result = await runCli(projectPath, ['version-sources', '--json']);
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

test('prints human readable output when no version source is detected', async () => {
	const projectPath = createVersionSourcesProject();

	try {
		unlinkSync(path.join(projectPath, '.mustflow', 'config', 'manifest.lock.toml'));

		const result = await runCli(projectPath, ['version-sources']);

		assert.equal(result.status, 0);
		assert.match(result.stdout, /mustflow version sources/);
		assert.match(result.stdout, /Versioning preferences: enabled/);
		assert.match(result.stdout, /No version sources detected/);
	} finally {
		removeTempProject(projectPath);
	}
});
