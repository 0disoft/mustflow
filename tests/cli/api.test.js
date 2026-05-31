import assert from 'node:assert/strict';
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { test } from 'node:test';

import {
	commitGitBaseline,
	createTempProject,
	initProject,
	removeTempProject,
	runCli,
} from './run-support.js';

test('prints a read-only workspace summary api report', () => {
	const projectPath = createTempProject();

	try {
		initProject(projectPath);
		const hasGitBaseline = commitGitBaseline(projectPath);
		writeFileSync(path.join(projectPath, 'src-api-probe.txt'), 'changed\n');

		const result = runCli(projectPath, ['api', 'workspace-summary', '--json']);
		const output = JSON.parse(result.stdout);

		assert.equal(result.status, 0, result.stderr || result.stdout);
		assert.equal(result.stderr, '');
		assert.equal(output.schema_version, '1');
		assert.equal(output.command, 'api workspace-summary');
		assert.equal(path.resolve(output.mustflow_root), path.resolve(projectPath));
		assert.equal(output.installed, true);
		assert.equal(output.manifest_lock, 'present');
		assert.equal(output.check.ok, true);
		assert.equal(output.check.issue_count, 0);
		assert.deepEqual(output.read_order.missing_required, []);
		assert.ok(output.read_order.required.includes('AGENTS.md'));
		assert.equal(output.command_surface.path, '.mustflow/config/commands.toml');
		assert.equal(output.command_surface.exists, true);
		assert.ok(output.command_surface.runnable_intents.includes('mustflow_check'));
		assert.equal(output.command_surface.runnable_count, output.command_surface.runnable_intents.length);
		assert.equal(output.skill_surface.index_path, '.mustflow/skills/INDEX.md');
		assert.equal(output.skill_surface.index_exists, true);
		assert.equal(output.skill_surface.routes_path, '.mustflow/skills/routes.toml');
		assert.equal(output.skill_surface.routes_exists, true);
		assert.equal(output.latest_run.exists, false);
		assert.equal(output.effective_policy.command_contract, '.mustflow/config/commands.toml');
		assert.equal(output.effective_policy.project_commands_require_mf_run, true);
		assert.equal(output.state_policy.stores_hidden_chain_of_thought, false);
		assert.ok(output.blocked_actions.includes('unconfigured_project_command'));
		assert.ok(output.recommended_read_surfaces.includes('AGENTS.md'));
		assert.ok(output.recommended_read_surfaces.includes('.mustflow/skills/INDEX.md'));
		assert.ok(output.recommended_next_commands.includes('mf context --json'));
		assert.ok(output.recommended_next_commands.includes('mf doctor --json'));

		if (hasGitBaseline) {
			assert.equal(output.git_state.status, 'available');
			assert.ok(output.git_state.changed_files.includes('src-api-probe.txt'));
			assert.ok(output.recommended_next_commands.includes('mf classify --changed --json'));
			assert.ok(output.recommended_next_commands.includes('mf verify --changed --plan-only --json'));
		}
	} finally {
		removeTempProject(projectPath);
	}
});

test('api workspace-summary requires json mode', () => {
	const projectPath = createTempProject();

	try {
		initProject(projectPath);
		const result = runCli(projectPath, ['api', 'workspace-summary']);

		assert.equal(result.status, 1);
		assert.match(result.stderr, /workspace-summary requires --json/u);
		assert.match(result.stderr, /mf api --help/u);
	} finally {
		removeTempProject(projectPath);
	}
});

