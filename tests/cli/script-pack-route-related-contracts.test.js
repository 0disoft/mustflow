import {
	assert,
	commitGitBaseline,
	createTempProject,
	initProject,
	mkdirSync,
	path,
	readFileSync,
	removeTempProject,
	runCli,
	runCodeChangeImpactJson,
	runCodeDependencyGraphJson,
	runCodeExportDiffJson,
	runCodeImportCycleJson,
	runCodeModuleBoundaryJson,
	runCodeOutlineJson,
	runCodeRouteOutlineJson,
	runCodeSymbolReadJson,
	runConfigChainJson,
	runDocsLinkIntegrityJson,
	runDocsReferenceDriftJson,
	runEnvContractJson,
	runGeneratedBoundaryJson,
	runGit,
	runRelatedFilesJson,
	runRepoApprovalGateJson,
	runRepoAutomationSurfaceJson,
	runRepoDependencySurfaceJson,
	runRepoDeploySurfaceJson,
	runRepoGitIgnoreAuditJson,
	runRepoManifestLockDriftJson,
	runRepoMergeConflictScanJson,
	runRepoToolchainProvenanceJson,
	runScriptPackSuggestJson,
	runSecretRiskScanJson,
	runSecurityPatternScanJson,
	runTestPerformanceReportJson,
	runTestRegressionSelectorJson,
	runTextBudgetJson,
	spawnSync,
	test,
	unlinkSync,
	writeFileSync,
} from './helpers/text-budget-contracts.js';

test('code-route-outline scans Hono and Elysia routes with lifecycle metadata', () => {
	const projectPath = createTempProject();

	try {
		initProject(projectPath);
		mkdirSync(path.join(projectPath, 'src'));
		writeFileSync(
			path.join(projectPath, 'src', 'server.ts'),
			[
				'import { Hono } from "hono";',
				'import { Elysia } from "elysia";',
				'',
				'const hono = new Hono();',
				'hono.post("/sessions", async (c) => c.json({ ok: true }));',
				'',
				'export const api = new Elysia()',
				'  .guard({ headers: {} })',
				'  .resolve(({ headers }) => ({ user: headers.authorization }))',
				'  .get("/users/:id", ({ user }) => user);',
				'',
			].join('\n'),
		);

		const { result, report } = runCodeRouteOutlineJson(projectPath, ['src/server.ts']);

		assert.equal(result.status, 0, result.stderr || result.stdout);
		assert.equal(report.command, 'script-pack');
		assert.equal(report.pack_id, 'code');
		assert.equal(report.script_id, 'route-outline');
		assert.equal(report.script_ref, 'code/route-outline');
		assert.equal(report.status, 'passed');
		assert.equal(report.ok, true);
		assert.equal(report.files[0].path, 'src/server.ts');
		assert.equal(report.files[0].language, 'typescript');
		assert.deepEqual(report.files[0].framework_evidence, ['elysia', 'hono']);
		assert.equal(report.files[0].route_count, 2);
		assert.match(report.files[0].sha256, /^sha256:[a-f0-9]{64}$/u);
		assert.match(report.input_hash, /^sha256:[a-f0-9]{64}$/u);
		assert.ok(report.policy.extensions.includes('.ts'));

		const honoRoute = report.routes.find((route) => route.framework === 'hono');
		assert.ok(honoRoute, 'Hono route should be outlined');
		assert.equal(honoRoute.method, 'post');
		assert.equal(honoRoute.route_path, '/sessions');
		assert.equal(honoRoute.line, 5);
		assert.equal(honoRoute.chain_start_line, 5);
		assert.equal(honoRoute.chain_end_line, 5);
		assert.equal(honoRoute.handler_name, null);
		assert.deepEqual(honoRoute.lifecycle, []);
		assert.match(honoRoute.content_sha256, /^sha256:[a-f0-9]{64}$/u);

		const elysiaRoute = report.routes.find((route) => route.framework === 'elysia');
		assert.ok(elysiaRoute, 'Elysia route should be outlined');
		assert.equal(elysiaRoute.method, 'get');
		assert.equal(elysiaRoute.route_path, '/users/:id');
		assert.equal(elysiaRoute.line, 10);
		assert.equal(elysiaRoute.chain_start_line, 7);
		assert.equal(elysiaRoute.chain_end_line, 10);
		assert.equal(elysiaRoute.handler_name, null);
		assert.deepEqual(elysiaRoute.lifecycle, ['guard', 'resolve']);
		assert.match(elysiaRoute.signature, /new Elysia/u);
		assert.deepEqual(report.findings, []);
		assert.deepEqual(report.issues, []);
	} finally {
		removeTempProject(projectPath);
	}
});

