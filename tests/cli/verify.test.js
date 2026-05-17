import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, mkdtempSync, rmSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

import { createVerifyCompletionVerdict } from '../../dist/core/completion-verdict.js';
import {
	createVerificationFailureFingerprint,
	REPEATED_FAILURE_STATE_LIMIT,
	REPEATED_FAILURE_STATE_PATH,
	updateRepeatedFailureState,
} from '../../dist/core/repeated-failure.js';
import { createValidationRatchetRisks } from '../../dist/core/validation-ratchet.js';

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
		assert.match(report.verification_plan_id, /^sha256:[0-9a-f]{64}$/u);
		assert.equal(report.status, 'passed');
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
		assert.equal(report.results[0].receipt.verification_plan_id, report.verification_plan_id);
		assert.match(report.results[0].receipt.stdout.tail, /verify ok/);
		assert.equal(report.run_dir, '.mustflow/state/runs/verify-latest');
		assert.equal(report.manifest_path, '.mustflow/state/runs/verify-latest/manifest.json');
		const manifestPath = path.join(projectPath, '.mustflow', 'state', 'runs', 'verify-latest', 'manifest.json');
		const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
		const receiptPath = path.join(projectPath, manifest.receipts[0].receipt_path);
		const receiptContent = readFileSync(receiptPath, 'utf8');
		const perIntentReceipt = JSON.parse(receiptContent);
		const receiptSha256 = `sha256:${createHash('sha256').update(receiptContent).digest('hex')}`;
		const latest = JSON.parse(readFileSync(path.join(projectPath, '.mustflow', 'state', 'runs', 'latest.json'), 'utf8'));

		assert.equal(manifest.command, 'verify');
		assert.equal(manifest.verification_plan_id, report.verification_plan_id);
		assert.equal(manifest.status, 'passed');
		assert.deepEqual(manifest.completion_verdict, report.completion_verdict);
		assert.deepEqual(manifest.reasons, ['custom_verify']);
		assert.equal(manifest.receipts[0].intent, 'verify_echo');
		assert.equal(manifest.receipts[0].status, 'passed');
		assert.equal(manifest.receipts[0].verification_plan_id, report.verification_plan_id);
		assert.match(manifest.receipts[0].receipt_path, /\.mustflow\/state\/runs\/verify-latest\/intents\/001-verify_echo\.json/u);
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
		assert.equal(perIntentReceipt.verification_plan_id, report.verification_plan_id);
		assert.equal(perIntentReceipt.receipt_path, manifest.receipts[0].receipt_path);
		assert.match(perIntentReceipt.stdout.tail, /verify ok/);
		assert.equal(latest.command, 'verify');
		assert.equal(latest.kind, 'verify_run_summary');
		assert.equal(latest.verification_plan_id, report.verification_plan_id);
		assert.equal(latest.status, 'passed');
		assert.deepEqual(latest.completion_verdict, report.completion_verdict);
		assert.deepEqual(manifest.evidence_model, report.evidence_model);
		assert.deepEqual(latest.evidence_model, report.evidence_model);
		assert.equal(latest.manifest_path, '.mustflow/state/runs/verify-latest/manifest.json');
	} finally {
		removeTempProject(projectPath);
	}
});

test('does not verify when selected commands pass without bound receipts', () => {
	const verdict = createVerifyCompletionVerdict({
		verificationPlanId: `sha256:${'0'.repeat(64)}`,
		matchedIntents: 1,
		ranIntents: 1,
		passedIntents: 1,
		failedIntents: 0,
		skippedIntents: 0,
		receiptCount: 0,
	});

	assert.equal(verdict.status, 'partially_verified');
	assert.equal(verdict.primary_reason, 'receipt_binding_review_required');
	assert.equal(verdict.evidence.receipt_count, 0);
	assert.equal(verdict.evidence.receipt_binding_risk_count, 1);
	assert.equal(verdict.evidence.risks.receipt_binding, 1);
	assert.deepEqual(verdict.limitations, ['receipt_binding_requires_review']);
});

test('treats plan-receipt mismatch as a contradiction before lower verdict states', () => {
	const verdict = createVerifyCompletionVerdict({
		verificationPlanId: `sha256:${'1'.repeat(64)}`,
		matchedIntents: 1,
		ranIntents: 1,
		passedIntents: 1,
		failedIntents: 0,
		skippedIntents: 0,
		receiptCount: 1,
		sourceAnchorRiskCount: 1,
		planMismatchCount: 1,
	});

	assert.equal(verdict.status, 'contradicted');
	assert.equal(verdict.primary_reason, 'plan_receipt_mismatch');
	assert.equal(verdict.evidence.plan_mismatch_count, 1);
	assert.equal(verdict.evidence.risks.plan_mismatch, 1);
	assert.deepEqual(verdict.contradictions, ['plan_receipt_mismatch']);
	assert.deepEqual(verdict.limitations, []);
});

test('blocks verified claims when repeated failure rules require new evidence', () => {
	const verdict = createVerifyCompletionVerdict({
		verificationPlanId: `sha256:${'2'.repeat(64)}`,
		matchedIntents: 1,
		ranIntents: 1,
		passedIntents: 1,
		failedIntents: 0,
		skippedIntents: 0,
		receiptCount: 1,
		repeatedFailureCount: 1,
		repeatedFailureBlockerCount: 1,
	});

	assert.equal(verdict.status, 'blocked');
	assert.equal(verdict.primary_reason, 'repeated_failure_requires_new_evidence');
	assert.equal(verdict.evidence.repeated_failure_count, 1);
	assert.equal(verdict.evidence.risks.repeated_failure, 1);
	assert.deepEqual(verdict.blockers, ['repeated_failure_requires_new_evidence']);
	assert.deepEqual(verdict.contradictions, []);
});

test('treats critical validation ratchet risks as contradicted completion evidence', () => {
	const verdict = createVerifyCompletionVerdict({
		verificationPlanId: `sha256:${'3'.repeat(64)}`,
		matchedIntents: 1,
		ranIntents: 1,
		passedIntents: 1,
		failedIntents: 0,
		skippedIntents: 0,
		receiptCount: 1,
		validationRatchetRiskCount: 1,
		validationRatchetContradictionCount: 1,
	});

	assert.equal(verdict.status, 'contradicted');
	assert.equal(verdict.primary_reason, 'validation_ratchet_contradicted');
	assert.equal(verdict.evidence.validation_ratchet_risk_count, 1);
	assert.equal(verdict.evidence.risks.validation_ratchet, 1);
	assert.deepEqual(verdict.contradictions, ['validation_ratchet_contradicted']);
	assert.deepEqual(verdict.limitations, []);
});