test('prints a read-only command catalog api report', () => {
	const projectPath = createTempProject();

	try {
		initProject(projectPath);
		const result = runCli(projectPath, ['api', 'command-catalog', '--json']);
		const output = JSON.parse(result.stdout);
		const mustflowCheck = output.intents.find((intent) => intent.name === 'mustflow_check');

		assert.equal(result.status, 0, result.stderr || result.stdout);
		assert.equal(result.stderr, '');
		assert.equal(output.schema_version, '1');
		assert.equal(output.command, 'api command-catalog');
		assert.equal(path.resolve(output.mustflow_root), path.resolve(projectPath));
		assert.equal(output.command_contract.path, '.mustflow/config/commands.toml');
		assert.equal(output.command_contract.exists, true);
		assert.equal(output.command_contract.parse_error, null);
		assert.ok(output.command_contract.total_intents > 0);
		assert.equal(output.command_contract.total_intents, output.intents.length);
		assert.equal(output.command_contract.runnable_count, output.intents.filter((intent) => intent.runnable).length);
		assert.equal(output.execution_policy.command_authority, '.mustflow/config/commands.toml');
		assert.equal(output.execution_policy.run_entrypoint, 'mf run <intent>');
		assert.equal(output.execution_policy.preview_entrypoint, 'mf run <intent> --dry-run --json');
		assert.equal(output.execution_policy.direct_commands_allowed, false);
		assert.equal(output.execution_policy.requires_configured_oneshot_agent_allowed, true);
		assert.ok(mustflowCheck);
		assert.equal(mustflowCheck.runnable, true);
		assert.equal(mustflowCheck.run_command, 'mf run mustflow_check');
		assert.equal(mustflowCheck.preview_command, 'mf run mustflow_check --dry-run --json');
		assert.equal('argv' in mustflowCheck, false);
		assert.equal('cmd' in mustflowCheck, false);
	} finally {
		removeTempProject(projectPath);
	}
});

test('api command-catalog requires json mode', () => {
	const projectPath = createTempProject();

	try {
		initProject(projectPath);
		const result = runCli(projectPath, ['api', 'command-catalog']);

		assert.equal(result.status, 1);
		assert.match(result.stderr, /command-catalog requires --json/u);
		assert.match(result.stderr, /mf api --help/u);
	} finally {
		removeTempProject(projectPath);
	}
});

test('prints a read-only verification plan api report', () => {
	const projectPath = createTempProject();

	try {
		initProject(projectPath);
		const hasGitBaseline = commitGitBaseline(projectPath);
		writeFileSync(path.join(projectPath, 'verification-plan-probe.js'), 'console.log("changed");\n');

		const result = runCli(projectPath, ['api', 'verification-plan', '--changed', '--json']);
		const output = JSON.parse(result.stdout);

		assert.equal(result.status, 0, result.stderr || result.stdout);
		assert.equal(result.stderr, '');
		assert.equal(output.schema_version, '1');
		assert.equal(output.command, 'api verification-plan');
		assert.equal(path.resolve(output.mustflow_root), path.resolve(projectPath));
		assert.equal(output.source.kind, 'changed');
		assert.equal(output.source.command, 'mf verify --changed --plan-only --json');
		assert.equal(output.execution_policy.plan_command, 'mf verify --changed --plan-only --json');
		assert.equal(output.execution_policy.run_command, 'mf verify --changed --json');
		assert.equal(output.execution_policy.direct_commands_allowed, false);
		assert.equal(output.execution_policy.selected_intents_run_via, 'mf run <intent>');

		if (hasGitBaseline) {
			assert.equal(output.status, 'available');
			assert.match(output.verification_plan_id, /^sha256:[0-9a-f]{64}$/u);
			assert.equal(output.classification.source, 'changed');
			assert.ok(output.classification.files.includes('verification-plan-probe.js'));
			assert.ok(output.requirements.length > 0);
			assert.ok(output.candidates.length > 0);
			assert.equal(output.schedule.entry_count, output.schedule.selected_intents.length);
			assert.equal(output.schedule.selected_intents.length, output.schedule.entries.length);
			if (output.schedule.entries.length > 0) {
				assert.equal(output.schedule.entries[0].run_command.startsWith('mf run '), true);
			}
			assert.equal(output.issues.length, 0);
		} else {
			assert.equal(output.status, 'unavailable');
			assert.equal(output.verification_plan_id, null);
			assert.ok(output.issues.length > 0);
		}
	} finally {
		removeTempProject(projectPath);
	}
});

test('api verification-plan requires json mode', () => {
	const projectPath = createTempProject();

	try {
		initProject(projectPath);
		const result = runCli(projectPath, ['api', 'verification-plan', '--changed']);

		assert.equal(result.status, 1);
		assert.match(result.stderr, /verification-plan requires --json/u);
		assert.match(result.stderr, /mf api --help/u);
	} finally {
		removeTempProject(projectPath);
	}
});

test('api verification-plan requires changed mode', () => {
	const projectPath = createTempProject();

	try {
		initProject(projectPath);
		const result = runCli(projectPath, ['api', 'verification-plan', '--json']);

		assert.equal(result.status, 1);
		assert.match(result.stderr, /verification-plan currently requires --changed/u);
		assert.match(result.stderr, /mf api --help/u);
	} finally {
		removeTempProject(projectPath);
	}
});

