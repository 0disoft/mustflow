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

test('code-outline json output matches the published schema', () => {
	const projectPath = createTempProject();

	try {
		initProject(projectPath);
		mkdirSync(path.join(projectPath, 'src'));
		writeFileSync(
			path.join(projectPath, 'src', 'outline.ts'),
			[
				'/**',
				' * mf:anchor schema.outline.probe',
				' * purpose: Exercise code outline source-anchor metadata.',
				' * search: schema, outline',
				' * risk: config',
				' */',
				'export function outlineProbe() {',
				'  return 1;',
				'}',
				'',
			].join('\n'),
		);
		const result = runCli(projectPath, [
			'script-pack',
			'run',
			'code/outline',
			'scan',
			'src/outline.ts',
			'--json',
		]);

		assert.equal(result.status, 0, result.stderr || result.stdout);
		assertMatchesSchema(schemaRoot, 'code-outline-report.schema.json', JSON.parse(result.stdout));
	} finally {
		removeTempProject(projectPath);
	}
});

test('dependency-graph json output matches the published schema', () => {
	const projectPath = createTempProject();

	try {
		initProject(projectPath);
		mkdirSync(path.join(projectPath, 'src'));
		writeFileSync(path.join(projectPath, 'src', 'entry.ts'), 'import { helper } from "./helper";\nexport const entry = helper;\n');
		writeFileSync(path.join(projectPath, 'src', 'helper.ts'), 'export const helper = 1;\n');
		const result = runCli(projectPath, [
			'script-pack',
			'run',
			'code/dependency-graph',
			'scan',
			'src/entry.ts',
			'--json',
		]);

		assert.equal(result.status, 0, result.stderr || result.stdout);
		assertMatchesSchema(schemaRoot, 'dependency-graph-report.schema.json', JSON.parse(result.stdout));
	} finally {
		removeTempProject(projectPath);
	}
});

test('import-cycle json output matches the published schema', () => {
	const projectPath = createTempProject();

	try {
		initProject(projectPath);
		mkdirSync(path.join(projectPath, 'src'));
		writeFileSync(path.join(projectPath, 'src', 'entry.ts'), 'import { helper } from "./helper";\nexport const entry = helper;\n');
		writeFileSync(path.join(projectPath, 'src', 'helper.ts'), 'export const helper = 1;\n');
		const result = runCli(projectPath, [
			'script-pack',
			'run',
			'code/import-cycle',
			'check',
			'src',
			'--json',
		]);

		assert.equal(result.status, 0, result.stderr || result.stdout);
		assertMatchesSchema(schemaRoot, 'import-cycle-report.schema.json', JSON.parse(result.stdout));
	} finally {
		removeTempProject(projectPath);
	}
});

test('module-boundary json output matches the published schema', () => {
	const projectPath = createTempProject();

	try {
		initProject(projectPath);
		mkdirSync(path.join(projectPath, 'src'));
		writeFileSync(path.join(projectPath, 'src', 'entry.ts'), 'export const entry = 1;\n');
		const result = runCli(projectPath, [
			'script-pack',
			'run',
			'code/module-boundary',
			'check',
			'src/entry.ts',
			'--json',
		]);

		assert.equal(result.status, 0, result.stderr || result.stdout);
		assertMatchesSchema(schemaRoot, 'module-boundary-report.schema.json', JSON.parse(result.stdout));
	} finally {
		removeTempProject(projectPath);
	}
});

test('change-impact json output matches the published schema', () => {
	const projectPath = createTempProject();

	try {
		initProject(projectPath);
		commitGitBaseline(projectPath);
		mkdirSync(path.join(projectPath, 'src'));
		writeFileSync(path.join(projectPath, 'src', 'entry.ts'), 'export const entry = 1;\n');
		const result = runCli(projectPath, [
			'script-pack',
			'run',
			'code/change-impact',
			'analyze',
			'--base',
			'HEAD',
			'--json',
		]);

		assert.equal(result.status, 0, result.stderr || result.stdout);
		assertMatchesSchema(schemaRoot, 'change-impact-report.schema.json', JSON.parse(result.stdout));
	} finally {
		removeTempProject(projectPath);
	}
});

test('code-symbol-read json output matches the published schema', () => {
	const projectPath = createTempProject();

	try {
		initProject(projectPath);
		mkdirSync(path.join(projectPath, 'src'));
		writeFileSync(
			path.join(projectPath, 'src', 'symbol.ts'),
			[
				'/**',
				' * mf:anchor schema.symbol.probe',
				' * purpose: Exercise code symbol read source-anchor metadata.',
				' * search: schema, symbol',
				' * risk: config',
				' */',
				'export function symbolProbe() {',
				'  return 1;',
				'}',
				'',
			].join('\n'),
		);
		const result = runCli(projectPath, [
			'script-pack',
			'run',
			'code/symbol-read',
			'read',
			'--anchor',
			'schema.symbol.probe',
			'--json',
		]);

		assert.equal(result.status, 0, result.stderr || result.stdout);
		assertMatchesSchema(schemaRoot, 'code-symbol-read-report.schema.json', JSON.parse(result.stdout));
	} finally {
		removeTempProject(projectPath);
	}
});

test('route-outline json output matches the published schema', () => {
	const projectPath = createTempProject();

	try {
		initProject(projectPath);
		mkdirSync(path.join(projectPath, 'src'));
		writeFileSync(
			path.join(projectPath, 'src', 'schema-routes.rs'),
			[
				'use axum::{routing::get, Router};',
				'async fn schema_route() {}',
				'pub fn app() -> Router {',
				'  Router::new().route("/schema-route", get(schema_route))',
				'}',
				'',
			].join('\n'),
		);
		const result = runCli(projectPath, [
			'script-pack',
			'run',
			'code/route-outline',
			'scan',
			'src/schema-routes.rs',
			'--json',
		]);

		assert.equal(result.status, 0, result.stderr || result.stdout);
		assertMatchesSchema(schemaRoot, 'route-outline-report.schema.json', JSON.parse(result.stdout));
	} finally {
		removeTempProject(projectPath);
	}
});

test('export-diff json output matches the published schema', () => {
	const projectPath = createTempProject();

	try {
		initProject(projectPath);
		mkdirSync(path.join(projectPath, 'src'));
		writeFileSync(path.join(projectPath, 'src', 'api.ts'), 'export function apiProbe(): string { return "ok"; }\n');
		for (const args of [
			['init'],
			['config', 'user.email', 'mustflow-tests@example.invalid'],
			['config', 'user.name', 'mustflow tests'],
			['add', '.'],
			['commit', '-m', 'baseline'],
		]) {
			const git = spawnSync('git', ['-C', projectPath, ...args], {
				cwd: projectPath,
				encoding: 'utf8',
				stdio: ['ignore', 'pipe', 'pipe'],
				windowsHide: true,
			});
			assert.equal(git.status, 0, git.stderr || git.stdout);
		}
		writeFileSync(path.join(projectPath, 'src', 'api.ts'), 'export function apiProbe(): number { return 1; }\n');
		const result = runCli(projectPath, [
			'script-pack',
			'run',
			'code/export-diff',
			'compare',
			'src/api.ts',
			'--base',
			'HEAD',
			'--json',
		]);

		assert.equal(result.status, 0, result.stderr || result.stdout);
		assertMatchesSchema(schemaRoot, 'export-diff-report.schema.json', JSON.parse(result.stdout));
	} finally {
		removeTempProject(projectPath);
	}
});
