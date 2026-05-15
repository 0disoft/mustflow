import { spawnSync } from 'node:child_process';
import { existsSync, readdirSync, statSync } from 'node:fs';
import os from 'node:os';
import { performance } from 'node:perf_hooks';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const testsRoot = path.join(repoRoot, 'tests', 'cli');
const distCliEntrypoint = path.join(repoRoot, 'dist', 'cli', 'index.js');
const allCliTests = readdirSync(testsRoot)
	.filter((name) => name.endsWith('.test.js'))
	.sort((left, right) => left.localeCompare(right));

const fastTests = [
	'adapters.test.js',
	'docs.test.js',
	'authoring-fixtures.test.js',
	'classify.test.js',
	'impact.test.js',
	'i18n-architecture.test.js',
	'handoff.test.js',
	'index.test.js',
	'pages-workflow.test.js',
	'router.test.js',
	'security-fuzz.test.js',
	'status.test.js',
	'test-audit.test.js',
	'version-sources.test.js',
];

const releaseTests = ['package.test.js'];
const cliTests = allCliTests.filter((name) => !releaseTests.includes(name));
const coverageTests = fastTests;
const scheduler = process.env.MUSTFLOW_TEST_SCHEDULER ?? 'default';

const commandTestNames = new Set(allCliTests);
const commandRelatedTests = new Map([
	['adapters', ['adapters.test.js', 'router.test.js', 'schema.test.js']],
	['classify', ['classify.test.js', 'router.test.js', 'schema.test.js']],
	['dashboard', ['dashboard.test.js', 'router.test.js']],
	['docs', ['docs.test.js', 'router.test.js']],
	['explain', ['explain.test.js', 'explain-authority.test.js', 'explain-command.test.js', 'explain-skills.test.js', 'explain-source-anchor.test.js', 'explain-surface.test.js', 'explain-verify.test.js', 'router.test.js']],
	['handoff', ['handoff.test.js', 'router.test.js', 'schema.test.js']],
	['impact', ['impact.test.js', 'router.test.js', 'schema.test.js']],
	['version', ['index.test.js', 'router.test.js']],
]);

