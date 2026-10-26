import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, symlinkSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { test } from 'node:test';
import { createVerificationCurrentStateHash } from '../../dist/cli/commands/verify/reuse-inputs.js';
import { readReusableVerificationResults } from '../../dist/cli/commands/verify/reuse-results.js';
import { validateCommandContractConfig } from '../../dist/core/command-contract-validation.js';
import { createTempProject, removeTempProject } from './helpers/cli-harness.js';

function createReuseFixture(t) {
	const root = createTempProject('mustflow-reuse-state-');
	t.after(() => removeTempProject(root));
	const state = '.mustflow/state/runs';
	const latestPath = `${state}/latest.json`;
	const manifestPath = `${state}/verify/manifest.json`;
	const receiptPath = `${state}/verify/receipt.json`;
	const receipt = { schema_version: '1', command: 'run', intent: 'check', status: 'passed',
		verification_plan_id: 'plan', current_state_hash: 'state', write_drift: { has_undeclared_changes: false } };
	const content = JSON.stringify(receipt);
	const entry = { intent: 'check', status: 'passed', receipt_path: receiptPath,
		receipt_sha256: `sha256:${createHash('sha256').update(content).digest('hex')}` };
	const latest = { verification_plan_id: 'plan', manifest_path: manifestPath };
	const manifest = { receipts: [entry] };
	const write = (relativePath, value) => {
		const target = path.join(root, relativePath);
		mkdirSync(path.dirname(target), { recursive: true });
		writeFileSync(target, typeof value === 'string' ? value : JSON.stringify(value));
	};
	write(latestPath, latest);
	write(manifestPath, manifest);
	write(receiptPath, content);
	return { root, latestPath, manifestPath, receiptPath, latest, manifest, entry, receipt, content, write,
		read: () => readReusableVerificationResults(root, 'plan', 'state') };
}

test('reuses valid state and still rejects a receipt checksum mismatch', t => {
	const fixture = createReuseFixture(t);
	assert.equal(fixture.read().get('check').reason, 'reused_input_hash');
	fixture.write(fixture.receiptPath, `${fixture.content} `);
	assert.equal(fixture.read().size, 0);
});

for (const target of ['latestPath', 'manifestPath', 'receiptPath']) {
	test(`rejects an oversized cache ${target} before parsing`, t => {
		const fixture = createReuseFixture(t);
		const content = readFileSync(path.join(fixture.root, fixture[target]), 'utf8');
		const padded = content.padEnd(4 * 1024 * 1024, ' ');
		fixture.write(fixture[target], padded);
		if (target === 'receiptPath') {
			fixture.entry.receipt_sha256 = `sha256:${createHash('sha256').update(padded).digest('hex')}`;
			fixture.write(fixture.manifestPath, fixture.manifest);
		}
		assert.equal(fixture.read().size, 1, 'the exact file-size boundary remains usable');
		fixture.write(fixture[target], `${padded} `);
		if (target === 'receiptPath') {
			fixture.entry.receipt_sha256 = `sha256:${createHash('sha256').update(`${padded} `).digest('hex')}`;
			fixture.write(fixture.manifestPath, fixture.manifest);
		}
		assert.equal(fixture.read().size, 0);
	});
}

for (const pointer of ['manifest_path', 'receipt_path']) {
	for (const target of ['untrusted.json', '.mustflow/state/runs-sibling/untrusted.json']) {
		test(`rejects ${pointer} outside run state: ${target}`, t => {
			const fixture = createReuseFixture(t);
			fixture.write(target, pointer === 'manifest_path' ? fixture.manifest : fixture.content);
			if (pointer === 'manifest_path') {
				fixture.latest.manifest_path = target;
				fixture.write(fixture.latestPath, fixture.latest);
			} else {
				fixture.entry.receipt_path = target;
				fixture.write(fixture.manifestPath, fixture.manifest);
			}
			assert.equal(fixture.read().size, 0);
		});
	}
}

test('rejects symlinked directories in cached receipt paths', t => {
	const fixture = createReuseFixture(t);
	fixture.write('untrusted/receipt.json', fixture.content);
	symlinkSync(path.join(fixture.root, 'untrusted'), path.join(fixture.root, '.mustflow/state/runs/link'),
		process.platform === 'win32' ? 'junction' : 'dir');
	fixture.entry.receipt_path = '.mustflow/state/runs/link/receipt.json';
	fixture.write(fixture.manifestPath, fixture.manifest);
	assert.equal(fixture.read().size, 0);
});

test('discards partial cached results when total reads exceed the reuse budget', t => {
	const fixture = createReuseFixture(t);
	const content = fixture.content.padEnd(3 * 1024 * 1024, ' ');
	fixture.write(fixture.receiptPath, content);
	fixture.entry.receipt_sha256 = `sha256:${createHash('sha256').update(content).digest('hex')}`;
	fixture.manifest.receipts = Array.from({ length: 5 }, () => fixture.entry);
	fixture.write(fixture.manifestPath, fixture.manifest);
	assert.equal(fixture.read().size, 1, 'five 3MiB reads fit within the 16MiB budget');
	fixture.manifest.receipts.push(fixture.entry);
	fixture.write(fixture.manifestPath, fixture.manifest);
	assert.equal(fixture.read().size, 0, 'a sixth 3MiB read must invalidate partial results');
});

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
