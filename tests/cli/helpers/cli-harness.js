import assert from 'node:assert/strict';
import { AsyncLocalStorage } from 'node:async_hooks';
import { spawnSync } from 'node:child_process';
import { cpSync, existsSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { profileOperation, profileOperationAsync } from './ops-profiler.js';

export const projectRoot = path.resolve(fileURLToPath(new URL('../../..', import.meta.url)));
export const cliPath = path.join(projectRoot, 'dist', 'cli', 'index.js');

const cwdStorage = new AsyncLocalStorage();
const originalProcessCwd = process.cwd.bind(process);
let processCwdPatched = false;

function ensureProcessCwdPatch() {
	if (processCwdPatched) {
		return;
	}

	Object.defineProperty(process, 'cwd', {
		configurable: true,
		value() {
			return cwdStorage.getStore() ?? originalProcessCwd();
		},
	});
	processCwdPatched = true;
}

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

export async function runCliInProcess(cwd, args, options = {}) {
	const { runCli: runCliEntrypoint } = await import('../../../dist/cli/index.js');

	return runCliCommand(cwd, ['mf', ...args], (cliArgs, reporter) => runCliEntrypoint(cliArgs, reporter), options);
}

export function runCliJson(cwd, args, options = {}) {
	const result = runCli(cwd, args, options);
	assert.equal(result.status, 0, result.stderr || result.stdout);
	return JSON.parse(result.stdout);
}

let envCommandQueue = Promise.resolve();

export async function runCliCommand(cwd, args, commandRunner, options = {}) {
	ensureProcessCwdPatch();

	if (options.env && Object.keys(options.env).length > 0) {
		const run = envCommandQueue.then(
			() => runCliCommandIsolated(cwd, args, commandRunner, options),
			() => runCliCommandIsolated(cwd, args, commandRunner, options),
		);
		envCommandQueue = run.then(
			() => undefined,
			() => undefined,
		);
		return run;
	}

	return runCliCommandIsolated(cwd, args, commandRunner, options);
}

async function runCliCommandIsolated(cwd, args, commandRunner, options = {}) {
	const stdout = [];
	const stderr = [];
	const previousExitCode = process.exitCode;
	const env = options.env ?? {};
	const previousEnv = new Map(Object.keys(env).map((key) => [key, process.env[key]]));

	try {
		for (const [key, value] of Object.entries(env)) {
			process.env[key] = value;
		}

		return await cwdStorage.run(cwd, async () => {
			const status = await commandRunner(args.slice(1), {
				stdout(message) {
					stdout.push(`${message}\n`);
				},
				stderr(message) {
					stderr.push(`${message}\n`);
				},
			});

			return { status, signal: null, stdout: stdout.join(''), stderr: stderr.join('') };
		});
	} catch (error) {
		const message = error instanceof Error ? error.message : String(error);
		stderr.push(`Error: ${message}\n`);
		return { status: 1, signal: null, stdout: stdout.join(''), stderr: stderr.join('') };
	} finally {
		process.exitCode = previousExitCode;
		for (const [key, value] of previousEnv) {
			if (value === undefined) {
				delete process.env[key];
			} else {
				process.env[key] = value;
			}
		}
	}
}

export function initProject(projectPath, args = ['init', '--yes']) {
	return profileOperation('fixture_init', { projectPath, args }, () => {
		const result = runCli(projectPath, args);
		assert.equal(result.status, 0, result.stderr || result.stdout);
		assert.ok(existsSync(path.join(projectPath, 'AGENTS.md')));
		return result;
	});
}

export async function initProjectInProcess(projectPath, args = ['init', '--yes']) {
	return profileOperationAsync('fixture_init_in_process', { projectPath, args }, async () => {
		const result = await runCliInProcess(projectPath, args);
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
