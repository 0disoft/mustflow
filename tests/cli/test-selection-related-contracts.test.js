import {
	assert,
	dashboardTests,
	existsSync,
	extractCoreImplementationPathsFromWrappers,
	extractRegisteredScriptPackWrapperPaths,
	indexTests,
	listSuite,
	loadPrecomputedSelectionReports,
	mkdirSync,
	mkdtempSync,
	orderTestPathsByProfile,
	packageContractTests,
	path,
	precomputedSelectionRequests,
	profileDurationForTestPath,
	profileOrderingSummary,
	projectRoot,
	readFileSync,
	readProfileDurations,
	readProfileTimingEvidence,
	readProjectFile,
	reasonsFor,
	rmSync,
	runTests,
	schemaSmokeTests,
	scriptPackContractTests,
	scriptPackCoreImplementationPaths,
	scriptPackRelatedSelectionPaths,
	scriptPackWrapperPaths,
	selectedFor,
	selectionCacheKey,
	selectRelated,
	spawnSync,
	test,
	tmpdir,
	toPosixPath,
	uniqueSorted,
	writeFileSync,
} from './helpers/test-selection-contracts.js';

test('related selection uses explicit command test contracts without router fallback', () => {
	const selected = selectedFor(['src/cli/commands/verify.ts']);

	assert.equal(selected.has('verify.test.js'), true);
	assert.equal(selected.has('verify-inputs.test.js'), true);
	assert.equal(selected.has('explain-verify.test.js'), true);
	for (const testName of schemaSmokeTests) {
		assert.equal(selected.has(testName), true);
	}
	assert.equal(selected.has('router.test.js'), false);
	assert.equal(selected.has('check.test.js'), false);
});

test('related selection keeps router changes out of local index suites', () => {
	const selected = selectedFor(['src/cli/index.ts']);

	assert.deepEqual([...selected].sort(), ['router.test.js', 'workflow.test.js']);
});

test('related selection covers shared command eligibility behavior', () => {
	const selected = selectedFor(['src/core/command-intent-eligibility.ts']);

	for (const testName of runTests) {
		assert.equal(selected.has(testName), true);
	}
	assert.equal(selected.has('verify.test.js'), true);
	assert.equal(selected.has('verify-inputs.test.js'), true);
	assert.equal(selected.has('security-fuzz.test.js'), true);
	for (const testName of schemaSmokeTests) {
		assert.equal(selected.has(testName), true);
	}
});

test('related selection keeps package surface checks release-sensitive instead of running package suite', () => {
	const report = selectRelated(['src/core/public-json-contracts.ts']);

	assert.equal(report.release_sensitive, true);
	assert.deepEqual(report.selected, schemaSmokeTests);
});

test('related selection maps command config changes to contract surfaces', () => {
	const report = selectRelated(['.mustflow/config/commands.toml']);
	const selected = new Set(report.selected);

	assert.equal(report.release_sensitive, true);
	assert.equal(selected.has('check-config-validation.test.js'), true);
	assert.equal(selected.has('check-command-contracts.test.js'), true);
	assert.equal(selected.has('explain-command.test.js'), true);
	assert.equal(selected.has('index-workflow.test.js'), true);
	assert.equal(selected.has('schema-command-contracts.test.js'), true);
	for (const testName of runTests) {
		assert.equal(selected.has(testName), true);
	}
	assert.equal(selected.has('verify.test.js'), true);
	for (const testName of packageContractTests) {
		assert.equal(selected.has(testName), false);
	}
	assert.equal(selected.has('package-template.test.js'), false);
});

test('related selection maps the derived manifest lock to lock consumers without full fallback', () => {
	const report = selectRelated(['.mustflow/config/manifest.lock.toml']);

	assert.deepEqual(report.selected.sort(), [
		'check.test.js',
		'manifest-lock-accept-go.test.js',
		'update.test.js',
	]);
	assert.equal(reasonsFor(report, 'fallback_full_tests').length, 0);
});

test('related selection maps package metadata helper changes to command consumers', () => {
	const selected = selectedFor(['src/cli/lib/package-info.ts']);

	for (const testName of dashboardTests) {
		assert.equal(selected.has(testName), true);
	}
	assert.equal(selected.has('router.test.js'), true);
	for (const testName of runTests) {
		assert.equal(selected.has(testName), true);
	}
	for (const testName of indexTests) {
		assert.equal(selected.has(testName), false);
	}
});

