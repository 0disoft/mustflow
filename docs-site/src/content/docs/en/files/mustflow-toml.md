---
title: .mustflow/config/mustflow.toml
description: Declares the agent reading order and protected paths.
---

`.mustflow/config/mustflow.toml` declares which files agents should read first and which paths require extra care.

`mf check` does more than parse this file. It also verifies that `[map]` and `[workspace]` values can be interpreted safely.

## Where It Is Used

- Turns the reading order from `AGENTS.md` into machine-checkable configuration.
- Helps agents distinguish mustflow-owned documents from user project documents.
- Declares protected and extra-care paths to reduce accidental edits.
- Defines which items should appear in the final work report.

## Sections

- `authority`: Authoritative mustflow documents.
- `read_order`: Initial reading order for agents.
- `optional_read_order`: Files to read when present and skip when missing.
- `authority.workflow_preferences`: Path to repository-level default preferences.
- `map`: How `REPO_MAP.md` should be generated and which anchor files can be included.
- `workspace`: Limits for discovering independent nested repositories under workspace roots.
- `context`: Project context layer used only when the task needs it.
- `capabilities`: Agent work surface provided by this repository.
- `agent_loop`: Standard loop agents should follow for each task.
- `harness`: Repository-local contract boundary for agent harnesses.
- `refresh`: Checkpoints for rereading mustflow instructions during long sessions.
- `compaction`: Policy for separating derived recent context, mid summaries, and long summaries without storing raw transcripts by default.
- `verification`: Where validation commands come from and which inference is forbidden.
- `testing`: Policy for keeping tests aligned with the current behavior contract.
- `handoff`: How unfinished work should be handed off safely.
- `budget`: Limits for long-running or repeated agent activity.
- `approval`: Actions that require human approval before proceeding.
- `isolation`: Preferred worktree or sandbox boundary for long-running tasks.
- `retention`: Size limits that keep run receipts, repository maps, and future knowledge files bounded.
- `document_roots`: Paths that belong to the mustflow document flow.
- `document_roots.generated`: Generated documents and local state paths.
- `edit_policy.protected`: Paths agents should not edit by default.
- `edit_policy.extra_care`: Paths that require extra caution before editing.
- `reporting`: Items to include in the final work report.

## Reading Order Fields

```toml
read_order = [
  "AGENTS.md",
  ".mustflow/docs/agent-workflow.md",
  ".mustflow/config/mustflow.toml",
  ".mustflow/config/commands.toml",
  ".mustflow/config/preferences.toml",
  ".mustflow/skills/INDEX.md",
]
optional_read_order = [
  ".mustflow/context/INDEX.md",
  "REPO_MAP.md",
]
```

`read_order` is the required document flow. `optional_read_order` lists documents to read when present and skip when missing.

This file reduces agent guesswork and helps prevent accidental edits to generated files or secrets.

`REPO_MAP.md` belongs to `optional_read_order` and `document_roots.generated`. Agents should read it only when broad repository navigation is needed, treat it as an anchor-file map rather than a complete file list, and regenerate it when needed.

`.mustflow/context/INDEX.md` belongs to `optional_read_order` because agents should read it only when project, product, domain, UI, backend, data, security, or operations context is relevant to the task.

`.mustflow/cache/**` and `.mustflow/state/**` are generated paths. The cache contains rebuildable supporting files such as the SQLite index written by `mf index`; state contains local state created during use, such as `mf run` receipts. Neither path is part of the first required reading order.

## Map Fields

```toml
[map]
output = "REPO_MAP.md"
mode = "anchors_only"
privacy = "minimal"
include_nested = false
anchor_files = [
  "AGENTS.md",
  "REPO_MAP.md",
  ".mustflow/config/mustflow.toml",
  ".mustflow/config/commands.toml",
  ".mustflow/config/preferences.toml",
  ".mustflow/context/INDEX.md",
  ".mustflow/context/PROJECT.md",
  ".mustflow/skills/INDEX.md",
  "README.md",
  "DESIGN.md",
  "package.json",
  "pyproject.toml",
  "go.mod",
  "Cargo.toml",
  "deno.json",
  "justfile",
  "Justfile",
  "Makefile",
  "Taskfile.yml",
]
```

