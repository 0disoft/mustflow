import assert from 'node:assert/strict';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { test } from 'node:test';

import { createTempProject, initProject, removeTempProject, runCli } from './helpers/cli-harness.js';

function appendIntent(projectPath, text) {
	const commandsPath = path.join(projectPath, '.mustflow', 'config', 'commands.toml');
	const commands = readFileSync(commandsPath, 'utf8');
	writeFileSync(commandsPath, `${commands}\n${text.trim()}\n`);
}

function createClassifyPlan(projectPath, reason, filePath = 'README.md') {
	return {
		schema_version: '1',
		command: 'classify',
		mustflow_root: projectPath,
		source: 'paths',
		files: [filePath],
		classifications: [
			{
				path: filePath,
				changeKinds: ['documentation'],
				surface: {
					kind: 'readme_page',
					category: 'documentation',
					isPublicSurface: true,
					validationReasons: [reason],
					affectedContracts: ['public documentation'],
					updatePolicy: 'update',
					driftChecks: ['command examples'],
				},
			},
		],
		summary: {
			fileCount: 1,
			publicSurfaceCount: 1,
			changeKinds: ['documentation'],
			validationReasons: [reason],
			updatePolicies: ['update'],
			driftChecks: ['command examples'],
			affectedContracts: ['public documentation'],
		},
	};
}

test('prints plan-only verification candidates without running commands', () => {
	const projectPath = createTempProject();
	const markerPath = path.join(projectPath, 'executed.txt');

	try {
		initProject(projectPath);
		appendIntent(
			projectPath,
			`
[intents.verify_plan_only]
status = "configured"
lifecycle = "oneshot"
run_policy = "agent_allowed"
description = "Write a marker if executed."
argv = ['${process.execPath}', '-e', 'require("node:fs").writeFileSync("executed.txt", "ran")']
cwd = "."
timeout_seconds = 10
stdin = "closed"
success_exit_codes = [0]
writes = ["executed.txt"]
network = false
destructive = false
required_after = ["custom_verify"]

[intents.verify_plan_only.covers]
reasons = ["custom_verify"]
surfaces = ["readme_page"]
paths = ["README.md"]
contracts = ["public documentation"]

[intents.verify_plan_only.selection]
coverage_level = "targeted"
coverage_confidence = "medium"
accepts_changed_files = "git_status"
fallback_intents = ["test_fast"]
escalate_to = ["test"]

[intents.verify_plan_only.cost]
expected_seconds = 42
cold_start_seconds = 3
timeout_ratio_expectation = 0.25
cost_tier = "medium"

[intents.verify_plan_only.relations]
subsumes = ["verify_docs_smoke"]
subsumed_by = ["test"]
requires_with = ["lint"]
escalate_to = ["test"]
`,
		);

		const result = runCli(projectPath, ['verify', '--reason', 'custom_verify', '--plan-only', '--json']);
		const report = JSON.parse(result.stdout);

		assert.equal(result.status, 0, result.stderr || result.stdout);
		assert.equal(report.schema_version, '1');
		assert.match(report.verification_plan_id, /^sha256:[0-9a-f]{64}$/u);
		assert.equal(report.source, 'paths');
		assert.deepEqual(report.files, []);
		assert.deepEqual(report.classification_summary.validationReasons, ['custom_verify']);
		assert.equal(report.requirements[0].reason, 'custom_verify');
		assert.equal(report.candidates[0].reason, 'custom_verify');
		assert.equal(report.candidates[0].intent, 'verify_plan_only');
		assert.equal(report.candidates[0].status, 'runnable');
		assert.equal(report.candidates[0].skipReason, null);
		assert.equal(report.candidates[0].candidateState, 'candidate');
		assert.equal(report.candidates[0].eligibilityState, 'eligible');
		assert.equal(report.candidates[0].selectionState, 'selected');
		assert.deepEqual(report.gaps, []);
		assert.equal(report.decision_graph.schema_version, '1');
		assert.equal(report.decision_graph.root, 'verification_decision');
		assert.equal(report.decision_graph.summary.runnable > 0, true);
		assert.equal(report.decision_graph.summary.selected, 1);
		assert.equal(report.decision_graph.summary.not_selected, 0);
		assert.equal(
			report.decision_graph.nodes.some(
				(node) => node.kind === 'classification_reason' && node.reason === 'custom_verify',
			),
			true,
		);
		assert.equal(
			report.decision_graph.nodes.some(
				(node) =>
					node.kind === 'command_candidate' &&
					node.intent === 'verify_plan_only' &&
					node.status === 'runnable' &&
					node.data.selectionState === 'selected' &&
					node.data.command.required_after.includes('custom_verify') &&
					node.data.command.writes.includes('executed.txt'),
			),
			true,
		);
		const commandCandidate = report.decision_graph.nodes.find(
			(node) => node.kind === 'command_candidate' && node.intent === 'verify_plan_only',
		);
		assert.deepEqual(commandCandidate.data.command.covers, {
			reasons: ['custom_verify'],
			surfaces: ['readme_page'],
			paths: ['README.md'],
			contracts: ['public documentation'],
		});
		assert.deepEqual(commandCandidate.data.command.selection, {
			coverage_level: 'targeted',
			coverage_confidence: 'medium',
			accepts_changed_files: 'git_status',
			fallback_intents: ['test_fast'],
			escalate_to: ['test'],
		});
		assert.deepEqual(commandCandidate.data.command.cost, {
			expected_seconds: 42,
			cold_start_seconds: 3,
			timeout_ratio_expectation: 0.25,
			cost_tier: 'medium',
		});
		assert.deepEqual(commandCandidate.data.command.relations, {
			subsumes: ['verify_docs_smoke'],
			subsumed_by: ['test'],
			requires_with: ['lint'],
			escalate_to: ['test'],
		});
		assert.equal(
			report.decision_graph.nodes.some(
				(node) => node.kind === 'eligibility' && node.intent === 'verify_plan_only' && node.data.code === 'ok',
			),
			true,
		);
		assert.equal(
			report.decision_graph.nodes.some(
				(node) => node.kind === 'effect' && node.intent === 'verify_plan_only' && node.data.path === 'executed.txt',
			),
			true,
		);
		assert.equal(
			report.decision_graph.edges.some((edge) => edge.kind === 'requires' && edge.to.includes('verify_plan_only')),
			true,
		);
		assert.equal(existsSync(markerPath), false);
	} finally {
		removeTempProject(projectPath);
	}
});

