import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { test } from 'node:test';
import { pathToFileURL } from 'node:url';
import { assertMatchesSchema } from '../helpers/json-schema.js';
import {
	appendIntent,
	cliPath,
	commitGitBaseline,
	createEnvWithoutPathLookup,
	createEnvWithCommandPolicyFixtures,
	createEnvWithLocalBinFirst,
	createEnvWithRecursiveWriteDriftSnapshot,
	createLocalBinShim,
	createTempProject,
	initProject,
	latestRunProfilePath,
	latestRunReceiptIndexPath,
	latestRunReceiptPath,
	packageVersion,
	projectRoot,
	refreshManifestLockHash,
	removeTempProject,
	runCli,
	runGit,
	runPerformanceSamplesPath,
	runPerformanceSummaryPath,
	setDefaultKillAfterSeconds,
	trackManifestLockFile,
	trySymlink,
	waitForClose,
	waitForOutput,
} from './run-support.js';
function writeStandaloneRunContract(projectPath, markerPath) {
	mkdirSync(path.join(projectPath, '.mustflow', 'config'), { recursive: true });
	writeFileSync(
		path.join(projectPath, '.mustflow', 'config', 'commands.toml'),
		`
[defaults]
default_cwd = "."
env_policy = "minimal"
env_allowlist = []
kill_after_seconds = 1

[intents.untrusted_marker]
status = "configured"
lifecycle = "oneshot"
run_policy = "agent_allowed"
description = "Create a marker file from a manually-created command contract."
argv = ['${process.execPath}', '-e', 'require("node:fs").writeFileSync(${JSON.stringify(markerPath)}, "ran")']
cwd = "."
timeout_seconds = 10
stdin = "closed"
success_exit_codes = [0]
writes = ["marker.txt"]
network = false
destructive = false
`,
	);
}

function configureDelegatedWorkspace(projectPath) {
	const configPath = path.join(projectPath, '.mustflow', 'config', 'mustflow.toml');
	const config = readFileSync(configPath, 'utf8');
	writeFileSync(
		configPath,
		config.replace(
			/\[workspace\][\s\S]*?(?=\n\[capabilities\])/u,
			[
				'[workspace]',
				'enabled = true',
				'roots = ["projects"]',
				'authority_mode = "delegated_scoped"',
				'contracts = [',
				'  { repository = "projects/alpha", file = "commands/alpha.toml" },',
				'  { repository = "projects/beta", file = "commands/beta.toml" },',
				']',
				'max_depth = 4',
				'max_repositories = 50',
				'follow_symlinks = false',
				'stop_at_repository_root = true',
				'',
			].join('\n'),
		),
	);
	trackManifestLockFile(projectPath, '.mustflow/config/mustflow.toml');
}

function writeDelegatedWorkspaceContracts(projectPath) {
	const fragmentDirectory = path.join(projectPath, '.mustflow', 'config', 'commands');
	mkdirSync(fragmentDirectory, { recursive: true });
	mkdirSync(path.join(projectPath, 'projects', 'alpha'), { recursive: true });
	mkdirSync(path.join(projectPath, 'projects', 'beta'), { recursive: true });
	for (const [name, message] of [
		['alpha', 'alpha scoped command'],
		['beta', 'beta scoped command'],
	]) {
		writeFileSync(
			path.join(fragmentDirectory, `${name}.toml`),
			[
				'[resources.build_output]',
				'type = "path"',
				'paths = ["dist/**"]',
				'concurrency = "exclusive_writer"',
				'',
				'[intents.test]',
				'status = "configured"',
				'lifecycle = "oneshot"',
				'run_policy = "agent_allowed"',
				`description = "Run the ${name} scoped test command."`,
				`argv = [${JSON.stringify(process.execPath)}, "-e", ${JSON.stringify(`console.log(${JSON.stringify(message)})`)}]`,
				'cwd = "."',
				'timeout_seconds = 10',
				'stdin = "closed"',
				'success_exit_codes = [0]',
				'writes = []',
				'effects = [{ type = "read", mode = "read", path = ".", lock = "build_output", concurrency = "shared" }]',
				'network = false',
				'destructive = false',
				'',
				'[intents.shared_child]',
				'status = "configured"',
				'lifecycle = "oneshot"',
				'run_policy = "agent_allowed"',
				'description = "Run one command shared only by delegated repositories."',
				`argv = [${JSON.stringify(process.execPath)}, "-e", "console.log('shared child')"]`,
				'cwd = "."',
				'timeout_seconds = 10',
				'stdin = "closed"',
				'success_exit_codes = [0]',
				'writes = []',
				'network = false',
				'destructive = false',
				'',
				...(name === 'alpha' ? [
					'[intents.alpha_only]',
					'status = "configured"',
					'lifecycle = "oneshot"',
					'run_policy = "agent_allowed"',
					'description = "Run one command unique to alpha."',
					`argv = [${JSON.stringify(process.execPath)}, "-e", "console.log('alpha only')"]`,
					'cwd = "."',
					'timeout_seconds = 10',
					'stdin = "closed"',
					'success_exit_codes = [0]',
					'writes = []',
					'network = false',
					'destructive = false',
					'',
					'[intents.write_artifact]',
					'status = "configured"',
					'lifecycle = "oneshot"',
					'run_policy = "agent_allowed"',
					'description = "Write one child-relative artifact."',
					`argv = [${JSON.stringify(process.execPath)}, "-e", ${JSON.stringify("require('node:fs').mkdirSync('generated',{recursive:true});require('node:fs').writeFileSync('generated/out.txt','ok')")}]`,
					'cwd = "."',
					'timeout_seconds = 10',
					'stdin = "closed"',
					'success_exit_codes = [0]',
					'writes = ["generated/**"]',
					'network = false',
					'destructive = false',
					'',
				] : []),
			].join('\n'),
		);
	}
	trackManifestLockFile(projectPath, '.mustflow/config/commands/alpha.toml');
	trackManifestLockFile(projectPath, '.mustflow/config/commands/beta.toml');
}

async function importRunExecutor() {
	return import(pathToFileURL(path.join(projectRoot, 'dist', 'cli', 'commands', 'run', 'executor.js')).href);
}

function createSilentReporter() {
	return {
		stdout() {},
		stderr() {},
	};
}


const STREAM_STARTUP_WAIT_MS = 8_000;
const RUN_PARENT_GUARD_TIMEOUT_MS = 15_000;
const RUN_PARENT_GUARD_SETTLE_MS = 14_000;
const schemaRoot = path.join(projectRoot, 'schemas');

test('executor rejects an empty argv executable before spawning', async () => {
	const { getRunStatus, runArgvCommandStreaming } = await importRunExecutor();
	const result = await runArgvCommandStreaming(
		undefined,
		projectRoot,
		process.env,
		10,
		1,
		1024,
		1024,
		1024,
		createSilentReporter(),
		false,
		true,
	);

	assert.equal(result.status, null);
	assert.equal(result.error?.code, 'EINVAL');
	assert.equal(getRunStatus(result.error, result.status, [0]), 'start_failed');
});

test('executor rejects an empty shell command before spawning', async () => {
	const { getRunStatus, runShellCommandStreaming } = await importRunExecutor();
	const result = await runShellCommandStreaming(
		' ',
		projectRoot,
		process.env,
		10,
		1,
		1024,
		1024,
		1024,
		createSilentReporter(),
		false,
		true,
	);

	assert.equal(result.status, null);
	assert.equal(result.error?.code, 'EINVAL');
	assert.equal(getRunStatus(result.error, result.status, [0]), 'start_failed');
});

test('runs a configured oneshot command intent', () => {
	const projectPath = createTempProject();

	try {
		initProject(projectPath);
		appendIntent(
			projectPath,
			`
[intents.echo_hello]
status = "configured"
lifecycle = "oneshot"
run_policy = "agent_allowed"
description = "Print a test message."
argv = ['${process.execPath}', '-e', 'console.log("hello from mf run")']
cwd = "."
timeout_seconds = 10
stdin = "closed"
success_exit_codes = [0]
writes = []
network = false
destructive = false
`,
		);

		const result = runCli(projectPath, ['run', 'echo_hello']);

		assert.equal(result.status, 0);
		assert.match(result.stdout, /hello from mf run/);
		assert.match(result.stderr, /Running echo_hello \(timeout: 10s\)\.\.\./);
	} finally {
		removeTempProject(projectPath);
	}
});

test('binds declared typed inputs as whole argv tokens', () => {
	const projectPath = createTempProject();
	try {
		initProject(projectPath);
		appendIntent(projectPath, `
[intents.typed_echo]
status = "configured"
lifecycle = "oneshot"
run_policy = "agent_allowed"
description = "Echo one bounded enum input."
argv = ["${process.execPath.replace(/\\/gu, '\\\\')}", "-e", "console.log(process.argv[1])", "{mode}"]
cwd = "."
timeout_seconds = 10
stdin = "closed"
success_exit_codes = [0]
writes = []
network = false
destructive = false
[intents.typed_echo.inputs.mode]
type = "enum"
required = true
allowed_values = ["fast", "full"]
`);
		trackManifestLockFile(projectPath, '.mustflow/config/commands.toml');
		const ok = runCli(projectPath, ['run', 'typed_echo', '--input', 'mode=fast']);
		const rejected = runCli(projectPath, ['run', 'typed_echo', '--input', 'mode=unsafe']);
		assert.equal(ok.status, 0, ok.stderr || ok.stdout);
		assert.match(ok.stdout, /fast/u);
		assert.equal(rejected.status, 1);
		assert.match(rejected.stderr, /must be one of/u);
	} finally {
		removeTempProject(projectPath);
	}
});

test('runs an included command intent from a split command contract', () => {
	const projectPath = createTempProject();

	try {
		initProject(projectPath);
		const commandsPath = path.join(projectPath, '.mustflow', 'config', 'commands.toml');
		const includePath = path.join(projectPath, '.mustflow', 'config', 'commands', 'workspace.toml');
		mkdirSync(path.dirname(includePath), { recursive: true });
		writeFileSync(
			commandsPath,
			`${readFileSync(commandsPath, 'utf8')}\n[include]\nfiles = ["commands/workspace.toml"]\n`,
		);
		writeFileSync(
			includePath,
			`
[intents.included_echo]
status = "configured"
lifecycle = "oneshot"
run_policy = "agent_allowed"
description = "Print from an included command contract."
argv = ['${process.execPath}', '-e', 'console.log("hello from included contract")']
cwd = "."
timeout_seconds = 10
stdin = "closed"
success_exit_codes = [0]
writes = []
network = false
destructive = false
`,
		);
		trackManifestLockFile(projectPath, '.mustflow/config/commands.toml');
		trackManifestLockFile(projectPath, '.mustflow/config/commands/workspace.toml');

		const result = runCli(projectPath, ['run', 'included_echo']);

		assert.equal(result.status, 0, result.stderr || result.stdout);
		assert.match(result.stdout, /hello from included contract/);
		assert.match(result.stderr, /Running included_echo \(timeout: 10s\)\.\.\./);
	} finally {
		removeTempProject(projectPath);
	}
});

test('runs only the delegated workspace contract selected by the child working directory', () => {
	const projectPath = createTempProject();

	try {
		initProject(projectPath);
		configureDelegatedWorkspace(projectPath);
		writeDelegatedWorkspaceContracts(projectPath);

		const result = runCli(path.join(projectPath, 'projects', 'alpha'), ['run', 'test', '--json']);
		assert.equal(result.status, 0, result.stderr || result.stdout);
		const receipt = JSON.parse(result.stdout);
		assert.equal(receipt.intent, 'test');
		assert.equal(receipt.status, 'passed');
		assert.match(receipt.stdout.tail, /alpha scoped command/);
		assert.deepEqual(receipt.workspace_scope, {
			repository: 'projects/alpha',
			contract: '.mustflow/config/commands/alpha.toml',
		});
		assert.equal(existsSync(latestRunReceiptPath(projectPath)), true);
		assert.equal(existsSync(latestRunReceiptPath(path.join(projectPath, 'projects', 'alpha'))), false);
	} finally {
		removeTempProject(projectPath);
	}
});

test('runs an explicit delegated workspace contract from the workspace root', () => {
	const projectPath = createTempProject();

	try {
		initProject(projectPath);
		configureDelegatedWorkspace(projectPath);
		writeDelegatedWorkspaceContracts(projectPath);

		const result = runCli(projectPath, ['run', 'test', '--repo', 'projects/beta', '--json']);
		assert.equal(result.status, 0, result.stderr || result.stdout);
		const receipt = JSON.parse(result.stdout);
		assert.match(receipt.stdout.tail, /beta scoped command/);
		assert.equal(receipt.workspace_scope.repository, 'projects/beta');
		assert.equal(receipt.workspace_scope.contract, '.mustflow/config/commands/beta.toml');
	} finally {
		removeTempProject(projectPath);
	}
});

test('merges multiple delegated command fragments for one repository', () => {
	const projectPath = createTempProject();

	try {
		initProject(projectPath);
		configureDelegatedWorkspace(projectPath);
		writeDelegatedWorkspaceContracts(projectPath);
		const configPath = path.join(projectPath, '.mustflow', 'config', 'mustflow.toml');
		writeFileSync(
			configPath,
			readFileSync(configPath, 'utf8').replace(
				'{ repository = "projects/alpha", file = "commands/alpha.toml" }',
				'{ repository = "projects/alpha", files = ["commands/alpha.toml", "commands/alpha-extra.toml"] }',
			),
		);
		const extraPath = path.join(projectPath, '.mustflow', 'config', 'commands', 'alpha-extra.toml');
		writeFileSync(
			extraPath,
			[
				'[intents.alpha_extra]',
				'status = "configured"',
				'lifecycle = "oneshot"',
				'run_policy = "agent_allowed"',
				'description = "Run an intent from the second delegated fragment."',
				`argv = [${JSON.stringify(process.execPath)}, "-e", "console.log('alpha extra fragment')"]`,
				'cwd = "."',
				'timeout_seconds = 10',
				'stdin = "closed"',
				'success_exit_codes = [0]',
				'writes = []',
				'network = false',
				'destructive = false',
			].join('\n'),
		);
		trackManifestLockFile(projectPath, '.mustflow/config/mustflow.toml');
		trackManifestLockFile(projectPath, '.mustflow/config/commands/alpha-extra.toml');

		const result = runCli(projectPath, ['run', 'alpha_extra', '--repo', 'projects/alpha', '--json']);
		assert.equal(result.status, 0, result.stderr || result.stdout);
		const receipt = JSON.parse(result.stdout);
		assert.match(receipt.stdout.tail, /alpha extra fragment/);
		assert.equal(receipt.workspace_scope.repository, 'projects/alpha');
	} finally {
		removeTempProject(projectPath);
	}
});

test('suggests the exact delegated repository when a root command is missing', () => {
	const projectPath = createTempProject();

	try {
		initProject(projectPath);
		configureDelegatedWorkspace(projectPath);
		writeDelegatedWorkspaceContracts(projectPath);

		const result = runCli(projectPath, ['run', 'alpha_only']);
		assert.equal(result.status, 1);
		assert.match(result.stderr, /Unknown command: alpha_only/u);
		assert.match(result.stderr, /mf run alpha_only --repo projects\/alpha/u);

		const preview = runCli(projectPath, ['run', 'alpha_only', '--dry-run', '--json']);
		assert.equal(preview.status, 1);
		assert.match(JSON.parse(preview.stdout).detail, /mf run alpha_only --repo projects\/alpha/u);
	} finally {
		removeTempProject(projectPath);
	}
});

test('lists every delegated repository when a missing root command is ambiguous', () => {
	const projectPath = createTempProject();

	try {
		initProject(projectPath);
		configureDelegatedWorkspace(projectPath);
		writeDelegatedWorkspaceContracts(projectPath);

		const result = runCli(projectPath, ['run', 'shared_child']);
		assert.equal(result.status, 1);
		assert.match(result.stderr, /mf run shared_child --repo projects\/alpha/u);
		assert.match(result.stderr, /mf run shared_child --repo projects\/beta/u);
	} finally {
		removeTempProject(projectPath);
	}
});

test('resolves delegated cwd and writes relative to the mapped repository exactly once', () => {
	const projectPath = createTempProject();

	try {
		initProject(projectPath);
		configureDelegatedWorkspace(projectPath);
		writeDelegatedWorkspaceContracts(projectPath);

		const result = runCli(path.join(projectPath, 'projects', 'alpha'), ['run', 'write_artifact', '--json'], {
			env: createEnvWithRecursiveWriteDriftSnapshot(),
		});
		assert.equal(result.status, 0, result.stderr || result.stdout);
		const receipt = JSON.parse(result.stdout);
		assert.equal(receipt.cwd, 'projects/alpha');
		assert.deepEqual(receipt.write_drift.declared_paths, ['projects/alpha/generated/**']);
		assert.deepEqual(receipt.write_drift.declared_observed_paths, ['projects/alpha/generated/out.txt']);
		assert.deepEqual(receipt.write_drift.undeclared_paths, []);
		assert.equal(existsSync(path.join(projectPath, 'projects', 'alpha', 'generated', 'out.txt')), true);
		assert.equal(existsSync(path.join(projectPath, 'projects', 'alpha', 'projects', 'alpha', 'generated', 'out.txt')), false);
	} finally {
		removeTempProject(projectPath);
	}
});

test('ignores manifest drift in an inactive delegated workspace contract', () => {
	const projectPath = createTempProject();

	try {
		initProject(projectPath);
		configureDelegatedWorkspace(projectPath);
		writeDelegatedWorkspaceContracts(projectPath);
		writeFileSync(
			path.join(projectPath, '.mustflow', 'config', 'commands', 'beta.toml'),
			'[intents.broken\n',
		);

		const result = runCli(path.join(projectPath, 'projects', 'alpha'), ['run', 'test', '--json']);
		assert.equal(result.status, 0, result.stderr || result.stdout);
		const receipt = JSON.parse(result.stdout);
		assert.match(receipt.stdout.tail, /alpha scoped command/);
		assert.equal(receipt.workspace_scope.repository, 'projects/alpha');
	} finally {
		removeTempProject(projectPath);
	}
});

test('runs the configured scoped root check while an unrelated delegated contract drifts', () => {
	const projectPath = createTempProject();

	try {
		initProject(projectPath);
		configureDelegatedWorkspace(projectPath);
		writeDelegatedWorkspaceContracts(projectPath);
		const commandsPath = path.join(projectPath, '.mustflow', 'config', 'commands.toml');
		writeFileSync(
			commandsPath,
			readFileSync(commandsPath, 'utf8').replace(
				'argv = ["mf", "check", "--strict", "--repo", "{repository}"]',
				`argv = [${JSON.stringify(process.execPath)}, ${JSON.stringify(cliPath)}, "check", "--strict", "--repo", "{repository}"]`,
			),
		);
		trackManifestLockFile(projectPath, '.mustflow/config/commands.toml');
		const betaPath = path.join(projectPath, '.mustflow', 'config', 'commands', 'beta.toml');
		writeFileSync(betaPath, `${readFileSync(betaPath, 'utf8')}\n# concurrent beta edit\n`);

		const result = runCli(projectPath, [
			'run',
			'mustflow_check_scoped',
			'--input',
			'repository=projects/alpha',
			'--json',
		]);
		assert.equal(result.status, 0, result.stderr || result.stdout);
		const receipt = JSON.parse(result.stdout);
		assert.equal(receipt.status, 'passed');
		assert.match(receipt.stdout.tail, /mustflow scoped strict check passed/u);
		assert.match(receipt.stderr.tail, /Deferred unrelated manifest drift/u);
	} finally {
		removeTempProject(projectPath);
	}
});

test('runs a delegated workspace contract while the unrelated root command contract is being edited', () => {
	const projectPath = createTempProject();

	try {
		initProject(projectPath);
		configureDelegatedWorkspace(projectPath);
		writeDelegatedWorkspaceContracts(projectPath);
		const rootContractPath = path.join(projectPath, '.mustflow', 'config', 'commands.toml');
		writeFileSync(rootContractPath, `${readFileSync(rootContractPath, 'utf8')}\n# concurrent root edit\n`);

		const result = runCli(projectPath, ['run', 'test', '--repo', 'projects/alpha', '--json']);
		assert.equal(result.status, 0, result.stderr || result.stdout);
		const receipt = JSON.parse(result.stdout);
		assert.match(receipt.stdout.tail, /alpha scoped command/);
		assert.equal(receipt.workspace_scope.repository, 'projects/alpha');
	} finally {
		removeTempProject(projectPath);
	}
});

