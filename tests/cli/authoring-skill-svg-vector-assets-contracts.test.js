import assert from 'node:assert/strict';
import test from 'node:test';

import {
	assertI18nSkillDocument,
	assertRouteReasonsText,
	assertSkillsIndexRevision,
	readText,
} from './helpers/skill-contracts.js';

const skillName = 'svg-vector-asset-production';
const skillPath = `.mustflow/skills/${skillName}/SKILL.md`;
const templateSkillPath = `templates/default/locales/en/${skillPath}`;

test('SVG vector asset skill owns constrained generation, safety, and render validation', () => {
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
	assert.match(skill, /visual design,[\s\S]*constrained SVG reconstruction,[\s\S]*structural and safety[\s\S]*validation/u);
	assert.match(skill, /Regex removal and SVGO are not[\s\S]*sanitization boundaries/u);
	assert.match(skill, /real vector geometry/u);
	assert.match(skill, /render-error budget, not only[\s\S]*source bytes/u);
	assert.match(skill, /standalone, inline, sprite, and brand-sensitive assets/u);
	assert.match(skill, /contact sheet with representative approved assets/u);
	assert.match(skill, /deterministic repeated output/u);
	assert.match(index, new RegExp(`\\.mustflow/skills/${skillName}/SKILL\\.md`, 'u'));
	assert.match(
		routes,
		new RegExp(`\\[routes\\."${skillName}"\\]\\r?\\ncategory = "ui_assets"\\r?\\nroute_type = "primary"\\r?\\npriority = 84`, 'u'),
	);
	assertRouteReasonsText(routes, [
		'image_asset_change',
		'web_asset_change',
		'ui_change',
		'code_change',
		'test_change',
	]);
	assert.match(fixtures, /"id": "editable-svg-vector-pipeline-korean"/u);
	assert.match(fixtures, /"required_main": "svg-vector-asset-production"/u);
	assert.match(fixtures, /"id": "web-raster-image-optimization-only"/u);
	assert.match(manifest, new RegExp(`"${skillPath}"`, 'u'));
	assert.match(manifest, /product = \[[\s\S]*?"svg-vector-asset-production"[\s\S]*?^\]/mu);
	assertI18nSkillDocument(i18n, skillName, 1);
	assertSkillsIndexRevision(i18n);
});

test('SVG routing distinguishes vector production from raster web optimization', () => {
	const routes = readText('.mustflow/skills/routes.toml');
	const rasterSkill = readText('.mustflow/skills/web-asset-optimization/SKILL.md');

	assert.match(routes, /\[routes\."web-asset-optimization"\.contexts\][\s\S]*?negative_terms = \["svg-only", "vector-only", "vector-source"\]/u);
	assert.match(routes, /\[routes\."svg-vector-asset-production"\.contexts\][\s\S]*?"편집 가능한 SVG"/u);
	assert.match(rasterSkill, /The asset is a vector source such as SVG/u);
});
