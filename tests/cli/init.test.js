import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import {
	cpSync,
	existsSync,
	mkdirSync,
	mkdtempSync,
	readdirSync,
	readFileSync,
	rmSync,
	symlinkSync,
	writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

import { runCliInProcess } from './helpers/cli-harness.js';

const projectRoot = path.resolve(fileURLToPath(new URL('../..', import.meta.url)));
const cliPath = path.join(projectRoot, 'dist', 'cli', 'index.js');

function createTempProject() {
	return mkdtempSync(path.join(tmpdir(), 'mustflow-init-'));
}

function removeTempProject(projectPath) {
	rmSync(projectPath, { recursive: true, force: true });
}

function runInitSpawn(cwd, args = ['--yes'], options = {}) {
	return spawnSync(process.execPath, [cliPath, 'init', ...args], {
		cwd,
		encoding: 'utf8',
		...options,
	});
}

async function runInit(cwd, args = ['--yes'], options = {}) {
	if (options.input !== undefined) {
		return runInitSpawn(cwd, args, options);
	}

	return runCliInProcess(cwd, ['init', ...args], {
		env: envOverrides(options.env),
	});
}

function envOverrides(env) {
	if (!env) {
		return undefined;
	}

	return Object.fromEntries(Object.entries(env).filter(([key, value]) => process.env[key] !== value));
}

function readText(filePath) {
	return readFileSync(filePath, 'utf8').replace(/\r\n/g, '\n');
}

function addTemplateCreate(templatePath, relativePath, content) {
	const manifestPath = path.join(templatePath, 'manifest.toml');

	writeFileSync(
		manifestPath,
		readFileSync(manifestPath, 'utf8').replace(
			'  ".mustflow/docs/agent-workflow.md",',
			`  ".mustflow/docs/agent-workflow.md",\n  "${relativePath}",`,
		),
	);

	const sourcePath = path.join(templatePath, 'common', ...relativePath.split('/'));

	mkdirSync(path.dirname(sourcePath), { recursive: true });
	writeFileSync(sourcePath, content);
}

function trySymlink(target, linkPath, type) {
	try {
		symlinkSync(target, linkPath, type);
		return true;
	} catch (error) {
		if (error && typeof error === 'object' && 'code' in error && ['EPERM', 'ENOTSUP'].includes(error.code)) {
			return false;
		}

		throw error;
	}
}

test('refuses template creates outside the mustflow install surface during init', async () => {
	const projectPath = createTempProject();
	const templatePath = mkdtempSync(path.join(tmpdir(), 'mustflow-template-'));

	try {
		cpSync(path.join(projectRoot, 'templates', 'default'), templatePath, { recursive: true });
		addTemplateCreate(
			templatePath,
			'src/anchored.ts',
			'// mf:anchor app.generated\nexport const generated = true;\n',
		);

		const result = await runInit(projectPath, ['--yes'], {
			env: { ...process.env, MUSTFLOW_DEV_TEMPLATE_ROOT: templatePath, MUSTFLOW_ALLOW_DEV_TEMPLATE_ROOT: '1' },
		});

		assert.equal(result.status, 1);
		assert.match(result.stderr, /outside the mustflow-managed install surface/);
		assert.equal(existsSync(path.join(projectPath, 'src', 'anchored.ts')), false);
		assert.equal(existsSync(path.join(projectPath, '.mustflow', 'config', 'manifest.lock.toml')), false);
	} finally {
		removeTempProject(projectPath);
		rmSync(templatePath, { recursive: true, force: true });
	}
});

test('refuses init from a multi-repository workspace root', async () => {
	const projectPath = createTempProject();

	try {
		mkdirSync(path.join(projectPath, 'projects', 'products', 'app', '.git'), { recursive: true });
		mkdirSync(path.join(projectPath, 'projects', 'experiments', 'tool', '.git'), { recursive: true });

		const result = await runInit(projectPath, ['--yes']);

		assert.equal(result.status, 1);
		assert.match(result.stderr, /multi-repository workspace/u);
		assert.match(result.stderr, /mf workspace scan --json/u);
		assert.equal(existsSync(path.join(projectPath, 'AGENTS.md')), false);
		assert.equal(existsSync(path.join(projectPath, '.mustflow')), false);
	} finally {
		removeTempProject(projectPath);
	}
});

test('ignores development template root overrides without explicit opt-in', async () => {
	const projectPath = createTempProject();
	const templatePath = mkdtempSync(path.join(tmpdir(), 'mustflow-template-'));

	try {
		cpSync(path.join(projectRoot, 'templates', 'default'), templatePath, { recursive: true });
		addTemplateCreate(
			templatePath,
			'src/anchored.ts',
			'// mf:anchor app.generated\nexport const generated = true;\n',
		);

		const result = await runInit(projectPath, ['--yes'], {
			env: { ...process.env, MUSTFLOW_DEV_TEMPLATE_ROOT: templatePath },
		});

		assert.equal(result.status, 0, result.stderr || result.stdout);
		assert.ok(existsSync(path.join(projectPath, '.mustflow', 'config', 'manifest.lock.toml')));
		assert.equal(existsSync(path.join(projectPath, 'src', 'anchored.ts')), false);
	} finally {
		removeTempProject(projectPath);
		rmSync(templatePath, { recursive: true, force: true });
	}
});

test('installs Korean workflow documents with canonical English skills when requested', async () => {
	const projectPath = createTempProject();

	try {
		const result = await runInit(projectPath, ['--yes', '--locale', 'ko']);

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
		assert.match(skill, /locale: en/);
		assert.match(skill, /canonical: true/);
		assert.match(skill, /## Purpose/);
		assert.match(preferences, /docs = "ko"/);
		assert.match(lock, /locale = "ko"/);
		assert.match(lock, /last_action = "customized"/);
	} finally {
		removeTempProject(projectPath);
	}
});

test('applies profile locale agent language and product locale preferences', async () => {
	const projectPath = createTempProject();

	try {
		const result = await runInit(projectPath, [
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
		const skillsIndex = readText(path.join(projectPath, '.mustflow', 'skills', 'INDEX.md'));
		assert.match(preferences, /profile = "product"/);
		assert.match(preferences, /agent_response = "en"/);
		assert.match(preferences, /docs = "ko"/);
		assert.match(preferences, /\[product_i18n\]/);
		assert.match(preferences, /enabled = true/);
		assert.match(preferences, /source_locale = "en"/);
		assert.match(preferences, /target_locales = \["en-US", "ko-KR"\]/);
		assert.match(preferences, /translation_policy = "update_source_mark_targets_stale"/);
		assert.ok(existsSync(path.join(projectPath, '.mustflow', 'skills', 'llm-service-ux-review', 'SKILL.md')));
		assert.ok(existsSync(path.join(projectPath, '.mustflow', 'skills', 'backend-reliability-change', 'SKILL.md')));
		assert.ok(existsSync(path.join(projectPath, '.mustflow', 'skills', 'support-surface-advisor', 'SKILL.md')));
		assert.ok(existsSync(path.join(projectPath, '.mustflow', 'skills', 'frontend-render-stability', 'SKILL.md')));
		assert.ok(existsSync(path.join(projectPath, '.mustflow', 'skills', 'search-ad-content-authoring', 'SKILL.md')));
		assert.ok(existsSync(path.join(projectPath, '.mustflow', 'skills', 'service-boundary-architecture', 'SKILL.md')));
		assert.ok(existsSync(path.join(projectPath, '.mustflow', 'skills', 'ui-quality-gate', 'SKILL.md')));
		assert.ok(existsSync(path.join(projectPath, '.mustflow', 'skills', 'visual-review-artifact', 'SKILL.md')));
		assert.ok(existsSync(path.join(projectPath, '.mustflow', 'skills', 'visual-review-artifact', 'assets', 'review-template.html')));
		assert.ok(existsSync(path.join(projectPath, '.mustflow', 'skills', 'web-asset-optimization', 'SKILL.md')));
		assert.equal(existsSync(path.join(projectPath, '.mustflow', 'skills', 'multi-agent-work-coordination', 'SKILL.md')), false);
		assert.match(skillsIndex, /\.mustflow\/skills\/llm-service-ux-review\/SKILL\.md/);
		assert.match(skillsIndex, /\.mustflow\/skills\/backend-reliability-change\/SKILL\.md/);
		assert.match(skillsIndex, /\.mustflow\/skills\/support-surface-advisor\/SKILL\.md/);
		assert.match(skillsIndex, /\.mustflow\/skills\/frontend-render-stability\/SKILL\.md/);
		assert.match(skillsIndex, /\.mustflow\/skills\/search-ad-content-authoring\/SKILL\.md/);
		assert.match(skillsIndex, /\.mustflow\/skills\/service-boundary-architecture\/SKILL\.md/);
		assert.match(skillsIndex, /\.mustflow\/skills\/ui-quality-gate\/SKILL\.md/);
		assert.match(skillsIndex, /\.mustflow\/skills\/visual-review-artifact\/SKILL\.md/);
		assert.match(skillsIndex, /\| UI and Assets \|/);
		assert.match(skillsIndex, /### UI and Assets/);
		assert.doesNotMatch(skillsIndex, /\.mustflow\/skills\/multi-agent-work-coordination\/SKILL\.md/);

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

test('rejects unsupported profile and locale selections', async () => {
	const projectPath = createTempProject();

	try {
		const badProfile = await runInit(projectPath, ['--profile', 'korean-product']);
		assert.equal(badProfile.status, 1);
		assert.match(badProfile.stderr, /Unsupported profile: korean-product/);

		const badLocale = await runInit(projectPath, ['--locale', 'ja']);
		assert.equal(badLocale.status, 1);
		assert.match(badLocale.stderr, /Unsupported locale: ja/);
	} finally {
		removeTempProject(projectPath);
	}
});

test('applies safe preference overrides from repeated set options', async () => {
	const projectPath = createTempProject();

	try {
		const result = await runInit(projectPath, [
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

test('rejects unsupported init preference overrides', async () => {
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
			const result = await runInit(projectPath, ['--yes', '--set', override]);

			assert.equal(result.status, 1);
			assert.match(result.stderr, expectedError);
			assert.equal(existsSync(path.join(projectPath, 'AGENTS.md')), false);
		} finally {
			removeTempProject(projectPath);
		}
	}
});

test('rejects unsafe init preference override keys', async () => {
	const unsafeOverrides = [
		['logging.include_sensitive_data=true', /Unsupported init preference setting: logging\.include_sensitive_data/],
		['git.commit_message.avoid_sensitive_details=false', /Unsupported init preference setting: git\.commit_message\.avoid_sensitive_details/],
	];

	for (const [override, expectedError] of unsafeOverrides) {
		const projectPath = createTempProject();

		try {
			const result = await runInit(projectPath, ['--yes', '--set', override]);

			assert.equal(result.status, 1);
			assert.match(result.stderr, expectedError);
			assert.equal(existsSync(path.join(projectPath, 'AGENTS.md')), false);
		} finally {
			removeTempProject(projectPath);
		}
	}
});

test('git auto commit preference does not create git commits during init', async () => {
	const projectPath = createTempProject();

	try {
		const gitInit = spawnSync('git', ['init'], { cwd: projectPath, encoding: 'utf8' });
		assert.equal(gitInit.status, 0);

		const result = await runInit(projectPath, ['--yes', '--set', 'git.auto_commit=true']);

		assert.equal(result.status, 0);

		const log = spawnSync('git', ['log', '--oneline'], { cwd: projectPath, encoding: 'utf8' });
		assert.notEqual(log.status, 0);
		assert.match(log.stderr, /does not have any commits yet|your current branch .* does not have any commits yet/i);
	} finally {
		removeTempProject(projectPath);
	}
});

test('rejects conflicting interactive and yes init modes', async () => {
	const projectPath = createTempProject();

	try {
		const result = await runInit(projectPath, ['--interactive', '--yes']);

		assert.equal(result.status, 1);
		assert.match(result.stderr, /Cannot combine --interactive and --yes/);
		assert.equal(existsSync(path.join(projectPath, 'AGENTS.md')), false);
	} finally {
		removeTempProject(projectPath);
	}
});

test('rejects invalid init option shapes before writing files', async () => {
	const invalidArgs = [
		[['--dry-run=true'], /Unexpected value for --dry-run/],
		[['--profile'], /Missing value for --profile/],
		[['--profile=   '], /Missing value for --profile/],
		[['extra'], /Unknown option: extra/],
	];

	for (const [args, expectedError] of invalidArgs) {
		const projectPath = createTempProject();

		try {
			const result = await runInit(projectPath, args);

			assert.equal(result.status, 1);
			assert.match(result.stderr, expectedError);
			assert.equal(existsSync(path.join(projectPath, 'AGENTS.md')), false);
		} finally {
			removeTempProject(projectPath);
		}
	}
});

test('init help detection uses shared option token rules', async () => {
	const projectPath = createTempProject();

	try {
		const result = await runInit(projectPath, ['--help=true']);

		assert.equal(result.status, 0);
		assert.match(result.stdout, /Usage: mf init \[options\]/);
		assert.equal(result.stderr, '');
		assert.equal(existsSync(path.join(projectPath, 'AGENTS.md')), false);
	} finally {
		removeTempProject(projectPath);
	}
});

test('is idempotent when installed files already match the template', async () => {
	const projectPath = createTempProject();

	try {
		const first = await runInit(projectPath);
		assert.equal(first.status, 0);

		const result = await runInit(projectPath);

		assert.equal(result.status, 0);
		assert.match(result.stdout, /Unchanged AGENTS\.md/);
		assert.match(result.stdout, /Unchanged \.gitignore/);
		assert.match(result.stdout, /Unchanged \.mustflow\/config\/commands\.toml/);
		assert.ok(existsSync(path.join(projectPath, '.mustflow', 'config', 'mustflow.toml')));
	} finally {
		removeTempProject(projectPath);
	}
});

test('aborts without writing files when a conflict is found by default', async () => {
	const projectPath = createTempProject();

	try {
		const existingAgents = '# Existing Agent Rules\n';
		writeFileSync(path.join(projectPath, 'AGENTS.md'), existingAgents);

		const result = await runInit(projectPath);

		assert.equal(result.status, 1);
		assert.match(result.stderr, /Conflict: AGENTS\.md already exists/);
		assert.match(result.stderr, /No files were written/);
		assert.equal(readFileSync(path.join(projectPath, 'AGENTS.md'), 'utf8'), existingAgents);
		assert.equal(existsSync(path.join(projectPath, '.mustflow', 'config', 'mustflow.toml')), false);
	} finally {
		removeTempProject(projectPath);
	}
});

test('prints an init plan without writing files in dry-run mode', async () => {
	const projectPath = createTempProject();

	try {
		const result = await runInit(projectPath, ['--dry-run']);

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

test('merges a mustflow router block into an existing AGENTS.md', async () => {
	const projectPath = createTempProject();

	try {
		const existingAgents = '# Existing Agent Rules\n\nKeep this project rule.\n';
		writeFileSync(path.join(projectPath, 'AGENTS.md'), existingAgents);

		const result = await runInit(projectPath, ['--merge', '--yes']);
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

test('interactive init applies selected locale profile and agent report language', async () => {
	const projectPath = createTempProject();

	try {
		const result = await runInit(projectPath, ['--interactive'], {
			input: '2\n3\n1\n',
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
		assert.ok(existsSync(path.join(projectPath, '.mustflow', 'skills', 'external-skill-intake', 'SKILL.md')));
	} finally {
		removeTempProject(projectPath);
	}
});

test('interactive init applies selected advanced preferences', async () => {
	const projectPath = createTempProject();

	try {
		const result = await runInit(projectPath, ['--interactive'], {
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

test('interactive init rejects oversized piped prompt input before writing files', async () => {
	const projectPath = createTempProject();

	try {
		const result = await runInit(projectPath, ['--interactive'], {
			input: 'x'.repeat(16 * 1024 + 1),
		});

		assert.equal(result.status, 1);
		assert.match(result.stderr, /stdin input is too large/);
		assert.equal(existsSync(path.join(projectPath, '.mustflow')), false);
	} finally {
		removeTempProject(projectPath);
	}
});

test('interactive init rejects too many piped prompt responses before writing files', async () => {
	const projectPath = createTempProject();

	try {
		const result = await runInit(projectPath, ['--interactive'], {
			input: Array.from({ length: 65 }, () => '1').join('\n'),
		});

		assert.equal(result.status, 1);
		assert.match(result.stderr, /too many responses/);
		assert.equal(existsSync(path.join(projectPath, '.mustflow')), false);
	} finally {
		removeTempProject(projectPath);
	}
});

test('uses defaults without prompts in non-interactive execution', async () => {
	const projectPath = createTempProject();

	try {
		const result = await runInit(projectPath, []);

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

test('rejects .gitignore symlinks that resolve outside the project', async (t) => {
	const projectPath = createTempProject();
	const outsideRoot = mkdtempSync(path.join(tmpdir(), 'mustflow-outside-'));
	const outsidePath = path.join(outsideRoot, 'victim.txt');
	const outsideContent = 'USER_SETTING=keep\n';

	try {
		writeFileSync(outsidePath, outsideContent);
		if (!trySymlink(outsidePath, path.join(projectPath, '.gitignore'), 'file')) {
			t.skip('symlinks are unavailable in this environment');
			return;
		}

		const result = await runInit(projectPath);

		assert.equal(result.status, 1);
		assert.match(`${result.stdout}${result.stderr}`, /symlinks/);
		assert.equal(readFileSync(outsidePath, 'utf8'), outsideContent);
		assert.equal(existsSync(path.join(projectPath, '.mustflow')), false);
	} finally {
		removeTempProject(projectPath);
		rmSync(outsideRoot, { recursive: true, force: true });
	}
});

test('rejects dangling .gitignore symlinks without creating the outside target', async (t) => {
	const projectPath = createTempProject();
	const outsideRoot = mkdtempSync(path.join(tmpdir(), 'mustflow-missing-outside-'));
	const outsidePath = path.join(outsideRoot, 'victim.txt');

	try {
		if (!trySymlink(outsidePath, path.join(projectPath, '.gitignore'), 'file')) {
			t.skip('symlinks are unavailable in this environment');
			return;
		}

		const result = await runInit(projectPath);

		assert.equal(result.status, 1);
		assert.match(`${result.stdout}${result.stderr}`, /symlinks/);
		assert.equal(existsSync(outsidePath), false);
		assert.equal(existsSync(path.join(projectPath, '.mustflow')), false);
	} finally {
		removeTempProject(projectPath);
		rmSync(outsideRoot, { recursive: true, force: true });
	}
});

test('merges mustflow ignore rules into an existing .gitignore without overwriting user rules', async () => {
	const projectPath = createTempProject();

	try {
		const existingGitignore = 'node_modules/\n.env\n';
		writeFileSync(path.join(projectPath, '.gitignore'), existingGitignore);

		const result = await runInit(projectPath);
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

test('updates only the mustflow ignore block when .gitignore already has one', async () => {
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

		const result = await runInit(projectPath);
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

test('backs up conflicting files before force overwriting them', async () => {
	const projectPath = createTempProject();

	try {
		const existingAgents = '# Existing Agent Rules\n';
		writeFileSync(path.join(projectPath, 'AGENTS.md'), existingAgents);

		const result = await runInit(projectPath, ['--force', '--yes']);
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
