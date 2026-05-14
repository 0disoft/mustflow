# mustflow Roadmap

Last reviewed: 2026-05-14

This roadmap lists only remaining work. Completed items are removed after verification so agents can focus on upcoming decisions instead of reviewing project history.

This file is a planning surface, not current product behavior. Items below are research-backed candidates from repository-local discussion and user-provided AI review notes. Before implementation, re-check current source, command contracts, schemas, tests, and documentation instead of treating this roadmap as execution authority.

## Product Direction

mustflow should become a repository-local safety layer for AI coding work: it should make agents explain what they read, which commands are allowed, why a verification path was chosen, and what evidence remains. It should not become an autonomous agent runtime, task runner replacement, project management system, or broad memory store.

Strong product framing to preserve:

- mustflow is an agent work contract and verification layer, not an agent runtime.
- `AGENTS.md` starts the workflow, but `.mustflow/config/commands.toml` remains the only source of runnable command authority.
- Skills guide procedure; they never grant command permission.
- SQLite, dashboard exports, run receipts, handoff records, and evidence artifacts may explain current state; they must not become project truth or hidden memory.
- Convenience must follow explanation. A feature that makes work faster is only acceptable after it preserves authority, safety, and verification evidence.

## Current Priority: Command Execution Safety

Goal: close the most realistic safety gaps before adding broader convenience features. These are high-priority because they protect the core promise that agents cannot safely guess or overclaim command execution.

- Add an explicit command environment policy for `mf run` and `mf verify`.
  - Problem: inherited process environment can expose secrets, personal settings, or host-specific state to repository commands.
  - Proposed shape: support a narrow policy such as `env_policy = "minimal" | "inherit" | "allowlist"` and an explicit allowlist for variables needed by package managers and continuous integration.
  - Default direction: prefer minimal or allowlist behavior for new command contracts; require explicit opt-in for broad inheritance.
  - Completion criteria: command planning output, run receipts, docs, tests, and schema descriptions all state the effective environment policy without printing secret values.
  - Verification: targeted `run` tests, schema tests, `lint`, `test_related`, and `mustflow_check`.
  - Do not: claim operating-system sandboxing or network isolation unless an actual isolation mechanism exists.

- Make actual `mf verify` execution follow the same schedule model as plan-only verification.
  - Problem: if `mf verify --plan-only` explains one order but actual execution uses another, lock and effect explanations lose trust.
  - Proposed shape: use `createVerificationSchedule` or the shared scheduling model for both plan-only output and execution order.
  - Completion criteria: plan-only schedule and actual execution order share one source of truth, including command-effect lock ordering and skipped candidates.
  - Verification: fixtures with conflicting writes, manual-only candidates, unknown candidates, and multiple runnable intents.
  - Do not: introduce parallel execution. `mf run` command intents should remain serial unless a future explicit scheduler contract is designed.

- Tighten `--from-plan` input validation.
  - Problem: flexible external JSON plans can inject validation reasons that lead to misleading verification candidates.
  - Proposed shape: introduce strict plan validation for `mf verify --from-plan`, requiring expected `schema_version`, producer identity, supported report kind, and path/hash evidence where available.
  - Migration approach: start with warning or `--strict-plan` if needed, then move to default strictness in a compatible release plan.
  - Completion criteria: invalid or hand-written loose plans cannot silently produce runnable verification claims; valid `mf classify` and `mf verify --changed --write-plan` outputs continue to work.
  - Verification: valid plan fixtures, invalid producer fixtures, stale-source fixtures, schema tests, and `test_related`.
  - Do not: remove useful plan-based workflows without a compatibility path.

- Detect declared-write drift in run receipts.
  - Problem: a command with `writes = []` can still modify files; today the command contract explains intended effects but does not prove actual write behavior.
  - Proposed shape: record a bounded before/after changed-file summary for command runs, then warn when observed writes do not match declared `writes` or `effects`.
  - First version: receipt warning only. Do not block execution until warning quality is proven.
  - Completion criteria: receipts distinguish declared writes, observed writes, undeclared writes, and unreadable status without storing raw command output beyond current limits.
  - Verification: temp-project fixtures with no write, declared write, undeclared write, and generated `dist/` write.
  - Do not: make mustflow a filesystem sandbox or store full file diffs in receipts.

