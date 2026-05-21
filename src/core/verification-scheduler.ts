import path from 'node:path';

import {
	commandEffectsConflict,
	normalizeCommandEffects,
	type NormalizedCommandEffect,
} from './command-effects.js';
import type { CommandContract } from './config-loading.js';
import { readUtf8FileInsideWithoutSymlinks } from './safe-filesystem.js';
import type { VerificationCandidate } from './verification-plan.js';

const MUSTFLOW_JSON_MAX_BYTES = 1024 * 1024;

export interface VerificationScheduleEffect {
	readonly intent: string;
	readonly source: NormalizedCommandEffect['source'];
	readonly access: NormalizedCommandEffect['access'];
	readonly mode: NormalizedCommandEffect['mode'];
	readonly path: NormalizedCommandEffect['path'];
	readonly lock: string;
	readonly concurrency: NormalizedCommandEffect['concurrency'];
}

export interface VerificationScheduleConflict {
	readonly intent: string;
	readonly conflictsWith: string;
	readonly lock: string;
	readonly detail: string;
}

export interface VerificationScheduleEntry {
	readonly intent: string;
	readonly status: 'runnable';
	readonly parallelEligible: boolean;
	readonly parallelReason: 'explicit_effects' | 'missing_explicit_effects' | 'undeclared_write_drift';
	readonly effects: readonly VerificationScheduleEffect[];
	readonly locks: readonly string[];
	readonly conflicts: readonly VerificationScheduleConflict[];
}

export interface VerificationScheduleBatch {
	readonly index: number;
	readonly intents: readonly string[];
	readonly locks: readonly string[];
}

export interface VerificationScheduleFailurePolicy {
	readonly mode: 'batch_boundary';
	readonly startedBatch: 'wait_for_completion';
	readonly nextBatch: 'stop_on_failure';
}

export interface VerificationSchedule {
	readonly runner: 'serial_mf_run_receipts';
	readonly failurePolicy: VerificationScheduleFailurePolicy;
	readonly batches: readonly VerificationScheduleBatch[];
	readonly entries: readonly VerificationScheduleEntry[];
	readonly notes: readonly string[];
}

function uniqueSorted(values: Iterable<string>): string[] {
	return [...new Set(values)].sort((left, right) => left.localeCompare(right));
}

function toScheduleEffect(effect: NormalizedCommandEffect): VerificationScheduleEffect {
	return {
		intent: effect.intent,
		source: effect.source,
		access: effect.access,
		mode: effect.mode,
		path: effect.path,
		lock: effect.lock,
		concurrency: effect.concurrency,
	};
}

function isObject(value: unknown): value is Record<string, unknown> {
	return !!value && typeof value === 'object';
}

function readJsonFile(projectRoot: string, filePath: string): unknown {
	try {
		return JSON.parse(readUtf8FileInsideWithoutSymlinks(projectRoot, filePath, { maxBytes: MUSTFLOW_JSON_MAX_BYTES }));
	} catch {
		return null;
	}
}

function getUndeclaredWriteIntent(value: unknown): string | null {
	if (!isObject(value) || typeof value.intent !== 'string') {
		return null;
	}

	const writeDrift = value.write_drift;
	if (!isObject(writeDrift) || writeDrift.has_undeclared_changes !== true) {
		return null;
	}

	return value.intent;
}

function resolveStateRelativePath(projectRoot: string, relativePath: unknown): string | null {
	if (typeof relativePath !== 'string' || relativePath.length === 0 || path.isAbsolute(relativePath)) {
		return null;
	}

	const normalized = relativePath.replaceAll('\\', '/');
	if (!normalized.startsWith('.mustflow/state/runs/')) {
		return null;
	}

	const resolved = path.resolve(projectRoot, normalized);
	const relative = path.relative(projectRoot, resolved);
	if (relative.startsWith('..') || path.isAbsolute(relative)) {
		return null;
	}

	return resolved;
}

function readVerifyManifestUndeclaredWriteIntents(projectRoot: string, latest: Record<string, unknown>): ReadonlySet<string> {
	const manifestPath = resolveStateRelativePath(projectRoot, latest.manifest_path);
	if (!manifestPath) {
		return new Set();
	}

	const manifest = readJsonFile(projectRoot, manifestPath);
	if (!isObject(manifest) || manifest.command !== 'verify' || !Array.isArray(manifest.receipts)) {
		return new Set();
	}

	const intents = new Set<string>();
	for (const entry of manifest.receipts) {
		if (!isObject(entry)) {
			continue;
		}

		const receiptPath = resolveStateRelativePath(projectRoot, entry.receipt_path);
		if (!receiptPath) {
			continue;
		}

		const intent = getUndeclaredWriteIntent(readJsonFile(projectRoot, receiptPath));
		if (intent) {
			intents.add(intent);
		}
	}

	return intents;
}

