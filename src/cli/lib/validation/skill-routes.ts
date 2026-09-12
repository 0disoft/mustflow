import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { isSkillRouteSearchTerm } from '../../../core/skill-route-text.js';
import { isSkillRoutePathHints } from '../../../core/skill-route-path-hints.js';
import { isRecord, type TomlTable } from '../command-contract.js';
import {
	SKILL_INDEX_ROUTE_COLUMN_COUNT,
	SKILL_INDEX_ROUTE_COLUMNS,
	SKILL_INDEX_SKILL_PATH_COLUMN_INDEX,
	findSkillRouteConflictWarnings,
	findSkillIndexRoutePathColumn,
	parseSkillIndexRoutes,
	readBacktickValues,
} from '../../../core/skill-route-alignment.js';
import { toPosixPath } from '../filesystem.js';
import { parseTomlText, readMustflowTomlFile } from '../toml.js';
import { validateSkillRouteFixtures } from '../../../core/skill-route-fixtures.js';
import { validateSkillRouteCatalogs } from '../../../core/skill-route-resolution.js';
import {
	ALLOWED_SKILL_ROUTE_CATEGORIES,
	ALLOWED_SKILL_ROUTE_PROFILES,
	ALLOWED_SKILL_ROUTE_SELECTION_AXES,
	ALLOWED_SKILL_ROUTE_TYPES,
	ROUTER_INDEX_FILES,
	ROUTER_INDEX_PROCEDURE_SECTION_PATTERN,
	SKILL_INDEX_PATH,
	SKILL_ROUTE_CATEGORY_LABELS,
	SKILL_ROUTES_METADATA_PATH,
} from './constants.js';
import { isPositiveInteger, pushStrictIssue, pushStrictWarning } from './primitives.js';
import type { CheckIssue, SkillRouteMetadata } from './types.js';
import { isDeclaredCommandIntent } from './command-intents.js';
import { readFrontmatterList } from './frontmatter.js';
import { readStrictMustflowText } from './safe-read.js';
import { getDefaultTemplate, getTemplateFiles, type TemplateFileSource } from '../templates.js';

export function validateStrictRouterIndexes(projectRoot: string, issues: CheckIssue[]): void {
	for (const relativePath of ROUTER_INDEX_FILES) {
		const filePath = path.join(projectRoot, relativePath);

		if (!existsSync(filePath)) {
			continue;
		}

		const content = readStrictMustflowText(projectRoot, relativePath, issues);
		if (content === undefined) {
			continue;
		}

		if (ROUTER_INDEX_PROCEDURE_SECTION_PATTERN.test(content)) {
			pushStrictIssue(issues, `${relativePath} must stay a routing index and must not embed skill procedure sections`);
		}
	}
}

export function validateStrictSkillRouteFixtures(projectRoot: string, issues: CheckIssue[]): void {
	for (const issue of validateSkillRouteCatalogs(projectRoot)) {
		pushStrictIssue(issues, issue);
	}
	for (const issue of validateSkillRouteFixtures(projectRoot)) {
		pushStrictIssue(issues, issue.message);
	}
}

function validateSkillIndexRouteShape(content: string, issues: CheckIssue[]): void {
	for (const line of content.split(/\r?\n/u)) {
		if (!line.trim().startsWith('|')) {
			continue;
		}

		const cells = line
			.trim()
			.replace(/^\|/u, '')
			.replace(/\|$/u, '')
			.split('|')
			.map((cell) => cell.trim());
		if (cells.length > 0 && cells.every((cell) => /^:?-{3,}:?$/u.test(cell))) {
			continue;
		}

		const skillPathColumn = findSkillIndexRoutePathColumn(cells);
		if (skillPathColumn < 0) {
			continue;
		}

		const [skillPath] = readBacktickValues(cells[skillPathColumn]);
		if (cells.length !== SKILL_INDEX_ROUTE_COLUMN_COUNT || skillPathColumn !== SKILL_INDEX_SKILL_PATH_COLUMN_INDEX) {
			pushStrictIssue(issues, `${SKILL_INDEX_PATH} route table rows must use columns: ${SKILL_INDEX_ROUTE_COLUMNS}`);
			continue;
		}

		for (const columnIndex of [0, 2, 3, 4, 5, 6]) {
			if (!cells[columnIndex]?.trim()) {
				pushStrictIssue(issues, `${SKILL_INDEX_PATH} route ${skillPath} has an empty route column`);
				break;
			}
		}
	}
}

