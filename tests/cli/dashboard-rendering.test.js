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
	trySymlink,
	writeLatestRunReceipt,
} from './dashboard-support.js';

test('dashboard browser opener uses platform-native commands', async () => {
	const { getBrowserOpenCommand, getFileManagerOpenCommand } = await import(browserOpenModuleUrl);
	const url = 'http://127.0.0.1:4173/';
	const folderPath = path.join(projectRoot, '.mustflow');

	assert.deepEqual(getBrowserOpenCommand(url, 'win32'), {
		bin: 'cmd',
		args: ['/c', 'start', '', url],
	});
	assert.deepEqual(getBrowserOpenCommand(url, 'darwin'), {
		bin: 'open',
		args: [url],
	});
	assert.deepEqual(getBrowserOpenCommand(url, 'linux'), {
		bin: 'xdg-open',
		args: [url],
	});
	assert.equal(getBrowserOpenCommand(url, 'aix'), undefined);

	assert.deepEqual(getFileManagerOpenCommand(folderPath, 'win32'), {
		bin: 'cmd',
		args: ['/c', 'start', '', folderPath],
	});
	assert.deepEqual(getFileManagerOpenCommand(folderPath, 'darwin'), {
		bin: 'open',
		args: [folderPath],
	});
	assert.deepEqual(getFileManagerOpenCommand(folderPath, 'linux'), {
		bin: 'xdg-open',
		args: [folderPath],
	});
	assert.equal(getFileManagerOpenCommand(folderPath, 'aix'), undefined);
});

test('dashboard HTML escapes inline JSON for script context', async () => {
	const { renderDashboardHtml } = await import(dashboardHtmlModuleUrl);
	const injected = '</script><script>window.__mustflowInjected=1</script>&\u2028\u2029';
	const html = renderDashboardHtml(
		{
			projectRoot: injected,
			preferencesPath: injected,
			settings: [],
			lockedSettings: [],
			groups: [],
			metadata: { generatedAt: injected },
		},
		injected,
		{
			schema_version: '1',
			command: 'dashboard status',
			mustflow_root: injected,
			preferences: { marker: injected },
			command_contract: { intents: [{ name: 'malicious', description: injected }] },
		},
		{
			schema_version: '1',
			command: 'dashboard docs status',
			documents: [{ path: injected, review_summary: injected }],
		},
	);
	const scriptBody = /<script>\n([\s\S]*?)\n<\/script>/u.exec(html)?.[1] ?? '';

	assert.equal([...html.matchAll(/<\/script>/gu)].length, 1);
	assert.doesNotMatch(html, /<\/script><script>/u);
	assert.doesNotMatch(html, /<script>window\.__mustflowInjected/u);
	assert.doesNotMatch(scriptBody, /\u2028/u);
	assert.doesNotMatch(scriptBody, /\u2029/u);
	assert.match(
		scriptBody,
		/\\u003C\/script\\u003E\\u003Cscript\\u003Ewindow\.__mustflowInjected=1\\u003C\/script\\u003E\\u0026\\u2028\\u2029/u,
	);
});

