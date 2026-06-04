import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

const projectRoot = path.resolve(fileURLToPath(new URL('../..', import.meta.url)));
const cliPath = path.join(projectRoot, 'dist', 'cli', 'index.js');

function createTempProject() {
	return mkdtempSync(path.join(tmpdir(), 'mustflow-tech-'));
}

function removeTempProject(projectPath) {
	rmSync(projectPath, { recursive: true, force: true });
}

function runCli(cwd, args) {
	return spawnSync(process.execPath, [cliPath, ...args], {
		cwd,
		encoding: 'utf8',
	});
}

function parseJson(stdout) {
	return JSON.parse(stdout);
}

test('tech command records low-authority technology preferences', () => {
	const projectPath = createTempProject();

	try {
		assert.equal(runCli(projectPath, ['init', '--yes']).status, 0);
		assert.ok(existsSync(path.join(projectPath, '.mustflow', 'config', 'technology.toml')));

		const add = runCli(projectPath, [
			'tech',
			'add',
			'framework',
			'nextjs',
			'--scope',
			'frontend',
			'--scope',
			'react',
			'--ecosystem',
			'npm',
			'--package',
			'next',
			'--package',
			'react',
			'--why',
			'Preferred React app framework',
			'--constraint',
			'Check existing project stack before proposing migration.',
			'--json',
		]);

		assert.equal(add.status, 0);
		const addPayload = parseJson(add.stdout);
		assert.equal(addPayload.action, 'created');
		assert.equal(addPayload.preference.id, 'framework.frontend.nextjs');
		assert.equal(addPayload.preference.authority, 'hint');

		const list = runCli(projectPath, ['tech', 'list', '--scope', 'frontend', '--json']);
		assert.equal(list.status, 0);
		const listPayload = parseJson(list.stdout);
		assert.equal(listPayload.authority, 'hint');
		assert.equal(listPayload.preferences.length, 1);
		assert.deepEqual(listPayload.preferences[0].packages, ['next', 'react']);

		const suggest = runCli(projectPath, ['tech', 'suggest', '--scope', 'frontend', '--json']);
		assert.equal(suggest.status, 0);
		const suggestPayload = parseJson(suggest.stdout);
		assert.equal(suggestPayload.preferred.length, 1);
		assert.ok(suggestPayload.guidance.some((line) => line.includes('do not authorize dependency installation')));

		const context = runCli(projectPath, ['context', '--json']);
		assert.equal(context.status, 0);
		const contextPayload = parseJson(context.stdout);
		assert.equal(contextPayload.technology_preferences.count, 1);
		assert.equal(contextPayload.technology_preferences.preferences[0].id, 'framework.frontend.nextjs');

		const remove = runCli(projectPath, ['tech', 'remove', 'framework.frontend.nextjs', '--json']);
		assert.equal(remove.status, 0);
		const removePayload = parseJson(remove.stdout);
		assert.equal(removePayload.action, 'removed');

		const empty = runCli(projectPath, ['tech', 'list', '--json']);
		assert.equal(empty.status, 0);
		assert.equal(parseJson(empty.stdout).preferences.length, 0);
	} finally {
		removeTempProject(projectPath);
	}
});

test('check rejects technology preferences that claim higher authority', () => {
	const projectPath = createTempProject();

	try {
		assert.equal(runCli(projectPath, ['init', '--yes']).status, 0);
		writeFileSync(
			path.join(projectPath, '.mustflow', 'config', 'technology.toml'),
			[
				'schema_version = "1"',
				'',
				'[[preferences]]',
				'id = "framework.frontend.nextjs"',
				'kind = "framework"',
				'name = "nextjs"',
				'status = "preferred"',
				'authority = "install_allowed"',
				'scope = ["frontend"]',
				'',
			].join('\n'),
		);

		const result = runCli(projectPath, ['check']);
		assert.equal(result.status, 1);
		const output = `${result.stdout}\n${result.stderr}`;
		assert.match(output, /technology\.toml/);
		assert.match(output, /authority must be "hint"/);
	} finally {
		removeTempProject(projectPath);
	}
});
