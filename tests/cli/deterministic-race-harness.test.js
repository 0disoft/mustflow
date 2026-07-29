import assert from 'node:assert/strict';
import test from 'node:test';

import { runDeterministicRaceScenario } from '../../dist/core/deterministic-race-harness.js';

function scenario(actors, schedule, overrides = {}) {
	return { schema_version: '1', kind: 'deterministic_race_scenario', reuse_addresses: true, fail_at: null, actors, schedule, ...overrides };
}

test('replays the exact schedule deterministically', () => {
	const input = scenario([
		{ id: 'owner', operations: [{ id: 'a', action: 'allocate', resource: 'slot' }, { id: 'f', action: 'free', resource: 'slot' }] },
	], [{ actor: 'owner', operation: 'a' }, { actor: 'owner', operation: 'f' }]);
	assert.deepEqual(runDeterministicRaceScenario(input), runDeterministicRaceScenario(input));
	assert.equal(runDeterministicRaceScenario(input).status, 'passed');
});

test('detects free while acquired and later use-after-free', () => {
	const input = scenario([
		{ id: 'owner', operations: [{ id: 'a', action: 'allocate', resource: 'slot' }, { id: 'f', action: 'free', resource: 'slot' }] },
		{ id: 'reader', operations: [{ id: 'q', action: 'acquire', resource: 'slot' }, { id: 'r', action: 'read', resource: 'slot' }] },
	], [
		{ actor: 'owner', operation: 'a' }, { actor: 'reader', operation: 'q' },
		{ actor: 'owner', operation: 'f' }, { actor: 'reader', operation: 'r' },
	]);
	const report = runDeterministicRaceScenario(input);
	assert.equal(report.status, 'failed');
	assert.ok(report.findings.some((finding) => finding.code === 'free_while_acquired'));
	assert.ok(report.findings.some((finding) => finding.code === 'use_after_free'));
});

test('detects stale generation after deterministic address reuse', () => {
	const input = scenario([
		{ id: 'owner', operations: [
			{ id: 'a1', action: 'allocate', resource: 'slot' }, { id: 'f', action: 'free', resource: 'slot' }, { id: 'a2', action: 'allocate', resource: 'slot' },
		] },
		{ id: 'reader', operations: [{ id: 'r', action: 'read', resource: 'slot', generation: 1 }] },
	], [
		{ actor: 'owner', operation: 'a1' }, { actor: 'owner', operation: 'f' },
		{ actor: 'owner', operation: 'a2' }, { actor: 'reader', operation: 'r' },
	]);
	const report = runDeterministicRaceScenario(input);
	assert.ok(report.findings.some((finding) => finding.code === 'stale_generation_access'));
	assert.equal(report.trace.at(-1).generation, 2);
});

test('injects a failure at one exact ordinal and rejects incomplete schedules', () => {
	const input = scenario([{ id: 'a', operations: [{ id: 'one', action: 'checkpoint', resource: 'x' }, { id: 'two', action: 'checkpoint', resource: 'x' }] }], [{ actor: 'a', operation: 'one' }], { fail_at: 0 });
	const report = runDeterministicRaceScenario(input);
	assert.equal(report.trace[0].outcome, 'injected_failure');
	assert.ok(report.findings.some((finding) => finding.code === 'unscheduled_operation'));
});

test('rejects malformed scenarios without executing operations', () => {
	const report = runDeterministicRaceScenario({ kind: 'wrong' });
	assert.equal(report.status, 'rejected');
	assert.equal(report.executed_operations, 0);
});

test('rejects unknown fields and out-of-range failure ordinals', () => {
	const base = scenario([{ id: 'a', operations: [{ id: 'one', action: 'checkpoint', resource: 'x' }] }], [{ actor: 'a', operation: 'one' }]);
	assert.equal(runDeterministicRaceScenario({ ...base, surprise: true }).status, 'rejected');
	assert.equal(runDeterministicRaceScenario({ ...base, fail_at: 1 }).status, 'rejected');
});
