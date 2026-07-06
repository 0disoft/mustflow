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

test('flags repeated unresolved verification failures for the same plan', async () => {
	const projectPath = createTempProject();

	try {
		await initProject(projectPath);
		writeFileSync(path.join(projectPath, 'README.md'), '# Replay fixture\n');
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
		assert.equal(firstReport.failure_replay_capsule.source, 'mf_verify_failure');
		assert.equal(firstReport.failure_replay_capsule.authority, 'replay_supporting_evidence');
		assert.equal(firstReport.failure_replay_capsule.failure_fingerprint, firstReport.failure_fingerprint.fingerprint);
		assert.deepEqual(firstReport.failure_replay_capsule.replay_commands, [
			'mf run verify_repeat_failure',
			'mf verify --reason repeat_failure --json',
		]);
		assert.equal(firstReport.failure_replay_capsule.failed_results[0].intent, 'verify_repeat_failure');
		assert.equal(firstReport.failure_replay_capsule.failed_results[0].status, 'failed');
		assert.equal(firstReport.failure_replay_capsule.failed_results[0].replay_command, 'mf run verify_repeat_failure');
		assert.match(firstReport.failure_replay_capsule.failed_results[0].command_fingerprint, /^sha256:/u);
		assert.equal(firstReport.failure_replay_capsule.affected_files[0].path, 'README.md');
		assert.equal(firstReport.failure_replay_capsule.affected_files[0].status, 'present');
		assert.match(firstReport.failure_replay_capsule.affected_files[0].sha256, /^sha256:/u);
		assert.equal(firstReport.failure_replay_capsule.environment.platform_family, process.platform);
		assert.equal(firstReport.failure_replay_capsule.privacy.raw_output_included, false);
		assert.equal(firstReport.failure_replay_capsule.privacy.env_values_included, false);
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
				detail: [
					'The previous verify summary has the same failure fingerprint and an unresolved status;',
					'provide new evidence or a narrower hypothesis before marking the task complete.',
				].join(' '),
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
		assert.deepEqual(latest.failure_replay_capsule, thirdReport.failure_replay_capsule);
		assert.deepEqual(latest.evidence_model.failure_replay_capsule, thirdReport.failure_replay_capsule);
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
		let index = 0;
		while (index < REPEATED_FAILURE_STATE_LIMIT + 5) {
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
			index += 1;
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
