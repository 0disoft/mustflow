import assert from 'node:assert/strict';
import fs from 'node:fs';
import { syncBuiltinESMExports } from 'node:module';
import { spawn } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { test } from 'node:test';
import { once } from 'node:events';
import { pathToFileURL } from 'node:url';

import { projectRoot, runCli } from './helpers/cli-harness.js';

async function loadManifestLockModule() {
	return import(pathToFileURL(path.join(projectRoot, 'dist', 'cli', 'lib', 'manifest-lock.js')).href);
}

test('manifest customization follows current command includes and rejects undeclared paths', async () => {
	const root = createFixture();
	try {
		const { isAllowedManifestCustomizationPath: allowed } = await import(
			pathToFileURL(path.join(projectRoot, 'dist', 'cli', 'lib', 'manifest-lock-scope.js')).href
		);
		const commands = path.join(root, '.mustflow', 'config', 'commands.toml');
		writeFileSync(commands, 'schema_version = "1"\n[include]\nfiles = ["commands.d/custom.toml"]\n');
		assert.equal(allowed(root, '.mustflow/config/commands.d/custom.toml'), true);
		assert.equal(allowed(root, '.mustflow/config/commands.d/unlisted.toml'), false);
		assert.equal(allowed(root, 'README.md'), false);
		assert.equal(allowed(root, '../AGENTS.md'), false);
		assert.equal(allowed(root, 'AGENTS.md'), true);
		assert.equal(allowed(root, '.mustflow/skills/example/SKILL.md'), true);
		writeFileSync(commands, 'schema_version = "1"\n[include]\nfiles = []\n');
		assert.equal(allowed(root, '.mustflow/config/commands.d/custom.toml'), false);
		writeFileSync(commands, 'schema_version = "1"\n[include]\nfiles = ["../outside.toml"]\n');
		assert.throws(() => allowed(root, '.mustflow/config/commands.d/custom.toml'));
	} finally {
		rmSync(root, { recursive: true, force: true });
	}
});

test('manifest publication retries transient Windows sharing violations without deleting the old file', { skip: process.platform !== 'win32' }, async (t) => {
	const root = createFixture();
	const module = await loadManifestLockModule();
	const target = path.join(root, '.mustflow', 'config', 'manifest.lock.toml');
	const original = readFileSync(target, 'utf8');
	const rename = fs.renameSync;
	let attempts = 0;
	const mocked = t.mock.method(fs, 'renameSync', (source, destination) => {
		if (destination === target && ++attempts < 3) {
			assert.equal(readFileSync(target, 'utf8'), original);
			throw Object.assign(new Error('sharing violation'), { code: 'EPERM' });
		}
		return rename(source, destination);
	});
	syncBuiltinESMExports();
	try {
		module.applyManifestLockCustomizationPlan(root, module.createManifestLockCustomizationPlan(root, ['AGENTS.md']));
		assert.equal(attempts, 3);
		assert.notEqual(readFileSync(target, 'utf8'), original);
		assert.equal(fs.readdirSync(path.dirname(target)).some(name => name.endsWith('.tmp')), false);
	} finally {
		mocked.mock.restore();
		syncBuiltinESMExports();
		rmSync(root, { recursive: true, force: true });
	}
});

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

test('baseline CLI recovers exact entries on a drifted root and preserves the reviewed plan', () => {
	const root = createFixture();
	try {
		writeFileSync(path.join(root, '.mustflow/config/commands.toml'), 'schema_version = "1"\n');
		const planPath = '.mustflow/state/manifest-lock-plans/review.json';
		const planned = runCli(root, ['baseline', 'plan', planPath, 'AGENTS.md']);
		assert.equal(planned.status, 0, planned.stderr);
		const savedPlan = readFileSync(path.join(root, planPath), 'utf8');
		assert.equal(runCli(root, ['baseline', 'plan', planPath, 'AGENTS.md']).status, 1);
		assert.equal(readFileSync(path.join(root, planPath), 'utf8'), savedPlan);
		const applied = runCli(root, ['baseline', 'apply', planPath]);
		assert.equal(applied.status, 0, applied.stderr);
		assert.equal(applied.stdout.trim(), 'AGENTS.md');
		assert.equal(readFileSync(path.join(root, planPath), 'utf8'), savedPlan);
		const lock = readFileSync(path.join(root, '.mustflow/config/manifest.lock.toml'), 'utf8');
		assert.ok(lock.includes('sha256:' + '1'.repeat(64)), 'unrelated README baseline must remain unchanged');
		assert.equal(runCli(root, ['baseline', 'apply', planPath]).status, 1);
		assert.equal(runCli(root, ['baseline', 'plan', '.mustflow/state/manifest-lock-plans/../escape.json', 'AGENTS.md']).status, 1);
		assert.equal(runCli(root, ['baseline', 'plan', '.mustflow/state/manifest-lock-plans/unsupported.json', 'README.md']).status, 1);
		assert.equal(runCli(root, ['baseline', 'apply', planPath, 'README.md']).status, 1);
	} finally {
		rmSync(root, { recursive: true, force: true });
	}
});

