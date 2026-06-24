import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { test } from 'node:test';

import { createTempProject, initProject, removeTempProject, runCli } from './run-support.js';

function runTextBudgetJson(projectPath, args) {
	const result = runCli(projectPath, ['script-pack', 'run', 'core/text-budget', 'check', ...args, '--json']);
	return { result, report: JSON.parse(result.stdout) };
}

function runGeneratedBoundaryJson(projectPath, args) {
	const result = runCli(projectPath, ['script-pack', 'run', 'repo/generated-boundary', 'check', ...args, '--json']);
	return { result, report: JSON.parse(result.stdout) };
}

function runRelatedFilesJson(projectPath, args) {
	const result = runCli(projectPath, ['script-pack', 'run', 'repo/related-files', 'map', ...args, '--json']);
	return { result, report: JSON.parse(result.stdout) };
}

function runConfigChainJson(projectPath, args) {
	const result = runCli(projectPath, ['script-pack', 'run', 'repo/config-chain', 'inspect', ...args, '--json']);
	return { result, report: JSON.parse(result.stdout) };
}

function runEnvContractJson(projectPath, args) {
	const result = runCli(projectPath, ['script-pack', 'run', 'repo/env-contract', 'scan', ...args, '--json']);
	return { result, report: JSON.parse(result.stdout) };
}

function runSecretRiskScanJson(projectPath, args) {
	const result = runCli(projectPath, ['script-pack', 'run', 'repo/secret-risk-scan', 'scan', ...args, '--json']);
	return { result, report: JSON.parse(result.stdout) };
}

function runCodeOutlineJson(projectPath, args) {
	const result = runCli(projectPath, ['script-pack', 'run', 'code/outline', 'scan', ...args, '--json']);
	return { result, report: JSON.parse(result.stdout) };
}

function runCodeDependencyGraphJson(projectPath, args) {
	const result = runCli(projectPath, ['script-pack', 'run', 'code/dependency-graph', 'scan', ...args, '--json']);
	return { result, report: JSON.parse(result.stdout) };
}

function runCodeChangeImpactJson(projectPath, args) {
	const result = runCli(projectPath, ['script-pack', 'run', 'code/change-impact', 'analyze', ...args, '--json']);
	return { result, report: JSON.parse(result.stdout) };
}

function runCodeSymbolReadJson(projectPath, args) {
	const result = runCli(projectPath, ['script-pack', 'run', 'code/symbol-read', 'read', ...args, '--json']);
	return { result, report: JSON.parse(result.stdout) };
}

function runCodeRouteOutlineJson(projectPath, args) {
	const result = runCli(projectPath, ['script-pack', 'run', 'code/route-outline', 'scan', ...args, '--json']);
	return { result, report: JSON.parse(result.stdout) };
}

function runCodeExportDiffJson(projectPath, args) {
	const result = runCli(projectPath, ['script-pack', 'run', 'code/export-diff', 'compare', ...args, '--json']);
	return { result, report: JSON.parse(result.stdout) };
}

function runDocsReferenceDriftJson(projectPath, args) {
	const result = runCli(projectPath, ['script-pack', 'run', 'docs/reference-drift', 'check', ...args, '--json']);
	return { result, report: JSON.parse(result.stdout) };
}

function runScriptPackSuggestJson(projectPath, args) {
	const result = runCli(projectPath, ['script-pack', 'suggest', ...args, '--json']);
	return { result, report: JSON.parse(result.stdout) };
}

function runGit(projectPath, args) {
	return spawnSync('git', ['-C', projectPath, ...args], {
		cwd: projectPath,
		encoding: 'utf8',
		stdio: ['ignore', 'pipe', 'pipe'],
		windowsHide: true,
	});
}

function commitGitBaseline(projectPath) {
	for (const args of [
		['init'],
		['config', 'user.email', 'mustflow-tests@example.invalid'],
		['config', 'user.name', 'mustflow tests'],
		['add', '.'],
		['commit', '-m', 'baseline'],
	]) {
		const result = runGit(projectPath, args);
		assert.equal(result.status, 0, result.stderr || result.stdout);
	}
}

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

		const repoPack = report.packs.find((pack) => pack.id === 'repo');
		const configChain = repoPack?.scripts.find((script) => script.ref === 'repo/config-chain');
		const envContract = repoPack?.scripts.find((script) => script.ref === 'repo/env-contract');
		const secretRiskScan = repoPack?.scripts.find((script) => script.ref === 'repo/secret-risk-scan');
		const generatedBoundary = repoPack?.scripts.find((script) => script.ref === 'repo/generated-boundary');

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

test('code-outline scans source symbols with stable path, line, and hash metadata', () => {
	const projectPath = createTempProject();

	try {
		initProject(projectPath);
		mkdirSync(path.join(projectPath, 'src'));
		writeFileSync(
			path.join(projectPath, 'src', 'sample.ts'),
			[
				'export async function loadThing(id: string) {',
				'  return id.toUpperCase();',
				'}',
				'',
				'export class ThingBox {',
				'  value = 1;',
				'}',
				'',
				'type LocalShape = { value: number };',
				'',
			].join('\n'),
		);

		const { result, report } = runCodeOutlineJson(projectPath, ['src']);

		assert.equal(result.status, 0, result.stderr || result.stdout);
		assert.equal(report.command, 'script-pack');
		assert.equal(report.pack_id, 'code');
		assert.equal(report.script_id, 'outline');
		assert.equal(report.script_ref, 'code/outline');
		assert.equal(report.status, 'passed');
		assert.equal(report.ok, true);
		assert.equal(report.files[0].path, 'src/sample.ts');
		assert.equal(report.files[0].language, 'typescript');
		assert.match(report.files[0].sha256, /^sha256:[a-f0-9]{64}$/u);
		assert.match(report.input_hash, /^sha256:[a-f0-9]{64}$/u);
		assert.deepEqual(report.anchors, []);

		const loadThing = report.symbols.find((symbol) => symbol.name === 'loadThing');
		assert.ok(loadThing, 'loadThing should be outlined');
		assert.equal(loadThing.kind, 'function');
		assert.equal(loadThing.exported, true);
		assert.equal(loadThing.async, true);
		assert.equal(loadThing.start_line, 1);
		assert.equal(loadThing.end_line, 3);
		assert.equal(loadThing.path, 'src/sample.ts');
		assert.equal(loadThing.return_type, null);
		assert.equal(loadThing.return_behavior, 'value');
		assert.equal(loadThing.return_count, 1);
		assert.deepEqual(loadThing.return_lines, [2]);
		assert.equal(loadThing.return_preview, 'id.toUpperCase()');
		assert.match(loadThing.content_sha256, /^sha256:[a-f0-9]{64}$/u);

		const thingBox = report.symbols.find((symbol) => symbol.name === 'ThingBox');
		assert.ok(thingBox, 'ThingBox should be outlined');
		assert.equal(thingBox.kind, 'class');
		assert.equal(thingBox.start_line, 5);
		assert.equal(thingBox.end_line, 7);
		assert.equal(thingBox.return_type, null);
		assert.equal(thingBox.return_behavior, 'unknown');
		assert.equal(thingBox.return_count, 0);
		assert.deepEqual(thingBox.return_lines, []);
		assert.equal(thingBox.return_preview, null);
	} finally {
		removeTempProject(projectPath);
	}
});

test('code-outline reports source anchors with conservative target symbol metadata', () => {
	const projectPath = createTempProject();

	try {
		initProject(projectPath);
		mkdirSync(path.join(projectPath, 'src'));
		writeFileSync(
			path.join(projectPath, 'src', 'anchored.ts'),
			[
				'/**',
				' * mf:anchor auth.session.resolve',
				' * purpose: Resolve validated auth session.',
				' * search: auth, session, resolve',
				' * invariant: Session resolution must stay after request validation.',
				' * risk: authz, security',
				' */',
				'export function resolveSession(token: string): string {',
				'  return token.trim();',
				'}',
				'',
			].join('\n'),
		);

		const { result, report } = runCodeOutlineJson(projectPath, ['src/anchored.ts']);

		assert.equal(result.status, 0, result.stderr || result.stdout);
		assert.equal(report.anchors.length, 1);

		const anchor = report.anchors[0];
		assert.equal(anchor.id, 'auth.session.resolve');
		assert.equal(anchor.path, 'src/anchored.ts');
		assert.equal(anchor.line_start, 2);
		assert.equal(anchor.line_end, 6);
		assert.equal(anchor.purpose, 'Resolve validated auth session.');
		assert.deepEqual(anchor.search, ['auth', 'session', 'resolve']);
		assert.equal(anchor.invariant, 'Session resolution must stay after request validation.');
		assert.deepEqual(anchor.risk, ['authz', 'security']);
		assert.equal(anchor.navigation_only, true);
		assert.equal(anchor.can_instruct_agent, false);
		assert.equal(anchor.target_kind, 'function');
		assert.equal(anchor.target_name, 'resolveSession');
		assert.equal(anchor.target_start_line, 8);

		const target = report.symbols.find((symbol) => symbol.name === 'resolveSession');
		assert.ok(target, 'resolveSession should be outlined');
		assert.equal(anchor.target_symbol_id, target.id);
	} finally {
		removeTempProject(projectPath);
	}
});

