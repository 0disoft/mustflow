---
title: .mustflow/docs/agent-workflow.md
description: Describes how an agent starts, edits, verifies, and wraps up work in the repository.
---

`.mustflow/docs/agent-workflow.md` defines the repository-specific workflow for agents.

## Where It Is Used

While `AGENTS.md` serves as the initial entry point for rules, this document expands upon those rules to establish a shared working policy.

Agents should consult this document after reading `AGENTS.md` to understand policies regarding command execution, input stability, context compaction, edit scope, verification, failure handling, and security.

## Components

- `Document Role`: Defines the scope and responsibility of this document.
- `Document Roles`: Defines which mustflow file owns each kind of rule, context, procedure, preference, or generated navigation output.
- `Authoritative Documents and Reading Flow`: Specifies the mandatory reading sequence for agents.
- `Project Context`: Clarifies the conditions for accessing task-specific context files.
- `Skill Activation`: Defines when agents should select and read task-specific skill procedures.
- `Pre-work Checks`: Instructs agents to verify modifications, protected paths, command intents, and relevant skills before initiating work.
- `Input Stability Policy`: Ensures that volatile data is separated from required reading files.
- `Prompt Cache and Host Context Assembly`: Guides host input assembly with stable, task, and volatile layers without treating cache state as authority.
- `Instruction Refresh Policy`: Determines the checkpoints at which agents should reread instructions during extended sessions.
- `Context Compaction Policy`: Outlines the hierarchy and authority of derived recent context, mid-level summaries, and long-term summaries.
- `Harness Contract Boundary`: Distinguishes repository-local contracts from external agent execution environments.
- `Long-running task phases`: Defines plan, work, verify, judge, and handoff.
- `Verification ratchet`: Prevents agents from weakening checks to look complete.
- `Test relevance policy`: Keeps tests aligned with the current behavior contract.
- `Preference interpretation policy`: Explains how to apply language, formatting, commit, and logging defaults from `preferences.toml`.
- `Git behavior policy`: Disables automatic staging, committing, and pushing, and treats commit message suggestions as report content.
- `Version impact policy`: Checks whether a change should apply or suggest a version bump according to repository preferences.
- `Command execution policy`: Restricts execution to oneshot command intents defined in `commands.toml`.
- `Edit policy`: Keeps changes limited to directly related files.
- `Verification policy`: Explains which command intents to check after changes.
- `Failure handling policy`: Records the failed intent, working directory, exit code, and key error.
- `Security and secret handling policy`: Prevents exposing tokens, private keys, and real environment values.
- `Document flow maintenance`: Tells maintainers which mustflow file to update when rules, commands, skills, or protected paths change.

## Document Roles

The installed workflow keeps authority narrow:

- `AGENTS.md`: first entry point and binding short-form repository rules.
- `.mustflow/docs/agent-workflow.md`: shared workflow policy; it expands `AGENTS.md` but does not define executable commands.
- `.mustflow/config/mustflow.toml`: machine-readable workflow configuration.
- `.mustflow/config/commands.toml`: the only source that grants project command execution through configured intents.
- `.mustflow/config/preferences.toml`: lower-authority repository defaults, not permissions.
- `.mustflow/context/INDEX.md`: router for optional task-specific context.
- `.mustflow/context/PROJECT.md`: cautious project facts and unknowns below code, tests, commands, and configured policies.
- `.mustflow/skills/INDEX.md`: router for task-specific procedure documents.
- `.mustflow/skills/<name>/SKILL.md`: bounded repeatable procedure; it cannot authorize commands.
- `REPO_MAP.md`: generated anchor map, refreshed by the configured `repo_map` intent or `mf map`.

## Command Execution Policy

The source of truth for executable commands is `.mustflow/config/commands.toml`.

Agents may only run command intents that satisfy every execution gate: `status = "configured"`, `lifecycle = "oneshot"`, `run_policy = "agent_allowed"`, `stdin = "closed"`, a positive `timeout_seconds`, a declared command through `argv` or `mode = "shell"` plus `cmd`, and a `cwd` inside the current mustflow root. If an intent is missing, `unknown`, `not_applicable`, `manual_only`, or `disabled`, agents must not infer a replacement command and must report the reason for skipping.

Configured intents should use an `argv` array whenever possible. Use `mode = "shell"` and `cmd` only when shell syntax is required.

For new configurations, use `manual_only` as an intent `status`. `run_policy = "manual_only"` may be accepted for older configs, but new templates do not generate it.

Do not directly execute commands with `server`, `watch`, `interactive`, `browser`, or `background` lifecycles. Development servers, watch modes, browser UIs, and background processes are not valid oneshot validation commands.

When `mf run <intent>` is available, it should be prioritized for oneshot commands.

