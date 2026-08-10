import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { test } from 'node:test';
import { once } from 'node:events';
import { pathToFileURL } from 'node:url';

import { projectRoot } from './helpers/cli-harness.js';

async function loadManifestLockModule() {
	return import(pathToFileURL(path.join(projectRoot, 'dist', 'cli', 'lib', 'manifest-lock.js')).href);
}

function createFixture() {
	const root = mkdtempSync(path.join(tmpdir(), 'mustflow-manifest-cas-'));
	mkdirSync(path.join(root, '.mustflow', 'config'), { recursive: true });
	writeFileSync(path.join(root, 'AGENTS.md'), 'agents v2\n');
	writeFileSync(path.join(root, 'README.md'), 'readme v2\n');
	writeFileSync(
		path.join(root, '.mustflow', 'config', 'manifest.lock.toml'),
		`schema_version = "1"\n\n[template]\nid = "default"\nversion = "1.0.0"\n\n[files."AGENTS.md"]\nsource = "template_common"\nlast_action = "created"\ncontent_hash = "sha256:${'0'.repeat(64)}"\n\n[files."README.md"]\nsource = "template_common"\nlast_action = "created"\ncontent_hash = "sha256:${'1'.repeat(64)}"\n`,
	);
	return root;
}

test('manifest lock customization plan applies only to its reviewed snapshots', async () => {
	const root = createFixture();
	try {
		const module = await loadManifestLockModule();
		const plan = module.createManifestLockCustomizationPlan(root, ['AGENTS.md']);
		assert.deepEqual(module.applyManifestLockCustomizationPlan(root, plan), ['AGENTS.md']);
		assert.match(readFileSync(path.join(root, '.mustflow', 'config', 'manifest.lock.toml'), 'utf8'), /last_action = "customized"/u);
	} finally {
		rmSync(root, { recursive: true, force: true });
	}
});

test('manifest lock customization rejects target drift after planning', async () => {
	const root = createFixture();
	try {
		const module = await loadManifestLockModule();
		const plan = module.createManifestLockCustomizationPlan(root, ['AGENTS.md']);
		writeFileSync(path.join(root, 'AGENTS.md'), 'agents v3\n');
		assert.throws(
			() => module.applyManifestLockCustomizationPlan(root, plan),
			/Manifest lock CAS conflict: AGENTS\.md changed after the plan was created/u,
		);
	} finally {
		rmSync(root, { recursive: true, force: true });
	}
});

test('manifest lock customization merges plans for independent entries', async () => {
	const root = createFixture();
	try {
		const module = await loadManifestLockModule();
		const agentsPlan = module.createManifestLockCustomizationPlan(root, ['AGENTS.md']);
		const readmePlan = module.createManifestLockCustomizationPlan(root, ['README.md']);

		assert.deepEqual(module.applyManifestLockCustomizationPlan(root, agentsPlan), ['AGENTS.md']);
		assert.deepEqual(module.applyManifestLockCustomizationPlan(root, readmePlan), ['README.md']);

		const lock = readFileSync(path.join(root, '.mustflow', 'config', 'manifest.lock.toml'), 'utf8');
		assert.match(lock, /\[files\."AGENTS\.md"\][\s\S]*?last_action = "customized"/u);
		assert.match(lock, /\[files\."README\.md"\][\s\S]*?last_action = "customized"/u);
	} finally {
		rmSync(root, { recursive: true, force: true });
	}
});

test('manifest lock customization rejects target-entry drift and plan replay', async () => {
	const root = createFixture();
	try {
		const module = await loadManifestLockModule();
		const plan = module.createManifestLockCustomizationPlan(root, ['AGENTS.md']);
		const competingPlan = module.createManifestLockCustomizationPlan(root, ['AGENTS.md']);
		module.applyManifestLockCustomizationPlan(root, competingPlan);

		assert.throws(
			() => module.applyManifestLockCustomizationPlan(root, plan),
			/Manifest lock CAS conflict: AGENTS\.md lock entry changed after the plan was created/u,
		);
		assert.throws(
			() => module.applyManifestLockCustomizationPlan(root, competingPlan),
			/Manifest lock CAS conflict: AGENTS\.md lock entry changed after the plan was created/u,
		);
	} finally {
		rmSync(root, { recursive: true, force: true });
	}
});

test('legacy manifest lock customization plans retain whole-lock CAS behavior', async () => {
	const root = createFixture();
	try {
		const module = await loadManifestLockModule();
		const currentPlan = module.createManifestLockCustomizationPlan(root, ['AGENTS.md']);
		const legacyPlan = {
			...currentPlan,
			files: currentPlan.files.map(({ baseline_lock_entry_hash: _baseline, ...file }) => file),
		};
		const readmePlan = module.createManifestLockCustomizationPlan(root, ['README.md']);
		module.applyManifestLockCustomizationPlan(root, readmePlan);

		assert.throws(
			() => module.applyManifestLockCustomizationPlan(root, legacyPlan),
			/Manifest lock CAS conflict: manifest\.lock\.toml changed after the plan was created/u,
		);
	} finally {
		rmSync(root, { recursive: true, force: true });
	}
});

test('manifest lock customization waits briefly for a live owner to release', async () => {
	const root = createFixture();
	try {
		const module = await loadManifestLockModule();
		const processIdentity = await import(
			pathToFileURL(path.join(projectRoot, 'dist', 'core', 'process-identity.js')).href
		);
		const plan = module.createManifestLockCustomizationPlan(root, ['AGENTS.md']);
		const ownerPath = path.join(root, '.mustflow', 'cache', 'manifest-lock-accept.owner.json');
		mkdirSync(path.dirname(ownerPath), { recursive: true });
		writeFileSync(
			ownerPath,
			`${JSON.stringify({
				schema_version: '1',
				pid: process.pid,
				process_start_token: processIdentity.readCurrentProcessStartToken(),
				owner_token: 'releasing-live-owner',
			})}\n`,
		);
		const releaser = spawn(
			process.execPath,
			['--input-type=module', '-e', "import { rmSync } from 'node:fs'; setTimeout(() => rmSync(process.argv[1], { force: true }), 150);", ownerPath],
			{ stdio: 'ignore' },
		);

		assert.deepEqual(module.applyManifestLockCustomizationPlan(root, plan), ['AGENTS.md']);
		const [exitCode] = await once(releaser, 'exit');
		assert.equal(exitCode, 0);
	} finally {
		rmSync(root, { recursive: true, force: true });
	}
});

test('manifest lock customization refuses a concurrent live owner', async () => {
	const root = createFixture();
	try {
		const module = await loadManifestLockModule();
		const processIdentity = await import(
			pathToFileURL(path.join(projectRoot, 'dist', 'core', 'process-identity.js')).href
		);
		const plan = module.createManifestLockCustomizationPlan(root, ['AGENTS.md']);
		const cachePath = path.join(root, '.mustflow', 'cache');
		mkdirSync(cachePath, { recursive: true });
		writeFileSync(
			path.join(cachePath, 'manifest-lock-accept.owner.json'),
			`${JSON.stringify({
				schema_version: '1',
				pid: process.pid,
				process_start_token: processIdentity.readCurrentProcessStartToken(),
				owner_token: 'other-live-owner',
			})}\n`,
		);

		assert.throws(
			() => module.applyManifestLockCustomizationPlan(root, plan),
			/Manifest lock baseline update already owned by live process/u,
		);
	} finally {
		rmSync(root, { recursive: true, force: true });
	}
});
