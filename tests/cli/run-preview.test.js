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
preconditions = [
  { kind = "path_exists", path = "dist/cli/index.js", satisfy_intent = "mustflow_check" },
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
		assert.equal(preview.resolved_argv.windowsCommandScript, false);
		assert.deepEqual(preview.writes, ['dry-run-spawned.txt']);
		assert.equal(preview.effects[0].path, 'dry-run-spawned.txt');
		assert.equal(preview.network, false);
		assert.equal(preview.destructive, false);
		assert.equal(preview.env_policy, 'minimal');
		assert.deepEqual(preview.env_allowlist, []);
		assert.deepEqual(preview.success_exit_codes, [0]);
		assert.equal(preview.preconditions.length, 1);
		assert.equal(preview.preconditions[0].kind, 'path_exists');
		assert.equal(preview.preconditions[0].status, 'missing');
		assert.equal(preview.preconditions[0].path, 'dist/cli/index.js');
		assert.equal(preview.preconditions[0].satisfyIntent.intent, 'mustflow_check');
		assert.equal(preview.preconditions[0].satisfyIntent.runnable, true);
		assert.equal(existsSync(markerPath), false);
		assert.equal(existsSync(latestRunReceiptPath(projectPath)), false);
	} finally {
		removeTempProject(projectPath);
	}
});

test('blocks approval-gated network and destructive command intents before execution', () => {
	const projectPath = createTempProject();
	const networkMarkerPath = path.join(projectPath, 'network-spawned.txt');
	const destructiveMarkerPath = path.join(projectPath, 'destructive-spawned.txt');

	try {
		initProject(projectPath);
		appendIntent(
			projectPath,
			`
[intents.network_marker]
status = "configured"
lifecycle = "oneshot"
run_policy = "agent_allowed"
description = "Try to run a network-marked intent."
argv = ['${process.execPath}', '-e', 'require("node:fs").writeFileSync(${JSON.stringify(networkMarkerPath)}, "ran")']
cwd = "."
timeout_seconds = 10
stdin = "closed"
success_exit_codes = [0]
writes = []
network = true
destructive = false

[intents.destructive_marker]
status = "configured"
lifecycle = "oneshot"
run_policy = "agent_allowed"
description = "Try to run a destructive-marked intent."
argv = ['${process.execPath}', '-e', 'require("node:fs").writeFileSync(${JSON.stringify(destructiveMarkerPath)}, "ran")']
cwd = "."
timeout_seconds = 10
stdin = "closed"
success_exit_codes = [0]
writes = []
network = false
destructive = true
`,
		);

		const networkResult = runCli(projectPath, ['run', 'network_marker', '--json']);
		const networkPreview = JSON.parse(networkResult.stdout);
		const destructiveResult = runCli(projectPath, ['run', 'destructive_marker', '--json']);
		const destructivePreview = JSON.parse(destructiveResult.stdout);

		assert.equal(networkResult.status, 1);
		assert.match(networkResult.stderr, /requires approval/i);
		assert.doesNotMatch(networkResult.stderr, /development server|watcher|background process/i);
		assert.equal(networkPreview.preview, true);
		assert.equal(networkPreview.preview_mode, 'plan-only');
		assert.equal(networkPreview.runnable, false);
		assert.deepEqual(networkPreview.eligibility, { ok: true, code: 'ok', detail: null });
		assert.equal(networkPreview.reason_code, 'network_requires_approval');
		assert.equal(networkPreview.network, true);
		assert.match(networkPreview.detail, /network_access/);
		assert.equal(existsSync(networkMarkerPath), false);

		assert.equal(destructiveResult.status, 1);
		assert.match(destructiveResult.stderr, /requires approval/i);
		assert.doesNotMatch(destructiveResult.stderr, /development server|watcher|background process/i);
		assert.equal(destructivePreview.preview, true);
		assert.equal(destructivePreview.preview_mode, 'plan-only');
		assert.equal(destructivePreview.runnable, false);
		assert.deepEqual(destructivePreview.eligibility, { ok: true, code: 'ok', detail: null });
		assert.equal(destructivePreview.reason_code, 'destructive_requires_approval');
		assert.equal(destructivePreview.destructive, true);
		assert.match(destructivePreview.detail, /destructive_command/);
		assert.equal(existsSync(destructiveMarkerPath), false);
		assert.equal(existsSync(latestRunReceiptPath(projectPath)), false);
	} finally {
		removeTempProject(projectPath);
	}
});

