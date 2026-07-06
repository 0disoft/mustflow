import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { test } from 'node:test';

import { runWorkspace } from '../../dist/cli/commands/workspace.js';
import { createTempProject, runCliCommand } from './helpers/cli-harness.js';

const TEMP_REMOVE_RETRY_COUNT = 30;
const TEMP_REMOVE_RETRY_DELAY_MS = 100;

function removeTempProject(projectPath) {
	let attempt = 0;
	while (attempt < TEMP_REMOVE_RETRY_COUNT) {
		try {
			rmSync(projectPath, { recursive: true, force: true });
			return;
		} catch (error) {
			if (attempt === TEMP_REMOVE_RETRY_COUNT - 1 || !['EBUSY', 'ENOTEMPTY', 'EPERM'].includes(error?.code)) {
				throw error;
			}

			Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, TEMP_REMOVE_RETRY_DELAY_MS);
		}

		attempt += 1;
	}
}

async function runCli(cwd, args) {
	return runCliCommand(cwd, args, runWorkspace);
}

function initProject(projectPath) {
	mkdirSync(path.join(projectPath, '.mustflow', 'config'), { recursive: true });
	writeFileSync(path.join(projectPath, 'AGENTS.md'), '# Workspace fixture\n');
	writeFileSync(
		path.join(projectPath, '.mustflow', 'config', 'mustflow.toml'),
		[
			'version = 1',
			'',
			'[map]',
			'output = "REPO_MAP.md"',
			'mode = "anchors_only"',
			'privacy = "minimal"',
			'include_nested = false',
			'',
			'[workspace]',
			'enabled = false',
			'roots = []',
			'max_depth = 4',
			'max_repositories = 10',
			'follow_symlinks = false',
			'stop_at_repository_root = true',
			'',
			'[capabilities]',
			'workflow = true',
			'',
		].join('\n'),
	);
}

function runGit(projectPath, args) {
	return spawnSync('git', ['-C', projectPath, ...args], {
		cwd: projectPath,
		encoding: 'utf8',
		stdio: ['ignore', 'pipe', 'pipe'],
		windowsHide: true,
	});
}

function commitGitBaseline(projectPath) {
	for (const args of [
		['config', 'user.email', 'mustflow-tests@example.invalid'],
		['config', 'user.name', 'mustflow tests'],
		['add', '.'],
		['commit', '-m', 'baseline'],
	]) {
		const result = runGit(projectPath, args);
		if (result.status !== 0) {
			return false;
		}
	}

	return true;
}

function enableWorkspace(projectPath) {
	const configPath = path.join(projectPath, '.mustflow', 'config', 'mustflow.toml');
	const config = readFileSync(configPath, 'utf8');
	writeFileSync(
		configPath,
		config.replace(
			/\[workspace\][\s\S]*?(?=\n\[capabilities\])/u,
			[
				'[workspace]',
				'enabled = true',
				'roots = ["packages"]',
				'max_depth = 4',
				'max_repositories = 10',
				'follow_symlinks = false',
				'stop_at_repository_root = true',
				'',
			].join('\n'),
		),
	);
}

function createNestedRepository(projectPath) {
	const childRoot = path.join(projectPath, 'packages', 'child');
	mkdirSync(path.join(childRoot, '.mustflow', 'config'), { recursive: true });
	writeFileSync(path.join(childRoot, 'AGENTS.md'), '# Child agent rules\n');
	writeFileSync(
		path.join(childRoot, '.mustflow', 'config', 'commands.toml'),
		[
			'schema_version = "1"',
			'',
			'[defaults]',
			'stdin = "closed"',
			'default_timeout_seconds = 30',
			'',
			'[intents.child_check]',
			'status = "configured"',
			'lifecycle = "oneshot"',
			'run_policy = "agent_allowed"',
			'description = "Print child check"',
			`argv = ["${process.execPath.replace(/\\/gu, '\\\\')}", "-e", "console.log('child')"]`,
			'cwd = "."',
			'timeout_seconds = 10',
			'stdin = "closed"',
			'success_exit_codes = [0]',
			'writes = []',
			'network = false',
			'destructive = false',
			'required_after = ["code_change"]',
			'',
			'[intents.child_manual]',
			'status = "manual_only"',
			'description = "Manual child check"',
			'reason = "Manual review only."',
			'agent_action = "do_not_run_report_manual"',
			'required_after = ["manual_review"]',
			'',
		].join('\n'),
	);
	const initResult = runGit(childRoot, ['init']);
	assert.equal(initResult.status, 0, initResult.stderr || initResult.stdout);
	return childRoot;
}

