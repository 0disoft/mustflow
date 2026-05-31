import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
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
		assert.match(result.stderr, /Running echo_hello \(timeout: 10s\)\.\.\./);
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

		writeFileSync(
			path.join(projectPath, '.mustflow', 'config', 'manifest.lock.toml'),
			`schema_version = "1"
[template]
id = "default"
version = "0.0.0"
[files]
`,
		);
		const emptyLock = runCli(projectPath, ['run', 'untrusted_marker', '--json']);

		assert.equal(emptyLock.status, 1);
		assert.equal(emptyLock.stdout, '');
		assert.match(emptyLock.stderr, /manifest lock is invalid/);
		assert.equal(existsSync(markerPath), false);
		assert.equal(existsSync(latestRunReceiptPath(projectPath)), false);

		writeFileSync(path.join(projectPath, 'AGENTS.md'), 'Read the workflow files.\n');
		const agentsHash = `sha256:${createHash('sha256').update(readFileSync(path.join(projectPath, 'AGENTS.md'))).digest('hex')}`;
		writeFileSync(
			path.join(projectPath, '.mustflow', 'config', 'manifest.lock.toml'),
			`schema_version = "1"
[template]
id = "default"
version = "0.0.0"
[files."AGENTS.md"]
source = "template"
last_action = "created"
content_hash = "${agentsHash}"
[files.".mustflow/config/commands.toml"]
source = "template"
last_action = "created"
content_hash = "sha256:0000000000000000000000000000000000000000000000000000000000000000"
`,
		);
		const staleLock = runCli(projectPath, ['run', 'untrusted_marker', '--json']);

		assert.equal(staleLock.status, 1);
		assert.equal(staleLock.stdout, '');
		assert.match(staleLock.stderr, /Lock hash mismatch: \.mustflow\/config\/commands\.toml/);
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

test('blocks agent-runnable shell intents unless allow_shell is true at runtime', () => {
	const projectPath = createTempProject();
	const markerPath = path.join(projectPath, 'shell-marker.txt');

	try {
		initProject(projectPath);
		appendIntent(
			projectPath,
			`
[intents.shell_without_allow]
status = "configured"
lifecycle = "oneshot"
run_policy = "agent_allowed"
description = "Attempt a shell command without the explicit shell allowance."
mode = "shell"
cmd = ${JSON.stringify(`"${process.execPath}" -e "require('node:fs').writeFileSync(process.argv[1], 'ran')" "${markerPath}"`)}
cwd = "."
timeout_seconds = 10
stdin = "closed"
success_exit_codes = [0]
writes = ["shell-marker.txt"]
network = false
destructive = false
`,
		);

		const preview = runCli(projectPath, ['run', 'shell_without_allow', '--plan-only', '--json']);
		const run = runCli(projectPath, ['run', 'shell_without_allow', '--json']);

		assert.equal(preview.status, 1);
		assert.match(preview.stdout, /agent_shell_requires_allow/);
		assert.equal(run.status, 1);
		assert.match(run.stderr, /allow_shell = true/);
		assert.equal(existsSync(markerPath), false);
	} finally {
		removeTempProject(projectPath);
	}
});

