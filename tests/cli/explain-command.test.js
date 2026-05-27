import assert from 'node:assert/strict';
import { appendFileSync, existsSync, mkdirSync, utimesSync, writeFileSync } from 'node:fs';
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

function assertExplanationOnlyEffectGraph(effectGraph, status) {
	assert.equal(effectGraph.source, 'local_index');
	assert.equal(effectGraph.authority, 'explanation_only');
	assert.equal(effectGraph.commandAuthority, '.mustflow/config/commands.toml');
	assert.equal(effectGraph.grantsCommandAuthority, false);
	assert.equal(effectGraph.status, status);
	assert.equal(effectGraph.indexFresh, status === 'fresh');
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
		assertExplanationOnlyEffectGraph(report.decision.effectGraph, 'missing');
		assert.deepEqual(report.decision.effectGraph.writeLocks, []);
		assert.deepEqual(report.decision.effectGraph.lockConflicts, []);
	} finally {
		removeTempProject(projectPath);
	}
});

test('explains command preconditions without running the satisfy intent', () => {
	const projectPath = createTempProject('mustflow-explain-command-');

	try {
		initProject(projectPath);
		mkdirSync(path.join(projectPath, 'src'), { recursive: true });
		mkdirSync(path.join(projectPath, 'dist'), { recursive: true });
		writeFileSync(path.join(projectPath, 'src', 'fresh.ts'), 'source');
		writeFileSync(path.join(projectPath, 'dist', 'fresh.js'), 'artifact');
		writeFileSync(path.join(projectPath, 'src', 'stale.ts'), 'source');
		writeFileSync(path.join(projectPath, 'dist', 'stale.js'), 'artifact');
		const oldTime = new Date('2024-01-01T00:00:00Z');
		const newTime = new Date('2024-01-02T00:00:00Z');
		utimesSync(path.join(projectPath, 'src', 'fresh.ts'), oldTime, oldTime);
		utimesSync(path.join(projectPath, 'dist', 'fresh.js'), newTime, newTime);
		utimesSync(path.join(projectPath, 'src', 'stale.ts'), newTime, newTime);
		utimesSync(path.join(projectPath, 'dist', 'stale.js'), oldTime, oldTime);
		appendFileSync(
			path.join(projectPath, '.mustflow', 'config', 'commands.toml'),
			`
[intents.manual_build]
status = "manual_only"
description = "Manual build fixture."

[intents.needs_artifact]
status = "configured"
lifecycle = "oneshot"
run_policy = "agent_allowed"
description = "Command with an artifact precondition."
argv = ["node", "-e", ""]
cwd = "."
timeout_seconds = 10
stdin = "closed"
success_exit_codes = [0]
writes = []
preconditions = [
  { kind = "path_exists", path = "dist/generated.js", satisfy_intent = "mustflow_check" },
  { kind = "artifact_freshness", artifact = "dist/fresh.js", sources = ["src/fresh.ts"], satisfy_intent = "mustflow_check" },
  { kind = "artifact_freshness", artifact = "dist/stale.js", sources = ["src/stale.ts"], satisfy_intent = "manual_build" },
]
network = false
destructive = false
`,
		);

		const result = runCli(projectPath, ['explain', 'command', 'needs_artifact', '--json']);
		const report = JSON.parse(result.stdout);
		const [missingPrecondition, satisfiedPrecondition, stalePrecondition] = report.decision.intent.preconditions;

		assert.equal(result.status, 0, result.stderr || result.stdout);
		assert.equal(missingPrecondition.kind, 'path_exists');
		assert.equal(missingPrecondition.status, 'missing');
		assert.equal(missingPrecondition.path, 'dist/generated.js');
		assert.equal(missingPrecondition.satisfyIntent.intent, 'mustflow_check');
		assert.equal(missingPrecondition.satisfyIntent.runnable, true);
		assert.equal(satisfiedPrecondition.kind, 'artifact_freshness');
		assert.equal(satisfiedPrecondition.status, 'satisfied');
		assert.equal(satisfiedPrecondition.newestSource, 'src/fresh.ts');
		assert.equal(stalePrecondition.kind, 'artifact_freshness');
		assert.equal(stalePrecondition.status, 'stale');
		assert.equal(stalePrecondition.newestSource, 'src/stale.ts');
		assert.equal(stalePrecondition.satisfyIntent.intent, 'manual_build');
		assert.equal(stalePrecondition.satisfyIntent.runnable, false);
		assert.equal(existsSync(path.join(projectPath, 'dist', 'generated.js')), false);
	} finally {
		removeTempProject(projectPath);
	}
});