test('related selection covers the selector script itself', () => {
	const report = selectRelated(['scripts/run-cli-tests.mjs']);
	const selected = new Set(report.selected);
	const ruleReasons = reasonsFor(report, 'related_rule');

	assert.deepEqual([...selected], ['test-selection-related-contracts.test.js', 'test-selection-runner-contracts.test.js']);
	assert.equal(ruleReasons.length, 1);
	assert.equal(ruleReasons[0].changed_file, 'scripts/run-cli-tests.mjs');
	assert.equal(ruleReasons[0].rule, '^scripts\\/run-cli-tests\\.mjs$');
	assert.deepEqual(ruleReasons[0].tests, ['test-selection-related-contracts.test.js', 'test-selection-runner-contracts.test.js']);
});

test('related selection covers related-selection audit tooling', () => {
	const report = selectRelated(['scripts/audit-related-selection.mjs']);
	const selected = new Set(report.selected);
	const ruleReasons = reasonsFor(report, 'related_rule');

	assert.deepEqual([...selected], ['test-selection-related-contracts.test.js', 'test-selection-runner-contracts.test.js']);
	assert.equal(ruleReasons.length, 1);
	assert.equal(ruleReasons[0].changed_file, 'scripts/audit-related-selection.mjs');
	assert.equal(ruleReasons[0].rule, '^scripts\\/audit-related-selection\\.mjs$');
	assert.deepEqual(ruleReasons[0].tests, ['test-selection-related-contracts.test.js', 'test-selection-runner-contracts.test.js']);
});

test('related selection covers ops analysis tooling without full fallback', () => {
	for (const changedFile of ['scripts/analyze-test-ops.mjs', 'tests/cli/helpers/ops-profiler.js']) {
		const report = selectRelated([changedFile]);
		const selected = new Set(report.selected);
		const ruleReasons = reasonsFor(report, 'related_rule');

		assert.deepEqual([...selected], ['test-ops-profiler.test.js'], changedFile);
		assert.equal(ruleReasons.length, 1, changedFile);
		assert.equal(ruleReasons[0].changed_file, changedFile);
		assert.equal(ruleReasons[0].tests.length, 1);
		assert.equal(ruleReasons[0].tests[0], 'test-ops-profiler.test.js');
		assert.equal(reasonsFor(report, 'fallback_full_tests').length, 0, changedFile);
	}
});

test('related selection covers selection test helpers without full fallback', () => {
	const report = selectRelated(['tests/cli/helpers/test-selection-contracts.js']);
	const selected = new Set(report.selected);
	const ruleReasons = reasonsFor(report, 'related_rule');

	assert.deepEqual([...selected], ['test-selection-related-contracts.test.js', 'test-selection-runner-contracts.test.js']);
	assert.equal(ruleReasons.length, 1);
	assert.equal(ruleReasons[0].changed_file, 'tests/cli/helpers/test-selection-contracts.js');
	assert.deepEqual(ruleReasons[0].tests, ['test-selection-related-contracts.test.js', 'test-selection-runner-contracts.test.js']);
	assert.equal(reasonsFor(report, 'fallback_full_tests').length, 0);
});

test('related selection covers the extracted selector module itself', () => {
	const report = selectRelated(['scripts/lib/test-selection.mjs']);
	const selected = new Set(report.selected);
	const ruleReasons = reasonsFor(report, 'related_rule');

	assert.deepEqual([...selected], ['test-selection-related-contracts.test.js', 'test-selection-runner-contracts.test.js']);
	assert.equal(ruleReasons.length, 1);
	assert.equal(ruleReasons[0].changed_file, 'scripts/lib/test-selection.mjs');
	assert.equal(ruleReasons[0].rule, '^scripts\\/lib\\/test-selection\\.mjs$');
	assert.deepEqual(ruleReasons[0].tests, ['test-selection-related-contracts.test.js', 'test-selection-runner-contracts.test.js']);
});

test('related selection covers the profile ordering module itself', () => {
	const report = selectRelated(['scripts/lib/test-ordering.mjs']);
	const selected = new Set(report.selected);
	const ruleReasons = reasonsFor(report, 'related_rule');

	assert.deepEqual([...selected], ['test-selection-related-contracts.test.js', 'test-selection-runner-contracts.test.js']);
	assert.equal(ruleReasons.length, 1);
	assert.equal(ruleReasons[0].changed_file, 'scripts/lib/test-ordering.mjs');
	assert.equal(ruleReasons[0].rule, '^scripts\\/lib\\/test-ordering\\.mjs$');
	assert.deepEqual(ruleReasons[0].tests, ['test-selection-related-contracts.test.js', 'test-selection-runner-contracts.test.js']);
});

