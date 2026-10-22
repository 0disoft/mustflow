import assert from 'node:assert/strict';
import { test } from 'node:test';
import { commandLifecycleOutcome, createCommandLifecycleState, transitionCommandLifecycle, shouldReleaseRunResources } from '../../dist/cli/commands/run/lifecycle.js';

test('abort and timeout races preserve the existing winning error', () => {
	const interruption = Object.assign(new Error('interrupted'), { code: 'EINTERRUPTED' });
	const initial = Object.freeze(createCommandLifecycleState());
	const aborted = transitionCommandLifecycle(initial, { type: 'abort', error: interruption });
	assert.equal(initial.error, undefined);
	assert.strictEqual(transitionCommandLifecycle(aborted, { type: 'timeout' }), aborted);
	assert.strictEqual(commandLifecycleOutcome(aborted, 0, null).error, interruption);
	const timedOut = transitionCommandLifecycle(initial, { type: 'timeout' });
	const terminating = transitionCommandLifecycle(timedOut, { type: 'begin_termination' });
	assert.strictEqual(transitionCommandLifecycle(terminating, { type: 'abort', error: interruption }), terminating);
	assert.equal(commandLifecycleOutcome(terminating, 0, 'SIGTERM').error.code, 'ETIMEDOUT');
});

test('timeout still wins over a subsequent output error, and repeated settlement is ignored', () => {
	const outputError = new Error('output limit');
	let state = transitionCommandLifecycle(createCommandLifecycleState(), { type: 'timeout' });
	state = transitionCommandLifecycle(state, { type: 'output_limit', error: outputError });
	assert.strictEqual(state.error, outputError);
	assert.equal(commandLifecycleOutcome(state, 0, null).error.code, 'ETIMEDOUT');
	state = transitionCommandLifecycle(state, { type: 'settle' });
	assert.strictEqual(transitionCommandLifecycle(state, { type: 'settle' }), state);
	assert.strictEqual(transitionCommandLifecycle(state, { type: 'output_limit', error: new Error('later') }), state);
});

test('child closure does not itself authorize resource release', () => {
	const closed = transitionCommandLifecycle(createCommandLifecycleState(), { type: 'child_close', status: 0, signal: null });
	assert.equal(closed.childClosed, true);
	assert.equal(closed.settled, false);
	assert.equal(shouldReleaseRunResources({ confirmed: false }), false);
	assert.equal(shouldReleaseRunResources({ confirmed: true }), true);
	assert.equal(shouldReleaseRunResources(null), true);
});

test('parent interruptions preserve prior errors while spawn errors retain their original precedence', () => {
	const earlier = new Error('earlier');
	const later = new Error('later');
	let state = transitionCommandLifecycle(createCommandLifecycleState(), { type: 'child_error', error: earlier });
	state = transitionCommandLifecycle(state, { type: 'parent_signal', error: later });
	assert.strictEqual(state.error, earlier);
	state = transitionCommandLifecycle(state, { type: 'child_error', error: later });
	assert.strictEqual(commandLifecycleOutcome(state, null, null).error, later);
});
