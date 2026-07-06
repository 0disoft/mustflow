import {
	appendIntent,
	assert,
	assertMatchesSchema,
	cliPath,
	commitGitBaseline,
	compareSemver,
	createTempProject,
	initProject,
	mkdirSync,
	path,
	pathToFileURL,
	projectRoot,
	readdirSync,
	readFileSync,
	readPublicJsonContracts,
	readSchema,
	readVerificationSkipReasons,
	refreshManifestLockHash,
	removeTempProject,
	runCli,
	runGit,
	schemaBackcompatRoot,
	schemaRoot,
	spawnSync,
	test,
	writeFileSync,
} from './helpers/schema-contracts.js';

test('skill route json output matches the published schema', () => {
	const projectPath = createTempProject();

	try {
		initProject(projectPath);
		const result = runCli(projectPath, [
			'skill',
			'route',
			'--task',
			'Change TypeScript CLI output',
			'--path',
			'src/cli/index.ts',
			'--reason',
			'code_change',
			'--json',
		]);

		assert.equal(result.status, 0, result.stderr || result.stdout);
		assertMatchesSchema(schemaRoot, 'skill-route-report.schema.json', JSON.parse(result.stdout));
	} finally {
		removeTempProject(projectPath);
	}
});

test('skill import rejected json output matches the published schema', () => {
	const projectPath = createTempProject();

	try {
		initProject(projectPath);
		const result = runCli(projectPath, [
			'skill',
			'import',
			'https://example.com/not-a-github-skill/SKILL.md',
			'--dry-run',
			'--json',
		]);

		assert.equal(result.status, 1, result.stderr || result.stdout);
		assertMatchesSchema(schemaRoot, 'skill-import-report.schema.json', JSON.parse(result.stdout));
	} finally {
		removeTempProject(projectPath);
	}
});

test('handoff validation json output matches the published schema', () => {
	const projectPath = createTempProject();

	try {
		initProject(projectPath);
		const workItemsPath = path.join(projectPath, '.mustflow', 'work-items');
		const recordPath = path.join(workItemsPath, 'MF-0001.json');
		mkdirSync(workItemsPath, { recursive: true });
		writeFileSync(
			recordPath,
			JSON.stringify(
				{
					schema_version: '1',
					kind: 'work_item',
					task_id: 'MF-0001',
					goal: 'Keep a bounded restart pointer.',
					scope: ['Validate the record shape'],
					acceptance_criteria: ['The record validates without writing files'],
					source_refs: ['ROADMAP.md'],
					next_restart_point: 'Continue from the next roadmap item.',
				},
				null,
				2,
			),
		);

		const result = runCli(projectPath, ['handoff', 'validate', '.mustflow/work-items/MF-0001.json', '--json']);

		assert.equal(result.status, 0, result.stderr || result.stdout);
		assertMatchesSchema(schemaRoot, 'handoff-validation-report.schema.json', JSON.parse(result.stdout));
	} finally {
		removeTempProject(projectPath);
	}
});

test('docs review list json output matches the published schema', () => {
	const projectPath = createTempProject();

	try {
		initProject(projectPath);
		const result = runCli(projectPath, ['docs', 'review', 'list', '--json']);

		assert.equal(result.status, 0, result.stderr || result.stdout);
		assertMatchesSchema(schemaRoot, 'docs-review-list.schema.json', JSON.parse(result.stdout));
	} finally {
		removeTempProject(projectPath);
	}
});
