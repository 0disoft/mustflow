import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

const projectRoot = path.resolve(fileURLToPath(new URL('../..', import.meta.url)));
const cliPath = path.join(projectRoot, 'dist', 'cli', 'index.js');

function createTempProject() {
	return mkdtempSync(path.join(tmpdir(), 'mustflow-line-endings-'));
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

function writeTrackedFixture(projectPath) {
	writeFileSync(path.join(projectPath, '.gitattributes'), '* text=auto eol=lf\n');
	mkdirSync(path.join(projectPath, 'src'), { recursive: true });
	writeFileSync(path.join(projectPath, 'src', 'crlf.txt'), 'one\r\ntwo\r\n');
	writeFileSync(path.join(projectPath, 'src', 'lf.txt'), 'one\ntwo\n');
	runGit(projectPath, ['add', '.gitattributes', 'src']);
}

test('line-endings check reports CRLF drift in tracked files', () => {
	const projectPath = createTempProject();

	try {
		initProject(projectPath);
		writeTrackedFixture(projectPath);

		const result = runCli(projectPath, ['line-endings', 'check', '--json']);
		const output = JSON.parse(result.stdout);

		assert.equal(result.status, 1);
		assert.equal(output.schema_version, '1');
		assert.equal(output.command, 'line-endings');
		assert.equal(output.mode, 'check');
		assert.equal(output.scope, 'changed');
		assert.equal(output.policy, 'lf');
		assert.equal(output.non_compliant_files.length, 1);
		assert.equal(output.non_compliant_files[0].path, 'src/crlf.txt');
		assert.equal(output.non_compliant_files[0].lineEnding, 'crlf');
		assert.equal(output.wrote_files, false);
	} finally {
		removeTempProject(projectPath);
	}
});

test('line-endings normalize previews then applies LF normalization', () => {
	const projectPath = createTempProject();

	try {
		initProject(projectPath);
		writeTrackedFixture(projectPath);

		const dryRun = runCli(projectPath, ['line-endings', 'normalize', '--dry-run', '--json']);
		const dryRunOutput = JSON.parse(dryRun.stdout);
		assert.equal(dryRun.status, 1);
		assert.equal(dryRunOutput.dry_run, true);
		assert.equal(dryRunOutput.wrote_files, false);
		assert.equal(readFileSync(path.join(projectPath, 'src', 'crlf.txt'), 'utf8'), 'one\r\ntwo\r\n');

		const apply = runCli(projectPath, ['line-endings', 'normalize', '--apply', '--json']);
		const applyOutput = JSON.parse(apply.stdout);
		assert.equal(apply.status, 0);
		assert.equal(applyOutput.scope, 'changed');
		assert.equal(applyOutput.wrote_files, true);
		assert.deepEqual(applyOutput.changed_files, ['src/crlf.txt']);
		assert.equal(readFileSync(path.join(projectPath, 'src', 'crlf.txt'), 'utf8'), 'one\ntwo\n');

		const check = runCli(projectPath, ['line-endings', 'check', '--json']);
		const checkOutput = JSON.parse(check.stdout);
		assert.equal(check.status, 0);
		assert.equal(checkOutput.non_compliant_files.length, 0);
	} finally {
		removeTempProject(projectPath);
	}
});

test('line-endings normalize refuses apply without LF policy', () => {
	const projectPath = createTempProject();

	try {
		initProject(projectPath);
		mkdirSync(path.join(projectPath, 'src'), { recursive: true });
		writeFileSync(path.join(projectPath, 'src', 'crlf.txt'), 'one\r\ntwo\r\n');
		runGit(projectPath, ['add', 'src']);

		const result = runCli(projectPath, ['line-endings', 'normalize', '--apply', '--json']);
		const output = JSON.parse(result.stdout);

		assert.equal(result.status, 1);
		assert.equal(output.policy, 'unknown');
		assert.equal(output.wrote_files, false);
		assert.match(output.issues.join('\n'), /No repository LF policy/);
		assert.equal(readFileSync(path.join(projectPath, 'src', 'crlf.txt'), 'utf8'), 'one\r\ntwo\r\n');
	} finally {
		removeTempProject(projectPath);
	}
});

test('line-endings rejects unsupported options with usage help', () => {
	const projectPath = createTempProject();

	try {
		initProject(projectPath);

		const unknownOption = runCli(projectPath, ['line-endings', 'check', '--bad']);
		const booleanValue = runCli(projectPath, ['line-endings', 'check', '--json=true']);

		assert.equal(unknownOption.status, 1);
		assert.match(unknownOption.stderr, /Unknown option: --bad/u);
		assert.match(unknownOption.stderr, /Usage: mf line-endings <check\|normalize> \[options\]/u);
		assert.equal(booleanValue.status, 1);
		assert.match(booleanValue.stderr, /Unknown option: --json=true/u);
		assert.match(booleanValue.stderr, /Usage: mf line-endings <check\|normalize> \[options\]/u);
	} finally {
		removeTempProject(projectPath);
	}
});
