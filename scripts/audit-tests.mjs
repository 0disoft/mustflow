import { readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const cliTestsRoot = path.join(repoRoot, 'tests', 'cli');
const args = new Set(process.argv.slice(2));
const json = args.has('--json');

const GOD_FILE_SCORE_THRESHOLD = 50;
const KIB = 1024;

const domainClusters = [
	{ id: 'command_contract', pattern: /\b(?:commands\.toml|command contract|run_policy|manual_only|intent)\b/giu },
	{ id: 'config_validation', pattern: /\b(?:mustflow\.toml|preferences|configuration fields|unsupported profile|locale)\b/giu },
	{ id: 'docs', pattern: /\b(?:docs-site|docs\/|documentation|managed markdown|AGENTS\.md)\b/giu },
	{ id: 'filesystem_paths', pattern: /\b(?:symlink|path traversal|outside the project|missing file|REPO_MAP\.md)\b/giu },
	{ id: 'i18n', pattern: /\b(?:i18n|locale|localized|translation)\b/giu },
	{ id: 'index_search', pattern: /\b(?:SQLite|index|search|FTS5|local index)\b/giu },
	{ id: 'package_release', pattern: /\b(?:package\.json|npm pack|publish|release|template manifest)\b/giu },
	{ id: 'prompt_cache', pattern: /\b(?:prompt cache|stable prefix|volatile state)\b/giu },
	{ id: 'security_privacy', pattern: /\b(?:secret|privacy|unsafe|security|retention|raw JSONL)\b/giu },
	{ id: 'skill_contracts', pattern: /\b(?:skill index|skill route|skill metadata|SKILL\.md|mustflow-section)\b/giu },
	{ id: 'source_anchors', pattern: /\b(?:source anchor|source anchors|source fingerprint)\b/giu },
	{ id: 'versioning', pattern: /\b(?:versioning|version source|package version|template version|semver)\b/giu },
];

const sourceSurfaces = [
	{ id: 'agents', pattern: /\b(?:AGENTS\.md|REPO_MAP\.md)\b/giu },
	{ id: 'docs', pattern: /\b(?:docs\/|docs-site\/)\b/giu },
	{ id: 'github', pattern: /\.github\//giu },
	{ id: 'mustflow', pattern: /\.mustflow\//giu },
	{ id: 'package', pattern: /\b(?:package\.json|npm pack|publish)\b/giu },
	{ id: 'schemas', pattern: /\bschemas\//giu },
	{ id: 'source_cli', pattern: /\b(?:src\/cli|dist\/cli)\b/giu },
	{ id: 'source_core', pattern: /\b(?:src\/core|dist\/core)\b/giu },
	{ id: 'templates', pattern: /\btemplates\//giu },
	{ id: 'test_fixtures', pattern: /\btests\/fixtures\//giu },
];

const mockFactoryPattern = /\b(?:jest|vi|sinon)\.(?:fn|mock|spyOn|stub)\b|\bmock(?:Fn|Function|Implementation)?\s*\(/giu;
const mockInteractionAssertionPattern =
	/\b(?:toHaveBeenCalled|toHaveBeenCalledWith|calledWith|callCount)\b|\.mock\.calls\b|\bmock[A-Za-z0-9_]*\.calls\b/giu;
const behaviorAssertionPattern =
	/\bassert\.(?:equal|notEqual|deepEqual|notDeepEqual|strictEqual|deepStrictEqual|ok|match|doesNotMatch|throws|rejects|doesNotThrow)\s*\(/giu;

function collectTestFiles(directory) {
	return readdirSync(directory)
		.filter((name) => name.endsWith('.test.js'))
		.sort((left, right) => left.localeCompare(right))
		.map((name) => path.join(directory, name));
}

function countMatches(content, pattern) {
	return [...content.matchAll(pattern)].length;
}

function matchingIds(content, definitions) {
	return definitions
		.filter(({ pattern }) => {
			pattern.lastIndex = 0;
			return pattern.test(content);
		})
		.map(({ id }) => id);
}

function maxDescribeDepth(content) {
	let depth = 0;
	let maxDepth = 0;

	for (const line of content.split(/\r?\n/u)) {
		if (/\bdescribe\s*\(/u.test(line)) {
			depth += 1;
			maxDepth = Math.max(maxDepth, depth);
		}

		if (/^\s*\}\);?\s*$/u.test(line)) {
			depth = Math.max(0, depth - 1);
		}
	}

	return maxDepth;
}

function godFileScore({ bytes, testCount, domainClusterCount, sourceSurfaceCount }) {
	let score = 0;

	if (bytes >= 64 * KIB) {
		score += 30;
	} else if (bytes >= 32 * KIB) {
		score += 15;
	}

	if (testCount >= 40) {
		score += 30;
	} else if (testCount >= 25) {
		score += 15;
	}

	if (domainClusterCount >= 6) {
		score += 25;
	} else if (domainClusterCount >= 4) {
		score += 12;
	}

	if (sourceSurfaceCount >= 5) {
		score += 20;
	}

	return score;
}

const files = collectTestFiles(cliTestsRoot);
const issues = [];
const summaries = [];

for (const filePath of files) {
	const relativePath = path.relative(repoRoot, filePath).replaceAll(path.sep, '/');
	const content = readFileSync(filePath, 'utf8');
	const stats = statSync(filePath);
	const testCount = countMatches(content, /\btest\s*\(/gu);
	const skippedCount = countMatches(content, /\btest\.skip\s*\(/gu);
	const todoCount = countMatches(content, /\btest\.todo\s*\(/gu);
	const onlyCount = countMatches(content, /\b(?:test|describe)\.only\s*\(/gu);
	const domainClusterIds = matchingIds(content, domainClusters);
	const sourceSurfaceIds = matchingIds(content, sourceSurfaces);
	const mockFactoryCount = countMatches(content, mockFactoryPattern);
	const mockInteractionAssertionCount = countMatches(content, mockInteractionAssertionPattern);
	const behaviorAssertionCount = countMatches(content, behaviorAssertionPattern);
	const describeDepth = maxDescribeDepth(content);
	const godScore = godFileScore({
		bytes: stats.size,
		testCount,
		domainClusterCount: domainClusterIds.length,
		sourceSurfaceCount: sourceSurfaceIds.length,
	});

	summaries.push({
		path: relativePath,
		bytes: stats.size,
		test_count: testCount,
		skipped_count: skippedCount,
		todo_count: todoCount,
		only_count: onlyCount,
		domain_cluster_count: domainClusterIds.length,
		domain_clusters: domainClusterIds,
		source_surface_count: sourceSurfaceIds.length,
		source_surfaces: sourceSurfaceIds,
		max_describe_depth: describeDepth,
		mock_factory_count: mockFactoryCount,
		mock_interaction_assertion_count: mockInteractionAssertionCount,
		behavior_assertion_count: behaviorAssertionCount,
	});

	if (testCount === 0) {
		issues.push({
			severity: 'warning',
			code: 'no_node_test_declarations',
			path: relativePath,
			detail: 'Test file does not appear to declare any node:test test cases.',
		});
	}

	if (onlyCount > 0) {
		issues.push({
			severity: 'error',
			code: 'focused_test_left_in_file',
			path: relativePath,
			detail: 'Focused test declarations must not be committed.',
		});
	}

	if (godScore >= GOD_FILE_SCORE_THRESHOLD) {
		issues.push({
			severity: 'warning',
			code: 'test_god_file_candidate',
			path: relativePath,
			score: godScore,
			signals: {
				bytes: stats.size,
				test_count: testCount,
				domain_cluster_count: domainClusterIds.length,
				domain_clusters: domainClusterIds,
				source_surface_count: sourceSurfaceIds.length,
				source_surfaces: sourceSurfaceIds,
				max_describe_depth: describeDepth,
			},
			detail:
				'Large test file with many cases across multiple behavior or source surfaces; split by behavior contract before adding more cases.',
		});
	}

	if (mockInteractionAssertionCount > 0 && behaviorAssertionCount === 0) {
		issues.push({
			severity: 'warning',
			code: 'mock_only_behavior_candidate',
			path: relativePath,
			signals: {
				mock_factory_count: mockFactoryCount,
				mock_interaction_assertion_count: mockInteractionAssertionCount,
				behavior_assertion_count: behaviorAssertionCount,
			},
			detail:
				'Test appears to assert mock interactions without an observable result assertion; verify returned value, state, output, effect, or public contract.',
		});
	}
}

const report = {
	schema_version: '1',
	command: 'test-audit',
	ok: issues.every((issue) => issue.severity !== 'error'),
	scope: 'tests/cli',
	summary: {
		files: files.length,
		test_cases: summaries.reduce((total, file) => total + file.test_count, 0),
		skipped_cases: summaries.reduce((total, file) => total + file.skipped_count, 0),
		todo_cases: summaries.reduce((total, file) => total + file.todo_count, 0),
		focused_cases: summaries.reduce((total, file) => total + file.only_count, 0),
		issues: issues.length,
	},
	issues,
	files: summaries,
};

if (json) {
	console.log(JSON.stringify(report, null, 2));
} else {
	console.log(`test-audit: ${report.summary.files} files, ${report.summary.test_cases} test cases`);
	for (const issue of issues) {
		console.log(`${issue.severity}: ${issue.path}: ${issue.code}: ${issue.detail}`);
	}
}

process.exit(report.ok ? 0 : 1);
