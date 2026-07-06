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

test('script-pack scanners skip nested ignored directories consistently', () => {
	const projectPath = createTempProject();

	try {
		initProject(projectPath);
		mkdirSync(path.join(projectPath, 'packages', 'app', 'src'), { recursive: true });
		mkdirSync(path.join(projectPath, 'packages', 'app', 'node_modules', 'noisy'), { recursive: true });
		mkdirSync(path.join(projectPath, 'packages', 'app', 'dist'), { recursive: true });
		mkdirSync(path.join(projectPath, 'docs-site', 'src', 'content', 'docs', 'nested', 'node_modules'), { recursive: true });
		writeFileSync(path.join(projectPath, 'packages', 'app', 'src', 'server.ts'), 'export const app = { get() {} };\n');
		writeFileSync(path.join(projectPath, 'packages', 'app', 'src', 'consumer.ts'), 'import { app } from "./server";\napp.get();\n');
		writeFileSync(path.join(projectPath, 'packages', 'app', 'node_modules', 'noisy', 'ignored.ts'), 'export const ignored = true;\n');
		writeFileSync(path.join(projectPath, 'packages', 'app', 'node_modules', 'noisy', 'package.json'), '{"name":"noisy"}\n');
		writeFileSync(path.join(projectPath, 'packages', 'app', 'dist', 'ignored.ts'), 'export const ignoredDist = true;\n');
		writeFileSync(path.join(projectPath, 'docs-site', 'src', 'content', 'docs', 'guide.md'), '# Guide\n\n[Guide](./guide.md)\n');
		writeFileSync(
			path.join(projectPath, 'docs-site', 'src', 'content', 'docs', 'nested', 'node_modules', 'ignored.md'),
			'# Ignored\n\n`mf unknown-command`\n[Missing](./missing.md)\n',
		);

		const outline = runCodeOutlineJson(projectPath, ['packages/app']);
		assert.equal(outline.result.status, 0, outline.result.stderr || outline.result.stdout);
		assert.ok(outline.report.files.some((file) => file.path === 'packages/app/src/server.ts'));
		assert.equal(outline.report.files.some((file) => file.path.includes('/node_modules/')), false);
		assert.equal(outline.report.files.some((file) => file.path.includes('/dist/')), false);

		const dependencyGraph = runCodeDependencyGraphJson(projectPath, ['packages/app']);
		assert.equal(dependencyGraph.result.status, 0, dependencyGraph.result.stderr || dependencyGraph.result.stdout);
		assert.ok(dependencyGraph.report.nodes.some((node) => node.path === 'packages/app/src/server.ts'));
		assert.equal(dependencyGraph.report.nodes.some((node) => node.path.includes('/node_modules/')), false);
		assert.equal(dependencyGraph.report.nodes.some((node) => node.path.includes('/dist/')), false);

		const routeOutline = runCodeRouteOutlineJson(projectPath, ['packages/app']);
		assert.equal(routeOutline.result.status, 0, routeOutline.result.stderr || routeOutline.result.stdout);
		assert.equal(routeOutline.report.files.some((file) => file.path.includes('/node_modules/')), false);
		assert.equal(routeOutline.report.files.some((file) => file.path.includes('/dist/')), false);

		const configChain = runConfigChainJson(projectPath, ['packages/app']);
		assert.equal(configChain.result.status, 0, configChain.result.stderr || configChain.result.stdout);
		assert.equal(configChain.report.configs.some((config) => config.path.includes('/node_modules/')), false);
		assert.equal(configChain.report.configs.some((config) => config.path.includes('/dist/')), false);

		const referenceDrift = runDocsReferenceDriftJson(projectPath, ['docs-site/src/content/docs']);
		assert.equal(referenceDrift.result.status, 0, referenceDrift.result.stderr || referenceDrift.result.stdout);
		assert.equal(referenceDrift.report.files.some((file) => file.path.includes('/node_modules/')), false);
		assert.equal(referenceDrift.report.findings.some((finding) => finding.message.includes('unknown-command')), false);
		assert.ok(referenceDrift.report.policy.ignored_directories.includes('node_modules'));

		const linkIntegrity = runDocsLinkIntegrityJson(projectPath, ['docs-site/src/content/docs']);
		assert.equal(linkIntegrity.result.status, 0, linkIntegrity.result.stderr || linkIntegrity.result.stdout);
		assert.equal(linkIntegrity.report.files.some((file) => file.path.includes('/node_modules/')), false);
		assert.equal(linkIntegrity.report.findings.some((finding) => finding.message.includes('missing.md')), false);
		assert.ok(linkIntegrity.report.policy.ignored_directories.includes('node_modules'));
	} finally {
		removeTempProject(projectPath);
	}
});

