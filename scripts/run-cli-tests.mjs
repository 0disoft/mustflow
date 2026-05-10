import { spawnSync } from 'node:child_process';
import { readdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const testsRoot = path.join(repoRoot, 'tests', 'cli');
const allCliTests = readdirSync(testsRoot)
	.filter((name) => name.endsWith('.test.js'))
	.sort((left, right) => left.localeCompare(right));

const fastTests = [
	'docs.test.js',
	'authoring-fixtures.test.js',
	'classify.test.js',
	'impact.test.js',
	'i18n-architecture.test.js',
	'index.test.js',
	'pages-workflow.test.js',
	'router.test.js',
	'status.test.js',
	'version-sources.test.js',
];

const releaseTests = ['package.test.js'];
const cliTests = allCliTests.filter((name) => !releaseTests.includes(name));
const coverageTests = fastTests;

const commandTestNames = new Set(allCliTests);
const commandRelatedTests = new Map([
	['classify', ['classify.test.js', 'router.test.js', 'schema.test.js']],
	['dashboard', ['dashboard.test.js', 'router.test.js']],
	['docs', ['docs.test.js', 'router.test.js']],
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
	{ match: /^src\/core\/check-issues\.ts$/u, tests: ['check.test.js', 'schema.test.js'] },
	{ match: /^src\/core\/command-contract-validation\.ts$/u, tests: ['check.test.js', 'run.test.js'] },
	{ match: /^src\/core\/verification-plan\.ts$/u, tests: ['verify.test.js', 'schema.test.js'] },
	{ match: /^src\/core\/source-anchor-(explanation|validation)\.ts$/u, tests: ['check.test.js', 'explain.test.js'] },
	{ match: /^src\/core\/source-anchor-status\.ts$/u, tests: ['index.test.js', 'search.test.js'] },
	{ match: /^src\/core\/source-anchors\.ts$/u, tests: ['check.test.js', 'explain.test.js', 'index.test.js', 'search.test.js'] },
	{ match: /^src\/core\/line-endings\.ts$/u, tests: ['line-endings.test.js', 'schema.test.js'] },
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

function uniqueExisting(testNames) {
	return [...new Set(testNames)].filter((name) => commandTestNames.has(name));
}

function relatedTests() {
	const tests = new Set();

	for (const file of changedFiles()) {
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
	return changedFiles().some((file) => relatedReleaseRules.some((rule) => rule.test(file)));
}

const suites = {
	fast: fastTests,
	related: relatedTests(),
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

const testPaths = uniqueExisting(selected).map((name) => path.join('tests', 'cli', name));
const concurrency = mode === 'fast' || mode === 'related' ? '4' : '1';
const nodeTestArgs = ['--test', `--test-concurrency=${concurrency}`];

if (mode === 'coverage') {
	nodeTestArgs.push('--experimental-test-coverage');
}

console.log(
	`Running ${mode} CLI tests (${testPaths.length} files, concurrency ${concurrency}): ${testPaths.join(', ')}`,
);

if (mode === 'related' && hasRelatedReleaseChanges()) {
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
