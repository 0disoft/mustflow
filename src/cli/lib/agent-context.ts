import { existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import path from 'node:path';

import {
	isRecord,
	type CommandContract,
	readString,
	readStringArray,
	type TomlTable,
} from './command-contract.js';
import { readRetentionStore } from '../../core/retention-policy.js';
import { toPosixPath } from './filesystem.js';
import { readLocalIndexPromptContext, type LocalIndexPromptContext } from './local-index.js';
import { inspectManifestLock } from './manifest-lock.js';
import {
	MUSTFLOW_JSON_MAX_BYTES,
	readMustflowTextFile,
	readMustflowTextFileIfExists,
	readMustflowTextFileResult,
} from './mustflow-read.js';
import { createRunPlan } from './run-plan.js';
import { readMustflowTomlFile } from './toml.js';
import {
	normalizeTechnologyPreferencesTable,
	TECHNOLOGY_CONFIG_RELATIVE_PATH,
	type TechnologyPreference,
} from '../../core/technology-preferences.js';
import {
	isPromptCacheStableLeafSkillSurface,
	measurePromptCacheReferenceBlockBytes,
	renderPromptCacheReferenceBlock,
} from '../../core/prompt-cache-rendering.js';
import { resolveSkillRoutes, type SkillRouteResolveReport } from '../../core/skill-route-resolution.js';

const CONTEXT_SCHEMA_VERSION = '1';
const COMMANDS_RELATIVE_PATH = '.mustflow/config/commands.toml';
const MUSTFLOW_RELATIVE_PATH = '.mustflow/config/mustflow.toml';
const PREFERENCES_RELATIVE_PATH = '.mustflow/config/preferences.toml';
const SKILL_ROUTER_RELATIVE_PATH = '.mustflow/skills/router.toml';
const TECHNOLOGY_RELATIVE_PATH = TECHNOLOGY_CONFIG_RELATIVE_PATH;
const LATEST_RUN_RELATIVE_PATH = '.mustflow/state/runs/latest.json';
const CACHE_RELATIVE_PATH = '.mustflow/cache/';
const STATE_RELATIVE_PATH = '.mustflow/state/';
const DEFAULT_PROMPT_CACHE_STABLE_READ = [
	'AGENTS.md',
	'.mustflow/skills/router.toml',
] as const;
const DEFAULT_PROMPT_CACHE_TASK_SOURCES = [
	'.mustflow/context/INDEX.md',
	'skill_route_candidates',
	'route_metadata_fallback',
	'repo_map_navigation',
	'matching_skill',
	'relevant_source_files',
] as const;
const DEFAULT_PROMPT_CACHE_VOLATILE_SOURCES = [
	'.mustflow/state/runs/latest.json',
	'changed_files',
	'command_output_tail',
	'current_user_task',
] as const;
const BLOCKED_ACTIONS = [
	'unconfigured_project_command',
	'unmanaged_long_running_process',
	'auto_push',
	'raw_transcript_storage',
] as const;

type JsonScalar = string | number | boolean | null;
type JsonObject = Record<string, JsonScalar | JsonScalar[]>;
export type PromptCacheProfile = 'stable' | 'task' | 'volatile' | 'all';
export type PromptCacheBudgetStatus = 'within_budget' | 'over_budget' | 'unknown';
export type PromptCacheAuditSourceKind = 'file_reference' | 'dynamic_selection' | 'runtime_volatile';
export type PromptCacheAuditSelectionPolicy =
	| 'always_rendered'
	| 'read_when_selected'
	| 'fallback_when_needed'
	| 'selected_at_runtime'
	| 'volatile_runtime';
export type PromptCacheAuditMeasurementStatus = 'measured' | 'hash_only_deferred' | 'dynamic_unmeasured';
export type PromptBundleCacheability =
	| 'provider_prefix_candidate'
	| 'task_selective'
	| 'task_fallback'
	| 'runtime_selection'
	| 'volatile_suffix';

export interface PromptCacheProfileOptions {
	readonly includeAudit?: boolean;
	readonly comparePath?: string | null;
	readonly routeInput?: PromptCacheRouteInput | null;
}

export interface PromptCacheRouteInput {
	readonly taskText: string | null;
	readonly paths: readonly string[];
	readonly reasons: readonly string[];
	readonly maxCandidates?: number;
}

export interface PathContext {
	readonly path: string;
	readonly exists: boolean;
}

export interface IntentContext {
	readonly name: string;
	readonly status: string;
	readonly lifecycle: string | null;
	readonly run_policy: string | null;
	readonly description: string | null;
}

export interface CommandContractContext {
	readonly path: string;
	readonly exists: boolean;
	readonly intents: readonly IntentContext[];
	readonly runnable_intents: readonly string[];
}

export interface TechnologyPreferencesContext {
	readonly path: string;
	readonly exists: boolean;
	readonly authority: 'hint';
	readonly guidance: readonly string[];
	readonly count: number;
	readonly preferences: readonly TechnologyPreference[];
	readonly issues: readonly string[];
}

export interface EffectivePolicyContext {
	readonly entrypoint: string;
	readonly nearest_agents: string;
	readonly command_contract: string;
	readonly project_commands_require_mf_run: boolean;
	readonly allow_inferred_commands: boolean;
	readonly auto_stage: boolean;
	readonly auto_commit: boolean;
	readonly auto_push: boolean;
	readonly state_is_versioned: boolean;
	readonly raw_logs_allowed: boolean;
}

export interface StatePolicyContext {
	readonly cache_path: string;
	readonly state_path: string;
	readonly versioned: boolean;
	readonly safe_to_delete: boolean;
	readonly stores_raw_conversation: boolean;
	readonly stores_full_terminal_output: boolean;
	readonly stores_hidden_chain_of_thought: boolean;
}

export type LatestRunContext =
	| {
			readonly path: string;
			readonly exists: false;
	  }
	| {
			readonly path: string;
			readonly exists: true;
			readonly valid: false;
			readonly error: string;
	  }
	| {
			readonly path: string;
			readonly exists: true;
			readonly valid: true;
			readonly intent: string;
			readonly status: string;
			readonly timed_out: boolean;
			readonly exit_code: number | null;
			readonly finished_at: string | null;
			readonly duration_ms: number | null;
	  };

export interface AgentContext {
	readonly schema_version: string;
	readonly command: 'context';
	readonly mustflow_root: string;
	readonly installed: boolean;
	readonly manifest_lock: 'missing' | 'invalid' | 'present';
	readonly template: { readonly id: string; readonly version: string } | null;
	readonly authority: JsonObject;
	readonly capabilities: JsonObject;
	readonly read_order: readonly PathContext[];
	readonly optional_read_order: readonly PathContext[];
	readonly command_contract: CommandContractContext;
	readonly technology_preferences: TechnologyPreferencesContext;
	readonly effective_policy: EffectivePolicyContext;
	readonly state_policy: StatePolicyContext;
	readonly blocked_actions: readonly string[];
	readonly latest_run: LatestRunContext;
	readonly issues: readonly string[];
}

export interface PromptCacheSettingsContext {
	readonly enabled: boolean;
	readonly strategy: string | null;
	readonly stable_prefix_policy: string | null;
	readonly prefer_references_when_unchanged: boolean;
	readonly exclude_volatile_state_from_prefix: boolean;
	readonly include_content_hashes: boolean;
	readonly max_stable_prefix_kb: number | null;
	readonly max_task_context_kb: number | null;
	readonly max_volatile_suffix_kb: number | null;
}

export interface PromptCacheDocumentContext {
	readonly path: string;
	readonly exists: boolean;
	readonly content_hash: string | null;
}

export interface StablePromptCacheLayerContext {
	readonly cache_layer: 'stable';
	readonly cache_key: string | null;
	readonly policy: string | null;
	readonly documents: readonly PromptCacheDocumentContext[];
	readonly volatile_excluded: readonly string[];
}

export interface TaskPromptCacheLayerContext {
	readonly cache_layer: 'task';
	readonly read_policy: string | null;
	readonly sources: readonly string[];
	readonly route_read_plan: TaskPromptCacheRouteReadPlanContext;
	readonly repo_map_read_plan: TaskPromptCacheRepoMapReadPlanContext;
	readonly local_index: TaskPromptCacheLocalIndexContext;
}

export interface TaskPromptCacheRouteReadPlanContext {
	readonly resolver_command: readonly string[];
	readonly stable_kernel: readonly string[];
	readonly route_sources: readonly string[];
	readonly selected_skill_paths_source: string;
	readonly route_metadata_fallback: TaskPromptCacheFallbackContext;
	readonly expanded_index_fallback: TaskPromptCacheFallbackContext;
	readonly selection_limits: TaskPromptCacheSelectionLimitsContext;
}

export interface TaskPromptCacheFallbackContext {
	readonly path: string;
	readonly read_when: readonly string[];
	readonly avoid_by_default: boolean;
}

export interface TaskPromptCacheSelectionLimitsContext {
	readonly candidates: number;
	readonly main: number;
	readonly adjuncts: number;
}

export interface TaskPromptCacheRepoMapReadPlanContext {
	readonly source: 'repo_map_navigation';
	readonly strategy: 'select_anchors_or_spans_before_full_map';
	readonly anchor_sources: readonly string[];
	readonly fallback: TaskPromptCacheFallbackContext;
}

export interface TaskPromptCacheLocalIndexContext {
	readonly source: 'local_index';
	readonly status: 'fresh' | 'missing' | 'stale' | 'unreadable';
	readonly database_path: string;
	readonly index_fresh: boolean;
	readonly stale_paths: readonly string[];
	readonly search_backend: string | null;
	readonly search_fts5_available: boolean | null;
	readonly refresh_hint: string | null;
}

export interface VolatilePromptCacheLayerContext {
	readonly cache_layer: 'volatile';
	readonly sources: readonly string[];
	readonly never_place_before_stable_prefix: boolean;
	readonly include_absolute_root: false;
	readonly include_latest_run: false;
}

export interface PromptCacheProfileContext {
	readonly schema_version: string;
	readonly command: 'context';
	readonly cache_profile: PromptCacheProfile;
	readonly prompt_cache: PromptCacheSettingsContext;
	readonly stable_prefix?: StablePromptCacheLayerContext;
	readonly task_context?: TaskPromptCacheLayerContext;
	readonly volatile_suffix?: VolatilePromptCacheLayerContext;
	readonly prompt_bundle: PromptBundleContext;
	readonly prompt_bundle_diff?: PromptBundleDiffContext;
	readonly cache_audit?: PromptCacheAuditContext;
	readonly issues: readonly string[];
}

export interface PromptCacheAuditEstimatorContext {
	readonly name: 'reference_bundle_utf8_lf_v1';
	readonly estimated_bytes_per_token: number;
	readonly caveat: string;
}

export interface PromptCacheAuditBlockContext {
	readonly id: string;
	readonly kind: 'file' | 'source_placeholder';
	readonly path: string | null;
	readonly source: string | null;
	readonly source_kind?: PromptCacheAuditSourceKind;
	readonly selection_policy?: PromptCacheAuditSelectionPolicy;
	readonly measurement_status?: PromptCacheAuditMeasurementStatus;
	readonly candidate_exists?: boolean | null;
	readonly candidate_content_hash?: string | null;
	readonly exists: boolean | null;
	readonly content_hash: string | null;
	readonly rendered_bytes: number | null;
	readonly estimated_tokens: number | null;
	readonly budget_share: number | null;
	readonly issue: string | null;
}

export interface PromptCacheAuditLayerContext {
	readonly cache_layer: 'stable' | 'task' | 'volatile';
	readonly budget_kb: number | null;
	readonly budget_bytes: number | null;
	readonly target_kb: number | null;
	readonly target_bytes: number | null;
	readonly target_status: PromptCacheBudgetStatus;
	readonly rendered_bytes: number | null;
	readonly estimated_tokens: number | null;
	readonly budget_status: PromptCacheBudgetStatus;
	readonly blocks: readonly PromptCacheAuditBlockContext[];
	readonly largest_blocks: readonly PromptCacheAuditBlockContext[];
	readonly issues: readonly string[];
}

export interface PromptCacheAuditSummaryContext {
	readonly rendered_bytes: number | null;
	readonly estimated_tokens: number | null;
	readonly measured_block_count: number;
	readonly dynamic_source_count: number;
	readonly unresolved_reference_count: number;
	readonly volatile_before_stable_count: number;
	readonly serialization_deterministic: true;
	readonly stable_leaf_skill_isolated: boolean | null;
	readonly stable_leaf_skill_risk_paths: readonly string[];
	readonly leaf_skill_change_stable_hash_delta: 0 | null;
	readonly stable_rendered_bytes: number | null;
	readonly stable_estimated_tokens: number | null;
	readonly stable_budget_status: PromptCacheBudgetStatus | null;
	readonly stable_largest_block_budget_share: number | null;
	readonly task_budget_status: PromptCacheBudgetStatus | null;
	readonly volatile_budget_status: PromptCacheBudgetStatus | null;
}

export interface PromptCacheAuditContext {
	readonly measurement: 'reference_bundle';
	readonly estimator: PromptCacheAuditEstimatorContext;
	readonly canonicalization: readonly string[];
	readonly summary: PromptCacheAuditSummaryContext;
	readonly layers: readonly PromptCacheAuditLayerContext[];
	readonly issues: readonly string[];
}

export interface PromptBundleBlockContext {
	readonly id: string;
	readonly cache_layer: 'stable' | 'task' | 'volatile';
	readonly order: number;
	readonly kind: 'file' | 'source_placeholder';
	readonly path: string | null;
	readonly source: string | null;
	readonly source_kind: PromptCacheAuditSourceKind;
	readonly selection_policy: PromptCacheAuditSelectionPolicy;
	readonly content_included: false;
	readonly content_hash: string | null;
	readonly rendered_digest: string | null;
	readonly rendered_bytes: number | null;
	readonly estimated_tokens: number | null;
	readonly cacheability: PromptBundleCacheability;
	readonly reload_on: readonly string[];
	readonly issue: string | null;
}

export interface PromptBundleLayerContext {
	readonly cache_layer: 'stable' | 'task' | 'volatile';
	readonly blocks: readonly PromptBundleBlockContext[];
}

export interface PromptBundleContext {
	readonly schema_version: '1';
	readonly renderer: 'reference_bundle_utf8_lf_v1';
	readonly content_included: false;
	readonly request_shape_hash: string;
	readonly bundle_hash: string;
	readonly layers: readonly PromptBundleLayerContext[];
	readonly issues: readonly string[];
}

export interface PromptBundleBlockDiffContext {
	readonly kind: 'added' | 'removed' | 'changed';
	readonly cache_layer: 'stable' | 'task' | 'volatile' | null;
	readonly order: number | null;
	readonly current_id: string | null;
	readonly baseline_id: string | null;
	readonly reason: string;
	readonly fields: readonly string[];
}

export interface PromptBundleStableDiffContext {
	readonly stable_block_count: number;
	readonly baseline_stable_block_count: number | null;
	readonly matching_prefix_blocks: number;
	readonly matching_prefix_ratio: number | null;
	readonly stable_prefix_preserved: boolean | null;
	readonly first_stable_difference: PromptBundleBlockDiffContext | null;
	readonly first_stable_invalidation_reason: string | null;
}

export interface PromptBundleDiffContext {
	readonly baseline_path: string;
	readonly status:
		| 'unchanged'
		| 'changed'
		| 'baseline_missing'
		| 'baseline_unreadable'
		| 'baseline_invalid'
		| 'baseline_without_prompt_bundle';
	readonly baseline_request_shape_hash: string | null;
	readonly current_request_shape_hash: string;
	readonly request_shape_changed: boolean | null;
	readonly baseline_bundle_hash: string | null;
	readonly current_bundle_hash: string;
	readonly bundle_changed: boolean | null;
	readonly first_difference: PromptBundleBlockDiffContext | null;
	readonly stable_diff: PromptBundleStableDiffContext;
	readonly changed_blocks: readonly PromptBundleBlockDiffContext[];
	readonly issues: readonly string[];
}

function safeExists(projectRoot: string, relativePath: string): boolean {
	const resolved = path.resolve(projectRoot, ...relativePath.split('/'));
	const root = path.resolve(projectRoot);
	const relative = path.relative(root, resolved);

	if (relative.startsWith('..') || path.isAbsolute(relative)) {
		return false;
	}

	return existsSync(resolved);
}

function safeRead(projectRoot: string, relativePath: string): string | null {
	return readMustflowTextFileIfExists(projectRoot, relativePath);
}

function readTomlTableIfExists(projectRoot: string, relativePath: string): TomlTable | undefined {
	const filePath = path.join(projectRoot, ...relativePath.split('/'));

	if (!existsSync(filePath)) {
		return undefined;
	}

	const parsed = readMustflowTomlFile(projectRoot, relativePath);
	return isRecord(parsed) ? parsed : undefined;
}

function readNestedTable(table: TomlTable | undefined, key: string): TomlTable | undefined {
	if (!table || !isRecord(table[key])) {
		return undefined;
	}

	return table[key];
}

function readBoolean(table: TomlTable | undefined, key: string, fallback: boolean): boolean {
	const value = table?.[key];
	return typeof value === 'boolean' ? value : fallback;
}

function readOptionalString(table: TomlTable | undefined, key: string): string | null {
	return table ? readString(table, key) ?? null : null;
}

function readOptionalStringArray(table: TomlTable | undefined, key: string): readonly string[] | null {
	return table ? readStringArray(table, key) ?? null : null;
}

function readNumber(table: TomlTable | undefined, key: string): number | null {
	const value = table?.[key];
	return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function readPathContext(projectRoot: string, paths: readonly string[]): readonly PathContext[] {
	return paths.map((relativePath) => ({
		path: toPosixPath(relativePath),
		exists: safeExists(projectRoot, relativePath),
	}));
}

function readScalarObject(table: TomlTable | undefined): JsonObject {
	if (!table) {
		return {};
	}

	const result: Record<string, JsonScalar | JsonScalar[]> = {};

	for (const [key, value] of Object.entries(table)) {
		if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean' || value === null) {
			result[key] = value;
			continue;
		}

		if (Array.isArray(value) && value.every((entry) => typeof entry === 'string')) {
			result[key] = value;
		}
	}

	return result;
}

function sha256(content: string): string {
	return `sha256:${createHash('sha256').update(content).digest('hex')}`;
}

function estimateTokens(renderedBytes: number): number {
	return Math.ceil(renderedBytes / 4);
}

function budgetBytes(budgetKb: number | null): number | null {
	return budgetKb === null ? null : Math.round(budgetKb * 1024);
}

function budgetStatus(renderedBytes: number | null, budget: number | null): PromptCacheBudgetStatus {
	if (renderedBytes === null || budget === null) {
		return 'unknown';
	}

	return renderedBytes <= budget ? 'within_budget' : 'over_budget';
}

function renderedDigest(relativePath: string, content: string): string {
	return sha256(renderPromptCacheReferenceBlock(relativePath, content));
}

function calculateBudgetShare(renderedBytes: number | null, budget: number | null): number | null {
	if (renderedBytes === null || budget === null || budget <= 0) {
		return null;
	}

	return Number((renderedBytes / budget).toFixed(6));
}

function isDirectPromptCacheSource(source: string): boolean {
	return (
		source.includes('/') ||
		source.endsWith('.md') ||
		source.endsWith('.toml') ||
		source.endsWith('.json') ||
		source.endsWith('.yaml') ||
		source.endsWith('.yml')
	);
}

function taskSourceReferencePath(source: string): string | null {
	const normalized = toPosixPath(source);

	if (normalized === 'route_metadata_fallback') {
		return '.mustflow/skills/routes.toml';
	}

	if (normalized === 'expanded_skill_index_fallback') {
		return '.mustflow/skills/INDEX.md';
	}

	if (isDirectPromptCacheSource(normalized)) {
		return normalized;
	}

	return null;
}

function taskSourceSelectionPolicy(source: string): PromptCacheAuditSelectionPolicy {
	const normalized = toPosixPath(source);

	if (
		normalized === '.mustflow/skills/routes.toml' ||
		normalized === '.mustflow/skills/INDEX.md' ||
		normalized === 'route_metadata_fallback' ||
		normalized === 'expanded_skill_index_fallback'
	) {
		return 'fallback_when_needed';
	}

	if (isDirectPromptCacheSource(normalized)) {
		return 'read_when_selected';
	}

	return 'selected_at_runtime';
}

function taskSourceKind(source: string): PromptCacheAuditSourceKind {
	return taskSourceReferencePath(source) === null ? 'dynamic_selection' : 'file_reference';
}

function taskSourceCacheability(source: string, selectionPolicy: PromptCacheAuditSelectionPolicy): PromptBundleCacheability {
	if (selectionPolicy === 'fallback_when_needed') {
		return 'task_fallback';
	}

	return taskSourceKind(source) === 'file_reference' ? 'task_selective' : 'runtime_selection';
}

function taskSourceReloadOn(source: string, selectionPolicy: PromptCacheAuditSelectionPolicy): readonly string[] {
	if (selectionPolicy === 'fallback_when_needed') {
		return ['route_resolution_changed'];
	}

	if (source === 'repo_map_navigation') {
		return ['navigation_scope_changed', 'source_anchor_selection_changed'];
	}

	if (taskSourceKind(source) === 'file_reference') {
		return ['task_selection_changed', 'source_file_hash_changed'];
	}

	if (source === 'relevant_source_files') {
		return ['source_selection_changed'];
	}

	return ['route_resolution_changed'];
}

function taskSourceIssue(source: string, measurementStatus: PromptCacheAuditMeasurementStatus): string {
	if (measurementStatus === 'hash_only_deferred') {
		return `task source is selection-gated; hash is recorded, but content is measured only when selected: ${toPosixPath(source)}`;
	}

	return `task source is selected at runtime and cannot be measured before the current task is assembled: ${source}`;
}

function hasPromptCacheRouteInput(input: PromptCacheRouteInput | null | undefined): input is PromptCacheRouteInput {
	return Boolean(input?.taskText?.trim() || input?.paths.length || input?.reasons.length);
}

function resolvePromptCacheSkillRoutes(
	projectRoot: string,
	input: PromptCacheRouteInput | null | undefined,
): SkillRouteResolveReport | null {
	if (!hasPromptCacheRouteInput(input)) {
		return null;
	}

	return resolveSkillRoutes(projectRoot, input);
}

function selectedSkillRoutePaths(routeReport: SkillRouteResolveReport | null): readonly string[] {
	return routeReport?.read_plan.selected_skill_paths ?? [];
}

function selectedTaskBlockOrder(sourceIndex: number, selectedIndex: number): number {
	return ((sourceIndex + 1) * 100) + selectedIndex + 1;
}

function readCommandContractContext(projectRoot: string): CommandContractContext {
	const commands = readTomlTableIfExists(projectRoot, COMMANDS_RELATIVE_PATH);

	if (!commands || !isRecord(commands.intents)) {
		return {
			path: COMMANDS_RELATIVE_PATH,
			exists: safeExists(projectRoot, COMMANDS_RELATIVE_PATH),
			intents: [],
			runnable_intents: [],
		};
	}

	const intents: IntentContext[] = [];
	const runnableIntents: string[] = [];
	const contract: CommandContract = {
		defaults: isRecord(commands.defaults) ? commands.defaults : {},
		intents: commands.intents,
		resources: isRecord(commands.resources) ? commands.resources : {},
	};

	for (const [name, intent] of Object.entries(commands.intents).sort(([left], [right]) => left.localeCompare(right))) {
		if (!isRecord(intent)) {
			continue;
		}

		const status = readString(intent, 'status') ?? 'unknown';
		const lifecycle = readString(intent, 'lifecycle') ?? null;
		const runPolicy = readString(intent, 'run_policy') ?? null;

		intents.push({
			name,
			status,
			lifecycle,
			run_policy: runPolicy,
			description: readString(intent, 'description') ?? null,
		});

		if (createRunPlan(projectRoot, contract, name).ok) {
			runnableIntents.push(name);
		}
	}

	return {
		path: COMMANDS_RELATIVE_PATH,
		exists: true,
		intents,
		runnable_intents: runnableIntents,
	};
}

function readTechnologyPreferencesContext(projectRoot: string): TechnologyPreferencesContext {
	const technology = readTomlTableIfExists(projectRoot, TECHNOLOGY_RELATIVE_PATH);
	const file = normalizeTechnologyPreferencesTable(technology, safeExists(projectRoot, TECHNOLOGY_RELATIVE_PATH));

	return {
		path: file.path,
		exists: file.exists,
		authority: file.authority,
		guidance: file.guidance,
		count: file.preferences.length,
		preferences: file.preferences,
		issues: file.issues,
	};
}

function readEffectivePolicyContext(
	mustflow: TomlTable | undefined,
	preferences: TomlTable | undefined,
): EffectivePolicyContext {
	const verification = readNestedTable(mustflow, 'verification');
	const retention = readNestedTable(mustflow, 'retention');
	const git = readNestedTable(preferences, 'git');
	const allowInferredCommands = readBoolean(verification, 'allow_inferred_commands', false);
	const requireConfiguredIntents = readBoolean(verification, 'require_configured_intents', true);
	const rawEventsStore = readRetentionStore(retention, 'raw_events') ?? 'none';

	return {
		entrypoint: 'AGENTS.md',
		nearest_agents: 'AGENTS.md',
		command_contract: COMMANDS_RELATIVE_PATH,
		project_commands_require_mf_run: requireConfiguredIntents && !allowInferredCommands,
		allow_inferred_commands: allowInferredCommands,
		auto_stage: readBoolean(git, 'auto_stage', false),
		auto_commit: readBoolean(git, 'auto_commit', false),
		auto_push: readBoolean(git, 'auto_push', false),
		state_is_versioned: false,
		raw_logs_allowed: rawEventsStore !== 'none',
	};
}

function readStatePolicyContext(): StatePolicyContext {
	return {
		cache_path: CACHE_RELATIVE_PATH,
		state_path: STATE_RELATIVE_PATH,
		versioned: false,
		safe_to_delete: true,
		stores_raw_conversation: false,
		stores_full_terminal_output: false,
		stores_hidden_chain_of_thought: false,
	};
}

function readLatestRunContext(projectRoot: string): LatestRunContext {
	const latestPath = path.join(projectRoot, ...LATEST_RUN_RELATIVE_PATH.split('/'));

	if (!existsSync(latestPath)) {
		return {
			path: LATEST_RUN_RELATIVE_PATH,
			exists: false,
		};
	}

	try {
		const parsed = JSON.parse(
			readMustflowTextFile(projectRoot, LATEST_RUN_RELATIVE_PATH, { maxBytes: MUSTFLOW_JSON_MAX_BYTES }),
		) as unknown;

		if (!isRecord(parsed)) {
			throw new Error('latest run receipt must contain a JSON object');
		}

		return {
			path: LATEST_RUN_RELATIVE_PATH,
			exists: true,
			valid: true,
			intent: typeof parsed.intent === 'string' ? parsed.intent : 'unknown',
			status: typeof parsed.status === 'string' ? parsed.status : 'unknown',
			timed_out: parsed.timed_out === true,
			exit_code: typeof parsed.exit_code === 'number' ? parsed.exit_code : null,
			finished_at: typeof parsed.finished_at === 'string' ? parsed.finished_at : null,
			duration_ms: typeof parsed.duration_ms === 'number' ? parsed.duration_ms : null,
		};
	} catch (error) {
		return {
			path: LATEST_RUN_RELATIVE_PATH,
			exists: true,
			valid: false,
			error: error instanceof Error ? error.message : String(error),
		};
	}
}

function readPromptCacheSettings(mustflow: TomlTable | undefined): PromptCacheSettingsContext {
	const promptCache = readNestedTable(mustflow, 'prompt_cache');

	return {
		enabled: readBoolean(promptCache, 'enabled', false),
		strategy: readOptionalString(promptCache, 'strategy'),
		stable_prefix_policy: readOptionalString(promptCache, 'stable_prefix_policy'),
		prefer_references_when_unchanged: readBoolean(promptCache, 'prefer_references_when_unchanged', false),
		exclude_volatile_state_from_prefix: readBoolean(promptCache, 'exclude_volatile_state_from_prefix', false),
		include_content_hashes: readBoolean(promptCache, 'include_content_hashes', false),
		max_stable_prefix_kb: readNumber(promptCache, 'max_stable_prefix_kb'),
		max_task_context_kb: readNumber(promptCache, 'max_task_context_kb'),
		max_volatile_suffix_kb: readNumber(promptCache, 'max_volatile_suffix_kb'),
	};
}

function readPromptCacheLayer(mustflow: TomlTable | undefined, name: string): TomlTable | undefined {
	const promptCache = readNestedTable(mustflow, 'prompt_cache');
	const layers = readNestedTable(promptCache, 'layers');
	return readNestedTable(layers, name);
}

function readStablePromptCacheLayer(projectRoot: string, mustflow: TomlTable | undefined): StablePromptCacheLayerContext {
	const promptCache = readNestedTable(mustflow, 'prompt_cache');
	const layer = readPromptCacheLayer(mustflow, 'stable');
	const volatileLayer = readPromptCacheLayer(mustflow, 'volatile');
	const read = readOptionalStringArray(layer, 'read') ?? [...DEFAULT_PROMPT_CACHE_STABLE_READ];
	const documents = read.map((relativePath) => {
		const content = safeRead(projectRoot, relativePath);

		return {
			path: toPosixPath(relativePath),
			exists: content !== null,
			content_hash: content === null ? null : sha256(content),
		};
	});
	const cacheMaterial = documents
		.map((document) => `${document.path}\0${document.content_hash ?? 'missing'}`)
		.join('\n');

	return {
		cache_layer: 'stable',
		cache_key: documents.length === 0 ? null : sha256(cacheMaterial),
		policy: readOptionalString(promptCache, 'stable_prefix_policy'),
		documents,
		volatile_excluded: readOptionalStringArray(volatileLayer, 'sources') ?? [...DEFAULT_PROMPT_CACHE_VOLATILE_SOURCES],
	};
}

function mapLocalIndexPromptContext(context: LocalIndexPromptContext): TaskPromptCacheLocalIndexContext {
	return {
		source: context.source,
		status: context.status,
		database_path: context.databasePath,
		index_fresh: context.indexFresh,
		stale_paths: context.stalePaths,
		search_backend: context.searchBackend,
		search_fts5_available: context.searchFts5Available,
		refresh_hint: context.refreshHint,
	};
}

function readSkillRouterTable(projectRoot: string): TomlTable | undefined {
	try {
		const parsed = readMustflowTomlFile(projectRoot, SKILL_ROUTER_RELATIVE_PATH);
		return isRecord(parsed) ? parsed : undefined;
	} catch {
		return undefined;
	}
}

function readTaskPromptCacheRouteReadPlan(projectRoot: string): TaskPromptCacheRouteReadPlanContext {
	const router = readSkillRouterTable(projectRoot);
	const readWhen = readNestedTable(router, 'read_when');
	const fullRoutes = readOptionalString(router, 'full_routes') ?? '.mustflow/skills/routes.toml';
	const expandedIndex = readOptionalString(router, 'expanded_index') ?? '.mustflow/skills/INDEX.md';
	const skillRoot = readOptionalString(router, 'skill_root') ?? '.mustflow/skills';
	const candidates = readNumber(router, 'selection_limit') ?? 5;
	const main = readNumber(router, 'main_limit') ?? 1;
	const adjuncts = readNumber(router, 'adjunct_limit') ?? 2;

	return {
		resolver_command: ['mf', 'skill', 'route', '--json'],
		stable_kernel: [toPosixPath(SKILL_ROUTER_RELATIVE_PATH)],
		route_sources: [
			toPosixPath(fullRoutes),
			`${toPosixPath(skillRoot)}/*/SKILL.md frontmatter`,
		],
		selected_skill_paths_source: 'mf skill route --json read_plan.selected_skill_paths',
		route_metadata_fallback: {
			path: toPosixPath(fullRoutes),
			read_when: readOptionalStringArray(readWhen, 'full_routes') ?? [],
			avoid_by_default: true,
		},
		expanded_index_fallback: {
			path: toPosixPath(expandedIndex),
			read_when: readOptionalStringArray(readWhen, 'expanded_index') ?? [],
			avoid_by_default: true,
		},
		selection_limits: { candidates, main, adjuncts },
	};
}

function readTaskPromptCacheRepoMapReadPlan(): TaskPromptCacheRepoMapReadPlanContext {
	return {
		source: 'repo_map_navigation',
		strategy: 'select_anchors_or_spans_before_full_map',
		anchor_sources: [
			'local_index source anchors',
			'REPO_MAP.md Priority Anchors',
			'REPO_MAP.md Source Anchors',
		],
		fallback: {
			path: 'REPO_MAP.md',
			read_when: [
				'broader repository navigation is needed',
				'local index is missing, stale, or unavailable',
				'selected anchors or spans do not identify the needed files',
				'task edits the repository map generator or generated map contract',
			],
			avoid_by_default: true,
		},
	};
}

async function readTaskPromptCacheLayer(projectRoot: string, mustflow: TomlTable | undefined): Promise<TaskPromptCacheLayerContext> {
	const layer = readPromptCacheLayer(mustflow, 'task');
	const localIndex = await readLocalIndexPromptContext(projectRoot);

	return {
		cache_layer: 'task',
		read_policy: readOptionalString(layer, 'read_policy'),
		sources: readOptionalStringArray(layer, 'sources') ?? [...DEFAULT_PROMPT_CACHE_TASK_SOURCES],
		route_read_plan: readTaskPromptCacheRouteReadPlan(projectRoot),
		repo_map_read_plan: readTaskPromptCacheRepoMapReadPlan(),
		local_index: mapLocalIndexPromptContext(localIndex),
	};
}

function readVolatilePromptCacheLayer(mustflow: TomlTable | undefined): VolatilePromptCacheLayerContext {
	const layer = readPromptCacheLayer(mustflow, 'volatile');

	return {
		cache_layer: 'volatile',
		sources: readOptionalStringArray(layer, 'sources') ?? [...DEFAULT_PROMPT_CACHE_VOLATILE_SOURCES],
		never_place_before_stable_prefix: readBoolean(layer, 'never_place_before_stable_prefix', false),
		include_absolute_root: false,
		include_latest_run: false,
	};
}

function readStablePromptBundleLayer(projectRoot: string, mustflow: TomlTable | undefined): PromptBundleLayerContext {
	const layer = readPromptCacheLayer(mustflow, 'stable');
	const read = readOptionalStringArray(layer, 'read') ?? [...DEFAULT_PROMPT_CACHE_STABLE_READ];

	return {
		cache_layer: 'stable',
		blocks: read.map((relativePath, index) => {
			const path = toPosixPath(relativePath);
			const content = safeRead(projectRoot, relativePath);
			const renderedBytes = content === null ? null : measurePromptCacheReferenceBlockBytes(relativePath, content);
			const issue = content === null ? `stable prefix document is missing: ${path}` : null;

			return {
				id: `stable:${index + 1}:${path}`,
				cache_layer: 'stable',
				order: index + 1,
				kind: content === null ? 'source_placeholder' : 'file',
				path: content === null ? null : path,
				source: null,
				source_kind: 'file_reference',
				selection_policy: 'always_rendered',
				content_included: false,
				content_hash: content === null ? null : sha256(content),
				rendered_digest: content === null ? null : renderedDigest(relativePath, content),
				rendered_bytes: renderedBytes,
				estimated_tokens: renderedBytes === null ? null : estimateTokens(renderedBytes),
				cacheability: 'provider_prefix_candidate',
				reload_on: ['stable_file_hash_changed'],
				issue,
			} satisfies PromptBundleBlockContext;
		}),
	};
}

function readTaskPromptBundleLayer(
	projectRoot: string,
	mustflow: TomlTable | undefined,
	routeReport: SkillRouteResolveReport | null,
): PromptBundleLayerContext {
	const layer = readPromptCacheLayer(mustflow, 'task');
	const sources = readOptionalStringArray(layer, 'sources') ?? [...DEFAULT_PROMPT_CACHE_TASK_SOURCES];
	const selectedSkillPaths = selectedSkillRoutePaths(routeReport);

	return {
		cache_layer: 'task',
		blocks: sources.flatMap((source, index) => {
			const selectionPolicy = taskSourceSelectionPolicy(source);
			const sourceKind = taskSourceKind(source);
			const referencePath = taskSourceReferencePath(source);
			const content = referencePath === null ? null : safeRead(projectRoot, referencePath);
			const renderedBytes = content === null || referencePath === null ? null : measurePromptCacheReferenceBlockBytes(referencePath, content);
			const hasResolvedMatchingSkill = source === 'matching_skill' && selectedSkillPaths.length > 0;
			const issue = !hasResolvedMatchingSkill && content === null
				? taskSourceIssue(source, sourceKind === 'file_reference' ? 'hash_only_deferred' : 'dynamic_unmeasured')
				: null;

			const baseBlock = {
				id: `task:${index + 1}:${source}`,
				cache_layer: 'task',
				order: index + 1,
				kind: sourceKind === 'file_reference' && content !== null ? 'file' : 'source_placeholder',
				path: sourceKind === 'file_reference' && content !== null ? referencePath : null,
				source,
				source_kind: sourceKind,
				selection_policy: selectionPolicy,
				content_included: false,
				content_hash: content === null ? null : sha256(content),
				rendered_digest: content === null || referencePath === null ? null : renderedDigest(referencePath, content),
				rendered_bytes: renderedBytes,
				estimated_tokens: renderedBytes === null ? null : estimateTokens(renderedBytes),
				cacheability: taskSourceCacheability(source, selectionPolicy),
				reload_on: taskSourceReloadOn(source, selectionPolicy),
				issue,
			} satisfies PromptBundleBlockContext;

			if (source !== 'matching_skill') {
				return [baseBlock];
			}

			const selectedBlocks = selectedSkillPaths.map((skillPath, selectedIndex) => {
				const normalizedPath = toPosixPath(skillPath);
				const skillContent = safeRead(projectRoot, normalizedPath);
				const skillRenderedBytes = skillContent === null ? null : measurePromptCacheReferenceBlockBytes(normalizedPath, skillContent);
				const skillIssue = skillContent === null
					? taskSourceIssue(normalizedPath, 'hash_only_deferred')
					: null;

				return {
					id: `task:${index + 1}:matching_skill:${selectedIndex + 1}:${normalizedPath}`,
					cache_layer: 'task',
					order: selectedTaskBlockOrder(index, selectedIndex),
					kind: skillContent === null ? 'source_placeholder' : 'file',
					path: skillContent === null ? null : normalizedPath,
					source,
					source_kind: skillContent === null ? 'dynamic_selection' : 'file_reference',
					selection_policy: 'selected_at_runtime',
					content_included: false,
					content_hash: skillContent === null ? null : sha256(skillContent),
					rendered_digest: skillContent === null ? null : renderedDigest(normalizedPath, skillContent),
					rendered_bytes: skillRenderedBytes,
					estimated_tokens: skillRenderedBytes === null ? null : estimateTokens(skillRenderedBytes),
					cacheability: 'runtime_selection',
					reload_on: ['route_resolution_changed', 'source_file_hash_changed'],
					issue: skillIssue,
				} satisfies PromptBundleBlockContext;
			});

			return [baseBlock, ...selectedBlocks];
		}),
	};
}

function readVolatilePromptBundleLayer(mustflow: TomlTable | undefined): PromptBundleLayerContext {
	const layer = readPromptCacheLayer(mustflow, 'volatile');
	const sources = readOptionalStringArray(layer, 'sources') ?? [...DEFAULT_PROMPT_CACHE_VOLATILE_SOURCES];
	const issue = 'volatile suffix sources are runtime-only; current task, changed files, and command tails are not rendered here';

	return {
		cache_layer: 'volatile',
		blocks: sources.map((source, index) => ({
			id: `volatile:${index + 1}:${source}`,
			cache_layer: 'volatile',
			order: index + 1,
			kind: 'source_placeholder',
			path: null,
			source,
			source_kind: 'runtime_volatile',
			selection_policy: 'volatile_runtime',
			content_included: false,
			content_hash: null,
			rendered_digest: null,
			rendered_bytes: null,
			estimated_tokens: null,
			cacheability: 'volatile_suffix',
			reload_on: ['volatile_state_changed'],
			issue,
		})) satisfies PromptBundleBlockContext[],
	};
}

function readPromptBundle(
	projectRoot: string,
	mustflow: TomlTable | undefined,
	profile: PromptCacheProfile,
	routeReport: SkillRouteResolveReport | null = null,
): PromptBundleContext {
	const layers: PromptBundleLayerContext[] = [];

	if (profile === 'stable' || profile === 'all') {
		layers.push(readStablePromptBundleLayer(projectRoot, mustflow));
	}

	if (profile === 'task' || profile === 'all') {
		layers.push(readTaskPromptBundleLayer(projectRoot, mustflow, routeReport));
	}

	if (profile === 'volatile' || profile === 'all') {
		layers.push(readVolatilePromptBundleLayer(mustflow));
	}

	const blocks = layers.flatMap((layer) => layer.blocks);
	const shapeMaterial = blocks
		.map((block) => [block.cache_layer, block.order, block.kind, block.path ?? '', block.source ?? '', block.selection_policy, block.cacheability].join('\0'))
		.join('\n');
	const bundleMaterial = blocks
		.map((block) => [block.id, block.content_hash ?? '', block.rendered_digest ?? '', block.issue ?? ''].join('\0'))
		.join('\n');

	return {
		schema_version: '1',
		renderer: 'reference_bundle_utf8_lf_v1',
		content_included: false,
		request_shape_hash: sha256(shapeMaterial),
		bundle_hash: sha256(bundleMaterial),
		layers,
		issues: [...new Set(blocks.flatMap((block) => (block.issue === null ? [] : [block.issue])))],
	};
}

function isPromptBundleBlock(value: unknown): value is PromptBundleBlockContext {
	return isRecord(value) && typeof value.id === 'string' && typeof value.cache_layer === 'string' && typeof value.order === 'number';
}

function isPromptBundleLayer(value: unknown): value is PromptBundleLayerContext {
	return isRecord(value) && typeof value.cache_layer === 'string' && Array.isArray(value.blocks) && value.blocks.every(isPromptBundleBlock);
}

function isPromptBundleContext(value: unknown): value is PromptBundleContext {
	return (
		isRecord(value) &&
		typeof value.request_shape_hash === 'string' &&
		typeof value.bundle_hash === 'string' &&
		Array.isArray(value.layers) &&
		value.layers.every(isPromptBundleLayer)
	);
}

function readBaselinePromptBundle(projectRoot: string, baselinePath: string): {
	readonly status: PromptBundleDiffContext['status'];
	readonly bundle: PromptBundleContext | null;
	readonly issues: readonly string[];
} {
	const normalizedPath = toPosixPath(baselinePath);
	const readResult = readMustflowTextFileResult(projectRoot, normalizedPath, { maxBytes: MUSTFLOW_JSON_MAX_BYTES });

	if (!readResult.ok) {
		if (!readResult.exists) {
			return {
				status: 'baseline_missing',
				bundle: null,
				issues: [`baseline context report is missing: ${normalizedPath}`],
			};
		}

		return {
			status: 'baseline_unreadable',
			bundle: null,
			issues: [`baseline context report is unreadable: ${readResult.error ?? normalizedPath}`],
		};
	}

	let parsed: unknown;
	try {
		parsed = JSON.parse(readResult.content) as unknown;
	} catch (error) {
		return {
			status: 'baseline_invalid',
			bundle: null,
			issues: [`baseline context report is not valid JSON: ${error instanceof Error ? error.message : String(error)}`],
		};
	}

	if (!isRecord(parsed) || !('prompt_bundle' in parsed)) {
		return {
			status: 'baseline_without_prompt_bundle',
			bundle: null,
			issues: [`baseline context report does not contain prompt_bundle: ${normalizedPath}`],
		};
	}

	if (!isPromptBundleContext(parsed.prompt_bundle)) {
		return {
			status: 'baseline_invalid',
			bundle: null,
			issues: [`baseline prompt_bundle has an unsupported shape: ${normalizedPath}`],
		};
	}

	return { status: 'unchanged', bundle: parsed.prompt_bundle, issues: [] };
}

function blockKey(block: PromptBundleBlockContext): string {
	return `${block.cache_layer}:${block.order}`;
}

function blockLocation(block: PromptBundleBlockContext): string {
	return [blockKey(block), block.path ?? block.source ?? block.id].join(':');
}

function compareStringArray(left: readonly string[], right: readonly string[]): boolean {
	return left.length === right.length && left.every((entry, index) => entry === right[index]);
}

function changedBlockFields(current: PromptBundleBlockContext, baseline: PromptBundleBlockContext): readonly string[] {
	const fields: string[] = [];

	if (current.id !== baseline.id) {
		fields.push('id');
	}
	if (current.kind !== baseline.kind) {
		fields.push('kind');
	}
	if (current.path !== baseline.path) {
		fields.push('path');
	}
	if (current.source !== baseline.source) {
		fields.push('source');
	}
	if (current.source_kind !== baseline.source_kind) {
		fields.push('source_kind');
	}
	if (current.selection_policy !== baseline.selection_policy) {
		fields.push('selection_policy');
	}
	if (current.content_hash !== baseline.content_hash) {
		fields.push('content_hash');
	}
	if (current.rendered_digest !== baseline.rendered_digest) {
		fields.push('rendered_digest');
	}
	if (current.rendered_bytes !== baseline.rendered_bytes) {
		fields.push('rendered_bytes');
	}
	if (current.estimated_tokens !== baseline.estimated_tokens) {
		fields.push('estimated_tokens');
	}
	if (current.cacheability !== baseline.cacheability) {
		fields.push('cacheability');
	}
	if (!compareStringArray(current.reload_on, baseline.reload_on)) {
		fields.push('reload_on');
	}
	if (current.issue !== baseline.issue) {
		fields.push('issue');
	}

	return fields;
}

function flattenBundleBlocks(bundle: PromptBundleContext): readonly PromptBundleBlockContext[] {
	return bundle.layers.flatMap((layer) => layer.blocks);
}

function stableBundleBlocks(bundle: PromptBundleContext): readonly PromptBundleBlockContext[] {
	return flattenBundleBlocks(bundle).filter((block) => block.cache_layer === 'stable');
}

function promptBundleBlocksMatch(current: PromptBundleBlockContext, baseline: PromptBundleBlockContext): boolean {
	return changedBlockFields(current, baseline).length === 0;
}

function comparePromptBundles(current: PromptBundleContext, baseline: PromptBundleContext): readonly PromptBundleBlockDiffContext[] {
	const currentBlocks = flattenBundleBlocks(current);
	const baselineBlocks = flattenBundleBlocks(baseline);
	const currentByKey = new Map(currentBlocks.map((block) => [blockKey(block), block]));
	const baselineByKey = new Map(baselineBlocks.map((block) => [blockKey(block), block]));
	const keys = [...new Set([...baselineBlocks.map(blockKey), ...currentBlocks.map(blockKey)])].sort();
	const diffs: PromptBundleBlockDiffContext[] = [];

	for (const key of keys) {
		const currentBlock = currentByKey.get(key);
		const baselineBlock = baselineByKey.get(key);

		if (currentBlock && !baselineBlock) {
			diffs.push({
				kind: 'added',
				cache_layer: currentBlock.cache_layer,
				order: currentBlock.order,
				current_id: currentBlock.id,
				baseline_id: null,
				reason: `prompt bundle block added at ${key}`,
				fields: [],
			});
			continue;
		}

		if (!currentBlock && baselineBlock) {
			diffs.push({
				kind: 'removed',
				cache_layer: baselineBlock.cache_layer,
				order: baselineBlock.order,
				current_id: null,
				baseline_id: baselineBlock.id,
				reason: `prompt bundle block removed at ${key}`,
				fields: [],
			});
			continue;
		}

		if (!currentBlock || !baselineBlock) {
			continue;
		}

		const fields = changedBlockFields(currentBlock, baselineBlock);
		if (fields.length > 0) {
			diffs.push({
				kind: 'changed',
				cache_layer: currentBlock.cache_layer,
				order: currentBlock.order,
				current_id: currentBlock.id,
				baseline_id: baselineBlock.id,
				reason: `prompt bundle block changed at ${key}: ${fields.join(', ')}`,
				fields,
			});
		}
	}

	return diffs;
}

function emptyStableDiff(currentBundle: PromptBundleContext): PromptBundleStableDiffContext {
	return {
		stable_block_count: stableBundleBlocks(currentBundle).length,
		baseline_stable_block_count: null,
		matching_prefix_blocks: 0,
		matching_prefix_ratio: null,
		stable_prefix_preserved: null,
		first_stable_difference: null,
		first_stable_invalidation_reason: null,
	};
}

function readStablePrefixDifference(
	currentBlock: PromptBundleBlockContext | undefined,
	baselineBlock: PromptBundleBlockContext | undefined,
	index: number,
): PromptBundleBlockDiffContext {
	const key = `stable prefix block ${index + 1}`;
	if (currentBlock && !baselineBlock) {
		return {
			kind: 'added',
			cache_layer: currentBlock.cache_layer,
			order: currentBlock.order,
			current_id: currentBlock.id,
			baseline_id: null,
			reason: `${key} added at ${blockLocation(currentBlock)}`,
			fields: [],
		};
	}

	if (!currentBlock && baselineBlock) {
		return {
			kind: 'removed',
			cache_layer: baselineBlock.cache_layer,
			order: baselineBlock.order,
			current_id: null,
			baseline_id: baselineBlock.id,
			reason: `${key} removed at ${blockLocation(baselineBlock)}`,
			fields: [],
		};
	}

	if (!currentBlock || !baselineBlock) {
		throw new Error('stable prefix comparison reached an impossible block state');
	}

	const fields = changedBlockFields(currentBlock, baselineBlock);
	return {
		kind: 'changed',
		cache_layer: currentBlock.cache_layer,
		order: currentBlock.order,
		current_id: currentBlock.id,
		baseline_id: baselineBlock.id,
		reason: `${key} changed at ${blockLocation(currentBlock)}: ${fields.join(', ')}`,
		fields,
	};
}

function readPromptBundleStableDiff(
	currentBundle: PromptBundleContext,
	baselineBundle: PromptBundleContext,
): PromptBundleStableDiffContext {
	const currentStableBlocks = stableBundleBlocks(currentBundle);
	const baselineStableBlocks = stableBundleBlocks(baselineBundle);
	const comparedBlockCount = Math.max(currentStableBlocks.length, baselineStableBlocks.length);
	let matchingPrefixBlocks = 0;
	let firstStableDifference: PromptBundleBlockDiffContext | null = null;
	let index = 0;

	while (index < comparedBlockCount) {
		const currentBlock = currentStableBlocks[index];
		const baselineBlock = baselineStableBlocks[index];
		if (!currentBlock || !baselineBlock || !promptBundleBlocksMatch(currentBlock, baselineBlock)) {
			firstStableDifference = readStablePrefixDifference(currentBlock, baselineBlock, index);
			break;
		}

		matchingPrefixBlocks += 1;
		index += 1;
	}

	return {
		stable_block_count: currentStableBlocks.length,
		baseline_stable_block_count: baselineStableBlocks.length,
		matching_prefix_blocks: matchingPrefixBlocks,
		matching_prefix_ratio: comparedBlockCount === 0
			? null
			: Number((matchingPrefixBlocks / comparedBlockCount).toFixed(6)),
		stable_prefix_preserved: firstStableDifference === null && currentStableBlocks.length === baselineStableBlocks.length,
		first_stable_difference: firstStableDifference,
		first_stable_invalidation_reason: firstStableDifference?.reason ?? null,
	};
}

function readPromptBundleDiff(
	projectRoot: string,
	currentBundle: PromptBundleContext,
	baselinePath: string,
): PromptBundleDiffContext {
	const normalizedPath = toPosixPath(baselinePath);
	const baseline = readBaselinePromptBundle(projectRoot, normalizedPath);

	if (!baseline.bundle) {
		return {
			baseline_path: normalizedPath,
			status: baseline.status,
			baseline_request_shape_hash: null,
			current_request_shape_hash: currentBundle.request_shape_hash,
			request_shape_changed: null,
			baseline_bundle_hash: null,
			current_bundle_hash: currentBundle.bundle_hash,
			bundle_changed: null,
			first_difference: null,
			stable_diff: emptyStableDiff(currentBundle),
			changed_blocks: [],
			issues: baseline.issues,
		};
	}

	const changedBlocks = comparePromptBundles(currentBundle, baseline.bundle);
	const requestShapeChanged = baseline.bundle.request_shape_hash !== currentBundle.request_shape_hash;
	const bundleChanged = baseline.bundle.bundle_hash !== currentBundle.bundle_hash;

	return {
		baseline_path: normalizedPath,
		status: requestShapeChanged || bundleChanged || changedBlocks.length > 0 ? 'changed' : 'unchanged',
		baseline_request_shape_hash: baseline.bundle.request_shape_hash,
		current_request_shape_hash: currentBundle.request_shape_hash,
		request_shape_changed: requestShapeChanged,
		baseline_bundle_hash: baseline.bundle.bundle_hash,
		current_bundle_hash: currentBundle.bundle_hash,
		bundle_changed: bundleChanged,
		first_difference: changedBlocks[0] ?? null,
		stable_diff: readPromptBundleStableDiff(currentBundle, baseline.bundle),
		changed_blocks: changedBlocks.slice(0, 20),
		issues: [],
	};
}

function readStablePromptCacheAuditLayer(
	projectRoot: string,
	mustflow: TomlTable | undefined,
	settings: PromptCacheSettingsContext,
): PromptCacheAuditLayerContext {
	const layer = readPromptCacheLayer(mustflow, 'stable');
	const read = readOptionalStringArray(layer, 'read') ?? [...DEFAULT_PROMPT_CACHE_STABLE_READ];
	const budget = budgetBytes(settings.max_stable_prefix_kb);
	const targetKb = readNumber(layer, 'target_kb');
	const target = budgetBytes(targetKb);
	const issues: string[] = [];
	const blocks = read.map((relativePath, index) => {
		const content = safeRead(projectRoot, relativePath);
		const id = `stable:${index + 1}:${toPosixPath(relativePath)}`;

		if (content === null) {
			const issue = `stable prefix document is missing: ${toPosixPath(relativePath)}`;
			issues.push(issue);

			return {
				id,
				kind: 'file',
				path: toPosixPath(relativePath),
				source: null,
				source_kind: 'file_reference',
				selection_policy: 'always_rendered',
				measurement_status: 'measured',
				candidate_exists: false,
				candidate_content_hash: null,
				exists: false,
				content_hash: null,
				rendered_bytes: 0,
				estimated_tokens: 0,
				budget_share: calculateBudgetShare(0, budget),
				issue,
			} satisfies PromptCacheAuditBlockContext;
		}

		const renderedBytes = measurePromptCacheReferenceBlockBytes(relativePath, content);
		const contentHash = sha256(content);

		return {
			id,
			kind: 'file',
			path: toPosixPath(relativePath),
			source: null,
			source_kind: 'file_reference',
			selection_policy: 'always_rendered',
			measurement_status: 'measured',
			candidate_exists: true,
			candidate_content_hash: contentHash,
			exists: true,
			content_hash: contentHash,
			rendered_bytes: renderedBytes,
			estimated_tokens: estimateTokens(renderedBytes),
			budget_share: calculateBudgetShare(renderedBytes, budget),
			issue: null,
		} satisfies PromptCacheAuditBlockContext;
	});
	const renderedBytes = blocks.reduce((total, block) => total + (block.rendered_bytes ?? 0), 0);
	const estimatedTokens = estimateTokens(renderedBytes);
	const status = budgetStatus(renderedBytes, budget);
	const targetStatus = budgetStatus(renderedBytes, target);

	if (status === 'over_budget') {
		issues.push(
			`stable prefix exceeds max_stable_prefix_kb: ${renderedBytes} rendered bytes > ${budget} budget bytes`,
		);
	}

	return {
		cache_layer: 'stable',
		budget_kb: settings.max_stable_prefix_kb,
		budget_bytes: budget,
		target_kb: targetKb,
		target_bytes: target,
		target_status: targetStatus,
		rendered_bytes: renderedBytes,
		estimated_tokens: estimatedTokens,
		budget_status: status,
		blocks,
		largest_blocks: [...blocks]
			.sort((left, right) => (right.rendered_bytes ?? 0) - (left.rendered_bytes ?? 0))
			.slice(0, 5),
		issues,
	};
}

function readTaskSourceAuditLayer(
	projectRoot: string,
	sources: readonly string[],
	budgetKb: number | null,
	routeReport: SkillRouteResolveReport | null,
): PromptCacheAuditLayerContext {
	const budget = budgetBytes(budgetKb);
	const issues = new Set<string>();
	const selectedSkillPaths = selectedSkillRoutePaths(routeReport);
	const blocks = sources.flatMap((source, index) => {
		const selectionPolicy = taskSourceSelectionPolicy(source);
		const sourceKind = taskSourceKind(source);
		const referencePath = taskSourceReferencePath(source);
		const content = referencePath === null ? null : safeRead(projectRoot, referencePath);
		const measurementStatus: PromptCacheAuditMeasurementStatus =
			sourceKind === 'file_reference'
				? content === null
					? 'hash_only_deferred'
					: 'measured'
				: 'dynamic_unmeasured';
		const renderedBytes = content === null || referencePath === null ? null : measurePromptCacheReferenceBlockBytes(referencePath, content);
		const hasResolvedMatchingSkill = source === 'matching_skill' && selectedSkillPaths.length > 0;
		const issue = !hasResolvedMatchingSkill && content === null ? taskSourceIssue(source, measurementStatus) : null;

		if (issue) {
			issues.add(issue);
		}

		if (!hasResolvedMatchingSkill && sourceKind === 'dynamic_selection') {
			issues.add(taskSourceIssue(source, measurementStatus));
		}

		const baseBlock = {
			id: `task:${index + 1}:${source}`,
			kind: sourceKind === 'file_reference' && content !== null ? 'file' : 'source_placeholder',
			path: sourceKind === 'file_reference' && content !== null ? referencePath : null,
			source,
			source_kind: sourceKind,
			selection_policy: selectionPolicy,
			measurement_status: measurementStatus,
			candidate_exists: sourceKind === 'file_reference' ? content !== null : null,
			candidate_content_hash: content === null ? null : sha256(content),
			exists: sourceKind === 'file_reference' ? content !== null : null,
			content_hash: content === null ? null : sha256(content),
			rendered_bytes: renderedBytes,
			estimated_tokens: renderedBytes === null ? null : estimateTokens(renderedBytes),
			budget_share: calculateBudgetShare(renderedBytes, budget),
			issue,
		} satisfies PromptCacheAuditBlockContext;

		if (source !== 'matching_skill') {
			return [baseBlock];
		}

		const selectedBlocks = selectedSkillPaths.map((skillPath, selectedIndex) => {
			const normalizedPath = toPosixPath(skillPath);
			const skillContent = safeRead(projectRoot, normalizedPath);
			const skillRenderedBytes = skillContent === null ? null : measurePromptCacheReferenceBlockBytes(normalizedPath, skillContent);
			const skillMeasurementStatus: PromptCacheAuditMeasurementStatus = skillContent === null
				? 'hash_only_deferred'
				: 'measured';
			const skillIssue = skillContent === null ? taskSourceIssue(normalizedPath, skillMeasurementStatus) : null;

			if (skillIssue) {
				issues.add(skillIssue);
			}

			return {
				id: `task:${index + 1}:matching_skill:${selectedIndex + 1}:${normalizedPath}`,
				kind: skillContent === null ? 'source_placeholder' : 'file',
				path: skillContent === null ? null : normalizedPath,
				source,
				source_kind: skillContent === null ? 'dynamic_selection' : 'file_reference',
				selection_policy: 'selected_at_runtime',
				measurement_status: skillMeasurementStatus,
				candidate_exists: skillContent !== null,
				candidate_content_hash: skillContent === null ? null : sha256(skillContent),
				exists: skillContent !== null,
				content_hash: skillContent === null ? null : sha256(skillContent),
				rendered_bytes: skillRenderedBytes,
				estimated_tokens: skillRenderedBytes === null ? null : estimateTokens(skillRenderedBytes),
				budget_share: calculateBudgetShare(skillRenderedBytes, budget),
				issue: skillIssue,
			} satisfies PromptCacheAuditBlockContext;
		});

		return [baseBlock, ...selectedBlocks];
	});
	const measuredBytes = blocks.reduce((total, block) => total + (block.rendered_bytes ?? 0), 0);
	const renderedBytes = measuredBytes > 0 ? measuredBytes : null;
	const hasDynamicSources = blocks.some((block) => block.measurement_status === 'dynamic_unmeasured');
	const measuredStatus = budgetStatus(renderedBytes, budget);
	const status: PromptCacheBudgetStatus = measuredStatus === 'over_budget' || !hasDynamicSources
		? measuredStatus
		: 'unknown';

	if (measuredStatus === 'over_budget' && renderedBytes !== null && budget !== null) {
		issues.add(
			`task context measured sources exceed max_task_context_kb: ${renderedBytes} rendered bytes > ${budget} budget bytes`,
		);
	}

	return {
		cache_layer: 'task',
		budget_kb: budgetKb,
		budget_bytes: budget,
		target_kb: null,
		target_bytes: null,
		target_status: 'unknown',
		rendered_bytes: renderedBytes,
		estimated_tokens: renderedBytes === null ? null : estimateTokens(renderedBytes),
		budget_status: status,
		blocks,
		largest_blocks: [...blocks]
			.filter((block) => block.rendered_bytes !== null)
			.sort((left, right) => (right.rendered_bytes ?? 0) - (left.rendered_bytes ?? 0))
			.slice(0, 5),
		issues: [...issues],
	};
}

function readVolatileSourceAuditLayer(
	sources: readonly string[],
	budgetKb: number | null,
): PromptCacheAuditLayerContext {
	const issue = 'volatile suffix sources are runtime-only; current task, changed files, and command tails are not rendered here';
	const blocks = sources.map((source, index) => ({
		id: `volatile:${index + 1}:${source}`,
		kind: 'source_placeholder',
		path: null,
		source,
		source_kind: 'runtime_volatile',
		selection_policy: 'volatile_runtime',
		measurement_status: 'dynamic_unmeasured',
		candidate_exists: null,
		candidate_content_hash: null,
		exists: null,
		content_hash: null,
		rendered_bytes: null,
		estimated_tokens: null,
		budget_share: null,
		issue,
	})) satisfies PromptCacheAuditBlockContext[];

	return {
		cache_layer: 'volatile',
		budget_kb: budgetKb,
		budget_bytes: budgetBytes(budgetKb),
		target_kb: null,
		target_bytes: null,
		target_status: 'unknown',
		rendered_bytes: null,
		estimated_tokens: null,
		budget_status: 'unknown',
		blocks,
		largest_blocks: [],
		issues: [issue],
	};
}

function readPromptCacheAuditSummary(layers: readonly PromptCacheAuditLayerContext[]): PromptCacheAuditSummaryContext {
	const blocks = layers.flatMap((layer) => layer.blocks);
	const measuredBytes = blocks.reduce((total, block) => total + (block.rendered_bytes ?? 0), 0);
	const measuredBlockCount = blocks.filter((block) => block.measurement_status === 'measured').length;
	const stableLayer = layers.find((layer) => layer.cache_layer === 'stable') ?? null;
	const taskLayer = layers.find((layer) => layer.cache_layer === 'task') ?? null;
	const volatileLayer = layers.find((layer) => layer.cache_layer === 'volatile') ?? null;
	const stableLayerIndex = layers.findIndex((layer) => layer.cache_layer === 'stable');
	const volatileBeforeStableCount = stableLayerIndex === -1
		? 0
		: layers.slice(0, stableLayerIndex).filter((layer) => layer.cache_layer === 'volatile').length;
	const stableLargestBlockBudgetShare = stableLayer?.largest_blocks
		.map((block) => block.budget_share)
		.filter((share): share is number => share !== null)
		.sort((left, right) => right - left)[0] ?? null;
	const stableLeafSkillRiskPaths = stableLayer?.blocks
		.map((block) => block.path)
		.filter((blockPath): blockPath is string =>
			blockPath !== null && isPromptCacheStableLeafSkillSurface(blockPath)
		) ?? [];

	return {
		rendered_bytes: measuredBlockCount === 0 ? null : measuredBytes,
		estimated_tokens: measuredBlockCount === 0 ? null : estimateTokens(measuredBytes),
		measured_block_count: measuredBlockCount,
		dynamic_source_count: blocks.filter((block) => block.source_kind !== 'file_reference').length,
		unresolved_reference_count: blocks.filter((block) =>
			block.source_kind === 'file_reference' && block.measurement_status !== 'measured'
		).length,
		volatile_before_stable_count: volatileBeforeStableCount,
		serialization_deterministic: true,
		stable_leaf_skill_isolated: stableLayer === null ? null : stableLeafSkillRiskPaths.length === 0,
		stable_leaf_skill_risk_paths: stableLeafSkillRiskPaths,
		leaf_skill_change_stable_hash_delta: stableLeafSkillRiskPaths.length === 0 ? 0 : null,
		stable_rendered_bytes: stableLayer?.rendered_bytes ?? null,
		stable_estimated_tokens: stableLayer?.estimated_tokens ?? null,
		stable_budget_status: stableLayer?.budget_status ?? null,
		stable_largest_block_budget_share: stableLargestBlockBudgetShare,
		task_budget_status: taskLayer?.budget_status ?? null,
		volatile_budget_status: volatileLayer?.budget_status ?? null,
	};
}

function readPromptCacheAudit(
	projectRoot: string,
	mustflow: TomlTable | undefined,
	profile: PromptCacheProfile,
	settings: PromptCacheSettingsContext,
	routeReport: SkillRouteResolveReport | null = null,
): PromptCacheAuditContext {
	const layers: PromptCacheAuditLayerContext[] = [];

	if (profile === 'stable' || profile === 'all') {
		layers.push(readStablePromptCacheAuditLayer(projectRoot, mustflow, settings));
	}

	if (profile === 'task' || profile === 'all') {
		const taskLayer = readPromptCacheLayer(mustflow, 'task');
		layers.push(
			readTaskSourceAuditLayer(
				projectRoot,
				readOptionalStringArray(taskLayer, 'sources') ?? [...DEFAULT_PROMPT_CACHE_TASK_SOURCES],
				settings.max_task_context_kb,
				routeReport,
			),
		);
	}

	if (profile === 'volatile' || profile === 'all') {
		const volatileLayer = readPromptCacheLayer(mustflow, 'volatile');
		layers.push(
			readVolatileSourceAuditLayer(
				readOptionalStringArray(volatileLayer, 'sources') ?? [...DEFAULT_PROMPT_CACHE_VOLATILE_SOURCES],
				settings.max_volatile_suffix_kb,
			),
		);
	}

	return {
		measurement: 'reference_bundle',
		estimator: {
			name: 'reference_bundle_utf8_lf_v1',
			estimated_bytes_per_token: 4,
			caveat: 'Token counts are rough byte-based estimates, not provider billing or tokenizer output.',
		},
		canonicalization: [
			'UTF-8 byte length',
			'LF line endings',
			'trim trailing blank lines',
			'stable document path header before each block',
		],
		summary: readPromptCacheAuditSummary(layers),
		layers,
		issues: layers.flatMap((layer) => layer.issues),
	};
}

export async function getPromptCacheProfileContext(
	projectRoot: string,
	profile: PromptCacheProfile,
	options: PromptCacheProfileOptions = {},
): Promise<PromptCacheProfileContext> {
	const mustflow = readTomlTableIfExists(projectRoot, MUSTFLOW_RELATIVE_PATH);
	const lockInspection = inspectManifestLock(projectRoot);
	const promptCacheSettings = readPromptCacheSettings(mustflow);
	const routeReport = resolvePromptCacheSkillRoutes(projectRoot, options.routeInput);
	const promptBundle = readPromptBundle(projectRoot, mustflow, profile, routeReport);
	const output: PromptCacheProfileContext = {
		schema_version: CONTEXT_SCHEMA_VERSION,
		command: 'context',
		cache_profile: profile,
		prompt_cache: promptCacheSettings,
		prompt_bundle: promptBundle,
		...(options.comparePath
			? {
					prompt_bundle_diff: readPromptBundleDiff(projectRoot, promptBundle, options.comparePath),
			  }
			: {}),
		...(options.includeAudit
			? {
					cache_audit: readPromptCacheAudit(projectRoot, mustflow, profile, promptCacheSettings, routeReport),
			  }
			: {}),
		issues: lockInspection.issues,
	};

	if (profile === 'stable' || profile === 'all') {
		return {
			...output,
			stable_prefix: readStablePromptCacheLayer(projectRoot, mustflow),
			...(profile === 'all'
				? {
						task_context: await readTaskPromptCacheLayer(projectRoot, mustflow),
						volatile_suffix: readVolatilePromptCacheLayer(mustflow),
				  }
				: {}),
		};
	}

	if (profile === 'task') {
		return {
			...output,
			task_context: await readTaskPromptCacheLayer(projectRoot, mustflow),
		};
	}

	return {
		...output,
		volatile_suffix: readVolatilePromptCacheLayer(mustflow),
	};
}

export function getAgentContext(projectRoot: string): AgentContext {
	const mustflow = readTomlTableIfExists(projectRoot, MUSTFLOW_RELATIVE_PATH);
	const preferences = readTomlTableIfExists(projectRoot, PREFERENCES_RELATIVE_PATH);
	const authority = isRecord(mustflow?.authority) ? mustflow.authority : undefined;
	const capabilities = isRecord(mustflow?.capabilities) ? mustflow.capabilities : undefined;
	const readOrder = mustflow ? readStringArray(mustflow, 'read_order') ?? [] : [];
	const optionalReadOrder = mustflow ? readStringArray(mustflow, 'optional_read_order') ?? [] : [];
	const lockInspection = inspectManifestLock(projectRoot);
	const lock = lockInspection.readResult.kind === 'present' ? lockInspection.readResult.lock : undefined;

	return {
		schema_version: CONTEXT_SCHEMA_VERSION,
		command: 'context',
		mustflow_root: path.resolve(projectRoot),
		installed: safeExists(projectRoot, 'AGENTS.md') && safeExists(projectRoot, '.mustflow'),
		manifest_lock: lockInspection.readResult.kind,
		template: lock ? { id: lock.templateId, version: lock.templateVersion } : null,
		authority: readScalarObject(authority),
		capabilities: readScalarObject(capabilities),
		read_order: readPathContext(projectRoot, readOrder),
		optional_read_order: readPathContext(projectRoot, optionalReadOrder),
		command_contract: readCommandContractContext(projectRoot),
		technology_preferences: readTechnologyPreferencesContext(projectRoot),
		effective_policy: readEffectivePolicyContext(mustflow, preferences),
		state_policy: readStatePolicyContext(),
		blocked_actions: BLOCKED_ACTIONS,
		latest_run: readLatestRunContext(projectRoot),
		issues: lockInspection.issues,
	};
}
