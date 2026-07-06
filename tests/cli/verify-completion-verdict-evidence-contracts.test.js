import {
	appendIntent,
	assert,
	commitProjectBaseline,
	createClassifyPlan,
	createHash,
	createLocalIndexDirect,
	createMinimalWorkflowProject,
	createTempProject,
	createValidationRatchetRisks,
	createVerificationFailureFingerprint,
	createVerifyCompletionVerdict,
	existsSync,
	initProject,
	mkdirSync,
	mkdtempSync,
	path,
	projectRoot,
	readFileSync,
	refreshManifestLockHash,
	removeTempProject,
	REPEATED_FAILURE_STATE_LIMIT,
	REPEATED_FAILURE_STATE_PATH,
	rmSync,
	runCli,
	runCliInProcess,
	runGit,
	spawnSync,
	test,
	tmpdir,
	updateRepeatedFailureState,
	writeFileSync,
	writeRunTrustManifestLock,
} from './helpers/verify-completion-verdict-contracts.js';

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
