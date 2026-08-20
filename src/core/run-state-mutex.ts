import { createHash, randomUUID } from 'node:crypto';
import {
	existsSync,
	mkdirSync,
	renameSync,
	rmSync,
	statSync,
} from 'node:fs';
import path from 'node:path';

import {
	processStartTokensProveMismatch,
	readCurrentProcessStartToken,
	readProcessStartToken,
} from './process-identity.js';
import {
	readUtf8FileInsideWithoutSymlinks,
	writeJsonFileInsideWithoutSymlinks,
} from './safe-filesystem.js';

const RUN_STATE_MUTEX_ROOT_RELATIVE_PATH = '.mustflow/state/mutexes';
const RUN_STATE_MUTEX_WAIT_MS = 35_000;
const RUN_STATE_MUTEX_STALE_MS = 30_000;
const RUN_STATE_MUTEX_SLEEP_MS = 25;
const RUN_STATE_MUTEX_OWNER_MAX_BYTES = 16 * 1024;
const RUN_STATE_MUTEX_SLEEP_BUFFER = new Int32Array(new SharedArrayBuffer(4));
const RUN_STATE_MUTEX_SCOPE_PATTERN = /^[a-z][a-z0-9-]{0,63}$/u;

export const RUN_STATE_MUTEX_SCOPES = {
	receipts: 'run-receipts',
	profiles: 'run-profiles',
	performanceHistory: 'run-performance-history',
	compaction: 'run-state-compaction',
} as const;

export type RunStateMutexScope = (typeof RUN_STATE_MUTEX_SCOPES)[keyof typeof RUN_STATE_MUTEX_SCOPES];

export function isRunStateMutexBusyError(error: unknown, scope: RunStateMutexScope): boolean {
	return error instanceof Error && error.message === `run_state_mutex_busy:${scope}`;
}

interface RunStateMutexOwner {
	readonly lockId: string;
	readonly pid: number;
	readonly processStartToken: string;
	readonly startedAt: string;
	readonly ownerToken: string;
}

function sleep(milliseconds: number): void {
	try {
		Atomics.wait(RUN_STATE_MUTEX_SLEEP_BUFFER, 0, 0, milliseconds);
	} catch {
		const end = Date.now() + milliseconds;
		while (Date.now() < end) {
			// Fall back only for short mutex retry delays when Atomics.wait is unavailable.
		}
	}
}

function sha256(value: string): string {
	return createHash('sha256').update(value).digest('hex');
}

function isAlreadyExistsError(error: unknown): boolean {
	return !!error && typeof error === 'object' && 'code' in error && error.code === 'EEXIST';
}

function isProcessLive(pid: number): boolean {
	if (!Number.isInteger(pid) || pid <= 0) {
		return false;
	}

	try {
		process.kill(pid, 0);
		return true;
	} catch (error) {
		const code = error && typeof error === 'object' && 'code' in error ? String(error.code) : '';
		return code === 'EPERM';
	}
}

function validateScope(scope: string): asserts scope is RunStateMutexScope {
	if (!RUN_STATE_MUTEX_SCOPE_PATTERN.test(scope)) {
		throw new Error(`invalid_run_state_mutex_scope:${scope}`);
	}
}

function mutexRoot(projectRoot: string): string {
	return path.join(projectRoot, ...RUN_STATE_MUTEX_ROOT_RELATIVE_PATH.split('/'));
}

function mutexDirectory(projectRoot: string, scope: RunStateMutexScope): string {
	return path.join(mutexRoot(projectRoot), scope);
}

function recoveryDirectory(mutex: string): string {
	return path.join(path.dirname(mutex), `${path.basename(mutex)}.recovery`);
}

function staleMutexDirectory(mutex: string, owner: RunStateMutexOwner | null): string {
	const tokenSource = owner
		? `${owner.pid}:${owner.startedAt}:${owner.ownerToken}`
		: `${process.pid}:${Date.now()}:${process.hrtime.bigint()}`;
	return path.join(path.dirname(mutex), `${path.basename(mutex)}.stale-${sha256(tokenSource)}`);
}

function readMutexOwner(ownerPath: string): RunStateMutexOwner | null {
	try {
		const owner = JSON.parse(
			readUtf8FileInsideWithoutSymlinks(path.dirname(ownerPath), ownerPath, {
				maxBytes: RUN_STATE_MUTEX_OWNER_MAX_BYTES,
			}),
		) as Record<string, unknown>;

		if (
			typeof owner.lock_id !== 'string' ||
			typeof owner.owner_token !== 'string' ||
			!Number.isInteger(owner.pid) ||
			typeof owner.process_start_token !== 'string' ||
			typeof owner.started_at !== 'string'
		) {
			return null;
		}

		return {
			lockId: owner.lock_id,
			pid: Number(owner.pid),
			processStartToken: owner.process_start_token,
			startedAt: owner.started_at,
			ownerToken: owner.owner_token,
		};
	} catch {
		return null;
	}
}

function sameMutexOwner(left: RunStateMutexOwner, right: RunStateMutexOwner | null): boolean {
	return right !== null &&
		left.lockId === right.lockId &&
		left.pid === right.pid &&
		left.processStartToken === right.processStartToken &&
		left.startedAt === right.startedAt &&
		left.ownerToken === right.ownerToken;
}

function mutexOwnerIsStale(owner: RunStateMutexOwner): boolean {
	if (!isProcessLive(owner.pid)) {
		return true;
	}

	return processStartTokensProveMismatch(owner.processStartToken, readProcessStartToken(owner.pid));
}

