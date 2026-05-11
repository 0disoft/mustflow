import assert from 'node:assert/strict';
import path from 'node:path';
import { test } from 'node:test';
import { fileURLToPath, pathToFileURL } from 'node:url';

import fc from 'fast-check';

const projectRoot = path.resolve(fileURLToPath(new URL('../..', import.meta.url)));
const commandContractRulesModuleUrl = pathToFileURL(
	path.join(projectRoot, 'dist', 'core', 'command-contract-rules.js'),
).href;
const commandIntentEligibilityModuleUrl = pathToFileURL(
	path.join(projectRoot, 'dist', 'core', 'command-intent-eligibility.js'),
).href;

const SAFE_INTENT_NAME_PATTERN = /^[A-Za-z0-9_-]+$/u;

function runnableArgvIntent() {
	return {
		status: 'configured',
		lifecycle: 'oneshot',
		run_policy: 'agent_allowed',
		argv: [process.execPath, '-e', 'process.exit(0)'],
		stdin: 'closed',
		timeout_seconds: 10,
	};
}

function runnableShellIntent(command) {
	return {
		status: 'configured',
		lifecycle: 'oneshot',
		run_policy: 'agent_allowed',
		mode: 'shell',
		cmd: command,
		stdin: 'closed',
		timeout_seconds: 10,
	};
}

test('property: command intent names use the copy-safe identifier contract', async () => {
	const { commandIntentNameIsSafe } = await import(commandContractRulesModuleUrl);

	fc.assert(
		fc.property(fc.string({ maxLength: 64 }), (intentName) => {
			assert.equal(commandIntentNameIsSafe(intentName), SAFE_INTENT_NAME_PATTERN.test(intentName));
		}),
	);
});

test('property: unsafe command intent names never become runnable', async () => {
	const { evaluateCommandIntentEligibility } = await import(commandIntentEligibilityModuleUrl);

	fc.assert(
		fc.property(
			fc.string({ minLength: 1, maxLength: 64 }).filter((intentName) => !SAFE_INTENT_NAME_PATTERN.test(intentName)),
			(intentName) => {
				const result = evaluateCommandIntentEligibility(intentName, runnableArgvIntent());

				assert.equal(result.ok, false);
				assert.equal(result.code, 'unsafe_intent_name');
			},
		),
	);
});

test('property: blocked background shell patterns never become runnable', async () => {
	const { evaluateCommandIntentEligibility } = await import(commandIntentEligibilityModuleUrl);
	const { shellCommandHasBlockedBackgroundPattern } = await import(commandContractRulesModuleUrl);
	const blockedShellCommand = fc.oneof(
		fc.string({ maxLength: 24 }).map((prefix) => `${prefix} nohup node script.js`),
		fc.string({ maxLength: 24 }).map((prefix) => `${prefix} disown`),
		fc.string({ maxLength: 24 }).map((prefix) => `${prefix} xdg-open README.md`),
		fc.string({ maxLength: 24 }).map((prefix) => `${prefix} open README.md`),
		fc.string({ maxLength: 24 }).map((prefix) => `${prefix} chrome http://localhost`),
		fc.string({ maxLength: 24 }).map((prefix) => `${prefix} command &`),
	);

	fc.assert(
		fc.property(blockedShellCommand, (command) => {
			assert.equal(shellCommandHasBlockedBackgroundPattern(command), true);

			const result = evaluateCommandIntentEligibility('safe_intent', runnableShellIntent(command));

			assert.equal(result.ok, false);
			assert.equal(result.code, 'blocked_shell_background_pattern');
		}),
	);
});

