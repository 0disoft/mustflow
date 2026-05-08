# mustflow Roadmap

Last reviewed: 2026-05-08

This roadmap records the intended order of work for mustflow. It is a planning
document, not a release promise. The priority is to make mustflow a
repository-local workflow contract engine: a tool that can explain, judge, and
verify the rules that coding agents must follow inside a project.

## Current Priority

Make this repository a strong example of its own workflow contract.

Before adding larger product surfaces, mustflow should reliably run its own
configured command intents, produce useful receipts, and expose enough
structured policy information for future commands to share the same decisions.

## Near-Term Milestones

### M0: Self-Hosted Command Contract

Goal: ensure the mustflow repository itself can use mustflow without bypassing
the command contract.

Status: current repository checks configured.

- [x] Fix `mf run mustflow_check` so configured commands that invoke `mf` work
  reliably on Windows and other supported shells.
- [x] Declare the repository's actual development checks in
  `.mustflow/config/commands.toml` as configured one-shot intents after
  confirming the intended gates.
- [x] Keep direct shell command output lower authority than `mf run` receipts unless
  a manual override is explicitly reported.
- [x] Use this milestone to remove friction before building higher-level verification
  commands.

Note: `test_related`, `lint`, coverage, and test-audit intents remain unset or
manual-only until the repository has narrower gates for those workflows.

### M1: Contract Specification Documents

Goal: make mustflow's core rules inspectable and stable enough to test.

Status: initial versioned specification set added with documentation-site
discovery.

- [x] Add `docs/spec/README.md`.
- [x] Add `docs/spec/instruction-authority-v1.md` for effective rule resolution.
- [x] Add `docs/spec/command-contract-v1.md` for runnable command intent rules.
- [x] Add `docs/spec/verification-receipt-v1.md` for run receipt expectations.
- [x] Add `docs/spec/state-retention-v1.md` for cache, state, and raw-output
  retention boundaries.
- [x] Keep the documents concise, source-linked, and written as testable rules
  rather than broad philosophy.

### M2: JSON Output Schemas

Goal: make automation-facing JSON output safe for external tools to depend on.

Status: initial published schemas added and covered by CLI tests.

- [x] Add `schemas/doctor-report.schema.json`.
- [x] Add `schemas/context-report.schema.json`.
- [x] Add `schemas/run-receipt.schema.json`.
- [x] Add `schemas/commands.schema.json`.
- [x] Validate current `--json` outputs against these schemas in tests.
- [x] Treat schema changes as compatibility-sensitive.

### M3: Core Policy Modules

Goal: move shared decision logic out of command handlers without prematurely
promising a broad public API.

- Create focused internal modules under `src/core/` for authority resolution,
  command classification, configuration loading, receipt handling, and retention
  policy.
- Keep CLI commands thin by calling shared core functions.
- Export only the minimum surface needed internally until API stability is
  intentionally documented.
- Preserve the existing CLI behavior while reducing duplicated policy logic.

### M4: Explain Command

Goal: answer why a command, file, or policy decision is allowed, blocked, or
warned.

- Add `mf explain authority`.
- Add `mf explain command <command>`.
- Add `mf explain retention`.
- Add `mf explain --json`.
- Include the decision, reason, effective action, source files, and whether the
  action counts as mustflow verification.
- Reuse the same core policy modules used by `mf doctor`, `mf context`, and
  `mf run`.

### M5: Verify by Reason

Goal: turn `required_after` metadata in `.mustflow/config/commands.toml` into a
practical verification workflow.

- Add `mf verify --reason <event>`.
- Add `mf verify --json --reason <event>`.
- Resolve matching intents from `required_after`.
- Run only configured, one-shot, agent-allowed intents through `mf run`.
- Report unknown, manual-only, missing, and blocked intents as skipped with
  reasons.
- Produce a clear final result such as passed, partial, failed, or blocked.

## Supporting Milestones

### Examples and Fixtures

Goal: show real project shapes without making tests depend on presentation
examples.

- Add `examples/` for human-readable before/after project examples.
- Add `tests/fixtures/` for regression inputs.
- Cover minimal JavaScript projects, documentation-only projects, nested
  repositories, missing command contracts, and host instruction conflicts.
- Keep examples natural even when test fixtures need edge-case precision.

### Open Source Operations

Goal: make contribution and maintenance expectations explicit for this
repository without changing what `mf init` installs into user projects.

- Add `CONTRIBUTING.md`.
- Add `SECURITY.md`.
- Add `CHANGELOG.md`.
- Expand `.github/` with CI, issue templates, and a pull request template.
- Keep the default installed template thin: no generated CI, no generated
  platform-specific files, and no application source files.

## Later Candidates

### Skill Packs

Skill packs remain useful, but they should wait until the skill format, command
contract behavior, and validation boundaries are specified. Packs should affect
mustflow-owned workflow files only, such as `.mustflow/skills`,
`.mustflow/context`, and candidate command intents.

### Host Compatibility Scanner

Host compatibility should be reported without claiming authority over a specific
editor or agent product. A future scanner may detect host-like instruction
sources and explain how they interact with mustflow's repository-local contract.

### Dashboard

`mf dashboard` should stay behind the contract-engine work. A dashboard is
valuable only after mustflow can already explain and verify effective policy
from the command line.

## Non-Goals

- Do not make mustflow an autonomous agent runtime.
- Do not make `mf init` generate application source code.
- Do not make `mf init` generate CI, GitHub, GitLab, `Makefile`, `justfile`, or
  package-manager files by default.
- Do not treat `.mustflow/cache/` or `.mustflow/state/` as versioned project
  truth.
- Do not add dashboard, registry, or adapter work ahead of the contract,
  explanation, and verification foundations.

## Decision Notes

- The default installed project surface should remain small:
  `AGENTS.md`, `.gitignore`, and `.mustflow/**`.
- Public documentation should distinguish this repository's own open source
  operations from files installed into user projects.
- `mf check` should say whether mustflow files are valid.
- `mf doctor` should say what the current root state is.
- `mf explain` should say why an action is allowed, blocked, or warned.
- `mf verify` should say which checks are required for a given reason and run
  only those that the command contract allows.
