import assert from 'node:assert/strict';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { test } from 'node:test';
import { fileURLToPath, pathToFileURL } from 'node:url';

const projectRoot = path.resolve(fileURLToPath(new URL('../..', import.meta.url)));

async function readImportModule() {
	return import(pathToFileURL(path.join(projectRoot, 'dist', 'cli', 'lib', 'external-skill-import.js')).href);
}

async function readRouteModule() {
	return import(pathToFileURL(path.join(projectRoot, 'dist', 'core', 'skill-route-resolution.js')).href);
}

function createTempProject() {
	return mkdtempSync(path.join(tmpdir(), 'mustflow-skill-import-'));
}

function createTempCommandContract(projectPath) {
	const configPath = path.join(projectPath, '.mustflow', 'config');
	mkdirSync(configPath, { recursive: true });
	writeFileSync(
		path.join(configPath, 'commands.toml'),
		[
			'schema_version = "1"',
			'',
			'[intents.existing_check]',
			'status = "manual_only"',
			'reason = "fixture"',
			'',
		].join('\n'),
	);
}

function removeTempProject(projectPath) {
	rmSync(projectPath, { recursive: true, force: true });
}

function jsonResponse(value, status = 200) {
	return {
		ok: status >= 200 && status < 300,
		status,
		async json() {
			return value;
		},
		async text() {
			return JSON.stringify(value);
		},
	};
}

function createMockFetch() {
	const skillBody = [
		'---',
		'mustflow_doc: skill.concurrency-review',
		'locale: en',
		'canonical: true',
		'revision: 99',
		'lifecycle: mustflow-owned',
		'authority: binding',
		'name: concurrency-review',
		'description: Review multi-agent parallel work boundaries, shared files, ports, caches, generated outputs, and final integration ownership.',
		'allowed-tools:',
		'  - shell',
		'metadata:',
		'  mustflow_schema: "1"',
		'  mustflow_kind: procedure',
		'  command_intents:',
		'    - git_commit',
		'---',
		'# Concurrency Review',
		'',
		'Use when external agents may touch shared state.',
		'',
	].join('\n');
	const scriptBody = 'echo "reference only"\n';

	return async function mockFetch(url) {
		const value = String(url);

		if (value.includes('/contents/review/concurrency/SKILL.md?ref=main')) {
			return jsonResponse({
				type: 'file',
				name: 'SKILL.md',
				path: 'review/concurrency/SKILL.md',
				content: Buffer.from(skillBody, 'utf8').toString('base64'),
				encoding: 'base64',
			});
		}

		if (value.includes('/contents/review/concurrency/scripts?ref=main')) {
			return jsonResponse([
				{
					type: 'file',
					name: 'inspect.sh',
					path: 'review/concurrency/scripts/inspect.sh',
				},
			]);
		}

		if (value.includes('/contents/review/concurrency/scripts/inspect.sh?ref=main')) {
			return jsonResponse({
				type: 'file',
				name: 'inspect.sh',
				path: 'review/concurrency/scripts/inspect.sh',
				content: Buffer.from(scriptBody, 'utf8').toString('base64'),
				encoding: 'base64',
			});
		}

		return jsonResponse({ message: 'not found' }, 404);
	};
}

test('external skill import dry-run previews files without writing', async () => {
	const projectPath = createTempProject();

	try {
		const { createExternalSkillImportReport } = await readImportModule();
		const report = await createExternalSkillImportReport(
			projectPath,
			'https://github.com/example/agent-skills/tree/main/review/concurrency',
			{
				mode: 'dry_run',
				fetch: createMockFetch(),
			},
		);

		assert.equal(report.ok, true);
		assert.equal(report.status, 'preview');
		assert.equal(report.wrote_files, false);
		assert.equal(report.target.skill_name, 'concurrency-review');
		assert.equal(report.target.skill_dir, '.mustflow/external-skills/concurrency-review');
		assert.equal(report.files.some((file) => file.relative_path === 'SKILL.md'), true);
		assert.equal(report.files.some((file) => file.kind === 'script'), true);
		assert.equal(report.script_trust.status, 'not_requested');
		assert.match(report.warnings.join('\n'), /scripts are inert/u);
		assert.equal(existsSync(path.join(projectPath, '.mustflow', 'external-skills')), false);
	} finally {
		removeTempProject(projectPath);
	}
});

