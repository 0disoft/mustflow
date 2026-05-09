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
		assert.deepEqual(check.issueDetails, []);
	} finally {
		removeTempProject(projectPath);
	}
});

test('strict check fails enabled versioning preferences without a detected version source', () => {
	const projectPath = createTempProject();

	try {
		initProject(projectPath);
		unlinkSync(path.join(projectPath, '.mustflow', 'config', 'manifest.lock.toml'));

		const result = runCli(projectPath, ['check', '--strict', '--json']);
		const check = JSON.parse(result.stdout);

		assert.equal(result.status, 1);
		assert.ok(
			check.issues.some(
				(issue) =>
					issue ===
					'Strict: [release.versioning] is enabled but no version source was detected; add .mustflow/config/versioning.toml or a package/template version source',
			),
		);
		assert.ok(check.issueDetails.some((issue) => issue.severity === 'error' && issue.mode === 'strict'));
	} finally {
		removeTempProject(projectPath);
	}
});

test('strict check accepts a non-package-json version source', () => {
	const projectPath = createTempProject();

	try {
		initProject(projectPath);
		unlinkSync(path.join(projectPath, '.mustflow', 'config', 'manifest.lock.toml'));
		writeFileSync(
			path.join(projectPath, 'pyproject.toml'),
			['[project]', 'name = "example"', 'version = "0.1.0"', ''].join('\n'),
		);

		const result = runCli(projectPath, ['check', '--strict', '--json']);
		const check = JSON.parse(result.stdout);

		assert.equal(result.status, 0);
		assert.equal(check.ok, true);
		assert.deepEqual(check.issues, []);
	} finally {
		removeTempProject(projectPath);
	}
});

test('check fails invalid declared versioning source config', () => {
	const projectPath = createTempProject();

	try {
		initProject(projectPath);
		writeFileSync(
			path.join(projectPath, '.mustflow', 'config', 'versioning.toml'),
			[
				'schema_version = 1',
				'',
				'[[sources]]',
				'path = "../package.json"',
				'kind = "release_note"',
				'authority = "primary"',
				'',
			].join('\n'),
		);

		const result = runCli(projectPath, ['check']);

		assert.equal(result.status, 1);
		assert.match(result.stderr, /\[\.mustflow\/config\/versioning\.toml\]\.schema_version must be a string/);
		assert.match(result.stderr, /\.mustflow\/config\/versioning\.toml sources\[0\]\.path must be a non-empty relative path/);
		assert.match(result.stderr, /\.mustflow\/config\/versioning\.toml sources\[0\]\.kind must be/);
		assert.match(result.stderr, /\.mustflow\/config\/versioning\.toml sources\[0\]\.authority must be/);
	} finally {
		removeTempProject(projectPath);
	}
});

test('strict check fails declared versioning source that points to a missing file', () => {
	const projectPath = createTempProject();

	try {
		initProject(projectPath);
		unlinkSync(path.join(projectPath, '.mustflow', 'config', 'manifest.lock.toml'));
		writeFileSync(
			path.join(projectPath, '.mustflow', 'config', 'versioning.toml'),
			[
				'schema_version = "1"',
				'',
				'[[sources]]',
				'path = "pyproject.toml"',
				'kind = "package_manifest"',
				'authority = "source"',
				'',
			].join('\n'),
		);

		const result = runCli(projectPath, ['check', '--strict', '--json']);
		const check = JSON.parse(result.stdout);

		assert.equal(result.status, 1);
		assert.ok(
			check.issues.some(
				(issue) =>
					issue === 'Strict: .mustflow/config/versioning.toml source "pyproject.toml" does not exist',
			),
		);
		assert.ok(
			!check.issues.some(
				(issue) =>
					issue ===
					'Strict: [release.versioning] is enabled but no version source was detected; add .mustflow/config/versioning.toml or a package/template version source',
			),
		);
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
		assert.match(result.stderr, /Strict: REPO_MAP\.md frontmatter mustflow_doc must be "repo-map"/);
		assert.match(result.stderr, /Strict: REPO_MAP\.md contains volatile generated metadata/);
		assert.match(result.stderr, /Strict: REPO_MAP\.md contains remote URL or branch metadata/);
	} finally {
		removeTempProject(projectPath);
	}
});

