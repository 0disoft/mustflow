#!/usr/bin/env node
// guard-commit-message.mjs
//
// Rejects commit messages that the host shell (PowerShell, bash, zsh, cmd) can
// interpret as commands: backticks, $(...) command substitution, $VAR/${VAR}
// interpolation, and whitespace-delimited command separators (; | &).
//
// Usage:
//   node scripts/guard-commit-message.mjs "<message>"
//   node scripts/guard-commit-message.mjs --file <message-file>
//   echo "<message>" | node scripts/guard-commit-message.mjs
//
// When a message must contain such characters, write it to a file and commit
// with `git commit -F <file>` so the shell never parses it. Exit code 1 flags
// an unsafe message; 0 means the message is safe for inline -m use.

import { readFileSync } from 'node:fs';
import process from 'node:process';

function findProblems(message) {
	const problems = [];

	const backtick = /`/gu;
	for (const match of message.matchAll(backtick)) {
		problems.push(`backtick at column ${match.index + 1}`);
	}

	const substitution = /\$\(/gu;
	for (const match of message.matchAll(substitution)) {
		problems.push(`command substitution "$(" at column ${match.index + 1}`);
	}

	const interpolation = /\$[A-Za-z0-9_{]/gu;
	for (const match of message.matchAll(interpolation)) {
		problems.push(`interpolation "${match[0]}" at column ${match.index + 1}`);
	}

	const separators = /(?:^|\s)([;&|])(?=\s|$)/gu;
	for (const match of message.matchAll(separators)) {
		problems.push(`command separator "${match[1]}" at column ${match.index + 1}`);
	}

	return problems;
}

function readMessage() {
	const args = process.argv.slice(2);

	if (args.length === 0) {
		if (process.stdin.isTTY) {
			return { message: '', ok: false, error: 'no message provided; pass it as an argument, --file <path>, or stdin' };
		}
		return { message: readFileSync(0, 'utf8').trim(), ok: true };
	}

	if (args[0] === '--file') {
		const filePath = args[1];
		if (!filePath) {
			return { message: '', ok: false, error: '--file requires a path' };
		}
		return { message: readFileSync(filePath, 'utf8').trim(), ok: true };
	}

	if (args[0].startsWith('-')) {
		return { message: '', ok: false, error: `unknown option ${args[0]}` };
	}

	return { message: args.join(' '), ok: true };
}

const { message, ok, error } = readMessage();

if (!ok) {
	process.stderr.write(`guard-commit-message: ${error}\n`);
	process.exit(1);
}

const problems = findProblems(message);

if (problems.length > 0) {
	process.stderr.write(
		[
			'guard-commit-message: commit message contains shell-interpretable text:',
			...problems.map((problem) => `  - ${problem}`),
			'',
			'Retype the message without shell metacharacters, or write it to a file and commit with:',
			'  git commit -F <message-file>',
			'',
		].join('\n'),
	);
	process.exit(1);
}

process.exit(0);
