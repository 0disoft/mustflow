import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { runCliInProcess } from './helpers/cli-harness.js';

const projectRoot = path.resolve(fileURLToPath(new URL('../..', import.meta.url)));

function createTempProject() {
	return mkdtempSync(path.join(tmpdir(), 'mustflow-verify-inputs-'));
}

function removeTempProject(projectPath) {
	rmSync(projectPath, { recursive: true, force: true });
}

async function runCli(cwd, args) {
	return runCliInProcess(cwd, args);
}

async function initProject(projectPath) {
	const result = await runCli(projectPath, ['init', '--yes', '--workflow', 'strict']);
	assert.equal(result.status, 0, result.stderr || result.stdout);
}

function appendIntent(projectPath, text) {
	const commandsPath = path.join(projectPath, '.mustflow', 'config', 'commands.toml');
	const commands = readFileSync(commandsPath, 'utf8');
	writeFileSync(commandsPath, `${commands}\n${text.trim()}\n`);
	refreshManifestLockHash(projectPath, '.mustflow/config/commands.toml');
}

function refreshManifestLockHash(projectPath, relativePath) {
	const lockPath = path.join(projectPath, '.mustflow', 'config', 'manifest.lock.toml');
	const filePath = path.join(projectPath, ...relativePath.split('/'));
	const hash = `sha256:${createHash('sha256').update(readFileSync(filePath)).digest('hex')}`;
	const lock = readFileSync(lockPath, 'utf8');
	const escapedPath = relativePath.replace(/[.*+?^${}()|[\]\\]/gu, '\\$&');
	const pattern = new RegExp(`(\\[files\\."${escapedPath}"\\][\\s\\S]*?content_hash = ")[^"]+(")`, 'u');
	writeFileSync(lockPath, lock.replace(pattern, `$1${hash}$2`));
}

function tryFileSymlink(targetPath, linkPath) {
	try {
		symlinkSync(targetPath, linkPath, 'file');
		return true;
	} catch {
		return false;
	}
}

function createClassifyPlan(projectPath, reason, filePath = 'README.md') {
	return {
		schema_version: '1',
		command: 'classify',
		mustflow_root: projectPath,
		source: 'paths',
		files: [filePath],
		classifications: [
			{
				path: filePath,
				changeKinds: ['documentation'],
				surface: {
					kind: 'readme_page',
					category: 'documentation',
					isPublicSurface: true,
					validationReasons: [reason],
					affectedContracts: ['public documentation'],
					updatePolicy: 'update',
					driftChecks: ['command examples'],
				},
			},
		],
		summary: {
			fileCount: 1,
			publicSurfaceCount: 1,
			changeKinds: ['documentation'],
			validationReasons: [reason],
			updatePolicies: ['update'],
			driftChecks: ['command examples'],
			affectedContracts: ['public documentation'],
		},
	};
}

test('does not reuse verification when a command changes the classified input', async () => {
	const projectPath = createTempProject();
	try {
		await initProject(projectPath);
		writeFileSync(path.join(projectPath, 'README.md'), 'good');
		writeFileSync(path.join(projectPath, 'classification.json'), JSON.stringify(createClassifyPlan(projectPath, 'input_change')));
		appendIntent(projectPath, `
[intents.verify_input]
status = "configured"
lifecycle = "oneshot"
run_policy = "agent_allowed"
description = "Check the input before updating it."
argv = ['${process.execPath}', '-e', 'const fs = require("node:fs"); if (fs.readFileSync("README.md", "utf8") !== "good") process.exit(1); fs.writeFileSync("README.md", "bad");']
cwd = "."
timeout_seconds = 10
stdin = "closed"
success_exit_codes = [0]
writes = ["README.md"]
network = false
destructive = false
required_after = ["input_change"]
`);
		const args = ['verify', '--from-classification', 'classification.json', '--json'];
		const first = await runCli(projectPath, args);
		assert.equal(first.status, 0, first.stderr || first.stdout);
		assert.equal(readFileSync(path.join(projectPath, 'README.md'), 'utf8'), 'bad');
		const second = await runCli(projectPath, args);
		const report = JSON.parse(second.stdout);
		assert.equal(second.status, 1, second.stderr || second.stdout);
		assert.equal(report.results[0].status, 'failed');
		assert.notEqual(report.results[0].reason, 'reused_input_hash');
	} finally {
		removeTempProject(projectPath);
	}
});

