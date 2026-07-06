import {
	assert,
	ciWorkflow,
	cliPath,
	cliTestOrdering,
	cliTestRunner,
	cliTestSelection,
	packageJson,
	pathToFileURL,
	projectRoot,
	publishNpmWorkflow,
	readProjectText,
	readPublicJsonContracts,
	readTemplateSkillProfile,
	readTomlStringArrayBlock,
	releaseVersionCheckScript,
	sourceCommandContract,
	spawnSync,
	startNpmReleaseScript,
	supportedTemplateLocales,
	templateCommandContract,
	templateCreates,
	templateManifest,
	templateSkillCreates,
	test,
} from './helpers/package-contracts.js';

test('npm publish workflow uses trusted publisher identity', () => {
	assert.match(publishNpmWorkflow, /push:\s*\n\s+tags:\s*\n\s+- "v\*"/u);
	assert.match(publishNpmWorkflow, /environment: npm/u);
	assert.match(publishNpmWorkflow, /id-token: write/u);
	assert.match(publishNpmWorkflow, /package-manager-cache: false/u);
	assert.match(publishNpmWorkflow, /no-cache: true/u);
	assert.match(publishNpmWorkflow, /npm publish --access public --provenance/u);
	assert.ok(
		publishNpmWorkflow.indexOf('npm publish --access public --provenance') <
			publishNpmWorkflow.indexOf('Create GitHub release for pushed tag'),
	);
	assert.doesNotMatch(publishNpmWorkflow, /NODE_AUTH_TOKEN/u);
	assert.doesNotMatch(publishNpmWorkflow, /secrets\.NODE_AUTH_TOKEN/u);
});

