import { createHash, randomUUID } from 'node:crypto';
import {
	existsSync,
	mkdirSync,
	readdirSync,
	renameSync,
	rmSync,
	statSync,
} from 'node:fs';
import path from 'node:path';

import {
	commandEffectsConflict,
	isCommandEffectScope,
	normalizeCommandEffects,
	resolveCommandEffectScope,
	type CommandEffectScope,
	type NormalizedCommandEffect,
} from './command-effects.js';
import type { CommandContract } from './config-loading.js';
import {
	listAvailableActiveRunLockScopeRoots,
	resolveActiveRunLockScopeRoot,
	resolveActiveRunLockScopeRoots,
	type ActiveRunLockScopeRoot,
} from './active-run-lock-scopes.js';
import {
	readUtf8FileInsideWithoutSymlinks,
	writeJsonFileInsideWithoutSymlinks,
} from './safe-filesystem.js';
import {
	processStartTokensProveMismatch,
	readCurrentProcessStartToken,
	readProcessStartToken,
} from './process-identity.js';

const ACTIVE_LOCK_SCHEMA_VERSION = '3';
const PREVIOUS_ACTIVE_LOCK_SCHEMA_VERSION = '2';
const LEGACY_ACTIVE_LOCK_SCHEMA_VERSION = '1';
const ACTIVE_LOCK_KIND = 'active_run_lock';
export const ACTIVE_RUN_LOCK_ID_ENV = 'MUSTFLOW_ACTIVE_RUN_LOCK_ID';
const LOCK_MUTEX_STALE_MS = 30_000;
const LOCK_MUTEX_WAIT_MS = 1_000;
const RUN_STATE_UPDATE_MUTEX_WAIT_MS = 35_000;
const LOCK_MUTEX_SLEEP_MS = 25;
const LOCK_MUTEX_SLEEP_BUFFER = new Int32Array(new SharedArrayBuffer(4));
const LOCK_MUTEX_RECOVERY_DIRECTORY = 'mutex.recovery';
const ACTIVE_LOCK_RECORD_MAX_BYTES = 256 * 1024;
const ACTIVE_LOCK_OWNER_MAX_BYTES = 16 * 1024;

export interface ActiveRunLockEffect {
	readonly source: string;
	readonly access: string;
	readonly mode: string;
	readonly path: string | null;
	readonly lock: string;
	readonly concurrency: string;
	readonly scope: CommandEffectScope;
}

export interface ActiveRunLockRecord {
	readonly schema_version:
		| typeof ACTIVE_LOCK_SCHEMA_VERSION
		| typeof PREVIOUS_ACTIVE_LOCK_SCHEMA_VERSION
		| typeof LEGACY_ACTIVE_LOCK_SCHEMA_VERSION;
	readonly kind: typeof ACTIVE_LOCK_KIND;
	readonly run_id: string;
	readonly owner_token: string | null;
	readonly intent: string;
	readonly pid: number;
	readonly process_start_token: string | null;
	readonly started_at: string;
	readonly root_hash: string;
	readonly command_hash: string | null;
	readonly effects: readonly ActiveRunLockEffect[];
	readonly writes: readonly string[];
}

export interface ActiveRunLockConflict {
	readonly intent: string;
	readonly pid: number;
	readonly lock: string;
	readonly path: string | null;
	readonly mode: string;
	readonly concurrency: string;
	readonly conflictsWithIntent: string;
	readonly conflictsWithPid: number;
	readonly conflictsWithMode: string;
	readonly detail: string;
}

export interface ActiveRunLockStaleRecord {
	readonly runId: string;
	readonly intent: string;
	readonly pid: number;
	readonly reason: string;
}

export interface ActiveRunLockInspection {
	readonly conflicts: readonly ActiveRunLockConflict[];
	readonly staleRecords: readonly ActiveRunLockStaleRecord[];
}

export interface ActiveRunLockState {
	readonly records: readonly ActiveRunLockRecord[];
	readonly activeRecords: readonly ActiveRunLockRecord[];
	readonly staleRecords: readonly ActiveRunLockStaleRecord[];
}

export interface ActiveRunLockHandle {
	readonly record: ActiveRunLockRecord;
	readonly records: readonly ActiveRunLockRecord[];
	readonly recoveredStaleRecords: readonly ActiveRunLockStaleRecord[];
	release(): void;
}

