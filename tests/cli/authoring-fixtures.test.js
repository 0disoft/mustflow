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
	assert.ok(existsSync(path.join(fixturesRoot, 'missing-command-contracts', 'package.json')));
	assert.ok(existsSync(path.join(fixturesRoot, 'host-instruction-conflict', 'AGENTS.md')));
	assert.ok(existsSync(path.join(fixturesRoot, 'host-instruction-conflict', '.github', 'copilot-instructions.md')));
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

test('repro-first debug skill keeps diagnosis loop boundaries explicit', () => {
	const localSkill = readText('.mustflow/skills/repro-first-debug/SKILL.md');
	const templateSkill = readText('templates/default/locales/en/.mustflow/skills/repro-first-debug/SKILL.md');
	const skillIndex = readText('.mustflow/skills/INDEX.md');

	assert.equal(localSkill, templateSkill);
	assert.match(localSkill, /three to five plausible hypotheses/u);
	assert.match(localSkill, /unique marker/u);
	assert.match(localSkill, /Re-run the original reproduction path/u);
	assert.match(localSkill, /Temporary instrumentation and debug output are removed/u);
	assert.match(skillIndex, /hypotheses, observations, fix, original reproduction rerun/u);
});

test('vertical slice TDD skill stays explicitly triggered and template-synced', () => {
	const localSkill = readText('.mustflow/skills/vertical-slice-tdd/SKILL.md');
	const templateSkill = readText('templates/default/locales/en/.mustflow/skills/vertical-slice-tdd/SKILL.md');
	const skillIndex = readText('.mustflow/skills/INDEX.md');

	assert.equal(localSkill, templateSkill);
	assert.match(localSkill, /TDD is explicitly requested/u);
	assert.match(localSkill, /one vertical behavior slice/u);
	assert.match(localSkill, /`behavior_red` is the only valid behavior RED/u);
	assert.match(localSkill, /Refactor only after GREEN/u);
	assert.match(localSkill, /Invalid RED and scaffold-only RED are not reported as behavior coverage/u);
	assert.match(skillIndex, /one observable behavior slice at a time/u);
	assert.match(skillIndex, /remaining TDD risk/u);
});

test('ui quality gate folds external UI review lessons into mustflow boundaries', () => {
	const localSkill = readText('.mustflow/skills/ui-quality-gate/SKILL.md');
	const templateSkill = readText('templates/default/locales/en/.mustflow/skills/ui-quality-gate/SKILL.md');

	assert.equal(localSkill, templateSkill);
	assert.match(localSkill, /task-essential controls/u);
	assert.match(localSkill, /keyboard and focus/u);
	assert.match(localSkill, /accessible names and states/u);
	assert.match(localSkill, /text overlap/u);
	assert.match(localSkill, /localization-safe labels/u);
	assert.match(localSkill, /performance and asset-size/u);
	assert.match(localSkill, /configured one-shot command or approved browser workflow/u);
	assert.match(localSkill, /Do not start development servers, watchers, or browser sessions directly/u);
});

test('architecture deepening review stays review-first and template-synced', () => {
	const localSkill = readText('.mustflow/skills/architecture-deepening-review/SKILL.md');
	const templateSkill = readText('templates/default/locales/en/.mustflow/skills/architecture-deepening-review/SKILL.md');
	const skillIndex = readText('.mustflow/skills/INDEX.md');

	assert.equal(localSkill, templateSkill);
	assert.match(localSkill, /review-first skill/u);
	assert.match(localSkill, /one to three candidate boundaries/u);
	assert.match(localSkill, /Score each candidate from 1 to 9/u);
	assert.match(localSkill, /It is not a license to create architecture because a pattern exists/u);
	assert.match(localSkill, /If implementation proceeds, use the narrower matching skill/u);
	assert.match(skillIndex, /Architecture, module boundaries, codebase structure/u);
	assert.match(skillIndex, /candidate scores, selected next action, narrower skill choice/u);
});

