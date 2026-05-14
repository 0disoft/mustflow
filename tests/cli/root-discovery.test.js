import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import {
	existsSync,
	mkdtempSync,
	mkdirSync,
	readFileSync,
	rmSync,
	writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

const projectRoot = path.resolve(fileURLToPath(new URL('../..', import.meta.url)));
const cliPath = path.join(projectRoot, 'dist', 'cli', 'index.js');

function createTempProject() {
	return mkdtempSync(path.join(tmpdir(), 'mustflow-root-'));
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
	assert.equal(result.status, 0, result.stderr || result.stdout);
}

function sha256File(filePath) {
	return `sha256:${createHash('sha256').update(readFileSync(filePath)).digest('hex')}`;
}

function escapeRegExp(text) {
	return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function updateManifestLockHash(projectPath, relativePath) {
	const lockPath = path.join(projectPath, '.mustflow', 'config', 'manifest.lock.toml');
	const filePath = path.join(projectPath, ...relativePath.split('/'));
	const lock = readFileSync(lockPath, 'utf8');
	const pattern = new RegExp(`(\\[files\\."${escapeRegExp(relativePath)}"\\][\\s\\S]*?content_hash = ")[^"]+(")`);
	const updated = lock.replace(pattern, `$1${sha256File(filePath)}$2`);

	if (updated === lock) {
		throw new Error(`No manifest lock entry found for ${relativePath}`);
	}

	writeFileSync(lockPath, updated);
}

function appendIntent(projectPath, text) {
	const commandsRelativePath = '.mustflow/config/commands.toml';
	const commandsPath = path.join(projectPath, ...commandsRelativePath.split('/'));
	const commands = readFileSync(commandsPath, 'utf8');
	writeFileSync(commandsPath, `${commands}\n${text.trim()}\n`);
	updateManifestLockHash(projectPath, commandsRelativePath);
}

function printCwdIntent(name, description) {
	return `
[intents.${name}]
status = "configured"
lifecycle = "oneshot"
run_policy = "agent_allowed"
description = "${description}"
argv = ['${process.execPath}', '-e', 'console.log(process.cwd())']
cwd = "."
timeout_seconds = 10
stdin = "closed"
success_exit_codes = [0]
writes = []
network = false
destructive = false
`;
}

test('installed mustflow commands resolve the nearest mustflow root from nested directories', () => {
	const projectPath = createTempProject();

	try {
		initProject(projectPath);
		const nestedPath = path.join(projectPath, 'src', 'feature', 'deep');
		mkdirSync(nestedPath, { recursive: true });
		appendIntent(
			projectPath,
			printCwdIntent('print_cwd', 'Print the process working directory.'),
		);

		const check = runCli(nestedPath, ['check', '--strict', '--json']);
		const checkJson = JSON.parse(check.stdout);
		assert.equal(check.status, 0, check.stderr || check.stdout);
		assert.equal(checkJson.ok, true);

		const context = runCli(nestedPath, ['context', '--json']);
		const contextJson = JSON.parse(context.stdout);
		assert.equal(context.status, 0, context.stderr || context.stdout);
		assert.equal(path.resolve(contextJson.mustflow_root), path.resolve(projectPath));

		const commandsHelp = runCli(nestedPath, ['help', 'commands']);
		assert.equal(commandsHelp.status, 0, commandsHelp.stderr || commandsHelp.stdout);
		assert.match(commandsHelp.stdout, /print_cwd: configured/);

		const run = runCli(nestedPath, ['run', 'print_cwd', '--json']);
		const receipt = JSON.parse(run.stdout);
		assert.equal(run.status, 0, run.stderr || run.stdout);
		assert.equal(receipt.cwd, '.');
		assert.equal(path.resolve(receipt.stdout.tail.trim()), path.resolve(projectPath));
		assert.ok(existsSync(path.join(projectPath, '.mustflow', 'state', 'runs', 'latest.json')));
		assert.equal(existsSync(path.join(nestedPath, '.mustflow', 'state', 'runs', 'latest.json')), false);

		const update = runCli(nestedPath, ['update', '--dry-run', '--json']);
		const updateJson = JSON.parse(update.stdout);
		assert.equal(update.status, 0, update.stderr || update.stdout);
		assert.equal(updateJson.ok, true);

		const map = runCli(nestedPath, ['map', '--write']);
		assert.equal(map.status, 0, map.stderr || map.stdout);
		assert.ok(existsSync(path.join(projectPath, 'REPO_MAP.md')));
		assert.equal(existsSync(path.join(nestedPath, 'REPO_MAP.md')), false);
	} finally {
		removeTempProject(projectPath);
	}
});

test('installed mustflow commands prefer a child mustflow root inside a parent project', () => {
	const parentPath = createTempProject();

	try {
		initProject(parentPath);
		const childPath = path.join(parentPath, 'packages', 'child');
		mkdirSync(childPath, { recursive: true });
		initProject(childPath);
		const childNestedPath = path.join(childPath, 'src', 'feature');
		mkdirSync(childNestedPath, { recursive: true });

		appendIntent(
			parentPath,
			printCwdIntent('print_parent_cwd', 'Print the parent process working directory.'),
		);
		appendIntent(
			childPath,
			printCwdIntent('print_child_cwd', 'Print the child process working directory.'),
		);

		const context = runCli(childNestedPath, ['context', '--json']);
		const contextJson = JSON.parse(context.stdout);
		assert.equal(context.status, 0, context.stderr || context.stdout);
		assert.equal(path.resolve(contextJson.mustflow_root), path.resolve(childPath));

		const commandsHelp = runCli(childNestedPath, ['help', 'commands']);
		assert.equal(commandsHelp.status, 0, commandsHelp.stderr || commandsHelp.stdout);
		assert.match(commandsHelp.stdout, /print_child_cwd: configured/);
		assert.doesNotMatch(commandsHelp.stdout, /print_parent_cwd: configured/);

		const run = runCli(childNestedPath, ['run', 'print_child_cwd', '--json']);
		const receipt = JSON.parse(run.stdout);
		assert.equal(run.status, 0, run.stderr || run.stdout);
		assert.equal(receipt.cwd, '.');
		assert.equal(path.resolve(receipt.stdout.tail.trim()), path.resolve(childPath));
		assert.ok(existsSync(path.join(childPath, '.mustflow', 'state', 'runs', 'latest.json')));
		assert.equal(existsSync(path.join(parentPath, '.mustflow', 'state', 'runs', 'latest.json')), false);

		const parentOnlyIntent = runCli(childNestedPath, ['run', 'print_parent_cwd', '--json']);
		assert.notEqual(parentOnlyIntent.status, 0);
		assert.match(parentOnlyIntent.stderr, /print_parent_cwd/);

		const map = runCli(childNestedPath, ['map', '--write']);
		assert.equal(map.status, 0, map.stderr || map.stdout);
		assert.ok(existsSync(path.join(childPath, 'REPO_MAP.md')));
		assert.equal(existsSync(path.join(parentPath, 'REPO_MAP.md')), false);
	} finally {
		removeTempProject(parentPath);
	}
});
