import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

const projectRoot = path.resolve(fileURLToPath(new URL('../..', import.meta.url)));
const cliPath = path.join(projectRoot, 'dist', 'cli', 'index.js');

function createTempProject() {
	return mkdtempSync(path.join(tmpdir(), 'mustflow-explain-'));
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

test('explains managed AGENTS authority as json', () => {
	const projectPath = createTempProject();

	try {
		initProject(projectPath);

		const result = runCli(projectPath, ['explain', 'authority', 'AGENTS.md', '--json']);
		const report = JSON.parse(result.stdout);

		assert.equal(result.status, 0, result.stderr || result.stdout);
		assert.equal(report.schema_version, '1');
		assert.equal(report.command, 'explain');
		assert.equal(report.topic, 'authority');
		assert.equal(report.decision.kind, 'recognized');
		assert.equal(report.decision.inputPath, 'AGENTS.md');
		assert.equal(report.decision.countsAsMustflowVerification, false);
		assert.deepEqual(report.decision.expectation, {
			docId: 'agents.root',
			authority: 'binding',
			lifecycle: 'user-editable',
		});
		assert.equal(report.decision.boundary.role, 'binding repository instruction entry point');
		assert.ok(report.decision.boundary.canDefine.includes('repository-local work rules'));
		assert.ok(report.decision.boundary.cannotDefine.includes('command execution permission outside commands.toml'));
	} finally {
		removeTempProject(projectPath);
	}
});

test('explains managed skill index authority as text', () => {
	const projectPath = createTempProject();

	try {
		initProject(projectPath);

		const result = runCli(projectPath, ['explain', 'authority', '.mustflow/skills/INDEX.md']);

		assert.equal(result.status, 0, result.stderr || result.stdout);
		assert.match(result.stdout, /expected skills\.index with router authority/);
		assert.match(result.stdout, /mustflow_doc: skills\.index/);
		assert.match(result.stdout, /Authority boundary/);
		assert.match(result.stdout, /routing index/);
		assert.match(result.stdout, /Cannot define/);
		assert.match(result.stdout, /procedure steps/);
		assert.match(result.stdout, /Counts as mustflow verification: no/);
	} finally {
		removeTempProject(projectPath);
	}
});

test('explains context index and skill documents as bounded authority lanes', () => {
	const projectPath = createTempProject();

	try {
		initProject(projectPath);

		const contextResult = runCli(projectPath, ['explain', 'authority', '.mustflow/context/INDEX.md', '--json']);
		const contextReport = JSON.parse(contextResult.stdout);

		assert.equal(contextResult.status, 0, contextResult.stderr || contextResult.stdout);
		assert.equal(contextReport.decision.kind, 'recognized');
		assert.deepEqual(contextReport.decision.expectation, {
			docId: 'context.index',
			authority: 'router',
			lifecycle: 'mustflow-owned',
		});
		assert.equal(contextReport.decision.boundary.role, 'routing index');
		assert.ok(contextReport.decision.boundary.canDefine.includes('which context or skill document to read'));
		assert.ok(contextReport.decision.boundary.cannotDefine.includes('procedure steps'));
		assert.ok(contextReport.decision.boundary.cannotDefine.includes('command permission'));

		const skillResult = runCli(projectPath, ['explain', 'authority', '.mustflow/skills/code-review/SKILL.md', '--json']);
		const skillReport = JSON.parse(skillResult.stdout);

		assert.equal(skillResult.status, 0, skillResult.stderr || skillResult.stdout);
		assert.equal(skillReport.decision.kind, 'recognized');
		assert.deepEqual(skillReport.decision.expectation, {
			docId: 'skill.code-review',
			authority: 'procedure',
			lifecycle: 'mustflow-owned',
		});
		assert.equal(skillReport.decision.boundary.role, 'repeatable task procedure');
		assert.ok(skillReport.decision.boundary.canDefine.includes('task trigger'));
		assert.ok(skillReport.decision.boundary.cannotDefine.includes('command execution permission'));
		assert.ok(skillReport.decision.boundary.cannotDefine.includes('repository-wide binding rules'));
	} finally {
		removeTempProject(projectPath);
	}
});

test('reports unrecognized authority paths without granting document authority', () => {
	const projectPath = createTempProject();

	try {
		initProject(projectPath);

		const result = runCli(projectPath, ['explain', 'authority', 'README.md', '--json']);
		const report = JSON.parse(result.stdout);

		assert.equal(result.status, 0, result.stderr || result.stdout);
		assert.equal(report.decision.kind, 'unrecognized');
		assert.equal(report.decision.inputPath, 'README.md');
		assert.equal(report.decision.expectation, null);
		assert.equal(report.decision.boundary.role, 'unclassified by mustflow managed Markdown authority');
		assert.ok(report.decision.boundary.cannotDefine.includes('mustflow document authority'));
		assert.equal(report.decision.countsAsMustflowVerification, false);
	} finally {
		removeTempProject(projectPath);
	}
});

test('explains web asset optimization without guessing missing converters', () => {
	const projectPath = createTempProject();

	try {
		initProject(projectPath);

		const result = runCli(projectPath, ['explain', 'asset-optimization', '--json']);
		const report = JSON.parse(result.stdout);

		assert.equal(result.status, 0, result.stderr || result.stdout);
		assert.equal(report.topic, 'asset-optimization');
		assert.equal(report.decision.kind, 'blocked');
		assert.equal(report.decision.inputCommand, 'asset_optimize');
		assert.equal(report.decision.countsAsMustflowVerification, false);
		assert.equal(report.decision.intent.status, 'unknown');
		assert.ok(report.decision.sourceFiles.includes('.mustflow/skills/web-asset-optimization/SKILL.md'));
		assert.match(report.decision.effectiveAction, /do not guess external converters/);
	} finally {
		removeTempProject(projectPath);
	}
});

test('explains retention policy as json', () => {
	const projectPath = createTempProject();

	try {
		initProject(projectPath);

		const result = runCli(projectPath, ['explain', 'retention', '--json']);
		const report = JSON.parse(result.stdout);

		assert.equal(result.status, 0, result.stderr || result.stdout);
		assert.equal(report.topic, 'retention');
		assert.equal(report.decision.kind, 'retention');
		assert.equal(report.decision.countsAsMustflowVerification, false);
		assert.equal(report.decision.retention.enabled, true);
		assert.equal(report.decision.retention.rawEvents.store, 'none');
		assert.equal(report.decision.retention.runReceipts.store, 'repo_local_ignored');
		assert.equal(report.decision.retention.runReceipts.stdoutTailBytes, 65536);
		assert.equal(report.decision.retention.repoMap.failIfLarger, true);
	} finally {
		removeTempProject(projectPath);
	}
});

test('explains retention policy as text', () => {
	const projectPath = createTempProject();

	try {
		initProject(projectPath);

		const result = runCli(projectPath, ['explain', 'retention']);

		assert.equal(result.status, 0, result.stderr || result.stdout);
		assert.match(result.stdout, /retention policy is enabled/);
		assert.match(result.stdout, /Retention policy/);
		assert.match(result.stdout, /run_receipts\.store: repo_local_ignored/);
		assert.match(result.stdout, /Counts as mustflow verification: no/);
	} finally {
		removeTempProject(projectPath);
	}
});

test('explains skill route alignment as json', () => {
	const projectPath = createTempProject();

	try {
		initProject(projectPath);

		const result = runCli(projectPath, ['explain', 'skills', '--json']);
		const report = JSON.parse(result.stdout);

		assert.equal(result.status, 0, result.stderr || result.stdout);
		assert.equal(report.topic, 'skills');
		assert.equal(report.decision.kind, 'skill_routes');
		assert.equal(report.decision.countsAsMustflowVerification, false);
		assert.equal(report.decision.alignment.status, 'ok');
		assert.equal(report.decision.alignment.issueCount, 0);
		assert.deepEqual(report.decision.alignment.issues, []);
		assert.equal(report.decision.alignment.action, null);
	} finally {
		removeTempProject(projectPath);
	}
});

test('explains skill route alignment as text', () => {
	const projectPath = createTempProject();

	try {
		initProject(projectPath);

		const result = runCli(projectPath, ['explain', 'skills']);

		assert.equal(result.status, 0, result.stderr || result.stdout);
		assert.match(result.stdout, /skill index and skill bodies are aligned/);
		assert.match(result.stdout, /Skill routes/);
		assert.match(result.stdout, /issue_count: 0/);
		assert.match(result.stdout, /Counts as mustflow verification: no/);
	} finally {
		removeTempProject(projectPath);
	}
});

test('explains a single skill route as json', () => {
	const projectPath = createTempProject();

	try {
		initProject(projectPath);

		const result = runCli(projectPath, ['explain', 'skill', 'mustflow.core.code-review', '--json']);
		const report = JSON.parse(result.stdout);

		assert.equal(result.status, 0, result.stderr || result.stdout);
		assert.equal(report.topic, 'skill');
		assert.equal(report.decision.kind, 'skill_route');
		assert.equal(report.decision.inputSkill, 'mustflow.core.code-review');
		assert.equal(report.decision.countsAsMustflowVerification, false);
		assert.equal(report.decision.route.skill, 'code-review');
		assert.equal(report.decision.route.skillPath, '.mustflow/skills/code-review/SKILL.md');
		assert.match(report.decision.route.trigger, /Code changes need review/);
		assert.deepEqual(report.decision.route.verificationIntents, ['test', 'test_related', 'test_audit', 'lint']);
		assert.ok(report.decision.route.declaredCommandIntents.includes('test'));
	} finally {
		removeTempProject(projectPath);
	}
});

test('reports an undeclared skill route without inventing a route', () => {
	const projectPath = createTempProject();

	try {
		initProject(projectPath);

		const result = runCli(projectPath, ['explain', 'skill', 'missing-skill', '--json']);
		const report = JSON.parse(result.stdout);

		assert.equal(result.status, 0, result.stderr || result.stdout);
		assert.equal(report.topic, 'skill');
		assert.equal(report.decision.kind, 'skill_route');
		assert.equal(report.decision.route, null);
		assert.match(report.decision.reason, /no matching route/);
	} finally {
		removeTempProject(projectPath);
	}
});

test('explains public surface classification as json', () => {
	const projectPath = createTempProject();

	try {
		initProject(projectPath);

		const result = runCli(projectPath, ['explain', 'surface', 'README.md', '--json']);
		const report = JSON.parse(result.stdout);

		assert.equal(result.status, 0, result.stderr || result.stdout);
		assert.equal(report.topic, 'surface');
		assert.equal(report.decision.kind, 'classified');
		assert.equal(report.decision.inputPath, 'README.md');
		assert.equal(report.decision.countsAsMustflowVerification, false);
		assert.equal(report.decision.surface.kind, 'readme_page');
		assert.equal(report.decision.surface.category, 'documentation');
		assert.equal(report.decision.surface.isPublicSurface, true);
		assert.deepEqual(report.decision.surface.validationReasons, ['docs_change', 'copy_change']);
		assert.ok(report.decision.surface.affectedContracts.includes('public documentation'));
		assert.equal(report.decision.readModel.status, 'missing');
		assert.equal(report.decision.readModel.indexFresh, false);
		assert.equal(report.decision.readModel.match, null);
	} finally {
		removeTempProject(projectPath);
	}
});

test('explains public surface classification from a fresh local index read model', () => {
	const projectPath = createTempProject();

	try {
		initProject(projectPath);

		const indexResult = runCli(projectPath, ['index', '--json']);
		const result = runCli(projectPath, ['explain', 'surface', 'README.md', '--json']);
		const report = JSON.parse(result.stdout);

		assert.equal(indexResult.status, 0, indexResult.stderr || indexResult.stdout);
		assert.equal(result.status, 0, result.stderr || result.stdout);
		assert.equal(report.topic, 'surface');
		assert.equal(report.decision.surface.kind, 'readme_page');
		assert.equal(report.decision.readModel.status, 'fresh');
		assert.equal(report.decision.readModel.indexFresh, true);
		assert.equal(report.decision.readModel.match.ruleId, 'readme_page');
		assert.equal(report.decision.readModel.match.surface.kind, 'readme_page');
		assert.deepEqual(report.decision.readModel.match.surface.validationReasons, ['docs_change', 'copy_change']);
		assert.equal(report.decision.readModel.match.surface.isPublicSurface, true);
	} finally {
		removeTempProject(projectPath);
	}
});

test('explains installed template surface classification as text', () => {
	const projectPath = createTempProject();

	try {
		initProject(projectPath);

		const result = runCli(projectPath, ['explain', 'surface', 'templates/default/locales/ko/AGENTS.md']);

		assert.equal(result.status, 0, result.stderr || result.stdout);
		assert.match(result.stdout, /templates\/default\/locales\/ko\/AGENTS\.md is classified as installed_template_translation/);
		assert.match(result.stdout, /Public surface/);
		assert.match(result.stdout, /is_public_surface: yes/);
		assert.match(result.stdout, /i18n_change, template_version_change/);
		assert.match(result.stdout, /localized workflow documents/);
		assert.match(result.stdout, /Counts as mustflow verification: no/);
	} finally {
		removeTempProject(projectPath);
	}
});

test('fails explain retention when a target argument is provided', () => {
	const projectPath = createTempProject();

	try {
		initProject(projectPath);

		const result = runCli(projectPath, ['explain', 'retention', 'extra']);

		assert.equal(result.status, 1);
		assert.match(result.stderr, /Error: Unexpected argument: extra/);
		assert.match(result.stdout, /Usage:/);
	} finally {
		removeTempProject(projectPath);
	}
});

test('fails explain asset optimization when a target argument is provided', () => {
	const projectPath = createTempProject();

	try {
		initProject(projectPath);

		const result = runCli(projectPath, ['explain', 'asset-optimization', 'extra']);

		assert.equal(result.status, 1);
		assert.match(result.stderr, /Error: Unexpected argument: extra/);
		assert.match(result.stdout, /Usage:/);
	} finally {
		removeTempProject(projectPath);
	}
});

test('fails explain skills when a target argument is provided', () => {
	const projectPath = createTempProject();

	try {
		initProject(projectPath);

		const result = runCli(projectPath, ['explain', 'skills', 'extra']);

		assert.equal(result.status, 1);
		assert.match(result.stderr, /Error: Unexpected argument: extra/);
		assert.match(result.stdout, /Usage:/);
	} finally {
		removeTempProject(projectPath);
	}
});

test('fails explain skill when the skill id is missing', () => {
	const projectPath = createTempProject();

	try {
		initProject(projectPath);

		const result = runCli(projectPath, ['explain', 'skill']);

		assert.equal(result.status, 1);
		assert.match(result.stderr, /Error: Missing skill id/);
		assert.match(result.stdout, /Usage:/);
	} finally {
		removeTempProject(projectPath);
	}
});
