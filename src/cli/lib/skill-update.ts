import { createHash } from 'node:crypto';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { isRecord } from '../../core/config-loading.js';
import { parseTomlText } from '../../core/toml.js';
import { buildSkillRouteCatalog, serializeSkillRouteCatalog, SKILL_ROUTE_CATALOG_PATH } from '../../core/skill-route-resolution.js';
import { ensureFileTargetInsideWithoutSymlinks, readFileInsideWithoutSymlinks } from './filesystem.js';
import type { LockedFile } from './manifest-lock.js';
import { stringifyToml } from './toml.js';
import type { TemplateFileSource } from './templates.js';

export const SKILL_UPDATE_PREFIX = '.mustflow/skills/';
export const PRESERVED_SKILL_REASON = 'Local skill changes preserved';
const ROUTES = `${SKILL_UPDATE_PREFIX}routes.toml`;
const INDEX = `${SKILL_UPDATE_PREFIX}INDEX.md`;

export interface SkillUpdateDecision {
	readonly action: 'create' | 'update' | 'unchanged';
	readonly reason: string;
	readonly baselineHash: string | null;
	readonly plannedContent?: string | Buffer;
	readonly trackBaseline?: boolean;
	readonly customized?: boolean;
}

function hash(content: string | Buffer): string {
	return `sha256:${createHash('sha256').update(content).digest('hex')}`;
}

/** Append new route tables, retaining authored fields, comments and formatting verbatim. */
function mergeRoutes(current: string, upstream: string): string {
	const local = parseTomlText(current);
	const next = parseTomlText(upstream);
	if (!isRecord(local) || !isRecord(local.routes) || !isRecord(next) || !isRecord(next.routes)) {
		throw new Error('Skill routing metadata must contain a routes table');
	}
	const localRoutes = local.routes;
	const additions = Object.fromEntries(Object.entries(next.routes).filter(([name]) => !Object.hasOwn(localRoutes, name)));
	return Object.keys(additions).length === 0 ? current : `${current}\n${stringifyToml({ routes: additions })}`;
}

function mergeIndex(current: string, upstream: string): string {
	const skillPath = /\.mustflow\/skills\/([^/]+)\/SKILL\.md/u;
	const lines = current.split(/\r?\n/u);
	const installed = new Set(lines.filter(line => line.startsWith('|')).flatMap(line => {
		const skill = skillPath.exec(line)?.[1];
		return skill ? [skill] : [];
	}));
	const sections = new Map<string, string[]>();
	let category = '';
	for (const line of upstream.split(/\r?\n/u)) {
		if (line.startsWith('### ')) category = line;
		const skill = line.startsWith('|') ? skillPath.exec(line)?.[1] : undefined;
		if (!skill || installed.has(skill)) continue;
		const rows = sections.get(category) ?? [];
		rows.push(line);
		sections.set(category, rows);
		installed.add(skill);
	}
	if (sections.size === 0) return current;
	for (const [heading, rows] of sections) {
		const start = lines.indexOf(heading);
		const end = lines.findIndex((line, index) => index > start && /^#{1,3} /u.test(line));
		const separator = start < 0 ? -1 : lines.findIndex((line, index) => index > start && (end < 0 || index < end) && line.startsWith('| --- |'));
		if (separator >= 0) lines.splice(separator + 1, 0, ...rows);
		else lines.push('', heading || '### Installed Skills', '',
			'| Trigger | Skill Document | Required Input | Edit Scope | Risk | Verification Intents | Expected Output |',
			'| --- | --- | --- | --- | --- | --- | --- |', ...rows);
	}
	return lines.join(current.includes('\r\n') ? '\r\n' : '\n');
}

/** Plan source files only. Applying and rollback remain owned by the update transaction. */
export function planSimpleSkillFile(projectRoot: string, templateRoot: string, source: TemplateFileSource, locked?: LockedFile): SkillUpdateDecision {
	const target = path.join(projectRoot, source.relativePath);
	ensureFileTargetInsideWithoutSymlinks(projectRoot, target, { allowMissingLeaf: true });
	const upstream = source.content ?? readFileInsideWithoutSymlinks(templateRoot, source.sourcePath);
	if (!existsSync(target)) {
		return locked
			? { action: 'unchanged', reason: `${PRESERVED_SKILL_REASON}: tracked file was deleted`, baselineHash: null }
			: { action: 'create', reason: 'Profile-selected bundled skill is missing', baselineHash: null, plannedContent: upstream };
	}
	const current = readFileInsideWithoutSymlinks(projectRoot, target);
	const baselineHash = hash(current);
	if (baselineHash === hash(upstream)) {
		return { action: 'unchanged', reason: 'Skill matches the bundle', baselineHash,
			...(!locked || (locked.lastAction !== 'customized' && locked.contentHash !== baselineHash)
				? { trackBaseline: true, plannedContent: current } : {}) };
	}
	if (locked && ['template_locale', 'template_common', 'legacy'].includes(locked.source)
		&& locked.lastAction !== 'customized' && locked.contentHash === baselineHash) {
		return { action: 'update', reason: 'Unmodified bundled skill has an upstream update', baselineHash, plannedContent: upstream };
	}
	const merged = source.relativePath === ROUTES ? mergeRoutes(current.toString(), upstream.toString())
		: source.relativePath === INDEX ? mergeIndex(current.toString(), upstream.toString()) : undefined;
	if (merged !== undefined && merged !== current.toString()) {
		return { action: 'update', reason: 'Add missing skill routing while preserving local overrides', baselineHash,
			plannedContent: merged, customized: true };
	}
	return { action: 'unchanged', reason: `${PRESERVED_SKILL_REASON}: ${locked ? 'edited or customized file' : 'no trusted baseline'}`, baselineHash };
}

export function projectedSkillCatalog(projectRoot: string, sources: readonly TemplateFileSource[],
	decisions: ReadonlyMap<string, SkillUpdateDecision>): string | undefined {
	if (decisions.get(ROUTES)?.plannedContent === undefined && !existsSync(path.join(projectRoot, ROUTES))) return undefined;
	const overrides = new Map<string, string>();
	for (const source of sources) {
		const decision = decisions.get(source.relativePath);
		if (decision?.plannedContent !== undefined) overrides.set(source.relativePath, decision.plannedContent.toString());
	}
	return serializeSkillRouteCatalog(buildSkillRouteCatalog(projectRoot, overrides));
}

export { SKILL_ROUTE_CATALOG_PATH };
