import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

const projectRoot = path.resolve(fileURLToPath(new URL('../..', import.meta.url)));
const cliPath = path.join(projectRoot, 'dist', 'cli', 'index.js');

function runHarnessScenarios(args = []) {
	return spawnSync(process.execPath, ['scripts/run-harness-scenarios.mjs', ...args], {
		cwd: projectRoot,
		encoding: 'utf8',
	});
}

function runHarnessScenariosCommand(args = []) {
	return spawnSync(process.execPath, [cliPath, 'harness-scenarios', ...args], {
		cwd: projectRoot,
		encoding: 'utf8',
	});
}

test('harness-scenarios command evaluates an explicit fixture directory', () => {
	const result = runHarnessScenariosCommand(['--fixtures', 'tests/fixtures/harness-scenarios', '--json']);
	const report = JSON.parse(result.stdout);

	assert.equal(result.status, 0, result.stderr || result.stdout);
	assert.equal(report.schema_version, '1');
	assert.equal(report.command, 'harness_scenarios');
	assert.equal(report.ok, true);
	assert.equal(report.fixtures_root, 'tests/fixtures/harness-scenarios');
	assert.equal(report.summary.total, 10);
	assert.equal(report.summary.failed, 0);
});

test('harness-scenarios command requires an explicit fixture directory', () => {
	const result = runHarnessScenariosCommand(['--json']);

	assert.equal(result.status, 1);
	assert.match(result.stderr, /Missing --fixtures/);
	assert.match(result.stderr, /Run `mf harness-scenarios --help` for usage\./);
	assert.match(result.stdout, /Usage: mf harness-scenarios --fixtures <path>/);
});

