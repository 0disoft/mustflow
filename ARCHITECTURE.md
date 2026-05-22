# Architecture

This file records repository structure decisions for maintainers and coding agents. It is descriptive guidance, not command authority. Run permissions remain in `.mustflow/config/commands.toml`.

## Current Layer Contract

- `src/cli/commands/**` owns argument parsing, command orchestration, exit behavior, and final text or JSON rendering.
- `src/cli/lib/**` owns CLI support code such as template installation, dashboard rendering, local indexes, repository-map generation, and command-line adapters.
- `src/core/**` owns deterministic decisions, contract models, policy checks, report assembly, identifiers, and small state calculations.
- Imperative edges such as process execution, filesystem writes, SQLite access, clocks, and platform behavior should stay in CLI or adapter-shaped modules unless a core module is explicitly a safe wrapper.

## Core Boundary Map

These are the intended first-level responsibility groups for future `src/core` moves. Do not move every file in one patch; move a group only when a real feature or behavior-preserving refactor needs that boundary.

| Future group | Responsibility | Current examples |
| --- | --- | --- |
| `contracts/commands/` | Command contract parsing, command eligibility, effects, environment policy, output limits, and contract validation. | `command-contract-validation.ts`, `command-effects.ts`, `command-env.ts`, `command-intent-eligibility.ts`, `success-exit-codes.ts` |
| `verification/` | Changed-file classification, verification planning, scheduling, completion verdicts, evidence models, repeated-failure analysis, and validation ratchets. | `change-verification.ts`, `verification-decision-graph.ts`, `verification-scheduler.ts`, `completion-verdict.ts`, `validation-ratchet.ts` |
| `anchors/` | Source-anchor discovery, symbols, status, explanation, and validation. | `source-anchors.ts`, `source-anchor-status.ts`, `source-anchor-validation.ts`, `source-anchor-symbols.ts` |
| `runs/` | Run receipts, bounded output, run profiling, write-drift detection, retention policy, handoff records, and state identifiers. | `run-receipt.ts`, `bounded-output.ts`, `run-profile.ts`, `run-write-drift.ts`, `retention-policy.ts`, `handoff-record.ts` |
| `versioning/` | Version source discovery, impact classification, sync policy, and release-version validation. | `version-sources.ts`, `version-impact.ts`, `version-sync-policy.ts`, `release-version-validation.ts` |
| `workflow/` | Skill route checks, authority explanations, dashboard verification snapshots, documentation review triage, and public-surface explanations. | `skill-route-alignment.ts`, `authority-resolution.ts`, `dashboard-verification.ts`, `doc-review-triage.ts`, `public-surface-explanation.ts` |
| `io-safety/` | Safe filesystem, TOML loading, line-ending inspection, secret redaction, and other low-level safety helpers. | `safe-filesystem.ts`, `config-loading.ts`, `toml.ts`, `line-endings.ts`, `secret-redaction.ts` |

## Move Policy

- Keep existing import paths until a concrete change needs a group boundary.
- Move one group at a time and keep compatibility wrappers when tests, CLI imports, or package contents depend on old paths.
- Do not introduce barrel exports just to hide a large move.
- Do not merge tiny single-source-of-truth modules unless they clearly change for the same reason as a larger group.
- Preserve public JSON fields, text output, exit codes, schema files, receipt paths, and template behavior during module moves.

## First Safe Moves

1. Extract helper modules inside the current file's area before changing directories.
2. Move pure policy groups before moving modules that read files, spawn processes, or write state.
3. Prefer `source-anchor-*` or versioning modules as the first directory move because their current file names already form clear groups.
4. Treat `verification-*`, `run-*`, and command-contract modules as higher-risk moves because several CLI commands and tests import them directly.

## Deferred Decisions

- Keep synchronous filesystem and Git access acceptable for short-lived CLI commands until mustflow exposes a long-running server, language-server, or dashboard backend library surface.
- Do not create browser-compatible or daemon-compatible core boundaries before that product surface exists.
- Do not reorganize `src/core` around line count alone; split only when parser, validation, planning, execution, receipt writing, rendering, or external-system responsibilities change for different reasons.

## Runtime Portability Boundary

Synchronous Node.js filesystem and child-process calls are an intentional CLI default when they keep one-shot commands deterministic and easy to audit. Do not convert them to asynchronous APIs as a style-only change.

Treat these modules as CLI-bound until a non-CLI runtime exists:

- modules that call `spawnSync`, inspect Git state, or depend on the local working tree;
- modules that read or write files through Node.js filesystem APIs;
- modules that persist run receipts, local indexes, performance samples, or generated state;
- safety wrappers such as `safe-filesystem.ts`, where path containment and symlink checks matter more than browser portability.

If mustflow later exposes a long-running server, language-server, hosted dashboard backend, or browser-compatible library surface, create that product boundary first. Then move deterministic decisions behind small ports and keep filesystem, Git, SQLite, clocks, and process execution in adapters. Do not promise portability by moving files alone.