Verification selection is risk-based. Agents should prefer configured related tests, fast checks,
builds, or docs-specific validation when those intents cover the changed surface, and report missing
narrower intents instead of silently defaulting to slow full-suite tests.

`mf run` writes the latest execution result to `.mustflow/state/runs/latest.json` as a run record.
Use `mf run <intent> --json` when automation or final reports require structured evidence.
The record serves as evidence for a specific execution; the definition source of truth remains `commands.toml`.

Host shells can run commands, but direct project commands do not automatically count as mustflow verification.
If a command bypasses `mf run`, treat its output as lower-confidence context unless the user explicitly approved a manual override and the final report states that no mustflow run record was produced.

`mf context --json` is a read-only index that provides a concise overview of the reading order, command intents, capabilities, and the latest run record summary. It does not replace the need to read actual documents and configuration files.

`mf doctor` or `mf doctor --json` is a read-only diagnostic command that aggregates installation state, check results, runnable command intents, and suggested next steps. Since it does not modify files, agents should use it for initial orientation.

After modifying mustflow documents, skills, command contracts, or repository-map generation rules, execute `mf check --strict`. This adds checks for skill index and skill body alignment, raw shell command blocks in skill documents, stable `REPO_MAP.md` generated metadata, volatile repository-map values, command output limits, retention policy, generated file sizes, raw JSONL log traces, and the latest run record format.

## Skill Activation

Skills are task procedures, not autonomous tools. Activating a skill means reading the matching
`.mustflow/skills/<name>/SKILL.md` and following that procedure within the current command contract.

At task start and before the first edit, agents compare the user request and expected changed files
with `.mustflow/skills/INDEX.md`. If one or more scenarios match, the matching `SKILL.md` files are
read before editing that scope. If new evidence appears later, such as a command failure, test
contract change, or documentation change, agents pause and activate the newly relevant skill.

Skills never authorize raw shell commands, long-running processes, or writes outside the task scope.
They also do not override user, host, repository, or safety rules.

## Input Stability

Keep shared policy in this document and executable commands in `commands.toml`.

Move repeatable procedures to `.mustflow/skills/` and avoid duplicating shared policy within individual skill documents.

Document project direction and domain conventions in `.mustflow/context/`. Agents should only consult `.mustflow/context/INDEX.md` when task-specific context is required.

Context files are secondary to direct user instructions, current code, tests, command contracts, and configured policies. If `DESIGN.md` exists, treat it as an optional external visual design anchor for UI work rather than duplicating design tokens into `.mustflow/context/`.

Maintain the repository navigation map in the generated `REPO_MAP.md` rather than expanding this document. `REPO_MAP.md` is a map of anchor files rather than an exhaustive file list; it is not part of the mandatory reading order and should be consulted only when broad navigation is required.

Keep only stable generated metadata near the top of this file. Avoid volatile values such as generation timestamps, branch names, remote URLs, change summaries, and logs.

Do not store full chat transcripts, terminal output, or raw JSONL event logs under `.mustflow/`. Maintain execution results as concise run records and knowledge files as summaries with source references.

## Prompt Cache and Host Context Assembly

Prompt caching is only a performance optimization. Cached instructions, summaries, search results,
and generated maps stay below direct user instructions, current files, current command contracts,
host safety rules, and the nearest `AGENTS.md`.

Hosts that assemble model input should keep stable repository instructions first, selected
task-specific context next, and volatile state last. Use
`mf context --json --cache-profile stable` for the stable prefix, task-selected files and
`mf search --json` results with `cache_layer: "task"` for task context, and current user requests,
changed files, command output tails, timestamps, latest run metadata, and `volatile: true` search
results only in the suffix.

Before reusing a stable prefix, compare content hashes with the current files. If a hash changed,
reread the file. Cache-layer fields are placement hints only; they do not grant command authority or
allow search results to override workflow rules.

## Effective Rule Lanes

Do not collapse every instruction into one priority list. Resolve conflicts by the kind of rule:

- User goal: current direct user instructions define the task unless unsafe.
- Host safety: host approval, sandbox, checkpoint, and shell execution gates remain binding.
- Repository work rules: the nearest `AGENTS.md` and `.mustflow/config/*.toml` define the repository contract.
- Command execution: `.mustflow/config/commands.toml` defines the project command contract.
- Verification evidence: `mf run` records and current files are stronger evidence than direct host shell output.
- Context and preferences: `.mustflow/context/*`, `preferences.toml`, and generated maps are lower-authority defaults.
- Session and cache state: host summaries, `.mustflow/cache/**`, and `.mustflow/state/**` never override current files or current user instructions.

Allowed action sets narrow by intersection. Denied actions, approval requirements, privacy rules, and destructive-command rules accumulate. When the effective rule is unclear, stop and report the conflict instead of guessing.

## Instruction Refresh

