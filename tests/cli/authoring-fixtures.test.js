import assert from 'node:assert/strict';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

const projectRoot = path.resolve(fileURLToPath(new URL('../..', import.meta.url)));
const fixturesRoot = path.join(projectRoot, 'tests', 'fixtures', 'authoring');

const expectedFixtures = [
	'conflicting-public-docs',
	'docs-only',
	'empty-repository',
	'host-instruction-conflict',
	'malformed-skill',
	'missing-command-contracts',
	'polyglot-monorepo',
	'private-looking-secrets',
	'readme-only',
	'risky-domain',
];

function readText(relativePath) {
	const sourcePath = relativePath.startsWith('.mustflow/')
		? path.join(projectRoot, 'templates', 'default', 'locales', 'en', relativePath)
		: path.join(projectRoot, relativePath);

	return readFileSync(sourcePath, 'utf8');
}

function readFixture(name) {
	const filePath = path.join(fixturesRoot, name, 'fixture.json');
	return JSON.parse(readFileSync(filePath, 'utf8'));
}

function listFiles(root, base = root) {
	return readdirSync(root).flatMap((entry) => {
		const entryPath = path.join(root, entry);
		if (statSync(entryPath).isDirectory()) {
			return listFiles(entryPath, base);
		}
		return [path.relative(base, entryPath).replaceAll('\\', '/')];
	});
}

test('authoring fixtures cover declared repository shapes', () => {
	const fixtureNames = readdirSync(fixturesRoot)
		.filter((name) => statSync(path.join(fixturesRoot, name)).isDirectory())
		.sort((left, right) => left.localeCompare(right));

	assert.deepEqual(fixtureNames, expectedFixtures);

	for (const name of expectedFixtures) {
		const fixture = readFixture(name);
		assert.equal(fixture.schema_version, '1');
		assert.equal(fixture.name, name);
		assert.equal(typeof fixture.purpose, 'string');
		assert.ok(fixture.purpose.length > 20);
		assert.ok(Array.isArray(fixture.expected_authoring_boundary));
		assert.ok(fixture.expected_authoring_boundary.length > 0);
	}

	assert.deepEqual(listFiles(path.join(fixturesRoot, 'readme-only')).sort(), ['README.md', 'fixture.json']);
	assert.ok(existsSync(path.join(fixturesRoot, 'docs-only', 'docs', 'guide.md')));
	assert.equal(existsSync(path.join(fixturesRoot, 'docs-only', 'README.md')), false);
	assert.ok(existsSync(path.join(fixturesRoot, 'polyglot-monorepo', 'package.json')));
	assert.ok(existsSync(path.join(fixturesRoot, 'polyglot-monorepo', 'pyproject.toml')));
	assert.ok(existsSync(path.join(fixturesRoot, 'polyglot-monorepo', 'go.mod')));
	assert.ok(existsSync(path.join(fixturesRoot, 'malformed-skill', 'SKILL.md')));
	assert.ok(existsSync(path.join(fixturesRoot, 'missing-command-contracts', 'package.json')));
	assert.ok(existsSync(path.join(fixturesRoot, 'host-instruction-conflict', 'AGENTS.md')));
	assert.ok(existsSync(path.join(fixturesRoot, 'host-instruction-conflict', '.github', 'copilot-instructions.md')));
});

test('authoring fixtures avoid active secrets and active mustflow roots', () => {
	const files = listFiles(fixturesRoot);
	const combined = files
		.map((relativePath) => `${relativePath}\n${readFileSync(path.join(fixturesRoot, relativePath), 'utf8')}`)
		.join('\n');

	assert.equal(files.some((relativePath) => relativePath.includes('.mustflow/')), false);
	assert.doesNotMatch(combined, /sk-[A-Za-z0-9]{20,}/u);
	assert.doesNotMatch(combined, /ghp_[A-Za-z0-9]{20,}/u);
	assert.doesNotMatch(combined, /AKIA[0-9A-Z]{16}/u);
	assert.doesNotMatch(combined, /-----BEGIN [A-Z ]*PRIVATE KEY-----/u);
	assert.match(readText('tests/fixtures/authoring/private-looking-secrets/env.example'), /EXAMPLE_/u);
	assert.match(readText('tests/fixtures/authoring/private-looking-secrets/README.md'), /not real secrets/u);
});

test('authoring fixtures cover missing command and host conflict boundaries', () => {
	const missingCommand = readFixture('missing-command-contracts');
	const hostConflict = readFixture('host-instruction-conflict');
	const packageJson = JSON.parse(readText('tests/fixtures/authoring/missing-command-contracts/package.json'));
	const hostInstruction = readText(
		'tests/fixtures/authoring/host-instruction-conflict/.github/copilot-instructions.md',
	);
	const repositoryInstruction = readText('tests/fixtures/authoring/host-instruction-conflict/AGENTS.md');

	assert.ok(packageJson.scripts.test);
	assert.ok(packageJson.scripts.lint);
	assert.match(missingCommand.expected_authoring_boundary.join('\n'), /Do not infer runnable commands/u);
	assert.match(missingCommand.expected_authoring_boundary.join('\n'), /manual-only command intents/u);

	assert.match(hostInstruction, /npm test/u);
	assert.match(repositoryInstruction, /command intents declared/u);
	assert.match(hostConflict.expected_authoring_boundary.join('\n'), /outside the mustflow command contract/u);
	assert.match(hostConflict.expected_authoring_boundary.join('\n'), /compatible style guidance/u);
});
