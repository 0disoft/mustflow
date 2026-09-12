import assert from 'node:assert/strict';
import test from 'node:test';

import {
	assertDocumentRevision,
	assertI18nSkillDocument,
	assertSkillsIndexRevision,
	readSkillDirectoryNames,
	readText,
} from './helpers/skill-contracts.js';

function readTomlStringArrayBlock(content, key) {
	const match = new RegExp(`^${key} = \\[([\\s\\S]*?)^\\]`, 'mu').exec(content);
	assert.ok(match, `missing TOML array block: ${key}`);
	return Array.from(match[1].matchAll(/"([^"]+)"/gu), (entry) => entry[1]);
}

test('revision checks reject missing, duplicate, fractional, unsafe, and body-only declarations', () => {
	assert.equal(assertDocumentRevision('---\r\nrevision: 12\r\n---\r\n'), 12);
	for (const value of ['0', '-1', '1.5', '9007199254740992', 'one']) {
		assert.throws(() => assertDocumentRevision('---\nrevision: ' + value + '\n---\n'));
	}
	assert.throws(() => assertDocumentRevision('---\nname: example\n---\nrevision: 1\n'));
	assert.throws(() => assertDocumentRevision('---\nrevision: 1\nrevision: 2\n---\n'));
	assert.throws(() => assertDocumentRevision('---\nrevision: 1\nrevision: invalid\n---\n'));
});

test('i18n revision checks require exact numbers in the matching document table', () => {
	const name = 'interface-copy-review';
	const revision = assertDocumentRevision(readText('.mustflow/skills/' + name + '/SKILL.md'));
	const header = '[documents."skill.' + name + '"]\nsource = "locales/en/.mustflow/skills/' + name + '/SKILL.md"\nsource_locale = "en"\n';
	assertI18nSkillDocument(header + 'revision = ' + revision + '\n', name);
	assert.throws(() => assertI18nSkillDocument(header + 'revision = ' + revision + '0\n', name), /i18n revision drift/u);
	assert.throws(() => assertI18nSkillDocument(header + '[documents.other]\nrevision = ' + revision + '\n', name), /i18n revision drift/u);
	assert.throws(() => assertI18nSkillDocument(header.replace('source_locale = "en"', 'source_locale = "ko"') + 'revision = ' + revision + '\n', name), /source locale/u);
	const indexRevision = assertDocumentRevision(readText('.mustflow/skills/INDEX.md'));
	assert.throws(() => assertSkillsIndexRevision('[documents."skills.index"]\nrevision = ' + indexRevision + '0\n'), /i18n index revision drift/u);
});

test('design skill profiles keep specialist exploration out of the minimal install', () => {
	const manifest = readText('templates/default/manifest.toml');
	const designSkills = [
		'interface-typography-review',
		'interface-color-system-review',
		'interface-copy-review',
		'interface-reference-analysis',
		'interface-variant-exploration',
	];
	for (const profile of ['minimal', 'patterns', 'oss', 'team', 'product', 'library']) {
		const installed = new Set(readTomlStringArrayBlock(manifest, profile));
		for (const skill of designSkills) {
			const expected = profile === 'team' || profile === 'product'
				|| (profile === 'library' && !['interface-reference-analysis', 'interface-variant-exploration'].includes(skill));
			assert.equal(installed.has(skill), expected, `${profile}: ${skill}`);
		}
	}
});

test('installed skill sources, routes, index, i18n, manifest, and profiles stay synchronized', () => {
	const sourceSkillNames = readSkillDirectoryNames('.mustflow/skills');
	const templateSkillNames = readSkillDirectoryNames('templates/default/locales/en/.mustflow/skills');
	const skillIndex = readText('.mustflow/skills/INDEX.md');
	const templateSkillIndex = readText('templates/default/locales/en/.mustflow/skills/INDEX.md');
	const routes = readText('.mustflow/skills/routes.toml');
	const templateRoutes = readText('templates/default/locales/en/.mustflow/skills/routes.toml');
	const i18n = readText('templates/default/i18n.toml');
	const manifest = readText('templates/default/manifest.toml');
	const creates = new Set(readTomlStringArrayBlock(manifest, 'creates'));
	const profiles = ['minimal', 'patterns', 'oss', 'team', 'product', 'library'].map((profile) => ({
		profile,
		skills: new Set(readTomlStringArrayBlock(manifest, profile)),
	}));

	assert.deepEqual(templateSkillNames, sourceSkillNames);
	assert.equal(templateSkillIndex, skillIndex);
	assert.equal(templateRoutes, routes);
	assertSkillsIndexRevision(i18n);

	for (const skillName of sourceSkillNames) {
		const relativePath = `.mustflow/skills/${skillName}/SKILL.md`;
		const sourceSkill = readText(relativePath);
		const templateSkill = readText(`templates/default/locales/en/${relativePath}`);

		assert.equal(templateSkill, sourceSkill, `${skillName} source and template skill should match`);
		assert.match(routes, new RegExp(`^\\[routes\\."${skillName}"\\]$`, 'mu'), `${skillName} should have a route`);
		assert.ok(skillIndex.includes(`\`${relativePath}\``), `${skillName} should have an index row`);
		assertI18nSkillDocument(i18n, skillName);
		assert.ok(creates.has(relativePath), `${skillName} should be installed by the template`);
		assert.ok(
			profiles.some(({ skills }) => skills.has(skillName)),
			`${skillName} should belong to at least one template profile`,
		);
	}

	for (const { profile, skills } of profiles) {
		for (const skillName of skills) {
			assert.ok(sourceSkillNames.includes(skillName), `${profile} references missing skill ${skillName}`);
		}
	}
});
