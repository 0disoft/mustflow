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

test('code-outline scans source symbols with stable path, line, and hash metadata', () => {
	const projectPath = createTempProject();

	try {
		initProject(projectPath);
		mkdirSync(path.join(projectPath, 'src'));
		writeFileSync(
			path.join(projectPath, 'src', 'sample.ts'),
			[
				'export async function loadThing(id: string) {',
				'  return id.toUpperCase();',
				'}',
				'',
				'export class ThingBox {',
				'  value = 1;',
				'}',
				'',
				'type LocalShape = { value: number };',
				'',
			].join('\n'),
		);

		const { result, report } = runCodeOutlineJson(projectPath, ['src']);

		assert.equal(result.status, 0, result.stderr || result.stdout);
		assert.equal(report.command, 'script-pack');
		assert.equal(report.pack_id, 'code');
		assert.equal(report.script_id, 'outline');
		assert.equal(report.script_ref, 'code/outline');
		assert.equal(report.status, 'passed');
		assert.equal(report.ok, true);
		assert.equal(report.files[0].path, 'src/sample.ts');
		assert.equal(report.files[0].language, 'typescript');
		assert.match(report.files[0].sha256, /^sha256:[a-f0-9]{64}$/u);
		assert.match(report.input_hash, /^sha256:[a-f0-9]{64}$/u);
		assert.deepEqual(report.anchors, []);

		const loadThing = report.symbols.find((symbol) => symbol.name === 'loadThing');
		assert.ok(loadThing, 'loadThing should be outlined');
		assert.equal(loadThing.kind, 'function');
		assert.equal(loadThing.exported, true);
		assert.equal(loadThing.async, true);
		assert.equal(loadThing.start_line, 1);
		assert.equal(loadThing.end_line, 3);
		assert.equal(loadThing.path, 'src/sample.ts');
		assert.equal(loadThing.return_type, null);
		assert.equal(loadThing.return_behavior, 'value');
		assert.equal(loadThing.return_count, 1);
		assert.deepEqual(loadThing.return_lines, [2]);
		assert.equal(loadThing.return_preview, 'id.toUpperCase()');
		assert.match(loadThing.content_sha256, /^sha256:[a-f0-9]{64}$/u);

		const thingBox = report.symbols.find((symbol) => symbol.name === 'ThingBox');
		assert.ok(thingBox, 'ThingBox should be outlined');
		assert.equal(thingBox.kind, 'class');
		assert.equal(thingBox.start_line, 5);
		assert.equal(thingBox.end_line, 7);
		assert.equal(thingBox.return_type, null);
		assert.equal(thingBox.return_behavior, 'unknown');
		assert.equal(thingBox.return_count, 0);
		assert.deepEqual(thingBox.return_lines, []);
		assert.equal(thingBox.return_preview, null);
	} finally {
		removeTempProject(projectPath);
	}
});

test('code-outline reports source anchors with conservative target symbol metadata', () => {
	const projectPath = createTempProject();

	try {
		initProject(projectPath);
		mkdirSync(path.join(projectPath, 'src'));
		writeFileSync(
			path.join(projectPath, 'src', 'anchored.ts'),
			[
				'/**',
				' * mf:anchor auth.session.resolve',
				' * purpose: Resolve validated auth session.',
				' * search: auth, session, resolve',
				' * invariant: Session resolution must stay after request validation.',
				' * risk: authz, security',
				' */',
				'export function resolveSession(token: string): string {',
				'  return token.trim();',
				'}',
				'',
			].join('\n'),
		);

		const { result, report } = runCodeOutlineJson(projectPath, ['src/anchored.ts']);

		assert.equal(result.status, 0, result.stderr || result.stdout);
		assert.equal(report.anchors.length, 1);

		const anchor = report.anchors[0];
		assert.equal(anchor.id, 'auth.session.resolve');
		assert.equal(anchor.path, 'src/anchored.ts');
		assert.equal(anchor.line_start, 2);
		assert.equal(anchor.line_end, 6);
		assert.equal(anchor.purpose, 'Resolve validated auth session.');
		assert.deepEqual(anchor.search, ['auth', 'session', 'resolve']);
		assert.equal(anchor.invariant, 'Session resolution must stay after request validation.');
		assert.deepEqual(anchor.risk, ['authz', 'security']);
		assert.equal(anchor.navigation_only, true);
		assert.equal(anchor.can_instruct_agent, false);
		assert.equal(anchor.target_kind, 'function');
		assert.equal(anchor.target_name, 'resolveSession');
		assert.equal(anchor.target_start_line, 8);

		const target = report.symbols.find((symbol) => symbol.name === 'resolveSession');
		assert.ok(target, 'resolveSession should be outlined');
		assert.equal(anchor.target_symbol_id, target.id);
	} finally {
		removeTempProject(projectPath);
	}
});

