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

test('workspace summary api json output matches the published schema', () => {
	const projectPath = createTempProject();

	try {
		initProject(projectPath);
		const result = runCli(projectPath, ['api', 'workspace-summary', '--json']);

		assert.equal(result.status, 0, result.stderr || result.stdout);
		assertMatchesSchema(schemaRoot, 'workspace-summary.schema.json', JSON.parse(result.stdout));
	} finally {
		removeTempProject(projectPath);
	}
});

test('command catalog api json output matches the published schema', () => {
	const projectPath = createTempProject();

	try {
		initProject(projectPath);
		const result = runCli(projectPath, ['api', 'command-catalog', '--json']);

		assert.equal(result.status, 0, result.stderr || result.stdout);
		assertMatchesSchema(schemaRoot, 'command-catalog.schema.json', JSON.parse(result.stdout));
	} finally {
		removeTempProject(projectPath);
	}
});

test('verification plan api json output matches the published schema', () => {
	const projectPath = createTempProject();

	try {
		initProject(projectPath);
		commitGitBaseline(projectPath);
		writeFileSync(path.join(projectPath, 'schema-verification-plan-probe.js'), 'console.log("changed");\n');
		const result = runCli(projectPath, ['api', 'verification-plan', '--changed', '--json']);

		assert.equal(result.status, 0, result.stderr || result.stdout);
		assertMatchesSchema(schemaRoot, 'verification-plan.schema.json', JSON.parse(result.stdout));
	} finally {
		removeTempProject(projectPath);
	}
});

test('latest evidence api json output matches the published schema', () => {
	const projectPath = createTempProject();

	try {
		initProject(projectPath);
		const result = runCli(projectPath, ['api', 'latest-evidence', '--json']);

		assert.equal(result.status, 0, result.stderr || result.stdout);
		assertMatchesSchema(schemaRoot, 'latest-evidence.schema.json', JSON.parse(result.stdout));
	} finally {
		removeTempProject(projectPath);
	}
});

test('diff risk api json output matches the published schema', () => {
	const projectPath = createTempProject();

	try {
		initProject(projectPath);
		commitGitBaseline(projectPath);
		writeFileSync(path.join(projectPath, 'schema-diff-risk-probe.js'), 'console.log("changed");\n');
		const result = runCli(projectPath, ['api', 'diff-risk', '--changed', '--json']);

		assert.equal(result.status, 0, result.stderr || result.stdout);
		assertMatchesSchema(schemaRoot, 'diff-risk.schema.json', JSON.parse(result.stdout));
	} finally {
		removeTempProject(projectPath);
	}
});

test('health api json output matches the published schema', () => {
	const projectPath = createTempProject();

	try {
		initProject(projectPath);
		const result = runCli(projectPath, ['api', 'health', '--json']);

		assert.equal(result.status, 0, result.stderr || result.stdout);
		assertMatchesSchema(schemaRoot, 'health.schema.json', JSON.parse(result.stdout));
	} finally {
		removeTempProject(projectPath);
	}
});

test('locks api json output matches the published schema', () => {
	const projectPath = createTempProject();

	try {
		initProject(projectPath);
		const result = runCli(projectPath, ['api', 'locks', '--json']);

		assert.equal(result.status, 0, result.stderr || result.stdout);
		assertMatchesSchema(schemaRoot, 'locks.schema.json', JSON.parse(result.stdout));
	} finally {
		removeTempProject(projectPath);
	}
});

test('api serve jsonl responses match the published schema', () => {
	const projectPath = createTempProject();

	try {
		initProject(projectPath);
		const input = [
			JSON.stringify({ id: 'health', action: 'health' }),
			JSON.stringify({ id: 'missing-changed', action: 'verification-plan' }),
			JSON.stringify({ id: 'invalid-changed', action: 'verification-plan', changed: 'true' }),
			`{"id":"oversized","action":"health","padding":"${'x'.repeat(1024 * 1024)}"}`,
			'',
		].join('\n');
		const result = runCli(projectPath, ['api', 'serve', '--stdio'], { input });
		const lines = result.stdout.trim().split(/\r?\n/u).map((line) => JSON.parse(line));

		assert.equal(result.status, 0, result.stderr || result.stdout);
		assert.equal(lines.length, 4);
		assert.equal(lines[2].error.code, 'invalid_request');
		assert.equal(lines[3].error.code, 'request_too_large');
		for (const line of lines) {
			assertMatchesSchema(schemaRoot, 'api-serve-response.schema.json', line);
		}
	} finally {
		removeTempProject(projectPath);
	}
});

test('workspace status json output matches the published schema', () => {
	const projectPath = createTempProject();

	try {
		initProject(projectPath);
		const result = runCli(projectPath, ['workspace', 'status', '--json']);

		assert.equal(result.status, 0, result.stderr || result.stdout);
		assertMatchesSchema(schemaRoot, 'workspace-status.schema.json', JSON.parse(result.stdout));
	} finally {
		removeTempProject(projectPath);
	}
});

test('workspace scan json output matches the published workspace status schema', () => {
	const projectPath = createTempProject();

	try {
		mkdirSync(path.join(projectPath, 'projects', 'app', '.git'), { recursive: true });
		const result = runCli(projectPath, ['workspace', 'scan', '--json']);

		assert.equal(result.status, 0, result.stderr || result.stdout);
		assertMatchesSchema(schemaRoot, 'workspace-status.schema.json', JSON.parse(result.stdout));
	} finally {
		removeTempProject(projectPath);
	}
});

test('workspace command-catalog json output matches the published schema', () => {
	const projectPath = createTempProject();

	try {
		initProject(projectPath);
		const result = runCli(projectPath, ['workspace', 'command-catalog', '--json']);

		assert.equal(result.status, 0, result.stderr || result.stdout);
		assertMatchesSchema(schemaRoot, 'workspace-command-catalog.schema.json', JSON.parse(result.stdout));
	} finally {
		removeTempProject(projectPath);
	}
});

test('workspace command-fragments json output matches the published schema', () => {
	const projectPath = createTempProject();

	try {
		initProject(projectPath);
		const result = runCli(projectPath, ['workspace', 'command-fragments', '--json']);

		assert.equal(result.status, 0, result.stderr || result.stdout);
		assertMatchesSchema(schemaRoot, 'workspace-command-fragments.schema.json', JSON.parse(result.stdout));
	} finally {
		removeTempProject(projectPath);
	}
});

test('workspace verify json output matches the published schema', () => {
	const projectPath = createTempProject();

	try {
		initProject(projectPath);
		const result = runCli(projectPath, ['workspace', 'verify', '--changed', '--plan-only', '--json']);

		assert.equal(result.status, 0, result.stderr || result.stdout);
		assertMatchesSchema(schemaRoot, 'workspace-verification-plan.schema.json', JSON.parse(result.stdout));
	} finally {
		removeTempProject(projectPath);
	}
});