test('prints verification schedule batches from command effects', () => {
	const projectPath = createTempProject();

	try {
		initProject(projectPath);
		appendIntent(
			projectPath,
			`
[resources.dist_build_output]
type = "path"
paths = ["dist/**"]
concurrency = "exclusive_writer"
description = "Generated build output."

[intents.verify_build_a]
status = "configured"
lifecycle = "oneshot"
run_policy = "agent_allowed"
description = "Build A."
argv = ['${process.execPath}', '-e', 'console.log("a")']
cwd = "."
timeout_seconds = 10
stdin = "closed"
success_exit_codes = [0]
writes = ["dist/"]
effects = [
  { type = "write", mode = "delete_recreate", path = "dist/**", lock = "dist_build_output", concurrency = "exclusive" },
]
network = false
destructive = false
required_after = ["custom_verify"]

[intents.verify_build_b]
status = "configured"
lifecycle = "oneshot"
run_policy = "agent_allowed"
description = "Build B."
argv = ['${process.execPath}', '-e', 'console.log("b")']
cwd = "."
timeout_seconds = 10
stdin = "closed"
success_exit_codes = [0]
writes = ["dist/"]
effects = [
  { type = "write", mode = "delete_recreate", path = "dist/**", lock = "dist_build_output", concurrency = "exclusive" },
]
network = false
destructive = false
required_after = ["custom_verify"]
`,
		);

		const indexResult = runCli(projectPath, ['index', '--json']);
		const result = runCli(projectPath, ['verify', '--reason', 'custom_verify', '--plan-only', '--json']);
		const report = JSON.parse(result.stdout);

		assert.equal(indexResult.status, 0, indexResult.stderr || indexResult.stdout);
		assert.equal(result.status, 0, result.stderr || result.stdout);
		assert.equal(report.schedule.runner, 'serial_mf_run_receipts');
		assert.deepEqual(report.schedule.failurePolicy, {
			mode: 'batch_boundary',
			startedBatch: 'wait_for_completion',
			nextBatch: 'stop_on_failure',
		});
		assert.deepEqual(
			report.schedule.entries.map((entry) => entry.intent),
			['verify_build_a', 'verify_build_b'],
		);
		assert.deepEqual(report.schedule.batches.map((batch) => batch.intents), [['verify_build_a'], ['verify_build_b']]);
		assert.equal(report.schedule.entries[0].locks[0], 'dist_build_output');
		assert.equal(report.schedule.entries[0].parallelEligible, true);
		assert.equal(report.schedule.entries[0].parallelReason, 'explicit_effects');
		assert.equal(report.schedule.entries[0].effects[0].mode, 'delete_recreate');
		assert.equal(report.schedule.entries[0].conflicts[0].conflictsWith, 'verify_build_b');
		assert.equal(report.schedule.entries[0].effectGraph.authority, 'explanation_only');
		assert.equal(report.schedule.entries[0].effectGraph.commandAuthority, '.mustflow/config/commands.toml');
		assert.equal(report.schedule.entries[0].effectGraph.grantsCommandAuthority, false);
		assert.equal(report.schedule.entries[0].effectGraph.status, 'fresh');
		assert.equal(report.schedule.entries[0].effectGraph.indexFresh, true);
		assert.equal(
			report.schedule.entries[0].effectGraph.writeLocks.some(
				(lock) => lock.lock === 'dist_build_output' && lock.paths.includes('dist/**'),
			),
			true,
		);
		assert.equal(
			report.schedule.entries[0].effectGraph.lockConflicts.some(
				(conflict) => conflict.intent === 'verify_build_b' && conflict.lock === 'dist_build_output',
			),
			true,
		);
	} finally {
		removeTempProject(projectPath);
	}
});