test('keeps delegated workspace execution fail closed when its selected trust files drift', () => {
	const projectPath = createTempProject();

	try {
		initProject(projectPath);
		configureDelegatedWorkspace(projectPath);
		writeDelegatedWorkspaceContracts(projectPath);
		writeFileSync(path.join(projectPath, 'AGENTS.md'), 'Concurrent unreviewed instruction edit.\n');

		const agentsDrift = runCli(projectPath, ['run', 'test', '--repo', 'projects/alpha', '--json']);
		assert.equal(agentsDrift.status, 1);
		assert.match(agentsDrift.stderr, /Lock hash mismatch: AGENTS\.md/u);

		trackManifestLockFile(projectPath, 'AGENTS.md');
		const selectedContractPath = path.join(projectPath, '.mustflow', 'config', 'commands', 'alpha.toml');
		writeFileSync(selectedContractPath, `${readFileSync(selectedContractPath, 'utf8')}\n# concurrent selected edit\n`);
		const selectedDrift = runCli(projectPath, ['run', 'test', '--repo', 'projects/alpha', '--json']);
		assert.equal(selectedDrift.status, 1);
		assert.match(selectedDrift.stderr, /Lock hash mismatch: \.mustflow\/config\/commands\/alpha\.toml/u);
	} finally {
		removeTempProject(projectPath);
	}
});

test('treats a selected empty delegated contract as valid but without runnable intents', () => {
	const projectPath = createTempProject();

	try {
		initProject(projectPath);
		configureDelegatedWorkspace(projectPath);
		writeDelegatedWorkspaceContracts(projectPath);
		writeFileSync(
			path.join(projectPath, '.mustflow', 'config', 'commands', 'beta.toml'),
			'# This repository intentionally exposes no commands yet.\n',
		);
		trackManifestLockFile(projectPath, '.mustflow/config/commands/beta.toml');

		const result = runCli(projectPath, ['run', 'test', '--repo', 'projects/beta']);
		assert.equal(result.status, 1);
		assert.match(result.stderr, /Unknown command: test/);
		assert.doesNotMatch(result.stderr, /Scoped command contract must contain an \[intents\] table/);
	} finally {
		removeTempProject(projectPath);
	}
});

test('rejects delegated workspace intents that escape the mapped repository', () => {
	const projectPath = createTempProject();

	try {
		initProject(projectPath);
		configureDelegatedWorkspace(projectPath);
		writeDelegatedWorkspaceContracts(projectPath);
		const alphaPath = path.join(projectPath, '.mustflow', 'config', 'commands', 'alpha.toml');
		writeFileSync(alphaPath, readFileSync(alphaPath, 'utf8').replace('cwd = "."', 'cwd = "../.."'));
		trackManifestLockFile(projectPath, '.mustflow/config/commands/alpha.toml');

		const result = runCli(path.join(projectPath, 'projects', 'alpha'), ['run', 'test', '--json']);
		assert.equal(result.status, 1);
		assert.match(result.stderr, /intent "test" cwd must stay inside projects\/alpha/);
	} finally {
		removeTempProject(projectPath);
	}
});

test('ignores an out-of-scope sibling intent when the selected delegated intent stays inside its repository', () => {
	const projectPath = createTempProject();

	try {
		initProject(projectPath);
		configureDelegatedWorkspace(projectPath);
		writeDelegatedWorkspaceContracts(projectPath);
		const alphaPath = path.join(projectPath, '.mustflow', 'config', 'commands', 'alpha.toml');
		writeFileSync(
			alphaPath,
			`${readFileSync(alphaPath, 'utf8')}
[intents.workspace_helper]
status = "configured"
lifecycle = "oneshot"
run_policy = "agent_allowed"
description = "Represent an existing root-owned helper kept in the same legacy fragment."
argv = [${JSON.stringify(process.execPath)}, "-e", "console.log('workspace helper')"]
cwd = "../.."
timeout_seconds = 10
stdin = "closed"
success_exit_codes = [0]
writes = []
network = false
destructive = false
`,
		);
		trackManifestLockFile(projectPath, '.mustflow/config/commands/alpha.toml');

		const result = runCli(path.join(projectPath, 'projects', 'alpha'), ['run', 'test', '--json']);
		assert.equal(result.status, 0, result.stderr || result.stdout);
		const receipt = JSON.parse(result.stdout);
		assert.match(receipt.stdout.tail, /alpha scoped command/);
	} finally {
		removeTempProject(projectPath);
	}
});

test('refuses execution when a command include is not tracked by the manifest lock', () => {
	const projectPath = createTempProject();

	try {
		initProject(projectPath);
		const commandsPath = path.join(projectPath, '.mustflow', 'config', 'commands.toml');
		const includePath = path.join(projectPath, '.mustflow', 'config', 'commands', 'workspace.toml');
		mkdirSync(path.dirname(includePath), { recursive: true });
		writeFileSync(
			commandsPath,
			`${readFileSync(commandsPath, 'utf8')}\n[include]\nfiles = ["commands/workspace.toml"]\n`,
		);
		writeFileSync(
			includePath,
			`
[intents.untracked_included_echo]
status = "configured"
lifecycle = "oneshot"
run_policy = "agent_allowed"
description = "Print from an untracked included command contract."
argv = ['${process.execPath}', '-e', 'console.log("should not run")']
cwd = "."
timeout_seconds = 10
stdin = "closed"
success_exit_codes = [0]
writes = []
network = false
destructive = false
`,
		);
		trackManifestLockFile(projectPath, '.mustflow/config/commands.toml');

		const result = runCli(projectPath, ['run', 'untracked_included_echo']);

		assert.equal(result.status, 1);
		assert.match(result.stderr, /Manifest lock must track \.mustflow\/config\/commands\/workspace\.toml/);
		assert.doesNotMatch(result.stdout, /should not run/);
	} finally {
		removeTempProject(projectPath);
	}
});

test('requires explicit opt-in before executing commands from roots without a manifest lock', () => {
	const projectPath = createTempProject();
	const markerPath = path.join(projectPath, 'marker.txt');

	try {
		writeStandaloneRunContract(projectPath, markerPath);

		const blocked = runCli(projectPath, ['run', 'untrusted_marker', '--json']);

		assert.equal(blocked.status, 1);
		assert.equal(blocked.stdout, '');
		assert.match(blocked.stderr, /manifest\.lock\.toml/);
		assert.match(blocked.stderr, /--allow-untrusted-root/);
		assert.equal(existsSync(markerPath), false);
		assert.equal(existsSync(latestRunReceiptPath(projectPath)), false);

		writeFileSync(path.join(projectPath, '.mustflow', 'config', 'manifest.lock.toml'), 'schema_version = ');
		const invalidLock = runCli(projectPath, ['run', 'untrusted_marker', '--json']);

		assert.equal(invalidLock.status, 1);
		assert.equal(invalidLock.stdout, '');
		assert.match(invalidLock.stderr, /manifest lock is invalid/);
		assert.equal(existsSync(markerPath), false);
		assert.equal(existsSync(latestRunReceiptPath(projectPath)), false);

		writeFileSync(
			path.join(projectPath, '.mustflow', 'config', 'manifest.lock.toml'),
			`schema_version = "1"
[template]
id = "default"
version = "0.0.0"
[files]
`,
		);
		const emptyLock = runCli(projectPath, ['run', 'untrusted_marker', '--json']);

		assert.equal(emptyLock.status, 1);
		assert.equal(emptyLock.stdout, '');
		assert.match(emptyLock.stderr, /manifest lock is invalid/);
		assert.equal(existsSync(markerPath), false);
		assert.equal(existsSync(latestRunReceiptPath(projectPath)), false);

		writeFileSync(path.join(projectPath, 'AGENTS.md'), 'Read the workflow files.\n');
		const agentsHash = `sha256:${createHash('sha256').update(readFileSync(path.join(projectPath, 'AGENTS.md'))).digest('hex')}`;
		writeFileSync(
			path.join(projectPath, '.mustflow', 'config', 'manifest.lock.toml'),
			`schema_version = "1"
[template]
id = "default"
version = "0.0.0"
[files."AGENTS.md"]
source = "template"
last_action = "created"
content_hash = "${agentsHash}"
[files.".mustflow/config/commands.toml"]
source = "template"
last_action = "created"
content_hash = "sha256:0000000000000000000000000000000000000000000000000000000000000000"
`,
		);
		const staleLock = runCli(projectPath, ['run', 'untrusted_marker', '--json']);

		assert.equal(staleLock.status, 1);
		assert.equal(staleLock.stdout, '');
		assert.match(staleLock.stderr, /Lock hash mismatch: \.mustflow\/config\/commands\.toml/);
		assert.equal(existsSync(markerPath), false);
		assert.equal(existsSync(latestRunReceiptPath(projectPath)), false);

		const preview = runCli(projectPath, ['run', 'untrusted_marker', '--dry-run', '--json']);
		const previewJson = JSON.parse(preview.stdout);

		assert.equal(preview.status, 0, preview.stderr || preview.stdout);
		assert.equal(previewJson.runnable, true);
		assert.equal(existsSync(markerPath), false);
		assert.equal(existsSync(latestRunReceiptPath(projectPath)), false);

		const allowed = runCli(projectPath, ['run', 'untrusted_marker', '--allow-untrusted-root', '--json']);
		const receipt = JSON.parse(allowed.stdout);

		assert.equal(allowed.status, 0, allowed.stderr || allowed.stdout);
		assert.equal(receipt.status, 'passed');
		assert.equal(receipt.intent, 'untrusted_marker');
		assert.equal(readFileSync(markerPath, 'utf8'), 'ran');
	} finally {
		removeTempProject(projectPath);
	}
});

test('blocks agent-runnable shell intents unless allow_shell is true at runtime', () => {
	const projectPath = createTempProject();
	const markerPath = path.join(projectPath, 'shell-marker.txt');

	try {
		initProject(projectPath);
		appendIntent(
			projectPath,
			`
[intents.shell_without_allow]
status = "configured"
lifecycle = "oneshot"
run_policy = "agent_allowed"
description = "Attempt a shell command without the explicit shell allowance."
mode = "shell"
cmd = ${JSON.stringify(`"${process.execPath}" -e "require('node:fs').writeFileSync(process.argv[1], 'ran')" "${markerPath}"`)}
cwd = "."
timeout_seconds = 10
stdin = "closed"
success_exit_codes = [0]
writes = ["shell-marker.txt"]
network = false
destructive = false
`,
		);

		const preview = runCli(projectPath, ['run', 'shell_without_allow', '--plan-only', '--json']);
		const run = runCli(projectPath, ['run', 'shell_without_allow', '--json']);
		const runJson = JSON.parse(run.stdout);

		assert.equal(preview.status, 1);
		assert.match(preview.stdout, /agent_shell_requires_allow/);
		assert.equal(run.status, 1);
		assert.equal(runJson.command, 'run');
		assert.equal(runJson.preview, true);
		assert.equal(runJson.preview_mode, 'plan-only');
		assert.equal(runJson.runnable, false);
		assert.equal(runJson.reason_code, 'agent_shell_requires_allow');
		assert.match(run.stderr, /allow_shell = true/);
		assert.equal(existsSync(markerPath), false);
	} finally {
		removeTempProject(projectPath);
	}
});

test('prints structured JSON for blocked run plans in execution mode', () => {
	const projectPath = createTempProject();

	try {
		initProject(projectPath);
		appendIntent(
			projectPath,
			`
[intents.manual_blocked]
status = "manual_only"
lifecycle = "oneshot"
run_policy = "agent_allowed"
description = "Manual-only fixture."
argv = ['${process.execPath}', '-e', 'console.log("should not run")']
cwd = "."
timeout_seconds = 10
stdin = "closed"
success_exit_codes = [0]
writes = []
network = false
destructive = false

[intents.server_blocked]
status = "configured"
lifecycle = "server"
run_policy = "agent_allowed"
description = "Server lifecycle fixture."
argv = ['${process.execPath}', '-e', 'console.log("should not run")']
cwd = "."
timeout_seconds = 10
stdin = "closed"
success_exit_codes = [0]
writes = []
network = false
destructive = false

[intents.policy_blocked]
status = "configured"
lifecycle = "oneshot"
run_policy = "requires_explicit_user_request"
description = "Policy-blocked fixture."
argv = ['${process.execPath}', '-e', 'console.log("should not run")']
cwd = "."
timeout_seconds = 10
stdin = "closed"
success_exit_codes = [0]
writes = []
network = false
destructive = false

[intents.timeout_blocked]
status = "configured"
lifecycle = "oneshot"
run_policy = "agent_allowed"
description = "Missing timeout fixture."
argv = ['${process.execPath}', '-e', 'console.log("should not run")']
cwd = "."
stdin = "closed"
success_exit_codes = [0]
writes = []
network = false
destructive = false

[intents.source_blocked]
status = "configured"
lifecycle = "oneshot"
run_policy = "agent_allowed"
description = "Missing command source fixture."
cwd = "."
timeout_seconds = 10
stdin = "closed"
success_exit_codes = [0]
writes = []
network = false
destructive = false
`,
		);

		const cases = [
			['manual_blocked', 'status_not_configured'],
			['server_blocked', 'lifecycle_not_oneshot'],
			['policy_blocked', 'run_policy_not_agent_allowed'],
			['timeout_blocked', 'missing_timeout'],
			['source_blocked', 'missing_command_source'],
		];

		for (const [intent, reasonCode] of cases) {
			const result = runCli(projectPath, ['run', intent, '--json']);
			const report = JSON.parse(result.stdout);

			assert.equal(result.status, 1, intent);
			assert.equal(report.schema_version, '1');
			assert.equal(report.command, 'run');
			assert.equal(report.preview, true);
			assert.equal(report.preview_mode, 'plan-only');
			assert.equal(report.intent, intent);
			assert.equal(report.runnable, false);
			assert.equal(report.reason_code, reasonCode);
			assert.match(result.stderr, /Error:/);
		}
	} finally {
		removeTempProject(projectPath);
	}
});

test('blocks overlapping run intents that declare conflicting active locks', async () => {
	const projectPath = createTempProject();
	const conflictMarkerPath = path.join(projectPath, 'conflict.txt');
	const otherMarkerPath = path.join(projectPath, 'other.txt');
	let holder;

	try {
		initProject(projectPath);
		appendIntent(
			projectPath,
			`
[intents.lock_holder]
status = "configured"
lifecycle = "oneshot"
run_policy = "agent_allowed"
description = "Hold an exclusive lock briefly."
argv = ['${process.execPath}', '-e', 'console.log("lock-ready"); Atomics.wait(new Int32Array(new SharedArrayBuffer(4)),0,0,15000)']
cwd = "."
timeout_seconds = 20
stdin = "closed"
success_exit_codes = [0]
writes = ["shared.txt"]
effects = [
  { type = "write", mode = "delete_recreate", path = "shared.txt", lock = "shared_lock", concurrency = "exclusive" },
]
network = false
destructive = false

[intents.lock_conflict]
status = "configured"
lifecycle = "oneshot"
run_policy = "agent_allowed"
description = "Write under the same exclusive lock."
argv = ['${process.execPath}', '-e', 'require("node:fs").writeFileSync(${JSON.stringify(conflictMarkerPath)}, "ran")']
cwd = "."
timeout_seconds = 10
stdin = "closed"
success_exit_codes = [0]
writes = ["shared.txt"]
effects = [
  { type = "write", mode = "delete_recreate", path = "shared.txt", lock = "shared_lock", concurrency = "exclusive" },
]
network = false
destructive = false

[intents.lock_other]
status = "configured"
lifecycle = "oneshot"
run_policy = "agent_allowed"
description = "Write under a separate lock."
argv = ['${process.execPath}', '-e', 'require("node:fs").writeFileSync(${JSON.stringify(otherMarkerPath)}, "ran")']
cwd = "."
timeout_seconds = 10
stdin = "closed"
success_exit_codes = [0]
writes = ["other.txt"]
effects = [
  { type = "write", mode = "delete_recreate", path = "other.txt", lock = "other_lock", concurrency = "exclusive" },
]
network = false
destructive = false
`,
		);

		let holderStdout = '';
		let holderStderr = '';
		holder = spawn(process.execPath, [cliPath, 'run', 'lock_holder'], {
			cwd: projectPath,
			stdio: ['ignore', 'pipe', 'pipe'],
		});
		holder.stdout.on('data', (chunk) => {
			holderStdout += chunk.toString();
		});
		holder.stderr.on('data', (chunk) => {
			holderStderr += chunk.toString();
		});
		const holderClose = waitForClose(holder);
		await Promise.race([
			waitForOutput(() => holderStdout, /lock-ready/u, 10_000),
			holderClose.then((result) => {
				throw new Error(`lock holder exited before readiness: ${JSON.stringify(result)} ${holderStderr}`);
			}),
		]);

		const preview = runCli(projectPath, ['run', 'lock_conflict', '--dry-run', '--json']);
		const previewJson = JSON.parse(preview.stdout);
		assert.equal(preview.status, 0, preview.stderr || preview.stdout);
		assert.equal(previewJson.active_lock_conflicts.length, 1);
		assert.equal(previewJson.active_lock_conflicts[0].conflictsWithIntent, 'lock_holder');

		const conflict = runCli(projectPath, ['run', 'lock_conflict', '--no-wait']);
		assert.equal(conflict.status, 1);
		assert.match(conflict.stderr, /active run lock/u);
		assert.equal(existsSync(conflictMarkerPath), false);

		const localizedConflict = runCli(projectPath, ['--lang', 'ko', 'run', 'lock_conflict', '--no-wait']);
		assert.equal(localizedConflict.status, 1);
		assert.match(localizedConflict.stderr, /활성 실행 잠금/u);
		assert.equal(existsSync(conflictMarkerPath), false);

		const other = runCli(projectPath, ['run', 'lock_other']);
		assert.equal(other.status, 0, other.stderr || other.stdout);
		assert.equal(readFileSync(otherMarkerPath, 'utf8'), 'ran');

		const holderResult = await holderClose;
		holder = undefined;
		assert.equal(holderResult.status, 0, holderStderr);

		const afterRelease = runCli(projectPath, ['run', 'lock_conflict']);
		assert.equal(afterRelease.status, 0, afterRelease.stderr || afterRelease.stdout);
		assert.equal(readFileSync(conflictMarkerPath, 'utf8'), 'ran');
	} finally {
		if (holder?.pid) {
			holder.kill();
		}
		removeTempProject(projectPath);
	}
});

test('waits for conflicting active locks when requested', async () => {
	const projectPath = createTempProject();
	const markerPath = path.join(projectPath, 'waited.txt');
	let holder;

	try {
		initProject(projectPath);
		appendIntent(
			projectPath,
			`
[intents.wait_holder]
status = "configured"
lifecycle = "oneshot"
run_policy = "agent_allowed"
description = "Hold an exclusive lock briefly."
argv = ['${process.execPath}', '-e', 'console.log("lock-ready"); setTimeout(() => {}, 5000)']
cwd = "."
timeout_seconds = 10
stdin = "closed"
success_exit_codes = [0]
writes = ["shared-wait.txt"]
effects = [
  { type = "write", mode = "delete_recreate", path = "shared-wait.txt", lock = "wait_lock", concurrency = "exclusive" },
]
network = false
destructive = false

[intents.wait_runner]
status = "configured"
lifecycle = "oneshot"
run_policy = "agent_allowed"
description = "Write after the holder releases the lock."
argv = ['${process.execPath}', '-e', 'require("node:fs").writeFileSync(${JSON.stringify(markerPath)}, "ran")']
cwd = "."
timeout_seconds = 10
stdin = "closed"
success_exit_codes = [0]
writes = ["shared-wait.txt"]
effects = [
  { type = "write", mode = "delete_recreate", path = "shared-wait.txt", lock = "wait_lock", concurrency = "exclusive" },
]
network = false
destructive = false
`,
		);

		let holderStdout = '';
		let holderStderr = '';
		holder = spawn(process.execPath, [cliPath, 'run', 'wait_holder'], {
			cwd: projectPath,
			stdio: ['ignore', 'pipe', 'pipe'],
		});
		holder.stdout.on('data', (chunk) => {
			holderStdout += chunk.toString();
		});
		holder.stderr.on('data', (chunk) => {
			holderStderr += chunk.toString();
		});
		await waitForOutput(() => holderStdout, /lock-ready/u, 10_000);

		const waited = runCli(projectPath, ['run', 'wait_runner', '--wait', '--wait-timeout=10']);
		assert.equal(waited.status, 0, waited.stderr || waited.stdout);
		assert.match(waited.stderr, /Waiting to run wait_runner/u);
		assert.equal(readFileSync(markerPath, 'utf8'), 'ran');

		const holderResult = await waitForClose(holder);
		holder = undefined;
		assert.equal(holderResult.status, 0, holderStderr);
	} finally {
		if (holder?.pid) {
			holder.kill();
		}
		removeTempProject(projectPath);
	}
});

