import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';

const projectRoot = path.resolve(fileURLToPath(new URL('../..', import.meta.url)));
const packageJson = JSON.parse(readFileSync(path.join(projectRoot, 'package.json'), 'utf8'));
const templateManifest = readFileSync(path.join(projectRoot, 'templates', 'default', 'manifest.toml'), 'utf8');
const templateCommandContract = readFileSync(path.join(projectRoot, 'templates', 'default', 'common', '.mustflow', 'config', 'commands.toml'), 'utf8');
const cliTestRunner = readFileSync(path.join(projectRoot, 'scripts', 'run-cli-tests.mjs'), 'utf8');
const sourceCommandContract = readFileSync(path.join(projectRoot, '.mustflow', 'config', 'commands.toml'), 'utf8');
const publishNpmWorkflow = readFileSync(path.join(projectRoot, '.github', 'workflows', 'publish-npm.yml'), 'utf8');
const releaseVersionCheckScript = readFileSync(path.join(projectRoot, 'scripts', 'check-npm-release-version.mjs'), 'utf8');
const supportedTemplateLocales = ['en', 'ko', 'zh', 'es', 'fr', 'hi'];
const templateCreates = readTomlStringArrayBlock(templateManifest, 'creates');
const templateSkillCreates = templateCreates.filter((relativePath) => relativePath.startsWith('.mustflow/skills/'));

async function readPublicJsonContracts() {
	const contractsModule = await import(
		pathToFileURL(path.join(projectRoot, 'dist', 'core', 'public-json-contracts.js')).href
	);
	return contractsModule.getPublicJsonSchemaContracts();
}

function readTomlStringArrayBlock(content, key) {
	const match = new RegExp(`^${key} = \\[([\\s\\S]*?)^\\]`, 'mu').exec(content);

	if (!match) {
		throw new Error(`Missing TOML array block: ${key}`);
	}

	return Array.from(match[1].matchAll(/"([^"]+)"/gu), (entry) => entry[1]);
}

function readProjectText(relativePath) {
	return readFileSync(path.join(projectRoot, ...relativePath.split('/')), 'utf8');
}

test('package metadata is ready for public npm publishing', () => {
	assert.equal(packageJson.version, '2.75.0');
	assert.equal(packageJson.license, 'MIT-0');
	assert.equal(packageJson.homepage, 'https://0disoft.github.io/mustflow/');
	assert.deepEqual(packageJson.repository, {
		type: 'git',
		url: 'git+https://github.com/0disoft/mustflow.git',
	});
	assert.deepEqual(packageJson.bugs, {
		url: 'https://github.com/0disoft/mustflow/issues',
	});
	assert.deepEqual(packageJson.publishConfig, {
		access: 'public',
	});
	assert.match(packageJson.description, /agent workflow/i);
	assert.ok(packageJson.keywords.includes('agent-workflow'));
	assert.ok(packageJson.keywords.includes('agents-md'));
	assert.equal(packageJson.packageManager, 'bun@1.3.13');
});

test('default template manifest version stays synchronized with package version', () => {
	assert.match(templateManifest, new RegExp(`^version = "${packageJson.version}"$`, 'm'));
});