test('reuses unchanged verification inputs and reruns after an edit', async () => {
	const projectPath = createTempProject();
	try {
		await initProject(projectPath);
		writeFileSync(path.join(projectPath, 'README.md'), 'good');
		writeFileSync(path.join(projectPath, 'classification.json'), JSON.stringify(createClassifyPlan(projectPath, 'input_change')));
		appendIntent(projectPath, `
[intents.verify_input]
status = "configured"
lifecycle = "oneshot"
run_policy = "agent_allowed"
description = "Check the input without updating it."
argv = ['${process.execPath}', '-e', 'if (require("node:fs").readFileSync("README.md", "utf8") !== "good") process.exit(1);']
cwd = "."
timeout_seconds = 10
stdin = "closed"
success_exit_codes = [0]
writes = []
network = false
destructive = false
required_after = ["input_change"]
`);
		const args = ['verify', '--from-classification', 'classification.json', '--json'];
		const first = await runCli(projectPath, args);
		assert.equal(first.status, 0, first.stderr || first.stdout);
		const second = await runCli(projectPath, args);
		assert.equal(second.status, 0, second.stderr || second.stdout);
		assert.equal(JSON.parse(second.stdout).results[0].reason, 'reused_input_hash');
		writeFileSync(path.join(projectPath, 'README.md'), 'bad');
		const third = await runCli(projectPath, args);
		assert.equal(third.status, 1, third.stderr || third.stdout);
		assert.equal(JSON.parse(third.stdout).results[0].status, 'failed');
	} finally {
		removeTempProject(projectPath);
	}
});

for (const initiallyExists of [true, false]) {
	test(`distinguishes missing files from literal sentinel contents after ${initiallyExists ? 'deletion' : 'creation'}`, async () => {
		const projectPath = createTempProject();
		try {
			await initProject(projectPath);
			const inputPath = path.join(projectPath, 'README.md');
			if (initiallyExists) writeFileSync(inputPath, '<missing>');
			else rmSync(inputPath, { force: true });
			writeFileSync(path.join(projectPath, 'classification.json'), JSON.stringify(createClassifyPlan(projectPath, 'input_change')));
			appendIntent(projectPath, `
[intents.verify_input]
status = "configured"
lifecycle = "oneshot"
run_policy = "agent_allowed"
description = "Verify whether the input exists."
argv = ['${process.execPath}', '-e', 'if (require("node:fs").existsSync("README.md") !== ${initiallyExists}) process.exit(1);']
cwd = "."
timeout_seconds = 10
stdin = "closed"
success_exit_codes = [0]
writes = []
network = false
destructive = false
required_after = ["input_change"]
`);
			const args = ['verify', '--from-classification', 'classification.json', '--json'];
			const first = await runCli(projectPath, args);
			assert.equal(first.status, 0, first.stderr || first.stdout);
			const unchanged = await runCli(projectPath, args);
			assert.equal(unchanged.status, 0, unchanged.stderr || unchanged.stdout);
			assert.equal(JSON.parse(unchanged.stdout).results[0].reason, 'reused_input_hash');
			if (initiallyExists) rmSync(inputPath);
			else writeFileSync(inputPath, '<missing>');
			const changed = await runCli(projectPath, args);
			const report = JSON.parse(changed.stdout);
			assert.equal(changed.status, 1, `verification should rerun after existence changes; reason=${report.results[0].reason}`);
			assert.equal(report.results[0].status, 'failed');
			assert.notEqual(report.results[0].reason, 'reused_input_hash');
		} finally {
			removeTempProject(projectPath);
		}
	});
}

