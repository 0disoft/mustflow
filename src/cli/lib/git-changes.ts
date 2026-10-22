import { execFile, spawnSync } from 'node:child_process';

import { parseGitStatusOutput } from '../../core/change-classification.js';
import { createCommandEnv } from '../../core/command-env.js';

const GIT_STATUS_TIMEOUT_MS = 10_000;
const GIT_STATUS_MAX_BUFFER_BYTES = 16 * 1024 * 1024;

export interface GitChangedFilesSuccess {
	readonly ok: true;
	readonly files: readonly string[];
}

export interface GitChangedFilesFailure {
	readonly ok: false;
	readonly message: string;
	readonly status: number | null;
	readonly stderr: string;
}

export type GitChangedFilesResult = GitChangedFilesSuccess | GitChangedFilesFailure;

export class GitChangedFilesError extends Error {
	readonly result: GitChangedFilesFailure;

	constructor(result: GitChangedFilesFailure) {
		super('git_changed_files_unavailable');
		this.name = 'GitChangedFilesError';
		this.result = result;
	}
}

export function readGitChangedFiles(projectRoot: string): GitChangedFilesResult {
	const result = spawnSync('git', ['status', '--porcelain=v1', '-z', '--untracked-files=all'], {
		cwd: projectRoot,
		encoding: 'utf8',
		env: createCommandEnv(projectRoot, { policy: 'minimal', allowlist: [] }),
		input: '',
		maxBuffer: GIT_STATUS_MAX_BUFFER_BYTES,
		stdio: ['ignore', 'pipe', 'pipe'],
		timeout: GIT_STATUS_TIMEOUT_MS,
		windowsHide: true,
	});

	return parseGitChangedFilesResult(result);
}

export function readGitChangedFilesAsync(projectRoot: string): Promise<GitChangedFilesResult> {
	return new Promise((resolve) => {
		const child = execFile('git', ['status', '--porcelain=v1', '-z', '--untracked-files=all'], {
			cwd: projectRoot,
			encoding: 'utf8',
			env: createCommandEnv(projectRoot, { policy: 'minimal', allowlist: [] }),
			maxBuffer: GIT_STATUS_MAX_BUFFER_BYTES,
			timeout: GIT_STATUS_TIMEOUT_MS,
			windowsHide: true,
		}, (error, stdout, stderr) => resolve(parseGitChangedFilesResult({
			status: error ? (typeof error.code === 'number' ? error.code : null) : 0,
			stdout, stderr, error: error ?? undefined,
		})));
		child.stdin?.end();
	});
}

function parseGitChangedFilesResult(result: { readonly status: number | null; readonly stdout: unknown; readonly stderr: unknown; readonly error?: Error }): GitChangedFilesResult {
	if (result.status !== 0 || typeof result.stdout !== 'string') {
		const stderr = typeof result.stderr === 'string' ? result.stderr.trim() : '';
		const message =
			result.error?.message ??
			(stderr || (result.status === null ? 'git status did not complete' : `git status exited with code ${result.status}`));

		return {
			ok: false,
			message,
			status: result.status,
			stderr,
		};
	}

	try {
		return { ok: true, files: parseGitStatusOutput(result.stdout) };
	} catch (error) {
		return {
			ok: false,
			message: error instanceof Error ? error.message : String(error),
			status: result.status,
			stderr: '',
		};
	}
}

export function requireGitChangedFiles(projectRoot: string): readonly string[] {
	const result = readGitChangedFiles(projectRoot);

	if (!result.ok) {
		throw new GitChangedFilesError(result);
	}

	return result.files;
}
