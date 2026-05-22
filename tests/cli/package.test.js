import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { cpSync, existsSync, mkdtempSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { test } from 'node:test';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';

const projectRoot = path.resolve(fileURLToPath(new URL('../..', import.meta.url)));
const packageJson = JSON.parse(readFileSync(path.join(projectRoot, 'package.json'), 'utf8'));
const templateManifest = readFileSync(path.join(projectRoot, 'templates', 'default', 'manifest.toml'), 'utf8');
const cliTestRunner = readFileSync(path.join(projectRoot, 'scripts', 'run-cli-tests.mjs'), 'utf8');
const publishNpmWorkflow = readFileSync(path.join(projectRoot, '.github', 'workflows', 'publish-npm.yml'), 'utf8');
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

function collectRelativeFiles(directory) {
	const files = [];

	for (const entry of readdirSync(directory)) {
		const fullPath = path.join(directory, entry);
		const stat = statSync(fullPath);

		if (stat.isDirectory()) {
			files.push(...collectRelativeFiles(fullPath).map((file) => path.join(entry, file)));
			continue;
		}

		files.push(entry);
	}

	return files.sort((left, right) => left.localeCompare(right));
}

function toPosix(relativePath) {
	return relativePath.split(path.sep).join('/');
}

function readProjectText(relativePath) {
	return readFileSync(path.join(projectRoot, ...relativePath.split('/')), 'utf8');
}

test('package metadata is ready for public npm publishing', () => {
	assert.equal(packageJson.version, '2.22.13');
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
	assert.doesNotMatch(publishNpmWorkflow, /NODE_AUTH_TOKEN/u);
	assert.doesNotMatch(publishNpmWorkflow, /secrets\.NODE_AUTH_TOKEN/u);
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
		assert.match(verifyCommand, /decision_graph/u, `${locale} verify docs should document decision graph`);
		assert.match(verifyCommand, /effectGraph/u, `${locale} verify docs should document command graphs`);
		assert.match(verifyCommand, /surfaceReadModels/u, `${locale} verify docs should document surface read models`);
		assert.match(localIndexDesign, /search_ngrams/u, `${locale} local index docs should document n-gram search rows`);
		assert.match(localIndexDesign, /indexed_files/u, `${locale} local index docs should document indexed file fingerprints`);
		assert.match(releaseChecksDesign, /MUSTFLOW_TEST_CONCURRENCY/u, `${locale} release docs should document test concurrency`);
	}
});

test('default template i18n metadata stays in sync with localized template files', async () => {
	const templatesModule = await import(pathToFileURL(path.join(projectRoot, 'dist', 'cli', 'lib', 'templates.js')).href);
	const i18nModule = await import(pathToFileURL(path.join(projectRoot, 'dist', 'cli', 'lib', 'template-i18n.js')).href);

	const issues = i18nModule.validateTemplateI18n(templatesModule.getDefaultTemplate());

	assert.deepEqual(issues, []);
});

test('default template source metadata uses English text', () => {
	const metadataPaths = [
		'templates/default/manifest.toml',
		'templates/default/i18n.toml',
		'templates/default/common/.mustflow/config/commands.toml',
	];

	for (const relativePath of metadataPaths) {
		const content = readFileSync(path.join(projectRoot, relativePath), 'utf8');
		assert.equal(/[가-힣]/u.test(content), false, `${relativePath} should not contain Korean text`);
	}
});