test('api diff-risk requires changed mode with action-specific guidance', () => {
	const projectPath = createTempProject();

	try {
		initProject(projectPath);
		const result = runCli(projectPath, ['api', 'diff-risk', '--json']);

		assert.equal(result.status, 1);
		assert.match(result.stderr, /diff-risk currently requires --changed/u);
		assert.match(result.stderr, /mf api --help/u);
	} finally {
		removeTempProject(projectPath);
	}
});

test('prints a compact latest evidence api report', () => {
	const projectPath = createTempProject();

	try {
		initProject(projectPath);
		const result = runCli(projectPath, ['api', 'latest-evidence', '--json']);
		const output = JSON.parse(result.stdout);

		assert.equal(result.status, 0, result.stderr || result.stdout);
		assert.equal(result.stderr, '');
		assert.equal(output.schema_version, '1');
		assert.equal(output.command, 'api latest-evidence');
		assert.equal(path.resolve(output.mustflow_root), path.resolve(projectPath));
		assert.equal(output.latest.path, '.mustflow/state/runs/latest.json');
		assert.equal(output.latest.exists, false);
		assert.equal(output.latest.kind, null);
		assert.equal(output.manifest.status, 'not_applicable');
		assert.equal(output.policy.raw_output_included, false);
		assert.equal(output.policy.hidden_reasoning_included, false);
	} finally {
		removeTempProject(projectPath);
	}
});

test('prints a compact diff risk api report', () => {
	const projectPath = createTempProject();

	try {
		initProject(projectPath);
		const hasGitBaseline = commitGitBaseline(projectPath);
		writeFileSync(path.join(projectPath, 'diff-risk-probe.js'), 'console.log("changed");\n');

		const result = runCli(projectPath, ['api', 'diff-risk', '--changed', '--json']);
		const output = JSON.parse(result.stdout);

		assert.equal(result.status, 0, result.stderr || result.stdout);
		assert.equal(result.stderr, '');
		assert.equal(output.schema_version, '1');
		assert.equal(output.command, 'api diff-risk');
		assert.equal(output.source.kind, 'changed');
		assert.equal(output.source.command, 'mf verify --changed --plan-only --json');

		if (hasGitBaseline) {
			assert.equal(output.status, 'available');
			assert.ok(['low', 'medium', 'high', 'none'].includes(output.risk_level));
			assert.ok(output.changed_files.includes('diff-risk-probe.js'));
			assert.ok(output.changed_file_count > 0);
			assert.ok(Array.isArray(output.required_verification));
			assert.equal(output.residual_corrections.mode, 'read_only');
			assert.equal(output.residual_corrections.grants_command_authority, false);
			assert.deepEqual(output.residual_corrections.selected_intent_additions, []);
			assert.deepEqual(output.residual_corrections.suggested_intent_additions, []);
			assert.ok(output.recommended_commands.includes('mf api verification-plan --changed --json'));
		} else {
			assert.equal(output.status, 'unavailable');
			assert.equal(output.risk_level, 'unknown');
			assert.ok(output.issues.length > 0);
		}
	} finally {
		removeTempProject(projectPath);
	}
});

