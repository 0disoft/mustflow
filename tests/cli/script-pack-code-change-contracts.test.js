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

test('change-impact reports changed surfaces, importers, and verification hints', () => {
	const projectPath = createTempProject();

	try {
		initProject(projectPath);
		mkdirSync(path.join(projectPath, 'src'));
		writeFileSync(path.join(projectPath, 'src', 'feature.ts'), 'export const feature = 1;\n');
		writeFileSync(path.join(projectPath, 'src', 'consumer.ts'), 'import { feature } from "./feature";\nconsole.log(feature);\n');
		commitGitBaseline(projectPath);
		writeFileSync(path.join(projectPath, 'src', 'feature.ts'), 'export const feature = 2;\n');

		const { result, report } = runCodeChangeImpactJson(projectPath, ['--base', 'HEAD']);

		assert.equal(result.status, 0, result.stderr || result.stdout);
		assert.equal(report.command, 'script-pack');
		assert.equal(report.script_ref, 'code/change-impact');
		assert.equal(report.status, 'passed');
		assert.equal(report.ok, true);
		assert.match(report.input_hash, /^sha256:[a-f0-9]{64}$/u);
		assert.ok(report.changed_files.some((file) => file.path === 'src/feature.ts' && file.surface === 'source'));
		assert.ok(report.impacts.some((impact) => impact.path === 'src/consumer.ts' && impact.relationship === 'imports_changed_file'));
		const selectorHint = report.script_hints.find((hint) => hint.script_ref === 'test/regression-selector');
		assert.ok(selectorHint, 'missing regression selector script hint');
		assert.match(selectorHint.command, /test\/regression-selector select --base HEAD --json/u);
		assert.ok(selectorHint.related_intents.includes('test_related'));
		assert.deepEqual(selectorHint.expected_fallback_reasons, []);
		assert.ok(report.script_hints.some((hint) => hint.script_ref === 'code/dependency-graph'));
		assert.ok(report.verification_hints.some((hint) => hint.intent === 'test_related'));
	} finally {
		removeTempProject(projectPath);
	}
});

test('change-impact reports dependency-graph truncation in its own truncation flag', () => {
	const projectPath = createTempProject();

	try {
		initProject(projectPath);
		mkdirSync(path.join(projectPath, 'src'));
		writeFileSync(path.join(projectPath, 'src', 'feature.ts'), 'export const feature = 1;\n');
		writeFileSync(path.join(projectPath, 'src', 'consumer-a.ts'), 'import { feature } from "./feature";\nconsole.log(feature);\n');
		writeFileSync(path.join(projectPath, 'src', 'consumer-b.ts'), 'import { feature } from "./feature";\nconsole.log(feature);\n');
		commitGitBaseline(projectPath);
		writeFileSync(path.join(projectPath, 'src', 'feature.ts'), 'export const feature = 2;\n');

		const { result, report } = runCodeChangeImpactJson(projectPath, ['--base', 'HEAD', '--max-files', '2']);

		assert.equal(result.status, 1, result.stderr || result.stdout);
		assert.equal(report.status, 'failed');
		assert.equal(report.ok, false);
		assert.equal(report.truncated, true);
		assert.ok(
			report.findings.some(
				(finding) =>
					finding.code === 'change_impact_max_files_exceeded' &&
					finding.message.includes('Dependency graph input was truncated'),
			),
		);
		assert.ok(report.issues.some((issue) => issue.includes('dependency-graph:')));
	} finally {
		removeTempProject(projectPath);
	}
});

test('change-impact classifies schema changes with release verification hints', () => {
	const projectPath = createTempProject();

	try {
		initProject(projectPath);
		commitGitBaseline(projectPath);
		mkdirSync(path.join(projectPath, 'schemas'));
		writeFileSync(path.join(projectPath, 'schemas', 'sample.schema.json'), '{"type":"object"}\n');

		const { result, report } = runCodeChangeImpactJson(projectPath, ['--base', 'HEAD']);

		assert.equal(result.status, 0, result.stderr || result.stdout);
		assert.ok(report.changed_files.some((file) => file.path === 'schemas/sample.schema.json' && file.surface === 'schema'));
		assert.ok(report.impacts.some((impact) => impact.path === 'tests/cli/schema-manifest-contracts.test.js'));
		const selectorHint = report.script_hints.find((hint) => hint.script_ref === 'test/regression-selector');
		assert.ok(selectorHint, 'missing regression selector fallback hint for schema changes');
		assert.ok(selectorHint.related_intents.includes('test_release'));
		assert.ok(selectorHint.expected_fallback_reasons.includes('fallback_generated_contract'));
		assert.ok(report.verification_hints.some((hint) => hint.intent === 'test_release'));
		assert.ok(report.verification_hints.some((hint) => hint.intent === 'docs_validate_fast'));
	} finally {
		removeTempProject(projectPath);
	}
});

