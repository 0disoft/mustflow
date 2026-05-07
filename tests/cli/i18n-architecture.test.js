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

test('CLI source does not branch on concrete language codes outside i18n catalogs', () => {
	const allowedFiles = new Set([
		path.join(cliSourceRoot, 'lib', 'i18n.ts'),
		path.join(cliSourceRoot, 'i18n', 'en.ts'),
		path.join(cliSourceRoot, 'i18n', 'ko.ts'),
	]);
	const offenders = [];

	for (const filePath of collectTypeScriptFiles(cliSourceRoot)) {
		if (allowedFiles.has(filePath)) {
			continue;
		}

		const source = readFileSync(filePath, 'utf8');

		if (/lang\s*={2,3}\s*['"]ko['"]/.test(source)) {
			offenders.push(path.relative(projectRoot, filePath).replace(/\\/g, '/'));
		}
	}

	assert.deepEqual(offenders, []);
});
