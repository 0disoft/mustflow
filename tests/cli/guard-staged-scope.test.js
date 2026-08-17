import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';

const projectRoot = path.resolve(fileURLToPath(new URL('../..', import.meta.url)));
const guardPath = path.join(projectRoot, 'scripts', 'guard-staged-scope.mjs');

function write(dir, relativePath, content) {
	mkdirSync(path.dirname(path.join(dir, relativePath)), { recursive: true });
	writeFileSync(path.join(dir, relativePath), content);
}

function createRepo() {
	const dir = mkdtempSync(path.join(tmpdir(), 'guard-staged-scope-'));
	run('git', ['init', '-q', dir]);
	run('git', ['-C', dir, 'config', 'user.email', 'test@example.com']);
	run('git', ['-C', dir, 'config', 'user.name', 'Test']);
	writeFileSync(path.join(dir, 'README.md'), '# baseline\n');
	run('git', ['-C', dir, 'add', 'README.md']);
	run('git', ['-C', dir, 'commit', '-q', '-m', 'baseline']);
	return dir;
}

function run(command, args, options = {}) {
	const result = spawnSync(command, args, { encoding: 'utf8', ...options });
	if (result.status !== 0 && !options.allowFailure) {
		throw new Error(`${command} ${args.join(' ')} failed: ${result.stderr}`);
	}
	return result;
}

function runGuard(repoRoot, args = []) {
	return spawnSync(
		process.execPath,
		[guardPath, '--repo-root', repoRoot, ...args],
		{ encoding: 'utf8' },
	);
}

test('passes when every staged path is inside the allowed write set', () => {
	const dir = createRepo();
	try {
		write(dir, 'src/a.ts', 'export const a = 1;\n');
		run('git', ['-C', dir, 'add', 'src/a.ts']);
		const result = runGuard(dir, ['--allow', 'src/']);
		assert.equal(result.status, 0, result.stderr);
	} finally {
		rmSync(dir, { recursive: true, force: true });
	}
});

test('fails when a file outside the allowed write set is staged', () => {
	const dir = createRepo();
	try {
		write(dir, 'src/a.ts', 'export const a = 1;\n');
		write(dir, 'docs/unrelated.md', '# unrelated\n');
		run('git', ['-C', dir, 'add', 'src/a.ts', 'docs/unrelated.md']);
		const result = runGuard(dir, ['--allow', 'src/']);
		assert.equal(result.status, 1);
		assert.match(result.stderr, /\[unexpected_path\] docs\/unrelated\.md/u);
	} finally {
		rmSync(dir, { recursive: true, force: true });
	}
});

test('fails when a repo-root scratch file is staged', () => {
	const dir = createRepo();
	try {
		writeFileSync(path.join(dir, 'msg.tmp'), 'commit message draft\n');
		run('git', ['-C', dir, 'add', 'msg.tmp']);
		const result = runGuard(dir, ['--allow', 'msg.tmp']);
		assert.equal(result.status, 1);
		assert.match(result.stderr, /\[scratch_file\] msg\.tmp/u);
	} finally {
		rmSync(dir, { recursive: true, force: true });
	}
});

test('fails when a staged path also has unstaged worktree changes', () => {
	const dir = createRepo();
	try {
		write(dir, 'src/a.ts', 'export const a = 1;\n');
		run('git', ['-C', dir, 'add', 'src/a.ts']);
		write(dir, 'src/a.ts', 'export const a = 2;\n');
		const result = runGuard(dir, ['--allow', 'src/']);
		assert.equal(result.status, 1);
		assert.match(result.stderr, /\[index_worktree_mismatch\] src\/a\.ts/u);
	} finally {
		rmSync(dir, { recursive: true, force: true });
	}
});

test('fails when the staged set differs from the declared --expect set', () => {
	const dir = createRepo();
	try {
		write(dir, 'src/a.ts', 'export const a = 1;\n');
		write(dir, 'src/b.ts', 'export const b = 2;\n');
		run('git', ['-C', dir, 'add', 'src/a.ts', 'src/b.ts']);
		const result = runGuard(dir, ['--allow', 'src/', '--expect', 'src/a.ts', 'src/missing.ts']);
		assert.equal(result.status, 1);
		assert.match(result.stderr, /\[expected_missing\] src\/missing\.ts/u);
		assert.match(result.stderr, /\[unexpected_staged\] src\/b\.ts/u);
	} finally {
		rmSync(dir, { recursive: true, force: true });
	}
});

test('passes when the staged set matches the declared --expect set exactly', () => {
	const dir = createRepo();
	try {
		write(dir, 'src/a.ts', 'export const a = 1;\n');
		run('git', ['-C', dir, 'add', 'src/a.ts']);
		const result = runGuard(dir, ['--allow', 'src/', '--expect', 'src/a.ts']);
		assert.equal(result.status, 0, result.stderr);
	} finally {
		rmSync(dir, { recursive: true, force: true });
	}
});

test('passes when nothing is staged', () => {
	const dir = createRepo();
	try {
		const result = runGuard(dir, ['--allow', 'src/']);
		assert.equal(result.status, 0, result.stderr);
	} finally {
		rmSync(dir, { recursive: true, force: true });
	}
});
