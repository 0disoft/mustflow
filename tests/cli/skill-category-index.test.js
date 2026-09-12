import assert from 'node:assert/strict';
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { test } from 'node:test';
import { renderSkillCategoryIndex } from '../../dist/core/skill-category-index.js';
import { createTempProject, removeTempProject, runCli } from './helpers/cli-harness.js';

test('category index derives installed inventory and filters its generated procedure list', () => {
	const root = createTempProject();
	try {
		for (const name of ['layout-review', 'backend-review']) {
			const directory = path.join(root, '.mustflow', 'skills', name);
			mkdirSync(directory, { recursive: true });
			writeFileSync(path.join(directory, 'SKILL.md'), '---\nname: ' + name + '\ndescription: Review ' + name + ' | boundaries\n---\n');
		}
		writeFileSync(path.join(root, '.mustflow', 'skills', 'routes.toml'), '[routes."layout-review"]\ncategory = "ui_assets"\n[routes."backend-review"]\ncategory = "general_code"\n');
		const summary = renderSkillCategoryIndex(root);
		assert.match(summary, /2 built-in skills/u);
		assert.match(summary, /\| ui_assets \| 1 \|/u);
		const result = runCli(root, ['skill', 'index', '--category', 'ui_assets']);
		assert.equal(result.status, 0, result.stderr);
		assert.match(result.stdout, /layout-review\/SKILL.md/u);
		assert.match(result.stdout, /\\\| boundaries/u);
		assert.doesNotMatch(result.stdout, /backend-review/u);
		assert.equal(runCli(root, ['skill', 'index', '--category', 'missing']).status, 1);
		assert.equal(runCli(root, ['skill', 'index', '--json']).status, 1);
		assert.equal(runCli(root, ['skill', 'index', '--category']).status, 1);
	} finally { removeTempProject(root); }
});

test('empty category inventory does not invent installed skills', () => {
	const root = createTempProject();
	try { assert.match(renderSkillCategoryIndex(root), /0 built-in skills/u); }
	finally { removeTempProject(root); }
});
