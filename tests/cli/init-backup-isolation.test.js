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
	const run = (args, success = true) => {
		const result = spawnSync(process.execPath, ['--import', pathToFileURL(preload).href, cliPath, 'init', '--yes', ...args],
			{ cwd: root, encoding: 'utf8', timeout: 15000 });
		if (success) assert.equal(result.status, 0, result.stderr || result.stdout);
		return result;
	};
	try { run(initialArgs); } catch (error) { cleanup(root); throw error; }
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
