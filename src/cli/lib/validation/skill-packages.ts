import { existsSync } from 'node:fs';
import path from 'node:path';
import { isRecord, type TomlTable } from '../command-contract.js';
import { listFilesRecursive, toPosixPath } from '../filesystem.js';
import { readMustflowTomlFile } from '../toml.js';
import { ALLOWED_SKILL_RESOURCE_TYPES, RAW_COMMAND_FENCE_PATTERN, REQUIRED_SKILL_SCRIPT_RUN_POLICY, SKILL_COMMAND_PERMISSION_CLAIM_PATTERNS, SKILL_PACK_ID_PATTERN, SKILL_RESOURCE_MANIFEST, SKILL_RESOURCE_ROOTS, SKILL_RESOURCE_TYPE_BY_ROOT, SUPPORTED_SKILL_SCHEMA_VERSION } from './constants.js';
import { hasOwn, isSafeRelativePath, pushStrictIssue } from './primitives.js';
import type { CheckIssue } from './types.js';
import { isConfiguredCommandIntent, isDeclaredCommandIntent } from './command-intents.js';
import { parseSimpleFrontmatter, readFrontmatterList } from './frontmatter.js';
import { readStrictMustflowText } from './safe-read.js';
import { validateSkillIndexRoutes } from './skill-routes.js';

function normalizeResourcePath(relativePath: string): string {
	return relativePath.replace(/\\/g, '/');
}

function listSkillDirectories(skillsRoot: string): string[] {
	const skillNames = new Set<string>();

	for (const relativePath of listFilesRecursive(skillsRoot)) {
		const normalizedPath = normalizeResourcePath(relativePath);
		const [skillName] = normalizedPath.split('/');

		if (!skillName || !normalizedPath.includes('/')) {
			continue;
		}

		skillNames.add(skillName);
	}

	return [...skillNames].sort();
}

function readSkillResourceManifest(projectRoot: string, manifestLabel: string, issues: CheckIssue[]): TomlTable | undefined {
	try {
		const parsed = readMustflowTomlFile(projectRoot, manifestLabel);

		if (!isRecord(parsed)) {
			pushStrictIssue(issues, `${manifestLabel} must contain a TOML table`);
			return undefined;
		}

		return parsed;
	} catch (error) {
		const message = error instanceof Error ? error.message : String(error);
		pushStrictIssue(issues, `${manifestLabel} is not valid TOML: ${message}`);
		return undefined;
	}
}

function validateSkillScriptResource(
	resource: TomlTable,
	manifestLabel: string,
	resourcePath: string,
	commandsToml: TomlTable | undefined,
	issues: CheckIssue[],
): void {
	if (resource.run_policy !== REQUIRED_SKILL_SCRIPT_RUN_POLICY) {
		pushStrictIssue(
			issues,
			`${manifestLabel} script ${resourcePath} must use run_policy = "${REQUIRED_SKILL_SCRIPT_RUN_POLICY}"`,
		);
	}

	if (typeof resource.command_intent !== 'string' || resource.command_intent.trim().length === 0) {
		pushStrictIssue(issues, `${manifestLabel} script ${resourcePath} must define command_intent`);
	} else if (!isDeclaredCommandIntent(commandsToml, resource.command_intent)) {
		pushStrictIssue(issues, `${manifestLabel} script ${resourcePath} references unknown command intent "${resource.command_intent}"`);
	} else if (!isConfiguredCommandIntent(commandsToml, resource.command_intent)) {
		pushStrictIssue(
			issues,
			`${manifestLabel} script ${resourcePath} references command intent "${resource.command_intent}" that is not configured`,
		);
	}

	if (hasOwn(resource, 'network') && typeof resource.network !== 'boolean') {
		pushStrictIssue(issues, `${manifestLabel} script ${resourcePath} network must be a boolean`);
	} else if (resource.network === true) {
		pushStrictIssue(issues, `${manifestLabel} script ${resourcePath} cannot set network = true`);
	}

	if (hasOwn(resource, 'destructive') && typeof resource.destructive !== 'boolean') {
		pushStrictIssue(issues, `${manifestLabel} script ${resourcePath} destructive must be a boolean`);
	} else if (resource.destructive === true) {
		pushStrictIssue(issues, `${manifestLabel} script ${resourcePath} cannot set destructive = true`);
	}

	if (!hasOwn(resource, 'writes')) {
		return;
	}

	const writes = resource.writes;
	if (!Array.isArray(writes) || writes.some((entry) => typeof entry !== 'string')) {
		pushStrictIssue(issues, `${manifestLabel} script ${resourcePath} writes must be a string array`);
		return;
	}

	if (writes.some((entry) => !isSafeRelativePath(entry))) {
		pushStrictIssue(issues, `${manifestLabel} script ${resourcePath} writes entries must stay inside the skill folder`);
	}
}

