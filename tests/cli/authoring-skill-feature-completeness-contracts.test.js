import assert from 'node:assert/strict';
import test from 'node:test';

import { assertI18nSkillDocument, assertSkillsIndexRevision, readText } from './helpers/skill-contracts.js';

test('feature surface completeness review keeps repository evidence and install surfaces synchronized', () => {
	const skillName = 'feature-surface-completeness-review';
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
	assert.match(localSkill, /Two or more mature sibling features/u);
	assert.match(localSkill, /feature-addition commits and later repair commits/u);
	assert.match(localSkill, /Build a repository role fingerprint/u);
	assert.match(localSkill, /Trace three graphs separately/u);
	assert.match(localSkill, /Build a pre-edit change ledger/u);
	assert.match(localSkill, /`CREATE`, `MODIFY`, `DELETE`, or `VERIFY`/u);
	assert.match(localSkill, /Check bidirectional traceability/u);
	assert.match(localSkill, /changed public or durable contract identifies current consumers/u);
	assert.match(localSkill, /Audit evidence by behavior, not file presence/u);
	assert.match(localSkill, /Reconcile the actual diff against the pre-edit ledger/u);
	assert.match(localSkill, /old data, old clients/u);
	assert.match(localSkill, /do not create permanent\s+planning files/u);
	assert.match(localSkill, /Govern exceptions/u);
	assert.match(skillIndex, new RegExp(`\\.mustflow/skills/${skillName}/SKILL\\.md`, 'u'));
	assert.match(skillIndex, /remaining completeness risk/u);
	assert.match(
		routes,
		/\[routes\."feature-surface-completeness-review"\]\r?\ncategory = "general_code"\r?\nroute_type = "adjunct"\r?\npriority = 83/u,
	);
	assert.match(routes, /positive_terms = \["feature-completeness", "feature-scaffold", "partial-implementation", "change-manifest", "sibling-feature", "consumer-closure"\]/u);
	assert.doesNotMatch(routes, /positive_terms = \[[^\]]*"feature"/u);
	assert.match(manifest, /"\.mustflow\/skills\/feature-surface-completeness-review\/SKILL\.md"/u);
	for (const profile of ['oss', 'team', 'product', 'library']) {
		const profileMatch = new RegExp(`^${profile} = \\[([\\s\\S]*?)^\\]`, 'mu').exec(manifest);
		assert.ok(profileMatch, `missing ${profile} profile`);
		assert.match(profileMatch[1], /"feature-surface-completeness-review"/u);
	}
	for (const profile of ['minimal', 'patterns']) {
		const profileMatch = new RegExp(`^${profile} = \\[([\\s\\S]*?)^\\]`, 'mu').exec(manifest);
		assert.ok(profileMatch, `missing ${profile} profile`);
		assert.doesNotMatch(profileMatch[1], /"feature-surface-completeness-review"/u);
	}
	assertSkillsIndexRevision(i18n);
	assertI18nSkillDocument(i18n, skillName, 2);
});

test('neighbor skills keep pattern, structure, and next-change ownership distinct', () => {
	const pattern = readText('.mustflow/skills/pattern-scout/SKILL.md');
	const structure = readText('.mustflow/skills/structure-first-engineering/SKILL.md');
	const blastRadius = readText('.mustflow/skills/change-blast-radius-review/SKILL.md');
	const i18n = readText('templates/default/i18n.toml');

	assert.match(pattern, /several mature sibling features/u);
	assert.match(pattern, /feature-surface-completeness-review/u);
	assert.match(structure, /repository-specific feature roles/u);
	assert.match(structure, /feature-surface-completeness-review/u);
	assert.match(blastRadius, /complete against mature siblings/u);
	assert.match(blastRadius, /next-change and deletion-spread judgment/u);
	assertI18nSkillDocument(i18n, 'pattern-scout', 4);
	assertI18nSkillDocument(i18n, 'structure-first-engineering', 2);
	assertI18nSkillDocument(i18n, 'change-blast-radius-review', 3);
});
