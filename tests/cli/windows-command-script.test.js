import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { existsSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { test } from 'node:test';

import {
	createWindowsCommandScriptLine,
	createWindowsCommandScriptSpawn,
} from '../../dist/cli/commands/run/windows-command-script.js';
import {
	appendIntent,
	createTempProject,
	initProject,
	removeTempProject,
	runCli,
} from './run-support.js';

test('Windows script argv rejects expansion in arguments and executable paths', () => {
	const argumentsToReject = ['%PATH%', '%CMDCMDLINE:~-1% & echo MUSTFLOW_ARGV_INJECTED & rem ', '100%'];
	for (const argument of argumentsToReject) {
		assert.throws(() => createWindowsCommandScriptLine('tool.cmd', [argument]), {
			code: 'EINVAL', message: /percent/,
		});
	}
	assert.throws(() => createWindowsCommandScriptLine('tools/%PATH%/tool.cmd', []), { code: 'EINVAL' });
});

test('Windows script spawn explicitly disables delayed expansion', () => {
	const command = createWindowsCommandScriptSpawn('tool.cmd', ['!LITERAL!', 'alpha beta', 'x&y']);
	assert.equal(command.shell, false);
	assert.equal(command.windowsVerbatimArguments, true);
	assert.ok(command.args.includes('/v:off'));
	if (process.platform !== 'win32') return;

	const projectPath = createTempProject();
	try {
		const scriptPath = path.join(projectPath, 'literal.cmd');
		writeFileSync(scriptPath, `@echo off\r\n"${process.execPath}" -e "process.stdout.write(JSON.stringify(process.argv.slice(1)))" %*\r\n`);
		const args = ['!MUSTFLOW_ARGV_PROBE!', 'alpha beta', 'x&y'];
		const invocation = createWindowsCommandScriptSpawn(scriptPath, args);
		const result = spawnSync(invocation.executable, invocation.args, {
			...invocation, cwd: projectPath, encoding: 'utf8', timeout: 3_000, windowsHide: true,
			env: { ...process.env, MUSTFLOW_ARGV_PROBE: 'expanded' },
		});
		assert.equal(result.status, 0, result.stderr);
		assert.deepEqual(JSON.parse(result.stdout), args);
	} finally {
		removeTempProject(projectPath);
	}
});

test('Windows script expansion is blocked in previews and execution before a child starts', {
	skip: process.platform !== 'win32',
}, () => {
	const projectPath = createTempProject();
	const markerPath = path.join(projectPath, 'script-started.txt');
	const argument = '%CMDCMDLINE:~-1% & echo MUSTFLOW_ARGV_INJECTED & rem ';
	try {
		initProject(projectPath);
		for (const extension of ['cmd', 'bat']) {
			const scriptPath = path.join(projectPath, `probe.${extension}`);
			writeFileSync(scriptPath, '@echo off\r\necho started>script-started.txt\r\n');
			const intent = `windows_expansion_${extension}`;
			appendIntent(projectPath, `
[intents.${intent}]
status = "configured"
lifecycle = "oneshot"
run_policy = "agent_allowed"
argv = [${JSON.stringify(scriptPath)}, ${JSON.stringify(argument)}]
timeout_seconds = 10
stdin = "closed"
success_exit_codes = [0]
writes = ["script-started.txt"]
network = false
destructive = false
`);
			for (const flags of [['--plan-only', '--json'], ['--json'], []]) {
				const result = runCli(projectPath, ['run', intent, ...flags]);
				assert.equal(result.status, 1, result.stderr || result.stdout);
				assert.match(result.stderr || result.stdout, /percent/);
				assert.doesNotMatch(result.stdout, /^MUSTFLOW_ARGV_INJECTED\r?$/m);
				if (flags.includes('--json')) {
					assert.equal(JSON.parse(result.stdout).reason_code, 'invalid_command_input');
				}
				assert.equal(existsSync(markerPath), false, 'rejected argv must not start the batch script');
			}
		}
	} finally {
		removeTempProject(projectPath);
	}
});

test('native argv commands continue to pass percent signs literally', () => {
	const projectPath = createTempProject();
	try {
		initProject(projectPath);
		appendIntent(projectPath, `
[intents.native_percent]
status = "configured"
lifecycle = "oneshot"
run_policy = "agent_allowed"
argv = [${JSON.stringify(process.execPath)}, "-e", "process.stdout.write(process.argv[1])", "%PATH%"]
timeout_seconds = 10
stdin = "closed"
success_exit_codes = [0]
writes = []
network = false
destructive = false
`);
		const result = runCli(projectPath, ['run', 'native_percent', '--json']);
		assert.equal(result.status, 0, result.stderr || result.stdout);
		assert.equal(JSON.parse(result.stdout).stdout.tail, '%PATH%');
	} finally {
		removeTempProject(projectPath);
	}
});