test('reclaims stale active lock records whose owner process is gone', () => {
	const projectPath = createTempProject();
	const markerPath = path.join(projectPath, 'stale-recovered.txt');
	const deadRunId = 'dead-run-lock-record';

	try {
		initProject(projectPath);
		appendIntent(
			projectPath,
			`
[intents.stale_lock_probe]
status = "configured"
lifecycle = "oneshot"
run_policy = "agent_allowed"
description = "Run after a stale lock is reclaimed."
argv = ['${process.execPath}', '-e', 'require("node:fs").writeFileSync(${JSON.stringify(markerPath)}, "ran")']
cwd = "."
timeout_seconds = 10
stdin = "closed"
success_exit_codes = [0]
writes = ["stale-recovered.txt"]
effects = [
  { type = "write", mode = "delete_recreate", path = "stale-recovered.txt", lock = "stale_lock", concurrency = "exclusive" },
]
network = false
destructive = false
`,
		);

		const activeLockDir = path.join(projectPath, '.mustflow', 'state', 'locks', 'active');
		mkdirSync(activeLockDir, { recursive: true });
		writeFileSync(
			path.join(activeLockDir, `${createHash('sha256').update(deadRunId).digest('hex')}.json`),
			JSON.stringify(
				{
					schema_version: '1',
					kind: 'active_run_lock',
					run_id: deadRunId,
					intent: 'dead_writer',
					pid: 999999,
					started_at: '2024-01-01T00:00:00.000Z',
					root_hash: 'test',
					command_hash: null,
					effects: [
						{
							source: 'effects',
							access: 'write',
							mode: 'delete_recreate',
							path: 'stale-recovered.txt',
							lock: 'stale_lock',
							concurrency: 'exclusive',
						},
					],
					writes: ['stale-recovered.txt'],
				},
				null,
				2,
			),
		);

		const result = runCli(projectPath, ['run', 'stale_lock_probe']);

		assert.equal(result.status, 0, result.stderr || result.stdout);
		assert.equal(readFileSync(markerPath, 'utf8'), 'ran');
		assert.deepEqual(readdirSync(activeLockDir).filter((name) => name.endsWith('.json')), []);
	} finally {
		removeTempProject(projectPath);
	}
});

test('previews mustflow built-in intents through the current CLI entrypoint', () => {
	const projectPath = createTempProject();

	try {
		initProject(projectPath);
		createLocalBinShim(projectPath, 'mf', 'PWNED_MF_SHIM');
		appendIntent(
			projectPath,
			`
[intents.self_version_preview]
status = "configured"
kind = "mustflow_builtin"
lifecycle = "oneshot"
run_policy = "agent_allowed"
description = "Preview mustflow version without trusting repo-local shims."
argv = ["mf", "--version"]
cwd = "."
timeout_seconds = 10
stdin = "closed"
success_exit_codes = [0]
writes = []
network = false
destructive = false
`,
		);

		const result = runCli(projectPath, ['run', 'self_version_preview', '--plan-only', '--json'], {
			env: createEnvWithLocalBinFirst(projectPath),
		});
		const preview = JSON.parse(result.stdout);

		assert.equal(result.status, 0, result.stderr || result.stdout);
		assert.equal(preview.runnable, true);
		assert.deepEqual(preview.argv, ['mf', '--version']);
		assert.equal(preview.resolved_argv.executable, process.execPath);
		assert.deepEqual(preview.resolved_argv.args, [cliPath, '--version']);
		assert.equal(preview.resolved_argv.shell, false);
		assert.equal(preview.resolved_argv.windowsCommandScript, false);
		assert.doesNotMatch(result.stdout, /PWNED_MF_SHIM/);
		assert.equal(existsSync(latestRunReceiptPath(projectPath)), false);
	} finally {
		removeTempProject(projectPath);
	}
});

test('does not run a project-local mf shim for built-in mustflow intents', () => {
	const projectPath = createTempProject();

	try {
		initProject(projectPath);
		createLocalBinShim(projectPath, 'mf', 'PWNED_MF_SHIM');
		appendIntent(
			projectPath,
			`
[intents.self_version_shim_guard]
status = "configured"
kind = "mustflow_builtin"
lifecycle = "oneshot"
run_policy = "agent_allowed"
description = "Run mustflow version without trusting repo-local shims."
argv = ["mf", "--version"]
cwd = "."
timeout_seconds = 10
stdin = "closed"
success_exit_codes = [0]
writes = []
network = false
destructive = false
`,
		);

		const result = runCli(projectPath, ['run', 'self_version_shim_guard', '--json'], {
			env: createEnvWithLocalBinFirst(projectPath),
		});
		const receipt = JSON.parse(result.stdout);

		assert.equal(result.status, 0, result.stderr || result.stdout);
		assert.equal(receipt.status, 'passed');
		assert.equal(receipt.stdout.tail.trim(), packageVersion);
		assert.doesNotMatch(receipt.stdout.tail, /PWNED_MF_SHIM/);
	} finally {
		removeTempProject(projectPath);
	}
});

test('applies output limits to built-in mustflow intents through the spawned path', () => {
	const projectPath = createTempProject();

	try {
		initProject(projectPath);
		appendIntent(
			projectPath,
			`
[intents.self_help_output_limit]
status = "configured"
kind = "mustflow_builtin"
lifecycle = "oneshot"
run_policy = "agent_allowed"
description = "Run mustflow help with a tiny output budget."
argv = ["mf", "help"]
cwd = "."
timeout_seconds = 10
max_output_bytes = 64
stdin = "closed"
success_exit_codes = [0]
writes = []
network = false
destructive = false
`,
		);

		const result = runCli(projectPath, ['run', 'self_help_output_limit', '--json']);
		const receipt = JSON.parse(result.stdout);

		assert.equal(result.status, 1);
		assert.equal(receipt.status, 'output_limit_exceeded');
		assert.equal(receipt.max_output_bytes, 64);
		assert.equal(receipt.performance.result_summary.error_kind, 'output_limit_exceeded');
		assert.match(receipt.error, /max_output_bytes|exceeded/i);
	} finally {
		removeTempProject(projectPath);
	}
});

test('does not put project-local shims ahead of PATH executables', () => {
	const projectPath = createTempProject();
	const markerPath = path.join(tmpdir(), `mustflow-pwned-git-${process.pid}-${Date.now()}`);

	try {
		rmSync(markerPath, { force: true });
		initProject(projectPath);
		createLocalBinShim(projectPath, 'git', 'PWNED_GIT_SHIM', markerPath);
		appendIntent(
			projectPath,
			`
[intents.git_version]
status = "configured"
lifecycle = "oneshot"
run_policy = "agent_allowed"
description = "Print git version."
argv = ["git", "--version"]
cwd = "."
timeout_seconds = 10
stdin = "closed"
success_exit_codes = [0]
writes = []
network = false
destructive = false
`,
		);

		const result = runCli(projectPath, ['run', 'git_version', '--json'], {
			env: createEnvWithLocalBinFirst(projectPath),
		});
		const receipt = JSON.parse(result.stdout);

		assert.equal(result.status, 0, result.stderr || result.stdout);
		assert.equal(receipt.status, 'passed');
		assert.match(receipt.stdout.tail, /git version/i);
		assert.doesNotMatch(receipt.stdout.tail, /PWNED_GIT_SHIM/);
		assert.equal(existsSync(markerPath), false);
	} finally {
		rmSync(markerPath, { force: true });
		removeTempProject(projectPath);
	}
});

test('removes relative project-local PATH entries when mf run starts from a subdirectory', () => {
	const projectPath = createTempProject();
	const markerPath = path.join(tmpdir(), `mustflow-pwned-relative-bin-${process.pid}-${Date.now()}`);

	try {
		rmSync(markerPath, { force: true });
		initProject(projectPath);
		mkdirSync(path.join(projectPath, 'subdir'), { recursive: true });
		createLocalBinShim(projectPath, 'evil-relative-bin', 'PWNED_RELATIVE_BIN', markerPath);
		appendIntent(
			projectPath,
			`
[intents.relative_local_bin]
status = "configured"
lifecycle = "oneshot"
run_policy = "agent_allowed"
description = "Attempt to run a repository-local shim through a relative PATH entry."
argv = ["evil-relative-bin"]
cwd = "."
timeout_seconds = 10
stdin = "closed"
success_exit_codes = [0]
writes = []
network = false
destructive = false
`,
		);

		const env = { ...process.env };
		const pathKey = Object.keys(env).find((key) => key.toLowerCase() === 'path') ?? 'PATH';
		env[pathKey] = `${path.join('node_modules', '.bin')}${path.delimiter}${env[pathKey] ?? ''}`;

		const result = runCli(path.join(projectPath, 'subdir'), ['run', 'relative_local_bin', '--json'], { env });
		const receipt = JSON.parse(result.stdout);

		assert.equal(result.status, 1);
		assert.equal(receipt.status, 'start_failed');
		assert.doesNotMatch(receipt.stdout.tail, /PWNED_RELATIVE_BIN/);
		assert.doesNotMatch(receipt.stderr.tail, /PWNED_RELATIVE_BIN/);
		assert.equal(existsSync(markerPath), false);
	} finally {
		rmSync(markerPath, { force: true });
		removeTempProject(projectPath);
	}
});

test('reruns mustflow built-in intents through the current CLI entrypoint', () => {
	const projectPath = createTempProject();

	try {
		initProject(projectPath);
		appendIntent(
			projectPath,
			`
[intents.self_version]
status = "configured"
kind = "mustflow_builtin"
lifecycle = "oneshot"
run_policy = "agent_allowed"
description = "Run a built-in mustflow command without relying on PATH lookup."
argv = ["mf", "--version"]
cwd = "."
timeout_seconds = 10
stdin = "closed"
success_exit_codes = [0]
writes = []
network = false
destructive = false
`,
		);

		const result = runCli(projectPath, ['run', 'self_version', '--json'], {
			env: createEnvWithoutPathLookup(),
		});
		const receipt = JSON.parse(result.stdout);

		assert.equal(result.status, 0);
		assert.equal(result.stderr, '');
		assert.equal(receipt.intent, 'self_version');
		assert.equal(receipt.status, 'passed');
		assert.equal(receipt.stdout.tail.trim(), packageVersion);
	} finally {
		removeTempProject(projectPath);
	}
});

test('runs supported mustflow built-in intents through the spawned CLI path', () => {
	const projectPath = createTempProject();

	try {
		initProject(projectPath);
		appendIntent(
			projectPath,
			`
[intents.self_check]
status = "configured"
kind = "mustflow_builtin"
lifecycle = "oneshot"
run_policy = "agent_allowed"
description = "Run a built-in mustflow status command through the current CLI entrypoint."
argv = ["mf", "status", "--json"]
cwd = "."
timeout_seconds = 10
stdin = "closed"
success_exit_codes = [0]
writes = []
network = false
destructive = false
`,
		);

		const result = runCli(projectPath, ['run', 'self_check', '--json'], {
			env: createEnvWithoutPathLookup(),
		});
		const receipt = JSON.parse(result.stdout);
		const statusOutput = JSON.parse(receipt.stdout.tail);

		assert.equal(result.status, 0, result.stderr || result.stdout);
		assert.equal(result.stderr, '');
		assert.equal(receipt.intent, 'self_check');
		assert.equal(receipt.status, 'passed');
		assert.equal(statusOutput.installed, true);
		assert.equal(statusOutput.manifestLock, 'present');
	} finally {
		removeTempProject(projectPath);
	}
});

test('runs default mustflow update intents through mf run', () => {
	const projectPath = createTempProject();

	try {
		initProject(projectPath);

		const dryRunResult = runCli(projectPath, ['run', 'mustflow_update_dry_run', '--json'], {
			env: createEnvWithoutPathLookup(),
		});
		const dryRunReceipt = JSON.parse(dryRunResult.stdout);
		const dryRunPlan = JSON.parse(dryRunReceipt.stdout.tail);

		assert.equal(dryRunResult.status, 0, dryRunResult.stderr || dryRunResult.stdout);
		assert.equal(dryRunReceipt.intent, 'mustflow_update_dry_run');
		assert.equal(dryRunReceipt.status, 'passed');
		assert.equal(dryRunPlan.command, 'update');
		assert.equal(dryRunPlan.mode, 'dry-run');
		assert.equal(dryRunPlan.ok, true);
		assert.equal(dryRunPlan.wroteFiles, false);

		const applyResult = runCli(projectPath, ['run', 'mustflow_update_apply', '--json'], {
			env: createEnvWithoutPathLookup(),
		});
		const applyReceipt = JSON.parse(applyResult.stdout);
		const applyPlan = JSON.parse(applyReceipt.stdout.tail);

		assert.equal(applyResult.status, 0, applyResult.stderr || applyResult.stdout);
		assert.equal(applyReceipt.intent, 'mustflow_update_apply');
		assert.equal(applyReceipt.status, 'passed');
		assert.equal(applyPlan.command, 'update');
		assert.equal(applyPlan.mode, 'apply');
		assert.equal(applyPlan.ok, true);
		assert.equal(applyPlan.wroteFiles, false);
	} finally {
		removeTempProject(projectPath);
	}
});

test('localizes the no-wait and typed-input run help options', () => {
	const english = runCli(projectRoot, ['run', '--help']);
	const korean = runCli(projectRoot, ['--lang', 'ko', 'run', '--help']);

	assert.equal(english.status, 0, english.stderr || english.stdout);
	assert.match(english.stdout, /--no-wait\s+Fail immediately when another live run owns a conflicting resource/u);
	assert.match(english.stdout, /--input <name=value>\s+Bind a declared typed intent input/u);
	assert.equal(korean.status, 0, korean.stderr || korean.stdout);
	assert.match(korean.stdout, /--no-wait\s+다른 활성 실행이 충돌하는 리소스를 사용 중이면 즉시 실패합니다/u);
	assert.match(korean.stdout, /--input <name=value>\s+선언된 타입 입력을 바인딩합니다/u);
	assert.doesNotMatch(korean.stdout, /Fail immediately|Bind a declared/u);
});

test('previews a runnable command intent without spawning or writing a receipt', () => {
	const projectPath = createTempProject();
	const markerPath = path.join(projectPath, 'dry-run-spawned.txt');

	try {
		initProject(projectPath);
		appendIntent(
			projectPath,
			`
[intents.preview_marker]
status = "configured"
lifecycle = "oneshot"
run_policy = "agent_allowed"
description = "Would create a marker file if executed."
argv = ['${process.execPath}', '-e', 'require("node:fs").writeFileSync(${JSON.stringify(markerPath)}, "ran")']
cwd = "."
timeout_seconds = 10
kill_after_seconds = 8
stdin = "closed"
success_exit_codes = [0]
writes = ["dry-run-spawned.txt"]
effects = [
  { type = "write", mode = "create", path = "dry-run-spawned.txt" },
]
preconditions = [
  { kind = "path_exists", path = "dist/cli/index.js", satisfy_intent = "mustflow_check" },
]
network = false
destructive = false
`,
		);

		const result = runCli(projectPath, ['run', 'preview_marker', '--dry-run', '--json']);
		const preview = JSON.parse(result.stdout);

		assert.equal(result.status, 0, result.stderr || result.stdout);
		assert.equal(result.stderr, '');
		assert.equal(preview.schema_version, '1');
		assert.equal(preview.command, 'run');
		assert.equal(preview.preview, true);
		assert.equal(preview.preview_mode, 'dry-run');
		assert.equal(preview.intent, 'preview_marker');
		assert.equal(preview.runnable, true);
		assert.deepEqual(preview.eligibility, { ok: true, code: 'ok', detail: null });
		assert.equal(preview.reason_code, null);
		assert.equal(preview.cwd, '.');
		assert.equal(preview.resolved_cwd, projectPath);
		assert.equal(preview.timeout_seconds, 10);
		assert.equal(preview.kill_after_seconds, 8);
		assert.equal(preview.mode, 'argv');
		assert.deepEqual(preview.argv, [
			process.execPath,
			'-e',
			`require("node:fs").writeFileSync(${JSON.stringify(markerPath)}, "ran")`,
		]);
		assert.equal(preview.resolved_argv.executable, process.execPath);
		assert.equal(preview.resolved_argv.shell, false);
		assert.equal(preview.resolved_argv.windowsCommandScript, false);
		assert.deepEqual(preview.writes, ['dry-run-spawned.txt']);
		assert.equal(preview.effects[0].path, 'dry-run-spawned.txt');
		assert.equal(preview.network, false);
		assert.equal(preview.destructive, false);
		assert.deepEqual(preview.approval_actions, []);
		assert.equal(preview.env_policy, 'minimal');
		assert.deepEqual(preview.env_allowlist, []);
		assert.deepEqual(preview.success_exit_codes, [0]);
		assert.equal(preview.preconditions.length, 1);
		assert.equal(preview.preconditions[0].kind, 'path_exists');
		assert.equal(preview.preconditions[0].status, 'missing');
		assert.equal(preview.preconditions[0].path, 'dist/cli/index.js');
		assert.equal(preview.preconditions[0].satisfyIntent.intent, 'mustflow_check');
		assert.equal(preview.preconditions[0].satisfyIntent.runnable, true);
		assert.equal(existsSync(markerPath), false);
		assert.equal(existsSync(latestRunReceiptPath(projectPath)), false);
	} finally {
		removeTempProject(projectPath);
	}
});

test('allows default network intents while blocking destructive intents before execution', () => {
	const projectPath = createTempProject();
	const networkMarkerPath = path.join(projectPath, 'network-spawned.txt');
	const destructiveMarkerPath = path.join(projectPath, 'destructive-spawned.txt');

	try {
		initProject(projectPath);
		appendIntent(
			projectPath,
			`
[intents.network_marker]
status = "configured"
lifecycle = "oneshot"
run_policy = "agent_allowed"
description = "Try to run a network-marked intent."
argv = ['${process.execPath}', '-e', 'require("node:fs").writeFileSync(${JSON.stringify(networkMarkerPath)}, "ran")']
cwd = "."
timeout_seconds = 10
stdin = "closed"
success_exit_codes = [0]
writes = []
network = true
destructive = false

[intents.destructive_marker]
status = "configured"
lifecycle = "oneshot"
run_policy = "agent_allowed"
description = "Try to run a destructive-marked intent."
argv = ['${process.execPath}', '-e', 'require("node:fs").writeFileSync(${JSON.stringify(destructiveMarkerPath)}, "ran")']
cwd = "."
timeout_seconds = 10
stdin = "closed"
success_exit_codes = [0]
writes = []
network = false
destructive = true
`,
		);

		const networkResult = runCli(projectPath, ['run', 'network_marker', '--json']);
		const networkReceipt = JSON.parse(networkResult.stdout);
		const destructiveResult = runCli(projectPath, ['run', 'destructive_marker', '--json']);
		const destructivePreview = JSON.parse(destructiveResult.stdout);

		assert.equal(networkResult.status, 0, networkResult.stderr || networkResult.stdout);
		assert.equal(networkReceipt.intent, 'network_marker');
		assert.equal(networkReceipt.status, 'passed');
		assert.equal(existsSync(networkMarkerPath), true);

		assert.equal(destructiveResult.status, 1);
		assert.match(destructiveResult.stderr, /requires approval/i);
		assert.doesNotMatch(destructiveResult.stderr, /development server|watcher|background process/i);
		assert.equal(destructivePreview.preview, true);
		assert.equal(destructivePreview.preview_mode, 'plan-only');
		assert.equal(destructivePreview.runnable, false);
		assert.deepEqual(destructivePreview.eligibility, { ok: true, code: 'ok', detail: null });
		assert.equal(destructivePreview.reason_code, 'destructive_requires_approval');
		assert.equal(destructivePreview.destructive, true);
		assert.match(destructivePreview.detail, /destructive_command/);
		assert.equal(existsSync(destructiveMarkerPath), false);
		assert.equal(existsSync(latestRunReceiptPath(projectPath)), true);
	} finally {
		removeTempProject(projectPath);
	}
});

