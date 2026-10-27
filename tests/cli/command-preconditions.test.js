import assert from 'node:assert/strict';
import fs from 'node:fs';
import { syncBuiltinESMExports } from 'node:module';
import path from 'node:path';
import { test } from 'node:test';
import { evaluateCommandPreconditions } from '../../dist/core/command-preconditions.js';
import { createTempProject, removeTempProject } from './helpers/cli-harness.js';

function writeDatedFile(root, relative, year) {
	const target = path.join(root, relative);
	fs.mkdirSync(path.dirname(target), { recursive: true });
	fs.writeFileSync(target, 'fixture\n');
	const timestamp = new Date(`${year}-01-01T00:00:00Z`);
	fs.utimesSync(target, timestamp, timestamp);
}

function freshness(root, sources = ['packages/**/*.ts']) {
	return evaluateCommandPreconditions(root, { intents: { check: { preconditions: [
		{ kind: 'artifact_freshness', artifact: 'artifact.js', sources },
	] } } }, 'check')[0];
}

test('freshness limits directory reads to declared source scopes', (t) => {
	const root = createTempProject('mustflow-freshness-scopes-');
	const readdir = fs.readdirSync;
	try {
		writeDatedFile(root, 'artifact.js', 2021);
		writeDatedFile(root, 'src/index.ts', 2020);
		writeDatedFile(root, 'tsconfig.json', 2020);
		for (let index = 0; index < 200; index++) {
			writeDatedFile(root, `docs/section-${index}/guide.md`, 2022);
		}
		let directoryReads = 0;
		let entriesVisited = 0;
		fs.readdirSync = (...args) => {
			directoryReads++;
			const entries = readdir(...args);
			entriesVisited += entries.length;
			return entries;
		};
		syncBuiltinESMExports();
		const result = freshness(root, ['src/**', 'tsconfig*.json']);
		t.diagnostic(JSON.stringify({ directoryReads, entriesVisited, status: result.status }));
		assert.equal(result.status, 'satisfied');
		assert.match(result.detail, /2 matched source file/);
		assert.equal(directoryReads, 2);
		assert.equal(entriesVisited, 5);
	} finally {
		fs.readdirSync = readdir;
		syncBuiltinESMExports();
		removeTempProject(root);
	}
});

test('freshness prunes nested dependencies before directory reads and source stats', (t) => {
	const root = createTempProject('mustflow-freshness-pruning-');
	const readdir = fs.readdirSync;
	const stat = fs.statSync;
	try {
		writeDatedFile(root, 'artifact.js', 2021);
		writeDatedFile(root, 'packages/app/src/index.ts', 2020);
		for (let index = 0; index < 200; index++) {
			writeDatedFile(root, `packages/app/node_modules/vendor-${index}/index.ts`, 2022);
		}
		let directoryReads = 0;
		let fileStats = 0;
		fs.readdirSync = (...args) => { directoryReads++; return readdir(...args); };
		fs.statSync = (...args) => { fileStats++; return stat(...args); };
		syncBuiltinESMExports();
		const result = freshness(root);
		t.diagnostic(JSON.stringify({ directoryReads, fileStats, status: result.status, newestSource: result.newestSource }));
		assert.equal(result.status, 'satisfied');
		assert.equal(result.newestSource, 'packages/app/src/index.ts');
		assert.equal(directoryReads, 4);
		assert.equal(fileStats, 2);
	} finally {
		fs.readdirSync = readdir;
		fs.statSync = stat;
		syncBuiltinESMExports();
		removeTempProject(root);
	}
});

test('freshness applies existing ignored directory names at root and nested package depths', () => {
	const root = createTempProject('mustflow-freshness-ignored-');
	try {
		writeDatedFile(root, 'artifact.js', 2021);
		writeDatedFile(root, 'packages/app/src/index.ts', 2020);
		for (const prefix of ['', 'packages/app/', 'packages/app/deep/']) {
			for (const name of ['.git', 'node_modules', 'dist', 'coverage', '.next', '.turbo']) {
				writeDatedFile(root, `${prefix}${name}/generated.ts`, 2022);
			}
		}
		for (const relative of ['.mustflow/state/run-x/receipt.ts', '.mustflow/cache/entry.ts']) {
			writeDatedFile(root, relative, 2022);
		}
		assert.equal(freshness(root, ['**/*.ts']).status, 'satisfied');
	} finally {
		removeTempProject(root);
	}
});

