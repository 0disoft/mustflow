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

test('security-pattern-scan reports security review leads without printing matched source lines', () => {
	const projectPath = createTempProject();
	const sensitiveMarker = 'SECRET_VALUE_SHOULD_NOT_APPEAR';

	try {
		initProject(projectPath);
		mkdirSync(path.join(projectPath, 'src'));
		writeFileSync(
			path.join(projectPath, 'src', 'server.ts'),
			[
				'import { spawn } from "node:child_process";',
				'',
				'export function createUser(req, res, User) {',
				'  return User.update(req.body);',
				'}',
				'',
				'export function proxy(req) {',
				'  return fetch(req.query.url);',
				'}',
				'',
				'export function runInstall() {',
				'  return spawn("npm install", { shell: true });',
				'}',
				'',
				'export function setSession(res, sessionId) {',
				'  return res.cookie("session", sessionId);',
				'}',
				'',
				`export const localOnly = "${sensitiveMarker}";`,
				'',
			].join('\n'),
		);

		const { result, report } = runSecurityPatternScanJson(projectPath, ['src/server.ts']);

		assert.equal(result.status, 1, result.stderr || result.stdout);
		assert.equal(report.command, 'script-pack');
		assert.equal(report.pack_id, 'repo');
		assert.equal(report.script_id, 'security-pattern-scan');
		assert.equal(report.script_ref, 'repo/security-pattern-scan');
		assert.equal(report.action, 'scan');
		assert.equal(report.status, 'failed');
		assert.equal(report.ok, false);
		assert.match(report.input_hash, /^sha256:[a-f0-9]{64}$/u);
		assert.equal(report.policy.evidence_mode, 'metadata_only');
		assert.doesNotMatch(result.stdout, new RegExp(sensitiveMarker, 'u'));

		const detectors = new Set(report.findings.map((finding) => finding.detector));
		assert.ok(detectors.has('mass_assignment'));
		assert.ok(detectors.has('server_fetch_user_url'));
		assert.ok(detectors.has('shell_true'));
		assert.ok(detectors.has('insecure_cookie_options'));
		assert.ok(report.findings.some((finding) => /^sha256:[a-f0-9]{16}$/u.test(finding.fingerprint ?? '')));
		assert.ok(report.findings.every((finding) => !JSON.stringify(finding).includes(sensitiveMarker)));
	} finally {
		removeTempProject(projectPath);
	}
});
