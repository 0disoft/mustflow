import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { after, before, test } from 'node:test';
import {
	cloneProjectFixture,
	createTempProject,
	removeTempProject,
	runCliInProcess,
} from './helpers/cli-harness.js';

let cleanGitProjectFixture;

before(() => {
	cleanGitProjectFixture = createTempProject('mustflow-next-clean-fixture-');
	createNextProjectFixture(cleanGitProjectFixture);
	commitGitBaseline(cleanGitProjectFixture);
});

after(() => {
	for (const projectPath of [cleanGitProjectFixture]) {
		if (projectPath) {
			removeTempProject(projectPath);
		}
	}
});

async function runCli(cwd, args) {
	return runCliInProcess(cwd, args);
}

function runGit(projectPath, args) {
	return spawnSync('git', ['-C', projectPath, ...args], {
		cwd: projectPath,
		encoding: 'utf8',
		stdio: ['ignore', 'pipe', 'pipe'],
		windowsHide: true,
	});
}

function commitGitBaseline(projectPath) {
	let result = runGit(projectPath, ['init']);
	assert.equal(result.status, 0, result.stderr || result.stdout);

	for (const args of [
		['config', 'user.email', 'mustflow-tests@example.invalid'],
		['config', 'user.name', 'mustflow tests'],
		['add', '.'],
		['commit', '-m', 'baseline'],
	]) {
		result = runGit(projectPath, args);
		assert.equal(result.status, 0, result.stderr || result.stdout);
	}
}

function commandsPath(projectPath) {
	return path.join(projectPath, '.mustflow', 'config', 'commands.toml');
}

function writeProjectFile(projectPath, relativePath, content) {
	const filePath = path.join(projectPath, ...relativePath.split('/'));
	mkdirSync(path.dirname(filePath), { recursive: true });
	writeFileSync(filePath, content);
}

function createNextProjectFixture(projectPath) {
	writeProjectFile(
		projectPath,
		'AGENTS.md',
		`# Test mustflow project

This fixture contains only the workflow files required by mf next tests.
`,
	);
	writeProjectFile(
		projectPath,
		'.mustflow/config/mustflow.toml',
		`schema_version = "1"

[map]
output = "REPO_MAP.md"
mode = "anchors_only"
privacy = "minimal"
include_nested = false
`,
	);
	writeProjectFile(projectPath, '.mustflow/skills/router.toml', 'schema_version = "1"\n');
	writeProjectFile(projectPath, '.mustflow/skills/routes.toml', 'schema_version = "1"\n');
	writeProjectFile(
		projectPath,
		'.mustflow/skills/INDEX.md',
		`# Skills Index

No test skills are installed in this fixture.
`,
	);
	writeProjectFile(projectPath, '.mustflow/config/commands.toml', commandsToml());
}

function commandsToml() {
	return `schema_version = "1"

[defaults]
missing_behavior = "do_not_guess"
allow_inferred_commands = false
require_lifecycle = true
require_timeout_for_oneshot = true
deny_unmanaged_long_running = true
default_cwd = "."
default_timeout_seconds = 600
stdin = "closed"
max_output_bytes = 1048576
on_timeout = "terminate_process_tree"
kill_after_seconds = 5
env_policy = "minimal"
env_allowlist = []

[intents.mustflow_check]
status = "configured"
lifecycle = "oneshot"
run_policy = "agent_allowed"
description = "Validate the fixture workflow."
argv = ["node", "-e", "process.exit(0)"]
cwd = "."
timeout_seconds = 10
stdin = "closed"
success_exit_codes = [0]
writes = []
network = false
destructive = false
required_after = ["mustflow_config_change", "mustflow_docs_change"]

[intents.test_related]
status = "configured"
lifecycle = "oneshot"
run_policy = "agent_allowed"
description = "Run related tests for changed source files."
argv = ["node", "-e", "process.exit(0)"]
cwd = "."
timeout_seconds = 10
stdin = "closed"
success_exit_codes = [0]
writes = []
network = false
destructive = false
required_after = ["code_change", "test_change"]

[intents.test_related.covers]
reasons = ["code_change", "test_change"]
surfaces = ["mustflow_cli"]
paths = ["src/**", "tests/**"]
contracts = ["related CLI regression coverage"]

[intents.test_related.cost]
expected_seconds = 1
cost_tier = "low"
`;
}

function appendIntent(projectPath, text) {
	const commands = readFileSync(commandsPath(projectPath), 'utf8');
	writeFileSync(commandsPath(projectPath), `${commands}\n${text.trim()}\n`);
}

