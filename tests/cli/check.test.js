import assert from 'node:assert/strict';
import {
	existsSync,
	mkdtempSync,
	mkdirSync,
	readFileSync,
	rmSync,
	unlinkSync,
	writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { test } from 'node:test';
import { runCliInProcess } from './helpers/cli-harness.js';

function createTempProject() {
	return mkdtempSync(path.join(tmpdir(), 'mustflow-check-'));
}

function removeTempProject(projectPath) {
	rmSync(projectPath, { recursive: true, force: true });
}

async function runCli(cwd, args) {
	return runCliInProcess(cwd, args);
}

function readText(filePath) {
	return readFileSync(filePath, 'utf8').replace(/\r\n/g, '\n');
}

async function initProject(projectPath) {
	const result = await runCli(projectPath, ['init', '--yes']);
	assert.equal(result.status, 0);
	assert.ok(existsSync(path.join(projectPath, 'AGENTS.md')));
}

function assertHasIssueDetail(check, expectedId, expectedMessage) {
	assert.ok(
		check.issueDetails.some(
			(issue) =>
				issue.id === expectedId &&
				(expectedMessage === undefined || issue.message === expectedMessage),
		),
		`missing issue detail ${expectedId}`,
	);
}

test('passes a freshly initialized mustflow project', async () => {
	const projectPath = createTempProject();

	try {
		await initProject(projectPath);

		const result = await runCli(projectPath, ['check']);

		assert.equal(result.status, 0);
		assert.match(result.stdout, /mustflow check passed/);
	} finally {
		removeTempProject(projectPath);
	}
});

test('fails when a locked file content hash no longer matches', async () => {
	const projectPath = createTempProject();

	try {
		await initProject(projectPath);
		writeFileSync(path.join(projectPath, 'AGENTS.md'), '# Changed rules\n');

		const result = await runCli(projectPath, ['check']);

		assert.equal(result.status, 1);
		assert.match(result.stderr, /Lock hash mismatch: AGENTS\.md/);
		assert.match(result.stderr, /mustflow check failed: 1 issue\(s\) found\./);
	} finally {
		removeTempProject(projectPath);
	}
});

test('prints check result as json', async () => {
	const projectPath = createTempProject();

	try {
		await initProject(projectPath);
		writeFileSync(path.join(projectPath, 'AGENTS.md'), '# Changed rules\n');

		const result = await runCli(projectPath, ['check', '--json']);
		const check = JSON.parse(result.stdout);

		assert.equal(result.status, 1);
		assert.equal(check.ok, false);
		assert.equal(check.issueCount, 1);
		assert.deepEqual(check.issues, ['Lock hash mismatch: AGENTS.md']);
		assert.deepEqual(check.issueDetails, [
			{
				id: null,
				severity: 'error',
				mode: 'base',
				message: 'Lock hash mismatch: AGENTS.md',
			},
		]);
	} finally {
		removeTempProject(projectPath);
	}
});

test('passes strict check for a freshly initialized mustflow project', async () => {
	const projectPath = createTempProject();

	try {
		await initProject(projectPath);

		const result = await runCli(projectPath, ['check', '--strict', '--json']);
		const check = JSON.parse(result.stdout);

		assert.equal(result.status, 0);
		assert.equal(check.ok, true);
		assert.equal(check.strict, true);
		assert.deepEqual(check.issues, []);
		assert.deepEqual(check.issueDetails, []);
	} finally {
		removeTempProject(projectPath);
	}
});

test('strict check fails missing output limits and invalid latest run receipts', async () => {
	const projectPath = createTempProject();

	try {
		await initProject(projectPath);
		const commandsPath = path.join(projectPath, '.mustflow', 'config', 'commands.toml');
		const commands = readText(commandsPath).replace('max_output_bytes = 1048576\n', '');
		writeFileSync(commandsPath, commands);
		const runsDir = path.join(projectPath, '.mustflow', 'state', 'runs');
		mkdirSync(runsDir, { recursive: true });
		writeFileSync(path.join(runsDir, 'latest.json'), '{not json');

		const result = await runCli(projectPath, ['check', '--strict', '--json']);
		const check = JSON.parse(result.stdout);

		assert.equal(result.status, 1);
		assert.equal(check.strict, true);
		assert.ok(check.issues.some((issue) => issue === 'Strict: [commands.defaults].max_output_bytes is required'));
		assert.ok(check.issues.some((issue) => issue.startsWith('Strict: .mustflow/state/runs/latest.json is not valid JSON')));
	} finally {
		removeTempProject(projectPath);
	}
});

test('strict check fails missing retention policy', async () => {
	const projectPath = createTempProject();

	try {
		await initProject(projectPath);
		const configPath = path.join(projectPath, '.mustflow', 'config', 'mustflow.toml');
		const config = readText(configPath).replace(/\n\[retention\][\s\S]*?(?=\n\[document_roots\])/u, '\n');
		writeFileSync(configPath, config);

		const result = await runCli(projectPath, ['check', '--strict', '--json']);
		const check = JSON.parse(result.stdout);

		assert.equal(result.status, 1);
		assert.ok(check.issues.some((issue) => issue === 'Strict: [retention] table is required'));
	} finally {
		removeTempProject(projectPath);
	}
});

test('strict check fails oversized generated files and raw JSONL logs under mustflow', async () => {
	const projectPath = createTempProject();

	try {
		await initProject(projectPath);
		const configPath = path.join(projectPath, '.mustflow', 'config', 'mustflow.toml');
		const config = readText(configPath)
			.replace('[retention.repo_map]\nmax_file_kb = 128', '[retention.repo_map]\nmax_file_kb = 1')
			.replace(
				'[retention.run_receipts]\nstore = "repo_local_ignored"\nmax_file_kb = 128',
				'[retention.run_receipts]\nstore = "repo_local_ignored"\nmax_file_kb = 1',
			);
		writeFileSync(configPath, config);
		writeFileSync(path.join(projectPath, 'REPO_MAP.md'), `# Repository Map\n\n${'a'.repeat(2048)}\n`);
		const runsDir = path.join(projectPath, '.mustflow', 'state', 'runs');
		mkdirSync(runsDir, { recursive: true });
		writeFileSync(path.join(runsDir, 'latest.json'), JSON.stringify({ filler: 'b'.repeat(2048) }));
		const rawEventsDir = path.join(projectPath, '.mustflow', 'state', 'raw-events');
		mkdirSync(rawEventsDir, { recursive: true });
		writeFileSync(path.join(rawEventsDir, 'session.jsonl'), '{}\n');
		const knowledgeDir = path.join(projectPath, '.mustflow', 'knowledge');
		mkdirSync(knowledgeDir, { recursive: true });
		writeFileSync(path.join(knowledgeDir, 'events.jsonl'), '{}\n');

		const result = await runCli(projectPath, ['check', '--strict', '--json']);
		const check = JSON.parse(result.stdout);

		assert.equal(result.status, 1);
		assert.ok(check.issues.some((issue) => issue.startsWith('Strict: REPO_MAP.md exceeds [retention.repo_map].max_file_kb')));
		assert.ok(
			check.issues.some((issue) =>
				issue.startsWith('Strict: .mustflow/state/runs/latest.json exceeds [retention.run_receipts].max_file_kb'),
			),
		);
		assert.ok(
			check.issues.some((issue) =>
				issue === 'Strict: .mustflow/state/raw-events/session.jsonl is a raw JSONL file under .mustflow',
			),
		);
		assert.ok(
			check.issues.some((issue) => issue === 'Strict: .mustflow/knowledge/events.jsonl is a raw JSONL file under .mustflow'),
		);
	} finally {
		removeTempProject(projectPath);
	}
});

test('strict check rejects per-task plans and worklogs under versioned mustflow files', async () => {
	const projectPath = createTempProject();

	try {
		await initProject(projectPath);
		const worklogDir = path.join(projectPath, '.mustflow', 'worklogs');
		const planDir = path.join(projectPath, '.mustflow', 'plans');
		mkdirSync(worklogDir, { recursive: true });
		mkdirSync(planDir, { recursive: true });
		writeFileSync(path.join(worklogDir, 'task.md'), '# Task notes\n');
		writeFileSync(path.join(planDir, 'next.md'), '# Plan\n');

		const result = await runCli(projectPath, ['check', '--strict', '--json']);
		const check = JSON.parse(result.stdout);

		assert.equal(result.status, 1);
		assertHasIssueDetail(
			check,
			'mustflow.local_state.versioned_task_worklog',
			'Strict: .mustflow/worklogs/task.md is per-task local state; keep plans and worklogs under ignored local state',
		);
		assertHasIssueDetail(
			check,
			'mustflow.local_state.versioned_task_worklog',
			'Strict: .mustflow/plans/next.md is per-task local state; keep plans and worklogs under ignored local state',
		);
	} finally {
		removeTempProject(projectPath);
	}
});

test('fails when a file recorded in manifest lock is missing', async () => {
	const projectPath = createTempProject();

	try {
		await initProject(projectPath);
		unlinkSync(path.join(projectPath, '.mustflow', 'docs', 'agent-workflow.md'));

		const result = await runCli(projectPath, ['check']);

		assert.equal(result.status, 1);
		assert.match(result.stderr, /Locked file missing: \.mustflow\/docs\/agent-workflow\.md/);
	} finally {
		removeTempProject(projectPath);
	}
});

test('keeps older installs valid when manifest lock is absent', async () => {
	const projectPath = createTempProject();

	try {
		await initProject(projectPath);
		unlinkSync(path.join(projectPath, '.mustflow', 'config', 'manifest.lock.toml'));

		const result = await runCli(projectPath, ['check']);

		assert.equal(result.status, 0);
		assert.match(result.stdout, /mustflow check passed/);
	} finally {
		removeTempProject(projectPath);
	}
});

test('fails when AGENTS.md is missing', async () => {
	const projectPath = createTempProject();

	try {
		await initProject(projectPath);
		unlinkSync(path.join(projectPath, 'AGENTS.md'));

		const result = await runCli(projectPath, ['check']);

		assert.equal(result.status, 1);
		assert.match(result.stderr, /Missing AGENTS\.md/);
	} finally {
		removeTempProject(projectPath);
	}
});

test('strict check fails when verification preferences try to define command authority', async () => {
	const projectPath = createTempProject();

	try {
		await initProject(projectPath);
		const preferencesPath = path.join(projectPath, '.mustflow', 'config', 'preferences.toml');
		const preferences = readText(preferencesPath).replace(
			'report_skipped = true',
			[
				'report_skipped = true',
				'command_intents = ["test"]',
				'run_policy = "agent_allowed"',
				'required_after = ["docs_change"]',
			].join('\n'),
		);
		writeFileSync(preferencesPath, preferences);
		unlinkSync(path.join(projectPath, '.mustflow', 'config', 'manifest.lock.toml'));

		const result = await runCli(projectPath, ['check', '--strict', '--json']);
		const check = JSON.parse(result.stdout);

		assert.equal(result.status, 1);
		assertHasIssueDetail(
			check,
			'mustflow.preferences.verification_selection_command_authority',
			'Strict: [preferences.verification.selection].command_intents cannot define command authority; use .mustflow/config/commands.toml',
		);
		assertHasIssueDetail(
			check,
			'mustflow.preferences.verification_selection_command_authority',
			'Strict: [preferences.verification.selection].run_policy cannot define command authority; use .mustflow/config/commands.toml',
		);
		assertHasIssueDetail(
			check,
			'mustflow.preferences.verification_selection_command_authority',
			'Strict: [preferences.verification.selection].required_after cannot define command authority; use .mustflow/config/commands.toml',
		);
	} finally {
		removeTempProject(projectPath);
	}
});

test('strict check accepts narrow candidate path classification configs', async () => {
	const projectPath = createTempProject();

	try {
		await initProject(projectPath);
		writeFileSync(
			path.join(projectPath, '.mustflow', 'config', 'surfaces.toml'),
			[
				'schema_version = "1"',
				'',
				'[[rules]]',
				'id = "docs_site"',
				'match = { kind = "prefix", path = "docs-site/src/content/docs/" }',
				'change_kinds = ["documentation"]',
				'surface_kind = "docs_site_page"',
				'category = "documentation"',
				'is_public_surface = true',
				'validation_reasons = ["docs_change"]',
				'affected_contracts = ["documentation site"]',
				'update_policy = "update"',
				'drift_checks = ["navigation links"]',
				'',
			].join('\n'),
		);
		writeFileSync(
			path.join(projectPath, '.mustflow', 'config', 'changes.toml'),
			[
				'schema_version = "1"',
				'',
				'[[rules]]',
				'id = "readme_exact"',
				'match = { kind = "exact", path = "README.md" }',
				'change_kinds = ["documentation"]',
				'',
				'[[rules]]',
				'id = "markdown_glob"',
				'match = { kind = "glob", path = "docs/**/*.md" }',
				'validation_reasons = ["docs_change"]',
				'',
			].join('\n'),
		);

		const result = await runCli(projectPath, ['check', '--strict', '--json']);
		const check = JSON.parse(result.stdout);

		assert.equal(result.status, 0, result.stderr || result.stdout);
		assert.equal(check.ok, true);
		assert.deepEqual(check.issues, []);
	} finally {
		removeTempProject(projectPath);
	}
});

test('strict check rejects candidate path classification command authority and deferred policy files', async () => {
	const projectPath = createTempProject();

	try {
		await initProject(projectPath);
		writeFileSync(
			path.join(projectPath, '.mustflow', 'config', 'surfaces.toml'),
			[
				'schema_version = "1"',
				'',
				'[[rules]]',
				'id = "docs_regex"',
				'match = { kind = "regex", path = "docs/.*" }',
				'validation_reasons = ["docs_change"]',
				'run_policy = "agent_allowed"',
				'required_after = ["docs_change"]',
				'',
			].join('\n'),
		);
		writeFileSync(
			path.join(projectPath, '.mustflow', 'config', 'policy.toml'),
			['schema_version = "1"', ''].join('\n'),
		);

		const result = await runCli(projectPath, ['check', '--strict', '--json']);
		const check = JSON.parse(result.stdout);

		assert.equal(result.status, 1);
		assertHasIssueDetail(
			check,
			'mustflow.contract_model.command_authority_field',
			'Strict: .mustflow/config/surfaces.toml rules[0].run_policy cannot define command authority; use .mustflow/config/commands.toml',
		);
		assertHasIssueDetail(
			check,
			'mustflow.contract_model.command_authority_field',
			'Strict: .mustflow/config/surfaces.toml rules[0].required_after cannot define command authority; use .mustflow/config/commands.toml',
		);
		assertHasIssueDetail(
			check,
			'mustflow.contract_model.invalid_match_kind',
			'Strict: .mustflow/config/surfaces.toml rules[0].match.kind must be "exact", "prefix", or "glob"; regular expressions are deferred',
		);
		assertHasIssueDetail(
			check,
			'mustflow.contract_model.deferred_policy',
			'Strict: .mustflow/config/policy.toml is deferred; use narrow candidate contract files instead',
		);
	} finally {
		removeTempProject(projectPath);
	}
});

test('strict check fails when release versioning preferences define sources or release authority', async () => {
	const projectPath = createTempProject();

	try {
		await initProject(projectPath);
		const preferencesPath = path.join(projectPath, '.mustflow', 'config', 'preferences.toml');
		const preferences = readText(preferencesPath).replace(
			'sync_tests = true',
			[
				'sync_tests = true',
				'version_source = "package.json"',
				'authority = "source"',
				'command_intents = ["release"]',
				'push = true',
			].join('\n'),
		);
		writeFileSync(preferencesPath, preferences);

		const result = await runCli(projectPath, ['check', '--strict', '--json']);
		const check = JSON.parse(result.stdout);

		assert.equal(result.status, 1);
		for (const field of ['version_source', 'authority', 'command_intents', 'push']) {
			assertHasIssueDetail(
				check,
				'mustflow.preferences.release_versioning_contract_authority',
				`Strict: [preferences.release.versioning].${field} cannot define version sources or release authority; use .mustflow/config/versioning.toml or .mustflow/config/commands.toml`,
			);
		}
	} finally {
		removeTempProject(projectPath);
	}
});

test('fails when commit message style is unsupported', async () => {
	const projectPath = createTempProject();

	try {
		await initProject(projectPath);
		const preferencesPath = path.join(projectPath, '.mustflow', 'config', 'preferences.toml');
		const preferences = readText(preferencesPath).replace('style = "conventional"', 'style = "emoji"');
		writeFileSync(preferencesPath, preferences);
		unlinkSync(path.join(projectPath, '.mustflow', 'config', 'manifest.lock.toml'));

		const result = await runCli(projectPath, ['check']);

		assert.equal(result.status, 1);
		assert.match(
			result.stderr,
			/\[preferences\.git\.commit_message\]\.style must be "conventional" or "descriptive" or "gitmoji"/,
		);
	} finally {
		removeTempProject(projectPath);
	}
});
