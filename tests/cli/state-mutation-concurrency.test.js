import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';
import { test } from 'node:test';
import { createTempProject, removeTempProject } from './helpers/cli-harness.js';
import { addDocReviewEntry, readDocReviewLedger } from '../../dist/cli/lib/doc-review-ledger.js';
import { readDashboardPreferences } from '../../dist/cli/lib/dashboard-preferences.js';
import { createVerificationFailureFingerprint, updateRepeatedFailureState } from '../../dist/core/repeated-failure.js';

const workerScript = `
import fs from 'node:fs';
import { syncBuiltinESMExports } from 'node:module';
const [root, target, role, operationJson] = process.argv.slice(1);
const operation = JSON.parse(operationJson);
const module = await import(operation.url);
const { readCurrentProcessStartToken } = await import(operation.identityUrl);
readCurrentProcessStartToken();
const originalRename = fs.renameSync;
let intercepted = false;
fs.renameSync = (source, destination) => {
	if (!intercepted && destination === target) {
		intercepted = true;
		fs.writeFileSync(root + '/' + role + '-writing', 'ready');
		if (role === 'first') {
			const deadline = Date.now() + 10000;
			while (!fs.existsSync(root + '/release-first')) {
				if (Date.now() >= deadline) throw new Error('write barrier timed out');
				Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 10);
			}
		}
	}
	return originalRename(source, destination);
};
syncBuiltinESMExports();
fs.writeFileSync(root + '/' + role + '-ready', 'ready');
if (operation.method === 'updateRepeatedFailureState') {
	module[operation.method]({ ...operation.payload, projectRoot: root });
} else {
	module[operation.method](root, operation.payload);
}
`;

function operation(modulePath, method, payload) {
	return { url: new URL(`../../dist/${modulePath}.js`, import.meta.url).href,
		identityUrl: new URL('../../dist/core/process-identity.js', import.meta.url).href, method, payload };
}

async function waitForFile(file, child) {
	const deadline = Date.now() + 5000;
	while (!existsSync(file)) {
		assert.equal(child.exitCode, null, 'worker exited before reaching its barrier');
		assert.ok(Date.now() < deadline, 'worker did not reach its barrier');
		await delay(10);
	}
}

// Pause the first writer after its read/modify step, just before atomic replacement.
// A second process must not reach replacement until the first writer releases its lock.
async function interleave(projectPath, relativeTarget, firstOperation, secondOperation) {
	const children = [];
	const target = path.join(projectPath, relativeTarget);
	function start(role, action) {
		const child = spawn(process.execPath, ['--input-type=module', '-e', workerScript,
			projectPath, target, role, JSON.stringify(action)], { windowsHide: true, stdio: ['ignore', 'ignore', 'pipe'] });
		let stderr = '';
		child.stderr.on('data', (chunk) => { stderr += chunk; });
		const done = new Promise((resolve) => {
			child.once('error', (error) => resolve({ error }));
			child.once('close', (code) => resolve({ code, stderr }));
		});
		children.push({ child, done });
		return child;
	}
	try {
		const first = start('first', firstOperation);
		await waitForFile(path.join(projectPath, 'first-writing'), first);
		const second = start('second', secondOperation);
		await waitForFile(path.join(projectPath, 'second-ready'), second);
		await delay(200);
		const secondWroteBeforeRelease = existsSync(path.join(projectPath, 'second-writing'));
		writeFileSync(path.join(projectPath, 'release-first'), 'release');
		for (const { done } of children) {
			const result = await done;
			assert.equal(result.code, 0, result.error?.message ?? result.stderr);
		}
		assert.equal(secondWroteBeforeRelease, false, 'second writer bypassed the process mutex');
	} finally {
		writeFileSync(path.join(projectPath, 'release-first'), 'release');
		for (const { child } of children) {
			if (child.exitCode === null) child.kill();
		}
		await Promise.all(children.map(({ done }) => done));
	}
}

