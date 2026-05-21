import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { existsSync, mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { test } from 'node:test';

import {
	browserOpenModuleUrl,
	cliPath,
	dashboardHtmlModuleUrl,
	dashboardPreferencesModuleUrl,
	createTempProject,
	projectRoot,
	removeTempProject,
	runCli,
	runGit,
	sha256Text,
	stopDashboard,
	trySymlink,
	waitForDashboardInfo,
	writeLatestRunReceipt,
} from './dashboard-support.js';

test('dashboard export rejects paths outside the mustflow root', () => {
	const projectPath = createTempProject();
	const outsideHtmlPath = path.resolve(projectPath, '..', 'mustflow-dashboard-outside.html');
	const outsideJsonPath = path.resolve(projectPath, '..', 'mustflow-dashboard-outside.json');

	try {
		const init = runCli(projectPath, ['init', '--yes']);
		assert.equal(init.status, 0, init.stderr);

		const htmlResult = runCli(projectPath, ['dashboard', '--export', '../mustflow-dashboard-outside.html']);
		assert.equal(htmlResult.status, 1);
		assert.match(htmlResult.stderr, /export path must stay inside the mustflow root/i);
		assert.equal(existsSync(outsideHtmlPath), false);

		const jsonResult = runCli(projectPath, ['dashboard', '--export-json', '../mustflow-dashboard-outside.json']);
		assert.equal(jsonResult.status, 1);
		assert.match(jsonResult.stderr, /export path must stay inside the mustflow root/i);
		assert.equal(existsSync(outsideJsonPath), false);
	} finally {
		rmSync(outsideHtmlPath, { force: true });
		rmSync(outsideJsonPath, { force: true });
		removeTempProject(projectPath);
	}
});

test('dashboard status cache invalidates command contract edits', async () => {
	const projectPath = createTempProject();
	let dashboard;

	try {
		const init = runCli(projectPath, ['init', '--yes']);
		assert.equal(init.status, 0, init.stderr);

		dashboard = spawn(process.execPath, [cliPath, 'dashboard', '--json'], {
			cwd: projectPath,
			stdio: ['ignore', 'pipe', 'pipe'],
		});

		const info = await waitForDashboardInfo(dashboard);
		const html = await fetch(info.url).then((response) => response.text());
		const token = /const dashboardToken = "([^"]+)";/u.exec(html)?.[1];
		assert.ok(token);

		const headers = { 'x-mustflow-dashboard-token': token };
		const firstStatus = await fetch(new URL('/api/status', info.url), { headers }).then((response) =>
			response.json(),
		);
		const secondStatus = await fetch(new URL('/api/status', info.url), { headers }).then((response) =>
			response.json(),
		);
		assert.equal(firstStatus.command_contract.intents.length, secondStatus.command_contract.intents.length);

		const commandsPath = path.join(projectPath, '.mustflow', 'config', 'commands.toml');
		writeFileSync(
			commandsPath,
			`${readFileSync(commandsPath, 'utf8')}
[intents.dashboard_status_cache_probe]
status = "configured"
lifecycle = "oneshot"
run_policy = "agent_allowed"
description = "Probe dashboard status cache invalidation."
argv = ['${process.execPath}', '-e', 'console.log("cache probe")']
cwd = "."
timeout_seconds = 10
stdin = "closed"
success_exit_codes = [0]
`,
		);

		const changedStatus = await fetch(new URL('/api/status', info.url), { headers }).then((response) =>
			response.json(),
		);
		assert.ok(
			changedStatus.command_contract.intents.some((intent) => intent.name === 'dashboard_status_cache_probe'),
		);
		assert.ok(changedStatus.runnable_intents.includes('dashboard_status_cache_probe'));
	} finally {
		if (dashboard) {
			await stopDashboard(dashboard);
		}
		removeTempProject(projectPath);
	}
});

test('dashboard rejects non-local host binding', () => {
	const projectPath = createTempProject();

	try {
		const init = runCli(projectPath, ['init', '--yes']);
		assert.equal(init.status, 0, init.stderr);

		const result = runCli(projectPath, ['dashboard', '--host', '0.0.0.0']);
		assert.equal(result.status, 1);
		assert.match(result.stderr, /Refused dashboard host 0\.0\.0\.0/);
	} finally {
		removeTempProject(projectPath);
	}
});
