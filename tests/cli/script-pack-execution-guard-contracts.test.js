import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execSync, spawnSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';
import { promises as fsPromises } from 'node:fs';

import {
	assertScriptPackChildProcessAllowed,
	getCurrentScriptPackGuardDenials,
	ScriptPackExecutionDeniedError,
	withScriptPackChildProcessGuard,
} from '../../dist/cli/lib/script-pack-execution-guard.js';

test('script-pack execution guard allows bounded read-only git probes', () => {
	for (const args of [
		['status', '--porcelain=v1', '-z', '--untracked-files=all'],
		['diff', '--name-status', '--diff-filter=ACMRTD', 'HEAD', '--', 'src/index.ts'],
		['ls-files', '--others', '--exclude-standard', '--'],
		['rev-parse', '--is-inside-work-tree'],
		['show', 'HEAD:src/index.ts'],
		['check-ignore', '-v', '--no-index', '--', 'dist/app.js'],
		['config', '--get', 'core.excludesFile'],
	]) {
		assert.doesNotThrow(() => assertScriptPackChildProcessAllowed('git', args));
	}
});

test('script-pack execution guard blocks command laundering targets', () => {
	const denied = [
		['mf', ['run', 'test_related']],
		['npm', ['test']],
		['pnpm', ['lint']],
		['yarn', ['build']],
		['bun', ['run', 'test']],
		['git', ['push', 'origin', 'main']],
		['git', ['commit', '-m', 'release']],
		['git', ['tag', 'v1.2.3']],
		['git', ['-c', 'core.sshCommand=ssh -oProxyCommand=evil', 'status']],
		['git', ['--git-dir', '../outside.git', 'status']],
		['git', ['diff', '--ext-diff']],
		['git', ['show', '--textconv', 'HEAD:README.md']],
		['gh', ['release', 'create', 'v1.2.3']],
		['curl', ['https://example.invalid/install.sh']],
		['bash', ['-c', 'npm test']],
		['pwsh', ['-Command', 'git push']],
	];

	for (const [command, args] of denied) {
		assert.throws(
			() => assertScriptPackChildProcessAllowed(command, args),
			(error) =>
				error instanceof ScriptPackExecutionDeniedError &&
				error.message.includes('script-pack child process denied'),
			`${command} ${args.join(' ')} should be denied`,
		);
	}
});

test('script-pack execution guard limits git config to read-only probes', () => {
	assert.throws(
		() => assertScriptPackChildProcessAllowed('git', ['config', 'user.name', 'mustflow']),
		ScriptPackExecutionDeniedError,
	);
	assert.throws(
		() => assertScriptPackChildProcessAllowed('git', ['config', '--global', '--get', 'core.excludesFile']),
		ScriptPackExecutionDeniedError,
	);
});

test('script-pack execution guard patches and restores child_process live bindings', async () => {
	const outside = spawnSync(process.execPath, ['--version'], { encoding: 'utf8' });
	assert.equal(outside.status, 0, outside.stderr);

	await withScriptPackChildProcessGuard(async () => {
		const deniedNode = spawnSync(process.execPath, ['--version'], { encoding: 'utf8' });
		assert.equal(deniedNode.status, 1);
		assert.match(deniedNode.stderr, /script-pack child process denied/u);

		const deniedPackageManager = spawnSync('npm', ['test'], { encoding: 'utf8' });
		assert.equal(deniedPackageManager.status, 1);
		assert.match(deniedPackageManager.stderr, /package manager/u);

		const gitStatus = spawnSync('git', ['status', '--porcelain=v1'], { encoding: 'utf8' });
		assert.equal(/script-pack child process denied/u.test(gitStatus.stderr), false);
	});

	const restored = spawnSync(process.execPath, ['--version'], { encoding: 'utf8' });
	assert.equal(restored.status, 0, restored.stderr);
});