test('code-outline reports explicit return annotations and return behavior metadata', () => {
	const projectPath = createTempProject();

	try {
		initProject(projectPath);
		mkdirSync(path.join(projectPath, 'src'));
		writeFileSync(
			path.join(projectPath, 'src', 'returns.ts'),
			[
				'export async function loadThing(id: string): Promise<string> {',
				'  return id.toUpperCase();',
				'}',
				'',
				'export function maybe(flag: boolean): string | undefined {',
				'  if (flag) return "yes";',
				'  return;',
				'}',
				'',
				'const expression = (value: number): number => value + 1;',
				'',
				'export function failFast(): never {',
				'  throw new Error("boom");',
				'}',
				'',
			].join('\n'),
		);

		const { result, report } = runCodeOutlineJson(projectPath, ['src/returns.ts']);

		assert.equal(result.status, 0, result.stderr || result.stdout);

		const loadThing = report.symbols.find((symbol) => symbol.name === 'loadThing');
		assert.ok(loadThing, 'loadThing should be outlined');
		assert.equal(loadThing.return_type, 'Promise<string>');
		assert.equal(loadThing.return_behavior, 'value');
		assert.equal(loadThing.return_count, 1);
		assert.deepEqual(loadThing.return_lines, [2]);
		assert.equal(loadThing.return_preview, 'id.toUpperCase()');

		const maybe = report.symbols.find((symbol) => symbol.name === 'maybe');
		assert.ok(maybe, 'maybe should be outlined');
		assert.equal(maybe.return_type, 'string | undefined');
		assert.equal(maybe.return_behavior, 'mixed');
		assert.equal(maybe.return_count, 2);
		assert.deepEqual(maybe.return_lines, [6, 7]);
		assert.equal(maybe.return_preview, '"yes"');

		const expression = report.symbols.find((symbol) => symbol.name === 'expression');
		assert.ok(expression, 'expression should be outlined');
		assert.equal(expression.return_type, 'number');
		assert.equal(expression.return_behavior, 'value');
		assert.equal(expression.return_count, 0);
		assert.deepEqual(expression.return_lines, []);
		assert.equal(expression.return_preview, 'value + 1');

		const failFast = report.symbols.find((symbol) => symbol.name === 'failFast');
		assert.ok(failFast, 'failFast should be outlined');
		assert.equal(failFast.return_type, 'never');
		assert.equal(failFast.return_behavior, 'throws_only');
		assert.equal(failFast.return_count, 0);
		assert.deepEqual(failFast.return_lines, []);
		assert.equal(failFast.return_preview, null);
	} finally {
		removeTempProject(projectPath);
	}
});

test('dependency-graph scans relative imports with bounded node and edge metadata', () => {
	const projectPath = createTempProject();

	try {
		initProject(projectPath);
		mkdirSync(path.join(projectPath, 'src'));
		writeFileSync(
			path.join(projectPath, 'src', 'feature.ts'),
			[
				'import { helper } from "./helper";',
				'export { value } from "./value";',
				'export function feature() { return helper(); }',
				'',
			].join('\n'),
		);
		writeFileSync(path.join(projectPath, 'src', 'helper.ts'), 'const value = require("./value");\nexport function helper() { return value; }\n');
		writeFileSync(path.join(projectPath, 'src', 'value.ts'), 'export const value = 1;\n');
		writeFileSync(path.join(projectPath, 'src', 'consumer.ts'), 'import("./feature");\n');

		const { result, report } = runCodeDependencyGraphJson(projectPath, ['src/feature.ts', '--max-depth', '2']);

		assert.equal(result.status, 0, result.stderr || result.stdout);
		assert.equal(report.command, 'script-pack');
		assert.equal(report.pack_id, 'code');
		assert.equal(report.script_id, 'dependency-graph');
		assert.equal(report.script_ref, 'code/dependency-graph');
		assert.equal(report.status, 'passed');
		assert.equal(report.ok, true);
		assert.equal(report.truncated, false);
		assert.equal(report.targets[0].path, 'src/feature.ts');
		assert.match(report.input_hash, /^sha256:[a-f0-9]{64}$/u);

		const nodePaths = report.nodes.map((node) => node.path);
		assert.ok(nodePaths.includes('src/feature.ts'));
		assert.ok(nodePaths.includes('src/helper.ts'));
		assert.ok(nodePaths.includes('src/value.ts'));
		assert.ok(nodePaths.includes('src/consumer.ts'));

		const edges = new Map(report.edges.map((edge) => [`${edge.kind}:${edge.source_path}->${edge.target_path}`, edge]));
		assert.equal(edges.get('static_import:src/feature.ts->src/helper.ts')?.line, 1);
		assert.equal(edges.get('static_export:src/feature.ts->src/value.ts')?.line, 2);
		assert.equal(edges.get('require:src/helper.ts->src/value.ts')?.line, 1);
		assert.equal(edges.get('dynamic_import:src/consumer.ts->src/feature.ts')?.line, 1);
		assert.deepEqual(report.findings, []);
		assert.deepEqual(report.issues, []);
	} finally {
		removeTempProject(projectPath);
	}
});

test('dependency-graph reports import cycles as hints without failing the helper', () => {
	const projectPath = createTempProject();

	try {
		initProject(projectPath);
		mkdirSync(path.join(projectPath, 'src'));
		writeFileSync(path.join(projectPath, 'src', 'a.ts'), 'import { b } from "./b";\nexport const a = b;\n');
		writeFileSync(path.join(projectPath, 'src', 'b.ts'), 'import { a } from "./a";\nexport const b = a;\n');

		const { result, report } = runCodeDependencyGraphJson(projectPath, ['src/a.ts']);

		assert.equal(result.status, 0, result.stderr || result.stdout);
		assert.equal(report.status, 'passed');
		assert.equal(report.ok, true);
		assert.ok(report.cycles.some((cycle) => cycle.includes('src/a.ts') && cycle.includes('src/b.ts')));
	} finally {
		removeTempProject(projectPath);
	}
});

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
		assert.ok(report.script_hints.some((hint) => hint.script_ref === 'code/dependency-graph'));
		assert.ok(report.verification_hints.some((hint) => hint.intent === 'test_related'));
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
		assert.ok(report.impacts.some((impact) => impact.path === 'tests/cli/schema.test.js'));
		assert.ok(report.verification_hints.some((hint) => hint.intent === 'test_release'));
		assert.ok(report.verification_hints.some((hint) => hint.intent === 'docs_validate_fast'));
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

test('code-outline scans Go, Rust, and Python symbols with return metadata', () => {
	const projectPath = createTempProject();

	try {
		initProject(projectPath);
		mkdirSync(path.join(projectPath, 'src'));
		writeFileSync(
			path.join(projectPath, 'src', 'session.go'),
			[
				'package demo',
				'',
				'type Session struct {',
				'  ID string',
				'}',
				'',
				'func ResolveSession(token string) (string, error) {',
				'  return token, nil',
				'}',
				'',
				'func (s Session) privateValue() string {',
				'  return s.ID',
				'}',
				'',
			].join('\n'),
		);
		writeFileSync(
			path.join(projectPath, 'src', 'session.rs'),
			[
				'pub struct Session { pub id: String }',
				'',
				'pub async fn resolve_session(token: &str) -> Result<String, Error> {',
				'    Ok(token.to_owned())',
				'}',
				'',
				'pub enum Error { Empty }',
				'',
			].join('\n'),
		);
		writeFileSync(
			path.join(projectPath, 'src', 'session.py'),
			[
				'class Session:',
				'    pass',
				'',
				'async def resolve_session(token: str) -> str:',
				'    if not token:',
				'        return ""',
				'    return token.strip()',
				'',
			].join('\n'),
		);

		const { result, report } = runCodeOutlineJson(projectPath, ['src']);

		assert.equal(result.status, 0, result.stderr || result.stdout);
		assert.deepEqual(
			report.files.map((file) => [file.path, file.language]).sort(),
			[
				['src/session.go', 'go'],
				['src/session.py', 'python'],
				['src/session.rs', 'rust'],
			],
		);
		assert.ok(report.policy.extensions.includes('.go'));
		assert.ok(report.policy.extensions.includes('.rs'));
		assert.ok(report.policy.extensions.includes('.py'));

		const goFunction = report.symbols.find((symbol) => symbol.path === 'src/session.go' && symbol.name === 'ResolveSession');
		assert.ok(goFunction, 'Go function should be outlined');
		assert.equal(goFunction.language, 'go');
		assert.equal(goFunction.kind, 'function');
		assert.equal(goFunction.exported, true);
		assert.equal(goFunction.return_type, '(string, error)');
		assert.equal(goFunction.return_behavior, 'value');
		assert.deepEqual(goFunction.return_lines, [8]);
		assert.equal(goFunction.return_preview, 'token, nil');

		const goMethod = report.symbols.find((symbol) => symbol.path === 'src/session.go' && symbol.name === 'privateValue');
		assert.ok(goMethod, 'Go method should be outlined');
		assert.equal(goMethod.exported, false);
		assert.equal(goMethod.return_type, 'string');
		assert.deepEqual(goMethod.return_lines, [12]);

		const rustFunction = report.symbols.find((symbol) => symbol.path === 'src/session.rs' && symbol.name === 'resolve_session');
		assert.ok(rustFunction, 'Rust function should be outlined');
		assert.equal(rustFunction.language, 'rust');
		assert.equal(rustFunction.kind, 'function');
		assert.equal(rustFunction.exported, true);
		assert.equal(rustFunction.async, true);
		assert.equal(rustFunction.return_type, 'Result<String, Error>');
		assert.equal(rustFunction.return_behavior, 'value');
		assert.deepEqual(rustFunction.return_lines, []);
		assert.equal(rustFunction.return_preview, 'Ok(token.to_owned())');

		const pythonFunction = report.symbols.find((symbol) => symbol.path === 'src/session.py' && symbol.name === 'resolve_session');
		assert.ok(pythonFunction, 'Python function should be outlined');
		assert.equal(pythonFunction.language, 'python');
		assert.equal(pythonFunction.kind, 'function');
		assert.equal(pythonFunction.exported, true);
		assert.equal(pythonFunction.async, true);
		assert.equal(pythonFunction.return_type, 'str');
		assert.equal(pythonFunction.return_behavior, 'value');
		assert.deepEqual(pythonFunction.return_lines, [6, 7]);
		assert.equal(pythonFunction.return_preview, '""');
	} finally {
		removeTempProject(projectPath);
	}
});

