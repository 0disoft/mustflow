import { existsSync } from 'node:fs';

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

const CODE_OUTLINE_LANGUAGE_NAMES = ['TypeScript', 'JavaScript', 'Astro', 'Svelte', 'Go', 'Rust', 'Python'];

test('code-outline public summaries cover every supported language family', () => {
	const sourceFiles = [
		'src/cli/i18n/en.ts',
		'src/cli/i18n/es.ts',
		'src/cli/i18n/fr.ts',
		'src/cli/i18n/hi.ts',
		'src/cli/i18n/ko.ts',
		'src/cli/i18n/zh.ts',
	];

	for (const sourceFile of sourceFiles) {
		const source = readFileSync(sourceFile, 'utf8');
		const summary = source.match(/"scriptPack\.script\.codeOutline\.summary":\s*"([^"]+)"/u)?.[1] ?? '';
		const help = source.match(/"codeOutline\.help\.summary":\s*"([^"]+)"/u)?.[1] ?? '';

		for (const language of CODE_OUTLINE_LANGUAGE_NAMES) {
			assert.match(summary, new RegExp(`\\b${language}\\b`, 'u'), `${sourceFile} catalog summary omits ${language}`);
			assert.match(help, new RegExp(`\\b${language}\\b`, 'u'), `${sourceFile} help summary omits ${language}`);
		}
	}

	const schema = JSON.parse(readFileSync('schemas/code-outline-report.schema.json', 'utf8'));
	assert.deepEqual(schema.$defs.language.enum, [
		'typescript',
		'tsx',
		'javascript',
		'jsx',
		'javascript-module',
		'javascript-commonjs',
		'astro',
		'svelte',
		'go',
		'rust',
		'python',
	]);

	const docs = readFileSync('docs-site/src/content/docs/en/commands/script-pack.md', 'utf8');
	for (const extension of ['.ts', '.tsx', '.mts', '.cts', '.js', '.jsx', '.mjs', '.cjs', '.astro', '.svelte', '.go', '.rs', '.py']) {
		assert.ok(docs.includes(`\`${extension}\``), `script-pack docs omit ${extension}`);
	}
});

