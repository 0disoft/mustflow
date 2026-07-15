import {
	assert,
	ciWorkflow,
	cliBuildFreshness,
	cliPath,
	cliTestOrdering,
	cliTestRunner,
	cliTestSelection,
	packageJson,
	pathToFileURL,
	projectRoot,
	publishNpmWorkflow,
	readProjectText,
	readPublicJsonContracts,
	readTemplateSkillProfile,
	readTomlStringArrayBlock,
	releaseVersionCheckScript,
	sourceCommandContract,
	spawnSync,
	startNpmReleaseScript,
	supportedTemplateLocales,
	templateCommandContract,
	templateCreates,
	templateManifest,
	templateSkillCreates,
	test,
} from './helpers/package-contracts.js';

test('CI workflow exercises release-sensitive package smoke paths', () => {
	assert.match(ciWorkflow, /run: bun run check/u);
	assert.match(ciWorkflow, /run: npm run check:core:node/u);
	assert.match(ciWorkflow, /run: npm run check:install/u);
	assert.match(ciWorkflow, /run: bun run docs:check/u);
	assert.match(ciWorkflow, /windows-core:/u);
	assert.match(ciWorkflow, /runs-on: windows-latest/u);
	assert.match(ciWorkflow, /name: Windows Node core check/u);
	assert.ok(ciWorkflow.indexOf('run: npm run check:core:node') > ciWorkflow.indexOf('run: bun run check'));
	assert.ok(ciWorkflow.indexOf('run: npm run check:install') > ciWorkflow.indexOf('run: npm run check:core:node'));
});

