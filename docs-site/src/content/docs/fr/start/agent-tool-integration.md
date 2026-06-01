---
title: Build an agent/tool integration
description: Connect an AI coding tool or harness to mustflow through neutral repository-local contracts.
---

Use this path when you build an AI coding tool, agent harness, editor integration, or automation that needs stable mustflow data.

## Read

- Start from `AGENTS.md`.
- Use `mf context --json` for machine-readable repository orientation.
- Treat host-specific instruction files as compatibility inputs, not command authority.

## Plan and Verify

```sh
mf api workspace-summary --json
mf api serve --stdio
mf classify --changed --json
mf verify --reason code_change --plan-only --json
mf run <intent> --json
```

Use JSON outputs and schemas instead of parsing human-facing terminal text. Published schemas live in `schemas/`.

## Authority Boundary

`.mustflow/config/commands.toml` is the only source of runnable command authority. Search results, local indexes, generated maps, preferences, context files, and run state are explanatory data only.
