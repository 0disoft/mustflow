import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

const projectRoot = path.resolve(fileURLToPath(new URL('../..', import.meta.url)));
const cliPath = path.join(projectRoot, 'dist', 'cli', 'index.js');

function createTempProject() {
	return mkdtempSync(path.join(tmpdir(), 'mustflow-context-'));
}

function removeTempProject(projectPath) {
	rmSync(projectPath, { recursive: true, force: true });
}

function runCli(cwd, args) {
	return spawnSync(process.execPath, [cliPath, ...args], {
		cwd,
		encoding: 'utf8',
	});
}

function initProject(projectPath) {
	const result = runCli(projectPath, ['init', '--yes']);
	assert.equal(result.status, 0);
}

function appendIntent(projectPath, text) {
	const commandsPath = path.join(projectPath, '.mustflow', 'config', 'commands.toml');
	const commands = readFileSync(commandsPath, 'utf8');
	writeFileSync(commandsPath, `${commands}\n${text.trim()}\n`);
	refreshManifestLockHash(projectPath, '.mustflow/config/commands.toml');
}

function replaceInMustflowToml(projectPath, pattern, replacement) {
	const configPath = path.join(projectPath, '.mustflow', 'config', 'mustflow.toml');
	const config = readFileSync(configPath, 'utf8');
	writeFileSync(configPath, config.replace(pattern, replacement));
	refreshManifestLockHash(projectPath, '.mustflow/config/mustflow.toml');
}

function refreshManifestLockHash(projectPath, relativePath) {
	const lockPath = path.join(projectPath, '.mustflow', 'config', 'manifest.lock.toml');
	const filePath = path.join(projectPath, ...relativePath.split('/'));
	const hash = `sha256:${createHash('sha256').update(readFileSync(filePath)).digest('hex')}`;
	const lock = readFileSync(lockPath, 'utf8');
	const escapedPath = relativePath.replace(/[.*+?^${}()|[\]\\]/gu, '\\$&');
	const pattern = new RegExp(`(\\[files\\."${escapedPath}"\\][\\s\\S]*?content_hash = ")[^"]+(")`, 'u');
	writeFileSync(lockPath, lock.replace(pattern, `$1${hash}$2`));
}