test('source repository exposes cached related tests as a read-only command intent', () => {
	const relatedIntent = /\[intents\.test_related\][\s\S]*?(?=\n\[intents\.)/u.exec(sourceCommandContract)?.[0] ?? '';
	const relatedCoverage = /\[intents\.test_related\.covers\][\s\S]*?(?=\n\[intents\.)/u.exec(sourceCommandContract)?.[0] ?? '';
	const relatedCost = /\[intents\.test_related\.cost\][\s\S]*?(?=\n\[intents\.)/u.exec(sourceCommandContract)?.[0] ?? '';
	const cachedIntent = /\[intents\.test_related_cached\][\s\S]*?(?=\n\[intents\.)/u.exec(sourceCommandContract)?.[0] ?? '';
	const cachedCoverage = /\[intents\.test_related_cached\.covers\][\s\S]*?(?=\n\[intents\.)/u.exec(sourceCommandContract)?.[0] ?? '';
	const cachedSelection = /\[intents\.test_related_cached\.selection\][\s\S]*?(?=\n\[intents\.)/u.exec(sourceCommandContract)?.[0] ?? '';
	const cachedCost = /\[intents\.test_related_cached\.cost\][\s\S]*?(?=\n\[intents\.)/u.exec(sourceCommandContract)?.[0] ?? '';

	assert.notEqual(relatedIntent, '');
	assert.match(relatedCoverage, /contracts = \["related CLI regression coverage"\]/u);
	assert.match(relatedCost, /expected_seconds = 180/u);
	assert.notEqual(cachedIntent, '');
	assert.match(cachedIntent, /argv = \["bun", "run", "test:related:cached"\]/u);
	assert.match(cachedIntent, /writes = \[\]/u);
	assert.match(cachedIntent, /network = false/u);
	assert.match(cachedIntent, /destructive = false/u);
	assert.match(cachedIntent, /required_after = \["code_change", "behavior_change", "test_change", "mustflow_config_change", "mustflow_docs_change"\]/u);
	assert.match(cachedIntent, /preconditions = \[/u);
	assert.match(cachedIntent, /kind = "artifact_freshness"/u);
	assert.match(cachedIntent, /artifact = "dist\/cli\/index\.js"/u);
	assert.match(cachedIntent, /sources = \["src\/\*\*", "tsconfig\*\.json"\]/u);
	assert.match(cachedIntent, /satisfy_intent = "test_related"/u);
	assert.match(cachedCoverage, /contracts = \["related CLI regression coverage"\]/u);
	assert.match(cachedSelection, /fallback_intents = \["test_related"\]/u);
	assert.match(cachedCost, /expected_seconds = 90/u);
});

test('source repository exposes related-test profiling as a bounded diagnostic intent', () => {
	const profileIntent = /\[intents\.test_related_profile\][\s\S]*?(?=\n\[intents\.)/u.exec(sourceCommandContract)?.[0] ?? '';
	const defaults = /\[defaults\][\s\S]*?(?=\n\[)/u.exec(sourceCommandContract)?.[0] ?? '';

	assert.match(defaults, /env_policy = "allowlist"/u);
	assert.match(defaults, /"MUSTFLOW_TEST_CHANGED_FILES"/u);
	assert.notEqual(profileIntent, '');
	assert.match(profileIntent, /argv = \["bun", "run", "test:related:profile"\]/u);
	assert.match(profileIntent, /writes = \["dist\/\*\*"\]/u);
	assert.match(profileIntent, /lock = "dist_build_output"/u);
	assert.match(profileIntent, /network = false/u);
	assert.match(profileIntent, /destructive = false/u);
	assert.match(profileIntent, /required_after = \["performance_change", "verification_performance_review"\]/u);
});

test('source repository exposes a bounded fast skill contract intent', () => {
	const intent = /\[intents\.test_skill_contracts\][\s\S]*?(?=\n\[intents\.)/u.exec(sourceCommandContract)?.[0] ?? '';
	const coverage = /\[intents\.test_skill_contracts\.covers\][\s\S]*?(?=\n\[intents\.)/u.exec(sourceCommandContract)?.[0] ?? '';
	const cost = /\[intents\.test_skill_contracts\.cost\][\s\S]*?(?=\n\[intents\.)/u.exec(sourceCommandContract)?.[0] ?? '';

	assert.notEqual(intent, '');
	assert.match(intent, /argv = \["bun", "run", "test:skill-contracts"\]/u);
	assert.match(intent, /timeout_seconds = 120/u);
	assert.match(intent, /stdin = "closed"/u);
	assert.match(intent, /writes = \[\]/u);
	assert.match(intent, /network = false/u);
	assert.match(intent, /destructive = false/u);
	assert.match(intent, /required_after = \[\]/u);
	assert.match(coverage, /surfaces = \["mustflow_skill_contracts"\]/u);
	assert.match(coverage, /templates\/default\/manifest\.toml/u);
	assert.match(cost, /expected_seconds = 20/u);
	assert.match(cost, /cost_tier = "low"/u);
});

test('source repository keeps build out of ordinary code-change verification', () => {
	const buildIntent = /\[intents\.build\][\s\S]*?(?=\n\[intents\.)/u.exec(sourceCommandContract)?.[0] ?? '';

	assert.notEqual(buildIntent, '');
	assert.match(buildIntent, /argv = \["bun", "run", "build"\]/u);
	assert.match(buildIntent, /required_after = \["build_config_change", "public_api_change", "package_metadata_change"\]/u);
	assert.doesNotMatch(buildIntent, /"code_change"/u);
});

test('source repository keeps full tests for release and cross-cutting verification', () => {
	const fullTestIntent = /\[intents\.test\][\s\S]*?(?=\n\[intents\.)/u.exec(sourceCommandContract)?.[0] ?? '';

	assert.notEqual(fullTestIntent, '');
	assert.match(fullTestIntent, /argv = \["bun", "run", "test"\]/u);
	assert.match(fullTestIntent, /required_after = \["release_risk", "cross_cutting_code_change"\]/u);
	assert.doesNotMatch(fullTestIntent, /"code_change"/u);
	assert.doesNotMatch(fullTestIntent, /"behavior_change"/u);
});

test('source repository verification plan prefers cached related tests for ordinary code changes', () => {
	const result = spawnSync(process.execPath, [cliPath, 'verify', '--reason', 'code_change', '--plan-only', '--json'], {
		cwd: projectRoot,
		encoding: 'utf8',
	});
	const report = JSON.parse(result.stdout);
	const cached = report.candidates.find((candidate) => candidate.intent === 'test_related_cached');
	const related = report.candidates.find((candidate) => candidate.intent === 'test_related');

	assert.equal(result.status, 0, result.stderr || result.stdout);
	assert.equal(cached?.selectionState, 'selected');
	assert.equal(related?.selectionState, 'not_selected');
	assert.deepEqual(
		report.schedule.entries.map((entry) => entry.intent),
		['lint', 'quality_gaming_check', 'test_related_cached'],
	);
	assert.equal(report.candidates.some((candidate) => candidate.intent === 'build'), false);
	assert.equal(report.candidates.some((candidate) => candidate.intent === 'test'), false);
});

test('source repository declares bounded prompt-cache audit checks', () => {
	assert.match(sourceCommandContract, /\[intents\.prompt_cache_audit\]/u);
	assert.match(sourceCommandContract, /"context", "--json", "--cache-profile", "all", "--cache-audit"/u);
	assert.match(sourceCommandContract, /Measure prompt-cache profile sizes and configured budget status read-only/u);
	assert.match(sourceCommandContract, /writes = \[\]/u);
	assert.match(sourceCommandContract, /network = false/u);
	assert.match(sourceCommandContract, /destructive = false/u);
});

test('source repository exposes dogfood update intents as bounded agent-runnable commands', () => {
	const dryRunIntent = /\[intents\.mustflow_update_dry_run\][\s\S]*?(?=\n\[intents\.)/u.exec(sourceCommandContract)?.[0] ?? '';
	const applyIntent = /\[intents\.mustflow_update_apply\][\s\S]*?(?=\n\[intents\.)/u.exec(sourceCommandContract)?.[0] ?? '';

	assert.notEqual(dryRunIntent, '');
	assert.match(dryRunIntent, /status = "configured"/u);
	assert.match(dryRunIntent, /run_policy = "agent_allowed"/u);
	assert.match(dryRunIntent, /argv = \["node", "dist\/cli\/index\.js", "update", "--dry-run", "--json"\]/u);
	assert.match(dryRunIntent, /writes = \[\]/u);
	assert.match(dryRunIntent, /network = false/u);
	assert.match(dryRunIntent, /destructive = false/u);
	assert.doesNotMatch(dryRunIntent, /manual_only/u);

	assert.notEqual(applyIntent, '');
	assert.match(applyIntent, /status = "configured"/u);
	assert.match(applyIntent, /run_policy = "agent_allowed"/u);
	assert.match(applyIntent, /argv = \["node", "dist\/cli\/index\.js", "update", "--apply", "--json"\]/u);
	assert.match(applyIntent, /"AGENTS\.md"/u);
	assert.match(applyIntent, /"\.mustflow\/config\/manifest\.lock\.toml"/u);
	assert.match(applyIntent, /"\.mustflow\/config\/commands\.toml"/u);
	assert.match(applyIntent, /"\.mustflow\/backups\/\*\*"/u);
	assert.match(applyIntent, /network = false/u);
	assert.match(applyIntent, /destructive = false/u);
	assert.match(applyIntent, /clean_mustflow_update_plan/u);
	assert.doesNotMatch(applyIntent, /manual_only/u);
});

test('source repository exposes reviewed manifest lock baseline acceptance as a bounded intent', () => {
	const baselineResource = /\[resources\.manifest_lock_baseline\][\s\S]*?(?=\n\[)/u.exec(sourceCommandContract)?.[0] ?? '';
	const baselineIntent = /\[intents\.manifest_lock_accept_workflow_baseline\][\s\S]*?(?=\n\[intents\.)/u.exec(sourceCommandContract)?.[0] ?? '';
	const baselineScript = readProjectText('scripts/accept-manifest-lock-baseline.mjs');

	assert.notEqual(baselineResource, '');
	assert.match(baselineResource, /manifest\.lock\.toml/u);
	assert.notEqual(baselineIntent, '');
	assert.match(baselineIntent, /status = "configured"/u);
	assert.match(baselineIntent, /run_policy = "agent_allowed"/u);
	assert.match(
		baselineIntent,
		/argv = \["node", "scripts\/accept-manifest-lock-baseline\.mjs", "AGENTS\.md", "\.mustflow\/docs\/agent-workflow\.md", "\.mustflow\/config\/commands\.toml", "\.mustflow\/skills\/router\.toml"\]/u,
	);
	assert.match(baselineIntent, /writes = \["\.mustflow\/config\/manifest\.lock\.toml"\]/u);
	assert.match(baselineIntent, /lock = "manifest_lock_baseline"/u);
	assert.match(baselineIntent, /network = false/u);
	assert.match(baselineIntent, /destructive = false/u);
	assert.match(baselineScript, /const allowedPaths = new Set/u);
	assert.match(baselineScript, /'AGENTS\.md'/u);
	assert.match(baselineScript, /'\.mustflow\/docs\/agent-workflow\.md'/u);
	assert.match(baselineScript, /'\.mustflow\/config\/commands\.toml'/u);
	assert.match(baselineScript, /markManifestLockFileCustomized/u);
});

test('Git write contracts require explicit approval and bounded release commands', () => {
	const templateCommitIntent = /\[intents\.git_commit\][\s\S]*?(?=\n\[intents\.|$)/u.exec(templateCommandContract)?.[0] ?? '';
	const templatePushIntent = /\[intents\.git_push\][\s\S]*?(?=\n\[intents\.|$)/u.exec(templateCommandContract)?.[0] ?? '';
	const stageIntent = /\[intents\.release_stage_v2_115_17\][\s\S]*?(?=\n\[intents\.)/u.exec(sourceCommandContract)?.[0] ?? '';
	const commitIntent = /\[intents\.release_commit_v2_115_17\][\s\S]*?(?=\n\[intents\.)/u.exec(sourceCommandContract)?.[0] ?? '';
	const pushIntent = /\[intents\.release_push_main_v2_115_17\][\s\S]*?(?=\n\[intents\.)/u.exec(sourceCommandContract)?.[0] ?? '';

	assert.match(templateCommitIntent, /status = "manual_only"/u);
	assert.match(templateCommitIntent, /approval_actions = \["git_commit"\]/u);
	assert.match(templateCommitIntent, /author_bounded_repo_specific_stage_and_commit_intents/u);
	assert.match(templatePushIntent, /approval_actions = \["git_push"\]/u);
	assert.match(templatePushIntent, /author_bounded_repo_specific_push_intent/u);

	assert.match(stageIntent, /status = "configured"/u);
	assert.match(stageIntent, /argv = \["git", "add", "--"/u);
	assert.match(stageIntent, /approval_actions = \["git_commit"\]/u);
	assert.doesNotMatch(stageIntent, /git", "add", "-A"/u);
	assert.match(commitIntent, /argv = \["git", "commit", "-m", "fix\(workflow\): infer approvals for legacy Git intents"\]/u);
	assert.match(commitIntent, /approval_actions = \["git_commit"\]/u);
	assert.match(pushIntent, /argv = \["git", "push", "origin", "main"\]/u);
	assert.match(pushIntent, /network = true/u);
	assert.match(pushIntent, /approval_actions = \["git_push"\]/u);
});

test('default template exposes script-pack catalog discovery as a read-only command intent', () => {
	assert.match(templateCommandContract, /\[intents\.script_pack_list\][\s\S]*"mf", "script-pack", "list", "--json"/u);
	assert.match(sourceCommandContract, /\[intents\.script_pack_list\][\s\S]*"node", "dist\/cli\/index\.js", "script-pack", "list", "--json"/u);
	assert.match(templateCommandContract, /List bundled mustflow script-pack utilities and routing metadata read-only/u);
	assert.match(sourceCommandContract, /List bundled mustflow script-pack utilities and routing metadata read-only/u);
	assert.match(templateCommandContract, /\[intents\.script_pack_list\][\s\S]*writes = \[\]/u);
	assert.match(sourceCommandContract, /\[intents\.script_pack_list\][\s\S]*writes = \[\]/u);
	assert.match(templateCommandContract, /\[intents\.script_pack_list\][\s\S]*network = false/u);
	assert.match(sourceCommandContract, /\[intents\.script_pack_list\][\s\S]*network = false/u);
	assert.match(templateCommandContract, /\[intents\.script_pack_list\][\s\S]*destructive = false/u);
	assert.match(sourceCommandContract, /\[intents\.script_pack_list\][\s\S]*destructive = false/u);
	assert.match(
		templateCommandContract,
		/\[intents\.script_pack_suggest_changed\][\s\S]*"mf", "script-pack", "suggest", "--changed", "--json"/u,
	);
	assert.match(
		sourceCommandContract,
		/\[intents\.script_pack_suggest_changed\][\s\S]*"node", "dist\/cli\/index\.js", "script-pack", "suggest", "--changed", "--json"/u,
	);
	assert.match(templateCommandContract, /Suggest bundled mustflow script-pack utilities for current changed files read-only/u);
	assert.match(sourceCommandContract, /Suggest bundled mustflow script-pack utilities for current changed files read-only/u);
	assert.match(templateCommandContract, /\[intents\.script_pack_suggest_changed\][\s\S]*writes = \[\]/u);
	assert.match(sourceCommandContract, /\[intents\.script_pack_suggest_changed\][\s\S]*writes = \[\]/u);
	assert.match(templateCommandContract, /\[intents\.script_pack_suggest_changed\][\s\S]*network = false/u);
	assert.match(sourceCommandContract, /\[intents\.script_pack_suggest_changed\][\s\S]*network = false/u);
	assert.match(templateCommandContract, /\[intents\.script_pack_suggest_changed\][\s\S]*destructive = false/u);
	assert.match(sourceCommandContract, /\[intents\.script_pack_suggest_changed\][\s\S]*destructive = false/u);
});

test('default template exposes changed-document review queueing as a bounded command intent', () => {
	assert.match(templateCommandContract, /\[resources\.documentation_review_queue\]/u);
	assert.match(templateCommandContract, /\[intents\.docs_review_add_changed\][\s\S]*"mf", "docs", "review", "add", "--changed"/u);
	assert.match(templateCommandContract, /Add changed documentation review candidates from git status to the review queue/u);
	assert.match(templateCommandContract, /\[intents\.docs_review_add_changed\][\s\S]*writes = \["\.mustflow\/review\/docs\.toml"\]/u);
	assert.match(templateCommandContract, /\[intents\.docs_review_add_changed\][\s\S]*network = false/u);
	assert.match(templateCommandContract, /\[intents\.docs_review_add_changed\][\s\S]*destructive = false/u);
	assert.match(sourceCommandContract, /\[intents\.docs_review_add_changed\][\s\S]*"node", "dist\/cli\/index\.js", "docs", "review", "add", "--changed"/u);
});

test('local index command contracts include bounded source-anchor indexing', () => {
	assert.match(sourceCommandContract, /\[intents\.local_index\][\s\S]*"index", "--source"/u);
	assert.match(templateCommandContract, /\[intents\.local_index\][\s\S]*"mf", "index", "--source"/u);
	assert.match(sourceCommandContract, /including bounded source anchors/u);
	assert.match(templateCommandContract, /including bounded source anchors/u);
	assert.match(sourceCommandContract, /writes = \["\.mustflow\/cache\/\*\*"\]/u);
	assert.match(templateCommandContract, /writes = \["\.mustflow\/cache\/\*\*"\]/u);
});

test('CLI test runner keeps concurrency configurable', () => {
	assert.match(cliTestRunner, /MUSTFLOW_TEST_CONCURRENCY/u);
	assert.match(cliTestRunner, /readPositiveIntegerEnv\('MUSTFLOW_TEST_CONCURRENCY', '8'\)/u);
	assert.match(cliTestRunner, /MUSTFLOW_TEST_RELATED_CONCURRENCY/u);
	assert.match(cliTestRunner, /function readRelatedConcurrency\(\)/u);
	assert.match(cliTestRunner, /readPositiveIntegerEnv\('MUSTFLOW_TEST_CONCURRENCY', '4'\)/u);
	assert.match(cliTestRunner, /MUSTFLOW_TEST_CLI_CONCURRENCY/u);
	assert.match(cliTestRunner, /function readCliConcurrency\(\)/u);
	assert.match(cliTestRunner, /MUSTFLOW_TEST_FULL_CONCURRENCY/u);
	assert.match(cliTestRunner, /function readFullConcurrency\(\)/u);
	assert.match(cliTestRunner, /MUSTFLOW_TEST_COVERAGE_CONCURRENCY/u);
	assert.match(cliTestRunner, /readPositiveIntegerEnv\('MUSTFLOW_TEST_COVERAGE_CONCURRENCY', '4'\)/u);
	assert.match(cliTestRunner, /import \{ createTestSelection \} from '\.\/lib\/test-selection\.mjs';/u);
	assert.match(cliTestRunner, /const suites = suitesForChangedFiles\(currentChangedFiles\);/u);
	assert.match(cliTestSelection, /'related-cached': relatedTestsForFiles\(files\)/u);
	assert.match(cliTestSelection, /'related-profile': relatedTestsForFiles\(files, \{ fallbackTests: \[\] \}\)/u);
	assert.match(cliTestRunner, /buildPolicy/u);
	assert.match(cliTestRunner, /--build=auto/u);
	assert.match(cliTestRunner, /function runBuildIfNeeded/u);
	assert.match(cliBuildFreshness, /defaultUnsafeBuildInputRules/u);
	assert.match(cliBuildFreshness, /compiledOutputPathForSource/u);
	assert.match(cliTestRunner, /function runProfiledTests\(\)/u);
	assert.match(cliTestRunner, /function acquireTestRunnerLock\(\)/u);
	assert.match(cliTestRunner, /MUSTFLOW_TEST_RUNNER_LOCK_DIR/u);
	assert.match(cliTestRunner, /--build-runner/u);
	assert.match(cliTestRunner, /MUSTFLOW_TEST_SCHEDULER/u);
	assert.match(cliTestRunner, /function planWaves\(/u);
	assert.match(cliTestRunner, /readProfileTimingEvidence\(latestProfilePath\)/u);
	assert.match(cliTestRunner, /orderTestPathsByProfile\(selectedTestPaths, profileDurations\)/u);
	assert.match(cliTestRunner, /Using profile timing order from/u);
	assert.match(cliTestRunner, /Profile timing order skipped:/u);
	assert.match(cliTestRunner, /unknown files keep selected order/u);
	assert.match(cliTestOrdering, /export function readProfileDurations/u);
	assert.match(cliTestOrdering, /export function readProfileTimingEvidence/u);
	assert.match(cliTestOrdering, /export function orderTestPathsByProfile/u);
	assert.match(cliTestRunner, /MUSTFLOW_TEST_SQLITE_TOKENS/u);
	assert.match(cliTestRunner, /MUSTFLOW_TEST_GIT_TOKENS/u);
	assert.match(cliTestRunner, /io: '16'/u);
	assert.match(cliTestRunner, /process: '16'/u);
	assert.match(cliTestRunner, /sqlite: '4'/u);
	assert.match(cliTestRunner, /git: '2'/u);
	assert.match(cliTestRunner, /serial total/u);
	assert.match(cliTestRunner, /dist\/ is older than changed TypeScript source/u);

	const relatedResult = spawnSync(process.execPath, ['scripts/run-cli-tests.mjs', 'related'], {
		cwd: projectRoot,
		encoding: 'utf8',
		env: {
			...process.env,
			MUSTFLOW_TEST_CONCURRENCY: '0',
		},
	});

	assert.equal(relatedResult.status, 2);
	assert.match(relatedResult.stderr, /MUSTFLOW_TEST_CONCURRENCY must be a positive integer\./u);

	const result = spawnSync(process.execPath, ['scripts/run-cli-tests.mjs', 'coverage'], {
		cwd: projectRoot,
		encoding: 'utf8',
		env: {
			...process.env,
			MUSTFLOW_TEST_COVERAGE_CONCURRENCY: '0',
		},
	});

	assert.equal(result.status, 2);
	assert.match(result.stderr, /MUSTFLOW_TEST_COVERAGE_CONCURRENCY must be a positive integer\./u);
});

test('SQLite local index contracts stay synchronized across docs and schemas', () => {
	const explainSchema = readProjectText('schemas/explain-report.schema.json');
	const changeVerificationSchema = readProjectText('schemas/change-verification-report.schema.json');
	const readme = readProjectText('README.md');

	assert.match(explainSchema, /"effectGraph"/u);
	assert.match(explainSchema, /"readModel"/u);
	assert.match(explainSchema, /"decisionGraph"/u);
	assert.match(explainSchema, /"latestFailure"/u);
	assert.match(changeVerificationSchema, /"decision_graph"/u);
	assert.match(changeVerificationSchema, /"effectGraph"/u);
	assert.match(changeVerificationSchema, /"surfaceReadModels"/u);
	assert.match(readme, /verification decision graph/u);
	assert.match(readme, /read-only local-index lock explanations/u);

	for (const locale of supportedTemplateLocales) {
		const commandIndex = readProjectText(`docs-site/src/content/docs/${locale}/commands/index.md`);
		const searchCommand = readProjectText(`docs-site/src/content/docs/${locale}/commands/search.md`);
		const explainCommand = readProjectText(`docs-site/src/content/docs/${locale}/commands/explain.md`);
		const verifyCommand = readProjectText(`docs-site/src/content/docs/${locale}/commands/verify.md`);
		const localIndexDesign = readProjectText(`docs-site/src/content/docs/${locale}/design/local-index.md`);
		const releaseChecksDesign = readProjectText(`docs-site/src/content/docs/${locale}/design/release-checks.md`);

		assert.match(commandIndex, /`search_backend`/u, `${locale} index command docs should document search_backend`);
		assert.match(commandIndex, /`search_fts5_available`/u, `${locale} index command docs should document FTS5 status`);
		assert.match(commandIndex, /`excluded_raw_data_kinds`/u, `${locale} index command docs should document excluded raw data kinds`);
		assert.match(commandIndex, /--incremental/u, `${locale} index command docs should document incremental mode`);
		assert.match(commandIndex, /`indexed_file_count`/u, `${locale} index command docs should document indexed_file_count`);
		assert.match(searchCommand, /`search_backend`/u, `${locale} search command docs should document search_backend`);
		assert.match(searchCommand, /`search_fts5_available`/u, `${locale} search command docs should document FTS5 status`);
		assert.match(searchCommand, /`skill_route`/u, `${locale} search command docs should document skill route results`);
		assert.match(explainCommand, /decision\.effectGraph/u, `${locale} explain docs should document command graphs`);
		assert.match(explainCommand, /decision\.readModel/u, `${locale} explain docs should document surface read models`);
		assert.match(explainCommand, /decisionGraph/u, `${locale} explain docs should document verify decision graph`);
		assert.match(explainCommand, /decision\.latestFailure/u, `${locale} explain docs should document latest failure metadata`);
		assert.match(verifyCommand, /decision_graph/u, `${locale} verify docs should document decision graph`);
		assert.match(verifyCommand, /effectGraph/u, `${locale} verify docs should document command graphs`);
		assert.match(verifyCommand, /surfaceReadModels/u, `${locale} verify docs should document surface read models`);
		assert.match(localIndexDesign, /search_ngrams/u, `${locale} local index docs should document n-gram search rows`);
		assert.match(localIndexDesign, /indexed_files/u, `${locale} local index docs should document indexed file fingerprints`);
		assert.match(releaseChecksDesign, /MUSTFLOW_TEST_CONCURRENCY/u, `${locale} release docs should document test concurrency`);
	}
});