test('code-route-outline scans Axum Router routes with handler metadata', () => {
	const projectPath = createTempProject();

	try {
		initProject(projectPath);
		mkdirSync(path.join(projectPath, 'src'));
		writeFileSync(
			path.join(projectPath, 'src', 'main.rs'),
			[
				'use axum::{routing::{delete, get}, Router};',
				'',
				'async fn list_users() {}',
				'async fn create_user() {}',
				'async fn delete_user() {}',
				'async fn not_found() {}',
				'fn admin_router() -> Router { Router::new() }',
				'',
				'pub fn app() -> Router {',
				'  Router::new()',
				'    .route("/users", get(list_users).post(create_user))',
				'    .route("/users/:id", delete(delete_user))',
				'    .nest("/admin", admin_router())',
				'    .fallback(not_found)',
				'}',
				'',
			].join('\n'),
		);

		const { result, report } = runCodeRouteOutlineJson(projectPath, ['src/main.rs']);

		assert.equal(result.status, 0, result.stderr || result.stdout);
		assert.equal(report.files[0].path, 'src/main.rs');
		assert.equal(report.files[0].language, 'rust');
		assert.deepEqual(report.files[0].framework_evidence, ['axum']);
		assert.equal(report.files[0].route_count, 5);
		assert.ok(report.policy.extensions.includes('.rs'));

		const usersGet = report.routes.find(
			(route) => route.framework === 'axum' && route.method === 'get' && route.route_path === '/users',
		);
		assert.ok(usersGet, 'Axum GET route should be outlined');
		assert.equal(usersGet.line, 11);
		assert.equal(usersGet.handler_line, 11);
		assert.equal(usersGet.handler_name, 'list_users');

		const usersPost = report.routes.find(
			(route) => route.framework === 'axum' && route.method === 'post' && route.route_path === '/users',
		);
		assert.ok(usersPost, 'Axum POST chained route should be outlined');
		assert.equal(usersPost.handler_name, 'create_user');

		const userDelete = report.routes.find(
			(route) => route.framework === 'axum' && route.method === 'delete' && route.route_path === '/users/:id',
		);
		assert.ok(userDelete, 'Axum DELETE route should be outlined');
		assert.equal(userDelete.handler_name, 'delete_user');

		const nested = report.routes.find((route) => route.framework === 'axum' && route.method === 'nest');
		assert.ok(nested, 'Axum nest route should be outlined');
		assert.equal(nested.route_path, '/admin');
		assert.equal(nested.handler_name, 'admin_router');

		const fallback = report.routes.find((route) => route.framework === 'axum' && route.method === 'fallback');
		assert.ok(fallback, 'Axum fallback route should be outlined');
		assert.equal(fallback.route_path, null);
		assert.equal(fallback.handler_name, 'not_found');
		assert.deepEqual(report.findings, []);
		assert.deepEqual(report.issues, []);
	} finally {
		removeTempProject(projectPath);
	}
});

