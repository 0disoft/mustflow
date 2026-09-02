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
	'axum-code-change',
	'babylon-code-change',
	'threejs-code-change',
	'bun-code-change',
	'deno-code-change',
	'ada-code-change',
	'clickhouse-code-change',
	'css-code-change',
	'cpp-code-change',
	'dart-code-change',
	'docker-code-change',
	'duckdb-code-change',
	'elysia-code-change',
	'flutter-code-change',
	'go-code-change',
	'godot-code-change',
	'hono-code-change',
	'html-code-change',
	'java-code-change',
	'javascript-code-change',
	'node-code-change',
	'nestjs-code-change',
	'python-code-change',
	'php-code-change',
	'pascal-code-change',
	'rust-code-change',
	'svelte-code-change',
	'tailwind-code-change',
	'tauri-code-change',
	'vite-code-change',
	'wails-code-change',
	'typescript-code-change',
	'unocss-code-change',
	'vue-code-change',
];
const durableExecutionSkillNames = [
	'dual-write-consistency',
	'durable-workflow-orchestration',
	'execution-ledger-integrity-review',
	'migration-safety-check',
	'policy-decision-integrity-review',
	'session-handoff-integrity-review',
	'structured-concurrency-supervision-review',
	'two-phase-transition-integrity-review',
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

function skillNameForTemplateCreate(relativePath) {
	const match = /^\.mustflow\/skills\/([^/]+)\/SKILL\.md$/u.exec(relativePath);

	return match?.[1] ?? null;
}

function findTomlDocumentBlock(content, documentHeader) {
	const start = content.indexOf(documentHeader);

	if (start === -1) {
		return null;
	}

	const next = content.indexOf('\n[documents.', start + documentHeader.length);

	return next === -1 ? content.slice(start) : content.slice(start, next);
}

test('default template i18n metadata stays in sync with localized template files', async () => {
	const templatesModule = await import(pathToFileURL(path.join(projectRoot, 'dist', 'cli', 'lib', 'templates.js')).href);
	const i18nModule = await import(pathToFileURL(path.join(projectRoot, 'dist', 'cli', 'lib', 'template-i18n.js')).href);

	const issues = i18nModule.validateTemplateI18n(templatesModule.getDefaultTemplate());

	assert.deepEqual(issues, []);
});

test('default template i18n metadata tracks every installable skill source', async () => {
	const templatesModule = await import(pathToFileURL(path.join(projectRoot, 'dist', 'cli', 'lib', 'templates.js')).href);
	const template = templatesModule.getDefaultTemplate();
	const i18nText = readFileSync(path.join(template.templateRoot, 'i18n.toml'), 'utf8');

	for (const createPath of template.manifest.creates) {
		const skillName = skillNameForTemplateCreate(createPath);

		if (!skillName) {
			continue;
		}

		const expectedDocumentHeader = `[documents."skill.${skillName}"]`;
		const expectedSource = `source = "locales/en/${createPath}"`;
		const documentBlock = findTomlDocumentBlock(i18nText, expectedDocumentHeader);

		assert.ok(
			documentBlock,
			`i18n.toml should track ${createPath} as ${expectedDocumentHeader}`,
		);
		assert.ok(
			documentBlock.includes(expectedSource),
			`i18n.toml should map ${expectedDocumentHeader} to ${expectedSource}`,
		);
	}
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

test('default template declares lean and profile-specific skill surfaces', async () => {
	const templatesModule = await import(pathToFileURL(path.join(projectRoot, 'dist', 'cli', 'lib', 'templates.js')).href);
	const template = templatesModule.getDefaultTemplate();
	const minimal = template.manifest.skillProfiles.minimal;
	const expandedProfiles = ['patterns', 'oss', 'team', 'product', 'library'];

	assert.deepEqual(template.manifest.profiles, ['minimal', ...expandedProfiles]);
	assert.equal(template.manifest.defaultProfile, 'minimal');
	assert.ok(minimal.length <= 70, `minimal should stay within 70 skills, got ${minimal.length}`);

	for (const skillName of [
		'api-contract-change',
		'auth-permission-change',
		'payment-integrity-review',
		'credit-ledger-integrity-review',
		'file-upload-security-review',
		'database-migration-change',
		'deletion-lifecycle-review',
		'idempotency-integrity-review',
		'secret-exposure-response',
		'delivery-verification-budget',
	]) {
		assert.ok(minimal.includes(skillName), `minimal should include critical route ${skillName}`);
	}

	for (const skillName of [
		'formal-verification-review',
		'test-suite-performance-review',
		'test-suite-value-pruning-review',
		'vertical-slice-tdd',
		'jurisdictional-product-compliance-review',
		'container-platform-security-review',
		'infrastructure-access-review',
		'multi-tenant-isolation-review',
		'cryptographic-storage-review',
	]) {
		assert.equal(minimal.includes(skillName), false, `minimal should omit specialist ${skillName}`);
	}

	for (const profileName of expandedProfiles) {
		assert.ok(
			template.manifest.skillProfiles[profileName].length > minimal.length,
			`${profileName} should expose a broader skill surface than minimal`,
		);
		for (const skillName of technologySkillNames) {
			assert.ok(template.manifest.skillProfiles[profileName].includes(skillName), `${profileName} should include ${skillName}`);
		}
		for (const skillName of durableExecutionSkillNames) {
			assert.ok(template.manifest.skillProfiles[profileName].includes(skillName), `${profileName} should include ${skillName}`);
		}
	}
});

test('profile-filtered skill documents do not point agents at unavailable skill paths', async () => {
	const templatesModule = await import(pathToFileURL(path.join(projectRoot, 'dist', 'cli', 'lib', 'templates.js')).href);
	const template = templatesModule.getDefaultTemplate();
	const knownSkillNames = new Set(
		template.manifest.creates
			.map(skillNameForTemplateCreate)
			.filter((skillName) => skillName !== null),
	);

	for (const profile of template.manifest.profiles) {
		const selectedSkillNames = new Set(template.manifest.skillProfiles[profile]);
		const selectedFiles = templatesModule.getTemplateFiles(
			template,
			template.manifest.defaultLocale,
			profile,
		);

		for (const file of selectedFiles) {
			if (
				file.relativePath !== '.mustflow/skills/INDEX.md' &&
				!/^\.mustflow\/skills\/[^/]+\/SKILL\.md$/u.test(file.relativePath)
			) {
				continue;
			}

			const content = file.content ?? readFileSync(file.sourcePath, 'utf8');
			const unavailableReferences = Array.from(content.matchAll(/`([a-z][a-z0-9-]+)`/gu), (match) => match[1])
				.filter((skillName) => knownSkillNames.has(skillName) && !selectedSkillNames.has(skillName));

			assert.deepEqual(
				[...new Set(unavailableReferences)],
				[],
				`${profile} ${file.relativePath} should not reference unavailable skills`,
			);
		}
	}

	const productFiles = templatesModule.getTemplateFiles(
		template,
		template.manifest.defaultLocale,
		'product',
	);
	const productIndex = productFiles.find((file) => file.relativePath === '.mustflow/skills/INDEX.md');
	const structuredConfigSkill = productFiles.find(
		(file) => file.relativePath === '.mustflow/skills/structured-config-change/SKILL.md',
	);

	assert.ok(productIndex?.content);
	assert.ok(structuredConfigSkill?.content);
	assert.doesNotMatch(productIndex.content, /`(?:public-json-contract-change|template-install-surface-sync)`/u);
	assert.doesNotMatch(structuredConfigSkill.content, /`public-json-contract-change`/u);
	assert.match(productIndex.content, /the closest installed route for this scope/u);
	assert.match(structuredConfigSkill.content, /the closest installed route for this scope/u);
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
			/translations\.ko = \{ path = "locales\/ko\/AGENTS\.md", source_revision = \d+, status = "(?:current|needs_review)" \}/u,
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
