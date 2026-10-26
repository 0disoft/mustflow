import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { test } from 'node:test';
import { parsePathScope, pathScopeContainsPath } from '../../dist/core/path-scope.js';
import { finishRunWriteTracking, finishRunWriteBatchTracking } from '../../dist/core/run-write-drift.js';
import { createTempProject, removeTempProject } from './helpers/cli-harness.js';

function deletedPathsTracker(root, paths, declaredPaths = []) {
	// An empty repository after a snapshot containing these paths represents file deletions.
	const git = spawnSync('git', ['-C', root, 'init', '--quiet'], { encoding: 'utf8', windowsHide: true });
	assert.equal(git.status, 0, git.stderr);
	return { projectRoot: root, env: process.env, declaredPaths,
		before: { status: 'checked', entries: new Map(paths.map(file => [file, 'before'])),
			reason: null, source: 'git_status', metrics: {} } };
}

test('write drift normalizes each declaration and changed path only once', t => {
	const root = createTempProject('mustflow-write-drift-index-');
	const originalReplaceAll = String.prototype.replaceAll;
	try {
		const declared = Array.from({ length: 200 }, (_, index) => `probe/declared-${index}/**`);
		const changed = Array.from({ length: 1_000 }, (_, index) => `probe/changed-${index}.txt`);
		const tracker = deletedPathsTracker(root, changed, declared);
		let normalizations = 0;
		String.prototype.replaceAll = function (search, replacement) {
			if (search === '\\' && String(this).startsWith('probe/')) normalizations += 1;
			return originalReplaceAll.call(this, search, replacement);
		};
		const receipt = finishRunWriteTracking(tracker);
		assert.equal(receipt.status, 'checked');
		assert.equal(receipt.observed_count, changed.length);
		assert.equal(receipt.undeclared_count, changed.length);
		assert.equal(receipt.declared_observed_paths.length, 0);
		assert.equal(receipt.undeclared_paths.length, 200);
		assert.equal(receipt.truncated, true);
		t.diagnostic(JSON.stringify({ declarations: declared.length, changedPaths: changed.length, normalizations }));
		assert.ok(normalizations <= declared.length + changed.length, `repeated path normalization: ${normalizations}`);
	} finally {
		String.prototype.replaceAll = originalReplaceAll;
		removeTempProject(root);
	}
});

test('write drift preserves literal, subtree, sibling and platform case matching', () => {
	const root = createTempProject('mustflow-write-drift-matching-');
	try {
		const declared = ['probe/out/**', 'probe/out/nested/**', 'probe/exact.txt', 'probe/literal'];
		const changed = ['probe/out', 'probe/out/nested/file.txt', 'probe/outside/file.txt',
			'probe/exact.txt', 'probe/exact.txt/child', 'probe/literal', 'probe/literal/child',
			'probe/OUT/upper.txt', 'probe/out/한글.txt'];
		const tracker = deletedPathsTracker(root, changed, declared);
		const expected = changed.filter(file => declared.some(scope => pathScopeContainsPath(parsePathScope(scope), file)))
			.sort((left, right) => left.localeCompare(right));
		const receipt = finishRunWriteTracking(tracker);
		assert.deepEqual(receipt.declared_observed_paths, expected);
		assert.equal(receipt.undeclared_count, changed.length - expected.length);
		assert.equal(receipt.coverage_complete, true);
		assert.equal(finishRunWriteTracking({ ...tracker, declaredPaths: [] }).undeclared_count, changed.length);
	} finally { removeTempProject(root); }
});

test('batch write drift preserves unique and overlapping declared ownership', () => {
	const root = createTempProject('mustflow-write-drift-batch-');
	try {
		const changed = ['probe/a/file', 'probe/shared/file', 'probe/witness.txt', 'probe/unknown.txt'];
		const tracker = deletedPathsTracker(root, changed);
		const receipts = finishRunWriteBatchTracking(tracker, [
			{ intentName: 'a', declaredPaths: ['probe/a/**', 'probe/shared/**'], observedPaths: [] },
			{ intentName: 'b', declaredPaths: ['probe/shared/**'], observedPaths: ['probe/witness.txt'] },
		]);
		assert.deepEqual(receipts.get('a').declared_observed_paths, ['probe/a/file']);
		assert.deepEqual(receipts.get('b').undeclared_paths, ['probe/witness.txt']);
		for (const receipt of receipts.values()) {
			assert.deepEqual(receipt.ambiguous_paths, ['probe/shared/file', 'probe/unknown.txt']);
			assert.equal(receipt.has_undeclared_changes, true);
		}
	} finally { removeTempProject(root); }
});

test('batch witness lookup normalizes recorded paths once instead of rescanning each file', t => {
	const root = createTempProject('mustflow-write-witness-index-');
	const originalSplit = String.prototype.split;
	try {
		const changed = Array.from({ length: 1_000 }, (_, index) => `unclaimed/file-${index}.txt`);
		const intents = ['a', 'b'].map(intentName => ({ intentName, declaredPaths: [],
			observedPaths: Array.from({ length: 200 }, (_, index) => `witness/${intentName}-${index}.txt`) }));
		const tracker = deletedPathsTracker(root, changed);
		let witnessNormalizations = 0;
		String.prototype.split = function (separator, ...args) {
			if (separator === path.sep && String(this).startsWith('witness/')) witnessNormalizations += 1;
			return originalSplit.call(this, separator, ...args);
		};
		const receipts = finishRunWriteBatchTracking(tracker, intents);
		for (const receipt of receipts.values()) {
			assert.equal(receipt.coverage_complete, true);
			assert.equal(receipt.ambiguous_count, changed.length);
			assert.equal(receipt.undeclared_count, 0);
			assert.equal(receipt.has_undeclared_changes, true);
		}
		t.diagnostic(JSON.stringify({ changedPaths: changed.length, intents: intents.length,
			witnessesPerIntent: 200, witnessNormalizations }));
		assert.ok(witnessNormalizations <= 400, `repeated witness normalization: ${witnessNormalizations}`);
	} finally {
		String.prototype.split = originalSplit;
		removeTempProject(root);
	}
});

test('batch witnesses preserve normalized aliases, duplicate records and ambiguous attribution', () => {
	const root = createTempProject('mustflow-write-witness-aliases-');
	try {
		const changed = ['probe/owner.txt', 'probe/shared.txt', 'probe/unclaimed.txt'];
		const tracker = deletedPathsTracker(root, changed);
		const owner = process.platform === 'win32' ? './PROBE/owner.txt' : './probe/owner.txt';
		const receipts = finishRunWriteBatchTracking(tracker, [
			{ intentName: 'a', declaredPaths: [], observedPaths: [owner, owner, './probe/shared.txt'] },
			{ intentName: 'b', declaredPaths: [], observedPaths: ['probe/shared.txt', 'probe/shared.txt'] },
		]);
		assert.deepEqual(receipts.get('a').undeclared_paths, ['probe/owner.txt']);
		assert.deepEqual(receipts.get('b').undeclared_paths, []);
		for (const receipt of receipts.values()) {
			assert.deepEqual(receipt.ambiguous_paths, ['probe/shared.txt', 'probe/unclaimed.txt']);
			assert.equal(receipt.ambiguous_count, 2);
		}
	} finally { removeTempProject(root); }
});
