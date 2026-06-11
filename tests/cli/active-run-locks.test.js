import assert from 'node:assert/strict';
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
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
	const recoveryPath = path.join(mutexPath, 'recovery');
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
