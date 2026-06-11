# Changelog

This changelog begins with the current mustflow development line. Earlier repository history is available in Git.

This file applies to the mustflow repository itself. It is not installed into user projects by `mf init`.

## Unreleased

## 2.37.1 - 2026-06-11

### Changed

- Strengthened the `tauri-code-change` skill for packaged WebView blank-screen failures caused by CSP blocking static frontend bootstrap scripts, including SvelteKit-style inline bootstrap handling, Tauri IPC `connect-src` scoping, and hotfix guidance that avoids broad script or protocol allowances.

## 2.37.0 - 2026-06-11

### Added

- Added the `ai-generated-code-hardening` skill so agents can harden AI-authored or broad code changes against duplicate helpers and shapes, hidden coupling, accidental re-exports, swallowed errors, complexity growth, weak tests, and uncontracted enforcement drift.

## 2.36.0 - 2026-06-11

### Added

- Added the `proactive-risk-surfacing` skill so agents can classify scope-adjacent risks as fix now, report only, ask first, or ignore instead of either staying too literal or drifting into unrelated cleanup.

## 2.35.3 - 2026-06-11

### Added

- Added the `backend-reliability-change` skill for backend idempotency, retry and timeout policy, health probes, database-enforced facts, observability hygiene, cache stampede prevention, queue outbox/inbox handling, DTO boundaries, object-level authorization, and rollout kill switches.

## 2.35.2 - 2026-06-11

### Changed

- Strengthened Rust and version-freshness skills for Rust MSRV gates, Rust 1.95/1.96 standard-library APIs, Cargo workspace and resolver behavior, initialization primitives, allocation traps, unsafe lints, release-profile tuning, and stable-versus-nightly wording.

## 2.35.1 - 2026-06-11

### Changed

- Strengthened Go and version-freshness skills for Go language-version gates, goroutine leaks, context causes, HTTP timeouts, reverse proxies, JSON tags, container runtime limits, race detection, PGO, benchmarks, tool directives, and experimental Go features.

## 2.35.0 - 2026-06-11

### Added

- Added the `http-delivery-streaming` skill for HTTP content coding, zstd and dictionary negotiation, CDN/proxy cache behavior, SSE, WebTransport, browser fallback, reconnect, buffering, and delivery observability.

### Changed

- Cross-linked API contract, performance budget, adapter boundary, auth permission, and version freshness skills to treat HTTP delivery, streaming, and browser transport behavior as explicit contract, security, performance, and freshness surfaces.

## 2.34.0 - 2026-06-11

### Added

- Added the `service-boundary-architecture` skill for service/module boundary design, data ownership, failure flows, queues, idempotency, tenancy, observability, and operational recovery.

### Changed

- Strengthened Tailwind, UnoCSS, CSS, HTML, and frontend render-stability skills with current browser-native, extraction, and CSS-first configuration checks.
- Strengthened TypeScript, dependency-upgrade, and version-freshness skills for TypeScript 6 transition releases, TypeScript 7 native-preview beta work, `tsgo` comparison, declaration emit drift, and compiler-track adoption risk.

## 2.33.0 - 2026-06-11

### Added

- Added the `frontend-render-stability` product-profile skill so agents diagnose navigation flicker, theme flash, hydration flash, blank first render, loading layout shifts, and route-transition jank from the visible render phase before changing framework, CSS, or data-loading code.

## 2.32.1 - 2026-06-11

### Changed

- Reframed mustflow documentation to allow optional runtime, work-item, adapter, coordination, and harness surfaces when explicit lifecycle and safety contracts exist.

## 2.32.0 - 2026-06-06

### Added

- Added the `heuristic-candidate-selection` skill so agents use cheap repository signals, scoring, sampling, and bounded batches before reading or editing broad file sets.

### Changed

- Strengthened security review and regression-test skills for scanner-driven incomplete escaping or encoding fixes.

### Fixed

- Fully encoded npm registry package lookup paths before release availability checks.

## 2.31.0 - 2026-06-05

### Added

