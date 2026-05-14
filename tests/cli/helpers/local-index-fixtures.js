import assert from 'node:assert/strict';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { cliPath, projectRoot, runCli } from './cli-harness.js';
import { profileOperationAsync } from './ops-profiler.js';

export async function importDistModule(relativePath) {
	return import(pathToFileURL(path.join(projectRoot, 'dist', ...relativePath.split('/'))).href);
}

export async function createLocalIndexDirect(projectPath, options = {}) {
	return profileOperationAsync('local_index_direct_create', { projectPath, options }, async () => {
		const { createLocalIndex } = await importDistModule('cli/lib/local-index.js');
		return createLocalIndex(projectPath, options);
	});
}

export async function searchLocalIndexDirect(projectPath, query, options = {}) {
	return profileOperationAsync('local_index_direct_search', { projectPath, query, options }, async () => {
		const { searchLocalIndex } = await importDistModule('cli/lib/local-index.js');
		return searchLocalIndex(projectPath, query, options);
	});
}

export function indexProject(projectPath, args = [], options = {}) {
	const result = runCli(projectPath, ['index', ...args, '--json'], options);
	assert.equal(result.status, 0, result.stderr || result.stdout);
	return JSON.parse(result.stdout);
}

export async function withProcessArgvEntrypoint(fn) {
	const previousArgv = process.argv;
	process.argv = [process.execPath, cliPath];
	try {
		return await fn();
	} finally {
		process.argv = previousArgv;
	}
}
