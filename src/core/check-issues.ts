export type CheckIssueId =
	| 'mustflow.command_contract.intent_table_missing'
	| 'mustflow.command_contract.intent_not_table'
	| 'mustflow.command_contract.configured_missing_lifecycle'
	| 'mustflow.command_contract.configured_missing_run_policy'
	| 'mustflow.command_contract.oneshot_missing_timeout'
	| 'mustflow.command_contract.oneshot_stdin_not_closed'
	| 'mustflow.command_contract.long_running_agent_allowed'
	| 'mustflow.command_contract.executable_source_missing'
	| 'mustflow.command_contract.shell_background_pattern'
	| 'mustflow.command_contract.success_exit_codes_invalid'
	| 'mustflow.prompt_cache.required'
	| 'mustflow.prompt_cache.volatile_in_stable'
	| 'mustflow.refresh.hash_method_required'
	| 'mustflow.preferences.release_versioning_contract_authority'
	| 'mustflow.preferences.verification_selection_command_authority'
	| 'mustflow.skill.procedure_only'
	| 'mustflow.skill.raw_command_block'
	| 'mustflow.skill.command_permission_claim'
	| 'mustflow.skill.unknown_command_intent'
	| 'mustflow.skill.index_route_unknown_command_intent'
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

const CHECK_ISSUE_ID_RULES: readonly [CheckIssueId, RegExp][] = [
	['mustflow.command_contract.intent_table_missing', /^Missing \[intents\] table in \.mustflow\/config\/commands\.toml$/u],
	['mustflow.command_contract.intent_not_table', /^Intent [^\s]+ must be a TOML table$/u],
	['mustflow.command_contract.configured_missing_lifecycle', /^Configured intent [^\s]+ must define lifecycle$/u],
	['mustflow.command_contract.configured_missing_run_policy', /^Configured intent [^\s]+ must define run_policy$/u],
	['mustflow.command_contract.oneshot_missing_timeout', /^Oneshot intent [^\s]+ must define timeout_seconds$/u],
	['mustflow.command_contract.oneshot_stdin_not_closed', /^Oneshot intent [^\s]+ must set stdin = "closed"$/u],
	['mustflow.command_contract.long_running_agent_allowed', /^Long-running intent [^\s]+ must not use run_policy = "agent_allowed"$/u],
	['mustflow.command_contract.executable_source_missing', /^Configured intent [^\s]+ must define argv or mode = "shell" with cmd$/u],
	['mustflow.command_contract.shell_background_pattern', /^Shell intent [^\s]+ contains a blocked long-running or background pattern$/u],
	['mustflow.command_contract.success_exit_codes_invalid', /^\[commands\.intents\.[^\]]+\]\.success_exit_codes must be an integer array$/u],
	['mustflow.prompt_cache.required', /^Strict: \[prompt_cache\] table is required$/u],
	['mustflow.prompt_cache.volatile_in_stable', /^Strict: \[prompt_cache\.layers\.stable\]\.read must not include volatile path /u],
	['mustflow.refresh.hash_method_required', /^Strict: \[refresh\]\.default_method should be "hash_check" for cache-friendly refresh$/u],
	['mustflow.preferences.release_versioning_contract_authority', /^Strict: \[preferences\.release\.versioning\]\.[a-z_]+ cannot define version sources or release authority; use \.mustflow\/config\/versioning\.toml or \.mustflow\/config\/commands\.toml$/u],
	['mustflow.preferences.verification_selection_command_authority', /^Strict: \[preferences\.verification\.selection\]\.[a-z_]+ cannot define command authority; use \.mustflow\/config\/commands\.toml$/u],
	['mustflow.skill.procedure_only', /^Strict: \.mustflow\/skills\/[^/]+\/SKILL\.md metadata\.mustflow_kind must be "procedure"$/u],
	['mustflow.skill.raw_command_block', /^Strict: \.mustflow\/skills\/[^/]+\/SKILL\.md contains a raw shell command block; reference command intents instead$/u],
	['mustflow.skill.command_permission_claim', /^Strict: \.mustflow\/skills\/[^/]+\/SKILL\.md claims command execution permission; keep permissions in \.mustflow\/config\/commands\.toml$/u],
	['mustflow.skill.unknown_command_intent', /^Strict: \.mustflow\/skills\/[^/]+\/SKILL\.md metadata\.command_intents references unknown command intent "[^"]+"$/u],
	['mustflow.skill.index_route_unknown_command_intent', /^Strict: \.mustflow\/skills\/INDEX\.md route \.mustflow\/skills\/[^/]+\/SKILL\.md references command intent "[^"]+" not declared by the skill frontmatter$/u],
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

export function describeCheckIssues(messages: readonly string[]): CheckIssueDetail[] {
	return messages.map((message) => ({
		id: getCheckIssueId(message),
		severity: message.startsWith('Strict warning: ') ? 'warning' : 'error',
		mode: message.startsWith('Strict') ? 'strict' : 'base',
		message,
	}));
}
