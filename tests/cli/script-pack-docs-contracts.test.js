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

test('reference-drift validates documented commands, script refs, schemas, and repo paths', () => {
	const projectPath = createTempProject();

	try {
		initProject(projectPath);
		mkdirSync(path.join(projectPath, 'schemas'));
		mkdirSync(path.join(projectPath, 'src'));
		writeFileSync(path.join(projectPath, 'schemas', 'doctor-report.schema.json'), '{}\n');
		writeFileSync(path.join(projectPath, 'src', 'index.ts'), 'export const ok = true;\n');
		writeFileSync(
			path.join(projectPath, 'README.md'),
			[
				'# Reference docs',
				'',
				'Run `mf script-pack run code/outline scan src/index.ts --json` before reading all source.',
				'See `doctor-report.schema.json` and `src/index.ts`.',
				'Bad examples: `mf no-such-command --json`, `mf script-pack run docs/missing check --json`, `missing.schema.json`, `src/missing.ts`.',
				'',
			].join('\n'),
		);

		const { result, report } = runDocsReferenceDriftJson(projectPath, ['README.md']);

		assert.equal(result.status, 1, result.stderr || result.stdout);
		assert.equal(report.command, 'script-pack');
		assert.equal(report.pack_id, 'docs');
		assert.equal(report.script_id, 'reference-drift');
		assert.equal(report.script_ref, 'docs/reference-drift');
		assert.equal(report.action, 'check');
		assert.equal(report.status, 'failed');
		assert.equal(report.ok, false);
		assert.equal(report.files[0].path, 'README.md');
		assert.match(report.files[0].sha256, /^sha256:[a-f0-9]{64}$/u);
		assert.match(report.input_hash, /^sha256:[a-f0-9]{64}$/u);
		assert.ok(report.policy.default_paths.includes('README.md'));
		assert.equal(report.summary.files_checked, 1);
		assert.ok(report.summary.references_checked >= 8);

		const references = new Map(report.references.map((reference) => [`${reference.kind}:${reference.target}`, reference]));
		assert.equal(references.get('mf_command:script-pack')?.status, 'ok');
		assert.equal(references.get('script_pack_ref:code/outline')?.status, 'ok');
		assert.equal(references.get('schema_file:doctor-report.schema.json')?.status, 'ok');
		assert.equal(references.get('repo_path:src/index.ts')?.status, 'ok');
		assert.equal(references.get('mf_command:no-such-command')?.status, 'unknown');
		assert.equal(references.get('script_pack_ref:docs/missing')?.status, 'unknown');
		assert.equal(references.get('schema_file:missing.schema.json')?.status, 'unknown');
		assert.equal(references.get('repo_path:src/missing.ts')?.status, 'missing');
		assert.ok(report.findings.some((finding) => finding.code === 'reference_drift_unknown_command'));
		assert.ok(report.findings.some((finding) => finding.code === 'reference_drift_unknown_script_pack'));
		assert.ok(report.findings.some((finding) => finding.code === 'reference_drift_unknown_schema'));
		assert.ok(report.findings.some((finding) => finding.code === 'reference_drift_missing_path'));
	} finally {
		removeTempProject(projectPath);
	}
});

test('reference-drift defaults to README and schemas docs when no path is provided', () => {
	const projectPath = createTempProject();

	try {
		initProject(projectPath);
		mkdirSync(path.join(projectPath, 'schemas'));
		writeFileSync(path.join(projectPath, 'schemas', 'doctor-report.schema.json'), '{}\n');
		writeFileSync(path.join(projectPath, 'README.md'), 'Run `mf doctor --json`.\n');
		writeFileSync(path.join(projectPath, 'schemas', 'README.md'), 'Schema: `doctor-report.schema.json`.\n');

		const { result, report } = runDocsReferenceDriftJson(projectPath, []);

		assert.equal(result.status, 0, result.stderr || result.stdout);
		assert.equal(report.status, 'passed');
		assert.equal(report.ok, true);
		assert.deepEqual(
			report.files.map((file) => file.path),
			['README.md', 'schemas/README.md'],
		);
		assert.equal(report.summary.files_checked, 2);
		assert.equal(report.findings.length, 0);
	} finally {
		removeTempProject(projectPath);
	}
});