test('code-route-outline scans NestJS controllers with method and lifecycle metadata', () => {
	const projectPath = createTempProject();

	try {
		initProject(projectPath);
		mkdirSync(path.join(projectPath, 'src'));
		writeFileSync(
			path.join(projectPath, 'src', 'users.controller.ts'),
			[
				'import { Controller, Get, Post, Put, Delete, UseGuards, UseInterceptors } from "@nestjs/common";',
				'',
				'@Controller("users")',
				'@UseGuards(AuthGuard)',
				'export class UsersController {',
				'  @Get()',
				'  list() { return []; }',
				'',
				'  @Post()',
				'  @UseInterceptors(AuditInterceptor)',
				'  create() { return {}; }',
				'',
				'  @Get(":id")',
				'  show() { return {}; }',
				'',
				'  @Delete(":id")',
				'  remove() { return true; }',
				'',
				'  @Put()',
				'  replace() { return {}; }',
				'',
				'  @Get("guarded")',
				'  public async guarded() { return []; }',
				'',
				'  @Get("stream")',
				'  public *stream() { yield "ok"; }',
				'}',
				'',
			].join('\n'),
		);

		const { result, report } = runCodeRouteOutlineJson(projectPath, ['src/users.controller.ts']);

		assert.equal(result.status, 0, result.stderr || result.stdout);
		assert.equal(report.files[0].path, 'src/users.controller.ts');
		assert.equal(report.files[0].language, 'typescript');
		assert.deepEqual(report.files[0].framework_evidence, ['nestjs']);
		assert.equal(report.files[0].route_count, 7);

		const list = report.routes.find(
			(route) => route.framework === 'nestjs' && route.method === 'get' && route.route_path === '/users',
		);
		assert.ok(list, 'NestJS list route should be outlined');
		assert.equal(list.handler_name, 'list');
		assert.deepEqual(list.lifecycle, ['useGuards']);

		const create = report.routes.find(
			(route) => route.framework === 'nestjs' && route.method === 'post' && route.route_path === '/users',
		);
		assert.ok(create, 'NestJS create route should be outlined');
		assert.equal(create.handler_name, 'create');
		assert.deepEqual(create.lifecycle, ['useGuards', 'useInterceptors']);

		const show = report.routes.find(
			(route) => route.framework === 'nestjs' && route.method === 'get' && route.route_path === '/users/:id',
		);
		assert.ok(show, 'NestJS show route should be outlined');
		assert.equal(show.handler_name, 'show');
		assert.deepEqual(show.lifecycle, ['useGuards']);

		const remove = report.routes.find(
			(route) => route.framework === 'nestjs' && route.method === 'delete' && route.route_path === '/users/:id',
		);
		assert.ok(remove, 'NestJS remove route should be outlined');
		assert.equal(remove.handler_name, 'remove');
		assert.deepEqual(remove.lifecycle, ['useGuards']);

		const replace = report.routes.find(
			(route) => route.framework === 'nestjs' && route.method === 'put' && route.route_path === '/users',
		);
		assert.ok(replace, 'NestJS replace route should be outlined');
		assert.equal(replace.handler_name, 'replace');

		const guarded = report.routes.find(
			(route) => route.framework === 'nestjs' && route.method === 'get' && route.route_path === '/users/guarded',
		);
		assert.ok(guarded, 'NestJS public async route should be outlined');
		assert.equal(guarded.handler_name, 'guarded');

		const stream = report.routes.find(
			(route) => route.framework === 'nestjs' && route.method === 'get' && route.route_path === '/users/stream',
		);
		assert.ok(stream, 'NestJS generator route should be outlined');
		assert.equal(stream.handler_name, 'stream');
		assert.deepEqual(report.findings, []);
		assert.deepEqual(report.issues, []);
	} finally {
		removeTempProject(projectPath);
	}
});

test('code-route-outline handles long malformed NestJS handler candidates without regex backtracking', () => {
	const projectPath = createTempProject();

	try {
		initProject(projectPath);
		mkdirSync(path.join(projectPath, 'src'));
		writeFileSync(
			path.join(projectPath, 'src', 'users.controller.ts'),
			[
				'import { Controller, Get } from "@nestjs/common";',
				'',
				'@Controller("users")',
				'export class UsersController {',
				'  @Get("safe")',
				`  ${'public '.repeat(1200)}if`,
				'  safe() { return []; }',
				'}',
				'',
			].join('\n'),
		);

		const { result, report } = runCodeRouteOutlineJson(projectPath, ['src/users.controller.ts']);

		assert.equal(result.status, 0, result.stderr || result.stdout);
		assert.equal(report.files[0].route_count, 1);
		assert.equal(report.routes[0].handler_name, 'safe');
		assert.deepEqual(report.findings, []);
		assert.deepEqual(report.issues, []);
	} finally {
		removeTempProject(projectPath);
	}
});

