import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import {
	existsSync,
	mkdtempSync,
	readdirSync,
	readFileSync,
	rmSync,
	writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

const projectRoot = path.resolve(fileURLToPath(new URL('../..', import.meta.url)));
const cliPath = path.join(projectRoot, 'dist', 'cli', 'index.js');

function createTempProject() {
	return mkdtempSync(path.join(tmpdir(), 'mustflow-init-'));
}

function removeTempProject(projectPath) {
	rmSync(projectPath, { recursive: true, force: true });
}

function runInit(cwd, args = ['--yes'], options = {}) {
	return spawnSync(process.execPath, [cliPath, 'init', ...args], {
		cwd,
		encoding: 'utf8',
		...options,
	});
}

function readText(filePath) {
	return readFileSync(filePath, 'utf8').replace(/\r\n/g, '\n');
}

test('copies the default agent workflow into an empty project', () => {
	const projectPath = createTempProject();

	try {
		const result = runInit(projectPath);

		assert.equal(result.status, 0);
		assert.match(result.stdout, /Created AGENTS\.md/);
		assert.ok(existsSync(path.join(projectPath, 'AGENTS.md')));
		assert.ok(existsSync(path.join(projectPath, '.mustflow', 'config', 'commands.toml')));
		assert.ok(existsSync(path.join(projectPath, '.mustflow', 'config', 'mustflow.toml')));
		assert.ok(existsSync(path.join(projectPath, '.mustflow', 'config', 'manifest.lock.toml')));
		assert.ok(existsSync(path.join(projectPath, '.mustflow', 'config', 'preferences.toml')));
		assert.ok(existsSync(path.join(projectPath, '.mustflow', 'context', 'INDEX.md')));
		assert.ok(existsSync(path.join(projectPath, '.mustflow', 'context', 'PROJECT.md')));
		assert.ok(existsSync(path.join(projectPath, '.mustflow', 'docs', 'agent-workflow.md')));
		assert.ok(existsSync(path.join(projectPath, '.mustflow', 'skills', 'INDEX.md')));
		assert.ok(existsSync(path.join(projectPath, '.mustflow', 'skills', 'code-review', 'SKILL.md')));
		assert.ok(existsSync(path.join(projectPath, '.mustflow', 'skills', 'test-maintenance', 'SKILL.md')));
		assert.ok(existsSync(path.join(projectPath, '.mustflow', 'skills', 'project-context-authoring', 'SKILL.md')));
		assert.ok(existsSync(path.join(projectPath, '.mustflow', 'skills', 'skill-authoring', 'SKILL.md')));
		assert.ok(existsSync(path.join(projectPath, '.mustflow', 'skills', 'web-asset-optimization', 'SKILL.md')));
		assert.equal(existsSync(path.join(projectPath, '.mustflow', 'skills', 'test-authoring', 'SKILL.md')), false);
		assert.ok(existsSync(path.join(projectPath, '.gitignore')));
		assert.equal(existsSync(path.join(projectPath, 'README.md')), false);
		assert.equal(existsSync(path.join(projectPath, 'DESIGN.md')), false);
		assert.equal(existsSync(path.join(projectPath, 'ROADMAP.md')), false);
		assert.equal(existsSync(path.join(projectPath, 'REPO_MAP.md')), false);
		const gitignore = readText(path.join(projectPath, '.gitignore'));
		assert.match(gitignore, /# mustflow:start schema=1/);
		assert.match(gitignore, /\.mustflow\/cache\//);
		assert.match(gitignore, /\.mustflow\/state\//);
		assert.match(gitignore, /\.mustflow\/backups\//);
		assert.doesNotMatch(gitignore, /^repos\//m);
		const preferences = readFileSync(path.join(projectPath, '.mustflow', 'config', 'preferences.toml'), 'utf8');
		assert.match(preferences, /\[project\]/);
		assert.match(preferences, /convention_mode = "bootstrap"/);
		assert.match(preferences, /\[language\.code_comments\]/);
		assert.match(preferences, /\[language\.memory\]/);
		assert.match(preferences, /summary = "agent_response"/);
		assert.match(preferences, /fallback = "en"/);
		assert.match(preferences, /auto_stage = false/);
		assert.match(preferences, /\[git\.commit_message\]/);
		assert.match(preferences, /suggest = "when_changes_made"/);
		assert.match(preferences, /\[reporting\.commit_suggestion\]/);
		assert.match(preferences, /\[testing\.authoring\]/);
		assert.match(preferences, /new_test_policy = "evidence_required"/);
		assert.match(preferences, /prefer_existing_tests = true/);
		const commands = readFileSync(path.join(projectPath, '.mustflow', 'config', 'commands.toml'), 'utf8');
		assert.match(commands, /\[intents\.mustflow_doctor\]/);
		assert.match(commands, /argv = \["mf", "doctor", "--json"\]/);
		assert.match(commands, /\[intents\.mustflow_update_dry_run\]/);
		assert.match(commands, /argv = \["mf", "update", "--dry-run", "--json"\]/);
		assert.match(commands, /\[intents\.mustflow_update_apply\]/);
		assert.match(commands, /argv = \["mf", "update", "--apply", "--json"\]/);
		assert.match(commands, /\[intents\.changes_status\]/);
		assert.match(commands, /argv = \["git", "status", "--short"\]/);
		assert.match(commands, /\[intents\.changes_diff_summary\]/);
		assert.match(commands, /\[intents\.test_related\]/);
		assert.match(commands, /\[intents\.test_audit\]/);
		assert.match(commands, /\[intents\.snapshot_update\]/);
		assert.match(commands, /\[intents\.asset_optimize\]/);
		assert.match(commands, /required_after = \["image_asset_change", "web_asset_change"\]/);
		assert.match(commands, /\[intents\.git_commit\]/);
		assert.match(commands, /status = "manual_only"/);
		const mustflowConfig = readText(path.join(projectPath, '.mustflow', 'config', 'mustflow.toml'));
		assert.match(mustflowConfig, /optional_read_order = \[\n  "\.mustflow\/context\/INDEX\.md",/);
		assert.match(mustflowConfig, /\[context\]/);
		assert.match(mustflowConfig, /root = "\.mustflow\/context"/);
		assert.match(mustflowConfig, /read_policy = "task_relevant_only"/);
		assert.match(mustflowConfig, /authority = "contextual"/);
		assert.match(mustflowConfig, /"ROADMAP\.md"/);
		assert.match(mustflowConfig, /\[testing\]/);
		assert.match(mustflowConfig, /policy = "behavior_contract"/);
		assert.match(mustflowConfig, /stale_test_action = "update_remove_or_report"/);
		assert.match(mustflowConfig, /turn_threshold = 8/);
		assert.match(mustflowConfig, /tool_call_threshold = 16/);
		assert.match(mustflowConfig, /output_bytes_threshold = 100000/);
		assert.match(mustflowConfig, /\[refresh\.levels\.edit\]/);
		assert.match(mustflowConfig, /\[refresh\.levels\.report\]/);
		assert.doesNotMatch(mustflowConfig, /\[compaction\.recent\]/);
		assert.doesNotMatch(mustflowConfig, /\[compaction\.mid\]/);
		assert.doesNotMatch(mustflowConfig, /\[compaction\.long\]/);
		assert.doesNotMatch(mustflowConfig, /\[compaction\.raw_retention\]/);
		assert.match(mustflowConfig, /max_iterations = 6/);
		assert.match(mustflowConfig, /max_wall_clock_minutes = 60/);
		assert.match(mustflowConfig, /max_command_runs = 20/);
		assert.match(mustflowConfig, /max_total_output_mb = 8/);
		assert.match(mustflowConfig, /max_failures_per_intent = 2/);
		assert.match(mustflowConfig, /on_limit = "stop_and_report"/);
		assert.match(mustflowConfig, /\[retention\.run_receipts\]\nstore = "repo_local_ignored"/);
		assert.match(mustflowConfig, /\[retention\.knowledge\]\nenabled = false\nstore = "repo_local_ignored"/);
		assert.match(mustflowConfig, /\[retention\.handoffs\]\nstore = "repo_local_ignored"/);
		assert.doesNotMatch(mustflowConfig, /store = "project"/);
		const lock = readFileSync(path.join(projectPath, '.mustflow', 'config', 'manifest.lock.toml'), 'utf8');
		assert.match(lock, /schema_version = "1"/);
		assert.match(lock, /\[template\]/);
		assert.match(lock, /id = "default"/);
		assert.match(lock, /profile = "minimal"/);
		assert.match(lock, /locale = "en"/);
		assert.match(lock, /\[files\."AGENTS\.md"\]/);
		assert.match(lock, /last_action = "created"/);
		assert.match(lock, /content_hash = "sha256:[a-f0-9]{64}"/);
		assert.doesNotMatch(lock, /\[files\."\.gitignore"\]/);
		const agents = readFileSync(path.join(projectPath, 'AGENTS.md'), 'utf8');
		assert.match(agents, /mf doctor/);
		assert.match(agents, /locale: en/);
		assert.match(agents, /auto_bump = true/);
		assert.match(agents, /require_user_confirmation = false/);
		assert.doesNotMatch(agents, /Do not change version files unless the user explicitly requests/);
	} finally {
		removeTempProject(projectPath);
	}
});

test('installs Korean localized documents when requested', () => {
	const projectPath = createTempProject();

	try {
		const result = runInit(projectPath, ['--yes', '--locale', 'ko']);

		assert.equal(result.status, 0);

		const agents = readFileSync(path.join(projectPath, 'AGENTS.md'), 'utf8');
		const skill = readFileSync(path.join(projectPath, '.mustflow', 'skills', 'code-review', 'SKILL.md'), 'utf8');
		const preferences = readFileSync(path.join(projectPath, '.mustflow', 'config', 'preferences.toml'), 'utf8');
		const lock = readFileSync(path.join(projectPath, '.mustflow', 'config', 'manifest.lock.toml'), 'utf8');

		assert.match(agents, /locale: ko/);
		assert.match(agents, /## 읽는 순서/);
		assert.match(agents, /auto_bump = true/);
		assert.match(agents, /require_user_confirmation = false/);
		assert.doesNotMatch(agents, /명시적으로 요청하지 않았다면 버전 파일을\s+바꾸지 않습니다/);
		assert.match(skill, /## 목적/);
		assert.match(preferences, /docs = "ko"/);
		assert.match(lock, /locale = "ko"/);
		assert.match(lock, /last_action = "customized"/);
	} finally {
		removeTempProject(projectPath);
	}
});

test('applies profile locale agent language and product locale preferences', () => {
	const projectPath = createTempProject();

	try {
		const result = runInit(projectPath, [
			'--yes',
			'--profile',
			'product',
			'--locale',
			'ko',
			'--agent-lang',
			'en',
			'--product-source-locale',
			'en',
			'--product-locale',
			'en-US',
			'--product-locale',
			'ko-KR',
		]);

		assert.equal(result.status, 0);
		assert.match(result.stdout, /Customized \.mustflow\/config\/preferences\.toml/);

		const preferences = readFileSync(path.join(projectPath, '.mustflow', 'config', 'preferences.toml'), 'utf8');
		assert.match(preferences, /profile = "product"/);
		assert.match(preferences, /agent_response = "en"/);
		assert.match(preferences, /docs = "ko"/);
		assert.match(preferences, /\[product_i18n\]/);
		assert.match(preferences, /enabled = true/);
		assert.match(preferences, /source_locale = "en"/);
		assert.match(preferences, /target_locales = \["en-US", "ko-KR"\]/);
		assert.match(preferences, /translation_policy = "update_source_mark_targets_stale"/);

		const lock = readFileSync(path.join(projectPath, '.mustflow', 'config', 'manifest.lock.toml'), 'utf8');
		assert.match(lock, /profile = "product"/);
		assert.match(lock, /locale = "ko"/);
		assert.match(lock, /agent_lang = "en"/);
		assert.match(lock, /\[product_i18n\]/);
		assert.match(lock, /target_locales = \["en-US", "ko-KR"\]/);
		assert.match(lock, /\[files\."\.mustflow\/config\/preferences\.toml"\]/);
		assert.match(lock, /last_action = "customized"/);
	} finally {
		removeTempProject(projectPath);
	}
});

test('rejects unsupported profile and locale selections', () => {
	const projectPath = createTempProject();

	try {
		const badProfile = runInit(projectPath, ['--profile', 'korean-product']);
		assert.equal(badProfile.status, 1);
		assert.match(badProfile.stderr, /Unsupported profile: korean-product/);

		const badLocale = runInit(projectPath, ['--locale', 'ja']);
		assert.equal(badLocale.status, 1);
		assert.match(badLocale.stderr, /Unsupported locale: ja/);
	} finally {
		removeTempProject(projectPath);
	}
});

test('applies safe preference overrides from repeated set options', () => {
	const projectPath = createTempProject();

	try {
		const result = runInit(projectPath, [
			'--yes',
			'--set',
			'git.auto_commit=true',
			'--set',
			'git.auto_push=false',
			'--set=git.commit_message.language=pt-BR',
			'--set=git.commit_message.style=gitmoji',
			'--set',
			'git.commit_message.max_suggestions=4',
			'--set',
			'git.commit_message.include_body=always',
			'--set',
			'git.commit_message.split_when_multiple_concerns=false',
			'--set',
			'reporting.commit_suggestion.enabled=false',
			'--set',
			'release.versioning.suggest_bump=false',
			'--set',
			'release.versioning.auto_bump=true',
			'--set',
			'release.versioning.sync_docs_examples=false',
			'--set',
			'verification.selection.strategy=targeted',
			'--set',
			'verification.selection.skip_low_risk_code_full_test=false',
			'--set',
			'verification.selection.report_skipped=false',
			'--set',
			'testing.authoring.new_test_policy=manual_approval',
			'--set',
			'testing.authoring.prefer_existing_tests=false',
			'--set',
			'testing.authoring.require_new_test_rationale=false',
			'--set',
			'language.memory.summary=docs',
		]);

		assert.equal(result.status, 0);
		assert.match(result.stdout, /Customized \.mustflow\/config\/preferences\.toml/);

		const preferences = readText(path.join(projectPath, '.mustflow', 'config', 'preferences.toml'));

		assert.match(preferences, /\[git\]\n(?:.*\n)*?auto_commit = true/);
		assert.match(preferences, /\[git\]\n(?:.*\n)*?auto_push = false/);
		assert.match(preferences, /\[git\.commit_message\]\n(?:.*\n)*?style = "gitmoji"/);
		assert.match(preferences, /\[git\.commit_message\]\n(?:.*\n)*?language = "pt-BR"/);
		assert.match(preferences, /\[git\.commit_message\]\n(?:.*\n)*?max_suggestions = 4/);
		assert.match(preferences, /\[git\.commit_message\]\n(?:.*\n)*?include_body = "always"/);
		assert.match(preferences, /\[git\.commit_message\]\n(?:.*\n)*?split_when_multiple_concerns = false/);
		assert.match(preferences, /\[reporting\.commit_suggestion\]\n(?:.*\n)*?enabled = false/);
		assert.match(preferences, /\[release\.versioning\]\n(?:.*\n)*?suggest_bump = false/);
		assert.match(preferences, /\[release\.versioning\]\n(?:.*\n)*?auto_bump = true/);
		assert.match(preferences, /\[release\.versioning\]\n(?:.*\n)*?sync_docs_examples = false/);
		assert.match(preferences, /\[verification\.selection\]\n(?:.*\n)*?strategy = "targeted"/);
		assert.match(preferences, /\[verification\.selection\]\n(?:.*\n)*?skip_low_risk_code_full_test = false/);
		assert.match(preferences, /\[verification\.selection\]\n(?:.*\n)*?report_skipped = false/);
		assert.match(preferences, /\[testing\.authoring\]\n(?:.*\n)*?new_test_policy = "manual_approval"/);
		assert.match(preferences, /\[testing\.authoring\]\n(?:.*\n)*?prefer_existing_tests = false/);
		assert.match(preferences, /\[testing\.authoring\]\n(?:.*\n)*?require_new_test_rationale = false/);
		assert.match(preferences, /\[language\.memory\]\n(?:.*\n)*?summary = "docs"/);

		const lock = readFileSync(path.join(projectPath, '.mustflow', 'config', 'manifest.lock.toml'), 'utf8');
		assert.match(lock, /\[files\."\.mustflow\/config\/preferences\.toml"\]/);
		assert.match(lock, /last_action = "customized"/);
	} finally {
		removeTempProject(projectPath);
	}
});

test('rejects unsupported init preference overrides', () => {
	const invalidOverrides = [
		['git.auto_push=true', /Invalid value for git\.auto_push: true/],
		['git.commit_message.style=emoji', /Invalid value for git\.commit_message\.style: emoji/],
		['git.commit_message.max_suggestions=6', /Invalid value for git\.commit_message\.max_suggestions: 6/],
		['git.commit_message.include_body=sometimes', /Invalid value for git\.commit_message\.include_body: sometimes/],
		['release.versioning.auto_bump=maybe', /Invalid value for release\.versioning\.auto_bump: maybe/],
		['verification.selection.strategy=always_full', /Invalid value for verification\.selection\.strategy: always_full/],
		['verification.selection.skip_low_risk_code_full_test=maybe', /Invalid value for verification\.selection\.skip_low_risk_code_full_test: maybe/],
		['verification.selection.report_skipped=maybe', /Invalid value for verification\.selection\.report_skipped: maybe/],
		['testing.authoring.new_test_policy=always', /Invalid value for testing\.authoring\.new_test_policy: always/],
		['testing.authoring.prefer_existing_tests=maybe', /Invalid value for testing\.authoring\.prefer_existing_tests: maybe/],
	];

	for (const [override, expectedError] of invalidOverrides) {
		const projectPath = createTempProject();

		try {
			const result = runInit(projectPath, ['--yes', '--set', override]);

			assert.equal(result.status, 1);
			assert.match(result.stderr, expectedError);
			assert.equal(existsSync(path.join(projectPath, 'AGENTS.md')), false);
		} finally {
			removeTempProject(projectPath);
		}
	}
});

test('rejects unsafe init preference override keys', () => {
	const unsafeOverrides = [
		['logging.include_sensitive_data=true', /Unsupported init preference setting: logging\.include_sensitive_data/],
		['git.commit_message.avoid_sensitive_details=false', /Unsupported init preference setting: git\.commit_message\.avoid_sensitive_details/],
	];

	for (const [override, expectedError] of unsafeOverrides) {
		const projectPath = createTempProject();

		try {
			const result = runInit(projectPath, ['--yes', '--set', override]);

			assert.equal(result.status, 1);
			assert.match(result.stderr, expectedError);
			assert.equal(existsSync(path.join(projectPath, 'AGENTS.md')), false);
		} finally {
			removeTempProject(projectPath);
		}
	}
});

test('git auto commit preference does not create git commits during init', () => {
	const projectPath = createTempProject();

	try {
		const gitInit = spawnSync('git', ['init'], { cwd: projectPath, encoding: 'utf8' });
		assert.equal(gitInit.status, 0);

		const result = runInit(projectPath, ['--yes', '--set', 'git.auto_commit=true']);

		assert.equal(result.status, 0);

		const log = spawnSync('git', ['log', '--oneline'], { cwd: projectPath, encoding: 'utf8' });
		assert.notEqual(log.status, 0);
		assert.match(log.stderr, /does not have any commits yet|your current branch .* does not have any commits yet/i);
	} finally {
		removeTempProject(projectPath);
	}
});

test('rejects conflicting interactive and yes init modes', () => {
	const projectPath = createTempProject();

	try {
		const result = runInit(projectPath, ['--interactive', '--yes']);

		assert.equal(result.status, 1);
		assert.match(result.stderr, /Cannot combine --interactive and --yes/);
		assert.equal(existsSync(path.join(projectPath, 'AGENTS.md')), false);
	} finally {
		removeTempProject(projectPath);
	}
});

test('is idempotent when installed files already match the template', () => {
	const projectPath = createTempProject();

	try {
		const first = runInit(projectPath);
		assert.equal(first.status, 0);

		const result = runInit(projectPath);

		assert.equal(result.status, 0);
		assert.match(result.stdout, /Unchanged AGENTS\.md/);
		assert.match(result.stdout, /Unchanged \.gitignore/);
		assert.match(result.stdout, /Unchanged \.mustflow\/config\/commands\.toml/);
		assert.ok(existsSync(path.join(projectPath, '.mustflow', 'config', 'mustflow.toml')));
	} finally {
		removeTempProject(projectPath);
	}
});

test('aborts without writing files when a conflict is found by default', () => {
	const projectPath = createTempProject();

	try {
		const existingAgents = '# Existing Agent Rules\n';
		writeFileSync(path.join(projectPath, 'AGENTS.md'), existingAgents);

		const result = runInit(projectPath);

		assert.equal(result.status, 1);
		assert.match(result.stderr, /Conflict: AGENTS\.md already exists/);
		assert.match(result.stderr, /No files were written/);
		assert.equal(readFileSync(path.join(projectPath, 'AGENTS.md'), 'utf8'), existingAgents);
		assert.equal(existsSync(path.join(projectPath, '.mustflow', 'config', 'mustflow.toml')), false);
	} finally {
		removeTempProject(projectPath);
	}
});

test('prints an init plan without writing files in dry-run mode', () => {
	const projectPath = createTempProject();

	try {
		const result = runInit(projectPath, ['--dry-run']);

		assert.equal(result.status, 0);
		assert.match(result.stdout, /Would create AGENTS\.md/);
		assert.match(result.stdout, /Would create \.gitignore/);
		assert.match(result.stdout, /No files were written/);
		assert.equal(existsSync(path.join(projectPath, 'AGENTS.md')), false);
		assert.equal(existsSync(path.join(projectPath, '.gitignore')), false);
		assert.equal(existsSync(path.join(projectPath, '.mustflow')), false);
		assert.equal(existsSync(path.join(projectPath, '.mustflow', 'config', 'manifest.lock.toml')), false);
	} finally {
		removeTempProject(projectPath);
	}
});

test('merges a mustflow router block into an existing AGENTS.md', () => {
	const projectPath = createTempProject();

	try {
		const existingAgents = '# Existing Agent Rules\n\nKeep this project rule.\n';
		writeFileSync(path.join(projectPath, 'AGENTS.md'), existingAgents);

		const result = runInit(projectPath, ['--merge', '--yes']);
		const mergedAgents = readFileSync(path.join(projectPath, 'AGENTS.md'), 'utf8');

		assert.equal(result.status, 0);
		assert.match(result.stdout, /Merged AGENTS\.md/);
		assert.match(mergedAgents, /mustflow:start/);
		assert.match(mergedAgents, /\.mustflow\/config\/commands\.toml/);
		assert.match(mergedAgents, /Keep this project rule/);
		assert.ok(existsSync(path.join(projectPath, '.mustflow', 'config', 'commands.toml')));
		const lock = readFileSync(path.join(projectPath, '.mustflow', 'config', 'manifest.lock.toml'), 'utf8');
		assert.match(lock, /\[files\."AGENTS\.md"\]/);
		assert.match(lock, /source = "managed_block"/);
		assert.match(lock, /last_action = "merged"/);
	} finally {
		removeTempProject(projectPath);
	}
});

test('interactive init applies selected locale profile and agent report language', () => {
	const projectPath = createTempProject();

	try {
		const result = runInit(projectPath, ['--interactive'], {
			input: '2\n2\n1\n',
		});

		assert.equal(result.status, 0);
		assert.match(result.stdout, /Which language should mustflow documents use\?/);
		assert.match(result.stdout, /Which project profile should mustflow use\?/);
		assert.match(result.stdout, /Which language should agents use for final reports\?/);

		const agents = readFileSync(path.join(projectPath, 'AGENTS.md'), 'utf8');
		const preferences = readFileSync(path.join(projectPath, '.mustflow', 'config', 'preferences.toml'), 'utf8');
		const lock = readFileSync(path.join(projectPath, '.mustflow', 'config', 'manifest.lock.toml'), 'utf8');

		assert.match(agents, /locale: ko/);
		assert.match(agents, /## 읽는 순서/);
		assert.match(preferences, /profile = "oss"/);
		assert.match(preferences, /docs = "ko"/);
		assert.match(preferences, /agent_response = "ko"/);
		assert.match(lock, /profile = "oss"/);
		assert.match(lock, /locale = "ko"/);
		assert.match(lock, /agent_lang = "ko"/);
	} finally {
		removeTempProject(projectPath);
	}
});

test('interactive init applies selected advanced preferences', () => {
	const projectPath = createTempProject();

	try {
		const result = runInit(projectPath, ['--interactive'], {
			input: '1\n1\n1\ny\ny\ny\n2\nn\n',
		});

		assert.equal(result.status, 0);
		assert.match(result.stdout, /Customize advanced preferences\?/);
		assert.match(result.stdout, /Allow agents to stage files automatically\?/);
		assert.match(result.stdout, /Allow agents to create commits automatically\?/);

		const preferences = readText(path.join(projectPath, '.mustflow', 'config', 'preferences.toml'));

		assert.match(preferences, /\[git\]\n(?:.*\n)*?auto_stage = true/);
		assert.match(preferences, /\[git\]\n(?:.*\n)*?auto_commit = true/);
		assert.match(preferences, /\[git\.commit_message\]\n(?:.*\n)*?language = "en"/);
		assert.match(preferences, /\[reporting\.commit_suggestion\]\n(?:.*\n)*?enabled = false/);
	} finally {
		removeTempProject(projectPath);
	}
});

test('uses defaults without prompts in non-interactive execution', () => {
	const projectPath = createTempProject();

	try {
		const result = runInit(projectPath, []);

		assert.equal(result.status, 0);
		assert.doesNotMatch(result.stdout, /Which language should mustflow documents use\?/);

		const preferences = readFileSync(path.join(projectPath, '.mustflow', 'config', 'preferences.toml'), 'utf8');
		const lock = readFileSync(path.join(projectPath, '.mustflow', 'config', 'manifest.lock.toml'), 'utf8');

		assert.match(preferences, /profile = "minimal"/);
		assert.match(preferences, /docs = "en"/);
		assert.match(preferences, /agent_response = "en"/);
		assert.match(lock, /profile = "minimal"/);
		assert.match(lock, /locale = "en"/);
	} finally {
		removeTempProject(projectPath);
	}
});

test('merges mustflow ignore rules into an existing .gitignore without overwriting user rules', () => {
	const projectPath = createTempProject();

	try {
		const existingGitignore = 'node_modules/\n.env\n';
		writeFileSync(path.join(projectPath, '.gitignore'), existingGitignore);

		const result = runInit(projectPath);
		const mergedGitignore = readText(path.join(projectPath, '.gitignore'));

		assert.equal(result.status, 0);
		assert.match(result.stdout, /Merged \.gitignore/);
		assert.match(mergedGitignore, /^node_modules\//m);
		assert.match(mergedGitignore, /^\.env$/m);
		assert.match(mergedGitignore, /# mustflow:start schema=1/);
		assert.match(mergedGitignore, /\.mustflow\/cache\//);
		assert.match(mergedGitignore, /\.mustflow\/state\//);
		assert.match(mergedGitignore, /\.mustflow\/backups\//);
		assert.doesNotMatch(mergedGitignore, /^repos\//m);

		const lock = readFileSync(path.join(projectPath, '.mustflow', 'config', 'manifest.lock.toml'), 'utf8');
		assert.doesNotMatch(lock, /\[files\."\.gitignore"\]/);
	} finally {
		removeTempProject(projectPath);
	}
});

test('updates only the mustflow ignore block when .gitignore already has one', () => {
	const projectPath = createTempProject();

	try {
		writeFileSync(
			path.join(projectPath, '.gitignore'),
			[
				'node_modules/',
				'',
				'# mustflow:start schema=1',
				'.mustflow/old-cache/',
				'# mustflow:end',
				'',
				'local-only/',
				'',
			].join('\n'),
		);

		const result = runInit(projectPath);
		const mergedGitignore = readText(path.join(projectPath, '.gitignore'));

		assert.equal(result.status, 0);
		assert.match(result.stdout, /Merged \.gitignore/);
		assert.match(mergedGitignore, /^node_modules\//m);
		assert.match(mergedGitignore, /^local-only\//m);
		assert.doesNotMatch(mergedGitignore, /\.mustflow\/old-cache\//);
		assert.match(mergedGitignore, /\.mustflow\/cache\//);
		assert.match(mergedGitignore, /\.mustflow\/state\//);
		assert.match(mergedGitignore, /\.mustflow\/backups\//);
		assert.doesNotMatch(mergedGitignore, /^repos\//m);
		assert.equal((mergedGitignore.match(/# mustflow:start schema=1/g) ?? []).length, 1);
	} finally {
		removeTempProject(projectPath);
	}
});

test('backs up conflicting files before force overwriting them', () => {
	const projectPath = createTempProject();

	try {
		const existingAgents = '# Existing Agent Rules\n';
		writeFileSync(path.join(projectPath, 'AGENTS.md'), existingAgents);

		const result = runInit(projectPath, ['--force', '--yes']);
		const backupRoot = path.join(projectPath, '.mustflow', 'backups');
		const backupDirs = readdirSync(backupRoot);
		const backedUpAgents = readFileSync(path.join(backupRoot, backupDirs[0], 'AGENTS.md'), 'utf8');
		const agents = readFileSync(path.join(projectPath, 'AGENTS.md'), 'utf8');

		assert.equal(result.status, 0);
		assert.match(result.stdout, /Backed up 1 conflicting file/);
		assert.match(result.stdout, /Overwrote AGENTS\.md/);
		assert.equal(backedUpAgents, existingAgents);
		assert.match(agents, /mustflow_doc: agents\.root/);
		const lock = readFileSync(path.join(projectPath, '.mustflow', 'config', 'manifest.lock.toml'), 'utf8');
		assert.match(lock, /\[files\."AGENTS\.md"\]/);
		assert.match(lock, /last_action = "overwritten"/);
	} finally {
		removeTempProject(projectPath);
	}
});