test('executes approval-gated command intents only when the matching approval action is allowed', () => {
	const projectPath = createTempProject();
	const networkMarkerPath = path.join(projectPath, 'network-approved.txt');
	const destructiveMarkerPath = path.join(projectPath, 'destructive-approved.txt');
	const gitCommitMarkerPath = path.join(projectPath, 'git-commit-approved.txt');

	try {
		initProject(projectPath);
		appendIntent(
			projectPath,
			`
[intents.network_marker]
status = "configured"
lifecycle = "oneshot"
run_policy = "agent_allowed"
description = "Run a network-marked intent after explicit approval."
argv = ['${process.execPath}', '-e', 'require("node:fs").writeFileSync(${JSON.stringify(networkMarkerPath)}, "ran")']
cwd = "."
timeout_seconds = 10
stdin = "closed"
success_exit_codes = [0]
writes = ["network-approved.txt"]
network = true
destructive = false

[intents.destructive_marker]
status = "configured"
lifecycle = "oneshot"
run_policy = "agent_allowed"
description = "Run a destructive-marked intent after explicit approval."
argv = ['${process.execPath}', '-e', 'require("node:fs").writeFileSync(${JSON.stringify(destructiveMarkerPath)}, "ran")']
cwd = "."
timeout_seconds = 10
stdin = "closed"
success_exit_codes = [0]
writes = ["destructive-approved.txt"]
network = false
destructive = true

[intents.git_commit_marker]
status = "configured"
lifecycle = "oneshot"
run_policy = "agent_allowed"
description = "Run a commit-gated intent after explicit approval."
argv = ['${process.execPath}', '-e', 'require("node:fs").writeFileSync(${JSON.stringify(gitCommitMarkerPath)}, "ran")']
cwd = "."
timeout_seconds = 10
stdin = "closed"
success_exit_codes = [0]
writes = ["git-commit-approved.txt"]
network = false
destructive = false
approval_actions = ["git_commit"]
`,
		);

		const networkResult = runCli(projectPath, ['run', 'network_marker', '--allow-approval', 'network_access', '--json']);
		const networkReceipt = JSON.parse(networkResult.stdout);
		const wrongApprovalResult = runCli(projectPath, ['run', 'destructive_marker', '--allow-approval', 'network_access', '--json']);
		const wrongApprovalPreview = JSON.parse(wrongApprovalResult.stdout);

		assert.equal(networkResult.status, 0, networkResult.stderr || networkResult.stdout);
		assert.equal(networkResult.stderr, '');
		assert.equal(networkReceipt.intent, 'network_marker');
		assert.equal(networkReceipt.status, 'passed');
		assert.equal(existsSync(networkMarkerPath), true);

		assert.equal(wrongApprovalResult.status, 1);
		assert.match(wrongApprovalResult.stderr, /requires approval/i);
		assert.equal(wrongApprovalPreview.preview, true);
		assert.equal(wrongApprovalPreview.runnable, false);
		assert.equal(wrongApprovalPreview.reason_code, 'destructive_requires_approval');
		assert.match(wrongApprovalPreview.detail, /destructive_command/);
		assert.equal(existsSync(destructiveMarkerPath), false);

		const destructiveResult = runCli(projectPath, ['run', 'destructive_marker', '--allow-approval', 'destructive_command', '--json']);
		const destructiveReceipt = JSON.parse(destructiveResult.stdout);

		assert.equal(destructiveResult.status, 0, destructiveResult.stderr || destructiveResult.stdout);
		assert.equal(destructiveResult.stderr, '');
		assert.equal(destructiveReceipt.intent, 'destructive_marker');
		assert.equal(destructiveReceipt.status, 'passed');
		assert.equal(existsSync(destructiveMarkerPath), true);

		const missingGitApprovalResult = runCli(projectPath, ['run', 'git_commit_marker', '--json']);
		const missingGitApprovalPreview = JSON.parse(missingGitApprovalResult.stdout);

		assert.equal(missingGitApprovalResult.status, 1);
		assert.equal(missingGitApprovalPreview.reason_code, 'explicit_approval_required');
		assert.deepEqual(missingGitApprovalPreview.approval_actions, ['git_commit']);
		assert.match(missingGitApprovalPreview.detail, /git_commit/u);
		assert.equal(existsSync(gitCommitMarkerPath), false);

		const approvedGitPlanResult = runCli(projectPath, [
			'run',
			'git_commit_marker',
			'--allow-approval',
			'git_commit',
			'--plan-only',
			'--json',
		]);
		const approvedGitPlan = JSON.parse(approvedGitPlanResult.stdout);

		assert.equal(approvedGitPlanResult.status, 0, approvedGitPlanResult.stderr || approvedGitPlanResult.stdout);
		assert.equal(approvedGitPlan.runnable, true);
		assert.deepEqual(approvedGitPlan.approval_actions, ['git_commit']);
		assert.equal(existsSync(gitCommitMarkerPath), false);

		const gitCommitResult = runCli(projectPath, ['run', 'git_commit_marker', '--allow-approval', 'git_commit', '--json']);
		const gitCommitReceipt = JSON.parse(gitCommitResult.stdout);

		assert.equal(gitCommitResult.status, 0, gitCommitResult.stderr || gitCommitResult.stdout);
		assert.equal(gitCommitReceipt.status, 'passed');
		assert.equal(existsSync(gitCommitMarkerPath), true);

		appendIntent(
			projectPath,
			`
[intents.legacy_git_add]
status = "configured"
lifecycle = "oneshot"
run_policy = "agent_allowed"
description = "Infer commit approval for an existing Git staging intent."
argv = ["git", "-C", ".", "add", "--", "README.md"]
cwd = "."
timeout_seconds = 10
stdin = "closed"
success_exit_codes = [0]
writes = [".git/index"]
network = false
destructive = false
`,
		);

		const legacyBlockedResult = runCli(projectPath, ['run', 'legacy_git_add', '--plan-only', '--json']);
		const legacyBlockedPlan = JSON.parse(legacyBlockedResult.stdout);
		assert.equal(legacyBlockedResult.status, 1);
		assert.equal(legacyBlockedPlan.reason_code, 'explicit_approval_required');
		assert.match(legacyBlockedPlan.detail, /git_commit/u);

		const legacyApprovedResult = runCli(projectPath, [
			'run',
			'legacy_git_add',
			'--allow-approval',
			'git_commit',
			'--plan-only',
			'--json',
		]);
		const legacyApprovedPlan = JSON.parse(legacyApprovedResult.stdout);
		assert.equal(legacyApprovedResult.status, 0, legacyApprovedResult.stderr || legacyApprovedResult.stdout);
		assert.equal(legacyApprovedPlan.runnable, true);
		assert.deepEqual(legacyApprovedPlan.approval_actions, []);
		assert.equal(existsSync(latestRunReceiptPath(projectPath)), true);
	} finally {
		removeTempProject(projectPath);
	}
});

test('rejects unsupported run options before planning or execution', () => {
	const projectPath = createTempProject();

	try {
		const booleanValue = runCli(projectPath, ['run', 'preview_marker', '--dry-run=true']);
		const missingTimeout = runCli(projectPath, ['run', 'preview_marker', '--wait-timeout']);
		const invalidTimeout = runCli(projectPath, ['run', 'preview_marker', '--wait-timeout=0']);
		const invalidApproval = runCli(projectPath, ['run', 'preview_marker', '--allow-approval', 'self_destruct']);

		assert.equal(booleanValue.status, 1);
		assert.match(booleanValue.stderr, /Unknown option: --dry-run=true/u);
		assert.match(booleanValue.stderr, /Usage: mf run/u);
		assert.equal(booleanValue.stdout, '');
		assert.equal(missingTimeout.status, 1);
		assert.match(missingTimeout.stderr, /wait-timeout/u);
		assert.match(missingTimeout.stderr, /Usage: mf run/u);
		assert.equal(missingTimeout.stdout, '');
		assert.equal(invalidTimeout.status, 1);
		assert.match(invalidTimeout.stderr, /wait-timeout/u);
		assert.equal(invalidTimeout.stdout, '');
		assert.equal(invalidApproval.status, 1);
		assert.match(invalidApproval.stderr, /Unsupported approval action "self_destruct"/u);
		assert.match(invalidApproval.stderr, /network_access/u);
		assert.match(invalidApproval.stderr, /destructive_command/u);
		assert.match(invalidApproval.stderr, /git_commit/u);
		assert.equal(invalidApproval.stdout, '');
		assert.equal(existsSync(latestRunReceiptPath(projectPath)), false);
	} finally {
		removeTempProject(projectPath);
	}
});

