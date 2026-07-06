import {
	assert,
	commitGitBaseline,
	createTempProject,
	initProject,
	mkdirSync,
	path,
	readFileSync,
	removeTempProject,
	runCli,
	runCodeChangeImpactJson,
	runCodeDependencyGraphJson,
	runCodeExportDiffJson,
	runCodeImportCycleJson,
	runCodeModuleBoundaryJson,
	runCodeOutlineJson,
	runCodeRouteOutlineJson,
	runCodeSymbolReadJson,
	runConfigChainJson,
	runDocsLinkIntegrityJson,
	runDocsReferenceDriftJson,
	runEnvContractJson,
	runGeneratedBoundaryJson,
	runGit,
	runRelatedFilesJson,
	runRepoApprovalGateJson,
	runRepoAutomationSurfaceJson,
	runRepoDependencySurfaceJson,
	runRepoDeploySurfaceJson,
	runRepoGitIgnoreAuditJson,
	runRepoManifestLockDriftJson,
	runRepoMergeConflictScanJson,
	runRepoToolchainProvenanceJson,
	runScriptPackSuggestJson,
	runSecretRiskScanJson,
	runSecurityPatternScanJson,
	runTestPerformanceReportJson,
	runTestRegressionSelectorJson,
	runTextBudgetJson,
	spawnSync,
	test,
	unlinkSync,
	writeFileSync,
} from './helpers/text-budget-contracts.js';

