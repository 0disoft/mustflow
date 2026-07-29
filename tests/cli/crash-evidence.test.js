import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { after, before, test } from 'node:test';
import { fileURLToPath } from 'node:url';

import { runCrashEvidence } from '../../dist/cli/commands/crash-evidence.js';
import { assertMatchesSchema } from '../helpers/json-schema.js';
import {
	cloneProjectFixture,
	createTempProject,
	initProject,
	removeTempProject,
	runCliCommand,
} from './helpers/cli-harness.js';

const projectRoot = path.resolve(fileURLToPath(new URL('../..', import.meta.url)));
const schemaRoot = path.join(projectRoot, 'schemas');
const backcompatFixture = JSON.parse(readFileSync(
	path.join(projectRoot, 'tests', 'fixtures', 'schema-backcompat', '2.84.8', 'public-json-fixtures.json'),
	'utf8',
));
const validEvidence = backcompatFixture.fixtures.find((entry) => entry.id === 'native-crash-evidence')?.fixture;

let initializedProjectFixture;

before(() => {
	assert.ok(validEvidence, 'native crash evidence backcompat fixture should exist');
	initializedProjectFixture = createTempProject('mustflow-crash-evidence-fixture-');
	initProject(initializedProjectFixture);
});

after(() => {
	if (initializedProjectFixture) {
		removeTempProject(initializedProjectFixture);
	}
});

function createProject() {
	return cloneProjectFixture(initializedProjectFixture, 'mustflow-crash-evidence-');
}

function runCli(cwd, args) {
	return runCliCommand(cwd, args, runCrashEvidence);
}

function writeEvidence(projectPath, fileName, evidence) {
	const directory = path.join(projectPath, 'crash-evidence');
	mkdirSync(directory, { recursive: true });
	const evidencePath = path.join(directory, fileName);
	writeFileSync(evidencePath, typeof evidence === 'string' ? evidence : JSON.stringify(evidence, null, 2));
	return evidencePath;
}

test('validates analysis-ready evidence as pure schema-backed JSON', async () => {
	const projectPath = createProject();
	try {
		writeEvidence(projectPath, 'ready.json', validEvidence);
		const result = await runCli(projectPath, ['crash-evidence', 'validate', 'crash-evidence/ready.json', '--json']);

		assert.equal(result.status, 0, result.stderr || result.stdout);
		assert.equal(result.stderr, '');
		const report = JSON.parse(result.stdout);
		assert.equal(report.ok, true);
		assert.equal(report.readiness, 'ready');
		assert.equal(report.path, 'crash-evidence/ready.json');
		assert.deepEqual(report.summary, {
			module_count: 1,
			thread_count: 1,
			frame_count: 1,
			error_count: 0,
			warning_count: 0,
		});
		assertMatchesSchema(schemaRoot, 'native-crash-evidence-validation-report.schema.json', report);
	} finally {
		removeTempProject(projectPath);
	}
});

test('returns exit zero for valid incomplete evidence and renders readiness in text mode', async () => {
	const projectPath = createProject();
	try {
		const incomplete = structuredClone(validEvidence);
		incomplete.registers = { status: 'unavailable', values: {}, unavailable_reason: 'not captured' };
		writeEvidence(projectPath, 'incomplete.json', incomplete);
		const result = await runCli(projectPath, ['crash-evidence', 'validate', 'crash-evidence/incomplete.json']);

		assert.equal(result.status, 0, result.stderr || result.stdout);
		assert.match(result.stdout, /Readiness: incomplete/u);
		assert.match(result.stdout, /register_state_incomplete/u);
	} finally {
		removeTempProject(projectPath);
	}
});

test('returns exit one and a schema-backed report for semantic rejection', async () => {
	const projectPath = createProject();
	try {
		const rejected = structuredClone(validEvidence);
		rejected.redaction.raw_memory_included = true;
		writeEvidence(projectPath, 'rejected.json', rejected);
		const result = await runCli(projectPath, ['crash-evidence', 'validate', 'crash-evidence/rejected.json', '--json']);

		assert.equal(result.status, 1);
		const report = JSON.parse(result.stdout);
		assert.equal(report.ok, false);
		assert.equal(report.readiness, 'rejected');
		assert.ok(report.issues.some((issue) => issue.code === 'unsafe_raw_data_included'));
		assertMatchesSchema(schemaRoot, 'native-crash-evidence-validation-report.schema.json', report);
	} finally {
		removeTempProject(projectPath);
	}
});

test('rejects malformed, outside-root, and non-file evidence paths', async () => {
	const projectPath = createProject();
	const outsideRoot = mkdtempSync(path.join(tmpdir(), 'mustflow-crash-evidence-outside-'));
	try {
		writeEvidence(projectPath, 'malformed.json', '{');
		const malformed = await runCli(projectPath, ['crash-evidence', 'validate', 'crash-evidence/malformed.json', '--json']);
		assert.equal(malformed.status, 1);
		assert.equal(JSON.parse(malformed.stdout).issues[0].code, 'invalid_json');

		const directory = await runCli(projectPath, ['crash-evidence', 'validate', 'crash-evidence', '--json']);
		assert.equal(directory.status, 1);
		assert.equal(JSON.parse(directory.stdout).issues[0].code, 'evidence_not_regular_file');

		const outsidePath = path.join(outsideRoot, 'outside.json');
		writeFileSync(outsidePath, JSON.stringify(validEvidence));
		const outside = await runCli(projectPath, ['crash-evidence', 'validate', outsidePath, '--json']);
		assert.equal(outside.status, 1);
		assert.equal(JSON.parse(outside.stdout).issues[0].code, 'evidence_unreadable');
	} finally {
		removeTempProject(projectPath);
		rmSync(outsideRoot, { recursive: true, force: true });
	}
});

