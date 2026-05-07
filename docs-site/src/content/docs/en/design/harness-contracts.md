---
title: Harness Contracts
description: How mustflow supports long-running agent harnesses without becoming a harness itself.
---

mustflow does not host autonomous long-running agents. It provides agent harnesses with a
repository-local contract they can read and validate.

## Boundary

- mustflow does not spawn workers, personas, fleets, or cloud sandboxes.
- mustflow does not store unbounded raw session logs.
- mustflow is not a replacement for hosted agent platforms or IDE agents.
- mustflow defines rules, command contracts, refresh checkpoints, compaction policies, receipts,
  budgets, approvals, and handoff boundaries.

## Brain, Hands, Session

- Brain: `AGENTS.md`, `agent-workflow.md`, and `skills/*/SKILL.md`.
- Hands: `commands.toml`, finite command lifecycles, and `mf run`.
- Session: bounded run receipts, optional checkpoints, source-linked summaries, compact handoffs, and regenerated indexes.
- Judge: original acceptance criteria, changed files, command contracts, and receipts.

This framing ensures that mustflow remains tool-neutral. A host can run a single chat session, a
background cloud agent, or an external orchestration loop, while the repository contract remains
readable.

## Adopted Now

- Policy fields in `.mustflow/config/mustflow.toml`: `[harness]`, `[budget]`, `[approval]`, and
  `[isolation]`.
- Verification ratchet rules in `agent-workflow.md`.
- Refresh checkpoints, tiered compaction policy, and bounded retention.

Compacted summaries serve as lower-priority auxiliary memory. Current user instructions, current
files, command contracts, and run receipts override them. mustflow does not store hidden chains of
thought or full chat transcripts in the project.

## Deferred

`completion-judge`, work items, handoff writing commands, checkpoint commands, and autonomous loops
remain optional future capabilities. They should not appear in the default template until the contracts
they depend on are stable.
