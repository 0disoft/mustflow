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

const defaultProcessTimeoutMilliseconds = 80_000;
const defaultProcessBufferBytes = 16 * 1024 * 1024;
const defaultRetryDelaysMilliseconds = [1_500, 4_000];

export class CommandExecutionError extends Error {
	constructor(message, details = {}) {
		super(message, details.cause ? { cause: details.cause } : undefined);
		this.name = 'CommandExecutionError';
		this.command = details.command;
		this.args = details.args ?? [];
		this.cwd = details.cwd;
		this.status = details.status;
		this.stdout = details.stdout ?? '';
		this.stderr = details.stderr ?? '';
	}
}

function sanitizeProcessOutput(value) {
	return String(value ?? '')
		.replace(/([a-z][a-z0-9+.-]*:\/\/)[^\s/@:]+:[^\s/@]+@/giu, '$1[redacted]@')
		.replace(/(_authToken=)[^\s]+/giu, '$1[redacted]');
}

export function formatSmokeError(error) {
	if (error instanceof AggregateError) {
		return [error.message, ...error.errors.map((entry) => formatSmokeError(entry))].join('\n');
	}
	return sanitizeProcessOutput(error instanceof Error ? error.message : String(error));
}

export function normalizeRegistryUrl(value) {
	const registryUrl = new URL(value);
	if (!['http:', 'https:'].includes(registryUrl.protocol)) {
		throw new Error(`Unsupported npm registry protocol: ${registryUrl.protocol}`);
	}
	if (registryUrl.username || registryUrl.password) {
		throw new Error('MUSTFLOW_NPM_REGISTRY_URL must not contain credentials; use npm authentication configuration instead.');
	}
	if (registryUrl.search || registryUrl.hash) {
		throw new Error('MUSTFLOW_NPM_REGISTRY_URL must not contain a query string or fragment.');
	}
	if (!registryUrl.pathname.endsWith('/')) {
		registryUrl.pathname = `${registryUrl.pathname}/`;
	}
	return registryUrl;
}

export function createProcessRunner({
	env = process.env,
	timeoutMilliseconds = defaultProcessTimeoutMilliseconds,
	maxBufferBytes = defaultProcessBufferBytes,
} = {}) {
	return (command, args, cwd) => {
		const result = spawnSync(command, args, {
			cwd,
			encoding: 'utf8',
			env,
			maxBuffer: maxBufferBytes,
			timeout: timeoutMilliseconds,
			windowsHide: true,
		});

		if (result.error) {
			throw new CommandExecutionError(`${command} failed to start: ${result.error.message}`, {
				command,
				args,
				cwd,
				stdout: result.stdout,
				stderr: result.stderr,
				cause: result.error,
			});
		}
		if (result.status !== 0) {
			const output = [result.stderr, result.stdout].filter(Boolean).join('\n').trim();
			throw new CommandExecutionError(
				sanitizeProcessOutput(output || `${command} exited with status ${result.status ?? 'unknown'}.`),
				{
					command,
					args,
					cwd,
					status: result.status,
					stdout: result.stdout,
					stderr: result.stderr,
				},
			);
		}

		return result;
	};
}

function resolveNpmCliPath({ env, execPath, fileExists }) {
	const candidates = [
		typeof env.npm_execpath === 'string' && path.basename(env.npm_execpath) === 'npm-cli.js'
			? env.npm_execpath
			: undefined,
		path.join(path.dirname(execPath), 'node_modules', 'npm', 'bin', 'npm-cli.js'),
	].filter((candidate) => typeof candidate === 'string' && candidate.length > 0);

	return candidates.find((candidate) => fileExists(candidate));
}