function skillRouteName(skillPath: string): string | undefined {
	return /^\.mustflow\/skills\/([^/]+)\/SKILL\.md$/u.exec(skillPath)?.[1];
}

function readOptionalStringArray(value: unknown, label: string, issues: CheckIssue[]): string[] {
	if (value === undefined) {
		return [];
	}

	if (!Array.isArray(value) || value.some((entry) => typeof entry !== 'string' || entry.trim().length === 0)) {
		pushStrictIssue(issues, `${label} must be a string array`);
		return [];
	}

	return value.map((entry) => entry.trim());
}

function readOptionalSlugArray(value: unknown, label: string, issues: CheckIssue[]): string[] {
	const values = readOptionalStringArray(value, label, issues);

	for (const value of values) {
		if (!/^[a-z][a-z0-9_-]*$/u.test(value)) {
			pushStrictIssue(issues, `${label} entry "${value}" must use lowercase slug text`);
		}
	}

	return values;
}

function readOptionalSearchTermArray(value: unknown, label: string, issues: CheckIssue[]): string[] {
	const values = readOptionalStringArray(value, label, issues);

	for (const value of values) {
		if (!isSkillRouteSearchTerm(value)) {
			pushStrictIssue(issues, `${label} entry "${value}" must use lowercase Unicode search-term text`);
		}
	}

	return values;
}

function readSkillRouteMetadataContexts(
	value: unknown,
	label: string,
	issues: CheckIssue[],
): SkillRouteMetadata['contexts'] {
	if (value !== undefined && !isRecord(value)) {
		pushStrictIssue(issues, `${label}.contexts must be a TOML table`);
	}

	const contexts = isRecord(value) ? value : {};

	return {
		fileTypes: readOptionalSlugArray(contexts.file_types, `${label}.contexts.file_types`, issues),
		frameworks: readOptionalSlugArray(contexts.frameworks, `${label}.contexts.frameworks`, issues),
		layers: readOptionalSlugArray(contexts.layers, `${label}.contexts.layers`, issues),
		patternCategories: readOptionalSlugArray(contexts.pattern_categories, `${label}.contexts.pattern_categories`, issues),
		positiveTerms: readOptionalSearchTermArray(contexts.positive_terms, `${label}.contexts.positive_terms`, issues),
		negativeTerms: readOptionalSearchTermArray(contexts.negative_terms, `${label}.contexts.negative_terms`, issues),
		exclusionTerms: readOptionalSearchTermArray(contexts.exclusion_terms, `${label}.contexts.exclusion_terms`, issues),
	};
}

function readSkillRouteUnlockRules(
	value: unknown,
	label: string,
	issues: CheckIssue[],
): SkillRouteMetadata['dependencies']['unlocksOn'] {
	if (value === undefined) {
		return [];
	}

	if (!Array.isArray(value) || value.some((entry) => !isRecord(entry))) {
		pushStrictIssue(issues, `${label} must be an array of TOML tables`);
		return [];
	}

	return value
		.map((entry, index) => {
			const signal = typeof entry.signal === 'string' ? entry.signal.trim() : '';
			const skill = typeof entry.skill === 'string' ? entry.skill.trim() : '';
			if (!/^[a-z][a-z0-9_-]*$/u.test(signal)) {
				pushStrictIssue(issues, `${label}[${index}].signal must use lowercase slug text`);
			}
			if (!/^[a-z][a-z0-9-]*$/u.test(skill)) {
				pushStrictIssue(issues, `${label}[${index}].skill must be a skill folder name`);
			}

			return { signal, skill };
		})
		.filter((entry) => entry.signal && entry.skill);
}

function readSkillRouteMetadataDependencies(
	value: unknown,
	label: string,
	issues: CheckIssue[],
): SkillRouteMetadata['dependencies'] {
	if (value !== undefined && !isRecord(value)) {
		pushStrictIssue(issues, `${label}.dependencies must be a TOML table`);
	}

	const dependencies = isRecord(value) ? value : {};

	return {
		requiresSkills: readOptionalSlugArray(dependencies.requires_skills, `${label}.dependencies.requires_skills`, issues),
		suggestsAdjuncts: readOptionalSlugArray(dependencies.suggests_adjuncts, `${label}.dependencies.suggests_adjuncts`, issues),
		conflictsWith: readOptionalSlugArray(dependencies.conflicts_with, `${label}.dependencies.conflicts_with`, issues),
		unlocksOn: readSkillRouteUnlockRules(dependencies.unlocks_on, `${label}.dependencies.unlocks_on`, issues),
	};
}

