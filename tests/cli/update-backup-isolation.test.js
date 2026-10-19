import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { test } from 'node:test';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { acquireActiveCommandLock, MUSTFLOW_UPDATE_APPLY_EFFECTS } from '../../dist/cli/lib/active-command-lock.js';

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
const mkdtemp = fs.mkdtempSync;
const readFile = fs.readFileSync;
const root = ${JSON.stringify(project)};
const template = ${JSON.stringify(template)};
const fault = ${JSON.stringify(fault)};
let failed = false;
let templateChanged = false;
let projectChanged = false;
let manifestReads = 0;
fs.readFileSync = (file, ...args) => {
  if (typeof file === 'string' && path.resolve(file) === path.join(template, 'manifest.toml')) manifestReads++;
  const result = readFile(file, ...args);
  if (!templateChanged && typeof file === 'string' && path.relative(root, file).replaceAll('\\\\', '/') === fault.templateAfterRead) {
    templateChanged = true;
    changeTemplate(fault.templateAfterReadEntries);
  }
  return result;
};
if (fault.measureReads) process.on('exit', () => fs.writeFileSync(${JSON.stringify(path.join(root, 'reads.json'))}, JSON.stringify({ manifestReads })));
const changeTemplate = entries => {
  for (const entry of entries ?? []) fs.writeFileSync(path.join(template, entry.path), entry.content);
};
if (fault.templateAfterRead) {
  const open = fs.openSync;
  const close = fs.closeSync;
  const opened = new Map();
  fs.openSync = (file, ...args) => {
    const descriptor = open(file, ...args);
    if (typeof file === 'string') opened.set(descriptor, path.resolve(file));
    return descriptor;
  };
  fs.closeSync = descriptor => {
    const file = opened.get(descriptor);
    const result = close(descriptor);
    opened.delete(descriptor);
    if (!templateChanged && file && path.relative(root, file).replaceAll('\\\\', '/') === fault.templateAfterRead) {
      templateChanged = true;
      changeTemplate(fault.templateAfterReadEntries);
    }
    return result;
  };
}
fs.mkdtempSync = (prefix, options) => {
  const directory = mkdtemp(prefix, options);
  if (fault.beforeBackup && String(prefix).startsWith(path.join(root, '.mustflow', 'backups'))) {
    fs.writeFileSync(path.join(root, fault.beforeBackup.path), fault.beforeBackup.content);
  }
  if (String(prefix).startsWith(path.join(root, '.mustflow', 'backups'))) changeTemplate(fault.templateBeforeBackup);
  return directory;
};
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
  const result = rename(source, target);
  if (!projectChanged && relative === fault.editAfterPath) {
    projectChanged = true;
    for (const entry of fault.editAfterWrite ?? []) fs.writeFileSync(path.join(root, entry.path), entry.content);
  }
  if (!templateChanged && relative === fault.templateAfterPath) {
    templateChanged = true;
    changeTemplate(fault.templateAfterWrite);
  }
  return result;
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

test('update applies the planned bytes and template version when source changes before backup', () => {
	const f = fixture();
	try {
		const planned = `${f.original}\n<!-- planned revision -->\n`;
		const late = `${f.original}\n<!-- unplanned revision -->\n`;
		const manifest = readFileSync(path.join(f.template, 'manifest.toml'), 'utf8');
		const version = manifest.match(/^version\s*=\s*"([^"]+)"/m)[1];
		writeFileSync(f.source, planned);
		const result = f.run(['update', '--apply', '--json'], true, { templateBeforeBackup: [
			{ path: 'locales/en/AGENTS.md', content: late },
			{ path: 'manifest.toml', content: manifest.replace(/^version\s*=\s*"[^"]+"/m, 'version = "99.0.0"') },
		] });
		assert.equal(JSON.parse(result.stdout).ok, true);
		assert.ok(readFileSync(f.agents, 'utf8') === planned, 'only the planned revision may be applied');
		const lock = readFileSync(path.join(f.project, '.mustflow/config/manifest.lock.toml'), 'utf8');
		assert.ok(lock.includes(`version = "${version}"`));
		assert.ok(!lock.includes('version = "99.0.0"'));
		const next = JSON.parse(f.run(['update', '--dry-run', '--json']).stdout);
		assert.equal(next.summary.wouldUpdate, 1);
	} finally { cleanup(f.root); }
});

