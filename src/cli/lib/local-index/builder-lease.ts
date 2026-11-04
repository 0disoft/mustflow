import { randomUUID } from 'node:crypto';
import {
	existsSync,
	lstatSync,
	mkdirSync,
	renameSync,
	rmSync,
} from 'node:fs';
import path from 'node:path';

import { throwIfInterrupted, waitWithSignal } from '../../../core/cancellation.js';
import {
	processStartTokensProveMismatch,
	readCurrentProcessStartToken,
	readProcessStartToken,
} from '../../../core/process-identity.js';
import {
	ensureInsideWithoutSymlinks,
	readUtf8FileInsideWithoutSymlinks,
	writeJsonFileInsideWithoutSymlinks,
} from '../../../core/safe-filesystem.js';
import {
	getLocalIndexBuildLeasePath,
	getLocalIndexStorePath,
} from './database-path.js';

const LOCAL_INDEX_BUILD_LEASE_SCHEMA_VERSION = '1';
const LOCAL_INDEX_BUILD_LEASE_KIND = 'local_index_builder_lease';
const LOCAL_INDEX_BUILD_LEASE_OWNER_MAX_BYTES = 16 * 1024;
const LOCAL_INDEX_BUILD_LEASE_WAIT_MS = 5 * 60 * 1000;
const LOCAL_INDEX_BUILD_LEASE_POLL_MS = 50;
const LOCAL_INDEX_RECOVERY_LEASE_STALE_MS = 30 * 1000;
const LOCAL_INDEX_OWNER_START_TOKEN_RECHECK_MS = 5 * 1000;

interface LocalIndexBuildLeaseOwner {
	readonly schema_version: typeof LOCAL_INDEX_BUILD_LEASE_SCHEMA_VERSION;
	readonly kind: typeof LOCAL_INDEX_BUILD_LEASE_KIND;
	readonly owner_token: string;
	readonly request_key: string;
	readonly pid: number;
	readonly process_start_token: string;
	readonly started_at: string;
}

export interface LocalIndexBuildLeaseHandle {
	readonly waitedForEquivalentBuild: boolean;
	release(): void;
}

export interface LocalIndexBuildLeaseRuntime {
	readonly now: () => number;
	readonly randomUUID: () => string;
	readonly delay: typeof waitWithSignal;
	readonly isProcessLive: typeof isProcessLive;
	readonly readProcessStartToken: typeof readProcessStartToken;
	readonly readCurrentProcessStartToken: typeof readCurrentProcessStartToken;
	readonly readOwner: typeof readLeaseOwner;
	readonly rename: (source: string, target: string) => void;
	readonly remove: (target: string) => void;
}

export interface LocalIndexBuildLeaseOptions {
	readonly signal?: AbortSignal;
	readonly runtime?: Partial<LocalIndexBuildLeaseRuntime>;
}

const DEFAULT_RUNTIME: LocalIndexBuildLeaseRuntime = {
	now: Date.now,
	randomUUID,
	delay: waitWithSignal,
	isProcessLive,
	readProcessStartToken,
	readCurrentProcessStartToken,
	readOwner: readLeaseOwner,
	rename: renameSync,
	remove: (target) => rmSync(target, { recursive: true, force: true }),
};

function createOwnerToken(runtime: LocalIndexBuildLeaseRuntime): string {
	const token = runtime.randomUUID();
	if (!/^[\da-f]{8}-[\da-f]{4}-[\da-f]{4}-[\da-f]{4}-[\da-f]{12}$/iu.test(token)) {
		throw new Error('local_index_builder_lease_token_invalid');
	}
	return token;
}

function errorCode(error: unknown): string {
	return error && typeof error === 'object' && 'code' in error ? String(error.code) : '';
}

function isProcessLive(pid: number): boolean {
	if (!Number.isInteger(pid) || pid <= 0) {
		return false;
	}

	try {
		process.kill(pid, 0);
		return true;
	} catch (error) {
		return errorCode(error) === 'EPERM';
	}
}

function createLeaseOwner(requestKey: string, runtime: LocalIndexBuildLeaseRuntime): LocalIndexBuildLeaseOwner {
	return {
		schema_version: LOCAL_INDEX_BUILD_LEASE_SCHEMA_VERSION,
		kind: LOCAL_INDEX_BUILD_LEASE_KIND,
		owner_token: createOwnerToken(runtime),
		request_key: requestKey,
		pid: process.pid,
		process_start_token: runtime.readCurrentProcessStartToken(),
		started_at: new Date(runtime.now()).toISOString(),
	};
}

