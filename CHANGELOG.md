# Changelog

This changelog begins with the current mustflow development line. Earlier repository history is available in Git.

This file applies to the mustflow repository itself. It is not installed into user projects by `mf init`.

## Unreleased

### Added

- Added `mf flow` and generated `REPO_FLOW.md` so agents can inspect the repository's design-flow
  path from task intake through source reading, scoped editing, verification, and evidence reporting.
- Added the `vue-code-change` built-in skill so agents can review Vue, Nuxt, Pinia, Vue Router,
  Composition API, reactivity, component API, SSR, hydration, lazy hydration, and Vite/vue-tsc
  toolchain boundaries before changing Vue projects.
- Added the `axum-code-change` built-in skill so agents can review Axum routes, extractors,
  `State` and request extensions, Tower/Tower-HTTP layers, CORS, cookies, headers, Tokio tasks,
  SQLx pools, rejections, and API error envelopes before changing Rust HTTP servers.
- Added the `godot-code-change` built-in skill so agents can review Godot scenes, nodes, GDScript
  and C# scripts, Resources, Autoloads, signals, save/load systems, rendering, physics, UI, input,
  exports, plugins, and version migrations before changing Godot projects.
- Added the `babylon-code-change` built-in skill so agents can review Babylon.js WebGPU/WebGL
  engine setup, render loops, Scene lifecycle, glTF/GLB loading, materials, textures, shaders,
  LOD, instancing, thin instances, picking, Physics V2, Havok, disposal, and performance budgets
  before changing web 3D projects.
- Added the `wails-code-change` built-in skill so agents can review Wails v3 app assembly, Go
  services, generated bindings, runtime calls, windows, events, menus, tray/dialog integrations,
  WebView platform behavior, and packaging boundaries before changing Wails desktop projects.
- Added a rebuilt `.mustflow/state/runs/latest.index.json` receipt index so agents can find recent
  retained runs by intent and cwd without overloading the root-wide `latest.json` pointer.
- Added the built-in `code/dependency-graph` script-pack helper so agents can trace bounded
  relative TypeScript and JavaScript import, export, require, and dynamic import edges before
  changing source modules.
- Added the built-in `code/change-impact` script-pack helper so agents can summarize git-diff
  changed surfaces, likely related files, optional helper scripts, and verification intent hints
  after a local change.
- Added the built-in `repo/config-chain` script-pack helper so agents can inspect nearby package,
  TypeScript, ESLint, Vite, Tailwind, test, and mustflow config files plus static inheritance edges
  before assuming effective project rules.
- Added the built-in `repo/generated-boundary` script-pack helper so agents can check candidate
  edit paths against generated, ignored, protected, vendor, cache, and outside-root boundaries.
- Added the built-in `repo/related-files` script-pack helper so agents can map direct imports,
  importers, same-basename siblings, and nearby config or package boundaries without broad file
  paging or treating the result as verification scope.
- Added `mf script-pack suggest` so agents can rank optional script-pack helpers from path,
  changed-file, phase, and related-skill evidence without running the suggested scripts.
- Added optional read-only script-pack helper suggestions to `mf skill route --json` so agents can
  discover useful helper scripts while choosing the skill documents for a task.
- Added static return metadata to `code/outline` and embedded `code/symbol-read` symbols so agents
  can inspect declared return types, return lines, behavior labels, and short return previews
  without reading whole files line by line.
- Added first-pass Go, Rust, and Python symbol extraction to `code/outline` so agents can inspect
  common function, type, class, and return metadata outside TypeScript and JavaScript files.
- Added first-pass Astro frontmatter and Svelte script symbol extraction to `code/outline` and
  `code/symbol-read` so agents can inspect embedded TypeScript/JavaScript declarations without
  paging through component markup.
- Added the built-in `code/route-outline` script-pack helper so agents can scan Hono and Elysia
  route methods, paths, lifecycle chains, line ranges, and content hashes before paging through
  large route modules.
- Added Axum route extraction to `code/route-outline`, including Rust `.rs` scanning and first-pass
  `Router::route`, `nest`, `merge`, and `fallback` handler metadata.
