import { spawn, spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import { performance } from 'node:perf_hooks';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
	orderTestPathsByProfile,
	profileDurationForTestPath,
	profileOrderingSummary,
	readProfileTimingEvidence,
} from './lib/test-ordering.mjs';
import { createTestSelection } from './lib/test-selection.mjs';

const repoRoot = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const testRunnerLockRoot = path.join(os.tmpdir(), 'mustflow-test-runner-locks');
const testRunnerLockOwnerFile = 'owner.json';
const latestProfilePath = path.join(repoRoot, '.mustflow', 'state', 'runs', 'latest.profile.json');
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
const testSelection = createTestSelection(allCliTests);
const {
	dashboardTests,
	envSensitiveInProcessCliTests,
	hasRelatedReleaseChangesForFiles,
	inProcessCliTests,
	indexTests,
	runTests,
	selectionReportForMode: buildSelectionReportForMode,
	suitesForChangedFiles,
	summarizeRelatedSelectionReasons,
} = testSelection;
const scheduler = process.env.MUSTFLOW_TEST_SCHEDULER ?? 'default';
const defaultSchedulerResourceTokens = {
	io: '16',
	process: '16',
	sqlite: '4',
	git: '2',
};

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
		listBatchPath: undefined,
		buildRunner: undefined,
	};
	let modeWasSet = false;

	for (const arg of args) {
		if (arg === '--list') {
			parsed.listOnly = true;
			continue;
		}

		if (arg.startsWith('--list-batch=')) {
			parsed.listOnly = true;
			parsed.listBatchPath = path.resolve(repoRoot, arg.slice('--list-batch='.length));
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

function hasRelatedReleaseChanges() {
	return hasRelatedReleaseChangesForFiles(currentChangedFiles);
}

const suites = suitesForChangedFiles(currentChangedFiles);

const runnerArgs = parseRunnerArgs(process.argv.slice(2));
const { mode, listOnly, listBatchPath, buildRunner } = runnerArgs;
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
			'package-command-contracts.test.js',
			'package-metadata-contracts.test.js',
			'package-release-workflow-contracts.test.js',
			'package-template-skill-contracts.test.js',
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

function planWaves(paths, profileDurations = new Map()) {
	const capacity = resourceCapacity();
	const jobs = paths
		.map((testPath, index) => ({
			testPath,
			index,
			demand: testDemand(testPath),
			durationMs: profileDurationForTestPath(testPath, profileDurations) ?? 0,
		}))
		.sort((left, right) => {
			const pressureDiff = dominantPressure(right.demand) - dominantPressure(left.demand);
			if (pressureDiff !== 0) {
				return pressureDiff;
			}

			return right.durationMs - left.durationMs || left.index - right.index;
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

const profileMode = mode.endsWith('-profile');
const cachedMode = mode.endsWith('-cached');
const autoSchedulerMode = mode.endsWith('-auto');
const baseMode = mode.replace(/-(?:cached|profile|auto)$/u, '');
const schedulerMode = autoSchedulerMode ? 'auto' : scheduler;
const selectedTestPaths = selected.map((name) => path.join('tests', 'cli', name));
const profileEvidence = profileMode ? undefined : readProfileTimingEvidence(latestProfilePath);
const profileDurations = profileEvidence?.durations ?? new Map();
const profileOrdering = profileOrderingSummary(selectedTestPaths, profileDurations);
const testPaths =
	profileOrdering.known > 0 && !profileMode
		? orderTestPathsByProfile(selectedTestPaths, profileDurations)
		: selectedTestPaths;
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

function normalizeChangedFiles(files) {
	if (!Array.isArray(files)) {
		console.error('List batch request changed_files must be an array.');
		process.exit(2);
	}

	return files
		.map((file) => String(file).trim().replaceAll('\\', '/').replace(/^\.?\//u, ''))
		.filter(Boolean);
}

function selectionReportForMode(testMode, files) {
	const report = buildSelectionReportForMode(testMode, files);
	if (!report) {
		console.error(`Unknown test suite "${testMode}". Expected one of: ${Object.keys(suites).join(', ')}`);
		process.exit(2);
	}

	return report;
}

function readListBatchRequests(batchPath) {
	let requests;
	try {
		requests = JSON.parse(readFileSync(batchPath, 'utf8'));
	} catch (error) {
		console.error(`Unable to read list batch request file: ${error.message}`);
		process.exit(2);
	}

	if (!Array.isArray(requests)) {
		console.error('List batch request file must contain a JSON array.');
		process.exit(2);
	}

	return requests.map((request) => ({
		mode: String(request?.mode ?? ''),
		changed_files: normalizeChangedFiles(request?.changed_files ?? []),
	}));
}

if (listOnly) {
	if (listBatchPath) {
		console.log(JSON.stringify(readListBatchRequests(listBatchPath).map((request) => selectionReportForMode(request.mode, request.changed_files)), null, 2));
		process.exit(0);
	}

	console.log(JSON.stringify(selectionReportForMode(mode, currentChangedFiles), null, 2));
	process.exit(0);
}

function assertCachedModeSafe() {
	if (!cachedMode) {
		return;
	}

	if (!existsSync(distCliEntrypoint)) {
		console.error(
			[
				'Cached test mode precondition failed: dist/cli/index.js does not exist.',
				'Cached mode does not rebuild dist/ before running tests.',
				'Fallback intent: mf run test_related',
				'Build-only fallback: mf run build',
			].join('\n'),
		);
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
				'Cached test mode precondition failed: dist/ is older than changed TypeScript source or compiler configuration.',
				'Cached mode does not rebuild dist/ before running tests.',
				'Fallback intent: mf run test_related',
				`Artifact: ${path.relative(repoRoot, distCliEntrypoint).replaceAll('\\', '/')}`,
				`Stale or deleted changed files: ${staleFiles.join(', ')}`,
			].join('\n'),
		);
		process.exit(2);
	}
}

assertCachedModeSafe();

function formatDurationMs(durationMs) {
	if (durationMs === undefined || !Number.isFinite(durationMs)) {
		return 'unknown';
	}

	const absoluteMs = Math.abs(durationMs);
	const dayMs = 24 * 60 * 60 * 1000;
	const hourMs = 60 * 60 * 1000;
	const minuteMs = 60 * 1000;
	const secondMs = 1000;
	const units = [
		['d', dayMs],
		['h', hourMs],
		['m', minuteMs],
		['s', secondMs],
	];
	const parts = [];
	let remaining = absoluteMs;

	for (const [label, unitMs] of units) {
		const value = Math.floor(remaining / unitMs);
		if (value <= 0) {
			continue;
		}

		parts.push(`${value}${label}`);
		remaining -= value * unitMs;
		if (parts.length === 2) {
			break;
		}
	}

	return parts.length > 0 ? parts.join(' ') : `${Math.round(absoluteMs)}ms`;
}

function profileEvidenceReasonText(evidence, profileRelativePath) {
	switch (evidence.reason) {
		case 'missing':
			return `missing ${profileRelativePath}`;
		case 'malformed':
			return `malformed ${profileRelativePath}`;
		case 'missing_timestamp':
			return `missing generated_at in ${profileRelativePath}`;
		case 'future_timestamp':
			return `${profileRelativePath} generated_at is in the future (${formatDurationMs(evidence.ageMs)} ahead)`;
		case 'stale':
			return `${profileRelativePath} is stale (age ${formatDurationMs(evidence.ageMs)} > max ${formatDurationMs(evidence.maxAgeMs)})`;
		case 'no_valid_entries':
			return `${profileRelativePath} has no valid test_files durations`;
		default:
			return `unusable ${profileRelativePath}`;
	}
}

function profileTimingSummaryLine() {
	if (!profileEvidence) {
		return undefined;
	}

	const profileRelativePath = path.relative(repoRoot, latestProfilePath).replaceAll('\\', '/');

	if (profileEvidence.status === 'used') {
		const unknown = Math.max(0, profileOrdering.total - profileOrdering.known);
		return (
			`Using profile timing order from ${profileRelativePath} ` +
			`(known ${profileOrdering.known}/${profileOrdering.total}, unknown ${unknown}, age ${formatDurationMs(profileEvidence.ageMs)}; ` +
			'unknown files keep selected order).'
		);
	}

	return `Profile timing order skipped: ${profileEvidenceReasonText(profileEvidence, profileRelativePath)}; keeping selected order.`;
}

function writeLatestProfileEvidence(timings) {
	const totalMs = timings.reduce((sum, timing) => sum + timing.durationMs, 0);
	const slowest = [...timings].sort((left, right) => right.durationMs - left.durationMs);
	const profile = {
		schema_version: '1',
		generated_at: new Date().toISOString(),
		mode,
		intent: baseMode === 'related' ? 'test_related_profile' : `${baseMode}_profile`,
		total_duration_ms: totalMs,
		file_count: timings.length,
		test_files: slowest.map((timing) => ({
			path: timing.testPath.replaceAll('\\', '/'),
			duration_ms: timing.durationMs,
			status: timing.status === 0 ? 'passed' : 'failed',
			exit_code: timing.status,
		})),
		selection: selectionReportForMode(mode, currentChangedFiles),
	};

	mkdirSync(path.dirname(latestProfilePath), { recursive: true });
	writeFileSync(latestProfilePath, `${JSON.stringify(profile, null, 2)}\n`);

	return { totalMs, slowest };
}

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
			const { totalMs } = writeLatestProfileEvidence(timings);
			process.stdout.write(result.stdout);
			process.stderr.write(result.stderr);
			console.error(`Profiled test failed: ${testPath}`);
			console.error(
				`Wrote partial profile evidence to ${path.relative(repoRoot, latestProfilePath).replaceAll('\\', '/')} ` +
					`(${timings.length} files, serial total ${totalMs} ms)`,
			);
			process.exit(result.status ?? 1);
		}
	}

	const { totalMs, slowest } = writeLatestProfileEvidence(timings);

	console.log(`Profiled ${mode} CLI tests (${timings.length} files, serial total ${totalMs} ms)`);
	console.log(`Wrote profile evidence to ${path.relative(repoRoot, latestProfilePath).replaceAll('\\', '/')}`);
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

	const waves = planWaves(testPaths, profileDurations);
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

if (baseMode === 'related') {
	console.log(`Selection reasons: ${summarizeRelatedSelectionReasons(selectionReportForMode(mode, currentChangedFiles).selection_reasons)}.`);
}

const profileSummary = profileTimingSummaryLine();
if (profileSummary) {
	console.log(profileSummary);
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