test('source repository declares bounded npm registry release checks', () => {
	assert.match(sourceCommandContract, /\[intents\.release_npm_version_available\]/u);
	assert.match(sourceCommandContract, /\[intents\.release_npm_publish\]/u);
	assert.match(sourceCommandContract, /\[intents\.release_npm_published_verify\]/u);
	assert.match(sourceCommandContract, /scripts\/check-npm-release-version\.mjs/u);
	assert.match(sourceCommandContract, /scripts\/start-npm-release\.mjs/u);
	assert.match(sourceCommandContract, /--expect-available/u);
	assert.match(sourceCommandContract, /--expect-published/u);
	assert.match(sourceCommandContract, /network = true/u);
	assert.match(sourceCommandContract, /destructive = false/u);
	assert.match(sourceCommandContract, /\[resources\.npm_release_channel\]/u);
	assert.match(sourceCommandContract, /lock = "npm_release_channel"/u);
	assert.match(sourceCommandContract, /MUSTFLOW_NPM_REGISTRY_URL/u);
	assert.match(startNpmReleaseScript, /Refusing to start npm release without --yes/u);
	assert.match(startNpmReleaseScript, /git', \['status', '--short'\]/u);
	assert.match(startNpmReleaseScript, /git', \['ls-remote', 'origin', 'refs\/heads\/main'\]/u);
	assert.match(startNpmReleaseScript, /scripts\/check-npm-release-version\.mjs', '--expect-available'/u);
	assert.match(startNpmReleaseScript, /git', \['tag', tagName, head\]/u);
	assert.match(startNpmReleaseScript, /git', \['push', 'origin', `refs\/tags\/\$\{tagName\}`\]/u);
	assert.doesNotMatch(startNpmReleaseScript, /gh', \['release', 'create'/u);

	const guardedStart = spawnSync(process.execPath, ['scripts/start-npm-release.mjs'], {
		cwd: projectRoot,
		encoding: 'utf8',
	});
	assert.equal(guardedStart.status, 1);
	assert.match(guardedStart.stderr, /Refusing to start npm release without --yes/u);
});

test('npm registry release check fully encodes package lookup paths', () => {
	assert.match(releaseVersionCheckScript, /function encodeRegistryPackagePath\(packageName\)/u);
	assert.match(releaseVersionCheckScript, /encodeURIComponent\(packageName\)/u);
	assert.match(releaseVersionCheckScript, /encodedScopedMarker = '%40'/u);
	assert.match(releaseVersionCheckScript, /function normalizeRegistryBaseUrl\(value\)/u);
	assert.match(releaseVersionCheckScript, /registryUrl\.pathname\.endsWith\('\/'\)/u);
	assert.match(releaseVersionCheckScript, /registryUrl\.pathname = `\$\{registryUrl\.pathname\}\/`;/u);
	assert.match(releaseVersionCheckScript, /new URL\(packagePath, registryUrl\)/u);
	assert.doesNotMatch(releaseVersionCheckScript, /packageJson\.name\.replace\(/u);
	assert.doesNotMatch(releaseVersionCheckScript, /\.replace\(['"]\/['"],\s*['"]%2F['"]\)/u);
});

test('npm package includes compiled cli, schema contracts, and default template sources', async () => {
	const publicJsonContracts = await readPublicJsonContracts();
	const result = spawnSync('npm pack --dry-run --json --ignore-scripts', {
		cwd: projectRoot,
		encoding: 'utf8',
		shell: true,
	});

	assert.equal(result.status, 0);
	const [pack] = JSON.parse(result.stdout);
	const files = new Set(pack.files.map((file) => file.path));

	assert.ok(files.has('dist/cli/index.js'));
	assert.ok(files.has('dist/cli/commands/adapters.js'));
	assert.ok(files.has('dist/cli/commands/classify.js'));
	assert.ok(files.has('dist/cli/commands/contract-lint.js'));
	assert.ok(files.has('dist/cli/commands/onboard.js'));
	assert.ok(files.has('dist/cli/commands/next.js'));
	assert.ok(files.has('dist/cli/commands/evidence.js'));
	assert.ok(files.has('dist/cli/commands/workspace.js'));
	assert.ok(files.has('dist/cli/commands/init.js'));
	assert.ok(files.has('dist/cli/commands/docs.js'));
	assert.ok(files.has('dist/cli/commands/index.js'));
	assert.ok(files.has('dist/cli/commands/line-endings.js'));
	assert.ok(files.has('dist/cli/commands/quality.js'));
	assert.ok(files.has('dist/cli/commands/explain.js'));
	assert.ok(files.has('dist/cli/commands/handoff.js'));
	assert.ok(files.has('dist/core/line-endings.js'));
	assert.ok(files.has('dist/core/quality-gaming.js'));
	assert.ok(files.has('dist/core/source-anchor-explanation.js'));
	assert.ok(files.has('dist/core/source-anchors.js'));
	assert.ok(files.has('dist/cli/commands/impact.js'));
	assert.ok(files.has('dist/cli/commands/search.js'));
	assert.ok(files.has('dist/cli/commands/dashboard.js'));
	assert.ok(files.has('dist/cli/commands/update.js'));
	assert.ok(files.has('dist/cli/commands/verify.js'));
	assert.ok(files.has('dist/cli/lib/external-skill-import.js'));
	assert.ok(files.has('dist/core/contract-models.js'));
	assert.ok(files.has('dist/core/adapter-compatibility.js'));
	assert.ok(files.has('dist/core/handoff-record.js'));
	assert.ok(files.has('dist/core/generated-boundary.js'));
	assert.ok(files.has('dist/core/config-chain.js'));
	assert.ok(files.has('dist/core/env-contract.js'));
	assert.ok(files.has('dist/core/secret-risk-scan.js'));
	assert.ok(files.has('dist/core/security-pattern-scan.js'));
	assert.ok(files.has('dist/core/docs-link-integrity.js'));
	assert.ok(files.has('dist/core/related-files.js'));
	assert.ok(files.has('dist/core/skill-route-audit.js'));
	assert.ok(files.has('dist/core/repo-version-source.js'));
	assert.ok(files.has('dist/core/repo-approval-gate.js'));
	assert.ok(files.has('dist/core/repo-deploy-surface.js'));
	assert.ok(files.has('dist/core/repo-merge-conflict-scan.js'));
	assert.ok(files.has('dist/core/repo-git-ignore-audit.js'));
	assert.ok(files.has('dist/core/repo-manifest-lock-drift.js'));
	assert.ok(files.has('dist/core/code-outline.js'));
	assert.ok(files.has('dist/core/dependency-graph.js'));
	assert.ok(files.has('dist/core/import-cycle.js'));
	assert.ok(files.has('dist/core/module-boundary.js'));
	assert.ok(files.has('dist/core/change-impact.js'));
	assert.ok(files.has('dist/core/test-performance-report.js'));
	assert.ok(files.has('dist/core/test-regression-selector.js'));
	assert.ok(files.has('dist/core/route-outline.js'));
	assert.ok(files.has('dist/core/export-diff.js'));
	assert.ok(files.has('dist/core/script-pack-suggestions.js'));
	assert.ok(files.has('dist/core/doc-review-triage.js'));
	assert.ok(files.has('dist/core/public-json-contracts.js'));
	assert.ok(files.has('dist/core/surface-decision-model.js'));
	assert.ok(files.has('dist/cli/script-packs/core-text-budget.js'));
	assert.ok(files.has('dist/cli/script-packs/code-export-diff.js'));
	assert.ok(files.has('dist/cli/script-packs/code-dependency-graph.js'));
	assert.ok(files.has('dist/cli/script-packs/code-import-cycle.js'));
	assert.ok(files.has('dist/cli/script-packs/code-module-boundary.js'));
	assert.ok(files.has('dist/cli/script-packs/code-change-impact.js'));
	assert.ok(files.has('dist/cli/script-packs/code-outline.js'));
	assert.ok(files.has('dist/cli/script-packs/code-route-outline.js'));
	assert.ok(files.has('dist/cli/script-packs/test-performance-report.js'));
	assert.ok(files.has('dist/cli/script-packs/test-regression-selector.js'));
	assert.ok(files.has('dist/cli/script-packs/repo-config-chain.js'));
	assert.ok(files.has('dist/cli/script-packs/repo-env-contract.js'));
	assert.ok(files.has('dist/cli/script-packs/repo-secret-risk-scan.js'));
	assert.ok(files.has('dist/cli/script-packs/repo-security-pattern-scan.js'));
	assert.ok(files.has('dist/cli/script-packs/repo-generated-boundary.js'));
	assert.ok(files.has('dist/cli/script-packs/repo-skill-route-audit.js'));
	assert.ok(files.has('dist/cli/script-packs/repo-version-source.js'));
	assert.ok(files.has('dist/cli/script-packs/repo-approval-gate.js'));
	assert.ok(files.has('dist/cli/script-packs/repo-deploy-surface.js'));
	assert.ok(files.has('dist/cli/script-packs/repo-merge-conflict-scan.js'));
	assert.ok(files.has('dist/cli/script-packs/repo-git-ignore-audit.js'));
	assert.ok(files.has('dist/cli/script-packs/repo-manifest-lock-drift.js'));
	assert.ok(files.has('dist/cli/script-packs/docs-link-integrity.js'));
	assert.ok(files.has('dist/cli/script-packs/repo-related-files.js'));
	assert.ok(files.has('templates/default/manifest.toml'));
	assert.ok(files.has('templates/default/i18n.toml'));
	assert.ok(files.has('dist/cli/lib/template-i18n.js'));
	assert.ok(files.has('templates/default/common/.mustflow/config/commands.toml'));
	assert.ok(files.has('templates/default/common/.mustflow/config/preferences.toml'));
	assert.ok(files.has('schemas/doctor-report.schema.json'));
	assert.ok(files.has('schemas/adapter-compatibility-report.schema.json'));
	assert.ok(files.has('schemas/context-report.schema.json'));
	assert.ok(files.has('schemas/run-receipt.schema.json'));
	assert.ok(files.has('schemas/commands.schema.json'));
	assert.ok(files.has('schemas/contract-lint-report.schema.json'));
	assert.ok(files.has('schemas/onboard-commands-report.schema.json'));
	assert.ok(files.has('schemas/next-report.schema.json'));
	assert.ok(files.has('schemas/evidence-report.schema.json'));
	assert.ok(files.has('schemas/workspace-status.schema.json'));
	assert.ok(files.has('schemas/workspace-command-catalog.schema.json'));
	assert.ok(files.has('schemas/workspace-command-fragments.schema.json'));
	assert.ok(files.has('schemas/workspace-verification-plan.schema.json'));
	assert.ok(files.has('schemas/classify-report.schema.json'));
	assert.ok(files.has('schemas/docs-review-list.schema.json'));
	assert.ok(files.has('schemas/explain-report.schema.json'));
	assert.ok(files.has('schemas/handoff-validation-report.schema.json'));
	assert.ok(files.has('schemas/impact-report.schema.json'));
	assert.ok(files.has('schemas/line-endings-report.schema.json'));
	assert.ok(files.has('schemas/config-chain-report.schema.json'));
	assert.ok(files.has('schemas/env-contract-report.schema.json'));
	assert.ok(files.has('schemas/secret-risk-scan-report.schema.json'));
	assert.ok(files.has('schemas/security-pattern-scan-report.schema.json'));
	assert.ok(files.has('schemas/link-integrity-report.schema.json'));
	assert.ok(files.has('schemas/skill-route-audit-report.schema.json'));
	assert.ok(files.has('schemas/skill-import-report.schema.json'));
	assert.ok(files.has('schemas/repo-version-source-report.schema.json'));
	assert.ok(files.has('schemas/repo-toolchain-provenance-report.schema.json'));
	assert.ok(files.has('schemas/repo-automation-surface-report.schema.json'));
	assert.ok(files.has('schemas/repo-dependency-surface-report.schema.json'));
	assert.ok(files.has('schemas/repo-approval-gate-report.schema.json'));
	assert.ok(files.has('schemas/repo-deploy-surface-report.schema.json'));
	assert.ok(files.has('schemas/repo-merge-conflict-scan-report.schema.json'));
	assert.ok(files.has('schemas/repo-git-ignore-audit-report.schema.json'));
	assert.ok(files.has('schemas/repo-manifest-lock-drift-report.schema.json'));
	assert.ok(files.has('schemas/generated-boundary-report.schema.json'));
	assert.ok(files.has('schemas/related-files-report.schema.json'));
	assert.ok(files.has('schemas/script-pack-suggestion-report.schema.json'));
	assert.ok(files.has('schemas/quality-gaming-report.schema.json'));
	assert.ok(files.has('schemas/code-outline-report.schema.json'));
	assert.ok(files.has('schemas/dependency-graph-report.schema.json'));
	assert.ok(files.has('schemas/import-cycle-report.schema.json'));
	assert.ok(files.has('schemas/module-boundary-report.schema.json'));
	assert.ok(files.has('schemas/change-impact-report.schema.json'));
	assert.ok(files.has('schemas/code-symbol-read-report.schema.json'));
	assert.ok(files.has('schemas/route-outline-report.schema.json'));
	assert.ok(files.has('schemas/export-diff-report.schema.json'));
	assert.ok(files.has('schemas/test-performance-report.schema.json'));
	assert.ok(files.has('schemas/test-regression-selector-report.schema.json'));
	assert.ok(files.has('schemas/verify-report.schema.json'));
	for (const contract of publicJsonContracts) {
		assert.ok(files.has(`schemas/${contract.schemaFile}`), `${contract.schemaFile} should be packaged`);
	}
	assert.ok(files.has('examples/README.md'));
	assert.ok(files.has('examples/docs-only/README.md'));
	assert.ok(files.has('examples/host-instruction-conflicts/README.md'));
	assert.ok(files.has('examples/minimal-js/README.md'));
	assert.ok(files.has('examples/missing-command-contracts/README.md'));
	assert.ok(files.has('examples/nested-repos/README.md'));
	for (const locale of supportedTemplateLocales) {
		assert.ok(files.has(`templates/default/locales/${locale}/AGENTS.md`));
	}
	for (const relativePath of templateCreates) {
		assert.ok(
			files.has(`templates/default/common/${relativePath}`) ||
				files.has(`templates/default/locales/en/${relativePath}`),
			`${relativePath} should be packaged from the common template root or canonical locale`,
		);
	}
	for (const relativePath of templateSkillCreates) {
		assert.ok(files.has(`templates/default/locales/en/${relativePath}`), `${relativePath} should be packaged from the canonical locale`);
	}
	for (const locale of supportedTemplateLocales.filter((entry) => entry !== 'en')) {
		const localizedSkillPrefix = `templates/default/locales/${locale}/.mustflow/skills/`;

		assert.equal(
			Array.from(files).some((file) => file.startsWith(localizedSkillPrefix)),
			false,
			`${locale} should not package duplicated localized skill files`,
		);
	}
	assert.equal(files.has('templates/default/files/AGENTS.md'), false);
	assert.equal(files.has('dist/cli/lib/package-manager.js'), false);
	assert.equal(files.has('docs-site/package.json'), false);
	assert.equal(files.has('tests/cli/init.test.js'), false);
});