test('blocks overlapping run intents that declare conflicting active locks', async () => {
	const projectPath = createTempProject();
	const conflictMarkerPath = path.join(projectPath, 'conflict.txt');
	const otherMarkerPath = path.join(projectPath, 'other.txt');
	let holder;

	try {
		initProject(projectPath);
		appendIntent(
			projectPath,
			`
[intents.lock_holder]
status = "configured"
lifecycle = "oneshot"
run_policy = "agent_allowed"
description = "Hold an exclusive lock briefly."
argv = ['${process.execPath}', '-e', 'console.log("lock-ready"); setTimeout(() => {}, 4000)']
cwd = "."
timeout_seconds = 10
stdin = "closed"
success_exit_codes = [0]
writes = ["shared.txt"]
effects = [
  { type = "write", mode = "delete_recreate", path = "shared.txt", lock = "shared_lock", concurrency = "exclusive" },
]
network = false
destructive = false

[intents.lock_conflict]
status = "configured"
lifecycle = "oneshot"
run_policy = "agent_allowed"
description = "Write under the same exclusive lock."
argv = ['${process.execPath}', '-e', 'require("node:fs").writeFileSync(${JSON.stringify(conflictMarkerPath)}, "ran")']
cwd = "."
timeout_seconds = 10
stdin = "closed"
success_exit_codes = [0]
writes = ["shared.txt"]
effects = [
  { type = "write", mode = "delete_recreate", path = "shared.txt", lock = "shared_lock", concurrency = "exclusive" },
]
network = false
destructive = false

[intents.lock_other]
status = "configured"
lifecycle = "oneshot"
run_policy = "agent_allowed"
description = "Write under a separate lock."
argv = ['${process.execPath}', '-e', 'require("node:fs").writeFileSync(${JSON.stringify(otherMarkerPath)}, "ran")']
cwd = "."
timeout_seconds = 10
stdin = "closed"
success_exit_codes = [0]
writes = ["other.txt"]
effects = [
  { type = "write", mode = "delete_recreate", path = "other.txt", lock = "other_lock", concurrency = "exclusive" },
]
network = false
destructive = false
`,
		);

		let holderStdout = '';
		let holderStderr = '';
		holder = spawn(process.execPath, [cliPath, 'run', 'lock_holder'], {
			cwd: projectPath,
			stdio: ['ignore', 'pipe', 'pipe'],
		});
		holder.stdout.on('data', (chunk) => {
			holderStdout += chunk.toString();
		});
		holder.stderr.on('data', (chunk) => {
			holderStderr += chunk.toString();
		});
		await waitForOutput(() => holderStdout, /lock-ready/u);

		const preview = runCli(projectPath, ['run', 'lock_conflict', '--dry-run', '--json']);
		const previewJson = JSON.parse(preview.stdout);
		assert.equal(preview.status, 0, preview.stderr || preview.stdout);
		assert.equal(previewJson.active_lock_conflicts.length, 1);
		assert.equal(previewJson.active_lock_conflicts[0].conflictsWithIntent, 'lock_holder');

		const conflict = runCli(projectPath, ['run', 'lock_conflict']);
		assert.equal(conflict.status, 1);
		assert.match(conflict.stderr, /active run lock/u);
		assert.equal(existsSync(conflictMarkerPath), false);

		const localizedConflict = runCli(projectPath, ['--lang', 'ko', 'run', 'lock_conflict']);
		assert.equal(localizedConflict.status, 1);
		assert.match(localizedConflict.stderr, /활성 실행 잠금/u);
		assert.equal(existsSync(conflictMarkerPath), false);

		const other = runCli(projectPath, ['run', 'lock_other']);
		assert.equal(other.status, 0, other.stderr || other.stdout);
		assert.equal(readFileSync(otherMarkerPath, 'utf8'), 'ran');

		const holderResult = await waitForClose(holder);
		holder = undefined;
		assert.equal(holderResult.status, 0, holderStderr);

		const afterRelease = runCli(projectPath, ['run', 'lock_conflict']);
		assert.equal(afterRelease.status, 0, afterRelease.stderr || afterRelease.stdout);
		assert.equal(readFileSync(conflictMarkerPath, 'utf8'), 'ran');
	} finally {
		if (holder?.pid) {
			holder.kill();
		}
		removeTempProject(projectPath);
	}
});

