#!/usr/bin/env node
// guard-commit-message.mjs
//
// Enforces the *transport* contract for commit messages, not their content.
// Backticks, $(...), $VAR, and separators are ordinary text in a commit
// message: they only become dangerous when the message is assembled inside a
// shell command string and re-parsed (sh -c, bash -c, pwsh -Command,
// cmd /c). This guard never rejects message content.
//
// Transport rules:
//   1. Direct argv arguments are safe: the shell already tokenized them and
//      git receives the final strings without re-parsing. Inline -m is fine
//      when the value comes from a direct argv array.
//   2. `--file <path>` is required for multi-line or metacharacter-heavy
//      messages, and the file must live OUTSIDE the worktree (OS temp
//      directory) or under `<repo>/.git/mustflow/` so the shell never parses
//      it as part of a command line.
//   3. Never assemble the message through a shell command string.
//
// Data contracts checked here:
//   - no NUL bytes
//   - valid UTF-8
//   - message size <= 65536 bytes
//
// Usage:
//   node scripts/guard-commit-message.mjs "feat: add widget"
//   node scripts/guard-commit-message.mjs --file "$TEMP/msg.txt" --repo-root .
//   printf 'chore: sync copies\n' | node scripts/guard-commit-message.mjs

import { readFileSync, realpathSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const MAX_MESSAGE_BYTES = 65536;

function parseArgs(argv) {
	const options = { repoRoot: process.cwd(), file: null, help: false, unknown: null, messageArgs: [] };
	for (let i = 0; i < argv.length; i += 1) {
		const arg = argv[i];
		if (arg === '--file') {
			options.file = argv[++i] ?? null;
		} else if (arg === '--repo-root') {
			options.repoRoot = argv[++i] ?? null;
		} else if (arg === '--help' || arg === '-h') {
			options.help = true;
		} else if (arg.startsWith('-')) {
			options.unknown = arg;
		} else {
			options.messageArgs.push(arg);
		}
	}
	return options;
}

function dataContractProblemsForBuffer(buffer) {
	const problems = [];
	if (buffer.includes(0)) {
		problems.push('message contains a NUL byte');
	}
	if (buffer.byteLength > MAX_MESSAGE_BYTES) {
		problems.push(`message exceeds ${MAX_MESSAGE_BYTES} bytes (${buffer.byteLength})`);
	}
	const decoded = buffer.toString('utf8');
	if (Buffer.byteLength(decoded, 'utf8') !== buffer.byteLength) {
		problems.push('message is not valid UTF-8');
	}
	return problems;
}

function dataContractProblemsForString(message) {
	const problems = [];
	if (message.includes('\0')) {
		problems.push('message contains a NUL byte');
	}
	if (Buffer.byteLength(message, 'utf8') > MAX_MESSAGE_BYTES) {
		problems.push(`message exceeds ${MAX_MESSAGE_BYTES} bytes`);
	}
	return problems;
}

function fileInsideWorktree(filePath, repoRoot) {
	let resolvedFile;
	let resolvedRoot;
	try {
		resolvedFile = realpathSync(filePath);
		resolvedRoot = realpathSync(repoRoot);
	} catch {
		return false; // unreadable or missing path: caller will fail on read
	}
	if (resolvedFile === resolvedRoot) {
		return true;
	}
	const relative = path.relative(resolvedRoot, resolvedFile);
	if (relative.startsWith('..') || path.isAbsolute(relative)) {
		return false;
	}
	// .git/ is allowed as a scratch area for commit-message files.
	if (relative.startsWith('.git' + path.sep)) {
		return false;
	}
	return true;
}

const options = parseArgs(process.argv.slice(2));

if (options.help) {
	process.stdout.write(
		[
			'guard-commit-message.mjs: enforce commit-message transport safety',
			'',
			'  --file <path>      read the message from a file outside the worktree',
			'                     (or under <repo>/.git/mustflow/); required for messages',
			'                     that must not be assembled through a shell string',
			'  --repo-root <path> repository root for the worktree check (default: cwd)',
			'',
			'Message content (backticks, $(), $VAR, separators) is never rejected;',
			'only the transport boundary is checked.',
			'',
		].join('\n'),
	);
	process.exit(0);
}

if (options.unknown) {
	process.stderr.write(`guard-commit-message: unknown option ${options.unknown}\n`);
	process.exit(1);
}

let message;
let problems;

if (options.file) {
	try {
		const buffer = readFileSync(options.file);
		problems = dataContractProblemsForBuffer(buffer);
		message = buffer.toString('utf8').trim();
	} catch (error) {
		process.stderr.write(`guard-commit-message: cannot read --file: ${error.message}\n`);
		process.exit(1);
	}
	if (fileInsideWorktree(options.file, options.repoRoot)) {
		process.stderr.write(
			[
				'guard-commit-message: --file path is inside the worktree.',
				'Commit-message scratch files belong outside the worktree (OS temp directory)',
				'or under <repo>/.git/mustflow/ so the shell can never parse them.',
				'',
			].join('\n'),
		);
		process.exit(1);
	}
} else if (options.messageArgs.length > 0) {
	message = options.messageArgs.join(' ').trim();
	problems = dataContractProblemsForString(message);
} else if (!process.stdin.isTTY) {
	message = readFileSync(0, 'utf8').trim();
	problems = dataContractProblemsForString(message);
} else {
	process.stderr.write(
		'guard-commit-message: no message provided; pass it as argv, --file <path>, or stdin\n',
	);
	process.exit(1);
}

if (problems.length > 0) {
	process.stderr.write(
		['guard-commit-message: message violates the data contract:', ...problems.map((p) => `  - ${p}`), ''].join('\n'),
	);
	process.exit(1);
}

process.exit(0);