test('downgrades verified verdicts when high-risk source anchors need invariant review', () => {
	const projectPath = createTempProject();

	try {
		initProject(projectPath);
		mkdirSync(path.join(projectPath, 'src'), { recursive: true });
		const sourcePath = path.join(projectPath, 'src', 'auth.ts');
		writeFileSync(
			sourcePath,
			`
/**
 * mf:anchor auth.permission.resolve
 * purpose: Resolve authorization permission.
 * search: authorization, permission
 * invariant: deny by default when role is unknown
 * risk: authz
 */
export function canAccess(role) {
	return role === 'admin';
}
`,
		);
		appendIntent(
			projectPath,
			`
[intents.verify_auth]
status = "configured"
lifecycle = "oneshot"
run_policy = "agent_allowed"
description = "Verify authorization behavior."
argv = ['${process.execPath}', '-e', 'process.exit(0)']
cwd = "."
timeout_seconds = 10
stdin = "closed"
success_exit_codes = [0]
writes = []
network = false
destructive = false
required_after = ["auth_change"]
`,
		);
		const firstIndex = runCli(projectPath, ['index', '--source', '--json']);
		assert.equal(firstIndex.status, 0, firstIndex.stderr || firstIndex.stdout);

		writeFileSync(
			sourcePath,
			`
/**
 * mf:anchor auth.permission.resolve
 * purpose: Resolve authorization permission.
 * search: authorization, permission
 * invariant: allow known roles after policy lookup
 * risk: authz
 */
export function canAccess(role) {
	return role === 'admin' || role === 'support';
}
`,
		);

		const secondIndex = runCli(projectPath, ['index', '--source', '--json']);
		assert.equal(secondIndex.status, 0, secondIndex.stderr || secondIndex.stdout);
		const plan = path.join(projectPath, 'auth-plan.json');
		writeFileSync(plan, JSON.stringify(createClassifyPlan(projectPath, 'auth_change', 'src/auth.ts'), null, 2));

		const result = runCli(projectPath, ['verify', '--from-plan', plan, '--json']);
		const report = JSON.parse(result.stdout);

		assert.equal(result.status, 0, result.stderr || result.stdout);
		assert.equal(report.status, 'passed');
		assert.equal(report.completion_verdict.status, 'partially_verified');
		assert.equal(report.completion_verdict.primary_reason, 'source_anchor_invariant_review_required');
		assert.equal(report.completion_verdict.evidence.source_anchor_risk_count, 1);
		assert.equal(report.completion_verdict.evidence.risks.source_anchor, 1);
		assert.deepEqual(report.completion_verdict.limitations, ['high_risk_source_anchor_requires_review']);
		assert.equal(report.evidence_model.coverage_matrix[0].status, 'partially_covered');
		assert.deepEqual(report.evidence_model.coverage_matrix[0].evidence.source_anchor_ids, [
			'auth.permission.resolve',
		]);
		assert.deepEqual(report.evidence_model.remaining_risks, [
			{
				code: 'source_anchor_invariant_review_required',
				severity: 'high',
				detail:
					'auth.permission.resolve in src/auth.ts:3 is review; review its invariant before marking the task verified.',
			},
		]);
	} finally {
		removeTempProject(projectPath);
	}
});

test('downgrades verified verdicts when changed files exceed the scope diff budget', () => {
	const projectPath = createTempProject();

	try {
		initProject(projectPath);
		appendIntent(
			projectPath,
			`
[intents.verify_scope]
status = "configured"
lifecycle = "oneshot"
run_policy = "agent_allowed"
description = "Verify broad scope behavior."
argv = ['${process.execPath}', '-e', 'process.exit(0)']
cwd = "."
timeout_seconds = 10
stdin = "closed"
success_exit_codes = [0]
writes = []
network = false
destructive = false
required_after = ["scope_change"]
`,
		);

		const files = Array.from({ length: 9 }, (_, index) => `src/scope-${index + 1}.ts`);
		const plan = path.join(projectPath, 'scope-plan.json');
		writeFileSync(
			plan,
			JSON.stringify(
				{
					schema_version: '1',
					command: 'classify',
					mustflow_root: projectPath,
					source: 'paths',
					files,
					classifications: files.map((filePath) => ({
						path: filePath,
						changeKinds: ['implementation'],
						surface: {
							kind: 'implementation',
							category: 'code',
							isPublicSurface: false,
							validationReasons: ['scope_change'],
							affectedContracts: ['runtime behavior when exported through CLI or package output'],
							updatePolicy: 'not_applicable',
							driftChecks: ['related tests', 'build output'],
						},
					})),
					summary: {
						fileCount: files.length,
						publicSurfaceCount: 0,
						changeKinds: ['implementation'],
						validationReasons: ['scope_change'],
						updatePolicies: [],
						driftChecks: ['build output', 'related tests'],
						affectedContracts: ['runtime behavior when exported through CLI or package output'],
					},
				},
				null,
				2,
			),
		);

		const result = runCli(projectPath, ['verify', '--from-plan', plan, '--json']);
		const report = JSON.parse(result.stdout);

		assert.equal(result.status, 0, result.stderr || result.stdout);
		assert.equal(report.status, 'passed');
		assert.equal(report.completion_verdict.status, 'partially_verified');
		assert.equal(report.completion_verdict.primary_reason, 'scope_diff_review_required');
		assert.equal(report.completion_verdict.evidence.scope_diff_risk_count, 1);
		assert.equal(report.completion_verdict.evidence.risks.scope_diff, 1);
		assert.deepEqual(report.completion_verdict.limitations, ['scope_diff_risk_requires_review']);
		assert.deepEqual(report.evidence_model.remaining_risks, [
			{
				code: 'diff_budget_exceeded',
				severity: 'high',
				detail: 'Changed file count 9 exceeds the conservative completion budget of 8.',
			},
		]);
	} finally {
		removeTempProject(projectPath);
	}
});

