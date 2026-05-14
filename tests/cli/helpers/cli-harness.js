import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { cpSync, existsSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { profileOperation } from './ops-profiler.js';

export const projectRoot = path.resolve(fileURLToPath(new URL('../../..', import.meta.url)));
export const cliPath = path.join(projectRoot, 'dist', 'cli', 'index.js');

export function createTempProject(prefix = 'mustflow-test-') {
	return profileOperation('fixture_mkdtemp', { prefix }, () => mkdtempSync(path.join(tmpdir(), prefix)));
}

export function removeTempProject(projectPath) {
	return profileOperation('fixture_rm', { projectPath }, () => rmSync(projectPath, { recursive: true, force: true }));
}

export function cloneProjectFixture(sourcePath, prefix = 'mustflow-clone-') {
	const projectPath = createTempProject(prefix);
	profileOperation('fixture_copy', { sourcePath, projectPath }, () => {
		cpSync(sourcePath, projectPath, { recursive: true, preserveTimestamps: true });
	});
	return projectPath;
}

export function runCli(cwd, args, options = {}) {
	return profileOperation(
		'cli_spawn',
		{
			cwd,
			args,
			env_overrides: options.env ? Object.keys(options.env).filter((key) => process.env[key] !== options.env[key]).sort() : [],
		},
		() =>
			spawnSync(process.execPath, [cliPath, ...args], {
				cwd,
				encoding: 'utf8',
				env: options.env ?? process.env,
			}),
	);
}

export function runCliJson(cwd, args, options = {}) {
	const result = runCli(cwd, args, options);
	assert.equal(result.status, 0, result.stderr || result.stdout);
	return JSON.parse(result.stdout);
}

export function initProject(projectPath, args = ['init', '--yes']) {
	return profileOperation('fixture_init', { projectPath, args }, () => {
		const result = runCli(projectPath, args);
		assert.equal(result.status, 0, result.stderr || result.stdout);
		assert.ok(existsSync(path.join(projectPath, 'AGENTS.md')));
		return result;
	});
}

export function withTempProject(prefix, fn) {
	const projectPath = createTempProject(prefix);
	try {
		return fn(projectPath);
	} finally {
		removeTempProject(projectPath);
	}
}
