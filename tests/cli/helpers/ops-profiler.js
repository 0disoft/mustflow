import { appendFileSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import { performance } from 'node:perf_hooks';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(fileURLToPath(new URL('../../..', import.meta.url)));
const profileSetting = process.env.MUSTFLOW_TEST_PROFILE_OPS;
const runId =
	process.env.MUSTFLOW_TEST_PROFILE_RUN_ID ??
	`${new Date().toISOString().replace(/[:.]/gu, '-')}-${process.pid}`;

function profilePath() {
	if (!profileSetting) {
		return undefined;
	}

	if (profileSetting !== '1' && profileSetting !== 'true') {
		return path.resolve(profileSetting);
	}

	return path.join(repoRoot, '.mustflow', 'cache', 'test-ops', `${runId}.jsonl`);
}

function writeProfileRecord(record) {
	const target = profilePath();
	if (!target) {
		return;
	}

	mkdirSync(path.dirname(target), { recursive: true });
	appendFileSync(target, `${JSON.stringify(record)}\n`);
}

function recordOperation(operation, start, details, status, error) {
	writeProfileRecord({
		schema_version: 1,
		run_id: runId,
		pid: process.pid,
		operation,
		status,
		duration_ms: Math.round((performance.now() - start) * 1000) / 1000,
		details,
		error: error ? String(error.message ?? error) : null,
		timestamp: new Date().toISOString(),
	});
}

export function profileOperation(operation, details, fn) {
	const start = performance.now();
	try {
		const result = fn();
		recordOperation(operation, start, details, 'passed', null);
		return result;
	} catch (error) {
		recordOperation(operation, start, details, 'failed', error);
		throw error;
	}
}

export async function profileOperationAsync(operation, details, fn) {
	const start = performance.now();
	try {
		const result = await fn();
		recordOperation(operation, start, details, 'passed', null);
		return result;
	} catch (error) {
		recordOperation(operation, start, details, 'failed', error);
		throw error;
	}
}
