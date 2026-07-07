import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

const projectRoot = path.resolve(fileURLToPath(new URL('../..', import.meta.url)));

function runNode(args, options = {}) {
	return spawnSync(process.execPath, args, {
		cwd: projectRoot,
		encoding: 'utf8',
		...options,
		env: {
			...process.env,
			...(options.env ?? {}),
		},
	});
}

test('ops profiler writes test file attribution and sanitized operation details', () => {
	const tempRoot = mkdtempSync(path.join(tmpdir(), 'mustflow-ops-profiler-'));
	const profilePath = path.join(tempRoot, 'ops.jsonl');

	try {
		const result = runNode(
			[
				'--input-type=module',
				'--eval',
				[
					"import { profileOperation } from './tests/cli/helpers/ops-profiler.js';",
					"process.argv.push('tests/cli/example.test.js');",
					"profileOperation('cli_spawn', { args: ['check', 42], nested: { value: true }, long: 'x'.repeat(520) }, () => 123);",
				].join('\n'),
			],
			{
				env: {
					MUSTFLOW_TEST_PROFILE_OPS: profilePath,
					MUSTFLOW_TEST_PROFILE_RUN_ID: 'unit-run',
				},
			},
		);

		assert.equal(result.status, 0, result.stderr || result.stdout);
		const records = readFileSync(profilePath, 'utf8').trim().split(/\r?\n/u).map((line) => JSON.parse(line));

		assert.equal(records.length, 1);
		assert.equal(records[0].schema_version, 2);
		assert.equal(records[0].run_id, 'unit-run');
		assert.equal(records[0].test_file, 'tests/cli/example.test.js');
		assert.equal(records[0].operation, 'cli_spawn');
		assert.equal(records[0].status, 'passed');
		assert.deepEqual(records[0].details.args, ['check', '42']);
		assert.equal(records[0].details.nested, '[object Object]');
		assert.equal(records[0].details.long.length, 503);
		assert.equal(records[0].details.long.endsWith('...'), true);
	} finally {
		rmSync(tempRoot, { recursive: true, force: true });
	}
});

test('ops analyzer groups operations by test file and operation', () => {
	const tempRoot = mkdtempSync(path.join(tmpdir(), 'mustflow-ops-analyzer-'));
	const profilePath = path.join(tempRoot, 'ops.jsonl');

	try {
		writeFileSync(
			profilePath,
			[
				{ test_file: 'tests/cli/slow.test.js', operation: 'cli_spawn', status: 'passed', duration_ms: 100 },
				{ test_file: 'tests/cli/slow.test.js', operation: 'fixture_copy', status: 'failed', duration_ms: 50 },
				{ test_file: 'tests/cli/fast.test.js', operation: 'cli_spawn', status: 'passed', duration_ms: 20 },
				{ operation: 'fixture_rm', status: 'passed', duration_ms: 5 },
			]
				.map((record) => JSON.stringify(record))
				.join('\n') + '\n',
		);

		const result = runNode(['scripts/analyze-test-ops.mjs', profilePath, '--json']);

		assert.equal(result.status, 0, result.stderr || result.stdout);
		const report = JSON.parse(result.stdout);

		assert.equal(report.record_count, 4);
		assert.equal(report.tests[0].test_file, 'tests/cli/slow.test.js');
		assert.equal(report.tests[0].total_ms, 150);
		assert.equal(report.tests[0].count, 2);
		assert.equal(report.tests[0].failed, 1);
		assert.equal(report.tests[1].test_file, 'tests/cli/fast.test.js');
		assert.equal(report.tests[2].test_file, 'unknown');
		assert.deepEqual(
			report.operations.slice(0, 2).map((row) => [row.test_file, row.operation, row.total_ms]),
			[
				['tests/cli/slow.test.js', 'cli_spawn', 100],
				['tests/cli/slow.test.js', 'fixture_copy', 50],
			],
		);
	} finally {
		rmSync(tempRoot, { recursive: true, force: true });
	}
});

test('related selection audit script reports per-file fallback causes', () => {
	const result = runNode(['scripts/audit-related-selection.mjs', '--changed-files=scripts/run-cli-tests.mjs,src/core/new-cross-cutting-module.ts', '--json']);

	assert.equal(result.status, 0, result.stderr || result.stdout);
	const report = JSON.parse(result.stdout);
	const allRow = report.rows.find((row) => row.label === '__all__');
	const sourceRow = report.rows.find((row) => row.label === 'src/core/new-cross-cutting-module.ts');
	const scriptRow = report.rows.find((row) => row.label === 'scripts/run-cli-tests.mjs');

	assert.deepEqual(report.changed_files, ['scripts/run-cli-tests.mjs', 'src/core/new-cross-cutting-module.ts']);
	assert.equal(allRow.full_fallback_count, 1);
	assert.deepEqual(allRow.full_fallback_categories, ['unmapped_core_source']);
	assert.equal(sourceRow.full_fallback_count, 1);
	assert.equal(sourceRow.reasons[0].reason, 'fallback_full_tests');
	assert.equal(sourceRow.reasons[0].category, 'unmapped_core_source');
	assert.equal(scriptRow.full_fallback_count, 0);
	assert.equal(scriptRow.related_rule_count, 1);
});