test('strict check fails stale REPO_MAP source fingerprint', () => {
	const projectPath = createTempProject();

	try {
		initProject(projectPath);
		writeFileSync(
			path.join(projectPath, 'REPO_MAP.md'),
			[
				'---',
				'mustflow_doc: repo-map',
				'lifecycle: generated',
				'generated_by: mustflow',
				'relative_root: "."',
				'source_policy: anchors_only',
				'privacy_mode: minimal',
				'anchor_count: 1',
				'source_fingerprint: "sha256:0000000000000000000000000000000000000000000000000000000000000000"',
				'---',
				'',
				'# REPO_MAP.md',
				'',
				'This file is an agent navigation map for the current mustflow root. It is not a full file listing.',
				'',
			].join('\n'),
		);

		const result = runCli(projectPath, ['check', '--strict', '--json']);
		const check = JSON.parse(result.stdout);

		assert.equal(result.status, 1);
		assert.ok(
			check.issues.some(
				(issue) => issue === 'Strict: REPO_MAP.md source_fingerprint is stale; regenerate with mf map --write',
			),
		);
	} finally {
		removeTempProject(projectPath);
	}
});

test('strict check fails procedure sections in router index documents', () => {
	const projectPath = createTempProject();

	try {
		initProject(projectPath);
		const skillsIndexPath = path.join(projectPath, '.mustflow', 'skills', 'INDEX.md');
		const contextIndexPath = path.join(projectPath, '.mustflow', 'context', 'INDEX.md');
		writeFileSync(skillsIndexPath, `${readText(skillsIndexPath)}\n## Procedure\n\nRun this workflow.\n`);
		writeFileSync(contextIndexPath, `${readText(contextIndexPath)}\n## 검증\n\n절차 본문.\n`);
		unlinkSync(path.join(projectPath, '.mustflow', 'config', 'manifest.lock.toml'));

		const result = runCli(projectPath, ['check', '--strict', '--json']);
		const check = JSON.parse(result.stdout);

		assert.equal(result.status, 1);
		assert.ok(
			check.issues.some(
				(issue) =>
					issue ===
					'Strict: .mustflow/skills/INDEX.md must stay a routing index and must not embed skill procedure sections',
			),
		);
		assert.ok(
			check.issues.some(
				(issue) =>
					issue ===
					'Strict: .mustflow/context/INDEX.md must stay a routing index and must not embed skill procedure sections',
			),
		);
	} finally {
		removeTempProject(projectPath);
	}
});

test('strict check fails unknown skill command intent metadata references', () => {
	const projectPath = createTempProject();

	try {
		initProject(projectPath);
		const skillPath = path.join(projectPath, '.mustflow', 'skills', 'code-review', 'SKILL.md');
		const skill = readText(skillPath).replace('    - lint', '    - lint\n    - deploy_prod');
		writeFileSync(skillPath, skill);
		unlinkSync(path.join(projectPath, '.mustflow', 'config', 'manifest.lock.toml'));

		const result = runCli(projectPath, ['check', '--strict', '--json']);
		const check = JSON.parse(result.stdout);

		assert.equal(result.status, 1);
		assert.ok(
			check.issues.some(
				(issue) =>
					issue ===
					'Strict: .mustflow/skills/code-review/SKILL.md metadata.command_intents references unknown command intent "deploy_prod"',
			),
		);
		assertHasIssueDetail(
			check,
			'mustflow.skill.unknown_command_intent',
			'Strict: .mustflow/skills/code-review/SKILL.md metadata.command_intents references unknown command intent "deploy_prod"',
		);
	} finally {
		removeTempProject(projectPath);
	}
});

