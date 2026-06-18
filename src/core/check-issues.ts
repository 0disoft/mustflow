export type CheckIssueId =
	| 'mustflow.command_contract.intent_table_missing'
	| 'mustflow.command_contract.intent_not_table'
	| 'mustflow.command_contract.configured_missing_lifecycle'
	| 'mustflow.command_contract.configured_missing_run_policy'
	| 'mustflow.command_contract.oneshot_missing_timeout'
	| 'mustflow.command_contract.max_output_bytes_exceeds_limit'
	| 'mustflow.command_contract.oneshot_stdin_not_closed'
	| 'mustflow.command_contract.long_running_agent_allowed'
	| 'mustflow.command_contract.agent_shell_requires_allow'
	| 'mustflow.command_contract.executable_source_missing'
	| 'mustflow.command_contract.shell_background_pattern'
	| 'mustflow.command_contract.long_running_command_pattern'
	| 'mustflow.command_contract.success_exit_codes_invalid'
	| 'mustflow.command_contract.inputs_invalid'
	| 'mustflow.command_contract.preconditions_invalid'
	| 'mustflow.command_contract.effects_invalid'
	| 'mustflow.command_contract.effect_path_escape'
	| 'mustflow.command_contract.shared_writes_without_effects'
	| 'mustflow.command_contract.broad_env_inheritance'
	| 'mustflow.command_contract.project_local_bin_bare_executable'
	| 'mustflow.prompt_cache.required'
	| 'mustflow.prompt_cache.volatile_in_stable'
	| 'mustflow.prompt_cache.stable_file_missing'
	| 'mustflow.prompt_cache.stable_prefix_over_budget'
	| 'mustflow.refresh.hash_method_required'
	| 'mustflow.release.template_version_mismatch'
	| 'mustflow.release.template_version_ahead'
	| 'mustflow.release.template_version_intentionally_unchanged'
	| 'mustflow.preferences.release_versioning_contract_authority'
	| 'mustflow.preferences.verification_selection_command_authority'
	| 'mustflow.contract_model.deferred_policy'
	| 'mustflow.contract_model.command_authority_field'
	| 'mustflow.contract_model.invalid_match_kind'
	| 'mustflow.contract_model.invalid_shape'
	| 'mustflow.test_selection.command_authority_field'
	| 'mustflow.test_selection.invalid_shape'
	| 'mustflow.test_selection.unknown_command_intent'
	| 'mustflow.skill.procedure_only'
	| 'mustflow.skill.raw_command_block'
	| 'mustflow.skill.command_permission_claim'
	| 'mustflow.skill.unknown_command_intent'
	| 'mustflow.skill.index_route_unknown_command_intent'
	| 'mustflow.skill.index_route_broad_catch_all'
	| 'mustflow.skill.index_route_identical_trigger'
	| 'mustflow.skill.index_route_duplicate_surface'
	| 'mustflow.skill.route_metadata_missing'
	| 'mustflow.skill.route_metadata_unlisted'
	| 'mustflow.skill.route_metadata_missing_document'
	| 'mustflow.skill.route_metadata_category_mismatch'
	| 'mustflow.skill.route_metadata_unknown_reference'
	| 'mustflow.skill.route_metadata_asymmetric_exclusion'
	| 'mustflow.skill.route_fixture_invalid'
	| 'mustflow.skill.route_fixture_mismatch'
	| 'mustflow.skill.template_profile_empty_category'
	| 'mustflow.skill.template_profile_dead_route'
	| 'mustflow.skill.template_profile_missing_main_route'
	| 'mustflow.skill.template_profile_command_intent_drift'
	| 'mustflow.skill.template_profile_metadata_mismatch'
	| 'mustflow.skill.resource_unknown_command_intent'
	| 'mustflow.source_anchor.invalid_format'
	| 'mustflow.source_anchor.duplicate_id'
	| 'mustflow.source_anchor.forbidden_instruction'
	| 'mustflow.source_anchor.secret_like'
	| 'mustflow.source_anchor.generated_or_vendor_path'
	| 'mustflow.source_anchor.unknown_risk'
	| 'mustflow.source_anchor.long_purpose'
	| 'mustflow.source_anchor.too_many_search_terms'
	| 'mustflow.source_anchor.high_density'
	| 'mustflow.source_anchor.high_risk_review'
	| 'mustflow.run_receipt.invalid_json'
	| 'mustflow.run_receipt.invalid_shape'
	| 'mustflow.retention.run_receipt_size_limit'
	| 'mustflow.retention.raw_jsonl_under_mustflow'
	| 'mustflow.local_state.versioned_task_worklog';

