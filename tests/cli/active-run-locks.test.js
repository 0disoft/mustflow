import assert from 'node:assert/strict';
import { existsSync, mkdirSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { test } from 'node:test';
import { pathToFileURL } from 'node:url';
import { createTempProject, projectRoot, removeTempProject } from './helpers/cli-harness.js';

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

function writeMutexOwner(projectPath, owner) {
	const mutexPath = path.join(projectPath, '.mustflow', 'state', 'locks', 'mutex');
	mkdirSync(mutexPath, { recursive: true });
	writeFileSync(path.join(mutexPath, 'owner.json'), `${JSON.stringify(owner, null, 2)}\n`);
	return mutexPath;
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
