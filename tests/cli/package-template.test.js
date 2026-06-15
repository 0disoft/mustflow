import assert from 'node:assert/strict';
import { cpSync, existsSync, mkdtempSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { test } from 'node:test';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';

const projectRoot = path.resolve(fileURLToPath(new URL('../..', import.meta.url)));
const supportedTemplateLocales = ['en', 'ko', 'zh', 'es', 'fr', 'hi'];
const technologySkillNames = [
	'astro-code-change',
	'bun-code-change',
	'css-code-change',
	'cpp-code-change',
	'dart-code-change',
	'docker-code-change',
	'elysia-code-change',
	'flutter-code-change',
	'go-code-change',
	'hono-code-change',
	'html-code-change',
	'javascript-code-change',
	'node-code-change',
	'python-code-change',
	'rust-code-change',
	'svelte-code-change',
	'tailwind-code-change',
	'tauri-code-change',
	'typescript-code-change',
	'unocss-code-change',
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

function toPosix(relativePath) {
	return relativePath.split(path.sep).join('/');
}

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
	assert.ok(template.manifest.skillProfiles.minimal.includes('api-contract-change'));
	assert.ok(template.manifest.skillProfiles.minimal.includes('backend-reliability-change'));
	assert.ok(template.manifest.skillProfiles.minimal.includes('auth-permission-change'));
	assert.ok(template.manifest.skillProfiles.minimal.includes('code-review'));
	assert.ok(template.manifest.skillProfiles.minimal.includes('idempotency-integrity-review'));
	assert.ok(template.manifest.skillProfiles.minimal.includes('queue-processing-integrity-review'));
	assert.ok(template.manifest.skillProfiles.minimal.includes('transaction-boundary-integrity-review'));
	assert.ok(template.manifest.skillProfiles.minimal.includes('api-request-performance-review'));
	assert.ok(template.manifest.skillProfiles.minimal.includes('heuristic-candidate-selection'));
	assert.ok(template.manifest.skillProfiles.minimal.includes('command-contract-authoring'));
	assert.ok(template.manifest.skillProfiles.minimal.includes('retry-policy-integrity-review'));
	assert.ok(template.manifest.skillProfiles.minimal.includes('config-env-change'));
	assert.ok(template.manifest.skillProfiles.minimal.includes('database-change-safety'));
	assert.ok(template.manifest.skillProfiles.minimal.includes('database-migration-change'));
	assert.ok(template.manifest.skillProfiles.minimal.includes('dependency-upgrade-review'));
	assert.ok(template.manifest.skillProfiles.minimal.includes('version-freshness-check'));
	assert.ok(template.manifest.skillProfiles.minimal.includes('file-path-cross-platform-change'));
	assert.ok(template.manifest.skillProfiles.minimal.includes('source-anchor-authoring'));
	assert.ok(template.manifest.skillProfiles.minimal.includes('test-design-guard'));
	assert.ok(template.manifest.skillProfiles.minimal.includes('test-maintenance'));
	assert.ok(template.manifest.skillProfiles.minimal.includes('vertical-slice-tdd'));
	for (const skillName of technologySkillNames) {
		assert.ok(template.manifest.skillProfiles.minimal.includes(skillName), `minimal should include ${skillName}`);
		assert.ok(template.manifest.skillProfiles.patterns.includes(skillName), `patterns should include ${skillName}`);
		assert.ok(template.manifest.skillProfiles.oss.includes(skillName), `oss should include ${skillName}`);
		assert.ok(template.manifest.skillProfiles.team.includes(skillName), `team should include ${skillName}`);
		assert.ok(template.manifest.skillProfiles.product.includes(skillName), `product should include ${skillName}`);
		assert.ok(template.manifest.skillProfiles.library.includes(skillName), `library should include ${skillName}`);
	}
	for (const profileName of template.manifest.profiles) {
		assert.ok(
			template.manifest.skillProfiles[profileName].includes('config-env-change'),
			`${profileName} should include config-env-change`,
		);
		assert.ok(
			template.manifest.skillProfiles[profileName].includes('version-freshness-check'),
			`${profileName} should include version-freshness-check`,
		);
		assert.ok(
			template.manifest.skillProfiles[profileName].includes('structure-first-engineering'),
			`${profileName} should include structure-first-engineering`,
		);
		assert.ok(
			template.manifest.skillProfiles[profileName].includes('heuristic-candidate-selection'),
			`${profileName} should include heuristic-candidate-selection`,
		);
		assert.ok(
			template.manifest.skillProfiles[profileName].includes('http-delivery-streaming'),
			`${profileName} should include http-delivery-streaming`,
		);
		assert.ok(
			template.manifest.skillProfiles[profileName].includes('backend-reliability-change'),
			`${profileName} should include backend-reliability-change`,
		);
		assert.ok(
			template.manifest.skillProfiles[profileName].includes('api-request-performance-review'),
			`${profileName} should include api-request-performance-review`,
		);
		assert.ok(
			template.manifest.skillProfiles[profileName].includes('idempotency-integrity-review'),
			`${profileName} should include idempotency-integrity-review`,
		);
		assert.ok(
			template.manifest.skillProfiles[profileName].includes('retry-policy-integrity-review'),
			`${profileName} should include retry-policy-integrity-review`,
		);
		assert.ok(
			template.manifest.skillProfiles[profileName].includes('queue-processing-integrity-review'),
			`${profileName} should include queue-processing-integrity-review`,
		);
		assert.ok(
			template.manifest.skillProfiles[profileName].includes('transaction-boundary-integrity-review'),
			`${profileName} should include transaction-boundary-integrity-review`,
		);
	}
	assert.equal(template.manifest.skillProfiles.minimal.includes('architecture-deepening-review'), false);
	assert.equal(template.manifest.skillProfiles.minimal.includes('cli-output-contract-review'), false);
	assert.equal(template.manifest.skillProfiles.minimal.includes('command-pattern'), false);
	assert.equal(template.manifest.skillProfiles.minimal.includes('composition-over-inheritance'), false);
	assert.equal(template.manifest.skillProfiles.minimal.includes('cross-platform-filesystem-safety'), false);
	assert.equal(template.manifest.skillProfiles.minimal.includes('dependency-injection'), false);
	assert.equal(template.manifest.skillProfiles.minimal.includes('external-skill-intake'), false);
	assert.equal(template.manifest.skillProfiles.minimal.includes('github-contribution-quality-gate'), false);
	assert.equal(template.manifest.skillProfiles.minimal.includes('facade-pattern'), false);
	assert.equal(template.manifest.skillProfiles.minimal.includes('null-object-pattern'), false);
	assert.equal(template.manifest.skillProfiles.minimal.includes('process-execution-safety'), false);
	assert.equal(template.manifest.skillProfiles.minimal.includes('pure-core-imperative-shell'), false);
	assert.equal(template.manifest.skillProfiles.minimal.includes('release-notes-authoring'), false);
	assert.equal(template.manifest.skillProfiles.minimal.includes('release-publish-change'), false);
	assert.equal(template.manifest.skillProfiles.minimal.includes('result-option'), false);
	assert.equal(template.manifest.skillProfiles.minimal.includes('service-boundary-architecture'), false);
	assert.equal(template.manifest.skillProfiles.minimal.includes('state-machine-pattern'), false);
	assert.equal(template.manifest.skillProfiles.minimal.includes('strategy-pattern'), false);
	assert.equal(template.manifest.skillProfiles.minimal.includes('frontend-render-stability'), false);
	assert.equal(template.manifest.skillProfiles.minimal.includes('llm-service-ux-review'), false);
	assert.equal(template.manifest.skillProfiles.minimal.includes('search-ad-content-authoring'), false);
	assert.ok(template.manifest.skillProfiles.minimal.includes('web-render-performance-review'));
	assert.ok(template.manifest.skillProfiles.minimal.includes('core-web-vitals-field-review'));
	assert.ok(template.manifest.skillProfiles.minimal.includes('image-delivery-performance-review'));
	assert.ok(template.manifest.skillProfiles.minimal.includes('client-bundle-pruning-review'));
	assert.ok(template.manifest.skillProfiles.minimal.includes('frame-render-performance-review'));
	assert.ok(template.manifest.skillProfiles.minimal.includes('frontend-state-ownership-review'));
	assert.ok(template.manifest.skillProfiles.minimal.includes('frontend-stress-layout-review'));
	assert.ok(template.manifest.skillProfiles.minimal.includes('frontend-accessibility-tree-review'));
	assert.ok(template.manifest.skillProfiles.minimal.includes('frontend-localization-review'));
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
	assert.ok(template.manifest.skillProfiles.patterns.includes('service-boundary-architecture'));
	assert.ok(template.manifest.skillProfiles.patterns.includes('state-machine-pattern'));
	assert.ok(template.manifest.skillProfiles.patterns.includes('strategy-pattern'));
	assert.equal(template.manifest.skillProfiles.product.includes('architecture-deepening-review'), false);
	assert.ok(template.manifest.skillProfiles.product.includes('command-contract-authoring'));
	assert.equal(template.manifest.skillProfiles.product.includes('cli-output-contract-review'), false);
	assert.equal(template.manifest.skillProfiles.product.includes('process-execution-safety'), false);
	assert.equal(template.manifest.skillProfiles.product.includes('release-notes-authoring'), false);
	assert.equal(template.manifest.skillProfiles.product.includes('release-publish-change'), false);
	assert.ok(template.manifest.skillProfiles.product.includes('frontend-render-stability'));
	assert.ok(template.manifest.skillProfiles.product.includes('llm-service-ux-review'));
	assert.ok(template.manifest.skillProfiles.product.includes('search-ad-content-authoring'));
	assert.ok(template.manifest.skillProfiles.product.includes('service-boundary-architecture'));
	assert.ok(template.manifest.skillProfiles.product.includes('web-render-performance-review'));
	assert.ok(template.manifest.skillProfiles.product.includes('core-web-vitals-field-review'));
	assert.ok(template.manifest.skillProfiles.product.includes('image-delivery-performance-review'));
	assert.ok(template.manifest.skillProfiles.product.includes('client-bundle-pruning-review'));
	assert.ok(template.manifest.skillProfiles.product.includes('frame-render-performance-review'));
	assert.ok(template.manifest.skillProfiles.product.includes('frontend-state-ownership-review'));
	assert.ok(template.manifest.skillProfiles.product.includes('frontend-stress-layout-review'));
	assert.ok(template.manifest.skillProfiles.product.includes('frontend-accessibility-tree-review'));
	assert.ok(template.manifest.skillProfiles.product.includes('frontend-localization-review'));
	assert.ok(template.manifest.skillProfiles.product.includes('web-asset-optimization'));
	assert.ok(template.manifest.skillProfiles.product.includes('visual-review-artifact'));
	assert.ok(template.manifest.skillProfiles.product.includes('github-contribution-quality-gate'));
	assert.ok(template.manifest.skillProfiles.team.includes('architecture-deepening-review'));
	assert.ok(template.manifest.skillProfiles.team.includes('command-contract-authoring'));
	assert.ok(template.manifest.skillProfiles.team.includes('cross-platform-filesystem-safety'));
	assert.ok(template.manifest.skillProfiles.team.includes('process-execution-safety'));
	assert.equal(template.manifest.skillProfiles.team.includes('cli-output-contract-review'), false);
	assert.equal(template.manifest.skillProfiles.team.includes('release-notes-authoring'), false);
	assert.equal(template.manifest.skillProfiles.team.includes('release-publish-change'), false);
	assert.ok(template.manifest.skillProfiles.team.includes('github-contribution-quality-gate'));
	assert.ok(template.manifest.skillProfiles.team.includes('multi-agent-work-coordination'));
	assert.ok(template.manifest.skillProfiles.team.includes('service-boundary-architecture'));
	assert.ok(template.manifest.skillProfiles.oss.includes('architecture-deepening-review'));
	assert.ok(template.manifest.skillProfiles.oss.includes('cli-output-contract-review'));
	assert.ok(template.manifest.skillProfiles.oss.includes('command-contract-authoring'));
	assert.ok(template.manifest.skillProfiles.oss.includes('cross-platform-filesystem-safety'));
	assert.ok(template.manifest.skillProfiles.oss.includes('external-skill-intake'));
	assert.ok(template.manifest.skillProfiles.oss.includes('github-contribution-quality-gate'));
	assert.ok(template.manifest.skillProfiles.oss.includes('process-execution-safety'));
	assert.ok(template.manifest.skillProfiles.oss.includes('release-notes-authoring'));
	assert.ok(template.manifest.skillProfiles.oss.includes('release-publish-change'));
	assert.ok(template.manifest.skillProfiles.oss.includes('service-boundary-architecture'));
	assert.ok(template.manifest.skillProfiles.oss.includes('skill-authoring'));
	assert.ok(template.manifest.skillProfiles.oss.includes('vertical-slice-tdd'));
	assert.ok(template.manifest.skillProfiles.library.includes('architecture-deepening-review'));
	assert.ok(template.manifest.skillProfiles.library.includes('cli-output-contract-review'));
	assert.ok(template.manifest.skillProfiles.library.includes('command-contract-authoring'));
	assert.ok(template.manifest.skillProfiles.library.includes('cross-platform-filesystem-safety'));
	assert.ok(template.manifest.skillProfiles.library.includes('github-contribution-quality-gate'));
	assert.ok(template.manifest.skillProfiles.library.includes('migration-safety-check'));
	assert.ok(template.manifest.skillProfiles.library.includes('process-execution-safety'));
	assert.ok(template.manifest.skillProfiles.library.includes('release-notes-authoring'));
	assert.ok(template.manifest.skillProfiles.library.includes('release-publish-change'));
	assert.ok(template.manifest.skillProfiles.library.includes('service-boundary-architecture'));
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
