import assert from 'node:assert/strict';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = path.resolve(fileURLToPath(new URL('../../..', import.meta.url)));
const skillsIndexRevision = 224;

export function readText(relativePath) {
	return readFileSync(path.join(projectRoot, ...relativePath.split('/')), 'utf8');
}

export function readSkillDirectoryNames(relativePath) {
	const root = path.join(projectRoot, ...relativePath.split('/'));

	return readdirSync(root, { withFileTypes: true })
		.filter((entry) => entry.isDirectory())
		.map((entry) => entry.name)
		.filter((name) => existsSync(path.join(root, name, 'SKILL.md')))
		.sort((left, right) => left.localeCompare(right));
}

export function routeReasons(routesText, routeName) {
	const routePattern = new RegExp(
		`\\[routes\\."${routeName}"\\]([\\s\\S]*?)(?=\\n\\[routes\\.|$)`,
		'u',
	);
	const routeBody = routesText.match(routePattern)?.[1];
	assert.ok(routeBody, `missing route ${routeName}`);
	const reasonsText = routeBody.match(/applies_to_reasons = \[([^\]]*)\]/u)?.[1];
	assert.ok(reasonsText, `missing applies_to_reasons for ${routeName}`);
	return [...reasonsText.matchAll(/"([^"]+)"/gu)].map((match) => match[1]);
}

export function assertRouteReasonsText(routesText, expectedReasons) {
	const expectedText = `applies_to_reasons = [${expectedReasons
		.map((reason) => `"${reason}"`)
		.join(', ')}]`;

	assert.ok(routesText.includes(expectedText), `missing route reasons: ${expectedText}`);
}

export function assertI18nSkillDocument(i18n, skillName, revision) {
	const expectedText = [
		`[documents."skill.${skillName}"]`,
		`source = "locales/en/.mustflow/skills/${skillName}/SKILL.md"`,
		'source_locale = "en"',
		`revision = ${revision}`,
	].join('\n');

	assert.ok(
		i18n.replace(/\r\n/gu, '\n').includes(expectedText),
		`missing i18n skill document: ${skillName}`,
	);
}

export function assertSkillsIndexRevision(i18n) {
	assert.match(
		i18n,
		new RegExp(`\\[documents\\."skills\\.index"\\][\\s\\S]*?revision = ${skillsIndexRevision}`, 'u'),
	);
}
