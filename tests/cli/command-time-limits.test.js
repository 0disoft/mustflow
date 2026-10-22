import assert from 'node:assert/strict';
import { test } from 'node:test';
import { validateCommandContractConfig } from '../../dist/core/command-contract-validation.js';
import { commandTimersAreSafe } from '../../dist/core/command-time-limits.js';
import { runArgvCommandStreaming } from '../../dist/cli/commands/run/executor.js';
import { projectRoot } from './helpers/cli-harness.js';

for (const [field, maximum] of [['timeout_seconds', 2147483], ['kill_after_seconds', 2147482]]) {
	for (const value of [maximum - 1, maximum, maximum + 1]) {
		test(`${field} timer boundary at ${value} seconds`, async () => {
			const timeout = field === 'timeout_seconds' ? value : 10;
			const killAfter = field === 'kill_after_seconds' ? value : 1;
			assert.equal(commandTimersAreSafe(timeout, killAfter), value <= maximum);
			const intent = { status: 'configured', lifecycle: 'oneshot', run_policy: 'agent_allowed',
				argv: [process.execPath, '-e', 'process.exit(0)'], cwd: '.', stdin: 'closed',
				timeout_seconds: timeout, kill_after_seconds: killAfter, writes: [], network: false, destructive: false };
			const issues = validateCommandContractConfig({ intents: { check_timer: intent },
				defaults: { [field === 'timeout_seconds' ? 'default_timeout_seconds' : field]: value } });
			assert.equal(issues.filter((issue) => issue.message.includes('timer overflow')).length, value > maximum ? 2 : 0);
			const result = await runArgvCommandStreaming({ executable: process.execPath, args: ['-e', 'process.exit(0)'], shell: false },
				projectRoot, process.env, timeout, killAfter, 1024, 1024, 1024, { stdout() {}, stderr() {} }, false, true);
			assert.equal(result.error?.code, value > maximum ? 'EINVAL' : undefined);
			assert.equal(result.status, value > maximum ? null : 0);
			if (value > maximum) assert.equal(result.pid, undefined);
		});
	}
}

test('non-finite and negative timer values are rejected', () => {
	for (const value of [NaN, Infinity, -1]) {
		assert.equal(commandTimersAreSafe(value, 1), false);
		assert.equal(commandTimersAreSafe(10, value), false);
	}
});