for (const initiallyDirectory of [true, false]) {
	test(`preserves verification results when input is a directory ${initiallyDirectory ? 'before' : 'after'} execution`, async () => {
		const projectPath = createTempProject();
		try {
			await initProject(projectPath);
			const inputPath = path.join(projectPath, 'input.md');
			if (initiallyDirectory) mkdirSync(inputPath);
			else writeFileSync(inputPath, 'input');
			writeFileSync(path.join(projectPath, 'classification.json'), JSON.stringify(createClassifyPlan(projectPath, 'input_change', 'input.md')));
			appendIntent(projectPath, `
[intents.verify_input]
status = "configured"
lifecycle = "oneshot"
run_policy = "agent_allowed"
description = "Verify an input that can be a directory."
argv = ['${process.execPath}', '-e', 'const fs = require("node:fs"); if (!fs.statSync("input.md").isDirectory()) { fs.unlinkSync("input.md"); fs.mkdirSync("input.md"); } console.log("verified directory");']
cwd = "."
timeout_seconds = 10
stdin = "closed"
success_exit_codes = [0]
writes = ["input.md"]
network = false
destructive = false
required_after = ["input_change"]
`);
			for (let run = 0; run < 2; run += 1) {
				const result = await runCli(projectPath, ['verify', '--from-classification', 'classification.json', '--json']);
				assert.equal(result.status, 0, result.stderr || result.stdout);
				const report = JSON.parse(result.stdout);
				assert.equal(report.results[0].status, 'passed');
				assert.notEqual(report.results[0].reason, 'reused_input_hash');
				assert.equal(report.results[0].receipt.current_state_hash, undefined);
				assert.ok(report.results[0].receipt_path);
			}
		} finally {
			removeTempProject(projectPath);
		}
	});
}

test('reruns cached verification when a declared prerequisite disappears', async () => {
	const projectPath = createTempProject();
	try {
		await initProject(projectPath);
		writeFileSync(path.join(projectPath, 'README.md'), 'unchanged input');
		writeFileSync(path.join(projectPath, 'required.txt'), 'required artifact');
		writeFileSync(path.join(projectPath, 'classification.json'), JSON.stringify(createClassifyPlan(projectPath, 'input_change')));
		appendIntent(projectPath, `
[intents.verify_input]
status = "configured"
lifecycle = "oneshot"
run_policy = "agent_allowed"
description = "Verify with a required artifact."
argv = ['${process.execPath}', '-e', 'require("node:fs").readFileSync("required.txt");']
cwd = "."
timeout_seconds = 10
stdin = "closed"
success_exit_codes = [0]
writes = []
preconditions = [{ kind = "path_exists", path = "required.txt" }]
network = false
destructive = false
required_after = ["input_change"]
`);
		const args = ['verify', '--from-classification', 'classification.json', '--json'];
		const first = await runCli(projectPath, args);
		assert.equal(first.status, 0, first.stderr || first.stdout);
		const unchanged = await runCli(projectPath, args);
		assert.equal(unchanged.status, 0, unchanged.stderr || unchanged.stdout);
		assert.equal(JSON.parse(unchanged.stdout).results[0].reason, 'reused_input_hash');
		rmSync(path.join(projectPath, 'required.txt'));
		const changed = await runCli(projectPath, args);
		const report = JSON.parse(changed.stdout);
		assert.equal(changed.status, 1, `missing prerequisite must rerun verification; reason=${report.results[0].reason}`);
		assert.equal(report.results[0].status, 'failed');
		assert.notEqual(report.results[0].reason, 'reused_input_hash');
	} finally {
		removeTempProject(projectPath);
	}
});

for (const corruption of ['checksum', 'status', 'intent']) {
	test(`reruns verification for inconsistent cached receipt ${corruption}`, async () => {
		const projectPath = createTempProject();
		try {
			await initProject(projectPath);
			writeFileSync(path.join(projectPath, 'README.md'), 'unchanged input');
			writeFileSync(path.join(projectPath, 'classification.json'), JSON.stringify(createClassifyPlan(projectPath, 'input_change')));
			appendIntent(projectPath, `
[intents.verify_input]
status = "configured"
lifecycle = "oneshot"
run_policy = "agent_allowed"
description = "Count actual verification runs."
argv = ['${process.execPath}', '-e', 'const fs = require("node:fs"); fs.appendFileSync("runs.txt", "run\\n");']
cwd = "."
timeout_seconds = 10
stdin = "closed"
success_exit_codes = [0]
writes = ["runs.txt"]
network = false
destructive = false
required_after = ["input_change"]
`);
			const args = ['verify', '--from-classification', 'classification.json', '--json'];
			const first = await runCli(projectPath, args);
			assert.equal(first.status, 0, first.stderr || first.stdout);
			const unchanged = await runCli(projectPath, args);
			assert.equal(unchanged.status, 0, unchanged.stderr || unchanged.stdout);
			const previous = JSON.parse(unchanged.stdout);
			assert.equal(previous.results[0].reason, 'reused_input_hash');
			const receiptPath = path.join(projectPath, previous.results[0].receipt_path);
			const receipt = JSON.parse(readFileSync(receiptPath, 'utf8'));
			if (corruption === 'status') receipt.status = 'failed';
			else if (corruption === 'intent') receipt.intent = 'different_intent';
			else receipt.finished_at = 'changed receipt contents';
			const content = `${JSON.stringify(receipt, null, 2)}\n`;
			writeFileSync(receiptPath, content);
			if (corruption !== 'checksum') {
				const manifestPath = path.join(projectPath, previous.manifest_path);
				const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
				manifest.receipts[0].receipt_sha256 = `sha256:${createHash('sha256').update(content).digest('hex')}`;
				writeFileSync(manifestPath, JSON.stringify(manifest));
			}
			const result = await runCli(projectPath, args);
			assert.equal(result.status, 0, result.stderr || result.stdout);
			assert.notEqual(JSON.parse(result.stdout).results[0].reason, 'reused_input_hash');
			assert.equal(readFileSync(path.join(projectPath, 'runs.txt'), 'utf8'), 'run\nrun\n');
		} finally {
			removeTempProject(projectPath);
		}
	});
}

