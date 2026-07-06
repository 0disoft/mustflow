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

test('script-pack suggest ranks helpers from path, skill, and phase evidence', () => {
	const projectPath = createTempProject();

	try {
		initProject(projectPath);
		const { result, report } = runScriptPackSuggestJson(projectPath, [
			'--path',
			'.mustflow/config/manifest.lock.toml',
			'--skill',
			'template-install-surface-sync',
			'--phase',
			'before_change',
		]);

		assert.equal(result.status, 0, result.stderr || result.stdout);
		assert.equal(report.command, 'script-pack');
		assert.equal(report.action, 'suggest');
		assert.equal(report.status, 'suggested');
		assert.equal(report.ok, true);
		assert.deepEqual(report.input.phases, ['before_change']);
		assert.deepEqual(report.input.skills, ['template-install-surface-sync']);
		assert.equal(report.input.paths[0], '.mustflow/config/manifest.lock.toml');
		assert.ok(report.analyzed_paths[0].surfaces.includes('generated'));
		assert.ok(report.analyzed_paths[0].surfaces.includes('config'));

		const [first] = report.suggestions;
		assert.equal(first.script_ref, 'repo/generated-boundary');
		assert.equal(first.read_only, true);
		assert.equal(first.mutates, false);
		assert.equal(first.network, false);
		assert.ok(first.matched_phases.includes('before_change'));
		assert.ok(first.matched_skills.includes('template-install-surface-sync'));
		assert.ok(first.matched_surfaces.includes('generated'));
		assert.equal(first.report_schema_file, 'generated-boundary-report.schema.json');
		assert.equal(
			first.run_hint,
			'mf script-pack run repo/generated-boundary check .mustflow/config/manifest.lock.toml --json',
		);
	} finally {
		removeTempProject(projectPath);
	}
});

test('script-pack suggest does not recommend code navigation for config-generated paths', () => {
	const projectPath = createTempProject();

	try {
		initProject(projectPath);
		const { result, report } = runScriptPackSuggestJson(projectPath, [
			'--path',
			'.mustflow/config/commands.toml',
			'--path',
			'.mustflow/config/manifest.lock.toml',
			'--phase',
			'after_change',
		]);

		assert.equal(result.status, 0, result.stderr || result.stdout);
		assert.equal(report.status, 'suggested');
		assert.ok(report.analyzed_paths.some((entry) => entry.path === '.mustflow/config/commands.toml'));
		assert.ok(
			report.analyzed_paths.some(
				(entry) => entry.path === '.mustflow/config/manifest.lock.toml' && entry.surfaces.includes('generated'),
			),
		);
		assert.equal(report.suggestions[0].script_ref, 'repo/generated-boundary');
		assert.equal(
			report.suggestions.some((suggestion) => suggestion.script_ref === 'code/outline'),
			false,
		);
		assert.equal(
			report.suggestions.some((suggestion) => suggestion.script_ref === 'code/symbol-read'),
			false,
		);
		assert.equal(
			report.suggestions[0].run_hint,
			'mf script-pack run repo/generated-boundary check .mustflow/config/commands.toml .mustflow/config/manifest.lock.toml --json',
		);
	} finally {
		removeTempProject(projectPath);
	}
});

test('script-pack suggest returns concrete code helper hints for source paths', () => {
	const projectPath = createTempProject();

	try {
		initProject(projectPath);
		mkdirSync(path.join(projectPath, 'src'));
		writeFileSync(path.join(projectPath, 'src', 'session.ts'), 'export function resolveSession() { return true; }\n');

		const { result, report } = runScriptPackSuggestJson(projectPath, [
			'--path',
			'src/session.ts',
			'--skill',
			'typescript-code-change',
			'--phase',
			'before_change',
		]);

		assert.equal(result.status, 0, result.stderr || result.stdout);

		const outline = report.suggestions.find((suggestion) => suggestion.script_ref === 'code/outline');
		const dependencyGraph = report.suggestions.find((suggestion) => suggestion.script_ref === 'code/dependency-graph');
		const importCycle = report.suggestions.find((suggestion) => suggestion.script_ref === 'code/import-cycle');
		const moduleBoundary = report.suggestions.find((suggestion) => suggestion.script_ref === 'code/module-boundary');
		const symbolRead = report.suggestions.find((suggestion) => suggestion.script_ref === 'code/symbol-read');
		const relatedFiles = report.suggestions.find((suggestion) => suggestion.script_ref === 'repo/related-files');

		assert.ok(outline, 'code/outline should be suggested for source paths');
		assert.ok(dependencyGraph, 'code/dependency-graph should be suggested for source paths');
		assert.ok(importCycle, 'code/import-cycle should be suggested for source paths');
		assert.ok(moduleBoundary, 'code/module-boundary should be suggested for source paths');
		assert.ok(symbolRead, 'code/symbol-read should be suggested as a source follow-up');
		assert.ok(relatedFiles, 'repo/related-files should be suggested for source paths');
		assert.equal(outline.run_hint, 'mf script-pack run code/outline scan src/session.ts --json');
		assert.equal(dependencyGraph.run_hint, 'mf script-pack run code/dependency-graph scan src/session.ts --json');
		assert.equal(importCycle.run_hint, 'mf script-pack run code/import-cycle check src/session.ts --json');
		assert.equal(importCycle.report_schema_file, 'import-cycle-report.schema.json');
		assert.equal(moduleBoundary.run_hint, 'mf script-pack run code/module-boundary check src/session.ts --json');
		assert.equal(moduleBoundary.report_schema_file, 'module-boundary-report.schema.json');
		assert.match(symbolRead.run_hint, /After code\/outline returns a symbol line or anchor/u);
		assert.match(symbolRead.run_hint, /src\/session\.ts --start-line <line> --json/u);
		assert.equal(relatedFiles.run_hint, 'mf script-pack run repo/related-files map src/session.ts --json');
		assert.ok(
			report.suggestions.findIndex((suggestion) => suggestion.script_ref === 'code/outline') <
				report.suggestions.findIndex((suggestion) => suggestion.script_ref === 'code/symbol-read'),
			'code/outline should rank before code/symbol-read for initial source-path orientation',
		);
	} finally {
		removeTempProject(projectPath);
	}
});

