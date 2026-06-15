import assert from 'node:assert/strict';
import { mkdirSync, readFileSync, unlinkSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { test } from 'node:test';
import { createTempProject, initProject, removeTempProject, runCli } from './helpers/cli-harness.js';
import { describeCheckIssues } from '../../dist/core/check-issues.js';

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

test('check issue details preserve structured ids before regex fallback', () => {
	const [structured, legacy] = describeCheckIssues([
		{
			id: 'mustflow.command_contract.oneshot_missing_timeout',
			message: 'Producer-owned command contract message with revised wording.',
		},
		'Oneshot intent test must define timeout_seconds',
	]);

	assert.equal(structured.id, 'mustflow.command_contract.oneshot_missing_timeout');
	assert.equal(structured.message, 'Producer-owned command contract message with revised wording.');
	assert.equal(legacy.id, 'mustflow.command_contract.oneshot_missing_timeout');
});

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
		assertHasIssueDetail(
			check,
			'mustflow.command_contract.agent_shell_requires_allow',
			'Agent-runnable shell intent shell_dev must set allow_shell = true',
		);
	} finally {
		removeTempProject(projectPath);
	}
});

test('fails configured intents that declare typed inputs before execution support exists', () => {
	const projectPath = createTempProject('mustflow-check-command-contracts-');

	try {
		initProject(projectPath);
		const commandsPath = path.join(projectPath, '.mustflow', 'config', 'commands.toml');
		writeFileSync(
			commandsPath,
			`${readText(commandsPath)}

[intents.test_single]
status = "configured"
lifecycle = "oneshot"
run_policy = "agent_allowed"
description = "Run one test target."
argv = ["node", "--test", "{target_file}"]
cwd = "."
timeout_seconds = 10
stdin = "closed"
success_exit_codes = [0]
writes = []
network = false
destructive = false

[intents.test_single.inputs.target_file]
type = "path"
required = true
allowed_roots = ["tests"]
allowed_extensions = [".test.js"]
`,
		);

		const result = runCli(projectPath, ['check', '--json']);
		const check = JSON.parse(result.stdout);

		assert.equal(result.status, 1);
		assertHasIssueDetail(
			check,
			'mustflow.command_contract.inputs_invalid',
			'Configured intent test_single must not declare inputs until typed input execution is implemented',
		);
	} finally {
		removeTempProject(projectPath);
	}
});

