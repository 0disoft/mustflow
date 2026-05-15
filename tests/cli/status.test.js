import assert from 'node:assert/strict';
import { writeFileSync } from 'node:fs';
import path from 'node:path';
import { after, before, test } from 'node:test';
import { runStatus } from '../../dist/cli/commands/status.js';
import {
	cloneProjectFixture,
	createTempProject,
	initProject,
	removeTempProject,
	runCliCommand,
} from './helpers/cli-harness.js';

let initializedProjectFixture;

before(() => {
	initializedProjectFixture = createTempProject('mustflow-status-fixture-');
	initProject(initializedProjectFixture);
});

after(() => {
	if (initializedProjectFixture) {
		removeTempProject(initializedProjectFixture);
	}
});

function createStatusProject() {
	return cloneProjectFixture(initializedProjectFixture, 'mustflow-status-');
}

function runCli(cwd, args) {
	return runCliCommand(cwd, args, runStatus);
}

test('prints status for a freshly initialized mustflow project', async () => {
	const projectPath = createStatusProject();

	try {
		const result = await runCli(projectPath, ['status']);

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

test('reports changed files without failing the status command', async () => {
	const projectPath = createStatusProject();

	try {
		writeFileSync(path.join(projectPath, 'AGENTS.md'), '# Changed rules\n');

		const result = await runCli(projectPath, ['status']);

		assert.equal(result.status, 0);
		assert.match(result.stdout, /Changed files: 1/);
		assert.match(result.stdout, /- AGENTS\.md/);
	} finally {
		removeTempProject(projectPath);
	}
});

test('prints machine-readable status as json', async () => {
	const projectPath = createStatusProject();

	try {
		writeFileSync(path.join(projectPath, 'AGENTS.md'), '# Changed rules\n');

		const result = await runCli(projectPath, ['status', '--json']);
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