- Added NestJS controller and method route extraction to `code/route-outline`, including
  `@Controller`, `@Get/@Post/@Put/@Patch/@Delete/@Options/@Head/@All` method decorators, and
  `@UseGuards`, `@UseInterceptors`, `@UsePipes`, and `@UseFilters` lifecycle hooks.
- Added the `cross-agent-session-reference` built-in skill so agents can read bounded,
  redacted Codex or Hermes session evidence by local session ID without mutating another agent's
  state or treating transcripts as authority.
- Added the built-in `code/export-diff` script-pack helper so agents can compare exported
  TypeScript and JavaScript signatures, return metadata, and package surface hints against a git
  base after public-ish API edits.
- Added the built-in `docs/reference-drift` script-pack helper so agents can check documented
  `mf` commands, script-pack refs, schema files, and repository paths against current local
  surfaces after docs, CLI, schema, or script-pack changes.
- Added source-anchor metadata to `code/outline` JSON reports so agents can discover `mf:anchor`
  navigation markers and their nearby target declarations without paging through whole files.
- Added `--anchor <id>` to `code/symbol-read` so agents can read a source anchor's target symbol
  directly without manually copying line numbers from `code/outline`.
- Added `mf docs review add --changed` and a bounded `docs_review_add_changed` command intent so
  agents can queue changed documentation review candidates without inventing per-path commands.

### Changed

- Refreshed the `elysia-code-change` and `bun-code-change` built-in skills with Elysia OpenAPI,
  Eden Treaty, lifecycle, security, streaming, WebSocket, Bun runtime, compile, Docker, and
  deployment-risk checks.
- Refreshed the `hono-code-change` built-in skill with route-order, validator, RPC/OpenAPI,
  CORS, cookie, header, streaming, WebSocket, cache, static asset, and runtime-adapter checks.
- Refreshed the `svelte-code-change` built-in skill with SvelteKit universal/server load,
  form action, preload, invalidation, hydration, streaming, Svelte 5 runes, adapter, Vite,
  TypeScript, and package-output checks.
- Refreshed the `astro-code-change` built-in skill with client island, server island, static versus
  on-demand rendering, content and live collection, MDX, Markdoc, Shiki, route cache, adapter
  runtime, and target-preview checks.
- Clarified `clarifying-question-gate` so agents prefer host-provided structured input such as
  `request_user_input` only for bounded blocking decisions, with a concise chat fallback when the
  host does not expose that capability.
- Applied `[retention.run_receipts]` limits to `run-*` and `verify-*` receipt directories and raised
  the default retained receipt budget to 50 directories and 10 MB.
- Optimized line-ending detection and LF normalization to avoid byte-by-byte JavaScript scans
  across large changed files while preserving the existing report and normalize semantics.
- Narrowed related-test selection for line-ending core implementation changes so schema smoke
  tests stay attached to CLI and public JSON contract surfaces instead of every internal hot-path edit.
- Narrowed related-test selection for verification-planning core changes so classification,
  public-surface explanation, and full public-schema suites no longer run for internal verify-plan edits.
- Reduced `explain verify` stale local-index regression setup cost by building the fixture index
  directly from a minimal workflow project while preserving CLI output coverage.
- Changed verification planning so lower-cost cached intents are not selected over equivalent
  rebuild-capable intents when their artifact freshness preconditions are stale.
- Kept `test_related_profile` from falling back to the fast baseline when no changed files are
  present so clean-worktree profiling reports only explicitly related test coverage.
- Added script-pack routing metadata to the catalog JSON output and exposed a read-only
  `script_pack_list` command intent in the default template command contract so agents can
  discover bundled scripts before selecting one.
- Updated core workflow skills to treat `script_pack_list` as read-only script discovery and to
  mention `repo/generated-boundary` as an optional path-safety helper without granting execution
  authority outside the command contract.
- Added a read-only `script_pack_suggest_changed` template command intent for changed-file-based
  script-pack recommendations.