test('previews blocked and unknown command intents without writing a receipt', () => {
	const projectPath = createTempProject();

	try {
		initProject(projectPath);
		appendIntent(
			projectPath,
			`
[intents.dev_server]
status = "configured"
lifecycle = "server"
run_policy = "requires_explicit_user_request"
description = "Run a development server."
argv = ['${process.execPath}', '-e', 'setInterval(() => {}, 1000)']
cwd = "."
timeout_seconds = 10
stdin = "closed"
success_exit_codes = [0]
writes = []
network = false
destructive = false
manual_start_hint = "Start this server in a human-controlled terminal."
health_check_url = "http://127.0.0.1:3000/health"
stop_instruction = "Stop the terminal process with Ctrl-C."
related_oneshot_checks = ["test_fast"]
`,
		);

		const manualOnlyResult = runCli(projectPath, ['run', 'snapshot_update', '--dry-run', '--json']);
		const manualOnlyPreview = JSON.parse(manualOnlyResult.stdout);

		assert.equal(manualOnlyResult.status, 1);
		assert.equal(manualOnlyPreview.runnable, false);
		assert.equal(manualOnlyPreview.status, 'manual_only');
		assert.equal(manualOnlyPreview.reason_code, 'status_not_configured');
		assert.match(manualOnlyPreview.suggested_intent_snippet, /\[intents\.snapshot_update\]/);
		assert.match(manualOnlyPreview.suggested_intent_snippet, /status = "manual_only"/);
		assert.match(manualOnlyPreview.suggested_intent_snippet, /agent_action = "do_not_guess_report_missing"/);

		const longRunningResult = runCli(projectPath, ['run', 'dev_server', '--dry-run', '--json']);
		const longRunningPreview = JSON.parse(longRunningResult.stdout);

		assert.equal(longRunningResult.status, 1);
		assert.equal(longRunningPreview.runnable, false);
		assert.equal(longRunningPreview.lifecycle, 'server');
		assert.equal(longRunningPreview.reason_code, 'lifecycle_not_oneshot');
		assert.match(longRunningPreview.suggested_intent_snippet, /\[intents\.dev_server\]/);
		assert.match(longRunningPreview.suggested_intent_snippet, /lifecycle = "server"/);
		assert.match(longRunningPreview.suggested_intent_snippet, /run_policy = "requires_explicit_user_request"/);
		assert.match(longRunningPreview.suggested_intent_snippet, /argv = \[/);
		assert.equal(longRunningPreview.manual_start_hint, 'Start this server in a human-controlled terminal.');
		assert.equal(longRunningPreview.health_check_url, 'http://127.0.0.1:3000/health');
		assert.equal(longRunningPreview.stop_instruction, 'Stop the terminal process with Ctrl-C.');
		assert.deepEqual(longRunningPreview.related_oneshot_checks, ['test_fast']);

		const unknownResult = runCli(projectPath, ['run', 'does_not_exist', '--plan-only', '--json']);
		const unknownPreview = JSON.parse(unknownResult.stdout);

		assert.equal(unknownResult.status, 1);
		assert.equal(unknownPreview.preview_mode, 'plan-only');
		assert.equal(unknownPreview.runnable, false);
		assert.equal(unknownPreview.reason_code, 'intent_not_table');
		assert.equal(unknownPreview.status, null);
		assert.match(unknownPreview.suggested_intent_snippet, /\[intents\.does_not_exist\]/);
		assert.match(unknownPreview.suggested_intent_snippet, /"TODO_REPLACE_WITH_COMMAND"/);
		assert.equal(existsSync(latestRunReceiptPath(projectPath)), false);
	} finally {
		removeTempProject(projectPath);
	}
});

test('refuses command plans with oversized output buffers', () => {
	const projectPath = createTempProject();

	try {
		initProject(projectPath);
		appendIntent(
			projectPath,
			`
[intents.too_much_output]
status = "configured"
lifecycle = "oneshot"
run_policy = "agent_allowed"
description = "Request too much output buffering."
argv = ['${process.execPath}', '-e', 'console.log("should not run")']
cwd = "."
timeout_seconds = 10
max_output_bytes = 16777217
stdin = "closed"
success_exit_codes = [0]
writes = []
network = false
destructive = false
`,
		);

		const result = runCli(projectPath, ['run', 'too_much_output', '--plan-only', '--json']);
		const preview = JSON.parse(result.stdout);

		assert.equal(result.status, 1);
		assert.equal(result.stderr, '');
		assert.equal(preview.runnable, false);
		assert.equal(preview.reason_code, 'max_output_bytes_exceeds_limit');
		assert.match(preview.detail, /16777216/);
		assert.equal(existsSync(latestRunReceiptPath(projectPath)), false);
	} finally {
		removeTempProject(projectPath);
	}
});

test('refuses commands with long-running or background patterns before execution', () => {
	const projectPath = createTempProject();
	const markerPath = path.join(projectPath, 'argv-bg-ran.txt');

	try {
		initProject(projectPath);
		appendIntent(
			projectPath,
			`
[intents.argv_bg]
status = "configured"
lifecycle = "oneshot"
run_policy = "agent_allowed"
description = "Try to hide background work in argv shell wrapper."
argv = ['${process.execPath}', '-e', 'require("node:fs").writeFileSync(${JSON.stringify(markerPath)}, "ran"); setInterval(() => {}, 1000)']
cwd = "."
timeout_seconds = 10
stdin = "closed"
success_exit_codes = [0]
writes = []
network = false
destructive = false

[intents.argv_node_eval_equals]
status = "configured"
lifecycle = "oneshot"
run_policy = "agent_allowed"
description = "Try to attach long-running Node evaluation code to a flag."
argv = ['${process.execPath}', '--eval=setInterval(() => {}, 1000)']
cwd = "."
timeout_seconds = 10
stdin = "closed"
success_exit_codes = [0]
writes = []
network = false
destructive = false

[intents.argv_python_attached]
status = "configured"
lifecycle = "oneshot"
run_policy = "agent_allowed"
description = "Try to attach long-running Python evaluation code to a flag."
argv = ["python", "-cwhile True: pass"]
cwd = "."
timeout_seconds = 10
stdin = "closed"
success_exit_codes = [0]
writes = []
network = false
destructive = false

[intents.argv_shell_attached]
status = "configured"
lifecycle = "oneshot"
run_policy = "agent_allowed"
description = "Try to attach a development server command to a shell wrapper flag."
argv = ["bash", '-c"npm run dev"']
cwd = "."
timeout_seconds = 10
stdin = "closed"
success_exit_codes = [0]
writes = []
network = false
destructive = false

[intents.argv_safe_exec]
status = "configured"
lifecycle = "oneshot"
run_policy = "agent_allowed"
description = "Safe package-manager one-shot command."
argv = ["npm", "exec", "eslint", "--", "src/index.ts"]
cwd = "."
timeout_seconds = 10
stdin = "closed"
success_exit_codes = [0]
writes = []
network = false
destructive = false

[intents.argv_safe_go_test]
status = "configured"
lifecycle = "oneshot"
run_policy = "agent_allowed"
description = "Safe Go one-shot test command."
argv = ["go", "test", "./..."]
cwd = "."
timeout_seconds = 10
stdin = "closed"
success_exit_codes = [0]
writes = []
network = false
destructive = false

[intents.argv_npx_vite]
status = "configured"
lifecycle = "oneshot"
run_policy = "agent_allowed"
description = "Try to hide a development server behind npx."
argv = ["npx", "vite"]
cwd = "."
timeout_seconds = 10
stdin = "closed"
success_exit_codes = [0]
writes = []
network = false
destructive = false

[intents.argv_npm_exec_vite]
status = "configured"
lifecycle = "oneshot"
run_policy = "agent_allowed"
description = "Try to hide a development server behind npm exec."
argv = ["npm", "exec", "vite"]
cwd = "."
timeout_seconds = 10
stdin = "closed"
success_exit_codes = [0]
writes = []
network = false
destructive = false

[intents.argv_bunx_vite]
status = "configured"
lifecycle = "oneshot"
run_policy = "agent_allowed"
description = "Try to hide a development server behind bunx."
argv = ["bunx", "vite"]
cwd = "."
timeout_seconds = 10
stdin = "closed"
success_exit_codes = [0]
writes = []
network = false
destructive = false

[intents.argv_turbo_dev]
status = "configured"
lifecycle = "oneshot"
run_policy = "agent_allowed"
description = "Try to run a long-running turbo dev process."
argv = ["turbo", "dev"]
cwd = "."
timeout_seconds = 10
stdin = "closed"
success_exit_codes = [0]
writes = []
network = false
destructive = false

[intents.argv_tsx_watch]
status = "configured"
lifecycle = "oneshot"
run_policy = "agent_allowed"
description = "Try to run a long-running tsx watcher."
argv = ["tsx", "watch", "src/index.ts"]
cwd = "."
timeout_seconds = 10
stdin = "closed"
success_exit_codes = [0]
writes = []
network = false
destructive = false

[intents.argv_python_http_server]
status = "configured"
lifecycle = "oneshot"
run_policy = "agent_allowed"
description = "Try to run a long-running Python HTTP server."
argv = ["python", "-m", "http.server"]
cwd = "."
timeout_seconds = 10
stdin = "closed"
success_exit_codes = [0]
writes = []
network = false
destructive = false

[intents.argv_julia_eval]
status = "configured"
lifecycle = "oneshot"
run_policy = "agent_allowed"
description = "Try to attach long-running Julia evaluation code to a flag."
argv = ["julia", "-e", "while true; end"]
cwd = "."
timeout_seconds = 10
stdin = "closed"
success_exit_codes = [0]
writes = []
network = false
destructive = false

[intents.argv_cargo_watch]
status = "configured"
lifecycle = "oneshot"
run_policy = "agent_allowed"
description = "Try to run cargo watch."
argv = ["cargo", "watch"]
cwd = "."
timeout_seconds = 10
stdin = "closed"
success_exit_codes = [0]
writes = []
network = false
destructive = false

[intents.argv_cargo_tauri_dev]
status = "configured"
lifecycle = "oneshot"
run_policy = "agent_allowed"
description = "Try to run cargo tauri dev."
argv = ["cargo", "tauri", "dev"]
cwd = "."
timeout_seconds = 10
stdin = "closed"
success_exit_codes = [0]
writes = []
network = false
destructive = false

[intents.argv_zig_build_watch]
status = "configured"
lifecycle = "oneshot"
run_policy = "agent_allowed"
description = "Try to run zig build in watch mode."
argv = ["zig", "build", "watch"]
cwd = "."
timeout_seconds = 10
stdin = "closed"
success_exit_codes = [0]
writes = []
network = false
destructive = false

[intents.argv_tauri_dev]
status = "configured"
lifecycle = "oneshot"
run_policy = "agent_allowed"
description = "Try to run tauri dev."
argv = ["tauri", "dev"]
cwd = "."
timeout_seconds = 10
stdin = "closed"
success_exit_codes = [0]
writes = []
network = false
destructive = false

[intents.argv_gh_run_watch]
status = "configured"
lifecycle = "oneshot"
run_policy = "agent_allowed"
description = "Try to run gh run watch."
argv = ["gh", "run", "watch"]
cwd = "."
timeout_seconds = 10
stdin = "closed"
success_exit_codes = [0]
writes = []
network = false
destructive = false

[intents.argv_gh_codespace_logs_follow]
status = "configured"
lifecycle = "oneshot"
run_policy = "agent_allowed"
description = "Try to follow GitHub Codespaces logs."
argv = ["gh", "codespace", "logs", "--follow"]
cwd = "."
timeout_seconds = 10
stdin = "closed"
success_exit_codes = [0]
writes = []
network = false
destructive = false

[intents.argv_deno_task_dev]
status = "configured"
lifecycle = "oneshot"
run_policy = "agent_allowed"
description = "Try to run a Deno dev task."
argv = ["deno", "task", "dev"]
cwd = "."
timeout_seconds = 10
stdin = "closed"
success_exit_codes = [0]
writes = []
network = false
destructive = false

[intents.argv_deno_run_watch]
status = "configured"
lifecycle = "oneshot"
run_policy = "agent_allowed"
description = "Try to run Deno in watch mode."
argv = ["deno", "run", "--watch", "server.ts"]
cwd = "."
timeout_seconds = 10
stdin = "closed"
success_exit_codes = [0]
writes = []
network = false
destructive = false

[intents.argv_pnpm_dlx_tauri]
status = "configured"
lifecycle = "oneshot"
run_policy = "agent_allowed"
description = "Try to hide a Tauri dev server behind pnpm dlx."
argv = ["pnpm", "dlx", "tauri", "dev"]
cwd = "."
timeout_seconds = 10
stdin = "closed"
success_exit_codes = [0]
writes = []
network = false
destructive = false

[intents.argv_flutter_run]
status = "configured"
lifecycle = "oneshot"
run_policy = "agent_allowed"
description = "Try to run a Flutter app."
argv = ["flutter", "run"]
cwd = "."
timeout_seconds = 10
stdin = "closed"
success_exit_codes = [0]
writes = []
network = false
destructive = false

[intents.argv_dart_build_runner_watch]
status = "configured"
lifecycle = "oneshot"
run_policy = "agent_allowed"
description = "Try to run Dart build_runner watch."
argv = ["dart", "run", "build_runner", "watch"]
cwd = "."
timeout_seconds = 10
stdin = "closed"
success_exit_codes = [0]
writes = []
network = false
destructive = false

[intents.argv_go_air]
status = "configured"
lifecycle = "oneshot"
run_policy = "agent_allowed"
description = "Try to run the Go air watcher."
argv = ["go", "run", "github.com/air-verse/air"]
cwd = "."
timeout_seconds = 10
stdin = "closed"
success_exit_codes = [0]
writes = []
network = false
destructive = false

[intents.shell_dev]
status = "configured"
lifecycle = "oneshot"
run_policy = "agent_allowed"
description = "Try to hide a development server in shell mode."
mode = "shell"
cmd = "npm run dev"
cwd = "."
timeout_seconds = 10
stdin = "closed"
success_exit_codes = [0]
writes = []
network = false
destructive = false

[intents.shell_zig_build_then_echo_watch]
status = "configured"
lifecycle = "oneshot"
run_policy = "agent_allowed"
description = "Run a bounded zig build before an unrelated watch word."
mode = "shell"
cmd = "zig build && echo watch"
allow_shell = true
cwd = "."
timeout_seconds = 10
stdin = "closed"
success_exit_codes = [0]
writes = []
network = false
destructive = false
`,
		);

		const result = runCli(projectPath, ['run', 'argv_bg', '--dry-run', '--json']);
		const preview = JSON.parse(result.stdout);
		const attachedNodeResult = runCli(projectPath, ['run', 'argv_node_eval_equals', '--dry-run', '--json']);
		const attachedNodePreview = JSON.parse(attachedNodeResult.stdout);
		const attachedPythonResult = runCli(projectPath, ['run', 'argv_python_attached', '--dry-run', '--json']);
		const attachedPythonPreview = JSON.parse(attachedPythonResult.stdout);
		const attachedShellResult = runCli(projectPath, ['run', 'argv_shell_attached', '--dry-run', '--json']);
		const attachedShellPreview = JSON.parse(attachedShellResult.stdout);
		const safeResult = runCli(projectPath, ['run', 'argv_safe_exec', '--dry-run', '--json']);
		const safePreview = JSON.parse(safeResult.stdout);
		const safeGoResult = runCli(projectPath, ['run', 'argv_safe_go_test', '--dry-run', '--json']);
		const safeGoPreview = JSON.parse(safeGoResult.stdout);
		const disguisedLongRunningPreviews = [
			['argv_npx_vite', /package-manager exec target vite/],
			['argv_npm_exec_vite', /package-manager exec target vite/],
			['argv_bunx_vite', /package-manager exec target vite/],
			['argv_turbo_dev', /turbo dev/],
			['argv_tsx_watch', /tsx watch/],
			['argv_python_http_server', /interpreter module "http\.server"/],
			['argv_julia_eval', /interpreter evaluation payload/],
			['argv_cargo_watch', /cargo watch/],
			['argv_cargo_tauri_dev', /cargo tauri dev/],
			['argv_zig_build_watch', /zig build watch/],
			['argv_tauri_dev', /tauri dev/],
			['argv_gh_run_watch', /gh run watch/],
			['argv_gh_codespace_logs_follow', /gh codespace logs follow/],
			['argv_deno_task_dev', /deno task dev/],
			['argv_deno_run_watch', /deno run watch/],
			['argv_pnpm_dlx_tauri', /package-manager exec target tauri dev/],
			['argv_flutter_run', /flutter run/],
			['argv_dart_build_runner_watch', /dart build_runner watch/],
			['argv_go_air', /go run air/],
		].map(([intent, detailPattern]) => {
			const blockedResult = runCli(projectPath, ['run', intent, '--dry-run', '--json']);
			return [blockedResult, JSON.parse(blockedResult.stdout), detailPattern];
		});
		const shellDevResult = runCli(projectPath, ['run', 'shell_dev', '--dry-run', '--json']);
		const shellDevPreview = JSON.parse(shellDevResult.stdout);
		const shellSafeZigResult = runCli(projectPath, ['run', 'shell_zig_build_then_echo_watch', '--dry-run', '--json']);
		const shellSafeZigPreview = JSON.parse(shellSafeZigResult.stdout);

		assert.equal(result.status, 1);
		assert.equal(preview.runnable, false);
		assert.equal(preview.reason_code, 'blocked_long_running_command_pattern');
		assert.match(preview.detail, /interpreter evaluation payload/);
		assert.match(preview.suggested_intent_snippet, /TODO_REPLACE_WITH_FINITE_COMMAND/);
		for (const [blockedResult, blockedPreview, detailPattern] of [
			[attachedNodeResult, attachedNodePreview, /interpreter evaluation payload/],
			[attachedPythonResult, attachedPythonPreview, /interpreter evaluation payload/],
			[attachedShellResult, attachedShellPreview, /shell wrapper payload/],
		]) {
			assert.equal(blockedResult.status, 1);
			assert.equal(blockedPreview.runnable, false);
			assert.equal(blockedPreview.reason_code, 'blocked_long_running_command_pattern');
			assert.match(blockedPreview.detail, detailPattern);
		}
		for (const [blockedResult, blockedPreview, detailPattern] of disguisedLongRunningPreviews) {
			assert.equal(blockedResult.status, 1);
			assert.equal(blockedPreview.runnable, false);
			assert.equal(blockedPreview.reason_code, 'blocked_long_running_command_pattern');
			assert.match(blockedPreview.detail, detailPattern);
		}
		assert.equal(existsSync(markerPath), false);
		assert.equal(existsSync(latestRunReceiptPath(projectPath)), false);
		assert.equal(shellDevResult.status, 1);
		assert.equal(shellDevPreview.runnable, false);
		assert.equal(shellDevPreview.reason_code, 'blocked_long_running_command_pattern');
		assert.match(shellDevPreview.detail, /Shell command contains/);
		assert.match(shellDevPreview.detail, /npm run dev/);
		assert.equal(safeResult.status, 0);
		assert.equal(safePreview.runnable, true);
		assert.equal(safePreview.reason_code, null);
		assert.equal(safeGoResult.status, 0);
		assert.equal(safeGoPreview.runnable, true);
		assert.equal(safeGoPreview.reason_code, null);
		assert.equal(shellSafeZigResult.status, 0);
		assert.equal(shellSafeZigPreview.runnable, true);
		assert.equal(shellSafeZigPreview.reason_code, null);
	} finally {
		removeTempProject(projectPath);
	}
});

test('previews command intent cwd boundary failures without spawning or writing a receipt', () => {
	const projectPath = createTempProject();
	const markerPath = path.join(path.dirname(projectPath), 'mustflow-outside-cwd-preview.txt');

	try {
		rmSync(markerPath, { force: true });
		initProject(projectPath);
		appendIntent(
			projectPath,
			`
[intents.outside_cwd_preview]
status = "configured"
lifecycle = "oneshot"
run_policy = "agent_allowed"
description = "Try to run outside the project root."
argv = ['${process.execPath}', '-e', 'require("node:fs").writeFileSync(${JSON.stringify(markerPath)}, "ran")']
cwd = ".."
timeout_seconds = 10
stdin = "closed"
success_exit_codes = [0]
writes = []
network = false
destructive = false
`,
		);

		const result = runCli(projectPath, ['run', 'outside_cwd_preview', '--dry-run', '--json']);
		const preview = JSON.parse(result.stdout);

		assert.equal(result.status, 1);
		assert.equal(result.stderr, '');
		assert.equal(preview.runnable, false);
		assert.equal(preview.reason_code, 'cwd_outside_project');
		assert.equal(preview.configured_cwd, '..');
		assert.equal(preview.resolved_cwd, null);
		assert.match(preview.detail, /Intent cwd must stay inside the current root/);
		assert.equal(existsSync(markerPath), false);
		assert.equal(existsSync(latestRunReceiptPath(projectPath)), false);
	} finally {
		rmSync(markerPath, { force: true });
		removeTempProject(projectPath);
	}
});

test('previews missing command intent cwd values as blocked without spawning or writing a receipt', () => {
	const projectPath = createTempProject();
	const markerPath = path.join(projectPath, 'missing-cwd-spawned.txt');

	try {
		initProject(projectPath);
		appendIntent(
			projectPath,
			`
[intents.missing_cwd_preview]
status = "configured"
lifecycle = "oneshot"
run_policy = "agent_allowed"
description = "Try to run inside a missing working directory."
argv = ['${process.execPath}', '-e', 'require("node:fs").writeFileSync(${JSON.stringify(markerPath)}, "ran")']
cwd = "missing-dir"
timeout_seconds = 10
stdin = "closed"
success_exit_codes = [0]
writes = []
network = false
destructive = false
`,
		);

		const result = runCli(projectPath, ['run', 'missing_cwd_preview', '--dry-run', '--json']);
		const preview = JSON.parse(result.stdout);

		assert.equal(result.status, 1);
		assert.equal(result.stderr, '');
		assert.equal(preview.runnable, false);
		assert.equal(preview.reason_code, 'cwd_outside_project');
		assert.equal(preview.configured_cwd, 'missing-dir');
		assert.equal(preview.resolved_cwd, null);
		assert.match(preview.detail, /Intent cwd must stay inside the current root/);
		assert.equal(existsSync(markerPath), false);
		assert.equal(existsSync(latestRunReceiptPath(projectPath)), false);
	} finally {
		removeTempProject(projectPath);
	}
});

test('previews command intent cwd symlink escapes without spawning or writing a receipt', (t) => {
	const projectPath = createTempProject();
	const outsideRoot = mkdtempSync(path.join(tmpdir(), 'mustflow-run-outside-'));
	const markerPath = path.join(outsideRoot, 'cwd-symlink-spawned.txt');

	try {
		initProject(projectPath);
		const linkPath = path.join(projectPath, 'linked-outside');
		const linkType = process.platform === 'win32' ? 'junction' : 'dir';
		if (!trySymlink(outsideRoot, linkPath, linkType)) {
			t.skip('directory symlinks are not available in this environment');
			return;
		}
		appendIntent(
			projectPath,
			`
[intents.outside_cwd_symlink_preview]
status = "configured"
lifecycle = "oneshot"
run_policy = "agent_allowed"
description = "Try to run through a symlink that leaves the project root."
argv = ['${process.execPath}', '-e', 'require("node:fs").writeFileSync(${JSON.stringify(markerPath)}, "ran")']
cwd = "linked-outside"
timeout_seconds = 10
stdin = "closed"
success_exit_codes = [0]
writes = []
network = false
destructive = false
`,
		);

		const result = runCli(projectPath, ['run', 'outside_cwd_symlink_preview', '--dry-run', '--json']);
		const preview = JSON.parse(result.stdout);

		assert.equal(result.status, 1);
		assert.equal(result.stderr, '');
		assert.equal(preview.runnable, false);
		assert.equal(preview.reason_code, 'cwd_outside_project');
		assert.equal(preview.configured_cwd, 'linked-outside');
		assert.equal(preview.resolved_cwd, null);
		assert.match(preview.detail, /Intent cwd must stay inside the current root/);
		assert.equal(existsSync(markerPath), false);
		assert.equal(existsSync(latestRunReceiptPath(projectPath)), false);
	} finally {
		rmSync(outsideRoot, { recursive: true, force: true });
		removeTempProject(projectPath);
	}
});

test('refuses non-oneshot command intents', () => {
	const projectPath = createTempProject();

	try {
		initProject(projectPath);
		appendIntent(
			projectPath,
			`
[intents.dev_server]
status = "configured"
lifecycle = "server"
run_policy = "requires_explicit_user_request"
description = "Run a development server."
argv = ['${process.execPath}', '-e', 'setInterval(() => {}, 1000)']
cwd = "."
timeout_seconds = 10
stdin = "closed"
success_exit_codes = [0]
writes = []
network = false
destructive = false
`,
		);

		const result = runCli(projectPath, ['run', 'dev_server']);

		assert.equal(result.status, 1);
		assert.match(result.stderr, /dev_server/);
		assert.match(result.stderr, /lifecycle = "server"/);
		assert.match(result.stderr, /Suggested command contract snippet/);
		assert.match(result.stderr, /\[intents\.dev_server\]/);
		assert.match(result.stderr, /mf run/);
	} finally {
		removeTempProject(projectPath);
	}
});

test('refuses command intent cwd values outside the mustflow root', () => {
	const projectPath = createTempProject();

	try {
		initProject(projectPath);
		appendIntent(
			projectPath,
			`
[intents.outside_cwd]
status = "configured"
lifecycle = "oneshot"
run_policy = "agent_allowed"
description = "Try to run outside the project root."
argv = ['${process.execPath}', '-e', 'console.log("outside")']
cwd = ".."
timeout_seconds = 10
stdin = "closed"
success_exit_codes = [0]
writes = []
network = false
destructive = false
`,
		);

		const result = runCli(projectPath, ['run', 'outside_cwd']);

		assert.equal(result.status, 1);
		assert.match(result.stderr, /Intent cwd must stay inside the current root/);
		assert.doesNotMatch(result.stdout, /outside/);
	} finally {
		removeTempProject(projectPath);
	}
});

test('prints and writes a JSON run receipt', () => {
	const projectPath = createTempProject();

	try {
		initProject(projectPath);
		appendIntent(
			projectPath,
			`
[intents.echo_json]
status = "configured"
lifecycle = "oneshot"
run_policy = "agent_allowed"
description = "Print a receipt test message."
argv = ['${process.execPath}', '-e', 'console.log("hello receipt")']
cwd = "."
timeout_seconds = 10
kill_after_seconds = 8
stdin = "closed"
success_exit_codes = [0]
writes = []
network = false
destructive = false
`,
		);

		const result = runCli(projectPath, ['run', 'echo_json', '--json']);
		const receipt = JSON.parse(result.stdout);
		const latestPath = path.join(projectPath, '.mustflow', 'state', 'runs', 'latest.json');
		const latest = JSON.parse(readFileSync(latestPath, 'utf8'));
		const latestIndex = JSON.parse(readFileSync(latestRunReceiptIndexPath(projectPath), 'utf8'));
		const performanceSamples = JSON.parse(readFileSync(runPerformanceSamplesPath(projectPath), 'utf8'));
		const performanceSummary = JSON.parse(readFileSync(runPerformanceSummaryPath(projectPath), 'utf8'));
		const performanceSample = performanceSamples.samples.at(-1);
		const performanceFingerprintSummary = performanceSummary.intents.echo_json.fingerprints[receipt.performance.intent_fingerprint];

		assert.equal(result.status, 0);
		assert.equal(result.stderr, '');
		assert.equal(receipt.schema_version, '1');
		assert.equal(receipt.command, 'run');
		assert.match(receipt.correlation_id, /^mf-run-[0-9a-f]{16}$/u);
		assert.equal(receipt.intent, 'echo_json');
		assert.equal(receipt.status, 'passed');
		assert.equal(receipt.timed_out, false);
		assert.equal(receipt.exit_code, 0);
		assert.equal(receipt.env_policy, 'minimal');
		assert.deepEqual(receipt.env_allowlist, []);
		assert.equal(receipt.timeout_seconds, 10);
		assert.equal(receipt.kill_after_seconds, 8);
		assert.equal(receipt.max_output_bytes_scope, 'per_stream');
		assert.equal(receipt.stdout.truncated, false);
		assert.match(receipt.stdout.tail, /hello receipt/);
		assert.equal(receipt.stdout.redacted, false);
		assert.equal(receipt.stdout.redaction_count, 0);
		assert.deepEqual(receipt.stdout.redaction_kinds, []);
		assert.equal(receipt.stderr.redacted, false);
		assert.equal(receipt.performance.schema_version, '1');
		assert.equal(receipt.performance.measurement, 'wall_clock');
		assert.equal(receipt.performance.duration_ms, receipt.duration_ms);
		assert.equal(typeof receipt.performance.executor_overhead_ms, 'number');
		assert.ok(receipt.performance.executor_overhead_ms >= 0);
		assert.equal(typeof receipt.performance.timeout_ratio, 'number');
		assert.match(receipt.performance.command_fingerprint, /^sha256:[a-f0-9]{64}$/);
		assert.match(receipt.performance.intent_fingerprint, /^sha256:[a-f0-9]{64}$/);
		assert.match(receipt.performance.contract_fingerprint, /^sha256:[a-f0-9]{64}$/);
		assert.equal(receipt.performance.runner.kind, 'local');
		assert.equal(receipt.performance.runner.platform_family, process.platform);
		assert.equal(receipt.performance.runner.arch_family, process.arch);
		assert.ok(['node', 'bun'].includes(receipt.performance.runner.runtime));
		assert.equal(receipt.performance.output_summary.stdout_bytes, receipt.stdout.bytes);
		assert.equal(receipt.performance.output_summary.stderr_bytes, receipt.stderr.bytes);
		assert.equal(receipt.performance.output_summary.total_bytes, receipt.stdout.bytes + receipt.stderr.bytes);
		assert.equal(receipt.performance.output_summary.stdout_truncated, receipt.stdout.truncated);
		assert.equal(receipt.performance.output_summary.stderr_truncated, receipt.stderr.truncated);
		assert.equal(receipt.performance.output_summary.max_output_bytes_scope, 'per_stream');
		assert.equal(receipt.performance.result_summary.status, 'passed');
		assert.equal(receipt.performance.result_summary.exit_code_class, 'success');
		assert.equal(receipt.performance.result_summary.timed_out, false);
		assert.equal(receipt.performance.result_summary.error_kind, null);
		assert.equal(receipt.performance.quality.phase_timings_source, 'none');
		assert.equal(receipt.performance.phases, undefined);
		assert.deepEqual(receipt.performance.selection, {
			strategy: 'direct_intent',
			changed_file_count: 0,
			changed_surface_counts: {},
			selected_target_count: 1,
			fallback_used: false,
		});
		assert.equal(receipt.performance.quality.target_timings_source, 'none');
		assert.equal(receipt.performance.quality.usable_for_history, true);
		assert.equal(receipt.redaction.redacted, false);
		assert.equal(receipt.redaction.redaction_count, 0);
		assert.deepEqual(receipt.redaction.fields, []);
		assert.equal(receipt.write_drift.status, 'unavailable');
		assert.equal(receipt.write_drift.coverage_complete, false);
		assert.deepEqual(receipt.write_drift.declared_paths, []);
		assert.deepEqual(receipt.write_drift.observed_paths, []);
		assert.deepEqual(receipt.write_drift.undeclared_paths, []);
		assert.equal(receipt.write_drift.has_undeclared_changes, false);
		assert.equal(receipt.write_drift.reason, 'git_status_unavailable_recursive_snapshot_disabled');
		assert.ok(existsSync(latestPath));
		assert.match(receipt.receipt_path, /^\.mustflow\/state\/runs\/run-.*\/receipt\.json$/u);
		assert.ok(existsSync(path.join(projectPath, receipt.receipt_path)));
		assert.deepEqual(latest, receipt);
		assert.equal(latestIndex.schema_version, '1');
		assert.equal(latestIndex.kind, 'run_receipt_index');
		assert.equal(latestIndex.retention.max_items, 50);
		assert.equal(latestIndex.retention.retained_run_dirs, 1);
		assert.equal(latestIndex.entries.length, 1);
		assert.equal(latestIndex.entries[0].command, 'run');
		assert.equal(latestIndex.entries[0].intent, 'echo_json');
		assert.equal(latestIndex.entries[0].status, 'passed');
		assert.equal(latestIndex.entries[0].cwd, '.');
		assert.equal(latestIndex.entries[0].correlation_id, receipt.correlation_id);
		assert.equal(latestIndex.entries[0].receipt_path, receipt.receipt_path);
		assert.equal(latestIndex.latest_by_intent.echo_json, receipt.receipt_path);
		assert.equal(latestIndex.latest_by_cwd_intent['.::echo_json'], receipt.receipt_path);
		assert.equal(performanceSamples.schema_version, '1');
		assert.equal(performanceSamples.retention.max_age_days, 30);
		assert.equal(performanceSamples.retention.max_total_kb, 256);
		assert.equal(performanceSamples.retention.stores_output_tails, false);
		assert.equal(performanceSamples.retention.stores_command_line, false);
		assert.equal(performanceSamples.retention.stores_environment_values, false);
		assert.equal(performanceSamples.retention.stores_absolute_paths, false);
		assert.equal(performanceSamples.retention.stores_test_names, false);
		assert.equal(performanceSamples.samples.length, 1);
		assert.match(performanceSample.observed_day, /^\d{4}-\d{2}-\d{2}$/);
		assert.equal(performanceSample.intent, 'echo_json');
		assert.equal(performanceSample.intent_fingerprint, receipt.performance.intent_fingerprint);
		assert.equal(performanceSample.command_fingerprint, receipt.performance.command_fingerprint);
		assert.equal(performanceSample.contract_fingerprint, receipt.performance.contract_fingerprint);
		assert.equal(performanceSample.duration_ms, receipt.performance.duration_ms);
		assert.equal(performanceSample.executor_overhead_ms, receipt.performance.executor_overhead_ms);
		assert.equal(performanceSample.timeout_ratio, receipt.performance.timeout_ratio);
		assert.equal(performanceSample.status, 'passed');
		assert.equal(performanceSample.exit_code_class, 'success');
		assert.equal(performanceSample.stdout_bytes, receipt.stdout.bytes);
		assert.equal(performanceSample.stderr_bytes, receipt.stderr.bytes);
		assert.equal(performanceSample.selection_strategy, 'direct_intent');
		assert.equal(performanceSample.changed_file_count, 0);
		assert.deepEqual(performanceSample.changed_surface_counts, {});
		assert.equal(performanceSample.selected_target_count, 1);
		assert.equal(performanceSample.fallback_used, false);
		assert.equal(performanceSummary.schema_version, '1');
		assert.equal(performanceSummary.generated_day, performanceSample.observed_day);
		assert.equal(performanceFingerprintSummary.sample_count, 1);
		assert.equal(performanceFingerprintSummary.success_count, 1);
		assert.equal(performanceFingerprintSummary.failure_count, 0);
		assert.equal(performanceFingerprintSummary.p50_duration_ms, receipt.performance.duration_ms);
		assert.equal(performanceFingerprintSummary.last_success_duration_ms, receipt.performance.duration_ms);
		assert.doesNotMatch(JSON.stringify(performanceSamples), /hello receipt/);
		assert.doesNotMatch(JSON.stringify(performanceSummary), /hello receipt/);
	} finally {
		removeTempProject(projectPath);
	}
});

test('applies run receipt retention and keeps a rebuilt latest index', () => {
	const projectPath = createTempProject();

	try {
		initProject(projectPath);

		const configPath = path.join(projectPath, '.mustflow', 'config', 'mustflow.toml');
		const config = readFileSync(configPath, 'utf8').replace('max_items = 50', 'max_items = 2');
		writeFileSync(configPath, config);
		refreshManifestLockHash(projectPath, '.mustflow/config/mustflow.toml');

		for (const intent of ['first_receipt', 'second_receipt', 'third_receipt']) {
			appendIntent(
				projectPath,
				`
[intents.${intent}]
status = "configured"
lifecycle = "oneshot"
run_policy = "agent_allowed"
description = "Print ${intent}."
argv = ['${process.execPath}', '-e', 'console.log("${intent}")']
cwd = "."
timeout_seconds = 10
stdin = "closed"
success_exit_codes = [0]
writes = []
network = false
destructive = false
`,
			);
			const result = runCli(projectPath, ['run', intent, '--json']);
			assert.equal(result.status, 0, result.stderr || result.stdout);
		}

		const runsDir = path.join(projectPath, '.mustflow', 'state', 'runs');
		const runDirs = readdirSync(runsDir).filter((entry) => entry.startsWith('run-')).sort();
		const latest = JSON.parse(readFileSync(latestRunReceiptPath(projectPath), 'utf8'));
		const latestIndex = JSON.parse(readFileSync(latestRunReceiptIndexPath(projectPath), 'utf8'));

		assert.equal(runDirs.length, 2);
		assert.ok(existsSync(latestRunReceiptPath(projectPath)));
		assert.ok(existsSync(latestRunReceiptIndexPath(projectPath)));
		assert.equal(latest.intent, 'third_receipt');
		assert.equal(latestIndex.retention.max_items, 2);
		assert.equal(latestIndex.retention.retained_run_dirs, 2);
		assert.deepEqual(latestIndex.entries.map((entry) => entry.intent), ['third_receipt', 'second_receipt']);
		assert.equal(latestIndex.latest_by_intent.third_receipt, latest.receipt_path);
		assert.equal(latestIndex.latest_by_cwd_intent['.::third_receipt'], latest.receipt_path);
		assert.equal(latestIndex.latest_by_intent.first_receipt, undefined);
	} finally {
		removeTempProject(projectPath);
	}
});

test('rejects verify receipt paths outside the run receipt state prefix when rebuilding latest index', async () => {
	const projectPath = createTempProject();
	const { updateRunReceiptState } = await import(
		pathToFileURL(path.join(projectRoot, 'dist', 'core', 'run-receipt-state.js')).href
	);

	try {
		const verifyDir = path.join(projectPath, '.mustflow', 'state', 'runs', 'verify-manual');
		const intentsDir = path.join(verifyDir, 'intents');
		mkdirSync(intentsDir, { recursive: true });
		writeFileSync(
			path.join(intentsDir, '001-verify_echo.json'),
			`${JSON.stringify({ command: 'run', intent: 'verify_echo', cwd: '.', status: 'passed' }, null, 2)}\n`,
		);
		writeFileSync(
			path.join(verifyDir, 'manifest.json'),
			`${JSON.stringify(
				{
					command: 'verify',
					status: 'passed',
					correlation_id: 'manual-correlation',
					verification_plan_id: 'manual-plan',
					receipts: [
						{
							intent: 'verify_echo',
							status: 'passed',
							receipt_path: '.mustflow/state/not-runs/verify-manual/intents/001-verify_echo.json',
						},
					],
				},
				null,
				2,
			)}\n`,
		);

		updateRunReceiptState(projectPath, { maxItems: 50, maxTotalMb: 10 });

		const latestIndex = JSON.parse(readFileSync(latestRunReceiptIndexPath(projectPath), 'utf8'));
		assert.equal(latestIndex.entries.length, 1);
		assert.equal(latestIndex.entries[0].command, 'verify');
		assert.equal(latestIndex.entries[0].intent, null);
		assert.deepEqual(latestIndex.latest_by_intent, {});
		assert.deepEqual(latestIndex.latest_by_cwd_intent, {});
	} finally {
		removeTempProject(projectPath);
	}
});

test('keeps performance history bounded and separate from raw run receipts', async () => {
	const projectPath = createTempProject();
	const { recordRunPerformanceHistory } = await import(
		pathToFileURL(path.join(projectRoot, 'dist', 'core', 'run-performance-history.js')).href
	);
	const intentFingerprint = `sha256:${'a'.repeat(64)}`;

	try {
		for (let index = 0; index < 45; index += 1) {
			recordRunPerformanceHistory(projectPath, {
				finished_at: '2026-05-15T12:00:00.000Z',
				correlation_id: `perf-correlation-${String(index).padStart(2, '0')}`,
				receipt_path: `.mustflow/state/runs/run-perf-${String(index).padStart(2, '0')}/receipt.json`,
				intent: 'perf_fixture',
				stdout: {
					tail: `raw receipt tail ${index}`,
				},
				stderr: {
					tail: `raw receipt error ${index}`,
				},
				performance: {
					quality: {
						usable_for_history: true,
					},
					result_summary: {
						status: 'passed',
						exit_code_class: 'success',
						error_kind: null,
					},
					intent_fingerprint: intentFingerprint,
					command_fingerprint: `sha256:${'b'.repeat(64)}`,
					contract_fingerprint: `sha256:${'c'.repeat(64)}`,
					runner: {
						kind: 'local',
						platform_family: process.platform,
						arch_family: process.arch,
						runtime: 'node',
						runtime_major: Number.parseInt(process.versions.node.split('.')[0], 10),
					},
					duration_ms: 1000 + index,
					timeout_ratio: 0.1,
					output_summary: {
						stdout_bytes: 10 + index,
						stderr_bytes: index,
					},
					selection: {
						strategy: 'direct_intent',
						changed_file_count: 0,
						changed_surface_counts: {},
						selected_target_count: 1,
						fallback_used: false,
					},
				},
			});
		}

		const samples = JSON.parse(readFileSync(runPerformanceSamplesPath(projectPath), 'utf8'));
		const summary = JSON.parse(readFileSync(runPerformanceSummaryPath(projectPath), 'utf8'));
		const fingerprintSummary = summary.intents.perf_fixture.fingerprints[intentFingerprint];
		const serializedHistory = `${JSON.stringify(samples)}\n${JSON.stringify(summary)}`;

		assert.equal(samples.samples.length, 20);
		assert.equal(samples.samples[0].duration_ms, 1025);
		assert.equal(samples.samples.at(-1).duration_ms, 1044);
		assert.equal(fingerprintSummary.sample_count, 20);
		assert.equal(fingerprintSummary.last_success_duration_ms, 1044);
		assert.equal(existsSync(latestRunReceiptPath(projectPath)), false);
		assert.doesNotMatch(serializedHistory, /raw receipt tail/);
		assert.doesNotMatch(serializedHistory, /raw receipt error/);
	} finally {
		removeTempProject(projectPath);
	}
});

test('serializes run state updates through a short shared mutex', async () => {
	const projectPath = createTempProject();
	const { withRunStateUpdateMutex } = await import(pathToFileURL(path.join(projectRoot, 'dist', 'core', 'active-run-locks.js')).href);
	const waitingPath = path.join(projectPath, 'waiting-for-state-lock.txt');
	const markerPath = path.join(projectPath, 'entered-state-lock.txt');
	const childScript = `
import { writeFileSync } from 'node:fs';
import { withRunStateUpdateMutex } from ${JSON.stringify(pathToFileURL(path.join(projectRoot, 'dist', 'core', 'active-run-locks.js')).href)};

writeFileSync(process.argv[2], 'waiting');
withRunStateUpdateMutex(process.argv[1], () => {
\twriteFileSync(process.argv[3], 'entered');
\tconsole.log('entered');
});
`;
	const stdout = [];
	const stderr = [];
	let child;

	try {
		withRunStateUpdateMutex(projectPath, () => {
			child = spawn(process.execPath, ['--input-type=module', '-e', childScript, projectPath, waitingPath, markerPath], {
				cwd: projectPath,
				encoding: 'utf8',
				stdio: ['ignore', 'pipe', 'pipe'],
				windowsHide: true,
			});
			child.stdout.on('data', (chunk) => stdout.push(chunk.toString()));
			child.stderr.on('data', (chunk) => stderr.push(chunk.toString()));

			const startedAt = Date.now();
			while (!existsSync(waitingPath) && Date.now() - startedAt < 2_000) {
				Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 25);
			}
			assert.equal(existsSync(waitingPath), true);
			assert.equal(existsSync(markerPath), false);
		});

		const closeResult = await waitForClose(child);

		assert.equal(closeResult.status, 0, stderr.join(''));
		assert.equal(readFileSync(markerPath, 'utf8'), 'entered');
		assert.match(stdout.join(''), /entered/);
	} finally {
		removeTempProject(projectPath);
	}
});