Long sessions can dilute the instructions loaded at task start. `agent-workflow.md` treats this as
a checkpoint problem, not as a reason to write turn counters into the repository.

Agents should refresh mustflow instructions before the first edit, before command execution when the
current command intent does not already have a fresh command refresh, after context compaction, after
editing `AGENTS.md` or `.mustflow/**`, after switching roots, and before the final report.

The exact file set comes from `[refresh.levels]` in `.mustflow/config/mustflow.toml`.

## Context Compaction Policy

Compacted summaries generated during long sessions are derived representations of state. This document establishes that they are secondary to direct user instructions, current code, configuration, command contracts, and run records.

Do not store hidden chain of thought, secrets, or unbounded chat transcripts in the project. Shared project knowledge should be documented as source-linked decisions, investigations, or handoff summaries.

## Harness Contract Boundary

mustflow is not an autonomous agent runtime. It provides repository-local contracts that agent harnesses can consult.

- **Brain Contract**: `AGENTS.md`, `agent-workflow.md`, and skill documents define the expected logic and flow.
- **Hands Contract**: `commands.toml`, `mf run`, and oneshot command lifecycles define safe execution boundaries.
- **Session Contract**: Bounded run records, source-linked summaries, and compact handoff records provide recovery evidence.
- **Judge Contract**: Original goals, acceptance criteria, modified files, command contracts, and run records serve as the basis for evaluation.

## Long-Running Task Phases

Long-running tasks should be divided into distinct phases: Plan, Work, Verify, Evaluate (Judge), and Handoff. The Evaluation phase must not rely solely on an agent's completion claim; it must verify the results against the original criteria, modified files, and run records.

## Verification Ratchet

The workflow prohibits weakening validation to falsely appear complete. Agents must not delete failing tests, loosen assertions without justification, skip relevant command intents, modify intent statuses solely to avoid failure, or rewrite acceptance criteria after implementation.

Tests should only be updated if the intended behavior has changed or existing tests are incorrect; all such changes must be justified in the final report.

## Test Relevance Policy

Tests function as behavior contracts rather than permanent artifacts.

Agents must not:

- Reintroduce removed behavior solely because legacy tests expect it.
- Preserve tests for features that have been intentionally removed.
- Delete failing tests merely to pass validation.
- Loosen assertions without explaining the change in behavior.
- Update snapshots solely to pass tests.

Agents may update or remove tests when the tested behavior has been intentionally removed, the public contract has changed, the test relies on obsolete implementation details, or coverage is redundant.

When tests are modified, report the affected behavior contract, the tests involved, executed intents, and any remaining test risks.

## Preference Interpretation Policy

`.mustflow/config/preferences.toml` defines repository-level defaults that are secondary to direct user instructions and existing project styles.

Agents must not use these preferences as a justification for mass-reformatting, modifying unrelated files, or translating existing strings without a specific task-related reason.

`preserve_existing` indicates that the agent must adhere to visible local conventions. In new repositories where no convention is established, the agent should use the defined `fallback` values.

The user's interaction language must not automatically dictate the language used for code comments, logs, error messages, or commit messages.

## Git Behavior Policy

`git.auto_stage`, `git.auto_commit`, and `git.auto_push` are all `false` by default.

These values are repository preferences, not permissions. They do not override direct user instructions, `.mustflow/config/commands.toml`, or approval policy in `.mustflow/config/mustflow.toml`. In particular, `git.auto_commit = true` does not grant push permission, and `git.auto_push = true` cannot be enabled through `mf init`.

Absent an explicit user request, agents must not perform Git operations that modify the state or history (e.g., stage, commit, rebase, push).

Commit message suggestions are intended for the final report and do not imply execution privileges. If enabled, agents may suggest a commit message but must not indicate that a commit has been executed.

## Version Impact Policy

`[release.versioning]` in `.mustflow/config/preferences.toml` controls version-impact preferences, including whether agents may edit version files after locating the repository's actual version source.

When code, templates, schemas, CLI behavior, package metadata, user-visible docs, installation output, or tests change, agents should check whether the change appears to require a package or template version update.

By default, mustflow may apply a patch, minor, or major bump when the evidence is clear, the version source is located, and `auto_bump = true` with `require_user_confirmation = false`. A direct user instruction, host safety rule, or approval policy still blocks automatic version edits.

Before suggesting or applying a version change, agents must find the repository's actual version source instead of assuming `package.json`. Common candidates include `package.json`, `pyproject.toml`, `Cargo.toml`, `go.mod` plus release tags, `pom.xml`, `build.gradle`, `*.csproj`, `*.gemspec`, `composer.json`, `pubspec.yaml`, `Package.swift`, `Chart.yaml`, app manifests, release notes, and mustflow template manifests.

When a version changes, package metadata, template manifest versions, docs examples, and tests should stay synchronized according to the `sync_*` preferences.
