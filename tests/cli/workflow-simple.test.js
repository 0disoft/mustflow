import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { test } from 'node:test';
import { runCliInProcess } from './helpers/cli-harness.js';
import { resolveWorkflowPolicy } from '../../dist/core/workflow-policy.js';
import { readCommandContract } from '../../dist/core/config-loading.js';
import { discoverProjectCommands } from '../../dist/core/project-command-discovery.js';

function fixture(mode = 'simple') {
	const root = mkdtempSync(path.join(tmpdir(), 'mustflow-workflow-'));
	mkdirSync(path.join(root, '.mustflow/config'), { recursive: true });
	writeFileSync(path.join(root, '.mustflow/config/mustflow.toml'), `[workflow]\nmode = "${mode}"\n`);
	return root;
}

test('legacy mode stays strict and malformed workflow configuration is rejected', () => {
	assert.equal(resolveWorkflowPolicy({}).mode, 'strict');
	assert.throws(() => resolveWorkflowPolicy({ workflow: 'simple' }), /TOML table/);
	assert.throws(() => resolveWorkflowPolicy({ workflow: { mode: 'simpel' } }), /simple or strict/);
});

test('new installs default to simple and work through check, doctor, context, run and update', async () => {
	const root = mkdtempSync(path.join(tmpdir(), 'mustflow-simple-init-'));
	try {
		writeFileSync(path.join(root, 'package.json'), JSON.stringify({ scripts: { check: 'node -e "console.log(456)"' } }));
		let result = await runCliInProcess(root, ['init', '--yes', '--locale', 'ko']);
		assert.equal(result.status, 0, result.stderr);
		assert.match(readFileSync(path.join(root, '.mustflow/config/mustflow.toml'), 'utf8'), /mode = "simple"/);
		assert.equal(existsSync(path.join(root, '.mustflow/skills')), false);
		for (const args of [['check', '--json'], ['check', '--strict', '--json'], ['doctor', '--json'], ['doctor', '--strict', '--json'], ['run', 'check', '--json'], ['update', '--dry-run', '--json']]) {
			result = await runCliInProcess(root, args);
			assert.equal(result.status, 0, `${args.join(' ')}: ${result.stderr}\n${result.stdout}`);
			assert.doesNotMatch(result.stdout, /skills\/router|docs\/agent-workflow/);
		}
		result = await runCliInProcess(root, ['context', '--json']);
		const context = JSON.parse(result.stdout);
		assert.deepEqual(context.read_order.map(entry => entry.path), ['AGENTS.md']);
		assert.ok(context.command_contract.runnable_intents.includes('check'));
		assert.equal(context.effective_policy.project_commands_require_mf_run, false);
		assert.equal(context.blocked_actions.includes('unconfigured_project_command'), false);
		result = await runCliInProcess(root, ['help', 'workflow']);
		assert.match(result.stdout, /simple/);
		assert.doesNotMatch(result.stdout, /Missing|skills\/router/);
		result = await runCliInProcess(root, ['help', 'commands']);
		assert.match(result.stdout, /check: configured/);
		result = await runCliInProcess(root, ['init', '--yes']);
		assert.equal(result.status, 0, result.stderr);
		assert.match(readFileSync(path.join(root, 'AGENTS.md'), 'utf8'), /locale: ko/);
		// A stale optional lock must not impose sealing work on ordinary development.
		writeFileSync(path.join(root, 'AGENTS.md'), '# Project rules\n');
		result = await runCliInProcess(root, ['check', '--json']);
		assert.equal(result.status, 0, result.stdout);
	} finally { rmSync(root, { recursive: true, force: true }); }
});

test('simple parent selection respects a child strict policy and checks installed simple children', async () => {
	const root = fixture();
	try {
		const child = path.join(root, 'projects/child');
		mkdirSync(child, { recursive: true });
		let result = await runCliInProcess(child, ['init', '--yes', '--workflow', 'simple']);
		assert.equal(result.status, 0, result.stderr);
		result = await runCliInProcess(root, ['check', '--repo', 'projects/child', '--json']);
		assert.equal(result.status, 0, result.stdout);
		writeFileSync(path.join(child, '.mustflow/config/mustflow.toml'), '[workflow]\nmode = "strict"\n');
		writeFileSync(path.join(child, '.mustflow/config/commands.toml'), '[intents.test]\nstatus = "manual_only"\n');
		writeFileSync(path.join(child, 'package.json'), JSON.stringify({ scripts: { test: 'node -e "process.exit(0)"' } }));
		result = await runCliInProcess(root, ['run', 'test', '--repo', 'projects/child', '--dry-run', '--json']);
		assert.notEqual(result.status, 0);
		assert.match(result.stdout + result.stderr, /manual_only/);
	} finally { rmSync(root, { recursive: true, force: true }); }
});