test('rejects unsupported actions and option forms with usage help', async () => {
	const projectPath = createProject();
	try {
		for (const args of [
			['crash-evidence', 'collect'],
			['crash-evidence', 'validate', 'evidence.json', '--bad'],
			['crash-evidence', 'validate', 'evidence.json', '--json=true'],
		]) {
			const result = await runCli(projectPath, args);
			assert.equal(result.status, 1);
			assert.match(result.stderr, /mf crash-evidence --help/u);
			assert.match(result.stderr, /Usage: mf crash-evidence <validate\|collect\|race> <path> \[options\]/u);
		}
	} finally {
		removeTempProject(projectPath);
	}
});

test('collects sanitizer output, validates it, and refuses clobber without overwrite', async () => {
	const projectPath = createProject();
	try {
		const inputDirectory = path.join(projectPath, 'crash');
		mkdirSync(inputDirectory, { recursive: true });
		writeFileSync(path.join(inputDirectory, 'asan.log'), '==1==ERROR: AddressSanitizer: heap-use-after-free on address 0x1234\nREAD of size 4\n    #0 0x1234 in boom file.cc:4\nSUMMARY: AddressSanitizer: heap-use-after-free in boom\n');
		const args = ['crash-evidence', 'collect', 'crash/asan.log', '--adapter', 'sanitizer', '--output', 'crash/evidence.json', '--json'];
		const first = await runCli(projectPath, args);
		assert.equal(first.status, 0, first.stderr || first.stdout);
		const report = JSON.parse(first.stdout);
		assert.equal(report.wrote, true);
		assert.equal(report.readiness, 'incomplete');
		assertMatchesSchema(schemaRoot, 'native-crash-evidence-collection-report.schema.json', report);
		const evidence = JSON.parse(readFileSync(path.join(inputDirectory, 'evidence.json'), 'utf8'));
		assert.equal(evidence.source.kind, 'sanitizer_report');

		const blocked = await runCli(projectPath, args);
		assert.equal(blocked.status, 1);
		assert.equal(JSON.parse(blocked.stdout).issues[0].code, 'output_exists');

		const replaced = await runCli(projectPath, [...args.slice(0, -1), '--overwrite', '--json']);
		assert.equal(replaced.status, 0, replaced.stderr || replaced.stdout);
		assert.equal(JSON.parse(replaced.stdout).wrote, true);
	} finally {
		removeTempProject(projectPath);
	}
});

test('rejects collection output outside the mustflow root', async () => {
	const projectPath = createProject();
	const outsideRoot = mkdtempSync(path.join(tmpdir(), 'mustflow-crash-output-outside-'));
	try {
		writeEvidence(projectPath, 'asan.log', 'ERROR: AddressSanitizer: boom\nSUMMARY: AddressSanitizer: boom\n');
		const result = await runCli(projectPath, ['crash-evidence', 'collect', 'crash-evidence/asan.log', '--adapter', 'sanitizer', '--output', path.join(outsideRoot, 'evidence.json'), '--json']);
		assert.equal(result.status, 1);
		assert.equal(JSON.parse(result.stdout).issues[0].code, 'collection_failed');
	} finally {
		removeTempProject(projectPath);
		rmSync(outsideRoot, { recursive: true, force: true });
	}
});

test('runs a deterministic race scenario and returns a schema-backed finding trace', async () => {
	const projectPath = createProject();
	try {
		const scenario = {
			schema_version: '1', kind: 'deterministic_race_scenario', reuse_addresses: true, fail_at: null,
			actors: [
				{ id: 'owner', operations: [{ id: 'a', action: 'allocate', resource: 'slot' }, { id: 'f', action: 'free', resource: 'slot' }] },
				{ id: 'reader', operations: [{ id: 'r', action: 'read', resource: 'slot', generation: 1 }] },
			],
			schedule: [{ actor: 'owner', operation: 'a' }, { actor: 'owner', operation: 'f' }, { actor: 'reader', operation: 'r' }],
		};
		writeEvidence(projectPath, 'race.json', scenario);
		const result = await runCli(projectPath, ['crash-evidence', 'race', 'crash-evidence/race.json', '--json']);
		assert.equal(result.status, 1);
		const report = JSON.parse(result.stdout);
		assert.equal(report.status, 'failed');
		assert.ok(report.findings.some((finding) => finding.code === 'use_after_free'));
		assertMatchesSchema(schemaRoot, 'deterministic-race-report.schema.json', report);
	} finally {
		removeTempProject(projectPath);
	}
});
