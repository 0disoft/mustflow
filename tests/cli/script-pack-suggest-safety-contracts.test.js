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

test('script-pack suggest recommends secret-risk-scan for security and privacy work', () => {
	const projectPath = createTempProject();

	try {
		initProject(projectPath);
		mkdirSync(path.join(projectPath, 'src'));
		writeFileSync(path.join(projectPath, 'src', 'config.ts'), 'export const API_TOKEN = "changeme";\n');

		const { result, report } = runScriptPackSuggestJson(projectPath, [
			'--path',
			'src/config.ts',
			'--skill',
			'security-privacy-review',
			'--phase',
			'before_change',
		]);

		assert.equal(result.status, 0, result.stderr || result.stdout);

		const secretRiskScan = report.suggestions.find((suggestion) => suggestion.script_ref === 'repo/secret-risk-scan');
		assert.ok(secretRiskScan, 'repo/secret-risk-scan should be suggested for security work');
		assert.ok(secretRiskScan.matched_phases.includes('before_change'));
		assert.ok(secretRiskScan.matched_skills.includes('security-privacy-review'));
		assert.ok(secretRiskScan.matched_surfaces.includes('source'));
		assert.equal(secretRiskScan.run_hint, 'mf script-pack run repo/secret-risk-scan scan src/config.ts --json');
		assert.equal(secretRiskScan.report_schema_file, 'secret-risk-scan-report.schema.json');
	} finally {
		removeTempProject(projectPath);
	}
});

test('script-pack suggest recommends security-pattern-scan for security source review', () => {
	const projectPath = createTempProject();

	try {
		initProject(projectPath);
		mkdirSync(path.join(projectPath, 'src'));
		writeFileSync(path.join(projectPath, 'src', 'server.ts'), 'export function proxy(req) { return fetch(req.query.url); }\n');

		const { result, report } = runScriptPackSuggestJson(projectPath, [
			'--path',
			'src/server.ts',
			'--skill',
			'security-flow-review',
			'--phase',
			'review',
		]);

		assert.equal(result.status, 0, result.stderr || result.stdout);

		const securityPatternScan = report.suggestions.find((suggestion) => suggestion.script_ref === 'repo/security-pattern-scan');
		assert.ok(securityPatternScan, 'repo/security-pattern-scan should be suggested for security source review');
		assert.ok(securityPatternScan.matched_phases.includes('review'));
		assert.ok(securityPatternScan.matched_skills.includes('security-flow-review'));
		assert.ok(securityPatternScan.matched_surfaces.includes('source'));
		assert.equal(securityPatternScan.run_hint, 'mf script-pack run repo/security-pattern-scan scan src/server.ts --json');
		assert.equal(securityPatternScan.report_schema_file, 'security-pattern-scan-report.schema.json');
	} finally {
		removeTempProject(projectPath);
	}
});

test('script-pack suggest can use current changed files without running scripts', () => {
	const projectPath = createTempProject();

	try {
		initProject(projectPath);
		commitGitBaseline(projectPath);
		writeFileSync(path.join(projectPath, 'README.md'), 'updated readme\n');
		const { result, report } = runScriptPackSuggestJson(projectPath, ['--changed', '--phase', 'after_change']);

		assert.equal(result.status, 0, result.stderr || result.stdout);
		assert.equal(report.input.changed, true);
		assert.ok(report.input.paths.includes('README.md'));
		assert.ok(report.analyzed_paths.some((entry) => entry.path === 'README.md' && entry.surfaces.includes('docs')));
		const textBudget = report.suggestions.find((suggestion) => suggestion.script_ref === 'core/text-budget');
		assert.ok(textBudget);
		assert.equal(textBudget.run_hint, 'mf script-pack run core/text-budget check README.md --json');
		assert.equal(report.issues.length, 0);
	} finally {
		removeTempProject(projectPath);
	}
});

test('script-pack suggest reads changed paths with spaces and unicode from porcelain status', () => {
	const projectPath = createTempProject();

	try {
		initProject(projectPath);
		commitGitBaseline(projectPath);
		mkdirSync(path.join(projectPath, 'src'));
		writeFileSync(path.join(projectPath, 'src', 'my component 한글.ts'), 'export const value = 1;\n');

		const { result, report } = runScriptPackSuggestJson(projectPath, ['--changed', '--phase', 'after_change']);

		assert.equal(result.status, 0, result.stderr || result.stdout);
		assert.ok(report.input.paths.includes('src/my component 한글.ts'));
		assert.equal(report.input.paths.some((entry) => entry.includes('"')), false);
		assert.ok(report.analyzed_paths.some((entry) => entry.path === 'src/my component 한글.ts'));
		assert.equal(report.issues.length, 0);
	} finally {
		removeTempProject(projectPath);
	}
});

test('script-pack suggest recommends reference drift checks after docs or schema changes', () => {
	const projectPath = createTempProject();

	try {
		initProject(projectPath);
		const { result, report } = runScriptPackSuggestJson(projectPath, [
			'--path',
			'README.md',
			'--path',
			'schemas/README.md',
			'--skill',
			'public-json-contract-change',
			'--phase',
			'after_change',
		]);

		assert.equal(result.status, 0, result.stderr || result.stdout);

		const referenceDrift = report.suggestions.find((suggestion) => suggestion.script_ref === 'docs/reference-drift');
		assert.ok(referenceDrift, 'docs/reference-drift should be suggested for docs/schema references');
		assert.ok(referenceDrift.matched_phases.includes('after_change'));
		assert.ok(referenceDrift.matched_skills.includes('public-json-contract-change'));
		assert.ok(referenceDrift.matched_surfaces.includes('docs'));
		assert.ok(referenceDrift.matched_surfaces.includes('schema'));
		assert.equal(
			referenceDrift.run_hint,
			'mf script-pack run docs/reference-drift check README.md schemas/README.md --json',
		);
		assert.equal(referenceDrift.report_schema_file, 'reference-drift-report.schema.json');
		const linkIntegrity = report.suggestions.find((suggestion) => suggestion.script_ref === 'docs/link-integrity');
		assert.ok(linkIntegrity, 'docs/link-integrity should be suggested for docs/schema links');
		assert.ok(linkIntegrity.matched_phases.includes('after_change'));
		assert.ok(linkIntegrity.matched_skills.includes('public-json-contract-change'));
		assert.ok(linkIntegrity.matched_surfaces.includes('docs'));
		assert.ok(linkIntegrity.matched_surfaces.includes('schema'));
		assert.equal(
			linkIntegrity.run_hint,
			'mf script-pack run docs/link-integrity check README.md schemas/README.md --json',
		);
		assert.equal(linkIntegrity.report_schema_file, 'link-integrity-report.schema.json');
	} finally {
		removeTempProject(projectPath);
	}
});

test('script-pack suggest rejects missing and unknown selection inputs', () => {
	const projectPath = createTempProject();

	try {
		initProject(projectPath);
		const missing = runCli(projectPath, ['script-pack', 'suggest']);
		assert.equal(missing.status, 1, missing.stderr || missing.stdout);
		assert.match(missing.stderr, /Provide at least one suggestion input/u);

		const unknownPhase = runCli(projectPath, ['script-pack', 'suggest', '--phase', 'before']);
		assert.equal(unknownPhase.status, 1, unknownPhase.stderr || unknownPhase.stdout);
		assert.match(unknownPhase.stderr, /Unknown script-pack phase: before/u);
	} finally {
		removeTempProject(projectPath);
	}
});
