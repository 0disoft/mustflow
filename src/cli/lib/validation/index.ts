import { validateStrictRetentionPolicy, validateStrictRefreshPolicy, validateStrictHarnessPolicy, validateStrictVerificationSelectionAuthority, validateStrictCandidateContractModelConfigs, validateStrictReleaseVersioningAuthority } from './policies.js';
import { existsSync, statSync } from 'node:fs';
import path from 'node:path';
import { withFileReadCache } from '../../../core/file-read-cache.js';
import { runCheckStage, runAsyncCheckStage } from '../check-progress.js';

import { isRecord, type TomlTable } from '../command-contract.js';
import { readScopedCommandContract } from '../../../core/config-loading.js';
import {
	validateCommandContractConfig,
	validateCommandContractStrictDefaults,
} from '../../../core/command-contract-validation.js';
import { describeCheckIssues, type CheckIssueDetail } from '../../../core/check-issues.js';
import {
	type RetentionLimits,
} from '../../../core/retention-policy.js';
import {
	formatManagedMarkdownLabel,
	getManagedMarkdownExpectation,
} from '../../../core/authority-resolution.js';
import { validateTemplateVersionSync } from '../../../core/release-version-validation.js';
import { validateSourceAnchorsInProject } from '../../../core/source-anchor-validation.js';
import { readWorkspaceCommandAuthorityConfig } from '../../../core/workspace-command-authority.js';
import { readLocalSourceAnchorCheckWarnings } from '../local-index/index.js';
import { listFilesRecursive, toPosixPath } from '../filesystem.js';
import { readGitChangedFiles } from '../git-changes.js';
import { inspectManifestLock, inspectManifestLockPaths } from '../manifest-lock.js';
import { getExpectedRepoFlowSourceFingerprint } from '../repo-flow.js';
import { getExpectedRepoMapSourceFingerprint } from '../repo-map.js';
import { readMustflowTomlFile } from '../toml.js';
import { MUSTFLOW_JSON_MAX_BYTES } from '../mustflow-read.js';
import {
	VERSIONING_CONFIG_PATH,
	detectVersionSourcePaths,
	readDeclaredVersionSources,
	releaseVersioningIsEnabled,
} from '../../../core/version-sources.js';
import {
	isPromptCacheStableLeafSkillSurface,
	measurePromptCacheReferenceBlockBytes,
} from '../../../core/prompt-cache-rendering.js';
import {
	ALLOWED_CONTEXT_DOCUMENT_AUTHORITIES,
	ALLOWED_REPO_MAP_DEGRADED_VALUES,
	ALLOWED_REPO_MAP_GIT_LS_FILES_STATUSES,
	ALLOWED_REPO_FLOW_DEGRADED_VALUES,
	ALLOWED_SKILL_RESOURCE_TYPES,
	CONTEXT_AUTHORITY_DRIFT_PATTERNS,
	DESIGN_TOKEN_DEFINITION_PATTERNS,
	LOCAL_ABSOLUTE_PATH_PATTERNS,
	LOCAL_TASK_STATE_ROOTS,
	RAW_COMMAND_FENCE_PATTERN,
	REPO_MAP_DOC_ID,
	REPO_MAP_GENERATOR,
	REPO_MAP_LIFECYCLE,
	REPO_MAP_PRIVACY_MODE,
	REPO_MAP_RELATIVE_ROOT,
	REPO_MAP_REMOTE_OR_BRANCH_PATTERNS,
	REPO_MAP_SOURCE_FINGERPRINT_PATTERN,
	REPO_MAP_SOURCE_POLICY,
	REPO_FLOW_DOC_ID,
	REPO_FLOW_GENERATOR,
	REPO_FLOW_LIFECYCLE,
	REPO_FLOW_PRIVACY_MODE,
	REPO_FLOW_RELATIVE_ROOT,
	REPO_FLOW_REMOTE_OR_BRANCH_PATTERNS,
	REPO_FLOW_SOURCE_FINGERPRINT_PATTERN,
	REPO_FLOW_SOURCE_POLICY,
	REQUIRED_SKILL_SCRIPT_RUN_POLICY,
	REQUIRED_SKILL_SECTION_IDS,
	SECRET_LIKE_CONTEXT_PATTERNS,
	SKILL_COMMAND_PERMISSION_CLAIM_PATTERNS,
	SKILL_PACK_ID_PATTERN,
	SKILL_RESOURCE_MANIFEST,
	SKILL_RESOURCE_ROOTS,
	SKILL_RESOURCE_TYPE_BY_ROOT,
	SUPPORTED_SKILL_SCHEMA_VERSION,
	VOLATILE_REPO_FLOW_PATTERNS,
	VOLATILE_REPO_MAP_PATTERNS,
} from './constants.js';
import {
	hasOwn,
	isPositiveInteger,
	isSafeRelativePath,
	pushStrictIssue,
	pushStrictWarning,
	validateRequiredFiles,
	validateToml,
} from './primitives.js';
import type { CheckIssue, CheckOptions, ParsedConfigFiles } from './types.js';
export type { CheckOptions } from './types.js';
import { isConfiguredCommandIntent, isDeclaredCommandIntent } from './command-intents.js';
import { parseSimpleFrontmatter, readFrontmatterList, readSkillSectionIds } from './frontmatter.js';
import { readStrictMustflowText } from './safe-read.js';
import {
	validateMustflowConfig,
	validatePreferencesConfig,
	validateTechnologyConfig,
	validateVersioningConfig,
} from './config.js';
import {
	validateStrictRouterIndexes,
	validateStrictSkillRouteFixtures,
	validateSkillIndexRoutes,
	validateStrictTemplateSkillProfiles,
} from './skill-routes.js';
import { validateStrictTestSelectionConfig } from './test-selection.js';

