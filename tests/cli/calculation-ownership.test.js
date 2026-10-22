import assert from 'node:assert/strict';
import { test } from 'node:test';
import { collectMustflowConfigIssues, validateMustflowConfig } from '../../dist/cli/lib/validation/config.js';
import { createRunPreview } from '../../dist/cli/lib/run-plan.js';
import { applyVerificationProfile } from '../../dist/core/verification-profile.js';

test('config calculation preserves validation ordering and compatibility accumulator behavior', () => {
	const config = Object.freeze({ workflow: Object.freeze({ mode: 'bad' }), map: false,
		context: Object.freeze({ enabled: 'yes' }), budget: Object.freeze({ max_iterations: 0 }) });
	const expected = [
		{ message: '[workflow].mode must be simple or strict' },
		{ message: '[map] must be a TOML table' },
		{ message: '[context].enabled must be a boolean' },
		{ message: '[budget].max_iterations must be a positive integer' },
	];
	assert.deepEqual(collectMustflowConfigIssues(config), expected);
	const seed = { message: 'existing issue' };
	const issues = [seed];
	validateMustflowConfig(config, issues);
	assert.deepEqual(issues, [seed, ...expected]);
	assert.deepEqual(collectMustflowConfigIssues(undefined), []);
});

test('mutating a preview cannot change its source execution plan', () => {
	const plan = {
		commandArgv: ['node', 'check.js'], argvCommand: { executable: 'node', args: ['check.js'] },
		writes: ['dist/'], effects: [{ lock: 'build', scope: 'repository' }],
		preconditions: [{ sources: ['src/**'], satisfyIntent: { intent: 'build' } }],
		activeLockConflicts: [{ lock: 'build' }], envAllowlist: ['CI'], successExitCodes: [0],
	};
	const before = structuredClone(plan);
	const preview = createRunPreview(plan, 'plan-only');
	preview.argv.push('--changed');
	preview.resolved_argv.args[0] = 'wrong.js';
	preview.effects[0].lock = 'other';
	preview.preconditions[0].sources.push('secrets/**');
	preview.preconditions[0].satisfyIntent.intent = 'other';
	preview.active_lock_conflicts[0].lock = 'other';
	assert.deepEqual(plan, before);
});

test('profile fast paths return owned arrays while preserving candidate values', () => {
	const candidate = Object.freeze({ intent: 'check', status: 'runnable', reason: null, detail: null });
	const candidates = Object.freeze([candidate]);
	for (const profile of ['edit', 'commit', 'release']) {
		const selected = applyVerificationProfile({ intents: {} }, 'code_change', candidates, profile);
		assert.notStrictEqual(selected, candidates);
		assert.deepEqual(selected, candidates);
		selected.push(candidate);
		assert.equal(candidates.length, 1);
	}
});
