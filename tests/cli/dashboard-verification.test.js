import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { existsSync, mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { test } from 'node:test';

import {
	browserOpenModuleUrl,
	cliPath,
	dashboardHtmlModuleUrl,
	dashboardPreferencesModuleUrl,
	createTempProject,
	projectRoot,
	removeTempProject,
	runCli,
	runGit,
	sha256Text,
	stopDashboard,
	trySymlink,
	waitForDashboardInfo,
	writeLatestRunReceipt,
} from './dashboard-support.js';

test('dashboard verification recommendations use the core change verification contract', async () => {
	const projectPath = createTempProject();
	let dashboard;

	try {
		const init = runCli(projectPath, ['init', '--yes']);
		assert.equal(init.status, 0, init.stderr);
		const commandsPath = path.join(projectPath, '.mustflow', 'config', 'commands.toml');
		writeFileSync(
			commandsPath,
			`${readFileSync(commandsPath, 'utf8')}
[resources.schema_artifact]
type = "path"
paths = ["dist/**"]
concurrency = "exclusive_writer"
description = "Schema verification artifact."

[intents.verify_schema_contract]
status = "configured"
lifecycle = "oneshot"
run_policy = "agent_allowed"
description = "Verify schema contract changes."
argv = ['${process.execPath}', '-e', 'console.log("schema contract")']
cwd = "."
timeout_seconds = 10
stdin = "closed"
success_exit_codes = [0]
writes = []
effects = [{ type = "write", mode = "delete_recreate", path = "dist/**", lock = "schema_artifact", concurrency = "exclusive" }]
network = false
destructive = false
required_after = ["public_api_change"]

[intents.verify_schema_contract_followup]
status = "configured"
lifecycle = "oneshot"
run_policy = "agent_allowed"
description = "Verify schema contract follow-up."
argv = ['${process.execPath}', '-e', 'console.log("schema followup")']
cwd = "."
timeout_seconds = 10
stdin = "closed"
success_exit_codes = [0]
writes = []
effects = [{ type = "write", mode = "delete_recreate", path = "dist/**", lock = "schema_artifact", concurrency = "exclusive" }]
network = false
destructive = false
required_after = ["public_api_change"]

[intents."verify_schema_contract; echo injected #"]
status = "configured"
lifecycle = "oneshot"
run_policy = "agent_allowed"
description = "Unsafe intent names must not become copyable shell recommendations."
argv = ['${process.execPath}', '-e', 'console.log("schema contract")']
cwd = "."
timeout_seconds = 10
stdin = "closed"
success_exit_codes = [0]
writes = []
network = false
destructive = false
required_after = ["public_api_change"]
`,
		);
		assert.equal(runGit(projectPath, ['init']).status, 0);
		assert.equal(runGit(projectPath, ['config', 'user.email', 'mustflow@example.invalid']).status, 0);
		assert.equal(runGit(projectPath, ['config', 'user.name', 'mustflow test']).status, 0);
		assert.equal(runGit(projectPath, ['add', '.']).status, 0);
		assert.equal(runGit(projectPath, ['commit', '-m', 'baseline']).status, 0);
		const index = runCli(projectPath, ['index', '--json']);
		assert.equal(index.status, 0, index.stderr || index.stdout);

		mkdirSync(path.join(projectPath, 'schemas'), { recursive: true });
		writeFileSync(path.join(projectPath, 'schemas', 'output.schema.json'), '{"type":"object"}\n');

		dashboard = spawn(process.execPath, [cliPath, 'dashboard', '--json'], {
			cwd: projectPath,
			stdio: ['ignore', 'pipe', 'pipe'],
		});

		const info = await waitForDashboardInfo(dashboard);
		const html = await fetch(info.url).then((response) => response.text());
		const token = /const dashboardToken = "([^"]+)";/u.exec(html)?.[1];
		assert.ok(token);

		const status = await fetch(new URL('/api/status', info.url), {
			headers: { 'x-mustflow-dashboard-token': token },
		}).then((response) => response.json());
		const recommendedIntents = status.verification.recommendations.map((recommendation) => recommendation.intent);
		const recommendedCommands = status.verification.recommendations.map((recommendation) => recommendation.command);
		const skippedIntents = status.verification.skipped.map((skipped) => skipped.intent);

		assert.ok(status.verification.changed_files.includes('schemas/output.schema.json'));
		assert.ok(status.verification.surfaces.includes('schema_contract'));
		assert.ok(recommendedIntents.includes('verify_schema_contract'));
		assert.ok(recommendedIntents.includes('verify_schema_contract_followup'));
		assert.ok(recommendedCommands.includes('mf run verify_schema_contract'));
		assert.equal(recommendedIntents.includes('verify_schema_contract; echo injected #'), false);
		assert.equal(recommendedCommands.includes('mf run verify_schema_contract; echo injected #'), false);
		assert.ok(skippedIntents.includes('verify_schema_contract; echo injected #'));
		const schemaBatch = status.verification.schedule.batches.find((batch) =>
			batch.intents.includes('verify_schema_contract'),
		);
		const schemaFollowupBatch = status.verification.schedule.batches.find((batch) =>
			batch.intents.includes('verify_schema_contract_followup'),
		);
		assert.ok(schemaBatch);
		assert.ok(schemaFollowupBatch);
		assert.notEqual(schemaBatch.index, schemaFollowupBatch.index);
		assert.ok(schemaBatch.locks.includes('schema_artifact'));
		assert.ok(schemaFollowupBatch.locks.includes('schema_artifact'));
		assert.equal(status.command_contract.effect_graph_status.status, 'fresh');
		const schemaIntent = status.command_contract.intents.find((intent) => intent.name === 'verify_schema_contract');
		assert.ok(schemaIntent);
		assert.equal(schemaIntent.effect_graph.authority, 'explanation_only');
		assert.equal(schemaIntent.effect_graph.command_authority, '.mustflow/config/commands.toml');
		assert.equal(schemaIntent.effect_graph.grants_command_authority, false);
		assert.equal(schemaIntent.effect_graph.status, 'fresh');
		assert.ok(
			schemaIntent.effect_graph.write_locks.some(
				(lock) => lock.lock === 'schema_artifact' && lock.paths.includes('dist/**'),
			),
		);
		assert.ok(
			schemaIntent.effect_graph.lock_conflicts.some(
				(conflict) => conflict.intent === 'verify_schema_contract_followup' && conflict.lock === 'schema_artifact',
			),
		);
		assert.ok(
			status.verification.schedule.entries.some(
				(entry) =>
					entry.intent === 'verify_schema_contract' &&
					entry.effects.some((effect) => effect.mode === 'delete_recreate' && effect.lock === 'schema_artifact'),
			),
		);
		assert.equal(status.verification.decision_graph.root, 'verification_decision');
		assert.ok(
			status.verification.decision_graph.nodes.some(
				(node) =>
					node.kind === 'command_candidate' &&
					node.intent === 'verify_schema_contract' &&
					node.status === 'runnable',
			),
		);
		assert.ok(
			status.verification.decision_graph.nodes.some(
				(node) =>
					node.kind === 'effect' &&
					node.intent === 'verify_schema_contract' &&
					node.data.lock === 'schema_artifact',
			),
		);
		assert.equal(recommendedIntents.includes('test_release'), false);
		assert.ok(skippedIntents.includes('build'));
		assert.ok(skippedIntents.includes('docs_validate'));
		assert.equal(skippedIntents.includes('test_audit'), false);
	} finally {
		if (dashboard) {
			await stopDashboard(dashboard);
		}
		removeTempProject(projectPath);
	}
});