test('package exposes a real install verification script', () => {
	assert.equal(packageJson.scripts.prepack, 'npm run build');
	assert.equal(packageJson.scripts.test, 'bun run test:full');
	assert.equal(packageJson.scripts['test:fast'], 'node scripts/run-cli-tests.mjs --build fast');
	assert.equal(packageJson.scripts['test:related'], 'node scripts/run-cli-tests.mjs --build related');
	assert.equal(packageJson.scripts['test:related:cached'], 'node scripts/run-cli-tests.mjs related-cached');
	assert.equal(packageJson.scripts['test:related:profile'], 'node scripts/run-cli-tests.mjs --build related-profile');
	assert.equal(packageJson.scripts['test:cli'], 'node scripts/run-cli-tests.mjs --build cli');
	assert.equal(packageJson.scripts['test:coverage'], 'node scripts/run-cli-tests.mjs --build coverage');
	assert.equal(packageJson.scripts['test:audit'], 'node scripts/audit-tests.mjs --json');
	assert.equal(packageJson.scripts['test:release'], 'node scripts/run-cli-tests.mjs --build release');
	assert.equal(packageJson.scripts['test:fast:node'], 'node scripts/run-cli-tests.mjs --build-runner=npm fast');
	assert.equal(packageJson.scripts['test:release:node'], 'node scripts/run-cli-tests.mjs --build-runner=npm release');
	assert.equal(packageJson.scripts['test:full'], 'node scripts/run-cli-tests.mjs --build full-auto');
	assert.equal(packageJson.scripts['test:full:auto'], 'node scripts/run-cli-tests.mjs --build full-auto');
	assert.equal(packageJson.scripts['test:full:profile'], 'node scripts/run-cli-tests.mjs --build full-profile');
	assert.equal(packageJson.scripts['test:full:serial'], 'node scripts/run-cli-tests.mjs --build full');
	assert.equal(packageJson.scripts.check, 'bun run check:package && bun run test:full');
	assert.equal(packageJson.scripts['check:core:node'], 'node scripts/run-node-core-check.mjs');
	assert.doesNotMatch(packageJson.scripts['check:core:node'], /\bbun\b/u);
	assert.equal(packageJson.scripts['check:pack'], 'npm pack --dry-run --json');
	assert.equal(packageJson.scripts['check:install'], 'npm run check:pack && node --test tests/integration/*.test.js');
	assert.equal(packageJson.scripts['release:check'], 'npm run check && npm run docs:check && npm run check:install');
	assert.equal(packageJson.scripts['docs:check:fast'], 'bun run --cwd docs-site check:fast');
	assert.equal(packageJson.scripts.prepublishOnly, 'npm run release:check');
});

test('npm publish workflow uses trusted publisher identity', () => {
	assert.match(publishNpmWorkflow, /push:\s*\n\s+tags:\s*\n\s+- "v\*"/u);
	assert.match(publishNpmWorkflow, /environment: npm/u);
	assert.match(publishNpmWorkflow, /id-token: write/u);
	assert.match(publishNpmWorkflow, /package-manager-cache: false/u);
	assert.match(publishNpmWorkflow, /no-cache: true/u);
	assert.match(publishNpmWorkflow, /npm publish --access public/u);
	assert.ok(
		publishNpmWorkflow.indexOf('npm publish --access public') <
			publishNpmWorkflow.indexOf('Create GitHub release for pushed tag'),
	);
	assert.doesNotMatch(publishNpmWorkflow, /NODE_AUTH_TOKEN/u);
	assert.doesNotMatch(publishNpmWorkflow, /secrets\.NODE_AUTH_TOKEN/u);
});

test('source repository declares bounded npm registry release checks', () => {
	assert.match(sourceCommandContract, /\[intents\.release_npm_version_available\]/u);
	assert.match(sourceCommandContract, /\[intents\.release_npm_published_verify\]/u);
	assert.match(sourceCommandContract, /scripts\/check-npm-release-version\.mjs/u);
	assert.match(sourceCommandContract, /--expect-available/u);
	assert.match(sourceCommandContract, /--expect-published/u);
	assert.match(sourceCommandContract, /network = true/u);
	assert.match(sourceCommandContract, /destructive = false/u);
	assert.match(sourceCommandContract, /MUSTFLOW_NPM_REGISTRY_URL/u);
});

test('source repository declares bounded prompt-cache audit checks', () => {
	assert.match(sourceCommandContract, /\[intents\.prompt_cache_audit\]/u);
	assert.match(sourceCommandContract, /"context", "--json", "--cache-profile", "all", "--cache-audit"/u);
	assert.match(sourceCommandContract, /Measure prompt-cache profile sizes and configured budget status read-only/u);
	assert.match(sourceCommandContract, /writes = \[\]/u);
	assert.match(sourceCommandContract, /network = false/u);
	assert.match(sourceCommandContract, /destructive = false/u);
});