test('flags repeated unresolved verification failures for the same plan', () => {
	const projectPath = createTempProject();

	try {
		initProject(projectPath);
		appendIntent(
			projectPath,
			`
[intents.verify_repeat_failure]
status = "configured"
lifecycle = "oneshot"
run_policy = "agent_allowed"
description = "Fail repeat verification."
argv = ['${process.execPath}', '-e', 'process.exit(1)']
cwd = "."
timeout_seconds = 10
stdin = "closed"
success_exit_codes = [0]
writes = []
network = false
destructive = false
required_after = ["repeat_failure"]
`,
		);
		const plan = path.join(projectPath, 'repeat-plan.json');
		writeFileSync(plan, JSON.stringify(createClassifyPlan(projectPath, 'repeat_failure'), null, 2));

		const firstResult = runCli(projectPath, ['verify', '--from-plan', plan, '--json']);
		const firstReport = JSON.parse(firstResult.stdout);
		const secondResult = runCli(projectPath, ['verify', '--from-plan', plan, '--json']);
		const secondReport = JSON.parse(secondResult.stdout);
		const thirdResult = runCli(projectPath, ['verify', '--from-plan', plan, '--json']);
		const thirdReport = JSON.parse(thirdResult.stdout);

		assert.equal(firstResult.status, 1);
		assert.equal(firstReport.status, 'failed');
		assert.equal(firstReport.completion_verdict.status, 'contradicted');
		assert.equal(firstReport.completion_verdict.evidence.repeated_failure_count, 0);
		assert.equal(firstReport.completion_verdict.evidence.risks.repeated_failure, 0);
		assert.match(firstReport.failure_fingerprint.fingerprint, /^sha256:/);
		assert.equal(firstReport.failure_fingerprint.verification_plan_id, firstReport.verification_plan_id);
		assert.equal(firstReport.repeated_failure_summary.fingerprint, firstReport.failure_fingerprint.fingerprint);
		assert.equal(firstReport.repeated_failure_summary.seen_count, 1);
		assert.equal(firstReport.repeated_failure_summary.requires_new_evidence, false);
		assert.deepEqual(firstReport.completion_verdict.contradictions, ['one_or_more_selected_verification_intents_failed']);
		assert.equal(secondResult.status, 1);
		assert.equal(secondReport.status, 'failed');
		assert.equal(secondReport.verification_plan_id, firstReport.verification_plan_id);
		assert.equal(secondReport.failure_fingerprint.fingerprint, firstReport.failure_fingerprint.fingerprint);
		assert.equal(secondReport.repeated_failure_summary.fingerprint, secondReport.failure_fingerprint.fingerprint);
		assert.equal(secondReport.repeated_failure_summary.seen_count, 2);
		assert.equal(secondReport.repeated_failure_summary.requires_new_evidence, true);
		assert.equal(secondReport.repeated_failure_summary.first_seen_at, firstReport.repeated_failure_summary.first_seen_at);
		assert.equal(secondReport.completion_verdict.status, 'contradicted');
		assert.equal(secondReport.completion_verdict.evidence.repeated_failure_count, 1);
		assert.equal(secondReport.completion_verdict.evidence.risks.repeated_failure, 1);
		assert.deepEqual(secondReport.completion_verdict.contradictions, [
			'one_or_more_selected_verification_intents_failed',
			'repeated_verification_failure',
		]);
		assert.deepEqual(secondReport.evidence_model.remaining_risks, [
			{
				code: 'repeated_verification_failure',
				severity: 'high',
				detail:
					'The previous verify summary has the same failure fingerprint and an unresolved status; provide new evidence or a narrower hypothesis before marking the task complete.',
			},
		]);
		assert.deepEqual(secondReport.evidence_model.explanation.contradicted_by, [
			'one_or_more_selected_verification_intents_failed',
			'repeated_verification_failure',
		]);
		assert.equal(thirdResult.status, 1);
		assert.equal(thirdReport.status, 'failed');
		assert.equal(thirdReport.failure_fingerprint.fingerprint, firstReport.failure_fingerprint.fingerprint);
		assert.equal(thirdReport.repeated_failure_summary.seen_count, 3);
		assert.equal(thirdReport.repeated_failure_summary.requires_new_evidence, true);
		assert.equal(thirdReport.completion_verdict.status, 'contradicted');
		assert.equal(thirdReport.completion_verdict.evidence.repeated_failure_count, 2);
		assert.deepEqual(
			thirdReport.evidence_model.remaining_risks.map((risk) => risk.code),
			['repeated_verification_failure', 'repeated_failure_requires_new_evidence'],
		);

		const latest = JSON.parse(readFileSync(path.join(projectPath, '.mustflow', 'state', 'runs', 'latest.json'), 'utf8'));
		assert.equal(latest.verification_plan_id, thirdReport.verification_plan_id);
		assert.equal(latest.failure_fingerprint.fingerprint, thirdReport.failure_fingerprint.fingerprint);
		assert.deepEqual(latest.repeated_failure_summary, thirdReport.repeated_failure_summary);
		assert.equal(latest.completion_verdict.evidence.repeated_failure_count, 2);
		assert.deepEqual(latest.evidence_model.remaining_risks, thirdReport.evidence_model.remaining_risks);
		const repeatedFailureState = JSON.parse(
			readFileSync(path.join(projectPath, '.mustflow', 'state', 'repeated-failures.json'), 'utf8'),
		);
		assert.equal(repeatedFailureState.schema_version, '1');
		assert.equal(repeatedFailureState.fingerprints.length, 1);
		assert.deepEqual(repeatedFailureState.fingerprints[0], thirdReport.repeated_failure_summary);
	} finally {
		removeTempProject(projectPath);
	}
});

test('keeps repeated failure state bounded to derived fingerprint summaries', () => {
	const projectPath = createTempProject();

	try {
		initProject(projectPath);
		for (let index = 0; index < REPEATED_FAILURE_STATE_LIMIT + 5; index += 1) {
			const failureFingerprint = createVerificationFailureFingerprint({
				verificationPlanId: `sha256:${index.toString(16).padStart(64, '0')}`,
				failedIntents: [`verify_${index}`],
				exitCodeClasses: ['failure'],
				timeoutFlags: [false],
				errorKinds: ['exit_code'],
				riskCodes: [`risk_${index}`],
				affectedSurfaces: [`surface_${index}`],
				commandFingerprints: [`sha256:${(index + 1).toString(16).padStart(64, '0')}`],
			});

			assert.ok(failureFingerprint);
			updateRepeatedFailureState({
				projectRoot: projectPath,
				failureFingerprint,
				status: 'failed',
				observedAt: new Date(Date.UTC(2026, 0, 1, 0, 0, index)),
			});
		}

		const statePath = path.join(projectPath, ...REPEATED_FAILURE_STATE_PATH.split('/'));
		const stateText = readFileSync(statePath, 'utf8');
		const state = JSON.parse(stateText);
		const allowedKeys = [
			'schema_version',
			'fingerprint',
			'verification_plan_id',
			'status',
			'failed_intents_hash',
			'risk_codes_hash',
			'affected_surfaces_hash',
			'first_seen_at',
			'last_seen_at',
			'seen_count',
			'requires_new_evidence',
		].sort();

		assert.equal(state.schema_version, '1');
		assert.equal(state.fingerprints.length, REPEATED_FAILURE_STATE_LIMIT);
		assert.equal(state.fingerprints[0].verification_plan_id, `sha256:${'36'.padStart(64, '0')}`);
		assert.equal(state.fingerprints.at(-1).verification_plan_id, `sha256:${'5'.padStart(64, '0')}`);
		for (const summary of state.fingerprints) {
			assert.deepEqual(Object.keys(summary).sort(), allowedKeys);
			assert.match(summary.fingerprint, /^sha256:/);
			assert.match(summary.failed_intents_hash, /^sha256:/);
			assert.match(summary.risk_codes_hash, /^sha256:/);
			assert.match(summary.affected_surfaces_hash, /^sha256:/);
		}
		assert.doesNotMatch(stateText, /stdout|stderr|stack|trace|transcript|raw|verify_0|risk_0|surface_0/u);
	} finally {
		removeTempProject(projectPath);
	}
});

