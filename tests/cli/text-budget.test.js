import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { test } from 'node:test';

import { createTempProject, initProject, removeTempProject, runCli } from './run-support.js';

function runTextBudgetJson(projectPath, args) {
	const result = runCli(projectPath, ['script-pack', 'run', 'core/text-budget', 'check', ...args, '--json']);
	return { result, report: JSON.parse(result.stdout) };
}

function runGeneratedBoundaryJson(projectPath, args) {
	const result = runCli(projectPath, ['script-pack', 'run', 'repo/generated-boundary', 'check', ...args, '--json']);
	return { result, report: JSON.parse(result.stdout) };
}

function runScriptPackSuggestJson(projectPath, args) {
	const result = runCli(projectPath, ['script-pack', 'suggest', ...args, '--json']);
	return { result, report: JSON.parse(result.stdout) };
}

function runGit(projectPath, args) {
	return spawnSync('git', ['-C', projectPath, ...args], {
		cwd: projectPath,
		encoding: 'utf8',
		stdio: ['ignore', 'pipe', 'pipe'],
		windowsHide: true,
	});
}

function commitGitBaseline(projectPath) {
	for (const args of [
		['init'],
		['config', 'user.email', 'mustflow-tests@example.invalid'],
		['config', 'user.name', 'mustflow tests'],
		['add', '.'],
		['commit', '-m', 'baseline'],
	]) {
		const result = runGit(projectPath, args);
		assert.equal(result.status, 0, result.stderr || result.stdout);
	}
}

test('script-pack catalog exposes routing metadata for agent script selection', () => {
	const projectPath = createTempProject();

	try {
		initProject(projectPath);
		const result = runCli(projectPath, ['script-pack', 'list', '--json']);

		assert.equal(result.status, 0, result.stderr || result.stdout);
		const report = JSON.parse(result.stdout);
		const corePack = report.packs.find((pack) => pack.id === 'core');
		const textBudget = corePack?.scripts.find((script) => script.ref === 'core/text-budget');

		assert.ok(textBudget, 'core/text-budget should be listed');
		assert.equal(textBudget.read_only, true);
		assert.equal(textBudget.mutates, false);
		assert.equal(textBudget.network, false);
		assert.deepEqual(textBudget.phases, ['before_change', 'after_change', 'review']);
		assert.ok(textBudget.use_when.some((hint) => hint.includes('text budgets')));
		assert.ok(textBudget.inputs.includes('json_pointer'));
		assert.ok(textBudget.outputs.includes('json_report'));
		assert.ok(textBudget.related_skills.includes('docs-prose-review'));
		assert.equal(textBudget.risk_level, 'low');
		assert.equal(textBudget.cost, 'low');
		assert.equal(textBudget.report_schema_file, 'text-budget-report.schema.json');

		const repoPack = report.packs.find((pack) => pack.id === 'repo');
		const generatedBoundary = repoPack?.scripts.find((script) => script.ref === 'repo/generated-boundary');

		assert.ok(generatedBoundary, 'repo/generated-boundary should be listed');
		assert.equal(generatedBoundary.read_only, true);
		assert.equal(generatedBoundary.mutates, false);
		assert.equal(generatedBoundary.network, false);
		assert.deepEqual(generatedBoundary.phases, ['before_change', 'after_change', 'review']);
		assert.ok(generatedBoundary.use_when.some((hint) => hint.includes('generated')));
		assert.ok(generatedBoundary.inputs.includes('path'));
		assert.ok(generatedBoundary.outputs.includes('json_report'));
		assert.ok(generatedBoundary.related_skills.includes('completion-evidence-gate'));
		assert.equal(generatedBoundary.risk_level, 'low');
		assert.equal(generatedBoundary.cost, 'low');
		assert.equal(generatedBoundary.report_schema_file, 'generated-boundary-report.schema.json');
	} finally {
		removeTempProject(projectPath);
	}
});

test('text-budget passes multilingual grapheme budgets', () => {
	const projectPath = createTempProject();

	try {
		initProject(projectPath);
		writeFileSync(path.join(projectPath, 'intro.txt'), '가나다👨‍👩‍👧‍👦');

		const { result, report } = runTextBudgetJson(projectPath, [
			'intro.txt',
			'--exact',
			'4',
			'--unit',
			'grapheme',
		]);

		assert.equal(result.status, 0, result.stderr || result.stdout);
		assert.equal(report.command, 'script-pack');
		assert.equal(report.pack_id, 'core');
		assert.equal(report.script_id, 'text-budget');
		assert.equal(report.script_ref, 'core/text-budget');
		assert.equal(report.status, 'passed');
		assert.equal(report.ok, true);
		assert.equal(report.metrics[0].value, 4);
		assert.equal(report.metrics[0].unit, 'grapheme');
		assert.match(report.input_hash, /^sha256:[a-f0-9]{64}$/u);
	} finally {
		removeTempProject(projectPath);
	}
});

