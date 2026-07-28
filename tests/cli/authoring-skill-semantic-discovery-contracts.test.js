import assert from 'node:assert/strict';
import test from 'node:test';

import { assertI18nSkillDocument, assertSkillsIndexRevision, readText } from './helpers/skill-contracts.js';

test('semantic repository discovery keeps multi-axis evidence and install surfaces synchronized', () => {
	const skillName = 'semantic-repository-discovery';
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
	assert.match(localSkill, /Build a vocabulary ledger/u);
	assert.match(localSkill, /Trace inward from independent boundary fingerprints/u);
	assert.match(localSkill, /Search tests and examples before trusting definitions/u);
	assert.match(localSkill, /Use a three-stage search funnel/u);
	assert.match(localSkill, /`rg` finds text; it does not prove semantic absence/u);
	assert.match(localSkill, /Inspect official exposure and activation separately from existence/u);
	assert.match(localSkill, /Cluster consumers, not only definitions/u);
	assert.match(localSkill, /Use history as a synonym and rejection database/u);
	assert.match(localSkill, /searched_no_match/u);
	assert.match(localSkill, /Embeddings may generate candidates, but rerank/u);
	assert.match(localSkill, /Compare reuse compatibility explicitly/u);
	assert.match(localSkill, /`reuse`:[\s\S]*`adapt`:[\s\S]*`extract`:[\s\S]*`replace`:[\s\S]*`independent`:[\s\S]*`reject`:/u);
	assert.match(localSkill, /Every planned file or symbol must point to an existing candidate disposition/u);
	assert.match(localSkill, /Reconcile the final diff/u);
	assert.match(localSkill, /Checkbox-only compliance and mandatory arbitrary candidate counts are invalid gates/u);
	assert.match(localSkill, /Do not scan secrets, unrelated ignored trees/u);
	assert.match(skillIndex, new RegExp(`\\.mustflow/skills/${skillName}/SKILL\\.md`, 'u'));
	assert.match(skillIndex, /remaining discovery or unsafe-reuse risk/u);
	assert.match(
		routes,
		/\[routes\."semantic-repository-discovery"\]\r?\ncategory = "general_code"\r?\nroute_type = "adjunct"\r?\npriority = 84/u,
	);
	assert.match(routes, /positive_terms = \["semantic-repository-discovery", "existing-asset-discovery", "reuse-candidate", "code-archaeology", "duplicate-prevention", "new-symbol-justification"\]/u);
	assert.doesNotMatch(routes, /positive_terms = \[[^\]]*"semantic"/u);
	assert.doesNotMatch(routes, /positive_terms = \[[^\]]*"reuse"/u);
	assert.match(manifest, /"\.mustflow\/skills\/semantic-repository-discovery\/SKILL\.md"/u);
	for (const profile of ['oss', 'team', 'product', 'library']) {
		const profileMatch = new RegExp(`^${profile} = \\[([\\s\\S]*?)^\\]`, 'mu').exec(manifest);
		assert.ok(profileMatch, `missing ${profile} profile`);
		assert.match(profileMatch[1], /"semantic-repository-discovery"/u);
	}
	for (const profile of ['minimal', 'patterns']) {
		const profileMatch = new RegExp(`^${profile} = \\[([\\s\\S]*?)^\\]`, 'mu').exec(manifest);
		assert.ok(profileMatch, `missing ${profile} profile`);
		assert.doesNotMatch(profileMatch[1], /"semantic-repository-discovery"/u);
	}
	assertSkillsIndexRevision(i18n);
	assertI18nSkillDocument(i18n, skillName, 1);
});

test('neighbor skills keep local pattern, feature completeness, and post-change hardening ownership distinct', () => {
	const pattern = readText('.mustflow/skills/pattern-scout/SKILL.md');
	const completeness = readText('.mustflow/skills/feature-surface-completeness-review/SKILL.md');
	const hardening = readText('.mustflow/skills/ai-generated-code-hardening/SKILL.md');
	const i18n = readText('templates/default/i18n.toml');

	assert.match(pattern, /hidden under different names, paths, layers, exports/u);
	assert.match(pattern, /semantic-repository-discovery/u);
	assert.match(completeness, /discover equivalent or reusable repository assets/u);
	assert.match(completeness, /semantic-repository-discovery/u);
	assert.match(hardening, /pre-implementation discovery of existing assets/u);
	assert.match(hardening, /post-change duplicate and hardening review/u);
	assertI18nSkillDocument(i18n, 'pattern-scout', 4);
	assertI18nSkillDocument(i18n, 'feature-surface-completeness-review', 2);
	assertI18nSkillDocument(i18n, 'ai-generated-code-hardening', 4);
});
