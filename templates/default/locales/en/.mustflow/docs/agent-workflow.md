---
mustflow_doc: docs.agent-workflow
locale: en
canonical: true
revision: 18
lifecycle: mustflow-owned
authority: workflow-policy
---

# Agent Workflow

This document expands on the brief overview in `AGENTS.md`.  
It defines the default operating loop for agents working within a mustflow root.

## Orientation

Review the files listed in `AGENTS.md` before making any edits. Use `mf doctor` for a quick, read-only health check of the installation status, configured command intents, and suggested next steps.

Use `REPO_MAP.md` solely as a generated navigation map for the current mustflow root. It is not a comprehensive file listing and does not replace reading files relevant to the task.

## Document Roles

mustflow documents have specific, narrow roles. Do not move a rule into a lower-authority file simply for editing convenience.

| Document | Role | Authority | Lifecycle |
| --- | --- | --- | --- |
| `AGENTS.md` | Primary entry point and binding short-form repository rules. | Highest repository-local instruction file, below direct user and host safety instructions. | User-editable, mustflow-managed or managed-block depending on installation mode. |
| `.mustflow/docs/agent-workflow.md` | Shared workflow policy for reading, editing, verifying, reporting, and failure handling. | Expands `AGENTS.md`; does not define executable commands. | mustflow-owned Markdown. |
| `.mustflow/config/mustflow.toml` | Machine-readable workflow configuration, document roots, protection, budget, approval, retention, and refresh settings. | Configuration source for mustflow behavior. | mustflow-owned TOML. |
| `.mustflow/config/commands.toml` | Command intent contract. | Sole source granting project command execution through configured intents. | Repository-local TOML, edited when command contracts change. |
| `.mustflow/config/preferences.toml` | Repository-level defaults for style, language, Git suggestions, testing tendency, verification selection, and version-impact handling. | Lower-authority preferences; not permissions. | Repository-local TOML, user-customizable. |
| `.mustflow/context/INDEX.md` | Router for task-specific context files. | Selects optional context only; not a policy manual. | mustflow-owned Markdown. |
| `.mustflow/context/PROJECT.md` | Cautious project facts, unknowns, and domain conventions. | Contextual reference below user instructions, code, tests, commands, and configured policies. | User-editable context. |
| `.mustflow/skills/INDEX.md` | Router that selects which procedure document to read for a task. | Selection contract only; procedure detail remains in `SKILL.md`. | mustflow-owned Markdown. |
| `.mustflow/skills/<name>/SKILL.md` | Repeatable task procedure with inputs, allowed scope, checks, and reporting format. | Procedure guidance only; cannot authorize commands or override rules. | mustflow-owned Markdown, optionally localized. |
| `REPO_MAP.md` | Generated anchor map for broad navigation and nested repository entry points. | Generated navigation aid below current files and instructions. | Generated; refresh with the configured `repo_map` intent or `mf map`. |

## Project Context

`.mustflow/context/` contains task-specific project context for agents.  
It is not a general documentation archive.

- Read `.mustflow/context/INDEX.md` only when the task requires project, product, domain, UI, backend, data, security, or operations context.
- Read only the context files selected by the index.
- Treat context files as secondary to direct user instructions, current code, tests, command contracts, and configured policies.
- Do not infer missing project goals, non-goals, API promises, data rules, or design tokens.
- If `DESIGN.md` exists, treat it as an optional external visual-design anchor for UI work. Do not duplicate its design tokens into `.mustflow/context/`.
- If context conflicts with current files or commands, report the conflict and defer to the higher-authority source.

## Skill Activation

Skills are task procedures, not autonomous tools. Activating a skill means reading the matching `.mustflow/skills/<name>/SKILL.md` and following its procedure within the current command contract.

At task start and before the first edit:

1. Read `.mustflow/skills/INDEX.md`.
2. Match the current task against the listed scenarios.
3. Read every matching `SKILL.md` before editing that part of the work.
4. If no skill applies, proceed with the smallest safe change under `AGENTS.md` and `.mustflow/config/commands.toml`.

