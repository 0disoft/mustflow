import {
	chmodSync,
	mkdtempSync,
	mkdirSync,
	readdirSync,
	rmSync,
	writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

import {
	CommandExecutionError,
	createNpmRunner,
	smokePublishedPackage,
} from '../../scripts/lib/npm-release-install-smoke.mjs';
import {
	evaluateReleaseWorkingTree,
} from '../../scripts/lib/release-working-tree-policy.mjs';
import { readCommittedReleasePackageJson } from '../../scripts/lib/release-package-identity.mjs';

import {
	assert,
	ciWorkflow,
	cliPath,
	cliTestOrdering,
	cliTestRunner,
	cliTestSelection,
	packageJson,
	pathToFileURL,
	projectRoot,
	publishNpmWorkflow,
	readProjectText,
	readPublicJsonContracts,
	readTemplateSkillProfile,
	readTomlStringArrayBlock,
	releaseInstallSmokeScript,
	releaseVersionCheckScript,
	sourceCommandContract,
	spawnSync,
	startNpmReleaseScript,
	supportedTemplateLocales,
	templateCommandContract,
	templateCreates,
	templateManifest,
	templateSkillCreates,
	test,
} from './helpers/package-contracts.js';

const smokeFixturePackage = { name: 'mustflow', version: '9.9.9' };

function createSmokeFixtureParent() {
	return mkdtempSync(path.join(tmpdir(), 'mustflow-release-smoke-test-'));
}

function writeInstalledSmokeFixture(projectPath, installedVersion) {
	const packageRoot = path.join(projectPath, 'node_modules', 'mustflow');
	const cliPath = path.join(packageRoot, 'dist', 'cli', 'index.js');
	const binRoot = path.join(projectPath, 'node_modules', '.bin');

	mkdirSync(path.dirname(cliPath), { recursive: true });
	mkdirSync(binRoot, { recursive: true });
	writeFileSync(cliPath, '#!/usr/bin/env node\n');
	writeFileSync(path.join(binRoot, 'mf'), 'fixture shim\n');
	writeFileSync(path.join(binRoot, 'mustflow'), 'fixture shim\n');
	writeFileSync(
		path.join(packageRoot, 'package.json'),
		`${JSON.stringify({
			name: 'mustflow',
			version: installedVersion,
			bin: {
				mf: './dist/cli/index.js',
				mustflow: './dist/cli/index.js',
			},
		}, null, 2)}\n`,
	);
}

function createFakeNpmRunner({
	installedVersion = smokeFixturePackage.version,
	transientInstallFailures = 0,
	failingBin,
	strictReport = { ok: true, strict: true },
} = {}) {
	const calls = [];
	let installAttempts = 0;

	const runNpm = async (args, cwd) => {
		calls.push([...args]);
		if (args[0] === '--version') {
			return { status: 0, stdout: '11.4.2\n', stderr: '' };
		}
		if (args[0] === 'install') {
			installAttempts += 1;
			if (installAttempts <= transientInstallFailures) {
				throw new CommandExecutionError('npm error code E404', {
					command: 'npm',
					args,
					cwd,
					status: 1,
					stderr: 'npm error code E404',
				});
			}
			writeInstalledSmokeFixture(cwd, installedVersion);
			return { status: 0, stdout: 'installed\n', stderr: '' };
		}
		if (args[0] === 'exec') {
			const separatorIndex = args.indexOf('--');
			const binName = args[separatorIndex + 1];
			const binArgs = args.slice(separatorIndex + 2);
			if (binName === failingBin) {
				throw new CommandExecutionError(`broken ${binName} shim`, {
					command: 'npm',
					args,
					cwd,
					status: 1,
					stderr: `broken ${binName} shim`,
				});
			}
			if (binArgs[0] === '--version') {
				return { status: 0, stdout: `${installedVersion}\n`, stderr: '' };
			}
			if (binName === 'mf' && binArgs[0] === 'init') {
				return { status: 0, stdout: 'initialized\n', stderr: '' };
			}
			if (binName === 'mf' && binArgs[0] === 'check') {
				return { status: 0, stdout: `${JSON.stringify(strictReport)}\n`, stderr: '' };
			}
		}

		throw new Error(`Unexpected fake npm call: ${args.join(' ')}`);
	};

	return {
		calls,
		get installAttempts() {
			return installAttempts;
		},
		runNpm,
	};
}

test('npm publish workflow uses trusted publisher identity', () => {
	assert.match(publishNpmWorkflow, /push:\s*\n\s+tags:\s*\n\s+- "v\*"/u);
	assert.match(publishNpmWorkflow, /environment: npm/u);
	assert.match(publishNpmWorkflow, /id-token: write/u);
	assert.match(publishNpmWorkflow, /package-manager-cache: false/u);
	assert.match(publishNpmWorkflow, /no-cache: true/u);
	assert.match(publishNpmWorkflow, /npm publish --access public --provenance/u);
	assert.ok(
		publishNpmWorkflow.indexOf('npm publish --access public --provenance') <
			publishNpmWorkflow.indexOf('Create GitHub release for pushed tag'),
	);
	assert.doesNotMatch(publishNpmWorkflow, /NODE_AUTH_TOKEN/u);
	assert.doesNotMatch(publishNpmWorkflow, /secrets\.NODE_AUTH_TOKEN/u);
});

test('source repository declares bounded npm registry release checks', () => {
	assert.match(sourceCommandContract, /\[intents\.release_npm_version_available\]/u);
	assert.match(sourceCommandContract, /\[intents\.release_npm_publish\]/u);
	assert.match(sourceCommandContract, /\[intents\.release_npm_publish\][\s\S]*approval_actions = \["release"\]/u);
	assert.match(sourceCommandContract, /\[intents\.release_npm_published_verify\]/u);
	assert.match(sourceCommandContract, /\[intents\.release_npm_install_smoke\]/u);
	assert.match(sourceCommandContract, /scripts\/check-npm-release-version\.mjs/u);
	assert.match(sourceCommandContract, /scripts\/smoke-npm-release-install\.mjs/u);
	assert.match(sourceCommandContract, /scripts\/start-npm-release\.mjs/u);
	assert.match(sourceCommandContract, /--expect-available/u);
	assert.match(sourceCommandContract, /--expect-published/u);
	assert.match(sourceCommandContract, /--from-head/u);
	assert.match(sourceCommandContract, /network = true/u);
	assert.match(sourceCommandContract, /destructive = false/u);
	assert.match(sourceCommandContract, /\[resources\.npm_release_channel\]/u);
	assert.match(sourceCommandContract, /lock = "npm_release_channel"/u);
	assert.match(sourceCommandContract, /MUSTFLOW_NPM_REGISTRY_URL/u);
	assert.match(startNpmReleaseScript, /Refusing to start npm release without --yes/u);
	assert.match(startNpmReleaseScript, /git', \['status', '--porcelain=v1', '-z', '--untracked-files=all'\]/u);
	assert.match(startNpmReleaseScript, /evaluateReleaseWorkingTree/u);
	assert.match(startNpmReleaseScript, /requireNoGitOperationInProgress/u);
	assert.match(startNpmReleaseScript, /readCommittedReleasePackageJson/u);
	assert.match(startNpmReleaseScript, /git', \['ls-remote', 'origin', 'refs\/heads\/main'\]/u);
	assert.match(startNpmReleaseScript, /'--package-name'/u);
	assert.match(startNpmReleaseScript, /'--package-version'/u);
	assert.match(startNpmReleaseScript, /git', \['tag', tagName, head\]/u);
	assert.match(startNpmReleaseScript, /git', \['push', 'origin', `refs\/tags\/\$\{tagName\}`\]/u);
	assert.doesNotMatch(startNpmReleaseScript, /gh', \['release', 'create'/u);

	const guardedStart = spawnSync(process.execPath, ['scripts/start-npm-release.mjs'], {
		cwd: projectRoot,
		encoding: 'utf8',
	});
	assert.equal(guardedStart.status, 1);
	assert.match(guardedStart.stderr, /Refusing to start npm release without --yes/u);
});

test('npm release working-tree policy leaves all index and worktree changes outside the committed release', () => {
	assert.deepEqual(evaluateReleaseWorkingTree(''), {
		hasChanges: false,
		releaseSource: 'committed-head',
	});

	for (const [name, status] of [
		['unstaged review queue', ' M .mustflow/review/docs.toml\0'],
		['staged review queue', 'M  .mustflow/review/docs.toml\0'],
		['deleted review queue', ' D .mustflow/review/docs.toml\0'],
		['modified source', ' M scripts/start-npm-release.mjs\0'],
		['untracked source', '?? release-notes.tmp\0'],
		['rename record', 'R  moved-review.toml\0.mustflow/review/docs.toml\0'],
	]) {
		assert.deepEqual(evaluateReleaseWorkingTree(status), {
			hasChanges: true,
			releaseSource: 'committed-head',
		}, name);
	}
});

test('npm release metadata is read from an explicit immutable Git revision', () => {
	const calls = [];
	const packageJson = readCommittedReleasePackageJson('C:\\fixture', '0123456789abcdef', {
		spawnSync(command, args, options) {
			calls.push({ command, args, options });
			return {
				status: 0,
				stdout: '{"name":"mustflow","version":"9.9.9"}\n',
				stderr: '',
			};
		},
	});

	assert.deepEqual(packageJson, { name: 'mustflow', version: '9.9.9' });
	assert.equal(calls.length, 1);
	assert.equal(calls[0].command, 'git');
	assert.deepEqual(calls[0].args, ['show', '0123456789abcdef:package.json']);
	assert.equal(calls[0].options.cwd, 'C:\\fixture');
});

test('published npm install smoke verifies the isolated user installation path', () => {
	const smokeIntent = /\[intents\.release_npm_install_smoke\][\s\S]*?(?=\n\[intents\.)/u.exec(sourceCommandContract)?.[0] ?? '';

	assert.notEqual(smokeIntent, '');
	assert.match(smokeIntent, /status = "configured"/u);
	assert.match(smokeIntent, /lifecycle = "oneshot"/u);
	assert.match(smokeIntent, /run_policy = "agent_allowed"/u);
	assert.match(smokeIntent, /timeout_seconds = 300/u);
	assert.match(smokeIntent, /stdin = "closed"/u);
	assert.match(smokeIntent, /success_exit_codes = \[0\]/u);
	assert.match(smokeIntent, /writes = \[\]/u);
	assert.match(smokeIntent, /network = true/u);
	assert.match(smokeIntent, /destructive = false/u);
	assert.match(smokeIntent, /required_after = \["release_risk"\]/u);

	assert.match(releaseInstallSmokeScript, /smokePublishedPackage/u);
	assert.match(releaseInstallSmokeScript, /formatSmokeError/u);
	assert.match(releaseInstallSmokeScript, /readCommittedReleasePackageJson/u);
});

test('published npm smoke executes both public aliases and a strict consumer workflow', async () => {
	const tempParent = createSmokeFixtureParent();
	const fakeNpm = createFakeNpmRunner();

	try {
		const evidence = await smokePublishedPackage({
			packageJson: smokeFixturePackage,
			runNpm: fakeNpm.runNpm,
			tempParent,
			logger: () => {},
		});
		const calls = fakeNpm.calls.map((args) => args.join(' '));

		assert.equal(evidence.packageSpec, 'mustflow@9.9.9');
		assert.deepEqual(evidence.bins, ['mf', 'mustflow']);
		assert.ok(calls.some((call) => call.includes('install --ignore-scripts')));
		assert.ok(calls.some((call) => call.includes('--prefer-online --cache')));
		assert.ok(calls.some((call) => call.includes('exec --package=mustflow --cache') && call.endsWith('--offline --yes=false -- mf --version')));
		assert.ok(calls.some((call) => call.includes('exec --package=mustflow --cache') && call.endsWith('--offline --yes=false -- mustflow --version')));
		assert.ok(calls.some((call) => call.includes('exec --package=mustflow --cache') && call.endsWith('--offline --yes=false -- mf init --yes')));
		assert.ok(calls.some((call) => call.includes('exec --package=mustflow --cache') && call.endsWith('--offline --yes=false -- mf check --strict --json')));
		assert.deepEqual(readdirSync(tempParent), []);
	} finally {
		rmSync(tempParent, { recursive: true, force: true });
	}
});

test('npm exec runs a real local public shim in offline mode', async () => {
	const projectPath = createSmokeFixtureParent();
	const binRoot = path.join(projectPath, 'node_modules', '.bin');
	const packageRoot = path.join(projectPath, 'node_modules', 'mustflow');
	const cacheRoot = path.join(projectPath, 'npm-cache');
	const shimPath = path.join(binRoot, process.platform === 'win32' ? 'mf.cmd' : 'mf');

	try {
		mkdirSync(binRoot, { recursive: true });
		mkdirSync(path.join(packageRoot, 'bin'), { recursive: true });
		mkdirSync(cacheRoot);
		writeFileSync(
			path.join(projectPath, 'package.json'),
			'{"private":true,"dependencies":{"mustflow":"9.9.9"}}\n',
		);
		writeFileSync(
			path.join(packageRoot, 'package.json'),
			'{"name":"mustflow","version":"9.9.9","bin":{"mf":"./bin/mf.js"}}\n',
		);
		writeFileSync(path.join(packageRoot, 'bin', 'mf.js'), '#!/usr/bin/env node\n');
		writeFileSync(
			shimPath,
			process.platform === 'win32'
				? '@echo off\r\necho 9.9.9\r\n'
				: '#!/bin/sh\nprintf "9.9.9\\n"\n',
		);
		if (process.platform !== 'win32') {
			chmodSync(shimPath, 0o755);
		}

		const result = await createNpmRunner()(
			['exec', '--package=mustflow', '--cache', cacheRoot, '--offline', '--yes=false', '--', 'mf', '--version'],
			projectPath,
		);

		assert.equal(result.stdout.trim(), '9.9.9');
	} finally {
		rmSync(projectPath, { recursive: true, force: true });
	}
});

test('published npm smoke fails when the mustflow public alias is broken and still cleans up', async () => {
	const tempParent = createSmokeFixtureParent();
	const fakeNpm = createFakeNpmRunner({ failingBin: 'mustflow' });

	try {
		await assert.rejects(
			smokePublishedPackage({
				packageJson: smokeFixturePackage,
				runNpm: fakeNpm.runNpm,
				tempParent,
				logger: () => {},
			}),
			/broken mustflow shim/u,
		);
		assert.deepEqual(readdirSync(tempParent), []);
	} finally {
		rmSync(tempParent, { recursive: true, force: true });
	}
});

test('published npm smoke retries transient registry propagation with a bounded policy', async () => {
	const tempParent = createSmokeFixtureParent();
	const fakeNpm = createFakeNpmRunner({ transientInstallFailures: 2 });
	const retries = [];

	try {
		await smokePublishedPackage({
			packageJson: smokeFixturePackage,
			runNpm: fakeNpm.runNpm,
			tempParent,
			retryDelaysMilliseconds: [0, 0],
			sleep: async () => {},
			onRetry: (retry) => retries.push(retry),
			logger: () => {},
		});

		assert.equal(fakeNpm.installAttempts, 3);
		assert.equal(retries.length, 2);
		assert.deepEqual(readdirSync(tempParent), []);
	} finally {
		rmSync(tempParent, { recursive: true, force: true });
	}
});

test('published npm smoke rejects the wrong installed version and non-strict reports', async () => {
	const wrongVersionParent = createSmokeFixtureParent();
	const nonStrictParent = createSmokeFixtureParent();

	try {
		await assert.rejects(
			smokePublishedPackage({
				packageJson: smokeFixturePackage,
				runNpm: createFakeNpmRunner({ installedVersion: '9.9.8' }).runNpm,
				tempParent: wrongVersionParent,
				logger: () => {},
			}),
			/Expected mustflow@9\.9\.9, received mustflow@9\.9\.8/u,
		);
		await assert.rejects(
			smokePublishedPackage({
				packageJson: smokeFixturePackage,
				runNpm: createFakeNpmRunner({ strictReport: { ok: true, strict: false } }).runNpm,
				tempParent: nonStrictParent,
				logger: () => {},
			}),
			/ok=true and strict=true/u,
		);
	} finally {
		rmSync(wrongVersionParent, { recursive: true, force: true });
		rmSync(nonStrictParent, { recursive: true, force: true });
	}
});

test('published npm smoke preserves both the primary and cleanup failures', async () => {
	const tempParent = createSmokeFixtureParent();
	const fakeNpm = createFakeNpmRunner({ failingBin: 'mf' });
	let leakedTempRoot;

	try {
		await assert.rejects(
			smokePublishedPackage({
				packageJson: smokeFixturePackage,
				runNpm: fakeNpm.runNpm,
				tempParent,
				logger: () => {},
				removeDirectory: (directory) => {
					leakedTempRoot = directory;
					throw new Error('cleanup failed');
				},
			}),
			(error) => {
				assert.ok(error instanceof AggregateError);
				assert.equal(error.errors.length, 2);
				assert.match(error.errors[0].message, /broken mf shim/u);
				assert.match(error.errors[1].message, /cleanup failed/u);
				return true;
			},
		);
	} finally {
		if (leakedTempRoot) {
			rmSync(leakedTempRoot, { recursive: true, force: true });
		}
		rmSync(tempParent, { recursive: true, force: true });
	}
});

test('npm registry release check fully encodes package lookup paths', () => {
	assert.match(releaseVersionCheckScript, /function encodeRegistryPackagePath\(packageName\)/u);
	assert.match(releaseVersionCheckScript, /encodeURIComponent\(packageName\)/u);
	assert.match(releaseVersionCheckScript, /encodedScopedMarker = '%40'/u);
	assert.match(releaseVersionCheckScript, /function normalizeRegistryBaseUrl\(value\)/u);
	assert.match(releaseVersionCheckScript, /registryUrl\.pathname\.endsWith\('\/'\)/u);
	assert.match(releaseVersionCheckScript, /registryUrl\.pathname = `\$\{registryUrl\.pathname\}\/`;/u);
	assert.match(releaseVersionCheckScript, /new URL\(packagePath, registryUrl\)/u);
	assert.doesNotMatch(releaseVersionCheckScript, /packageJson\.name\.replace\(/u);
	assert.doesNotMatch(releaseVersionCheckScript, /\.replace\(['"]\/['"],\s*['"]%2F['"]\)/u);
});

test('npm package includes compiled cli, schema contracts, and default template sources', async () => {
	const publicJsonContracts = await readPublicJsonContracts();
	const result = spawnSync('npm pack --dry-run --json --ignore-scripts', {
		cwd: projectRoot,
		encoding: 'utf8',
		shell: true,
	});

	assert.equal(result.status, 0);
	const [pack] = JSON.parse(result.stdout);
	const files = new Set(pack.files.map((file) => file.path));

	assert.ok(files.has('dist/cli/index.js'));
	assert.ok(files.has('dist/cli/commands/adapters.js'));
	assert.ok(files.has('dist/cli/commands/classify.js'));
	assert.ok(files.has('dist/cli/commands/contract-lint.js'));
	assert.ok(files.has('dist/cli/commands/onboard.js'));
	assert.ok(files.has('dist/cli/commands/next.js'));
	assert.ok(files.has('dist/cli/commands/evidence.js'));
	assert.ok(files.has('dist/cli/commands/workspace.js'));
	assert.ok(files.has('dist/cli/commands/init.js'));
	assert.ok(files.has('dist/cli/commands/docs.js'));
	assert.ok(files.has('dist/cli/commands/index.js'));
	assert.ok(files.has('dist/cli/commands/line-endings.js'));
	assert.ok(files.has('dist/cli/commands/quality.js'));
	assert.ok(files.has('dist/cli/commands/explain.js'));
	assert.ok(files.has('dist/cli/commands/handoff.js'));
	assert.ok(files.has('dist/core/line-endings.js'));
	assert.ok(files.has('dist/core/quality-gaming.js'));
	assert.ok(files.has('dist/core/source-anchor-explanation.js'));
	assert.ok(files.has('dist/core/source-anchors.js'));
	assert.ok(files.has('dist/cli/commands/impact.js'));
	assert.ok(files.has('dist/cli/commands/search.js'));
	assert.ok(files.has('dist/cli/commands/dashboard.js'));
	assert.ok(files.has('dist/cli/commands/update.js'));
	assert.ok(files.has('dist/cli/commands/verify.js'));
	assert.ok(files.has('dist/cli/lib/external-skill-import.js'));
	assert.ok(files.has('dist/core/contract-models.js'));
	assert.ok(files.has('dist/core/adapter-compatibility.js'));
	assert.ok(files.has('dist/core/handoff-record.js'));
	assert.ok(files.has('dist/core/generated-boundary.js'));
	assert.ok(files.has('dist/core/config-chain.js'));
	assert.ok(files.has('dist/core/env-contract.js'));
	assert.ok(files.has('dist/core/secret-risk-scan.js'));
	assert.ok(files.has('dist/core/security-pattern-scan.js'));
	assert.ok(files.has('dist/core/docs-link-integrity.js'));
	assert.ok(files.has('dist/core/related-files.js'));
	assert.ok(files.has('dist/core/skill-route-audit.js'));
	assert.ok(files.has('dist/core/repo-version-source.js'));
	assert.ok(files.has('dist/core/repo-approval-gate.js'));
	assert.ok(files.has('dist/core/repo-deploy-surface.js'));
	assert.ok(files.has('dist/core/repo-merge-conflict-scan.js'));
	assert.ok(files.has('dist/core/repo-git-ignore-audit.js'));
	assert.ok(files.has('dist/core/repo-manifest-lock-drift.js'));
	assert.ok(files.has('dist/core/code-outline.js'));
	assert.ok(files.has('dist/core/dependency-graph.js'));
	assert.ok(files.has('dist/core/import-cycle.js'));
	assert.ok(files.has('dist/core/module-boundary.js'));
	assert.ok(files.has('dist/core/change-impact.js'));
	assert.ok(files.has('dist/core/test-performance-report.js'));
	assert.ok(files.has('dist/core/test-regression-selector.js'));
	assert.ok(files.has('dist/core/route-outline.js'));
	assert.ok(files.has('dist/core/export-diff.js'));
	assert.ok(files.has('dist/core/script-pack-suggestions.js'));
	assert.ok(files.has('dist/core/doc-review-triage.js'));
	assert.ok(files.has('dist/core/public-json-contracts.js'));
	assert.ok(files.has('dist/core/surface-decision-model.js'));
	assert.ok(files.has('dist/cli/script-packs/core-text-budget.js'));
	assert.ok(files.has('dist/cli/script-packs/code-export-diff.js'));
	assert.ok(files.has('dist/cli/script-packs/code-dependency-graph.js'));
	assert.ok(files.has('dist/cli/script-packs/code-import-cycle.js'));
	assert.ok(files.has('dist/cli/script-packs/code-module-boundary.js'));
	assert.ok(files.has('dist/cli/script-packs/code-change-impact.js'));
	assert.ok(files.has('dist/cli/script-packs/code-outline.js'));
	assert.ok(files.has('dist/cli/script-packs/code-route-outline.js'));
	assert.ok(files.has('dist/cli/script-packs/test-performance-report.js'));
	assert.ok(files.has('dist/cli/script-packs/test-regression-selector.js'));
	assert.ok(files.has('dist/cli/script-packs/repo-config-chain.js'));
	assert.ok(files.has('dist/cli/script-packs/repo-env-contract.js'));
	assert.ok(files.has('dist/cli/script-packs/repo-secret-risk-scan.js'));
	assert.ok(files.has('dist/cli/script-packs/repo-security-pattern-scan.js'));
	assert.ok(files.has('dist/cli/script-packs/repo-generated-boundary.js'));
	assert.ok(files.has('dist/cli/script-packs/repo-skill-route-audit.js'));
	assert.ok(files.has('dist/cli/script-packs/repo-version-source.js'));
	assert.ok(files.has('dist/cli/script-packs/repo-approval-gate.js'));
	assert.ok(files.has('dist/cli/script-packs/repo-deploy-surface.js'));
	assert.ok(files.has('dist/cli/script-packs/repo-merge-conflict-scan.js'));
	assert.ok(files.has('dist/cli/script-packs/repo-git-ignore-audit.js'));
	assert.ok(files.has('dist/cli/script-packs/repo-manifest-lock-drift.js'));
	assert.ok(files.has('dist/cli/script-packs/docs-link-integrity.js'));
	assert.ok(files.has('dist/cli/script-packs/repo-related-files.js'));
	assert.ok(files.has('templates/default/manifest.toml'));
	assert.ok(files.has('templates/default/i18n.toml'));
	assert.ok(files.has('dist/cli/lib/template-i18n.js'));
	assert.ok(files.has('templates/default/common/.mustflow/config/commands.toml'));
	assert.ok(files.has('templates/default/common/.mustflow/config/preferences.toml'));
	assert.ok(files.has('schemas/doctor-report.schema.json'));
	assert.ok(files.has('schemas/adapter-compatibility-report.schema.json'));
	assert.ok(files.has('schemas/context-report.schema.json'));
	assert.ok(files.has('schemas/run-receipt.schema.json'));
	assert.ok(files.has('schemas/commands.schema.json'));
	assert.ok(files.has('schemas/contract-lint-report.schema.json'));
	assert.ok(files.has('schemas/onboard-commands-report.schema.json'));
	assert.ok(files.has('schemas/next-report.schema.json'));
	assert.ok(files.has('schemas/evidence-report.schema.json'));
	assert.ok(files.has('schemas/workspace-status.schema.json'));
	assert.ok(files.has('schemas/workspace-command-catalog.schema.json'));
	assert.ok(files.has('schemas/workspace-command-fragments.schema.json'));
	assert.ok(files.has('schemas/workspace-verification-plan.schema.json'));
	assert.ok(files.has('schemas/classify-report.schema.json'));
	assert.ok(files.has('schemas/docs-review-list.schema.json'));
	assert.ok(files.has('schemas/explain-report.schema.json'));
	assert.ok(files.has('schemas/handoff-validation-report.schema.json'));
	assert.ok(files.has('schemas/impact-report.schema.json'));
	assert.ok(files.has('schemas/line-endings-report.schema.json'));
	assert.ok(files.has('schemas/config-chain-report.schema.json'));
	assert.ok(files.has('schemas/env-contract-report.schema.json'));
	assert.ok(files.has('schemas/secret-risk-scan-report.schema.json'));
	assert.ok(files.has('schemas/security-pattern-scan-report.schema.json'));
	assert.ok(files.has('schemas/link-integrity-report.schema.json'));
	assert.ok(files.has('schemas/skill-route-audit-report.schema.json'));
	assert.ok(files.has('schemas/skill-import-report.schema.json'));
	assert.ok(files.has('schemas/repo-version-source-report.schema.json'));
	assert.ok(files.has('schemas/repo-toolchain-provenance-report.schema.json'));
	assert.ok(files.has('schemas/repo-automation-surface-report.schema.json'));
	assert.ok(files.has('schemas/repo-dependency-surface-report.schema.json'));
	assert.ok(files.has('schemas/repo-approval-gate-report.schema.json'));
	assert.ok(files.has('schemas/repo-deploy-surface-report.schema.json'));
	assert.ok(files.has('schemas/repo-merge-conflict-scan-report.schema.json'));
	assert.ok(files.has('schemas/repo-git-ignore-audit-report.schema.json'));
	assert.ok(files.has('schemas/repo-manifest-lock-drift-report.schema.json'));
	assert.ok(files.has('schemas/generated-boundary-report.schema.json'));
	assert.ok(files.has('schemas/related-files-report.schema.json'));
	assert.ok(files.has('schemas/script-pack-suggestion-report.schema.json'));
	assert.ok(files.has('schemas/quality-gaming-report.schema.json'));
	assert.ok(files.has('schemas/code-outline-report.schema.json'));
	assert.ok(files.has('schemas/dependency-graph-report.schema.json'));
	assert.ok(files.has('schemas/import-cycle-report.schema.json'));
	assert.ok(files.has('schemas/module-boundary-report.schema.json'));
	assert.ok(files.has('schemas/change-impact-report.schema.json'));
	assert.ok(files.has('schemas/code-symbol-read-report.schema.json'));
	assert.ok(files.has('schemas/route-outline-report.schema.json'));
	assert.ok(files.has('schemas/export-diff-report.schema.json'));
	assert.ok(files.has('schemas/test-performance-report.schema.json'));
	assert.ok(files.has('schemas/test-regression-selector-report.schema.json'));
	assert.ok(files.has('schemas/verify-report.schema.json'));
	for (const contract of publicJsonContracts) {
		assert.ok(files.has(`schemas/${contract.schemaFile}`), `${contract.schemaFile} should be packaged`);
	}
	assert.ok(files.has('examples/README.md'));
	assert.ok(files.has('examples/docs-only/README.md'));
	assert.ok(files.has('examples/host-instruction-conflicts/README.md'));
	assert.ok(files.has('examples/minimal-js/README.md'));
	assert.ok(files.has('examples/missing-command-contracts/README.md'));
	assert.ok(files.has('examples/nested-repos/README.md'));
	for (const locale of supportedTemplateLocales) {
		assert.ok(files.has(`templates/default/locales/${locale}/AGENTS.md`));
	}
	for (const relativePath of templateCreates) {
		assert.ok(
			files.has(`templates/default/common/${relativePath}`) ||
				files.has(`templates/default/locales/en/${relativePath}`),
			`${relativePath} should be packaged from the common template root or canonical locale`,
		);
	}
	for (const relativePath of templateSkillCreates) {
		assert.ok(files.has(`templates/default/locales/en/${relativePath}`), `${relativePath} should be packaged from the canonical locale`);
	}
	for (const locale of supportedTemplateLocales.filter((entry) => entry !== 'en')) {
		const localizedSkillPrefix = `templates/default/locales/${locale}/.mustflow/skills/`;

		assert.equal(
			Array.from(files).some((file) => file.startsWith(localizedSkillPrefix)),
			false,
			`${locale} should not package duplicated localized skill files`,
		);
	}
	assert.equal(files.has('templates/default/files/AGENTS.md'), false);
	assert.equal(files.has('dist/cli/lib/package-manager.js'), false);
	assert.equal(files.has('docs-site/package.json'), false);
	assert.equal(files.has('tests/cli/init.test.js'), false);
});
