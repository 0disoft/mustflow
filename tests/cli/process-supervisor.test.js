import assert from 'node:assert/strict';
import path from 'node:path';
import { test } from 'node:test';
import { pathToFileURL } from 'node:url';

import { projectRoot } from './helpers/cli-harness.js';

async function importProcessSupervisor() {
	return import(pathToFileURL(path.join(projectRoot, 'dist', 'core', 'process-supervisor.js')).href);
}

function createFixture(inspections) {
	const calls = [];
	let clock = 0;
	return {
		calls,
		now: () => `2026-08-08T00:00:0${clock++}.000Z`,
		backend: {
			method: 'fixture_tree',
			gracefulSignal: 'SIGTERM',
			forcedSignal: 'SIGKILL',
			requestGracefulTermination: (pid) => calls.push(['graceful', pid]),
			requestForceTermination: (pid) => calls.push(['force', pid]),
			inspectProcessTree: () => inspections.shift() ?? 'unknown',
		},
	};
}

test('process supervisor preserves the graceful force confirmed state sequence', async () => {
	const { ProcessSupervisor } = await importProcessSupervisor();
	const fixture = createFixture(['alive', 'gone']);
	const supervisor = new ProcessSupervisor(123, fixture.backend, fixture.now);

	supervisor.requestGracefulTermination('timeout');
	assert.equal(supervisor.refreshProcessTreeState(), 'alive');
	supervisor.requestForceTermination('timeout');
	assert.equal(supervisor.refreshProcessTreeState(), 'gone');

	assert.deepEqual(fixture.calls, [['graceful', 123], ['force', 123]]);
	assert.deepEqual(supervisor.snapshot(), {
		pid: 123,
		reason: 'timeout',
		state: 'process_tree_confirmed_gone',
		method: 'fixture_tree',
		graceful_signal: 'SIGTERM',
		forced_signal: 'SIGKILL',
		direct_child_closed_at: null,
		graceful_signal_sent_at: '2026-08-08T00:00:00.000Z',
		force_kill_sent_at: '2026-08-08T00:00:01.000Z',
		process_tree_confirmed_gone_at: '2026-08-08T00:00:02.000Z',
		forced_kill_attempted: true,
		confirmed: true,
		cleanup_pending: false,
	});
});

test('direct child close and unknown inspection never claim tree cleanup', async () => {
	const { ProcessSupervisor } = await importProcessSupervisor();
	const fixture = createFixture(['unknown']);
	const supervisor = new ProcessSupervisor(456, fixture.backend, fixture.now);

	supervisor.requestGracefulTermination('output_limit');
	supervisor.markDirectChildClosed();
	assert.equal(supervisor.refreshProcessTreeState(), 'unknown');
	const snapshot = supervisor.snapshot();

	assert.equal(snapshot.state, 'graceful_termination_requested');
	assert.equal(snapshot.direct_child_closed_at, '2026-08-08T00:00:01.000Z');
	assert.equal(snapshot.confirmed, false);
	assert.equal(snapshot.cleanup_pending, true);
});

test('process supervisor termination requests are idempotent', async () => {
	const { ProcessSupervisor } = await importProcessSupervisor();
	const fixture = createFixture([]);
	const supervisor = new ProcessSupervisor(789, fixture.backend, fixture.now);

	supervisor.requestGracefulTermination('parent_signal');
	supervisor.requestGracefulTermination('timeout');
	supervisor.requestForceTermination('parent_signal');
	supervisor.requestForceTermination('timeout');

	assert.deepEqual(fixture.calls, [['graceful', 789], ['force', 789]]);
	assert.equal(supervisor.snapshot().reason, 'parent_signal');
});
