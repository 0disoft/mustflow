import assert from 'node:assert/strict';
import fs from 'node:fs';
import { syncBuiltinESMExports } from 'node:module';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { test } from 'node:test';
import { createSkillAuthorPlan, applySkillAuthorPlan } from '../../scripts/skill-author-plan.mjs';
import { parseTomlText } from '../../dist/core/toml.js';
import { projectRoot } from './helpers/cli-harness.js';

const name = 'example-review';
const skillPath = '.mustflow/skills/' + name + '/SKILL.md';
const template = 'templates/default/locales/en/';
const read = (root, relative) => readFileSync(path.join(root, relative), 'utf8');
function write(root, relative, text) {
	mkdirSync(path.dirname(path.join(root, relative)), { recursive: true });
	writeFileSync(path.join(root, relative), text);
}
function fixture() {
	const root = mkdtempSync(path.join(tmpdir(), 'mustflow-skill-author-'));
	const index = '---\nmustflow_doc: skills.index\nrevision: 1\n---\n\n| Trigger | Skill | Input | Edit | Risk | Verify | Output |\n| --- | --- | --- | --- | --- | --- | --- |\n';
	for (const prefix of ['', template]) {
		write(root, prefix + '.mustflow/skills/INDEX.md', index);
		write(root, prefix + '.mustflow/skills/routes.toml', 'schema_version = "1"\n');
	}
	write(root, '.mustflow/config/commands.toml', 'schema_version = "1"\n');
	write(root, 'templates/default/manifest.toml', 'creates = [\n]\n[skill_profiles]\nminimal = [\n]\nteam = [\n]\n');
	write(root, 'templates/default/i18n.toml', '[documents."skills.index"]\nsource = "locales/en/.mustflow/skills/INDEX.md"\nsource_locale = "en"\nrevision = 1\ntranslations = {}\n');
	write(root, '.mustflow/skills/route-fixtures.json', '{"schema_version":"1","cases":[]}');
	const request = {
		schema_version: '1', name,
		skill: read(projectRoot, '.mustflow/skills/interface-copy-review/SKILL.md').replaceAll('interface-copy-review', name),
		route_toml: '[routes."example-review"]\ncategory = "ui_assets"\nroute_type = "primary"\npriority = 70\nselection_axis = "task"\napplies_to_reasons = ["ui_change"]\n',
		index_row: '| Review example copy | ' + String.fromCharCode(96) + skillPath + String.fromCharCode(96) + ' | Screens | Copy | Ambiguity | test_related | Findings |',
		profiles: ['team'],
		fixtures: [{ id: name + '-natural', task: 'Review example copy', reasons: ['ui_change'], required_main: name }],
	};
	return { root, request };
}

