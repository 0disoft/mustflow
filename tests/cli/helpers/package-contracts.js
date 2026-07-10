import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';

export const projectRoot = path.resolve(fileURLToPath(new URL('../../..', import.meta.url)));
export const cliPath = path.join(projectRoot, 'dist', 'cli', 'index.js');
export const packageJson = JSON.parse(readFileSync(path.join(projectRoot, 'package.json'), 'utf8'));
export const templateManifest = readFileSync(path.join(projectRoot, 'templates', 'default', 'manifest.toml'), 'utf8');
export const templateCommandContract = readFileSync(path.join(projectRoot, 'templates', 'default', 'common', '.mustflow', 'config', 'commands.toml'), 'utf8');
export const cliTestRunner = readFileSync(path.join(projectRoot, 'scripts', 'run-cli-tests.mjs'), 'utf8');
export const cliBuildFreshness = readFileSync(path.join(projectRoot, 'scripts', 'lib', 'build-freshness.mjs'), 'utf8');
export const cliTestOrdering = readFileSync(path.join(projectRoot, 'scripts', 'lib', 'test-ordering.mjs'), 'utf8');
export const cliTestSelection = readFileSync(path.join(projectRoot, 'scripts', 'lib', 'test-selection.mjs'), 'utf8');
export const sourceCommandContract = readFileSync(path.join(projectRoot, '.mustflow', 'config', 'commands.toml'), 'utf8');
export const ciWorkflow = readFileSync(path.join(projectRoot, '.github', 'workflows', 'ci.yml'), 'utf8');
export const publishNpmWorkflow = readFileSync(path.join(projectRoot, '.github', 'workflows', 'publish-npm.yml'), 'utf8');
export const releaseVersionCheckScript = readFileSync(path.join(projectRoot, 'scripts', 'check-npm-release-version.mjs'), 'utf8');
export const releaseInstallSmokeScript = readFileSync(path.join(projectRoot, 'scripts', 'smoke-npm-release-install.mjs'), 'utf8');
export const startNpmReleaseScript = readFileSync(path.join(projectRoot, 'scripts', 'start-npm-release.mjs'), 'utf8');
export const supportedTemplateLocales = ['en', 'ko', 'zh', 'es', 'fr', 'hi'];
export const templateCreates = readTomlStringArrayBlock(templateManifest, 'creates');
export const templateSkillCreates = templateCreates.filter((relativePath) => relativePath.startsWith('.mustflow/skills/'));

export async function readPublicJsonContracts() {
	const contractsModule = await import(
		pathToFileURL(path.join(projectRoot, 'dist', 'core', 'public-json-contracts.js')).href
	);
	return contractsModule.getPublicJsonSchemaContracts();
}

export function readTomlStringArrayBlock(content, key) {
	const match = new RegExp(`^${key} = \\[([\\s\\S]*?)^\\]`, 'mu').exec(content);

	if (!match) {
		throw new Error(`Missing TOML array block: ${key}`);
	}

	return Array.from(match[1].matchAll(/"([^"]+)"/gu), (entry) => entry[1]);
}

export function readTemplateSkillProfile(profile) {
	return readTomlStringArrayBlock(templateManifest, profile);
}

export function readProjectText(relativePath) {
	return readFileSync(path.join(projectRoot, ...relativePath.split('/')), 'utf8');
}

export {
	assert,
	pathToFileURL,
	spawnSync,
	test,
};