test('change-impact returns an empty report outside a git worktree', () => {
	const projectPath = createTempProject();

	try {
		initProject(projectPath);

		const { result, report } = runCodeChangeImpactJson(projectPath, ['--base', 'HEAD']);

		assert.equal(result.status, 0, result.stderr || result.stdout);
		assert.equal(report.status, 'passed');
		assert.equal(report.ok, true);
		assert.deepEqual(report.changed_files, []);
		assert.deepEqual(report.impacts, []);
		assert.ok(
			report.findings.some(
				(finding) => finding.code === 'change_impact_git_unavailable' && finding.severity === 'low',
			),
		);
		assert.ok(report.issues.some((issue) => issue.includes('Git worktree is unavailable')));
	} finally {
		removeTempProject(projectPath);
	}
});

test('export-diff compares exported signatures and return metadata against the working tree', () => {
	const projectPath = createTempProject();

	try {
		initProject(projectPath);
		mkdirSync(path.join(projectPath, 'src'));
		writeFileSync(
			path.join(projectPath, 'package.json'),
			`${JSON.stringify(
				{
					name: 'export-diff-fixture',
					type: 'module',
					exports: { '.': './src/api.ts' },
					bin: { fixture: './cli.js' },
					types: './src/api.d.ts',
				},
				null,
				2,
			)}\n`,
		);
		writeFileSync(
			path.join(projectPath, 'src', 'api.ts'),
			[
				'export function loadThing(id: string): string {',
				'  return id;',
				'}',
				'',
				'export function removeMe(): number {',
				'  return 1;',
				'}',
				'',
			].join('\n'),
		);
		commitGitBaseline(projectPath);
		writeFileSync(
			path.join(projectPath, 'src', 'api.ts'),
			[
				'export function loadThing(id: string, fallback: string): Promise<string> {',
				'  return Promise.resolve(id || fallback);',
				'}',
				'',
				'export function addMe(): boolean {',
				'  return true;',
				'}',
				'',
			].join('\n'),
		);

		const { result, report } = runCodeExportDiffJson(projectPath, ['src/api.ts', '--base', 'HEAD']);

		assert.equal(result.status, 0, result.stderr || result.stdout);
		assert.equal(report.command, 'script-pack');
		assert.equal(report.pack_id, 'code');
		assert.equal(report.script_id, 'export-diff');
		assert.equal(report.script_ref, 'code/export-diff');
		assert.equal(report.status, 'passed');
		assert.equal(report.ok, true);
		assert.equal(report.policy.base_ref, 'HEAD');
		assert.equal(report.policy.head_ref, null);
		assert.equal(report.policy.compare_worktree, true);
		assert.deepEqual(report.policy.path_filters, ['src/api.ts']);
		assert.equal(report.package_surface.type, 'module');
		assert.deepEqual(report.package_surface.exports, ['.']);
		assert.deepEqual(report.package_surface.bin, ['fixture']);
		assert.equal(report.package_surface.types, './src/api.d.ts');
		assert.equal(report.files[0].path, 'src/api.ts');
		assert.equal(report.files[0].exported_count_before, 2);
		assert.equal(report.files[0].exported_count_after, 2);
		assert.match(report.input_hash, /^sha256:[a-f0-9]{64}$/u);

		const entries = new Map(report.exports.map((entry) => [entry.name, entry]));
		assert.equal(entries.get('addMe')?.change, 'added');
		assert.equal(entries.get('addMe')?.compatibility, 'additive');
		assert.equal(entries.get('removeMe')?.change, 'removed');
		assert.equal(entries.get('removeMe')?.compatibility, 'removed_export');
		assert.equal(entries.get('loadThing')?.change, 'changed');
		assert.equal(entries.get('loadThing')?.compatibility, 'return_changed');
		assert.equal(entries.get('loadThing')?.before.return_type, 'string');
		assert.equal(entries.get('loadThing')?.after.return_type, 'Promise<string>');
		assert.deepEqual(report.summary, { files_changed: 1, added: 1, removed: 1, changed: 1, unchanged: 0 });
	} finally {
		removeTempProject(projectPath);
	}
});