test('code-outline reports explicit return annotations and return behavior metadata', () => {
	const projectPath = createTempProject();

	try {
		initProject(projectPath);
		mkdirSync(path.join(projectPath, 'src'));
		writeFileSync(
			path.join(projectPath, 'src', 'returns.ts'),
			[
				'export async function loadThing(id: string): Promise<string> {',
				'  return id.toUpperCase();',
				'}',
				'',
				'export function maybe(flag: boolean): string | undefined {',
				'  if (flag) return "yes";',
				'  return;',
				'}',
				'',
				'const expression = (value: number): number => value + 1;',
				'',
				'export function failFast(): never {',
				'  throw new Error("boom");',
				'}',
				'',
			].join('\n'),
		);

		const { result, report } = runCodeOutlineJson(projectPath, ['src/returns.ts']);

		assert.equal(result.status, 0, result.stderr || result.stdout);

		const loadThing = report.symbols.find((symbol) => symbol.name === 'loadThing');
		assert.ok(loadThing, 'loadThing should be outlined');
		assert.equal(loadThing.return_type, 'Promise<string>');
		assert.equal(loadThing.return_behavior, 'value');
		assert.equal(loadThing.return_count, 1);
		assert.deepEqual(loadThing.return_lines, [2]);
		assert.equal(loadThing.return_preview, 'id.toUpperCase()');

		const maybe = report.symbols.find((symbol) => symbol.name === 'maybe');
		assert.ok(maybe, 'maybe should be outlined');
		assert.equal(maybe.return_type, 'string | undefined');
		assert.equal(maybe.return_behavior, 'mixed');
		assert.equal(maybe.return_count, 2);
		assert.deepEqual(maybe.return_lines, [6, 7]);
		assert.equal(maybe.return_preview, '"yes"');

		const expression = report.symbols.find((symbol) => symbol.name === 'expression');
		assert.ok(expression, 'expression should be outlined');
		assert.equal(expression.return_type, 'number');
		assert.equal(expression.return_behavior, 'value');
		assert.equal(expression.return_count, 0);
		assert.deepEqual(expression.return_lines, []);
		assert.equal(expression.return_preview, 'value + 1');

		const failFast = report.symbols.find((symbol) => symbol.name === 'failFast');
		assert.ok(failFast, 'failFast should be outlined');
		assert.equal(failFast.return_type, 'never');
		assert.equal(failFast.return_behavior, 'throws_only');
		assert.equal(failFast.return_count, 0);
		assert.deepEqual(failFast.return_lines, []);
		assert.equal(failFast.return_preview, null);
	} finally {
		removeTempProject(projectPath);
	}
});