test('keeps receipt performance fields limited to safe structured values', async () => {
	const projectPath = createTempProject();
	const { createRunReceipt } = await import(pathToFileURL(path.join(projectRoot, 'dist', 'core', 'run-receipt.js')).href);

	try {
		const receipt = createRunReceipt({
			correlationId: 'mf-run-0000000000000001',
			intent: 'structured_perf_fixture',
			status: 'passed',
			timedOut: false,
			startedAt: new Date('2026-05-15T12:00:00.000Z'),
			finishedAt: new Date('2026-05-15T12:00:02.000Z'),
			projectRoot: projectPath,
			cwd: projectPath,
			lifecycle: 'oneshot',
			runPolicy: 'agent_allowed',
			mode: 'argv',
			argv: [process.execPath, '-e', 'console.log("ok")'],
			envPolicy: 'minimal',
			envAllowlist: [],
			timeoutSeconds: 10,
			maxOutputBytes: 1024,
			successExitCodes: [0],
			exitCode: 0,
			signal: null,
			error: null,
			killMethod: null,
			stdout: 'ok\n',
			stderr: '',
			writeDrift: {
				status: 'unavailable',
				declared_paths: [],
				observed_paths: [],
				undeclared_paths: [],
				has_undeclared_changes: false,
				reason: 'test_fixture',
			},
			phaseTimings: [
				{ name: 'child_command', duration_ms: 1.23456 },
				{ name: 'child-command', duration_ms: 2 },
				{ name: 'secret_path', duration_ms: -1 },
				{ name: 'token', duration_ms: Number.NaN },
			],
			selectionSummary: {
				strategy: 'direct-intent',
				changed_file_count: 0,
				changed_surface_counts: {
					'source/path': 1,
				},
				selected_target_count: 1,
				fallback_used: false,
			},
		});
		const serializedPerformance = JSON.stringify(receipt.performance);

		assert.deepEqual(receipt.performance.phases, [{ name: 'child_command', duration_ms: 1.235 }]);
		assert.equal(receipt.performance.quality.phase_timings_source, 'structured_report');
		assert.equal(receipt.performance.selection, undefined);
		assert.doesNotMatch(serializedPerformance, /child-command/);
		assert.doesNotMatch(serializedPerformance, /source\/path/);
		assert.doesNotMatch(serializedPerformance, /direct-intent/);
	} finally {
		removeTempProject(projectPath);
	}
});

test('keeps bounded output tails on UTF-8 character boundaries', async () => {
	const { BoundedOutputBuffer } = await import(pathToFileURL(path.join(projectRoot, 'dist', 'core', 'bounded-output.js')).href);
	const buffer = new BoundedOutputBuffer(2);

	buffer.append('한');

	const snapshot = buffer.toSnapshot();

	assert.equal(snapshot.bytes, Buffer.byteLength('한', 'utf8'));
	assert.equal(snapshot.tail, '');
	assert.doesNotMatch(snapshot.tail, /\uFFFD/u);
});

test('keeps bounded output tails when many small chunks overflow the buffer', async () => {
	const { BoundedOutputBuffer } = await import(pathToFileURL(path.join(projectRoot, 'dist', 'core', 'bounded-output.js')).href);
	const buffer = new BoundedOutputBuffer(5);

	for (const chunk of ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h']) {
		buffer.append(chunk);
	}

	const snapshot = buffer.toSnapshot();

	assert.equal(snapshot.bytes, 8);
	assert.equal(snapshot.tail, 'defgh');
});

test('keeps receipt output tails on UTF-8 character boundaries', async () => {
	const projectPath = createTempProject();
	const { createRunReceipt } = await import(pathToFileURL(path.join(projectRoot, 'dist', 'core', 'run-receipt.js')).href);

	try {
		const receipt = createRunReceipt({
			correlationId: 'mf-run-0000000000000002',
			intent: 'utf8_tail_fixture',
			status: 'passed',
			timedOut: false,
			startedAt: new Date('2026-05-15T12:00:00.000Z'),
			finishedAt: new Date('2026-05-15T12:00:01.000Z'),
			projectRoot: projectPath,
			cwd: projectPath,
			lifecycle: 'oneshot',
			runPolicy: 'agent_allowed',
			mode: 'argv',
			argv: [process.execPath, '-e', 'process.stdout.write("한")'],
			envPolicy: 'minimal',
			envAllowlist: [],
			timeoutSeconds: 10,
			maxOutputBytes: 2,
			successExitCodes: [0],
			exitCode: 0,
			signal: null,
			error: null,
			killMethod: null,
			stdout: '한',
			stderr: '',
			writeDrift: {
				status: 'unavailable',
				declared_paths: [],
				observed_paths: [],
				undeclared_paths: [],
				has_undeclared_changes: false,
				reason: 'test_fixture',
			},
			stdoutTailBytes: 2,
			stderrTailBytes: 2,
		});

		assert.equal(receipt.stdout.bytes, Buffer.byteLength('한', 'utf8'));
		assert.equal(receipt.stdout.truncated, true);
		assert.equal(receipt.stdout.tail, '');
		assert.doesNotMatch(receipt.stdout.tail, /\uFFFD/u);
	} finally {
		removeTempProject(projectPath);
	}
});

test('streams non-JSON child output before command completion and stores only a bounded receipt tail', async () => {
	const projectPath = createTempProject();

	try {
		initProject(projectPath);

		const configPath = path.join(projectPath, '.mustflow', 'config', 'mustflow.toml');
		const config = readFileSync(configPath, 'utf8').replace('keep_stdout_tail_bytes = 65536', 'keep_stdout_tail_bytes = 4');
		writeFileSync(configPath, config);
		refreshManifestLockHash(projectPath, '.mustflow/config/mustflow.toml');

		appendIntent(
			projectPath,
			`
[intents.stream_stdout]
status = "configured"
lifecycle = "oneshot"
run_policy = "agent_allowed"
description = "Print stdout before and after a delay."
argv = ['${process.execPath}', '-e', 'process.stdout.write("early"); setTimeout(() => process.stdout.write("late"), 500)']
cwd = "."
timeout_seconds = 10
stdin = "closed"
success_exit_codes = [0]
writes = []
`,
		);

		const stdout = [];
		const stderr = [];
		let closed = false;
		const child = spawn(process.execPath, [cliPath, 'run', 'stream_stdout'], {
			cwd: projectPath,
			encoding: 'utf8',
			stdio: ['ignore', 'pipe', 'pipe'],
			windowsHide: true,
		});

		child.stdout.on('data', (chunk) => stdout.push(chunk.toString()));
		child.stderr.on('data', (chunk) => stderr.push(chunk.toString()));
		child.once('close', () => {
			closed = true;
		});

		await waitForOutput(() => stdout.join(''), /early/, STREAM_STARTUP_WAIT_MS);
		assert.equal(closed, false);

		const closeResult = await waitForClose(child);
		const receipt = JSON.parse(readFileSync(latestRunReceiptPath(projectPath), 'utf8'));

		assert.equal(closeResult.status, 0, stderr.join(''));
		assert.equal(stdout.join(''), 'earlylate');
		assert.equal(receipt.status, 'passed');
		assert.equal(receipt.stdout.bytes, 9);
		assert.equal(receipt.stdout.truncated, true);
		assert.equal(receipt.stdout.tail, 'late');
	} finally {
		removeTempProject(projectPath);
	}
});

test('preserves streamed chunks for custom reporters without raw write methods', async () => {
	const projectPath = createTempProject();
	const previousCwd = process.cwd();

	try {
		initProject(projectPath);
		appendIntent(
			projectPath,
			`
[intents.stream_chunks]
status = "configured"
lifecycle = "oneshot"
run_policy = "agent_allowed"
description = "Print whitespace-sensitive chunks."
argv = ['${process.execPath}', '-e', 'process.stdout.write("stdout  \\n"); process.stderr.write("stderr  \\n")']
cwd = "."
timeout_seconds = 10
stdin = "closed"
success_exit_codes = [0]
writes = []
network = false
destructive = false
`,
		);

		const { runRun } = await import(pathToFileURL(path.join(projectRoot, 'dist', 'cli', 'commands', 'run.js')).href);
		const stdout = [];
		const stderr = [];

		process.chdir(projectPath);

		const status = await runRun(
			['stream_chunks'],
			{
				stdout(message) {
					stdout.push(message);
				},
				stderr(message) {
					stderr.push(message);
				},
			},
			'en',
		);

		assert.equal(status, 0);
		assert.equal(stdout.join(''), 'stdout  \n');
		assert.equal(stderr.join(''), 'stderr  \n');
	} finally {
		process.chdir(previousCwd);
		removeTempProject(projectPath);
	}
});

test('writes an opt-in run profile without command output or environment values', () => {
	const projectPath = createTempProject();
	const envSecret = 'profile-secret-value';

	try {
		initProject(projectPath);
		appendIntent(
			projectPath,
			`
[intents.profile_probe]
status = "configured"
lifecycle = "oneshot"
run_policy = "agent_allowed"
description = "Print output while run profiling is enabled."
argv = ['${process.execPath}', '-e', 'console.log("profile child output"); console.error(process.env.MUSTFLOW_TEST_SECRET_ENV || "missing")']
cwd = "."
timeout_seconds = 10
stdin = "closed"
success_exit_codes = [0]
writes = []
network = false
destructive = false
`,
		);

		const result = runCli(projectPath, ['run', 'profile_probe', '--json'], {
			env: {
				...createEnvWithCommandPolicyFixtures(),
				MUSTFLOW_RUN_PROFILE: '1',
				MUSTFLOW_TEST_SECRET_ENV: envSecret,
			},
		});
		const receipt = JSON.parse(result.stdout);
		const profilePath = latestRunProfilePath(projectPath);
		const profile = JSON.parse(readFileSync(profilePath, 'utf8'));
		const performanceSamples = JSON.parse(readFileSync(runPerformanceSamplesPath(projectPath), 'utf8'));
		const performanceSample = performanceSamples.samples.at(-1);
		const serializedProfile = JSON.stringify(profile);
		const serializedReceiptPerformance = JSON.stringify(receipt.performance);
		const serializedPerformanceSample = JSON.stringify(performanceSample);
		const phaseNames = profile.phases.map((phase) => phase.name);
		const receiptPhaseNames = receipt.performance.phases.map((phase) => phase.name);

		assert.equal(result.status, 0, result.stderr || result.stdout);
		assert.equal(receipt.status, 'passed');
		assert.equal(receipt.performance.quality.phase_timings_source, 'structured_report');
		assert.ok(receiptPhaseNames.includes('root_detection'));
		assert.ok(receiptPhaseNames.includes('command_contract'));
		assert.ok(receiptPhaseNames.includes('plan_creation'));
		assert.ok(receiptPhaseNames.includes('environment'));
		assert.ok(receiptPhaseNames.includes('write_drift_before'));
		assert.ok(receiptPhaseNames.includes('child_command'));
		assert.ok(receiptPhaseNames.includes('write_drift_after'));
		assert.ok(receipt.performance.phases.every((phase) => typeof phase.duration_ms === 'number' && phase.duration_ms >= 0));
		assert.equal(performanceSample.phase_durations_ms.child_command, receipt.performance.phases.find((phase) => phase.name === 'child_command').duration_ms);
		assert.ok(existsSync(profilePath));
		assert.equal(profile.schema_version, '1');
		assert.equal(profile.command, 'run');
		assert.equal(profile.profile, true);
		assert.equal(profile.profile_window, 'run_command_handler');
		assert.equal(profile.intent, 'profile_probe');
		assert.equal(profile.status, 'passed');
		assert.equal(profile.preview_mode, null);
		assert.equal(profile.profile_path, '.mustflow/state/runs/latest.profile.json');
		assert.equal(typeof profile.duration_ms, 'number');
		assert.ok(profile.duration_ms >= 0);
		assert.ok(phaseNames.includes('root_detection'));
		assert.ok(phaseNames.includes('command_contract'));
		assert.ok(phaseNames.includes('plan_creation'));
		assert.ok(phaseNames.includes('environment'));
		assert.ok(phaseNames.includes('write_drift_before'));
		assert.ok(phaseNames.includes('child_command'));
		assert.ok(phaseNames.includes('write_drift_after'));
		assert.ok(phaseNames.includes('receipt_create'));
		assert.ok(phaseNames.includes('receipt_write'));
		assert.ok(profile.phases.every((phase) => typeof phase.duration_ms === 'number' && phase.duration_ms >= 0));
		assert.doesNotMatch(serializedProfile, /profile child output/);
		assert.doesNotMatch(serializedProfile, new RegExp(envSecret));
		assert.doesNotMatch(serializedReceiptPerformance, /profile child output/);
		assert.doesNotMatch(serializedReceiptPerformance, new RegExp(envSecret));
		assert.doesNotMatch(serializedPerformanceSample, /profile child output/);
		assert.doesNotMatch(serializedPerformanceSample, new RegExp(envSecret));
	} finally {
		removeTempProject(projectPath);
	}
});

