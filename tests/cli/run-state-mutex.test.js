import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { test } from 'node:test';
import { pathToFileURL } from 'node:url';

import { createTempProject, projectRoot, removeTempProject } from './helpers/cli-harness.js';

async function importRunStateMutex() {
	return import(pathToFileURL(path.join(projectRoot, 'dist', 'core', 'run-state-mutex.js')).href);
}

async function importActiveRunLocks() {
	return import(pathToFileURL(path.join(projectRoot, 'dist', 'core', 'active-run-locks.js')).href);
}

function createWriteContract() {
	return {
		defaults: {},
		resources: {},
		intents: {
			writer: {
				writes: ['dist/**'],
			},
		},
	};
}

const sleepBuffer = new Int32Array(new SharedArrayBuffer(4));

function sleep(milliseconds) {
	Atomics.wait(sleepBuffer, 0, 0, milliseconds);
}

function mutexPath(projectPath, scope) {
	return path.join(projectPath, '.mustflow', 'state', 'mutexes', scope);
}

function waitForPath(filePath, timeoutMs = 5_000) {
	const startedAt = Date.now();
	while (!existsSync(filePath)) {
		if (Date.now() - startedAt > timeoutMs) {
			throw new Error(`timed out waiting for ${filePath}`);
		}
		sleep(10);
	}
}

function waitForChild(child) {
	if (child.exitCode !== null) {
		return Promise.resolve(child.exitCode);
	}

	return new Promise((resolve, reject) => {
		child.once('error', reject);
		child.once('close', resolve);
	});
}

test('run state mutex lanes allow unrelated state writers to overlap', async () => {
	const projectPath = createTempProject('mustflow-run-state-lanes-');
	const { RUN_STATE_MUTEX_SCOPES, withRunStateUpdateMutex } = await importRunStateMutex();

	try {
		withRunStateUpdateMutex(projectPath, RUN_STATE_MUTEX_SCOPES.receipts, () => {
			assert.equal(
				existsSync(path.join(mutexPath(projectPath, RUN_STATE_MUTEX_SCOPES.receipts), 'owner.json')),
				true,
			);

			withRunStateUpdateMutex(projectPath, RUN_STATE_MUTEX_SCOPES.profiles, () => {
				assert.equal(
					existsSync(path.join(mutexPath(projectPath, RUN_STATE_MUTEX_SCOPES.profiles), 'owner.json')),
					true,
				);

				withRunStateUpdateMutex(projectPath, RUN_STATE_MUTEX_SCOPES.performanceHistory, () => {
					assert.equal(
						existsSync(path.join(mutexPath(projectPath, RUN_STATE_MUTEX_SCOPES.performanceHistory), 'owner.json')),
						true,
					);
				});
			});
		});

		assert.equal(existsSync(mutexPath(projectPath, RUN_STATE_MUTEX_SCOPES.receipts)), false);
		assert.equal(existsSync(mutexPath(projectPath, RUN_STATE_MUTEX_SCOPES.profiles)), false);
		assert.equal(existsSync(mutexPath(projectPath, RUN_STATE_MUTEX_SCOPES.performanceHistory)), false);
	} finally {
		removeTempProject(projectPath);
	}
});

test('run state mutex lanes remain independent from active run lock arbitration', async () => {
	const projectPath = createTempProject('mustflow-run-state-active-lock-');
	const { RUN_STATE_MUTEX_SCOPES, withRunStateUpdateMutex } = await importRunStateMutex();
	const { acquireActiveRunLock } = await importActiveRunLocks();

	try {
		withRunStateUpdateMutex(projectPath, RUN_STATE_MUTEX_SCOPES.receipts, () => {
			const result = acquireActiveRunLock(projectPath, createWriteContract(), 'writer');
			assert.equal(result.ok, true);
			result.handle.release();
		});
	} finally {
		removeTempProject(projectPath);
	}
});

test('one run state mutex lane still serializes competing writers', async () => {
	const projectPath = createTempProject('mustflow-run-state-serial-');
	const { RUN_STATE_MUTEX_SCOPES, withRunStateUpdateMutex } = await importRunStateMutex();
	const waitingPath = path.join(projectPath, 'waiting-for-state-lane.txt');
	const enteredPath = path.join(projectPath, 'entered-state-lane.txt');
	const moduleUrl = pathToFileURL(path.join(projectRoot, 'dist', 'core', 'run-state-mutex.js')).href;
	const childScript = `
import { writeFileSync } from 'node:fs';
import { withRunStateUpdateMutex } from ${JSON.stringify(moduleUrl)};

writeFileSync(process.argv[2], 'waiting');
withRunStateUpdateMutex(process.argv[1], process.argv[4], () => {
\twriteFileSync(process.argv[3], 'entered');
});
`;
	let child;
	let childClosed;

	try {
		withRunStateUpdateMutex(projectPath, RUN_STATE_MUTEX_SCOPES.receipts, () => {
			child = spawn(
				process.execPath,
				[
					'--input-type=module',
					'-e',
					childScript,
					projectPath,
					waitingPath,
					enteredPath,
					RUN_STATE_MUTEX_SCOPES.receipts,
				],
				{
					cwd: projectPath,
					stdio: ['ignore', 'pipe', 'pipe'],
					windowsHide: true,
				},
			);
			childClosed = waitForChild(child);
			waitForPath(waitingPath);
			sleep(100);
			assert.equal(existsSync(enteredPath), false);
		});

		assert.equal(await childClosed, 0);
		assert.equal(readFileSync(enteredPath, 'utf8'), 'entered');
	} finally {
		child?.kill();
		removeTempProject(projectPath);
	}
});

test('run state mutex lanes recover stale owners independently', async () => {
	const projectPath = createTempProject('mustflow-run-state-stale-');
	const { RUN_STATE_MUTEX_SCOPES, withRunStateUpdateMutex } = await importRunStateMutex();
	const scope = RUN_STATE_MUTEX_SCOPES.performanceHistory;
	const directory = mutexPath(projectPath, scope);

	mkdirSync(directory, { recursive: true });
	writeFileSync(
		path.join(directory, 'owner.json'),
		`${JSON.stringify(
			{
				lock_id: 'stale-lock',
				owner_token: 'stale-owner',
				pid: -1,
				process_start_token: 'linux:stale:1',
				started_at: '2000-01-01T00:00:00.000Z',
			},
			null,
			2,
		)}\n`,
	);

	try {
		let entered = false;
		withRunStateUpdateMutex(
			projectPath,
			scope,
			() => {
				entered = true;
			},
			{ waitMs: 0 },
		);
		assert.equal(entered, true);
		assert.equal(existsSync(directory), false);
	} finally {
		removeTempProject(projectPath);
	}
});

test('run state mutex release preserves a replaced scoped owner record', async () => {
	const projectPath = createTempProject('mustflow-run-state-replaced-owner-');
	const { RUN_STATE_MUTEX_SCOPES, withRunStateUpdateMutex } = await importRunStateMutex();
	const scope = RUN_STATE_MUTEX_SCOPES.profiles;
	const directory = mutexPath(projectPath, scope);
	const ownerPath = path.join(directory, 'owner.json');

	try {
		withRunStateUpdateMutex(projectPath, scope, () => {
			const owner = JSON.parse(readFileSync(ownerPath, 'utf8'));
			writeFileSync(
				ownerPath,
				`${JSON.stringify({ ...owner, owner_token: 'replacement-owner' }, null, 2)}\n`,
			);
		});
		assert.equal(existsSync(directory), true);
	} finally {
		rmSync(directory, { recursive: true, force: true });
		removeTempProject(projectPath);
	}
});
