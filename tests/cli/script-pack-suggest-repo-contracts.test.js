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

test('script-pack suggest recommends config-chain for config, package, source, and test surfaces', () => {
	const projectPath = createTempProject();

	try {
		initProject(projectPath);
		mkdirSync(path.join(projectPath, 'src'));
		writeFileSync(path.join(projectPath, 'src', 'session.test.ts'), 'test("session", () => {});\n');

		const { result, report } = runScriptPackSuggestJson(projectPath, [
			'--path',
			'tsconfig.json',
			'--path',
			'package.json',
			'--path',
			'src/session.test.ts',
			'--skill',
			'typescript-code-change',
			'--phase',
			'before_change',
		]);

		assert.equal(result.status, 0, result.stderr || result.stdout);

		const configChain = report.suggestions.find((suggestion) => suggestion.script_ref === 'repo/config-chain');
		assert.ok(configChain, 'repo/config-chain should be suggested for config-aware work');
		assert.ok(configChain.matched_phases.includes('before_change'));
		assert.ok(configChain.matched_skills.includes('typescript-code-change'));
		assert.ok(configChain.matched_surfaces.includes('config'));
		assert.ok(configChain.matched_surfaces.includes('package'));
		assert.ok(configChain.matched_surfaces.includes('source'));
		assert.equal(
			configChain.run_hint,
			'mf script-pack run repo/config-chain inspect package.json src/session.test.ts tsconfig.json --json',
		);
		assert.equal(configChain.report_schema_file, 'config-chain-report.schema.json');
	} finally {
		removeTempProject(projectPath);
	}
});

test('script-pack suggest recommends env-contract for env examples and config-env work', () => {
	const projectPath = createTempProject();

	try {
		initProject(projectPath);
		writeFileSync(path.join(projectPath, '.env.example'), 'API_TOKEN=\n');

		const { result, report } = runScriptPackSuggestJson(projectPath, [
			'--path',
			'.env.example',
			'--skill',
			'config-env-change',
			'--phase',
			'before_change',
		]);

		assert.equal(result.status, 0, result.stderr || result.stdout);

		const envContract = report.suggestions.find((suggestion) => suggestion.script_ref === 'repo/env-contract');
		assert.ok(envContract, 'repo/env-contract should be suggested for env contract work');
		assert.ok(envContract.matched_phases.includes('before_change'));
		assert.ok(envContract.matched_skills.includes('config-env-change'));
		assert.ok(envContract.matched_surfaces.includes('config'));
		assert.equal(envContract.run_hint, 'mf script-pack run repo/env-contract scan .env.example --json');
		assert.equal(envContract.report_schema_file, 'env-contract-report.schema.json');
	} finally {
		removeTempProject(projectPath);
	}
});

test('script-pack suggest recommends version-source for package versioning work', () => {
	const projectPath = createTempProject();

	try {
		initProject(projectPath);

		const { result, report } = runScriptPackSuggestJson(projectPath, [
			'--path',
			'package.json',
			'--skill',
			'version-freshness-check',
			'--phase',
			'before_change',
		]);

		assert.equal(result.status, 0, result.stderr || result.stdout);

		const versionSource = report.suggestions.find((suggestion) => suggestion.script_ref === 'repo/version-source');
		assert.ok(versionSource, 'repo/version-source should be suggested for versioning work');
		assert.ok(versionSource.matched_phases.includes('before_change'));
		assert.ok(versionSource.matched_skills.includes('version-freshness-check'));
		assert.ok(versionSource.matched_surfaces.includes('package'));
		assert.equal(versionSource.run_hint, 'mf script-pack run repo/version-source inspect --json');
		assert.equal(versionSource.report_schema_file, 'repo-version-source-report.schema.json');
	} finally {
		removeTempProject(projectPath);
	}
});

