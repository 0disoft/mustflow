#!/usr/bin/env node
// guard-staged-scope.mjs
//
// Verifies that the Git staged set stays inside the task's expected write set
// before a commit is created. Run it right before `git commit`:
//
//   node scripts/guard-staged-scope.mjs --repo-root . \
//     --allow src/cli/lib/agent-context.ts --allow tests/cli \
//     --expect src/cli/lib/agent-context.ts --expect tests/cli/context.test.js
//
// Fails (exit 1) when any of the following holds:
//   1. a staged path is outside the --allow write set;
//   2. a scratch file is staged: `.git/**`, a repo-root `*.tmp` or `msg*`
//      file, or any path whose basename mentions commit-message (unless it is
//      explicitly --allow'ed as a declared artifact);
//   3. a staged path also has unstaged worktree changes, so the index no
//      longer equals the reviewed content;
//   4. --expect is given and the staged set differs from it (declared intent
//      mismatch).
//
// Scratch authoring files belong outside the worktree (OS temp directory or
// `.git/mustflow/commit-messages/`), never at the repository root.

import { spawnSync } from 'node:child_process';
import process from 'node:process';

function git(repoRoot, args) {
	const result = spawnSync('git', ['-C', repoRoot, ...args], { encoding: 'utf8' });
	return result;
}

function parseArgs(argv) {
	const options = { repoRoot: process.cwd(), allow: [], expect: [] };
	for (let i = 0; i < argv.length; i += 1) {
		const arg = argv[i];
		if (arg === '--repo-root') {
			options.repoRoot = argv[++i];
		} else if (arg === '--allow' || arg === '--expect') {
			const target = arg === '--allow' ? options.allow : options.expect;
			while (i + 1 < argv.length && !argv[i + 1].startsWith('--')) {
				i += 1;
				target.push(argv[i]);
			}
		} else if (arg === '--help' || arg === '-h') {
			options.help = true;
		} else {
			options.unknown = arg;
		}
	}
	return options;
}

function isAllowed(path, allowList) {
	return allowList.some((entry) => {
		const normalized = entry.replace(/\/+$/u, '');
		return path === normalized || path.startsWith(`${normalized}/`);
	});
}

function isScratch(path, allowList) {
	if (path.startsWith('.git/')) {
		return true;
	}
	const segments = path.split('/');
	const base = segments[segments.length - 1];
	const atRoot = segments.length === 1;
	if (atRoot && (/\.tmp$/iu.test(base) || /^msg/iu.test(base))) {
		return true;
	}
	if (/commit[-_ ]?message/iu.test(base) && !isAllowed(path, allowList)) {
		return true;
	}
	return false;
}

function stagedPaths(repoRoot) {
	const result = git(repoRoot, ['diff', '--cached', '--name-only', '-z']);
	if (result.status !== 0) {
		return { error: result.stderr.trim() || result.stdout.trim() };
	}
	return { paths: result.stdout.split('\0').filter((entry) => entry.length > 0) };
}

function unstagedPaths(repoRoot) {
	const result = git(repoRoot, ['diff', '--name-only', '-z']);
	if (result.status !== 0) {
		return { error: result.stderr.trim() || result.stdout.trim() };
	}
	return { paths: result.stdout.split('\0').filter((entry) => entry.length > 0) };
}

const options = parseArgs(process.argv.slice(2));

if (options.help) {
	process.stdout.write(
		[
			'guard-staged-scope.mjs: verify the staged set stays inside the expected write set',
			'',
			'  --repo-root <path>   repository root (default: cwd)',
			'  --allow <path>       expected write set entry; repeatable',
			'  --expect <path>      declared staged set; when given the staged set must match exactly',
			'',
		].join('\n'),
	);
	process.exit(0);
}

if (options.unknown) {
	process.stderr.write(`guard-staged-scope: unknown option ${options.unknown}\n`);
	process.exit(1);
}

const staged = stagedPaths(options.repoRoot);
if (staged.error) {
	process.stderr.write(`guard-staged-scope: cannot read staged set: ${staged.error}\n`);
	process.exit(1);
}

const violations = [];

for (const stagedPath of staged.paths) {
	if (isScratch(stagedPath, options.allow)) {
		violations.push({ class: 'scratch_file', path: stagedPath });
	} else if (!isAllowed(stagedPath, options.allow)) {
		violations.push({ class: 'unexpected_path', path: stagedPath });
	}
}

if (violations.length === 0 && staged.paths.length > 0) {
	const unstaged = unstagedPaths(options.repoRoot);
	if (unstaged.error) {
		process.stderr.write(`guard-staged-scope: cannot read unstaged set: ${unstaged.error}\n`);
		process.exit(1);
	}
	const stagedSet = new Set(staged.paths);
	for (const path of unstaged.paths) {
		if (stagedSet.has(path)) {
			violations.push({ class: 'index_worktree_mismatch', path });
		}
	}
}

if (options.expect.length > 0) {
	const expectedSet = new Set(options.expect);
	const actualSet = new Set(staged.paths);
	for (const path of expectedSet) {
		if (!actualSet.has(path)) {
			violations.push({ class: 'expected_missing', path });
		}
	}
	for (const path of actualSet) {
		if (!expectedSet.has(path)) {
			violations.push({ class: 'unexpected_staged', path });
		}
	}
}

if (violations.length > 0) {
	process.stderr.write(
		[
			'guard-staged-scope: staged set violates the expected write set:',
			...violations.map((violation) => `  - [${violation.class}] ${violation.path}`),
			'',
			'Unstage the offending paths (git restore --staged <path>) or extend --allow',
			'with an explicit entry only when the file is a declared artifact of this task.',
			'',
		].join('\n'),
	);
	process.exit(1);
}

process.exit(0);
