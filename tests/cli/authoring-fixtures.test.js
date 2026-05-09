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
	'malformed-skill',
	'polyglot-monorepo',
	'private-looking-secrets',
	'readme-only',
	'risky-domain',
];

function readText(relativePath) {
	return readFileSync(path.join(projectRoot, relativePath), 'utf8');
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
});

test('README and project context authoring routes stay separated', () => {
	const readmeSkill = readText('.mustflow/skills/readme-authoring/SKILL.md');
	const projectContextSkill = readText('.mustflow/skills/project-context-authoring/SKILL.md');
	const skillIndex = readText('.mustflow/skills/INDEX.md');

	assert.match(readmeSkill, /root `README\.md`/u);
	assert.match(readmeSkill, /repository-supported evidence/u);
	assert.match(readmeSkill, /missing inputs can be reported without guessing/u);
	assert.match(readmeSkill, /marketing copy/u);
	assert.match(projectContextSkill, /The task only updates root `README\.md`/u);

	assert.match(skillIndex, /`README\.md` is created, restructured, or substantially rewritten/u);
	assert.match(skillIndex, /invented project claims/u);
	assert.match(skillIndex, /loss of human-authored intent/u);
	assert.match(skillIndex, /`\.mustflow\/context\/PROJECT\.md` needs cautious project context/u);
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
