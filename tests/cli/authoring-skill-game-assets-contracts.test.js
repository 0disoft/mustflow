import assert from 'node:assert/strict';
import test from 'node:test';

import {
	assertI18nSkillDocument,
	assertRouteReasonsText,
	assertSkillsIndexRevision,
	readText,
} from './helpers/skill-contracts.js';

const skillName = 'ai-game-asset-production';
const skillPath = '.mustflow/skills/ai-game-asset-production/SKILL.md';
const templateSkillPath = 'templates/default/locales/en/.mustflow/skills/ai-game-asset-production/SKILL.md';
const referenceNames = [
	'asset-contract-validation.md',
	'raster-alpha-atlas-checklist.md',
	'tile-animation-checklist.md',
];

test('AI game asset production skill owns a contract-driven engine asset pipeline', () => {
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
	assert.match(skill, /Prompt text may derive from this contract but never replaces it/u);
	assert.match(skill, /straight or premultiplied alpha/u);
	assert.match(skill, /foot sliding/u);
	assert.match(skill, /full\s+untrimmed-frame metadata/u);
	assert.match(skill, /source-PNG inspection alone cannot prove engine behavior/u);
	assert.match(skill, /provider permission,[\s\S]*copyrightability,[\s\S]*third-party infringement risk,[\s\S]*exclusivity/u);
	assert.match(skill, /repository's command authority/u);
	assert.match(index, new RegExp(`\\.mustflow/skills/${skillName}/SKILL\\.md`, 'u'));
	assert.match(
		routes,
		new RegExp(`\\[routes\\."${skillName}"\\]\\r?\\ncategory = "ui_assets"\\r?\\nroute_type = "primary"\\r?\\npriority = 86`, 'u'),
	);
	assertRouteReasonsText(routes, [
		'ui_change',
		'web_asset_change',
		'behavior_change',
		'code_change',
		'test_change',
		'docs_change',
		'product_change',
		'release_risk',
	]);
	assert.match(fixtures, /"id": "ai-game-transparent-sprite-atlas-production"/u);
	assert.match(fixtures, /"required_main": "ai-game-asset-production"/u);
	assert.match(manifest, new RegExp(`"${skillPath}"`, 'u'));
	assert.match(manifest, /product = \[[\s\S]*?"ai-game-asset-production"[\s\S]*?^\]/mu);
	assertI18nSkillDocument(i18n, skillName, 1);
	assertSkillsIndexRevision(i18n);

	for (const referenceName of referenceNames) {
		const referencePath = `.mustflow/skills/${skillName}/references/${referenceName}`;
		const reference = readText(referencePath);
		const templateReference = readText(`templates/default/locales/en/${referencePath}`);

		assert.equal(templateReference, reference, `${referenceName} source and template copies should match`);
		assert.match(manifest, new RegExp(`"${referencePath}"`, 'u'));
	}
});

test('AI game asset references preserve alpha, seam, animation, and threshold boundaries', () => {
	const validation = readText(`.mustflow/skills/${skillName}/references/asset-contract-validation.md`);
	const raster = readText(`.mustflow/skills/${skillName}/references/raster-alpha-atlas-checklist.md`);
	const animation = readText(`.mustflow/skills/${skillName}/references/tile-animation-checklist.md`);

	assert.match(validation, /Values below are fields to decide, not Mustflow defaults/u);
	assert.match(validation, /calibration candidates only/u);
	assert.match(validation, /alpha zero at isolated[\s\S]*corners/u);
	assert.match(raster, /A PNG extension or visible checkerboard is[\s\S]*not proof of an alpha channel/iu);
	assert.match(raster, /premultiply RGB by alpha/u);
	assert.match(raster, /original source width and height/u);
	assert.match(raster, /PixiJS/u);
	assert.match(raster, /Unity/u);
	assert.match(raster, /Godot/u);
	assert.match(animation, /terrain topology and masks before surface generation/u);
	assert.match(animation, /support-foot drift separately from intentional body translation/u);
	assert.match(animation, /last-to-first pose, velocity, and acceleration discontinuity/u);
});
