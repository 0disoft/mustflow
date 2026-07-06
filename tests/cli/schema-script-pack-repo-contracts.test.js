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

test('reference-drift json output matches the published schema', () => {
	const projectPath = createTempProject();

	try {
		initProject(projectPath);
		const result = runCli(projectPath, [
			'script-pack',
			'run',
			'docs/reference-drift',
			'check',
			'README.md',
			'--json',
		]);

		assert.equal(result.status, 0, result.stderr || result.stdout);
		assertMatchesSchema(schemaRoot, 'reference-drift-report.schema.json', JSON.parse(result.stdout));
	} finally {
		removeTempProject(projectPath);
	}
});

test('link-integrity json output matches the published schema', () => {
	const projectPath = createTempProject();

	try {
		initProject(projectPath);
		const result = runCli(projectPath, [
			'script-pack',
			'run',
			'docs/link-integrity',
			'check',
			'README.md',
			'--json',
		]);

		assert.equal(result.status, 0, result.stderr || result.stdout);
		assertMatchesSchema(schemaRoot, 'link-integrity-report.schema.json', JSON.parse(result.stdout));
	} finally {
		removeTempProject(projectPath);
	}
});

test('test-performance-report json output matches the published schema', () => {
	const projectPath = createTempProject();

	try {
		initProject(projectPath);
		const result = runCli(projectPath, [
			'script-pack',
			'run',
			'test/performance-report',
			'summarize',
			'--json',
		]);

		assert.equal(result.status, 0, result.stderr || result.stdout);
		assertMatchesSchema(schemaRoot, 'test-performance-report.schema.json', JSON.parse(result.stdout));
	} finally {
		removeTempProject(projectPath);
	}
});

test('test-regression-selector json output matches the published schema', () => {
	const projectPath = createTempProject();

	try {
		initProject(projectPath);
		commitGitBaseline(projectPath);
		mkdirSync(path.join(projectPath, 'src'));
		writeFileSync(path.join(projectPath, 'src', 'selector.ts'), 'export const selector = 1;\n');
		const result = runCli(projectPath, [
			'script-pack',
			'run',
			'test/regression-selector',
			'select',
			'--base',
			'HEAD',
			'--json',
		]);

		assert.equal(result.status, 0, result.stderr || result.stdout);
		assertMatchesSchema(schemaRoot, 'test-regression-selector-report.schema.json', JSON.parse(result.stdout));
	} finally {
		removeTempProject(projectPath);
	}
});

test('text-budget json output matches the published schema', () => {
	const projectPath = createTempProject();

	try {
		initProject(projectPath);
		writeFileSync(path.join(projectPath, 'intro.txt'), 'short intro');
		const result = runCli(projectPath, [
			'script-pack',
			'run',
			'core/text-budget',
			'check',
			'intro.txt',
			'--max',
			'20',
			'--json',
		]);

		assert.equal(result.status, 0, result.stderr || result.stdout);
		assertMatchesSchema(schemaRoot, 'text-budget-report.schema.json', JSON.parse(result.stdout));
	} finally {
		removeTempProject(projectPath);
	}
});

test('generated-boundary json output matches the published schema', () => {
	const projectPath = createTempProject();

	try {
		initProject(projectPath);
		const result = runCli(projectPath, [
			'script-pack',
			'run',
			'repo/generated-boundary',
			'check',
			'AGENTS.md',
			'.mustflow/config/manifest.lock.toml',
			'--json',
		]);

		assert.equal(result.status, 1, result.stderr || result.stdout);
		assertMatchesSchema(schemaRoot, 'generated-boundary-report.schema.json', JSON.parse(result.stdout));
	} finally {
		removeTempProject(projectPath);
	}
});

test('skill-route-audit json output matches the published schema', () => {
	const projectPath = createTempProject();

	try {
		initProject(projectPath);
		const result = runCli(projectPath, [
			'script-pack',
			'run',
			'repo/skill-route-audit',
			'audit',
			'--json',
		]);

		assert.equal(result.status, 0, result.stderr || result.stdout);
		assertMatchesSchema(schemaRoot, 'skill-route-audit-report.schema.json', JSON.parse(result.stdout));
	} finally {
		removeTempProject(projectPath);
	}
});

test('repo version-source json output matches the published schema', () => {
	const projectPath = createTempProject();

	try {
		initProject(projectPath);
		const result = runCli(projectPath, [
			'script-pack',
			'run',
			'repo/version-source',
			'inspect',
			'--json',
		]);

		assert.equal(result.status, 0, result.stderr || result.stdout);
		assertMatchesSchema(schemaRoot, 'repo-version-source-report.schema.json', JSON.parse(result.stdout));
	} finally {
		removeTempProject(projectPath);
	}
});

