import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, existsSync } from 'node:fs';
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
		assert.ok(intents.check.required_after.includes('code_change'));
		assert.deepEqual(intents.test.required_after, []);
		assert.deepEqual(intents.test_related.required_after, []);
		assert.deepEqual(intents.typecheck.required_after, []);
		pkg.scripts.check = 'npm run typecheck';
		writeFileSync(path.join(root, 'package.json'), JSON.stringify(pkg));
		intents = discoverProjectCommands(root);
		assert.ok(intents.test.required_after.includes('release_risk'));
		assert.ok(intents.test_related.required_after.includes('code_change'));
	} finally { rmSync(root, { recursive: true, force: true }); }
});