function beginRecovery(mutex: string): (() => void) | null {
	const recoveryPath = recoveryDirectory(mutex);

	try {
		mkdirSync(recoveryPath);
	} catch (error) {
		if (!isAlreadyExistsError(error)) {
			throw error;
		}

		try {
			const recoveryStat = statSync(recoveryPath);
			if (Date.now() - recoveryStat.mtimeMs > RUN_STATE_MUTEX_STALE_MS) {
				rmSync(recoveryPath, { recursive: true, force: true });
			}
		} catch {
			// A concurrent recovery may have already completed.
		}

		return null;
	}

	let active = true;
	return () => {
		if (!active) {
			return;
		}
		active = false;
		rmSync(recoveryPath, { recursive: true, force: true });
	};
}

function moveMutexAside(mutex: string, owner: RunStateMutexOwner | null): string | null {
	const stalePath = staleMutexDirectory(mutex, owner);

	try {
		rmSync(stalePath, { recursive: true, force: true });
		renameSync(mutex, stalePath);
		return stalePath;
	} catch {
		try {
			rmSync(stalePath, { recursive: true, force: true });
		} catch {
			// Best-effort cleanup for a failed stale mutex move.
		}
		return null;
	}
}

function recoverStaleMutexWithOwner(
	mutex: string,
	ownerPath: string,
	staleOwner: RunStateMutexOwner,
): boolean {
	const releaseRecovery = beginRecovery(mutex);
	if (!releaseRecovery) {
		return false;
	}

	try {
		if (!sameMutexOwner(staleOwner, readMutexOwner(ownerPath)) || !mutexOwnerIsStale(staleOwner)) {
			return false;
		}

		const stalePath = moveMutexAside(mutex, staleOwner);
		if (!stalePath) {
			return false;
		}

		rmSync(stalePath, { recursive: true, force: true });
		return true;
	} finally {
		releaseRecovery();
	}
}

function recoverStaleMutexWithoutOwner(mutex: string): boolean {
	const releaseRecovery = beginRecovery(mutex);
	if (!releaseRecovery) {
		return false;
	}

	try {
		if (existsSync(path.join(mutex, 'owner.json'))) {
			return false;
		}

		const stalePath = moveMutexAside(mutex, null);
		if (!stalePath) {
			return false;
		}

		rmSync(stalePath, { recursive: true, force: true });
		return true;
	} catch {
		return false;
	} finally {
		releaseRecovery();
	}
}

function acquireRunStateMutex(
	projectRoot: string,
	scope: RunStateMutexScope,
	options: { readonly waitMs?: number } = {},
): () => void {
	validateScope(scope);
	const root = mutexRoot(projectRoot);
	const mutex = mutexDirectory(projectRoot, scope);
	const ownerPath = path.join(mutex, 'owner.json');
	const ownerRecord = {
		lock_id: randomUUID(),
		owner_token: randomUUID(),
		pid: process.pid,
		process_start_token: readCurrentProcessStartToken(),
		started_at: new Date().toISOString(),
	};
	const expectedOwner: RunStateMutexOwner = {
		lockId: ownerRecord.lock_id,
		pid: ownerRecord.pid,
		processStartToken: ownerRecord.process_start_token,
		startedAt: ownerRecord.started_at,
		ownerToken: ownerRecord.owner_token,
	};
	mkdirSync(root, { recursive: true });
	const startedAt = Date.now();
	const waitMs = options.waitMs ?? RUN_STATE_MUTEX_WAIT_MS;

	while (true) {
		try {
			mkdirSync(mutex);
			try {
				writeJsonFileInsideWithoutSymlinks(root, ownerPath, ownerRecord);
			} catch (error) {
				rmSync(mutex, { recursive: true, force: true });
				throw error;
			}

			return () => {
				try {
					if (sameMutexOwner(expectedOwner, readMutexOwner(ownerPath))) {
						rmSync(mutex, { recursive: true, force: true });
					}
				} catch {
					// A missing or replaced owner file means this process no longer owns the mutex.
				}
			};
		} catch (error) {
			if (!isAlreadyExistsError(error)) {
				throw error;
			}

			if (Date.now() - startedAt >= waitMs) {
				const owner = readMutexOwner(ownerPath);
				if (owner) {
					if (mutexOwnerIsStale(owner) && recoverStaleMutexWithOwner(mutex, ownerPath, owner)) {
						continue;
					}
				} else {
					const recoveryPath = recoveryDirectory(mutex);
					try {
						const recoveryStat = statSync(recoveryPath);
						if (Date.now() - recoveryStat.mtimeMs <= RUN_STATE_MUTEX_STALE_MS) {
							throw new Error(`run_state_mutex_busy:${scope}`);
						}
					} catch (recoveryError) {
						if (recoveryError instanceof Error && recoveryError.message === `run_state_mutex_busy:${scope}`) {
							throw recoveryError;
						}
					}

					try {
						const mutexStat = statSync(mutex);
						if (Date.now() - mutexStat.mtimeMs > RUN_STATE_MUTEX_STALE_MS && recoverStaleMutexWithoutOwner(mutex)) {
							continue;
						}
					} catch {
						continue;
					}
				}

				throw new Error(`run_state_mutex_busy:${scope}`);
			}

			sleep(RUN_STATE_MUTEX_SLEEP_MS);
		}
	}
}

export function withRunStateUpdateMutex<T>(
	projectRoot: string,
	scope: RunStateMutexScope,
	callback: () => T,
	options: { readonly waitMs?: number } = {},
): T {
	const releaseMutex = acquireRunStateMutex(projectRoot, scope, options);

	try {
		return callback();
	} finally {
		releaseMutex();
	}
}