test('harness scenario fixtures pass with deterministic verification expectations', () => {
	const result = runHarnessScenarios(['--json']);

	assert.notEqual(result.stdout.trim(), '', result.stderr || 'harness scenario runner should print json');
	const report = JSON.parse(result.stdout);

	assert.equal(result.status, 0, result.stderr || result.stdout);
	assert.equal(report.schema_version, '1');
	assert.equal(report.command, 'harness_scenarios');
	assert.equal(report.ok, true);
	assert.deepEqual(
		report.scenarios.map((scenario) => scenario.name),
		[
			'blocked-command-check',
			'broad-command-explanation',
			'docs-only',
			'host-instruction-conflicts',
			'local-change-blocking',
			'manual-workflow-check',
			'minimal-js',
			'missing-command-contracts',
			'report-claim-evidence',
			'template-drift',
		],
	);
	assert.equal(report.summary.total, 10);
	assert.equal(report.summary.failed, 0);

	const blockedCommand = report.scenarios.find((scenario) => scenario.name === 'blocked-command-check');
	const broadCommand = report.scenarios.find((scenario) => scenario.name === 'broad-command-explanation');
	const docsOnly = report.scenarios.find((scenario) => scenario.name === 'docs-only');
	const hostInstruction = report.scenarios.find((scenario) => scenario.name === 'host-instruction-conflicts');
	const localChangeBlocking = report.scenarios.find((scenario) => scenario.name === 'local-change-blocking');
	const minimalJs = report.scenarios.find((scenario) => scenario.name === 'minimal-js');
	const missingCommands = report.scenarios.find((scenario) => scenario.name === 'missing-command-contracts');
	const manualWorkflow = report.scenarios.find((scenario) => scenario.name === 'manual-workflow-check');
	const reportClaim = report.scenarios.find((scenario) => scenario.name === 'report-claim-evidence');
	const templateDrift = report.scenarios.find((scenario) => scenario.name === 'template-drift');

	assert.deepEqual(blockedCommand.runnable_intents, []);
	assert.deepEqual(blockedCommand.gap_reasons, ['code_change']);
	assert.deepEqual(blockedCommand.candidate_statuses, [
		{
			reason: 'code_change',
			intent: 'test_related',
			status: 'skipped',
			skip_reason: 'stdin_not_closed',
		},
	]);
	assert.deepEqual(broadCommand.runnable_intents, ['test']);
	assert.deepEqual(broadCommand.gap_reasons, []);
	assert.deepEqual(broadCommand.broad_selection_failures, []);
	assert.deepEqual(broadCommand.measurements, {
		selected_intents: ['test'],
		blocked_unsafe_actions: [],
		missing_narrow_intents: [],
		explanation_complete: true,
	});
	assert.deepEqual(broadCommand.selection_explanations, [
		{
			reason: 'code_change',
			selected_intent: 'test',
			preferred_intent: 'test_related',
			selected_status: 'runnable',
			preferred_status: 'skipped',
			preferred_skip_reason: 'status_not_configured',
			detail_present: true,
			explanation_status: 'explained',
		},
	]);
	assert.deepEqual(docsOnly.validation_reasons, ['copy_change', 'docs_change']);
	assert.deepEqual(docsOnly.runnable_intents, ['docs_validate_fast']);
	assert.deepEqual(docsOnly.gap_reasons, []);
	assert.deepEqual(hostInstruction.runnable_intents, ['mustflow_check']);
	assert.deepEqual(hostInstruction.gap_reasons, []);
	assert.equal(localChangeBlocking.kind, 'update_plan');
	assert.equal(localChangeBlocking.exit_status, 1);
	assert.equal(localChangeBlocking.ok, false);
	assert.equal(localChangeBlocking.wrote_files, false);
	assert.deepEqual(localChangeBlocking.summary.blockedLocalChanges, 1);
	assert.deepEqual(localChangeBlocking.item_actions, [
		{
			relativePath: 'AGENTS.md',
			action: 'blocked-local-change',
			reason: 'current file differs from the manifest lock baseline',
		},
	]);
	assert.deepEqual(localChangeBlocking.measurements, {
		selected_intents: [],
		blocked_unsafe_actions: ['AGENTS.md'],
		missing_narrow_intents: [],
		explanation_complete: true,
	});
	assert.deepEqual(minimalJs.runnable_intents, ['test_related']);
	assert.deepEqual(minimalJs.gap_reasons, []);
	assert.deepEqual(missingCommands.validation_reasons, ['code_change']);
	assert.deepEqual(missingCommands.runnable_intents, []);
	assert.deepEqual(missingCommands.gap_reasons, ['code_change']);
	assert.deepEqual(missingCommands.candidate_statuses, [
		{
			reason: 'code_change',
			intent: 'test',
			status: 'skipped',
			skip_reason: 'status_not_configured',
		},
	]);
	assert.deepEqual(manualWorkflow.gap_reasons, ['mustflow_config_change', 'mustflow_docs_change']);
	assert.equal(reportClaim.kind, 'report_claims');
	assert.deepEqual(reportClaim.failed_claim_intents, ['lint', 'test_related']);
	assert.deepEqual(reportClaim.passed_claim_intents, ['docs_validate_fast']);
	assert.deepEqual(reportClaim.claim_statuses, [
		{
			intent: 'docs_validate_fast',
			claim_kind: 'check_passed',
			status: 'passed',
			reason: null,
			plan_node_id: 'plan:docs_validate_fast',
			receipt_id: 'receipt:docs_validate_fast',
		},
		{
			intent: 'lint',
			claim_kind: 'check_passed',
			status: 'failed',
			reason: 'missing_plan_node',
			plan_node_id: null,
			receipt_id: null,
		},
		{
			intent: 'test_related',
			claim_kind: 'check_passed',
			status: 'failed',
			reason: 'missing_receipt',
			plan_node_id: 'plan:test_related',
			receipt_id: null,
		},
	]);
	assert.deepEqual(templateDrift.runnable_intents, ['test_release']);
	assert.deepEqual(templateDrift.gap_reasons, []);
});