test('strict check fails skill index route drift', () => {
	const projectPath = createTempProject();

	try {
		initProject(projectPath);
		const skillsIndexPath = path.join(projectPath, '.mustflow', 'skills', 'INDEX.md');
		const skillsIndex = readText(skillsIndexPath)
			.replace(/^\| Code changes need review before report \|.*\n/mu, '')
			.replace(
				/(\| Documentation changes affect public or workflow docs \| `\.mustflow\/skills\/docs-update\/SKILL\.md` \| Changed behavior or field \| Relevant docs only \| stale public docs \| `docs_validate`, `mustflow_check` \| Doc changes and skipped checks \|)/u,
				'$1\n| Broken route | `.mustflow/skills/missing/SKILL.md` | Any request | None | high | `deploy_prod` | Failure |\n| Docs drift | `.mustflow/skills/docs-update/SKILL.md` | Changed behavior or field | Relevant docs only | stale public docs | `docs_validate`, `lint` | Doc changes and skipped checks |',
			);
		writeFileSync(skillsIndexPath, skillsIndex);
		unlinkSync(path.join(projectPath, '.mustflow', 'config', 'manifest.lock.toml'));

		const result = runCli(projectPath, ['check', '--strict', '--json']);
		const check = JSON.parse(result.stdout);

		assert.equal(result.status, 1);
		assert.ok(
			check.issues.some(
				(issue) => issue === 'Strict: .mustflow/skills/code-review/SKILL.md is not listed in .mustflow/skills/INDEX.md',
			),
		);
		assert.ok(
			check.issues.some(
				(issue) =>
					issue ===
					'Strict: .mustflow/skills/INDEX.md route .mustflow/skills/missing/SKILL.md points to a missing skill document',
			),
		);
		assert.ok(
			check.issues.some(
				(issue) =>
					issue ===
					'Strict: .mustflow/skills/INDEX.md route .mustflow/skills/docs-update/SKILL.md references command intent "lint" not declared by the skill frontmatter',
			),
		);
		assertHasIssueDetail(
			check,
			'mustflow.skill.index_route_unknown_command_intent',
			'Strict: .mustflow/skills/INDEX.md route .mustflow/skills/docs-update/SKILL.md references command intent "lint" not declared by the skill frontmatter',
		);
	} finally {
		removeTempProject(projectPath);
	}
});

test('strict check fails skill index route table shape drift', () => {
	const projectPath = createTempProject();

	try {
		initProject(projectPath);
		const skillsIndexPath = path.join(projectPath, '.mustflow', 'skills', 'INDEX.md');
		const skillsIndex = readText(skillsIndexPath).replace(
			/^\| Code changes need review before report \|.*\n/mu,
			'| Review code changes | `.mustflow/skills/code-review/SKILL.md` | `test`, `lint` |\n',
		);
		writeFileSync(skillsIndexPath, skillsIndex);
		unlinkSync(path.join(projectPath, '.mustflow', 'config', 'manifest.lock.toml'));

		const result = runCli(projectPath, ['check', '--strict', '--json']);
		const check = JSON.parse(result.stdout);

		assert.equal(result.status, 1);
		assert.ok(
			check.issues.some(
				(issue) =>
					issue ===
					'Strict: .mustflow/skills/INDEX.md route table rows must use columns: Trigger, Skill Document, Required Input, Edit Scope, Risk, Verification Intents, Expected Output',
			),
		);
	} finally {
		removeTempProject(projectPath);
	}
});

test('strict check fails non-procedure skill metadata', () => {
	const projectPath = createTempProject();

	try {
		initProject(projectPath);
		const skillPath = path.join(projectPath, '.mustflow', 'skills', 'code-review', 'SKILL.md');
		const skill = readText(skillPath).replace('  mustflow_kind: procedure', '  mustflow_kind: contract');
		writeFileSync(skillPath, skill);
		unlinkSync(path.join(projectPath, '.mustflow', 'config', 'manifest.lock.toml'));

		const result = runCli(projectPath, ['check', '--strict', '--json']);
		const check = JSON.parse(result.stdout);

		assert.equal(result.status, 1);
		assert.ok(
			check.issues.some(
				(issue) =>
					issue === 'Strict: .mustflow/skills/code-review/SKILL.md metadata.mustflow_kind must be "procedure"',
			),
		);
		assertHasIssueDetail(
			check,
			'mustflow.skill.procedure_only',
			'Strict: .mustflow/skills/code-review/SKILL.md metadata.mustflow_kind must be "procedure"',
		);
	} finally {
		removeTempProject(projectPath);
	}
});

