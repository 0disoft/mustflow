import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { cpSync, existsSync, mkdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { after, before, test } from 'node:test';
import { parse, stringify } from 'smol-toml';
import { runUpgrade } from '../../dist/cli/commands/upgrade.js';
import { buildSkillRouteCatalog } from '../../dist/core/skill-route-resolution.js';
import { createTempProject, removeTempProject, projectRoot, runCliCommand, runCliInProcess } from './helpers/cli-harness.js';

const TS = '.mustflow/skills/typescript-code-change/SKILL.md';
const SEO = '.mustflow/skills/seo-ai-discovery-review/SKILL.md';
const PY = '.mustflow/skills/python-code-change/SKILL.md';
const REF = '.mustflow/skills/typescript-code-change/references/example.md';
const ROUTES = '.mustflow/skills/routes.toml';
const INDEX = '.mustflow/skills/INDEX.md';
const CATALOG = '.mustflow/skills/catalog.v2.json';
const LOCK = '.mustflow/config/manifest.lock.toml';
const version = JSON.parse(readFileSync(path.join(projectRoot, 'package.json'), 'utf8')).version;
let templateFixture;

function read(root, relative) { return readFileSync(path.join(root, relative), 'utf8'); }
function write(root, relative, content) {
	mkdirSync(path.dirname(path.join(root, relative)), { recursive: true });
	writeFileSync(path.join(root, relative), content);
}
function manifest(template, mutate) {
	const data = parse(read(template, 'manifest.toml'));
	mutate(data);
	write(template, 'manifest.toml', stringify(data));
}
function bundled(template, relative) { return path.join(template, 'locales/en', relative); }
function templateEnv(template) {
	return { MUSTFLOW_DEV_TEMPLATE_ROOT: template, MUSTFLOW_ALLOW_DEV_TEMPLATE_ROOT: '1' };
}
async function upgrade(root, template, args = [], reporterHook) {
	return runCliCommand(root, ['mf', ...args], (commandArgs, reporter) => runUpgrade(commandArgs, {
		...reporter,
		stdout(message) { reporter.stdout(message); reporterHook?.(message); },
	}, 'en', { fetch: async () => new Response(JSON.stringify({ name: 'mustflow', version })) }),
	{ env: templateEnv(template) });
}
function ok(result) { assert.equal(result.status, 0, result.stderr || result.stdout); }
function assertCatalog(root) { assert.equal(read(root, CATALOG), `${JSON.stringify(buildSkillRouteCatalog(root), null, 2)}\n`); }
async function fixture(t, { bootstrap = true, locale = 'en' } = {}) {
	const root = createTempProject('mustflow-simple-upgrade-');
	const template = createTempProject('mustflow-simple-template-');
	t.after(() => { removeTempProject(root); removeTempProject(template); });
	cpSync(templateFixture, template, { recursive: true });
	ok(await runCliInProcess(root, ['init', '--yes', '--workflow', 'simple', '--profile', 'product', '--locale', locale],
		{ env: templateEnv(template) }));
	if (bootstrap) ok(await upgrade(root, template));
	return { root, template };
}

before(() => {
	templateFixture = createTempProject('mustflow-simple-skill-source-');
	cpSync(path.join(projectRoot, 'templates/default'), templateFixture, { recursive: true });
	manifest(templateFixture, data => {
		data.skill_profiles.product = ['typescript-code-change', 'seo-ai-discovery-review'];
		data.creates.push(REF);
	});
	write(templateFixture, `locales/en/${REF}`, 'Bundled reference v1\n');
});
after(() => { if (templateFixture) removeTempProject(templateFixture); });

test('simple upgrade installs profile skills and references; dry-run is read-only and second apply is a no-op', async t => {
	const { root, template } = await fixture(t, { bootstrap: false, locale: 'ko' });
	const lockBefore = read(root, LOCK);
	const agentsBefore = read(root, 'AGENTS.md');
	assert.equal(existsSync(path.join(root, '.mustflow/skills')), false);
	const preview = await upgrade(root, template, ['--dry-run']);
	ok(preview);
	assert.match(preview.stdout, /typescript-code-change\/SKILL.md/);
	assert.equal(existsSync(path.join(root, '.mustflow/skills')), false);
	assert.equal(read(root, LOCK), lockBefore);
	ok(await upgrade(root, template));
	assert.ok(existsSync(path.join(root, TS)));
	assert.ok(existsSync(path.join(root, SEO)));
	assert.equal(read(root, REF), 'Bundled reference v1\n');
	assert.equal(existsSync(path.join(root, PY)), false, 'excluded profile skill must remain absent');
	assert.equal(read(root, 'AGENTS.md'), agentsBefore);
	const lock = parse(read(root, LOCK));
	assert.equal(lock.template.profile, 'product');
	assert.equal(lock.template.locale, 'ko');
	assert.ok(lock.files[TS]);
	assert.ok(lock.files[REF]);
	assertCatalog(root);
	const baseline = read(root, LOCK);
	const result = await upgrade(root, template);
	ok(result);
	assert.match(result.stdout, /No template updates needed/);
	assert.equal(read(root, LOCK), baseline);
});

test('simple upgrade refreshes clean skills and references and adds a newly selected bundled skill', async t => {
	const { root, template } = await fixture(t);
	const updated = `${readFileSync(bundled(template, TS), 'utf8')}\nUpstream update v2\n`;
	writeFileSync(bundled(template, TS), updated);
	writeFileSync(bundled(template, REF), 'Bundled reference v2\n');
	manifest(template, data => { data.skill_profiles.product.push('python-code-change'); });
	ok(await upgrade(root, template));
	assert.match(read(root, TS), /Upstream update v2/);
	assert.equal(read(root, REF), 'Bundled reference v2\n');
	assert.ok(existsSync(path.join(root, PY)));
	assert.match(read(root, INDEX), /python-code-change\/SKILL.md/);
	assert.ok(parse(read(root, ROUTES)).routes['python-code-change']);
	assert.ok(parse(read(root, LOCK)).files[PY]);
	assertCatalog(root);
});

test('simple upgrade preserves edited skills, references and routing while updating other files', async t => {
	const { root, template } = await fixture(t);
	const seo = `${read(root, SEO).replace(/^description:.*$/m, 'description: Local SEO description')}\nLocal SEO rules\n`;
	write(root, SEO, seo);
	write(root, REF, 'Local reference edits\n');
	const lock = parse(read(root, LOCK));
	lock.files[REF].last_action = 'customized';
	lock.files[REF].content_hash = `sha256:${createHash('sha256').update(read(root, REF)).digest('hex')}`;
	write(root, LOCK, stringify(lock));
	const routes = parse(read(root, ROUTES));
	routes.routes['typescript-code-change'].priority = 999;
	routes.routes['local-review'] = { category: 'general_code', route_type: 'primary', priority: 1 };
	const localRouting = `# Keep this routing comment and formatting.\n${stringify(routes)}`;
	write(root, ROUTES, localRouting);
	write(root, '.mustflow/skills/local-review/SKILL.md', '---\nname: local-review\ndescription: Workspace-only skill\n---\nLocal instructions\n');
	const customIndex = `${read(root, INDEX)}\n## Workspace notes\nPreserve this custom index text.\n`;
	write(root, INDEX, customIndex);
	writeFileSync(bundled(template, TS), `${readFileSync(bundled(template, TS), 'utf8')}\nUpdated clean skill\n`);
	writeFileSync(bundled(template, SEO), `${readFileSync(bundled(template, SEO), 'utf8')}\nUpstream SEO change\n`);
	writeFileSync(bundled(template, REF), 'Upstream reference update\n');
	manifest(template, data => { data.skill_profiles.product.push('python-code-change'); });
	const result = await upgrade(root, template);
	ok(result);
	assert.match(result.stdout, /Local skill changes preserved/);
	assert.equal(read(root, SEO), seo);
	assert.equal(read(root, REF), 'Local reference edits\n');
	assert.match(read(root, TS), /Updated clean skill/);
	assert.match(read(root, INDEX), /Preserve this custom index text/);
	assert.match(read(root, INDEX), /python-code-change\/SKILL.md/);
	const merged = parse(read(root, ROUTES));
	assert.ok(read(root, ROUTES).startsWith(localRouting));
	assert.equal(merged.routes['typescript-code-change'].priority, 999);
	assert.deepEqual({ ...merged.routes['local-review'] }, routes.routes['local-review']);
	assert.ok(merged.routes['python-code-change']);
	assert.equal(parse(read(root, LOCK)).files[ROUTES].last_action, 'customized');
	const catalog = JSON.parse(read(root, CATALOG));
	assertCatalog(root);
	assert.equal(catalog.entries.find(entry => entry.skill === 'seo-ai-discovery-review').trigger, 'Local SEO description');
	assert.ok(catalog.entries.some(entry => entry.skill === 'local-review'));
	const lockBefore = read(root, LOCK);
	ok(await upgrade(root, template));
	assert.equal(read(root, LOCK), lockBefore);
	assert.equal(read(root, SEO), seo);
});

test('simple update adopts identical untracked files without rewriting them and preserves unknown legacy edits', async t => {
	const { root, template } = await fixture(t);
	const legacySeo = `${read(root, SEO)}\nUnknown pre-lock customization\n`;
	write(root, SEO, legacySeo);
	const lock = parse(read(root, LOCK));
	for (const relative of Object.keys(lock.files)) if (relative.startsWith('.mustflow/skills/')) delete lock.files[relative];
	write(root, LOCK, stringify(lock));
	const mtime = statSync(path.join(root, TS)).mtimeMs;
	let result = await runCliInProcess(root, ['update', '--apply', '--json'], { env: templateEnv(template) });
	ok(result);
	assert.equal(JSON.parse(result.stdout).wroteFiles, true, 'adoption must update the lock');
	assert.equal(statSync(path.join(root, TS)).mtimeMs, mtime, 'adoption must not rewrite a matching file');
	assert.ok(parse(read(root, LOCK)).files[TS]);
	assert.equal(read(root, SEO), legacySeo);
	const manualUpdate = `${read(root, TS)}\nManually installed latest bundle\n`;
	writeFileSync(bundled(template, TS), manualUpdate);
	write(root, TS, manualUpdate);
	ok(await upgrade(root, template));
	assert.equal(parse(read(root, LOCK)).files[TS].content_hash, `sha256:${createHash('sha256').update(manualUpdate).digest('hex')}`);
	writeFileSync(bundled(template, TS), `${manualUpdate}\nNext release\n`);
	result = await upgrade(root, template);
	ok(result);
	assert.match(read(root, TS), /Next release/);
	assert.equal(read(root, SEO), legacySeo);
});

test('simple upgrade preserves deliberate deletion of a tracked skill and regenerates its catalog', async t => {
	const { root, template } = await fixture(t);
	rmSync(path.join(root, SEO));
	writeFileSync(bundled(template, TS), `${readFileSync(bundled(template, TS), 'utf8')}\nClean update\n`);
	ok(await upgrade(root, template));
	assert.equal(existsSync(path.join(root, SEO)), false);
	assert.match(read(root, TS), /Clean update/);
	assertCatalog(root);
	assert.ok(!JSON.parse(read(root, CATALOG)).entries.some(entry => entry.skill === 'seo-ai-discovery-review'));
});

test('simple upgrade rolls back if a preserved skill changes after planning', async t => {
	const { root, template } = await fixture(t);
	write(root, SEO, `${read(root, SEO)}\nLocal rules\n`);
	const tsBefore = read(root, TS);
	const lockBefore = read(root, LOCK);
	const catalogBefore = read(root, CATALOG);
	writeFileSync(bundled(template, TS), `${readFileSync(bundled(template, TS), 'utf8')}\nUpstream change\n`);
	const concurrentEdit = `${read(root, SEO)}\nConcurrent local edit\n`;
	const result = await upgrade(root, template, [], message => {
		if (message.startsWith('Updated ') && message.includes(TS)) write(root, SEO, concurrentEdit);
	});
	assert.equal(result.status, 1);
	assert.match(result.stderr, /File changed after update planning/);
	assert.equal(read(root, SEO), concurrentEdit, 'concurrent local edits must survive rollback');
	assert.equal(read(root, TS), tsBefore);
	assert.equal(read(root, LOCK), lockBefore);
	assert.equal(read(root, CATALOG), catalogBefore);
});