test('does not select a narrower runnable intent when a selected runnable intent explicitly subsumes it', () => {
	const projectPath = createTempProject();

	try {
		initProject(projectPath);
		appendIntent(
			projectPath,
			`
[intents.verify_docs_full]
status = "configured"
lifecycle = "oneshot"
run_policy = "agent_allowed"
description = "Full documentation verification."
argv = ['${process.execPath}', '-e', 'console.log("full docs")']
cwd = "."
timeout_seconds = 10
stdin = "closed"
success_exit_codes = [0]
writes = []
network = false
destructive = false
required_after = ["docs_verify"]

[intents.verify_docs_full.relations]
subsumes = ["verify_docs_smoke"]

[intents.verify_docs_smoke]
status = "configured"
lifecycle = "oneshot"
run_policy = "agent_allowed"
description = "Narrow documentation smoke verification."
argv = ['${process.execPath}', '-e', 'console.log("smoke docs")']
cwd = "."
timeout_seconds = 10
stdin = "closed"
success_exit_codes = [0]
writes = []
network = false
destructive = false
required_after = ["docs_verify"]
`,
		);

		const result = runCli(projectPath, ['verify', '--reason', 'docs_verify', '--plan-only', '--json']);
		const report = JSON.parse(result.stdout);
		const fullCandidate = report.candidates.find((candidate) => candidate.intent === 'verify_docs_full');
		const smokeCandidate = report.candidates.find((candidate) => candidate.intent === 'verify_docs_smoke');
		const fullNode = report.decision_graph.nodes.find(
			(node) => node.kind === 'command_candidate' && node.intent === 'verify_docs_full',
		);
		const smokeNode = report.decision_graph.nodes.find(
			(node) => node.kind === 'command_candidate' && node.intent === 'verify_docs_smoke',
		);

		assert.equal(result.status, 0, result.stderr || result.stdout);
		assert.equal(fullCandidate.status, 'runnable');
		assert.equal(fullCandidate.selectionState, 'selected');
		assert.equal(smokeCandidate.status, 'runnable');
		assert.equal(smokeCandidate.selectionState, 'not_selected');
		assert.deepEqual(
			report.schedule.entries.map((entry) => entry.intent),
			['verify_docs_full'],
		);
		assert.equal(report.decision_graph.summary.selected, 1);
		assert.equal(report.decision_graph.summary.not_selected, 1);
		assert.equal(fullNode.data.selectionState, 'selected');
		assert.equal(smokeNode.data.selectionState, 'not_selected');
	} finally {
		removeTempProject(projectPath);
	}
});