function createBareNestedRepository(projectPath, relativePath) {
	const childRoot = path.join(projectPath, ...relativePath.split('/'));
	mkdirSync(path.join(childRoot, '.git'), { recursive: true });
	writeFileSync(path.join(childRoot, 'README.md'), `# ${relativePath}\n`);
	return childRoot;
}

test('workspace scan discovers projects repositories without workspace configuration', async () => {
	const projectPath = createTempProject();

	try {
		createBareNestedRepository(projectPath, 'projects/products/app');
		createBareNestedRepository(projectPath, 'projects/experiments/tool');

		const result = await runCli(projectPath, ['workspace', 'scan', '--json']);
		const output = JSON.parse(result.stdout);

		assert.equal(result.status, 0, result.stderr || result.stdout);
		assert.equal(result.stderr, '');
		assert.equal(output.schema_version, '1');
		assert.equal(output.command, 'workspace scan');
		assert.equal(output.workspace.enabled, true);
		assert.deepEqual(output.workspace.roots, ['projects']);
		assert.equal(output.repository_count, 2);
		assert.deepEqual(
			output.repositories.map((repository) => repository.relative_path),
			['projects/experiments/tool/', 'projects/products/app/'],
		);
		assert.equal(output.policy.grants_command_authority, false);
		assert.equal(output.policy.executes_commands, false);
		assert.deepEqual(output.next_actions, [
			'mf init inside one target repository',
			'mf workspace status --json after configuring workspace roots',
		]);
	} finally {
		removeTempProject(projectPath);
	}
});

test('workspace status reports disabled workspace without granting authority', async () => {
	const projectPath = createTempProject();

	try {
		initProject(projectPath);
		const result = await runCli(projectPath, ['workspace', 'status', '--json']);
		const output = JSON.parse(result.stdout);

		assert.equal(result.status, 0, result.stderr || result.stdout);
		assert.equal(result.stderr, '');
		assert.equal(output.schema_version, '1');
		assert.equal(output.command, 'workspace status');
		assert.equal(output.workspace.enabled, false);
		assert.equal(output.repository_count, 0);
		assert.deepEqual(output.repositories, []);
		assert.equal(output.policy.mode, 'read_only');
		assert.equal(output.policy.grants_command_authority, false);
		assert.equal(output.policy.parent_root_grants_child_authority, false);
		assert.equal(output.policy.command_authority_per_root, '.mustflow/config/commands.toml');
		assert.equal(output.policy.run_entrypoint_per_root, 'mf run <intent>');
		assert.equal(output.policy.executes_commands, false);
		assert.equal(output.policy.raw_commands_included, false);
	} finally {
		removeTempProject(projectPath);
	}
});

test('workspace status discovers nested repositories and local command contracts', async () => {
	const projectPath = createTempProject();

	try {
		initProject(projectPath);
		enableWorkspace(projectPath);
		createNestedRepository(projectPath);

		const result = await runCli(projectPath, ['workspace', 'status', '--json']);
		const output = JSON.parse(result.stdout);

		assert.equal(result.status, 0, result.stderr || result.stdout);
		assert.equal(output.workspace.enabled, true);
		assert.deepEqual(output.workspace.roots, ['packages']);
		assert.equal(output.repository_count, 1);
		assert.equal(output.repositories[0].relative_path, 'packages/child/');
		assert.equal(output.repositories[0].status, 'mustflow_ready');
		assert.equal(output.repositories[0].git_repository, true);
		assert.equal(output.repositories[0].mustflow, true);
		assert.equal(output.repositories[0].agent_rules, 'packages/child/AGENTS.md');
		assert.equal(output.repositories[0].command_contract.path, 'packages/child/.mustflow/config/commands.toml');
		assert.equal(output.repositories[0].command_contract.total_intents, 2);
		assert.equal(output.repositories[0].command_contract.runnable_count, 1);
		assert.deepEqual(output.repositories[0].command_contract.runnable_intents, ['child_check']);
		assert.deepEqual(output.repositories[0].issues, []);
	} finally {
		removeTempProject(projectPath);
	}
});

