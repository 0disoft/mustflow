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

test('version-source reports detected repository version sources', () => {
	const projectPath = createTempProject();

	try {
		initProject(projectPath);
		const result = runCli(projectPath, ['script-pack', 'run', 'repo/version-source', 'inspect', '--json']);
		const report = JSON.parse(result.stdout);

		assert.equal(result.status, 0, result.stderr || result.stdout);
		assert.equal(report.command, 'script-pack');
		assert.equal(report.script_ref, 'repo/version-source');
		assert.equal(report.action, 'inspect');
		assert.equal(report.status, 'passed');
		assert.equal(report.ok, true);
		assert.equal(report.versioning_enabled, true);
		assert.ok(report.sources.some((source) => source.path === '.mustflow/config/manifest.lock.toml'));
		assert.equal(report.counts.sources, report.sources.length);
		assert.match(report.input_hash, /^sha256:[a-f0-9]{64}$/u);
		assert.deepEqual(report.findings, []);
	} finally {
		removeTempProject(projectPath);
	}
});

test('toolchain-provenance reports runtime and lockfile provenance drift', () => {
	const projectPath = createTempProject();

	try {
		initProject(projectPath);
		writeFileSync(path.join(projectPath, '.nvmrc'), '18\n');
		writeFileSync(path.join(projectPath, '.node-version'), '20\n');
		writeFileSync(path.join(projectPath, 'bun.lock'), '{}\n');
		writeFileSync(path.join(projectPath, 'package-lock.json'), '{}\n');

		const { result, report } = runRepoToolchainProvenanceJson(projectPath);

		assert.equal(result.status, 1, result.stderr || result.stdout);
		assert.equal(report.command, 'script-pack');
		assert.equal(report.script_ref, 'repo/toolchain-provenance');
		assert.equal(report.action, 'inspect');
		assert.equal(report.status, 'failed');
		assert.equal(report.ok, false);
		assert.ok(report.sources.some((source) => source.path === '.nvmrc' && source.kind === 'node'));
		assert.ok(report.sources.some((source) => source.path === '.node-version' && source.kind === 'node'));
		assert.ok(report.lockfiles.includes('bun.lock'));
		assert.ok(report.lockfiles.includes('package-lock.json'));
		assert.ok(report.findings.some((finding) => finding.code === 'conflicting_node_version_sources'));
		assert.ok(report.findings.some((finding) => finding.code === 'conflicting_package_manager_lockfiles'));
		assert.match(report.input_hash, /^sha256:[a-f0-9]{64}$/u);
	} finally {
		removeTempProject(projectPath);
	}
});

test('automation-surface inventories command surfaces and risky raw automation', () => {
	const projectPath = createTempProject();

	try {
		initProject(projectPath);
		writeFileSync(
			path.join(projectPath, 'package.json'),
			`${JSON.stringify(
				{
					name: 'automation-surface-probe',
					version: '1.0.0',
					scripts: {
						dev: 'vite --host 0.0.0.0',
						deploy: 'gh release create v1.0.0',
						test: 'vitest run',
					},
				},
				null,
				2,
			)}\n`,
		);

		const { result, report } = runRepoAutomationSurfaceJson(projectPath);

		assert.equal(result.status, 1, result.stderr || result.stdout);
		assert.equal(report.command, 'script-pack');
		assert.equal(report.script_ref, 'repo/automation-surface');
		assert.equal(report.action, 'inspect');
		assert.equal(report.status, 'failed');
		assert.equal(report.ok, false);
		assert.ok(report.summary.mustflow_intent_count > 0);
		assert.ok(report.surfaces.some((surface) => surface.kind === 'package_script' && surface.name === 'dev'));
		assert.ok(report.surfaces.some((surface) => surface.name === 'dev' && surface.risks.includes('long_running')));
		assert.ok(report.surfaces.some((surface) => surface.name === 'deploy' && surface.risks.includes('release')));
		assert.ok(report.findings.some((finding) => finding.code === 'dangerous_automation_surface'));
		assert.match(report.input_hash, /^sha256:[a-f0-9]{64}$/u);
	} finally {
		removeTempProject(projectPath);
	}
});