export {
	describeCheckIssues,
	getCheckIssueId,
	type CheckIssueDetail,
	type CheckIssueId,
} from '../../../core/check-issues.js';

function validateCommandIntents(commandsToml: TomlTable | undefined, issues: CheckIssue[]): void {
	issues.push(...validateCommandContractConfig(commandsToml));
}

function validateSkills(projectRoot: string, issues: CheckIssue[]): void {
	const skillsRoot = path.join(projectRoot, '.mustflow', 'skills');
	const skillFiles = listFilesRecursive(skillsRoot).filter((relativePath) => relativePath.endsWith('/SKILL.md'));

	for (const relativePath of skillFiles) {
		const normalizedPath = `.mustflow/skills/${toPosixPath(relativePath)}`;
		const content = readStrictMustflowText(projectRoot, normalizedPath, issues);
		if (content === undefined) {
			continue;
		}
		const sectionIds = readSkillSectionIds(content);
		const missingSectionIds = REQUIRED_SKILL_SECTION_IDS.filter((sectionId) => !sectionIds.has(sectionId));

		if (missingSectionIds.length > 0) {
			issues.push({
				message: `Missing required skill section ids in ${normalizedPath}: ${missingSectionIds.join(', ')}`,
			});
		}
	}
}

function validateContextDocuments(projectRoot: string, issues: CheckIssue[]): void {
	const contextRoot = path.join(projectRoot, '.mustflow', 'context');
	const contextFiles = listFilesRecursive(contextRoot).filter((relativePath) => relativePath.endsWith('.md'));

	for (const relativePath of contextFiles) {
		const normalizedPath = `.mustflow/context/${toPosixPath(relativePath)}`;
		const content = readStrictMustflowText(projectRoot, normalizedPath, issues);
		if (content === undefined) {
			continue;
		}
		const frontmatter = parseSimpleFrontmatter(content);

		if (frontmatter.kind !== 'mustflow-context') {
			issues.push({ message: `${normalizedPath} frontmatter kind must be "mustflow-context"` });
		}

		if (!frontmatter.name) {
			issues.push({ message: `${normalizedPath} frontmatter name is required` });
		}

		if (!frontmatter.authority || !ALLOWED_CONTEXT_DOCUMENT_AUTHORITIES.has(frontmatter.authority)) {
			issues.push({
				message: `${normalizedPath} frontmatter authority must be "contextual", "derived", or "external"`,
			});
		}
	}
}

function validateManifestLock(
	projectRoot: string,
	issues: CheckIssue[],
	requiredPaths?: readonly string[],
): void {
	if (!requiredPaths) {
		for (const issue of inspectManifestLock(projectRoot).issues) {
			issues.push({ message: issue });
		}
		return;
	}

	const scoped = inspectManifestLockPaths(projectRoot, requiredPaths);
	for (const issue of scoped.issues) {
		issues.push({ message: issue });
	}

	if (scoped.readResult.kind === 'present') {
		const trackedPaths = new Set(scoped.readResult.lock.files.map((file) => file.relativePath));
		for (const requiredPath of requiredPaths) {
			if (!trackedPaths.has(requiredPath)) {
				issues.push({ message: `Manifest lock must track scoped file: ${requiredPath}` });
			}
		}
	}

	const scopedIssueSet = new Set(scoped.issues);
	for (const issue of inspectManifestLock(projectRoot).issues) {
		if (!scopedIssueSet.has(issue)) {
			issues.push({
				message: `Deferred unrelated manifest drift: ${issue}`,
				severity: 'warning',
			});
		}
	}
}

function validateStrictStablePromptCacheBudget(
	projectRoot: string,
	promptCache: TomlTable,
	stableRead: readonly unknown[],
	issues: CheckIssue[],
): void {
	if (!isPositiveInteger(promptCache.max_stable_prefix_kb)) {
		return;
	}

	const budgetBytes = Number(promptCache.max_stable_prefix_kb) * 1024;
	let renderedBytes = 0;

	for (const entry of stableRead) {
		if (typeof entry !== 'string' || !isSafeRelativePath(entry)) {
			continue;
		}

		const normalizedPath = toPosixPath(entry);
		const absolutePath = path.join(projectRoot, entry);
		if (!existsSync(absolutePath)) {
			pushStrictIssue(issues, `stable prefix document is missing: ${normalizedPath}`);
			continue;
		}

		const content = readStrictMustflowText(projectRoot, entry, issues);
		if (content === undefined) {
			continue;
		}

		renderedBytes += measurePromptCacheReferenceBlockBytes(entry, content);
	}

	if (renderedBytes > budgetBytes) {
		pushStrictIssue(
			issues,
			`stable prefix exceeds [prompt_cache].max_stable_prefix_kb: ${renderedBytes} rendered bytes > ${budgetBytes} budget bytes`,
		);
	}
}

