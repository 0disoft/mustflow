import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import path from 'node:path';

export function parseReleasePackageJson(rawPackageJson, sourceLabel) {
	let packageJson;
	try {
		packageJson = JSON.parse(rawPackageJson);
	} catch (error) {
		throw new Error(`${sourceLabel} must contain valid JSON: ${error instanceof Error ? error.message : String(error)}`);
	}

	if (!packageJson || typeof packageJson !== 'object' || Array.isArray(packageJson)) {
		throw new Error(`${sourceLabel} must contain a JSON object.`);
	}

	if (typeof packageJson.name !== 'string' || packageJson.name.length === 0) {
		throw new Error(`${sourceLabel} must define a package name.`);
	}

	if (typeof packageJson.version !== 'string' || packageJson.version.length === 0) {
		throw new Error(`${sourceLabel} must define a package version.`);
	}

	return packageJson;
}

export function readWorkingTreeReleasePackageJson(projectRoot) {
	return parseReleasePackageJson(
		readFileSync(path.join(projectRoot, 'package.json'), 'utf8'),
		'package.json',
	);
}

export function readCommittedReleasePackageJson(projectRoot, revision = 'HEAD', options = {}) {
	if (typeof revision !== 'string' || revision.length === 0) {
		throw new Error('A non-empty Git revision is required to read committed release metadata.');
	}

	const execute = options.spawnSync ?? spawnSync;
	const result = execute('git', ['show', `${revision}:package.json`], {
		cwd: projectRoot,
		encoding: 'utf8',
		shell: false,
		stdio: 'pipe',
	});

	if (result.error) {
		throw result.error;
	}

	if (result.status !== 0) {
		const detail = result.stderr?.trim() || result.stdout?.trim() || `exit ${result.status ?? 'unknown'}`;
		throw new Error(`Could not read package.json from Git revision ${revision}: ${detail}`);
	}

	return parseReleasePackageJson(result.stdout, `${revision}:package.json`);
}