function parseLeaseOwner(value: unknown): LocalIndexBuildLeaseOwner | null {
	if (!value || typeof value !== 'object' || Array.isArray(value)) {
		return null;
	}

	const owner = value as Record<string, unknown>;
	if (
		owner.schema_version !== LOCAL_INDEX_BUILD_LEASE_SCHEMA_VERSION ||
		owner.kind !== LOCAL_INDEX_BUILD_LEASE_KIND ||
		typeof owner.owner_token !== 'string' ||
		typeof owner.request_key !== 'string' ||
		typeof owner.pid !== 'number' ||
		!Number.isInteger(owner.pid) ||
		typeof owner.process_start_token !== 'string' ||
		typeof owner.started_at !== 'string'
	) {
		return null;
	}

	return {
		schema_version: LOCAL_INDEX_BUILD_LEASE_SCHEMA_VERSION,
		kind: LOCAL_INDEX_BUILD_LEASE_KIND,
		owner_token: owner.owner_token,
		request_key: owner.request_key,
		pid: owner.pid,
		process_start_token: owner.process_start_token,
		started_at: owner.started_at,
	};
}

function leaseOwnerPath(leasePath: string): string {
	return path.join(leasePath, 'owner.json');
}

function readLeaseOwner(projectRoot: string, leasePath: string): LocalIndexBuildLeaseOwner | null {
	try {
		return parseLeaseOwner(
			JSON.parse(
				readUtf8FileInsideWithoutSymlinks(projectRoot, leaseOwnerPath(leasePath), {
					maxBytes: LOCAL_INDEX_BUILD_LEASE_OWNER_MAX_BYTES,
				}),
			),
		);
	} catch {
		return null;
	}
}

function leaseOwnerIsStale(
	owner: LocalIndexBuildLeaseOwner,
	verifyStartToken: boolean,
	runtime: LocalIndexBuildLeaseRuntime,
): boolean {
	if (!runtime.isProcessLive(owner.pid)) {
		return true;
	}

	return verifyStartToken && processStartTokensProveMismatch(
		owner.process_start_token,
		runtime.readProcessStartToken(owner.pid),
	);
}

function ensureLeaseParent(projectRoot: string): void {
	const storePath = getLocalIndexStorePath(projectRoot);
	mkdirSync(storePath, { recursive: true });
	ensureInsideWithoutSymlinks(projectRoot, storePath);
}

function sameLeaseOwner(
	left: LocalIndexBuildLeaseOwner,
	right: LocalIndexBuildLeaseOwner | null,
): boolean {
	return (
		right !== null &&
		left.owner_token === right.owner_token &&
		left.pid === right.pid &&
		left.process_start_token === right.process_start_token
	);
}

function createLeaseDirectoryAtomically(
	projectRoot: string,
	leasePath: string,
	owner: LocalIndexBuildLeaseOwner,
	runtime: LocalIndexBuildLeaseRuntime,
): boolean {
	const candidatePath = `${leasePath}.candidate-${process.pid}-${owner.owner_token}`;
	mkdirSync(candidatePath);

	try {
		writeJsonFileInsideWithoutSymlinks(projectRoot, leaseOwnerPath(candidatePath), owner);
		try {
			runtime.rename(candidatePath, leasePath);
			return true;
		} catch (error) {
			if (existsSync(leasePath)) {
				return false;
			}
			throw error;
		}
	} finally {
		runtime.remove(candidatePath);
	}
}

function recoveryLeasePath(leasePath: string): string {
	return `${leasePath}.recovery`;
}

