import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import {
	existsSync,
	mkdtempSync,
	mkdirSync,
	readFileSync,
	rmSync,
	writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

const projectRoot = path.resolve(fileURLToPath(new URL('../..', import.meta.url)));
const packageJson = JSON.parse(readFileSync(path.join(projectRoot, 'package.json'), 'utf8'));

function createTempRoot(prefix) {
	return mkdtempSync(path.join(tmpdir(), prefix));
}

function removeTempRoot(rootPath) {
	rmSync(rootPath, { recursive: true, force: true });
}

function quoteShellArg(value) {
	return `"${String(value).replace(/"/g, '\\"')}"`;
}

function run(command, args, options = {}) {
	if (process.platform === 'win32') {
		return spawnSync([command, ...args.map(quoteShellArg)].join(' '), {
			encoding: 'utf8',
			shell: true,
			windowsHide: true,
			...options,
		});
	}

	return spawnSync(command, args, {
		encoding: 'utf8',
		windowsHide: true,
		...options,
	});
}

function npmCommand() {
	return 'npm';
}

function npxCommand() {
	return 'npx';
}

function parsePackResult(stdout) {
	const [pack] = JSON.parse(stdout);
	return pack;
}

function hasBinShim(projectPath, name) {
	return existsSync(path.join(projectPath, 'node_modules', '.bin', name)) ||
		existsSync(path.join(projectPath, 'node_modules', '.bin', `${name}.cmd`));
}

test('packed npm package installs and runs the public mf workflow', () => {
	const packRoot = createTempRoot('mustflow-pack-');
	const projectPath = createTempRoot('mustflow-install-');

	try {
		const pack = run(npmCommand(), ['pack', '--json', '--pack-destination', packRoot], {
			cwd: projectRoot,
		});

		assert.equal(pack.status, 0, pack.stderr || pack.stdout);
		const packed = parsePackResult(pack.stdout);
		const tarballPath = path.join(packRoot, packed.filename);
		assert.ok(existsSync(tarballPath));

		writeFileSync(path.join(projectPath, 'package.json'), '{"private":true,"type":"module"}\n');

		const install = run(npmCommand(), ['install', '--no-audit', '--no-fund', '--ignore-scripts', '--save-dev', tarballPath], {
			cwd: projectPath,
		});

		assert.equal(install.status, 0, install.stderr || install.stdout);
		assert.ok(existsSync(path.join(projectPath, 'node_modules', 'mustflow', 'templates', 'default', 'locales', 'en', 'AGENTS.md')));
		assert.ok(existsSync(path.join(projectPath, 'node_modules', 'mustflow', 'templates', 'default', 'locales', 'ko', 'AGENTS.md')));
		assert.ok(existsSync(path.join(projectPath, 'node_modules', 'mustflow', 'templates', 'default', 'common', '.mustflow', 'config', 'commands.toml')));
		assert.ok(existsSync(path.join(projectPath, 'node_modules', 'mustflow', 'schemas', 'doctor-report.schema.json')));
		assert.ok(existsSync(path.join(projectPath, 'node_modules', 'mustflow', 'schemas', 'context-report.schema.json')));
		assert.ok(existsSync(path.join(projectPath, 'node_modules', 'mustflow', 'schemas', 'run-receipt.schema.json')));
		assert.ok(existsSync(path.join(projectPath, 'node_modules', 'mustflow', 'schemas', 'commands.schema.json')));
		assert.equal(existsSync(path.join(projectPath, 'node_modules', 'mustflow', 'src')), false);
		assert.equal(existsSync(path.join(projectPath, 'node_modules', 'mustflow', 'tests')), false);
		assert.equal(existsSync(path.join(projectPath, 'node_modules', 'mustflow', 'docs-site')), false);
		assert.equal(hasBinShim(projectPath, 'mf'), true);
		assert.equal(hasBinShim(projectPath, 'mustflow'), true);

		const mfVersion = run(npxCommand(), ['mf', '--version'], { cwd: projectPath });
		assert.equal(mfVersion.status, 0, mfVersion.stderr || mfVersion.stdout);
		assert.equal(mfVersion.stdout.trim(), packageJson.version);

		const mustflowVersion = run(npxCommand(), ['mustflow', '--version'], { cwd: projectPath });
		assert.equal(mustflowVersion.status, 0, mustflowVersion.stderr || mustflowVersion.stdout);
		assert.equal(mustflowVersion.stdout.trim(), packageJson.version);

		const dryRun = run(
			npxCommand(),
			[
				'mf',
				'init',
				'--dry-run',
				'--profile',
				'product',
				'--locale',
				'ko',
				'--agent-lang',
				'ko',
				'--product-source-locale',
				'en',
				'--product-locale',
				'ko-KR',
			],
			{ cwd: projectPath },
		);
		assert.equal(dryRun.status, 0, dryRun.stderr || dryRun.stdout);
		assert.equal(existsSync(path.join(projectPath, 'AGENTS.md')), false);

		const init = run(
			npxCommand(),
			[
				'mf',
				'init',
				'--yes',
				'--profile',
				'product',
				'--locale',
				'ko',
				'--agent-lang',
				'ko',
				'--product-source-locale',
				'en',
				'--product-locale',
				'ko-KR',
			],
			{ cwd: projectPath },
		);
		assert.equal(init.status, 0, init.stderr || init.stdout);
		assert.ok(existsSync(path.join(projectPath, 'AGENTS.md')));
		assert.ok(existsSync(path.join(projectPath, '.mustflow', 'config', 'manifest.lock.toml')));
		assert.match(readFileSync(path.join(projectPath, 'AGENTS.md'), 'utf8'), /locale: ko/);
		const preferences = readFileSync(path.join(projectPath, '.mustflow', 'config', 'preferences.toml'), 'utf8');
		assert.match(preferences, /profile = "product"/);
		assert.match(preferences, /agent_response = "ko"/);
		assert.match(preferences, /source_locale = "en"/);
		assert.match(preferences, /target_locales = \["ko-KR"\]/);

		const check = run(npxCommand(), ['mf', 'check', '--strict', '--json'], { cwd: projectPath });
		assert.equal(check.status, 0, check.stderr || check.stdout);
		const checkJson = JSON.parse(check.stdout);
		assert.equal(checkJson.ok, true);
		assert.equal(checkJson.strict, true);

		const doctor = run(npxCommand(), ['mf', 'doctor', '--strict', '--json'], { cwd: projectPath });
		assert.equal(doctor.status, 0, doctor.stderr || doctor.stdout);
		const doctorJson = JSON.parse(doctor.stdout);
		assert.equal(doctorJson.ok, true);
		assert.equal(doctorJson.strict, true);
		assert.ok(doctorJson.context.runnable_intents.includes('mustflow_check'));

		const nestedPath = path.join(projectPath, 'src', 'feature', 'deep');
		mkdirSync(nestedPath, { recursive: true });

		const nestedContext = run(npxCommand(), ['mf', 'context', '--json'], { cwd: nestedPath });
		assert.equal(nestedContext.status, 0, nestedContext.stderr || nestedContext.stdout);
		const nestedContextJson = JSON.parse(nestedContext.stdout);
		assert.equal(path.resolve(nestedContextJson.mustflow_root), path.resolve(projectPath));

		const runCheck = run(npxCommand(), ['mf', 'run', 'mustflow_check', '--json'], { cwd: nestedPath });
		assert.equal(runCheck.status, 0, runCheck.stderr || runCheck.stdout);
		const runCheckJson = JSON.parse(runCheck.stdout);
		assert.equal(runCheckJson.intent, 'mustflow_check');
		assert.equal(runCheckJson.status, 'passed');
		assert.equal(existsSync(path.join(projectPath, '.mustflow', 'state', 'runs', 'latest.json')), true);

		const status = run(npxCommand(), ['mf', 'status', '--json'], { cwd: projectPath });
		assert.equal(status.status, 0, status.stderr || status.stdout);
		const statusJson = JSON.parse(status.stdout);
		assert.equal(statusJson.installed, true);
		assert.equal(statusJson.manifestLock, 'present');
		assert.equal(statusJson.changedFiles.length, 0);

		const context = run(npxCommand(), ['mf', 'context', '--json'], { cwd: projectPath });
		assert.equal(context.status, 0, context.stderr || context.stdout);
		const contextJson = JSON.parse(context.stdout);
		assert.equal(contextJson.installed, true);
		assert.equal(contextJson.command_contract.exists, true);
		assert.ok(contextJson.command_contract.runnable_intents.includes('mustflow_check'));

		const index = run(npxCommand(), ['mf', 'index', '--json'], { cwd: projectPath });
		assert.equal(index.status, 0, index.stderr || index.stdout);
		const indexJson = JSON.parse(index.stdout);
		const indexPath = path.join(projectPath, '.mustflow', 'cache', 'mustflow.sqlite');
		assert.equal(indexJson.ok, true);
		assert.equal(indexJson.wrote_files, true);
		assert.equal(readFileSync(indexPath).subarray(0, 16).toString('utf8'), 'SQLite format 3\0');

		const search = run(npxCommand(), ['mf', 'search', 'mustflow_check', '--json'], { cwd: projectPath });
		assert.equal(search.status, 0, search.stderr || search.stdout);
		const searchJson = JSON.parse(search.stdout);
		assert.equal(searchJson.ok, true);
		assert.ok(searchJson.results.some((item) => item.kind === 'command_intent' && item.name === 'mustflow_check'));

		const update = run(npxCommand(), ['mf', 'update', '--dry-run', '--json'], { cwd: projectPath });
		assert.equal(update.status, 0, update.stderr || update.stdout);
		const updateJson = JSON.parse(update.stdout);
		assert.equal(updateJson.ok, true);
		assert.equal(updateJson.wroteFiles, false);

		const map = run(npxCommand(), ['mf', 'map', '--write'], { cwd: projectPath });
		assert.equal(map.status, 0, map.stderr || map.stdout);
		assert.match(readFileSync(path.join(projectPath, 'REPO_MAP.md'), 'utf8'), /Priority Anchors/);
	} finally {
		removeTempRoot(packRoot);
		removeTempRoot(projectPath);
	}
});