test('simple merge preserves project rules without inserting the strict router', async () => {
	const root = mkdtempSync(path.join(tmpdir(), 'mustflow-simple-merge-'));
	try {
		writeFileSync(path.join(root, 'AGENTS.md'), '# Local rules\nKeep this project rule.\n');
		const result = await runCliInProcess(root, ['init', '--yes', '--merge']);
		assert.equal(result.status, 0, result.stderr);
		const agents = readFileSync(path.join(root, 'AGENTS.md'), 'utf8');
		assert.match(agents, /Keep this project rule/);
		assert.match(agents, /simple workflow/);
		assert.doesNotMatch(agents, /skills\/router|docs\/agent-workflow/);
	} finally { rmSync(root, { recursive: true, force: true }); }
});

test('simple guidance installs in every supported locale without expanded workflow files', async () => {
	for (const locale of ['en', 'ko', 'zh', 'es', 'fr', 'hi']) {
		const root = mkdtempSync(path.join(tmpdir(), 'mustflow-simple-locale-'));
		try {
			const result = await runCliInProcess(root, ['init', '--yes', '--locale', locale]);
			assert.equal(result.status, 0, `${locale}: ${result.stderr}`);
			assert.match(readFileSync(path.join(root, 'AGENTS.md'), 'utf8'), new RegExp(`locale: ${locale}`));
			assert.equal(existsSync(path.join(root, '.mustflow/docs')), false);
			assert.equal(existsSync(path.join(root, '.mustflow/skills')), false);
		} finally { rmSync(root, { recursive: true, force: true }); }
	}
});

test('explicit strict init retains the legacy installation and subsequent init preserves strict', async () => {
	const root = mkdtempSync(path.join(tmpdir(), 'mustflow-strict-init-'));
	try {
		let result = await runCliInProcess(root, ['init', '--yes', '--workflow', 'strict']);
		assert.equal(result.status, 0, result.stderr);
		assert.equal(existsSync(path.join(root, '.mustflow/skills/router.toml')), true);
		result = await runCliInProcess(root, ['init', '--yes']);
		assert.equal(result.status, 0, result.stderr);
		assert.equal(resolveWorkflowPolicy({}).mode, 'strict');
		result = await runCliInProcess(root, ['check', '--strict', '--json']);
		assert.equal(result.status, 0, result.stdout);
	} finally { rmSync(root, { recursive: true, force: true }); }
});

test('simple checks reject malformed policies and explicit command definitions', async () => {
	const root = fixture();
	try {
		writeFileSync(path.join(root, 'AGENTS.md'), '# Rules\n');
		let result = await runCliInProcess(root, ['check', '--json']);
		assert.equal(result.status, 0, result.stdout);
		writeFileSync(path.join(root, '.mustflow/config/commands.toml'), '[intents.test]\nstatus = "configured"\nlifecycle = "oneshot"\nrun_policy = "agent_allowed"\nargv = "broken"\n');
		result = await runCliInProcess(root, ['check', '--json']);
		assert.notEqual(result.status, 0);
		assert.match(result.stdout, /argv/);
		writeFileSync(path.join(root, '.mustflow/config/mustflow.toml'), '[workflow]\nmode = "simpel"\n');
		result = await runCliInProcess(root, ['check', '--json']);
		assert.notEqual(result.status, 0);
		assert.match(result.stdout, /simple or strict/);
	} finally { rmSync(root, { recursive: true, force: true }); }
});

