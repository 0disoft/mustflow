import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { test } from 'node:test';
import { pathToFileURL } from 'node:url';

import {
	createTempProject,
	initProject,
	projectRoot,
	removeTempProject,
	runCli,
} from './helpers/cli-harness.js';

async function importActiveRunLocks() {
	return import(pathToFileURL(path.join(projectRoot, 'dist', 'core', 'active-run-locks.js')).href);
}

function createEffectContract(intentName, effects) {
	return {
		defaults: { default_cwd: '.' },
		resources: {},
		intents: {
			[intentName]: {
				cwd: '.',
				writes: [],
				effects,
			},
		},
	};
}

async function acquireLock(projectPath, intentName, effects) {
	const { acquireActiveRunLock } = await importActiveRunLocks();
	const result = acquireActiveRunLock(projectPath, createEffectContract(intentName, effects), intentName);

	assert.equal(result.ok, true);
	return result.handle;
}

function sha256(value) {
	return createHash('sha256').update(value).digest('hex');
}

function writeActiveLockRecord(projectPath, record) {
	const activeLockDirectory = path.join(projectPath, '.mustflow', 'state', 'locks', 'active');
	mkdirSync(activeLockDirectory, { recursive: true });
	writeFileSync(path.join(activeLockDirectory, `${sha256(record.run_id)}.json`), JSON.stringify(record, null, 2));
}

function createActiveLockRecord(projectPath, overrides = {}) {
	const runId = overrides.run_id ?? `test-active:${Date.now()}:${Math.random()}`;
	const effect = {
		source: 'effects',
		access: 'write',
		mode: 'replace',
		path: 'REPO_MAP.md',
		lock: 'path:REPO_MAP.md',
		concurrency: 'exclusive',
	};

	return {
		schema_version: '1',
		kind: 'active_run_lock',
		run_id: runId,
		intent: 'repo_map_holder',
		pid: process.pid,
		started_at: new Date().toISOString(),
		root_hash: sha256(path.resolve(projectPath)),
		command_hash: null,
		effects: [effect],
		writes: ['REPO_MAP.md'],
		...overrides,
	};
}

function initGitRepository(projectPath) {
	const result = spawnSync('git', ['init'], {
		cwd: projectPath,
		encoding: 'utf8',
	});

	assert.equal(result.status, 0, result.stderr || result.stdout);
}

test('mf map --write conflicts with an active repo_map writer lock', async () => {
	const projectPath = createTempProject('mustflow-active-map-');
	let handle;

	try {
		initProject(projectPath);
		handle = await acquireLock(projectPath, 'repo_map_holder', [
			{ type: 'write', mode: 'replace', path: 'REPO_MAP.md', concurrency: 'exclusive' },
		]);

		const result = runCli(projectPath, ['map', '--write']);

		assert.equal(result.status, 1);
		assert.equal(result.stdout, '');
		assert.match(result.stderr, /active run lock/u);
		assert.equal(existsSync(path.join(projectPath, 'REPO_MAP.md')), false);
	} finally {
		handle?.release();
		removeTempProject(projectPath);
	}
});

test('mf flow --write conflicts with an active repo_flow writer lock', async () => {
	const projectPath = createTempProject('mustflow-active-flow-');
	let handle;

	try {
		initProject(projectPath);
		handle = await acquireLock(projectPath, 'repo_flow_holder', [
			{ type: 'write', mode: 'replace', path: 'REPO_FLOW.md', concurrency: 'exclusive' },
		]);

		const result = runCli(projectPath, ['flow', '--write']);

		assert.equal(result.status, 1);
		assert.equal(result.stdout, '');
		assert.match(result.stderr, /active run lock/u);
		assert.equal(existsSync(path.join(projectPath, 'REPO_FLOW.md')), false);
	} finally {
		handle?.release();
		removeTempProject(projectPath);
	}
});

test('mf map --write does not ignore an active lock when the inherited run id pid does not match', () => {
	const projectPath = createTempProject('mustflow-active-map-spoof-');

	try {
		initProject(projectPath);
		const record = createActiveLockRecord(projectPath, { pid: process.ppid });
		writeActiveLockRecord(projectPath, record);

		const result = runCli(projectPath, ['map', '--write'], {
			env: {
				...process.env,
				MUSTFLOW_ACTIVE_RUN_LOCK_ID: record.run_id,
			},
		});

		assert.equal(result.status, 1);
		assert.equal(result.stdout, '');
		assert.match(result.stderr, /active run lock/u);
		assert.equal(existsSync(path.join(projectPath, 'REPO_MAP.md')), false);
	} finally {
		removeTempProject(projectPath);
	}
});

test('mf index conflicts with an active local_index cache writer lock', async () => {
	const projectPath = createTempProject('mustflow-active-index-');
	let handle;

	try {
		initProject(projectPath);
		handle = await acquireLock(projectPath, 'local_index_holder', [
			{
				type: 'write',
				mode: 'replace',
				path: '.mustflow/cache/**',
				lock: 'local_index_cache',
				concurrency: 'exclusive',
			},
		]);

		const result = runCli(projectPath, ['index', '--json']);

		assert.equal(result.status, 1);
		assert.equal(result.stdout, '');
		assert.match(result.stderr, /active run lock/u);
		assert.equal(existsSync(path.join(projectPath, '.mustflow', 'cache', 'mustflow.sqlite')), false);
	} finally {
		handle?.release();
		removeTempProject(projectPath);
	}
});

