import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import {
	existsSync,
	mkdtempSync,
	mkdirSync,
	readFileSync,
	rmSync,
	symlinkSync,
	writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { test } from 'node:test';
import { fileURLToPath, pathToFileURL } from 'node:url';

const projectRoot = path.resolve(fileURLToPath(new URL('../..', import.meta.url)));
const cliPath = path.join(projectRoot, 'dist', 'cli', 'index.js');

function createTempProject() {
	const projectPath = mkdtempSync(path.join(tmpdir(), 'mustflow-map-'));
	writeFileSync(path.join(projectPath, 'AGENTS.md'), '# AGENTS.md\n');
	writeFileSync(path.join(projectPath, '.gitattributes'), '* text=auto eol=lf\n');
	writeFileSync(path.join(projectPath, '.editorconfig'), 'root = true\n');
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
	mkdirSync(path.join(projectPath, '.mustflow', 'backups', '2026-05-08T00-00-00-000Z'), { recursive: true });
	writeFileSync(path.join(projectPath, '.mustflow', 'backups', '2026-05-08T00-00-00-000Z', 'AGENTS.md'), '# Backup\n');
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
	const followSymlinks = options.followSymlinks ?? false;
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
			`follow_symlinks = ${followSymlinks ? 'true' : 'false'}`,
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
	writeFileSync(path.join(nestedPath, '.gitattributes'), '* text=auto eol=lf\n');
	writeFileSync(path.join(nestedPath, '.editorconfig'), 'root = true\n');
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

function createMinimalRepositoryAt(repositoryPath, name) {
	mkdirSync(path.join(repositoryPath, '.git'), { recursive: true });
	mkdirSync(path.join(repositoryPath, '.mustflow', 'config'), { recursive: true });
	writeFileSync(path.join(repositoryPath, 'AGENTS.md'), `# ${name} rules\n`);
	writeFileSync(path.join(repositoryPath, '.mustflow', 'config', 'commands.toml'), 'version = 1\n');
}

function trySymlink(target, linkPath) {
	try {
		symlinkSync(target, linkPath, process.platform === 'win32' ? 'junction' : 'dir');
		return true;
	} catch {
		return false;
	}
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
		assert.match(result.stdout, /^---\nmustflow_doc: repo-map/m);
		assert.match(result.stdout, /^lifecycle: generated$/m);
		assert.match(result.stdout, /^generated_by: mustflow$/m);
		assert.match(result.stdout, /^relative_root: "\."$/m);
		assert.match(result.stdout, /^source_policy: anchors_only$/m);
		assert.match(result.stdout, /^privacy_mode: minimal$/m);
		assert.match(result.stdout, /^anchor_count: [1-9]\d*$/m);
		assert.match(result.stdout, /^degraded: true$/m);
		assert.match(result.stdout, /^git_ls_files_status: error$/m);
		assert.match(result.stdout, /^source_fingerprint: "sha256:[a-f0-9]{64}"$/m);
		assert.match(result.stdout, /^# REPO_MAP\.md$/m);
		assert.match(result.stdout, /^## Source Quality$/m);
		assert.match(result.stdout, /`git ls-files` status: `error`/);
		assert.match(result.stdout, /bounded recursive fallback/);
		assert.match(result.stdout, /Priority Anchors/);
		assert.match(result.stdout, /Directory Anchors/);
		assert.match(result.stdout, /AGENTS\.md/);
		assert.match(result.stdout, /\.gitattributes/);
		assert.match(result.stdout, /\.editorconfig/);
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
		assert.doesNotMatch(result.stdout, /\.mustflow\/backups/);
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

test('rejects unsupported map options with usage help', () => {
	const projectPath = createTempProject();

	try {
		const unknownOption = runMap(projectPath, ['--bad']);
		const booleanValue = runMap(projectPath, ['--stdout=true']);

		assert.equal(unknownOption.status, 1);
		assert.match(unknownOption.stderr, /Unknown option: --bad/u);
		assert.match(unknownOption.stderr, /Usage: mf map \[options\]/u);
		assert.equal(booleanValue.status, 1);
		assert.match(booleanValue.stderr, /Unknown option: --stdout=true/u);
		assert.match(booleanValue.stderr, /Usage: mf map \[options\]/u);
	} finally {
		removeTempProject(projectPath);
	}
});

test('accepts inline map depth values through shared option parsing', () => {
	const projectPath = createTempProject();

	try {
		const result = runMap(projectPath, ['--stdout', '--depth=2']);

		assert.equal(result.status, 0);
		assert.match(result.stdout, /^# REPO_MAP\.md$/m);
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
		const repoMap = readFileSync(repoMapPath, 'utf8');
		assert.match(repoMap, /^---\nmustflow_doc: repo-map/m);
		assert.match(repoMap, /^degraded: true$/m);
		assert.match(repoMap, /^git_ls_files_status: error$/m);
		assert.match(repoMap, /^source_fingerprint: "sha256:[a-f0-9]{64}"$/m);
		assert.match(repoMap, /packages\/api\/package\.json/);
	} finally {
		removeTempProject(projectPath);
	}
});

test('keeps repo map frontmatter and source fingerprint rendering stable', async () => {
	const { getRepoMapSourceFingerprint, renderRepoMapFrontmatter } = await import(
		pathToFileURL(path.join(projectRoot, 'dist', 'cli', 'lib', 'repo-map-frontmatter.js')).href
	);
	const input = {
		depth: 3,
		includeNested: true,
		configuredPriorityPaths: ['README.md', 'AGENTS.md'],
		gitLsFilesStatus: 'ok',
		anchors: [{ relativePath: 'docs/README.md' }, { relativePath: 'AGENTS.md' }],
		nestedRepositories: [
			{
				relativePath: 'packages/api/',
				mustflow: true,
				agentRules: 'packages/api/AGENTS.md',
				repoMap: undefined,
				mustflowConfig: 'packages/api/.mustflow/config/mustflow.toml',
				commandContract: 'packages/api/.mustflow/config/commands.toml',
				contextIndex: undefined,
				skillIndex: undefined,
				rootDocuments: [{ relativePath: 'packages/api/README.md' }],
				machineContracts: [],
				manifests: ['packages/api/package.json'],
				commandAdapters: [],
				editingPolicies: [],
			},
		],
	};
	const reorderedInput = {
		...input,
		configuredPriorityPaths: [...input.configuredPriorityPaths].reverse(),
		anchors: [...input.anchors].reverse(),
	};
	const fingerprint = getRepoMapSourceFingerprint(input);

	assert.match(fingerprint, /^sha256:[a-f0-9]{64}$/);
	assert.equal(getRepoMapSourceFingerprint(reorderedInput), fingerprint);
	assert.deepEqual(renderRepoMapFrontmatter(3, fingerprint, 'ok'), [
		'---',
		'mustflow_doc: repo-map',
		'lifecycle: generated',
		'generated_by: mustflow',
		'relative_root: "."',
		'source_policy: anchors_only',
		'privacy_mode: minimal',
		'anchor_count: 3',
		'degraded: false',
		'git_ls_files_status: ok',
		`source_fingerprint: "${fingerprint}"`,
		'---',
		'',
	]);
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
		assert.match(result.stdout, /`projects\/alpha\/\.gitattributes`/);
		assert.match(result.stdout, /`projects\/alpha\/\.editorconfig`/);
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

test('limits untracked filesystem discovery to anchor candidates', (t) => {
	const projectPath = createTempProject();

	try {
		rmSync(path.join(projectPath, '.git'), { recursive: true, force: true });
		const initResult = spawnSync('git', ['init'], { cwd: projectPath, encoding: 'utf8' });

		if (initResult.status !== 0) {
			t.skip('git is unavailable in this environment');
			return;
		}

		writeFileSync(path.join(projectPath, 'src', 'README.md'), '# Source notes\n');
		writeFileSync(path.join(projectPath, 'src', 'untracked-implementation.ts'), 'export {};\n');
		spawnSync('git', ['add', 'AGENTS.md', 'src/README.md'], { cwd: projectPath, encoding: 'utf8' });

		const result = runMap(projectPath, ['--stdout']);

		assert.equal(result.status, 0);
		assert.match(result.stdout, /^degraded: false$/m);
		assert.match(result.stdout, /^git_ls_files_status: ok$/m);
		assert.doesNotMatch(result.stdout, /^## Source Quality$/m);
		assert.match(result.stdout, /src\/README\.md/);
		assert.match(result.stdout, /\.mustflow\/context\/PROJECT\.md/);
		assert.doesNotMatch(result.stdout, /src\/untracked-implementation\.ts/);
		assert.doesNotMatch(result.stdout, /src\/index\.ts/);
	} finally {
		removeTempProject(projectPath);
	}
});

test('bounds git file discovery with timeout and output limits', async () => {
	const { discoverGitFilesForRepoMap, listGitFilesForRepoMap } = await import(
		pathToFileURL(path.join(projectRoot, 'dist', 'cli', 'lib', 'repo-map.js')).href
	);
	const calls = [];
	const discovery = discoverGitFilesForRepoMap(projectRoot, {
		spawnGit(command, args, options) {
			calls.push({ command, args, options });
			return {
				status: 0,
				stdout: 'AGENTS.md\0README.md\0',
			};
		},
	});
	const files = listGitFilesForRepoMap(projectRoot, {
		spawnGit() {
			return {
				status: 0,
				stdout: 'AGENTS.md\0README.md\0',
			};
		},
	});

	assert.deepEqual(discovery, { files: ['AGENTS.md', 'README.md'], status: 'ok' });
	assert.deepEqual(files, ['AGENTS.md', 'README.md']);
	assert.equal(calls.length, 1);
	assert.equal(calls[0].command, 'git');
	assert.deepEqual(calls[0].args, ['ls-files', '-z']);
	assert.equal(calls[0].options.cwd, projectRoot);
	assert.equal(calls[0].options.encoding, 'utf8');
	assert.equal(calls[0].options.windowsHide, true);
	assert.equal(Number.isInteger(calls[0].options.timeout) && calls[0].options.timeout > 0, true);
	assert.equal(Number.isInteger(calls[0].options.maxBuffer) && calls[0].options.maxBuffer > 0, true);
});

test('treats oversized or timed-out git file discovery as unavailable for recursive fallback', async () => {
	const { discoverGitFilesForRepoMap, listGitFilesForRepoMap } = await import(
		pathToFileURL(path.join(projectRoot, 'dist', 'cli', 'lib', 'repo-map.js')).href
	);
	const oversizedDiscovery = discoverGitFilesForRepoMap(projectRoot, {
		spawnGit() {
			return {
				status: null,
				error: Object.assign(new Error('stdout maxBuffer length exceeded'), { code: 'ENOBUFS' }),
				stdout: 'AGENTS.md\0',
			};
		},
	});
	const timedOutDiscovery = discoverGitFilesForRepoMap(projectRoot, {
		spawnGit() {
			return {
				status: null,
				error: Object.assign(new Error('spawnSync git ETIMEDOUT'), { code: 'ETIMEDOUT' }),
				stdout: 'AGENTS.md\0',
			};
		},
	});
	const genericFailureDiscovery = discoverGitFilesForRepoMap(projectRoot, {
		spawnGit() {
			return {
				status: 128,
				stdout: '',
			};
		},
	});
	const timedOutFiles = listGitFilesForRepoMap(projectRoot, {
		spawnGit() {
			return {
				status: null,
				error: Object.assign(new Error('spawnSync git ETIMEDOUT'), { code: 'ETIMEDOUT' }),
				stdout: 'AGENTS.md\0',
			};
		},
	});

	assert.deepEqual(oversizedDiscovery, { files: [], status: 'max_buffer' });
	assert.deepEqual(timedOutDiscovery, { files: [], status: 'timeout' });
	assert.deepEqual(genericFailureDiscovery, { files: [], status: 'error' });
	assert.deepEqual(timedOutFiles, []);
});

test('follows only in-root workspace symlinks when enabled', (t) => {
	const projectPath = createTempProject();
	const outsidePath = mkdtempSync(path.join(tmpdir(), 'mustflow-map-outside-'));

	try {
		writeWorkspaceMapConfig(projectPath, { followSymlinks: true });
		const inRootTarget = path.join(projectPath, 'shared', 'linked');
		const outsideTarget = path.join(outsidePath, 'external');
		createMinimalRepositoryAt(inRootTarget, 'Linked');
		createMinimalRepositoryAt(outsideTarget, 'External');
		mkdirSync(path.join(projectPath, 'projects'), { recursive: true });

		if (!trySymlink(inRootTarget, path.join(projectPath, 'projects', 'linked'))) {
			t.skip('directory symlinks are unavailable in this environment');
			return;
		}

		if (!trySymlink(outsideTarget, path.join(projectPath, 'projects', 'external'))) {
			t.skip('directory symlinks are unavailable in this environment');
			return;
		}

		const result = runMap(projectPath, ['--stdout']);

		assert.equal(result.status, 0);
		assert.match(result.stdout, /### `projects\/linked\/`/);
		assert.match(result.stdout, /agent rules: `projects\/linked\/AGENTS\.md`/);
		assert.doesNotMatch(result.stdout, /projects\/external/);
	} finally {
		removeTempProject(projectPath);
		rmSync(outsidePath, { recursive: true, force: true });
	}
});
