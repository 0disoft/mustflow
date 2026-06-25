import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import {
	orderTestPathsByProfile,
	profileDurationForTestPath,
	profileOrderingSummary,
	readProfileDurations,
} from '../../scripts/lib/test-ordering.mjs';

const projectRoot = path.resolve(fileURLToPath(new URL('../..', import.meta.url)));
const runTests = [
	'run-execution.test.js',
	'run-preview.test.js',
	'run-receipts.test.js',
	'run-safety.test.js',
];
const indexTests = [
	'index-workflow.test.js',
	'index-verification-evidence.test.js',
	'index-source-anchors.test.js',
];
const dashboardTests = [
	'dashboard-preferences.test.js',
	'dashboard-rendering.test.js',
	'dashboard-safety.test.js',
	'dashboard-verification.test.js',
];
const scriptPackContractTests = [
	'text-budget.test.js',
	'schema.test.js',
	'schema-command-contracts.test.js',
	'schema-explain-verify-output.test.js',
];

function toPosixPath(filePath) {
	return filePath.split(path.sep).join('/');
}

function uniqueSorted(values) {
	return [...new Set(values)].sort((left, right) => left.localeCompare(right));
}

function readProjectFile(relativePath) {
	return readFileSync(path.join(projectRoot, ...relativePath.split('/')), 'utf8');
}

function extractRegisteredScriptPackWrapperPaths() {
	const registrySource = readProjectFile('src/cli/lib/script-pack-registry.ts');
	const importPattern = /import\(['"]\.\.\/script-packs\/([^'"]+)\.js['"]\)/gu;
	const wrapperPaths = [...registrySource.matchAll(importPattern)].map((match) => `src/cli/script-packs/${match[1]}.ts`);

	assert.notEqual(wrapperPaths.length, 0, 'script-pack registry should expose loadRunner wrapper imports');
	return uniqueSorted(wrapperPaths);
}

function extractCoreImplementationPathsFromWrappers(wrapperPaths) {
	const corePaths = [];

	for (const wrapperPath of wrapperPaths) {
		const wrapperSource = readProjectFile(wrapperPath);
		const importPattern = /from\s+['"]\.\.\/\.\.\/core\/([^'"]+)\.js['"]/gu;

		for (const match of wrapperSource.matchAll(importPattern)) {
			const corePath = `src/core/${match[1]}.ts`;
			const absoluteCorePath = path.join(projectRoot, ...corePath.split('/'));
			const coreSource = existsSync(absoluteCorePath) ? readFileSync(absoluteCorePath, 'utf8') : '';
			if (/export const [A-Z_]+_SCRIPT_REF\b/u.test(coreSource)) {
				corePaths.push(corePath);
			}
		}
	}

	return uniqueSorted(corePaths);
}

const scriptPackWrapperPaths = extractRegisteredScriptPackWrapperPaths();
const scriptPackCoreImplementationPaths = extractCoreImplementationPathsFromWrappers(scriptPackWrapperPaths);
const scriptPackRelatedSelectionPaths = uniqueSorted([
	...scriptPackWrapperPaths,
	...scriptPackCoreImplementationPaths,
	'src/core/change-impact.ts',
	'src/core/change-surface-classification.ts',
	'src/core/script-pack-suggestions.ts',
	'src/core/test-regression-selector.ts',
]);

const precomputedSelectionRequests = [
	{ mode: 'related', changedFiles: ['src/cli/commands/verify.ts'] },
	{ mode: 'related', changedFiles: ['src/cli/index.ts'] },
	{ mode: 'related', changedFiles: ['src/core/command-intent-eligibility.ts'] },
	{ mode: 'related', changedFiles: ['src/core/public-json-contracts.ts'] },
	{ mode: 'related', changedFiles: ['.mustflow/config/commands.toml'] },
	{ mode: 'related', changedFiles: ['src/cli/lib/package-info.ts'] },
	{ mode: 'related', changedFiles: ['scripts/run-cli-tests.mjs'] },
	{ mode: 'related', changedFiles: ['scripts/lib/test-selection.mjs'] },
	{ mode: 'related', changedFiles: ['scripts/lib/test-ordering.mjs'] },
	{ mode: 'related-cached', changedFiles: ['src/core/line-endings.ts'] },
	{ mode: 'related', changedFiles: ['package.json'] },
	{ mode: 'related', changedFiles: ['misc/notes.txt'] },
	{ mode: 'related', changedFiles: [] },
	{ mode: 'related-profile', changedFiles: [] },
	...scriptPackRelatedSelectionPaths.map((changedFile) => ({ mode: 'related', changedFiles: [changedFile] })),
	{ mode: 'related', changedFiles: ['src/core/line-endings.ts'] },
	{ mode: 'related', changedFiles: ['src/cli/commands/line-endings.ts'] },
	{ mode: 'related', changedFiles: ['src/core/change-verification.ts'] },
	{ mode: 'related', changedFiles: ['tests/cli/helpers/cli-harness.js'] },
	{ mode: 'related', changedFiles: ['templates/default/AGENTS.md'] },
	{ mode: 'related', changedFiles: ['src/cli/commands/init.ts'] },
	{ mode: 'related', changedFiles: ['.mustflow/skills/cpp-code-change/SKILL.md'] },
	{ mode: 'fast', changedFiles: [] },
	{ mode: 'full', changedFiles: [] },
	{ mode: 'full-auto', changedFiles: [] },
];

