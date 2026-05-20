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
		assert.equal(receipt.write_drift.status, 'partial');
		assert.deepEqual(receipt.write_drift.declared_paths, []);
		assert.deepEqual(receipt.write_drift.observed_paths, ['git-sneaky.txt']);
		assert.deepEqual(receipt.write_drift.undeclared_paths, ['git-sneaky.txt']);
		assert.equal(receipt.write_drift.has_undeclared_changes, true);
		assert.equal(receipt.write_drift.reason, 'git_status_untracked_files_normal');
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
		assert.equal(receipt.write_drift.status, 'partial');
		assert.deepEqual(receipt.write_drift.declared_paths, []);
		assert.deepEqual(receipt.write_drift.observed_paths, ['dirty.txt']);
		assert.deepEqual(receipt.write_drift.undeclared_paths, ['dirty.txt']);
		assert.equal(receipt.write_drift.has_undeclared_changes, true);
		assert.equal(receipt.write_drift.reason, 'git_status_untracked_files_normal');
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