test('workspace command-catalog aggregates child command contracts without raw commands', async () => {
	const projectPath = createTempProject();

	try {
		initProject(projectPath);
		enableWorkspace(projectPath);
		createNestedRepository(projectPath);

		const result = await runCli(projectPath, ['workspace', 'command-catalog', '--json']);
		const output = JSON.parse(result.stdout);
		const repository = output.repositories[0];
		const childCheck = repository.intents.find((intent) => intent.name === 'child_check');
		const childManual = repository.intents.find((intent) => intent.name === 'child_manual');

		assert.equal(result.status, 0, result.stderr || result.stdout);
		assert.equal(output.schema_version, '1');
		assert.equal(output.command, 'workspace command-catalog');
		assert.equal(output.policy.parent_root_grants_child_authority, false);
		assert.equal(output.policy.executes_commands, false);
		assert.equal(output.policy.raw_commands_included, false);
		assert.equal(output.repository_count, 1);
		assert.equal(output.total_intent_count, 2);
		assert.equal(output.runnable_intent_count, 1);
		assert.equal(repository.relative_path, 'packages/child/');
		assert.equal(repository.status, 'available');
		assert.equal(repository.intent_count, 2);
		assert.equal(repository.runnable_count, 1);
		assert.equal(repository.blocked_count, 1);
		assert.equal(repository.command_contract.path, 'packages/child/.mustflow/config/commands.toml');
		assert.ok(childCheck);
		assert.equal(childCheck.runnable, true);
		assert.equal(childCheck.run_command, 'mf run child_check');
		assert.equal(childCheck.run_from_repository, 'packages/child/');
		assert.equal('argv' in childCheck, false);
		assert.equal('cmd' in childCheck, false);
		assert.ok(childManual);
		assert.equal(childManual.runnable, false);
		assert.equal(childManual.run_command, null);
		assert.deepEqual(childManual.required_after, ['manual_review']);
	} finally {
		removeTempProject(projectPath);
	}
});

test('workspace command-fragments suggests repo-level fragments without writing files', async () => {
	const projectPath = createTempProject();

	try {
		createBareNestedRepository(projectPath, 'projects/zdp-platforms/platform/zdp-auth-ui');
		createBareNestedRepository(projectPath, 'projects/zdp-platforms/platform/zdp-platform-runtime');

		const result = await runCli(projectPath, ['workspace', 'command-fragments', '--projects-dir', 'projects', '--json']);
		const output = JSON.parse(result.stdout);

		assert.equal(result.status, 0, result.stderr || result.stdout);
		assert.equal(output.schema_version, '1');
		assert.equal(output.command, 'workspace command-fragments');
		assert.equal(output.repository_count, 2);
		assert.equal(output.policy.writes_files, false);
		assert.equal(output.policy.suggestions_are_review_only, true);
		assert.equal(output.policy.parent_fragments_grant_child_authority, false);
		assert.equal(output.fragment_directory, '.mustflow/config/commands');
		assert.equal(output.root_command_contract, '.mustflow/config/commands.toml');
		assert.deepEqual(
			output.suggestions.map((suggestion) => suggestion.repository),
			['projects/zdp-platforms/platform/zdp-auth-ui/', 'projects/zdp-platforms/platform/zdp-platform-runtime/'],
		);
		assert.deepEqual(
			output.suggestions.map((suggestion) => suggestion.suggested_fragment_path),
			[
				'.mustflow/config/commands/zdp-auth-ui.toml',
				'.mustflow/config/commands/zdp-platform-runtime.toml',
			],
		);
		assert.match(output.root_include_snippet, /"commands\/zdp-auth-ui\.toml"/u);
		assert.match(output.root_include_snippet, /"commands\/zdp-platform-runtime\.toml"/u);
		assert.equal(output.suggestions[0].status, 'contract_missing');
		assert.equal(output.suggestions[0].source_command_contract, null);
		assert.ok(output.next_actions.includes('Prefer child repository command contracts for repository-owned commands.'));
	} finally {
		removeTempProject(projectPath);
	}
});

test('workspace command-fragments disambiguates duplicate repository leaf names', async () => {
	const projectPath = createTempProject();

	try {
		createBareNestedRepository(projectPath, 'projects/team-a/api');
		createBareNestedRepository(projectPath, 'projects/team-b/api');

		const result = await runCli(projectPath, ['workspace', 'command-fragments', '--projects-dir', 'projects', '--json']);
		const output = JSON.parse(result.stdout);

		assert.equal(result.status, 0, result.stderr || result.stdout);
		assert.deepEqual(
			output.suggestions.map((suggestion) => suggestion.include_entry),
			['commands/projects--team-a--api.toml', 'commands/projects--team-b--api.toml'],
		);
	} finally {
		removeTempProject(projectPath);
	}
});