test('default template declares profile-specific skill surfaces', async () => {
	const templatesModule = await import(pathToFileURL(path.join(projectRoot, 'dist', 'cli', 'lib', 'templates.js')).href);
	const template = templatesModule.getDefaultTemplate();

	assert.deepEqual(template.manifest.profiles, ['minimal', 'patterns', 'oss', 'team', 'product', 'library']);
	assert.equal(template.manifest.defaultProfile, 'minimal');
	assert.ok(template.manifest.skillProfiles.minimal.includes('adapter-boundary'));
	assert.ok(template.manifest.skillProfiles.minimal.includes('code-review'));
	assert.ok(template.manifest.skillProfiles.minimal.includes('command-contract-authoring'));
	assert.ok(template.manifest.skillProfiles.minimal.includes('database-change-safety'));
	assert.ok(template.manifest.skillProfiles.minimal.includes('source-anchor-authoring'));
	assert.ok(template.manifest.skillProfiles.minimal.includes('test-design-guard'));
	assert.ok(template.manifest.skillProfiles.minimal.includes('test-maintenance'));
	assert.ok(template.manifest.skillProfiles.minimal.includes('vertical-slice-tdd'));
	assert.equal(template.manifest.skillProfiles.minimal.includes('architecture-deepening-review'), false);
	assert.equal(template.manifest.skillProfiles.minimal.includes('cli-output-contract-review'), false);
	assert.equal(template.manifest.skillProfiles.minimal.includes('command-pattern'), false);
	assert.equal(template.manifest.skillProfiles.minimal.includes('composition-over-inheritance'), false);
	assert.equal(template.manifest.skillProfiles.minimal.includes('cross-platform-filesystem-safety'), false);
	assert.equal(template.manifest.skillProfiles.minimal.includes('dependency-injection'), false);
	assert.equal(template.manifest.skillProfiles.minimal.includes('external-skill-intake'), false);
	assert.equal(template.manifest.skillProfiles.minimal.includes('facade-pattern'), false);
	assert.equal(template.manifest.skillProfiles.minimal.includes('null-object-pattern'), false);
	assert.equal(template.manifest.skillProfiles.minimal.includes('process-execution-safety'), false);
	assert.equal(template.manifest.skillProfiles.minimal.includes('pure-core-imperative-shell'), false);
	assert.equal(template.manifest.skillProfiles.minimal.includes('release-notes-authoring'), false);
	assert.equal(template.manifest.skillProfiles.minimal.includes('result-option'), false);
	assert.equal(template.manifest.skillProfiles.minimal.includes('state-machine-pattern'), false);
	assert.equal(template.manifest.skillProfiles.minimal.includes('strategy-pattern'), false);
	assert.equal(template.manifest.skillProfiles.minimal.includes('llm-service-ux-review'), false);
	assert.equal(template.manifest.skillProfiles.minimal.includes('search-ad-content-authoring'), false);
	assert.equal(template.manifest.skillProfiles.minimal.includes('web-asset-optimization'), false);
	assert.ok(template.manifest.skillProfiles.patterns.includes('architecture-deepening-review'));
	assert.ok(template.manifest.skillProfiles.patterns.includes('command-contract-authoring'));
	assert.ok(template.manifest.skillProfiles.patterns.includes('command-pattern'));
	assert.ok(template.manifest.skillProfiles.patterns.includes('composition-over-inheritance'));
	assert.ok(template.manifest.skillProfiles.patterns.includes('dependency-injection'));
	assert.ok(template.manifest.skillProfiles.patterns.includes('facade-pattern'));
	assert.ok(template.manifest.skillProfiles.patterns.includes('null-object-pattern'));
	assert.ok(template.manifest.skillProfiles.patterns.includes('pure-core-imperative-shell'));
	assert.ok(template.manifest.skillProfiles.patterns.includes('result-option'));
	assert.ok(template.manifest.skillProfiles.patterns.includes('state-machine-pattern'));
	assert.ok(template.manifest.skillProfiles.patterns.includes('strategy-pattern'));
	assert.equal(template.manifest.skillProfiles.product.includes('architecture-deepening-review'), false);
	assert.ok(template.manifest.skillProfiles.product.includes('command-contract-authoring'));
	assert.equal(template.manifest.skillProfiles.product.includes('cli-output-contract-review'), false);
	assert.equal(template.manifest.skillProfiles.product.includes('process-execution-safety'), false);
	assert.equal(template.manifest.skillProfiles.product.includes('release-notes-authoring'), false);
	assert.ok(template.manifest.skillProfiles.product.includes('llm-service-ux-review'));
	assert.ok(template.manifest.skillProfiles.product.includes('search-ad-content-authoring'));
	assert.ok(template.manifest.skillProfiles.product.includes('web-asset-optimization'));
	assert.ok(template.manifest.skillProfiles.product.includes('visual-review-artifact'));
	assert.ok(template.manifest.skillProfiles.team.includes('architecture-deepening-review'));
	assert.ok(template.manifest.skillProfiles.team.includes('command-contract-authoring'));
	assert.ok(template.manifest.skillProfiles.team.includes('cross-platform-filesystem-safety'));
	assert.ok(template.manifest.skillProfiles.team.includes('process-execution-safety'));
	assert.equal(template.manifest.skillProfiles.team.includes('cli-output-contract-review'), false);
	assert.equal(template.manifest.skillProfiles.team.includes('release-notes-authoring'), false);
	assert.ok(template.manifest.skillProfiles.team.includes('multi-agent-work-coordination'));
	assert.ok(template.manifest.skillProfiles.oss.includes('architecture-deepening-review'));
	assert.ok(template.manifest.skillProfiles.oss.includes('cli-output-contract-review'));
	assert.ok(template.manifest.skillProfiles.oss.includes('command-contract-authoring'));
	assert.ok(template.manifest.skillProfiles.oss.includes('cross-platform-filesystem-safety'));
	assert.ok(template.manifest.skillProfiles.oss.includes('external-skill-intake'));
	assert.ok(template.manifest.skillProfiles.oss.includes('process-execution-safety'));
	assert.ok(template.manifest.skillProfiles.oss.includes('release-notes-authoring'));
	assert.ok(template.manifest.skillProfiles.oss.includes('skill-authoring'));
	assert.ok(template.manifest.skillProfiles.oss.includes('vertical-slice-tdd'));
	assert.ok(template.manifest.skillProfiles.library.includes('architecture-deepening-review'));
	assert.ok(template.manifest.skillProfiles.library.includes('cli-output-contract-review'));
	assert.ok(template.manifest.skillProfiles.library.includes('command-contract-authoring'));
	assert.ok(template.manifest.skillProfiles.library.includes('cross-platform-filesystem-safety'));
	assert.ok(template.manifest.skillProfiles.library.includes('migration-safety-check'));
	assert.ok(template.manifest.skillProfiles.library.includes('process-execution-safety'));
	assert.ok(template.manifest.skillProfiles.library.includes('release-notes-authoring'));
});

