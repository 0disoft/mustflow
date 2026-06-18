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
- `prompt_cache`: Cache-friendly prompt layers for stable instructions, task context, and volatile state.
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
  ".mustflow/skills/router.toml",
]
optional_read_order = [
  ".mustflow/context/INDEX.md",
  ".mustflow/skills/routes.toml",
  ".mustflow/skills/INDEX.md",
  "REPO_MAP.md",
]
```

`read_order` is the required document flow. `optional_read_order` lists documents to read when present and skip when missing.

This file reduces agent guesswork and helps prevent accidental edits to generated files or secrets.

`REPO_MAP.md` belongs to `optional_read_order` and `document_roots.generated`. Agents should read it only when broad repository navigation is needed, treat it as an anchor-file map rather than a complete file list, and regenerate it when needed.

`.mustflow/context/INDEX.md` belongs to `optional_read_order` because agents should read it only when project, product, domain, UI, backend, data, security, or operations context is relevant to the task.

`.mustflow/skills/router.toml` belongs to `read_order` as the stable compact route kernel. `.mustflow/skills/routes.toml` belongs to `optional_read_order` because agents should read full route metadata only when the compact router is insufficient, the task edits skill routing, detailed route metadata is needed, or route confidence is ambiguous. `.mustflow/skills/INDEX.md` also belongs to `optional_read_order` because agents should read the expanded route table only when full route metadata is insufficient, the task edits the expanded route table, or human-readable trigger evidence is needed.

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
  ".mustflow/skills/router.toml",
  ".mustflow/skills/routes.toml",
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

## Prompt Cache Fields

```toml
[prompt_cache]
enabled = true
strategy = "stable_prefix"
stable_prefix_policy = "hash_verified"
prefer_references_when_unchanged = true
exclude_volatile_state_from_prefix = true
include_content_hashes = true
max_stable_prefix_kb = 48
max_task_context_kb = 48
max_volatile_suffix_kb = 24

[prompt_cache.layers.stable]
target_kb = 32
read = [
  "AGENTS.md",
  ".mustflow/skills/router.toml",
]

[prompt_cache.layers.task]
read_policy = "task_relevant_only"
sources = [
  ".mustflow/context/INDEX.md",
  ".mustflow/skills/routes.toml",
  ".mustflow/skills/INDEX.md",
  "REPO_MAP.md",
  "matching_skill",
  "relevant_source_files",
]

[prompt_cache.layers.volatile]
sources = [
  ".mustflow/state/runs/latest.json",
  "changed_files",
  "command_output_tail",
  "current_user_task",
]
never_place_before_stable_prefix = true
```

`prompt_cache` is a prompt-layout contract, not a guarantee that any specific LLM provider will cache
the input. It separates stable instructions from task-specific context and volatile state so hosts can
keep repeated prompt prefixes stable when they support caching.

The stable layer contains repository entrypoint rules and the compact skill-route kernel that should be
placed before task-specific material in a consistent order. Workflow policy, configuration, command
contracts, technology preferences, and expanded route tables should be loaded through task selection
or refresh checkpoints instead of being placed in the always-on stable prefix. The task layer is selected per task and may include full route metadata and the expanded skill index only when needed. The volatile layer
contains changing values such as current user requests, changed-file lists, command output tails, run
receipts, timestamps, and local paths.

`stable_prefix_policy = "hash_verified"` means unchanged files can be referenced by content hash when
the host supports that behavior. Current files and current user instructions still override cached or
summarized context.

`exclude_volatile_state_from_prefix = true` and
`prompt_cache.layers.volatile.never_place_before_stable_prefix = true` keep changing state out of the
stable prompt prefix. `mf check --strict` reports a problem when volatile sources appear in the stable
read layer.

`mf context --json --cache-audit` uses these budgets to report whether the mustflow reference bundle
would fit the configured stable, task, and volatile limits. The stable layer is measured from the
configured file contents after deterministic UTF-8/LF canonicalization. Task file candidates are
measured as selectable reference-bundle blocks with existence flags, content hashes, and largest-block
ordering so hosts can see the cost of fallback documents before choosing them. Dynamic task sources
and volatile sources remain runtime-only placeholders until actual selected content is available to a
host resolver. The audit is a static prompt-layout check; provider tokenizer counts, billing tokens,
TTL behavior, tool schema caching, and runtime cache hit evidence still require provider-specific
adapters or usage telemetry.

`prompt_cache.layers.stable.target_kb` is a preferred size target for the stable layer. The cache
audit reports it as `target_status`, so oversized-but-still-valid stable prefixes remain visible
while `max_stable_prefix_kb` stays the hard budget.

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

`capabilities` declares which agent work surfaces are available in this repository. `workflow`, `command_contract`, and `skills` are core features. `repo_map`, `preferences`, `local_index`, `work_items`, and `services` are state-based extension points. The default template provides the local index as optional generated data, but `mf init` does not create the index file. Local work items and service management are inactive in the default template until a repository opts into bounded lifecycle rules.

`agent_loop.phases` is the standard agent work loop: `orient`, `plan`, `act`, `verify`, `report`, and `handoff`. It is a machine-checkable contract, not decorative prose.

`verification` states that validation commands come from `.mustflow/config/commands.toml`. `allow_inferred_commands = false` means agents must not infer validation commands from `package.json`, `Makefile`, or naming conventions.

`handoff.enabled = false` means the current template keeps local work-item writing inactive. Work that cannot be finished safely should be handed off in the final report unless the repository enables a bounded work-item lifecycle.

`mf check` validates booleans, allowed capability states, the standard loop, and the validation command path.

## Harness Fields

```toml
[harness]
mode = "single_session"
fresh_context_preferred = true
fresh_context_mode = "hash_check_before_reread"

