import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { test } from 'node:test';
import { fileURLToPath, pathToFileURL } from 'node:url';
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

function runCli(cwd, args, options = {}) {
	return spawnSync(process.execPath, [cliPath, ...args], {
		cwd,
		encoding: 'utf8',
		...options,
	});
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
	if (result.status !== 0) {
		return false;
	}

	for (const args of [
		['config', 'user.email', 'mustflow-tests@example.invalid'],
		['config', 'user.name', 'mustflow tests'],
		['add', '.'],
		['commit', '-m', 'baseline'],
	]) {
		result = runGit(projectPath, args);
		if (result.status !== 0) {
			return false;
		}
	}

	return true;
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

async function readPublicJsonContracts() {
	const contractsModule = await import(
		pathToFileURL(path.join(projectRoot, 'dist', 'core', 'public-json-contracts.js')).href
	);
	return contractsModule.getPublicJsonSchemaContracts();
}

async function readVerificationSkipReasons() {
	const verificationPlanModule = await import(
		pathToFileURL(path.join(projectRoot, 'dist', 'core', 'verification-plan.js')).href
	);
	return [...verificationPlanModule.VERIFICATION_SKIP_REASONS].sort((left, right) => left.localeCompare(right));
}

function readSchema(schemaFile) {
	return JSON.parse(readFileSync(path.join(schemaRoot, schemaFile), 'utf8'));
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

test('verification skip reason schemas stay aligned with core plan reasons', async () => {
	const expectedReasons = await readVerificationSkipReasons();
	const changeVerificationSchema = readSchema('change-verification-report.schema.json');
	const explainSchema = readSchema('explain-report.schema.json');
	const changeVerificationReasons = [...changeVerificationSchema.$defs.skipReason.enum].sort((left, right) =>
		left.localeCompare(right),
	);
	const explainReasons = explainSchema.$defs.verificationCandidate.properties.skipReason.enum
		.filter((reason) => reason !== null)
		.sort((left, right) => left.localeCompare(right));

	assert.deepEqual(changeVerificationReasons, expectedReasons);
	assert.deepEqual(explainReasons, expectedReasons);
});

test('source skill route fixtures match the published schema', () => {
	const fixture = JSON.parse(readFileSync(path.join(projectRoot, '.mustflow', 'skills', 'route-fixtures.json'), 'utf8'));

	assertMatchesSchema(schemaRoot, 'route-fixture.schema.json', fixture);
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

test('context cache-audit json output matches the published schema', () => {
	const projectPath = createTempProject();

	try {
		initProject(projectPath);
		const result = runCli(projectPath, ['context', '--json', '--cache-audit']);
		const report = JSON.parse(result.stdout);

		assert.equal(result.status, 0, result.stderr || result.stdout);
		assertMatchesSchema(schemaRoot, 'context-report.schema.json', report);
		assert.equal(report.cache_audit.summary.serialization_deterministic, true);
		assert.equal(report.cache_audit.summary.volatile_before_stable_count, 0);
		assert.equal(report.cache_audit.summary.stable_leaf_skill_isolated, true);
		assert.deepEqual(report.cache_audit.summary.stable_leaf_skill_risk_paths, []);
		assert.equal(report.cache_audit.summary.leaf_skill_change_stable_hash_delta, 0);
		assert.equal(typeof report.cache_audit.summary.measured_block_count, 'number');
		assert.equal(typeof report.cache_audit.summary.dynamic_source_count, 'number');
		assert.equal(typeof report.cache_audit.summary.unresolved_reference_count, 'number');
	} finally {
		removeTempProject(projectPath);
	}
});

test('context route-selected cache-audit json output matches the published schema', () => {
	const projectPath = createTempProject();

	try {
		initProject(projectPath);
		const result = runCli(projectPath, [
			'context',
			'--json',
			'--cache-audit',
			'--task',
			'Change TypeScript CLI output and tests',
			'--path',
			'src/cli/commands/context.ts',
			'--reason',
			'code_change',
		]);
		const report = JSON.parse(result.stdout);
		const taskBundle = report.prompt_bundle.layers.find((layer) => layer.cache_layer === 'task');
		const taskAudit = report.cache_audit.layers.find((layer) => layer.cache_layer === 'task');
		const bundleRouteCandidatesBlock = taskBundle.blocks.find((block) => block.source === 'skill_route_candidates');
		const auditRouteCandidatesBlock = taskAudit.blocks.find((block) => block.source === 'skill_route_candidates');

		assert.equal(result.status, 0, result.stderr || result.stdout);
		assertMatchesSchema(schemaRoot, 'context-report.schema.json', report);
		assert.equal(bundleRouteCandidatesBlock.kind, 'source_placeholder');
		assert.equal(bundleRouteCandidatesBlock.source_kind, 'dynamic_selection');
		assert.equal(bundleRouteCandidatesBlock.selection_policy, 'selected_at_runtime');
		assert.equal(bundleRouteCandidatesBlock.issue, null);
		assert.ok(bundleRouteCandidatesBlock.rendered_bytes > 0);
		assert.match(bundleRouteCandidatesBlock.content_hash, /^sha256:[a-f0-9]{64}$/u);
		assert.match(bundleRouteCandidatesBlock.rendered_digest, /^sha256:[a-f0-9]{64}$/u);
		assert.equal(auditRouteCandidatesBlock.measurement_status, 'measured');
		assert.equal(auditRouteCandidatesBlock.issue, null);
		assert.ok(auditRouteCandidatesBlock.rendered_bytes > 0);
		assert.match(auditRouteCandidatesBlock.content_hash, /^sha256:[a-f0-9]{64}$/u);
	} finally {
		removeTempProject(projectPath);
	}
});

test('context cache-compare json output matches the published schema', () => {
	const projectPath = createTempProject();

	try {
		initProject(projectPath);
		const baseline = runCli(projectPath, ['context', '--json', '--cache-profile', 'all']);
		assert.equal(baseline.status, 0, baseline.stderr || baseline.stdout);
		const baselinePath = path.join(projectPath, '.mustflow', 'cache', 'schema-baseline-context.json');
		mkdirSync(path.dirname(baselinePath), { recursive: true });
		writeFileSync(baselinePath, baseline.stdout);

		const result = runCli(projectPath, [
			'context',
			'--json',
			'--cache-profile',
			'all',
			'--cache-compare',
			'.mustflow/cache/schema-baseline-context.json',
		]);

		const report = JSON.parse(result.stdout);
		assert.equal(result.status, 0, result.stderr || result.stdout);
		assertMatchesSchema(schemaRoot, 'context-report.schema.json', report);
		assert.equal(report.prompt_bundle_diff.stable_diff.baseline_stable_block_count, 2);
		assert.equal(report.prompt_bundle_diff.stable_diff.stable_prefix_preserved, true);
		assert.equal(report.prompt_bundle_diff.stable_diff.first_stable_invalidation_reason, null);
	} finally {
		removeTempProject(projectPath);
	}
});

test('context cache-compare reports stable prefix invalidation', () => {
	const projectPath = createTempProject();

	try {
		initProject(projectPath);
		const baseline = runCli(projectPath, ['context', '--json', '--cache-profile', 'all']);
		assert.equal(baseline.status, 0, baseline.stderr || baseline.stdout);
		const baselinePath = path.join(projectPath, '.mustflow', 'cache', 'schema-baseline-context.json');
		mkdirSync(path.dirname(baselinePath), { recursive: true });
		writeFileSync(baselinePath, baseline.stdout);
		const agentsPath = path.join(projectPath, 'AGENTS.md');
		writeFileSync(agentsPath, `${readFileSync(agentsPath, 'utf8')}\n\nCache compare drift fixture.\n`);

		const result = runCli(projectPath, [
			'context',
			'--json',
			'--cache-profile',
			'all',
			'--cache-compare',
			'.mustflow/cache/schema-baseline-context.json',
		]);
		const report = JSON.parse(result.stdout);

		assert.equal(result.status, 0, result.stderr || result.stdout);
		assertMatchesSchema(schemaRoot, 'context-report.schema.json', report);
		assert.equal(report.prompt_bundle_diff.stable_diff.stable_prefix_preserved, false);
		assert.equal(report.prompt_bundle_diff.stable_diff.first_stable_difference.cache_layer, 'stable');
		assert.match(
			report.prompt_bundle_diff.stable_diff.first_stable_invalidation_reason,
			/stable prefix block 1 changed at stable:1:AGENTS\.md/u,
		);
	} finally {
		removeTempProject(projectPath);
	}
});

test('workspace summary api json output matches the published schema', () => {
	const projectPath = createTempProject();

	try {
		initProject(projectPath);
		const result = runCli(projectPath, ['api', 'workspace-summary', '--json']);

		assert.equal(result.status, 0, result.stderr || result.stdout);
		assertMatchesSchema(schemaRoot, 'workspace-summary.schema.json', JSON.parse(result.stdout));
	} finally {
		removeTempProject(projectPath);
	}
});

test('command catalog api json output matches the published schema', () => {
	const projectPath = createTempProject();

	try {
		initProject(projectPath);
		const result = runCli(projectPath, ['api', 'command-catalog', '--json']);

		assert.equal(result.status, 0, result.stderr || result.stdout);
		assertMatchesSchema(schemaRoot, 'command-catalog.schema.json', JSON.parse(result.stdout));
	} finally {
		removeTempProject(projectPath);
	}
});

test('verification plan api json output matches the published schema', () => {
	const projectPath = createTempProject();

	try {
		initProject(projectPath);
		commitGitBaseline(projectPath);
		writeFileSync(path.join(projectPath, 'schema-verification-plan-probe.js'), 'console.log("changed");\n');
		const result = runCli(projectPath, ['api', 'verification-plan', '--changed', '--json']);

		assert.equal(result.status, 0, result.stderr || result.stdout);
		assertMatchesSchema(schemaRoot, 'verification-plan.schema.json', JSON.parse(result.stdout));
	} finally {
		removeTempProject(projectPath);
	}
});

test('latest evidence api json output matches the published schema', () => {
	const projectPath = createTempProject();

	try {
		initProject(projectPath);
		const result = runCli(projectPath, ['api', 'latest-evidence', '--json']);

		assert.equal(result.status, 0, result.stderr || result.stdout);
		assertMatchesSchema(schemaRoot, 'latest-evidence.schema.json', JSON.parse(result.stdout));
	} finally {
		removeTempProject(projectPath);
	}
});

test('diff risk api json output matches the published schema', () => {
	const projectPath = createTempProject();

	try {
		initProject(projectPath);
		commitGitBaseline(projectPath);
		writeFileSync(path.join(projectPath, 'schema-diff-risk-probe.js'), 'console.log("changed");\n');
		const result = runCli(projectPath, ['api', 'diff-risk', '--changed', '--json']);

		assert.equal(result.status, 0, result.stderr || result.stdout);
		assertMatchesSchema(schemaRoot, 'diff-risk.schema.json', JSON.parse(result.stdout));
	} finally {
		removeTempProject(projectPath);
	}
});

test('health api json output matches the published schema', () => {
	const projectPath = createTempProject();

	try {
		initProject(projectPath);
		const result = runCli(projectPath, ['api', 'health', '--json']);

		assert.equal(result.status, 0, result.stderr || result.stdout);
		assertMatchesSchema(schemaRoot, 'health.schema.json', JSON.parse(result.stdout));
	} finally {
		removeTempProject(projectPath);
	}
});

test('locks api json output matches the published schema', () => {
	const projectPath = createTempProject();

	try {
		initProject(projectPath);
		const result = runCli(projectPath, ['api', 'locks', '--json']);

		assert.equal(result.status, 0, result.stderr || result.stdout);
		assertMatchesSchema(schemaRoot, 'locks.schema.json', JSON.parse(result.stdout));
	} finally {
		removeTempProject(projectPath);
	}
});

test('api serve jsonl responses match the published schema', () => {
	const projectPath = createTempProject();

	try {
		initProject(projectPath);
		const input = [
			JSON.stringify({ id: 'health', action: 'health' }),
			JSON.stringify({ id: 'missing-changed', action: 'verification-plan' }),
			'',
		].join('\n');
		const result = runCli(projectPath, ['api', 'serve', '--stdio'], { input });
		const lines = result.stdout.trim().split(/\r?\n/u).map((line) => JSON.parse(line));

		assert.equal(result.status, 0, result.stderr || result.stdout);
		assert.equal(lines.length, 2);
		for (const line of lines) {
			assertMatchesSchema(schemaRoot, 'api-serve-response.schema.json', line);
		}
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

test('onboard commands json output matches the published schema', () => {
	const projectPath = createTempProject();

	try {
		initProject(projectPath);
		writeFileSync(
			path.join(projectPath, 'package.json'),
			`${JSON.stringify({ name: 'example', scripts: { test: 'node --test' } }, null, 2)}\n`,
		);
		const result = runCli(projectPath, ['onboard', 'commands', '--json']);

		assert.equal(result.status, 0, result.stderr || result.stdout);
		assertMatchesSchema(schemaRoot, 'onboard-commands-report.schema.json', JSON.parse(result.stdout));
	} finally {
		removeTempProject(projectPath);
	}
});

test('next json output matches the published schema', () => {
	const projectPath = createTempProject();

	try {
		initProject(projectPath);
		commitGitBaseline(projectPath);
		const result = runCli(projectPath, ['next', '--json']);

		assert.equal(result.status, 0, result.stderr || result.stdout);
		assertMatchesSchema(schemaRoot, 'next-report.schema.json', JSON.parse(result.stdout));
	} finally {
		removeTempProject(projectPath);
	}
});

test('evidence json output matches the published schema', () => {
	const projectPath = createTempProject();

	try {
		initProject(projectPath);
		const schemaRoot = path.join(projectRoot, 'schemas');
		const result = runCli(projectPath, ['evidence', '--latest', '--json']);

		assert.equal(result.status, 1);
		assertMatchesSchema(schemaRoot, 'evidence-report.schema.json', JSON.parse(result.stdout));
	} finally {
		removeTempProject(projectPath);
	}
});

test('workspace status json output matches the published schema', () => {
	const projectPath = createTempProject();

	try {
		initProject(projectPath);
		const result = runCli(projectPath, ['workspace', 'status', '--json']);

		assert.equal(result.status, 0, result.stderr || result.stdout);
		assertMatchesSchema(schemaRoot, 'workspace-status.schema.json', JSON.parse(result.stdout));
	} finally {
		removeTempProject(projectPath);
	}
});

test('workspace command-catalog json output matches the published schema', () => {
	const projectPath = createTempProject();

	try {
		initProject(projectPath);
		const result = runCli(projectPath, ['workspace', 'command-catalog', '--json']);

		assert.equal(result.status, 0, result.stderr || result.stdout);
		assertMatchesSchema(schemaRoot, 'workspace-command-catalog.schema.json', JSON.parse(result.stdout));
	} finally {
		removeTempProject(projectPath);
	}
});

test('workspace verify json output matches the published schema', () => {
	const projectPath = createTempProject();

	try {
		initProject(projectPath);
		const result = runCli(projectPath, ['workspace', 'verify', '--changed', '--plan-only', '--json']);

		assert.equal(result.status, 0, result.stderr || result.stdout);
		assertMatchesSchema(schemaRoot, 'workspace-verification-plan.schema.json', JSON.parse(result.stdout));
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

test('quality json output matches the published schema', () => {
	const projectPath = createTempProject();

	try {
		initProject(projectPath);
		commitGitBaseline(projectPath);
		const result = runCli(projectPath, ['quality', 'check', '--json']);

		assert.equal(result.status, 0, result.stderr || result.stdout);
		assertMatchesSchema(schemaRoot, 'quality-gaming-report.schema.json', JSON.parse(result.stdout));
	} finally {
		removeTempProject(projectPath);
	}
});

test('script-pack catalog json output matches the published schema', () => {
	const projectPath = createTempProject();

	try {
		initProject(projectPath);
		const result = runCli(projectPath, ['script-pack', 'list', '--json']);

		assert.equal(result.status, 0, result.stderr || result.stdout);
		assertMatchesSchema(schemaRoot, 'script-pack-catalog.schema.json', JSON.parse(result.stdout));
	} finally {
		removeTempProject(projectPath);
	}
});

test('script-pack suggestion json output matches the published schema', () => {
	const projectPath = createTempProject();

	try {
		initProject(projectPath);
		const result = runCli(projectPath, [
			'script-pack',
			'suggest',
			'--path',
			'AGENTS.md',
			'--phase',
			'before_change',
			'--json',
		]);

		assert.equal(result.status, 0, result.stderr || result.stdout);
		assertMatchesSchema(schemaRoot, 'script-pack-suggestion-report.schema.json', JSON.parse(result.stdout));
	} finally {
		removeTempProject(projectPath);
	}
});

test('code-outline json output matches the published schema', () => {
	const projectPath = createTempProject();

	try {
		initProject(projectPath);
		mkdirSync(path.join(projectPath, 'src'));
		writeFileSync(
			path.join(projectPath, 'src', 'outline.ts'),
			[
				'/**',
				' * mf:anchor schema.outline.probe',
				' * purpose: Exercise code outline source-anchor metadata.',
				' * search: schema, outline',
				' * risk: config',
				' */',
				'export function outlineProbe() {',
				'  return 1;',
				'}',
				'',
			].join('\n'),
		);
		const result = runCli(projectPath, [
			'script-pack',
			'run',
			'code/outline',
			'scan',
			'src/outline.ts',
			'--json',
		]);

		assert.equal(result.status, 0, result.stderr || result.stdout);
		assertMatchesSchema(schemaRoot, 'code-outline-report.schema.json', JSON.parse(result.stdout));
	} finally {
		removeTempProject(projectPath);
	}
});

test('code-symbol-read json output matches the published schema', () => {
	const projectPath = createTempProject();

	try {
		initProject(projectPath);
		mkdirSync(path.join(projectPath, 'src'));
		writeFileSync(
			path.join(projectPath, 'src', 'symbol.ts'),
			[
				'/**',
				' * mf:anchor schema.symbol.probe',
				' * purpose: Exercise code symbol read source-anchor metadata.',
				' * search: schema, symbol',
				' * risk: config',
				' */',
				'export function symbolProbe() {',
				'  return 1;',
				'}',
				'',
			].join('\n'),
		);
		const result = runCli(projectPath, [
			'script-pack',
			'run',
			'code/symbol-read',
			'read',
			'--anchor',
			'schema.symbol.probe',
			'--json',
		]);

		assert.equal(result.status, 0, result.stderr || result.stdout);
		assertMatchesSchema(schemaRoot, 'code-symbol-read-report.schema.json', JSON.parse(result.stdout));
	} finally {
		removeTempProject(projectPath);
	}
});

test('text-budget json output matches the published schema', () => {
	const projectPath = createTempProject();

	try {
		initProject(projectPath);
		writeFileSync(path.join(projectPath, 'intro.txt'), 'short intro');
		const result = runCli(projectPath, [
			'script-pack',
			'run',
			'core/text-budget',
			'check',
			'intro.txt',
			'--max',
			'20',
			'--json',
		]);

		assert.equal(result.status, 0, result.stderr || result.stdout);
		assertMatchesSchema(schemaRoot, 'text-budget-report.schema.json', JSON.parse(result.stdout));
	} finally {
		removeTempProject(projectPath);
	}
});

test('generated-boundary json output matches the published schema', () => {
	const projectPath = createTempProject();

	try {
		initProject(projectPath);
		const result = runCli(projectPath, [
			'script-pack',
			'run',
			'repo/generated-boundary',
			'check',
			'AGENTS.md',
			'.mustflow/config/manifest.lock.toml',
			'--json',
		]);

		assert.equal(result.status, 1, result.stderr || result.stdout);
		assertMatchesSchema(schemaRoot, 'generated-boundary-report.schema.json', JSON.parse(result.stdout));
	} finally {
		removeTempProject(projectPath);
	}
});

test('skill route json output matches the published schema', () => {
	const projectPath = createTempProject();

	try {
		initProject(projectPath);
		const result = runCli(projectPath, [
			'skill',
			'route',
			'--task',
			'Change TypeScript CLI output',
			'--path',
			'src/cli/index.ts',
			'--reason',
			'code_change',
			'--json',
		]);

		assert.equal(result.status, 0, result.stderr || result.stdout);
		assertMatchesSchema(schemaRoot, 'skill-route-report.schema.json', JSON.parse(result.stdout));
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