function validateSkillRouteMetadataTable(
	skillName: string,
	route: TomlTable,
	issues: CheckIssue[],
): SkillRouteMetadata {
	const label = `${SKILL_ROUTES_METADATA_PATH} routes.${skillName}`;
	const rawCategory = typeof route.category === 'string' ? route.category : undefined;
	const category = rawCategory && ALLOWED_SKILL_ROUTE_CATEGORIES.has(rawCategory)
		? (rawCategory as keyof typeof SKILL_ROUTE_CATEGORY_LABELS)
		: undefined;
	const routeType = typeof route.route_type === 'string' ? route.route_type : undefined;
	const selectionAxis = typeof route.selection_axis === 'string' ? route.selection_axis : undefined;
	const profiles = readOptionalStringArray(route.profiles, `${label}.profiles`, issues);
	const appliesToReasons = readOptionalStringArray(route.applies_to_reasons, `${label}.applies_to_reasons`, issues);
	const mutuallyExclusiveWith = readOptionalStringArray(
		route.mutually_exclusive_with,
		`${label}.mutually_exclusive_with`,
		issues,
	);
	const contexts = readSkillRouteMetadataContexts(route.contexts, label, issues);
	if (route.path_hints !== undefined && !isSkillRoutePathHints(route.path_hints)) {
		pushStrictIssue(issues, `${label}.path_hints must contain lowercase unique extensions/basenames arrays and an optional documentation boolean`);
	}
	const dependencies = readSkillRouteMetadataDependencies(route.dependencies, label, issues);

	if (!category) {
		pushStrictIssue(issues, `${label}.category must be one of ${[...ALLOWED_SKILL_ROUTE_CATEGORIES].join(', ')}`);
	}

	if (!routeType || !ALLOWED_SKILL_ROUTE_TYPES.has(routeType)) {
		pushStrictIssue(issues, `${label}.route_type must be one of ${[...ALLOWED_SKILL_ROUTE_TYPES].join(', ')}`);
	}

	if (!selectionAxis || !ALLOWED_SKILL_ROUTE_SELECTION_AXES.has(selectionAxis)) {
		pushStrictIssue(
			issues,
			`${label}.selection_axis must be one of ${[...ALLOWED_SKILL_ROUTE_SELECTION_AXES].join(', ')}`,
		);
	}

	if (!isPositiveInteger(route.priority)) {
		pushStrictIssue(issues, `${label}.priority must be a positive integer`);
	}

	for (const profile of profiles) {
		if (!ALLOWED_SKILL_ROUTE_PROFILES.has(profile)) {
			pushStrictIssue(issues, `${label}.profiles references unknown profile "${profile}"`);
		}
	}

	for (const reason of appliesToReasons) {
		if (!/^[a-z][a-z0-9_]*$/u.test(reason)) {
			pushStrictIssue(issues, `${label}.applies_to_reasons entry "${reason}" must use snake_case`);
		}
	}

	return {
		skillName,
		category,
		routeType,
		selectionAxis,
		priority: route.priority,
		mutuallyExclusiveWith,
		contexts,
		dependencies,
	};
}

function readSkillRouteMetadata(projectRoot: string, issues: CheckIssue[]): Map<string, SkillRouteMetadata> | undefined {
	const metadataPath = path.join(projectRoot, ...SKILL_ROUTES_METADATA_PATH.split('/'));

	if (!existsSync(metadataPath)) {
		return undefined;
	}

	let parsed: unknown;
	try {
		parsed = readMustflowTomlFile(projectRoot, SKILL_ROUTES_METADATA_PATH);
	} catch (error) {
		const message = error instanceof Error ? error.message : String(error);
		pushStrictIssue(issues, `Invalid TOML in ${SKILL_ROUTES_METADATA_PATH}: ${message}`);
		return new Map();
	}

	if (!isRecord(parsed)) {
		pushStrictIssue(issues, `${SKILL_ROUTES_METADATA_PATH} must contain a TOML table`);
		return new Map();
	}

	if (parsed.schema_version !== '1') {
		pushStrictIssue(issues, `${SKILL_ROUTES_METADATA_PATH} schema_version must be "1"`);
	}

	if (!isRecord(parsed.routes)) {
		pushStrictIssue(issues, `${SKILL_ROUTES_METADATA_PATH} must define a [routes] table`);
		return new Map();
	}

	const metadata = new Map<string, SkillRouteMetadata>();

	for (const [skillName, route] of Object.entries(parsed.routes)) {
		if (!/^[a-z][a-z0-9-]*$/u.test(skillName)) {
			pushStrictIssue(issues, `${SKILL_ROUTES_METADATA_PATH} route key "${skillName}" must be a skill folder name`);
			continue;
		}

		if (!isRecord(route)) {
			pushStrictIssue(issues, `${SKILL_ROUTES_METADATA_PATH} routes.${skillName} must be a TOML table`);
			continue;
		}

		metadata.set(skillName, validateSkillRouteMetadataTable(skillName, route, issues));
	}

	return metadata;
}

