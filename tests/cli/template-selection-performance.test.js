import assert from 'node:assert/strict';
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { test } from 'node:test';
import { getTemplateFiles } from '../../dist/cli/lib/templates.js';
import { createTempProject, removeTempProject } from './helpers/cli-harness.js';

function fixture(skills, creates = skills.map(name => `.mustflow/skills/${name}/SKILL.md`), content = '# Skill\n') {
	const root = createTempProject('mustflow-template-selection-');
	for (const relative of creates) {
		const file = path.join(root, 'common', relative);
		mkdirSync(path.dirname(file), { recursive: true });
		writeFileSync(file, content);
	}
	return {
		root,
		template: { templateRoot: root, manifestPath: path.join(root, 'manifest.toml'), manifest: {
			id: 'test', version: '1.0.0', commonRoot: 'common', creates,
			defaultProfile: 'full', profiles: ['full', 'empty'], skillProfiles: { full: skills, empty: [] },
			defaultLocale: 'en', locales: ['en'],
		} },
	};
}

test('template skill selection builds shared indexes with linear work', (t) => {
	const skills = Array.from({ length: 128 }, (_, i) => `skill-${String(i).padStart(3, '0')}`);
	const { root, template } = fixture(skills);
	const NativeSet = globalThis.Set;
	const includes = Array.prototype.includes;
	const names = new NativeSet(skills);
	let seededNames = 0;
	let linearMembershipScans = 0;
	let files;
	try {
		globalThis.Set = class extends NativeSet {
			constructor(values) {
				super(values);
				if (Array.isArray(values) && values.length === skills.length && values.every(value => names.has(value))) {
					seededNames += values.length;
				}
			}
		};
		Array.prototype.includes = function (...args) {
			if (this.length === skills.length && this[0] === skills[0] && names.has(args[0])) linearMembershipScans++;
			return includes.apply(this, args);
		};
		try { files = getTemplateFiles(template); }
		finally { globalThis.Set = NativeSet; Array.prototype.includes = includes; }
		t.diagnostic(JSON.stringify({ files: files.length, skills: skills.length, linearMembershipScans, seededNames }));
		assert.equal(files.length, skills.length);
		assert.equal(linearMembershipScans, 0);
		assert.ok(seededNames <= 4 * skills.length, `Repeated index construction seeded ${seededNames} skill names`);
		assert.deepEqual(files.map(file => file.relativePath), template.manifest.creates);
	} finally {
		globalThis.Set = NativeSet;
		Array.prototype.includes = includes;
		removeTempProject(root);
	}
});

test('shared skill indexes preserve manifest order, duplicate files and unavailable reference rules', () => {
	const skills = ['alpha', 'beta', 'gamma'];
	const creates = ['.mustflow/skills/gamma/SKILL.md', 'AGENTS.md', '.mustflow/skills/alpha/SKILL.md',
		'.mustflow/skills/beta/SKILL.md', '.mustflow/skills/gamma/SKILL.md'];
	const content = '`alpha` | `.mustflow/skills/alpha/SKILL.md` | `beta` | `gamma` | `unlisted`\n';
	const { root, template } = fixture(skills, creates, content);
	template.manifest.skillProfiles.limited = ['beta', 'beta'];
	try {
		const files = getTemplateFiles(template, 'en', 'limited', { extraSkillNames: ['gamma', 'gamma'] });
		assert.deepEqual(files.map(file => file.relativePath), [creates[0], creates[1], creates[3], creates[4]]);
		const expected = 'the closest installed route for this scope | the closest installed route for this scope | `beta` | `gamma` | `unlisted`\n';
		for (const file of files.filter(file => file.relativePath.endsWith('/SKILL.md'))) assert.equal(file.content, expected);
		assert.deepEqual(getTemplateFiles(template, 'en', 'empty').map(file => file.relativePath), ['AGENTS.md']);
		assert.deepEqual(getTemplateFiles(template, 'en', 'unknown').map(file => file.relativePath), creates);
		assert.equal(getTemplateFiles(template)[2].content, content, 'a later call must not reuse another profile\'s indexes');
	} finally { removeTempProject(root); }
});
