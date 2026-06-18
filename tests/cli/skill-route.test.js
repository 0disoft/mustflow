import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
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
		assert.ok(report.selected.main.score > 0);
		assert.ok(report.selected.main.score_breakdown.reason_match > 0);
		assert.ok(report.selected.main.score_breakdown.task_text_match > 0);
		assert.ok(report.candidates.length <= 5);
		assert.ok(report.source_files.includes('.mustflow/skills/routes.toml'));
		assert.ok(report.source_files.includes('.mustflow/skills/INDEX.md'));
		assert.match(report.gap_notes.join('\n'), /does not replace reading the selected SKILL\.md/);
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
		assert.ok(report.signals.read_shards.includes('.mustflow/skills/routes.toml'));
	} finally {
		removeTempProject(projectPath);
	}
});

test('prints a compact text skill route report', () => {
	const projectPath = createTempProject();

	try {
		initProject(projectPath);

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
		assert.match(result.stdout, /mustflow skill route/);
		assert.match(result.stdout, /selected_main:/);
		assert.match(result.stdout, /Candidates/);
		assert.match(result.stdout, /\.mustflow\/skills\/routes\.toml/);
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
