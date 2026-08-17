import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';

import { listSuite } from './helpers/test-selection-contracts.js';
import { executableArtifactPlan, loadVerificationTargets } from '../../scripts/lib/verification-targets.mjs';
import {
	beginVerificationReceipt,
	finalizeVerificationReceipt,
} from '../../scripts/lib/verification-receipt.mjs';

const projectRoot = path.resolve(fileURLToPath(new URL('../..', import.meta.url)));

function selectRelated(changedFiles) {
	return listSuite('related', changedFiles);
}

test('every top-level scripts entrypoint is declared as a verification target', () => {
	const targets = loadVerificationTargets(projectRoot);
	const scripts = readdirSync(path.join(projectRoot, 'scripts'))
		.filter((name) => /\.(?:mjs|ts)$/u.test(name))
		.map((name) => `scripts/${name}`)
		.sort();

	assert.ok(scripts.length > 0, 'repo should have top-level scripts');
	for (const script of scripts) {
		assert.ok(targets.has(script), `${script} must be declared in .mustflow/config/verification-targets.toml`);
	}
});

test('executable artifact plan maps declared scripts and reports unmapped ones', () => {
	const targets = loadVerificationTargets(projectRoot);
	const plan = executableArtifactPlan(
		['scripts/guard-commit-message.mjs', 'scripts/guard-staged-scope.mjs', 'scripts/unknown-tool.mjs', 'tests/cli/foo.test.js', 'README.md'],
		targets,
	);

	assert.deepEqual(plan.unmapped, ['scripts/unknown-tool.mjs']);
	const guard = plan.artifacts.find((artifact) => artifact.artifact === 'scripts/guard-commit-message.mjs');
	assert.deepEqual(guard.witnesses, ['tests/cli/guard-commit-message.test.js']);
	const stagedScope = plan.artifacts.find((artifact) => artifact.artifact === 'scripts/guard-staged-scope.mjs');
	assert.deepEqual(stagedScope.witnesses, ['tests/cli/guard-staged-scope.test.js']);
	const testArtifact = plan.artifacts.find((artifact) => artifact.artifact === 'tests/cli/foo.test.js');
	assert.equal(testArtifact.kind, 'test');
	assert.deepEqual(testArtifact.witnesses, ['tests/cli/foo.test.js']);
});

test('related selection includes declared witnesses and reports unmapped artifacts', () => {
	const guardReport = selectRelated(['scripts/guard-commit-message.mjs']);
	assert.ok(guardReport.selected.includes('guard-commit-message.test.js'), 'guard change should select its witness');
	assert.deepEqual(guardReport.unmapped_executable_artifacts, []);

	const unmappedReport = selectRelated(['scripts/unknown-tool.mjs']);
	assert.deepEqual(unmappedReport.unmapped_executable_artifacts, ['scripts/unknown-tool.mjs']);
});

test('declared witnesses are selected for every declared executable artifact', () => {
	const targets = loadVerificationTargets(projectRoot);
	const requests = [...targets.keys()]
		.filter((artifact) => artifact.startsWith('scripts/'))
		.map((artifact) => ({ mode: 'related', changed_files: [artifact] }));

	const tempRoot = mkdtempSync(path.join(tmpdir(), 'verification-targets-batch-'));
	try {
		const requestPath = path.join(tempRoot, 'requests.json');
		writeFileSync(requestPath, `${JSON.stringify(requests)}\n`);
		const result = spawnSync(process.execPath, ['scripts/run-cli-tests.mjs', `--list-batch=${requestPath}`], {
			cwd: projectRoot,
			encoding: 'utf8',
		});
		assert.equal(result.status, 0, result.stderr || result.stdout);

		const reports = JSON.parse(result.stdout);
		assert.equal(reports.length, requests.length);

		for (const report of reports) {
			const target = targets.get(report.changed_files[0]);
			for (const witness of target.witnesses) {
				const witnessName = witness.replace(/^tests\/cli\//u, '');
				assert.ok(
					report.selected.includes(witnessName),
					`${report.changed_files[0]} should select declared witness ${witness}`,
				);
			}
		}
	} finally {
		rmSync(tempRoot, { recursive: true, force: true });
	}
});

test('verification receipt records hashes and detects stale artifacts', () => {
	const dir = mkdtempSync(path.join(tmpdir(), 'verification-receipt-'));
	try {
		mkdirSync(path.join(dir, 'scripts'), { recursive: true });
		writeFileSync(path.join(dir, 'scripts', 'guard-commit-message.mjs'), '// v1\n');
		const receiptPath = path.join(dir, '.mustflow', 'state', 'verification-receipt.json');
		const artifacts = [{ artifact: 'scripts/guard-commit-message.mjs', kind: 'executable', witnesses: [] }];

		beginVerificationReceipt({ repoRoot: dir, receiptPath, intent: 'test_related', mode: 'related', artifacts, witnesses: [] });

		let finalized = finalizeVerificationReceipt({ repoRoot: dir, receiptPath, exitCode: 0 });
		assert.deepEqual(finalized.stale, []);
		assert.equal(JSON.parse(readFileSync(receiptPath, 'utf8')).exit_code, 0);

		writeFileSync(path.join(dir, 'scripts', 'guard-commit-message.mjs'), '// v2\n');
		finalized = finalizeVerificationReceipt({ repoRoot: dir, receiptPath, exitCode: 0 });
		assert.deepEqual(finalized.stale, ['scripts/guard-commit-message.mjs']);
	} finally {
		rmSync(dir, { recursive: true, force: true });
	}
});