test('prints a machine-readable agent context without command output tails', () => {
	const projectPath = createTempProject();

	try {
		initProject(projectPath);
		appendIntent(
			projectPath,
			`
[intents.echo_context]
status = "configured"
lifecycle = "oneshot"
run_policy = "agent_allowed"
description = "Print a context test message."
argv = ['${process.execPath}', '-e', 'console.log("context output should stay in receipt only")']
cwd = "."
timeout_seconds = 10
stdin = "closed"
success_exit_codes = [0]
writes = []
network = false
destructive = false

[intents.shell_without_allow_shell_context]
status = "configured"
lifecycle = "oneshot"
run_policy = "agent_allowed"
description = "Probe shared runnable eligibility for shell intents."
mode = "shell"
cmd = "echo context shell probe"
cwd = "."
timeout_seconds = 10
stdin = "closed"
success_exit_codes = [0]
writes = []
network = false
destructive = false

[intents.cwd_outside_context]
status = "configured"
lifecycle = "oneshot"
run_policy = "agent_allowed"
description = "Probe shared run-plan eligibility for cwd validation."
argv = ['${process.execPath}', '-e', 'console.log("outside cwd probe")']
cwd = "../outside"
timeout_seconds = 10
stdin = "closed"
success_exit_codes = [0]
writes = []
network = false
destructive = false
`,
		);

		const run = runCli(projectPath, ['run', 'echo_context', '--json']);
		assert.equal(run.status, 0);

		const result = runCli(projectPath, ['context', '--json']);
		const context = JSON.parse(result.stdout);
		const echoIntent = context.command_contract.intents.find((intent) => intent.name === 'echo_context');

		assert.equal(result.status, 0);
		assert.equal(context.schema_version, '1');
		assert.equal(context.command, 'context');
		assert.equal(context.installed, true);
		assert.equal(context.mustflow_root, projectPath);
		assert.equal(context.authority.primary_instruction, 'AGENTS.md');
		assert.equal(context.read_order[0].path, 'AGENTS.md');
		assert.equal(context.read_order[0].exists, true);
		assert.equal(context.command_contract.path, '.mustflow/config/commands.toml');
		assert.equal(echoIntent.status, 'configured');
		assert.equal(echoIntent.lifecycle, 'oneshot');
		assert.equal(echoIntent.run_policy, 'agent_allowed');
		assert.ok(context.command_contract.runnable_intents.includes('echo_context'));
		assert.equal(context.command_contract.runnable_intents.includes('shell_without_allow_shell_context'), false);
		assert.equal(context.command_contract.runnable_intents.includes('cwd_outside_context'), false);
		assert.equal(context.effective_policy.entrypoint, 'AGENTS.md');
		assert.equal(context.effective_policy.nearest_agents, 'AGENTS.md');
		assert.equal(context.effective_policy.command_contract, '.mustflow/config/commands.toml');
		assert.equal(context.effective_policy.project_commands_require_mf_run, true);
		assert.equal(context.effective_policy.allow_inferred_commands, false);
		assert.equal(context.effective_policy.auto_stage, false);
		assert.equal(context.effective_policy.auto_commit, false);
		assert.equal(context.effective_policy.auto_push, false);
		assert.equal(context.effective_policy.state_is_versioned, false);
		assert.equal(context.effective_policy.raw_logs_allowed, false);
		assert.equal(context.state_policy.cache_path, '.mustflow/cache/');
		assert.equal(context.state_policy.state_path, '.mustflow/state/');
		assert.equal(context.state_policy.versioned, false);
		assert.equal(context.state_policy.safe_to_delete, true);
		assert.equal(context.state_policy.stores_raw_conversation, false);
		assert.equal(context.state_policy.stores_full_terminal_output, false);
		assert.equal(context.state_policy.stores_hidden_chain_of_thought, false);
		assert.ok(context.blocked_actions.includes('unconfigured_project_command'));
		assert.ok(context.blocked_actions.includes('unmanaged_long_running_process'));
		assert.ok(context.blocked_actions.includes('auto_push'));
		assert.ok(context.blocked_actions.includes('raw_transcript_storage'));
		assert.equal(context.latest_run.exists, true);
		assert.equal(context.latest_run.intent, 'echo_context');
		assert.equal(context.latest_run.status, 'passed');
		assert.equal(context.latest_run.timed_out, false);
		assert.equal(context.latest_run.exit_code, 0);
		assert.equal(context.latest_run.stdout, undefined);
		assert.equal(context.latest_run.stderr, undefined);
	} finally {
		removeTempProject(projectPath);
	}
});

test('prints cache-profile context without volatile stable-prefix fields', () => {
	const projectPath = createTempProject();

	try {
		initProject(projectPath);

		const result = runCli(projectPath, ['context', '--json', '--cache-profile', 'stable']);
		const context = JSON.parse(result.stdout);

		assert.equal(result.status, 0, result.stderr || result.stdout);
		assert.equal(context.schema_version, '1');
		assert.equal(context.command, 'context');
		assert.equal(context.cache_profile, 'stable');
		assert.equal(context.mustflow_root, undefined);
		assert.equal(context.latest_run, undefined);
		assert.equal(context.prompt_cache.strategy, 'stable_prefix');
		assert.equal(context.prompt_cache.stable_prefix_policy, 'hash_verified');
		assert.equal(context.prompt_cache.exclude_volatile_state_from_prefix, true);
		assert.equal(context.stable_prefix.cache_layer, 'stable');
		assert.match(context.stable_prefix.cache_key, /^sha256:[a-f0-9]{64}$/);
		assert.ok(context.stable_prefix.documents.some((document) => document.path === 'AGENTS.md'));
		assert.ok(context.stable_prefix.documents.some((document) => document.path === '.mustflow/skills/routes.toml'));
		assert.equal(context.stable_prefix.documents.some((document) => document.path === '.mustflow/skills/INDEX.md'), false);
		assert.ok(context.stable_prefix.documents.every((document) => document.content_hash === null || /^sha256:[a-f0-9]{64}$/.test(document.content_hash)));
		assert.ok(context.stable_prefix.volatile_excluded.includes('.mustflow/state/runs/latest.json'));
	} finally {
		removeTempProject(projectPath);
	}
});

