import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { spawn, spawnSync } from 'node:child_process';
import { cpSync, existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
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

function addLegacyRouteCatalog(projectPath, content) {
	const relativePath = '.mustflow/skills/catalog.v1.json';
	const catalogPath = path.join(projectPath, ...relativePath.split('/'));
	const lockPath = path.join(projectPath, '.mustflow', 'config', 'manifest.lock.toml');
	const contentHash = `sha256:${createHash('sha256').update(content).digest('hex')}`;

	writeFileSync(catalogPath, content);
	writeFileSync(
		lockPath,
		`${readFileSync(lockPath, 'utf8')}\n[files."${relativePath}"]\nsource = "template_locale"\nlast_action = "created"\ncontent_hash = "${contentHash}"\n`,
	);
}

function createTemplateWithAgentsUpdate() {
	const templatePath = createTempProject('mustflow-upgrade-template-');
	cpSync(path.join(projectRoot, 'templates', 'default'), templatePath, { recursive: true });
	const agentsPath = path.join(templatePath, 'locales', 'en', 'AGENTS.md');
	const updatedAgents = `${readFileSync(agentsPath, 'utf8')}\n<!-- simulated upgrade template update -->\n`;
	writeFileSync(agentsPath, updatedAgents);
	return { templatePath, updatedAgents };
}

function createTemplateWithoutProductSkill(skillName) {
	const templatePath = createTempProject('mustflow-upgrade-template-old-skill-');
	cpSync(path.join(projectRoot, 'templates', 'default'), templatePath, { recursive: true });
	const manifestPath = path.join(templatePath, 'manifest.toml');
	const skillPath = `.mustflow/skills/${skillName}/SKILL.md`;
	const manifest = readFileSync(manifestPath, 'utf8')
		.split(/\r?\n/u)
		.filter((line) => line.trim() !== `"${skillPath}",` && line.trim() !== `"${skillName}",`)
		.join('\n');

	writeFileSync(manifestPath, manifest);
	return templatePath;
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
				MUSTFLOW_ALLOW_DEV_TEMPLATE_ROOT: '1',
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

test('upgrade installs a newly bundled skill selected by the locked product profile', async () => {
	const projectPath = createTempProject();
	const skillName = 'ai-game-asset-production';
	const skillPath = path.join(projectPath, '.mustflow', 'skills', skillName, 'SKILL.md');
	const oldTemplatePath = createTemplateWithoutProductSkill(skillName);

	try {
		const init = runCli(projectPath, ['init', '--profile', 'product', '--yes'], {
			MUSTFLOW_DEV_TEMPLATE_ROOT: oldTemplatePath,
			MUSTFLOW_ALLOW_DEV_TEMPLATE_ROOT: '1',
		});
		assert.equal(init.status, 0, init.stderr || init.stdout);
		assert.equal(existsSync(skillPath), false);

		const result = await withPackageVersion(packageJson.version, (registryUrl) =>
			runCliAsync(projectPath, ['upgrade'], {
				MUSTFLOW_NPM_REGISTRY_URL: registryUrl,
			}),
		);
		const expectedSkill = readFileSync(
			path.join(projectRoot, 'templates', 'default', 'locales', 'en', '.mustflow', 'skills', skillName, 'SKILL.md'),
			'utf8',
		);
		const lock = readFileSync(path.join(projectPath, '.mustflow', 'config', 'manifest.lock.toml'), 'utf8');

		assert.equal(result.status, 0, result.stderr || result.stdout);
		assert.match(result.stdout, /mustflow update complete/u);
		assert.equal(readFileSync(skillPath, 'utf8'), expectedSkill);
		assert.match(lock, /\[files\."\.mustflow\/skills\/ai-game-asset-production\/SKILL\.md"\]/u);
	} finally {
		removeTempProject(projectPath);
		removeTempProject(oldTemplatePath);
	}
});

test('upgrade migrates a clean lock-tracked route catalog from v1 to v2', async () => {
	const projectPath = createTempProject();
	const legacyRelativePath = '.mustflow/skills/catalog.v1.json';

	try {
		copyInitializedProject(projectPath);
		addLegacyRouteCatalog(projectPath, '{"schema_version":"1","routes":[]}\n');

		const result = await withPackageVersion(packageJson.version, (registryUrl) =>
			runCliAsync(projectPath, ['upgrade'], {
				MUSTFLOW_NPM_REGISTRY_URL: registryUrl,
			}),
		);
		const lock = readFileSync(path.join(projectPath, '.mustflow', 'config', 'manifest.lock.toml'), 'utf8');

		assert.equal(result.status, 0, result.stderr || result.stdout);
		assert.match(result.stdout, /Removed \.mustflow\/skills\/catalog\.v1\.json/u);
		assert.match(result.stdout, /removed/u);
		assert.equal(existsSync(path.join(projectPath, ...legacyRelativePath.split('/'))), false);
		assert.equal(existsSync(path.join(projectPath, '.mustflow', 'skills', 'catalog.v2.json')), true);
		assert.doesNotMatch(lock, /catalog\.v1\.json/u);
	} finally {
		removeTempProject(projectPath);
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
				MUSTFLOW_ALLOW_DEV_TEMPLATE_ROOT: '1',
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
				MUSTFLOW_ALLOW_DEV_TEMPLATE_ROOT: '1',
			}),
		);

		assert.equal(result.status, 1);
		assert.match(result.stdout, /latest 999\.0\.0 available/);
		assert.match(result.stdout, /Update commands:/);
		assert.match(result.stdout, /npm: npm install -g mustflow@latest/);
		assert.match(result.stdout, /bun: bun add -g mustflow@latest/);
		assert.match(result.stdout, /pnpm: pnpm add -g mustflow@latest/);
		assert.match(result.stdout, /yarn: yarn global add mustflow@latest/);
		assert.match(result.stdout, /deno: deno install -g -A -n mf npm:mustflow@latest/);
		assert.match(result.stdout, /No project files were written/);
		assert.equal(readFileSync(path.join(projectPath, 'AGENTS.md'), 'utf8'), originalAgents);
	} finally {
		removeTempProject(projectPath);
		removeTempProject(templatePath);
	}
});

