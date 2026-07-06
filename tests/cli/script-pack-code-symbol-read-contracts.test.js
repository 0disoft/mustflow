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

test('code-symbol-read resolves a symbol by start line and returns only the bounded snippet', () => {
	const projectPath = createTempProject();

	try {
		initProject(projectPath);
		mkdirSync(path.join(projectPath, 'src'));
		writeFileSync(
			path.join(projectPath, 'src', 'sample.ts'),
			[
				'const before = 1;',
				'',
				'export function target(value: string): string {',
				'  return value.trim();',
				'}',
				'',
				'const after = 2;',
				'',
			].join('\n'),
		);

		const { result, report } = runCodeSymbolReadJson(projectPath, [
			'src/sample.ts',
			'--start-line',
			'3',
			'--context-lines',
			'1',
		]);

		assert.equal(result.status, 0, result.stderr || result.stdout);
		assert.equal(report.command, 'script-pack');
		assert.equal(report.pack_id, 'code');
		assert.equal(report.script_id, 'symbol-read');
		assert.equal(report.script_ref, 'code/symbol-read');
		assert.equal(report.status, 'passed');
		assert.equal(report.ok, true);
		assert.equal(report.target.path, 'src/sample.ts');
		assert.equal(report.target.resolved_start_line, 3);
		assert.equal(report.target.resolved_end_line, 5);
		assert.equal(report.target.context_start_line, 2);
		assert.equal(report.target.context_end_line, 6);
		assert.equal(report.target.symbol.name, 'target');
		assert.equal(report.target.symbol.return_type, 'string');
		assert.equal(report.target.symbol.return_behavior, 'value');
		assert.equal(report.target.symbol.return_count, 1);
		assert.deepEqual(report.target.symbol.return_lines, [4]);
		assert.equal(report.target.symbol.return_preview, 'value.trim()');
		assert.equal(report.snippet.start_line, 2);
		assert.equal(report.snippet.end_line, 6);
		assert.match(report.snippet.text, /export function target/u);
		assert.doesNotMatch(report.snippet.text, /const after = 2/u);
		assert.match(report.input_hash, /^sha256:[a-f0-9]{64}$/u);
	} finally {
		removeTempProject(projectPath);
	}
});

test('code-symbol-read resolves a source anchor to its target symbol snippet', () => {
	const projectPath = createTempProject();

	try {
		initProject(projectPath);
		mkdirSync(path.join(projectPath, 'src'));
		writeFileSync(
			path.join(projectPath, 'src', 'anchored.ts'),
			[
				'const before = 1;',
				'',
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
				'const after = 2;',
				'',
			].join('\n'),
		);

		const { result, report } = runCodeSymbolReadJson(projectPath, [
			'--anchor',
			'auth.session.resolve',
			'--context-lines',
			'1',
		]);

		assert.equal(result.status, 0, result.stderr || result.stdout);
		assert.equal(report.policy.anchor_id, 'auth.session.resolve');
		assert.equal(report.policy.start_line, null);
		assert.equal(report.target.requested_anchor_id, 'auth.session.resolve');
		assert.equal(report.target.requested_start_line, null);
		assert.equal(report.target.anchor.id, 'auth.session.resolve');
		assert.equal(report.target.anchor.navigation_only, true);
		assert.equal(report.target.anchor.can_instruct_agent, false);
		assert.equal(report.target.path, 'src/anchored.ts');
		assert.equal(report.target.resolved_start_line, 10);
		assert.equal(report.target.resolved_end_line, 12);
		assert.equal(report.target.context_start_line, 9);
		assert.equal(report.target.context_end_line, 13);
		assert.equal(report.target.symbol.name, 'resolveSession');
		assert.equal(report.target.symbol.return_type, 'string');
		assert.equal(report.target.symbol.return_preview, 'token.trim()');
		assert.equal(report.snippet.start_line, 9);
		assert.equal(report.snippet.end_line, 13);
		assert.match(report.snippet.text, /export function resolveSession/u);
		assert.doesNotMatch(report.snippet.text, /const before = 1/u);
	} finally {
		removeTempProject(projectPath);
	}
});