test('link-integrity validates local files and markdown anchors without fetching external links', () => {
	const projectPath = createTempProject();

	try {
		initProject(projectPath);
		mkdirSync(path.join(projectPath, 'docs'));
		writeFileSync(
			path.join(projectPath, 'README.md'),
			[
				'# Link docs',
				'',
				'Use [install](docs/guide.md#install-steps), [top](#link-docs), and [external](https://example.invalid/path).',
				'Broken links: [file](docs/missing.md), [anchor](docs/guide.md#missing-heading).',
				'',
			].join('\n'),
		);
		writeFileSync(path.join(projectPath, 'docs', 'guide.md'), '# Guide\n\n## Install steps\n\nDone.\n');

		const { result, report } = runDocsLinkIntegrityJson(projectPath, ['README.md']);

		assert.equal(result.status, 1, result.stderr || result.stdout);
		assert.equal(report.command, 'script-pack');
		assert.equal(report.pack_id, 'docs');
		assert.equal(report.script_id, 'link-integrity');
		assert.equal(report.script_ref, 'docs/link-integrity');
		assert.equal(report.action, 'check');
		assert.equal(report.status, 'failed');
		assert.equal(report.ok, false);
		assert.equal(report.files[0].path, 'README.md');
		assert.match(report.files[0].sha256, /^sha256:[a-f0-9]{64}$/u);
		assert.match(report.input_hash, /^sha256:[a-f0-9]{64}$/u);
		assert.ok(report.policy.checked_link_kinds.includes('local_file'));
		assert.ok(report.policy.checked_link_kinds.includes('local_anchor'));
		assert.equal(report.summary.files_checked, 1);
		assert.equal(report.summary.links_checked, 5);
		assert.equal(report.summary.ok, 2);
		assert.equal(report.summary.skipped, 1);
		assert.equal(report.summary.missing, 2);

		const links = new Map(report.links.map((link) => [link.target, link]));
		assert.equal(links.get('docs/guide.md#install-steps')?.status, 'ok');
		assert.equal(links.get('#link-docs')?.status, 'ok');
		assert.equal(links.get('https://example.invalid/path')?.status, 'skipped');
		assert.equal(links.get('docs/missing.md')?.status, 'missing');
		assert.equal(links.get('docs/guide.md#missing-heading')?.status, 'missing');
		assert.ok(report.findings.some((finding) => finding.code === 'link_integrity_missing_file'));
		assert.ok(report.findings.some((finding) => finding.code === 'link_integrity_missing_anchor'));
	} finally {
		removeTempProject(projectPath);
	}
});

test('link-integrity strips nested HTML tag text before deriving markdown anchors', () => {
	const projectPath = createTempProject();

	try {
		initProject(projectPath);
		writeFileSync(
			path.join(projectPath, 'README.md'),
			[
				'# Link docs',
				'',
				'## Safe <scr<script>ipt> Heading',
				'',
				'## Keep <em>state</em>',
				'',
				'Use [nested](#safe-heading) and [html](#keep-state).',
				'',
			].join('\n'),
		);

		const { result, report } = runDocsLinkIntegrityJson(projectPath, ['README.md']);

		assert.equal(result.status, 0, result.stderr || result.stdout);
		assert.equal(report.status, 'passed');
		assert.equal(report.ok, true);
		assert.equal(report.summary.links_checked, 2);
		assert.equal(report.summary.ok, 2);
		assert.equal(report.findings.length, 0);

		const links = new Map(report.links.map((link) => [link.target, link]));
		assert.equal(links.get('#safe-heading')?.status, 'ok');
		assert.equal(links.get('#keep-state')?.status, 'ok');
		assert.doesNotMatch(JSON.stringify(report.links), /script/iu);
	} finally {
		removeTempProject(projectPath);
	}
});

test('link-integrity defaults to README and schemas docs when no path is provided', () => {
	const projectPath = createTempProject();

	try {
		initProject(projectPath);
		mkdirSync(path.join(projectPath, 'schemas'));
		writeFileSync(path.join(projectPath, 'README.md'), 'Read [schemas](schemas/README.md).\n');
		writeFileSync(path.join(projectPath, 'schemas', 'README.md'), '# Schemas\n\nBack to [root](../README.md).\n');

		const { result, report } = runDocsLinkIntegrityJson(projectPath, []);

		assert.equal(result.status, 0, result.stderr || result.stdout);
		assert.equal(report.status, 'passed');
		assert.equal(report.ok, true);
		assert.deepEqual(
			report.files.map((file) => file.path),
			['README.md', 'schemas/README.md'],
		);
		assert.equal(report.summary.files_checked, 2);
		assert.equal(report.summary.links_checked, 2);
		assert.equal(report.findings.length, 0);
	} finally {
		removeTempProject(projectPath);
	}
});
