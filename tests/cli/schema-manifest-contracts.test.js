import {
	appendIntent,
	assert,
	assertMatchesSchema,
	cliPath,
	commitGitBaseline,
	compareSemver,
	createTempProject,
	initProject,
	mkdirSync,
	path,
	pathToFileURL,
	projectRoot,
	readdirSync,
	readFileSync,
	readPublicJsonContracts,
	readSchema,
	readVerificationSkipReasons,
	refreshManifestLockHash,
	removeTempProject,
	runCli,
	runGit,
	schemaBackcompatRoot,
	schemaRoot,
	spawnSync,
	test,
	writeFileSync,
} from './helpers/schema-contracts.js';

test('public json schema manifest covers schema files and documentation', async () => {
	const contracts = await readPublicJsonContracts();
	const contractFiles = contracts.map((contract) => contract.schemaFile).sort((left, right) => left.localeCompare(right));
	const actualFiles = readdirSync(schemaRoot)
		.filter((file) => file.endsWith('.schema.json'))
		.sort((left, right) => left.localeCompare(right));
	const readme = readFileSync(path.join(schemaRoot, 'README.md'), 'utf8');

	assert.deepEqual(contractFiles, actualFiles);

	for (const contract of contracts) {
		assert.equal(contract.packaged, true, `${contract.schemaFile} should be packaged`);
		assert.equal(contract.documented, true, `${contract.schemaFile} should be documented`);
		assert.ok(contract.producer.length > 0, `${contract.schemaFile} should declare a producer`);
		assert.match(readme, new RegExp(`\`${contract.schemaFile.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\``));
	}
});

test('verification skip reason schemas stay aligned with core plan reasons', async () => {
	const expectedReasons = await readVerificationSkipReasons();
	const changeVerificationSchema = readSchema('change-verification-report.schema.json');
	const explainSchema = readSchema('explain-report.schema.json');
	const changeVerificationReasons = [...changeVerificationSchema.$defs.skipReason.enum].sort((left, right) =>
		left.localeCompare(right),
	);
	const explainReasons = explainSchema.$defs.verificationCandidate.properties.skipReason.enum
		.filter((reason) => reason !== null)
		.sort((left, right) => left.localeCompare(right));

	assert.deepEqual(changeVerificationReasons, expectedReasons);
	assert.deepEqual(explainReasons, expectedReasons);
});

test('source skill route fixtures match the published schema', () => {
	const fixture = JSON.parse(readFileSync(path.join(projectRoot, '.mustflow', 'skills', 'route-fixtures.json'), 'utf8'));

	assertMatchesSchema(schemaRoot, 'route-fixture.schema.json', fixture);
});

test('public json schema backward-compatibility fixtures match current schemas', async () => {
	const contracts = await readPublicJsonContracts();
	const contractsBySchemaFile = new Map(contracts.map((contract) => [contract.schemaFile, contract]));
	const fixtureVersions = readdirSync(schemaBackcompatRoot, { withFileTypes: true })
		.filter((entry) => entry.isDirectory())
		.map((entry) => entry.name)
		.sort(compareSemver);

	assert.ok(fixtureVersions.length > 0, 'at least one schema backcompat fixture version should exist');

	let newestFixtureSchemas = [];

	for (const fixtureVersion of fixtureVersions) {
		assert.match(fixtureVersion, /^\d+\.\d+\.\d+$/, `${fixtureVersion} should be a semantic version`);

		const fixturePath = path.join(schemaBackcompatRoot, fixtureVersion, 'public-json-fixtures.json');
		const fixtureSet = JSON.parse(readFileSync(fixturePath, 'utf8'));
		const seenSchemaFiles = new Set();

		assert.equal(fixtureSet.fixture_version, fixtureVersion);
		assert.equal(fixtureSet.schema_version, '1');
		assert.ok(Array.isArray(fixtureSet.fixtures), `${fixturePath} should contain fixtures`);

		for (const entry of fixtureSet.fixtures) {
			assert.equal(typeof entry.id, 'string', 'backcompat fixture id should be a string');
			assert.equal(typeof entry.schema_file, 'string', `${entry.id} should declare schema_file`);
			assert.equal(typeof entry.producer, 'string', `${entry.id} should declare producer`);
			assert.ok(Object.hasOwn(entry, 'fixture'), `${entry.id} should include a fixture object`);
			assert.equal(seenSchemaFiles.has(entry.schema_file), false, `${entry.schema_file} fixture should not be duplicated`);

			const currentContract = contractsBySchemaFile.get(entry.schema_file);
			assert.ok(currentContract, `${entry.schema_file} should still be a public JSON schema contract`);
			assert.equal(entry.id, currentContract.id, `${entry.schema_file} fixture id should match the public contract`);
			assert.equal(entry.producer, currentContract.producer, `${entry.schema_file} fixture producer should match the public contract`);

			assertMatchesSchema(schemaRoot, entry.schema_file, entry.fixture);
			seenSchemaFiles.add(entry.schema_file);
		}

		newestFixtureSchemas = [...seenSchemaFiles].sort((left, right) => left.localeCompare(right));
	}

	const currentSchemaFiles = contracts.map((contract) => contract.schemaFile).sort((left, right) => left.localeCompare(right));
	assert.deepEqual(newestFixtureSchemas, currentSchemaFiles);
});
