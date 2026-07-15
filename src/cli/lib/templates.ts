import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { parse } from 'smol-toml';

const DEV_TEMPLATE_ROOT_ENV = 'MUSTFLOW_DEV_TEMPLATE_ROOT';
const ALLOW_DEV_TEMPLATE_ROOT_ENV = 'MUSTFLOW_ALLOW_DEV_TEMPLATE_ROOT';

export interface TemplateManifest {
	readonly id: string;
	readonly version: string;
	readonly commonRoot: string;
	readonly localesRoot?: string;
	readonly creates: string[];
	readonly defaultProfile: string;
	readonly profiles: string[];
	readonly skillProfiles: Readonly<Record<string, readonly string[]>>;
	readonly defaultLocale: string;
	readonly locales: string[];
}

export interface TemplatePaths {
	readonly manifestPath: string;
	readonly templateRoot: string;
	readonly manifest: TemplateManifest;
}

export interface TemplateFileSource {
	readonly relativePath: string;
	readonly sourcePath: string;
	readonly sourceKind: 'common' | 'locale' | 'legacy';
	readonly content?: string;
}

export interface TemplateFileSelectionOptions {
	readonly extraSkillNames?: readonly string[];
}

interface RawManifest {
	readonly id?: unknown;
	readonly version?: unknown;
	readonly files_root?: unknown;
	readonly common_root?: unknown;
	readonly locales_root?: unknown;
	readonly creates?: unknown;
	readonly profiles?: unknown;
	readonly skill_profiles?: unknown;
	readonly locales?: unknown;
}

interface RawManifestGroup {
	readonly default?: unknown;
	readonly available?: unknown;
}

function readStringGroup(raw: unknown, label: string): { defaultValue: string; available: string[] } {
	if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) {
		throw new Error(`Template manifest is missing table: ${label}`);
	}

	const group = raw as RawManifestGroup;

	if (typeof group.default !== 'string') {
		throw new Error(`Template manifest is missing string field: ${label}.default`);
	}

	if (!Array.isArray(group.available) || group.available.some((entry) => typeof entry !== 'string')) {
		throw new Error(`Template manifest is missing string array field: ${label}.available`);
	}

	if (!group.available.includes(group.default)) {
		throw new Error(`Template manifest ${label}.available must include ${label}.default`);
	}

	return {
		defaultValue: group.default,
		available: group.available as string[],
	};
}

function readStringArrayTable(raw: unknown, label: string): Record<string, string[]> {
	if (raw === undefined) {
		return {};
	}

	if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) {
		throw new Error(`Template manifest ${label} must be a table`);
	}

	const table: Record<string, string[]> = {};

	for (const [key, value] of Object.entries(raw)) {
		if (!Array.isArray(value) || value.some((entry) => typeof entry !== 'string')) {
			throw new Error(`Template manifest ${label}.${key} must be a string array`);
		}

		table[key] = value as string[];
	}

	return table;
}

function normalizeTemplateTargetPath(relativePath: string): string {
	return relativePath.replaceAll('\\', '/');
}

export function skillNameForTemplatePath(relativePath: string): string | undefined {
	const match = /^\.mustflow\/skills\/([^/]+)\//u.exec(normalizeTemplateTargetPath(relativePath));

	return match?.[1];
}

function templateSkillNames(creates: readonly string[]): string[] {
	return [
		...new Set(
			creates
				.map((relativePath) => {
					const normalizedPath = normalizeTemplateTargetPath(relativePath);
					const match = /^\.mustflow\/skills\/([^/]+)\/SKILL\.md$/u.exec(normalizedPath);

					return match?.[1];
				})
				.filter((value): value is string => Boolean(value)),
		),
	].sort();
}

function resolveSkillProfileSkills(manifest: Pick<TemplateManifest, 'creates' | 'skillProfiles'>, profile: string): readonly string[] {
	return manifest.skillProfiles[profile] ?? templateSkillNames(manifest.creates);
}

function selectedSkillNames(
	manifest: Pick<TemplateManifest, 'creates' | 'skillProfiles'>,
	profile: string,
	options: TemplateFileSelectionOptions = {},
): readonly string[] {
	return [...new Set([...resolveSkillProfileSkills(manifest, profile), ...(options.extraSkillNames ?? [])])];
}

function shouldIncludeTemplatePath(relativePath: string, selectedSkills: readonly string[]): boolean {
	const normalizedPath = normalizeTemplateTargetPath(relativePath);
	const skillName = skillNameForTemplatePath(normalizedPath);

	if (!skillName) {
		return true;
	}

	return selectedSkills.includes(skillName);
}