Activate a skill later if new evidence changes the task type. For example, a failing configured command activates failure triage; a test contract change activates test maintenance; and a documentation or workflow change activates documentation update.

When multiple skills apply, follow the most specific skill for each affected scope and combine only their declared command intents. Skills never authorize raw shell commands, long-running processes, or writes outside the task scope.

When a skill is used, or when a plausible skill is intentionally skipped, report the skill name and the selection reason briefly in the next user-facing update or final report. Do not create a versioned worklog solely to record skill selection.

## Input Stability

Treat user instructions, local files, command contracts, and generated reports as distinct sources. Avoid conflating these sources.

- Direct user instructions take priority.
- The nearest `AGENTS.md` takes precedence over broader parent rules.
- `.mustflow/config/preferences.toml` contains defaults, not mandatory requirements.
- Generated files such as `REPO_MAP.md`, `.mustflow/cache/**`, and `.mustflow/state/**` may become stale.
- Compacted summaries are derived representations of state. Current code, configuration, command records, and current user instructions override them.

When a generated file appears stale, refresh it using the matching `mf` command instead of editing it manually.

## Prompt Cache and Host Context Assembly

Prompt caching is a performance optimization, not an authority source. A cached instruction block or summary never overrides direct user instructions, current files, current command contracts, host safety rules, or the nearest `AGENTS.md`.

Hosts and agent harnesses assembling model input should keep context in this order:

1. Stable prefix: repository rules and workflow files from `mf context --json --cache-profile stable`.
2. Task context: selected context files, matching skills, repository-map anchors, relevant source files, and `mf search --json` results with `cache_layer` set to `task`.
3. Volatile suffix: current user request, changed-file lists, command output tails, latest run receipt metadata, timestamps, and any `mf search --json` result whose `volatile` field is `true`.

Before reusing a stable prefix, compare the reported content hashes with the current files. If any stable document hash changes, reread the document instead of reusing cached text. Do not place absolute local paths, run receipt timestamps, command output, changed files, or current user task text before the stable prefix.

`mf search --json` cache-layer fields are placement hints only. They do not raise the authority of search results, source anchors, generated maps, or cached state, and they never permit those sources to override `AGENTS.md`, `.mustflow/config/commands.toml`, current files, or direct user instructions.

## Effective Rule Lanes

Do not collapse every instruction into a single priority list. Resolve conflicts by rule type:

- User goal: current direct user instructions define the task unless unsafe.
- Host safety: host approval, sandbox, and execution gates remain binding when stricter.
- Repository work rules: use the nearest `AGENTS.md` plus `.mustflow/config/*.toml`.
- Command execution: `.mustflow/config/commands.toml` is the project command contract.
- Verification evidence: `mf run` receipts and current files outrank direct host shell output.
- Context and preferences: `.mustflow/context/*`, `preferences.toml`, and generated maps are lower-authority defaults.
- Session and cache state: host summaries, `.mustflow/cache/**`, and `.mustflow/state/**` never override current files or current user instructions.

Allowed action sets narrow by intersection. Denied actions, approval requirements, privacy rules, and destructive-command rules accumulate. When the effective rule is unclear, stop and report the conflict instead of guessing.

## Instruction Refresh

Long sessions may cause instruction drift. Treat instruction refresh as a mandatory checkpoint, not a project-file counter.

Refresh mustflow instructions at these points:

- session start
- new task start
- before the first edit
- before command execution when the current task and command intent do not already have a fresh command refresh
- after editing `AGENTS.md` or `.mustflow/**`
- after switching roots or entering a nested repository
- after context compaction or summarization
- before the final report
- after the configured turn, tool-call, or output-size threshold

Use `.mustflow/config/mustflow.toml` `[refresh]` to determine the refresh level:

- `light`: reread `AGENTS.md` and `.mustflow/docs/agent-workflow.md`
- `command`: reread `AGENTS.md` and `.mustflow/config/commands.toml`
- `edit`: reread `AGENTS.md`, `.mustflow/config/mustflow.toml`, and `.mustflow/docs/agent-workflow.md` before sensitive edits
- `report`: reread `AGENTS.md`, `.mustflow/config/mustflow.toml`, and `.mustflow/config/preferences.toml` before the final report
- `skill`: reread `AGENTS.md` and `.mustflow/skills/INDEX.md`
- `full`: reread the full mustflow read sequence

