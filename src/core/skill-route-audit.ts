import { createHash } from 'node:crypto';
import { existsSync, readdirSync } from 'node:fs';
import path from 'node:path';

import { isRecord, readMustflowOwnedTomlFile, type TomlTable } from './config-loading.js';
import { readUtf8FileInsideWithoutSymlinks } from './safe-filesystem.js';
import { parseSkillIndexRoutes } from './skill-route-alignment.js';
import type { ScriptCheckFindingSeverity } from './script-check-result.js';

export const SKILL_ROUTE_AUDIT_PACK_ID = 'repo';
export const SKILL_ROUTE_AUDIT_SCRIPT_ID = 'skill-route-audit';
export const SKILL_ROUTE_AUDIT_SCRIPT_REF = `${SKILL_ROUTE_AUDIT_PACK_ID}/${SKILL_ROUTE_AUDIT_SCRIPT_ID}`;

export type SkillRouteAuditStatus = 'ok' | 'issues_found' | 'partial';

export type SkillRouteAuditFindingCode =
	| 'skill_without_route'
	| 'route_without_skill'
	| 'skill_missing_index_entry'
	| 'index_without_skill'
	| 'route_missing_index_entry'
	| 'frontmatter_name_mismatch'
	| 'template_missing_skill'
	| 'template_extra_skill'
	| 'template_skill_drift'
	| 'template_routes_drift'
	| 'i18n_missing_document'
	| 'i18n_source_mismatch'
	| 'i18n_revision_mismatch'
	| 'manifest_missing_create'
	| 'manifest_create_without_skill'
	| 'manifest_profile_missing_skill'
	| 'manifest_profile_unknown_skill';

export interface SkillRouteAuditFinding {
	readonly code: SkillRouteAuditFindingCode;
	readonly severity: ScriptCheckFindingSeverity;
	readonly message: string;
	readonly path: string;
	readonly skill: string | null;
	readonly route: string | null;
}

export interface SkillRouteAuditCounts {
	readonly source_skills: number;
	readonly index_routes: number;
	readonly route_metadata: number;
	readonly template_skills: number;
	readonly manifest_skill_creates: number;
	readonly manifest_profile_entries: number;
	readonly i18n_skill_documents: number;
}

export interface SkillRouteAuditInventory {
	readonly source_skills: readonly string[];
	readonly index_skills: readonly string[];
	readonly route_skills: readonly string[];
	readonly template_skills: readonly string[];
	readonly manifest_skill_creates: readonly string[];
	readonly manifest_profile_skills: readonly string[];
	readonly i18n_skill_documents: readonly string[];
}

export type SkillRouteAuditRegistryStatus = 'ok' | 'issues_found' | 'partial' | 'not_available' | 'not_evaluated';

export interface SkillRouteAuditRegistryScope {
	readonly status: SkillRouteAuditRegistryStatus;
	readonly profile: string | null;
	readonly skill_root: string | null;
	readonly route_metadata: string | null;
	readonly index: string | null;
	readonly manifest: string | null;
	readonly i18n: string | null;
	readonly note: string;
}

export interface SkillRouteAuditResolution {
	readonly local_registry: SkillRouteAuditRegistryScope;
	readonly packaged_template_registry: SkillRouteAuditRegistryScope;
	readonly shared_workspace_registry: SkillRouteAuditRegistryScope;
	readonly active_install_profile: SkillRouteAuditRegistryScope;
}

export interface SkillRouteAuditInput {
	readonly source_skill_root: '.mustflow/skills';
	readonly template_skill_root: 'templates/default/locales/en/.mustflow/skills';
	readonly template_manifest: 'templates/default/manifest.toml';
	readonly template_i18n: 'templates/default/i18n.toml';
}

export interface SkillRouteAuditReport {
	readonly schema_version: '1';
	readonly command: 'script-pack';
	readonly pack_id: typeof SKILL_ROUTE_AUDIT_PACK_ID;
	readonly script_id: typeof SKILL_ROUTE_AUDIT_SCRIPT_ID;
	readonly script_ref: typeof SKILL_ROUTE_AUDIT_SCRIPT_REF;
	readonly action: 'audit';
	readonly status: SkillRouteAuditStatus;
	readonly ok: boolean;
	readonly mustflow_root: string;
	readonly input: SkillRouteAuditInput;
	readonly input_hash: string;
	readonly counts: SkillRouteAuditCounts;
	readonly inventory: SkillRouteAuditInventory;
	readonly resolution: SkillRouteAuditResolution;
	readonly findings: readonly SkillRouteAuditFinding[];
	readonly issues: readonly string[];
}