test('harness scenario runner fails when expected gaps drift', () => {
	const fixtureRoot = mkdtempSync(path.join(tmpdir(), 'mustflow-harness-scenarios-'));
	const scenarioPath = path.join(fixtureRoot, 'bad-gap.json');

	try {
		writeFileSync(
			scenarioPath,
			`${JSON.stringify(
				{
					schema_version: '1',
					name: 'bad-gap',
					files: ['src/index.js'],
					command_contract: { intents: {} },
					expect: {
						validation_reasons: ['code_change'],
						runnable_intents: [],
						gap_reasons: [],
						candidate_statuses: [
							{
								reason: 'code_change',
								intent: null,
								status: 'skipped',
								skip_reason: 'no_matching_intents',
							},
						],
					},
				},
				null,
				2,
			)}\n`,
		);

		const result = runHarnessScenarios(['--json', '--fixtures', fixtureRoot]);
		const report = JSON.parse(result.stdout);
		const failedCheck = report.scenarios[0].checks.find((check) => check.name === 'gap_reasons');

		assert.equal(result.status, 1);
		assert.equal(report.ok, false);
		assert.equal(failedCheck.status, 'failed');
		assert.deepEqual(failedCheck.actual, ['code_change']);
	} finally {
		rmSync(fixtureRoot, { recursive: true, force: true });
	}
});

test('harness scenario runner rejects malformed expected output contracts', () => {
	const fixtureRoot = mkdtempSync(path.join(tmpdir(), 'mustflow-harness-scenarios-'));
	const scenarioPath = path.join(fixtureRoot, 'bad-expect-schema.json');

	try {
		writeFileSync(
			scenarioPath,
			`${JSON.stringify(
				{
					schema_version: '1',
					name: 'bad-expect-schema',
					files: ['src/index.js'],
					command_contract: { intents: {} },
					expect: {
						validation_reasons: 'code_change',
						runnable_intents: [],
						gap_reasons: [],
						candidate_statuses: [
							{
								reason: 'code_change',
								intent: null,
								status: 7,
								skip_reason: null,
							},
						],
						measurements: {
							selected_intents: [],
							blocked_unsafe_actions: [],
							missing_narrow_intents: [],
							explanation_complete: 'yes',
						},
					},
				},
				null,
				2,
			)}\n`,
		);

		const result = runHarnessScenarios(['--json', '--fixtures', fixtureRoot]);
		const report = JSON.parse(result.stdout);
		const failedMessages = report.scenarios[0].checks.map((check) => check.actual);

		assert.equal(result.status, 1);
		assert.equal(report.ok, false);
		assert.deepEqual(failedMessages, [
			'expect.validation_reasons must be an array of strings.',
			'expect.candidate_statuses[0].status must be a string.',
			'expect.measurements.explanation_complete must be a boolean.',
		]);
	} finally {
		rmSync(fixtureRoot, { recursive: true, force: true });
	}
});

test('harness scenario runner fails when a broad command selection lacks narrow-intent explanation', () => {
	const fixtureRoot = mkdtempSync(path.join(tmpdir(), 'mustflow-harness-scenarios-'));
	const scenarioPath = path.join(fixtureRoot, 'bad-broad-selection.json');

	try {
		writeFileSync(
			scenarioPath,
			`${JSON.stringify(
				{
					schema_version: '1',
					name: 'bad-broad-selection',
					files: ['src/index.js'],
					command_contract: {
						intents: {
							test: {
								status: 'configured',
								lifecycle: 'oneshot',
								run_policy: 'agent_allowed',
								stdin: 'closed',
								timeout_seconds: 300,
								argv: ['bun', 'test'],
								required_after: ['code_change'],
							},
						},
					},
					selection_claims: [
						{
							reason: 'code_change',
							selected_intent: 'test',
							preferred_narrow_intents: ['test_related'],
						},
					],
					expect: {
						validation_reasons: ['code_change'],
						runnable_intents: ['test'],
						gap_reasons: [],
						candidate_statuses: [
							{
								reason: 'code_change',
								intent: 'test',
								status: 'runnable',
								skip_reason: null,
							},
						],
						selection_explanations: [
							{
								reason: 'code_change',
								selected_intent: 'test',
								preferred_intent: 'test_related',
								selected_status: 'runnable',
								preferred_status: 'skipped',
								preferred_skip_reason: 'status_not_configured',
								detail_present: true,
								explanation_status: 'explained',
							},
						],
						broad_selection_failures: [],
					},
				},
				null,
				2,
			)}\n`,
		);

		const result = runHarnessScenarios(['--json', '--fixtures', fixtureRoot]);
		const report = JSON.parse(result.stdout);
		const failedCheck = report.scenarios[0].checks.find((check) => check.name === 'selection_explanations');

		assert.equal(result.status, 1);
		assert.equal(report.ok, false);
		assert.equal(failedCheck.status, 'failed');
		assert.deepEqual(failedCheck.actual, [
			{
				reason: 'code_change',
				selected_intent: 'test',
				preferred_intent: 'test_related',
				selected_status: 'runnable',
				preferred_status: null,
				preferred_skip_reason: null,
				detail_present: false,
				explanation_status: 'missing_candidate',
			},
		]);
		assert.deepEqual(report.scenarios[0].measurements.missing_narrow_intents, ['test_related']);
		assert.equal(report.scenarios[0].measurements.explanation_complete, false);
	} finally {
		rmSync(fixtureRoot, { recursive: true, force: true });
	}
});