test('api diff-risk reports residual corrections from unresolved latest evidence', () => {
	const projectPath = createTempProject();

	try {
		initProject(projectPath);
		const hasGitBaseline = commitGitBaseline(projectPath);
		writeFileSync(path.join(projectPath, 'diff-risk-residual-probe.js'), 'console.log("changed");\n');

		if (!hasGitBaseline) {
			return;
		}

		const planResult = runCli(projectPath, ['api', 'verification-plan', '--changed', '--json']);
		const planOutput = JSON.parse(planResult.stdout);
		assert.equal(planResult.status, 0, planResult.stderr || planResult.stdout);
		assert.match(planOutput.verification_plan_id, /^sha256:[0-9a-f]{64}$/u);

		const latestPath = path.join(projectPath, '.mustflow', 'state', 'runs', 'latest.json');
		mkdirSync(path.dirname(latestPath), { recursive: true });
		writeFileSync(
			latestPath,
			`${JSON.stringify(
				{
					schema_version: '1',
					command: 'verify',
					kind: 'verify_run_summary',
					verification_plan_id: planOutput.verification_plan_id,
					status: 'failed',
					completion_verdict: {
						status: 'blocked',
					},
					evidence_model: {
						requirements: [
							{
								reason: 'unknown_change',
								selected_intents: ['test_fast'],
								skipped_intents: [],
							},
						],
						receipts: [
							{
								intent: 'test_fast',
							},
						],
						remaining_risks: [
							{
								code: 'repeated_failure_requires_new_evidence',
								severity: 'high',
								detail: 'Need new evidence before another completion claim.',
							},
						],
					},
					repeated_failure_summary: {
						seen_count: 2,
						requires_new_evidence: true,
					},
				},
				null,
				2,
			)}\n`,
		);

		const result = runCli(projectPath, ['api', 'diff-risk', '--changed', '--json']);
		const output = JSON.parse(result.stdout);
		const signalKinds = output.residual_corrections.signals.map((signal) => signal.kind);

		assert.equal(result.status, 0, result.stderr || result.stdout);
		assert.equal(output.residual_corrections.status, 'available');
		assert.equal(output.residual_corrections.applies_to_current_plan, true);
		assert.equal(output.residual_corrections.grants_command_authority, false);
		assert.deepEqual(output.residual_corrections.selected_intent_additions, []);
		assert.deepEqual(output.residual_corrections.suggested_intent_additions, []);
		assert.ok(output.residual_corrections.recommended_commands.includes('mf api latest-evidence --json'));
		assert.ok(signalKinds.includes('latest_unresolved_plan'));
		assert.ok(signalKinds.includes('repeated_failure'));
		assert.ok(signalKinds.includes('remaining_risk'));
		assert.ok(output.residual_corrections.signals.some((signal) => signal.confidence === 'high'));
	} finally {
		removeTempProject(projectPath);
	}
});

test('prints a compact health api report', () => {
	const projectPath = createTempProject();

	try {
		initProject(projectPath);
		const result = runCli(projectPath, ['api', 'health', '--json']);
		const output = JSON.parse(result.stdout);

		assert.equal(result.status, 0, result.stderr || result.stdout);
		assert.equal(result.stderr, '');
		assert.equal(output.schema_version, '1');
		assert.equal(output.command, 'api health');
		assert.equal(path.resolve(output.mustflow_root), path.resolve(projectPath));
		assert.ok(['ok', 'degraded', 'blocked'].includes(output.status));
		assert.equal(output.installed, true);
		assert.equal(output.check_ok, true);
		assert.equal(output.command_contract_ok, true);
		assert.ok(output.runnable_count > 0);
		assert.equal(output.latest_run_exists, false);
		assert.ok(output.recommended_next_commands.includes('mf context --json'));
	} finally {
		removeTempProject(projectPath);
	}
});

test('prints active run locks api report', () => {
	const projectPath = createTempProject();

	try {
		initProject(projectPath);
		const lockPath = path.join(projectPath, '.mustflow', 'state', 'locks', 'active', 'manual-lock.json');
		mkdirSync(path.dirname(lockPath), { recursive: true });
		writeFileSync(
			lockPath,
			`${JSON.stringify(
				{
					schema_version: '1',
					kind: 'active_run_lock',
					run_id: 'manual-active-lock',
					intent: 'test_fast',
					pid: process.pid,
					started_at: new Date().toISOString(),
					root_hash: 'test-root-hash',
					command_hash: null,
					effects: [
						{
							source: 'writes',
							access: 'write',
							mode: 'write',
							path: 'dist',
							lock: 'path:dist',
							concurrency: 'exclusive',
						},
					],
					writes: ['dist'],
				},
				null,
				2,
			)}\n`,
		);

		const result = runCli(projectPath, ['api', 'locks', '--json']);
		const output = JSON.parse(result.stdout);

		assert.equal(result.status, 0, result.stderr || result.stdout);
		assert.equal(result.stderr, '');
		assert.equal(output.schema_version, '1');
		assert.equal(output.command, 'api locks');
		assert.equal(output.status, 'active');
		assert.equal(output.active_count, 1);
		assert.equal(output.stale_count, 0);
		assert.equal(output.active_locks[0].intent, 'test_fast');
		assert.equal(output.active_locks[0].effects[0].lock, 'path:dist');
		assert.equal(output.policy.wait_entrypoint, 'mf run <intent> --wait');
		assert.equal(output.policy.direct_commands_bypass_locks, true);
		assert.ok(output.recommended_commands.includes('mf run <intent> --wait'));
	} finally {
		removeTempProject(projectPath);
	}
});
