import { pathToFileURL } from 'node:url';
import { cliPath } from './run-support.js';
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

		const limited = runCodeChangeImpactJson(projectPath, ['--base', 'HEAD', '--max-file-bytes', '8']);
		assert.equal(limited.result.status, 1, limited.result.stderr || limited.result.stdout);
		assert.equal(limited.report.status, 'failed');
		assert.equal(limited.report.ok, false);
		assert.equal(limited.report.truncated, false);
		assert.ok(limited.report.findings.some((finding) => finding.code === 'change_impact_dependency_graph_error'
			&& finding.path === 'src/consumer.ts' && finding.severity === 'high'));
		assert.ok(limited.report.issues.some((issue) => issue.includes('dependency-graph:')
			&& issue.includes('exceeds maximum size 8 bytes')));
	} finally {
		removeTempProject(projectPath);
	}
});

test('change-impact preserves Unicode and spaced Git paths including renames', () => {
	const projectPath = createTempProject();

	try {
		initProject(projectPath);
		mkdirSync(path.join(projectPath, 'src'));
		mkdirSync(path.join(projectPath, 'docs'));
		const source = 'src/기능.ts';
		writeFileSync(path.join(projectPath, source), 'export const feature = 1;\n');
		writeFileSync(path.join(projectPath, 'src', 'consumer.ts'), 'import { feature } from "./기능";\n');
		commitGitBaseline(projectPath);
		runGit(projectPath, ['config', 'core.quotePath', 'true']);
		runGit(projectPath, ['config', 'diff.renames', 'true']);
		writeFileSync(path.join(projectPath, source), 'export const feature = 2;\n');
		const untracked = ['docs/새 문서.md', ' leading.md'];
		for (const filePath of untracked) {
			writeFileSync(path.join(projectPath, filePath), '# Documentation\n');
		}
		const expectedPaths = [source, ...untracked].sort();
		const { result, report } = runCodeChangeImpactJson(projectPath, ['--base', 'HEAD']);
		assert.equal(result.status, 0, result.stderr || result.stdout);
		assert.deepEqual(report.changed_files.map((file) => file.path).sort(), expectedPaths);
		assert.equal(report.changed_files.find((file) => file.path === source)?.surface, 'source');
		assert.ok(report.impacts.some((impact) => impact.path === 'src/consumer.ts'
			&& impact.relationship === 'imports_changed_file' && impact.exists));
		assert.deepEqual(report.findings, []);

		commitGitBaseline(projectPath);
		const committed = runCodeChangeImpactJson(projectPath, ['--base', 'HEAD~1', '--head', 'HEAD']);
		assert.equal(committed.result.status, 0, committed.result.stderr || committed.result.stdout);
		assert.deepEqual(committed.report.changed_files.map((file) => file.path).sort(), expectedPaths);
		const renamed = 'src/새 기능.ts';
		runGit(projectPath, ['mv', source, renamed]);
		const renameReport = runCodeChangeImpactJson(projectPath, ['--base', 'HEAD']);
		assert.equal(renameReport.result.status, 0, renameReport.result.stderr || renameReport.result.stdout);
		assert.deepEqual(renameReport.report.changed_files.map((file) => [file.status, file.previous_path, file.path]),
			[['renamed', source, renamed]]);
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
		assert.ok(report.impacts.some((impact) => impact.path === 'tests/cli/schema-contracts.test.js'));
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

test('export-diff preserves Unicode and spaced paths in working-tree and committed comparisons', () => {
	const projectPath = createTempProject();

	try {
		initProject(projectPath);
		mkdirSync(path.join(projectPath, 'src'));
		const tracked = 'src/기능.ts';
		const added = 'src/새 기능.ts';
		const leading = ' leading.ts';
		writeFileSync(path.join(projectPath, tracked), 'export function value(): number { return 1; }\n');
		commitGitBaseline(projectPath);
		runGit(projectPath, ['config', 'core.quotePath', 'true']);
		writeFileSync(path.join(projectPath, tracked), 'export function value(): string { return "2"; }\n');
		writeFileSync(path.join(projectPath, added), 'export function added(): boolean { return true; }\n');
		writeFileSync(path.join(projectPath, leading), 'export function leading(): number { return 1; }\n');
		const expectedPaths = [tracked, added, leading].sort();
		const { result, report } = runCodeExportDiffJson(projectPath, ['--base', 'HEAD']);
		assert.equal(result.status, 0, result.stderr || result.stdout);
		assert.deepEqual(report.files.map((file) => file.path).sort(), expectedPaths);
		const changed = report.exports.find((entry) => entry.path === tracked && entry.name === 'value');
		assert.equal(changed?.change, 'changed');
		assert.equal(changed?.compatibility, 'return_changed');
		assert.equal(changed?.before.return_type, 'number');
		assert.equal(changed?.after.return_type, 'string');
		for (const filePath of [added, leading]) {
			assert.ok(report.exports.some((entry) => entry.path === filePath && entry.change === 'added'));
		}
		assert.deepEqual(report.summary, { files_changed: 3, added: 2, removed: 0, changed: 1, unchanged: 0 });
		assert.deepEqual(report.findings, []);

		commitGitBaseline(projectPath);
		const committed = runCodeExportDiffJson(projectPath, ['--base', 'HEAD~1', '--head', 'HEAD']);
		assert.equal(committed.result.status, 0, committed.result.stderr || committed.result.stdout);
		assert.deepEqual(committed.report.files.map((file) => file.path).sort(), expectedPaths);
		assert.deepEqual(committed.report.summary, report.summary);
	} finally {
		removeTempProject(projectPath);
	}
});

test('export-diff reports failures to discover untracked files', () => {
	const projectPath = createTempProject();

	try {
		initProject(projectPath);
		writeFileSync(path.join(projectPath, 'api.ts'), 'export const value = 1;\n');
		commitGitBaseline(projectPath);
		writeFileSync(path.join(projectPath, 'added.ts'), 'export const added = 2;\n');
		writeFileSync(path.join(projectPath, 'api.ts'), 'export const value = 2;\n');
		const injection = path.join(projectPath, '.git', 'fail-untracked.mjs');
		writeFileSync(injection, `
import childProcess from 'node:child_process';
import { syncBuiltinESMExports } from 'node:module';
const original = childProcess.spawnSync;
childProcess.spawnSync = (command, args, options) => {
  if (command === 'git' && args[0] === 'ls-files') {
    return { status: 128, stdout: 'added.ts\\0', stderr: 'fatal: injected untracked discovery failure' };
  }
  return original(command, args, options);
};
syncBuiltinESMExports();
`);
		const result = spawnSync(process.execPath, [
			'--import', pathToFileURL(injection).href, cliPath,
			'script-pack', 'run', 'code/export-diff', 'compare', '--base', 'HEAD', '--json',
		], { cwd: projectPath, encoding: 'utf8' });
		const report = JSON.parse(result.stdout);
		assert.equal(result.status, 1, result.stderr || result.stdout);
		assert.equal(report.status, 'error');
		assert.equal(report.ok, false);
		assert.ok(report.findings.some((finding) => finding.code === 'export_diff_unreadable_path'
			&& finding.path === '.' && finding.message.includes('injected untracked discovery failure')));
		assert.ok(report.issues.some((issue) => issue.includes('Could not discover untracked files')));
		assert.deepEqual(report.files.map((file) => file.path), ['api.ts']);
		assert.ok(report.exports.every((entry) => entry.path !== 'added.ts'));

		const recovered = runCodeExportDiffJson(projectPath, ['--base', 'HEAD']);
		assert.equal(recovered.result.status, 0, recovered.result.stderr || recovered.result.stdout);
		assert.deepEqual(recovered.report.findings, []);
		assert.deepEqual(recovered.report.files.map((file) => file.path).sort(), ['added.ts', 'api.ts']);
		assert.ok(recovered.report.exports.some((entry) => entry.name === 'added' && entry.change === 'added'));
	} finally {
		removeTempProject(projectPath);
	}
});

test('export-diff reports Git snapshot read failures instead of absent files', () => {
	const projectPath = createTempProject();

	try {
		initProject(projectPath);
		const source = 'api.ts';
		// Exceed the Git reader's 16 MiB output buffer with a real committed blob.
		writeFileSync(path.join(projectPath, source), `/*${'x'.repeat(17 * 1024 * 1024)}*/\nexport const value = 1;\n`);
		commitGitBaseline(projectPath);
		writeFileSync(path.join(projectPath, source), 'export const value = 2;\n');
		commitGitBaseline(projectPath);

		for (const refs of [['HEAD~1', 'HEAD'], ['HEAD', 'HEAD~1']]) {
			const { result, report } = runCodeExportDiffJson(projectPath, ['--base', refs[0], '--head', refs[1]]);
			assert.equal(result.status, 1, result.stderr || result.stdout);
			assert.equal(report.status, 'error');
			assert.equal(report.ok, false);
			assert.ok(report.findings.some((finding) => finding.code === 'export_diff_unreadable_path' && finding.path === source));
			assert.deepEqual(report.files, []);
			assert.deepEqual(report.exports, []);
		}

		unlinkSync(path.join(projectPath, source));
		commitGitBaseline(projectPath);
		const deleted = runCodeExportDiffJson(projectPath, ['--base', 'HEAD~1', '--head', 'HEAD']);
		assert.equal(deleted.result.status, 0, deleted.result.stderr || deleted.result.stdout);
		assert.deepEqual(deleted.report.findings, []);
		assert.equal(deleted.report.files[0].base_exists, true);
		assert.equal(deleted.report.files[0].head_exists, false);
		assert.equal(deleted.report.exports[0].change, 'removed');
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
