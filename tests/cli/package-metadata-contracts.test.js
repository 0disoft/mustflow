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

test('package metadata is ready for public npm publishing', () => {
	assert.equal(packageJson.version, '2.115.1');
	assert.equal(packageJson.license, 'MIT-0');
	assert.equal(packageJson.homepage, 'https://0disoft.github.io/mustflow/');
	assert.deepEqual(packageJson.repository, {
		type: 'git',
		url: 'git+https://github.com/0disoft/mustflow.git',
	});
	assert.deepEqual(packageJson.bugs, {
		url: 'https://github.com/0disoft/mustflow/issues',
	});
	assert.deepEqual(packageJson.publishConfig, {
		access: 'public',
	});
	assert.match(packageJson.description, /agent workflow/i);
	assert.ok(packageJson.keywords.includes('agent-workflow'));
	assert.ok(packageJson.keywords.includes('agents-md'));
	assert.equal(packageJson.packageManager, 'bun@1.3.13');
});

test('default template manifest version stays synchronized with package version', () => {
	assert.match(templateManifest, new RegExp(`^version = "${packageJson.version}"$`, 'm'));
});

test('package exposes a real install verification script', () => {
	assert.equal(packageJson.scripts.prepack, 'npm run build');
	assert.equal(packageJson.scripts.test, 'bun run test:full');
	assert.equal(packageJson.scripts['test:fast'], 'node scripts/run-cli-tests.mjs --build fast');
	assert.equal(packageJson.scripts['test:related'], 'node scripts/run-cli-tests.mjs --build=auto related');
	assert.equal(packageJson.scripts['test:related:cached'], 'node scripts/run-cli-tests.mjs related-cached');
	assert.equal(packageJson.scripts['test:related:profile'], 'node scripts/run-cli-tests.mjs --build related-profile');
	assert.equal(packageJson.scripts['test:cli'], 'node scripts/run-cli-tests.mjs --build cli');
	assert.equal(packageJson.scripts['test:coverage'], 'node scripts/run-cli-tests.mjs --build coverage');
	assert.equal(packageJson.scripts['test:audit'], 'node scripts/audit-tests.mjs --json');
	assert.equal(packageJson.scripts['test:audit:related'], 'node scripts/audit-related-selection.mjs');
	assert.equal(packageJson.scripts['test:ops'], 'node scripts/analyze-test-ops.mjs');
	assert.equal(packageJson.scripts['test:release'], 'node scripts/run-cli-tests.mjs --build release');
	assert.equal(packageJson.scripts['test:fast:node'], 'node scripts/run-cli-tests.mjs --build-runner=npm fast');
	assert.equal(packageJson.scripts['test:release:node'], 'node scripts/run-cli-tests.mjs --build-runner=npm release');
	assert.equal(packageJson.scripts['test:full'], 'node scripts/run-cli-tests.mjs --build full-auto');
	assert.equal(packageJson.scripts['test:full:auto'], 'node scripts/run-cli-tests.mjs --build full-auto');
	assert.equal(packageJson.scripts['test:full:profile'], 'node scripts/run-cli-tests.mjs --build full-profile');
	assert.equal(packageJson.scripts['test:full:serial'], 'node scripts/run-cli-tests.mjs --build full');
	assert.equal(packageJson.scripts.check, 'bun run check:package && bun run test:full');
	assert.equal(packageJson.scripts['check:core:node'], 'node scripts/run-node-core-check.mjs');
	assert.doesNotMatch(packageJson.scripts['check:core:node'], /\bbun\b/u);
	assert.equal(packageJson.scripts['check:pack'], 'npm pack --dry-run --json --ignore-scripts');
	assert.equal(packageJson.scripts['check:install'], 'npm run check:pack && node --test tests/integration/*.test.js');
	assert.equal(packageJson.scripts['release:check'], 'npm run check && npm run docs:check && npm run check:install');
	assert.equal(packageJson.scripts['docs:check:fast'], 'bun run --cwd docs-site check:fast');
	assert.equal(packageJson.scripts.prepublishOnly, 'npm run release:check');
});