test('default template locales use localized workflow docs and canonical English skills', async () => {
	const templatesModule = await import(pathToFileURL(path.join(projectRoot, 'dist', 'cli', 'lib', 'templates.js')).href);
	const template = templatesModule.getDefaultTemplate();
	const localesRoot = path.join(projectRoot, 'templates', 'default', 'locales');
	const sourceRoot = path.join(localesRoot, 'en');
	const sourceFiles = collectRelativeFiles(sourceRoot);
	const localizedDocumentFiles = sourceFiles.filter((relativePath) => !toPosix(relativePath).startsWith('.mustflow/skills/'));

	assert.deepEqual(template.manifest.locales, supportedTemplateLocales);

	for (const locale of supportedTemplateLocales) {
		const localeRoot = path.join(localesRoot, locale);
		const localeFiles = collectRelativeFiles(localeRoot);

		if (locale === template.manifest.defaultLocale) {
			assert.deepEqual(localeFiles, sourceFiles, `${locale} should contain the canonical template files`);
			continue;
		}

		assert.deepEqual(localeFiles, localizedDocumentFiles, `${locale} should localize workflow docs without duplicating skills`);

		const selectedFiles = templatesModule.getTemplateFiles(template, locale);
		const skillFile = selectedFiles.find((file) => file.relativePath === '.mustflow/skills/code-review/SKILL.md');
		const agentsFile = selectedFiles.find((file) => file.relativePath === 'AGENTS.md');

		assert.ok(skillFile, `${locale} should still install selected skills`);
		assert.ok(
			toPosix(path.relative(projectRoot, skillFile.sourcePath)).startsWith('templates/default/locales/en/.mustflow/skills/'),
			`${locale} should fall back to canonical English skills`,
		);
		assert.ok(agentsFile, `${locale} should install localized AGENTS.md`);
		assert.ok(
			toPosix(path.relative(projectRoot, agentsFile.sourcePath)).startsWith(`templates/default/locales/${locale}/`),
			`${locale} should still use localized workflow documents`,
		);
	}
});

test('default template keeps candidate contract config files out of mf init surface', async () => {
	const templatesModule = await import(pathToFileURL(path.join(projectRoot, 'dist', 'cli', 'lib', 'templates.js')).href);
	const contractModelsModule = await import(pathToFileURL(path.join(projectRoot, 'dist', 'core', 'contract-models.js')).href);
	const template = templatesModule.getDefaultTemplate();
	const candidateModels = contractModelsModule.getCandidateContractModelDefinitions();
	const nonInstalledContractConfigFiles = contractModelsModule.getNonInstalledContractConfigPaths();
	const templateRoots = [
		path.join(template.templateRoot, template.manifest.commonRoot),
		...template.manifest.locales.map((locale) =>
			path.join(template.templateRoot, template.manifest.localesRoot, locale),
		),
	];

	assert.deepEqual(candidateModels.map((model) => model.id), ['changes', 'validations', 'surfaces', 'artifacts']);
	assert.ok(candidateModels.every((model) => model.installByDefault === false));

	for (const relativePath of nonInstalledContractConfigFiles) {
		assert.equal(
			template.manifest.creates.includes(relativePath),
			false,
			`${relativePath} must not be installed by default`,
		);

		for (const templateRoot of templateRoots) {
			assert.equal(
				existsSync(path.join(templateRoot, ...relativePath.split('/'))),
				false,
				`${relativePath} must not exist in ${path.relative(projectRoot, templateRoot)}`,
			);
		}
	}
});

