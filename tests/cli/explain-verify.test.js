import assert from 'node:assert/strict';
import { appendFileSync, existsSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { test } from 'node:test';
import { createTempProject, initProject, removeTempProject, runCli } from './helpers/cli-harness.js';

function appendIntent(projectPath, text) {
	appendFileSync(path.join(projectPath, '.mustflow', 'config', 'commands.toml'), `\n${text.trim()}\n`);
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

test('explains verification candidates for a reason without running commands', () => {
	const projectPath = createTempProject('mustflow-explain-verify-');
	const markerPath = path.join(projectPath, 'executed.txt');

	try {
		initProject(projectPath);
		appendIntent(
			projectPath,
			`
[intents.verify_explain_fixture]
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

		const result = runCli(projectPath, ['explain', 'verify', '--reason', 'custom_verify', '--json']);
		const report = JSON.parse(result.stdout);

		assert.equal(result.status, 0, result.stderr || result.stdout);
		assert.equal(report.topic, 'verify');
		assert.equal(report.decision.kind, 'verify');
		assert.equal(report.decision.input.reason, 'custom_verify');
		assert.equal(report.decision.input.planSource, null);
		assert.deepEqual(report.decision.verification.reasons, ['custom_verify']);
		assert.equal(report.decision.verification.runnableCount, 1);
		assert.equal(report.decision.verification.skippedCount, 0);
		assert.deepEqual(report.decision.verification.requirements[0].matchingIntents, ['verify_explain_fixture']);
		assert.equal(report.decision.verification.requirements[0].gap, null);
		assert.equal(report.decision.verification.requirements[0].candidates[0].intent, 'verify_explain_fixture');
		assert.equal(report.decision.verification.requirements[0].candidates[0].status, 'runnable');
		assert.equal(report.decision.verification.requirements[0].candidates[0].skipReason, null);
		assert.deepEqual(report.decision.verification.requirements[0].candidates[0].requiredAfter, ['custom_verify']);
		assert.equal(report.decision.verification.requirements[0].candidates[0].effectGraph.authority, 'explanation_only');
		assert.equal(
			report.decision.verification.requirements[0].candidates[0].effectGraph.commandAuthority,
			'.mustflow/config/commands.toml',
		);
		assert.equal(report.decision.verification.requirements[0].candidates[0].effectGraph.grantsCommandAuthority, false);
		assert.equal(report.decision.verification.requirements[0].candidates[0].effectGraph.status, 'missing');
		assert.equal(report.decision.verification.readModel.authority, 'evidence_only');
		assert.equal(report.decision.verification.readModel.commandAuthority, '.mustflow/config/commands.toml');
		assert.equal(report.decision.verification.readModel.grantsCommandAuthority, false);
		assert.equal(report.decision.verification.readModel.status, 'missing');
		assert.equal(report.decision.verification.readModel.planId, null);
		assert.equal(report.decision.verification.decisionGraph.root, 'verification_decision');
		assert.ok(
			report.decision.verification.decisionGraph.nodes.some(
				(node) =>
					node.kind === 'command_candidate' &&
					node.intent === 'verify_explain_fixture' &&
					node.status === 'runnable',
			),
		);
		assert.ok(
			report.decision.verification.decisionGraph.edges.some(
				(edge) => edge.kind === 'requires' && edge.to.includes('verify_explain_fixture'),
			),
		);
		assert.equal(report.decision.countsAsMustflowVerification, false);
		assert.equal(existsSync(markerPath), false);
	} finally {
		removeTempProject(projectPath);
	}
});

test('explains why verification candidates use the existing decision graph', () => {
	const projectPath = createTempProject('mustflow-explain-verify-');

	try {
		initProject(projectPath);
		appendIntent(
			projectPath,
			`
[intents.why_verify_fixture]
status = "configured"
lifecycle = "oneshot"
run_policy = "agent_allowed"
description = "Why verify fixture."
argv = ['${process.execPath}', '-e', 'console.log("why verify")']
cwd = "."
timeout_seconds = 10
stdin = "closed"
success_exit_codes = [0]
writes = []
network = false
destructive = false
required_after = ["why_verify"]
`,
		);

		const result = runCli(projectPath, ['explain', 'why', 'verify', '--reason', 'why_verify', '--json']);
		const report = JSON.parse(result.stdout);

		assert.equal(result.status, 0, result.stderr || result.stdout);
		assert.equal(report.topic, 'why');
		assert.equal(report.decision.kind, 'verify');
		assert.equal(report.decision.input.reason, 'why_verify');
		assert.deepEqual(report.decision.verification.reasons, ['why_verify']);
		assert.equal(report.decision.verification.requirements[0].candidates[0].intent, 'why_verify_fixture');
		assert.equal(report.decision.verification.decisionGraph.root, 'verification_decision');
		assert.ok(
			report.decision.verification.decisionGraph.nodes.some(
				(node) => node.kind === 'command_candidate' && node.intent === 'why_verify_fixture',
			),
		);
		assert.equal(report.decision.countsAsMustflowVerification, false);
	} finally {
		removeTempProject(projectPath);
	}
});

test('explains verification candidates from a JSON plan', () => {
	const projectPath = createTempProject('mustflow-explain-verify-');

	try {
		initProject(projectPath);
		appendIntent(
			projectPath,
			`
[intents.verify_plan_fixture]
status = "configured"
lifecycle = "oneshot"
run_policy = "agent_allowed"
description = "Plan fixture."
argv = ['${process.execPath}', '-e', 'console.log("plan ok")']
cwd = "."
timeout_seconds = 10
stdin = "closed"
success_exit_codes = [0]
writes = []
network = false
destructive = false
required_after = ["plan_verify"]
`,
		);
		writeFileSync(
			path.join(projectPath, 'verify-plan.json'),
			JSON.stringify(createClassifyPlan(projectPath, 'plan_verify'), null, 2),
		);

		const result = runCli(projectPath, ['explain', 'verify', '--from-plan', 'verify-plan.json', '--json']);
		const report = JSON.parse(result.stdout);

		assert.equal(result.status, 0, result.stderr || result.stdout);
		assert.equal(report.decision.input.reason, null);
		assert.equal(report.decision.input.planSource, 'verify-plan.json');
		assert.equal(report.decision.verification.planSource, 'verify-plan.json');
		assert.deepEqual(report.decision.verification.reasons, ['plan_verify']);
		assert.equal(report.decision.verification.requirements[0].candidates[0].intent, 'verify_plan_fixture');
	} finally {
		removeTempProject(projectPath);
	}
});

test('reports manual-only and missing verification candidates without making them runnable', () => {
	const projectPath = createTempProject('mustflow-explain-verify-');

	try {
		initProject(projectPath);
		appendIntent(
			projectPath,
			`
[intents.verify_manual_fixture]
status = "manual_only"
description = "Manual verification."
reason = "Needs a human."
required_after = ["manual_verify"]
`,
		);

		const manualResult = runCli(projectPath, ['explain', 'verify', '--reason', 'manual_verify', '--json']);
		const manualReport = JSON.parse(manualResult.stdout);
		const missingResult = runCli(projectPath, ['explain', 'verify', '--reason', 'missing_verify', '--json']);
		const missingReport = JSON.parse(missingResult.stdout);

		assert.equal(manualResult.status, 0, manualResult.stderr || manualResult.stdout);
		assert.equal(manualReport.decision.verification.runnableCount, 0);
		assert.equal(manualReport.decision.verification.requirements[0].candidates[0].intent, 'verify_manual_fixture');
		assert.equal(manualReport.decision.verification.requirements[0].candidates[0].status, 'skipped');
		assert.equal(manualReport.decision.verification.requirements[0].candidates[0].skipReason, 'status_not_configured');
		assert.equal(manualReport.decision.verification.requirements[0].candidates[0].detail, 'Needs a human.');
		assert.match(manualReport.decision.verification.requirements[0].gap, /No runnable command intents/);
		assert.ok(
			manualReport.decision.verification.decisionGraph.nodes.some(
				(node) =>
					node.kind === 'command_candidate' &&
					node.intent === 'verify_manual_fixture' &&
					node.status === 'manual_only',
			),
		);

		assert.equal(missingResult.status, 0, missingResult.stderr || missingResult.stdout);
		assert.equal(missingReport.decision.verification.requirements[0].candidates[0].intent, null);
		assert.equal(missingReport.decision.verification.requirements[0].candidates[0].skipReason, 'no_matching_intents');
		assert.match(missingReport.decision.verification.requirements[0].gap, /No runnable command intents/);
		assert.ok(
			missingReport.decision.verification.decisionGraph.nodes.some(
				(node) => node.kind === 'command_candidate' && node.intent === null && node.status === 'unknown',
			),
		);
	} finally {
		removeTempProject(projectPath);
	}
});

test('reports invalid classification report inputs for explain verify', () => {
	const projectPath = createTempProject('mustflow-explain-verify-');

	try {
		initProject(projectPath);
		writeFileSync(path.join(projectPath, 'invalid-plan.json'), '{');
		writeFileSync(
			path.join(projectPath, 'loose-plan.json'),
			JSON.stringify({ classification_summary: { validationReasons: ['plan_verify'] } }, null, 2),
		);

		const missingResult = runCli(projectPath, ['explain', 'verify', '--from-plan', 'missing-plan.json']);
		const invalidResult = runCli(projectPath, ['explain', 'verify', '--from-plan', 'invalid-plan.json']);
		const looseResult = runCli(projectPath, ['explain', 'verify', '--from-plan', 'loose-plan.json']);

		assert.equal(missingResult.status, 1);
		assert.match(missingResult.stderr, /Classification report must be a readable JSON file/);
		assert.match(missingResult.stdout, /Usage: mf explain/);
		assert.equal(invalidResult.status, 1);
		assert.match(invalidResult.stderr, /Classification report must be a readable JSON file/);
		assert.match(invalidResult.stdout, /Usage: mf explain/);
		assert.equal(looseResult.status, 1);
		assert.match(looseResult.stderr, /Verification input must be an mf classify report/);
		assert.match(looseResult.stdout, /Usage: mf explain/);
	} finally {
		removeTempProject(projectPath);
	}
});

test('reports stale local-index command-effect context for explain verify', () => {
	const projectPath = createTempProject('mustflow-explain-verify-');

	try {
		initProject(projectPath);

		const indexResult = runCli(projectPath, ['index', '--json']);
		assert.equal(indexResult.status, 0, indexResult.stderr || indexResult.stdout);

		appendIntent(
			projectPath,
			`
[intents.verify_stale_fixture]
status = "configured"
lifecycle = "oneshot"
run_policy = "agent_allowed"
description = "Stale local-index fixture."
argv = ['${process.execPath}', '-e', 'console.log("stale ok")']
cwd = "."
timeout_seconds = 10
stdin = "closed"
success_exit_codes = [0]
writes = []
network = false
destructive = false
required_after = ["stale_verify"]
`,
		);

		const result = runCli(projectPath, ['explain', 'verify', '--reason', 'stale_verify', '--json']);
		const report = JSON.parse(result.stdout);
		const candidate = report.decision.verification.requirements[0].candidates[0];

		assert.equal(result.status, 0, result.stderr || result.stdout);
		assert.equal(candidate.intent, 'verify_stale_fixture');
		assert.equal(candidate.effectGraph.status, 'stale');
		assert.equal(candidate.effectGraph.indexFresh, false);
		assert.ok(candidate.effectGraph.stalePaths.includes('.mustflow/config/commands.toml'));
		assert.match(candidate.effectGraph.refreshHint, /mf index/);
		assert.equal(report.decision.verification.readModel.status, 'stale');
		assert.equal(report.decision.verification.readModel.indexFresh, false);
		assert.ok(report.decision.verification.readModel.stalePaths.includes('.mustflow/config/commands.toml'));
		assert.match(report.decision.verification.readModel.refreshHint, /mf index/);
	} finally {
		removeTempProject(projectPath);
	}
});