test('documents from-plan as a deprecated classification-report alias', async () => {
	const result = await runCli(projectRoot, ['verify', '--help']);

	assert.equal(result.status, 0, result.stderr || result.stdout);
	assert.match(result.stdout, /--from-classification <path>/);
	assert.match(
		result.stdout,
		/--from-plan <path>\s+Deprecated compatibility alias for --from-classification; it still expects an mf classify report/,
	);
});

test('preserves classification details in plan-only verify output from a classify report alias', async () => {
	const projectPath = createTempProject();

	try {
		await initProject(projectPath);
		appendIntent(
			projectPath,
			`
[intents.verify_docs_plan]
status = "configured"
lifecycle = "oneshot"
run_policy = "agent_allowed"
description = "Verify docs plan."
argv = ['${process.execPath}', '-e', 'console.log("docs")']
cwd = "."
timeout_seconds = 10
stdin = "closed"
success_exit_codes = [0]
writes = []
network = false
destructive = false
required_after = ["docs_change"]
`,
		);
		writeFileSync(
			path.join(projectPath, 'verify-plan.json'),
			JSON.stringify(createClassifyPlan(projectPath, 'docs_change'), null, 2),
		);

		const indexResult = await runCli(projectPath, ['index', '--json']);
		const result = await runCli(projectPath, ['verify', '--from-plan', 'verify-plan.json', '--plan-only', '--json']);
		const report = JSON.parse(result.stdout);

		assert.equal(indexResult.status, 0, indexResult.stderr || indexResult.stdout);
		assert.equal(result.status, 0, result.stderr || result.stdout);
		assert.deepEqual(report.files, ['README.md']);
		assert.deepEqual(report.requirements[0].files, ['README.md']);
		assert.deepEqual(report.requirements[0].surfaces, ['readme_page']);
		assert.deepEqual(report.requirements[0].affectedContracts, ['public documentation']);
		assert.deepEqual(report.requirements[0].driftChecks, ['command examples']);
		assert.deepEqual(report.requirements[0].updatePolicies, ['update']);
		assert.equal(report.requirements[0].surfaceReadModels[0].status, 'fresh');
		assert.equal(report.requirements[0].surfaceReadModels[0].match.ruleId, 'readme_page');
		assert.deepEqual(report.requirements[0].surfaceReadModels[0].match.surface.validationReasons, [
			'docs_change',
			'copy_change',
		]);
		assert.equal(
			report.candidates.some((candidate) => candidate.intent === 'verify_docs_plan' && candidate.status === 'runnable'),
			true,
		);
	} finally {
		removeTempProject(projectPath);
	}
});

