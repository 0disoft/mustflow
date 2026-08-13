import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

import {
	buildSkillRouteCatalog,
	readSkillRouteCatalogCacheStats,
	resetSkillRouteCatalogCache,
	resolveSkillRoutes,
} from '../../dist/core/skill-route-resolution.js';
import { evaluateSkillRouteFixtures } from '../../dist/core/skill-route-fixtures.js';

const projectRoot = path.resolve(fileURLToPath(new URL('../..', import.meta.url)));
const cliPath = path.join(projectRoot, 'dist', 'cli', 'index.js');

function createTempProject() {
	return mkdtempSync(path.join(tmpdir(), 'mustflow-skill-route-'));
}

function removeTempProject(projectPath) {
	rmSync(projectPath, { recursive: true, force: true });
}

function runCli(cwd, args) {
	return spawnSync(process.execPath, [cliPath, ...args], {
		cwd,
		encoding: 'utf8',
	});
}

function initProject(projectPath, profile = null) {
	const result = runCli(projectPath, [
		'init',
		'--yes',
		...(profile ? ['--profile', profile] : []),
	]);
	assert.equal(result.status, 0, result.stderr || result.stdout);
}

test('resolves TypeScript skill routes from task, path, and reason signals', () => {
	const projectPath = createTempProject();

	try {
		initProject(projectPath);

		const result = runCli(projectPath, [
			'skill',
			'route',
			'--task',
			'Change TypeScript CLI JSON output and tests',
			'--path',
			'src/cli/commands/context.ts',
			'--path',
			'tests/cli/context.test.js',
			'--reason',
			'code_change',
			'--reason',
			'public_api_change',
			'--json',
		]);
		const report = JSON.parse(result.stdout);

		assert.equal(result.status, 0, result.stderr || result.stdout);
		assert.equal(report.command, 'skill');
		assert.equal(report.action, 'route');
		assert.equal(report.kind, 'skill_route_resolution');
		assert.equal(report.selected.main.skill, 'typescript-code-change');
		assert.equal(report.selected.main.skill_path, '.mustflow/skills/typescript-code-change/SKILL.md');
		assert.deepEqual(report.selected.adjuncts, []);
		assert.ok(report.selected.main.score > 0);
		assert.ok(report.selected.main.score_breakdown.reason_match > 0);
		assert.ok(report.selected.main.score_breakdown.task_text_match > 0);
		assert.ok(report.selected.main.matched_dimensions.includes('reason'));
		assert.ok(report.selected.main.matched_dimensions.includes('path_skill_hint'));
		assert.equal(report.selected.main.route_card.source, 'route_metadata_and_catalog');
		assert.equal(report.selected.main.route_card.index_read_policy, 'fallback_only');
		assert.deepEqual(report.selected.main.route_card.matched_dimensions, report.selected.main.matched_dimensions);
		assert.deepEqual(report.selected.main.route_card.route_dependencies.requires_skills, []);
		assert.deepEqual(report.selected.main.route_card.route_dependencies.suggests_adjuncts, []);
		assert.deepEqual(report.selected.main.route_card.route_dependencies.conflicts_with, []);
		assert.deepEqual(report.selected.main.route_card.route_dependencies.unlocks_on, []);
		assert.equal(report.selected.main.route_card.use_when_excerpt.source_path, report.selected.main.skill_path);
		assert.equal(report.selected.main.route_card.use_when_excerpt.section, 'use-when');
		assert.equal(report.selected.main.route_card.do_not_use_excerpt.section, 'do-not-use-when');
		assert.ok(report.selected.main.route_card.read_strategy.some((entry) => entry.includes('Use When')));
		assert.ok(report.selected.main.route_card.read_strategy.some((entry) => entry.includes('route_dependencies')));
		assert.ok(report.selected.main.route_card.read_strategy.some((entry) => entry.includes('INDEX.md')));
		assert.ok(report.candidates.length <= 5);
		assert.equal(report.read_plan.selection_limits.candidates, 5);
		assert.equal(report.read_plan.selection_limits.main, 1);
		assert.equal(report.read_plan.selection_limits.adjuncts, 2);
		assert.deepEqual(report.read_plan.stable_kernel, ['.mustflow/skills/router.toml']);
		assert.deepEqual(report.read_plan.selected_skill_paths, ['.mustflow/skills/typescript-code-change/SKILL.md']);
		assert.deepEqual(report.selected.axes.language.map((candidate) => candidate.skill), ['typescript-code-change']);
		assert.ok(report.read_plan.selected_skill_paths.includes('.mustflow/skills/typescript-code-change/SKILL.md'));
		assert.ok(report.read_plan.candidate_skill_paths.includes('.mustflow/skills/typescript-code-change/SKILL.md'));
		assert.equal(report.read_plan.fallback_route_metadata.path, '.mustflow/skills/routes.toml');
		assert.equal(report.read_plan.expanded_index.path, '.mustflow/skills/INDEX.md');
		assert.ok(report.read_plan.avoid_by_default.includes('.mustflow/skills/INDEX.md'));
		assert.equal(report.signals.read_shards.includes('.mustflow/skills/routes.toml'), false);
		assert.ok(report.signals.read_shards.includes('.mustflow/skills/catalog.v2.json'));
		assert.equal(report.signals.read_shards.includes('.mustflow/skills/*/SKILL.md'), false);
		assert.equal(report.signals.read_shards.includes('.mustflow/skills/INDEX.md'), false);
		assert.equal(report.source_files.includes('.mustflow/skills/routes.toml'), false);
		assert.ok(report.source_files.includes('.mustflow/skills/catalog.v2.json'));
		assert.equal(report.source_files.includes('.mustflow/skills/*/SKILL.md'), false);
		assert.equal(report.source_files.includes('.mustflow/skills/INDEX.md'), false);
		assert.match(report.gap_notes.join('\n'), /does not replace reading the selected SKILL\.md/);
		assert.equal(report.script_pack_suggestions.status, 'suggested');
		assert.deepEqual(report.script_pack_suggestions.input.phases, ['before_change', 'during_change', 'review']);
		assert.equal(report.script_pack_suggestions.input.changed, false);
		assert.ok(report.script_pack_suggestions.input.paths.includes('src/cli/commands/context.ts'));
		assert.ok(report.script_pack_suggestions.input.paths.includes('tests/cli/context.test.js'));
		assert.ok(report.script_pack_suggestions.input.skills.includes('typescript-code-change'));
		assert.ok(report.script_pack_suggestions.analyzed_paths.some((entry) => entry.surfaces.includes('source')));
		assert.ok(report.script_pack_suggestions.analyzed_paths.some((entry) => entry.surfaces.includes('test')));
		assert.ok(report.script_pack_suggestions.suggestions.length > 0);
		assert.ok(
			report.script_pack_suggestions.suggestions.some(
				(suggestion) => suggestion.script_ref === 'repo/generated-boundary',
			),
		);
		assert.ok(
			report.script_pack_suggestions.suggestions.every(
				(suggestion) => suggestion.read_only && !suggestion.mutates && !suggestion.network,
			),
		);
	} finally {
		removeTempProject(projectPath);
	}
});

