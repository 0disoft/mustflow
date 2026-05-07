---
title: Instruction refresh
description: Why mustflow uses refresh checkpoints instead of project-file session counters.
---

Long-running agent sessions can drift away from the instructions read at the start. Tool output,
large diffs, context compaction, and nested repository changes can all make the initial `AGENTS.md`
less visible.

mustflow handles this with refresh checkpoints.

## What It Solves

- Agents can reread the right instruction files before risky actions.
- Command execution can refresh `commands.toml` instead of relying on memory.
- Root changes can force rereading the nearest `AGENTS.md`.
- Final reports can confirm the reporting rules before summarizing work.

## What It Avoids

mustflow does not write turn counters, message counts, or session activity into project files.

That state would dirty Git, collide across multiple agents, and expose activity metadata. If a host
application tracks session age, it should store that state in local cache or host-managed storage.

## Refresh Levels

- `light`: reread `AGENTS.md` and `agent-workflow.md`.
- `command`: reread `AGENTS.md` and `commands.toml`.
- `skill`: reread `AGENTS.md` and `skills/INDEX.md`.
- `full`: reread the full mustflow reading order.

The source of truth is `.mustflow/config/mustflow.toml` `[refresh]`.

## CLI Direction

Future commands such as `mf orient` and `mf refresh` can expose this policy as a machine-readable
plan. The current template starts with the policy and documentation so hosts can adopt it without
mustflow pretending every tool has the same lifecycle hooks.