test('text-budget reports budget violations with a stable finding code', () => {
	const projectPath = createTempProject();

	try {
		initProject(projectPath);
		writeFileSync(path.join(projectPath, 'summary.txt'), 'too long');

		const { result, report } = runTextBudgetJson(projectPath, [
			'summary.txt',
			'--max',
			'3',
			'--unit',
			'grapheme',
		]);

		assert.equal(result.status, 1, result.stderr || result.stdout);
		assert.equal(report.status, 'failed');
		assert.equal(report.ok, false);
		assert.equal(report.findings[0].code, 'text_budget_above_max');
		assert.equal(report.findings[0].actual, 8);
		assert.equal(report.findings[0].expected, 3);
	} finally {
		removeTempProject(projectPath);
	}
});

test('text-budget checks JSON string fields by JSON pointer', () => {
	const projectPath = createTempProject();

	try {
		initProject(projectPath);
		writeFileSync(path.join(projectPath, 'package.json'), `${JSON.stringify({ description: '짧은 소개' }, null, 2)}\n`);

		const { result, report } = runTextBudgetJson(projectPath, [
			'package.json',
			'--json-pointer',
			'/description',
			'--max',
			'5',
			'--unit',
			'word',
		]);

		assert.equal(result.status, 0, result.stderr || result.stdout);
		assert.equal(report.policy.json_pointer, '/description');
		assert.equal(report.metrics[0].value, 2);
		assert.equal(report.metrics[0].path, 'package.json');
		assert.deepEqual(report.findings, []);
	} finally {
		removeTempProject(projectPath);
	}
});

test('text-budget reports stable error finding codes', () => {
	const projectPath = createTempProject();

	try {
		initProject(projectPath);
		writeFileSync(path.join(projectPath, 'bad-json.json'), '{');
		writeFileSync(path.join(projectPath, 'data.json'), `${JSON.stringify({ description: 'hello', count: 3 }, null, 2)}\n`);

		const cases = [
			{
				name: 'path traversal',
				args: ['../outside.txt', '--max', '10'],
				code: 'text_budget_unreadable',
				pointer: null,
			},
			{
				name: 'json parse failure',
				args: ['bad-json.json', '--json-pointer', '/description', '--max', '10'],
				code: 'text_budget_json_parse_failed',
				pointer: '/description',
			},
			{
				name: 'invalid json pointer',
				args: ['data.json', '--json-pointer', 'description', '--max', '10'],
				code: 'text_budget_json_pointer_invalid',
				pointer: 'description',
			},
			{
				name: 'missing json pointer',
				args: ['data.json', '--json-pointer', '/missing', '--max', '10'],
				code: 'text_budget_json_pointer_missing',
				pointer: '/missing',
			},
			{
				name: 'non-string json pointer target',
				args: ['data.json', '--json-pointer', '/count', '--max', '10'],
				code: 'text_budget_json_pointer_not_string',
				pointer: '/count',
			},
		];

		for (const testCase of cases) {
			const { result, report } = runTextBudgetJson(projectPath, testCase.args);

			assert.equal(result.status, 1, `${testCase.name}: ${result.stderr || result.stdout}`);
			assert.equal(report.status, 'error', testCase.name);
			assert.equal(report.ok, false, testCase.name);
			assert.equal(report.findings[0].code, testCase.code, testCase.name);
			assert.equal(report.findings[0].severity, 'high', testCase.name);
			assert.equal(report.findings[0].json_pointer, testCase.pointer, testCase.name);
			assert.equal(report.findings[0].metric, null, testCase.name);
			assert.equal(report.findings[0].actual, null, testCase.name);
			assert.equal(report.findings[0].expected, null, testCase.name);
			assert.match(report.input_hash, /^sha256:[a-f0-9]{64}$/u, testCase.name);
		}
	} finally {
		removeTempProject(projectPath);
	}
});

