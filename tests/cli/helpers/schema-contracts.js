import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { test } from 'node:test';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { assertMatchesSchema } from '../../helpers/json-schema.js';

export const projectRoot = path.resolve(fileURLToPath(new URL('../../..', import.meta.url)));
export const cliPath = path.join(projectRoot, 'dist', 'cli', 'index.js');
export const schemaRoot = path.join(projectRoot, 'schemas');
export const schemaBackcompatRoot = path.join(projectRoot, 'tests', 'fixtures', 'schema-backcompat');

export function createTempProject() {
	return mkdtempSync(path.join(tmpdir(), 'mustflow-schema-'));
}

export function removeTempProject(projectPath) {
	rmSync(projectPath, { recursive: true, force: true });
}

export function runCli(cwd, args, options = {}) {
	return spawnSync(process.execPath, [cliPath, ...args], {
		cwd,
		encoding: 'utf8',
		...options,
	});
}

export function runGit(projectPath, args) {
	return spawnSync('git', ['-C', projectPath, ...args], {
		cwd: projectPath,
		encoding: 'utf8',
		stdio: ['ignore', 'pipe', 'pipe'],
		windowsHide: true,
	});
}

export function commitGitBaseline(projectPath) {
	let result = runGit(projectPath, ['init']);
	if (result.status !== 0) {
		return false;
	}

	for (const args of [
		['config', 'user.email', 'mustflow-tests@example.invalid'],
		['config', 'user.name', 'mustflow tests'],
		['add', '.'],
		['commit', '-m', 'baseline'],
	]) {
		result = runGit(projectPath, args);
		if (result.status !== 0) {
			return false;
		}
	}

	return true;
}

export function initProject(projectPath) {
	const result = runCli(projectPath, ['init', '--yes']);
	assert.equal(result.status, 0, result.stderr || result.stdout);
}

export function appendIntent(projectPath, text) {
	const commandsPath = path.join(projectPath, '.mustflow', 'config', 'commands.toml');
	const commands = readFileSync(commandsPath, 'utf8');
	writeFileSync(commandsPath, `${commands}\n${text.trim()}\n`);
	refreshManifestLockHash(projectPath, '.mustflow/config/commands.toml');
}

export function refreshManifestLockHash(projectPath, relativePath) {
	const lockPath = path.join(projectPath, '.mustflow', 'config', 'manifest.lock.toml');
	const filePath = path.join(projectPath, ...relativePath.split('/'));
	const hash = `sha256:${createHash('sha256').update(readFileSync(filePath)).digest('hex')}`;
	const lock = readFileSync(lockPath, 'utf8');
	const escapedPath = relativePath.replace(/[.*+?^${}()|[\]\\]/gu, '\\$&');
	const pattern = new RegExp(`(\\[files\\."${escapedPath}"\\][\\s\\S]*?content_hash = ")[^"]+(")`, 'u');
	writeFileSync(lockPath, lock.replace(pattern, `$1${hash}$2`));
}

export async function readPublicJsonContracts() {
	const contractsModule = await import(
		pathToFileURL(path.join(projectRoot, 'dist', 'core', 'public-json-contracts.js')).href
	);
	return contractsModule.getPublicJsonSchemaContracts();
}

export async function readVerificationSkipReasons() {
	const verificationPlanModule = await import(
		pathToFileURL(path.join(projectRoot, 'dist', 'core', 'verification-plan.js')).href
	);
	return [...verificationPlanModule.VERIFICATION_SKIP_REASONS].sort((left, right) => left.localeCompare(right));
}

export function readSchema(schemaFile) {
	return JSON.parse(readFileSync(path.join(schemaRoot, schemaFile), 'utf8'));
}

export function compareSemver(left, right) {
	const leftParts = left.split('.').map((part) => Number.parseInt(part, 10));
	const rightParts = right.split('.').map((part) => Number.parseInt(part, 10));

	for (const index of [0, 1, 2]) {
		const diff = leftParts[index] - rightParts[index];

		if (diff !== 0) {
			return diff;
		}
	}

	return 0;
}

export {
	assert,
	assertMatchesSchema,
	mkdirSync,
	path,
	pathToFileURL,
	readdirSync,
	readFileSync,
	spawnSync,
	test,
	writeFileSync,
};
