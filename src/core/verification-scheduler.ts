import {
	commandEffectsConflict,
	normalizeCommandEffects,
	type NormalizedCommandEffect,
} from './command-effects.js';
import type { CommandContract } from './config-loading.js';
import type { VerificationCandidate } from './verification-plan.js';

export interface VerificationScheduleEffect {
	readonly intent: string;
	readonly source: NormalizedCommandEffect['source'];
	readonly access: NormalizedCommandEffect['access'];
	readonly mode: NormalizedCommandEffect['mode'];
	readonly path: string;
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
	readonly effects: readonly VerificationScheduleEffect[];
	readonly locks: readonly string[];
	readonly conflicts: readonly VerificationScheduleConflict[];
}

export interface VerificationScheduleBatch {
	readonly index: number;
	readonly intents: readonly string[];
	readonly locks: readonly string[];
}

export interface VerificationSchedule {
	readonly runner: 'serial_mf_run_receipts';
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
		const hasConflict = existingEntries.some((existing) => entriesConflict(entry, existing).length > 0);

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
	const runnableIntents = uniqueSorted(
		candidates
			.filter((candidate) => candidate.status === 'runnable' && candidate.intent.length > 0)
			.map((candidate) => candidate.intent),
	);
	const baseEntries = runnableIntents.map((intent) => {
		const effects = normalizeCommandEffects(projectRoot, commandContract, intent).map(toScheduleEffect);
		return {
			intent,
			status: 'runnable' as const,
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
		batches,
		entries,
		notes: [
			'Batches explain resource compatibility for planning only.',
			'mf run still writes the latest receipt to a single path, so execute copied commands serially.',
		],
	};
}
