# mustflow Roadmap

Last reviewed: 2026-05-18

This roadmap lists only remaining work. Completed items are removed after verification so agents can focus on upcoming decisions instead of reviewing project history.

This file is a planning surface, not current product behavior. Items below are research-backed candidates from repository-local discussion and user-provided AI review notes. Before implementation, re-check current source, command contracts, schemas, tests, and documentation instead of treating this roadmap as execution authority.

## Product Direction

mustflow should become a repository-local safety layer for AI coding work: it should make agents explain what they read, which commands are allowed, why a verification path was chosen, and what evidence remains. It should not become an autonomous agent runtime, task runner replacement, project management system, or broad memory store.

Strong product framing to preserve:

- mustflow is an agent work contract and verification layer, not an agent runtime.
- `AGENTS.md` starts the workflow, but `.mustflow/config/commands.toml` remains the only source of runnable command authority.
- Skills guide procedure; they never grant command permission.
- mustflow should coexist cleanly with agent hosts and coding agents such as Codex, Claude Code, OpenClaw,
  Hermes Agent, and future tools. Installing mustflow in a repository should add repository-local read,
  command, and verification boundaries without fighting the host's own sandbox, approval, checkpoint,
  model, or tool policies.
- SQLite, dashboard exports, run receipts, handoff records, and evidence artifacts may explain current state; they must not become project truth or hidden memory.
- Convenience must follow explanation. A feature that makes work faster is only acceptable after it preserves authority, safety, and verification evidence.

## Non-Goals

- Do not make mustflow an autonomous agent runtime.
- Do not add multi-agent orchestration, persona fleets, background workers, or always-on agent loops.
- Do not make `mf init` generate application source code.
- Do not make `mf init` generate CI, GitHub, GitLab, `Makefile`, `justfile`, or package-manager files by default.
- Do not treat `.mustflow/cache/` or `.mustflow/state/` as versioned project truth.
- Do not make SQLite a memory store, audit log, command transcript store, source-content database, or hidden reasoning store.
- Do not add broad memory storage, full transcript storage, raw event logs, or personal productivity tracking.
- Do not store performance history as raw run receipts, command transcripts, log tails, stack traces, environment values, absolute paths, or test-name histories.
- Do not add dashboard controls that execute commands, apply fixes, start agents, merge branches, push changes, or update files automatically.
- Do not introduce a broad `policy.toml` that weakens built-in rules, grants command permission, skips validation, or instructs agents.
- Do not add a public skill marketplace or community registry until trust, packaging, provenance, and review boundaries are explicit.
- Do not install, vendor, or execute third-party skill packs by default.
- Do not add external-skill review, adapter reconciliation, work-item lifecycle, task-routing, failure-triage, freshness, evidence-pack, or harness-synthesis commands unless an existing surface cannot safely cover the need.
- Do not make external skill installers, SaaS automation skills, or framework-specific skill packs part of the default mustflow workflow.
- Do not make live AI evaluation, network access, or external service credentials required for the default quality gate.
- Do not require host-specific agent features, overwrite host-specific instruction files, or assume one coding
  agent's sandbox, approval, memory, or tool model is the mustflow default.
- Do not let performance history, local indexes, cache hits, or historical failure absence authorize command execution or prove that verification can be skipped.
- Do not infer user-project test subsets from package-manager scripts, framework conventions, filenames, or generic mustflow heuristics unless the project has declared that selection contract.
- Do not run commands in parallel merely because `writes = []`; require explicit effects and non-conflicting resource locks.

## Decision Notes

- The default installed project surface should remain small: `AGENTS.md`, `.gitignore`, and `.mustflow/**`.
- Public documentation should distinguish this repository's own open source operations from files installed into user projects.
- Optional skills may ship in the package without being copied into every new project by default.
- SQLite cache rows should explain current repository files and routing decisions, not preserve history or memory.
- Shared core models should connect existing contracts with small identifiers and reasons; they should not force every contract into one report type.
- A future path-classification config may add validation reasons, but `commands.toml` remains the sole source of runnable command authority.
- Verification explanation should come before convenience commands. Convenience must not outrun safety.
- Static reports should read the decision model; they should not define their own command-selection logic.
- Verification performance work should optimize the selected set, startup responsiveness, and safe scheduling in that order. It should not hide uncertainty behind faster-looking defaults.
- Runtime and performance history may influence ordering and recommendations among already-authorized commands, but never command authority.
- Host compatibility is a product requirement, not an adapter marketplace promise. Prefer neutral repository
  contracts that Codex, Claude Code, OpenClaw, Hermes Agent, and similar tools can read without extra setup.
- External harness-engineering resources can inspire direction, but mustflow's source of truth remains repository-local contracts, tests, templates, and current files.
- External skill repositories can inspire procedure improvements, but adopted skills must be rewritten into mustflow's canonical skill format and command-contract boundary.
