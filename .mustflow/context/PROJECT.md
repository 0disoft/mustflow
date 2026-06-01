---
mustflow_doc: context.project
kind: mustflow-context
locale: en
canonical: true
revision: 1
name: project
authority: contextual
lifecycle: user-editable
stability: medium
review_status: needs_human_review
source_refs:
  - AGENTS.md
  - .mustflow/config/mustflow.toml
  - .mustflow/config/commands.toml
---

# Project Context

This file documents project-specific context for coding agents.  
If a field is unknown, leave it unset; do not assume or invent details.

## Authority Boundaries

- This file may record supported context, unknowns, and conflicts.  
- It must not grant command permissions, define file-edit restrictions, override  
  `AGENTS.md` or `.mustflow/config/*.toml`, or promise features not supported by  
  current sources.  
- Move durable operating rules to `AGENTS.md`, `.mustflow/docs/agent-workflow.md`,  
  or the relevant configuration file instead of storing them here.

## Current Goal

mustflow is a repository-local workflow contract and verification CLI for LLM coding agents.
It keeps agent operating instructions, command authority, task procedures, context, and
verification evidence in explicit files under the repository root.

## Non-Goals

- mustflow is not an autonomous agent runtime.
- mustflow does not replace host sandboxing, host approval policy, or operating-system isolation.
- Source anchors, search results, generated maps, caches, state files, dashboards, and API output do
  not grant command execution authority.
- Development servers, documentation previews, release checks, and publishing remain manual unless a
  bounded one-shot command intent explicitly says otherwise.

## Core Promises

- Follow `AGENTS.md` for mandatory operating rules.  
- Treat `.mustflow/config/commands.toml` as the source of truth for commands.  
- Treat `.mustflow/config/mustflow.toml` as the source of truth for workflow and document boundaries.  
- Use `REPO_MAP.md` as a high-level navigation map when a broader repository overview is needed.
- Keep installed template behavior, public JSON schemas, CLI output, tests, docs, and package
  metadata synchronized when public behavior changes.
- Prefer narrow configured checks such as `test_related`, `test_fast`, `docs_validate_fast`, and
  `mustflow_check` before broad suites when the changed surface allows it.

## Domain Terms

- Command intent: a named command contract entry under `.mustflow/config/commands.toml`.
- Runnable intent: a command intent that is configured, one-shot, agent-allowed, closed-stdin,
  timeout-bounded, and backed by an explicit command source.
- Dogfood workflow: the root `AGENTS.md` and `.mustflow/**` files in this source repository that
  make mustflow contributors follow the same contract model that mustflow installs for users.
- Installed template: files under `templates/default/**` copied into user repositories by `mf init`
  or reconciled by `mf update`.

## Extra Care Areas

- `src/cli/index.ts`, `src/cli/commands/**`, and `src/core/**` define public CLI behavior and
  automation-facing JSON contracts.
- `schemas/**`, `docs/spec/**`, docs-site command pages, README examples, and schema fixtures must
  stay aligned with public JSON output.
- `templates/default/**`, `templates/default/manifest.toml`, `tests/fixtures/**`, and package
  metadata are release-sensitive.
- `dist/**`, `docs-site/dist/**`, `.mustflow/cache/**`, `.mustflow/state/**`, and coverage outputs
  are generated or local state and should be refreshed through configured commands rather than
  edited by hand.

## Read Next

- `AGENTS.md`  
- `.mustflow/docs/agent-workflow.md`  
- `.mustflow/config/mustflow.toml`  
- `.mustflow/config/commands.toml`  
- `.mustflow/skills/INDEX.md`

## Staleness Check

- If this file conflicts with current code, tests, command contracts, or user instructions, treat it as stale and report the conflict.  
- Update this file only when the project direction, non-goals, or repository-wide promises change.
