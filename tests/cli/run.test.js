import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { chmodSync, cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { after, before, test } from 'node:test';
import { fileURLToPath, pathToFileURL } from 'node:url';

const projectRoot = path.resolve(fileURLToPath(new URL('../..', import.meta.url)));
const cliPath = path.join(projectRoot, 'dist', 'cli', 'index.js');
const packageVersion = JSON.parse(readFileSync(path.join(projectRoot, 'package.json'), 'utf8')).version;
let initializedProjectFixture;

function createTempProject() {
	return mkdtempSync(path.join(tmpdir(), 'mustflow-run-'));
}

function removeTempProject(projectPath) {
	rmSync(projectPath, { recursive: true, force: true });
}

function latestRunReceiptPath(projectPath) {
	return path.join(projectPath, '.mustflow', 'state', 'runs', 'latest.json');
}

function runCli(cwd, args, options = {}) {
	return spawnSync(process.execPath, [cliPath, ...args], {
		cwd,
		encoding: 'utf8',
		...options,
	});
}

before(() => {
	initializedProjectFixture = createTempProject();
	const result = runCli(initializedProjectFixture, ['init', '--yes']);
	assert.equal(result.status, 0, result.stderr || result.stdout);
});

after(() => {
	if (initializedProjectFixture) {
		removeTempProject(initializedProjectFixture);
	}
});

function createEnvWithoutPathLookup() {
	const env = { ...process.env };
	const pathKey = Object.keys(env).find((key) => key.toLowerCase() === 'path') ?? 'PATH';

	env[pathKey] = '';

	return env;
}

function createEnvWithLocalBinFirst(projectPath) {
	const env = { ...process.env };
	const pathKey = Object.keys(env).find((key) => key.toLowerCase() === 'path') ?? 'PATH';
	const currentPath = env[pathKey] ?? '';
	env[pathKey] = `${path.join(projectPath, 'node_modules', '.bin')}${path.delimiter}${currentPath}`;
	return env;
}

function initProject(projectPath) {
	assert.ok(initializedProjectFixture, 'initialized project fixture should be ready');
	cpSync(initializedProjectFixture, projectPath, { recursive: true });
}

function appendIntent(projectPath, text) {
	const commandsPath = path.join(projectPath, '.mustflow', 'config', 'commands.toml');
	const commands = readFileSync(commandsPath, 'utf8');
	writeFileSync(commandsPath, `${commands}\n${text.trim()}\n`);
}

function createLocalBinShim(projectPath, name, marker) {
	const localBinPath = path.join(projectPath, 'node_modules', '.bin');
	mkdirSync(localBinPath, { recursive: true });

	if (process.platform === 'win32') {
		writeFileSync(path.join(localBinPath, `${name}.cmd`), `@echo off\r\necho ${marker} %*\r\nexit /b 0\r\n`);
		return;
	}

	const shimPath = path.join(localBinPath, name);
	writeFileSync(shimPath, `#!/bin/sh\necho ${marker} "$@"\nexit 0\n`);
	chmodSync(shimPath, 0o755);
}

function trySymlink(target, linkPath, type) {
	try {
		symlinkSync(target, linkPath, type);
		return true;
	} catch (error) {
		if (
			error &&
			typeof error === 'object' &&
			'code' in error &&
			['EPERM', 'ENOTSUP'].includes(error.code)
		) {
			return false;
		}

		throw error;
	}
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

test('previews a runnable command intent without spawning or writing a receipt', () => {
	const projectPath = createTempProject();
	const markerPath = path.join(projectPath, 'dry-run-spawned.txt');

	try {
		initProject(projectPath);
		appendIntent(
			projectPath,
			`
[intents.preview_marker]
status = "configured"
lifecycle = "oneshot"
run_policy = "agent_allowed"
description = "Would create a marker file if executed."
argv = ['${process.execPath}', '-e', 'require("node:fs").writeFileSync(${JSON.stringify(markerPath)}, "ran")']
cwd = "."
timeout_seconds = 10
stdin = "closed"
success_exit_codes = [0]
writes = ["dry-run-spawned.txt"]
effects = [
  { type = "write", mode = "create", path = "dry-run-spawned.txt" },
]
network = false
destructive = false
`,
		);

		const result = runCli(projectPath, ['run', 'preview_marker', '--dry-run', '--json']);
		const preview = JSON.parse(result.stdout);

		assert.equal(result.status, 0, result.stderr || result.stdout);
		assert.equal(result.stderr, '');
		assert.equal(preview.schema_version, '1');
		assert.equal(preview.command, 'run');
		assert.equal(preview.preview, true);
		assert.equal(preview.preview_mode, 'dry-run');
		assert.equal(preview.intent, 'preview_marker');
		assert.equal(preview.runnable, true);
		assert.deepEqual(preview.eligibility, { ok: true, code: 'ok', detail: null });
		assert.equal(preview.reason_code, null);
		assert.equal(preview.cwd, '.');
		assert.equal(preview.resolved_cwd, projectPath);
		assert.equal(preview.timeout_seconds, 10);
		assert.equal(preview.mode, 'argv');
		assert.deepEqual(preview.argv, [
			process.execPath,
			'-e',
			`require("node:fs").writeFileSync(${JSON.stringify(markerPath)}, "ran")`,
		]);
		assert.equal(preview.resolved_argv.executable, process.execPath);
		assert.equal(preview.resolved_argv.shell, false);
		assert.deepEqual(preview.writes, ['dry-run-spawned.txt']);
		assert.equal(preview.effects[0].path, 'dry-run-spawned.txt');
		assert.equal(preview.network, false);
		assert.equal(preview.destructive, false);
		assert.deepEqual(preview.success_exit_codes, [0]);
		assert.equal(existsSync(markerPath), false);
		assert.equal(existsSync(latestRunReceiptPath(projectPath)), false);
	} finally {
		removeTempProject(projectPath);
	}
});

test('previews blocked and unknown command intents without writing a receipt', () => {
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

		const manualOnlyResult = runCli(projectPath, ['run', 'snapshot_update', '--dry-run', '--json']);
		const manualOnlyPreview = JSON.parse(manualOnlyResult.stdout);

		assert.equal(manualOnlyResult.status, 1);
		assert.equal(manualOnlyPreview.runnable, false);
		assert.equal(manualOnlyPreview.status, 'manual_only');
		assert.equal(manualOnlyPreview.reason_code, 'status_not_configured');

		const longRunningResult = runCli(projectPath, ['run', 'dev_server', '--dry-run', '--json']);
		const longRunningPreview = JSON.parse(longRunningResult.stdout);

		assert.equal(longRunningResult.status, 1);
		assert.equal(longRunningPreview.runnable, false);
		assert.equal(longRunningPreview.lifecycle, 'server');
		assert.equal(longRunningPreview.reason_code, 'lifecycle_not_oneshot');

		const unknownResult = runCli(projectPath, ['run', 'does_not_exist', '--plan-only', '--json']);
		const unknownPreview = JSON.parse(unknownResult.stdout);

		assert.equal(unknownResult.status, 1);
		assert.equal(unknownPreview.preview_mode, 'plan-only');
		assert.equal(unknownPreview.runnable, false);
		assert.equal(unknownPreview.reason_code, 'intent_not_table');
		assert.equal(unknownPreview.status, null);
		assert.equal(existsSync(latestRunReceiptPath(projectPath)), false);
	} finally {
		removeTempProject(projectPath);
	}
});

test('previews mustflow built-in intents through the current CLI entrypoint', () => {
	const projectPath = createTempProject();

	try {
		initProject(projectPath);
		createLocalBinShim(projectPath, 'mf', 'PWNED_MF_SHIM');
		appendIntent(
			projectPath,
			`
[intents.self_version_preview]
status = "configured"
kind = "mustflow_builtin"
lifecycle = "oneshot"
run_policy = "agent_allowed"
description = "Preview mustflow version without trusting repo-local shims."
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

		const result = runCli(projectPath, ['run', 'self_version_preview', '--plan-only', '--json'], {
			env: createEnvWithLocalBinFirst(projectPath),
		});
		const preview = JSON.parse(result.stdout);

		assert.equal(result.status, 0, result.stderr || result.stdout);
		assert.equal(preview.runnable, true);
		assert.deepEqual(preview.argv, ['mf', '--version']);
		assert.equal(preview.resolved_argv.executable, process.execPath);
		assert.deepEqual(preview.resolved_argv.args, [cliPath, '--version']);
		assert.equal(preview.resolved_argv.shell, false);
		assert.doesNotMatch(result.stdout, /PWNED_MF_SHIM/);
		assert.equal(existsSync(latestRunReceiptPath(projectPath)), false);
	} finally {
		removeTempProject(projectPath);
	}
});

test('previews command intent cwd boundary failures without spawning or writing a receipt', () => {
	const projectPath = createTempProject();
	const markerPath = path.join(path.dirname(projectPath), 'mustflow-outside-cwd-preview.txt');

	try {
		rmSync(markerPath, { force: true });
		initProject(projectPath);
		appendIntent(
			projectPath,
			`
[intents.outside_cwd_preview]
status = "configured"
lifecycle = "oneshot"
run_policy = "agent_allowed"
description = "Try to run outside the project root."
argv = ['${process.execPath}', '-e', 'require("node:fs").writeFileSync(${JSON.stringify(markerPath)}, "ran")']
cwd = ".."
timeout_seconds = 10
stdin = "closed"
success_exit_codes = [0]
writes = []
network = false
destructive = false
`,
		);

		const result = runCli(projectPath, ['run', 'outside_cwd_preview', '--dry-run', '--json']);
		const preview = JSON.parse(result.stdout);

		assert.equal(result.status, 1);
		assert.equal(result.stderr, '');
		assert.equal(preview.runnable, false);
		assert.equal(preview.reason_code, 'cwd_outside_project');
		assert.equal(preview.configured_cwd, '..');
		assert.equal(preview.resolved_cwd, null);
		assert.match(preview.detail, /Intent cwd must stay inside the current root/);
		assert.equal(existsSync(markerPath), false);
		assert.equal(existsSync(latestRunReceiptPath(projectPath)), false);
	} finally {
		rmSync(markerPath, { force: true });
		removeTempProject(projectPath);
	}
});

test('previews missing command intent cwd values as blocked without spawning or writing a receipt', () => {
	const projectPath = createTempProject();
	const markerPath = path.join(projectPath, 'missing-cwd-spawned.txt');

	try {
		initProject(projectPath);
		appendIntent(
			projectPath,
			`
[intents.missing_cwd_preview]
status = "configured"
lifecycle = "oneshot"
run_policy = "agent_allowed"
description = "Try to run inside a missing working directory."
argv = ['${process.execPath}', '-e', 'require("node:fs").writeFileSync(${JSON.stringify(markerPath)}, "ran")']
cwd = "missing-dir"
timeout_seconds = 10
stdin = "closed"
success_exit_codes = [0]
writes = []
network = false
destructive = false
`,
		);

		const result = runCli(projectPath, ['run', 'missing_cwd_preview', '--dry-run', '--json']);
		const preview = JSON.parse(result.stdout);

		assert.equal(result.status, 1);
		assert.equal(result.stderr, '');
		assert.equal(preview.runnable, false);
		assert.equal(preview.reason_code, 'cwd_outside_project');
		assert.equal(preview.configured_cwd, 'missing-dir');
		assert.equal(preview.resolved_cwd, null);
		assert.match(preview.detail, /Intent cwd must stay inside the current root/);
		assert.equal(existsSync(markerPath), false);
		assert.equal(existsSync(latestRunReceiptPath(projectPath)), false);
	} finally {
		removeTempProject(projectPath);
	}
});

test('previews command intent cwd symlink escapes without spawning or writing a receipt', (t) => {
	const projectPath = createTempProject();
	const outsideRoot = mkdtempSync(path.join(tmpdir(), 'mustflow-run-outside-'));
	const markerPath = path.join(outsideRoot, 'cwd-symlink-spawned.txt');

	try {
		initProject(projectPath);
		const linkPath = path.join(projectPath, 'linked-outside');
		const linkType = process.platform === 'win32' ? 'junction' : 'dir';
		if (!trySymlink(outsideRoot, linkPath, linkType)) {
			t.skip('directory symlinks are not available in this environment');
			return;
		}
		appendIntent(
			projectPath,
			`
[intents.outside_cwd_symlink_preview]
status = "configured"
lifecycle = "oneshot"
run_policy = "agent_allowed"
description = "Try to run through a symlink that leaves the project root."
argv = ['${process.execPath}', '-e', 'require("node:fs").writeFileSync(${JSON.stringify(markerPath)}, "ran")']
cwd = "linked-outside"
timeout_seconds = 10
stdin = "closed"
success_exit_codes = [0]
writes = []
network = false
destructive = false
`,
		);

		const result = runCli(projectPath, ['run', 'outside_cwd_symlink_preview', '--dry-run', '--json']);
		const preview = JSON.parse(result.stdout);

		assert.equal(result.status, 1);
		assert.equal(result.stderr, '');
		assert.equal(preview.runnable, false);
		assert.equal(preview.reason_code, 'cwd_outside_project');
		assert.equal(preview.configured_cwd, 'linked-outside');
		assert.equal(preview.resolved_cwd, null);
		assert.match(preview.detail, /Intent cwd must stay inside the current root/);
		assert.equal(existsSync(markerPath), false);
		assert.equal(existsSync(latestRunReceiptPath(projectPath)), false);
	} finally {
		rmSync(outsideRoot, { recursive: true, force: true });
		removeTempProject(projectPath);
	}
});

test('does not run a project-local mf shim for built-in mustflow intents', () => {
	const projectPath = createTempProject();

	try {
		initProject(projectPath);
		createLocalBinShim(projectPath, 'mf', 'PWNED_MF_SHIM');
		appendIntent(
			projectPath,
			`
[intents.self_version_shim_guard]
status = "configured"
kind = "mustflow_builtin"
lifecycle = "oneshot"
run_policy = "agent_allowed"
description = "Run mustflow version without trusting repo-local shims."
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

		const result = runCli(projectPath, ['run', 'self_version_shim_guard', '--json'], {
			env: createEnvWithLocalBinFirst(projectPath),
		});
		const receipt = JSON.parse(result.stdout);

		assert.equal(result.status, 0, result.stderr || result.stdout);
		assert.equal(receipt.status, 'passed');
		assert.equal(receipt.stdout.tail.trim(), packageVersion);
		assert.doesNotMatch(receipt.stdout.tail, /PWNED_MF_SHIM/);
	} finally {
		removeTempProject(projectPath);
	}
});

test('does not put project-local shims ahead of PATH executables', () => {
	const projectPath = createTempProject();

	try {
		initProject(projectPath);
		createLocalBinShim(projectPath, 'git', 'PWNED_GIT_SHIM');
		appendIntent(
			projectPath,
			`
[intents.git_version]
status = "configured"
lifecycle = "oneshot"
run_policy = "agent_allowed"
description = "Print git version."
argv = ["git", "--version"]
cwd = "."
timeout_seconds = 10
stdin = "closed"
success_exit_codes = [0]
writes = []
network = false
destructive = false
`,
		);

		const result = runCli(projectPath, ['run', 'git_version', '--json'], {
			env: createEnvWithLocalBinFirst(projectPath),
		});
		const receipt = JSON.parse(result.stdout);

		assert.equal(result.status, 0, result.stderr || result.stdout);
		assert.equal(receipt.status, 'passed');
		assert.match(receipt.stdout.tail, /git version/i);
		assert.doesNotMatch(receipt.stdout.tail, /PWNED_GIT_SHIM/);
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

test('runs supported mustflow built-in intents without spawning a nested CLI process', async () => {
	const projectPath = createTempProject();
	const previousCwd = process.cwd();

	try {
		initProject(projectPath);
		appendIntent(
			projectPath,
			`
[intents.self_check]
status = "configured"
kind = "mustflow_builtin"
lifecycle = "oneshot"
run_policy = "agent_allowed"
description = "Run a built-in mustflow status command in-process."
argv = ["mf", "status", "--json"]
cwd = "."
timeout_seconds = 10
stdin = "closed"
success_exit_codes = [0]
writes = []
network = false
destructive = false
`,
		);

		const { runRun } = await import(pathToFileURL(path.join(projectRoot, 'dist', 'cli', 'commands', 'run.js')).href);
		const stdout = [];
		const stderr = [];

		process.chdir(projectPath);

		const status = await runRun(
			['self_check', '--json'],
			{
				stdout(message) {
					stdout.push(message);
				},
				stderr(message) {
					stderr.push(message);
				},
			},
			'en',
		);
		const receipt = JSON.parse(stdout.join('\n'));
		const statusOutput = JSON.parse(receipt.stdout.tail);

		assert.equal(status, 0);
		assert.deepEqual(stderr, []);
		assert.equal(receipt.intent, 'self_check');
		assert.equal(receipt.status, 'passed');
		assert.equal(statusOutput.installed, true);
		assert.equal(statusOutput.manifestLock, 'present');
	} finally {
		process.chdir(previousCwd);
		removeTempProject(projectPath);
	}
});

test('runs default mustflow update intents through mf run', () => {
	const projectPath = createTempProject();

	try {
		initProject(projectPath);

		const dryRunResult = runCli(projectPath, ['run', 'mustflow_update_dry_run', '--json'], {
			env: createEnvWithoutPathLookup(),
		});
		const dryRunReceipt = JSON.parse(dryRunResult.stdout);
		const dryRunPlan = JSON.parse(dryRunReceipt.stdout.tail);

		assert.equal(dryRunResult.status, 0, dryRunResult.stderr || dryRunResult.stdout);
		assert.equal(dryRunReceipt.intent, 'mustflow_update_dry_run');
		assert.equal(dryRunReceipt.status, 'passed');
		assert.equal(dryRunPlan.command, 'update');
		assert.equal(dryRunPlan.mode, 'dry-run');
		assert.equal(dryRunPlan.ok, true);
		assert.equal(dryRunPlan.wroteFiles, false);

		const applyResult = runCli(projectPath, ['run', 'mustflow_update_apply', '--json'], {
			env: createEnvWithoutPathLookup(),
		});
		const applyReceipt = JSON.parse(applyResult.stdout);
		const applyPlan = JSON.parse(applyReceipt.stdout.tail);

		assert.equal(applyResult.status, 0, applyResult.stderr || applyResult.stdout);
		assert.equal(applyReceipt.intent, 'mustflow_update_apply');
		assert.equal(applyReceipt.status, 'passed');
		assert.equal(applyPlan.command, 'update');
		assert.equal(applyPlan.mode, 'apply');
		assert.equal(applyPlan.ok, true);
		assert.equal(applyPlan.wroteFiles, false);
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

test('uses retention policy tail byte limits for JSON run receipts', () => {
	const projectPath = createTempProject();

	try {
		initProject(projectPath);

		const configPath = path.join(projectPath, '.mustflow', 'config', 'mustflow.toml');
		const config = readFileSync(configPath, 'utf8').replace('keep_stdout_tail_bytes = 65536', 'keep_stdout_tail_bytes = 12');
		writeFileSync(configPath, config);

		appendIntent(
			projectPath,
			`
[intents.long_stdout]
status = "configured"
lifecycle = "oneshot"
run_policy = "agent_allowed"
description = "Print long stdout for receipt tail policy."
argv = ['${process.execPath}', '-e', 'process.stdout.write("abcdefghijklmnop")']
cwd = "."
timeout_seconds = 10
stdin = "closed"
success_exit_codes = [0]
writes = []
network = false
destructive = false
`,
		);

		const result = runCli(projectPath, ['run', 'long_stdout', '--json']);
		const receipt = JSON.parse(result.stdout);

		assert.equal(result.status, 0);
		assert.equal(receipt.stdout.bytes, 16);
		assert.equal(receipt.stdout.truncated, true);
		assert.equal(receipt.stdout.tail, 'efghijklmnop');
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

test('refuses command intent cwd values outside the mustflow root', () => {
	const projectPath = createTempProject();

	try {
		initProject(projectPath);
		appendIntent(
			projectPath,
			`
[intents.outside_cwd]
status = "configured"
lifecycle = "oneshot"
run_policy = "agent_allowed"
description = "Try to run outside the project root."
argv = ['${process.execPath}', '-e', 'console.log("outside")']
cwd = ".."
timeout_seconds = 10
stdin = "closed"
success_exit_codes = [0]
writes = []
network = false
destructive = false
`,
		);

		const result = runCli(projectPath, ['run', 'outside_cwd']);

		assert.equal(result.status, 1);
		assert.match(result.stderr, /Intent cwd must stay inside the current root/);
		assert.doesNotMatch(result.stdout, /outside/);
	} finally {
		removeTempProject(projectPath);
	}
});