test('related-files maps imports, importers, siblings, and parent config without deciding verification scope', () => {
	const projectPath = createTempProject();

	try {
		initProject(projectPath);
		mkdirSync(path.join(projectPath, 'src'));
		writeFileSync(
			path.join(projectPath, 'src', 'feature.ts'),
			[
				'import { helper } from "./helper";',
				'',
				'export function feature() {',
				'  return helper();',
				'}',
				'',
			].join('\n'),
		);
		writeFileSync(path.join(projectPath, 'src', 'helper.ts'), 'export function helper() { return 1; }\n');
		writeFileSync(path.join(projectPath, 'src', 'consumer.ts'), 'import { feature } from "./feature";\n');
		writeFileSync(path.join(projectPath, 'src', 'feature.test.ts'), 'import { feature } from "./feature";\n');
		writeFileSync(path.join(projectPath, 'src', 'feature.css'), '.feature { display: block; }\n');
		writeFileSync(path.join(projectPath, 'src', 'feature.md'), '# Feature\n');
		writeFileSync(path.join(projectPath, 'package.json'), `${JSON.stringify({ type: 'module' }, null, 2)}\n`);

		const { result, report } = runRelatedFilesJson(projectPath, ['src/feature.ts']);

		assert.equal(result.status, 0, result.stderr || result.stdout);
		assert.equal(report.command, 'script-pack');
		assert.equal(report.pack_id, 'repo');
		assert.equal(report.script_id, 'related-files');
		assert.equal(report.script_ref, 'repo/related-files');
		assert.equal(report.status, 'passed');
		assert.equal(report.ok, true);
		assert.equal(report.truncated, false);
		assert.equal(report.targets[0].path, 'src/feature.ts');
		assert.equal(report.targets[0].language, 'typescript');
		assert.match(report.input_hash, /^sha256:[a-f0-9]{64}$/u);

		const candidates = new Map(report.candidates.map((candidate) => [`${candidate.relationship}:${candidate.path}`, candidate]));
		assert.equal(candidates.get('import:src/helper.ts')?.line, 1);
		assert.equal(candidates.get('importer:src/consumer.ts')?.line, 1);
		assert.equal(candidates.get('sibling_test:src/feature.test.ts')?.source_path, 'src/feature.ts');
		assert.equal(candidates.get('sibling_style:src/feature.css')?.target_path, 'src/feature.ts');
		assert.equal(candidates.get('sibling_docs:src/feature.md')?.line, null);
		assert.equal(candidates.get('package_boundary:package.json')?.relationship, 'package_boundary');
		assert.deepEqual(report.findings, []);
		assert.deepEqual(report.issues, []);
	} finally {
		removeTempProject(projectPath);
	}
});

test('related-files reports scan truncation with stable finding metadata', () => {
	const projectPath = createTempProject();

	try {
		initProject(projectPath);
		mkdirSync(path.join(projectPath, 'src'));
		writeFileSync(path.join(projectPath, 'src', 'one.ts'), 'export const one = 1;\n');
		writeFileSync(path.join(projectPath, 'src', 'two.ts'), 'export const two = 2;\n');

		const { result, report } = runRelatedFilesJson(projectPath, ['src/one.ts', '--max-files', '1']);

		assert.equal(result.status, 1, result.stderr || result.stdout);
		assert.equal(report.status, 'failed');
		assert.equal(report.ok, false);
		assert.equal(report.truncated, true);
		assert.ok(report.findings.some((finding) => finding.code === 'related_files_max_files_exceeded'));
	} finally {
		removeTempProject(projectPath);
	}
});