test('harness scenario runner rejects fixtures that require external services', () => {
	const fixtureRoot = mkdtempSync(path.join(tmpdir(), 'mustflow-harness-scenarios-'));
	const scenarioPath = path.join(fixtureRoot, 'networked-scenario.json');

	try {
		writeFileSync(
			scenarioPath,
			`${JSON.stringify(
				{
					schema_version: '1',
					name: 'networked-scenario',
					requires: {
						network_access: true,
						live_ai_calls: true,
						personal_credentials: true,
						running_server: true,
					},
					files: ['src/index.js'],
					command_contract: { intents: {} },
					expect: {
						validation_reasons: ['code_change'],
						runnable_intents: [],
						gap_reasons: ['code_change'],
						candidate_statuses: [],
					},
				},
				null,
				2,
			)}\n`,
		);

		const result = runHarnessScenarios(['--json', '--fixtures', fixtureRoot]);
		const report = JSON.parse(result.stdout);
		const failedMessages = report.scenarios[0].checks.map((check) => check.actual);

		assert.equal(result.status, 1);
		assert.equal(report.ok, false);
		assert.deepEqual(failedMessages, [
			'requires.network_access must not be true; harness scenarios must not require network access.',
			'requires.live_ai_calls must not be true; harness scenarios must not require live AI calls.',
			'requires.personal_credentials must not be true; harness scenarios must not require personal credentials.',
			'requires.running_server must not be true; harness scenarios must not require a running server.',
		]);
	} finally {
		rmSync(fixtureRoot, { recursive: true, force: true });
	}
});

test('harness scenario runner fails when report claims lack receipt or plan evidence', () => {
	const fixtureRoot = mkdtempSync(path.join(tmpdir(), 'mustflow-harness-scenarios-'));
	const scenarioPath = path.join(fixtureRoot, 'bad-report-claim.json');

	try {
		writeFileSync(
			scenarioPath,
			`${JSON.stringify(
				{
					schema_version: '1',
					name: 'bad-report-claim',
					kind: 'report_claims',
					plan: { nodes: [] },
					receipts: [],
					claims: [
						{
							kind: 'check_passed',
							intent: 'test_related',
						},
					],
					expect: {
						claim_statuses: [
							{
								intent: 'test_related',
								claim_kind: 'check_passed',
								status: 'passed',
								reason: null,
								plan_node_id: null,
								receipt_id: null,
							},
						],
						failed_claim_intents: [],
						passed_claim_intents: ['test_related'],
						unsupported_claim_count: 0,
					},
				},
				null,
				2,
			)}\n`,
		);

		const result = runHarnessScenarios(['--json', '--fixtures', fixtureRoot]);
		const report = JSON.parse(result.stdout);
		const failedCheck = report.scenarios[0].checks.find((check) => check.name === 'claim_statuses');

		assert.equal(result.status, 1);
		assert.equal(report.ok, false);
		assert.equal(failedCheck.status, 'failed');
		assert.deepEqual(failedCheck.actual, [
			{
				intent: 'test_related',
				claim_kind: 'check_passed',
				status: 'failed',
				reason: 'missing_plan_node',
				plan_node_id: null,
				receipt_id: null,
			},
		]);
	} finally {
		rmSync(fixtureRoot, { recursive: true, force: true });
	}
});