test('test-performance-report summarizes retained run performance samples', () => {
	const projectPath = createTempProject();

	try {
		initProject(projectPath);
		mkdirSync(path.join(projectPath, '.mustflow', 'state', 'perf'), { recursive: true });
		mkdirSync(path.join(projectPath, '.mustflow', 'state', 'runs'), { recursive: true });
		writeFileSync(
			path.join(projectPath, '.mustflow', 'state', 'perf', 'samples.json'),
			`${JSON.stringify(
				{
					schema_version: '1',
					retention: {},
					samples: [
						{
							observed_day: '2026-06-24',
							intent: 'test_related',
							intent_fingerprint: 'sha256:1111',
							command_fingerprint: 'sha256:2222',
							contract_fingerprint: 'sha256:3333',
							runner_bucket: 'local/win32/x64/node@24',
							duration_ms: 181000,
							timeout_ratio: 0.91,
							status: 'passed',
							exit_code_class: 'success',
							timed_out: false,
							error_kind: null,
							stdout_bytes: 10,
							stderr_bytes: 0,
							phase_durations_ms: {
								build: 42000,
								tests: 139000,
							},
							selection_strategy: 'related',
							changed_file_count: 3,
							selected_target_count: 12,
							fallback_used: true,
						},
						{
							observed_day: '2026-06-25',
							intent: 'test_release',
							intent_fingerprint: 'sha256:4444',
							command_fingerprint: 'sha256:5555',
							contract_fingerprint: 'sha256:6666',
							runner_bucket: 'local/win32/x64/node@24',
							duration_ms: 45000,
							timeout_ratio: 0.05,
							status: 'failed',
							exit_code_class: 'failure',
							timed_out: false,
							error_kind: 'exit_code',
							stdout_bytes: 10,
							stderr_bytes: 20,
						},
					],
				},
				null,
				2,
			)}\n`,
		);
		writeFileSync(
			path.join(projectPath, '.mustflow', 'state', 'runs', 'latest.profile.json'),
			`${JSON.stringify(
				{
					schema_version: '1',
					generated_at: '2026-06-25T00:00:00.000Z',
					mode: 'related-profile',
					intent: 'test_related_profile',
					total_duration_ms: 127000,
					file_count: 3,
					test_files: [
						{
							path: 'tests/cli/slow.test.js',
							duration_ms: 122000,
							status: 'passed',
							exit_code: 0,
						},
						{
							path: 'tests/cli/failed.test.js',
							duration_ms: 4000,
							status: 'failed',
							exit_code: 1,
						},
						{
							path: 'tests/cli/fast.test.js',
							duration_ms: 1000,
							status: 'passed',
							exit_code: 0,
						},
					],
				},
				null,
				2,
			)}\n`,
		);

		const { result, report } = runTestPerformanceReportJson(projectPath, [
			'--slow-ms',
			'60000',
			'--max-test-files',
			'2',
			'--phase-ms',
			'30000',
			'--timeout-ratio',
			'0.8',
		]);

		assert.equal(result.status, 0, result.stderr || result.stdout);
		assert.equal(report.command, 'script-pack');
		assert.equal(report.pack_id, 'test');
		assert.equal(report.script_id, 'performance-report');
		assert.equal(report.script_ref, 'test/performance-report');
		assert.equal(report.status, 'passed');
		assert.equal(report.ok, true);
		assert.equal(report.summary.sample_count, 2);
		assert.equal(report.summary.intent_count, 2);
		assert.equal(report.summary.test_file_count, 2);
		assert.equal(report.summary.latest_profile_test_file_count, 3);
		assert.equal(report.summary.latest_profile_declared_test_file_count, 3);
		assert.equal(report.summary.latest_profile_generated_at, '2026-06-25T00:00:00.000Z');
		assert.equal(typeof report.summary.latest_profile_age_ms, 'number');
		assert.ok(report.summary.latest_profile_age_ms >= 0);
		assert.equal(report.summary.latest_profile_test_file_coverage_ratio, 2 / 3);
		assert.equal(report.summary.latest_profile_test_files_truncated, true);
		assert.equal(report.truncated, true);
		assert.ok(report.evidence_sources.some((source) => source.path === '.mustflow/state/perf/samples.json' && source.readable));
		assert.ok(report.evidence_sources.some((source) => source.path === '.mustflow/state/runs/latest.profile.json' && source.readable));
		assert.ok(report.intents.some((entry) => entry.intent === 'test_related' && entry.p95_duration_ms === 181000));
		assert.ok(report.phases.some((entry) => entry.name === 'tests' && entry.p95_duration_ms === 139000));
		assert.deepEqual(
			report.test_files.map((testFile) => testFile.path),
			['tests/cli/slow.test.js', 'tests/cli/failed.test.js'],
		);
		assert.ok(report.findings.some((finding) => finding.code === 'test_performance_slow_sample'));
		assert.ok(report.findings.some((finding) => finding.code === 'test_performance_slow_test_file'));
		assert.ok(report.findings.some((finding) => finding.code === 'test_performance_high_timeout_ratio'));
		assert.ok(report.findings.some((finding) => finding.code === 'test_performance_selection_fallback'));
		assert.ok(report.findings.some((finding) => finding.code === 'test_performance_previous_failure'));
		assert.ok(report.next_actions.some((action) => action.code === 'investigate_previous_failure'));
		assert.ok(report.next_actions.some((action) => action.code === 'inspect_slowest_intents'));
		const slowestFilesAction = report.next_actions.find((action) => action.code === 'inspect_slowest_test_files');
		assert.ok(slowestFilesAction);
		assert.match(slowestFilesAction.message, /shows 2 of 3 profiled files/u);
		assert.ok(report.next_actions.some((action) => action.code === 'review_timeout_budget'));
		assert.ok(report.next_actions.some((action) => action.code === 'review_selection_fallback'));
		assert.match(report.input_hash, /^sha256:[a-f0-9]{64}$/u);

		const humanResult = runCli(projectPath, [
			'script-pack',
			'run',
			'test/performance-report',
			'summarize',
			'--slow-ms',
			'60000',
			'--max-test-files',
			'2',
		]);
		assert.equal(humanResult.status, 0, humanResult.stderr || humanResult.stdout);
		assert.match(humanResult.stdout, /Profile evidence/u);
		assert.match(humanResult.stdout, /Generated at: 2026-06-25T00:00:00\.000Z/u);
		assert.match(humanResult.stdout, /Age: /u);
		assert.match(humanResult.stdout, /Files shown: 2\/3/u);
		assert.match(humanResult.stdout, /Coverage: 66\.7%/u);
		assert.match(humanResult.stdout, /Profile files truncated: yes/u);
		assert.match(humanResult.stdout, /Slowest test files/u);
		assert.match(humanResult.stdout, /tests\/cli\/slow\.test\.js: 122000ms, passed/u);
	} finally {
		removeTempProject(projectPath);
	}
});

