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

test('reports verification gaps separately from skipped intents', async () => {
	const verdict = createVerifyCompletionVerdict({
		verificationPlanId: `sha256:${'0'.repeat(64)}`,
		matchedIntents: 1,
		ranIntents: 1,
		passedIntents: 1,
		failedIntents: 0,
		skippedIntents: 3,
		receiptCount: 1,
		gapCount: 1,
	});

	assert.equal(verdict.evidence.skipped_intents, 3);
	assert.equal(verdict.evidence.gap_count, 1);
});

test('defaults verification gap count to zero when callers have no gap evidence', async () => {
	const verdict = createVerifyCompletionVerdict({
		verificationPlanId: `sha256:${'0'.repeat(64)}`,
		matchedIntents: 1,
		ranIntents: 1,
		passedIntents: 1,
		failedIntents: 0,
		skippedIntents: 3,
		receiptCount: 1,
	});

	assert.equal(verdict.evidence.skipped_intents, 3);
	assert.equal(verdict.evidence.gap_count, 0);
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
	const projectPath = createMinimalWorkflowProject('mustflow-verify-source-anchor-');

	try {
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
		writeRunTrustManifestLock(projectPath);
		const firstIndex = await createLocalIndexDirect(projectPath, { includeSource: true });
		assert.equal(firstIndex.source_anchor_count, 1);

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

		const secondIndex = await createLocalIndexDirect(projectPath, { includeSource: true });
		assert.equal(secondIndex.source_anchor_count, 1);
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
