import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { test } from 'node:test';

import { runEvidence } from '../../dist/cli/commands/evidence.js';
import {
	createTempProject,
	removeTempProject,
	runCliCommand,
} from './helpers/cli-harness.js';

function createEvidenceProject() {
	const projectPath = createTempProject('mustflow-evidence-');
	mkdirSync(path.join(projectPath, '.mustflow', 'config'), { recursive: true });
	writeFileSync(path.join(projectPath, '.mustflow', 'config', 'mustflow.toml'), 'version = 1\n');
	writeFileSync(path.join(projectPath, '.gitignore'), '.mustflow/state/\n');
	return projectPath;
}

function createEvidenceCommandProject() {
	const projectPath = createEvidenceProject();
	writeFileSync(
		path.join(projectPath, '.mustflow', 'config', 'commands.toml'),
		`schema_version = "1"

[intents.test_related]
status = "configured"
lifecycle = "oneshot"
run_policy = "agent_allowed"
description = "Run related tests."
argv = ["node", "-e", "process.exit(0)"]
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
	return projectPath;
}

function runCli(cwd, args) {
	return runCliCommand(cwd, args, runEvidence);
}

function runGit(projectPath, args) {
	return spawnSync('git', ['-C', projectPath, ...args], {
		cwd: projectPath,
		encoding: 'utf8',
		stdio: ['ignore', 'pipe', 'pipe'],
		windowsHide: true,
	});
}

function commitGitBaseline(projectPath) {
	let result = runGit(projectPath, ['init']);
	if (result.status !== 0) {
		return false;
	}

	for (const args of [
		['config', 'user.email', 'mustflow-tests@example.invalid'],
		['config', 'user.name', 'mustflow tests'],
		['add', '.'],
		['commit', '-m', 'baseline'],
	]) {
		result = runGit(projectPath, args);
		if (result.status !== 0) {
			return false;
		}
	}

	return true;
}

function writeLatestVerifyEvidence(projectPath, planId, requirements) {
	const latestPath = path.join(projectPath, '.mustflow', 'state', 'runs', 'latest.json');
	mkdirSync(path.dirname(latestPath), { recursive: true });
	writeFileSync(
		latestPath,
		JSON.stringify(
			{
				schema_version: '1',
				command: 'verify',
				kind: 'verify_run_summary',
				verification_plan_id: planId,
				execution_status: 'passed',
				status: 'passed',
				completion_verdict: {
					status: 'verified',
					primary_reason: 'all_selected_verification_passed',
				},
				evidence_model: {
					schema_version: '1',
					source: 'mf_verify',
					verification_plan_id: planId,
					requirements: requirements.map((requirement) => ({
						reason: requirement.reason,
						files: requirement.files,
						surfaces: requirement.surfaces,
						candidate_intents: requirement.candidate_intents,
						selected_intents: requirement.selected_intents,
						skipped_intents: [],
						gap_count: 0,
						outcome: 'verified',
					})),
					coverage_matrix: [],
					receipts: requirements.flatMap((requirement) =>
						requirement.selected_intents.map((intent) => ({
							intent,
							status: 'passed',
							skipped: false,
							verification_plan_id: planId,
							receipt_path: `.mustflow/state/runs/verify-test/${intent}.json`,
							receipt_sha256: 'sha256:abc',
						})),
					),
					skipped_checks: [],
					gaps: [],
					remaining_risks: [],
					conflict_ledger: {
						schema_version: '1',
						source: 'verification_evidence_model',
						status: 'clear',
						item_count: 0,
						blocking_count: 0,
						contradiction_count: 0,
						items: [],
					},
					explanation: {
						verified_by: ['all_selected_verification_passed'],
						downgraded_by: [],
						blocked_by: [],
						contradicted_by: [],
					},
				},
			},
			null,
			2,
		),
	);
}

test('evidence changed report links verification requirements to latest evidence', async () => {
	const projectPath = createEvidenceCommandProject();

	try {
		const hasGitBaseline = commitGitBaseline(projectPath);
		writeFileSync(path.join(projectPath, 'evidence-probe.js'), 'console.log("changed");\n');

		const firstResult = await runCli(projectPath, ['evidence', '--changed', '--json']);
		const firstOutput = JSON.parse(firstResult.stdout);

		if (!hasGitBaseline) {
			assert.equal(firstResult.status, 1);
			assert.equal(firstOutput.status, 'unavailable');
			return;
		}

		assert.equal(firstResult.status, 0, firstResult.stderr || firstResult.stdout);
		assert.equal(firstOutput.schema_version, '1');
		assert.equal(firstOutput.command, 'evidence');
		assert.equal(path.resolve(firstOutput.mustflow_root), path.resolve(projectPath));
		assert.equal(firstOutput.source.mode, 'changed');
		assert.equal(firstOutput.policy.direct_commands_allowed, false);
		assert.equal(firstOutput.policy.executes_commands, false);
		assert.equal(firstOutput.policy.grants_command_authority, false);
		assert.equal(firstOutput.policy.raw_output_included, false);
		assert.equal(firstOutput.policy.hidden_reasoning_included, false);
		assert.equal(firstOutput.plan.status, 'available');
		assert.match(firstOutput.plan.verification_plan_id, /^sha256:[0-9a-f]{64}$/u);
		assert.ok(firstOutput.plan.changed_files.includes('evidence-probe.js'));
		assert.equal(firstOutput.plan.risk_assessment.source, 'change_classification_and_command_contract');
		assert.ok(['low', 'medium', 'high', 'critical'].includes(firstOutput.plan.risk_assessment.level));
		assert.ok(firstOutput.plan.requirement_count > 0);
		assert.equal(firstOutput.latest.status, 'missing');
		assert.equal(firstOutput.latest.risk_assessment, null);
		assert.equal(firstOutput.latest.failure_replay_capsule, null);
		assert.equal(firstOutput.latest.conflict_ledger, null);

		writeLatestVerifyEvidence(projectPath, firstOutput.plan.verification_plan_id, firstOutput.plan.requirements);
		const secondResult = await runCli(projectPath, ['evidence', '--changed', '--json']);
		const secondOutput = JSON.parse(secondResult.stdout);

		assert.equal(secondResult.status, 0, secondResult.stderr || secondResult.stdout);
		assert.equal(secondOutput.latest.status, 'available');
		assert.equal(secondOutput.latest.applies_to_plan, true);
		assert.equal(secondOutput.latest.conflict_ledger.status, 'clear');
		assert.equal(secondOutput.latest.conflict_ledger.item_count, 0);
		assert.equal(secondOutput.status, 'verified');
		assert.equal(secondOutput.coverage.covered_by_latest_count, secondOutput.plan.requirement_count);
	} finally {
		removeTempProject(projectPath);
	}
});

test('evidence latest report summarizes missing latest evidence without raw output', async () => {
	const projectPath = createEvidenceProject();

	try {
		const result = await runCli(projectPath, ['evidence', '--latest', '--json']);
		const output = JSON.parse(result.stdout);

		assert.equal(result.status, 1);
		assert.equal(output.source.mode, 'latest');
		assert.equal(output.plan, null);
		assert.equal(output.latest.path, '.mustflow/state/runs/latest.json');
		assert.equal(output.latest.exists, false);
		assert.equal(output.policy.raw_output_included, false);
		assert.equal(output.policy.hidden_reasoning_included, false);
	} finally {
		removeTempProject(projectPath);
	}
});

test('evidence export writes report inside the mustflow root', async () => {
	const projectPath = createEvidenceProject();

	try {
		const result = await runCli(projectPath, ['evidence', '--latest', '--export=.mustflow/state/evidence-report.json', '--json']);
		const output = JSON.parse(result.stdout);
		const exportPath = path.join(projectPath, '.mustflow', 'state', 'evidence-report.json');

		assert.equal(result.status, 1);
		assert.equal(output.export_path, '.mustflow/state/evidence-report.json');
		assert.equal(output.policy.writes_files, true);
		assert.equal(existsSync(exportPath), true);
		assert.deepEqual(JSON.parse(readFileSync(exportPath, 'utf8')), output);
	} finally {
		removeTempProject(projectPath);
	}
});

test('evidence rejects unsupported option forms through shared option parsing', async () => {
	const projectPath = createEvidenceProject();

	try {
		const booleanValue = await runCli(projectPath, ['evidence', '--latest', '--json=true']);
		const emptyPlan = await runCli(projectPath, ['evidence', '--plan=']);
		const unexpected = await runCli(projectPath, ['evidence', 'latest']);

		assert.equal(booleanValue.status, 1);
		assert.match(booleanValue.stderr, /Unknown option: --json=true/u);
		assert.match(booleanValue.stderr, /mf evidence --help/u);

		assert.equal(emptyPlan.status, 1);
		assert.match(emptyPlan.stderr, /Missing value for --plan/u);
		assert.match(emptyPlan.stderr, /mf evidence --help/u);

		assert.equal(unexpected.status, 1);
		assert.match(unexpected.stderr, /Unexpected argument: latest/u);
		assert.match(unexpected.stderr, /mf evidence --help/u);
	} finally {
		removeTempProject(projectPath);
	}
});

test('evidence rejects conflicting sources', async () => {
	const projectPath = createEvidenceProject();

	try {
		const result = await runCli(projectPath, ['evidence', '--changed', '--latest']);

		assert.equal(result.status, 1);
		assert.match(result.stderr, /Choose only one evidence source/u);
		assert.match(result.stderr, /mf evidence --help/u);
	} finally {
		removeTempProject(projectPath);
	}
});
