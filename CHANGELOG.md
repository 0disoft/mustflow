# Changelog

This changelog begins with the current mustflow development line. Earlier repository history is available in Git.

This file applies to the mustflow repository itself. It is not installed into user projects by `mf init`.

## Unreleased

### Added

- Added the `memory-lifetime-review` skill so agents can trace retained owners, setup/cleanup symmetry, listener and timer teardown, async cancellation, bounded caches and queues, native resources, and repeated-lifecycle leak evidence.
- Added the `hot-path-performance-review` skill so agents can review repeated ordinary work, external round trips, hidden quadratic scans, lock or pool waits, cache stampedes, retry multiplication, and missing hot-path observability before broader tuning.
- Added the `api-request-performance-review` skill so agents can review API latency by counting per-request I/O, ORM lazy loading, DB, Redis and external-call fan-out, projection, pagination, counts, index fit, transaction and pool wait, cache miss paths, serialization, response size, request-path CPU work, and route/span observability evidence.
- Added the `web-render-performance-review` skill so agents can review first-render web performance across LCP discovery, lazy-loading traps, critical CSS, fonts, responsive media, third-party scripts, hydration, first-view data, streaming HTML, cache headers, resource hints, long tasks, and route prefetch behavior.
- Added the `core-web-vitals-field-review` skill so agents can review Core Web Vitals as field-data operations, covering p75 mobile and desktop thresholds, RUM instrumentation, CrUX and Search Console gaps, LCP subparts, INP main-thread attribution, CLS space contracts, LoAF evidence, bfcache, speculation rules, third-party tags, and deploy regression monitoring.
- Added the `image-delivery-performance-review` skill so agents can review image discovery, LCP priority, responsive `srcset`/`sizes`, responsive preloads, intrinsic dimensions, format fallbacks, quality budgets, CDN transformation cache keys, metadata handling, SVG safety, image proxy allowlists, and image waterfall evidence.
- Added the `client-bundle-pruning-review` skill so agents can review initial JS and shared vendor bloat by tracing tree-shaking blockers, CJS dependencies, barrels, subpath exports, side-effect metadata, client boundaries, lazy imports, polyfills, browser targets, manual chunks, Tailwind extraction, and inline asset rules.
- Added the `frame-render-performance-review` skill so agents can review per-frame browser rendering work across DOM read/write batching, layout thrashing, transform/opacity animation, containment, content-visibility, DOM size, selectors, observers, passive listeners, requestAnimationFrame scheduling, long tasks, workers, canvas, React rerenders, hydration, and INP evidence.
- Added the `frontend-state-ownership-review` skill so agents can review frontend state source-of-truth drift across props, local state, server caches, URL params, form drafts, global stores, context providers, query keys, optimistic updates, request races, persisted storage, and external subscriptions.
- Added the `frontend-stress-layout-review` skill so agents can review UI resilience against hostile content, narrow containers, async media, scrollbars, mobile viewport/keyboard/safe-area, i18n/RTL, zoom, portals, layers, tables, charts, and reproducible break conditions.
- Added the `frontend-accessibility-tree-review` skill so agents can review frontend accessibility through native semantics, the browser accessibility tree, accessible names, visible-label consistency, keyboard and focus flow, dialogs, forms, live regions, hidden content, icon and image alternatives, custom widget contracts, non-text contrast, target size, drag alternatives, and automation evidence limits.
- Added the `frontend-localization-review` skill so agents can review frontend localization across hidden user-visible strings, full-sentence translation units, interpolation, plural and zero cases, grammar, tone, date/time/number/currency/unit formatting, search and sort collation, Unicode normalization, grapheme-safe truncation, RTL and bidirectional text, font fallback, pseudo localization, SSR locale agreement, fallback behavior, backend error-code mapping, rich text, exports, sharing, and notification surfaces.
- Added the `quadratic-scan-review` skill so agents can catch hidden O(N^2) work from repeated scans, array membership checks, code joins, helper-body lookups, ORM or GraphQL fan-out, render-time lookups, repeated sorting, and copy accumulation.
- Added the `type-state-modeling-review` skill so agents can make impossible states unrepresentable with branded IDs, unit types, discriminated variants, DTO boundary splits, typed Results, non-empty collections, permission capabilities, and exhaustiveness checks.
- Added the `database-query-bottleneck-review` skill so agents can catch query bottlenecks from cardinality fan-out, N+1 access, overfetching, unstable pagination, index-defeating predicates, plan/statistics skew, and long transactions from the diff before live plan evidence.
- Added the `race-condition-review` skill so agents can trace shared state, stale reads after interleaving points, check-then-act, read-modify-write, lock scope/order, database uniqueness, queue/event ordering, cancellation, timers, close/send races, and flaky race-test evidence.
- Added the `concurrency-invariant-review` skill so agents can review shared ownership, time-order invariants, lock identity and ordering, condition variables, atomics, safe publication, distributed locks, queue duplicates, shutdown drains, thread-local leakage, async interleavings, and deterministic concurrency-test evidence.
- Added the `failure-integrity-review` skill so agents can catch swallowed exceptions, false-success returns, partial commits, unsafe retries, missing timeouts, ignored cancellation, queue ack mistakes, cleanup masking, dangerous fallbacks, and missing failure-path observability.
- Added the `idempotency-integrity-review` skill so agents can review duplicate business intent across repeated requests, retries, webhooks, queue redelivery, schedulers, batch replays, timeout recovery, idempotency-key storage and payload binding, response replay, processing leases, provider lookups, inbox/outbox records, compensation, durable uniqueness, and duplicate-path tests.
- Added the `transaction-boundary-integrity-review` skill so agents can review transactions as business-invariant boundaries across read-decision-write sequences, durable constraints, row locks, isolation assumptions, full-transaction retries, rollback triggers, propagation modes, after-commit side effects, outbox patterns, external calls, optimistic locks, advisory locks, multi-database scope, and transactional-test blind spots.
- Added the `cache-integrity-review` skill so agents can catch cache-key truth drift, stale-data spread, invalidation races, stampedes, unsafe source fallbacks, Redis and HTTP cache pitfalls, stale permission-cache leaks, and missing cache observability.
- Added the `module-boundary-review` skill so agents can review module cohesion by tracing change spread, data and policy ownership, import direction, DTO leakage, shared-helper sprawl, public API bloat, caller sequencing, and batch or worker bypasses.
- Added the `change-blast-radius-review` skill so agents can review maintainability by predicting next-change spread, policy and workflow ownership, deletion paths, config and tenant branch spread, event contracts, migration compatibility, brittle tests, decorative abstractions, premature DRY, and hard-to-remove features.
- Added the `business-rule-leakage-review` skill so agents can trace money, permission, ownership, state, settlement, discount, inventory, visibility, eligibility, webhook, cache, search, report, admin, batch, and support-tool rules back to a shared source of truth instead of letting them leak into one-off entrypoints.
- Added the `payment-integrity-review` skill so agents can review payment logic as money-event integrity, covering state transitions, server-side amount calculation, minor-unit money math, object ownership, idempotency keys, provider uniqueness, webhook signature and dedupe handling, out-of-order events, one-time fulfillment, async payment methods, authorization and capture, refunds, disputes, subscriptions, inventory and coupon reservations, timeout and retry classification, append-only ledgers, payment-sensitive data redaction, test/live secret separation, admin overrides, stale payment endpoints, and nightmare-path tests.
- Added the `credit-ledger-integrity-review` skill so agents can review credit, point, and wallet balance logic as ledger integrity, covering durable balance-change causes, source keys, idempotency payload comparison, atomic conditional deductions, transaction boundaries, contested-resource locks, exact units, rounding policy, non-negative invariants, unique ledger identities, reversals, partial refunds, expiry lots, reservation/capture/release states, queue redelivery, cache and replica staleness, admin adjustments, policy snapshots, failure injection, reconciliation checks, and evidence logs.
- Added the `api-misuse-resistance-review` skill so agents can review APIs from the caller side, covering implementation-leaking names, hidden call ordering, boolean parameters, option bags, null semantics, DTO leakage, idempotency, pagination stability, state-command design, PATCH semantics, async jobs, partial failures, versioning, deprecation telemetry, rate limits, observability, SDK ergonomics, and caller-contract tests.
- Added the `api-access-control-review` skill so agents can review API security as an access-control proof, covering BOLA/IDOR, object/property/function authorization, request-supplied identity, tenant isolation, mass assignment, DTO exposure, signed URLs, cache keys, async job revalidation, webhook ownership, OAuth/OIDC/JWT/session/cookie hardening, account enumeration, automation defense, and denial-case matrices.
- Added the `file-upload-security-review` skill so agents can review file upload security as a full lifecycle, covering filename normalization, server-generated storage keys, path containment, overwrite protection, web-root execution, content-type spoofing, polyglot files, image rewriting, SVG/PDF/Office handling, archive extraction, CSV formula injection, remote URL import SSRF, quarantine and scanner gates, parser sandboxing, presigned URL policy, tenant boundaries, download authorization, browser headers, filename injection, chunk assembly, quota, cleanup, and denial-case tests.
- Added the `error-message-integrity-review` skill so agents can review error messages as recovery and evidence contracts, covering stable codes, expected and actual values, failed-operation context, public/internal message splits, redaction, retryability, provider metadata, parse locations, conflict facts, idempotency history, partial failures, structured logs, and testable error contracts.
- Added the `security-flow-review` skill so agents can review security by tracing source-to-sink data flow, object and tenant authorization, mass assignment, admin-only surfaces, cache leaks, injection inputs, SSRF, file handling, browser execution, token trust, fail-open paths, async work, races, and supply-chain execution.
- Added the `testability-boundary-review` skill so agents can expose hidden decision inputs, direct time and randomness, direct I/O, constructor side effects, global state, log-only or void outcomes, cache order dependence, async sleeps, mock-heavy tests, call-order assertions, inheritance coupling, and reflection-only test seams.

### Changed

- Refined the `database-query-bottleneck-review` skill with stronger estimated-versus-actual row drift, extended statistics, database-specific actual-plan evidence, missing-index recommendation, and plan-forcing cautions.

## 2.39.1 - 2026-06-12

### Fixed

- Updated the command explanation test contract for the relaxed default `lint` intent trigger set.

## 2.39.0 - 2026-06-12

### Changed

- Default `mf init` templates now install runnable Bun-backed `test`, `test_related`, and `test_fast` command intents so new projects can run basic test verification without first hand-authoring a command contract.

## 2.38.0 - 2026-06-11

### Added

- Added the `powershell-code-change` skill for PowerShell parser layering, quoting, here-strings, splatting, native argv passing, `--%`, `-Command`, regex/wildcard/replacement parsing, and command-injection-safe script changes.

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