test('selects the lowest-cost runnable intent only when coverage hints are equivalent', () => {
	const projectPath = createTempProject();

	try {
		initProject(projectPath);
		appendIntent(
			projectPath,
			`
[intents.verify_fast_equivalent]
status = "configured"
lifecycle = "oneshot"
run_policy = "agent_allowed"
description = "Fast equivalent verification."
argv = ['${process.execPath}', '-e', 'console.log("fast")']
cwd = "."
timeout_seconds = 10
stdin = "closed"
success_exit_codes = [0]
writes = []
network = false
destructive = false
required_after = ["cost_verify"]

[intents.verify_fast_equivalent.covers]
reasons = ["cost_verify"]
surfaces = ["readme_page"]
paths = ["README.md"]
contracts = ["public documentation"]

[intents.verify_fast_equivalent.cost]
expected_seconds = 5

[intents.verify_slow_equivalent]
status = "configured"
lifecycle = "oneshot"
run_policy = "agent_allowed"
description = "Slow equivalent verification."
argv = ['${process.execPath}', '-e', 'console.log("slow")']
cwd = "."
timeout_seconds = 10
stdin = "closed"
success_exit_codes = [0]
writes = []
network = false
destructive = false
required_after = ["cost_verify"]

[intents.verify_slow_equivalent.covers]
contracts = ["public documentation"]
paths = ["README.md"]
reasons = ["cost_verify"]
surfaces = ["readme_page"]

[intents.verify_slow_equivalent.cost]
expected_seconds = 60
`,
		);

		const result = runCli(projectPath, ['verify', '--reason', 'cost_verify', '--plan-only', '--json']);
		const report = JSON.parse(result.stdout);
		const fastCandidate = report.candidates.find((candidate) => candidate.intent === 'verify_fast_equivalent');
		const slowCandidate = report.candidates.find((candidate) => candidate.intent === 'verify_slow_equivalent');

		assert.equal(result.status, 0, result.stderr || result.stdout);
		assert.equal(fastCandidate.status, 'runnable');
		assert.equal(fastCandidate.selectionState, 'selected');
		assert.equal(slowCandidate.status, 'runnable');
		assert.equal(slowCandidate.selectionState, 'not_selected');
		assert.deepEqual(
			report.schedule.entries.map((entry) => entry.intent),
			['verify_fast_equivalent'],
		);
		assert.equal(report.decision_graph.summary.selected, 1);
		assert.equal(report.decision_graph.summary.not_selected, 1);
	} finally {
		removeTempProject(projectPath);
	}
});

test('keeps writes-only verification intents serial-only in the schedule model', () => {
	const projectPath = createTempProject();

	try {
		initProject(projectPath);
		appendIntent(
			projectPath,
			`
[intents.verify_effect_lock]
status = "configured"
lifecycle = "oneshot"
run_policy = "agent_allowed"
description = "Explicit effect check."
argv = ['${process.execPath}', '-e', 'console.log("effect")']
cwd = "."
timeout_seconds = 10
stdin = "closed"
success_exit_codes = [0]
writes = []
effects = [
  { type = "write", mode = "replace", path = "effect.txt", lock = "effect_artifact", concurrency = "exclusive" },
]
network = false
destructive = false
required_after = ["parallel_verify"]

[intents.verify_writes_only]
status = "configured"
lifecycle = "oneshot"
run_policy = "agent_allowed"
description = "Writes-only check."
argv = ['${process.execPath}', '-e', 'console.log("writes")']
cwd = "."
timeout_seconds = 10
stdin = "closed"
success_exit_codes = [0]
writes = ["writes-only.txt"]
network = false
destructive = false
required_after = ["parallel_verify"]
`,
		);

		const result = runCli(projectPath, ['verify', '--reason', 'parallel_verify', '--plan-only', '--json']);
		const report = JSON.parse(result.stdout);
		const explicitEntry = report.schedule.entries.find((entry) => entry.intent === 'verify_effect_lock');
		const writesOnlyEntry = report.schedule.entries.find((entry) => entry.intent === 'verify_writes_only');

		assert.equal(result.status, 0, result.stderr || result.stdout);
		assert.ok(explicitEntry);
		assert.ok(writesOnlyEntry);
		assert.equal(explicitEntry.parallelEligible, true);
		assert.equal(explicitEntry.parallelReason, 'explicit_effects');
		assert.equal(writesOnlyEntry.parallelEligible, false);
		assert.equal(writesOnlyEntry.parallelReason, 'missing_explicit_effects');
		assert.deepEqual(report.schedule.batches.map((batch) => batch.intents), [['verify_effect_lock'], ['verify_writes_only']]);
		assert.equal(
			report.schedule.notes.some((note) => note.includes('writes fallback remains serial-only')),
			true,
		);
		assert.equal(
			report.schedule.notes.some((note) => note.includes('stop before the next batch on failure')),
			true,
		);
	} finally {
		removeTempProject(projectPath);
	}
});

