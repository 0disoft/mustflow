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

test('doctor json output matches the published schema', () => {
	const projectPath = createTempProject();

	try {
		initProject(projectPath);
		const result = runCli(projectPath, ['doctor', '--json']);

		assert.equal(result.status, 0, result.stderr || result.stdout);
		assertMatchesSchema(schemaRoot, 'doctor-report.schema.json', JSON.parse(result.stdout));
	} finally {
		removeTempProject(projectPath);
	}
});

test('adapter compatibility json output matches the published schema', () => {
	const projectPath = createTempProject();

	try {
		initProject(projectPath);
		const result = runCli(projectPath, ['adapters', 'status', '--json']);

		assert.equal(result.status, 0, result.stderr || result.stdout);
		assertMatchesSchema(schemaRoot, 'adapter-compatibility-report.schema.json', JSON.parse(result.stdout));
	} finally {
		removeTempProject(projectPath);
	}
});

test('check json output matches the published schema', () => {
	const projectPath = createTempProject();

	try {
		initProject(projectPath);
		const result = runCli(projectPath, ['check', '--json']);

		assert.equal(result.status, 0, result.stderr || result.stdout);
		assertMatchesSchema(schemaRoot, 'check-report.schema.json', JSON.parse(result.stdout));
	} finally {
		removeTempProject(projectPath);
	}
});

test('status json output matches the published schema', () => {
	const projectPath = createTempProject();

	try {
		initProject(projectPath);
		const result = runCli(projectPath, ['status', '--json']);

		assert.equal(result.status, 0, result.stderr || result.stdout);
		assertMatchesSchema(schemaRoot, 'status-report.schema.json', JSON.parse(result.stdout));
	} finally {
		removeTempProject(projectPath);
	}
});

test('context json output matches the published schema', () => {
	const projectPath = createTempProject();

	try {
		initProject(projectPath);
		const result = runCli(projectPath, ['context', '--json']);

		assert.equal(result.status, 0, result.stderr || result.stdout);
		assertMatchesSchema(schemaRoot, 'context-report.schema.json', JSON.parse(result.stdout));
	} finally {
		removeTempProject(projectPath);
	}
});

test('context cache-profile json output matches the published schema', () => {
	const projectPath = createTempProject();

	try {
		initProject(projectPath);
		const result = runCli(projectPath, ['context', '--json', '--cache-profile', 'all']);

		assert.equal(result.status, 0, result.stderr || result.stdout);
		assertMatchesSchema(schemaRoot, 'context-report.schema.json', JSON.parse(result.stdout));
	} finally {
		removeTempProject(projectPath);
	}
});

test('context cache-audit json output matches the published schema', () => {
	const projectPath = createTempProject();

	try {
		initProject(projectPath);
		const result = runCli(projectPath, ['context', '--json', '--cache-audit']);
		const report = JSON.parse(result.stdout);

		assert.equal(result.status, 0, result.stderr || result.stdout);
		assertMatchesSchema(schemaRoot, 'context-report.schema.json', report);
		assert.equal(report.cache_audit.summary.serialization_deterministic, true);
		assert.equal(report.cache_audit.summary.volatile_before_stable_count, 0);
		assert.equal(report.cache_audit.summary.stable_leaf_skill_isolated, true);
		assert.deepEqual(report.cache_audit.summary.stable_leaf_skill_risk_paths, []);
		assert.equal(report.cache_audit.summary.leaf_skill_change_stable_hash_delta, 0);
		assert.equal(typeof report.cache_audit.summary.measured_block_count, 'number');
		assert.equal(typeof report.cache_audit.summary.dynamic_source_count, 'number');
		assert.equal(typeof report.cache_audit.summary.unresolved_reference_count, 'number');
	} finally {
		removeTempProject(projectPath);
	}
});