export interface CheckIssueDetail {
	readonly id: CheckIssueId | null;
	readonly severity: 'error' | 'warning';
	readonly mode: 'base' | 'strict';
	readonly message: string;
}

export interface CheckIssueInput {
	readonly id?: CheckIssueId | null;
	readonly severity?: 'error' | 'warning';
	readonly message: string;
}

const CHECK_ISSUE_ID_RULES: readonly [CheckIssueId, RegExp][] = [
	['mustflow.command_contract.intent_table_missing', /^Missing \[intents\] table in \.mustflow\/config\/commands\.toml$/u],
	['mustflow.command_contract.intent_not_table', /^Intent [^\s]+ must be a TOML table$/u],
	['mustflow.command_contract.configured_missing_lifecycle', /^Configured intent [^\s]+ must define lifecycle$/u],
	['mustflow.command_contract.configured_missing_run_policy', /^Configured intent [^\s]+ must define run_policy$/u],
	['mustflow.command_contract.oneshot_missing_timeout', /^Oneshot intent [^\s]+ must define timeout_seconds$/u],
	['mustflow.command_contract.max_output_bytes_exceeds_limit', /^\[commands\.(?:defaults|intents\.[^\]]+)\]\.max_output_bytes must be less than or equal to \d+ per output stream$/u],
	['mustflow.command_contract.oneshot_stdin_not_closed', /^Oneshot intent [^\s]+ must set stdin = "closed"$/u],
	['mustflow.command_contract.long_running_agent_allowed', /^Long-running intent [^\s]+ must not use run_policy = "agent_allowed"$/u],
	['mustflow.command_contract.agent_shell_requires_allow', /^Agent-runnable shell intent [^\s]+ must set allow_shell = true$/u],
	['mustflow.command_contract.executable_source_missing', /^Configured intent [^\s]+ must define argv or mode = "shell" with cmd$/u],
	['mustflow.command_contract.shell_background_pattern', /^Shell intent [^\s]+ contains a blocked long-running or background pattern$/u],
	['mustflow.command_contract.long_running_command_pattern', /^Intent [^\s]+ contains a blocked long-running or background command pattern$/u],
	[
		'mustflow.command_contract.success_exit_codes_invalid',
		/^\[commands\.intents\.[^\]]+\]\.success_exit_codes must be a non-empty integer array with values from 0 through 255$/u,
	],
	[
		'mustflow.command_contract.inputs_invalid',
		/^(?:Configured intent [^\s]+ must not declare inputs|\[commands\.intents\..+\.inputs(?:\.|\])|Command input [^\s]+ name must|Command argv token "[^"]+" (?:references undeclared input|must use a whole-token typed input placeholder))/u,
	],
	[
		'mustflow.command_contract.preconditions_invalid',
		/^\[commands\.intents\..+\.preconditions(?:\.|\]|\s)/u,
	],
	['mustflow.command_contract.effects_invalid', /^(?:Strict: )?(?:\[commands\.(?:resources|intents\.[^\]]+\.effects)[^\]]*\]|Command effect for intent [^\s]+ must define path, paths, or lock)/u],
	['mustflow.command_contract.effect_path_escape', /^Strict: Command effect path must stay inside the current root:/u],
	['mustflow.command_contract.shared_writes_without_effects', /^Strict warning: configured agent-runnable intents .+ share path:.+ through writes without explicit effects or resource locks$/u],
	['mustflow.command_contract.broad_env_inheritance', /^Strict(?: warning)?: configured agent-runnable intent [^\s]+ (?:implicitly inherits the host environment|uses env_policy = "inherit")/u],
	['mustflow.command_contract.project_local_bin_bare_executable', /^Strict warning: configured agent-runnable intent [^\s]+ uses bare executable "[^"]+" that matches project-local node_modules\/\.bin/u],
	['mustflow.prompt_cache.required', /^Strict: \[prompt_cache\] table is required$/u],
	['mustflow.prompt_cache.volatile_in_stable', /^Strict: \[prompt_cache\.layers\.stable\]\.read must not include volatile path /u],
	['mustflow.prompt_cache.stable_file_missing', /^Strict: stable prefix document is missing: /u],
	['mustflow.prompt_cache.stable_prefix_over_budget', /^Strict: stable prefix exceeds \[prompt_cache\]\.max_stable_prefix_kb: \d+ rendered bytes > \d+ budget bytes$/u],
	['mustflow.refresh.hash_method_required', /^Strict: \[refresh\]\.default_method should be "hash_check" for cache-friendly refresh$/u],
	['mustflow.release.template_version_mismatch', /^Strict: templates\/default\/manifest\.toml version "[^"]+" must match package\.json version "[^"]+" when \[release\.versioning\]\.sync_template_version is true$/u],
	['mustflow.release.template_version_ahead', /^Strict: templates\/default\/manifest\.toml version "[^"]+" must not be ahead of package\.json version "[^"]+"$/u],
	['mustflow.release.template_version_intentionally_unchanged', /^Strict warning: templates\/default\/manifest\.toml version "[^"]+" is older than package\.json version "[^"]+"; this is allowed only when the installed template surface is unchanged$/u],
	['mustflow.preferences.release_versioning_contract_authority', /^Strict: \[preferences\.release\.versioning\]\.[a-z_]+ cannot define version sources or release authority; use \.mustflow\/config\/versioning\.toml or \.mustflow\/config\/commands\.toml$/u],
	['mustflow.preferences.verification_selection_command_authority', /^Strict: \[preferences\.verification\.selection\]\.[a-z_]+ cannot define command authority; use \.mustflow\/config\/commands\.toml$/u],
	['mustflow.contract_model.deferred_policy', /^Strict: \.mustflow\/config\/policy\.toml is deferred; use narrow candidate contract files instead$/u],
	['mustflow.contract_model.command_authority_field', /^Strict: \.mustflow\/config\/(?:changes|surfaces)\.toml .+ cannot define command authority; use \.mustflow\/config\/commands\.toml$/u],
	['mustflow.contract_model.invalid_match_kind', /^Strict: \.mustflow\/config\/(?:changes|surfaces)\.toml rules\[\d+\]\.match\.kind must be "exact", "prefix", or "glob"; regular expressions are deferred$/u],
	['mustflow.contract_model.invalid_shape', /^Strict: \.mustflow\/config\/(?:changes|surfaces)\.toml .+(?:must be|must define|is not allowed)/u],
	['mustflow.test_selection.command_authority_field', /^Strict: \.mustflow\/config\/test-selection\.toml .+ cannot define command authority; use \.mustflow\/config\/commands\.toml$/u],
	['mustflow.test_selection.unknown_command_intent', /^Strict: \.mustflow\/config\/test-selection\.toml .+ references unknown command intent "[^"]+"$/u],
	['mustflow.test_selection.invalid_shape', /^Strict: \.mustflow\/config\/test-selection\.toml .+(?:must be|must define|is not allowed|references command intent "[^"]+" that is not configured)/u],
	['mustflow.skill.procedure_only', /^Strict: \.mustflow\/skills\/[^/]+\/SKILL\.md metadata\.mustflow_kind must be "procedure"$/u],
	['mustflow.skill.raw_command_block', /^Strict: \.mustflow\/skills\/[^/]+\/SKILL\.md contains a raw shell command block; reference command intents instead$/u],
	['mustflow.skill.command_permission_claim', /^Strict: \.mustflow\/skills\/[^/]+\/SKILL\.md claims command execution permission; keep permissions in \.mustflow\/config\/commands\.toml$/u],
	['mustflow.skill.unknown_command_intent', /^Strict: \.mustflow\/skills\/[^/]+\/SKILL\.md metadata\.command_intents references unknown command intent "[^"]+"$/u],
	['mustflow.skill.index_route_unknown_command_intent', /^Strict: \.mustflow\/skills\/INDEX\.md route \.mustflow\/skills\/[^/]+\/SKILL\.md references command intent "[^"]+" not declared by the skill frontmatter$/u],
	['mustflow.skill.index_route_broad_catch_all', /^Strict warning: \.mustflow\/skills\/INDEX\.md \.mustflow\/skills\/[^/]+\/SKILL\.md route uses broad catch-all trigger ".+" that can shadow narrower skills$/u],
	['mustflow.skill.index_route_identical_trigger', /^Strict warning: \.mustflow\/skills\/INDEX\.md \.mustflow\/skills\/[^/]+\/SKILL\.md and \.mustflow\/skills\/[^/]+\/SKILL\.md have identical skill route trigger text$/u],
	['mustflow.skill.index_route_duplicate_surface', /^Strict warning: \.mustflow\/skills\/INDEX\.md \.mustflow\/skills\/[^/]+\/SKILL\.md and \.mustflow\/skills\/[^/]+\/SKILL\.md have duplicate edit scope, risk, and expected output route surface$/u],
	['mustflow.skill.route_metadata_missing', /^Strict: \.mustflow\/skills\/routes\.toml is missing metadata for route "[^"]+"$/u],
	['mustflow.skill.route_metadata_unlisted', /^Strict: \.mustflow\/skills\/routes\.toml route "[^"]+" is not listed in \.mustflow\/skills\/INDEX\.md$/u],
	['mustflow.skill.route_metadata_missing_document', /^Strict: \.mustflow\/skills\/routes\.toml route "[^"]+" points to a missing skill document$/u],
	['mustflow.skill.route_metadata_category_mismatch', /^Strict: \.mustflow\/skills\/INDEX\.md route "[^"]+" must appear under the .+ category section from \.mustflow\/skills\/routes\.toml$/u],
	['mustflow.skill.route_metadata_unknown_reference', /^Strict: \.mustflow\/skills\/routes\.toml route "[^"]+" references unknown mutually exclusive route "[^"]+"$/u],
	['mustflow.skill.route_metadata_asymmetric_exclusion', /^Strict warning: \.mustflow\/skills\/routes\.toml route "[^"]+" lists "[^"]+" as mutually exclusive but the reverse route does not$/u],
	['mustflow.skill.route_fixture_invalid', /^Strict: \.mustflow\/skills\/route-fixtures\.json (?:must|is not valid JSON|cases\[\d+\])/u],
	['mustflow.skill.route_fixture_mismatch', /^Strict: Skill route fixture "[^"]+" (?:expected|forbids)/u],
	['mustflow.skill.template_profile_empty_category', /^Strict: template profile "[^"]+" (?:skill index category ".+" has no route rows|route category gate references ".+" without route rows)$/u],
	['mustflow.skill.template_profile_dead_route', /^Strict: template profile "[^"]+" (?:\.mustflow\/skills\/INDEX\.md route "[^"]+" points to a skill not installed by that profile|\.mustflow\/skills\/routes\.toml route "[^"]+" points to a skill not installed by that profile|skill "[^"]+" is installed but not listed in \.mustflow\/skills\/INDEX\.md)$/u],
	['mustflow.skill.template_profile_missing_main_route', /^Strict: template profile "[^"]+" skill category ".+" must include at least one primary or authoring route$/u],
	['mustflow.skill.template_profile_command_intent_drift', /^Strict: template profile "[^"]+" \.mustflow\/skills\/INDEX\.md route "[^"]+" references (?:unknown command intent "[^"]+"|command intent "[^"]+" not declared by the skill frontmatter)$/u],
	['mustflow.skill.template_profile_metadata_mismatch', /^Strict: template profile "[^"]+" (?:\.mustflow\/skills\/routes\.toml is missing metadata for route "[^"]+"|\.mustflow\/skills\/routes\.toml route "[^"]+" is not listed in \.mustflow\/skills\/INDEX\.md|\.mustflow\/skills\/INDEX\.md route "[^"]+" must appear under the .+ category section from \.mustflow\/skills\/routes\.toml)$/u],
	['mustflow.skill.resource_unknown_command_intent', /^Strict: \.mustflow\/skills\/[^/]+\/resources\.toml script [^\s]+ references unknown command intent "[^"]+"$/u],
	['mustflow.source_anchor.invalid_format', /^Strict: source anchor .+ has invalid format:/u],
	['mustflow.source_anchor.duplicate_id', /^Strict: source anchor id "[^"]+" is duplicated:/u],
	['mustflow.source_anchor.forbidden_instruction', /^Strict: source anchor [^ ]+ in .+ contains agent command or policy instructions/u],
	['mustflow.source_anchor.secret_like', /^Strict: source anchor [^ ]+ in .+ contains secret-like text/u],
	['mustflow.source_anchor.generated_or_vendor_path', /^Strict: source anchor [^ ]+ is in generated or vendor path /u],
	['mustflow.source_anchor.unknown_risk', /^Strict: source anchor [^ ]+ in .+ uses unknown risk tag "[^"]+"$/u],
	['mustflow.source_anchor.long_purpose', /^Strict warning: source anchor [^ ]+ in .+ purpose is long/u],
	['mustflow.source_anchor.too_many_search_terms', /^Strict warning: source anchor [^ ]+ in .+ has too many search terms/u],
	['mustflow.source_anchor.high_density', /^Strict warning: .+ has high source anchor density/u],
	['mustflow.source_anchor.high_risk_review', /^Strict warning: source anchor [^ ]+ in .+ uses high-risk tags and needs review:/u],
	['mustflow.run_receipt.invalid_json', /^Strict: \.mustflow\/state\/runs\/latest\.json is not valid JSON:/u],
	['mustflow.run_receipt.invalid_shape', /^Strict: \.mustflow\/state\/runs\/latest\.json must contain a JSON object$/u],
	['mustflow.retention.run_receipt_size_limit', /^Strict: \.mustflow\/state\/runs\/latest\.json exceeds \[retention\.run_receipts\]\.max_file_kb/u],
	['mustflow.retention.raw_jsonl_under_mustflow', /^Strict: \.mustflow\/.*\.jsonl is a raw JSONL file under \.mustflow$/u],
	['mustflow.local_state.versioned_task_worklog', /^Strict: \.mustflow\/(?:worklogs|plans|tasks|work-items)\/.+ is per-task local state; keep plans and worklogs under ignored local state$/u],
];

/**
 * mf:anchor core.check-issues
 * purpose: Map check messages to stable machine-readable issue ids and severity metadata.
 * search: check issue ids, issueDetails, strict warnings
 * invariant: JSON issue ids stay stable while check implementations move between CLI and core modules.
 * risk: config
 */
export function getCheckIssueId(message: string): CheckIssueId | null {
	for (const [id, pattern] of CHECK_ISSUE_ID_RULES) {
		if (pattern.test(message)) {
			return id;
		}
	}

	return null;
}

export function describeCheckIssues(issues: readonly (string | CheckIssueInput)[]): CheckIssueDetail[] {
	return issues.map((issue) => {
		const message = typeof issue === 'string' ? issue : issue.message;
		const severity = message.startsWith('Strict warning: ') ? 'warning' : 'error';

		return {
			id: typeof issue === 'string' ? getCheckIssueId(message) : issue.id ?? getCheckIssueId(message),
			severity: typeof issue === 'string' ? severity : issue.severity ?? severity,
			mode: message.startsWith('Strict') ? 'strict' : 'base',
			message,
		};
	});
}