let precomputedSelectionReports;

function selectionCacheKey(mode, changedFiles) {
	return JSON.stringify([mode, changedFiles]);
}

function loadPrecomputedSelectionReports() {
	if (precomputedSelectionReports) {
		return precomputedSelectionReports;
	}

	const tempRoot = mkdtempSync(path.join(tmpdir(), 'mustflow-test-selection-'));
	const requestPath = path.join(tempRoot, 'requests.json');

	try {
		writeFileSync(
			requestPath,
			`${JSON.stringify(precomputedSelectionRequests.map((request) => ({ mode: request.mode, changed_files: request.changedFiles })))}\n`,
		);

		const result = spawnSync(process.execPath, ['scripts/run-cli-tests.mjs', `--list-batch=${requestPath}`], {
			cwd: projectRoot,
			encoding: 'utf8',
		});

		assert.equal(result.status, 0, result.stderr || result.stdout);
		precomputedSelectionReports = new Map(
			JSON.parse(result.stdout).map((report) => [selectionCacheKey(report.mode, report.changed_files), report]),
		);
		return precomputedSelectionReports;
	} finally {
		rmSync(tempRoot, { recursive: true, force: true });
	}
}

function selectRelated(changedFiles) {
	return listSuite('related', changedFiles);
}

function listSuite(mode, changedFiles = []) {
	const cached = loadPrecomputedSelectionReports().get(selectionCacheKey(mode, changedFiles));
	if (cached) {
		return cached;
	}

	const result = spawnSync(process.execPath, ['scripts/run-cli-tests.mjs', mode, '--list'], {
		cwd: projectRoot,
		encoding: 'utf8',
		env: {
			...process.env,
			MUSTFLOW_TEST_CHANGED_FILES: JSON.stringify(changedFiles),
		},
	});

	assert.equal(result.status, 0, result.stderr || result.stdout);
	return JSON.parse(result.stdout);
}

function selectedFor(changedFiles) {
	return new Set(selectRelated(changedFiles).selected);
}

function reasonsFor(report, reason) {
	return report.selection_reasons.filter((entry) => entry.reason === reason);
}

test('related selection uses explicit command test contracts without router fallback', () => {
	const selected = selectedFor(['src/cli/commands/verify.ts']);

	assert.equal(selected.has('verify.test.js'), true);
	assert.equal(selected.has('verify-inputs.test.js'), true);
	assert.equal(selected.has('explain-verify.test.js'), true);
	assert.equal(selected.has('schema.test.js'), true);
	assert.equal(selected.has('schema-command-contracts.test.js'), true);
	assert.equal(selected.has('schema-explain-verify-output.test.js'), true);
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
	assert.equal(selected.has('schema.test.js'), true);
	assert.equal(selected.has('schema-command-contracts.test.js'), true);
	assert.equal(selected.has('schema-explain-verify-output.test.js'), true);
});

test('related selection keeps package surface checks release-sensitive instead of running package suite', () => {
	const report = selectRelated(['src/core/public-json-contracts.ts']);

	assert.equal(report.release_sensitive, true);
	assert.deepEqual(report.selected, ['schema.test.js']);
});