test('upgrade prefers the detected install manager in update guidance', async () => {
	const projectPath = createTempProject();
	const { templatePath } = createTemplateWithAgentsUpdate();

	try {
		copyInitializedProject(projectPath);
		const result = await withPackageVersion('999.0.0', (registryUrl) =>
			runCliAsync(projectPath, ['upgrade'], {
				MUSTFLOW_NPM_REGISTRY_URL: registryUrl,
				MUSTFLOW_DEV_TEMPLATE_ROOT: templatePath,
				MUSTFLOW_ALLOW_DEV_TEMPLATE_ROOT: '1',
				npm_config_user_agent: 'bun/1.3.14 node/v24.0.0 win32 x64',
				npm_execpath: '',
			}),
		);

		assert.equal(result.status, 1);
		assert.match(result.stdout, /Update commands:\r?\nbun: bun add -g mustflow@latest/);
		assert.match(result.stdout, /npm: npm install -g mustflow@latest/);
		assert.match(result.stdout, /No project files were written/);
	} finally {
		removeTempProject(projectPath);
		removeTempProject(templatePath);
	}
});

test('upgrade does not infer install manager from unrelated path substrings', async () => {
	const projectPath = createTempProject();
	const { templatePath } = createTemplateWithAgentsUpdate();

	try {
		copyInitializedProject(projectPath);
		const result = await withPackageVersion('999.0.0', (registryUrl) =>
			runCliAsync(projectPath, ['upgrade'], {
				MUSTFLOW_NPM_REGISTRY_URL: registryUrl,
				MUSTFLOW_DEV_TEMPLATE_ROOT: templatePath,
				MUSTFLOW_ALLOW_DEV_TEMPLATE_ROOT: '1',
				npm_config_user_agent: '',
				npm_execpath: path.join(projectPath, 'bun-projects', 'runner.js'),
			}),
		);

		assert.equal(result.status, 1);
		assert.match(result.stdout, /Update commands:\r?\nnpm: npm install -g mustflow@latest/);
		assert.doesNotMatch(result.stdout, /Update commands:\r?\nbun: bun add -g mustflow@latest/);
	} finally {
		removeTempProject(projectPath);
		removeTempProject(templatePath);
	}
});