test('related selection maps package metadata changes to package and version tests', () => {
	const report = selectRelated(['package.json']);
	const selected = new Set(report.selected);
	const ruleReasons = reasonsFor(report, 'related_rule');

	assert.equal(report.release_sensitive, true);
	assert.equal(reasonsFor(report, 'fallback_full_tests').length, 0);
	assert.equal(ruleReasons.length, 1);
	assert.equal(ruleReasons[0].changed_file, 'package.json');
	assert.equal(ruleReasons[0].rule, '^package\\.json$');
	for (const testName of [...packageContractTests, 'package-template.test.js', 'check-versioning.test.js', 'version-sources.test.js']) {
		assert.equal(selected.has(testName), true);
		assert.equal(ruleReasons[0].tests.includes(testName), true);
	}
});

test('related selection keeps ordinary unknown changes on the fast fallback', () => {
	const report = selectRelated(['misc/notes.txt']);
	const fastReport = listSuite('fast');
	const fastFallbackReasons = reasonsFor(report, 'fallback_fast_tests');

	assert.deepEqual(report.selected, fastReport.selected);
	assert.equal(report.release_sensitive, false);
	assert.equal(fastFallbackReasons.length, 1);
	assert.equal(fastFallbackReasons[0].changed_file, null);
	assert.equal(fastFallbackReasons[0].rule, 'default_fast_tests');
	assert.deepEqual(fastFallbackReasons[0].tests, fastReport.selected);
});

test('related selection maps script-pack implementation changes to script-pack contract tests', () => {
	assert.equal(scriptPackWrapperPaths.includes('src/cli/script-packs/code-dependency-graph.ts'), true);
	assert.equal(scriptPackWrapperPaths.includes('src/cli/script-packs/code-module-boundary.ts'), true);
	assert.equal(scriptPackCoreImplementationPaths.includes('src/core/dependency-graph.ts'), true);
	assert.equal(scriptPackCoreImplementationPaths.includes('src/core/module-boundary.ts'), true);

	for (const changedFile of scriptPackRelatedSelectionPaths) {
		const selected = selectedFor([toPosixPath(changedFile)]);
		for (const testName of scriptPackContractTests) {
			assert.equal(selected.has(testName), true, `${changedFile} should select ${testName}`);
		}
	}
});

test('related selection keeps line-ending implementation changes out of schema smoke tests', () => {
	const selected = selectedFor(['src/core/line-endings.ts']);

	assert.deepEqual([...selected], ['line-endings.test.js']);
});

test('related selection keeps line-ending command changes schema-covered', () => {
	const selected = selectedFor(['src/cli/commands/line-endings.ts']);

	assert.equal(selected.has('line-endings.test.js'), true);
	for (const testName of schemaSmokeTests) {
		assert.equal(selected.has(testName), true);
	}
});

test('related selection keeps verification planning changes out of classification suites', () => {
	const selected = selectedFor(['src/core/change-verification.ts']);

	assert.deepEqual([...selected], [
		'verify.test.js',
		'verify-changed.test.js',
		'verify-plan-scheduler.test.js',
		'explain-verify.test.js',
		'schema-explain-verify-output.test.js',
	]);
	assert.equal(selected.has('classify.test.js'), false);
	assert.equal(selected.has('explain-surface.test.js'), false);
	for (const testName of schemaSmokeTests.filter((testName) => testName !== 'schema-explain-verify-output.test.js')) {
		assert.equal(selected.has(testName), false);
	}
	assert.equal(selected.has('verify-inputs.test.js'), false);
	for (const testName of [
		'verify-completion-verdict-core-contracts.test.js',
		'verify-completion-verdict-evidence-contracts.test.js',
		'verify-completion-verdict-ratchet-contracts.test.js',
		'verify-completion-verdict-repeated-failure-contracts.test.js',
	]) {
		assert.equal(selected.has(testName), false);
	}
});

test('related selection normalizes Windows path separators before rule matching', () => {
	const report = selectRelated(['src\\core\\line-endings.ts']);

	assert.deepEqual(report.changed_files, ['src/core/line-endings.ts']);
	assert.deepEqual(report.selected, ['line-endings.test.js']);
	assert.equal(reasonsFor(report, 'fallback_fast_tests').length, 0);
});