test('waits for conflicting active locks when requested', async () => {
	const projectPath = createTempProject();
	const markerPath = path.join(projectPath, 'waited.txt');
	let holder;

	try {
		initProject(projectPath);
		appendIntent(
			projectPath,
			`
[intents.wait_holder]
status = "configured"
lifecycle = "oneshot"
run_policy = "agent_allowed"
description = "Hold an exclusive lock briefly."
argv = ['${process.execPath}', '-e', 'console.log("lock-ready"); setTimeout(() => {}, 1200)']
cwd = "."
timeout_seconds = 10
stdin = "closed"
success_exit_codes = [0]
writes = ["shared-wait.txt"]
effects = [
  { type = "write", mode = "delete_recreate", path = "shared-wait.txt", lock = "wait_lock", concurrency = "exclusive" },
]
network = false
destructive = false

[intents.wait_runner]
status = "configured"
lifecycle = "oneshot"
run_policy = "agent_allowed"
description = "Write after the holder releases the lock."
argv = ['${process.execPath}', '-e', 'require("node:fs").writeFileSync(${JSON.stringify(markerPath)}, "ran")']
cwd = "."
timeout_seconds = 10
stdin = "closed"
success_exit_codes = [0]
writes = ["shared-wait.txt"]
effects = [
  { type = "write", mode = "delete_recreate", path = "shared-wait.txt", lock = "wait_lock", concurrency = "exclusive" },
]
network = false
destructive = false
`,
		);

		let holderStdout = '';
		let holderStderr = '';
		holder = spawn(process.execPath, [cliPath, 'run', 'wait_holder'], {
			cwd: projectPath,
			stdio: ['ignore', 'pipe', 'pipe'],
		});
		holder.stdout.on('data', (chunk) => {
			holderStdout += chunk.toString();
		});
		holder.stderr.on('data', (chunk) => {
			holderStderr += chunk.toString();
		});
		await waitForOutput(() => holderStdout, /lock-ready/u);

		const waited = runCli(projectPath, ['run', 'wait_runner', '--wait', '--wait-timeout', '5']);
		assert.equal(waited.status, 0, waited.stderr || waited.stdout);
		assert.match(waited.stderr, /Waiting to run wait_runner/u);
		assert.equal(readFileSync(markerPath, 'utf8'), 'ran');

		const holderResult = await waitForClose(holder);
		holder = undefined;
		assert.equal(holderResult.status, 0, holderStderr);
	} finally {
		if (holder?.pid) {
			holder.kill();
		}
		removeTempProject(projectPath);
	}
});

test('reclaims stale active lock records whose owner process is gone', () => {
	const projectPath = createTempProject();
	const markerPath = path.join(projectPath, 'stale-recovered.txt');
	const deadRunId = 'dead-run-lock-record';

	try {
		initProject(projectPath);
		appendIntent(
			projectPath,
			`
[intents.stale_lock_probe]
status = "configured"
lifecycle = "oneshot"
run_policy = "agent_allowed"
description = "Run after a stale lock is reclaimed."
argv = ['${process.execPath}', '-e', 'require("node:fs").writeFileSync(${JSON.stringify(markerPath)}, "ran")']
cwd = "."
timeout_seconds = 10
stdin = "closed"
success_exit_codes = [0]
writes = ["stale-recovered.txt"]
effects = [
  { type = "write", mode = "delete_recreate", path = "stale-recovered.txt", lock = "stale_lock", concurrency = "exclusive" },
]
network = false
destructive = false
`,
		);

		const activeLockDir = path.join(projectPath, '.mustflow', 'state', 'locks', 'active');
		mkdirSync(activeLockDir, { recursive: true });
		writeFileSync(
			path.join(activeLockDir, `${createHash('sha256').update(deadRunId).digest('hex')}.json`),
			JSON.stringify(
				{
					schema_version: '1',
					kind: 'active_run_lock',
					run_id: deadRunId,
					intent: 'dead_writer',
					pid: 999999,
					started_at: '2024-01-01T00:00:00.000Z',
					root_hash: 'test',
					command_hash: null,
					effects: [
						{
							source: 'effects',
							access: 'write',
							mode: 'delete_recreate',
							path: 'stale-recovered.txt',
							lock: 'stale_lock',
							concurrency: 'exclusive',
						},
					],
					writes: ['stale-recovered.txt'],
				},
				null,
				2,
			),
		);

		const result = runCli(projectPath, ['run', 'stale_lock_probe']);

		assert.equal(result.status, 0, result.stderr || result.stdout);
		assert.equal(readFileSync(markerPath, 'utf8'), 'ran');
		assert.deepEqual(readdirSync(activeLockDir).filter((name) => name.endsWith('.json')), []);
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
	const markerPath = path.join(tmpdir(), `mustflow-pwned-git-${process.pid}-${Date.now()}`);

	try {
		rmSync(markerPath, { force: true });
		initProject(projectPath);
		createLocalBinShim(projectPath, 'git', 'PWNED_GIT_SHIM', markerPath);
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
		assert.equal(existsSync(markerPath), false);
	} finally {
		rmSync(markerPath, { force: true });
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