test('rejects unsupported run options before planning or execution', () => {
	const projectPath = createTempProject();

	try {
		const booleanValue = runCli(projectPath, ['run', 'preview_marker', '--dry-run=true']);
		const missingTimeout = runCli(projectPath, ['run', 'preview_marker', '--wait-timeout']);
		const invalidTimeout = runCli(projectPath, ['run', 'preview_marker', '--wait-timeout=0']);

		assert.equal(booleanValue.status, 1);
		assert.match(booleanValue.stderr, /Unknown option: --dry-run=true/u);
		assert.match(booleanValue.stderr, /Usage: mf run/u);
		assert.equal(booleanValue.stdout, '');
		assert.equal(missingTimeout.status, 1);
		assert.match(missingTimeout.stderr, /wait-timeout/u);
		assert.match(missingTimeout.stderr, /Usage: mf run/u);
		assert.equal(missingTimeout.stdout, '');
		assert.equal(invalidTimeout.status, 1);
		assert.match(invalidTimeout.stderr, /wait-timeout/u);
		assert.equal(invalidTimeout.stdout, '');
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

[intents.argv_safe_go_test]
status = "configured"
lifecycle = "oneshot"
run_policy = "agent_allowed"
description = "Safe Go one-shot test command."
argv = ["go", "test", "./..."]
cwd = "."
timeout_seconds = 10
stdin = "closed"
success_exit_codes = [0]
writes = []
network = false
destructive = false

[intents.argv_npx_vite]
status = "configured"
lifecycle = "oneshot"
run_policy = "agent_allowed"
description = "Try to hide a development server behind npx."
argv = ["npx", "vite"]
cwd = "."
timeout_seconds = 10
stdin = "closed"
success_exit_codes = [0]
writes = []
network = false
destructive = false

[intents.argv_npm_exec_vite]
status = "configured"
lifecycle = "oneshot"
run_policy = "agent_allowed"
description = "Try to hide a development server behind npm exec."
argv = ["npm", "exec", "vite"]
cwd = "."
timeout_seconds = 10
stdin = "closed"
success_exit_codes = [0]
writes = []
network = false
destructive = false

[intents.argv_bunx_vite]
status = "configured"
lifecycle = "oneshot"
run_policy = "agent_allowed"
description = "Try to hide a development server behind bunx."
argv = ["bunx", "vite"]
cwd = "."
timeout_seconds = 10
stdin = "closed"
success_exit_codes = [0]
writes = []
network = false
destructive = false

[intents.argv_turbo_dev]
status = "configured"
lifecycle = "oneshot"
run_policy = "agent_allowed"
description = "Try to run a long-running turbo dev process."
argv = ["turbo", "dev"]
cwd = "."
timeout_seconds = 10
stdin = "closed"
success_exit_codes = [0]
writes = []
network = false
destructive = false

[intents.argv_tsx_watch]
status = "configured"
lifecycle = "oneshot"
run_policy = "agent_allowed"
description = "Try to run a long-running tsx watcher."
argv = ["tsx", "watch", "src/index.ts"]
cwd = "."
timeout_seconds = 10
stdin = "closed"
success_exit_codes = [0]
writes = []
network = false
destructive = false

[intents.argv_python_http_server]
status = "configured"
lifecycle = "oneshot"
run_policy = "agent_allowed"
description = "Try to run a long-running Python HTTP server."
argv = ["python", "-m", "http.server"]
cwd = "."
timeout_seconds = 10
stdin = "closed"
success_exit_codes = [0]
writes = []
network = false
destructive = false

[intents.argv_julia_eval]
status = "configured"
lifecycle = "oneshot"
run_policy = "agent_allowed"
description = "Try to attach long-running Julia evaluation code to a flag."
argv = ["julia", "-e", "while true; end"]
cwd = "."
timeout_seconds = 10
stdin = "closed"
success_exit_codes = [0]
writes = []
network = false
destructive = false

[intents.argv_cargo_watch]
status = "configured"
lifecycle = "oneshot"
run_policy = "agent_allowed"
description = "Try to run cargo watch."
argv = ["cargo", "watch"]
cwd = "."
timeout_seconds = 10
stdin = "closed"
success_exit_codes = [0]
writes = []
network = false
destructive = false

[intents.argv_cargo_tauri_dev]
status = "configured"
lifecycle = "oneshot"
run_policy = "agent_allowed"
description = "Try to run cargo tauri dev."
argv = ["cargo", "tauri", "dev"]
cwd = "."
timeout_seconds = 10
stdin = "closed"
success_exit_codes = [0]
writes = []
network = false
destructive = false

[intents.argv_zig_build_watch]
status = "configured"
lifecycle = "oneshot"
run_policy = "agent_allowed"
description = "Try to run zig build in watch mode."
argv = ["zig", "build", "watch"]
cwd = "."
timeout_seconds = 10
stdin = "closed"
success_exit_codes = [0]
writes = []
network = false
destructive = false

[intents.argv_tauri_dev]
status = "configured"
lifecycle = "oneshot"
run_policy = "agent_allowed"
description = "Try to run tauri dev."
argv = ["tauri", "dev"]
cwd = "."
timeout_seconds = 10
stdin = "closed"
success_exit_codes = [0]
writes = []
network = false
destructive = false

[intents.argv_gh_run_watch]
status = "configured"
lifecycle = "oneshot"
run_policy = "agent_allowed"
description = "Try to run gh run watch."
argv = ["gh", "run", "watch"]
cwd = "."
timeout_seconds = 10
stdin = "closed"
success_exit_codes = [0]
writes = []
network = false
destructive = false

[intents.argv_gh_codespace_logs_follow]
status = "configured"
lifecycle = "oneshot"
run_policy = "agent_allowed"
description = "Try to follow GitHub Codespaces logs."
argv = ["gh", "codespace", "logs", "--follow"]
cwd = "."
timeout_seconds = 10
stdin = "closed"
success_exit_codes = [0]
writes = []
network = false
destructive = false

[intents.argv_deno_task_dev]
status = "configured"
lifecycle = "oneshot"
run_policy = "agent_allowed"
description = "Try to run a Deno dev task."
argv = ["deno", "task", "dev"]
cwd = "."
timeout_seconds = 10
stdin = "closed"
success_exit_codes = [0]
writes = []
network = false
destructive = false

[intents.argv_deno_run_watch]
status = "configured"
lifecycle = "oneshot"
run_policy = "agent_allowed"
description = "Try to run Deno in watch mode."
argv = ["deno", "run", "--watch", "server.ts"]
cwd = "."
timeout_seconds = 10
stdin = "closed"
success_exit_codes = [0]
writes = []
network = false
destructive = false

[intents.argv_pnpm_dlx_tauri]
status = "configured"
lifecycle = "oneshot"
run_policy = "agent_allowed"
description = "Try to hide a Tauri dev server behind pnpm dlx."
argv = ["pnpm", "dlx", "tauri", "dev"]
cwd = "."
timeout_seconds = 10
stdin = "closed"
success_exit_codes = [0]
writes = []
network = false
destructive = false

[intents.argv_flutter_run]
status = "configured"
lifecycle = "oneshot"
run_policy = "agent_allowed"
description = "Try to run a Flutter app."
argv = ["flutter", "run"]
cwd = "."
timeout_seconds = 10
stdin = "closed"
success_exit_codes = [0]
writes = []
network = false
destructive = false

[intents.argv_dart_build_runner_watch]
status = "configured"
lifecycle = "oneshot"
run_policy = "agent_allowed"
description = "Try to run Dart build_runner watch."
argv = ["dart", "run", "build_runner", "watch"]
cwd = "."
timeout_seconds = 10
stdin = "closed"
success_exit_codes = [0]
writes = []
network = false
destructive = false

[intents.argv_go_air]
status = "configured"
lifecycle = "oneshot"
run_policy = "agent_allowed"
description = "Try to run the Go air watcher."
argv = ["go", "run", "github.com/air-verse/air"]
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

[intents.shell_zig_build_then_echo_watch]
status = "configured"
lifecycle = "oneshot"
run_policy = "agent_allowed"
description = "Run a bounded zig build before an unrelated watch word."
mode = "shell"
cmd = "zig build && echo watch"
allow_shell = true
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
		const safeGoResult = runCli(projectPath, ['run', 'argv_safe_go_test', '--dry-run', '--json']);
		const safeGoPreview = JSON.parse(safeGoResult.stdout);
		const disguisedLongRunningPreviews = [
			['argv_npx_vite', /package-manager exec target vite/],
			['argv_npm_exec_vite', /package-manager exec target vite/],
			['argv_bunx_vite', /package-manager exec target vite/],
			['argv_turbo_dev', /turbo dev/],
			['argv_tsx_watch', /tsx watch/],
			['argv_python_http_server', /interpreter module "http\.server"/],
			['argv_julia_eval', /interpreter evaluation payload/],
			['argv_cargo_watch', /cargo watch/],
			['argv_cargo_tauri_dev', /cargo tauri dev/],
			['argv_zig_build_watch', /zig build watch/],
			['argv_tauri_dev', /tauri dev/],
			['argv_gh_run_watch', /gh run watch/],
			['argv_gh_codespace_logs_follow', /gh codespace logs follow/],
			['argv_deno_task_dev', /deno task dev/],
			['argv_deno_run_watch', /deno run watch/],
			['argv_pnpm_dlx_tauri', /package-manager exec target tauri dev/],
			['argv_flutter_run', /flutter run/],
			['argv_dart_build_runner_watch', /dart build_runner watch/],
			['argv_go_air', /go run air/],
		].map(([intent, detailPattern]) => {
			const blockedResult = runCli(projectPath, ['run', intent, '--dry-run', '--json']);
			return [blockedResult, JSON.parse(blockedResult.stdout), detailPattern];
		});
		const shellDevResult = runCli(projectPath, ['run', 'shell_dev', '--dry-run', '--json']);
		const shellDevPreview = JSON.parse(shellDevResult.stdout);
		const shellSafeZigResult = runCli(projectPath, ['run', 'shell_zig_build_then_echo_watch', '--dry-run', '--json']);
		const shellSafeZigPreview = JSON.parse(shellSafeZigResult.stdout);

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
		for (const [blockedResult, blockedPreview, detailPattern] of disguisedLongRunningPreviews) {
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
		assert.equal(safeGoResult.status, 0);
		assert.equal(safeGoPreview.runnable, true);
		assert.equal(safeGoPreview.reason_code, null);
		assert.equal(shellSafeZigResult.status, 0);
		assert.equal(shellSafeZigPreview.runnable, true);
		assert.equal(shellSafeZigPreview.reason_code, null);
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
