import assert from 'node:assert/strict';
import { readFileSync, unlinkSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { test } from 'node:test';
import { createTempProject, initProject, removeTempProject, runCli } from './helpers/cli-harness.js';

function readText(filePath) {
	return readFileSync(filePath, 'utf8').replace(/\r\n/g, '\n');
}

function assertHasIssueDetail(check, expectedId, expectedMessage) {
	assert.ok(
		check.issueDetails.some(
			(issue) =>
				issue.id === expectedId &&
				(expectedMessage === undefined || issue.message === expectedMessage),
		),
		`missing issue detail ${expectedId}`,
	);
}

test('fails unsafe command lifecycle contracts', () => {
	const projectPath = createTempProject('mustflow-check-command-contracts-');

	try {
		initProject(projectPath);
		const commandsPath = path.join(projectPath, '.mustflow', 'config', 'commands.toml');
		writeFileSync(
			commandsPath,
			[
				'schema_version = "1"',
				'',
				'[defaults]',
				'missing_behavior = "do_not_guess"',
				'allow_inferred_commands = false',
				'require_lifecycle = true',
				'require_timeout_for_oneshot = true',
				'deny_unmanaged_long_running = true',
				'default_cwd = "."',
				'default_timeout_seconds = 600',
				'stdin = "closed"',
				'max_output_bytes = 1048576',
				'on_timeout = "terminate_process_tree"',
				'kill_after_seconds = 5',
				'',
				'[intents.test]',
				'status = "configured"',
				'lifecycle = "oneshot"',
				'run_policy = "agent_allowed"',
				'description = "Run tests."',
				'argv = ["node", "--version"]',
				'cwd = "."',
				'stdin = "closed"',
				'success_exit_codes = [0]',
				'writes = []',
				'network = false',
				'destructive = false',
				'',
				'[intents.dev]',
				'status = "configured"',
				'lifecycle = "server"',
				'run_policy = "agent_allowed"',
				'description = "Run a development server."',
				'argv = ["npm", "run", "dev"]',
				'cwd = "."',
				'timeout_seconds = 30',
				'stdin = "closed"',
				'success_exit_codes = [0]',
				'writes = []',
				'network = false',
				'destructive = false',
				'',
				'[intents.shell_bg]',
				'status = "configured"',
				'lifecycle = "oneshot"',
				'run_policy = "agent_allowed"',
				'description = "Background shell command."',
				'mode = "shell"',
				'cmd = "npm run dev &"',
				'cwd = "."',
				'timeout_seconds = 30',
				'stdin = "closed"',
				'success_exit_codes = [0]',
				'writes = []',
				'network = false',
				'destructive = false',
				'',
			].join('\n'),
		);

		const result = runCli(projectPath, ['check']);

		assert.equal(result.status, 1);
		assert.match(result.stderr, /Oneshot intent test must define timeout_seconds/);
		assert.match(result.stderr, /Long-running intent dev must not use run_policy = "agent_allowed"/);
		assert.match(result.stderr, /Shell intent shell_bg contains a blocked long-running or background pattern/);
	} finally {
		removeTempProject(projectPath);
	}
});

test('check json includes stable command-boundary issue ids', () => {
	const projectPath = createTempProject('mustflow-check-command-contracts-');

	try {
		initProject(projectPath);
		const commandsPath = path.join(projectPath, '.mustflow', 'config', 'commands.toml');
		writeFileSync(
			commandsPath,
			[
				'schema_version = "1"',
				'',
				'[defaults]',
				'missing_behavior = "do_not_guess"',
				'allow_inferred_commands = false',
				'require_lifecycle = true',
				'require_timeout_for_oneshot = true',
				'deny_unmanaged_long_running = true',
				'default_cwd = "."',
				'default_timeout_seconds = 600',
				'stdin = "closed"',
				'max_output_bytes = 1048576',
				'on_timeout = "terminate_process_tree"',
				'kill_after_seconds = 5',
				'',
				'[intents.test]',
				'status = "configured"',
				'lifecycle = "oneshot"',
				'run_policy = "agent_allowed"',
				'description = "Run tests."',
				'argv = ["node", "--version"]',
				'cwd = "."',
				'stdin = "closed"',
				'success_exit_codes = [0]',
				'writes = []',
				'network = false',
				'destructive = false',
				'',
			].join('\n'),
		);

		const result = runCli(projectPath, ['check', '--json']);
		const check = JSON.parse(result.stdout);

		assert.equal(result.status, 1);
		assertHasIssueDetail(
			check,
			'mustflow.command_contract.oneshot_missing_timeout',
			'Oneshot intent test must define timeout_seconds',
		);
	} finally {
		removeTempProject(projectPath);
	}
});

test('fails invalid command environment policy fields', () => {
	const projectPath = createTempProject('mustflow-check-command-contracts-');

	try {
		initProject(projectPath);
		const commandsPath = path.join(projectPath, '.mustflow', 'config', 'commands.toml');
		writeFileSync(
			commandsPath,
			[
				'schema_version = "1"',
				'',
				'[defaults]',
				'missing_behavior = "do_not_guess"',
				'allow_inferred_commands = false',
				'require_lifecycle = true',
				'require_timeout_for_oneshot = true',
				'deny_unmanaged_long_running = true',
				'default_cwd = "."',
				'default_timeout_seconds = 600',
				'stdin = "closed"',
				'max_output_bytes = 1048576',
				'on_timeout = "terminate_process_tree"',
				'kill_after_seconds = 5',
				'env_policy = "wide_open"',
				'env_allowlist = "TOKEN"',
				'',
				'[intents.test]',
				'status = "configured"',
				'lifecycle = "oneshot"',
				'run_policy = "agent_allowed"',
				'description = "Run tests."',
				'argv = ["node", "--version"]',
				'cwd = "."',
				'timeout_seconds = 10',
				'stdin = "closed"',
				'success_exit_codes = [0]',
				'writes = []',
				'env_policy = "everything"',
				'env_allowlist = [1]',
				'network = false',
				'destructive = false',
				'',
			].join('\n'),
		);

		const result = runCli(projectPath, ['check']);

		assert.equal(result.status, 1);
		assert.match(result.stderr, /\[commands.defaults\]\.env_policy must be "inherit" or "minimal" or "allowlist"/);
		assert.match(result.stderr, /\[commands.defaults\]\.env_allowlist must be a string array/);
		assert.match(result.stderr, /\[commands.intents.test\]\.env_policy must be "inherit" or "minimal" or "allowlist"/);
		assert.match(result.stderr, /\[commands.intents.test\]\.env_allowlist must be a string array/);
	} finally {
		removeTempProject(projectPath);
	}
});

test('strict check warns when configured intents share writes without effects', () => {
	const projectPath = createTempProject('mustflow-check-command-contracts-');

	try {
		initProject(projectPath);
		const commandsPath = path.join(projectPath, '.mustflow', 'config', 'commands.toml');
		writeFileSync(
			commandsPath,
			[
				readText(commandsPath),
				'[intents.writer_a]',
				'status = "configured"',
				'lifecycle = "oneshot"',
				'run_policy = "agent_allowed"',
				'description = "Write A."',
				`argv = ['${process.execPath}', '-e', 'console.log("a")']`,
				'cwd = "."',
				'timeout_seconds = 10',
				'stdin = "closed"',
				'success_exit_codes = [0]',
				'writes = ["dist/"]',
				'network = false',
				'destructive = false',
				'',
				'[intents.writer_b]',
				'status = "configured"',
				'lifecycle = "oneshot"',
				'run_policy = "agent_allowed"',
				'description = "Write B."',
				`argv = ['${process.execPath}', '-e', 'console.log("b")']`,
				'cwd = "."',
				'timeout_seconds = 10',
				'stdin = "closed"',
				'success_exit_codes = [0]',
				'writes = ["dist/"]',
				'network = false',
				'destructive = false',
				'',
			].join('\n'),
		);
		unlinkSync(path.join(projectPath, '.mustflow', 'config', 'manifest.lock.toml'));
		writeFileSync(
			path.join(projectPath, 'pyproject.toml'),
			['[project]', 'name = "example"', 'version = "1.0.0"', ''].join('\n'),
		);

		const result = runCli(projectPath, ['check', '--strict', '--json']);
		const check = JSON.parse(result.stdout);

		assert.equal(result.status, 0, result.stderr || result.stdout);
		assert.ok(
			check.warnings.some((warning) =>
				warning.includes('writer_a, writer_b share path:dist through writes without explicit effects or resource locks'),
			),
		);
		assertHasIssueDetail(check, 'mustflow.command_contract.shared_writes_without_effects');
	} finally {
		removeTempProject(projectPath);
	}
});