test('script-pack suggest recommends route outline for Hono Elysia Axum and NestJS source work', () => {
	const projectPath = createTempProject();

	try {
		initProject(projectPath);
		mkdirSync(path.join(projectPath, 'src'));
		writeFileSync(path.join(projectPath, 'src', 'server.ts'), 'import { Hono } from "hono";\n');

		const { result, report } = runScriptPackSuggestJson(projectPath, [
			'--path',
			'src/server.ts',
			'--skill',
			'hono-code-change',
			'--skill',
			'elysia-code-change',
			'--phase',
			'before_change',
		]);

		assert.equal(result.status, 0, result.stderr || result.stdout);

		const routeOutline = report.suggestions.find((suggestion) => suggestion.script_ref === 'code/route-outline');
		assert.ok(routeOutline, 'code/route-outline should be suggested for route work');
		assert.equal(routeOutline.run_hint, 'mf script-pack run code/route-outline scan src/server.ts --json');
		assert.ok(routeOutline.matched_skills.includes('hono-code-change'));
		assert.ok(routeOutline.matched_skills.includes('elysia-code-change'));
		assert.ok(routeOutline.matched_phases.includes('before_change'));
		assert.equal(routeOutline.report_schema_file, 'route-outline-report.schema.json');
	} finally {
		removeTempProject(projectPath);
	}
});

test('script-pack suggest recommends route outline for Axum source work', () => {
	const projectPath = createTempProject();

	try {
		initProject(projectPath);
		mkdirSync(path.join(projectPath, 'src'));
		writeFileSync(path.join(projectPath, 'src', 'main.rs'), 'use axum::{routing::get, Router};\n');

		const { result, report } = runScriptPackSuggestJson(projectPath, [
			'--path',
			'src/main.rs',
			'--skill',
			'axum-code-change',
			'--phase',
			'before_change',
		]);

		assert.equal(result.status, 0, result.stderr || result.stdout);

		const routeOutline = report.suggestions.find((suggestion) => suggestion.script_ref === 'code/route-outline');
		assert.ok(routeOutline, 'code/route-outline should be suggested for Axum route work');
		assert.equal(routeOutline.run_hint, 'mf script-pack run code/route-outline scan src/main.rs --json');
		assert.ok(routeOutline.matched_skills.includes('axum-code-change'));
		assert.ok(routeOutline.matched_phases.includes('before_change'));
		assert.equal(routeOutline.report_schema_file, 'route-outline-report.schema.json');
	} finally {
		removeTempProject(projectPath);
	}
});

test('script-pack suggest recommends export diff after source changes', () => {
	const projectPath = createTempProject();

	try {
		initProject(projectPath);
		mkdirSync(path.join(projectPath, 'src'));
		writeFileSync(path.join(projectPath, 'src', 'api.ts'), 'export function resolve(): string { return "ok"; }\n');

		const { result, report } = runScriptPackSuggestJson(projectPath, [
			'--path',
			'src/api.ts',
			'--skill',
			'api-contract-change',
			'--phase',
			'after_change',
		]);

		assert.equal(result.status, 0, result.stderr || result.stdout);

		const exportDiff = report.suggestions.find((suggestion) => suggestion.script_ref === 'code/export-diff');
		assert.ok(exportDiff, 'code/export-diff should be suggested for API contract source changes');
		assert.equal(exportDiff.run_hint, 'mf script-pack run code/export-diff compare src/api.ts --base HEAD --json');
		assert.ok(exportDiff.matched_skills.includes('api-contract-change'));
		assert.ok(exportDiff.matched_phases.includes('after_change'));
		assert.equal(exportDiff.report_schema_file, 'export-diff-report.schema.json');
	} finally {
		removeTempProject(projectPath);
	}
});

