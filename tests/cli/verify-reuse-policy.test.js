import assert from 'node:assert/strict';
import { writeFileSync } from 'node:fs';
import path from 'node:path';
import { test } from 'node:test';
import { createVerificationCurrentStateHash } from '../../dist/cli/commands/verify/reuse-inputs.js';
import { validateCommandContractConfig } from '../../dist/core/command-contract-validation.js';
import { createTempProject, removeTempProject } from './helpers/cli-harness.js';

test('reuse declarations validate the environment independence assertion', () => {
	for (const value of [true, false, 'true', 1, null]) {
		const issues = validateCommandContractConfig({ intents: { check: { reuse: { inputs: ['input'], run_environment_independent: value } } } });
		assert.equal(issues.some((issue) => issue.message.includes('run_environment_independent must be a boolean')), typeof value !== 'boolean');
	}
});

test('oversized reuse inputs disable caching at the read boundary', () => {
	const root = createTempProject('mustflow-reuse-limit-');
	const intent = { argv: [process.execPath, '-e', ''], network: false, destructive: false, writes: [],
		reuse: { inputs: ['input'], run_environment_independent: true } };
	const report = { files: ['input'], schedule: { entries: [{ intent: 'check' }] } };
	try {
		for (const bytes of [16 * 1024 * 1024 - 1, 16 * 1024 * 1024, 16 * 1024 * 1024 + 1]) {
			writeFileSync(path.join(root, 'input'), Buffer.alloc(bytes));
			const hash = createVerificationCurrentStateHash(root, report, 'plan', { intents: { check: intent } });
			if (bytes > 16 * 1024 * 1024) assert.equal(hash, null);
			else assert.match(hash, /^sha256:/);
		}
	} finally {
		removeTempProject(root);
	}
});