test('keeps lock-only resources as first-class schedule effects', () => {
	const projectPath = createTempProject();

	try {
		initProject(projectPath);
		appendIntent(
			projectPath,
			`
[resources.test_database]
type = "database"
concurrency = "exclusive"
description = "Shared test database."

[intents.verify_database_a]
status = "configured"
lifecycle = "oneshot"
run_policy = "agent_allowed"
description = "Database check A."
argv = ['${process.execPath}', '-e', 'console.log("database a")']
cwd = "."
timeout_seconds = 10
stdin = "closed"
success_exit_codes = [0]
writes = []
effects = [
  { type = "write", mode = "replace", lock = "db:test_database", concurrency = "exclusive" },
]
network = false
destructive = false
required_after = ["database_verify"]

[intents.verify_database_b]
status = "configured"
lifecycle = "oneshot"
run_policy = "agent_allowed"
description = "Database check B."
argv = ['${process.execPath}', '-e', 'console.log("database b")']
cwd = "."
timeout_seconds = 10
stdin = "closed"
success_exit_codes = [0]
writes = []
effects = [
  { type = "write", mode = "replace", lock = "db:test_database", concurrency = "exclusive" },
]
network = false
destructive = false
required_after = ["database_verify"]
`,
		);

		const indexResult = runCli(projectPath, ['index', '--json']);
		const result = runCli(projectPath, ['verify', '--reason', 'database_verify', '--plan-only', '--json']);
		const report = JSON.parse(result.stdout);
		const firstEntry = report.schedule.entries.find((entry) => entry.intent === 'verify_database_a');

		assert.equal(indexResult.status, 0, indexResult.stderr || indexResult.stdout);
		assert.equal(result.status, 0, result.stderr || result.stdout);
		assert.ok(firstEntry);
		assert.deepEqual(report.schedule.entries.map((entry) => entry.intent), ['verify_database_a', 'verify_database_b']);
		assert.deepEqual(report.schedule.batches.map((batch) => batch.intents), [['verify_database_a'], ['verify_database_b']]);
		assert.equal(firstEntry.effects[0].path, null);
		assert.equal(firstEntry.effects[0].lock, 'db:test_database');
		assert.equal(firstEntry.parallelEligible, true);
		assert.equal(firstEntry.parallelReason, 'explicit_effects');
		assert.equal(firstEntry.locks[0], 'db:test_database');
		assert.equal(firstEntry.conflicts[0].conflictsWith, 'verify_database_b');
		assert.equal(
			firstEntry.effectGraph.writeLocks.some(
				(lock) => lock.lock === 'db:test_database' && lock.paths.length === 0 && lock.effectCount === 1,
			),
			true,
		);
		assert.equal(
			firstEntry.effectGraph.lockConflicts.some(
				(conflict) =>
					conflict.intent === 'verify_database_b' &&
					conflict.lock === 'db:test_database' &&
					conflict.paths.length === 0 &&
					conflict.conflictingPaths.length === 0,
			),
			true,
		);
	} finally {
		removeTempProject(projectPath);
	}
});

test('removes parallel eligibility after latest receipt reports undeclared writes', () => {
	const projectPath = createTempProject();

	try {
		initProject(projectPath);
		appendIntent(
			projectPath,
			`
[resources.output_cache]
type = "cache"
description = "Output cache touched by verification."

[intents.verify_declared_effect_drift]
status = "configured"
lifecycle = "oneshot"
run_policy = "agent_allowed"
description = "Effect-backed check with previous drift."
argv = ['${process.execPath}', '-e', 'console.log("drift")']
cwd = "."
timeout_seconds = 10
stdin = "closed"
success_exit_codes = [0]
writes = []
network = false
destructive = false
required_after = ["parallel_verify"]
effects = [
  { type = "write", mode = "replace", lock = "cache:output_cache", concurrency = "exclusive" }
]
`,
		);
		const runsDir = path.join(projectPath, '.mustflow', 'state', 'runs');
		mkdirSync(runsDir, { recursive: true });
		writeFileSync(
			path.join(runsDir, 'latest.json'),
			`${JSON.stringify({
				intent: 'verify_declared_effect_drift',
				write_drift: {
					has_undeclared_changes: true,
				},
			})}\n`,
		);

		const result = runCli(projectPath, ['verify', '--reason', 'parallel_verify', '--plan-only', '--json']);
		const report = JSON.parse(result.stdout);
		const entry = report.schedule.entries.find((scheduleEntry) => scheduleEntry.intent === 'verify_declared_effect_drift');

		assert.equal(result.status, 0, result.stderr || result.stdout);
		assert.ok(entry);
		assert.equal(entry.parallelEligible, false);
		assert.equal(entry.parallelReason, 'undeclared_write_drift');
		assert.equal(entry.effects[0].source, 'effects');
		assert.equal(
			report.schedule.notes.some((note) => note.includes('reported undeclared writes')),
			true,
		);
	} finally {
		removeTempProject(projectPath);
	}
});

