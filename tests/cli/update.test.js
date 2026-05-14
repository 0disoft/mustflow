import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { cpSync, existsSync, lstatSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { after, before, test } from 'node:test';
import { fileURLToPath } from 'node:url';

const projectRoot = path.resolve(fileURLToPath(new URL('../..', import.meta.url)));
const cliPath = path.join(projectRoot, 'dist', 'cli', 'index.js');
let initializedProjectFixture;

function createTempProject() {
	return mkdtempSync(path.join(tmpdir(), 'mustflow-update-'));
}

function removeTempProject(projectPath) {
	rmSync(projectPath, { recursive: true, force: true });
}

function runCli(cwd, args, env = {}) {
	return spawnSync(process.execPath, [cliPath, ...args], {
		cwd,
		encoding: 'utf8',
		env: { ...process.env, ...env },
	});
}

before(() => {
	initializedProjectFixture = createTempProject();
	const result = runCli(initializedProjectFixture, ['init', '--yes']);
	assert.equal(result.status, 0, result.stderr || result.stdout);
});

after(() => {
	if (initializedProjectFixture) {
		removeTempProject(initializedProjectFixture);
	}
});

function copyInitializedProject(projectPath) {
	assert.ok(initializedProjectFixture, 'initialized project fixture should be ready');
	cpSync(initializedProjectFixture, projectPath, { recursive: true });
}

function sha256Text(text) {
	return `sha256:${createHash('sha256').update(text).digest('hex')}`;
}

function markLockedFileCustomized(projectPath, relativePath, content) {
	const lockPath = path.join(projectPath, '.mustflow', 'config', 'manifest.lock.toml');
	const lock = readFileSync(lockPath, 'utf8');
	const escapedPath = relativePath.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
	const entryPattern = new RegExp(
		`(\\[files\\."${escapedPath}"\\]\\r?\\nsource = "[^"]+"\\r?\\n)last_action = "[^"]+"\\r?\\ncontent_hash = "[^"]+"`,
	);
	const updatedLock = lock.replace(entryPattern, `$1last_action = "customized"\ncontent_hash = "${sha256Text(content)}"`);

	assert.notEqual(updatedLock, lock, `${relativePath} lock entry should be updated`);
	writeFileSync(lockPath, updatedLock);
}

function addLockedTemplateFile(projectPath, relativePath, content) {
	const lockPath = path.join(projectPath, '.mustflow', 'config', 'manifest.lock.toml');
	const targetPath = path.join(projectPath, ...relativePath.split('/'));

	mkdirSync(path.dirname(targetPath), { recursive: true });
	writeFileSync(targetPath, content);
	writeFileSync(
		lockPath,
		`${readFileSync(lockPath, 'utf8')}\n[files."${relativePath}"]\nsource = "template_locale"\nlast_action = "created"\ncontent_hash = "${sha256Text(content)}"\n`,
	);
}

function addTemplateCreate(templatePath, relativePath, content) {
	const manifestPath = path.join(templatePath, 'manifest.toml');

	writeFileSync(
		manifestPath,
		readFileSync(manifestPath, 'utf8').replace(
			'  ".mustflow/docs/agent-workflow.md",',
			`  ".mustflow/docs/agent-workflow.md",\n  "${relativePath}",`,
		),
	);

	const sourcePath = path.join(templatePath, 'common', ...relativePath.split('/'));

	mkdirSync(path.dirname(sourcePath), { recursive: true });
	writeFileSync(sourcePath, content);
}

function trySymlink(target, linkPath, type) {
	try {
		symlinkSync(target, linkPath, type);
		return true;
	} catch (error) {
		if (error && typeof error === 'object' && 'code' in error && ['EPERM', 'ENOTSUP'].includes(error.code)) {
			return false;
		}

		throw error;
	}
}

test('prints an update dry-run plan for an up-to-date project', () => {
	const projectPath = createTempProject();

	try {
		copyInitializedProject(projectPath);

		const result = runCli(projectPath, ['update', '--dry-run']);

		assert.equal(result.status, 0);
		assert.match(result.stdout, /mustflow update plan/);
		assert.match(result.stdout, /Policy:/);
		assert.match(result.stdout, /Baseline: manifest_lock_content_hash/);
		assert.match(result.stdout, /Apply actions: update, create/);
		assert.match(result.stdout, /Blocking actions: blocked-local-change, manual-review/);
		assert.match(result.stdout, /No template updates needed/);
	} finally {
		removeTempProject(projectPath);
	}
});

test('blocks update dry-run when installed files have local changes', () => {
	const projectPath = createTempProject();

	try {
		copyInitializedProject(projectPath);
		const originalAgents = readFileSync(path.join(projectPath, 'AGENTS.md'), 'utf8');
		writeFileSync(path.join(projectPath, 'AGENTS.md'), '# Changed rules\n');

		const result = runCli(projectPath, ['update', '--dry-run']);

		assert.equal(result.status, 1);
		assert.match(result.stdout, /mustflow update plan/);
		assert.match(result.stdout, /Blocked local changes: 1/);
		assert.match(result.stdout, /AGENTS\.md/);
		assert.equal(readFileSync(path.join(projectPath, 'AGENTS.md'), 'utf8'), '# Changed rules\n');
		assert.notEqual(readFileSync(path.join(projectPath, 'AGENTS.md'), 'utf8'), originalAgents);
	} finally {
		removeTempProject(projectPath);
	}
});

test('preserves customized files that still match their customized baseline', () => {
	const projectPath = createTempProject();

	try {
		copyInitializedProject(projectPath);
		const commandsPath = path.join(projectPath, '.mustflow', 'config', 'commands.toml');
		const customizedCommands = `${readFileSync(commandsPath, 'utf8')}\n# repository-specific command contract\n`;
		writeFileSync(commandsPath, customizedCommands);
		markLockedFileCustomized(projectPath, '.mustflow/config/commands.toml', customizedCommands);

		const result = runCli(projectPath, ['update', '--dry-run', '--json']);
		const plan = JSON.parse(result.stdout);
		const commandsItem = plan.items.find((item) => item.relativePath === '.mustflow/config/commands.toml');

		assert.equal(result.status, 0, result.stderr || result.stdout);
		assert.equal(plan.ok, true);
		assert.equal(commandsItem.action, 'unchanged');
		assert.match(commandsItem.reason, /customized/);
		assert.equal(readFileSync(commandsPath, 'utf8'), customizedCommands);
	} finally {
		removeTempProject(projectPath);
	}
});

test('prints an update dry-run plan as json', () => {
	const projectPath = createTempProject();

	try {
		copyInitializedProject(projectPath);
		writeFileSync(path.join(projectPath, 'AGENTS.md'), '# Changed rules\n');

		const result = runCli(projectPath, ['update', '--dry-run', '--json']);
		const plan = JSON.parse(result.stdout);

		assert.equal(result.status, 1);
		assert.equal(plan.schema_version, '1');
		assert.equal(plan.command, 'update');
		assert.equal(plan.ok, false);
		assert.equal(plan.mode, 'dry-run');
		assert.equal(plan.policy.baseline, 'manifest_lock_content_hash');
		assert.deepEqual(plan.policy.allowed_apply_actions, ['update', 'create']);
		assert.deepEqual(plan.policy.blocking_actions, ['blocked-local-change', 'manual-review']);
		assert.equal(plan.policy.dry_run_writes_files, false);
		assert.equal(plan.policy.backup_path_pattern, '.mustflow/backups/<timestamp>/');
		assert.equal(plan.summary.blockedLocalChanges, 1);
		assert.equal(plan.summary.wouldUpdate, 0);
		assert.equal(plan.items[0].relativePath, 'AGENTS.md');
		assert.equal(plan.items[0].action, 'blocked-local-change');
		assert.equal(plan.wroteFiles, false);
	} finally {
		removeTempProject(projectPath);
	}
});

test('blocks update when a locked installed file is missing', () => {
	const projectPath = createTempProject();

	try {
		copyInitializedProject(projectPath);
		const projectContextPath = path.join(projectPath, '.mustflow', 'context', 'PROJECT.md');
		rmSync(projectContextPath);

		const result = runCli(projectPath, ['update', '--dry-run', '--json']);
		const plan = JSON.parse(result.stdout);
		const projectContextItem = plan.items.find((item) => item.relativePath === '.mustflow/context/PROJECT.md');

		assert.equal(result.status, 1);
		assert.equal(plan.ok, false);
		assert.equal(projectContextItem.action, 'blocked-local-change');
		assert.equal(projectContextItem.reason, 'target file is missing but tracked by the manifest lock');
		assert.equal(existsSync(projectContextPath), false);
	} finally {
		removeTempProject(projectPath);
	}
});

test('detects bundled template changes without local file changes', () => {
	const projectPath = createTempProject();
	const templatePath = mkdtempSync(path.join(tmpdir(), 'mustflow-template-'));

	try {
		copyInitializedProject(projectPath);
		cpSync(path.join(projectRoot, 'templates', 'default'), templatePath, { recursive: true });
		writeFileSync(
			path.join(templatePath, 'locales', 'en', 'AGENTS.md'),
			`${readFileSync(path.join(templatePath, 'locales', 'en', 'AGENTS.md'), 'utf8')}\n<!-- simulated template update -->\n`,
		);

		const result = runCli(projectPath, ['update', '--dry-run'], {
			MUSTFLOW_DEV_TEMPLATE_ROOT: templatePath,
		});

		assert.equal(result.status, 0);
		assert.match(result.stdout, /Would update: 1/);
		assert.match(result.stdout, /AGENTS\.md/);
		assert.equal(
			readFileSync(path.join(projectPath, 'AGENTS.md'), 'utf8').includes('simulated template update'),
			false,
		);
	} finally {
		removeTempProject(projectPath);
		rmSync(templatePath, { recursive: true, force: true });
	}
});

test('prints bounded update diffs in text dry-run output without writing files', () => {
	const projectPath = createTempProject();
	const templatePath = mkdtempSync(path.join(tmpdir(), 'mustflow-template-'));

	try {
		copyInitializedProject(projectPath);
		cpSync(path.join(projectRoot, 'templates', 'default'), templatePath, { recursive: true });
		writeFileSync(
			path.join(templatePath, 'locales', 'en', 'AGENTS.md'),
			`${readFileSync(path.join(templatePath, 'locales', 'en', 'AGENTS.md'), 'utf8')}\n<!-- simulated template update -->\n`,
		);

		const result = runCli(projectPath, ['update', '--dry-run', '--diff'], {
			MUSTFLOW_DEV_TEMPLATE_ROOT: templatePath,
		});

		assert.equal(result.status, 0);
		assert.match(result.stdout, /Would update: 1/);
		assert.match(result.stdout, /Diff preview:/);
		assert.match(result.stdout, /--- AGENTS\.md \(current\)/);
		assert.match(result.stdout, /\+\+\+ AGENTS\.md \(template\)/);
		assert.match(result.stdout, /\+<!-- simulated template update -->/);
		assert.match(result.stdout, /No files were written/);
		assert.equal(
			readFileSync(path.join(projectPath, 'AGENTS.md'), 'utf8').includes('simulated template update'),
			false,
		);
	} finally {
		removeTempProject(projectPath);
		rmSync(templatePath, { recursive: true, force: true });
	}
});

test('prints update dry-run diff previews as json for update and create actions', () => {
	const projectPath = createTempProject();
	const templatePath = mkdtempSync(path.join(tmpdir(), 'mustflow-template-'));

	try {
		copyInitializedProject(projectPath);
		cpSync(path.join(projectRoot, 'templates', 'default'), templatePath, { recursive: true });
		writeFileSync(
			path.join(templatePath, 'locales', 'en', 'AGENTS.md'),
			`${readFileSync(path.join(templatePath, 'locales', 'en', 'AGENTS.md'), 'utf8')}\n<!-- simulated template update -->\n`,
		);
		addTemplateCreate(templatePath, '.mustflow/docs/diff-added.md', '# Added\n');

		const result = runCli(projectPath, ['update', '--dry-run', '--diff', '--json'], {
			MUSTFLOW_DEV_TEMPLATE_ROOT: templatePath,
		});
		const plan = JSON.parse(result.stdout);
		const agentsItem = plan.items.find((item) => item.relativePath === 'AGENTS.md');
		const createItem = plan.items.find((item) => item.relativePath === '.mustflow/docs/diff-added.md');

		assert.equal(result.status, 0, result.stderr || result.stdout);
		assert.equal(plan.ok, true);
		assert.equal(plan.wroteFiles, false);
		assert.equal(plan.summary.wouldUpdate, 1);
		assert.equal(plan.summary.wouldCreate, 1);
		assert.equal(agentsItem.action, 'update');
		assert.equal(agentsItem.diff_preview.format, 'unified');
		assert.equal(agentsItem.diff_preview.available, true);
		assert.equal(agentsItem.diff_preview.bounded, true);
		assert.equal(agentsItem.diff_preview.truncated, false);
		assert.equal(agentsItem.diff_preview.max_lines, 120);
		assert.equal(agentsItem.diff_preview.max_line_bytes, 240);
		assert.ok(agentsItem.diff_preview.lines.includes('+<!-- simulated template update -->'));
		assert.equal(createItem.action, 'create');
		assert.equal(createItem.diff_preview.from, 'missing_target');
		assert.ok(createItem.diff_preview.lines.includes('+# Added'));
		assert.equal(existsSync(path.join(projectPath, '.mustflow', 'docs', 'diff-added.md')), false);
	} finally {
		removeTempProject(projectPath);
		rmSync(templatePath, { recursive: true, force: true });
	}
});

test('truncates update diff previews with an explicit marker', () => {
	const projectPath = createTempProject();
	const templatePath = mkdtempSync(path.join(tmpdir(), 'mustflow-template-'));

	try {
		copyInitializedProject(projectPath);
		cpSync(path.join(projectRoot, 'templates', 'default'), templatePath, { recursive: true });
		const extraLines = Array.from({ length: 160 }, (_, index) => `generated line ${index}`).join('\n');
		writeFileSync(
			path.join(templatePath, 'locales', 'en', 'AGENTS.md'),
			`${readFileSync(path.join(templatePath, 'locales', 'en', 'AGENTS.md'), 'utf8')}\n${extraLines}\n`,
		);

		const result = runCli(projectPath, ['update', '--dry-run', '--diff', '--json'], {
			MUSTFLOW_DEV_TEMPLATE_ROOT: templatePath,
		});
		const plan = JSON.parse(result.stdout);
		const agentsItem = plan.items.find((item) => item.relativePath === 'AGENTS.md');

		assert.equal(result.status, 0, result.stderr || result.stdout);
		assert.equal(agentsItem.diff_preview.available, true);
		assert.equal(agentsItem.diff_preview.truncated, true);
		assert.equal(agentsItem.diff_preview.lines.length, 120);
		assert.ok(agentsItem.diff_preview.lines.includes('[... diff preview truncated ...]'));
	} finally {
		removeTempProject(projectPath);
		rmSync(templatePath, { recursive: true, force: true });
	}
});

test('includes diff previews for blocked local changes without applying them', () => {
	const projectPath = createTempProject();

	try {
		copyInitializedProject(projectPath);
		writeFileSync(path.join(projectPath, 'AGENTS.md'), '# Changed rules\n');

		const result = runCli(projectPath, ['update', '--dry-run', '--diff', '--json']);
		const plan = JSON.parse(result.stdout);
		const agentsItem = plan.items.find((item) => item.relativePath === 'AGENTS.md');

		assert.equal(result.status, 1);
		assert.equal(plan.ok, false);
		assert.equal(plan.summary.blockedLocalChanges, 1);
		assert.equal(agentsItem.action, 'blocked-local-change');
		assert.equal(agentsItem.diff_preview.available, true);
		assert.ok(agentsItem.diff_preview.lines.includes('-# Changed rules'));
		assert.equal(readFileSync(path.join(projectPath, 'AGENTS.md'), 'utf8'), '# Changed rules\n');
	} finally {
		removeTempProject(projectPath);
	}
});

test('omits diff previews for unchanged update items', () => {
	const projectPath = createTempProject();

	try {
		copyInitializedProject(projectPath);

		const result = runCli(projectPath, ['update', '--dry-run', '--diff', '--json']);
		const plan = JSON.parse(result.stdout);

		assert.equal(result.status, 0, result.stderr || result.stdout);
		assert.equal(plan.ok, true);
		assert.equal(plan.summary.unchanged, plan.items.length);
		assert.equal(plan.items.every((item) => item.action === 'unchanged' && item.diff_preview === undefined), true);
	} finally {
		removeTempProject(projectPath);
	}
});

test('keeps merged AGENTS.md under manual review until a block baseline exists', () => {
	const projectPath = createTempProject();

	try {
		const existingAgents = '# Existing Agent Rules\n\nKeep this project rule.\n';
		writeFileSync(path.join(projectPath, 'AGENTS.md'), existingAgents);
		assert.equal(runCli(projectPath, ['init', '--merge', '--yes']).status, 0);

		const mergedAgents = readFileSync(path.join(projectPath, 'AGENTS.md'), 'utf8');
		const result = runCli(projectPath, ['update', '--dry-run', '--diff', '--json']);
		const plan = JSON.parse(result.stdout);
		const agentsItem = plan.items.find((item) => item.relativePath === 'AGENTS.md');

		assert.equal(result.status, 1, result.stderr || result.stdout);
		assert.equal(plan.ok, false);
		assert.deepEqual(plan.policy.allowed_apply_actions, ['update', 'create']);
		assert.equal(plan.summary.manualReview, 1);
		assert.equal(agentsItem.action, 'manual-review');
		assert.equal(agentsItem.reason, 'managed block requires a block-level manifest baseline');
		assert.equal(agentsItem.diff_preview.available, true);
		assert.equal(agentsItem.diff_preview.format, 'unified');
		assert.equal(readFileSync(path.join(projectPath, 'AGENTS.md'), 'utf8'), mergedAgents);
		assert.match(mergedAgents, /Keep this project rule/);
		assert.match(mergedAgents, /mustflow:start/);
	} finally {
		removeTempProject(projectPath);
	}
});

test('applies safe template updates and refreshes the manifest lock', () => {
	const projectPath = createTempProject();
	const templatePath = mkdtempSync(path.join(tmpdir(), 'mustflow-template-'));

	try {
		copyInitializedProject(projectPath);
		cpSync(path.join(projectRoot, 'templates', 'default'), templatePath, { recursive: true });
		const originalAgents = readFileSync(path.join(projectPath, 'AGENTS.md'), 'utf8');
		const updatedAgents = `${readFileSync(path.join(templatePath, 'locales', 'en', 'AGENTS.md'), 'utf8')}\n<!-- simulated template update -->\n`;
		writeFileSync(path.join(templatePath, 'locales', 'en', 'AGENTS.md'), updatedAgents);

		const result = runCli(projectPath, ['update', '--apply'], {
			MUSTFLOW_DEV_TEMPLATE_ROOT: templatePath,
		});
		const currentAgents = readFileSync(path.join(projectPath, 'AGENTS.md'), 'utf8');
		const lock = readFileSync(path.join(projectPath, '.mustflow', 'config', 'manifest.lock.toml'), 'utf8');
		const followUp = runCli(projectPath, ['update', '--dry-run', '--json'], {
			MUSTFLOW_DEV_TEMPLATE_ROOT: templatePath,
		});
		const followUpPlan = JSON.parse(followUp.stdout);

		assert.equal(result.status, 0, result.stderr || result.stdout);
		assert.match(result.stdout, /Updated AGENTS\.md/);
		assert.equal(currentAgents, updatedAgents);
		const backupDirs = readdirSync(path.join(projectPath, '.mustflow', 'backups'));
		assert.equal(backupDirs.length, 1);
		assert.equal(readFileSync(path.join(projectPath, '.mustflow', 'backups', backupDirs[0], 'AGENTS.md'), 'utf8'), originalAgents);
		assert.match(lock, /last_action = "updated"/);
		assert.match(lock, new RegExp(`content_hash = "${sha256Text(updatedAgents)}"`));
		assert.equal(followUp.status, 0, followUp.stderr || followUp.stdout);
		assert.equal(followUpPlan.ok, true);
		assert.equal(followUpPlan.summary.unchanged, followUpPlan.items.length);
	} finally {
		removeTempProject(projectPath);
		rmSync(templatePath, { recursive: true, force: true });
	}
});

test('applies newly added template files when local files are clean', () => {
	const projectPath = createTempProject();
	const templatePath = mkdtempSync(path.join(tmpdir(), 'mustflow-template-'));

	try {
		copyInitializedProject(projectPath);
		cpSync(path.join(projectRoot, 'templates', 'default'), templatePath, { recursive: true });
		const newRelativePath = '.mustflow/docs/new-guide.md';
		const newContent = '# New Guide\n\nTemplate-added file.\n';
		addTemplateCreate(templatePath, newRelativePath, newContent);

		const result = runCli(projectPath, ['update', '--apply', '--json'], {
			MUSTFLOW_DEV_TEMPLATE_ROOT: templatePath,
		});
		const output = JSON.parse(result.stdout);
		const lock = readFileSync(path.join(projectPath, '.mustflow', 'config', 'manifest.lock.toml'), 'utf8');

		assert.equal(result.status, 0, result.stderr || result.stdout);
		assert.equal(output.schema_version, '1');
		assert.equal(output.command, 'update');
		assert.equal(output.mode, 'apply');
		assert.equal(output.policy.never_overwrite_local_changes, true);
		assert.equal(output.ok, true);
		assert.equal(output.wroteFiles, true);
		assert.equal(output.summary.wouldCreate, 1);
		assert.equal(readFileSync(path.join(projectPath, ...newRelativePath.split('/')), 'utf8'), newContent);
		assert.match(lock, /\[files\.".mustflow\/docs\/new-guide.md"\]/);
		assert.match(lock, /last_action = "created"/);
		assert.match(lock, new RegExp(`content_hash = "${sha256Text(newContent)}"`));
	} finally {
		removeTempProject(projectPath);
		rmSync(templatePath, { recursive: true, force: true });
	}
});

test('preserves lock-tracked template skills outside the selected profile during update', () => {
	const projectPath = createTempProject();

	try {
		assert.equal(runCli(projectPath, ['init', '--profile', 'oss', '--yes']).status, 0);

		const extraSkillPath = '.mustflow/skills/web-asset-optimization/SKILL.md';
		const extraSkillContent = readFileSync(path.join(projectRoot, 'templates', 'default', 'locales', 'en', ...extraSkillPath.split('/')), 'utf8');
		addLockedTemplateFile(projectPath, extraSkillPath, extraSkillContent);

		const beforeIndex = readFileSync(path.join(projectPath, '.mustflow', 'skills', 'INDEX.md'), 'utf8');
		assert.doesNotMatch(beforeIndex, /web-asset-optimization/);

		const result = runCli(projectPath, ['update', '--apply', '--json']);
		const output = JSON.parse(result.stdout);
		const afterIndex = readFileSync(path.join(projectPath, '.mustflow', 'skills', 'INDEX.md'), 'utf8');
		const check = runCli(projectPath, ['check', '--strict']);

		assert.equal(result.status, 0, result.stderr || result.stdout);
		assert.equal(output.ok, true);
		assert.equal(output.wroteFiles, true);
		assert.match(afterIndex, /web-asset-optimization\/SKILL\.md/);
		assert.equal(check.status, 0, check.stderr || check.stdout);
	} finally {
		removeTempProject(projectPath);
	}
});

test('blocks template create through a symlink target', (t) => {
	const projectPath = createTempProject();
	const templatePath = mkdtempSync(path.join(tmpdir(), 'mustflow-template-'));
	const outsidePath = path.join(tmpdir(), `mustflow-outside-${process.pid}-${Date.now()}.md`);

	try {
		copyInitializedProject(projectPath);
		cpSync(path.join(projectRoot, 'templates', 'default'), templatePath, { recursive: true });
		const newRelativePath = '.mustflow/docs/symlink-create.md';
		addTemplateCreate(templatePath, newRelativePath, '# Symlink Create\n');
		if (!trySymlink(outsidePath, path.join(projectPath, ...newRelativePath.split('/')), 'file')) {
			t.skip('symlinks are unavailable in this environment');
			return;
		}

		const result = runCli(projectPath, ['update', '--apply', '--json'], {
			MUSTFLOW_DEV_TEMPLATE_ROOT: templatePath,
		});
		const output = JSON.parse(result.stdout);
		const item = output.items.find((candidate) => candidate.relativePath === newRelativePath);

		assert.equal(result.status, 1, result.stderr || result.stdout);
		assert.equal(output.ok, false);
		assert.equal(item.action, 'blocked-local-change');
		assert.match(item.reason, /symlinks/);
		assert.equal(existsSync(outsidePath), false);
		assert.equal(lstatSync(path.join(projectPath, ...newRelativePath.split('/'))).isSymbolicLink(), true);
	} finally {
		removeTempProject(projectPath);
		rmSync(templatePath, { recursive: true, force: true });
		rmSync(outsidePath, { force: true });
	}
});

test('blocks template update through a symlink target', (t) => {
	const projectPath = createTempProject();
	const templatePath = mkdtempSync(path.join(tmpdir(), 'mustflow-template-'));
	const outsidePath = path.join(tmpdir(), `mustflow-outside-existing-${process.pid}-${Date.now()}.md`);

	try {
		copyInitializedProject(projectPath);
		cpSync(path.join(projectRoot, 'templates', 'default'), templatePath, { recursive: true });
		const agentsPath = path.join(projectPath, 'AGENTS.md');
		const originalAgents = readFileSync(agentsPath, 'utf8');
		writeFileSync(outsidePath, originalAgents);
		rmSync(agentsPath);
		if (!trySymlink(outsidePath, agentsPath, 'file')) {
			t.skip('symlinks are unavailable in this environment');
			return;
		}
		writeFileSync(
			path.join(templatePath, 'locales', 'en', 'AGENTS.md'),
			`${readFileSync(path.join(templatePath, 'locales', 'en', 'AGENTS.md'), 'utf8')}\n<!-- simulated template update -->\n`,
		);

		const result = runCli(projectPath, ['update', '--dry-run', '--json'], {
			MUSTFLOW_DEV_TEMPLATE_ROOT: templatePath,
		});
		const output = JSON.parse(result.stdout);
		const item = output.items.find((candidate) => candidate.relativePath === 'AGENTS.md');

		assert.equal(result.status, 1, result.stderr || result.stdout);
		assert.equal(output.ok, false);
		assert.equal(item.action, 'blocked-local-change');
		assert.match(item.reason, /symlinks/);
		assert.equal(readFileSync(outsidePath, 'utf8'), originalAgents);
		assert.equal(lstatSync(agentsPath).isSymbolicLink(), true);
	} finally {
		removeTempProject(projectPath);
		rmSync(templatePath, { recursive: true, force: true });
		rmSync(outsidePath, { force: true });
	}
});

test('refuses template creates outside the mustflow install surface during update', () => {
	const projectPath = createTempProject();
	const templatePath = mkdtempSync(path.join(tmpdir(), 'mustflow-template-'));

	try {
		copyInitializedProject(projectPath);
		cpSync(path.join(projectRoot, 'templates', 'default'), templatePath, { recursive: true });
		addTemplateCreate(
			templatePath,
			'src/anchored.ts',
			'// mf:anchor app.generated\nexport const generated = true;\n',
		);

		const result = runCli(projectPath, ['update', '--dry-run', '--json'], {
			MUSTFLOW_DEV_TEMPLATE_ROOT: templatePath,
		});
		const output = JSON.parse(result.stdout);

		assert.equal(result.status, 1);
		assert.equal(output.ok, false);
		assert.match(output.error, /outside the mustflow-managed install surface/);
		assert.equal(output.wroteFiles, false);
		assert.equal(existsSync(path.join(projectPath, 'src', 'anchored.ts')), false);
	} finally {
		removeTempProject(projectPath);
		rmSync(templatePath, { recursive: true, force: true });
	}
});

test('refuses apply when installed files have local changes', () => {
	const projectPath = createTempProject();
	const templatePath = mkdtempSync(path.join(tmpdir(), 'mustflow-template-'));

	try {
		copyInitializedProject(projectPath);
		cpSync(path.join(projectRoot, 'templates', 'default'), templatePath, { recursive: true });
		const localChange = '# Local project rules\n';
		writeFileSync(path.join(projectPath, 'AGENTS.md'), localChange);
		writeFileSync(
			path.join(templatePath, 'locales', 'en', 'AGENTS.md'),
			`${readFileSync(path.join(templatePath, 'locales', 'en', 'AGENTS.md'), 'utf8')}\n<!-- simulated template update -->\n`,
		);

		const result = runCli(projectPath, ['update', '--apply'], {
			MUSTFLOW_DEV_TEMPLATE_ROOT: templatePath,
		});

		assert.equal(result.status, 1);
		assert.match(result.stdout, /Blocked local changes: 1/);
		assert.match(result.stdout, /No files were written/);
		assert.equal(readFileSync(path.join(projectPath, 'AGENTS.md'), 'utf8'), localChange);
	} finally {
		removeTempProject(projectPath);
		rmSync(templatePath, { recursive: true, force: true });
	}
});

test('refuses apply when a new template file collides with an untracked local file', () => {
	const projectPath = createTempProject();
	const templatePath = mkdtempSync(path.join(tmpdir(), 'mustflow-template-'));

	try {
		copyInitializedProject(projectPath);
		cpSync(path.join(projectRoot, 'templates', 'default'), templatePath, { recursive: true });
		const manifestPath = path.join(templatePath, 'manifest.toml');
		const newRelativePath = '.mustflow/docs/local-only.md';
		const localContent = '# Local Notes\n';
		const templateContent = '# Template Notes\n';
		writeFileSync(
			manifestPath,
			readFileSync(manifestPath, 'utf8').replace(
				'  ".mustflow/docs/agent-workflow.md",',
				'  ".mustflow/docs/agent-workflow.md",\n  ".mustflow/docs/local-only.md",',
			),
		);
		mkdirSync(path.join(templatePath, 'common', '.mustflow', 'docs'), { recursive: true });
		writeFileSync(path.join(templatePath, 'common', ...newRelativePath.split('/')), templateContent);
		writeFileSync(path.join(projectPath, ...newRelativePath.split('/')), localContent);

		const result = runCli(projectPath, ['update', '--apply'], {
			MUSTFLOW_DEV_TEMPLATE_ROOT: templatePath,
		});

		assert.equal(result.status, 1);
		assert.match(result.stdout, /Blocked local changes: 1/);
		assert.match(result.stdout, /\.mustflow\/docs\/local-only\.md/);
		assert.equal(readFileSync(path.join(projectPath, ...newRelativePath.split('/')), 'utf8'), localContent);
	} finally {
		removeTempProject(projectPath);
		rmSync(templatePath, { recursive: true, force: true });
	}
});

test('requires an explicit update mode', () => {
	const projectPath = createTempProject();

	try {
		copyInitializedProject(projectPath);

		const result = runCli(projectPath, ['update']);

		assert.equal(result.status, 1);
		assert.match(result.stderr, /Specify --dry-run or --apply/);
	} finally {
		removeTempProject(projectPath);
	}
});

test('requires dry-run mode for update diff previews', () => {
	const projectPath = createTempProject();

	try {
		copyInitializedProject(projectPath);

		const result = runCli(projectPath, ['update', '--apply', '--diff']);

		assert.equal(result.status, 1);
		assert.match(result.stderr, /Use --diff with --dry-run/);
		assert.equal(readFileSync(path.join(projectPath, 'AGENTS.md'), 'utf8').includes('diff preview'), false);
	} finally {
		removeTempProject(projectPath);
	}
});

test('does not write files when manifest lock is missing', () => {
	const projectPath = createTempProject();

	try {
		const result = runCli(projectPath, ['update', '--dry-run']);

		assert.equal(result.status, 1);
		assert.match(result.stderr, /Missing .mustflow\/config\/manifest\.lock\.toml/);
		assert.equal(existsSync(path.join(projectPath, '.mustflow')), false);
	} finally {
		removeTempProject(projectPath);
	}
});
