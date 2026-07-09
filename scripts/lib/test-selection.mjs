export function createTestSelection(allCliTests) {
	const checkTests = [
		'check.test.js',
		'check-command-contracts.test.js',
		'check-config-validation.test.js',
		'check-doc-authority.test.js',
		'check-skill-contracts.test.js',
		'check-source-anchors.test.js',
		'check-versioning.test.js',
	];

	const explainTests = [
		'explain-authority.test.js',
		'explain-command.test.js',
		'explain-retention-asset.test.js',
		'explain-skills.test.js',
		'explain-source-anchor.test.js',
		'explain-surface.test.js',
		'explain-verify.test.js',
	];

	const localIndexTests = [
		'index-dry-run.test.js',
		'index-workflow.test.js',
		'index-verification-evidence.test.js',
		'index-source-anchors.test.js',
		'search.test.js',
		'search-backends.test.js',
		'search-index-state.test.js',
		'search-output.test.js',
		'search-source-scope.test.js',
	];

	const indexTests = ['index-workflow.test.js', 'index-verification-evidence.test.js', 'index-source-anchors.test.js'];
	const versioningTests = ['check-versioning.test.js', 'version-sources.test.js'];
	const runTests = [
		'run-execution.test.js',
		'run-preview.test.js',
		'run-receipts.test.js',
		'run-safety.test.js',
	];
	const dashboardTests = [
		'dashboard-preferences.test.js',
		'dashboard-rendering.test.js',
		'dashboard-safety.test.js',
		'dashboard-verification.test.js',
	];
	const testSelectionTests = ['test-selection-related-contracts.test.js', 'test-selection-runner-contracts.test.js'];
	const commandContractTests = ['check-command-contracts.test.js', ...runTests];
	const sourceAnchorTests = [
		'check-source-anchors.test.js',
		'explain-source-anchor.test.js',
		'index-source-anchors.test.js',
		'search-source-scope.test.js',
	];
	const schemaSmokeTests = [
		'schema-api-workspace-contracts.test.js',
		'schema-cli-output-contracts.test.js',
		'schema-command-contracts.test.js',
		'schema-docs-workflow-contracts.test.js',
		'schema-explain-verify-output.test.js',
		'schema-manifest-contracts.test.js',
		'schema-script-pack-code-contracts.test.js',
		'schema-script-pack-repo-contracts.test.js',
	];
	const packageContractTests = [
		'package-command-contracts.test.js',
		'package-metadata-contracts.test.js',
		'package-release-workflow-contracts.test.js',
		'package-template-skill-contracts.test.js',
	];
	const scriptPackContractTests = [
		'script-pack-catalog-contracts.test.js',
		'script-pack-code-boundary-contracts.test.js',
		'script-pack-code-change-contracts.test.js',
		'script-pack-code-outline-contracts.test.js',
		'script-pack-code-symbol-read-contracts.test.js',
		'script-pack-docs-contracts.test.js',
		'script-pack-repo-security-contracts.test.js',
		'script-pack-repo-surface-contracts.test.js',
		'script-pack-route-related-contracts.test.js',
		'script-pack-suggest-code-contracts.test.js',
		'script-pack-suggest-repo-contracts.test.js',
		'script-pack-suggest-safety-contracts.test.js',
		'script-pack-test-tool-contracts.test.js',
		'script-pack-text-generated-contracts.test.js',
	];
	const codeOutlineContractTests = [...scriptPackContractTests, ...schemaSmokeTests];
	const routerSmokeTests = ['router.test.js'];
	const verifyCompletionVerdictTests = [
		'verify-completion-verdict-core-contracts.test.js',
		'verify-completion-verdict-evidence-contracts.test.js',
		'verify-completion-verdict-ratchet-contracts.test.js',
		'verify-completion-verdict-repeated-failure-contracts.test.js',
	];
	const verifyTests = [
		'verify.test.js',
		'verify-inputs.test.js',
		'verify-changed.test.js',
		...verifyCompletionVerdictTests,
		'verify-plan-scheduler.test.js',
	];
	const verificationPlanningTests = [
		'verify.test.js',
		'verify-changed.test.js',
		'verify-plan-scheduler.test.js',
		'explain-verify.test.js',
		'schema-explain-verify-output.test.js',
	];

	const fastCommandSurfaceTests = [
		'adapters.test.js',
		'classify.test.js',
		'evidence.test.js',
		'impact.test.js',
		'handoff.test.js',
		'next.test.js',
		'onboard.test.js',
		'router.test.js',
		'status.test.js',
		'version-sources.test.js',
		'workspace.test.js',
	];

	const fastWorkflowContractTests = [
		'docs.test.js',
		'authoring-fixtures.test.js',
		'authoring-skill-contracts.test.js',
		'i18n-architecture.test.js',
		'pages-workflow.test.js',
	];

	const fastHarnessSafetyTests = [
		'index-dry-run.test.js',
		...indexTests,
		'security-fuzz.test.js',
		'test-audit.test.js',
		...testSelectionTests,
	];

	const fastTests = [...fastCommandSurfaceTests, ...fastWorkflowContractTests, ...fastHarnessSafetyTests];
	const releaseTests = [...packageContractTests, 'package-template.test.js'];
	const cliTests = allCliTests.filter((name) => !releaseTests.includes(name));
	const coverageTests = fastTests;
	const inProcessCliTests = new Set(['check.test.js', 'contract-lint.test.js', 'next.test.js', 'onboard.test.js', ...verifyTests]);
	const envSensitiveInProcessCliTests = new Set(['verify-plan-scheduler.test.js']);
	const commandTestNames = new Set(allCliTests);
	const commandRelatedTests = new Map([
		['adapters', ['adapters.test.js', ...schemaSmokeTests]],
		['check', [...checkTests, ...schemaSmokeTests]],
		['classify', ['classify.test.js', ...schemaSmokeTests]],
		['context', ['context.test.js', ...schemaSmokeTests]],
		['contract-lint', ['contract-lint.test.js', ...schemaSmokeTests]],
		['dashboard', [...dashboardTests, ...schemaSmokeTests]],
		['docs', ['docs.test.js']],
		['doctor', ['doctor.test.js', ...schemaSmokeTests]],
		['explain', explainTests],
		['explain-verify', ['explain-verify.test.js', ...schemaSmokeTests]],
		['handoff', ['handoff.test.js', ...schemaSmokeTests]],
		['help', [...routerSmokeTests]],
		['impact', ['impact.test.js', ...schemaSmokeTests]],
		['index', ['index-dry-run.test.js', ...indexTests]],
		['init', ['init.test.js', 'init-default-template.test.js', 'workflow.test.js']],
		['line-endings', ['line-endings.test.js', ...schemaSmokeTests]],
		['map', ['map.test.js', 'workflow.test.js']],
		['next', ['next.test.js', ...schemaSmokeTests]],
		['evidence', ['evidence.test.js', ...schemaSmokeTests]],
		['onboard', ['onboard.test.js', 'contract-lint.test.js', ...schemaSmokeTests]],
		['workspace', ['workspace.test.js', ...schemaSmokeTests]],
		['run', [...runTests, ...schemaSmokeTests]],
		['search', ['search.test.js', 'search-backends.test.js', 'search-index-state.test.js', 'search-output.test.js', 'search-source-scope.test.js']],
		['status', ['status.test.js']],
		['update', ['update.test.js']],
		['upgrade', ['upgrade.test.js', 'update.test.js', ...routerSmokeTests]],
		['verify', [...verifyTests, 'explain-verify.test.js', ...schemaSmokeTests]],
		['version', [...routerSmokeTests]],
		['version-sources', ['version-sources.test.js', ...schemaSmokeTests]],
	]);

	const relatedRules = [
		{ match: /^schemas\//u, tests: schemaSmokeTests },
		{ match: /^templates\/default\/locales\/en\/\.mustflow\/skills\//u, tests: ['authoring-skill-contracts.test.js'] },
		{ match: /^templates\//u, tests: ['init.test.js', 'init-default-template.test.js', 'update.test.js', 'package-template.test.js'] },
		{ match: /^package\.json$/u, tests: [...packageContractTests, 'package-template.test.js', ...versioningTests] },
		{ match: /^tests\/fixtures\/authoring\//u, tests: ['authoring-fixtures.test.js'] },
		{ match: /^\.mustflow\/skills\//u, tests: ['authoring-skill-contracts.test.js'] },
		{ match: /^\.mustflow\/skills\/(readme-authoring|project-context-authoring)\//u, tests: ['authoring-fixtures.test.js'] },
		{ match: /^scripts\/run-cli-tests\.mjs$/u, tests: testSelectionTests },
		{ match: /^scripts\/audit-related-selection\.mjs$/u, tests: testSelectionTests },
		{ match: /^scripts\/analyze-test-ops\.mjs$/u, tests: ['test-ops-profiler.test.js'] },
		{ match: /^scripts\/lib\/build-freshness\.mjs$/u, tests: testSelectionTests },
		{ match: /^scripts\/lib\/test-selection\.mjs$/u, tests: testSelectionTests },
		{ match: /^scripts\/lib\/test-ordering\.mjs$/u, tests: testSelectionTests },
		{ match: /^tools\/manifest-lock-accept\//u, tests: ['manifest-lock-accept-go.test.js'] },
		{ match: /^src\/cli\/index\.ts$/u, tests: ['router.test.js', 'workflow.test.js'] },
		{ match: /^src\/cli\/i18n\//u, tests: ['i18n-architecture.test.js', 'router.test.js', ...dashboardTests] },
		{
			match: /^src\/cli\/commands\/([^/]+)\.ts$/u,
			testsForMatch: ([, command]) => commandRelatedTests.get(command) ?? [`${command}.test.js`, 'router.test.js'],
		},
		{ match: /^src\/cli\/lib\/dashboard/u, tests: dashboardTests },
		{ match: /^src\/cli\/lib\/doc-review-ledger\.ts$/u, tests: ['docs.test.js', ...dashboardTests] },
		{ match: /^src\/cli\/lib\/local-index\.ts$/u, tests: [...localIndexTests, 'explain-command.test.js', 'explain-surface.test.js'] },
		{ match: /^src\/cli\/lib\/npm-version-check\.ts$/u, tests: ['router.test.js'] },
		{
			match: /^src\/cli\/lib\/option-parser\.ts$/u,
			tests: [
				'option-parser.test.js',
				'router.test.js',
				...runTests,
				'adapters.test.js',
				'check.test.js',
				'classify.test.js',
				'status.test.js',
				'doctor.test.js',
				'context.test.js',
				'contract-lint.test.js',
				...explainTests,
				'handoff.test.js',
				'impact.test.js',
				'index-dry-run.test.js',
				...indexTests,
				'line-endings.test.js',
				'map.test.js',
				'next.test.js',
				'onboard.test.js',
				'search.test.js',
				'search-backends.test.js',
				'search-index-state.test.js',
				'search-output.test.js',
				'search-source-scope.test.js',
				'update.test.js',
				'upgrade.test.js',
				...verifyTests,
				'version-sources.test.js',
				'workspace.test.js',
			],
		},
		{ match: /^src\/cli\/script-packs\/[^/]+\.ts$/u, tests: codeOutlineContractTests },
		{ match: /^src\/cli\/lib\/package-info\.ts$/u, tests: [...dashboardTests, 'router.test.js', ...runTests] },
		{ match: /^src\/cli\/lib\/command-registry\.ts$/u, tests: [...runTests, ...dashboardTests, 'router.test.js'] },
		{ match: /^src\/cli\/lib\/repo-map\.ts$/u, tests: ['map.test.js', 'workspace.test.js'] },
		{ match: /^src\/cli\/lib\/run-plan\.ts$/u, tests: [...runTests, ...schemaSmokeTests] },
		{ match: /^src\/cli\/lib\/run-receipt\.ts$/u, tests: [...runTests, ...dashboardTests, ...schemaSmokeTests] },
		{ match: /^src\/cli\/lib\/validation\.ts$/u, tests: [...checkTests, ...schemaSmokeTests] },
		{ match: /^src\/cli\/commands\/run\//u, tests: [...runTests, ...schemaSmokeTests] },
		{ match: /^src\/cli\/commands\/verify\//u, tests: [...verifyTests, 'explain-verify.test.js', ...schemaSmokeTests] },
		{ match: /^src\/cli\/lib\/template/u, tests: ['init.test.js', 'update.test.js'] },
		{ match: /^src\/cli\/lib\/root/u, tests: ['root-discovery.test.js'] },
		{ match: /^src\/cli\/lib\/schema/u, tests: schemaSmokeTests },
		{ match: /^src\/core\/command-intent-eligibility\.ts$/u, tests: [...runTests, ...verifyTests, 'security-fuzz.test.js', ...schemaSmokeTests] },
		{ match: /^src\/core\/command-classification\.ts$/u, tests: ['classify.test.js', 'impact.test.js', ...verifyTests, ...schemaSmokeTests] },
		{ match: /^src\/core\/command-contract-rules\.ts$/u, tests: ['check-command-contracts.test.js', ...runTests] },
		{ match: /^src\/core\/config-loading\.ts$/u, tests: ['check-config-validation.test.js', 'doctor.test.js', ...schemaSmokeTests] },
		{ match: /^src\/core\/contract-lint\.ts$/u, tests: ['contract-lint.test.js', ...schemaSmokeTests] },
		{ match: /^src\/core\/code-outline\.ts$/u, tests: codeOutlineContractTests },
		{ match: /^src\/core\/dependency-graph\.ts$/u, tests: codeOutlineContractTests },
		{ match: /^src\/core\/import-cycle\.ts$/u, tests: codeOutlineContractTests },
		{ match: /^src\/core\/module-boundary\.ts$/u, tests: codeOutlineContractTests },
		{ match: /^src\/core\/change-impact\.ts$/u, tests: codeOutlineContractTests },
		{ match: /^src\/core\/change-surface-classification\.ts$/u, tests: codeOutlineContractTests },
		{ match: /^src\/core\/export-diff\.ts$/u, tests: codeOutlineContractTests },
		{ match: /^src\/core\/reference-drift\.ts$/u, tests: codeOutlineContractTests },
		{ match: /^src\/core\/docs-link-integrity\.ts$/u, tests: codeOutlineContractTests },
		{ match: /^src\/core\/config-chain\.ts$/u, tests: codeOutlineContractTests },
		{ match: /^src\/core\/env-contract\.ts$/u, tests: codeOutlineContractTests },
		{ match: /^src\/core\/secret-risk-scan\.ts$/u, tests: codeOutlineContractTests },
		{ match: /^src\/core\/skill-route-audit\.ts$/u, tests: codeOutlineContractTests },
		{ match: /^src\/core\/repo-version-source\.ts$/u, tests: codeOutlineContractTests },
		{ match: /^src\/core\/repo-approval-gate\.ts$/u, tests: codeOutlineContractTests },
		{ match: /^src\/core\/repo-merge-conflict-scan\.ts$/u, tests: codeOutlineContractTests },
		{ match: /^src\/core\/repo-git-ignore-audit\.ts$/u, tests: codeOutlineContractTests },
		{ match: /^src\/core\/repo-manifest-lock-drift\.ts$/u, tests: codeOutlineContractTests },
		{ match: /^src\/core\/generated-boundary\.ts$/u, tests: codeOutlineContractTests },
		{ match: /^src\/core\/related-files\.ts$/u, tests: codeOutlineContractTests },
		{ match: /^src\/core\/test-performance-report\.ts$/u, tests: codeOutlineContractTests },
		{ match: /^src\/core\/test-regression-selector\.ts$/u, tests: codeOutlineContractTests },
		{ match: /^src\/core\/text-budget\.ts$/u, tests: codeOutlineContractTests },
		{ match: /^src\/core\/route-outline\.ts$/u, tests: codeOutlineContractTests },
		{ match: /^src\/core\/completion-verdict\.ts$/u, tests: verifyCompletionVerdictTests },
		{ match: /^src\/core\/dashboard-verification\.ts$/u, tests: ['dashboard-verification.test.js', 'verify.test.js', ...verifyCompletionVerdictTests, ...schemaSmokeTests] },
		{ match: /^src\/core\/doc-review-triage\.ts$/u, tests: ['docs.test.js', ...dashboardTests, ...schemaSmokeTests] },
		{ match: /^src\/core\/change-classification\.ts$/u, tests: ['classify.test.js', ...verifyTests, 'explain-surface.test.js', 'explain-verify.test.js', ...schemaSmokeTests] },
		{ match: /^src\/core\/change-verification\.ts$/u, tests: verificationPlanningTests },
		{ match: /^src\/core\/adapter-compatibility\.ts$/u, tests: ['adapters.test.js', ...schemaSmokeTests] },
		{ match: /^src\/core\/contract-models\.ts$/u, tests: ['check-command-contracts.test.js', ...schemaSmokeTests] },
		{ match: /^src\/core\/(release-version-validation|version-impact|version-sources|version-sync-policy)\.ts$/u, tests: versioningTests },
		{ match: /^src\/core\/handoff-record\.ts$/u, tests: ['handoff.test.js', ...schemaSmokeTests] },
		{ match: /^src\/core\/authority-resolution\.ts$/u, tests: ['check-doc-authority.test.js', 'explain-authority.test.js'] },
		{ match: /^src\/core\/check-issues\.ts$/u, tests: ['check.test.js', ...schemaSmokeTests] },
		{ match: /^src\/core\/public-json-contracts\.ts$/u, tests: schemaSmokeTests },
		{ match: /^src\/core\/script-pack-suggestions\.ts$/u, tests: codeOutlineContractTests },
		{ match: /^src\/core\/public-surface-explanation\.ts$/u, tests: ['explain-surface.test.js'] },
		{ match: /^src\/core\/command-effects\.ts$/u, tests: ['check-command-contracts.test.js', 'explain-command.test.js', 'index-workflow.test.js', ...runTests] },
		{ match: /^src\/core\/command-explanation\.ts$/u, tests: ['explain-command.test.js', 'explain-retention-asset.test.js'] },
		{ match: /^src\/core\/retention-(explanation|policy)\.ts$/u, tests: ['explain-retention-asset.test.js'] },
		{ match: /^src\/core\/command-cwd\.ts$/u, tests: runTests },
		{ match: /^src\/core\/command-contract-validation\.ts$/u, tests: commandContractTests },
		{ match: /^src\/core\/repeated-failure\.ts$/u, tests: ['verify-completion-verdict-repeated-failure-contracts.test.js'] },
		{ match: /^src\/core\/validation-ratchet\.ts$/u, tests: ['verify-completion-verdict-ratchet-contracts.test.js'] },
		{ match: /^src\/core\/verification-plan\.ts$/u, tests: verificationPlanningTests },
		{ match: /^src\/core\/verification-decision-graph\.ts$/u, tests: ['verify.test.js', ...verifyCompletionVerdictTests, 'dashboard-verification.test.js', ...schemaSmokeTests] },
		{ match: /^src\/core\/verification-scheduler\.ts$/u, tests: ['verify-plan-scheduler.test.js', ...runTests] },
		{ match: /^src\/core\/skill-route-(alignment|explanation)\.ts$/u, tests: ['check-skill-contracts.test.js', 'explain-skills.test.js'] },
		{ match: /^src\/core\/source-anchor-(explanation|validation)\.ts$/u, tests: ['check-source-anchors.test.js', 'explain-source-anchor.test.js'] },
		{ match: /^src\/core\/source-anchor-status\.ts$/u, tests: ['index-source-anchors.test.js', 'search-source-scope.test.js'] },
		{ match: /^src\/core\/source-anchor-symbols\.ts$/u, tests: ['index-source-anchors.test.js', 'search-source-scope.test.js', 'check-source-anchors.test.js'] },
		{ match: /^src\/core\/source-anchors\.ts$/u, tests: sourceAnchorTests },
		{ match: /^src\/core\/surface-decision-model\.ts$/u, tests: ['explain-surface.test.js', 'verify.test.js', 'verify-plan-scheduler.test.js', ...schemaSmokeTests] },
		{ match: /^src\/core\/toml\.ts$/u, tests: ['check-config-validation.test.js', 'contract-lint.test.js', ...runTests] },
		{ match: /^src\/core\/line-endings\.ts$/u, tests: ['line-endings.test.js'] },
		{ match: /^scripts\/audit-tests\.mjs$/u, tests: ['test-audit.test.js'] },
		{ match: /^tests\/cli\/helpers\/cli-harness\.js$/u, tests: cliTests },
		{ match: /^tests\/cli\/helpers\/ops-profiler\.js$/u, tests: ['test-ops-profiler.test.js'] },
		{ match: /^tests\/cli\/helpers\/test-selection-contracts\.js$/u, tests: testSelectionTests },
		{ match: /^tests\/cli\/helpers\/local-index-fixtures\.js$/u, tests: localIndexTests },
		{ match: /^tests\/cli\/index-support\.js$/u, tests: indexTests },
		{ match: /^tests\/cli\/index\.test\.js$/u, tests: indexTests },
		{ match: /^tests\/cli\/run-support\.js$/u, tests: runTests },
		{ match: /^tests\/cli\/run\.test\.js$/u, tests: runTests },
		{ match: /^tests\/cli\/dashboard-support\.js$/u, tests: dashboardTests },
		{ match: /^tests\/cli\/dashboard\.test\.js$/u, tests: dashboardTests },
		{ match: /^tests\/cli\/([^/]+\.test\.js)$/u, testsForMatch: ([, testName]) => [testName] },
		{
			match: /^\.mustflow\/config\/commands\.toml$/u,
			tests: [
				'check-config-validation.test.js',
				'check-command-contracts.test.js',
				'explain-command.test.js',
				'index-workflow.test.js',
				...runTests,
				...verifyTests,
				'schema-command-contracts.test.js',
			],
		},
		{ match: /^\.mustflow\/config\/mustflow\.toml$/u, tests: ['check-config-validation.test.js', 'doctor.test.js'] },
		{ match: /^\.mustflow\/config\/preferences\.toml$/u, tests: ['check-versioning.test.js', 'version-sources.test.js'] },
		{ match: /^docs-site\//u, tests: ['docs.test.js'] },
		{ match: /\.(md|mdx)$/u, tests: ['docs.test.js'] },
	];

	const unsafeRelatedFallbackRules = [
		{
			match: /^(bun|package-lock|pnpm-lock|yarn)\.lock$/u,
			category: 'dependency_lockfile',
		},
		{
			match: /^tsconfig(?:\..*)?\.json$/u,
			category: 'compiler_config',
		},
		{
			match: /^node:test(?:\..*)?\.json$/u,
			category: 'test_runner_config',
		},
		{
			match: /^tests\/fixtures\//u,
			category: 'shared_fixture',
		},
		{
			match: /^tests\/cli\/helpers\//u,
			category: 'shared_test_helper',
		},
		{
			match: /^src\/core\/[^/]+\.ts$/u,
			category: 'unmapped_core_source',
		},
		{
			match: /^src\/cli\/lib\/[^/]+\.ts$/u,
			category: 'unmapped_cli_library_source',
		},
		{
			match: /^\.github\/workflows\//u,
			category: 'ci_workflow',
		},
		{
			match: /^\.mustflow\/config\/[^/]+\.toml$/u,
			category: 'mustflow_config',
		},
	];

	const relatedReleaseRules = [
		/^package\.json$/u,
		/^schemas\//u,
		/^templates\//u,
		/^src\/core\/contract-models\.ts$/u,
		/^src\/core\/public-json-contracts\.ts$/u,
		/^src\/core\/(release-version-validation|version-impact|version-sources|version-sync-policy)\.ts$/u,
		/^src\/cli\/lib\/package-info\.ts$/u,
		/^src\/cli\/lib\/template/u,
		/^\.mustflow\/config\/commands\.toml$/u,
	];

	function uniqueExisting(testNames) {
		return [...new Set(testNames)].filter((name) => commandTestNames.has(name));
	}

	function ruleLabel(rule) {
		return rule.match.source;
	}

	function testsForRelatedRule(rule, match) {
		return uniqueExisting(rule.testsForMatch ? rule.testsForMatch(match) : rule.tests);
	}

	function unsafeRelatedFallbackForFile(file) {
		return unsafeRelatedFallbackRules.find((rule) => rule.match.test(file));
	}

	function relatedReleaseReasonsForFiles(files) {
		const reasons = [];

		for (const file of files) {
			for (const rule of relatedReleaseRules) {
				if (!rule.test(file)) {
					continue;
				}

				reasons.push({
					changed_file: file,
					reason: 'release_sensitive',
					rule: rule.source,
					tests: [],
					note: 'release-sensitive change; run test_release before publishing or committing release metadata',
				});
				break;
			}
		}

		return reasons;
	}

	function relatedSelectionForFiles(files, options = {}) {
		const fallbackTests = options.fallbackTests ?? fastTests;
		const selectedTests = new Set();
		const selectionReasons = [];
		const unmatchedFiles = [];

		for (const file of files) {
			let matchedRule = false;

			for (const rule of relatedRules) {
				const match = rule.match.exec(file);
				if (!match) {
					continue;
				}

				const tests = testsForRelatedRule(rule, match);
				if (tests.length === 0) {
					continue;
				}

				matchedRule = true;
				for (const testName of tests) {
					selectedTests.add(testName);
				}

				selectionReasons.push({
					changed_file: file,
					reason: 'related_rule',
					rule: ruleLabel(rule),
					tests,
					note: 'changed file matched a related-test rule',
				});
			}

			if (!matchedRule) {
				unmatchedFiles.push(file);
			}
		}

		const unsafeFallbackReasons = [];
		for (const file of unmatchedFiles) {
			const unsafeFallback = unsafeRelatedFallbackForFile(file);
			if (!unsafeFallback) {
				continue;
			}

			for (const testName of allCliTests) {
				selectedTests.add(testName);
			}

			unsafeFallbackReasons.push({
				changed_file: file,
				reason: 'fallback_full_tests',
				rule: unsafeFallback.match.source,
				category: unsafeFallback.category,
				tests: allCliTests,
				note: 'unmatched safety-sensitive change; using the full CLI suite fallback',
			});
		}

		if (selectedTests.size > 0) {
			return {
				selected: [...selectedTests],
				selection_reasons: [...selectionReasons, ...unsafeFallbackReasons],
			};
		}

		const fallbackSelected = uniqueExisting(fallbackTests);
		if (fallbackSelected.length > 0) {
			return {
				selected: fallbackSelected,
				selection_reasons: [
					{
						changed_file: null,
						reason: 'fallback_fast_tests',
						rule: 'default_fast_tests',
						tests: fallbackSelected,
						note: 'no related-test rule matched; using the fast baseline fallback',
					},
				],
			};
		}

		return {
			selected: [],
			selection_reasons: [
				{
					changed_file: null,
					reason: files.length === 0 ? 'no_changed_files' : 'no_related_rule_match',
					rule: null,
					tests: [],
					note: files.length === 0 ? 'no changed files and fallback is disabled' : 'no related-test rule matched and fallback is disabled',
				},
			],
		};
	}

	function relatedTestsForFiles(files, options = {}) {
		return relatedSelectionForFiles(files, options).selected;
	}

	function selectedTestsForMode(testMode, files) {
		const modeSuites = suitesForChangedFiles(files);
		return modeSuites[testMode];
	}

	function suitesForChangedFiles(files) {
		return {
			fast: fastTests,
			'fast-cached': fastTests,
			'fast-profile': fastTests,
			related: relatedTestsForFiles(files),
			'related-cached': relatedTestsForFiles(files),
			'related-profile': relatedTestsForFiles(files, { fallbackTests: [] }),
			cli: cliTests,
			coverage: coverageTests,
			release: releaseTests,
			full: allCliTests,
			'full-auto': allCliTests,
			'full-profile': allCliTests,
		};
	}

	function hasRelatedReleaseChangesForFiles(files) {
		return files.some((file) => relatedReleaseRules.some((rule) => rule.test(file)));
	}

	function selectionReportForMode(testMode, files) {
		const selectedForMode = selectedTestsForMode(testMode, files);

		if (!selectedForMode) {
			return undefined;
		}

		const baseTestMode = testMode.replace(/-(?:cached|profile|auto)$/u, '');
		const relatedSelection = baseTestMode === 'related' ? relatedSelectionForFiles(files, testMode.endsWith('-profile') ? { fallbackTests: [] } : {}) : undefined;
		const releaseReasons = baseTestMode === 'related' ? relatedReleaseReasonsForFiles(files) : [];
		return {
			mode: testMode,
			changed_files: files,
			selected: uniqueExisting(selectedForMode),
			release_sensitive: releaseReasons.length > 0,
			selection_reasons: relatedSelection ? [...relatedSelection.selection_reasons, ...releaseReasons] : [],
		};
	}

	function summarizeRelatedSelectionReasons(reasons) {
		const relatedRuleReasons = reasons.filter((reason) => reason.reason === 'related_rule');
		const fallbackReason = reasons.find((reason) => reason.reason === 'fallback_fast_tests');
		const fullFallbackReasons = reasons.filter((reason) => reason.reason === 'fallback_full_tests');
		const disabledReason = reasons.find((reason) => reason.reason === 'no_changed_files' || reason.reason === 'no_related_rule_match');
		const releaseSensitiveReasons = reasons.filter((reason) => reason.reason === 'release_sensitive');
		const parts = [];

		if (relatedRuleReasons.length > 0) {
			const changedFileCount = new Set(relatedRuleReasons.map((reason) => reason.changed_file)).size;
			const ruleCount = new Set(relatedRuleReasons.map((reason) => reason.rule)).size;
			parts.push(`${changedFileCount} changed file(s) matched ${ruleCount} related rule(s)`);
		} else if (fallbackReason) {
			parts.push('no related rules matched; using fast baseline fallback');
		} else if (disabledReason) {
			parts.push(disabledReason.note);
		}

		if (fullFallbackReasons.length > 0) {
			const categories = [...new Set(fullFallbackReasons.map((reason) => reason.category))].sort();
			parts.push(`${fullFallbackReasons.length} safety-sensitive unmatched change(s) widened to full suite (${categories.join(', ')})`);
		}

		if (releaseSensitiveReasons.length > 0) {
			parts.push(`${releaseSensitiveReasons.length} release-sensitive change(s)`);
		}

		return parts.length > 0 ? parts.join('; ') : 'static suite selection';
	}

	return {
		allCliTests,
		checkTests,
		cliTests,
		coverageTests,
		dashboardTests,
		envSensitiveInProcessCliTests,
		fastTests,
		hasRelatedReleaseChangesForFiles,
		inProcessCliTests,
		indexTests,
		releaseTests,
		runTests,
		selectionReportForMode,
		selectedTestsForMode,
		suitesForChangedFiles,
		summarizeRelatedSelectionReasons,
	};
}
