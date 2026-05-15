import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

const projectRoot = path.resolve(fileURLToPath(new URL('../..', import.meta.url)));
const cliPath = path.join(projectRoot, 'dist', 'cli', 'index.js');

function createTempProject() {
	return mkdtempSync(path.join(tmpdir(), 'mustflow-explain-retention-asset-'));
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

test('explains web asset optimization without guessing missing converters', () => {
	const projectPath = createTempProject();

	try {
		initProject(projectPath);

		const result = runCli(projectPath, ['explain', 'asset-optimization', '--json']);
		const report = JSON.parse(result.stdout);

		assert.equal(result.status, 0, result.stderr || result.stdout);
		assert.equal(report.topic, 'asset-optimization');
		assert.equal(report.decision.kind, 'blocked');
		assert.equal(report.decision.inputCommand, 'asset_optimize');
		assert.equal(report.decision.countsAsMustflowVerification, false);
		assert.equal(report.decision.intent.status, 'unknown');
		assert.ok(report.decision.sourceFiles.includes('.mustflow/skills/web-asset-optimization/SKILL.md'));
		assert.match(report.decision.effectiveAction, /do not guess external converters/);
	} finally {
		removeTempProject(projectPath);
	}
});

test('explains retention policy as json', () => {
	const projectPath = createTempProject();

	try {
		initProject(projectPath);

		const result = runCli(projectPath, ['explain', 'retention', '--json']);
		const report = JSON.parse(result.stdout);

		assert.equal(result.status, 0, result.stderr || result.stdout);
		assert.equal(report.topic, 'retention');
		assert.equal(report.decision.kind, 'retention');
		assert.equal(report.decision.countsAsMustflowVerification, false);
		assert.equal(report.decision.retention.enabled, true);
		assert.equal(report.decision.retention.rawEvents.store, 'none');
		assert.equal(report.decision.retention.runReceipts.store, 'repo_local_ignored');
		assert.equal(report.decision.retention.runReceipts.stdoutTailBytes, 65536);
		assert.equal(report.decision.retention.repoMap.failIfLarger, true);
	} finally {
		removeTempProject(projectPath);
	}
});

test('explains retention policy as text', () => {
	const projectPath = createTempProject();

	try {
		initProject(projectPath);

		const result = runCli(projectPath, ['explain', 'retention']);

		assert.equal(result.status, 0, result.stderr || result.stdout);
		assert.match(result.stdout, /retention policy is enabled/);
		assert.match(result.stdout, /Retention policy/);
		assert.match(result.stdout, /run_receipts\.store: repo_local_ignored/);
		assert.match(result.stdout, /Counts as mustflow verification: no/);
	} finally {
		removeTempProject(projectPath);
	}
});

test('fails explain retention when a target argument is provided', () => {
	const projectPath = createTempProject();

	try {
		initProject(projectPath);

		const result = runCli(projectPath, ['explain', 'retention', 'extra']);

		assert.equal(result.status, 1);
		assert.match(result.stderr, /Error: Unexpected argument: extra/);
		assert.match(result.stdout, /Usage:/);
	} finally {
		removeTempProject(projectPath);
	}
});

test('fails explain asset optimization when a target argument is provided', () => {
	const projectPath = createTempProject();

	try {
		initProject(projectPath);

		const result = runCli(projectPath, ['explain', 'asset-optimization', 'extra']);

		assert.equal(result.status, 1);
		assert.match(result.stderr, /Error: Unexpected argument: extra/);
		assert.match(result.stdout, /Usage:/);
	} finally {
		removeTempProject(projectPath);
	}
});
