import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { test } from 'node:test';
import { runCliInProcess } from './helpers/cli-harness.js';

function createTempProject() {
	return mkdtempSync(path.join(tmpdir(), 'mustflow-next-'));
}

function removeTempProject(projectPath) {
	rmSync(projectPath, { recursive: true, force: true });
}

async function runCli(cwd, args) {
	return runCliInProcess(cwd, args);
}

async function initProject(projectPath) {
	const result = await runCli(projectPath, ['init', '--yes']);
	assert.equal(result.status, 0, result.stderr || result.stdout);
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
	let result = runGit(projectPath, ['init']);
	assert.equal(result.status, 0, result.stderr || result.stdout);

	for (const args of [
		['config', 'user.email', 'mustflow-tests@example.invalid'],
		['config', 'user.name', 'mustflow tests'],
		['add', '.'],
		['commit', '-m', 'baseline'],
	]) {
		result = runGit(projectPath, args);
		assert.equal(result.status, 0, result.stderr || result.stdout);
	}
}

function commandsPath(projectPath) {
	return path.join(projectPath, '.mustflow', 'config', 'commands.toml');
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

function appendIntent(projectPath, text) {
	const commands = readFileSync(commandsPath(projectPath), 'utf8');
	writeFileSync(commandsPath(projectPath), `${commands}\n${text.trim()}\n`);
	refreshManifestLockHash(projectPath, '.mustflow/config/commands.toml');
}

function writeChangedSource(projectPath) {
	mkdirSync(path.join(projectPath, 'src'), { recursive: true });
	writeFileSync(path.join(projectPath, 'src', 'index.ts'), 'export const changed = true;\n');
}

test('next reports idle when no changed files need verification', async () => {
	const projectPath = createTempProject();

	try {
		await initProject(projectPath);
		commitGitBaseline(projectPath);

		const result = await runCli(projectPath, ['next', '--json']);
		const output = JSON.parse(result.stdout);

		assert.equal(result.status, 0, result.stderr || result.stdout);
		assert.equal(output.schema_version, '1');
		assert.equal(output.command, 'next');
		assert.equal(output.status, 'idle');
		assert.equal(output.policy.direct_commands_allowed, false);
		assert.equal(output.policy.grants_command_authority, false);
		assert.equal(output.policy.writes_files, false);
		assert.equal(output.state.changed_file_count, 0);
		assert.equal(output.decision.kind, 'none');
		assert.equal(output.script_pack_suggestions.status, 'empty');
		assert.deepEqual(output.script_pack_suggestions.suggestions, []);
	} finally {
		removeTempProject(projectPath);
	}
});

test('next recommends default template verification instead of blocking on missing test commands', async () => {
	const projectPath = createTempProject();

	try {
		await initProject(projectPath);
		commitGitBaseline(projectPath);
		writeChangedSource(projectPath);

		const result = await runCli(projectPath, ['next', '--json']);
		const output = JSON.parse(result.stdout);

		assert.equal(result.status, 0, result.stderr || result.stdout);
		assert.equal(output.status, 'needs_verification');
		assert.equal(output.decision.kind, 'verify');
		assert.equal(output.decision.command, 'mf verify --changed --json');
		assert.ok(output.state.validation_reasons.includes('code_change'));
		assert.ok(output.state.selected_intents.includes('test_related'));
		assert.equal(output.gaps.length, 0);
		assert.ok(output.recommended_commands.includes('mf verify --changed --json'));
		assert.ok(!output.recommended_commands.some((command) => /npm test|bun test|node --test/u.test(command)));
		assert.equal(output.script_pack_suggestions.status, 'suggested');
		assert.ok(
			output.script_pack_suggestions.suggestions.some(
				(suggestion) => suggestion.script_ref === 'repo/generated-boundary',
			),
		);
		assert.ok(
			output.script_pack_suggestions.suggestions.every(
				(suggestion) => suggestion.read_only && !suggestion.mutates && !suggestion.network,
			),
		);

		const text = await runCli(projectPath, ['next']);
		assert.equal(text.status, 0, text.stderr || text.stdout);
		assert.match(text.stdout, /mf verify --changed --json/u);
		assert.match(text.stdout, /repo\/generated-boundary/u);
		assert.doesNotMatch(text.stdout, /npm test|bun test|node --test/u);
	} finally {
		removeTempProject(projectPath);
	}
});

test('next recommends configured verification when changed files are covered', async () => {
	const projectPath = createTempProject();

	try {
		await initProject(projectPath);
		appendIntent(
			projectPath,
			`
[intents.code_probe]
status = "configured"
lifecycle = "oneshot"
run_policy = "agent_allowed"
description = "Probe code-change verification."
argv = ['${process.execPath}', '-e', 'console.log("code probe")']
cwd = "."
timeout_seconds = 10
stdin = "closed"
success_exit_codes = [0]
writes = []
network = false
destructive = false
required_after = ["code_change"]
`,
		);
		commitGitBaseline(projectPath);
		writeChangedSource(projectPath);

		const result = await runCli(projectPath, ['next', '--json']);
		const output = JSON.parse(result.stdout);

		assert.equal(result.status, 0, result.stderr || result.stdout);
		assert.equal(output.status, 'needs_verification');
		assert.equal(output.decision.kind, 'verify');
		assert.equal(output.decision.command, 'mf verify --changed --json');
		assert.ok(output.state.selected_intents.includes('code_probe'));
		assert.ok(output.state.selected_intents.includes('test_related'));
		assert.deepEqual(output.gaps, []);
		assert.ok(output.script_pack_suggestions.suggestions.length > 0);
	} finally {
		removeTempProject(projectPath);
	}
});
