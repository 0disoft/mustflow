import assert from 'node:assert/strict';
import { readFileSync, unlinkSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { test } from 'node:test';
import { createTempProject, initProject, removeTempProject, runCli } from './helpers/cli-harness.js';

function readText(filePath) {
	return readFileSync(filePath, 'utf8').replace(/\r\n/g, '\n');
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

function appendConfiguredTestSelectionIntents(projectPath) {
	const commandsPath = path.join(projectPath, '.mustflow', 'config', 'commands.toml');
	writeFileSync(
		commandsPath,
		`${readText(commandsPath)}
[intents.project_related_tests]
status = "configured"
lifecycle = "oneshot"
run_policy = "agent_allowed"
description = "Run project-declared related tests."
argv = ["node", "-e", "console.log('related')"]
cwd = "."
timeout_seconds = 10
stdin = "closed"
success_exit_codes = [0]
writes = []

[intents.project_fast_tests]
status = "configured"
lifecycle = "oneshot"
run_policy = "agent_allowed"
description = "Run project-declared fast fallback tests."
argv = ["node", "-e", "console.log('fast')"]
cwd = "."
timeout_seconds = 10
stdin = "closed"
success_exit_codes = [0]
writes = []
`,
	);
}

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

test('fails when prompt cache configuration fields are invalid', () => {
	const projectPath = createTempProject();

	try {
		initProject(projectPath);
		const configPath = path.join(projectPath, '.mustflow', 'config', 'mustflow.toml');
		const config = readText(configPath)
			.replace('[prompt_cache]\nenabled = true', '[prompt_cache]\nenabled = "yes"')
			.replace('strategy = "stable_prefix"', 'strategy = "random_order"')
			.replace('stable_prefix_policy = "hash_verified"', 'stable_prefix_policy = "trust_previous_prompt"')
			.replace('prefer_references_when_unchanged = true', 'prefer_references_when_unchanged = "yes"')
			.replace('exclude_volatile_state_from_prefix = true', 'exclude_volatile_state_from_prefix = "yes"')
			.replace('include_content_hashes = true', 'include_content_hashes = "yes"')
			.replace('max_stable_prefix_kb = 48', 'max_stable_prefix_kb = 0')
			.replace('max_task_context_kb = 48', 'max_task_context_kb = "large"')
			.replace('max_volatile_suffix_kb = 24', 'max_volatile_suffix_kb = -1')
			.replace('[prompt_cache.layers.stable]\ntarget_kb = 32\nread = [', '[prompt_cache.layers.stable]\ntarget_kb = "32"\nread = [\n  "../AGENTS.md",')
			.replace(
				/\[prompt_cache\.layers\.task\]\nread_policy = "task_relevant_only"\nsources = \[\n(?:  "[^"]+",\n)+\]/u,
				'[prompt_cache.layers.task]\nread_policy = "read_all"\nsources = "all"',
			)
			.replace('never_place_before_stable_prefix = true', 'never_place_before_stable_prefix = "yes"');
		writeFileSync(configPath, config);

		const result = runCli(projectPath, ['check']);

		assert.equal(result.status, 1);
		assert.match(result.stderr, /\[prompt_cache\]\.enabled must be a boolean/);
		assert.match(result.stderr, /\[prompt_cache\]\.strategy must be "stable_prefix"/);
		assert.match(result.stderr, /\[prompt_cache\]\.stable_prefix_policy must be "hash_verified"/);
		assert.match(result.stderr, /\[prompt_cache\]\.prefer_references_when_unchanged must be a boolean/);
		assert.match(result.stderr, /\[prompt_cache\]\.exclude_volatile_state_from_prefix must be a boolean/);
		assert.match(result.stderr, /\[prompt_cache\]\.include_content_hashes must be a boolean/);
		assert.match(result.stderr, /\[prompt_cache\]\.max_stable_prefix_kb must be a positive integer/);
		assert.match(result.stderr, /\[prompt_cache\]\.max_task_context_kb must be a positive integer/);
		assert.match(result.stderr, /\[prompt_cache\]\.max_volatile_suffix_kb must be a positive integer/);
		assert.match(result.stderr, /\[prompt_cache\.layers\.stable\]\.read entries must be non-empty relative paths/);
		assert.match(result.stderr, /\[prompt_cache\.layers\.stable\]\.target_kb must be a positive integer/);
		assert.match(result.stderr, /\[prompt_cache\.layers\.task\]\.read_policy must be "task_relevant_only"/);
		assert.match(result.stderr, /\[prompt_cache\.layers\.task\]\.sources must be a string array/);
		assert.match(result.stderr, /\[prompt_cache\.layers\.volatile\]\.never_place_before_stable_prefix must be a boolean/);
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
			.replace('default_method = "hash_check"', 'default_method = "always_reread"')
			.replace('reread_when_hash_changed = true', 'reread_when_hash_changed = "yes"')
			.replace('reuse_cached_prefix_when_unchanged = true', 'reuse_cached_prefix_when_unchanged = "yes"')
			.replace('"before_command_run",', '"before_every_message",')
			.replace('turn_threshold = 8', 'turn_threshold = 0')
			.replace('tool_call_threshold = 16', 'tool_call_threshold = -1')
			.replace('output_bytes_threshold = 100000', 'output_bytes_threshold = "large"')
			.replace('state_store = "cache"', 'state_store = "project"')
			.replace('[refresh.levels.light]\nmethod = "hash_check"\nread = [', '[refresh.levels.light]\nmethod = "hash_check"\nread = [\n  "../AGENTS.md",');
		writeFileSync(configPath, config);

		const result = runCli(projectPath, ['check']);

		assert.equal(result.status, 1);
		assert.match(result.stderr, /\[refresh\]\.enabled must be a boolean/);
		assert.match(result.stderr, /\[refresh\]\.mode must be "checkpoint"/);
		assert.match(result.stderr, /\[refresh\]\.default_method must be "hash_check" or "reread_if_changed"/);
		assert.match(result.stderr, /\[refresh\]\.reread_when_hash_changed must be a boolean/);
		assert.match(result.stderr, /\[refresh\]\.reuse_cached_prefix_when_unchanged must be a boolean/);
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

test('strict check fails when prompt cache policy would put volatile state in the stable prefix', () => {
	const projectPath = createTempProject();

	try {
		initProject(projectPath);
		const configPath = path.join(projectPath, '.mustflow', 'config', 'mustflow.toml');
		const config = readText(configPath)
			.replace('exclude_volatile_state_from_prefix = true', 'exclude_volatile_state_from_prefix = false')
			.replace(
				'[prompt_cache.layers.stable]\ntarget_kb = 32\nread = [',
				'[prompt_cache.layers.stable]\ntarget_kb = 32\nread = [\n  ".mustflow/state/runs/latest.json",',
			)
			.replace('default_method = "hash_check"', 'default_method = "reread_if_changed"');
		writeFileSync(configPath, config);

		const result = runCli(projectPath, ['check', '--strict', '--json']);
		const check = JSON.parse(result.stdout);

		assert.equal(result.status, 1);
		assertHasIssueDetail(
			check,
			'mustflow.prompt_cache.volatile_in_stable',
			'Strict: [prompt_cache.layers.stable].read must not include volatile path ".mustflow/state/runs/latest.json"',
		);
		assertHasIssueDetail(
			check,
			'mustflow.refresh.hash_method_required',
			'Strict: [refresh].default_method should be "hash_check" for cache-friendly refresh',
		);
		assert.ok(
			check.issues.includes('Strict: [prompt_cache].exclude_volatile_state_from_prefix should be true'),
		);
	} finally {
		removeTempProject(projectPath);
	}
});

test('strict check fails when rendered stable prompt cache prefix exceeds the hard budget', () => {
	const projectPath = createTempProject();

	try {
		initProject(projectPath);
		const configPath = path.join(projectPath, '.mustflow', 'config', 'mustflow.toml');
		const config = readText(configPath).replace('max_stable_prefix_kb = 48', 'max_stable_prefix_kb = 1');
		writeFileSync(configPath, config);

		const result = runCli(projectPath, ['check', '--strict', '--json']);
		const check = JSON.parse(result.stdout);

		assert.equal(result.status, 1);
		assertHasIssueDetail(check, 'mustflow.prompt_cache.stable_prefix_over_budget');
		assert.ok(
			check.issues.some((issue) =>
				/^Strict: stable prefix exceeds \[prompt_cache\]\.max_stable_prefix_kb: \d+ rendered bytes > 1024 budget bytes$/u.test(issue),
			),
		);
	} finally {
		removeTempProject(projectPath);
	}
});

test('strict check fails when stable prompt cache reads leaf skill surfaces', () => {
	const projectPath = createTempProject();

	try {
		initProject(projectPath);
		const configPath = path.join(projectPath, '.mustflow', 'config', 'mustflow.toml');
		const config = readText(configPath).replace(
			'[prompt_cache.layers.stable]\ntarget_kb = 32\nread = [',
			'[prompt_cache.layers.stable]\ntarget_kb = 32\nread = [\n  ".mustflow/skills/INDEX.md",',
		);
		writeFileSync(configPath, config);

		const result = runCli(projectPath, ['check', '--strict', '--json']);
		const check = JSON.parse(result.stdout);

		assert.equal(result.status, 1);
		assertHasIssueDetail(
			check,
			'mustflow.prompt_cache.leaf_skill_in_stable',
			'Strict: [prompt_cache.layers.stable].read must not include leaf skill or expanded route surface ".mustflow/skills/INDEX.md"',
		);
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
				/\[harness\]\nmode = "single_session"\nfresh_context_preferred = true\nfresh_context_mode = "hash_check_before_reread"/u,
				'[harness]\nmode = "agent_runtime"\nfresh_context_preferred = "yes"\nfresh_context_mode = "always_reread"',
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
				/\[budget\]\nenabled = true\nmax_iterations = 6\nmax_wall_clock_minutes = 60\nmax_command_runs = 20\nmax_total_output_mb = 8\nmax_failures_per_intent = 2\non_limit = "stop_and_report"/u,
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
				/\[retention\.handoffs\]\nstore = "repo_local_ignored"\nmax_file_kb = 64\nmax_total_mb = 5\nrequire_source_refs = true/u,
				'[retention.handoffs]\nstore = "session"\nmax_file_kb = 0\nmax_total_mb = 5\nrequire_source_refs = "yes"',
			);
		writeFileSync(configPath, config);

		const result = runCli(projectPath, ['check']);

		assert.equal(result.status, 1);
		assert.match(result.stderr, /\[harness\]\.mode must be "single_session" or "long_running_optional"/);
		assert.match(result.stderr, /\[harness\]\.fresh_context_preferred must be a boolean/);
		assert.match(result.stderr, /\[harness\]\.fresh_context_mode must be "hash_check_before_reread" or "reread"/);
		assert.match(result.stderr, /\[harness\.phases\]\.enabled contains unsupported phase "spawn_workers"/);
		assert.match(result.stderr, /\[budget\]\.enabled must be a boolean/);
		assert.match(result.stderr, /\[budget\]\.max_iterations must be a positive integer/);
		assert.match(result.stderr, /\[budget\]\.on_limit must be "stop_and_handoff" or "stop_and_report"/);
		assert.match(result.stderr, /\[approval\]\.required_for contains unsupported approval gate "self_destruct"/);
		assert.match(result.stderr, /\[approval\]\.on_required must be "stop_and_request_approval"/);
		assert.match(result.stderr, /\[isolation\]\.preferred must be "none" or "git_worktree" or "sandbox"/);
		assert.match(result.stderr, /\[isolation\]\.required_for_long_running must be a boolean/);
		assert.match(result.stderr, /\[retention\.handoffs\]\.store must be "none" or "cache" or "repo_local_ignored"/);
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
			.replace(
				'[compaction.rules]',
				[
					'[compaction.recent]',
					'keep_turns = 0',
					'max_total_bytes = "large"',
					'store_raw = "yes"',
					'',
					'[compaction.mid]',
					'trigger_turns = false',
					'target_items = "many"',
					'target_max_words_per_item = 0',
					'include_categories = ["decisions", "dreams"]',
					'',
					'[compaction.long]',
					'promote_after_mid_items = 0',
					'target_items = 0',
					'max_items = -1',
					'on_limit = "append_forever"',
					'',
					'[compaction.raw_retention]',
					'max_age_days = 0',
					'max_total_mb = "huge"',
					'on_limit = "keep_forever"',
					'',
					'[compaction.rules]',
				].join('\n'),
			)
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
				'[release.versioning]',
				'impact_check = "yes"',
				'suggest_bump = "yes"',
				'auto_bump = "no"',
				'require_user_confirmation = "yes"',
				'sync_template_version = "yes"',
				'sync_docs_examples = "yes"',
				'sync_tests = "yes"',
				'',
				'[verification.selection]',
				'strategy = "always_full"',
				'prefer_related_tests = "yes"',
				'skip_docs_only_full_test = "yes"',
				'skip_low_risk_code_full_test = "yes"',
				'skip_translation_only_full_test = "yes"',
				'skip_copy_only_full_test = "yes"',
				'report_skipped = "yes"',
				'',
				'[testing.authoring]',
				'new_test_policy = "always"',
				'prefer_existing_tests = "yes"',
				'require_new_test_rationale = "yes"',
				'',
				'[refactoring.hotspots]',
				'large_file_candidate_kb = 0',
				'history_days = 0',
				'primary_candidate_limit = 0',
				'structure_candidate_limit = 0',
				'full_file_candidate_limit = 0',
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
		assert.match(result.stderr, /\[preferences\.release\.versioning\]\.impact_check must be a boolean/);
		assert.match(result.stderr, /\[preferences\.release\.versioning\]\.suggest_bump must be a boolean/);
		assert.match(result.stderr, /\[preferences\.release\.versioning\]\.auto_bump must be a boolean/);
		assert.match(result.stderr, /\[preferences\.release\.versioning\]\.require_user_confirmation must be a boolean/);
		assert.match(result.stderr, /\[preferences\.release\.versioning\]\.sync_template_version must be a boolean/);
		assert.match(result.stderr, /\[preferences\.release\.versioning\]\.sync_docs_examples must be a boolean/);
		assert.match(result.stderr, /\[preferences\.release\.versioning\]\.sync_tests must be a boolean/);
		assert.match(result.stderr, /\[preferences\.verification\.selection\]\.strategy must be "risk_based"/);
		assert.match(result.stderr, /\[preferences\.verification\.selection\]\.prefer_related_tests must be a boolean/);
		assert.match(result.stderr, /\[preferences\.verification\.selection\]\.skip_docs_only_full_test must be a boolean/);
		assert.match(result.stderr, /\[preferences\.verification\.selection\]\.skip_low_risk_code_full_test must be a boolean/);
		assert.match(result.stderr, /\[preferences\.verification\.selection\]\.skip_translation_only_full_test must be a boolean/);
		assert.match(result.stderr, /\[preferences\.verification\.selection\]\.skip_copy_only_full_test must be a boolean/);
		assert.match(result.stderr, /\[preferences\.verification\.selection\]\.report_skipped must be a boolean/);
		assert.match(result.stderr, /\[preferences\.testing\.authoring\]\.new_test_policy must be "evidence_required"/);
		assert.match(result.stderr, /\[preferences\.testing\.authoring\]\.prefer_existing_tests must be a boolean/);
		assert.match(result.stderr, /\[preferences\.testing\.authoring\]\.require_new_test_rationale must be a boolean/);
		assert.match(result.stderr, /\[preferences\.refactoring\.hotspots\]\.large_file_candidate_kb must be a positive integer/);
		assert.match(result.stderr, /\[preferences\.refactoring\.hotspots\]\.history_days must be a positive integer/);
		assert.match(result.stderr, /\[preferences\.refactoring\.hotspots\]\.primary_candidate_limit must be a positive integer/);
		assert.match(result.stderr, /\[preferences\.refactoring\.hotspots\]\.structure_candidate_limit must be a positive integer/);
		assert.match(result.stderr, /\[preferences\.refactoring\.hotspots\]\.full_file_candidate_limit must be a positive integer/);
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

test('validates project-declared test selection manifest intent references', () => {
	const projectPath = createTempProject();

	try {
		initProject(projectPath);
		appendConfiguredTestSelectionIntents(projectPath);
		unlinkSync(path.join(projectPath, '.mustflow', 'config', 'manifest.lock.toml'));
		writeFileSync(
			path.join(projectPath, 'package.json'),
			`${JSON.stringify({ name: 'example', version: '1.2.3' }, null, 2)}\n`,
		);
		writeFileSync(
			path.join(projectPath, '.mustflow', 'config', 'test-selection.toml'),
			`
schema_version = "1"

[[rules]]
id = "source-related"
risk = "medium"
reason = "Source changes use the project-declared related-test command."
match = { paths = ["src/**"], surfaces = ["source"] }
select = { intent = "project_related_tests", fallback_intent = "project_fast_tests", test_targets = ["src"] }
`,
		);

		const result = runCli(projectPath, ['check', '--strict', '--json']);
		const check = JSON.parse(result.stdout);

		assert.equal(result.status, 0, result.stderr || result.stdout);
		assert.equal(check.ok, true);
	} finally {
		removeTempProject(projectPath);
	}
});

test('rejects test selection targets that look like command options', () => {
	const projectPath = createTempProject();

	try {
		initProject(projectPath);
		appendConfiguredTestSelectionIntents(projectPath);
		writeFileSync(
			path.join(projectPath, '.mustflow', 'config', 'test-selection.toml'),
			`
schema_version = "1"

[[rules]]
id = "source-related"
risk = "medium"
reason = "Source changes use the project-declared related-test command."
match = { paths = ["src/**"], surfaces = ["source"] }
select = { intent = "project_related_tests", fallback_intent = "project_fast_tests", test_targets = ["--config", "evil.config.js"] }
`,
		);

		const result = runCli(projectPath, ['check', '--strict', '--json']);
		const check = JSON.parse(result.stdout);

		assert.equal(result.status, 1);
		assert.ok(
			check.issues.includes(
				".mustflow/config/test-selection.toml rules[0].select.test_targets entries must be non-empty relative paths that do not start with '-'",
			),
		);
	} finally {
		removeTempProject(projectPath);
	}
});

test('rejects test selection manifests that guess commands or reference unavailable intents', () => {
	const projectPath = createTempProject();

	try {
		initProject(projectPath);
		writeFileSync(
			path.join(projectPath, '.mustflow', 'config', 'test-selection.toml'),
			`
schema_version = "1"
run_policy = "agent_allowed"

[[rules]]
id = "source-related"
risk = "medium"
reason = "This tries to select undeclared tests."
match = { paths = ["src/**"], surfaces = ["source"] }
select = { intent = "missing_related", fallback_intent = "test_fast", cmd = "npm test" }
`,
		);

		const result = runCli(projectPath, ['check', '--strict', '--json']);
		const check = JSON.parse(result.stdout);

		assert.equal(result.status, 1);
		assertHasIssueDetail(
			check,
			'mustflow.test_selection.command_authority_field',
			'Strict: .mustflow/config/test-selection.toml root.run_policy cannot define command authority; use .mustflow/config/commands.toml',
		);
		assertHasIssueDetail(
			check,
			'mustflow.test_selection.command_authority_field',
			'Strict: .mustflow/config/test-selection.toml rules[0].select.cmd cannot define command authority; use .mustflow/config/commands.toml',
		);
		assertHasIssueDetail(
			check,
			'mustflow.test_selection.unknown_command_intent',
			'Strict: .mustflow/config/test-selection.toml rules[0].select.intent references unknown command intent "missing_related"',
		);
	} finally {
		removeTempProject(projectPath);
	}
});