function validateStrictPromptCachePolicy(projectRoot: string, mustflowToml: TomlTable | undefined, issues: CheckIssue[]): void {
	if (!mustflowToml || !isRecord(mustflowToml.prompt_cache)) {
		pushStrictIssue(issues, '[prompt_cache] table is required');
		return;
	}

	const promptCache = mustflowToml.prompt_cache;
	if (!isRecord(promptCache.layers)) {
		pushStrictIssue(issues, '[prompt_cache.layers] table is required');
		return;
	}

	const stable = promptCache.layers.stable;
	const volatile = promptCache.layers.volatile;
	if (!isRecord(stable) || !Array.isArray(stable.read)) {
		pushStrictIssue(issues, '[prompt_cache.layers.stable].read is required');
		return;
	}

	const volatileSources = isRecord(volatile) && Array.isArray(volatile.sources)
		? new Set(volatile.sources.filter((source): source is string => typeof source === 'string'))
		: new Set<string>();
	for (const entry of stable.read) {
		if (typeof entry === 'string' && volatileSources.has(entry)) {
			pushStrictIssue(issues, `[prompt_cache.layers.stable].read must not include volatile path "${entry}"`);
		}
		if (typeof entry === 'string' && isPromptCacheStableLeafSkillSurface(entry)) {
			pushStrictIssue(
				issues,
				`[prompt_cache.layers.stable].read must not include leaf skill or expanded route surface "${toPosixPath(entry)}"`,
			);
		}
	}

	validateStrictStablePromptCacheBudget(projectRoot, promptCache, stable.read, issues);

	if (promptCache.exclude_volatile_state_from_prefix !== true) {
		pushStrictIssue(issues, '[prompt_cache].exclude_volatile_state_from_prefix should be true');
	}
}

function validateStrictVersionSources(
	projectRoot: string,
	preferencesToml: TomlTable | undefined,
	versioningToml: TomlTable | undefined,
	issues: CheckIssue[],
): void {
	if (versioningToml) {
		for (const source of readDeclaredVersionSources(projectRoot)) {
			if (!existsSync(path.join(projectRoot, source.path))) {
				pushStrictIssue(issues, `${VERSIONING_CONFIG_PATH} source "${source.path}" does not exist`);
			}
		}
	}

	if (!releaseVersioningIsEnabled(preferencesToml)) {
		return;
	}

	if (detectVersionSourcePaths(projectRoot).length > 0) {
		return;
	}

	pushStrictIssue(
		issues,
		'[release.versioning] is enabled but no version source was detected; add .mustflow/config/versioning.toml or a package/template version source',
	);
}

function validateStrictTemplateVersionSync(
	projectRoot: string,
	preferencesToml: TomlTable | undefined,
	issues: CheckIssue[],
): void {
	const changedPathResult = existsSync(path.join(projectRoot, '.git')) ? readGitChangedFiles(projectRoot) : undefined;
	const changedPaths = changedPathResult?.ok ? changedPathResult.files : undefined;

	for (const issue of validateTemplateVersionSync(projectRoot, preferencesToml, changedPaths)) {
		if (issue.severity === 'warning') {
			pushStrictWarning(issues, issue.message);
			continue;
		}

		pushStrictIssue(issues, issue.message);
	}
}

function validateStrictCommandDefaults(
	projectRoot: string,
	commandsToml: TomlTable | undefined,
	issues: CheckIssue[],
): void {
	for (const issue of validateCommandContractStrictDefaults(projectRoot, commandsToml)) {
		if (issue.severity === 'warning') {
			pushStrictWarning(issues, issue.message);
			continue;
		}

		pushStrictIssue(issues, issue.message);
	}
}

function validateStrictWorkspaceIntentAuthority(
	projectRoot: string,
	mustflowToml: TomlTable | undefined,
	commandsToml: TomlTable | undefined,
	issues: CheckIssue[],
): void {
	if (!mustflowToml || !commandsToml || !isRecord(commandsToml.intents)) {
		return;
	}

	let authority;
	try {
		authority = readWorkspaceCommandAuthorityConfig(mustflowToml);
	} catch {
		return;
	}
	if (authority.authorityMode !== 'delegated_scoped') {
		return;
	}

	const rootIntentNames = new Set(Object.keys(commandsToml.intents));
	for (const scope of authority.contracts) {
		let scopedContract;
		try {
			scopedContract = readScopedCommandContract(
				projectRoot,
				scope.files,
				`workspace:${scope.repository}`,
				scope.repository,
			);
		} catch {
			continue;
		}

		for (const intentName of Object.keys(scopedContract.intents)) {
			if (!rootIntentNames.has(intentName)) {
				continue;
			}
			pushStrictIssue(
				issues,
				`delegated workspace intent "${intentName}" for "${scope.repository}" duplicates root command authority; keep the intent in exactly one authority scope`,
			);
		}
	}
}


