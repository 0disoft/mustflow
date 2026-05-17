import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import {
	existsSync,
	mkdirSync,
	mkdtempSync,
	readFileSync,
	readdirSync,
	renameSync,
	rmSync,
	statSync,
	writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { cliPath, cloneProjectFixture, initProject, projectRoot, runCli } from './cli-harness.js';
import { profileOperationAsync } from './ops-profiler.js';

const fixtureCacheRoot = path.join(tmpdir(), 'mustflow-test-fixtures', 'indexed-projects');
const fixtureCacheSchemaVersion = 1;
const cachedIndexedFixtures = new Map();

export async function importDistModule(relativePath) {
	return import(pathToFileURL(path.join(projectRoot, 'dist', ...relativePath.split('/'))).href);
}

export async function createLocalIndexDirect(projectPath, options = {}) {
	return profileOperationAsync('local_index_direct_create', { projectPath, options }, async () => {
		const { createLocalIndex } = await importDistModule('cli/lib/local-index.js');
		return createLocalIndex(projectPath, options);
	});
}

export async function searchLocalIndexDirect(projectPath, query, options = {}) {
	return profileOperationAsync('local_index_direct_search', { projectPath, query, options }, async () => {
		const { searchLocalIndex } = await importDistModule('cli/lib/local-index.js');
		return searchLocalIndex(projectPath, query, options);
	});
}

export async function readLatestLocalVerificationReadModelQueriesDirect(projectPath) {
	return profileOperationAsync('local_index_verification_read_model_latest', { projectPath }, async () => {
		const { readLatestLocalVerificationReadModelQueries } = await importDistModule('cli/lib/local-index.js');
		return readLatestLocalVerificationReadModelQueries(projectPath);
	});
}

export function indexProject(projectPath, args = [], options = {}) {
	const result = runCli(projectPath, ['index', ...args, '--json'], options);
	assert.equal(result.status, 0, result.stderr || result.stdout);
	return JSON.parse(result.stdout);
}

export function getCachedIndexedProjectFixture(options = {}) {
	const variant = options.variant ?? 'workflow';
	const indexArgs = options.indexArgs ?? [];
	const indexOptions = options.indexOptions ?? {};
	const prepare = options.prepare ?? null;
	const prepareKey = options.prepareKey ?? null;
	const descriptor = cachedIndexedProjectDescriptor({ variant, indexArgs, indexOptions, prepareKey });

	if (cachedIndexedFixtures.has(descriptor)) {
		return cachedIndexedFixtures.get(descriptor);
	}

	const key = cachedIndexedProjectKey(descriptor);
	const cachePath = path.join(fixtureCacheRoot, key, 'project');
	const markerPath = path.join(fixtureCacheRoot, key, 'fixture.json');

	// Keep the cached project immutable; every test gets its own timestamp-preserving clone.
	if (isCachedIndexedProjectReady(cachePath, markerPath, key)) {
		const marker = readCachedIndexedProject(markerPath);
		cachedIndexedFixtures.set(descriptor, marker);
		return marker;
	}

	mkdirSync(path.dirname(cachePath), { recursive: true });
	const stagingPath = mkdtempSync(path.join(path.dirname(cachePath), 'staging-'));

	try {
		initProject(stagingPath);
		if (prepare) {
			prepare(stagingPath);
		}
		const indexOutput = indexProject(stagingPath, indexArgs, indexOptions);
		const marker = {
			schemaVersion: fixtureCacheSchemaVersion,
			key,
			variant,
			indexArgs,
			prepareKey,
			indexOptionsSummary: summarizeIndexOptions(indexOptions),
			indexOutput,
			projectPath: cachePath,
		};

		try {
			renameSync(stagingPath, cachePath);
			writeFileSync(markerPath, `${JSON.stringify(marker, null, 2)}\n`);
			cachedIndexedFixtures.set(descriptor, marker);
			return marker;
		} catch (error) {
			rmSync(stagingPath, { recursive: true, force: true });
			const racedCache = waitForCachedIndexedProject(cachePath, markerPath, key);

			if (racedCache) {
				cachedIndexedFixtures.set(descriptor, racedCache);
				return racedCache;
			}

			rmSync(cachePath, { recursive: true, force: true });
			throw error;
		}
	} catch (error) {
		rmSync(stagingPath, { recursive: true, force: true });
		throw error;
	}
}

export function cloneCachedIndexedProjectFixture(options = {}, prefix = 'mustflow-indexed-cache-') {
	const fixture = getCachedIndexedProjectFixture(options);
	return cloneProjectFixture(fixture.projectPath, prefix);
}

export async function withProcessArgvEntrypoint(fn) {
	const previousArgv = process.argv;
	process.argv = [process.execPath, cliPath];
	try {
		return await fn();
	} finally {
		process.argv = previousArgv;
	}
}

function cachedIndexedProjectDescriptor({ variant, indexArgs, indexOptions, prepareKey }) {
	return JSON.stringify({
		schemaVersion: fixtureCacheSchemaVersion,
		variant,
		indexArgs,
		prepareKey,
		indexOptions: summarizeIndexOptions(indexOptions),
		nodeMajor: process.versions.node.split('.')[0],
		platform: process.platform,
	});
}

function cachedIndexedProjectKey(descriptor) {
	const hash = createHash('sha256');
	hash.update(descriptor);

	hashPath(hash, path.join(projectRoot, 'package.json'));
	hashPath(hash, path.join(projectRoot, 'dist', 'cli', 'index.js'));
	hashPath(hash, path.join(projectRoot, 'dist', 'cli', 'commands', 'init.js'));
	hashPath(hash, path.join(projectRoot, 'dist', 'cli', 'commands', 'index.js'));
	hashPath(hash, path.join(projectRoot, 'dist', 'cli', 'lib', 'local-index.js'));
	hashDirectory(hash, path.join(projectRoot, 'dist', 'cli', 'lib', 'local-index'));
	hashDirectory(hash, path.join(projectRoot, 'templates', 'default'));

	return hash.digest('hex').slice(0, 24);
}

function summarizeIndexOptions(options) {
	const env = options.env ?? {};

	return {
		env: Object.fromEntries(
			Object.entries(env)
				.filter(([key]) => key.startsWith('MUSTFLOW_TEST_'))
				.sort(([left], [right]) => left.localeCompare(right)),
		),
	};
}

function hashPath(hash, filePath) {
	hash.update(filePath);
	hash.update('\0');
	hash.update(readFileSync(filePath));
	hash.update('\0');
}

function hashDirectory(hash, directoryPath) {
	for (const entry of readdirSync(directoryPath, { withFileTypes: true }).sort((left, right) =>
		left.name.localeCompare(right.name),
	)) {
		const entryPath = path.join(directoryPath, entry.name);

		if (entry.isDirectory()) {
			hash.update(`dir:${path.relative(projectRoot, entryPath)}`);
			hashDirectory(hash, entryPath);
			continue;
		}

		if (entry.isFile()) {
			hash.update(`file:${path.relative(projectRoot, entryPath)}`);
			hash.update(String(statSync(entryPath).size));
			hash.update('\0');
			hash.update(readFileSync(entryPath));
			hash.update('\0');
		}
	}
}

function isCachedIndexedProjectReady(cachePath, markerPath, key) {
	if (!existsSync(cachePath) || !existsSync(markerPath)) {
		return false;
	}

	try {
		const marker = readCachedIndexedProject(markerPath);
		return marker.schemaVersion === fixtureCacheSchemaVersion && marker.key === key && marker.projectPath === cachePath;
	} catch {
		return false;
	}
}

function readCachedIndexedProject(markerPath) {
	return JSON.parse(readFileSync(markerPath, 'utf8'));
}

function waitForCachedIndexedProject(cachePath, markerPath, key) {
	const deadline = Date.now() + 5000;

	while (Date.now() < deadline) {
		if (isCachedIndexedProjectReady(cachePath, markerPath, key)) {
			return readCachedIndexedProject(markerPath);
		}

		sleepSync(50);
	}

	return null;
}

function sleepSync(milliseconds) {
	Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, milliseconds);
}
