import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import { appendFileSync, unlinkSync, writeFileSync } from 'node:fs';
import { syncBuiltinESMExports } from 'node:module';
import path from 'node:path';
import { test } from 'node:test';
import { pathToFileURL } from 'node:url';
import { createTempProject, projectRoot, removeTempProject } from './helpers/cli-harness.js';

async function importRepositorySnapshot() {
	return import(pathToFileURL(path.join(projectRoot, 'dist', 'core', 'repository-snapshot.js')).href);
}

function runGit(projectPath, args) {
	const result = spawnSync('git', ['-C', projectPath, ...args], {
		encoding: 'utf8',
		stdio: ['ignore', 'pipe', 'pipe'],
	});
	assert.equal(result.status, 0, result.stderr || result.stdout);
}

function createRepository() {
	const projectPath = createTempProject('mustflow-repository-snapshot-');
	runGit(projectPath, ['init', '--quiet']);
	runGit(projectPath, ['config', 'user.email', 'snapshot-test@example.com']);
	runGit(projectPath, ['config', 'user.name', 'Repository Snapshot Test']);
	writeFileSync(path.join(projectPath, '.gitignore'), '*.log\nnode_modules/\n');
	writeFileSync(path.join(projectPath, 'tracked.txt'), 'base\n');
	runGit(projectPath, ['add', '.gitignore', 'tracked.txt']);
	runGit(projectPath, ['commit', '--quiet', '-m', 'fixture']);
	return projectPath;
}

test('repository snapshot captures dirty and ignored files with one Git process', async () => {
	const projectPath = createRepository();
	const { captureRepositorySnapshot } = await importRepositorySnapshot();

	try {
		writeFileSync(path.join(projectPath, 'tracked.txt'), 'changed\n');
		writeFileSync(path.join(projectPath, 'ignored.log'), 'ignored\n');
		const snapshot = captureRepositorySnapshot(projectPath, { env: process.env });

		assert.equal(snapshot.status, 'checked');
		assert.equal(snapshot.source, 'git_status');
		assert.equal(snapshot.metrics.git_process_count, 1);
		assert.equal(snapshot.metrics.inspected_path_count, 2);
		assert.equal(snapshot.metrics.hashed_file_count, 2);
		assert.equal(snapshot.metrics.reused_file_hash_count, 0);
		assert.match(snapshot.entries.get('tracked.txt') ?? '', /^git: M:file:/u);
		assert.match(snapshot.entries.get('ignored.log') ?? '', /^git:!!:file:/u);
	} finally {
		removeTempProject(projectPath);
	}
});

test('repository snapshot reuses unchanged hashes from the previous snapshot', async () => {
	const projectPath = createRepository();
	const { captureRepositorySnapshot } = await importRepositorySnapshot();

	try {
		writeFileSync(path.join(projectPath, 'tracked.txt'), 'changed\n');
		writeFileSync(path.join(projectPath, 'ignored.log'), 'ignored\n');
		const first = captureRepositorySnapshot(projectPath, { env: process.env });
		const second = captureRepositorySnapshot(projectPath, { env: process.env, previous: first });

		assert.deepEqual([...second.entries], [...first.entries]);
		assert.equal(second.metrics.git_process_count, 1);
		assert.equal(second.metrics.hashed_file_count, 0);
		assert.equal(second.metrics.reused_file_hash_count, 2);

		appendFileSync(path.join(projectPath, 'tracked.txt'), 'next\n');
		const third = captureRepositorySnapshot(projectPath, { env: process.env, previous: second });

		assert.equal(third.metrics.git_process_count, 1);
		assert.equal(third.metrics.hashed_file_count, 1);
		assert.equal(third.metrics.reused_file_hash_count, 1);
		assert.notEqual(third.entries.get('tracked.txt'), second.entries.get('tracked.txt'));
	} finally {
		removeTempProject(projectPath);
	}
});

test('write drift never reports complete coverage when a changed file cannot be read', async (t) => {
	const { captureRepositorySnapshot } = await importRepositorySnapshot();
	const { finishRunWriteTracking } = await import(
		pathToFileURL(path.join(projectRoot, 'dist', 'core', 'run-write-drift.js')).href
	);
	for (const code of ['EACCES', 'EPERM', 'EIO']) {
		await t.test(code, () => {
			const projectPath = createRepository();
			const targetPath = path.join(projectPath, 'tracked.txt');
			const originalRead = fs.readFileSync;
			try {
				writeFileSync(targetPath, 'before command\n');
				fs.readFileSync = (file, ...args) => {
					if (file === targetPath) throw Object.assign(new Error('injected file read failure'), { code });
					return originalRead(file, ...args);
				};
				syncBuiltinESMExports();
				const before = captureRepositorySnapshot(projectPath, { env: process.env });
				writeFileSync(targetPath, 'after command\n');
				const receipt = finishRunWriteTracking({ projectRoot: projectPath, env: process.env,
					declaredPaths: [], before });
				t.diagnostic(JSON.stringify({ code, snapshotStatus: before.status, coverageComplete: receipt.coverage_complete,
					observedCount: receipt.observed_count, reason: receipt.reason }));
				assert.equal(before.status, 'partial');
				assert.equal(before.reason, 'snapshot_path_unreadable');
				assert.equal(before.source, 'git_status');
				assert.equal(before.metrics.inspected_path_count, 1);
				assert.match(before.entries.get('tracked.txt'), /:unreadable$/u);
				assert.equal(receipt.status, 'partial');
				assert.equal(receipt.coverage_complete, false);
				assert.equal(receipt.reason, 'snapshot_path_unreadable');
			} finally {
				fs.readFileSync = originalRead;
				syncBuiltinESMExports();
				removeTempProject(projectPath);
			}
		});
	}
});

test('repository snapshot still treats a deleted tracked file as inspected missing state', async () => {
	const projectPath = createRepository();
	const { captureRepositorySnapshot } = await importRepositorySnapshot();
	try {
		unlinkSync(path.join(projectPath, 'tracked.txt'));
		const snapshot = captureRepositorySnapshot(projectPath, { env: process.env });
		assert.equal(snapshot.status, 'checked');
		assert.equal(snapshot.reason, null);
		assert.match(snapshot.entries.get('tracked.txt'), /:missing$/u);
	} finally { removeTempProject(projectPath); }
});

test('repository snapshot propagates rename-source inspection failures', async () => {
	const projectPath = createRepository();
	const { captureRepositorySnapshot } = await importRepositorySnapshot();
	const originalStat = fs.lstatSync;
	try {
		runGit(projectPath, ['mv', 'tracked.txt', 'renamed.txt']);
		const inspected = captureRepositorySnapshot(projectPath, { env: process.env });
		assert.equal(inspected.status, 'checked');
		assert.match(inspected.entries.get('tracked.txt'), /:missing$/u);
		assert.equal(inspected.metrics.inspected_path_count, 2);
		fs.lstatSync = (file, ...args) => {
			if (file === path.join(projectPath, 'tracked.txt')) {
				throw Object.assign(new Error('injected rename-source inspection failure'), { code: 'EACCES' });
			}
			return originalStat(file, ...args);
		};
		syncBuiltinESMExports();
		const failed = captureRepositorySnapshot(projectPath, { env: process.env });
		assert.equal(failed.status, 'partial');
		assert.equal(failed.reason, 'snapshot_path_unreadable');
		assert.match(failed.entries.get('renamed.txt'), /:file:/u);
		assert.match(failed.entries.get('tracked.txt'), /:unreadable$/u);
	} finally {
		fs.lstatSync = originalStat;
		syncBuiltinESMExports();
		removeTempProject(projectPath);
	}
});
