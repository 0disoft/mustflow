---
title: Harness Contracts
description: How mustflow supports optional long-running agent harnesses while keeping lifecycle and safety boundaries explicit.
---

mustflow starts with repository-local workflow and command boundaries. It can also support optional
long-running harnesses when lifecycle, approval, isolation, retention, and verification rules are explicit.

## Boundary

- The default template does not spawn workers, personas, fleets, or cloud sandboxes.
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

## Expansion Candidates

`completion-judge`, work items, handoff writing commands, checkpoint commands, and autonomous loops
are expansion candidates. They can move into the template or CLI when their schemas, command
contracts, retention rules, and human decision boundaries are stable.
