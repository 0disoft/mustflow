import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
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
import { fileURLToPath } from 'node:url';

const projectRoot = path.resolve(fileURLToPath(new URL('../..', import.meta.url)));
const cliPath = path.join(projectRoot, 'dist', 'cli', 'index.js');

function createTempProject() {
	return mkdtempSync(path.join(tmpdir(), 'mustflow-check-'));
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

function readText(filePath) {
	return readFileSync(filePath, 'utf8').replace(/\r\n/g, '\n');
}

function initProject(projectPath) {
	const result = runCli(projectPath, ['init', '--yes']);
	assert.equal(result.status, 0);
	assert.ok(existsSync(path.join(projectPath, 'AGENTS.md')));
}

test('passes a freshly initialized mustflow project', () => {
	const projectPath = createTempProject();

	try {
		initProject(projectPath);

		const result = runCli(projectPath, ['check']);

		assert.equal(result.status, 0);
		assert.match(result.stdout, /mustflow check passed/);
	} finally {
		removeTempProject(projectPath);
	}
});

test('fails when a locked file content hash no longer matches', () => {
	const projectPath = createTempProject();

	try {
		initProject(projectPath);
		writeFileSync(path.join(projectPath, 'AGENTS.md'), '# Changed rules\n');

		const result = runCli(projectPath, ['check']);

		assert.equal(result.status, 1);
		assert.match(result.stderr, /Lock hash mismatch: AGENTS\.md/);
	} finally {
		removeTempProject(projectPath);
	}
});

test('prints check result as json', () => {
	const projectPath = createTempProject();

	try {
		initProject(projectPath);
		writeFileSync(path.join(projectPath, 'AGENTS.md'), '# Changed rules\n');

		const result = runCli(projectPath, ['check', '--json']);
		const check = JSON.parse(result.stdout);

		assert.equal(result.status, 1);
		assert.equal(check.ok, false);
		assert.equal(check.issueCount, 1);
		assert.deepEqual(check.issues, ['Lock hash mismatch: AGENTS.md']);
	} finally {
		removeTempProject(projectPath);
	}
});

test('passes strict check for a freshly initialized mustflow project', () => {
	const projectPath = createTempProject();

	try {
		initProject(projectPath);

		const result = runCli(projectPath, ['check', '--strict', '--json']);
		const check = JSON.parse(result.stdout);

		assert.equal(result.status, 0);
		assert.equal(check.ok, true);
		assert.equal(check.strict, true);
		assert.deepEqual(check.issues, []);
	} finally {
		removeTempProject(projectPath);
	}
});

test('strict check fails raw shell commands in skill documents and unsafe REPO_MAP metadata', () => {
	const projectPath = createTempProject();

	try {
		initProject(projectPath);
		const skillPath = path.join(projectPath, '.mustflow', 'skills', 'code-review', 'SKILL.md');
		const skill = readFileSync(skillPath, 'utf8');
		writeFileSync(
			skillPath,
			`${skill}\n\n\`\`\`sh\nnpm test\n\`\`\`\n`,
		);
		writeFileSync(
			path.join(projectPath, 'REPO_MAP.md'),
			[
				'# Repository Map',
				'',
				'Generated at: 2026-05-06T00:00:00Z',
				'Remote: https://github.com/example/private-repo',
				'Branch: main',
				'',
			].join('\n'),
		);

		const result = runCli(projectPath, ['check', '--strict']);

		assert.equal(result.status, 1);
		assert.match(result.stderr, /Strict: \.mustflow\/skills\/code-review\/SKILL\.md contains a raw shell command block/);
		assert.match(result.stderr, /Strict: REPO_MAP\.md contains volatile generated metadata/);
		assert.match(result.stderr, /Strict: REPO_MAP\.md contains remote URL or branch metadata/);
	} finally {
		removeTempProject(projectPath);
	}
});

test('strict check fails unsafe skill resource declarations', () => {
	const projectPath = createTempProject();

	try {
		initProject(projectPath);
		const skillDir = path.join(projectPath, '.mustflow', 'skills', 'code-review');
		const scriptsDir = path.join(skillDir, 'scripts');
		mkdirSync(scriptsDir, { recursive: true });
		writeFileSync(path.join(scriptsDir, 'loose.js'), 'console.log("loose");\n');
		writeFileSync(path.join(scriptsDir, 'validate-review.js'), 'console.log("validate");\n');
		writeFileSync(
			path.join(skillDir, 'resources.toml'),
			[
				'schema_version = "1"',
				'',
				'[resources."references/missing.md"]',
				'type = "reference"',
				'purpose = "Missing reference."',
				'required = false',
				'',
				'[resources."scripts/validate-review.js"]',
				'type = "script"',
				'purpose = "Review validation helper."',
				'run_policy = "agent_allowed"',
				'command_intent = "missing_intent"',
				'network = true',
				'destructive = true',
				'writes = ["../outside.txt"]',
				'',
			].join('\n'),
		);
		const orphanSkillDir = path.join(projectPath, '.mustflow', 'skills', 'orphan');
		mkdirSync(orphanSkillDir, { recursive: true });
		writeFileSync(path.join(orphanSkillDir, 'resources.toml'), 'schema_version = "1"\n');

		const result = runCli(projectPath, ['check', '--strict', '--json']);
		const check = JSON.parse(result.stdout);

		assert.equal(result.status, 1);
		assert.ok(check.issues.some((issue) => issue === 'Strict: .mustflow/skills/orphan is a skill folder without SKILL.md'));
		assert.ok(
			check.issues.some(
				(issue) =>
					issue ===
					'Strict: .mustflow/skills/code-review/resources.toml references missing resource references/missing.md',
			),
		);
		assert.ok(
			check.issues.some(
				(issue) =>
					issue ===
					'Strict: .mustflow/skills/code-review/scripts/loose.js is not declared in resources.toml',
			),
		);
		assert.ok(
			check.issues.some(
				(issue) =>
					issue ===
					'Strict: .mustflow/skills/code-review/resources.toml script scripts/validate-review.js must use run_policy = "requires_command_contract"',
			),
		);
		assert.ok(
			check.issues.some(
				(issue) =>
					issue ===
					'Strict: .mustflow/skills/code-review/resources.toml script scripts/validate-review.js references unknown command intent "missing_intent"',
			),
		);
		assert.ok(
			check.issues.some(
				(issue) =>
					issue ===
					'Strict: .mustflow/skills/code-review/resources.toml script scripts/validate-review.js cannot set network = true',
			),
		);
		assert.ok(
			check.issues.some(
				(issue) =>
					issue ===
					'Strict: .mustflow/skills/code-review/resources.toml script scripts/validate-review.js cannot set destructive = true',
			),
		);
		assert.ok(
			check.issues.some(
				(issue) =>
					issue ===
					'Strict: .mustflow/skills/code-review/resources.toml script scripts/validate-review.js writes entries must stay inside the skill folder',
			),
		);
	} finally {
		removeTempProject(projectPath);
	}
});

test('strict check fails missing output limits and invalid latest run receipts', () => {
	const projectPath = createTempProject();

	try {
		initProject(projectPath);
		const commandsPath = path.join(projectPath, '.mustflow', 'config', 'commands.toml');
		const commands = readText(commandsPath).replace('max_output_bytes = 1048576\n', '');
		writeFileSync(commandsPath, commands);
		const runsDir = path.join(projectPath, '.mustflow', 'state', 'runs');
		mkdirSync(runsDir, { recursive: true });
		writeFileSync(path.join(runsDir, 'latest.json'), '{not json');

		const result = runCli(projectPath, ['check', '--strict', '--json']);
		const check = JSON.parse(result.stdout);

		assert.equal(result.status, 1);
		assert.equal(check.strict, true);
		assert.ok(check.issues.some((issue) => issue === 'Strict: [commands.defaults].max_output_bytes is required'));
		assert.ok(check.issues.some((issue) => issue.startsWith('Strict: .mustflow/state/runs/latest.json is not valid JSON')));
	} finally {
		removeTempProject(projectPath);
	}
});

test('strict check fails missing retention policy', () => {
	const projectPath = createTempProject();

	try {
		initProject(projectPath);
		const configPath = path.join(projectPath, '.mustflow', 'config', 'mustflow.toml');
		const config = readText(configPath).replace(/\n\[retention\][\s\S]*?(?=\n\[document_roots\])/u, '\n');
		writeFileSync(configPath, config);

		const result = runCli(projectPath, ['check', '--strict', '--json']);
		const check = JSON.parse(result.stdout);

		assert.equal(result.status, 1);
		assert.ok(check.issues.some((issue) => issue === 'Strict: [retention] table is required'));
	} finally {
		removeTempProject(projectPath);
	}
});

test('strict check fails oversized generated files and raw JSONL logs under mustflow', () => {
	const projectPath = createTempProject();

	try {
		initProject(projectPath);
		const configPath = path.join(projectPath, '.mustflow', 'config', 'mustflow.toml');
		const config = readText(configPath)
			.replace('[retention.repo_map]\nmax_file_kb = 128', '[retention.repo_map]\nmax_file_kb = 1')
			.replace('[retention.run_receipts]\nstore = "project"\nmax_file_kb = 128', '[retention.run_receipts]\nstore = "project"\nmax_file_kb = 1');
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

		const result = runCli(projectPath, ['check', '--strict', '--json']);
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

test('strict check fails unsafe context documents', () => {
	const projectPath = createTempProject();

	try {
		initProject(projectPath);
		const configPath = path.join(projectPath, '.mustflow', 'config', 'mustflow.toml');
		let config = readText(configPath);

		if (config.includes('[retention.context]')) {
			config = config.replace(
				/\[retention\.context\]\nmax_file_kb = \d+/u,
				'[retention.context]\nmax_file_kb = 1',
			);
		} else {
			config = config.replace('\n[retention.repo_map]', '\n[retention.context]\nmax_file_kb = 1\n\n[retention.repo_map]');
		}

		writeFileSync(configPath, config);
		writeFileSync(path.join(projectPath, 'DESIGN.md'), '# Design contract\n');
		writeFileSync(
			path.join(projectPath, '.mustflow', 'context', 'PROJECT.md'),
			[
				'---',
				'mustflow_doc: context.project',
				'kind: mustflow-context',
				'locale: en',
				'canonical: true',
				'revision: 1',
				'name: project',
				'authority: contextual',
				'---',
				'',
				'# Project Context',
				'',
				'Local workspace: C:\\Users\\cherr\\Documents\\private-app',
				'api_token = "abcdef1234567890"',
				'primary = "#0055ff"',
				'',
				'Filler:',
				'a'.repeat(2048),
			].join('\n'),
		);

		const result = runCli(projectPath, ['check', '--strict', '--json']);
		const check = JSON.parse(result.stdout);

		assert.equal(result.status, 1);
		assert.ok(
			check.issues.some((issue) =>
				issue.startsWith('Strict: .mustflow/context/PROJECT.md exceeds [retention.context].max_file_kb'),
			),
		);
		assert.ok(
			check.issues.some((issue) =>
				issue === 'Strict: .mustflow/context/PROJECT.md contains a local absolute path; keep machine-local paths out of context files',
			),
		);
		assert.ok(
			check.issues.some((issue) =>
				issue === 'Strict: .mustflow/context/PROJECT.md contains secret-like key/value text; keep secrets out of context files',
			),
		);
		assert.ok(
			check.issues.some((issue) =>
				issue === 'Strict: .mustflow/context/PROJECT.md duplicates design-token definitions while DESIGN.md exists',
			),
		);
	} finally {
		removeTempProject(projectPath);
	}
});

test('fails when a file recorded in manifest lock is missing', () => {
	const projectPath = createTempProject();

	try {
		initProject(projectPath);
		unlinkSync(path.join(projectPath, '.mustflow', 'docs', 'agent-workflow.md'));

		const result = runCli(projectPath, ['check']);

		assert.equal(result.status, 1);
		assert.match(result.stderr, /Locked file missing: \.mustflow\/docs\/agent-workflow\.md/);
	} finally {
		removeTempProject(projectPath);
	}
});

test('keeps older installs valid when manifest lock is absent', () => {
	const projectPath = createTempProject();

	try {
		initProject(projectPath);
		unlinkSync(path.join(projectPath, '.mustflow', 'config', 'manifest.lock.toml'));

		const result = runCli(projectPath, ['check']);

		assert.equal(result.status, 0);
		assert.match(result.stdout, /mustflow check passed/);
	} finally {
		removeTempProject(projectPath);
	}
});

test('fails when AGENTS.md is missing', () => {
	const projectPath = createTempProject();

	try {
		initProject(projectPath);
		unlinkSync(path.join(projectPath, 'AGENTS.md'));

		const result = runCli(projectPath, ['check']);

		assert.equal(result.status, 1);
		assert.match(result.stderr, /Missing AGENTS\.md/);
	} finally {
		removeTempProject(projectPath);
	}
});

test('fails when a skill omits a required section', () => {
	const projectPath = createTempProject();

	try {
		initProject(projectPath);
		const skillPath = path.join(projectPath, '.mustflow', 'skills', 'code-review', 'SKILL.md');
		const skill = readFileSync(skillPath, 'utf8');
		writeFileSync(skillPath, skill.replace('## Verification', '## Checks'));

		const result = runCli(projectPath, ['check']);

		assert.equal(result.status, 1);
		assert.match(result.stderr, /Missing required skill section set/);
		assert.match(result.stderr, /code-review\/SKILL\.md/);
	} finally {
		removeTempProject(projectPath);
	}
});

test('fails when map and workspace configuration fields are invalid', () => {
	const projectPath = createTempProject();

	try {
		initProject(projectPath);
		const configPath = path.join(projectPath, '.mustflow', 'config', 'mustflow.toml');
		const config = readText(configPath)
			.replace('output = "REPO_MAP.md"', 'output = ""')
			.replace('mode = "anchors_only"', 'mode = "full_tree"')
			.replace('privacy = "minimal"', 'privacy = "verbose"')
			.replace('include_nested = false', 'include_nested = "yes"')
			.replace('"Taskfile.yml",', '"Taskfile.yml",\n  "",')
			.replace('enabled = false', 'enabled = true')
			.replace('roots = []', 'roots = [".."]')
			.replace('max_depth = 4', 'max_depth = 0')
			.replace('max_repositories = 50', 'max_repositories = -1')
			.replace('follow_symlinks = false', 'follow_symlinks = "no"')
			.replace('stop_at_repository_root = true', 'stop_at_repository_root = "yes"');
		writeFileSync(configPath, config);

		const result = runCli(projectPath, ['check']);

		assert.equal(result.status, 1);
		assert.match(result.stderr, /\[map\]\.output must be a non-empty relative path/);
		assert.match(result.stderr, /\[map\]\.mode must be "anchors_only"/);
		assert.match(result.stderr, /\[map\]\.privacy must be "minimal"/);
		assert.match(result.stderr, /\[map\]\.include_nested must be a boolean/);
		assert.match(result.stderr, /\[map\]\.anchor_files entries must be non-empty relative paths/);
		assert.match(result.stderr, /\[workspace\]\.roots entries must be relative paths inside the current root/);
		assert.match(result.stderr, /\[workspace\]\.max_depth must be a positive integer/);
		assert.match(result.stderr, /\[workspace\]\.max_repositories must be a positive integer/);
		assert.match(result.stderr, /\[workspace\]\.follow_symlinks must be a boolean/);
		assert.match(result.stderr, /\[workspace\]\.stop_at_repository_root must be a boolean/);
	} finally {
		removeTempProject(projectPath);
	}
});

test('fails when context configuration fields are invalid', () => {
	const projectPath = createTempProject();

	try {
		initProject(projectPath);
		const configPath = path.join(projectPath, '.mustflow', 'config', 'mustflow.toml');
		const config = readText(configPath)
			.replace('[context]\nenabled = true', '[context]\nenabled = "yes"')
			.replace('root = ".mustflow/context"', 'root = ""')
			.replace('\nindex = ".mustflow/context/INDEX.md"', '\nindex = "../INDEX.md"')
			.replace('default_files = [', 'default_files = [\n  "",')
			.replace('read_policy = "task_relevant_only"', 'read_policy = "read_everything"')
			.replace('authority = "contextual"', 'authority = "normative"')
			.replace('external_anchors = [', 'external_anchors = [\n  "../README.md",');
		writeFileSync(configPath, config);

		const result = runCli(projectPath, ['check']);

		assert.equal(result.status, 1);
		assert.match(result.stderr, /\[context\]\.enabled must be a boolean/);
		assert.match(result.stderr, /\[context\]\.root must be a non-empty relative path/);
		assert.match(result.stderr, /\[context\]\.index must be a non-empty relative path/);
		assert.match(result.stderr, /\[context\]\.default_files entries must be non-empty relative paths/);
		assert.match(result.stderr, /\[context\]\.read_policy must be "task_relevant_only"/);
		assert.match(result.stderr, /\[context\]\.authority must be "contextual"/);
		assert.match(result.stderr, /\[context\]\.external_anchors entries must be non-empty relative paths/);
	} finally {
		removeTempProject(projectPath);
	}
});

test('fails when agent control surface configuration fields are invalid', () => {
	const projectPath = createTempProject();

	try {
		initProject(projectPath);
		const configPath = path.join(projectPath, '.mustflow', 'config', 'mustflow.toml');
		const config = readText(configPath)
			.replace('workflow = true', 'workflow = "yes"')
			.replace('repo_map = "generated_optional"', 'repo_map = "verbose"')
			.replace('local_index = "generated_optional"', 'local_index = "sqlite"')
			.replace('adapters = []', 'adapters = [1]')
			.replace('"act",', '"improvise",')
			.replace('command_source = ".mustflow/config/commands.toml"', 'command_source = "../commands.toml"')
			.replace('allow_inferred_commands = false', 'allow_inferred_commands = "no"')
			.replace('[handoff]\nenabled = false', '[handoff]\nenabled = "no"')
			.replace('mode = "report_only"', 'mode = "auto_create"');
		writeFileSync(configPath, config);

		const result = runCli(projectPath, ['check']);

		assert.equal(result.status, 1);
		assert.match(result.stderr, /\[capabilities\]\.workflow must be a boolean/);
		assert.match(result.stderr, /\[capabilities\]\.repo_map must be "disabled" or "optional" or "required" or "generated_optional"/);
		assert.match(result.stderr, /\[capabilities\]\.local_index must be "disabled" or "optional" or "required" or "generated_optional"/);
		assert.match(result.stderr, /\[capabilities\]\.adapters must be a string array/);
		assert.match(result.stderr, /\[agent_loop\]\.phases must be "orient", "plan", "act", "verify", "report", "handoff"/);
		assert.match(result.stderr, /\[verification\]\.command_source must be a non-empty relative path/);
		assert.match(result.stderr, /\[verification\]\.allow_inferred_commands must be a boolean/);
		assert.match(result.stderr, /\[handoff\]\.enabled must be a boolean/);
		assert.match(result.stderr, /\[handoff\]\.mode must be "report_only" or "work_item_optional"/);
	} finally {
		removeTempProject(projectPath);
	}
});

test('fails when instruction refresh configuration fields are invalid', () => {
	const projectPath = createTempProject();

	try {
		initProject(projectPath);
		const configPath = path.join(projectPath, '.mustflow', 'config', 'mustflow.toml');
		const config = readText(configPath)
			.replace('[refresh]\nenabled = true', '[refresh]\nenabled = "yes"')
			.replace('mode = "checkpoint"', 'mode = "always"')
			.replace('"before_command_run",', '"before_every_message",')
			.replace('turn_threshold = 10', 'turn_threshold = 0')
			.replace('tool_call_threshold = 25', 'tool_call_threshold = -1')
			.replace('output_bytes_threshold = 200000', 'output_bytes_threshold = "large"')
			.replace('state_store = "cache"', 'state_store = "project"')
			.replace('[refresh.levels.light]\nread = [', '[refresh.levels.light]\nread = [\n  "../AGENTS.md",');
		writeFileSync(configPath, config);

		const result = runCli(projectPath, ['check']);

		assert.equal(result.status, 1);
		assert.match(result.stderr, /\[refresh\]\.enabled must be a boolean/);
		assert.match(result.stderr, /\[refresh\]\.mode must be "checkpoint"/);
		assert.match(result.stderr, /\[refresh\]\.required_at contains unsupported checkpoint "before_every_message"/);
		assert.match(result.stderr, /\[refresh\]\.turn_threshold must be a positive integer/);
		assert.match(result.stderr, /\[refresh\]\.tool_call_threshold must be a positive integer/);
		assert.match(result.stderr, /\[refresh\]\.output_bytes_threshold must be a positive integer/);
		assert.match(result.stderr, /\[refresh\]\.state_store must be "none" or "cache"/);
		assert.match(result.stderr, /\[refresh\.levels\.light\]\.read entries must be non-empty relative paths/);
	} finally {
		removeTempProject(projectPath);
	}
});

test('fails when long-running harness policy fields are invalid', () => {
	const projectPath = createTempProject();

	try {
		initProject(projectPath);
		const configPath = path.join(projectPath, '.mustflow', 'config', 'mustflow.toml');
		const config = readText(configPath)
			.replace(
				/\[harness\]\nmode = "single_session"\nfresh_context_preferred = true/u,
				'[harness]\nmode = "agent_runtime"\nfresh_context_preferred = "yes"',
			)
			.replace(
				/\[harness\.phases\]\nenabled = \[\n  "plan",\n  "work",\n  "verify",\n  "judge",\n  "handoff",\n\]/u,
				[
					'[harness.phases]',
					'enabled = [',
					'  "plan",',
					'  "work",',
					'  "verify",',
					'  "judge",',
					'  "handoff",',
					'  "spawn_workers",',
					']',
				].join('\n'),
			)
			.replace(
				/\[budget\]\nenabled = true\nmax_iterations = 10\nmax_wall_clock_minutes = 120\nmax_command_runs = 50\nmax_total_output_mb = 20\nmax_failures_per_intent = 3\non_limit = "stop_and_handoff"/u,
				[
					'[budget]',
					'enabled = "yes"',
					'max_iterations = 0',
					'max_wall_clock_minutes = -1',
					'max_command_runs = "many"',
					'max_total_output_mb = 0',
					'max_failures_per_intent = false',
					'on_limit = "keep_running"',
				].join('\n'),
			)
			.replace('[approval]\nrequired_for = [', '[approval]\nrequired_for = [\n  "self_destruct",')
			.replace('on_required = "stop_and_request_approval"', 'on_required = "auto_approve"')
			.replace(
				/\[isolation\]\npreferred = "git_worktree"\nrequired_for_long_running = true\nallow_dirty_main_worktree = false/u,
				[
					'[isolation]',
					'preferred = "shared_dirty_tree"',
					'required_for_long_running = "yes"',
					'allow_dirty_main_worktree = "no"',
				].join('\n'),
			)
			.replace(
				/\[retention\.handoffs\]\nstore = "project"\nmax_file_kb = 64\nmax_total_mb = 5\nrequire_source_refs = true/u,
				'[retention.handoffs]\nstore = "session"\nmax_file_kb = 0\nmax_total_mb = 5\nrequire_source_refs = "yes"',
			);
		writeFileSync(configPath, config);

		const result = runCli(projectPath, ['check']);

		assert.equal(result.status, 1);
		assert.match(result.stderr, /\[harness\]\.mode must be "single_session" or "long_running_optional"/);
		assert.match(result.stderr, /\[harness\]\.fresh_context_preferred must be a boolean/);
		assert.match(result.stderr, /\[harness\.phases\]\.enabled contains unsupported phase "spawn_workers"/);
		assert.match(result.stderr, /\[budget\]\.enabled must be a boolean/);
		assert.match(result.stderr, /\[budget\]\.max_iterations must be a positive integer/);
		assert.match(result.stderr, /\[budget\]\.on_limit must be "stop_and_handoff" or "stop_and_report"/);
		assert.match(result.stderr, /\[approval\]\.required_for contains unsupported approval gate "self_destruct"/);
		assert.match(result.stderr, /\[approval\]\.on_required must be "stop_and_request_approval"/);
		assert.match(result.stderr, /\[isolation\]\.preferred must be "none" or "git_worktree" or "sandbox"/);
		assert.match(result.stderr, /\[isolation\]\.required_for_long_running must be a boolean/);
		assert.match(result.stderr, /\[retention\.handoffs\]\.store must be "none" or "cache" or "project"/);
		assert.match(result.stderr, /\[retention\.handoffs\]\.max_file_kb must be a positive integer/);
		assert.match(result.stderr, /\[retention\.handoffs\]\.require_source_refs must be a boolean/);
	} finally {
		removeTempProject(projectPath);
	}
});

test('fails when compaction memory policy fields are invalid', () => {
	const projectPath = createTempProject();

	try {
		initProject(projectPath);
		const configPath = path.join(projectPath, '.mustflow', 'config', 'mustflow.toml');
		const config = readText(configPath)
			.replace('[compaction]\nenabled = false\nstrategy = "tiered"\nstate_store = "cache"', '[compaction]\nenabled = "no"\nstrategy = "flat"\nstate_store = "project"')
			.replace('keep_turns = 30', 'keep_turns = 0')
			.replace('max_total_bytes = 500000', 'max_total_bytes = "large"')
			.replace('store_raw = true', 'store_raw = "yes"')
			.replace('trigger_turns = 30', 'trigger_turns = -1')
			.replace('target_items = 10', 'target_items = 0')
			.replace('target_max_words_per_item = 40', 'target_max_words_per_item = "short"')
			.replace('"decisions",', '"dreams",')
			.replace('promote_after_mid_items = 50', 'promote_after_mid_items = 0')
			.replace('max_items = 100', 'max_items = -1')
			.replace('on_limit = "recompact_oldest"', 'on_limit = "append_forever"')
			.replace('[compaction.raw_retention]\nmax_age_days = 14\nmax_total_mb = 250\non_limit = "prune_after_compaction"', '[compaction.raw_retention]\nmax_age_days = 0\nmax_total_mb = "huge"\non_limit = "keep_forever"')
			.replace('require_source_refs = true', 'require_source_refs = "yes"')
			.replace('summaries_are_derived = true', 'summaries_are_derived = "yes"')
			.replace('current_files_override_summaries = true', 'current_files_override_summaries = "yes"')
			.replace('do_not_store_hidden_chain_of_thought = true', 'do_not_store_hidden_chain_of_thought = "yes"');
		writeFileSync(configPath, config);

		const result = runCli(projectPath, ['check']);

		assert.equal(result.status, 1);
		assert.match(result.stderr, /\[compaction\]\.enabled must be a boolean/);
		assert.match(result.stderr, /\[compaction\]\.strategy must be "tiered"/);
		assert.match(result.stderr, /\[compaction\]\.state_store must be "none" or "cache"/);
		assert.match(result.stderr, /\[compaction.recent\]\.keep_turns must be a positive integer/);
		assert.match(result.stderr, /\[compaction.recent\]\.max_total_bytes must be a positive integer/);
		assert.match(result.stderr, /\[compaction.recent\]\.store_raw must be a boolean/);
		assert.match(result.stderr, /\[compaction.mid\]\.trigger_turns must be a positive integer/);
		assert.match(result.stderr, /\[compaction.mid\]\.target_items must be a positive integer/);
		assert.match(result.stderr, /\[compaction.mid\]\.target_max_words_per_item must be a positive integer/);
		assert.match(result.stderr, /\[compaction.mid\]\.include_categories contains unsupported category "dreams"/);
		assert.match(result.stderr, /\[compaction.long\]\.promote_after_mid_items must be a positive integer/);
		assert.match(result.stderr, /\[compaction.long\]\.max_items must be a positive integer/);
		assert.match(result.stderr, /\[compaction.long\]\.on_limit must be "recompact_oldest" or "delete_oldest" or "archive_oldest"/);
		assert.match(result.stderr, /\[compaction.raw_retention\]\.max_age_days must be a positive integer/);
		assert.match(result.stderr, /\[compaction.raw_retention\]\.max_total_mb must be a positive integer/);
		assert.match(result.stderr, /\[compaction.raw_retention\]\.on_limit must be "prune_after_compaction" or "report"/);
		assert.match(result.stderr, /\[compaction.rules\]\.require_source_refs must be a boolean/);
		assert.match(result.stderr, /\[compaction.rules\]\.summaries_are_derived must be a boolean/);
		assert.match(result.stderr, /\[compaction.rules\]\.current_files_override_summaries must be a boolean/);
		assert.match(result.stderr, /\[compaction.rules\]\.do_not_store_hidden_chain_of_thought must be a boolean/);
	} finally {
		removeTempProject(projectPath);
	}
});

test('fails when testing relevance policy fields are invalid', () => {
	const projectPath = createTempProject();

	try {
		initProject(projectPath);
		const configPath = path.join(projectPath, '.mustflow', 'config', 'mustflow.toml');
		const invalidTestingPolicy = `[testing]
policy = "test_forever"
prefer_update_existing_tests = "yes"
require_existing_test_search = "yes"
require_test_change_report = "yes"
forbid_validation_weakening = "yes"
allow_test_deletion_when = [
  "behavior_removed",
  "because_failing",
]
forbid_test_deletion_when = [
  "only_to_make_tests_pass",
  "because_it_exists",
]
stale_test_action = "delete"
`;
		const config = readText(configPath).replace(/\n\[testing\][\s\S]*?(?=\n\[handoff\])/u, `\n${invalidTestingPolicy}`);
		writeFileSync(configPath, config);

		const result = runCli(projectPath, ['check']);

		assert.equal(result.status, 1);
		assert.match(result.stderr, /\[testing\]\.policy must be "behavior_contract"/);
		assert.match(result.stderr, /\[testing\]\.prefer_update_existing_tests must be a boolean/);
		assert.match(result.stderr, /\[testing\]\.require_existing_test_search must be a boolean/);
		assert.match(result.stderr, /\[testing\]\.require_test_change_report must be a boolean/);
		assert.match(result.stderr, /\[testing\]\.forbid_validation_weakening must be a boolean/);
		assert.match(result.stderr, /\[testing\]\.allow_test_deletion_when contains unsupported reason "because_failing"/);
		assert.match(result.stderr, /\[testing\]\.forbid_test_deletion_when contains unsupported reason "because_it_exists"/);
		assert.match(result.stderr, /\[testing\]\.stale_test_action must be "update_remove_or_report"/);
	} finally {
		removeTempProject(projectPath);
	}
});

test('fails when preferences configuration fields are invalid', () => {
	const projectPath = createTempProject();

	try {
		initProject(projectPath);
		const preferencesPath = path.join(projectPath, '.mustflow', 'config', 'preferences.toml');
		writeFileSync(
			preferencesPath,
			[
				'schema_version = 1',
				'',
				'[project]',
				'convention_mode = []',
				'profile = false',
				'',
				'[language]',
				'agent_response = 7',
				'docs = []',
				'',
				'[language.code_comments]',
				'mode = []',
				'fallback = false',
				'rule = 1',
				'',
				'[language.logs]',
				'mode = ""',
				'fallback = ""',
				'',
				'[language.user_facing_text]',
				'mode = false',
				'fallback = 1',
				'',
				'[language.memory]',
				'summary = []',
				'fallback = false',
				'preserve_code = "yes"',
				'preserve_paths = "yes"',
				'preserve_error_output = "yes"',
				'',
				'[formatting]',
				'indentation = []',
				'indentation_when_missing = false',
				'line_endings = false',
				'line_endings_when_missing = []',
				'quote_style = 1',
				'trailing_whitespace = {}',
				'',
				'[code_style]',
				'naming = []',
				'comments = 1',
				'public_api_docs = false',
				'avoid_drive_by_refactors = "yes"',
				'',
				'[git]',
				'auto_stage = "no"',
				'auto_commit = "no"',
				'auto_push = "no"',
				'',
				'[git.commit_message]',
				'suggest = false',
				'style = []',
				'language = 1',
				'language_when_missing = {}',
				'scope = false',
				'max_suggestions = 0',
				'include_body = false',
				'split_when_multiple_concerns = "yes"',
				'avoid_sensitive_details = "yes"',
				'',
				'[reporting.commit_suggestion]',
				'enabled = "yes"',
				'when = 1',
				'source = false',
				'',
				'[docs]',
				'update_when = "always"',
				'tone = 1',
				'',
				'[logging]',
				'style = []',
				'include_sensitive_data = "no"',
				'',
				'[product_i18n]',
				'enabled = "yes"',
				'source_locale = []',
				'target_locales = "ko-KR"',
				'fallback_locale = false',
				'translation_policy = "translate_everything"',
				'',
			].join('\n'),
		);

		const result = runCli(projectPath, ['check']);

		assert.equal(result.status, 1);
		assert.match(result.stderr, /\[preferences\]\.schema_version must be a string/);
		assert.match(result.stderr, /\[preferences\.project\]\.convention_mode must be a string/);
		assert.match(result.stderr, /\[preferences\.language\]\.agent_response must be a string/);
		assert.match(result.stderr, /\[preferences\.language\.code_comments\]\.mode must be a string/);
		assert.match(result.stderr, /\[preferences\.language\.logs\]\.fallback must be a string/);
		assert.match(result.stderr, /\[preferences\.language\.memory\]\.summary must be a string/);
		assert.match(result.stderr, /\[preferences\.language\.memory\]\.fallback must be a string/);
		assert.match(result.stderr, /\[preferences\.language\.memory\]\.preserve_code must be a boolean/);
		assert.match(result.stderr, /\[preferences\.language\.memory\]\.preserve_paths must be a boolean/);
		assert.match(result.stderr, /\[preferences\.language\.memory\]\.preserve_error_output must be a boolean/);
		assert.match(result.stderr, /\[preferences\.formatting\]\.indentation must be a string/);
		assert.match(result.stderr, /\[preferences\.formatting\]\.indentation_when_missing must be a string/);
		assert.match(result.stderr, /\[preferences\.code_style\]\.avoid_drive_by_refactors must be a boolean/);
		assert.match(result.stderr, /\[preferences\.git\]\.auto_stage must be a boolean/);
		assert.match(result.stderr, /\[preferences\.git\]\.auto_commit must be a boolean/);
		assert.match(result.stderr, /\[preferences\.git\.commit_message\]\.max_suggestions must be a positive integer/);
		assert.match(result.stderr, /\[preferences\.reporting\.commit_suggestion\]\.enabled must be a boolean/);
		assert.match(result.stderr, /\[preferences\.docs\]\.update_when must be a string array/);
		assert.match(result.stderr, /\[preferences\.logging\]\.include_sensitive_data must be a boolean/);
		assert.match(result.stderr, /\[preferences\.product_i18n\]\.enabled must be a boolean/);
		assert.match(result.stderr, /\[preferences\.product_i18n\]\.source_locale must be a string/);
		assert.match(result.stderr, /\[preferences\.product_i18n\]\.target_locales must be a string array/);
		assert.match(result.stderr, /\[preferences\.product_i18n\]\.translation_policy must be/);
	} finally {
		removeTempProject(projectPath);
	}
});

test('fails unsafe command lifecycle contracts', () => {
	const projectPath = createTempProject();

	try {
		initProject(projectPath);
		const commandsPath = path.join(projectPath, '.mustflow', 'config', 'commands.toml');
		writeFileSync(
			commandsPath,
			[
				'schema_version = "1"',
				'',
				'[defaults]',
				'missing_behavior = "do_not_guess"',
				'allow_inferred_commands = false',
				'require_lifecycle = true',
				'require_timeout_for_oneshot = true',
				'deny_unmanaged_long_running = true',
				'default_cwd = "."',
				'default_timeout_seconds = 600',
				'stdin = "closed"',
				'max_output_bytes = 1048576',
				'on_timeout = "terminate_process_tree"',
				'kill_after_seconds = 5',
				'',
				'[intents.test]',
				'status = "configured"',
				'lifecycle = "oneshot"',
				'run_policy = "agent_allowed"',
				'description = "Run tests."',
				'argv = ["node", "--version"]',
				'cwd = "."',
				'stdin = "closed"',
				'success_exit_codes = [0]',
				'writes = []',
				'network = false',
				'destructive = false',
				'',
				'[intents.dev]',
				'status = "configured"',
				'lifecycle = "server"',
				'run_policy = "agent_allowed"',
				'description = "Run a development server."',
				'argv = ["npm", "run", "dev"]',
				'cwd = "."',
				'timeout_seconds = 30',
				'stdin = "closed"',
				'success_exit_codes = [0]',
				'writes = []',
				'network = false',
				'destructive = false',
				'',
				'[intents.shell_bg]',
				'status = "configured"',
				'lifecycle = "oneshot"',
				'run_policy = "agent_allowed"',
				'description = "Background shell command."',
				'mode = "shell"',
				'cmd = "npm run dev &"',
				'cwd = "."',
				'timeout_seconds = 30',
				'stdin = "closed"',
				'success_exit_codes = [0]',
				'writes = []',
				'network = false',
				'destructive = false',
				'',
			].join('\n'),
		);

		const result = runCli(projectPath, ['check']);

		assert.equal(result.status, 1);
		assert.match(result.stderr, /Oneshot intent test must define timeout_seconds/);
		assert.match(result.stderr, /Long-running intent dev must not use run_policy = "agent_allowed"/);
		assert.match(result.stderr, /Shell intent shell_bg contains a blocked long-running or background pattern/);
	} finally {
		removeTempProject(projectPath);
	}
});
