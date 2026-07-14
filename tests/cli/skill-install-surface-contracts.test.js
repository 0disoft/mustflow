import assert from 'node:assert/strict';
import test from 'node:test';

import {
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

function skillRevision(skillText, skillName) {
	const revision = /^revision: (\d+)$/mu.exec(skillText)?.[1];
	assert.ok(revision, `${skillName} should declare a numeric revision`);
	return Number(revision);
}

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
		assertI18nSkillDocument(i18n, skillName, skillRevision(sourceSkill, skillName));
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
