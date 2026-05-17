import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, symlinkSync } from 'node:fs';
import { createServer } from 'node:http';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { runCli as runCliInProcess } from '../../dist/cli/index.js';

const projectRoot = path.resolve(fileURLToPath(new URL('../..', import.meta.url)));
const cliPath = path.join(projectRoot, 'dist', 'cli', 'index.js');
const packageJson = JSON.parse(readFileSync(path.join(projectRoot, 'package.json'), 'utf8'));

function runCliSubprocess(args, cwd = projectRoot, env = {}) {
	return spawnSync(process.execPath, [cliPath, ...args], {
		cwd,
		encoding: 'utf8',
		env: { ...process.env, ...env },
	});
}

async function runCli(args, cwd = projectRoot, env = {}) {
	const stdout = [];
	const stderr = [];
	const previousCwd = process.cwd();
	const previousExitCode = process.exitCode;
	const previousEnv = new Map(Object.keys(env).map((key) => [key, process.env[key]]));

	try {
		process.chdir(cwd);
		for (const [key, value] of Object.entries(env)) {
			process.env[key] = value;
		}

		const status = await runCliInProcess(args, {
			stdout(message) {
				stdout.push(`${message}\n`);
			},
			stderr(message) {
				stderr.push(`${message}\n`);
			},
		});

		return { status, signal: null, stdout: stdout.join(''), stderr: stderr.join('') };
	} finally {
		process.chdir(previousCwd);
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

function listen(server) {
	return new Promise((resolve) => {
		server.listen(0, '127.0.0.1', () => resolve(server.address()));
	});
}

function closeServer(server) {
	return new Promise((resolve, reject) => {
		server.close((error) => {
			if (error) reject(error);
			else resolve();
		});
	});
}

test('prints top-level help', () => {
	const result = runCliSubprocess(['--help']);

	assert.equal(result.status, 0);
	assert.match(result.stdout, /Usage:/);
	assert.match(result.stdout, /Examples:/);
	assert.match(result.stdout, /Exit codes:/);
	assert.match(result.stdout, /mf adapters/);
	assert.match(result.stdout, /mf init/);
	assert.match(result.stdout, /mf check/);
	assert.match(result.stdout, /mf classify/);
	assert.match(result.stdout, /mf contract-lint/);
	assert.match(result.stdout, /mf status/);
	assert.match(result.stdout, /mf update/);
	assert.match(result.stdout, /mf upgrade/);
	assert.match(result.stdout, /mf map/);
	assert.match(result.stdout, /mf line-endings/);
	assert.match(result.stdout, /mf run/);
	assert.match(result.stdout, /mf context/);
	assert.match(result.stdout, /mf doctor/);
	assert.match(result.stdout, /mf handoff/);
	assert.match(result.stdout, /mf index/);
	assert.match(result.stdout, /mf search/);
	assert.match(result.stdout, /mf dashboard/);
	assert.match(result.stdout, /mf version/);
	assert.match(result.stdout, /mf version-sources/);
	assert.match(result.stdout, /mf verify/);
	assert.match(result.stdout, /mf explain/);
	assert.match(result.stdout, /mf impact/);
});

test('runs when invoked through a linked package path', () => {
	const root = mkdtempSync(path.join(tmpdir(), 'mustflow-linked-bin-'));
	const linkedRoot = path.join(root, 'mustflow');

	try {
		symlinkSync(projectRoot, linkedRoot, process.platform === 'win32' ? 'junction' : 'dir');
		const linkedCliPath = path.join(linkedRoot, 'dist', 'cli', 'index.js');
		const result = spawnSync(process.execPath, [linkedCliPath, '--help'], {
			cwd: projectRoot,
			encoding: 'utf8',
		});

		assert.equal(result.status, 0);
		assert.match(result.stdout, /Usage: mf/);
	} finally {
		rmSync(root, { recursive: true, force: true });
	}
});

test('prints Korean top-level help with --lang', async () => {
	const result = await runCli(['--lang', 'ko', '--help']);

	assert.equal(result.status, 0);
	assert.match(result.stdout, /사용법:/);
	assert.match(result.stdout, /명령어:/);
	assert.match(result.stdout, /옵션:/);
	assert.match(result.stdout, /종료 코드:/);
	assert.match(result.stdout, /mf init/);
	assert.match(result.stdout, /CLI 출력 언어/);
	assert.doesNotMatch(result.stdout, /Usage:/);
});

test('prints Korean command help with --lang', async () => {
	const result = await runCli(['--lang=ko', 'init', '--help']);

	assert.equal(result.status, 0);
	assert.match(result.stdout, /사용법: mf init/);
	assert.match(result.stdout, /프로젝트 유형을 설정합니다/);
	assert.match(result.stdout, /설치할 mustflow 문서 언어를 설정합니다/);
});

test('prints localized top-level help for all README languages', async () => {
	const cases = [
		['zh', /用法:/, /选项:/, /未知命令/],
		['es', /Uso:/, /Opciones:/, /Comando desconocido/],
		['fr', /Utilisation:/, /Options:/, /Commande inconnue/],
		['hi', /उपयोग:/, /विकल्प:/, /अज्ञात कमांड/],
	];

	for (const [lang, usagePattern, optionsPattern, unknownCommandPattern] of cases) {
		const help = await runCli(['--lang', lang, '--help']);
		assert.equal(help.status, 0);
		assert.match(help.stdout, usagePattern);
		assert.match(help.stdout, optionsPattern);
		assert.doesNotMatch(help.stdout, /Usage:/);

		const unknown = await runCli(['--lang', lang, 'unknown']);
		assert.equal(unknown.status, 1);
		assert.match(unknown.stderr, unknownCommandPattern);
	}
});

test('prints package version', async () => {
	const result = await runCli(['--version']);

	assert.equal(result.status, 0);
	assert.equal(result.stdout.trim(), packageJson.version);

	const commandResult = await runCli(['version']);
	assert.equal(commandResult.status, 0);
	assert.equal(commandResult.stdout.trim(), packageJson.version);
});

test('checks npm for a newer package version when requested', async () => {
	const server = createServer((request, response) => {
		assert.equal(request.url, '/mustflow/latest');
		response.writeHead(200, { 'content-type': 'application/json' });
		response.end(JSON.stringify({ version: '99.0.0' }));
	});

	const address = await listen(server);

	try {
		const result = await runCli(['version', '--check'], projectRoot, {
			MUSTFLOW_NPM_REGISTRY_URL: `http://127.0.0.1:${address.port}`,
		});

		assert.equal(result.status, 0);
		assert.match(result.stdout, new RegExp(`mustflow ${packageJson.version}`));
		assert.match(result.stdout, /latest 99\.0\.0 available/);
		assert.match(result.stdout, /Update commands:/);
		assert.match(result.stdout, /npm install -g mustflow@latest/);
		assert.match(result.stdout, /bun add -g mustflow@latest/);
		assert.match(result.stdout, /pnpm add -g mustflow@latest/);
		assert.match(result.stdout, /yarn global add mustflow@latest/);
		assert.match(result.stdout, /deno install -g -A -n mf npm:mustflow@latest/);
		assert.equal(result.stderr, '');
	} finally {
		await closeServer(server);
	}
});

test('fails unsupported CLI language before command routing', async () => {
	const result = await runCli(['--lang', 'ja', 'help']);

	assert.equal(result.status, 1);
	assert.match(result.stderr, /Unsupported CLI language: ja/);
	assert.match(result.stdout, /Usage:/);
});

test('fails unknown commands with help', async () => {
	const result = await runCli(['unknown']);

	assert.equal(result.status, 1);
	assert.match(result.stderr, /Error: Unknown command: unknown/);
	assert.match(result.stderr, /Run `mf --help` for usage\./);
	assert.match(result.stdout, /Usage:/);
});

test('fails unknown commands with Korean guidance when --lang ko is set', async () => {
	const result = await runCli(['--lang', 'ko', 'unknown']);

	assert.equal(result.status, 1);
	assert.match(result.stderr, /오류: 알 수 없는 명령: unknown/);
	assert.match(result.stderr, /사용법은 `mf --help` 명령으로 확인하세요\./);
	assert.match(result.stdout, /사용법:/);
});

test('routes command-specific help', async () => {
	for (const command of ['adapters', 'init', 'check', 'classify', 'contract-lint', 'status', 'update', 'upgrade', 'map', 'line-endings', 'run', 'context', 'doctor', 'handoff', 'index', 'search', 'dashboard', 'version', 'version-sources', 'verify', 'explain', 'impact', 'help']) {
		const result = await runCli([command, '--help']);

		assert.equal(result.status, 0);
		assert.match(result.stdout, new RegExp(`mf ${command}`));
		assert.match(result.stdout, /Examples:/);
		assert.match(result.stdout, /Exit codes:/);
	}
});

test('fails unknown command options with standardized guidance', async () => {
	const cases = [
		['init', '--bad'],
		['adapters', 'status', '--bad'],
		['check', '--bad'],
		['classify', '--bad'],
		['contract-lint', '--bad'],
		['status', '--bad'],
		['update', '--bad'],
		['map', '--bad'],
		['line-endings', 'check', '--bad'],
		['run', '--bad'],
		['context', '--bad'],
		['doctor', '--bad'],
		['handoff', 'validate', '--bad'],
		['index', '--bad'],
		['search', '--bad'],
		['dashboard', '--bad'],
		['version', '--bad'],
		['version-sources', '--bad'],
		['verify', '--bad'],
		['explain', '--bad'],
		['impact', '--bad'],
		['help', 'workflow', '--bad'],
	];

	for (const args of cases) {
		const result = await runCli(args);
		const command = args[0];

		assert.equal(result.status, 1);
		assert.match(result.stderr, /Error: Unknown option: --bad/);
		assert.match(result.stderr, new RegExp(`Run \`mf ${command} --help\` for usage\\.`));
		assert.match(result.stdout, /Usage:/);
	}
});

test('dashboard help reports the implemented local server command', async () => {
	const result = await runCli(['dashboard', '--help']);

	assert.equal(result.status, 0);
	assert.match(result.stdout, /Start a local dashboard/);
	assert.match(result.stdout, /--host <host>/);
	assert.match(result.stdout, /--port <port>/);
	assert.match(result.stdout, /--open/);
	assert.match(result.stdout, /--no-open/);
	assert.equal(result.stderr, '');
});

test('dashboard help reports the implemented command in Korean', async () => {
	const result = await runCli(['--lang', 'ko', 'dashboard', '--help']);

	assert.equal(result.status, 0);
	assert.match(result.stdout, /로컬 대시보드를 시작합니다/);
	assert.match(result.stdout, /--host <host>/);
	assert.match(result.stdout, /--port <port>/);
	assert.match(result.stdout, /--open/);
	assert.match(result.stdout, /--no-open/);
	assert.equal(result.stderr, '');
});

test('prints installed mustflow help views', async () => {
	const root = mkdtempSync(path.join(tmpdir(), 'mustflow-help-'));

	try {
		const result = await runCli(['help', 'preferences'], root);

		assert.equal(result.status, 0);
		assert.match(result.stdout, /Preferences/);
		assert.match(result.stdout, /No \.mustflow\/config\/preferences\.toml found/);
	} finally {
		rmSync(root, { recursive: true, force: true });
	}
});

test('prints installed mustflow help views in Korean shell labels', async () => {
	const root = mkdtempSync(path.join(tmpdir(), 'mustflow-help-ko-'));

	try {
		const result = await runCli(['--lang', 'ko', 'help', 'preferences'], root);

		assert.equal(result.status, 0);
		assert.doesNotMatch(result.stdout, /Preferences/);
		assert.match(result.stdout, /현재 디렉터리에서 \.mustflow\/config\/preferences\.toml 파일을 찾지 못했습니다/);
	} finally {
		rmSync(root, { recursive: true, force: true });
	}
});
