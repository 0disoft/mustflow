import assert from 'node:assert/strict';
import {
	existsSync,
	mkdirSync,
	readdirSync,
	readFileSync,
	symlinkSync,
	writeFileSync,
} from 'node:fs';
import path from 'node:path';
import { test } from 'node:test';
import { pathToFileURL } from 'node:url';

import {
	createTempProject,
	projectRoot,
	removeTempProject,
} from './helpers/cli-harness.js';

async function importCore(moduleName) {
	return import(pathToFileURL(path.join(projectRoot, 'dist', 'core', `${moduleName}.js`)).href);
}

function createWriteDriftReceipt() {
	return {
		status: 'checked',
		coverage_complete: true,
		declared_paths: [],
		observed_paths: [],
		declared_observed_paths: [],
		undeclared_paths: [],
		observed_count: 0,
		undeclared_count: 0,
		has_undeclared_changes: false,
		truncated: false,
		reason: null,
	};
}

function createReceipt(createRunReceipt, projectPath, input) {
	const finishedAt = new Date(input.finishedAt);
	return createRunReceipt({
		correlationId: input.id,
		intent: input.intent ?? 'state_fixture',
		status: 'passed',
		timedOut: false,
		startedAt: new Date(finishedAt.getTime() - 25),
		finishedAt,
		projectRoot: projectPath,
		cwd: projectPath,
		lifecycle: 'oneshot',
		runPolicy: 'agent_allowed',
		mode: 'argv',
		argv: [process.execPath, '-e', ''],
		envPolicy: 'minimal',
		envAllowlist: [],
		timeoutSeconds: 10,
		killAfterSeconds: 1,
		maxOutputBytes: 1_024,
		successExitCodes: [0],
		exitCode: 0,
		signal: null,
		error: null,
		killMethod: null,
		stdout: '',
		stderr: '',
		writeDrift: createWriteDriftReceipt(),
		receiptPath: `.mustflow/state/runs/run-${input.id}/receipt.json`,
	});
}

function retentionPolicy() {
	return {
		store: 'repo_local_ignored',
		maxFileKb: 128,
		maxItems: 50,
		maxTotalMb: 10,
		stdoutTailBytes: 64 * 1_024,
		stderrTailBytes: 64 * 1_024,
	};
}

test('retention rejects a linked runs root before deleting external run directories', async (t) => {
	const sandbox = createTempProject('mustflow-retention-containment-');
	const projectPath = path.join(sandbox, 'repo');
	const externalPath = path.join(sandbox, 'external');
	const { updateRunReceiptState } = await importCore('run-receipt-state');
	try {
		mkdirSync(path.join(projectPath, '.mustflow', 'state'), { recursive: true });
		const names = ['run-20260101', 'run-20260102', 'run-20260103'];
		for (const name of names) {
			mkdirSync(path.join(externalPath, name), { recursive: true });
			writeFileSync(path.join(externalPath, name, 'sentinel.txt'), 'external fixture data');
		}
		symlinkSync(externalPath, path.join(projectPath, '.mustflow', 'state', 'runs'), 'junction');
		let failure;
		try {
			updateRunReceiptState(projectPath, { ...retentionPolicy(), maxItems: 1 });
		} catch (error) {
			failure = error;
		}
		const remaining = readdirSync(externalPath).sort();
		t.diagnostic(JSON.stringify({ externalDirectoriesBefore: names.length,
			externalDirectoriesAfter: remaining.length, deleted: names.length - remaining.length }));
		assert.deepEqual(remaining, names);
		for (const name of names) {
			assert.equal(readFileSync(path.join(externalPath, name, 'sentinel.txt'), 'utf8'), 'external fixture data');
		}
		assert.match(failure?.message ?? '', /must not contain symlinks/u);
	} finally {
		removeTempProject(sandbox);
	}
});

test('retention removes ordinary old runs while leaving linked run entries and their targets intact', async () => {
	const sandbox = createTempProject('mustflow-retention-entries-');
	const projectPath = path.join(sandbox, 'repo');
	const externalPath = path.join(sandbox, 'external');
	const runsPath = path.join(projectPath, '.mustflow', 'state', 'runs');
	const { updateRunReceiptState } = await importCore('run-receipt-state');
	try {
		mkdirSync(externalPath, { recursive: true });
		writeFileSync(path.join(externalPath, 'sentinel.txt'), 'external fixture data');
		for (const name of ['run-20260101', 'run-20260102']) {
			mkdirSync(path.join(runsPath, name), { recursive: true });
		}
		symlinkSync(externalPath, path.join(runsPath, 'run-linked'), 'junction');
		assert.equal(updateRunReceiptState(projectPath, { ...retentionPolicy(), maxItems: 1 }), true);
		assert.equal(existsSync(path.join(runsPath, 'run-20260101')), false);
		assert.equal(existsSync(path.join(runsPath, 'run-20260102')), true);
		assert.equal(existsSync(path.join(runsPath, 'run-linked')), true);
		assert.equal(readFileSync(path.join(externalPath, 'sentinel.txt'), 'utf8'), 'external fixture data');
	} finally {
		removeTempProject(sandbox);
	}
});

test('retention can initialize an index when the runs directory does not exist', async () => {
	const projectPath = createTempProject('mustflow-retention-empty-');
	const { updateRunReceiptState } = await importCore('run-receipt-state');
	try {
		assert.equal(updateRunReceiptState(projectPath, retentionPolicy()), true);
		const index = JSON.parse(readFileSync(path.join(projectPath, '.mustflow', 'state', 'runs', 'latest.index.json'), 'utf8'));
		assert.deepEqual(index.entries, []);
	} finally {
		removeTempProject(projectPath);
	}
});

