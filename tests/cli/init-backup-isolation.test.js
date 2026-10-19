import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { test } from 'node:test';
import { fileURLToPath, pathToFileURL } from 'node:url';

const cliPath = fileURLToPath(new URL('../../dist/cli/index.js', import.meta.url));
const fixedTime = '2026-10-12T01:02:03.004Z';
const timestamp = fixedTime.replace(/[:.]/g, '-');

function fixture(initialArgs = []) {
	const root = mkdtempSync(path.join(tmpdir(), 'mustflow-backup-consumer-'));
	const preload = path.join(root, 'fixed-clock.mjs');
	writeFileSync(preload, `const NativeDate = Date;
globalThis.Date = class extends NativeDate {
	constructor(...args) { super(...(args.length ? args : [${JSON.stringify(fixedTime)}])); }
	static now() { return NativeDate.parse(${JSON.stringify(fixedTime)}); }
};
`);
	const run = (args, success = true, fault) => {
		const imports = ['--import', pathToFileURL(preload).href];
		if (fault) {
			const injection = path.join(root, 'fault.mjs');
			writeFileSync(injection, `import fs from 'node:fs';
import path from 'node:path';
import { syncBuiltinESMExports } from 'node:module';
const root = ${JSON.stringify(root)};
const fault = ${JSON.stringify(fault)};
const rename = fs.renameSync;
let failed = false;
let matchedWrites = 0;
fs.renameSync = (source, target) => {
  const relative = path.relative(root, String(target)).replaceAll('\\\\', '/');
  if (!failed && relative === fault.path && ++matchedWrites >= (fault.occurrence ?? 1)) {
    failed = true;
    if (fault.edit) fs.writeFileSync(path.join(root, 'AGENTS.md'), fault.edit);
    throw Object.assign(new Error('Injected init write failure'), { code: 'EACCES' });
  }
  if (failed && fault.failRecovery && relative === 'AGENTS.md') throw Object.assign(new Error('Injected init recovery failure'), { code: 'EACCES' });
  return rename(source, target);
};
syncBuiltinESMExports();
`);
			imports.push('--import', pathToFileURL(injection).href);
		}
		const result = spawnSync(process.execPath, [...imports, cliPath, 'init', '--yes', ...args],
			{ cwd: root, encoding: 'utf8', timeout: 15000 });
		if (success) assert.equal(result.status, 0, result.stderr || result.stdout);
		return result;
	};
	try { if (initialArgs !== null) run(initialArgs); } catch (error) { cleanup(root); throw error; }
	return { root, run, agentsPath: path.join(root, 'AGENTS.md'), backupsPath: path.join(root, '.mustflow/backups') };
}
function cleanup(root) {
	assert.equal(path.dirname(root), path.resolve(tmpdir()));
	assert.ok(path.basename(root).startsWith('mustflow-backup-consumer-'));
	rmSync(root, { recursive: true, force: true });
}

test('real init CLI keeps both recovery copies when force runs share the same timestamp', () => {
	const { root, run, agentsPath, backupsPath } = fixture();
	try {
		const versions = ['# Consumer rule A\nRetain the first recovery copy.\n', '# Consumer rule B\nRetain the second recovery copy.\n'];
		for (const content of versions) {
			writeFileSync(agentsPath, content);
			run(['--force', '--dry-run']);
			if (existsSync(backupsPath)) assert.equal(readdirSync(backupsPath).length, versions.indexOf(content));
			run(['--force']);
		}
		const directories = readdirSync(backupsPath);
		assert.equal(directories.length, 2, 'each overwrite must have its own recovery generation');
		const copies = directories.map(directory => readFileSync(path.join(backupsPath, directory, 'AGENTS.md'), 'utf8'));
		assert.deepEqual(copies.sort(), [...versions].sort());
		const firstCopy = directories.find(directory => readFileSync(path.join(backupsPath, directory, 'AGENTS.md'), 'utf8') === versions[0]);
		writeFileSync(agentsPath, readFileSync(path.join(backupsPath, firstCopy, 'AGENTS.md')));
		assert.equal(readFileSync(agentsPath, 'utf8'), versions[0]);
	} finally { cleanup(root); }
});