test('repo toolchain-provenance json output matches the published schema', () => {
	const projectPath = createTempProject();

	try {
		initProject(projectPath);
		const result = runCli(projectPath, [
			'script-pack',
			'run',
			'repo/toolchain-provenance',
			'inspect',
			'--json',
		]);

		assert.equal(result.status, 0, result.stderr || result.stdout);
		assertMatchesSchema(schemaRoot, 'repo-toolchain-provenance-report.schema.json', JSON.parse(result.stdout));
	} finally {
		removeTempProject(projectPath);
	}
});

test('repo automation-surface json output matches the published schema', () => {
	const projectPath = createTempProject();

	try {
		initProject(projectPath);
		const result = runCli(projectPath, [
			'script-pack',
			'run',
			'repo/automation-surface',
			'inspect',
			'--json',
		]);

		assert.equal([0, 1].includes(result.status), true, result.stderr || result.stdout);
		assertMatchesSchema(schemaRoot, 'repo-automation-surface-report.schema.json', JSON.parse(result.stdout));
	} finally {
		removeTempProject(projectPath);
	}
});

test('repo dependency-surface json output matches the published schema', () => {
	const projectPath = createTempProject();

	try {
		initProject(projectPath);
		const result = runCli(projectPath, [
			'script-pack',
			'run',
			'repo/dependency-surface',
			'inspect',
			'--json',
		]);

		assert.equal([0, 1].includes(result.status), true, result.stderr || result.stdout);
		assertMatchesSchema(schemaRoot, 'repo-dependency-surface-report.schema.json', JSON.parse(result.stdout));
	} finally {
		removeTempProject(projectPath);
	}
});

test('repo approval-gate json output matches the published schema', () => {
	const projectPath = createTempProject();

	try {
		initProject(projectPath);
		const result = runCli(projectPath, [
			'script-pack',
			'run',
			'repo/approval-gate',
			'check',
			'--action',
			'git_commit',
			'--json',
		]);

		assert.equal(result.status, 1, result.stderr || result.stdout);
		assertMatchesSchema(schemaRoot, 'repo-approval-gate-report.schema.json', JSON.parse(result.stdout));
	} finally {
		removeTempProject(projectPath);
	}
});

test('repo deploy-surface json output matches the published schema', () => {
	const projectPath = createTempProject();

	try {
		initProject(projectPath);
		mkdirSync(path.join(projectPath, '.github', 'workflows'), { recursive: true });
		writeFileSync(
			path.join(projectPath, '.github', 'workflows', 'release.yml'),
			['name: Release', 'on:', '  push:', '    tags: ["v*"]', 'jobs:', '  publish:', '    steps:', '      - run: npm publish', ''].join('\n'),
		);
		const result = runCli(projectPath, [
			'script-pack',
			'run',
			'repo/deploy-surface',
			'inspect',
			'--json',
		]);

		assert.equal(result.status, 0, result.stderr || result.stdout);
		assertMatchesSchema(schemaRoot, 'repo-deploy-surface-report.schema.json', JSON.parse(result.stdout));
	} finally {
		removeTempProject(projectPath);
	}
});

test('repo merge-conflict-scan json output matches the published schema', () => {
	const projectPath = createTempProject();

	try {
		initProject(projectPath);
		writeFileSync(
			path.join(projectPath, 'conflicted.txt'),
			['<<<<<<< HEAD', 'left', '=======', 'right', '>>>>>>> branch', ''].join('\n'),
		);
		const result = runCli(projectPath, [
			'script-pack',
			'run',
			'repo/merge-conflict-scan',
			'check',
			'conflicted.txt',
			'--json',
		]);

		assert.equal(result.status, 1, result.stderr || result.stdout);
		assertMatchesSchema(schemaRoot, 'repo-merge-conflict-scan-report.schema.json', JSON.parse(result.stdout));
	} finally {
		removeTempProject(projectPath);
	}
});

test('repo git-ignore-audit json output matches the published schema', () => {
	const projectPath = createTempProject();

	try {
		initProject(projectPath);
		writeFileSync(path.join(projectPath, '.gitignore'), 'schema-ignored.txt\n');
		commitGitBaseline(projectPath);
		writeFileSync(path.join(projectPath, 'schema-ignored.txt'), 'ignored schema probe\n');
		const result = runCli(projectPath, [
			'script-pack',
			'run',
			'repo/git-ignore-audit',
			'audit',
			'schema-ignored.txt',
			'--json',
		]);

		assert.equal(result.status, 1, result.stderr || result.stdout);
		assertMatchesSchema(schemaRoot, 'repo-git-ignore-audit-report.schema.json', JSON.parse(result.stdout));
	} finally {
		removeTempProject(projectPath);
	}
});

