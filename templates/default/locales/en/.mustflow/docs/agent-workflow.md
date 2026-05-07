---
mustflow_doc: docs.agent-workflow
locale: en
canonical: true
revision: 6
---

# Agent Workflow

This document expands the short router in `AGENTS.md`.
It defines the default operating loop for agents working inside a mustflow root.

## Orientation

Read the files listed in `AGENTS.md` before editing. Use `mf doctor` when you need a quick
read-only check of installation state, configured command intents, and suggested next steps.

Use `REPO_MAP.md` only as a generated navigation map for the current mustflow root.
It is not a full file listing and it is not a replacement for reading the files relevant to the task.

## Project Context

`.mustflow/context/` contains task-specific project context for agents.
It is not a general documentation archive.

- Read `.mustflow/context/INDEX.md` only when the task needs project, product, domain, UI,
  backend, data, security, or operations context.
- Read only the context files selected by the index.
- Treat context files as lower authority than direct user instructions, current code, tests,
  command contracts, and configured policies.
- Do not infer missing project goals, non-goals, API promises, data rules, or design tokens.
- If `DESIGN.md` exists, treat it as an optional external visual-design anchor for UI work.
  Do not duplicate its design tokens into `.mustflow/context/`.
- If context conflicts with current files or commands, report the conflict and prefer the higher-authority source.

## Input Stability

Treat user instructions, local files, command contracts, and generated reports as separate sources.
Do not silently mix them.

- Direct user instructions have priority.
- The nearest `AGENTS.md` has priority over broader parent rules.
- `.mustflow/config/preferences.toml` contains defaults, not hard requirements.
- Generated files such as `REPO_MAP.md`, `.mustflow/cache/**`, and `.mustflow/state/**` may be stale.
- Compacted summaries are derived memory. Current code, config, command receipts, and current user
  instructions override them.

When a generated file appears stale, refresh it through the matching `mf` command instead of editing
it by hand.

## Instruction Refresh

Long sessions can dilute the instructions loaded at the start of a task. Treat instruction refresh
as a checkpoint, not as a project-file counter.

Refresh mustflow instructions at these points:

- session start
- new task start
- before the first edit
- before command execution
- after editing `AGENTS.md` or `.mustflow/**`
- after switching roots or entering a nested repository
- after context compaction or summarization
- before the final report
- after the configured turn, tool-call, or output-size threshold

Use `.mustflow/config/mustflow.toml` `[refresh]` to decide the refresh level:

- `light`: reread `AGENTS.md` and `.mustflow/docs/agent-workflow.md`
- `command`: reread `AGENTS.md` and `.mustflow/config/commands.toml`
- `skill`: reread `AGENTS.md` and `.mustflow/skills/INDEX.md`
- `full`: reread the full mustflow reading order

Do not write turn counters, message counts, or session activity into the repository. If an agent
host tracks refresh state, it should use local cache or host-managed state outside versioned project
documents. Skills may describe refresh behavior, but they are not reliable lifecycle hooks.

## Context Compaction

mustflow supports a policy for tiered context compaction, but it does not collect full chat
transcripts by default.

Use `.mustflow/config/mustflow.toml` `[compaction]` to declare how a host agent may separate:

- recent raw context kept in local cache
- mid-level summaries with source references
- long-term summaries that preserve decisions, constraints, risks, and next steps
- raw retention limits for any host-managed session archive

Do not store hidden chain of thought, secrets, or unbounded raw transcripts in the project. A compacted
summary must be source-linked and must stay lower authority than current files and current user
instructions.

## Harness Contract Boundary

mustflow is not an autonomous agent runtime. It is a repository-local contract layer for agent
harnesses.

- Brain contract: `AGENTS.md`, this workflow file, and skill documents describe how the model should work.
- Hands contract: `.mustflow/config/commands.toml` and `mf run` define safe command execution.
- Session contract: run receipts, bounded checkpoints, and compact handoffs provide evidence for recovery.

Do not create worker folders, persona systems, fleet orchestration, raw event logs, or autonomous loops
unless the repository explicitly adds those optional surfaces.

## Long-Running Task Phases

