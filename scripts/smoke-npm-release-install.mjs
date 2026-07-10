import { spawnSync } from 'node:child_process';
import {
	existsSync,
	mkdtempSync,
	mkdirSync,
	readFileSync,
	realpathSync,
	rmSync,
	writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const packageJson = JSON.parse(readFileSync(path.join(projectRoot, 'package.json'), 'utf8'));
const processTimeoutMilliseconds = 240_000;
const processBufferBytes = 16 * 1024 * 1024;

function normalizeRegistryUrl(value) {
	const registryUrl = new URL(value);
	if (!['http:', 'https:'].includes(registryUrl.protocol)) {
		throw new Error(`Unsupported npm registry protocol: ${registryUrl.protocol}`);
	}
	if (!registryUrl.pathname.endsWith('/')) {
		registryUrl.pathname = `${registryUrl.pathname}/`;
	}
	return registryUrl;
}

function run(command, args, cwd) {
	const result = spawnSync(command, args, {
		cwd,
		encoding: 'utf8',
		env: process.env,
		maxBuffer: processBufferBytes,
		timeout: processTimeoutMilliseconds,
		windowsHide: true,
	});

	if (result.error) {
		throw result.error;
	}
	if (result.status !== 0) {
		const output = [result.stderr, result.stdout].filter(Boolean).join('\n').trim();
		throw new Error(output || `${command} exited with status ${result.status ?? 'unknown'}.`);
	}

	return result;
}

function runNpm(args, cwd) {
	if (process.platform !== 'win32') {
		return run('npm', args, cwd);
	}

	const npmCliPath = path.join(path.dirname(process.execPath), 'node_modules', 'npm', 'bin', 'npm-cli.js');
	if (!existsSync(npmCliPath)) {
		throw new Error(`Unable to locate npm CLI next to Node.js: ${npmCliPath}`);
	}
	return run(process.execPath, [npmCliPath, ...args], cwd);
}

function resolveInstalledPackageFile(packageRoot, relativePath, label) {
	if (typeof relativePath !== 'string' || relativePath.length === 0 || path.isAbsolute(relativePath)) {
		throw new Error(`${label} must be a non-empty package-relative path.`);
	}

	const resolvedPath = path.resolve(packageRoot, relativePath);
	const relativeResolvedPath = path.relative(packageRoot, resolvedPath);
	if (relativeResolvedPath === '..' || relativeResolvedPath.startsWith(`..${path.sep}`) || path.isAbsolute(relativeResolvedPath)) {
		throw new Error(`${label} escapes the installed package root.`);
	}
	if (!existsSync(resolvedPath)) {
		throw new Error(`${label} does not exist in the installed package: ${relativePath}`);
	}

	const realPackageRoot = realpathSync(packageRoot);
	const realResolvedPath = realpathSync(resolvedPath);
	const relativeRealPath = path.relative(realPackageRoot, realResolvedPath);
	if (relativeRealPath === '..' || relativeRealPath.startsWith(`..${path.sep}`) || path.isAbsolute(relativeRealPath)) {
		throw new Error(`${label} resolves outside the installed package root.`);
	}

	return realResolvedPath;
}

function assertBinShim(installRoot, binName) {
	const binRoot = path.join(installRoot, 'node_modules', '.bin');
	const candidates = process.platform === 'win32'
		? [path.join(binRoot, `${binName}.cmd`), path.join(binRoot, binName)]
		: [path.join(binRoot, binName)];

	if (!candidates.some((candidate) => existsSync(candidate))) {
		throw new Error(`npm did not create the ${binName} executable shim.`);
	}
}

function parseStrictCheck(stdout) {
	try {
		return JSON.parse(stdout);
	} catch (error) {
		throw new Error(`Installed mf check did not return JSON: ${error instanceof Error ? error.message : String(error)}`);
	}
}

function smokePublishedPackage() {
	if (typeof packageJson.name !== 'string' || packageJson.name.length === 0) {
		throw new Error('package.json must define a package name.');
	}
	if (typeof packageJson.version !== 'string' || packageJson.version.length === 0) {
		throw new Error('package.json must define a package version.');
	}

	const registryUrl = normalizeRegistryUrl(
		process.env.MUSTFLOW_NPM_REGISTRY_URL || 'https://registry.npmjs.org/',
	);
	const packageSpec = `${packageJson.name}@${packageJson.version}`;
	const tempRoot = mkdtempSync(path.join(tmpdir(), 'mustflow-npm-release-smoke-'));
	const installRoot = path.join(tempRoot, 'install');
	const smokeProjectRoot = path.join(tempRoot, 'project');

	try {
		mkdirSync(installRoot);
		mkdirSync(smokeProjectRoot);
		writeFileSync(
			path.join(installRoot, 'package.json'),
			`${JSON.stringify({ private: true, type: 'module' }, null, 2)}\n`,
		);

		runNpm(
			[
				'install',
				'--ignore-scripts',
				'--no-audit',
				'--no-fund',
				'--save-exact',
				'--registry',
				registryUrl.href,
				packageSpec,
			],
			installRoot,
		);

		const installedPackageRoot = path.join(installRoot, 'node_modules', ...packageJson.name.split('/'));
		const installedPackageJsonPath = path.join(installedPackageRoot, 'package.json');
		if (!existsSync(installedPackageJsonPath)) {
			throw new Error(`npm install did not create ${installedPackageJsonPath}.`);
		}

		const installedPackageJson = JSON.parse(readFileSync(installedPackageJsonPath, 'utf8'));
		if (installedPackageJson.name !== packageJson.name || installedPackageJson.version !== packageJson.version) {
			throw new Error(
				`Expected ${packageSpec}, received ${installedPackageJson.name ?? 'unknown'}@${installedPackageJson.version ?? 'unknown'}.`,
			);
		}

		const requiredBins = ['mf', 'mustflow'];
		for (const binName of requiredBins) {
			if (!installedPackageJson.bin || typeof installedPackageJson.bin !== 'object') {
				throw new Error(`Installed ${packageJson.name} package does not define bin mappings.`);
			}
			resolveInstalledPackageFile(installedPackageRoot, installedPackageJson.bin[binName], `${binName} bin target`);
			assertBinShim(installRoot, binName);
		}

		const cliPath = resolveInstalledPackageFile(installedPackageRoot, installedPackageJson.bin.mf, 'mf bin target');
		const versionResult = run(process.execPath, [cliPath, '--version'], smokeProjectRoot);
		if (versionResult.stdout.trim() !== packageJson.version) {
			throw new Error(`Installed mf reported ${versionResult.stdout.trim() || 'no version'}; expected ${packageJson.version}.`);
		}

		run(process.execPath, [cliPath, 'init', '--yes'], smokeProjectRoot);
		const checkResult = run(process.execPath, [cliPath, 'check', '--strict', '--json'], smokeProjectRoot);
		const checkReport = parseStrictCheck(checkResult.stdout);
		if (checkReport.ok !== true) {
			throw new Error('Installed mf strict check reported ok=false.');
		}

		console.log(`${packageSpec} installed and passed the isolated CLI smoke test.`);
	} finally {
		rmSync(tempRoot, { recursive: true, force: true });
	}
}

try {
	smokePublishedPackage();
} catch (error) {
	console.error(error instanceof Error ? error.message : String(error));
	process.exitCode = 1;
}