test('default template exposes script-pack catalog discovery as a read-only command intent', () => {
	assert.match(templateCommandContract, /\[intents\.script_pack_list\][\s\S]*"mf", "script-pack", "list", "--json"/u);
	assert.match(templateCommandContract, /List bundled mustflow script-pack utilities and routing metadata read-only/u);
	assert.match(templateCommandContract, /\[intents\.script_pack_list\][\s\S]*writes = \[\]/u);
	assert.match(templateCommandContract, /\[intents\.script_pack_list\][\s\S]*network = false/u);
	assert.match(templateCommandContract, /\[intents\.script_pack_list\][\s\S]*destructive = false/u);
	assert.match(
		templateCommandContract,
		/\[intents\.script_pack_suggest_changed\][\s\S]*"mf", "script-pack", "suggest", "--changed", "--json"/u,
	);
	assert.match(templateCommandContract, /Suggest bundled mustflow script-pack utilities for current changed files read-only/u);
	assert.match(templateCommandContract, /\[intents\.script_pack_suggest_changed\][\s\S]*writes = \[\]/u);
	assert.match(templateCommandContract, /\[intents\.script_pack_suggest_changed\][\s\S]*network = false/u);
	assert.match(templateCommandContract, /\[intents\.script_pack_suggest_changed\][\s\S]*destructive = false/u);
});

test('local index command contracts include bounded source-anchor indexing', () => {
	assert.match(sourceCommandContract, /\[intents\.local_index\][\s\S]*"index", "--source"/u);
	assert.match(templateCommandContract, /\[intents\.local_index\][\s\S]*"mf", "index", "--source"/u);
	assert.match(sourceCommandContract, /including bounded source anchors/u);
	assert.match(templateCommandContract, /including bounded source anchors/u);
	assert.match(sourceCommandContract, /writes = \["\.mustflow\/cache\/\*\*"\]/u);
	assert.match(templateCommandContract, /writes = \["\.mustflow\/cache\/\*\*"\]/u);
});