test('update uses one planned source revision for every file even when it changes mid-apply', () => {
	const f = fixture();
	try {
		const workflow = '.mustflow/docs/agent-workflow.md';
		const source = path.join(f.template, 'locales/en', workflow);
		const original = readFileSync(source, 'utf8');
		const planned = `${original}\n<!-- planned workflow revision -->\n`;
		writeFileSync(f.source, `${f.original}\n<!-- planned agent revision -->\n`);
		writeFileSync(source, planned);
		const result = f.run(['update', '--apply', '--json'], true, { templateAfterPath: 'AGENTS.md', templateAfterWrite: [
			{ path: `locales/en/${workflow}`, content: `${original}\n<!-- late workflow revision -->\n` },
		] });
		assert.equal(JSON.parse(result.stdout).ok, true);
		assert.ok(readFileSync(path.join(f.project, workflow), 'utf8') === planned, 'later files must use the same planned source revision');
	} finally { cleanup(f.root); }
});

test('multi-file update reads template metadata once for the complete operation', () => {
	const f = fixture();
	try {
		const workflow = path.join(f.template, 'locales/en/.mustflow/docs/agent-workflow.md');
		writeFileSync(f.source, `${f.original}\n<!-- agent revision -->\n`);
		writeFileSync(workflow, `${readFileSync(workflow, 'utf8')}\n<!-- workflow revision -->\n`);
		const result = f.run(['update', '--apply', '--json'], true, { measureReads: true });
		const output = JSON.parse(result.stdout);
		assert.equal(output.summary.wouldUpdate, 2);
		const reads = JSON.parse(readFileSync(path.join(f.root, 'reads.json'), 'utf8'));
		assert.equal(reads.manifestReads, 1, 'the plan must supply metadata through apply and manifest persistence');
		assert.equal(output.items.some(item => Object.hasOwn(item, 'plannedContent')), false);
	} finally { cleanup(f.root); }
});

test('diff preview shows the planned source content when its file changes before rendering', () => {
	const f = fixture();
	try {
		const planned = `${f.original}\n<!-- planned diff revision -->\n`;
		writeFileSync(f.source, planned);
		const result = f.run(['update', '--dry-run', '--diff', '--json'], true, {
			templateAfterRead: '.mustflow/docs/agent-workflow.md',
			templateAfterReadEntries: [{ path: 'locales/en/AGENTS.md', content: `${f.original}\n<!-- late diff revision -->\n` }],
		});
		const output = JSON.parse(result.stdout);
		const diff = output.items.find(item => item.relativePath === 'AGENTS.md').diff_preview;
		assert.equal(diff.available, true);
		assert.ok(diff.lines.some(line => line.includes('planned diff revision')));
		assert.ok(!diff.lines.some(line => line.includes('late diff revision')));
		assert.ok(readFileSync(f.source, 'utf8').includes('late diff revision'), 'the source must actually change during planning');
		assert.ok(readFileSync(f.agents, 'utf8') === f.original);
		assert.equal(existsSync(f.backups), false);
	} finally { cleanup(f.root); }
});

test('update preserves edits made after planning and before the recovery backup', () => {
	const f = fixture();
	try {
		const edit = '# User edit during backup reservation\nKeep my rules.\n';
		writeFileSync(f.source, `${f.original}\n<!-- updated template -->\n`);
		const lockPath = path.join(f.project, '.mustflow/config/manifest.lock.toml');
		const lockBefore = readFileSync(lockPath, 'utf8');
		const result = f.run(['update', '--apply'], false, { beforeBackup: { path: 'AGENTS.md', content: edit } });
		assert.equal(result.status, 1);
		assert.equal(readFileSync(f.agents, 'utf8'), edit);
		assert.equal(readFileSync(lockPath, 'utf8'), lockBefore);
		assert.match(result.stderr, /changed after update planning/);
	} finally { cleanup(f.root); }
});