`before_command_run` is a freshness checkpoint for the current command intent, not a requirement to reread every file before every repeated command when the command contract has not changed.

Do not write turn counters, message counts, or session activity into the repository. If an agent host tracks refresh state, it should use local cache or host-managed state outside versioned project documents. Skills may describe refresh behavior, but they are not reliable lifecycle hooks.

## Context Compaction

`compaction` is a future or host policy, not a default data collection feature. The default template keeps it disabled and declares only safety rules.

Do not store hidden reasoning, secrets, full chat transcripts, full terminal output, raw event logs, or raw command logs in the project. If a host creates compacted summaries in the future, they must be source-linked and remain lower authority than current files and direct user instructions.

## Harness Contract Boundary

mustflow is not an autonomous agent runtime. It is a repository-local contract layer for agent harnesses.

- Brain contract: `AGENTS.md`, this workflow file, and skill documents define the expected model behavior.
- Hands contract: `.mustflow/config/commands.toml` and `mf run` define safe command execution.
- Session contract: run records, bounded checkpoints, and compact handoffs provide evidence for recovery.

Do not create worker folders, persona systems, fleet orchestration, raw event logs, or autonomous loops unless the repository explicitly adds those optional surfaces.

## Long-Running Task Phases

For long-running or resumed tasks, separate these phases:

1. Plan: read the task goal, repository rules, command contract, and acceptance criteria.
2. Work: make the smallest safe change for the current unit.
3. Verify: run only configured one-shot command intents, preferably through `mf run`.
4. Judge: evaluate the result against the original acceptance criteria and run receipts.
5. Handoff: leave a compact handoff when the task is incomplete, blocked, or needs continuation.

The judge phase must not treat the worker's completion claim as sufficient. It uses the task goal, changed files, command contract, and run receipts.

## Git Behavior Policy

Git operations that modify state or history are denied by default.

- `git.auto_stage = false`: do not stage without a user request.
- `git.auto_commit = false`: do not commit without a user request.
- `git.auto_push = false`: do not push without a user request.

These values are repository preferences, not permissions. They do not override direct user instructions, `.mustflow/config/commands.toml`, or approval policy in `.mustflow/config/mustflow.toml`. In particular, `git.auto_commit = true` does not grant push permission, and `git.auto_push = true` cannot be enabled through `mf init`.

## Version Impact Policy

Version impact settings are repository preferences. They guide version-file edits but do not override direct user instructions, host safety rules, or approval gates in `.mustflow/config/mustflow.toml`.

Use `.mustflow/config/preferences.toml` `[release.versioning]` when code, templates, schemas, CLI behavior, package metadata, user-visible docs, installation output, or tests change.

- `impact_check = true`: report whether the diff appears to require a package or template version change.
- `suggest_bump = true`: suggest patch, minor, or major when the evidence is clear.
- `auto_bump = true`: apply the appropriate package or template version bump when the impact is clear, the version source has been located, and no stricter user, host, or approval rule blocks it.
- `auto_bump = false`: leave package and template version files unchanged unless the user requests a version bump or release-preparation task.
- `require_user_confirmation = true`: ask before editing version files.
- `require_user_confirmation = false`: do not add a separate confirmation step when `auto_bump = true`.

Before suggesting or applying a version change, locate the repository's version source of truth. Do not assume that `package.json` is the only version file. Inspect manifests, release documents, and existing update patterns that match the repository's languages and frameworks, then report which files are authoritative and which are derived.

Common version-source candidates include:

