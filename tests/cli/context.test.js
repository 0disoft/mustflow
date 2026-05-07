import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

const projectRoot = path.resolve(fileURLToPath(new URL('../..', import.meta.url)));
const cliPath = path.join(projectRoot, 'dist', 'cli', 'index.js');

function createTempProject() {
	return mkdtempSync(path.join(tmpdir(), 'mustflow-context-'));
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

function appendIntent(projectPath, text) {
	const commandsPath = path.join(projectPath, '.mustflow', 'config', 'commands.toml');
	const commands = readFileSync(commandsPath, 'utf8');
	writeFileSync(commandsPath, `${commands}\n${text.trim()}\n`);
}

test('prints a machine-readable agent context without command output tails', () => {
	const projectPath = createTempProject();

	try {
		initProject(projectPath);
		appendIntent(
			projectPath,
			`
[intents.echo_context]
status = "configured"
lifecycle = "oneshot"
run_policy = "agent_allowed"
description = "Print a context test message."
argv = ['${process.execPath}', '-e', 'console.log("context output should stay in receipt only")']
cwd = "."
timeout_seconds = 10
stdin = "closed"
success_exit_codes = [0]
writes = []
network = false
destructive = false
`,
		);

		const run = runCli(projectPath, ['run', 'echo_context', '--json']);
		assert.equal(run.status, 0);

		const result = runCli(projectPath, ['context', '--json']);
		const context = JSON.parse(result.stdout);
		const echoIntent = context.command_contract.intents.find((intent) => intent.name === 'echo_context');

		assert.equal(result.status, 0);
		assert.equal(context.schema_version, '1');
		assert.equal(context.command, 'context');
		assert.equal(context.installed, true);
		assert.equal(context.mustflow_root, projectPath);
		assert.equal(context.authority.primary_instruction, 'AGENTS.md');
		assert.equal(context.read_order[0].path, 'AGENTS.md');
		assert.equal(context.read_order[0].exists, true);
		assert.equal(context.command_contract.path, '.mustflow/config/commands.toml');
		assert.equal(echoIntent.status, 'configured');
		assert.equal(echoIntent.lifecycle, 'oneshot');
		assert.equal(echoIntent.run_policy, 'agent_allowed');
		assert.ok(context.command_contract.runnable_intents.includes('echo_context'));
		assert.equal(context.effective_policy.entrypoint, 'AGENTS.md');
		assert.equal(context.effective_policy.nearest_agents, 'AGENTS.md');
		assert.equal(context.effective_policy.command_contract, '.mustflow/config/commands.toml');
		assert.equal(context.effective_policy.project_commands_require_mf_run, true);
		assert.equal(context.effective_policy.allow_inferred_commands, false);
		assert.equal(context.effective_policy.auto_stage, false);
		assert.equal(context.effective_policy.auto_commit, false);
		assert.equal(context.effective_policy.auto_push, false);
		assert.equal(context.effective_policy.state_is_versioned, false);
		assert.equal(context.effective_policy.raw_logs_allowed, false);
		assert.equal(context.state_policy.cache_path, '.mustflow/cache/');
		assert.equal(context.state_policy.state_path, '.mustflow/state/');
		assert.equal(context.state_policy.versioned, false);
		assert.equal(context.state_policy.safe_to_delete, true);
		assert.equal(context.state_policy.stores_raw_conversation, false);
		assert.equal(context.state_policy.stores_full_terminal_output, false);
		assert.equal(context.state_policy.stores_hidden_chain_of_thought, false);
		assert.ok(context.blocked_actions.includes('unconfigured_project_command'));
		assert.ok(context.blocked_actions.includes('unmanaged_long_running_process'));
		assert.ok(context.blocked_actions.includes('auto_push'));
		assert.ok(context.blocked_actions.includes('raw_transcript_storage'));
		assert.equal(context.latest_run.exists, true);
		assert.equal(context.latest_run.intent, 'echo_context');
		assert.equal(context.latest_run.status, 'passed');
		assert.equal(context.latest_run.timed_out, false);
		assert.equal(context.latest_run.exit_code, 0);
		assert.equal(context.latest_run.stdout, undefined);
		assert.equal(context.latest_run.stderr, undefined);
	} finally {
		removeTempProject(projectPath);
	}
});