test('update preserves obsolete files edited after planning instead of removing them', () => {
	const f = fixture();
	try {
		const legacy = '.mustflow/skills/catalog.v1.json';
		const original = '{"schema_version":"1","routes":[]}\n';
		const target = path.join(f.project, legacy);
		writeFileSync(target, original);
		const lockPath = path.join(f.project, '.mustflow/config/manifest.lock.toml');
		const hash = `sha256:${createHash('sha256').update(original).digest('hex')}`;
		const lockBefore = readFileSync(lockPath, 'utf8') + `\n[files."${legacy}"]\nsource = "template_common"\nlast_action = "copied"\ncontent_hash = "${hash}"\n`;
		writeFileSync(lockPath, lockBefore);
		const edit = '{"schema_version":"1","routes":["user"]}\n';
		const result = f.run(['update', '--apply'], false, { beforeBackup: { path: legacy, content: edit } });
		assert.equal(result.status, 1);
		assert.equal(readFileSync(target, 'utf8'), edit);
		assert.equal(readFileSync(lockPath, 'utf8'), lockBefore);
	} finally { cleanup(f.root); }
});

test('update preserves manifest changes made after planning', () => {
	const f = fixture();
	try {
		const relativePath = '.mustflow/config/manifest.lock.toml';
		const target = path.join(f.project, relativePath);
		const edit = `${readFileSync(target, 'utf8')}\n# Concurrent operator note\n`;
		writeFileSync(f.source, `${f.original}\n<!-- updated template -->\n`);
		const result = f.run(['update', '--apply'], false, { beforeBackup: { path: relativePath, content: edit } });
		assert.equal(result.status, 1);
		assert.equal(readFileSync(target, 'utf8'), edit);
		assert.ok(readFileSync(f.agents, 'utf8') === f.original);
		assert.match(result.stderr, /changed after update planning/);
	} finally { cleanup(f.root); }
});

test('JSON runtime failure remains parseable after a successful rollback', () => {
	const f = fixture();
	try {
		const workflow = '.mustflow/docs/agent-workflow.md';
		const workflowSource = path.join(f.template, 'locales/en', workflow);
		writeFileSync(f.source, `${f.original}\n<!-- updated template -->\n`);
		writeFileSync(workflowSource, `${readFileSync(workflowSource, 'utf8')}\n<!-- updated -->\n`);
		const result = f.run(['update', '--apply', '--json'], false, { path: workflow });
		assert.equal(result.status, 1);
		const output = JSON.parse(result.stdout);
		assert.equal(output.ok, false);
		assert.equal(output.wroteFiles, true);
		assert.equal(output.mode, 'apply');
		assert.equal(output.schema_version, '2');
		assert.match(output.error, /Update changes rolled back/);
		assert.ok(readFileSync(f.agents, 'utf8') === f.original);
		assert.equal(result.stderr, '');
		assert.equal(output.items.some(item => Object.hasOwn(item, 'baselineHash')), false);
	} finally { cleanup(f.root); }
});

test('JSON pre-apply conflict reports failure without claiming writes', () => {
	const f = fixture();
	try {
		const edit = '# Concurrent user rules\n';
		writeFileSync(f.source, `${f.original}\n<!-- updated template -->\n`);
		const result = f.run(['update', '--apply', '--json'], false, { beforeBackup: { path: 'AGENTS.md', content: edit } });
		assert.equal(result.status, 1);
		const output = JSON.parse(result.stdout);
		assert.equal(output.ok, false);
		assert.equal(output.wroteFiles, false);
		assert.match(output.error, /changed after update planning/);
		assert.equal(readFileSync(f.agents, 'utf8'), edit);
		assert.equal(result.stderr, '');
	} finally { cleanup(f.root); }
});

test('JSON first-write failure does not claim an installed file was changed', () => {
	const f = fixture();
	try {
		writeFileSync(f.source, `${f.original}\n<!-- updated template -->\n`);
		const result = f.run(['update', '--apply', '--json'], false, { path: 'AGENTS.md' });
		assert.equal(result.status, 1);
		const output = JSON.parse(result.stdout);
		assert.equal(output.ok, false);
		assert.equal(output.wroteFiles, false);
		assert.match(output.error, /Update changes rolled back/);
		assert.ok(readFileSync(f.agents, 'utf8') === f.original);
	} finally { cleanup(f.root); }
});