function listManagedMarkdownDocuments(projectRoot: string): string[] {
	const documents: string[] = [];

	for (const relativePath of ['AGENTS.md', '.mustflow/skills/INDEX.md']) {
		if (existsSync(path.join(projectRoot, relativePath))) {
			documents.push(relativePath);
		}
	}

	for (const root of ['.mustflow/docs', '.mustflow/context']) {
		const rootPath = path.join(projectRoot, root);

		for (const relativePath of listFilesRecursive(rootPath)) {
			if (relativePath.endsWith('.md')) {
				documents.push(`${root}/${toPosixPath(relativePath)}`);
			}
		}
	}

	const skillsRoot = path.join(projectRoot, '.mustflow', 'skills');

	for (const relativePath of listFilesRecursive(skillsRoot)) {
		if (relativePath.endsWith('/SKILL.md')) {
			documents.push(`.mustflow/skills/${toPosixPath(relativePath)}`);
		}
	}

	return [...new Set(documents)].sort();
}

function validateStrictManagedMarkdownIdentities(projectRoot: string, issues: CheckIssue[]): void {
	for (const relativePath of listManagedMarkdownDocuments(projectRoot)) {
		const expectation = getManagedMarkdownExpectation(relativePath);

		if (!expectation) {
			continue;
		}

		const content = readStrictMustflowText(projectRoot, relativePath, issues);
		if (content === undefined) {
			continue;
		}
		const frontmatter = parseSimpleFrontmatter(content);
		const documentLabel = formatManagedMarkdownLabel(relativePath, expectation);

		if (frontmatter.mustflow_doc !== expectation.docId) {
			pushStrictIssue(issues, `${documentLabel} frontmatter mustflow_doc must be "${expectation.docId}"`);
		}

		if (!frontmatter.locale) {
			pushStrictIssue(issues, `${documentLabel} frontmatter locale is required`);
		}

		if (frontmatter.canonical !== 'true' && frontmatter.canonical !== 'false') {
			pushStrictIssue(issues, `${documentLabel} frontmatter canonical must be true or false`);
		}

		if (!/^[1-9]\d*$/u.test(frontmatter.revision ?? '')) {
			pushStrictIssue(issues, `${documentLabel} frontmatter revision must be a positive integer`);
		}

		if (frontmatter.authority !== expectation.authority) {
			pushStrictIssue(issues, `${documentLabel} frontmatter authority must be "${expectation.authority}"`);
		}

		if (frontmatter.lifecycle !== expectation.lifecycle) {
			pushStrictIssue(issues, `${documentLabel} frontmatter lifecycle must be "${expectation.lifecycle}"`);
		}
	}
}

function fileSizeBytes(filePath: string): number {
	return statSync(filePath).size;
}

function exceedsKiBLimit(filePath: string, maxFileKb: number): boolean {
	return fileSizeBytes(filePath) > maxFileKb * 1024;
}

function formatStorageLimitMessage(relativePath: string, field: string, filePath: string, maxFileKb: number): string {
	const actualKiB = Math.ceil(fileSizeBytes(filePath) / 1024);
	return `${relativePath} exceeds ${field} (${actualKiB} KiB > ${maxFileKb} KiB)`;
}

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

