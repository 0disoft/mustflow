import assert from 'node:assert/strict';
import test from 'node:test';

import { assertI18nSkillDocument, assertSkillsIndexRevision, readText } from './helpers/skill-contracts.js';

test('actionable feedback keeps judgment, evidence, correction, and completion contracts template-synced', () => {
	const skillName = 'evidence-backed-actionable-feedback';
	const localSkill = readText(`.mustflow/skills/${skillName}/SKILL.md`);
	const templateSkill = readText(`templates/default/locales/en/.mustflow/skills/${skillName}/SKILL.md`);
	const skillIndex = readText('.mustflow/skills/INDEX.md');
	const templateSkillIndex = readText('templates/default/locales/en/.mustflow/skills/INDEX.md');
	const routes = readText('.mustflow/skills/routes.toml');
	const templateRoutes = readText('templates/default/locales/en/.mustflow/skills/routes.toml');
	const routeFixtures = JSON.parse(readText('.mustflow/skills/route-fixtures.json'));
	const manifest = readText('templates/default/manifest.toml');
	const i18n = readText('templates/default/i18n.toml');

	assert.equal(localSkill, templateSkill);
	assert.equal(skillIndex, templateSkillIndex);
	assert.equal(routes, templateRoutes);
	assert.match(localSkill, /Turn vague or diplomatic-sounding feedback into a decision-ready review/u);
	assert.match(localSkill, /Separate intent from result/u);
	assert.match(localSkill, /Keep one finding to one decision/u);
	assert.match(localSkill, /two competent, diligent readers/u);
	assert.match(localSkill, /first divergent decision/u);
	assert.match(localSkill, /role-specific default -> divergent artifact or behavior -> first detection point/u);
	assert.match(localSkill, /discarded, migrated, restored, or repeated/u);
	assert.match(localSkill, /Distinguish rewrite from redesign/u);
	assert.match(localSkill, /A later author explanation confirms intent but does not repair text/u);
	assert.match(localSkill, /Use `BLOCKER` only when/u);
	assert.match(localSkill, /Use `MAJOR` when/u);
	assert.match(localSkill, /Use `MINOR` when/u);
	assert.match(localSkill, /Do not inflate wording friction into architecture failure/u);
	assert.match(localSkill, /do not let `draft` excuse a missing ownership or feasibility premise/u);
	assert.match(localSkill, /severity, confidence, correction cost, and priority\s+independently/u);
	assert.match(localSkill, /minimum sufficient correction/u);
	assert.match(localSkill, /Preserve uncertainty where\s+evidence is incomplete/u);
	assert.match(localSkill, /falsification check/u);
	assert.match(localSkill, /code-review/u);
	assert.match(localSkill, /docs-prose-review/u);
	assert.match(localSkill, /writing-elegance/u);
	assert.match(localSkill, /task-instruction-authoring/u);
	assert.match(skillIndex, new RegExp(`\\.mustflow/skills/${skillName}/SKILL\\.md`, 'u'));
	assert.match(
		routes,
		/\[routes\."evidence-backed-actionable-feedback"\]\r?\ncategory = "docs_release"\r?\nroute_type = "primary"\r?\npriority = 72/u,
	);
	assert.match(manifest, /"\.mustflow\/skills\/evidence-backed-actionable-feedback\/SKILL\.md"/u);
	for (const profile of ['minimal', 'patterns', 'oss', 'team', 'product', 'library']) {
		const profileMatch = new RegExp(`^${profile} = \\[([\\s\\S]*?)^\\]`, 'mu').exec(manifest);
		assert.ok(profileMatch, `missing ${profile} profile`);
		assert.match(profileMatch[1], /"evidence-backed-actionable-feedback"/u);
	}
	const fixtureIds = new Set(routeFixtures.cases.map((entry) => entry.id));
	assert.ok(fixtureIds.has('evidence-backed-actionable-feedback-korean'));
	assert.ok(fixtureIds.has('consequence-driven-document-review-korean'));
	assert.ok(fixtureIds.has('document-summary-only-boundary'));
	assert.ok(fixtureIds.has('actionable-feedback-code-discovery-only'));
	assert.ok(fixtureIds.has('actionable-feedback-prose-cleanup-only'));
	assertSkillsIndexRevision(i18n);
	assertI18nSkillDocument(i18n, skillName, 2);
});