test('context route-selected cache-audit json output matches the published schema', () => {
	const projectPath = createTempProject();

	try {
		initProject(projectPath);
		const result = runCli(projectPath, [
			'context',
			'--json',
			'--cache-audit',
			'--task',
			'Change TypeScript CLI output and tests',
			'--path',
			'src/cli/commands/context.ts',
			'--reason',
			'code_change',
		]);
		const report = JSON.parse(result.stdout);
		const taskBundle = report.prompt_bundle.layers.find((layer) => layer.cache_layer === 'task');
		const taskAudit = report.cache_audit.layers.find((layer) => layer.cache_layer === 'task');
		const bundleRouteCandidatesBlock = taskBundle.blocks.find((block) => block.source === 'skill_route_candidates');
		const auditRouteCandidatesBlock = taskAudit.blocks.find((block) => block.source === 'skill_route_candidates');

		assert.equal(result.status, 0, result.stderr || result.stdout);
		assertMatchesSchema(schemaRoot, 'context-report.schema.json', report);
		assert.equal(bundleRouteCandidatesBlock.kind, 'source_placeholder');
		assert.equal(bundleRouteCandidatesBlock.source_kind, 'dynamic_selection');
		assert.equal(bundleRouteCandidatesBlock.selection_policy, 'selected_at_runtime');
		assert.equal(bundleRouteCandidatesBlock.issue, null);
		assert.ok(bundleRouteCandidatesBlock.rendered_bytes > 0);
		assert.match(bundleRouteCandidatesBlock.content_hash, /^sha256:[a-f0-9]{64}$/u);
		assert.match(bundleRouteCandidatesBlock.rendered_digest, /^sha256:[a-f0-9]{64}$/u);
		assert.equal(auditRouteCandidatesBlock.measurement_status, 'measured');
		assert.equal(auditRouteCandidatesBlock.issue, null);
		assert.ok(auditRouteCandidatesBlock.rendered_bytes > 0);
		assert.match(auditRouteCandidatesBlock.content_hash, /^sha256:[a-f0-9]{64}$/u);
	} finally {
		removeTempProject(projectPath);
	}
});

test('context cache-compare json output matches the published schema', () => {
	const projectPath = createTempProject();

	try {
		initProject(projectPath);
		const baseline = runCli(projectPath, ['context', '--json', '--cache-profile', 'all']);
		assert.equal(baseline.status, 0, baseline.stderr || baseline.stdout);
		const baselinePath = path.join(projectPath, '.mustflow', 'cache', 'schema-baseline-context.json');
		mkdirSync(path.dirname(baselinePath), { recursive: true });
		writeFileSync(baselinePath, baseline.stdout);

		const result = runCli(projectPath, [
			'context',
			'--json',
			'--cache-profile',
			'all',
			'--cache-compare',
			'.mustflow/cache/schema-baseline-context.json',
		]);

		const report = JSON.parse(result.stdout);
		assert.equal(result.status, 0, result.stderr || result.stdout);
		assertMatchesSchema(schemaRoot, 'context-report.schema.json', report);
		assert.equal(report.prompt_bundle_diff.stable_diff.baseline_stable_block_count, 2);
		assert.equal(report.prompt_bundle_diff.stable_diff.stable_prefix_preserved, true);
		assert.equal(report.prompt_bundle_diff.stable_diff.first_stable_invalidation_reason, null);
	} finally {
		removeTempProject(projectPath);
	}
});

test('context cache-compare reports stable prefix invalidation', () => {
	const projectPath = createTempProject();

	try {
		initProject(projectPath);
		const baseline = runCli(projectPath, ['context', '--json', '--cache-profile', 'all']);
		assert.equal(baseline.status, 0, baseline.stderr || baseline.stdout);
		const baselinePath = path.join(projectPath, '.mustflow', 'cache', 'schema-baseline-context.json');
		mkdirSync(path.dirname(baselinePath), { recursive: true });
		writeFileSync(baselinePath, baseline.stdout);
		const agentsPath = path.join(projectPath, 'AGENTS.md');
		writeFileSync(agentsPath, `${readFileSync(agentsPath, 'utf8')}\n\nCache compare drift fixture.\n`);

		const result = runCli(projectPath, [
			'context',
			'--json',
			'--cache-profile',
			'all',
			'--cache-compare',
			'.mustflow/cache/schema-baseline-context.json',
		]);
		const report = JSON.parse(result.stdout);

		assert.equal(result.status, 0, result.stderr || result.stdout);
		assertMatchesSchema(schemaRoot, 'context-report.schema.json', report);
		assert.equal(report.prompt_bundle_diff.stable_diff.stable_prefix_preserved, false);
		assert.equal(report.prompt_bundle_diff.stable_diff.first_stable_difference.cache_layer, 'stable');
		assert.match(
			report.prompt_bundle_diff.stable_diff.first_stable_invalidation_reason,
			/stable prefix block 1 changed at stable:1:AGENTS\.md/u,
		);
	} finally {
		removeTempProject(projectPath);
	}
});

