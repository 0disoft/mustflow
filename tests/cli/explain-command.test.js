import assert from 'node:assert/strict';
import { appendFileSync } from 'node:fs';
import path from 'node:path';
import { test } from 'node:test';
import { createTempProject, initProject, removeTempProject, runCli } from './helpers/cli-harness.js';

function appendCommandGraphFixture(projectPath) {
	appendFileSync(
		path.join(projectPath, '.mustflow', 'config', 'commands.toml'),
		`
[resources.graph_artifact]
type = "path"
paths = ["graph-output/**"]
concurrency = "exclusive_writer"
description = "Graph view test output."

[intents.graph_writer_a]
status = "configured"
lifecycle = "oneshot"
run_policy = "agent_allowed"
description = "Graph writer A."
argv = ["node", "-e", ""]
cwd = "."
timeout_seconds = 10
stdin = "closed"
success_exit_codes = [0]
writes = ["graph-output/"]
effects = [
  { type = "write", mode = "delete_recreate", path = "graph-output/**", lock = "graph_artifact", concurrency = "exclusive" },
]
network = false
destructive = false
required_after = ["graph_view_fixture"]

[intents.graph_writer_b]
status = "configured"
lifecycle = "oneshot"
run_policy = "agent_allowed"
description = "Graph writer B."
argv = ["node", "-e", ""]
cwd = "."
timeout_seconds = 10
stdin = "closed"
success_exit_codes = [0]
writes = ["graph-output/"]
effects = [
  { type = "write", mode = "delete_recreate", path = "graph-output/**", lock = "graph_artifact", concurrency = "exclusive" },
]
network = false
destructive = false
required_after = ["graph_view_fixture"]
`,
	);
}

test('explains configured agent-runnable command intents as json', () => {
	const projectPath = createTempProject('mustflow-explain-command-');

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
		assert.equal(report.decision.intent.cwd, '.');
		assert.deepEqual(report.decision.intent.writes, []);
		assert.equal(report.decision.intent.network, false);
		assert.equal(report.decision.intent.destructive, false);
		assert.deepEqual(report.decision.intent.successExitCodes, [0]);
		assert.deepEqual(report.decision.intent.requiredAfter, ['mustflow_config_change', 'mustflow_docs_change']);
		assert.equal(report.decision.effectGraph.source, 'local_index');
		assert.equal(report.decision.effectGraph.authority, 'explanation_only');
		assert.equal(report.decision.effectGraph.commandAuthority, '.mustflow/config/commands.toml');
		assert.equal(report.decision.effectGraph.grantsCommandAuthority, false);
		assert.equal(report.decision.effectGraph.status, 'missing');
		assert.equal(report.decision.effectGraph.indexFresh, false);
		assert.deepEqual(report.decision.effectGraph.writeLocks, []);
		assert.deepEqual(report.decision.effectGraph.lockConflicts, []);
	} finally {
		removeTempProject(projectPath);
	}
});

test('explains command-effect graph rows from a fresh local index', () => {
	const projectPath = createTempProject('mustflow-explain-command-');

	try {
		initProject(projectPath);
		appendCommandGraphFixture(projectPath);

		const indexResult = runCli(projectPath, ['index', '--json']);
		assert.equal(indexResult.status, 0, indexResult.stderr || indexResult.stdout);

		const result = runCli(projectPath, ['explain', 'command', 'graph_writer_a', '--json']);
		const report = JSON.parse(result.stdout);

		assert.equal(result.status, 0, result.stderr || result.stdout);
		assert.equal(report.decision.kind, 'allowed');
		assert.equal(report.decision.effectGraph.authority, 'explanation_only');
		assert.equal(report.decision.effectGraph.commandAuthority, '.mustflow/config/commands.toml');
		assert.equal(report.decision.effectGraph.grantsCommandAuthority, false);
		assert.equal(report.decision.effectGraph.status, 'fresh');
		assert.equal(report.decision.effectGraph.indexFresh, true);
		assert.deepEqual(report.decision.effectGraph.stalePaths, []);
		assert.deepEqual(report.decision.effectGraph.writeLocks, [
			{
				lock: 'graph_artifact',
				paths: ['graph-output/**'],
				modes: ['delete_recreate'],
				sources: ['effects'],
				concurrencies: ['exclusive'],
				effectCount: 1,
			},
		]);
		assert.deepEqual(report.decision.effectGraph.lockConflicts, [
			{
				intent: 'graph_writer_b',
				lock: 'graph_artifact',
				paths: ['graph-output/**'],
				modes: ['delete_recreate'],
				concurrencies: ['exclusive'],
				conflictingPaths: ['graph-output/**'],
				conflictingModes: ['delete_recreate'],
				conflictingConcurrencies: ['exclusive'],
			},
		]);
	} finally {
		removeTempProject(projectPath);
	}
});

test('explains blocked command intents without allowing guessed execution', () => {
	const projectPath = createTempProject('mustflow-explain-command-');

	try {
		initProject(projectPath);

		const result = runCli(projectPath, ['explain', 'command', 'lint']);
		assert.equal(result.status, 0, result.stderr || result.stdout);
		assert.match(result.stdout, /command intent "lint" is not agent-runnable/);
		assert.match(result.stdout, /status is unknown, not configured/);
		assert.match(result.stdout, /required_after: code_change, style_change/);
		assert.match(result.stdout, /Counts as mustflow verification: no/);
	} finally {
		removeTempProject(projectPath);
	}
});

test('explains undeclared command intents as unknown', () => {
	const projectPath = createTempProject('mustflow-explain-command-');

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

test('fails explain command when the command intent name is missing', () => {
	const projectPath = createTempProject('mustflow-explain-command-');

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