[harness.phases]
enabled = [
  "plan",
  "work",
  "verify",
  "judge",
  "handoff",
]
```

`harness` declares the default execution shape for agent harnesses. `mode = "single_session"` is
the conservative default; future or repository-specific harness modes can opt into longer-running
coordination when lifecycle, approval, isolation, and retention rules are explicit.

`fresh_context_preferred = true` means agents should prefer current files over stale summaries.
`fresh_context_mode = "hash_check_before_reread"` clarifies that freshness can be checked by content
hash before reinserting full instruction text. This preserves instruction freshness without treating
prompt caches as authority.

`harness.phases.enabled` defines the phases a long-running harness should separate. These are phases,
not default folders or default subagents.

## Refresh Fields

```toml
[refresh]
enabled = true
mode = "checkpoint"
default_method = "hash_check"
reread_when_hash_changed = true
reuse_cached_prefix_when_unchanged = true
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
tool_call_threshold = 16
output_bytes_threshold = 100000
state_store = "cache"

[refresh.levels.light]
method = "hash_check"
read = [
  "AGENTS.md",
  ".mustflow/docs/agent-workflow.md",
]

[refresh.levels.command]
method = "hash_check"
read = [
  "AGENTS.md",
  ".mustflow/config/commands.toml",
]

[refresh.levels.edit]
method = "reread_if_changed"
read = [
  "AGENTS.md",
  ".mustflow/config/mustflow.toml",
  ".mustflow/docs/agent-workflow.md",
]

[refresh.levels.report]
method = "hash_check"
read = [
  "AGENTS.md",
  ".mustflow/config/mustflow.toml",
  ".mustflow/config/preferences.toml",
]

[refresh.levels.skill]
method = "hash_check"
read = [
  "AGENTS.md",
  ".mustflow/skills/router.toml",
]

[refresh.levels.full]
method = "reread_if_changed"
read = [
  "AGENTS.md",
  ".mustflow/docs/agent-workflow.md",
  ".mustflow/config/mustflow.toml",
  ".mustflow/config/commands.toml",
  ".mustflow/config/preferences.toml",
  ".mustflow/config/technology.toml",
  ".mustflow/skills/router.toml",
  ".mustflow/skills/routes.toml",
]
```

`refresh` declares when an agent should reread mustflow instructions because the session has become long, the root changed, command execution is about to happen, or instruction files changed.

`default_method = "hash_check"` means a refresh checkpoint can verify content hashes before rereading
or reinserting full instruction text. `reread_when_hash_changed = true` keeps current files
authoritative. `reuse_cached_prefix_when_unchanged = true` lets hosts reuse stable prompt context when
the relevant files have not changed.

`before_command_run` means the current task and command intent must have a fresh command-level refresh. It does not require rereading every file before every repeated command when the command contract has not changed and thresholds remain current.

`state_store = "cache"` means turn counts and session activity do not belong in project files. A host application may track them in local cache, but mustflow documents should remain stable and commit-safe.

`refresh.levels` maps each refresh level to the files that should be checked or reread. The default
levels are `light`, `command`, `edit`, `report`, `skill`, and `full`. Each level may use `method =
"hash_check"` or `method = "reread_if_changed"`.

`mf check` validates the refresh mode, checkpoint names, thresholds, state store, and refresh file paths.

## Context Compaction Fields

```toml
[compaction]
enabled = false
strategy = "tiered"
state_store = "cache"

[compaction.rules]
require_source_refs = true
summaries_are_derived = true
current_files_override_summaries = true
never_store_secrets = true
scrub_absolute_user_paths = true
do_not_store_hidden_chain_of_thought = true
```

The default template keeps `compaction` disabled and declares only host safety rules. It does not install recent, mid, long, or raw-retention settings, and it does not mean mustflow stores full chat transcripts, hidden reasoning, full terminal output, or raw command logs.

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
max_iterations = 6
max_wall_clock_minutes = 60
max_command_runs = 20
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
store = "repo_local_ignored"
max_file_kb = 128
max_items = 1
max_total_mb = 1
keep_stdout_tail_bytes = 65536
keep_stderr_tail_bytes = 65536

[retention.knowledge]
enabled = false
store = "repo_local_ignored"
max_file_kb = 128
max_total_mb = 10
require_source_refs = true
require_review_status = true

[retention.context]
max_file_kb = 8

[retention.handoffs]
store = "repo_local_ignored"
max_file_kb = 64
max_total_mb = 5
require_source_refs = true

[retention.repo_map]
max_file_kb = 128
fail_if_larger = true
```

`retention` prevents mustflow from accumulating full chat transcripts, full terminal output,
or raw JSONL event streams inside the project.

`repo_local_ignored` means generated state stored inside the repository workspace but under ignored local paths such as `.mustflow/state/**` or `.mustflow/cache/**`. These files are safe to delete or rebuild and are lower-authority than current files, current user instructions, and command contracts.

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
