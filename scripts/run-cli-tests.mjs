import { spawn, spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import { performance } from 'node:perf_hooks';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const testRunnerLockRoot = path.join(os.tmpdir(), 'mustflow-test-runner-locks');
const testRunnerLockOwnerFile = 'owner.json';
const millisecondsPerSecond = 1000;
const secondsPerMinute = 60;
const minutesPerHour = 60;
const staleLockHours = 6;
const staleLockMs = staleLockHours * minutesPerHour * secondsPerMinute * millisecondsPerSecond;
const testsRoot = path.join(repoRoot, 'tests', 'cli');
const distCliEntrypoint = path.join(repoRoot, 'dist', 'cli', 'index.js');
const allCliTests = readdirSync(testsRoot)
	.filter((name) => name.endsWith('.test.js'))
	.sort((left, right) => left.localeCompare(right));

const checkTests = [
	'check.test.js',
	'check-command-contracts.test.js',
	'check-config-validation.test.js',
	'check-doc-authority.test.js',
	'check-skill-contracts.test.js',
	'check-source-anchors.test.js',
	'check-versioning.test.js',
];

const explainTests = [
	'explain-authority.test.js',
	'explain-command.test.js',
	'explain-retention-asset.test.js',
	'explain-skills.test.js',
	'explain-source-anchor.test.js',
	'explain-surface.test.js',
	'explain-verify.test.js',
];

const localIndexTests = [
	'index-dry-run.test.js',
	'index-workflow.test.js',
	'index-verification-evidence.test.js',
	'index-source-anchors.test.js',
	'search.test.js',
	'search-backends.test.js',
	'search-index-state.test.js',
	'search-output.test.js',
	'search-source-scope.test.js',
];

const indexTests = ['index-workflow.test.js', 'index-verification-evidence.test.js', 'index-source-anchors.test.js'];
const versioningTests = ['check-versioning.test.js', 'version-sources.test.js'];
const runTests = [
	'run-execution.test.js',
	'run-preview.test.js',
	'run-receipts.test.js',
	'run-safety.test.js',
];
const dashboardTests = [
	'dashboard-preferences.test.js',
	'dashboard-rendering.test.js',
	'dashboard-safety.test.js',
	'dashboard-verification.test.js',
];
const commandContractTests = ['check-command-contracts.test.js', ...runTests];
const sourceAnchorTests = [
	'check-source-anchors.test.js',
	'explain-source-anchor.test.js',
	'index-source-anchors.test.js',
	'search-source-scope.test.js',
];
const schemaSmokeTests = ['schema.test.js', 'schema-command-contracts.test.js', 'schema-explain-verify-output.test.js'];
const codeOutlineContractTests = ['text-budget.test.js', ...schemaSmokeTests];
const routerSmokeTests = ['router.test.js'];
const verifyTests = [
	'verify.test.js',
	'verify-inputs.test.js',
	'verify-changed.test.js',
	'verify-completion-verdict.test.js',
	'verify-plan-scheduler.test.js',
];

const fastCommandSurfaceTests = [
	'adapters.test.js',
	'classify.test.js',
	'evidence.test.js',
	'impact.test.js',
	'handoff.test.js',
	'next.test.js',
	'onboard.test.js',
	'router.test.js',
	'status.test.js',
	'version-sources.test.js',
	'workspace.test.js',
];

const fastWorkflowContractTests = [
	'docs.test.js',
	'authoring-fixtures.test.js',
	'authoring-skill-contracts.test.js',
	'i18n-architecture.test.js',
	'pages-workflow.test.js',
];

const fastHarnessSafetyTests = [
	'index-dry-run.test.js',
	...indexTests,
	'security-fuzz.test.js',
	'test-audit.test.js',
	'test-selection.test.js',
];

const fastTests = [...fastCommandSurfaceTests, ...fastWorkflowContractTests, ...fastHarnessSafetyTests];

const releaseTests = ['package.test.js', 'package-template.test.js'];
const cliTests = allCliTests.filter((name) => !releaseTests.includes(name));
const coverageTests = fastTests;
const scheduler = process.env.MUSTFLOW_TEST_SCHEDULER ?? 'default';
const defaultSchedulerResourceTokens = {
	io: '16',
	process: '16',
	sqlite: '4',
	git: '2',
};
const inProcessCliTests = new Set(['check.test.js', 'contract-lint.test.js', 'next.test.js', 'onboard.test.js', ...verifyTests]);
const envSensitiveInProcessCliTests = new Set(['verify-plan-scheduler.test.js']);

const commandTestNames = new Set(allCliTests);
const commandRelatedTests = new Map([
	['adapters', ['adapters.test.js', ...schemaSmokeTests]],
	['check', [...checkTests, ...schemaSmokeTests]],
	['classify', ['classify.test.js', ...schemaSmokeTests]],
	['context', ['context.test.js', ...schemaSmokeTests]],
	['contract-lint', ['contract-lint.test.js', ...schemaSmokeTests]],
	['dashboard', [...dashboardTests, ...schemaSmokeTests]],
	['docs', ['docs.test.js']],
	['doctor', ['doctor.test.js', ...schemaSmokeTests]],
	['explain', explainTests],
	['explain-verify', ['explain-verify.test.js', ...schemaSmokeTests]],
	['handoff', ['handoff.test.js', ...schemaSmokeTests]],
	['help', [...routerSmokeTests]],
	['impact', ['impact.test.js', ...schemaSmokeTests]],
	['index', ['index-dry-run.test.js', ...indexTests]],
	['init', ['init.test.js', 'init-default-template.test.js', 'workflow.test.js']],
	['line-endings', ['line-endings.test.js', ...schemaSmokeTests]],
	['map', ['map.test.js', 'workflow.test.js']],
	['next', ['next.test.js', ...schemaSmokeTests]],
	['evidence', ['evidence.test.js', ...schemaSmokeTests]],
	['onboard', ['onboard.test.js', 'contract-lint.test.js', ...schemaSmokeTests]],
	['workspace', ['workspace.test.js', ...schemaSmokeTests]],
	['run', [...runTests, ...schemaSmokeTests]],
	['search', ['search.test.js', 'search-backends.test.js', 'search-index-state.test.js', 'search-output.test.js', 'search-source-scope.test.js']],
	['status', ['status.test.js']],
	['update', ['update.test.js']],
	['upgrade', ['upgrade.test.js', 'update.test.js', ...routerSmokeTests]],
	['verify', [...verifyTests, 'explain-verify.test.js', ...schemaSmokeTests]],
	['version', [...routerSmokeTests]],
	['version-sources', ['version-sources.test.js', ...schemaSmokeTests]],
]);

const relatedRules = [
	{ match: /^schemas\//u, tests: schemaSmokeTests },
	{ match: /^templates\//u, tests: ['init.test.js', 'init-default-template.test.js', 'update.test.js'] },
	{ match: /^tests\/fixtures\/authoring\//u, tests: ['authoring-fixtures.test.js'] },
	{ match: /^\.mustflow\/skills\//u, tests: ['authoring-skill-contracts.test.js'] },
	{ match: /^\.mustflow\/skills\/(readme-authoring|project-context-authoring)\//u, tests: ['authoring-fixtures.test.js'] },
	{ match: /^scripts\/run-cli-tests\.mjs$/u, tests: ['test-selection.test.js'] },
	{ match: /^src\/cli\/index\.ts$/u, tests: ['router.test.js', 'workflow.test.js'] },
	{ match: /^src\/cli\/i18n\//u, tests: ['i18n-architecture.test.js', 'router.test.js', ...dashboardTests] },
	{
		match: /^src\/cli\/commands\/([^/]+)\.ts$/u,
		testsForMatch: ([, command]) => commandRelatedTests.get(command) ?? [`${command}.test.js`, 'router.test.js'],
	},
	{ match: /^src\/cli\/lib\/dashboard/u, tests: dashboardTests },
	{ match: /^src\/cli\/lib\/doc-review-ledger\.ts$/u, tests: ['docs.test.js', ...dashboardTests] },
	{ match: /^src\/cli\/lib\/local-index\.ts$/u, tests: [...localIndexTests, 'explain-command.test.js', 'explain-surface.test.js'] },
	{ match: /^src\/cli\/lib\/npm-version-check\.ts$/u, tests: ['router.test.js'] },
	{
		match: /^src\/cli\/lib\/option-parser\.ts$/u,
		tests: [
			'option-parser.test.js',
			'router.test.js',
			...runTests,
			'adapters.test.js',
			'check.test.js',
			'classify.test.js',
			'status.test.js',
			'doctor.test.js',
			'context.test.js',
			'contract-lint.test.js',
			...explainTests,
			'handoff.test.js',
			'impact.test.js',
			'index-dry-run.test.js',
			...indexTests,
			'line-endings.test.js',
			'map.test.js',
			'next.test.js',
			'onboard.test.js',
			'search.test.js',
			'search-backends.test.js',
			'search-index-state.test.js',
			'search-output.test.js',
			'search-source-scope.test.js',
			'update.test.js',
			'upgrade.test.js',
			...verifyTests,
			'version-sources.test.js',
			'workspace.test.js',
		],
	},
	{ match: /^src\/cli\/script-packs\/code-outline\.ts$/u, tests: codeOutlineContractTests },
	{ match: /^src\/cli\/script-packs\/code-route-outline\.ts$/u, tests: codeOutlineContractTests },
	{ match: /^src\/cli\/script-packs\/code-export-diff\.ts$/u, tests: codeOutlineContractTests },
	{ match: /^src\/cli\/script-packs\/docs-reference-drift\.ts$/u, tests: codeOutlineContractTests },
	{ match: /^src\/cli\/script-packs\/repo-config-chain\.ts$/u, tests: codeOutlineContractTests },
	{ match: /^src\/cli\/script-packs\/repo-env-contract\.ts$/u, tests: codeOutlineContractTests },
	{ match: /^src\/cli\/lib\/package-info\.ts$/u, tests: [...dashboardTests, 'router.test.js', ...runTests] },
	{ match: /^src\/cli\/lib\/command-registry\.ts$/u, tests: [...runTests, ...dashboardTests, 'router.test.js'] },
	{ match: /^src\/cli\/lib\/repo-map\.ts$/u, tests: ['map.test.js', 'workspace.test.js'] },
	{ match: /^src\/cli\/lib\/run-plan\.ts$/u, tests: [...runTests, ...schemaSmokeTests] },
	{ match: /^src\/cli\/lib\/run-receipt\.ts$/u, tests: [...runTests, ...dashboardTests, ...schemaSmokeTests] },
	{ match: /^src\/cli\/lib\/validation\.ts$/u, tests: [...checkTests, ...schemaSmokeTests] },
	{ match: /^src\/cli\/commands\/run\//u, tests: [...runTests, ...schemaSmokeTests] },
	{ match: /^src\/cli\/commands\/verify\//u, tests: [...verifyTests, 'explain-verify.test.js', ...schemaSmokeTests] },
	{ match: /^src\/cli\/lib\/template/u, tests: ['init.test.js', 'update.test.js'] },
	{ match: /^src\/cli\/lib\/root/u, tests: ['root-discovery.test.js'] },
	{ match: /^src\/cli\/lib\/schema/u, tests: schemaSmokeTests },
	{ match: /^src\/core\/command-intent-eligibility\.ts$/u, tests: [...runTests, ...verifyTests, 'security-fuzz.test.js', ...schemaSmokeTests] },
	{ match: /^src\/core\/command-classification\.ts$/u, tests: ['classify.test.js', 'impact.test.js', ...verifyTests, ...schemaSmokeTests] },
	{ match: /^src\/core\/command-contract-rules\.ts$/u, tests: ['check-command-contracts.test.js', ...runTests] },
	{ match: /^src\/core\/config-loading\.ts$/u, tests: ['check-config-validation.test.js', 'doctor.test.js', ...schemaSmokeTests] },
	{ match: /^src\/core\/contract-lint\.ts$/u, tests: ['contract-lint.test.js', ...schemaSmokeTests] },
	{ match: /^src\/core\/code-outline\.ts$/u, tests: codeOutlineContractTests },
	{ match: /^src\/core\/export-diff\.ts$/u, tests: codeOutlineContractTests },
	{ match: /^src\/core\/reference-drift\.ts$/u, tests: codeOutlineContractTests },
	{ match: /^src\/core\/config-chain\.ts$/u, tests: codeOutlineContractTests },
	{ match: /^src\/core\/env-contract\.ts$/u, tests: codeOutlineContractTests },
	{ match: /^src\/core\/route-outline\.ts$/u, tests: codeOutlineContractTests },
	{ match: /^src\/core\/completion-verdict\.ts$/u, tests: ['verify-completion-verdict.test.js'] },
	{ match: /^src\/core\/dashboard-verification\.ts$/u, tests: ['dashboard-verification.test.js', 'verify.test.js', 'verify-completion-verdict.test.js', ...schemaSmokeTests] },
	{ match: /^src\/core\/doc-review-triage\.ts$/u, tests: ['docs.test.js', ...dashboardTests, ...schemaSmokeTests] },
	{ match: /^src\/core\/change-(classification|verification)\.ts$/u, tests: ['classify.test.js', ...verifyTests, 'explain-surface.test.js', 'explain-verify.test.js', 'schema.test.js'] },
	{ match: /^src\/core\/adapter-compatibility\.ts$/u, tests: ['adapters.test.js', 'schema.test.js'] },
	{ match: /^src\/core\/contract-models\.ts$/u, tests: ['check-command-contracts.test.js', ...schemaSmokeTests] },
	{ match: /^src\/core\/(release-version-validation|version-impact|version-sources|version-sync-policy)\.ts$/u, tests: versioningTests },
	{ match: /^src\/core\/handoff-record\.ts$/u, tests: ['handoff.test.js', 'schema.test.js'] },
	{ match: /^src\/core\/authority-resolution\.ts$/u, tests: ['check-doc-authority.test.js', 'explain-authority.test.js'] },
	{ match: /^src\/core\/check-issues\.ts$/u, tests: ['check.test.js', 'schema.test.js'] },
	{ match: /^src\/core\/public-json-contracts\.ts$/u, tests: ['schema.test.js'] },
	{ match: /^src\/core\/script-pack-suggestions\.ts$/u, tests: codeOutlineContractTests },
	{ match: /^src\/core\/public-surface-explanation\.ts$/u, tests: ['explain-surface.test.js'] },
	{ match: /^src\/core\/command-effects\.ts$/u, tests: ['check-command-contracts.test.js', 'explain-command.test.js', 'index-workflow.test.js', ...runTests] },
	{ match: /^src\/core\/command-explanation\.ts$/u, tests: ['explain-command.test.js', 'explain-retention-asset.test.js'] },
	{ match: /^src\/core\/retention-(explanation|policy)\.ts$/u, tests: ['explain-retention-asset.test.js'] },
	{ match: /^src\/core\/command-cwd\.ts$/u, tests: runTests },
	{ match: /^src\/core\/command-contract-validation\.ts$/u, tests: commandContractTests },
	{ match: /^src\/core\/repeated-failure\.ts$/u, tests: ['verify-completion-verdict.test.js'] },
	{ match: /^src\/core\/validation-ratchet\.ts$/u, tests: ['verify-completion-verdict.test.js'] },
	{ match: /^src\/core\/verification-plan\.ts$/u, tests: ['verify.test.js', 'verify-changed.test.js', 'verify-plan-scheduler.test.js', 'explain-verify.test.js', 'schema.test.js'] },
	{ match: /^src\/core\/verification-decision-graph\.ts$/u, tests: ['verify.test.js', 'verify-completion-verdict.test.js', 'dashboard-verification.test.js', ...schemaSmokeTests] },
	{ match: /^src\/core\/verification-scheduler\.ts$/u, tests: ['verify-plan-scheduler.test.js', ...runTests] },
	{ match: /^src\/core\/skill-route-(alignment|explanation)\.ts$/u, tests: ['check-skill-contracts.test.js', 'explain-skills.test.js'] },
	{ match: /^src\/core\/source-anchor-(explanation|validation)\.ts$/u, tests: ['check-source-anchors.test.js', 'explain-source-anchor.test.js'] },
	{ match: /^src\/core\/source-anchor-status\.ts$/u, tests: ['index-source-anchors.test.js', 'search-source-scope.test.js'] },
	{ match: /^src\/core\/source-anchor-symbols\.ts$/u, tests: ['index-source-anchors.test.js', 'search-source-scope.test.js', 'check-source-anchors.test.js'] },
	{ match: /^src\/core\/source-anchors\.ts$/u, tests: sourceAnchorTests },
	{ match: /^src\/core\/surface-decision-model\.ts$/u, tests: ['explain-surface.test.js', 'verify.test.js', 'verify-plan-scheduler.test.js', ...schemaSmokeTests] },
	{ match: /^src\/core\/toml\.ts$/u, tests: ['check-config-validation.test.js', 'contract-lint.test.js', ...runTests] },
	{ match: /^src\/core\/line-endings\.ts$/u, tests: ['line-endings.test.js', 'schema.test.js'] },
	{ match: /^scripts\/audit-tests\.mjs$/u, tests: ['test-audit.test.js'] },
	{ match: /^tests\/cli\/helpers\/cli-harness\.js$/u, tests: cliTests },
	{ match: /^tests\/cli\/helpers\/local-index-fixtures\.js$/u, tests: localIndexTests },
	{ match: /^tests\/cli\/index-support\.js$/u, tests: indexTests },
	{ match: /^tests\/cli\/index\.test\.js$/u, tests: indexTests },
	{ match: /^tests\/cli\/run-support\.js$/u, tests: runTests },
	{ match: /^tests\/cli\/run\.test\.js$/u, tests: runTests },
	{ match: /^tests\/cli\/dashboard-support\.js$/u, tests: dashboardTests },
	{ match: /^tests\/cli\/dashboard\.test\.js$/u, tests: dashboardTests },
	{ match: /^tests\/cli\/([^/]+\.test\.js)$/u, testsForMatch: ([, testName]) => [testName] },
	{
		match: /^\.mustflow\/config\/commands\.toml$/u,
		tests: [
			'check-command-contracts.test.js',
			'explain-command.test.js',
			'index-workflow.test.js',
			...runTests,
			...verifyTests,
			'schema-command-contracts.test.js',
		],
	},
	{ match: /^\.mustflow\/config\/mustflow\.toml$/u, tests: ['check-config-validation.test.js', 'doctor.test.js'] },
	{ match: /^\.mustflow\/config\/preferences\.toml$/u, tests: ['check-versioning.test.js', 'version-sources.test.js'] },
	{ match: /^docs-site\//u, tests: ['docs.test.js'] },
	{ match: /\.(md|mdx)$/u, tests: ['docs.test.js'] },
];

const relatedReleaseRules = [
	/^package\.json$/u,
	/^schemas\//u,
	/^templates\//u,
	/^src\/core\/contract-models\.ts$/u,
	/^src\/core\/public-json-contracts\.ts$/u,
	/^src\/core\/(release-version-validation|version-impact|version-sources|version-sync-policy)\.ts$/u,
	/^src\/cli\/lib\/package-info\.ts$/u,
	/^src\/cli\/lib\/template/u,
	/^\.mustflow\/config\/commands\.toml$/u,
];

function gitList(args) {
	const result = spawnSync('git', args, { cwd: repoRoot, encoding: 'utf8' });
	if (result.status !== 0) {
		return [];
	}
	return result.stdout
		.split(/\r?\n/u)
		.map((line) => line.trim())
		.filter(Boolean)
		.map((line) => line.replaceAll('\\', '/'));
}

function parseRunnerArgs(args) {
	const parsed = {
		mode: 'full',
		listOnly: false,
		buildRunner: undefined,
	};
	let modeWasSet = false;

	for (const arg of args) {
		if (arg === '--list') {
			parsed.listOnly = true;
			continue;
		}

		if (arg === '--build') {
			parsed.buildRunner ??= 'bun';
			continue;
		}

		if (arg.startsWith('--build-runner=')) {
			const runner = arg.slice('--build-runner='.length);
			if (!['bun', 'npm'].includes(runner)) {
				console.error('--build-runner must be either "bun" or "npm".');
				process.exit(2);
			}
			parsed.buildRunner = runner;
			continue;
		}

		if (arg.startsWith('-')) {
			console.error(`Unknown run-cli-tests option: ${arg}`);
			process.exit(2);
		}

		if (modeWasSet) {
			console.error(`Unexpected extra run-cli-tests argument: ${arg}`);
			process.exit(2);
		}

		parsed.mode = arg;
		modeWasSet = true;
	}

	return parsed;
}

function testRunnerLockDir() {
	if (process.env.MUSTFLOW_TEST_RUNNER_LOCK_DIR) {
		return path.resolve(process.env.MUSTFLOW_TEST_RUNNER_LOCK_DIR);
	}

	const repoHash = createHash('sha256').update(repoRoot).digest('hex').slice(0, 16);
	return path.join(testRunnerLockRoot, repoHash);
}

function isProcessAlive(pid) {
	if (!Number.isInteger(pid) || pid <= 0) {
		return false;
	}

	try {
		process.kill(pid, 0);
		return true;
	} catch (error) {
		return error?.code === 'EPERM';
	}
}

function readLockOwner(lockDir) {
	const ownerPath = path.join(lockDir, testRunnerLockOwnerFile);
	try {
		return JSON.parse(readFileSync(ownerPath, 'utf8'));
	} catch {
		return undefined;
	}
}

function isStaleLock(owner) {
	const startedAtMs = Date.parse(String(owner?.started_at ?? ''));
	return !isProcessAlive(Number(owner?.pid)) || !Number.isFinite(startedAtMs) || Date.now() - startedAtMs > staleLockMs;
}

function acquireTestRunnerLock() {
	const lockDir = testRunnerLockDir();
	const owner = {
		pid: process.pid,
		cwd: repoRoot,
		command: process.argv.join(' '),
		started_at: new Date().toISOString(),
	};

	mkdirSync(path.dirname(lockDir), { recursive: true });

	while (true) {
		try {
			mkdirSync(lockDir, { recursive: false });
			writeFileSync(path.join(lockDir, testRunnerLockOwnerFile), `${JSON.stringify(owner, null, 2)}\n`);
			let released = false;
			return () => {
				if (released) {
					return;
				}
				released = true;
				rmSync(lockDir, { recursive: true, force: true });
			};
		} catch (error) {
			if (error?.code !== 'EEXIST') {
				console.error(error.message);
				process.exit(2);
			}

			const existingOwner = readLockOwner(lockDir);
			if (isStaleLock(existingOwner)) {
				rmSync(lockDir, { recursive: true, force: true });
				continue;
			}

			console.error(
				[
					'Another mustflow CLI test runner is already active for this repository.',
					'Wait for it to finish or stop the owner process before starting another build/test run.',
					`Lock: ${lockDir}`,
					`Owner PID: ${existingOwner.pid}`,
					`Owner command: ${existingOwner.command}`,
				].join('\n'),
			);
			process.exit(2);
		}
	}
}

function registerTestRunnerLockRelease(releaseLock) {
	let released = false;
	const releaseOnce = () => {
		if (released) {
			return;
		}
		released = true;
		releaseLock();
	};

	process.once('exit', releaseOnce);
	for (const signal of ['SIGINT', 'SIGTERM']) {
		process.once(signal, () => {
			releaseOnce();
			process.exit(signal === 'SIGINT' ? 130 : 143);
		});
	}
}

function resolveWindowsExecutable(commandName) {
	if (process.platform !== 'win32') {
		return undefined;
	}

	const result = spawnSync('where.exe', [commandName], { encoding: 'utf8' });
	if (result.status !== 0) {
		return undefined;
	}

	return result.stdout
		.split(/\r?\n/u)
		.map((line) => line.trim())
		.find((line) => /\.(?:exe|com)$/iu.test(line));
}

function runBuild(buildRunner) {
	if (!buildRunner) {
		return;
	}

	const buildExecutable = buildRunner === 'npm' ? 'npm' : 'bun';
	const buildCommand = resolveWindowsExecutable(buildExecutable) ?? buildExecutable;
	const buildArgs = ['run', 'build'];
	const result =
		process.platform === 'win32' && buildCommand === buildExecutable
			? spawnSync(`${buildExecutable} run build`, { cwd: repoRoot, stdio: 'inherit', shell: true })
			: spawnSync(buildCommand, buildArgs, {
					cwd: repoRoot,
					stdio: 'inherit',
				});

	if (result.error) {
		console.error(result.error.message);
		process.exit(1);
	}

	if (result.status !== 0) {
		process.exit(result.status ?? 1);
	}
}

function parseChangedFilesOverride() {
	const rawValue = process.env.MUSTFLOW_TEST_CHANGED_FILES;
	if (!rawValue) {
		return undefined;
	}

	const values = rawValue.trim().startsWith('[')
		? JSON.parse(rawValue)
		: rawValue.split(/[\r\n,;]+/u);

	if (!Array.isArray(values)) {
		console.error('MUSTFLOW_TEST_CHANGED_FILES must be a JSON array or a newline/comma-separated list.');
		process.exit(2);
	}

	return values
		.map((value) => String(value).trim().replaceAll('\\', '/').replace(/^\.?\//u, ''))
		.filter(Boolean);
}

function changedFiles() {
	const override = parseChangedFilesOverride();
	if (override) {
		return override;
	}

	return [
		...gitList(['diff', '--name-only', '--relative']),
		...gitList(['diff', '--name-only', '--cached', '--relative']),
		...gitList(['ls-files', '--others', '--exclude-standard']),
	];
}

const currentChangedFiles = changedFiles();
const cachedModeUnsafeRules = [
	/^src\//u,
	/^tsconfig(?:\..*)?\.json$/u,
];

function compiledOutputPathForSource(relativePath) {
	if (!relativePath.startsWith('src/') || !relativePath.endsWith('.ts')) {
		return undefined;
	}

	return path.join(repoRoot, ...relativePath.replace(/^src\//u, 'dist/').replace(/\.ts$/u, '.js').split('/'));
}

function uniqueExisting(testNames) {
	return [...new Set(testNames)].filter((name) => commandTestNames.has(name));
}

function relatedTests() {
	const tests = new Set();

	for (const file of currentChangedFiles) {
		for (const rule of relatedRules) {
			const match = rule.match.exec(file);
			if (!match) {
				continue;
			}

			const names = rule.testsForMatch ? rule.testsForMatch(match) : rule.tests;
			for (const name of names) {
				if (commandTestNames.has(name)) {
					tests.add(name);
				}
			}
		}
	}

	return tests.size > 0 ? [...tests] : fastTests;
}

function hasRelatedReleaseChanges() {
	return currentChangedFiles.some((file) => relatedReleaseRules.some((rule) => rule.test(file)));
}

const suites = {
	fast: fastTests,
	'fast-cached': fastTests,
	'fast-profile': fastTests,
	related: relatedTests(),
	'related-cached': relatedTests(),
	'related-profile': relatedTests(),
	cli: cliTests,
	coverage: coverageTests,
	release: releaseTests,
	full: allCliTests,
	'full-auto': allCliTests,
	'full-profile': allCliTests,
};

const runnerArgs = parseRunnerArgs(process.argv.slice(2));
const { mode, listOnly, buildRunner } = runnerArgs;
const selected = suites[mode];

if (!selected) {
	console.error(`Unknown test suite "${mode}". Expected one of: ${Object.keys(suites).join(', ')}`);
	process.exit(2);
}

function readPositiveIntegerEnv(name, fallback) {
	const rawValue = process.env[name];

	if (!rawValue) {
		return fallback;
	}

	const value = Number(rawValue);

	if (!Number.isInteger(value) || value < 1) {
		console.error(`${name} must be a positive integer.`);
		process.exit(2);
	}

	return String(value);
}

function readRelatedConcurrency() {
	if (process.env.MUSTFLOW_TEST_RELATED_CONCURRENCY) {
		return readPositiveIntegerEnv('MUSTFLOW_TEST_RELATED_CONCURRENCY', '4');
	}

	return readPositiveIntegerEnv('MUSTFLOW_TEST_CONCURRENCY', '4');
}

function readCliConcurrency() {
	if (process.env.MUSTFLOW_TEST_CLI_CONCURRENCY) {
		return readPositiveIntegerEnv('MUSTFLOW_TEST_CLI_CONCURRENCY', '4');
	}

	return readPositiveIntegerEnv('MUSTFLOW_TEST_CONCURRENCY', '1');
}

function readFullConcurrency() {
	if (process.env.MUSTFLOW_TEST_FULL_CONCURRENCY) {
		return readPositiveIntegerEnv('MUSTFLOW_TEST_FULL_CONCURRENCY', '4');
	}

	return readPositiveIntegerEnv('MUSTFLOW_TEST_CONCURRENCY', '1');
}

function testDemand(testPath) {
	const name = path.basename(testPath);

	if (
		[
			'index-dry-run.test.js',
			...indexTests,
			'search.test.js',
			'search-backends.test.js',
			'search-index-state.test.js',
			'search-output.test.js',
			'search-source-scope.test.js',
		].includes(name)
	) {
		return { cpu: 1, io: 3, process: 2, sqlite: 1, git: 0, className: 'sqlite_io_heavy' };
	}

	if (inProcessCliTests.has(name)) {
		return { cpu: 1, io: 2, process: 1, sqlite: 0, git: 0, className: 'in_process_cli' };
	}

	if (
		[
			'check-command-contracts.test.js',
			'check-config-validation.test.js',
			'check-doc-authority.test.js',
			'check-skill-contracts.test.js',
			'check-source-anchors.test.js',
			'check-versioning.test.js',
			'explain-authority.test.js',
			'explain-command.test.js',
			'explain-retention-asset.test.js',
			'explain-skills.test.js',
			'explain-source-anchor.test.js',
			'explain-surface.test.js',
			'explain-verify.test.js',
			...runTests,
			...dashboardTests,
			'update.test.js',
			'package.test.js',
		].includes(name)
	) {
		return { cpu: 1, io: 3, process: 3, sqlite: 0, git: name === 'check.test.js' ? 1 : 0, className: 'process_io_heavy' };
	}

	if (['root-discovery.test.js', 'init.test.js'].includes(name)) {
		return { cpu: 1, io: 2, process: 2, sqlite: 0, git: 0, className: 'process_medium' };
	}

	return { cpu: 1, io: 1, process: 1, sqlite: 0, git: 0, className: 'light' };
}

function isEnvSensitiveInProcessCliTest(testPath) {
	return envSensitiveInProcessCliTests.has(path.basename(testPath));
}

function resourceCapacity() {
	const cpuDefault = Math.max(1, (os.availableParallelism?.() ?? os.cpus().length) - 1);
	return {
		cpu: Number(readPositiveIntegerEnv('MUSTFLOW_TEST_CPU_TOKENS', String(cpuDefault))),
		io: Number(readPositiveIntegerEnv('MUSTFLOW_TEST_IO_TOKENS', defaultSchedulerResourceTokens.io)),
		process: Number(readPositiveIntegerEnv('MUSTFLOW_TEST_PROCESS_TOKENS', defaultSchedulerResourceTokens.process)),
		sqlite: Number(readPositiveIntegerEnv('MUSTFLOW_TEST_SQLITE_TOKENS', defaultSchedulerResourceTokens.sqlite)),
		git: Number(readPositiveIntegerEnv('MUSTFLOW_TEST_GIT_TOKENS', defaultSchedulerResourceTokens.git)),
	};
}

function addDemand(left, right) {
	return {
		cpu: left.cpu + right.cpu,
		io: left.io + right.io,
		process: left.process + right.process,
		sqlite: left.sqlite + right.sqlite,
		git: left.git + right.git,
	};
}

function emptyDemand() {
	return { cpu: 0, io: 0, process: 0, sqlite: 0, git: 0 };
}

function demandFits(demand, capacity) {
	return (
		demand.cpu <= capacity.cpu &&
		demand.io <= capacity.io &&
		demand.process <= capacity.process &&
		demand.sqlite <= capacity.sqlite &&
		demand.git <= capacity.git
	);
}

function dominantPressure(demand) {
	return Math.max(demand.cpu, demand.io, demand.process, demand.sqlite * 4, demand.git * 4);
}

function planWaves(paths) {
	const capacity = resourceCapacity();
	const jobs = paths
		.map((testPath) => ({ testPath, demand: testDemand(testPath) }))
		.sort((left, right) => {
			const pressureDiff = dominantPressure(right.demand) - dominantPressure(left.demand);
			return pressureDiff === 0 ? right.testPath.localeCompare(left.testPath) : pressureDiff;
		});
	const waves = [];

	for (const job of jobs) {
		const candidate = waves.find((wave) => demandFits(addDemand(wave.demand, job.demand), capacity));
		if (candidate) {
			candidate.jobs.push(job);
			candidate.demand = addDemand(candidate.demand, job.demand);
			continue;
		}

		waves.push({ jobs: [job], demand: addDemand(emptyDemand(), job.demand) });
	}

	return waves.map((wave) => {
		const fileCount = wave.jobs.length;
		const concurrencyLimit =
			wave.demand.sqlite > 0
				? capacity.sqlite
				: wave.demand.git > 0
					? capacity.git
					: wave.demand.io > capacity.io / 2
						? Math.max(1, Math.min(fileCount, capacity.io))
						: Math.max(1, Math.min(fileCount, capacity.cpu + 1));

		return {
			testPaths: wave.jobs.map((job) => job.testPath),
			concurrency: String(Math.min(fileCount, concurrencyLimit)),
			classes: [...new Set(wave.jobs.map((job) => job.demand.className))].sort(),
		};
	});
}

const testPaths = uniqueExisting(selected).map((name) => path.join('tests', 'cli', name));
const profileMode = mode.endsWith('-profile');
const cachedMode = mode.endsWith('-cached');
const autoSchedulerMode = mode.endsWith('-auto');
const baseMode = mode.replace(/-(?:cached|profile|auto)$/u, '');
const schedulerMode = autoSchedulerMode ? 'auto' : scheduler;
const concurrency =
	mode === 'coverage'
		? readPositiveIntegerEnv('MUSTFLOW_TEST_COVERAGE_CONCURRENCY', '4')
		: baseMode === 'related'
			? readRelatedConcurrency()
		: baseMode === 'fast'
			? readPositiveIntegerEnv('MUSTFLOW_TEST_CONCURRENCY', '8')
		: baseMode === 'cli'
			? readCliConcurrency()
		: baseMode === 'full'
			? readFullConcurrency()
			: '1';
const nodeTestArgs = ['--test', `--test-concurrency=${concurrency}`];

if (mode === 'coverage') {
	nodeTestArgs.push('--experimental-test-coverage');
}

const releaseTestRunnerLock = !listOnly || buildRunner ? acquireTestRunnerLock() : undefined;
if (releaseTestRunnerLock) {
	registerTestRunnerLockRelease(releaseTestRunnerLock);
}
runBuild(buildRunner);

if (listOnly) {
	console.log(
		JSON.stringify(
			{
				mode,
				changed_files: currentChangedFiles,
				selected: uniqueExisting(selected),
				release_sensitive: baseMode === 'related' ? hasRelatedReleaseChanges() : false,
			},
			null,
			2,
		),
	);
	process.exit(0);
}

function assertCachedModeSafe() {
	if (!cachedMode) {
		return;
	}

	if (!existsSync(distCliEntrypoint)) {
		console.error('Cached test mode requires dist/cli/index.js. Run `mf run build` or `mf run test_related` first.');
		process.exit(2);
	}

	const unsafeFiles = currentChangedFiles.filter((file) => cachedModeUnsafeRules.some((rule) => rule.test(file)));
	const distMtimeMs = statSync(distCliEntrypoint).mtimeMs;
	const staleFiles = unsafeFiles.filter((file) => {
		const fullPath = path.join(repoRoot, ...file.split('/'));
		if (!existsSync(fullPath)) {
			const compiledOutputPath = compiledOutputPathForSource(file);
			return !compiledOutputPath || existsSync(compiledOutputPath);
		}

		return statSync(fullPath).mtimeMs > distMtimeMs;
	});

	if (staleFiles.length > 0) {
		console.error(
			[
				'Cached test mode cannot be used while dist/ is older than changed TypeScript source or compiler configuration.',
				'Run `mf run test_related` so dist/ is rebuilt before tests.',
				`Stale or deleted changed files: ${staleFiles.join(', ')}`,
			].join('\n'),
		);
		process.exit(2);
	}
}

assertCachedModeSafe();

function runProfiledTests() {
	const timings = [];
	const profileNodeArgs = ['--test', '--test-concurrency=1'];

	for (const testPath of testPaths) {
		const start = performance.now();
		const result = spawnSync(process.execPath, [...profileNodeArgs, testPath], {
			cwd: repoRoot,
			encoding: 'utf8',
		});
		const durationMs = Math.round(performance.now() - start);
		timings.push({ testPath, durationMs, status: result.status ?? 1 });

		if (result.error) {
			console.error(result.error.message);
			process.exit(1);
		}

		if (result.status !== 0) {
			process.stdout.write(result.stdout);
			process.stderr.write(result.stderr);
			console.error(`Profiled test failed: ${testPath}`);
			process.exit(result.status ?? 1);
		}
	}

	const totalMs = timings.reduce((sum, timing) => sum + timing.durationMs, 0);
	const slowest = [...timings].sort((left, right) => right.durationMs - left.durationMs);

	console.log(`Profiled ${mode} CLI tests (${timings.length} files, serial total ${totalMs} ms)`);
	for (const timing of slowest) {
		console.log(`${String(timing.durationMs).padStart(6, ' ')} ms  ${timing.testPath}`);
	}
}

function runTestProcess(paths, testArgs, stdio = 'inherit') {
	return spawnSync(process.execPath, [...testArgs, ...paths], {
		cwd: repoRoot,
		stdio,
	});
}

function runTestProcessAsync(paths, testArgs) {
	return new Promise((resolve) => {
		const child = spawn(process.execPath, [...testArgs, ...paths], {
			cwd: repoRoot,
			stdio: 'inherit',
		});

		child.on('error', (error) => {
			console.error(error.message);
			resolve(1);
		});

		child.on('exit', (code, signal) => {
			if (signal) {
				console.error(`Test process exited with signal ${signal}`);
				resolve(1);
				return;
			}

			resolve(code ?? 1);
		});
	});
}

async function runWaveTestJobs(jobs, concurrencyLimit) {
	let nextIndex = 0;
	let failedStatus = 0;

	async function worker() {
		while (nextIndex < jobs.length) {
			const job = jobs[nextIndex];
			nextIndex += 1;
			const status = await runTestProcessAsync(job.paths, job.args);
			if (status !== 0 && failedStatus === 0) {
				failedStatus = status;
			}
		}
	}

	const workerCount = Math.max(1, Math.min(concurrencyLimit, jobs.length));
	await Promise.all(Array.from({ length: workerCount }, () => worker()));
	return failedStatus;
}

async function runScheduledTests() {
	if (baseMode === 'coverage') {
		console.error('MUSTFLOW_TEST_SCHEDULER=auto is not supported for coverage mode.');
		process.exit(2);
	}

	const waves = planWaves(testPaths);
	console.log(`Running ${mode} CLI tests with auto scheduler (${testPaths.length} files, ${waves.length} waves)`);

	for (const [index, wave] of waves.entries()) {
		const waveArgs = ['--test', `--test-concurrency=${wave.concurrency}`];
		console.log(
			`Wave ${index + 1}/${waves.length} (${wave.testPaths.length} files, concurrency ${wave.concurrency}, classes ${wave.classes.join(', ')}): ${wave.testPaths.join(', ')}`,
		);

		if (wave.classes.includes('in_process_cli')) {
			const envSensitivePaths = wave.testPaths.filter(isEnvSensitiveInProcessCliTest);
			const otherPaths = wave.testPaths.filter((testPath) => !isEnvSensitiveInProcessCliTest(testPath));
			const jobs = [
				...envSensitivePaths.map((testPath) => ({
					paths: [testPath],
					args: ['--test', '--test-concurrency=1'],
				})),
				...(otherPaths.length > 0 ? [{ paths: otherPaths, args: waveArgs }] : []),
			];
			const status = await runWaveTestJobs(jobs, Number(wave.concurrency));

			if (status !== 0) {
				process.exit(status);
			}

			continue;
		}

		const result = runTestProcess(wave.testPaths, waveArgs);

		if (result.error) {
			console.error(result.error.message);
			process.exit(1);
		}

		if (result.status !== 0) {
			process.exit(result.status ?? 1);
		}
	}
}

if (profileMode) {
	runProfiledTests();
	process.exit(0);
}

if (baseMode === 'related' && hasRelatedReleaseChanges()) {
	console.log('Release-sensitive files changed; run `mf run test_release` before publishing or committing release metadata.');
}

if (schedulerMode === 'auto') {
	await runScheduledTests();
	process.exit(0);
}

console.log(
	`Running ${mode} CLI tests (${testPaths.length} files, concurrency ${concurrency}): ${testPaths.join(', ')}`,
);

const result = runTestProcess(testPaths, nodeTestArgs);

if (result.error) {
	console.error(result.error.message);
	process.exit(1);
}

process.exit(result.status ?? 1);
