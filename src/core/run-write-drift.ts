import { normalizeCommandEffects } from './command-effects.js';
import type { CommandContract } from './config-loading.js';
import { parsePathScope, pathScopeContainsPath } from './path-scope.js';
import {
	captureRepositorySnapshot,
	normalizeRepositoryRelativePath,
	repositoryPathKey,
	type RepositorySnapshot,
	type RepositorySnapshotEnvironment,
	type RepositorySnapshotStatus,
} from './repository-snapshot.js';

const MAX_REPORTED_PATHS = 200;

export type RunWriteDriftStatus = RepositorySnapshotStatus;

export interface RunWriteDriftReceipt {
	readonly status: RunWriteDriftStatus;
	readonly coverage_complete: boolean;
	readonly declared_paths: readonly string[];
	readonly observed_paths: readonly string[];
	readonly declared_observed_paths: readonly string[];
	readonly undeclared_paths: readonly string[];
	readonly observed_count: number;
	readonly undeclared_count: number;
	readonly has_undeclared_changes: boolean;
	readonly truncated: boolean;
	readonly reason: string | null;
	readonly attribution_mode?: 'parallel_chunk';
	readonly chunk_intents?: readonly string[];
	readonly attributed_paths?: readonly string[];
	readonly ambiguous_paths?: readonly string[];
	readonly ambiguous_count?: number;
}

export interface RunWriteTracker {
	readonly projectRoot: string;
	readonly env: RepositorySnapshotEnvironment;
	readonly declaredPaths: readonly string[];
	readonly before: RepositorySnapshot;
}

export interface RunWriteBatchTracker {
	readonly projectRoot: string;
	readonly env: RepositorySnapshotEnvironment;
	readonly before: RepositorySnapshot;
}

export interface RunWriteBatchIntent {
	readonly intentName: string;
	readonly declaredPaths: readonly string[];
	readonly observedPaths: readonly string[];
}

export interface RunWriteTrackingOptions {
	readonly additionalDeclaredPaths?: readonly string[];
	readonly env: RepositorySnapshotEnvironment;
}

function listDeclaredWritePaths(projectRoot: string, contract: CommandContract, intentName: string): string[] {
	const paths = normalizeCommandEffects(projectRoot, contract, intentName)
		.filter((effect) => effect.access === 'write')
		.map((effect) => effect.path)
		.filter((effectPath): effectPath is string => typeof effectPath === 'string');

	return [...new Set(paths.map(normalizeRepositoryRelativePath))].sort((left, right) => left.localeCompare(right));
}

function listObservedChangedPaths(
	before: ReadonlyMap<string, string>,
	after: ReadonlyMap<string, string>,
): string[] {
	const paths = new Set([...before.keys(), ...after.keys()]);
	const changed: string[] = [];

	for (const filePath of paths) {
		if (before.get(filePath) !== after.get(filePath)) {
			changed.push(filePath);
		}
	}

	return changed.sort((left, right) => left.localeCompare(right));
}

function declaredPathCoversObservedPath(declaredPath: string, observedPath: string): boolean {
	return pathScopeContainsPath(parsePathScope(declaredPath), observedPath);
}

function truncatePaths(paths: readonly string[]): { readonly paths: readonly string[]; readonly truncated: boolean } {
	if (paths.length <= MAX_REPORTED_PATHS) {
		return { paths, truncated: false };
	}

	return { paths: paths.slice(0, MAX_REPORTED_PATHS), truncated: true };
}

function uniqueSortedPaths(paths: Iterable<string>): string[] {
	return [...new Set([...paths].map(normalizeRepositoryRelativePath))].sort((left, right) => left.localeCompare(right));
}

function pathsCoverObservedPath(declaredPaths: readonly string[], observedPath: string): boolean {
	return declaredPaths.some((declaredPath) => declaredPathCoversObservedPath(declaredPath, observedPath));
}