test('validates typed intent input declarations without enabling command execution', () => {
	const projectPath = createTempProject('mustflow-check-command-contracts-');

	try {
		initProject(projectPath);
		const commandsPath = path.join(projectPath, '.mustflow', 'config', 'commands.toml');
		writeFileSync(
			commandsPath,
			`${readText(commandsPath)}

[intents.typed_probe]
status = "unknown"
description = "Document a future typed input contract."
argv = ["node", "--test={target_file}", "{missing_input}"]

[intents.typed_shell_probe]
status = "unknown"
description = "Document an unsafe shell input contract."
mode = "shell"
cmd = "node --test {target_file}"

[intents.typed_shell_probe.inputs.target_file]
type = "path"
allowed_roots = ["tests"]
allowed_extensions = [".test.js"]

[intents.typed_probe.inputs.TargetFile]
type = "path"
allowed_roots = ["tests"]
allowed_extensions = [".test.js"]

[intents.typed_probe.inputs.target_file]
type = "path"
allowed_roots = ["../outside", "C:\\\\temp", "CON"]
allowed_extensions = ["test.js"]

[intents.typed_probe.inputs.mode]
type = "enum"
allowed_values = []

[intents.typed_probe.inputs.count]
type = "integer"
min = 5
max = 2
`,
		);

		const result = runCli(projectPath, ['check', '--json']);
		const check = JSON.parse(result.stdout);

		assert.equal(result.status, 1);
		assertHasIssueDetail(check, 'mustflow.command_contract.inputs_invalid');
		assert.ok(
			check.issues.some((issue) =>
				issue.includes('Command input typed_probe.TargetFile name must start with a lowercase letter'),
			),
		);
		assert.ok(
			check.issues.some((issue) =>
				issue.includes(
					'[commands.intents.typed_probe.inputs.target_file].allowed_roots entry "../outside" must be a normalized repository-relative path',
				),
			),
		);
		assert.ok(
			check.issues.some((issue) =>
				issue.includes(
					'[commands.intents.typed_probe.inputs.target_file].allowed_roots entry "C:\\temp" must be a normalized repository-relative path',
				),
			),
		);
		assert.ok(
			check.issues.some((issue) =>
				issue.includes(
					'[commands.intents.typed_probe.inputs.target_file].allowed_extensions entry "test.js" must start with "."',
				),
			),
		);
		assert.ok(
			check.issues.some((issue) =>
				issue ===
				'[commands.intents.typed_probe.inputs.mode].allowed_values must define at least one value for enum inputs',
			),
		);
		assert.ok(
			check.issues.some((issue) =>
				issue ===
				'[commands.intents.typed_probe.inputs.count].min must be less than or equal to [commands.intents.typed_probe.inputs.count].max',
			),
		);
		assert.ok(
			check.issues.some((issue) =>
				issue ===
				'Command argv token "--test={target_file}" must use a whole-token typed input placeholder instead of string interpolation',
			),
		);
		assert.ok(
			check.issues.some((issue) =>
				issue === 'Command argv token "{missing_input}" references undeclared input typed_probe.missing_input',
			),
		);
		assert.ok(
			check.issues.some((issue) =>
				issue ===
				'[commands.intents.typed_shell_probe.inputs] requires argv command mode; shell-string interpolation is not allowed',
			),
		);
		assert.ok(
			check.issues.some((issue) =>
				issue ===
				'[commands.intents.typed_shell_probe.inputs] requires argv so typed input placeholders remain argument-bound',
			),
		);
	} finally {
		removeTempProject(projectPath);
	}
});

test('validates command precondition declarations as planning metadata only', () => {
	const projectPath = createTempProject('mustflow-check-command-contracts-');

	try {
		initProject(projectPath);
		const commandsPath = path.join(projectPath, '.mustflow', 'config', 'commands.toml');
		writeFileSync(
			commandsPath,
			`${readText(commandsPath)}

[intents.precondition_probe]
status = "unknown"
description = "Document invalid precondition metadata."
argv = ["node", "-e", ""]
preconditions = [
  { kind = "path_exists", satisfy_intent = "missing_build" },
  { kind = "artifact_freshness", artifact = "../dist/out.js", sources = [] },
  { kind = "unknown_kind", path = "dist/out.js" },
]
`,
		);

		const result = runCli(projectPath, ['check', '--json']);
		const check = JSON.parse(result.stdout);

		assert.equal(result.status, 1);
		assertHasIssueDetail(check, 'mustflow.command_contract.preconditions_invalid');
		assert.ok(check.issues.some((issue) => issue.includes('.path is required for kind = "path_exists"')));
		assert.ok(check.issues.some((issue) => issue.includes('.satisfy_intent references unknown intent "missing_build"')));
		assert.ok(check.issues.some((issue) => issue.includes('.artifact must be a normalized repository-relative path')));
		assert.ok(check.issues.some((issue) => issue.includes('.sources must define at least one source path pattern')));
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
				'allow_project_local_bin_bare_executables = [1]',
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
				'allow_env_inheritance_risks = "yes"',
				'allow_long_running_command_patterns = "yes"',
				'network = false',
				'destructive = false',
				'',
			].join('\n'),
		);

		const result = runCli(projectPath, ['check']);

		assert.equal(result.status, 1);
		assert.match(result.stderr, /\[commands.defaults\]\.env_policy must be "inherit" or "minimal" or "allowlist"/);
		assert.match(result.stderr, /\[commands.defaults\]\.env_allowlist must be a string array/);
		assert.match(result.stderr, /\[commands.defaults\]\.allow_project_local_bin_bare_executables must be a string array/);
		assert.match(result.stderr, /\[commands.intents.test\]\.env_policy must be "inherit" or "minimal" or "allowlist"/);
		assert.match(result.stderr, /\[commands.intents.test\]\.env_allowlist must be a string array/);
		assert.match(result.stderr, /\[commands.intents.test\]\.allow_env_inheritance_risks must be a boolean/);
		assert.match(result.stderr, /\[commands.intents.test\]\.allow_long_running_command_patterns must be a boolean/);
	} finally {
		removeTempProject(projectPath);
	}
});