`map.output` is the generated file name. The default is `REPO_MAP.md`.

`map.mode = "anchors_only"` means the map includes navigation anchors instead of every source file.

`map.privacy = "minimal"` means the generated output omits remote URLs, branch names, recent change state, command lists, and automatic summaries by default.

`map.include_nested = false` means nested independent repositories are not indexed by default. Workspace support must be enabled explicitly with the workspace fields.

`mf check` verifies that `output` and `anchor_files` are relative paths inside the current root. It currently allows only `anchors_only` for `mode` and `minimal` for `privacy`.

`preferences.toml` is included as a default anchor so agents can quickly find repository-level defaults for response language, documentation, commit messages, logs, and formatting.

`DESIGN.md` is an optional external anchor. mustflow does not create it, but when it exists, `mf map` can surface it for UI, visual design, design-token, layout, or accessibility work.

## Context Fields

```toml
[context]
enabled = true
root = ".mustflow/context"
index = ".mustflow/context/INDEX.md"
default_files = [
  ".mustflow/context/PROJECT.md",
]
read_policy = "task_relevant_only"
authority = "contextual"
external_anchors = [
  "README.md",
  "DESIGN.md",
]
```

`context.enabled = true` means the project can carry agent-facing context under `.mustflow/context/`.

`context.index` points to the router that tells agents which context files to read for the task.
`context.default_files` lists context files installed by the default template.

`read_policy = "task_relevant_only"` means agents should not read every context file by default.
`authority = "contextual"` means context files guide orientation, but they stay lower authority than direct user instructions, current code, tests, command contracts, and configured policies.

`external_anchors` lists root files that may provide context without becoming mustflow-owned files.
`README.md` is a human-facing overview. `DESIGN.md` is an optional visual-design anchor when the project already has one.

## Workspace Fields

```toml
[workspace]
enabled = false
roots = []
max_depth = 4
max_repositories = 50
follow_symlinks = false
stop_at_repository_root = true
```

`workspace.enabled = false` treats the current root as a normal mustflow root.

For a workspace root, set paths such as `roots = ["projects", "repos"]`. mustflow should not automatically scan unconfigured `projects/` or `repos/` directories.

`max_depth` and `max_repositories` prevent accidental large scans. `follow_symlinks = false` prevents traversal outside the workspace or into another drive by default.

`stop_at_repository_root = true` means that once an independent nested repository is discovered, the parent map should not continue recursively through its internals. The parent `REPO_MAP.md` should show only entrypoints into nested repositories, not describe those repositories.

`mf check` verifies that `roots` are relative paths inside the current root, that `max_depth` and `max_repositories` are positive integers, and that workspace switches are booleans.

## Agent Control Surface Fields

```toml
[capabilities]
workflow = true
command_contract = true
skills = true
repo_map = "generated_optional"
preferences = "optional"
context = "optional"
local_index = "generated_optional"
work_items = "disabled"
services = "disabled"
adapters = []

[agent_loop]
phases = [
  "orient",
  "plan",
  "act",
  "verify",
  "report",
  "handoff",
]

[verification]
command_source = ".mustflow/config/commands.toml"
require_configured_intents = true
allow_inferred_commands = false
require_command_lifecycle = true
require_timeout_for_oneshot = true

[handoff]
enabled = false
mode = "report_only"
```

`capabilities` declares which agent work surfaces are available in this repository. `workflow`, `command_contract`, and `skills` are core features. `repo_map`, `preferences`, `local_index`, `work_items`, and `services` are state-based extension points. The default template provides the local index as optional generated data, but `mf init` does not create the index file. Local work items and service management are not installed yet.

`agent_loop.phases` is the standard agent work loop: `orient`, `plan`, `act`, `verify`, `report`, and `handoff`. It is a machine-checkable contract, not decorative prose.

`verification` states that validation commands come from `.mustflow/config/commands.toml`. `allow_inferred_commands = false` means agents must not infer validation commands from `package.json`, `Makefile`, or naming conventions.

