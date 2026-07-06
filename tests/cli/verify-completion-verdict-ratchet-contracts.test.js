import {
	appendIntent,
	assert,
	commitProjectBaseline,
	createClassifyPlan,
	createHash,
	createLocalIndexDirect,
	createMinimalWorkflowProject,
	createTempProject,
	createValidationRatchetRisks,
	createVerificationFailureFingerprint,
	createVerifyCompletionVerdict,
	existsSync,
	initProject,
	mkdirSync,
	mkdtempSync,
	path,
	projectRoot,
	readFileSync,
	refreshManifestLockHash,
	removeTempProject,
	REPEATED_FAILURE_STATE_LIMIT,
	REPEATED_FAILURE_STATE_PATH,
	rmSync,
	runCli,
	runCliInProcess,
	runGit,
	spawnSync,
	test,
	tmpdir,
	updateRepeatedFailureState,
	writeFileSync,
	writeRunTrustManifestLock,
} from './helpers/verify-completion-verdict-contracts.js';

test('downgrades verified verdicts when changed tests carry validation ratchet risk', async () => {
	const projectPath = createTempProject();

	try {
		await initProject(projectPath);
		appendIntent(
			projectPath,
			`
[intents.verify_ratchet]
status = "configured"
lifecycle = "oneshot"
run_policy = "agent_allowed"
description = "Verify validation ratchet risk."
argv = ['${process.execPath}', '-e', 'process.exit(0)']
cwd = "."
timeout_seconds = 10
stdin = "closed"
success_exit_codes = [0]
writes = []
network = false
destructive = false
required_after = ["ratchet_change"]
`,
		);
		const testFilePath = path.join(projectPath, 'tests', 'ratchet.test.js');
		mkdirSync(path.dirname(testFilePath), { recursive: true });
		const focusedMarker = 'test' + '.only';
		writeFileSync(
			testFilePath,
			`
import { test } from 'node:test';

${focusedMarker}('focused test should be reviewed', () => {});
`,
		);
		const plan = path.join(projectPath, 'ratchet-plan.json');
		writeFileSync(
			plan,
			JSON.stringify(
				{
					schema_version: '1',
					command: 'classify',
					mustflow_root: projectPath,
					source: 'paths',
					files: ['tests/ratchet.test.js'],
					classifications: [
						{
							path: 'tests/ratchet.test.js',
							changeKinds: ['test'],
							surface: {
								kind: 'test_contract',
								category: 'test',
								isPublicSurface: false,
								validationReasons: ['ratchet_change'],
								affectedContracts: ['test behavior contract'],
								updatePolicy: 'not_applicable',
								driftChecks: ['related test selection'],
							},
						},
					],
					summary: {
						fileCount: 1,
						publicSurfaceCount: 0,
						changeKinds: ['test'],
						validationReasons: ['ratchet_change'],
						updatePolicies: [],
						driftChecks: ['related test selection'],
						affectedContracts: ['test behavior contract'],
					},
				},
				null,
				2,
			),
		);

		const result = await runCli(projectPath, ['verify', '--from-plan', plan, '--json']);
		const report = JSON.parse(result.stdout);

		assert.equal(result.status, 1, result.stderr || result.stdout);
		assert.equal(report.status, 'passed');
		assert.equal(report.completion_verdict.status, 'partially_verified');
		assert.equal(report.completion_verdict.primary_reason, 'validation_ratchet_review_required');
		assert.equal(report.completion_verdict.evidence.validation_ratchet_risk_count, 1);
		assert.equal(report.completion_verdict.evidence.risks.validation_ratchet, 1);
		assert.deepEqual(report.completion_verdict.limitations, ['validation_ratchet_risk_requires_review']);
		assert.deepEqual(report.evidence_model.remaining_risks, [
			{
				code: 'skip_or_only_marker_present',
				severity: 'medium',
				detail:
					'Changed test path tests/ratchet.test.js contains a .skip or .only marker; review whether validation was weakened before marking the task verified.',
			},
		]);
	} finally {
		removeTempProject(projectPath);
	}
});

