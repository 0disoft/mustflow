import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { cpSync, existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

const projectRoot = path.resolve(fileURLToPath(new URL('../..', import.meta.url)));
const cliPath = path.join(projectRoot, 'dist', 'cli', 'index.js');

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

function sha256Text(text) {
	return `sha256:${createHash('sha256').update(text).digest('hex')}`;
}

test('prints an update dry-run plan for an up-to-date project', () => {
	const projectPath = createTempProject();

	try {
		assert.equal(runCli(projectPath, ['init', '--yes']).status, 0);

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
		assert.equal(runCli(projectPath, ['init', '--yes']).status, 0);
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

test('prints an update dry-run plan as json', () => {
	const projectPath = createTempProject();

	try {
		assert.equal(runCli(projectPath, ['init', '--yes']).status, 0);
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

test('detects bundled template changes without local file changes', () => {
	const projectPath = createTempProject();
	const templatePath = mkdtempSync(path.join(tmpdir(), 'mustflow-template-'));

	try {
		assert.equal(runCli(projectPath, ['init', '--yes']).status, 0);
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

test('applies safe template updates and refreshes the manifest lock', () => {
	const projectPath = createTempProject();
	const templatePath = mkdtempSync(path.join(tmpdir(), 'mustflow-template-'));

	try {
		assert.equal(runCli(projectPath, ['init', '--yes']).status, 0);
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
		assert.equal(runCli(projectPath, ['init', '--yes']).status, 0);
		cpSync(path.join(projectRoot, 'templates', 'default'), templatePath, { recursive: true });
		const manifestPath = path.join(templatePath, 'manifest.toml');
		const newRelativePath = '.mustflow/docs/new-guide.md';
		const newContent = '# New Guide\n\nTemplate-added file.\n';
		writeFileSync(
			manifestPath,
			readFileSync(manifestPath, 'utf8').replace(
				'  ".mustflow/docs/agent-workflow.md",',
				'  ".mustflow/docs/agent-workflow.md",\n  ".mustflow/docs/new-guide.md",',
			),
		);
		mkdirSync(path.join(templatePath, 'common', '.mustflow', 'docs'), { recursive: true });
		writeFileSync(path.join(templatePath, 'common', ...newRelativePath.split('/')), newContent);

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

test('refuses apply when installed files have local changes', () => {
	const projectPath = createTempProject();
	const templatePath = mkdtempSync(path.join(tmpdir(), 'mustflow-template-'));

	try {
		assert.equal(runCli(projectPath, ['init', '--yes']).status, 0);
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
		assert.equal(runCli(projectPath, ['init', '--yes']).status, 0);
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
		assert.equal(runCli(projectPath, ['init', '--yes']).status, 0);

		const result = runCli(projectPath, ['update']);

		assert.equal(result.status, 1);
		assert.match(result.stderr, /Specify --dry-run or --apply/);
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
