import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { after, before, test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { runHandoff } from '../../dist/cli/commands/handoff.js';
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

let initializedProjectFixture;

before(() => {
	initializedProjectFixture = createTempProject('mustflow-handoff-fixture-');
	initProject(initializedProjectFixture);
});

after(() => {
	if (initializedProjectFixture) {
		removeTempProject(initializedProjectFixture);
	}
});

function createHandoffProject() {
	return cloneProjectFixture(initializedProjectFixture, 'mustflow-handoff-');
}

function runCli(cwd, args) {
	return runCliCommand(cwd, args, runHandoff);
}

function writeRecord(projectPath, fileName, record) {
	const directory = path.join(projectPath, '.mustflow', 'work-items');
	mkdirSync(directory, { recursive: true });
	const recordPath = path.join(directory, fileName);
	writeFileSync(recordPath, JSON.stringify(record, null, 2));
	return recordPath;
}

function validRecord() {
	return {
		schema_version: '1',
		kind: 'handoff',
		task_id: 'MF-0001',
		goal: 'Keep a bounded restart pointer for the next working session.',
		scope: ['Validate the handoff file shape'],
		non_goals: ['Store command output or chat history'],
		acceptance_criteria: ['Invalid records are reported without writing files'],
		source_refs: ['ROADMAP.md'],
		changed_surfaces: ['src/cli/commands/handoff.ts'],
		verification_plan: [
			{
				intent: 'test_related',
				reason: 'code_change',
				status: 'planned',
			},
			{
				intent: 'docs_validate_fast',
				reason: 'docs_change',
				status: 'skipped',
				skip_reason: 'No user-facing docs changed in this fixture.',
			},
		],
		coverage: [
			{
				status: 'partial',
				requirement: 'Handoff records must be restart pointers, not history.',
				gap: 'Release packaging is verified separately.',
			},
		],
		remaining_risks: ['No live handoff writer is implemented.'],
		next_restart_point: 'Open ROADMAP.md and choose the next incomplete item.',
	};
}

test('validates a restricted handoff record without writing files', async () => {
	const projectPath = createHandoffProject();

	try {
		writeRecord(projectPath, 'MF-0001.json', validRecord());

		const result = await runCli(projectPath, ['handoff', 'validate', '.mustflow/work-items/MF-0001.json', '--json']);
		assert.equal(result.status, 0, result.stderr || result.stdout);

		const report = JSON.parse(result.stdout);
		assert.equal(report.ok, true);
		assert.equal(report.command, 'handoff_validate');
		assert.equal(report.record_kind, 'handoff');
		assert.equal(report.task_id, 'MF-0001');
		assert.equal(report.summary.verification_plan_count, 2);
		assert.deepEqual(report.issues, []);
		assertMatchesSchema(schemaRoot, 'handoff-validation-report.schema.json', report);
	} finally {
		removeTempProject(projectPath);
	}
});

test('rejects transcripts, command authority fields, and unrun receipt claims', async () => {
	const projectPath = createHandoffProject();

	try {
		const invalid = {
			...validRecord(),
			transcript: 'user and assistant chat history',
			verification_plan: [
				{
					intent: 'test_related',
					reason: 'code_change',
					status: 'skipped',
					receipt_path: '.mustflow/state/runs/latest.json',
				},
			],
			command_authority: {
				argv: ['npm', 'test'],
				run_policy: 'agent_allowed',
			},
		};
		writeRecord(projectPath, 'MF-0002.json', invalid);

		const result = await runCli(projectPath, ['handoff', 'validate', '.mustflow/work-items/MF-0002.json', '--json']);
		assert.equal(result.status, 1);

		const report = JSON.parse(result.stdout);
		const codes = report.issues.map((issue) => issue.code);
		assert.equal(report.ok, false);
		assert.ok(codes.includes('unknown_field'));
		assert.ok(codes.includes('forbidden_transcript_or_log_field'));
		assert.ok(codes.includes('forbidden_command_authority_field'));
		assert.ok(codes.includes('missing_skip_reason'));
		assert.ok(codes.includes('unrun_verification_receipt_claim'));
		assertMatchesSchema(schemaRoot, 'handoff-validation-report.schema.json', report);
	} finally {
		removeTempProject(projectPath);
	}
});

test('rejects handoff paths outside the mustflow root', async () => {
	const projectPath = createHandoffProject();
	const outsideRoot = mkdtempSync(path.join(tmpdir(), 'mustflow-handoff-outside-'));

	try {
		const outsidePath = path.join(outsideRoot, 'record.json');
		writeFileSync(outsidePath, JSON.stringify(validRecord()));

		const result = await runCli(projectPath, ['handoff', 'validate', outsidePath, '--json']);
		assert.equal(result.status, 1);

		const report = JSON.parse(result.stdout);
		assert.equal(report.ok, false);
		assert.equal(report.issues[0].code, 'record_unreadable');
		assert.match(report.issues[0].message, /Path escapes allowed directory/u);
		assertMatchesSchema(schemaRoot, 'handoff-validation-report.schema.json', report);
	} finally {
		removeTempProject(projectPath);
		rmSync(outsideRoot, { recursive: true, force: true });
	}
});