test('test-performance-report guides profiling when no performance evidence exists', () => {
	const projectPath = createTempProject();

	try {
		initProject(projectPath);

		const { result, report } = runTestPerformanceReportJson(projectPath, []);

		assert.equal(result.status, 0, result.stderr || result.stdout);
		assert.equal(report.status, 'passed');
		assert.equal(report.ok, true);
		assert.equal(report.summary.sample_count, 0);
		assert.equal(report.summary.latest_profile_declared_test_file_count, null);
		assert.equal(report.summary.latest_profile_generated_at, null);
		assert.equal(report.summary.latest_profile_age_ms, null);
		assert.equal(report.summary.latest_profile_test_file_coverage_ratio, null);
		assert.equal(report.summary.latest_profile_test_files_truncated, false);
		assert.ok(report.findings.some((finding) => finding.code === 'test_performance_no_evidence'));

		const profileAction = report.next_actions.find((action) => action.code === 'collect_profile_evidence');
		assert.ok(profileAction, 'missing collect_profile_evidence next action');
		assert.equal(profileAction.command_intent, 'test_related_profile');
		assert.equal(profileAction.run_hint, 'mf run test_related_profile');
		assert.deepEqual(profileAction.finding_codes, ['test_performance_no_evidence']);
	} finally {
		removeTempProject(projectPath);
	}
});

test('test-performance-report asks for file profile evidence when samples lack test-file timings', () => {
	const projectPath = createTempProject();

	try {
		initProject(projectPath);
		mkdirSync(path.join(projectPath, '.mustflow', 'state', 'perf'), { recursive: true });
		writeFileSync(
			path.join(projectPath, '.mustflow', 'state', 'perf', 'samples.json'),
			`${JSON.stringify(
				{
					schema_version: '1',
					retention: {},
					samples: [
						{
							observed_day: '2026-06-25',
							intent: 'test_related',
							duration_ms: 32000,
							timeout_ratio: 0.08,
							status: 'passed',
							selection_strategy: 'related',
							changed_file_count: 2,
							selected_target_count: 5,
							fallback_used: false,
						},
					],
				},
				null,
				2,
			)}\n`,
		);

		const { result, report } = runTestPerformanceReportJson(projectPath, []);

		assert.equal(result.status, 0, result.stderr || result.stdout);
		assert.equal(report.summary.sample_count, 1);
		assert.equal(report.summary.latest_profile_test_file_count, 0);
		assert.equal(report.summary.latest_profile_declared_test_file_count, null);
		assert.equal(report.summary.latest_profile_generated_at, null);
		assert.equal(report.summary.latest_profile_age_ms, null);
		assert.equal(report.summary.latest_profile_test_file_coverage_ratio, null);
		assert.equal(report.summary.latest_profile_test_files_truncated, false);
		assert.ok(!report.findings.some((finding) => finding.code === 'test_performance_no_evidence'));

		const profileAction = report.next_actions.find((action) => action.code === 'collect_profile_evidence');
		assert.ok(profileAction, 'missing collect_profile_evidence next action');
		assert.equal(profileAction.command_intent, 'test_related_profile');
		assert.equal(profileAction.run_hint, 'mf run test_related_profile');
		assert.deepEqual(profileAction.finding_codes, []);
		assert.match(profileAction.message, /test-file profile evidence/u);
	} finally {
		removeTempProject(projectPath);
	}
});

