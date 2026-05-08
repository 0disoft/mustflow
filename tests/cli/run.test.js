import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

const projectRoot = path.resolve(fileURLToPath(new URL('../..', import.meta.url)));
const cliPath = path.join(projectRoot, 'dist', 'cli', 'index.js');
const packageVersion = JSON.parse(readFileSync(path.join(projectRoot, 'package.json'), 'utf8')).version;

function createTempProject() {
	return mkdtempSync(path.join(tmpdir(), 'mustflow-run-'));
}

function removeTempProject(projectPath) {
	rmSync(projectPath, { recursive: true, force: true });
}

function runCli(cwd, args, options = {}) {
	return spawnSync(process.execPath, [cliPath, ...args], {
		cwd,
		encoding: 'utf8',
		...options,
	});
}

function createEnvWithoutPathLookup() {
	const env = { ...process.env };
	const pathKey = Object.keys(env).find((key) => key.toLowerCase() === 'path') ?? 'PATH';

	env[pathKey] = '';

	return env;
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

test('runs a configured oneshot command intent', () => {
	const projectPath = createTempProject();

	try {
		initProject(projectPath);
		appendIntent(
			projectPath,
			`
[intents.echo_hello]
status = "configured"
lifecycle = "oneshot"
run_policy = "agent_allowed"
description = "Print a test message."
argv = ['${process.execPath}', '-e', 'console.log("hello from mf run")']
cwd = "."
timeout_seconds = 10
stdin = "closed"
success_exit_codes = [0]
writes = []
network = false
destructive = false
`,
		);

		const result = runCli(projectPath, ['run', 'echo_hello']);

		assert.equal(result.status, 0);
		assert.match(result.stdout, /hello from mf run/);
	} finally {
		removeTempProject(projectPath);
	}
});

test('reruns mustflow built-in intents through the current CLI entrypoint', () => {
	const projectPath = createTempProject();

	try {
		initProject(projectPath);
		appendIntent(
			projectPath,
			`
[intents.self_version]
status = "configured"
kind = "mustflow_builtin"
lifecycle = "oneshot"
run_policy = "agent_allowed"
description = "Run a built-in mustflow command without relying on PATH lookup."
argv = ["mf", "--version"]
cwd = "."
timeout_seconds = 10
stdin = "closed"
success_exit_codes = [0]
writes = []
network = false
destructive = false
`,
		);

		const result = runCli(projectPath, ['run', 'self_version', '--json'], {
			env: createEnvWithoutPathLookup(),
		});
		const receipt = JSON.parse(result.stdout);

		assert.equal(result.status, 0);
		assert.equal(result.stderr, '');
		assert.equal(receipt.intent, 'self_version');
		assert.equal(receipt.status, 'passed');
		assert.equal(receipt.stdout.tail.trim(), packageVersion);
	} finally {
		removeTempProject(projectPath);
	}
});

test('prints and writes a JSON run receipt', () => {
	const projectPath = createTempProject();

	try {
		initProject(projectPath);
		appendIntent(
			projectPath,
			`
[intents.echo_json]
status = "configured"
lifecycle = "oneshot"
run_policy = "agent_allowed"
description = "Print a receipt test message."
argv = ['${process.execPath}', '-e', 'console.log("hello receipt")']
cwd = "."
timeout_seconds = 10
stdin = "closed"
success_exit_codes = [0]
writes = []
network = false
destructive = false
`,
		);

		const result = runCli(projectPath, ['run', 'echo_json', '--json']);
		const receipt = JSON.parse(result.stdout);
		const latestPath = path.join(projectPath, '.mustflow', 'state', 'runs', 'latest.json');
		const latest = JSON.parse(readFileSync(latestPath, 'utf8'));

		assert.equal(result.status, 0);
		assert.equal(result.stderr, '');
		assert.equal(receipt.schema_version, '1');
		assert.equal(receipt.command, 'run');
		assert.equal(receipt.intent, 'echo_json');
		assert.equal(receipt.status, 'passed');
		assert.equal(receipt.timed_out, false);
		assert.equal(receipt.exit_code, 0);
		assert.equal(receipt.timeout_seconds, 10);
		assert.equal(receipt.stdout.truncated, false);
		assert.match(receipt.stdout.tail, /hello receipt/);
		assert.ok(existsSync(latestPath));
		assert.deepEqual(latest, receipt);
	} finally {
		removeTempProject(projectPath);
	}
});

test('records timed out command intents as JSON receipts', () => {
	const projectPath = createTempProject();

	try {
		initProject(projectPath);
		appendIntent(
			projectPath,
			`
[intents.slow_command]
status = "configured"
lifecycle = "oneshot"
run_policy = "agent_allowed"
description = "Wait longer than the configured timeout."
argv = ['${process.execPath}', '-e', 'setTimeout(() => {}, 10000)']
cwd = "."
timeout_seconds = 1
stdin = "closed"
success_exit_codes = [0]
writes = []
network = false
destructive = false
`,
		);

		const result = runCli(projectPath, ['run', 'slow_command', '--json']);
		const receipt = JSON.parse(result.stdout);
		const latest = JSON.parse(readFileSync(path.join(projectPath, '.mustflow', 'state', 'runs', 'latest.json'), 'utf8'));

		assert.equal(result.status, 1);
		assert.equal(result.stderr, '');
		assert.equal(receipt.status, 'timed_out');
		assert.equal(receipt.timed_out, true);
		assert.equal(receipt.exit_code, null);
		assert.equal(receipt.timeout_seconds, 1);
		assert.equal(receipt.kill_method, process.platform === 'win32' ? 'taskkill_process_tree' : 'process_group_sigterm');
		assert.deepEqual(latest, receipt);
	} finally {
		removeTempProject(projectPath);
	}
});

test('refuses non-oneshot command intents', () => {
	const projectPath = createTempProject();

	try {
		initProject(projectPath);
		appendIntent(
			projectPath,
			`
[intents.dev_server]
status = "configured"
lifecycle = "server"
run_policy = "requires_explicit_user_request"
description = "Run a development server."
argv = ['${process.execPath}', '-e', 'setInterval(() => {}, 1000)']
cwd = "."
timeout_seconds = 10
stdin = "closed"
success_exit_codes = [0]
writes = []
network = false
destructive = false
`,
		);

		const result = runCli(projectPath, ['run', 'dev_server']);

		assert.equal(result.status, 1);
		assert.match(result.stderr, /dev_server/);
		assert.match(result.stderr, /lifecycle = "server"/);
		assert.match(result.stderr, /mf run/);
	} finally {
		removeTempProject(projectPath);
	}
});