const ledgerModule = 'cli/lib/doc-review-ledger';
const ledgerPath = '.mustflow/review/docs.toml';

test('concurrent review additions preserve both documents', async () => {
	const root = createTempProject();
	try {
		await interleave(root, ledgerPath,
			operation(ledgerModule, 'addDocReviewEntry', { path: 'a.md' }),
			operation(ledgerModule, 'addDocReviewEntry', { path: 'b.md' }));
		assert.deepEqual(readDocReviewLedger(root).documents.map((entry) => entry.path), ['a.md', 'b.md']);
	} finally {
		removeTempProject(root);
	}
});

test('concurrent review comments and approvals preserve both changes', async () => {
	const root = createTempProject();
	try {
		addDocReviewEntry(root, { path: 'a.md' });
		addDocReviewEntry(root, { path: 'b.md' });
		await interleave(root, ledgerPath,
			operation(ledgerModule, 'commentDocReviewEntry', { path: 'a.md', comment: 'needs examples' }),
			operation(ledgerModule, 'markDocReviewEntry', { path: 'b.md', status: 'approved', reviewerKind: 'human', reviewerId: 'reviewer' }));
		const [a, b] = readDocReviewLedger(root).documents;
		assert.equal(a.review_comment, 'needs examples');
		assert.equal(b.status, 'approved');
	} finally {
		removeTempProject(root);
	}
});

test('concurrent dashboard updates preserve independent preference fields', async () => {
	const root = createTempProject();
	try {
		mkdirSync(path.join(root, '.mustflow/config'), { recursive: true });
		writeFileSync(path.join(root, '.mustflow/config/preferences.toml'), '[git]\nauto_commit = false\n[git.commit_message]\nlanguage = "en"\n');
		await interleave(root, '.mustflow/config/preferences.toml',
			operation('cli/lib/dashboard-preferences', 'updateDashboardPreferences', [{ id: 'git.auto_commit', value: true }]),
			operation('cli/lib/dashboard-preferences', 'updateDashboardPreferences', [{ id: 'git.commit_message.language', value: 'ko' }]));
		const settings = readDashboardPreferences(root).settings;
		assert.equal(settings.find((setting) => setting.id === 'git.auto_commit').value, true);
		assert.equal(settings.find((setting) => setting.id === 'git.commit_message.language').value, 'ko');
	} finally {
		removeTempProject(root);
	}
});

function fingerprint(plan) {
	return createVerificationFailureFingerprint({ verificationPlanId: plan, failedIntents: ['check'],
		exitCodeClasses: ['failure'], timeoutFlags: [false], errorKinds: ['exit_code'],
		riskCodes: [], affectedSurfaces: [], commandFingerprints: [] });
}

for (const sameFingerprint of [true, false]) {
	test(`concurrent failure updates preserve ${sameFingerprint ? 'increments and the evidence threshold' : 'distinct fingerprints'}`, async () => {
		const root = createTempProject();
		const first = fingerprint('first');
		const second = sameFingerprint ? first : fingerprint('second');
		try {
			updateRepeatedFailureState({ projectRoot: root, failureFingerprint: first, status: 'failed' });
			await interleave(root, '.mustflow/state/repeated-failures.json',
				operation('core/repeated-failure', 'updateRepeatedFailureState', { failureFingerprint: first, status: 'failed' }),
				operation('core/repeated-failure', 'updateRepeatedFailureState', { failureFingerprint: second, status: 'failed' }));
			const state = JSON.parse(readFileSync(path.join(root, '.mustflow/state/repeated-failures.json'), 'utf8'));
			assert.equal(state.fingerprints.length, sameFingerprint ? 1 : 2);
			const entry = state.fingerprints.find((item) => item.fingerprint === first.fingerprint);
			assert.equal(entry.seen_count, sameFingerprint ? 3 : 2);
			assert.equal(entry.requires_new_evidence, true);
		} finally {
			removeTempProject(root);
		}
	});
}
