import assert from 'node:assert/strict';
import { spawn, spawnSync } from 'node:child_process';
import { chmodSync, cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { after, before, test } from 'node:test';
import { fileURLToPath, pathToFileURL } from 'node:url';

const projectRoot = path.resolve(fileURLToPath(new URL('../..', import.meta.url)));
const cliPath = path.join(projectRoot, 'dist', 'cli', 'index.js');
const packageVersion = JSON.parse(readFileSync(path.join(projectRoot, 'package.json'), 'utf8')).version;
const TEMP_REMOVE_RETRY_COUNT = 30;
const TEMP_REMOVE_RETRY_DELAY_MS = 100;
let initializedProjectFixture;

function createTempProject() {
	return mkdtempSync(path.join(tmpdir(), 'mustflow-run-'));
}

function removeTempProject(projectPath) {
	for (let attempt = 0; attempt < TEMP_REMOVE_RETRY_COUNT; attempt += 1) {
		try {
			rmSync(projectPath, { recursive: true, force: true });
			return;
		} catch (error) {
			if (attempt === TEMP_REMOVE_RETRY_COUNT - 1 || !['EBUSY', 'ENOTEMPTY', 'EPERM'].includes(error?.code)) {
				throw error;
			}

			Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, TEMP_REMOVE_RETRY_DELAY_MS);
		}
	}
}

function latestRunReceiptPath(projectPath) {
	return path.join(projectPath, '.mustflow', 'state', 'runs', 'latest.json');
}

function latestRunProfilePath(projectPath) {
	return path.join(projectPath, '.mustflow', 'state', 'runs', 'latest.profile.json');
}

function runPerformanceSamplesPath(projectPath) {
	return path.join(projectPath, '.mustflow', 'state', 'perf', 'samples.json');
}

function runPerformanceSummaryPath(projectPath) {
	return path.join(projectPath, '.mustflow', 'state', 'perf', 'summary.json');
}

function runCli(cwd, args, options = {}) {
	return spawnSync(process.execPath, [cliPath, ...args], {
		cwd,
		encoding: 'utf8',
		...options,
	});
}

function waitForClose(child) {
	return new Promise((resolve) => {
		child.once('close', (status, signal) => resolve({ status, signal }));
	});
}