test('opting an existing strict install into simple preserves authored restrictions and preferences', async () => {
	const root = mkdtempSync(path.join(tmpdir(), 'mustflow-simple-migration-'));
	try {
		let result = await runCliInProcess(root, ['init', '--yes', '--workflow', 'strict', '--locale', 'ko', '--profile', 'oss']);
		assert.equal(result.status, 0, result.stderr);
		const configPath = path.join(root, '.mustflow/config/mustflow.toml');
		const commandsPath = path.join(root, '.mustflow/config/commands.toml');
		const preferencesPath = path.join(root, '.mustflow/config/preferences.toml');
		const configBefore = readFileSync(configPath, 'utf8');
		const commandsBefore = readFileSync(commandsPath, 'utf8') + '\n[intents.project_secret]\nstatus = "manual_only"\n';
		const preferencesBefore = readFileSync(preferencesPath, 'utf8') + '\n[project.custom]\nvalue = "keep"\n';
		writeFileSync(commandsPath, commandsBefore);
		writeFileSync(preferencesPath, preferencesBefore);
		result = await runCliInProcess(root, ['init', '--yes', '--workflow', 'simple', '--merge', '--dry-run']);
		assert.equal(result.status, 0, result.stderr);
		assert.equal(readFileSync(configPath, 'utf8'), configBefore);
		result = await runCliInProcess(root, ['init', '--yes', '--workflow', 'simple', '--merge']);
		assert.equal(result.status, 0, result.stderr);
		assert.equal(readFileSync(commandsPath, 'utf8'), commandsBefore);
		assert.equal(readFileSync(preferencesPath, 'utf8'), preferencesBefore);
		assert.match(readFileSync(configPath, 'utf8'), /mode = "simple"/);
		assert.doesNotMatch(readFileSync(path.join(root, 'AGENTS.md'), 'utf8'), /skills\/router|docs\/agent-workflow/);
		assert.equal(existsSync(path.join(root, '.mustflow/backups')), true);
		assert.match(readFileSync(path.join(root, 'AGENTS.md'), 'utf8'), /locale: ko/);
		result = await runCliInProcess(root, ['context', '--json']);
		const context = JSON.parse(result.stdout);
		assert.deepEqual(context.read_order.map(entry => entry.path), ['AGENTS.md']);
		assert.equal(context.effective_policy.project_commands_require_mf_run, false);
		assert.equal(readCommandContract(root).intents.project_secret.status, 'manual_only');
		result = await runCliInProcess(root, ['update', '--apply', '--json']);
		assert.equal(result.status, 0, result.stdout);
		assert.equal(readFileSync(commandsPath, 'utf8'), commandsBefore);
		assert.equal(readFileSync(preferencesPath, 'utf8'), preferencesBefore);
		assert.match(readFileSync(configPath, 'utf8'), /mode = "simple"/);
	} finally { rmSync(root, { recursive: true, force: true }); }
});

test('simple run discovers scripts and does not require contracts or manifest sealing', async () => {
	const root = fixture();
	try {
		writeFileSync(path.join(root, 'package.json'), JSON.stringify({ packageManager: 'npm@11', scripts: { test: 'node check.cjs' } }));
		writeFileSync(path.join(root, 'check.cjs'), 'console.log("simple command executed");');
		const result = await runCliInProcess(root, ['run', 'test', '--json']);
		assert.equal(result.status, 0, result.stderr + result.stdout);
		assert.match(result.stdout, /simple command executed/);
		assert.equal(existsSync(path.join(root, '.mustflow/config/commands.toml')), false);
		assert.equal(existsSync(path.join(root, '.mustflow/config/manifest.lock.toml')), false);
	} finally { rmSync(root, { recursive: true, force: true }); }
});

test('simple mode honors explicit blocked intents and propagates command failure', async () => {
	const root = fixture();
	try {
		writeFileSync(path.join(root, 'package.json'), JSON.stringify({ scripts: { test: 'node -e "process.exit(7)"' } }));
		let result = await runCliInProcess(root, ['run', 'test', '--json']);
		assert.notEqual(result.status, 0);
		assert.equal(JSON.parse(result.stdout).exit_code, 7);
		writeFileSync(path.join(root, '.mustflow/config/commands.toml'), '[intents.test]\nstatus = "manual_only"\n');
		result = await runCliInProcess(root, ['run', 'test', '--json']);
		assert.notEqual(result.status, 0);
		assert.match(result.stdout + result.stderr, /manual_only/);
	} finally { rmSync(root, { recursive: true, force: true }); }
});

test('simple workspace runs nearest child scripts without delegated contracts', async () => {
	const root = fixture();
	try {
		const child = path.join(root, 'projects/app');
		mkdirSync(path.join(child, 'src'), { recursive: true });
		writeFileSync(path.join(child, 'package.json'), JSON.stringify({ scripts: { check: 'node -e "console.log(123)"' } }));
		let result = await runCliInProcess(path.join(child, 'src'), ['run', 'check', '--dry-run', '--json']);
		assert.equal(result.status, 0, result.stderr);
		assert.match(result.stdout.replaceAll('\\\\', '/'), /projects\/app/);
		result = await runCliInProcess(root, ['run', 'check', '--repo', 'projects/app', '--dry-run', '--json']);
		assert.equal(result.status, 0, result.stderr);
		result = await runCliInProcess(root, ['run', 'check', '--repo', '../', '--dry-run', '--json']);
		assert.notEqual(result.status, 0);
	} finally { rmSync(root, { recursive: true, force: true }); }
});

