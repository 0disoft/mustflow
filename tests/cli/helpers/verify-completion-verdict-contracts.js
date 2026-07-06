import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, rmSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

import { createVerifyCompletionVerdict } from '../../../dist/core/completion-verdict.js';
import {
	createVerificationFailureFingerprint,
	REPEATED_FAILURE_STATE_LIMIT,
	REPEATED_FAILURE_STATE_PATH,
	updateRepeatedFailureState,
} from '../../../dist/core/repeated-failure.js';
import { createValidationRatchetRisks } from '../../../dist/core/validation-ratchet.js';
import { runCliInProcess } from './cli-harness.js';
import { createLocalIndexDirect } from './local-index-fixtures.js';
import { createMinimalWorkflowProject } from '../index-support.js';

export const projectRoot = path.resolve(fileURLToPath(new URL('../../..', import.meta.url)));

export function createTempProject() {
	return mkdtempSync(path.join(tmpdir(), 'mustflow-verify-'));
}

export function removeTempProject(projectPath) {
	rmSync(projectPath, { recursive: true, force: true });
}

export async function runCli(cwd, args, options = {}) {
	return runCliInProcess(cwd, args, options);
}

export async function initProject(projectPath) {
	const result = await runCli(projectPath, ['init', '--yes']);
	assert.equal(result.status, 0, result.stderr || result.stdout);
}

export function appendIntent(projectPath, text) {
	const commandsPath = path.join(projectPath, '.mustflow', 'config', 'commands.toml');
	const commands = readFileSync(commandsPath, 'utf8');
	writeFileSync(commandsPath, `${commands}\n${text.trim()}\n`);
	const lockPath = path.join(projectPath, '.mustflow', 'config', 'manifest.lock.toml');
	if (existsSync(lockPath)) {
		refreshManifestLockHash(projectPath, '.mustflow/config/commands.toml');
	}
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

export function writeRunTrustManifestLock(projectPath) {
	const hashProjectFile = (relativePath) =>
		`sha256:${createHash('sha256').update(readFileSync(path.join(projectPath, ...relativePath.split('/')))).digest('hex')}`;
	writeFileSync(
		path.join(projectPath, '.mustflow', 'config', 'manifest.lock.toml'),
		[
			'schema_version = "1"',
			'',
			'[template]',
			'id = "test-minimal"',
			'version = "0.0.0"',
			'profile = "test"',
			'locale = "en"',
			'',
			'[files."AGENTS.md"]',
			'source = "test_fixture"',
			'last_action = "created"',
			`content_hash = "${hashProjectFile('AGENTS.md')}"`,
			'',
			'[files.".mustflow/config/commands.toml"]',
			'source = "test_fixture"',
			'last_action = "created"',
			`content_hash = "${hashProjectFile('.mustflow/config/commands.toml')}"`,
			'',
		].join('\n'),
	);
}

export function runGit(cwd, args) {
	const result = spawnSync('git', args, { cwd, encoding: 'utf8' });
	assert.equal(result.status, 0, result.stderr || result.stdout);
}

export function commitProjectBaseline(projectPath) {
	runGit(projectPath, ['init']);
	runGit(projectPath, ['config', 'user.email', 'test@example.com']);
	runGit(projectPath, ['config', 'user.name', 'Test User']);
	runGit(projectPath, ['add', '.']);
	runGit(projectPath, ['commit', '-m', 'init']);
}

export function createClassifyPlan(projectPath, reason, filePath = 'README.md') {
	return {
		schema_version: '1',
		command: 'classify',
		mustflow_root: projectPath,
		source: 'paths',
		files: [filePath],
		classifications: [
			{
				path: filePath,
				changeKinds: ['documentation'],
				surface: {
					kind: 'readme_page',
					category: 'documentation',
					isPublicSurface: true,
					validationReasons: [reason],
					affectedContracts: ['public documentation'],
					updatePolicy: 'update',
					driftChecks: ['command examples'],
				},
			},
		],
		summary: {
			fileCount: 1,
			publicSurfaceCount: 1,
			changeKinds: ['documentation'],
			validationReasons: [reason],
			updatePolicies: ['update'],
			driftChecks: ['command examples'],
			affectedContracts: ['public documentation'],
		},
	};
}

export {
	assert,
	createHash,
	createLocalIndexDirect,
	createMinimalWorkflowProject,
	createValidationRatchetRisks,
	createVerificationFailureFingerprint,
	createVerifyCompletionVerdict,
	existsSync,
	mkdirSync,
	mkdtempSync,
	path,
	readFileSync,
	REPEATED_FAILURE_STATE_LIMIT,
	REPEATED_FAILURE_STATE_PATH,
	rmSync,
	runCliInProcess,
	spawnSync,
	test,
	tmpdir,
	updateRepeatedFailureState,
	writeFileSync,
};