test('strict-to-simple migration preserves older recovery copies and the original policy', () => {
	const { root, run, agentsPath, backupsPath } = fixture(['--workflow', 'strict']);
	try {
		const configPath = path.join(root, '.mustflow/config/mustflow.toml');
		const configBefore = readFileSync(configPath, 'utf8');
		const existing = path.join(backupsPath, timestamp);
		const olderCopy = '# Earlier migration recovery copy\n';
		mkdirSync(existing, { recursive: true });
		writeFileSync(path.join(existing, 'AGENTS.md'), olderCopy);
		run(['--workflow', 'simple', '--merge']);
		assert.equal(readFileSync(path.join(existing, 'AGENTS.md'), 'utf8'), olderCopy);
		const generation = readdirSync(backupsPath).find(directory => directory !== timestamp);
		assert.ok(generation);
		assert.equal(readFileSync(path.join(backupsPath, generation, '.mustflow/config/mustflow.toml'), 'utf8'), configBefore);
		assert.match(readFileSync(configPath, 'utf8'), /mode = "simple"/);
		assert.doesNotMatch(readFileSync(agentsPath, 'utf8'), /skills\/router/);
	} finally { cleanup(root); }
});

test('force refuses linked backup directories before changing project rules', () => {
	const { root, run, agentsPath, backupsPath } = fixture();
	try {
		const archive = path.join(root, 'archive');
		mkdirSync(archive);
		symlinkSync(archive, backupsPath, process.platform === 'win32' ? 'junction' : 'dir');
		const current = '# Project rules must survive failed backup\n';
		writeFileSync(agentsPath, current);
		const result = run(['--force'], false);
		assert.notEqual(result.status, 0);
		assert.match(result.stderr + result.stdout, /symlinks/);
		assert.equal(readFileSync(agentsPath, 'utf8'), current);
		assert.deepEqual(readdirSync(archive), []);
	} finally { cleanup(root); }
});

test('real init CLI never overwrites a pre-existing timestamp recovery directory', () => {
	const { root, run, agentsPath, backupsPath } = fixture();
	try {
		const existing = path.join(backupsPath, timestamp), olderCopy = '# Earlier recovery copy\nKeep these bytes.\n';
		mkdirSync(existing, { recursive: true }); writeFileSync(path.join(existing, 'AGENTS.md'), olderCopy);
		const current = '# Current project rules\nKeep this separate.\n'; writeFileSync(agentsPath, current);
		run(['--force']);
		assert.equal(readFileSync(path.join(existing, 'AGENTS.md'), 'utf8'), olderCopy);
		const copies = readdirSync(backupsPath).map(directory => readFileSync(path.join(backupsPath, directory, 'AGENTS.md'), 'utf8'));
		assert.deepEqual(copies.sort(), [olderCopy, current].sort());
	} finally { cleanup(root); }
});

for (const scenario of [
	{ name: 'merge', args: ['--merge'], kind: 'directory' },
	{ name: 'merge', args: ['--merge'], kind: 'symlink' },
	{ name: 'force', args: ['--force'], kind: 'directory' },
	{ name: 'strict-to-simple migration', args: ['--workflow', 'simple', '--merge'], kind: 'directory' },
]) {
	test(`${scenario.name} rejects a manifest ${scenario.kind} before changing project files`, (t) => {
		const f = fixture(['--workflow', 'strict']);
		try {
			const lockPath = path.join(f.root, '.mustflow/config/manifest.lock.toml');
			writeFileSync(f.agentsPath, '# Consumer rules\nKeep these exact bytes.\n');
			writeFileSync(path.join(f.root, '.gitignore'), '# Consumer ignore rules\nlocal-cache/\n');
			const originals = new Map(['AGENTS.md', '.gitignore', '.mustflow/config/mustflow.toml', '.mustflow/config/preferences.toml']
				.map(relative => [relative, readFileSync(path.join(f.root, relative), 'utf8')]));
			rmSync(lockPath);
			let sentinel;
			if (scenario.kind === 'directory') {
				mkdirSync(lockPath);
				sentinel = path.join(lockPath, 'keep.txt');
				writeFileSync(sentinel, 'Do not change this target.\n');
			} else {
				sentinel = path.join(f.root, 'linked-lock.toml');
				writeFileSync(sentinel, 'Do not change this target.\n');
				try { symlinkSync(sentinel, lockPath, 'file'); }
				catch (error) {
					if (error.code !== 'EPERM') throw error;
					t.skip('file symlinks are unavailable');
					return;
				}
			}
			const result = f.run(scenario.args, false);
			assert.equal(result.status, 1);
			assert.match(result.stderr + result.stdout, /regular file|symlinks/);
			for (const [relative, original] of originals) {
				assert.equal(readFileSync(path.join(f.root, relative), 'utf8'), original, `${relative} must remain unchanged`);
			}
			assert.equal(readFileSync(sentinel, 'utf8'), 'Do not change this target.\n');
			assert.equal(existsSync(f.backupsPath), false, 'preflight must precede backup creation');
		} finally { cleanup(f.root); }
	});
}