test('downgrades verified verdicts when changed tests carry validation ratchet risk', () => {
	const projectPath = createTempProject();

	try {
		initProject(projectPath);
		appendIntent(
			projectPath,
			`
[intents.verify_ratchet]
status = "configured"
lifecycle = "oneshot"
run_policy = "agent_allowed"
description = "Verify validation ratchet risk."
argv = ['${process.execPath}', '-e', 'process.exit(0)']
cwd = "."
timeout_seconds = 10
stdin = "closed"
success_exit_codes = [0]
writes = []
network = false
destructive = false
required_after = ["ratchet_change"]
`,
		);
		const testFilePath = path.join(projectPath, 'tests', 'ratchet.test.js');
		mkdirSync(path.dirname(testFilePath), { recursive: true });
		const focusedMarker = 'test' + '.only';
		writeFileSync(
			testFilePath,
			`
import { test } from 'node:test';

${focusedMarker}('focused test should be reviewed', () => {});
`,
		);
		const plan = path.join(projectPath, 'ratchet-plan.json');
		writeFileSync(
			plan,
			JSON.stringify(
				{
					schema_version: '1',
					command: 'classify',
					mustflow_root: projectPath,
					source: 'paths',
					files: ['tests/ratchet.test.js'],
					classifications: [
						{
							path: 'tests/ratchet.test.js',
							changeKinds: ['test'],
							surface: {
								kind: 'test_contract',
								category: 'test',
								isPublicSurface: false,
								validationReasons: ['ratchet_change'],
								affectedContracts: ['test behavior contract'],
								updatePolicy: 'not_applicable',
								driftChecks: ['related test selection'],
							},
						},
					],
					summary: {
						fileCount: 1,
						publicSurfaceCount: 0,
						changeKinds: ['test'],
						validationReasons: ['ratchet_change'],
						updatePolicies: [],
						driftChecks: ['related test selection'],
						affectedContracts: ['test behavior contract'],
					},
				},
				null,
				2,
			),
		);

		const result = runCli(projectPath, ['verify', '--from-plan', plan, '--json']);
		const report = JSON.parse(result.stdout);

		assert.equal(result.status, 0, result.stderr || result.stdout);
		assert.equal(report.status, 'passed');
		assert.equal(report.completion_verdict.status, 'partially_verified');
		assert.equal(report.completion_verdict.primary_reason, 'validation_ratchet_review_required');
		assert.equal(report.completion_verdict.evidence.validation_ratchet_risk_count, 1);
		assert.equal(report.completion_verdict.evidence.risks.validation_ratchet, 1);
		assert.deepEqual(report.completion_verdict.limitations, ['validation_ratchet_risk_requires_review']);
		assert.deepEqual(report.evidence_model.remaining_risks, [
			{
				code: 'skip_or_only_marker_present',
				severity: 'medium',
				detail:
					'Changed test path tests/ratchet.test.js contains a .skip or .only marker; review whether validation was weakened before marking the task verified.',
			},
		]);
	} finally {
		removeTempProject(projectPath);
	}
});

test('detects obvious validation weakening in changed tests', () => {
	const projectPath = createTempProject();

	try {
		initProject(projectPath);
		appendIntent(
			projectPath,
			`
[intents.verify_test_contract]
status = "configured"
lifecycle = "oneshot"
run_policy = "agent_allowed"
description = "Verify test contract changes."
argv = ['${process.execPath}', '-e', 'process.exit(0)']
cwd = "."
timeout_seconds = 10
stdin = "closed"
success_exit_codes = [0]
writes = []
network = false
destructive = false
required_after = ["ratchet_change"]
`,
		);
		const testFilePath = path.join(projectPath, 'tests', 'ratchet-assertions.test.js');
		mkdirSync(path.dirname(testFilePath), { recursive: true });
		writeFileSync(
			testFilePath,
			`
import assert from 'node:assert/strict';
import { test } from 'node:test';

test('keeps strong behavior checks', () => {
	assert.equal(1 + 1, 2);
	assert.deepEqual({ ok: true }, { ok: true });
	assert.throws(() => {
		throw new Error('expected');
	});
});
`,
		);
		commitProjectBaseline(projectPath);
		writeFileSync(
			testFilePath,
			`
import assert from 'node:assert/strict';
import { test } from 'node:test';

test('keeps strong behavior checks', () => {
	assert.ok(1 + 1);
});

test.todo('restore rejected-path coverage');
`,
		);

		const plan = path.join(projectPath, 'ratchet-assertions-plan.json');
		writeFileSync(
			plan,
			JSON.stringify(
				{
					schema_version: '1',
					command: 'classify',
					mustflow_root: projectPath,
					source: 'changed',
					files: ['tests/ratchet-assertions.test.js'],
					classifications: [
						{
							path: 'tests/ratchet-assertions.test.js',
							changeKinds: ['test'],
							surface: {
								kind: 'test_contract',
								category: 'test',
								isPublicSurface: false,
								validationReasons: ['ratchet_change'],
								affectedContracts: ['test behavior contract'],
								updatePolicy: 'not_applicable',
								driftChecks: ['related test selection'],
							},
						},
					],
					summary: {
						fileCount: 1,
						publicSurfaceCount: 0,
						changeKinds: ['test'],
						validationReasons: ['ratchet_change'],
						updatePolicies: [],
						driftChecks: ['related test selection'],
						affectedContracts: ['test behavior contract'],
					},
				},
				null,
				2,
			),
		);

		const result = runCli(projectPath, ['verify', '--from-plan', plan, '--json']);
		const report = JSON.parse(result.stdout);
		const riskCodes = report.evidence_model.remaining_risks.map((risk) => risk.code);

		assert.equal(result.status, 0, result.stderr || result.stdout);
		assert.equal(report.status, 'passed');
		assert.equal(report.completion_verdict.status, 'partially_verified');
		assert.equal(report.completion_verdict.primary_reason, 'validation_ratchet_review_required');
		assert.equal(report.completion_verdict.evidence.validation_ratchet_risk_count, 4);
		assert.deepEqual(riskCodes, [
			'todo_or_pending_marker_added',
			'assertion_count_decreased',
			'assertion_matcher_weakened',
			'exception_assertion_removed',
		]);
	} finally {
		removeTempProject(projectPath);
	}
});