test('removes parallel eligibility from per-intent receipt referenced by verify latest pointer', () => {
	const projectPath = createTempProject();

	try {
		initProject(projectPath);
		appendIntent(
			projectPath,
			`
[resources.output_cache]
type = "cache"
description = "Output cache touched by verification."

[intents.verify_declared_effect_drift]
status = "configured"
lifecycle = "oneshot"
run_policy = "agent_allowed"
description = "Effect-backed check with previous verify drift."
argv = ['${process.execPath}', '-e', 'console.log("drift")']
cwd = "."
timeout_seconds = 10
stdin = "closed"
success_exit_codes = [0]
writes = []
network = false
destructive = false
required_after = ["parallel_verify"]
effects = [
  { type = "write", mode = "replace", lock = "cache:output_cache", concurrency = "exclusive" }
]
`,
		);
		const runsDir = path.join(projectPath, '.mustflow', 'state', 'runs');
		const verifyDir = path.join(runsDir, 'verify-latest');
		const intentsDir = path.join(verifyDir, 'intents');
		const receiptRelativePath = '.mustflow/state/runs/verify-latest/intents/001-verify_declared_effect_drift.json';
		mkdirSync(intentsDir, { recursive: true });
		writeFileSync(
			path.join(projectPath, receiptRelativePath),
			`${JSON.stringify({
				intent: 'verify_declared_effect_drift',
				write_drift: {
					has_undeclared_changes: true,
				},
			})}\n`,
		);
		writeFileSync(
			path.join(verifyDir, 'manifest.json'),
			`${JSON.stringify({
				command: 'verify',
				receipts: [
					{
						intent: 'verify_declared_effect_drift',
						receipt_path: receiptRelativePath,
					},
				],
			})}\n`,
		);
		writeFileSync(
			path.join(runsDir, 'latest.json'),
			`${JSON.stringify({
				command: 'verify',
				kind: 'verify_run_summary',
				manifest_path: '.mustflow/state/runs/verify-latest/manifest.json',
			})}\n`,
		);

		const result = runCli(projectPath, ['verify', '--reason', 'parallel_verify', '--plan-only', '--json']);
		const report = JSON.parse(result.stdout);
		const entry = report.schedule.entries.find((scheduleEntry) => scheduleEntry.intent === 'verify_declared_effect_drift');

		assert.equal(result.status, 0, result.stderr || result.stdout);
		assert.ok(entry);
		assert.equal(entry.parallelEligible, false);
		assert.equal(entry.parallelReason, 'undeclared_write_drift');
		assert.equal(
			report.schedule.notes.some((note) => note.includes('reported undeclared writes')),
			true,
		);
	} finally {
		removeTempProject(projectPath);
	}
});

test('runs verification intents in the plan schedule order', () => {
	const projectPath = createTempProject();
	const orderPath = path.join(projectPath, 'order.txt');

	try {
		initProject(projectPath);
		appendIntent(
			projectPath,
			`
[resources.verify_order_log]
type = "path"
paths = ["order.txt"]
concurrency = "exclusive_writer"
description = "Verification order log."

[intents.verify_schedule_a]
status = "configured"
lifecycle = "oneshot"
run_policy = "agent_allowed"
description = "Append schedule marker A."
argv = ['${process.execPath}', '-e', 'require("node:fs").appendFileSync("order.txt", "verify_schedule_a\\n")']
cwd = "."
timeout_seconds = 10
stdin = "closed"
success_exit_codes = [0]
writes = ["order.txt"]
effects = [
  { type = "write", mode = "append", path = "order.txt", lock = "verify_order_log", concurrency = "exclusive" },
]
network = false
destructive = false
required_after = ["custom_verify"]

[intents.verify_schedule_b]
status = "configured"
lifecycle = "oneshot"
run_policy = "agent_allowed"
description = "Append schedule marker B."
argv = ['${process.execPath}', '-e', 'require("node:fs").appendFileSync("order.txt", "verify_schedule_b\\n")']
cwd = "."
timeout_seconds = 10
stdin = "closed"
success_exit_codes = [0]
writes = ["order.txt"]
effects = [
  { type = "write", mode = "append", path = "order.txt", lock = "verify_order_log", concurrency = "exclusive" },
]
network = false
destructive = false
required_after = ["custom_verify"]
`,
		);

		const planResult = runCli(projectPath, ['verify', '--reason', 'custom_verify', '--plan-only', '--json']);
		const runResult = runCli(projectPath, ['verify', '--reason', 'custom_verify', '--json']);
		const planReport = JSON.parse(planResult.stdout);
		const runReport = JSON.parse(runResult.stdout);
		const scheduledIntents = planReport.schedule.entries.map((entry) => entry.intent);

		assert.equal(planResult.status, 0, planResult.stderr || planResult.stdout);
		assert.equal(runResult.status, 0, runResult.stderr || runResult.stdout);
		assert.equal(runReport.verification_plan_id, planReport.verification_plan_id);
		assert.ok(runReport.results.every((result) => result.verification_plan_id === runReport.verification_plan_id));
		assert.deepEqual(
			runReport.results.filter((result) => !result.skipped).map((result) => result.intent),
			scheduledIntents,
		);
		assert.deepEqual(readFileSync(orderPath, 'utf8').trim().split(/\r?\n/), scheduledIntents);
	} finally {
		removeTempProject(projectPath);
	}
});