test('skill authoring plans synchronize creation and update without touching unselected profiles', () => {
	const { root, request } = fixture();
	try {
		const requestPath = '.mustflow/state/skill-authoring/request.json';
		const planPath = '.mustflow/state/skill-authoring/plan.json';
		write(root, requestPath, JSON.stringify(request));
		const script = path.join(projectRoot, 'scripts/skill-author-plan.mjs');
		const planned = spawnSync(process.execPath, [script, 'plan', requestPath, planPath], { cwd: root, encoding: 'utf8' });
		assert.equal(planned.status, 0, planned.stderr);
		const plan = JSON.parse(read(root, planPath));
		assert.equal(plan.files.length, 9);
		assert.equal(plan.files.find(file => file.path === skillPath).before_hash, null);
		const applied = spawnSync(process.execPath, [script, 'apply', planPath], { cwd: root, encoding: 'utf8' });
		assert.equal(applied.status, 0, applied.stderr);
		assert.deepEqual(applied.stdout.trim().split('\n'), plan.files.map(file => file.path));
		assert.equal(read(root, skillPath), read(root, template + skillPath));
		assert.equal(read(root, '.mustflow/skills/routes.toml'), read(root, template + '.mustflow/skills/routes.toml'));
		assert.equal(read(root, '.mustflow/skills/INDEX.md'), read(root, template + '.mustflow/skills/INDEX.md'));
		let manifest = parseTomlText(read(root, 'templates/default/manifest.toml'));
		assert.deepEqual(manifest.creates, [skillPath]);
		assert.deepEqual(manifest.skill_profiles, { minimal: [], team: [name] });
		let i18n = parseTomlText(read(root, 'templates/default/i18n.toml'));
		assert.equal(i18n.documents['skill.' + name].revision, 1);
		assert.equal(i18n.documents['skills.index'].revision, 2);
		assert.throws(() => applySkillAuthorPlan(root, plan), /revision/u);
		write(root, 'templates/default/i18n.toml', read(root, 'templates/default/i18n.toml')
			.replace(/(revision = 1\n)translations = \{\}/u, '$1translations.ko = { path = "locales/ko/' + skillPath + '", source_revision = 1, status = "current" }'));
		const updated = { ...request, skill: request.skill.replace('revision: 1', 'revision: 2'), profiles: ['minimal'] };
		applySkillAuthorPlan(root, createSkillAuthorPlan(root, updated));
		manifest = parseTomlText(read(root, 'templates/default/manifest.toml'));
		assert.deepEqual(manifest.creates, [skillPath]);
		assert.deepEqual(manifest.skill_profiles, { minimal: [name], team: [] });
		i18n = parseTomlText(read(root, 'templates/default/i18n.toml'));
		assert.equal(i18n.documents['skill.' + name].revision, 2);
		assert.equal(i18n.documents['skill.' + name].translations.ko.status, 'needs_review');
		assert.equal(i18n.documents['skills.index'].revision, 2);
		assert.equal(JSON.parse(read(root, '.mustflow/skills/route-fixtures.json')).cases.length, 1);
	} finally { rmSync(root, { recursive: true, force: true }); }
});

test('skill authoring restores earlier files after a publication failure', (t) => {
	const { root, request } = fixture();
	const plan = createSkillAuthorPlan(root, request);
	const rename = fs.renameSync;
	const mocked = t.mock.method(fs, 'renameSync', (source, destination) => {
		if (destination === path.join(root, template + skillPath)) throw Object.assign(new Error('injected disk failure'), { code: 'EIO' });
		return rename(source, destination);
	});
	syncBuiltinESMExports();
	try {
		assert.throws(() => applySkillAuthorPlan(root, plan), /injected disk failure/u);
		assert.equal(fs.existsSync(path.join(root, skillPath)), false);
		assert.equal(fs.existsSync(path.join(root, template + skillPath)), false);
		assert.equal(read(root, '.mustflow/skills/routes.toml'), 'schema_version = "1"\n');
	} finally {
		mocked.mock.restore();
		syncBuiltinESMExports();
		rmSync(root, { recursive: true, force: true });
	}
});

test('skill authoring rejects drift, arbitrary plan targets, invalid profiles and foreign routes before writes', () => {
	const { root, request } = fixture();
	try {
		const plan = createSkillAuthorPlan(root, request);
		const tampered = structuredClone(plan);
		tampered.files[0].path = 'README.md';
		assert.throws(() => applySkillAuthorPlan(root, tampered), /reviewed source snapshots/u);
		assert.throws(() => createSkillAuthorPlan(root, { ...request, name: '../outside' }), /Invalid/u);
		assert.throws(() => createSkillAuthorPlan(root, { ...request, profiles: ['unknown'] }), /profile/u);
		assert.throws(() => createSkillAuthorPlan(root, { ...request, route_toml: request.route_toml + '\n[arbitrary]\nvalue = 1\n' }), /only the named/u);
		const previous = read(root, 'templates/default/manifest.toml');
		write(root, 'templates/default/manifest.toml', previous + '\n# concurrent edit\n');
		assert.throws(() => applySkillAuthorPlan(root, plan), /reviewed source snapshots/u);
		assert.equal(read(root, 'templates/default/manifest.toml'), previous + '\n# concurrent edit\n');
		assert.equal(read(root, '.mustflow/skills/routes.toml'), 'schema_version = "1"\n');
	} finally { rmSync(root, { recursive: true, force: true }); }
});