test('failed init manifest write restores merged rules, preferences and newly created files', () => {
	const f = fixture(['--workflow', 'strict']);
	try {
		writeFileSync(f.agentsPath, '# Consumer rules\nKeep the original.\n');
		writeFileSync(path.join(f.root, '.gitignore'), '# Consumer ignore rules\nlocal-cache/\n');
		const originals = new Map(['AGENTS.md', '.gitignore', '.mustflow/config/preferences.toml', '.mustflow/config/manifest.lock.toml']
			.map(relative => [relative, readFileSync(path.join(f.root, relative), 'utf8')]));
		const created = path.join(f.root, '.mustflow/docs/agent-workflow.md');
		rmSync(created);
		const result = f.run(['--merge', '--set', 'git.auto_commit=true'], false, { path: '.mustflow/config/manifest.lock.toml' });
		assert.equal(result.status, 1);
		assert.match(result.stderr, /Injected init write failure/);
		for (const [relative, original] of originals) {
			assert.ok(readFileSync(path.join(f.root, relative), 'utf8') === original, `${relative} must roll back`);
		}
		assert.equal(existsSync(created), false, 'newly installed file must be removed');
		assert.match(result.stderr, /Init changes rolled back/);
		assert.equal(f.run(['--merge', '--set', 'git.auto_commit=true']).status, 0, 'clean retry must succeed');
	} finally { cleanup(f.root); }
});

test('failed migration restores the strict policy and its matching project rules', () => {
	const f = fixture(['--workflow', 'strict']);
	try {
		const originals = new Map(['AGENTS.md', '.mustflow/config/mustflow.toml', '.mustflow/config/manifest.lock.toml']
			.map(relative => [relative, readFileSync(path.join(f.root, relative), 'utf8')]));
		const result = f.run(['--workflow', 'simple', '--merge'], false, { path: '.mustflow/config/manifest.lock.toml' });
		assert.equal(result.status, 1);
		assert.match(result.stderr, /Init changes rolled back/);
		for (const [relative, original] of originals) assert.ok(readFileSync(path.join(f.root, relative), 'utf8') === original, `${relative} must roll back`);
		f.run(['--workflow', 'simple', '--merge']);
	} finally { cleanup(f.root); }
});

test('fresh init undoes the first preferences write when customizing the same file fails', () => {
	const f = fixture(null);
	try {
		const result = f.run(['--set', 'git.auto_commit=true'], false, { path: '.mustflow/config/preferences.toml', occurrence: 2 });
		assert.equal(result.status, 1);
		assert.match(result.stderr, /Injected init write failure/);
		assert.match(result.stderr, /Init changes rolled back/);
		for (const relative of ['AGENTS.md', '.gitignore', '.mustflow/config/mustflow.toml', '.mustflow/config/commands.toml', '.mustflow/config/preferences.toml', '.mustflow/config/manifest.lock.toml']) {
			assert.equal(existsSync(path.join(f.root, relative)), false, `${relative} must not remain installed`);
		}
		f.run(['--set', 'git.auto_commit=true']);
	} finally { cleanup(f.root); }
});

for (const fault of [{ edit: '# Concurrent user edit\nKeep this.\n' }, { failRecovery: true }]) {
	test(`init reports incomplete recovery and preserves originals when ${fault.edit ? 'a user edits concurrently' : 'restoring a file fails'}`, () => {
		const f = fixture(['--workflow', 'strict']);
		try {
			const original = '# Consumer rules\nKeep the backup.\n';
			writeFileSync(f.agentsPath, original);
			const result = f.run(['--merge'], false, { path: '.mustflow/config/manifest.lock.toml', ...fault });
			assert.equal(result.status, 1);
			assert.match(result.stderr, /Automatic recovery incomplete/);
			assert.ok(result.stderr.includes(f.backupsPath));
			const archive = path.join(f.backupsPath, readdirSync(f.backupsPath)[0]);
			assert.equal(readFileSync(path.join(archive, 'AGENTS.md'), 'utf8'), original);
			if (fault.edit) {
				assert.equal(readFileSync(f.agentsPath, 'utf8'), fault.edit);
				assert.match(result.stderr, /preserved for manual recovery/);
			} else assert.notEqual(readFileSync(f.agentsPath, 'utf8'), original);
		} finally { cleanup(f.root); }
	});
}
