import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

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

function initProject(projectPath) {
	const result = runCli(projectPath, ['init', '--yes']);
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
		assert.equal(report.selected.main.route_card.source, 'route_metadata_and_skill_frontmatter');
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
		assert.ok(report.read_plan.selected_skill_paths.includes('.mustflow/skills/typescript-code-change/SKILL.md'));
		assert.ok(report.read_plan.candidate_skill_paths.includes('.mustflow/skills/typescript-code-change/SKILL.md'));
		assert.equal(report.read_plan.fallback_route_metadata.path, '.mustflow/skills/routes.toml');
		assert.equal(report.read_plan.expanded_index.path, '.mustflow/skills/INDEX.md');
		assert.ok(report.read_plan.avoid_by_default.includes('.mustflow/skills/INDEX.md'));
		assert.ok(report.signals.read_shards.includes('.mustflow/skills/routes.toml'));
		assert.ok(report.signals.read_shards.includes('.mustflow/skills/*/SKILL.md'));
		assert.equal(report.signals.read_shards.includes('.mustflow/skills/INDEX.md'), false);
		assert.ok(report.source_files.includes('.mustflow/skills/routes.toml'));
		assert.ok(report.source_files.includes('.mustflow/skills/*/SKILL.md'));
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
		assert.ok(report.signals.read_shards.includes('.mustflow/skills/routes.toml'));
		assert.ok(report.signals.read_shards.includes('.mustflow/skills/*/SKILL.md'));
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
	assert.match(result.stdout, /- cli-output-contract-review[\s\S]*?route_dependency:suggested_by:public-json-contract-change/u);
	assert.match(result.stdout, /- completion-evidence-gate[\s\S]*?route_dependency:suggested_by:public-json-contract-change/u);
	assert.match(result.stdout, /Read plan/);
	assert.match(result.stdout, /read selected skill: \.mustflow\/skills\/public-json-contract-change\/SKILL\.md/);
	assert.match(result.stdout, /read selected skill: \.mustflow\/skills\/cli-output-contract-review\/SKILL\.md/);
	assert.match(result.stdout, /read selected skill: \.mustflow\/skills\/completion-evidence-gate\/SKILL\.md/);
	assert.match(result.stdout, /avoid by default: \.mustflow\/skills\/INDEX\.md/);
	assert.match(result.stdout, /\.mustflow\/skills\/routes\.toml/);
	assert.match(result.stdout, /\.mustflow\/skills\/\*\/SKILL\.md/);
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