test('detects obvious validation weakening in changed tests', async () => {
	const projectPath = createTempProject();

	try {
		await initProject(projectPath);
		appendIntent(
			projectPath,
			`
[intents.verify_test_contract]
status = "configured"
lifecycle = "oneshot"
run_policy = "agent_allowed"
description = "Verify test contract changes."
argv = ['${process.execPath}', '-e', 'process.exit(0)']
cwd = "."
timeout_seconds = 10
stdin = "closed"
success_exit_codes = [0]
writes = []
network = false
destructive = false
required_after = ["ratchet_change"]
`,
		);
		const testFilePath = path.join(projectPath, 'tests', 'ratchet-assertions.test.js');
		mkdirSync(path.dirname(testFilePath), { recursive: true });
		writeFileSync(
			testFilePath,
			`
import assert from 'node:assert/strict';
import { test } from 'node:test';

test('keeps strong behavior checks', async () => {
	assert.equal(1 + 1, 2);
	assert.deepEqual({ ok: true }, { ok: true });
	assert.throws(() => {
		throw new Error('expected');
	});
});
`,
		);
		commitProjectBaseline(projectPath);
		writeFileSync(
			testFilePath,
			`
import assert from 'node:assert/strict';
import { test } from 'node:test';

test('keeps strong behavior checks', async () => {
	assert.ok(1 + 1);
});

test.pending('deferred rejected-path coverage');
`,
		);

		const plan = path.join(projectPath, 'ratchet-assertions-plan.json');
		writeFileSync(
			plan,
			JSON.stringify(
				{
					schema_version: '1',
					command: 'classify',
					mustflow_root: projectPath,
					source: 'changed',
					files: ['tests/ratchet-assertions.test.js'],
					classifications: [
						{
							path: 'tests/ratchet-assertions.test.js',
							changeKinds: ['test'],
							surface: {
								kind: 'test_contract',
								category: 'test',
								isPublicSurface: false,
								validationReasons: ['ratchet_change'],
								affectedContracts: ['test behavior contract'],
								updatePolicy: 'not_applicable',
								driftChecks: ['related test selection'],
							},
						},
					],
					summary: {
						fileCount: 1,
						publicSurfaceCount: 0,
						changeKinds: ['test'],
						validationReasons: ['ratchet_change'],
						updatePolicies: [],
						driftChecks: ['related test selection'],
						affectedContracts: ['test behavior contract'],
					},
				},
				null,
				2,
			),
		);

		const result = await runCli(projectPath, ['verify', '--from-plan', plan, '--json']);
		const report = JSON.parse(result.stdout);
		const riskCodes = report.evidence_model.remaining_risks.map((risk) => risk.code);

		assert.equal(result.status, 1, result.stderr || result.stdout);
		assert.equal(report.status, 'passed');
		assert.equal(report.completion_verdict.status, 'partially_verified');
		assert.equal(report.completion_verdict.primary_reason, 'validation_ratchet_review_required');
		assert.equal(report.completion_verdict.evidence.validation_ratchet_risk_count, 4);
		assert.deepEqual(riskCodes, [
			'todo_or_pending_marker_added',
			'assertion_count_decreased',
			'assertion_matcher_weakened',
			'exception_assertion_removed',
		]);
	} finally {
		removeTempProject(projectPath);
	}
});

test('keeps language-specific validation ratchet analysis conservative', async () => {
	const projectPath = createTempProject();

	try {
		await initProject(projectPath);
		const testFilePath = path.join(projectPath, 'tests', 'ratchet-python.test.py');
		mkdirSync(path.dirname(testFilePath), { recursive: true });
		writeFileSync(
			testFilePath,
			`
def test_denies_admin_access():
    assert can_access("viewer") is False
`,
		);
		commitProjectBaseline(projectPath);
		writeFileSync(
			testFilePath,
			`
def test_denies_admin_access():
    result = can_access("viewer")
`,
		);

		const risks = createValidationRatchetRisks(
			{
				source: 'changed',
				files: ['tests/ratchet-python.test.py'],
				classifications: [
					{
						path: 'tests/ratchet-python.test.py',
						changeKinds: ['test'],
						surface: {
							kind: 'test_contract',
							category: 'test',
							isPublicSurface: false,
							validationReasons: ['ratchet_change'],
							affectedContracts: ['test behavior contract'],
							updatePolicy: 'not_applicable',
							driftChecks: ['related test selection'],
						},
					},
				],
				summary: {
					fileCount: 1,
					publicSurfaceCount: 0,
					changeKinds: ['test'],
					validationReasons: ['ratchet_change'],
					updatePolicies: [],
					driftChecks: ['related test selection'],
					affectedContracts: ['test behavior contract'],
				},
			},
			projectPath,
		);

		assert.deepEqual(risks, []);
	} finally {
		removeTempProject(projectPath);
	}
});