function readLatestUndeclaredWriteIntents(projectRoot: string): ReadonlySet<string> {
	const latestPath = path.join(projectRoot, '.mustflow', 'state', 'runs', 'latest.json');
	const parsed = readJsonFile(projectRoot, latestPath);
	const directIntent = getUndeclaredWriteIntent(parsed);

	if (directIntent) {
		return new Set([directIntent]);
	}

	if (!isObject(parsed) || parsed.command !== 'verify') {
		return new Set();
	}

	return readVerifyManifestUndeclaredWriteIntents(projectRoot, parsed);
}

function entriesConflict(left: VerificationScheduleEntry, right: VerificationScheduleEntry): VerificationScheduleConflict[] {
	const conflicts: VerificationScheduleConflict[] = [];

	for (const leftEffect of left.effects) {
		for (const rightEffect of right.effects) {
			if (!commandEffectsConflict(leftEffect, rightEffect)) {
				continue;
			}

			conflicts.push({
				intent: left.intent,
				conflictsWith: right.intent,
				lock: leftEffect.lock,
				detail: `${left.intent} and ${right.intent} both touch ${leftEffect.lock}; run them serially.`,
			});
		}
	}

	return conflicts;
}

function addEntryToBatches(
	batches: VerificationScheduleBatch[],
	batchEntries: VerificationScheduleEntry[][],
	entry: VerificationScheduleEntry,
): void {
	for (let batchIndex = 0; batchIndex < batchEntries.length; batchIndex += 1) {
		const existingEntries = batchEntries[batchIndex] ?? [];
		const hasConflict =
			!entry.parallelEligible ||
			existingEntries.some((existing) => !existing.parallelEligible || entriesConflict(entry, existing).length > 0);

		if (hasConflict) {
			continue;
		}

		existingEntries.push(entry);
		batchEntries[batchIndex] = existingEntries;
		batches[batchIndex] = {
			index: batchIndex + 1,
			intents: uniqueSorted(existingEntries.map((item) => item.intent)),
			locks: uniqueSorted(existingEntries.flatMap((item) => item.locks)),
		};
		return;
	}

	const index = batches.length + 1;
	batchEntries.push([entry]);
	batches.push({
		index,
		intents: [entry.intent],
		locks: entry.locks,
	});
}

export function createVerificationSchedule(
	projectRoot: string,
	commandContract: CommandContract,
	candidates: readonly VerificationCandidate[],
): VerificationSchedule {
	const latestUndeclaredWriteIntents = readLatestUndeclaredWriteIntents(projectRoot);
	const runnableIntents = uniqueSorted(
		candidates
			.filter((candidate) => candidate.status === 'runnable' && candidate.intent.length > 0)
			.map((candidate) => candidate.intent),
	);
	const baseEntries = runnableIntents.map((intent) => {
		const effects = normalizeCommandEffects(projectRoot, commandContract, intent).map(toScheduleEffect);
		const hasExplicitEffects = effects.length > 0 && effects.every((effect) => effect.source === 'effects');
		const hasUndeclaredWriteDrift = latestUndeclaredWriteIntents.has(intent);
		const parallelEligible = hasExplicitEffects && !hasUndeclaredWriteDrift;
		return {
			intent,
			status: 'runnable' as const,
			parallelEligible,
			parallelReason: hasUndeclaredWriteDrift
				? ('undeclared_write_drift' as const)
				: hasExplicitEffects
					? ('explicit_effects' as const)
					: ('missing_explicit_effects' as const),
			effects,
			locks: uniqueSorted(effects.map((effect) => effect.lock)),
			conflicts: [] as VerificationScheduleConflict[],
		};
	});
	const entries = baseEntries.map((entry) => ({
		...entry,
		conflicts: baseEntries
			.filter((other) => other.intent !== entry.intent)
			.flatMap((other) => entriesConflict(entry, other))
			.sort((left, right) => left.conflictsWith.localeCompare(right.conflictsWith) || left.lock.localeCompare(right.lock)),
	}));
	const batches: VerificationScheduleBatch[] = [];
	const batchEntries: VerificationScheduleEntry[][] = [];

	for (const entry of entries) {
		addEntryToBatches(batches, batchEntries, entry);
	}

	return {
		runner: 'serial_mf_run_receipts',
		failurePolicy: {
			mode: 'batch_boundary',
			startedBatch: 'wait_for_completion',
			nextBatch: 'stop_on_failure',
		},
		batches,
		entries,
		notes: [
			'Batches explain resource compatibility for planning only.',
			'Only entries backed by explicit effects are marked parallel eligible; writes fallback remains serial-only.',
			...uniqueSorted(latestUndeclaredWriteIntents).map(
				(intent) => `Latest receipt for ${intent} reported undeclared writes; it is not parallel eligible.`,
			),
			'If a future parallel batch has already started, let it finish and stop before the next batch on failure.',
			'The runner names the default copied-command path; mf verify --parallel may execute eligible entries in bounded chunks and writes the latest run summary after each batch completes.',
		],
	};
}
