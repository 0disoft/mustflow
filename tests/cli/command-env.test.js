import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import { mkdirSync } from 'node:fs';
import { syncBuiltinESMExports } from 'node:module';
import path from 'node:path';
import { test } from 'node:test';
import { createCommandEnv } from '../../dist/core/command-env.js';
import { createTempProject, removeTempProject } from './helpers/cli-harness.js';

test('PATH filtering bounds filesystem probes by unique paths and refreshes them for each environment', (t) => {
	const root = createTempProject('mustflow-env-path-probes-');
	const originalExists = fs.existsSync;
	const originalRealpath = fs.realpathSync.native;
	try {
		const localBin = path.join(root, 'node_modules', '.bin');
		const safePaths = Array.from({ length: 64 }, (_, index) => path.join(root, `tools-${index}`));
		for (const directory of [localBin, ...safePaths]) mkdirSync(directory, { recursive: true });
		const entries = [...safePaths, localBin, ...safePaths, 'node_modules/.bin'];
		const source = Object.freeze({ PATH: entries.join(path.delimiter) });
		const expected = [...safePaths, ...safePaths].join(path.delimiter);
		const resolution = { policy: 'inherit', allowlist: [] };
		const samples = [];
		for (let attempt = 0; attempt < 2; attempt += 1) {
			let existsCalls = 0;
			let realpathCalls = 0;
			fs.existsSync = (...args) => { existsCalls += 1; return originalExists(...args); };
			fs.realpathSync.native = (...args) => { realpathCalls += 1; return originalRealpath(...args); };
			syncBuiltinESMExports();
			assert.equal(createCommandEnv(root, resolution, source).PATH, expected);
			samples.push({ existsCalls, realpathCalls });
		}
		t.diagnostic(JSON.stringify({ pathEntries: entries.length, samples }));
		// A relative entry may also be resolved against the process cwd on a non-match.
		const maximumUniquePaths = safePaths.length + 2;
		for (const sample of samples) {
			assert.ok(sample.existsCalls <= maximumUniquePaths, `redundant existence probes: ${sample.existsCalls}`);
			assert.ok(sample.realpathCalls <= maximumUniquePaths, `redundant realpath probes: ${sample.realpathCalls}`);
			assert.ok(sample.realpathCalls >= safePaths.length + 1, 'a later environment must refresh filesystem state');
		}
	} finally {
		fs.existsSync = originalExists;
		fs.realpathSync.native = originalRealpath;
		syncBuiltinESMExports();
		removeTempProject(root);
	}
});

test('Windows child environment cannot retain a local bin through a second PATH casing', {
	skip: process.platform !== 'win32',
}, (t) => {
	const root = createTempProject('mustflow-env-native-path-');
	try {
		const localBin = path.join(root, 'node_modules', '.bin');
		mkdirSync(localBin, { recursive: true });
		const dirtyPath = `${localBin}${path.delimiter}${path.dirname(process.execPath)}`;
		const source = { SystemRoot: process.env.SystemRoot, Path: dirtyPath, PATH: dirtyPath };
		const env = createCommandEnv(root, { policy: 'inherit', allowlist: [] }, source);
		const child = spawnSync(process.execPath, ['-e', 'console.log(JSON.stringify(process.env.PATH))'], {
			env, encoding: 'utf8', windowsHide: true, timeout: 10_000,
		});
		assert.equal(child.status, 0, child.stderr || child.error?.message);
		const effectivePath = JSON.parse(child.stdout);
		const unsafeEntries = effectivePath.split(path.delimiter).filter((entry) => entry === localBin).length;
		t.diagnostic(JSON.stringify({ unsafeEntriesInChildPath: unsafeEntries }));
		assert.equal(unsafeEntries, 0);
	} finally {
		removeTempProject(root);
	}
});

test('Windows PATH aliases are all sanitized for every environment policy and insertion order', {
	skip: process.platform !== 'win32',
}, () => {
	const root = createTempProject('mustflow-env-path-aliases-');
	try {
		const localBin = path.join(root, 'node_modules', '.bin');
		mkdirSync(localBin, { recursive: true });
		const safePath = path.dirname(process.execPath);
		const orders = [
			['Path', 'PATH', 'pAtH'], ['Path', 'pAtH', 'PATH'], ['PATH', 'Path', 'pAtH'],
			['PATH', 'pAtH', 'Path'], ['pAtH', 'Path', 'PATH'], ['pAtH', 'PATH', 'Path'],
		];
		for (const policy of ['inherit', 'minimal', 'allowlist']) {
			for (const order of orders) {
				const source = Object.freeze(Object.fromEntries(order.map((key) => [key, `${localBin}${path.delimiter}${safePath}`])));
				const env = createCommandEnv(root, { policy, allowlist: order }, source);
				const pathKeys = Object.keys(env).filter((key) => key.toLowerCase() === 'path');
				assert.ok(pathKeys.length > 0, `${policy}: safe PATH must remain available`);
				for (const key of pathKeys) {
					assert.equal(env[key], safePath, `${policy}: ${order.join(',')}: ${key}`);
				}
				for (const key of order) assert.ok(source[key].startsWith(localBin));
			}
		}
		for (const empty of ['', undefined]) {
			const source = { Path: empty, PATH: `${localBin}${path.delimiter}${safePath}` };
			assert.deepEqual(createCommandEnv(root, { policy: 'inherit', allowlist: [] }, source),
				{ Path: empty, PATH: safePath });
		}
	} finally {
		removeTempProject(root);
	}
});

test('PATH sanitization preserves safe entries, unrelated variables and empty environments', () => {
	const root = createTempProject('mustflow-env-single-path-');
	try {
		const localBin = path.join(root, 'node_modules', '.bin');
		mkdirSync(localBin, { recursive: true });
		const safePath = path.dirname(process.execPath);
		const source = Object.freeze({ PATH: [localBin, 'node_modules/.bin', '', safePath].join(path.delimiter), KEEP: 'fixture' });
		const resolution = { policy: 'inherit', allowlist: [] };
		assert.deepEqual(createCommandEnv(root, resolution, source), { PATH: safePath, KEEP: 'fixture' });
		assert.deepEqual(createCommandEnv(root, resolution, {}), {});
		assert.deepEqual(createCommandEnv(root, resolution, { PATH: '' }), { PATH: '' });
	} finally {
		removeTempProject(root);
	}
});