test('run command options can suppress auxiliary run state writes', async () => {
	const projectPath = createTempProject();
	const previousCwd = process.cwd();
	const previousProfile = process.env.MUSTFLOW_RUN_PROFILE;

	try {
		initProject(projectPath);
		appendIntent(
			projectPath,
			`
[intents.no_auxiliary_state]
status = "configured"
lifecycle = "oneshot"
run_policy = "agent_allowed"
description = "Run without writing latest receipt, latest profile, or performance history."
argv = ['${process.execPath}', '-e', 'console.log("no auxiliary state")']
cwd = "."
timeout_seconds = 10
stdin = "closed"
success_exit_codes = [0]
writes = []
network = false
destructive = false
`,
		);
		process.chdir(projectPath);
		process.env.MUSTFLOW_RUN_PROFILE = '1';

		const { runRun } = await import(pathToFileURL(path.join(projectRoot, 'dist', 'cli', 'commands', 'run.js')).href);
		const stdout = [];
		const stderr = [];
		const status = await runRun(
			['no_auxiliary_state', '--json'],
			{
				stdout(message) {
					stdout.push(message);
				},
				stderr(message) {
					stderr.push(message);
				},
			},
			'en',
			{
				writeLatestReceipt: false,
				writeLatestProfile: false,
				recordPerformanceHistory: false,
				writeDriftTracking: 'batch',
			},
		);
		const receipt = JSON.parse(stdout.join(''));

		assert.equal(status, 0, stderr.join(''));
		assert.equal(receipt.status, 'passed');
		assert.equal(receipt.write_drift.status, 'unavailable');
		assert.equal(receipt.write_drift.reason, 'parallel_batch_tracking_pending');
		assert.equal(receipt.performance.phases.some((phase) => phase.name === 'write_drift_before'), false);
		assert.equal(receipt.performance.phases.some((phase) => phase.name === 'write_drift_after'), false);
		assert.equal(existsSync(latestRunReceiptPath(projectPath)), false);
		assert.equal(existsSync(latestRunProfilePath(projectPath)), false);
		assert.equal(existsSync(runPerformanceSamplesPath(projectPath)), false);
		assert.equal(existsSync(runPerformanceSummaryPath(projectPath)), false);
	} finally {
		if (previousProfile === undefined) {
			delete process.env.MUSTFLOW_RUN_PROFILE;
		} else {
			process.env.MUSTFLOW_RUN_PROFILE = previousProfile;
		}
		process.chdir(previousCwd);
		removeTempProject(projectPath);
	}
});

test('uses retention policy tail byte limits for JSON run receipts', () => {
	const projectPath = createTempProject();

	try {
		initProject(projectPath);

		const configPath = path.join(projectPath, '.mustflow', 'config', 'mustflow.toml');
		const config = readFileSync(configPath, 'utf8').replace('keep_stdout_tail_bytes = 65536', 'keep_stdout_tail_bytes = 12');
		writeFileSync(configPath, config);
		refreshManifestLockHash(projectPath, '.mustflow/config/mustflow.toml');

		appendIntent(
			projectPath,
			`
[intents.long_stdout]
status = "configured"
lifecycle = "oneshot"
run_policy = "agent_allowed"
description = "Print long stdout for receipt tail policy."
argv = ['${process.execPath}', '-e', 'process.stdout.write("abcdefghijklmnop")']
cwd = "."
timeout_seconds = 10
stdin = "closed"
success_exit_codes = [0]
writes = []
network = false
destructive = false
`,
		);

		const result = runCli(projectPath, ['run', 'long_stdout', '--json']);
		const receipt = JSON.parse(result.stdout);

		assert.equal(result.status, 0);
		assert.equal(receipt.stdout.bytes, 16);
		assert.equal(receipt.stdout.truncated, true);
		assert.equal(receipt.stdout.tail, 'efghijklmnop');
	} finally {
		removeTempProject(projectPath);
	}
});

test('records output limit overflow separately from process start failure', () => {
	const projectPath = createTempProject();

	try {
		initProject(projectPath);
		appendIntent(
			projectPath,
			`
[intents.too_chatty]
status = "configured"
lifecycle = "oneshot"
run_policy = "agent_allowed"
description = "Write more output than the configured capture budget allows."
argv = ['${process.execPath}', '-e', 'process.stdout.write("x".repeat(4096))']
cwd = "."
timeout_seconds = 10
max_output_bytes = 1024
stdin = "closed"
success_exit_codes = [0]
writes = []
network = false
destructive = false
`,
		);

		const result = runCli(projectPath, ['run', 'too_chatty', '--json']);
		const receipt = JSON.parse(result.stdout);
		const latest = JSON.parse(readFileSync(latestRunReceiptPath(projectPath), 'utf8'));

		assert.equal(result.status, 1);
		assert.equal(result.stderr, '');
		assert.equal(receipt.status, 'output_limit_exceeded');
		assert.equal(receipt.timed_out, false);
		assert.ok(receipt.exit_code === null || typeof receipt.exit_code === 'number');
		assert.equal(receipt.performance.result_summary.status, 'output_limit_exceeded');
		assert.equal(receipt.performance.result_summary.error_kind, 'output_limit_exceeded');
		assert.equal(receipt.performance.result_summary.timed_out, false);
		assert.equal(receipt.termination.reason, 'output_limit');
		assert.equal(receipt.termination.confirmed, process.platform !== 'win32');
		assert.equal(receipt.termination.cleanup_pending, process.platform === 'win32');
		assert.notEqual(receipt.status, 'start_failed');
		assert.match(receipt.error, /maxBuffer|ENOBUFS|exceeded/i);
		assert.deepEqual(latest, receipt);
		assertMatchesSchema(schemaRoot, 'run-receipt.schema.json', receipt);
	} finally {
		removeTempProject(projectPath);
	}
});

test('enforces output limits for streamed command output', () => {
	const projectPath = createTempProject();

	try {
		initProject(projectPath);
		setDefaultKillAfterSeconds(projectPath, 1);
		appendIntent(
			projectPath,
			`
[intents.too_chatty_stream]
status = "configured"
lifecycle = "oneshot"
run_policy = "agent_allowed"
description = "Write more streamed output than the configured budget allows."
argv = ['${process.execPath}', '-e', 'process.stdout.write("x".repeat(4096)); setTimeout(() => {}, 10000)']
cwd = "."
timeout_seconds = 10
max_output_bytes = 1024
stdin = "closed"
success_exit_codes = [0]
writes = []
network = false
destructive = false
`,
		);

		const result = runCli(projectPath, ['run', 'too_chatty_stream'], { timeout: RUN_PARENT_GUARD_TIMEOUT_MS });
		const receipt = JSON.parse(readFileSync(latestRunReceiptPath(projectPath), 'utf8'));

		assert.equal(result.error, undefined);
		assert.equal(result.status, 1, result.stderr || result.stdout);
		assert.equal(receipt.status, 'output_limit_exceeded');
		assert.equal(receipt.timed_out, false);
		assert.ok(receipt.exit_code === null || typeof receipt.exit_code === 'number');
		assert.equal(result.stdout, 'x'.repeat(1024));
		assert.match(result.stderr, /max_output_bytes|output/i);
		assert.match(result.stderr, /\[mustflow\] output limit exceeded; terminating command before streaming more child output\./);
		assert.equal(
			(result.stderr.match(/\[mustflow\] output limit exceeded; terminating command before streaming more child output\./g) ?? [])
				.length,
			1,
		);
		assert.doesNotMatch(result.stderr, /failed to start/i);
		assert.equal(receipt.performance.result_summary.error_kind, 'output_limit_exceeded');
	} finally {
		removeTempProject(projectPath);
	}
});

test('records timed out command intents as JSON receipts', () => {
	const projectPath = createTempProject();

	try {
		initProject(projectPath);
		appendIntent(
			projectPath,
			`
[intents.slow_command]
status = "configured"
lifecycle = "oneshot"
run_policy = "agent_allowed"
description = "Wait longer than the configured timeout."
argv = ['${process.execPath}', '-e', 'setTimeout(() => {}, 10000)']
cwd = "."
timeout_seconds = 1
stdin = "closed"
success_exit_codes = [0]
writes = []
network = false
destructive = false
`,
		);

		const result = runCli(projectPath, ['run', 'slow_command', '--json']);
		const receipt = JSON.parse(result.stdout);
		const latest = JSON.parse(readFileSync(path.join(projectPath, '.mustflow', 'state', 'runs', 'latest.json'), 'utf8'));

		assert.equal(result.status, 1);
		assert.equal(result.stderr, '');
		assert.equal(receipt.status, 'timed_out');
		assert.equal(receipt.timed_out, true);
		assert.equal(receipt.exit_code, null);
		assert.equal(receipt.timeout_seconds, 1);
		assert.equal(receipt.kill_method, process.platform === 'win32' ? 'taskkill_process_tree' : 'process_group_sigterm');
		assert.equal(receipt.termination.reason, 'timeout');
		assert.equal(receipt.termination.state, process.platform === 'win32' ? 'force_termination_requested' : 'process_tree_confirmed_gone');
		assert.equal(receipt.termination.method, process.platform === 'win32' ? 'taskkill_process_tree' : 'process_group_sigterm');
		assert.equal(receipt.termination.graceful_signal, 'SIGTERM');
		assert.equal(receipt.termination.forced_signal, 'SIGKILL');
		assert.equal(receipt.termination.forced_kill_attempted, process.platform === 'win32');
		assert.equal(receipt.termination.confirmed, process.platform !== 'win32');
		assert.equal(receipt.termination.cleanup_pending, process.platform === 'win32');
		assert.equal(typeof receipt.termination.direct_child_closed_at, 'string');
		assert.equal(typeof receipt.termination.graceful_signal_sent_at, 'string');
		assert.equal(receipt.termination.force_kill_sent_at === null, process.platform !== 'win32');
		assert.equal(receipt.termination.process_tree_confirmed_gone_at === null, process.platform === 'win32');
		assert.deepEqual(latest, receipt);
		assertMatchesSchema(schemaRoot, 'run-receipt.schema.json', receipt);
	} finally {
		removeTempProject(projectPath);
	}
});

test('settles streamed command intents when the timeout is reached', () => {
	const projectPath = createTempProject();

	try {
		initProject(projectPath);
		setDefaultKillAfterSeconds(projectPath, 1);
		appendIntent(
			projectPath,
			`
[intents.slow_streaming_command]
status = "configured"
lifecycle = "oneshot"
run_policy = "agent_allowed"
description = "Ignore normal termination after the configured timeout."
argv = ['${process.execPath}', '-e', 'process.on("SIGTERM", () => {}); setTimeout(() => {}, 10000)']
cwd = "."
timeout_seconds = 1
stdin = "closed"
success_exit_codes = [0]
writes = ["protected.txt"]
network = false
destructive = false
`,
		);

		const startedAt = Date.now();
		const result = runCli(projectPath, ['run', 'slow_streaming_command'], { timeout: RUN_PARENT_GUARD_TIMEOUT_MS });
		const elapsedMs = Date.now() - startedAt;
		const receipt = JSON.parse(readFileSync(latestRunReceiptPath(projectPath), 'utf8'));

		assert.equal(result.error, undefined);
		assert.equal(result.status, 1, result.stderr || result.stdout);
		assert.ok(
			elapsedMs < RUN_PARENT_GUARD_SETTLE_MS,
			`streaming timeout should settle before the parent guard, elapsed ${elapsedMs}ms`,
		);
		assert.equal(receipt.status, 'timed_out');
		assert.equal(receipt.timed_out, true);
		assert.equal(receipt.exit_code, null);
		assert.equal(receipt.timeout_seconds, 1);
		assert.equal(receipt.kill_method, process.platform === 'win32' ? 'taskkill_process_tree' : 'process_group_sigterm');
		assert.equal(receipt.termination.reason, 'timeout');
		assert.equal(receipt.termination.state, process.platform === 'win32' ? 'force_termination_requested' : 'process_tree_confirmed_gone');
		assert.equal(receipt.termination.method, process.platform === 'win32' ? 'taskkill_process_tree' : 'process_group_sigterm');
		assert.equal(receipt.termination.graceful_signal, 'SIGTERM');
		assert.equal(receipt.termination.forced_signal, 'SIGKILL');
		assert.equal(receipt.termination.forced_kill_attempted, true);
		assert.equal(receipt.termination.confirmed, process.platform !== 'win32');
		assert.equal(receipt.termination.cleanup_pending, process.platform === 'win32');
		assert.equal(typeof receipt.termination.direct_child_closed_at, 'string');
		assert.equal(typeof receipt.termination.graceful_signal_sent_at, 'string');
		assert.equal(typeof receipt.termination.force_kill_sent_at, 'string');
		assert.equal(receipt.termination.process_tree_confirmed_gone_at === null, process.platform === 'win32');
		const activeLockDirectory = path.join(projectPath, '.mustflow', 'state', 'locks', 'active');
		const activeLockRecords = existsSync(activeLockDirectory)
			? readdirSync(activeLockDirectory).filter((name) => name.endsWith('.json'))
			: [];
		assert.equal(activeLockRecords.length, process.platform === 'win32' ? 1 : 0);
		assert.match(result.stderr, /timed out/i);
	} finally {
		removeTempProject(projectPath);
	}
});

test('redacts secret-like command and output values in JSON run receipts', () => {
	const projectPath = createTempProject();
	const stdoutToken = 'sk-abcdefghijklmnop';
	const stderrToken = 'ghp_1234567890abcdefghij';
	const githubPatToken = 'github_pat_1234567890abcdefghij';
	const bearerToken = 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.payload.signature';
	const argvToken = 'password=supersecretvalue';

	try {
		initProject(projectPath);
		appendIntent(
			projectPath,
			`
[intents.secret_output]
status = "configured"
lifecycle = "oneshot"
run_policy = "agent_allowed"
description = "Print secret-like values for receipt redaction."
argv = ['${process.execPath}', '-e', 'console.log("token ${stdoutToken} ${githubPatToken}"); console.error("api_key=${stderrToken} ${bearerToken}")', '${argvToken}']
cwd = "."
timeout_seconds = 10
stdin = "closed"
success_exit_codes = [0]
writes = []
network = false
destructive = false
`,
		);

		const result = runCli(projectPath, ['run', 'secret_output', '--json']);
		const receipt = JSON.parse(result.stdout);
		const serialized = JSON.stringify(receipt);
		const serializedPerformanceHistory = `${readFileSync(runPerformanceSamplesPath(projectPath), 'utf8')}\n${readFileSync(runPerformanceSummaryPath(projectPath), 'utf8')}`;

		assert.equal(result.status, 0, result.stderr || result.stdout);
		assert.doesNotMatch(serialized, new RegExp(stdoutToken));
		assert.doesNotMatch(serialized, new RegExp(stderrToken));
		assert.doesNotMatch(serialized, new RegExp(githubPatToken));
		assert.doesNotMatch(serialized, new RegExp(bearerToken.replace(/[.*+?^${}()|[\]\\]/gu, '\\$&')));
		assert.doesNotMatch(serialized, /supersecretvalue/);
		assert.doesNotMatch(JSON.stringify(receipt.performance), new RegExp(stdoutToken));
		assert.doesNotMatch(JSON.stringify(receipt.performance), new RegExp(stderrToken));
		assert.doesNotMatch(JSON.stringify(receipt.performance), new RegExp(githubPatToken));
		assert.doesNotMatch(JSON.stringify(receipt.performance), new RegExp(bearerToken.replace(/[.*+?^${}()|[\]\\]/gu, '\\$&')));
		assert.doesNotMatch(JSON.stringify(receipt.performance), /supersecretvalue/);
		assert.doesNotMatch(serializedPerformanceHistory, new RegExp(stdoutToken));
		assert.doesNotMatch(serializedPerformanceHistory, new RegExp(stderrToken));
		assert.doesNotMatch(serializedPerformanceHistory, new RegExp(githubPatToken));
		assert.doesNotMatch(serializedPerformanceHistory, new RegExp(bearerToken.replace(/[.*+?^${}()|[\]\\]/gu, '\\$&')));
		assert.doesNotMatch(serializedPerformanceHistory, /supersecretvalue/);
		assert.match(receipt.stdout.tail, /\[REDACTED_SECRET\]/);
		assert.match(receipt.stderr.tail, /\[REDACTED_SECRET\]/);
		assert.ok(receipt.argv.some((entry) => entry.includes('[REDACTED_SECRET]')));
		assert.equal(receipt.stdout.redacted, true);
		assert.equal(receipt.stderr.redacted, true);
		assert.equal(receipt.redaction.redacted, true);
		assert.ok(receipt.redaction.redaction_count >= 3);
		assert.ok(receipt.redaction.fields.includes('argv.3'));
		assert.ok(receipt.redaction.fields.includes('stdout.tail'));
		assert.ok(receipt.redaction.fields.includes('stderr.tail'));
		assert.ok(receipt.redaction.redaction_kinds.includes('secret_key_value'));
		assert.ok(receipt.redaction.redaction_kinds.includes('secret_token'));
		assert.ok(receipt.redaction.redaction_kinds.includes('secret_bearer_token'));
	} finally {
		removeTempProject(projectPath);
	}
});

test('records declared file changes in JSON run receipts', () => {
	const projectPath = createTempProject();

	try {
		initProject(projectPath);
		appendIntent(
			projectPath,
			`
[intents.declared_dist_write]
status = "configured"
lifecycle = "oneshot"
run_policy = "agent_allowed"
description = "Write inside declared dist output."
argv = ['${process.execPath}', '-e', 'require("node:fs").mkdirSync("dist", { recursive: true }); require("node:fs").writeFileSync("dist/output.js", "ok")']
cwd = "."
timeout_seconds = 10
stdin = "closed"
success_exit_codes = [0]
writes = ["dist/"]
effects = [
  { type = "write", mode = "write", path = "dist/**" },
]
network = false
destructive = false
`,
		);

		const result = runCli(projectPath, ['run', 'declared_dist_write', '--json'], {
			env: createEnvWithRecursiveWriteDriftSnapshot(),
		});
		const receipt = JSON.parse(result.stdout);

		assert.equal(result.status, 0, result.stderr || result.stdout);
		assert.equal(receipt.write_drift.status, 'checked');
		assert.equal(receipt.write_drift.coverage_complete, true);
		assert.deepEqual(receipt.write_drift.declared_paths, ['dist/**']);
		assert.deepEqual(receipt.write_drift.observed_paths, ['dist/output.js']);
		assert.deepEqual(receipt.write_drift.declared_observed_paths, ['dist/output.js']);
		assert.deepEqual(receipt.write_drift.undeclared_paths, []);
		assert.equal(receipt.write_drift.observed_count, 1);
		assert.equal(receipt.write_drift.undeclared_count, 0);
		assert.equal(receipt.write_drift.has_undeclared_changes, false);
	} finally {
		removeTempProject(projectPath);
	}
});