test('strict check fails unsupported skill schema metadata', () => {
	const projectPath = createTempProject();

	try {
		initProject(projectPath);
		const skillPath = path.join(projectPath, '.mustflow', 'skills', 'code-review', 'SKILL.md');
		const skill = readText(skillPath).replace('  mustflow_schema: "1"', '  mustflow_schema: "2"');
		writeFileSync(skillPath, skill);
		unlinkSync(path.join(projectPath, '.mustflow', 'config', 'manifest.lock.toml'));

		const result = runCli(projectPath, ['check', '--strict', '--json']);
		const check = JSON.parse(result.stdout);

		assert.equal(result.status, 1);
		assert.ok(
			check.issues.some(
				(issue) =>
					issue === 'Strict: .mustflow/skills/code-review/SKILL.md metadata.mustflow_schema must be "1"',
			),
		);
	} finally {
		removeTempProject(projectPath);
	}
});

test('strict check fails skill name identity drift', () => {
	const projectPath = createTempProject();

	try {
		initProject(projectPath);
		const skillPath = path.join(projectPath, '.mustflow', 'skills', 'code-review', 'SKILL.md');
		const skill = readText(skillPath).replace('name: code-review', 'name: diff-review');
		writeFileSync(skillPath, skill);
		unlinkSync(path.join(projectPath, '.mustflow', 'config', 'manifest.lock.toml'));

		const result = runCli(projectPath, ['check', '--strict', '--json']);
		const check = JSON.parse(result.stdout);

		assert.equal(result.status, 1);
		assert.ok(
			check.issues.some(
				(issue) =>
					issue ===
					'Strict: .mustflow/skills/code-review/SKILL.md frontmatter name must match skill folder "code-review"',
			),
		);
	} finally {
		removeTempProject(projectPath);
	}
});

test('strict check fails skill package identity drift', () => {
	const projectPath = createTempProject();

	try {
		initProject(projectPath);
		const skillPath = path.join(projectPath, '.mustflow', 'skills', 'code-review', 'SKILL.md');
		const skill = readText(skillPath)
			.replace('  pack_id: mustflow.core\n', '')
			.replace('  skill_id: mustflow.core.code-review\n', '');
		writeFileSync(skillPath, skill);
		unlinkSync(path.join(projectPath, '.mustflow', 'config', 'manifest.lock.toml'));

		const result = runCli(projectPath, ['check', '--strict', '--json']);
		const check = JSON.parse(result.stdout);

		assert.equal(result.status, 1);
		assert.ok(
			check.issues.some(
				(issue) =>
					issue ===
					'Strict: .mustflow/skills/code-review/SKILL.md metadata.pack_id must be a dotted package identifier',
			),
		);
		assert.ok(
			check.issues.some(
				(issue) =>
					issue === 'Strict: .mustflow/skills/code-review/SKILL.md metadata.skill_id is required',
			),
		);
	} finally {
		removeTempProject(projectPath);
	}
});

test('strict check fails skill command permission claims', () => {
	const projectPath = createTempProject();

	try {
		initProject(projectPath);
		const skillPath = path.join(projectPath, '.mustflow', 'skills', 'code-review', 'SKILL.md');
		const skill = `${readText(skillPath)}\nThis skill authorizes agents to run deployment commands.\n`;
		writeFileSync(skillPath, skill);
		unlinkSync(path.join(projectPath, '.mustflow', 'config', 'manifest.lock.toml'));

		const result = runCli(projectPath, ['check', '--strict', '--json']);
		const check = JSON.parse(result.stdout);

		assert.equal(result.status, 1);
		assert.ok(
			check.issues.some(
				(issue) =>
					issue ===
					'Strict: .mustflow/skills/code-review/SKILL.md claims command execution permission; keep permissions in .mustflow/config/commands.toml',
			),
		);
		assertHasIssueDetail(
			check,
			'mustflow.skill.command_permission_claim',
			'Strict: .mustflow/skills/code-review/SKILL.md claims command execution permission; keep permissions in .mustflow/config/commands.toml',
		);
	} finally {
		removeTempProject(projectPath);
	}
});

