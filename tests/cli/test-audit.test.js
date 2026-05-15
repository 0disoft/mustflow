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

test('test audit accepts the split check suite without stale god-file expectations', () => {
	const result = runAudit();
	const report = JSON.parse(result.stdout);
	const checkSummary = report.files.find((candidate) => candidate.path === 'tests/cli/check.test.js');
	const staleCheckIssue = report.issues.find(
		(candidate) => candidate.code === 'test_god_file_candidate' && candidate.path === 'tests/cli/check.test.js',
	);

	assert.equal(result.status, 0, result.stderr || result.stdout);
	assert.equal(report.ok, true);
	assert.equal(staleCheckIssue, undefined);
	assert.ok(checkSummary, 'expected check.test.js to be summarized');
	assert.ok(checkSummary.bytes < 64 * 1024);
	assert.ok(checkSummary.test_count < 40);
	assert.ok(checkSummary.domain_clusters.includes('command_contract'));
	const skillContractSummary = report.files.find((candidate) => candidate.path === 'tests/cli/check-skill-contracts.test.js');
	assert.ok(skillContractSummary.domain_clusters.includes('skill_contracts'));
	assert.ok(report.files.some((candidate) => candidate.path === 'tests/cli/check-command-contracts.test.js'));
	assert.ok(report.files.some((candidate) => candidate.path === 'tests/cli/check-versioning.test.js'));
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
