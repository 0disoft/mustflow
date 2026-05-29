import { createHash } from 'node:crypto';
import {
	existsSync,
	mkdirSync,
	readFileSync,
	readdirSync,
	rmSync,
	writeFileSync,
} from 'node:fs';
import path from 'node:path';

import {
	commandEffectsConflict,
	normalizeCommandEffects,
	type NormalizedCommandEffect,
} from './command-effects.js';
import type { CommandContract } from './config-loading.js';

const ACTIVE_LOCK_SCHEMA_VERSION = '1';
const ACTIVE_LOCK_KIND = 'active_run_lock';
const LOCK_ROOT_RELATIVE_PATH = '.mustflow/state/locks';
const LOCK_MUTEX_STALE_MS = 30_000;
const LOCK_MUTEX_WAIT_MS = 1_000;
const LOCK_MUTEX_SLEEP_MS = 25;
const LOCK_MUTEX_SLEEP_BUFFER = new Int32Array(new SharedArrayBuffer(4));

export interface ActiveRunLockEffect {
	readonly source: string;
	readonly access: string;
	readonly mode: string;
	readonly path: string | null;
	readonly lock: string;
	readonly concurrency: string;
}

export interface ActiveRunLockRecord {
	readonly schema_version: typeof ACTIVE_LOCK_SCHEMA_VERSION;
	readonly kind: typeof ACTIVE_LOCK_KIND;
	readonly run_id: string;
	readonly intent: string;
	readonly pid: number;
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

export interface ActiveRunLockHandle {
	readonly record: ActiveRunLockRecord;
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

function sleep(milliseconds: number): void {
	Atomics.wait(LOCK_MUTEX_SLEEP_BUFFER, 0, 0, milliseconds);
}

function sha256(value: string): string {
	return createHash('sha256').update(value).digest('hex');
}

function activeLockRoot(projectRoot: string): string {
	return path.join(projectRoot, ...LOCK_ROOT_RELATIVE_PATH.split('/'));
}

function activeLockDirectory(projectRoot: string): string {
	return path.join(activeLockRoot(projectRoot), 'active');
}

function activeLockMutexDirectory(projectRoot: string): string {
	return path.join(activeLockRoot(projectRoot), 'mutex');
}

function normalizeEffect(effect: NormalizedCommandEffect): ActiveRunLockEffect {
	return {
		source: effect.source,
		access: effect.access,
		mode: effect.mode,
		path: effect.path,
		lock: effect.lock,
		concurrency: effect.concurrency,
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
	}));
}

function activeLockRecordPath(projectRoot: string, runId: string): string {
	return path.join(activeLockDirectory(projectRoot), `${sha256(runId)}.json`);
}