test('code-symbol-read resolves Go, Rust, and Python symbols by start line', () => {
	const projectPath = createTempProject();

	try {
		initProject(projectPath);
		mkdirSync(path.join(projectPath, 'src'));
		writeFileSync(
			path.join(projectPath, 'src', 'service.go'),
			[
				'package demo',
				'',
				'func ResolveSession(token string) (string, error) {',
				'  return token, nil',
				'}',
				'',
			].join('\n'),
		);
		writeFileSync(
			path.join(projectPath, 'src', 'service.rs'),
			[
				'pub fn resolve_session(token: &str) -> Result<String, Error> {',
				'    Ok(token.to_owned())',
				'}',
				'',
			].join('\n'),
		);
		writeFileSync(
			path.join(projectPath, 'src', 'service.py'),
			[
				'async def resolve_session(token: str) -> str:',
				'    return token.strip()',
				'',
			].join('\n'),
		);

		const cases = [
			{
				path: 'src/service.go',
				startLine: '3',
				language: 'go',
				name: 'ResolveSession',
				returnType: '(string, error)',
				returnPreview: 'token, nil',
			},
			{
				path: 'src/service.rs',
				startLine: '1',
				language: 'rust',
				name: 'resolve_session',
				returnType: 'Result<String, Error>',
				returnPreview: 'Ok(token.to_owned())',
			},
			{
				path: 'src/service.py',
				startLine: '1',
				language: 'python',
				name: 'resolve_session',
				returnType: 'str',
				returnPreview: 'token.strip()',
			},
		];

		for (const testCase of cases) {
			const { result, report } = runCodeSymbolReadJson(projectPath, [
				testCase.path,
				'--start-line',
				testCase.startLine,
			]);

			assert.equal(result.status, 0, `${testCase.path}: ${result.stderr || result.stdout}`);
			assert.equal(report.target.language, testCase.language, testCase.path);
			assert.equal(report.target.symbol.name, testCase.name, testCase.path);
			assert.equal(report.target.symbol.return_type, testCase.returnType, testCase.path);
			assert.equal(report.target.symbol.return_behavior, 'value', testCase.path);
			assert.equal(report.target.symbol.return_preview, testCase.returnPreview, testCase.path);
			assert.match(report.snippet.text, new RegExp(testCase.name, 'u'), testCase.path);
		}
	} finally {
		removeTempProject(projectPath);
	}
});

test('code-symbol-read resolves Astro and Svelte embedded symbols by start line', () => {
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
				'---',
				'<h1>{loadThing("ok")}</h1>',
				'',
			].join('\n'),
		);
		writeFileSync(
			path.join(projectPath, 'src', 'Card.svelte'),
			[
				'<script lang="ts">',
				'  export function makeTitle(value: string): string {',
				'    return value.trim();',
				'  }',
				'</script>',
				'',
				'<h1>{makeTitle("ok")}</h1>',
				'',
			].join('\n'),
		);

		const cases = [
			{
				path: 'src/Card.astro',
				startLine: '2',
				language: 'astro',
				name: 'loadThing',
				returnPreview: 'id.trim()',
				contextStartLine: 1,
				contextEndLine: 5,
				boundaryPattern: /^---/u,
			},
			{
				path: 'src/Card.svelte',
				startLine: '2',
				language: 'svelte',
				name: 'makeTitle',
				returnPreview: 'value.trim()',
				contextStartLine: 1,
				contextEndLine: 5,
				boundaryPattern: /^<script lang="ts">/u,
			},
		];

		for (const testCase of cases) {
			const { result, report } = runCodeSymbolReadJson(projectPath, [
				testCase.path,
				'--start-line',
				testCase.startLine,
				'--context-lines',
				'1',
			]);

			assert.equal(result.status, 0, `${testCase.path}: ${result.stderr || result.stdout}`);
			assert.equal(report.target.language, testCase.language, testCase.path);
			assert.equal(report.target.symbol.name, testCase.name, testCase.path);
			assert.equal(report.target.symbol.return_type, 'string', testCase.path);
			assert.equal(report.target.symbol.return_behavior, 'value', testCase.path);
			assert.equal(report.target.symbol.return_preview, testCase.returnPreview, testCase.path);
			assert.equal(report.target.context_start_line, testCase.contextStartLine, testCase.path);
			assert.equal(report.target.context_end_line, testCase.contextEndLine, testCase.path);
			assert.match(report.snippet.text, testCase.boundaryPattern, testCase.path);
			assert.match(report.snippet.text, new RegExp(testCase.name, 'u'), testCase.path);
		}
	} finally {
		removeTempProject(projectPath);
	}
});