test('import-cycle reports cycles with line evidence', () => {
	const projectPath = createTempProject();

	try {
		initProject(projectPath);
		mkdirSync(path.join(projectPath, 'src'));
		writeFileSync(path.join(projectPath, 'src', 'a.ts'), 'import { b } from "./b";\nexport const a = b;\n');
		writeFileSync(path.join(projectPath, 'src', 'b.ts'), 'import { a } from "./a";\nexport const b = a;\n');

		const { result, report } = runCodeImportCycleJson(projectPath, ['src']);

		assert.equal(result.status, 1, result.stderr || result.stdout);
		assert.equal(report.schema_version, '1');
		assert.equal(report.script_ref, 'code/import-cycle');
		assert.equal(report.status, 'failed');
		assert.equal(report.ok, false);
		assert.equal(report.graph.script_ref, 'code/dependency-graph');
		assert.equal(report.cycles.length, 1);
		assert.equal(report.cycles[0].path_count, 2);
		assert.equal(report.cycles[0].paths[0], report.cycles[0].paths.at(-1));
		assert.deepEqual(new Set(report.cycles[0].paths), new Set(['src/a.ts', 'src/b.ts']));
		assert.deepEqual(
			report.cycles[0].edges.map((edge) => `${edge.source_path}:${edge.line}->${edge.target_path}`).sort(),
			['src/a.ts:1->src/b.ts', 'src/b.ts:1->src/a.ts'],
		);
		assert.ok(report.findings.some((finding) => finding.code === 'import_cycle_detected'));
	} finally {
		removeTempProject(projectPath);
	}
});

test('module-boundary reports missing config as non-blocking evidence', () => {
	const projectPath = createTempProject();

	try {
		initProject(projectPath);
		mkdirSync(path.join(projectPath, 'src'));
		writeFileSync(path.join(projectPath, 'src', 'entry.ts'), 'export const entry = 1;\n');

		const { result, report } = runCodeModuleBoundaryJson(projectPath, ['src/entry.ts']);

		assert.equal(result.status, 0, result.stderr || result.stdout);
		assert.equal(report.command, 'script-pack');
		assert.equal(report.script_ref, 'code/module-boundary');
		assert.equal(report.action, 'check');
		assert.equal(report.status, 'passed');
		assert.equal(report.ok, true);
		assert.equal(report.config.status, 'missing');
		assert.equal(report.config.path, '.mustflow/config/module-boundaries.toml');
		assert.ok(report.findings.some((finding) => finding.code === 'module_boundary_config_missing'));
		assert.match(report.input_hash, /^sha256:[a-f0-9]{64}$/u);
	} finally {
		removeTempProject(projectPath);
	}
});