test('does not select a skill without route evidence', () => {
	const result = runCli(projectRoot, ['skill', 'route', '--json']);
	const report = JSON.parse(result.stdout);

	assert.equal(result.status, 0, result.stderr || result.stdout);
	assert.equal(report.selected.main, null);
	assert.deepEqual(report.selected.adjuncts, []);
	assert.deepEqual(report.candidates, []);
});

test('reports aggregate skill route quality metrics from the versioned corpus', () => {
	const report = evaluateSkillRouteFixtures(projectRoot);

	assert.equal(report.case_count, 94);
	assert.equal(report.passed_case_count, report.case_count);
	assert.equal(report.main_accuracy.rate, 1);
	assert.equal(report.candidate_recall.rate, 1);
	assert.equal(report.adjunct_recall.rate, 1);
	assert.equal(report.forbidden_violation_rate.rate, 0);
	assert.deepEqual(report.issues, []);
});

test('keeps the generated route catalog synchronized with built-in skill frontmatter', () => {
	const sourceCatalog = readFileSync(path.join(projectRoot, '.mustflow', 'skills', 'catalog.v2.json'), 'utf8');
	const templateCatalog = readFileSync(
		path.join(projectRoot, 'templates', 'default', 'locales', 'en', '.mustflow', 'skills', 'catalog.v2.json'),
		'utf8',
	);
	const catalog = JSON.parse(sourceCatalog);
	const skillDirectoryCount = readdirSync(path.join(projectRoot, '.mustflow', 'skills'), { withFileTypes: true })
		.filter((entry) => entry.isDirectory())
		.filter((entry) => existsSync(path.join(projectRoot, '.mustflow', 'skills', entry.name, 'SKILL.md')))
		.length;

	assert.equal(sourceCatalog, templateCatalog);
	assert.equal(catalog.schema_version, '2');
	assert.equal(catalog.kind, 'skill_route_catalog');
	assert.match(catalog.source_fingerprint, /^sha256:[a-f0-9]{64}$/u);
	assert.equal(catalog.entries.length, skillDirectoryCount);
	assert.ok(catalog.entries.every((entry) => ['language', 'task', 'risk', 'workflow'].includes(entry.selection_axis)));
});