test('freshness still detects source edits and does not exclude similar directory names', () => {
	const root = createTempProject('mustflow-freshness-sources-');
	try {
		writeDatedFile(root, 'artifact.js', 2021);
		for (const name of ['node_modules-tools', 'dist-src', 'coverage-tools']) {
			writeDatedFile(root, `packages/${name}/source.ts`, 2022);
			const result = freshness(root, [`packages/${name}/**/*.ts`]);
			assert.equal(result.status, 'stale');
			assert.equal(result.newestSource, `packages/${name}/source.ts`);
		}
	} finally {
		removeTempProject(root);
	}
});

test('freshness preserves literal, wildcard, recursive and unmatched source selection', () => {
	const root = createTempProject('mustflow-freshness-globs-');
	try {
		writeDatedFile(root, 'artifact.js', 2021);
		for (const [file, year] of [
			['src/index.ts', 2020], ['src/deep/entry.ts', 2022],
			['src/deep/nested/last.ts', 2020], ['src-sibling/entry.ts', 2022],
			['packages/app/src/entry.ts', 2022], ['assets/input.txt', 2020],
		]) {
			writeDatedFile(root, file, year);
		}
		for (const [sources, status, count] of [
			[['src/*.ts'], 'satisfied', 1], [['src/?ndex.ts'], 'satisfied', 1],
			[['src/**/entry.ts'], 'stale', 1], [['src/**/*.ts'], 'stale', 3],
			[['packages/*/src/*.ts'], 'stale', 1], [['**/entry.ts'], 'stale', 3],
			[['**/*.ts'], 'stale', 5], [['**entry.ts'], 'stale', 3],
			[['src/deep/entry.ts'], 'stale', 1], [['assets/input.txt'], 'satisfied', 1],
			[['tsconfig*.json'], 'unknown', 0], [['src/missing/**/*.ts'], 'unknown', 0],
			[['src/../assets/*'], 'unknown', 0], [['src/*', 'src/deep/entry.ts'], 'stale', 2],
		]) {
			const observed = [];
			const stat = fs.statSync;
			fs.statSync = (file, ...args) => {
				if (file !== path.join(root, 'artifact.js')) observed.push(file);
				return stat(file, ...args);
			};
			syncBuiltinESMExports();
			try {
				const result = freshness(root, sources);
				assert.equal(result.status, status, JSON.stringify(sources));
				assert.equal(observed.length, count, JSON.stringify(sources));
			} finally {
				fs.statSync = stat;
				syncBuiltinESMExports();
			}
		}
	} finally {
		removeTempProject(root);
	}
});

test('freshness shares one walk across the union of all precondition source scopes', () => {
	const root = createTempProject('mustflow-freshness-union-');
	const readdir = fs.readdirSync;
	try {
		writeDatedFile(root, 'artifact.js', 2021);
		writeDatedFile(root, 'src/index.ts', 2020);
		writeDatedFile(root, 'assets/input.txt', 2022);
		let directoryReads = 0;
		fs.readdirSync = (...args) => { directoryReads++; return readdir(...args); };
		syncBuiltinESMExports();
		const results = evaluateCommandPreconditions(root, { intents: { check: { preconditions: [
			{ kind: 'artifact_freshness', artifact: 'artifact.js', sources: ['src/**'] },
			{ kind: 'artifact_freshness', artifact: 'artifact.js', sources: ['assets/**'] },
		] } } }, 'check');
		assert.deepEqual(results.map((result) => result.status), ['satisfied', 'stale']);
		assert.deepEqual(results.map((result) => result.newestSource), ['src/index.ts', 'assets/input.txt']);
		assert.equal(directoryReads, 3);
	} finally {
		fs.readdirSync = readdir;
		syncBuiltinESMExports();
		removeTempProject(root);
	}
});
