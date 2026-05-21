import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { once } from 'node:events';
import {
	existsSync,
	mkdtempSync,
	mkdirSync,
	rmSync,
	symlinkSync,
	writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

export const projectRoot = path.resolve(fileURLToPath(new URL('../..', import.meta.url)));
export const cliPath = path.join(projectRoot, 'dist', 'cli', 'index.js');
export const browserOpenModuleUrl = pathToFileURL(path.join(projectRoot, 'dist', 'cli', 'lib', 'browser-open.js')).href;
export const dashboardHtmlModuleUrl = pathToFileURL(path.join(projectRoot, 'dist', 'cli', 'lib', 'dashboard-html.js')).href;
export const dashboardPreferencesModuleUrl = pathToFileURL(
	path.join(projectRoot, 'dist', 'cli', 'lib', 'dashboard-preferences.js'),
).href;

export function createTempProject() {
	const projectPath = mkdtempSync(path.join(tmpdir(), 'mustflow-dashboard-'));
	mkdirSync(path.join(projectPath, 'src'), { recursive: true });
	writeFileSync(path.join(projectPath, 'src', 'index.ts'), 'export {};\n');
	return projectPath;
}

export function removeTempProject(projectPath) {
	rmSync(projectPath, { recursive: true, force: true });
}

export function trySymlink(target, linkPath, type) {
	try {
		symlinkSync(target, linkPath, type);
		return true;
	} catch (error) {
		if (error && typeof error === 'object' && 'code' in error && ['EPERM', 'ENOTSUP'].includes(error.code)) {
			return false;
		}

		throw error;
	}
}

export function runCli(cwd, args) {
	return spawnSync(process.execPath, [cliPath, ...args], {
		cwd,
		encoding: 'utf8',
	});
}

export function runGit(cwd, args) {
	return spawnSync('git', args, {
		cwd,
		encoding: 'utf8',
	});
}

export function sha256Text(text) {
	return `sha256:${createHash('sha256').update(text).digest('hex')}`;
}

export function writeLatestRunReceipt(projectPath) {
	const statePath = path.join(projectPath, '.mustflow', 'state', 'runs');
	const stdoutToken = 'sk-abcdefghijklmnop';
	const stderrToken = 'ghp_1234567890abcdefghij';
	const argvToken = 'password=supersecretvalue';
	mkdirSync(statePath, { recursive: true });
	writeFileSync(
		path.join(statePath, 'latest.json'),
		JSON.stringify(
			{
				schema_version: '1',
				command: 'run',
				intent: 'test_related',
				status: 'passed',
				timed_out: false,
				started_at: '2026-05-13T00:00:00.000Z',
				finished_at: '2026-05-13T00:00:01.000Z',
				duration_ms: 1000,
				cwd: '.',
				lifecycle: 'oneshot',
				run_policy: 'agent_allowed',
				mode: 'argv',
				argv: [process.execPath, '-e', `console.log("${stdoutToken}")`, argvToken],
				timeout_seconds: 10,
				max_output_bytes: 1024,
				success_exit_codes: [0],
				exit_code: 0,
				signal: null,
				error: null,
				kill_method: null,
				receipt_path: '.mustflow/state/runs/latest.json',
				stdout: { bytes: 22, truncated: false, tail: `token ${stdoutToken}` },
				stderr: { bytes: 32, truncated: false, tail: `api_key=${stderrToken}` },
			},
			null,
			2,
		),
	);
}


export async function waitForDashboardInfo(child) {
	let stdout = '';

	return new Promise((resolve, reject) => {
		const timeout = setTimeout(() => reject(new Error('Timed out waiting for dashboard URL')), 5_000);

		child.stdout.on('data', (chunk) => {
			stdout += chunk.toString('utf8');
			const newlineIndex = stdout.indexOf('\n');

			if (newlineIndex < 0) {
				return;
			}

			clearTimeout(timeout);
			const line = stdout.slice(0, newlineIndex).trim();
			resolve(JSON.parse(line));
		});

		child.stderr.on('data', (chunk) => {
			clearTimeout(timeout);
			reject(new Error(chunk.toString('utf8').trim()));
		});

		child.on('exit', (code) => {
			if (code !== null && code !== 0) {
				clearTimeout(timeout);
				reject(new Error(`Dashboard exited before listening: ${code}`));
			}
		});
	});
}

export async function stopDashboard(child) {
	if (child.exitCode !== null) {
		return;
	}

	child.kill();
	await once(child, 'exit');
}