function validateAdjunctRouteDependency(
	metadata: Map<string, SkillRouteMetadata>,
	issues: CheckIssue[],
	skillName: string,
	targetSkill: string,
	relation: string,
): void {
	const targetRoute = metadata.get(targetSkill);
	if (!targetRoute || targetRoute.routeType === 'adjunct') {
		return;
	}

	pushStrictIssue(
		issues,
		[
			`${SKILL_ROUTES_METADATA_PATH} route "${skillName}" ${relation} route "${targetSkill}"`,
			` must point to an adjunct route, found "${targetRoute.routeType ?? 'unknown'}"`,
		].join(''),
	);
}

function validateSkillRouteMetadataAlignment(
	metadata: Map<string, SkillRouteMetadata>,
	routeSkillNames: ReadonlySet<string>,
	expectedSkillNames: ReadonlySet<string>,
	issues: CheckIssue[],
): void {
	for (const skillName of routeSkillNames) {
		if (!metadata.has(skillName)) {
			pushStrictIssue(issues, `${SKILL_ROUTES_METADATA_PATH} is missing metadata for route "${skillName}"`);
		}
	}

	for (const [skillName, route] of metadata.entries()) {
		if (!routeSkillNames.has(skillName)) {
			pushStrictIssue(issues, `${SKILL_ROUTES_METADATA_PATH} route "${skillName}" is not listed in ${SKILL_INDEX_PATH}`);
		}

		if (!expectedSkillNames.has(skillName)) {
			pushStrictIssue(issues, `${SKILL_ROUTES_METADATA_PATH} route "${skillName}" points to a missing skill document`);
		}

		for (const otherSkillName of route.mutuallyExclusiveWith) {
			if (otherSkillName === skillName) {
				pushStrictIssue(issues, `${SKILL_ROUTES_METADATA_PATH} route "${skillName}" cannot be mutually exclusive with itself`);
			} else if (!metadata.has(otherSkillName)) {
				pushStrictIssue(
					issues,
					`${SKILL_ROUTES_METADATA_PATH} route "${skillName}" references unknown mutually exclusive route "${otherSkillName}"`,
				);
			} else if (!metadata.get(otherSkillName)?.mutuallyExclusiveWith.includes(skillName)) {
				pushStrictWarning(
					issues,
					`${SKILL_ROUTES_METADATA_PATH} route "${skillName}" lists "${otherSkillName}" as mutually exclusive but the reverse route does not`,
				);
			}
		}

		for (const requiredSkill of route.dependencies.requiresSkills) {
			if (requiredSkill === skillName) {
				pushStrictIssue(issues, `${SKILL_ROUTES_METADATA_PATH} route "${skillName}" cannot require itself`);
			} else if (!metadata.has(requiredSkill)) {
				pushStrictIssue(
					issues,
					`${SKILL_ROUTES_METADATA_PATH} route "${skillName}" requires unknown route "${requiredSkill}"`,
				);
			}
		}

		for (const adjunctSkill of route.dependencies.suggestsAdjuncts) {
			if (adjunctSkill === skillName) {
				pushStrictIssue(issues, `${SKILL_ROUTES_METADATA_PATH} route "${skillName}" cannot suggest itself as an adjunct`);
			} else if (!metadata.has(adjunctSkill)) {
				pushStrictIssue(
					issues,
					`${SKILL_ROUTES_METADATA_PATH} route "${skillName}" suggests unknown adjunct route "${adjunctSkill}"`,
				);
			} else {
				validateAdjunctRouteDependency(metadata, issues, skillName, adjunctSkill, 'suggests adjunct');
			}
		}

		for (const conflictingSkill of route.dependencies.conflictsWith) {
			if (conflictingSkill === skillName) {
				pushStrictIssue(issues, `${SKILL_ROUTES_METADATA_PATH} route "${skillName}" cannot conflict with itself`);
			} else if (!metadata.has(conflictingSkill)) {
				pushStrictIssue(
					issues,
					`${SKILL_ROUTES_METADATA_PATH} route "${skillName}" conflicts with unknown route "${conflictingSkill}"`,
				);
			} else if (!metadata.get(conflictingSkill)?.dependencies.conflictsWith.includes(skillName)) {
				pushStrictWarning(
					issues,
					`${SKILL_ROUTES_METADATA_PATH} route "${skillName}" conflicts with "${conflictingSkill}" but the reverse route does not`,
				);
			}
		}

		for (const unlockRule of route.dependencies.unlocksOn) {
			if (unlockRule.skill === skillName) {
				pushStrictIssue(issues, `${SKILL_ROUTES_METADATA_PATH} route "${skillName}" cannot unlock itself`);
			} else if (!metadata.has(unlockRule.skill)) {
				pushStrictIssue(
					issues,
					`${SKILL_ROUTES_METADATA_PATH} route "${skillName}" unlocks unknown route "${unlockRule.skill}" on signal "${unlockRule.signal}"`,
				);
			} else {
				validateAdjunctRouteDependency(
					metadata,
					issues,
					skillName,
					unlockRule.skill,
					`unlocks on signal "${unlockRule.signal}"`,
				);
			}
		}
	}
}

