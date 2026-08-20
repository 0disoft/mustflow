import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import {
	existsSync,
	mkdirSync,
	readFileSync,
	readdirSync,
	writeFileSync,
} from 'node:fs';
import path from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';
import { pathToFileURL } from 'node:url';
import { test } from 'node:test';

import {
	createLocalIndexDirect,
	createMinimalWorkflowProject,
	importDistModule,
	removeTempProject,
} from './index-support.js';
import { projectRoot } from './helpers/cli-harness.js';

function sha256(content) {
	return createHash('sha256').update(content).digest('hex');
}

function readPointer(projectPath) {
	return JSON.parse(
		readFileSync(
			path.join(projectPath, '.mustflow', 'cache', 'local-index', 'current.json'),
			'utf8',
		),
	);
}

function generationPath(projectPath, pointer) {
	return path.join(projectPath, ...pointer.database_path.split('/'));
}

function generationFiles(projectPath) {
	const directory = path.join(projectPath, '.mustflow', 'cache', 'local-index', 'generations');
	return readdirSync(directory).filter((name) => name.endsWith('.sqlite')).sort();
}

test('publishes an immutable content-addressed local-index generation', async () => {
	const projectPath = createMinimalWorkflowProject('mustflow-index-generation-');

	try {
		const result = await createLocalIndexDirect(projectPath);
		const pointer = readPointer(projectPath);
		const compatibilityPath = path.join(projectPath, '.mustflow', 'cache', 'mustflow.sqlite');
		const currentGenerationPath = generationPath(projectPath, pointer);
		const generationBytes = readFileSync(currentGenerationPath);

		assert.equal(path.resolve(result.database_path), compatibilityPath);
		assert.equal(result.wrote_files, true);
		assert.equal(pointer.schema_version, '1');
		assert.equal(pointer.kind, 'local_index_generation');
		assert.match(pointer.sha256, /^[a-f0-9]{64}$/u);
		assert.equal(pointer.generation, `sha256:${pointer.sha256}`);
		assert.equal(
			pointer.database_path,
			`.mustflow/cache/local-index/generations/sha256-${pointer.sha256}.sqlite`,
		);
		assert.equal(pointer.compatibility_path, '.mustflow/cache/mustflow.sqlite');
		assert.match(pointer.compatibility_mtime_ns, /^(?:0|[1-9]\d*)$/u);
		assert.match(pointer.compatibility_ctime_ns, /^(?:0|[1-9]\d*)$/u);
		assert.equal(pointer.sha256, sha256(generationBytes));
		assert.deepEqual(readFileSync(compatibilityPath), generationBytes);
		assert.deepEqual(generationFiles(projectPath), [`sha256-${pointer.sha256}.sqlite`]);

		const { getLocalIndexDatabasePath } = await importDistModule(
			'cli/lib/local-index/database-path.js',
		);
		assert.equal(path.resolve(getLocalIndexDatabasePath(projectPath)), currentGenerationPath);
	} finally {
		removeTempProject(projectPath);
	}
});

test('keeps the previous local-index generation unchanged across rebuilds', async () => {
	const projectPath = createMinimalWorkflowProject('mustflow-index-generation-rebuild-');

	try {
		await createLocalIndexDirect(projectPath);
		const firstPointer = readPointer(projectPath);
		const firstGenerationPath = generationPath(projectPath, firstPointer);
		const firstGenerationBytes = readFileSync(firstGenerationPath);

		const agentsPath = path.join(projectPath, 'AGENTS.md');
		writeFileSync(agentsPath, `${readFileSync(agentsPath, 'utf8')}\nGeneration rebuild marker.\n`);
		await createLocalIndexDirect(projectPath);

		const secondPointer = readPointer(projectPath);
		assert.notEqual(secondPointer.sha256, firstPointer.sha256);
		assert.deepEqual(readFileSync(firstGenerationPath), firstGenerationBytes);
		assert.equal(generationFiles(projectPath).length, 2);
		assert.ok(existsSync(generationPath(projectPath, secondPointer)));
	} finally {
		removeTempProject(projectPath);
	}
});