function waitForOutput(getOutput, pattern, timeoutMs = 2000) {
	return new Promise((resolve, reject) => {
		const startedAt = Date.now();
		const interval = setInterval(() => {
			if (pattern.test(getOutput())) {
				clearInterval(interval);
				resolve();
				return;
			}

			if (Date.now() - startedAt > timeoutMs) {
				clearInterval(interval);
				reject(new Error(`Timed out waiting for output matching ${pattern}`));
			}
		}, 10);
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

function createEnvWithCommandPolicyFixtures() {
	return {
		...process.env,
		MUSTFLOW_TEST_ALLOWED_ENV: 'visible-env-value',
		MUSTFLOW_TEST_SECRET_ENV: 'hidden-env-value',
	};
}

function createEnvWithRecursiveWriteDriftSnapshot() {
	return {
		...process.env,
		MUSTFLOW_WRITE_DRIFT_SNAPSHOT: '1',
	};
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

function setDefaultKillAfterSeconds(projectPath, seconds) {
	const commandsPath = path.join(projectPath, '.mustflow', 'config', 'commands.toml');
	const commands = readFileSync(commandsPath, 'utf8');
	writeFileSync(commandsPath, commands.replace(/kill_after_seconds = \d+/u, `kill_after_seconds = ${seconds}`));
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
	if (result.status !== 0) {
		return false;
	}

	for (const args of [
		['config', 'user.email', 'mustflow-tests@example.invalid'],
		['config', 'user.name', 'mustflow tests'],
		['add', '.'],
		['commit', '-m', 'baseline'],
	]) {
		result = runGit(projectPath, args);
		if (result.status !== 0) {
			return false;
		}
	}

	return true;
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
kill_after_seconds = 8
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
		assert.equal(preview.kill_after_seconds, 8);
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
		assert.equal(preview.env_policy, 'minimal');
		assert.deepEqual(preview.env_allowlist, []);
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
manual_start_hint = "Start this server in a human-controlled terminal."
health_check_url = "http://127.0.0.1:3000/health"
stop_instruction = "Stop the terminal process with Ctrl-C."
related_oneshot_checks = ["test_fast"]
`,
		);

		const manualOnlyResult = runCli(projectPath, ['run', 'snapshot_update', '--dry-run', '--json']);
		const manualOnlyPreview = JSON.parse(manualOnlyResult.stdout);

		assert.equal(manualOnlyResult.status, 1);
		assert.equal(manualOnlyPreview.runnable, false);
		assert.equal(manualOnlyPreview.status, 'manual_only');
		assert.equal(manualOnlyPreview.reason_code, 'status_not_configured');
		assert.match(manualOnlyPreview.suggested_intent_snippet, /\[intents\.snapshot_update\]/);
		assert.match(manualOnlyPreview.suggested_intent_snippet, /status = "manual_only"/);
		assert.match(manualOnlyPreview.suggested_intent_snippet, /agent_action = "do_not_guess_report_missing"/);

		const longRunningResult = runCli(projectPath, ['run', 'dev_server', '--dry-run', '--json']);
		const longRunningPreview = JSON.parse(longRunningResult.stdout);

		assert.equal(longRunningResult.status, 1);
		assert.equal(longRunningPreview.runnable, false);
		assert.equal(longRunningPreview.lifecycle, 'server');
		assert.equal(longRunningPreview.reason_code, 'lifecycle_not_oneshot');
		assert.match(longRunningPreview.suggested_intent_snippet, /\[intents\.dev_server\]/);
		assert.match(longRunningPreview.suggested_intent_snippet, /lifecycle = "server"/);
		assert.match(longRunningPreview.suggested_intent_snippet, /run_policy = "requires_explicit_user_request"/);
		assert.match(longRunningPreview.suggested_intent_snippet, /argv = \[/);
		assert.equal(longRunningPreview.manual_start_hint, 'Start this server in a human-controlled terminal.');
		assert.equal(longRunningPreview.health_check_url, 'http://127.0.0.1:3000/health');
		assert.equal(longRunningPreview.stop_instruction, 'Stop the terminal process with Ctrl-C.');
		assert.deepEqual(longRunningPreview.related_oneshot_checks, ['test_fast']);

		const unknownResult = runCli(projectPath, ['run', 'does_not_exist', '--plan-only', '--json']);
		const unknownPreview = JSON.parse(unknownResult.stdout);

		assert.equal(unknownResult.status, 1);
		assert.equal(unknownPreview.preview_mode, 'plan-only');
		assert.equal(unknownPreview.runnable, false);
		assert.equal(unknownPreview.reason_code, 'intent_not_table');
		assert.equal(unknownPreview.status, null);
		assert.match(unknownPreview.suggested_intent_snippet, /\[intents\.does_not_exist\]/);
		assert.match(unknownPreview.suggested_intent_snippet, /"TODO_REPLACE_WITH_COMMAND"/);
		assert.equal(existsSync(latestRunReceiptPath(projectPath)), false);
	} finally {
		removeTempProject(projectPath);
	}
});

test('refuses command plans with oversized output buffers', () => {
	const projectPath = createTempProject();

	try {
		initProject(projectPath);
		appendIntent(
			projectPath,
			`
[intents.too_much_output]
status = "configured"
lifecycle = "oneshot"
run_policy = "agent_allowed"
description = "Request too much output buffering."
argv = ['${process.execPath}', '-e', 'console.log("should not run")']
cwd = "."
timeout_seconds = 10
max_output_bytes = 16777217
stdin = "closed"
success_exit_codes = [0]
writes = []
network = false
destructive = false
`,
		);

		const result = runCli(projectPath, ['run', 'too_much_output', '--plan-only', '--json']);
		const preview = JSON.parse(result.stdout);

		assert.equal(result.status, 1);
		assert.equal(result.stderr, '');
		assert.equal(preview.runnable, false);
		assert.equal(preview.reason_code, 'max_output_bytes_exceeds_limit');
		assert.match(preview.detail, /16777216/);
		assert.equal(existsSync(latestRunReceiptPath(projectPath)), false);
	} finally {
		removeTempProject(projectPath);
	}
});

test('refuses commands with long-running or background patterns before execution', () => {
	const projectPath = createTempProject();
	const markerPath = path.join(projectPath, 'argv-bg-ran.txt');

	try {
		initProject(projectPath);
		appendIntent(
			projectPath,
			`
[intents.argv_bg]
status = "configured"
lifecycle = "oneshot"
run_policy = "agent_allowed"
description = "Try to hide background work in argv shell wrapper."
argv = ['${process.execPath}', '-e', 'require("node:fs").writeFileSync(${JSON.stringify(markerPath)}, "ran"); setInterval(() => {}, 1000)']
cwd = "."
timeout_seconds = 10
stdin = "closed"
success_exit_codes = [0]
writes = []
network = false
destructive = false

[intents.argv_node_eval_equals]
status = "configured"
lifecycle = "oneshot"
run_policy = "agent_allowed"
description = "Try to attach long-running Node evaluation code to a flag."
argv = ['${process.execPath}', '--eval=setInterval(() => {}, 1000)']
cwd = "."
timeout_seconds = 10
stdin = "closed"
success_exit_codes = [0]
writes = []
network = false
destructive = false

[intents.argv_python_attached]
status = "configured"
lifecycle = "oneshot"
run_policy = "agent_allowed"
description = "Try to attach long-running Python evaluation code to a flag."
argv = ["python", "-cwhile True: pass"]
cwd = "."
timeout_seconds = 10
stdin = "closed"
success_exit_codes = [0]
writes = []
network = false
destructive = false

[intents.argv_shell_attached]
status = "configured"
lifecycle = "oneshot"
run_policy = "agent_allowed"
description = "Try to attach a development server command to a shell wrapper flag."
argv = ["bash", '-c"npm run dev"']
cwd = "."
timeout_seconds = 10
stdin = "closed"
success_exit_codes = [0]
writes = []
network = false
destructive = false

[intents.argv_safe_exec]
status = "configured"
lifecycle = "oneshot"
run_policy = "agent_allowed"
description = "Safe package-manager one-shot command."
argv = ["npm", "exec", "eslint", "--", "src/index.ts"]
cwd = "."
timeout_seconds = 10
stdin = "closed"
success_exit_codes = [0]
writes = []
network = false
destructive = false

[intents.shell_dev]
status = "configured"
lifecycle = "oneshot"
run_policy = "agent_allowed"
description = "Try to hide a development server in shell mode."
mode = "shell"
cmd = "npm run dev"
cwd = "."
timeout_seconds = 10
stdin = "closed"
success_exit_codes = [0]
writes = []
network = false
destructive = false
`,
		);

		const result = runCli(projectPath, ['run', 'argv_bg', '--dry-run', '--json']);
		const preview = JSON.parse(result.stdout);
		const attachedNodeResult = runCli(projectPath, ['run', 'argv_node_eval_equals', '--dry-run', '--json']);
		const attachedNodePreview = JSON.parse(attachedNodeResult.stdout);
		const attachedPythonResult = runCli(projectPath, ['run', 'argv_python_attached', '--dry-run', '--json']);
		const attachedPythonPreview = JSON.parse(attachedPythonResult.stdout);
		const attachedShellResult = runCli(projectPath, ['run', 'argv_shell_attached', '--dry-run', '--json']);
		const attachedShellPreview = JSON.parse(attachedShellResult.stdout);
		const safeResult = runCli(projectPath, ['run', 'argv_safe_exec', '--dry-run', '--json']);
		const safePreview = JSON.parse(safeResult.stdout);
		const shellDevResult = runCli(projectPath, ['run', 'shell_dev', '--dry-run', '--json']);
		const shellDevPreview = JSON.parse(shellDevResult.stdout);

		assert.equal(result.status, 1);
		assert.equal(preview.runnable, false);
		assert.equal(preview.reason_code, 'blocked_long_running_command_pattern');
		assert.match(preview.detail, /interpreter evaluation payload/);
		assert.match(preview.suggested_intent_snippet, /TODO_REPLACE_WITH_FINITE_COMMAND/);
		for (const [blockedResult, blockedPreview, detailPattern] of [
			[attachedNodeResult, attachedNodePreview, /interpreter evaluation payload/],
			[attachedPythonResult, attachedPythonPreview, /interpreter evaluation payload/],
			[attachedShellResult, attachedShellPreview, /shell wrapper payload/],
		]) {
			assert.equal(blockedResult.status, 1);
			assert.equal(blockedPreview.runnable, false);
			assert.equal(blockedPreview.reason_code, 'blocked_long_running_command_pattern');
			assert.match(blockedPreview.detail, detailPattern);
		}
		assert.equal(existsSync(markerPath), false);
		assert.equal(existsSync(latestRunReceiptPath(projectPath)), false);
		assert.equal(shellDevResult.status, 1);
		assert.equal(shellDevPreview.runnable, false);
		assert.equal(shellDevPreview.reason_code, 'blocked_long_running_command_pattern');
		assert.match(shellDevPreview.detail, /Shell command contains/);
		assert.match(shellDevPreview.detail, /npm run dev/);
		assert.equal(safeResult.status, 0);
		assert.equal(safePreview.runnable, true);
		assert.equal(safePreview.reason_code, null);
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

test('applies output limits to built-in mustflow intents through the spawned path', () => {
	const projectPath = createTempProject();

	try {
		initProject(projectPath);
		appendIntent(
			projectPath,
			`
[intents.self_help_output_limit]
status = "configured"
kind = "mustflow_builtin"
lifecycle = "oneshot"
run_policy = "agent_allowed"
description = "Run mustflow help with a tiny output budget."
argv = ["mf", "help"]
cwd = "."
timeout_seconds = 10
max_output_bytes = 64
stdin = "closed"
success_exit_codes = [0]
writes = []
network = false
destructive = false
`,
		);

		const result = runCli(projectPath, ['run', 'self_help_output_limit', '--json']);
		const receipt = JSON.parse(result.stdout);

		assert.equal(result.status, 1);
		assert.equal(receipt.status, 'output_limit_exceeded');
		assert.equal(receipt.max_output_bytes, 64);
		assert.equal(receipt.performance.result_summary.error_kind, 'output_limit_exceeded');
		assert.match(receipt.error, /max_output_bytes|exceeded/i);
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

test('runs supported mustflow built-in intents through the spawned CLI path', () => {
	const projectPath = createTempProject();

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
description = "Run a built-in mustflow status command through the current CLI entrypoint."
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

		const result = runCli(projectPath, ['run', 'self_check', '--json'], {
			env: createEnvWithoutPathLookup(),
		});
		const receipt = JSON.parse(result.stdout);
		const statusOutput = JSON.parse(receipt.stdout.tail);

		assert.equal(result.status, 0, result.stderr || result.stdout);
		assert.equal(result.stderr, '');
		assert.equal(receipt.intent, 'self_check');
		assert.equal(receipt.status, 'passed');
		assert.equal(statusOutput.installed, true);
		assert.equal(statusOutput.manifestLock, 'present');
	} finally {
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
kill_after_seconds = 8
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
		const performanceSamples = JSON.parse(readFileSync(runPerformanceSamplesPath(projectPath), 'utf8'));
		const performanceSummary = JSON.parse(readFileSync(runPerformanceSummaryPath(projectPath), 'utf8'));
		const performanceSample = performanceSamples.samples.at(-1);
		const performanceFingerprintSummary = performanceSummary.intents.echo_json.fingerprints[receipt.performance.intent_fingerprint];

		assert.equal(result.status, 0);
		assert.equal(result.stderr, '');
		assert.equal(receipt.schema_version, '1');
		assert.equal(receipt.command, 'run');
		assert.equal(receipt.intent, 'echo_json');
		assert.equal(receipt.status, 'passed');
		assert.equal(receipt.timed_out, false);
		assert.equal(receipt.exit_code, 0);
		assert.equal(receipt.env_policy, 'minimal');
		assert.deepEqual(receipt.env_allowlist, []);
		assert.equal(receipt.timeout_seconds, 10);
		assert.equal(receipt.kill_after_seconds, 8);
		assert.equal(receipt.max_output_bytes_scope, 'per_stream');
		assert.equal(receipt.stdout.truncated, false);
		assert.match(receipt.stdout.tail, /hello receipt/);
		assert.equal(receipt.stdout.redacted, false);
		assert.equal(receipt.stdout.redaction_count, 0);
		assert.deepEqual(receipt.stdout.redaction_kinds, []);
		assert.equal(receipt.stderr.redacted, false);
		assert.equal(receipt.performance.schema_version, '1');
		assert.equal(receipt.performance.measurement, 'wall_clock');
		assert.equal(receipt.performance.duration_ms, receipt.duration_ms);
		assert.equal(typeof receipt.performance.executor_overhead_ms, 'number');
		assert.ok(receipt.performance.executor_overhead_ms >= 0);
		assert.equal(typeof receipt.performance.timeout_ratio, 'number');
		assert.match(receipt.performance.command_fingerprint, /^sha256:[a-f0-9]{64}$/);
		assert.match(receipt.performance.intent_fingerprint, /^sha256:[a-f0-9]{64}$/);
		assert.match(receipt.performance.contract_fingerprint, /^sha256:[a-f0-9]{64}$/);
		assert.equal(receipt.performance.runner.kind, 'local');
		assert.equal(receipt.performance.runner.platform_family, process.platform);
		assert.equal(receipt.performance.runner.arch_family, process.arch);
		assert.ok(['node', 'bun'].includes(receipt.performance.runner.runtime));
		assert.equal(receipt.performance.output_summary.stdout_bytes, receipt.stdout.bytes);
		assert.equal(receipt.performance.output_summary.stderr_bytes, receipt.stderr.bytes);
		assert.equal(receipt.performance.output_summary.total_bytes, receipt.stdout.bytes + receipt.stderr.bytes);
		assert.equal(receipt.performance.output_summary.stdout_truncated, receipt.stdout.truncated);
		assert.equal(receipt.performance.output_summary.stderr_truncated, receipt.stderr.truncated);
		assert.equal(receipt.performance.output_summary.max_output_bytes_scope, 'per_stream');
		assert.equal(receipt.performance.result_summary.status, 'passed');
		assert.equal(receipt.performance.result_summary.exit_code_class, 'success');
		assert.equal(receipt.performance.result_summary.timed_out, false);
		assert.equal(receipt.performance.result_summary.error_kind, null);
		assert.equal(receipt.performance.quality.phase_timings_source, 'none');
		assert.equal(receipt.performance.phases, undefined);
		assert.deepEqual(receipt.performance.selection, {
			strategy: 'direct_intent',
			changed_file_count: 0,
			changed_surface_counts: {},
			selected_target_count: 1,
			fallback_used: false,
		});
		assert.equal(receipt.performance.quality.target_timings_source, 'none');
		assert.equal(receipt.performance.quality.usable_for_history, true);
		assert.equal(receipt.redaction.redacted, false);
		assert.equal(receipt.redaction.redaction_count, 0);
		assert.deepEqual(receipt.redaction.fields, []);
		assert.equal(receipt.write_drift.status, 'unavailable');
		assert.deepEqual(receipt.write_drift.declared_paths, []);
		assert.deepEqual(receipt.write_drift.observed_paths, []);
		assert.deepEqual(receipt.write_drift.undeclared_paths, []);
		assert.equal(receipt.write_drift.has_undeclared_changes, false);
		assert.equal(receipt.write_drift.reason, 'git_status_unavailable_recursive_snapshot_disabled');
		assert.ok(existsSync(latestPath));
		assert.match(receipt.receipt_path, /^\.mustflow\/state\/runs\/run-.*\/receipt\.json$/u);
		assert.ok(existsSync(path.join(projectPath, receipt.receipt_path)));
		assert.deepEqual(latest, receipt);
		assert.equal(performanceSamples.schema_version, '1');
		assert.equal(performanceSamples.retention.max_age_days, 30);
		assert.equal(performanceSamples.retention.max_total_kb, 256);
		assert.equal(performanceSamples.retention.stores_output_tails, false);
		assert.equal(performanceSamples.retention.stores_command_line, false);
		assert.equal(performanceSamples.retention.stores_environment_values, false);
		assert.equal(performanceSamples.retention.stores_absolute_paths, false);
		assert.equal(performanceSamples.retention.stores_test_names, false);
		assert.equal(performanceSamples.samples.length, 1);
		assert.match(performanceSample.observed_day, /^\d{4}-\d{2}-\d{2}$/);
		assert.equal(performanceSample.intent, 'echo_json');
		assert.equal(performanceSample.intent_fingerprint, receipt.performance.intent_fingerprint);
		assert.equal(performanceSample.command_fingerprint, receipt.performance.command_fingerprint);
		assert.equal(performanceSample.contract_fingerprint, receipt.performance.contract_fingerprint);
		assert.equal(performanceSample.duration_ms, receipt.performance.duration_ms);
		assert.equal(performanceSample.executor_overhead_ms, receipt.performance.executor_overhead_ms);
		assert.equal(performanceSample.timeout_ratio, receipt.performance.timeout_ratio);
		assert.equal(performanceSample.status, 'passed');
		assert.equal(performanceSample.exit_code_class, 'success');
		assert.equal(performanceSample.stdout_bytes, receipt.stdout.bytes);
		assert.equal(performanceSample.stderr_bytes, receipt.stderr.bytes);
		assert.equal(performanceSample.selection_strategy, 'direct_intent');
		assert.equal(performanceSample.changed_file_count, 0);
		assert.deepEqual(performanceSample.changed_surface_counts, {});
		assert.equal(performanceSample.selected_target_count, 1);
		assert.equal(performanceSample.fallback_used, false);
		assert.equal(performanceSummary.schema_version, '1');
		assert.equal(performanceSummary.generated_day, performanceSample.observed_day);
		assert.equal(performanceFingerprintSummary.sample_count, 1);
		assert.equal(performanceFingerprintSummary.success_count, 1);
		assert.equal(performanceFingerprintSummary.failure_count, 0);
		assert.equal(performanceFingerprintSummary.p50_duration_ms, receipt.performance.duration_ms);
		assert.equal(performanceFingerprintSummary.last_success_duration_ms, receipt.performance.duration_ms);
		assert.doesNotMatch(JSON.stringify(performanceSamples), /hello receipt/);
		assert.doesNotMatch(JSON.stringify(performanceSummary), /hello receipt/);
	} finally {
		removeTempProject(projectPath);
	}
});

test('keeps performance history bounded and separate from raw run receipts', async () => {
	const projectPath = createTempProject();
	const { recordRunPerformanceHistory } = await import(
		pathToFileURL(path.join(projectRoot, 'dist', 'core', 'run-performance-history.js')).href
	);
	const intentFingerprint = `sha256:${'a'.repeat(64)}`;

	try {
		for (let index = 0; index < 45; index += 1) {
			recordRunPerformanceHistory(projectPath, {
				finished_at: '2026-05-15T12:00:00.000Z',
				intent: 'perf_fixture',
				stdout: {
					tail: `raw receipt tail ${index}`,
				},
				stderr: {
					tail: `raw receipt error ${index}`,
				},
				performance: {
					quality: {
						usable_for_history: true,
					},
					result_summary: {
						status: 'passed',
						exit_code_class: 'success',
						error_kind: null,
					},
					intent_fingerprint: intentFingerprint,
					command_fingerprint: `sha256:${'b'.repeat(64)}`,
					contract_fingerprint: `sha256:${'c'.repeat(64)}`,
					runner: {
						kind: 'local',
						platform_family: process.platform,
						arch_family: process.arch,
						runtime: 'node',
						runtime_major: Number.parseInt(process.versions.node.split('.')[0], 10),
					},
					duration_ms: 1000 + index,
					timeout_ratio: 0.1,
					output_summary: {
						stdout_bytes: 10 + index,
						stderr_bytes: index,
					},
					selection: {
						strategy: 'direct_intent',
						changed_file_count: 0,
						changed_surface_counts: {},
						selected_target_count: 1,
						fallback_used: false,
					},
				},
			});
		}

		const samples = JSON.parse(readFileSync(runPerformanceSamplesPath(projectPath), 'utf8'));
		const summary = JSON.parse(readFileSync(runPerformanceSummaryPath(projectPath), 'utf8'));
		const fingerprintSummary = summary.intents.perf_fixture.fingerprints[intentFingerprint];
		const serializedHistory = `${JSON.stringify(samples)}\n${JSON.stringify(summary)}`;

		assert.equal(samples.samples.length, 20);
		assert.equal(samples.samples[0].duration_ms, 1025);
		assert.equal(samples.samples.at(-1).duration_ms, 1044);
		assert.equal(fingerprintSummary.sample_count, 20);
		assert.equal(fingerprintSummary.last_success_duration_ms, 1044);
		assert.equal(existsSync(latestRunReceiptPath(projectPath)), false);
		assert.doesNotMatch(serializedHistory, /raw receipt tail/);
		assert.doesNotMatch(serializedHistory, /raw receipt error/);
	} finally {
		removeTempProject(projectPath);
	}
});

test('keeps receipt performance fields limited to safe structured values', async () => {
	const projectPath = createTempProject();
	const { createRunReceipt } = await import(pathToFileURL(path.join(projectRoot, 'dist', 'core', 'run-receipt.js')).href);

	try {
		const receipt = createRunReceipt({
			intent: 'structured_perf_fixture',
			status: 'passed',
			timedOut: false,
			startedAt: new Date('2026-05-15T12:00:00.000Z'),
			finishedAt: new Date('2026-05-15T12:00:02.000Z'),
			projectRoot: projectPath,
			cwd: projectPath,
			lifecycle: 'oneshot',
			runPolicy: 'agent_allowed',
			mode: 'argv',
			argv: [process.execPath, '-e', 'console.log("ok")'],
			envPolicy: 'minimal',
			envAllowlist: [],
			timeoutSeconds: 10,
			maxOutputBytes: 1024,
			successExitCodes: [0],
			exitCode: 0,
			signal: null,
			error: null,
			killMethod: null,
			stdout: 'ok\n',
			stderr: '',
			writeDrift: {
				status: 'unavailable',
				declared_paths: [],
				observed_paths: [],
				undeclared_paths: [],
				has_undeclared_changes: false,
				reason: 'test_fixture',
			},
			phaseTimings: [
				{ name: 'child_command', duration_ms: 1.23456 },
				{ name: 'child-command', duration_ms: 2 },
				{ name: 'secret_path', duration_ms: -1 },
				{ name: 'token', duration_ms: Number.NaN },
			],
			selectionSummary: {
				strategy: 'direct-intent',
				changed_file_count: 0,
				changed_surface_counts: {
					'source/path': 1,
				},
				selected_target_count: 1,
				fallback_used: false,
			},
		});
		const serializedPerformance = JSON.stringify(receipt.performance);

		assert.deepEqual(receipt.performance.phases, [{ name: 'child_command', duration_ms: 1.235 }]);
		assert.equal(receipt.performance.quality.phase_timings_source, 'structured_report');
		assert.equal(receipt.performance.selection, undefined);
		assert.doesNotMatch(serializedPerformance, /child-command/);
		assert.doesNotMatch(serializedPerformance, /source\/path/);
		assert.doesNotMatch(serializedPerformance, /direct-intent/);
	} finally {
		removeTempProject(projectPath);
	}
});

test('keeps bounded output tails on UTF-8 character boundaries', async () => {
	const { BoundedOutputBuffer } = await import(pathToFileURL(path.join(projectRoot, 'dist', 'core', 'bounded-output.js')).href);
	const buffer = new BoundedOutputBuffer(2);

	buffer.append('한');

	const snapshot = buffer.toSnapshot();

	assert.equal(snapshot.bytes, Buffer.byteLength('한', 'utf8'));
	assert.equal(snapshot.tail, '');
	assert.doesNotMatch(snapshot.tail, /\uFFFD/u);
});

test('keeps receipt output tails on UTF-8 character boundaries', async () => {
	const projectPath = createTempProject();
	const { createRunReceipt } = await import(pathToFileURL(path.join(projectRoot, 'dist', 'core', 'run-receipt.js')).href);

	try {
		const receipt = createRunReceipt({
			intent: 'utf8_tail_fixture',
			status: 'passed',
			timedOut: false,
			startedAt: new Date('2026-05-15T12:00:00.000Z'),
			finishedAt: new Date('2026-05-15T12:00:01.000Z'),
			projectRoot: projectPath,
			cwd: projectPath,
			lifecycle: 'oneshot',
			runPolicy: 'agent_allowed',
			mode: 'argv',
			argv: [process.execPath, '-e', 'process.stdout.write("한")'],
			envPolicy: 'minimal',
			envAllowlist: [],
			timeoutSeconds: 10,
			maxOutputBytes: 2,
			successExitCodes: [0],
			exitCode: 0,
			signal: null,
			error: null,
			killMethod: null,
			stdout: '한',
			stderr: '',
			writeDrift: {
				status: 'unavailable',
				declared_paths: [],
				observed_paths: [],
				undeclared_paths: [],
				has_undeclared_changes: false,
				reason: 'test_fixture',
			},
			stdoutTailBytes: 2,
			stderrTailBytes: 2,
		});

		assert.equal(receipt.stdout.bytes, Buffer.byteLength('한', 'utf8'));
		assert.equal(receipt.stdout.truncated, true);
		assert.equal(receipt.stdout.tail, '');
		assert.doesNotMatch(receipt.stdout.tail, /\uFFFD/u);
	} finally {
		removeTempProject(projectPath);
	}
});

test('streams non-JSON child output before command completion and stores only a bounded receipt tail', async () => {
	const projectPath = createTempProject();

	try {
		initProject(projectPath);

		const configPath = path.join(projectPath, '.mustflow', 'config', 'mustflow.toml');
		const config = readFileSync(configPath, 'utf8').replace('keep_stdout_tail_bytes = 65536', 'keep_stdout_tail_bytes = 4');
		writeFileSync(configPath, config);

		appendIntent(
			projectPath,
			`
[intents.stream_stdout]
status = "configured"
lifecycle = "oneshot"
run_policy = "agent_allowed"
description = "Print stdout before and after a delay."
argv = ['${process.execPath}', '-e', 'process.stdout.write("early"); setTimeout(() => process.stdout.write("late"), 500)']
cwd = "."
timeout_seconds = 10
stdin = "closed"
success_exit_codes = [0]
writes = []
`,
		);

		const stdout = [];
		const stderr = [];
		let closed = false;
		const child = spawn(process.execPath, [cliPath, 'run', 'stream_stdout'], {
			cwd: projectPath,
			encoding: 'utf8',
			stdio: ['ignore', 'pipe', 'pipe'],
			windowsHide: true,
		});

		child.stdout.on('data', (chunk) => stdout.push(chunk.toString()));
		child.stderr.on('data', (chunk) => stderr.push(chunk.toString()));
		child.once('close', () => {
			closed = true;
		});

		await waitForOutput(() => stdout.join(''), /early/);
		assert.equal(closed, false);

		const closeResult = await waitForClose(child);
		const receipt = JSON.parse(readFileSync(latestRunReceiptPath(projectPath), 'utf8'));

		assert.equal(closeResult.status, 0, stderr.join(''));
		assert.equal(stdout.join(''), 'earlylate');
		assert.equal(receipt.status, 'passed');
		assert.equal(receipt.stdout.bytes, 9);
		assert.equal(receipt.stdout.truncated, true);
		assert.equal(receipt.stdout.tail, 'late');
	} finally {
		removeTempProject(projectPath);
	}
});

test('preserves streamed chunks for custom reporters without raw write methods', async () => {
	const projectPath = createTempProject();
	const previousCwd = process.cwd();

	try {
		initProject(projectPath);
		appendIntent(
			projectPath,
			`
[intents.stream_chunks]
status = "configured"
lifecycle = "oneshot"
run_policy = "agent_allowed"
description = "Print whitespace-sensitive chunks."
argv = ['${process.execPath}', '-e', 'process.stdout.write("stdout  \\n"); process.stderr.write("stderr  \\n")']
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
			['stream_chunks'],
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

		assert.equal(status, 0);
		assert.equal(stdout.join(''), 'stdout  \n');
		assert.equal(stderr.join(''), 'stderr  \n');
	} finally {
		process.chdir(previousCwd);
		removeTempProject(projectPath);
	}
});

test('writes an opt-in run profile without command output or environment values', () => {
	const projectPath = createTempProject();
	const envSecret = 'profile-secret-value';

	try {
		initProject(projectPath);
		appendIntent(
			projectPath,
			`
[intents.profile_probe]
status = "configured"
lifecycle = "oneshot"
run_policy = "agent_allowed"
description = "Print output while run profiling is enabled."
argv = ['${process.execPath}', '-e', 'console.log("profile child output"); console.error(process.env.MUSTFLOW_TEST_SECRET_ENV || "missing")']
cwd = "."
timeout_seconds = 10
stdin = "closed"
success_exit_codes = [0]
writes = []
network = false
destructive = false
`,
		);

		const result = runCli(projectPath, ['run', 'profile_probe', '--json'], {
			env: {
				...createEnvWithCommandPolicyFixtures(),
				MUSTFLOW_RUN_PROFILE: '1',
				MUSTFLOW_TEST_SECRET_ENV: envSecret,
			},
		});
		const receipt = JSON.parse(result.stdout);
		const profilePath = latestRunProfilePath(projectPath);
		const profile = JSON.parse(readFileSync(profilePath, 'utf8'));
		const performanceSamples = JSON.parse(readFileSync(runPerformanceSamplesPath(projectPath), 'utf8'));
		const performanceSample = performanceSamples.samples.at(-1);
		const serializedProfile = JSON.stringify(profile);
		const serializedReceiptPerformance = JSON.stringify(receipt.performance);
		const serializedPerformanceSample = JSON.stringify(performanceSample);
		const phaseNames = profile.phases.map((phase) => phase.name);
		const receiptPhaseNames = receipt.performance.phases.map((phase) => phase.name);

		assert.equal(result.status, 0, result.stderr || result.stdout);
		assert.equal(receipt.status, 'passed');
		assert.equal(receipt.performance.quality.phase_timings_source, 'structured_report');
		assert.ok(receiptPhaseNames.includes('root_detection'));
		assert.ok(receiptPhaseNames.includes('command_contract'));
		assert.ok(receiptPhaseNames.includes('plan_creation'));
		assert.ok(receiptPhaseNames.includes('environment'));
		assert.ok(receiptPhaseNames.includes('write_drift_before'));
		assert.ok(receiptPhaseNames.includes('child_command'));
		assert.ok(receiptPhaseNames.includes('write_drift_after'));
		assert.ok(receipt.performance.phases.every((phase) => typeof phase.duration_ms === 'number' && phase.duration_ms >= 0));
		assert.equal(performanceSample.phase_durations_ms.child_command, receipt.performance.phases.find((phase) => phase.name === 'child_command').duration_ms);
		assert.ok(existsSync(profilePath));
		assert.equal(profile.schema_version, '1');
		assert.equal(profile.command, 'run');
		assert.equal(profile.profile, true);
		assert.equal(profile.profile_window, 'run_command_handler');
		assert.equal(profile.intent, 'profile_probe');
		assert.equal(profile.status, 'passed');
		assert.equal(profile.preview_mode, null);
		assert.equal(profile.profile_path, '.mustflow/state/runs/latest.profile.json');
		assert.equal(typeof profile.duration_ms, 'number');
		assert.ok(profile.duration_ms >= 0);
		assert.ok(phaseNames.includes('root_detection'));
		assert.ok(phaseNames.includes('command_contract'));
		assert.ok(phaseNames.includes('plan_creation'));
		assert.ok(phaseNames.includes('environment'));
		assert.ok(phaseNames.includes('write_drift_before'));
		assert.ok(phaseNames.includes('child_command'));
		assert.ok(phaseNames.includes('write_drift_after'));
		assert.ok(phaseNames.includes('receipt_create'));
		assert.ok(phaseNames.includes('receipt_write'));
		assert.ok(profile.phases.every((phase) => typeof phase.duration_ms === 'number' && phase.duration_ms >= 0));
		assert.doesNotMatch(serializedProfile, /profile child output/);
		assert.doesNotMatch(serializedProfile, new RegExp(envSecret));
		assert.doesNotMatch(serializedReceiptPerformance, /profile child output/);
		assert.doesNotMatch(serializedReceiptPerformance, new RegExp(envSecret));
		assert.doesNotMatch(serializedPerformanceSample, /profile child output/);
		assert.doesNotMatch(serializedPerformanceSample, new RegExp(envSecret));
	} finally {
		removeTempProject(projectPath);
	}
});

test('redacts secret-like command and output values in JSON run receipts', () => {
	const projectPath = createTempProject();
	const stdoutToken = 'sk-abcdefghijklmnop';
	const stderrToken = 'ghp_1234567890abcdefghij';
	const argvToken = 'password=supersecretvalue';

	try {
		initProject(projectPath);
		appendIntent(
			projectPath,
			`
[intents.secret_output]
status = "configured"
lifecycle = "oneshot"
run_policy = "agent_allowed"
description = "Print secret-like values for receipt redaction."
argv = ['${process.execPath}', '-e', 'console.log("token ${stdoutToken}"); console.error("api_key=${stderrToken}")', '${argvToken}']
cwd = "."
timeout_seconds = 10
stdin = "closed"
success_exit_codes = [0]
writes = []
network = false
destructive = false
`,
		);

		const result = runCli(projectPath, ['run', 'secret_output', '--json']);
		const receipt = JSON.parse(result.stdout);
		const serialized = JSON.stringify(receipt);
		const serializedPerformanceHistory = `${readFileSync(runPerformanceSamplesPath(projectPath), 'utf8')}\n${readFileSync(runPerformanceSummaryPath(projectPath), 'utf8')}`;

		assert.equal(result.status, 0, result.stderr || result.stdout);
		assert.doesNotMatch(serialized, new RegExp(stdoutToken));
		assert.doesNotMatch(serialized, new RegExp(stderrToken));
		assert.doesNotMatch(serialized, /supersecretvalue/);
		assert.doesNotMatch(JSON.stringify(receipt.performance), new RegExp(stdoutToken));
		assert.doesNotMatch(JSON.stringify(receipt.performance), new RegExp(stderrToken));
		assert.doesNotMatch(JSON.stringify(receipt.performance), /supersecretvalue/);
		assert.doesNotMatch(serializedPerformanceHistory, new RegExp(stdoutToken));
		assert.doesNotMatch(serializedPerformanceHistory, new RegExp(stderrToken));
		assert.doesNotMatch(serializedPerformanceHistory, /supersecretvalue/);
		assert.match(receipt.stdout.tail, /\[REDACTED_SECRET\]/);
		assert.match(receipt.stderr.tail, /\[REDACTED_SECRET\]/);
		assert.ok(receipt.argv.some((entry) => entry.includes('[REDACTED_SECRET]')));
		assert.equal(receipt.stdout.redacted, true);
		assert.equal(receipt.stderr.redacted, true);
		assert.equal(receipt.redaction.redacted, true);
		assert.ok(receipt.redaction.redaction_count >= 3);
		assert.ok(receipt.redaction.fields.includes('argv.3'));
		assert.ok(receipt.redaction.fields.includes('stdout.tail'));
		assert.ok(receipt.redaction.fields.includes('stderr.tail'));
		assert.ok(receipt.redaction.redaction_kinds.includes('secret_key_value'));
		assert.ok(receipt.redaction.redaction_kinds.includes('secret_token'));
	} finally {
		removeTempProject(projectPath);
	}
});

test('records declared file changes in JSON run receipts', () => {
	const projectPath = createTempProject();

	try {
		initProject(projectPath);
		appendIntent(
			projectPath,
			`
[intents.declared_dist_write]
status = "configured"
lifecycle = "oneshot"
run_policy = "agent_allowed"
description = "Write inside declared dist output."
argv = ['${process.execPath}', '-e', 'require("node:fs").mkdirSync("dist", { recursive: true }); require("node:fs").writeFileSync("dist/output.js", "ok")']
cwd = "."
timeout_seconds = 10
stdin = "closed"
success_exit_codes = [0]
writes = ["dist/"]
effects = [
  { type = "write", mode = "write", path = "dist/**" },
]
network = false
destructive = false
`,
		);

		const result = runCli(projectPath, ['run', 'declared_dist_write', '--json'], {
			env: createEnvWithRecursiveWriteDriftSnapshot(),
		});
		const receipt = JSON.parse(result.stdout);

		assert.equal(result.status, 0, result.stderr || result.stdout);
		assert.equal(receipt.write_drift.status, 'checked');
		assert.deepEqual(receipt.write_drift.declared_paths, ['dist/**']);
		assert.deepEqual(receipt.write_drift.observed_paths, ['dist/output.js']);
		assert.deepEqual(receipt.write_drift.declared_observed_paths, ['dist/output.js']);
		assert.deepEqual(receipt.write_drift.undeclared_paths, []);
		assert.equal(receipt.write_drift.observed_count, 1);
		assert.equal(receipt.write_drift.undeclared_count, 0);
		assert.equal(receipt.write_drift.has_undeclared_changes, false);
	} finally {
		removeTempProject(projectPath);
	}
});

test('records undeclared file changes in JSON run receipts without blocking execution', () => {
	const projectPath = createTempProject();

	try {
		initProject(projectPath);
		appendIntent(
			projectPath,
			`
[intents.undeclared_write]
status = "configured"
lifecycle = "oneshot"
run_policy = "agent_allowed"
description = "Write a file without declaring it."
argv = ['${process.execPath}', '-e', 'require("node:fs").writeFileSync("sneaky.txt", "surprise")']
cwd = "."
timeout_seconds = 10
stdin = "closed"
success_exit_codes = [0]
writes = []
network = false
destructive = false
`,
		);

		const result = runCli(projectPath, ['run', 'undeclared_write', '--json'], {
			env: createEnvWithRecursiveWriteDriftSnapshot(),
		});
		const receipt = JSON.parse(result.stdout);

		assert.equal(result.status, 0, result.stderr || result.stdout);
		assert.equal(receipt.status, 'passed');
		assert.equal(receipt.write_drift.status, 'checked');
		assert.deepEqual(receipt.write_drift.declared_paths, []);
		assert.deepEqual(receipt.write_drift.observed_paths, ['sneaky.txt']);
		assert.deepEqual(receipt.write_drift.declared_observed_paths, []);
		assert.deepEqual(receipt.write_drift.undeclared_paths, ['sneaky.txt']);
		assert.equal(receipt.write_drift.observed_count, 1);
		assert.equal(receipt.write_drift.undeclared_count, 1);
		assert.equal(receipt.write_drift.has_undeclared_changes, true);
	} finally {
		removeTempProject(projectPath);
	}
});

test('uses git status write-drift tracking without recursive snapshot opt-in', (t) => {
	const projectPath = createTempProject();

	try {
		initProject(projectPath);
		if (!commitGitBaseline(projectPath)) {
			t.skip('git is not available in this environment');
			return;
		}
		appendIntent(
			projectPath,
			`
[intents.git_undeclared_write]
status = "configured"
lifecycle = "oneshot"
run_policy = "agent_allowed"
description = "Write an untracked file in a git project."
argv = ['${process.execPath}', '-e', 'require("node:fs").writeFileSync("git-sneaky.txt", "surprise")']
cwd = "."
timeout_seconds = 10
stdin = "closed"
success_exit_codes = [0]
writes = []
network = false
destructive = false
`,
		);

		const result = runCli(projectPath, ['run', 'git_undeclared_write', '--json']);
		const receipt = JSON.parse(result.stdout);

		assert.equal(result.status, 0, result.stderr || result.stdout);
		assert.equal(receipt.status, 'passed');
		assert.equal(receipt.write_drift.status, 'checked');
		assert.deepEqual(receipt.write_drift.declared_paths, []);
		assert.deepEqual(receipt.write_drift.observed_paths, ['git-sneaky.txt']);
		assert.deepEqual(receipt.write_drift.undeclared_paths, ['git-sneaky.txt']);
		assert.equal(receipt.write_drift.has_undeclared_changes, true);
		assert.equal(receipt.write_drift.reason, null);
	} finally {
		removeTempProject(projectPath);
	}
});

test('detects undeclared rewrites to files that were already dirty before mf run', (t) => {
	const projectPath = createTempProject();

	try {
		initProject(projectPath);
		if (!commitGitBaseline(projectPath)) {
			t.skip('git is not available in this environment');
			return;
		}
		writeFileSync(path.join(projectPath, 'dirty.txt'), 'before\n');
		appendIntent(
			projectPath,
			`
[intents.git_dirty_rewrite]
status = "configured"
lifecycle = "oneshot"
run_policy = "agent_allowed"
description = "Rewrite a file that was already dirty before execution."
argv = ['${process.execPath}', '-e', 'require("node:fs").writeFileSync("dirty.txt", "after\\n")']
cwd = "."
timeout_seconds = 10
stdin = "closed"
success_exit_codes = [0]
writes = []
network = false
destructive = false
`,
		);

		const result = runCli(projectPath, ['run', 'git_dirty_rewrite', '--json']);
		const receipt = JSON.parse(result.stdout);

		assert.equal(result.status, 0, result.stderr || result.stdout);
		assert.equal(receipt.status, 'passed');
		assert.equal(receipt.write_drift.status, 'checked');
		assert.deepEqual(receipt.write_drift.declared_paths, []);
		assert.deepEqual(receipt.write_drift.observed_paths, ['dirty.txt']);
		assert.deepEqual(receipt.write_drift.undeclared_paths, ['dirty.txt']);
		assert.equal(receipt.write_drift.has_undeclared_changes, true);
		assert.equal(readFileSync(path.join(projectPath, 'dirty.txt'), 'utf8'), 'after\n');
	} finally {
		removeTempProject(projectPath);
	}
});

test('uses the minimal command environment by default without exposing outer secrets', () => {
	const projectPath = createTempProject();

	try {
		initProject(projectPath);
		appendIntent(
			projectPath,
			`
[intents.env_minimal]
status = "configured"
lifecycle = "oneshot"
run_policy = "agent_allowed"
description = "Print whether non-minimal environment variables are visible."
argv = ['${process.execPath}', '-e', 'console.log(process.env.MUSTFLOW_TEST_SECRET_ENV || "missing")']
cwd = "."
timeout_seconds = 10
stdin = "closed"
success_exit_codes = [0]
writes = []
network = false
destructive = false
`,
		);

		const result = runCli(projectPath, ['run', 'env_minimal', '--json'], {
			env: createEnvWithCommandPolicyFixtures(),
		});
		const receipt = JSON.parse(result.stdout);

		assert.equal(result.status, 0, result.stderr || result.stdout);
		assert.equal(receipt.env_policy, 'minimal');
		assert.deepEqual(receipt.env_allowlist, []);
		assert.match(receipt.stdout.tail, /missing/);
		assert.doesNotMatch(receipt.stdout.tail, /hidden-env-value/);
	} finally {
		removeTempProject(projectPath);
	}
});

test('passes only named extra environment variables through allowlist policy', () => {
	const projectPath = createTempProject();

	try {
		initProject(projectPath);
		appendIntent(
			projectPath,
			`
[intents.env_allowlist]
status = "configured"
lifecycle = "oneshot"
run_policy = "agent_allowed"
description = "Print selected environment variables."
env_policy = "allowlist"
env_allowlist = ["MUSTFLOW_TEST_ALLOWED_ENV"]
argv = ['${process.execPath}', '-e', 'console.log(JSON.stringify({ allowed: process.env.MUSTFLOW_TEST_ALLOWED_ENV || "missing", secret: process.env.MUSTFLOW_TEST_SECRET_ENV || "missing" }))']
cwd = "."
timeout_seconds = 10
stdin = "closed"
success_exit_codes = [0]
writes = []
network = false
destructive = false
`,
		);

		const result = runCli(projectPath, ['run', 'env_allowlist', '--json'], {
			env: createEnvWithCommandPolicyFixtures(),
		});
		const receipt = JSON.parse(result.stdout);
		const output = JSON.parse(receipt.stdout.tail);

		assert.equal(result.status, 0, result.stderr || result.stdout);
		assert.equal(receipt.env_policy, 'allowlist');
		assert.deepEqual(receipt.env_allowlist, ['MUSTFLOW_TEST_ALLOWED_ENV']);
		assert.deepEqual(output, { allowed: 'visible-env-value', secret: 'missing' });
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

test('records output limit overflow separately from process start failure', () => {
	const projectPath = createTempProject();

	try {
		initProject(projectPath);
		appendIntent(
			projectPath,
			`
[intents.too_chatty]
status = "configured"
lifecycle = "oneshot"
run_policy = "agent_allowed"
description = "Write more output than the configured capture budget allows."
argv = ['${process.execPath}', '-e', 'process.stdout.write("x".repeat(4096))']
cwd = "."
timeout_seconds = 10
max_output_bytes = 1024
stdin = "closed"
success_exit_codes = [0]
writes = []
network = false
destructive = false
`,
		);

		const result = runCli(projectPath, ['run', 'too_chatty', '--json']);
		const receipt = JSON.parse(result.stdout);
		const latest = JSON.parse(readFileSync(latestRunReceiptPath(projectPath), 'utf8'));

		assert.equal(result.status, 1);
		assert.equal(result.stderr, '');
		assert.equal(receipt.status, 'output_limit_exceeded');
		assert.equal(receipt.timed_out, false);
		assert.ok(receipt.exit_code === null || typeof receipt.exit_code === 'number');
		assert.equal(receipt.performance.result_summary.status, 'output_limit_exceeded');
		assert.equal(receipt.performance.result_summary.error_kind, 'output_limit_exceeded');
		assert.equal(receipt.performance.result_summary.timed_out, false);
		assert.notEqual(receipt.status, 'start_failed');
		assert.match(receipt.error, /maxBuffer|ENOBUFS|exceeded/i);
		assert.deepEqual(latest, receipt);
	} finally {
		removeTempProject(projectPath);
	}
});

test('enforces output limits for streamed command output', () => {
	const projectPath = createTempProject();

	try {
		initProject(projectPath);
		setDefaultKillAfterSeconds(projectPath, 1);
		appendIntent(
			projectPath,
			`
[intents.too_chatty_stream]
status = "configured"
lifecycle = "oneshot"
run_policy = "agent_allowed"
description = "Write more streamed output than the configured budget allows."
argv = ['${process.execPath}', '-e', 'process.stdout.write("x".repeat(4096)); setTimeout(() => {}, 10000)']
cwd = "."
timeout_seconds = 10
max_output_bytes = 1024
stdin = "closed"
success_exit_codes = [0]
writes = []
network = false
destructive = false
`,
		);

		const result = runCli(projectPath, ['run', 'too_chatty_stream'], { timeout: 5000 });
		const receipt = JSON.parse(readFileSync(latestRunReceiptPath(projectPath), 'utf8'));

		assert.equal(result.error, undefined);
		assert.equal(result.status, 1, result.stderr || result.stdout);
		assert.equal(receipt.status, 'output_limit_exceeded');
		assert.equal(receipt.timed_out, false);
		assert.ok(receipt.exit_code === null || typeof receipt.exit_code === 'number');
		assert.match(result.stderr, /max_output_bytes|output/i);
		assert.doesNotMatch(result.stderr, /failed to start/i);
		assert.equal(receipt.performance.result_summary.error_kind, 'output_limit_exceeded');
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
		assert.deepEqual(receipt.termination, {
			reason: 'timeout',
			method: process.platform === 'win32' ? 'taskkill_process_tree' : 'process_group_sigterm',
			graceful_signal: 'SIGTERM',
			forced_signal: 'SIGKILL',
			forced_kill_attempted: false,
			confirmed: true,
			cleanup_pending: false,
		});
		assert.deepEqual(latest, receipt);
	} finally {
		removeTempProject(projectPath);
	}
});

test('settles streamed command intents when the timeout is reached', () => {
	const projectPath = createTempProject();

	try {
		initProject(projectPath);
		setDefaultKillAfterSeconds(projectPath, 1);
		appendIntent(
			projectPath,
			`
[intents.slow_streaming_command]
status = "configured"
lifecycle = "oneshot"
run_policy = "agent_allowed"
description = "Ignore normal termination after the configured timeout."
argv = ['${process.execPath}', '-e', 'process.on("SIGTERM", () => {}); setTimeout(() => {}, 10000)']
cwd = "."
timeout_seconds = 1
stdin = "closed"
success_exit_codes = [0]
writes = []
network = false
destructive = false
`,
		);

		const startedAt = Date.now();
		const result = runCli(projectPath, ['run', 'slow_streaming_command'], { timeout: 5000 });
		const elapsedMs = Date.now() - startedAt;
		const receipt = JSON.parse(readFileSync(latestRunReceiptPath(projectPath), 'utf8'));

		assert.equal(result.error, undefined);
		assert.equal(result.status, 1, result.stderr || result.stdout);
		assert.ok(elapsedMs < 4900, `streaming timeout should settle before the parent guard, elapsed ${elapsedMs}ms`);
		assert.equal(receipt.status, 'timed_out');
		assert.equal(receipt.timed_out, true);
		assert.equal(receipt.exit_code, null);
		assert.equal(receipt.timeout_seconds, 1);
		assert.equal(receipt.kill_method, process.platform === 'win32' ? 'taskkill_process_tree' : 'process_group_sigterm');
		assert.deepEqual(receipt.termination, {
			reason: 'timeout',
			method: process.platform === 'win32' ? 'taskkill_process_tree' : 'process_group_sigterm',
			graceful_signal: 'SIGTERM',
			forced_signal: 'SIGKILL',
			forced_kill_attempted: process.platform !== 'win32',
			confirmed: true,
			cleanup_pending: false,
		});
		assert.match(result.stderr, /timed out/i);
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
		assert.match(result.stderr, /Suggested command contract snippet/);
		assert.match(result.stderr, /\[intents\.dev_server\]/);
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