export function createUnavailableRunWriteDriftReceipt(
	declaredPaths: readonly string[],
	reason: string | null,
): RunWriteDriftReceipt {
	return {
		status: 'unavailable',
		coverage_complete: false,
		declared_paths: declaredPaths,
		observed_paths: [],
		declared_observed_paths: [],
		undeclared_paths: [],
		observed_count: 0,
		undeclared_count: 0,
		has_undeclared_changes: false,
		truncated: false,
		reason,
	};
}

export function startRunWriteTracking(
	projectRoot: string,
	contract: CommandContract,
	intentName: string,
	options: RunWriteTrackingOptions,
): RunWriteTracker {
	const declaredPaths = [
		...listDeclaredWritePaths(projectRoot, contract, intentName),
		...(options.additionalDeclaredPaths ?? []).map(normalizeRepositoryRelativePath),
	];

	return {
		projectRoot,
		env: options.env,
		declaredPaths: [...new Set(declaredPaths)].sort((left, right) => left.localeCompare(right)),
		before: captureRepositorySnapshot(projectRoot, { env: options.env }),
	};
}

export function startRunWriteBatchTracking(
	projectRoot: string,
	env: RepositorySnapshotEnvironment,
): RunWriteBatchTracker {
	return {
		projectRoot,
		env,
		before: captureRepositorySnapshot(projectRoot, { env }),
	};
}

export function finishRunWriteBatchTracking(
	tracker: RunWriteBatchTracker,
	intents: readonly RunWriteBatchIntent[],
): ReadonlyMap<string, RunWriteDriftReceipt> {
	const chunkIntents = intents.map((intent) => intent.intentName).sort((left, right) => left.localeCompare(right));
	const fallbackReceipts = new Map<string, RunWriteDriftReceipt>();

	for (const intent of intents) {
		fallbackReceipts.set(
			intent.intentName,
			createUnavailableRunWriteDriftReceipt(uniqueSortedPaths(intent.declaredPaths), tracker.before.reason),
		);
	}

	if (tracker.before.status === 'unavailable') {
		return fallbackReceipts;
	}

	const after = captureRepositorySnapshot(tracker.projectRoot, {
		env: tracker.env,
		previous: tracker.before,
	});
	if (after.status === 'unavailable') {
		return new Map(
			intents.map((intent) => [
				intent.intentName,
				createUnavailableRunWriteDriftReceipt(uniqueSortedPaths(intent.declaredPaths), after.reason),
			]),
		);
	}

	const observedPaths = listObservedChangedPaths(tracker.before.entries, after.entries);
	const declaredObservedByIntent = new Map<string, string[]>();
	const undeclaredByIntent = new Map<string, string[]>();
	const ambiguousByIntent = new Map<string, string[]>();

	for (const intent of intents) {
		declaredObservedByIntent.set(intent.intentName, []);
		undeclaredByIntent.set(intent.intentName, []);
		ambiguousByIntent.set(intent.intentName, []);
	}

	for (const observedPath of observedPaths) {
		const declaredOwners = intents.filter((intent) => pathsCoverObservedPath(intent.declaredPaths, observedPath));

		if (declaredOwners.length === 1) {
			declaredObservedByIntent.get(declaredOwners[0]?.intentName ?? '')?.push(observedPath);
			continue;
		}

		if (declaredOwners.length > 1) {
			for (const owner of declaredOwners) {
				ambiguousByIntent.get(owner.intentName)?.push(observedPath);
			}
			continue;
		}

		const observedWitnesses = intents.filter((intent) =>
			intent.observedPaths.some((intentObservedPath) => repositoryPathKey(intentObservedPath) === repositoryPathKey(observedPath)),
		);

		if (observedWitnesses.length === 1) {
			undeclaredByIntent.get(observedWitnesses[0]?.intentName ?? '')?.push(observedPath);
			continue;
		}

		const ambiguousTargets = observedWitnesses.length > 0 ? observedWitnesses : intents;
		for (const intent of ambiguousTargets) {
			ambiguousByIntent.get(intent.intentName)?.push(observedPath);
		}
	}

	const status: RunWriteDriftStatus = tracker.before.status === 'partial' || after.status === 'partial' ? 'partial' : 'checked';
	const reason = status === 'partial'
		? tracker.before.reason ?? after.reason ?? 'partial_snapshot'
		: null;
	const receipts = new Map<string, RunWriteDriftReceipt>();

	for (const intent of intents) {
		const declaredPaths = uniqueSortedPaths(intent.declaredPaths);
		const declaredObservedPaths = uniqueSortedPaths(declaredObservedByIntent.get(intent.intentName) ?? []);
		const undeclaredPaths = uniqueSortedPaths(undeclaredByIntent.get(intent.intentName) ?? []);
		const ambiguousPaths = uniqueSortedPaths(ambiguousByIntent.get(intent.intentName) ?? []);
		const intentObservedPaths = uniqueSortedPaths([...declaredObservedPaths, ...undeclaredPaths, ...ambiguousPaths]);
		const observed = truncatePaths(intentObservedPaths);
		const declaredObserved = truncatePaths(declaredObservedPaths);
		const undeclared = truncatePaths(undeclaredPaths);
		const ambiguous = truncatePaths(ambiguousPaths);

		receipts.set(intent.intentName, {
			status,
			coverage_complete: status === 'checked',
			declared_paths: declaredPaths,
			observed_paths: observed.paths,
			declared_observed_paths: declaredObserved.paths,
			undeclared_paths: undeclared.paths,
			observed_count: intentObservedPaths.length,
			undeclared_count: undeclaredPaths.length,
			has_undeclared_changes: undeclaredPaths.length > 0 || ambiguousPaths.length > 0,
			truncated: observed.truncated || declaredObserved.truncated || undeclared.truncated || ambiguous.truncated,
			reason,
			attribution_mode: 'parallel_chunk',
			chunk_intents: chunkIntents,
			attributed_paths: uniqueSortedPaths([...declaredObservedPaths, ...undeclaredPaths]),
			ambiguous_paths: ambiguous.paths,
			ambiguous_count: ambiguousPaths.length,
		});
	}

	return receipts;
}

