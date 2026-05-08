import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import {
	existsSync,
	mkdtempSync,
	mkdirSync,
	readFileSync,
	rmSync,
	writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

const projectRoot = path.resolve(fileURLToPath(new URL('../..', import.meta.url)));
const cliPath = path.join(projectRoot, 'dist', 'cli', 'index.js');

function createTempProject() {
	const projectPath = mkdtempSync(path.join(tmpdir(), 'mustflow-map-'));
	writeFileSync(path.join(projectPath, 'AGENTS.md'), '# AGENTS.md\n');
	writeFileSync(path.join(projectPath, 'README.md'), '# Temp project\n');
	writeFileSync(path.join(projectPath, 'PROJECT.md'), '# Project brief\n');
	writeFileSync(path.join(projectPath, 'ROADMAP.md'), '# Roadmap\n');
	writeFileSync(path.join(projectPath, 'DESIGN.md'), '# Design\n');
	writeFileSync(path.join(projectPath, 'CONTRIBUTING.md'), '# Contributing\n');
	writeFileSync(path.join(projectPath, 'SECURITY.md'), '# Security\n');
	writeFileSync(path.join(projectPath, 'CHANGELOG.md'), '# Changelog\n');
	writeFileSync(path.join(projectPath, 'GOVERNANCE.md'), '# Governance\n');
	writeFileSync(path.join(projectPath, 'MAINTAINERS.md'), '# Maintainers\n');
	writeFileSync(path.join(projectPath, 'RELEASING.md'), '# Releasing\n');
	writeFileSync(path.join(projectPath, 'TESTING.md'), '# Testing\n');
	writeFileSync(path.join(projectPath, 'DEPLOYMENT.md'), '# Deployment\n');
	writeFileSync(path.join(projectPath, 'OPERATIONS.md'), '# Operations\n');
	writeFileSync(path.join(projectPath, 'CONFIGURATION.md'), '# Configuration\n');
	writeFileSync(path.join(projectPath, 'DATA_MODEL.md'), '# Data model\n');
	writeFileSync(path.join(projectPath, 'PRIVACY.md'), '# Privacy\n');
	writeFileSync(path.join(projectPath, 'TROUBLESHOOTING.md'), '# Troubleshooting\n');
	writeFileSync(path.join(projectPath, 'project.contract.json'), '{}\n');
	writeFileSync(path.join(projectPath, 'project.constants.json'), '{}\n');
	writeFileSync(path.join(projectPath, 'design-tokens.json'), '{}\n');
	writeFileSync(path.join(projectPath, 'openapi.yaml'), 'openapi: 3.1.0\n');
	writeFileSync(path.join(projectPath, 'schema.graphql'), 'type Query { ok: Boolean }\n');
	writeFileSync(path.join(projectPath, 'SSOT.json'), '{}\n');
	writeFileSync(path.join(projectPath, 'package.json'), '{"name":"temp-project"}\n');
	mkdirSync(path.join(projectPath, '.mustflow', 'context'), { recursive: true });
	writeFileSync(path.join(projectPath, '.mustflow', 'context', 'INDEX.md'), '# Context index\n');
	writeFileSync(path.join(projectPath, '.mustflow', 'context', 'PROJECT.md'), '# Project context\n');
	mkdirSync(path.join(projectPath, 'src'), { recursive: true });
	writeFileSync(path.join(projectPath, 'src', 'index.ts'), 'export {};\n');
	mkdirSync(path.join(projectPath, 'docs'), { recursive: true });
	writeFileSync(path.join(projectPath, 'docs', 'README.md'), '# Docs\n');
	mkdirSync(path.join(projectPath, 'packages', 'api'), { recursive: true });
	writeFileSync(path.join(projectPath, 'packages', 'api', 'AGENTS.md'), '# API rules\n');
	writeFileSync(path.join(projectPath, 'packages', 'api', 'package.json'), '{"name":"api"}\n');
	mkdirSync(path.join(projectPath, 'node_modules', 'pkg'), { recursive: true });
	writeFileSync(path.join(projectPath, 'node_modules', 'pkg', 'index.js'), '');
	mkdirSync(path.join(projectPath, 'dist'), { recursive: true });
	writeFileSync(path.join(projectPath, 'dist', 'index.js'), '');
	mkdirSync(path.join(projectPath, '.git'), { recursive: true });
	writeFileSync(path.join(projectPath, '.git', 'config'), '');
	return projectPath;
}

function writeWorkspaceMapConfig(projectPath, options = {}) {
	const includeNested = options.includeNested ?? true;
	mkdirSync(path.join(projectPath, '.mustflow', 'config'), { recursive: true });
	writeFileSync(
		path.join(projectPath, '.mustflow', 'config', 'mustflow.toml'),
		[
			'read_order = ["AGENTS.md", ".mustflow/config/mustflow.toml"]',
			'optional_read_order = ["REPO_MAP.md"]',
			'',
			'[map]',
			`include_nested = ${includeNested ? 'true' : 'false'}`,
			'',
			'[workspace]',
			'enabled = true',
			'roots = ["projects"]',
			'max_depth = 4',
			'max_repositories = 10',
			'follow_symlinks = false',
			'stop_at_repository_root = true',
			'',
		].join('\n'),
	);
}

function createNestedRepository(projectPath) {
	const nestedPath = path.join(projectPath, 'projects', 'alpha');
	mkdirSync(path.join(nestedPath, '.git'), { recursive: true });
	mkdirSync(path.join(nestedPath, '.mustflow', 'config'), { recursive: true });
	mkdirSync(path.join(nestedPath, 'src'), { recursive: true });
	writeFileSync(path.join(nestedPath, 'AGENTS.md'), '# Alpha rules\n');
	writeFileSync(path.join(nestedPath, 'REPO_MAP.md'), '# Alpha map\n');
	writeFileSync(path.join(nestedPath, '.mustflow', 'config', 'commands.toml'), 'version = 1\n');
	writeFileSync(path.join(nestedPath, 'package.json'), '{"name":"alpha-private-name"}\n');
	writeFileSync(path.join(nestedPath, 'README.md'), '# Alpha\n');
	writeFileSync(path.join(nestedPath, 'PROJECT.md'), '# Alpha project\n');
	writeFileSync(path.join(nestedPath, 'ROADMAP.md'), '# Alpha roadmap\n');
	writeFileSync(path.join(nestedPath, 'DESIGN.md'), '# Alpha design\n');
	writeFileSync(path.join(nestedPath, 'GOVERNANCE.md'), '# Alpha governance\n');
	writeFileSync(path.join(nestedPath, 'SECURITY.md'), '# Alpha security\n');
	writeFileSync(path.join(nestedPath, 'TESTING.md'), '# Alpha testing\n');
	writeFileSync(path.join(nestedPath, 'project.contract.json'), '{}\n');
	writeFileSync(path.join(nestedPath, 'openapi.yaml'), 'openapi: 3.1.0\n');
	writeFileSync(path.join(nestedPath, 'schema.graphql'), 'type Query { ok: Boolean }\n');
	writeFileSync(path.join(nestedPath, 'SSOT.json'), '{}\n');
	writeFileSync(path.join(nestedPath, 'src', 'index.ts'), 'export {};\n');
	return nestedPath;
}

function createMinimalNestedRepository(projectPath) {
	const nestedPath = path.join(projectPath, 'projects', 'foo');
	mkdirSync(path.join(nestedPath, '.git'), { recursive: true });
	mkdirSync(path.join(nestedPath, '.mustflow', 'config'), { recursive: true });
	writeFileSync(path.join(nestedPath, 'AGENTS.md'), '# Foo rules\n');
	writeFileSync(path.join(nestedPath, '.mustflow', 'config', 'commands.toml'), 'version = 1\n');
	return nestedPath;
}

function removeTempProject(projectPath) {
	rmSync(projectPath, { recursive: true, force: true });
}

function runMap(cwd, args) {
	return spawnSync(process.execPath, [cliPath, 'map', ...args], {
		cwd,
		encoding: 'utf8',
	});
}

test('prints an anchor-based repository map without ignored paths', () => {
	const projectPath = createTempProject();

	try {
		const result = runMap(projectPath, ['--stdout']);

		assert.equal(result.status, 0);
		assert.match(result.stdout, /^# REPO_MAP\.md/);
		assert.match(result.stdout, /Priority Anchors/);
		assert.match(result.stdout, /Directory Anchors/);
		assert.match(result.stdout, /AGENTS\.md/);
		assert.match(result.stdout, /README\.md/);
		assert.match(result.stdout, /PROJECT\.md/);
		assert.match(result.stdout, /ROADMAP\.md/);
		assert.match(result.stdout, /DESIGN\.md/);
		assert.match(result.stdout, /CONTRIBUTING\.md/);
		assert.match(result.stdout, /SECURITY\.md/);
		assert.match(result.stdout, /CHANGELOG\.md/);
		assert.match(result.stdout, /GOVERNANCE\.md/);
		assert.match(result.stdout, /MAINTAINERS\.md/);
		assert.match(result.stdout, /RELEASING\.md/);
		assert.match(result.stdout, /TESTING\.md/);
		assert.match(result.stdout, /DEPLOYMENT\.md/);
		assert.match(result.stdout, /OPERATIONS\.md/);
		assert.match(result.stdout, /CONFIGURATION\.md/);
		assert.match(result.stdout, /DATA_MODEL\.md/);
		assert.match(result.stdout, /PRIVACY\.md/);
		assert.match(result.stdout, /TROUBLESHOOTING\.md/);
		assert.match(result.stdout, /project\.contract\.json/);
		assert.match(result.stdout, /project\.constants\.json/);
		assert.match(result.stdout, /design-tokens\.json/);
		assert.match(result.stdout, /openapi\.yaml/);
		assert.match(result.stdout, /schema\.graphql/);
		assert.match(result.stdout, /\.mustflow\/context\/INDEX\.md/);
		assert.match(result.stdout, /\.mustflow\/context\/PROJECT\.md/);
		assert.match(result.stdout, /package\.json/);
		assert.match(result.stdout, /docs\/README\.md/);
		assert.match(result.stdout, /packages\/api\/AGENTS\.md/);
		assert.match(result.stdout, /packages\/api\/package\.json/);
		assert.match(result.stdout, /git ls-files/);
		assert.doesNotMatch(result.stdout, /src\/index\.ts/);
		assert.doesNotMatch(result.stdout, /node_modules\/pkg/);
		assert.doesNotMatch(result.stdout, /dist\/index\.js/);
		assert.doesNotMatch(result.stdout, /\.git\/config/);
		assert.doesNotMatch(result.stdout, /SSOT\.json/);
		assert.doesNotMatch(result.stdout, /Generated at/);
		assert.doesNotMatch(result.stdout, /\d{4}-\d{2}-\d{2}T/);
	} finally {
		removeTempProject(projectPath);
	}
});

test('includes nested repositories when --include-nested is passed', () => {
	const projectPath = createTempProject();

	try {
		writeWorkspaceMapConfig(projectPath, { includeNested: false });
		createMinimalNestedRepository(projectPath);

		const result = runMap(projectPath, ['--stdout', '--include-nested']);

		assert.equal(result.status, 0);
		assert.match(result.stdout, /Nested Repositories/);
		assert.match(result.stdout, /### `projects\/foo\/`/);
		assert.match(result.stdout, /agent rules: `projects\/foo\/AGENTS\.md`/);
		assert.match(result.stdout, /command contract: `projects\/foo\/\.mustflow\/config\/commands\.toml`/);
	} finally {
		removeTempProject(projectPath);
	}
});

test('suppresses nested repositories when --root-only is passed', () => {
	const projectPath = createTempProject();

	try {
		writeWorkspaceMapConfig(projectPath, { includeNested: true });
		createMinimalNestedRepository(projectPath);

		const result = runMap(projectPath, ['--stdout', '--root-only']);

		assert.equal(result.status, 0);
		assert.doesNotMatch(result.stdout, /Nested Repositories/);
		assert.doesNotMatch(result.stdout, /projects\/foo/);
	} finally {
		removeTempProject(projectPath);
	}
});

test('rejects conflicting nested map options', () => {
	const projectPath = createTempProject();

	try {
		writeWorkspaceMapConfig(projectPath, { includeNested: true });
		const result = runMap(projectPath, ['--stdout', '--include-nested', '--root-only']);

		assert.equal(result.status, 1);
		assert.match(result.stderr, /Cannot combine --include-nested and --root-only/);
	} finally {
		removeTempProject(projectPath);
	}
});

test('writes REPO_MAP.md when requested', () => {
	const projectPath = createTempProject();

	try {
		const result = runMap(projectPath, ['--write']);
		const repoMapPath = path.join(projectPath, 'REPO_MAP.md');

		assert.equal(result.status, 0);
		assert.match(result.stdout, /Wrote REPO_MAP\.md/);
		assert.ok(existsSync(repoMapPath));
		assert.match(readFileSync(repoMapPath, 'utf8'), /packages\/api\/package\.json/);
	} finally {
		removeTempProject(projectPath);
	}
});

test('prints nested repository entrypoints when workspace map is enabled', () => {
	const projectPath = createTempProject();

	try {
		writeWorkspaceMapConfig(projectPath);
		createNestedRepository(projectPath);

		const result = runMap(projectPath, ['--stdout']);

		assert.equal(result.status, 0);
		assert.match(result.stdout, /Nested Repositories/);
		assert.match(result.stdout, /projects\/alpha\//);
		assert.match(result.stdout, /git repository: yes/);
		assert.match(result.stdout, /mustflow: yes/);
		assert.match(result.stdout, /agent rules: `projects\/alpha\/AGENTS\.md`/);
		assert.match(result.stdout, /repo map: `projects\/alpha\/REPO_MAP\.md`/);
		assert.match(result.stdout, /command contract: `projects\/alpha\/\.mustflow\/config\/commands\.toml`/);
		assert.match(result.stdout, /`projects\/alpha\/package\.json`/);
		assert.match(result.stdout, /`projects\/alpha\/README\.md`/);
		assert.match(result.stdout, /project brief: `projects\/alpha\/PROJECT\.md`/);
		assert.match(result.stdout, /planning context: `projects\/alpha\/ROADMAP\.md`/);
		assert.match(result.stdout, /visual design: `projects\/alpha\/DESIGN\.md`/);
		assert.match(result.stdout, /governance: `projects\/alpha\/GOVERNANCE\.md`/);
		assert.match(result.stdout, /security policy: `projects\/alpha\/SECURITY\.md`/);
		assert.match(result.stdout, /testing guide: `projects\/alpha\/TESTING\.md`/);
		assert.match(result.stdout, /machine-readable contracts:/);
		assert.match(result.stdout, /`projects\/alpha\/project\.contract\.json`/);
		assert.match(result.stdout, /`projects\/alpha\/openapi\.yaml`/);
		assert.match(result.stdout, /`projects\/alpha\/schema\.graphql`/);
		assert.doesNotMatch(result.stdout, /projects\/alpha\/src\/index\.ts/);
		assert.doesNotMatch(result.stdout, /projects\/alpha\/SSOT\.json/);
		assert.doesNotMatch(result.stdout, /alpha-private-name/);
		assert.doesNotMatch(result.stdout, /branch:/);
		assert.doesNotMatch(result.stdout, /remote:/);
	} finally {
		removeTempProject(projectPath);
	}
});

test('detects a minimal workspace repository fixture', () => {
	const projectPath = createTempProject();

	try {
		writeWorkspaceMapConfig(projectPath);
		createMinimalNestedRepository(projectPath);

		const result = runMap(projectPath, ['--stdout']);

		assert.equal(result.status, 0);
		assert.match(result.stdout, /Nested Repositories/);
		assert.match(result.stdout, /### `projects\/foo\/`/);
		assert.match(result.stdout, /git repository: yes/);
		assert.match(result.stdout, /mustflow: yes/);
		assert.match(result.stdout, /agent rules: `projects\/foo\/AGENTS\.md`/);
		assert.match(result.stdout, /command contract: `projects\/foo\/\.mustflow\/config\/commands\.toml`/);
		assert.doesNotMatch(result.stdout, /projects\/foo\/REPO_MAP\.md/);
		assert.doesNotMatch(result.stdout, /projects\/foo\/README\.md/);
		assert.doesNotMatch(result.stdout, /projects\/foo\/package\.json/);
	} finally {
		removeTempProject(projectPath);
	}
});