test('repo manifest-lock-drift json output matches the published schema', () => {
	const projectPath = createTempProject();

	try {
		initProject(projectPath);
		const result = runCli(projectPath, [
			'script-pack',
			'run',
			'repo/manifest-lock-drift',
			'check',
			'AGENTS.md',
			'--json',
		]);

		assert.equal(result.status, 0, result.stderr || result.stdout);
		assertMatchesSchema(schemaRoot, 'repo-manifest-lock-drift-report.schema.json', JSON.parse(result.stdout));
	} finally {
		removeTempProject(projectPath);
	}
});

test('config-chain json output matches the published schema', () => {
	const projectPath = createTempProject();

	try {
		initProject(projectPath);
		writeFileSync(
			path.join(projectPath, 'tsconfig.base.json'),
			`${JSON.stringify({ compilerOptions: { strict: true } }, null, 2)}\n`,
		);
		writeFileSync(
			path.join(projectPath, 'tsconfig.json'),
			`${JSON.stringify({ extends: './tsconfig.base.json', include: ['src'] }, null, 2)}\n`,
		);
		const result = runCli(projectPath, [
			'script-pack',
			'run',
			'repo/config-chain',
			'inspect',
			'tsconfig.json',
			'--json',
		]);

		assert.equal(result.status, 0, result.stderr || result.stdout);
		assertMatchesSchema(schemaRoot, 'config-chain-report.schema.json', JSON.parse(result.stdout));
	} finally {
		removeTempProject(projectPath);
	}
});

test('env-contract json output matches the published schema', () => {
	const projectPath = createTempProject();

	try {
		initProject(projectPath);
		mkdirSync(path.join(projectPath, 'src'));
		writeFileSync(path.join(projectPath, 'src', 'config.ts'), 'export const apiToken = process.env.API_TOKEN;\n');
		writeFileSync(path.join(projectPath, 'README.md'), 'Configure `API_TOKEN` for API access.\n');
		const result = runCli(projectPath, [
			'script-pack',
			'run',
			'repo/env-contract',
			'scan',
			'src/config.ts',
			'README.md',
			'--json',
		]);

		assert.equal(result.status, 0, result.stderr || result.stdout);
		assertMatchesSchema(schemaRoot, 'env-contract-report.schema.json', JSON.parse(result.stdout));
	} finally {
		removeTempProject(projectPath);
	}
});

test('secret-risk-scan json output matches the published schema', () => {
	const projectPath = createTempProject();

	try {
		initProject(projectPath);
		mkdirSync(path.join(projectPath, 'src'));
		writeFileSync(path.join(projectPath, 'src', 'config.ts'), 'export const schemaSecret = "sk-test_abcdefghijklmnopqrstuvwxyz1234567890";\n');
		const result = runCli(projectPath, [
			'script-pack',
			'run',
			'repo/secret-risk-scan',
			'scan',
			'src/config.ts',
			'--json',
		]);

		assert.equal(result.status, 1, result.stderr || result.stdout);
		assertMatchesSchema(schemaRoot, 'secret-risk-scan-report.schema.json', JSON.parse(result.stdout));
	} finally {
		removeTempProject(projectPath);
	}
});

test('security-pattern-scan json output matches the published schema', () => {
	const projectPath = createTempProject();

	try {
		initProject(projectPath);
		mkdirSync(path.join(projectPath, 'src'));
		writeFileSync(path.join(projectPath, 'src', 'server.ts'), 'export function proxy(req) { return fetch(req.query.url); }\n');
		const result = runCli(projectPath, [
			'script-pack',
			'run',
			'repo/security-pattern-scan',
			'scan',
			'src/server.ts',
			'--json',
		]);

		assert.equal(result.status, 1, result.stderr || result.stdout);
		assertMatchesSchema(schemaRoot, 'security-pattern-scan-report.schema.json', JSON.parse(result.stdout));
	} finally {
		removeTempProject(projectPath);
	}
});

test('related-files json output matches the published schema', () => {
	const projectPath = createTempProject();

	try {
		initProject(projectPath);
		mkdirSync(path.join(projectPath, 'src'));
		writeFileSync(path.join(projectPath, 'src', 'schema-related.ts'), 'export const schemaRelated = 1;\n');
		writeFileSync(path.join(projectPath, 'src', 'schema-related.test.ts'), 'import "./schema-related";\n');
		const result = runCli(projectPath, [
			'script-pack',
			'run',
			'repo/related-files',
			'map',
			'src/schema-related.ts',
			'--json',
		]);

		assert.equal(result.status, 0, result.stderr || result.stdout);
		assertMatchesSchema(schemaRoot, 'related-files-report.schema.json', JSON.parse(result.stdout));
	} finally {
		removeTempProject(projectPath);
	}
});