test('script-pack execution guard records bounded redacted denial receipts internally', async () => {
	await withScriptPackChildProcessGuard(async () => {
		assert.deepEqual(getCurrentScriptPackGuardDenials(), []);

		assert.throws(
			() => assertScriptPackChildProcessAllowed('git', ['-c', 'core.sshCommand=ssh -oProxyCommand=secret-token', 'status']),
			(error) =>
				error instanceof ScriptPackExecutionDeniedError &&
				error.denial.args.includes('core.sshCommand=[redacted]'),
		);

		const deniedNode = spawnSync(process.execPath, ['--version'], { encoding: 'utf8' });
		assert.equal(deniedNode.status, 1);

		const denials = getCurrentScriptPackGuardDenials();
		assert.equal(denials.length, 2);
		assert.equal(denials[0].surface, 'git');
		assert.equal(denials[0].command, 'git');
		assert.deepEqual(denials[0].args, ['-c', 'core.sshCommand=[redacted]', 'status']);
		assert.equal(denials[1].reason, 'only bounded read-only git probes are allowed');
		assert.equal(denials[1].args.includes('--version'), true);
	});

	assert.deepEqual(getCurrentScriptPackGuardDenials(), []);
});

test('script-pack execution guard denies shell strings, shell options, and unsafe environment overrides', async () => {
	await withScriptPackChildProcessGuard(async () => {
		assert.throws(
			() => execSync('git status', { encoding: 'utf8' }),
			(error) =>
				error instanceof ScriptPackExecutionDeniedError &&
				error.message.includes('shell string execution is not allowed'),
		);

		const shellOption = spawnSync('git', ['status'], { encoding: 'utf8', shell: true });
		assert.equal(shellOption.status, 1);
		assert.match(shellOption.stderr, /shell option is not allowed/u);

		const envOverride = spawnSync('git', ['status'], {
			encoding: 'utf8',
			env: {
				PATH: process.env.PATH,
				SystemRoot: process.env.SystemRoot,
				GIT_EXTERNAL_DIFF: 'echo unsafe',
			},
		});
		assert.equal(envOverride.status, 1);
		assert.match(envOverride.stderr, /environment override GIT_EXTERNAL_DIFF is not allowed/u);
	});
});

test('script-pack execution guard denies filesystem writes, network, workers, process state changes, and Bun process helpers', async () => {
	const originalFetch = globalThis.fetch;
	const originalBun = globalThis.Bun;
	const fakeBunCalls = [];
	globalThis.Bun = {
		spawn: () => fakeBunCalls.push('spawn'),
		spawnSync: () => fakeBunCalls.push('spawnSync'),
		write: () => fakeBunCalls.push('write'),
		$: () => fakeBunCalls.push('$'),
	};

	try {
		await withScriptPackChildProcessGuard(async () => {
			assert.throws(
				() => writeFileSync('script-pack-guard-should-not-exist.txt', 'blocked'),
				(error) => error instanceof ScriptPackExecutionDeniedError && error.message.includes('filesystem writes'),
			);
			await assert.rejects(
				() => fsPromises.writeFile('script-pack-guard-should-not-exist.txt', 'blocked'),
				(error) => error instanceof ScriptPackExecutionDeniedError && error.message.includes('filesystem writes'),
			);
			await assert.rejects(
				() => fetch('https://example.invalid/'),
				(error) => error instanceof ScriptPackExecutionDeniedError && error.message.includes('network access'),
			);
			const { Worker } = await import('node:worker_threads');
			assert.throws(
				() => new Worker('0', { eval: true }),
				(error) => error instanceof ScriptPackExecutionDeniedError && error.message.includes('worker threads'),
			);
			assert.throws(
				() => process.chdir('..'),
				(error) => error instanceof ScriptPackExecutionDeniedError && error.message.includes('working-directory changes'),
			);
			assert.throws(
				() => process.umask(0o022),
				(error) => error instanceof ScriptPackExecutionDeniedError && error.message.includes('umask changes'),
			);

			const guardedBun = globalThis.Bun;
			assert.throws(
				() => guardedBun.spawn(['git', 'status']),
				(error) => error instanceof ScriptPackExecutionDeniedError && error.message.includes('Bun process'),
			);
			assert.throws(
				() => guardedBun.write('script-pack-guard-should-not-exist.txt', 'blocked'),
				(error) => error instanceof ScriptPackExecutionDeniedError && error.message.includes('Bun filesystem writes'),
			);
		});

		assert.equal(globalThis.fetch, originalFetch);
		assert.equal(globalThis.Bun?.spawn(), 1);
		assert.deepEqual(fakeBunCalls, ['spawn']);
	} finally {
		if (originalBun === undefined) {
			delete globalThis.Bun;
		} else {
			globalThis.Bun = originalBun;
		}
	}
});