test('detects validation ratchet risks across multiple changed files', () => {
	const projectPath = createTempProject();

	try {
		const firstTestPath = path.join(projectPath, 'tests', 'ratchet-one.test.js');
		const secondTestPath = path.join(projectPath, 'tests', 'ratchet-two.test.js');
		mkdirSync(path.dirname(firstTestPath), { recursive: true });
		writeFileSync(
			firstTestPath,
			`
import assert from 'node:assert/strict';
import { test } from 'node:test';

test('keeps strict equality', () => {
	assert.equal(1 + 1, 2);
});
`,
		);
		writeFileSync(
			secondTestPath,
			`
import assert from 'node:assert/strict';
import { test } from 'node:test';

test('keeps failure coverage', () => {
	assert.throws(() => {
		throw new Error('expected');
	});
});
`,
		);
		commitProjectBaseline(projectPath);
		writeFileSync(
			firstTestPath,
			`
import assert from 'node:assert/strict';
import { test } from 'node:test';

test('keeps strict equality', () => {
	assert.ok(1 + 1);
});
`,
		);
		writeFileSync(
			secondTestPath,
			`
import assert from 'node:assert/strict';
import { test } from 'node:test';

test.pending('deferred failure coverage');
`,
		);

		const classify = (filePath) => ({
			path: filePath,
			changeKinds: ['test'],
			surface: {
				kind: 'test_contract',
				category: 'test',
				isPublicSurface: false,
				validationReasons: ['ratchet_change'],
				affectedContracts: ['test behavior contract'],
				updatePolicy: 'not_applicable',
				driftChecks: ['related test selection'],
			},
		});
		const risks = createValidationRatchetRisks(
			{
				source: 'changed',
				files: ['tests/ratchet-one.test.js', 'tests/ratchet-two.test.js'],
				classifications: [classify('tests/ratchet-one.test.js'), classify('tests/ratchet-two.test.js')],
				summary: {
					fileCount: 2,
					publicSurfaceCount: 0,
					changeKinds: ['test'],
					validationReasons: ['ratchet_change'],
					updatePolicies: [],
					driftChecks: ['related test selection'],
					affectedContracts: ['test behavior contract'],
				},
			},
			projectPath,
		);

		assert.deepEqual(
			risks.map((risk) => [risk.path, risk.code]),
			[
				['tests/ratchet-one.test.js', 'assertion_matcher_weakened'],
				['tests/ratchet-two.test.js', 'todo_or_pending_marker_added'],
				['tests/ratchet-two.test.js', 'assertion_count_decreased'],
				['tests/ratchet-two.test.js', 'exception_assertion_removed'],
			],
		);
	} finally {
		removeTempProject(projectPath);
	}
});

test('detects validation ratchet risks from staged-only changes', () => {
	const projectPath = createTempProject();

	try {
		const testFilePath = path.join(projectPath, 'tests', 'ratchet-staged.test.js');
		mkdirSync(path.dirname(testFilePath), { recursive: true });
		writeFileSync(
			testFilePath,
			`
import assert from 'node:assert/strict';
import { test } from 'node:test';

test('keeps exception coverage', () => {
	assert.throws(() => {
		throw new Error('expected');
	});
});
`,
		);
		commitProjectBaseline(projectPath);
		writeFileSync(
			testFilePath,
			`
import assert from 'node:assert/strict';
import { test } from 'node:test';

test('keeps exception coverage', () => {
	assert.ok(true);
});
`,
		);
		runGit(projectPath, ['add', 'tests/ratchet-staged.test.js']);

		const risks = createValidationRatchetRisks(
			{
				source: 'changed',
				files: ['tests/ratchet-staged.test.js'],
				classifications: [
					{
						path: 'tests/ratchet-staged.test.js',
						changeKinds: ['test'],
						surface: {
							kind: 'test_contract',
							category: 'test',
							isPublicSurface: false,
							validationReasons: ['ratchet_change'],
							affectedContracts: ['test behavior contract'],
							updatePolicy: 'not_applicable',
							driftChecks: ['related test selection'],
						},
					},
				],
				summary: {
					fileCount: 1,
					publicSurfaceCount: 0,
					changeKinds: ['test'],
					validationReasons: ['ratchet_change'],
					updatePolicies: [],
					driftChecks: ['related test selection'],
					affectedContracts: ['test behavior contract'],
				},
			},
			projectPath,
		);

		assert.deepEqual(
			risks.map((risk) => risk.code),
			['assertion_matcher_weakened', 'exception_assertion_removed'],
		);
	} finally {
		removeTempProject(projectPath);
	}
});

