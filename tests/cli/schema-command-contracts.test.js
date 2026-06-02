import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { parse } from 'smol-toml';
import { assertMatchesSchema } from '../helpers/json-schema.js';

const projectRoot = path.resolve(fileURLToPath(new URL('../..', import.meta.url)));
const cliPath = path.join(projectRoot, 'dist', 'cli', 'index.js');
const schemaRoot = path.join(projectRoot, 'schemas');

function createTempProject() {
	return mkdtempSync(path.join(tmpdir(), 'mustflow-schema-contracts-'));
}

function removeTempProject(projectPath) {
	rmSync(projectPath, { recursive: true, force: true });
}

function runCli(cwd, args, options = {}) {
	return spawnSync(process.execPath, [cliPath, ...args], {
		cwd,
		encoding: 'utf8',
		...options,
	});
}

function initProject(projectPath) {
	const result = runCli(projectPath, ['init', '--yes']);
	assert.equal(result.status, 0, result.stderr || result.stdout);
}

function appendIntent(projectPath, text) {
	const commandsPath = path.join(projectPath, '.mustflow', 'config', 'commands.toml');
	const commands = readFileSync(commandsPath, 'utf8');
	writeFileSync(commandsPath, `${commands}\n${text.trim()}\n`);
	refreshManifestLockHash(projectPath, '.mustflow/config/commands.toml');
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

test('command contract toml parse result matches the published schema', () => {
	const projectPath = createTempProject();

	try {
		initProject(projectPath);
		const commandsPath = path.join(projectPath, '.mustflow', 'config', 'commands.toml');
		const commands = parse(readFileSync(commandsPath, 'utf8'));

		assertMatchesSchema(schemaRoot, 'commands.schema.json', commands);
	} finally {
		removeTempProject(projectPath);
	}
});

test('test selection toml parse result matches the published schema', () => {
	const projectPath = createTempProject();

	try {
		initProject(projectPath);
		writeFileSync(
			path.join(projectPath, '.mustflow', 'config', 'test-selection.toml'),
			`
schema_version = "1"

[[rules]]
id = "source-related"
reason = "Source changes use the declared related-test intent."
risk = "medium"
match = { paths = ["src/**"], surfaces = ["implementation"] }
select = { intent = "test_related", fallback_intent = "test_fast", test_targets = ["tests/unit"] }
`,
		);
		const selection = parse(readFileSync(path.join(projectPath, '.mustflow', 'config', 'test-selection.toml'), 'utf8'));

		assertMatchesSchema(schemaRoot, 'test-selection.schema.json', selection);
	} finally {
		removeTempProject(projectPath);
	}
});

test('command contract schema accepts non-authorizing selection metadata', () => {
	const projectPath = createTempProject();

	try {
		initProject(projectPath);
		appendIntent(
			projectPath,
			`
[intents.metadata_selection_probe]
status = "configured"
lifecycle = "oneshot"
run_policy = "agent_allowed"
description = "Probe command-selection metadata."
argv = ['${process.execPath}', '-e', 'console.log("metadata")']
cwd = "."
timeout_seconds = 10
stdin = "closed"
success_exit_codes = [0]
writes = []
network = false
destructive = false
required_after = ["metadata_probe"]

[intents.metadata_selection_probe.covers]
reasons = ["metadata_probe"]
surfaces = ["source"]
paths = ["src/**"]
contracts = ["runtime_behavior"]

[intents.metadata_selection_probe.selection]
coverage_level = "targeted"
coverage_confidence = "medium"
accepts_changed_files = "git_status"
fallback_intents = ["test_fast"]
escalate_to = ["test"]

[intents.metadata_selection_probe.cost]
expected_seconds = 42
cold_start_seconds = 3
timeout_ratio_expectation = 0.25
cost_tier = "medium"

[intents.metadata_selection_probe.relations]
subsumes = ["test_unit"]
subsumed_by = ["test"]
requires_with = ["lint"]
escalate_to = ["test"]
`,
		);
		const commandsPath = path.join(projectPath, '.mustflow', 'config', 'commands.toml');
		const commands = parse(readFileSync(commandsPath, 'utf8'));

		assertMatchesSchema(schemaRoot, 'commands.schema.json', commands);
	} finally {
		removeTempProject(projectPath);
	}
});

test('command contract schema accepts validation-only typed intent inputs', () => {
	const projectPath = createTempProject();

	try {
		initProject(projectPath);
		appendIntent(
			projectPath,
			`
[intents.typed_input_probe]
status = "unknown"
description = "Document future typed input metadata without authorizing execution."
argv = ["node", "--test", "{target_file}", "{mode}"]

[intents.typed_input_probe.inputs.target_file]
type = "path"
required = true
description = "Repository-relative test file."
allowed_roots = ["tests"]
allowed_extensions = [".test.js"]

[intents.typed_input_probe.inputs.mode]
type = "enum"
allowed_values = ["unit", "integration"]
`,
		);
		const commandsPath = path.join(projectPath, '.mustflow', 'config', 'commands.toml');
		const commands = parse(readFileSync(commandsPath, 'utf8'));

		assertMatchesSchema(schemaRoot, 'commands.schema.json', commands);
	} finally {
		removeTempProject(projectPath);
	}
});

test('command contract schema accepts non-authorizing long-running intent hints', () => {
	const projectPath = createTempProject();

	try {
		initProject(projectPath);
		appendIntent(
			projectPath,
			`
[intents.dev_server]
status = "configured"
lifecycle = "server"
run_policy = "requires_explicit_user_request"
description = "Start a development server for manual inspection."
argv = ['${process.execPath}', '-e', 'setInterval(() => {}, 1000)']
cwd = "."
timeout_seconds = 10
stdin = "closed"
success_exit_codes = [0]
writes = []
network = false
destructive = false
manual_start_hint = "Start this server in a human-controlled terminal."
health_check_url = "http://127.0.0.1:3000/health"
stop_instruction = "Stop the terminal process with Ctrl-C."
related_oneshot_checks = ["test_fast"]
`,
		);
		const commandsPath = path.join(projectPath, '.mustflow', 'config', 'commands.toml');
		const commands = parse(readFileSync(commandsPath, 'utf8'));

		assertMatchesSchema(schemaRoot, 'commands.schema.json', commands);
	} finally {
		removeTempProject(projectPath);
	}
});