test('code-outline scans Go, Rust, and Python symbols with return metadata', () => {
	const projectPath = createTempProject();

	try {
		initProject(projectPath);
		mkdirSync(path.join(projectPath, 'src'));
		writeFileSync(
			path.join(projectPath, 'src', 'session.go'),
			[
				'package demo',
				'',
				'type Session struct {',
				'  ID string',
				'}',
				'',
				'func ResolveSession(token string) (string, error) {',
				'  return token, nil',
				'}',
				'',
				'func (s Session) privateValue() string {',
				'  return s.ID',
				'}',
				'',
			].join('\n'),
		);
		writeFileSync(
			path.join(projectPath, 'src', 'session.rs'),
			[
				'pub struct Session { pub id: String }',
				'',
				'pub async fn resolve_session(token: &str) -> Result<String, Error> {',
				'    Ok(token.to_owned())',
				'}',
				'',
				'pub enum Error { Empty }',
				'',
			].join('\n'),
		);
		writeFileSync(
			path.join(projectPath, 'src', 'session.py'),
			[
				'class Session:',
				'    pass',
				'',
				'async def resolve_session(token: str) -> str:',
				'    if not token:',
				'        return ""',
				'    return token.strip()',
				'',
			].join('\n'),
		);

		const { result, report } = runCodeOutlineJson(projectPath, ['src']);

		assert.equal(result.status, 0, result.stderr || result.stdout);
		assert.deepEqual(
			report.files.map((file) => [file.path, file.language]).sort(),
			[
				['src/session.go', 'go'],
				['src/session.py', 'python'],
				['src/session.rs', 'rust'],
			],
		);
		assert.ok(report.policy.extensions.includes('.go'));
		assert.ok(report.policy.extensions.includes('.rs'));
		assert.ok(report.policy.extensions.includes('.py'));

		const goFunction = report.symbols.find((symbol) => symbol.path === 'src/session.go' && symbol.name === 'ResolveSession');
		assert.ok(goFunction, 'Go function should be outlined');
		assert.equal(goFunction.language, 'go');
		assert.equal(goFunction.kind, 'function');
		assert.equal(goFunction.exported, true);
		assert.equal(goFunction.return_type, '(string, error)');
		assert.equal(goFunction.return_behavior, 'value');
		assert.deepEqual(goFunction.return_lines, [8]);
		assert.equal(goFunction.return_preview, 'token, nil');

		const goMethod = report.symbols.find((symbol) => symbol.path === 'src/session.go' && symbol.name === 'privateValue');
		assert.ok(goMethod, 'Go method should be outlined');
		assert.equal(goMethod.exported, false);
		assert.equal(goMethod.return_type, 'string');
		assert.deepEqual(goMethod.return_lines, [12]);

		const rustFunction = report.symbols.find((symbol) => symbol.path === 'src/session.rs' && symbol.name === 'resolve_session');
		assert.ok(rustFunction, 'Rust function should be outlined');
		assert.equal(rustFunction.language, 'rust');
		assert.equal(rustFunction.kind, 'function');
		assert.equal(rustFunction.exported, true);
		assert.equal(rustFunction.async, true);
		assert.equal(rustFunction.return_type, 'Result<String, Error>');
		assert.equal(rustFunction.return_behavior, 'value');
		assert.deepEqual(rustFunction.return_lines, []);
		assert.equal(rustFunction.return_preview, 'Ok(token.to_owned())');

		const pythonFunction = report.symbols.find((symbol) => symbol.path === 'src/session.py' && symbol.name === 'resolve_session');
		assert.ok(pythonFunction, 'Python function should be outlined');
		assert.equal(pythonFunction.language, 'python');
		assert.equal(pythonFunction.kind, 'function');
		assert.equal(pythonFunction.exported, true);
		assert.equal(pythonFunction.async, true);
		assert.equal(pythonFunction.return_type, 'str');
		assert.equal(pythonFunction.return_behavior, 'value');
		assert.deepEqual(pythonFunction.return_lines, [6, 7]);
		assert.equal(pythonFunction.return_preview, '""');
	} finally {
		removeTempProject(projectPath);
	}
});