test('keeps language-specific validation ratchet analysis conservative', () => {
	const projectPath = createTempProject();

	try {
		initProject(projectPath);
		const testFilePath = path.join(projectPath, 'tests', 'ratchet-python.test.py');
		mkdirSync(path.dirname(testFilePath), { recursive: true });
		writeFileSync(
			testFilePath,
			`
def test_denies_admin_access():
    assert can_access("viewer") is False
`,
		);
		commitProjectBaseline(projectPath);
		writeFileSync(
			testFilePath,
			`
def test_denies_admin_access():
    result = can_access("viewer")
`,
		);

		const risks = createValidationRatchetRisks(
			{
				source: 'changed',
				files: ['tests/ratchet-python.test.py'],
				classifications: [
					{
						path: 'tests/ratchet-python.test.py',
						changeKinds: ['test'],
						surface: {
							kind: 'test_contract',
							category: 'test',
							isPublicSurface: false,
							validationReasons: ['ratchet_change'],
							affectedContracts: ['test behavior contract'],
							updatePolicy: 'not_applicable',
							driftChecks: ['related test selection'],
						},
					},
				],
				summary: {
					fileCount: 1,
					publicSurfaceCount: 0,
					changeKinds: ['test'],
					validationReasons: ['ratchet_change'],
					updatePolicies: [],
					driftChecks: ['related test selection'],
					affectedContracts: ['test behavior contract'],
				},
			},
			projectPath,
		);

		assert.deepEqual(risks, []);
	} finally {
		removeTempProject(projectPath);
	}
});

test('detects command contract validation weakening from changed diffs', () => {
	const projectPath = createTempProject();

	try {
		initProject(projectPath);
		commitProjectBaseline(projectPath);
		const commandsPath = path.join(projectPath, '.mustflow', 'config', 'commands.toml');
		let commands = readFileSync(commandsPath, 'utf8');
		commands = commands.replace('success_exit_codes = [0]', 'success_exit_codes = [0, 1]');
		commands = commands.replace('required_after = ["code_change", "behavior_change", "test_change"]', '');
		commands += `

[intents.weak_test]
status = "manual_only"
description = "Weak test command."
argv = ["npm", "test", "--", "--passWithNoTests", "--grep", "happy"]
`;
		writeFileSync(commandsPath, commands);

		const risks = createValidationRatchetRisks(
			{
				source: 'changed',
				files: ['.mustflow/config/commands.toml'],
				classifications: [
					{
						path: '.mustflow/config/commands.toml',
						changeKinds: ['workflow'],
						surface: {
							kind: 'workflow_root',
							category: 'workflow',
							isPublicSurface: true,
							validationReasons: ['mustflow_config_change'],
							affectedContracts: ['command contract'],
							updatePolicy: 'update',
							driftChecks: ['strict workflow validation'],
						},
					},
				],
				summary: {
					fileCount: 1,
					publicSurfaceCount: 1,
					changeKinds: ['workflow'],
					validationReasons: ['mustflow_config_change'],
					updatePolicies: ['update'],
					driftChecks: ['strict workflow validation'],
					affectedContracts: ['command contract'],
				},
			},
			projectPath,
		);
		const riskCodes = risks.map((risk) => risk.code);
		const severities = Object.fromEntries(risks.map((risk) => [risk.code, risk.severity]));

		assert.deepEqual(riskCodes, [
			'verification_intent_disabled',
			'verification_required_after_removed',
			'success_exit_codes_widened',
			'command_allows_no_tests',
			'test_selection_narrowed',
		]);
		assert.equal(severities.verification_intent_disabled, 'high');
		assert.equal(severities.verification_required_after_removed, 'high');
		assert.equal(severities.success_exit_codes_widened, 'critical');
		assert.equal(severities.command_allows_no_tests, 'critical');
		assert.equal(severities.test_selection_narrowed, 'medium');
	} finally {
		removeTempProject(projectPath);
	}
});

test('detects package validation script weakening from changed diffs', () => {
	const projectPath = createTempProject();

	try {
		initProject(projectPath);
		const packageJsonPath = path.join(projectPath, 'package.json');
		writeFileSync(
			packageJsonPath,
			JSON.stringify(
				{
					scripts: {
						test: 'vitest run',
					},
				},
				null,
				2,
			),
		);
		commitProjectBaseline(projectPath);
		writeFileSync(
			packageJsonPath,
			JSON.stringify(
				{
					scripts: {
						test: 'vitest run --passWithNoTests --updateSnapshot --testNamePattern happy || true',
					},
				},
				null,
				2,
			),
		);

		const risks = createValidationRatchetRisks(
			{
				source: 'changed',
				files: ['package.json'],
				classifications: [
					{
						path: 'package.json',
						changeKinds: ['package_metadata'],
						surface: {
							kind: 'package_manifest',
							category: 'configuration',
							isPublicSurface: true,
							validationReasons: ['package_metadata_change'],
							affectedContracts: ['package scripts'],
							updatePolicy: 'update',
							driftChecks: ['validation command behavior'],
						},
					},
				],
				summary: {
					fileCount: 1,
					publicSurfaceCount: 1,
					changeKinds: ['package_metadata'],
					validationReasons: ['package_metadata_change'],
					updatePolicies: ['update'],
					driftChecks: ['validation command behavior'],
					affectedContracts: ['package scripts'],
				},
			},
			projectPath,
		);
		const riskCodes = risks.map((risk) => risk.code);
		const severities = Object.fromEntries(risks.map((risk) => [risk.code, risk.severity]));

		assert.deepEqual(riskCodes, [
			'command_allows_no_tests',
			'command_forces_snapshot_update',
			'command_hides_failure',
			'test_selection_narrowed',
		]);
		assert.equal(severities.command_allows_no_tests, 'critical');
		assert.equal(severities.command_forces_snapshot_update, 'medium');
		assert.equal(severities.command_hides_failure, 'critical');
		assert.equal(severities.test_selection_narrowed, 'medium');
	} finally {
		removeTempProject(projectPath);
	}
});