test('code-outline scans Astro frontmatter and Svelte script symbols with original line metadata', () => {
	const projectPath = createTempProject();

	try {
		initProject(projectPath);
		mkdirSync(path.join(projectPath, 'src'));
		writeFileSync(
			path.join(projectPath, 'src', 'Card.astro'),
			[
				'---',
				'export function loadThing(id: string): string {',
				'  return id.trim();',
				'}',
				'const viewModel = (name: string): string => name.toUpperCase();',
				'---',
				'<script>const ignoredMarkupScript = () => "markup";</script>',
				'<h1>{viewModel("ok")}</h1>',
				'',
			].join('\n'),
		);
		writeFileSync(
			path.join(projectPath, 'src', 'Card.svelte'),
			[
				'<script lang="ts" context="module">',
				'  export function makeTitle(value: string): string {',
				'    return value.trim();',
				'  }',
				'</script>',
				'',
				'<script lang="ts">',
				'  const localValue = (count: number): number => count + 1;',
				'</script>',
				'',
				'<h1>{makeTitle("ok")}</h1>',
				'',
			].join('\n'),
		);

		const { result, report } = runCodeOutlineJson(projectPath, ['src']);

		assert.equal(result.status, 0, result.stderr || result.stdout);
		assert.deepEqual(
			report.files.map((file) => [file.path, file.language]).sort(),
			[
				['src/Card.astro', 'astro'],
				['src/Card.svelte', 'svelte'],
			],
		);
		assert.ok(report.policy.extensions.includes('.astro'));
		assert.ok(report.policy.extensions.includes('.svelte'));

		const astroFunction = report.symbols.find((symbol) => symbol.path === 'src/Card.astro' && symbol.name === 'loadThing');
		assert.ok(astroFunction, 'Astro frontmatter function should be outlined');
		assert.equal(astroFunction.language, 'astro');
		assert.equal(astroFunction.kind, 'function');
		assert.equal(astroFunction.start_line, 2);
		assert.equal(astroFunction.end_line, 4);
		assert.equal(astroFunction.return_type, 'string');
		assert.equal(astroFunction.return_behavior, 'value');
		assert.deepEqual(astroFunction.return_lines, [3]);
		assert.equal(astroFunction.return_preview, 'id.trim()');

		const astroArrow = report.symbols.find((symbol) => symbol.path === 'src/Card.astro' && symbol.name === 'viewModel');
		assert.ok(astroArrow, 'Astro frontmatter arrow function should be outlined');
		assert.equal(astroArrow.start_line, 5);
		assert.equal(astroArrow.return_type, 'string');
		assert.equal(astroArrow.return_preview, 'name.toUpperCase()');
		assert.equal(
			report.symbols.some((symbol) => symbol.name === 'ignoredMarkupScript'),
			false,
			'Astro markup script tags are outside this frontmatter outline slice',
		);

		const svelteModuleFunction = report.symbols.find((symbol) => symbol.path === 'src/Card.svelte' && symbol.name === 'makeTitle');
		assert.ok(svelteModuleFunction, 'Svelte module script function should be outlined');
		assert.equal(svelteModuleFunction.language, 'svelte');
		assert.equal(svelteModuleFunction.start_line, 2);
		assert.equal(svelteModuleFunction.end_line, 4);
		assert.equal(svelteModuleFunction.return_type, 'string');
		assert.deepEqual(svelteModuleFunction.return_lines, [3]);
		assert.equal(svelteModuleFunction.return_preview, 'value.trim()');

		const svelteInstanceFunction = report.symbols.find((symbol) => symbol.path === 'src/Card.svelte' && symbol.name === 'localValue');
		assert.ok(svelteInstanceFunction, 'Svelte instance script arrow function should be outlined');
		assert.equal(svelteInstanceFunction.language, 'svelte');
		assert.equal(svelteInstanceFunction.start_line, 8);
		assert.equal(svelteInstanceFunction.return_type, 'number');
		assert.equal(svelteInstanceFunction.return_preview, 'count + 1');
	} finally {
		removeTempProject(projectPath);
	}
});

test('code-symbol-read resolves a symbol by start line and returns only the bounded snippet', () => {
	const projectPath = createTempProject();

	try {
		initProject(projectPath);
		mkdirSync(path.join(projectPath, 'src'));
		writeFileSync(
			path.join(projectPath, 'src', 'sample.ts'),
			[
				'const before = 1;',
				'',
				'export function target(value: string): string {',
				'  return value.trim();',
				'}',
				'',
				'const after = 2;',
				'',
			].join('\n'),
		);

		const { result, report } = runCodeSymbolReadJson(projectPath, [
			'src/sample.ts',
			'--start-line',
			'3',
			'--context-lines',
			'1',
		]);

		assert.equal(result.status, 0, result.stderr || result.stdout);
		assert.equal(report.command, 'script-pack');
		assert.equal(report.pack_id, 'code');
		assert.equal(report.script_id, 'symbol-read');
		assert.equal(report.script_ref, 'code/symbol-read');
		assert.equal(report.status, 'passed');
		assert.equal(report.ok, true);
		assert.equal(report.target.path, 'src/sample.ts');
		assert.equal(report.target.resolved_start_line, 3);
		assert.equal(report.target.resolved_end_line, 5);
		assert.equal(report.target.context_start_line, 2);
		assert.equal(report.target.context_end_line, 6);
		assert.equal(report.target.symbol.name, 'target');
		assert.equal(report.target.symbol.return_type, 'string');
		assert.equal(report.target.symbol.return_behavior, 'value');
		assert.equal(report.target.symbol.return_count, 1);
		assert.deepEqual(report.target.symbol.return_lines, [4]);
		assert.equal(report.target.symbol.return_preview, 'value.trim()');
		assert.equal(report.snippet.start_line, 2);
		assert.equal(report.snippet.end_line, 6);
		assert.match(report.snippet.text, /export function target/u);
		assert.doesNotMatch(report.snippet.text, /const after = 2/u);
		assert.match(report.input_hash, /^sha256:[a-f0-9]{64}$/u);
	} finally {
		removeTempProject(projectPath);
	}
});

test('code-symbol-read resolves a source anchor to its target symbol snippet', () => {
	const projectPath = createTempProject();

	try {
		initProject(projectPath);
		mkdirSync(path.join(projectPath, 'src'));
		writeFileSync(
			path.join(projectPath, 'src', 'anchored.ts'),
			[
				'const before = 1;',
				'',
				'/**',
				' * mf:anchor auth.session.resolve',
				' * purpose: Resolve validated auth session.',
				' * search: auth, session, resolve',
				' * invariant: Session resolution must stay after request validation.',
				' * risk: authz, security',
				' */',
				'export function resolveSession(token: string): string {',
				'  return token.trim();',
				'}',
				'',
				'const after = 2;',
				'',
			].join('\n'),
		);

		const { result, report } = runCodeSymbolReadJson(projectPath, [
			'--anchor',
			'auth.session.resolve',
			'--context-lines',
			'1',
		]);

		assert.equal(result.status, 0, result.stderr || result.stdout);
		assert.equal(report.policy.anchor_id, 'auth.session.resolve');
		assert.equal(report.policy.start_line, null);
		assert.equal(report.target.requested_anchor_id, 'auth.session.resolve');
		assert.equal(report.target.requested_start_line, null);
		assert.equal(report.target.anchor.id, 'auth.session.resolve');
		assert.equal(report.target.anchor.navigation_only, true);
		assert.equal(report.target.anchor.can_instruct_agent, false);
		assert.equal(report.target.path, 'src/anchored.ts');
		assert.equal(report.target.resolved_start_line, 10);
		assert.equal(report.target.resolved_end_line, 12);
		assert.equal(report.target.context_start_line, 9);
		assert.equal(report.target.context_end_line, 13);
		assert.equal(report.target.symbol.name, 'resolveSession');
		assert.equal(report.target.symbol.return_type, 'string');
		assert.equal(report.target.symbol.return_preview, 'token.trim()');
		assert.equal(report.snippet.start_line, 9);
		assert.equal(report.snippet.end_line, 13);
		assert.match(report.snippet.text, /export function resolveSession/u);
		assert.doesNotMatch(report.snippet.text, /const before = 1/u);
	} finally {
		removeTempProject(projectPath);
	}
});

test('code-symbol-read resolves Go, Rust, and Python symbols by start line', () => {
	const projectPath = createTempProject();

	try {
		initProject(projectPath);
		mkdirSync(path.join(projectPath, 'src'));
		writeFileSync(
			path.join(projectPath, 'src', 'service.go'),
			[
				'package demo',
				'',
				'func ResolveSession(token string) (string, error) {',
				'  return token, nil',
				'}',
				'',
			].join('\n'),
		);
		writeFileSync(
			path.join(projectPath, 'src', 'service.rs'),
			[
				'pub fn resolve_session(token: &str) -> Result<String, Error> {',
				'    Ok(token.to_owned())',
				'}',
				'',
			].join('\n'),
		);
		writeFileSync(
			path.join(projectPath, 'src', 'service.py'),
			[
				'async def resolve_session(token: str) -> str:',
				'    return token.strip()',
				'',
			].join('\n'),
		);

		const cases = [
			{
				path: 'src/service.go',
				startLine: '3',
				language: 'go',
				name: 'ResolveSession',
				returnType: '(string, error)',
				returnPreview: 'token, nil',
			},
			{
				path: 'src/service.rs',
				startLine: '1',
				language: 'rust',
				name: 'resolve_session',
				returnType: 'Result<String, Error>',
				returnPreview: 'Ok(token.to_owned())',
			},
			{
				path: 'src/service.py',
				startLine: '1',
				language: 'python',
				name: 'resolve_session',
				returnType: 'str',
				returnPreview: 'token.strip()',
			},
		];

		for (const testCase of cases) {
			const { result, report } = runCodeSymbolReadJson(projectPath, [
				testCase.path,
				'--start-line',
				testCase.startLine,
			]);

			assert.equal(result.status, 0, `${testCase.path}: ${result.stderr || result.stdout}`);
			assert.equal(report.target.language, testCase.language, testCase.path);
			assert.equal(report.target.symbol.name, testCase.name, testCase.path);
			assert.equal(report.target.symbol.return_type, testCase.returnType, testCase.path);
			assert.equal(report.target.symbol.return_behavior, 'value', testCase.path);
			assert.equal(report.target.symbol.return_preview, testCase.returnPreview, testCase.path);
			assert.match(report.snippet.text, new RegExp(testCase.name, 'u'), testCase.path);
		}
	} finally {
		removeTempProject(projectPath);
	}
});