test('mf check read guard conflicts with generated surface writers', async () => {
	const projectPath = createTempProject('mustflow-active-check-');
	let handle;

	try {
		initProject(projectPath);
		handle = await acquireLock(projectPath, 'repo_map_holder', [
			{ type: 'write', mode: 'replace', path: 'REPO_MAP.md', concurrency: 'exclusive' },
		]);

		const result = runCli(projectPath, ['check', '--strict', '--json']);

		assert.equal(result.status, 1);
		assert.equal(result.stdout, '');
		assert.match(result.stderr, /active run lock/u);
	} finally {
		handle?.release();
		removeTempProject(projectPath);
	}
});

test('mf doctor read guard conflicts with local index cache writers', async () => {
	const projectPath = createTempProject('mustflow-active-doctor-');
	let handle;

	try {
		initProject(projectPath);
		handle = await acquireLock(projectPath, 'local_index_holder', [
			{
				type: 'write',
				mode: 'replace',
				path: '.mustflow/cache/**',
				lock: 'local_index_cache',
				concurrency: 'exclusive',
			},
		]);

		const result = runCli(projectPath, ['doctor', '--json']);

		assert.equal(result.status, 1);
		assert.equal(result.stdout, '');
		assert.match(result.stderr, /active run lock/u);
	} finally {
		handle?.release();
		removeTempProject(projectPath);
	}
});

test('mf run repo_map does not conflict with its child mf map --write lock', () => {
	const projectPath = createTempProject('mustflow-active-run-map-');

	try {
		initProject(projectPath);

		const result = runCli(projectPath, ['run', 'repo_map', '--json']);
		const receipt = JSON.parse(result.stdout);

		assert.equal(result.status, 0, result.stderr || result.stdout);
		assert.equal(receipt.status, 'passed');
		assert.equal(receipt.intent, 'repo_map');
		assert.ok(existsSync(path.join(projectPath, 'REPO_MAP.md')));
	} finally {
		removeTempProject(projectPath);
	}
});

test('mf run repo_flow does not conflict with its child mf flow --write lock', () => {
	const projectPath = createTempProject('mustflow-active-run-flow-');

	try {
		initProject(projectPath);

		const commandsPath = path.join(projectPath, '.mustflow', 'config', 'commands.toml');
		writeFileSync(
			commandsPath,
			`${readFileSync(commandsPath, 'utf8')}
[intents.repo_flow]
status = "configured"
kind = "mustflow_builtin"
lifecycle = "oneshot"
run_policy = "agent_allowed"
description = "Create or refresh REPO_FLOW.md."
argv = ["node", "${path.join(projectRoot, 'dist', 'cli', 'index.js').replace(/\\/gu, '\\\\')}", "flow", "--write"]
cwd = "."
timeout_seconds = 120
stdin = "closed"
success_exit_codes = [0]
writes = ["REPO_FLOW.md"]
network = false
destructive = false
`,
		);

		const result = runCli(projectPath, ['run', 'repo_flow', '--json', '--allow-untrusted-root']);
		assert.equal(result.status, 0, result.stderr || result.stdout);
		const receipt = JSON.parse(result.stdout);

		assert.equal(receipt.status, 'passed');
		assert.equal(receipt.intent, 'repo_flow');
		assert.ok(existsSync(path.join(projectPath, 'REPO_FLOW.md')));
	} finally {
		removeTempProject(projectPath);
	}
});

test('mf run local_index does not conflict with its child mf index lock', () => {
	const projectPath = createTempProject('mustflow-active-run-index-');

	try {
		initProject(projectPath);

		const result = runCli(projectPath, ['run', 'local_index', '--json']);
		const receipt = JSON.parse(result.stdout);

		assert.equal(result.status, 0, result.stderr || result.stdout);
		assert.equal(receipt.status, 'passed');
		assert.equal(receipt.intent, 'local_index');
		assert.ok(existsSync(path.join(projectPath, '.mustflow', 'cache', 'mustflow.sqlite')));
	} finally {
		removeTempProject(projectPath);
	}
});

test('latest run receipt remains a root-scoped convenience pointer', () => {
	const projectPath = createTempProject('mustflow-active-latest-');

	try {
		initProject(projectPath);
		initGitRepository(projectPath);

		const first = runCli(projectPath, ['run', 'changes_status', '--json']);
		const second = runCli(projectPath, ['run', 'changes_diff_summary', '--json']);
		const latest = JSON.parse(readFileSync(path.join(projectPath, '.mustflow', 'state', 'runs', 'latest.json'), 'utf8'));

		assert.equal(first.status, 0, first.stderr || first.stdout);
		assert.equal(second.status, 0, second.stderr || second.stdout);
		assert.equal(latest.intent, 'changes_diff_summary');
	} finally {
		removeTempProject(projectPath);
	}
});
