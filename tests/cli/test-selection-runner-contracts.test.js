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
import { utimesSync } from 'node:fs';
import { buildFreshnessReport } from '../../scripts/lib/build-freshness.mjs';

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
				generated_at: '2026-06-25T00:00:00.000Z',
				test_files: [
					{ path: '.\\tests\\cli\\router.test.js', duration_ms: 100 },
					{ path: 'tests/cli/workflow.test.js', duration_ms: -1 },
					{ path: 'tests/cli/status.test.js', duration_ms: '12' },
					{ path: null, duration_ms: 12 },
				],
			})}\n`,
		);

		const durations = readProfileDurations(profilePath, {
			nowMs: Date.parse('2026-06-25T12:00:00.000Z'),
		});
		const evidence = readProfileTimingEvidence(profilePath, {
			nowMs: Date.parse('2026-06-25T12:00:00.000Z'),
		});

		assert.equal(profileDurationForTestPath('tests/cli/router.test.js', durations), 100);
		assert.equal(profileDurationForTestPath('tests/cli/workflow.test.js', durations), undefined);
		assert.equal(evidence.status, 'used');
		assert.equal(evidence.reason, 'fresh');
		assert.equal(evidence.generatedAt, '2026-06-25T00:00:00.000Z');
		assert.equal(evidence.validEntries, 1);
		assert.equal(evidence.invalidEntries, 3);
		assert.equal(evidence.totalEntries, 4);
		assert.deepEqual(orderTestPathsByProfile(['tests/cli/status.test.js', 'tests/cli/router.test.js'], durations), [
			'tests/cli/router.test.js',
			'tests/cli/status.test.js',
		]);
	} finally {
		rmSync(tempRoot, { recursive: true, force: true });
	}
});

test('profile timing reader ignores stale missing and future generated timestamps', () => {
	const tempRoot = mkdtempSync(path.join(tmpdir(), 'mustflow-test-ordering-freshness-'));
	const profilePath = path.join(tempRoot, 'latest.profile.json');

	try {
		const cases = [
			{ generatedAt: undefined, reason: 'missing_timestamp' },
			{ generatedAt: '2026-06-01T00:00:00.000Z', reason: 'stale' },
			{ generatedAt: '2026-06-25T00:10:00.000Z', reason: 'future_timestamp' },
			{ generatedAt: 'not-a-date', reason: 'missing_timestamp' },
		];

		for (const { generatedAt, reason } of cases) {
			writeFileSync(
				profilePath,
				`${JSON.stringify({
					generated_at: generatedAt,
					test_files: [{ path: 'tests/cli/router.test.js', duration_ms: 100 }],
				})}\n`,
			);

			const evidence = readProfileTimingEvidence(profilePath, {
				nowMs: Date.parse('2026-06-25T00:00:00.000Z'),
			});

			assert.equal(evidence.status, 'skipped');
			assert.equal(evidence.reason, reason);
			assert.deepEqual([...evidence.durations], []);
		}
	} finally {
		rmSync(tempRoot, { recursive: true, force: true });
	}
});

test('profile timing reader reports missing malformed and empty profile reasons', () => {
	const tempRoot = mkdtempSync(path.join(tmpdir(), 'mustflow-test-ordering-status-'));
	const profilePath = path.join(tempRoot, 'latest.profile.json');

	try {
		assert.equal(readProfileTimingEvidence(profilePath).reason, 'missing');

		writeFileSync(profilePath, '{');
		assert.equal(readProfileTimingEvidence(profilePath).reason, 'malformed');

		writeFileSync(
			profilePath,
			`${JSON.stringify({
				generated_at: '2026-06-25T00:00:00.000Z',
				test_files: [{ path: 'tests/cli/router.test.js', duration_ms: -1 }],
			})}\n`,
		);
		const evidence = readProfileTimingEvidence(profilePath, {
			nowMs: Date.parse('2026-06-25T00:00:00.000Z'),
		});

		assert.equal(evidence.status, 'skipped');
		assert.equal(evidence.reason, 'no_valid_entries');
		assert.equal(evidence.invalidEntries, 1);
		assert.equal(evidence.totalEntries, 1);
	} finally {
		rmSync(tempRoot, { recursive: true, force: true });
	}
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

test('related cached list mirrors related selection without requiring a fresh dist build', () => {
	const changedFiles = ['src/core/line-endings.ts'];
	const related = listSuite('related', changedFiles);
	const relatedCached = listSuite('related-cached', changedFiles);

	assert.equal(relatedCached.mode, 'related-cached');
	assert.deepEqual(relatedCached.changed_files, changedFiles);
	assert.deepEqual(relatedCached.selected, related.selected);
	assert.deepEqual(relatedCached.selection_reasons, related.selection_reasons);
});

test('build freshness report detects missing stale fresh and deleted-source dist states', () => {
	const tempRoot = mkdtempSync(path.join(tmpdir(), 'mustflow-build-freshness-'));
	const distCliPath = path.join(tempRoot, 'dist', 'cli', 'index.js');
	const sourcePath = path.join(tempRoot, 'src', 'core', 'example.ts');
	const compiledPath = path.join(tempRoot, 'dist', 'core', 'example.js');
	const older = new Date('2026-01-01T00:00:00.000Z');
	const newer = new Date('2026-01-02T00:00:00.000Z');

	try {
		assert.equal(buildFreshnessReport(tempRoot, ['src/core/example.ts'], { distCliPath }).reason, 'missing_dist');

		mkdirSync(path.dirname(distCliPath), { recursive: true });
		mkdirSync(path.dirname(sourcePath), { recursive: true });
		writeFileSync(distCliPath, 'export {};\n');
		writeFileSync(sourcePath, 'export {};\n');
		utimesSync(distCliPath, older, older);
		utimesSync(sourcePath, newer, newer);

		let report = buildFreshnessReport(tempRoot, ['src/core/example.ts'], { distCliPath });
		assert.equal(report.fresh, false);
		assert.equal(report.reason, 'stale_inputs');
		assert.deepEqual(report.staleFiles, ['src/core/example.ts']);

		utimesSync(sourcePath, older, older);
		report = buildFreshnessReport(tempRoot, ['src/core/example.ts'], { distCliPath });
		assert.equal(report.fresh, true);
		assert.equal(report.reason, 'fresh');
		assert.deepEqual(report.staleFiles, []);

		rmSync(sourcePath, { force: true });
		mkdirSync(path.dirname(compiledPath), { recursive: true });
		writeFileSync(compiledPath, 'export {};\n');
		report = buildFreshnessReport(tempRoot, ['src/core/example.ts'], { distCliPath });
		assert.equal(report.fresh, false);
		assert.deepEqual(report.staleFiles, ['src/core/example.ts']);
	} finally {
		rmSync(tempRoot, { recursive: true, force: true });
	}
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

test('skill contract mode selects the changed skill shard and install surface', () => {
	const report = listSuite('skill-contracts', ['.mustflow/skills/hetzner-cloud-change/SKILL.md']);

	assert.deepEqual([...report.selected].sort(), [
		'authoring-skill-operations-contracts.test.js',
		'skill-install-surface-contracts.test.js',
	]);
});

test('fast baseline keeps harness safety checks but excludes heavier feature suites', () => {
	const report = listSuite('fast');

	assert.equal(report.selected.includes('index-dry-run.test.js'), true);
	for (const testName of indexTests) {
		assert.equal(report.selected.includes(testName), true);
	}
	assert.equal(report.selected.includes('security-fuzz.test.js'), true);
	assert.equal(report.selected.includes('test-audit.test.js'), true);
	assert.equal(report.selected.includes('test-selection-related-contracts.test.js'), true);
	assert.equal(report.selected.includes('test-selection-runner-contracts.test.js'), true);
	assert.equal(report.selected.includes('search.test.js'), false);
	for (const testName of runTests) {
		assert.equal(report.selected.includes(testName), false);
	}
	assert.equal(report.selected.includes('update.test.js'), false);
	for (const testName of packageContractTests) {
		assert.equal(report.selected.includes(testName), false);
	}
	assert.equal(report.selected.includes('package-template.test.js'), false);
});

test('full-auto keeps the same coverage surface as the full suite', () => {
	const full = listSuite('full');
	const fullAuto = listSuite('full-auto');

	assert.deepEqual(fullAuto.selected, full.selected);
	assert.equal(fullAuto.selected.length > 0, true);
	for (const testName of packageContractTests) {
		assert.equal(fullAuto.selected.includes(testName), true);
	}
	assert.equal(fullAuto.selected.includes('package-template.test.js'), true);
});

test('build freshness helper changes route through test selection runner contracts', () => {
	const report = selectRelated(['scripts/lib/build-freshness.mjs']);

	assert.equal(report.selected.includes('test-selection-runner-contracts.test.js'), true);
	assert.equal(report.selected.includes('test-selection-related-contracts.test.js'), true);
});
