import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import path from 'node:path';

import { createCommandEnv } from './command-env.js';
import { readFileInsideWithoutSymlinks, writeFileInsideWithoutSymlinks } from './safe-filesystem.js';

export type LineEndingKind = 'lf' | 'crlf' | 'mixed' | 'none' | 'binary';
export type LineEndingPolicy = 'lf' | 'unknown';
export type LineEndingScope = 'changed' | 'tracked';

export interface LineEndingFileReport {
	readonly path: string;
	readonly lineEnding: LineEndingKind;
	readonly wouldChange: boolean;
	readonly changed: boolean;
}

export interface LineEndingReport {
	readonly schema_version: '1';
	readonly command: 'line-endings';
	readonly mode: 'check' | 'normalize';
	readonly scope: LineEndingScope;
	readonly ok: boolean;
	readonly mustflow_root: string;
	readonly policy: LineEndingPolicy;
	readonly policy_path: string | null;
	readonly git_tracked: boolean;
	readonly checked_files: number;
	readonly non_compliant_files: readonly LineEndingFileReport[];
	readonly changed_files: readonly string[];
	readonly dry_run: boolean;
	readonly wrote_files: boolean;
	readonly issues: readonly string[];
}

export interface LineEndingOptions {
	readonly apply?: boolean;
	readonly scope?: LineEndingScope;
}

const GITATTRIBUTES_PATH = '.gitattributes';

function toPosixPath(value: string): string {
	return value.split(path.sep).join('/');
}

function hasLfPolicy(projectRoot: string): boolean {
	const attributesPath = path.join(projectRoot, GITATTRIBUTES_PATH);

	if (!existsSync(attributesPath)) {
		return false;
	}

	const content = readFileInsideWithoutSymlinks(projectRoot, attributesPath).toString('utf8');
	return /^\*\s+.*(?:^|\s)eol=lf(?:\s|$)/imu.test(content);
}

function gitList(projectRoot: string, args: readonly string[]): readonly string[] | null {
	const result = spawnSync('git', [...args, '-z'], {
		cwd: projectRoot,
		encoding: 'buffer',
		env: createCommandEnv(projectRoot, { policy: 'minimal', allowlist: [] }),
		stdio: ['ignore', 'pipe', 'pipe'],
		timeout: 30_000,
		windowsHide: true,
	});

	if (result.status !== 0) {
		return null;
	}

	return result.stdout
		.toString('utf8')
		.split('\0')
		.map((entry) => entry.trim())
		.filter((entry) => entry.length > 0)
		.sort((left, right) => left.localeCompare(right));
}

function listGitTrackedFiles(projectRoot: string): readonly string[] | null {
	return gitList(projectRoot, ['ls-files']);
}

function listGitChangedFiles(projectRoot: string): readonly string[] | null {
	const changedLists = [
		gitList(projectRoot, ['diff', '--name-only', '--diff-filter=ACMR']),
		gitList(projectRoot, ['diff', '--cached', '--name-only', '--diff-filter=ACMR']),
		gitList(projectRoot, ['ls-files', '--others', '--exclude-standard']),
	];

	if (changedLists.some((list) => list === null)) {
		return null;
	}

	return [...new Set(changedLists.flatMap((list) => list ?? []))].sort((left, right) => left.localeCompare(right));
}

function detectLineEnding(buffer: Buffer): LineEndingKind {
	if (buffer.includes(0)) {
		return 'binary';
	}

	let lfCount = 0;
	let crlfCount = 0;

	for (let index = 0; index < buffer.length; index += 1) {
		if (buffer[index] !== 0x0a) {
			continue;
		}

		lfCount += 1;

		if (index > 0 && buffer[index - 1] === 0x0d) {
			crlfCount += 1;
		}
	}

	if (lfCount === 0) {
		return 'none';
	}

	if (crlfCount === 0) {
		return 'lf';
	}

	return crlfCount === lfCount ? 'crlf' : 'mixed';
}

function normalizeLf(buffer: Buffer): Buffer {
	const bytes = Buffer.allocUnsafe(buffer.length);
	let writeIndex = 0;

	for (let index = 0; index < buffer.length; index += 1) {
		const byte = buffer[index];

		if (byte === 0x0d) {
			bytes[writeIndex] = 0x0a;
			writeIndex += 1;
			if (buffer[index + 1] === 0x0a) {
				index += 1;
			}
			continue;
		}

		bytes[writeIndex] = byte;
		writeIndex += 1;
	}

	return bytes.subarray(0, writeIndex);
}

export function inspectLineEndings(projectRoot: string, mode: 'check' | 'normalize', options: LineEndingOptions = {}): LineEndingReport {
	const root = path.resolve(projectRoot);
	const policy: LineEndingPolicy = hasLfPolicy(root) ? 'lf' : 'unknown';
	const policyPath = policy === 'lf' ? GITATTRIBUTES_PATH : null;
	const scope = options.scope ?? 'changed';
	const candidateFiles = scope === 'tracked' ? listGitTrackedFiles(root) : listGitChangedFiles(root);
	const issues: string[] = [];
	const nonCompliantFiles: LineEndingFileReport[] = [];
	const changedFiles: string[] = [];
	const apply = options.apply === true;

	if (!candidateFiles) {
		issues.push('Git tracked files could not be listed. Run this command inside a Git working tree.');
	}

	if (policy !== 'lf') {
		issues.push('No repository LF policy was detected in .gitattributes.');
	}

	if (mode === 'normalize' && apply && policy !== 'lf') {
		issues.push('Refused to normalize without an explicit .gitattributes LF policy.');
	}

	const canApply = mode === 'normalize' && apply && policy === 'lf' && candidateFiles !== null;

	for (const relativePath of candidateFiles ?? []) {
		const absolutePath = path.join(root, ...relativePath.split('/'));

		if (!existsSync(absolutePath)) {
			continue;
		}

		let buffer: Buffer;
		try {
			buffer = readFileInsideWithoutSymlinks(root, absolutePath);
		} catch (error) {
			issues.push(error instanceof Error ? error.message : String(error));
			continue;
		}
		const lineEnding = detectLineEnding(buffer);
		const wouldChange = policy === 'lf' && (lineEnding === 'crlf' || lineEnding === 'mixed');

		if (!wouldChange) {
			continue;
		}

		if (canApply) {
			writeFileInsideWithoutSymlinks(root, absolutePath, normalizeLf(buffer));
			changedFiles.push(toPosixPath(relativePath));
		}

		nonCompliantFiles.push({
			path: toPosixPath(relativePath),
			lineEnding,
			wouldChange,
			changed: canApply,
		});
	}

	return {
		schema_version: '1',
		command: 'line-endings',
		mode,
		scope,
		ok: issues.length === 0 && (canApply || nonCompliantFiles.length === 0),
		mustflow_root: root,
		policy,
		policy_path: policyPath,
		git_tracked: candidateFiles !== null,
		checked_files: candidateFiles?.length ?? 0,
		non_compliant_files: nonCompliantFiles,
		changed_files: changedFiles,
		dry_run: mode === 'normalize' && !apply,
		wrote_files: changedFiles.length > 0,
		issues,
	};
}