test('keeps manual-only plan candidates as skipped and reports gaps', () => {
	const projectPath = createTempProject();

	try {
		initProject(projectPath);
		appendIntent(
			projectPath,
			`
[intents.verify_manual]
status = "manual_only"
description = "Manual verification."
reason = "Needs a human."
required_after = ["custom_partial"]
`,
		);

		const result = runCli(projectPath, ['verify', '--reason=custom_partial', '--plan-only', '--json']);
		const report = JSON.parse(result.stdout);

		assert.equal(result.status, 0, result.stderr || result.stdout);
		assert.equal(report.candidates[0].intent, 'verify_manual');
		assert.equal(report.candidates[0].status, 'skipped');
		assert.equal(report.candidates[0].skipReason, 'status_not_configured');
		assert.equal(report.candidates[0].detail, 'Needs a human.');
		assert.equal(report.candidates[0].candidateState, 'candidate');
		assert.equal(report.candidates[0].eligibilityState, 'ineligible');
		assert.equal(report.candidates[0].selectionState, 'not_applicable');
		assert.equal(report.gaps[0].reason, 'custom_partial');
		assert.match(report.gaps[0].detail, /No runnable command intents/);
		assert.equal(
			report.decision_graph.nodes.some(
				(node) => node.kind === 'command_candidate' && node.intent === 'verify_manual' && node.status === 'manual_only',
			),
			true,
		);
		assert.equal(report.decision_graph.summary.manual_only, 2);
		assert.equal(report.decision_graph.summary.gapCount, 1);
	} finally {
		removeTempProject(projectPath);
	}
});

test('escalates to a declared fallback intent when targeted verification is unavailable', () => {
	const projectPath = createTempProject();

	try {
		initProject(projectPath);
		appendIntent(
			projectPath,
			`
[intents.verify_manual_with_fallback]
status = "manual_only"
description = "Manual targeted verification."
reason = "Needs a human."
required_after = ["custom_escalate"]

[intents.verify_manual_with_fallback.selection]
fallback_intents = ["verify_broad_fallback"]

[intents.verify_broad_fallback]
status = "configured"
lifecycle = "oneshot"
run_policy = "agent_allowed"
description = "Broad fallback verification."
argv = ['${process.execPath}', '-e', 'console.log("fallback ok")']
cwd = "."
timeout_seconds = 10
stdin = "closed"
success_exit_codes = [0]
writes = []
network = false
destructive = false
`,
		);

		const result = runCli(projectPath, ['verify', '--reason=custom_escalate', '--plan-only', '--json']);
		const report = JSON.parse(result.stdout);
		const targeted = report.candidates.find((candidate) => candidate.intent === 'verify_manual_with_fallback');
		const fallback = report.candidates.find((candidate) => candidate.intent === 'verify_broad_fallback');

		assert.equal(result.status, 0, result.stderr || result.stdout);
		assert.equal(targeted.status, 'skipped');
		assert.equal(targeted.skipReason, 'status_not_configured');
		assert.equal(targeted.selectionState, 'not_applicable');
		assert.equal(fallback.status, 'runnable');
		assert.equal(fallback.skipReason, null);
		assert.equal(fallback.detail, 'Declared fallback for unavailable verification intent.');
		assert.equal(fallback.selectionState, 'selected');
		assert.deepEqual(report.gaps, []);
		assert.deepEqual(
			report.schedule.entries.map((entry) => entry.intent),
			['verify_broad_fallback'],
		);
		assert.equal(report.decision_graph.summary.selected, 1);
		assert.equal(report.decision_graph.summary.gapCount, 0);
		assert.equal(
			report.decision_graph.nodes.some(
				(node) =>
					node.kind === 'command_candidate' &&
					node.intent === 'verify_broad_fallback' &&
					node.data.selectionState === 'selected',
			),
			true,
		);
	} finally {
		removeTempProject(projectPath);
	}
});

