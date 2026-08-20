import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { appendFileSync, writeFileSync } from 'node:fs';
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
