import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, unlinkSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseTomlText } from '../dist/core/toml.js';
import { ensureFileTargetInsideWithoutSymlinks, readUtf8FileInsideWithoutSymlinks, writeUtf8FileInsideWithoutSymlinks } from '../dist/core/safe-filesystem.js';
import { parseSimpleFrontmatter, readFrontmatterList, readSkillSectionIds } from '../dist/cli/lib/validation/frontmatter.js';
import { acquireActiveCommandLock } from '../dist/cli/lib/active-command-lock.js';

const TEMPLATE = 'templates/default/locales/en/';
const MANIFEST = 'templates/default/manifest.toml';
const I18N = 'templates/default/i18n.toml';
const INDEX = '.mustflow/skills/INDEX.md';
const ROUTES = '.mustflow/skills/routes.toml';
const FIXTURES = '.mustflow/skills/route-fixtures.json';
const hash = text => text === null ? null : 'sha256:' + createHash('sha256').update(text).digest('hex');
const record = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const quote = value => JSON.stringify(value);
const codeSpan = value => String.fromCharCode(96) + value + String.fromCharCode(96);
const sections = ['purpose', 'use-when', 'do-not-use-when', 'required-inputs', 'preconditions', 'allowed-edits', 'procedure', 'postconditions', 'verification', 'failure-handling', 'output-format'];

function read(root, relative, optional = false) {
	const target = path.join(root, relative);
	ensureFileTargetInsideWithoutSymlinks(root, target, { allowMissingLeaf: optional });
	if (optional && !existsSync(target)) return null;
	return readUtf8FileInsideWithoutSymlinks(root, target, { maxBytes: 8 * 1024 * 1024 });
}

function replaceTable(text, header, replacement) {
	const lines = text.split(/\r?\n/u);
	const start = lines.findIndex(line => line === header);
	if (start < 0) return text.trimEnd() + '\n\n' + replacement.trimEnd() + '\n';
	let end = start + 1;
	while (end < lines.length && !lines[end].startsWith('[')) end++;
	lines.splice(start, end - start, replacement.trimEnd(), '');
	return lines.join('\n');
}

function replaceRoute(text, name, replacement) {
	const prefix = '[routes.' + quote(name);
	const lines = text.split(/\r?\n/u);
	for (let i = lines.length - 1; i >= 0; i--) {
		if (lines[i] === prefix + ']' || lines[i].startsWith(prefix + '.')) {
			let end = i + 1;
			while (end < lines.length && !lines[end].startsWith('[')) end++;
			lines.splice(i, end - i);
		}
	}
	return lines.join('\n').trimEnd() + '\n\n' + replacement.trimEnd() + '\n';
}

function updateArray(text, key, values) {
	const expression = new RegExp('^' + key + ' = \\[[\\s\\S]*?^\\]', 'm');
	if (!expression.test(text)) throw new Error('Expected multiline array: ' + key);
	return text.replace(expression, key + ' = [\n' + values.map(value => '  ' + quote(value) + ',').join('\n') + '\n]');
}

