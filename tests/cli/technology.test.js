import assert from 'node:assert/strict';
import { spawn, spawnSync } from 'node:child_process';
import { createServer } from 'node:http';
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

const projectRoot = path.resolve(fileURLToPath(new URL('../..', import.meta.url)));
const cliPath = path.join(projectRoot, 'dist', 'cli', 'index.js');

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

async function withNpmPackages(packages, callback) {
	const packageSet = new Set(packages);
	const server = createServer((request, response) => {
		const pathname = new URL(request.url ?? '/', 'http://127.0.0.1').pathname;
		const packageName = decodeURIComponent(pathname.replace(/^\/+/u, ''));

		if (!packageSet.has(packageName)) {
			response.writeHead(404, { 'content-type': 'application/json' });
			response.end(JSON.stringify({ error: 'not_found' }));
			return;
		}

		response.writeHead(200, { 'content-type': 'application/json' });
		response.end(JSON.stringify({ name: packageName, version: '1.0.0' }));
	});
	const address = await listen(server);

	try {
		return await callback(`http://127.0.0.1:${address.port}`);
	} finally {
		await closeServer(server);
	}
}

function createTempProject() {
	return mkdtempSync(path.join(tmpdir(), 'mustflow-tech-'));
}

function removeTempProject(projectPath) {
	rmSync(projectPath, { recursive: true, force: true });
}

function runCli(cwd, args, env = {}) {
	return spawnSync(process.execPath, [cliPath, ...args], {
		cwd,
		encoding: 'utf8',
		env: { ...process.env, ...env },
	});
}

function runCliAsync(cwd, args, env = {}) {
	return new Promise((resolve, reject) => {
		const child = spawn(process.execPath, [cliPath, ...args], {
			cwd,
			env: { ...process.env, ...env },
			stdio: ['ignore', 'pipe', 'pipe'],
		});
		const stdout = [];
		const stderr = [];

		child.stdout.setEncoding('utf8');
		child.stderr.setEncoding('utf8');
		child.stdout.on('data', (chunk) => stdout.push(chunk));
		child.stderr.on('data', (chunk) => stderr.push(chunk));
		child.on('error', reject);
		child.on('close', (status, signal) => {
			resolve({
				status,
				signal,
				stdout: stdout.join(''),
				stderr: stderr.join(''),
			});
		});
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

test('tech add verifies npm packages before writing the preference', async () => {
	const projectPath = createTempProject();

	try {
		assert.equal(runCli(projectPath, ['init', '--yes']).status, 0);

		const add = await withNpmPackages(['next', 'react'], (registryUrl) =>
			runCliAsync(
				projectPath,
				[
					'tech',
					'add',
					'framework',
					'nextjs',
					'--scope',
					'frontend',
					'--ecosystem',
					'npm',
					'--package',
					'next',
					'--package',
					'react',
					'--verify',
					'--json',
				],
				{ MUSTFLOW_NPM_REGISTRY_URL: registryUrl },
			),
		);

		assert.equal(add.status, 0, add.stderr || add.stdout);
		const payload = parseJson(add.stdout);
		assert.equal(payload.action, 'created');
		assert.deepEqual(
			payload.verified_packages.map((entry) => entry.resolvedName),
			['next', 'react'],
		);

		const list = runCli(projectPath, ['tech', 'list', '--json']);
		assert.equal(list.status, 0);
		assert.equal(parseJson(list.stdout).preferences.length, 1);
	} finally {
		removeTempProject(projectPath);
	}
});

test('tech add verify refuses missing npm packages without writing preferences', async () => {
	const projectPath = createTempProject();

	try {
		assert.equal(runCli(projectPath, ['init', '--yes']).status, 0);

		const add = await withNpmPackages(['next'], (registryUrl) =>
			runCliAsync(
				projectPath,
				[
					'tech',
					'add',
					'framework',
					'broken-stack',
					'--scope',
					'frontend',
					'--ecosystem',
					'npm',
					'--package',
					'next',
					'--package',
					'not-a-real-package',
					'--verify',
				],
				{ MUSTFLOW_NPM_REGISTRY_URL: registryUrl },
			),
		);

		assert.equal(add.status, 1);
		assert.match(add.stderr, /npm package not found: not-a-real-package/);

		const list = runCli(projectPath, ['tech', 'list', '--json']);
		assert.equal(list.status, 0);
		assert.equal(parseJson(list.stdout).preferences.length, 0);
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