const SKILL_INDEX_SKILL_PATH_PATTERN = /`\.mustflow\/skills\/([^/]+)\/SKILL\.md`/u;
const SKILL_NAME_REFERENCE_PATTERN = /`([a-z][a-z0-9-]+)`/gu;
const SKILL_PATH_REFERENCE_PATTERN = /`\.mustflow\/skills\/([^/]+)\/SKILL\.md`/gu;
const UNAVAILABLE_SKILL_REFERENCE_FALLBACK = 'the closest installed route for this scope';
const SKILL_INDEX_HEADING_PATTERN = /^(#{2,3})\s+(.+?)\s*$/u;
const SKILL_INDEX_ROUTE_CATEGORY_NAMES = [
	'Bug and Failure',
	'General Code Change',
	'Tests and Regression',
	'Documentation and Release',
	'Security and Privacy',
	'Data and External Systems',
	'UI and Assets',
	'Architecture Patterns',
	'Workflow and Contract Maintenance',
] as const;

function skillNameFromSkillIndexLine(line: string): string | undefined {
	return SKILL_INDEX_SKILL_PATH_PATTERN.exec(line)?.[1];
}

function parseMarkdownTableCells(line: string): string[] | undefined {
	const trimmedLine = line.trim();

	if (!trimmedLine.startsWith('|') || !trimmedLine.endsWith('|')) {
		return undefined;
	}

	return trimmedLine
		.slice(1, -1)
		.split('|')
		.map((cell) => cell.trim());
}

function isMarkdownTableDivider(cells: readonly string[]): boolean {
	return cells.every((cell) => /^:?-{3,}:?$/u.test(cell));
}

function isMarkdownTableHeading(cells: readonly string[]): boolean {
	const firstCell = cells[0] ?? '';

	return [
		'Category',
		'Classification evidence',
		'Trigger',
	].includes(firstCell);
}

function referencedSkillIndexCategories(text: string): readonly string[] {
	return SKILL_INDEX_ROUTE_CATEGORY_NAMES.filter((categoryName) => text.includes(categoryName));
}

function collectSelectedSkillIndexCategories(lines: readonly string[], selectedSkillSet: ReadonlySet<string>): Set<string> {
	const selectedCategories = new Set<string>();
	let inSpecificRoutes = false;
	let currentCategory: string | undefined;

	for (const line of lines) {
		const heading = SKILL_INDEX_HEADING_PATTERN.exec(line);

		if (heading) {
			const [, level, title] = heading;

			if (level === '##') {
				inSpecificRoutes = title === 'Specific Routes';
				currentCategory = undefined;
				continue;
			}

			if (inSpecificRoutes && level === '###') {
				currentCategory = title;
			}
		}

		const skillName = skillNameFromSkillIndexLine(line);

		if (inSpecificRoutes && currentCategory && skillName && selectedSkillSet.has(skillName)) {
			selectedCategories.add(currentCategory);
		}
	}

	return selectedCategories;
}

function shouldKeepSkillIndexTableRow(
	line: string,
	currentSection: string | undefined,
	selectedCategories: ReadonlySet<string>,
): boolean {
	const cells = parseMarkdownTableCells(line);

	if (!cells || isMarkdownTableDivider(cells) || isMarkdownTableHeading(cells)) {
		return true;
	}

	if (currentSection === 'Route Category Gate') {
		const categoryName = cells[0] ?? '';

		return !SKILL_INDEX_ROUTE_CATEGORY_NAMES.includes(categoryName as (typeof SKILL_INDEX_ROUTE_CATEGORY_NAMES)[number]) ||
			selectedCategories.has(categoryName);
	}

	if (currentSection === 'Classification Prefilter') {
		const categoryNames = referencedSkillIndexCategories(cells.join(' '));

		return categoryNames.length === 0 || categoryNames.some((categoryName) => selectedCategories.has(categoryName));
	}

	return true;
}

function filterSkillIndexContent(content: string, selectedSkills: readonly string[]): string {
	const selectedSkillSet = new Set(selectedSkills);
	const lines = content.split(/\r?\n/u);
	const selectedCategories = collectSelectedSkillIndexCategories(lines, selectedSkillSet);
	const filteredLines: string[] = [];
	let currentSection: string | undefined;
	let skipCurrentSpecificCategory = false;

	for (const line of lines) {
		const heading = SKILL_INDEX_HEADING_PATTERN.exec(line);

		if (heading) {
			const [, level, title] = heading;

			if (level === '##') {
				currentSection = title;
				skipCurrentSpecificCategory = false;
				filteredLines.push(line);
				continue;
			}

			if (currentSection === 'Specific Routes' && level === '###') {
				skipCurrentSpecificCategory = !selectedCategories.has(title);

				if (!skipCurrentSpecificCategory) {
					filteredLines.push(line);
				}

				continue;
			}
		}

		if (skipCurrentSpecificCategory) {
			continue;
		}

		const skillName = skillNameFromSkillIndexLine(line);

		if (skillName && !selectedSkillSet.has(skillName)) {
			continue;
		}

		if (!shouldKeepSkillIndexTableRow(line, currentSection, selectedCategories)) {
			continue;
		}

		filteredLines.push(line);
	}

	return filteredLines.join('\n').replace(/\n{3,}/gu, '\n\n');
}

function filterUnavailableSkillReferences(
	content: string,
	selectedSkills: readonly string[],
	knownSkills: readonly string[],
): string {
	const selectedSkillSet = new Set(selectedSkills);
	const knownSkillSet = new Set(knownSkills);
	const replaceUnavailableReference = (reference: string, skillName: string): string =>
		knownSkillSet.has(skillName) && !selectedSkillSet.has(skillName)
			? UNAVAILABLE_SKILL_REFERENCE_FALLBACK
			: reference;

	return content
		.replace(SKILL_PATH_REFERENCE_PATTERN, replaceUnavailableReference)
		.replace(SKILL_NAME_REFERENCE_PATTERN, replaceUnavailableReference);
}

function filterSkillRouteMetadataContent(content: string, selectedSkills: readonly string[]): string {
	const selectedSkillSet = new Set(selectedSkills);
	let keepCurrentRoute = true;

	return content
		.split(/\r?\n/u)
		.filter((line) => {
			const match = /^\[routes\."([^"]+)"\]\s*$/u.exec(line.trim());

			if (match) {
				keepCurrentRoute = selectedSkillSet.has(match[1] ?? '');
				return keepCurrentRoute;
			}

			return keepCurrentRoute;
		})
		.join('\n');
}

