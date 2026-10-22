import assert from 'node:assert/strict';
import { appendFileSync, existsSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { test } from 'node:test';
import { runArgvCommandStreaming } from '../../dist/cli/commands/run/executor.js';
import { executeRunCommand } from '../../dist/cli/commands/run/execution.js';
import { runVerify } from '../../dist/cli/commands/verify.js';
import { acquireActiveRunLock, listActiveRunLocks } from '../../dist/core/active-run-locks.js';
import { readCommandContract } from '../../dist/core/config-loading.js';
import { createMinimalWorkflowProject } from './index-support.js';
import { projectRoot, removeTempProject, runCliCommand } from './helpers/cli-harness.js';
import { assertMatchesSchema } from '../helpers/json-schema.js';

const silent = { stdout() {}, stderr() {} };
const request = { intentName: 'a_wait', outputMode: 'silent', allowUntrustedRoot: false, allowApprovals: [], wait: true, waitTimeoutSeconds: 60 };

function addIntent(root, name, script) {
	appendFileSync(path.join(root, '.mustflow/config/commands.toml'), `
[intents.${name}]
status = "configured"
lifecycle = "oneshot"
run_policy = "agent_allowed"
description = "Cancellation fixture."
argv = ['${process.execPath}', '-e', '${script}']
cwd = "."
timeout_seconds = 30
kill_after_seconds = 1
stdin = "closed"
success_exit_codes = [0]
writes = ["ready.txt"]
network = false
destructive = false
required_after = ["cancel_test"]
`);
}

function createProject() {
	const root = createMinimalWorkflowProject('mustflow-cancellation-');
	writeFileSync(path.join(root, '.mustflow/config/mustflow.toml'), '[workflow]\nmode = "simple"\n');
	return root;
}

test('pre-aborted executor never spawns a child', async () => {
	const result = await runArgvCommandStreaming(
		{ executable: process.execPath, args: ['-e', 'process.exit(99)'], shell: false },
		projectRoot, process.env, 10, 1, 1024, 1024, 1024, silent, false, true,
		{ signal: AbortSignal.abort() },
	);
	assert.equal(result.error.code, 'EINTERRUPTED');
	assert.equal(result.pid, undefined);
});

test('aborting a running child uses supervised termination and removes listeners', async () => {
	const controller = new AbortController();
	const before = process.listenerCount('SIGTERM');
	const result = await runArgvCommandStreaming(
		{ executable: process.execPath, args: ['-e', 'console.log("ready"); setInterval(() => {}, 1000)'], shell: false },
		projectRoot, process.env, 10, 1, 1024, 1024, 1024,
		{ ...silent, stdout() { controller.abort(); controller.abort(); } }, true, true,
		{ signal: controller.signal },
	);
	assert.equal(result.error.code, 'EINTERRUPTED');
	assert.equal(result.termination.reason, 'parent_signal');
	assert.ok(result.termination.confirmed || result.termination.cleanup_pending);
	assert.throws(() => process.kill(result.pid, 0), { code: 'ESRCH' });
	assert.equal(process.listenerCount('SIGTERM'), before);
});

test('abort interrupts active-lock waiting without acquiring another lock', async () => {
	const root = createProject();
	let lease;
	try {
		addIntent(root, 'a_wait', 'process.exit(99)');
		lease = acquireActiveRunLock(root, readCommandContract(root), 'a_wait');
		assert.equal(lease.ok, true);
		const controller = new AbortController();
		const result = await runCliCommand(root, ['run'], async (_args, reporter) => {
			const run = await executeRunCommand({ ...request, outputMode: 'text' }, {
				...reporter, stderr(message) { reporter.stderr(message); controller.abort(); },
			}, 'en', { signal: controller.signal });
			return run.exitCode;
		});
		assert.equal(result.status, 1);
		assert.match(result.stderr, /interrupted/);
		assert.equal(listActiveRunLocks(root).activeRecords.length, 1);
	} finally {
		if (lease?.ok) lease.handle.release();
		removeTempProject(root);
	}
});

test('verification abort stops subsequent intents and restores parent signal listeners', async () => {
	const root = createProject();
	const controller = new AbortController();
	let poll;
	const guard = setTimeout(() => controller.abort(), 10000);
	const before = process.listenerCount('SIGINT');
	try {
		addIntent(root, 'a_wait', 'require("node:fs").writeFileSync("ready.txt", "ready"); Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 15000)');
		addIntent(root, 'b_later', 'require("node:fs").writeFileSync("ready.txt", "wrong")');
		poll = setInterval(() => {
			if (existsSync(path.join(root, 'ready.txt'))) controller.abort();
		}, 10);
		const result = await runCliCommand(root, ['verify', '--reason', 'cancel_test', '--profile', 'release', '--json'],
			(args, reporter) => runVerify(args, reporter, 'en', { signal: controller.signal }));
		assert.equal(result.status, 1, result.stderr);
		const report = JSON.parse(result.stdout);
		assertMatchesSchema(path.join(projectRoot, 'schemas'), 'verify-report.schema.json', report);
		assert.equal(report.results.find((entry) => entry.intent === 'a_wait').status, 'failed', JSON.stringify(report.results));
		assert.equal(report.results.find((entry) => entry.intent === 'b_later').reason, 'cancelled');
		assert.equal(process.listenerCount('SIGINT'), before);
	} finally {
		clearInterval(poll);
		clearTimeout(guard);
		controller.abort();
		removeTempProject(root);
	}
});