function codeProbeIntent() {
	return `
[intents.code_probe]
status = "configured"
lifecycle = "oneshot"
run_policy = "agent_allowed"
description = "Probe code-change verification."
argv = ['${process.execPath}', '-e', 'console.log("code probe")']
cwd = "."
timeout_seconds = 10
stdin = "closed"
success_exit_codes = [0]
writes = []
network = false
destructive = false
required_after = ["code_change"]
`;
}

function writeChangedSource(projectPath) {
	mkdirSync(path.join(projectPath, 'src'), { recursive: true });
	writeFileSync(path.join(projectPath, 'src', 'index.ts'), 'export const changed = true;\n');
}

test('next reports idle when no changed files need verification', async () => {
	const projectPath = cloneProjectFixture(cleanGitProjectFixture, 'mustflow-next-clean-');

	try {
		const result = await runCli(projectPath, ['next', '--json']);
		const output = JSON.parse(result.stdout);

		assert.equal(result.status, 0, result.stderr || result.stdout);
		assert.equal(output.schema_version, '1');
		assert.equal(output.command, 'next');
		assert.equal(output.status, 'idle');
		assert.equal(output.policy.direct_commands_allowed, false);
		assert.equal(output.policy.grants_command_authority, false);
		assert.equal(output.policy.writes_files, false);
		assert.equal(output.state.changed_file_count, 0);
		assert.equal(output.decision.kind, 'none');
		assert.equal(output.script_pack_suggestions.status, 'empty');
		assert.deepEqual(output.script_pack_suggestions.suggestions, []);
	} finally {
		removeTempProject(projectPath);
	}
});

test('next recommends default template verification instead of blocking on missing test commands', async () => {
	const projectPath = cloneProjectFixture(cleanGitProjectFixture, 'mustflow-next-changed-');

	try {
		writeChangedSource(projectPath);

		const result = await runCli(projectPath, ['next', '--json']);
		const output = JSON.parse(result.stdout);

		assert.equal(result.status, 0, result.stderr || result.stdout);
		assert.equal(output.status, 'needs_verification');
		assert.equal(output.decision.kind, 'verify');
		assert.equal(output.decision.command, 'mf verify --changed --json');
		assert.ok(output.state.validation_reasons.includes('code_change'));
		assert.ok(output.state.selected_intents.includes('test_related'));
		assert.equal(output.gaps.length, 0);
		assert.ok(output.recommended_commands.includes('mf verify --changed --json'));
		assert.ok(!output.recommended_commands.some((command) => /npm test|bun test|node --test/u.test(command)));
		assert.equal(output.script_pack_suggestions.status, 'suggested');
		assert.ok(
			output.script_pack_suggestions.suggestions.some(
				(suggestion) => suggestion.script_ref === 'repo/generated-boundary',
			),
		);
		assert.ok(
			output.script_pack_suggestions.suggestions.every(
				(suggestion) => suggestion.read_only && !suggestion.mutates && !suggestion.network,
			),
		);

		const text = await runCli(projectPath, ['next']);
		assert.equal(text.status, 0, text.stderr || text.stdout);
		assert.match(text.stdout, /mf verify --changed --json/u);
		assert.match(text.stdout, /repo\/generated-boundary/u);
		assert.doesNotMatch(text.stdout, /npm test|bun test|node --test/u);
	} finally {
		removeTempProject(projectPath);
	}
});

test('next recommends configured verification when changed files are covered', async () => {
	const projectPath = cloneProjectFixture(cleanGitProjectFixture, 'mustflow-next-code-probe-');

	try {
		appendIntent(projectPath, codeProbeIntent());
		runGit(projectPath, ['add', '.mustflow/config/commands.toml']);
		let result = runGit(projectPath, ['commit', '-m', 'add code probe intent']);
		assert.equal(result.status, 0, result.stderr || result.stdout);
		writeChangedSource(projectPath);

		result = await runCli(projectPath, ['next', '--json']);
		const output = JSON.parse(result.stdout);

		assert.equal(result.status, 0, result.stderr || result.stdout);
		assert.equal(output.status, 'needs_verification');
		assert.equal(output.decision.kind, 'verify');
		assert.equal(output.decision.command, 'mf verify --changed --json');
		assert.ok(output.state.selected_intents.includes('code_probe'));
		assert.ok(output.state.selected_intents.includes('test_related'));
		assert.deepEqual(output.gaps, []);
		assert.ok(output.script_pack_suggestions.suggestions.length > 0);
	} finally {
		removeTempProject(projectPath);
	}
});