test('write drift does not treat a literal declared path as a subtree', () => {
	const projectPath = createTempProject();

	try {
		initProject(projectPath);
		appendIntent(
			projectPath,
			`
[intents.literal_dist_write]
status = "configured"
lifecycle = "oneshot"
run_policy = "agent_allowed"
description = "Write below a literal declared path."
argv = ['${process.execPath}', '-e', 'require("node:fs").mkdirSync("dist", { recursive: true }); require("node:fs").writeFileSync("dist/output.js", "ok")']
cwd = "."
timeout_seconds = 10
stdin = "closed"
success_exit_codes = [0]
writes = ["dist"]
network = false
destructive = false
`,
		);

		const result = runCli(projectPath, ['run', 'literal_dist_write', '--json'], {
			env: createEnvWithRecursiveWriteDriftSnapshot(),
		});
		const receipt = JSON.parse(result.stdout);

		assert.equal(result.status, 0, result.stderr || result.stdout);
		assert.deepEqual(receipt.write_drift.declared_paths, ['dist']);
		assert.deepEqual(receipt.write_drift.declared_observed_paths, []);
		assert.deepEqual(receipt.write_drift.undeclared_paths, ['dist/output.js']);
		assert.equal(receipt.write_drift.has_undeclared_changes, true);
	} finally {
		removeTempProject(projectPath);
	}
});

test('records undeclared file changes in JSON run receipts without blocking execution', () => {
	const projectPath = createTempProject();

	try {
		initProject(projectPath);
		appendIntent(
			projectPath,
			`
[intents.undeclared_write]
status = "configured"
lifecycle = "oneshot"
run_policy = "agent_allowed"
description = "Write a file without declaring it."
argv = ['${process.execPath}', '-e', 'require("node:fs").writeFileSync("sneaky.txt", "surprise")']
cwd = "."
timeout_seconds = 10
stdin = "closed"
success_exit_codes = [0]
writes = []
network = false
destructive = false
`,
		);

		const result = runCli(projectPath, ['run', 'undeclared_write', '--json'], {
			env: createEnvWithRecursiveWriteDriftSnapshot(),
		});
		const receipt = JSON.parse(result.stdout);

		assert.equal(result.status, 0, result.stderr || result.stdout);
		assert.equal(receipt.status, 'passed');
		assert.equal(receipt.write_drift.status, 'checked');
		assert.deepEqual(receipt.write_drift.declared_paths, []);
		assert.deepEqual(receipt.write_drift.observed_paths, ['sneaky.txt']);
		assert.deepEqual(receipt.write_drift.declared_observed_paths, []);
		assert.deepEqual(receipt.write_drift.undeclared_paths, ['sneaky.txt']);
		assert.equal(receipt.write_drift.observed_count, 1);
		assert.equal(receipt.write_drift.undeclared_count, 1);
		assert.equal(receipt.write_drift.has_undeclared_changes, true);
	} finally {
		removeTempProject(projectPath);
	}
});

test('write drift observes undeclared changes inside Git ignored paths', (t) => {
	const projectPath = createTempProject();

	try {
		initProject(projectPath);
		writeFileSync(path.join(projectPath, '.gitignore'), 'ignored/\n');
		if (!commitGitBaseline(projectPath)) {
			t.skip('git is not available in this environment');
			return;
		}
		appendIntent(
			projectPath,
			`
[intents.ignored_undeclared_write]
status = "configured"
lifecycle = "oneshot"
run_policy = "agent_allowed"
description = "Write into an ignored path outside the declared scope."
argv = ['${process.execPath}', '-e', 'require("node:fs").mkdirSync("ignored", { recursive: true }); require("node:fs").writeFileSync("ignored/secret.txt", "secret")']
cwd = "."
timeout_seconds = 10
stdin = "closed"
success_exit_codes = [0]
writes = ["declared/**"]
network = false
destructive = false
`,
		);

		const result = runCli(projectPath, ['run', 'ignored_undeclared_write', '--json']);
		const receipt = JSON.parse(result.stdout);

		assert.equal(result.status, 0, result.stderr || result.stdout);
		assert.equal(receipt.write_drift.status, 'checked');
		assert.equal(receipt.write_drift.coverage_complete, true);
		assert.deepEqual(receipt.write_drift.observed_paths, ['ignored/secret.txt']);
		assert.deepEqual(receipt.write_drift.undeclared_paths, ['ignored/secret.txt']);
		assert.equal(receipt.write_drift.has_undeclared_changes, true);
	} finally {
		removeTempProject(projectPath);
	}
});

test('uses git status write-drift tracking without recursive snapshot opt-in', (t) => {
	const projectPath = createTempProject();

	try {
		initProject(projectPath);
		if (!commitGitBaseline(projectPath)) {
			t.skip('git is not available in this environment');
			return;
		}
		appendIntent(
			projectPath,
			`
[intents.git_undeclared_write]
status = "configured"
lifecycle = "oneshot"
run_policy = "agent_allowed"
description = "Write an untracked file in a git project."
argv = ['${process.execPath}', '-e', 'require("node:fs").writeFileSync("git-sneaky.txt", "surprise")']
cwd = "."
timeout_seconds = 10
stdin = "closed"
success_exit_codes = [0]
writes = []
network = false
destructive = false
`,
		);

		const result = runCli(projectPath, ['run', 'git_undeclared_write', '--json']);
		const receipt = JSON.parse(result.stdout);

		assert.equal(result.status, 0, result.stderr || result.stdout);
		assert.equal(receipt.status, 'passed');
		assert.equal(receipt.write_drift.status, 'checked');
		assert.equal(receipt.write_drift.coverage_complete, true);
		assert.deepEqual(receipt.write_drift.declared_paths, []);
		assert.deepEqual(receipt.write_drift.observed_paths, ['git-sneaky.txt']);
		assert.deepEqual(receipt.write_drift.undeclared_paths, ['git-sneaky.txt']);
		assert.equal(receipt.write_drift.has_undeclared_changes, true);
		assert.equal(receipt.write_drift.reason, null);
	} finally {
		removeTempProject(projectPath);
	}
});

test('tracks rewrites inside existing untracked directories with git status', (t) => {
	const projectPath = createTempProject();

	try {
		initProject(projectPath);
		if (!commitGitBaseline(projectPath)) {
			t.skip('git is not available in this environment');
			return;
		}
		mkdirSync(path.join(projectPath, 'scratch'), { recursive: true });
		writeFileSync(path.join(projectPath, 'scratch', 'note.txt'), 'before\n');
		appendIntent(
			projectPath,
			`
[intents.git_untracked_dir_rewrite]
status = "configured"
lifecycle = "oneshot"
run_policy = "agent_allowed"
description = "Rewrite an existing untracked file nested under an untracked directory."
argv = ['${process.execPath}', '-e', 'require("node:fs").writeFileSync("scratch/note.txt", "after\\n")']
cwd = "."
timeout_seconds = 10
stdin = "closed"
success_exit_codes = [0]
writes = []
network = false
destructive = false
`,
		);

		const result = runCli(projectPath, ['run', 'git_untracked_dir_rewrite', '--json']);
		const receipt = JSON.parse(result.stdout);

		assert.equal(result.status, 0, result.stderr || result.stdout);
		assert.equal(receipt.status, 'passed');
		assert.equal(receipt.write_drift.status, 'checked');
		assert.equal(receipt.write_drift.coverage_complete, true);
		assert.deepEqual(receipt.write_drift.observed_paths, ['scratch/note.txt']);
		assert.deepEqual(receipt.write_drift.undeclared_paths, ['scratch/note.txt']);
		assert.equal(receipt.write_drift.has_undeclared_changes, true);
		assert.equal(receipt.write_drift.reason, null);
		assert.equal(readFileSync(path.join(projectPath, 'scratch', 'note.txt'), 'utf8'), 'after\n');
	} finally {
		removeTempProject(projectPath);
	}
});

test('write drift interprets writes relative to default command cwd', (t) => {
	const projectPath = createTempProject();

	try {
		initProject(projectPath);
		mkdirSync(path.join(projectPath, 'packages', 'app'), { recursive: true });
		const commandsPath = path.join(projectPath, '.mustflow', 'config', 'commands.toml');
		const commands = readFileSync(commandsPath, 'utf8').replace('default_cwd = "."', 'default_cwd = "packages/app"');
		writeFileSync(commandsPath, commands);
		if (!commitGitBaseline(projectPath)) {
			t.skip('git is not available in this environment');
			return;
		}
		appendIntent(
			projectPath,
			`
[intents.default_cwd_writer]
status = "configured"
lifecycle = "oneshot"
run_policy = "agent_allowed"
description = "Write under the configured default cwd without an intent-level cwd."
argv = ['${process.execPath}', '-e', 'require("node:fs").mkdirSync("generated", { recursive: true }); require("node:fs").writeFileSync("generated/out.txt", "ok")']
timeout_seconds = 10
stdin = "closed"
success_exit_codes = [0]
writes = ["generated/**"]
network = false
destructive = false
`,
		);

		const result = runCli(projectPath, ['run', 'default_cwd_writer', '--json']);
		const receipt = JSON.parse(result.stdout);

		assert.equal(result.status, 0, result.stderr || result.stdout);
		assert.equal(receipt.status, 'passed');
		assert.equal(receipt.cwd, 'packages/app');
		assert.deepEqual(receipt.write_drift.declared_paths, ['packages/app/generated/**']);
		assert.deepEqual(receipt.write_drift.observed_paths, ['packages/app/generated/out.txt']);
		assert.deepEqual(receipt.write_drift.declared_observed_paths, ['packages/app/generated/out.txt']);
		assert.deepEqual(receipt.write_drift.undeclared_paths, []);
		assert.equal(receipt.write_drift.has_undeclared_changes, false);
	} finally {
		removeTempProject(projectPath);
	}
});

test('detects undeclared rewrites to files that were already dirty before mf run', (t) => {
	const projectPath = createTempProject();

	try {
		initProject(projectPath);
		if (!commitGitBaseline(projectPath)) {
			t.skip('git is not available in this environment');
			return;
		}
		writeFileSync(path.join(projectPath, 'dirty.txt'), 'before\n');
		appendIntent(
			projectPath,
			`
[intents.git_dirty_rewrite]
status = "configured"
lifecycle = "oneshot"
run_policy = "agent_allowed"
description = "Rewrite a file that was already dirty before execution."
argv = ['${process.execPath}', '-e', 'require("node:fs").writeFileSync("dirty.txt", "after\\n")']
cwd = "."
timeout_seconds = 10
stdin = "closed"
success_exit_codes = [0]
writes = []
network = false
destructive = false
`,
		);

		const result = runCli(projectPath, ['run', 'git_dirty_rewrite', '--json']);
		const receipt = JSON.parse(result.stdout);

		assert.equal(result.status, 0, result.stderr || result.stdout);
		assert.equal(receipt.status, 'passed');
		assert.equal(receipt.write_drift.status, 'checked');
		assert.equal(receipt.write_drift.coverage_complete, true);
		assert.deepEqual(receipt.write_drift.declared_paths, []);
		assert.deepEqual(receipt.write_drift.observed_paths, ['dirty.txt']);
		assert.deepEqual(receipt.write_drift.undeclared_paths, ['dirty.txt']);
		assert.equal(receipt.write_drift.has_undeclared_changes, true);
		assert.equal(receipt.write_drift.reason, null);
		assert.equal(readFileSync(path.join(projectPath, 'dirty.txt'), 'utf8'), 'after\n');
	} finally {
		removeTempProject(projectPath);
	}
});

test('uses the minimal command environment by default without exposing outer secrets', () => {
	const projectPath = createTempProject();

	try {
		initProject(projectPath);
		appendIntent(
			projectPath,
			`
[intents.env_minimal]
status = "configured"
lifecycle = "oneshot"
run_policy = "agent_allowed"
description = "Print whether non-minimal environment variables are visible."
argv = ['${process.execPath}', '-e', 'console.log(process.env.MUSTFLOW_TEST_SECRET_ENV || "missing")']
cwd = "."
timeout_seconds = 10
stdin = "closed"
success_exit_codes = [0]
writes = []
network = false
destructive = false
`,
		);

		const result = runCli(projectPath, ['run', 'env_minimal', '--json'], {
			env: createEnvWithCommandPolicyFixtures(),
		});
		const receipt = JSON.parse(result.stdout);

		assert.equal(result.status, 0, result.stderr || result.stdout);
		assert.equal(receipt.env_policy, 'minimal');
		assert.deepEqual(receipt.env_allowlist, []);
		assert.match(receipt.stdout.tail, /missing/);
		assert.doesNotMatch(receipt.stdout.tail, /hidden-env-value/);
	} finally {
		removeTempProject(projectPath);
	}
});

test('uses the minimal command environment when no policy is declared', () => {
	const projectPath = createTempProject();

	try {
		initProject(projectPath);
		const commandsPath = path.join(projectPath, '.mustflow', 'config', 'commands.toml');
		const commandsWithoutDefaultEnv = readFileSync(commandsPath, 'utf8').replace(
			'env_policy = "minimal"\nenv_allowlist = []\n',
			'',
		);
		writeFileSync(commandsPath, commandsWithoutDefaultEnv);
		appendIntent(
			projectPath,
			`
[intents.env_implicit_minimal]
status = "configured"
lifecycle = "oneshot"
run_policy = "agent_allowed"
description = "Print whether implicit environment fallback exposes outer variables."
argv = ['${process.execPath}', '-e', 'console.log(process.env.MUSTFLOW_TEST_SECRET_ENV || "missing")']
cwd = "."
timeout_seconds = 10
stdin = "closed"
success_exit_codes = [0]
writes = []
network = false
destructive = false
`,
		);

		const result = runCli(projectPath, ['run', 'env_implicit_minimal', '--json'], {
			env: createEnvWithCommandPolicyFixtures(),
		});
		const receipt = JSON.parse(result.stdout);

		assert.equal(result.status, 0, result.stderr || result.stdout);
		assert.equal(receipt.env_policy, 'minimal');
		assert.deepEqual(receipt.env_allowlist, []);
		assert.match(receipt.stdout.tail, /missing/);
		assert.doesNotMatch(receipt.stdout.tail, /hidden-env-value/);
	} finally {
		removeTempProject(projectPath);
	}
});

test('passes only named extra environment variables through allowlist policy', () => {
	const projectPath = createTempProject();

	try {
		initProject(projectPath);
		appendIntent(
			projectPath,
			`
[intents.env_allowlist]
status = "configured"
lifecycle = "oneshot"
run_policy = "agent_allowed"
description = "Print selected environment variables."
env_policy = "allowlist"
env_allowlist = ["MUSTFLOW_TEST_ALLOWED_ENV"]
argv = ['${process.execPath}', '-e', 'console.log(JSON.stringify({ allowed: process.env.MUSTFLOW_TEST_ALLOWED_ENV || "missing", secret: process.env.MUSTFLOW_TEST_SECRET_ENV || "missing" }))']
cwd = "."
timeout_seconds = 10
stdin = "closed"
success_exit_codes = [0]
writes = []
network = false
destructive = false
`,
		);

		const result = runCli(projectPath, ['run', 'env_allowlist', '--json'], {
			env: createEnvWithCommandPolicyFixtures(),
		});
		const receipt = JSON.parse(result.stdout);
		const output = JSON.parse(receipt.stdout.tail);

		assert.equal(result.status, 0, result.stderr || result.stdout);
		assert.equal(receipt.env_policy, 'allowlist');
		assert.deepEqual(receipt.env_allowlist, ['MUSTFLOW_TEST_ALLOWED_ENV']);
		assert.deepEqual(output, { allowed: 'visible-env-value', secret: 'missing' });
	} finally {
		removeTempProject(projectPath);
	}
});

test('resolves allowed project-local mustflow bare executable directly', () => {
	const projectPath = createTempProject();

	try {
		initProject(projectPath);
		createLocalBinShim(projectPath, 'mf', 'local-mf');
		appendIntent(
			projectPath,
			`
[intents.local_mf_bare]
status = "configured"
lifecycle = "oneshot"
run_policy = "agent_allowed"
description = "Run a project-local mustflow executable by its conventional bare name."
argv = ["mf", "doctor"]
cwd = "."
timeout_seconds = 10
stdin = "closed"
success_exit_codes = [0]
writes = []
network = false
destructive = false
`,
		);

		const result = runCli(projectPath, ['run', 'local_mf_bare', '--json'], {
			env: {
				...createEnvWithoutPathLookup(),
				NODE_OPTIONS: [process.env.NODE_OPTIONS, '--pending-deprecation'].filter(Boolean).join(' '),
			},
		});
		const receipt = JSON.parse(result.stdout);

		assert.equal(result.status, 0, result.stderr || result.stdout);
		assert.doesNotMatch(result.stderr, /DEP0190/);
		assert.doesNotMatch(receipt.stderr.tail, /DEP0190/);
		assert.equal(receipt.status, 'passed');
		assert.match(receipt.stdout.tail, /local-mf doctor/);
	} finally {
		removeTempProject(projectPath);
	}
});

test('quotes Windows command script argv without shell true args', async () => {
	if (process.platform !== 'win32') {
		return;
	}

	const { createWindowsCommandScriptLine } = await import(
		pathToFileURL(path.join(projectRoot, 'dist', 'cli', 'commands', 'run', 'windows-command-script.js')).href
	);

	assert.equal(
		createWindowsCommandScriptLine('C:\\Program Files\\node\\npm.cmd', ['pack dry', 'quote"ok']),
		'call "C:\\Program Files\\node\\npm.cmd" "pack dry" "quote""ok"',
	);
	assert.throws(() => createWindowsCommandScriptLine('npm.cmd', ['bad\narg']), /line breaks/);
});

test('runs Windows .cmd and .bat argv intents without DEP0190', () => {
	if (process.platform !== 'win32') {
		return;
	}

	const projectPath = createTempProject();
	const toolsPath = path.join(projectPath, 'tools with spaces');
	const printerPath = path.join(toolsPath, 'print-argv.js');
	const cmdPath = path.join(toolsPath, 'print argv.cmd');
	const batPath = path.join(toolsPath, 'print argv.bat');
	const pendingDeprecationEnv = {
		...process.env,
		NODE_OPTIONS: [process.env.NODE_OPTIONS, '--pending-deprecation'].filter(Boolean).join(' '),
	};

	try {
		initProject(projectPath);
		mkdirSync(toolsPath, { recursive: true });
		writeFileSync(
			printerPath,
			[
				'process.stdout.write(JSON.stringify(process.argv.slice(2)));',
				'process.stderr.write("stderr-ok");',
				'process.exit(0);',
				'',
			].join('\n'),
		);
		const scriptBody = [
			'@echo off',
			`"${process.execPath}" "${printerPath}" %*`,
			'exit /b 7',
			'',
		].join('\r\n');
		writeFileSync(cmdPath, scriptBody);
		writeFileSync(batPath, scriptBody);
		appendIntent(
			projectPath,
			`
[intents.windows_cmd_script]
status = "configured"
lifecycle = "oneshot"
run_policy = "agent_allowed"
description = "Run a Windows .cmd file with argv arguments."
argv = [${JSON.stringify(cmdPath)}, "alpha beta", "x&y", "quote\\"z"]
cwd = "."
timeout_seconds = 10
stdin = "closed"
success_exit_codes = [7]
writes = []
network = false
destructive = false

[intents.windows_bat_script_failure]
status = "configured"
lifecycle = "oneshot"
run_policy = "agent_allowed"
description = "Run a Windows .bat file and preserve failure exit status."
argv = [${JSON.stringify(batPath)}, "alpha beta", "x&y"]
cwd = "."
timeout_seconds = 10
stdin = "closed"
success_exit_codes = [0]
writes = []
network = false
destructive = false
`,
		);

		const preview = runCli(projectPath, ['run', 'windows_cmd_script', '--plan-only', '--json'], {
			env: pendingDeprecationEnv,
		});
		const previewJson = JSON.parse(preview.stdout);
		assert.equal(preview.status, 0, preview.stderr || preview.stdout);
		assert.equal(previewJson.resolved_argv.executable, cmdPath);
		assert.equal(previewJson.resolved_argv.shell, false);
		assert.equal(previewJson.resolved_argv.windowsCommandScript, true);

		const passed = runCli(projectPath, ['run', 'windows_cmd_script', '--json'], {
			env: pendingDeprecationEnv,
		});
		const passedReceipt = JSON.parse(passed.stdout);
		assert.equal(passed.status, 0, passed.stderr || passed.stdout);
		assert.doesNotMatch(passed.stderr, /DEP0190/);
		assert.equal(passedReceipt.status, 'passed');
		assert.equal(passedReceipt.exit_code, 7);
		assert.deepEqual(JSON.parse(passedReceipt.stdout.tail), ['alpha beta', 'x&y', 'quote"z']);
		assert.equal(passedReceipt.stderr.tail, 'stderr-ok');

		const failed = runCli(projectPath, ['run', 'windows_bat_script_failure', '--json'], {
			env: pendingDeprecationEnv,
		});
		const failedReceipt = JSON.parse(failed.stdout);
		assert.equal(failed.status, 1);
		assert.doesNotMatch(failed.stderr, /DEP0190/);
		assert.equal(failedReceipt.status, 'failed');
		assert.equal(failedReceipt.exit_code, 7);
		assert.deepEqual(JSON.parse(failedReceipt.stdout.tail), ['alpha beta', 'x&y']);
		assert.equal(failedReceipt.stderr.tail, 'stderr-ok');
	} finally {
		removeTempProject(projectPath);
	}
});

