import { randomUUID } from 'node:crypto';
import {
	existsSync,
	lstatSync,
	mkdirSync,
	renameSync,
	rmSync,
} from 'node:fs';
import path from 'node:path';

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

function delay(milliseconds: number): Promise<void> {
	return new Promise((resolve) => {
		setTimeout(resolve, milliseconds);
	});
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

function createLeaseOwner(requestKey: string): LocalIndexBuildLeaseOwner {
	return {
		schema_version: LOCAL_INDEX_BUILD_LEASE_SCHEMA_VERSION,
		kind: LOCAL_INDEX_BUILD_LEASE_KIND,
		owner_token: randomUUID(),
		request_key: requestKey,
		pid: process.pid,
		process_start_token: readCurrentProcessStartToken(),
		started_at: new Date().toISOString(),
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
): boolean {
	if (!isProcessLive(owner.pid)) {
		return true;
	}

	return verifyStartToken && processStartTokensProveMismatch(
		owner.process_start_token,
		readProcessStartToken(owner.pid),
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
): boolean {
	const candidatePath = `${leasePath}.candidate-${process.pid}-${owner.owner_token}`;
	mkdirSync(candidatePath);

	try {
		writeJsonFileInsideWithoutSymlinks(projectRoot, leaseOwnerPath(candidatePath), owner);
		try {
			renameSync(candidatePath, leasePath);
			return true;
		} catch (error) {
			if (existsSync(leasePath)) {
				return false;
			}
			throw error;
		}
	} finally {
		rmSync(candidatePath, { recursive: true, force: true });
	}
}

function recoveryLeasePath(leasePath: string): string {
	return `${leasePath}.recovery`;
}

function beginLeaseRecovery(leasePath: string): (() => void) | null {
	const recoveryPath = recoveryLeasePath(leasePath);

	try {
		mkdirSync(recoveryPath);
	} catch (error) {
		if (errorCode(error) !== 'EEXIST') {
			throw error;
		}

		try {
			if (Date.now() - lstatSync(recoveryPath).mtimeMs >= LOCAL_INDEX_RECOVERY_LEASE_STALE_MS) {
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

function recoverStaleLease(
	projectRoot: string,
	leasePath: string,
	staleOwner: LocalIndexBuildLeaseOwner,
): boolean {
	const releaseRecovery = beginLeaseRecovery(leasePath);
	if (!releaseRecovery) {
		return false;
	}

	try {
		if (
			!sameLeaseOwner(staleOwner, readLeaseOwner(projectRoot, leasePath)) ||
			!leaseOwnerIsStale(staleOwner, true)
		) {
			return false;
		}

		const stalePath = `${leasePath}.stale-${staleOwner.owner_token}`;
		rmSync(stalePath, { recursive: true, force: true });
		try {
			renameSync(leasePath, stalePath);
		} catch (error) {
			return errorCode(error) === 'ENOENT';
		}
		rmSync(stalePath, { recursive: true, force: true });
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
): Promise<LocalIndexBuildLeaseHandle> {
	ensureLeaseParent(projectRoot);
	const leasePath = getLocalIndexBuildLeasePath(projectRoot);
	const deadline = Date.now() + LOCAL_INDEX_BUILD_LEASE_WAIT_MS;
	let waitedForEquivalentBuild = false;
	let observedOwnerToken: string | null = null;
	let ownerStartTokenCheckedAt = 0;

	while (true) {
		const owner = createLeaseOwner(requestKey);
		if (createLeaseDirectoryAtomically(projectRoot, leasePath, owner)) {
			return {
				waitedForEquivalentBuild,
				release() {
					if (!sameLeaseOwner(owner, readLeaseOwner(projectRoot, leasePath))) {
						return;
					}

					const releasePath = `${leasePath}.release-${process.pid}-${owner.owner_token}`;
					try {
						renameSync(leasePath, releasePath);
					} catch (error) {
						if (errorCode(error) === 'ENOENT') {
							return;
						}
						throw error;
					}
					rmSync(releasePath, { recursive: true, force: true });
				},
			};
		}

		const activeOwner = readLeaseOwner(projectRoot, leasePath);
		if (!activeOwner) {
			if (Date.now() >= deadline) {
				throw new Error('local_index_builder_lease_unreadable');
			}
			await delay(Math.min(LOCAL_INDEX_BUILD_LEASE_POLL_MS, deadline - Date.now()));
			continue;
		}

		const now = Date.now();
		const verifyStartToken = (
			activeOwner.owner_token !== observedOwnerToken ||
			now - ownerStartTokenCheckedAt >= LOCAL_INDEX_OWNER_START_TOKEN_RECHECK_MS
		);
		const activeOwnerStale = leaseOwnerIsStale(activeOwner, verifyStartToken);

		if (verifyStartToken && !activeOwnerStale) {
			observedOwnerToken = activeOwner.owner_token;
			ownerStartTokenCheckedAt = now;
		}

		if (activeOwner.request_key === requestKey && !activeOwnerStale) {
			waitedForEquivalentBuild = true;
		}

		if (activeOwnerStale && recoverStaleLease(projectRoot, leasePath, activeOwner)) {
			continue;
		}

		if (Date.now() >= deadline) {
			throw new Error('local_index_builder_lease_timeout');
		}

		await delay(Math.min(LOCAL_INDEX_BUILD_LEASE_POLL_MS, deadline - Date.now()));
	}
}