test('run receipt json output matches the published schema', () => {
	const projectPath = createTempProject();

	try {
		initProject(projectPath);
		appendIntent(
			projectPath,
			`
[intents.echo_schema]
status = "configured"
lifecycle = "oneshot"
run_policy = "agent_allowed"
description = "Print a schema test message."
argv = ['${process.execPath}', '-e', 'console.log("schema receipt")']
cwd = "."
timeout_seconds = 10
stdin = "closed"
success_exit_codes = [0]
writes = []
network = false
destructive = false
`,
		);

		const result = runCli(projectPath, ['run', 'echo_schema', '--json']);

		assert.equal(result.status, 0, result.stderr || result.stdout);
		assertMatchesSchema(schemaRoot, 'run-receipt.schema.json', JSON.parse(result.stdout));
	} finally {
		removeTempProject(projectPath);
	}
});

test('contract lint json output matches the published schema', () => {
	const projectPath = createTempProject();

	try {
		initProject(projectPath);
		const result = runCli(projectPath, ['contract-lint', '--json']);

		assert.equal(result.status, 0, result.stderr || result.stdout);
		assertMatchesSchema(schemaRoot, 'contract-lint-report.schema.json', JSON.parse(result.stdout));
	} finally {
		removeTempProject(projectPath);
	}
});

test('contract lint coverage json output matches the published schema', () => {
	const projectPath = createTempProject();

	try {
		initProject(projectPath);
		const result = runCli(projectPath, ['contract-lint', '--coverage', '--json']);

		assert.equal(result.status, 0, result.stderr || result.stdout);
		assertMatchesSchema(schemaRoot, 'contract-lint-report.schema.json', JSON.parse(result.stdout));
	} finally {
		removeTempProject(projectPath);
	}
});

test('contract lint suggestion json output matches the published schema', () => {
	const projectPath = createTempProject();

	try {
		initProject(projectPath);
		writeFileSync(
			path.join(projectPath, 'package.json'),
			`${JSON.stringify({ name: 'example', scripts: { test: 'node --test' } }, null, 2)}\n`,
		);
		const result = runCli(projectPath, ['contract-lint', '--suggest', '--json']);

		assert.equal(result.status, 0, result.stderr || result.stdout);
		assertMatchesSchema(schemaRoot, 'contract-lint-report.schema.json', JSON.parse(result.stdout));
	} finally {
		removeTempProject(projectPath);
	}
});

test('onboard commands json output matches the published schema', () => {
	const projectPath = createTempProject();

	try {
		initProject(projectPath);
		writeFileSync(
			path.join(projectPath, 'package.json'),
			`${JSON.stringify({ name: 'example', scripts: { test: 'node --test' } }, null, 2)}\n`,
		);
		const result = runCli(projectPath, ['onboard', 'commands', '--json']);

		assert.equal(result.status, 0, result.stderr || result.stdout);
		assertMatchesSchema(schemaRoot, 'onboard-commands-report.schema.json', JSON.parse(result.stdout));
	} finally {
		removeTempProject(projectPath);
	}
});

test('next json output matches the published schema', () => {
	const projectPath = createTempProject();

	try {
		initProject(projectPath);
		commitGitBaseline(projectPath);
		const result = runCli(projectPath, ['next', '--json']);

		assert.equal(result.status, 0, result.stderr || result.stdout);
		assertMatchesSchema(schemaRoot, 'next-report.schema.json', JSON.parse(result.stdout));
	} finally {
		removeTempProject(projectPath);
	}
});

test('evidence json output matches the published schema', () => {
	const projectPath = createTempProject();

	try {
		initProject(projectPath);
		const schemaRoot = path.join(projectRoot, 'schemas');
		const result = runCli(projectPath, ['evidence', '--latest', '--json']);

		assert.equal(result.status, 1);
		assertMatchesSchema(schemaRoot, 'evidence-report.schema.json', JSON.parse(result.stdout));
	} finally {
		removeTempProject(projectPath);
	}
});

test('dashboard export json output matches the published schema', () => {
	const projectPath = createTempProject();

	try {
		initProject(projectPath);
		const result = runCli(projectPath, ['dashboard', '--export-json', '.mustflow/state/artifacts/dashboard.json']);

		assert.equal(result.status, 0, result.stderr || result.stdout);
		const exportPath = path.join(projectPath, '.mustflow', 'state', 'artifacts', 'dashboard.json');
		assertMatchesSchema(schemaRoot, 'dashboard-export.schema.json', JSON.parse(readFileSync(exportPath, 'utf8')));
	} finally {
		removeTempProject(projectPath);
	}
});

