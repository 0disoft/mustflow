import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { test } from 'node:test';
import { pathToFileURL } from 'node:url';

import {
	appendIntent,
	cliPath,
	commitGitBaseline,
	createEnvWithoutPathLookup,
	createEnvWithCommandPolicyFixtures,
	createEnvWithLocalBinFirst,
	createEnvWithRecursiveWriteDriftSnapshot,
	createLocalBinShim,
	createTempProject,
	initProject,
	latestRunProfilePath,
	latestRunReceiptPath,
	packageVersion,
	projectRoot,
	removeTempProject,
	runCli,
	runPerformanceSamplesPath,
	runPerformanceSummaryPath,
	setDefaultKillAfterSeconds,
	trySymlink,
	waitForClose,
	waitForOutput,
} from './run-support.js';

function writeStandaloneRunContract(projectPath, markerPath) {
	mkdirSync(path.join(projectPath, '.mustflow', 'config'), { recursive: true });
	writeFileSync(
		path.join(projectPath, '.mustflow', 'config', 'commands.toml'),
		`
[defaults]
default_cwd = "."
env_policy = "minimal"
env_allowlist = []
kill_after_seconds = 1

[intents.untrusted_marker]
status = "configured"
lifecycle = "oneshot"
run_policy = "agent_allowed"
description = "Create a marker file from a manually-created command contract."
argv = ['${process.execPath}', '-e', 'require("node:fs").writeFileSync(${JSON.stringify(markerPath)}, "ran")']
cwd = "."
timeout_seconds = 10
stdin = "closed"
success_exit_codes = [0]
writes = ["marker.txt"]
network = false
destructive = false
`,
	);
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

test('requires explicit opt-in before executing commands from roots without a manifest lock', () => {
	const projectPath = createTempProject();
	const markerPath = path.join(projectPath, 'marker.txt');

	try {
		writeStandaloneRunContract(projectPath, markerPath);

		const blocked = runCli(projectPath, ['run', 'untrusted_marker', '--json']);

		assert.equal(blocked.status, 1);
		assert.equal(blocked.stdout, '');
		assert.match(blocked.stderr, /manifest\.lock\.toml/);
		assert.match(blocked.stderr, /--allow-untrusted-root/);
		assert.equal(existsSync(markerPath), false);
		assert.equal(existsSync(latestRunReceiptPath(projectPath)), false);

		writeFileSync(path.join(projectPath, '.mustflow', 'config', 'manifest.lock.toml'), 'schema_version = ');
		const invalidLock = runCli(projectPath, ['run', 'untrusted_marker', '--json']);

		assert.equal(invalidLock.status, 1);
		assert.equal(invalidLock.stdout, '');
		assert.match(invalidLock.stderr, /manifest lock is invalid/);
		assert.equal(existsSync(markerPath), false);
		assert.equal(existsSync(latestRunReceiptPath(projectPath)), false);

		const preview = runCli(projectPath, ['run', 'untrusted_marker', '--dry-run', '--json']);
		const previewJson = JSON.parse(preview.stdout);

		assert.equal(preview.status, 0, preview.stderr || preview.stdout);
		assert.equal(previewJson.runnable, true);
		assert.equal(existsSync(markerPath), false);
		assert.equal(existsSync(latestRunReceiptPath(projectPath)), false);

		const allowed = runCli(projectPath, ['run', 'untrusted_marker', '--allow-untrusted-root', '--json']);
		const receipt = JSON.parse(allowed.stdout);

		assert.equal(allowed.status, 0, allowed.stderr || allowed.stdout);
		assert.equal(receipt.status, 'passed');
		assert.equal(receipt.intent, 'untrusted_marker');
		assert.equal(readFileSync(markerPath, 'utf8'), 'ran');
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