For long-running or resumed tasks, separate these phases:

1. Plan: read the task goal, repository rules, command contract, and acceptance criteria.
2. Work: make the smallest safe change for the current unit.
3. Verify: run only configured finite command intents, preferably through `mf run`.
4. Judge: evaluate the result against the original acceptance criteria and run receipts.
5. Handoff: leave a compact handoff when the task is incomplete, blocked, or needs continuation.

The judge phase must not treat the worker's completion claim as sufficient. It uses the task goal,
changed files, command contract, and run receipts.

## Command Execution Policy

Do not infer commands from `package.json`, `Makefile`, `justfile`, `Taskfile.yml`, or source files.
Use `.mustflow/config/commands.toml` as the command contract.

A command intent is agent-runnable only when all of these are true:

- `status = "configured"`
- `lifecycle = "oneshot"`
- `run_policy = "agent_allowed"`
- `stdin = "closed"`
- A finite timeout is configured

Prefer `mf run <intent>` so the project receives a small run receipt in
`.mustflow/state/runs/latest.json`.

Do not directly run development servers, watchers, browser launches, interactive prompts,
or background processes. Report the skipped intent and reason instead.

## Editing Policy

Keep changes within the task scope. Do not perform drive-by refactors.
Do not modify protected paths from `.mustflow/config/mustflow.toml`.

Use existing project style. If style is unclear, apply the defaults in
`.mustflow/config/preferences.toml`.

Generated files should be refreshed by tools:

- `REPO_MAP.md` through `mf map --write`
- `.mustflow/cache/mustflow.sqlite` through `mf index`
- `.mustflow/state/runs/latest.json` through `mf run <intent>`

## Verification

Use configured command intents for checks. Typical intent names are:

- `mustflow_check`
- `test`
- `lint`
- `build`
- `docs_validate`

If an expected intent is missing, disabled, manual only, or not configured, do not invent a replacement.
Report what was skipped and why.

## Verification Ratchet

Do not weaken validation to make the task appear complete.

Agents must not:

- delete failing tests to make checks pass
- loosen assertions without explaining why
- skip relevant command intents
- mark command intents as `not_applicable` only to avoid a failure
- change acceptance criteria after implementation

Agents may update tests when the intended behavior changed, the old test is wrong, or new behavior
requires new coverage. Explain that change in the final report.

## Test Relevance Policy

Tests are behavior contracts, not permanent artifacts.

Agents must not:

- reintroduce removed behavior only because old tests expect it
- preserve tests for features that were intentionally removed
- delete failing tests only to make validation pass
- loosen assertions without explaining the behavior change
- update snapshots only to make tests pass

Agents may update or remove tests when the tested behavior was intentionally removed, the public
contract changed, the test only encodes removed implementation details, coverage is duplicated by a
stronger test, or a snapshot is obsolete.

When tests are added, updated, removed, or identified as stale candidates, report the behavior
contract, affected tests, commands run, skipped command intents, and remaining test risks.

## Budget, Approval, and Isolation

Use `.mustflow/config/mustflow.toml` for long-running safety policy.

- `[budget]` limits iterations, wall-clock time, command runs, output volume, and repeated failures.
- `[approval]` lists actions that require human approval before proceeding.
- `[isolation]` describes the preferred worktree or sandbox boundary for long-running tasks.

When a budget limit or approval gate is reached, stop and report or hand off. Do not keep looping.
Do not run long-running autonomous work in a dirty primary worktree when the isolation policy requires
a separate worktree or sandbox.

## Failure Handling

When a command fails:

1. Preserve the original command intent name.
2. Read the exit code and the bounded output tail.
3. Identify the smallest likely failure area.
4. Avoid changing unrelated files.
5. Re-run the smallest relevant verification after a fix.
6. Report skipped checks and remaining risk.

Do not store raw full logs, secrets, customer data, or long transcripts in `.mustflow/`.

## Reporting

Final reports should include:

- Changed files
- Command intents run
- Command intents skipped with reasons
- Verification result
- Remaining risk

Suggest commits only when `.mustflow/config/preferences.toml` allows it.