function validateSkillResourceTable(
	skillDir: string,
	manifestLabel: string,
	resourcePath: string,
	resource: unknown,
	commandsToml: TomlTable | undefined,
	issues: CheckIssue[],
): string | undefined {
	if (!isSafeRelativePath(resourcePath)) {
		pushStrictIssue(issues, `${manifestLabel} resource path "${resourcePath}" must be a safe relative path`);
		return undefined;
	}

	const normalizedPath = normalizeResourcePath(resourcePath);
	const [rootName] = normalizedPath.split('/');

	if (!rootName || !SKILL_RESOURCE_ROOTS.has(rootName)) {
		pushStrictIssue(issues, `${manifestLabel} resource ${normalizedPath} must live under references/, assets/, or scripts/`);
		return undefined;
	}

	if (!existsSync(path.join(skillDir, normalizedPath))) {
		pushStrictIssue(issues, `${manifestLabel} references missing resource ${normalizedPath}`);
	}

	if (!isRecord(resource)) {
		pushStrictIssue(issues, `${manifestLabel} resource ${normalizedPath} must be a TOML table`);
		return normalizedPath;
	}

	if (typeof resource.type !== 'string' || !ALLOWED_SKILL_RESOURCE_TYPES.has(resource.type)) {
		pushStrictIssue(issues, `${manifestLabel} resource ${normalizedPath} must set type to "reference", "asset", or "script"`);
	} else if (resource.type !== SKILL_RESOURCE_TYPE_BY_ROOT[rootName]) {
		pushStrictIssue(issues, `${manifestLabel} resource ${normalizedPath} type must match its folder`);
	}

	if (typeof resource.purpose !== 'string' || resource.purpose.trim().length === 0) {
		pushStrictIssue(issues, `${manifestLabel} resource ${normalizedPath} must define purpose`);
	}

	if (rootName === 'scripts' || resource.type === 'script') {
		validateSkillScriptResource(resource, manifestLabel, normalizedPath, commandsToml, issues);
	}

	return normalizedPath;
}

function validateSkillResourceManifest(
	projectRoot: string,
	skillDir: string,
	manifestLabel: string,
	commandsToml: TomlTable | undefined,
	issues: CheckIssue[],
): Set<string> {
	const declaredResources = new Set<string>();
	const manifestPath = path.join(skillDir, SKILL_RESOURCE_MANIFEST);

	if (!existsSync(manifestPath)) {
		return declaredResources;
	}

	const manifest = readSkillResourceManifest(projectRoot, manifestLabel, issues);
	if (!manifest) {
		return declaredResources;
	}

	if (manifest.schema_version !== '1') {
		pushStrictIssue(issues, `${manifestLabel} schema_version must be "1"`);
	}

	if (!isRecord(manifest.resources)) {
		pushStrictIssue(issues, `${manifestLabel} must define a [resources] table`);
		return declaredResources;
	}

	for (const [resourcePath, resource] of Object.entries(manifest.resources)) {
		const normalizedPath = validateSkillResourceTable(skillDir, manifestLabel, resourcePath, resource, commandsToml, issues);

		if (normalizedPath) {
			declaredResources.add(normalizedPath);
		}
	}

	return declaredResources;
}

function validateDeclaredSkillScripts(skillDir: string, skillName: string, declaredResources: ReadonlySet<string>, issues: CheckIssue[]): void {
	const scriptsDir = path.join(skillDir, 'scripts');

	for (const relativePath of listFilesRecursive(scriptsDir)) {
		const scriptPath = `scripts/${normalizeResourcePath(relativePath)}`;

		if (!declaredResources.has(scriptPath)) {
			pushStrictIssue(issues, `.mustflow/skills/${skillName}/${scriptPath} is not declared in ${SKILL_RESOURCE_MANIFEST}`);
		}
	}
}