test('coalesces equivalent concurrent local-index builders behind one lease', async () => {
	const projectPath = createMinimalWorkflowProject('mustflow-index-generation-concurrent-');

	try {
		const results = await Promise.all([
			createLocalIndexDirect(projectPath),
			createLocalIndexDirect(projectPath),
		]);
		const pointer = readPointer(projectPath);
		const leasePath = path.join(
			projectPath,
			'.mustflow',
			'cache',
			'local-index',
			'builder.lease',
		);
		const stagingPath = path.join(
			projectPath,
			'.mustflow',
			'cache',
			'local-index',
			'staging',
		);

		assert.deepEqual(
			results.map((result) => result.wrote_files).sort(),
			[false, true],
		);
		assert.deepEqual(generationFiles(projectPath), [`sha256-${pointer.sha256}.sqlite`]);
		assert.equal(existsSync(leasePath), false);
		assert.deepEqual(
			existsSync(stagingPath)
				? readdirSync(stagingPath).filter((name) => name.endsWith('.sqlite'))
				: [],
			[],
		);
	} finally {
		removeTempProject(projectPath);
	}
});

test('coordinates local-index builder leases across processes and recovers dead owners', async () => {
	const projectPath = createMinimalWorkflowProject('mustflow-index-generation-lease-');
	const readyPath = path.join(projectPath, 'lease-ready');
	const releasePath = path.join(projectPath, 'lease-release');
	const leaseModuleUrl = pathToFileURL(
		path.join(projectRoot, 'dist', 'cli', 'lib', 'local-index', 'builder-lease.js'),
	).href;
	const holderScript = `
import { existsSync, writeFileSync } from 'node:fs';
import { setTimeout as delay } from 'node:timers/promises';
import { acquireLocalIndexBuildLease } from ${JSON.stringify(leaseModuleUrl)};
const [root, readyPath, releasePath] = process.argv.slice(1);
const lease = await acquireLocalIndexBuildLease(root, 'shared-request');
writeFileSync(readyPath, 'ready');
while (!existsSync(releasePath)) await delay(10);
lease.release();
`;
	let holder;

	try {
		holder = spawn(
			process.execPath,
			['--input-type=module', '-e', holderScript, projectPath, readyPath, releasePath],
			{ stdio: ['ignore', 'pipe', 'pipe'] },
		);
		const readyDeadline = Date.now() + 5_000;
		while (!existsSync(readyPath)) {
			if (holder.exitCode !== null) {
				throw new Error(`lease holder exited before acquiring: ${holder.exitCode}`);
			}
			if (Date.now() >= readyDeadline) {
				throw new Error('lease holder did not acquire within the test deadline');
			}
			await delay(10);
		}

		const { acquireLocalIndexBuildLease } = await importDistModule(
			'cli/lib/local-index/builder-lease.js',
		);
		let secondAcquired = false;
		const secondLeasePromise = acquireLocalIndexBuildLease(projectPath, 'shared-request').then((lease) => {
			secondAcquired = true;
			return lease;
		});
		await delay(100);
		assert.equal(secondAcquired, false);

		writeFileSync(releasePath, 'release');
		const secondLease = await secondLeasePromise;
		assert.equal(secondLease.waitedForEquivalentBuild, true);
		secondLease.release();

		if (holder.exitCode === null) {
			await new Promise((resolve, reject) => {
				holder.once('error', reject);
				holder.once('exit', (code) => code === 0
					? resolve()
					: reject(new Error(`lease holder exited with code ${String(code)}`)));
			});
		} else {
			assert.equal(holder.exitCode, 0);
		}

		const leasePath = path.join(
			projectPath,
			'.mustflow',
			'cache',
			'local-index',
			'builder.lease',
		);
		mkdirSync(leasePath, { recursive: true });
		writeFileSync(
			path.join(leasePath, 'owner.json'),
			JSON.stringify({
				schema_version: '1',
				kind: 'local_index_builder_lease',
				owner_token: 'dead-owner',
				request_key: 'dead-request',
				pid: 2_147_483_647,
				process_start_token: 'dead-start-token',
				started_at: new Date(0).toISOString(),
			}),
		);

		const recoveredLease = await acquireLocalIndexBuildLease(projectPath, 'recovered-request');
		recoveredLease.release();
		assert.equal(existsSync(leasePath), false);
	} finally {
		holder?.kill();
		removeTempProject(projectPath);
	}
});