- `mf onboard commands` now suggests review-only command-intent snippets from package.json, Makefile, and justfile without writing files or granting command authority.
- The `performance-budget-check` skill now starts performance investigations from numeric user-visible budgets, wall-time breakdowns, CPU-versus-wait classification, saturation signals, and resource bottleneck classes before choosing fixes.
- The `performance-budget-check` skill now ranks performance work by user-perceived latency, tail-latency stability, server cost, DB/API round trips, query plans, caches, queues, payloads, media delivery, and shared-resource bottlenecks before micro-optimizing.
- The `performance-budget-check` skill now covers Big-O constant-factor traps, CPU cache locality, hash and comparator costs, client/session churn, streaming boundaries, bounded async work, and language-specific LLM performance smells.
- `mf next` now reports the next safe mustflow action from install health, changed-file verification requirements, runnable configured intents, and command-contract gaps.
- `mf api serve --stdio` now serves read-only API reports as newline-delimited JSON responses without executing configured commands or exposing raw output.
- `mf workspace status` now reports configured workspace roots and nested repository command-contract readiness without granting parent-to-child command authority, `mf workspace command-catalog --json` aggregates per-root intent availability without exposing raw command strings, and `mf workspace verify --changed --plan-only --json` aggregates per-root verification plans without running commands.
- `mf evidence` now summarizes changed-file verification requirements, latest bounded evidence, receipts, remaining risks, and command-contract gaps without running commands.
- Profile-aware skill installation for `mf init` now lets the default `minimal` profile install only core everyday coding skills. Broader profiles can opt into maintainer, team, product, web, and library skill groups from the same packaged template.
- `mf check --strict` now validates optional candidate path-classification files at `.mustflow/config/changes.toml` and `.mustflow/config/surfaces.toml` without making them active command authority.
- `mf handoff validate <path>` now validates restricted work-item or handoff JSON records without writing files, storing transcripts, or granting command authority.
- Verification decision graph output for `mf verify --plan-only --json`, `mf explain verify --json`, and dashboard verification snapshots, linking changed surfaces, classification reasons, command candidates, eligibility, effects, and gaps in one machine-readable evidence model.
- Command-effect graph JSON now marks local SQLite lock and conflict explanations as `explanation_only` with `.mustflow/config/commands.toml` as the only command-authority source.
- `mf adapters status` now reports repository-visible host adapter files, command-authority boundaries, and required instruction-conflict fixes without generating adapter files.
- The `architecture-deepening-review` profile skill so OSS, team, and library projects can rank structural improvement candidates before choosing a refactor or abstraction.
- The `release-notes-authoring` profile skill so OSS and library projects can draft public notes from verified local evidence without inventing release history.
- The `vertical-slice-tdd` default skill so explicit TDD requests stay in small observable RED/GREEN behavior slices without forcing test-first work on every task.
- The `source-freshness-check` skill now covers external research intake so outside methodology notes are split into evidence, recommendations, executable instructions, and repository-native adoption targets.
- The `version-freshness-check` default skill so agents verify external version references against repository policy and approved upstream evidence before writing stale framework, runtime, CI action, Docker, package, or scaffold defaults.
- The `sqlite-code-change` and `postgresql-code-change` default skills so agents check engine-specific runtime, concurrency, schema, query, migration, backup, and version-freshness risks before changing SQLite or PostgreSQL behavior.
- The `external-skill-intake` skill now defers web-testing and session-handoff proposals unless they fit configured one-shot verification or restricted ledger boundaries.
- The `date-number-audit` skill now classifies release version impact from explicit public-contract tags before choosing `major`, `minor`, `patch`, or `no_release`.
- The `test-design-guard` default skill so agents classify RED evidence, choose evidence-backed test shapes, and avoid speculative or mock-only test coverage.
- A configured `test_audit` command intent backed by a read-only JSON test audit script for focused-test and empty-test-file signals.
- Test audit warning signals for oversized mixed-surface test files and mock-only behavior candidates.
- A configured `test_coverage` command intent backed by a fast CLI coverage run using Node's built-in coverage report, with no enforced thresholds and `MUSTFLOW_TEST_COVERAGE_CONCURRENCY` for tuning local worker count.
- A shared command intent eligibility core decision so verification planning and `mf run` use the same configured, one-shot, agent-allowed, closed-stdin, timeout, and command-source checks.
- A shared command cwd boundary resolver so `mf run` keeps command working directories inside the current mustflow root through a reusable core policy.
- A conditional version sync policy that fails strict checks if template versions are ahead of the package, requires equality when installed template files change, and warns when CLI-only releases intentionally keep the template version older.
- A thin internal surface decision model so change classification, verification planning, source anchors, document review, and command intents can share target, reason, surface, and authority vocabulary without creating a broad policy API.
- Release-priority triage added to `mf docs review list --json` so pending documentation is classified as P0, P1, or P2 with release-blocking status and a machine-readable triage reason.
- A public JSON schema contract manifest so release tests compare schema files, schema documentation, package contents, and installed-package JSON command output from one declared surface.
- Command `resources` and `effects` contract metadata plus verification scheduling so plan-only verification can explain resource locks and serial ordering without making `mf run` parallel.
- Command-effect rows added to the local SQLite index so `mf search` can find command intents by resource locks, effect paths, and effect modes.
- Skill-route rows added to the local SQLite index so `mf search` can find matching skill procedures by route triggers and risks while showing their verification intents as metadata.
- A local-index storage-boundary test to ensure the SQLite cache keeps only approved lookup tables and does not grow into a memory store or audit log.
- An explicit `Refresh command: mf index` hint for stale local-index search failures.
- Tightened local-search coverage so all-scope source-anchor results remain navigation-only and cannot instruct agents.
- Verification plan order added to `mf dashboard` so the read-only verification tab shows copied commands, command effects, resource locks, and serial batches without running anything.
- Previous-snapshot source anchor status comparison for `mf index --source` so moved, changed, review-needed, and stale anchors are recorded in the local SQLite index without turning anchors into verification authority.
- Invalid source anchors excluded from the local SQLite source anchor tables so malformed anchors remain strict validation issues instead of cached navigation metadata.
- The `multi-agent-work-coordination` default skill so agents can keep parallel worker roles, write ownership, credentials, and merge responsibility explicit before using multiple AI workers.
- The `requirement-regression-guard` default skill so agents map requirements to regression coverage before or during implementation.
- The `behavior-preserving-refactor` default skill so agents can refactor with explicit behavior evidence, safe ordering, duplication judgment, and verification boundaries.
- Configurable refactoring hotspot thresholds and candidate limits added to preferences and `mf dashboard` settings, with documented low-cost candidate narrowing in the behavior-preserving refactor skill.
- Repository contribution, security, and changelog documents for mustflow maintainers and contributors.
- Repository CI, issue templates, and a pull request template for mustflow maintainer workflows.
- Renovate configuration for dependency update pull requests without automatic merging.
- A trusted npm publishing workflow for GitHub Releases with provenance attestations and no long-lived npm token.
- CodeQL analysis for JavaScript/TypeScript source and GitHub Actions workflows.
- GitHub Actions hygiene checks with actionlint and zizmor.
- OpenSSF Scorecard supply-chain security analysis.
- OSV-Scanner dependency vulnerability checks.
- Execution-free verification plan JSON output for `mf verify --plan-only --json`.
- Source anchor fingerprint and status tables added to the local SQLite index so source navigation hints can carry derived status signals without becoming command authority.
- Derived source anchor symbol fingerprints for functions, classes, methods, constants, signatures, and bodies in the local SQLite index.
- Explicit authority-boundary guidance added to installed project context templates.
- `mf docs review` to track LLM-created or LLM-modified documentation needing prose review, with open-ended reviewer metadata and JSON output.
- A document review tab in `mf dashboard` for filtering pending documentation and marking entries approved, ignored, or needing additional review.
- A read-only status tab in `mf dashboard` for installation, manifest lock, template, command, latest-run, and documentation-review counts.
- A read-only command tab in `mf dashboard` for configured, manual-only, and blocked command intent details from `.mustflow/config/commands.toml`.
- The `docs-prose-review` skill so human or LLM reviewers can clean up queued documentation prose and record the review result.
- Multiline review comments for documentation review queue entries, with CLI support for inline comments, comment files, and automatic cleanup of imported comment files.
- `mf version --check` to compare the installed CLI package version with the latest npm release and print an update command when a newer version is available.
- Installed agent guidance to prefer the narrowest configured verification intent that covers the changed risk before running slow full-suite tests.
- The `codebase-orientation` default skill and strengthened default skill guidance for pre-change risk checks, accessibility, and localization review.
- The `visual-review-artifact` default skill with a static HTML review template for safe plan, suggestion, review, flow, and decision artifacts.
- The `structure-discovery-gate` default skill so agents ask only structure-changing questions before introducing new folders, file boundaries, routing, data models, or external service integration boundaries.
- The `repo-improvement-loop` default skill for evidence-based repository improvement cycles with ranked candidates, one scoped change, verification, and a next improvement question.

