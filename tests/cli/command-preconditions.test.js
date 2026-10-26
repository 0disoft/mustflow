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
