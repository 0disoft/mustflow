import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { test } from 'node:test';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { parse } from 'smol-toml';
import { assertMatchesSchema } from '../helpers/json-schema.js';

const projectRoot = path.resolve(fileURLToPath(new URL('../..', import.meta.url)));
const cliPath = path.join(projectRoot, 'dist', 'cli', 'index.js');
const schemaRoot = path.join(projectRoot, 'schemas');
const schemaBackcompatRoot = path.join(projectRoot, 'tests', 'fixtures', 'schema-backcompat');

function createTempProject() {
	return mkdtempSync(path.join(tmpdir(), 'mustflow-schema-'));
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

function appendIntent(projectPath, text) {
	const commandsPath = path.join(projectPath, '.mustflow', 'config', 'commands.toml');
	const commands = readFileSync(commandsPath, 'utf8');
	writeFileSync(commandsPath, `${commands}\n${text.trim()}\n`);
}

async function readPublicJsonContracts() {
	const contractsModule = await import(
		pathToFileURL(path.join(projectRoot, 'dist', 'core', 'public-json-contracts.js')).href
	);
	return contractsModule.getPublicJsonSchemaContracts();
}

function compareSemver(left, right) {
	const leftParts = left.split('.').map((part) => Number.parseInt(part, 10));
	const rightParts = right.split('.').map((part) => Number.parseInt(part, 10));

	for (const index of [0, 1, 2]) {
		const diff = leftParts[index] - rightParts[index];

		if (diff !== 0) {
			return diff;
		}
	}

	return 0;
}

test('public json schema manifest covers schema files and documentation', async () => {
	const contracts = await readPublicJsonContracts();
	const contractFiles = contracts.map((contract) => contract.schemaFile).sort((left, right) => left.localeCompare(right));
	const actualFiles = readdirSync(schemaRoot)
		.filter((file) => file.endsWith('.schema.json'))
		.sort((left, right) => left.localeCompare(right));
	const readme = readFileSync(path.join(schemaRoot, 'README.md'), 'utf8');

	assert.deepEqual(contractFiles, actualFiles);

	for (const contract of contracts) {
		assert.equal(contract.packaged, true, `${contract.schemaFile} should be packaged`);
		assert.equal(contract.documented, true, `${contract.schemaFile} should be documented`);
		assert.ok(contract.producer.length > 0, `${contract.schemaFile} should declare a producer`);
		assert.match(readme, new RegExp(`\`${contract.schemaFile.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\``));
	}
});

test('public json schema backward-compatibility fixtures match current schemas', async () => {
	const contracts = await readPublicJsonContracts();
	const contractsBySchemaFile = new Map(contracts.map((contract) => [contract.schemaFile, contract]));
	const fixtureVersions = readdirSync(schemaBackcompatRoot, { withFileTypes: true })
		.filter((entry) => entry.isDirectory())
		.map((entry) => entry.name)
		.sort(compareSemver);

	assert.ok(fixtureVersions.length > 0, 'at least one schema backcompat fixture version should exist');

	let newestFixtureSchemas = [];

	for (const fixtureVersion of fixtureVersions) {
		assert.match(fixtureVersion, /^\d+\.\d+\.\d+$/, `${fixtureVersion} should be a semantic version`);

		const fixturePath = path.join(schemaBackcompatRoot, fixtureVersion, 'public-json-fixtures.json');
		const fixtureSet = JSON.parse(readFileSync(fixturePath, 'utf8'));
		const seenSchemaFiles = new Set();

		assert.equal(fixtureSet.fixture_version, fixtureVersion);
		assert.equal(fixtureSet.schema_version, '1');
		assert.ok(Array.isArray(fixtureSet.fixtures), `${fixturePath} should contain fixtures`);

		for (const entry of fixtureSet.fixtures) {
			assert.equal(typeof entry.id, 'string', 'backcompat fixture id should be a string');
			assert.equal(typeof entry.schema_file, 'string', `${entry.id} should declare schema_file`);
			assert.equal(typeof entry.producer, 'string', `${entry.id} should declare producer`);
			assert.ok(Object.hasOwn(entry, 'fixture'), `${entry.id} should include a fixture object`);
			assert.equal(seenSchemaFiles.has(entry.schema_file), false, `${entry.schema_file} fixture should not be duplicated`);

			const currentContract = contractsBySchemaFile.get(entry.schema_file);
			assert.ok(currentContract, `${entry.schema_file} should still be a public JSON schema contract`);
			assert.equal(entry.id, currentContract.id, `${entry.schema_file} fixture id should match the public contract`);
			assert.equal(entry.producer, currentContract.producer, `${entry.schema_file} fixture producer should match the public contract`);

			assertMatchesSchema(schemaRoot, entry.schema_file, entry.fixture);
			seenSchemaFiles.add(entry.schema_file);
		}

		newestFixtureSchemas = [...seenSchemaFiles].sort((left, right) => left.localeCompare(right));
	}

	const currentSchemaFiles = contracts.map((contract) => contract.schemaFile).sort((left, right) => left.localeCompare(right));
	assert.deepEqual(newestFixtureSchemas, currentSchemaFiles);
});

test('doctor json output matches the published schema', () => {
	const projectPath = createTempProject();

	try {
		initProject(projectPath);
		const result = runCli(projectPath, ['doctor', '--json']);

		assert.equal(result.status, 0, result.stderr || result.stdout);
		assertMatchesSchema(schemaRoot, 'doctor-report.schema.json', JSON.parse(result.stdout));
	} finally {
		removeTempProject(projectPath);
	}
});

test('adapter compatibility json output matches the published schema', () => {
	const projectPath = createTempProject();

	try {
		initProject(projectPath);
		const result = runCli(projectPath, ['adapters', 'status', '--json']);

		assert.equal(result.status, 0, result.stderr || result.stdout);
		assertMatchesSchema(schemaRoot, 'adapter-compatibility-report.schema.json', JSON.parse(result.stdout));
	} finally {
		removeTempProject(projectPath);
	}
});

test('context json output matches the published schema', () => {
	const projectPath = createTempProject();

	try {
		initProject(projectPath);
		const result = runCli(projectPath, ['context', '--json']);

		assert.equal(result.status, 0, result.stderr || result.stdout);
		assertMatchesSchema(schemaRoot, 'context-report.schema.json', JSON.parse(result.stdout));
	} finally {
		removeTempProject(projectPath);
	}
});

test('context cache-profile json output matches the published schema', () => {
	const projectPath = createTempProject();

	try {
		initProject(projectPath);
		const result = runCli(projectPath, ['context', '--json', '--cache-profile', 'all']);

		assert.equal(result.status, 0, result.stderr || result.stdout);
		assertMatchesSchema(schemaRoot, 'context-report.schema.json', JSON.parse(result.stdout));
	} finally {
		removeTempProject(projectPath);
	}
});

test('run receipt json output matches the published schema', () => {
	const projectPath = createTempProject();

	try {
		initProject(projectPath);
		appendIntent(
			projectPath,
			`
[intents.echo_schema]
status = "configured"
lifecycle = "oneshot"
run_policy = "agent_allowed"
description = "Print a schema test message."
argv = ['${process.execPath}', '-e', 'console.log("schema receipt")']
cwd = "."
timeout_seconds = 10
stdin = "closed"
success_exit_codes = [0]
writes = []
network = false
destructive = false
`,
		);

		const result = runCli(projectPath, ['run', 'echo_schema', '--json']);

		assert.equal(result.status, 0, result.stderr || result.stdout);
		assertMatchesSchema(schemaRoot, 'run-receipt.schema.json', JSON.parse(result.stdout));
	} finally {
		removeTempProject(projectPath);
	}
});

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

test('contract lint json output matches the published schema', () => {
	const projectPath = createTempProject();

	try {
		initProject(projectPath);
		const result = runCli(projectPath, ['contract-lint', '--json']);

		assert.equal(result.status, 0, result.stderr || result.stdout);
		assertMatchesSchema(schemaRoot, 'contract-lint-report.schema.json', JSON.parse(result.stdout));
	} finally {
		removeTempProject(projectPath);
	}
});

test('contract lint coverage json output matches the published schema', () => {
	const projectPath = createTempProject();

	try {
		initProject(projectPath);
		const result = runCli(projectPath, ['contract-lint', '--coverage', '--json']);

		assert.equal(result.status, 0, result.stderr || result.stdout);
		assertMatchesSchema(schemaRoot, 'contract-lint-report.schema.json', JSON.parse(result.stdout));
	} finally {
		removeTempProject(projectPath);
	}
});

test('contract lint suggestion json output matches the published schema', () => {
	const projectPath = createTempProject();

	try {
		initProject(projectPath);
		writeFileSync(
			path.join(projectPath, 'package.json'),
			`${JSON.stringify({ name: 'example', scripts: { test: 'node --test' } }, null, 2)}\n`,
		);
		const result = runCli(projectPath, ['contract-lint', '--suggest', '--json']);

		assert.equal(result.status, 0, result.stderr || result.stdout);
		assertMatchesSchema(schemaRoot, 'contract-lint-report.schema.json', JSON.parse(result.stdout));
	} finally {
		removeTempProject(projectPath);
	}
});

test('dashboard export json output matches the published schema', () => {
	const projectPath = createTempProject();

	try {
		initProject(projectPath);
		const result = runCli(projectPath, ['dashboard', '--export-json', '.mustflow/state/artifacts/dashboard.json']);

		assert.equal(result.status, 0, result.stderr || result.stdout);
		const exportPath = path.join(projectPath, '.mustflow', 'state', 'artifacts', 'dashboard.json');
		assertMatchesSchema(schemaRoot, 'dashboard-export.schema.json', JSON.parse(readFileSync(exportPath, 'utf8')));
	} finally {
		removeTempProject(projectPath);
	}
});

test('version sources json output matches the published schema', () => {
	const projectPath = createTempProject();

	try {
		initProject(projectPath);
		const result = runCli(projectPath, ['version-sources', '--json']);

		assert.equal(result.status, 0, result.stderr || result.stdout);
		assertMatchesSchema(schemaRoot, 'version-sources-report.schema.json', JSON.parse(result.stdout));
	} finally {
		removeTempProject(projectPath);
	}
});

test('classify json output matches the published schema', () => {
	const projectPath = createTempProject();

	try {
		initProject(projectPath);
		const result = runCli(projectPath, ['classify', 'README.md', 'schemas/classify-report.schema.json', '--json']);

		assert.equal(result.status, 0, result.stderr || result.stdout);
		assertMatchesSchema(schemaRoot, 'classify-report.schema.json', JSON.parse(result.stdout));
	} finally {
		removeTempProject(projectPath);
	}
});

test('impact json output matches the published schema', () => {
	const projectPath = createTempProject();

	try {
		initProject(projectPath);
		const result = runCli(projectPath, ['impact', 'package.json', 'schemas/impact-report.schema.json', '--json']);

		assert.equal(result.status, 0, result.stderr || result.stdout);
		assertMatchesSchema(schemaRoot, 'impact-report.schema.json', JSON.parse(result.stdout));
	} finally {
		removeTempProject(projectPath);
	}
});

test('line-endings json output matches the published schema', () => {
	const projectPath = createTempProject();

	try {
		initProject(projectPath);
		const result = runCli(projectPath, ['line-endings', 'check', '--json']);

		assert.equal(result.status, 1, result.stderr || result.stdout);
		assertMatchesSchema(schemaRoot, 'line-endings-report.schema.json', JSON.parse(result.stdout));
	} finally {
		removeTempProject(projectPath);
	}
});

test('handoff validation json output matches the published schema', () => {
	const projectPath = createTempProject();

	try {
		initProject(projectPath);
		const workItemsPath = path.join(projectPath, '.mustflow', 'work-items');
		const recordPath = path.join(workItemsPath, 'MF-0001.json');
		mkdirSync(workItemsPath, { recursive: true });
		writeFileSync(
			recordPath,
			JSON.stringify(
				{
					schema_version: '1',
					kind: 'work_item',
					task_id: 'MF-0001',
					goal: 'Keep a bounded restart pointer.',
					scope: ['Validate the record shape'],
					acceptance_criteria: ['The record validates without writing files'],
					source_refs: ['ROADMAP.md'],
					next_restart_point: 'Continue from the next roadmap item.',
				},
				null,
				2,
			),
		);

		const result = runCli(projectPath, ['handoff', 'validate', '.mustflow/work-items/MF-0001.json', '--json']);

		assert.equal(result.status, 0, result.stderr || result.stdout);
		assertMatchesSchema(schemaRoot, 'handoff-validation-report.schema.json', JSON.parse(result.stdout));
	} finally {
		removeTempProject(projectPath);
	}
});

test('docs review list json output matches the published schema', () => {
	const projectPath = createTempProject();

	try {
		initProject(projectPath);
		const result = runCli(projectPath, ['docs', 'review', 'list', '--json']);

		assert.equal(result.status, 0, result.stderr || result.stdout);
		assertMatchesSchema(schemaRoot, 'docs-review-list.schema.json', JSON.parse(result.stdout));
	} finally {
		removeTempProject(projectPath);
	}
});

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
		const manifestPath = path.join(projectPath, '.mustflow', 'state', 'runs', 'verify-latest', 'manifest.json');
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
