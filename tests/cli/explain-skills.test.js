import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';
import {
	cloneProjectFixture,
	createTempProject,
	initProjectInProcess,
	removeTempProject,
	runCliInProcess,
} from './helpers/cli-harness.js';

let initializedSkillProject;

before(async () => {
	initializedSkillProject = createTempProject('mustflow-explain-skills-base-');
	await initProjectInProcess(initializedSkillProject);
});

after(() => {
	if (initializedSkillProject) {
		removeTempProject(initializedSkillProject);
	}
});

function createInitializedSkillProject() {
	assert.ok(initializedSkillProject, 'initialized skill fixture is unavailable');
	return cloneProjectFixture(initializedSkillProject, 'mustflow-explain-skills-');
}

test('explains skill route alignment as json', async () => {
	const projectPath = createInitializedSkillProject();

	try {
		const result = await runCliInProcess(projectPath, ['explain', 'skills', '--json']);
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

test('explains skill route alignment as text', async () => {
	const projectPath = createInitializedSkillProject();

	try {
		const result = await runCliInProcess(projectPath, ['explain', 'skills']);

		assert.equal(result.status, 0, result.stderr || result.stdout);
		assert.match(result.stdout, /skill index and skill bodies are aligned/);
		assert.match(result.stdout, /Skill routes/);
		assert.match(result.stdout, /issue_count: 0/);
		assert.match(result.stdout, /Counts as mustflow verification: no/);
	} finally {
		removeTempProject(projectPath);
	}
});

test('explains a single skill route as json', async () => {
	const projectPath = createInitializedSkillProject();

	try {
		const result = await runCliInProcess(projectPath, ['explain', 'skill', 'mustflow.core.code-review', '--json']);
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
		assert.deepEqual(report.decision.selectionEvidence.matchedBy, ['frontmatter.skill_id:mustflow.core.code-review']);
		assert.deepEqual(report.decision.selectionEvidence.requiredInputs, ['Diff and task goal']);
		assert.deepEqual(report.decision.selectionEvidence.missingInputs, []);
		assert.ok(report.decision.selectionEvidence.candidateAdjuncts.includes('diff-risk-review'));
		assert.deepEqual(report.decision.selectionEvidence.unmatchedPaths, []);
		assert.match(report.decision.selectionEvidence.gapNotes.join('\n'), /no task paths/);
	} finally {
		removeTempProject(projectPath);
	}
});

test('explains single skill route selection evidence as text', async () => {
	const projectPath = createInitializedSkillProject();

	try {
		const result = await runCliInProcess(projectPath, ['explain', 'skill', 'code-review']);

		assert.equal(result.status, 0, result.stderr || result.stdout);
		assert.match(result.stdout, /Skill selection evidence/);
		assert.match(result.stdout, /matched_by: skill_name:code-review, frontmatter.name:code-review/);
		assert.match(result.stdout, /required_inputs: Diff and task goal/);
		assert.match(result.stdout, /candidate_adjuncts: .*diff-risk-review/);
		assert.match(result.stdout, /unmatched_paths: none/);
	} finally {
		removeTempProject(projectPath);
	}
});

test('reports an undeclared skill route without inventing a route', async () => {
	const projectPath = createInitializedSkillProject();

	try {
		const result = await runCliInProcess(projectPath, ['explain', 'skill', 'missing-skill', '--json']);
		const report = JSON.parse(result.stdout);

		assert.equal(result.status, 0, result.stderr || result.stdout);
		assert.equal(report.topic, 'skill');
		assert.equal(report.decision.kind, 'skill_route');
		assert.equal(report.decision.route, null);
		assert.match(report.decision.reason, /no matching route/);
		assert.deepEqual(report.decision.selectionEvidence.matchedBy, []);
		assert.deepEqual(report.decision.selectionEvidence.candidateAdjuncts, []);
		assert.match(report.decision.selectionEvidence.missingInputs.join('\n'), /missing-skill/);
	} finally {
		removeTempProject(projectPath);
	}
});

test('fails explain skills when a target argument is provided', async () => {
	const projectPath = createInitializedSkillProject();

	try {
		const result = await runCliInProcess(projectPath, ['explain', 'skills', 'extra']);

		assert.equal(result.status, 1);
		assert.match(result.stderr, /Error: Unexpected argument: extra/);
		assert.match(result.stderr, /Usage:/);
		assert.equal(result.stdout, '');
	} finally {
		removeTempProject(projectPath);
	}
});

test('fails explain skill when the skill id is missing', async () => {
	const projectPath = createInitializedSkillProject();

	try {
		const result = await runCliInProcess(projectPath, ['explain', 'skill']);

		assert.equal(result.status, 1);
		assert.match(result.stderr, /Error: Missing skill id/);
		assert.match(result.stderr, /Usage:/);
		assert.equal(result.stdout, '');
	} finally {
		removeTempProject(projectPath);
	}
});