test('strict check fails managed markdown document identity drift', () => {
	const projectPath = createTempProject();

	try {
		initProject(projectPath);
		const workflowPath = path.join(projectPath, '.mustflow', 'docs', 'agent-workflow.md');
		const skillPath = path.join(projectPath, '.mustflow', 'skills', 'code-review', 'SKILL.md');
		writeFileSync(workflowPath, readText(workflowPath).replace('mustflow_doc: docs.agent-workflow', 'mustflow_doc: docs.workflow'));
		writeFileSync(skillPath, readText(skillPath).replace('mustflow_doc: skill.code-review\n', ''));
		unlinkSync(path.join(projectPath, '.mustflow', 'config', 'manifest.lock.toml'));

		const result = runCli(projectPath, ['check', '--strict', '--json']);
		const check = JSON.parse(result.stdout);

		assert.equal(result.status, 1);
		assert.ok(
			check.issues.some(
				(issue) =>
					issue === 'Strict: docs.agent-workflow (.mustflow/docs/agent-workflow.md) frontmatter mustflow_doc must be "docs.agent-workflow"',
			),
		);
		assert.ok(
			check.issues.some(
				(issue) =>
					issue === 'Strict: skill.code-review (.mustflow/skills/code-review/SKILL.md) frontmatter mustflow_doc must be "skill.code-review"',
			),
		);
	} finally {
		removeTempProject(projectPath);
	}
});

test('strict check fails managed markdown metadata drift', () => {
	const projectPath = createTempProject();

	try {
		initProject(projectPath);
		const agentsPath = path.join(projectPath, 'AGENTS.md');
		const skillsIndexPath = path.join(projectPath, '.mustflow', 'skills', 'INDEX.md');
		const projectContextPath = path.join(projectPath, '.mustflow', 'context', 'PROJECT.md');
		writeFileSync(agentsPath, readText(agentsPath).replace('canonical: true', 'canonical: maybe'));
		writeFileSync(
			skillsIndexPath,
			readText(skillsIndexPath)
				.replace('locale: en\n', '')
				.replace('lifecycle: mustflow-owned', 'lifecycle: user-editable'),
		);
		writeFileSync(
			projectContextPath,
			readText(projectContextPath)
				.replace('revision: 1', 'revision: latest')
				.replace('authority: contextual', 'authority: binding'),
		);
		unlinkSync(path.join(projectPath, '.mustflow', 'config', 'manifest.lock.toml'));

		const result = runCli(projectPath, ['check', '--strict', '--json']);
		const check = JSON.parse(result.stdout);

		assert.equal(result.status, 1);
		assert.ok(
			check.issues.some((issue) => issue === 'Strict: agents.root (AGENTS.md) frontmatter canonical must be true or false'),
		);
		assert.ok(
			check.issues.some((issue) => issue === 'Strict: skills.index (.mustflow/skills/INDEX.md) frontmatter locale is required'),
		);
		assert.ok(
			check.issues.some(
				(issue) => issue === 'Strict: context.project (.mustflow/context/PROJECT.md) frontmatter revision must be a positive integer',
			),
		);
		assert.ok(
			check.issues.some(
				(issue) => issue === 'Strict: context.project (.mustflow/context/PROJECT.md) frontmatter authority must be "contextual"',
			),
		);
		assert.ok(
			check.issues.some(
				(issue) => issue === 'Strict: skills.index (.mustflow/skills/INDEX.md) frontmatter lifecycle must be "mustflow-owned"',
			),
		);
	} finally {
		removeTempProject(projectPath);
	}
});