test('adds declared escalation intents for high-risk runnable verification requirements', () => {
	const projectPath = createTempProject();

	try {
		initProject(projectPath);
		appendIntent(
			projectPath,
			`
[intents.verify_schema_targeted]
status = "configured"
lifecycle = "oneshot"
run_policy = "agent_allowed"
description = "Targeted schema verification."
argv = ['${process.execPath}', '-e', 'console.log("schema targeted")']
cwd = "."
timeout_seconds = 10
stdin = "closed"
success_exit_codes = [0]
writes = []
network = false
destructive = false
required_after = ["release_risk"]

[intents.verify_schema_targeted.selection]
escalate_to = ["verify_release_gate"]

[intents.verify_release_gate]
status = "configured"
lifecycle = "oneshot"
run_policy = "agent_allowed"
description = "Release gate verification."
argv = ['${process.execPath}', '-e', 'console.log("release gate")']
cwd = "."
timeout_seconds = 10
stdin = "closed"
success_exit_codes = [0]
writes = []
network = false
destructive = false
`,
		);

		const result = runCli(projectPath, ['verify', '--reason=release_risk', '--plan-only', '--json']);
		const report = JSON.parse(result.stdout);
		const targeted = report.candidates.find((candidate) => candidate.intent === 'verify_schema_targeted');
		const escalation = report.candidates.find((candidate) => candidate.intent === 'verify_release_gate');

		assert.equal(result.status, 0, result.stderr || result.stdout);
		assert.equal(targeted.status, 'runnable');
		assert.equal(targeted.selectionState, 'selected');
		assert.equal(escalation.status, 'runnable');
		assert.equal(escalation.detail, 'Declared escalation for a high-risk verification requirement.');
		assert.equal(escalation.selectionState, 'selected');
		assert.deepEqual(report.gaps, []);
		assert.deepEqual(
			report.schedule.entries.map((entry) => entry.intent).sort(),
			['verify_release_gate', 'verify_schema_targeted'],
		);
		assert.equal(report.decision_graph.summary.selected, 2);
		assert.equal(
			report.decision_graph.nodes.some(
				(node) =>
					node.kind === 'command_candidate' &&
					node.intent === 'verify_release_gate' &&
					node.data.selectionState === 'selected',
			),
			true,
		);
	} finally {
		removeTempProject(projectPath);
	}
});

test('does not use performance history or cache files as verification authority', () => {
	const projectPath = createTempProject();

	try {
		initProject(projectPath);
		const perfDir = path.join(projectPath, '.mustflow', 'state', 'perf');
		const cacheDir = path.join(projectPath, '.mustflow', 'cache');

		mkdirSync(perfDir, { recursive: true });
		mkdirSync(cacheDir, { recursive: true });
		writeFileSync(
			path.join(perfDir, 'samples.json'),
			JSON.stringify(
				{
					schema_version: '1',
					samples: [
						{
							observed_day: '2026-05-16',
							intent: 'verify_history_only',
							intent_fingerprint: 'sha256:history',
							command_fingerprint: 'sha256:command',
							contract_fingerprint: 'sha256:contract',
							runner_bucket: 'local/windows/x64/node@24',
							duration_ms: 1,
							timeout_ratio: 0,
							status: 'passed',
							exit_code_class: 'success',
							timed_out: false,
							error_kind: null,
							stdout_bytes: 0,
							stderr_bytes: 0,
						},
					],
				},
				null,
				2,
			),
		);
		writeFileSync(
			path.join(perfDir, 'summary.json'),
			JSON.stringify(
				{
					schema_version: '1',
					generated_day: '2026-05-16',
					intents: {
						verify_history_only: {
							fingerprints: {
								'sha256:history': {
									sample_count: 1,
									success_count: 1,
									timeout_count: 0,
									failure_count: 0,
									p50_duration_ms: 1,
									p75_duration_ms: 1,
									p95_duration_ms: 1,
									min_duration_ms: 1,
									max_duration_ms: 1,
									ewma_duration_ms: 1,
									last_success_duration_ms: 1,
									last_observed_day: '2026-05-16',
									runner_buckets: {},
								},
							},
						},
					},
				},
				null,
				2,
			),
		);
		writeFileSync(path.join(cacheDir, 'mustflow.sqlite'), 'not a real authority database');

		const result = runCli(projectPath, ['verify', '--reason=history_only', '--plan-only', '--json']);
		const report = JSON.parse(result.stdout);

		assert.equal(result.status, 0, result.stderr || result.stdout);
		assert.equal(report.candidates[0].intent, null);
		assert.equal(report.candidates[0].status, 'skipped');
		assert.equal(report.candidates[0].skipReason, 'no_matching_intents');
		assert.equal(report.candidates[0].candidateState, 'gap');
		assert.equal(report.candidates[0].eligibilityState, 'missing');
		assert.equal(report.candidates[0].selectionState, 'not_applicable');
		assert.equal(report.gaps[0].reason, 'history_only');
		assert.deepEqual(report.schedule.entries, []);
		assert.equal(report.decision_graph.summary.selected, 0);
		assert.equal(report.decision_graph.summary.gapCount, 1);
	} finally {
		removeTempProject(projectPath);
	}
});