test('run receipt publication preserves immutable records and prevents latest regression', async () => {
	const projectPath = createTempProject('mustflow-run-publication-');
	const { createRunReceipt, writeRunReceipt } = await importCore('run-receipt');
	const { latestRunReceiptPointerPath } = await importCore('run-receipt-publication');

	try {
		const newer = createReceipt(createRunReceipt, projectPath, {
			id: 'newer',
			finishedAt: '2026-08-19T02:00:00.000Z',
		});
		const older = createReceipt(createRunReceipt, projectPath, {
			id: 'older',
			finishedAt: '2026-08-19T01:00:00.000Z',
		});

		writeRunReceipt(projectPath, newer);
		const newerPath = path.join(projectPath, ...newer.receipt_path.split('/'));
		const immutableBefore = readFileSync(newerPath, 'utf8');
		assert.throws(
			() => writeRunReceipt(projectPath, { ...newer, correlation_id: 'conflicting-rewrite' }),
			/run_receipt_immutable_conflict/u,
		);

		writeRunReceipt(projectPath, older);

		const latest = JSON.parse(
			readFileSync(path.join(projectPath, '.mustflow', 'state', 'runs', 'latest.json'), 'utf8'),
		);
		const pointer = JSON.parse(readFileSync(latestRunReceiptPointerPath(projectPath), 'utf8'));

		assert.equal(latest.correlation_id, newer.correlation_id);
		assert.equal(pointer.kind, 'run_receipt_pointer');
		assert.equal(pointer.receipt_path, newer.receipt_path);
		assert.equal(readFileSync(newerPath, 'utf8'), immutableBefore);
		assert.equal(
			JSON.parse(readFileSync(path.join(projectPath, ...older.receipt_path.split('/')), 'utf8')).correlation_id,
			older.correlation_id,
		);
	} finally {
		removeTempProject(projectPath);
	}
});

test('run receipt publication does not wait for derived-state compaction', async () => {
	const projectPath = createTempProject('mustflow-run-compaction-');
	const { createRunReceipt, writeRunReceipt } = await importCore('run-receipt');
	const { updateRunReceiptState } = await importCore('run-receipt-state');
	const { RUN_STATE_MUTEX_SCOPES, withRunStateUpdateMutex } = await importCore('run-state-mutex');
	const receipt = createReceipt(createRunReceipt, projectPath, {
		id: 'nonblocking',
		finishedAt: '2026-08-19T03:00:00.000Z',
	});
	const latestPath = path.join(projectPath, '.mustflow', 'state', 'runs', 'latest.json');
	const indexPath = path.join(projectPath, '.mustflow', 'state', 'runs', 'latest.index.json');

	try {
		withRunStateUpdateMutex(projectPath, RUN_STATE_MUTEX_SCOPES.compaction, () => {
			writeRunReceipt(projectPath, receipt, retentionPolicy());
			assert.equal(existsSync(latestPath), true);
			assert.equal(existsSync(indexPath), false);
		});

		assert.equal(updateRunReceiptState(projectPath, retentionPolicy()), true);
		assert.equal(existsSync(indexPath), true);
	} finally {
		removeTempProject(projectPath);
	}
});

test('performance history appends immutable records before opportunistic compaction', async () => {
	const projectPath = createTempProject('mustflow-performance-records-');
	const { createRunReceipt } = await importCore('run-receipt');
	const {
		compactRunPerformanceHistory,
		recordRunPerformanceHistory,
	} = await importCore('run-performance-history');
	const { RUN_STATE_MUTEX_SCOPES, withRunStateUpdateMutex } = await importCore('run-state-mutex');
	const first = createReceipt(createRunReceipt, projectPath, {
		id: 'perf-first',
		intent: 'perf_fixture',
		finishedAt: '2026-08-19T04:00:00.000Z',
	});
	const second = createReceipt(createRunReceipt, projectPath, {
		id: 'perf-second',
		intent: 'perf_fixture',
		finishedAt: '2026-08-19T04:00:01.000Z',
	});
	const historyDir = path.join(projectPath, '.mustflow', 'state', 'perf');
	const recordsDir = path.join(historyDir, 'records');
	const samplesPath = path.join(historyDir, 'samples.json');
	const summaryPath = path.join(historyDir, 'summary.json');

	try {
		withRunStateUpdateMutex(projectPath, RUN_STATE_MUTEX_SCOPES.compaction, () => {
			recordRunPerformanceHistory(projectPath, first);
			recordRunPerformanceHistory(projectPath, second);

			assert.equal(readdirSync(recordsDir).filter((name) => name.endsWith('.json')).length, 2);
			assert.equal(existsSync(samplesPath), false);
			assert.equal(existsSync(summaryPath), false);
		});

		assert.equal(compactRunPerformanceHistory(projectPath), true);
		const samples = JSON.parse(readFileSync(samplesPath, 'utf8'));
		const summary = JSON.parse(readFileSync(summaryPath, 'utf8'));

		assert.equal(samples.samples.length, 2);
		assert.equal(samples.record_ids.length, 2);
		assert.equal(new Set(samples.record_ids).size, 2);
		assert.equal(samples.generation, summary.generation);
		assert.equal(
			summary.intents.perf_fixture.fingerprints[first.performance.intent_fingerprint].sample_count,
			2,
		);
		assert.deepEqual(readdirSync(recordsDir).filter((name) => name.endsWith('.json')), []);
	} finally {
		removeTempProject(projectPath);
	}
});
