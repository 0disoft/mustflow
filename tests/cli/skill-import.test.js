import assert from 'node:assert/strict';
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
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
		'name: concurrency-review',
		'description: Review multi-agent parallel work boundaries, shared files, ports, caches, generated outputs, and final integration ownership.',
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