test('code-symbol-read resolves Go, Rust, and Python source anchors to target symbols', () => {
	const projectPath = createTempProject();

	try {
		initProject(projectPath);
		mkdirSync(path.join(projectPath, 'src'));
		writeFileSync(
			path.join(projectPath, 'src', 'anchored.go'),
			[
				'package demo',
				'',
				'// mf:anchor service.go.resolve',
				'// purpose: Resolve Go session.',
				'// search: go, session',
				'// risk: security',
				'func ResolveSession(token string) (string, error) {',
				'  return token, nil',
				'}',
				'',
			].join('\n'),
		);
		writeFileSync(
			path.join(projectPath, 'src', 'anchored.rs'),
			[
				'// mf:anchor service.rust.resolve',
				'// purpose: Resolve Rust session.',
				'// search: rust, session',
				'// risk: security',
				'pub fn resolve_session(token: &str) -> Result<String, Error> {',
				'    Ok(token.to_owned())',
				'}',
				'',
			].join('\n'),
		);
		writeFileSync(
			path.join(projectPath, 'src', 'anchored.py'),
			[
				'# mf:anchor service.python.resolve',
				'# purpose: Resolve Python session.',
				'# search: python, session',
				'# risk: security',
				'# Keep this nearby comment bridge readable for agents.',
				'async def resolve_session(token: str) -> str:',
				'    return token.strip()',
				'',
			].join('\n'),
		);

		const cases = [
			{
				anchor: 'service.go.resolve',
				path: 'src/anchored.go',
				language: 'go',
				name: 'ResolveSession',
				startLine: 7,
				returnPreview: 'token, nil',
			},
			{
				anchor: 'service.rust.resolve',
				path: 'src/anchored.rs',
				language: 'rust',
				name: 'resolve_session',
				startLine: 5,
				returnPreview: 'Ok(token.to_owned())',
			},
			{
				anchor: 'service.python.resolve',
				path: 'src/anchored.py',
				language: 'python',
				name: 'resolve_session',
				startLine: 6,
				returnPreview: 'token.strip()',
			},
		];

		for (const testCase of cases) {
			const { result, report } = runCodeSymbolReadJson(projectPath, [
				'--anchor',
				testCase.anchor,
				'--context-lines',
				'0',
			]);

			assert.equal(result.status, 0, `${testCase.anchor}: ${result.stderr || result.stdout}`);
			assert.equal(report.target.path, testCase.path, testCase.anchor);
			assert.equal(report.target.language, testCase.language, testCase.anchor);
			assert.equal(report.target.anchor.id, testCase.anchor, testCase.anchor);
			assert.equal(report.target.anchor.target_name, testCase.name, testCase.anchor);
			assert.equal(report.target.resolved_start_line, testCase.startLine, testCase.anchor);
			assert.equal(report.target.symbol.name, testCase.name, testCase.anchor);
			assert.equal(report.target.symbol.return_behavior, 'value', testCase.anchor);
			assert.equal(report.target.symbol.return_preview, testCase.returnPreview, testCase.anchor);
			assert.match(report.snippet.text, new RegExp(testCase.name, 'u'), testCase.anchor);
		}
	} finally {
		removeTempProject(projectPath);
	}
});

test('code-symbol-read resolves Astro and Svelte source anchors to embedded symbols', () => {
	const projectPath = createTempProject();

	try {
		initProject(projectPath);
		mkdirSync(path.join(projectPath, 'src'));
		writeFileSync(
			path.join(projectPath, 'src', 'Anchored.astro'),
			[
				'---',
				'// mf:anchor astro.load.thing',
				'// purpose: Resolve Astro data.',
				'// search: astro, load',
				'// risk: security',
				'export function loadThing(id: string): string {',
				'  return id.trim();',
				'}',
				'---',
				'<h1>{loadThing("ok")}</h1>',
				'',
			].join('\n'),
		);
		writeFileSync(
			path.join(projectPath, 'src', 'Anchored.svelte'),
			[
				'<script lang="ts">',
				'  // mf:anchor svelte.load.thing',
				'  // purpose: Resolve Svelte data.',
				'  // search: svelte, load',
				'  // risk: security',
				'  export function loadThing(id: string): string {',
				'    return id.trim();',
				'  }',
				'</script>',
				'',
			].join('\n'),
		);

		const cases = [
			{
				anchor: 'astro.load.thing',
				path: 'src/Anchored.astro',
				language: 'astro',
				name: 'loadThing',
				startLine: 6,
				returnPreview: 'id.trim()',
			},
			{
				anchor: 'svelte.load.thing',
				path: 'src/Anchored.svelte',
				language: 'svelte',
				name: 'loadThing',
				startLine: 6,
				returnPreview: 'id.trim()',
			},
		];

		for (const testCase of cases) {
			const { result, report } = runCodeSymbolReadJson(projectPath, [
				'--anchor',
				testCase.anchor,
				'--context-lines',
				'0',
			]);

			assert.equal(result.status, 0, `${testCase.anchor}: ${result.stderr || result.stdout}`);
			assert.equal(report.target.path, testCase.path, testCase.anchor);
			assert.equal(report.target.language, testCase.language, testCase.anchor);
			assert.equal(report.target.anchor.id, testCase.anchor, testCase.anchor);
			assert.equal(report.target.anchor.target_name, testCase.name, testCase.anchor);
			assert.equal(report.target.resolved_start_line, testCase.startLine, testCase.anchor);
			assert.equal(report.target.symbol.name, testCase.name, testCase.anchor);
			assert.equal(report.target.symbol.return_type, 'string', testCase.anchor);
			assert.equal(report.target.symbol.return_behavior, 'value', testCase.anchor);
			assert.equal(report.target.symbol.return_preview, testCase.returnPreview, testCase.anchor);
			assert.match(report.snippet.text, new RegExp(testCase.name, 'u'), testCase.anchor);
		}
	} finally {
		removeTempProject(projectPath);
	}
});

