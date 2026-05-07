import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

const projectRoot = path.resolve(fileURLToPath(new URL('../..', import.meta.url)));
const cliPath = path.join(projectRoot, 'dist', 'cli', 'index.js');
const packageJson = JSON.parse(readFileSync(path.join(projectRoot, 'package.json'), 'utf8'));

function runCli(args) {
	return spawnSync(process.execPath, [cliPath, ...args], {
		cwd: projectRoot,
		encoding: 'utf8',
	});
}

test('prints top-level help', () => {
	const result = runCli(['--help']);

	assert.equal(result.status, 0);
	assert.match(result.stdout, /Usage:/);
	assert.match(result.stdout, /Examples:/);
	assert.match(result.stdout, /Exit codes:/);
	assert.match(result.stdout, /mf init/);
	assert.match(result.stdout, /mf check/);
	assert.match(result.stdout, /mf status/);
	assert.match(result.stdout, /mf update/);
	assert.match(result.stdout, /mf map/);
	assert.match(result.stdout, /mf run/);
	assert.match(result.stdout, /mf context/);
	assert.match(result.stdout, /mf doctor/);
	assert.match(result.stdout, /mf index/);
	assert.match(result.stdout, /mf search/);
	assert.match(result.stdout, /mf dashboard/);
});

test('prints Korean top-level help with --lang', () => {
	const result = runCli(['--lang', 'ko', '--help']);

	assert.equal(result.status, 0);
	assert.match(result.stdout, /사용법:/);
	assert.match(result.stdout, /명령어:/);
	assert.match(result.stdout, /선택지:/);
	assert.match(result.stdout, /종료 코드:/);
	assert.match(result.stdout, /기본 mustflow 에이전트 작업 흐름을 복사합니다/);
});

test('prints Korean command help with --lang', () => {
	const result = runCli(['--lang=ko', 'init', '--help']);

	assert.equal(result.status, 0);
	assert.match(result.stdout, /사용법: mf init/);
	assert.match(result.stdout, /프로젝트 성격을 설정합니다/);
	assert.match(result.stdout, /설치할 mustflow 문서 언어를 설정합니다/);
});

test('prints package version', () => {
	const result = runCli(['--version']);

	assert.equal(result.status, 0);
	assert.equal(result.stdout.trim(), packageJson.version);
});

test('fails unsupported CLI language before command routing', () => {
	const result = runCli(['--lang', 'ja', 'help']);

	assert.equal(result.status, 1);
	assert.match(result.stderr, /Unsupported CLI language: ja/);
	assert.match(result.stdout, /Usage:/);
});

test('fails unknown commands with help', () => {
	const result = runCli(['unknown']);

	assert.equal(result.status, 1);
	assert.match(result.stderr, /Error: Unknown command: unknown/);
	assert.match(result.stderr, /Run `mf --help` for usage\./);
	assert.match(result.stdout, /Usage:/);
});

test('fails unknown commands with Korean guidance when --lang ko is set', () => {
	const result = runCli(['--lang', 'ko', 'unknown']);

	assert.equal(result.status, 1);
	assert.match(result.stderr, /오류: Unknown command: unknown/);
	assert.match(result.stderr, /사용법은 `mf --help` 명령으로 확인하세요\./);
	assert.match(result.stdout, /사용법:/);
});

test('routes command-specific help', () => {
	for (const command of ['init', 'check', 'status', 'update', 'map', 'run', 'context', 'doctor', 'index', 'search', 'dashboard', 'help']) {
		const result = runCli([command, '--help']);

		assert.equal(result.status, 0);
		assert.match(result.stdout, new RegExp(`mf ${command}`));
		assert.match(result.stdout, /Examples:/);
		assert.match(result.stdout, /Exit codes:/);
	}
});

test('fails unknown command options with standardized guidance', () => {
	const cases = [
		['init', '--bad'],
		['check', '--bad'],
		['status', '--bad'],
		['update', '--bad'],
		['map', '--bad'],
		['run', '--bad'],
		['context', '--bad'],
		['doctor', '--bad'],
		['index', '--bad'],
		['search', '--bad'],
		['dashboard', '--bad'],
		['help', 'workflow', '--bad'],
	];

	for (const args of cases) {
		const result = runCli(args);
		const command = args[0];

		assert.equal(result.status, 1);
		assert.match(result.stderr, /Error: Unknown option: --bad/);
		assert.match(result.stderr, new RegExp(`Run \`mf ${command} --help\` for usage\\.`));
		assert.match(result.stdout, /Usage:/);
	}
});

test('dashboard command is reserved but not implemented yet', () => {
	const result = runCli(['dashboard']);

	assert.equal(result.status, 1);
	assert.equal(result.stdout, '');
	assert.equal(result.stderr.trim(), 'mf dashboard is not implemented yet');
});

test('dashboard command reports reserved state in Korean', () => {
	const result = runCli(['--lang', 'ko', 'dashboard']);

	assert.equal(result.status, 1);
	assert.equal(result.stdout, '');
	assert.equal(result.stderr.trim(), 'mf dashboard는 아직 구현되지 않은 기능입니다');
});

test('prints installed mustflow help views', () => {
	const result = runCli(['help', 'preferences']);

	assert.equal(result.status, 0);
	assert.match(result.stdout, /Preferences/);
	assert.match(result.stdout, /No \.mustflow\/config\/preferences\.toml found/);
});

test('prints installed mustflow help views in Korean shell labels', () => {
	const result = runCli(['--lang', 'ko', 'help', 'preferences']);

	assert.equal(result.status, 0);
	assert.match(result.stdout, /선호값/);
	assert.match(result.stdout, /현재 디렉터리에서 \.mustflow\/config\/preferences\.toml 파일을 찾지 못했습니다/);
});
