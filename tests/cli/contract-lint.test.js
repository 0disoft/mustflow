import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

const projectRoot = path.resolve(fileURLToPath(new URL('../..', import.meta.url)));
const cliPath = path.join(projectRoot, 'dist', 'cli', 'index.js');

function createTempProject() {
	return mkdtempSync(path.join(tmpdir(), 'mustflow-contract-lint-'));
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

function commandsPath(projectPath) {
	return path.join(projectPath, '.mustflow', 'config', 'commands.toml');
}

test('contract-lint reports command contract warnings without failing', () => {
	const projectPath = createTempProject();

	try {
		initProject(projectPath);

		const result = runCli(projectPath, ['contract-lint', '--json']);
		const report = JSON.parse(result.stdout);

		assert.equal(result.status, 0, result.stderr || result.stdout);
		assert.equal(report.schema_version, '1');
		assert.equal(report.command, 'contract-lint');
		assert.equal(report.report.status, 'warning');
		assert.equal(report.report.summary.errors, 0);
		assert.ok(report.report.summary.unknown > 0);
		assert.ok(report.report.issues.some((issue) => issue.code === 'intent_unknown'));
	} finally {
		removeTempProject(projectPath);
	}
});

test('contract-lint fails malformed configured command intents', () => {
	const projectPath = createTempProject();

	try {
		initProject(projectPath);
		const current = readFileSync(commandsPath(projectPath), 'utf8');
		writeFileSync(
			commandsPath(projectPath),
			`${current}

[intents.bad_contract]
status = "configured"
description = "Malformed test intent."
`,
		);

		const result = runCli(projectPath, ['contract-lint', '--json']);
		const report = JSON.parse(result.stdout);

		assert.equal(result.status, 1);
		assert.equal(report.report.status, 'failed');
		assert.ok(report.report.summary.errors > 0);
		assert.ok(report.report.issues.some((issue) => issue.intent === 'bad_contract' && issue.severity === 'error'));
	} finally {
		removeTempProject(projectPath);
	}
});
