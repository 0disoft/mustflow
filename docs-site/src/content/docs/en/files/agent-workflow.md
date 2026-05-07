---
title: .mustflow/docs/agent-workflow.md
description: Describes how an agent starts, edits, verifies, and wraps up work in the repository.
---

`.mustflow/docs/agent-workflow.md` describes the repository-specific work flow for agents.

## Where It Is Used

If `AGENTS.md` is the short first-read rule file, this file expands those rules into shared work policy.

Agents read it after `AGENTS.md` to understand command execution, input stability, context compaction, edit scope, verification, failure handling, and secret handling.

## Components

- `Document role`: Defines what this file owns.
- `Authoritative documents and reading flow`: Lists the files agents read first.
- `Project context`: Explains when to read `.mustflow/context/INDEX.md` and task-specific context files.
- `Pre-work checks`: Tells agents to inspect changes, protected paths, command intents, and relevant skills.
- `Input stability policy`: Keeps volatile data away from the top of required reading files.
- `Instruction refresh policy`: Defines when long sessions should reread mustflow instructions.
- `Context compaction policy`: Explains boundaries and authority order for recent raw context, mid summaries, and long summaries.
- `Harness contract boundary`: Separates repository contracts from agent runtimes.
- `Long-running task phases`: Defines plan, work, verify, judge, and handoff.
- `Verification ratchet`: Prevents agents from weakening checks to look complete.
- `Test relevance policy`: Keeps tests aligned with the current behavior contract.
- `Preference interpretation policy`: Explains how to apply language, formatting, commit, and logging defaults from `preferences.toml`.
- `Git behavior policy`: Disables automatic staging, committing, and pushing, and treats commit message suggestions as report content.
- `Command execution policy`: Allows only finite command intents declared in `commands.toml`.
- `Edit policy`: Keeps changes limited to directly related files.
- `Verification policy`: Explains which command intents to check after changes.
- `Failure handling policy`: Records the failed intent, working directory, exit code, and key error.
- `Security and secret handling policy`: Prevents exposing tokens, private keys, and real environment values.
- `Document flow maintenance`: Tells maintainers which mustflow file to update when rules, commands, skills, or protected paths change.

## Command Execution Policy

The source of truth for executable commands is `.mustflow/config/commands.toml`.

Agents may only run command intents with `status = "configured"`, `lifecycle = "oneshot"`, `run_policy = "agent_allowed"`, and `stdin = "closed"`. If an intent is missing, `unknown`, `not_applicable`, `manual_only`, or `disabled`, agents must not infer a replacement command and must report the skipped reason.

Configured intents should use an `argv` array when possible. Use `mode = "shell"` and `cmd` only when shell syntax is actually required.

Do not run `server`, `watch`, `interactive`, `browser`, or `background` lifecycle commands directly. Development servers, watch mode, browser UI, and background processes are not finite validation commands.

When `mf run <intent>` is available, prefer it for finite commands.

`mf run` writes the latest execution result to `.mustflow/state/runs/latest.json` as a run receipt.
Use `mf run <intent> --json` when automation or final reports need structured evidence.
The receipt is evidence for one execution; the command definition source of truth remains `commands.toml`.

`mf context --json` is a read-only index that quickly shows reading order, command intents, capabilities, and the latest run summary for the current root. It does not replace reading the actual documents and configuration files, and project test or build commands still follow the intent contract in `commands.toml`.

`mf doctor` or `mf doctor --json` is a read-only diagnostic command that combines install state, check result, runnable command intents, and next steps before edits. It does not write files, so agents can use it for first orientation.

After changing mustflow documents, skills, command contracts, or repository-map generation rules,
run `mf check --strict` when possible. This adds checks for raw shell command blocks in skill
documents, volatile metadata in `REPO_MAP.md`, command output limits, retention policy, generated
file sizes, raw JSONL log traces, and the latest run receipt format.

## Input Stability

Keep shared policy in this document and executable commands in `commands.toml`.

