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
	return mkdtempSync(path.join(tmpdir(), 'mustflow-explain-authority-'));
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

test('explains managed AGENTS authority as json', () => {
	const projectPath = createTempProject();

	try {
		initProject(projectPath);

		const result = runCli(projectPath, ['explain', 'authority', 'AGENTS.md', '--json']);
		const report = JSON.parse(result.stdout);

		assert.equal(result.status, 0, result.stderr || result.stdout);
		assert.equal(report.schema_version, '1');
		assert.equal(report.command, 'explain');
		assert.equal(report.topic, 'authority');
		assert.equal(report.decision.kind, 'recognized');
		assert.equal(report.decision.inputPath, 'AGENTS.md');
		assert.equal(report.decision.countsAsMustflowVerification, false);
		assert.deepEqual(report.decision.expectation, {
			docId: 'agents.root',
			authority: 'binding',
			lifecycle: 'user-editable',
		});
		assert.equal(report.decision.boundary.role, 'binding repository instruction entry point');
		assert.ok(report.decision.boundary.canDefine.includes('repository-local work rules'));
		assert.ok(report.decision.boundary.cannotDefine.includes('command execution permission outside commands.toml'));
	} finally {
		removeTempProject(projectPath);
	}
});

test('explains managed skill index authority as text', () => {
	const projectPath = createTempProject();

	try {
		initProject(projectPath);

		const result = runCli(projectPath, ['explain', 'authority', '.mustflow/skills/INDEX.md']);

		assert.equal(result.status, 0, result.stderr || result.stdout);
		assert.match(result.stdout, /expected skills\.index with router authority/);
		assert.match(result.stdout, /mustflow_doc: skills\.index/);
		assert.match(result.stdout, /Authority boundary/);
		assert.match(result.stdout, /routing index/);
		assert.match(result.stdout, /Cannot define/);
		assert.match(result.stdout, /procedure steps/);
		assert.match(result.stdout, /Counts as mustflow verification: no/);
	} finally {
		removeTempProject(projectPath);
	}
});

test('explains context index and skill documents as bounded authority lanes', () => {
	const projectPath = createTempProject();

	try {
		initProject(projectPath);

		const contextResult = runCli(projectPath, ['explain', 'authority', '.mustflow/context/INDEX.md', '--json']);
		const contextReport = JSON.parse(contextResult.stdout);

		assert.equal(contextResult.status, 0, contextResult.stderr || contextResult.stdout);
		assert.equal(contextReport.decision.kind, 'recognized');
		assert.deepEqual(contextReport.decision.expectation, {
			docId: 'context.index',
			authority: 'router',
			lifecycle: 'mustflow-owned',
		});
		assert.equal(contextReport.decision.boundary.role, 'routing index');
		assert.ok(contextReport.decision.boundary.canDefine.includes('which context or skill document to read'));
		assert.ok(contextReport.decision.boundary.cannotDefine.includes('procedure steps'));
		assert.ok(contextReport.decision.boundary.cannotDefine.includes('command permission'));

		const skillResult = runCli(projectPath, ['explain', 'authority', '.mustflow/skills/code-review/SKILL.md', '--json']);
		const skillReport = JSON.parse(skillResult.stdout);

		assert.equal(skillResult.status, 0, skillResult.stderr || skillResult.stdout);
		assert.equal(skillReport.decision.kind, 'recognized');
		assert.deepEqual(skillReport.decision.expectation, {
			docId: 'skill.code-review',
			authority: 'procedure',
			lifecycle: 'mustflow-owned',
		});
		assert.equal(skillReport.decision.boundary.role, 'repeatable task procedure');
		assert.ok(skillReport.decision.boundary.canDefine.includes('task trigger'));
		assert.ok(skillReport.decision.boundary.cannotDefine.includes('command execution permission'));
		assert.ok(skillReport.decision.boundary.cannotDefine.includes('repository-wide binding rules'));
	} finally {
		removeTempProject(projectPath);
	}
});

test('reports unrecognized authority paths without granting document authority', () => {
	const projectPath = createTempProject();

	try {
		initProject(projectPath);

		const result = runCli(projectPath, ['explain', 'authority', 'README.md', '--json']);
		const report = JSON.parse(result.stdout);

		assert.equal(result.status, 0, result.stderr || result.stdout);
		assert.equal(report.decision.kind, 'unrecognized');
		assert.equal(report.decision.inputPath, 'README.md');
		assert.equal(report.decision.expectation, null);
		assert.equal(report.decision.boundary.role, 'unclassified by mustflow managed Markdown authority');
		assert.ok(report.decision.boundary.cannotDefine.includes('mustflow document authority'));
		assert.equal(report.decision.countsAsMustflowVerification, false);
	} finally {
		removeTempProject(projectPath);
	}
});
