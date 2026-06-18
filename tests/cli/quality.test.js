import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

const projectRoot = path.resolve(fileURLToPath(new URL('../..', import.meta.url)));
const cliPath = path.join(projectRoot, 'dist', 'cli', 'index.js');

function createTempProject() {
	return mkdtempSync(path.join(tmpdir(), 'mustflow-quality-'));
}

function removeTempProject(projectPath) {
	rmSync(projectPath, { recursive: true, force: true });
}

function runCli(cwd, args) {
	return spawnSync(process.execPath, [cliPath, ...args], {
		cwd,
		encoding: 'utf8',
	});
}

function runGit(cwd, args) {
	const result = spawnSync('git', args, {
		cwd,
		encoding: 'utf8',
	});
	assert.equal(result.status, 0, result.stderr || result.stdout);
}

function initProject(projectPath) {
	const result = runCli(projectPath, ['init', '--yes']);
	assert.equal(result.status, 0, result.stderr || result.stdout);
	runGit(projectPath, ['init']);
	runGit(projectPath, ['add', '.']);
	runGit(projectPath, ['-c', 'user.name=mustflow-test', '-c', 'user.email=mustflow@example.invalid', 'commit', '-m', 'baseline']);
}

function riskCodes(report) {
	return new Set(report.risky_files.flatMap((file) => file.risks.map((risk) => risk.code)));
}

test('quality check passes when no changed files are present', () => {
	const projectPath = createTempProject();

	try {
		initProject(projectPath);

		const result = runCli(projectPath, ['quality', 'check', '--json']);
		const output = JSON.parse(result.stdout);

		assert.equal(result.status, 0, result.stderr || result.stdout);
		assert.equal(output.schema_version, '1');
		assert.equal(output.command, 'quality');
		assert.equal(output.mode, 'check');
		assert.equal(output.scope, 'changed');
		assert.equal(output.ok, true);
		assert.equal(output.risk_count, 0);
		assert.deepEqual(output.risky_files, []);
	} finally {
		removeTempProject(projectPath);
	}
});

test('quality check detects changed-file gaming patterns', () => {
	const projectPath = createTempProject();

	try {
		initProject(projectPath);
		mkdirSync(path.join(projectPath, 'src'), { recursive: true });
		mkdirSync(path.join(projectPath, 'generated'), { recursive: true });
		const suppression = 'eslint-' + 'disable-next-line';
		const typeEscape = 'as ' + 'any';
		const bypass = 'test.' + 'skip';
		const placeholder = 'not ' + 'implemented';
		const emptyCatch = 'catch (error) ' + '{}';
		const longExpression = Array.from({ length: 50 }, (_, index) => `value${index}`).join(' + ');
		writeFileSync(
			path.join(projectPath, 'src', 'gaming.ts'),
			[
				`const stuffed = ${longExpression};`,
				'const first = 1; const second = 2;',
				`// ${suppression}`,
				`const escaped = value ${typeEscape};`,
				`${bypass}("hidden behavior", () => {});`,
				`throw new Error("${placeholder}");`,
				`try { risky(); } ${emptyCatch}`,
				'',
			].join('\n'),
		);
		writeFileSync(path.join(projectPath, 'generated', 'logic.ts'), 'export const generatedDecision = true;\n');

		const result = runCli(projectPath, ['quality', 'check', '--json']);
		const output = JSON.parse(result.stdout);
		const codes = riskCodes(output);

		assert.equal(result.status, 1);
		assert.equal(output.ok, false);
		assert.equal(output.scope, 'changed');
		assert.ok(codes.has('line_stuffing_added'));
		assert.ok(codes.has('multiple_statements_per_line_added'));
		assert.ok(codes.has('suppression_added'));
		assert.ok(codes.has('type_escape_added'));
		assert.ok(codes.has('test_bypass_marker_added'));
		assert.ok(codes.has('placeholder_added'));
		assert.ok(codes.has('empty_catch_swallow_added'));
		assert.ok(codes.has('generated_or_vendor_logic_added'));
	} finally {
		removeTempProject(projectPath);
	}
});

test('quality all-scope reports large helper containers', () => {
	const projectPath = createTempProject();

	try {
		initProject(projectPath);
		mkdirSync(path.join(projectPath, 'src'), { recursive: true });
		const helperLines = Array.from({ length: 125 }, (_, index) => `export const value${index} = ${index};`);
		writeFileSync(path.join(projectPath, 'src', 'big-helper.ts'), `${helperLines.join('\n')}\n`);
		runGit(projectPath, ['add', 'src/big-helper.ts']);
		runGit(projectPath, ['-c', 'user.name=mustflow-test', '-c', 'user.email=mustflow@example.invalid', 'commit', '-m', 'add helper']);

		const result = runCli(projectPath, ['quality', 'check', '--all', '--json']);
		const output = JSON.parse(result.stdout);
		const codes = riskCodes(output);

		assert.equal(result.status, 1);
		assert.equal(output.scope, 'tracked');
		assert.ok(codes.has('large_helper_container_added'));
	} finally {
		removeTempProject(projectPath);
	}
});

test('quality check rejects unsupported options with usage help', () => {
	const projectPath = createTempProject();

	try {
		initProject(projectPath);

		const unknownOption = runCli(projectPath, ['quality', 'check', '--bad']);
		const unknownAction = runCli(projectPath, ['quality', 'scan']);

		assert.equal(unknownOption.status, 1);
		assert.match(unknownOption.stderr, /Unknown option: --bad/u);
		assert.match(unknownOption.stderr, /Usage: mf quality <check> \[options\]/u);
		assert.equal(unknownAction.status, 1);
		assert.match(unknownAction.stderr, /Unknown quality action: scan/u);
		assert.match(unknownAction.stderr, /Usage: mf quality <check> \[options\]/u);
	} finally {
		removeTempProject(projectPath);
	}
});
