import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { test } from 'node:test';
import { fileURLToPath, pathToFileURL } from 'node:url';

const repository = fileURLToPath(new URL('../..', import.meta.url));
const cli = path.join(repository, 'dist/cli/index.js');
const fixedTime = '2026-10-12T01:02:03.004Z';
const timestamp = fixedTime.replace(/[:.]/g, '-');

function cleanup(root) {
	assert.equal(path.dirname(root), path.resolve(tmpdir()));
	assert.ok(path.basename(root).startsWith('mustflow-update-backup-'));
	rmSync(root, { recursive: true, force: true });
}

function fixture() {
	const root = mkdtempSync(path.join(tmpdir(), 'mustflow-update-backup-'));
	const project = path.join(root, 'project');
	const template = path.join(root, 'template');
	const preload = path.join(root, 'clock.mjs');
	try {
		mkdirSync(project);
		cpSync(path.join(repository, 'templates/default'), template, { recursive: true });
		writeFileSync(preload, `const NativeDate = Date;
globalThis.Date = class extends NativeDate {
  constructor(...args) { super(...(args.length ? args : [${JSON.stringify(fixedTime)}])); }
  static now() { return NativeDate.parse(${JSON.stringify(fixedTime)}); }
};
`);
		const run = (args, success = true) => {
			const result = spawnSync(process.execPath, ['--import', pathToFileURL(preload).href, cli, ...args], {
				cwd: project, encoding: 'utf8', timeout: 15000,
				env: { ...process.env, MUSTFLOW_DEV_TEMPLATE_ROOT: template, MUSTFLOW_ALLOW_DEV_TEMPLATE_ROOT: '1' },
			});
			if (success) assert.equal(result.status, 0, result.stderr || result.stdout);
			return result;
		};
		run(['init', '--yes', '--workflow', 'strict']);
		const agents = path.join(project, 'AGENTS.md');
		return { root, project, template, run, agents, original: readFileSync(agents, 'utf8'),
			source: path.join(template, 'locales/en/AGENTS.md'), backups: path.join(project, '.mustflow/backups') };
	} catch (error) { cleanup(root); throw error; }
}

test('real update CLI preserves each recovery generation at the same timestamp', () => {
	const f = fixture();
	try {
		const first = `${f.original}\n<!-- template revision one -->\n`;
		const second = `${f.original}\n<!-- template revision two -->\n`;
		for (const [index, content] of [first, second].entries()) {
			writeFileSync(f.source, content);
			const plan = JSON.parse(f.run(['update', '--dry-run', '--json']).stdout);
			assert.equal(plan.summary.wouldUpdate, 1);
			assert.equal(existsSync(f.backups) ? readdirSync(f.backups).length : 0, index);
			f.run(['update', '--apply']);
			assert.equal(readFileSync(f.agents, 'utf8'), content);
		}
		const directories = readdirSync(f.backups);
		assert.equal(directories.length, 2);
		const copies = directories.map(directory => readFileSync(path.join(f.backups, directory, 'AGENTS.md'), 'utf8'));
		assert.deepEqual(copies.sort(), [f.original, first].sort());
		const unchanged = JSON.parse(f.run(['update', '--apply', '--json']).stdout);
		assert.equal(unchanged.wroteFiles, false);
		assert.equal(readdirSync(f.backups).length, 2);
	} finally { cleanup(f.root); }
});

test('real update CLI preserves an existing recovery directory before replacing files', () => {
	const f = fixture();
	try {
		const archive = path.join(f.backups, timestamp);
		const previous = '# Recovery from an earlier operation\n';
		mkdirSync(archive, { recursive: true });
		writeFileSync(path.join(archive, 'AGENTS.md'), previous);
		writeFileSync(f.source, `${f.original}\n<!-- updated template -->\n`);
		f.run(['update', '--apply', '--json']);
		assert.equal(readFileSync(path.join(archive, 'AGENTS.md'), 'utf8'), previous);
		const copies = readdirSync(f.backups).map(directory => readFileSync(path.join(f.backups, directory, 'AGENTS.md'), 'utf8'));
		assert.deepEqual(copies.sort(), [previous, f.original].sort());
	} finally { cleanup(f.root); }
});

