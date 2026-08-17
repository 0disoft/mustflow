import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';

const projectRoot = path.resolve(fileURLToPath(new URL('../..', import.meta.url)));
const guardPath = path.join(projectRoot, 'scripts', 'guard-commit-message.mjs');

function runGuard(message, options = {}) {
	return spawnSync(process.execPath, [guardPath, message], {
		encoding: 'utf8',
		...options,
	});
}

test('accepts a plain gitmoji commit message', () => {
	const result = runGuard('feat: add widget export');
	assert.equal(result.status, 0, result.stderr);
});

test('rejects a backtick in the commit message', () => {
	const result = runGuard('feat: use `git commit -F` for shell-safe messages');
	assert.equal(result.status, 1);
	assert.match(result.stderr, /backtick/u);
	assert.match(result.stderr, /git commit -F/u);
});

test('rejects command substitution in the commit message', () => {
	const result = runGuard('chore: run $(pwd) in setup');
	assert.equal(result.status, 1);
	assert.match(result.stderr, /command substitution/u);
});

test('rejects variable interpolation in the commit message', () => {
	const result = runGuard('fix: bump $VERSION in release notes');
	assert.equal(result.status, 1);
	assert.match(result.stderr, /interpolation/u);
});

test('rejects whitespace-delimited command separators in the commit message', () => {
	const result = runGuard('feat: add parser ; rm -rf node_modules');
	assert.equal(result.status, 1);
	assert.match(result.stderr, /command separator/u);
});

test('reads the message from a file with --file', () => {
	const dir = mkdtempSync(path.join(tmpdir(), 'guard-commit-message-'));
	try {
		const goodFile = path.join(dir, 'good.txt');
		const badFile = path.join(dir, 'bad.txt');
		writeFileSync(goodFile, 'docs: align refresh guidance\n\nSecond paragraph.\n');
		writeFileSync(badFile, 'docs: align refresh guidance\n\nRun `mf run build` before pushing.\n');

		const good = spawnSync(process.execPath, [guardPath, '--file', goodFile], { encoding: 'utf8' });
		assert.equal(good.status, 0, good.stderr);

		const bad = spawnSync(process.execPath, [guardPath, '--file', badFile], { encoding: 'utf8' });
		assert.equal(bad.status, 1);
		assert.match(bad.stderr, /backtick/u);
	} finally {
		rmSync(dir, { recursive: true, force: true });
	}
});

test('reads the message from stdin when no argument is given', () => {
	const good = spawnSync(process.execPath, [guardPath], {
		encoding: 'utf8',
		input: 'chore: sync template copies\n',
	});
	assert.equal(good.status, 0, good.stderr);

	const bad = spawnSync(process.execPath, [guardPath], {
		encoding: 'utf8',
		input: 'chore: run `git status` first\n',
	});
	assert.equal(bad.status, 1);
	assert.match(bad.stderr, /backtick/u);
});
