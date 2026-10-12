import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
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
		const run = (args, success = true, fault) => {
			const imports = ['--import', pathToFileURL(preload).href];
			if (fault) {
				const injection = path.join(root, 'fault.mjs');
				writeFileSync(injection, `import fs from 'node:fs';
import path from 'node:path';
import { syncBuiltinESMExports } from 'node:module';
const rename = fs.renameSync;
const root = ${JSON.stringify(project)};
const fault = ${JSON.stringify(fault)};
let failed = false;
fs.renameSync = (source, target) => {
  const relative = path.relative(root, String(target)).replaceAll('\\\\', '/');
  if (!failed && relative === fault.path) {
    failed = true;
    if (fault.edit) fs.writeFileSync(path.join(root, 'AGENTS.md'), fault.edit);
    throw Object.assign(new Error('Injected update failure'), { code: 'EACCES' });
  }
  if (failed && fault.failRecovery && relative === 'AGENTS.md') {
    throw Object.assign(new Error('Injected recovery failure'), { code: 'EACCES' });
  }
  return rename(source, target);
};
syncBuiltinESMExports();
`);
				imports.push('--import', pathToFileURL(injection).href);
			}
			const result = spawnSync(process.execPath, [...imports, cli, ...args], {
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

test('failed second write restores the first update and allows a clean retry', () => {
	const f = fixture();
	try {
		const workflow = '.mustflow/docs/agent-workflow.md';
		const workflowSource = path.join(f.template, 'locales/en', workflow);
		const workflowTarget = path.join(f.project, workflow);
		const originalWorkflow = readFileSync(workflowTarget, 'utf8');
		const lockPath = path.join(f.project, '.mustflow/config/manifest.lock.toml');
		const originalLock = readFileSync(lockPath, 'utf8');
		writeFileSync(f.source, `${f.original}\n<!-- updated template -->\n`);
		writeFileSync(workflowSource, `${originalWorkflow}\n<!-- updated workflow -->\n`);
		const result = f.run(['update', '--apply'], false, { path: workflow });
		assert.equal(result.status, 1);
		assert.ok(readFileSync(f.agents, 'utf8') === f.original, 'the first file must roll back');
		assert.ok(readFileSync(workflowTarget, 'utf8') === originalWorkflow);
		assert.equal(readFileSync(lockPath, 'utf8'), originalLock);
		const retry = JSON.parse(f.run(['update', '--apply', '--json']).stdout);
		assert.equal(retry.ok, true);
		assert.equal(retry.summary.wouldUpdate, 2);
	} finally { cleanup(f.root); }
});

test('failed manifest write restores replacements and removals and undoes newly created files', () => {
	const f = fixture();
	try {
		const legacy = '.mustflow/skills/catalog.v1.json';
		const legacyContent = '{"schema_version":"1","routes":[]}\n';
		const lockPath = path.join(f.project, '.mustflow/config/manifest.lock.toml');
		mkdirSync(path.dirname(path.join(f.project, legacy)), { recursive: true });
		writeFileSync(path.join(f.project, legacy), legacyContent);
		const hash = `sha256:${createHash('sha256').update(legacyContent).digest('hex')}`;
		const originalLock = readFileSync(lockPath, 'utf8') + `\n[files."${legacy}"]\nsource = "template_common"\nlast_action = "copied"\ncontent_hash = "${hash}"\n`;
		writeFileSync(lockPath, originalLock);
		writeFileSync(f.source, `${f.original}\n<!-- updated template -->\n`);
		const added = '.mustflow/docs/added-guide.md';
		const manifestPath = path.join(f.template, 'manifest.toml');
		writeFileSync(manifestPath, readFileSync(manifestPath, 'utf8').replace('  ".mustflow/docs/agent-workflow.md",',
			`  ".mustflow/docs/agent-workflow.md",\n  "${added}",`));
		const source = path.join(f.template, 'common', added);
		mkdirSync(path.dirname(source), { recursive: true });
		writeFileSync(source, '# Added guide\n');
		const result = f.run(['update', '--apply'], false, { path: '.mustflow/config/manifest.lock.toml' });
		assert.equal(result.status, 1);
		assert.ok(readFileSync(f.agents, 'utf8') === f.original, 'updated file must roll back');
		assert.equal(existsSync(path.join(f.project, added)), false, 'new file must be removed');
		assert.equal(readFileSync(path.join(f.project, legacy), 'utf8'), legacyContent);
		assert.equal(readFileSync(lockPath, 'utf8'), originalLock);
		const retry = JSON.parse(f.run(['update', '--apply', '--json']).stdout);
		assert.equal(retry.ok, true);
		assert.equal(retry.summary.wouldUpdate, 1);
		assert.equal(retry.summary.wouldCreate, 1);
		assert.equal(retry.summary.wouldRemove, 1);
	} finally { cleanup(f.root); }
});

test('incomplete recovery reports its backup and preserves recoverable originals', () => {
	const f = fixture();
	try {
		const workflow = '.mustflow/docs/agent-workflow.md';
		const workflowSource = path.join(f.template, 'locales/en', workflow);
		writeFileSync(f.source, `${f.original}\n<!-- updated template -->\n`);
		writeFileSync(workflowSource, `${readFileSync(workflowSource, 'utf8')}\n<!-- update -->\n`);
		const result = f.run(['update', '--apply'], false, { path: workflow, failRecovery: true });
		assert.equal(result.status, 1);
		assert.match(result.stderr, /Automatic recovery incomplete/);
		assert.match(result.stderr, /AGENTS\.md/);
		assert.ok(result.stderr.includes(f.backups));
		const archive = path.join(f.backups, readdirSync(f.backups)[0]);
		assert.ok(readFileSync(path.join(archive, 'AGENTS.md'), 'utf8') === f.original);
		assert.ok(readFileSync(f.agents, 'utf8') !== f.original);
	} finally { cleanup(f.root); }
});

test('recovery preserves a concurrent user edit instead of overwriting it', () => {
	const f = fixture();
	try {
		const workflow = '.mustflow/docs/agent-workflow.md';
		const workflowSource = path.join(f.template, 'locales/en', workflow);
		const userEdit = '# Concurrent user rules\nKeep this change.\n';
		writeFileSync(f.source, `${f.original}\n<!-- updated template -->\n`);
		writeFileSync(workflowSource, `${readFileSync(workflowSource, 'utf8')}\n<!-- update -->\n`);
		const result = f.run(['update', '--apply'], false, { path: workflow, edit: userEdit });
		assert.equal(result.status, 1);
		assert.match(result.stderr, /Automatic recovery incomplete/);
		assert.match(result.stderr, /preserved for manual recovery/);
		assert.equal(readFileSync(f.agents, 'utf8'), userEdit);
		const archive = path.join(f.backups, readdirSync(f.backups)[0]);
		assert.ok(readFileSync(path.join(archive, 'AGENTS.md'), 'utf8') === f.original);
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