function validateStrictSkills(projectRoot: string, commandsToml: TomlTable | undefined, issues: CheckIssue[]): void {
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

function validateStrictRepoMap(projectRoot: string, issues: CheckIssue[]): void {
	const repoMapPath = path.join(projectRoot, 'REPO_MAP.md');

	if (!existsSync(repoMapPath)) {
		return;
	}

	const content = readStrictMustflowText(projectRoot, 'REPO_MAP.md', issues);
	if (content === undefined) {
		return;
	}
	const frontmatter = parseSimpleFrontmatter(content);

	if (frontmatter.mustflow_doc !== REPO_MAP_DOC_ID) {
		pushStrictIssue(issues, `REPO_MAP.md frontmatter mustflow_doc must be "${REPO_MAP_DOC_ID}"`);
	}

	if (frontmatter.lifecycle !== REPO_MAP_LIFECYCLE) {
		pushStrictIssue(issues, `REPO_MAP.md frontmatter lifecycle must be "${REPO_MAP_LIFECYCLE}"`);
	}

	if (frontmatter.generated_by !== REPO_MAP_GENERATOR) {
		pushStrictIssue(issues, `REPO_MAP.md frontmatter generated_by must be "${REPO_MAP_GENERATOR}"`);
	}

	if (frontmatter.relative_root !== REPO_MAP_RELATIVE_ROOT) {
		pushStrictIssue(issues, `REPO_MAP.md frontmatter relative_root must be "${REPO_MAP_RELATIVE_ROOT}"`);
	}

	if (frontmatter.source_policy !== REPO_MAP_SOURCE_POLICY) {
		pushStrictIssue(issues, `REPO_MAP.md frontmatter source_policy must be "${REPO_MAP_SOURCE_POLICY}"`);
	}

	if (frontmatter.privacy_mode !== REPO_MAP_PRIVACY_MODE) {
		pushStrictIssue(issues, `REPO_MAP.md frontmatter privacy_mode must be "${REPO_MAP_PRIVACY_MODE}"`);
	}

	if (!/^[1-9]\d*$/u.test(frontmatter.anchor_count ?? '')) {
		pushStrictIssue(issues, 'REPO_MAP.md frontmatter anchor_count must be a positive integer');
	}

	if (!ALLOWED_REPO_MAP_DEGRADED_VALUES.has(frontmatter.degraded ?? '')) {
		pushStrictIssue(issues, 'REPO_MAP.md frontmatter degraded must be true or false');
	}

	if (!ALLOWED_REPO_MAP_GIT_LS_FILES_STATUSES.has(frontmatter.git_ls_files_status ?? '')) {
		pushStrictIssue(
			issues,
			'REPO_MAP.md frontmatter git_ls_files_status must be ok, timeout, max_buffer, or error',
		);
	}

	if (!REPO_MAP_SOURCE_FINGERPRINT_PATTERN.test(frontmatter.source_fingerprint ?? '')) {
		pushStrictIssue(issues, 'REPO_MAP.md frontmatter source_fingerprint must be sha256:<64 lowercase hex characters>');
	} else {
		const currentSourceFingerprint = frontmatter.source_fingerprint;
		const expectedSourceFingerprint = getExpectedRepoMapSourceFingerprint(projectRoot);

		if (expectedSourceFingerprint && currentSourceFingerprint !== expectedSourceFingerprint) {
			pushStrictIssue(issues, 'REPO_MAP.md source_fingerprint is stale; regenerate with mf map --write');
		}
	}

	if (VOLATILE_REPO_MAP_PATTERNS.some((pattern) => pattern.test(content))) {
		pushStrictIssue(issues, 'REPO_MAP.md contains volatile generated metadata');
	}

	if (REPO_MAP_REMOTE_OR_BRANCH_PATTERNS.some((pattern) => pattern.test(content))) {
		pushStrictIssue(issues, 'REPO_MAP.md contains remote URL or branch metadata');
	}
}

function validateStrictRepoFlow(projectRoot: string, issues: CheckIssue[]): void {
	const repoFlowPath = path.join(projectRoot, 'REPO_FLOW.md');

	if (!existsSync(repoFlowPath)) {
		return;
	}

	const content = readStrictMustflowText(projectRoot, 'REPO_FLOW.md', issues);
	if (content === undefined) {
		return;
	}
	const frontmatter = parseSimpleFrontmatter(content);

	if (frontmatter.mustflow_doc !== REPO_FLOW_DOC_ID) {
		pushStrictIssue(issues, `REPO_FLOW.md frontmatter mustflow_doc must be "${REPO_FLOW_DOC_ID}"`);
	}

	if (frontmatter.lifecycle !== REPO_FLOW_LIFECYCLE) {
		pushStrictIssue(issues, `REPO_FLOW.md frontmatter lifecycle must be "${REPO_FLOW_LIFECYCLE}"`);
	}

	if (frontmatter.generated_by !== REPO_FLOW_GENERATOR) {
		pushStrictIssue(issues, `REPO_FLOW.md frontmatter generated_by must be "${REPO_FLOW_GENERATOR}"`);
	}

	if (frontmatter.relative_root !== REPO_FLOW_RELATIVE_ROOT) {
		pushStrictIssue(issues, `REPO_FLOW.md frontmatter relative_root must be "${REPO_FLOW_RELATIVE_ROOT}"`);
	}

	if (frontmatter.source_policy !== REPO_FLOW_SOURCE_POLICY) {
		pushStrictIssue(issues, `REPO_FLOW.md frontmatter source_policy must be "${REPO_FLOW_SOURCE_POLICY}"`);
	}

	if (frontmatter.privacy_mode !== REPO_FLOW_PRIVACY_MODE) {
		pushStrictIssue(issues, `REPO_FLOW.md frontmatter privacy_mode must be "${REPO_FLOW_PRIVACY_MODE}"`);
	}

	if (!/^[1-9]\d*$/u.test(frontmatter.flow_count ?? '')) {
		pushStrictIssue(issues, 'REPO_FLOW.md frontmatter flow_count must be a positive integer');
	}

	if (!ALLOWED_REPO_FLOW_DEGRADED_VALUES.has(frontmatter.degraded ?? '')) {
		pushStrictIssue(issues, 'REPO_FLOW.md frontmatter degraded must be true or false');
	}

	if (!REPO_FLOW_SOURCE_FINGERPRINT_PATTERN.test(frontmatter.source_fingerprint ?? '')) {
		pushStrictIssue(issues, 'REPO_FLOW.md frontmatter source_fingerprint must be sha256:<64 lowercase hex characters>');
	} else {
		const currentSourceFingerprint = frontmatter.source_fingerprint;
		const expectedSourceFingerprint = getExpectedRepoFlowSourceFingerprint(projectRoot);

		if (expectedSourceFingerprint && currentSourceFingerprint !== expectedSourceFingerprint) {
			pushStrictIssue(issues, 'REPO_FLOW.md source_fingerprint is stale; regenerate with mf flow --write');
		}
	}

	if (VOLATILE_REPO_FLOW_PATTERNS.some((pattern) => pattern.test(content))) {
		pushStrictIssue(issues, 'REPO_FLOW.md contains volatile generated metadata');
	}

	if (REPO_FLOW_REMOTE_OR_BRANCH_PATTERNS.some((pattern) => pattern.test(content))) {
		pushStrictIssue(issues, 'REPO_FLOW.md contains remote URL or branch metadata');
	}
}

function validateStrictContextDocuments(projectRoot: string, limits: RetentionLimits, issues: CheckIssue[]): void {
	const contextRoot = path.join(projectRoot, '.mustflow', 'context');
	const contextFiles = listFilesRecursive(contextRoot).filter((relativePath) => relativePath.endsWith('.md'));
	const hasDesignAnchor = existsSync(path.join(projectRoot, 'DESIGN.md'));

	for (const relativePath of contextFiles) {
		const normalizedPath = `.mustflow/context/${toPosixPath(relativePath)}`;
		const absolutePath = path.join(contextRoot, relativePath);
		const content = readStrictMustflowText(projectRoot, normalizedPath, issues);
		if (content === undefined) {
			continue;
		}

		if (exceedsKiBLimit(absolutePath, limits.contextMaxFileKb)) {
			pushStrictIssue(
				issues,
				formatStorageLimitMessage(normalizedPath, '[retention.context].max_file_kb', absolutePath, limits.contextMaxFileKb),
			);
		}

		if (LOCAL_ABSOLUTE_PATH_PATTERNS.some((pattern) => pattern.test(content))) {
			pushStrictIssue(issues, `${normalizedPath} contains a local absolute path; keep machine-local paths out of context files`);
		}

		if (SECRET_LIKE_CONTEXT_PATTERNS.some((pattern) => pattern.test(content))) {
			pushStrictIssue(issues, `${normalizedPath} contains secret-like key/value text; keep secrets out of context files`);
		}

		if (hasDesignAnchor && DESIGN_TOKEN_DEFINITION_PATTERNS.some((pattern) => pattern.test(content))) {
			pushStrictIssue(issues, `${normalizedPath} duplicates design-token definitions while DESIGN.md exists`);
		}

		if (CONTEXT_AUTHORITY_DRIFT_PATTERNS.some((pattern) => pattern.test(content))) {
			pushStrictIssue(
				issues,
				`${normalizedPath} declares command policy or file-edit prohibitions; keep execution rules in AGENTS.md or .mustflow/config/commands.toml`,
			);
		}
	}
}

/**
 * mf:anchor cli.validation.source-anchors
 * purpose: Validate structured source anchors as navigation metadata with no command authority.
 * search: mf:anchor, duplicate id, forbidden instruction, risk tag, anchor density
 * invariant: Source anchors stay navigation-only and cannot carry command or policy instructions.
 * risk: config, security
 */
function validateStrictSourceAnchors(projectRoot: string, issues: CheckIssue[]): void {
	for (const issue of validateSourceAnchorsInProject(projectRoot)) {
		if (issue.severity === 'warning') {
			pushStrictWarning(issues, issue.message);
			continue;
		}

		pushStrictIssue(issues, issue.message);
	}
}

function validateStrictRunReceipt(projectRoot: string, issues: CheckIssue[]): void {
	const latestRunPath = path.join(projectRoot, '.mustflow', 'state', 'runs', 'latest.json');

	if (!existsSync(latestRunPath)) {
		return;
	}

	try {
		const content = readStrictMustflowText(projectRoot, '.mustflow/state/runs/latest.json', issues, {
			maxBytes: MUSTFLOW_JSON_MAX_BYTES,
		});
		if (content === undefined) {
			return;
		}
		const parsed = JSON.parse(content) as unknown;

		if (!isRecord(parsed)) {
			pushStrictIssue(issues, '.mustflow/state/runs/latest.json must contain a JSON object');
		}
	} catch (error) {
		const message = error instanceof Error ? error.message : String(error);
		pushStrictIssue(issues, `.mustflow/state/runs/latest.json is not valid JSON: ${message}`);
	}
}

function validateStrictStorage(projectRoot: string, limits: RetentionLimits, issues: CheckIssue[]): void {
	const repoMapPath = path.join(projectRoot, 'REPO_MAP.md');

	if (existsSync(repoMapPath) && limits.repoMapFailIfLarger && exceedsKiBLimit(repoMapPath, limits.repoMapMaxFileKb)) {
		pushStrictIssue(
			issues,
			formatStorageLimitMessage('REPO_MAP.md', '[retention.repo_map].max_file_kb', repoMapPath, limits.repoMapMaxFileKb),
		);
	}

	const latestRunPath = path.join(projectRoot, '.mustflow', 'state', 'runs', 'latest.json');

	if (existsSync(latestRunPath) && exceedsKiBLimit(latestRunPath, limits.runReceiptMaxFileKb)) {
		pushStrictIssue(
			issues,
			formatStorageLimitMessage(
				'.mustflow/state/runs/latest.json',
				'[retention.run_receipts].max_file_kb',
				latestRunPath,
				limits.runReceiptMaxFileKb,
			),
		);
	}

	const knowledgeRoot = path.join(projectRoot, '.mustflow', 'knowledge');
	const knowledgeFiles = listFilesRecursive(knowledgeRoot);

	for (const relativePath of knowledgeFiles) {
		const absolutePath = path.join(knowledgeRoot, relativePath);

		if (exceedsKiBLimit(absolutePath, limits.knowledgeMaxFileKb)) {
			pushStrictIssue(
				issues,
				formatStorageLimitMessage(
					`.mustflow/knowledge/${toPosixPath(relativePath)}`,
					'[retention.knowledge].max_file_kb',
					absolutePath,
					limits.knowledgeMaxFileKb,
				),
			);
		}
	}

	const mustflowRoot = path.join(projectRoot, '.mustflow');
	const mustflowFiles = listFilesRecursive(mustflowRoot);

	for (const relativePath of mustflowFiles) {
		const normalizedPath = toPosixPath(relativePath);
		const [topLevelDirectory] = normalizedPath.split('/');

		if (relativePath.toLowerCase().endsWith('.jsonl')) {
			pushStrictIssue(issues, `.mustflow/${normalizedPath} is a raw JSONL file under .mustflow`);
		}

		if (topLevelDirectory && LOCAL_TASK_STATE_ROOTS.has(topLevelDirectory)) {
			pushStrictIssue(
				issues,
				`.mustflow/${normalizedPath} is per-task local state; keep plans and worklogs under ignored local state`,
			);
		}
	}
}

function validateStrict(projectRoot: string, parsed: ParsedConfigFiles, issues: CheckIssue[], options: CheckOptions): void {
	const retentionLimits = runCheckStage('strict_retention_policy', options.onProgress, () => validateStrictRetentionPolicy(parsed.mustflowToml, issues));
	runCheckStage('strict_prompt_cache_policy', options.onProgress, () => validateStrictPromptCachePolicy(projectRoot, parsed.mustflowToml, issues));
	runCheckStage('strict_refresh_policy', options.onProgress, () => validateStrictRefreshPolicy(parsed.mustflowToml, issues));
	runCheckStage('strict_harness_policy', options.onProgress, () => validateStrictHarnessPolicy(parsed.mustflowToml, issues));
	runCheckStage('strict_command_defaults', options.onProgress, () => validateStrictCommandDefaults(projectRoot, parsed.commandsToml, issues));
	runCheckStage('strict_workspace_intent_authority', options.onProgress, () => validateStrictWorkspaceIntentAuthority(projectRoot, parsed.mustflowToml, parsed.commandsToml, issues));
	runCheckStage('strict_release_versioning_authority', options.onProgress, () => validateStrictReleaseVersioningAuthority(parsed.preferencesToml, issues));
	runCheckStage('strict_verification_selection_authority', options.onProgress, () => validateStrictVerificationSelectionAuthority(parsed.preferencesToml, issues));
	runCheckStage('strict_candidate_contract_model_configs', options.onProgress, () => validateStrictCandidateContractModelConfigs(projectRoot, issues));
	runCheckStage('strict_test_selection_config', options.onProgress, () => validateStrictTestSelectionConfig(projectRoot, parsed.commandsToml, issues));
	runCheckStage('strict_version_sources', options.onProgress, () => validateStrictVersionSources(projectRoot, parsed.preferencesToml, parsed.versioningToml, issues));
	runCheckStage('strict_template_version_sync', options.onProgress, () => validateStrictTemplateVersionSync(projectRoot, parsed.preferencesToml, issues));
	runCheckStage('strict_managed_markdown_identities', options.onProgress, () => validateStrictManagedMarkdownIdentities(projectRoot, issues));
	runCheckStage('strict_router_indexes', options.onProgress, () => validateStrictRouterIndexes(projectRoot, issues));
	runCheckStage('strict_skill_route_fixtures', options.onProgress, () => validateStrictSkillRouteFixtures(projectRoot, issues));
	runCheckStage('strict_skills', options.onProgress, () => validateStrictSkills(projectRoot, parsed.commandsToml, issues));
	runCheckStage('strict_template_skill_profiles', options.onProgress, () => validateStrictTemplateSkillProfiles(issues));
	runCheckStage('strict_repo_map', options.onProgress, () => validateStrictRepoMap(projectRoot, issues));
	runCheckStage('strict_repo_flow', options.onProgress, () => validateStrictRepoFlow(projectRoot, issues));
	runCheckStage('strict_context_documents', options.onProgress, () => validateStrictContextDocuments(projectRoot, retentionLimits, issues));
	runCheckStage('strict_source_anchors', options.onProgress, () => validateStrictSourceAnchors(projectRoot, issues));
	runCheckStage('strict_run_receipt', options.onProgress, () => validateStrictRunReceipt(projectRoot, issues));
	runCheckStage('strict_storage', options.onProgress, () => validateStrictStorage(projectRoot, retentionLimits, issues));
}

function validateStrictScoped(projectRoot: string, parsed: ParsedConfigFiles, issues: CheckIssue[], options: CheckOptions): void {
	runCheckStage('strict_command_defaults', options.onProgress, () => validateStrictCommandDefaults(projectRoot, parsed.commandsToml, issues));
	runCheckStage('strict_test_selection_config', options.onProgress, () => validateStrictTestSelectionConfig(projectRoot, parsed.commandsToml, issues));
}

function collectCheckIssues(projectRoot: string, options: CheckOptions = {}): CheckIssue[] {
	return withFileReadCache(() => collectUncachedCheckIssues(projectRoot, options));
}

function collectUncachedCheckIssues(projectRoot: string, options: CheckOptions): CheckIssue[] {
	const issues: CheckIssue[] = [];

	runCheckStage('required_files', options.onProgress, () => validateRequiredFiles(projectRoot, issues));
	const parsed = runCheckStage('toml', options.onProgress, () => validateToml(projectRoot, issues, options.scope?.commandsToml));
	runCheckStage('mustflow_config', options.onProgress, () => validateMustflowConfig(parsed.mustflowToml, issues));
	runCheckStage('preferences_config', options.onProgress, () => validatePreferencesConfig(parsed.preferencesToml, issues));
	runCheckStage('technology_config', options.onProgress, () => validateTechnologyConfig(parsed.technologyToml, issues));
	runCheckStage('versioning_config', options.onProgress, () => validateVersioningConfig(parsed.versioningToml, issues));
	runCheckStage('command_intents', options.onProgress, () => validateCommandIntents(parsed.commandsToml, issues));
	if (!options.scope) {
		runCheckStage('skills', options.onProgress, () => validateSkills(projectRoot, issues));
		runCheckStage('context_documents', options.onProgress, () => validateContextDocuments(projectRoot, issues));
	}
	runCheckStage('manifest_lock', options.onProgress, () => validateManifestLock(projectRoot, issues, options.scope?.manifestPaths));

	if (options.strict) {
		if (options.scope) {
			validateStrictScoped(projectRoot, parsed, issues, options);
		} else {
			validateStrict(projectRoot, parsed, issues, options);
		}
	}

	return issues;
}

export interface CheckProjectReport {
	readonly issues: string[];
	readonly warnings: string[];
	readonly allMessages: string[];
	readonly issueDetails: CheckIssueDetail[];
}

export function checkMustflowProjectReport(projectRoot: string, options: CheckOptions = {}): CheckProjectReport {
	const issues = collectCheckIssues(projectRoot, options);
	return checkProjectReportFromIssues(issues);
}

function checkProjectReportFromIssues(issues: readonly CheckIssue[]): CheckProjectReport {
	const errorIssues = issues.filter((issue) => issue.severity !== 'warning');
	const warningIssues = issues.filter((issue) => issue.severity === 'warning');
	const errors = errorIssues.map((issue) => issue.message);
	const warnings = warningIssues.map((issue) => issue.message);

	return {
		issues: errors,
		warnings,
		allMessages: [...errors, ...warnings],
		issueDetails: describeCheckIssues([...errorIssues, ...warningIssues]),
	};
}

async function collectGeneratedSourceAnchorIndexWarnings(projectRoot: string, options: CheckOptions): Promise<CheckIssue[]> {
	if (!options.strict) {
		return [];
	}

	const warnings = await readLocalSourceAnchorCheckWarnings(projectRoot);
	return warnings.map((message) => ({
		message: `Strict warning: ${message}`,
		severity: 'warning' as const,
	}));
}

export async function checkMustflowProjectReportWithGeneratedState(projectRoot: string, options: CheckOptions = {}): Promise<CheckProjectReport> {
	const issues = collectCheckIssues(projectRoot, options);
	issues.push(...(await runAsyncCheckStage('generated_source_anchor_index', options.onProgress,
		() => collectGeneratedSourceAnchorIndexWarnings(projectRoot, options))));
	return checkProjectReportFromIssues(issues);
}

export function checkMustflowProject(projectRoot: string, options: CheckOptions = {}): string[] {
	return checkMustflowProjectReport(projectRoot, options).issues;
}
