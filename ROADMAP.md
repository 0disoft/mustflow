# mustflow Roadmap

Last reviewed: 2026-05-12

This roadmap lists only remaining work. Completed items are removed after verification so agents can focus on upcoming decisions instead of reviewing project history.

## Current Priority

### SQLite-backed Search and Verification Read Model

Goal: evolve the local SQLite cache from a simple table-backed lookup store into a safer, faster read model for search, classification explanations, verification planning, and dashboard inspection.

The source of truth must remain the current repository files. SQLite remains a rebuildable local cache under `.mustflow/cache/`, not a memory store, audit log, command transcript store, source-content database, or command authority source.

Primary guardrails:

- Keep `AGENTS.md`, `.mustflow/config/commands.toml`, current code, tests, and source documents authoritative.
- Keep local index rows derived and rebuildable; deleting `.mustflow/cache/mustflow.sqlite` must never lose project truth.
- Keep bounded snippets only. Do not store full documents, full source files, raw command logs, chat transcripts, hidden reasoning, secrets, or personal data.
- Preserve `authority_rank`, `authority_label`, `navigation_only`, `can_instruct_agent`, `cache_layer`, and `volatile` semantics in every search-result path.
- Keep source anchors opt-in for indexing and navigation-only in results. They must not define workflow rules, command permission, verification authority, or agent instructions.
- Keep `commands.toml` as the only source of runnable command authority. SQLite views may explain command effects and conflicts, but they must not make an intent runnable.
- Keep path classification rules canonical in TypeScript until a narrow, validated configuration contract exists.

No active implementation items remain in this priority area.

Completed items are removed after verification. Add a new milestone only when there is a clear remaining contract, verification, or documentation gap to close.

Open command-contract follow-up: defer asset optimization until a real repository pipeline exists.

Contract-surface follow-up: keep shared surface decisions as internal vocabulary only. Do not combine document review, source anchors, command permissions, and dashboard display into a single large policy object.

## Deferred Milestones

### Deferred: Path Classification Policy

Goal: keep repository-specific path classification configurable only after the core model stabilizes and permission boundaries can be enforced.

- Do not add a broad `policy.toml` now.
- If repository-specific classification becomes necessary, prefer a narrow `.mustflow/config/surfaces.toml` or `.mustflow/config/changes.toml` contract.
- Allow only path-classification augmentation fields such as rule id, match, surface kind, public-surface flag, validation reasons, affected contracts, update policy, and drift checks.
- Start with `exact`, `prefix`, or `glob` path matches. Defer regular expressions until review and validation rules are stronger.
- Forbid command authority fields such as `argv`, `cmd`, `run_policy`, `lifecycle`, `stdin`, `timeout_seconds`, `writes`, `network`, `destructive`, `required_after`, `skip_validation`, and agent action directives.
- Treat added validation reasons as input to `commands.toml`; they must not make any command runnable without the usual configured checks: oneshot, agent-allowed, closed-stdin, timeout, and command-source validation.

## Non-Goals

- Do not make mustflow an autonomous agent runtime.
- Do not make `mf init` generate application source code.
- Do not make `mf init` generate CI, GitHub, GitLab, `Makefile`, `justfile`, or package-manager files by default.
- Do not treat `.mustflow/cache/` or `.mustflow/state/` as versioned project truth.
- Do not make SQLite a memory store, audit log, command transcript store, or hidden reasoning store.
- Do not add broader dashboard, registry, or adapter features before establishing matching contract, explanation, and verification foundations.
- Do not add dashboard controls that execute commands, apply fixes, start agents, merge branches, push changes, or update files automatically.
- Do not introduce a broad `policy.toml` that weakens built-in rules, grants command permission, skips validation, or instructs agents.

## Decision Notes

- The default installed project surface should remain small: `AGENTS.md`, `.gitignore`, and `.mustflow/**`.
- Public documentation should distinguish this repository’s own open source operations from files installed into user projects.
- Optional skills may ship in the package without being copied into every new project by default.
- SQLite cache rows should explain current repository files and routing decisions, not preserve history or memory.
- Shared core models should connect existing contracts with small identifiers and reasons; they should not force every contract into one report type.
- A future path-classification config may add validation reasons, but `commands.toml` remains the sole source of runnable command authority.