function validateSkillCommandIntentReferences(
	skillLabel: string,
	content: string,
	commandsToml: TomlTable | undefined,
	issues: CheckIssue[],
): void {
	if (!commandsToml || !isRecord(commandsToml.intents)) {
		return;
	}

	for (const intentName of readFrontmatterList(content, 'command_intents')) {
		if (!isDeclaredCommandIntent(commandsToml, intentName)) {
			pushStrictIssue(issues, `${skillLabel} metadata.command_intents references unknown command intent "${intentName}"`);
		}
	}
}

function validateSkillCommandPermissionClaims(skillLabel: string, content: string, issues: CheckIssue[]): void {
	if (SKILL_COMMAND_PERMISSION_CLAIM_PATTERNS.some((pattern) => pattern.test(content))) {
		pushStrictIssue(
			issues,
			`${skillLabel} claims command execution permission; keep permissions in .mustflow/config/commands.toml`,
		);
	}
}

function validateSkillPackageIdentity(
	skillLabel: string,
	skillName: string,
	frontmatter: Record<string, string>,
	issues: CheckIssue[],
): void {
	const packId = frontmatter.pack_id;
	const skillId = frontmatter.skill_id;

	if (!packId || !SKILL_PACK_ID_PATTERN.test(packId)) {
		pushStrictIssue(issues, `${skillLabel} metadata.pack_id must be a dotted package identifier`);
	}

	if (!skillId) {
		pushStrictIssue(issues, `${skillLabel} metadata.skill_id is required`);
		return;
	}

	if (packId && SKILL_PACK_ID_PATTERN.test(packId) && skillId !== `${packId}.${skillName}`) {
		pushStrictIssue(issues, `${skillLabel} metadata.skill_id must be "${packId}.${skillName}"`);
	}
}

export function validateStrictSkills(projectRoot: string, commandsToml: TomlTable | undefined, issues: CheckIssue[]): void {
	const skillsRoot = path.join(projectRoot, '.mustflow', 'skills');
	const skillFiles = listFilesRecursive(skillsRoot).filter((relativePath) => relativePath.endsWith('/SKILL.md'));
	const skillDirectories = listSkillDirectories(skillsRoot);

	validateSkillIndexRoutes(projectRoot, commandsToml, skillFiles, issues);

	for (const skillName of skillDirectories) {
		const skillDir = path.join(skillsRoot, skillName);

		if (!existsSync(path.join(skillDir, 'SKILL.md'))) {
			pushStrictIssue(issues, `.mustflow/skills/${skillName} is a skill folder without SKILL.md`);
		}

		const manifestLabel = `.mustflow/skills/${skillName}/${SKILL_RESOURCE_MANIFEST}`;
		const declaredResources = validateSkillResourceManifest(projectRoot, skillDir, manifestLabel, commandsToml, issues);
		validateDeclaredSkillScripts(skillDir, skillName, declaredResources, issues);
	}

	for (const relativePath of skillFiles) {
		const normalizedRelativePath = toPosixPath(relativePath);
		const content = readStrictMustflowText(projectRoot, `.mustflow/skills/${normalizedRelativePath}`, issues);
		if (content === undefined) {
			continue;
		}
		const skillName = normalizedRelativePath.split('/')[0] ?? '';
		const skillLabel = `.mustflow/skills/${normalizedRelativePath}`;
		const frontmatter = parseSimpleFrontmatter(content);

		if (frontmatter.mustflow_schema !== SUPPORTED_SKILL_SCHEMA_VERSION) {
			pushStrictIssue(issues, `${skillLabel} metadata.mustflow_schema must be "${SUPPORTED_SKILL_SCHEMA_VERSION}"`);
		}

		if (frontmatter.mustflow_kind !== 'procedure') {
			pushStrictIssue(issues, `${skillLabel} metadata.mustflow_kind must be "procedure"`);
		}

		if (frontmatter.name !== skillName) {
			pushStrictIssue(issues, `${skillLabel} frontmatter name must match skill folder "${skillName}"`);
		}

		validateSkillPackageIdentity(skillLabel, skillName, frontmatter, issues);
		validateSkillCommandIntentReferences(skillLabel, content, commandsToml, issues);
		validateSkillCommandPermissionClaims(skillLabel, content, issues);

		if (RAW_COMMAND_FENCE_PATTERN.test(content)) {
			pushStrictIssue(
				issues,
				`${skillLabel} contains a raw shell command block; reference command intents instead`,
			);
		}

		RAW_COMMAND_FENCE_PATTERN.lastIndex = 0;
	}
}
