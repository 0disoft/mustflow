import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { assertMatchesSchema } from '../helpers/json-schema.js';

const projectRoot = path.resolve(fileURLToPath(new URL('../..', import.meta.url)));
const cliPath = path.join(projectRoot, 'dist', 'cli', 'index.js');
const schemaRoot = path.join(projectRoot, 'schemas');

function createTempProject() {
	return mkdtempSync(path.join(tmpdir(), 'mustflow-schema-explain-verify-'));
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

function appendRunPlanBlockedSchemaIntents(projectPath) {
	appendIntent(
		projectPath,
		`
[intents.verify_schema_cwd_blocked]
status = "configured"
lifecycle = "oneshot"
run_policy = "agent_allowed"
description = "Exercise schema output for an intent whose cwd cannot be used by mf run."
argv = ['${process.execPath}', '-e', 'console.log("cwd blocked")']
cwd = ".."
timeout_seconds = 10
stdin = "closed"
success_exit_codes = [0]
writes = []
network = false
destructive = false
required_after = ["schema_blocked"]

[intents.verify_schema_output_limit_blocked]
status = "configured"
lifecycle = "oneshot"
run_policy = "agent_allowed"
description = "Exercise schema output for an intent whose output limit cannot be used by mf run."
argv = ['${process.execPath}', '-e', 'console.log("output limit blocked")']
cwd = "."
timeout_seconds = 10
stdin = "closed"
max_output_bytes = 999999999
success_exit_codes = [0]
writes = []
network = false
destructive = false
required_after = ["schema_blocked"]
`,
	);
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

test('explain json output matches the published schema', () => {
	const projectPath = createTempProject();

	try {
		initProject(projectPath);
		const result = runCli(projectPath, ['explain', 'authority', 'AGENTS.md', '--json']);

		assert.equal(result.status, 0, result.stderr || result.stdout);
		assertMatchesSchema(schemaRoot, 'explain-report.schema.json', JSON.parse(result.stdout));
	} finally {
		removeTempProject(projectPath);
	}
});

test('explain command json output matches the published schema', () => {
	const projectPath = createTempProject();

	try {
		initProject(projectPath);
		const result = runCli(projectPath, ['explain', 'command', 'mustflow_check', '--json']);

		assert.equal(result.status, 0, result.stderr || result.stdout);
		assertMatchesSchema(schemaRoot, 'explain-report.schema.json', JSON.parse(result.stdout));
	} finally {
		removeTempProject(projectPath);
	}
});

test('explain why command json output matches the published schema', () => {
	const projectPath = createTempProject();

	try {
		initProject(projectPath);
		const result = runCli(projectPath, ['explain', 'why', 'command', 'mustflow_check', '--json']);

		assert.equal(result.status, 0, result.stderr || result.stdout);
		assertMatchesSchema(schemaRoot, 'explain-report.schema.json', JSON.parse(result.stdout));
	} finally {
		removeTempProject(projectPath);
	}
});

test('explain why-blocked json output matches the published schema', () => {
	const projectPath = createTempProject();

	try {
		initProject(projectPath);
		const result = runCli(projectPath, ['explain', '--why-blocked', 'lint', '--json']);

		assert.equal(result.status, 0, result.stderr || result.stdout);
		assertMatchesSchema(schemaRoot, 'explain-report.schema.json', JSON.parse(result.stdout));
	} finally {
		removeTempProject(projectPath);
	}
});

test('explain verify json output matches the published schema', () => {
	const projectPath = createTempProject();

	try {
		initProject(projectPath);
		const result = runCli(projectPath, ['explain', 'verify', '--reason', 'code_change', '--json']);

		assert.equal(result.status, 0, result.stderr || result.stdout);
		assertMatchesSchema(schemaRoot, 'explain-report.schema.json', JSON.parse(result.stdout));
	} finally {
		removeTempProject(projectPath);
	}
});

test('explain verify json schema accepts run-plan blocker skip reasons', () => {
	const projectPath = createTempProject();

	try {
		initProject(projectPath);
		appendRunPlanBlockedSchemaIntents(projectPath);

		const result = runCli(projectPath, ['explain', 'verify', '--reason', 'schema_blocked', '--json']);
		const report = JSON.parse(result.stdout);
		const skipReasons = report.decision.verification.requirements.flatMap((requirement) =>
			requirement.candidates.map((candidate) => candidate.skipReason),
		);

		assert.equal(result.status, 0, result.stderr || result.stdout);
		assert.ok(skipReasons.includes('cwd_outside_project'));
		assert.ok(skipReasons.includes('max_output_bytes_exceeds_limit'));
		assertMatchesSchema(schemaRoot, 'explain-report.schema.json', report);
	} finally {
		removeTempProject(projectPath);
	}
});

test('explain why latest-failure json output matches the published schema', () => {
	const projectPath = createTempProject();

	try {
		initProject(projectPath);
		const result = runCli(projectPath, ['explain', 'why', 'latest-failure', '--json']);

		assert.equal(result.status, 0, result.stderr || result.stdout);
		assertMatchesSchema(schemaRoot, 'explain-report.schema.json', JSON.parse(result.stdout));
	} finally {
		removeTempProject(projectPath);
	}
});

test('explain asset optimization json output matches the published schema', () => {
	const projectPath = createTempProject();

	try {
		initProject(projectPath);
		const result = runCli(projectPath, ['explain', 'asset-optimization', '--json']);

		assert.equal(result.status, 0, result.stderr || result.stdout);
		assertMatchesSchema(schemaRoot, 'explain-report.schema.json', JSON.parse(result.stdout));
	} finally {
		removeTempProject(projectPath);
	}
});

test('explain anchor json output matches the published schema', () => {
	const projectPath = createTempProject();

	try {
		initProject(projectPath);
		const result = runCli(projectPath, ['explain', 'anchor', 'missing.anchor', '--json']);

		assert.equal(result.status, 0, result.stderr || result.stdout);
		assertMatchesSchema(schemaRoot, 'explain-report.schema.json', JSON.parse(result.stdout));
	} finally {
		removeTempProject(projectPath);
	}
});

test('explain retention json output matches the published schema', () => {
	const projectPath = createTempProject();

	try {
		initProject(projectPath);
		const result = runCli(projectPath, ['explain', 'retention', '--json']);

		assert.equal(result.status, 0, result.stderr || result.stdout);
		assertMatchesSchema(schemaRoot, 'explain-report.schema.json', JSON.parse(result.stdout));
	} finally {
		removeTempProject(projectPath);
	}
});

test('explain skills json output matches the published schema', () => {
	const projectPath = createTempProject();

	try {
		initProject(projectPath);
		const result = runCli(projectPath, ['explain', 'skills', '--json']);

		assert.equal(result.status, 0, result.stderr || result.stdout);
		assertMatchesSchema(schemaRoot, 'explain-report.schema.json', JSON.parse(result.stdout));
	} finally {
		removeTempProject(projectPath);
	}
});

test('explain skill json output matches the published schema', () => {
	const projectPath = createTempProject();

	try {
		initProject(projectPath);
		const result = runCli(projectPath, ['explain', 'skill', 'code-review', '--json']);

		assert.equal(result.status, 0, result.stderr || result.stdout);
		assertMatchesSchema(schemaRoot, 'explain-report.schema.json', JSON.parse(result.stdout));
	} finally {
		removeTempProject(projectPath);
	}
});

test('explain surface json output matches the published schema', () => {
	const projectPath = createTempProject();

	try {
		initProject(projectPath);
		const result = runCli(projectPath, ['explain', 'surface', 'README.md', '--json']);

		assert.equal(result.status, 0, result.stderr || result.stdout);
		assertMatchesSchema(schemaRoot, 'explain-report.schema.json', JSON.parse(result.stdout));
	} finally {
		removeTempProject(projectPath);
	}
});

test('verify json output matches the published schema', () => {
	const projectPath = createTempProject();

	try {
		initProject(projectPath);
		appendIntent(
			projectPath,
			`
[intents.verify_schema]
status = "configured"
lifecycle = "oneshot"
run_policy = "agent_allowed"
description = "Print a verify schema test message."
argv = ['${process.execPath}', '-e', 'console.log("verify schema")']
cwd = "."
timeout_seconds = 10
stdin = "closed"
success_exit_codes = [0]
writes = []
network = false
destructive = false
required_after = ["schema_verify"]
`,
		);

		const result = runCli(projectPath, ['verify', '--reason', 'schema_verify', '--json']);

		assert.equal(result.status, 0, result.stderr || result.stdout);
		assertMatchesSchema(schemaRoot, 'verify-report.schema.json', JSON.parse(result.stdout));
	} finally {
		removeTempProject(projectPath);
	}
});

test('verify run manifest json output matches the published schema', () => {
	const projectPath = createTempProject();

	try {
		initProject(projectPath);
		appendIntent(
			projectPath,
			`
[intents.verify_schema_manifest]
status = "configured"
lifecycle = "oneshot"
run_policy = "agent_allowed"
description = "Print a verify schema manifest test message."
argv = ['${process.execPath}', '-e', 'console.log("verify schema manifest")']
cwd = "."
timeout_seconds = 10
stdin = "closed"
success_exit_codes = [0]
writes = []
network = false
destructive = false
required_after = ["schema_verify"]
`,
		);

		const result = runCli(projectPath, ['verify', '--reason', 'schema_verify', '--json']);
		const report = JSON.parse(result.stdout);
		const manifestPath = path.join(projectPath, report.manifest_path);
		const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));

		assert.equal(result.status, 0, result.stderr || result.stdout);
		assertMatchesSchema(schemaRoot, 'verify-run-manifest.schema.json', manifest);
	} finally {
		removeTempProject(projectPath);
	}
});