export type ActiveRunLockAcquireResult =
	| { readonly ok: true; readonly handle: ActiveRunLockHandle }
	| {
		readonly ok: false;
		readonly conflicts: readonly ActiveRunLockConflict[];
		readonly recoveredStaleRecords: readonly ActiveRunLockStaleRecord[];
	};

interface ActiveRunLockIdentity {
	readonly runId: string;
	readonly ownerToken: string;
	readonly processStartToken: string;
	readonly startedAt: string;
	readonly rootHash: string;
	readonly commandHash: string | null;
}

interface ScopedLockRecord {
	readonly scopeRoot: ActiveRunLockScopeRoot;
	readonly record: ActiveRunLockRecord;
	readonly recordPath: string;
}

function sleep(milliseconds: number): void {
	try {
		Atomics.wait(LOCK_MUTEX_SLEEP_BUFFER, 0, 0, milliseconds);
	} catch {
		const end = Date.now() + milliseconds;
		while (Date.now() < end) {
			// Fall back only for short mutex retry delays when Atomics.wait is unavailable on this runtime.
		}
	}
}

function sha256(value: string): string {
	return createHash('sha256').update(value).digest('hex');
}

function activeLockDirectory(lockRoot: string): string {
	return path.join(lockRoot, 'active');
}

function activeLockMutexDirectory(lockRoot: string): string {
	return path.join(lockRoot, 'mutex');
}

function activeLockMutexRecoveryDirectory(mutex: string): string {
	return path.join(path.dirname(mutex), LOCK_MUTEX_RECOVERY_DIRECTORY);
}

