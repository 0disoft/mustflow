import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { test } from 'node:test';
import { pathToFileURL } from 'node:url';

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
	latestRunReceiptPath,
	packageVersion,
	projectRoot,
	removeTempProject,
	runCli,
	runPerformanceSamplesPath,
	runPerformanceSummaryPath,
	setDefaultKillAfterSeconds,
	trySymlink,
	waitForClose,
	waitForOutput,
} from './run-support.js';

const STREAM_STARTUP_WAIT_MS = 8_000;
const RUN_PARENT_GUARD_TIMEOUT_MS = 15_000;
const RUN_PARENT_GUARD_SETTLE_MS = 14_000;

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
		const performanceSamples = JSON.parse(readFileSync(runPerformanceSamplesPath(projectPath), 'utf8'));
		const performanceSummary = JSON.parse(readFileSync(runPerformanceSummaryPath(projectPath), 'utf8'));
		const performanceSample = performanceSamples.samples.at(-1);
		const performanceFingerprintSummary = performanceSummary.intents.echo_json.fingerprints[receipt.performance.intent_fingerprint];

		assert.equal(result.status, 0);
		assert.equal(result.stderr, '');
		assert.equal(receipt.schema_version, '1');
		assert.equal(receipt.command, 'run');
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
		assert.deepEqual(receipt.write_drift.declared_paths, []);
		assert.deepEqual(receipt.write_drift.observed_paths, []);
		assert.deepEqual(receipt.write_drift.undeclared_paths, []);
		assert.equal(receipt.write_drift.has_undeclared_changes, false);
		assert.equal(receipt.write_drift.reason, 'git_status_unavailable_recursive_snapshot_disabled');
		assert.ok(existsSync(latestPath));
		assert.match(receipt.receipt_path, /^\.mustflow\/state\/runs\/run-.*\/receipt\.json$/u);
		assert.ok(existsSync(path.join(projectPath, receipt.receipt_path)));
		assert.deepEqual(latest, receipt);
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

test('keeps receipt performance fields limited to safe structured values', async () => {
	const projectPath = createTempProject();
	const { createRunReceipt } = await import(pathToFileURL(path.join(projectRoot, 'dist', 'core', 'run-receipt.js')).href);

	try {
		const receipt = createRunReceipt({
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
			},
		);
		const receipt = JSON.parse(stdout.join(''));

		assert.equal(status, 0, stderr.join(''));
		assert.equal(receipt.status, 'passed');
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
		assert.notEqual(receipt.status, 'start_failed');
		assert.match(receipt.error, /maxBuffer|ENOBUFS|exceeded/i);
		assert.deepEqual(latest, receipt);
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
		assert.equal(receipt.kill_method, process.platform === 'win32' ? 'taskkill_process_tree_forced' : 'process_group_sigterm');
		assert.deepEqual(receipt.termination, {
			reason: 'timeout',
			method: process.platform === 'win32' ? 'taskkill_process_tree_forced' : 'process_group_sigterm',
			graceful_signal: 'SIGTERM',
			forced_signal: 'SIGKILL',
			forced_kill_attempted: false,
			confirmed: true,
			cleanup_pending: false,
		});
		assert.deepEqual(latest, receipt);
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
writes = []
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
		assert.equal(receipt.kill_method, process.platform === 'win32' ? 'taskkill_process_tree_forced' : 'process_group_sigterm');
		assert.deepEqual(receipt.termination, {
			reason: 'timeout',
			method: process.platform === 'win32' ? 'taskkill_process_tree_forced' : 'process_group_sigterm',
			graceful_signal: 'SIGTERM',
			forced_signal: 'SIGKILL',
			forced_kill_attempted: process.platform !== 'win32',
			confirmed: true,
			cleanup_pending: false,
		});
		assert.match(result.stderr, /timed out/i);
	} finally {
		removeTempProject(projectPath);
	}
});
