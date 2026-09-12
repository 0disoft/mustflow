import assert from 'node:assert/strict';
import { mkdirSync, writeFileSync, rmSync } from 'node:fs';
import path from 'node:path';
import { test } from 'node:test';
import { createTempProject, removeTempProject } from './helpers/cli-harness.js';
import { buildSkillRouteCatalog, resolveSkillRoutes } from '../../dist/core/skill-route-resolution.js';
import { isSkillRoutePathHints, matchesSkillRoutePathHints } from '../../dist/core/skill-route-path-hints.js';

test('path hint rules validate bounded data and match extensions, exact names, and documentation', () => {
	assert.equal(isSkillRoutePathHints({ extensions: ['abc'], basenames: ['project.toml'], documentation: false }), true);
	for (const invalid of [{ extensions: ['.ts'] }, { extensions: ['ts', 'ts'] }, { basenames: ['../file'] }, { basenames: ['file/name'] }, { documentation: 'yes' }, { regex: '.*' }]) {
		assert.equal(isSkillRoutePathHints(invalid), false);
	}
	assert.equal(matchesSkillRoutePathHints({ extensions: ['abc'] }, ['src\\Widget.ABC']), true);
	assert.equal(matchesSkillRoutePathHints({ basenames: ['project.toml'] }, ['nested/PROJECT.TOML']), true);
	assert.equal(matchesSkillRoutePathHints({ basenames: ['tsconfig.json'] }, ['not-tsconfig.json']), false);
	assert.equal(matchesSkillRoutePathHints({ documentation: true }, ['nested/docs/guide.mdx']), true);
	assert.equal(matchesSkillRoutePathHints({ documentation: true }, ['README.md']), true);
	assert.equal(matchesSkillRoutePathHints({ documentation: true }, ['src/view.ts']), false);
});

test('custom path hints work without skill-specific code and explicit empty rules override legacy hints', () => {
	const root = createTempProject();
	try {
		for (const name of ['custom-language', 'typescript-code-change']) {
			const directory = path.join(root, '.mustflow', 'skills', name);
			mkdirSync(directory, { recursive: true });
			writeFileSync(path.join(directory, 'SKILL.md'), '---\nname: ' + name + '\ndescription: Language procedure\n---\n');
		}
		const source = [
			'[routes."custom-language"]', 'category = "general_code"', 'route_type = "primary"', 'priority = 85', 'selection_axis = "language"',
			'[routes."custom-language".path_hints]', 'extensions = ["abc"]', 'basenames = ["project.toml"]',
			'[routes."custom-language".contexts]', 'exclusion_terms = ["skip custom language"]',
			'[routes."typescript-code-change"]', 'category = "general_code"', 'route_type = "primary"', 'priority = 85', 'selection_axis = "language"',
			'[routes."typescript-code-change".path_hints]',
		].join('\n');
		const routesPath = path.join(root, '.mustflow', 'skills', 'routes.toml');
		const catalogPath = path.join(root, '.mustflow', 'skills', 'catalog.v2.json');
		writeFileSync(routesPath, source);
		for (const useCatalog of [false, true]) {
			if (useCatalog) writeFileSync(catalogPath, JSON.stringify(buildSkillRouteCatalog(root)));
			const resolve = (paths, taskText = null) => resolveSkillRoutes(root, { taskText, paths, reasons: [], maxCandidates: 5 });
			for (const candidatePath of ['src/file.abc', 'config/project.toml']) {
				const report = resolve([candidatePath]);
				assert.equal(report.selected.main?.skill, 'custom-language');
				assert.equal(report.selected.main.score_breakdown.path_match, 15);
				assert.equal(report.signals.task_terms.length, 0);
				if (useCatalog) assert.ok(report.signals.read_shards.includes('.mustflow/skills/catalog.v2.json'));
			}
			assert.equal(resolve(['src/file.ts']).candidates.length, 0);
			assert.equal(resolve(['src/file.abc'], 'skip custom language').candidates.length, 0);
		}
		rmSync(catalogPath);
		writeFileSync(routesPath, source.replace('[routes."typescript-code-change".path_hints]', ''));
		assert.equal(resolveSkillRoutes(root, { taskText: null, paths: ['src/file.ts'], reasons: [] }).selected.main?.skill, 'typescript-code-change');
		writeFileSync(catalogPath, JSON.stringify(buildSkillRouteCatalog(root)));
		const legacyCatalog = resolveSkillRoutes(root, { taskText: null, paths: ['src/file.ts'], reasons: [] });
		assert.equal(legacyCatalog.selected.main?.skill, 'typescript-code-change');
		assert.ok(legacyCatalog.signals.read_shards.includes('.mustflow/skills/catalog.v2.json'));
	} finally { removeTempProject(root); }
});