test('code-symbol-read resolves Astro and Svelte embedded symbols by start line', () => {
	const projectPath = createTempProject();

	try {
		initProject(projectPath);
		mkdirSync(path.join(projectPath, 'src'));
		writeFileSync(
			path.join(projectPath, 'src', 'Card.astro'),
			[
				'---',
				'export function loadThing(id: string): string {',
				'  return id.trim();',
				'}',
				'---',
				'<h1>{loadThing("ok")}</h1>',
				'',
			].join('\n'),
		);
		writeFileSync(
			path.join(projectPath, 'src', 'Card.svelte'),
			[
				'<script lang="ts">',
				'  export function makeTitle(value: string): string {',
				'    return value.trim();',
				'  }',
				'</script>',
				'',
				'<h1>{makeTitle("ok")}</h1>',
				'',
			].join('\n'),
		);

		const cases = [
			{
				path: 'src/Card.astro',
				startLine: '2',
				language: 'astro',
				name: 'loadThing',
				returnPreview: 'id.trim()',
				contextStartLine: 1,
				contextEndLine: 5,
				boundaryPattern: /^---/u,
			},
			{
				path: 'src/Card.svelte',
				startLine: '2',
				language: 'svelte',
				name: 'makeTitle',
				returnPreview: 'value.trim()',
				contextStartLine: 1,
				contextEndLine: 5,
				boundaryPattern: /^<script lang="ts">/u,
			},
		];

		for (const testCase of cases) {
			const { result, report } = runCodeSymbolReadJson(projectPath, [
				testCase.path,
				'--start-line',
				testCase.startLine,
				'--context-lines',
				'1',
			]);

			assert.equal(result.status, 0, `${testCase.path}: ${result.stderr || result.stdout}`);
			assert.equal(report.target.language, testCase.language, testCase.path);
			assert.equal(report.target.symbol.name, testCase.name, testCase.path);
			assert.equal(report.target.symbol.return_type, 'string', testCase.path);
			assert.equal(report.target.symbol.return_behavior, 'value', testCase.path);
			assert.equal(report.target.symbol.return_preview, testCase.returnPreview, testCase.path);
			assert.equal(report.target.context_start_line, testCase.contextStartLine, testCase.path);
			assert.equal(report.target.context_end_line, testCase.contextEndLine, testCase.path);
			assert.match(report.snippet.text, testCase.boundaryPattern, testCase.path);
			assert.match(report.snippet.text, new RegExp(testCase.name, 'u'), testCase.path);
		}
	} finally {
		removeTempProject(projectPath);
	}
});

test('code-symbol-read resolves Go, Rust, and Python source anchors to target symbols', () => {
	const projectPath = createTempProject();

	try {
		initProject(projectPath);
		mkdirSync(path.join(projectPath, 'src'));
		writeFileSync(
			path.join(projectPath, 'src', 'anchored.go'),
			[
				'package demo',
				'',
				'// mf:anchor service.go.resolve',
				'// purpose: Resolve Go session.',
				'// search: go, session',
				'// risk: security',
				'func ResolveSession(token string) (string, error) {',
				'  return token, nil',
				'}',
				'',
			].join('\n'),
		);
		writeFileSync(
			path.join(projectPath, 'src', 'anchored.rs'),
			[
				'// mf:anchor service.rust.resolve',
				'// purpose: Resolve Rust session.',
				'// search: rust, session',
				'// risk: security',
				'pub fn resolve_session(token: &str) -> Result<String, Error> {',
				'    Ok(token.to_owned())',
				'}',
				'',
			].join('\n'),
		);
		writeFileSync(
			path.join(projectPath, 'src', 'anchored.py'),
			[
				'# mf:anchor service.python.resolve',
				'# purpose: Resolve Python session.',
				'# search: python, session',
				'# risk: security',
				'# Keep this nearby comment bridge readable for agents.',
				'async def resolve_session(token: str) -> str:',
				'    return token.strip()',
				'',
			].join('\n'),
		);

		const cases = [
			{
				anchor: 'service.go.resolve',
				path: 'src/anchored.go',
				language: 'go',
				name: 'ResolveSession',
				startLine: 7,
				returnPreview: 'token, nil',
			},
			{
				anchor: 'service.rust.resolve',
				path: 'src/anchored.rs',
				language: 'rust',
				name: 'resolve_session',
				startLine: 5,
				returnPreview: 'Ok(token.to_owned())',
			},
			{
				anchor: 'service.python.resolve',
				path: 'src/anchored.py',
				language: 'python',
				name: 'resolve_session',
				startLine: 6,
				returnPreview: 'token.strip()',
			},
		];

		for (const testCase of cases) {
			const { result, report } = runCodeSymbolReadJson(projectPath, [
				'--anchor',
				testCase.anchor,
				'--context-lines',
				'0',
			]);

			assert.equal(result.status, 0, `${testCase.anchor}: ${result.stderr || result.stdout}`);
			assert.equal(report.target.path, testCase.path, testCase.anchor);
			assert.equal(report.target.language, testCase.language, testCase.anchor);
			assert.equal(report.target.anchor.id, testCase.anchor, testCase.anchor);
			assert.equal(report.target.anchor.target_name, testCase.name, testCase.anchor);
			assert.equal(report.target.resolved_start_line, testCase.startLine, testCase.anchor);
			assert.equal(report.target.symbol.name, testCase.name, testCase.anchor);
			assert.equal(report.target.symbol.return_behavior, 'value', testCase.anchor);
			assert.equal(report.target.symbol.return_preview, testCase.returnPreview, testCase.anchor);
			assert.match(report.snippet.text, new RegExp(testCase.name, 'u'), testCase.anchor);
		}
	} finally {
		removeTempProject(projectPath);
	}
});

test('code-symbol-read resolves Astro and Svelte source anchors to embedded symbols', () => {
	const projectPath = createTempProject();

	try {
		initProject(projectPath);
		mkdirSync(path.join(projectPath, 'src'));
		writeFileSync(
			path.join(projectPath, 'src', 'Anchored.astro'),
			[
				'---',
				'// mf:anchor astro.load.thing',
				'// purpose: Resolve Astro data.',
				'// search: astro, load',
				'// risk: security',
				'export function loadThing(id: string): string {',
				'  return id.trim();',
				'}',
				'---',
				'<h1>{loadThing("ok")}</h1>',
				'',
			].join('\n'),
		);
		writeFileSync(
			path.join(projectPath, 'src', 'Anchored.svelte'),
			[
				'<script lang="ts">',
				'  // mf:anchor svelte.load.thing',
				'  // purpose: Resolve Svelte data.',
				'  // search: svelte, load',
				'  // risk: security',
				'  export function loadThing(id: string): string {',
				'    return id.trim();',
				'  }',
				'</script>',
				'',
			].join('\n'),
		);

		const cases = [
			{
				anchor: 'astro.load.thing',
				path: 'src/Anchored.astro',
				language: 'astro',
				name: 'loadThing',
				startLine: 6,
				returnPreview: 'id.trim()',
			},
			{
				anchor: 'svelte.load.thing',
				path: 'src/Anchored.svelte',
				language: 'svelte',
				name: 'loadThing',
				startLine: 6,
				returnPreview: 'id.trim()',
			},
		];

		for (const testCase of cases) {
			const { result, report } = runCodeSymbolReadJson(projectPath, [
				'--anchor',
				testCase.anchor,
				'--context-lines',
				'0',
			]);

			assert.equal(result.status, 0, `${testCase.anchor}: ${result.stderr || result.stdout}`);
			assert.equal(report.target.path, testCase.path, testCase.anchor);
			assert.equal(report.target.language, testCase.language, testCase.anchor);
			assert.equal(report.target.anchor.id, testCase.anchor, testCase.anchor);
			assert.equal(report.target.anchor.target_name, testCase.name, testCase.anchor);
			assert.equal(report.target.resolved_start_line, testCase.startLine, testCase.anchor);
			assert.equal(report.target.symbol.name, testCase.name, testCase.anchor);
			assert.equal(report.target.symbol.return_type, 'string', testCase.anchor);
			assert.equal(report.target.symbol.return_behavior, 'value', testCase.anchor);
			assert.equal(report.target.symbol.return_preview, testCase.returnPreview, testCase.anchor);
			assert.match(report.snippet.text, new RegExp(testCase.name, 'u'), testCase.anchor);
		}
	} finally {
		removeTempProject(projectPath);
	}
});

test('code-symbol-read rejects source anchors without a target symbol', () => {
	const projectPath = createTempProject();

	try {
		initProject(projectPath);
		mkdirSync(path.join(projectPath, 'src'));
		writeFileSync(
			path.join(projectPath, 'src', 'floating.ts'),
			[
				'/**',
				' * mf:anchor auth.session.floating',
				' * purpose: This anchor intentionally has no declaration target.',
				' * search: auth, floating',
				' * risk: security',
				' */',
				'const ordinaryValue = 1;',
				'',
			].join('\n'),
		);

		const { result, report } = runCodeSymbolReadJson(projectPath, ['--anchor', 'auth.session.floating']);

		assert.equal(result.status, 1, result.stderr || result.stdout);
		assert.equal(report.status, 'error');
		assert.equal(report.ok, false);
		assert.equal(report.target.anchor.id, 'auth.session.floating');
		assert.equal(report.target.resolved_start_line, null);
		assert.equal(report.target.symbol, null);
		assert.equal(report.snippet, null);
		assert.equal(report.findings[0].code, 'code_symbol_read_anchor_without_symbol');
	} finally {
		removeTempProject(projectPath);
	}
});