test('version sources json output matches the published schema', () => {
	const projectPath = createTempProject();

	try {
		initProject(projectPath);
		const result = runCli(projectPath, ['version-sources', '--json']);

		assert.equal(result.status, 0, result.stderr || result.stdout);
		assertMatchesSchema(schemaRoot, 'version-sources-report.schema.json', JSON.parse(result.stdout));
	} finally {
		removeTempProject(projectPath);
	}
});

test('classify json output matches the published schema', () => {
	const projectPath = createTempProject();

	try {
		initProject(projectPath);
		const result = runCli(projectPath, ['classify', 'README.md', 'schemas/classify-report.schema.json', '--json']);

		assert.equal(result.status, 0, result.stderr || result.stdout);
		assertMatchesSchema(schemaRoot, 'classify-report.schema.json', JSON.parse(result.stdout));
	} finally {
		removeTempProject(projectPath);
	}
});

test('impact json output matches the published schema', () => {
	const projectPath = createTempProject();

	try {
		initProject(projectPath);
		const result = runCli(projectPath, ['impact', 'package.json', 'schemas/impact-report.schema.json', '--json']);

		assert.equal(result.status, 0, result.stderr || result.stdout);
		assertMatchesSchema(schemaRoot, 'impact-report.schema.json', JSON.parse(result.stdout));
	} finally {
		removeTempProject(projectPath);
	}
});

test('line-endings json output matches the published schema', () => {
	const projectPath = createTempProject();

	try {
		initProject(projectPath);
		const result = runCli(projectPath, ['line-endings', 'check', '--json']);

		assert.equal(result.status, 1, result.stderr || result.stdout);
		assertMatchesSchema(schemaRoot, 'line-endings-report.schema.json', JSON.parse(result.stdout));
	} finally {
		removeTempProject(projectPath);
	}
});

test('quality json output matches the published schema', () => {
	const projectPath = createTempProject();

	try {
		initProject(projectPath);
		commitGitBaseline(projectPath);
		const result = runCli(projectPath, ['quality', 'check', '--json']);

		assert.equal(result.status, 0, result.stderr || result.stdout);
		assertMatchesSchema(schemaRoot, 'quality-gaming-report.schema.json', JSON.parse(result.stdout));
	} finally {
		removeTempProject(projectPath);
	}
});

test('script-pack catalog json output matches the published schema', () => {
	const projectPath = createTempProject();

	try {
		initProject(projectPath);
		const result = runCli(projectPath, ['script-pack', 'list', '--json']);

		assert.equal(result.status, 0, result.stderr || result.stdout);
		assertMatchesSchema(schemaRoot, 'script-pack-catalog.schema.json', JSON.parse(result.stdout));
	} finally {
		removeTempProject(projectPath);
	}
});

test('index json output matches the published schema', () => {
	const projectPath = createTempProject();

	try {
		initProject(projectPath);
		const result = runCli(projectPath, ['index', '--dry-run', '--json']);

		assert.equal(result.status, 0, result.stderr || result.stdout);
		assertMatchesSchema(schemaRoot, 'index-report.schema.json', JSON.parse(result.stdout));
	} finally {
		removeTempProject(projectPath);
	}
});

test('search json output matches the published schema', () => {
	const projectPath = createTempProject();

	try {
		initProject(projectPath);
		const result = runCli(projectPath, ['search', 'mustflow', '--json']);

		assert.equal(result.status, 0, result.stderr || result.stdout);
		assertMatchesSchema(schemaRoot, 'search-report.schema.json', JSON.parse(result.stdout));
	} finally {
		removeTempProject(projectPath);
	}
});

test('script-pack suggestion json output matches the published schema', () => {
	const projectPath = createTempProject();

	try {
		initProject(projectPath);
		const result = runCli(projectPath, [
			'script-pack',
			'suggest',
			'--path',
			'AGENTS.md',
			'--phase',
			'before_change',
			'--json',
		]);

		assert.equal(result.status, 0, result.stderr || result.stdout);
		assertMatchesSchema(schemaRoot, 'script-pack-suggestion-report.schema.json', JSON.parse(result.stdout));
	} finally {
		removeTempProject(projectPath);
	}
});
