import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, readFileSync, rmSync, unlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

const projectRoot = path.resolve(fileURLToPath(new URL('../..', import.meta.url)));
const cliPath = path.join(projectRoot, 'dist', 'cli', 'index.js');

function createTempProject() {
	return mkdtempSync(path.join(tmpdir(), 'mustflow-doctor-'));
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

test('prints a read-only doctor summary as json', () => {
	const projectPath = createTempProject();

	try {
		initProject(projectPath);
		const result = runCli(projectPath, ['doctor', '--json']);
		const output = JSON.parse(result.stdout);

		assert.equal(result.status, 0, result.stderr || result.stdout);
		assert.equal(result.stderr, '');
		assert.equal(output.schema_version, '1');
		assert.equal(output.command, 'doctor');
		assert.equal(output.ok, true);
		assert.equal(output.strict, false);
		assert.equal(path.resolve(output.mustflow_root), path.resolve(projectPath));
		assert.equal(output.installed, true);
		assert.equal(output.check.ok, true);
		assert.equal(output.check.issue_count, 0);
		assert.equal(output.check.warning_count, 0);
		assert.deepEqual(output.check.warnings, []);
		assert.equal(output.context.manifest_lock, 'present');
		assert.equal(output.context.command_contract_exists, true);
		assert.ok(output.context.runnable_intents.includes('mustflow_check'));
		assert.deepEqual(output.context.missing_read_order, []);
		assert.deepEqual(output.command_environment.inherited_intents, []);
		assert.deepEqual(output.command_environment.inherited_network_intents, []);
		assert.equal(output.effective_policy.project_commands_require_mf_run, true);
		assert.equal(output.effective_policy.allow_inferred_commands, false);
		assert.equal(output.effective_policy.auto_commit, false);
		assert.equal(output.effective_policy.auto_push, false);
		assert.equal(output.effective_policy.raw_logs_allowed, false);
		assert.equal(output.state_policy.cache_path, '.mustflow/cache/');
		assert.equal(output.state_policy.state_path, '.mustflow/state/');
		assert.equal(output.state_policy.versioned, false);
		assert.equal(output.state_policy.safe_to_delete, true);
		assert.equal(output.state_policy.stores_raw_conversation, false);
		assert.equal(output.state_policy.stores_full_terminal_output, false);
		assert.equal(output.state_policy.stores_hidden_chain_of_thought, false);
		assert.ok(output.blocked_actions.includes('unconfigured_project_command'));
		assert.ok(output.blocked_actions.includes('unmanaged_long_running_process'));
		assert.ok(output.blocked_actions.includes('auto_push'));
		assert.ok(output.blocked_actions.includes('raw_transcript_storage'));
		assert.ok(output.diagnostics.some((item) => item.id === 'install' && item.status === 'ok'));
		assert.ok(output.diagnostics.some((item) => item.id === 'validation' && item.status === 'ok'));
		assert.ok(output.diagnostics.some((item) => item.id === 'skill_routes' && item.status === 'info'));
		assert.ok(output.diagnostics.some((item) => item.id === 'commands' && item.status === 'ok'));
		assert.ok(output.diagnostics.some((item) => item.id === 'environment' && item.status === 'ok'));
		assert.ok(output.diagnostics.some((item) => item.id === 'read_order' && item.status === 'ok'));
		assert.ok(output.next_steps.includes('mf help workflow'));
		assert.ok(output.next_steps.includes('mf help commands'));
	} finally {
		removeTempProject(projectPath);
	}
});

test('localizes doctor human-readable summary labels', () => {
	const projectPath = createTempProject();

	try {
		initProject(projectPath);
		const result = runCli(projectPath, ['--lang', 'ko', 'doctor']);

		assert.equal(result.status, 0, result.stderr || result.stdout);
		assert.match(result.stdout, /설치됨: 예/);
		assert.match(result.stdout, /검사: 통과/);
		assert.match(result.stdout, /\[정상\] 설치:/);
		assert.doesNotMatch(result.stdout, /Installed: yes/);
		assert.doesNotMatch(result.stdout, /Check: passed/);
	} finally {
		removeTempProject(projectPath);
	}
});

test('doctor warns when agent-runnable intents inherit the host environment', () => {
	const projectPath = createTempProject();

	try {
		initProject(projectPath);
		const commandsPath = path.join(projectPath, '.mustflow', 'config', 'commands.toml');
		writeFileSync(
			commandsPath,
			`${readFileSync(commandsPath, 'utf8')}
[intents.network_env]
status = "configured"
lifecycle = "oneshot"
run_policy = "agent_allowed"
description = "Run with inherited env and network access."
argv = ["node", "--version"]
cwd = "."
timeout_seconds = 10
stdin = "closed"
success_exit_codes = [0]
writes = []
env_policy = "inherit"
network = true
destructive = false
`,
		);
		unlinkSync(path.join(projectPath, '.mustflow', 'config', 'manifest.lock.toml'));

		const result = runCli(projectPath, ['doctor', '--json']);
		const output = JSON.parse(result.stdout);

		assert.equal(result.status, 0, result.stderr || result.stdout);
		assert.equal(output.ok, true);
		assert.deepEqual(output.command_environment.inherited_intents, ['network_env']);
		assert.deepEqual(output.command_environment.inherited_network_intents, ['network_env']);
		assert.ok(
			output.diagnostics.some(
				(item) =>
					item.id === 'environment' &&
					item.status === 'warn' &&
					item.summary.includes('network_env') &&
					item.action === 'mf check --strict --json',
			),
		);
		assert.ok(output.next_steps.includes('mf check --strict --json'));
	} finally {
		removeTempProject(projectPath);
	}
});

test('strict doctor summarizes skill index and body alignment', () => {
	const projectPath = createTempProject();

	try {
		initProject(projectPath);

		const result = runCli(projectPath, ['doctor', '--strict', '--json']);
		const output = JSON.parse(result.stdout);

		assert.equal(result.status, 0, result.stderr || result.stdout);
		assert.equal(output.strict, true);
		assert.ok(
			output.diagnostics.some(
				(item) =>
					item.id === 'skill_routes' &&
					item.status === 'ok' &&
					item.summary === '0 skill index/body alignment issues',
			),
		);
	} finally {
		removeTempProject(projectPath);
	}
});

test('strict doctor highlights skill index and body drift', () => {
	const projectPath = createTempProject();

	try {
		initProject(projectPath);
		const skillsIndexPath = path.join(projectPath, '.mustflow', 'skills', 'INDEX.md');
		const skillsIndex = readFileSync(skillsIndexPath, 'utf8').replace(
			/^\| Documentation changes affect public or workflow docs \| `\.mustflow\/skills\/docs-update\/SKILL\.md` \|.*\|$/mu,
			'| Documentation changes affect public or workflow docs | `.mustflow/skills/docs-update/SKILL.md` | Changed behavior or field | Relevant docs only | stale public docs | `docs_validate`, `lint` | Doc changes and skipped checks |',
		);
		writeFileSync(skillsIndexPath, skillsIndex);

		const result = runCli(projectPath, ['doctor', '--strict', '--json']);
		const output = JSON.parse(result.stdout);

		assert.equal(result.status, 1);
		assert.equal(output.strict, true);
		assert.match(
			output.check.issues.join('\n'),
			/\.mustflow\/skills\/INDEX\.md route \.mustflow\/skills\/docs-update\/SKILL\.md references command intent "lint" not declared by the skill frontmatter/,
		);
		assert.ok(
			output.diagnostics.some(
				(item) =>
					item.id === 'skill_routes' &&
					item.status === 'fail' &&
					item.summary === '1 skill index/body alignment issue' &&
					item.action === 'mf check --strict',
			),
		);
		assert.ok(output.next_steps.includes('mf check --strict'));
	} finally {
		removeTempProject(projectPath);
	}
});

test('uses the nearest mustflow root when doctor runs from a nested directory', () => {
	const projectPath = createTempProject();

	try {
		initProject(projectPath);
		const nestedPath = path.join(projectPath, 'src', 'feature');
		mkdirSync(nestedPath, { recursive: true });

		const result = runCli(nestedPath, ['doctor', '--json']);
		const output = JSON.parse(result.stdout);

		assert.equal(result.status, 0, result.stderr || result.stdout);
		assert.equal(path.resolve(output.mustflow_root), path.resolve(projectPath));
		assert.equal(output.ok, true);
	} finally {
		removeTempProject(projectPath);
	}
});

test('strict doctor reports validation issues without writing files', () => {
	const projectPath = createTempProject();

	try {
		initProject(projectPath);
		const agentsPath = path.join(projectPath, 'AGENTS.md');
		const changedContent = '# Local rules\n';
		writeFileSync(agentsPath, changedContent);

		const result = runCli(projectPath, ['doctor', '--strict', '--json']);
		const output = JSON.parse(result.stdout);

		assert.equal(result.status, 1);
		assert.equal(result.stderr, '');
		assert.equal(output.ok, false);
		assert.equal(output.strict, true);
		assert.equal(output.check.ok, false);
		assert.match(output.check.issues.join('\n'), /Lock hash mismatch: AGENTS\.md/);
		assert.ok(output.next_steps.includes('mf check --strict'));
		assert.equal(readFileSync(agentsPath, 'utf8'), changedContent);
	} finally {
		removeTempProject(projectPath);
	}
});

test('prints human-readable doctor output', () => {
	const projectPath = createTempProject();

	try {
		initProject(projectPath);
		const result = runCli(projectPath, ['doctor']);

		assert.equal(result.status, 0, result.stderr || result.stdout);
		assert.match(result.stdout, /mustflow doctor/);
		assert.match(result.stdout, /mustflow root:/);
		assert.match(result.stdout, /Installed: yes/);
		assert.match(result.stdout, /Check: passed/);
		assert.match(result.stdout, /Health:/);
		assert.match(result.stdout, /\[ok\] Install: installed/);
		assert.match(result.stdout, /\[ok\] .*: present, \d+ runnable intents?/);
		assert.match(result.stdout, /Suggested commands:/);
		assert.match(result.stdout, /No files were written/);
	} finally {
		removeTempProject(projectPath);
	}
});