test('script-pack suggest recommends provenance, automation, and dependency surfaces for package automation work', () => {
	const projectPath = createTempProject();

	try {
		initProject(projectPath);

		const { result, report } = runScriptPackSuggestJson(projectPath, [
			'--path',
			'package.json',
			'--skill',
			'command-intent-mapping-gate',
			'--skill',
			'dependency-upgrade-review',
			'--phase',
			'before_change',
		]);

		assert.equal(result.status, 0, result.stderr || result.stdout);

		const toolchain = report.suggestions.find((suggestion) => suggestion.script_ref === 'repo/toolchain-provenance');
		const automation = report.suggestions.find((suggestion) => suggestion.script_ref === 'repo/automation-surface');
		const dependency = report.suggestions.find((suggestion) => suggestion.script_ref === 'repo/dependency-surface');

		assert.ok(toolchain, 'repo/toolchain-provenance should be suggested for package automation work');
		assert.ok(toolchain.matched_phases.includes('before_change'));
		assert.ok(toolchain.matched_surfaces.includes('package'));
		assert.equal(toolchain.run_hint, 'mf script-pack run repo/toolchain-provenance inspect --json');
		assert.equal(toolchain.report_schema_file, 'repo-toolchain-provenance-report.schema.json');

		assert.ok(automation, 'repo/automation-surface should be suggested for command-intent mapping work');
		assert.ok(automation.matched_phases.includes('before_change'));
		assert.ok(automation.matched_skills.includes('command-intent-mapping-gate'));
		assert.ok(automation.matched_surfaces.includes('package'));
		assert.equal(automation.run_hint, 'mf script-pack run repo/automation-surface inspect --json');
		assert.equal(automation.report_schema_file, 'repo-automation-surface-report.schema.json');

		assert.ok(dependency, 'repo/dependency-surface should be suggested for dependency work');
		assert.ok(dependency.matched_phases.includes('before_change'));
		assert.ok(dependency.matched_skills.includes('dependency-upgrade-review'));
		assert.ok(dependency.matched_surfaces.includes('package'));
		assert.equal(dependency.run_hint, 'mf script-pack run repo/dependency-surface inspect --json');
		assert.equal(dependency.report_schema_file, 'repo-dependency-surface-report.schema.json');
	} finally {
		removeTempProject(projectPath);
	}
});

test('script-pack suggest recommends approval-gate for approval-sensitive workflow surfaces', () => {
	const projectPath = createTempProject();

	try {
		initProject(projectPath);

		const { result, report } = runScriptPackSuggestJson(projectPath, [
			'--path',
			'.mustflow/config/mustflow.toml',
			'--skill',
			'completion-evidence-gate',
			'--phase',
			'before_change',
		]);

		assert.equal(result.status, 0, result.stderr || result.stdout);

		const approvalGate = report.suggestions.find((suggestion) => suggestion.script_ref === 'repo/approval-gate');
		assert.ok(approvalGate, 'repo/approval-gate should be suggested for approval-sensitive workflow work');
		assert.ok(approvalGate.matched_phases.includes('before_change'));
		assert.ok(approvalGate.matched_skills.includes('completion-evidence-gate'));
		assert.ok(approvalGate.matched_surfaces.includes('config'));
		assert.equal(approvalGate.run_hint, 'mf script-pack run repo/approval-gate check --action <action_type> --json');
		assert.equal(approvalGate.report_schema_file, 'repo-approval-gate-report.schema.json');
	} finally {
		removeTempProject(projectPath);
	}
});

test('script-pack suggest recommends deploy-surface for workflow release surfaces', () => {
	const projectPath = createTempProject();

	try {
		initProject(projectPath);

		const { result, report } = runScriptPackSuggestJson(projectPath, [
			'--path',
			'.github/workflows/release.yml',
			'--skill',
			'release-publish-change',
			'--phase',
			'after_change',
		]);

		assert.equal(result.status, 0, result.stderr || result.stdout);

		const deploySurface = report.suggestions.find((suggestion) => suggestion.script_ref === 'repo/deploy-surface');
		assert.ok(deploySurface, 'repo/deploy-surface should be suggested for release workflow work');
		assert.ok(deploySurface.matched_phases.includes('after_change'));
		assert.ok(deploySurface.matched_skills.includes('release-publish-change'));
		assert.ok(deploySurface.matched_surfaces.includes('package'));
		assert.equal(deploySurface.run_hint, 'mf script-pack run repo/deploy-surface inspect --json');
		assert.equal(deploySurface.report_schema_file, 'repo-deploy-surface-report.schema.json');
	} finally {
		removeTempProject(projectPath);
	}
});

test('script-pack suggest recommends merge-conflict-scan for changed repository paths', () => {
	const projectPath = createTempProject();

	try {
		initProject(projectPath);

		const { result, report } = runScriptPackSuggestJson(projectPath, [
			'--path',
			'src/cli/index.ts',
			'--phase',
			'review',
		]);

		assert.equal(result.status, 0, result.stderr || result.stdout);

		const mergeConflictScan = report.suggestions.find((suggestion) => suggestion.script_ref === 'repo/merge-conflict-scan');
		assert.ok(mergeConflictScan, 'repo/merge-conflict-scan should be suggested for changed repo paths');
		assert.ok(mergeConflictScan.matched_phases.includes('review'));
		assert.ok(mergeConflictScan.matched_surfaces.includes('source'));
		assert.equal(mergeConflictScan.run_hint, 'mf script-pack run repo/merge-conflict-scan check src/cli/index.ts --json');
		assert.equal(mergeConflictScan.report_schema_file, 'repo-merge-conflict-scan-report.schema.json');
	} finally {
		removeTempProject(projectPath);
	}
});

