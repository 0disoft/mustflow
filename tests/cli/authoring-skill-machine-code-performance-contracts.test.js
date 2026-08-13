import assert from 'node:assert/strict';
import test from 'node:test';

import {
	assertI18nSkillDocument,
	assertRouteReasonsText,
	assertSkillsIndexRevision,
	readText,
} from './helpers/skill-contracts.js';

const skillName = 'machine-code-performance-review';
const skillPath = `.mustflow/skills/${skillName}/SKILL.md`;
const templateSkillPath = `templates/default/locales/en/${skillPath}`;

test('machine code performance skill joins compiler proof with measured native outcomes', () => {
	const skill = readText(skillPath);
	const templateSkill = readText(templateSkillPath);
	const index = readText('.mustflow/skills/INDEX.md');
	const templateIndex = readText('templates/default/locales/en/.mustflow/skills/INDEX.md');
	const routes = readText('.mustflow/skills/routes.toml');
	const templateRoutes = readText('templates/default/locales/en/.mustflow/skills/routes.toml');
	const manifest = readText('templates/default/manifest.toml');
	const i18n = readText('templates/default/i18n.toml');
	const fixtures = readText('.mustflow/skills/route-fixtures.json');

	assert.equal(templateSkill, skill);
	assert.equal(templateIndex, index);
	assert.equal(templateRoutes, routes);
	assert.match(skill, /frontend supply, bad speculation, backend execution or dependency/u);
	assert.match(skill, /Instruction count, IPC, cache hit rate, or one counter alone/u);
	assert.match(skill, /Review data movement before arithmetic cleverness/u);
	assert.match(skill, /complete vector path/u);
	assert.match(skill, /Give the compiler facts it can legally use/u);
	assert.match(skill, /false optimization promise creates undefined behavior or wrong code/u);
	assert.match(skill, /Train and validate PGO on versioned representative distributions/u);
	assert.match(index, new RegExp(`\\.mustflow/skills/${skillName}/SKILL\\.md`, 'u'));
	assert.match(routes, new RegExp(`\\[routes\\."${skillName}"\\]\\r?\\ncategory = "general_code"\\r?\\nroute_type = "primary"\\r?\\npriority = 85`, 'u'));
	assertRouteReasonsText(routes, ['performance_change', 'code_change', 'behavior_change', 'test_change', 'package_metadata_change']);
	assert.match(fixtures, /"id": "native-machine-code-performance-korean"/u);
	assert.match(fixtures, /"required_main": "machine-code-performance-review"/u);
	assert.match(skill, /managed, interpreted, browser-rendered, database, network, or GPU bound/u);
	assert.match(manifest, new RegExp(`"${skillPath}"`, 'u'));
	assertI18nSkillDocument(i18n, skillName, 1);
	assertSkillsIndexRevision(i18n);
});