function isAllowedTemplateCreateTarget(relativePath: string): boolean {
	const normalizedPath = normalizeTemplateTargetPath(relativePath);

	if (
		normalizedPath.startsWith('/') ||
		normalizedPath.startsWith('../') ||
		normalizedPath.includes('/../') ||
		normalizedPath.endsWith('/..')
	) {
		return false;
	}

	return normalizedPath === 'AGENTS.md' || normalizedPath.startsWith('.mustflow/');
}

/**
 * mf:anchor cli.templates.install-surface
 * purpose: Keep template installation and update targets inside the mustflow-managed surface.
 * search: template manifest, creates, AGENTS.md, .mustflow, install surface
 * invariant: Template creates targets are limited to AGENTS.md and .mustflow paths.
 * risk: config, security
 */
function validateTemplateCreateTargets(creates: readonly string[]): void {
	const invalidTarget = creates.find((relativePath) => !isAllowedTemplateCreateTarget(relativePath));

	if (!invalidTarget) {
		return;
	}

	throw new Error(
		`Template manifest creates target "${invalidTarget}" outside the mustflow-managed install surface. ` +
			'Template installation and updates may write only AGENTS.md and .mustflow/**.',
	);
}

function readManifest(manifestPath: string): TemplateManifest {
	const raw = parse(readFileSync(manifestPath, 'utf8')) as RawManifest;

	if (typeof raw.id !== 'string') {
		throw new Error(`Template manifest is missing string field: id`);
	}

	if (typeof raw.version !== 'string') {
		throw new Error(`Template manifest is missing string field: version`);
	}

	if (!Array.isArray(raw.creates) || raw.creates.some((entry) => typeof entry !== 'string')) {
		throw new Error(`Template manifest is missing string array field: creates`);
	}

	validateTemplateCreateTargets(raw.creates as string[]);

	const profiles = readStringGroup(raw.profiles, 'profiles');
	const locales = readStringGroup(raw.locales, 'locales');
	const commonRoot = typeof raw.common_root === 'string' ? raw.common_root : raw.files_root;
	const skillProfiles = readStringArrayTable(raw.skill_profiles, 'skill_profiles');
	const availableSkillNames = new Set(templateSkillNames(raw.creates as string[]));

	if (typeof commonRoot !== 'string') {
		throw new Error(`Template manifest is missing string field: common_root`);
	}

	if (raw.locales_root !== undefined && typeof raw.locales_root !== 'string') {
		throw new Error(`Template manifest locales_root must be a string when present`);
	}

	for (const [profile, skills] of Object.entries(skillProfiles)) {
		if (!profiles.available.includes(profile)) {
			throw new Error(`Template manifest skill_profiles.${profile} is not listed in profiles.available`);
		}

		for (const skill of skills) {
			if (!availableSkillNames.has(skill)) {
				throw new Error(`Template manifest skill_profiles.${profile} references unknown skill: ${skill}`);
			}
		}
	}

	return {
		id: raw.id,
		version: raw.version,
		commonRoot,
		localesRoot: raw.locales_root as string | undefined,
		creates: raw.creates as string[],
		defaultProfile: profiles.defaultValue,
		profiles: profiles.available,
		skillProfiles,
		defaultLocale: locales.defaultValue,
		locales: locales.available,
	};
}