test('release notes authoring avoids invented history and stays template-synced', () => {
	const localSkill = readText('.mustflow/skills/release-notes-authoring/SKILL.md');
	const templateSkill = readText('templates/default/locales/en/.mustflow/skills/release-notes-authoring/SKILL.md');
	const skillIndex = readText('.mustflow/skills/INDEX.md');

	assert.equal(localSkill, templateSkill);
	assert.match(localSkill, /user-provided change summaries/u);
	assert.match(localSkill, /current diff summaries/u);
	assert.match(localSkill, /no configured read-only release-history intent exists/u);
	assert.match(localSkill, /do not infer release history from raw Git commands/u);
	assert.match(localSkill, /internal_only/u);
	assert.match(skillIndex, /Release notes, changelog entries, public change summaries/u);
	assert.match(skillIndex, /skipped release-history checks/u);
});

test('date number audit classifies release version impact from public contracts', () => {
	const localSkill = readText('.mustflow/skills/date-number-audit/SKILL.md');
	const templateSkill = readText('templates/default/locales/en/.mustflow/skills/date-number-audit/SKILL.md');

	assert.equal(localSkill, templateSkill);
	assert.match(localSkill, /major`, `minor`, `patch`, or `no_release`/u);
	assert.match(localSkill, /Classify changed public contracts first/u);
	assert.match(localSkill, /documented or exported CLI commands/u);
	assert.match(localSkill, /Do not treat undocumented private helpers/u);
	assert.match(localSkill, /Tag a change as `MAJOR`/u);
	assert.match(localSkill, /Tag a change as `MINOR`/u);
	assert.match(localSkill, /Tag a change as `PATCH`/u);
	assert.match(localSkill, /Tag a change as `NO_RELEASE`/u);
	assert.match(localSkill, /Treat enums as closed unless their documentation explicitly says/u);
	assert.match(localSkill, /use the highest tag/u);
});

test('source freshness check covers external research intake without authority drift', () => {
	const localSkill = readText('.mustflow/skills/source-freshness-check/SKILL.md');
	const templateSkill = readText('templates/default/locales/en/.mustflow/skills/source-freshness-check/SKILL.md');
	const skillIndex = readText('.mustflow/skills/INDEX.md');

	assert.equal(localSkill, templateSkill);
	assert.match(localSkill, /external research material from becoming product authority/u);
	assert.match(localSkill, /split the input into evidence, recommendation, executable instruction, popularity signal, and speculation/u);
	assert.match(localSkill, /mapped to existing mustflow command intents or reported as missing intent coverage/u);
	assert.match(localSkill, /repository-owned surface/u);
	assert.match(localSkill, /activate `external-prompt-injection-defense`/u);
	assert.match(skillIndex, /research notes, methodology recommendations, tool comparisons/u);
	assert.match(skillIndex, /copied external authority/u);
});

test('external skill intake defers web testing and handoff runtime boundaries', () => {
	const localSkill = readText('.mustflow/skills/external-skill-intake/SKILL.md');
	const templateSkill = readText('templates/default/locales/en/.mustflow/skills/external-skill-intake/SKILL.md');
	const skillIndex = readText('.mustflow/skills/INDEX.md');

	assert.equal(localSkill, templateSkill);
	assert.match(localSkill, /Playwright-style web testing/u);
	assert.match(localSkill, /configured one-shot intent that starts, tests, and stops/u);
	assert.match(localSkill, /Do not tell agents to start a development server, watcher, browser session, or local server directly/u);
	assert.match(localSkill, /restricted ledger shape: goal, scope, touched files, verification plan/u);
	assert.match(localSkill, /Do not create a free-form handoff skill that stores hidden reasoning/u);
	assert.match(localSkill, /Deferred prerequisites such as bounded web-smoke intent or restricted handoff ledger/u);
	assert.match(skillIndex, /External `SKILL\.md` files, skill packs, awesome lists/u);
	assert.match(skillIndex, /default-profile bloat/u);
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