test('real update CLI rejects a linked backup parent before modifying installed files', () => {
	const f = fixture();
	try {
		const archive = path.join(f.root, 'archive');
		mkdirSync(archive);
		symlinkSync(archive, f.backups, process.platform === 'win32' ? 'junction' : 'dir');
		const lockPath = path.join(f.project, '.mustflow/config/manifest.lock.toml');
		const lockBefore = readFileSync(lockPath, 'utf8');
		writeFileSync(f.source, `${f.original}\n<!-- updated template -->\n`);
		const result = f.run(['update', '--apply'], false);
		assert.notEqual(result.status, 0);
		assert.match(result.stderr + result.stdout, /symlinks/);
		assert.equal(readFileSync(f.agents, 'utf8'), f.original);
		assert.equal(readFileSync(lockPath, 'utf8'), lockBefore);
		assert.deepEqual(readdirSync(archive), []);
	} finally { cleanup(f.root); }
});

test('update recovery restores installed content and its matching manifest baseline', () => {
	const f = fixture();
	try {
		const lockPath = path.join(f.project, '.mustflow/config/manifest.lock.toml');
		const lockBefore = readFileSync(lockPath, 'utf8');
		writeFileSync(f.source, `${f.original}\n<!-- updated template -->\n`);
		f.run(['update', '--apply', '--json']);
		const archive = path.join(f.backups, readdirSync(f.backups)[0]);
		assert.equal(readFileSync(path.join(archive, '.mustflow/config/manifest.lock.toml'), 'utf8'), lockBefore);
		writeFileSync(f.agents, readFileSync(path.join(archive, 'AGENTS.md')));
		writeFileSync(lockPath, readFileSync(path.join(archive, '.mustflow/config/manifest.lock.toml')));
		writeFileSync(f.source, f.original);
		const restored = JSON.parse(f.run(['update', '--dry-run', '--json']).stdout);
		assert.equal(restored.ok, true);
		assert.equal(restored.summary.blockedLocalChanges, 0);
		assert.equal(restored.summary.unchanged, restored.items.length);
		writeFileSync(f.source, `${f.original}\n<!-- next template revision -->\n`);
		const retry = JSON.parse(f.run(['update', '--apply', '--json']).stdout);
		assert.equal(retry.ok, true);
		assert.equal(retry.summary.wouldUpdate, 1);
		assert.equal(readdirSync(f.backups).length, 2);
	} finally { cleanup(f.root); }
});

test('create-only updates preserve the manifest while unchanged updates create no backup', () => {
	const f = fixture();
	try {
		const unchanged = JSON.parse(f.run(['update', '--apply', '--json']).stdout);
		assert.equal(unchanged.wroteFiles, false);
		assert.equal(existsSync(f.backups), false);
		const lockPath = path.join(f.project, '.mustflow/config/manifest.lock.toml');
		const lockBefore = readFileSync(lockPath, 'utf8');
		const manifestPath = path.join(f.template, 'manifest.toml');
		const relativePath = '.mustflow/docs/added-guide.md';
		const manifest = readFileSync(manifestPath, 'utf8');
		const modified = manifest.replace('  ".mustflow/docs/agent-workflow.md",',
			`  ".mustflow/docs/agent-workflow.md",\n  "${relativePath}",`);
		assert.notEqual(modified, manifest);
		writeFileSync(manifestPath, modified);
		const source = path.join(f.template, 'common', relativePath);
		mkdirSync(path.dirname(source), { recursive: true });
		writeFileSync(source, '# Added guide\n');
		const result = JSON.parse(f.run(['update', '--apply', '--json']).stdout);
		assert.equal(result.summary.wouldCreate, 1);
		assert.equal(result.summary.wouldUpdate, 0);
		const archive = path.join(f.backups, readdirSync(f.backups)[0]);
		assert.equal(readFileSync(path.join(archive, '.mustflow/config/manifest.lock.toml'), 'utf8'), lockBefore);
		assert.equal(existsSync(path.join(archive, relativePath)), false);
		assert.equal(readFileSync(path.join(f.project, relativePath), 'utf8'), '# Added guide\n');
	} finally { cleanup(f.root); }
});