test('test-performance-report merges profile evidence actions when declared coverage is low and stale', () => {
	const projectPath = createTempProject();

	try {
		initProject(projectPath);
		mkdirSync(path.join(projectPath, '.mustflow', 'state', 'perf'), { recursive: true });
		mkdirSync(path.join(projectPath, '.mustflow', 'state', 'runs'), { recursive: true });
		writeFileSync(
			path.join(projectPath, '.mustflow', 'state', 'perf', 'samples.json'),
			`${JSON.stringify(
				{
					schema_version: '1',
					retention: {},
					samples: [
						{
							observed_day: '2026-06-25',
							intent: 'test_related',
							duration_ms: 32000,
							timeout_ratio: 0.08,
							status: 'passed',
							selection_strategy: 'related',
							changed_file_count: 2,
							selected_target_count: 5,
							fallback_used: false,
						},
					],
				},
				null,
				2,
			)}\n`,
		);
		writeFileSync(
			path.join(projectPath, '.mustflow', 'state', 'runs', 'latest.profile.json'),
			`${JSON.stringify(
				{
					schema_version: '1',
					generated_at: '2000-01-01T00:00:00.000Z',
					mode: 'related-profile',
					intent: 'test_related_profile',
					total_duration_ms: 3000,
					file_count: 5,
					test_files: [
						{
							path: 'tests/cli/profiled-a.test.js',
							duration_ms: 2000,
							status: 'passed',
							exit_code: 0,
						},
						{
							path: 'tests/cli/profiled-b.test.js',
							duration_ms: 1000,
							status: 'passed',
							exit_code: 0,
						},
					],
				},
				null,
				2,
			)}\n`,
		);

		const { result, report } = runTestPerformanceReportJson(projectPath, []);

		assert.equal(result.status, 0, result.stderr || result.stdout);
		assert.equal(report.summary.sample_count, 1);
		assert.equal(report.summary.latest_profile_test_file_count, 2);
		assert.equal(report.summary.latest_profile_declared_test_file_count, 5);
		assert.equal(report.summary.latest_profile_generated_at, '2000-01-01T00:00:00.000Z');
		assert.equal(typeof report.summary.latest_profile_age_ms, 'number');
		assert.ok(report.summary.latest_profile_age_ms >= 24 * 60 * 60 * 1000);
		assert.equal(report.summary.latest_profile_test_file_coverage_ratio, 2 / 5);
		assert.equal(report.summary.latest_profile_test_files_truncated, true);

		const profileActions = report.next_actions.filter((action) => action.code === 'collect_profile_evidence');
		assert.equal(profileActions.length, 1);
		const profileAction = profileActions[0];
		assert.ok(profileAction, 'missing low-coverage collect_profile_evidence next action');
		assert.match(profileAction.message, /40\.0% of declared test files/u);
		assert.equal(profileAction.command_intent, 'test_related_profile');
		assert.equal(profileAction.run_hint, 'mf run test_related_profile');
		assert.deepEqual(profileAction.finding_codes, []);
	} finally {
		removeTempProject(projectPath);
	}
});