test('runs verification intents selected from a classify report alias', async () => {
	const projectPath = createTempProject();

	try {
		await initProject(projectPath);
		appendIntent(
			projectPath,
			`
[intents.verify_from_plan]
status = "configured"
lifecycle = "oneshot"
run_policy = "agent_allowed"
description = "Print a verify from plan message."
argv = ['${process.execPath}', '-e', 'console.log("verify from plan")']
cwd = "."
timeout_seconds = 10
stdin = "closed"
success_exit_codes = [0]
writes = []
network = false
destructive = false
required_after = ["schema_verify"]
`,
		);
		writeFileSync(
			path.join(projectPath, 'verify-plan.json'),
			JSON.stringify(createClassifyPlan(projectPath, 'schema_verify', 'schemas/classify-report.schema.json'), null, 2),
		);

		const result = await runCli(projectPath, ['verify', '--from-plan', 'verify-plan.json', '--json']);
		const report = JSON.parse(result.stdout);

		assert.equal(result.status, 0, result.stderr || result.stdout);
		assert.equal(report.reason, 'schema_verify');
		assert.deepEqual(report.reasons, ['schema_verify']);
		assert.equal(report.plan_source, 'verify-plan.json');
		assert.equal(report.status, 'passed');
		assert.equal(report.summary.ran, 1);
		assert.equal(report.results[0].intent, 'verify_from_plan');
	} finally {
		removeTempProject(projectPath);
	}
});

test('rejects verify plan-only reports passed through the deprecated from-plan alias', async () => {
	const projectPath = createTempProject();

	try {
		await initProject(projectPath);

		const planOnlyResult = await runCli(projectPath, ['verify', '--reason', 'schema_verify', '--plan-only', '--json']);
		assert.equal(planOnlyResult.status, 0, planOnlyResult.stderr || planOnlyResult.stdout);

		writeFileSync(path.join(projectPath, 'verify-plan-output.json'), planOnlyResult.stdout);

		const result = await runCli(projectPath, ['verify', '--from-plan', 'verify-plan-output.json', '--json']);

		assert.equal(result.status, 1);
		assert.match(result.stderr, /Verification input must be an mf classify report/);
		assert.match(result.stderr, /Usage: mf verify/);
	} finally {
		removeTempProject(projectPath);
	}
});

test('rejects loose classification report inputs that are not classify output', async () => {
	const projectPath = createTempProject();

	try {
		await initProject(projectPath);
		writeFileSync(
			path.join(projectPath, 'verify-plan.json'),
			JSON.stringify({ classification_summary: { validationReasons: ['schema_verify'] } }, null, 2),
		);

		const result = await runCli(projectPath, ['verify', '--from-plan', 'verify-plan.json', '--json']);

		assert.equal(result.status, 1);
		assert.match(result.stderr, /Verification input must be an mf classify report/);
		assert.match(result.stderr, /Usage: mf verify/);
	} finally {
		removeTempProject(projectPath);
	}
});

test('rejects classify plans from a different mustflow root', async () => {
	const projectPath = createTempProject();

	try {
		await initProject(projectPath);
		writeFileSync(
			path.join(projectPath, 'verify-plan.json'),
			JSON.stringify({ ...createClassifyPlan(projectPath, 'schema_verify'), mustflow_root: path.join(projectPath, 'other') }, null, 2),
		);

		const result = await runCli(projectPath, ['verify', '--from-plan', 'verify-plan.json', '--json']);

		assert.equal(result.status, 1);
		assert.match(result.stderr, /Classification report must come from this mustflow root/);
		assert.match(result.stderr, /Usage: mf verify/);
	} finally {
		removeTempProject(projectPath);
	}
});

test('rejects conflicting verify reason inputs', async () => {
	const projectPath = createTempProject();

	try {
		await initProject(projectPath);
		writeFileSync(path.join(projectPath, 'verify-plan.json'), JSON.stringify({ reasons: ['schema_verify'] }));

		const result = await runCli(projectPath, ['verify', '--reason', 'schema_verify', '--from-plan', 'verify-plan.json']);

		assert.equal(result.status, 1);
		assert.match(result.stderr, /Use only one of --reason, --from-classification, --from-plan, or --changed/);
		assert.match(result.stderr, /Usage: mf verify/);

		const changedResult = await runCli(projectPath, ['verify', '--changed', '--reason', 'schema_verify', '--json']);

		assert.equal(changedResult.status, 1);
		assert.match(changedResult.stderr, /Use only one of --reason, --from-classification, --from-plan, or --changed/);
		assert.match(changedResult.stderr, /Usage: mf verify/);
	} finally {
		removeTempProject(projectPath);
	}
});

test('rejects verify write-plan without changed mode', async () => {
	const projectPath = createTempProject();

	try {
		await initProject(projectPath);

		const result = await runCli(projectPath, ['verify', '--reason', 'schema_verify', '--write-plan', 'change-plan.json', '--json']);

		assert.equal(result.status, 1);
		assert.match(result.stderr, /--write-plan requires --changed/);
		assert.match(result.stderr, /Usage: mf verify/);
	} finally {
		removeTempProject(projectPath);
	}
});

