import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

const projectRoot = path.resolve(fileURLToPath(new URL('../..', import.meta.url)));
const cliPath = path.join(projectRoot, 'dist', 'cli', 'index.js');

function createTempProject() {
	return mkdtempSync(path.join(tmpdir(), 'mustflow-status-'));
}

function removeTempProject(projectPath) {
	rmSync(projectPath, { recursive: true, force: true });
}

function runCli(cwd, args) {
	return spawnSync(process.execPath, [cliPath, ...args], {
		cwd,
		encoding: 'utf8',
	});
}

test('prints status for a freshly initialized mustflow project', () => {
	const projectPath = createTempProject();

	try {
		assert.equal(runCli(projectPath, ['init', '--yes']).status, 0);

		const result = runCli(projectPath, ['status']);

		assert.equal(result.status, 0);
		assert.match(result.stdout, /mustflow status/);
		assert.match(result.stdout, /Installed: yes/);
		assert.match(result.stdout, /Manifest lock: present/);
		assert.match(result.stdout, /Tracked files: \d+/);
		assert.match(result.stdout, /Changed files: 0/);
		assert.match(result.stdout, /Missing files: 0/);
	} finally {
		removeTempProject(projectPath);
	}
});

test('reports changed files without failing the status command', () => {
	const projectPath = createTempProject();

	try {
		assert.equal(runCli(projectPath, ['init', '--yes']).status, 0);
		writeFileSync(path.join(projectPath, 'AGENTS.md'), '# Changed rules\n');

		const result = runCli(projectPath, ['status']);

		assert.equal(result.status, 0);
		assert.match(result.stdout, /Changed files: 1/);
		assert.match(result.stdout, /- AGENTS\.md/);
	} finally {
		removeTempProject(projectPath);
	}
});

test('prints machine-readable status as json', () => {
	const projectPath = createTempProject();

	try {
		assert.equal(runCli(projectPath, ['init', '--yes']).status, 0);
		writeFileSync(path.join(projectPath, 'AGENTS.md'), '# Changed rules\n');

		const result = runCli(projectPath, ['status', '--json']);
		const status = JSON.parse(result.stdout);

		assert.equal(result.status, 0);
		assert.equal(status.installed, true);
		assert.equal(status.manifestLock, 'present');
		assert.equal(typeof status.trackedFiles, 'number');
		assert.deepEqual(status.changedFiles, ['AGENTS.md']);
		assert.deepEqual(status.missingFiles, []);
		assert.match(status.issues[0], /Lock hash mismatch: AGENTS\.md/);
		assert.equal(status.template.id, 'default');
	} finally {
		removeTempProject(projectPath);
	}
});