test('related selection maps command config changes to contract surfaces', () => {
	const report = selectRelated(['.mustflow/config/commands.toml']);
	const selected = new Set(report.selected);

	assert.equal(report.release_sensitive, true);
	assert.equal(selected.has('check-command-contracts.test.js'), true);
	assert.equal(selected.has('explain-command.test.js'), true);
	assert.equal(selected.has('index-workflow.test.js'), true);
	assert.equal(selected.has('schema-command-contracts.test.js'), true);
	for (const testName of runTests) {
		assert.equal(selected.has(testName), true);
	}
	assert.equal(selected.has('verify.test.js'), true);
	assert.equal(selected.has('package.test.js'), false);
	assert.equal(selected.has('package-template.test.js'), false);
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

	assert.deepEqual([...selected], ['test-selection.test.js']);
	assert.equal(ruleReasons.length, 1);
	assert.equal(ruleReasons[0].changed_file, 'scripts/run-cli-tests.mjs');
	assert.equal(ruleReasons[0].rule, '^scripts\\/run-cli-tests\\.mjs$');
	assert.deepEqual(ruleReasons[0].tests, ['test-selection.test.js']);
});

test('related selection covers the extracted selector module itself', () => {
	const report = selectRelated(['scripts/lib/test-selection.mjs']);
	const selected = new Set(report.selected);
	const ruleReasons = reasonsFor(report, 'related_rule');

	assert.deepEqual([...selected], ['test-selection.test.js']);
	assert.equal(ruleReasons.length, 1);
	assert.equal(ruleReasons[0].changed_file, 'scripts/lib/test-selection.mjs');
	assert.equal(ruleReasons[0].rule, '^scripts\\/lib\\/test-selection\\.mjs$');
	assert.deepEqual(ruleReasons[0].tests, ['test-selection.test.js']);
});

test('related selection covers the profile ordering module itself', () => {
	const report = selectRelated(['scripts/lib/test-ordering.mjs']);
	const selected = new Set(report.selected);
	const ruleReasons = reasonsFor(report, 'related_rule');

	assert.deepEqual([...selected], ['test-selection.test.js']);
	assert.equal(ruleReasons.length, 1);
	assert.equal(ruleReasons[0].changed_file, 'scripts/lib/test-ordering.mjs');
	assert.equal(ruleReasons[0].rule, '^scripts\\/lib\\/test-ordering\\.mjs$');
	assert.deepEqual(ruleReasons[0].tests, ['test-selection.test.js']);
});

test('profile timing order runs known slow tests first and keeps unknown tests stable', () => {
	const testPaths = [
		'tests/cli/router.test.js',
		'tests/cli/workflow.test.js',
		'tests/cli/status.test.js',
		'tests/cli/next.test.js',
	];
	const durations = new Map([
		['tests/cli/workflow.test.js', 1250],
		['tests/cli/router.test.js', 1250],
		['tests/cli/next.test.js', 50],
	]);

	assert.deepEqual(orderTestPathsByProfile(testPaths, durations), [
		'tests/cli/router.test.js',
		'tests/cli/workflow.test.js',
		'tests/cli/next.test.js',
		'tests/cli/status.test.js',
	]);
	assert.deepEqual(profileOrderingSummary(testPaths, durations), { known: 3, total: 4 });
});