test('dependency-surface reports lockfile conflicts and missing policy evidence', () => {
	const projectPath = createTempProject();

	try {
		initProject(projectPath);
		writeFileSync(path.join(projectPath, 'package-lock.json'), '{}\n');
		writeFileSync(path.join(projectPath, 'pnpm-lock.yaml'), 'lockfileVersion: 9\n');
		mkdirSync(path.join(projectPath, '.github'), { recursive: true });
		writeFileSync(
			path.join(projectPath, '.github', 'dependabot.yml'),
			['version: 2', 'updates:', '  - package-ecosystem: npm', '    directory: "/"', '    schedule:', '      interval: weekly', ''].join('\n'),
		);

		const { result, report } = runRepoDependencySurfaceJson(projectPath);

		assert.equal(result.status, 1, result.stderr || result.stdout);
		assert.equal(report.command, 'script-pack');
		assert.equal(report.script_ref, 'repo/dependency-surface');
		assert.equal(report.action, 'inspect');
		assert.equal(report.status, 'failed');
		assert.equal(report.ok, false);
		assert.ok(report.surfaces.some((surface) => surface.kind === 'dependency_update_config'));
		assert.ok(report.surfaces.some((surface) => surface.path === 'package-lock.json'));
		assert.ok(report.surfaces.some((surface) => surface.path === 'pnpm-lock.yaml'));
		assert.ok(report.findings.some((finding) => finding.code === 'conflicting_javascript_lockfiles'));
		assert.ok(report.findings.some((finding) => finding.code === 'update_automation_without_policy'));
		assert.match(report.input_hash, /^sha256:[a-f0-9]{64}$/u);
	} finally {
		removeTempProject(projectPath);
	}
});

test('approval-gate reports actions that require explicit approval', () => {
	const projectPath = createTempProject();

	try {
		initProject(projectPath);
		const { result, report } = runRepoApprovalGateJson(projectPath, [
			'--action',
			'git_commit',
			'--action',
			'status_check',
		]);

		assert.equal(result.status, 1, result.stderr || result.stdout);
		assert.equal(report.command, 'script-pack');
		assert.equal(report.script_ref, 'repo/approval-gate');
		assert.equal(report.action, 'check');
		assert.equal(report.status, 'failed');
		assert.equal(report.ok, false);
		assert.equal(report.approval_required, true);
		assert.deepEqual(report.input.action_types, ['git_commit', 'status_check']);
		assert.ok(report.policy.required_for.includes('git_commit'));
		assert.equal(report.decisions.find((decision) => decision.action_type === 'git_commit')?.approval_required, true);
		assert.equal(report.decisions.find((decision) => decision.action_type === 'status_check')?.approval_required, false);
		assert.equal(report.findings[0].code, 'approval_required_for_action');
		assert.match(report.input_hash, /^sha256:[a-f0-9]{64}$/u);
		assert.deepEqual(report.issues, []);
	} finally {
		removeTempProject(projectPath);
	}
});

test('deploy-surface reports no deploy surface for a minimal repository', () => {
	const projectPath = createTempProject();

	try {
		initProject(projectPath);
		const { result, report } = runRepoDeploySurfaceJson(projectPath);

		assert.equal(result.status, 0, result.stderr || result.stdout);
		assert.equal(report.command, 'script-pack');
		assert.equal(report.script_ref, 'repo/deploy-surface');
		assert.equal(report.action, 'inspect');
		assert.equal(report.status, 'passed');
		assert.equal(report.ok, true);
		assert.equal(report.has_deploy_surface, false);
		assert.equal(report.summary.surface_count, 0);
		assert.deepEqual(report.surfaces, []);
		assert.deepEqual(report.required_verification, []);
		assert.deepEqual(report.manual_gates, []);
		assert.match(report.input_hash, /^sha256:[a-f0-9]{64}$/u);
		assert.deepEqual(report.issues, []);
	} finally {
		removeTempProject(projectPath);
	}
});