const relatedRules = [
	{ match: /^schemas\//u, tests: ['schema.test.js'] },
	{ match: /^templates\//u, tests: ['init.test.js', 'update.test.js'] },
	{ match: /^tests\/fixtures\/authoring\//u, tests: ['authoring-fixtures.test.js'] },
	{ match: /^\.mustflow\/skills\/(readme-authoring|project-context-authoring)\//u, tests: ['authoring-fixtures.test.js'] },
	{ match: /^src\/cli\/index\.ts$/u, tests: ['router.test.js', 'index.test.js'] },
	{ match: /^src\/cli\/i18n\//u, tests: ['i18n-architecture.test.js', 'router.test.js', 'dashboard.test.js'] },
	{
		match: /^src\/cli\/commands\/([^/]+)\.ts$/u,
		testsForMatch: ([, command]) => commandRelatedTests.get(command) ?? [`${command}.test.js`, 'router.test.js'],
	},
	{ match: /^src\/cli\/lib\/dashboard/u, tests: ['dashboard.test.js'] },
	{ match: /^src\/cli\/lib\/doc-review-ledger\.ts$/u, tests: ['docs.test.js', 'dashboard.test.js'] },
	{ match: /^src\/cli\/lib\/local-index\.ts$/u, tests: ['index.test.js', 'search.test.js', 'explain-command.test.js', 'explain-surface.test.js'] },
	{ match: /^src\/cli\/lib\/npm-version-check\.ts$/u, tests: ['index.test.js', 'router.test.js'] },
	{ match: /^src\/cli\/lib\/package-info\.ts$/u, tests: ['index.test.js'] },
	{ match: /^src\/cli\/lib\/command-registry\.ts$/u, tests: ['run.test.js', 'dashboard.test.js', 'router.test.js'] },
	{ match: /^src\/cli\/lib\/validation\.ts$/u, tests: ['check.test.js', 'check-command-contracts.test.js', 'check-config-validation.test.js', 'check-doc-authority.test.js', 'check-skill-contracts.test.js', 'check-source-anchors.test.js', 'check-versioning.test.js', 'schema.test.js'] },
	{ match: /^src\/cli\/lib\/template/u, tests: ['init.test.js', 'update.test.js'] },
	{ match: /^src\/cli\/lib\/root/u, tests: ['root-discovery.test.js'] },
	{ match: /^src\/cli\/lib\/schema/u, tests: ['schema.test.js'] },
	{ match: /^src\/core\/change-(classification|verification)\.ts$/u, tests: ['classify.test.js', 'verify.test.js', 'explain-surface.test.js', 'explain-verify.test.js', 'schema.test.js'] },
	{ match: /^src\/core\/adapter-compatibility\.ts$/u, tests: ['adapters.test.js', 'schema.test.js'] },
	{ match: /^src\/core\/contract-models\.ts$/u, tests: ['check.test.js', 'package.test.js'] },
	{ match: /^src\/core\/(release-version-validation|version-impact|version-sources|version-sync-policy)\.ts$/u, tests: ['check-versioning.test.js', 'package.test.js'] },
	{ match: /^src\/core\/handoff-record\.ts$/u, tests: ['handoff.test.js', 'schema.test.js'] },
	{ match: /^src\/core\/authority-resolution\.ts$/u, tests: ['check-doc-authority.test.js', 'explain-authority.test.js'] },
	{ match: /^src\/core\/check-issues\.ts$/u, tests: ['check.test.js', 'schema.test.js'] },
	{ match: /^src\/core\/public-surface-explanation\.ts$/u, tests: ['explain-surface.test.js'] },
	{ match: /^src\/core\/command-effects\.ts$/u, tests: ['check-command-contracts.test.js', 'explain-command.test.js', 'index.test.js', 'run.test.js'] },
	{ match: /^src\/core\/command-explanation\.ts$/u, tests: ['explain-command.test.js'] },
	{ match: /^src\/core\/command-cwd\.ts$/u, tests: ['run.test.js'] },
	{ match: /^src\/core\/command-contract-validation\.ts$/u, tests: ['check-command-contracts.test.js', 'run.test.js'] },
	{ match: /^src\/core\/verification-plan\.ts$/u, tests: ['verify.test.js', 'explain-verify.test.js', 'schema.test.js'] },
	{ match: /^src\/core\/skill-route-(alignment|explanation)\.ts$/u, tests: ['check-skill-contracts.test.js', 'explain-skills.test.js'] },
	{ match: /^src\/core\/source-anchor-(explanation|validation)\.ts$/u, tests: ['check-source-anchors.test.js', 'explain-source-anchor.test.js'] },
	{ match: /^src\/core\/source-anchor-status\.ts$/u, tests: ['index.test.js', 'search.test.js'] },
	{ match: /^src\/core\/source-anchors\.ts$/u, tests: ['check-source-anchors.test.js', 'explain-source-anchor.test.js', 'index.test.js', 'search.test.js'] },
	{ match: /^src\/core\/line-endings\.ts$/u, tests: ['line-endings.test.js', 'schema.test.js'] },
	{ match: /^scripts\/audit-tests\.mjs$/u, tests: ['test-audit.test.js'] },
	{ match: /^tests\/cli\/([^/]+\.test\.js)$/u, testsForMatch: ([, testName]) => [testName] },
	{ match: /^\.mustflow\/config\/commands\.toml$/u, tests: ['run.test.js'] },
	{ match: /^docs-site\//u, tests: ['docs.test.js'] },
	{ match: /\.(md|mdx)$/u, tests: ['docs.test.js'] },
];

const relatedReleaseRules = [
	/^package\.json$/u,
	/^schemas\//u,
	/^templates\//u,
	/^src\/cli\/lib\/package-info\.ts$/u,
	/^src\/cli\/lib\/template/u,
	/^\.mustflow\/config\/commands\.toml$/u,
];

function gitList(args) {
	const result = spawnSync('git', args, { cwd: repoRoot, encoding: 'utf8' });
	if (result.status !== 0) {
		return [];
	}
	return result.stdout
		.split(/\r?\n/u)
		.map((line) => line.trim())
		.filter(Boolean)
		.map((line) => line.replaceAll('\\', '/'));
}

function changedFiles() {
	return [
		...gitList(['diff', '--name-only', '--relative']),
		...gitList(['diff', '--name-only', '--cached', '--relative']),
		...gitList(['ls-files', '--others', '--exclude-standard']),
	];
}

const currentChangedFiles = changedFiles();
const cachedModeUnsafeRules = [
	/^src\//u,
	/^tsconfig(?:\..*)?\.json$/u,
];

function compiledOutputPathForSource(relativePath) {
	if (!relativePath.startsWith('src/') || !relativePath.endsWith('.ts')) {
		return undefined;
	}

	return path.join(repoRoot, ...relativePath.replace(/^src\//u, 'dist/').replace(/\.ts$/u, '.js').split('/'));
}

function uniqueExisting(testNames) {
	return [...new Set(testNames)].filter((name) => commandTestNames.has(name));
}

function relatedTests() {
	const tests = new Set();

	for (const file of currentChangedFiles) {
		for (const rule of relatedRules) {
			const match = rule.match.exec(file);
			if (!match) {
				continue;
			}

			const names = rule.testsForMatch ? rule.testsForMatch(match) : rule.tests;
			for (const name of names) {
				if (commandTestNames.has(name)) {
					tests.add(name);
				}
			}
		}
	}

	return tests.size > 0 ? [...tests] : fastTests;
}

function hasRelatedReleaseChanges() {
	return currentChangedFiles.some((file) => relatedReleaseRules.some((rule) => rule.test(file)));
}

const suites = {
	fast: fastTests,
	'fast-cached': fastTests,
	'fast-profile': fastTests,
	related: relatedTests(),
	'related-cached': relatedTests(),
	'related-profile': relatedTests(),
	cli: cliTests,
	coverage: coverageTests,
	release: releaseTests,
	full: allCliTests,
	'full-profile': allCliTests,
};

const mode = process.argv[2] ?? 'full';
const selected = suites[mode];

if (!selected) {
	console.error(`Unknown test suite "${mode}". Expected one of: ${Object.keys(suites).join(', ')}`);
	process.exit(2);
}

function readPositiveIntegerEnv(name, fallback) {
	const rawValue = process.env[name];

	if (!rawValue) {
		return fallback;
	}

	const value = Number(rawValue);

	if (!Number.isInteger(value) || value < 1) {
		console.error(`${name} must be a positive integer.`);
		process.exit(2);
	}

	return String(value);
}

function readRelatedConcurrency() {
	if (process.env.MUSTFLOW_TEST_RELATED_CONCURRENCY) {
		return readPositiveIntegerEnv('MUSTFLOW_TEST_RELATED_CONCURRENCY', '4');
	}

	return readPositiveIntegerEnv('MUSTFLOW_TEST_CONCURRENCY', '4');
}

function readCliConcurrency() {
	if (process.env.MUSTFLOW_TEST_CLI_CONCURRENCY) {
		return readPositiveIntegerEnv('MUSTFLOW_TEST_CLI_CONCURRENCY', '4');
	}

	return readPositiveIntegerEnv('MUSTFLOW_TEST_CONCURRENCY', '1');
}

function readFullConcurrency() {
	if (process.env.MUSTFLOW_TEST_FULL_CONCURRENCY) {
		return readPositiveIntegerEnv('MUSTFLOW_TEST_FULL_CONCURRENCY', '4');
	}

	return readPositiveIntegerEnv('MUSTFLOW_TEST_CONCURRENCY', '1');
}

function testDemand(testPath) {
	const name = path.basename(testPath);

	if (['index.test.js', 'search.test.js'].includes(name)) {
		return { cpu: 1, io: 3, process: 2, sqlite: 1, git: 0, className: 'sqlite_io_heavy' };
	}

	if (
		[
			'check.test.js',
			'check-command-contracts.test.js',
			'check-config-validation.test.js',
			'check-doc-authority.test.js',
			'check-skill-contracts.test.js',
			'check-source-anchors.test.js',
			'check-versioning.test.js',
			'explain-authority.test.js',
			'explain-command.test.js',
			'explain-skills.test.js',
			'explain.test.js',
			'explain-source-anchor.test.js',
			'explain-surface.test.js',
			'explain-verify.test.js',
			'run.test.js',
			'update.test.js',
			'package.test.js',
		].includes(name)
	) {
		return { cpu: 1, io: 3, process: 3, sqlite: 0, git: name === 'check.test.js' ? 1 : 0, className: 'process_io_heavy' };
	}

	if (['root-discovery.test.js', 'init.test.js'].includes(name)) {
		return { cpu: 1, io: 2, process: 2, sqlite: 0, git: 0, className: 'process_medium' };
	}

	return { cpu: 1, io: 1, process: 1, sqlite: 0, git: 0, className: 'light' };
}

function resourceCapacity() {
	const cpuDefault = Math.max(1, (os.availableParallelism?.() ?? os.cpus().length) - 1);
	return {
		cpu: Number(readPositiveIntegerEnv('MUSTFLOW_TEST_CPU_TOKENS', String(cpuDefault))),
		io: Number(readPositiveIntegerEnv('MUSTFLOW_TEST_IO_TOKENS', '4')),
		process: Number(readPositiveIntegerEnv('MUSTFLOW_TEST_PROCESS_TOKENS', '4')),
		sqlite: Number(readPositiveIntegerEnv('MUSTFLOW_TEST_SQLITE_TOKENS', '1')),
		git: Number(readPositiveIntegerEnv('MUSTFLOW_TEST_GIT_TOKENS', '1')),
	};
}

function addDemand(left, right) {
	return {
		cpu: left.cpu + right.cpu,
		io: left.io + right.io,
		process: left.process + right.process,
		sqlite: left.sqlite + right.sqlite,
		git: left.git + right.git,
	};
}

function emptyDemand() {
	return { cpu: 0, io: 0, process: 0, sqlite: 0, git: 0 };
}

function demandFits(demand, capacity) {
	return (
		demand.cpu <= capacity.cpu &&
		demand.io <= capacity.io &&
		demand.process <= capacity.process &&
		demand.sqlite <= capacity.sqlite &&
		demand.git <= capacity.git
	);
}

function dominantPressure(demand) {
	return Math.max(demand.cpu, demand.io, demand.process, demand.sqlite * 4, demand.git * 4);
}

function planWaves(paths) {
	const capacity = resourceCapacity();
	const jobs = paths
		.map((testPath) => ({ testPath, demand: testDemand(testPath) }))
		.sort((left, right) => {
			const pressureDiff = dominantPressure(right.demand) - dominantPressure(left.demand);
			return pressureDiff === 0 ? right.testPath.localeCompare(left.testPath) : pressureDiff;
		});
	const waves = [];

	for (const job of jobs) {
		const candidate = waves.find((wave) => demandFits(addDemand(wave.demand, job.demand), capacity));
		if (candidate) {
			candidate.jobs.push(job);
			candidate.demand = addDemand(candidate.demand, job.demand);
			continue;
		}

		waves.push({ jobs: [job], demand: addDemand(emptyDemand(), job.demand) });
	}

	return waves.map((wave) => {
		const fileCount = wave.jobs.length;
		const concurrencyLimit =
			wave.demand.sqlite > 0
				? capacity.sqlite
				: wave.demand.git > 0
					? capacity.git
					: wave.demand.io > capacity.io / 2
						? Math.max(1, Math.min(fileCount, capacity.io))
						: Math.max(1, Math.min(fileCount, capacity.cpu + 1));

		return {
			testPaths: wave.jobs.map((job) => job.testPath),
			concurrency: String(Math.min(fileCount, concurrencyLimit)),
			classes: [...new Set(wave.jobs.map((job) => job.demand.className))].sort(),
		};
	});
}

const testPaths = uniqueExisting(selected).map((name) => path.join('tests', 'cli', name));
const profileMode = mode.endsWith('-profile');
const cachedMode = mode.endsWith('-cached');
const baseMode = mode.replace(/-(?:cached|profile)$/u, '');
const concurrency =
	mode === 'coverage'
		? readPositiveIntegerEnv('MUSTFLOW_TEST_COVERAGE_CONCURRENCY', '4')
		: baseMode === 'related'
			? readRelatedConcurrency()
		: baseMode === 'fast'
			? readPositiveIntegerEnv('MUSTFLOW_TEST_CONCURRENCY', '8')
		: baseMode === 'cli'
			? readCliConcurrency()
		: baseMode === 'full'
			? readFullConcurrency()
			: '1';
const nodeTestArgs = ['--test', `--test-concurrency=${concurrency}`];

if (mode === 'coverage') {
	nodeTestArgs.push('--experimental-test-coverage');
}

function assertCachedModeSafe() {
	if (!cachedMode) {
		return;
	}

	if (!existsSync(distCliEntrypoint)) {
		console.error('Cached test mode requires dist/cli/index.js. Run `mf run build` or `mf run test_related` first.');
		process.exit(2);
	}

	const unsafeFiles = currentChangedFiles.filter((file) => cachedModeUnsafeRules.some((rule) => rule.test(file)));
	const distMtimeMs = statSync(distCliEntrypoint).mtimeMs;
	const staleFiles = unsafeFiles.filter((file) => {
		const fullPath = path.join(repoRoot, ...file.split('/'));
		if (!existsSync(fullPath)) {
			const compiledOutputPath = compiledOutputPathForSource(file);
			return !compiledOutputPath || existsSync(compiledOutputPath);
		}

		return statSync(fullPath).mtimeMs > distMtimeMs;
	});

	if (staleFiles.length > 0) {
		console.error(
			[
				'Cached test mode cannot be used while dist/ is older than changed TypeScript source or compiler configuration.',
				'Run `mf run test_related` so dist/ is rebuilt before tests.',
				`Stale or deleted changed files: ${staleFiles.join(', ')}`,
			].join('\n'),
		);
		process.exit(2);
	}
}

assertCachedModeSafe();

function runProfiledTests() {
	const timings = [];
	const profileNodeArgs = ['--test', '--test-concurrency=1'];

	for (const testPath of testPaths) {
		const start = performance.now();
		const result = spawnSync(process.execPath, [...profileNodeArgs, testPath], {
			cwd: repoRoot,
			encoding: 'utf8',
		});
		const durationMs = Math.round(performance.now() - start);
		timings.push({ testPath, durationMs, status: result.status ?? 1 });

		if (result.error) {
			console.error(result.error.message);
			process.exit(1);
		}

		if (result.status !== 0) {
			process.stdout.write(result.stdout);
			process.stderr.write(result.stderr);
			console.error(`Profiled test failed: ${testPath}`);
			process.exit(result.status ?? 1);
		}
	}

	const totalMs = timings.reduce((sum, timing) => sum + timing.durationMs, 0);
	const slowest = [...timings].sort((left, right) => right.durationMs - left.durationMs);

	console.log(`Profiled ${mode} CLI tests (${timings.length} files, serial total ${totalMs} ms)`);
	for (const timing of slowest) {
		console.log(`${String(timing.durationMs).padStart(6, ' ')} ms  ${timing.testPath}`);
	}
}

function runTestProcess(paths, testArgs, stdio = 'inherit') {
	return spawnSync(process.execPath, [...testArgs, ...paths], {
		cwd: repoRoot,
		stdio,
	});
}

function runScheduledTests() {
	if (mode === 'coverage') {
		console.error('MUSTFLOW_TEST_SCHEDULER=auto is not supported for coverage mode.');
		process.exit(2);
	}

	const waves = planWaves(testPaths);
	console.log(`Running ${mode} CLI tests with auto scheduler (${testPaths.length} files, ${waves.length} waves)`);

	for (const [index, wave] of waves.entries()) {
		const waveArgs = ['--test', `--test-concurrency=${wave.concurrency}`];
		console.log(
			`Wave ${index + 1}/${waves.length} (${wave.testPaths.length} files, concurrency ${wave.concurrency}, classes ${wave.classes.join(', ')}): ${wave.testPaths.join(', ')}`,
		);
		const result = runTestProcess(wave.testPaths, waveArgs);

		if (result.error) {
			console.error(result.error.message);
			process.exit(1);
		}

		if (result.status !== 0) {
			process.exit(result.status ?? 1);
		}
	}
}

if (profileMode) {
	runProfiledTests();
	process.exit(0);
}

if (baseMode === 'related' && hasRelatedReleaseChanges()) {
	console.log('Release-sensitive files changed; run `mf run test_release` before publishing or committing release metadata.');
}

if (scheduler === 'auto') {
	runScheduledTests();
	process.exit(0);
}

console.log(
	`Running ${mode} CLI tests (${testPaths.length} files, concurrency ${concurrency}): ${testPaths.join(', ')}`,
);

const result = runTestProcess(testPaths, nodeTestArgs);

if (result.error) {
	console.error(result.error.message);
	process.exit(1);
}

process.exit(result.status ?? 1);