test('npm registry release check fully encodes package lookup paths', () => {
	assert.match(releaseVersionCheckScript, /function encodeRegistryPackagePath\(packageName\)/u);
	assert.match(releaseVersionCheckScript, /encodeURIComponent\(packageName\)/u);
	assert.match(releaseVersionCheckScript, /encodedScopedMarker = '%40'/u);
	assert.doesNotMatch(releaseVersionCheckScript, /packageJson\.name\.replace\(/u);
	assert.doesNotMatch(releaseVersionCheckScript, /\.replace\(['"]\/['"],\s*['"]%2F['"]\)/u);
});

test('CLI test runner keeps concurrency configurable', () => {
	assert.match(cliTestRunner, /MUSTFLOW_TEST_CONCURRENCY/u);
	assert.match(cliTestRunner, /readPositiveIntegerEnv\('MUSTFLOW_TEST_CONCURRENCY', '8'\)/u);
	assert.match(cliTestRunner, /MUSTFLOW_TEST_RELATED_CONCURRENCY/u);
	assert.match(cliTestRunner, /function readRelatedConcurrency\(\)/u);
	assert.match(cliTestRunner, /readPositiveIntegerEnv\('MUSTFLOW_TEST_CONCURRENCY', '4'\)/u);
	assert.match(cliTestRunner, /MUSTFLOW_TEST_CLI_CONCURRENCY/u);
	assert.match(cliTestRunner, /function readCliConcurrency\(\)/u);
	assert.match(cliTestRunner, /MUSTFLOW_TEST_FULL_CONCURRENCY/u);
	assert.match(cliTestRunner, /function readFullConcurrency\(\)/u);
	assert.match(cliTestRunner, /MUSTFLOW_TEST_COVERAGE_CONCURRENCY/u);
	assert.match(cliTestRunner, /readPositiveIntegerEnv\('MUSTFLOW_TEST_COVERAGE_CONCURRENCY', '4'\)/u);
	assert.match(cliTestRunner, /'related-cached': relatedTests\(\)/u);
	assert.match(cliTestRunner, /'related-profile': relatedTests\(\)/u);
	assert.match(cliTestRunner, /cachedModeUnsafeRules/u);
	assert.match(cliTestRunner, /compiledOutputPathForSource/u);
	assert.match(cliTestRunner, /function runProfiledTests\(\)/u);
	assert.match(cliTestRunner, /function acquireTestRunnerLock\(\)/u);
	assert.match(cliTestRunner, /MUSTFLOW_TEST_RUNNER_LOCK_DIR/u);
	assert.match(cliTestRunner, /--build-runner/u);
	assert.match(cliTestRunner, /MUSTFLOW_TEST_SCHEDULER/u);
	assert.match(cliTestRunner, /function planWaves\(/u);
	assert.match(cliTestRunner, /MUSTFLOW_TEST_SQLITE_TOKENS/u);
	assert.match(cliTestRunner, /MUSTFLOW_TEST_GIT_TOKENS/u);
	assert.match(cliTestRunner, /io: '16'/u);
	assert.match(cliTestRunner, /process: '16'/u);
	assert.match(cliTestRunner, /sqlite: '4'/u);
	assert.match(cliTestRunner, /git: '2'/u);
	assert.match(cliTestRunner, /serial total/u);
	assert.match(cliTestRunner, /dist\/ is older than changed TypeScript source/u);

	const relatedResult = spawnSync(process.execPath, ['scripts/run-cli-tests.mjs', 'related'], {
		cwd: projectRoot,
		encoding: 'utf8',
		env: {
			...process.env,
			MUSTFLOW_TEST_CONCURRENCY: '0',
		},
	});

	assert.equal(relatedResult.status, 2);
	assert.match(relatedResult.stderr, /MUSTFLOW_TEST_CONCURRENCY must be a positive integer\./u);

	const result = spawnSync(process.execPath, ['scripts/run-cli-tests.mjs', 'coverage'], {
		cwd: projectRoot,
		encoding: 'utf8',
		env: {
			...process.env,
			MUSTFLOW_TEST_COVERAGE_CONCURRENCY: '0',
		},
	});

	assert.equal(result.status, 2);
	assert.match(result.stderr, /MUSTFLOW_TEST_COVERAGE_CONCURRENCY must be a positive integer\./u);
});

test('SQLite local index contracts stay synchronized across docs and schemas', () => {
	const explainSchema = readProjectText('schemas/explain-report.schema.json');
	const changeVerificationSchema = readProjectText('schemas/change-verification-report.schema.json');
	const readme = readProjectText('README.md');

	assert.match(explainSchema, /"effectGraph"/u);
	assert.match(explainSchema, /"readModel"/u);
	assert.match(explainSchema, /"decisionGraph"/u);
	assert.match(explainSchema, /"latestFailure"/u);
	assert.match(changeVerificationSchema, /"decision_graph"/u);
	assert.match(changeVerificationSchema, /"effectGraph"/u);
	assert.match(changeVerificationSchema, /"surfaceReadModels"/u);
	assert.match(readme, /verification decision graph/u);
	assert.match(readme, /read-only local-index lock explanations/u);

	for (const locale of supportedTemplateLocales) {
		const commandIndex = readProjectText(`docs-site/src/content/docs/${locale}/commands/index.md`);
		const searchCommand = readProjectText(`docs-site/src/content/docs/${locale}/commands/search.md`);
		const explainCommand = readProjectText(`docs-site/src/content/docs/${locale}/commands/explain.md`);
		const verifyCommand = readProjectText(`docs-site/src/content/docs/${locale}/commands/verify.md`);
		const localIndexDesign = readProjectText(`docs-site/src/content/docs/${locale}/design/local-index.md`);
		const releaseChecksDesign = readProjectText(`docs-site/src/content/docs/${locale}/design/release-checks.md`);

		assert.match(commandIndex, /`search_backend`/u, `${locale} index command docs should document search_backend`);
		assert.match(commandIndex, /`search_fts5_available`/u, `${locale} index command docs should document FTS5 status`);
		assert.match(commandIndex, /`excluded_raw_data_kinds`/u, `${locale} index command docs should document excluded raw data kinds`);
		assert.match(commandIndex, /--incremental/u, `${locale} index command docs should document incremental mode`);
		assert.match(commandIndex, /`indexed_file_count`/u, `${locale} index command docs should document indexed_file_count`);
		assert.match(searchCommand, /`search_backend`/u, `${locale} search command docs should document search_backend`);
		assert.match(searchCommand, /`search_fts5_available`/u, `${locale} search command docs should document FTS5 status`);
		assert.match(searchCommand, /`skill_route`/u, `${locale} search command docs should document skill route results`);
		assert.match(explainCommand, /decision\.effectGraph/u, `${locale} explain docs should document command graphs`);
		assert.match(explainCommand, /decision\.readModel/u, `${locale} explain docs should document surface read models`);
		assert.match(explainCommand, /decisionGraph/u, `${locale} explain docs should document verify decision graph`);
		assert.match(explainCommand, /decision\.latestFailure/u, `${locale} explain docs should document latest failure metadata`);
		assert.match(verifyCommand, /decision_graph/u, `${locale} verify docs should document decision graph`);
		assert.match(verifyCommand, /effectGraph/u, `${locale} verify docs should document command graphs`);
		assert.match(verifyCommand, /surfaceReadModels/u, `${locale} verify docs should document surface read models`);
		assert.match(localIndexDesign, /search_ngrams/u, `${locale} local index docs should document n-gram search rows`);
		assert.match(localIndexDesign, /indexed_files/u, `${locale} local index docs should document indexed file fingerprints`);
		assert.match(releaseChecksDesign, /MUSTFLOW_TEST_CONCURRENCY/u, `${locale} release docs should document test concurrency`);
	}
});

test('npm package includes compiled cli, schema contracts, and default template sources', async () => {
	const publicJsonContracts = await readPublicJsonContracts();
	const result = spawnSync('npm pack --dry-run --json --ignore-scripts', {
		cwd: projectRoot,
		encoding: 'utf8',
		shell: true,
	});

	assert.equal(result.status, 0);
	const [pack] = JSON.parse(result.stdout);
	const files = new Set(pack.files.map((file) => file.path));

	assert.ok(files.has('dist/cli/index.js'));
	assert.ok(files.has('dist/cli/commands/adapters.js'));
	assert.ok(files.has('dist/cli/commands/classify.js'));
	assert.ok(files.has('dist/cli/commands/contract-lint.js'));
	assert.ok(files.has('dist/cli/commands/onboard.js'));
	assert.ok(files.has('dist/cli/commands/next.js'));
	assert.ok(files.has('dist/cli/commands/evidence.js'));
	assert.ok(files.has('dist/cli/commands/workspace.js'));
	assert.ok(files.has('dist/cli/commands/init.js'));
	assert.ok(files.has('dist/cli/commands/docs.js'));
	assert.ok(files.has('dist/cli/commands/index.js'));
	assert.ok(files.has('dist/cli/commands/line-endings.js'));
	assert.ok(files.has('dist/cli/commands/quality.js'));
	assert.ok(files.has('dist/cli/commands/explain.js'));
	assert.ok(files.has('dist/cli/commands/handoff.js'));
	assert.ok(files.has('dist/core/line-endings.js'));
	assert.ok(files.has('dist/core/quality-gaming.js'));
	assert.ok(files.has('dist/core/source-anchor-explanation.js'));
	assert.ok(files.has('dist/core/source-anchors.js'));
	assert.ok(files.has('dist/cli/commands/impact.js'));
	assert.ok(files.has('dist/cli/commands/search.js'));
	assert.ok(files.has('dist/cli/commands/dashboard.js'));
	assert.ok(files.has('dist/cli/commands/update.js'));
	assert.ok(files.has('dist/cli/commands/verify.js'));
	assert.ok(files.has('dist/core/contract-models.js'));
	assert.ok(files.has('dist/core/adapter-compatibility.js'));
	assert.ok(files.has('dist/core/handoff-record.js'));
	assert.ok(files.has('dist/core/generated-boundary.js'));
	assert.ok(files.has('dist/core/code-outline.js'));
	assert.ok(files.has('dist/core/script-pack-suggestions.js'));
	assert.ok(files.has('dist/core/doc-review-triage.js'));
	assert.ok(files.has('dist/core/public-json-contracts.js'));
	assert.ok(files.has('dist/core/surface-decision-model.js'));
	assert.ok(files.has('dist/cli/script-packs/core-text-budget.js'));
	assert.ok(files.has('dist/cli/script-packs/code-outline.js'));
	assert.ok(files.has('dist/cli/script-packs/repo-generated-boundary.js'));
	assert.ok(files.has('templates/default/manifest.toml'));
	assert.ok(files.has('templates/default/i18n.toml'));
	assert.ok(files.has('dist/cli/lib/template-i18n.js'));
	assert.ok(files.has('templates/default/common/.mustflow/config/commands.toml'));
	assert.ok(files.has('templates/default/common/.mustflow/config/preferences.toml'));
	assert.ok(files.has('schemas/doctor-report.schema.json'));
	assert.ok(files.has('schemas/adapter-compatibility-report.schema.json'));
	assert.ok(files.has('schemas/context-report.schema.json'));
	assert.ok(files.has('schemas/run-receipt.schema.json'));
	assert.ok(files.has('schemas/commands.schema.json'));
	assert.ok(files.has('schemas/contract-lint-report.schema.json'));
	assert.ok(files.has('schemas/onboard-commands-report.schema.json'));
	assert.ok(files.has('schemas/next-report.schema.json'));
	assert.ok(files.has('schemas/evidence-report.schema.json'));
	assert.ok(files.has('schemas/workspace-status.schema.json'));
	assert.ok(files.has('schemas/workspace-command-catalog.schema.json'));
	assert.ok(files.has('schemas/workspace-verification-plan.schema.json'));
	assert.ok(files.has('schemas/classify-report.schema.json'));
	assert.ok(files.has('schemas/docs-review-list.schema.json'));
	assert.ok(files.has('schemas/explain-report.schema.json'));
	assert.ok(files.has('schemas/handoff-validation-report.schema.json'));
	assert.ok(files.has('schemas/impact-report.schema.json'));
	assert.ok(files.has('schemas/line-endings-report.schema.json'));
	assert.ok(files.has('schemas/generated-boundary-report.schema.json'));
	assert.ok(files.has('schemas/script-pack-suggestion-report.schema.json'));
	assert.ok(files.has('schemas/quality-gaming-report.schema.json'));
	assert.ok(files.has('schemas/code-outline-report.schema.json'));
	assert.ok(files.has('schemas/code-symbol-read-report.schema.json'));
	assert.ok(files.has('schemas/verify-report.schema.json'));
	for (const contract of publicJsonContracts) {
		assert.ok(files.has(`schemas/${contract.schemaFile}`), `${contract.schemaFile} should be packaged`);
	}
	assert.ok(files.has('examples/README.md'));
	assert.ok(files.has('examples/docs-only/README.md'));
	assert.ok(files.has('examples/host-instruction-conflicts/README.md'));
	assert.ok(files.has('examples/minimal-js/README.md'));
	assert.ok(files.has('examples/missing-command-contracts/README.md'));
	assert.ok(files.has('examples/nested-repos/README.md'));
	for (const locale of supportedTemplateLocales) {
		assert.ok(files.has(`templates/default/locales/${locale}/AGENTS.md`));
	}
	for (const relativePath of templateSkillCreates) {
		assert.ok(files.has(`templates/default/locales/en/${relativePath}`), `${relativePath} should be packaged from the canonical locale`);
	}
	for (const locale of supportedTemplateLocales.filter((entry) => entry !== 'en')) {
		const localizedSkillPrefix = `templates/default/locales/${locale}/.mustflow/skills/`;

		assert.equal(
			Array.from(files).some((file) => file.startsWith(localizedSkillPrefix)),
			false,
			`${locale} should not package duplicated localized skill files`,
		);
	}
	assert.equal(files.has('templates/default/files/AGENTS.md'), false);
	assert.equal(files.has('dist/cli/lib/package-manager.js'), false);
	assert.equal(files.has('docs-site/package.json'), false);
	assert.equal(files.has('tests/cli/init.test.js'), false);
});