export function createNpmRunner({
	runProcess = createProcessRunner(),
	env = process.env,
	execPath = process.execPath,
	platform = process.platform,
	fileExists = existsSync,
} = {}) {
	if (platform !== 'win32') {
		return (args, cwd) => runProcess('npm', args, cwd);
	}

	const npmCliPath = resolveNpmCliPath({ env, execPath, fileExists });
	if (!npmCliPath) {
		throw new Error('Unable to locate npm-cli.js from npm_execpath or next to the active Node.js runtime.');
	}
	return (args, cwd) => runProcess(execPath, [npmCliPath, ...args], cwd);
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

function assertBinShim(projectRoot, binName) {
	const binRoot = path.join(projectRoot, 'node_modules', '.bin');
	const candidates = process.platform === 'win32'
		? [path.join(binRoot, `${binName}.cmd`), path.join(binRoot, binName)]
		: [path.join(binRoot, binName)];

	if (!candidates.some((candidate) => existsSync(candidate))) {
		throw new Error(`npm did not create the ${binName} executable shim.`);
	}
}

function commandFailureText(error) {
	if (error instanceof CommandExecutionError) {
		return [error.message, error.stderr, error.stdout].filter(Boolean).join('\n');
	}
	return error instanceof Error ? error.message : String(error);
}

export function isRetryableRegistryFailure(error) {
	return /\b(?:E404|ETARGET|EAI_AGAIN|ECONNRESET|ECONNREFUSED|ETIMEDOUT|ERR_SOCKET_TIMEOUT)\b|\bHTTP\s+(?:408|429|5\d\d)\b/iu
		.test(commandFailureText(error));
}

function parseStrictCheck(stdout) {
	try {
		return JSON.parse(stdout);
	} catch (error) {
		throw new Error(`Installed mf check did not return JSON: ${error instanceof Error ? error.message : String(error)}`);
	}
}

async function installPublishedPackage({
	runNpm,
	installArgs,
	projectRoot,
	retryDelaysMilliseconds,
	sleep,
	onRetry,
}) {
	for (let attempt = 0; ; attempt += 1) {
		try {
			return await runNpm(installArgs, projectRoot);
		} catch (error) {
			const retryDelay = retryDelaysMilliseconds[attempt];
			if (retryDelay === undefined || !isRetryableRegistryFailure(error)) {
				throw error;
			}

			rmSync(path.join(projectRoot, 'node_modules'), { recursive: true, force: true });
			rmSync(path.join(projectRoot, 'package-lock.json'), { force: true });
			onRetry({ attempt: attempt + 1, delayMilliseconds: retryDelay, error });
			await sleep(retryDelay);
		}
	}
}

export async function smokePublishedPackage({
	packageJson,
	env = process.env,
	runNpm = createNpmRunner({ env }),
	tempParent = tmpdir(),
	retryDelaysMilliseconds = defaultRetryDelaysMilliseconds,
	sleep = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds)),
	onRetry = ({ attempt, delayMilliseconds }) => {
		console.warn(`Published package install attempt ${attempt} hit a transient registry error; retrying in ${delayMilliseconds}ms.`);
	},
	logger = console.log,
	removeDirectory = (directory) => rmSync(directory, { recursive: true, force: true }),
} = {}) {
	if (!packageJson || typeof packageJson.name !== 'string' || packageJson.name.length === 0) {
		throw new Error('package.json must define a package name.');
	}
	if (typeof packageJson.version !== 'string' || packageJson.version.length === 0) {
		throw new Error('package.json must define a package version.');
	}

	const registryUrl = normalizeRegistryUrl(
		env.MUSTFLOW_NPM_REGISTRY_URL || 'https://registry.npmjs.org/',
	);
	const packageSpec = `${packageJson.name}@${packageJson.version}`;
	const tempRoot = mkdtempSync(path.join(tempParent, 'mustflow-npm-release-smoke-'));
	const projectRoot = path.join(tempRoot, 'project');
	const cacheRoot = path.join(tempRoot, 'npm-cache');
	let primaryError;

	try {
		mkdirSync(projectRoot);
		mkdirSync(cacheRoot);
		writeFileSync(
			path.join(projectRoot, 'package.json'),
			`${JSON.stringify({ private: true, type: 'module' }, null, 2)}\n`,
		);

		const npmVersionResult = await runNpm(['--version'], projectRoot);
		await installPublishedPackage({
			runNpm,
			installArgs: [
				'install',
				'--ignore-scripts',
				'--no-audit',
				'--no-fund',
				'--save-exact',
				'--prefer-online',
				'--cache',
				cacheRoot,
				'--registry',
				registryUrl.href,
				packageSpec,
			],
			projectRoot,
			retryDelaysMilliseconds,
			sleep,
			onRetry,
		});

		const installedPackageRoot = path.join(projectRoot, 'node_modules', ...packageJson.name.split('/'));
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
		if (!installedPackageJson.bin || typeof installedPackageJson.bin !== 'object') {
			throw new Error(`Installed ${packageJson.name} package does not define bin mappings.`);
		}

		const requiredBins = ['mf', 'mustflow'];
		for (const binName of requiredBins) {
			resolveInstalledPackageFile(installedPackageRoot, installedPackageJson.bin[binName], `${binName} bin target`);
			assertBinShim(projectRoot, binName);

			const versionResult = await runNpm(
				['exec', `--package=${packageJson.name}`, '--cache', cacheRoot, '--offline', '--yes=false', '--', binName, '--version'],
				projectRoot,
			);
			if (versionResult.stdout.trim() !== packageJson.version) {
				throw new Error(
					`Installed ${binName} reported ${versionResult.stdout.trim() || 'no version'}; expected ${packageJson.version}.`,
				);
			}
		}

		await runNpm(
			['exec', `--package=${packageJson.name}`, '--cache', cacheRoot, '--offline', '--yes=false', '--', 'mf', 'init', '--yes'],
			projectRoot,
		);
		const checkResult = await runNpm(
			['exec', `--package=${packageJson.name}`, '--cache', cacheRoot, '--offline', '--yes=false', '--', 'mf', 'check', '--strict', '--json'],
			projectRoot,
		);
		const checkReport = parseStrictCheck(checkResult.stdout);
		if (checkReport.ok !== true || checkReport.strict !== true) {
			throw new Error('Installed mf strict check did not report ok=true and strict=true.');
		}

		const evidence = {
			packageSpec,
			registry: registryUrl.href,
			platform: process.platform,
			nodeVersion: process.version,
			npmVersion: npmVersionResult.stdout.trim(),
			bins: requiredBins,
		};
		logger(
			`${packageSpec} installed from ${registryUrl.href} and passed the isolated public CLI smoke test ` +
			`(${evidence.platform}, Node ${evidence.nodeVersion}, npm ${evidence.npmVersion}).`,
		);
		return evidence;
	} catch (error) {
		primaryError = error;
		throw error;
	} finally {
		try {
			removeDirectory(tempRoot);
		} catch (cleanupError) {
			if (primaryError) {
				throw new AggregateError(
					[primaryError, cleanupError],
					'Published package smoke failed and its temporary directory cleanup also failed.',
				);
			}
			throw cleanupError;
		}
	}
}
