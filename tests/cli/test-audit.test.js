import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const projectRoot = path.resolve(fileURLToPath(new URL('../..', import.meta.url)));

function runAudit() {
	return spawnSync(process.execPath, ['scripts/audit-tests.mjs', '--json'], {
		cwd: projectRoot,
		encoding: 'utf8',
	});
}

test('test audit reports review-only god file candidates without failing the audit', () => {
	const result = runAudit();
	const report = JSON.parse(result.stdout);
	const issue = report.issues.find((candidate) => candidate.code === 'test_god_file_candidate');
	const checkSummary = report.files.find((candidate) => candidate.path === 'tests/cli/check.test.js');

	assert.equal(result.status, 0, result.stderr || result.stdout);
	assert.equal(report.ok, true);
	assert.ok(issue, 'expected at least one god file review candidate');
	assert.equal(issue.severity, 'warning');
	assert.equal(issue.path, 'tests/cli/check.test.js');
	assert.ok(issue.score >= 50);
	assert.ok(issue.signals.bytes >= 64 * 1024);
	assert.ok(issue.signals.test_count >= 40);
	assert.ok(issue.signals.domain_cluster_count >= 4);
	assert.ok(issue.signals.source_surface_count >= 5);
	assert.ok(checkSummary.domain_clusters.includes('skill_contracts'));
	assert.ok(checkSummary.source_surfaces.includes('mustflow'));
});

test('test audit includes mock and behavior assertion signals for every test file', () => {
	const result = runAudit();
	const report = JSON.parse(result.stdout);

	assert.equal(result.status, 0, result.stderr || result.stdout);

	for (const file of report.files) {
		assert.equal(Number.isInteger(file.mock_factory_count), true);
		assert.equal(Number.isInteger(file.mock_interaction_assertion_count), true);
		assert.equal(Number.isInteger(file.behavior_assertion_count), true);
		assert.ok(file.behavior_assertion_count >= 0);
	}
});
