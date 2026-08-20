import { createHash } from 'node:crypto';
import {
	existsSync,
	lstatSync,
	readFileSync,
	realpathSync,
	statSync,
} from 'node:fs';
import { homedir, tmpdir, userInfo } from 'node:os';
import path from 'node:path';

import type { CommandEffectScope } from './command-effects.js';

const WORKTREE_LOCK_ROOT_RELATIVE_PATH = '.mustflow/state/locks';
const REPOSITORY_LOCK_ROOT_RELATIVE_PATH = 'mustflow/active-run-locks';
const HOST_LOCK_ROOT_VERSION = 'v1';
const MAX_GIT_POINTER_BYTES = 64 * 1024;
const SCOPE_ORDER: readonly CommandEffectScope[] = ['host', 'repository', 'worktree'];

export interface ActiveRunLockScopeRoot {
	readonly scope: CommandEffectScope;
	readonly root: string;
}

function sha256(value: string): string {
	return createHash('sha256').update(value).digest('hex');
}

function readBoundedTextFile(filePath: string): string {
	const stats = statSync(filePath);
	if (!stats.isFile() || stats.size > MAX_GIT_POINTER_BYTES) {
		throw new Error(`active_run_lock_git_pointer_invalid:${filePath}`);
	}

	return readFileSync(filePath, 'utf8').trim();
}

function findGitMarker(projectRoot: string): string | null {
	let current = realpathSync.native(projectRoot);

	while (true) {
		const marker = path.join(current, '.git');
		if (existsSync(marker)) {
			return marker;
		}

		const parent = path.dirname(current);
		if (parent === current) {
			return null;
		}

		current = parent;
	}
}

function resolveGitDirectory(gitMarker: string): string {
	const markerStats = lstatSync(gitMarker);
	if (markerStats.isDirectory()) {
		return realpathSync.native(gitMarker);
	}
	if (!markerStats.isFile()) {
		throw new Error('repository_lock_scope_git_marker_invalid');
	}

	const match = /^gitdir:\s*(.+)$/u.exec(readBoundedTextFile(gitMarker));
	if (!match?.[1]) {
		throw new Error('repository_lock_scope_git_pointer_invalid');
	}

	const gitDirectory = path.resolve(path.dirname(gitMarker), match[1]);
	const gitDirectoryStats = lstatSync(gitDirectory);
	if (!gitDirectoryStats.isDirectory()) {
		throw new Error('repository_lock_scope_git_directory_invalid');
	}

	return realpathSync.native(gitDirectory);
}

export function tryResolveGitCommonDirectory(projectRoot: string): string | null {
	const gitMarker = findGitMarker(projectRoot);
	if (!gitMarker) {
		return null;
	}

	const gitDirectory = resolveGitDirectory(gitMarker);
	const commonDirectoryPointer = path.join(gitDirectory, 'commondir');
	if (!existsSync(commonDirectoryPointer)) {
		return gitDirectory;
	}

	const commonDirectory = path.resolve(gitDirectory, readBoundedTextFile(commonDirectoryPointer));
	const commonDirectoryStats = lstatSync(commonDirectory);
	if (!commonDirectoryStats.isDirectory()) {
		throw new Error('repository_lock_scope_git_common_directory_invalid');
	}

	return realpathSync.native(commonDirectory);
}

function hostOwnerIdentity(): string {
	try {
		const owner = userInfo();
		return [owner.uid, owner.gid, owner.username, owner.homedir].join('\0');
	} catch {
		return path.resolve(homedir());
	}
}

function worktreeScopeRoot(projectRoot: string): string {
	return path.join(projectRoot, ...WORKTREE_LOCK_ROOT_RELATIVE_PATH.split('/'));
}

function repositoryScopeRoot(projectRoot: string): string {
	const commonDirectory = tryResolveGitCommonDirectory(projectRoot);
	if (!commonDirectory) {
		throw new Error('repository_lock_scope_requires_git_repository');
	}

	return path.join(commonDirectory, ...REPOSITORY_LOCK_ROOT_RELATIVE_PATH.split('/'));
}

function hostScopeRoot(): string {
	return path.join(
		tmpdir(),
		'mustflow',
		'active-run-locks',
		HOST_LOCK_ROOT_VERSION,
		sha256(hostOwnerIdentity()).slice(0, 32),
	);
}

export function resolveActiveRunLockScopeRoot(
	projectRoot: string,
	scope: CommandEffectScope,
): ActiveRunLockScopeRoot {
	switch (scope) {
		case 'worktree':
			return { scope, root: worktreeScopeRoot(projectRoot) };
		case 'repository':
			return { scope, root: repositoryScopeRoot(projectRoot) };
		case 'host':
			return { scope, root: hostScopeRoot() };
	}
}

export function resolveActiveRunLockScopeRoots(
	projectRoot: string,
	scopes: Iterable<CommandEffectScope>,
): readonly ActiveRunLockScopeRoot[] {
	const requested = new Set(scopes);
	return SCOPE_ORDER
		.filter((scope) => requested.has(scope))
		.map((scope) => resolveActiveRunLockScopeRoot(projectRoot, scope));
}

export function listAvailableActiveRunLockScopeRoots(projectRoot: string): readonly ActiveRunLockScopeRoot[] {
	const roots: ActiveRunLockScopeRoot[] = [
		resolveActiveRunLockScopeRoot(projectRoot, 'host'),
	];
	const commonDirectory = tryResolveGitCommonDirectory(projectRoot);
	if (commonDirectory) {
		roots.push({
			scope: 'repository',
			root: path.join(commonDirectory, ...REPOSITORY_LOCK_ROOT_RELATIVE_PATH.split('/')),
		});
	}
	roots.push(resolveActiveRunLockScopeRoot(projectRoot, 'worktree'));
	return roots;
}