function parseRecord(value: unknown): ActiveRunLockRecord | null {
	if (!value || typeof value !== 'object' || Array.isArray(value)) {
		return null;
	}

	const record = value as Record<string, unknown>;
	if (
		record.schema_version !== ACTIVE_LOCK_SCHEMA_VERSION ||
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

	const effects = record.effects.filter((effect): effect is ActiveRunLockEffect => {
		if (!effect || typeof effect !== 'object' || Array.isArray(effect)) {
			return false;
		}

		const candidate = effect as Record<string, unknown>;
		return (
			typeof candidate.source === 'string' &&
			typeof candidate.access === 'string' &&
			typeof candidate.mode === 'string' &&
			(typeof candidate.path === 'string' || candidate.path === null) &&
			typeof candidate.lock === 'string' &&
			typeof candidate.concurrency === 'string'
		);
	});
	const writes = record.writes.filter((write): write is string => typeof write === 'string');

	if (effects.length !== record.effects.length || writes.length !== record.writes.length) {
		return null;
	}

	return {
		schema_version: ACTIVE_LOCK_SCHEMA_VERSION,
		kind: ACTIVE_LOCK_KIND,
		run_id: record.run_id,
		intent: record.intent,
		pid: Number(record.pid),
		started_at: record.started_at,
		root_hash: record.root_hash,
		command_hash: record.command_hash,
		effects,
		writes,
	};
}

function readActiveRecords(projectRoot: string): readonly ActiveRunLockRecord[] {
	const directory = activeLockDirectory(projectRoot);
	if (!existsSync(directory)) {
		return [];
	}

	const records: ActiveRunLockRecord[] = [];
	for (const name of readdirSync(directory).filter((entry) => entry.endsWith('.json')).sort()) {
		try {
			const record = parseRecord(JSON.parse(readFileSync(path.join(directory, name), 'utf8')));
			if (record) {
				records.push(record);
			}
		} catch {
			// Unreadable lock records are ignored until a later cleanup can inspect them safely.
		}
	}

	return records;
}

function staleRecordFor(record: ActiveRunLockRecord): ActiveRunLockStaleRecord | null {
	if (isProcessLive(record.pid)) {
		return null;
	}

	return {
		runId: record.run_id,
		intent: record.intent,
		pid: record.pid,
		reason: 'process_not_live',
	};
}

function removeRecord(projectRoot: string, record: ActiveRunLockRecord): void {
	rmSync(activeLockRecordPath(projectRoot, record.run_id), { force: true });
}

function conflictDetail(current: NormalizedCommandEffect, active: NormalizedCommandEffect): string {
	return `lock "${current.lock}" conflicts with active intent "${active.intent}"`;
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

function createRecord(
	projectRoot: string,
	intentName: string,
	effects: readonly NormalizedCommandEffect[],
	commandHash: string | null,
): ActiveRunLockRecord {
	const startedAt = new Date().toISOString();
	const writes = effects
		.filter((effect) => effect.access === 'write' && effect.path !== null)
		.map((effect) => effect.path as string)
		.sort((left, right) => left.localeCompare(right));
	const runId = `${process.pid}:${startedAt}:${intentName}:${sha256(JSON.stringify(effects))}`;

	return {
		schema_version: ACTIVE_LOCK_SCHEMA_VERSION,
		kind: ACTIVE_LOCK_KIND,
		run_id: runId,
		intent: intentName,
		pid: process.pid,
		started_at: startedAt,
		root_hash: sha256(path.resolve(projectRoot)),
		command_hash: commandHash,
		effects: effects.map(normalizeEffect),
		writes: [...new Set(writes)],
	};
}

function acquireMutex(projectRoot: string): () => void {
	const root = activeLockRoot(projectRoot);
	const mutex = activeLockMutexDirectory(projectRoot);
	const ownerPath = path.join(mutex, 'owner.json');
	const ownerToken = sha256(`${process.pid}:${Date.now()}:${process.hrtime.bigint()}`);
	mkdirSync(root, { recursive: true });
	let startedAt = Date.now();

	while (true) {
		try {
			mkdirSync(mutex);
			const ownerRecord = { pid: process.pid, started_at: new Date().toISOString(), token: ownerToken };
			writeFileSync(ownerPath, JSON.stringify(ownerRecord, null, 2));
			return () => {
				try {
					const owner = JSON.parse(readFileSync(ownerPath, 'utf8')) as { pid?: unknown; token?: unknown };
					if (Number(owner.pid) === ownerRecord.pid && owner.token === ownerRecord.token) {
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

			if (Date.now() - startedAt > LOCK_MUTEX_WAIT_MS) {
				try {
					const owner = JSON.parse(readFileSync(ownerPath, 'utf8')) as { pid?: unknown; started_at?: unknown };
					const ownerPid = Number(owner.pid);
					const ownerStartedAt = typeof owner.started_at === 'string' ? Date.parse(owner.started_at) : Number.NaN;
					const staleByAge = Number.isFinite(ownerStartedAt) && Date.now() - ownerStartedAt > LOCK_MUTEX_STALE_MS;
					if (!isProcessLive(ownerPid) || staleByAge) {
						rmSync(mutex, { recursive: true, force: true });
						startedAt = Date.now();
						continue;
					}
				} catch {
					rmSync(mutex, { recursive: true, force: true });
					startedAt = Date.now();
					continue;
				}

				throw new Error('active_run_lock_mutex_busy');
			}

			sleep(LOCK_MUTEX_SLEEP_MS);
		}
	}
}

export function inspectActiveRunLocks(
	projectRoot: string,
	contract: CommandContract,
	intentName: string,
): ActiveRunLockInspection {
	const effects = normalizeCommandEffects(projectRoot, contract, intentName);
	const records = readActiveRecords(projectRoot);
	const staleRecords = records.map(staleRecordFor).filter((record): record is ActiveRunLockStaleRecord => record !== null);
	const liveRecords = records.filter((record) => !staleRecords.some((stale) => stale.runId === record.run_id));

	return {
		conflicts: findConflicts(intentName, effects, liveRecords),
		staleRecords,
	};
}

export function acquireActiveRunLock(
	projectRoot: string,
	contract: CommandContract,
	intentName: string,
	options: { readonly commandHash?: string | null } = {},
): ActiveRunLockAcquireResult {
	const effects = normalizeCommandEffects(projectRoot, contract, intentName);
	if (effects.length === 0) {
		const emptyRecord = createRecord(projectRoot, intentName, [], options.commandHash ?? null);
		return {
			ok: true,
			handle: {
				record: emptyRecord,
				recoveredStaleRecords: [],
				release() {
					// No declared effects means no active lock record was written.
				},
			},
		};
	}

	mkdirSync(activeLockDirectory(projectRoot), { recursive: true });
	const releaseMutex = acquireMutex(projectRoot);

	try {
		const records = readActiveRecords(projectRoot);
		const staleRecords = records.map(staleRecordFor).filter((record): record is ActiveRunLockStaleRecord => record !== null);
		for (const stale of staleRecords) {
			const staleRecord = records.find((record) => record.run_id === stale.runId);
			if (staleRecord) {
				removeRecord(projectRoot, staleRecord);
			}
		}

		const liveRecords = records.filter((record) => !staleRecords.some((stale) => stale.runId === record.run_id));
		const conflicts = findConflicts(intentName, effects, liveRecords);
		if (conflicts.length > 0) {
			return { ok: false, conflicts, recoveredStaleRecords: staleRecords };
		}

		const record = createRecord(projectRoot, intentName, effects, options.commandHash ?? null);
		const recordPath = activeLockRecordPath(projectRoot, record.run_id);
		writeFileSync(recordPath, JSON.stringify(record, null, 2));
		let released = false;

		return {
			ok: true,
			handle: {
				record,
				recoveredStaleRecords: staleRecords,
				release() {
					if (released) {
						return;
					}
					released = true;
					rmSync(recordPath, { force: true });
				},
			},
		};
	} finally {
		releaseMutex();
	}
}