test('code-symbol-read rejects mixing source-anchor and explicit line selection modes', () => {
	const projectPath = createTempProject();

	try {
		initProject(projectPath);
		mkdirSync(path.join(projectPath, 'src'));
		writeFileSync(path.join(projectPath, 'src', 'sample.ts'), 'export const one = 1;\n');

		const result = runCli(projectPath, [
			'script-pack',
			'run',
			'code/symbol-read',
			'read',
			'src/sample.ts',
			'--anchor',
			'auth.session.resolve',
			'--start-line',
			'1',
		]);

		assert.equal(result.status, 1);
		assert.match(result.stderr, /Use either --anchor <id> or <path> with --start-line/);
	} finally {
		removeTempProject(projectPath);
	}
});

test('code-symbol-read can read an explicit line range when no symbol starts there', () => {
	const projectPath = createTempProject();

	try {
		initProject(projectPath);
		mkdirSync(path.join(projectPath, 'src'));
		writeFileSync(path.join(projectPath, 'src', 'sample.js'), 'const one = 1;\nconst two = 2;\n');

		const { result, report } = runCodeSymbolReadJson(projectPath, [
			'src/sample.js',
			'--start-line',
			'1',
			'--end-line',
			'1',
		]);

		assert.equal(result.status, 0, result.stderr || result.stdout);
		assert.equal(report.target.language, 'javascript');
		assert.equal(report.target.symbol, null);
		assert.equal(report.snippet.text, 'const one = 1;');
	} finally {
		removeTempProject(projectPath);
	}
});

test('code-outline reports unsupported files with a stable finding code', () => {
	const projectPath = createTempProject();

	try {
		initProject(projectPath);
		writeFileSync(path.join(projectPath, 'notes.md'), '# Notes\n');

		const { result, report } = runCodeOutlineJson(projectPath, ['notes.md']);

		assert.equal(result.status, 1, result.stderr || result.stdout);
		assert.equal(report.status, 'failed');
		assert.equal(report.ok, false);
		assert.equal(report.findings[0].code, 'code_outline_unsupported_file');
		assert.equal(report.findings[0].path, 'notes.md');
	} finally {
		removeTempProject(projectPath);
	}
});

test('code-outline reports max-files truncation with a stable finding code', () => {
	const projectPath = createTempProject();

	try {
		initProject(projectPath);
		mkdirSync(path.join(projectPath, 'src'));
		writeFileSync(path.join(projectPath, 'src', 'one.ts'), 'export const one = 1;\n');
		writeFileSync(path.join(projectPath, 'src', 'two.ts'), 'export const two = 2;\n');

		const { result, report } = runCodeOutlineJson(projectPath, ['src', '--max-files', '1']);

		assert.equal(result.status, 1, result.stderr || result.stdout);
		assert.equal(report.status, 'error');
		assert.equal(report.ok, false);
		assert.equal(report.files.length, 1);
		assert.ok(report.findings.some((finding) => finding.code === 'code_outline_max_files_exceeded'));
	} finally {
		removeTempProject(projectPath);
	}
});

test('code-symbol-read rejects explicit ranges outside the file', () => {
	const projectPath = createTempProject();

	try {
		initProject(projectPath);
		mkdirSync(path.join(projectPath, 'src'));
		writeFileSync(path.join(projectPath, 'src', 'sample.ts'), 'export const one = 1;\n');

		const { result, report } = runCodeSymbolReadJson(projectPath, [
			'src/sample.ts',
			'--start-line',
			'10',
			'--end-line',
			'10',
		]);

		assert.equal(result.status, 1, result.stderr || result.stdout);
		assert.equal(report.status, 'error');
		assert.equal(report.ok, false);
		assert.equal(report.target, null);
		assert.equal(report.snippet, null);
		assert.equal(report.findings[0].code, 'code_symbol_read_invalid_range');
		assert.equal(report.findings[0].start_line, 10);
		assert.equal(report.findings[0].end_line, 10);
	} finally {
		removeTempProject(projectPath);
	}
});

test('text-budget passes multilingual grapheme budgets', () => {
	const projectPath = createTempProject();

	try {
		initProject(projectPath);
		writeFileSync(path.join(projectPath, 'intro.txt'), '가나다👨‍👩‍👧‍👦');

		const { result, report } = runTextBudgetJson(projectPath, [
			'intro.txt',
			'--exact',
			'4',
			'--unit',
			'grapheme',
		]);

		assert.equal(result.status, 0, result.stderr || result.stdout);
		assert.equal(report.command, 'script-pack');
		assert.equal(report.pack_id, 'core');
		assert.equal(report.script_id, 'text-budget');
		assert.equal(report.script_ref, 'core/text-budget');
		assert.equal(report.status, 'passed');
		assert.equal(report.ok, true);
		assert.equal(report.metrics[0].value, 4);
		assert.equal(report.metrics[0].unit, 'grapheme');
		assert.match(report.input_hash, /^sha256:[a-f0-9]{64}$/u);
	} finally {
		removeTempProject(projectPath);
	}
});

test('text-budget reports budget violations with a stable finding code', () => {
	const projectPath = createTempProject();

	try {
		initProject(projectPath);
		writeFileSync(path.join(projectPath, 'summary.txt'), 'too long');

		const { result, report } = runTextBudgetJson(projectPath, [
			'summary.txt',
			'--max',
			'3',
			'--unit',
			'grapheme',
		]);

		assert.equal(result.status, 1, result.stderr || result.stdout);
		assert.equal(report.status, 'failed');
		assert.equal(report.ok, false);
		assert.equal(report.findings[0].code, 'text_budget_above_max');
		assert.equal(report.findings[0].actual, 8);
		assert.equal(report.findings[0].expected, 3);
	} finally {
		removeTempProject(projectPath);
	}
});

test('text-budget checks JSON string fields by JSON pointer', () => {
	const projectPath = createTempProject();

	try {
		initProject(projectPath);
		writeFileSync(path.join(projectPath, 'package.json'), `${JSON.stringify({ description: '짧은 소개' }, null, 2)}\n`);

		const { result, report } = runTextBudgetJson(projectPath, [
			'package.json',
			'--json-pointer',
			'/description',
			'--max',
			'5',
			'--unit',
			'word',
		]);

		assert.equal(result.status, 0, result.stderr || result.stdout);
		assert.equal(report.policy.json_pointer, '/description');
		assert.equal(report.metrics[0].value, 2);
		assert.equal(report.metrics[0].path, 'package.json');
		assert.deepEqual(report.findings, []);
	} finally {
		removeTempProject(projectPath);
	}
});

test('text-budget reports stable error finding codes', () => {
	const projectPath = createTempProject();

	try {
		initProject(projectPath);
		writeFileSync(path.join(projectPath, 'bad-json.json'), '{');
		writeFileSync(path.join(projectPath, 'data.json'), `${JSON.stringify({ description: 'hello', count: 3 }, null, 2)}\n`);

		const cases = [
			{
				name: 'path traversal',
				args: ['../outside.txt', '--max', '10'],
				code: 'text_budget_unreadable',
				pointer: null,
			},
			{
				name: 'json parse failure',
				args: ['bad-json.json', '--json-pointer', '/description', '--max', '10'],
				code: 'text_budget_json_parse_failed',
				pointer: '/description',
			},
			{
				name: 'invalid json pointer',
				args: ['data.json', '--json-pointer', 'description', '--max', '10'],
				code: 'text_budget_json_pointer_invalid',
				pointer: 'description',
			},
			{
				name: 'missing json pointer',
				args: ['data.json', '--json-pointer', '/missing', '--max', '10'],
				code: 'text_budget_json_pointer_missing',
				pointer: '/missing',
			},
			{
				name: 'non-string json pointer target',
				args: ['data.json', '--json-pointer', '/count', '--max', '10'],
				code: 'text_budget_json_pointer_not_string',
				pointer: '/count',
			},
		];

		for (const testCase of cases) {
			const { result, report } = runTextBudgetJson(projectPath, testCase.args);

			assert.equal(result.status, 1, `${testCase.name}: ${result.stderr || result.stdout}`);
			assert.equal(report.status, 'error', testCase.name);
			assert.equal(report.ok, false, testCase.name);
			assert.equal(report.findings[0].code, testCase.code, testCase.name);
			assert.equal(report.findings[0].severity, 'high', testCase.name);
			assert.equal(report.findings[0].json_pointer, testCase.pointer, testCase.name);
			assert.equal(report.findings[0].metric, null, testCase.name);
			assert.equal(report.findings[0].actual, null, testCase.name);
			assert.equal(report.findings[0].expected, null, testCase.name);
			assert.match(report.input_hash, /^sha256:[a-f0-9]{64}$/u, testCase.name);
		}
	} finally {
		removeTempProject(projectPath);
	}
});

test('text-budget checks every public counting unit', () => {
	const projectPath = createTempProject();

	try {
		initProject(projectPath);
		writeFileSync(path.join(projectPath, 'units.txt'), 'a😊\n');

		const cases = [
			['code-point', 3],
			['utf16', 4],
			['utf8-byte', 6],
			['line', 2],
		];

		for (const [unit, expected] of cases) {
			const { result, report } = runTextBudgetJson(projectPath, [
				'units.txt',
				'--exact',
				String(expected),
				'--unit',
				unit,
			]);

			assert.equal(result.status, 0, `${unit}: ${result.stderr || result.stdout}`);
			assert.equal(report.status, 'passed', unit);
			assert.equal(report.metrics[0].unit, unit);
			assert.equal(report.metrics[0].value, expected);
		}
	} finally {
		removeTempProject(projectPath);
	}
});

test('text-budget rejects calls without a declared budget', () => {
	const projectPath = createTempProject();

	try {
		initProject(projectPath);
		mkdirSync(path.join(projectPath, 'docs'));
		writeFileSync(path.join(projectPath, 'docs', 'intro.md'), 'hello');

		const result = runCli(projectPath, ['script-pack', 'run', 'core/text-budget', 'check', 'docs/intro.md']);

		assert.equal(result.status, 1, result.stderr || result.stdout);
		assert.match(result.stderr, /Declare at least one text budget/u);
		assert.equal(result.stdout, '');
	} finally {
		removeTempProject(projectPath);
	}
});

