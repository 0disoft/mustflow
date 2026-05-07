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
const cliPath = path.join(projectRoot, 'dist', 'cli', 'index.js');

function createTempProject() {
	const projectPath = mkdtempSync(path.join(tmpdir(), 'mustflow-workflow-'));
	mkdirSync(path.join(projectPath, 'src'), { recursive: true });
	writeFileSync(path.join(projectPath, 'src', 'index.ts'), 'export {};\n');
	return projectPath;
}

function removeTempProject(projectPath) {
	rmSync(projectPath, { recursive: true, force: true });
}

function runCli(cwd, args) {
	return spawnSync(process.execPath, [cliPath, ...args], {
		cwd,
		encoding: 'utf8',
	});
}

test('runs the init check and map workflow', () => {
	const projectPath = createTempProject();

	try {
		const init = runCli(projectPath, ['init', '--yes']);
		assert.equal(init.status, 0);
		assert.ok(existsSync(path.join(projectPath, 'AGENTS.md')));

		const check = runCli(projectPath, ['check']);
		assert.equal(check.status, 0);
		assert.match(check.stdout, /mustflow check passed/);

		const preferencesHelp = runCli(projectPath, ['help', 'preferences']);
		assert.equal(preferencesHelp.status, 0);
		assert.match(preferencesHelp.stdout, /Preferences/);
		assert.match(preferencesHelp.stdout, /agent_response: en/);
		assert.match(preferencesHelp.stdout, /\[language\.code_comments\]/);
		assert.match(preferencesHelp.stdout, /\[language\.memory\]/);
		assert.match(preferencesHelp.stdout, /summary: agent_response/);
		assert.match(preferencesHelp.stdout, /fallback: en/);
		assert.match(preferencesHelp.stdout, /\[git\.commit_message\]/);
		assert.match(preferencesHelp.stdout, /suggest: when_changes_made/);

		const commandsHelp = runCli(projectPath, ['help', 'commands']);
		assert.equal(commandsHelp.status, 0);
		assert.match(commandsHelp.stdout, /Commands/);
		assert.match(commandsHelp.stdout, /mustflow_check: configured/);
		assert.match(commandsHelp.stdout, /changes_status: configured/);
		assert.match(commandsHelp.stdout, /git_commit: manual_only/);

		const skillsHelp = runCli(projectPath, ['help', 'skills']);
		assert.equal(skillsHelp.status, 0);
		assert.match(skillsHelp.stdout, /Skills Index/);

		const map = runCli(projectPath, ['map', '--write']);
		const repoMapPath = path.join(projectPath, 'REPO_MAP.md');
		assert.equal(map.status, 0);
		assert.ok(existsSync(repoMapPath));
		const repoMap = readFileSync(repoMapPath, 'utf8');
		assert.match(repoMap, /Priority Anchors/);
		assert.match(repoMap, /AGENTS\.md/);
		assert.match(repoMap, /\.mustflow\/config\/commands\.toml/);
		assert.match(repoMap, /\.mustflow\/config\/preferences\.toml/);
		assert.doesNotMatch(repoMap, /src\/index\.ts/);
	} finally {
		removeTempProject(projectPath);
	}
});
