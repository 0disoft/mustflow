import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, mkdtempSync, rmSync, readFileSync, writeFileSync } from 'node:fs';
import { availableParallelism, tmpdir } from 'node:os';
import path from 'node:path';
import { test } from 'node:test';
import { runCliInProcess } from './helpers/cli-harness.js';

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
	refreshManifestLockHash(projectPath, '.mustflow/config/commands.toml');
}

function refreshManifestLockHash(projectPath, relativePath) {
	const lockPath = path.join(projectPath, '.mustflow', 'config', 'manifest.lock.toml');
	const filePath = path.join(projectPath, ...relativePath.split('/'));
	const hash = `sha256:${createHash('sha256').update(readFileSync(filePath)).digest('hex')}`;
	const lock = readFileSync(lockPath, 'utf8');
	const escapedPath = relativePath.replace(/[.*+?^${}()|[\]\\]/gu, '\\$&');
	const pattern = new RegExp(`(\\[files\\."${escapedPath}"\\][\\s\\S]*?content_hash = ")[^"]+(")`, 'u');
	writeFileSync(lockPath, lock.replace(pattern, `$1${hash}$2`));
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
				risk_priced_evidence_risk_count: 0,
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
					risk_priced_evidence: 0,
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
		assert.equal(report.risk_assessment.level, 'low');
		assert.deepEqual(report.risk_assessment.required_evidence, ['changed_file_review']);
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
		assert.deepEqual(manifest.risk_assessment, report.risk_assessment);
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
		assert.deepEqual(report.evidence_model.risk_assessment, report.risk_assessment);
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
		assert.deepEqual(latest.risk_assessment, report.risk_assessment);
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

test('downgrades passing verification when risk-priced evidence requires review', async () => {
	const projectPath = createTempProject();

	try {
		await initProject(projectPath);
		appendIntent(
			projectPath,
			`
[intents.verify_security_change]
status = "configured"
lifecycle = "oneshot"
run_policy = "agent_allowed"
description = "Verify a security change."
argv = ['${process.execPath}', '-e', 'console.log("security ok")']
cwd = "."
timeout_seconds = 10
stdin = "closed"
success_exit_codes = [0]
writes = []
network = false
destructive = false
required_after = ["security_change"]
`,
		);

		const result = await runCli(projectPath, ['verify', '--reason', 'security_change', '--json']);
		const report = JSON.parse(result.stdout);

		assert.equal(result.status, 1);
		assert.equal(report.execution_status, 'passed');
		assert.equal(report.risk_assessment.level, 'high');
		assert.equal(report.risk_assessment.manual_review_required, true);
		assert.deepEqual(report.risk_assessment.required_evidence, [
			'configured_mf_run_receipt',
			'receipt_bound_to_current_plan',
			'synchronized_contract_surfaces',
			'remaining_risk_review',
		]);
		assert.equal(report.completion_verdict.status, 'partially_verified');
		assert.equal(report.completion_verdict.primary_reason, 'risk_priced_evidence_review_required');
		assert.equal(report.completion_verdict.evidence.risk_priced_evidence_risk_count, 1);
		assert.equal(report.completion_verdict.evidence.risks.risk_priced_evidence, 1);
		assert.deepEqual(report.completion_verdict.limitations, ['risk_priced_evidence_requires_review']);
		assert.deepEqual(report.evidence_model.risk_assessment, report.risk_assessment);
		assert.deepEqual(report.evidence_model.remaining_risks, [
			{
				code: 'risk_priced_evidence_requires_review',
				severity: 'high',
				detail: [
					'Verification risk is high; required evidence:',
					'configured_mf_run_receipt, receipt_bound_to_current_plan,',
					'synchronized_contract_surfaces, remaining_risk_review.',
				].join(' '),
			},
		]);
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

test('rejects unsupported verify option forms through shared option parsing', async () => {
	const projectPath = createTempProject();

	try {
		await initProject(projectPath);
		const booleanValue = await runCli(projectPath, ['verify', '--reason', 'custom_verify', '--json=true']);
		const emptyReason = await runCli(projectPath, ['verify', '--reason=']);

		assert.equal(booleanValue.status, 1);
		assert.match(booleanValue.stderr, /Unknown option: --json=true/);
		assert.match(booleanValue.stderr, /Usage: mf verify/);

		assert.equal(emptyReason.status, 1);
		assert.match(emptyReason.stderr, /Missing value for --reason/);
		assert.match(emptyReason.stderr, /Usage: mf verify/);
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
		assert.match(result.stderr, /Usage: mf verify/);
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

test('reports run-plan blockers as skipped verification candidates', async () => {
	const projectPath = createTempProject();

	try {
		await initProject(projectPath);
		appendIntent(
			projectPath,
			`
[intents.verify_outside_cwd]
status = "configured"
lifecycle = "oneshot"
run_policy = "agent_allowed"
description = "Verification intent with an unsafe cwd."
argv = ['${process.execPath}', '-e', 'console.log("should not run")']
cwd = "../outside"
timeout_seconds = 10
stdin = "closed"
success_exit_codes = [0]
writes = []
network = false
destructive = false
required_after = ["outside_cwd_verify"]
`,
		);

		const result = await runCli(projectPath, ['verify', '--reason', 'outside_cwd_verify', '--json']);
		const report = JSON.parse(result.stdout);

		assert.equal(result.status, 1);
		assert.equal(report.status, 'blocked');
		assert.equal(report.summary.matched, 1);
		assert.equal(report.summary.ran, 0);
		assert.equal(report.summary.skipped, 1);
		assert.equal(report.results[0].intent, 'verify_outside_cwd');
		assert.equal(report.results[0].status, 'skipped');
		assert.equal(report.results[0].reason, 'cwd_outside_project');
		assert.match(report.results[0].detail, /cwd|root|outside|\.\./u);

		const planOnlyResult = await runCli(projectPath, ['verify', '--reason', 'outside_cwd_verify', '--plan-only', '--json']);
		const planOnlyReport = JSON.parse(planOnlyResult.stdout);

		assert.equal(planOnlyResult.status, 0, planOnlyResult.stderr || planOnlyResult.stdout);
		assert.equal(planOnlyReport.candidates[0].intent, 'verify_outside_cwd');
		assert.equal(planOnlyReport.candidates[0].status, 'skipped');
		assert.equal(planOnlyReport.candidates[0].skipReason, 'cwd_outside_project');
		assert.equal(planOnlyReport.schedule.entries.length, 0);
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