test('downgrades verified verdicts when a receipt reports undeclared write drift', () => {
	const projectPath = createTempProject();

	try {
		initProject(projectPath);
		appendIntent(
			projectPath,
			`
[intents.verify_write_drift]
status = "configured"
lifecycle = "oneshot"
run_policy = "agent_allowed"
description = "Verify write drift detection."
argv = ['${process.execPath}', '-e', 'require("node:fs").writeFileSync("drift.txt", "drift")']
cwd = "."
timeout_seconds = 10
stdin = "closed"
success_exit_codes = [0]
writes = []
network = false
destructive = false
required_after = ["write_drift_change"]
`,
		);
		commitProjectBaseline(projectPath);

		const result = runCli(projectPath, ['verify', '--reason', 'write_drift_change', '--json']);
		const report = JSON.parse(result.stdout);

		assert.equal(result.status, 0, result.stderr || result.stdout);
		assert.equal(report.status, 'passed');
		assert.equal(report.completion_verdict.status, 'partially_verified');
		assert.equal(report.completion_verdict.primary_reason, 'write_drift_review_required');
		assert.equal(report.completion_verdict.evidence.write_drift_risk_count, 1);
		assert.equal(report.completion_verdict.evidence.risks.write_drift, 1);
		assert.deepEqual(report.completion_verdict.limitations, ['write_drift_requires_review']);
		assert.equal(report.results[0].receipt.write_drift.has_undeclared_changes, true);
	} finally {
		removeTempProject(projectPath);
	}
});

test('treats external CI evidence as lower-authority verdict support', () => {
	const projectPath = createTempProject();

	try {
		initProject(projectPath);
		appendIntent(
			projectPath,
			`
[intents.verify_external]
status = "configured"
lifecycle = "oneshot"
run_policy = "agent_allowed"
description = "Verify local behavior before reading external evidence."
argv = ['${process.execPath}', '-e', 'process.exit(0)']
cwd = "."
timeout_seconds = 10
stdin = "closed"
success_exit_codes = [0]
writes = []
network = false
destructive = false
required_after = ["external_ci_change"]
`,
		);
		const evidencePath = path.join(projectPath, 'external-evidence.json');
		writeFileSync(
			evidencePath,
			JSON.stringify(
				{
					schema_version: '1',
					command: 'external-evidence',
					checks: [
						{
							provider: 'github_actions',
							name: 'ci',
							status: 'failed',
							url: 'https://example.invalid/actions/runs/1',
							summary: 'Hosted check failed after local verification.',
						},
					],
				},
				null,
				2,
			),
		);

		const result = runCli(projectPath, [
			'verify',
			'--reason',
			'external_ci_change',
			'--external-evidence',
			'external-evidence.json',
			'--json',
		]);
		const report = JSON.parse(result.stdout);
		const latest = JSON.parse(readFileSync(path.join(projectPath, '.mustflow', 'state', 'runs', 'latest.json'), 'utf8'));

		assert.equal(result.status, 0, result.stderr || result.stdout);
		assert.equal(report.status, 'passed');
		assert.equal(report.completion_verdict.status, 'partially_verified');
		assert.equal(report.completion_verdict.primary_reason, 'external_evidence_review_required');
		assert.equal(report.completion_verdict.evidence.external_evidence_risk_count, 1);
		assert.equal(report.completion_verdict.evidence.risks.external_evidence, 1);
		assert.deepEqual(report.completion_verdict.limitations, ['external_evidence_requires_review']);
		assert.deepEqual(report.external_checks, [
			{
				source: 'external_ci',
				authority: 'supporting_only',
				provider: 'github_actions',
				name: 'ci',
				status: 'failed',
				url: 'https://example.invalid/actions/runs/1',
				summary: 'Hosted check failed after local verification.',
			},
		]);
		assert.deepEqual(report.evidence_model.external_checks, report.external_checks);
		assert.deepEqual(report.evidence_model.remaining_risks, [
			{
				code: 'external_evidence_requires_review',
				severity: 'medium',
				detail:
					'External github_actions check ci reported failed; review it as supporting evidence, not command authority.',
			},
		]);
		assert.deepEqual(latest.external_checks, report.external_checks);
		assert.deepEqual(latest.evidence_model.external_checks, report.external_checks);
	} finally {
		removeTempProject(projectPath);
	}
});