- Redact or warn on secret-like values in run receipts and static exports.
  - Problem: bounded stdout/stderr tails can still contain secrets or personal data.
  - Proposed shape: add conservative secret-like detection and redaction metadata for receipts, dashboard exports, and other bounded static reports.
  - Completion criteria: receipt/output consumers can tell that redaction happened, but the sensitive value is not stored.
  - Verification: fixtures for token-like strings, false-positive-tolerant redaction, dashboard export sanitization, and schema validation.
  - Do not: promise perfect secret detection.

## Current Priority: Evidence and Contract Coverage

Goal: turn existing plans, receipts, schemas, and dashboard snapshots into compact evidence surfaces that reviewers and continuous integration jobs can trust.

- Strengthen `mf dashboard --export-json` as the bounded evidence surface.
  - Purpose: let pull requests, local reviews, and continuous integration jobs reuse one existing report instead of adding a second evidence command.
  - Inputs: changed-file classification, verification decision graph, runnable/skipped command candidates, latest run receipt summary, docs review status, version-source status, manifest/update status, and remaining risks.
  - Output: JSON first, with the existing static HTML renderer staying a thin view over the same JSON.
  - Safety boundary: do not include raw command logs, full chat transcripts, hidden reasoning, full source files, environment values, secrets, or personal data.
  - Completion criteria: dashboard export output has a public JSON schema, stable producer metadata, bounded string and array limits, redaction status, and tests proving it does not grant command authority.
  - Verification: schema tests, dashboard export fixture tests, `docs_validate_fast`, `test_related`, and `mustflow_check`.
  - Do not: add a parallel evidence-pack command, audit log, or long-term memory store.

- Extend `mf contract-lint` with coverage reporting.
  - Purpose: show whether validation reasons, public surfaces, command `required_after` entries, and runnable command intents form a complete verification contract without adding a new top-level command.
  - Proposed output: a matrix of `validation_reason -> command intents -> status -> gaps -> related skills/docs`.
  - Useful warnings: reason has no matching intent, matching intent is only `manual_only`, matching intent is `unknown`, release-sensitive paths lack release checks, docs changes lack docs validation, and important command intents are never selected.
  - Completion criteria: the command reports coverage gaps without running commands and without inventing new command authority.
  - Verification: command-contract fixtures, schema tests, `contract-lint` related tests, and `mustflow_check`.
  - Do not: auto-create command definitions or mark a gap as resolved without a configured oneshot command.

- Add JSON schema backward-compatibility fixtures.
  - Purpose: make public JSON output changes easier to classify as major, minor, patch, or no release.
  - Proposed shape: keep representative output fixtures from prior minor versions and validate whether current schemas remain compatible.
  - Completion criteria: release checks detect removed required fields, renamed fields, incompatible enum changes, and accidental schema/documentation drift.
  - Verification: `test_release`, schema tests, and package metadata tests.
  - Do not: treat every schema evolution as patch-level just because tests pass.

- Add stronger local-index storage allowlist tests.
  - Purpose: prevent SQLite from drifting into a memory store, audit log, transcript store, or source-content database.
  - Proposed checks: table and column allowlists, snippet length limits, match preview limits, no raw stdout/stderr, no environment values, no chat/transcript/reasoning fields, and no full source body storage.
  - Completion criteria: strict checks fail on forbidden local-index storage shapes and docs explain the boundary.
  - Verification: local-index tests, `mf check --strict` fixtures, and `docs_validate_fast`.
  - Do not: broaden indexed content to make search feel more powerful.

## Current Priority: Agent Orientation and Routing

Goal: reduce the first-minute guessing problem without creating new execution authority.