test('module-boundary enforces configured layer, entrypoint, feature, and shared-budget rules', () => {
	const projectPath = createTempProject();

	try {
		initProject(projectPath);
		mkdirSync(path.join(projectPath, '.mustflow', 'config'), { recursive: true });
		mkdirSync(path.join(projectPath, 'src', 'domain'), { recursive: true });
		mkdirSync(path.join(projectPath, 'src', 'infra'), { recursive: true });
		mkdirSync(path.join(projectPath, 'src', 'modules', 'payment', 'internal'), { recursive: true });
		mkdirSync(path.join(projectPath, 'src', 'features', 'account'), { recursive: true });
		mkdirSync(path.join(projectPath, 'src', 'features', 'billing'), { recursive: true });
		mkdirSync(path.join(projectPath, 'src', 'shared'), { recursive: true });
		writeFileSync(
			path.join(projectPath, '.mustflow', 'config', 'module-boundaries.toml'),
			[
				'[[layers]]',
				'id = "domain-no-infra"',
				'paths = ["src/domain/**"]',
				'deny_imports = ["src/infra/**"]',
				'',
				'[[public_entrypoints]]',
				'id = "payment-public-api"',
				'root = "src/modules/payment"',
				'entrypoint = "src/modules/payment/index.ts"',
				'',
				'[[feature_groups]]',
				'id = "feature-entrypoints-only"',
				'root = "src/features"',
				'',
				'[[shared_budgets]]',
				'id = "shared-small"',
				'path = "src/shared"',
				'max_files = 1',
				'max_exports = 1',
				'',
			].join('\n'),
		);
		writeFileSync(path.join(projectPath, 'src', 'infra', 'db.ts'), 'export const db = 1;\n');
		writeFileSync(path.join(projectPath, 'src', 'domain', 'user.ts'), 'import { db } from "../infra/db";\nexport const user = db;\n');
		writeFileSync(path.join(projectPath, 'src', 'modules', 'payment', 'index.ts'), 'export const publicPayment = 1;\n');
		writeFileSync(path.join(projectPath, 'src', 'modules', 'payment', 'internal', 'fee.ts'), 'export const fee = 1;\n');
		writeFileSync(path.join(projectPath, 'src', 'features', 'billing', 'index.ts'), 'export const billing = 1;\n');
		writeFileSync(path.join(projectPath, 'src', 'features', 'billing', 'internal.ts'), 'export const internalBilling = 1;\n');
		writeFileSync(
			path.join(projectPath, 'src', 'features', 'account', 'view.ts'),
			'import { internalBilling } from "../billing/internal";\nexport const view = internalBilling;\n',
		);
		writeFileSync(path.join(projectPath, 'src', 'shared', 'a.ts'), 'export const a = 1;\n');
		writeFileSync(path.join(projectPath, 'src', 'shared', 'b.ts'), 'export const b = 1;\n');
		writeFileSync(
			path.join(projectPath, 'src', 'app.ts'),
			'import { fee } from "./modules/payment/internal/fee";\nexport const app = fee;\n',
		);

		const { result, report } = runCodeModuleBoundaryJson(projectPath, ['src']);
		const findingCodes = new Set(report.findings.map((finding) => finding.code));

		assert.equal(result.status, 1, result.stderr || result.stdout);
		assert.equal(report.status, 'failed');
		assert.equal(report.ok, false);
		assert.equal(report.config.status, 'found');
		assert.equal(report.config.layer_rule_count, 1);
		assert.equal(report.config.public_entrypoint_rule_count, 1);
		assert.equal(report.config.feature_group_rule_count, 1);
		assert.equal(report.config.shared_budget_rule_count, 1);
		assert.ok(findingCodes.has('module_boundary_forbidden_import'));
		assert.ok(findingCodes.has('module_boundary_public_entry_violation'));
		assert.ok(findingCodes.has('module_boundary_feature_direct_import'));
		assert.ok(findingCodes.has('module_boundary_shared_budget_exceeded'));
		assert.ok(report.shared_metrics.some((metric) => metric.rule_id === 'shared-small' && metric.file_count === 2));
		assert.deepEqual(
			report.rules.map((rule) => rule.kind).sort(),
			['feature_direct_import', 'import_cycle', 'layer_deny', 'public_entrypoint', 'shared_budget'],
		);
	} finally {
		removeTempProject(projectPath);
	}
});

test('module-boundary treats import cycles as boundary failures', () => {
	const projectPath = createTempProject();

	try {
		initProject(projectPath);
		mkdirSync(path.join(projectPath, '.mustflow', 'config'), { recursive: true });
		mkdirSync(path.join(projectPath, 'src'));
		writeFileSync(
			path.join(projectPath, '.mustflow', 'config', 'module-boundaries.toml'),
			'[[layers]]\nid = "noop"\npaths = ["src/**"]\ndeny_imports = ["missing/**"]\n',
		);
		writeFileSync(path.join(projectPath, 'src', 'a.ts'), 'import { b } from "./b";\nexport const a = b;\n');
		writeFileSync(path.join(projectPath, 'src', 'b.ts'), 'import { a } from "./a";\nexport const b = a;\n');

		const { result, report } = runCodeModuleBoundaryJson(projectPath, ['src']);

		assert.equal(result.status, 1, result.stderr || result.stdout);
		assert.equal(report.status, 'failed');
		assert.equal(report.ok, false);
		assert.ok(report.findings.some((finding) => finding.code === 'module_boundary_import_cycle_detected'));
		assert.equal(report.cycles.length, 1);
		assert.deepEqual(new Set(report.cycles[0].paths), new Set(['src/a.ts', 'src/b.ts']));
	} finally {
		removeTempProject(projectPath);
	}
});