function normalizeEffect(effect: NormalizedCommandEffect): ActiveRunLockEffect {
	return {
		source: effect.source,
		access: effect.access,
		mode: effect.mode,
		path: effect.path,
		lock: effect.lock,
		concurrency: effect.concurrency,
		scope: resolveCommandEffectScope(effect),
	};
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

function commandEffectsFromRecord(record: ActiveRunLockRecord): readonly NormalizedCommandEffect[] {
	return record.effects.map((effect) => ({
		intent: record.intent,
		source: effect.source === 'writes' ? 'writes' : 'effects',
		access: effect.access === 'read' ? 'read' : 'write',
		mode: effect.mode === 'read' ? 'read' :
			effect.mode === 'append' ? 'append' :
				effect.mode === 'replace' ? 'replace' :
					effect.mode === 'delete_recreate' ? 'delete_recreate' :
						'write',
		path: effect.path,
		lock: effect.lock,
		concurrency: effect.concurrency === 'shared' ? 'shared' : 'exclusive',
		scope: effect.scope,
	}));
}

function activeLockRecordPath(lockRoot: string, runId: string): string {
	return path.join(activeLockDirectory(lockRoot), `${sha256(runId)}.json`);
}

function parseRecord(value: unknown): ActiveRunLockRecord | null {
	if (!value || typeof value !== 'object' || Array.isArray(value)) {
		return null;
	}

	const record = value as Record<string, unknown>;
	const schemaVersion = record.schema_version;
	const isCurrentSchema = schemaVersion === ACTIVE_LOCK_SCHEMA_VERSION;
	const hasOwnerIdentity = isCurrentSchema || schemaVersion === PREVIOUS_ACTIVE_LOCK_SCHEMA_VERSION;
	if (
		(!isCurrentSchema &&
			schemaVersion !== PREVIOUS_ACTIVE_LOCK_SCHEMA_VERSION &&
			schemaVersion !== LEGACY_ACTIVE_LOCK_SCHEMA_VERSION) ||
		record.kind !== ACTIVE_LOCK_KIND ||
		typeof record.run_id !== 'string' ||
		typeof record.intent !== 'string' ||
		!Number.isInteger(record.pid) ||
		typeof record.started_at !== 'string' ||
		typeof record.root_hash !== 'string' ||
		!(typeof record.command_hash === 'string' || record.command_hash === null) ||
		!Array.isArray(record.effects) ||
		!Array.isArray(record.writes)
	) {
		return null;
	}
	if (
		hasOwnerIdentity &&
		(typeof record.owner_token !== 'string' ||
			typeof record.process_start_token !== 'string')
	) {
		return null;
	}

	const effects: ActiveRunLockEffect[] = [];
	for (const effect of record.effects) {
		if (!effect || typeof effect !== 'object' || Array.isArray(effect)) {
			return null;
		}

		const candidate = effect as Record<string, unknown>;
		if (
			typeof candidate.source !== 'string' ||
			typeof candidate.access !== 'string' ||
			typeof candidate.mode !== 'string' ||
			!(typeof candidate.path === 'string' || candidate.path === null) ||
			typeof candidate.lock !== 'string' ||
			typeof candidate.concurrency !== 'string' ||
			(isCurrentSchema && !isCommandEffectScope(candidate.scope))
		) {
			return null;
		}

		effects.push({
			source: candidate.source,
			access: candidate.access,
			mode: candidate.mode,
			path: candidate.path,
			lock: candidate.lock,
			concurrency: candidate.concurrency,
			scope: isCurrentSchema && isCommandEffectScope(candidate.scope) ? candidate.scope : 'worktree',
		});
	}
	const writes = record.writes.filter((write): write is string => typeof write === 'string');
	if (writes.length !== record.writes.length) {
		return null;
	}

	return {
		schema_version: schemaVersion,
		kind: ACTIVE_LOCK_KIND,
		run_id: record.run_id,
		owner_token: hasOwnerIdentity ? record.owner_token as string : null,
		intent: record.intent,
		pid: Number(record.pid),
		process_start_token: hasOwnerIdentity ? record.process_start_token as string : null,
		started_at: record.started_at,
		root_hash: record.root_hash,
		command_hash: record.command_hash,
		effects,
		writes,
	};
}

function readActiveRecords(
	lockRoot: string,
	options: { readonly failClosedOnUnreadable?: boolean } = {},
): readonly ActiveRunLockRecord[] {
	const directory = activeLockDirectory(lockRoot);
	if (!existsSync(directory)) {
		return [];
	}

	const records: ActiveRunLockRecord[] = [];
	const entries = readdirSync(directory, { withFileTypes: true })
		.filter((entry) => entry.isFile() && entry.name.endsWith('.json'))
		.map((entry) => entry.name)
		.sort();

	for (const name of entries) {
		try {
			const recordPath = path.join(directory, name);
			const record = parseRecord(
				JSON.parse(
					readUtf8FileInsideWithoutSymlinks(directory, recordPath, {
						maxBytes: ACTIVE_LOCK_RECORD_MAX_BYTES,
					}),
				),
			);
			if (!record) {
				if (options.failClosedOnUnreadable) {
					throw new Error(`active_run_lock_record_unreadable:${name}`);
				}
				continue;
			}
			records.push(record);
		} catch (error) {
			if (options.failClosedOnUnreadable) {
				if (error instanceof Error && error.message.startsWith('active_run_lock_record_unreadable:')) {
					throw error;
				}
				throw new Error(`active_run_lock_record_unreadable:${name}`, { cause: error });
			}
			// Read-only inspection ignores malformed records; write/exclusive acquisition fails closed below.
		}
	}

	return records;
}

function staleRecordFor(record: ActiveRunLockRecord): ActiveRunLockStaleRecord | null {
	if (!isProcessLive(record.pid)) {
		return {
			runId: record.run_id,
			intent: record.intent,
			pid: record.pid,
			reason: 'process_not_live',
		};
	}

	const currentStartToken = record.process_start_token === null ? null : readProcessStartToken(record.pid);
	return processStartTokensProveMismatch(record.process_start_token, currentStartToken)
		? {
			runId: record.run_id,
			intent: record.intent,
			pid: record.pid,
			reason: 'process_start_token_mismatch',
		}
		: null;
}

function removeRecord(lockRoot: string, record: ActiveRunLockRecord): void {
	rmSync(activeLockRecordPath(lockRoot, record.run_id), { force: true });
}

function conflictDetail(current: NormalizedCommandEffect, active: NormalizedCommandEffect): string {
	return `${resolveCommandEffectScope(current)} lock "${current.lock}" conflicts with active intent "${active.intent}"`;
}

function findConflicts(
	intentName: string,
	effects: readonly NormalizedCommandEffect[],
	records: readonly ActiveRunLockRecord[],
): readonly ActiveRunLockConflict[] {
	const conflicts: ActiveRunLockConflict[] = [];

	for (const record of records) {
		for (const activeEffect of commandEffectsFromRecord(record)) {
			for (const effect of effects) {
				if (!commandEffectsConflict(effect, activeEffect)) {
					continue;
				}

				conflicts.push({
					intent: intentName,
					pid: process.pid,
					lock: effect.lock,
					path: effect.path,
					mode: effect.mode,
					concurrency: effect.concurrency,
					conflictsWithIntent: record.intent,
					conflictsWithPid: record.pid,
					conflictsWithMode: activeEffect.mode,
					detail: conflictDetail(effect, activeEffect),
				});
			}
		}
	}

	return conflicts;
}

function createIdentity(projectRoot: string, commandHash: string | null): ActiveRunLockIdentity {
	return {
		runId: randomUUID(),
		ownerToken: randomUUID(),
		processStartToken: readCurrentProcessStartToken(),
		startedAt: new Date().toISOString(),
		rootHash: sha256(path.resolve(projectRoot)),
		commandHash,
	};
}

function createRecord(
	identity: ActiveRunLockIdentity,
	intentName: string,
	effects: readonly NormalizedCommandEffect[],
): ActiveRunLockRecord {
	const writes = effects
		.filter((effect) => effect.access === 'write' && effect.path !== null)
		.map((effect) => effect.path as string)
		.sort((left, right) => left.localeCompare(right));

	return {
		schema_version: ACTIVE_LOCK_SCHEMA_VERSION,
		kind: ACTIVE_LOCK_KIND,
		run_id: identity.runId,
		owner_token: identity.ownerToken,
		intent: intentName,
		pid: process.pid,
		process_start_token: identity.processStartToken,
		started_at: identity.startedAt,
		root_hash: identity.rootHash,
		command_hash: identity.commandHash,
		effects: effects.map(normalizeEffect),
		writes: [...new Set(writes)],
	};
}

interface ActiveMutexOwner {
	readonly lockId: string | null;
	readonly pid: number;
	readonly processStartToken: string | null;
	readonly startedAt: string;
	readonly ownerToken: string;
}

function readMutexOwner(ownerPath: string): ActiveMutexOwner | null {
	try {
		const owner = JSON.parse(
			readUtf8FileInsideWithoutSymlinks(path.dirname(ownerPath), ownerPath, {
				maxBytes: ACTIVE_LOCK_OWNER_MAX_BYTES,
			}),
		) as {
			lock_id?: unknown;
			owner_token?: unknown;
			pid?: unknown;
			process_start_token?: unknown;
			started_at?: unknown;
			token?: unknown;
		};
		const ownerToken = typeof owner.owner_token === 'string' ? owner.owner_token : owner.token;
		if (typeof owner.started_at !== 'string' || typeof ownerToken !== 'string') {
			return null;
		}

		return {
			lockId: typeof owner.lock_id === 'string' ? owner.lock_id : null,
			pid: Number(owner.pid),
			processStartToken: typeof owner.process_start_token === 'string' ? owner.process_start_token : null,
			startedAt: owner.started_at,
			ownerToken,
		};
	} catch {
		return null;
	}
}

function sameMutexOwner(left: ActiveMutexOwner, right: ActiveMutexOwner | null): boolean {
	return right !== null &&
		left.pid === right.pid &&
		left.lockId === right.lockId &&
		left.processStartToken === right.processStartToken &&
		left.startedAt === right.startedAt &&
		left.ownerToken === right.ownerToken;
}

function mutexOwnerIsStale(owner: ActiveMutexOwner): boolean {
	if (!isProcessLive(owner.pid)) {
		return true;
	}

	const currentStartToken = owner.processStartToken === null ? null : readProcessStartToken(owner.pid);
	return processStartTokensProveMismatch(owner.processStartToken, currentStartToken);
}

function beginMutexRecovery(mutex: string): (() => void) | null {
	const recoveryPath = activeLockMutexRecoveryDirectory(mutex);

	try {
		mkdirSync(recoveryPath);
	} catch (error) {
		if (!error || typeof error !== 'object' || !('code' in error) || error.code !== 'EEXIST') {
			throw error;
		}

		try {
			const recoveryStat = statSync(recoveryPath);
			if (Date.now() - recoveryStat.mtimeMs > LOCK_MUTEX_STALE_MS) {
				rmSync(recoveryPath, { recursive: true, force: true });
			}
		} catch {
			// A concurrent recovery may have already finished.
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

function moveMutexAsideForRecovery(mutex: string, owner: ActiveMutexOwner | null): string | null {
	const tokenSource = owner
		? `${owner.pid}:${owner.startedAt}:${owner.ownerToken}`
		: `${process.pid}:${Date.now()}:${process.hrtime.bigint()}`;
	const stalePath = path.join(path.dirname(mutex), `mutex.stale-${sha256(tokenSource)}`);

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

function recoverStaleMutexWithOwner(mutex: string, ownerPath: string, staleOwner: ActiveMutexOwner): boolean {
	const releaseRecovery = beginMutexRecovery(mutex);
	if (!releaseRecovery) {
		return false;
	}

	try {
		if (!sameMutexOwner(staleOwner, readMutexOwner(ownerPath)) || !mutexOwnerIsStale(staleOwner)) {
			return false;
		}

		const stalePath = moveMutexAsideForRecovery(mutex, staleOwner);
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
	const releaseRecovery = beginMutexRecovery(mutex);
	if (!releaseRecovery) {
		return false;
	}

	try {
		const ownerPath = path.join(mutex, 'owner.json');
		if (existsSync(ownerPath)) {
			return false;
		}

		const stalePath = moveMutexAsideForRecovery(mutex, null);
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

function acquireMutex(lockRoot: string, options: { readonly waitMs?: number } = {}): () => void {
	const mutex = activeLockMutexDirectory(lockRoot);
	const ownerPath = path.join(mutex, 'owner.json');
	const processStartToken = readCurrentProcessStartToken();
	const ownerRecord = {
		lock_id: randomUUID(),
		owner_token: randomUUID(),
		pid: process.pid,
		process_start_token: processStartToken,
		started_at: new Date().toISOString(),
	};
	const expectedOwner: ActiveMutexOwner = {
		lockId: ownerRecord.lock_id,
		pid: ownerRecord.pid,
		processStartToken: ownerRecord.process_start_token,
		startedAt: ownerRecord.started_at,
		ownerToken: ownerRecord.owner_token,
	};
	mkdirSync(lockRoot, { recursive: true, mode: 0o700 });
	const startedAt = Date.now();
	const waitMs = options.waitMs ?? LOCK_MUTEX_WAIT_MS;

	while (true) {
		try {
			mkdirSync(mutex);
			try {
				writeJsonFileInsideWithoutSymlinks(lockRoot, ownerPath, ownerRecord);
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
			if (!error || typeof error !== 'object' || !('code' in error) || error.code !== 'EEXIST') {
				throw error;
			}

			if (Date.now() - startedAt > waitMs) {
				const owner = readMutexOwner(ownerPath);
				if (owner) {
					if (mutexOwnerIsStale(owner) && recoverStaleMutexWithOwner(mutex, ownerPath, owner)) {
						continue;
					}
				} else {
					const recoveryPath = activeLockMutexRecoveryDirectory(mutex);
					try {
						const recoveryStat = statSync(recoveryPath);
						if (Date.now() - recoveryStat.mtimeMs <= LOCK_MUTEX_STALE_MS) {
							throw new Error('active_run_lock_mutex_busy');
						}
					} catch (recoveryError) {
						if (recoveryError instanceof Error && recoveryError.message === 'active_run_lock_mutex_busy') {
							throw recoveryError;
						}
					}

					try {
						const mutexStat = statSync(mutex);
						if (Date.now() - mutexStat.mtimeMs > LOCK_MUTEX_STALE_MS && recoverStaleMutexWithoutOwner(mutex)) {
							continue;
						}
					} catch {
						continue;
					}
				}

				throw new Error('active_run_lock_mutex_busy');
			}

			sleep(LOCK_MUTEX_SLEEP_MS);
		}
	}
}

function releaseMutexes(releases: readonly (() => void)[]): void {
	for (let index = releases.length - 1; index >= 0; index -= 1) {
		try {
			releases[index]?.();
		} catch {
			// Releasing one scope must not prevent releasing broader scopes.
		}
	}
}

function uniqueEffectScopes(effects: readonly NormalizedCommandEffect[]): readonly CommandEffectScope[] {
	return [...new Set(effects.map(resolveCommandEffectScope))];
}

function effectsForScope(
	effects: readonly NormalizedCommandEffect[],
	scope: CommandEffectScope,
): readonly NormalizedCommandEffect[] {
	return effects.filter((effect) => resolveCommandEffectScope(effect) === scope);
}

function dedupeStaleRecords(records: readonly ActiveRunLockStaleRecord[]): readonly ActiveRunLockStaleRecord[] {
	const byRunId = new Map<string, ActiveRunLockStaleRecord>();
	for (const record of records) {
		if (!byRunId.has(record.runId)) {
			byRunId.set(record.runId, record);
		}
	}
	return [...byRunId.values()];
}

function mergeRecords(records: readonly ActiveRunLockRecord[]): readonly ActiveRunLockRecord[] {
	const merged = new Map<string, ActiveRunLockRecord>();

	for (const record of records) {
		const existing = merged.get(record.run_id);
		if (!existing) {
			merged.set(record.run_id, record);
			continue;
		}

		const effects = new Map<string, ActiveRunLockEffect>();
		for (const effect of [...existing.effects, ...record.effects]) {
			const key = JSON.stringify([
				effect.scope,
				effect.source,
				effect.access,
				effect.mode,
				effect.path,
				effect.lock,
				effect.concurrency,
			]);
			effects.set(key, effect);
		}

		merged.set(record.run_id, {
			...existing,
			schema_version: ACTIVE_LOCK_SCHEMA_VERSION,
			effects: [...effects.values()],
			writes: [...new Set([...existing.writes, ...record.writes])].sort((left, right) => left.localeCompare(right)),
		});
	}

	return [...merged.values()].sort((left, right) =>
		left.started_at.localeCompare(right.started_at) || left.run_id.localeCompare(right.run_id));
}

function rootRecords(
	scopeRoot: ActiveRunLockScopeRoot,
	options: { readonly failClosedOnUnreadable?: boolean } = {},
): readonly ActiveRunLockRecord[] {
	return readActiveRecords(scopeRoot.root, options);
}

export function withRunStateUpdateMutex<T>(projectRoot: string, callback: () => T): T {
	const lockRoot = resolveActiveRunLockScopeRoot(projectRoot, 'worktree').root;
	const releaseMutex = acquireMutex(lockRoot, { waitMs: RUN_STATE_UPDATE_MUTEX_WAIT_MS });

	try {
		return callback();
	} finally {
		releaseMutex();
	}
}

export function inspectActiveRunLocks(
	projectRoot: string,
	contract: CommandContract,
	intentName: string,
): ActiveRunLockInspection {
	const effects = normalizeCommandEffects(projectRoot, contract, intentName);
	const roots = effects.length > 0
		? resolveActiveRunLockScopeRoots(projectRoot, uniqueEffectScopes(effects))
		: [resolveActiveRunLockScopeRoot(projectRoot, 'worktree')];
	const conflicts: ActiveRunLockConflict[] = [];
	const staleRecords: ActiveRunLockStaleRecord[] = [];

	for (const scopeRoot of roots) {
		const records = rootRecords(scopeRoot);
		const rootStaleRecords = records
			.map(staleRecordFor)
			.filter((record): record is ActiveRunLockStaleRecord => record !== null);
		const staleRecordIds = new Set(rootStaleRecords.map((stale) => stale.runId));
		const liveRecords = records.filter((record) => !staleRecordIds.has(record.run_id));
		conflicts.push(...findConflicts(intentName, effectsForScope(effects, scopeRoot.scope), liveRecords));
		staleRecords.push(...rootStaleRecords);
	}

	return {
		conflicts,
		staleRecords: dedupeStaleRecords(staleRecords),
	};
}

export function listActiveRunLocks(projectRoot: string): ActiveRunLockState {
	const records = listAvailableActiveRunLockScopeRoots(projectRoot)
		.flatMap((scopeRoot) => rootRecords(scopeRoot));
	const staleRecords = dedupeStaleRecords(
		records.map(staleRecordFor).filter((record): record is ActiveRunLockStaleRecord => record !== null),
	);
	const staleRecordIds = new Set(staleRecords.map((stale) => stale.runId));
	const activeRecords = mergeRecords(records.filter((record) => !staleRecordIds.has(record.run_id)));

	return {
		records: mergeRecords(records),
		activeRecords,
		staleRecords,
	};
}

export function acquireActiveRunLock(
	projectRoot: string,
	contract: CommandContract,
	intentName: string,
	options: {
		readonly commandHash?: string | null;
		readonly ignoreRunId?: string | null;
		readonly ignorePid?: number | null;
	} = {},
): ActiveRunLockAcquireResult {
	const effects = normalizeCommandEffects(projectRoot, contract, intentName);
	const identity = createIdentity(projectRoot, options.commandHash ?? null);
	if (effects.length === 0) {
		const emptyRecord = createRecord(identity, intentName, []);
		return {
			ok: true,
			handle: {
				record: emptyRecord,
				records: [],
				recoveredStaleRecords: [],
				release() {
					// No declared effects means no active lock record was written.
				},
			},
		};
	}

	const scopeRoots = resolveActiveRunLockScopeRoots(projectRoot, uniqueEffectScopes(effects));
	for (const scopeRoot of scopeRoots) {
		mkdirSync(activeLockDirectory(scopeRoot.root), { recursive: true, mode: 0o700 });
	}
	const releases: Array<() => void> = [];

	try {
		for (const scopeRoot of scopeRoots) {
			releases.push(acquireMutex(scopeRoot.root));
		}

		const recoveredStaleRecords: ActiveRunLockStaleRecord[] = [];
		const conflicts: ActiveRunLockConflict[] = [];

		for (const scopeRoot of scopeRoots) {
			const scopeEffects = effectsForScope(effects, scopeRoot.scope);
			const records = rootRecords(scopeRoot, {
				failClosedOnUnreadable: scopeEffects.some(
					(effect) => effect.access === 'write' || effect.concurrency === 'exclusive',
				),
			});
			const staleRecords = records
				.map(staleRecordFor)
				.filter((record): record is ActiveRunLockStaleRecord => record !== null);
			for (const stale of staleRecords) {
				const staleRecord = records.find((record) => record.run_id === stale.runId);
				if (staleRecord) {
					removeRecord(scopeRoot.root, staleRecord);
				}
			}

			const staleRecordIds = new Set(staleRecords.map((stale) => stale.runId));
			const liveRecords = records.filter((record) => {
				if (staleRecordIds.has(record.run_id)) {
					return false;
				}

				return record.run_id !== options.ignoreRunId || record.pid !== options.ignorePid;
			});
			conflicts.push(...findConflicts(intentName, scopeEffects, liveRecords));
			recoveredStaleRecords.push(...staleRecords);
		}

		const uniqueRecoveredStaleRecords = dedupeStaleRecords(recoveredStaleRecords);
		if (conflicts.length > 0) {
			return {
				ok: false,
				conflicts,
				recoveredStaleRecords: uniqueRecoveredStaleRecords,
			};
		}

		const scopedRecords: ScopedLockRecord[] = scopeRoots.map((scopeRoot) => {
			const record = createRecord(identity, intentName, effectsForScope(effects, scopeRoot.scope));
			return {
				scopeRoot,
				record,
				recordPath: activeLockRecordPath(scopeRoot.root, record.run_id),
			};
		});
		const writtenRecords: ScopedLockRecord[] = [];
		try {
			for (const scopedRecord of scopedRecords) {
				writeJsonFileInsideWithoutSymlinks(
					activeLockDirectory(scopedRecord.scopeRoot.root),
					scopedRecord.recordPath,
					scopedRecord.record,
				);
				writtenRecords.push(scopedRecord);
			}
		} catch (error) {
			for (const writtenRecord of writtenRecords) {
				rmSync(writtenRecord.recordPath, { force: true });
			}
			throw error;
		}

		const logicalRecord = createRecord(identity, intentName, effects);
		let released = false;
		return {
			ok: true,
			handle: {
				record: logicalRecord,
				records: scopedRecords.map((entry) => entry.record),
				recoveredStaleRecords: uniqueRecoveredStaleRecords,
				release() {
					if (released) {
						return;
					}
					released = true;
					for (const scopedRecord of scopedRecords) {
						try {
							const currentRecord = parseRecord(JSON.parse(readUtf8FileInsideWithoutSymlinks(
								activeLockDirectory(scopedRecord.scopeRoot.root),
								scopedRecord.recordPath,
								{ maxBytes: ACTIVE_LOCK_RECORD_MAX_BYTES },
							)));
							if (
								currentRecord?.run_id === scopedRecord.record.run_id &&
								currentRecord.owner_token === scopedRecord.record.owner_token
							) {
								rmSync(scopedRecord.recordPath, { force: true });
							}
						} catch {
							// Missing, malformed, or replaced records are no longer owned by this handle.
						}
					}
				},
			},
		};
	} finally {
		releaseMutexes(releases);
	}
}
