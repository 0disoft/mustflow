import assert from 'node:assert/strict';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse } from 'smol-toml';

const projectRoot = path.resolve(fileURLToPath(new URL('../../..', import.meta.url)));

export function assertDocumentRevision(content) {
	const frontmatter = /^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/u.exec(content)?.[1];
	assert.ok(frontmatter, 'document must start with Markdown frontmatter');
	assert.equal([...frontmatter.matchAll(/^revision:/gmu)].length, 1, 'document must declare revision once');
	const matches = [...frontmatter.matchAll(/^revision:[ \t]*([0-9]+)[ \t]*\r?$/gmu)];
	assert.equal(matches.length, 1, 'document must declare exactly one numeric revision');
	const revision = Number(matches[0][1]);
	assert.ok(Number.isSafeInteger(revision) && revision > 0, 'revision must be a positive safe integer');
	return revision;
}

let cachedI18nText;
let cachedI18nDocuments;
function i18nDocuments(content) {
	if (content !== cachedI18nText) {
		const parsed = parse(content);
		assert.ok(parsed.documents, 'missing i18n documents table');
		cachedI18nText = content;
		cachedI18nDocuments = parsed.documents;
	}
	return cachedI18nDocuments;
}

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

export function assertI18nSkillDocument(i18n, skillName) {
	const relative = `.mustflow/skills/${skillName}/SKILL.md`;
	const revision = assertDocumentRevision(readText(relative));
	assert.equal(assertDocumentRevision(readText(`templates/default/locales/en/${relative}`)), revision, `${skillName}: template revision drift`);
	const entry = i18nDocuments(i18n)[`skill.${skillName}`];
	assert.ok(entry, `missing i18n skill document: ${skillName}`);
	assert.equal(entry.source, `locales/en/${relative}`, `${skillName}: i18n source path`);
	assert.equal(entry.source_locale, 'en', `${skillName}: i18n source locale`);
	assert.equal(entry.revision, revision, `${skillName}: i18n revision drift`);
}

export function assertSkillsIndexRevision(i18n) {
	const revision = assertDocumentRevision(readText('.mustflow/skills/INDEX.md'));
	assert.equal(assertDocumentRevision(readText('templates/default/locales/en/.mustflow/skills/INDEX.md')), revision, 'template index revision drift');
	assert.equal(i18nDocuments(i18n)['skills.index']?.revision, revision, 'i18n index revision drift');
}