test('external skill import installs under external-skills and route resolver can select it', async () => {
	const projectPath = createTempProject();

	try {
		const { createExternalSkillImportReport } = await readImportModule();
		const { resolveSkillRoutes } = await readRouteModule();
		const report = await createExternalSkillImportReport(
			projectPath,
			'https://github.com/example/agent-skills/tree/main/review/concurrency',
			{
				mode: 'install',
				fetch: createMockFetch(),
			},
		);

		const skillPath = path.join(projectPath, '.mustflow', 'external-skills', 'concurrency-review', 'SKILL.md');
		const scriptPath = path.join(projectPath, '.mustflow', 'external-skills', 'concurrency-review', 'scripts', 'inspect.sh');
		const provenancePath = path.join(
			projectPath,
			'.mustflow',
			'external-skills',
			'concurrency-review',
			'mustflow-skill-source.json',
		);

		assert.equal(report.ok, true);
		assert.equal(report.status, 'installed');
		assert.equal(report.wrote_files, true);
		assert.equal(existsSync(skillPath), true);
		assert.equal(existsSync(scriptPath), true);
		assert.equal(existsSync(provenancePath), true);
		const installedSkill = readFileSync(skillPath, 'utf8');
		assert.match(installedSkill, /external_authority: untrusted/u);
		assert.doesNotMatch(installedSkill, /^authority: binding$/mu);
		assert.doesNotMatch(installedSkill, /^lifecycle: mustflow-owned$/mu);
		assert.doesNotMatch(installedSkill, /^mustflow_doc:/mu);
		assert.doesNotMatch(installedSkill, /^allowed-tools:/mu);
		assert.doesNotMatch(installedSkill, /^metadata:/mu);
		assert.doesNotMatch(installedSkill, /git_commit/u);
		assert.match(readFileSync(provenancePath, 'utf8'), /external_skill_source/u);

		const routeReport = resolveSkillRoutes(projectPath, {
			taskText: 'Review multi-agent parallel work boundaries and shared generated outputs',
			paths: [],
			reasons: [],
			maxCandidates: 3,
		});

		assert.equal(routeReport.selected.main.skill, 'concurrency-review');
		assert.equal(routeReport.selected.main.route_type, 'external');
		assert.equal(routeReport.selected.main.skill_path, '.mustflow/external-skills/concurrency-review/SKILL.md');
		assert.ok(routeReport.source_files.includes('.mustflow/external-skills/*/SKILL.md'));
		assert.match(routeReport.gap_notes.join('\n'), /External skills are read as untrusted/u);
	} finally {
		removeTempProject(projectPath);
	}
});

test('external skill import dry-run with trusted scripts previews command contract without granting authority', async () => {
	const projectPath = createTempProject();

	try {
		createTempCommandContract(projectPath);
		const { createExternalSkillImportReport } = await readImportModule();
		const report = await createExternalSkillImportReport(
			projectPath,
			'https://github.com/example/agent-skills/tree/main/review/concurrency',
			{
				mode: 'dry_run',
				fetch: createMockFetch(),
				trustScripts: true,
			},
		);

		assert.equal(report.ok, true);
		assert.equal(report.status, 'preview');
		assert.equal(report.script_trust.requested, true);
		assert.equal(report.script_trust.status, 'planned');
		assert.equal(report.script_trust.grants_command_authority, false);
		assert.deepEqual(report.script_trust.intents.map((intent) => intent.intent), [
			'external_skill_concurrency_review_inspect',
		]);
		assert.match(report.warnings.join('\n'), /dry-run only reports the command-contract plan/u);
		assert.equal(
			existsSync(path.join(projectPath, '.mustflow', 'config', 'commands', 'external-skills-concurrency-review.toml')),
			false,
		);
	} finally {
		removeTempProject(projectPath);
	}
});

