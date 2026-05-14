import assert from 'node:assert/strict';
import { readFileSync, unlinkSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { test } from 'node:test';
import { createTempProject, initProject, removeTempProject, runCli } from './helpers/cli-harness.js';

function readText(filePath) {
	return readFileSync(filePath, 'utf8').replace(/\r\n/g, '\n');
}

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