test('fails agent-runnable shell intents without explicit shell allowance', () => {
	const projectPath = createTempProject('mustflow-check-command-contracts-');

	try {
		initProject(projectPath);
		const commandsPath = path.join(projectPath, '.mustflow', 'config', 'commands.toml');
		writeFileSync(
			commandsPath,
			[
				readText(commandsPath),
				'[intents.shell_without_allow]',
				'status = "configured"',
				'lifecycle = "oneshot"',
				'run_policy = "agent_allowed"',
				'description = "Run a shell command without the explicit shell allowance."',
				'mode = "shell"',
				'cmd = "node --version"',
				'cwd = "."',
				'timeout_seconds = 10',
				'stdin = "closed"',
				'success_exit_codes = [0]',
				'writes = []',
				'network = false',
				'destructive = false',
				'',
				'[intents.shell_with_allow]',
				'status = "configured"',
				'lifecycle = "oneshot"',
				'run_policy = "agent_allowed"',
				'description = "Run a shell command with the explicit shell allowance."',
				'mode = "shell"',
				'cmd = "node --version"',
				'allow_shell = true',
				'cwd = "."',
				'timeout_seconds = 10',
				'stdin = "closed"',
				'success_exit_codes = [0]',
				'writes = []',
				'network = false',
				'destructive = false',
				'',
				'[intents.manual_shell_without_allow]',
				'status = "configured"',
				'lifecycle = "oneshot"',
				'run_policy = "requires_explicit_user_request"',
				'description = "Run a shell command only after a direct user request."',
				'mode = "shell"',
				'cmd = "node --version"',
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

		const result = runCli(projectPath, ['check', '--json']);
		const check = JSON.parse(result.stdout);

		assert.equal(result.status, 1);
		assertHasIssueDetail(
			check,
			'mustflow.command_contract.agent_shell_requires_allow',
			'Agent-runnable shell intent shell_without_allow must set allow_shell = true',
		);
		assert.ok(!check.issues.some((issue) => issue.includes('shell_with_allow must set allow_shell')));
		assert.ok(!check.issues.some((issue) => issue.includes('manual_shell_without_allow must set allow_shell')));
	} finally {
		removeTempProject(projectPath);
	}
});

test('strict check fails high-risk inherited command environments', () => {
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
				'description = "Run with implicit minimal env fallback."',
				'argv = ["node", "--version"]',
				'cwd = "."',
				'timeout_seconds = 10',
				'stdin = "closed"',
				'success_exit_codes = [0]',
				'writes = []',
				'network = false',
				'destructive = false',
				'',
				'[intents.explicit_env]',
				'status = "configured"',
				'lifecycle = "oneshot"',
				'run_policy = "agent_allowed"',
				'description = "Run with explicit inherited env and no high-risk flags."',
				'argv = ["node", "--version"]',
				'cwd = "."',
				'timeout_seconds = 10',
				'stdin = "closed"',
				'success_exit_codes = [0]',
				'writes = []',
				'env_policy = "inherit"',
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
				'[intents.destructive_env]',
				'status = "configured"',
				'lifecycle = "oneshot"',
				'run_policy = "agent_allowed"',
				'description = "Run with inherited env and destructive access."',
				'argv = ["node", "--version"]',
				'cwd = "."',
				'timeout_seconds = 10',
				'stdin = "closed"',
				'success_exit_codes = [0]',
				'writes = []',
				'env_policy = "inherit"',
				'network = false',
				'destructive = true',
				'',
				'[intents.shell_env]',
				'status = "configured"',
				'lifecycle = "oneshot"',
				'run_policy = "agent_allowed"',
				'description = "Run shell mode with inherited env."',
				'mode = "shell"',
				'cmd = "node --version"',
				'allow_shell = true',
				'cwd = "."',
				'timeout_seconds = 10',
				'stdin = "closed"',
				'success_exit_codes = [0]',
				'writes = []',
				'env_policy = "inherit"',
				'network = false',
				'destructive = false',
				'',
				'[intents.write_env]',
				'status = "configured"',
				'lifecycle = "oneshot"',
				'run_policy = "agent_allowed"',
				'description = "Run with inherited env and declared writes."',
				'argv = ["node", "--version"]',
				'cwd = "."',
				'timeout_seconds = 10',
				'stdin = "closed"',
				'success_exit_codes = [0]',
				'writes = ["dist/"]',
				'env_policy = "inherit"',
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

		assert.equal(result.status, 1);
		assert.ok(
			!check.warnings.some((warning) =>
				warning.includes('implicit_env implicitly inherits the host environment'),
			),
		);
		assert.ok(
			check.warnings.some((warning) =>
				warning.includes('explicit_env uses env_policy = "inherit"; set env_policy = "minimal" or "allowlist"'),
			),
		);
		assert.ok(
			check.issues.some((issue) =>
				issue.includes(
					'network_env uses env_policy = "inherit" (network = true); set env_policy = "minimal" or "allowlist"',
				),
			),
		);
		assert.ok(
			check.issues.some((issue) =>
				issue.includes(
					'destructive_env uses env_policy = "inherit" (destructive = true); set env_policy = "minimal" or "allowlist"',
				),
			),
		);
		assert.ok(
			check.issues.some((issue) =>
				issue.includes(
					'shell_env uses env_policy = "inherit" (mode = "shell"); set env_policy = "minimal" or "allowlist"',
				),
			),
		);
		assert.ok(
			check.issues.some((issue) =>
				issue.includes(
					'write_env uses env_policy = "inherit" (declared writes); set env_policy = "minimal" or "allowlist"',
				),
			),
		);
		assertHasIssueDetail(check, 'mustflow.command_contract.broad_env_inheritance');
		assert.ok(
			check.issueDetails.some(
				(issue) =>
					issue.id === 'mustflow.command_contract.broad_env_inheritance' &&
					issue.severity === 'error' &&
					issue.message.includes('network_env'),
			),
		);
		assert.ok(
			check.issueDetails.some(
				(issue) =>
					issue.id === 'mustflow.command_contract.broad_env_inheritance' &&
					issue.severity === 'warning' &&
					issue.message.includes('explicit_env'),
			),
		);
	} finally {
		removeTempProject(projectPath);
	}
});

test('explicit command contract allowances suppress acknowledged strict blockers', () => {
	const projectPath = createTempProject('mustflow-check-command-contracts-');

	try {
		initProject(projectPath);
		const commandsPath = path.join(projectPath, '.mustflow', 'config', 'commands.toml');
		writeFileSync(
			commandsPath,
			[
				readText(commandsPath),
				'[intents.allowed_inherited_env]',
				'status = "configured"',
				'lifecycle = "oneshot"',
				'run_policy = "agent_allowed"',
				'description = "Run a bounded command with intentionally inherited environment and network."',
				'argv = ["node", "--version"]',
				'cwd = "."',
				'timeout_seconds = 10',
				'stdin = "closed"',
				'success_exit_codes = [0]',
				'writes = []',
				'env_policy = "inherit"',
				'allow_env_inheritance_risks = true',
				'network = true',
				'destructive = false',
				'',
				'[intents.allowed_long_running_name]',
				'status = "configured"',
				'lifecycle = "oneshot"',
				'run_policy = "agent_allowed"',
				'description = "Run a bounded command whose name matches a common long-running pattern."',
				'argv = ["npm", "run", "dev"]',
				'allow_long_running_command_patterns = true',
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
			`${JSON.stringify({ name: 'example', version: '1.0.0', scripts: { dev: 'node --version' } }, null, 2)}\n`,
		);

		const result = runCli(projectPath, ['check', '--strict', '--json']);
		const check = JSON.parse(result.stdout);

		assert.equal(result.status, 0, result.stderr || result.stdout);
		assert.ok(!check.issues.some((issue) => issue.includes('allowed_inherited_env uses env_policy = "inherit"')));
		assert.ok(!check.warnings.some((warning) => warning.includes('allowed_inherited_env uses env_policy = "inherit"')));
		assert.ok(!check.issues.some((issue) => issue.includes('allowed_long_running_name contains a blocked long-running')));
	} finally {
		removeTempProject(projectPath);
	}
});

test('fails command contracts with out-of-range success exit codes', () => {
	const projectPath = createTempProject('mustflow-check-command-contracts-');

	try {
		initProject(projectPath);
		const commandsPath = path.join(projectPath, '.mustflow', 'config', 'commands.toml');
		writeFileSync(
			commandsPath,
			`${readText(commandsPath)}

[intents.invalid_success_exit]
status = "configured"
lifecycle = "oneshot"
run_policy = "agent_allowed"
description = "Invalid success exit code values."
argv = ["node", "--version"]
cwd = "."
timeout_seconds = 10
stdin = "closed"
success_exit_codes = [-1, 256]
writes = []
network = false
destructive = false
`,
		);

		const result = runCli(projectPath, ['check', '--strict', '--json']);
		const check = JSON.parse(result.stdout);

		assert.equal(result.status, 1);
		assertHasIssueDetail(
			check,
			'mustflow.command_contract.success_exit_codes_invalid',
			'[commands.intents.invalid_success_exit].success_exit_codes must be a non-empty integer array with values from 0 through 255',
		);
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
		const executableExtension = process.platform === 'win32' ? '.cmd' : '';
		writeFileSync(path.join(localBinPath, `eslint${executableExtension}`), '');
		writeFileSync(path.join(localBinPath, `mf${executableExtension}`), '');
		writeFileSync(path.join(localBinPath, `mustflow${executableExtension}`), '');
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
				'[intents.bare_mf]',
				'status = "configured"',
				'lifecycle = "oneshot"',
				'run_policy = "agent_allowed"',
				'description = "Run the mustflow CLI through its conventional executable."',
				'argv = ["mf", "check", "--strict"]',
				'cwd = "."',
				'timeout_seconds = 10',
				'stdin = "closed"',
				'success_exit_codes = [0]',
				'writes = []',
				'network = false',
				'destructive = false',
				'',
				'[intents.bare_mustflow]',
				'status = "configured"',
				'lifecycle = "oneshot"',
				'run_policy = "agent_allowed"',
				'description = "Run the mustflow CLI through its long executable name."',
				'argv = ["mustflow", "check", "--strict"]',
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
		assert.ok(!check.warnings.some((warning) => warning.includes('bare_mf uses bare executable')));
		assert.ok(!check.warnings.some((warning) => warning.includes('bare_mustflow uses bare executable')));
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

test('strict check normalizes intent cwd before warning about shared writes without effects', () => {
	const projectPath = createTempProject('mustflow-check-command-contracts-');

	try {
		initProject(projectPath);
		mkdirSync(path.join(projectPath, 'packages', 'app'), { recursive: true });
		const commandsPath = path.join(projectPath, '.mustflow', 'config', 'commands.toml');
		writeFileSync(
			commandsPath,
			[
				readText(commandsPath),
				'[intents.root_writer]',
				'status = "configured"',
				'lifecycle = "oneshot"',
				'run_policy = "agent_allowed"',
				'description = "Write from root."',
				`argv = ['${process.execPath}', '-e', 'console.log("root")']`,
				'cwd = "."',
				'timeout_seconds = 10',
				'stdin = "closed"',
				'success_exit_codes = [0]',
				'writes = ["dist/"]',
				'network = false',
				'destructive = false',
				'',
				'[intents.package_writer]',
				'status = "configured"',
				'lifecycle = "oneshot"',
				'run_policy = "agent_allowed"',
				'description = "Write from package cwd."',
				`argv = ['${process.execPath}', '-e', 'console.log("package")']`,
				'cwd = "packages/app"',
				'timeout_seconds = 10',
				'stdin = "closed"',
				'success_exit_codes = [0]',
				'writes = ["../../dist/"]',
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
				warning.includes('package_writer, root_writer share path:dist through writes without explicit effects or resource locks'),
			),
		);
	} finally {
		removeTempProject(projectPath);
	}
});