test('template i18n validation reports invalid translation metadata', async () => {
	const templatesModule = await import(pathToFileURL(path.join(projectRoot, 'dist', 'cli', 'lib', 'templates.js')).href);
	const i18nModule = await import(pathToFileURL(path.join(projectRoot, 'dist', 'cli', 'lib', 'template-i18n.js')).href);
	const templateRoot = mkdtempSync(path.join(tmpdir(), 'mustflow-template-i18n-'));

	try {
		cpSync(path.join(projectRoot, 'templates', 'default'), templateRoot, { recursive: true });
		const i18nPath = path.join(templateRoot, 'i18n.toml');
		const brokenI18n = readFileSync(i18nPath, 'utf8').replace(
			/translations\.ko = \{ path = "locales\/ko\/AGENTS\.md", source_revision = \d+, status = "current" \}/u,
			'translations.ko = { path = "locales/ko/MISSING.md", source_revision = 0, status = "done" }',
		);
		writeFileSync(i18nPath, brokenI18n);

		const baseTemplate = templatesModule.getDefaultTemplate();
		const issues = i18nModule.validateTemplateI18n({
			manifestPath: path.join(templateRoot, 'manifest.toml'),
			templateRoot,
			manifest: baseTemplate.manifest,
		});

		assert.ok(issues.some((issue) => issue.includes('[documents.agents.root.translations.ko].status')));
		assert.ok(issues.some((issue) => issue.includes('[documents.agents.root.translations.ko].source_revision')));
		assert.ok(issues.some((issue) => issue.includes('locales/ko/MISSING.md')));
	} finally {
		rmSync(templateRoot, { recursive: true, force: true });
	}
});

test('template i18n validation reports localized frontmatter drift', async () => {
	const templatesModule = await import(pathToFileURL(path.join(projectRoot, 'dist', 'cli', 'lib', 'templates.js')).href);
	const i18nModule = await import(pathToFileURL(path.join(projectRoot, 'dist', 'cli', 'lib', 'template-i18n.js')).href);
	const templateRoot = mkdtempSync(path.join(tmpdir(), 'mustflow-template-frontmatter-'));

	try {
		cpSync(path.join(projectRoot, 'templates', 'default'), templateRoot, { recursive: true });
		const translatedAgentsPath = path.join(templateRoot, 'locales', 'ko', 'AGENTS.md');
		const brokenAgents = readFileSync(translatedAgentsPath, 'utf8').replace('locale: ko', 'locale: ja');
		writeFileSync(translatedAgentsPath, brokenAgents);

		const baseTemplate = templatesModule.getDefaultTemplate();
		const issues = i18nModule.validateTemplateI18n({
			manifestPath: path.join(templateRoot, 'manifest.toml'),
			templateRoot,
			manifest: baseTemplate.manifest,
		});

		assert.ok(issues.some((issue) => issue.includes('[documents.agents.root.translations.ko].frontmatter.locale')));
	} finally {
		rmSync(templateRoot, { recursive: true, force: true });
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
	assert.ok(files.has('dist/cli/commands/init.js'));
	assert.ok(files.has('dist/cli/commands/docs.js'));
	assert.ok(files.has('dist/cli/commands/index.js'));
	assert.ok(files.has('dist/cli/commands/line-endings.js'));
	assert.ok(files.has('dist/cli/commands/explain.js'));
	assert.ok(files.has('dist/cli/commands/handoff.js'));
	assert.ok(files.has('dist/core/line-endings.js'));
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
	assert.ok(files.has('dist/core/doc-review-triage.js'));
	assert.ok(files.has('dist/core/public-json-contracts.js'));
	assert.ok(files.has('dist/core/surface-decision-model.js'));
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
	assert.ok(files.has('schemas/classify-report.schema.json'));
	assert.ok(files.has('schemas/docs-review-list.schema.json'));
	assert.ok(files.has('schemas/explain-report.schema.json'));
	assert.ok(files.has('schemas/handoff-validation-report.schema.json'));
	assert.ok(files.has('schemas/impact-report.schema.json'));
	assert.ok(files.has('schemas/line-endings-report.schema.json'));
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