test('code-outline scans Astro frontmatter and Svelte script symbols with original line metadata', () => {
	const projectPath = createTempProject();

	try {
		initProject(projectPath);
		mkdirSync(path.join(projectPath, 'src'));
		writeFileSync(
			path.join(projectPath, 'src', 'Card.astro'),
			[
				'---',
				'export function loadThing(id: string): string {',
				'  return id.trim();',
				'}',
				'const viewModel = (name: string): string => name.toUpperCase();',
				'---',
				'<script>const ignoredMarkupScript = () => "markup";</script>',
				'<h1>{viewModel("ok")}</h1>',
				'',
			].join('\n'),
		);
		writeFileSync(
			path.join(projectPath, 'src', 'Card.svelte'),
			[
				'<script lang="ts" context="module">',
				'  export function makeTitle(value: string): string {',
				'    return value.trim();',
				'  }',
				'</script>',
				'',
				'<script lang="ts">',
				'  const localValue = (count: number): number => count + 1;',
				'</script>',
				'',
				'<h1>{makeTitle("ok")}</h1>',
				'',
			].join('\n'),
		);

		const { result, report } = runCodeOutlineJson(projectPath, ['src']);

		assert.equal(result.status, 0, result.stderr || result.stdout);
		assert.deepEqual(
			report.files.map((file) => [file.path, file.language]).sort(),
			[
				['src/Card.astro', 'astro'],
				['src/Card.svelte', 'svelte'],
			],
		);
		assert.ok(report.policy.extensions.includes('.astro'));
		assert.ok(report.policy.extensions.includes('.svelte'));

		const astroFunction = report.symbols.find((symbol) => symbol.path === 'src/Card.astro' && symbol.name === 'loadThing');
		assert.ok(astroFunction, 'Astro frontmatter function should be outlined');
		assert.equal(astroFunction.language, 'astro');
		assert.equal(astroFunction.kind, 'function');
		assert.equal(astroFunction.start_line, 2);
		assert.equal(astroFunction.end_line, 4);
		assert.equal(astroFunction.return_type, 'string');
		assert.equal(astroFunction.return_behavior, 'value');
		assert.deepEqual(astroFunction.return_lines, [3]);
		assert.equal(astroFunction.return_preview, 'id.trim()');

		const astroArrow = report.symbols.find((symbol) => symbol.path === 'src/Card.astro' && symbol.name === 'viewModel');
		assert.ok(astroArrow, 'Astro frontmatter arrow function should be outlined');
		assert.equal(astroArrow.start_line, 5);
		assert.equal(astroArrow.return_type, 'string');
		assert.equal(astroArrow.return_preview, 'name.toUpperCase()');
		assert.equal(
			report.symbols.some((symbol) => symbol.name === 'ignoredMarkupScript'),
			false,
			'Astro markup script tags are outside this frontmatter outline slice',
		);

		const svelteModuleFunction = report.symbols.find((symbol) => symbol.path === 'src/Card.svelte' && symbol.name === 'makeTitle');
		assert.ok(svelteModuleFunction, 'Svelte module script function should be outlined');
		assert.equal(svelteModuleFunction.language, 'svelte');
		assert.equal(svelteModuleFunction.start_line, 2);
		assert.equal(svelteModuleFunction.end_line, 4);
		assert.equal(svelteModuleFunction.return_type, 'string');
		assert.deepEqual(svelteModuleFunction.return_lines, [3]);
		assert.equal(svelteModuleFunction.return_preview, 'value.trim()');

		const svelteInstanceFunction = report.symbols.find((symbol) => symbol.path === 'src/Card.svelte' && symbol.name === 'localValue');
		assert.ok(svelteInstanceFunction, 'Svelte instance script arrow function should be outlined');
		assert.equal(svelteInstanceFunction.language, 'svelte');
		assert.equal(svelteInstanceFunction.start_line, 8);
		assert.equal(svelteInstanceFunction.return_type, 'number');
		assert.equal(svelteInstanceFunction.return_preview, 'count + 1');
	} finally {
		removeTempProject(projectPath);
	}
});

test('code-outline reports unsupported files with a stable finding code', () => {
	const projectPath = createTempProject();

	try {
		initProject(projectPath);
		writeFileSync(path.join(projectPath, 'notes.md'), '# Notes\n');

		const { result, report } = runCodeOutlineJson(projectPath, ['notes.md']);

		assert.equal(result.status, 1, result.stderr || result.stdout);
		assert.equal(report.status, 'failed');
		assert.equal(report.ok, false);
		assert.equal(report.findings[0].code, 'code_outline_unsupported_file');
		assert.equal(report.findings[0].path, 'notes.md');
	} finally {
		removeTempProject(projectPath);
	}
});

test('code-outline reports max-files truncation with a stable finding code', () => {
	const projectPath = createTempProject();

	try {
		initProject(projectPath);
		mkdirSync(path.join(projectPath, 'src'));
		writeFileSync(path.join(projectPath, 'src', 'one.ts'), 'export const one = 1;\n');
		writeFileSync(path.join(projectPath, 'src', 'two.ts'), 'export const two = 2;\n');

		const { result, report } = runCodeOutlineJson(projectPath, ['src', '--max-files', '1']);

		assert.equal(result.status, 1, result.stderr || result.stdout);
		assert.equal(report.status, 'error');
		assert.equal(report.ok, false);
		assert.equal(report.files.length, 1);
		assert.ok(report.findings.some((finding) => finding.code === 'code_outline_max_files_exceeded'));
	} finally {
		removeTempProject(projectPath);
	}
});