test('fails changed verify when git status cannot be read', async () => {
	const projectPath = createTempProject();

	try {
		await initProject(projectPath);

		const result = await runCli(projectPath, ['verify', '--changed', '--json']);

		assert.equal(result.status, 1);
		assert.match(result.stderr, /Unable to inspect changed files with git status/);
		assert.match(result.stderr, /Usage: mf verify/);
	} finally {
		removeTempProject(projectPath);
	}
});

test('rejects changed verify plan writes outside the mustflow root', async () => {
	const projectPath = createTempProject();

	try {
		await initProject(projectPath);

		const result = await runCli(projectPath, ['verify', '--changed', '--write-plan', '../change-plan.json', '--json']);

		assert.equal(result.status, 1);
		assert.match(result.stderr, /Classification report path must stay inside the mustflow root/);
	} finally {
		removeTempProject(projectPath);
	}
});

test('fails verify when reason is missing', async () => {
	const result = await runCli(projectRoot, ['verify', '--json']);

	assert.equal(result.status, 1);
	assert.match(result.stderr, /Missing verification reason/);
	assert.match(result.stderr, /Usage: mf verify/);
});

test('rejects verify plans outside the mustflow root', async () => {
	const projectPath = createTempProject();
	const outsidePlanPath = path.join(tmpdir(), `mustflow-outside-plan-${Date.now()}.json`);

	try {
		await initProject(projectPath);
		writeFileSync(outsidePlanPath, JSON.stringify({ reasons: ['schema_verify'] }));

		const result = await runCli(projectPath, ['verify', '--from-plan', outsidePlanPath]);

		assert.equal(result.status, 1);
		assert.match(result.stderr, /Classification report path must stay inside the mustflow root/);
	} finally {
		rmSync(outsidePlanPath, { force: true });
		removeTempProject(projectPath);
	}
});

test('rejects verify external inputs that resolve through symlinks', async (t) => {
	const projectPath = createTempProject();
	const outsideRoot = mkdtempSync(path.join(tmpdir(), 'mustflow-linked-verify-inputs-'));

	try {
		await initProject(projectPath);
		writeFileSync(path.join(outsideRoot, 'classification.json'), JSON.stringify(createClassifyPlan(projectPath, 'schema_verify')));
		writeFileSync(
			path.join(outsideRoot, 'repro-evidence.json'),
			JSON.stringify({
				schema_version: '1',
				command: 'repro-evidence',
			}),
		);
		writeFileSync(
			path.join(outsideRoot, 'external-evidence.json'),
			JSON.stringify({
				schema_version: '1',
				command: 'external-evidence',
				checks: [],
			}),
		);

		const symlinks = [
			['classification-link.json', 'classification.json'],
			['repro-evidence-link.json', 'repro-evidence.json'],
			['external-evidence-link.json', 'external-evidence.json'],
		];

		for (const [linkName, targetName] of symlinks) {
			if (!tryFileSymlink(path.join(outsideRoot, targetName), path.join(projectPath, linkName))) {
				t.skip('file symlinks are not available in this environment');
				return;
			}
		}

		const classificationResult = await runCli(projectPath, [
			'verify',
			'--from-classification',
			'classification-link.json',
			'--json',
		]);
		const deprecatedAliasResult = await runCli(projectPath, ['verify', '--from-plan', 'classification-link.json', '--json']);
		const reproResult = await runCli(projectPath, [
			'verify',
			'--reason',
			'bug_fix',
			'--repro-evidence',
			'repro-evidence-link.json',
			'--json',
		]);
		const externalResult = await runCli(projectPath, [
			'verify',
			'--reason',
			'external_ci_change',
			'--external-evidence',
			'external-evidence-link.json',
			'--json',
		]);

		for (const result of [classificationResult, deprecatedAliasResult, reproResult, externalResult]) {
			assert.equal(result.status, 1);
			assert.match(result.stderr, /Input file path must not contain symlinks/);
			assert.match(result.stderr, /Usage: mf verify/);
		}
	} finally {
		rmSync(outsideRoot, { recursive: true, force: true });
		removeTempProject(projectPath);
	}
});