### Changed

- Reorganized README and documentation-site entry points around the no-guessing workflow contract, showing change classification, execution-free verification planning, command receipts, navigation-only source anchors, and dashboard non-execution boundaries before deeper reference material.
- Strengthened the `ui-quality-gate` skill with task-essential control, keyboard and focus, accessible state, responsive text, localization, performance, and bounded visual-verification checks.
- Strengthened the `performance-budget-check` skill with hot-path cost-multiplier review, N+1 and fan-out detection, allocation and serialization checks, UI rendering boundaries, cache discipline, backpressure, cancellation, and measurement wording.

### Fixed

- Dashboard and context command summaries now reuse the shared command eligibility rules, so shell intents without `allow_shell = true` and other blocked command shapes do not appear runnable.
- `mf search` now caps every returned `results[].match` preview so long queries or metadata matches cannot expand into unbounded output.
- Strict validation now catches package and default-template manifest version drift when template version synchronization is enabled.
- Source anchor validation prevents authority-like anchor text from claiming permission to skip validation or change command policy.
- `mf dashboard` language switching now updates the current status tab content immediately without requiring a reload or tab switch.
- Clarified `mf dashboard` Git preference labels and command-intent status text so `manual_only` commands appear as requiring a user request instead of as broken or unavailable commands.

### Notes

- Keep changelog entries focused on user-visible CLI behavior, installed template changes, schemas, command contracts, documentation surfaces, packaging, and maintenance policy.
- Do not record internal refactors unless they affect a public contract, release process, or contributor workflow.
- When preparing a release, move relevant entries from `Unreleased` into a versioned section and keep version sources synchronized according to `.mustflow/config/preferences.toml` `[release.versioning]`.