test('uses structured repro evidence to gate bug-fix completion verdicts', () => {
	const projectPath = createTempProject();

	try {
		initProject(projectPath);
		appendIntent(
			projectPath,
			`
[intents.verify_repro]
status = "configured"
lifecycle = "oneshot"
run_policy = "agent_allowed"
description = "Verify bug-fix behavior before reading repro evidence."
argv = ['${process.execPath}', '-e', 'process.exit(0)']
cwd = "."
timeout_seconds = 10
stdin = "closed"
success_exit_codes = [0]
writes = []
network = false
destructive = false
required_after = ["bug_fix"]
`,
		);

		const seedResult = runCli(projectPath, ['verify', '--reason', 'bug_fix', '--json']);
		const seedReport = JSON.parse(seedResult.stdout);
		assert.equal(seedResult.status, 0, seedResult.stderr || seedResult.stdout);
		const seedReceipt = seedReport.results.find((result) => result.intent === 'verify_repro');
		assert.ok(seedReceipt);
		const receiptBinding = {
			receipt_path: seedReceipt.receipt_path,
			receipt_sha256: seedReceipt.receipt_sha256,
			verification_plan_id: seedReport.verification_plan_id,
		};

		const completeEvidence = {
			schema_version: '1',
			command: 'repro-evidence',
			reported_symptom: 'CLI reported success after the original failing path.',
			expected_behavior: 'The original failing path should pass after the fix.',
			observed_behavior: 'The original failing path no longer fails.',
			reproduction_route: {
				route_id: 'route:verify-repro',
				route_kind: 'cli',
				route_digest: `sha256:${'1'.repeat(64)}`,
				failure_oracle_hash: `sha256:${'2'.repeat(64)}`,
				steps: [
					{
						ordinal: 1,
						action: 'run verify_repro intent',
						target: 'mf verify --reason bug_fix',
						input_digest: `sha256:${'3'.repeat(64)}`,
						observation_digest: `sha256:${'4'.repeat(64)}`,
						summary: 'The bounded route is the configured verify_repro intent.',
					},
				],
			},
			before_fix: {
				status: 'reproduced',
				outcome: 'failed_as_expected',
				...receiptBinding,
				summary: 'A bounded before-fix observation captured the failure state.',
				reason: null,
			},
			after_fix: {
				status: 'passed',
				outcome: 'passed_expected_behavior',
				same_route_as: 'route:verify-repro',
				...receiptBinding,
				summary: 'The same behavior is covered by the local verify_repro intent.',
				reason: null,
			},
			regression_guard: {
				status: 'passed',
				intent: 'verify_repro',
				test_path: null,
				...receiptBinding,
				summary: 'The verify_repro intent remains the regression guard for this bug.',
				reason: null,
			},
		};
		writeFileSync(path.join(projectPath, 'repro-evidence-complete.json'), JSON.stringify(completeEvidence, null, 2));

		const verifiedResult = runCli(projectPath, [
			'verify',
			'--reason',
			'bug_fix',
			'--repro-evidence',
			'repro-evidence-complete.json',
			'--json',
		]);
		const verifiedReport = JSON.parse(verifiedResult.stdout);

		assert.equal(verifiedResult.status, 0, verifiedResult.stderr || verifiedResult.stdout);
		assert.equal(verifiedReport.status, 'passed');
		assert.equal(verifiedReport.completion_verdict.status, 'verified');
		assert.deepEqual(verifiedReport.repro_evidence, {
			source: 'repro_first_debug',
			authority: 'claim_evidence',
			reported_symptom: completeEvidence.reported_symptom,
			expected_behavior: completeEvidence.expected_behavior,
			observed_behavior: completeEvidence.observed_behavior,
			reproduction_route: completeEvidence.reproduction_route,
			before_fix: completeEvidence.before_fix,
			after_fix: completeEvidence.after_fix,
			regression_guard: completeEvidence.regression_guard,
		});
		const serializedReproEvidence = JSON.stringify(verifiedReport.repro_evidence);
		assert.doesNotMatch(
			serializedReproEvidence,
			/original_reproduction|evidence_before_fix|evidence_after_fix/u,
		);
		assert.doesNotMatch(serializedReproEvidence, /\b(?:stdout|stderr|raw|chat|transcript|tail)\b/iu);

		const mismatchedRouteEvidence = {
			...completeEvidence,
			after_fix: {
				...completeEvidence.after_fix,
				same_route_as: 'route:other-path',
			},
		};
		writeFileSync(
			path.join(projectPath, 'repro-evidence-mismatched-route.json'),
			JSON.stringify(mismatchedRouteEvidence, null, 2),
		);

		const mismatchedRouteResult = runCli(projectPath, [
			'verify',
			'--reason',
			'bug_fix',
			'--repro-evidence',
			'repro-evidence-mismatched-route.json',
			'--json',
		]);
		const mismatchedRouteReport = JSON.parse(mismatchedRouteResult.stdout);

		assert.equal(mismatchedRouteResult.status, 0, mismatchedRouteResult.stderr || mismatchedRouteResult.stdout);
		assert.equal(mismatchedRouteReport.status, 'passed');
		assert.equal(mismatchedRouteReport.completion_verdict.status, 'partially_verified');
		assert.equal(mismatchedRouteReport.completion_verdict.primary_reason, 'repro_evidence_missing');
		assert.equal(mismatchedRouteReport.completion_verdict.evidence.repro_evidence_risk_count, 1);
		assert.deepEqual(mismatchedRouteReport.evidence_model.remaining_risks, [
			{
				code: 'repro_evidence_missing',
				severity: 'high',
				detail: 'Bug-fix repro evidence after_fix.same_route_as does not match reproduction_route.route_id.',
			},
		]);

		const staleReceiptEvidence = {
			...completeEvidence,
			after_fix: {
				...completeEvidence.after_fix,
				verification_plan_id: `sha256:${'9'.repeat(64)}`,
			},
		};
		writeFileSync(
			path.join(projectPath, 'repro-evidence-stale-receipt.json'),
			JSON.stringify(staleReceiptEvidence, null, 2),
		);

		const staleReceiptResult = runCli(projectPath, [
			'verify',
			'--reason',
			'bug_fix',
			'--repro-evidence',
			'repro-evidence-stale-receipt.json',
			'--json',
		]);
		const staleReceiptReport = JSON.parse(staleReceiptResult.stdout);

		assert.equal(staleReceiptResult.status, 0, staleReceiptResult.stderr || staleReceiptResult.stdout);
		assert.equal(staleReceiptReport.status, 'passed');
		assert.equal(staleReceiptReport.completion_verdict.status, 'partially_verified');
		assert.equal(staleReceiptReport.completion_verdict.primary_reason, 'repro_evidence_missing');
		assert.equal(staleReceiptReport.completion_verdict.evidence.repro_evidence_risk_count, 1);
		assert.deepEqual(staleReceiptReport.evidence_model.remaining_risks, [
			{
				code: 'repro_evidence_missing',
				severity: 'high',
				detail: 'Bug-fix repro evidence after-fix receipt is stale for the current verification plan.',
			},
		]);

		const missingAfterFixEvidence = {
			...completeEvidence,
			after_fix: {
				status: 'missing',
				outcome: null,
				same_route_as: null,
				...receiptBinding,
				summary: null,
				reason: null,
			},
		};
		writeFileSync(
			path.join(projectPath, 'repro-evidence-missing-after-fix.json'),
			JSON.stringify(missingAfterFixEvidence, null, 2),
		);

		const missingAfterFixResult = runCli(projectPath, [
			'verify',
			'--reason',
			'bug_fix',
			'--repro-evidence',
			'repro-evidence-missing-after-fix.json',
			'--json',
		]);
		const missingAfterFixReport = JSON.parse(missingAfterFixResult.stdout);

		assert.equal(missingAfterFixResult.status, 0, missingAfterFixResult.stderr || missingAfterFixResult.stdout);
		assert.equal(missingAfterFixReport.status, 'passed');
		assert.equal(missingAfterFixReport.completion_verdict.status, 'unverified');
		assert.equal(missingAfterFixReport.completion_verdict.primary_reason, 'repro_evidence_unverified');
		assert.deepEqual(missingAfterFixReport.completion_verdict.limitations, ['repro_evidence_missing']);
		assert.deepEqual(missingAfterFixReport.evidence_model.remaining_risks, [
			{
				code: 'repro_evidence_missing',
				severity: 'high',
				detail:
					'Bug-fix repro evidence is missing after-fix same-route evidence; rerun the original route after the fix before claiming verification.',
			},
		]);

		const failedAfterFixEvidence = {
			...completeEvidence,
			after_fix: {
				...completeEvidence.after_fix,
				status: 'failed',
				outcome: 'failed_same_route',
				summary: 'The same route still failed after the fix.',
			},
		};
		writeFileSync(
			path.join(projectPath, 'repro-evidence-failed-after-fix.json'),
			JSON.stringify(failedAfterFixEvidence, null, 2),
		);

		const failedAfterFixResult = runCli(projectPath, [
			'verify',
			'--reason',
			'bug_fix',
			'--repro-evidence',
			'repro-evidence-failed-after-fix.json',
			'--json',
		]);
		const failedAfterFixReport = JSON.parse(failedAfterFixResult.stdout);

		assert.equal(failedAfterFixResult.status, 0, failedAfterFixResult.stderr || failedAfterFixResult.stdout);
		assert.equal(failedAfterFixReport.status, 'passed');
		assert.equal(failedAfterFixReport.completion_verdict.status, 'contradicted');
		assert.equal(failedAfterFixReport.completion_verdict.primary_reason, 'repro_evidence_contradicted');
		assert.deepEqual(failedAfterFixReport.completion_verdict.contradictions, ['repro_evidence_contradicted']);
		assert.deepEqual(failedAfterFixReport.evidence_model.remaining_risks, [
			{
				code: 'repro_evidence_missing',
				severity: 'critical',
				detail: 'Bug-fix repro evidence says the after-fix route still failed.',
			},
		]);

		const failedRegressionGuardEvidence = {
			...completeEvidence,
			regression_guard: {
				...completeEvidence.regression_guard,
				status: 'failed',
				summary: 'The regression guard failed after the fix.',
			},
		};
		writeFileSync(
			path.join(projectPath, 'repro-evidence-failed-guard.json'),
			JSON.stringify(failedRegressionGuardEvidence, null, 2),
		);

		const failedGuardResult = runCli(projectPath, [
			'verify',
			'--reason',
			'bug_fix',
			'--repro-evidence',
			'repro-evidence-failed-guard.json',
			'--json',
		]);
		const failedGuardReport = JSON.parse(failedGuardResult.stdout);

		assert.equal(failedGuardResult.status, 0, failedGuardResult.stderr || failedGuardResult.stdout);
		assert.equal(failedGuardReport.status, 'passed');
		assert.equal(failedGuardReport.completion_verdict.status, 'contradicted');
		assert.equal(failedGuardReport.completion_verdict.primary_reason, 'repro_evidence_contradicted');
		assert.deepEqual(failedGuardReport.completion_verdict.contradictions, ['repro_evidence_contradicted']);
		assert.deepEqual(failedGuardReport.evidence_model.remaining_risks, [
			{
				code: 'repro_evidence_missing',
				severity: 'critical',
				detail: 'Bug-fix repro evidence says the regression guard failed.',
			},
		]);

		const missingEvidence = {
			...completeEvidence,
			before_fix: {
				status: 'missing',
				outcome: null,
				summary: null,
				reason: null,
			},
		};
		writeFileSync(path.join(projectPath, 'repro-evidence-missing.json'), JSON.stringify(missingEvidence, null, 2));

		const partialResult = runCli(projectPath, [
			'verify',
			'--reason',
			'bug_fix',
			'--repro-evidence',
			'repro-evidence-missing.json',
			'--json',
		]);
		const partialReport = JSON.parse(partialResult.stdout);
		const latest = JSON.parse(readFileSync(path.join(projectPath, '.mustflow', 'state', 'runs', 'latest.json'), 'utf8'));

		assert.equal(partialResult.status, 0, partialResult.stderr || partialResult.stdout);
		assert.equal(partialReport.status, 'passed');
		assert.equal(partialReport.completion_verdict.status, 'partially_verified');
		assert.equal(partialReport.completion_verdict.primary_reason, 'repro_evidence_missing');
		assert.equal(partialReport.completion_verdict.evidence.repro_evidence_risk_count, 1);
		assert.equal(partialReport.completion_verdict.evidence.risks.repro_evidence, 1);
		assert.deepEqual(partialReport.completion_verdict.limitations, ['repro_evidence_missing']);
		assert.deepEqual(partialReport.evidence_model.repro_evidence, partialReport.repro_evidence);
		assert.deepEqual(partialReport.evidence_model.remaining_risks, [
			{
				code: 'repro_evidence_missing',
				severity: 'high',
				detail:
					'Bug-fix repro evidence is missing before-fix reproduction; reproduce the original failure or mark it unavailable before claiming verification.',
			},
		]);
		assert.deepEqual(latest.repro_evidence, partialReport.repro_evidence);
		assert.deepEqual(latest.evidence_model.repro_evidence, partialReport.repro_evidence);
	} finally {
		removeTempProject(projectPath);
	}
});

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

