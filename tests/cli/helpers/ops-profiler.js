import { appendFileSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import { performance } from 'node:perf_hooks';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(fileURLToPath(new URL('../../..', import.meta.url)));
const profileSetting = process.env.MUSTFLOW_TEST_PROFILE_OPS;
const runId =
	process.env.MUSTFLOW_TEST_PROFILE_RUN_ID ??
	`${new Date().toISOString().replace(/[:.]/gu, '-')}-${process.pid}`;

function normalizePath(value) {
	return String(value).replaceAll('\\', '/');
}

function toRepoRelativePath(value) {
	const normalized = normalizePath(value);

	if (path.isAbsolute(value)) {
		const relative = normalizePath(path.relative(repoRoot, value));
		return relative.startsWith('..') ? normalized : relative;
	}

	return normalized.replace(/^\.?\//u, '');
}

function inferTestFile() {
	if (process.env.MUSTFLOW_TEST_FILE) {
		return toRepoRelativePath(process.env.MUSTFLOW_TEST_FILE);
	}

	const fromArgv = process.argv
		.map((arg) => toRepoRelativePath(arg))
		.find((arg) => /^tests\/cli\/[^/]+\.test\.js$/u.test(arg));

	return fromArgv ?? null;
}

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

function sanitizeDetails(details) {
	if (!details || typeof details !== 'object') {
		return {};
	}

	return Object.fromEntries(
		Object.entries(details).map(([key, value]) => {
			if (Array.isArray(value)) {
				return [key, value.map((entry) => String(entry))];
			}

			if (typeof value === 'string') {
				return [key, value.length > 500 ? `${value.slice(0, 500)}...` : value];
			}

			if (value === null || ['number', 'boolean'].includes(typeof value)) {
				return [key, value];
			}

			return [key, String(value)];
		}),
	);
}

function recordOperation(operation, start, details, status, error) {
	writeProfileRecord({
		schema_version: 2,
		run_id: runId,
		pid: process.pid,
		ppid: process.ppid,
		test_file: inferTestFile(),
		operation,
		status,
		duration_ms: Math.round((performance.now() - start) * 1000) / 1000,
		details: sanitizeDetails(details),
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
