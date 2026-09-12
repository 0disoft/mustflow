import path from 'node:path';
import { isRecord, type TomlTable } from '../command-contract.js';
import { ALLOWED_RETENTION_ON_LIMIT, ALLOWED_RETENTION_STORES } from '../../../core/retention-policy.js';
import {
	readWorkspaceCommandAuthorityConfig,
	WORKSPACE_COMMAND_AUTHORITY_MODES,
} from '../../../core/workspace-command-authority.js';
import { VERSIONING_CONFIG_PATH } from '../../../core/version-sources.js';
import {
	normalizeTechnologyPreferencesTable,
	TECHNOLOGY_CONFIG_RELATIVE_PATH,
} from '../../../core/technology-preferences.js';
import {
	ALLOWED_APPROVAL_ACTIONS,
	ALLOWED_APPROVAL_GATES,
	ALLOWED_BUDGET_LIMIT_ACTIONS,
	ALLOWED_CAPABILITY_STATES,
	ALLOWED_COMMIT_MESSAGE_BODY_TEMPLATES,
	ALLOWED_COMMIT_MESSAGE_GITMOJI_MAPS,
	ALLOWED_COMMIT_MESSAGE_STYLES,
	ALLOWED_COMPACTION_CATEGORIES,
	ALLOWED_COMPACTION_LONG_LIMIT_ACTIONS,
	ALLOWED_COMPACTION_RAW_LIMIT_ACTIONS,
	ALLOWED_COMPACTION_STATE_STORES,
	ALLOWED_COMPACTION_STRATEGIES,
	ALLOWED_CONTEXT_AUTHORITIES,
	ALLOWED_CONTEXT_READ_POLICIES,
	ALLOWED_HANDOFF_MODES,
	ALLOWED_HARNESS_FRESH_CONTEXT_MODES,
	ALLOWED_HARNESS_MODES,
	ALLOWED_HARNESS_PHASES,
	ALLOWED_ISOLATION_PREFERENCES,
	ALLOWED_MAP_MODES,
	ALLOWED_MAP_PRIVACY_LEVELS,
	ALLOWED_PROJECT_PROFILES,
	ALLOWED_PROMPT_CACHE_STABLE_PREFIX_POLICIES,
	ALLOWED_PROMPT_CACHE_STRATEGIES,
	ALLOWED_PROMPT_CACHE_TASK_READ_POLICIES,
	ALLOWED_REFRESH_CHECKPOINTS,
	ALLOWED_REFRESH_METHODS,
	ALLOWED_REFRESH_MODES,
	ALLOWED_REFRESH_STATE_STORES,
	ALLOWED_STALE_TEST_ACTIONS,
	ALLOWED_TEST_AUTHORING_POLICIES,
	ALLOWED_TEST_DELETION_REASONS,
	ALLOWED_TESTING_POLICIES,
	ALLOWED_TRANSLATION_POLICIES,
	ALLOWED_VERIFICATION_SELECTION_STRATEGIES,
	ALLOWED_VERSION_SOURCE_AUTHORITIES,
	ALLOWED_VERSION_SOURCE_KINDS,
	CAPABILITY_BOOLEAN_FIELDS,
	CAPABILITY_STATE_FIELDS,
	FORBIDDEN_TEST_DELETION_REASONS,
	RELEASE_VERSIONING_BOOLEAN_FIELDS,
	REQUIRED_AGENT_LOOP_PHASES,
	TEST_AUTHORING_BOOLEAN_FIELDS,
	VERIFICATION_SELECTION_BOOLEAN_FIELDS,
} from './constants.js';
import {
	hasOwn,
	validateAllowedStringField,
	validateBooleanField,
	validateExactStringArrayField,
	validateNestedTable,
	validatePathArrayField,
	validatePathField,
	validatePositiveIntegerField,
	validateRequiredPathField,
	validateRequiredStringField,
	validateStringArrayField,
	validateStringArrayMembers,
	validateStringField,
	validateTable,
	validateWorkspaceRoots,
} from './primitives.js';
import type { CheckIssue } from './types.js';

export function validateMustflowConfig(mustflowToml: TomlTable | undefined, issues: CheckIssue[]): void {
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
				validatePositiveIntegerField(stable, 'target_kb', '[prompt_cache.layers.stable].target_kb', issues);
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
		validateAllowedStringField(
			workspace,
			'authority_mode',
			'[workspace].authority_mode',
			new Set(WORKSPACE_COMMAND_AUTHORITY_MODES),
			issues,
		);
		validatePositiveIntegerField(workspace, 'max_depth', '[workspace].max_depth', issues);
		validatePositiveIntegerField(workspace, 'max_repositories', '[workspace].max_repositories', issues);
		validateBooleanField(workspace, 'follow_symlinks', '[workspace].follow_symlinks', issues);
		validateBooleanField(workspace, 'stop_at_repository_root', '[workspace].stop_at_repository_root', issues);

		if (workspace.enabled === true && roots?.length === 0) {
			issues.push({ message: '[workspace].enabled requires at least one [workspace].roots entry' });
		}

		try {
			readWorkspaceCommandAuthorityConfig(mustflowToml);
		} catch (error) {
			issues.push({ message: error instanceof Error ? error.message : String(error) });
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

export function validatePreferencesConfig(preferencesToml: TomlTable | undefined, issues: CheckIssue[]): void {
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
			const commitMessageGitmoji = validateNestedTable(
				commitMessage,
				'gitmoji',
				'[preferences.git.commit_message.gitmoji]',
				issues,
			);
			if (commitMessageGitmoji) {
				validateAllowedStringField(
					commitMessageGitmoji,
					'map',
					'[preferences.git.commit_message.gitmoji].map',
					ALLOWED_COMMIT_MESSAGE_GITMOJI_MAPS,
					issues,
				);
			}
			const commitMessageBody = validateNestedTable(
				commitMessage,
				'body',
				'[preferences.git.commit_message.body]',
				issues,
			);
			if (commitMessageBody) {
				validateAllowedStringField(
					commitMessageBody,
					'template',
					'[preferences.git.commit_message.body].template',
					ALLOWED_COMMIT_MESSAGE_BODY_TEMPLATES,
					issues,
				);
				validateBooleanField(
					commitMessageBody,
					'require_validation_line',
					'[preferences.git.commit_message.body].require_validation_line',
					issues,
				);
			}
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

export function validateTechnologyConfig(technologyToml: TomlTable | undefined, issues: CheckIssue[]): void {
	if (!technologyToml) {
		return;
	}

	const technology = normalizeTechnologyPreferencesTable(technologyToml, true);
	for (const issue of technology.issues) {
		issues.push({ message: `${TECHNOLOGY_CONFIG_RELATIVE_PATH}: ${issue}` });
	}
}

export function validateVersioningConfig(versioningToml: TomlTable | undefined, issues: CheckIssue[]): void {
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