test('workspace verify plans changed-file verification per child repository without running commands', async () => {
	const projectPath = createTempProject();

	try {
		initProject(projectPath);
		enableWorkspace(projectPath);
		const childRoot = createNestedRepository(projectPath);
		assert.equal(commitGitBaseline(childRoot), true);
		mkdirSync(path.join(childRoot, 'src'), { recursive: true });
		writeFileSync(path.join(childRoot, 'src', 'index.ts'), 'export const child = true;\n');

		const result = await runCli(projectPath, ['workspace', 'verify', '--changed', '--plan-only', '--json']);
		const output = JSON.parse(result.stdout);
		const repository = output.repositories[0];

		assert.equal(result.status, 0, result.stderr || result.stdout);
		assert.equal(output.schema_version, '1');
		assert.equal(output.command, 'workspace verify');
		assert.equal(output.policy.parent_root_grants_child_authority, false);
		assert.equal(output.policy.executes_commands, false);
		assert.equal(output.policy.raw_commands_included, false);
		assert.equal(output.policy.plan_command_per_root, 'mf verify --changed --plan-only --json');
		assert.equal(output.policy.selected_intents_run_via, 'mf run <intent>');
		assert.equal(output.repository_count, 1);
		assert.equal(output.total_changed_file_count, 1);
		assert.equal(output.total_selected_intent_count, 1);
		assert.equal(repository.relative_path, 'packages/child/');
		assert.equal(repository.status, 'available');
		assert.deepEqual(repository.changed_files, ['src/index.ts']);
		assert.match(repository.verification_plan_id, /^sha256:[0-9a-f]{64}$/u);
		assert.equal(repository.selected_intents[0].intent, 'child_check');
		assert.equal(repository.selected_intents[0].run_command, 'mf run child_check');
		assert.equal(repository.selected_intents[0].run_from_repository, 'packages/child/');
		assert.equal('argv' in repository.selected_intents[0], false);
		assert.equal('cmd' in repository.selected_intents[0], false);
	} finally {
		removeTempProject(projectPath);
	}
});

test('workspace status rejects unknown options', async () => {
	const projectPath = createTempProject();

	try {
		initProject(projectPath);
		const result = await runCli(projectPath, ['workspace', 'status', '--bad']);

		assert.equal(result.status, 1);
		assert.match(result.stderr, /Unknown option: --bad/u);
		assert.match(result.stderr, /mf workspace --help/u);
	} finally {
		removeTempProject(projectPath);
	}
});

test('workspace scan rejects unknown options', async () => {
	const projectPath = createTempProject();

	try {
		const result = await runCli(projectPath, ['workspace', 'scan', '--bad']);

		assert.equal(result.status, 1);
		assert.match(result.stderr, /Unknown option: --bad/u);
		assert.match(result.stderr, /mf workspace --help/u);
	} finally {
		removeTempProject(projectPath);
	}
});

test('workspace command-catalog rejects unknown options', async () => {
	const projectPath = createTempProject();

	try {
		initProject(projectPath);
		const result = await runCli(projectPath, ['workspace', 'command-catalog', '--bad']);

		assert.equal(result.status, 1);
		assert.match(result.stderr, /Unknown option: --bad/u);
		assert.match(result.stderr, /mf workspace --help/u);
	} finally {
		removeTempProject(projectPath);
	}
});

test('workspace command-fragments rejects unknown options', async () => {
	const projectPath = createTempProject();

	try {
		initProject(projectPath);
		const result = await runCli(projectPath, ['workspace', 'command-fragments', '--bad']);

		assert.equal(result.status, 1);
		assert.match(result.stderr, /Unknown option: --bad/u);
		assert.match(result.stderr, /mf workspace --help/u);
	} finally {
		removeTempProject(projectPath);
	}
});

test('workspace verify rejects unsafe option combinations', async () => {
	const projectPath = createTempProject();

	try {
		initProject(projectPath);
		const missingChanged = await runCli(projectPath, ['workspace', 'verify', '--plan-only']);
		const missingPlanOnly = await runCli(projectPath, ['workspace', 'verify', '--changed']);
		const unknownOption = await runCli(projectPath, ['workspace', 'verify', '--bad']);

		assert.equal(missingChanged.status, 1);
		assert.match(missingChanged.stderr, /requires --changed/u);
		assert.equal(missingPlanOnly.status, 1);
		assert.match(missingPlanOnly.stderr, /requires --plan-only/u);
		assert.equal(unknownOption.status, 1);
		assert.match(unknownOption.stderr, /Unknown option: --bad/u);
	} finally {
		removeTempProject(projectPath);
	}
});