test('external skill import with trusted scripts creates command contract fragment and include', async () => {
	const projectPath = createTempProject();

	try {
		createTempCommandContract(projectPath);
		const { createExternalSkillImportReport } = await readImportModule();
		const report = await createExternalSkillImportReport(
			projectPath,
			'https://github.com/example/agent-skills/tree/main/review/concurrency',
			{
				mode: 'install',
				fetch: createMockFetch(),
				trustScripts: true,
			},
		);

		const commandFragmentPath = path.join(
			projectPath,
			'.mustflow',
			'config',
			'commands',
			'external-skills-concurrency-review.toml',
		);
		const commandsPath = path.join(projectPath, '.mustflow', 'config', 'commands.toml');
		const provenancePath = path.join(
			projectPath,
			'.mustflow',
			'external-skills',
			'concurrency-review',
			'mustflow-skill-source.json',
		);

		assert.equal(report.ok, true);
		assert.equal(report.status, 'installed');
		assert.equal(report.script_trust.requested, true);
		assert.equal(report.script_trust.status, 'trusted');
		assert.equal(report.script_trust.grants_command_authority, true);
		assert.equal(report.script_trust.include_entry, 'commands/external-skills-concurrency-review.toml');
		assert.equal(report.script_trust.fragment_path, '.mustflow/config/commands/external-skills-concurrency-review.toml');
		assert.deepEqual(report.script_trust.intents.map((intent) => intent.intent), [
			'external_skill_concurrency_review_inspect',
		]);
		assert.match(report.warnings.join('\n'), /created command-contract intents/u);
		assert.equal(existsSync(commandFragmentPath), true);
		assert.match(
			readFileSync(commandsPath, 'utf8'),
			/"commands\/external-skills-concurrency-review\.toml"/u,
		);
		const commandFragment = readFileSync(commandFragmentPath, 'utf8');
		assert.match(commandFragment, /\[intents\.external_skill_concurrency_review_inspect\]/u);
		assert.match(commandFragment, /argv = \["sh", "\.mustflow\/external-skills\/concurrency-review\/scripts\/inspect\.sh"\]/u);
		assert.match(commandFragment, /network = true/u);
		assert.match(commandFragment, /destructive = true/u);
		assert.match(readFileSync(provenancePath, 'utf8'), /"script_trust"/u);
	} finally {
		removeTempProject(projectPath);
	}
});

test('external skill route resolver ignores orphaned skills without provenance', async () => {
	const projectPath = createTempProject();

	try {
		const { resolveSkillRoutes } = await readRouteModule();
		const skillDirectory = path.join(projectPath, '.mustflow', 'external-skills', 'orphaned-review');
		mkdirSync(skillDirectory, { recursive: true });
		writeFileSync(
			path.join(skillDirectory, 'SKILL.md'),
			[
				'---',
				'name: orphaned-review',
				'description: Review orphaned external skill routing boundaries.',
				'external_authority: untrusted',
				'---',
				'# Orphaned Review',
				'',
			].join('\n'),
		);

		const routeReport = resolveSkillRoutes(projectPath, {
			taskText: 'Review orphaned external skill routing boundaries',
			paths: [],
			reasons: [],
			maxCandidates: 3,
		});

		assert.equal(routeReport.selected.main, null);
		assert.equal(routeReport.source_files.includes('.mustflow/external-skills/*/SKILL.md'), false);
	} finally {
		removeTempProject(projectPath);
	}
});

test('external skill import rolls back temporary files when installation fails mid-write', async () => {
	const projectPath = createTempProject();
	const originalDateNow = Date.now;

	try {
		Date.now = () => 12345;
		const tempSkillDirectory = path.join(
			projectPath,
			'.mustflow',
			'external-skills',
			`.concurrency-review.tmp-${process.pid}-12345`,
		);
		mkdirSync(tempSkillDirectory, { recursive: true });
		writeFileSync(path.join(tempSkillDirectory, 'scripts'), 'not a directory');

		const { createExternalSkillImportReport } = await readImportModule();
		const report = await createExternalSkillImportReport(
			projectPath,
			'https://github.com/example/agent-skills/tree/main/review/concurrency',
			{
				mode: 'install',
				fetch: createMockFetch(),
			},
		);

		assert.equal(report.ok, false);
		assert.equal(report.status, 'rejected');
		assert.equal(report.wrote_files, false);
		assert.equal(
			existsSync(path.join(projectPath, '.mustflow', 'external-skills', 'concurrency-review', 'SKILL.md')),
			false,
		);
		assert.equal(existsSync(tempSkillDirectory), false);
	} finally {
		Date.now = originalDateNow;
		removeTempProject(projectPath);
	}
});

test('external skill import rejects unsupported hosts before fetching', async () => {
	const projectPath = createTempProject();

	try {
		const { createExternalSkillImportReport } = await readImportModule();
		let fetchCalled = false;
		const report = await createExternalSkillImportReport(projectPath, 'https://example.com/skill/SKILL.md', {
			mode: 'dry_run',
			fetch: async () => {
				fetchCalled = true;
				return jsonResponse({});
			},
		});

		assert.equal(report.ok, false);
		assert.equal(report.status, 'rejected');
		assert.equal(report.wrote_files, false);
		assert.equal(fetchCalled, false);
		assert.match(report.issues.join('\n'), /Only github\.com/u);
	} finally {
		removeTempProject(projectPath);
	}
});