test('explains why command decisions through the why surface as json', () => {
	const projectPath = createTempProject('mustflow-explain-command-');

	try {
		initProject(projectPath);

		const result = runCli(projectPath, ['explain', 'why', 'command', 'mustflow_check', '--json']);
		const report = JSON.parse(result.stdout);

		assert.equal(result.status, 0, result.stderr || result.stdout);
		assert.equal(report.topic, 'why');
		assert.equal(report.decision.kind, 'allowed');
		assert.equal(report.decision.inputCommand, 'mustflow_check');
		assert.equal(report.decision.countsAsMustflowVerification, true);
		assert.equal(report.decision.intent.status, 'configured');
		assertExplanationOnlyEffectGraph(report.decision.effectGraph, 'missing');
	} finally {
		removeTempProject(projectPath);
	}
});

test('explains why intent alias decisions through the why surface as json', () => {
	const projectPath = createTempProject('mustflow-explain-command-');

	try {
		initProject(projectPath);

		const result = runCli(projectPath, ['explain', 'why', 'intent', 'lint', '--json']);
		const report = JSON.parse(result.stdout);

		assert.equal(result.status, 0, result.stderr || result.stdout);
		assert.equal(report.topic, 'why');
		assert.equal(report.decision.kind, 'blocked');
		assert.equal(report.decision.inputCommand, 'lint');
		assert.equal(report.decision.countsAsMustflowVerification, false);
		assert.match(report.decision.reason, /status is unknown, not configured/);
	} finally {
		removeTempProject(projectPath);
	}
});

test('explains missing latest failure without exposing logs', () => {
	const projectPath = createTempProject('mustflow-explain-command-');

	try {
		initProject(projectPath);

		const result = runCli(projectPath, ['explain', 'why', 'latest-failure', '--json']);
		const report = JSON.parse(result.stdout);

		assert.equal(result.status, 0, result.stderr || result.stdout);
		assert.equal(report.topic, 'why');
		assert.equal(report.decision.kind, 'latest_failure');
		assert.equal(report.decision.latestFailure.present, false);
		assert.equal(report.decision.latestFailure.valid, false);
		assert.equal(report.decision.latestFailure.failed, false);
		assert.equal(JSON.stringify(report).includes('tail'), false);
	} finally {
		removeTempProject(projectPath);
	}
});

