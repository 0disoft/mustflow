---
title: .mustflow/context/PROJECT.md
description: Documents project goals, non-goals, terminology, and repository-wide conventions for agents.
---

`.mustflow/context/PROJECT.md` is the default project context file provided by `mf init`.

It is intended to remain concise. It does not serve as a comprehensive architecture document, roadmap, API reference, meeting log, or archive for generated summaries.

## Usage

- **Project Direction**: Provides agents with project-level context when a task might impact scope, behavior, or established conventions.
- **Scope Control**: Defines non-goals to prevent agents from pursuing out-of-scope or unrelated work.
- **Decision Support**: Specifies domain terminology and sensitive areas that influence implementation decisions.

## Authority

The default authority level is `contextual`.

This indicates that while the file assists in orienting the agent, it remains secondary to direct user instructions, current code, tests, command contracts, and configured policies.

In the event of a conflict with the current repository state, agents should report the discrepancy and treat the context as stale.

## Sections

- `Current Goal`: The primary project objective. Leave as "Unset" rather than assuming or fabricating a goal.
- `Non-Goals`: Objectives or areas that agents should avoid pursuing during unrelated tasks.
- `Core Promises`: Repository-wide conventions or guarantees that agents must uphold.
- `Domain Terms`: Terminology that informs technical and implementation decisions.
- `Extra Care Areas`: Specific paths, APIs, generated files, or secrets that require special attention or caution.
- `Read Next`: References to documents that should be processed after this context file.
- `Staleness Check`: Guidelines for identifying when this document is outdated.