export function getDefaultTemplate(): TemplatePaths {
	const packagedTemplateRoot = fileURLToPath(new URL('../../../templates/default', import.meta.url));
	const templateRootOverride = process.env[DEV_TEMPLATE_ROOT_ENV];
	const selectedTemplateRoot =
		templateRootOverride && process.env[ALLOW_DEV_TEMPLATE_ROOT_ENV] === '1'
			? templateRootOverride
			: packagedTemplateRoot;

	const templateRoot = path.resolve(selectedTemplateRoot);
	const manifestPath = path.join(templateRoot, 'manifest.toml');
	const manifest = readManifest(manifestPath);

	return {
		manifestPath,
		templateRoot,
		manifest,
	};
}

export function getTemplateFiles(
	template: TemplatePaths,
	locale: string = template.manifest.defaultLocale,
	profile: string = template.manifest.defaultProfile,
	options: TemplateFileSelectionOptions = {},
): TemplateFileSource[] {
	const commonRoot = path.join(template.templateRoot, template.manifest.commonRoot);
	const localeRoot = template.manifest.localesRoot ? path.join(template.templateRoot, template.manifest.localesRoot, locale) : undefined;
	const sourceLocaleRoot =
		template.manifest.localesRoot && locale !== template.manifest.defaultLocale
			? path.join(template.templateRoot, template.manifest.localesRoot, template.manifest.defaultLocale)
			: undefined;
	const selectedSkills = selectedSkillNames(template.manifest, profile, options);
	const knownSkills = templateSkillNames(template.manifest.creates);

	return template.manifest.creates.filter((relativePath) => shouldIncludeTemplatePath(relativePath, selectedSkills)).map((relativePath) => {
		const localePath = localeRoot ? path.join(localeRoot, ...relativePath.split('/')) : undefined;
		const sourceLocalePath = sourceLocaleRoot ? path.join(sourceLocaleRoot, ...relativePath.split('/')) : undefined;
		const commonPath = path.join(commonRoot, ...relativePath.split('/'));
		const localizedPath = localePath && existsSync(localePath) ? localePath : undefined;
		const fallbackLocalePath = sourceLocalePath && existsSync(sourceLocalePath) ? sourceLocalePath : undefined;
		const commonSourcePath = existsSync(commonPath) ? commonPath : undefined;
		const selectedSourcePath = localizedPath ?? fallbackLocalePath ?? commonSourcePath;
		const selectedContent =
			selectedSourcePath && relativePath === '.mustflow/skills/INDEX.md'
				? filterSkillIndexContent(
						readFileSync(selectedSourcePath, 'utf8'),
						selectedSkills,
					)
				: selectedSourcePath && relativePath === '.mustflow/skills/routes.toml'
					? filterSkillRouteMetadataContent(
							readFileSync(selectedSourcePath, 'utf8'),
							selectedSkills,
						)
					: undefined;
		const content =
			selectedSourcePath && relativePath === '.mustflow/skills/INDEX.md'
				? filterUnavailableSkillReferences(selectedContent ?? '', selectedSkills, knownSkills)
				: selectedSourcePath && /^\.mustflow\/skills\/[^/]+\/SKILL\.md$/u.test(relativePath)
					? filterUnavailableSkillReferences(readFileSync(selectedSourcePath, 'utf8'), selectedSkills, knownSkills)
					: selectedContent;

		if (localizedPath) {
			return {
				relativePath,
				sourcePath: localizedPath,
				sourceKind: 'locale',
				content,
			};
		}

		if (fallbackLocalePath) {
			return {
				relativePath,
				sourcePath: fallbackLocalePath,
				sourceKind: 'locale',
				content,
			};
		}

		if (commonSourcePath) {
			return {
				relativePath,
				sourcePath: commonSourcePath,
				sourceKind: template.manifest.localesRoot ? 'common' : 'legacy',
				content,
			};
		}

		throw new Error(`Template source missing for ${relativePath} in locale ${locale}`);
	});
}