interface SkillFileSummary {
	readonly name: string;
	readonly path: string;
	readonly contentHash: string;
	readonly frontmatterName: string | null;
	readonly frontmatterRevision: number | null;
}

interface I18nDocumentSummary {
	readonly id: string;
	readonly source: string;
	readonly revision: number | null;
}

const MAX_TEXT_BYTES = 1024 * 1024;
const SOURCE_SKILL_ROOT = '.mustflow/skills';
const SOURCE_INDEX_PATH = '.mustflow/skills/INDEX.md';
const SOURCE_ROUTES_PATH = '.mustflow/skills/routes.toml';
const TEMPLATE_SKILL_ROOT = 'templates/default/locales/en/.mustflow/skills';
const TEMPLATE_ROUTES_PATH = 'templates/default/locales/en/.mustflow/skills/routes.toml';
const TEMPLATE_MANIFEST_PATH = 'templates/default/manifest.toml';
const TEMPLATE_I18N_PATH = 'templates/default/i18n.toml';
const MANIFEST_LOCK_PATH = '.mustflow/config/manifest.lock.toml';
const SKILL_PATH_PATTERN = /^\.mustflow\/skills\/([^/]+)\/SKILL\.md$/u;

function normalizePath(value: string): string {
	return value.replace(/\\/gu, '/');
}

function relativePathForSkill(skill: string): string {
	return `.mustflow/skills/${skill}/SKILL.md`;
}

function templatePathForSkill(skill: string): string {
	return `templates/default/locales/en/.mustflow/skills/${skill}/SKILL.md`;
}

function uniqueSorted(values: Iterable<string>): string[] {
	return [...new Set(values)].sort((left, right) => left.localeCompare(right));
}

function sha256(value: string): string {
	return `sha256:${createHash('sha256').update(value).digest('hex')}`;
}

function readProjectFile(projectRoot: string, relativePath: string): string {
	return readUtf8FileInsideWithoutSymlinks(projectRoot, path.join(projectRoot, ...relativePath.split('/')), {
		maxBytes: MAX_TEXT_BYTES,
	});
}

function readFrontmatterLines(content: string): readonly string[] {
	if (!content.startsWith('---')) {
		return [];
	}

	const firstLineEnd = content.indexOf('\n');
	if (firstLineEnd < 0) {
		return [];
	}

	const end = content.indexOf('\n---', firstLineEnd + 1);
	if (end < 0) {
		return [];
	}

	return content.slice(firstLineEnd + 1, end).split(/\r?\n/u);
}

