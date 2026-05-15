import assert from 'node:assert/strict';
import { spawn, spawnSync } from 'node:child_process';
import { cpSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:http';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { after, before, test } from 'node:test';
import { fileURLToPath } from 'node:url';

const projectRoot = path.resolve(fileURLToPath(new URL('../..', import.meta.url)));
const cliPath = path.join(projectRoot, 'dist', 'cli', 'index.js');
const packageJson = JSON.parse(readFileSync(path.join(projectRoot, 'package.json'), 'utf8'));
let initializedProjectFixture;

function createTempProject(prefix = 'mustflow-upgrade-') {
	return mkdtempSync(path.join(tmpdir(), prefix));
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

function copyInitializedProject(projectPath) {
	assert.ok(initializedProjectFixture, 'initialized project fixture should be ready');
	cpSync(initializedProjectFixture, projectPath, { recursive: true });
}

function createTemplateWithAgentsUpdate() {
	const templatePath = createTempProject('mustflow-upgrade-template-');
	cpSync(path.join(projectRoot, 'templates', 'default'), templatePath, { recursive: true });
	const agentsPath = path.join(templatePath, 'locales', 'en', 'AGENTS.md');
	const updatedAgents = `${readFileSync(agentsPath, 'utf8')}\n<!-- simulated upgrade template update -->\n`;
	writeFileSync(agentsPath, updatedAgents);
	return { templatePath, updatedAgents };
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

async function withPackageVersion(version, callback) {
	const server = createServer((request, response) => {
		response.writeHead(200, { 'content-type': 'application/json' });
		response.end(JSON.stringify({ name: packageJson.name, version }));
	});
	const address = await listen(server);

	try {
		return await callback(`http://127.0.0.1:${address.port}`);
	} finally {
		await closeServer(server);
	}
}

before(() => {
	initializedProjectFixture = createTempProject('mustflow-upgrade-fixture-');
	const result = runCli(initializedProjectFixture, ['init', '--yes']);
	assert.equal(result.status, 0, result.stderr || result.stdout);
});

after(() => {
	if (initializedProjectFixture) {
		removeTempProject(initializedProjectFixture);
	}
});

test('upgrade applies safe project template updates when the package is current', async () => {
	const projectPath = createTempProject();
	const { templatePath, updatedAgents } = createTemplateWithAgentsUpdate();

	try {
		copyInitializedProject(projectPath);
		const result = await withPackageVersion(packageJson.version, (registryUrl) =>
			runCliAsync(projectPath, ['upgrade'], {
				MUSTFLOW_NPM_REGISTRY_URL: registryUrl,
				MUSTFLOW_DEV_TEMPLATE_ROOT: templatePath,
			}),
		);

		assert.equal(result.status, 0, result.stderr || result.stdout);
		assert.match(result.stdout, /mustflow upgrade/);
		assert.match(result.stdout, /Package:/);
		assert.match(result.stdout, /Project template:/);
		assert.match(result.stdout, /mustflow update complete/);
		assert.equal(readFileSync(path.join(projectPath, 'AGENTS.md'), 'utf8'), updatedAgents);
	} finally {
		removeTempProject(projectPath);
		removeTempProject(templatePath);
	}
});

test('upgrade dry-run prints the safe update plan without writing project files', async () => {
	const projectPath = createTempProject();
	const { templatePath } = createTemplateWithAgentsUpdate();

	try {
		copyInitializedProject(projectPath);
		const originalAgents = readFileSync(path.join(projectPath, 'AGENTS.md'), 'utf8');
		const result = await withPackageVersion(packageJson.version, (registryUrl) =>
			runCliAsync(projectPath, ['upgrade', '--dry-run'], {
				MUSTFLOW_NPM_REGISTRY_URL: registryUrl,
				MUSTFLOW_DEV_TEMPLATE_ROOT: templatePath,
			}),
		);

		assert.equal(result.status, 0, result.stderr || result.stdout);
		assert.match(result.stdout, /Would update: 1/);
		assert.match(result.stdout, /No files were written/);
		assert.equal(readFileSync(path.join(projectPath, 'AGENTS.md'), 'utf8'), originalAgents);
	} finally {
		removeTempProject(projectPath);
		removeTempProject(templatePath);
	}
});

test('upgrade stops before project writes when a newer package is available', async () => {
	const projectPath = createTempProject();
	const { templatePath } = createTemplateWithAgentsUpdate();

	try {
		copyInitializedProject(projectPath);
		const originalAgents = readFileSync(path.join(projectPath, 'AGENTS.md'), 'utf8');
		const result = await withPackageVersion('999.0.0', (registryUrl) =>
			runCliAsync(projectPath, ['upgrade'], {
				MUSTFLOW_NPM_REGISTRY_URL: registryUrl,
				MUSTFLOW_DEV_TEMPLATE_ROOT: templatePath,
			}),
		);

		assert.equal(result.status, 1);
		assert.match(result.stdout, /latest 999\.0\.0 available/);
		assert.match(result.stdout, /Update command:/);
		assert.match(result.stdout, /No project files were written/);
		assert.equal(readFileSync(path.join(projectPath, 'AGENTS.md'), 'utf8'), originalAgents);
	} finally {
		removeTempProject(projectPath);
		removeTempProject(templatePath);
	}
});