test('script-pack suggest recommends git-ignore-audit for ignore and visibility-sensitive paths', () => {
	const projectPath = createTempProject();

	try {
		initProject(projectPath);

		const { result, report } = runScriptPackSuggestJson(projectPath, [
			'--path',
			'.gitignore',
			'--path',
			'dist/app.js',
			'--phase',
			'before_change',
		]);

		assert.equal(result.status, 0, result.stderr || result.stdout);

		const gitIgnoreAudit = report.suggestions.find((suggestion) => suggestion.script_ref === 'repo/git-ignore-audit');
		assert.ok(gitIgnoreAudit, 'repo/git-ignore-audit should be suggested for ignore-sensitive paths');
		assert.ok(gitIgnoreAudit.matched_phases.includes('before_change'));
		assert.ok(gitIgnoreAudit.matched_surfaces.includes('config'));
		assert.ok(gitIgnoreAudit.matched_surfaces.includes('generated'));
		assert.equal(gitIgnoreAudit.run_hint, 'mf script-pack run repo/git-ignore-audit audit .gitignore dist/app.js --json');
		assert.equal(gitIgnoreAudit.report_schema_file, 'repo-git-ignore-audit-report.schema.json');
	} finally {
		removeTempProject(projectPath);
	}
});

test('script-pack suggest recommends manifest-lock-drift for workflow lock surfaces', () => {
	const projectPath = createTempProject();

	try {
		initProject(projectPath);

		const { result, report } = runScriptPackSuggestJson(projectPath, [
			'--path',
			'.mustflow/config/manifest.lock.toml',
			'--skill',
			'template-install-surface-sync',
			'--phase',
			'review',
		]);

		assert.equal(result.status, 0, result.stderr || result.stdout);

		const manifestLockDrift = report.suggestions.find(
			(suggestion) => suggestion.script_ref === 'repo/manifest-lock-drift',
		);
		assert.ok(manifestLockDrift, 'repo/manifest-lock-drift should be suggested for manifest-lock surfaces');
		assert.ok(manifestLockDrift.matched_phases.includes('review'));
		assert.ok(manifestLockDrift.matched_skills.includes('template-install-surface-sync'));
		assert.ok(manifestLockDrift.matched_surfaces.includes('config'));
		assert.ok(manifestLockDrift.matched_surfaces.includes('generated'));
		assert.equal(
			manifestLockDrift.run_hint,
			'mf script-pack run repo/manifest-lock-drift check .mustflow/config/manifest.lock.toml --json',
		);
		assert.equal(manifestLockDrift.report_schema_file, 'repo-manifest-lock-drift-report.schema.json');
	} finally {
		removeTempProject(projectPath);
	}
});

test('script-pack suggest recommends test performance report for test-suite performance review', () => {
	const projectPath = createTempProject();

	try {
		initProject(projectPath);
		mkdirSync(path.join(projectPath, 'tests', 'cli'), { recursive: true });
		writeFileSync(path.join(projectPath, 'tests', 'cli', 'slow.test.js'), 'test("slow", () => {});\n');

		const { result, report } = runScriptPackSuggestJson(projectPath, [
			'--path',
			'tests/cli/slow.test.js',
			'--skill',
			'test-suite-performance-review',
			'--phase',
			'review',
		]);

		assert.equal(result.status, 0, result.stderr || result.stdout);

		const performanceReport = report.suggestions.find((suggestion) => suggestion.script_ref === 'test/performance-report');
		assert.ok(performanceReport, 'test/performance-report should be suggested for test performance work');
		assert.ok(performanceReport.matched_skills.includes('test-suite-performance-review'));
		assert.ok(performanceReport.matched_phases.includes('review'));
		assert.ok(performanceReport.matched_surfaces.includes('test'));
		assert.equal(performanceReport.run_hint, 'mf script-pack run test/performance-report summarize --json');
		assert.equal(performanceReport.report_schema_file, 'test-performance-report.schema.json');

		const regressionSelector = report.suggestions.find((suggestion) => suggestion.script_ref === 'test/regression-selector');
		assert.ok(regressionSelector, 'test/regression-selector should be suggested for test performance work');
		assert.ok(regressionSelector.matched_skills.includes('test-suite-performance-review'));
		assert.ok(regressionSelector.matched_phases.includes('review'));
		assert.ok(regressionSelector.matched_surfaces.includes('test'));
		assert.equal(
			regressionSelector.run_hint,
			'mf script-pack run test/regression-selector select tests/cli/slow.test.js --base HEAD --json',
		);
		assert.equal(regressionSelector.report_schema_file, 'test-regression-selector-report.schema.json');
	} finally {
		removeTempProject(projectPath);
	}
});
