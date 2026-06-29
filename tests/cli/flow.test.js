import assert from 'node:assert/strict';
import { existsSync, mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { test } from 'node:test';
import { fileURLToPath, pathToFileURL } from 'node:url';

const projectRoot = path.resolve(fileURLToPath(new URL('../..', import.meta.url)));
const cliPath = path.join(projectRoot, 'dist', 'cli', 'index.js');

function createTempProject() {
	const projectPath = mkdtempSync(path.join(tmpdir(), 'mustflow-flow-'));
	writeFileSync(path.join(projectPath, 'AGENTS.md'), '# AGENTS.md\n');
	writeFileSync(path.join(projectPath, 'README.md'), '# Temp project\n');
	mkdirSync(path.join(projectPath, '.mustflow', 'config'), { recursive: true });
	mkdirSync(path.join(projectPath, '.mustflow', 'docs'), { recursive: true });
	mkdirSync(path.join(projectPath, '.mustflow', 'skills'), { recursive: true });
	writeFileSync(path.join(projectPath, '.mustflow', 'docs', 'agent-workflow.md'), '# Workflow\n');
	writeFileSync(path.join(projectPath, '.mustflow', 'skills', 'router.toml'), 'schema_version = "1"\n');
	writeFileSync(path.join(projectPath, '.mustflow', 'skills', 'routes.toml'), 'schema_version = "1"\n');
	writeFileSync(path.join(projectPath, '.mustflow', 'skills', 'INDEX.md'), '# Skills\n');
	writeFileSync(
		path.join(projectPath, '.mustflow', 'config', 'mustflow.toml'),
		[
			'read_order = ["AGENTS.md", ".mustflow/config/commands.toml"]',
			'optional_read_order = ["REPO_MAP.md"]',
			'',
			'[document_roots]',
			'generated = ["REPO_MAP.md", "REPO_FLOW.md", ".mustflow/state/**"]',
			'',
		].join('\n'),
	);
	writeFileSync(
		path.join(projectPath, '.mustflow', 'config', 'commands.toml'),
		[
			'[intents.mustflow_check]',
			'status = "configured"',
			'lifecycle = "oneshot"',
			'run_policy = "agent_allowed"',
			'argv = ["node", "dist/cli/index.js", "check", "--strict"]',
			'stdin = "closed"',
			'timeout_seconds = 120',
			'',
			'[intents.repo_flow]',
			'status = "configured"',
			'lifecycle = "oneshot"',
			'run_policy = "agent_allowed"',
			'argv = ["node", "dist/cli/index.js", "flow", "--write"]',
			'stdin = "closed"',
			'timeout_seconds = 120',
			'',
		].join('\n'),
	);
	return projectPath;
}

function removeTempProject(projectPath) {
	rmSync(projectPath, { recursive: true, force: true });
}

function runFlow(cwd, args) {
	return spawnSync(process.execPath, [cliPath, 'flow', ...args], {
		cwd,
		encoding: 'utf8',
	});
}

test('prints a stable repository flow map without volatile local metadata', () => {
	const projectPath = createTempProject();

	try {
		const result = runFlow(projectPath, ['--stdout']);

		assert.equal(result.status, 0, result.stderr || result.stdout);
		assert.match(result.stdout, /^---\nmustflow_doc: repo-flow/m);
		assert.match(result.stdout, /^lifecycle: generated$/m);
		assert.match(result.stdout, /^generated_by: mustflow$/m);
		assert.match(result.stdout, /^relative_root: "\."$/m);
		assert.match(result.stdout, /^source_policy: flow_contract$/m);
		assert.match(result.stdout, /^privacy_mode: minimal$/m);
		assert.match(result.stdout, /^flow_count: [1-9]\d*$/m);
		assert.match(result.stdout, /^degraded: false$/m);
		assert.match(result.stdout, /^source_fingerprint: "sha256:[a-f0-9]{64}"$/m);
		assert.match(result.stdout, /^# REPO_FLOW\.md$/m);
		assert.match(result.stdout, /One-Screen Mental Model/);
		assert.match(result.stdout, /Agent Work Flow/);
		assert.match(result.stdout, /Command Execution Flow/);
		assert.match(result.stdout, /Generated and Receipt Flow/);
		assert.match(result.stdout, /Public Contract Surfaces/);
		assert.match(result.stdout, /Where To Edit First/);
		assert.match(result.stdout, /```mermaid/);
		assert.match(result.stdout, /AGENTS\.md/);
		assert.match(result.stdout, /\.mustflow\/config\/commands\.toml/);
		assert.match(result.stdout, /repo_flow/);
		assert.doesNotMatch(result.stdout, /Generated at/);
		assert.doesNotMatch(result.stdout, /\d{4}-\d{2}-\d{2}T/);
		assert.doesNotMatch(result.stdout, /https?:\/\//);
		assert.doesNotMatch(result.stdout, /^\s*(?:Remote|Branch):/m);
	} finally {
		removeTempProject(projectPath);
	}
});

test('writes REPO_FLOW.md and checks the fresh source fingerprint', () => {
	const projectPath = createTempProject();

	try {
		const write = runFlow(projectPath, ['--write']);
		const repoFlowPath = path.join(projectPath, 'REPO_FLOW.md');

		assert.equal(write.status, 0, write.stderr || write.stdout);
		assert.match(write.stdout, /Wrote REPO_FLOW\.md/);
		assert.ok(existsSync(repoFlowPath));

		const check = runFlow(projectPath, ['--check']);
		assert.equal(check.status, 0, check.stderr || check.stdout);
		assert.match(check.stdout, /REPO_FLOW\.md is current/);
	} finally {
		removeTempProject(projectPath);
	}
});

test('reports missing and stale REPO_FLOW.md during --check', () => {
	const projectPath = createTempProject();

	try {
		const missing = runFlow(projectPath, ['--check']);
		assert.equal(missing.status, 1);
		assert.match(missing.stderr, /REPO_FLOW\.md is missing/);

		writeFileSync(path.join(projectPath, 'REPO_FLOW.md'), [
			'---',
			'mustflow_doc: repo-flow',
			'lifecycle: generated',
			'generated_by: mustflow',
			'relative_root: "."',
			'source_policy: flow_contract',
			'privacy_mode: minimal',
			'flow_count: 1',
			'degraded: false',
			'source_fingerprint: "sha256:0000000000000000000000000000000000000000000000000000000000000000"',
			'---',
			'',
			'# REPO_FLOW.md',
			'',
		].join('\n'));

		const stale = runFlow(projectPath, ['--check']);
		assert.equal(stale.status, 1);
		assert.match(stale.stderr, /REPO_FLOW\.md is stale/);
	} finally {
		removeTempProject(projectPath);
	}
});

test('rejects unsupported flow options with usage help', () => {
	const projectPath = createTempProject();

	try {
		const unknownOption = runFlow(projectPath, ['--bad']);
		const conflictingMode = runFlow(projectPath, ['--check', '--write']);

		assert.equal(unknownOption.status, 1);
		assert.match(unknownOption.stderr, /Unknown option: --bad/u);
		assert.match(unknownOption.stderr, /Usage: mf flow \[options\]/u);
		assert.equal(conflictingMode.status, 1);
		assert.match(conflictingMode.stderr, /Cannot combine --check with --stdout or --write/u);
		assert.match(conflictingMode.stderr, /Usage: mf flow \[options\]/u);
	} finally {
		removeTempProject(projectPath);
	}
});

test('keeps repo flow frontmatter and source fingerprint rendering stable', async () => {
	const { getRepoFlowSourceFingerprint, renderRepoFlowFrontmatter } = await import(
		pathToFileURL(path.join(projectRoot, 'dist', 'cli', 'lib', 'repo-flow-frontmatter.js')).href
	);
	const input = {
		presentInputs: ['README.md', 'AGENTS.md'],
		configuredCommandIntents: ['repo_flow', 'mustflow_check'],
		configuredReadOrder: ['AGENTS.md', '.mustflow/config/commands.toml'],
		configuredOptionalReadOrder: ['REPO_MAP.md'],
		generatedDocuments: ['REPO_FLOW.md', 'REPO_MAP.md'],
		flowIds: ['command-execution', 'agent-task'],
	};
	const reorderedInput = {
		...input,
		presentInputs: [...input.presentInputs].reverse(),
		configuredCommandIntents: [...input.configuredCommandIntents].reverse(),
		flowIds: [...input.flowIds].reverse(),
	};
	const fingerprint = getRepoFlowSourceFingerprint(input);

	assert.match(fingerprint, /^sha256:[a-f0-9]{64}$/);
	assert.equal(getRepoFlowSourceFingerprint(reorderedInput), fingerprint);
	assert.deepEqual(renderRepoFlowFrontmatter(2, fingerprint), [
		'---',
		'mustflow_doc: repo-flow',
		'lifecycle: generated',
		'generated_by: mustflow',
		'relative_root: "."',
		'source_policy: flow_contract',
		'privacy_mode: minimal',
		'flow_count: 2',
		'degraded: false',
		`source_fingerprint: "${fingerprint}"`,
		'---',
		'',
	]);
});

test('computes the expected repo flow source fingerprint without rendering the body', async () => {
	const { generateRepoFlow, getExpectedRepoFlowSourceFingerprint } = await import(
		pathToFileURL(path.join(projectRoot, 'dist', 'cli', 'lib', 'repo-flow.js')).href
	);
	const projectPath = createTempProject();

	try {
		const repoFlow = generateRepoFlow(projectPath);
		const match = /^source_fingerprint: "(sha256:[a-f0-9]{64})"$/mu.exec(repoFlow);

		assert.ok(match);
		assert.equal(getExpectedRepoFlowSourceFingerprint(projectPath), match[1]);
	} finally {
		removeTempProject(projectPath);
	}
});
