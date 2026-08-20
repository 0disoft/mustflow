import { existsSync } from 'node:fs';
import path from 'node:path';

import type { RunReceipt } from './run-receipt.js';
import {
	RUN_STATE_MUTEX_SCOPES,
	withRunStateUpdateMutex,
} from './run-state-mutex.js';
import {
	readUtf8FileInsideWithoutSymlinks,
	writeJsonFileInsideWithoutSymlinks,
} from './safe-filesystem.js';

const RUN_RECEIPT_DIR = path.join('.mustflow', 'state', 'runs');
const LATEST_RUN_RECEIPT = 'latest.json';
const LATEST_RUN_RECEIPT_POINTER = 'latest.pointer.json';
const RUN_RECEIPT_POINTER_SCHEMA_VERSION = '1';
const RUN_RECEIPT_MAX_BYTES = 4 * 1024 * 1024;

export interface RunReceiptPointer {
	readonly schema_version: typeof RUN_RECEIPT_POINTER_SCHEMA_VERSION;
	readonly kind: 'run_receipt_pointer';
	readonly command: 'run';
	readonly receipt_path: string;
	readonly finished_at: string;
	readonly correlation_id: string;
	readonly intent: string;
}

function receiptDirectory(projectRoot: string): string {
	return path.join(projectRoot, RUN_RECEIPT_DIR);
}

export function latestRunReceiptPointerPath(projectRoot: string): string {
	return path.join(receiptDirectory(projectRoot), LATEST_RUN_RECEIPT_POINTER);
}

function latestRunReceiptPath(projectRoot: string): string {
	return path.join(receiptDirectory(projectRoot), LATEST_RUN_RECEIPT);
}

function resolveReceiptPath(projectRoot: string, receiptPath: string): string | null {
	if (path.isAbsolute(receiptPath)) {
		return null;
	}

	const runsDir = receiptDirectory(projectRoot);
	const resolved = path.resolve(projectRoot, receiptPath);
	const relative = path.relative(runsDir, resolved);
	if (relative.startsWith('..') || path.isAbsolute(relative)) {
		return null;
	}

	return resolved;
}

function isRunReceiptPointer(value: unknown): value is RunReceiptPointer {
	if (!value || typeof value !== 'object' || Array.isArray(value)) {
		return false;
	}

	const pointer = value as Record<string, unknown>;
	return (
		pointer.schema_version === RUN_RECEIPT_POINTER_SCHEMA_VERSION &&
		pointer.kind === 'run_receipt_pointer' &&
		pointer.command === 'run' &&
		typeof pointer.receipt_path === 'string' &&
		typeof pointer.finished_at === 'string' &&
		typeof pointer.correlation_id === 'string' &&
		typeof pointer.intent === 'string'
	);
}

function pointerFromReceipt(receipt: RunReceipt): RunReceiptPointer {
	return {
		schema_version: RUN_RECEIPT_POINTER_SCHEMA_VERSION,
		kind: 'run_receipt_pointer',
		command: 'run',
		receipt_path: receipt.receipt_path,
		finished_at: receipt.finished_at,
		correlation_id: receipt.correlation_id,
		intent: receipt.intent,
	};
}

function readPointer(projectRoot: string): RunReceiptPointer | null {
	const pointerPath = latestRunReceiptPointerPath(projectRoot);
	if (!existsSync(pointerPath)) {
		return null;
	}

	try {
		const parsed = JSON.parse(
			readUtf8FileInsideWithoutSymlinks(projectRoot, pointerPath, {
				maxBytes: 64 * 1024,
			}),
		);
		if (!isRunReceiptPointer(parsed)) {
			return null;
		}

		const targetPath = resolveReceiptPath(projectRoot, parsed.receipt_path);
		return targetPath && existsSync(targetPath) ? parsed : null;
	} catch {
		return null;
	}
}

function readLatestRunReceiptPointer(projectRoot: string): RunReceiptPointer | null {
	const latestPath = latestRunReceiptPath(projectRoot);
	if (!existsSync(latestPath)) {
		return null;
	}

	try {
		const parsed = JSON.parse(
			readUtf8FileInsideWithoutSymlinks(projectRoot, latestPath, {
				maxBytes: RUN_RECEIPT_MAX_BYTES,
			}),
		) as Partial<RunReceipt>;
		if (
			parsed.command !== 'run' ||
			typeof parsed.receipt_path !== 'string' ||
			typeof parsed.finished_at !== 'string' ||
			typeof parsed.correlation_id !== 'string' ||
			typeof parsed.intent !== 'string'
		) {
			return null;
		}

		const targetPath = resolveReceiptPath(projectRoot, parsed.receipt_path);
		if (!targetPath || !existsSync(targetPath)) {
			return null;
		}

		return {
			schema_version: RUN_RECEIPT_POINTER_SCHEMA_VERSION,
			kind: 'run_receipt_pointer',
			command: 'run',
			receipt_path: parsed.receipt_path,
			finished_at: parsed.finished_at,
			correlation_id: parsed.correlation_id,
			intent: parsed.intent,
		};
	} catch {
		return null;
	}
}

function comparePointers(left: RunReceiptPointer, right: RunReceiptPointer): number {
	const byFinishedAt = left.finished_at.localeCompare(right.finished_at);
	if (byFinishedAt !== 0) {
		return byFinishedAt;
	}

	return left.receipt_path.localeCompare(right.receipt_path);
}

function currentRunReceiptPointer(projectRoot: string): RunReceiptPointer | null {
	const candidates = [readPointer(projectRoot), readLatestRunReceiptPointer(projectRoot)]
		.filter((candidate): candidate is RunReceiptPointer => candidate !== null)
		.sort(comparePointers);

	return candidates.at(-1) ?? null;
}

export function writeImmutableRunReceipt(
	projectRoot: string,
	receiptPath: string,
	receipt: RunReceipt,
): void {
	const serialized = `${JSON.stringify(receipt, null, 2)}\n`;
	if (existsSync(receiptPath)) {
		const existing = readUtf8FileInsideWithoutSymlinks(projectRoot, receiptPath, {
			maxBytes: RUN_RECEIPT_MAX_BYTES,
		});
		if (existing === serialized) {
			return;
		}

		throw new Error(`run_receipt_immutable_conflict:${receipt.receipt_path}`);
	}

	writeJsonFileInsideWithoutSymlinks(projectRoot, receiptPath, receipt);
}

export function publishLatestRunReceipt(
	projectRoot: string,
	receipt: RunReceipt,
): boolean {
	const candidate = pointerFromReceipt(receipt);
	return withRunStateUpdateMutex(projectRoot, RUN_STATE_MUTEX_SCOPES.receipts, () => {
		const current = currentRunReceiptPointer(projectRoot);
		if (current && comparePointers(candidate, current) < 0) {
			return false;
		}

		// The pointer is the small authoritative publication. latest.json remains as a
		// compatibility mirror for existing readers and can be removed in a future major.
		writeJsonFileInsideWithoutSymlinks(
			projectRoot,
			latestRunReceiptPointerPath(projectRoot),
			candidate,
		);
		writeJsonFileInsideWithoutSymlinks(
			projectRoot,
			latestRunReceiptPath(projectRoot),
			receipt,
		);
		return true;
	});
}