test('related selection treats shared CLI harness changes as broad CLI risk', () => {
	const selected = selectedFor(['tests/cli/helpers/cli-harness.js']);

	assert.equal(selected.has('init.test.js'), true);
	assert.equal(selected.has('verify.test.js'), true);
	assert.equal(selected.has('verify-changed.test.js'), true);
	for (const testName of packageContractTests) {
		assert.equal(selected.has(testName), false);
	}
	assert.equal(selected.has('package-template.test.js'), false);
});

test('related selection reports release-sensitive template changes', () => {
	const report = selectRelated(['templates/default/AGENTS.md']);

	assert.equal(report.release_sensitive, true);
	assert.deepEqual(report.selected.sort(), ['docs.test.js', 'init-default-template.test.js', 'init.test.js', 'package-template.test.js', 'update.test.js']);
	assert.deepEqual(reasonsFor(report, 'release_sensitive'), [
		{
			changed_file: 'templates/default/AGENTS.md',
			reason: 'release_sensitive',
			rule: '^templates\\/',
			tests: [],
			note: 'release-sensitive change; run test_release before publishing or committing release metadata',
		},
	]);
});

test('related selection maps template skill changes only to their authoring shard and install surface', () => {
	const selected = selectedFor(['templates/default/locales/en/.mustflow/skills/cpp-code-change/SKILL.md']);

	assert.deepEqual([...selected].sort(), [
		'authoring-skill-language-contracts.test.js',
		'skill-install-surface-contracts.test.js',
	]);
});

test('related selection widens unmapped source and helper changes instead of using fast fallback', () => {
	for (const changedFile of [
		'src/core/new-cross-cutting-module.ts',
		'src/cli/lib/new-cross-cutting-helper.ts',
		'tests/cli/helpers/new-shared-utils.js',
	]) {
		const report = selectRelated([changedFile]);
		const fullReport = listSuite('full');
		const fallbackReasons = reasonsFor(report, 'fallback_full_tests');

		assert.equal(report.selected.length, fullReport.selected.length, changedFile);
		assert.deepEqual(report.selected, fullReport.selected, changedFile);
		assert.equal(fallbackReasons.length, 1, changedFile);
		assert.equal(fallbackReasons[0].changed_file, changedFile);
		assert.equal(reasonsFor(report, 'fallback_fast_tests').length, 0, changedFile);
	}
});

test('related selection maps init command changes to default template installation', () => {
	const selected = selectedFor(['src/cli/commands/init.ts']);

	assert.equal(selected.has('init.test.js'), true);
	assert.equal(selected.has('init-default-template.test.js'), true);
	assert.equal(selected.has('workflow.test.js'), true);
});

test('related selection maps source skill changes only to their authoring shard and install surface', () => {
	const selected = selectedFor(['.mustflow/skills/cpp-code-change/SKILL.md']);

	assert.deepEqual([...selected].sort(), [
		'authoring-skill-language-contracts.test.js',
		'skill-install-surface-contracts.test.js',
	]);
});

test('related selection resolves an operations skill to the operations shard', () => {
	const sourceSelected = selectedFor(['.mustflow/skills/hetzner-cloud-change/SKILL.md']);
	const templateSelected = selectedFor([
		'templates/default/locales/en/.mustflow/skills/hetzner-cloud-change/SKILL.md',
	]);
	const expected = [
		'authoring-skill-operations-contracts.test.js',
		'skill-install-surface-contracts.test.js',
	];

	assert.deepEqual([...sourceSelected].sort(), expected);
	assert.deepEqual([...templateSelected].sort(), expected);
});

test('related selection keeps skill index and manifest checks on the lightweight install surface', () => {
	assert.deepEqual(selectedFor(['.mustflow/skills/INDEX.md']), new Set([
		'authoring-skill-contracts.test.js',
		'skill-install-surface-contracts.test.js',
	]));
	assert.deepEqual(selectedFor(['templates/default/manifest.toml']), new Set([
		'skill-install-surface-contracts.test.js',
	]));
});

test('shared skill contract helper changes stay inside authoring contract coverage', () => {
	const selected = selectedFor(['tests/cli/helpers/skill-contracts.js']);
	const full = listSuite('full');

	assert.equal(selected.has('skill-install-surface-contracts.test.js'), true);
	assert.equal([...selected].every((name) => name.startsWith('authoring-skill') || name === 'skill-install-surface-contracts.test.js'), true);
	assert.ok(selected.size < full.selected.length);
});
