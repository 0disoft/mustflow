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
If a field is unknown, leave it unset; do not assume or fabricate details.

## Authority Boundaries

- This file may record supported context, unknowns, and conflicts.
- It must not grant command permission, define file-edit prohibitions, override
  `AGENTS.md` or `.mustflow/config/*.toml`, or promise features not backed by
  current sources.
- Move durable operating rules to `AGENTS.md`, `.mustflow/docs/agent-workflow.md`,
  or the matching configuration file instead of storing them here.

## Current Goal

Unset. Replace this with the current project goal when the project owner provides it.

## Non-Goals

Unset. List areas or objectives the agent should not pursue in unrelated tasks.

## Core Promises

- Follow `AGENTS.md` for mandatory operating rules.
- Treat `.mustflow/config/commands.toml` as the source of truth for commands.
- Treat `.mustflow/config/mustflow.toml` as the source of truth for workflow and document boundaries.
- Use `REPO_MAP.md` as a shallow navigation map when a broader repository overview is needed.

## Domain Terms

Unset. Add only terms that affect implementation decisions.

## Extra Care Areas

Unset. List paths, public APIs, generated files, migrations, secrets, or compatibility surfaces that require special attention.

## Read Next

- `AGENTS.md`
- `.mustflow/docs/agent-workflow.md`
- `.mustflow/config/mustflow.toml`
- `.mustflow/config/commands.toml`
- `.mustflow/skills/INDEX.md`

## Staleness Check

- If this file conflicts with current code, tests, command contracts, or user instructions, treat it as stale and report the conflict.
- Update this file only when the project direction, non-goals, or repository-wide promises actually change.
