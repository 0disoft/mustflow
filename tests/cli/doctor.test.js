import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

const projectRoot = path.resolve(fileURLToPath(new URL('../..', import.meta.url)));
const cliPath = path.join(projectRoot, 'dist', 'cli', 'index.js');

function createTempProject() {
	return mkdtempSync(path.join(tmpdir(), 'mustflow-doctor-'));
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

function initProject(projectPath) {
	const result = runCli(projectPath, ['init', '--yes']);
	assert.equal(result.status, 0, result.stderr || result.stdout);
}

test('prints a read-only doctor summary as json', () => {
	const projectPath = createTempProject();

	try {
		initProject(projectPath);
		const result = runCli(projectPath, ['doctor', '--json']);
		const output = JSON.parse(result.stdout);

		assert.equal(result.status, 0, result.stderr || result.stdout);
		assert.equal(result.stderr, '');
		assert.equal(output.schema_version, '1');
		assert.equal(output.command, 'doctor');
		assert.equal(output.ok, true);
		assert.equal(output.strict, false);
		assert.equal(path.resolve(output.mustflow_root), path.resolve(projectPath));
		assert.equal(output.installed, true);
		assert.equal(output.check.ok, true);
		assert.equal(output.check.issue_count, 0);
		assert.equal(output.context.manifest_lock, 'present');
		assert.equal(output.context.command_contract_exists, true);
		assert.ok(output.context.runnable_intents.includes('mustflow_check'));
		assert.deepEqual(output.context.missing_read_order, []);
		assert.ok(output.diagnostics.some((item) => item.id === 'install' && item.status === 'ok'));
		assert.ok(output.diagnostics.some((item) => item.id === 'validation' && item.status === 'ok'));
		assert.ok(output.diagnostics.some((item) => item.id === 'commands' && item.status === 'ok'));
		assert.ok(output.diagnostics.some((item) => item.id === 'read_order' && item.status === 'ok'));
		assert.ok(output.next_steps.includes('mf help workflow'));
		assert.ok(output.next_steps.includes('mf help commands'));
	} finally {
		removeTempProject(projectPath);
	}
});

test('uses the nearest mustflow root when doctor runs from a nested directory', () => {
	const projectPath = createTempProject();

	try {
		initProject(projectPath);
		const nestedPath = path.join(projectPath, 'src', 'feature');
		mkdirSync(nestedPath, { recursive: true });

		const result = runCli(nestedPath, ['doctor', '--json']);
		const output = JSON.parse(result.stdout);

		assert.equal(result.status, 0, result.stderr || result.stdout);
		assert.equal(path.resolve(output.mustflow_root), path.resolve(projectPath));
		assert.equal(output.ok, true);
	} finally {
		removeTempProject(projectPath);
	}
});

test('strict doctor reports validation issues without writing files', () => {
	const projectPath = createTempProject();

	try {
		initProject(projectPath);
		const agentsPath = path.join(projectPath, 'AGENTS.md');
		const changedContent = '# Local rules\n';
		writeFileSync(agentsPath, changedContent);

		const result = runCli(projectPath, ['doctor', '--strict', '--json']);
		const output = JSON.parse(result.stdout);

		assert.equal(result.status, 1);
		assert.equal(result.stderr, '');
		assert.equal(output.ok, false);
		assert.equal(output.strict, true);
		assert.equal(output.check.ok, false);
		assert.match(output.check.issues.join('\n'), /Lock hash mismatch: AGENTS\.md/);
		assert.ok(output.next_steps.includes('mf check --strict'));
		assert.equal(readFileSync(agentsPath, 'utf8'), changedContent);
	} finally {
		removeTempProject(projectPath);
	}
});

test('prints human-readable doctor output', () => {
	const projectPath = createTempProject();

	try {
		initProject(projectPath);
		const result = runCli(projectPath, ['doctor']);

		assert.equal(result.status, 0, result.stderr || result.stdout);
		assert.match(result.stdout, /mustflow doctor/);
		assert.match(result.stdout, /mustflow root:/);
		assert.match(result.stdout, /Installed: yes/);
		assert.match(result.stdout, /Check: passed/);
		assert.match(result.stdout, /Health:/);
		assert.match(result.stdout, /\[ok\] Install: installed/);
		assert.match(result.stdout, /\[ok\] Command contract: present, \d+ runnable intents?/);
		assert.match(result.stdout, /Suggested commands:/);
		assert.match(result.stdout, /No files were written/);
	} finally {
		removeTempProject(projectPath);
	}
});