test('JSON planning errors remain parseable and do not mutate installed files', () => {
	const f = fixture();
	try {
		writeFileSync(path.join(f.project, '.mustflow/config/mustflow.toml'), '[workflow\n');
		const result = f.run(['update', '--dry-run', '--json'], false);
		assert.equal(result.status, 1);
		const output = JSON.parse(result.stdout);
		assert.equal(output.ok, false);
		assert.equal(output.wroteFiles, false);
		assert.equal(output.mode, 'dry-run');
		assert.ok(output.error.length > 0);
		assert.ok(readFileSync(f.agents, 'utf8') === f.original);
		assert.equal(existsSync(f.backups), false);
		assert.equal(result.stderr, '');
	} finally { cleanup(f.root); }
});

test('JSON incomplete recovery reports remaining changes and the recovery backup', () => {
	const f = fixture();
	try {
		const workflow = '.mustflow/docs/agent-workflow.md';
		const workflowSource = path.join(f.template, 'locales/en', workflow);
		writeFileSync(f.source, `${f.original}\n<!-- updated template -->\n`);
		writeFileSync(workflowSource, `${readFileSync(workflowSource, 'utf8')}\n<!-- updated -->\n`);
		const result = f.run(['update', '--apply', '--json'], false, { path: workflow, failRecovery: true });
		assert.equal(result.status, 1);
		const output = JSON.parse(result.stdout);
		assert.equal(output.ok, false);
		assert.equal(output.wroteFiles, true);
		assert.match(output.error, /Automatic recovery incomplete/);
		assert.ok(output.error.includes(f.backups));
		assert.ok(readFileSync(f.agents, 'utf8') !== f.original);
	} finally { cleanup(f.root); }
});

test('JSON lock conflict reports failure while another live process holds the update lock', () => {
	const f = fixture();
	const lock = acquireActiveCommandLock(f.project, 'test update owner', MUSTFLOW_UPDATE_APPLY_EFFECTS);
	assert.equal(lock.ok, true);
	try {
		const result = f.run(['update', '--apply', '--json'], false);
		assert.equal(result.status, 1);
		const output = JSON.parse(result.stdout);
		assert.equal(output.ok, false);
		assert.equal(output.wroteFiles, false);
		assert.match(output.error, /test update owner/);
		assert.equal(result.stderr, '');
	} finally { lock.handle.release(); cleanup(f.root); }
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

test('update does not seal a concurrent edit as a template baseline after applying files', () => {
	const f = fixture();
	try {
		const workflow = '.mustflow/docs/agent-workflow.md';
		const workflowSource = path.join(f.template, 'locales/en', workflow);
		const workflowTarget = path.join(f.project, workflow);
		const originalWorkflow = readFileSync(workflowTarget, 'utf8');
		const lockPath = path.join(f.project, '.mustflow/config/manifest.lock.toml');
		const originalLock = readFileSync(lockPath, 'utf8');
		const userEdit = '# Concurrent user rules\nKeep this change.\n';
		writeFileSync(f.source, `${f.original}\n<!-- template update -->\n`);
		writeFileSync(workflowSource, `${originalWorkflow}\n<!-- workflow update -->\n`);
		const result = f.run(['update', '--apply', '--json'], false, {
			editAfterPath: workflow,
			editAfterWrite: [{ path: 'AGENTS.md', content: userEdit }],
		});
		assert.equal(result.status, 1, 'a user edit must not become an overwriteable template baseline');
		const output = JSON.parse(result.stdout);
		assert.equal(output.ok, false);
		assert.equal(output.wroteFiles, true);
		assert.match(output.error, /File changed after update write: AGENTS\.md/);
		assert.match(output.error, /Automatic recovery incomplete/);
		assert.equal(readFileSync(f.agents, 'utf8'), userEdit);
		assert.equal(readFileSync(workflowTarget, 'utf8'), originalWorkflow);
		assert.equal(readFileSync(lockPath, 'utf8'), originalLock);
		const next = JSON.parse(f.run(['update', '--dry-run', '--json'], false).stdout);
		assert.equal(next.items.find(item => item.relativePath === 'AGENTS.md').action, 'blocked-local-change');
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