test('test-performance-report inspects top-heavy profiled test files below the slow threshold', () => {
	const projectPath = createTempProject();

	try {
		initProject(projectPath);
		mkdirSync(path.join(projectPath, '.mustflow', 'state', 'perf'), { recursive: true });
		mkdirSync(path.join(projectPath, '.mustflow', 'state', 'runs'), { recursive: true });
		writeFileSync(
			path.join(projectPath, '.mustflow', 'state', 'perf', 'samples.json'),
			`${JSON.stringify(
				{
					schema_version: '1',
					retention: {},
					samples: [
						{
							observed_day: '2026-06-25',
							intent: 'test_related',
							duration_ms: 52000,
							timeout_ratio: 0.12,
							status: 'passed',
							selection_strategy: 'related',
							changed_file_count: 2,
							selected_target_count: 5,
							fallback_used: false,
						},
					],
				},
				null,
				2,
			)}\n`,
		);
		writeFileSync(
			path.join(projectPath, '.mustflow', 'state', 'runs', 'latest.profile.json'),
			`${JSON.stringify(
				{
					schema_version: '1',
					generated_at: '2026-06-25T00:00:00.000Z',
					mode: 'related-profile',
					intent: 'test_related_profile',
					total_duration_ms: 62000,
					file_count: 2,
					test_files: [
						{
							path: 'tests/cli/top-heavy.test.js',
							duration_ms: 50000,
							status: 'passed',
							exit_code: 0,
						},
						{
							path: 'tests/cli/ordinary.test.js',
							duration_ms: 12000,
							status: 'passed',
							exit_code: 0,
						},
					],
				},
				null,
				2,
			)}\n`,
		);

		const { result, report } = runTestPerformanceReportJson(projectPath, [
			'--slow-ms',
			'120000',
			'--phase-ms',
			'30000',
		]);

		assert.equal(result.status, 0, result.stderr || result.stdout);
		assert.equal(report.summary.latest_profile_test_file_count, 2);
		assert.equal(report.summary.latest_profile_declared_test_file_count, 2);
		assert.equal(report.summary.latest_profile_generated_at, '2026-06-25T00:00:00.000Z');
		assert.equal(typeof report.summary.latest_profile_age_ms, 'number');
		assert.ok(report.summary.latest_profile_age_ms >= 0);
		assert.equal(report.summary.latest_profile_test_file_coverage_ratio, 1);
		assert.equal(report.summary.latest_profile_test_files_truncated, false);
		assert.ok(!report.findings.some((finding) => finding.code === 'test_performance_slow_test_file'));

		const slowestFilesAction = report.next_actions.find((action) => action.code === 'inspect_slowest_test_files');
		assert.ok(slowestFilesAction, 'missing inspect_slowest_test_files next action');
		assert.equal(slowestFilesAction.command_intent, null);
		assert.equal(slowestFilesAction.run_hint, null);
		assert.deepEqual(slowestFilesAction.finding_codes, []);
		assert.match(slowestFilesAction.message, /slowest profiled test-file rows/u);
	} finally {
		removeTempProject(projectPath);
	}
});

test('test-performance-report asks for fresh profile evidence when the latest profile is stale', () => {
	const projectPath = createTempProject();

	try {
		initProject(projectPath);
		mkdirSync(path.join(projectPath, '.mustflow', 'state', 'perf'), { recursive: true });
		mkdirSync(path.join(projectPath, '.mustflow', 'state', 'runs'), { recursive: true });
		writeFileSync(
			path.join(projectPath, '.mustflow', 'state', 'perf', 'samples.json'),
			`${JSON.stringify(
				{
					schema_version: '1',
					retention: {},
					samples: [
						{
							observed_day: '2026-06-25',
							intent: 'test_related',
							duration_ms: 32000,
							timeout_ratio: 0.08,
							status: 'passed',
							selection_strategy: 'related',
							changed_file_count: 2,
							selected_target_count: 5,
							fallback_used: false,
						},
					],
				},
				null,
				2,
			)}\n`,
		);
		writeFileSync(
			path.join(projectPath, '.mustflow', 'state', 'runs', 'latest.profile.json'),
			`${JSON.stringify(
				{
					schema_version: '1',
					generated_at: '2000-01-01T00:00:00.000Z',
					mode: 'related-profile',
					intent: 'test_related_profile',
					total_duration_ms: 1000,
					file_count: 1,
					test_files: [
						{
							path: 'tests/cli/stale.test.js',
							duration_ms: 1000,
							status: 'passed',
							exit_code: 0,
						},
					],
				},
				null,
				2,
			)}\n`,
		);

		const { result, report } = runTestPerformanceReportJson(projectPath, []);

		assert.equal(result.status, 0, result.stderr || result.stdout);
		assert.equal(report.summary.latest_profile_generated_at, '2000-01-01T00:00:00.000Z');
		assert.equal(typeof report.summary.latest_profile_age_ms, 'number');
		assert.ok(report.summary.latest_profile_age_ms >= 24 * 60 * 60 * 1000);

		const staleProfileAction = report.next_actions.find((action) =>
			action.code === 'collect_profile_evidence' &&
			/fresh profile evidence/u.test(action.message)
		);
		assert.ok(staleProfileAction, 'missing stale profile collect_profile_evidence next action');
		assert.equal(staleProfileAction.command_intent, 'test_related_profile');
		assert.equal(staleProfileAction.run_hint, 'mf run test_related_profile');
		assert.deepEqual(staleProfileAction.finding_codes, []);
	} finally {
		removeTempProject(projectPath);
	}
});