- Added optional read-only script-pack helper recommendations to `mf next` so agents can discover
  relevant bundled scripts from changed-file evidence without running those scripts.
- Added optional read-only script-pack helper recommendations to `mf api verification-plan --changed --json`
  so machine consumers can surface relevant bundled scripts alongside the verification plan without
  running those scripts.
- Made `script-pack suggest` run hints path-aware so agents receive concrete read-only helper
  commands when path evidence is available, while follow-up helpers such as `code/symbol-read`
  keep their `code/outline` dependency explicit.
- Clarified the `cross-agent-session-reference` skill so referenced sessions remain read-only
  evidence while user-explicit cross-agent handoffs can still send bounded prompts through available
  host tools.
- Strengthened the `architecture-deepening-review` skill so layered-architecture reviews reject
  folder-name theater, require change-pressure and boundary-enforcement evidence, and surface
  pass-through layer, generic CRUD, and shared-helper smells before proposing deeper structure.
- Strengthened the `github-contribution-quality-gate` skill so GitHub issues, PR bodies, and
  review replies check title quality, reading order, Markdown element purpose, Preview readability,
  verification results, review focus, and risk or rollback notes before posting.

### Fixed

- Fixed `code/symbol-read` source-anchor targeting for Python anchors that have an ordinary
  `#` comment line between the anchor metadata and the target declaration.

## 2.74.3 - 2026-06-22

### Changed

- Refreshed built-in skill guidance for current TypeScript 7 compiler tracks, Rust API MSRV
  checks, Astro 6 dynamic route params, Tailwind v4 source directives, RateLimit draft status,
  Elysia validation lifecycle, UnoCSS Wind4 migration, and external skill portability workflows.

## 2.74.2 - 2026-06-21

### Added

- Added the `support-surface-advisor` built-in skill so agents can help users choose product
  support surfaces as explicit maintenance contracts, name unsupported channels, and keep UI,
  CLI, API, and automation shells thin around a shared core engine.

## 2.72.0 - 2026-06-20

### Added

- Added risk-priced evidence assessment to verification plans, verify run manifests, latest run
  pointers, evidence reports, API verification plans, and workspace verification summaries so
  high-risk changes require explicit review evidence even when configured checks pass.

## 2.71.0 - 2026-06-20

### Changed

- Strengthened the `adapter-boundary` built-in skill so agents must identify the volatile side,
  preserved consumer contract, adapter-only change path, and evidence that implementation changes
  stay behind the port instead of forcing caller changes.

## 2.70.0 - 2026-06-19

### Added

- Added the `design-implementation-handoff` built-in skill so agents can structure Agent A design
  packages for Agent B implementation with public product specs, private `.agent` handoff ledgers,
  ownership gates, ignored-file protection, remote-agent transfer limits, and completion evidence.

## 2.69.0 - 2026-06-19

### Added

- Added the `skill-refresh` built-in skill so agents can refresh stale `SKILL.md`
  procedures and skill packages while preserving behavior contracts, checking source freshness,
  synchronizing helper files and template surfaces, and reporting runtime or provenance risk.
- Added the `task-instruction-authoring` built-in skill so agents can draft and review coding-agent
  work instructions across implementation, fixes, reviews, proofs, cleanup, operational readiness,
  and interactive CLI picker contracts.

## 2.58.0 - 2026-06-15

### Changed

- Strengthened the `ai-generated-code-hardening` skill so assistant-authored fixes must check for symptom-only patches, pinpoint hardcoding, exact-value branches, same-defect-class sibling inputs or callers, and generalized regression guards instead of only satisfying the reported literal case.

### Added