test('prints all prompt-cache layers when requested', () => {
	const projectPath = createTempProject();

	try {
		initProject(projectPath);

		const result = runCli(projectPath, ['context', '--json', '--cache-profile', 'all']);
		const context = JSON.parse(result.stdout);

		assert.equal(result.status, 0, result.stderr || result.stdout);
		assert.equal(context.cache_profile, 'all');
		assert.equal(context.stable_prefix.cache_layer, 'stable');
		assert.equal(context.task_context.cache_layer, 'task');
		assert.equal(context.task_context.read_policy, 'task_relevant_only');
		assert.ok(context.task_context.sources.includes('.mustflow/skills/INDEX.md'));
		assert.ok(context.task_context.sources.includes('REPO_MAP.md'));
		assert.equal(context.task_context.local_index.source, 'local_index');
		assert.equal(context.task_context.local_index.status, 'missing');
		assert.equal(context.task_context.local_index.index_fresh, false);
		assert.deepEqual(context.task_context.local_index.stale_paths, []);
		assert.equal(context.task_context.local_index.search_backend, null);
		assert.equal(context.task_context.local_index.search_fts5_available, null);
		assert.match(context.task_context.local_index.refresh_hint, /mf index/u);
		assert.equal(context.volatile_suffix.cache_layer, 'volatile');
		assert.equal(context.volatile_suffix.never_place_before_stable_prefix, true);
		assert.equal(context.volatile_suffix.include_absolute_root, false);
		assert.equal(context.volatile_suffix.include_latest_run, false);
	} finally {
		removeTempProject(projectPath);
	}
});

test('prints prompt-cache audit sizes and budget status when requested', () => {
	const projectPath = createTempProject();

	try {
		initProject(projectPath);
		replaceInMustflowToml(projectPath, /max_stable_prefix_kb = 96/u, 'max_stable_prefix_kb = 1');

		const result = runCli(projectPath, ['context', '--json', '--cache-profile', 'stable', '--cache-audit']);
		const context = JSON.parse(result.stdout);
		const stableAudit = context.cache_audit.layers.find((layer) => layer.cache_layer === 'stable');

		assert.equal(result.status, 0, result.stderr || result.stdout);
		assert.equal(context.cache_profile, 'stable');
		assert.equal(context.cache_audit.measurement, 'reference_bundle');
		assert.equal(context.cache_audit.estimator.estimated_bytes_per_token, 4);
		assert.ok(stableAudit.rendered_bytes > 0);
		assert.ok(stableAudit.estimated_tokens > 0);
		assert.equal(stableAudit.budget_kb, 1);
		assert.equal(stableAudit.budget_bytes, 1024);
		assert.equal(stableAudit.budget_status, 'over_budget');
		assert.equal(stableAudit.target_kb, 48);
		assert.equal(stableAudit.target_bytes, 49152);
		assert.equal(stableAudit.target_status, 'within_budget');
		assert.ok(stableAudit.rendered_bytes <= stableAudit.target_bytes);
		assert.ok(stableAudit.issues.some((issue) => issue.includes('stable prefix exceeds max_stable_prefix_kb')));
		assert.ok(stableAudit.blocks.some((block) => block.path === '.mustflow/skills/routes.toml'));
		assert.equal(stableAudit.blocks.some((block) => block.path === '.mustflow/skills/INDEX.md'), false);
		assert.ok(stableAudit.largest_blocks.length > 0);
		assert.ok(stableAudit.largest_blocks[0].rendered_bytes >= stableAudit.largest_blocks.at(-1).rendered_bytes);
	} finally {
		removeTempProject(projectPath);
	}
});