test('strict check fails context authority drift', () => {
	const projectPath = createTempProject();

	try {
		initProject(projectPath);
		const projectContextPath = path.join(projectPath, '.mustflow', 'context', 'PROJECT.md');
		writeFileSync(
			projectContextPath,
			`${readText(projectContextPath)}\n## Command Policy\n\nAgents must run only approved commands here.\n\n## Protected Paths\n\nDo not edit files outside \`src/\`.\n`,
		);
		unlinkSync(path.join(projectPath, '.mustflow', 'config', 'manifest.lock.toml'));

		const result = runCli(projectPath, ['check', '--strict', '--json']);
		const check = JSON.parse(result.stdout);

		assert.equal(result.status, 1);
		assert.ok(
			check.issues.some(
				(issue) =>
					issue ===
					'Strict: .mustflow/context/PROJECT.md declares command policy or file-edit prohibitions; keep execution rules in AGENTS.md or .mustflow/config/commands.toml',
			),
		);
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
		writeFileSync(skillPath, skill.replace(/<!-- mustflow-section: verification -->\r?\n/u, ''));

		const result = runCli(projectPath, ['check']);

		assert.equal(result.status, 1);
		assert.match(result.stderr, /Missing required skill section ids/);
		assert.match(result.stderr, /verification/);
		assert.match(result.stderr, /code-review\/SKILL\.md/);
	} finally {
		removeTempProject(projectPath);
	}
});

test('fails when a skill omits an extended contract section', () => {
	const projectPath = createTempProject();

	try {
		initProject(projectPath);
		const skillPath = path.join(projectPath, '.mustflow', 'skills', 'code-review', 'SKILL.md');
		const skill = readFileSync(skillPath, 'utf8');
		writeFileSync(skillPath, skill.replace(/<!-- mustflow-section: preconditions -->\r?\n/u, ''));

		const result = runCli(projectPath, ['check']);

		assert.equal(result.status, 1);
		assert.match(result.stderr, /Missing required skill section ids/);
		assert.match(result.stderr, /preconditions/);
		assert.match(result.stderr, /code-review\/SKILL\.md/);
	} finally {
		removeTempProject(projectPath);
	}
});

test('accepts localized skill headings when stable section ids remain', () => {
	const projectPath = createTempProject();

	try {
		initProject(projectPath);
		const skillPath = path.join(projectPath, '.mustflow', 'skills', 'code-review', 'SKILL.md');
		const skill = readFileSync(skillPath, 'utf8');
		writeFileSync(skillPath, skill.replace('## Verification', '## Checks'));
		unlinkSync(path.join(projectPath, '.mustflow', 'config', 'manifest.lock.toml'));

		const result = runCli(projectPath, ['check']);

		assert.equal(result.status, 0);
		assert.match(result.stdout, /mustflow check passed/);
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
			.replace('turn_threshold = 8', 'turn_threshold = 0')
			.replace('tool_call_threshold = 16', 'tool_call_threshold = -1')
			.replace('output_bytes_threshold = 100000', 'output_bytes_threshold = "large"')
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

test('fails when commit message style is unsupported', () => {
	const projectPath = createTempProject();

	try {
		initProject(projectPath);
		const preferencesPath = path.join(projectPath, '.mustflow', 'config', 'preferences.toml');
		const preferences = readText(preferencesPath).replace('style = "conventional"', 'style = "emoji"');
		writeFileSync(preferencesPath, preferences);
		unlinkSync(path.join(projectPath, '.mustflow', 'config', 'manifest.lock.toml'));

		const result = runCli(projectPath, ['check']);

		assert.equal(result.status, 1);
		assert.match(
			result.stderr,
			/\[preferences\.git\.commit_message\]\.style must be "conventional" or "descriptive" or "gitmoji"/,
		);
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

test('check json includes stable command-boundary issue ids', () => {
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
			].join('\n'),
		);

		const result = runCli(projectPath, ['check', '--json']);
		const check = JSON.parse(result.stdout);

		assert.equal(result.status, 1);
		assertHasIssueDetail(
			check,
			'mustflow.command_contract.oneshot_missing_timeout',
			'Oneshot intent test must define timeout_seconds',
		);
	} finally {
		removeTempProject(projectPath);
	}
});