export function createSkillAuthorPlan(root, request) {
	if (!record(request) || request.schema_version !== '1' || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/u.test(request.name ?? '')) throw new Error('Invalid skill authoring request');
	const { name, skill, route_toml: route, index_row: row, profiles, fixtures } = request;
	if (typeof skill !== 'string' || skill.length > 65536 || typeof route !== 'string' || typeof row !== 'string' ||
		!Array.isArray(profiles) || !profiles.length || profiles.some(value => typeof value !== 'string') ||
		!Array.isArray(fixtures) || !fixtures.length) throw new Error('Request needs skill, route_toml, index_row, profiles, and fixtures');
	const skillPath = '.mustflow/skills/' + name + '/SKILL.md';
	const frontmatter = parseSimpleFrontmatter(skill);
	if (frontmatter.name !== name || frontmatter.mustflow_doc !== 'skill.' + name ||
		frontmatter.locale !== 'en' || frontmatter.canonical !== 'true' ||
		frontmatter.authority !== 'procedure' || frontmatter.lifecycle !== 'mustflow-owned' ||
		frontmatter.mustflow_schema !== '1' || frontmatter.mustflow_kind !== 'procedure' ||
		frontmatter.pack_id !== 'mustflow.core' || frontmatter.skill_id !== 'mustflow.core.' + name ||
		!frontmatter.description || !/^[1-9][0-9]*$/u.test(frontmatter.revision ?? '') ||
		sections.some(section => !readSkillSectionIds(skill).has(section)) ||
		!readFrontmatterList(skill, 'command_intents').length) throw new Error('Skill frontmatter or required sections are incomplete');
	const routeData = parseTomlText(route);
	if (Object.keys(routeData).length !== 1 || !record(routeData.routes) ||
		Object.keys(routeData.routes).length !== 1 || !record(routeData.routes[name])) throw new Error('route_toml must contain only the named skill route');
	if (row.includes('\n') || row.includes('\r') || !row.startsWith('| ') || !row.endsWith(' |') ||
		row.split('|').length !== 9 || !row.includes(codeSpan(skillPath))) throw new Error('index_row must be one seven-column row for this skill');
	const fixtureIds = fixtures.map(fixture => fixture?.id);
	if (fixtureIds.some(id => typeof id !== 'string' || !id.startsWith(name + '-')) || new Set(fixtureIds).size !== fixtureIds.length ||
		fixtures.some(fixture => typeof fixture.task !== 'string' || !fixture.task.trim() ||
			!(fixture.required_main === name || fixture.required_adjuncts?.includes(name) || fixture.required_candidates?.includes(name)))) throw new Error('Fixtures need unique skill-prefixed IDs, task text, and required skill placement');
	const files = [];
	const add = (relative, after, optional = false) => {
		const before = read(root, relative, optional);
		if (before !== after) files.push({ path: relative, before_hash: hash(before), after });
	};
	const previous = read(root, skillPath, true);
	if (Number(frontmatter.revision) !== (previous === null ? 1 : Number(parseSimpleFrontmatter(previous).revision) + 1)) throw new Error('Skill revision must be 1 for creation or increment the existing revision by one');
	if (previous !== read(root, TEMPLATE + skillPath, true)) throw new Error('Source and template skill already differ; resolve the drift before planning');
	add(skillPath, skill, true);
	add(TEMPLATE + skillPath, skill, true);
	for (const prefix of ['', TEMPLATE]) {
		const current = read(root, prefix + ROUTES);
		if (JSON.stringify(parseTomlText(current).routes?.[name]) === JSON.stringify(routeData.routes[name])) continue;
		const updated = replaceRoute(current, name, route);
		parseTomlText(updated);
		add(prefix + ROUTES, updated);
	}
	let indexRevision;
	for (const prefix of ['', TEMPLATE]) {
		const content = read(root, prefix + INDEX);
		const oldRevision = Number(parseSimpleFrontmatter(content).revision);
		const lines = content.split(/\r?\n/u);
		const oldRow = lines.findIndex(line => line.startsWith('|') && line.includes(codeSpan(skillPath)));
		if (oldRow < 0) {
			const finalRow = lines.findLastIndex(line => line.startsWith('|'));
			if (finalRow < 0) throw new Error('Skill index table is missing');
			lines.splice(finalRow + 1, 0, row);
		} else lines[oldRow] = row;
		let updated = lines.join('\n');
		const changed = updated.replace(/\r/g, '') !== content.replace(/\r/g, '');
		const nextRevision = oldRevision + (changed ? 1 : 0);
		if (!Number.isSafeInteger(nextRevision) || nextRevision < 1) throw new Error('Invalid index revision');
		updated = changed ? updated.replace(/^revision: [0-9]+$/m, 'revision: ' + nextRevision) : content;
		if (indexRevision !== undefined && indexRevision !== nextRevision) throw new Error('Source and template index revisions differ');
		indexRevision = nextRevision;
		add(prefix + INDEX, updated);
	}
	let manifest = read(root, MANIFEST);
	const metadata = parseTomlText(manifest);
	if (!Array.isArray(metadata.creates) || !record(metadata.skill_profiles) ||
		new Set(profiles).size !== profiles.length || profiles.some(profile => !Array.isArray(metadata.skill_profiles[profile]))) throw new Error('Unknown or duplicate skill profile');
	if (!metadata.creates.includes(skillPath)) manifest = updateArray(manifest, 'creates', [...metadata.creates, skillPath]);
	const profileStart = manifest.indexOf('[skill_profiles]');
	if (profileStart < 0) throw new Error('Missing skill_profiles table');
	let profileText = manifest.slice(profileStart);
	for (const [profile, names] of Object.entries(metadata.skill_profiles)) {
		if (!Array.isArray(names) || !/^[a-z][a-z0-9_]*$/u.test(profile)) throw new Error('Invalid skill profile');
		const desired = profiles.includes(profile)
			? (names.includes(name) ? names : [...names, name])
			: names.filter(value => value !== name);
		if (JSON.stringify(names) !== JSON.stringify(desired)) profileText = updateArray(profileText, profile, desired);
	}
	manifest = manifest.slice(0, profileStart) + profileText;
	parseTomlText(manifest);
	add(MANIFEST, manifest);
	let i18n = read(root, I18N).replace(/\r\n/gu, '\n');
	const docs = parseTomlText(i18n).documents;
	const docId = 'skill.' + name;
	const oldDoc = docs?.[docId];
	let entry = oldDoc ? i18n.slice(i18n.indexOf('[documents.' + quote(docId) + ']')).split(/\n(?=\[documents\.)/u)[0]
		: '[documents.' + quote(docId) + ']\nsource = ' + quote('locales/en/' + skillPath) + '\nsource_locale = "en"\nrevision = 1\ntranslations = {}\n';
	entry = entry.replace(/^revision = [0-9]+$/m, 'revision = ' + frontmatter.revision)
		.replace(/status = "current"/gu, 'status = "needs_review"');
	i18n = replaceTable(i18n, '[documents.' + quote(docId) + ']', entry);
	const indexHeader = '[documents."skills.index"]';
	const indexEntry = i18n.slice(i18n.indexOf(indexHeader)).split(/\n(?=\[documents\.)/u)[0];
	if (!indexEntry.startsWith(indexHeader)) throw new Error('Index translation metadata is missing');
	i18n = replaceTable(i18n, indexHeader, indexEntry.replace(/^revision = [0-9]+$/m, 'revision = ' + indexRevision));
	parseTomlText(i18n);
	add(I18N, i18n);
	const corpus = JSON.parse(read(root, FIXTURES));
	if (!Array.isArray(corpus.cases)) throw new Error('Route fixture corpus is invalid');
	const replacements = new Map(fixtures.map(fixture => [fixture.id, fixture]));
	corpus.cases = corpus.cases.map(fixture => {
		const updated = replacements.get(fixture.id) ?? fixture;
		replacements.delete(fixture.id);
		return updated;
	});
	corpus.cases.push(...replacements.values());
	add(FIXTURES, JSON.stringify(corpus, null, 2) + '\n');
	return { schema_version: '1', kind: 'skill_author_plan', request, files };
}

export function applySkillAuthorPlan(root, plan) {
	if (!record(plan) || plan.schema_version !== '1' || plan.kind !== 'skill_author_plan' || !Array.isArray(plan.files)) throw new Error('Invalid skill authoring plan');
	const expected = createSkillAuthorPlan(root, plan.request);
	if (JSON.stringify(expected.files) !== JSON.stringify(plan.files)) throw new Error('Skill authoring plan no longer matches the reviewed source snapshots');
	const active = acquireActiveCommandLock(root, 'skill author apply', plan.files.map(file => ({
		type: 'write', mode: 'replace', path: file.path, concurrency: 'exclusive',
	})));
	if (!active.ok) throw new Error('Skill authoring conflicts with an active writer');
	const written = [];
	try {
		for (const file of plan.files) {
			if (hash(read(root, file.path, true)) !== file.before_hash) throw new Error('Source changed after planning: ' + file.path);
		}
		for (const file of plan.files) {
			const before = read(root, file.path, true);
			if (hash(before) !== file.before_hash) throw new Error('Source changed during apply: ' + file.path);
			writeUtf8FileInsideWithoutSymlinks(root, path.join(root, file.path), file.after);
			written.push({ ...file, before });
		}
		return plan.files.map(file => file.path);
	} catch (error) {
		const unrestored = [];
		for (const file of written.reverse()) {
			try {
				if (hash(read(root, file.path)) !== hash(file.after)) throw new Error('Concurrent write');
				if (file.before === null) unlinkSync(path.join(root, file.path));
				else writeUtf8FileInsideWithoutSymlinks(root, path.join(root, file.path), file.before);
			} catch { unrestored.push(file.path); }
		}
		if (unrestored.length) throw new Error(String(error) + '; inspect unrestored files: ' + unrestored.join(', '));
		throw error;
	} finally {
		active.handle.release();
	}
}

function statePath(value) {
	if (!/^\.mustflow\/state\/skill-authoring\/[a-zA-Z0-9][a-zA-Z0-9._-]*\.json$/u.test(value ?? '')) throw new Error('Use a JSON file under .mustflow/state/skill-authoring/');
	return value;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
	try {
		const [action, input, output, ...extra] = process.argv.slice(2);
		const root = process.cwd();
		if (!['plan', 'apply'].includes(action) || extra.length || (action === 'apply' && output)) throw new Error('Usage: skill-author-plan.mjs plan <request.json> <plan.json> | apply <plan.json>');
		const data = JSON.parse(read(root, statePath(input)));
		if (action === 'plan') {
			const target = path.join(root, statePath(output));
			const plan = createSkillAuthorPlan(root, data);
			ensureFileTargetInsideWithoutSymlinks(root, target, { allowMissingLeaf: true });
			mkdirSync(path.dirname(target), { recursive: true });
			ensureFileTargetInsideWithoutSymlinks(root, target, { allowMissingLeaf: true });
			writeFileSync(target, JSON.stringify(plan, null, 2) + '\n', { encoding: 'utf8', flag: 'wx' });
			process.stdout.write(plan.files.map(file => file.path + ' ' + file.before_hash + ' -> ' + hash(file.after)).join('\n') + '\n');
		} else process.stdout.write(applySkillAuthorPlan(root, data).join('\n') + '\n');
	} catch (error) {
		process.stderr.write((error instanceof Error ? error.message : String(error)) + '\n');
		process.exitCode = 1;
	}
}