test('prints all prompt-cache audit layers without requiring an explicit profile', () => {
	const projectPath = createTempProject();

	try {
		initProject(projectPath);

		const result = runCli(projectPath, ['context', '--json', '--cache-audit']);
		const context = JSON.parse(result.stdout);

		assert.equal(result.status, 0, result.stderr || result.stdout);
		assert.equal(context.cache_profile, 'all');
		assert.deepEqual(
			context.cache_audit.layers.map((layer) => layer.cache_layer),
			['stable', 'task', 'volatile'],
		);
		assert.equal(context.cache_audit.layers[1].budget_status, 'unknown');
		assert.equal(context.cache_audit.layers[1].target_status, 'unknown');
		assert.equal(context.cache_audit.layers[1].blocks[0].kind, 'source_placeholder');
		assert.match(context.cache_audit.layers[1].blocks[0].issue, /unresolved/u);
	} finally {
		removeTempProject(projectPath);
	}
});

test('context cache-profile options use the shared CLI option rules', () => {
	const projectPath = createTempProject();

	try {
		initProject(projectPath);

		const inlineProfile = runCli(projectPath, ['context', '--json', '--cache-profile=stable']);
		const missingValue = runCli(projectPath, ['context', '--json', '--cache-profile']);
		const withoutJson = runCli(projectPath, ['context', '--cache-profile', 'stable']);
		const auditWithoutJson = runCli(projectPath, ['context', '--cache-audit']);
		const unknownOption = runCli(projectPath, ['context', '--bad']);

		assert.equal(inlineProfile.status, 0, inlineProfile.stderr || inlineProfile.stdout);
		assert.equal(JSON.parse(inlineProfile.stdout).cache_profile, 'stable');
		assert.equal(missingValue.status, 1);
		assert.match(missingValue.stderr, /Missing value for --cache-profile/u);
		assert.equal(withoutJson.status, 1);
		assert.match(withoutJson.stderr, /Unexpected argument: --cache-profile/u);
		assert.equal(auditWithoutJson.status, 1);
		assert.match(auditWithoutJson.stderr, /Unexpected argument: --cache-audit/u);
		assert.equal(unknownOption.status, 1);
		assert.match(unknownOption.stderr, /Unknown option: --bad/u);
	} finally {
		removeTempProject(projectPath);
	}
});

test('prints prompt-cache task local-index status when the index is fresh or stale', () => {
	const projectPath = createTempProject();

	try {
		initProject(projectPath);

		const index = runCli(projectPath, ['index', '--json']);
		assert.equal(index.status, 0, index.stderr || index.stdout);

		const freshResult = runCli(projectPath, ['context', '--json', '--cache-profile', 'task']);
		const freshContext = JSON.parse(freshResult.stdout);

		assert.equal(freshResult.status, 0, freshResult.stderr || freshResult.stdout);
		assert.equal(freshContext.task_context.local_index.status, 'fresh');
		assert.equal(freshContext.task_context.local_index.index_fresh, true);
		assert.deepEqual(freshContext.task_context.local_index.stale_paths, []);
		assert.match(freshContext.task_context.local_index.database_path, /\.mustflow[\\/]+cache[\\/]+mustflow\.sqlite$/u);
		assert.ok(['fts5', 'table_scan'].includes(freshContext.task_context.local_index.search_backend));
		assert.equal(typeof freshContext.task_context.local_index.search_fts5_available, 'boolean');
		assert.equal(freshContext.task_context.local_index.refresh_hint, null);

		const agentsPath = path.join(projectPath, 'AGENTS.md');
		writeFileSync(agentsPath, `${readFileSync(agentsPath, 'utf8')}\n<!-- context stale probe -->\n`);

		const staleResult = runCli(projectPath, ['context', '--json', '--cache-profile', 'task']);
		const staleContext = JSON.parse(staleResult.stdout);

		assert.equal(staleResult.status, 0, staleResult.stderr || staleResult.stdout);
		assert.equal(staleContext.task_context.local_index.status, 'stale');
		assert.equal(staleContext.task_context.local_index.index_fresh, false);
		assert.ok(staleContext.task_context.local_index.stale_paths.includes('AGENTS.md'));
		assert.match(staleContext.task_context.local_index.refresh_hint, /mf index/u);
	} finally {
		removeTempProject(projectPath);
	}
});
