import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { test } from 'node:test';
import { pathToFileURL } from 'node:url';
import { projectRoot } from './helpers/cli-harness.js';

async function importResourceBudget() {
	return import(pathToFileURL(path.join(projectRoot, 'dist', 'core', 'verification-resource-budget.js')).href);
}

function createTempDirectory(prefix) {
	return mkdtempSync(path.join(tmpdir(), prefix));
}

function removeTempDirectory(directory) {
	rmSync(directory, { recursive: true, force: true });
}

function capacities(cpu = 1, memory = cpu, disk = cpu) {
	return {
		host: { cpu, memory, disk },
		repository: { cpu, memory, disk },
	};
}

function sleep(milliseconds) {
	return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

async function assertStillPending(promise) {
	const state = await Promise.race([
		promise.then(() => 'resolved'),
		sleep(80).then(() => 'pending'),
	]);
	assert.equal(state, 'pending');
}

test('shared verification budget blocks a second lease until capacity is released', async () => {
	const projectPath = createTempDirectory('mustflow-budget-project-');
	const registryRoot = createTempDirectory('mustflow-budget-registry-');
	const { acquireVerificationResourceLease } = await importResourceBudget();
	const secondAbort = new AbortController();

	try {
		const first = await acquireVerificationResourceLease(projectPath, {
			capacities: capacities(),
			weights: { cpu: 1, memory: 1, disk: 1 },
			registryRoot,
			pollMs: 5,
		});
		const secondPromise = acquireVerificationResourceLease(projectPath, {
			capacities: capacities(),
			weights: { cpu: 1, memory: 1, disk: 1 },
			registryRoot,
			pollMs: 5,
			signal: secondAbort.signal,
		});

		await assertStillPending(secondPromise);
		first.release();
		first.release();
		const second = await secondPromise;
		second.release();
	} finally {
		secondAbort.abort();
		removeTempDirectory(projectPath);
		removeTempDirectory(registryRoot);
	}
});

test('repository slots serialize one repository without wasting capacity for another repository', async () => {
	const projectA = createTempDirectory('mustflow-budget-project-a-');
	const projectB = createTempDirectory('mustflow-budget-project-b-');
	const registryRoot = createTempDirectory('mustflow-budget-registry-');
	const { acquireVerificationResourceLease } = await importResourceBudget();
	const secondAbort = new AbortController();
	const sharedCapacities = {
		host: { cpu: 2, memory: 2, disk: 2 },
		repository: { cpu: 1, memory: 1, disk: 1 },
	};

	try {
		const firstA = await acquireVerificationResourceLease(projectA, {
			capacities: sharedCapacities,
			weights: { cpu: 1, memory: 1, disk: 0 },
			registryRoot,
			pollMs: 5,
		});
		const secondAPromise = acquireVerificationResourceLease(projectA, {
			capacities: sharedCapacities,
			weights: { cpu: 1, memory: 1, disk: 0 },
			registryRoot,
			pollMs: 5,
			signal: secondAbort.signal,
		});
		await assertStillPending(secondAPromise);

		const firstB = await acquireVerificationResourceLease(projectB, {
			capacities: sharedCapacities,
			weights: { cpu: 1, memory: 1, disk: 0 },
			registryRoot,
			pollMs: 5,
		});
		firstB.release();
		await assertStillPending(secondAPromise);

		firstA.release();
		const secondA = await secondAPromise;
		secondA.release();
	} finally {
		secondAbort.abort();
		removeTempDirectory(projectA);
		removeTempDirectory(projectB);
		removeTempDirectory(registryRoot);
	}
});

test('disk-weighted leases do not block read-only leases when CPU and memory remain', async () => {
	const projectPath = createTempDirectory('mustflow-budget-project-');
	const registryRoot = createTempDirectory('mustflow-budget-registry-');
	const { acquireVerificationResourceLease } = await importResourceBudget();
	const secondAbort = new AbortController();
	const sharedCapacities = capacities(3, 3, 1);

	try {
		const writer = await acquireVerificationResourceLease(projectPath, {
			capacities: sharedCapacities,
			weights: { cpu: 1, memory: 1, disk: 1 },
			registryRoot,
			pollMs: 5,
		});
		const secondWriterPromise = acquireVerificationResourceLease(projectPath, {
			capacities: sharedCapacities,
			weights: { cpu: 1, memory: 1, disk: 1 },
			registryRoot,
			pollMs: 5,
			signal: secondAbort.signal,
		});
		await assertStillPending(secondWriterPromise);

		const reader = await acquireVerificationResourceLease(projectPath, {
			capacities: sharedCapacities,
			weights: { cpu: 1, memory: 1, disk: 0 },
			registryRoot,
			pollMs: 5,
		});
		reader.release();
		writer.release();
		const secondWriter = await secondWriterPromise;
		secondWriter.release();
	} finally {
		secondAbort.abort();
		removeTempDirectory(projectPath);
		removeTempDirectory(registryRoot);
	}
});

test('worktrees resolve to one repository budget identity through commondir', async () => {
	const repositoryRoot = createTempDirectory('mustflow-budget-repository-');
	const worktreeA = createTempDirectory('mustflow-budget-worktree-a-');
	const worktreeB = createTempDirectory('mustflow-budget-worktree-b-');
	const commonGitDirectory = path.join(repositoryRoot, '.git');
	const metadataA = path.join(commonGitDirectory, 'worktrees', 'a');
	const metadataB = path.join(commonGitDirectory, 'worktrees', 'b');
	const { createVerificationRepositoryId } = await importResourceBudget();

	try {
		mkdirSync(metadataA, { recursive: true });
		mkdirSync(metadataB, { recursive: true });
		writeFileSync(path.join(metadataA, 'commondir'), '../..\n');
		writeFileSync(path.join(metadataB, 'commondir'), '../..\n');
		writeFileSync(path.join(worktreeA, '.git'), `gitdir: ${metadataA}\n`);
		writeFileSync(path.join(worktreeB, '.git'), `gitdir: ${metadataB}\n`);

		assert.equal(createVerificationRepositoryId(repositoryRoot), createVerificationRepositoryId(worktreeA));
		assert.equal(createVerificationRepositoryId(worktreeA), createVerificationRepositoryId(worktreeB));
	} finally {
		removeTempDirectory(repositoryRoot);
		removeTempDirectory(worktreeA);
		removeTempDirectory(worktreeB);
	}
});

test('dead process slots are recovered before the next verification lease', async () => {
	const projectPath = createTempDirectory('mustflow-budget-project-');
	const registryRoot = createTempDirectory('mustflow-budget-registry-');
	const childScript = path.join(registryRoot, 'acquire-and-exit.mjs');
	const moduleUrl = pathToFileURL(path.join(projectRoot, 'dist', 'core', 'verification-resource-budget.js')).href;
	const { acquireVerificationResourceLease } = await importResourceBudget();

	try {
		writeFileSync(
			childScript,
			`import { acquireVerificationResourceLease } from ${JSON.stringify(moduleUrl)};\n` +
				`await acquireVerificationResourceLease(process.env.PROJECT_PATH, { capacities: ${JSON.stringify(capacities())}, weights: { cpu: 1, memory: 1, disk: 1 }, registryRoot: process.env.REGISTRY_ROOT, pollMs: 5 });\n` +
				`process.stdout.write('acquired');\n` +
				`process.exit(0);\n`,
		);
		const child = spawnSync(process.execPath, [childScript], {
			encoding: 'utf8',
			env: {
				...process.env,
				PROJECT_PATH: projectPath,
				REGISTRY_ROOT: registryRoot,
			},
			timeout: 10_000,
		});
		assert.equal(child.status, 0, child.stderr);
		assert.equal(child.stdout, 'acquired');

		const recovered = await acquireVerificationResourceLease(projectPath, {
			capacities: capacities(),
			weights: { cpu: 1, memory: 1, disk: 1 },
			registryRoot,
			pollMs: 5,
		});
		recovered.release();
	} finally {
		removeTempDirectory(projectPath);
		removeTempDirectory(registryRoot);
	}
});

test('capacity resolution stays bounded by host resources and the repository ceiling', async () => {
	const { resolveVerificationResourceCapacities } = await importResourceBudget();
	const resolved = resolveVerificationResourceCapacities({
		repositoryMax: 8,
		cpuAvailable: 16,
		totalMemoryBytes: 8 * 1024 * 1024 * 1024,
	});

	assert.deepEqual(resolved, {
		host: { cpu: 8, memory: 4, disk: 4 },
		repository: { cpu: 8, memory: 4, disk: 4 },
	});
});

test('weights larger than a declared capacity fail before acquiring partial slots', async () => {
	const projectPath = createTempDirectory('mustflow-budget-project-');
	const registryRoot = createTempDirectory('mustflow-budget-registry-');
	const { acquireVerificationResourceLease } = await importResourceBudget();

	try {
		await assert.rejects(
			acquireVerificationResourceLease(projectPath, {
				capacities: capacities(),
				weights: { cpu: 2, memory: 1, disk: 0 },
				registryRoot,
			}),
			/verification_resource_weight_exceeds_capacity:host\.cpu/u,
		);
	} finally {
		removeTempDirectory(projectPath);
		removeTempDirectory(registryRoot);
	}
});
