import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { test } from 'node:test';
import { buildSkillRouteCatalog, resolveSkillRoutes } from '../../dist/core/skill-route-resolution.js';

test('routing ignores boilerplate and container paths while preserving domain evidence', () => {
	const root = mkdtempSync(path.join(tmpdir(), 'mustflow-route-evidence-'));
	try {
		for (const [name, description] of [
			['charts', 'Apply this skill when chart axis labels and legends are changed.'],
			['uploads', 'Apply this skill when upload filenames and multipart boundaries are changed.'],
		]) {
			const dir = path.join(root, '.mustflow', 'skills', name);
			mkdirSync(dir, { recursive: true });
			writeFileSync(path.join(dir, 'SKILL.md'), '---\nname: ' + name + '\ndescription: ' + description + '\n---\n');
		}
		writeFileSync(path.join(root, '.mustflow', 'skills', 'routes.toml'), [
			'[routes.charts]', 'category = "ui_assets"', 'route_type = "primary"', 'priority = 50', 'selection_axis = "task"', 'applies_to_reasons = ["ui_change"]',
			'[routes.charts.path_hints]', 'extensions = ["chart"]',
			'[routes.uploads]', 'category = "security_privacy"', 'route_type = "primary"', 'priority = 100', 'selection_axis = "risk"', 'applies_to_reasons = ["ui_change"]',
			'[routes.uploads.contexts]', 'positive_terms = ["the upload"]',
		].join('\n'));
		for (const catalog of [false, true]) {
			if (catalog) writeFileSync(path.join(root, '.mustflow', 'skills', 'catalog.v2.json'), JSON.stringify(buildSkillRouteCatalog(root)));
			const resolve = (taskText, paths = []) => resolveSkillRoutes(root, { taskText, paths, reasons: ['ui_change'], maxCandidates: 10 });
			for (const task of ['Apply this skill when', 'this skill when']) {
				assert.deepEqual(resolve(task).candidates, [], task);
			}
			assert.deepEqual(resolve('', ['.mustflow/skills/SKILL.md']).candidates, []);
			const plain = resolve('chart axis labels');
			const padded = resolve('Apply this skill when chart axis labels');
			assert.equal(plain.selected.main.skill, 'charts');
			assert.deepEqual(padded.candidates, plain.candidates);
			assert.equal(resolve('Apply this skill', ['figures/revenue.chart']).selected.main.skill, 'charts');
			assert.ok(resolve('the upload').candidates.some(candidate => candidate.skill === 'uploads' && candidate.score_breakdown.pattern_signal_match > 0));
		}
	} finally {
		rmSync(root, { recursive: true, force: true });
	}
});
