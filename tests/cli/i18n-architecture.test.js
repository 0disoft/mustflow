import assert from 'node:assert/strict';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { test } from 'node:test';
import { fileURLToPath, pathToFileURL } from 'node:url';

const projectRoot = path.resolve(fileURLToPath(new URL('../..', import.meta.url)));
const cliSourceRoot = path.join(projectRoot, 'src', 'cli');
const i18nModuleUrl = pathToFileURL(path.join(projectRoot, 'dist', 'cli', 'lib', 'i18n.js')).href;

function collectTypeScriptFiles(directory) {
	const files = [];

	for (const entry of readdirSync(directory)) {
		const fullPath = path.join(directory, entry);
		const stat = statSync(fullPath);

		if (stat.isDirectory()) {
			files.push(...collectTypeScriptFiles(fullPath));
			continue;
		}

		if (entry.endsWith('.ts')) {
			files.push(fullPath);
		}
	}

	return files;
}

test('CLI message catalogs keep every locale aligned with the source catalog', async () => {
	const { getMessageCatalogReport } = await import(i18nModuleUrl);
	const report = getMessageCatalogReport();

	assert.deepEqual(report.missing, {});
	assert.deepEqual(report.extra, {});
});

test('CLI localized catalogs are not English fallbacks', async () => {
	const { MESSAGE_CATALOGS, SUPPORTED_CLI_LANGS } = await import(i18nModuleUrl);
	const localizedLocales = ['zh', 'es', 'fr', 'hi'];
	const expectedOptionsHeading = {
		zh: '选项',
		es: 'Opciones',
		fr: 'Options',
		hi: 'विकल्प',
	};

	for (const locale of localizedLocales) {
		assert.ok(SUPPORTED_CLI_LANGS.includes(locale), `${locale} should be a supported CLI language`);
		assert.notStrictEqual(MESSAGE_CATALOGS[locale], MESSAGE_CATALOGS.en);
		assert.equal(MESSAGE_CATALOGS[locale]['cli.heading.options'], expectedOptionsHeading[locale]);
		assert.notEqual(MESSAGE_CATALOGS[locale]['command.init.summary'], MESSAGE_CATALOGS.en['command.init.summary']);
	}
});

test('CLI source does not branch on concrete language codes outside i18n catalogs', () => {
	const i18nCatalogRoot = path.join(cliSourceRoot, 'i18n');
	const i18nLibFile = path.join(cliSourceRoot, 'lib', 'i18n.ts');
	const offenders = [];

	for (const filePath of collectTypeScriptFiles(cliSourceRoot)) {
		if (filePath === i18nLibFile || filePath.startsWith(`${i18nCatalogRoot}${path.sep}`)) {
			continue;
		}

		const source = readFileSync(filePath, 'utf8');

		if (/lang\s*={2,3}\s*['"]ko['"]/.test(source)) {
			offenders.push(path.relative(projectRoot, filePath).replace(/\\/g, '/'));
		}
	}

	assert.deepEqual(offenders, []);
});
