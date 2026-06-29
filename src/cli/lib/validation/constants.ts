import { COMMIT_MESSAGE_STYLES, TEST_AUTHORING_POLICIES } from '../preferences-options.js';
import {
	VERSION_SOURCE_AUTHORITIES,
	VERSION_SOURCE_KINDS,
} from '../../../core/version-sources.js';
import { SKILL_ROUTE_CATEGORY_LABELS } from '../../../core/skill-route-alignment.js';

export { SKILL_ROUTE_CATEGORY_LABELS };

export const REQUIRED_SKILL_SECTION_IDS = [
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
export const SKILL_SECTION_MARKER_PATTERN = /^<!--\s*mustflow-section:\s*([a-z][a-z0-9-]*)\s*-->\s*\r?\n##\s+.+$/gimu;
export const TEST_SELECTION_CONFIG_PATH = '.mustflow/config/test-selection.toml';

export const REQUIRED_FILES = [
	'AGENTS.md',
	'.mustflow/config/mustflow.toml',
	'.mustflow/config/commands.toml',
	'.mustflow/skills/router.toml',
	'.mustflow/skills/routes.toml',
	'.mustflow/skills/INDEX.md',
];
export const ALLOWED_MAP_MODES = new Set(['anchors_only']);
export const ALLOWED_MAP_PRIVACY_LEVELS = new Set(['minimal']);
export const ALLOWED_CONTEXT_READ_POLICIES = new Set(['task_relevant_only']);
export const ALLOWED_CONTEXT_AUTHORITIES = new Set(['contextual']);
export const ALLOWED_CONTEXT_DOCUMENT_AUTHORITIES = new Set(['contextual', 'derived', 'external', 'router']);
export const CAPABILITY_STATE_FIELDS = ['repo_map', 'preferences', 'context', 'local_index', 'work_items', 'services'] as const;
export const CAPABILITY_BOOLEAN_FIELDS = ['workflow', 'command_contract', 'skills'] as const;
export const ALLOWED_CAPABILITY_STATES = new Set(['disabled', 'optional', 'required', 'generated_optional']);
export const REQUIRED_AGENT_LOOP_PHASES = ['orient', 'plan', 'act', 'verify', 'report', 'handoff'] as const;
export const ALLOWED_HANDOFF_MODES = new Set(['report_only', 'work_item_optional']);
export const ALLOWED_PROJECT_PROFILES = new Set(['minimal', 'patterns', 'oss', 'team', 'product', 'library']);
export const RELEASE_VERSIONING_BOOLEAN_FIELDS = [
	'impact_check',
	'suggest_bump',
	'auto_bump',
	'require_user_confirmation',
	'sync_template_version',
	'sync_docs_examples',
	'sync_tests',
] as const;
export const FORBIDDEN_RELEASE_VERSIONING_CONTRACT_FIELDS = [
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
export const ALLOWED_VERSION_SOURCE_KINDS = new Set(VERSION_SOURCE_KINDS);
export const ALLOWED_VERSION_SOURCE_AUTHORITIES = new Set(VERSION_SOURCE_AUTHORITIES);
export const ALLOWED_COMMIT_MESSAGE_STYLES = new Set(COMMIT_MESSAGE_STYLES);
export const VERIFICATION_SELECTION_BOOLEAN_FIELDS = [
	'prefer_related_tests',
	'skip_docs_only_full_test',
	'skip_low_risk_code_full_test',
	'skip_translation_only_full_test',
	'skip_copy_only_full_test',
	'report_skipped',
] as const;
export const FORBIDDEN_VERIFICATION_SELECTION_AUTHORITY_FIELDS = [
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
export const ALLOWED_VERIFICATION_SELECTION_STRATEGIES = new Set(['risk_based', 'targeted', 'full']);
export const ALLOWED_TEST_SELECTION_RISKS = new Set(['low', 'medium', 'high', 'release_sensitive', 'security_sensitive']);
export const FORBIDDEN_TEST_SELECTION_COMMAND_AUTHORITY_FIELDS = [
	'argv',
	'cmd',
	'command',
	'commands',
	'command_intents',
	'destructive',
	'intents',
	'lifecycle',
	'network',
	'required_after',
	'run_policy',
	'status',
	'writes',
] as const;
export const TEST_AUTHORING_BOOLEAN_FIELDS = ['prefer_existing_tests', 'require_new_test_rationale'] as const;
export const ALLOWED_TEST_AUTHORING_POLICIES = new Set(TEST_AUTHORING_POLICIES);
export const ALLOWED_TESTING_POLICIES = new Set(['behavior_contract']);
export const ALLOWED_TEST_DELETION_REASONS = new Set([
	'behavior_removed',
	'public_contract_changed',
	'duplicate_coverage',
	'implementation_detail_removed',
	'obsolete_snapshot',
]);
export const FORBIDDEN_TEST_DELETION_REASONS = new Set([
	'only_to_make_tests_pass',
	'without_behavior_rationale',
	'without_reporting',
	'without_running_relevant_validation',
]);
export const ALLOWED_STALE_TEST_ACTIONS = new Set(['update_remove_or_report']);
export const ALLOWED_HARNESS_MODES = new Set(['single_session', 'long_running_optional']);
export const ALLOWED_HARNESS_FRESH_CONTEXT_MODES = new Set(['hash_check_before_reread', 'reread']);
export const ALLOWED_HARNESS_PHASES = new Set(['plan', 'work', 'verify', 'judge', 'handoff']);
export const ALLOWED_PROMPT_CACHE_STRATEGIES = new Set(['stable_prefix']);
export const ALLOWED_PROMPT_CACHE_STABLE_PREFIX_POLICIES = new Set(['hash_verified']);
export const ALLOWED_PROMPT_CACHE_TASK_READ_POLICIES = new Set(['task_relevant_only']);
export const ALLOWED_BUDGET_LIMIT_ACTIONS = new Set(['stop_and_handoff', 'stop_and_report']);
export const ALLOWED_APPROVAL_GATES = new Set([
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
export const ALLOWED_APPROVAL_ACTIONS = new Set(['stop_and_request_approval']);
export const ALLOWED_ISOLATION_PREFERENCES = new Set(['none', 'git_worktree', 'sandbox']);
export const ALLOWED_REFRESH_MODES = new Set(['checkpoint']);
export const ALLOWED_REFRESH_METHODS = new Set(['hash_check', 'reread_if_changed']);
export const ALLOWED_REFRESH_STATE_STORES = new Set(['none', 'cache']);
export const ALLOWED_COMPACTION_STRATEGIES = new Set(['tiered']);
export const ALLOWED_COMPACTION_STATE_STORES = new Set(['none', 'cache']);
export const ALLOWED_COMPACTION_CATEGORIES = new Set([
	'decisions',
	'constraints',
	'open_questions',
	'files_discussed',
	'commands_discussed',
	'risks',
	'next_steps',
	'rejected_options',
]);
export const ALLOWED_COMPACTION_LONG_LIMIT_ACTIONS = new Set(['recompact_oldest', 'delete_oldest', 'archive_oldest']);
export const ALLOWED_COMPACTION_RAW_LIMIT_ACTIONS = new Set(['prune_after_compaction', 'report']);
export const ALLOWED_REFRESH_CHECKPOINTS = new Set([
	'session_start',
	'task_start',
	'before_first_edit',
	'before_command_run',
	'after_instruction_file_change',
	'root_change',
	'after_compaction',
	'before_final_report',
]);
export const ALLOWED_TRANSLATION_POLICIES = new Set([
	'source_only',
	'update_source_mark_targets_stale',
	'machine_translate_requires_review',
]);
export const RAW_COMMAND_FENCE_PATTERN = /```(?:sh|bash|shell|zsh|powershell|ps1|cmd)\s+[\s\S]*?```/iu;
export const SKILL_COMMAND_PERMISSION_CLAIM_PATTERNS = [
	/\b(?:this\s+skill|skill\s+documents?|skills?)\s+(?:authorizes?|grants?|allows?|permits?)\s+(?:agents?\s+)?(?:to\s+)?(?:run|execute)\b/iu,
	/\b(?:agents?\s+)?(?:may|can|are\s+allowed\s+to|is\s+allowed\s+to|is\s+permitted\s+to|have\s+permission\s+to)\s+(?:run|execute)\s+(?:raw\s+)?(?:shell\s+)?commands?\b/iu,
	/\bcommand\s+execution\s+(?:is\s+)?(?:authorized|allowed|permitted)\s+by\s+(?:this\s+)?skill\b/iu,
];
export const ROUTER_INDEX_PROCEDURE_SECTION_PATTERN =
	/^##\s+(?:Use When|Do Not Use When|Required Inputs|Preconditions|Allowed Edits|Procedure|Postconditions|Verification|Failure Handling|Output Format|사용 조건|사용하지 않는 경우|필요한 입력|사전 조건|허용 수정 범위|절차|사후 조건|검증|실패 대응|출력 형식)\s*$/imu;
export const ROUTER_INDEX_FILES = ['.mustflow/skills/INDEX.md', '.mustflow/context/INDEX.md'] as const;
export const SKILL_INDEX_PATH = '.mustflow/skills/INDEX.md';
export const SKILL_ROUTER_PATH = '.mustflow/skills/router.toml';
export const SKILL_ROUTES_METADATA_PATH = '.mustflow/skills/routes.toml';
export const SUPPORTED_SKILL_SCHEMA_VERSION = '1';
export const SKILL_PACK_ID_PATTERN = /^[a-z][a-z0-9-]*(?:\.[a-z][a-z0-9-]*)+$/u;
export const ALLOWED_SKILL_ROUTE_CATEGORIES = new Set(Object.keys(SKILL_ROUTE_CATEGORY_LABELS));
export const ALLOWED_SKILL_ROUTE_TYPES = new Set(['primary', 'adjunct', 'event', 'authoring']);
export const ALLOWED_SKILL_ROUTE_PROFILES = new Set(['minimal', 'patterns', 'oss', 'team', 'product', 'library']);
export const CONTEXT_AUTHORITY_DRIFT_PATTERNS = [
	/^##\s+(?:Command Policy|Command Permissions|Allowed Commands|Denied Commands|File Edit Policy|Protected Paths|Forbidden Files|Execution Rules|Mandatory Rules|Binding Rules|명령 정책|명령 권한|허용 명령|금지 명령|파일 편집 정책|보호 경로|금지 파일|실행 규칙|필수 규칙)\s*$/imu,
	/\b(?:must not|do not|never)\s+(?:edit|modify|write|delete)\s+(?:files?\s+)?(?:outside|under|inside|in)\b/iu,
] as const;
export const REPO_MAP_DOC_ID = 'repo-map';
export const REPO_MAP_LIFECYCLE = 'generated';
export const REPO_MAP_GENERATOR = 'mustflow';
export const REPO_MAP_RELATIVE_ROOT = '.';
export const REPO_MAP_SOURCE_POLICY = 'anchors_only';
export const REPO_MAP_PRIVACY_MODE = 'minimal';
export const REPO_MAP_SOURCE_FINGERPRINT_PATTERN = /^sha256:[a-f0-9]{64}$/u;
export const ALLOWED_REPO_MAP_DEGRADED_VALUES = new Set(['true', 'false']);
export const ALLOWED_REPO_MAP_GIT_LS_FILES_STATUSES = new Set(['ok', 'timeout', 'max_buffer', 'error']);
export const REPO_FLOW_DOC_ID = 'repo-flow';
export const REPO_FLOW_LIFECYCLE = 'generated';
export const REPO_FLOW_GENERATOR = 'mustflow';
export const REPO_FLOW_RELATIVE_ROOT = '.';
export const REPO_FLOW_SOURCE_POLICY = 'flow_contract';
export const REPO_FLOW_PRIVACY_MODE = 'minimal';
export const REPO_FLOW_SOURCE_FINGERPRINT_PATTERN = /^sha256:[a-f0-9]{64}$/u;
export const ALLOWED_REPO_FLOW_DEGRADED_VALUES = new Set(['true', 'false']);
export const SKILL_RESOURCE_MANIFEST = 'resources.toml';
export const SKILL_RESOURCE_ROOTS = new Set(['references', 'assets', 'scripts']);
export const ALLOWED_SKILL_RESOURCE_TYPES = new Set(['reference', 'asset', 'script']);
export const SKILL_RESOURCE_TYPE_BY_ROOT: Record<string, string> = {
	references: 'reference',
	assets: 'asset',
	scripts: 'script',
};
export const REQUIRED_SKILL_SCRIPT_RUN_POLICY = 'requires_command_contract';
export const VOLATILE_REPO_MAP_PATTERNS = [
	/\bGenerated\s+(?:at|on):/iu,
	/\bLast\s+updated:/iu,
	/\bUpdated\s+at:/iu,
	/\bgenerated_at\b/iu,
	/\btimestamp\b/iu,
	/\bfile\s+count\b/iu,
	/\bchanged\s+files\b/iu,
];
export const REPO_MAP_REMOTE_OR_BRANCH_PATTERNS = [
	/https?:\/\//iu,
	/\bgit@/iu,
	/^\s*(?:Remote|Branch):/imu,
];
export const VOLATILE_REPO_FLOW_PATTERNS = VOLATILE_REPO_MAP_PATTERNS;
export const REPO_FLOW_REMOTE_OR_BRANCH_PATTERNS = REPO_MAP_REMOTE_OR_BRANCH_PATTERNS;
export const LOCAL_ABSOLUTE_PATH_PATTERNS = [
	/\b[A-Za-z]:\\(?:Users|Documents and Settings)\\/iu,
	/(?:^|[\s"'(])\/(?:Users|home)\/[A-Za-z0-9._-]+\/[^\s)"']*/imu,
];
export const SECRET_LIKE_CONTEXT_PATTERNS = [
	/\b(?:api[_-]?key|api[_-]?token|access[_-]?token|auth[_-]?token|secret|password|passwd|private[_-]?key)\b\s*[:=]\s*["']?[A-Za-z0-9_./+=:-]{8,}/iu,
	/\b(?:sk-[A-Za-z0-9]{16,}|ghp_[A-Za-z0-9]{20,}|xox[baprs]-[A-Za-z0-9-]{20,}|AKIA[0-9A-Z]{16})\b/u,
];
export const DESIGN_TOKEN_DEFINITION_PATTERNS = [
	/^\s*(?:colors?|palette|spacing|radius|radii|typography|fonts?|shadows?|breakpoints?)\s*[:=]\s*(?:\{|\[|["']?#|\d)/imu,
	/^\s*(?:primary|secondary|accent|background|foreground|surface|brand|text|muted)\s*[:=]\s*["']?#(?:[0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})\b/imu,
	/^\s*--[a-z0-9-]+:\s*[^;]+;/imu,
	/^\s*(?:border[_-]?radius|font[_-]?(?:family|size)|line[_-]?height|space[-_]\d+)\s*[:=]\s*/imu,
];
export const LOCAL_TASK_STATE_ROOTS = new Set(['worklogs', 'plans', 'tasks', 'work-items']);
