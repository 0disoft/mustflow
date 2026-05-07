---
mustflow_doc: context.project
kind: mustflow-context
locale: en
canonical: true
revision: 1
name: project
authority: contextual
stability: medium
review_status: needs_human_review
source_refs:
  - AGENTS.md
  - .mustflow/config/mustflow.toml
  - .mustflow/config/commands.toml
---

# Project Context

This file records project-specific context for coding agents.
If a field is unknown, leave it unset and do not invent details.

## Current Goal

Unset. Replace this with the current project goal when the project owner provides it.

## Non-Goals

Unset. List things the agent should not expand into during unrelated tasks.

## Core Promises

- Follow `AGENTS.md` for mandatory operating rules.
- Treat `.mustflow/config/commands.toml` as the command source of truth.
- Treat `.mustflow/config/mustflow.toml` as the workflow and document-boundary source of truth.
- Use `REPO_MAP.md` as a shallow navigation map when broader repository orientation is needed.

## Domain Terms

Unset. Add only terms that affect implementation decisions.

## Extra Care Areas

Unset. Add paths, public APIs, generated files, migrations, secrets, or compatibility surfaces that need extra care.

## Read Next

- `AGENTS.md`
- `.mustflow/docs/agent-workflow.md`
- `.mustflow/config/mustflow.toml`
- `.mustflow/config/commands.toml`
- `.mustflow/skills/INDEX.md`

## Staleness Check

- If this file conflicts with current code, tests, command contracts, or user instructions, treat this file as stale and report the conflict.
- Update this file only when the project direction, non-goals, or repository-wide promises actually change.