test('latest verify pointer json output matches the published schema', () => {
	const projectPath = createTempProject();

	try {
		initProject(projectPath);
		appendIntent(
			projectPath,
			`
[intents.verify_schema_latest_pointer]
status = "configured"
lifecycle = "oneshot"
run_policy = "agent_allowed"
description = "Print a latest verify pointer schema test message."
argv = ['${process.execPath}', '-e', 'console.log("latest verify pointer schema")']
cwd = "."
timeout_seconds = 10
stdin = "closed"
success_exit_codes = [0]
writes = []
network = false
destructive = false
required_after = ["schema_verify"]
`,
		);

		const result = runCli(projectPath, ['verify', '--reason', 'schema_verify', '--json']);
		const latestPath = path.join(projectPath, '.mustflow', 'state', 'runs', 'latest.json');
		const latestPointer = JSON.parse(readFileSync(latestPath, 'utf8'));

		assert.equal(result.status, 0, result.stderr || result.stdout);
		assertMatchesSchema(schemaRoot, 'latest-run-pointer.schema.json', latestPointer);
	} finally {
		removeTempProject(projectPath);
	}
});

test('change verification json output matches the published schema', () => {
	const projectPath = createTempProject();

	try {
		initProject(projectPath);
		appendIntent(
			projectPath,
			`
[intents.verify_schema_plan]
status = "configured"
lifecycle = "oneshot"
run_policy = "agent_allowed"
description = "Print a verify schema plan test message."
argv = ['${process.execPath}', '-e', 'console.log("verify schema plan")']
cwd = "."
timeout_seconds = 10
stdin = "closed"
success_exit_codes = [0]
writes = []
network = false
destructive = false
required_after = ["schema_verify"]
`,
		);

		const result = runCli(projectPath, ['verify', '--reason', 'schema_verify', '--plan-only', '--json']);

		assert.equal(result.status, 0, result.stderr || result.stdout);
		assertMatchesSchema(schemaRoot, 'change-verification-report.schema.json', JSON.parse(result.stdout));
	} finally {
		removeTempProject(projectPath);
	}
});

test('change verification json schema accepts run-plan blocker skip reasons', () => {
	const projectPath = createTempProject();

	try {
		initProject(projectPath);
		appendRunPlanBlockedSchemaIntents(projectPath);

		const result = runCli(projectPath, ['verify', '--reason', 'schema_blocked', '--plan-only', '--json']);
		const report = JSON.parse(result.stdout);
		const skipReasons = report.candidates.map((candidate) => candidate.skipReason);

		assert.equal(result.status, 0, result.stderr || result.stdout);
		assert.ok(skipReasons.includes('cwd_outside_project'));
		assert.ok(skipReasons.includes('max_output_bytes_exceeds_limit'));
		assertMatchesSchema(schemaRoot, 'change-verification-report.schema.json', report);
	} finally {
		removeTempProject(projectPath);
	}
});