function readFrontmatterScalar(lines: readonly string[], key: string): string | null {
	for (const line of lines) {
		const match = /^([a-zA-Z0-9_]+):\s*(.*)$/u.exec(line.trim());
		if (match?.[1] === key) {
			return match[2].trim().replace(/^["']|["']$/gu, '') || null;
		}
	}

	return null;
}

function readFrontmatterRevision(lines: readonly string[]): number | null {
	const value = readFrontmatterScalar(lines, 'revision');
	const parsed = value === null ? Number.NaN : Number.parseInt(value, 10);
	return Number.isInteger(parsed) ? parsed : null;
}

function skillFromSkillPath(skillPath: string): string | null {
	return SKILL_PATH_PATTERN.exec(normalizePath(skillPath))?.[1] ?? null;
}

function readSkillFiles(
	projectRoot: string,
	rootRelativePath: string,
	issues: string[],
	options: { readonly optional?: boolean } = {},
): Map<string, SkillFileSummary> {
	const rootPath = path.join(projectRoot, ...rootRelativePath.split('/'));
	const skills = new Map<string, SkillFileSummary>();

	if (!existsSync(rootPath)) {
		if (!options.optional) {
			issues.push(`Missing skill root: ${rootRelativePath}`);
		}
		return skills;
	}

	for (const entry of readdirSync(rootPath, { withFileTypes: true })) {
		if (!entry.isDirectory()) {
			continue;
		}

		const skillPath = `${rootRelativePath}/${entry.name}/SKILL.md`;
		const absoluteSkillPath = path.join(projectRoot, ...skillPath.split('/'));
		if (!existsSync(absoluteSkillPath)) {
			continue;
		}

		try {
			const content = readProjectFile(projectRoot, skillPath);
			const frontmatter = readFrontmatterLines(content);
			skills.set(entry.name, {
				name: entry.name,
				path: skillPath,
				contentHash: sha256(content.replace(/\r\n/gu, '\n')),
				frontmatterName: readFrontmatterScalar(frontmatter, 'name'),
				frontmatterRevision: readFrontmatterRevision(frontmatter),
			});
		} catch (error) {
			const message = error instanceof Error ? error.message : String(error);
			issues.push(`Could not read ${skillPath}: ${message}`);
		}
	}

	return skills;
}

function readRouteSkillNames(
	projectRoot: string,
	relativePath: string,
	issues: string[],
	options: { readonly optional?: boolean } = {},
): readonly string[] {
	try {
		if (!existsSync(path.join(projectRoot, ...relativePath.split('/')))) {
			if (!options.optional) {
				issues.push(`Missing route metadata: ${relativePath}`);
			}
			return [];
		}

		const parsed = readMustflowOwnedTomlFile(projectRoot, relativePath);
		if (!isRecord(parsed) || !isRecord(parsed.routes)) {
			issues.push(`${relativePath} does not contain a [routes] table`);
			return [];
		}

		return uniqueSorted(Object.keys(parsed.routes));
	} catch (error) {
		const message = error instanceof Error ? error.message : String(error);
		issues.push(`Could not read ${relativePath}: ${message}`);
		return [];
	}
}

function readIndexSkillNames(projectRoot: string, issues: string[]): readonly string[] {
	try {
		const content = readProjectFile(projectRoot, SOURCE_INDEX_PATH);
		return uniqueSorted(parseSkillIndexRoutes(content).map((route) => skillFromSkillPath(route.skillPath)).filter(Boolean) as string[]);
	} catch (error) {
		const message = error instanceof Error ? error.message : String(error);
		issues.push(`Could not read ${SOURCE_INDEX_PATH}: ${message}`);
		return [];
	}
}

function readStringArray(table: TomlTable, key: string): string[] {
	const value = table[key];
	return Array.isArray(value) && value.every((entry) => typeof entry === 'string') ? [...value] : [];
}

function readTemplateManifest(projectRoot: string, issues: string[]): {
	readonly creates: readonly string[];
	readonly profileEntries: readonly string[];
} {
	try {
		if (!existsSync(path.join(projectRoot, ...TEMPLATE_MANIFEST_PATH.split('/')))) {
			return { creates: [], profileEntries: [] };
		}

		const parsed = readMustflowOwnedTomlFile(projectRoot, TEMPLATE_MANIFEST_PATH);
		if (!isRecord(parsed)) {
			issues.push(`${TEMPLATE_MANIFEST_PATH} does not contain a TOML table`);
			return { creates: [], profileEntries: [] };
		}

		const creates = readStringArray(parsed, 'creates').filter((entry) => SKILL_PATH_PATTERN.test(entry));
		const profiles = isRecord(parsed.skill_profiles) ? parsed.skill_profiles : {};
		const profileEntries = Object.values(profiles).flatMap((value) =>
			Array.isArray(value) && value.every((entry) => typeof entry === 'string') ? value : [],
		);

		return {
			creates: uniqueSorted(creates),
			profileEntries: uniqueSorted(profileEntries),
		};
	} catch (error) {
		const message = error instanceof Error ? error.message : String(error);
		issues.push(`Could not read ${TEMPLATE_MANIFEST_PATH}: ${message}`);
		return { creates: [], profileEntries: [] };
	}
}

function readActiveInstallProfile(projectRoot: string, issues: string[]): string | null {
	try {
		if (!existsSync(path.join(projectRoot, ...MANIFEST_LOCK_PATH.split('/')))) {
			return null;
		}

		const parsed = readMustflowOwnedTomlFile(projectRoot, MANIFEST_LOCK_PATH);
		const profile = isRecord(parsed) && isRecord(parsed.template) && typeof parsed.template.profile === 'string'
			? parsed.template.profile.trim()
			: '';

		if (profile.length === 0) {
			issues.push(`${MANIFEST_LOCK_PATH} does not declare a non-empty [template].profile value`);
			return null;
		}

		return profile;
	} catch (error) {
		const message = error instanceof Error ? error.message : String(error);
		issues.push(`Could not read ${MANIFEST_LOCK_PATH}: ${message}`);
		return null;
	}
}

function readI18nDocuments(projectRoot: string, issues: string[]): Map<string, I18nDocumentSummary> {
	const documents = new Map<string, I18nDocumentSummary>();

	try {
		if (!existsSync(path.join(projectRoot, ...TEMPLATE_I18N_PATH.split('/')))) {
			return documents;
		}

		const parsed = readMustflowOwnedTomlFile(projectRoot, TEMPLATE_I18N_PATH);
		if (!isRecord(parsed) || !isRecord(parsed.documents)) {
			issues.push(`${TEMPLATE_I18N_PATH} does not contain a [documents] table`);
			return documents;
		}

		for (const [id, value] of Object.entries(parsed.documents)) {
			if (!id.startsWith('skill.') || !isRecord(value)) {
				continue;
			}

			documents.set(id, {
				id,
				source: typeof value.source === 'string' ? value.source : '',
				revision: Number.isInteger(value.revision) ? Number(value.revision) : null,
			});
		}
	} catch (error) {
		const message = error instanceof Error ? error.message : String(error);
		issues.push(`Could not read ${TEMPLATE_I18N_PATH}: ${message}`);
	}

	return documents;
}

function makeFinding(
	code: SkillRouteAuditFindingCode,
	severity: ScriptCheckFindingSeverity,
	pathValue: string,
	skill: string | null,
	message: string,
	route: string | null = skill,
): SkillRouteAuditFinding {
	return { code, severity, path: pathValue, skill, route, message };
}

function compareSetPresence(
	findings: SkillRouteAuditFinding[],
	left: readonly string[],
	right: readonly string[],
	options: {
		readonly missingCode: SkillRouteAuditFindingCode;
		readonly extraCode: SkillRouteAuditFindingCode;
		readonly missingPath: (skill: string) => string;
		readonly extraPath: (skill: string) => string;
		readonly missingMessage: (skill: string) => string;
		readonly extraMessage: (skill: string) => string;
	},
): void {
	const leftSet = new Set(left);
	const rightSet = new Set(right);

	for (const skill of left) {
		if (!rightSet.has(skill)) {
			findings.push(makeFinding(options.missingCode, 'high', options.missingPath(skill), skill, options.missingMessage(skill)));
		}
	}

	for (const skill of right) {
		if (!leftSet.has(skill)) {
			findings.push(makeFinding(options.extraCode, 'medium', options.extraPath(skill), skill, options.extraMessage(skill)));
		}
	}
}

function createInputHash(reportInput: {
	readonly inventory: SkillRouteAuditInventory;
	readonly resolution: SkillRouteAuditResolution;
	readonly findings: readonly SkillRouteAuditFinding[];
	readonly issues: readonly string[];
}): string {
	return sha256(JSON.stringify(reportInput));
}

function hasFindingCodePrefix(findings: readonly SkillRouteAuditFinding[], prefixes: readonly string[]): boolean {
	return findings.some((finding) => prefixes.some((prefix) => finding.code.startsWith(prefix)));
}

function hasIssueMention(issues: readonly string[], paths: readonly string[]): boolean {
	return issues.some((issue) => paths.some((pathValue) => issue.includes(pathValue)));
}

function createResolution(
	inventory: SkillRouteAuditInventory,
	findings: readonly SkillRouteAuditFinding[],
	issues: readonly string[],
	activeInstallProfile: string | null,
): SkillRouteAuditResolution {
	const localPartial = hasIssueMention(issues, [SOURCE_SKILL_ROOT, SOURCE_INDEX_PATH, SOURCE_ROUTES_PATH]);
	const localIssues = hasFindingCodePrefix(findings, ['skill_', 'route_', 'index_', 'frontmatter_']);
	const templateAvailable =
		inventory.template_skills.length > 0 ||
		inventory.manifest_skill_creates.length > 0 ||
		inventory.manifest_profile_skills.length > 0 ||
		inventory.i18n_skill_documents.length > 0;
	const templatePartial = hasIssueMention(issues, [TEMPLATE_SKILL_ROOT, TEMPLATE_ROUTES_PATH, TEMPLATE_MANIFEST_PATH, TEMPLATE_I18N_PATH]);
	const templateIssues = hasFindingCodePrefix(findings, ['template_', 'manifest_', 'i18n_']);
	const activeInstallPartial = hasIssueMention(issues, [MANIFEST_LOCK_PATH]);
	const activeInstallIssues = findings.some((finding) =>
		finding.code === 'route_without_skill' || finding.code === 'index_without_skill'
	);
	const activeInstallStatus: SkillRouteAuditRegistryStatus = activeInstallPartial
		? 'partial'
		: activeInstallProfile === null
			? 'not_available'
			: activeInstallIssues
				? 'issues_found'
				: 'ok';

	return {
		local_registry: {
			status: localPartial ? 'partial' : localIssues ? 'issues_found' : 'ok',
			profile: null,
			skill_root: SOURCE_SKILL_ROOT,
			route_metadata: SOURCE_ROUTES_PATH,
			index: SOURCE_INDEX_PATH,
			manifest: null,
			i18n: null,
			note: 'Local registry status compares the installed skill files, routes.toml, and INDEX.md inside mustflow_root.',
		},
		packaged_template_registry: {
			status: templatePartial ? 'partial' : !templateAvailable ? 'not_available' : templateIssues ? 'issues_found' : 'ok',
			profile: null,
			skill_root: TEMPLATE_SKILL_ROOT,
			route_metadata: TEMPLATE_ROUTES_PATH,
			index: null,
			manifest: TEMPLATE_MANIFEST_PATH,
			i18n: TEMPLATE_I18N_PATH,
			note: 'Packaged template status compares source skills with the default install template, manifest creates, profiles, and i18n metadata.',
		},
		shared_workspace_registry: {
			status: 'not_evaluated',
			profile: null,
			skill_root: null,
			route_metadata: null,
			index: null,
			manifest: null,
			i18n: null,
			note: 'This script-pack audits the current mustflow_root only; agents in nested repositories must separately inspect any parent shared workspace skill registry named by AGENTS.md.',
		},
		active_install_profile: {
			status: activeInstallStatus,
			profile: activeInstallProfile,
			skill_root: SOURCE_SKILL_ROOT,
			route_metadata: SOURCE_ROUTES_PATH,
			index: SOURCE_INDEX_PATH,
			manifest: MANIFEST_LOCK_PATH,
			i18n: null,
			note:
				activeInstallProfile === null
					? `No active install profile was found in ${MANIFEST_LOCK_PATH}; use local_registry for current files and packaged_template_registry for built-in template coverage.`
					: activeInstallIssues
						? `Active install profile is "${activeInstallProfile}". Route or index entries reference skills absent from the current .mustflow/skills install surface; compare packaged_template_registry and shared_workspace_registry before treating a related skill as missing from mustflow.`
						: `Active install profile is "${activeInstallProfile}". Current route and index entries resolve to local skill files for this installed profile.`,
		},
	};
}

export function auditSkillRoutes(projectRoot: string): SkillRouteAuditReport {
	const root = path.resolve(projectRoot);
	const issues: string[] = [];
	const sourceSkills = readSkillFiles(root, SOURCE_SKILL_ROOT, issues);
	const templateSkills = readSkillFiles(root, TEMPLATE_SKILL_ROOT, issues, { optional: true });
	const sourceSkillNames = uniqueSorted(sourceSkills.keys());
	const templateSkillNames = uniqueSorted(templateSkills.keys());
	const indexSkillNames = readIndexSkillNames(root, issues);
	const routeSkillNames = readRouteSkillNames(root, SOURCE_ROUTES_PATH, issues);
	const templateRouteSkillNames = readRouteSkillNames(root, TEMPLATE_ROUTES_PATH, issues, { optional: true });
	const manifest = readTemplateManifest(root, issues);
	const manifestCreateSkillNames = uniqueSorted(manifest.creates.map((entry) => skillFromSkillPath(entry)).filter(Boolean) as string[]);
	const i18nDocuments = readI18nDocuments(root, issues);
	const i18nSkillNames = uniqueSorted([...i18nDocuments.keys()].map((id) => id.replace(/^skill\./u, '')));
	const activeInstallProfile = readActiveInstallProfile(root, issues);
	const findings: SkillRouteAuditFinding[] = [];

	compareSetPresence(findings, sourceSkillNames, routeSkillNames, {
		missingCode: 'skill_without_route',
		extraCode: 'route_without_skill',
		missingPath: relativePathForSkill,
		extraPath: () => SOURCE_ROUTES_PATH,
		missingMessage: (skill) => `${skill} has a source SKILL.md but no route metadata entry.`,
		extraMessage: (skill) => `${SOURCE_ROUTES_PATH} declares ${skill}, but no source SKILL.md exists.`,
	});

	compareSetPresence(findings, sourceSkillNames, indexSkillNames, {
		missingCode: 'skill_missing_index_entry',
		extraCode: 'index_without_skill',
		missingPath: relativePathForSkill,
		extraPath: () => SOURCE_INDEX_PATH,
		missingMessage: (skill) => `${skill} has a source SKILL.md but no INDEX.md route row.`,
		extraMessage: (skill) => `${SOURCE_INDEX_PATH} references ${skill}, but no source SKILL.md exists.`,
	});

	for (const skill of routeSkillNames) {
		if (!indexSkillNames.includes(skill)) {
			findings.push(
				makeFinding(
					'route_missing_index_entry',
					'medium',
					SOURCE_ROUTES_PATH,
					skill,
					`${SOURCE_ROUTES_PATH} declares ${skill}, but INDEX.md has no matching route row.`,
				),
			);
		}
	}

	for (const [skill, summary] of sourceSkills) {
		if (summary.frontmatterName !== null && summary.frontmatterName !== skill) {
			findings.push(
				makeFinding(
					'frontmatter_name_mismatch',
					'medium',
					summary.path,
					skill,
					`${summary.path} frontmatter name is ${summary.frontmatterName}, expected ${skill}.`,
				),
			);
		}
	}

	if (templateSkillNames.length > 0) {
		compareSetPresence(findings, sourceSkillNames, templateSkillNames, {
			missingCode: 'template_missing_skill',
			extraCode: 'template_extra_skill',
			missingPath: templatePathForSkill,
			extraPath: templatePathForSkill,
			missingMessage: (skill) => `Template locale is missing ${skill}.`,
			extraMessage: (skill) => `Template locale includes ${skill}, but source skills do not.`,
		});
	}

	for (const skill of sourceSkillNames) {
		const source = sourceSkills.get(skill);
		const template = templateSkills.get(skill);
		if (source && template && source.contentHash !== template.contentHash) {
			findings.push(
				makeFinding(
					'template_skill_drift',
					'medium',
					template.path,
					skill,
					`${template.path} does not match ${source.path}.`,
				),
			);
		}
	}

	if (templateRouteSkillNames.length > 0 && routeSkillNames.join('\n') !== templateRouteSkillNames.join('\n')) {
		findings.push(
			makeFinding(
				'template_routes_drift',
				'high',
				TEMPLATE_ROUTES_PATH,
				null,
				`${TEMPLATE_ROUTES_PATH} route keys do not match ${SOURCE_ROUTES_PATH}.`,
				null,
			),
		);
	}

	if (manifestCreateSkillNames.length > 0) {
		compareSetPresence(findings, sourceSkillNames, manifestCreateSkillNames, {
			missingCode: 'manifest_missing_create',
			extraCode: 'manifest_create_without_skill',
			missingPath: relativePathForSkill,
			extraPath: relativePathForSkill,
			missingMessage: (skill) => `${TEMPLATE_MANIFEST_PATH} creates does not install ${skill}.`,
			extraMessage: (skill) => `${TEMPLATE_MANIFEST_PATH} creates installs ${skill}, but no source SKILL.md exists.`,
		});
	}

	const manifestProfileSkills = manifest.profileEntries;
	const manifestProfileSkillSet = new Set(manifestProfileSkills);
	if (manifestProfileSkills.length > 0) {
		for (const skill of sourceSkillNames) {
			if (!manifestProfileSkillSet.has(skill)) {
				findings.push(
					makeFinding(
						'manifest_profile_missing_skill',
						'medium',
						TEMPLATE_MANIFEST_PATH,
						skill,
						`${TEMPLATE_MANIFEST_PATH} skill profiles do not include ${skill}.`,
					),
				);
			}
		}
	}
	for (const skill of manifestProfileSkills) {
		if (!sourceSkills.has(skill)) {
			findings.push(
				makeFinding(
					'manifest_profile_unknown_skill',
					'medium',
					TEMPLATE_MANIFEST_PATH,
					skill,
					`${TEMPLATE_MANIFEST_PATH} skill profiles reference ${skill}, but no source SKILL.md exists.`,
				),
			);
		}
	}

	for (const skill of i18nDocuments.size > 0 ? sourceSkillNames : []) {
		const document = i18nDocuments.get(`skill.${skill}`);
		const source = sourceSkills.get(skill);
		if (!document) {
			findings.push(
				makeFinding(
					'i18n_missing_document',
					'medium',
					TEMPLATE_I18N_PATH,
					skill,
					`${TEMPLATE_I18N_PATH} does not declare documents."skill.${skill}".`,
				),
			);
			continue;
		}

		const expectedSource = `locales/en/.mustflow/skills/${skill}/SKILL.md`;
		if (document.source !== expectedSource) {
			findings.push(
				makeFinding(
					'i18n_source_mismatch',
					'medium',
					TEMPLATE_I18N_PATH,
					skill,
					`documents."skill.${skill}".source is ${document.source}, expected ${expectedSource}.`,
				),
			);
		}

		if (source?.frontmatterRevision !== null && document.revision !== source?.frontmatterRevision) {
			findings.push(
				makeFinding(
					'i18n_revision_mismatch',
					'medium',
					TEMPLATE_I18N_PATH,
					skill,
					`documents."skill.${skill}".revision is ${document.revision}, expected ${source?.frontmatterRevision}.`,
				),
			);
		}
	}

	const inventory = {
		source_skills: sourceSkillNames,
		index_skills: indexSkillNames,
		route_skills: routeSkillNames,
		template_skills: templateSkillNames,
		manifest_skill_creates: manifestCreateSkillNames,
		manifest_profile_skills: manifestProfileSkills,
		i18n_skill_documents: i18nSkillNames,
	} satisfies SkillRouteAuditInventory;
	const resolution = createResolution(inventory, findings, issues, activeInstallProfile);
	const status: SkillRouteAuditStatus = issues.length > 0 ? 'partial' : findings.length > 0 ? 'issues_found' : 'ok';

	return {
		schema_version: '1',
		command: 'script-pack',
		pack_id: SKILL_ROUTE_AUDIT_PACK_ID,
		script_id: SKILL_ROUTE_AUDIT_SCRIPT_ID,
		script_ref: SKILL_ROUTE_AUDIT_SCRIPT_REF,
		action: 'audit',
		status,
		ok: status !== 'partial',
		mustflow_root: root,
		input: {
			source_skill_root: SOURCE_SKILL_ROOT,
			template_skill_root: TEMPLATE_SKILL_ROOT,
			template_manifest: TEMPLATE_MANIFEST_PATH,
			template_i18n: TEMPLATE_I18N_PATH,
		},
		input_hash: createInputHash({ inventory, resolution, findings, issues }),
		counts: {
			source_skills: sourceSkillNames.length,
			index_routes: indexSkillNames.length,
			route_metadata: routeSkillNames.length,
			template_skills: templateSkillNames.length,
			manifest_skill_creates: manifestCreateSkillNames.length,
			manifest_profile_entries: manifestProfileSkills.length,
			i18n_skill_documents: i18nSkillNames.length,
		},
		inventory,
		resolution,
		findings,
		issues,
	};
}
