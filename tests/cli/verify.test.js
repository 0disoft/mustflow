import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, rmSync, readFileSync, writeFileSync } from 'node:fs';
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
		assert.deepEqual(report.gaps, []);
		assert.equal(existsSync(markerPath), false);
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
		assert.equal(report.gaps[0].reason, 'custom_partial');
		assert.match(report.gaps[0].detail, /No runnable command intents/);
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
		assert.equal(report.gaps[0].reason, 'missing_reason');
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
			JSON.stringify(
				{
					source: 'paths',
					files: ['README.md'],
					classifications: [
						{
							path: 'README.md',
							changeKinds: ['documentation'],
							surface: {
								kind: 'readme_page',
								category: 'documentation',
								isPublicSurface: true,
								validationReasons: ['docs_change'],
								affectedContracts: ['public documentation'],
								updatePolicy: 'update',
								driftChecks: ['command examples'],
							},
						},
					],
					classification_summary: {
						fileCount: 1,
						publicSurfaceCount: 1,
						changeKinds: ['documentation'],
						validationReasons: ['docs_change'],
						updatePolicies: ['update'],
						driftChecks: ['command examples'],
						affectedContracts: ['public documentation'],
					},
				},
				null,
				2,
			),
		);

		const result = runCli(projectPath, ['verify', '--from-plan', 'verify-plan.json', '--plan-only', '--json']);
		const report = JSON.parse(result.stdout);

		assert.equal(result.status, 0, result.stderr || result.stdout);
		assert.deepEqual(report.files, ['README.md']);
		assert.deepEqual(report.requirements[0].files, ['README.md']);
		assert.deepEqual(report.requirements[0].surfaces, ['readme_page']);
		assert.deepEqual(report.requirements[0].affectedContracts, ['public documentation']);
		assert.deepEqual(report.requirements[0].driftChecks, ['command examples']);
		assert.deepEqual(report.requirements[0].updatePolicies, ['update']);
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
			JSON.stringify({ classification_summary: { validationReasons: ['schema_verify'] } }, null, 2),
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

test('rejects conflicting verify reason inputs', () => {
	const projectPath = createTempProject();

	try {
		initProject(projectPath);
		writeFileSync(path.join(projectPath, 'verify-plan.json'), JSON.stringify({ reasons: ['schema_verify'] }));

		const result = runCli(projectPath, ['verify', '--reason', 'schema_verify', '--from-plan', 'verify-plan.json']);

		assert.equal(result.status, 1);
		assert.match(result.stderr, /Use either --reason or --from-plan, not both/);
		assert.match(result.stdout, /Usage: mf verify/);
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
