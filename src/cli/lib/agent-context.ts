import { Buffer } from 'node:buffer';
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
} from './mustflow-read.js';
import { createRunPlan } from './run-plan.js';
import { readMustflowTomlFile } from './toml.js';
import {
	normalizeTechnologyPreferencesTable,
	TECHNOLOGY_CONFIG_RELATIVE_PATH,
	type TechnologyPreference,
} from '../../core/technology-preferences.js';

const CONTEXT_SCHEMA_VERSION = '1';
const COMMANDS_RELATIVE_PATH = '.mustflow/config/commands.toml';
const MUSTFLOW_RELATIVE_PATH = '.mustflow/config/mustflow.toml';
const PREFERENCES_RELATIVE_PATH = '.mustflow/config/preferences.toml';
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
	'.mustflow/skills/routes.toml',
	'.mustflow/skills/INDEX.md',
	'REPO_MAP.md',
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

export interface PromptCacheProfileOptions {
	readonly includeAudit?: boolean;
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
	readonly local_index: TaskPromptCacheLocalIndexContext;
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

export interface PromptCacheAuditContext {
	readonly measurement: 'reference_bundle';
	readonly estimator: PromptCacheAuditEstimatorContext;
	readonly canonicalization: readonly string[];
	readonly layers: readonly PromptCacheAuditLayerContext[];
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

function bytesForUtf8(content: string): number {
	return Buffer.byteLength(content, 'utf8');
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

function normalizeReferenceBundleContent(content: string): string {
	const normalized = content.replace(/\r\n?/gu, '\n').replace(/\n*$/u, '');
	return `${normalized}\n`;
}

function renderReferenceBundleBlock(relativePath: string, content: string): string {
	return `--- mustflow-cache-block: ${toPosixPath(relativePath)} ---\n${normalizeReferenceBundleContent(content)}`;
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

function taskSourceSelectionPolicy(source: string): PromptCacheAuditSelectionPolicy {
	const normalized = toPosixPath(source);

	if (normalized === '.mustflow/skills/routes.toml' || normalized === '.mustflow/skills/INDEX.md') {
		return 'fallback_when_needed';
	}

	if (isDirectPromptCacheSource(normalized)) {
		return 'read_when_selected';
	}

	return 'selected_at_runtime';
}

function taskSourceIssue(source: string, measurementStatus: PromptCacheAuditMeasurementStatus): string {
	if (measurementStatus === 'hash_only_deferred') {
		return `task source is selection-gated; hash is recorded, but content is measured only when selected: ${toPosixPath(source)}`;
	}

	return `task source is selected at runtime and cannot be measured before the current task is assembled: ${source}`;
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

async function readTaskPromptCacheLayer(projectRoot: string, mustflow: TomlTable | undefined): Promise<TaskPromptCacheLayerContext> {
	const layer = readPromptCacheLayer(mustflow, 'task');
	const localIndex = await readLocalIndexPromptContext(projectRoot);

	return {
		cache_layer: 'task',
		read_policy: readOptionalString(layer, 'read_policy'),
		sources: readOptionalStringArray(layer, 'sources') ?? [...DEFAULT_PROMPT_CACHE_TASK_SOURCES],
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

		const renderedBytes = bytesForUtf8(renderReferenceBundleBlock(relativePath, content));
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
): PromptCacheAuditLayerContext {
	const issues = new Set<string>();
	const blocks = sources.map((source, index) => {
		const selectionPolicy = taskSourceSelectionPolicy(source);
		const sourceKind: PromptCacheAuditSourceKind =
			selectionPolicy === 'selected_at_runtime' ? 'dynamic_selection' : 'file_reference';
		const content = sourceKind === 'file_reference' ? safeRead(projectRoot, source) : null;
		const measurementStatus: PromptCacheAuditMeasurementStatus =
			sourceKind === 'file_reference' ? 'hash_only_deferred' : 'dynamic_unmeasured';
		const issue = taskSourceIssue(source, measurementStatus);
		issues.add(issue);

		return {
			id: `task:${index + 1}:${source}`,
			kind: 'source_placeholder',
			path: null,
			source,
			source_kind: sourceKind,
			selection_policy: selectionPolicy,
			measurement_status: measurementStatus,
			candidate_exists: sourceKind === 'file_reference' ? content !== null : null,
			candidate_content_hash: content === null ? null : sha256(content),
			exists: null,
			content_hash: null,
			rendered_bytes: null,
			estimated_tokens: null,
			budget_share: null,
			issue,
		} satisfies PromptCacheAuditBlockContext;
	});

	return {
		cache_layer: 'task',
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

function readPromptCacheAudit(
	projectRoot: string,
	mustflow: TomlTable | undefined,
	profile: PromptCacheProfile,
	settings: PromptCacheSettingsContext,
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
	const output: PromptCacheProfileContext = {
		schema_version: CONTEXT_SCHEMA_VERSION,
		command: 'context',
		cache_profile: profile,
		prompt_cache: promptCacheSettings,
		...(options.includeAudit
			? {
					cache_audit: readPromptCacheAudit(projectRoot, mustflow, profile, promptCacheSettings),
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