test('discovery uses project toolchains without automatically exposing deploy scripts', () => {
	const root = fixture();
	try {
		writeFileSync(path.join(root, 'package.json'), JSON.stringify({ packageManager: 'pnpm@10', scripts: { lint: 'eslint .', deploy: 'deploy-now' } }));
		writeFileSync(path.join(root, 'go.mod'), 'module example.test/app\n');
		const contract = readCommandContract(root);
		assert.deepEqual(contract.intents.lint.argv, [process.platform === 'win32' ? 'pnpm.cmd' : 'pnpm', 'run', 'lint']);
		assert.deepEqual(contract.intents.test.argv, ['go', 'test', './...']);
		assert.equal(contract.intents.deploy, undefined);
		assert.equal(discoverProjectCommands(root).check.argv[0], 'go');
	} finally { rmSync(root, { recursive: true, force: true }); }
});

test('automatic verification prefers related tests and does not duplicate aggregate checks', () => {
	const root = fixture();
	try {
		const pkg = { scripts: { test: 'full-suite', 'test:related': 'related-suite', typecheck: 'types' } };
		writeFileSync(path.join(root, 'package.json'), JSON.stringify(pkg));
		let intents = discoverProjectCommands(root);
		assert.ok(intents.test_related.required_after.includes('code_change'));
		assert.ok(!intents.test.required_after.includes('code_change'));
		assert.ok(intents.test.required_after.includes('release_risk'));
		pkg.scripts.check = 'npm run typecheck && npm run test:related && npm test';
		writeFileSync(path.join(root, 'package.json'), JSON.stringify(pkg));
		intents = discoverProjectCommands(root);
		assert.ok(!intents.check.required_after.includes('code_change'));
		assert.deepEqual(intents.test.required_after, []);
		assert.ok(intents.test_related.required_after.includes('code_change'));
		assert.ok(intents.typecheck.required_after.includes('code_change'));
		assert.ok(!intents.typecheck.required_after.includes('release_risk'));
		pkg.scripts.check = 'npm run typecheck';
		writeFileSync(path.join(root, 'package.json'), JSON.stringify(pkg));
		intents = discoverProjectCommands(root);
		assert.ok(intents.test.required_after.includes('release_risk'));
		assert.ok(intents.test_related.required_after.includes('code_change'));
	} finally { rmSync(root, { recursive: true, force: true }); }
});

test('discovery prefers fast checks while retaining full checks for release risk and authored defaults', () => {
	const root = fixture();
	try {
		writeFileSync(path.join(root, 'package.json'), JSON.stringify({ scripts: {
			'check:fast': 'npm run check:typecheck && npm run test:fast',
			check: 'npm run check:typecheck && npm test',
			'check:typecheck': 'types', 'test:fast': 'fast-tests', test: 'slow-tests',
		} }));
		writeFileSync(path.join(root, '.mustflow/config/commands.toml'), '[defaults]\ndefault_timeout_seconds = 15\nmax_output_bytes = 2048\nenv_policy = "allowlist"\nenv_allowlist = ["PATH"]\n[intents]\n');
		const intents = readCommandContract(root).intents;
		assert.equal(intents.check.argv.at(-1), 'check:fast');
		assert.equal(intents.typecheck.argv.at(-1), 'check:typecheck');
		assert.ok(intents.check.required_after.includes('code_change'));
		assert.deepEqual(intents.test_fast.required_after, []);
		assert.deepEqual(intents.typecheck.required_after, []);
		assert.ok(!intents.check_full.required_after.includes('code_change'));
		assert.ok(intents.check_full.required_after.includes('release_risk'));
		assert.deepEqual(intents.test.required_after, []);
		assert.equal(intents.check.timeout_seconds, 15);
		assert.equal(intents.check.max_output_bytes, 2048);
		assert.equal(intents.check.env_policy, 'allowlist');
		assert.equal(intents.check.effects[0].lock, intents.test.effects[0].lock);
		assert.equal(intents.check.effects[0].type, 'write');
		// Commands with failure-masking syntax cannot suppress standalone checks.
		for (const check of ['npm test || echo ok', 'npm test -- --filter narrow', 'echo "npm test"']) {
			writeFileSync(path.join(root, 'package.json'), JSON.stringify({ scripts: { test: 'tests', check } }));
			assert.ok(discoverProjectCommands(root).test.required_after.includes('code_change'));
		}
		writeFileSync(path.join(root, 'package.json'), JSON.stringify({ scripts: { test: 'tests', check: 'npm test' } }));
		writeFileSync(path.join(root, '.mustflow/config/commands.toml'), '[intents.check]\nstatus = "manual_only"\n');
		const restricted = readCommandContract(root).intents;
		assert.equal(restricted.check.status, 'manual_only');
		assert.ok(restricted.test.required_after.includes('code_change'));
	} finally { rmSync(root, { recursive: true, force: true }); }
});
