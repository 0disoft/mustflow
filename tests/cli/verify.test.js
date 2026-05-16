import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, rmSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

const projectRoot = path.resolve(fileURLToPath(new URL('../..', import.meta.url)));
const cliPath = path.join(projectRoot, 'dist', 'cli', 'index.js');

function createTempProject() {
	return mkdtempSync(path.join(tmpdir(), 'mustflow-verify-'));
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

function appendIntent(projectPath, text) {
	const commandsPath = path.join(projectPath, '.mustflow', 'config', 'commands.toml');
	const commands = readFileSync(commandsPath, 'utf8');
	writeFileSync(commandsPath, `${commands}\n${text.trim()}\n`);
}

function replaceCommands(projectPath, text) {
	const commandsPath = path.join(projectPath, '.mustflow', 'config', 'commands.toml');
	writeFileSync(commandsPath, `${text.trim()}\n`);
}

function runGit(cwd, args) {
	const result = spawnSync('git', args, { cwd, encoding: 'utf8' });
	assert.equal(result.status, 0, result.stderr || result.stdout);
}

function commitProjectBaseline(projectPath) {
	runGit(projectPath, ['init']);
	runGit(projectPath, ['config', 'user.email', 'test@example.com']);
	runGit(projectPath, ['config', 'user.name', 'Test User']);
	runGit(projectPath, ['add', '.']);
	runGit(projectPath, ['commit', '-m', 'init']);
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

test('runs configured verification intents for a reason', () => {
	const projectPath = createTempProject();

	try {
		initProject(projectPath);
		appendIntent(
			projectPath,
			`
[intents.verify_echo]
status = "configured"
lifecycle = "oneshot"
run_policy = "agent_allowed"
description = "Print a verification message."
argv = ['${process.execPath}', '-e', 'console.log("verify ok")']
cwd = "."
timeout_seconds = 10
stdin = "closed"
success_exit_codes = [0]
writes = []
network = false
destructive = false
required_after = ["custom_verify"]
`,
		);

		const result = runCli(projectPath, ['verify', '--reason', 'custom_verify', '--json']);
		const report = JSON.parse(result.stdout);

		assert.equal(result.status, 0, result.stderr || result.stdout);
		assert.equal(report.command, 'verify');
		assert.equal(report.reason, 'custom_verify');
		assert.deepEqual(report.reasons, ['custom_verify']);
		assert.equal(report.plan_source, null);
		assert.equal(report.status, 'passed');
		assert.deepEqual(report.summary, {
			matched: 1,
			ran: 1,
			passed: 1,
			failed: 0,
			skipped: 0,
		});
		assert.equal(report.results[0].intent, 'verify_echo');
		assert.equal(report.results[0].status, 'passed');
		assert.equal(report.results[0].receipt.intent, 'verify_echo');
		assert.match(report.results[0].receipt.stdout.tail, /verify ok/);
		const manifestPath = path.join(projectPath, '.mustflow', 'state', 'runs', 'verify-latest', 'manifest.json');
		const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
		const receiptPath = path.join(projectPath, manifest.receipts[0].receipt_path);
		const perIntentReceipt = JSON.parse(readFileSync(receiptPath, 'utf8'));
		const latest = JSON.parse(readFileSync(path.join(projectPath, '.mustflow', 'state', 'runs', 'latest.json'), 'utf8'));

		assert.equal(manifest.command, 'verify');
		assert.equal(manifest.status, 'passed');
		assert.deepEqual(manifest.reasons, ['custom_verify']);
		assert.equal(manifest.receipts[0].intent, 'verify_echo');
		assert.equal(manifest.receipts[0].status, 'passed');
		assert.match(manifest.receipts[0].receipt_path, /\.mustflow\/state\/runs\/verify-latest\/intents\/001-verify_echo\.json/u);
		assert.equal(perIntentReceipt.intent, 'verify_echo');
		assert.equal(perIntentReceipt.receipt_path, manifest.receipts[0].receipt_path);
		assert.match(perIntentReceipt.stdout.tail, /verify ok/);
		assert.equal(latest.command, 'verify');
		assert.equal(latest.kind, 'verify_run_summary');
		assert.equal(latest.status, 'passed');
		assert.equal(latest.manifest_path, '.mustflow/state/runs/verify-latest/manifest.json');
	} finally {
		removeTempProject(projectPath);
	}
});

test('plans verification from current changed files', () => {
	const projectPath = createTempProject();
	const fixturePath = path.join(projectPath, 'tests', 'fixtures', 'verify-changed.txt');
	const planPath = path.join(projectPath, '.mustflow', 'state', 'change-plan.json');

	try {
		initProject(projectPath);
		replaceCommands(
			projectPath,
			`
[intents.verify_changed_fixture]
status = "configured"
lifecycle = "oneshot"
run_policy = "agent_allowed"
description = "Verify changed fixture."
argv = ['${process.execPath}', '-e', 'console.log("fixture ok")']
cwd = "."
timeout_seconds = 10
stdin = "closed"
success_exit_codes = [0]
writes = []
network = false
destructive = false
required_after = ["test_change"]
`,
		);
		mkdirSync(path.dirname(fixturePath), { recursive: true });
		writeFileSync(fixturePath, 'before\n');
		commitProjectBaseline(projectPath);
		writeFileSync(fixturePath, 'after\n');

		const changedResult = runCli(projectPath, ['verify', '--changed', '--plan-only', '--json']);
		const classifyResult = runCli(projectPath, ['classify', '--changed', '--json']);
		mkdirSync(path.dirname(planPath), { recursive: true });
		writeFileSync(planPath, classifyResult.stdout);
		const fromPlanResult = runCli(projectPath, [
			'verify',
			'--from-plan',
			'.mustflow/state/change-plan.json',
			'--plan-only',
			'--json',
		]);
		const fromPlanReport = JSON.parse(fromPlanResult.stdout);
		const changedReport = JSON.parse(changedResult.stdout);

		assert.equal(classifyResult.status, 0, classifyResult.stderr || classifyResult.stdout);
		assert.equal(fromPlanResult.status, 0, fromPlanResult.stderr || fromPlanResult.stdout);
		assert.equal(changedResult.status, 0, changedResult.stderr || changedResult.stdout);
		assert.equal(changedReport.source, 'changed');
		assert.deepEqual(changedReport.files, ['tests/fixtures/verify-changed.txt']);
		assert.deepEqual(changedReport.classification_summary, fromPlanReport.classification_summary);
		assert.deepEqual(
			changedReport.requirements.map((requirement) => requirement.reason),
			fromPlanReport.requirements.map((requirement) => requirement.reason),
		);
		assert.deepEqual(changedReport.candidates, fromPlanReport.candidates);
		assert.equal(changedReport.candidates[0].intent, 'verify_changed_fixture');
		assert.equal(changedReport.candidates[0].status, 'runnable');
		assert.equal(existsSync(path.join(projectPath, '.mustflow', 'state', 'runs', 'latest.json')), false);
	} finally {
		removeTempProject(projectPath);
	}
});

test('treats project-declared test selection matches as a minimum selected set', () => {
	const projectPath = createTempProject();
	const fixturePath = path.join(projectPath, 'tests', 'fixtures', 'selection-manifest.txt');
	const selectionPath = path.join(projectPath, '.mustflow', 'config', 'test-selection.toml');

	try {
		initProject(projectPath);
		replaceCommands(
			projectPath,
			`
[intents.manifest_related]
status = "configured"
lifecycle = "oneshot"
run_policy = "agent_allowed"
description = "Run project-declared related tests."
argv = ['${process.execPath}', '-e', 'console.log("manifest related")']
cwd = "."
timeout_seconds = 10
stdin = "closed"
success_exit_codes = [0]
writes = []
network = false
destructive = false

[intents.manifest_fast]
status = "configured"
lifecycle = "oneshot"
run_policy = "agent_allowed"
description = "Run project-declared fast fallback."
argv = ['${process.execPath}', '-e', 'console.log("manifest fast")']
cwd = "."
timeout_seconds = 10
stdin = "closed"
success_exit_codes = [0]
writes = []
network = false
destructive = false
`,
		);
		writeFileSync(
			selectionPath,
			`
schema_version = "1"

[[rules]]
id = "fixture-selection"
risk = "medium"
reason = "Fixture changes use the project-declared related tests."
match = { paths = ["tests/fixtures/**"], surfaces = ["test_fixture"] }
select = { intent = "manifest_related", fallback_intent = "manifest_fast", test_targets = ["tests/fixtures"] }
`,
		);
		mkdirSync(path.dirname(fixturePath), { recursive: true });
		writeFileSync(fixturePath, 'before\n');
		commitProjectBaseline(projectPath);
		writeFileSync(fixturePath, 'after\n');

		const result = runCli(projectPath, ['verify', '--changed', '--plan-only', '--json']);
		const report = JSON.parse(result.stdout);
		const candidate = report.candidates.find((item) => item.intent === 'manifest_related');

		assert.equal(result.status, 0, result.stderr || result.stdout);
		assert.equal(report.test_selection.status, 'matched');
		assert.equal(report.test_selection.grantsCommandAuthority, false);
		assert.equal(report.test_selection.commandAuthority, '.mustflow/config/commands.toml');
		assert.deepEqual(report.test_selection.matches[0], {
			ruleId: 'fixture-selection',
			risk: 'medium',
			reason: 'Fixture changes use the project-declared related tests.',
			files: ['tests/fixtures/selection-manifest.txt'],
			surfaces: ['test_fixture'],
			intent: 'manifest_related',
			fallbackIntent: 'manifest_fast',
			testTargets: ['tests/fixtures'],
		});
		assert.deepEqual(report.test_selection.selected[0], {
			ruleId: 'fixture-selection',
			reason: 'test_change',
			intent: 'manifest_related',
			role: 'primary',
			status: 'runnable',
			skipReason: null,
			detail: 'Project-declared test selection rule "fixture-selection".',
			testTargets: ['tests/fixtures'],
			appliedTestTargets: [],
			testTargetsApplied: false,
		});
		assert.equal(candidate.status, 'runnable');
		assert.equal(candidate.selectionState, 'selected');
		assert.deepEqual(report.gaps, []);
		assert.deepEqual(
			report.schedule.entries.map((entry) => entry.intent),
			['manifest_related'],
		);
	} finally {
		removeTempProject(projectPath);
	}
});

test('passes project-declared test targets only when selected intent opts in', () => {
	const projectPath = createTempProject();
	const fixturePath = path.join(projectPath, 'tests', 'fixtures', 'selection-targets.txt');
	const targetsPath = path.join(projectPath, 'targets.json');
	const selectionPath = path.join(projectPath, '.mustflow', 'config', 'test-selection.toml');

	try {
		initProject(projectPath);
		replaceCommands(
			projectPath,
			`
[intents.manifest_related]
status = "configured"
lifecycle = "oneshot"
run_policy = "agent_allowed"
description = "Run project-declared related tests with targets."
argv = ['${process.execPath}', '-e', 'require("node:fs").writeFileSync("targets.json", JSON.stringify(process.argv.slice(1)))']
cwd = "."
timeout_seconds = 10
stdin = "closed"
success_exit_codes = [0]
writes = ["targets.json"]
network = false
destructive = false

[intents.manifest_related.selection]
accepts_test_targets = true

[intents.manifest_fast]
status = "configured"
lifecycle = "oneshot"
run_policy = "agent_allowed"
description = "Run project-declared fast fallback."
argv = ['${process.execPath}', '-e', 'console.log("manifest fast")']
cwd = "."
timeout_seconds = 10
stdin = "closed"
success_exit_codes = [0]
writes = []
network = false
destructive = false
`,
		);
		writeFileSync(
			selectionPath,
			`
schema_version = "1"

[[rules]]
id = "fixture-selection"
risk = "medium"
reason = "Fixture changes use the project-declared related tests."
match = { paths = ["tests/fixtures/**"], surfaces = ["test_fixture"] }
select = { intent = "manifest_related", fallback_intent = "manifest_fast", test_targets = ["tests/fixtures"] }
`,
		);
		mkdirSync(path.dirname(fixturePath), { recursive: true });
		writeFileSync(fixturePath, 'before\n');
		commitProjectBaseline(projectPath);
		writeFileSync(fixturePath, 'after\n');

		const planResult = runCli(projectPath, ['verify', '--changed', '--plan-only', '--json']);
		const planReport = JSON.parse(planResult.stdout);
		const result = runCli(projectPath, ['verify', '--changed', '--json']);
		const report = JSON.parse(result.stdout);
		const targets = JSON.parse(readFileSync(targetsPath, 'utf8'));

		assert.equal(planResult.status, 0, planResult.stderr || planResult.stdout);
		assert.equal(result.status, 0, result.stderr || result.stdout);
		assert.deepEqual(targets, ['tests/fixtures']);
		assert.deepEqual(planReport.test_selection.selected[0].appliedTestTargets, ['tests/fixtures']);
		assert.equal(planReport.test_selection.selected[0].testTargetsApplied, true);
		assert.equal(report.results[0].receipt.performance.selection.strategy, 'project_test_selection');
		assert.equal(report.results[0].receipt.performance.selection.selected_target_count, 1);
		assert.ok(report.results[0].receipt.argv.includes('tests/fixtures'));
	} finally {
		removeTempProject(projectPath);
	}
});

test('runs verification from current changed files', () => {
	const projectPath = createTempProject();
	const fixturePath = path.join(projectPath, 'tests', 'fixtures', 'verify-changed.txt');
	const markerPath = path.join(projectPath, 'executed.txt');

	try {
		initProject(projectPath);
		replaceCommands(
			projectPath,
			`
[intents.verify_changed_fixture]
status = "configured"
lifecycle = "oneshot"
run_policy = "agent_allowed"
description = "Verify changed fixture."
argv = ['${process.execPath}', '-e', 'require("node:fs").writeFileSync("executed.txt", "ran")']
cwd = "."
timeout_seconds = 10
stdin = "closed"
success_exit_codes = [0]
writes = ["executed.txt"]
network = false
destructive = false
required_after = ["test_change"]
`,
		);
		mkdirSync(path.dirname(fixturePath), { recursive: true });
		writeFileSync(fixturePath, 'before\n');
		commitProjectBaseline(projectPath);
		writeFileSync(fixturePath, 'after\n');

		const result = runCli(projectPath, ['verify', '--changed', '--json']);
		const report = JSON.parse(result.stdout);

		assert.equal(result.status, 0, result.stderr || result.stdout);
		assert.equal(report.plan_source, 'changed');
		assert.deepEqual(report.reasons, ['test_change']);
		assert.equal(report.status, 'passed');
		assert.equal(report.summary.ran, 1);
		assert.equal(report.results[0].intent, 'verify_changed_fixture');
		assert.equal(existsSync(markerPath), true);
	} finally {
		removeTempProject(projectPath);
	}
});

test('plans verification for unclassified changed files with unknown_change', () => {
	const projectPath = createTempProject();
	const fixturePath = path.join(projectPath, 'unmapped', 'verify-changed.custom');

	try {
		initProject(projectPath);
		replaceCommands(
			projectPath,
			`
[intents.verify_unknown_change]
status = "configured"
lifecycle = "oneshot"
run_policy = "agent_allowed"
description = "Verify unclassified changed paths."
argv = ['${process.execPath}', '-e', 'console.log("unknown ok")']
cwd = "."
timeout_seconds = 10
stdin = "closed"
success_exit_codes = [0]
writes = []
network = false
destructive = false
required_after = ["unknown_change"]
`,
		);
		mkdirSync(path.dirname(fixturePath), { recursive: true });
		writeFileSync(fixturePath, 'before\n');
		commitProjectBaseline(projectPath);
		writeFileSync(fixturePath, 'after\n');

		const result = runCli(projectPath, ['verify', '--changed', '--plan-only', '--json']);
		const report = JSON.parse(result.stdout);

		assert.equal(result.status, 0, result.stderr || result.stdout);
		assert.equal(report.source, 'changed');
		assert.deepEqual(report.files, ['unmapped/verify-changed.custom']);
		assert.deepEqual(report.classification_summary.validationReasons, ['unknown_change']);
		assert.equal(report.requirements[0].reason, 'unknown_change');
		assert.deepEqual(report.requirements[0].files, ['unmapped/verify-changed.custom']);
		assert.deepEqual(report.requirements[0].surfaces, ['unclassified_path']);
		assert.deepEqual(report.requirements[0].affectedContracts, ['unclassified repository path']);
		assert.deepEqual(report.requirements[0].driftChecks, ['classification rule coverage']);
		assert.equal(report.candidates[0].intent, 'verify_unknown_change');
		assert.equal(report.candidates[0].status, 'runnable');
		assert.deepEqual(report.gaps, []);
	} finally {
		removeTempProject(projectPath);
	}
});

test('writes changed-file classification plan before verifying', () => {
	const projectPath = createTempProject();
	const fixturePath = path.join(projectPath, 'tests', 'fixtures', 'verify-changed.txt');
	const planPath = path.join(projectPath, '.mustflow', 'state', 'change-plan.json');

	try {
		initProject(projectPath);
		replaceCommands(
			projectPath,
			`
[intents.verify_changed_fixture]
status = "configured"
lifecycle = "oneshot"
run_policy = "agent_allowed"
description = "Verify changed fixture."
argv = ['${process.execPath}', '-e', 'console.log("fixture ok")']
cwd = "."
timeout_seconds = 10
stdin = "closed"
success_exit_codes = [0]
writes = []
network = false
destructive = false
required_after = ["test_change"]
`,
		);
		mkdirSync(path.dirname(fixturePath), { recursive: true });
		writeFileSync(fixturePath, 'before\n');
		commitProjectBaseline(projectPath);
		writeFileSync(fixturePath, 'after\n');

		const result = runCli(projectPath, [
			'verify',
			'--changed',
			'--write-plan',
			'.mustflow/state/change-plan.json',
			'--plan-only',
			'--json',
		]);
		const writtenPlan = JSON.parse(readFileSync(planPath, 'utf8'));

		assert.equal(result.status, 0, result.stderr || result.stdout);
		assert.equal(writtenPlan.command, 'classify');
		assert.equal(writtenPlan.source, 'changed');
		assert.deepEqual(writtenPlan.files, ['tests/fixtures/verify-changed.txt']);
		assert.deepEqual(writtenPlan.summary.validationReasons, ['test_change']);
	} finally {
		removeTempProject(projectPath);
	}
});

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

test('reports plan-only gaps when no intents match the reason', () => {
	const projectPath = createTempProject();

	try {
		initProject(projectPath);

		const result = runCli(projectPath, ['verify', '--reason', 'missing_reason', '--plan-only', '--json']);
		const report = JSON.parse(result.stdout);

		assert.equal(result.status, 0, result.stderr || result.stdout);
		assert.equal(report.candidates[0].reason, 'missing_reason');
		assert.equal(report.candidates[0].intent, null);
		assert.equal(report.candidates[0].status, 'skipped');
		assert.equal(report.candidates[0].skipReason, 'no_matching_intents');
		assert.equal(report.candidates[0].candidateState, 'gap');
		assert.equal(report.candidates[0].eligibilityState, 'missing');
		assert.equal(report.candidates[0].selectionState, 'not_applicable');
		assert.equal(report.gaps[0].reason, 'missing_reason');
		assert.equal(
			report.decision_graph.nodes.some(
				(node) => node.kind === 'command_candidate' && node.intent === null && node.status === 'unknown',
			),
			true,
		);
		assert.equal(report.decision_graph.summary.unknown >= 2, true);
	} finally {
		removeTempProject(projectPath);
	}
});

test('rejects plan-only verify output without json', () => {
	const projectPath = createTempProject();

	try {
		initProject(projectPath);

		const result = runCli(projectPath, ['verify', '--reason', 'custom_verify', '--plan-only']);

		assert.equal(result.status, 1);
		assert.match(result.stderr, /--plan-only requires --json/);
		assert.match(result.stdout, /Usage: mf verify/);
	} finally {
		removeTempProject(projectPath);
	}
});

test('preserves classification details in plan-only verify output from a JSON plan', () => {
	const projectPath = createTempProject();

	try {
		initProject(projectPath);
		appendIntent(
			projectPath,
			`
[intents.verify_docs_plan]
status = "configured"
lifecycle = "oneshot"
run_policy = "agent_allowed"
description = "Verify docs plan."
argv = ['${process.execPath}', '-e', 'console.log("docs")']
cwd = "."
timeout_seconds = 10
stdin = "closed"
success_exit_codes = [0]
writes = []
network = false
destructive = false
required_after = ["docs_change"]
`,
		);
		writeFileSync(
			path.join(projectPath, 'verify-plan.json'),
			JSON.stringify(createClassifyPlan(projectPath, 'docs_change'), null, 2),
		);

		const indexResult = runCli(projectPath, ['index', '--json']);
		const result = runCli(projectPath, ['verify', '--from-plan', 'verify-plan.json', '--plan-only', '--json']);
		const report = JSON.parse(result.stdout);

		assert.equal(indexResult.status, 0, indexResult.stderr || indexResult.stdout);
		assert.equal(result.status, 0, result.stderr || result.stdout);
		assert.deepEqual(report.files, ['README.md']);
		assert.deepEqual(report.requirements[0].files, ['README.md']);
		assert.deepEqual(report.requirements[0].surfaces, ['readme_page']);
		assert.deepEqual(report.requirements[0].affectedContracts, ['public documentation']);
		assert.deepEqual(report.requirements[0].driftChecks, ['command examples']);
		assert.deepEqual(report.requirements[0].updatePolicies, ['update']);
		assert.equal(report.requirements[0].surfaceReadModels[0].status, 'fresh');
		assert.equal(report.requirements[0].surfaceReadModels[0].match.ruleId, 'readme_page');
		assert.deepEqual(report.requirements[0].surfaceReadModels[0].match.surface.validationReasons, [
			'docs_change',
			'copy_change',
		]);
		assert.equal(
			report.candidates.some((candidate) => candidate.intent === 'verify_docs_plan' && candidate.status === 'runnable'),
			true,
		);
	} finally {
		removeTempProject(projectPath);
	}
});

test('runs verification intents selected from a JSON plan', () => {
	const projectPath = createTempProject();

	try {
		initProject(projectPath);
		appendIntent(
			projectPath,
			`
[intents.verify_from_plan]
status = "configured"
lifecycle = "oneshot"
run_policy = "agent_allowed"
description = "Print a verify from plan message."
argv = ['${process.execPath}', '-e', 'console.log("verify from plan")']
cwd = "."
timeout_seconds = 10
stdin = "closed"
success_exit_codes = [0]
writes = []
network = false
destructive = false
required_after = ["schema_verify"]
`,
		);
		writeFileSync(
			path.join(projectPath, 'verify-plan.json'),
			JSON.stringify(createClassifyPlan(projectPath, 'schema_verify', 'schemas/classify-report.schema.json'), null, 2),
		);

		const result = runCli(projectPath, ['verify', '--from-plan', 'verify-plan.json', '--json']);
		const report = JSON.parse(result.stdout);

		assert.equal(result.status, 0, result.stderr || result.stdout);
		assert.equal(report.reason, 'schema_verify');
		assert.deepEqual(report.reasons, ['schema_verify']);
		assert.equal(report.plan_source, 'verify-plan.json');
		assert.equal(report.status, 'passed');
		assert.equal(report.summary.ran, 1);
		assert.equal(report.results[0].intent, 'verify_from_plan');
	} finally {
		removeTempProject(projectPath);
	}
});

test('rejects loose verification plans that are not classify output', () => {
	const projectPath = createTempProject();

	try {
		initProject(projectPath);
		writeFileSync(
			path.join(projectPath, 'verify-plan.json'),
			JSON.stringify({ classification_summary: { validationReasons: ['schema_verify'] } }, null, 2),
		);

		const result = runCli(projectPath, ['verify', '--from-plan', 'verify-plan.json', '--json']);

		assert.equal(result.status, 1);
		assert.match(result.stderr, /Verification plan must be produced by mf classify --json/);
		assert.match(result.stdout, /Usage: mf verify/);
	} finally {
		removeTempProject(projectPath);
	}
});

test('rejects classify plans from a different mustflow root', () => {
	const projectPath = createTempProject();

	try {
		initProject(projectPath);
		writeFileSync(
			path.join(projectPath, 'verify-plan.json'),
			JSON.stringify({ ...createClassifyPlan(projectPath, 'schema_verify'), mustflow_root: path.join(projectPath, 'other') }, null, 2),
		);

		const result = runCli(projectPath, ['verify', '--from-plan', 'verify-plan.json', '--json']);

		assert.equal(result.status, 1);
		assert.match(result.stderr, /Verification plan must come from this mustflow root/);
		assert.match(result.stdout, /Usage: mf verify/);
	} finally {
		removeTempProject(projectPath);
	}
});

test('reports blocked verification when matching intents are not runnable', () => {
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

		const result = runCli(projectPath, ['verify', '--reason=custom_partial', '--json']);
		const report = JSON.parse(result.stdout);

		assert.equal(result.status, 1);
		assert.equal(report.status, 'blocked');
		assert.equal(report.summary.matched, 1);
		assert.equal(report.summary.ran, 0);
		assert.equal(report.summary.skipped, 1);
		assert.equal(report.results[0].intent, 'verify_manual');
		assert.equal(report.results[0].status, 'skipped');
		assert.equal(report.results[0].reason, 'status_not_configured');
		assert.equal(report.results[0].detail, 'Needs a human.');
	} finally {
		removeTempProject(projectPath);
	}
});

test('reports blocked verification when no intents match the reason', () => {
	const projectPath = createTempProject();

	try {
		initProject(projectPath);

		const result = runCli(projectPath, ['verify', '--reason', 'missing_reason', '--json']);
		const report = JSON.parse(result.stdout);

		assert.equal(result.status, 1);
		assert.equal(report.status, 'blocked');
		assert.equal(report.summary.matched, 0);
		assert.equal(report.summary.ran, 0);
		assert.equal(report.results[0].intent, null);
		assert.equal(report.results[0].reason, 'no_matching_intents');

		const planOnlyResult = runCli(projectPath, ['verify', '--reason', 'preference_only', '--plan-only', '--json']);
		const planOnlyReport = JSON.parse(planOnlyResult.stdout);

		assert.equal(planOnlyResult.status, 0, planOnlyResult.stderr || planOnlyResult.stdout);
		assert.equal(planOnlyReport.candidates[0].intent, null);
		assert.equal(planOnlyReport.candidates[0].skipReason, 'no_matching_intents');
	} finally {
		removeTempProject(projectPath);
	}
});

test('does not treat verification preferences as command authority', () => {
	const projectPath = createTempProject();

	try {
		initProject(projectPath);
		const preferencesPath = path.join(projectPath, '.mustflow', 'config', 'preferences.toml');
		const preferences = readFileSync(preferencesPath, 'utf8').replace(
			'report_skipped = true',
			[
				'report_skipped = true',
				'command_intents = ["test"]',
				'required_after = ["preference_only"]',
				'run_policy = "agent_allowed"',
			].join('\n'),
		);
		writeFileSync(preferencesPath, preferences);

		const result = runCli(projectPath, ['verify', '--reason', 'preference_only', '--json']);
		const report = JSON.parse(result.stdout);

		assert.equal(result.status, 1);
		assert.equal(report.status, 'blocked');
		assert.equal(report.summary.matched, 0);
		assert.equal(report.summary.ran, 0);
		assert.equal(report.results[0].intent, null);
		assert.equal(report.results[0].reason, 'no_matching_intents');
	} finally {
		removeTempProject(projectPath);
	}
});

test('does not treat source anchors or local index rows as verification authority', () => {
	const projectPath = createTempProject();

	try {
		initProject(projectPath);
		mkdirSync(path.join(projectPath, 'src'));
		writeFileSync(
			path.join(projectPath, 'src', 'anchor-authority.ts'),
			`/**
 * mf:anchor verify.anchor-only
 * purpose: Mention source_anchor_only as searchable navigation metadata.
 * search: source_anchor_only, verification
 * invariant: Source anchors remain navigation hints only.
 * risk: config
 */
export function anchorOnly() {
	return true;
}
`,
		);

		const indexResult = runCli(projectPath, ['index', '--source', '--json']);
		const verifyResult = runCli(projectPath, ['verify', '--reason', 'source_anchor_only', '--plan-only', '--json']);
		const report = JSON.parse(verifyResult.stdout);

		assert.equal(indexResult.status, 0, indexResult.stderr || indexResult.stdout);
		assert.equal(verifyResult.status, 0, verifyResult.stderr || verifyResult.stdout);
		assert.equal(report.candidates[0].intent, null);
		assert.equal(report.candidates[0].status, 'skipped');
		assert.equal(report.candidates[0].skipReason, 'no_matching_intents');
		assert.equal(report.gaps[0].reason, 'source_anchor_only');
	} finally {
		removeTempProject(projectPath);
	}
});

test('rejects conflicting verify reason inputs', () => {
	const projectPath = createTempProject();

	try {
		initProject(projectPath);
		writeFileSync(path.join(projectPath, 'verify-plan.json'), JSON.stringify({ reasons: ['schema_verify'] }));

		const result = runCli(projectPath, ['verify', '--reason', 'schema_verify', '--from-plan', 'verify-plan.json']);

		assert.equal(result.status, 1);
		assert.match(result.stderr, /Use only one of --reason, --from-plan, or --changed/);
		assert.match(result.stdout, /Usage: mf verify/);

		const changedResult = runCli(projectPath, ['verify', '--changed', '--reason', 'schema_verify', '--json']);

		assert.equal(changedResult.status, 1);
		assert.match(changedResult.stderr, /Use only one of --reason, --from-plan, or --changed/);
		assert.match(changedResult.stdout, /Usage: mf verify/);
	} finally {
		removeTempProject(projectPath);
	}
});

test('rejects verify write-plan without changed mode', () => {
	const projectPath = createTempProject();

	try {
		initProject(projectPath);

		const result = runCli(projectPath, ['verify', '--reason', 'schema_verify', '--write-plan', 'change-plan.json', '--json']);

		assert.equal(result.status, 1);
		assert.match(result.stderr, /--write-plan requires --changed/);
		assert.match(result.stdout, /Usage: mf verify/);
	} finally {
		removeTempProject(projectPath);
	}
});

test('rejects changed verify plan writes outside the mustflow root', () => {
	const projectPath = createTempProject();

	try {
		initProject(projectPath);

		const result = runCli(projectPath, ['verify', '--changed', '--write-plan', '../change-plan.json', '--json']);

		assert.equal(result.status, 1);
		assert.match(result.stderr, /Verification plan path must stay inside the mustflow root/);
	} finally {
		removeTempProject(projectPath);
	}
});

test('fails verify when reason is missing', () => {
	const result = runCli(projectRoot, ['verify', '--json']);

	assert.equal(result.status, 1);
	assert.match(result.stderr, /Missing verification reason/);
	assert.match(result.stdout, /Usage: mf verify/);
});

test('rejects verify plans outside the mustflow root', () => {
	const projectPath = createTempProject();
	const outsidePlanPath = path.join(tmpdir(), `mustflow-outside-plan-${Date.now()}.json`);

	try {
		initProject(projectPath);
		writeFileSync(outsidePlanPath, JSON.stringify({ reasons: ['schema_verify'] }));

		const result = runCli(projectPath, ['verify', '--from-plan', outsidePlanPath]);

		assert.equal(result.status, 1);
		assert.match(result.stderr, /Verification plan path must stay inside the mustflow root/);
	} finally {
		rmSync(outsidePlanPath, { force: true });
		removeTempProject(projectPath);
	}
});