test('generated-boundary passes ordinary editable files', () => {
	const projectPath = createTempProject();

	try {
		initProject(projectPath);
		const { result, report } = runGeneratedBoundaryJson(projectPath, ['AGENTS.md']);

		assert.equal(result.status, 0, result.stderr || result.stdout);
		assert.equal(report.command, 'script-pack');
		assert.equal(report.pack_id, 'repo');
		assert.equal(report.script_id, 'generated-boundary');
		assert.equal(report.script_ref, 'repo/generated-boundary');
		assert.equal(report.status, 'passed');
		assert.equal(report.ok, true);
		assert.equal(report.policy.config_loaded, true);
		assert.equal(report.targets[0].path, 'AGENTS.md');
		assert.deepEqual(report.targets[0].matched_boundaries, []);
		assert.match(report.input_hash, /^sha256:[a-f0-9]{64}$/u);
	} finally {
		removeTempProject(projectPath);
	}
});

test('generated-boundary reports generated manifest-lock paths', () => {
	const projectPath = createTempProject();

	try {
		initProject(projectPath);
		const { result, report } = runGeneratedBoundaryJson(projectPath, ['.mustflow/config/manifest.lock.toml']);

		assert.equal(result.status, 1, result.stderr || result.stdout);
		assert.equal(report.status, 'failed');
		assert.equal(report.ok, false);
		assert.equal(report.targets[0].path, '.mustflow/config/manifest.lock.toml');
		assert.ok(report.targets[0].matched_boundaries.includes('generated'));
		assert.ok(report.findings.some((finding) => finding.code === 'generated_boundary_generated_path'));
	} finally {
		removeTempProject(projectPath);
	}
});

test('generated-boundary reports vendor paths', () => {
	const projectPath = createTempProject();

	try {
		initProject(projectPath);
		mkdirSync(path.join(projectPath, 'node_modules'));
		writeFileSync(path.join(projectPath, 'node_modules', 'example.js'), 'module.exports = 1;\n');

		const { result, report } = runGeneratedBoundaryJson(projectPath, ['node_modules/example.js']);

		assert.equal(result.status, 1, result.stderr || result.stdout);
		assert.equal(report.status, 'failed');
		assert.equal(report.ok, false);
		assert.ok(report.targets[0].matched_boundaries.includes('vendor'));
		assert.ok(report.findings.some((finding) => finding.code === 'generated_boundary_vendor_path'));
	} finally {
		removeTempProject(projectPath);
	}
});

test('code-route-outline scans Hono and Elysia routes with lifecycle metadata', () => {
	const projectPath = createTempProject();

	try {
		initProject(projectPath);
		mkdirSync(path.join(projectPath, 'src'));
		writeFileSync(
			path.join(projectPath, 'src', 'server.ts'),
			[
				'import { Hono } from "hono";',
				'import { Elysia } from "elysia";',
				'',
				'const hono = new Hono();',
				'hono.post("/sessions", async (c) => c.json({ ok: true }));',
				'',
				'export const api = new Elysia()',
				'  .guard({ headers: {} })',
				'  .resolve(({ headers }) => ({ user: headers.authorization }))',
				'  .get("/users/:id", ({ user }) => user);',
				'',
			].join('\n'),
		);

		const { result, report } = runCodeRouteOutlineJson(projectPath, ['src/server.ts']);

		assert.equal(result.status, 0, result.stderr || result.stdout);
		assert.equal(report.command, 'script-pack');
		assert.equal(report.pack_id, 'code');
		assert.equal(report.script_id, 'route-outline');
		assert.equal(report.script_ref, 'code/route-outline');
		assert.equal(report.status, 'passed');
		assert.equal(report.ok, true);
		assert.equal(report.files[0].path, 'src/server.ts');
		assert.equal(report.files[0].language, 'typescript');
		assert.deepEqual(report.files[0].framework_evidence, ['elysia', 'hono']);
		assert.equal(report.files[0].route_count, 2);
		assert.match(report.files[0].sha256, /^sha256:[a-f0-9]{64}$/u);
		assert.match(report.input_hash, /^sha256:[a-f0-9]{64}$/u);
		assert.ok(report.policy.extensions.includes('.ts'));

		const honoRoute = report.routes.find((route) => route.framework === 'hono');
		assert.ok(honoRoute, 'Hono route should be outlined');
		assert.equal(honoRoute.method, 'post');
		assert.equal(honoRoute.route_path, '/sessions');
		assert.equal(honoRoute.line, 5);
		assert.equal(honoRoute.chain_start_line, 5);
		assert.equal(honoRoute.chain_end_line, 5);
		assert.equal(honoRoute.handler_name, null);
		assert.deepEqual(honoRoute.lifecycle, []);
		assert.match(honoRoute.content_sha256, /^sha256:[a-f0-9]{64}$/u);

		const elysiaRoute = report.routes.find((route) => route.framework === 'elysia');
		assert.ok(elysiaRoute, 'Elysia route should be outlined');
		assert.equal(elysiaRoute.method, 'get');
		assert.equal(elysiaRoute.route_path, '/users/:id');
		assert.equal(elysiaRoute.line, 10);
		assert.equal(elysiaRoute.chain_start_line, 7);
		assert.equal(elysiaRoute.chain_end_line, 10);
		assert.equal(elysiaRoute.handler_name, null);
		assert.deepEqual(elysiaRoute.lifecycle, ['guard', 'resolve']);
		assert.match(elysiaRoute.signature, /new Elysia/u);
		assert.deepEqual(report.findings, []);
		assert.deepEqual(report.issues, []);
	} finally {
		removeTempProject(projectPath);
	}
});

test('code-route-outline scans Axum Router routes with handler metadata', () => {
	const projectPath = createTempProject();

	try {
		initProject(projectPath);
		mkdirSync(path.join(projectPath, 'src'));
		writeFileSync(
			path.join(projectPath, 'src', 'main.rs'),
			[
				'use axum::{routing::{delete, get}, Router};',
				'',
				'async fn list_users() {}',
				'async fn create_user() {}',
				'async fn delete_user() {}',
				'async fn not_found() {}',
				'fn admin_router() -> Router { Router::new() }',
				'',
				'pub fn app() -> Router {',
				'  Router::new()',
				'    .route("/users", get(list_users).post(create_user))',
				'    .route("/users/:id", delete(delete_user))',
				'    .nest("/admin", admin_router())',
				'    .fallback(not_found)',
				'}',
				'',
			].join('\n'),
		);

		const { result, report } = runCodeRouteOutlineJson(projectPath, ['src/main.rs']);

		assert.equal(result.status, 0, result.stderr || result.stdout);
		assert.equal(report.files[0].path, 'src/main.rs');
		assert.equal(report.files[0].language, 'rust');
		assert.deepEqual(report.files[0].framework_evidence, ['axum']);
		assert.equal(report.files[0].route_count, 5);
		assert.ok(report.policy.extensions.includes('.rs'));

		const usersGet = report.routes.find(
			(route) => route.framework === 'axum' && route.method === 'get' && route.route_path === '/users',
		);
		assert.ok(usersGet, 'Axum GET route should be outlined');
		assert.equal(usersGet.line, 11);
		assert.equal(usersGet.handler_line, 11);
		assert.equal(usersGet.handler_name, 'list_users');

		const usersPost = report.routes.find(
			(route) => route.framework === 'axum' && route.method === 'post' && route.route_path === '/users',
		);
		assert.ok(usersPost, 'Axum POST chained route should be outlined');
		assert.equal(usersPost.handler_name, 'create_user');

		const userDelete = report.routes.find(
			(route) => route.framework === 'axum' && route.method === 'delete' && route.route_path === '/users/:id',
		);
		assert.ok(userDelete, 'Axum DELETE route should be outlined');
		assert.equal(userDelete.handler_name, 'delete_user');

		const nested = report.routes.find((route) => route.framework === 'axum' && route.method === 'nest');
		assert.ok(nested, 'Axum nest route should be outlined');
		assert.equal(nested.route_path, '/admin');
		assert.equal(nested.handler_name, 'admin_router');

		const fallback = report.routes.find((route) => route.framework === 'axum' && route.method === 'fallback');
		assert.ok(fallback, 'Axum fallback route should be outlined');
		assert.equal(fallback.route_path, null);
		assert.equal(fallback.handler_name, 'not_found');
		assert.deepEqual(report.findings, []);
		assert.deepEqual(report.issues, []);
	} finally {
		removeTempProject(projectPath);
	}
});

