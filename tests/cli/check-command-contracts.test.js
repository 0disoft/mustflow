import assert from 'node:assert/strict';
import { mkdirSync, readFileSync, unlinkSync, writeFileSync } from 'node:fs';
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
				'[intents.argv_bg]',
				'status = "configured"',
				'lifecycle = "oneshot"',
				'run_policy = "agent_allowed"',
				'description = "Background argv shell wrapper."',
				'argv = ["sh", "-c", "nohup npm run dev >/dev/null 2>&1 &"]',
				'cwd = "."',
				'timeout_seconds = 30',
				'stdin = "closed"',
				'success_exit_codes = [0]',
				'writes = []',
				'network = false',
				'destructive = false',
				'',
				'[intents.shell_dev]',
				'status = "configured"',
				'lifecycle = "oneshot"',
				'run_policy = "agent_allowed"',
				'description = "Direct long-running shell command."',
				'mode = "shell"',
				'cmd = "npm run dev"',
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
		assert.match(result.stderr, /Intent argv_bg contains a blocked long-running or background command pattern/);
		assert.match(result.stderr, /Intent shell_dev contains a blocked long-running or background command pattern/);
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
				'[intents.argv_bg]',
				'status = "configured"',
				'lifecycle = "oneshot"',
				'run_policy = "agent_allowed"',
				'description = "Background argv shell wrapper."',
				'argv = ["sh", "-c", "nohup npm run dev >/dev/null 2>&1 &"]',
				'cwd = "."',
				'timeout_seconds = 30',
				'stdin = "closed"',
				'success_exit_codes = [0]',
				'writes = []',
				'network = false',
				'destructive = false',
				'',
				'[intents.shell_dev]',
				'status = "configured"',
				'lifecycle = "oneshot"',
				'run_policy = "agent_allowed"',
				'description = "Direct long-running shell command."',
				'mode = "shell"',
				'cmd = "npm run dev"',
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

		const result = runCli(projectPath, ['check', '--json']);
		const check = JSON.parse(result.stdout);

		assert.equal(result.status, 1);
		assertHasIssueDetail(
			check,
			'mustflow.command_contract.oneshot_missing_timeout',
			'Oneshot intent test must define timeout_seconds',
		);
		assertHasIssueDetail(
			check,
			'mustflow.command_contract.long_running_command_pattern',
			'Intent argv_bg contains a blocked long-running or background command pattern',
		);
		assertHasIssueDetail(
			check,
			'mustflow.command_contract.long_running_command_pattern',
			'Intent shell_dev contains a blocked long-running or background command pattern',
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

test('strict check warns on broad command environment inheritance', () => {
	const projectPath = createTempProject('mustflow-check-command-contracts-');

	try {
		initProject(projectPath);
		const commandsPath = path.join(projectPath, '.mustflow', 'config', 'commands.toml');
		const commandsWithoutDefaultEnv = readText(commandsPath).replace(
			'env_policy = "minimal"\nenv_allowlist = []\n',
			'',
		);
		writeFileSync(
			commandsPath,
			[
				commandsWithoutDefaultEnv,
				'[intents.implicit_env]',
				'status = "configured"',
				'lifecycle = "oneshot"',
				'run_policy = "agent_allowed"',
				'description = "Run with implicit env fallback."',
				'argv = ["node", "--version"]',
				'cwd = "."',
				'timeout_seconds = 10',
				'stdin = "closed"',
				'success_exit_codes = [0]',
				'writes = []',
				'network = false',
				'destructive = false',
				'',
				'[intents.network_env]',
				'status = "configured"',
				'lifecycle = "oneshot"',
				'run_policy = "agent_allowed"',
				'description = "Run with inherited env and network access."',
				'argv = ["node", "--version"]',
				'cwd = "."',
				'timeout_seconds = 10',
				'stdin = "closed"',
				'success_exit_codes = [0]',
				'writes = []',
				'env_policy = "inherit"',
				'network = true',
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
				warning.includes('implicit_env implicitly inherits the host environment; set env_policy = "minimal" or "allowlist"'),
			),
		);
		assert.ok(
			check.warnings.some((warning) =>
				warning.includes('network_env uses env_policy = "inherit" with network = true; set env_policy = "minimal" or "allowlist"'),
			),
		);
		assertHasIssueDetail(check, 'mustflow.command_contract.broad_env_inheritance');
	} finally {
		removeTempProject(projectPath);
	}
});

test('strict check warns when bare argv executable resolves only through project-local bin', () => {
	const projectPath = createTempProject('mustflow-check-command-contracts-');

	try {
		initProject(projectPath);
		const localBinPath = path.join(projectPath, 'node_modules', '.bin');
		mkdirSync(localBinPath, { recursive: true });
		writeFileSync(path.join(localBinPath, process.platform === 'win32' ? 'eslint.cmd' : 'eslint'), '');
		const commandsPath = path.join(projectPath, '.mustflow', 'config', 'commands.toml');
		writeFileSync(
			commandsPath,
			[
				readText(commandsPath),
				'[intents.bare_eslint]',
				'status = "configured"',
				'lifecycle = "oneshot"',
				'run_policy = "agent_allowed"',
				'description = "Run a bare local tool name."',
				'argv = ["eslint", "src/index.ts"]',
				'cwd = "."',
				'timeout_seconds = 10',
				'stdin = "closed"',
				'success_exit_codes = [0]',
				'writes = []',
				'network = false',
				'destructive = false',
				'',
				'[intents.package_manager_exec]',
				'status = "configured"',
				'lifecycle = "oneshot"',
				'run_policy = "agent_allowed"',
				'description = "Run a local tool through a package manager."',
				'argv = ["npm", "exec", "eslint", "--", "src/index.ts"]',
				'cwd = "."',
				'timeout_seconds = 10',
				'stdin = "closed"',
				'success_exit_codes = [0]',
				'writes = []',
				'network = false',
				'destructive = false',
				'',
			].join('\n'),
		);
		unlinkSync(path.join(projectPath, '.mustflow', 'config', 'manifest.lock.toml'));
		writeFileSync(
			path.join(projectPath, 'package.json'),
			`${JSON.stringify({ name: 'example', version: '1.0.0' }, null, 2)}\n`,
		);

		const result = runCli(projectPath, ['check', '--strict', '--json']);
		const check = JSON.parse(result.stdout);

		assert.equal(result.status, 0, result.stderr || result.stdout);
		assert.ok(
			check.warnings.some((warning) =>
				warning.includes(
					'bare_eslint uses bare executable "eslint" that matches project-local node_modules/.bin; use a package-manager mediated command',
				),
			),
		);
		assert.ok(!check.warnings.some((warning) => warning.includes('package_manager_exec uses bare executable')));
		assertHasIssueDetail(check, 'mustflow.command_contract.project_local_bin_bare_executable');
	} finally {
		removeTempProject(projectPath);
	}
});

test('fails oversized command output limits', () => {
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
				'max_output_bytes = 16777217',
				'on_timeout = "terminate_process_tree"',
				'kill_after_seconds = 5',
				'',
				'[intents.too_large]',
				'status = "configured"',
				'lifecycle = "oneshot"',
				'run_policy = "agent_allowed"',
				'description = "Run with too much output budget."',
				'argv = ["node", "--version"]',
				'cwd = "."',
				'timeout_seconds = 10',
				'max_output_bytes = 16777217',
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
		assert.ok(
			check.issues.some((issue) =>
			issue === '[commands.defaults].max_output_bytes must be less than or equal to 16777216 per output stream',
			),
		);
		assert.ok(
			check.issues.some((issue) =>
			issue === '[commands.intents.too_large].max_output_bytes must be less than or equal to 16777216 per output stream',
			),
		);
		assertHasIssueDetail(check, 'mustflow.command_contract.max_output_bytes_exceeds_limit');
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
