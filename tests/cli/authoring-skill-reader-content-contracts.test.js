import assert from 'node:assert/strict';
import test from 'node:test';

import { assertI18nSkillDocument, assertSkillsIndexRevision, readText } from './helpers/skill-contracts.js';

test('reader-centered technical content keeps benefits evidence-bound and template-synced', () => {
	const skillName = 'reader-centered-technical-content';
	const localSkill = readText(`.mustflow/skills/${skillName}/SKILL.md`);
	const templateSkill = readText(`templates/default/locales/en/.mustflow/skills/${skillName}/SKILL.md`);
	const skillIndex = readText('.mustflow/skills/INDEX.md');
	const templateSkillIndex = readText('templates/default/locales/en/.mustflow/skills/INDEX.md');
	const routes = readText('.mustflow/skills/routes.toml');
	const templateRoutes = readText('templates/default/locales/en/.mustflow/skills/routes.toml');
	const manifest = readText('templates/default/manifest.toml');
	const i18n = readText('templates/default/i18n.toml');

	assert.equal(localSkill, templateSkill);
	assert.equal(skillIndex, templateSkillIndex);
	assert.equal(routes, templateRoutes);
	assert.match(localSkill, /reader's decision/u);
	assert.match(localSkill, /current workaround or failed attempt/u);
	assert.match(localSkill, /plausible inferences, and unknowns/u);
	assert.match(localSkill, /capability -> removed or reduced action -> changed workflow/u);
	assert.match(localSkill, /Subtract setup, learning, migration, waiting, review, error, and/u);
	assert.match(localSkill, /maker chronology into reader decision order/u);
	assert.match(localSkill, /failure conditions and smallest useful reproduction/u);
	assert.match(localSkill, /the observation that rejected it/u);
	assert.match(localSkill, /before and after measurements under the same conditions/u);
	assert.match(localSkill, /prevention through tests, validation, observability, or workflow changes/u);
	assert.match(localSkill, /boundary between the author's contribution and tools or prior\s+work/u);
	assert.match(localSkill, /Do not invent ROI, time saved, accuracy/u);
	assert.match(localSkill, /If the root cause was not established/u);
	assert.match(localSkill, /If before and after conditions differ/u);
	assert.match(localSkill, /search-ad-content-authoring/u);
	assert.match(localSkill, /readme-authoring/u);
	assert.match(localSkill, /writing-elegance/u);
	assert.match(skillIndex, new RegExp(`\\.mustflow/skills/${skillName}/SKILL\\.md`, 'u'));
	assert.match(skillIndex, /remaining reader-value risk/u);
	assert.match(
		routes,
		/\[routes\."reader-centered-technical-content"\]\r?\ncategory = "docs_release"\r?\nroute_type = "primary"\r?\npriority = 61/u,
	);
	assert.match(manifest, /"\.mustflow\/skills\/reader-centered-technical-content\/SKILL\.md"/u);
	for (const profile of ['oss', 'team', 'product']) {
		const profileMatch = new RegExp(`^${profile} = \\[([\\s\\S]*?)^\\]`, 'mu').exec(manifest);
		assert.ok(profileMatch, `missing ${profile} profile`);
		assert.match(profileMatch[1], /"reader-centered-technical-content"/u);
	}
	for (const profile of ['minimal', 'patterns', 'library']) {
		const profileMatch = new RegExp(`^${profile} = \\[([\\s\\S]*?)^\\]`, 'mu').exec(manifest);
		assert.ok(profileMatch, `missing ${profile} profile`);
		assert.doesNotMatch(profileMatch[1], /"reader-centered-technical-content"/u);
	}
	assertSkillsIndexRevision(i18n);
	assertI18nSkillDocument(i18n, skillName, 1);
});

test('nearby authoring skills route substantive reader-value work to the owning skill', () => {
	const writing = readText('.mustflow/skills/writing-elegance/SKILL.md');
	const search = readText('.mustflow/skills/search-ad-content-authoring/SKILL.md');
	const readme = readText('.mustflow/skills/readme-authoring/SKILL.md');
	const i18n = readText('templates/default/i18n.toml');

	for (const skill of [writing, search, readme]) {
		assert.match(skill, /reader-centered-technical-content/u);
	}
	assert.match(writing, /after the factual structure is settled/u);
	assert.match(search, /with no search-traffic or ad-layout goal/u);
	assert.match(readme, /outside the repository README/u);
	assertI18nSkillDocument(i18n, 'writing-elegance', 10);
	assertI18nSkillDocument(i18n, 'search-ad-content-authoring', 4);
	assertI18nSkillDocument(i18n, 'readme-authoring', 4);
});
