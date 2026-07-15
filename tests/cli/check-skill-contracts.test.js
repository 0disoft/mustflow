import assert from 'node:assert/strict';
import { mkdirSync, readFileSync, symlinkSync, unlinkSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { after, before, test } from 'node:test';
import {
	cloneProjectFixture,
	createTempProject,
	initProjectInProcess,
	projectRoot,
	removeTempProject,
	runCliInProcess,
} from './helpers/cli-harness.js';

let initializedSkillProject;

before(async () => {
	initializedSkillProject = createTempProject('mustflow-skill-base-');
	await initProjectInProcess(initializedSkillProject);
});

after(() => {
	if (initializedSkillProject) {
		removeTempProject(initializedSkillProject);
	}
});

function createInitializedSkillProject() {
	assert.ok(initializedSkillProject, 'initialized skill fixture is unavailable');
	return cloneProjectFixture(initializedSkillProject, 'mustflow-skill-check-');
}

function readText(filePath) {
	return readFileSync(filePath, 'utf8').replace(/\r\n/g, '\n');
}

function writeRouteShadowSkill(projectPath, skillName) {
	const sourceSkillPath = path.join(projectPath, '.mustflow', 'skills', 'docs-update', 'SKILL.md');
	const targetDir = path.join(projectPath, '.mustflow', 'skills', skillName);
	const sourceSkill = readText(sourceSkillPath)
		.replace('mustflow_doc: skill.docs-update', `mustflow_doc: skill.${skillName}`)
		.replace('name: docs-update', `name: ${skillName}`)
		.replace('skill_id: mustflow.core.docs-update', `skill_id: mustflow.core.${skillName}`)
		.replace('# Docs Update', `# ${skillName}`);

	mkdirSync(targetDir, { recursive: true });
	writeFileSync(path.join(targetDir, 'SKILL.md'), sourceSkill);
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

function trySymlink(targetPath, linkPath) {
	try {
		symlinkSync(targetPath, linkPath, 'file');
		return true;
	} catch {
		return false;
	}
}

test('strict check rejects symlinked skill index reads', async (t) => {
	const projectPath = createInitializedSkillProject();
	const outsidePath = createTempProject('mustflow-outside-');

	try {
		const skillIndexPath = path.join(projectPath, '.mustflow', 'skills', 'INDEX.md');
		const outsideIndexPath = path.join(outsidePath, 'INDEX.md');
		writeFileSync(outsideIndexPath, readText(skillIndexPath));
		unlinkSync(skillIndexPath);
		unlinkSync(path.join(projectPath, '.mustflow', 'config', 'manifest.lock.toml'));

		if (!trySymlink(outsideIndexPath, skillIndexPath)) {
			t.skip('file symlinks are unavailable in this environment');
			return;
		}

		const result = await runCliInProcess(projectPath, ['check', '--strict', '--json']);
		const check = JSON.parse(result.stdout);

		assert.equal(result.status, 1);
		assert.ok(
			check.issues.some((issue) =>
				issue.includes('Strict: .mustflow/skills/INDEX.md could not be read safely:'),
			),
		);
	} finally {
		removeTempProject(projectPath);
		removeTempProject(outsidePath);
	}
});

test('strict check fails unknown skill command intent metadata references', async () => {
	const projectPath = createInitializedSkillProject();

	try {
		const skillPath = path.join(projectPath, '.mustflow', 'skills', 'code-review', 'SKILL.md');
		const skill = readText(skillPath).replace('    - lint', '    - lint\n    - deploy_prod');
		writeFileSync(skillPath, skill);
		unlinkSync(path.join(projectPath, '.mustflow', 'config', 'manifest.lock.toml'));

		const result = await runCliInProcess(projectPath, ['check', '--strict', '--json']);
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

test('strict check warns for conflicting skill index routes without failing', async () => {
	const projectPath = createInitializedSkillProject();

	try {
		writeRouteShadowSkill(projectPath, 'route-shadow');
		writeRouteShadowSkill(projectPath, 'route-catch-all');
		const skillsIndexPath = path.join(projectPath, '.mustflow', 'skills', 'INDEX.md');
		const shadowRoutes = `
| Code changes need review before report | \`.mustflow/skills/route-shadow/SKILL.md\` | Duplicate trigger evidence | Documentation route surface | route overlap | \`docs_validate_fast\`, \`docs_validate\`, \`mustflow_check\` | Route overlap warning |
| Any request | \`.mustflow/skills/route-catch-all/SKILL.md\` | Catch-all evidence | Documentation route surface | route overlap | \`docs_validate_fast\`, \`docs_validate\`, \`mustflow_check\` | Broad route warning |
		`;
		const skillsIndex = readText(skillsIndexPath).replace(
			/(### Documentation and Release\r?\n\r?\n\| Trigger \| Skill Document \| Required Input \| Edit Scope \| Risk \| Verification Intents \| Expected Output \|\r?\n\| --- \| --- \| --- \| --- \| --- \| --- \| --- \|\r?\n)/u,
			`$1${shadowRoutes}`,
		);
		writeFileSync(skillsIndexPath, skillsIndex);
		const skillRoutesPath = path.join(projectPath, '.mustflow', 'skills', 'routes.toml');
		const skillRoutes = `${readText(skillRoutesPath)}
[routes."route-shadow"]
category = "docs_release"
route_type = "primary"
priority = 90

[routes."route-catch-all"]
category = "docs_release"
route_type = "primary"
priority = 95
		`;
		writeFileSync(skillRoutesPath, skillRoutes);
		unlinkSync(path.join(projectPath, '.mustflow', 'config', 'manifest.lock.toml'));
		writeFileSync(
			path.join(projectPath, 'pyproject.toml'),
			['[project]', 'name = "example"', 'version = "0.1.0"', ''].join('\n'),
		);

		const result = await runCliInProcess(projectPath, ['check', '--strict', '--json']);
		const check = JSON.parse(result.stdout);
		const warningIds = new Set(
			check.issueDetails.filter((issue) => issue.severity === 'warning').map((issue) => issue.id),
		);

		assert.equal(result.status, 0);
		assert.equal(check.ok, true);
		assert.deepEqual(check.issues, []);
		assert.ok(
			check.warnings.some((warning) =>
				warning.includes(
					'.mustflow/skills/code-review/SKILL.md and .mustflow/skills/route-shadow/SKILL.md have identical skill route trigger text',
				),
			),
		);
		assert.ok(
			check.warnings.some((warning) =>
				warning.includes(
					'.mustflow/skills/route-catch-all/SKILL.md route uses broad catch-all trigger "Any request"',
				),
			),
		);
		assert.ok(warningIds.has('mustflow.skill.index_route_identical_trigger'));
		assert.ok(warningIds.has('mustflow.skill.index_route_broad_catch_all'));
	} finally {
		removeTempProject(projectPath);
	}
});

test('strict check fails skill index route drift', async () => {
	const projectPath = createInitializedSkillProject();

	try {
		const skillsIndexPath = path.join(projectPath, '.mustflow', 'skills', 'INDEX.md');
		const skillsIndex = readText(skillsIndexPath)
			.replace(/^\| Code changes need review before report \|.*\n/mu, '')
			.replace(
				/(\| Documentation changes affect public or workflow docs \| `\.mustflow\/skills\/docs-update\/SKILL\.md` \|.*\|)/u,
				'$1\n| Broken route | `.mustflow/skills/missing/SKILL.md` | Any request | None | high | `deploy_prod` | Failure |\n| Docs drift | `.mustflow/skills/docs-update/SKILL.md` | Changed behavior or field | Relevant docs only | stale public docs | `docs_validate`, `lint` | Doc changes and skipped checks |',
			);
		writeFileSync(skillsIndexPath, skillsIndex);
		unlinkSync(path.join(projectPath, '.mustflow', 'config', 'manifest.lock.toml'));

		const result = await runCliInProcess(projectPath, ['check', '--strict', '--json']);
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

test('strict check fails skill route metadata drift', async () => {
	const projectPath = createInitializedSkillProject();

	try {
		const routesPath = path.join(projectPath, '.mustflow', 'skills', 'routes.toml');
		const routes = readText(routesPath)
			.replace(
				/\n\[routes\."code-review"\]\ncategory = "general_code"\nroute_type = "primary"\npriority = 50\napplies_to_reasons = \["code_change", "behavior_change"\]\n\n\[routes\."code-review"\.dependencies\]\nsuggests_adjuncts = \["bug-claim-evidence-gate"\]\nunlocks_on = \[\n  \{ signal = "candidate_defect", skill = "bug-claim-evidence-gate" \},\n\]\n/u,
				'\n',
			)
			.concat(
				[
					'',
					'[routes."metadata-shadow"]',
					'category = "general_code"',
					'route_type = "primary"',
					'priority = 10',
					'mutually_exclusive_with = ["missing-route"]',
					'',
				].join('\n'),
			);
		writeFileSync(routesPath, routes);
		unlinkSync(path.join(projectPath, '.mustflow', 'config', 'manifest.lock.toml'));

		const result = await runCliInProcess(projectPath, ['check', '--strict', '--json']);
		const check = JSON.parse(result.stdout);

		assert.equal(result.status, 1);
		assert.ok(
			check.issues.some(
				(issue) => issue === 'Strict: .mustflow/skills/routes.toml is missing metadata for route "code-review"',
			),
		);
		assert.ok(
			check.issues.some(
				(issue) => issue === 'Strict: .mustflow/skills/routes.toml route "metadata-shadow" is not listed in .mustflow/skills/INDEX.md',
			),
		);
		assert.ok(
			check.issues.some(
				(issue) => issue === 'Strict: .mustflow/skills/routes.toml route "metadata-shadow" points to a missing skill document',
			),
		);
		assert.ok(
			check.issues.some(
				(issue) =>
					issue ===
					'Strict: .mustflow/skills/routes.toml route "metadata-shadow" references unknown mutually exclusive route "missing-route"',
			),
		);
		assertHasIssueDetail(check, 'mustflow.skill.route_metadata_missing');
		assertHasIssueDetail(check, 'mustflow.skill.route_metadata_unlisted');
		assertHasIssueDetail(check, 'mustflow.skill.route_metadata_missing_document');
		assertHasIssueDetail(check, 'mustflow.skill.route_metadata_unknown_reference');
	} finally {
		removeTempProject(projectPath);
	}
});

test('strict check fails invalid skill route dependency semantics', async () => {
	const projectPath = createInitializedSkillProject();

	try {
		const routesPath = path.join(projectPath, '.mustflow', 'skills', 'routes.toml');
		const routes = readText(routesPath).replace(
			/\[routes\."code-review"\.dependencies\]\nsuggests_adjuncts = \["bug-claim-evidence-gate"\]\nunlocks_on = \[\n  \{ signal = "candidate_defect", skill = "bug-claim-evidence-gate" \},\n\]/u,
			[
				'[routes."code-review".dependencies]',
				'suggests_adjuncts = ["small-service-platform-architecture-review"]',
				'conflicts_with = ["small-service-platform-architecture-review"]',
				'unlocks_on = [{ signal = "semantic_drift", skill = "small-service-platform-architecture-review" }]',
			].join('\n'),
		);
		writeFileSync(routesPath, routes);
		unlinkSync(path.join(projectPath, '.mustflow', 'config', 'manifest.lock.toml'));

		const result = await runCliInProcess(projectPath, ['check', '--strict', '--json']);
		const check = JSON.parse(result.stdout);
		const expectedSuggestIssue = [
			'Strict: .mustflow/skills/routes.toml route "code-review"',
			' suggests adjunct route "small-service-platform-architecture-review"',
			' must point to an adjunct route, found "primary"',
		].join('');
		const expectedUnlockIssue = [
			'Strict: .mustflow/skills/routes.toml route "code-review"',
			' unlocks on signal "semantic_drift" route "small-service-platform-architecture-review"',
			' must point to an adjunct route, found "primary"',
		].join('');
		const expectedConflictWarning = [
			'Strict warning: .mustflow/skills/routes.toml route "code-review"',
			' conflicts with "small-service-platform-architecture-review"',
			' but the reverse route does not',
		].join('');

		assert.equal(result.status, 1);
		assert.ok(
			check.issues.some((issue) => issue === expectedSuggestIssue),
		);
		assert.ok(
			check.issues.some((issue) => issue === expectedUnlockIssue),
		);
		assertHasIssueDetail(check, 'mustflow.skill.route_metadata_invalid_dependency');
		assertHasIssueDetail(
			check,
			'mustflow.skill.route_metadata_asymmetric_conflict',
			expectedConflictWarning,
		);
	} finally {
		removeTempProject(projectPath);
	}
});

test('strict check fails skill route category section drift', async () => {
	const projectPath = createInitializedSkillProject();

	try {
		const routesPath = path.join(projectPath, '.mustflow', 'skills', 'routes.toml');
		const routes = readText(routesPath).replace(
			/(\[routes\."code-review"\]\n)category = "general_code"/u,
			'$1category = "docs_release"',
		);
		writeFileSync(routesPath, routes);
		unlinkSync(path.join(projectPath, '.mustflow', 'config', 'manifest.lock.toml'));

		const result = await runCliInProcess(projectPath, ['check', '--strict', '--json']);
		const check = JSON.parse(result.stdout);

		assert.equal(result.status, 1);
		assert.ok(
			check.issues.some(
				(issue) =>
					issue ===
					'Strict: .mustflow/skills/INDEX.md route "code-review" must appear under the Documentation and Release category section from .mustflow/skills/routes.toml',
			),
		);
		assertHasIssueDetail(check, 'mustflow.skill.route_metadata_category_mismatch');
	} finally {
		removeTempProject(projectPath);
	}
});

test('strict check fails skill route golden fixture mismatches', async () => {
	const projectPath = createInitializedSkillProject();

	try {
		writeFileSync(
			path.join(projectPath, '.mustflow', 'skills', 'route-fixtures.json'),
			JSON.stringify(
				{
					schema_version: '1',
					cases: [
						{
							id: 'wrong-main',
							task: 'Change TypeScript CLI JSON output and tests',
							paths: ['src/cli/commands/context.ts'],
							reasons: ['code_change'],
							required_main: 'docs-update',
						},
					],
				},
				null,
				2,
			),
		);

		const result = await runCliInProcess(projectPath, ['check', '--strict', '--json']);
		const check = JSON.parse(result.stdout);

		assert.equal(result.status, 1);
		assertHasIssueDetail(check, 'mustflow.skill.route_fixture_mismatch');
		assert.ok(
			check.issues.some((issue) =>
				issue.includes('Skill route fixture "wrong-main" expected selected main "docs-update"'),
			),
		);
	} finally {
		removeTempProject(projectPath);
	}
});

test('strict check fails invalid skill route golden fixture shape', async () => {
	const projectPath = createInitializedSkillProject();

	try {
		writeFileSync(
			path.join(projectPath, '.mustflow', 'skills', 'route-fixtures.json'),
			JSON.stringify({ schema_version: '1', cases: [{ id: 'missing-paths' }] }, null, 2),
		);

		const result = await runCliInProcess(projectPath, ['check', '--strict', '--json']);
		const check = JSON.parse(result.stdout);

		assert.equal(result.status, 1);
		assertHasIssueDetail(check, 'mustflow.skill.route_fixture_invalid');
		assert.ok(
			check.issues.some((issue) =>
				issue.includes('.mustflow/skills/route-fixtures.json cases[0].paths must be a non-empty string array'),
			),
		);
	} finally {
		removeTempProject(projectPath);
	}
});

test('strict check fails invalid skill route fixture expectation arrays', async () => {
	const projectPath = createInitializedSkillProject();

	try {
		writeFileSync(
			path.join(projectPath, '.mustflow', 'skills', 'route-fixtures.json'),
			JSON.stringify(
				{
					schema_version: '1',
					cases: [
						{
							id: 'invalid-expectation-array',
							task: 'Update public docs for strict check behavior',
							paths: ['docs-site/src/content/docs/en/commands/check.md'],
							reasons: ['docs_change'],
							required_candidates: 'docs-update',
						},
					],
				},
				null,
				2,
			),
		);

		const result = await runCliInProcess(projectPath, ['check', '--strict', '--json']);
		const check = JSON.parse(result.stdout);

		assert.equal(result.status, 1);
		assertHasIssueDetail(check, 'mustflow.skill.route_fixture_invalid');
		assert.ok(
			check.issues.some((issue) =>
				issue.includes('required_candidates must be a non-empty string array when present'),
			),
		);
	} finally {
		removeTempProject(projectPath);
	}
});

test('strict check fails generated template profiles without selectable main routes', async () => {
	const projectPath = createInitializedSkillProject();
	const templatePath = cloneProjectFixture(path.join(projectRoot, 'templates', 'default'), 'mustflow-template-');

	try {
		writeFileSync(path.join(projectPath, 'package.json'), JSON.stringify({ name: 'example', version: '0.1.0' }, null, 2));
		const routesPath = path.join(templatePath, 'locales', 'en', '.mustflow', 'skills', 'routes.toml');
		const routes = ['security-privacy-review', 'config-env-change', 'auth-permission-change'].reduce(
			(text, routeName) =>
				text.replace(
					new RegExp(`(\\[routes\\."${routeName}"\\]\\ncategory = "security_privacy"\\n)route_type = "primary"`, 'u'),
					'$1route_type = "adjunct"',
				),
			readText(routesPath),
		);
		writeFileSync(routesPath, routes);
		unlinkSync(path.join(projectPath, '.mustflow', 'config', 'manifest.lock.toml'));

		const result = await runCliInProcess(projectPath, ['check', '--strict', '--json'], {
			env: {
				...process.env,
				MUSTFLOW_DEV_TEMPLATE_ROOT: templatePath,
				MUSTFLOW_ALLOW_DEV_TEMPLATE_ROOT: '1',
			},
		});
		const check = JSON.parse(result.stdout);

		assert.equal(result.status, 1);
		assert.ok(
			check.issues.some(
				(issue) =>
					issue ===
					'Strict: template profile "minimal" skill category "Security and Privacy" must include at least one primary or authoring route',
			),
		);
		assertHasIssueDetail(check, 'mustflow.skill.template_profile_missing_main_route');
	} finally {
		removeTempProject(projectPath);
		removeTempProject(templatePath);
	}
});

test('strict check fails skill index route table shape drift', async () => {
	const projectPath = createInitializedSkillProject();

	try {
		const skillsIndexPath = path.join(projectPath, '.mustflow', 'skills', 'INDEX.md');
		const skillsIndex = readText(skillsIndexPath).replace(
			/^\| Code changes need review before report \|.*\n/mu,
			'| Review code changes | `.mustflow/skills/code-review/SKILL.md` | `test`, `lint` |\n',
		);
		writeFileSync(skillsIndexPath, skillsIndex);
		unlinkSync(path.join(projectPath, '.mustflow', 'config', 'manifest.lock.toml'));

		const result = await runCliInProcess(projectPath, ['check', '--strict', '--json']);
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

test('strict check fails non-procedure skill metadata', async () => {
	const projectPath = createInitializedSkillProject();

	try {
		const skillPath = path.join(projectPath, '.mustflow', 'skills', 'code-review', 'SKILL.md');
		const skill = readText(skillPath).replace('  mustflow_kind: procedure', '  mustflow_kind: contract');
		writeFileSync(skillPath, skill);
		unlinkSync(path.join(projectPath, '.mustflow', 'config', 'manifest.lock.toml'));

		const result = await runCliInProcess(projectPath, ['check', '--strict', '--json']);
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

test('strict check fails unsupported skill schema metadata', async () => {
	const projectPath = createInitializedSkillProject();

	try {
		const skillPath = path.join(projectPath, '.mustflow', 'skills', 'code-review', 'SKILL.md');
		const skill = readText(skillPath).replace('  mustflow_schema: "1"', '  mustflow_schema: "2"');
		writeFileSync(skillPath, skill);
		unlinkSync(path.join(projectPath, '.mustflow', 'config', 'manifest.lock.toml'));

		const result = await runCliInProcess(projectPath, ['check', '--strict', '--json']);
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

test('strict check fails skill name identity drift', async () => {
	const projectPath = createInitializedSkillProject();

	try {
		const skillPath = path.join(projectPath, '.mustflow', 'skills', 'code-review', 'SKILL.md');
		const skill = readText(skillPath).replace('name: code-review', 'name: diff-review');
		writeFileSync(skillPath, skill);
		unlinkSync(path.join(projectPath, '.mustflow', 'config', 'manifest.lock.toml'));

		const result = await runCliInProcess(projectPath, ['check', '--strict', '--json']);
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

test('strict check fails skill package identity drift', async () => {
	const projectPath = createInitializedSkillProject();

	try {
		const skillPath = path.join(projectPath, '.mustflow', 'skills', 'code-review', 'SKILL.md');
		const skill = readText(skillPath)
			.replace('  pack_id: mustflow.core\n', '')
			.replace('  skill_id: mustflow.core.code-review\n', '');
		writeFileSync(skillPath, skill);
		unlinkSync(path.join(projectPath, '.mustflow', 'config', 'manifest.lock.toml'));

		const result = await runCliInProcess(projectPath, ['check', '--strict', '--json']);
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

test('strict check fails skill command permission claims', async () => {
	const projectPath = createInitializedSkillProject();

	try {
		const skillPath = path.join(projectPath, '.mustflow', 'skills', 'code-review', 'SKILL.md');
		const skill = `${readText(skillPath)}\nThis skill authorizes agents to run deployment commands.\n`;
		writeFileSync(skillPath, skill);
		unlinkSync(path.join(projectPath, '.mustflow', 'config', 'manifest.lock.toml'));

		const result = await runCliInProcess(projectPath, ['check', '--strict', '--json']);
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

test('strict check fails unsafe skill resource declarations', async () => {
	const projectPath = createInitializedSkillProject();

	try {
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

		const result = await runCliInProcess(projectPath, ['check', '--strict', '--json']);
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

test('fails when a skill omits a required section', async () => {
	const projectPath = createInitializedSkillProject();

	try {
		const skillPath = path.join(projectPath, '.mustflow', 'skills', 'code-review', 'SKILL.md');
		const skill = readFileSync(skillPath, 'utf8');
		writeFileSync(skillPath, skill.replace(/<!-- mustflow-section: verification -->\r?\n/u, ''));

		const result = await runCliInProcess(projectPath, ['check']);

		assert.equal(result.status, 1);
		assert.match(result.stderr, /Missing required skill section ids/);
		assert.match(result.stderr, /verification/);
		assert.match(result.stderr, /code-review\/SKILL\.md/);
	} finally {
		removeTempProject(projectPath);
	}
});

test('fails when a skill omits an extended contract section', async () => {
	const projectPath = createInitializedSkillProject();

	try {
		const skillPath = path.join(projectPath, '.mustflow', 'skills', 'code-review', 'SKILL.md');
		const skill = readFileSync(skillPath, 'utf8');
		writeFileSync(skillPath, skill.replace(/<!-- mustflow-section: preconditions -->\r?\n/u, ''));

		const result = await runCliInProcess(projectPath, ['check']);

		assert.equal(result.status, 1);
		assert.match(result.stderr, /Missing required skill section ids/);
		assert.match(result.stderr, /preconditions/);
		assert.match(result.stderr, /code-review\/SKILL\.md/);
	} finally {
		removeTempProject(projectPath);
	}
});

test('fails when a skill omits its output format contract', async () => {
	const projectPath = createInitializedSkillProject();

	try {
		const skillPath = path.join(projectPath, '.mustflow', 'skills', 'code-review', 'SKILL.md');
		const skill = readFileSync(skillPath, 'utf8');
		writeFileSync(skillPath, skill.replace(/<!-- mustflow-section: output-format -->\r?\n/u, ''));

		const result = await runCliInProcess(projectPath, ['check']);

		assert.equal(result.status, 1);
		assert.match(result.stderr, /Missing required skill section ids/);
		assert.match(result.stderr, /output-format/);
		assert.match(result.stderr, /code-review\/SKILL\.md/);
	} finally {
		removeTempProject(projectPath);
	}
});

test('accepts localized skill headings when stable section ids remain', async () => {
	const projectPath = createInitializedSkillProject();

	try {
		const skillPath = path.join(projectPath, '.mustflow', 'skills', 'code-review', 'SKILL.md');
		const skill = readFileSync(skillPath, 'utf8');
		writeFileSync(skillPath, skill.replace('## Verification', '## Checks'));
		unlinkSync(path.join(projectPath, '.mustflow', 'config', 'manifest.lock.toml'));

		const result = await runCliInProcess(projectPath, ['check']);

		assert.equal(result.status, 0);
		assert.match(result.stdout, /mustflow check passed/);
	} finally {
		removeTempProject(projectPath);
	}
});
