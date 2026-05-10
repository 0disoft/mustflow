import { readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const cliTestsRoot = path.join(repoRoot, 'tests', 'cli');
const args = new Set(process.argv.slice(2));
const json = args.has('--json');

function collectTestFiles(directory) {
	return readdirSync(directory)
		.filter((name) => name.endsWith('.test.js'))
		.sort((left, right) => left.localeCompare(right))
		.map((name) => path.join(directory, name));
}

function countMatches(content, pattern) {
	return [...content.matchAll(pattern)].length;
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

	summaries.push({
		path: relativePath,
		bytes: stats.size,
		test_count: testCount,
		skipped_count: skippedCount,
		todo_count: todoCount,
		only_count: onlyCount,
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