test('deploy-surface detects npm publish and GitHub Pages workflows', () => {
	const projectPath = createTempProject();

	try {
		initProject(projectPath);
		mkdirSync(path.join(projectPath, '.github', 'workflows'), { recursive: true });
		writeFileSync(
			path.join(projectPath, '.github', 'workflows', 'release.yml'),
			[
				'name: Release',
				'on:',
				'  push:',
				'    tags: ["v*"]',
				'jobs:',
				'  publish:',
				'    runs-on: ubuntu-latest',
				'    environment: npm',
				'    steps:',
				'      - run: npm publish',
				'',
			].join('\n'),
		);
		writeFileSync(
			path.join(projectPath, '.github', 'workflows', 'pages.yml'),
			[
				'name: Pages',
				'on:',
				'  workflow_dispatch:',
				'permissions:',
				'  pages: write',
				'jobs:',
				'  deploy:',
				'    runs-on: ubuntu-latest',
				'    steps:',
				'      - uses: actions/deploy-pages@v4',
				'',
			].join('\n'),
		);

		const { result, report } = runRepoDeploySurfaceJson(projectPath);

		assert.equal(result.status, 0, result.stderr || result.stdout);
		assert.equal(report.has_deploy_surface, true);
		assert.ok(report.summary.workflow_count >= 2);
		assert.ok(report.surfaces.some((surface) => surface.surface_type === 'npm_publish'));
		assert.ok(report.surfaces.some((surface) => surface.surface_type === 'github_pages'));
		assert.ok(report.required_verification.some((entry) => entry.includes('release_npm_version_available')));
		assert.ok(report.required_verification.some((entry) => entry.includes('published Pages URL')));
		assert.ok(report.manual_gates.some((entry) => entry.includes('npm trusted publishing')));
		assert.ok(report.findings.every((finding) => finding.code === 'deploy_surface_detected'));
	} finally {
		removeTempProject(projectPath);
	}
});

test('deploy-surface detects package scripts and deploy config files', () => {
	const projectPath = createTempProject();

	try {
		initProject(projectPath);
		writeFileSync(
			path.join(projectPath, 'package.json'),
			`${JSON.stringify(
				{
					name: 'deploy-surface-probe',
					version: '1.0.0',
					scripts: {
						deploy: 'wrangler deploy',
						release: 'gh release create v1.0.0',
					},
					publishConfig: { access: 'public' },
				},
				null,
				2,
			)}\n`,
		);
		writeFileSync(path.join(projectPath, 'wrangler.toml'), 'name = "deploy-surface-probe"\n');

		const { result, report } = runRepoDeploySurfaceJson(projectPath);

		assert.equal(result.status, 0, result.stderr || result.stdout);
		assert.equal(report.has_deploy_surface, true);
		assert.ok(report.summary.package_script_count >= 2);
		assert.ok(report.summary.config_file_count >= 1);
		assert.ok(report.summary.package_metadata_count >= 1);
		assert.ok(report.surfaces.some((surface) => surface.kind === 'package_script' && surface.surface_type === 'cloudflare'));
		assert.ok(report.surfaces.some((surface) => surface.kind === 'deploy_config' && surface.surface_type === 'cloudflare'));
		assert.ok(report.surfaces.some((surface) => surface.kind === 'package_metadata' && surface.surface_type === 'npm_publish'));
		assert.ok(report.required_verification.some((entry) => entry.includes('Cloudflare')));
		assert.ok(report.required_verification.some((entry) => entry.includes('release_npm_published_verify')));
	} finally {
		removeTempProject(projectPath);
	}
});

test('merge-conflict-scan reports conflict markers without leaking file content', () => {
	const projectPath = createTempProject();

	try {
		initProject(projectPath);
		mkdirSync(path.join(projectPath, 'src'));
		writeFileSync(
			path.join(projectPath, 'src', 'conflicted.ts'),
			[
				'export const value = "before";',
				'<<<<<<< HEAD',
				'const secret = "do-not-print";',
				'=======',
				'const secret = "also-do-not-print";',
				'>>>>>>> branch',
				'',
			].join('\n'),
		);

		const { result, report } = runRepoMergeConflictScanJson(projectPath, ['src/conflicted.ts']);

		assert.equal(result.status, 1, result.stderr || result.stdout);
		assert.equal(report.command, 'script-pack');
		assert.equal(report.script_ref, 'repo/merge-conflict-scan');
		assert.equal(report.action, 'check');
		assert.equal(report.status, 'failed');
		assert.equal(report.ok, false);
		assert.equal(report.summary.files_checked, 1);
		assert.equal(report.summary.markers_found, 3);
		assert.equal(report.summary.files_with_markers, 1);
		assert.deepEqual(
			report.markers.map((marker) => `${marker.line}:${marker.marker}`),
			['2:start', '4:separator', '6:end'],
		);
		assert.ok(report.findings.every((finding) => finding.code === 'merge_conflict_marker_detected'));
		assert.doesNotMatch(result.stdout, /do-not-print/u);
		assert.match(report.input_hash, /^sha256:[a-f0-9]{64}$/u);
	} finally {
		removeTempProject(projectPath);
	}
});

