import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { test } from 'node:test';
import { runCliInProcess } from './helpers/cli-harness.js';

function createTempProject() {
	return mkdtempSync(path.join(tmpdir(), 'mustflow-onboard-'));
}

function removeTempProject(projectPath) {
	rmSync(projectPath, { recursive: true, force: true });
}

async function runCli(cwd, args) {
	return runCliInProcess(cwd, args);
}

async function initProject(projectPath) {
	const result = await runCli(projectPath, ['init', '--yes']);
	assert.equal(result.status, 0, result.stderr || result.stdout);
}

function writeCommandDiscoveryFiles(projectPath) {
	writeFileSync(
		path.join(projectPath, 'package.json'),
		`${JSON.stringify({ name: 'example', version: '1.0.0', scripts: { test: 'node --test' } }, null, 2)}\n`,
	);
	writeFileSync(path.join(projectPath, 'Makefile'), 'build:\n\t@echo build\n');
	writeFileSync(path.join(projectPath, 'justfile'), 'lint:\n\tnode --check index.js\n');
}

test('onboard commands reports review-only command suggestions as json', async () => {
	const projectPath = createTempProject();

	try {
		await initProject(projectPath);
		writeCommandDiscoveryFiles(projectPath);

		const result = await runCli(projectPath, ['onboard', 'commands', '--json']);
		const output = JSON.parse(result.stdout);

		assert.equal(result.status, 0, result.stderr || result.stdout);
		assert.equal(output.schema_version, '1');
		assert.equal(output.command, 'onboard commands');
		assert.equal(output.mustflow_root, projectPath);
		assert.equal(output.command_contract_path, '.mustflow/config/commands.toml');
		assert.deepEqual(output.policy, {
			command_authority: '.mustflow/config/commands.toml',
			suggestions_grant_command_authority: false,
			suggestions_are_review_only: true,
			writes_files: false,
		});
		assert.equal(output.summary.suggestions, 3);
		assert.equal(output.summary.package_scripts, 1);
		assert.equal(output.summary.make_targets, 1);
		assert.equal(output.summary.just_recipes, 1);
		assert.deepEqual(
			output.suggestions.map((suggestion) => `${suggestion.sourceKind}:${suggestion.sourceName}`).sort(),
			['just_recipe:lint', 'make_target:build', 'package_script:test'],
		);

		for (const suggestion of output.suggestions) {
			assert.equal(suggestion.status, 'unknown');
			assert.match(suggestion.suggestedIntent, /^suggest_/u);
			assert.match(suggestion.snippet, /status = "unknown"/u);
			assert.doesNotMatch(suggestion.snippet, /^argv\s*=/mu);
			assert.doesNotMatch(suggestion.snippet, /^run_policy\s*=/mu);
			assert.doesNotMatch(suggestion.snippet, /^lifecycle\s*=/mu);
		}
	} finally {
		removeTempProject(projectPath);
	}
});

test('onboard commands text output keeps suggestions review-only', async () => {
	const projectPath = createTempProject();

	try {
		await initProject(projectPath);
		writeCommandDiscoveryFiles(projectPath);

		const result = await runCli(projectPath, ['onboard', 'commands']);

		assert.equal(result.status, 0, result.stderr || result.stdout);
		assert.match(result.stdout, /mustflow command onboarding/u);
		assert.match(result.stdout, /Review-only snippets/u);
		assert.match(result.stdout, /\[intents\.suggest_package_test\]/u);
		assert.match(result.stdout, /Writes files: no/u);
		assert.doesNotMatch(result.stdout, /^  argv\s*=/mu);
	} finally {
		removeTempProject(projectPath);
	}
});