`handoff.enabled = false` means the default template does not create local work item files. Work that cannot be finished safely should be handed off in the final report. Optional work item support can be enabled later as a separate feature.

`mf check` validates booleans, allowed capability states, the standard loop, and the validation command path.

## Harness Fields

```toml
[harness]
mode = "single_session"
fresh_context_preferred = true

[harness.phases]
enabled = [
  "plan",
  "work",
  "verify",
  "judge",
  "handoff",
]
```

`harness` states that mustflow provides repository-local contracts rather than a full autonomous
runtime. `mode = "single_session"` is the conservative default. A future optional harness can read
the same contract with `long_running_optional`.

`harness.phases.enabled` defines the phases a long-running harness should separate. These are phases,
not default folders or default subagents.

## Refresh Fields

```toml
[refresh]
enabled = true
mode = "checkpoint"
required_at = [
  "session_start",
  "task_start",
  "before_first_edit",
  "before_command_run",
  "after_instruction_file_change",
  "root_change",
  "after_compaction",
  "before_final_report",
]
turn_threshold = 8
tool_call_threshold = 20
output_bytes_threshold = 131072
state_store = "cache"

[refresh.levels.light]
read = [
  "AGENTS.md",
  ".mustflow/docs/agent-workflow.md",
]

[refresh.levels.command]
read = [
  "AGENTS.md",
  ".mustflow/config/commands.toml",
]

[refresh.levels.skill]
read = [
  "AGENTS.md",
  ".mustflow/skills/INDEX.md",
]

[refresh.levels.full]
read = [
  "AGENTS.md",
  ".mustflow/docs/agent-workflow.md",
  ".mustflow/config/mustflow.toml",
  ".mustflow/config/commands.toml",
  ".mustflow/config/preferences.toml",
  ".mustflow/skills/INDEX.md",
]
```

`refresh` declares when an agent should reread mustflow instructions because the session has become long, the root changed, command execution is about to happen, or instruction files changed.

`before_command_run` means the current task and command intent must have a fresh command-level refresh. It does not require rereading every file before every repeated command when the command contract has not changed and thresholds remain current.

`state_store = "cache"` means turn counts and session activity do not belong in project files. A host application may track them in local cache, but mustflow documents should remain stable and commit-safe.

`refresh.levels` maps each refresh level to the files that should be reread. The default levels are `light`, `command`, `skill`, and `full`.

`mf check` validates the refresh mode, checkpoint names, thresholds, state store, and refresh file paths.

## Context Compaction Fields

```toml
[compaction]
enabled = false
strategy = "tiered"
state_store = "cache"

[compaction.recent]
keep_turns = 20
max_total_bytes = 200000
store_raw = false

[compaction.mid]
trigger_turns = 20
target_items = 10
target_max_words_per_item = 40
include_categories = [
  "decisions",
  "constraints",
  "open_questions",
  "files_discussed",
  "commands_discussed",
  "risks",
  "next_steps",
  "rejected_options",
]

[compaction.long]
promote_after_mid_items = 50
target_items = 10
max_items = 100
on_limit = "recompact_oldest"


[compaction.rules]
require_source_refs = true
summaries_are_derived = true
current_files_override_summaries = true
never_store_secrets = true
scrub_absolute_user_paths = true
do_not_store_hidden_chain_of_thought = true
```

`compaction` declares how a long session may separate context into derived recent context, mid-level
summaries, and long-term summaries. It is disabled by default, uses `store_raw = false`, and does not
mean mustflow collects full chat transcripts or raw command logs.

`state_store = "cache"` means compaction state should live in local cache or host-managed state, not
versioned project documents. Shared project knowledge should be promoted only as source-linked
decisions, investigations, or handoff summaries.

`compaction.rules` keeps summaries lower authority than current user instructions, current code and
config, command contracts, and run receipts.

The language for compaction summaries and handoff summaries is not controlled here. It belongs in
`.mustflow/config/preferences.toml` under `[language.memory]`.

## Test Relevance Fields