test('code-route-outline scans NestJS controllers with method and lifecycle metadata', () => {
	const projectPath = createTempProject();

	try {
		initProject(projectPath);
		mkdirSync(path.join(projectPath, 'src'));
		writeFileSync(
			path.join(projectPath, 'src', 'users.controller.ts'),
			[
				'import { Controller, Get, Post, Put, Delete, UseGuards, UseInterceptors } from "@nestjs/common";',
				'',
				'@Controller("users")',
				'@UseGuards(AuthGuard)',
				'export class UsersController {',
				'  @Get()',
				'  list() { return []; }',
				'',
				'  @Post()',
				'  @UseInterceptors(AuditInterceptor)',
				'  create() { return {}; }',
				'',
				'  @Get(":id")',
				'  show() { return {}; }',
				'',
				'  @Delete(":id")',
				'  remove() { return true; }',
				'',
				'  @Put()',
				'  replace() { return {}; }',
				'',
				'  @Get("guarded")',
				'  public async guarded() { return []; }',
				'',
				'  @Get("stream")',
				'  public *stream() { yield "ok"; }',
				'}',
				'',
			].join('\n'),
		);

		const { result, report } = runCodeRouteOutlineJson(projectPath, ['src/users.controller.ts']);

		assert.equal(result.status, 0, result.stderr || result.stdout);
		assert.equal(report.files[0].path, 'src/users.controller.ts');
		assert.equal(report.files[0].language, 'typescript');
		assert.deepEqual(report.files[0].framework_evidence, ['nestjs']);
		assert.equal(report.files[0].route_count, 7);

		const list = report.routes.find(
			(route) => route.framework === 'nestjs' && route.method === 'get' && route.route_path === '/users',
		);
		assert.ok(list, 'NestJS list route should be outlined');
		assert.equal(list.handler_name, 'list');
		assert.deepEqual(list.lifecycle, ['useGuards']);

		const create = report.routes.find(
			(route) => route.framework === 'nestjs' && route.method === 'post' && route.route_path === '/users',
		);
		assert.ok(create, 'NestJS create route should be outlined');
		assert.equal(create.handler_name, 'create');
		assert.deepEqual(create.lifecycle, ['useGuards', 'useInterceptors']);

		const show = report.routes.find(
			(route) => route.framework === 'nestjs' && route.method === 'get' && route.route_path === '/users/:id',
		);
		assert.ok(show, 'NestJS show route should be outlined');
		assert.equal(show.handler_name, 'show');
		assert.deepEqual(show.lifecycle, ['useGuards']);

		const remove = report.routes.find(
			(route) => route.framework === 'nestjs' && route.method === 'delete' && route.route_path === '/users/:id',
		);
		assert.ok(remove, 'NestJS remove route should be outlined');
		assert.equal(remove.handler_name, 'remove');
		assert.deepEqual(remove.lifecycle, ['useGuards']);

		const replace = report.routes.find(
			(route) => route.framework === 'nestjs' && route.method === 'put' && route.route_path === '/users',
		);
		assert.ok(replace, 'NestJS replace route should be outlined');
		assert.equal(replace.handler_name, 'replace');

		const guarded = report.routes.find(
			(route) => route.framework === 'nestjs' && route.method === 'get' && route.route_path === '/users/guarded',
		);
		assert.ok(guarded, 'NestJS public async route should be outlined');
		assert.equal(guarded.handler_name, 'guarded');

		const stream = report.routes.find(
			(route) => route.framework === 'nestjs' && route.method === 'get' && route.route_path === '/users/stream',
		);
		assert.ok(stream, 'NestJS generator route should be outlined');
		assert.equal(stream.handler_name, 'stream');
		assert.deepEqual(report.findings, []);
		assert.deepEqual(report.issues, []);
	} finally {
		removeTempProject(projectPath);
	}
});

test('code-route-outline handles long malformed NestJS handler candidates without regex backtracking', () => {
	const projectPath = createTempProject();

	try {
		initProject(projectPath);
		mkdirSync(path.join(projectPath, 'src'));
		writeFileSync(
			path.join(projectPath, 'src', 'users.controller.ts'),
			[
				'import { Controller, Get } from "@nestjs/common";',
				'',
				'@Controller("users")',
				'export class UsersController {',
				'  @Get("safe")',
				`  ${'public '.repeat(1200)}if`,
				'  safe() { return []; }',
				'}',
				'',
			].join('\n'),
		);

		const { result, report } = runCodeRouteOutlineJson(projectPath, ['src/users.controller.ts']);

		assert.equal(result.status, 0, result.stderr || result.stdout);
		assert.equal(report.files[0].route_count, 1);
		assert.equal(report.routes[0].handler_name, 'safe');
		assert.deepEqual(report.findings, []);
		assert.deepEqual(report.issues, []);
	} finally {
		removeTempProject(projectPath);
	}
});

test('related-files maps imports, importers, siblings, and parent config without deciding verification scope', () => {
	const projectPath = createTempProject();

	try {
		initProject(projectPath);
		mkdirSync(path.join(projectPath, 'src'));
		writeFileSync(
			path.join(projectPath, 'src', 'feature.ts'),
			[
				'import { helper } from "./helper";',
				'',
				'export function feature() {',
				'  return helper();',
				'}',
				'',
			].join('\n'),
		);
		writeFileSync(path.join(projectPath, 'src', 'helper.ts'), 'export function helper() { return 1; }\n');
		writeFileSync(path.join(projectPath, 'src', 'consumer.ts'), 'import { feature } from "./feature";\n');
		writeFileSync(path.join(projectPath, 'src', 'feature.test.ts'), 'import { feature } from "./feature";\n');
		writeFileSync(path.join(projectPath, 'src', 'feature.css'), '.feature { display: block; }\n');
		writeFileSync(path.join(projectPath, 'src', 'feature.md'), '# Feature\n');
		writeFileSync(path.join(projectPath, 'package.json'), `${JSON.stringify({ type: 'module' }, null, 2)}\n`);

		const { result, report } = runRelatedFilesJson(projectPath, ['src/feature.ts']);

		assert.equal(result.status, 0, result.stderr || result.stdout);
		assert.equal(report.command, 'script-pack');
		assert.equal(report.pack_id, 'repo');
		assert.equal(report.script_id, 'related-files');
		assert.equal(report.script_ref, 'repo/related-files');
		assert.equal(report.status, 'passed');
		assert.equal(report.ok, true);
		assert.equal(report.truncated, false);
		assert.equal(report.targets[0].path, 'src/feature.ts');
		assert.equal(report.targets[0].language, 'typescript');
		assert.match(report.input_hash, /^sha256:[a-f0-9]{64}$/u);

		const candidates = new Map(report.candidates.map((candidate) => [`${candidate.relationship}:${candidate.path}`, candidate]));
		assert.equal(candidates.get('import:src/helper.ts')?.line, 1);
		assert.equal(candidates.get('importer:src/consumer.ts')?.line, 1);
		assert.equal(candidates.get('sibling_test:src/feature.test.ts')?.source_path, 'src/feature.ts');
		assert.equal(candidates.get('sibling_style:src/feature.css')?.target_path, 'src/feature.ts');
		assert.equal(candidates.get('sibling_docs:src/feature.md')?.line, null);
		assert.equal(candidates.get('package_boundary:package.json')?.relationship, 'package_boundary');
		assert.deepEqual(report.findings, []);
		assert.deepEqual(report.issues, []);
	} finally {
		removeTempProject(projectPath);
	}
});

test('related-files reports scan truncation with stable finding metadata', () => {
	const projectPath = createTempProject();

	try {
		initProject(projectPath);
		mkdirSync(path.join(projectPath, 'src'));
		writeFileSync(path.join(projectPath, 'src', 'one.ts'), 'export const one = 1;\n');
		writeFileSync(path.join(projectPath, 'src', 'two.ts'), 'export const two = 2;\n');

		const { result, report } = runRelatedFilesJson(projectPath, ['src/one.ts', '--max-files', '1']);

		assert.equal(result.status, 1, result.stderr || result.stdout);
		assert.equal(report.status, 'failed');
		assert.equal(report.ok, false);
		assert.equal(report.truncated, true);
		assert.ok(report.findings.some((finding) => finding.code === 'related_files_max_files_exceeded'));
	} finally {
		removeTempProject(projectPath);
	}
});

test('config-chain inspects package and tsconfig inheritance without executing dynamic config', () => {
	const projectPath = createTempProject();

	try {
		initProject(projectPath);
		mkdirSync(path.join(projectPath, 'src'));
		writeFileSync(
			path.join(projectPath, 'package.json'),
			`${JSON.stringify(
				{
					name: 'config-chain-fixture',
					scripts: { test: 'node --test', build: 'tsc -p tsconfig.json' },
					workspaces: ['packages/*'],
				},
				null,
				2,
			)}\n`,
		);
		writeFileSync(
			path.join(projectPath, 'tsconfig.base.json'),
			`${JSON.stringify({ compilerOptions: { strict: true, moduleResolution: 'bundler' } }, null, 2)}\n`,
		);
		writeFileSync(
			path.join(projectPath, 'tsconfig.json'),
			`${JSON.stringify(
				{
					extends: './tsconfig.base.json',
					include: ['src'],
					references: [{ path: './packages/app' }],
					compilerOptions: { noEmit: true },
				},
				null,
				2,
			)}\n`,
		);
		writeFileSync(path.join(projectPath, 'vite.config.ts'), 'export default { plugins: [] };\n');
		writeFileSync(path.join(projectPath, 'src', 'feature.ts'), 'export const feature = true;\n');

		const { result, report } = runConfigChainJson(projectPath, ['src/feature.ts']);

		assert.equal(result.status, 1, result.stderr || result.stdout);
		assert.equal(report.command, 'script-pack');
		assert.equal(report.pack_id, 'repo');
		assert.equal(report.script_id, 'config-chain');
		assert.equal(report.script_ref, 'repo/config-chain');
		assert.equal(report.action, 'inspect');
		assert.equal(report.status, 'failed');
		assert.equal(report.ok, false);
		assert.match(report.input_hash, /^sha256:[a-f0-9]{64}$/u);
		assert.ok(report.policy.config_names.includes('tsconfig.json'));
		assert.equal(report.targets[0].path, 'src/feature.ts');

		const configs = new Map(report.configs.map((config) => [config.path, config]));
		assert.equal(configs.get('package.json')?.kind, 'package_json');
		assert.equal(configs.get('package.json')?.package_name, 'config-chain-fixture');
		assert.deepEqual(configs.get('package.json')?.scripts, ['build', 'test']);
		assert.deepEqual(configs.get('package.json')?.workspaces, ['packages/*']);
		assert.equal(configs.get('tsconfig.json')?.kind, 'tsconfig');
		assert.deepEqual(configs.get('tsconfig.json')?.extends, ['./tsconfig.base.json']);
		assert.deepEqual(configs.get('tsconfig.json')?.include, ['src']);
		assert.deepEqual(configs.get('tsconfig.json')?.compiler_options, ['noEmit']);
		assert.equal(configs.get('tsconfig.base.json')?.source, 'parent');
		assert.equal(configs.get('vite.config.ts')?.dynamic, true);
		assert.equal(configs.get('vite.config.ts')?.parseable, false);

		assert.ok(
			report.edges.some(
				(edge) =>
					edge.from_path === 'tsconfig.json' &&
					edge.to_path === 'tsconfig.base.json' &&
					edge.kind === 'extends' &&
					edge.resolved === true,
			),
		);
		assert.ok(
			report.edges.some(
				(edge) => edge.from_path === 'package.json' && edge.kind === 'workspace' && edge.specifier === 'packages/*',
			),
		);
		assert.ok(
			report.findings.some(
				(finding) => finding.code === 'config_chain_dynamic_config' && finding.path === 'vite.config.ts',
			),
		);
		assert.ok(
			report.findings.some(
				(finding) => finding.code === 'config_chain_missing_reference' && finding.path === 'tsconfig.json',
			),
		);
	} finally {
		removeTempProject(projectPath);
	}
});

