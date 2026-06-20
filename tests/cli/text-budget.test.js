import assert from 'node:assert/strict';
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { test } from 'node:test';

import { createTempProject, initProject, removeTempProject, runCli } from './run-support.js';

function runTextBudgetJson(projectPath, args) {
	const result = runCli(projectPath, ['script-pack', 'run', 'core/text-budget', 'check', ...args, '--json']);
	return { result, report: JSON.parse(result.stdout) };
}

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

test('script-pack run help does not treat --help as a script ref', () => {
	const projectPath = createTempProject();

	try {
		initProject(projectPath);
		const result = runCli(projectPath, ['script-pack', 'run', '--help']);

		assert.equal(result.status, 0, result.stderr || result.stdout);
		assert.match(result.stdout, /Usage: mf script-pack/);
		assert.match(result.stdout, /mf script-pack run core\/text-budget --help/);
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
