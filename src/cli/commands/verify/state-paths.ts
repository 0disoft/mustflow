import path from 'node:path';

import { createStateRunId } from '../../../core/atomic-state-write.js';

const RUN_STATE_DIR = path.join('.mustflow', 'state', 'runs');
const LATEST_RUN_RECEIPT_PATH = path.join(RUN_STATE_DIR, 'latest.json');

export interface VerifyRunStatePaths {
	readonly runDir: string;
	readonly manifestPath: string;
	readonly absoluteRunDir: string;
	readonly absoluteIntentDir: string;
	readonly absoluteManifestPath: string;
}

export interface VerifyIntentReceiptPath {
	readonly receiptPath: string;
	readonly absoluteReceiptPath: string;
}

export function createVerifyRunStatePaths(projectRoot: string): VerifyRunStatePaths {
	const runDir = toPosixPath(path.join(RUN_STATE_DIR, createStateRunId('verify')));
	const manifestPath = toPosixPath(path.join(runDir, 'manifest.json'));
	const absoluteRunDir = path.join(projectRoot, runDir);

	return {
		runDir,
		manifestPath,
		absoluteRunDir,
		absoluteIntentDir: path.join(absoluteRunDir, 'intents'),
		absoluteManifestPath: path.join(projectRoot, manifestPath),
	};
}

export function createVerifyIntentReceiptPath(
	statePaths: VerifyRunStatePaths,
	ordinal: number,
	intent: string,
): VerifyIntentReceiptPath {
	const fileName = `${String(ordinal).padStart(3, '0')}-${sanitizeIntentFilePart(intent)}.json`;
	return {
		receiptPath: toPosixPath(path.join(statePaths.runDir, 'intents', fileName)),
		absoluteReceiptPath: path.join(statePaths.absoluteIntentDir, fileName),
	};
}

export function resolveLatestVerifyRunReceiptPath(projectRoot: string): string {
	return path.join(projectRoot, LATEST_RUN_RECEIPT_PATH);
}

function toPosixPath(value: string): string {
	return value.split(path.sep).join('/');
}

function sanitizeIntentFilePart(value: string): string {
	const sanitized = value.replace(/[^A-Za-z0-9._-]+/g, '_').replace(/^_+|_+$/g, '');
	return sanitized.length > 0 ? sanitized.slice(0, 80) : 'intent';
}