test('profile timing reader ignores missing malformed and invalid timing evidence', () => {
	const tempRoot = mkdtempSync(path.join(tmpdir(), 'mustflow-test-ordering-'));
	const profilePath = path.join(tempRoot, 'latest.profile.json');

	try {
		assert.deepEqual([...readProfileDurations(profilePath)], []);

		writeFileSync(profilePath, '{');
		assert.deepEqual([...readProfileDurations(profilePath)], []);

		writeFileSync(
			profilePath,
			`${JSON.stringify({
				test_files: [
					{ path: '.\\tests\\cli\\router.test.js', duration_ms: 100 },
					{ path: 'tests/cli/workflow.test.js', duration_ms: -1 },
					{ path: 'tests/cli/status.test.js', duration_ms: '12' },
					{ path: null, duration_ms: 12 },
				],
			})}\n`,
		);

		const durations = readProfileDurations(profilePath);

		assert.equal(profileDurationForTestPath('tests/cli/router.test.js', durations), 100);
		assert.equal(profileDurationForTestPath('tests/cli/workflow.test.js', durations), undefined);
		assert.deepEqual(orderTestPathsByProfile(['tests/cli/status.test.js', 'tests/cli/router.test.js'], durations), [
			'tests/cli/router.test.js',
			'tests/cli/status.test.js',
		]);
	} finally {
		rmSync(tempRoot, { recursive: true, force: true });
	}
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
	for (const testName of ['package.test.js', 'package-template.test.js', 'check-versioning.test.js', 'version-sources.test.js']) {
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

test('related profile does not fall back to the fast baseline without changed files', () => {
	const related = listSuite('related', []);
	const relatedProfile = listSuite('related-profile', []);

	assert.equal(related.selected.includes('index-workflow.test.js'), true);
	assert.equal(reasonsFor(related, 'fallback_fast_tests').length, 1);
	assert.equal(reasonsFor(related, 'fallback_fast_tests')[0].tests.includes('index-workflow.test.js'), true);
	assert.deepEqual(relatedProfile.changed_files, []);
	assert.deepEqual(relatedProfile.selected, []);
	assert.deepEqual(reasonsFor(relatedProfile, 'no_changed_files'), [
		{
			changed_file: null,
			reason: 'no_changed_files',
			rule: null,
			tests: [],
			note: 'no changed files and fallback is disabled',
		},
	]);
});

test('related selection maps script-pack implementation changes to script-pack contract tests', () => {
	assert.equal(scriptPackWrapperPaths.includes('src/cli/script-packs/code-dependency-graph.ts'), true);
	assert.equal(scriptPackCoreImplementationPaths.includes('src/core/dependency-graph.ts'), true);

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

test('related cached list mirrors related selection without requiring a fresh dist build', () => {
	const changedFiles = ['src/core/line-endings.ts'];
	const related = listSuite('related', changedFiles);
	const relatedCached = listSuite('related-cached', changedFiles);

	assert.equal(relatedCached.mode, 'related-cached');
	assert.deepEqual(relatedCached.changed_files, changedFiles);
	assert.deepEqual(relatedCached.selected, related.selected);
	assert.deepEqual(relatedCached.selection_reasons, related.selection_reasons);
});

test('related cached execution refuses stale dist for deleted TypeScript sources', () => {
	const changedFile = 'src/core/deleted-cached-fixture.ts';
	const staleOutputPath = path.join(projectRoot, 'dist', 'core', 'deleted-cached-fixture.js');
	const tempRoot = mkdtempSync(path.join(tmpdir(), 'mustflow-related-cached-'));

	try {
		mkdirSync(path.dirname(staleOutputPath), { recursive: true });
		writeFileSync(staleOutputPath, 'export {};\n');

		const result = spawnSync(process.execPath, ['scripts/run-cli-tests.mjs', 'related-cached'], {
			cwd: projectRoot,
			encoding: 'utf8',
			env: {
				...process.env,
				MUSTFLOW_TEST_CHANGED_FILES: JSON.stringify([changedFile]),
				MUSTFLOW_TEST_RUNNER_LOCK_DIR: path.join(tempRoot, 'lock'),
			},
		});

		assert.equal(result.status, 2);
		assert.match(result.stderr, /Cached test mode precondition failed: dist\/ is older/u);
		assert.match(result.stderr, /Cached mode does not rebuild dist\/ before running tests\./u);
		assert.match(result.stderr, /Fallback intent: mf run test_related/u);
		assert.match(result.stderr, /Artifact: dist\/cli\/index\.js/u);
		assert.match(result.stderr, /Stale or deleted changed files: src\/core\/deleted-cached-fixture\.ts/u);
	} finally {
		rmSync(staleOutputPath, { force: true });
		rmSync(tempRoot, { recursive: true, force: true });
	}
});

test('related selection keeps line-ending command changes schema-covered', () => {
	const selected = selectedFor(['src/cli/commands/line-endings.ts']);

	assert.equal(selected.has('line-endings.test.js'), true);
	assert.equal(selected.has('schema.test.js'), true);
	assert.equal(selected.has('schema-command-contracts.test.js'), true);
	assert.equal(selected.has('schema-explain-verify-output.test.js'), true);
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
	assert.equal(selected.has('schema.test.js'), false);
	assert.equal(selected.has('verify-inputs.test.js'), false);
	assert.equal(selected.has('verify-completion-verdict.test.js'), false);
});

test('test runner refuses overlapping repository build and test locks', () => {
	const tempRoot = mkdtempSync(path.join(tmpdir(), 'mustflow-test-lock-'));
	const lockDir = path.join(tempRoot, 'lock');

	try {
		mkdirSync(lockDir);
		writeFileSync(
			path.join(lockDir, 'owner.json'),
			`${JSON.stringify({
				pid: process.pid,
				cwd: projectRoot,
				command: 'node scripts/run-cli-tests.mjs --build full-auto',
				started_at: new Date().toISOString(),
			})}\n`,
		);

		const result = spawnSync(process.execPath, ['scripts/run-cli-tests.mjs', '--build', 'fast', '--list'], {
			cwd: projectRoot,
			encoding: 'utf8',
			env: {
				...process.env,
				MUSTFLOW_TEST_RUNNER_LOCK_DIR: lockDir,
			},
		});

		assert.equal(result.status, 2);
		assert.match(result.stderr, /Another mustflow CLI test runner is already active/u);
		assert.match(result.stderr, /Owner PID:/u);
	} finally {
		rmSync(tempRoot, { recursive: true, force: true });
	}
});

test('related selection treats shared CLI harness changes as broad CLI risk', () => {
	const selected = selectedFor(['tests/cli/helpers/cli-harness.js']);

	assert.equal(selected.has('init.test.js'), true);
	assert.equal(selected.has('verify.test.js'), true);
	assert.equal(selected.has('verify-changed.test.js'), true);
	assert.equal(selected.has('package.test.js'), false);
	assert.equal(selected.has('package-template.test.js'), false);
});

test('related selection reports release-sensitive template changes', () => {
	const report = selectRelated(['templates/default/AGENTS.md']);

	assert.equal(report.release_sensitive, true);
	assert.deepEqual(report.selected.sort(), ['docs.test.js', 'init-default-template.test.js', 'init.test.js', 'update.test.js']);
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

test('related selection maps init command changes to default template installation', () => {
	const selected = selectedFor(['src/cli/commands/init.ts']);

	assert.equal(selected.has('init.test.js'), true);
	assert.equal(selected.has('init-default-template.test.js'), true);
	assert.equal(selected.has('workflow.test.js'), true);
});

test('related selection maps skill changes to authoring skill contracts', () => {
	const selected = selectedFor(['.mustflow/skills/cpp-code-change/SKILL.md']);

	assert.equal(selected.has('authoring-skill-contracts.test.js'), true);
	assert.equal(selected.has('authoring-fixtures.test.js'), false);
});

test('fast baseline keeps lightweight command and workflow contracts', () => {
	const report = listSuite('fast');

	assert.deepEqual(report.selected.slice(0, 11), [
		'adapters.test.js',
		'classify.test.js',
		'evidence.test.js',
		'impact.test.js',
		'handoff.test.js',
		'next.test.js',
		'onboard.test.js',
		'router.test.js',
		'status.test.js',
		'version-sources.test.js',
		'workspace.test.js',
	]);
	assert.equal(report.selected.includes('docs.test.js'), true);
	assert.equal(report.selected.includes('authoring-fixtures.test.js'), true);
	assert.equal(report.selected.includes('authoring-skill-contracts.test.js'), true);
	assert.equal(report.selected.includes('i18n-architecture.test.js'), true);
	assert.equal(report.selected.includes('pages-workflow.test.js'), true);
});

test('fast baseline keeps harness safety checks but excludes heavier feature suites', () => {
	const report = listSuite('fast');

	assert.equal(report.selected.includes('index-dry-run.test.js'), true);
	for (const testName of indexTests) {
		assert.equal(report.selected.includes(testName), true);
	}
	assert.equal(report.selected.includes('security-fuzz.test.js'), true);
	assert.equal(report.selected.includes('test-audit.test.js'), true);
	assert.equal(report.selected.includes('test-selection.test.js'), true);
	assert.equal(report.selected.includes('search.test.js'), false);
	for (const testName of runTests) {
		assert.equal(report.selected.includes(testName), false);
	}
	assert.equal(report.selected.includes('update.test.js'), false);
	assert.equal(report.selected.includes('package.test.js'), false);
	assert.equal(report.selected.includes('package-template.test.js'), false);
});

test('full-auto keeps the same coverage surface as the full suite', () => {
	const full = listSuite('full');
	const fullAuto = listSuite('full-auto');

	assert.deepEqual(fullAuto.selected, full.selected);
	assert.equal(fullAuto.selected.length > 0, true);
	assert.equal(fullAuto.selected.includes('package.test.js'), true);
	assert.equal(fullAuto.selected.includes('package-template.test.js'), true);
});
