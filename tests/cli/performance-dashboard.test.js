import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';
import path from 'node:path';
import { test } from 'node:test';
import { DashboardSnapshotCache } from '../../dist/cli/lib/dashboard-snapshot-cache.js';
import { readGitChangedFiles, readGitChangedFilesAsync } from '../../dist/cli/lib/git-changes.js';
import { getAgentContext, getAgentStatusContext } from '../../dist/cli/lib/agent-context.js';
import { inspectManifestLock } from '../../dist/cli/lib/manifest-lock.js';
import { createMinimalWorkflowProject, removeTempProject } from './index-support.js';

function deferred() {
	let resolve, reject;
	const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
	return { promise, resolve, reject };
}

test('twenty snapshot readers share one refresh and retry after rejection', async () => {
	const cache = new DashboardSnapshotCache(750);
	const pending = deferred();
	let calls = 0;
	const reads = Array.from({ length: 20 }, () => cache.read('root', 'one', () => { calls += 1; return pending.promise; }));
	await Promise.resolve();
	assert.equal(calls, 1);
	pending.resolve('snapshot');
	assert.deepEqual(await Promise.all(reads), Array(20).fill('snapshot'));
	const failure = new Error('failed refresh');
	await assert.rejects(cache.read('root', 'two', async () => { throw failure; }), (error) => error === failure);
	assert.equal(await cache.read('root', 'two', async () => 'retry'), 'retry');
});

test('late snapshots never overwrite new signatures and expiry starts on completion', async () => {
	let now = 0;
	const cache = new DashboardSnapshotCache(750, () => now);
	const pending = deferred();
	const old = cache.read('root', 'old', () => pending.promise);
	assert.equal(await cache.read('root', 'new', async () => 'new'), 'new');
	pending.resolve('old');
	assert.equal(await old, 'old');
	assert.equal(await cache.read('root', 'new', async () => 'unexpected'), 'new');
	now = 750;
	assert.equal(await cache.read('root', 'new', async () => 'expired'), 'expired');
	const running = deferred();
	const read = cache.read('slow', 'one', () => running.promise);
	now = 10_000;
	assert.equal(cache.read('slow', 'one', async () => 'duplicate'), read);
	running.resolve('done');
	await read;
	now = 10_749;
	assert.equal(await cache.read('slow', 'one', async () => 'duplicate'), 'done');
	now = 10_750;
	assert.equal(await cache.read('slow', 'one', async () => 'next'), 'next');
});

test('zero TTL shares only pending work and separates repository keys', async () => {
	const cache = new DashboardSnapshotCache(0);
	const pending = deferred();
	const first = cache.read('one', '', () => pending.promise);
	assert.equal(cache.read('one', '', async () => 'duplicate'), first);
	assert.equal(await cache.read('two', '', async () => 'other root'), 'other root');
	pending.resolve('done');
	await first;
	assert.equal(await cache.read('one', '', async () => 'fresh'), 'fresh');
});

test('async Git status keeps sync parsing and lightweight context keeps status metadata', async () => {
	const root = createMinimalWorkflowProject('mustflow-dashboard-read-');
	try {
		assert.equal((await readGitChangedFilesAsync(root)).ok, false);
		assert.equal(spawnSync('git', ['init', '--quiet'], { cwd: root, windowsHide: true }).status, 0);
		writeFileSync(path.join(root, '한글 file.txt'), 'changed\n');
		assert.deepEqual(await readGitChangedFilesAsync(root), readGitChangedFiles(root));
		const complete = getAgentContext(root);
		assert.deepEqual(getAgentStatusContext(root, inspectManifestLock(root)), Object.fromEntries(['installed', 'manifest_lock', 'template', 'latest_run'].map((key) => [key, complete[key]])));
	} finally { removeTempProject(root); }
});