Move repeatable procedures to `.mustflow/skills/`, and do not copy the full shared policy into each skill document.

Keep project direction and domain promises in `.mustflow/context/`. Agents should read
`.mustflow/context/INDEX.md` only when task-specific context is needed, then read only the selected
context files.

Context files are lower authority than direct user instructions, current code, tests, command
contracts, and configured policies. If `DESIGN.md` exists, use it as an optional external visual
design anchor for UI work instead of duplicating design tokens into `.mustflow/context/`.

Keep the repository navigation map in generated `REPO_MAP.md` instead of growing this document. `REPO_MAP.md` is an anchor-file map rather than a complete file list; it is not part of the required reading order and should be read only when broad navigation is needed.

Do not place volatile values such as generated times, hashes, file counts, recent-change summaries, or long logs near the top of this file.

Do not keep appending full chat transcripts, full terminal output, or raw JSONL event logs under
`.mustflow/`. Keep execution results as small run receipts, and keep knowledge files as summaries
with sources rather than raw logs.

## Instruction Refresh

Long sessions can dilute the instructions loaded at task start. `agent-workflow.md` treats this as
a checkpoint problem, not as a reason to write turn counters into the repository.

Agents should refresh mustflow instructions before the first edit, before command execution, after
context compaction, after editing `AGENTS.md` or `.mustflow/**`, after switching roots, and before
the final report.

The exact file set comes from `[refresh.levels]` in `.mustflow/config/mustflow.toml`.

## Context Compaction Policy

Compacted summaries created during long sessions are derived helper memory. `agent-workflow.md` says
they are lower authority than current user instructions, current code and config, command contracts,
and run receipts.

Do not store hidden chain of thought, secrets, or unbounded full chat transcripts in the project.
Shared project knowledge should be promoted only as source-linked decisions, investigations, or
handoff summaries.

## Harness Contract Boundary

mustflow is not an autonomous agent runtime. It provides the repository-local contracts that agent
harnesses can read.

- Brain contract: `AGENTS.md`, `agent-workflow.md`, and skill documents.
- Hands contract: `commands.toml`, `mf run`, and finite command lifecycles.
- Session contract: bounded run receipts, source-linked summaries, and compact handoff records.
- Judge contract: original goals, acceptance criteria, changed files, command contracts, and receipts.

## Long-Running Task Phases

Long-running work should separate planning, work, verification, judging, and handoff. The judge phase
must not accept a worker's completion claim by itself. It checks the original criteria, the changed
files, and run receipts.

## Verification Ratchet

The workflow forbids weakening validation to make the task appear complete. Agents must not delete
failing tests, loosen assertions without explanation, skip relevant command intents, change command
intent status only to avoid a failure, or rewrite acceptance criteria after implementation.

Tests can change when the intended behavior changed or existing tests are wrong, but the final report
must explain why.

## Test Relevance Policy

Tests validate the current behavior contract. Agents must not reintroduce removed behavior only
because old tests expect it, and must not preserve tests for intentionally removed features.

When tests are removed or assertions are weakened, distinguish current-contract cleanup from
validation avoidance. If relevance is uncertain, report the stale candidate instead of deleting it.

## Preference Interpretation Policy

`.mustflow/config/preferences.toml` contains repository-level defaults below direct user instructions and existing local style.

Agents must not use this file as a reason to reformat whole files, change unrelated files, or translate existing log strings without a task reason.

`preserve_existing` means the agent follows a visible existing convention. In a new repository where no convention is visible, the agent uses each field's `fallback` value.

The user's chat language must not automatically determine code comment, log, error message, or commit message language.

## Git Behavior Policy

`git.auto_stage`, `git.auto_commit`, and `git.auto_push` are all `false` by default.

Without an explicit user request, agents must not stage, commit, amend, rebase, reset, push, or otherwise change Git state or history.

Commit message suggestion is part of the final report, not Git execution permission. When files changed and commit suggestions are enabled, agents may suggest a commit message, but must not imply that a commit was created.