- JavaScript or TypeScript: `package.json` and package-manager lockfiles when they duplicate package metadata.
- Python: `pyproject.toml`, `setup.cfg`, `setup.py`, or package `__version__` files.
- Rust: `Cargo.toml`, with `Cargo.lock` considered only when the repository treats lockfile changes as release metadata.
- Go: release tags and release documentation first; `go.mod` only when module path or tool metadata is relevant.
- Java or Kotlin: `pom.xml`, `build.gradle`, `build.gradle.kts`, or `gradle.properties`.
- .NET: `*.csproj`, `Directory.Build.props`, or `*.nuspec`.
- Ruby, PHP, Dart, or Swift: `*.gemspec`, `lib/**/version.rb`, `composer.json`, `pubspec.yaml`, or `Package.swift`.
- Containers, charts, or apps: `Chart.yaml`, image labels, app manifests, release notes, or deployment metadata when present.
- mustflow templates: package metadata, template manifests, documentation examples, and tests that assert installed versions.

When a version changes, keep package metadata, template manifest versions, docs examples, and tests synchronized according to the `sync_*` preferences.

## Command Execution Policy

Do not infer commands from `package.json`, `Makefile`, `justfile`, `Taskfile.yml`, or source files. Use `.mustflow/config/commands.toml` as the command contract.

A command intent is eligible for agent use only when all of these are true:

- `status = "configured"`
- `lifecycle = "oneshot"`
- `run_policy = "agent_allowed"`
- `stdin = "closed"`
- `timeout_seconds` is a positive integer
- A command is declared with `argv`, or with `mode = "shell"` and `cmd`
- `cwd` remains inside the current mustflow root

`manual_only` is a status for new configurations. `run_policy = "manual_only"` may be read for older configs, but new templates should use `status = "manual_only"` instead.

Prefer `mf run <intent>` so the project receives a concise run record in `.mustflow/state/runs/latest.json`.

Run `mf run` command intents serially. Do not start a second `mf run` while another configured intent is still running. Intents that declare non-empty `writes` are exclusive verification phases; wait for them to finish before running any other `mf run`. This is especially important when an intent rewrites package output such as `dist/`, because the local `mf` executable may load from that output.

For installed mustflow workflow updates, use configured update intents instead of running raw `mf update` directly. Run `mustflow_update_dry_run` first. Run `mustflow_update_apply` only when the dry-run plan has no blocking or manual-review items and the task calls for applying template updates. The apply intent still relies on `mf update` safety policy: it writes only template manifest paths, backups, and manifest-lock entries, and refuses local changes.

Host shells can run commands, but direct project commands do not automatically count as mustflow verification. If a command bypasses `mf run`, treat its output as lower-confidence context unless the user explicitly approved a manual override and the final report states that no mustflow run receipt was produced.

Do not directly run development servers, watchers, browser launches, interactive prompts, or background processes. Report the skipped intent and reason instead.

## Editing Policy

Keep changes within the task scope. Do not perform drive-by refactors.  
Do not modify protected paths from `.mustflow/config/mustflow.toml`.

Use existing project style. If style is unclear, apply the defaults in `.mustflow/config/preferences.toml`.

## Documentation Review Queue

When an agent creates or modifies user-facing, workflow, template, context, or skill documentation, record the touched document with `mf docs review add <path>` unless the user explicitly says not to track it. The queue is stored in `.mustflow/review/docs.toml` and is created only when needed.

Review completion may come from a human, an LLM, a tool, or an external process. Record only the broad reviewer kind plus free-form identifiers such as reviewer ID, provider, model, command intent, and summary. Do not maintain a fixed list of specific LLM products.

Use `mf docs review approve <path> --reviewer-kind <kind> --reviewer-id <id>` to hide an approved document from the default review list while keeping the audit record. Use `needs-human` when the reviewer cannot confidently approve the document, and `ignore` only when skipping review is an intentional repository decision.

Generated files should be refreshed by tools:

- `REPO_MAP.md` through `mf map --write`
- `.mustflow/cache/mustflow.sqlite` through `mf index`
- `.mustflow/state/runs/latest.json` through `mf run <intent>`

## Verification

Use configured command intents for checks. Typical intent names include:

- `mustflow_check`
- `test`
- `lint`
- `build`
- `docs_validate`

If an expected intent is missing, disabled, manual-only, or not configured, do not invent a replacement. Report what was skipped and why.

## Verification Selection

