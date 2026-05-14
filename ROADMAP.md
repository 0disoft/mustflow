# mustflow Roadmap

Last reviewed: 2026-05-14

This roadmap lists only remaining work. Completed items are removed after verification so agents can focus on upcoming decisions instead of reviewing project history.

## Deferred Milestones

### Deferred: SQLite-backed Search and Verification Read Model

Goal: evolve the local SQLite cache from a simple table-backed lookup store into a safer, faster read model for search, classification explanations, verification planning, and dashboard inspection.

This remains useful, but it should now support the verification decision graph instead of becoming its own product center.

- The source of truth must remain current repository files.
- SQLite remains a rebuildable local cache under `.mustflow/cache/`.
- Deleting `.mustflow/cache/mustflow.sqlite` must never lose project truth.
- Do not store full documents, full source files, raw command logs, chat transcripts, hidden reasoning, secrets, or personal data.
- Preserve `authority_rank`, `authority_label`, `navigation_only`, `can_instruct_agent`, `cache_layer`, and `volatile` semantics in every search-result path.
- Keep source anchors opt-in for indexing and navigation-only in results.
- Keep path classification rules canonical in TypeScript until a narrow, validated configuration contract exists.

## Non-Goals

- Do not make mustflow an autonomous agent runtime.
- Do not add multi-agent orchestration, persona fleets, background workers, or always-on agent loops.
- Do not make `mf init` generate application source code.
- Do not make `mf init` generate CI, GitHub, GitLab, `Makefile`, `justfile`, or package-manager files by default.
- Do not treat `.mustflow/cache/` or `.mustflow/state/` as versioned project truth.
- Do not make SQLite a memory store, audit log, command transcript store, or hidden reasoning store.
- Do not add broad memory storage, full transcript storage, raw event logs, or personal productivity tracking.
- Do not add broader dashboard, registry, work-item, handoff, or adapter features before establishing matching contract, explanation, and verification foundations.
- Do not add dashboard controls that execute commands, apply fixes, start agents, merge branches, push changes, or update files automatically.
- Do not introduce a broad `policy.toml` that weakens built-in rules, grants command permission, skips validation, or instructs agents.
- Do not add a public skill marketplace or community registry until trust, packaging, provenance, and review boundaries are explicit.
- Do not install, vendor, or execute third-party skill packs by default.
- Do not make external skill installers, SaaS automation skills, or framework-specific skill packs part of the default mustflow workflow.
- Do not make live AI evaluation, network access, or external service credentials required for the default quality gate.

## Decision Notes

- The default installed project surface should remain small: `AGENTS.md`, `.gitignore`, and `.mustflow/**`.
- Public documentation should distinguish this repository’s own open source operations from files installed into user projects.
- Optional skills may ship in the package without being copied into every new project by default.
- SQLite cache rows should explain current repository files and routing decisions, not preserve history or memory.
- Shared core models should connect existing contracts with small identifiers and reasons; they should not force every contract into one report type.
- A future path-classification config may add validation reasons, but `commands.toml` remains the sole source of runnable command authority.
- Verification explanation should come before convenience commands. Convenience must not outrun safety.
- Static reports should read the decision model; they should not define their own command-selection logic.
- Harness evaluation should begin as deterministic fixture regression, not as costly live-agent benchmarking.
- External harness-engineering resources can inspire direction, but mustflow's source of truth remains repository-local contracts, tests, templates, and current files.
- External skill repositories can inspire procedure improvements, but adopted skills must be rewritten into mustflow's canonical skill format and command-contract boundary.
- Skill import should start as review and adaptation, not installation automation.