export function validateSkillIndexRoutes(
	projectRoot: string,
	commandsToml: TomlTable | undefined,
	skillFiles: readonly string[],
	issues: CheckIssue[],
): void {
	const skillIndexPath = path.join(projectRoot, SKILL_INDEX_PATH);

	if (!existsSync(skillIndexPath)) {
		return;
	}

	const skillIndexContent = readStrictMustflowText(projectRoot, SKILL_INDEX_PATH, issues);
	if (skillIndexContent === undefined) {
		return;
	}
	validateSkillIndexRouteShape(skillIndexContent, issues);

	const skillRoutes = parseSkillIndexRoutes(skillIndexContent);
	const routedSkillPaths = new Set<string>();
	const expectedSkillPaths = new Set(skillFiles.map((relativePath) => `.mustflow/skills/${relativePath}`));
	const expectedSkillNames = new Set(
		skillFiles
			.map((relativePath) => toPosixPath(relativePath).split('/')[0])
			.filter((value): value is string => Boolean(value)),
	);
	const routedSkillNames = new Set<string>();
	const seenSkillPaths = new Set<string>();
	const routeMetadata = readSkillRouteMetadata(projectRoot, issues);

	for (const warning of findSkillRouteConflictWarnings(skillRoutes)) {
		pushStrictWarning(issues, `${SKILL_INDEX_PATH} ${warning}`);
	}

	for (const route of skillRoutes) {
		if (!route.skillPath.startsWith('.mustflow/skills/') || !route.skillPath.endsWith('/SKILL.md')) {
			pushStrictIssue(issues, `${SKILL_INDEX_PATH} route "${route.skillPath}" must point to .mustflow/skills/<name>/SKILL.md`);
			continue;
		}

		if (seenSkillPaths.has(route.skillPath)) {
			pushStrictIssue(issues, `${SKILL_INDEX_PATH} has duplicate route for ${route.skillPath}`);
		}

		seenSkillPaths.add(route.skillPath);
		routedSkillPaths.add(route.skillPath);
		const routeSkillName = skillRouteName(route.skillPath);
		if (routeSkillName) {
			routedSkillNames.add(routeSkillName);
		}
		const metadata = routeSkillName ? routeMetadata?.get(routeSkillName) : undefined;
		if (metadata?.category && route.category !== metadata.category) {
			pushStrictIssue(
				issues,
				`${SKILL_INDEX_PATH} route "${routeSkillName}" must appear under the ${SKILL_ROUTE_CATEGORY_LABELS[metadata.category]} category section from ${SKILL_ROUTES_METADATA_PATH}`,
			);
		}

		const absoluteSkillPath = path.join(projectRoot, ...route.skillPath.split('/'));
		if (!existsSync(absoluteSkillPath)) {
			pushStrictIssue(issues, `${SKILL_INDEX_PATH} route ${route.skillPath} points to a missing skill document`);
			continue;
		}

		const skillContent = readStrictMustflowText(projectRoot, route.skillPath, issues);
		if (skillContent === undefined) {
			continue;
		}
		const skillCommandIntents = new Set(readFrontmatterList(skillContent, 'command_intents'));

		for (const intentName of route.commandIntents) {
			if (!isDeclaredCommandIntent(commandsToml, intentName)) {
				pushStrictIssue(issues, `${SKILL_INDEX_PATH} route ${route.skillPath} references unknown command intent "${intentName}"`);
			}

			if (!skillCommandIntents.has(intentName)) {
				pushStrictIssue(
					issues,
					`${SKILL_INDEX_PATH} route ${route.skillPath} references command intent "${intentName}" not declared by the skill frontmatter`,
				);
			}
		}
	}

	for (const skillPath of expectedSkillPaths) {
		if (!routedSkillPaths.has(skillPath)) {
			pushStrictIssue(issues, `${skillPath} is not listed in ${SKILL_INDEX_PATH}`);
		}
	}

	if (routeMetadata) {
		validateSkillRouteMetadataAlignment(routeMetadata, routedSkillNames, expectedSkillNames, issues);
	}
}