test('test-regression-selector selects changed tests and nearby source tests', () => {
	const projectPath = createTempProject();

	try {
		initProject(projectPath);
		mkdirSync(path.join(projectPath, 'src'));
		mkdirSync(path.join(projectPath, 'tests', 'cli'), { recursive: true });
		writeFileSync(path.join(projectPath, 'src', 'session.ts'), 'export const session = 1;\n');
		writeFileSync(path.join(projectPath, 'tests', 'cli', 'session.test.js'), 'test("session", () => {});\n');
		commitGitBaseline(projectPath);
		writeFileSync(path.join(projectPath, 'src', 'session.ts'), 'export const session = 2;\n');
		writeFileSync(path.join(projectPath, 'tests', 'cli', 'session.test.js'), 'test("session updated", () => {});\n');

		const { result, report } = runTestRegressionSelectorJson(projectPath, ['--base', 'HEAD']);

		assert.equal(result.status, 0, result.stderr || result.stdout);
		assert.equal(report.command, 'script-pack');
		assert.equal(report.pack_id, 'test');
		assert.equal(report.script_id, 'regression-selector');
		assert.equal(report.script_ref, 'test/regression-selector');
		assert.equal(report.action, 'select');
		assert.equal(report.ok, true);
		assert.equal(report.summary.selection_status, 'selected');
		assert.equal(report.summary.recommended_intent, 'test_related_cached');
		assert.ok(report.changed_files.some((file) => file.path === 'src/session.ts' && file.surface === 'source'));
		assert.ok(report.changed_files.some((file) => file.path === 'tests/cli/session.test.js' && file.surface === 'test'));
		const selectedSessionTest = report.selected_tests.find((candidate) => candidate.path === 'tests/cli/session.test.js');
		assert.ok(selectedSessionTest);
		assert.equal(selectedSessionTest.reason, 'changed_test');
		assert.ok(selectedSessionTest.reasons.includes('changed_test'));
		assert.ok(selectedSessionTest.reasons.includes('sibling_test'));
		assert.ok(selectedSessionTest.source_paths.includes('tests/cli/session.test.js'));
		assert.ok(selectedSessionTest.source_paths.includes('src/session.ts'));
		assert.equal(report.fallbacks.length, 0);
		assert.match(report.run_hint, /test_related_cached/u);
		assert.match(report.input_hash, /^sha256:[a-f0-9]{64}$/u);
	} finally {
		removeTempProject(projectPath);
	}
});

test('test-regression-selector falls back for package and workflow changes', () => {
	const projectPath = createTempProject();

	try {
		initProject(projectPath);
		mkdirSync(path.join(projectPath, '.github', 'workflows'), { recursive: true });
		writeFileSync(path.join(projectPath, '.github', 'workflows', 'ci.yml'), 'name: ci\n');
		commitGitBaseline(projectPath);
		writeFileSync(path.join(projectPath, 'package.json'), '{"name":"example","version":"1.0.1"}\n');
		writeFileSync(path.join(projectPath, '.github', 'workflows', 'ci.yml'), 'name: ci\non: [push]\n');

		const { result, report } = runTestRegressionSelectorJson(projectPath, ['--base', 'HEAD']);

		assert.equal(result.status, 0, result.stderr || result.stdout);
		assert.equal(report.summary.selection_status, 'fallback');
		assert.equal(report.summary.confidence, 'low');
		assert.equal(report.summary.recommended_intent, 'test_release');
		assert.ok(report.fallbacks.some((fallback) => fallback.reason === 'fallback_package_metadata'));
		assert.ok(report.fallbacks.some((fallback) => fallback.reason === 'fallback_ci_workflow'));
		assert.equal(report.run_hint, 'mf run test_release');
	} finally {
		removeTempProject(projectPath);
	}
});