test('git-ignore-audit reports ignored path evidence without reading ignored file content', () => {
	const projectPath = createTempProject();

	try {
		initProject(projectPath);
		writeFileSync(path.join(projectPath, '.gitignore'), 'secret.local\n');
		commitGitBaseline(projectPath);
		writeFileSync(path.join(projectPath, 'secret.local'), 'DO_NOT_LEAK_IGNORED_CONTENT\n');

		const { result, report } = runRepoGitIgnoreAuditJson(projectPath, ['secret.local']);

		assert.equal(result.status, 1, result.stderr || result.stdout);
		assert.equal(report.command, 'script-pack');
		assert.equal(report.script_ref, 'repo/git-ignore-audit');
		assert.equal(report.action, 'audit');
		assert.equal(report.status, 'failed');
		assert.equal(report.ok, false);
		assert.equal(report.summary.paths_checked, 1);
		assert.equal(report.summary.ignored_paths, 1);
		assert.equal(report.summary.findings, 1);
		assert.equal(report.paths[0].path, 'secret.local');
		assert.equal(report.paths[0].status, 'ignored');
		assert.equal(report.paths[0].ignored, true);
		assert.equal(report.paths[0].tracked, false);
		assert.equal(report.paths[0].source_path, '.gitignore');
		assert.equal(report.paths[0].source_line, 1);
		assert.equal(report.paths[0].pattern, 'secret.local');
		assert.equal(report.findings[0].code, 'git_ignore_audit_ignored_path');
		assert.match(report.input_hash, /^sha256:[a-f0-9]{64}$/u);
		assert.ok(!result.stdout.includes('DO_NOT_LEAK_IGNORED_CONTENT'));
	} finally {
		removeTempProject(projectPath);
	}
});

test('manifest-lock-drift reports clean locked entries and hash mismatches', () => {
	const projectPath = createTempProject();

	try {
		initProject(projectPath);
		const clean = runRepoManifestLockDriftJson(projectPath, ['AGENTS.md']);

		assert.equal(clean.result.status, 0, clean.result.stderr || clean.result.stdout);
		assert.equal(clean.report.command, 'script-pack');
		assert.equal(clean.report.script_ref, 'repo/manifest-lock-drift');
		assert.equal(clean.report.action, 'check');
		assert.equal(clean.report.status, 'passed');
		assert.equal(clean.report.ok, true);
		assert.equal(clean.report.policy.lock_path, '.mustflow/config/manifest.lock.toml');
		assert.equal(clean.report.policy.input_mode, 'explicit_paths');
		assert.equal(clean.report.summary.entries_checked, 1);
		assert.equal(clean.report.entries.find((entry) => entry.path === 'AGENTS.md')?.status, 'clean');
		assert.match(clean.report.input_hash, /^sha256:[a-f0-9]{64}$/u);

		const agentsPath = path.join(projectPath, 'AGENTS.md');
		writeFileSync(agentsPath, `${readFileSync(agentsPath, 'utf8')}\nManifest drift fixture.\n`);
		const drift = runRepoManifestLockDriftJson(projectPath, ['AGENTS.md']);

		assert.equal(drift.result.status, 1, drift.result.stderr || drift.result.stdout);
		assert.equal(drift.report.status, 'failed');
		assert.equal(drift.report.ok, false);
		assert.equal(drift.report.summary.hash_mismatches, 1);
		assert.equal(drift.report.entries.find((entry) => entry.path === 'AGENTS.md')?.status, 'hash_mismatch');
		assert.equal(drift.report.findings[0].code, 'manifest_lock_hash_mismatch');
		assert.match(drift.report.findings[0].expected_hash, /^sha256:[a-f0-9]{64}$/u);
		assert.match(drift.report.findings[0].actual_hash, /^sha256:[a-f0-9]{64}$/u);
	} finally {
		removeTempProject(projectPath);
	}
});

test('manifest-lock-drift reports missing locked files', () => {
	const projectPath = createTempProject();

	try {
		initProject(projectPath);
		unlinkSync(path.join(projectPath, 'AGENTS.md'));
		const { result, report } = runRepoManifestLockDriftJson(projectPath, ['AGENTS.md']);

		assert.equal(result.status, 1, result.stderr || result.stdout);
		assert.equal(report.status, 'error');
		assert.equal(report.ok, false);
		assert.equal(report.summary.missing_entries, 1);
		assert.equal(report.entries.find((entry) => entry.path === 'AGENTS.md')?.status, 'missing');
		assert.equal(report.findings[0].code, 'manifest_lock_entry_missing');
	} finally {
		removeTempProject(projectPath);
	}
});