function templateFileContent(file: TemplateFileSource): string {
	return file.content ?? readFileSync(file.sourcePath, 'utf8');
}

function skillRouteCategoryByLabel(label: string): keyof typeof SKILL_ROUTE_CATEGORY_LABELS | undefined {
	for (const [category, categoryLabel] of Object.entries(SKILL_ROUTE_CATEGORY_LABELS)) {
		if (categoryLabel === label) {
			return category as keyof typeof SKILL_ROUTE_CATEGORY_LABELS;
		}
	}

	return undefined;
}

function splitSkillIndexTableRow(line: string): string[] | undefined {
	const trimmed = line.trim();
	if (!trimmed.startsWith('|') || !trimmed.endsWith('|')) {
		return undefined;
	}

	return trimmed.slice(1, -1).split('|').map((cell) => cell.trim());
}

function collectSkillIndexCategoryHeadings(content: string): Set<keyof typeof SKILL_ROUTE_CATEGORY_LABELS> {
	const categories = new Set<keyof typeof SKILL_ROUTE_CATEGORY_LABELS>();
	let currentSection: string | undefined;

	for (const line of content.split(/\r?\n/u)) {
		const heading = /^(#{2,3})\s+(.+?)\s*$/u.exec(line.trim());
		if (!heading) {
			continue;
		}

		const [, level, title] = heading;
		if (level === '##') {
			currentSection = title;
			continue;
		}

		if (currentSection === 'Specific Routes' && level === '###') {
			const category = skillRouteCategoryByLabel(title);
			if (category) {
				categories.add(category);
			}
		}
	}

	return categories;
}

function collectSkillIndexCategoryGateRows(content: string): Set<keyof typeof SKILL_ROUTE_CATEGORY_LABELS> {
	const categories = new Set<keyof typeof SKILL_ROUTE_CATEGORY_LABELS>();
	let currentSection: string | undefined;

	for (const line of content.split(/\r?\n/u)) {
		const heading = /^(#{2,3})\s+(.+?)\s*$/u.exec(line.trim());
		if (heading) {
			const [, level, title] = heading;
			if (level === '##') {
				currentSection = title;
			}
			continue;
		}

		if (currentSection !== 'Route Category Gate') {
			continue;
		}

		const cells = splitSkillIndexTableRow(line);
		if (!cells || cells.length === 0 || /^:?-{3,}:?$/u.test(cells[0] ?? '') || cells[0] === 'Category') {
			continue;
		}

		const category = skillRouteCategoryByLabel(cells[0] ?? '');
		if (category) {
			categories.add(category);
		}
	}

	return categories;
}

function readSkillRouteMetadataFromTomlContent(
	content: string,
	sourceLabel: string,
	issues: CheckIssue[],
): Map<string, SkillRouteMetadata> {
	let parsed: unknown;
	try {
		parsed = parseTomlText(content);
	} catch (error) {
		const message = error instanceof Error ? error.message : String(error);
		pushStrictIssue(issues, `Invalid TOML in ${sourceLabel}: ${message}`);
		return new Map();
	}

	if (!isRecord(parsed)) {
		pushStrictIssue(issues, `${sourceLabel} must contain a TOML table`);
		return new Map();
	}

	if (parsed.schema_version !== '1') {
		pushStrictIssue(issues, `${sourceLabel} schema_version must be "1"`);
	}

	if (!isRecord(parsed.routes)) {
		pushStrictIssue(issues, `${sourceLabel} must define a [routes] table`);
		return new Map();
	}

	const metadata = new Map<string, SkillRouteMetadata>();

	for (const [skillName, route] of Object.entries(parsed.routes)) {
		if (!/^[a-z][a-z0-9-]*$/u.test(skillName)) {
			pushStrictIssue(issues, `${sourceLabel} route key "${skillName}" must be a skill folder name`);
			continue;
		}

		if (!isRecord(route)) {
			pushStrictIssue(issues, `${sourceLabel} routes.${skillName} must be a TOML table`);
			continue;
		}

		metadata.set(skillName, validateSkillRouteMetadataTable(skillName, route, issues));
	}

	return metadata;
}

function validateTemplateProfileSkillRoutes(
	profile: string,
	files: readonly TemplateFileSource[],
	knownSkillNames: ReadonlySet<string>,
	issues: CheckIssue[],
): void {
	const contentByPath = new Map(files.map((file) => [file.relativePath, templateFileContent(file)]));
	const indexContent = contentByPath.get(SKILL_INDEX_PATH);
	const routesContent = contentByPath.get(SKILL_ROUTES_METADATA_PATH);
	const commandsContent = contentByPath.get('.mustflow/config/commands.toml');

	if (!indexContent) {
		pushStrictIssue(issues, `template profile "${profile}" is missing generated ${SKILL_INDEX_PATH}`);
		return;
	}

	if (!routesContent) {
		pushStrictIssue(issues, `template profile "${profile}" is missing generated ${SKILL_ROUTES_METADATA_PATH}`);
		return;
	}

	let commandsToml: TomlTable | undefined;
	if (commandsContent) {
		try {
			const parsedCommands = parseTomlText(commandsContent);
			if (isRecord(parsedCommands)) {
				commandsToml = parsedCommands;
			}
		} catch {
			commandsToml = undefined;
		}
	}

	const routeMetadata = readSkillRouteMetadataFromTomlContent(
		routesContent,
		`template profile "${profile}" ${SKILL_ROUTES_METADATA_PATH}`,
		issues,
	);
	const skillRoutes = parseSkillIndexRoutes(indexContent);
	const categoryHeadings = collectSkillIndexCategoryHeadings(indexContent);
	const categoryGateRows = collectSkillIndexCategoryGateRows(indexContent);
	const routesByCategory = new Map<keyof typeof SKILL_ROUTE_CATEGORY_LABELS, string[]>();
	const selectedSkillContents = new Map<string, string>();
	const routedSkillNames = new Set<string>();

	for (const [relativePath, content] of contentByPath.entries()) {
		const skillName = skillRouteName(relativePath);
		if (skillName) {
			selectedSkillContents.set(skillName, content);
		}
	}

	for (const [relativePath, content] of contentByPath.entries()) {
		if (relativePath !== SKILL_INDEX_PATH && !skillRouteName(relativePath)) {
			continue;
		}

		for (const match of content.matchAll(/`([a-z][a-z0-9-]+)`/gu)) {
			const referencedSkill = match[1];

			if (referencedSkill && knownSkillNames.has(referencedSkill) && !selectedSkillContents.has(referencedSkill)) {
				pushStrictIssue(
					issues,
					`template profile "${profile}" ${relativePath} references skill "${referencedSkill}" not installed by that profile`,
				);
			}
		}
	}

	for (const route of skillRoutes) {
		const routeSkillName = skillRouteName(route.skillPath);
		if (!routeSkillName) {
			pushStrictIssue(
				issues,
				`template profile "${profile}" ${SKILL_INDEX_PATH} route "${route.skillPath}" must point to .mustflow/skills/<name>/SKILL.md`,
			);
			continue;
		}

		routedSkillNames.add(routeSkillName);
		const metadata = routeMetadata.get(routeSkillName);

		if (!selectedSkillContents.has(routeSkillName)) {
			pushStrictIssue(
				issues,
				`template profile "${profile}" ${SKILL_INDEX_PATH} route "${routeSkillName}" points to a skill not installed by that profile`,
			);
		}

		if (!metadata) {
			pushStrictIssue(
				issues,
				`template profile "${profile}" ${SKILL_ROUTES_METADATA_PATH} is missing metadata for route "${routeSkillName}"`,
			);
		}

		if (metadata?.category && route.category !== metadata.category) {
			pushStrictIssue(
				issues,
				`template profile "${profile}" ${SKILL_INDEX_PATH} route "${routeSkillName}" must appear under the ${SKILL_ROUTE_CATEGORY_LABELS[metadata.category]} category section from ${SKILL_ROUTES_METADATA_PATH}`,
			);
		}

		if (metadata?.category) {
			routesByCategory.set(metadata.category, [...(routesByCategory.get(metadata.category) ?? []), routeSkillName]);
		}

		const skillContent = selectedSkillContents.get(routeSkillName);
		const skillCommandIntents = new Set(skillContent ? readFrontmatterList(skillContent, 'command_intents') : []);

		for (const intentName of route.commandIntents) {
			if (commandsToml && !isDeclaredCommandIntent(commandsToml, intentName)) {
				pushStrictIssue(
					issues,
					`template profile "${profile}" ${SKILL_INDEX_PATH} route "${routeSkillName}" references unknown command intent "${intentName}"`,
				);
			}

			if (!skillCommandIntents.has(intentName)) {
				pushStrictIssue(
					issues,
					`template profile "${profile}" ${SKILL_INDEX_PATH} route "${routeSkillName}" references command intent "${intentName}" not declared by the skill frontmatter`,
				);
			}
		}
	}

	for (const [skillName, metadata] of routeMetadata.entries()) {
		if (!routedSkillNames.has(skillName)) {
			pushStrictIssue(
				issues,
				`template profile "${profile}" ${SKILL_ROUTES_METADATA_PATH} route "${skillName}" is not listed in ${SKILL_INDEX_PATH}`,
			);
		}

		if (!selectedSkillContents.has(skillName)) {
			pushStrictIssue(
				issues,
				`template profile "${profile}" ${SKILL_ROUTES_METADATA_PATH} route "${skillName}" points to a skill not installed by that profile`,
			);
		}

	}

	for (const skillName of selectedSkillContents.keys()) {
		if (!routedSkillNames.has(skillName)) {
			pushStrictIssue(
				issues,
				`template profile "${profile}" skill "${skillName}" is installed but not listed in ${SKILL_INDEX_PATH}`,
			);
		}
	}

	for (const category of categoryHeadings) {
		if (!routesByCategory.has(category)) {
			pushStrictIssue(
				issues,
				`template profile "${profile}" skill index category "${SKILL_ROUTE_CATEGORY_LABELS[category]}" has no route rows`,
			);
		}
	}

	for (const category of categoryGateRows) {
		if (!routesByCategory.has(category)) {
			pushStrictIssue(
				issues,
				`template profile "${profile}" route category gate references "${SKILL_ROUTE_CATEGORY_LABELS[category]}" without route rows`,
			);
		}
	}

	for (const [category, skillNames] of routesByCategory.entries()) {
		const hasSelectableMainRoute = skillNames.some((skillName) => {
			const routeType = routeMetadata.get(skillName)?.routeType;
			return routeType === 'primary' || routeType === 'authoring';
		});

		if (!hasSelectableMainRoute) {
			pushStrictIssue(
				issues,
				`template profile "${profile}" skill category "${SKILL_ROUTE_CATEGORY_LABELS[category]}" must include at least one primary or authoring route`,
			);
		}
	}
}

export function validateStrictTemplateSkillProfiles(issues: CheckIssue[]): void {
	let template;
	try {
		template = getDefaultTemplate();
	} catch (error) {
		const message = error instanceof Error ? error.message : String(error);
		pushStrictIssue(issues, `default template skill profiles could not be loaded: ${message}`);
		return;
	}

	const knownSkillNames = new Set(
		template.manifest.creates
			.map((relativePath) => skillRouteName(relativePath))
			.filter((skillName): skillName is string => Boolean(skillName)),
	);

	for (const profile of template.manifest.profiles) {
		validateTemplateProfileSkillRoutes(
			profile,
			getTemplateFiles(template, template.manifest.defaultLocale, profile),
			knownSkillNames,
			issues,
		);
	}
}
