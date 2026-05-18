import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

const projectRoot = path.resolve(fileURLToPath(new URL('../..', import.meta.url)));
const cliPath = path.join(projectRoot, 'dist', 'cli', 'index.js');

function createTempProject() {
	return mkdtempSync(path.join(tmpdir(), 'mustflow-contract-lint-'));
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

function initProject(projectPath) {
	const result = runCli(projectPath, ['init', '--yes']);
	assert.equal(result.status, 0, result.stderr || result.stdout);
}

function commandsPath(projectPath) {
	return path.join(projectPath, '.mustflow', 'config', 'commands.toml');
}

function writeCommands(projectPath, text) {
	writeFileSync(commandsPath(projectPath), `${text.trim()}\n`);
}

function runnableIntent(name, reasons, extra = '') {
	return `
[intents.${name}]
status = "configured"
lifecycle = "oneshot"
run_policy = "agent_allowed"
description = "Coverage test intent."
argv = ['${process.execPath}', '-e', 'console.log("ok")']
cwd = "."
timeout_seconds = 10
stdin = "closed"
success_exit_codes = [0]
writes = []
network = false
destructive = false
required_after = [${reasons.map((reason) => `"${reason}"`).join(', ')}]
${extra}
`;
}

function manualOnlyIntent(name, reasons) {
	return `
[intents.${name}]
status = "manual_only"
description = "Manual coverage test intent."
required_after = [${reasons.map((reason) => `"${reason}"`).join(', ')}]
`;
}

function cleanCoverageCommands(options = {}) {
	const implementationReasons = [
		...(options.includeCodeChange === false ? [] : ['code_change']),
		'copy_change',
		'docs_change',
		'i18n_change',
		'mustflow_config_change',
		'mustflow_docs_change',
		'public_api_change',
		'test_change',
		'unknown_change',
	];
	const releaseReasons = ['package_metadata_change', 'packaging_change', 'release_risk', 'template_version_change'];

	return [
		runnableIntent('test_related', implementationReasons),
		runnableIntent('test_release', releaseReasons),
		options.extra ?? '',
	].join('\n');
}

test('contract-lint reports command contract warnings without failing', () => {
	const projectPath = createTempProject();

	try {
		initProject(projectPath);

		const result = runCli(projectPath, ['contract-lint', '--json']);
		const report = JSON.parse(result.stdout);

		assert.equal(result.status, 0, result.stderr || result.stdout);
		assert.equal(report.schema_version, '1');
		assert.equal(report.command, 'contract-lint');
		assert.equal(report.report.status, 'warning');
		assert.equal(report.report.summary.errors, 0);
		assert.ok(report.report.summary.unknown > 0);
		assert.ok(report.report.issues.some((issue) => issue.code === 'intent_unknown'));
	} finally {
		removeTempProject(projectPath);
	}
});

test('contract-lint warns when a package script referenced by an intent is missing', () => {
	const projectPath = createTempProject();

	try {
		initProject(projectPath);
		writeFileSync(
			path.join(projectPath, 'package.json'),
			`${JSON.stringify({ name: 'example', version: '1.0.0', scripts: { test: 'node --version' } }, null, 2)}\n`,
		);
		mkdirSync(path.join(projectPath, 'docs-site'), { recursive: true });
		writeFileSync(
			path.join(projectPath, 'docs-site', 'package.json'),
			`${JSON.stringify({ name: 'docs-site', scripts: { check: 'node --version' } }, null, 2)}\n`,
		);
		writeCommands(
			projectPath,
			[
				`
[intents.root_existing_script]
status = "configured"
lifecycle = "oneshot"
run_policy = "agent_allowed"
description = "Run an existing root package script."
argv = ["bun", "run", "test"]
cwd = "."
timeout_seconds = 10
stdin = "closed"
success_exit_codes = [0]
writes = []
network = false
destructive = false
required_after = ["code_change"]
`,
				`
[intents.root_missing_script]
status = "configured"
lifecycle = "oneshot"
run_policy = "agent_allowed"
description = "Run a missing root package script."
argv = ["bun", "run", "missing"]
cwd = "."
timeout_seconds = 10
stdin = "closed"
success_exit_codes = [0]
writes = []
network = false
destructive = false
required_after = ["code_change"]
`,
				`
[intents.nested_existing_script]
status = "configured"
lifecycle = "oneshot"
run_policy = "agent_allowed"
description = "Run an existing nested package script."
argv = ["bun", "run", "check"]
cwd = "docs-site"
timeout_seconds = 10
stdin = "closed"
success_exit_codes = [0]
writes = []
network = false
destructive = false
required_after = ["docs_change"]
`,
			].join('\n'),
		);

		const result = runCli(projectPath, ['contract-lint', '--json']);
		const report = JSON.parse(result.stdout);

		assert.equal(result.status, 0, result.stderr || result.stdout);
		assert.equal(report.report.status, 'warning');
		assert.ok(
			report.report.issues.some(
				(issue) =>
					issue.code === 'referenced_package_script_missing' &&
					issue.intent === 'root_missing_script' &&
					issue.message ===
						'Intent root_missing_script references package script "missing" in package.json, but that script is not declared.',
			),
		);
		assert.ok(
			!report.report.issues.some(
				(issue) =>
					issue.code === 'referenced_package_script_missing' &&
					(issue.intent === 'root_existing_script' || issue.intent === 'nested_existing_script'),
			),
		);
	} finally {
		removeTempProject(projectPath);
	}
});

test('contract-lint suggests non-runnable intent snippets from existing command files', () => {
	const projectPath = createTempProject();

	try {
		initProject(projectPath);
		writeFileSync(
			path.join(projectPath, 'package.json'),
			`${JSON.stringify({ name: 'example', version: '1.0.0', scripts: { test: 'node --test' } }, null, 2)}\n`,
		);
		writeFileSync(path.join(projectPath, 'Makefile'), 'build:\n\t@echo build\n');
		writeFileSync(path.join(projectPath, 'justfile'), 'lint:\n\tnode --check index.js\n');

		const result = runCli(projectPath, ['contract-lint', '--suggest', '--json']);
		const report = JSON.parse(result.stdout);
		const suggestions = report.report.suggestions;

		assert.equal(result.status, 0, result.stderr || result.stdout);
		assert.ok(Array.isArray(suggestions));
		assert.deepEqual(
			suggestions.map((suggestion) => `${suggestion.sourceKind}:${suggestion.sourceName}`).sort(),
			['just_recipe:lint', 'make_target:build', 'package_script:test'],
		);

		for (const suggestion of suggestions) {
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

test('contract-lint suggestion text output includes review-only snippets', () => {
	const projectPath = createTempProject();

	try {
		initProject(projectPath);
		writeFileSync(
			path.join(projectPath, 'package.json'),
			`${JSON.stringify({ name: 'example', scripts: { test: 'node --test' } }, null, 2)}\n`,
		);

		const result = runCli(projectPath, ['contract-lint', '--suggest']);

		assert.equal(result.status, 0, result.stderr || result.stdout);
		assert.match(result.stdout, /Suggestions/);
		assert.match(result.stdout, /\[intents\.suggest_package_test\]/);
		assert.match(result.stdout, /status = "unknown"/);
		assert.doesNotMatch(result.stdout, /^  argv\s*=/mu);
	} finally {
		removeTempProject(projectPath);
	}
});

test('contract-lint coverage reports clean required_after coverage', () => {
	const projectPath = createTempProject();

	try {
		initProject(projectPath);
		writeCommands(projectPath, cleanCoverageCommands());

		const result = runCli(projectPath, ['contract-lint', '--coverage', '--json']);
		const report = JSON.parse(result.stdout);

		assert.equal(result.status, 0, result.stderr || result.stdout);
		assert.equal(report.report.status, 'passed');
		assert.deepEqual(report.report.issues, []);
		assert.ok(report.report.coverage.knownClassificationReasons.includes('code_change'));
		assert.ok(report.report.coverage.requiredAfterReasons.includes('code_change'));
		const codeChangeCoverage = report.report.coverage.matrix.find((entry) => entry.reason === 'code_change');
		assert.ok(codeChangeCoverage);
		assert.equal(codeChangeCoverage.source, 'classification');
		assert.deepEqual(
			codeChangeCoverage.intents.map((intent) => `${intent.intent}:${intent.status}`),
			['test_related:ok'],
		);
		assert.deepEqual(codeChangeCoverage.gaps, []);
		assert.ok(codeChangeCoverage.relatedDocs.includes('.mustflow/config/commands.toml'));
		assert.ok(codeChangeCoverage.relatedDocs.includes('src/core/change-classification.ts'));
		assert.ok(codeChangeCoverage.relatedDocs.includes('.mustflow/skills/INDEX.md'));
		assert.ok(codeChangeCoverage.relatedSkills.some((skillPath) => skillPath.endsWith('/test-maintenance/SKILL.md')));
		assert.deepEqual(report.report.coverage.findings, []);
	} finally {
		removeTempProject(projectPath);
	}
});

test('contract-lint coverage warns for uncovered classification reasons', () => {
	const projectPath = createTempProject();

	try {
		initProject(projectPath);
		writeCommands(projectPath, cleanCoverageCommands({ includeCodeChange: false }));

		const result = runCli(projectPath, ['contract-lint', '--coverage', '--json']);
		const report = JSON.parse(result.stdout);

		assert.equal(result.status, 0, result.stderr || result.stdout);
		assert.equal(report.report.status, 'warning');
		assert.ok(
			report.report.coverage.findings.some(
				(finding) =>
					finding.code === 'coverage_uncovered_classification_reason' && finding.reason === 'code_change',
			),
		);
		assert.ok(
			report.report.issues.some(
				(issue) => issue.code === 'coverage_uncovered_classification_reason' && issue.severity === 'warning',
			),
		);
	} finally {
		removeTempProject(projectPath);
	}
});

test('contract-lint coverage warns for unknown required_after reasons', () => {
	const projectPath = createTempProject();

	try {
		initProject(projectPath);
		writeCommands(
			projectPath,
			cleanCoverageCommands({
				extra: runnableIntent('custom_unknown_reason', ['typo_change_reason']),
			}),
		);

		const result = runCli(projectPath, ['contract-lint', '--coverage', '--json']);
		const report = JSON.parse(result.stdout);

		assert.equal(result.status, 0, result.stderr || result.stdout);
		assert.ok(
			report.report.coverage.findings.some(
				(finding) =>
					finding.code === 'coverage_unknown_required_after' &&
					finding.reason === 'typo_change_reason' &&
					finding.intents.includes('custom_unknown_reason'),
			),
		);
		const unknownReasonCoverage = report.report.coverage.matrix.find(
			(entry) => entry.reason === 'typo_change_reason',
		);
		assert.ok(unknownReasonCoverage);
		assert.equal(unknownReasonCoverage.source, 'required_after');
		assert.ok(unknownReasonCoverage.gaps.includes('unknown_reason'));
	} finally {
		removeTempProject(projectPath);
	}
});

test('contract-lint coverage warns when a classification reason is not runnable', () => {
	const projectPath = createTempProject();

	try {
		initProject(projectPath);
		writeCommands(
			projectPath,
			cleanCoverageCommands({
				includeCodeChange: false,
				extra: manualOnlyIntent('manual_code_change', ['code_change']),
			}),
		);

		const result = runCli(projectPath, ['contract-lint', '--coverage', '--json']);
		const report = JSON.parse(result.stdout);

		assert.equal(result.status, 0, result.stderr || result.stdout);
		assert.ok(
			report.report.coverage.findings.some(
				(finding) =>
					finding.code === 'coverage_reason_not_runnable' &&
					finding.reason === 'code_change' &&
					finding.intents.includes('manual_code_change'),
			),
		);
		const codeChangeCoverage = report.report.coverage.matrix.find((entry) => entry.reason === 'code_change');
		assert.ok(codeChangeCoverage);
		assert.deepEqual(
			codeChangeCoverage.intents.map((intent) => `${intent.intent}:${intent.status}`),
			['manual_code_change:status_not_configured'],
		);
		assert.ok(codeChangeCoverage.gaps.includes('no_runnable_intent'));
	} finally {
		removeTempProject(projectPath);
	}
});

test('contract-lint coverage warns for same-reason writers without explicit effects', () => {
	const projectPath = createTempProject();

	try {
		initProject(projectPath);
		writeCommands(
			projectPath,
			cleanCoverageCommands({
				includeCodeChange: false,
				extra: [
					`
[intents.writer_a]
status = "configured"
lifecycle = "oneshot"
run_policy = "agent_allowed"
description = "Coverage writer A."
argv = ['${process.execPath}', '-e', 'console.log("a")']
cwd = "."
timeout_seconds = 10
stdin = "closed"
success_exit_codes = [0]
writes = ["dist/"]
network = false
destructive = false
required_after = ["code_change"]
`,
					`
[intents.writer_b]
status = "configured"
lifecycle = "oneshot"
run_policy = "agent_allowed"
description = "Coverage writer B."
argv = ['${process.execPath}', '-e', 'console.log("b")']
cwd = "."
timeout_seconds = 10
stdin = "closed"
success_exit_codes = [0]
writes = ["dist/"]
network = false
destructive = false
required_after = ["code_change"]
`,
				].join('\n'),
			}),
		);

		const result = runCli(projectPath, ['contract-lint', '--coverage', '--json']);
		const report = JSON.parse(result.stdout);

		assert.equal(result.status, 0, result.stderr || result.stdout);
		assert.ok(
			report.report.coverage.findings.some(
				(finding) =>
					finding.code === 'coverage_conflicting_writes_without_effects' &&
					finding.reason === 'code_change' &&
					finding.intents.includes('writer_a') &&
					finding.intents.includes('writer_b'),
			),
		);
	} finally {
		removeTempProject(projectPath);
	}
});

test('contract-lint coverage text output stays concise', () => {
	const projectPath = createTempProject();

	try {
		initProject(projectPath);
		writeCommands(projectPath, cleanCoverageCommands({ includeCodeChange: false }));

		const result = runCli(projectPath, ['contract-lint', '--coverage']);

		assert.equal(result.status, 0, result.stderr || result.stdout);
		assert.match(result.stdout, /Coverage/);
		assert.match(result.stdout, /Coverage findings: 1/);
		assert.match(result.stdout, /Classification reason "code_change"/);
	} finally {
		removeTempProject(projectPath);
	}
});

test('contract-lint fails malformed configured command intents', () => {
	const projectPath = createTempProject();

	try {
		initProject(projectPath);
		const current = readFileSync(commandsPath(projectPath), 'utf8');
		writeFileSync(
			commandsPath(projectPath),
			`${current}

[intents.bad_contract]
status = "configured"
description = "Malformed test intent."
`,
		);

		const result = runCli(projectPath, ['contract-lint', '--json']);
		const report = JSON.parse(result.stdout);

		assert.equal(result.status, 1);
		assert.equal(report.report.status, 'failed');
		assert.ok(report.report.summary.errors > 0);
		assert.ok(report.report.issues.some((issue) => issue.intent === 'bad_contract' && issue.severity === 'error'));
	} finally {
		removeTempProject(projectPath);
	}
});

test('contract-lint rejects shell commands with background patterns', () => {
	const projectPath = createTempProject();

	try {
		initProject(projectPath);
		const current = readFileSync(commandsPath(projectPath), 'utf8');
		writeFileSync(
			commandsPath(projectPath),
			`${current}

[intents.shell_bg]
status = "configured"
lifecycle = "oneshot"
run_policy = "agent_allowed"
description = "Blocked shell intent."
mode = "shell"
cmd = "nohup sh -c 'sleep 60' >/dev/null 2>&1 &"
timeout_seconds = 30
stdin = "closed"
`,
		);

		const result = runCli(projectPath, ['contract-lint', '--json']);
		const report = JSON.parse(result.stdout);

		assert.equal(result.status, 1);
		assert.equal(report.report.status, 'failed');
		assert.ok(
			report.report.issues.some(
				(issue) =>
					issue.intent === 'shell_bg' &&
					issue.severity === 'error' &&
					issue.code === 'shell_background_pattern',
			),
		);
	} finally {
		removeTempProject(projectPath);
	}
});

test('contract-lint rejects argv commands with long-running patterns', () => {
	const projectPath = createTempProject();

	try {
		initProject(projectPath);
		const current = readFileSync(commandsPath(projectPath), 'utf8');
		writeFileSync(
			commandsPath(projectPath),
			`${current}

[intents.argv_dev_server]
status = "configured"
lifecycle = "oneshot"
run_policy = "agent_allowed"
description = "Blocked argv intent."
argv = ["npm", "run", "dev"]
cwd = "."
timeout_seconds = 30
stdin = "closed"
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
timeout_seconds = 30
stdin = "closed"
writes = []
network = false
destructive = false
`,
		);

		const result = runCli(projectPath, ['contract-lint', '--json']);
		const report = JSON.parse(result.stdout);

		assert.equal(result.status, 1);
		assert.equal(report.report.status, 'failed');
		assert.ok(
			report.report.issues.some(
				(issue) =>
					issue.intent === 'argv_dev_server' &&
					issue.severity === 'error' &&
					issue.code === 'long_running_command_pattern',
			),
		);
		assert.equal(
			report.report.issues.some((issue) => issue.intent === 'argv_safe_exec' && issue.code === 'long_running_command_pattern'),
			false,
		);
	} finally {
		removeTempProject(projectPath);
	}
});

test('contract-lint rejects unsafe intent names', () => {
	const projectPath = createTempProject();

	try {
		initProject(projectPath);
		const current = readFileSync(commandsPath(projectPath), 'utf8');
		writeFileSync(
			commandsPath(projectPath),
			`${current}

[intents."safe_name; echo injected #"]
status = "configured"
lifecycle = "oneshot"
run_policy = "agent_allowed"
description = "Unsafe names must not become runnable."
argv = ['${process.execPath}', '-e', 'console.log("ok")']
cwd = "."
timeout_seconds = 10
stdin = "closed"
success_exit_codes = [0]
writes = []
network = false
destructive = false
`,
		);

		const result = runCli(projectPath, ['contract-lint', '--json']);
		const report = JSON.parse(result.stdout);

		assert.equal(result.status, 1);
		assert.equal(report.report.status, 'failed');
		assert.ok(
			report.report.issues.some(
				(issue) =>
					issue.intent === 'safe_name; echo injected #' &&
					issue.severity === 'error' &&
					issue.code === 'unsafe_intent_name',
			),
		);
	} finally {
		removeTempProject(projectPath);
	}
});