- Added the `agent-eval-integrity-review` built-in skill so agents review LLM agent evaluation loops as evidence systems across final environment state, trace and trajectory grading, deterministic/model/human oracle layers, tool prechecks and postchecks, prepare/verify/commit side effects, tool schema fuzzing, evidence-packet tool results, golden and dirty eval sets, pass@k versus pass^k reliability, shadow environments, production-monitoring-to-eval feedback, and privacy-safe trace retention.
- Added the `agent-execution-control-review` built-in skill so agents review autonomous and semi-autonomous LLM systems as execution-control surfaces across workflow-versus-agent selection, stage gates, planner/executor/verifier separation, tool contracts, draft/execute boundaries, idempotent side effects, approval and interrupt state, durable resume schemas, memory partitions, handoff filters, guardrail placement, loop budgets, retry classification, privacy-safe traces, and outcome-focused evals.
- Added the `llm-response-latency-review` built-in skill so agents can review LLM response speed as a user-visible request path across time to first token, first useful output, total completion, LLM round trips, tool wait, output caps, schema overhead, streaming safety, prompt-cache latency, history and RAG trimming, model routing, fallback cascades, speculative or parallel work, predicted-output caveats, realtime continuation, priority-tier routing, self-hosted serving choices, and privacy-safe latency observability.
- Added the `llm-token-cost-control-review` built-in skill so agents can review LLM token spend as a product and systems contract across stable prompt prefixes, volatile suffix placement, prompt version hashes, provider prompt-cache behavior, app-level response caching, chat-history trimming, RAG evidence-span packing, tool and structured-schema payload size, deterministic prefilters, model routing, reasoning and output budgets, patch-style outputs, retry repair paths, Batch and Flex separation, predicted-output caveats, image and file input counting, cost-per-success metrics, and sensitive-data-safe cost observability.
- Added the `llm-hallucination-control-review` built-in skill so agents can review factual LLM outputs as product-controlled grounding contracts across answerability states, abstain behavior, evidence IDs, claim maps, citation validation, retrieval thresholds, hybrid search fit, chunk metadata, original evidence spans, tool-argument ownership, deterministic calculations, source-of-truth priority, dirty eval fixtures, judge limits, grounding metrics, and escalation paths.
- Added the `prompt-contract-quality-review` built-in skill so agents review prompts as versioned product contracts across prompt-as-function boundaries, input and authority separation, RAG evidence ordering, few-shot boundary examples, structured output schemas, semantic validators, model snapshots, reasoning and token budgets, tool policies, refusal and failure states, validation fields instead of hidden reasoning, agent completion definitions, and eval evidence before claiming prompt quality improved.
- Added the `desktop-auto-update-safety-review` built-in skill to review desktop automatic updates as a remote code-execution supply chain across Electron autoUpdater, electron-builder feeds, Squirrel.Windows first-run locks, Sparkle appcasts, Tauri updater, signed and notarized macOS updates, Windows installers, immutable artifacts, signatures, hash verification, metadata pointer order, `latest.yml`, `latest.json`, appcast XML, CDN cache policy, staged rollout, deterministic canary buckets, alpha/beta/stable channel separation, update kill switches, signing-key custody, key rotation, certificate expiry, single-flight update checks, quit-and-install timing, old-version upgrade paths, forward-fix recovery, update telemetry, crash gates, and installed-app smoke tests.
- Added the `desktop-background-process-stability-review` built-in skill to review Windows services, macOS LaunchDaemons and LaunchAgents, Linux systemd units, Electron main and utility processes, WebView helpers, tray apps, sync workers, local daemons, auto-start helpers, updaters, and desktop background jobs across crash recovery, durable checkpoints, single-instance and data-directory locks, OS supervisor restart policy, backoff, health checks, progress heartbeats, job leases, idempotent jobs, atomic file writes, shutdown and preshutdown behavior, exit-code semantics, UI and worker lifecycle separation, Session 0 boundaries, launchd daemon or agent placement, systemd start-rate limits, sleep and resume, monotonic time, IPC authorization, deterministic environment, least privilege, early logging, crash reporting, update drain, lifecycle tests, and safe mode.
- Added the `desktop-memory-footprint-review` built-in skill to review Windows, macOS, Linux, Electron, WebView, WPF, WinUI, Win32, Qt, Java desktop, .NET, JVM, Rust, C++, and Python desktop app memory across scenario budgets, working set versus private memory, RSS, dirty pages, live set, peak and after-close memory, UI and data virtualization, renderer/window counts, module loading, decoded image size, cost-limited caches, `NSCache`, memory-mapped files, mapped-range discard, `EmptyWorkingSet` theater, .NET LOH and `ArrayPool<T>`, WPF visual trees, GDI/USER handles, detached DOM nodes, hidden windows and tabs, string deduplication, large buffer capacity, struct padding, object graph shape, undo history, inactive view degradation, low-memory handling, and after-close evidence.
- Added the `low-end-device-support-review` built-in skill to review Android Go, low-RAM Android, older iOS, React Native, Flutter, Tauri mobile, Electron, and desktop app support as product-level low-end budgets across target-device baselines, runtime memory class, cold-start frequency, TTID, TTFD, first-screen local defaults, peak memory, LMK, iOS dirty memory, `onTrimMemory()`, memory warnings, main-thread work, frozen frames, image decode sizes, GIF and Lottie cost, list virtualization, Compose and SwiftUI render work, cache bounds, database paging and indexes, disk-write batching, network fan-out, background work, polling, sensors, SDK staging, bottom-percentile device evidence, and p90 product budgets.
- Added the `app-startup-performance-review` built-in skill to review Android, iOS, React Native, Flutter, Tauri mobile, Electron, and desktop app startup from icon tap or process launch to first frame and fully usable state across cold, warm, and hot starts, TTID, TTFD, `reportFullyDrawn()`, Android Vitals, Xcode Organizer, Instruments, app delegate and application-class work, ContentProvider auto-init, AndroidX App Startup, DI graph creation, SDK initialization, static initializers, main-thread disk and network work, cached snapshots, auth and config gates, launch migrations, first-screen assets, custom fonts, R8, Baseline Profile, Startup Profile, Macrobenchmark, Perfetto, Hermes, import graphs, deferred components, shader warmup, on-demand modules, splash holds, and post-first-frame queues.
- Added the `mobile-energy-efficiency-review` built-in skill to review Android, iOS, React Native, Flutter, and Tauri mobile battery risks across measurement evidence, foreground and background work, WorkManager, JobScheduler, BackgroundTasks, foreground services, wake locks, exact alarms, Doze and App Standby, push versus WebSocket behavior, polling, network batching, cellular and constrained networks, location accuracy and duration, geofencing, sensors, Bluetooth, rendering, animation, timers, disk I/O, Compose recomposition, Low Power Mode, Battery Saver, and platform energy diagnostics.
- Added the `rate-limit-integrity-review` built-in skill to review rate limits across protected resources, cost-weighted requests, layered enforcement, key design, fixed-window bursts, token and sliding-window algorithms, Redis atomic counters, storage time, local versus global limits, fail-open or fail-closed policy, failed-response counting, concurrency limits, 429/`Retry-After`/`RateLimit` contracts, jitter, shadow mode, operator reset, async enqueue quota, cached CDN hits, and authorization or cost-control boundaries.
- Added the `cloud-cost-guardrail-review` built-in skill to catch hidden cloud spend channels across budget alerts and automated non-production stops, account or project isolation, quotas, tags, expirations, autoscale caps, Kubernetes ResourceQuota and LimitRange, NAT and egress paths, public IPs, CDN cache behavior, log ingest, metric cardinality, storage lifecycle, snapshots, sticky database storage growth, registry cleanup, commitments, spot suitability, Marketplace, LLM API, and SaaS usage.
- Added the `incident-triage-review` built-in skill to turn outages, timeout spikes, tail-latency regressions, pool waits, queue backlogs, node or pod issues, network and DNS stalls, DB locks, cache stampedes, cron spikes, and log floods into fast time/scope/change/wait/dependency elimination.
- Added the `deployment-rollout-safety-review` built-in skill to review server deploys across runtime resource ledgers, artifact promotion, config diffs, DB migration sequencing, probes, graceful shutdown, queue drain, message and cache compatibility, kill switches, canary cohorts, automatic stop conditions, synthetic transactions, deployment locks, rollback limits, and post-deploy observation.
- Added the `deletion-lifecycle-review` built-in skill to catch soft-delete, restore, purge, legal-hold, tombstone, backup-residue, downstream-deletion, and tenant-offboarding lifecycle risks.
- Added the `database-json-modeling-review` built-in skill to catch JSON/jsonb column modeling drift, raw-payload boundaries, key promotion criteria, and engine-specific JSON validation/indexing risks.
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
- Added the `database-lock-contention-review` skill so agents can review hot rows, mutable counters, lock waits, deadlocks, row-lock strength, gap and metadata locks, queue claim contention, DDL blockers, lock timeout policy, pool waits, and lock observability before treating database blocking as generic slowness.
- Added the `race-condition-review` skill so agents can trace shared state, stale reads after interleaving points, check-then-act, read-modify-write, lock scope/order, database uniqueness, queue/event ordering, cancellation, timers, close/send races, and flaky race-test evidence.
- Added the `concurrency-invariant-review` skill so agents can review shared ownership, time-order invariants, lock identity and ordering, condition variables, atomics, safe publication, distributed locks, queue duplicates, shutdown drains, thread-local leakage, async interleavings, and deterministic concurrency-test evidence.
- Added the `failure-integrity-review` skill so agents can catch swallowed exceptions, false-success returns, partial commits, unsafe retries, missing timeouts, ignored cancellation, queue ack mistakes, cleanup masking, dangerous fallbacks, and missing failure-path observability.
- Added the `backend-log-evidence-review` skill so agents can review backend request, job, worker, scheduler, webhook, migration, external API, DB write, transaction, state-transition, retry, timeout, queue, auth, validation, cache, lock, idempotency, feature-flag, config, and batch logs as evidence for reconstructing why a path reached its final state.
- Added the `observability-debuggability-review` skill so agents can review logs, metrics, traces, spans, telemetry context, cardinality, denominators, latency distributions, async propagation, dependency and operation names, queue and batch lag, pool saturation, feature and release attribution, alert usefulness, sampling, redaction, and telemetry self-observability as incident-narrowing evidence.
- Added the `idempotency-integrity-review` skill so agents can review duplicate business intent across repeated requests, retries, webhooks, queue redelivery, schedulers, batch replays, timeout recovery, idempotency-key storage and payload binding, response replay, processing leases, provider lookups, inbox/outbox records, compensation, durable uniqueness, and duplicate-path tests.
- Added the `retry-policy-integrity-review` skill so agents can review retry amplification across layered retries, attempts and elapsed-time budgets, per-attempt timeouts, backoff and jitter, `Retry-After`, retry predicates, idempotency-key reuse, transaction or lock placement, pool pressure, circuit breaker and bulkhead ordering, queue retry overlap, cancellation-aware sleeps, and retry observability.
- Added the `queue-processing-integrity-review` skill so agents can review queue, stream, worker, producer, consumer, ack/delete/commit, visibility timeout, publisher confirm, prefetch, rebalance, DLQ, redelivery, ordering, backpressure, shutdown, and replay-path integrity before trusting lag, depth, or success counters.
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

- Strengthened the `deployment-rollout-safety-review` skill with release envelopes, image digests, retained rollback history, warm old-version traffic rollback, rollback preview and PITR evidence, immutable config names, conservative probes, worker pause and quarantine checks, external compensation, API N-1/N+1 compatibility, version-split canary telemetry, CRD/operator downgrade handling, and cache payload rollback compatibility.
- Strengthened the `backend-log-evidence-review` skill with stable event-name and schema-version checks, trace/span/request/correlation/causation IDs, outcome and reason fields, dependency and queue evidence, audit-event separation, release/config attribution, sampling boundaries, cardinality controls, and log-injection safety.
- Strengthened the `database-migration-change` skill with expand/backfill/switch/contract rollout checks, PostgreSQL and MySQL online-DDL lock cautions, cursor-based idempotent backfills, cut-over control, replication-lag monitoring, migration observability queries, and roll-forward recovery classification.
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
