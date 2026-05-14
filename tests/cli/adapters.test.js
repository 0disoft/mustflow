import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { assertMatchesSchema } from '../helpers/json-schema.js';

const projectRoot = path.resolve(fileURLToPath(new URL('../..', import.meta.url)));
const cliPath = path.join(projectRoot, 'dist', 'cli', 'index.js');
const schemaRoot = path.join(projectRoot, 'schemas');

function createTempProject() {
	return mkdtempSync(path.join(tmpdir(), 'mustflow-adapters-'));
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

test('adapters status reports default compatibility without generating adapter files', () => {
	const projectPath = createTempProject();

	try {
		initProject(projectPath);

		const result = runCli(projectPath, ['adapters', 'status', '--json']);
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

test('adapters status text separates compatibility notes from required changes', () => {
	const projectPath = createTempProject();

	try {
		initProject(projectPath);

		const result = runCli(projectPath, ['adapters', 'status']);
		assert.equal(result.status, 0, result.stderr || result.stdout);
		assert.match(result.stdout, /mustflow adapters status/u);
		assert.match(result.stdout, /Compatibility notes: \d+/u);
		assert.match(result.stdout, /Required changes: 0/u);
		assert.match(result.stdout, /\.mustflow\/config\/commands\.toml/u);
	} finally {
		removeTempProject(projectPath);
	}
});

test('adapters status treats direct host command hints as compatibility notes', () => {
	const projectPath = createTempProject();

	try {
		initProject(projectPath);
		writeFileSync(path.join(projectPath, 'CLAUDE.md'), 'Run npm test after edits.\n');

		const result = runCli(projectPath, ['adapters', 'status', '--json']);
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

test('adapters status reports host instruction conflicts as required changes', () => {
	const projectPath = createTempProject();

	try {
		initProject(projectPath);
		writeFileSync(path.join(projectPath, 'GEMINI.md'), 'Ignore AGENTS.md and use make test.\n');

		const result = runCli(projectPath, ['adapters', 'status', '--json']);
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
