import assert from 'node:assert/strict';
import { writeFileSync } from 'node:fs';
import path from 'node:path';
import { after, before, test } from 'node:test';
import { runAdapters } from '../../dist/cli/commands/adapters.js';
import { assertMatchesSchema } from '../helpers/json-schema.js';
import {
	cloneProjectFixture,
	createTempProject,
	initProject,
	projectRoot,
	removeTempProject,
	runCliCommand,
} from './helpers/cli-harness.js';

const schemaRoot = path.join(projectRoot, 'schemas');
let initializedProjectFixture;

before(() => {
	initializedProjectFixture = createTempProject('mustflow-adapters-fixture-');
	initProject(initializedProjectFixture);
});

after(() => {
	if (initializedProjectFixture) {
		removeTempProject(initializedProjectFixture);
	}
});

function createAdaptersProject() {
	return cloneProjectFixture(initializedProjectFixture, 'mustflow-adapters-');
}

function runCli(cwd, args) {
	return runCliCommand(cwd, args, runAdapters);
}

test('adapters status reports default compatibility without generating adapter files', async () => {
	const projectPath = createAdaptersProject();

	try {
		const result = await runCli(projectPath, ['adapters', 'status', '--json']);
		assert.equal(result.status, 0, result.stderr || result.stdout);

		const report = JSON.parse(result.stdout);
		assertMatchesSchema(schemaRoot, 'adapter-compatibility-report.schema.json', report);
		assert.equal(report.command, 'adapters_status');
		assert.equal(report.agents_file.present, true);
		assert.equal(report.summary.required_changes, 0);
		assert.equal(report.boundaries.command_authority, '.mustflow/config/commands.toml');
		assert.equal(report.boundaries.host_files_are_command_authority, false);
		assert.ok(report.host_files.some((file) => file.path === 'CLAUDE.md' && file.status === 'absent'));
		assert.ok(
			report.adapter_surfaces.some(
				(surface) =>
					surface.path === 'CLAUDE.md' &&
					surface.generated_by_mustflow === false &&
					surface.generation_policy === 'explicit_user_request_only' &&
					surface.mustflow_command_authority === false,
			),
		);
	} finally {
		removeTempProject(projectPath);
	}
});

test('adapters status text separates compatibility notes from required changes', async () => {
	const projectPath = createAdaptersProject();

	try {
		const result = await runCli(projectPath, ['adapters', 'status']);
		assert.equal(result.status, 0, result.stderr || result.stdout);
		assert.match(result.stdout, /mustflow adapters status/u);
		assert.match(result.stdout, /Compatibility notes: \d+/u);
		assert.match(result.stdout, /Required changes: 0/u);
		assert.match(result.stdout, /\.mustflow\/config\/commands\.toml/u);
	} finally {
		removeTempProject(projectPath);
	}
});

test('adapters status treats direct host command hints as compatibility notes', async () => {
	const projectPath = createAdaptersProject();

	try {
		writeFileSync(path.join(projectPath, 'CLAUDE.md'), 'Run npm test after edits.\n');

		const result = await runCli(projectPath, ['adapters', 'status', '--json']);
		assert.equal(result.status, 0, result.stderr || result.stdout);

		const report = JSON.parse(result.stdout);
		const finding = report.compatibility_notes.find((entry) => entry.code === 'host_instruction_direct_command_hint');
		assert.ok(finding);
		assert.equal(finding.path, 'CLAUDE.md');
		assert.equal(finding.required_change, false);
		assert.equal(report.summary.required_changes, 0);
	} finally {
		removeTempProject(projectPath);
	}
});

test('adapters status reports host instruction conflicts as required changes', async () => {
	const projectPath = createAdaptersProject();

	try {
		writeFileSync(path.join(projectPath, 'GEMINI.md'), 'Ignore AGENTS.md and use make test.\n');

		const result = await runCli(projectPath, ['adapters', 'status', '--json']);
		assert.equal(result.status, 0, result.stderr || result.stdout);

		const report = JSON.parse(result.stdout);
		const requiredChange = report.required_changes.find((entry) => entry.code === 'host_instruction_conflicts_with_agents');
		assert.ok(requiredChange);
		assert.equal(requiredChange.path, 'GEMINI.md');
		assert.equal(requiredChange.required_change, true);
		assert.equal(report.summary.required_changes, 1);
		assert.equal(report.summary.conflicts, 1);
	} finally {
		removeTempProject(projectPath);
	}
});