test('rejects loose classification report inputs that are not classify output', () => {
	const projectPath = createTempProject();

	try {
		initProject(projectPath);
		writeFileSync(
			path.join(projectPath, 'verify-plan.json'),
			JSON.stringify({ classification_summary: { validationReasons: ['schema_verify'] } }, null, 2),
		);

		const result = runCli(projectPath, ['verify', '--from-plan', 'verify-plan.json', '--json']);

		assert.equal(result.status, 1);
		assert.match(result.stderr, /Verification input must be an mf classify report/);
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
		assert.match(result.stderr, /Classification report must come from this mustflow root/);
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

test('reports blocked verification when no intents match the reason', () => {
	const projectPath = createTempProject();

	try {
		initProject(projectPath);

		const result = runCli(projectPath, ['verify', '--reason', 'missing_reason', '--json']);
		const report = JSON.parse(result.stdout);

		assert.equal(result.status, 1);
		assert.equal(report.status, 'blocked');
		assert.equal(report.completion_verdict.status, 'blocked');
		assert.equal(report.completion_verdict.primary_reason, 'no_runnable_verification_intents');
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
		assert.match(result.stderr, /Use only one of --reason, --from-classification, --from-plan, or --changed/);
		assert.match(result.stdout, /Usage: mf verify/);

		const changedResult = runCli(projectPath, ['verify', '--changed', '--reason', 'schema_verify', '--json']);

		assert.equal(changedResult.status, 1);
		assert.match(changedResult.stderr, /Use only one of --reason, --from-classification, --from-plan, or --changed/);
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
		assert.match(result.stderr, /Classification report path must stay inside the mustflow root/);
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
		assert.match(result.stderr, /Classification report path must stay inside the mustflow root/);
	} finally {
		rmSync(outsidePlanPath, { force: true });
		removeTempProject(projectPath);
	}
});
