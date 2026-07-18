#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { readCommittedReleasePackageJson } from './lib/release-package-identity.mjs';
import { evaluateReleaseWorkingTree } from './lib/release-working-tree-policy.mjs';

const projectRoot = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const args = new Set(process.argv.slice(2));

function fail(message) {
	console.error(message);
	process.exit(1);
}

function run(command, commandArgs, options = {}) {
	const result = spawnSync(command, commandArgs, {
		cwd: projectRoot,
		encoding: 'utf8',
		shell: false,
		stdio: 'pipe',
	});

	if (result.error) {
		throw result.error;
	}

	const stdout = options.preserveStdout ? result.stdout : result.stdout.trim();
	const stderr = result.stderr.trim();

	if (!options.allowFailure && result.status !== 0) {
		const detail = stderr || stdout || `exit ${result.status}`;
		throw new Error(`${command} ${commandArgs.join(' ')} failed: ${detail}`);
	}

	return { status: result.status ?? 1, stdout, stderr };
}

function warnAboutWorkingTreeChanges() {
	const status = run('git', ['status', '--porcelain=v1', '-z', '--untracked-files=all'], {
		preserveStdout: true,
	}).stdout;
	const policy = evaluateReleaseWorkingTree(status);
	if (policy.hasChanges) {
		console.warn(
			'Proceeding from committed HEAD while leaving staged, unstaged, and untracked working-tree changes outside the release.',
		);
	}
}

function requireNoGitOperationInProgress() {
	const markers = [
		['merge', 'MERGE_HEAD'],
		['rebase', 'rebase-merge'],
		['rebase', 'rebase-apply'],
		['cherry-pick', 'CHERRY_PICK_HEAD'],
		['revert', 'REVERT_HEAD'],
		['bisect', 'BISECT_LOG'],
		['sequencer', 'sequencer'],
	];
	const activeOperations = new Set();

	for (const [operation, marker] of markers) {
		const gitPath = run('git', ['rev-parse', '--git-path', marker]).stdout;
		const absoluteGitPath = path.isAbsolute(gitPath) ? gitPath : path.resolve(projectRoot, gitPath);
		if (existsSync(absoluteGitPath)) {
			activeOperations.add(operation);
		}
	}

	if (activeOperations.size > 0) {
		fail(`Refusing to release while Git operation(s) are in progress: ${[...activeOperations].join(', ')}.`);
	}
}

function requireMainAtOrigin() {
	const branch = run('git', ['rev-parse', '--abbrev-ref', 'HEAD']).stdout;
	if (branch !== 'main') {
		fail(`Refusing to start npm release from branch "${branch}". Switch to main first.`);
	}

	const head = run('git', ['rev-parse', 'HEAD']).stdout;
	const remoteMain = run('git', ['ls-remote', 'origin', 'refs/heads/main']).stdout;
	const [remoteMainSha] = remoteMain.split(/\s+/u);

	if (!remoteMainSha) {
		fail('Could not resolve origin/main through git ls-remote.');
	}

	if (remoteMainSha !== head) {
		fail(`Refusing to release because HEAD ${head} does not match origin/main ${remoteMainSha}.`);
	}

	return head;
}

function requireTagAvailable(tagName) {
	const localTag = run('git', ['tag', '--list', tagName]).stdout;
	if (localTag.length > 0) {
		fail(`Refusing to start npm release because local tag ${tagName} already exists.`);
	}

	if (remoteTagExists(tagName)) {
		fail(`Refusing to start npm release because remote tag ${tagName} already exists.`);
	}
}

function remoteTagExists(tagName) {
	return run('git', ['ls-remote', 'origin', `refs/tags/${tagName}`, `refs/tags/${tagName}^{}`]).stdout.length > 0;
}

function deleteLocalTagIfPresent(tagName) {
	run('git', ['tag', '-d', tagName], { allowFailure: true });
}

function pushReleaseTag(tagName, head) {
	run('git', ['tag', tagName, head]);

	try {
		run('git', ['push', 'origin', `refs/tags/${tagName}`]);
	} catch (error) {
		if (!remoteTagExists(tagName)) {
			deleteLocalTagIfPresent(tagName);
		}

		throw error;
	}
}

if (!args.has('--yes')) {
	fail('Refusing to start npm release without --yes. Use the configured release_npm_publish intent.');
}

try {
	warnAboutWorkingTreeChanges();
	requireNoGitOperationInProgress();
	const head = requireMainAtOrigin();
	const packageJson = readCommittedReleasePackageJson(projectRoot, head);
	const tagName = `v${packageJson.version}`;

	if (!/^v\d+\.\d+\.\d+(?:[-+][0-9A-Za-z.-]+)?$/u.test(tagName)) {
		fail(`${head}:package.json version "${packageJson.version}" is not a valid release tag version.`);
	}

	requireTagAvailable(tagName);
	run('node', [
		'scripts/check-npm-release-version.mjs',
		'--expect-available',
		'--package-name',
		packageJson.name,
		'--package-version',
		packageJson.version,
	]);
	pushReleaseTag(tagName, head);
	console.log(`Pushed release tag ${tagName} at ${head}. The publish-npm workflow should publish ${packageJson.name}@${packageJson.version} and create the GitHub Release.`);
} catch (error) {
	fail(error instanceof Error ? error.message : String(error));
}
