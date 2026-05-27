import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, mkdtempSync, rmSync, readFileSync, symlinkSync, writeFileSync } from 'node:fs';
import { availableParallelism, tmpdir } from 'node:os';
import path from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { runCliInProcess } from './helpers/cli-harness.js';

const projectRoot = path.resolve(fileURLToPath(new URL('../..', import.meta.url)));

function createTempProject() {
	return mkdtempSync(path.join(tmpdir(), 'mustflow-verify-'));
}

function removeTempProject(projectPath) {
	rmSync(projectPath, { recursive: true, force: true });
}

async function runCli(cwd, args) {
	return runCliInProcess(cwd, args);
}

async function initProject(projectPath) {
	const result = await runCli(projectPath, ['init', '--yes']);
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

function tryFileSymlink(targetPath, linkPath) {
	try {
		symlinkSync(targetPath, linkPath, 'file');
		return true;
	} catch {
		return false;
	}
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

test('runs configured verification intents for a reason', async () => {
	const projectPath = createTempProject();

	try {
		await initProject(projectPath);
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

		const result = await runCli(projectPath, ['verify', '--reason', 'custom_verify', '--json']);
		const report = JSON.parse(result.stdout);

		assert.equal(result.status, 0, result.stderr || result.stdout);
		assert.equal(report.command, 'verify');
		assert.match(report.correlation_id, /^mf-verify-[0-9a-f]{16}$/u);
		assert.equal(report.reason, 'custom_verify');
		assert.deepEqual(report.reasons, ['custom_verify']);
		assert.equal(report.plan_source, null);
		assert.match(report.verification_plan_id, /^sha256:[0-9a-f]{64}$/u);
		assert.equal(report.execution_status, 'passed');
		assert.equal(report.status, 'passed');
		assert.equal(report.status, report.execution_status);
		assert.deepEqual(report.completion_verdict, {
			schema_version: '1',
			status: 'verified',
			primary_reason: 'all_selected_verification_passed',
			evidence: {
				source: 'mf_verify',
				verification_plan_id: report.verification_plan_id,
				changed_file_count: null,
				criteria: {
					total: 1,
					covered: 1,
					partially_covered: 0,
					uncovered: 0,
					blocked: 0,
					contradicted: 0,
				},
				matched_intents: 1,
				ran_intents: 1,
				passed_intents: 1,
				failed_intents: 0,
				skipped_intents: 0,
				receipt_count: 1,
				gap_count: 0,
				source_anchor_risk_count: 0,
				scope_diff_risk_count: 0,
				repeated_failure_count: 0,
				validation_ratchet_risk_count: 0,
				repro_evidence_risk_count: 0,
				external_evidence_risk_count: 0,
				write_drift_risk_count: 0,
				receipt_binding_risk_count: 0,
				stale_receipt_count: 0,
				plan_mismatch_count: 0,
				risks: {
					source_anchor: 0,
					scope_diff: 0,
					repeated_failure: 0,
					validation_ratchet: 0,
					repro_evidence: 0,
					external_evidence: 0,
					write_drift: 0,
					receipt_binding: 0,
					stale_receipt: 0,
					plan_mismatch: 0,
				},
				receipt_binding: {
					plan_bound_count: 1,
					plan_unbound_count: 0,
					fingerprint_bound_count: 1,
					fingerprint_unbound_count: 0,
					current_state_bound_count: 0,
					current_state_unavailable_count: 1,
					stale_count: 0,
					plan_mismatch_count: 0,
				},
				latest_run_status: null,
			},
			blockers: [],
			contradictions: [],
			limitations: [],
		});
		assert.deepEqual(report.summary, {
			matched: 1,
			ran: 1,
			passed: 1,
			failed: 0,
			skipped: 0,
		});
		assert.equal(report.results[0].intent, 'verify_echo');
		assert.equal(report.results[0].status, 'passed');
		assert.equal(report.results[0].verification_plan_id, report.verification_plan_id);
		assert.equal(report.results[0].receipt.intent, 'verify_echo');
		assert.equal(report.results[0].receipt.correlation_id, report.correlation_id);
		assert.equal(report.results[0].receipt.verification_plan_id, report.verification_plan_id);
		assert.match(report.results[0].receipt.stdout.tail, /verify ok/);
		assert.match(report.run_dir, /^\.mustflow\/state\/runs\/verify-/u);
		assert.equal(report.manifest_path, `${report.run_dir}/manifest.json`);
		assert.equal(existsSync(path.join(projectPath, '.mustflow', 'state', 'runs', 'verify-latest')), false);
		const manifestPath = path.join(projectPath, report.manifest_path);
		const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
		const receiptPath = path.join(projectPath, manifest.receipts[0].receipt_path);
		const receiptContent = readFileSync(receiptPath, 'utf8');
		const perIntentReceipt = JSON.parse(receiptContent);
		const receiptSha256 = `sha256:${createHash('sha256').update(receiptContent).digest('hex')}`;
		const latest = JSON.parse(readFileSync(path.join(projectPath, '.mustflow', 'state', 'runs', 'latest.json'), 'utf8'));

		assert.equal(manifest.command, 'verify');
		assert.equal(manifest.correlation_id, report.correlation_id);
		assert.equal(manifest.verification_plan_id, report.verification_plan_id);
		assert.equal(manifest.execution_status, 'passed');
		assert.equal(manifest.status, 'passed');
		assert.equal(manifest.status, manifest.execution_status);
		assert.deepEqual(manifest.completion_verdict, report.completion_verdict);
		assert.deepEqual(manifest.reasons, ['custom_verify']);
		assert.equal(manifest.receipts[0].intent, 'verify_echo');
		assert.equal(manifest.receipts[0].status, 'passed');
		assert.equal(manifest.receipts[0].verification_plan_id, report.verification_plan_id);
		assert.equal(manifest.receipts[0].receipt_path, `${report.run_dir}/intents/001-verify_echo.json`);
		assert.equal(manifest.receipts[0].receipt_sha256, receiptSha256);
		assert.equal(report.results[0].receipt_path, manifest.receipts[0].receipt_path);
		assert.equal(report.results[0].receipt_sha256, receiptSha256);
		assert.equal(report.results[0].receipt.receipt_path, manifest.receipts[0].receipt_path);
		assert.equal(report.evidence_model.source, 'mf_verify');
		assert.equal(report.evidence_model.verification_plan_id, report.verification_plan_id);
		assert.equal(report.evidence_model.requirements[0].reason, 'custom_verify');
		assert.deepEqual(report.evidence_model.requirements[0].candidate_intents, ['verify_echo']);
		assert.deepEqual(report.evidence_model.requirements[0].selected_intents, ['verify_echo']);
		assert.equal(report.evidence_model.requirements[0].outcome, 'verified');
		assert.deepEqual(report.evidence_model.coverage_matrix[0], {
			criterion_id: 'verification_requirement:1:custom_verify',
			source: 'verification_requirement',
			statement: 'Verification requirement: custom_verify',
			status: 'covered',
			requirement_reason: 'custom_verify',
			evidence: {
				intents: ['verify_echo'],
				receipt_paths: [manifest.receipts[0].receipt_path],
				gap_reasons: [],
				source_anchor_ids: [],
			},
		});
		assert.equal(report.evidence_model.receipts[0].intent, 'verify_echo');
		assert.equal(report.evidence_model.receipts[0].receipt_path, manifest.receipts[0].receipt_path);
		assert.equal(report.evidence_model.receipts[0].receipt_sha256, receiptSha256);
		assert.deepEqual(report.evidence_model.explanation.verified_by, ['all_selected_verification_passed']);
		assert.equal(perIntentReceipt.intent, 'verify_echo');
		assert.equal(perIntentReceipt.correlation_id, report.correlation_id);
		assert.equal(perIntentReceipt.verification_plan_id, report.verification_plan_id);
		assert.equal(perIntentReceipt.receipt_path, manifest.receipts[0].receipt_path);
		assert.match(perIntentReceipt.stdout.tail, /verify ok/);
		assert.equal(latest.command, 'verify');
		assert.equal(latest.kind, 'verify_run_summary');
		assert.equal(latest.correlation_id, report.correlation_id);
		assert.equal(latest.verification_plan_id, report.verification_plan_id);
		assert.equal(latest.execution_status, 'passed');
		assert.equal(latest.status, 'passed');
		assert.equal(latest.status, latest.execution_status);
		assert.deepEqual(latest.completion_verdict, report.completion_verdict);
		assert.deepEqual(manifest.evidence_model, report.evidence_model);
		assert.deepEqual(latest.evidence_model, report.evidence_model);
		assert.equal(latest.run_dir, report.run_dir);
		assert.equal(latest.manifest_path, report.manifest_path);
	} finally {
		removeTempProject(projectPath);
	}
});

test('localizes human-readable verification summary labels', async () => {
	const projectPath = createTempProject();

	try {
		await initProject(projectPath);
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

		const result = await runCli(projectPath, ['--lang', 'ko', 'verify', '--reason', 'custom_verify']);

		assert.equal(result.status, 0, result.stderr || result.stdout);
		assert.match(result.stdout, /완료 판정:/);
		assert.match(result.stdout, /일치: 1/);
		assert.match(result.stdout, /실행: 1/);
		assert.match(result.stdout, /통과: 1/);
		assert.doesNotMatch(result.stdout, /completion verdict:/);
	} finally {
		removeTempProject(projectPath);
	}
});

test('rejects invalid verification parallelism', async () => {
	const projectPath = createTempProject();

	try {
		await initProject(projectPath);
		const result = await runCli(projectPath, ['verify', '--reason', 'custom_verify', '--parallel', '0']);

		assert.equal(result.status, 1);
		assert.match(result.stderr, /--parallel must be a positive integer/);
	} finally {
		removeTempProject(projectPath);
	}
});

test('caps excessive verification parallelism and reports the effective settings', async () => {
	const projectPath = createTempProject();

	try {
		await initProject(projectPath);
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

		const requested = 999;
		const result = await runCli(projectPath, ['verify', '--reason', 'custom_verify', '--parallel', String(requested), '--json']);
		const report = JSON.parse(result.stdout);
		const expectedCpuLimit = Math.max(1, Math.min(8, availableParallelism()));

		assert.equal(result.status, 0, result.stderr || result.stdout);
		assert.equal(report.parallelism.requested, requested);
		assert.equal(report.parallelism.effective, expectedCpuLimit);
		assert.equal(report.parallelism.repository_max, 8);
		assert.equal(report.parallelism.cpu_available, availableParallelism());
		assert.equal(report.parallelism.capped, true);
		assert.equal(report.parallelism.mode, expectedCpuLimit > 1 ? 'parallel_chunks' : 'serial');
		assert.match(report.parallelism.note, /bounded optimization|runs serially/);
	} finally {
		removeTempProject(projectPath);
	}
});

test('reports plan-only gaps when no intents match the reason', async () => {
	const projectPath = createTempProject();

	try {
		await initProject(projectPath);

		const result = await runCli(projectPath, ['verify', '--reason', 'missing_reason', '--plan-only', '--json']);
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

test('rejects plan-only verify output without json', async () => {
	const projectPath = createTempProject();

	try {
		await initProject(projectPath);

		const result = await runCli(projectPath, ['verify', '--reason', 'custom_verify', '--plan-only']);

		assert.equal(result.status, 1);
		assert.match(result.stderr, /--plan-only requires --json/);
		assert.match(result.stdout, /Usage: mf verify/);
	} finally {
		removeTempProject(projectPath);
	}
});

test('documents from-plan as a deprecated classification-report alias', async () => {
	const result = await runCli(projectRoot, ['verify', '--help']);

	assert.equal(result.status, 0, result.stderr || result.stdout);
	assert.match(result.stdout, /--from-classification <path>/);
	assert.match(
		result.stdout,
		/--from-plan <path>\s+Deprecated compatibility alias for --from-classification; it still expects an mf classify report/,
	);
});

test('preserves classification details in plan-only verify output from a classify report alias', async () => {
	const projectPath = createTempProject();

	try {
		await initProject(projectPath);
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

		const indexResult = await runCli(projectPath, ['index', '--json']);
		const result = await runCli(projectPath, ['verify', '--from-plan', 'verify-plan.json', '--plan-only', '--json']);
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

test('runs verification intents selected from a classify report alias', async () => {
	const projectPath = createTempProject();

	try {
		await initProject(projectPath);
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

		const result = await runCli(projectPath, ['verify', '--from-plan', 'verify-plan.json', '--json']);
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

test('rejects verify plan-only reports passed through the deprecated from-plan alias', async () => {
	const projectPath = createTempProject();

	try {
		await initProject(projectPath);

		const planOnlyResult = await runCli(projectPath, ['verify', '--reason', 'schema_verify', '--plan-only', '--json']);
		assert.equal(planOnlyResult.status, 0, planOnlyResult.stderr || planOnlyResult.stdout);

		writeFileSync(path.join(projectPath, 'verify-plan-output.json'), planOnlyResult.stdout);

		const result = await runCli(projectPath, ['verify', '--from-plan', 'verify-plan-output.json', '--json']);

		assert.equal(result.status, 1);
		assert.match(result.stderr, /Verification input must be an mf classify report/);
		assert.match(result.stdout, /Usage: mf verify/);
	} finally {
		removeTempProject(projectPath);
	}
});

test('rejects loose classification report inputs that are not classify output', async () => {
	const projectPath = createTempProject();

	try {
		await initProject(projectPath);
		writeFileSync(
			path.join(projectPath, 'verify-plan.json'),
			JSON.stringify({ classification_summary: { validationReasons: ['schema_verify'] } }, null, 2),
		);

		const result = await runCli(projectPath, ['verify', '--from-plan', 'verify-plan.json', '--json']);

		assert.equal(result.status, 1);
		assert.match(result.stderr, /Verification input must be an mf classify report/);
		assert.match(result.stdout, /Usage: mf verify/);
	} finally {
		removeTempProject(projectPath);
	}
});

test('rejects classify plans from a different mustflow root', async () => {
	const projectPath = createTempProject();

	try {
		await initProject(projectPath);
		writeFileSync(
			path.join(projectPath, 'verify-plan.json'),
			JSON.stringify({ ...createClassifyPlan(projectPath, 'schema_verify'), mustflow_root: path.join(projectPath, 'other') }, null, 2),
		);

		const result = await runCli(projectPath, ['verify', '--from-plan', 'verify-plan.json', '--json']);

		assert.equal(result.status, 1);
		assert.match(result.stderr, /Classification report must come from this mustflow root/);
		assert.match(result.stdout, /Usage: mf verify/);
	} finally {
		removeTempProject(projectPath);
	}
});

test('reports blocked verification when matching intents are not runnable', async () => {
	const projectPath = createTempProject();

	try {
		await initProject(projectPath);
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

		const result = await runCli(projectPath, ['verify', '--reason=custom_partial', '--json']);
		const report = JSON.parse(result.stdout);

		assert.equal(result.status, 1);
		assert.equal(report.status, 'blocked');
		assert.equal(report.completion_verdict.status, 'blocked');
		assert.equal(report.completion_verdict.primary_reason, 'no_runnable_verification_intents');
		assert.deepEqual(report.completion_verdict.blockers, ['all_matching_verification_intents_were_skipped']);
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

test('reports blocked verification when no intents match the reason', async () => {
	const projectPath = createTempProject();

	try {
		await initProject(projectPath);

		const result = await runCli(projectPath, ['verify', '--reason', 'missing_reason', '--json']);
		const report = JSON.parse(result.stdout);

		assert.equal(result.status, 1);
		assert.equal(report.status, 'blocked');
		assert.equal(report.completion_verdict.status, 'blocked');
		assert.equal(report.completion_verdict.primary_reason, 'no_runnable_verification_intents');
		assert.equal(report.summary.matched, 0);
		assert.equal(report.summary.ran, 0);
		assert.equal(report.results[0].intent, null);
		assert.equal(report.results[0].reason, 'no_matching_intents');

		const planOnlyResult = await runCli(projectPath, ['verify', '--reason', 'preference_only', '--plan-only', '--json']);
		const planOnlyReport = JSON.parse(planOnlyResult.stdout);

		assert.equal(planOnlyResult.status, 0, planOnlyResult.stderr || planOnlyResult.stdout);
		assert.equal(planOnlyReport.candidates[0].intent, null);
		assert.equal(planOnlyReport.candidates[0].skipReason, 'no_matching_intents');
	} finally {
		removeTempProject(projectPath);
	}
});

test('does not treat verification preferences as command authority', async () => {
	const projectPath = createTempProject();

	try {
		await initProject(projectPath);
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

		const result = await runCli(projectPath, ['verify', '--reason', 'preference_only', '--json']);
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

test('does not treat source anchors or local index rows as verification authority', async () => {
	const projectPath = createTempProject();

	try {
		await initProject(projectPath);
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

		const indexResult = await runCli(projectPath, ['index', '--source', '--json']);
		const verifyResult = await runCli(projectPath, ['verify', '--reason', 'source_anchor_only', '--plan-only', '--json']);
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

test('rejects conflicting verify reason inputs', async () => {
	const projectPath = createTempProject();

	try {
		await initProject(projectPath);
		writeFileSync(path.join(projectPath, 'verify-plan.json'), JSON.stringify({ reasons: ['schema_verify'] }));

		const result = await runCli(projectPath, ['verify', '--reason', 'schema_verify', '--from-plan', 'verify-plan.json']);

		assert.equal(result.status, 1);
		assert.match(result.stderr, /Use only one of --reason, --from-classification, --from-plan, or --changed/);
		assert.match(result.stdout, /Usage: mf verify/);

		const changedResult = await runCli(projectPath, ['verify', '--changed', '--reason', 'schema_verify', '--json']);

		assert.equal(changedResult.status, 1);
		assert.match(changedResult.stderr, /Use only one of --reason, --from-classification, --from-plan, or --changed/);
		assert.match(changedResult.stdout, /Usage: mf verify/);
	} finally {
		removeTempProject(projectPath);
	}
});

test('rejects verify write-plan without changed mode', async () => {
	const projectPath = createTempProject();

	try {
		await initProject(projectPath);

		const result = await runCli(projectPath, ['verify', '--reason', 'schema_verify', '--write-plan', 'change-plan.json', '--json']);

		assert.equal(result.status, 1);
		assert.match(result.stderr, /--write-plan requires --changed/);
		assert.match(result.stdout, /Usage: mf verify/);
	} finally {
		removeTempProject(projectPath);
	}
});

test('fails changed verify when git status cannot be read', async () => {
	const projectPath = createTempProject();

	try {
		await initProject(projectPath);

		const result = await runCli(projectPath, ['verify', '--changed', '--json']);

		assert.equal(result.status, 1);
		assert.match(result.stderr, /Unable to inspect changed files with git status/);
		assert.match(result.stdout, /Usage: mf verify/);
	} finally {
		removeTempProject(projectPath);
	}
});

test('rejects changed verify plan writes outside the mustflow root', async () => {
	const projectPath = createTempProject();

	try {
		await initProject(projectPath);

		const result = await runCli(projectPath, ['verify', '--changed', '--write-plan', '../change-plan.json', '--json']);

		assert.equal(result.status, 1);
		assert.match(result.stderr, /Classification report path must stay inside the mustflow root/);
	} finally {
		removeTempProject(projectPath);
	}
});

test('fails verify when reason is missing', async () => {
	const result = await runCli(projectRoot, ['verify', '--json']);

	assert.equal(result.status, 1);
	assert.match(result.stderr, /Missing verification reason/);
	assert.match(result.stdout, /Usage: mf verify/);
});

test('rejects verify plans outside the mustflow root', async () => {
	const projectPath = createTempProject();
	const outsidePlanPath = path.join(tmpdir(), `mustflow-outside-plan-${Date.now()}.json`);

	try {
		await initProject(projectPath);
		writeFileSync(outsidePlanPath, JSON.stringify({ reasons: ['schema_verify'] }));

		const result = await runCli(projectPath, ['verify', '--from-plan', outsidePlanPath]);

		assert.equal(result.status, 1);
		assert.match(result.stderr, /Classification report path must stay inside the mustflow root/);
	} finally {
		rmSync(outsidePlanPath, { force: true });
		removeTempProject(projectPath);
	}
});

test('rejects verify external inputs that resolve through symlinks', async (t) => {
	const projectPath = createTempProject();
	const outsideRoot = mkdtempSync(path.join(tmpdir(), 'mustflow-linked-verify-inputs-'));

	try {
		await initProject(projectPath);
		writeFileSync(path.join(outsideRoot, 'classification.json'), JSON.stringify(createClassifyPlan(projectPath, 'schema_verify')));
		writeFileSync(
			path.join(outsideRoot, 'repro-evidence.json'),
			JSON.stringify({
				schema_version: '1',
				command: 'repro-evidence',
			}),
		);
		writeFileSync(
			path.join(outsideRoot, 'external-evidence.json'),
			JSON.stringify({
				schema_version: '1',
				command: 'external-evidence',
				checks: [],
			}),
		);

		const symlinks = [
			['classification-link.json', 'classification.json'],
			['repro-evidence-link.json', 'repro-evidence.json'],
			['external-evidence-link.json', 'external-evidence.json'],
		];

		for (const [linkName, targetName] of symlinks) {
			if (!tryFileSymlink(path.join(outsideRoot, targetName), path.join(projectPath, linkName))) {
				t.skip('file symlinks are not available in this environment');
				return;
			}
		}

		const classificationResult = await runCli(projectPath, [
			'verify',
			'--from-classification',
			'classification-link.json',
			'--json',
		]);
		const deprecatedAliasResult = await runCli(projectPath, ['verify', '--from-plan', 'classification-link.json', '--json']);
		const reproResult = await runCli(projectPath, [
			'verify',
			'--reason',
			'bug_fix',
			'--repro-evidence',
			'repro-evidence-link.json',
			'--json',
		]);
		const externalResult = await runCli(projectPath, [
			'verify',
			'--reason',
			'external_ci_change',
			'--external-evidence',
			'external-evidence-link.json',
			'--json',
		]);

		for (const result of [classificationResult, deprecatedAliasResult, reproResult, externalResult]) {
			assert.equal(result.status, 1);
			assert.match(result.stderr, /Input file path must not contain symlinks/);
			assert.match(result.stdout, /Usage: mf verify/);
		}
	} finally {
		rmSync(outsideRoot, { recursive: true, force: true });
		removeTempProject(projectPath);
	}
});