test('explains latest failure using bounded receipt metadata only', () => {
	const projectPath = createTempProject('mustflow-explain-command-');

	try {
		initProject(projectPath);
		const runsDir = path.join(projectPath, '.mustflow', 'state', 'runs');
		mkdirSync(runsDir, { recursive: true });
		writeFileSync(
			path.join(runsDir, 'latest.json'),
			JSON.stringify(
				{
					schema_version: '1',
					command: 'run',
					intent: 'failing_fixture',
					status: 'failed',
					duration_ms: 42,
					exit_code: 1,
					stdout: { tail: 'hidden stdout tail' },
					stderr: { tail: 'hidden stderr tail' },
					performance: {
						result_summary: {
							error_kind: 'exit_code',
						},
					},
				},
				null,
				2,
			),
		);

		const result = runCli(projectPath, ['explain', 'why', 'latest-failure', '--json']);
		const report = JSON.parse(result.stdout);
		const serialized = JSON.stringify(report);

		assert.equal(result.status, 0, result.stderr || result.stdout);
		assert.equal(report.topic, 'why');
		assert.equal(report.decision.kind, 'latest_failure');
		assert.equal(report.decision.latestFailure.present, true);
		assert.equal(report.decision.latestFailure.valid, true);
		assert.equal(report.decision.latestFailure.failed, true);
		assert.equal(report.decision.latestFailure.status, 'failed');
		assert.equal(report.decision.latestFailure.intent, 'failing_fixture');
		assert.equal(report.decision.latestFailure.exitCode, 1);
		assert.equal(report.decision.latestFailure.errorKind, 'exit_code');
		assert.equal(report.decision.latestFailure.durationMs, 42);
		assert.equal(serialized.includes('hidden stdout tail'), false);
		assert.equal(serialized.includes('hidden stderr tail'), false);
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
		assertExplanationOnlyEffectGraph(report.decision.effectGraph, 'fresh');
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

test('keeps stale command-effect graph context explanation-only', () => {
	const projectPath = createTempProject('mustflow-explain-command-');

	try {
		initProject(projectPath);
		appendCommandGraphFixture(projectPath);

		const indexResult = runCli(projectPath, ['index', '--json']);
		assert.equal(indexResult.status, 0, indexResult.stderr || indexResult.stdout);
		appendFileSync(path.join(projectPath, '.mustflow', 'config', 'commands.toml'), '\n# stale graph marker\n');

		const result = runCli(projectPath, ['explain', 'command', 'graph_writer_a', '--json']);
		const report = JSON.parse(result.stdout);

		assert.equal(result.status, 0, result.stderr || result.stdout);
		assert.equal(report.decision.kind, 'allowed');
		assertExplanationOnlyEffectGraph(report.decision.effectGraph, 'stale');
		assert.deepEqual(report.decision.effectGraph.stalePaths, ['.mustflow/config/commands.toml']);
		assert.deepEqual(report.decision.effectGraph.writeLocks, []);
		assert.deepEqual(report.decision.effectGraph.lockConflicts, []);
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

test('explains why a command is blocked with run-plan metadata and a suggested snippet', () => {
	const projectPath = createTempProject('mustflow-explain-command-');

	try {
		initProject(projectPath);

		const result = runCli(projectPath, ['explain', '--why-blocked', 'lint', '--json']);
		const report = JSON.parse(result.stdout);

		assert.equal(result.status, 0, result.stderr || result.stdout);
		assert.equal(report.topic, 'why');
		assert.equal(report.decision.kind, 'blocked');
		assert.equal(report.decision.inputCommand, 'lint');
		assert.equal(report.decision.blockedRunPlan.runnable, false);
		assert.equal(report.decision.blockedRunPlan.reasonCode, 'status_not_configured');
		assert.equal(report.decision.blockedRunPlan.status, 'unknown');
		assert.match(report.decision.reason, /status is unknown, not configured/);
		assert.match(report.decision.reason, /lifecycle is missing, not oneshot/);
		assert.match(report.decision.blockedRunPlan.suggestedIntentSnippet, /\[intents\.lint\]/);
		assert.match(report.decision.blockedRunPlan.suggestedIntentSnippet, /status = "manual_only"/);
	} finally {
		removeTempProject(projectPath);
	}
});

test('explains why-blocked as not blocked for runnable command intents', () => {
	const projectPath = createTempProject('mustflow-explain-command-');

	try {
		initProject(projectPath);

		const result = runCli(projectPath, ['explain', '--why-blocked', 'mustflow_check']);

		assert.equal(result.status, 0, result.stderr || result.stdout);
		assert.match(result.stdout, /command intent "mustflow_check" is not blocked for mf run/);
		assert.match(result.stdout, /Blocked run plan/);
		assert.match(result.stdout, /- runnable: yes/);
		assert.match(result.stdout, /- reason_code: none/);
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
