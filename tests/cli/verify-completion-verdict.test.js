import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync, readFileSync, writeFileSync } from 'node:fs';
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
import { runCliInProcess } from './helpers/cli-harness.js';

const projectRoot = path.resolve(fileURLToPath(new URL('../..', import.meta.url)));

function createTempProject() {
	return mkdtempSync(path.join(tmpdir(), 'mustflow-verify-'));
}

function removeTempProject(projectPath) {
	rmSync(projectPath, { recursive: true, force: true });
}

async function runCli(cwd, args, options = {}) {
	return runCliInProcess(cwd, args, options);
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

test('does not verify when selected commands pass without bound receipts', async () => {
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

test('treats plan-receipt mismatch as a contradiction before lower verdict states', async () => {
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

test('blocks verified claims when repeated failure rules require new evidence', async () => {
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

test('treats critical validation ratchet risks as contradicted completion evidence', async () => {
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

test('downgrades verified verdicts when high-risk source anchors need invariant review', async () => {
	const projectPath = createTempProject();

	try {
		await initProject(projectPath);
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
		const firstIndex = await runCli(projectPath, ['index', '--source', '--json']);
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

		const secondIndex = await runCli(projectPath, ['index', '--source', '--json']);
		assert.equal(secondIndex.status, 0, secondIndex.stderr || secondIndex.stdout);
		const plan = path.join(projectPath, 'auth-plan.json');
		writeFileSync(plan, JSON.stringify(createClassifyPlan(projectPath, 'auth_change', 'src/auth.ts'), null, 2));

		const result = await runCli(projectPath, ['verify', '--from-plan', plan, '--json']);
		const report = JSON.parse(result.stdout);

		assert.equal(result.status, 1, result.stderr || result.stdout);
		assert.equal(report.execution_status, 'passed');
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

test('downgrades verified verdicts when changed files exceed the scope diff budget', async () => {
	const projectPath = createTempProject();

	try {
		await initProject(projectPath);
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

		const result = await runCli(projectPath, ['verify', '--from-plan', plan, '--json']);
		const report = JSON.parse(result.stdout);

		assert.equal(result.status, 1, result.stderr || result.stdout);
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

test('flags repeated unresolved verification failures for the same plan', async () => {
	const projectPath = createTempProject();

	try {
		await initProject(projectPath);
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

		const firstResult = await runCli(projectPath, ['verify', '--from-plan', plan, '--json']);
		const firstReport = JSON.parse(firstResult.stdout);
		const secondResult = await runCli(projectPath, ['verify', '--from-plan', plan, '--json']);
		const secondReport = JSON.parse(secondResult.stdout);
		const thirdResult = await runCli(projectPath, ['verify', '--from-plan', plan, '--json']);
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

test('keeps repeated failure state bounded to derived fingerprint summaries', async () => {
	const projectPath = createTempProject();

	try {
		await initProject(projectPath);
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

test('downgrades verified verdicts when changed tests carry validation ratchet risk', async () => {
	const projectPath = createTempProject();

	try {
		await initProject(projectPath);
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

		const result = await runCli(projectPath, ['verify', '--from-plan', plan, '--json']);
		const report = JSON.parse(result.stdout);

		assert.equal(result.status, 1, result.stderr || result.stdout);
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

test('detects obvious validation weakening in changed tests', async () => {
	const projectPath = createTempProject();

	try {
		await initProject(projectPath);
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

test('keeps strong behavior checks', async () => {
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

test('keeps strong behavior checks', async () => {
	assert.ok(1 + 1);
});

test.pending('deferred rejected-path coverage');
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

		const result = await runCli(projectPath, ['verify', '--from-plan', plan, '--json']);
		const report = JSON.parse(result.stdout);
		const riskCodes = report.evidence_model.remaining_risks.map((risk) => risk.code);

		assert.equal(result.status, 1, result.stderr || result.stdout);
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

test('keeps language-specific validation ratchet analysis conservative', async () => {
	const projectPath = createTempProject();

	try {
		await initProject(projectPath);
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

test('detects validation ratchet risks across multiple changed files', () => {
	const projectPath = createTempProject();

	try {
		const firstTestPath = path.join(projectPath, 'tests', 'ratchet-one.test.js');
		const secondTestPath = path.join(projectPath, 'tests', 'ratchet-two.test.js');
		mkdirSync(path.dirname(firstTestPath), { recursive: true });
		writeFileSync(
			firstTestPath,
			`
import assert from 'node:assert/strict';
import { test } from 'node:test';

test('keeps strict equality', () => {
	assert.equal(1 + 1, 2);
});
`,
		);
		writeFileSync(
			secondTestPath,
			`
import assert from 'node:assert/strict';
import { test } from 'node:test';

test('keeps failure coverage', () => {
	assert.throws(() => {
		throw new Error('expected');
	});
});
`,
		);
		commitProjectBaseline(projectPath);
		writeFileSync(
			firstTestPath,
			`
import assert from 'node:assert/strict';
import { test } from 'node:test';

test('keeps strict equality', () => {
	assert.ok(1 + 1);
});
`,
		);
		writeFileSync(
			secondTestPath,
			`
import assert from 'node:assert/strict';
import { test } from 'node:test';

test.pending('deferred failure coverage');
`,
		);

		const classify = (filePath) => ({
			path: filePath,
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
		});
		const risks = createValidationRatchetRisks(
			{
				source: 'changed',
				files: ['tests/ratchet-one.test.js', 'tests/ratchet-two.test.js'],
				classifications: [classify('tests/ratchet-one.test.js'), classify('tests/ratchet-two.test.js')],
				summary: {
					fileCount: 2,
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

		assert.deepEqual(
			risks.map((risk) => [risk.path, risk.code]),
			[
				['tests/ratchet-one.test.js', 'assertion_matcher_weakened'],
				['tests/ratchet-two.test.js', 'todo_or_pending_marker_added'],
				['tests/ratchet-two.test.js', 'assertion_count_decreased'],
				['tests/ratchet-two.test.js', 'exception_assertion_removed'],
			],
		);
	} finally {
		removeTempProject(projectPath);
	}
});

test('detects validation ratchet risks from staged-only changes', () => {
	const projectPath = createTempProject();

	try {
		const testFilePath = path.join(projectPath, 'tests', 'ratchet-staged.test.js');
		mkdirSync(path.dirname(testFilePath), { recursive: true });
		writeFileSync(
			testFilePath,
			`
import assert from 'node:assert/strict';
import { test } from 'node:test';

test('keeps exception coverage', () => {
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

test('keeps exception coverage', () => {
	assert.ok(true);
});
`,
		);
		runGit(projectPath, ['add', 'tests/ratchet-staged.test.js']);

		const risks = createValidationRatchetRisks(
			{
				source: 'changed',
				files: ['tests/ratchet-staged.test.js'],
				classifications: [
					{
						path: 'tests/ratchet-staged.test.js',
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

		assert.deepEqual(
			risks.map((risk) => risk.code),
			['assertion_matcher_weakened', 'exception_assertion_removed'],
		);
	} finally {
		removeTempProject(projectPath);
	}
});

test('detects command contract validation weakening from changed diffs', async () => {
	const projectPath = createTempProject();

	try {
		await initProject(projectPath);
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

test('detects package validation script weakening from changed diffs', async () => {
	const projectPath = createTempProject();

	try {
		await initProject(projectPath);
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

test('downgrades verified verdicts when a receipt reports undeclared write drift', async () => {
	const projectPath = createTempProject();

	try {
		await initProject(projectPath);
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

		const result = await runCli(projectPath, ['verify', '--reason', 'write_drift_change', '--json']);
		const report = JSON.parse(result.stdout);

		assert.equal(result.status, 1, result.stderr || result.stdout);
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

test('treats external CI evidence as lower-authority verdict support', async () => {
	const projectPath = createTempProject();

	try {
		await initProject(projectPath);
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

		const result = await runCli(projectPath, [
			'verify',
			'--reason',
			'external_ci_change',
			'--external-evidence',
			'external-evidence.json',
			'--json',
		]);
		const report = JSON.parse(result.stdout);
		const latest = JSON.parse(readFileSync(path.join(projectPath, '.mustflow', 'state', 'runs', 'latest.json'), 'utf8'));

		assert.equal(result.status, 1, result.stderr || result.stdout);
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

test('uses structured repro evidence to gate bug-fix completion verdicts', async () => {
	const projectPath = createTempProject();

	try {
		await initProject(projectPath);
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

		const seedResult = await runCli(projectPath, ['verify', '--reason', 'bug_fix', '--json']);
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

		const verifiedResult = await runCli(projectPath, [
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

		const mismatchedRouteResult = await runCli(projectPath, [
			'verify',
			'--reason',
			'bug_fix',
			'--repro-evidence',
			'repro-evidence-mismatched-route.json',
			'--json',
		]);
		const mismatchedRouteReport = JSON.parse(mismatchedRouteResult.stdout);

		assert.equal(mismatchedRouteResult.status, 1, mismatchedRouteResult.stderr || mismatchedRouteResult.stdout);
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

		const staleReceiptResult = await runCli(projectPath, [
			'verify',
			'--reason',
			'bug_fix',
			'--repro-evidence',
			'repro-evidence-stale-receipt.json',
			'--json',
		]);
		const staleReceiptReport = JSON.parse(staleReceiptResult.stdout);

		assert.equal(staleReceiptResult.status, 1, staleReceiptResult.stderr || staleReceiptResult.stdout);
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

		const missingAfterFixResult = await runCli(projectPath, [
			'verify',
			'--reason',
			'bug_fix',
			'--repro-evidence',
			'repro-evidence-missing-after-fix.json',
			'--json',
		]);
		const missingAfterFixReport = JSON.parse(missingAfterFixResult.stdout);

		assert.equal(missingAfterFixResult.status, 1, missingAfterFixResult.stderr || missingAfterFixResult.stdout);
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

		const failedAfterFixResult = await runCli(projectPath, [
			'verify',
			'--reason',
			'bug_fix',
			'--repro-evidence',
			'repro-evidence-failed-after-fix.json',
			'--json',
		]);
		const failedAfterFixReport = JSON.parse(failedAfterFixResult.stdout);

		assert.equal(failedAfterFixResult.status, 1, failedAfterFixResult.stderr || failedAfterFixResult.stdout);
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

		const failedGuardResult = await runCli(projectPath, [
			'verify',
			'--reason',
			'bug_fix',
			'--repro-evidence',
			'repro-evidence-failed-guard.json',
			'--json',
		]);
		const failedGuardReport = JSON.parse(failedGuardResult.stdout);

		assert.equal(failedGuardResult.status, 1, failedGuardResult.stderr || failedGuardResult.stdout);
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

		const partialResult = await runCli(projectPath, [
			'verify',
			'--reason',
			'bug_fix',
			'--repro-evidence',
			'repro-evidence-missing.json',
			'--json',
		]);
		const partialReport = JSON.parse(partialResult.stdout);
		const latest = JSON.parse(readFileSync(path.join(projectPath, '.mustflow', 'state', 'runs', 'latest.json'), 'utf8'));

		assert.equal(partialResult.status, 1, partialResult.stderr || partialResult.stdout);
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
