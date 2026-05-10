import { existsSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';

import { isRecord, type TomlTable } from './command-contract.js';
import {
	validateCommandContractConfig,
	validateCommandContractStrictDefaults,
} from '../../core/command-contract-validation.js';
import {
	ALLOWED_RETENTION_ON_LIMIT,
	ALLOWED_RETENTION_STORES,
	DEFAULT_RETENTION_LIMITS,
	readNestedRetentionTable,
	readRetentionTable,
	resolveRetentionLimits,
	type RetentionLimits,
} from '../../core/retention-policy.js';
import {
	formatManagedMarkdownLabel,
	getManagedMarkdownExpectation,
} from '../../core/authority-resolution.js';
import {
	SKILL_INDEX_ROUTE_COLUMN_COUNT,
	SKILL_INDEX_ROUTE_COLUMNS,
	SKILL_INDEX_SKILL_PATH_COLUMN_INDEX,
	SKILL_INDEX_VERIFICATION_INTENTS_COLUMN_INDEX,
	findSkillIndexRoutePathColumn,
	parseSkillIndexRoutes,
	readBacktickValues,
} from '../../core/skill-route-alignment.js';
import { validateTemplateVersionSync } from '../../core/release-version-validation.js';
import { validateSourceAnchorsInProject } from '../../core/source-anchor-validation.js';
import { listFilesRecursive, toPosixPath } from './filesystem.js';
import { inspectManifestLock } from './manifest-lock.js';
import { COMMIT_MESSAGE_STYLES, TEST_AUTHORING_POLICIES } from './preferences-options.js';
import { generateRepoMap } from './repo-map.js';
import { readTomlFile } from './toml.js';
import {
	VERSIONING_CONFIG_PATH,
	VERSION_SOURCE_AUTHORITIES,
	VERSION_SOURCE_KINDS,
	detectVersionSourcePaths,
	readDeclaredVersionSources,
	releaseVersioningIsEnabled,
} from '../../core/version-sources.js';

export {
	describeCheckIssues,
	getCheckIssueId,
	type CheckIssueDetail,
	type CheckIssueId,
} from '../../core/check-issues.js';

const REQUIRED_SKILL_SECTION_IDS = [
	'purpose',
	'use-when',
	'do-not-use-when',
	'required-inputs',
	'preconditions',
	'allowed-edits',
	'procedure',
	'postconditions',
	'verification',
	'failure-handling',
	'output-format',
] as const;
const SKILL_SECTION_MARKER_PATTERN = /^<!--\s*mustflow-section:\s*([a-z][a-z0-9-]*)\s*-->\s*\r?\n##\s+.+$/gimu;

const REQUIRED_FILES = [
	'AGENTS.md',
	'.mustflow/config/mustflow.toml',
	'.mustflow/config/commands.toml',
	'.mustflow/skills/INDEX.md',
];
const ALLOWED_MAP_MODES = new Set(['anchors_only']);
const ALLOWED_MAP_PRIVACY_LEVELS = new Set(['minimal']);
const ALLOWED_CONTEXT_READ_POLICIES = new Set(['task_relevant_only']);
const ALLOWED_CONTEXT_AUTHORITIES = new Set(['contextual']);
const ALLOWED_CONTEXT_DOCUMENT_AUTHORITIES = new Set(['contextual', 'derived', 'external', 'router']);
const CAPABILITY_STATE_FIELDS = ['repo_map', 'preferences', 'context', 'local_index', 'work_items', 'services'] as const;
const CAPABILITY_BOOLEAN_FIELDS = ['workflow', 'command_contract', 'skills'] as const;
const ALLOWED_CAPABILITY_STATES = new Set(['disabled', 'optional', 'required', 'generated_optional']);
const REQUIRED_AGENT_LOOP_PHASES = ['orient', 'plan', 'act', 'verify', 'report', 'handoff'] as const;
const ALLOWED_HANDOFF_MODES = new Set(['report_only', 'work_item_optional']);
const ALLOWED_PROJECT_PROFILES = new Set(['minimal', 'oss', 'team', 'product', 'library']);
const RELEASE_VERSIONING_BOOLEAN_FIELDS = [
	'impact_check',
	'suggest_bump',
	'auto_bump',
	'require_user_confirmation',
	'sync_template_version',
	'sync_docs_examples',
	'sync_tests',
] as const;
const FORBIDDEN_RELEASE_VERSIONING_CONTRACT_FIELDS = [
	'path',
	'paths',
	'source',
	'sources',
	'version_source',
	'version_sources',
	'authority',
	'kind',
	'command_intents',
	'run_policy',
	'argv',
	'cmd',
	'release',
	'tag',
	'push',
	'commit',
] as const;
const ALLOWED_VERSION_SOURCE_KINDS = new Set(VERSION_SOURCE_KINDS);
const ALLOWED_VERSION_SOURCE_AUTHORITIES = new Set(VERSION_SOURCE_AUTHORITIES);
const ALLOWED_COMMIT_MESSAGE_STYLES = new Set(COMMIT_MESSAGE_STYLES);
const VERIFICATION_SELECTION_BOOLEAN_FIELDS = [
	'prefer_related_tests',
	'skip_docs_only_full_test',
	'skip_low_risk_code_full_test',
	'skip_translation_only_full_test',
	'skip_copy_only_full_test',
	'report_skipped',
] as const;
const FORBIDDEN_VERIFICATION_SELECTION_AUTHORITY_FIELDS = [
	'intents',
	'command_intents',
	'required_after',
	'status',
	'lifecycle',
	'run_policy',
	'argv',
	'cmd',
	'writes',
	'network',
	'destructive',
] as const;
const ALLOWED_VERIFICATION_SELECTION_STRATEGIES = new Set(['risk_based', 'targeted', 'full']);
const TEST_AUTHORING_BOOLEAN_FIELDS = ['prefer_existing_tests', 'require_new_test_rationale'] as const;
const ALLOWED_TEST_AUTHORING_POLICIES = new Set(TEST_AUTHORING_POLICIES);
const ALLOWED_TESTING_POLICIES = new Set(['behavior_contract']);
const ALLOWED_TEST_DELETION_REASONS = new Set([
	'behavior_removed',
	'public_contract_changed',
	'duplicate_coverage',
	'implementation_detail_removed',
	'obsolete_snapshot',
]);
const FORBIDDEN_TEST_DELETION_REASONS = new Set([
	'only_to_make_tests_pass',
	'without_behavior_rationale',
	'without_reporting',
	'without_running_relevant_validation',
]);
const ALLOWED_STALE_TEST_ACTIONS = new Set(['update_remove_or_report']);
const ALLOWED_HARNESS_MODES = new Set(['single_session', 'long_running_optional']);
const ALLOWED_HARNESS_FRESH_CONTEXT_MODES = new Set(['hash_check_before_reread', 'reread']);
const ALLOWED_HARNESS_PHASES = new Set(['plan', 'work', 'verify', 'judge', 'handoff']);
const ALLOWED_PROMPT_CACHE_STRATEGIES = new Set(['stable_prefix']);
const ALLOWED_PROMPT_CACHE_STABLE_PREFIX_POLICIES = new Set(['hash_verified']);
const ALLOWED_PROMPT_CACHE_TASK_READ_POLICIES = new Set(['task_relevant_only']);
const ALLOWED_BUDGET_LIMIT_ACTIONS = new Set(['stop_and_handoff', 'stop_and_report']);
const ALLOWED_APPROVAL_GATES = new Set([
	'git_commit',
	'git_push',
	'dependency_install',
	'dependency_upgrade',
	'network_access',
	'database_migration',
	'destructive_command',
	'secret_access',
	'release',
	'cross_repository_change',
]);
const ALLOWED_APPROVAL_ACTIONS = new Set(['stop_and_request_approval']);
const ALLOWED_ISOLATION_PREFERENCES = new Set(['none', 'git_worktree', 'sandbox']);
const ALLOWED_REFRESH_MODES = new Set(['checkpoint']);
const ALLOWED_REFRESH_METHODS = new Set(['hash_check', 'reread_if_changed']);
const ALLOWED_REFRESH_STATE_STORES = new Set(['none', 'cache']);
const ALLOWED_COMPACTION_STRATEGIES = new Set(['tiered']);
const ALLOWED_COMPACTION_STATE_STORES = new Set(['none', 'cache']);
const ALLOWED_COMPACTION_CATEGORIES = new Set([
	'decisions',
	'constraints',
	'open_questions',
	'files_discussed',
	'commands_discussed',
	'risks',
	'next_steps',
	'rejected_options',
]);
const ALLOWED_COMPACTION_LONG_LIMIT_ACTIONS = new Set(['recompact_oldest', 'delete_oldest', 'archive_oldest']);
const ALLOWED_COMPACTION_RAW_LIMIT_ACTIONS = new Set(['prune_after_compaction', 'report']);
const ALLOWED_REFRESH_CHECKPOINTS = new Set([
	'session_start',
	'task_start',
	'before_first_edit',
	'before_command_run',
	'after_instruction_file_change',
	'root_change',
	'after_compaction',
	'before_final_report',
]);
const ALLOWED_TRANSLATION_POLICIES = new Set([
	'source_only',
	'update_source_mark_targets_stale',
	'machine_translate_requires_review',
]);
const RAW_COMMAND_FENCE_PATTERN = /```(?:sh|bash|shell|zsh|powershell|ps1|cmd)\s+[\s\S]*?```/giu;
const SKILL_COMMAND_PERMISSION_CLAIM_PATTERNS = [
	/\b(?:this\s+skill|skill\s+documents?|skills?)\s+(?:authorizes?|grants?|allows?|permits?)\s+(?:agents?\s+)?(?:to\s+)?(?:run|execute)\b/iu,
	/\b(?:agents?\s+)?(?:may|can|are\s+allowed\s+to|is\s+allowed\s+to|is\s+permitted\s+to|have\s+permission\s+to)\s+(?:run|execute)\s+(?:raw\s+)?(?:shell\s+)?commands?\b/iu,
	/\bcommand\s+execution\s+(?:is\s+)?(?:authorized|allowed|permitted)\s+by\s+(?:this\s+)?skill\b/iu,
];
const ROUTER_INDEX_PROCEDURE_SECTION_PATTERN =
	/^##\s+(?:Use When|Do Not Use When|Required Inputs|Preconditions|Allowed Edits|Procedure|Postconditions|Verification|Failure Handling|Output Format|사용 조건|사용하지 않는 경우|필요한 입력|사전 조건|허용 수정 범위|절차|사후 조건|검증|실패 대응|출력 형식)\s*$/imu;
const ROUTER_INDEX_FILES = ['.mustflow/skills/INDEX.md', '.mustflow/context/INDEX.md'] as const;
const SKILL_INDEX_PATH = '.mustflow/skills/INDEX.md';
const SUPPORTED_SKILL_SCHEMA_VERSION = '1';
const SKILL_PACK_ID_PATTERN = /^[a-z][a-z0-9-]*(?:\.[a-z][a-z0-9-]*)+$/u;
const CONTEXT_AUTHORITY_DRIFT_PATTERNS = [
	/^##\s+(?:Command Policy|Command Permissions|Allowed Commands|Denied Commands|File Edit Policy|Protected Paths|Forbidden Files|Execution Rules|Mandatory Rules|Binding Rules|명령 정책|명령 권한|허용 명령|금지 명령|파일 편집 정책|보호 경로|금지 파일|실행 규칙|필수 규칙)\s*$/imu,
	/\b(?:must not|do not|never)\s+(?:edit|modify|write|delete)\s+(?:files?\s+)?(?:outside|under|inside|in)\b/iu,
] as const;
const REPO_MAP_DOC_ID = 'repo-map';
const REPO_MAP_LIFECYCLE = 'generated';
const REPO_MAP_GENERATOR = 'mustflow';
const REPO_MAP_RELATIVE_ROOT = '.';
const REPO_MAP_SOURCE_POLICY = 'anchors_only';
const REPO_MAP_PRIVACY_MODE = 'minimal';
const REPO_MAP_SOURCE_FINGERPRINT_PATTERN = /^sha256:[a-f0-9]{64}$/u;
const SKILL_RESOURCE_MANIFEST = 'resources.toml';
const SKILL_RESOURCE_ROOTS = new Set(['references', 'assets', 'scripts']);
const ALLOWED_SKILL_RESOURCE_TYPES = new Set(['reference', 'asset', 'script']);
const SKILL_RESOURCE_TYPE_BY_ROOT: Record<string, string> = {
	references: 'reference',
	assets: 'asset',
	scripts: 'script',
};
const REQUIRED_SKILL_SCRIPT_RUN_POLICY = 'requires_command_contract';
const VOLATILE_REPO_MAP_PATTERNS = [
	/\bGenerated\s+(?:at|on):/iu,
	/\bLast\s+updated:/iu,
	/\bUpdated\s+at:/iu,
	/\bgenerated_at\b/iu,
	/\btimestamp\b/iu,
	/\bfile\s+count\b/iu,
	/\bchanged\s+files\b/iu,
];
const REPO_MAP_REMOTE_OR_BRANCH_PATTERNS = [
	/https?:\/\//iu,
	/\bgit@/iu,
	/^\s*(?:Remote|Branch):/imu,
];
const LOCAL_ABSOLUTE_PATH_PATTERNS = [
	/\b[A-Za-z]:\\(?:Users|Documents and Settings)\\/iu,
	/(?:^|[\s"'(])\/(?:Users|home)\/[A-Za-z0-9._-]+\/[^\s)"']*/imu,
];
const SECRET_LIKE_CONTEXT_PATTERNS = [
	/\b(?:api[_-]?key|api[_-]?token|access[_-]?token|auth[_-]?token|secret|password|passwd|private[_-]?key)\b\s*[:=]\s*["']?[A-Za-z0-9_./+=:-]{8,}/iu,
	/\b(?:sk-[A-Za-z0-9]{16,}|ghp_[A-Za-z0-9]{20,}|xox[baprs]-[A-Za-z0-9-]{20,}|AKIA[0-9A-Z]{16})\b/u,
];
const DESIGN_TOKEN_DEFINITION_PATTERNS = [
	/^\s*(?:colors?|palette|spacing|radius|radii|typography|fonts?|shadows?|breakpoints?)\s*[:=]\s*(?:\{|\[|["']?#|\d)/imu,
	/^\s*(?:primary|secondary|accent|background|foreground|surface|brand|text|muted)\s*[:=]\s*["']?#(?:[0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})\b/imu,
	/^\s*--[a-z0-9-]+:\s*[^;]+;/imu,
	/^\s*(?:border[_-]?radius|font[_-]?(?:family|size)|line[_-]?height|space[-_]\d+)\s*[:=]\s*/imu,
];
const LOCAL_TASK_STATE_ROOTS = new Set(['worklogs', 'plans', 'tasks', 'work-items']);

interface CheckIssue {
	readonly message: string;
	readonly severity?: 'error' | 'warning';
}

export interface CheckOptions {
	readonly strict?: boolean;
}

interface ParsedConfigFiles {
	readonly mustflowToml?: TomlTable;
	readonly commandsToml?: TomlTable;
	readonly preferencesToml?: TomlTable;
	readonly versioningToml?: TomlTable;
}

function hasOwn(table: TomlTable, key: string): boolean {
	return Object.prototype.hasOwnProperty.call(table, key);
}

function isPositiveInteger(value: unknown): boolean {
	return Number.isInteger(value) && Number(value) > 0;
}

function isSafeRelativePath(value: unknown): value is string {
	if (typeof value !== 'string' || value.trim().length === 0) {
		return false;
	}

	const normalized = value.replace(/\\/g, '/');
	const segments = normalized.split('/').filter(Boolean);

	if (path.posix.isAbsolute(normalized) || path.win32.isAbsolute(value)) {
		return false;
	}

	return segments.length > 0 && segments.every((segment) => segment !== '.' && segment !== '..');
}

function validateRequiredFiles(projectRoot: string, issues: CheckIssue[]): void {
	for (const relativePath of REQUIRED_FILES) {
		if (!existsSync(path.join(projectRoot, relativePath))) {
			issues.push({ message: `Missing ${relativePath}` });
		}
	}
}

function validateToml(projectRoot: string, issues: CheckIssue[]): ParsedConfigFiles {
	const parsedFiles: {
		mustflowToml?: TomlTable;
		commandsToml?: TomlTable;
		preferencesToml?: TomlTable;
		versioningToml?: TomlTable;
	} = {};

	for (const relativePath of [
		'.mustflow/config/mustflow.toml',
		'.mustflow/config/commands.toml',
		'.mustflow/config/preferences.toml',
		VERSIONING_CONFIG_PATH,
	]) {
		const filePath = path.join(projectRoot, relativePath);

		if (!existsSync(filePath)) {
			continue;
		}

		try {
			const parsed = readTomlFile(filePath);

			if (!isRecord(parsed)) {
				issues.push({ message: `${relativePath} must contain a TOML table` });
				continue;
			}

			if (relativePath.endsWith('mustflow.toml')) {
				parsedFiles.mustflowToml = parsed;
			}

			if (relativePath.endsWith('commands.toml')) {
				parsedFiles.commandsToml = parsed;
			}

			if (relativePath.endsWith('preferences.toml')) {
				parsedFiles.preferencesToml = parsed;
			}

			if (relativePath.endsWith('versioning.toml')) {
				parsedFiles.versioningToml = parsed;
			}
		} catch (error) {
			const message = error instanceof Error ? error.message : String(error);
			issues.push({ message: `Invalid TOML in ${relativePath}: ${message}` });
		}
	}

	return parsedFiles;
}

function validateTable(config: TomlTable, tableName: string, issues: CheckIssue[]): TomlTable | undefined {
	if (!hasOwn(config, tableName)) {
		return undefined;
	}

	const table = config[tableName];

	if (!isRecord(table)) {
		issues.push({ message: `[${tableName}] must be a TOML table` });
		return undefined;
	}

	return table;
}

function validateBooleanField(table: TomlTable, key: string, label: string, issues: CheckIssue[]): void {
	if (hasOwn(table, key) && typeof table[key] !== 'boolean') {
		issues.push({ message: `${label} must be a boolean` });
	}
}

function validateStringField(table: TomlTable, key: string, label: string, issues: CheckIssue[]): void {
	if (hasOwn(table, key) && (typeof table[key] !== 'string' || table[key].trim().length === 0)) {
		issues.push({ message: `${label} must be a string` });
	}
}

function validateRequiredStringField(table: TomlTable, key: string, label: string, issues: CheckIssue[]): void {
	if (!hasOwn(table, key)) {
		issues.push({ message: `${label} must be a string` });
		return;
	}

	validateStringField(table, key, label, issues);
}

function validateStringArrayField(table: TomlTable, key: string, label: string, issues: CheckIssue[]): void {
	if (!hasOwn(table, key)) {
		return;
	}

	const value = table[key];

	if (!Array.isArray(value) || value.some((entry) => typeof entry !== 'string' || entry.trim().length === 0)) {
		issues.push({ message: `${label} must be a string array` });
	}
}

function validateStringArrayMembers(
	table: TomlTable,
	key: string,
	label: string,
	allowedValues: ReadonlySet<string>,
	unsupportedLabel: string,
	issues: CheckIssue[],
): void {
	if (!hasOwn(table, key)) {
		return;
	}

	const value = table[key];

	if (!Array.isArray(value) || value.some((entry) => typeof entry !== 'string' || entry.trim().length === 0)) {
		issues.push({ message: `${label} must be a string array` });
		return;
	}

	for (const entry of value) {
		if (!allowedValues.has(entry)) {
			issues.push({ message: `${label} contains unsupported ${unsupportedLabel} "${entry}"` });
		}
	}
}

function validateExactStringArrayField(
	table: TomlTable,
	key: string,
	label: string,
	expectedValues: readonly string[],
	issues: CheckIssue[],
): void {
	if (!hasOwn(table, key)) {
		return;
	}

	const value = table[key];

	if (!Array.isArray(value) || value.length !== expectedValues.length) {
		issues.push({ message: `${label} must be ${expectedValues.map((entry) => `"${entry}"`).join(', ')}` });
		return;
	}

	const hasExpectedValues = expectedValues.every((entry, index) => value[index] === entry);

	if (!hasExpectedValues) {
		issues.push({ message: `${label} must be ${expectedValues.map((entry) => `"${entry}"`).join(', ')}` });
	}
}

function validatePositiveIntegerField(table: TomlTable, key: string, label: string, issues: CheckIssue[]): void {
	if (hasOwn(table, key) && !isPositiveInteger(table[key])) {
		issues.push({ message: `${label} must be a positive integer` });
	}
}

function validateNestedTable(table: TomlTable, key: string, label: string, issues: CheckIssue[]): TomlTable | undefined {
	if (!hasOwn(table, key)) {
		return undefined;
	}

	const value = table[key];

	if (!isRecord(value)) {
		issues.push({ message: `${label} must be a TOML table` });
		return undefined;
	}

	return value;
}

function validateAllowedStringField(
	table: TomlTable,
	key: string,
	label: string,
	allowedValues: ReadonlySet<string>,
	issues: CheckIssue[],
): void {
	if (!hasOwn(table, key)) {
		return;
	}

	if (typeof table[key] !== 'string' || !allowedValues.has(table[key])) {
		issues.push({ message: `${label} must be ${Array.from(allowedValues).map((value) => `"${value}"`).join(' or ')}` });
	}
}

function validatePathField(table: TomlTable, key: string, label: string, issues: CheckIssue[]): void {
	if (hasOwn(table, key) && !isSafeRelativePath(table[key])) {
		issues.push({ message: `${label} must be a non-empty relative path` });
	}
}

function validateRequiredPathField(table: TomlTable, key: string, label: string, issues: CheckIssue[]): void {
	if (!hasOwn(table, key)) {
		issues.push({ message: `${label} must be a non-empty relative path` });
		return;
	}

	validatePathField(table, key, label, issues);
}

function validatePathArrayField(table: TomlTable, key: string, label: string, issues: CheckIssue[]): string[] | undefined {
	if (!hasOwn(table, key)) {
		return undefined;
	}

	const value = table[key];

	if (!Array.isArray(value) || value.length === 0 || !value.every(isSafeRelativePath)) {
		issues.push({ message: `${label} entries must be non-empty relative paths` });
		return undefined;
	}

	return value;
}

function validateWorkspaceRoots(table: TomlTable, issues: CheckIssue[]): string[] | undefined {
	if (!hasOwn(table, 'roots')) {
		return undefined;
	}

	const value = table.roots;

	if (!Array.isArray(value) || !value.every(isSafeRelativePath)) {
		issues.push({ message: '[workspace].roots entries must be relative paths inside the current root' });
		return undefined;
	}

	return value;
}

function validateMustflowConfig(mustflowToml: TomlTable | undefined, issues: CheckIssue[]): void {
	if (!mustflowToml) {
		return;
	}

	const map = validateTable(mustflowToml, 'map', issues);

	if (map) {
		validatePathField(map, 'output', '[map].output', issues);
		validateAllowedStringField(map, 'mode', '[map].mode', ALLOWED_MAP_MODES, issues);
		validateAllowedStringField(map, 'privacy', '[map].privacy', ALLOWED_MAP_PRIVACY_LEVELS, issues);
		validateBooleanField(map, 'include_nested', '[map].include_nested', issues);
		validatePathArrayField(map, 'anchor_files', '[map].anchor_files', issues);
	}

	const context = validateTable(mustflowToml, 'context', issues);

	if (context) {
		validateBooleanField(context, 'enabled', '[context].enabled', issues);
		validatePathField(context, 'root', '[context].root', issues);
		validatePathField(context, 'index', '[context].index', issues);
		validatePathArrayField(context, 'default_files', '[context].default_files', issues);
		validateAllowedStringField(context, 'read_policy', '[context].read_policy', ALLOWED_CONTEXT_READ_POLICIES, issues);
		validateAllowedStringField(context, 'authority', '[context].authority', ALLOWED_CONTEXT_AUTHORITIES, issues);
		validatePathArrayField(context, 'external_anchors', '[context].external_anchors', issues);
	}

	const promptCache = validateTable(mustflowToml, 'prompt_cache', issues);

	if (promptCache) {
		validateBooleanField(promptCache, 'enabled', '[prompt_cache].enabled', issues);
		validateAllowedStringField(promptCache, 'strategy', '[prompt_cache].strategy', ALLOWED_PROMPT_CACHE_STRATEGIES, issues);
		validateAllowedStringField(
			promptCache,
			'stable_prefix_policy',
			'[prompt_cache].stable_prefix_policy',
			ALLOWED_PROMPT_CACHE_STABLE_PREFIX_POLICIES,
			issues,
		);
		validateBooleanField(
			promptCache,
			'prefer_references_when_unchanged',
			'[prompt_cache].prefer_references_when_unchanged',
			issues,
		);
		validateBooleanField(
			promptCache,
			'exclude_volatile_state_from_prefix',
			'[prompt_cache].exclude_volatile_state_from_prefix',
			issues,
		);
		validateBooleanField(promptCache, 'include_content_hashes', '[prompt_cache].include_content_hashes', issues);
		validatePositiveIntegerField(promptCache, 'max_stable_prefix_kb', '[prompt_cache].max_stable_prefix_kb', issues);
		validatePositiveIntegerField(promptCache, 'max_task_context_kb', '[prompt_cache].max_task_context_kb', issues);
		validatePositiveIntegerField(promptCache, 'max_volatile_suffix_kb', '[prompt_cache].max_volatile_suffix_kb', issues);

		const layers = validateNestedTable(promptCache, 'layers', '[prompt_cache.layers]', issues);
		if (layers) {
			const stable = validateNestedTable(layers, 'stable', '[prompt_cache.layers.stable]', issues);
			if (stable) {
				validatePathArrayField(stable, 'read', '[prompt_cache.layers.stable].read', issues);
			}

			const task = validateNestedTable(layers, 'task', '[prompt_cache.layers.task]', issues);
			if (task) {
				validateAllowedStringField(
					task,
					'read_policy',
					'[prompt_cache.layers.task].read_policy',
					ALLOWED_PROMPT_CACHE_TASK_READ_POLICIES,
					issues,
				);
				validateStringArrayField(task, 'sources', '[prompt_cache.layers.task].sources', issues);
			}

			const volatile = validateNestedTable(layers, 'volatile', '[prompt_cache.layers.volatile]', issues);
			if (volatile) {
				validateStringArrayField(volatile, 'sources', '[prompt_cache.layers.volatile].sources', issues);
				validateBooleanField(
					volatile,
					'never_place_before_stable_prefix',
					'[prompt_cache.layers.volatile].never_place_before_stable_prefix',
					issues,
				);
			}
		}
	}

	const workspace = validateTable(mustflowToml, 'workspace', issues);

	if (workspace) {
		validateBooleanField(workspace, 'enabled', '[workspace].enabled', issues);
		const roots = validateWorkspaceRoots(workspace, issues);
		validatePositiveIntegerField(workspace, 'max_depth', '[workspace].max_depth', issues);
		validatePositiveIntegerField(workspace, 'max_repositories', '[workspace].max_repositories', issues);
		validateBooleanField(workspace, 'follow_symlinks', '[workspace].follow_symlinks', issues);
		validateBooleanField(workspace, 'stop_at_repository_root', '[workspace].stop_at_repository_root', issues);

		if (workspace.enabled === true && roots?.length === 0) {
			issues.push({ message: '[workspace].enabled requires at least one [workspace].roots entry' });
		}
	}

	const capabilities = validateTable(mustflowToml, 'capabilities', issues);

	if (capabilities) {
		for (const field of CAPABILITY_BOOLEAN_FIELDS) {
			validateBooleanField(capabilities, field, `[capabilities].${field}`, issues);
		}

		for (const field of CAPABILITY_STATE_FIELDS) {
			validateAllowedStringField(capabilities, field, `[capabilities].${field}`, ALLOWED_CAPABILITY_STATES, issues);
		}

		validateStringArrayField(capabilities, 'adapters', '[capabilities].adapters', issues);
	}

	const agentLoop = validateTable(mustflowToml, 'agent_loop', issues);

	if (agentLoop) {
		validateExactStringArrayField(agentLoop, 'phases', '[agent_loop].phases', REQUIRED_AGENT_LOOP_PHASES, issues);
	}

	const harness = validateTable(mustflowToml, 'harness', issues);

	if (harness) {
		validateAllowedStringField(harness, 'mode', '[harness].mode', ALLOWED_HARNESS_MODES, issues);
		validateBooleanField(harness, 'fresh_context_preferred', '[harness].fresh_context_preferred', issues);
		validateAllowedStringField(
			harness,
			'fresh_context_mode',
			'[harness].fresh_context_mode',
			ALLOWED_HARNESS_FRESH_CONTEXT_MODES,
			issues,
		);

		const phases = validateNestedTable(harness, 'phases', '[harness.phases]', issues);
		if (phases) {
			validateStringArrayMembers(
				phases,
				'enabled',
				'[harness.phases].enabled',
				ALLOWED_HARNESS_PHASES,
				'phase',
				issues,
			);
		}
	}

	const refresh = validateTable(mustflowToml, 'refresh', issues);

	if (refresh) {
		validateBooleanField(refresh, 'enabled', '[refresh].enabled', issues);
		validateAllowedStringField(refresh, 'mode', '[refresh].mode', ALLOWED_REFRESH_MODES, issues);
		validateAllowedStringField(refresh, 'default_method', '[refresh].default_method', ALLOWED_REFRESH_METHODS, issues);
		validateBooleanField(refresh, 'reread_when_hash_changed', '[refresh].reread_when_hash_changed', issues);
		validateBooleanField(
			refresh,
			'reuse_cached_prefix_when_unchanged',
			'[refresh].reuse_cached_prefix_when_unchanged',
			issues,
		);
		validateStringArrayMembers(
			refresh,
			'required_at',
			'[refresh].required_at',
			ALLOWED_REFRESH_CHECKPOINTS,
			'checkpoint',
			issues,
		);
		validatePositiveIntegerField(refresh, 'turn_threshold', '[refresh].turn_threshold', issues);
		validatePositiveIntegerField(refresh, 'tool_call_threshold', '[refresh].tool_call_threshold', issues);
		validatePositiveIntegerField(refresh, 'output_bytes_threshold', '[refresh].output_bytes_threshold', issues);
		validateAllowedStringField(refresh, 'state_store', '[refresh].state_store', ALLOWED_REFRESH_STATE_STORES, issues);

		const levels = validateNestedTable(refresh, 'levels', '[refresh.levels]', issues);
		if (levels) {
			for (const [levelName, level] of Object.entries(levels)) {
				if (!isRecord(level)) {
					issues.push({ message: `[refresh.levels.${levelName}] must be a TOML table` });
					continue;
				}

				validateAllowedStringField(
					level,
					'method',
					`[refresh.levels.${levelName}].method`,
					ALLOWED_REFRESH_METHODS,
					issues,
				);
				validatePathArrayField(level, 'read', `[refresh.levels.${levelName}].read`, issues);
			}
		}
	}

	const compaction = validateTable(mustflowToml, 'compaction', issues);

	if (compaction) {
		validateBooleanField(compaction, 'enabled', '[compaction].enabled', issues);
		validateAllowedStringField(compaction, 'strategy', '[compaction].strategy', ALLOWED_COMPACTION_STRATEGIES, issues);
		validateAllowedStringField(compaction, 'state_store', '[compaction].state_store', ALLOWED_COMPACTION_STATE_STORES, issues);

		const recent = validateNestedTable(compaction, 'recent', '[compaction.recent]', issues);
		if (recent) {
			validatePositiveIntegerField(recent, 'keep_turns', '[compaction.recent].keep_turns', issues);
			validatePositiveIntegerField(recent, 'max_total_bytes', '[compaction.recent].max_total_bytes', issues);
			validateBooleanField(recent, 'store_raw', '[compaction.recent].store_raw', issues);
		}

		const mid = validateNestedTable(compaction, 'mid', '[compaction.mid]', issues);
		if (mid) {
			validatePositiveIntegerField(mid, 'trigger_turns', '[compaction.mid].trigger_turns', issues);
			validatePositiveIntegerField(mid, 'target_items', '[compaction.mid].target_items', issues);
			validatePositiveIntegerField(
				mid,
				'target_max_words_per_item',
				'[compaction.mid].target_max_words_per_item',
				issues,
			);
			validateStringArrayMembers(
				mid,
				'include_categories',
				'[compaction.mid].include_categories',
				ALLOWED_COMPACTION_CATEGORIES,
				'category',
				issues,
			);
		}

		const long = validateNestedTable(compaction, 'long', '[compaction.long]', issues);
		if (long) {
			validatePositiveIntegerField(long, 'promote_after_mid_items', '[compaction.long].promote_after_mid_items', issues);
			validatePositiveIntegerField(long, 'target_items', '[compaction.long].target_items', issues);
			validatePositiveIntegerField(long, 'max_items', '[compaction.long].max_items', issues);
			validateAllowedStringField(long, 'on_limit', '[compaction.long].on_limit', ALLOWED_COMPACTION_LONG_LIMIT_ACTIONS, issues);
		}

		const rawRetention = validateNestedTable(compaction, 'raw_retention', '[compaction.raw_retention]', issues);
		if (rawRetention) {
			validatePositiveIntegerField(rawRetention, 'max_age_days', '[compaction.raw_retention].max_age_days', issues);
			validatePositiveIntegerField(rawRetention, 'max_total_mb', '[compaction.raw_retention].max_total_mb', issues);
			validateAllowedStringField(
				rawRetention,
				'on_limit',
				'[compaction.raw_retention].on_limit',
				ALLOWED_COMPACTION_RAW_LIMIT_ACTIONS,
				issues,
			);
		}

		const rules = validateNestedTable(compaction, 'rules', '[compaction.rules]', issues);
		if (rules) {
			validateBooleanField(rules, 'require_source_refs', '[compaction.rules].require_source_refs', issues);
			validateBooleanField(rules, 'summaries_are_derived', '[compaction.rules].summaries_are_derived', issues);
			validateBooleanField(
				rules,
				'current_files_override_summaries',
				'[compaction.rules].current_files_override_summaries',
				issues,
			);
			validateBooleanField(rules, 'never_store_secrets', '[compaction.rules].never_store_secrets', issues);
			validateBooleanField(rules, 'scrub_absolute_user_paths', '[compaction.rules].scrub_absolute_user_paths', issues);
			validateBooleanField(
				rules,
				'do_not_store_hidden_chain_of_thought',
				'[compaction.rules].do_not_store_hidden_chain_of_thought',
				issues,
			);
		}
	}

	const verification = validateTable(mustflowToml, 'verification', issues);

	if (verification) {
		validatePathField(verification, 'command_source', '[verification].command_source', issues);
		validateBooleanField(verification, 'require_configured_intents', '[verification].require_configured_intents', issues);
		validateBooleanField(verification, 'allow_inferred_commands', '[verification].allow_inferred_commands', issues);
		validateBooleanField(verification, 'require_command_lifecycle', '[verification].require_command_lifecycle', issues);
		validateBooleanField(verification, 'require_timeout_for_oneshot', '[verification].require_timeout_for_oneshot', issues);
	}

	const testing = validateTable(mustflowToml, 'testing', issues);

	if (testing) {
		validateAllowedStringField(testing, 'policy', '[testing].policy', ALLOWED_TESTING_POLICIES, issues);
		validateBooleanField(
			testing,
			'prefer_update_existing_tests',
			'[testing].prefer_update_existing_tests',
			issues,
		);
		validateBooleanField(
			testing,
			'require_existing_test_search',
			'[testing].require_existing_test_search',
			issues,
		);
		validateBooleanField(
			testing,
			'require_test_change_report',
			'[testing].require_test_change_report',
			issues,
		);
		validateBooleanField(testing, 'forbid_validation_weakening', '[testing].forbid_validation_weakening', issues);
		validateStringArrayMembers(
			testing,
			'allow_test_deletion_when',
			'[testing].allow_test_deletion_when',
			ALLOWED_TEST_DELETION_REASONS,
			'reason',
			issues,
		);
		validateStringArrayMembers(
			testing,
			'forbid_test_deletion_when',
			'[testing].forbid_test_deletion_when',
			FORBIDDEN_TEST_DELETION_REASONS,
			'reason',
			issues,
		);
		validateAllowedStringField(testing, 'stale_test_action', '[testing].stale_test_action', ALLOWED_STALE_TEST_ACTIONS, issues);
	}

	const handoff = validateTable(mustflowToml, 'handoff', issues);

	if (handoff) {
		validateBooleanField(handoff, 'enabled', '[handoff].enabled', issues);
		validateAllowedStringField(handoff, 'mode', '[handoff].mode', ALLOWED_HANDOFF_MODES, issues);
	}

	const budget = validateTable(mustflowToml, 'budget', issues);

	if (budget) {
		validateBooleanField(budget, 'enabled', '[budget].enabled', issues);
		validatePositiveIntegerField(budget, 'max_iterations', '[budget].max_iterations', issues);
		validatePositiveIntegerField(budget, 'max_wall_clock_minutes', '[budget].max_wall_clock_minutes', issues);
		validatePositiveIntegerField(budget, 'max_command_runs', '[budget].max_command_runs', issues);
		validatePositiveIntegerField(budget, 'max_total_output_mb', '[budget].max_total_output_mb', issues);
		validatePositiveIntegerField(budget, 'max_failures_per_intent', '[budget].max_failures_per_intent', issues);
		validateAllowedStringField(budget, 'on_limit', '[budget].on_limit', ALLOWED_BUDGET_LIMIT_ACTIONS, issues);
	}

	const approval = validateTable(mustflowToml, 'approval', issues);

	if (approval) {
		validateStringArrayMembers(
			approval,
			'required_for',
			'[approval].required_for',
			ALLOWED_APPROVAL_GATES,
			'approval gate',
			issues,
		);
		validateAllowedStringField(approval, 'on_required', '[approval].on_required', ALLOWED_APPROVAL_ACTIONS, issues);
	}

	const isolation = validateTable(mustflowToml, 'isolation', issues);

	if (isolation) {
		validateAllowedStringField(isolation, 'preferred', '[isolation].preferred', ALLOWED_ISOLATION_PREFERENCES, issues);
		validateBooleanField(isolation, 'required_for_long_running', '[isolation].required_for_long_running', issues);
		validateBooleanField(isolation, 'allow_dirty_main_worktree', '[isolation].allow_dirty_main_worktree', issues);
	}

	const retention = validateTable(mustflowToml, 'retention', issues);

	if (retention) {
		validateBooleanField(retention, 'enabled', '[retention].enabled', issues);

		const rawEvents = validateNestedTable(retention, 'raw_events', '[retention.raw_events]', issues);
		if (rawEvents) {
			validateAllowedStringField(rawEvents, 'store', '[retention.raw_events].store', ALLOWED_RETENTION_STORES, issues);
			validatePositiveIntegerField(rawEvents, 'max_file_mb', '[retention.raw_events].max_file_mb', issues);
			validatePositiveIntegerField(rawEvents, 'max_total_mb', '[retention.raw_events].max_total_mb', issues);
			validatePositiveIntegerField(rawEvents, 'max_age_days', '[retention.raw_events].max_age_days', issues);
			validateAllowedStringField(
				rawEvents,
				'on_limit',
				'[retention.raw_events].on_limit',
				ALLOWED_RETENTION_ON_LIMIT,
				issues,
			);
		}

		const runReceipts = validateNestedTable(retention, 'run_receipts', '[retention.run_receipts]', issues);
		if (runReceipts) {
			validateAllowedStringField(runReceipts, 'store', '[retention.run_receipts].store', ALLOWED_RETENTION_STORES, issues);
			validatePositiveIntegerField(runReceipts, 'max_file_kb', '[retention.run_receipts].max_file_kb', issues);
			validatePositiveIntegerField(runReceipts, 'max_items', '[retention.run_receipts].max_items', issues);
			validatePositiveIntegerField(runReceipts, 'max_total_mb', '[retention.run_receipts].max_total_mb', issues);
			validatePositiveIntegerField(
				runReceipts,
				'keep_stdout_tail_bytes',
				'[retention.run_receipts].keep_stdout_tail_bytes',
				issues,
			);
			validatePositiveIntegerField(
				runReceipts,
				'keep_stderr_tail_bytes',
				'[retention.run_receipts].keep_stderr_tail_bytes',
				issues,
			);
		}

		const knowledge = validateNestedTable(retention, 'knowledge', '[retention.knowledge]', issues);
		if (knowledge) {
			validateBooleanField(knowledge, 'enabled', '[retention.knowledge].enabled', issues);
			validateAllowedStringField(knowledge, 'store', '[retention.knowledge].store', ALLOWED_RETENTION_STORES, issues);
			validatePositiveIntegerField(knowledge, 'max_file_kb', '[retention.knowledge].max_file_kb', issues);
			validatePositiveIntegerField(knowledge, 'max_total_mb', '[retention.knowledge].max_total_mb', issues);
			validateBooleanField(knowledge, 'require_source_refs', '[retention.knowledge].require_source_refs', issues);
			validateBooleanField(knowledge, 'require_review_status', '[retention.knowledge].require_review_status', issues);
		}

		const context = validateNestedTable(retention, 'context', '[retention.context]', issues);
		if (context) {
			validatePositiveIntegerField(context, 'max_file_kb', '[retention.context].max_file_kb', issues);
		}

		const handoffs = validateNestedTable(retention, 'handoffs', '[retention.handoffs]', issues);
		if (handoffs) {
			validateAllowedStringField(handoffs, 'store', '[retention.handoffs].store', ALLOWED_RETENTION_STORES, issues);
			validatePositiveIntegerField(handoffs, 'max_file_kb', '[retention.handoffs].max_file_kb', issues);
			validatePositiveIntegerField(handoffs, 'max_total_mb', '[retention.handoffs].max_total_mb', issues);
			validateBooleanField(handoffs, 'require_source_refs', '[retention.handoffs].require_source_refs', issues);
		}

		const repoMap = validateNestedTable(retention, 'repo_map', '[retention.repo_map]', issues);
		if (repoMap) {
			validatePositiveIntegerField(repoMap, 'max_file_kb', '[retention.repo_map].max_file_kb', issues);
			validateBooleanField(repoMap, 'fail_if_larger', '[retention.repo_map].fail_if_larger', issues);
		}
	}
}

function validatePreferencesStringFields(
	table: TomlTable,
	tableName: string,
	keys: readonly string[],
	issues: CheckIssue[],
): void {
	for (const key of keys) {
		validateStringField(table, key, `[preferences.${tableName}].${key}`, issues);
	}
}

function validatePreferenceModeFallback(
	table: TomlTable,
	key: string,
	label: string,
	issues: CheckIssue[],
): void {
	if (!hasOwn(table, key)) {
		return;
	}

	const value = table[key];

	if (typeof value === 'string' && value.trim().length > 0) {
		return;
	}

	if (!isRecord(value)) {
		issues.push({ message: `${label} must be a string or TOML table` });
		return;
	}

	validateStringField(value, 'mode', `${label}.mode`, issues);
	validateStringField(value, 'fallback', `${label}.fallback`, issues);
	validateStringField(value, 'rule', `${label}.rule`, issues);
}

function validatePreferencesConfig(preferencesToml: TomlTable | undefined, issues: CheckIssue[]): void {
	if (!preferencesToml) {
		return;
	}

	validateStringField(preferencesToml, 'schema_version', '[preferences].schema_version', issues);

	const project = validateTable(preferencesToml, 'project', issues);
	if (project) {
		validatePreferencesStringFields(project, 'project', ['convention_mode'], issues);
		validateAllowedStringField(project, 'profile', '[preferences.project].profile', ALLOWED_PROJECT_PROFILES, issues);
	}

	const language = validateTable(preferencesToml, 'language', issues);
	if (language) {
		validatePreferencesStringFields(language, 'language', ['agent_response', 'docs'], issues);
		for (const key of ['code_comments', 'logs', 'user_facing_text', 'commit_messages']) {
			validatePreferenceModeFallback(language, key, `[preferences.language.${key}]`, issues);
		}

		const memory = validateNestedTable(language, 'memory', '[preferences.language.memory]', issues);
		if (memory) {
			validateStringField(memory, 'summary', '[preferences.language.memory].summary', issues);
			validateStringField(memory, 'fallback', '[preferences.language.memory].fallback', issues);
			validateBooleanField(memory, 'preserve_code', '[preferences.language.memory].preserve_code', issues);
			validateBooleanField(memory, 'preserve_paths', '[preferences.language.memory].preserve_paths', issues);
			validateBooleanField(
				memory,
				'preserve_error_output',
				'[preferences.language.memory].preserve_error_output',
				issues,
			);
		}
	}

	const formatting = validateTable(preferencesToml, 'formatting', issues);
	if (formatting) {
		validatePreferencesStringFields(
			formatting,
			'formatting',
			[
				'indentation',
				'indentation_when_missing',
				'line_endings',
				'line_endings_when_missing',
				'quote_style',
				'trailing_whitespace',
			],
			issues,
		);
	}

	const codeStyle = validateTable(preferencesToml, 'code_style', issues);
	if (codeStyle) {
		validatePreferencesStringFields(codeStyle, 'code_style', ['naming', 'comments', 'public_api_docs'], issues);
		validateBooleanField(
			codeStyle,
			'avoid_drive_by_refactors',
			'[preferences.code_style].avoid_drive_by_refactors',
			issues,
		);
	}

	const refactoring = validateTable(preferencesToml, 'refactoring', issues);
	if (refactoring) {
		const hotspots = validateNestedTable(refactoring, 'hotspots', '[preferences.refactoring.hotspots]', issues);
		if (hotspots) {
			for (const field of [
				'large_file_candidate_kb',
				'history_days',
				'primary_candidate_limit',
				'structure_candidate_limit',
				'full_file_candidate_limit',
			]) {
				validatePositiveIntegerField(hotspots, field, `[preferences.refactoring.hotspots].${field}`, issues);
			}
		}
	}

	const git = validateTable(preferencesToml, 'git', issues);
	if (git) {
		validatePreferencesStringFields(git, 'git', ['commit_message_style', 'commit_message_language'], issues);
		validateBooleanField(git, 'auto_stage', '[preferences.git].auto_stage', issues);
		validateBooleanField(git, 'auto_commit', '[preferences.git].auto_commit', issues);
		validateBooleanField(git, 'auto_push', '[preferences.git].auto_push', issues);

		const commitMessage = validateNestedTable(git, 'commit_message', '[preferences.git.commit_message]', issues);
		if (commitMessage) {
			validatePreferencesStringFields(
				commitMessage,
				'git.commit_message',
				['suggest', 'style', 'language', 'language_when_missing', 'scope', 'include_body'],
				issues,
			);
			validateAllowedStringField(
				commitMessage,
				'style',
				'[preferences.git.commit_message].style',
				ALLOWED_COMMIT_MESSAGE_STYLES,
				issues,
			);
			validatePositiveIntegerField(
				commitMessage,
				'max_suggestions',
				'[preferences.git.commit_message].max_suggestions',
				issues,
			);
			validateBooleanField(
				commitMessage,
				'split_when_multiple_concerns',
				'[preferences.git.commit_message].split_when_multiple_concerns',
				issues,
			);
			validateBooleanField(
				commitMessage,
				'avoid_sensitive_details',
				'[preferences.git.commit_message].avoid_sensitive_details',
				issues,
			);
		}
	}

	const reporting = validateTable(preferencesToml, 'reporting', issues);
	if (reporting) {
		const commitSuggestion = validateNestedTable(
			reporting,
			'commit_suggestion',
			'[preferences.reporting.commit_suggestion]',
			issues,
		);
		if (commitSuggestion) {
			validateBooleanField(
				commitSuggestion,
				'enabled',
				'[preferences.reporting.commit_suggestion].enabled',
				issues,
			);
			validatePreferencesStringFields(
				commitSuggestion,
				'reporting.commit_suggestion',
				['when', 'source'],
				issues,
			);
		}
	}

	const release = validateTable(preferencesToml, 'release', issues);
	if (release) {
		const versioning = validateNestedTable(release, 'versioning', '[preferences.release.versioning]', issues);
		if (versioning) {
			for (const field of RELEASE_VERSIONING_BOOLEAN_FIELDS) {
				validateBooleanField(versioning, field, `[preferences.release.versioning].${field}`, issues);
			}
		}
	}

	const verification = validateTable(preferencesToml, 'verification', issues);
	if (verification) {
		const selection = validateNestedTable(verification, 'selection', '[preferences.verification.selection]', issues);
		if (selection) {
			validateAllowedStringField(
				selection,
				'strategy',
				'[preferences.verification.selection].strategy',
				ALLOWED_VERIFICATION_SELECTION_STRATEGIES,
				issues,
			);

			for (const field of VERIFICATION_SELECTION_BOOLEAN_FIELDS) {
				validateBooleanField(selection, field, `[preferences.verification.selection].${field}`, issues);
			}
		}
	}

	const testing = validateTable(preferencesToml, 'testing', issues);
	if (testing) {
		const authoring = validateNestedTable(testing, 'authoring', '[preferences.testing.authoring]', issues);
		if (authoring) {
			validateAllowedStringField(
				authoring,
				'new_test_policy',
				'[preferences.testing.authoring].new_test_policy',
				ALLOWED_TEST_AUTHORING_POLICIES,
				issues,
			);

			for (const field of TEST_AUTHORING_BOOLEAN_FIELDS) {
				validateBooleanField(authoring, field, `[preferences.testing.authoring].${field}`, issues);
			}
		}
	}

	const docs = validateTable(preferencesToml, 'docs', issues);
	if (docs) {
		validateStringArrayField(docs, 'update_when', '[preferences.docs].update_when', issues);
		validateStringField(docs, 'tone', '[preferences.docs].tone', issues);
	}

	const logging = validateTable(preferencesToml, 'logging', issues);
	if (logging) {
		validateStringField(logging, 'style', '[preferences.logging].style', issues);
		validateBooleanField(logging, 'include_sensitive_data', '[preferences.logging].include_sensitive_data', issues);
		validateStringField(logging, 'language', '[preferences.logging].language', issues);
	}

	const productI18n = validateTable(preferencesToml, 'product_i18n', issues);
	if (productI18n) {
		validateBooleanField(productI18n, 'enabled', '[preferences.product_i18n].enabled', issues);
		validateStringField(productI18n, 'source_locale', '[preferences.product_i18n].source_locale', issues);
		validateStringField(productI18n, 'fallback_locale', '[preferences.product_i18n].fallback_locale', issues);
		validateStringField(productI18n, 'locale_tag_format', '[preferences.product_i18n].locale_tag_format', issues);
		validateStringField(
			productI18n,
			'user_facing_text_policy',
			'[preferences.product_i18n].user_facing_text_policy',
			issues,
		);
		validateStringField(
			productI18n,
			'hardcoded_user_facing_strings',
			'[preferences.product_i18n].hardcoded_user_facing_strings',
			issues,
		);
		validateAllowedStringField(
			productI18n,
			'translation_policy',
			'[preferences.product_i18n].translation_policy',
			ALLOWED_TRANSLATION_POLICIES,
			issues,
		);
		validateStringArrayField(productI18n, 'target_locales', '[preferences.product_i18n].target_locales', issues);
		validateStringArrayField(productI18n, 'do_not_translate', '[preferences.product_i18n].do_not_translate', issues);
	}
}

function validateVersioningConfig(versioningToml: TomlTable | undefined, issues: CheckIssue[]): void {
	if (!versioningToml) {
		return;
	}

	validateRequiredStringField(versioningToml, 'schema_version', `[${VERSIONING_CONFIG_PATH}].schema_version`, issues);

	if (!hasOwn(versioningToml, 'sources')) {
		issues.push({ message: `${VERSIONING_CONFIG_PATH} must define [[sources]]` });
		return;
	}

	const sources = versioningToml.sources;

	if (!Array.isArray(sources) || sources.length === 0 || !sources.every(isRecord)) {
		issues.push({ message: `${VERSIONING_CONFIG_PATH} sources must be a non-empty array of TOML tables` });
		return;
	}

	for (const [index, source] of sources.entries()) {
		const label = `${VERSIONING_CONFIG_PATH} sources[${index}]`;

		validateRequiredPathField(source, 'path', `${label}.path`, issues);
		validateRequiredStringField(source, 'kind', `${label}.kind`, issues);
		validateAllowedStringField(source, 'kind', `${label}.kind`, ALLOWED_VERSION_SOURCE_KINDS, issues);
		validateRequiredStringField(source, 'authority', `${label}.authority`, issues);
		validateAllowedStringField(source, 'authority', `${label}.authority`, ALLOWED_VERSION_SOURCE_AUTHORITIES, issues);
		validateStringField(source, 'description', `${label}.description`, issues);
	}
}

/**
 * mf:anchor cli.validation.command-intents.dispatch
 * purpose: Delegate command intent contract checks to the shared core validator.
 * search: commands.toml, command contract validation, check command
 * invariant: CLI check preserves command-contract messages while shared policy lives in core.
 * risk: config, security
 */
function validateCommandIntents(commandsToml: TomlTable | undefined, issues: CheckIssue[]): void {
	issues.push(...validateCommandContractConfig(commandsToml));
}

function validateSkills(projectRoot: string, issues: CheckIssue[]): void {
	const skillsRoot = path.join(projectRoot, '.mustflow', 'skills');
	const skillFiles = listFilesRecursive(skillsRoot).filter((relativePath) => relativePath.endsWith('/SKILL.md'));

	for (const relativePath of skillFiles) {
		const absolutePath = path.join(skillsRoot, relativePath);
		const content = readFileSync(absolutePath, 'utf8');
		const sectionIds = readSkillSectionIds(content);
		const missingSectionIds = REQUIRED_SKILL_SECTION_IDS.filter((sectionId) => !sectionIds.has(sectionId));

		if (missingSectionIds.length > 0) {
			issues.push({
				message: `Missing required skill section ids in .mustflow/skills/${toPosixPath(relativePath)}: ${missingSectionIds.join(', ')}`,
			});
		}
	}
}

function readSkillSectionIds(content: string): Set<string> {
	return new Set([...content.matchAll(SKILL_SECTION_MARKER_PATTERN)].map((match) => match[1]));
}

function parseSimpleFrontmatter(content: string): Record<string, string> {
	if (!content.startsWith('---')) {
		return {};
	}

	const end = content.indexOf('\n---', 3);
	if (end === -1) {
		return {};
	}

	const frontmatter: Record<string, string> = {};

	for (const line of content.slice(3, end).split(/\r?\n/)) {
		const separatorIndex = line.indexOf(':');
		if (separatorIndex === -1) {
			continue;
		}

		const key = line.slice(0, separatorIndex).trim();
		const value = line.slice(separatorIndex + 1).trim().replace(/^["']|["']$/g, '');

		if (key.length > 0 && value.length > 0) {
			frontmatter[key] = value;
		}
	}

	return frontmatter;
}

function readFrontmatterLines(content: string): string[] {
	if (!content.startsWith('---')) {
		return [];
	}

	const end = content.indexOf('\n---', 3);
	if (end === -1) {
		return [];
	}

	return content
		.slice(3, end)
		.split(/\n/u)
		.map((line) => line.replace(/\r$/u, ''));
}

function stripScalarMarkers(value: string): string {
	return value.trim().replace(/^["'`]|["'`]$/g, '').trim();
}

function readFrontmatterList(content: string, key: string): string[] {
	const lines = readFrontmatterLines(content);
	const values: string[] = [];
	let keyIndent: number | undefined;

	for (const line of lines) {
		const keyMatch = line.match(new RegExp(`^(\\s*)${key}:\\s*$`, 'u'));

		if (keyIndent === undefined) {
			if (keyMatch) {
				keyIndent = keyMatch[1].length;
			}

			continue;
		}

		if (line.trim().length === 0) {
			continue;
		}

		const lineIndent = line.match(/^\s*/u)?.[0].length ?? 0;
		const itemMatch = line.match(/^\s*-\s+(.+)$/u);

		if (lineIndent <= keyIndent && !itemMatch) {
			break;
		}

		if (itemMatch) {
			const value = stripScalarMarkers(itemMatch[1]);

			if (value.length > 0) {
				values.push(value);
			}
		}
	}

	return values;
}

function validateContextDocuments(projectRoot: string, issues: CheckIssue[]): void {
	const contextRoot = path.join(projectRoot, '.mustflow', 'context');
	const contextFiles = listFilesRecursive(contextRoot).filter((relativePath) => relativePath.endsWith('.md'));

	for (const relativePath of contextFiles) {
		const normalizedPath = `.mustflow/context/${toPosixPath(relativePath)}`;
		const content = readFileSync(path.join(contextRoot, relativePath), 'utf8');
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

function validateManifestLock(projectRoot: string, issues: CheckIssue[]): void {
	for (const issue of inspectManifestLock(projectRoot).issues) {
		issues.push({ message: issue });
	}
}

function pushStrictIssue(issues: CheckIssue[], message: string): void {
	issues.push({ message: `Strict: ${message}` });
}

function pushStrictWarning(issues: CheckIssue[], message: string): void {
	issues.push({ message: `Strict warning: ${message}`, severity: 'warning' });
}

function validateStrictPromptCachePolicy(mustflowToml: TomlTable | undefined, issues: CheckIssue[]): void {
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
	}

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
	for (const issue of validateTemplateVersionSync(projectRoot, preferencesToml)) {
		pushStrictIssue(issues, issue.message);
	}
}

function validateStrictCommandDefaults(commandsToml: TomlTable | undefined, issues: CheckIssue[]): void {
	for (const issue of validateCommandContractStrictDefaults(commandsToml)) {
		pushStrictIssue(issues, issue.message);
	}
}

function validateStrictRouterIndexes(projectRoot: string, issues: CheckIssue[]): void {
	for (const relativePath of ROUTER_INDEX_FILES) {
		const filePath = path.join(projectRoot, relativePath);

		if (!existsSync(filePath)) {
			continue;
		}

		const content = readFileSync(filePath, 'utf8');

		if (ROUTER_INDEX_PROCEDURE_SECTION_PATTERN.test(content)) {
			pushStrictIssue(issues, `${relativePath} must stay a routing index and must not embed skill procedure sections`);
		}
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

function validateSkillIndexRoutes(
	projectRoot: string,
	commandsToml: TomlTable | undefined,
	skillFiles: readonly string[],
	issues: CheckIssue[],
): void {
	const skillIndexPath = path.join(projectRoot, SKILL_INDEX_PATH);

	if (!existsSync(skillIndexPath)) {
		return;
	}

	const skillIndexContent = readFileSync(skillIndexPath, 'utf8');
	validateSkillIndexRouteShape(skillIndexContent, issues);

	const skillRoutes = parseSkillIndexRoutes(skillIndexContent);
	const routedSkillPaths = new Set<string>();
	const expectedSkillPaths = new Set(skillFiles.map((relativePath) => `.mustflow/skills/${relativePath}`));
	const seenSkillPaths = new Set<string>();

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

		const absoluteSkillPath = path.join(projectRoot, ...route.skillPath.split('/'));
		if (!existsSync(absoluteSkillPath)) {
			pushStrictIssue(issues, `${SKILL_INDEX_PATH} route ${route.skillPath} points to a missing skill document`);
			continue;
		}

		const skillCommandIntents = new Set(readFrontmatterList(readFileSync(absoluteSkillPath, 'utf8'), 'command_intents'));

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

		const content = readFileSync(path.join(projectRoot, relativePath), 'utf8');
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

function validateStrictRetentionPolicy(mustflowToml: TomlTable | undefined, issues: CheckIssue[]): RetentionLimits {
	const retention = readRetentionTable(mustflowToml);

	if (!retention) {
		pushStrictIssue(issues, '[retention] table is required');
		return DEFAULT_RETENTION_LIMITS;
	}

	for (const tableName of ['raw_events', 'run_receipts', 'knowledge', 'context', 'repo_map']) {
		if (!readNestedRetentionTable(retention, tableName)) {
			pushStrictIssue(issues, `[retention.${tableName}] table is required`);
		}
	}

	return resolveRetentionLimits(mustflowToml);
}

function validateStrictRefreshPolicy(mustflowToml: TomlTable | undefined, issues: CheckIssue[]): void {
	if (!mustflowToml || !isRecord(mustflowToml.refresh)) {
		pushStrictIssue(issues, '[refresh] table is required');
		return;
	}

	const refresh = mustflowToml.refresh;

	if (refresh.default_method !== 'hash_check') {
		pushStrictIssue(issues, '[refresh].default_method should be "hash_check" for cache-friendly refresh');
	}

	if (!Array.isArray(refresh.required_at) || !refresh.required_at.includes('before_command_run')) {
		pushStrictIssue(issues, '[refresh].required_at should include "before_command_run"');
	}

	if (!isRecord(refresh.levels)) {
		pushStrictIssue(issues, '[refresh.levels] table is required');
		return;
	}

	for (const levelName of ['light', 'command', 'skill', 'full']) {
		if (!isRecord(refresh.levels[levelName])) {
			pushStrictIssue(issues, `[refresh.levels.${levelName}] table is required`);
			continue;
		}

		const read = refresh.levels[levelName].read;
		if (!Array.isArray(read) || read.length === 0) {
			pushStrictIssue(issues, `[refresh.levels.${levelName}].read is required`);
		}
	}
}

function validateStrictHarnessPolicy(mustflowToml: TomlTable | undefined, issues: CheckIssue[]): void {
	for (const tableName of ['harness', 'budget', 'approval', 'isolation', 'compaction']) {
		if (!mustflowToml || !isRecord(mustflowToml[tableName])) {
			pushStrictIssue(issues, `[${tableName}] table is required`);
		}
	}
}

function validateStrictVerificationSelectionAuthority(preferencesToml: TomlTable | undefined, issues: CheckIssue[]): void {
	if (!preferencesToml || !isRecord(preferencesToml.verification)) {
		return;
	}

	const selection = preferencesToml.verification.selection;
	if (!isRecord(selection)) {
		return;
	}

	for (const field of FORBIDDEN_VERIFICATION_SELECTION_AUTHORITY_FIELDS) {
		if (hasOwn(selection, field)) {
			pushStrictIssue(
				issues,
				`[preferences.verification.selection].${field} cannot define command authority; use .mustflow/config/commands.toml`,
			);
		}
	}
}

function validateStrictReleaseVersioningAuthority(preferencesToml: TomlTable | undefined, issues: CheckIssue[]): void {
	if (!preferencesToml || !isRecord(preferencesToml.release)) {
		return;
	}

	const versioning = preferencesToml.release.versioning;
	if (!isRecord(versioning)) {
		return;
	}

	for (const field of FORBIDDEN_RELEASE_VERSIONING_CONTRACT_FIELDS) {
		if (hasOwn(versioning, field)) {
			pushStrictIssue(
				issues,
				`[preferences.release.versioning].${field} cannot define version sources or release authority; use .mustflow/config/versioning.toml or .mustflow/config/commands.toml`,
			);
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

function readSkillResourceManifest(manifestPath: string, manifestLabel: string, issues: CheckIssue[]): TomlTable | undefined {
	try {
		const parsed = readTomlFile(manifestPath);

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

function isDeclaredCommandIntent(commandsToml: TomlTable | undefined, intentName: string): boolean {
	return Boolean(commandsToml && isRecord(commandsToml.intents) && isRecord(commandsToml.intents[intentName]));
}

function isConfiguredCommandIntent(commandsToml: TomlTable | undefined, intentName: string): boolean {
	if (!commandsToml || !isRecord(commandsToml.intents)) {
		return false;
	}

	const intent = commandsToml.intents[intentName];
	return isRecord(intent) && intent.status === 'configured';
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

	const manifest = readSkillResourceManifest(manifestPath, manifestLabel, issues);
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
		const declaredResources = validateSkillResourceManifest(skillDir, manifestLabel, commandsToml, issues);
		validateDeclaredSkillScripts(skillDir, skillName, declaredResources, issues);
	}

	for (const relativePath of skillFiles) {
		const absolutePath = path.join(skillsRoot, relativePath);
		const content = readFileSync(absolutePath, 'utf8');
		const normalizedRelativePath = toPosixPath(relativePath);
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

	const content = readFileSync(repoMapPath, 'utf8');
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

	if (!REPO_MAP_SOURCE_FINGERPRINT_PATTERN.test(frontmatter.source_fingerprint ?? '')) {
		pushStrictIssue(issues, 'REPO_MAP.md frontmatter source_fingerprint must be sha256:<64 lowercase hex characters>');
	} else {
		const currentSourceFingerprint = frontmatter.source_fingerprint;
		const expectedSourceFingerprint = parseSimpleFrontmatter(generateRepoMap(projectRoot)).source_fingerprint;

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

function validateStrictContextDocuments(projectRoot: string, limits: RetentionLimits, issues: CheckIssue[]): void {
	const contextRoot = path.join(projectRoot, '.mustflow', 'context');
	const contextFiles = listFilesRecursive(contextRoot).filter((relativePath) => relativePath.endsWith('.md'));
	const hasDesignAnchor = existsSync(path.join(projectRoot, 'DESIGN.md'));

	for (const relativePath of contextFiles) {
		const normalizedPath = `.mustflow/context/${toPosixPath(relativePath)}`;
		const absolutePath = path.join(contextRoot, relativePath);
		const content = readFileSync(absolutePath, 'utf8');

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
		const parsed = JSON.parse(readFileSync(latestRunPath, 'utf8')) as unknown;

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

function validateStrict(projectRoot: string, parsed: ParsedConfigFiles, issues: CheckIssue[]): void {
	const retentionLimits = validateStrictRetentionPolicy(parsed.mustflowToml, issues);
	validateStrictPromptCachePolicy(parsed.mustflowToml, issues);
	validateStrictRefreshPolicy(parsed.mustflowToml, issues);
	validateStrictHarnessPolicy(parsed.mustflowToml, issues);
	validateStrictCommandDefaults(parsed.commandsToml, issues);
	validateStrictReleaseVersioningAuthority(parsed.preferencesToml, issues);
	validateStrictVerificationSelectionAuthority(parsed.preferencesToml, issues);
	validateStrictVersionSources(projectRoot, parsed.preferencesToml, parsed.versioningToml, issues);
	validateStrictTemplateVersionSync(projectRoot, parsed.preferencesToml, issues);
	validateStrictManagedMarkdownIdentities(projectRoot, issues);
	validateStrictRouterIndexes(projectRoot, issues);
	validateStrictSkills(projectRoot, parsed.commandsToml, issues);
	validateStrictRepoMap(projectRoot, issues);
	validateStrictContextDocuments(projectRoot, retentionLimits, issues);
	validateStrictSourceAnchors(projectRoot, issues);
	validateStrictRunReceipt(projectRoot, issues);
	validateStrictStorage(projectRoot, retentionLimits, issues);
}

function collectCheckIssues(projectRoot: string, options: CheckOptions = {}): CheckIssue[] {
	const issues: CheckIssue[] = [];

	validateRequiredFiles(projectRoot, issues);
	const parsed = validateToml(projectRoot, issues);
	validateMustflowConfig(parsed.mustflowToml, issues);
	validatePreferencesConfig(parsed.preferencesToml, issues);
	validateVersioningConfig(parsed.versioningToml, issues);
	validateCommandIntents(parsed.commandsToml, issues);
	validateSkills(projectRoot, issues);
	validateContextDocuments(projectRoot, issues);
	validateManifestLock(projectRoot, issues);

	if (options.strict) {
		validateStrict(projectRoot, parsed, issues);
	}

	return issues;
}

export interface CheckProjectReport {
	readonly issues: string[];
	readonly warnings: string[];
	readonly allMessages: string[];
}

export function checkMustflowProjectReport(projectRoot: string, options: CheckOptions = {}): CheckProjectReport {
	const issues = collectCheckIssues(projectRoot, options);
	const errors = issues.filter((issue) => issue.severity !== 'warning').map((issue) => issue.message);
	const warnings = issues.filter((issue) => issue.severity === 'warning').map((issue) => issue.message);

	return {
		issues: errors,
		warnings,
		allMessages: [...errors, ...warnings],
	};
}

export function checkMustflowProject(projectRoot: string, options: CheckOptions = {}): string[] {
	return checkMustflowProjectReport(projectRoot, options).issues;
}
