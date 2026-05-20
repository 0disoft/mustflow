import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { chmodSync, cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { after, before } from 'node:test';
import { fileURLToPath, pathToFileURL } from 'node:url';

export const projectRoot = path.resolve(fileURLToPath(new URL('../..', import.meta.url)));
export const cliPath = path.join(projectRoot, 'dist', 'cli', 'index.js');
export const packageVersion = JSON.parse(readFileSync(path.join(projectRoot, 'package.json'), 'utf8')).version;
const TEMP_REMOVE_RETRY_COUNT = 30;
const TEMP_REMOVE_RETRY_DELAY_MS = 100;
let initializedProjectFixture;

export function createTempProject() {
	return mkdtempSync(path.join(tmpdir(), 'mustflow-run-'));
}

export function removeTempProject(projectPath) {
	for (let attempt = 0; attempt < TEMP_REMOVE_RETRY_COUNT; attempt += 1) {
		try {
			rmSync(projectPath, { recursive: true, force: true });
			return;
		} catch (error) {
			if (attempt === TEMP_REMOVE_RETRY_COUNT - 1 || !['EBUSY', 'ENOTEMPTY', 'EPERM'].includes(error?.code)) {
				throw error;
			}

			Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, TEMP_REMOVE_RETRY_DELAY_MS);
		}
	}
}

export function latestRunReceiptPath(projectPath) {
	return path.join(projectPath, '.mustflow', 'state', 'runs', 'latest.json');
}

export function latestRunProfilePath(projectPath) {
	return path.join(projectPath, '.mustflow', 'state', 'runs', 'latest.profile.json');
}

export function runPerformanceSamplesPath(projectPath) {
	return path.join(projectPath, '.mustflow', 'state', 'perf', 'samples.json');
}

export function runPerformanceSummaryPath(projectPath) {
	return path.join(projectPath, '.mustflow', 'state', 'perf', 'summary.json');
}

export function runCli(cwd, args, options = {}) {
	return spawnSync(process.execPath, [cliPath, ...args], {
		cwd,
		encoding: 'utf8',
		...options,
	});
}

export function waitForClose(child) {
	return new Promise((resolve) => {
		child.once('close', (status, signal) => resolve({ status, signal }));
	});
}

export function waitForOutput(getOutput, pattern, timeoutMs = 2000) {
	return new Promise((resolve, reject) => {
		const startedAt = Date.now();
		const interval = setInterval(() => {
			if (pattern.test(getOutput())) {
				clearInterval(interval);
				resolve();
				return;
			}

			if (Date.now() - startedAt > timeoutMs) {
				clearInterval(interval);
				reject(new Error(`Timed out waiting for output matching ${pattern}`));
			}
		}, 10);
	});
}

before(() => {
	initializedProjectFixture = createTempProject();
	const result = runCli(initializedProjectFixture, ['init', '--yes']);
	assert.equal(result.status, 0, result.stderr || result.stdout);
});

after(() => {
	if (initializedProjectFixture) {
		removeTempProject(initializedProjectFixture);
	}
});

export function createEnvWithoutPathLookup() {
	const env = { ...process.env };
	const pathKey = Object.keys(env).find((key) => key.toLowerCase() === 'path') ?? 'PATH';

	env[pathKey] = '';

	return env;
}

export function createEnvWithLocalBinFirst(projectPath) {
	const env = { ...process.env };
	const pathKey = Object.keys(env).find((key) => key.toLowerCase() === 'path') ?? 'PATH';
	const currentPath = env[pathKey] ?? '';
	env[pathKey] = `${path.join(projectPath, 'node_modules', '.bin')}${path.delimiter}${currentPath}`;
	return env;
}

export function createEnvWithCommandPolicyFixtures() {
	return {
		...process.env,
		MUSTFLOW_TEST_ALLOWED_ENV: 'visible-env-value',
		MUSTFLOW_TEST_SECRET_ENV: 'hidden-env-value',
	};
}

export function createEnvWithRecursiveWriteDriftSnapshot() {
	return {
		...process.env,
		MUSTFLOW_WRITE_DRIFT_SNAPSHOT: '1',
	};
}

export function initProject(projectPath) {
	assert.ok(initializedProjectFixture, 'initialized project fixture should be ready');
	cpSync(initializedProjectFixture, projectPath, { recursive: true });
}

export function appendIntent(projectPath, text) {
	const commandsPath = path.join(projectPath, '.mustflow', 'config', 'commands.toml');
	const commands = readFileSync(commandsPath, 'utf8');
	writeFileSync(commandsPath, `${commands}\n${text.trim()}\n`);
}

export function setDefaultKillAfterSeconds(projectPath, seconds) {
	const commandsPath = path.join(projectPath, '.mustflow', 'config', 'commands.toml');
	const commands = readFileSync(commandsPath, 'utf8');
	writeFileSync(commandsPath, commands.replace(/kill_after_seconds = \d+/u, `kill_after_seconds = ${seconds}`));
}

export function createLocalBinShim(projectPath, name, marker) {
	const localBinPath = path.join(projectPath, 'node_modules', '.bin');
	mkdirSync(localBinPath, { recursive: true });

	if (process.platform === 'win32') {
		writeFileSync(path.join(localBinPath, `${name}.cmd`), `@echo off\r\necho ${marker} %*\r\nexit /b 0\r\n`);
		return;
	}

	const shimPath = path.join(localBinPath, name);
	writeFileSync(shimPath, `#!/bin/sh\necho ${marker} "$@"\nexit 0\n`);
	chmodSync(shimPath, 0o755);
}

export function trySymlink(target, linkPath, type) {
	try {
		symlinkSync(target, linkPath, type);
		return true;
	} catch (error) {
		if (
			error &&
			typeof error === 'object' &&
			'code' in error &&
			['EPERM', 'ENOTSUP'].includes(error.code)
		) {
			return false;
		}

		throw error;
	}
}

export function runGit(projectPath, args) {
	return spawnSync('git', ['-C', projectPath, ...args], {
		cwd: projectPath,
		encoding: 'utf8',
		stdio: ['ignore', 'pipe', 'pipe'],
		windowsHide: true,
	});
}

export function commitGitBaseline(projectPath) {
	let result = runGit(projectPath, ['init']);
	if (result.status !== 0) {
		return false;
	}

	for (const args of [
		['config', 'user.email', 'mustflow-tests@example.invalid'],
		['config', 'user.name', 'mustflow tests'],
		['add', '.'],
		['commit', '-m', 'baseline'],
	]) {
		result = runGit(projectPath, args);
		if (result.status !== 0) {
			return false;
		}
	}

	return true;
}