test('script-pack catalog exposes routing metadata for agent script selection', () => {
	const projectPath = createTempProject();

	try {
		initProject(projectPath);
		const result = runCli(projectPath, ['script-pack', 'list', '--json']);

		assert.equal(result.status, 0, result.stderr || result.stdout);
		const report = JSON.parse(result.stdout);
		const codePack = report.packs.find((pack) => pack.id === 'code');
		const codeOutline = codePack?.scripts.find((script) => script.ref === 'code/outline');

		assert.ok(codeOutline, 'code/outline should be listed');
		assert.equal(codeOutline.read_only, true);
		assert.equal(codeOutline.mutates, false);
		assert.equal(codeOutline.network, false);
		assert.deepEqual(codeOutline.safety_contract, {
			authority_class: 'advisory_evidence',
			execution_mode: 'suggestion_only',
			command_authority: 'requires_configured_intent',
			run_hint_authority: 'not_authority',
			input_scope: 'explicit_or_changed_paths',
			output_scope: 'bounded_report',
			cannot_satisfy_intents: ['build', 'lint', 'test', 'typecheck', 'docs_validate', 'release'],
			forbidden_actions: ['raw_shell', 'git_write', 'package_install', 'network_publish', 'secret_read'],
		});
		assert.deepEqual(codeOutline.phases, ['before_change', 'during_change', 'review']);
		assert.ok(codeOutline.use_when.some((hint) => hint.includes('symbol headers')));
		assert.ok(codeOutline.inputs.includes('max_files'));
		assert.ok(codeOutline.outputs.includes('symbol_outline'));
		assert.ok(codeOutline.outputs.includes('source_anchors'));
		assert.ok(codeOutline.related_skills.includes('codebase-orientation'));
		assert.equal(codeOutline.risk_level, 'low');
		assert.equal(codeOutline.cost, 'low');
		assert.equal(codeOutline.report_schema_file, 'code-outline-report.schema.json');

		const dependencyGraph = codePack?.scripts.find((script) => script.ref === 'code/dependency-graph');

		assert.ok(dependencyGraph, 'code/dependency-graph should be listed');
		assert.equal(dependencyGraph.read_only, true);
		assert.equal(dependencyGraph.mutates, false);
		assert.equal(dependencyGraph.network, false);
		assert.deepEqual(dependencyGraph.phases, ['before_change', 'during_change', 'review']);
		assert.ok(dependencyGraph.use_when.some((hint) => hint.includes('dependency graph')));
		assert.ok(dependencyGraph.inputs.includes('max_depth'));
		assert.ok(dependencyGraph.inputs.includes('max_edges'));
		assert.ok(dependencyGraph.outputs.includes('dependency_graph'));
		assert.ok(dependencyGraph.outputs.includes('cycle_hints'));
		assert.ok(dependencyGraph.related_skills.includes('change-blast-radius-review'));
		assert.equal(dependencyGraph.risk_level, 'low');
		assert.equal(dependencyGraph.cost, 'low');
		assert.equal(dependencyGraph.report_schema_file, 'dependency-graph-report.schema.json');

		const importCycle = codePack?.scripts.find((script) => script.ref === 'code/import-cycle');

		assert.ok(importCycle, 'code/import-cycle should be listed');
		assert.equal(importCycle.read_only, true);
		assert.equal(importCycle.mutates, false);
		assert.equal(importCycle.network, false);
		assert.deepEqual(importCycle.phases, ['before_change', 'after_change', 'review']);
		assert.ok(importCycle.use_when.some((hint) => hint.includes('import cycles')));
		assert.ok(importCycle.inputs.includes('max_cycles'));
		assert.ok(importCycle.outputs.includes('import_cycles'));
		assert.ok(importCycle.outputs.includes('cycle_edge_evidence'));
		assert.ok(importCycle.related_skills.includes('module-boundary-review'));
		assert.equal(importCycle.risk_level, 'low');
		assert.equal(importCycle.cost, 'low');
		assert.equal(importCycle.report_schema_file, 'import-cycle-report.schema.json');

		const moduleBoundary = codePack?.scripts.find((script) => script.ref === 'code/module-boundary');

		assert.ok(moduleBoundary, 'code/module-boundary should be listed');
		assert.equal(moduleBoundary.read_only, true);
		assert.equal(moduleBoundary.mutates, false);
		assert.equal(moduleBoundary.network, false);
		assert.deepEqual(moduleBoundary.phases, ['before_change', 'after_change', 'review']);
		assert.ok(moduleBoundary.use_when.some((hint) => hint.includes('module boundary rules')));
		assert.ok(moduleBoundary.inputs.includes('config_path'));
		assert.ok(moduleBoundary.inputs.includes('max_cycles'));
		assert.ok(moduleBoundary.outputs.includes('module_boundary_findings'));
		assert.ok(moduleBoundary.outputs.includes('shared_budget_metrics'));
		assert.ok(moduleBoundary.related_skills.includes('module-boundary-review'));
		assert.equal(moduleBoundary.risk_level, 'low');
		assert.equal(moduleBoundary.cost, 'low');
		assert.equal(moduleBoundary.report_schema_file, 'module-boundary-report.schema.json');

		const changeImpact = codePack?.scripts.find((script) => script.ref === 'code/change-impact');

		assert.ok(changeImpact, 'code/change-impact should be listed');
		assert.equal(changeImpact.read_only, true);
		assert.equal(changeImpact.mutates, false);
		assert.equal(changeImpact.network, false);
		assert.deepEqual(changeImpact.phases, ['after_change', 'review']);
		assert.ok(changeImpact.use_when.some((hint) => hint.includes('git changes')));
		assert.ok(changeImpact.inputs.includes('base_ref'));
		assert.ok(changeImpact.inputs.includes('max_impacts'));
		assert.ok(changeImpact.outputs.includes('impact_candidates'));
		assert.ok(changeImpact.outputs.includes('script_hints'));
		assert.ok(changeImpact.outputs.includes('verification_hints'));
		assert.ok(changeImpact.related_skills.includes('public-json-contract-change'));
		assert.equal(changeImpact.risk_level, 'low');
		assert.equal(changeImpact.cost, 'low');
		assert.equal(changeImpact.report_schema_file, 'change-impact-report.schema.json');

		const codeSymbolRead = codePack?.scripts.find((script) => script.ref === 'code/symbol-read');

		assert.ok(codeSymbolRead, 'code/symbol-read should be listed');
		assert.match(codeSymbolRead.usage, /--anchor <id>/u);
		assert.equal(codeSymbolRead.read_only, true);
		assert.equal(codeSymbolRead.mutates, false);
		assert.equal(codeSymbolRead.network, false);
		assert.deepEqual(codeSymbolRead.phases, ['before_change', 'during_change', 'review']);
		assert.ok(codeSymbolRead.inputs.includes('anchor_id'));
		assert.ok(codeSymbolRead.inputs.includes('start_line'));
		assert.ok(codeSymbolRead.outputs.includes('source_snippet'));
		assert.ok(codeSymbolRead.related_skills.includes('typescript-code-change'));
		assert.equal(codeSymbolRead.risk_level, 'low');
		assert.equal(codeSymbolRead.cost, 'low');
		assert.equal(codeSymbolRead.report_schema_file, 'code-symbol-read-report.schema.json');

		const codeRouteOutline = codePack?.scripts.find((script) => script.ref === 'code/route-outline');

		assert.ok(codeRouteOutline, 'code/route-outline should be listed');
		assert.equal(codeRouteOutline.read_only, true);
		assert.equal(codeRouteOutline.mutates, false);
		assert.equal(codeRouteOutline.network, false);
		assert.deepEqual(codeRouteOutline.phases, ['before_change', 'during_change', 'after_change', 'review']);
		assert.ok(codeRouteOutline.use_when.some((hint) => hint.includes('Hono, Elysia, Axum, and NestJS')));
		assert.ok(codeRouteOutline.inputs.includes('max_files'));
		assert.ok(codeRouteOutline.outputs.includes('route_outline'));
		assert.ok(codeRouteOutline.outputs.includes('route_lifecycle'));
		assert.ok(codeRouteOutline.related_skills.includes('axum-code-change'));
		assert.ok(codeRouteOutline.related_skills.includes('nestjs-code-change'));
		assert.ok(codeRouteOutline.related_skills.includes('hono-code-change'));
		assert.ok(codeRouteOutline.related_skills.includes('elysia-code-change'));
		assert.equal(codeRouteOutline.risk_level, 'low');
		assert.equal(codeRouteOutline.cost, 'low');
		assert.equal(codeRouteOutline.report_schema_file, 'route-outline-report.schema.json');

		const codeExportDiff = codePack?.scripts.find((script) => script.ref === 'code/export-diff');

		assert.ok(codeExportDiff, 'code/export-diff should be listed');
		assert.match(codeExportDiff.usage, /compare/u);
		assert.equal(codeExportDiff.read_only, true);
		assert.equal(codeExportDiff.mutates, false);
		assert.equal(codeExportDiff.network, false);
		assert.deepEqual(codeExportDiff.phases, ['after_change', 'review']);
		assert.ok(codeExportDiff.inputs.includes('base_ref'));
		assert.ok(codeExportDiff.inputs.includes('head_ref'));
		assert.ok(codeExportDiff.outputs.includes('export_diff'));
		assert.ok(codeExportDiff.outputs.includes('return_type_changes'));
		assert.ok(codeExportDiff.related_skills.includes('api-contract-change'));
		assert.equal(codeExportDiff.risk_level, 'low');
		assert.equal(codeExportDiff.cost, 'low');
		assert.equal(codeExportDiff.report_schema_file, 'export-diff-report.schema.json');

		const corePack = report.packs.find((pack) => pack.id === 'core');
		const textBudget = corePack?.scripts.find((script) => script.ref === 'core/text-budget');

		assert.ok(textBudget, 'core/text-budget should be listed');
		assert.equal(textBudget.read_only, true);
		assert.equal(textBudget.mutates, false);
		assert.equal(textBudget.network, false);
		assert.deepEqual(textBudget.phases, ['before_change', 'after_change', 'review']);
		assert.ok(textBudget.use_when.some((hint) => hint.includes('text budgets')));
		assert.ok(textBudget.inputs.includes('json_pointer'));
		assert.ok(textBudget.outputs.includes('json_report'));
		assert.ok(textBudget.related_skills.includes('docs-prose-review'));
		assert.equal(textBudget.risk_level, 'low');
		assert.equal(textBudget.cost, 'low');
		assert.equal(textBudget.report_schema_file, 'text-budget-report.schema.json');

		const docsPack = report.packs.find((pack) => pack.id === 'docs');
		const referenceDrift = docsPack?.scripts.find((script) => script.ref === 'docs/reference-drift');

		assert.ok(referenceDrift, 'docs/reference-drift should be listed');
		assert.equal(referenceDrift.read_only, true);
		assert.equal(referenceDrift.mutates, false);
		assert.equal(referenceDrift.network, false);
		assert.deepEqual(referenceDrift.phases, ['after_change', 'review']);
		assert.ok(referenceDrift.use_when.some((hint) => hint.includes('documentation references')));
		assert.ok(referenceDrift.inputs.includes('max_files'));
		assert.ok(referenceDrift.outputs.includes('reference_drift'));
		assert.ok(referenceDrift.related_skills.includes('public-json-contract-change'));
		assert.equal(referenceDrift.risk_level, 'low');
		assert.equal(referenceDrift.cost, 'low');
		assert.equal(referenceDrift.report_schema_file, 'reference-drift-report.schema.json');

		const linkIntegrity = docsPack?.scripts.find((script) => script.ref === 'docs/link-integrity');

		assert.ok(linkIntegrity, 'docs/link-integrity should be listed');
		assert.equal(linkIntegrity.read_only, true);
		assert.equal(linkIntegrity.mutates, false);
		assert.equal(linkIntegrity.network, false);
		assert.deepEqual(linkIntegrity.phases, ['after_change', 'review']);
		assert.ok(linkIntegrity.use_when.some((hint) => hint.includes('Markdown and MDX inline links')));
		assert.ok(linkIntegrity.inputs.includes('max_files'));
		assert.ok(linkIntegrity.outputs.includes('link_integrity'));
		assert.ok(linkIntegrity.related_skills.includes('docs-update'));
		assert.equal(linkIntegrity.risk_level, 'low');
		assert.equal(linkIntegrity.cost, 'low');
		assert.equal(linkIntegrity.report_schema_file, 'link-integrity-report.schema.json');

		const testPack = report.packs.find((pack) => pack.id === 'test');
		const testPerformanceReport = testPack?.scripts.find((script) => script.ref === 'test/performance-report');

		assert.ok(testPerformanceReport, 'test/performance-report should be listed');
		assert.equal(testPerformanceReport.read_only, true);
		assert.equal(testPerformanceReport.mutates, false);
		assert.equal(testPerformanceReport.network, false);
		assert.deepEqual(testPerformanceReport.phases, ['after_change', 'review']);
		assert.ok(testPerformanceReport.use_when.some((hint) => hint.includes('performance evidence')));
		assert.ok(testPerformanceReport.inputs.includes('max_samples'));
		assert.ok(testPerformanceReport.inputs.includes('max_test_files'));
		assert.ok(testPerformanceReport.outputs.includes('performance_samples'));
		assert.ok(testPerformanceReport.outputs.includes('phase_timings'));
		assert.ok(testPerformanceReport.outputs.includes('test_file_timings'));
		assert.ok(testPerformanceReport.related_skills.includes('test-suite-performance-review'));
		assert.equal(testPerformanceReport.risk_level, 'low');
		assert.equal(testPerformanceReport.cost, 'low');
		assert.equal(testPerformanceReport.report_schema_file, 'test-performance-report.schema.json');

		const testRegressionSelector = testPack?.scripts.find((script) => script.ref === 'test/regression-selector');

		assert.ok(testRegressionSelector, 'test/regression-selector should be listed');
		assert.equal(testRegressionSelector.read_only, true);
		assert.equal(testRegressionSelector.mutates, false);
		assert.equal(testRegressionSelector.network, false);
		assert.deepEqual(testRegressionSelector.phases, ['after_change', 'review']);
		assert.ok(testRegressionSelector.use_when.some((hint) => hint.includes('regression tests')));
		assert.ok(testRegressionSelector.inputs.includes('base_ref'));
		assert.ok(testRegressionSelector.inputs.includes('max_tests'));
		assert.ok(testRegressionSelector.outputs.includes('selected_tests'));
		assert.ok(testRegressionSelector.outputs.includes('fallbacks'));
		assert.ok(testRegressionSelector.related_skills.includes('test-suite-performance-review'));
		assert.ok(testRegressionSelector.related_skills.includes('test-maintenance'));
		assert.equal(testRegressionSelector.risk_level, 'low');
		assert.equal(testRegressionSelector.cost, 'low');
		assert.equal(testRegressionSelector.report_schema_file, 'test-regression-selector-report.schema.json');

		const repoPack = report.packs.find((pack) => pack.id === 'repo');
		const configChain = repoPack?.scripts.find((script) => script.ref === 'repo/config-chain');
		const envContract = repoPack?.scripts.find((script) => script.ref === 'repo/env-contract');
		const secretRiskScan = repoPack?.scripts.find((script) => script.ref === 'repo/secret-risk-scan');
		const securityPatternScan = repoPack?.scripts.find((script) => script.ref === 'repo/security-pattern-scan');
		const generatedBoundary = repoPack?.scripts.find((script) => script.ref === 'repo/generated-boundary');
		const mergeConflictScan = repoPack?.scripts.find((script) => script.ref === 'repo/merge-conflict-scan');
		const gitIgnoreAudit = repoPack?.scripts.find((script) => script.ref === 'repo/git-ignore-audit');
		const manifestLockDrift = repoPack?.scripts.find((script) => script.ref === 'repo/manifest-lock-drift');
		const versionSource = repoPack?.scripts.find((script) => script.ref === 'repo/version-source');
		const toolchainProvenance = repoPack?.scripts.find((script) => script.ref === 'repo/toolchain-provenance');
		const automationSurface = repoPack?.scripts.find((script) => script.ref === 'repo/automation-surface');
		const dependencySurface = repoPack?.scripts.find((script) => script.ref === 'repo/dependency-surface');
		const approvalGate = repoPack?.scripts.find((script) => script.ref === 'repo/approval-gate');
		const deploySurface = repoPack?.scripts.find((script) => script.ref === 'repo/deploy-surface');

		assert.ok(configChain, 'repo/config-chain should be listed');
		assert.equal(configChain.read_only, true);
		assert.equal(configChain.mutates, false);
		assert.equal(configChain.network, false);
		assert.deepEqual(configChain.phases, ['before_change', 'during_change', 'after_change', 'review']);
		assert.ok(configChain.use_when.some((hint) => hint.includes('tsconfig')));
		assert.ok(configChain.inputs.includes('max_configs'));
		assert.ok(configChain.outputs.includes('config_chain'));
		assert.ok(configChain.outputs.includes('config_edges'));
		assert.ok(configChain.related_skills.includes('typescript-code-change'));
		assert.equal(configChain.risk_level, 'low');
		assert.equal(configChain.cost, 'low');
		assert.equal(configChain.report_schema_file, 'config-chain-report.schema.json');

		assert.ok(envContract, 'repo/env-contract should be listed');
		assert.equal(envContract.read_only, true);
		assert.equal(envContract.mutates, false);
		assert.equal(envContract.network, false);
		assert.deepEqual(envContract.phases, ['before_change', 'during_change', 'after_change', 'review']);
		assert.ok(envContract.use_when.some((hint) => hint.includes('environment variable contract drift')));
		assert.ok(envContract.inputs.includes('max_keys'));
		assert.ok(envContract.outputs.includes('env_keys'));
		assert.ok(envContract.outputs.includes('env_contract_findings'));
		assert.ok(envContract.related_skills.includes('config-env-change'));
		assert.ok(envContract.related_skills.includes('security-privacy-review'));
		assert.equal(envContract.risk_level, 'low');
		assert.equal(envContract.cost, 'low');
		assert.equal(envContract.report_schema_file, 'env-contract-report.schema.json');

		assert.ok(secretRiskScan, 'repo/secret-risk-scan should be listed');
		assert.equal(secretRiskScan.read_only, true);
		assert.equal(secretRiskScan.mutates, false);
		assert.equal(secretRiskScan.network, false);
		assert.deepEqual(secretRiskScan.phases, ['before_change', 'during_change', 'after_change', 'review']);
		assert.ok(secretRiskScan.use_when.some((hint) => hint.includes('hardcoded secrets')));
		assert.ok(secretRiskScan.inputs.includes('max_findings'));
		assert.ok(secretRiskScan.outputs.includes('secret_risk_findings'));
		assert.ok(secretRiskScan.related_skills.includes('security-privacy-review'));
		assert.equal(secretRiskScan.risk_level, 'medium');
		assert.equal(secretRiskScan.cost, 'low');
		assert.equal(secretRiskScan.report_schema_file, 'secret-risk-scan-report.schema.json');

		assert.ok(securityPatternScan, 'repo/security-pattern-scan should be listed');
		assert.equal(securityPatternScan.read_only, true);
		assert.equal(securityPatternScan.mutates, false);
		assert.equal(securityPatternScan.network, false);
		assert.deepEqual(securityPatternScan.phases, ['before_change', 'after_change', 'review']);
		assert.ok(securityPatternScan.use_when.some((hint) => hint.includes('security code patterns')));
		assert.ok(securityPatternScan.inputs.includes('max_findings'));
		assert.ok(securityPatternScan.outputs.includes('security_pattern_findings'));
		assert.ok(securityPatternScan.outputs.includes('review_focus'));
		assert.ok(securityPatternScan.related_skills.includes('security-flow-review'));
		assert.equal(securityPatternScan.risk_level, 'medium');
		assert.equal(securityPatternScan.cost, 'low');
		assert.equal(securityPatternScan.report_schema_file, 'security-pattern-scan-report.schema.json');

		assert.ok(generatedBoundary, 'repo/generated-boundary should be listed');
		assert.equal(generatedBoundary.read_only, true);
		assert.equal(generatedBoundary.mutates, false);
		assert.equal(generatedBoundary.network, false);
		assert.deepEqual(generatedBoundary.phases, ['before_change', 'after_change', 'review']);
		assert.ok(generatedBoundary.use_when.some((hint) => hint.includes('generated')));
		assert.ok(generatedBoundary.inputs.includes('path'));
		assert.ok(generatedBoundary.outputs.includes('json_report'));
		assert.ok(generatedBoundary.related_skills.includes('completion-evidence-gate'));
		assert.equal(generatedBoundary.risk_level, 'low');
		assert.equal(generatedBoundary.cost, 'low');
		assert.equal(generatedBoundary.report_schema_file, 'generated-boundary-report.schema.json');

		assert.ok(mergeConflictScan, 'repo/merge-conflict-scan should be listed');
		assert.equal(mergeConflictScan.read_only, true);
		assert.equal(mergeConflictScan.mutates, false);
		assert.equal(mergeConflictScan.network, false);
		assert.deepEqual(mergeConflictScan.phases, ['after_change', 'review']);
		assert.ok(mergeConflictScan.use_when.some((hint) => hint.includes('merge conflict markers')));
		assert.ok(mergeConflictScan.inputs.includes('max_files'));
		assert.ok(mergeConflictScan.outputs.includes('merge_conflict_markers'));
		assert.ok(mergeConflictScan.related_skills.includes('completion-evidence-gate'));
		assert.equal(mergeConflictScan.risk_level, 'low');
		assert.equal(mergeConflictScan.cost, 'low');
		assert.equal(mergeConflictScan.report_schema_file, 'repo-merge-conflict-scan-report.schema.json');

		assert.ok(gitIgnoreAudit, 'repo/git-ignore-audit should be listed');
		assert.equal(gitIgnoreAudit.read_only, true);
		assert.equal(gitIgnoreAudit.mutates, false);
		assert.equal(gitIgnoreAudit.network, false);
		assert.deepEqual(gitIgnoreAudit.phases, ['before_change', 'after_change', 'review']);
		assert.ok(gitIgnoreAudit.use_when.some((hint) => hint.includes('.gitignore')));
		assert.ok(gitIgnoreAudit.inputs.includes('max_paths'));
		assert.ok(gitIgnoreAudit.outputs.includes('ignore_sources'));
		assert.ok(gitIgnoreAudit.outputs.includes('ignored_path_evidence'));
		assert.ok(gitIgnoreAudit.related_skills.includes('file-path-cross-platform-change'));
		assert.equal(gitIgnoreAudit.risk_level, 'low');
		assert.equal(gitIgnoreAudit.cost, 'low');
		assert.equal(gitIgnoreAudit.report_schema_file, 'repo-git-ignore-audit-report.schema.json');

		assert.ok(manifestLockDrift, 'repo/manifest-lock-drift should be listed');
		assert.equal(manifestLockDrift.read_only, true);
		assert.equal(manifestLockDrift.mutates, false);
		assert.equal(manifestLockDrift.network, false);
		assert.deepEqual(manifestLockDrift.phases, ['before_change', 'after_change', 'review']);
		assert.ok(manifestLockDrift.use_when.some((hint) => hint.includes('manifest.lock.toml')));
		assert.ok(manifestLockDrift.inputs.includes('max_entries'));
		assert.ok(manifestLockDrift.outputs.includes('manifest_lock_entries'));
		assert.ok(manifestLockDrift.outputs.includes('hash_mismatch_findings'));
		assert.ok(manifestLockDrift.related_skills.includes('template-install-surface-sync'));
		assert.equal(manifestLockDrift.risk_level, 'low');
		assert.equal(manifestLockDrift.cost, 'low');
		assert.equal(manifestLockDrift.report_schema_file, 'repo-manifest-lock-drift-report.schema.json');

		assert.ok(versionSource, 'repo/version-source should be listed');
		assert.equal(versionSource.read_only, true);
		assert.equal(versionSource.mutates, false);
		assert.equal(versionSource.network, false);
		assert.deepEqual(versionSource.phases, ['before_change', 'after_change', 'review']);
		assert.ok(versionSource.use_when.some((hint) => hint.includes('version source')));
		assert.deepEqual(versionSource.inputs, []);
		assert.ok(versionSource.outputs.includes('version_sources'));
		assert.ok(versionSource.outputs.includes('versioning_findings'));
		assert.ok(versionSource.related_skills.includes('version-freshness-check'));
		assert.equal(versionSource.risk_level, 'low');
		assert.equal(versionSource.cost, 'low');
		assert.equal(versionSource.report_schema_file, 'repo-version-source-report.schema.json');

		assert.ok(toolchainProvenance, 'repo/toolchain-provenance should be listed');
		assert.equal(toolchainProvenance.read_only, true);
		assert.equal(toolchainProvenance.mutates, false);
		assert.equal(toolchainProvenance.network, false);
		assert.deepEqual(toolchainProvenance.phases, ['before_change', 'after_change', 'review']);
		assert.ok(toolchainProvenance.use_when.some((hint) => hint.includes('toolchain provenance')));
		assert.deepEqual(toolchainProvenance.inputs, []);
		assert.ok(toolchainProvenance.outputs.includes('toolchain_sources'));
		assert.ok(toolchainProvenance.outputs.includes('toolchain_findings'));
		assert.ok(toolchainProvenance.related_skills.includes('version-freshness-check'));
		assert.equal(toolchainProvenance.risk_level, 'low');
		assert.equal(toolchainProvenance.cost, 'low');
		assert.equal(toolchainProvenance.report_schema_file, 'repo-toolchain-provenance-report.schema.json');

		assert.ok(automationSurface, 'repo/automation-surface should be listed');
		assert.equal(automationSurface.read_only, true);
		assert.equal(automationSurface.mutates, false);
		assert.equal(automationSurface.network, false);
		assert.deepEqual(automationSurface.phases, ['before_change', 'after_change', 'review']);
		assert.ok(automationSurface.use_when.some((hint) => hint.includes('automation surfaces')));
		assert.deepEqual(automationSurface.inputs, []);
		assert.ok(automationSurface.outputs.includes('automation_surfaces'));
		assert.ok(automationSurface.outputs.includes('automation_findings'));
		assert.ok(automationSurface.related_skills.includes('command-intent-mapping-gate'));
		assert.equal(automationSurface.risk_level, 'medium');
		assert.equal(automationSurface.cost, 'low');
		assert.equal(automationSurface.report_schema_file, 'repo-automation-surface-report.schema.json');

		assert.ok(dependencySurface, 'repo/dependency-surface should be listed');
		assert.equal(dependencySurface.read_only, true);
		assert.equal(dependencySurface.mutates, false);
		assert.equal(dependencySurface.network, false);
		assert.deepEqual(dependencySurface.phases, ['before_change', 'after_change', 'review']);
		assert.ok(dependencySurface.use_when.some((hint) => hint.includes('dependency manifests')));
		assert.deepEqual(dependencySurface.inputs, []);
		assert.ok(dependencySurface.outputs.includes('dependency_surfaces'));
		assert.ok(dependencySurface.outputs.includes('dependency_findings'));
		assert.ok(dependencySurface.related_skills.includes('dependency-upgrade-review'));
		assert.equal(dependencySurface.risk_level, 'medium');
		assert.equal(dependencySurface.cost, 'low');
		assert.equal(dependencySurface.report_schema_file, 'repo-dependency-surface-report.schema.json');

		assert.ok(approvalGate, 'repo/approval-gate should be listed');
		assert.equal(approvalGate.read_only, true);
		assert.equal(approvalGate.mutates, false);
		assert.equal(approvalGate.network, false);
		assert.deepEqual(approvalGate.phases, ['before_change', 'review']);
		assert.ok(approvalGate.use_when.some((hint) => hint.includes('approval')));
		assert.deepEqual(approvalGate.inputs, ['action_type']);
		assert.ok(approvalGate.outputs.includes('approval_decisions'));
		assert.ok(approvalGate.outputs.includes('approval_findings'));
		assert.ok(approvalGate.related_skills.includes('completion-evidence-gate'));
		assert.equal(approvalGate.risk_level, 'low');
		assert.equal(approvalGate.cost, 'low');
		assert.equal(approvalGate.report_schema_file, 'repo-approval-gate-report.schema.json');

		assert.ok(deploySurface, 'repo/deploy-surface should be listed');
		assert.equal(deploySurface.read_only, true);
		assert.equal(deploySurface.mutates, false);
		assert.equal(deploySurface.network, false);
		assert.deepEqual(deploySurface.phases, ['before_change', 'after_change', 'review']);
		assert.ok(deploySurface.use_when.some((hint) => hint.includes('deploy surfaces')));
		assert.deepEqual(deploySurface.inputs, []);
		assert.ok(deploySurface.outputs.includes('deploy_surfaces'));
		assert.ok(deploySurface.outputs.includes('required_verification'));
		assert.ok(deploySurface.outputs.includes('manual_gates'));
		assert.ok(deploySurface.related_skills.includes('deployment-rollout-safety-review'));
		assert.equal(deploySurface.risk_level, 'low');
		assert.equal(deploySurface.cost, 'low');
		assert.equal(deploySurface.report_schema_file, 'repo-deploy-surface-report.schema.json');

		const relatedFiles = repoPack?.scripts.find((script) => script.ref === 'repo/related-files');

		assert.ok(relatedFiles, 'repo/related-files should be listed');
		assert.equal(relatedFiles.read_only, true);
		assert.equal(relatedFiles.mutates, false);
		assert.equal(relatedFiles.network, false);
		assert.deepEqual(relatedFiles.phases, ['before_change', 'during_change', 'after_change', 'review']);
		assert.ok(relatedFiles.use_when.some((hint) => hint.includes('sibling tests')));
		assert.ok(relatedFiles.inputs.includes('max_candidates'));
		assert.ok(relatedFiles.outputs.includes('related_file_candidates'));
		assert.ok(relatedFiles.related_skills.includes('heuristic-candidate-selection'));
		assert.equal(relatedFiles.risk_level, 'low');
		assert.equal(relatedFiles.cost, 'low');
		assert.equal(relatedFiles.report_schema_file, 'related-files-report.schema.json');
	} finally {
		removeTempProject(projectPath);
	}
});

test('script-pack catalog related skills resolve to packaged source-locale skill files', () => {
	const projectPath = createTempProject();

	try {
		initProject(projectPath);
		const result = runCli(projectPath, ['script-pack', 'list', '--json']);

		assert.equal(result.status, 0, result.stderr || result.stdout);
		const report = JSON.parse(result.stdout);
		const packagedSkillRoot = path.resolve('templates', 'default', 'locales', 'en', '.mustflow', 'skills');
		const missing = report.packs.flatMap((pack) =>
			pack.scripts.flatMap((script) =>
				script.related_skills
					.filter((skill) => !existsSync(path.join(packagedSkillRoot, skill, 'SKILL.md')))
					.map((skill) => `${script.ref}:${skill}`),
			),
		);

		assert.deepEqual(missing, []);
	} finally {
		removeTempProject(projectPath);
	}
});