```toml
[testing]
policy = "behavior_contract"
prefer_update_existing_tests = true
require_existing_test_search = true
require_test_change_report = true
forbid_validation_weakening = true
allow_test_deletion_when = [
  "behavior_removed",
  "public_contract_changed",
  "duplicate_coverage",
  "implementation_detail_removed",
  "obsolete_snapshot",
]
forbid_test_deletion_when = [
  "only_to_make_tests_pass",
  "without_behavior_rationale",
  "without_reporting",
  "without_running_relevant_validation",
]
stale_test_action = "update_remove_or_report"
```

`testing.policy = "behavior_contract"` means tests validate the currently intended behavior. It does
not mean tests should grow forever or preserve removed features.

`require_existing_test_search` tells agents to inspect existing tests before adding new ones.
`allow_test_deletion_when` and `forbid_test_deletion_when` define the boundary between removing stale
tests and weakening validation.

`stale_test_action = "update_remove_or_report"` means stale candidates should be updated, removed, or
reported, not automatically deleted.

## Budget, Approval, and Isolation Fields

```toml
[budget]
enabled = true
max_iterations = 8
max_wall_clock_minutes = 60
max_command_runs = 25
max_total_output_mb = 8
max_failures_per_intent = 2
on_limit = "stop_and_report"

[approval]
required_for = [
  "git_commit",
  "git_push",
  "dependency_install",
  "dependency_upgrade",
  "network_access",
  "database_migration",
  "destructive_command",
  "secret_access",
  "release",
  "cross_repository_change",
]
on_required = "stop_and_request_approval"

[isolation]
preferred = "git_worktree"
required_for_long_running = true
allow_dirty_main_worktree = false
```

`budget` prevents unbounded loops by limiting iterations, elapsed time, command runs, output volume,
and repeated failures. When the limit is reached, agents stop and report. Projects that explicitly
enable a handoff workflow can choose `stop_and_handoff`.

`approval` lists actions that need explicit human approval before execution. It does not grant
permission by itself.

`isolation` declares the preferred boundary for long-running work. mustflow does not create the
worktree or sandbox by itself; it gives host tools a policy to follow.

`mf check` validates these fields as contracts, but it does not run a long-running harness.

## Retention Fields

```toml
[retention]
enabled = true

[retention.raw_events]
store = "none"
max_file_mb = 25
max_total_mb = 250
max_age_days = 14
on_limit = "report"

[retention.run_receipts]
store = "project"
max_file_kb = 128
max_items = 1
max_total_mb = 1
keep_stdout_tail_bytes = 65536
keep_stderr_tail_bytes = 65536

[retention.knowledge]
enabled = false
store = "project"
max_file_kb = 128
max_total_mb = 10
require_source_refs = true
require_review_status = true

[retention.context]
max_file_kb = 8

[retention.handoffs]
store = "project"
max_file_kb = 64
max_total_mb = 5
require_source_refs = true

[retention.repo_map]
max_file_kb = 128
fail_if_larger = true
```

`retention` prevents mustflow from accumulating full chat transcripts, full terminal output,
or raw JSONL event streams inside the project.

`raw_events.store = "none"` means the default template does not store raw event logs. If cache
storage is added later, it should stay separate from project documents that may be committed.

`run_receipts` limits `.mustflow/state/runs/latest.json`, which is written by `mf run`.
A run receipt should contain small structured results and output tails, not the full log.

`knowledge.enabled = false` means the default template does not create a knowledge base.
If enabled later, knowledge files should contain decisions, investigations, and handoff summaries,
not raw logs.

`context` limits `.mustflow/context/*.md` files. These files should stay short and task-oriented
instead of becoming a documentation archive. `mf check --strict` also checks them for local
absolute paths, secret-like key/value text, and design-token definitions duplicated from `DESIGN.md`.

`handoffs` limits optional compact handoff records. Handoffs are not raw session logs; they should
reference sources such as run receipts and summarize the next safe step.

`repo_map` limits generated `REPO_MAP.md`. The map should contain navigation anchors, not a full
file listing or recent-change log.

`mf check --strict` checks that this policy exists, generated files stay under their limits, and
raw JSONL files do not appear under `.mustflow/**`.

It lives under `.mustflow/` so it does not mix with ordinary project configuration.
