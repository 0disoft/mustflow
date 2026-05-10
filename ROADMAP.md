# mustflow Roadmap

Last reviewed: 2026-05-10

This roadmap lists remaining work only. Completed items are removed after
verification so agents can spend context on the next decisions instead of
reading project history.

## Current Priority

No active near-term implementation milestone is tracked here.

Completed items are removed after verification. Add a new milestone only when
there is a concrete remaining contract, verification, or documentation gap to
close.

Open command-contract follow-up: defer asset optimization until there is a real
repository pipeline.

Contract-surface follow-up: keep shared surface decisions as internal vocabulary
only. Do not collapse document review, source anchors, command permissions, and
dashboard display into one large policy object.

## Deferred Milestones

### Deferred: Path Classification Policy

Goal: leave repository-specific path classification configurable only after the
core model is stable and permission boundaries are enforceable.

- Do not add a broad `policy.toml` now.
- If repository-specific classification becomes necessary, prefer a narrow
  `.mustflow/config/surfaces.toml` or `.mustflow/config/changes.toml` contract.
- Allow only path-classification augmentation fields such as rule id, match,
  surface kind, public-surface flag, validation reasons, affected contracts,
  update policy, and drift checks.
- Start with `exact`, `prefix`, or `glob` path matches. Defer regular
  expressions until review and validation rules are stronger.
- Forbid command authority fields such as `argv`, `cmd`, `run_policy`,
  `lifecycle`, `stdin`, `timeout_seconds`, `writes`, `network`, `destructive`,
  `required_after`, `skip_validation`, and agent action directives.
- Treat added validation reasons as input to `commands.toml`; they must not make
  any command runnable without the normal configured, oneshot, agent-allowed,
  closed-stdin, timeout, and command-source checks.

## Non-Goals

- Do not make mustflow an autonomous agent runtime.
- Do not make `mf init` generate application source code.
- Do not make `mf init` generate CI, GitHub, GitLab, `Makefile`, `justfile`, or
  package-manager files by default.
- Do not treat `.mustflow/cache/` or `.mustflow/state/` as versioned project
  truth.
- Do not make SQLite a memory store, audit log, command transcript store, or
  hidden reasoning store.
- Do not add broader dashboard, registry, or adapter work ahead of matching
  contract, explanation, and verification foundations.
- Do not add dashboard controls that execute commands, apply fixes, start
  agents, merge branches, push changes, or update files automatically.
- Do not introduce a broad `policy.toml` that can weaken built-in rules, grant
  command permission, skip validation, or instruct agents.

## Decision Notes

- The default installed project surface should remain small:
  `AGENTS.md`, `.gitignore`, and `.mustflow/**`.
- Public documentation should distinguish this repository's own open source
  operations from files installed into user projects.
- Optional skills may ship in the package without being copied into every new
  project by default.
- SQLite cache rows should explain current repository files and routing
  decisions, not preserve history or memory.
- Shared core models should connect existing contracts with small identifiers
  and reasons; they should not force every contract into one report type.
- A future path-classification config may add validation reasons, but
  `commands.toml` remains the only source of runnable command authority.
