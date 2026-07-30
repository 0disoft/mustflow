import {
	assert,
	ciWorkflow,
	nativeCrashFixtureWorkflow,
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

test('native crash fixture workflow validates locked semantics across pinned runner families', () => {
	assert.match(nativeCrashFixtureWorkflow, /permissions:\n  contents: read/u);
	assert.match(nativeCrashFixtureWorkflow, /fail-fast: false/u);
	for (const runner of ['ubuntu-24.04', 'windows-2025', 'macos-15']) {
		assert.match(nativeCrashFixtureWorkflow, new RegExp(`- ${runner.replace('.', '\\.')}`, 'u'));
	}
	assert.match(nativeCrashFixtureWorkflow, /rustup toolchain install 1\.96\.1 --profile minimal --no-self-update/u);
	assert.match(nativeCrashFixtureWorkflow, /cargo \+1\.96\.1 build --locked --manifest-path tools\/native-crash-fixture-parser\/Cargo\.toml/u);
	assert.match(nativeCrashFixtureWorkflow, /bun run scripts\/cross-validate-native-crash-fixtures\.ts/u);
	assert.match(nativeCrashFixtureWorkflow, /persist-credentials: false/u);
	assert.doesNotMatch(nativeCrashFixtureWorkflow, /uses: [^\n]+@(?![0-9a-f]{40}(?:\s|$))/u);
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

test('source repository exposes a bounded docs-site security dependency update intent', () => {
	const updateIntent = /\[intents\.docs_site_security_update\][\s\S]*?(?=\n\[intents\.)/u.exec(
		sourceCommandContract,
	)?.[0] ?? '';

	assert.notEqual(updateIntent, '');
	assert.match(updateIntent, /argv = \["bun", "update", "astro", "sharp"\]/u);
	assert.match(updateIntent, /cwd = "docs-site"/u);
	assert.match(updateIntent, /writes = \["docs-site\/package\.json", "docs-site\/bun\.lock", "docs-site\/node_modules\/\*\*"\]/u);
	assert.match(updateIntent, /network = true/u);
	assert.match(updateIntent, /destructive = false/u);
	assert.match(updateIntent, /approval_actions = \["dependency_upgrade"\]/u);
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

test('source repository bounds security skill manifest baseline acceptance to reviewed files', () => {
	const baselineIntent = /\[intents\.manifest_lock_accept_security_skill_baseline\][\s\S]*?(?=\n\[intents\.)/u.exec(
		sourceCommandContract,
	)?.[0] ?? '';
	const baselineScript = readProjectText('scripts/accept-manifest-lock-baseline.mjs');

	assert.notEqual(baselineIntent, '');
	assert.match(baselineIntent, /"\.mustflow\/skills\/dependency-upgrade-review\/SKILL\.md"/u);
	assert.match(baselineIntent, /"\.mustflow\/skills\/security-privacy-review\/SKILL\.md"/u);
	assert.match(baselineIntent, /writes = \["\.mustflow\/config\/manifest\.lock\.toml"\]/u);
	assert.match(baselineIntent, /network = false/u);
	assert.match(baselineIntent, /destructive = false/u);
	assert.match(baselineScript, /'\.mustflow\/skills\/dependency-upgrade-review\/SKILL\.md'/u);
	assert.match(baselineScript, /'\.mustflow\/skills\/security-privacy-review\/SKILL\.md'/u);
});

test('source repository bounds native crash skill manifest baseline acceptance to one reviewed file', () => {
	const baselineIntent = /\[intents\.manifest_lock_accept_native_crash_skill_v2_119_0\][\s\S]*?(?=\n\[intents\.)/u.exec(
		sourceCommandContract,
	)?.[0] ?? '';
	const baselineScript = readProjectText('scripts/accept-manifest-lock-baseline.mjs');

	assert.notEqual(baselineIntent, '');
	assert.match(baselineIntent, /argv = \["node", "scripts\/accept-manifest-lock-baseline\.mjs", "\.mustflow\/skills\/native-crash-forensics-review\/SKILL\.md"\]/u);
	assert.match(baselineIntent, /writes = \["\.mustflow\/config\/manifest\.lock\.toml"\]/u);
	assert.match(baselineIntent, /network = false/u);
	assert.match(baselineIntent, /destructive = false/u);
	assert.match(baselineScript, /'\.mustflow\/skills\/native-crash-forensics-review\/SKILL\.md'/u);
});

test('Git write contracts require explicit approval and bounded release commands', () => {
	const templateCommitIntent = /\[intents\.git_commit\][\s\S]*?(?=\n\[intents\.|$)/u.exec(templateCommandContract)?.[0] ?? '';
	const templatePushIntent = /\[intents\.git_push\][\s\S]*?(?=\n\[intents\.|$)/u.exec(templateCommandContract)?.[0] ?? '';
	const stageIntent = /\[intents\.release_stage_v2_116_2\][\s\S]*?(?=\n\[intents\.)/u.exec(sourceCommandContract)?.[0] ?? '';
	const stagedDiffIntent = /\[intents\.release_staged_diff_v2_116_2\][\s\S]*?(?=\n\[intents\.)/u.exec(sourceCommandContract)?.[0] ?? '';
	const commitIntent = /\[intents\.release_commit_v2_116_2\][\s\S]*?(?=\n\[intents\.)/u.exec(sourceCommandContract)?.[0] ?? '';
	const pushIntent = /\[intents\.release_push_main_v2_116_2\][\s\S]*?(?=\n\[intents\.)/u.exec(sourceCommandContract)?.[0] ?? '';
	const githubAuthIntent = /\[intents\.release_github_auth_v2_116_2\][\s\S]*?(?=\n\[intents\.)/u.exec(sourceCommandContract)?.[0] ?? '';
	const githubMainRunsIntent = /\[intents\.release_github_main_runs_v2_116_2\][\s\S]*?(?=\n\[intents\.)/u.exec(sourceCommandContract)?.[0] ?? '';
	const githubPublishRunsIntent = /\[intents\.release_github_publish_runs_v2_116_2\][\s\S]*?(?=\n\[intents\.)/u.exec(sourceCommandContract)?.[0] ?? '';
	const githubReleaseIntent = /\[intents\.release_github_release_v2_116_2\][\s\S]*?(?=\n\[intents\.)/u.exec(sourceCommandContract)?.[0] ?? '';

	assert.match(templateCommitIntent, /status = "manual_only"/u);
	assert.match(templateCommitIntent, /approval_actions = \["git_commit"\]/u);
	assert.match(templateCommitIntent, /author_bounded_repo_specific_stage_and_commit_intents/u);
	assert.match(templatePushIntent, /approval_actions = \["git_push"\]/u);
	assert.match(templatePushIntent, /author_bounded_repo_specific_push_intent/u);

	assert.match(stageIntent, /status = "configured"/u);
	assert.match(stageIntent, /argv = \[\s*"git",\s*"add",\s*"--"/u);
	assert.match(stageIntent, /"\.mustflow\/skills\/parser-engineering-review"/u);
	assert.match(stageIntent, /"\.mustflow\/skills\/session-handoff-integrity-review"/u);
	assert.match(stageIntent, /"\.mustflow\/skills\/file-upload-security-review"/u);
	assert.match(stageIntent, /"CHANGELOG\.md"/u);
	assert.match(stageIntent, /"REPO_FLOW\.md"/u);
	assert.match(stageIntent, /"REPO_MAP\.md"/u);
	assert.match(stageIntent, /"\.mustflow\/config\/commands\.toml"/u);
	assert.match(stageIntent, /"\.mustflow\/config\/manifest\.lock\.toml"/u);
	assert.match(stageIntent, /"tests\/cli\/package-command-contracts\.test\.js"/u);
	assert.match(stageIntent, /approval_actions = \["git_commit"\]/u);
	assert.doesNotMatch(stageIntent, /git", "add", "-A"/u);
	assert.doesNotMatch(stageIntent, /"\.mustflow\/review\/docs\.toml"/u);
	assert.match(stagedDiffIntent, /argv = \["git", "diff", "--cached", "--name-status"\]/u);
	assert.match(stagedDiffIntent, /writes = \[\]/u);
	assert.match(stagedDiffIntent, /network = false/u);
	assert.match(commitIntent, /"✨ feat\(skills\): add systems integrity review suite"/u);
	assert.match(commitIntent, /"Validation: mf run test_skill_contracts;/u);
	assert.match(commitIntent, /approval_actions = \["git_commit"\]/u);
	assert.match(pushIntent, /argv = \["git", "push", "origin", "main"\]/u);
	assert.match(pushIntent, /network = true/u);
	assert.match(pushIntent, /approval_actions = \["git_push"\]/u);
	assert.match(githubAuthIntent, /argv = \["gh", "auth", "status"\]/u);
	assert.match(githubMainRunsIntent, /"gh", "run", "list", "--repo", "0disoft\/mustflow", "--branch", "main"/u);
	assert.match(githubPublishRunsIntent, /"--workflow", "publish-npm\.yml"/u);
	assert.match(githubReleaseIntent, /"gh", "release", "view", "v2\.116\.2"/u);
	for (const githubIntent of [githubAuthIntent, githubMainRunsIntent, githubPublishRunsIntent, githubReleaseIntent]) {
		assert.match(githubIntent, /writes = \[\]/u);
		assert.match(githubIntent, /network = true/u);
	}
});

test('2.117.1 release commands stage only the reviewed lifecycle skill release', () => {
	const stageIntent = /\[intents\.release_stage_v2_117_1\][\s\S]*?(?=\n\[intents\.)/u.exec(sourceCommandContract)?.[0] ?? '';
	const stagedDiffIntent = /\[intents\.release_staged_diff_v2_117_1\][\s\S]*?(?=\n\[intents\.)/u.exec(sourceCommandContract)?.[0] ?? '';
	const commitIntent = /\[intents\.release_commit_v2_117_1\][\s\S]*?(?=\n\[intents\.)/u.exec(sourceCommandContract)?.[0] ?? '';
	const pushIntent = /\[intents\.release_push_main_v2_117_1\][\s\S]*?(?=\n\[intents\.)/u.exec(sourceCommandContract)?.[0] ?? '';
	const githubAuthIntent = /\[intents\.release_github_auth_v2_117_1\][\s\S]*?(?=\n\[intents\.)/u.exec(sourceCommandContract)?.[0] ?? '';
	const githubMainRunsIntent = /\[intents\.release_github_main_runs_v2_117_1\][\s\S]*?(?=\n\[intents\.)/u.exec(sourceCommandContract)?.[0] ?? '';
	const githubPublishRunsIntent = /\[intents\.release_github_publish_runs_v2_117_1\][\s\S]*?(?=\n\[intents\.)/u.exec(sourceCommandContract)?.[0] ?? '';
	const githubReleaseIntent = /\[intents\.release_github_release_v2_117_1\][\s\S]*?(?=\n\[intents\.)/u.exec(sourceCommandContract)?.[0] ?? '';

	assert.match(stageIntent, /status = "configured"/u);
	assert.match(stageIntent, /argv = \[\s*"git",\s*"add",\s*"--"/u);
	assert.match(stageIntent, /"\.mustflow\/skills\/connection-lifecycle-integrity-review"/u);
	assert.match(stageIntent, /"\.mustflow\/skills\/memory-lifetime-review"/u);
	assert.match(stageIntent, /"CHANGELOG\.md"/u);
	assert.match(stageIntent, /"REPO_FLOW\.md"/u);
	assert.match(stageIntent, /"REPO_MAP\.md"/u);
	assert.match(stageIntent, /"\.mustflow\/config\/commands\.toml"/u);
	assert.match(stageIntent, /"\.mustflow\/config\/manifest\.lock\.toml"/u);
	assert.match(stageIntent, /"tests\/cli\/package-command-contracts\.test\.js"/u);
	assert.match(stageIntent, /approval_actions = \["git_commit"\]/u);
	assert.doesNotMatch(stageIntent, /git", "add", "-A"/u);
	assert.doesNotMatch(stageIntent, /"\.mustflow\/review\/docs\.toml"/u);
	assert.match(stagedDiffIntent, /argv = \["git", "diff", "--cached", "--name-status"\]/u);
	assert.match(commitIntent, /"✨ feat\(skills\): harden connection and memory lifecycle reviews"/u);
	assert.match(commitIntent, /"Validation: mf run test_skill_contracts;/u);
	assert.match(commitIntent, /approval_actions = \["git_commit"\]/u);
	assert.match(pushIntent, /argv = \["git", "push", "origin", "main"\]/u);
	assert.match(pushIntent, /approval_actions = \["git_push"\]/u);
	assert.match(githubAuthIntent, /argv = \["gh", "auth", "status"\]/u);
	assert.match(githubMainRunsIntent, /"gh", "run", "list", "--repo", "0disoft\/mustflow", "--branch", "main"/u);
	assert.match(githubPublishRunsIntent, /"--workflow", "publish-npm\.yml"/u);
	assert.match(githubReleaseIntent, /"gh", "release", "view", "v2\.117\.1"/u);
	for (const githubIntent of [githubAuthIntent, githubMainRunsIntent, githubPublishRunsIntent, githubReleaseIntent]) {
		assert.match(githubIntent, /writes = \[\]/u);
		assert.match(githubIntent, /network = true/u);
	}
});

test('2.118.0 release commands stage only scoped workspace and game asset production changes', () => {
	const stageIntent = /\[intents\.release_stage_v2_118_0\][\s\S]*?(?=\n\[intents\.)/u.exec(sourceCommandContract)?.[0] ?? '';
	const stagedDiffIntent = /\[intents\.release_staged_diff_v2_118_0\][\s\S]*?(?=\n\[intents\.)/u.exec(sourceCommandContract)?.[0] ?? '';
	const commitIntent = /\[intents\.release_commit_v2_118_0\][\s\S]*?(?=\n\[intents\.)/u.exec(sourceCommandContract)?.[0] ?? '';
	const pushIntent = /\[intents\.release_push_main_v2_118_0\][\s\S]*?(?=\n\[intents\.)/u.exec(sourceCommandContract)?.[0] ?? '';
	const githubAuthIntent = /\[intents\.release_github_auth_v2_118_0\][\s\S]*?(?=\n\[intents\.)/u.exec(sourceCommandContract)?.[0] ?? '';
	const githubMainRunsIntent = /\[intents\.release_github_main_runs_v2_118_0\][\s\S]*?(?=\n\[intents\.)/u.exec(sourceCommandContract)?.[0] ?? '';
	const githubPublishRunsIntent = /\[intents\.release_github_publish_runs_v2_118_0\][\s\S]*?(?=\n\[intents\.)/u.exec(sourceCommandContract)?.[0] ?? '';
	const githubReleaseIntent = /\[intents\.release_github_release_v2_118_0\][\s\S]*?(?=\n\[intents\.|$)/u.exec(sourceCommandContract)?.[0] ?? '';

	assert.match(stageIntent, /status = "configured"/u);
	assert.match(stageIntent, /argv = \[\s*"git",\s*"add",\s*"--"/u);
	assert.match(stageIntent, /"\.mustflow\/skills\/ai-game-asset-production"/u);
	assert.match(stageIntent, /"src\/cli\/lib\/run-context\.ts"/u);
	assert.match(stageIntent, /"src\/core\/workspace-command-authority\.ts"/u);
	assert.match(stageIntent, /"schemas\/workspace-command-catalog\.schema\.json"/u);
	assert.match(stageIntent, /"templates\/default\/locales\/en\/\.mustflow\/skills\/ai-game-asset-production"/u);
	assert.match(stageIntent, /"CHANGELOG\.md"/u);
	assert.match(stageIntent, /"REPO_FLOW\.md"/u);
	assert.match(stageIntent, /"REPO_MAP\.md"/u);
	assert.match(stageIntent, /"\.mustflow\/config\/commands\.toml"/u);
	assert.match(stageIntent, /"\.mustflow\/config\/manifest\.lock\.toml"/u);
	assert.match(stageIntent, /"tests\/cli\/package-command-contracts\.test\.js"/u);
	assert.match(stageIntent, /approval_actions = \["git_commit"\]/u);
	assert.doesNotMatch(stageIntent, /git", "add", "-A"/u);
	assert.doesNotMatch(stageIntent, /"\.mustflow\/review\/docs\.toml"/u);
	assert.match(stagedDiffIntent, /argv = \["git", "diff", "--cached", "--name-status"\]/u);
	assert.match(stagedDiffIntent, /writes = \[\]/u);
	assert.match(commitIntent, /"✨ feat\(workspace\): add scoped authority and game asset production"/u);
	assert.match(commitIntent, /"Validation: mf run test_related;/u);
	assert.match(commitIntent, /approval_actions = \["git_commit"\]/u);
	assert.match(pushIntent, /argv = \["git", "push", "origin", "main"\]/u);
	assert.match(pushIntent, /approval_actions = \["git_push"\]/u);
	assert.match(githubAuthIntent, /argv = \["gh", "auth", "status"\]/u);
	assert.match(githubMainRunsIntent, /"gh", "run", "list", "--repo", "0disoft\/mustflow", "--branch", "main"/u);
	assert.match(githubPublishRunsIntent, /"--workflow", "publish-npm\.yml"/u);
	assert.match(githubReleaseIntent, /"gh", "release", "view", "v2\.118\.0"/u);
	for (const githubIntent of [githubAuthIntent, githubMainRunsIntent, githubPublishRunsIntent, githubReleaseIntent]) {
		assert.match(githubIntent, /writes = \[\]/u);
		assert.match(githubIntent, /network = true/u);
		assert.match(githubIntent, /env_policy = "allowlist"/u);
		assert.match(githubIntent, /env_allowlist = \["APPDATA", "GH_CONFIG_DIR"\]/u);
	}
});

test('2.118.0 GitHub auth fix commands keep the follow-up commit bounded', () => {
	const stageIntent = /\[intents\.release_auth_fix_stage_v2_118_0\][\s\S]*?(?=\n\[intents\.)/u.exec(sourceCommandContract)?.[0] ?? '';
	const stagedDiffIntent = /\[intents\.release_auth_fix_staged_diff_v2_118_0\][\s\S]*?(?=\n\[intents\.)/u.exec(sourceCommandContract)?.[0] ?? '';
	const commitIntent = /\[intents\.release_auth_fix_commit_v2_118_0\][\s\S]*?(?=\n\[intents\.)/u.exec(sourceCommandContract)?.[0] ?? '';
	const pushIntent = /\[intents\.release_auth_fix_push_main_v2_118_0\][\s\S]*?(?=\n\[intents\.|$)/u.exec(sourceCommandContract)?.[0] ?? '';

	assert.match(stageIntent, /argv = \[\s*"git",\s*"add",\s*"--"/u);
	assert.match(stageIntent, /"\.mustflow\/config\/commands\.toml"/u);
	assert.match(stageIntent, /"\.mustflow\/config\/manifest\.lock\.toml"/u);
	assert.match(stageIntent, /"REPO_FLOW\.md"/u);
	assert.match(stageIntent, /"tests\/cli\/package-command-contracts\.test\.js"/u);
	assert.doesNotMatch(stageIntent, /git", "add", "-A"/u);
	assert.doesNotMatch(stageIntent, /"\.mustflow\/review\/docs\.toml"/u);
	assert.match(stagedDiffIntent, /argv = \["git", "diff", "--cached", "--name-status"\]/u);
	assert.match(commitIntent, /"🐛 fix\(release\): preserve GitHub CLI auth context"/u);
	assert.match(commitIntent, /approval_actions = \["git_commit"\]/u);
	assert.match(pushIntent, /argv = \["git", "push", "origin", "main"\]/u);
	assert.match(pushIntent, /approval_actions = \["git_push"\]/u);
});

test('2.118.0 scoped containment fix commands keep the CI follow-up commit bounded', () => {
	const stageIntent = /\[intents\.release_ci_fix_stage_v2_118_0\][\s\S]*?(?=\n\[intents\.)/u.exec(sourceCommandContract)?.[0] ?? '';
	const stagedDiffIntent = /\[intents\.release_ci_fix_staged_diff_v2_118_0\][\s\S]*?(?=\n\[intents\.)/u.exec(sourceCommandContract)?.[0] ?? '';
	const commitIntent = /\[intents\.release_ci_fix_commit_v2_118_0\][\s\S]*?(?=\n\[intents\.)/u.exec(sourceCommandContract)?.[0] ?? '';
	const pushIntent = /\[intents\.release_ci_fix_push_main_v2_118_0\][\s\S]*?(?=\n\[intents\.|$)/u.exec(sourceCommandContract)?.[0] ?? '';

	assert.match(stageIntent, /argv = \[\s*"git",\s*"add",\s*"--"/u);
	assert.match(stageIntent, /"\.mustflow\/config\/commands\.toml"/u);
	assert.match(stageIntent, /"\.mustflow\/config\/manifest\.lock\.toml"/u);
	assert.match(stageIntent, /"REPO_FLOW\.md"/u);
	assert.match(stageIntent, /"src\/cli\/lib\/run-context\.ts"/u);
	assert.match(stageIntent, /"tests\/cli\/workspace\.test\.js"/u);
	assert.match(stageIntent, /"tests\/cli\/package-command-contracts\.test\.js"/u);
	assert.doesNotMatch(stageIntent, /git", "add", "-A"/u);
	assert.doesNotMatch(stageIntent, /"\.mustflow\/review\/docs\.toml"/u);
	assert.match(stagedDiffIntent, /argv = \["git", "diff", "--cached", "--name-status"\]/u);
	assert.match(commitIntent, /"🐛 fix\(workspace\): canonicalize scoped containment paths"/u);
	assert.match(commitIntent, /approval_actions = \["git_commit"\]/u);
	assert.match(pushIntent, /argv = \["git", "push", "origin", "main"\]/u);
	assert.match(pushIntent, /approval_actions = \["git_push"\]/u);
});

test('2.118.1 security remediation publish contracts stay exact and non-force', () => {
	const stageIntent = /\[intents\.security_remediation_stage_v2_118_1\][\s\S]*?(?=\n\[intents\.)/u.exec(sourceCommandContract)?.[0] ?? '';
	const stagedDiffIntent = /\[intents\.security_remediation_staged_diff_v2_118_1\][\s\S]*?(?=\n\[intents\.)/u.exec(sourceCommandContract)?.[0] ?? '';
	const commitIntent = /\[intents\.security_remediation_commit_v2_118_1\][\s\S]*?(?=\n\[intents\.)/u.exec(sourceCommandContract)?.[0] ?? '';
	const pushIntent = /\[intents\.security_remediation_push_main_v2_118_1\][\s\S]*$/u.exec(sourceCommandContract)?.[0] ?? '';

	assert.match(stageIntent, /"\.github\/workflows\/clarissimi\.yml"/u);
	assert.match(stageIntent, /"docs-site\/package\.json"/u);
	assert.match(stageIntent, /"docs-site\/bun\.lock"/u);
	assert.match(stageIntent, /"\.mustflow\/skills\/dependency-upgrade-review\/SKILL\.md"/u);
	assert.match(stageIntent, /"\.mustflow\/skills\/security-privacy-review\/SKILL\.md"/u);
	assert.match(stageIntent, /"templates\/default\/locales\/en\/\.mustflow\/skills\/dependency-upgrade-review\/SKILL\.md"/u);
	assert.match(stageIntent, /"templates\/default\/locales\/en\/\.mustflow\/skills\/security-privacy-review\/SKILL\.md"/u);
	assert.doesNotMatch(stageIntent, /"git",\s*"add",\s*"-A"/u);
	assert.doesNotMatch(stageIntent, /"git",\s*"add",\s*"--",\s*"\.\/?"/u);
	assert.match(stagedDiffIntent, /"git", "diff", "--cached", "--name-status"/u);
	assert.match(commitIntent, /🐛 fix\(security\): remediate dependency and workflow alerts/u);
	assert.match(commitIntent, /approval_actions = \["git_commit"\]/u);
	assert.match(pushIntent, /argv = \["git", "push", "origin", "main"\]/u);
	assert.doesNotMatch(pushIntent, /--force/u);
	assert.match(pushIntent, /approval_actions = \["git_push"\]/u);
});

test('2.118.2 Codex thread coordination release contracts stay bounded and non-force', () => {
	const stageIntent = /\[intents\.thread_coordination_stage_v2_118_2\][\s\S]*?(?=\n\[intents\.)/u.exec(sourceCommandContract)?.[0] ?? '';
	const stagedDiffIntent = /\[intents\.thread_coordination_staged_diff_v2_118_2\][\s\S]*?(?=\n\[intents\.)/u.exec(sourceCommandContract)?.[0] ?? '';
	const commitIntent = /\[intents\.thread_coordination_commit_v2_118_2\][\s\S]*?(?=\n\[intents\.)/u.exec(sourceCommandContract)?.[0] ?? '';
	const pushIntent = /\[intents\.thread_coordination_push_main_v2_118_2\][\s\S]*?(?=\n\[intents\.)/u.exec(sourceCommandContract)?.[0] ?? '';
	const mainRunsIntent = /\[intents\.thread_coordination_github_main_runs_v2_118_2\][\s\S]*?(?=\n\[intents\.)/u.exec(sourceCommandContract)?.[0] ?? '';
	const publishRunsIntent = /\[intents\.thread_coordination_github_publish_runs_v2_118_2\][\s\S]*?(?=\n\[intents\.)/u.exec(sourceCommandContract)?.[0] ?? '';
	const releaseIntent = /\[intents\.thread_coordination_github_release_v2_118_2\][\s\S]*$/u.exec(sourceCommandContract)?.[0] ?? '';

	assert.match(stageIntent, /argv = \[\s*"git",\s*"add",\s*"--"/u);
	assert.match(stageIntent, /"\.mustflow\/config\/commands\.toml"/u);
	assert.match(stageIntent, /"\.mustflow\/config\/manifest\.lock\.toml"/u);
	assert.match(stageIntent, /"\.mustflow\/skills\/cross-agent-session-reference\/SKILL\.md"/u);
	assert.match(stageIntent, /"\.mustflow\/skills\/multi-agent-work-coordination\/SKILL\.md"/u);
	assert.match(stageIntent, /"REPO_FLOW\.md"/u);
	assert.match(stageIntent, /"templates\/default\/locales\/en\/\.mustflow\/skills\/cross-agent-session-reference\/SKILL\.md"/u);
	assert.match(stageIntent, /"tests\/cli\/authoring-skill-release-support-contracts\.test\.js"/u);
	assert.match(stageIntent, /"tests\/cli\/package-command-contracts\.test\.js"/u);
	assert.doesNotMatch(stageIntent, /"git",\s*"add",\s*"-A"/u);
	assert.doesNotMatch(stageIntent, /"git",\s*"add",\s*"--",\s*"\.\/?"/u);
	assert.match(stagedDiffIntent, /"git", "diff", "--cached", "--name-status"/u);
	assert.match(commitIntent, /🐛 fix\(skills\): harden Codex thread coordination/u);
	assert.match(commitIntent, /approval_actions = \["git_commit"\]/u);
	assert.match(pushIntent, /argv = \["git", "push", "origin", "main"\]/u);
	assert.doesNotMatch(pushIntent, /--force/u);
	assert.match(pushIntent, /approval_actions = \["git_push"\]/u);
	assert.match(mainRunsIntent, /"--branch", "main"/u);
	assert.match(publishRunsIntent, /"--workflow", "publish-npm\.yml"/u);
	assert.match(releaseIntent, /"release", "view", "v2\.118\.2"/u);
});

test('2.119.0 catalog retirement and information visualization commits stay independently bounded', () => {
	const catalogStage = /\[intents\.catalog_v1_retirement_stage_v2_119_0\][\s\S]*?(?=\n\[intents\.)/u.exec(sourceCommandContract)?.[0] ?? '';
	const catalogDiff = /\[intents\.catalog_v1_retirement_staged_diff_v2_119_0\][\s\S]*?(?=\n\[intents\.)/u.exec(sourceCommandContract)?.[0] ?? '';
	const catalogCommit = /\[intents\.catalog_v1_retirement_commit_v2_119_0\][\s\S]*?(?=\n\[intents\.)/u.exec(sourceCommandContract)?.[0] ?? '';
	const visualStage = /\[intents\.information_visualization_stage_v2_119_0\][\s\S]*?(?=\n\[intents\.)/u.exec(sourceCommandContract)?.[0] ?? '';
	const visualDiff = /\[intents\.information_visualization_staged_diff_v2_119_0\][\s\S]*?(?=\n\[intents\.)/u.exec(sourceCommandContract)?.[0] ?? '';
	const visualCommit = /\[intents\.information_visualization_commit_v2_119_0\][\s\S]*?(?=\n\[intents\.|$)/u.exec(sourceCommandContract)?.[0] ?? '';

	assert.match(catalogStage, /"src\/cli\/commands\/update\.ts"/u);
	assert.match(catalogStage, /"REPO_FLOW\.md"/u);
	assert.match(catalogStage, /"tests\/cli\/update\.test\.js"/u);
	assert.match(catalogStage, /"tests\/cli\/upgrade\.test\.js"/u);
	assert.doesNotMatch(catalogStage, /information-visualization-integrity-review/u);
	assert.doesNotMatch(catalogStage, /"git",\s*"add",\s*"-A"/u);
	assert.match(catalogDiff, /"git", "diff", "--cached", "--name-status"/u);
	assert.match(catalogCommit, /✨ feat\(update\): retire legacy skill route catalogs/u);
	assert.match(catalogCommit, /approval_actions = \["git_commit"\]/u);

	assert.match(visualStage, /"\.mustflow\/skills\/information-visualization-integrity-review"/u);
	assert.match(visualStage, /"src\/cli\/lib\/validation\/index\.ts"/u);
	assert.match(visualStage, /"templates\/default\/locales\/en\/\.mustflow\/skills\/information-visualization-integrity-review"/u);
	assert.doesNotMatch(visualStage, /"src\/cli\/commands\/update\.ts"/u);
	assert.doesNotMatch(visualStage, /"git",\s*"add",\s*"-A"/u);
	assert.match(visualDiff, /"git", "diff", "--cached", "--name-status"/u);
	assert.match(visualCommit, /✨ feat\(skills\): add information visualization integrity review/u);
	assert.match(visualCommit, /approval_actions = \["git_commit"\]/u);
});

test('2.120.0 test-suite value pruning release stays bounded and remotely verifiable', () => {
	const stageIntent = /\[intents\.release_stage_v2_120_0\][\s\S]*?(?=\n\[intents\.)/u.exec(sourceCommandContract)?.[0] ?? '';
	const stagedDiffIntent = /\[intents\.release_staged_diff_v2_120_0\][\s\S]*?(?=\n\[intents\.)/u.exec(sourceCommandContract)?.[0] ?? '';
	const commitIntent = /\[intents\.release_commit_v2_120_0\][\s\S]*?(?=\n\[intents\.)/u.exec(sourceCommandContract)?.[0] ?? '';
	const pushIntent = /\[intents\.release_push_main_v2_120_0\][\s\S]*?(?=\n\[intents\.)/u.exec(sourceCommandContract)?.[0] ?? '';
	const mainRunsIntent = /\[intents\.release_github_main_runs_v2_120_0\][\s\S]*?(?=\n\[intents\.)/u.exec(sourceCommandContract)?.[0] ?? '';
	const publishRunsIntent = /\[intents\.release_github_publish_runs_v2_120_0\][\s\S]*?(?=\n\[intents\.)/u.exec(sourceCommandContract)?.[0] ?? '';
	const releaseIntent = /\[intents\.release_github_release_v2_120_0\][\s\S]*?(?=\n\[intents\.|$)/u.exec(sourceCommandContract)?.[0] ?? '';

	for (const requiredPath of [
		'.mustflow/config/commands.toml',
		'.mustflow/config/manifest.lock.toml',
		'.mustflow/skills/test-suite-value-pruning-review/SKILL.md',
		'CHANGELOG.md',
		'REPO_FLOW.md',
		'REPO_MAP.md',
		'package.json',
		'templates/default/locales/en/.mustflow/skills/test-suite-value-pruning-review/SKILL.md',
		'templates/default/manifest.toml',
		'tests/cli/package-command-contracts.test.js',
	]) {
		assert.match(stageIntent, new RegExp(`"${requiredPath.replace(/[.*+?^${}()|[\]\\]/gu, '\\$&')}"`, 'u'));
	}
	assert.doesNotMatch(stageIntent, /"git",\s*"add",\s*"-A"/u);
	assert.doesNotMatch(stageIntent, /"git",\s*"add",\s*"--",\s*"\.\/?"/u);
	assert.match(stageIntent, /approval_actions = \["git_commit"\]/u);
	assert.match(stagedDiffIntent, /"git", "diff", "--cached", "--name-status"/u);
	assert.match(commitIntent, /✨ feat\(skills\): add test suite value pruning review/u);
	assert.match(commitIntent, /approval_actions = \["git_commit"\]/u);
	assert.match(pushIntent, /argv = \["git", "push", "origin", "main"\]/u);
	assert.doesNotMatch(pushIntent, /--force/u);
	assert.match(pushIntent, /approval_actions = \["git_push"\]/u);
	assert.match(mainRunsIntent, /"--branch", "main"/u);
	assert.match(publishRunsIntent, /"--workflow", "publish-npm\.yml"/u);
	assert.match(releaseIntent, /"release", "view", "v2\.120\.0"/u);
});

test('2.120.0 sanitizer ReDoS follow-up commit stays independently bounded', () => {
	const stageIntent = /\[intents\.release_redos_fix_stage_v2_120_0\][\s\S]*?(?=\n\[intents\.)/u.exec(sourceCommandContract)?.[0] ?? '';
	const stagedDiffIntent = /\[intents\.release_redos_fix_staged_diff_v2_120_0\][\s\S]*?(?=\n\[intents\.)/u.exec(sourceCommandContract)?.[0] ?? '';
	const commitIntent = /\[intents\.release_redos_fix_commit_v2_120_0\][\s\S]*?(?=\n\[intents\.|$)/u.exec(sourceCommandContract)?.[0] ?? '';

	for (const requiredPath of [
		'.mustflow/config/commands.toml',
		'.mustflow/config/manifest.lock.toml',
		'.mustflow/skills/catalog.v2.json',
		'.mustflow/skills/routes.toml',
		'.mustflow/skills/security-privacy-review/SKILL.md',
		'.mustflow/skills/security-regression-tests/SKILL.md',
		'CHANGELOG.md',
		'REPO_FLOW.md',
		'src/core/native-crash-collectors.ts',
		'templates/default/locales/en/.mustflow/skills/security-privacy-review/SKILL.md',
		'templates/default/locales/en/.mustflow/skills/security-regression-tests/SKILL.md',
		'tests/cli/authoring-skill-security-integrity-contracts.test.js',
		'tests/cli/native-crash-collectors.test.js',
		'tests/cli/package-command-contracts.test.js',
		'tests/cli/skill-route.test.js',
	]) {
		assert.match(stageIntent, new RegExp(`"${requiredPath.replace(/[.*+?^${}()|[\]\\]/gu, '\\$&')}"`, 'u'));
	}
	assert.doesNotMatch(stageIntent, /"git",\s*"add",\s*"-A"/u);
	assert.match(stageIntent, /approval_actions = \["git_commit"\]/u);
	assert.match(stagedDiffIntent, /"git", "diff", "--cached", "--name-status"/u);
	assert.match(commitIntent, /🐛 fix\(security\): bound sanitizer path redaction/u);
	assert.match(commitIntent, /approval_actions = \["git_commit"\]/u);
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

test('2.119.0 native crash forensics skill commit stays bounded', () => {
	const stageIntent = /\[intents\.native_crash_skills_stage_v2_119_0\][\s\S]*?(?=\n\[intents\.)/u.exec(sourceCommandContract)?.[0] ?? '';
	const stagedDiffIntent = /\[intents\.native_crash_skills_staged_diff_v2_119_0\][\s\S]*?(?=\n\[intents\.)/u.exec(sourceCommandContract)?.[0] ?? '';
	const commitIntent = /\[intents\.native_crash_skills_commit_v2_119_0\][\s\S]*?(?=\n\[intents\.|$)/u.exec(sourceCommandContract)?.[0] ?? '';

	assert.match(stageIntent, /"\.mustflow\/skills\/native-crash-forensics-review"/u);
	assert.match(stageIntent, /"\.mustflow\/skills\/fuzz-harness-review\/SKILL\.md"/u);
	assert.match(stageIntent, /"\.mustflow\/skills\/race-condition-review\/SKILL\.md"/u);
	assert.match(stageIntent, /"templates\/default\/locales\/en\/\.mustflow\/skills\/native-crash-forensics-review"/u);
	assert.match(stageIntent, /"tests\/cli\/authoring-skill-systems-contracts\.test\.js"/u);
	assert.doesNotMatch(stageIntent, /"git",\s*"add",\s*"-A"/u);
	assert.doesNotMatch(stageIntent, /"git",\s*"add",\s*"--",\s*"\.\/?"/u);
	assert.match(stagedDiffIntent, /"git", "diff", "--cached", "--name-status"/u);
	assert.match(commitIntent, /✨ feat\(skills\): add native crash forensics review/u);
	assert.match(commitIntent, /approval_actions = \["git_commit"\]/u);
});

test('2.119.0 native crash evidence contract commit stays bounded', () => {
	const stageIntent = /\[intents\.crash_evidence_contract_stage_v2_119_0\][\s\S]*?(?=\n\[intents\.)/u.exec(sourceCommandContract)?.[0] ?? '';
	const stagedDiffIntent = /\[intents\.crash_evidence_contract_staged_diff_v2_119_0\][\s\S]*?(?=\n\[intents\.)/u.exec(sourceCommandContract)?.[0] ?? '';
	const commitIntent = /\[intents\.crash_evidence_contract_commit_v2_119_0\][\s\S]*?(?=\n\[intents\.|$)/u.exec(sourceCommandContract)?.[0] ?? '';

	for (const path of [
		'schemas/native-crash-evidence.schema.json',
		'src/core/native-crash-evidence.ts',
		'tests/cli/native-crash-evidence.test.js',
		'tests/fixtures/schema-backcompat/2.84.8/public-json-fixtures.json',
	]) {
		assert.match(stageIntent, new RegExp(`"${path.replaceAll('/', '\\/')}"`, 'u'));
	}
	assert.doesNotMatch(stageIntent, /"git",\s*"add",\s*"-A"/u);
	assert.doesNotMatch(stageIntent, /"git",\s*"add",\s*"--",\s*"\.\/?"/u);
	assert.match(stagedDiffIntent, /"git", "diff", "--cached", "--name-status"/u);
	assert.match(commitIntent, /✨ feat\(crash\): add native crash evidence contract/u);
	assert.match(commitIntent, /approval_actions = \["git_commit"\]/u);
});

test('2.121.0 Playwright reliability skill release stays bounded and remotely verifiable', () => {
	const manifestIntent =
		/\[intents\.manifest_lock_accept_browser_automation_skill_v2_121_0\][\s\S]*?(?=\n\[intents\.)/u.exec(
			sourceCommandContract,
		)?.[0] ?? '';
	const stageIntent = /\[intents\.release_stage_v2_121_0\][\s\S]*?(?=\n\[intents\.)/u.exec(
		sourceCommandContract,
	)?.[0] ?? '';
	const stagedDiffIntent = /\[intents\.release_staged_diff_v2_121_0\][\s\S]*?(?=\n\[intents\.)/u.exec(
		sourceCommandContract,
	)?.[0] ?? '';
	const commitIntent = /\[intents\.release_commit_v2_121_0\][\s\S]*?(?=\n\[intents\.)/u.exec(
		sourceCommandContract,
	)?.[0] ?? '';
	const pushIntent = /\[intents\.release_push_main_v2_121_0\][\s\S]*?(?=\n\[intents\.)/u.exec(
		sourceCommandContract,
	)?.[0] ?? '';
	const mainRunsIntent = /\[intents\.release_github_main_runs_v2_121_0\][\s\S]*?(?=\n\[intents\.)/u.exec(
		sourceCommandContract,
	)?.[0] ?? '';
	const publishRunsIntent =
		/\[intents\.release_github_publish_runs_v2_121_0\][\s\S]*?(?=\n\[intents\.)/u.exec(
			sourceCommandContract,
		)?.[0] ?? '';
	const releaseIntent = /\[intents\.release_github_release_v2_121_0\][\s\S]*?(?=\n\[intents\.|$)/u.exec(
		sourceCommandContract,
	)?.[0] ?? '';

	for (const path of [
		'.mustflow/config/commands.toml',
		'.mustflow/config/manifest.lock.toml',
		'.mustflow/review/docs.toml',
		'.mustflow/skills/INDEX.md',
		'.mustflow/skills/browser-automation-reliability-review/SKILL.md',
		'REPO_FLOW.md',
		'package.json',
		'templates/default/i18n.toml',
		'templates/default/locales/en/.mustflow/skills/INDEX.md',
		'templates/default/locales/en/.mustflow/skills/browser-automation-reliability-review/SKILL.md',
		'templates/default/manifest.toml',
		'tests/cli/authoring-skill-agent-automation-contracts.test.js',
		'tests/cli/package-command-contracts.test.js',
		'tests/cli/package-metadata-contracts.test.js',
	]) {
		assert.match(stageIntent, new RegExp(`"${path.replaceAll('/', '\\/')}"`, 'u'));
	}
	assert.match(manifestIntent, /\.mustflow\/config\/commands\.toml/u);
	assert.doesNotMatch(manifestIntent, /browser-automation-reliability-review\/SKILL\.md/u);
	assert.doesNotMatch(manifestIntent, /\.mustflow\/skills\/INDEX\.md/u);
	assert.doesNotMatch(stageIntent, /"git",\s*"add",\s*"-A"/u);
	assert.doesNotMatch(stageIntent, /"git",\s*"add",\s*"--",\s*"\.\/?"/u);
	assert.match(stagedDiffIntent, /"git", "diff", "--cached", "--name-status"/u);
	assert.match(commitIntent, /✨ feat\(skills\): harden Playwright reliability review/u);
	assert.match(commitIntent, /approval_actions = \["git_commit"\]/u);
	assert.match(pushIntent, /"git", "push", "origin", "main"/u);
	assert.doesNotMatch(pushIntent, /--force/u);
	assert.match(pushIntent, /approval_actions = \["git_push"\]/u);
	assert.match(mainRunsIntent, /headSha/u);
	assert.match(publishRunsIntent, /"publish-npm\.yml"/u);
	assert.match(releaseIntent, /"v2\.121\.0"/u);
});