test('text-budget checks every public counting unit', () => {
	const projectPath = createTempProject();

	try {
		initProject(projectPath);
		writeFileSync(path.join(projectPath, 'units.txt'), 'a😊\n');

		const cases = [
			['code-point', 3],
			['utf16', 4],
			['utf8-byte', 6],
			['line', 2],
		];

		for (const [unit, expected] of cases) {
			const { result, report } = runTextBudgetJson(projectPath, [
				'units.txt',
				'--exact',
				String(expected),
				'--unit',
				unit,
			]);

			assert.equal(result.status, 0, `${unit}: ${result.stderr || result.stdout}`);
			assert.equal(report.status, 'passed', unit);
			assert.equal(report.metrics[0].unit, unit);
			assert.equal(report.metrics[0].value, expected);
		}
	} finally {
		removeTempProject(projectPath);
	}
});

test('text-budget rejects calls without a declared budget', () => {
	const projectPath = createTempProject();

	try {
		initProject(projectPath);
		mkdirSync(path.join(projectPath, 'docs'));
		writeFileSync(path.join(projectPath, 'docs', 'intro.md'), 'hello');

		const result = runCli(projectPath, ['script-pack', 'run', 'core/text-budget', 'check', 'docs/intro.md']);

		assert.equal(result.status, 1, result.stderr || result.stdout);
		assert.match(result.stderr, /Declare at least one text budget/u);
		assert.equal(result.stdout, '');
	} finally {
		removeTempProject(projectPath);
	}
});

test('generated-boundary passes ordinary editable files', () => {
	const projectPath = createTempProject();

	try {
		initProject(projectPath);
		const { result, report } = runGeneratedBoundaryJson(projectPath, ['AGENTS.md']);

		assert.equal(result.status, 0, result.stderr || result.stdout);
		assert.equal(report.command, 'script-pack');
		assert.equal(report.pack_id, 'repo');
		assert.equal(report.script_id, 'generated-boundary');
		assert.equal(report.script_ref, 'repo/generated-boundary');
		assert.equal(report.status, 'passed');
		assert.equal(report.ok, true);
		assert.equal(report.policy.config_loaded, true);
		assert.equal(report.targets[0].path, 'AGENTS.md');
		assert.deepEqual(report.targets[0].matched_boundaries, []);
		assert.match(report.input_hash, /^sha256:[a-f0-9]{64}$/u);
	} finally {
		removeTempProject(projectPath);
	}
});

test('generated-boundary reports generated manifest-lock paths', () => {
	const projectPath = createTempProject();

	try {
		initProject(projectPath);
		const { result, report } = runGeneratedBoundaryJson(projectPath, ['.mustflow/config/manifest.lock.toml']);

		assert.equal(result.status, 1, result.stderr || result.stdout);
		assert.equal(report.status, 'failed');
		assert.equal(report.ok, false);
		assert.equal(report.targets[0].path, '.mustflow/config/manifest.lock.toml');
		assert.ok(report.targets[0].matched_boundaries.includes('generated'));
		assert.ok(report.findings.some((finding) => finding.code === 'generated_boundary_generated_path'));
	} finally {
		removeTempProject(projectPath);
	}
});

test('generated-boundary reports vendor paths', () => {
	const projectPath = createTempProject();

	try {
		initProject(projectPath);
		mkdirSync(path.join(projectPath, 'node_modules'));
		writeFileSync(path.join(projectPath, 'node_modules', 'example.js'), 'module.exports = 1;\n');

		const { result, report } = runGeneratedBoundaryJson(projectPath, ['node_modules/example.js']);

		assert.equal(result.status, 1, result.stderr || result.stdout);
		assert.equal(report.status, 'failed');
		assert.equal(report.ok, false);
		assert.ok(report.targets[0].matched_boundaries.includes('vendor'));
		assert.ok(report.findings.some((finding) => finding.code === 'generated_boundary_vendor_path'));
	} finally {
		removeTempProject(projectPath);
	}
});