test('script-pack suggest treats JavaScript test files as code navigation targets', () => {
	const projectPath = createTempProject();

	try {
		initProject(projectPath);
		mkdirSync(path.join(projectPath, 'tests', 'cli'), { recursive: true });
		writeFileSync(path.join(projectPath, 'tests', 'cli', 'package.test.js'), 'test("package", () => {});\n');

		const { result, report } = runScriptPackSuggestJson(projectPath, [
			'--path',
			'tests/cli/package.test.js',
			'--phase',
			'before_change',
		]);

		assert.equal(result.status, 0, result.stderr || result.stdout);
		assert.ok(
			report.analyzed_paths.some(
				(entry) =>
					entry.path === 'tests/cli/package.test.js' &&
					entry.surfaces.includes('test') &&
					entry.surfaces.includes('source'),
			),
		);

		const outline = report.suggestions.find((suggestion) => suggestion.script_ref === 'code/outline');
		assert.ok(outline, 'code/outline should be suggested for JavaScript test paths');
		assert.equal(outline.run_hint, 'mf script-pack run code/outline scan tests/cli/package.test.js --json');
	} finally {
		removeTempProject(projectPath);
	}
});

test('script-pack suggest treats Astro, Svelte, Go, Rust, and Python files as code navigation targets', () => {
	const projectPath = createTempProject();

	try {
		initProject(projectPath);
		mkdirSync(path.join(projectPath, 'src'));
		writeFileSync(path.join(projectPath, 'src', 'service.astro'), '---\nexport function resolve(): string { return "ok"; }\n---\n');
		writeFileSync(path.join(projectPath, 'src', 'service.go'), 'func Resolve() string { return "ok" }\n');
		writeFileSync(path.join(projectPath, 'src', 'service.rs'), 'pub fn resolve() -> String { "ok".to_owned() }\n');
		writeFileSync(path.join(projectPath, 'src', 'service.py'), 'def resolve() -> str:\n    return "ok"\n');
		writeFileSync(path.join(projectPath, 'src', 'service.svelte'), '<script lang="ts">\nexport function resolve(): string { return "ok"; }\n</script>\n');

		const { result, report } = runScriptPackSuggestJson(projectPath, [
			'--path',
			'src/service.astro',
			'--path',
			'src/service.go',
			'--path',
			'src/service.rs',
			'--path',
			'src/service.py',
			'--path',
			'src/service.svelte',
			'--phase',
			'before_change',
		]);

		assert.equal(result.status, 0, result.stderr || result.stdout);
		assert.ok(report.analyzed_paths.every((entry) => entry.surfaces.includes('source')));

		const outline = report.suggestions.find((suggestion) => suggestion.script_ref === 'code/outline');
		assert.ok(outline, 'code/outline should be suggested for Astro, Svelte, Go, Rust, and Python paths');
		assert.equal(
			outline.run_hint,
			'mf script-pack run code/outline scan src/service.astro src/service.go src/service.py src/service.rs src/service.svelte --json',
		);
	} finally {
		removeTempProject(projectPath);
	}
});

test('script-pack suggest recommends route outline for NestJS source work', () => {
	const projectPath = createTempProject();

	try {
		initProject(projectPath);
		mkdirSync(path.join(projectPath, 'src'));
		writeFileSync(
			path.join(projectPath, 'src', 'users.controller.ts'),
			'import { Controller, Get } from "@nestjs/common";\n',
		);

		const { result, report } = runScriptPackSuggestJson(projectPath, [
			'--path',
			'src/users.controller.ts',
			'--skill',
			'nestjs-code-change',
			'--phase',
			'before_change',
		]);

		assert.equal(result.status, 0, result.stderr || result.stdout);

		const routeOutline = report.suggestions.find((suggestion) => suggestion.script_ref === 'code/route-outline');
		assert.ok(routeOutline, 'code/route-outline should be suggested for NestJS route work');
		assert.equal(
			routeOutline.run_hint,
			'mf script-pack run code/route-outline scan src/users.controller.ts --json',
		);
		assert.ok(routeOutline.matched_skills.includes('nestjs-code-change'));
		assert.ok(routeOutline.matched_phases.includes('before_change'));
		assert.equal(routeOutline.report_schema_file, 'route-outline-report.schema.json');
	} finally {
		removeTempProject(projectPath);
	}
});
