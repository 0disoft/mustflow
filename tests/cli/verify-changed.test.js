import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { test } from 'node:test';

import { createTempProject, initProject, removeTempProject, runCli } from './helpers/cli-harness.js';

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

function replaceCommands(projectPath, text) {
	const commandsPath = path.join(projectPath, '.mustflow', 'config', 'commands.toml');
	writeFileSync(commandsPath, `${text.trim()}\n`);
}

test('plans verification from current changed files', () => {
	const projectPath = createTempProject();
	const fixturePath = path.join(projectPath, 'tests', 'fixtures', 'verify-changed.txt');

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
		const classifyResult = runCli(projectPath, [
			'classify',
			'--changed',
			'--write',
			'.mustflow/state/change-classification.json',
			'--json',
		]);
		const fromClassificationResult = runCli(projectPath, [
			'verify',
			'--from-classification',
			'.mustflow/state/change-classification.json',
			'--plan-only',
			'--json',
		]);
		const fromClassificationReport = JSON.parse(fromClassificationResult.stdout);
		const changedReport = JSON.parse(changedResult.stdout);

		assert.equal(classifyResult.status, 0, classifyResult.stderr || classifyResult.stdout);
		assert.equal(fromClassificationResult.status, 0, fromClassificationResult.stderr || fromClassificationResult.stdout);
		assert.equal(changedResult.status, 0, changedResult.stderr || changedResult.stdout);
		assert.equal(fromClassificationReport.verification_plan_id, changedReport.verification_plan_id);
		assert.equal(changedReport.source, 'changed');
		assert.deepEqual(changedReport.files, ['tests/fixtures/verify-changed.txt']);
		assert.deepEqual(changedReport.classification_summary, fromClassificationReport.classification_summary);
		assert.deepEqual(
			changedReport.requirements.map((requirement) => requirement.reason),
			fromClassificationReport.requirements.map((requirement) => requirement.reason),
		);
		assert.deepEqual(changedReport.candidates, fromClassificationReport.candidates);
		assert.equal(changedReport.candidates[0].intent, 'verify_changed_fixture');
		assert.equal(changedReport.candidates[0].status, 'runnable');
		assert.equal(existsSync(path.join(projectPath, '.mustflow', 'state', 'runs', 'latest.json')), false);
	} finally {
		removeTempProject(projectPath);
	}
});

test('reports missing project-declared test selection without inferring a subset', () => {
	const projectPath = createTempProject();
	const fixturePath = path.join(projectPath, 'tests', 'fixtures', 'selection-missing.txt');

	try {
		initProject(projectPath);
		mkdirSync(path.dirname(fixturePath), { recursive: true });
		writeFileSync(fixturePath, 'before\n');
		commitProjectBaseline(projectPath);
		writeFileSync(fixturePath, 'after\n');

		const result = runCli(projectPath, ['verify', '--changed', '--plan-only', '--json']);
		const report = JSON.parse(result.stdout);

		assert.equal(result.status, 0, result.stderr || result.stdout);
		assert.equal(report.test_selection.status, 'missing');
		assert.equal(report.test_selection.authority, '.mustflow/config/test-selection.toml');
		assert.equal(report.test_selection.commandAuthority, '.mustflow/config/commands.toml');
		assert.equal(report.test_selection.grantsCommandAuthority, false);
		assert.deepEqual(report.test_selection.matches, []);
		assert.deepEqual(report.test_selection.selected, []);
		assert.ok(
			report.test_selection.notes.includes(
				'No project-declared test selection manifest exists; mustflow will not infer a user-project test subset.',
			),
		);
	} finally {
		removeTempProject(projectPath);
	}
});

test('warns when project-declared test selection rules do not match changed files', () => {
	const projectPath = createTempProject();
	const fixturePath = path.join(projectPath, 'tests', 'fixtures', 'selection-unmatched.txt');
	const selectionPath = path.join(projectPath, '.mustflow', 'config', 'test-selection.toml');

	try {
		initProject(projectPath);
		writeFileSync(
			selectionPath,
			`
schema_version = "1"

[[rules]]
id = "source-only"
risk = "medium"
reason = "Source changes use declared source tests."
match = { paths = ["src/**"], surfaces = ["implementation"] }
select = { intent = "source_related", fallback_intent = "source_fast" }
`,
		);
		mkdirSync(path.dirname(fixturePath), { recursive: true });
		writeFileSync(fixturePath, 'before\n');
		commitProjectBaseline(projectPath);
		writeFileSync(fixturePath, 'after\n');

		const result = runCli(projectPath, ['verify', '--changed', '--plan-only', '--json']);
		const report = JSON.parse(result.stdout);

		assert.equal(result.status, 0, result.stderr || result.stdout);
		assert.equal(report.test_selection.status, 'unmatched');
		assert.deepEqual(report.test_selection.matches, []);
		assert.deepEqual(report.test_selection.selected, []);
		assert.ok(
			report.test_selection.notes.includes(
				'Project-declared test selection rules did not cover the current changed files; review .mustflow/config/test-selection.toml for stale or missing rules.',
			),
		);
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

[intents.manifest_broad]
status = "configured"
lifecycle = "oneshot"
run_policy = "agent_allowed"
description = "Run broader verification."
argv = ['${process.execPath}', '-e', 'console.log("manifest broad")']
cwd = "."
timeout_seconds = 10
stdin = "closed"
success_exit_codes = [0]
writes = []
network = false
destructive = false
required_after = ["test_change"]

[intents.manifest_broad.relations]
subsumes = ["manifest_related"]
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
		assert.ok(
			report.test_selection.notes.includes(
				'Local index data and performance history may add suggestions later, but must not remove manifest-selected tests.',
			),
		);
		assert.ok(report.test_selection.notes.includes('Absence of historical failures is not evidence that a test can be omitted.'));
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
			['manifest_broad', 'manifest_related'],
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