test('baseline CLI refuses target drift and a tampered plan with an unsupported path', async () => {
	const root = createFixture();
	try {
		writeFileSync(path.join(root, '.mustflow/config/commands.toml'), 'schema_version = "1"\n');
		const planPath = '.mustflow/state/manifest-lock-plans/review.json';
		assert.equal(runCli(root, ['baseline', 'plan', planPath, 'AGENTS.md']).status, 0);
		const before = readFileSync(path.join(root, '.mustflow/config/manifest.lock.toml'), 'utf8');
		writeFileSync(path.join(root, 'AGENTS.md'), 'changed after review');
		assert.equal(runCli(root, ['baseline', 'apply', planPath]).status, 1);
		const module = await loadManifestLockModule();
		writeFileSync(path.join(root, planPath), JSON.stringify(module.createManifestLockCustomizationPlan(root, ['README.md'])));
		const rejected = runCli(root, ['baseline', 'apply', planPath]);
		assert.equal(rejected.status, 1);
		assert.match(rejected.stderr, /Unsupported manifest customization path/u);
		assert.equal(readFileSync(path.join(root, '.mustflow/config/manifest.lock.toml'), 'utf8'), before);
	} finally {
		rmSync(root, { recursive: true, force: true });
	}
});

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

test('manifest lock removal deletes only entries whose files are already absent', async () => {
	const root = createFixture();
	try {
		const module = await loadManifestLockModule();
		rmSync(path.join(root, 'README.md'));
		assert.deepEqual(module.removeMissingManifestLockEntries(root, ['README.md']), ['README.md']);
		const lock = readFileSync(path.join(root, '.mustflow', 'config', 'manifest.lock.toml'), 'utf8');
		assert.doesNotMatch(lock, /\[files\."README\.md"\]/u);
		assert.match(lock, /\[files\."AGENTS\.md"\]/u);
		assert.throws(
			() => module.removeMissingManifestLockEntries(root, ['AGENTS.md']),
			/Refusing to remove manifest lock entry for existing file: AGENTS\.md/u,
		);
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

test('manifest preparation retries only independent changes and releases ownership between attempts', async (t) => {
	const module = await loadManifestLockModule();
	for (const scenario of ['independent', 'same-entry', 'target-file', 'legacy', 'continuous']) {
		await t.test(scenario, () => {
			const root = createFixture();
			const target = path.join(root, '.mustflow', 'config', 'manifest.lock.toml');
			const owner = path.join(root, '.mustflow', 'cache', 'manifest-lock-accept.owner.json');
			const original = readFileSync(target, 'utf8');
			const currentPlan = module.createManifestLockCustomizationPlan(root, ['AGENTS.md']);
			const plan = scenario === 'legacy'
				? { ...currentPlan, files: currentPlan.files.map(({ baseline_lock_entry_hash: _baseline, ...file }) => file) }
				: currentPlan;
			const competing = module.createManifestLockCustomizationPlan(root, [scenario === 'same-entry' ? 'AGENTS.md' : 'README.md']);
			const open = fs.openSync;
			let attempts = 0;
			let injecting = false;
			let competingContent = original;
			const mocked = t.mock.method(fs, 'openSync', (file, flags, ...args) => {
				if (file === owner && flags === 'wx' && !injecting) {
					assert.equal(fs.existsSync(owner), false, 'retry must release its previous ownership');
					attempts += 1;
					injecting = true;
					try {
						if (scenario === 'continuous') {
							writeFileSync(target, `${original}\n# competing generation ${attempts}\n`);
						} else if (attempts === 1 && scenario === 'target-file') {
							writeFileSync(path.join(root, 'AGENTS.md'), 'changed while preparing\n');
						} else if (attempts === 1) {
							module.applyManifestLockCustomizationPlan(root, competing);
						}
						competingContent = readFileSync(target, 'utf8');
					} finally {
						injecting = false;
					}
				}
				return open(file, flags, ...args);
			});
			syncBuiltinESMExports();
			try {
				if (scenario === 'independent') {
					assert.deepEqual(module.applyManifestLockCustomizationPlan(root, plan), ['AGENTS.md']);
					assert.equal(attempts, 2);
					const lock = module.readManifestLock(root);
					assert.equal(lock.kind, 'present');
					assert.equal(lock.lock.files.every(file => file.lastAction === 'customized'), true);
				} else {
					const expected = {
						'same-entry': /AGENTS\.md lock entry changed after the plan was created/u,
						'target-file': /AGENTS\.md changed during baseline acceptance/u,
						legacy: /manifest\.lock\.toml changed after the plan was created/u,
						continuous: /changed during baseline acceptance after 3 attempts/u,
					}[scenario];
					assert.throws(() => module.applyManifestLockCustomizationPlan(root, plan), expected);
					assert.equal(attempts, scenario === 'continuous' ? 3 : 1);
					assert.equal(readFileSync(target, 'utf8'), competingContent);
				}
				assert.equal(fs.existsSync(owner), false);
			} finally {
				mocked.mock.restore();
				syncBuiltinESMExports();
				rmSync(root, { recursive: true, force: true });
			}
		});
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