test('builds route catalogs in locale-independent code-unit order', () => {
	const resolutionSource = readFileSync(
		path.join(projectRoot, 'src', 'core', 'skill-route-resolution.ts'),
		'utf8',
	);
	assert.doesNotMatch(resolutionSource, /\.localeCompare\(/u);

	const projectPath = createTempProject();

	try {
		const skillRoot = path.join(projectPath, '.mustflow', 'skills');
		mkdirSync(path.join(skillRoot, 'a-a'), { recursive: true });
		mkdirSync(path.join(skillRoot, 'aa'), { recursive: true });
		for (const skill of ['a-a', 'aa']) {
			writeFileSync(
				path.join(skillRoot, skill, 'SKILL.md'),
				`---\nname: ${skill}\ndescription: Route ${skill}.\n---\n\n# ${skill}\n`,
			);
		}
		writeFileSync(
			path.join(skillRoot, 'routes.toml'),
			[
				'schema_version = "1"',
				'',
				'[routes."a-a"]',
				'category = "general_code"',
				'route_type = "primary"',
				'priority = 50',
				'selection_axis = "task"',
				'',
				'[routes."a-a".contexts]',
				'positive_terms = ["투명 png", "atlas extrude"]',
				'',
				'[routes."aa"]',
				'category = "general_code"',
				'route_type = "primary"',
				'priority = 50',
				'selection_axis = "task"',
				'',
			].join('\n'),
		);

		const catalog = buildSkillRouteCatalog(projectPath);
		assert.deepEqual(catalog.entries.map((entry) => entry.skill), ['a-a', 'aa']);
		assert.deepEqual(catalog.entries[0].positive_signals, ['atlas extrude', '투명 png']);
	} finally {
		removeTempProject(projectPath);
	}
});

test('filters packaged catalog entries to skills installed by the selected profile', () => {
	const projectPath = createTempProject();

	try {
		initProject(projectPath, 'minimal');
		assert.equal(
			existsSync(path.join(projectPath, '.mustflow', 'skills', 'ai-game-asset-production', 'SKILL.md')),
			false,
		);
		const report = resolveSkillRoutes(projectPath, {
			taskText: 'Build an AI generated transparent PNG sprite atlas',
			paths: ['assets/player.png'],
			reasons: ['web_asset_change'],
			maxCandidates: 10,
		});

		assert.equal(report.candidates.some((candidate) => candidate.skill === 'ai-game-asset-production'), false);
		assert.ok(report.source_files.includes('.mustflow/skills/catalog.v2.json'));
	} finally {
		removeTempProject(projectPath);
	}
});

test('uses catalog v2 route metadata without parsing routes.toml on the normal path', () => {
	const projectPath = createTempProject();

	try {
		initProject(projectPath);
		writeFileSync(path.join(projectPath, '.mustflow', 'skills', 'routes.toml'), 'not valid toml = [\n');
		const report = resolveSkillRoutes(projectPath, {
			taskText: 'Change a TypeScript type contract for public consumers',
			paths: ['src/public-types.ts'],
			reasons: ['public_api_change'],
			maxCandidates: 10,
		});

		assert.equal(report.selected.axes.language[0]?.skill, 'typescript-code-change');
		assert.equal(report.selected.axes.task[0]?.skill, 'type-contract-change');
		assert.deepEqual(report.source_files, ['.mustflow/skills/catalog.v2.json']);
	} finally {
		removeTempProject(projectPath);
	}
});

test('caches unchanged catalog parsing and invalidates after the catalog file changes', () => {
	const projectPath = createTempProject();

	try {
		initProject(projectPath);
		resetSkillRouteCatalogCache();
		const input = {
			taskText: 'Change TypeScript code',
			paths: ['src/index.ts'],
			reasons: ['code_change'],
		};
		resolveSkillRoutes(projectPath, input);
		resolveSkillRoutes(projectPath, input);
		assert.deepEqual(readSkillRouteCatalogCacheStats(), { hits: 1, misses: 1 });

		const catalogPath = path.join(projectPath, '.mustflow', 'skills', 'catalog.v2.json');
		writeFileSync(catalogPath, `${readFileSync(catalogPath, 'utf8')}\n`);
		resolveSkillRoutes(projectPath, input);
		assert.deepEqual(readSkillRouteCatalogCacheStats(), { hits: 1, misses: 2 });
	} finally {
		resetSkillRouteCatalogCache();
		removeTempProject(projectPath);
	}
});

test('keeps language task and risk axes in the selected read plan', () => {
	const result = runCli(projectRoot, [
		'skill',
		'route',
		'--task',
		'Change a TypeScript type contract and authorization permission boundary for public consumers',
		'--path',
		'src/core/public-types.ts',
		'--reason',
		'public_api_change',
		'--reason',
		'security_change',
		'--max-candidates',
		'10',
		'--json',
	]);
	const report = JSON.parse(result.stdout);

	assert.equal(result.status, 0, result.stderr || result.stdout);
	assert.deepEqual(report.selected.axes.language.map((candidate) => candidate.skill), ['typescript-code-change']);
	assert.deepEqual(report.selected.axes.task.map((candidate) => candidate.skill), ['type-contract-change']);
	assert.deepEqual(report.selected.axes.risk.map((candidate) => candidate.skill), ['auth-permission-change']);
	for (const skill of ['typescript-code-change', 'type-contract-change', 'auth-permission-change']) {
		assert.ok(
			report.read_plan.selected_skill_paths.includes(`.mustflow/skills/${skill}/SKILL.md`),
			report.read_plan.selected_skill_paths.join(', '),
		);
	}
});

test('uses router selection limits as the resolver source of truth', () => {
	const projectPath = createTempProject();

	try {
		initProject(projectPath);
		const routerPath = path.join(projectPath, '.mustflow', 'skills', 'router.toml');
		const router = readFileSync(routerPath, 'utf8')
			.replace('selection_limit = 5', 'selection_limit = 3')
			.replace('adjunct_limit = 2', 'adjunct_limit = 1')
			.replace('risk = 1', 'risk = 0');
		writeFileSync(routerPath, router);

		const report = resolveSkillRoutes(projectPath, {
			taskText: 'Change a TypeScript type contract and authorization permission boundary',
			paths: ['src/core/public-types.ts'],
			reasons: ['public_api_change'],
		});

		assert.equal(report.input.max_candidates, 3);
		assert.deepEqual(report.read_plan.selection_limits, { candidates: 3, main: 1, adjuncts: 1 });
		assert.deepEqual(report.selected.axes.risk, []);
		assert.ok(report.candidates.length <= 3);
		assert.ok(report.selected.adjuncts.length <= 1);
	} finally {
		removeTempProject(projectPath);
	}
});

test('falls back to built-in skill frontmatter when the route catalog is invalid', () => {
	const projectPath = createTempProject();

	try {
		initProject(projectPath);
		writeFileSync(path.join(projectPath, '.mustflow', 'skills', 'catalog.v2.json'), '{}\n');
		const result = runCli(projectPath, [
			'skill',
			'route',
			'--task',
			'Change TypeScript code',
			'--path',
			'src/index.ts',
			'--reason',
			'code_change',
			'--json',
		]);
		const report = JSON.parse(result.stdout);

		assert.equal(result.status, 0, result.stderr || result.stdout);
		assert.equal(report.selected.main.skill, 'typescript-code-change');
		assert.ok(report.source_files.includes('.mustflow/skills/*/SKILL.md'));
		assert.equal(report.source_files.includes('.mustflow/skills/catalog.v2.json'), false);
	} finally {
		removeTempProject(projectPath);
	}
});

test('rejects a fingerprint-valid route catalog whose skill path escapes the built-in skill root', () => {
	const projectPath = createTempProject();

	try {
		initProject(projectPath);
		const catalogPath = path.join(projectPath, '.mustflow', 'skills', 'catalog.v2.json');
		const catalog = JSON.parse(readFileSync(catalogPath, 'utf8'));
		catalog.entries[0].skill_path = '../outside/SKILL.md';
		catalog.source_fingerprint = `sha256:${createHash('sha256')
			.update(JSON.stringify(catalog.entries))
			.digest('hex')}`;
		writeFileSync(catalogPath, `${JSON.stringify(catalog, null, 2)}\n`);

		const result = runCli(projectPath, [
			'skill',
			'route',
			'--task',
			'Change TypeScript code',
			'--path',
			'src/index.ts',
			'--reason',
			'code_change',
			'--json',
		]);
		const report = JSON.parse(result.stdout);

		assert.equal(result.status, 0, result.stderr || result.stdout);
		assert.equal(report.selected.main.skill, 'typescript-code-change');
		assert.ok(report.source_files.includes('.mustflow/skills/*/SKILL.md'));
	} finally {
		removeTempProject(projectPath);
	}
});

test('does not select conflicting routes across different selection axes', () => {
	const projectPath = createTempProject();

	try {
		initProject(projectPath);
		const routesPath = path.join(projectPath, '.mustflow', 'skills', 'routes.toml');
		const routes = readFileSync(routesPath, 'utf8').replace(
			'[routes."typescript-code-change"]\ncategory = "general_code"',
			'[routes."typescript-code-change"]\ncategory = "general_code"\nmutually_exclusive_with = ["type-contract-change"]',
		);
		writeFileSync(routesPath, routes);
		rmSync(path.join(projectPath, '.mustflow', 'skills', 'catalog.v2.json'));

		const report = resolveSkillRoutes(projectPath, {
			taskText: 'Change a TypeScript type contract for public consumers',
			paths: ['src/core/public-types.ts'],
			reasons: ['public_api_change'],
			maxCandidates: 10,
		});
		const selectedSkills = Object.values(report.selected.axes)
			.flat()
			.map((candidate) => candidate.skill);

		assert.ok(selectedSkills.includes('typescript-code-change'));
		assert.equal(selectedSkills.includes('type-contract-change'), false);
	} finally {
		removeTempProject(projectPath);
	}
});

test('strict check rejects route catalog drift from built-in skill frontmatter', () => {
	const projectPath = createTempProject();

	try {
		initProject(projectPath);
		const skillPath = path.join(projectPath, '.mustflow', 'skills', 'typescript-code-change', 'SKILL.md');
		writeFileSync(
			skillPath,
			readFileSync(skillPath, 'utf8').replace(
				'description: Apply this skill when',
				'description: Apply this updated skill when',
			),
		);
		const result = runCli(projectPath, ['check', '--strict']);

		assert.equal(result.status, 1, result.stderr || result.stdout);
		assert.match(result.stderr || result.stdout, /catalog\.v2\.json is stale relative to built-in SKILL\.md frontmatter/u);
	} finally {
		removeTempProject(projectPath);
	}
});

test('preserves Unicode concepts and selects language plus type-contract procedures together', () => {
	const koreanResult = runCli(projectRoot, [
		'skill',
		'route',
		'--task',
		'공유 인터페이스의 타입 계약과 타입 영향 범위를 수정해',
		'--path',
		'src/core/public-types.ts',
		'--reason',
		'public_api_change',
		'--max-candidates',
		'10',
		'--json',
	]);
	const koreanReport = JSON.parse(koreanResult.stdout);

	assert.equal(koreanResult.status, 0, koreanResult.stderr || koreanResult.stdout);
	assert.equal(koreanReport.selected.main.skill, 'typescript-code-change');
	assert.ok(koreanReport.signals.task_terms.includes('타입'));
	assert.ok(koreanReport.signals.task_terms.includes('계약과'));
	assert.ok(
		koreanReport.selected.adjuncts.some((candidate) => candidate.skill === 'type-contract-change'),
		koreanReport.selected.adjuncts.map((candidate) => candidate.skill).join(', '),
	);

	const chineseResult = runCli(projectRoot, [
		'skill',
		'route',
		'--task',
		'检查崩溃一致性和异常退出恢复',
		'--path',
		'src/storage/recovery.ts',
		'--reason',
		'data_change',
		'--max-candidates',
		'10',
		'--json',
	]);
	const chineseReport = JSON.parse(chineseResult.stdout);

	assert.equal(chineseResult.status, 0, chineseResult.stderr || chineseResult.stdout);
	assert.ok(
		chineseReport.candidates.some((candidate) => candidate.skill === 'crash-consistency-recovery-review'),
		chineseReport.candidates.map((candidate) => candidate.skill).join(', '),
	);
});

test('matches negative route signals as phrases instead of token bags', () => {
	const positiveResult = runCli(projectRoot, [
		'skill',
		'route',
		'--task',
		'Change a TypeScript type contract and interface change for consumers',
		'--path',
		'src/core/types.ts',
		'--reason',
		'public_api_change',
		'--max-candidates',
		'10',
		'--json',
	]);
	const positiveReport = JSON.parse(positiveResult.stdout);
	const positiveTypeContract = positiveReport.candidates.find(
		(candidate) => candidate.skill === 'type-contract-change',
	);

	assert.equal(positiveResult.status, 0, positiveResult.stderr || positiveResult.stdout);
	assert.ok(positiveTypeContract);
	assert.equal(positiveTypeContract.score_breakdown.negative_signal_penalty, 0);

	const negativeResult = runCli(projectRoot, [
		'skill',
		'route',
		'--task',
		'Change a TypeScript consumer compile declaration diff generic constraint type contract for a local type only edit',
		'--path',
		'src/core/types.ts',
		'--reason',
		'public_api_change',
		'--max-candidates',
		'10',
		'--json',
	]);
	const negativeReport = JSON.parse(negativeResult.stdout);
	const negativeTypeContract = negativeReport.candidates.find(
		(candidate) => candidate.skill === 'type-contract-change',
	);

	assert.equal(negativeResult.status, 0, negativeResult.stderr || negativeResult.stdout);
	assert.ok(negativeTypeContract);
	assert.ok(negativeTypeContract.score_breakdown.negative_signal_penalty < 0);
});

test('marks accessibility-only chart work as a negative information visualization boundary', () => {
	const result = runCli(projectRoot, [
		'skill',
		'route',
		'--task',
		'The chart form and data meaning are already correct; perform accessibility-tree-only keyboard and naming fixes',
		'--path',
		'src/components/RevenueChart.tsx',
		'--reason',
		'ui_change',
		'--max-candidates',
		'10',
		'--json',
	]);
	const report = JSON.parse(result.stdout);
	const visualization = report.candidates.find(
		(candidate) => candidate.skill === 'information-visualization-integrity-review',
	);

	assert.equal(result.status, 0, result.stderr || result.stdout);
	assert.ok(visualization);
	assert.ok(visualization.score_breakdown.negative_signal_penalty < 0);
	assert.ok(visualization.matched_dimensions.includes('negative_signal'));
	assert.ok(
		report.candidates.some((candidate) => candidate.skill === 'frontend-accessibility-tree-review'),
		report.candidates.map((candidate) => candidate.skill).join(', '),
	);
});

test('uses pattern signal route cards to break same-priority architecture route ties', () => {
	const result = runCli(projectRoot, [
		'skill',
		'route',
		'--task',
		'Refactor state-machine-pattern status phase transitions, allowed lifecycle states, and irreversible history handling',
		'--path',
		'.mustflow/skills/state-machine-pattern/SKILL.md',
		'--reason',
		'code_change',
		'--max-candidates',
		'10',
		'--json',
	]);
	const report = JSON.parse(result.stdout);
	const stateMachine = report.candidates.find((candidate) => candidate.skill === 'state-machine-pattern');
	const strategy = report.candidates.find((candidate) => candidate.skill === 'strategy-pattern');

	assert.equal(result.status, 0, result.stderr || result.stdout);
	assert.equal(report.selected.main.skill, 'state-machine-pattern');
	assert.ok(stateMachine, report.candidates.map((candidate) => candidate.skill).join(', '));
	assert.ok(stateMachine.matched_dimensions.includes('pattern_signal'));
	assert.ok(stateMachine.selection_reasons.some((reason) => reason.startsWith('pattern_terms:')));
	assert.ok(stateMachine.score_breakdown.pattern_signal_match > 0);
	assert.ok(
		report.candidates
			.filter((candidate) => ['command-pattern', 'facade-pattern', 'strategy-pattern'].includes(candidate.skill))
			.every((candidate) => stateMachine.score > candidate.score),
		report.candidates
			.map((candidate) => `${candidate.skill}:${candidate.score}`)
			.join(', '),
	);
	if (strategy) {
		assert.ok(strategy.matched_dimensions.includes('negative_signal'));
		assert.ok(strategy.score_breakdown.negative_signal_penalty < 0);
	}
	assert.equal(stateMachine.route_card.index_read_policy, 'fallback_only');
	assert.deepEqual(stateMachine.route_card.route_dependencies.conflicts_with, ['strategy-pattern']);
	assert.equal(stateMachine.route_card.use_when_excerpt.section, 'use-when');
	assert.equal(stateMachine.route_card.do_not_use_excerpt.section, 'do-not-use-when');
});

test('surfaces route dependency metadata in compact route cards', () => {
	const result = runCli(projectRoot, [
		'skill',
		'route',
		'--task',
		'Change public JSON schema output fixtures and CLI machine-readable output',
		'--path',
		'schemas/skill-route-report.schema.json',
		'--reason',
		'public_api_change',
		'--max-candidates',
		'1',
		'--json',
	]);
	const report = JSON.parse(result.stdout);
	const publicJson = report.candidates.find((candidate) => candidate.skill === 'public-json-contract-change');

	assert.equal(result.status, 0, result.stderr || result.stdout);
	assert.equal(report.candidates.length, 1);
	assert.equal(report.selected.main.skill, 'public-json-contract-change');
	assert.ok(publicJson, report.candidates.map((candidate) => candidate.skill).join(', '));
	assert.deepEqual(publicJson.route_card.route_dependencies.requires_skills, []);
	assert.deepEqual(publicJson.route_card.route_dependencies.suggests_adjuncts, [
		'cli-output-contract-review',
		'completion-evidence-gate',
	]);
	assert.deepEqual(publicJson.route_card.route_dependencies.conflicts_with, []);
	assert.deepEqual(publicJson.route_card.route_dependencies.unlocks_on, [
		{ signal: 'machine_output_changed', skill: 'cli-output-contract-review' },
		{ signal: 'schema_or_fixture_changed', skill: 'completion-evidence-gate' },
	]);
	assert.deepEqual(
		report.selected.adjuncts.map((candidate) => candidate.skill),
		['cli-output-contract-review', 'completion-evidence-gate'],
	);
	assert.ok(
		report.selected.adjuncts.every((candidate) => candidate.matched_dimensions.includes('route_dependency')),
	);
	assert.ok(
		report.selected.adjuncts.every((candidate) =>
			candidate.selection_reasons.some((reason) => reason.startsWith('route_dependency:')),
		),
	);
	assert.deepEqual(report.read_plan.selected_skill_paths, [
		'.mustflow/skills/public-json-contract-change/SKILL.md',
		'.mustflow/skills/cli-output-contract-review/SKILL.md',
		'.mustflow/skills/completion-evidence-gate/SKILL.md',
	]);
	assert.deepEqual(report.read_plan.candidate_skill_paths, [
		'.mustflow/skills/public-json-contract-change/SKILL.md',
	]);
	assert.ok(
		report.read_plan.notes.some((note) => note.includes('route dependency reads')),
		report.read_plan.notes.join('\n'),
	);
});

test('prioritizes required and matched unlock dependencies over generic suggestions', () => {
	const projectPath = createTempProject();

	try {
		initProject(projectPath, 'patterns');
		const routesPath = path.join(projectPath, '.mustflow', 'skills', 'routes.toml');
		const routes = readFileSync(routesPath, 'utf8');
		const dependencyPattern =
			/\[routes\."state-machine-pattern"\.dependencies\]\r?\nconflicts_with = \["strategy-pattern"\]/u;
		assert.match(routes, dependencyPattern);
		writeFileSync(
			routesPath,
			routes.replace(
				dependencyPattern,
				`[routes."state-machine-pattern".dependencies]\nconflicts_with = ["strategy-pattern"]\nrequires_skills = ["transaction-boundary-integrity-review"]\nsuggests_adjuncts = ["queue-processing-integrity-review"]\nunlocks_on = [\n  { signal = "state_transition", skill = "credit-ledger-integrity-review" },\n]`,
			),
		);
		rmSync(path.join(projectPath, '.mustflow', 'skills', 'catalog.v2.json'));

		const result = runCli(projectPath, [
			'skill',
			'route',
			'--task',
			'Refactor state-machine-pattern state transition status phase lifecycle and irreversible history',
			'--path',
			'.mustflow/skills/state-machine-pattern/SKILL.md',
			'--reason',
			'code_change',
			'--max-candidates',
			'10',
			'--json',
		]);
		const report = JSON.parse(result.stdout);

		assert.equal(result.status, 0, result.stderr || result.stdout);
		assert.equal(report.selected.main.skill, 'state-machine-pattern');
		assert.deepEqual(
			report.selected.adjuncts.map((candidate) => candidate.skill),
			['transaction-boundary-integrity-review', 'credit-ledger-integrity-review'],
		);
		assert.ok(
			report.selected.adjuncts[0].selection_reasons.includes(
				'route_dependency:requires:state-machine-pattern',
			),
		);
		assert.ok(
			report.selected.adjuncts[1].selection_reasons.includes(
				'route_dependency:unlocked_by:state-machine-pattern:state_transition',
			),
		);
		assert.equal(
			report.selected.adjuncts.some((candidate) => candidate.skill === 'queue-processing-integrity-review'),
			false,
		);
	} finally {
		removeTempProject(projectPath);
	}
});

test('keeps LLM token cost routes discoverable without reading the full index in the prompt', () => {
	const projectPath = createTempProject();

	try {
		initProject(projectPath);

		const result = runCli(projectPath, [
			'skill',
			'route',
			'--task',
			'Review prompt cache token budgets, provider tool schemas, and volatile context placement',
			'--path',
			'src/cli/lib/agent-context.ts',
			'--reason',
			'performance_change',
			'--max-candidates',
			'3',
			'--json',
		]);
		const report = JSON.parse(result.stdout);
		const skills = report.candidates.map((candidate) => candidate.skill);

		assert.equal(result.status, 0, result.stderr || result.stdout);
		assert.ok(report.candidates.length <= 3);
		assert.ok(skills.includes('llm-token-cost-control-review'), skills.join(', '));
		assert.ok(report.signals.task_terms.includes('cache'));
		assert.ok(report.signals.task_terms.includes('token'));
		assert.equal(report.signals.read_shards.includes('.mustflow/skills/routes.toml'), false);
		assert.ok(report.signals.read_shards.includes('.mustflow/skills/catalog.v2.json'));
		assert.equal(report.signals.read_shards.includes('.mustflow/skills/*/SKILL.md'), false);
		assert.equal(report.signals.read_shards.includes('.mustflow/skills/INDEX.md'), false);
		assert.equal(report.read_plan.selection_limits.candidates, 3);
		assert.ok(report.read_plan.candidate_skill_paths.length <= 3);
		assert.ok(
			report.read_plan.notes.some((note) => note.includes('expanded skill index')),
			report.read_plan.notes.join('\n'),
		);
	} finally {
		removeTempProject(projectPath);
	}
});

test('prints a compact text skill route report', () => {
	const result = runCli(projectRoot, [
		'skill',
		'route',
		'--task',
		'Change public JSON schema output fixtures and CLI machine-readable output',
		'--path',
		'schemas/skill-route-report.schema.json',
		'--reason',
		'public_api_change',
		'--max-candidates',
		'1',
	]);

	assert.equal(result.status, 0, result.stderr || result.stdout);
	assert.match(result.stdout, /mustflow skill route/);
	assert.match(result.stdout, /selected_main: public-json-contract-change/);
	assert.match(result.stdout, /selected_adjuncts: cli-output-contract-review, completion-evidence-gate/);
	assert.match(result.stdout, /Candidates/);
	assert.match(result.stdout, /Dependency reads/);
	assert.match(result.stdout, /- cli-output-contract-review[\s\S]*?route_dependency:unlocked_by:public-json-contract-change:machine_output_changed/u);
	assert.match(result.stdout, /- completion-evidence-gate[\s\S]*?route_dependency:unlocked_by:public-json-contract-change:schema_or_fixture_changed/u);
	assert.match(result.stdout, /Read plan/);
	assert.match(result.stdout, /read selected skill: \.mustflow\/skills\/public-json-contract-change\/SKILL\.md/);
	assert.match(result.stdout, /read selected skill: \.mustflow\/skills\/cli-output-contract-review\/SKILL\.md/);
	assert.match(result.stdout, /read selected skill: \.mustflow\/skills\/completion-evidence-gate\/SKILL\.md/);
	assert.match(result.stdout, /avoid by default: \.mustflow\/skills\/INDEX\.md/);
	assert.match(result.stdout, /\.mustflow\/skills\/routes\.toml/);
	assert.match(result.stdout, /\.mustflow\/skills\/catalog\.v2\.json/);
});

test('prints route conflict hints in text skill route output', () => {
	const result = runCli(projectRoot, [
		'skill',
		'route',
		'--task',
		'Refactor state-machine-pattern status phase transitions, allowed lifecycle states, and irreversible history handling',
		'--path',
		'.mustflow/skills/state-machine-pattern/SKILL.md',
		'--reason',
		'code_change',
		'--max-candidates',
		'10',
	]);

	assert.equal(result.status, 0, result.stderr || result.stdout);
	assert.match(result.stdout, /selected_main: state-machine-pattern/);
	assert.match(result.stdout, /Conflict hints/);
	assert.match(result.stdout, /- state-machine-pattern[\s\S]*?conflicts_with: strategy-pattern/u);
	assert.match(result.stdout, /path: \.mustflow\/skills\/state-machine-pattern\/SKILL\.md/);
});

test('prints external skill update reminder in text skill route output when checks are stale', () => {
	const projectPath = createTempProject();

	try {
		initProject(projectPath);
		const skillDirectory = path.join(projectPath, '.mustflow', 'external-skills', 'concurrency-review');
		mkdirSync(skillDirectory, { recursive: true });
		writeFileSync(path.join(skillDirectory, 'mustflow-skill-source.json'), '{}\n');

		const result = runCli(projectPath, [
			'skill',
			'route',
			'--task',
			'Update public docs',
			'--path',
			'docs-site/src/content/docs/en/commands/context.md',
			'--reason',
			'docs_change',
		]);

		assert.equal(result.status, 0, result.stderr || result.stdout);
		assert.match(result.stdout, /Warnings/);
		assert.match(result.stdout, /External skill update check is stale/u);
		assert.match(result.stdout, /mf skill outdated --json/u);
		assert.match(result.stdout, /Last checked: never/u);
	} finally {
		removeTempProject(projectPath);
	}
});

test('prefers docs-update for documentation-only paths over implementation framework routes', () => {
	const projectPath = createTempProject();

	try {
		initProject(projectPath);

		const result = runCli(projectPath, [
			'skill',
			'route',
			'--task',
			'Update public docs for strict check behavior',
			'--path',
			'docs-site/src/content/docs/en/commands/check.md',
			'--reason',
			'docs_change',
			'--json',
		]);
		const report = JSON.parse(result.stdout);
		const skills = report.candidates.map((candidate) => candidate.skill);

		assert.equal(result.status, 0, result.stderr || result.stdout);
		assert.equal(report.selected.main.skill, 'docs-update');
		assert.ok(skills.includes('docs-update'), skills.join(', '));
		assert.equal(report.selected.main.skill === 'astro-code-change', false);
	} finally {
		removeTempProject(projectPath);
	}
});
