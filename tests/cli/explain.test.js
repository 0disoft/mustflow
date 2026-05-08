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
	return mkdtempSync(path.join(tmpdir(), 'mustflow-explain-'));
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
		assert.match(result.stdout, /Counts as mustflow verification: no/);
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
		assert.equal(report.decision.countsAsMustflowVerification, false);
	} finally {
		removeTempProject(projectPath);
	}
});

test('explains configured agent-runnable command intents as json', () => {
	const projectPath = createTempProject();

	try {
		initProject(projectPath);

		const result = runCli(projectPath, ['explain', 'command', 'mustflow_check', '--json']);
		const report = JSON.parse(result.stdout);

		assert.equal(result.status, 0, result.stderr || result.stdout);
		assert.equal(report.topic, 'command');
		assert.equal(report.decision.kind, 'allowed');
		assert.equal(report.decision.inputCommand, 'mustflow_check');
		assert.equal(report.decision.countsAsMustflowVerification, true);
		assert.equal(report.decision.intent.status, 'configured');
		assert.equal(report.decision.intent.lifecycle, 'oneshot');
		assert.equal(report.decision.intent.runPolicy, 'agent_allowed');
		assert.equal(report.decision.intent.mode, 'argv');
	} finally {
		removeTempProject(projectPath);
	}
});

test('explains blocked command intents without allowing guessed execution', () => {
	const projectPath = createTempProject();

	try {
		initProject(projectPath);

		const result = runCli(projectPath, ['explain', 'command', 'lint']);
		assert.equal(result.status, 0, result.stderr || result.stdout);
		assert.match(result.stdout, /command intent "lint" is not agent-runnable/);
		assert.match(result.stdout, /status is unknown, not configured/);
		assert.match(result.stdout, /Counts as mustflow verification: no/);
	} finally {
		removeTempProject(projectPath);
	}
});

test('explains undeclared command intents as unknown', () => {
	const projectPath = createTempProject();

	try {
		initProject(projectPath);

		const result = runCli(projectPath, ['explain', 'command', 'missing_intent', '--json']);
		const report = JSON.parse(result.stdout);

		assert.equal(result.status, 0, result.stderr || result.stdout);
		assert.equal(report.decision.kind, 'unknown');
		assert.equal(report.decision.intent, null);
		assert.equal(report.decision.countsAsMustflowVerification, false);
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

test('explains skill route alignment as json', () => {
	const projectPath = createTempProject();

	try {
		initProject(projectPath);

		const result = runCli(projectPath, ['explain', 'skills', '--json']);
		const report = JSON.parse(result.stdout);

		assert.equal(result.status, 0, result.stderr || result.stdout);
		assert.equal(report.topic, 'skills');
		assert.equal(report.decision.kind, 'skill_routes');
		assert.equal(report.decision.countsAsMustflowVerification, false);
		assert.equal(report.decision.alignment.status, 'ok');
		assert.equal(report.decision.alignment.issueCount, 0);
		assert.deepEqual(report.decision.alignment.issues, []);
		assert.equal(report.decision.alignment.action, null);
	} finally {
		removeTempProject(projectPath);
	}
});

test('explains skill route alignment as text', () => {
	const projectPath = createTempProject();

	try {
		initProject(projectPath);

		const result = runCli(projectPath, ['explain', 'skills']);

		assert.equal(result.status, 0, result.stderr || result.stdout);
		assert.match(result.stdout, /skill index and skill bodies are aligned/);
		assert.match(result.stdout, /Skill routes/);
		assert.match(result.stdout, /issue_count: 0/);
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

test('fails explain skills when a target argument is provided', () => {
	const projectPath = createTempProject();

	try {
		initProject(projectPath);

		const result = runCli(projectPath, ['explain', 'skills', 'extra']);

		assert.equal(result.status, 1);
		assert.match(result.stderr, /Error: Unexpected argument: extra/);
		assert.match(result.stdout, /Usage:/);
	} finally {
		removeTempProject(projectPath);
	}
});

test('fails explain command when the command intent name is missing', () => {
	const projectPath = createTempProject();

	try {
		initProject(projectPath);

		const result = runCli(projectPath, ['explain', 'command']);

		assert.equal(result.status, 1);
		assert.match(result.stderr, /Error: Missing command intent/);
		assert.match(result.stdout, /Usage:/);
	} finally {
		removeTempProject(projectPath);
	}
});