Use `.mustflow/config/preferences.toml` `[verification.selection]` to choose verification breadth. These preferences do not grant command execution permission; they only guide which configured command intents to consider.

Verification should be proportional to risk. Prefer `test_related`, `test_fast`, `build`, or docs-specific checks when configured and covering the changed surface. Use broad full-suite tests for cross-cutting behavior, release risk, missing narrower coverage, or when the configured policy explicitly requires them. If a narrow intent would be appropriate but is `unknown`, `manual_only`, or absent, report that gap instead of silently treating the slowest suite as the default.

- `strategy = "risk_based"`: prefer the smallest configured checks covering the changed behavior, public surface, command contract, and risk area.
- `strategy = "targeted"`: prefer directly related checks unless the user, skill, or policy requires broader coverage.
- `strategy = "full"`: prefer the full applicable configured verification suite.
- `prefer_related_tests = true`: look for a narrower relevant test intent before a broad test intent.
- `skip_docs_only_full_test = true`: documentation-only changes may skip broad tests when docs validation covers the edited surface.
- `skip_translation_only_full_test = true`: translation-only changes may skip broad tests when source behavior did not change.
- `skip_copy_only_full_test = true`: copy-only wording changes may skip broad tests when no behavior, schema, template, or command contract changed.
- `report_skipped = true`: final reports must name skipped checks and the reason.

If evidence shows behavior, security, data, command contracts, release output, or generated templates changed, do not use a skip preference to hide risk. Escalate to the relevant configured intent or report that the required intent is missing.

## Verification Ratchet

Do not weaken validation to make the task appear complete.

Agents must not:

- delete failing tests to make checks pass
- loosen assertions without explanation
- skip relevant command intents
- mark command intents as `not_applicable` solely to avoid failure
- change acceptance criteria after implementation

Agents may update tests when the intended behavior changed, the old test is incorrect, or new behavior requires new coverage. Explain such changes in the final report.

## Test Relevance Policy

Tests are behavior contracts, not permanent artifacts.

Use `.mustflow/config/preferences.toml` `[testing.authoring]` to guide how readily agents create new tests. The default `new_test_policy = "evidence_required"` means a new test should be backed by behavior-contract evidence such as changed public behavior, regression risk, configuration rule, schema contract, or security/data path. This preference guides authoring behavior only; it does not weaken required verification or justify deleting valid tests.

Agents must not:

- reintroduce removed behavior solely because old tests expect it
- preserve tests for features intentionally removed
- delete failing tests merely to pass validation
- loosen assertions without explaining the behavior change
- update snapshots merely to pass tests

Agents may update or remove tests when the tested behavior was intentionally removed, the public contract changed, the test only encodes removed implementation details, coverage is duplicated by a stronger test, or a snapshot is obsolete.

When tests are added, updated, removed, or identified as stale candidates, report the behavior contract, affected tests, commands run, skipped command intents, and remaining test risks.

## Budget, Approval, and Isolation

Use `.mustflow/config/mustflow.toml` for long-running safety policy.

- `[budget]` limits iterations, wall-clock time, command runs, output volume, and repeated failures.
- `[approval]` lists actions requiring human approval before proceeding.
- `[isolation]` describes the preferred worktree or sandbox boundary for long-running tasks.

When a budget limit or approval gate is reached, stop and report. Use handoff only when this repository explicitly enables a handoff workflow. Do not keep looping.  
Do not run long-running autonomous work in a dirty primary worktree when the isolation policy requires a separate worktree or sandbox.

## Failure Handling

When a command fails:

1. Preserve the original command intent name.
2. Analyze the exit code and the truncated output tail.
3. Identify the most probable root cause of the failure.
4. Avoid modifying unrelated files.
5. Re-run the most targeted relevant verification after a fix.
6. Report skipped checks and remaining risks.

Do not store raw full logs, secrets, customer data, or long transcripts in `.mustflow/`.

## Reporting

Final reports should include:

- Changed files
- Command intents run
- Command intents skipped with reasons
- Verification results
- Remaining risk

Suggest commits only when `.mustflow/config/preferences.toml` allows it.