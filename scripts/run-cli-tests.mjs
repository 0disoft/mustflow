import { spawnSync } from 'node:child_process';
import { existsSync, readdirSync, statSync } from 'node:fs';
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

const commandTestNames = new Set(allCliTests);
const commandRelatedTests = new Map([
	['adapters', ['adapters.test.js', 'router.test.js', 'schema.test.js']],
	['classify', ['classify.test.js', 'router.test.js', 'schema.test.js']],
	['dashboard', ['dashboard.test.js', 'router.test.js']],
	['docs', ['docs.test.js', 'router.test.js']],
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
	{ match: /^src\/cli\/lib\/local-index\.ts$/u, tests: ['index.test.js', 'search.test.js'] },
	{ match: /^src\/cli\/lib\/npm-version-check\.ts$/u, tests: ['index.test.js', 'router.test.js'] },
	{ match: /^src\/cli\/lib\/package-info\.ts$/u, tests: ['index.test.js'] },
	{ match: /^src\/cli\/lib\/command-registry\.ts$/u, tests: ['run.test.js', 'dashboard.test.js', 'router.test.js'] },
	{ match: /^src\/cli\/lib\/validation\.ts$/u, tests: ['check.test.js', 'schema.test.js'] },
	{ match: /^src\/cli\/lib\/template/u, tests: ['init.test.js', 'update.test.js'] },
	{ match: /^src\/cli\/lib\/root/u, tests: ['root-discovery.test.js'] },
	{ match: /^src\/cli\/lib\/schema/u, tests: ['schema.test.js'] },
	{ match: /^src\/core\/change-(classification|verification)\.ts$/u, tests: ['classify.test.js', 'verify.test.js', 'schema.test.js'] },
	{ match: /^src\/core\/adapter-compatibility\.ts$/u, tests: ['adapters.test.js', 'schema.test.js'] },
	{ match: /^src\/core\/contract-models\.ts$/u, tests: ['check.test.js', 'package.test.js'] },
	{ match: /^src\/core\/handoff-record\.ts$/u, tests: ['handoff.test.js', 'schema.test.js'] },
	{ match: /^src\/core\/check-issues\.ts$/u, tests: ['check.test.js', 'schema.test.js'] },
	{ match: /^src\/core\/command-contract-validation\.ts$/u, tests: ['check.test.js', 'run.test.js'] },
	{ match: /^src\/core\/verification-plan\.ts$/u, tests: ['verify.test.js', 'schema.test.js'] },
	{ match: /^src\/core\/source-anchor-(explanation|validation)\.ts$/u, tests: ['check.test.js', 'explain.test.js'] },
	{ match: /^src\/core\/source-anchor-status\.ts$/u, tests: ['index.test.js', 'search.test.js'] },
	{ match: /^src\/core\/source-anchors\.ts$/u, tests: ['check.test.js', 'explain.test.js', 'index.test.js', 'search.test.js'] },
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
	related: relatedTests(),
	'related-cached': relatedTests(),
	cli: cliTests,
	coverage: coverageTests,
	release: releaseTests,
	full: allCliTests,
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

const testPaths = uniqueExisting(selected).map((name) => path.join('tests', 'cli', name));
const baseMode = mode.endsWith('-cached') ? mode.slice(0, -'-cached'.length) : mode;
const concurrency =
	mode === 'coverage'
		? readPositiveIntegerEnv('MUSTFLOW_TEST_COVERAGE_CONCURRENCY', '4')
		: baseMode === 'related'
			? readRelatedConcurrency()
		: baseMode === 'fast'
			? readPositiveIntegerEnv('MUSTFLOW_TEST_CONCURRENCY', '8')
			: '1';
const nodeTestArgs = ['--test', `--test-concurrency=${concurrency}`];

if (mode === 'coverage') {
	nodeTestArgs.push('--experimental-test-coverage');
}

function assertCachedModeSafe() {
	if (!mode.endsWith('-cached')) {
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

console.log(
	`Running ${mode} CLI tests (${testPaths.length} files, concurrency ${concurrency}): ${testPaths.join(', ')}`,
);

if (baseMode === 'related' && hasRelatedReleaseChanges()) {
	console.log('Release-sensitive files changed; run `mf run test_release` before publishing or committing release metadata.');
}

const result = spawnSync(process.execPath, [...nodeTestArgs, ...testPaths], {
	cwd: repoRoot,
	stdio: 'inherit',
});

if (result.error) {
	console.error(result.error.message);
	process.exit(1);
}

process.exit(result.status ?? 1);