test('env-contract scans code, docs, CI, and env examples without reading secret env values', () => {
	const projectPath = createTempProject();

	try {
		initProject(projectPath);
		mkdirSync(path.join(projectPath, 'src'));
		mkdirSync(path.join(projectPath, '.github', 'workflows'), { recursive: true });
		writeFileSync(
			path.join(projectPath, 'src', 'config.ts'),
			[
				'export function readConfig() {',
				'  return {',
				'    token: process.env.API_TOKEN,',
				'    mode: Bun.env.APP_MODE,',
				'  };',
				'}',
				'',
			].join('\n'),
		);
		writeFileSync(path.join(projectPath, '.env.example'), 'APP_MODE=development\n');
		writeFileSync(path.join(projectPath, '.env'), 'API_TOKEN=SECRET_VALUE_SHOULD_NOT_APPEAR\n');
		writeFileSync(path.join(projectPath, 'README.md'), 'Set `API_TOKEN` in CI before running release jobs.\n');
		writeFileSync(
			path.join(projectPath, '.github', 'workflows', 'ci.yml'),
			[
				'name: ci',
				'on: [push]',
				'jobs:',
				'  test:',
				'    runs-on: ubuntu-latest',
				'    env:',
				'      API_TOKEN: ${{ secrets.API_TOKEN }}',
				'    steps:',
				'      - run: node --version',
				'',
			].join('\n'),
		);

		const { result, report } = runEnvContractJson(projectPath, [
			'src',
			'README.md',
			'.github/workflows/ci.yml',
			'.env.example',
			'.env',
		]);

		assert.equal(result.status, 0, result.stderr || result.stdout);
		assert.equal(report.command, 'script-pack');
		assert.equal(report.pack_id, 'repo');
		assert.equal(report.script_id, 'env-contract');
		assert.equal(report.script_ref, 'repo/env-contract');
		assert.equal(report.action, 'scan');
		assert.equal(report.status, 'passed');
		assert.equal(report.ok, true);
		assert.match(report.input_hash, /^sha256:[a-f0-9]{64}$/u);
		assert.doesNotMatch(result.stdout, /SECRET_VALUE_SHOULD_NOT_APPEAR/u);

		const keys = new Map(report.keys.map((entry) => [entry.key, entry]));
		const apiToken = keys.get('API_TOKEN');
		assert.ok(apiToken);
		assert.equal(apiToken.used_in_code, true);
		assert.equal(apiToken.referenced_in_ci, true);
		assert.equal(apiToken.documented, true);
		assert.equal(apiToken.declared_in_example, false);
		assert.ok(apiToken.sources.some((source) => source.kind === 'process_env_dot'));
		assert.ok(apiToken.sources.some((source) => source.kind === 'ci_secret'));
		assert.ok(apiToken.sources.some((source) => source.kind === 'documented'));

		const appMode = keys.get('APP_MODE');
		assert.ok(appMode);
		assert.equal(appMode.used_in_code, true);
		assert.equal(appMode.declared_in_example, true);
		assert.ok(report.findings.some((finding) => finding.code === 'env_contract_secret_file_skipped' && finding.path === '.env'));
		assert.equal(report.findings.some((finding) => finding.key === 'API_TOKEN' && finding.code === 'env_contract_missing_example'), false);
	} finally {
		removeTempProject(projectPath);
	}
});

test('secret-risk-scan reports plausible secrets without printing secret values', () => {
	const projectPath = createTempProject();
	const providerToken = 'sk-test_abcdefghijklmnopqrstuvwxyz1234567890';
	const envSecret = 'SECRET_VALUE_SHOULD_NOT_APPEAR';

	try {
		initProject(projectPath);
		mkdirSync(path.join(projectPath, 'src'));
		writeFileSync(
			path.join(projectPath, 'src', 'config.ts'),
			[
				'export const OPENAI_API_KEY = "sk-test_abcdefghijklmnopqrstuvwxyz1234567890";',
				'export const placeholderToken = "changeme";',
				'',
			].join('\n'),
		);
		writeFileSync(path.join(projectPath, '.env.example'), 'API_TOKEN=changeme\nREAL_TOKEN=sk-test_abcdefghijklmnopqrstuvwxyz1234567890\n');
		writeFileSync(path.join(projectPath, '.env'), `API_TOKEN=${envSecret}\n`);

		const { result, report } = runSecretRiskScanJson(projectPath, ['src', '.env.example', '.env']);

		assert.equal(result.status, 1, result.stderr || result.stdout);
		assert.equal(report.command, 'script-pack');
		assert.equal(report.pack_id, 'repo');
		assert.equal(report.script_id, 'secret-risk-scan');
		assert.equal(report.script_ref, 'repo/secret-risk-scan');
		assert.equal(report.action, 'scan');
		assert.equal(report.status, 'failed');
		assert.equal(report.ok, false);
		assert.match(report.input_hash, /^sha256:[a-f0-9]{64}$/u);
		assert.doesNotMatch(result.stdout, new RegExp(providerToken, 'u'));
		assert.doesNotMatch(result.stdout, new RegExp(envSecret, 'u'));
		assert.ok(report.findings.some((finding) => finding.code === 'secret_risk_provider_token'));
		assert.ok(report.findings.some((finding) => finding.code === 'secret_risk_generic_assignment'));
		assert.ok(report.findings.some((finding) => finding.code === 'secret_risk_realistic_env_example'));
		assert.ok(report.findings.some((finding) => finding.code === 'secret_risk_secret_file_skipped' && finding.path === '.env'));
		assert.ok(report.findings.every((finding) => !JSON.stringify(finding).includes(providerToken)));
		assert.ok(report.findings.some((finding) => /^sha256:[a-f0-9]{16}$/u.test(finding.fingerprint ?? '')));
	} finally {
		removeTempProject(projectPath);
	}
});

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
		const symbolRead = report.suggestions.find((suggestion) => suggestion.script_ref === 'code/symbol-read');
		const relatedFiles = report.suggestions.find((suggestion) => suggestion.script_ref === 'repo/related-files');

		assert.ok(outline, 'code/outline should be suggested for source paths');
		assert.ok(dependencyGraph, 'code/dependency-graph should be suggested for source paths');
		assert.ok(symbolRead, 'code/symbol-read should be suggested as a source follow-up');
		assert.ok(relatedFiles, 'repo/related-files should be suggested for source paths');
		assert.equal(outline.run_hint, 'mf script-pack run code/outline scan src/session.ts --json');
		assert.equal(dependencyGraph.run_hint, 'mf script-pack run code/dependency-graph scan src/session.ts --json');
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

test('generated-boundary treats outside-root paths as errors', () => {
	const projectPath = createTempProject();

	try {
		initProject(projectPath);
		const outsidePath = path.join(projectPath, '..', 'outside.txt');
		const { result, report } = runGeneratedBoundaryJson(projectPath, [outsidePath]);

		assert.equal(result.status, 1, result.stderr || result.stdout);
		assert.equal(report.status, 'error');
		assert.equal(report.ok, false);
		assert.equal(report.findings[0].code, 'generated_boundary_path_outside_root');
		assert.equal(report.findings[0].boundary, 'outside_root');
	} finally {
		removeTempProject(projectPath);
	}
});

test('script-pack run help does not treat --help as a script ref', () => {
	const projectPath = createTempProject();

	try {
		initProject(projectPath);
		const result = runCli(projectPath, ['script-pack', 'run', '--help']);

		assert.equal(result.status, 0, result.stderr || result.stdout);
		assert.match(result.stdout, /Usage: mf script-pack/);
		assert.match(result.stdout, /mf script-pack suggest --path src\/cli\/index\.ts --phase before_change/);
		assert.match(result.stdout, /mf script-pack run code\/outline scan src --json/);
		assert.match(result.stdout, /mf script-pack run code\/dependency-graph scan src\/cli\/index\.ts --json/);
		assert.match(result.stdout, /mf script-pack run code\/change-impact analyze --base HEAD --json/);
		assert.match(result.stdout, /mf script-pack run code\/symbol-read read src\/cli\/index\.ts --start-line 25 --json/);
		assert.match(result.stdout, /mf script-pack run code\/route-outline scan src\/cli\/index\.ts --json/);
		assert.match(result.stdout, /mf script-pack run docs\/reference-drift check README\.md schemas\/README\.md --json/);
		assert.match(result.stdout, /mf script-pack run core\/text-budget --help/);
		assert.match(result.stdout, /mf script-pack run repo\/config-chain inspect src\/cli\/index\.ts --json/);
		assert.match(result.stdout, /mf script-pack run repo\/generated-boundary check src\/cli\/index\.ts --json/);
		assert.match(result.stdout, /mf script-pack run repo\/related-files map src\/cli\/index\.ts --json/);
		assert.equal(result.stderr, '');
	} finally {
		removeTempProject(projectPath);
	}
});

test('text-budget is not exposed as a top-level command', () => {
	const projectPath = createTempProject();

	try {
		initProject(projectPath);
		const result = runCli(projectPath, ['text-budget', 'check', 'README.md', '--max', '100']);

		assert.equal(result.status, 1, result.stderr || result.stdout);
		assert.match(result.stderr, /Unknown command: text-budget/u);
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