function beginLeaseRecovery(leasePath: string, runtime: LocalIndexBuildLeaseRuntime): (() => void) | null {
	const recoveryPath = recoveryLeasePath(leasePath);

	try {
		mkdirSync(recoveryPath);
	} catch (error) {
		if (errorCode(error) !== 'EEXIST') {
			throw error;
		}

		try {
			if (runtime.now() - lstatSync(recoveryPath).mtimeMs >= LOCAL_INDEX_RECOVERY_LEASE_STALE_MS) {
				runtime.remove(recoveryPath);
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
		runtime.remove(recoveryPath);
	};
}

function recoverStaleLease(
	projectRoot: string,
	leasePath: string,
	staleOwner: LocalIndexBuildLeaseOwner,
	runtime: LocalIndexBuildLeaseRuntime,
	signal?: AbortSignal,
): boolean {
	throwIfInterrupted(signal);
	ensureInsideWithoutSymlinks(projectRoot, leasePath, { allowMissingLeaf: true });
	const releaseRecovery = beginLeaseRecovery(leasePath, runtime);
	if (!releaseRecovery) {
		return false;
	}

	try {
		if (
			!sameLeaseOwner(staleOwner, runtime.readOwner(projectRoot, leasePath)) ||
			!leaseOwnerIsStale(staleOwner, true, runtime)
		) {
			return false;
		}

		// Owner metadata is untrusted; it must never name a recursive deletion target.
		const stalePath = `${leasePath}.stale-${createOwnerToken(runtime)}`;
		throwIfInterrupted(signal);
		ensureInsideWithoutSymlinks(projectRoot, stalePath, { allowMissingLeaf: true });
		try {
			runtime.rename(leasePath, stalePath);
		} catch (error) {
			if (errorCode(error) === 'ENOENT') {
				return true;
			}
			throw error;
		}
		ensureInsideWithoutSymlinks(projectRoot, stalePath);
		runtime.remove(stalePath);
		return true;
	} finally {
		releaseRecovery();
	}
}

/**
 * mf:anchor cli.index.builder-lease
 * purpose: Admit one local-index builder while allowing other sessions to keep reading the current generation.
 * search: local index builder lease, stale lease recovery, equivalent build coalescing
 * invariant: Only the owner token that atomically published a live lease may release it.
 * risk: cache, state
 */
export async function acquireLocalIndexBuildLease(
	projectRoot: string,
	requestKey: string,
	options: LocalIndexBuildLeaseOptions = {},
): Promise<LocalIndexBuildLeaseHandle> {
	throwIfInterrupted(options.signal);
	const runtime = { ...DEFAULT_RUNTIME, ...options.runtime };
	ensureLeaseParent(projectRoot);
	const leasePath = getLocalIndexBuildLeasePath(projectRoot);
	const deadline = runtime.now() + LOCAL_INDEX_BUILD_LEASE_WAIT_MS;
	let unavailableReason: string | null = null;
	let waitedForEquivalentBuild = false;
	let observedOwnerToken: string | null = null;
	let ownerStartTokenCheckedAt = 0;

	while (true) {
		throwIfInterrupted(options.signal);
		if (unavailableReason !== null && runtime.now() >= deadline) {
			throw new Error(unavailableReason);
		}
		const owner = createLeaseOwner(requestKey, runtime);
		if (createLeaseDirectoryAtomically(projectRoot, leasePath, owner, runtime)) {
			const handle: LocalIndexBuildLeaseHandle = {
				waitedForEquivalentBuild,
				release() {
					if (!sameLeaseOwner(owner, runtime.readOwner(projectRoot, leasePath))) {
						return;
					}

					const releasePath = `${leasePath}.release-${process.pid}-${owner.owner_token}`;
					try {
						runtime.rename(leasePath, releasePath);
					} catch (error) {
						if (errorCode(error) === 'ENOENT') {
							return;
						}
						throw error;
					}
					runtime.remove(releasePath);
				},
			};
			if (options.signal?.aborted) {
				handle.release();
				throwIfInterrupted(options.signal);
			}
			return handle;
		}

		const activeOwner = runtime.readOwner(projectRoot, leasePath);
		unavailableReason = activeOwner ? 'local_index_builder_lease_timeout' : 'local_index_builder_lease_unreadable';
		if (!activeOwner) {
			const remaining = deadline - runtime.now();
			if (remaining <= 0) {
				throw new Error(unavailableReason);
			}
			await runtime.delay(Math.min(LOCAL_INDEX_BUILD_LEASE_POLL_MS, remaining), options.signal);
			continue;
		}

		const now = runtime.now();
		const verifyStartToken = (
			activeOwner.owner_token !== observedOwnerToken ||
			now - ownerStartTokenCheckedAt >= LOCAL_INDEX_OWNER_START_TOKEN_RECHECK_MS
		);
		const activeOwnerStale = leaseOwnerIsStale(activeOwner, verifyStartToken, runtime);

		if (verifyStartToken && !activeOwnerStale) {
			observedOwnerToken = activeOwner.owner_token;
			ownerStartTokenCheckedAt = now;
		}

		if (activeOwner.request_key === requestKey && !activeOwnerStale) {
			waitedForEquivalentBuild = true;
		}

		if (activeOwnerStale && recoverStaleLease(projectRoot, leasePath, activeOwner, runtime, options.signal)) {
			continue;
		}

		const remaining = deadline - runtime.now();
		if (remaining <= 0) {
			throw new Error(unavailableReason);
		}

		await runtime.delay(Math.min(LOCAL_INDEX_BUILD_LEASE_POLL_MS, remaining), options.signal);
	}
}