export function finishRunWriteTracking(tracker: RunWriteTracker): RunWriteDriftReceipt {
	if (tracker.before.status === 'unavailable') {
		return createUnavailableRunWriteDriftReceipt(tracker.declaredPaths, tracker.before.reason);
	}

	const after = captureRepositorySnapshot(tracker.projectRoot, {
		env: tracker.env,
		previous: tracker.before,
	});
	if (after.status === 'unavailable') {
		return createUnavailableRunWriteDriftReceipt(tracker.declaredPaths, after.reason);
	}

	const observedPaths = listObservedChangedPaths(tracker.before.entries, after.entries);
	const declaredObservedPaths = observedPaths.filter((observedPath) =>
		tracker.declaredPaths.some((declaredPath) => declaredPathCoversObservedPath(declaredPath, observedPath)),
	);
	const undeclaredPaths = observedPaths.filter((observedPath) =>
		!tracker.declaredPaths.some((declaredPath) => declaredPathCoversObservedPath(declaredPath, observedPath)),
	);
	const observed = truncatePaths(observedPaths);
	const declaredObserved = truncatePaths(declaredObservedPaths);
	const undeclared = truncatePaths(undeclaredPaths);
	const status: RunWriteDriftStatus = tracker.before.status === 'partial' || after.status === 'partial' ? 'partial' : 'checked';
	const reason = status === 'partial'
		? tracker.before.reason ?? after.reason ?? 'partial_snapshot'
		: null;

	return {
		status,
		coverage_complete: status === 'checked',
		declared_paths: tracker.declaredPaths,
		observed_paths: observed.paths,
		declared_observed_paths: declaredObserved.paths,
		undeclared_paths: undeclared.paths,
		observed_count: observedPaths.length,
		undeclared_count: undeclaredPaths.length,
		has_undeclared_changes: undeclaredPaths.length > 0,
		truncated: observed.truncated || declaredObserved.truncated || undeclared.truncated,
		reason,
	};
}