test('dashboard exports static HTML and redacted JSON without starting a server', () => {
	const projectPath = createTempProject();

	try {
		const init = runCli(projectPath, ['init', '--yes']);
		assert.equal(init.status, 0, init.stderr);
		writeLatestRunReceipt(projectPath);

		const htmlResult = runCli(projectPath, ['dashboard', '--export', 'reports/dashboard.html']);
		assert.equal(htmlResult.status, 0, htmlResult.stderr || htmlResult.stdout);
		assert.match(htmlResult.stdout, /Wrote dashboard export to reports\/dashboard\.html/);
		assert.doesNotMatch(htmlResult.stdout, /listening/);

		const htmlPath = path.join(projectPath, 'reports', 'dashboard.html');
		assert.ok(existsSync(htmlPath));
		const html = readFileSync(htmlPath, 'utf8');
		assert.match(html, /mustflow dashboard export/);
		assert.match(html, /Dashboard status/);
		assert.match(html, /<script id="dashboard-export-data" type="application\/json">/);
		assert.doesNotMatch(html, /dashboardToken/);
		assert.doesNotMatch(html, /fetch\("/);
		assert.doesNotMatch(html, /\/api\//);
		assert.doesNotMatch(html, /navigator\.clipboard/);
		assert.doesNotMatch(html, /id="open-mustflow"/);
		assert.doesNotMatch(html, /<button\b/);
		assert.doesNotMatch(html, /supersecretvalue/);
		assert.doesNotMatch(html, /sk-abcdefghijklmnop/);
		assert.doesNotMatch(html, /ghp_1234567890abcdefghij/);

		const jsonResult = runCli(projectPath, ['dashboard', '--export-json', 'reports/dashboard.json']);
		assert.equal(jsonResult.status, 0, jsonResult.stderr || jsonResult.stdout);
		assert.match(jsonResult.stdout, /Wrote dashboard export to reports\/dashboard\.json/);
		assert.doesNotMatch(jsonResult.stdout, /listening/);

		const jsonPath = path.join(projectPath, 'reports', 'dashboard.json');
		assert.ok(existsSync(jsonPath));
		const exportSnapshot = JSON.parse(readFileSync(jsonPath, 'utf8'));
		assert.equal(exportSnapshot.schema_version, '1');
		assert.equal(exportSnapshot.command, 'dashboard export');
		assert.match(exportSnapshot.correlation_id, /^mf-dashboard-[0-9a-f]{16}$/u);
		assert.equal(exportSnapshot.format, 'json');
		assert.equal(exportSnapshot.output_policy.starts_server, false);
		assert.equal(exportSnapshot.output_policy.omits_dashboard_token, true);
		assert.equal(exportSnapshot.output_policy.omits_raw_run_output, true);
		assert.equal(exportSnapshot.output_policy.redacts_secret_like_values, true);
		assert.equal(exportSnapshot.harness_report.schema_version, '1');
		assert.equal(exportSnapshot.harness_report.generated_from, 'dashboard_status_snapshot');
		assert.equal(exportSnapshot.harness_report.install.installed, true);
		assert.equal(exportSnapshot.harness_report.verification.completion_verdict.schema_version, '1');
		assert.equal(exportSnapshot.harness_report.verification.completion_verdict.status, 'partially_verified');
		assert.equal(
			exportSnapshot.harness_report.verification.completion_verdict.primary_reason,
			'latest_run_passed_without_current_claim_binding',
		);
		assert.equal(exportSnapshot.harness_report.verification.completion_verdict.evidence.source, 'dashboard_export');
		assert.equal(exportSnapshot.harness_report.verification.evidence_model.source, 'dashboard_export');
		assert.deepEqual(exportSnapshot.harness_report.verification.evidence_model.coverage_matrix, []);
		assert.equal(exportSnapshot.harness_report.verification.evidence_model.receipts[0].intent, 'test_related');
		assert.equal(
			exportSnapshot.harness_report.verification.evidence_model.receipts[0].receipt_path,
			'.mustflow/state/runs/latest.json',
		);
		assert.deepEqual(
			exportSnapshot.harness_report.verification.evidence_model.explanation.downgraded_by,
			['dashboard_export_is_read_only', 'latest_run_is_not_bound_to_a_current_completion_claim'],
		);
		assert.equal(exportSnapshot.harness_report.run_history.intent, 'test_related');
		assert.equal(exportSnapshot.harness_report.run_history.receipt_path, '.mustflow/state/runs/latest.json');
		assert.equal(exportSnapshot.harness_report.docs_review.active_documents, 0);
		assert.equal(exportSnapshot.status.run_history.command_line_omitted, true);
		assert.equal(exportSnapshot.status.run_history.stdout.tail_omitted, true);
		assert.equal(exportSnapshot.status.run_history.stderr.tail_omitted, true);
		assert.equal(exportSnapshot.status.run_history.stdout.redacted, true);
		assert.equal(exportSnapshot.status.run_history.stderr.redacted, true);
		assert.ok(exportSnapshot.status.run_history.stdout.redaction_count > 0);
		assert.ok(exportSnapshot.status.run_history.stderr.redaction_count > 0);
		assert.ok(exportSnapshot.limits.omitted_fields.includes('status.run_history.command_line'));
		assert.ok(exportSnapshot.limits.omitted_fields.includes('status.run_history.stdout.tail'));
		assert.equal(typeof exportSnapshot.limits.max_string_bytes, 'number');
		assert.equal(typeof exportSnapshot.limits.max_array_items, 'number');
		assert.equal(typeof exportSnapshot.limits.redaction_count, 'number');
		assert.ok(Array.isArray(exportSnapshot.limits.redacted_fields));
		assert.ok(Array.isArray(exportSnapshot.limits.redaction_kinds));
		assert.ok(Array.isArray(exportSnapshot.limits.truncated_fields));
		const serialized = JSON.stringify(exportSnapshot);
		assert.doesNotMatch(serialized, /dashboardToken/);
		assert.doesNotMatch(serialized, /supersecretvalue/);
		assert.doesNotMatch(serialized, /sk-abcdefghijklmnop/);
		assert.doesNotMatch(serialized, /ghp_1234567890abcdefghij/);
	} finally {
		removeTempProject(projectPath);
	}
});

test('dashboard JSON export includes harness verification gaps and remaining risks', () => {
	const projectPath = createTempProject();

	try {
		const init = runCli(projectPath, ['init', '--yes']);
		assert.equal(init.status, 0, init.stderr);
		const commandsPath = path.join(projectPath, '.mustflow', 'config', 'commands.toml');
		writeFileSync(
			commandsPath,
			`${readFileSync(commandsPath, 'utf8')}
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
network = false
destructive = false
required_after = ["public_api_change"]

[intents.verify_schema_manual_review]
status = "manual_only"
description = "Manual schema verification review."
reason = "Schema review requires explicit maintainer approval."
agent_action = "do_not_run_report_gap"
required_after = ["public_api_change"]

[intents.verify_schema_unknown_tool]
status = "unknown"
description = "Unknown schema verification tool."
reason = "No schema verification tool is configured."
agent_action = "do_not_guess_report_missing"
required_after = ["public_api_change"]
`,
		);
		assert.equal(runGit(projectPath, ['init']).status, 0);
		assert.equal(runGit(projectPath, ['config', 'user.email', 'mustflow@example.invalid']).status, 0);
		assert.equal(runGit(projectPath, ['config', 'user.name', 'mustflow test']).status, 0);
		assert.equal(runGit(projectPath, ['add', '.']).status, 0);
		assert.equal(runGit(projectPath, ['commit', '-m', 'baseline']).status, 0);

		mkdirSync(path.join(projectPath, 'schemas'), { recursive: true });
		mkdirSync(path.join(projectPath, 'docs'), { recursive: true });
		writeFileSync(path.join(projectPath, 'schemas', 'output.schema.json'), '{"type":"object"}\n');
		writeFileSync(path.join(projectPath, 'docs', 'guide.md'), '# Guide\n');
		const addReview = runCli(projectPath, [
			'docs',
			'review',
			'add',
			'docs/guide.md',
			'--actor-kind',
			'llm',
			'--actor-id',
			'codex',
			'--comment',
			'Check dashboard export wording.',
		]);
		assert.equal(addReview.status, 0, addReview.stderr || addReview.stdout);

		const jsonResult = runCli(projectPath, ['dashboard', '--export-json', 'reports/harness.json']);
		assert.equal(jsonResult.status, 0, jsonResult.stderr || jsonResult.stdout);

		const exportSnapshot = JSON.parse(readFileSync(path.join(projectPath, 'reports', 'harness.json'), 'utf8'));
		const report = exportSnapshot.harness_report;
		const gapKinds = report.verification.gaps.map((gap) => gap.kind);
		const riskCodes = report.remaining_risks.map((risk) => risk.code);

		assert.equal(report.schema_version, '1');
		assert.equal(report.verification.completion_verdict.status, 'blocked');
		assert.equal(report.verification.completion_verdict.primary_reason, 'verification_gaps_present');
		assert.equal(report.verification.evidence_model.source, 'dashboard_export');
		assert.equal(report.verification.evidence_model.requirements[0].reason, 'dashboard_snapshot');
		assert.equal(report.verification.evidence_model.coverage_matrix[0].status, 'blocked');
		assert.ok(
			report.verification.evidence_model.coverage_matrix[0].evidence.gap_reasons.includes(
				'Schema review requires explicit maintainer approval.',
			),
		);
		assert.equal(report.verification.evidence_model.coverage_matrix[0].evidence.gap_reasons.length > 1, true);
		assert.ok(report.verification.evidence_model.gaps.some((gap) => gap.status === 'manual_only'));
		assert.ok(report.verification.evidence_model.remaining_risks.some((risk) => risk.code === 'docs_review_pending'));
		assert.deepEqual(report.verification.conflict_ledger, report.verification.evidence_model.conflict_ledger);
		assert.equal(report.verification.conflict_ledger.status, 'open');
		assert.ok(report.verification.conflict_ledger.items.some((item) => item.kind === 'verification_gap'));
		assert.ok(report.verification.conflict_ledger.items.some((item) => item.kind === 'remaining_risk'));
		assert.equal(report.verification.changed_file_count > 0, true);
		assert.ok(report.verification.changed_surfaces.includes('schema_contract'));
		assert.equal(report.verification.decision_graph_summary.root, 'verification_decision');
		assert.equal(report.verification.decision_graph_summary.runnable > 0, true);
		assert.ok(report.verification.runnable_intents.includes('verify_schema_contract'));
		assert.ok(report.verification.skipped_intents.some((intent) => intent.intent === 'verify_schema_manual_review'));
		assert.ok(report.verification.skipped_intents.some((intent) => intent.intent === 'verify_schema_unknown_tool'));
		assert.ok(gapKinds.includes('manual_only'));
		assert.ok(gapKinds.includes('unknown'));
		assert.equal(report.docs_review.active_documents, 1);
		assert.ok(riskCodes.includes('docs_review_pending'));
		assert.ok(riskCodes.includes('manual_only_verification_gap'));
		assert.ok(riskCodes.includes('unknown_verification_gap'));
		assert.doesNotMatch(JSON.stringify(report), /schema contract"\]/);
	} finally {
		removeTempProject(projectPath);
	}
});