- Add skill route conflict linting.
  - Purpose: keep the growing skill index maintainable.
  - Proposed checks: overlapping triggers, duplicated edit scope, nearly identical risk language, missing expected output, skill body/index mismatch, and broad catch-all routes that shadow narrower skills.
  - Completion criteria: `mf check --strict` or a dedicated skill lint command reports actionable warnings without forcing unnecessary skill deletion.
  - Verification: duplicate route fixtures, missing body metadata fixtures, and `mustflow_check`.
  - Do not: make the router depend on an LLM to decide conflicts.

- Improve first-screen product positioning.
  - Purpose: explain mustflow in 10 seconds without making it sound like an agent runtime, project template generator, or CI replacement.
  - Candidate one-sentence framing: "mustflow is a repository-local work contract that keeps AI coding agents inside explicit read, command, and verification boundaries."
  - Completion criteria: README, docs-site landing text, and translated README surfaces distinguish agent work contract, command authority, and verification evidence without marketing bloat.
  - Verification: `docs_validate_fast`, link checks, and review of translated docs.
  - Do not: turn README into a roadmap or design history dump.

## Deferred Milestone: Local Index and Search Read Model

Goal: evolve the local SQLite cache from a simple table-backed lookup store into a safer, faster read model for search, classification explanations, verification planning, and dashboard inspection.

This remains useful, but it should support the verification decision graph instead of becoming its own product center.

- Keep source anchors opt-in for indexing and navigation-only in results.
- Preserve `authority_rank`, `authority_label`, `navigation_only`, `can_instruct_agent`, `cache_layer`, and `volatile` semantics in every search-result path.
- Keep local-index command-effect graphs marked as explanation-only.
- Keep path classification rules canonical in TypeScript until a narrow, validated configuration contract exists.

## Non-Goals

- Do not make mustflow an autonomous agent runtime.
- Do not add multi-agent orchestration, persona fleets, background workers, or always-on agent loops.
- Do not make `mf init` generate application source code.
- Do not make `mf init` generate CI, GitHub, GitLab, `Makefile`, `justfile`, or package-manager files by default.
- Do not treat `.mustflow/cache/` or `.mustflow/state/` as versioned project truth.
- Do not make SQLite a memory store, audit log, command transcript store, source-content database, or hidden reasoning store.
- Do not add broad memory storage, full transcript storage, raw event logs, or personal productivity tracking.
- Do not add dashboard controls that execute commands, apply fixes, start agents, merge branches, push changes, or update files automatically.
- Do not introduce a broad `policy.toml` that weakens built-in rules, grants command permission, skips validation, or instructs agents.
- Do not add a public skill marketplace or community registry until trust, packaging, provenance, and review boundaries are explicit.
- Do not install, vendor, or execute third-party skill packs by default.
- Do not add external-skill review, adapter reconciliation, work-item lifecycle, task-routing, failure-triage, freshness, evidence-pack, or harness-synthesis commands unless an existing surface cannot safely cover the need.
- Do not make external skill installers, SaaS automation skills, or framework-specific skill packs part of the default mustflow workflow.
- Do not make live AI evaluation, network access, or external service credentials required for the default quality gate.

## Decision Notes

- The default installed project surface should remain small: `AGENTS.md`, `.gitignore`, and `.mustflow/**`.
- Public documentation should distinguish this repository's own open source operations from files installed into user projects.
- Optional skills may ship in the package without being copied into every new project by default.
- SQLite cache rows should explain current repository files and routing decisions, not preserve history or memory.
- Shared core models should connect existing contracts with small identifiers and reasons; they should not force every contract into one report type.
- A future path-classification config may add validation reasons, but `commands.toml` remains the sole source of runnable command authority.
- Verification explanation should come before convenience commands. Convenience must not outrun safety.
- Static reports should read the decision model; they should not define their own command-selection logic.
- External harness-engineering resources can inspire direction, but mustflow's source of truth remains repository-local contracts, tests, templates, and current files.
- External skill repositories can inspire procedure improvements, but adopted skills must be rewritten into mustflow's canonical skill format and command-contract boundary.
