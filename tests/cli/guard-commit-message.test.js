import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';

const projectRoot = path.resolve(fileURLToPath(new URL('../..', import.meta.url)));
const guardPath = path.join(projectRoot, 'scripts', 'guard-commit-message.mjs');

function runGuard(args, options = {}) {
	return spawnSync(process.execPath, [guardPath, ...args], { encoding: 'utf8', ...options });
}

function createRepo() {
	const dir = mkdtempSync(path.join(tmpdir(), 'guard-commit-transport-'));
	spawnSync('git', ['init', '-q', dir], { encoding: 'utf8' });
	return dir;
}

test('accepts a plain gitmoji commit message via argv', () => {
	const result = runGuard(['feat: add widget export']);
	assert.equal(result.status, 0, result.stderr);
});

test('accepts backticks and shell metacharacters as message content via argv', () => {
	const result = runGuard(['feat: use `git commit -F` and $(pwd) and $HOME safely']);
	assert.equal(result.status, 0, result.stderr);
});

test('accepts a multiline message via argv', () => {
	const result = runGuard(['feat: add guard', '', 'Body with `inline code` and $VAR.']);
	assert.equal(result.status, 0, result.stderr);
});

test('accepts a --file message outside the worktree even with metacharacters', () => {
	const dir = mkdtempSync(path.join(tmpdir(), 'guard-commit-msg-outside-'));
	try {
		const file = path.join(dir, 'msg.txt');
		writeFileSync(file, 'feat: use `git commit -F` for shell-safe messages\n');
		const result = runGuard(['--file', file, '--repo-root', projectRoot]);
		assert.equal(result.status, 0, result.stderr);
	} finally {
		rmSync(dir, { recursive: true, force: true });
	}
});

test('rejects a --file message inside the worktree', () => {
	const repo = createRepo();
	try {
		const file = path.join(repo, 'msg.tmp');
		writeFileSync(file, 'feat: draft\n');
		const result = runGuard(['--file', file, '--repo-root', repo]);
		assert.equal(result.status, 1);
		assert.match(result.stderr, /inside the worktree/u);
	} finally {
		rmSync(repo, { recursive: true, force: true });
	}
});

test('accepts a --file message under .git/mustflow/', () => {
	const repo = createRepo();
	try {
		const messagesDir = path.join(repo, '.git', 'mustflow', 'commit-messages');
		mkdirSync(messagesDir, { recursive: true });
		const file = path.join(messagesDir, 'msg.txt');
		writeFileSync(file, 'docs: align refresh guidance\n\nRun `mf run build` before pushing.\n');
		const result = runGuard(['--file', file, '--repo-root', repo]);
		assert.equal(result.status, 0, result.stderr);
	} finally {
		rmSync(repo, { recursive: true, force: true });
	}
});

test('rejects a message containing a NUL byte via --file', () => {
	const dir = mkdtempSync(path.join(tmpdir(), 'guard-commit-nul-'));
	try {
		const file = path.join(dir, 'msg.txt');
		writeFileSync(file, Buffer.from([0x66, 0x65, 0x61, 0x74, 0x00, 0x0a]));
		const result = runGuard(['--file', file, '--repo-root', projectRoot]);
		assert.equal(result.status, 1);
		assert.match(result.stderr, /NUL byte/u);
	} finally {
		rmSync(dir, { recursive: true, force: true });
	}
});

test('rejects a message that is not valid UTF-8 via --file', () => {
	const dir = mkdtempSync(path.join(tmpdir(), 'guard-commit-utf8-'));
	try {
		const file = path.join(dir, 'msg.txt');
		writeFileSync(file, Buffer.from([0xff, 0xfe, 0xfd, 0x0a]));
		const result = runGuard(['--file', file, '--repo-root', projectRoot]);
		assert.equal(result.status, 1);
		assert.match(result.stderr, /not valid UTF-8/u);
	} finally {
		rmSync(dir, { recursive: true, force: true });
	}
});

test('rejects an oversized message via --file', () => {
	const dir = mkdtempSync(path.join(tmpdir(), 'guard-commit-size-'));
	try {
		const file = path.join(dir, 'msg.txt');
		writeFileSync(file, 'x'.repeat(70 * 1024));
		const result = runGuard(['--file', file, '--repo-root', projectRoot]);
		assert.equal(result.status, 1);
		assert.match(result.stderr, /exceeds 65536 bytes/u);
	} finally {
		rmSync(dir, { recursive: true, force: true });
	}
});

test('reads the message from stdin when no argument is given', () => {
	const good = spawnSync(process.execPath, [guardPath], {
		encoding: 'utf8',
		input: 'chore: run `git status` first\n',
	});
	assert.equal(good.status, 0, good.stderr);
});
