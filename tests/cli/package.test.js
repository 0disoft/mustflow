import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { cpSync, existsSync, mkdtempSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { test } from 'node:test';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';

const projectRoot = path.resolve(fileURLToPath(new URL('../..', import.meta.url)));
const packageJson = JSON.parse(readFileSync(path.join(projectRoot, 'package.json'), 'utf8'));
const supportedTemplateLocales = ['en', 'ko', 'zh', 'es', 'fr', 'hi'];
const deferredContractConfigFiles = [
	'.mustflow/config/changes.toml',
	'.mustflow/config/validations.toml',
	'.mustflow/config/surfaces.toml',
	'.mustflow/config/artifacts.toml',
	'.mustflow/config/policy.toml',
];

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

test('package metadata is ready for public npm publishing', () => {
	assert.equal(packageJson.version, '1.15.28');
	assert.equal(packageJson.license, 'MIT-0');
	assert.equal(packageJson.homepage, 'https://mustflow.github.io');
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

test('package exposes a real install verification script', () => {
	assert.equal(packageJson.scripts.prepack, 'npm run build');
	assert.equal(packageJson.scripts.test, 'bun run test:full');
	assert.equal(packageJson.scripts['test:fast'], 'bun run build && node scripts/run-cli-tests.mjs fast');
	assert.equal(packageJson.scripts['test:related'], 'bun run build && node scripts/run-cli-tests.mjs related');
	assert.equal(packageJson.scripts['test:cli'], 'bun run build && node scripts/run-cli-tests.mjs cli');
	assert.equal(packageJson.scripts['test:release'], 'bun run build && node scripts/run-cli-tests.mjs release');
	assert.equal(packageJson.scripts['test:full'], 'bun run build && node scripts/run-cli-tests.mjs full');
	assert.equal(packageJson.scripts.check, 'bun run check:package && bun run test:full');
	assert.equal(packageJson.scripts['check:pack'], 'npm pack --dry-run --json');
	assert.equal(packageJson.scripts['check:install'], 'npm run check:pack && node --test tests/integration/*.test.js');
	assert.equal(packageJson.scripts['release:check'], 'npm run check && npm run docs:check && npm run check:install');
	assert.equal(packageJson.scripts['docs:check:fast'], 'bun run --cwd docs-site check:fast');
	assert.equal(packageJson.scripts.prepublishOnly, 'npm run release:check');
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

test('default template includes complete folders for every supported document locale', async () => {
	const templatesModule = await import(pathToFileURL(path.join(projectRoot, 'dist', 'cli', 'lib', 'templates.js')).href);
	const template = templatesModule.getDefaultTemplate();
	const localesRoot = path.join(projectRoot, 'templates', 'default', 'locales');
	const sourceRoot = path.join(localesRoot, 'en');
	const sourceFiles = collectRelativeFiles(sourceRoot);

	assert.deepEqual(template.manifest.locales, supportedTemplateLocales);

	for (const locale of supportedTemplateLocales) {
		const localeRoot = path.join(localesRoot, locale);
		assert.deepEqual(collectRelativeFiles(localeRoot), sourceFiles, `${locale} should mirror English template files`);
	}
});

test('default template keeps candidate contract config files out of mf init surface', async () => {
	const templatesModule = await import(pathToFileURL(path.join(projectRoot, 'dist', 'cli', 'lib', 'templates.js')).href);
	const template = templatesModule.getDefaultTemplate();
	const templateRoots = [
		path.join(template.templateRoot, template.manifest.commonRoot),
		...template.manifest.locales.map((locale) =>
			path.join(template.templateRoot, template.manifest.localesRoot, locale),
		),
	];

	for (const relativePath of deferredContractConfigFiles) {
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

test('npm package includes compiled cli and default template sources', () => {
	const result = spawnSync('npm pack --dry-run --json --ignore-scripts', {
		cwd: projectRoot,
		encoding: 'utf8',
		shell: true,
	});

	assert.equal(result.status, 0);
	const [pack] = JSON.parse(result.stdout);
	const files = new Set(pack.files.map((file) => file.path));

	assert.ok(files.has('dist/cli/index.js'));
	assert.ok(files.has('dist/cli/commands/classify.js'));
	assert.ok(files.has('dist/cli/commands/init.js'));
	assert.ok(files.has('dist/cli/commands/docs.js'));
	assert.ok(files.has('dist/cli/commands/index.js'));
	assert.ok(files.has('dist/cli/commands/explain.js'));
	assert.ok(files.has('dist/cli/commands/impact.js'));
	assert.ok(files.has('dist/cli/commands/search.js'));
	assert.ok(files.has('dist/cli/commands/dashboard.js'));
	assert.ok(files.has('dist/cli/commands/update.js'));
	assert.ok(files.has('dist/cli/commands/verify.js'));
	assert.ok(files.has('templates/default/manifest.toml'));
	assert.ok(files.has('templates/default/i18n.toml'));
	assert.ok(files.has('dist/cli/lib/template-i18n.js'));
	assert.ok(files.has('templates/default/common/.mustflow/config/commands.toml'));
	assert.ok(files.has('templates/default/common/.mustflow/config/preferences.toml'));
	assert.ok(files.has('schemas/doctor-report.schema.json'));
	assert.ok(files.has('schemas/context-report.schema.json'));
	assert.ok(files.has('schemas/run-receipt.schema.json'));
	assert.ok(files.has('schemas/commands.schema.json'));
	assert.ok(files.has('schemas/classify-report.schema.json'));
	assert.ok(files.has('schemas/docs-review-list.schema.json'));
	assert.ok(files.has('schemas/explain-report.schema.json'));
	assert.ok(files.has('schemas/impact-report.schema.json'));
	assert.ok(files.has('schemas/verify-report.schema.json'));
	for (const locale of supportedTemplateLocales) {
		assert.ok(files.has(`templates/default/locales/${locale}/AGENTS.md`));
		assert.ok(files.has(`templates/default/locales/${locale}/.mustflow/skills/artifact-integrity-check/SKILL.md`));
		assert.ok(files.has(`templates/default/locales/${locale}/.mustflow/skills/contract-sync-check/SKILL.md`));
		assert.ok(files.has(`templates/default/locales/${locale}/.mustflow/skills/date-number-audit/SKILL.md`));
		assert.ok(files.has(`templates/default/locales/${locale}/.mustflow/skills/dependency-reality-check/SKILL.md`));
		assert.ok(files.has(`templates/default/locales/${locale}/.mustflow/skills/diff-risk-review/SKILL.md`));
		assert.ok(files.has(`templates/default/locales/${locale}/.mustflow/skills/docs-prose-review/SKILL.md`));
		assert.ok(files.has(`templates/default/locales/${locale}/.mustflow/skills/external-prompt-injection-defense/SKILL.md`));
		assert.ok(files.has(`templates/default/locales/${locale}/.mustflow/skills/instruction-conflict-scope-check/SKILL.md`));
		assert.ok(files.has(`templates/default/locales/${locale}/.mustflow/skills/migration-safety-check/SKILL.md`));
		assert.ok(files.has(`templates/default/locales/${locale}/.mustflow/skills/performance-budget-check/SKILL.md`));
		assert.ok(files.has(`templates/default/locales/${locale}/.mustflow/skills/pattern-scout/SKILL.md`));
		assert.ok(files.has(`templates/default/locales/${locale}/.mustflow/skills/project-context-authoring/SKILL.md`));
		assert.ok(files.has(`templates/default/locales/${locale}/.mustflow/skills/readme-authoring/SKILL.md`));
		assert.ok(files.has(`templates/default/locales/${locale}/.mustflow/skills/repro-first-debug/SKILL.md`));
		assert.ok(files.has(`templates/default/locales/${locale}/.mustflow/skills/security-privacy-review/SKILL.md`));
		assert.ok(files.has(`templates/default/locales/${locale}/.mustflow/skills/security-regression-tests/SKILL.md`));
		assert.ok(files.has(`templates/default/locales/${locale}/.mustflow/skills/source-freshness-check/SKILL.md`));
		assert.ok(files.has(`templates/default/locales/${locale}/.mustflow/skills/skill-authoring/SKILL.md`));
		assert.ok(files.has(`templates/default/locales/${locale}/.mustflow/skills/ui-quality-gate/SKILL.md`));
		assert.ok(files.has(`templates/default/locales/${locale}/.mustflow/skills/web-asset-optimization/SKILL.md`));
	}
	assert.equal(files.has('templates/default/files/AGENTS.md'), false);
	assert.equal(files.has('dist/cli/lib/package-manager.js'), false);
	assert.equal(files.has('docs-site/package.json'), false);
	assert.equal(files.has('tests/cli/init.test.js'), false);
});
