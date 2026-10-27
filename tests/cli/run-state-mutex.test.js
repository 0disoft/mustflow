import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import fs, { existsSync, mkdirSync, readFileSync, renameSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { syncBuiltinESMExports } from 'node:module';
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

test('run state mutex rejects linked ancestors and scopes before touching external state', async (t) => {
	const { RUN_STATE_MUTEX_SCOPES, withRunStateUpdateMutex } = await importRunStateMutex();
	const scope = RUN_STATE_MUTEX_SCOPES.receipts;
	const segments = ['.mustflow', 'state', 'mutexes', scope];
	for (let linkedDepth = 1; linkedDepth <= segments.length; linkedDepth += 1) {
		await t.test(segments.slice(0, linkedDepth).join('/'), () => {
			const projectPath = createTempProject('mustflow-mutex-linked-project-');
			const outsidePath = createTempProject('mustflow-mutex-linked-outside-');
			try {
				const linkPath = path.join(projectPath, ...segments.slice(0, linkedDepth));
				const outsideMutex = path.join(outsidePath, ...segments.slice(linkedDepth));
				mkdirSync(path.dirname(linkPath), { recursive: true });
				mkdirSync(outsideMutex, { recursive: true });
				const ownerPath = path.join(outsideMutex, 'owner.json');
				const owner = JSON.stringify({ lock_id: 'outside-lock', owner_token: 'outside-token',
					pid: 2_147_483_647, process_start_token: 'outside-process', started_at: '2000-01-01T00:00:00.000Z' });
				writeFileSync(ownerPath, owner);
				const markerPath = path.join(outsideMutex, 'preserve.txt');
				writeFileSync(markerPath, 'external data');
				symlinkSync(outsidePath, linkPath, process.platform === 'win32' ? 'junction' : 'dir');
				let invoked = false;
				let failure;
				try {
					withRunStateUpdateMutex(projectPath, scope, () => { invoked = true; }, { waitMs: 0 });
				} catch (error) {
					failure = error;
				}
				t.diagnostic(JSON.stringify({ linkedDepth, callbackInvoked: invoked, externalMarkerExists: existsSync(markerPath) }));
				assert.equal(existsSync(markerPath), true, 'stale mutex recovery must preserve external data');
				assert.equal(readFileSync(markerPath, 'utf8'), 'external data');
				assert.equal(readFileSync(ownerPath, 'utf8'), owner);
				assert.equal(invoked, false);
				assert.match(failure?.message ?? '', /must not contain symlinks/u);
			} finally {
				removeTempProject(projectPath);
				removeTempProject(outsidePath);
			}
		});
	}
});

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

test('run state mutex release preserves external state after an ancestor is replaced', async () => {
	const { RUN_STATE_MUTEX_SCOPES, withRunStateUpdateMutex } = await importRunStateMutex();
	const projectPath = createTempProject('mustflow-mutex-replaced-project-');
	const outsidePath = createTempProject('mustflow-mutex-replaced-outside-');
	const scope = RUN_STATE_MUTEX_SCOPES.receipts;
	try {
		const outsideMutex = path.join(outsidePath, 'mutexes', scope);
		mkdirSync(outsideMutex, { recursive: true });
		const markerPath = path.join(outsideMutex, 'preserve.txt');
		writeFileSync(markerPath, 'external data');
		let owner;
		const result = withRunStateUpdateMutex(projectPath, scope, () => {
			owner = readFileSync(path.join(mutexPath(projectPath, scope), 'owner.json'), 'utf8');
			writeFileSync(path.join(outsideMutex, 'owner.json'), owner);
			const statePath = path.join(projectPath, '.mustflow', 'state');
			renameSync(statePath, path.join(projectPath, '.mustflow', 'saved-state'));
			symlinkSync(outsidePath, statePath, process.platform === 'win32' ? 'junction' : 'dir');
			return 'completed';
		});
		assert.equal(result, 'completed');
		assert.equal(readFileSync(markerPath, 'utf8'), 'external data');
		assert.equal(readFileSync(path.join(outsideMutex, 'owner.json'), 'utf8'), owner);
	} finally {
		removeTempProject(projectPath);
		removeTempProject(outsidePath);
	}
});

const sleepBuffer = new Int32Array(new SharedArrayBuffer(4));

function sleep(milliseconds) {
	Atomics.wait(sleepBuffer, 0, 0, milliseconds);
}

function mutexPath(projectPath, scope) {
	return path.join(projectPath, '.mustflow', 'state', 'mutexes', scope);
}

test('run state mutex honors an expired wait budget when orphan metadata cannot be inspected', async (t) => {
	const { RUN_STATE_MUTEX_SCOPES, withRunStateUpdateMutex } = await importRunStateMutex();
	for (const code of ['EACCES', 'EIO', 'ENOENT']) {
		await t.test(code, () => {
			const projectPath = createTempProject('mustflow-mutex-stat-failure-');
			const scope = RUN_STATE_MUTEX_SCOPES.receipts;
			const directory = mutexPath(projectPath, scope);
			const originalMkdir = fs.mkdirSync;
			const originalStat = fs.statSync;
			let attempts = 0;
			let metadataFailures = 0;
			let invoked = false;
			let failure;
			try {
				mkdirSync(directory, { recursive: true });
				fs.mkdirSync = (target, ...args) => {
					if (target === directory && ++attempts > 3) {
						throw new Error('test_guard:mutex_retried_after_deadline');
					}
					return originalMkdir(target, ...args);
				};
				fs.statSync = (target, ...args) => {
					if (target === directory) {
						metadataFailures++;
						throw Object.assign(new Error('injected metadata failure'), { code });
					}
					return originalStat(target, ...args);
				};
				syncBuiltinESMExports();
				try {
					withRunStateUpdateMutex(projectPath, scope, () => { invoked = true; }, { waitMs: 0 });
				} catch (error) {
					failure = error;
				}
				t.diagnostic(JSON.stringify({ code, attempts, metadataFailures, callbackInvoked: invoked }));
				assert.equal(failure?.message, `run_state_mutex_busy:${scope}`);
				assert.equal(attempts, 1);
				assert.equal(metadataFailures, 1);
				assert.equal(invoked, false);
				assert.equal(existsSync(directory), true);
				assert.equal(existsSync(path.join(directory, 'owner.json')), false);
			} finally {
				fs.mkdirSync = originalMkdir;
				fs.statSync = originalStat;
				syncBuiltinESMExports();
				removeTempProject(projectPath);
			}
		});
	}
});

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

test('run state mutex lanes recover dead owners without polling through the wait budget', async (t) => {
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
		const originalWait = Atomics.wait;
		const wait = t.mock.method(Atomics, 'wait', (...args) => originalWait(...args));
		withRunStateUpdateMutex(
			projectPath,
			scope,
			() => {
				entered = true;
			},
			{ waitMs: 100 },
		);
		assert.equal(entered, true);
		assert.equal(wait.mock.callCount(), 0);
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