test('detects command contract validation weakening from changed diffs', async () => {
	const projectPath = createTempProject();

	try {
		await initProject(projectPath);
		commitProjectBaseline(projectPath);
		const commandsPath = path.join(projectPath, '.mustflow', 'config', 'commands.toml');
		let commands = readFileSync(commandsPath, 'utf8');
		commands = commands.replace('success_exit_codes = [0]', 'success_exit_codes = [0, 1]');
		commands = commands.replace('required_after = ["code_change", "behavior_change", "test_change"]', '');
		commands += `

[intents.weak_test]
status = "manual_only"
description = "Weak test command."
argv = ["npm", "test", "--", "--passWithNoTests", "--grep", "happy"]
`;
		writeFileSync(commandsPath, commands);

		const risks = createValidationRatchetRisks(
			{
				source: 'changed',
				files: ['.mustflow/config/commands.toml'],
				classifications: [
					{
						path: '.mustflow/config/commands.toml',
						changeKinds: ['workflow'],
						surface: {
							kind: 'workflow_root',
							category: 'workflow',
							isPublicSurface: true,
							validationReasons: ['mustflow_config_change'],
							affectedContracts: ['command contract'],
							updatePolicy: 'update',
							driftChecks: ['strict workflow validation'],
						},
					},
				],
				summary: {
					fileCount: 1,
					publicSurfaceCount: 1,
					changeKinds: ['workflow'],
					validationReasons: ['mustflow_config_change'],
					updatePolicies: ['update'],
					driftChecks: ['strict workflow validation'],
					affectedContracts: ['command contract'],
				},
			},
			projectPath,
		);
		const riskCodes = risks.map((risk) => risk.code);
		const severities = Object.fromEntries(risks.map((risk) => [risk.code, risk.severity]));

		assert.deepEqual(riskCodes, [
			'verification_intent_disabled',
			'verification_required_after_removed',
			'success_exit_codes_widened',
			'command_allows_no_tests',
			'test_selection_narrowed',
		]);
		assert.equal(severities.verification_intent_disabled, 'high');
		assert.equal(severities.verification_required_after_removed, 'high');
		assert.equal(severities.success_exit_codes_widened, 'critical');
		assert.equal(severities.command_allows_no_tests, 'critical');
		assert.equal(severities.test_selection_narrowed, 'medium');
	} finally {
		removeTempProject(projectPath);
	}
});

test('detects package validation script weakening from changed diffs', async () => {
	const projectPath = createTempProject();

	try {
		await initProject(projectPath);
		const packageJsonPath = path.join(projectPath, 'package.json');
		writeFileSync(
			packageJsonPath,
			JSON.stringify(
				{
					scripts: {
						test: 'vitest run',
					},
				},
				null,
				2,
			),
		);
		commitProjectBaseline(projectPath);
		writeFileSync(
			packageJsonPath,
			JSON.stringify(
				{
					scripts: {
						test: 'vitest run --passWithNoTests --updateSnapshot --testNamePattern happy || true',
					},
				},
				null,
				2,
			),
		);

		const risks = createValidationRatchetRisks(
			{
				source: 'changed',
				files: ['package.json'],
				classifications: [
					{
						path: 'package.json',
						changeKinds: ['package_metadata'],
						surface: {
							kind: 'package_manifest',
							category: 'configuration',
							isPublicSurface: true,
							validationReasons: ['package_metadata_change'],
							affectedContracts: ['package scripts'],
							updatePolicy: 'update',
							driftChecks: ['validation command behavior'],
						},
					},
				],
				summary: {
					fileCount: 1,
					publicSurfaceCount: 1,
					changeKinds: ['package_metadata'],
					validationReasons: ['package_metadata_change'],
					updatePolicies: ['update'],
					driftChecks: ['validation command behavior'],
					affectedContracts: ['package scripts'],
				},
			},
			projectPath,
		);
		const riskCodes = risks.map((risk) => risk.code);
		const severities = Object.fromEntries(risks.map((risk) => [risk.code, risk.severity]));

		assert.deepEqual(riskCodes, [
			'command_allows_no_tests',
			'command_forces_snapshot_update',
			'command_hides_failure',
			'test_selection_narrowed',
		]);
		assert.equal(severities.command_allows_no_tests, 'critical');
		assert.equal(severities.command_forces_snapshot_update, 'medium');
		assert.equal(severities.command_hides_failure, 'critical');
		assert.equal(severities.test_selection_narrowed, 'medium');
	} finally {
		removeTempProject(projectPath);
	}
});
