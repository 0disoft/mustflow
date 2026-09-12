import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, unlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { test } from 'node:test';
import { runCheckStage, runAsyncCheckStage } from '../../dist/cli/lib/check-progress.js';
import { runCliInProcess } from './helpers/cli-harness.js';

test('check progress preserves stage results and failures in execution order', async () => {
	const events = [];
	const observe = event => events.push(event);
	assert.equal(runCheckStage('sync', observe, () => 42), 42);
	assert.equal(await runAsyncCheckStage('async', observe, async () => {
		assert.equal(events.at(-1).state, 'started');
		return 7;
	}), 7);
	const failure = new Error('original failure');
	assert.throws(() => runCheckStage('error', observe, () => { throw failure; }), error => error === failure);
	await assert.rejects(runAsyncCheckStage('async_error', observe, async () => { throw failure; }), error => error === failure);
	assert.deepEqual(events.map(({ phase, state }) => [phase, state]), [
		['sync', 'started'], ['sync', 'completed'], ['async', 'started'], ['async', 'completed'],
		['error', 'started'], ['error', 'failed'], ['async_error', 'started'], ['async_error', 'failed'],
	]);
	assert.ok(events.every(event => Number.isInteger(event.elapsed_ms) && event.elapsed_ms >= 0));
	assert.equal(runCheckStage('silent', undefined, () => 9), 9);
});

test('check progress goes to stderr while JSON results and failure status remain usable', async () => {
	const root = mkdtempSync(path.join(tmpdir(), 'mustflow-check-progress-'));
	try {
		assert.equal((await runCliInProcess(root, ['init', '--yes'])).status, 0);
		const baseline = await runCliInProcess(root, ['check', '--strict', '--json']);
		const progress = await runCliInProcess(root, ['check', '--strict', '--json', '--progress']);
		assert.equal(progress.status, baseline.status);
		assert.deepEqual(JSON.parse(progress.stdout), JSON.parse(baseline.stdout));
		assert.doesNotMatch(baseline.stderr, /\[check\]/u);
		assert.match(progress.stderr, /strict_skill_route_fixtures: started \(0 ms\)/u);
		assert.match(progress.stderr, /strict_skill_route_fixtures: completed \(\d+ ms\)/u);
		assert.match(progress.stderr, /generated_source_anchor_index: completed/u);
		unlinkSync(path.join(root, 'AGENTS.md'));
		const failed = await runCliInProcess(root, ['check', '--json', '--progress']);
		assert.equal(failed.status, 1);
		assert.equal(JSON.parse(failed.stdout).ok, false);
		assert.match(failed.stderr, /required_files: completed/u);
	} finally {
		rmSync(root, { recursive: true, force: true });
	}
});