test('script-pack suggest ranks helpers from path, skill, and phase evidence', () => {
	const projectPath = createTempProject();

	try {
		initProject(projectPath);
		const { result, report } = runScriptPackSuggestJson(projectPath, [
			'--path',
			'.mustflow/config/manifest.lock.toml',
			'--skill',
			'template-install-surface-sync',
			'--phase',
			'before_change',
		]);

		assert.equal(result.status, 0, result.stderr || result.stdout);
		assert.equal(report.command, 'script-pack');
		assert.equal(report.action, 'suggest');
		assert.equal(report.status, 'suggested');
		assert.equal(report.ok, true);
		assert.deepEqual(report.input.phases, ['before_change']);
		assert.deepEqual(report.input.skills, ['template-install-surface-sync']);
		assert.equal(report.input.paths[0], '.mustflow/config/manifest.lock.toml');
		assert.ok(report.analyzed_paths[0].surfaces.includes('generated'));
		assert.ok(report.analyzed_paths[0].surfaces.includes('config'));

		const [first] = report.suggestions;
		assert.equal(first.script_ref, 'repo/generated-boundary');
		assert.equal(first.read_only, true);
		assert.equal(first.mutates, false);
		assert.equal(first.network, false);
		assert.ok(first.matched_phases.includes('before_change'));
		assert.ok(first.matched_skills.includes('template-install-surface-sync'));
		assert.ok(first.matched_surfaces.includes('generated'));
		assert.equal(first.report_schema_file, 'generated-boundary-report.schema.json');
		assert.match(first.run_hint, /repo\/generated-boundary/u);
	} finally {
		removeTempProject(projectPath);
	}
});

test('script-pack suggest can use current changed files without running scripts', () => {
	const projectPath = createTempProject();

	try {
		initProject(projectPath);
		commitGitBaseline(projectPath);
		writeFileSync(path.join(projectPath, 'README.md'), 'updated readme\n');
		const { result, report } = runScriptPackSuggestJson(projectPath, ['--changed', '--phase', 'after_change']);

		assert.equal(result.status, 0, result.stderr || result.stdout);
		assert.equal(report.input.changed, true);
		assert.ok(report.input.paths.includes('README.md'));
		assert.ok(report.analyzed_paths.some((entry) => entry.path === 'README.md' && entry.surfaces.includes('docs')));
		assert.ok(report.suggestions.some((suggestion) => suggestion.script_ref === 'core/text-budget'));
		assert.equal(report.issues.length, 0);
	} finally {
		removeTempProject(projectPath);
	}
});

test('script-pack suggest rejects missing and unknown selection inputs', () => {
	const projectPath = createTempProject();

	try {
		initProject(projectPath);
		const missing = runCli(projectPath, ['script-pack', 'suggest']);
		assert.equal(missing.status, 1, missing.stderr || missing.stdout);
		assert.match(missing.stderr, /Provide at least one suggestion input/u);

		const unknownPhase = runCli(projectPath, ['script-pack', 'suggest', '--phase', 'before']);
		assert.equal(unknownPhase.status, 1, unknownPhase.stderr || unknownPhase.stdout);
		assert.match(unknownPhase.stderr, /Unknown script-pack phase: before/u);
	} finally {
		removeTempProject(projectPath);
	}
});

test('generated-boundary treats outside-root paths as errors', () => {
	const projectPath = createTempProject();

	try {
		initProject(projectPath);
		const outsidePath = path.join(projectPath, '..', 'outside.txt');
		const { result, report } = runGeneratedBoundaryJson(projectPath, [outsidePath]);

		assert.equal(result.status, 1, result.stderr || result.stdout);
		assert.equal(report.status, 'error');
		assert.equal(report.ok, false);
		assert.equal(report.findings[0].code, 'generated_boundary_path_outside_root');
		assert.equal(report.findings[0].boundary, 'outside_root');
	} finally {
		removeTempProject(projectPath);
	}
});

test('script-pack run help does not treat --help as a script ref', () => {
	const projectPath = createTempProject();

	try {
		initProject(projectPath);
		const result = runCli(projectPath, ['script-pack', 'run', '--help']);

		assert.equal(result.status, 0, result.stderr || result.stdout);
		assert.match(result.stdout, /Usage: mf script-pack/);
		assert.match(result.stdout, /mf script-pack suggest --path src\/cli\/index\.ts --phase before_change/);
		assert.match(result.stdout, /mf script-pack run core\/text-budget --help/);
		assert.match(result.stdout, /mf script-pack run repo\/generated-boundary check src\/cli\/index\.ts --json/);
		assert.equal(result.stderr, '');
	} finally {
		removeTempProject(projectPath);
	}
});

test('text-budget is not exposed as a top-level command', () => {
	const projectPath = createTempProject();

	try {
		initProject(projectPath);
		const result = runCli(projectPath, ['text-budget', 'check', 'README.md', '--max', '100']);

		assert.equal(result.status, 1, result.stderr || result.stdout);
		assert.match(result.stderr, /Unknown command: text-budget/u);
	} finally {
		removeTempProject(projectPath);
	}
});
