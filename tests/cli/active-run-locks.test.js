import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { test } from 'node:test';
import { pathToFileURL } from 'node:url';
import { createTempProject, projectRoot, removeTempProject } from './helpers/cli-harness.js';

async function importActiveRunLocks() {
	return import(pathToFileURL(path.join(projectRoot, 'dist', 'core', 'active-run-locks.js')).href);
}

async function importProcessIdentity() {
	return import(pathToFileURL(path.join(projectRoot, 'dist', 'core', 'process-identity.js')).href);
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

function writeMutexOwner(projectPath, owner) {
	const mutexPath = path.join(projectPath, '.mustflow', 'state', 'locks', 'mutex');
	mkdirSync(mutexPath, { recursive: true });
	writeFileSync(path.join(mutexPath, 'owner.json'), `${JSON.stringify(owner, null, 2)}\n`);
	return mutexPath;
}

function recordPath(projectPath, runId) {
	const hash = createHash('sha256').update(runId).digest('hex');
	return path.join(projectPath, '.mustflow', 'state', 'locks', 'active', `${hash}.json`);
}

test('active run locks recover stale mutexes before acquiring a write lock', async () => {
	const projectPath = createTempProject('mustflow-active-lock-');
	const { acquireActiveRunLock } = await importActiveRunLocks();
	const mutexPath = writeMutexOwner(projectPath, {
		pid: -1,
		started_at: '2000-01-01T00:00:00.000Z',
		token: 'stale-owner',
	});

	try {
		const result = acquireActiveRunLock(projectPath, createWriteContract(), 'writer');

		assert.equal(result.ok, true);
		assert.equal(existsSync(path.join(mutexPath, 'owner.json')), false);
		result.handle.release();
	} finally {
		removeTempProject(projectPath);
	}
});

test('active run locks do not delete a mutex while another recovery owns it', async () => {
	const projectPath = createTempProject('mustflow-active-lock-');
	const { acquireActiveRunLock } = await importActiveRunLocks();
	const mutexPath = writeMutexOwner(projectPath, {
		pid: -1,
		started_at: '2000-01-01T00:00:00.000Z',
		token: 'stale-owner',
	});
	const recoveryPath = path.join(path.dirname(mutexPath), 'mutex.recovery');
	mkdirSync(recoveryPath);

	try {
		assert.throws(
			() => acquireActiveRunLock(projectPath, createWriteContract(), 'writer'),
			/active_run_lock_mutex_busy/u,
		);
		assert.equal(existsSync(mutexPath), true);
		assert.equal(existsSync(recoveryPath), true);
		assert.equal(JSON.parse(readFileSync(path.join(mutexPath, 'owner.json'), 'utf8')).token, 'stale-owner');
	} finally {
		rmSync(recoveryPath, { recursive: true, force: true });
		removeTempProject(projectPath);
	}
});

test('run state mutex never steals from a live owner based on age alone', async () => {
	const projectPath = createTempProject('mustflow-live-old-mutex-');
	const { acquireActiveRunLock } = await importActiveRunLocks();
	const { readCurrentProcessStartToken } = await importProcessIdentity();
	const mutexPath = writeMutexOwner(projectPath, {
		lock_id: 'live-old-lock',
		owner_token: 'live-old-owner',
		pid: process.pid,
		process_start_token: readCurrentProcessStartToken(),
		started_at: '2000-01-01T00:00:00.000Z',
		heartbeat_at: '2000-01-01T00:00:00.000Z',
	});

	try {
		assert.throws(() => acquireActiveRunLock(projectPath, createWriteContract(), 'writer'), /active_run_lock_mutex_busy/u);
		assert.equal(existsSync(mutexPath), true);
	} finally {
		removeTempProject(projectPath);
	}
});

test('run state mutex recovers a reused live pid with a different start token', async () => {
	const projectPath = createTempProject('mustflow-reused-pid-mutex-');
	const { acquireActiveRunLock } = await importActiveRunLocks();
	writeMutexOwner(projectPath, {
		lock_id: 'reused-pid-lock',
		owner_token: 'reused-pid-owner',
		pid: process.pid,
		process_start_token: 'mismatched-process-start-token',
		started_at: new Date().toISOString(),
		heartbeat_at: new Date().toISOString(),
	});
	try {
		const result = acquireActiveRunLock(projectPath, createWriteContract(), 'writer');
		assert.equal(result.ok, true);
		result.handle.release();
	} finally {
		removeTempProject(projectPath);
	}
});

test('run state mutex release preserves a replaced owner record', async () => {
	const projectPath = createTempProject('mustflow-replaced-mutex-owner-');
	const { withRunStateUpdateMutex } = await importActiveRunLocks();
	const mutexPath = path.join(projectPath, '.mustflow', 'state', 'locks', 'mutex');
	const ownerPath = path.join(mutexPath, 'owner.json');

	try {
		withRunStateUpdateMutex(projectPath, () => {
			const owner = JSON.parse(readFileSync(ownerPath, 'utf8'));
			writeFileSync(ownerPath, `${JSON.stringify({ ...owner, owner_token: 'replacement-owner' }, null, 2)}\n`);
		});
		assert.equal(existsSync(mutexPath), true);
	} finally {
		removeTempProject(projectPath);
	}
});

test('active run locks ignore symlinked active record entries', async (t) => {
	const projectPath = createTempProject('mustflow-active-lock-');
	const outsideRecordPath = path.join(projectPath, 'outside-lock-record.json');
	const activeDirectory = path.join(projectPath, '.mustflow', 'state', 'locks', 'active');
	const { inspectActiveRunLocks } = await importActiveRunLocks();

	mkdirSync(activeDirectory, { recursive: true });
	writeFileSync(
		outsideRecordPath,
		`${JSON.stringify(
			{
				schema_version: '1',
				kind: 'active_run_lock',
				run_id: 'symlinked-record',
				intent: 'other_writer',
				pid: process.pid,
				started_at: new Date().toISOString(),
				root_hash: 'external',
				command_hash: null,
				effects: [
					{
						source: 'writes',
						access: 'write',
						mode: 'write',
						path: 'dist/**',
						lock: 'path:dist/**',
						concurrency: 'exclusive',
					},
				],
				writes: ['dist/**'],
			},
			null,
			2,
		)}\n`,
	);

	try {
		try {
			symlinkSync(outsideRecordPath, path.join(activeDirectory, 'symlinked.json'));
		} catch {
			t.skip('symlink creation is unavailable on this platform');
			return;
		}

		const inspection = inspectActiveRunLocks(projectPath, createWriteContract(), 'writer');

		assert.deepEqual(inspection.conflicts, []);
		assert.deepEqual(inspection.staleRecords, []);
	} finally {
		removeTempProject(projectPath);
	}
});

test('active run locks fail closed on malformed regular records before write acquisition', async () => {
	const projectPath = createTempProject('mustflow-active-lock-');
	const activeDirectory = path.join(projectPath, '.mustflow', 'state', 'locks', 'active');
	const { acquireActiveRunLock } = await importActiveRunLocks();

	mkdirSync(activeDirectory, { recursive: true });
	writeFileSync(path.join(activeDirectory, 'malformed.json'), '{not-json');

	try {
		assert.throws(
			() => acquireActiveRunLock(projectPath, createWriteContract(), 'writer'),
			/active_run_lock_record_unreadable:malformed\.json/u,
		);
		assert.equal(existsSync(path.join(activeDirectory, 'malformed.json')), true);
	} finally {
		removeTempProject(projectPath);
	}
});

test('active run locks detect overlapping path scopes with different derived lock names', async () => {
	const projectPath = createTempProject('mustflow-active-lock-scope-');
	const { acquireActiveRunLock } = await importActiveRunLocks();
	const contract = {
		defaults: {},
		resources: {},
		intents: {
			parent: { writes: ['dist/**'] },
			child: { writes: ['dist/file.js'] },
			sibling: { writes: ['other/**'] },
		},
	};

	try {
		const parent = acquireActiveRunLock(projectPath, contract, 'parent');
		assert.equal(parent.ok, true);
		const child = acquireActiveRunLock(projectPath, contract, 'child');
		assert.equal(child.ok, false);
		assert.equal(child.conflicts.length, 1);
		const sibling = acquireActiveRunLock(projectPath, contract, 'sibling');
		assert.equal(sibling.ok, true);
		sibling.handle.release();
		parent.handle.release();
	} finally {
		removeTempProject(projectPath);
	}
});

test('active run locks use unique UUID identities for concurrent shared readers', async () => {
	const projectPath = createTempProject('mustflow-active-lock-identity-');
	const { acquireActiveRunLock } = await importActiveRunLocks();
	const contract = {
		defaults: {},
		resources: {},
		intents: {
			reader: {
				effects: [{ type: 'read', mode: 'read', path: 'dist/**', concurrency: 'shared' }],
			},
		},
	};

	try {
		const first = acquireActiveRunLock(projectPath, contract, 'reader');
		const second = acquireActiveRunLock(projectPath, contract, 'reader');
		assert.equal(first.ok, true);
		assert.equal(second.ok, true);
		assert.match(first.handle.record.run_id, /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/u);
		assert.match(first.handle.record.owner_token, /^[0-9a-f-]{36}$/u);
		assert.ok(first.handle.record.process_start_token.length > 0);
		assert.notEqual(first.handle.record.run_id, second.handle.record.run_id);
		assert.notEqual(first.handle.record.owner_token, second.handle.record.owner_token);
		first.handle.release();
		assert.equal(existsSync(recordPath(projectPath, second.handle.record.run_id)), true);
		second.handle.release();
	} finally {
		removeTempProject(projectPath);
	}
});

test('active run locks classify a live reused pid by process start token mismatch', async () => {
	const projectPath = createTempProject('mustflow-active-lock-process-token-');
	const { acquireActiveRunLock, listActiveRunLocks } = await importActiveRunLocks();
	const result = acquireActiveRunLock(projectPath, createWriteContract(), 'writer');

	try {
		assert.equal(result.ok, true);
		const activePath = recordPath(projectPath, result.handle.record.run_id);
		const replacedRecord = { ...result.handle.record, process_start_token: 'mismatched-process-start-token' };
		writeFileSync(activePath, `${JSON.stringify(replacedRecord, null, 2)}\n`);

		const state = listActiveRunLocks(projectPath);
		assert.equal(state.activeRecords.length, 0);
		assert.equal(state.staleRecords[0]?.reason, 'process_start_token_mismatch');
	} finally {
		result.ok && result.handle.release();
		removeTempProject(projectPath);
	}
});

test('active run lock release preserves a record whose owner token was replaced', async () => {
	const projectPath = createTempProject('mustflow-active-lock-owner-token-');
	const { acquireActiveRunLock } = await importActiveRunLocks();
	const result = acquireActiveRunLock(projectPath, createWriteContract(), 'writer');

	try {
		assert.equal(result.ok, true);
		const activePath = recordPath(projectPath, result.handle.record.run_id);
		writeFileSync(activePath, `${JSON.stringify({ ...result.handle.record, owner_token: 'replacement-owner' }, null, 2)}\n`);
		result.handle.release();
		assert.equal(existsSync(activePath), true);
	} finally {
		removeTempProject(projectPath);
	}
});