test('code-symbol-read rejects source anchors without a target symbol', () => {
	const projectPath = createTempProject();

	try {
		initProject(projectPath);
		mkdirSync(path.join(projectPath, 'src'));
		writeFileSync(
			path.join(projectPath, 'src', 'floating.ts'),
			[
				'/**',
				' * mf:anchor auth.session.floating',
				' * purpose: This anchor intentionally has no declaration target.',
				' * search: auth, floating',
				' * risk: security',
				' */',
				'const ordinaryValue = 1;',
				'',
			].join('\n'),
		);

		const { result, report } = runCodeSymbolReadJson(projectPath, ['--anchor', 'auth.session.floating']);

		assert.equal(result.status, 1, result.stderr || result.stdout);
		assert.equal(report.status, 'error');
		assert.equal(report.ok, false);
		assert.equal(report.target.anchor.id, 'auth.session.floating');
		assert.equal(report.target.resolved_start_line, null);
		assert.equal(report.target.symbol, null);
		assert.equal(report.snippet, null);
		assert.equal(report.findings[0].code, 'code_symbol_read_anchor_without_symbol');
	} finally {
		removeTempProject(projectPath);
	}
});

test('code-symbol-read rejects mixing source-anchor and explicit line selection modes', () => {
	const projectPath = createTempProject();

	try {
		initProject(projectPath);
		mkdirSync(path.join(projectPath, 'src'));
		writeFileSync(path.join(projectPath, 'src', 'sample.ts'), 'export const one = 1;\n');

		const result = runCli(projectPath, [
			'script-pack',
			'run',
			'code/symbol-read',
			'read',
			'src/sample.ts',
			'--anchor',
			'auth.session.resolve',
			'--start-line',
			'1',
		]);

		assert.equal(result.status, 1);
		assert.match(result.stderr, /Use either --anchor <id> or <path> with --start-line/);
	} finally {
		removeTempProject(projectPath);
	}
});

test('code-symbol-read can read an explicit line range when no symbol starts there', () => {
	const projectPath = createTempProject();

	try {
		initProject(projectPath);
		mkdirSync(path.join(projectPath, 'src'));
		writeFileSync(path.join(projectPath, 'src', 'sample.js'), 'const one = 1;\nconst two = 2;\n');

		const { result, report } = runCodeSymbolReadJson(projectPath, [
			'src/sample.js',
			'--start-line',
			'1',
			'--end-line',
			'1',
		]);

		assert.equal(result.status, 0, result.stderr || result.stdout);
		assert.equal(report.target.language, 'javascript');
		assert.equal(report.target.symbol, null);
		assert.equal(report.snippet.text, 'const one = 1;');
	} finally {
		removeTempProject(projectPath);
	}
});

test('code-symbol-read rejects explicit ranges outside the file', () => {
	const projectPath = createTempProject();

	try {
		initProject(projectPath);
		mkdirSync(path.join(projectPath, 'src'));
		writeFileSync(path.join(projectPath, 'src', 'sample.ts'), 'export const one = 1;\n');

		const { result, report } = runCodeSymbolReadJson(projectPath, [
			'src/sample.ts',
			'--start-line',
			'10',
			'--end-line',
			'10',
		]);

		assert.equal(result.status, 1, result.stderr || result.stdout);
		assert.equal(report.status, 'error');
		assert.equal(report.ok, false);
		assert.equal(report.target, null);
		assert.equal(report.snippet, null);
		assert.equal(report.findings[0].code, 'code_symbol_read_invalid_range');
		assert.equal(report.findings[0].start_line, 10);
		assert.equal(report.findings[0].end_line, 10);
	} finally {
		removeTempProject(projectPath);
	}
});
