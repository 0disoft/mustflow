---
mustflow_doc: skill.performance-budget-check
locale: en
canonical: true
revision: 19
lifecycle: mustflow-owned
authority: procedure
name: performance-budget-check
description: Apply this skill when runtime performance, hot paths, user-perceived latency, p95/p99 tail latency, throughput, infrastructure cost, memory, GC pressure, CPU cache locality, allocation churn, bundle size, payload size, media loading, build time, filesystem scanning, process spawning, IPC/RPC/DB/API fan-out, N+1 work, repeated filtering/sorting/parsing/serialization, caching, pagination, queues, virtualization, backpressure, or performance claims are planned, edited, reviewed, or reported.
metadata:
  mustflow_schema: "1"
  mustflow_kind: procedure
  pack_id: mustflow.core
  skill_id: mustflow.core.performance-budget-check
  command_intents:
    - changes_status
    - changes_diff_summary
    - build
    - test_related
    - docs_validate_fast
    - test_release
    - mustflow_check
---

# Performance Budget Check

<!-- mustflow-section: purpose -->
## Purpose

Keep performance work focused on the places where cost multiplies: item count, request count, service fan-out, retry count, bytes transferred, bytes copied, objects allocated, rendered nodes, database round trips, filesystem walks, IPC calls, cache misses, branch misses, lock waits, queue backlog, and connection-pool waits.

Prefer removing unnecessary work over making unnecessary work slightly faster. A performance change should preserve semantics, name the hot path, and report whether it is measured, inferred from complexity, or still unverified. Do not treat Big-O labels, "hash map", "indexed query", "cache", "queue", or "autoscaling" as proof that a path is fast enough; constant factors, memory layout, runtime dispatch, allocation, locks, external round trips, and shared resource bottlenecks often dominate.

<!-- mustflow-section: use-when -->
## Use When

- A task changes or reports latency, p95 or p99 tail latency, throughput, infrastructure cost, memory use, GC pressure, CPU cache locality, allocation churn, build time, bundle size, payload size, media loading, CLI duration, test scheduling, cache initialization, filesystem scanning, process spawning, or command execution duration.
- Code introduces or reviews repeated external access such as DB queries, repository calls, HTTP/RPC calls, Redis calls, S3/object storage calls, IPC commands, filesystem `stat` or scan calls, or child processes.
- Code filters, sorts, groups, joins, parses, serializes, clones, formats, normalizes, validates, allocates objects, builds DTOs, opens clients or sessions, renders UI lists, or computes projections inside loops or render paths.
- A change adds caching, memoization, precomputation, derived stores, selectors, virtualized lists, batching, queues, concurrency limits, cancellation, backpressure, debounce, throttle, workers, background jobs, CDN or HTTP caching assumptions, payload reduction, or media optimization for performance reasons.
- Code uses async work, goroutines, futures, workers, task queues, streams, regexes, date parsing, string construction, exception handling, or logging in a path whose input or traffic can grow.
- A report claims a path is faster, optimized, efficient, lightweight, responsive, scalable, low-memory, low-overhead, or safe for large input.

<!-- mustflow-section: do-not-use-when -->
## Do Not Use When

- The task only changes wording, translations, or docs with no runtime, package, measurement, or performance claim.
- The number is only a local fixture value with no performance or public meaning.
- The change is purely database-engine-specific performance work; use the matching engine skill first, then this skill only for cross-cutting measurement, hot-path, UI, cache, or I/O boundaries.
- The proposed optimization changes product semantics, authorization, durability, consistency, or user-visible ordering; use the relevant behavior, data, migration, or security skill first.

<!-- mustflow-section: required-inputs -->
## Required Inputs

- Performance surface: request path, command path, render path, build step, batch job, queue, cache, database path, filesystem path, IPC/RPC boundary, or test scheduler.
- Hot-path shape: expected call frequency, input size, growth direction, nested loops, external round trips, payload size, rendered node count, allocation rate, data layout, branch predictability, lock or pool contention, queue depth, and whether the path runs during user input or startup.
- Time breakdown evidence: user-visible moment, wall-time split across browser, network, application CPU, DB, cache, external API, queue, filesystem, IPC, serialization, compression, logging, and render work, plus CPU time versus wait time when available.
- Measurement method or evidence: configured command intent, profiler output, query count, runtime log, trace span, resource metric, benchmark, complexity analysis, or reason the metric is unavailable.
- Baseline and post-change result when measurable under comparable constraints, including whether the evidence reflects average, p95, p99, cold start, warm cache, realistic data size, or local-only behavior.
- Saturation evidence: utilization, backlog or queue depth, pool wait, lock wait, retry or error rate, tenant or data skew, and good-period versus bad-period comparison when available.
- Optimization goal: user-perceived speed, server cost reduction, tail-latency stability, failure isolation, memory headroom, or developer-loop speed.
- Correctness boundaries: ordering, duplicates, idempotency, partial failure, cancellation, consistency, cache invalidation, stale data, and rollback behavior.
- Isolation surface: shared state touched by the optimization, such as `process.cwd()`, `process.env`, module cache, build output directories, database files, caches, stores, workers, timers, or child processes.
- Relevant command-intent contract entries for build, tests, docs, release checks, and mustflow validation.

<!-- mustflow-section: preconditions -->
## Preconditions

- The task matches the Use When conditions and does not match the Do Not Use When exclusions.
- Higher-priority instructions and `.mustflow/config/commands.toml` have been checked for the current scope.
- Required inputs are available, or missing inputs can be reported without guessing.
- If personal data, authorization, tenant isolation, secrets, logs, retention, or audit data is involved, also use `security-privacy-review`.
- If database schema, query, index, migration, or transaction behavior changes, also use `database-change-safety`, `database-migration-change`, or the matching database engine skill.
- If UI rendering, layout, accessibility, or user-facing interaction changes, also use `ui-quality-gate`.

<!-- mustflow-section: allowed-edits -->
## Allowed Edits

- Optimize data access, indexing, grouping, projection, batching, scheduling, rendering, cache boundaries, concurrency limits, cancellation, and measurement code tied to the task.
- Add or tighten performance-oriented tests, fixtures, budgets, metrics, docs, and reports when repository evidence supports them.
- Replace fuzzy adjectives with measured values or explicitly label the claim as complexity-only or unverified.
- Do not add speculative caches, memoization, workers, batching, virtualized UI, or concurrency fan-out when the hot path and invalidation boundary are unknown.
- Do not trade correctness, durability, authorization, privacy, ordering, partial-failure behavior, or user trust for speed without explicit product acceptance.

<!-- mustflow-section: procedure -->
## Procedure

1. Name the hot path and cost multiplier. Ask how many times the line runs after multiplying by requests, items, services, retries, renders, files, rows, shards, or queued jobs.
   - Turn "slow" into a numeric budget before choosing a fix. Name the user-visible moment, such as first content, click response, save completion, scroll/input responsiveness, background delivery, batch completion, or developer command duration. State the current and target p50, p95, p99, throughput, memory, payload, or cost when evidence exists.
   - Decompose elapsed time before touching code. Split request, render, command, or job wall time across browser, network, server routing, authorization, application CPU, DB, cache, external APIs, queue wait, filesystem, IPC, serialization, compression, logging, response download, and render. Distinguish CPU time from wait time; high wall time with low CPU means the path is waiting.
   - Find queueing and saturation, not just high utilization. Check utilization, backlog, queue depth, pool waits, lock waits, retry or error rate, and p95/p99 latency together. Compare good periods to bad periods, affected tenants or data sizes, specific workers or replicas, and cold versus warm cache before declaring the bottleneck.
2. Rank the likely return on effort before choosing a technique. In typical web or service paths, first check DB/API round-trip count, slow query plans, repeated reads that could be safely cached, work that does not need to block the response, static or media delivery, response payload shape, and then CPU or allocation micro-optimizations. Escalate algorithmic or runtime work early only when the measured hot path is CPU-heavy, data-processing-heavy, render-loop-heavy, or clearly quadratic.
3. Do not stop at asymptotic complexity. For `O(N)`, check sequential versus pointer-chasing access, working-set size, branch predictability, per-item allocation, string or Unicode work, runtime dispatch, logging, locks, and external round trips. For `O(log N)`, check node locality, comparator cost, key size, pointer jumps, and branch behavior. For `O(1)` maps or caches, check hash cost, key equality, load factor, resize or rehash spikes, collision behavior, key mutability, cache miss path, and hot-key contention.
4. Classify the performance surface:
   - CPU and algorithm: nested loops, repeated lookup, sorting, parsing, formatting, validation, scoring, diffing, search, regex, JSON work, compression, crypto, image processing, context switching, event-loop blocking, runtime dispatch, or CPU throttling.
   - I/O and external boundaries: DB, filesystem, HTTP/RPC, Redis/cache, object storage, IPC, child processes, provider SDKs, DNS, TLS, retransmits, cross-region calls, or load-balancer hot spots.
   - Memory and allocation: object churn, deep clone, DTO conversion, large object graphs, byte/string copies, serialization, boxing, pointer chasing, cache locality, and GC pressure.
   - UI and delivery: unstable references, broad store invalidation, large lists, layout thrashing, image or icon load, font loading, hydration cost, bundle parse or execute time, payload size, input delay, and main-thread work.
   - Concurrency and resilience: pool exhaustion, long transactions, locks, retry storms, queue growth, backpressure, cancellation, partial failure, and shared-resource bottlenecks that autoscaling cannot remove.
5. Look for repeated external access first. Loops around repository calls, ORM lazy fields, DB queries, network calls, Redis gets, object storage calls, filesystem stats, IPC commands, or child processes are usually higher risk than local arithmetic.
6. Remove N+1 and fan-out before micro-optimizing. Prefer batch loading, bulk APIs, bounded concurrency, preloading, projection, and one request that returns the data shape the caller actually needs.
7. Check DB and ORM reality before adding caches. Confirm query count, selected columns, lazy loading, index fit, sort or pagination shape, row estimates, rows examined versus returned, temp sorts or tables, lock waits, transaction duration, replication lag, WAL or checkpoint pressure, and connection-pool waits. Do not use a cache to hide a query shape that should be fixed first. Treat pool size as a safety valve, not a cure for slow queries, long transactions, hot rows, or N+1 access.
8. Look for hidden quadratic work. Repeated membership checks, `find`, `filter`, `some`, `contains`, `indexOf`, grouping, or join-like scans inside another loop usually need a lookup table, `Set`, `Map`, sorted merge, or database-side join.
9. Choose data structures by actual cost, not labels. Small collections may be faster as arrays or sorted arrays than maps. Large lookup tables should use compact immutable keys, pre-sized capacity when supported, stable hashing and equality, and a memory layout that does not turn every item into a pointer chase.
10. Preserve semantics while changing data structures. State whether order, duplicate handling, first versus last winner, tie-breakers, missing records, and stable IDs still match the old behavior.
11. Bound reads and materialization. Avoid unbounded `SELECT *`, `findAll`, full filesystem scans, full JSON loads, full array materialization, whole response bodies, and API responses without pagination, projection, chunking, or streaming when data can grow.
12. Reduce payload and media work before tuning rendering internals. Send only needed fields, avoid overfetching, split late or optional data, use HTTP caching or CDN only for cacheable assets or responses, and check image dimensions, formats, lazy loading, and fixed layout dimensions before adding component memoization.
13. Check sorting and top-k work. Do not sort entire collections when only a top subset is needed. Precompute sort keys when comparison logic parses dates, normalizes strings, computes scores, or reads paths.
14. Check pagination semantics. Offset pagination can become linearly slower and can duplicate or skip items on changing data. Prefer stable keyset or cursor semantics when the product does not require arbitrary page jumps.
15. Move repeated pure computation out of loops and renders. Normalize queries once, precompute search blobs or numeric timestamps, reuse regexes and formatters, and avoid repeated schema validation after data crosses a trusted boundary.
16. Reuse expensive clients and sessions. Do not create HTTP clients, DB clients, ORM clients, SDK clients, regexes, date formatters, connection pools, or thread pools per request, per item, or per render unless the local API explicitly requires that lifecycle.
17. Control allocation. Avoid deep clone, JSON round-trip cloning, broad object spread, byte/string round trips, large intermediate arrays, repeated DTO layers, per-item closure or promise creation, exception construction in normal flow, and formatter creation in hot paths.
18. Stream or chunk large data. Files, JSONL, CSV, response bodies, object-storage blobs, and generated artifacts should not be read or decoded all at once when size can grow. Prefer bounded buffers, streaming parsers, and projection before serialization; state parser token or line-size limits when they matter.
19. Balance async and parallelism. Avoid both accidental sequential waits over independent I/O and unbounded `Promise.all`, goroutine, future, task, or worker fan-out. Use bounded concurrency, connection limits, timeouts, cancellation, and partial-result semantics.
20. Keep cache and memoization honest. Add caches only when the input key, invalidation rule, maximum size, TTL or version, stale behavior, and memory budget are explicit. Check stampede, key cardinality, negative caching, remote-cache hit cost, hot-key contention, authorization variance, cold-start behavior, shard or resize warmup, and cache outage behavior.
21. Treat queues as latency shifting, not work removal. Queue only work that does not need to block the user or transaction, and define consumer capacity, backlog limits, retry with jitter, idempotency, ordering, poison-message handling, and what happens when the queue is full.
   - During incidents, separate mitigation from root fix. Rate limits, temporary TTL extension, disabling nonessential work, lowering worker concurrency, replica routing, batch delay, or graceful degradation can protect the system, but still record the query, lock, retry, payload, hot-key, shard, or queue-design root cause.
22. Keep derived state disposable. Separate source data, lookup indexes, and UI projections. Projection caches should be rebuildable and should not become a second source of truth.
23. Keep references stable when rendering. Avoid recreating arrays, objects, context values, store payloads, or item props for unchanged data. Use stable IDs for list keys and virtualize large lists when rendering cost is the bottleneck.
24. Keep expensive work off the UI thread or async executor when it blocks progress. Move large parsing, search indexing, thumbnail generation, diffing, compression, crypto, or file processing to a worker, blocking pool, backend, or job queue only when the boundary cost is lower than keeping it local.
25. Batch boundary crossings. IPC, RPC, database, filesystem, and provider calls should cross boundaries in meaningful bulk operations, with per-item results, partial-failure behavior, timeout, cancellation, and bounded concurrency.
   - If sharding, partitioning, or row/cache key design appears in the fix, choose keys by load and query pattern rather than business neatness. Check hot tenants, hot counters, sequential row keys, fan-out scatter, resharding cost, cache hit-rate loss after movement, and whether coordinators stay off the hot data path.
26. Add backpressure to producer-consumer paths. Queues, watcher events, progress events, sync events, and refresh jobs need capacity, coalescing, latest-only behavior, rejection, degradation, or bounded consumers when production can outrun consumption.
27. Handle cancellation and stale async results. Search, refresh, sync, scans, and UI-driven loads need generation tokens or abort signals so old work cannot overwrite newer state.
28. Review filesystem and watcher paths. Prefer incremental metadata, debounce, event coalescing, and reconciliation over repeated whole-tree scans. Treat watcher events as hints, not truth.
29. Review pool and lock pressure. Shorten DB transactions, release connections before external work, avoid holding locks around slow I/O, avoid one global lock around a growing map or cache, and measure pool acquisition latency when concurrency grows.
30. Check retry, timeout, and external dependency behavior. Retries need maximum attempts, exponential backoff, jitter, idempotency, and circuit-breaking or graceful degradation when an external service is slow or unavailable.
31. Check logging and telemetry overhead. Avoid serializing large payloads or building expensive log strings on successful hot paths. Metrics and logs also need bounded cardinality and sampling on high-frequency paths. Do not remove useful observability to make numbers look better; good traces, query counts, cache hit rates, queue backlog, pool waits, tenant or shard labels, and retry/error signals are part of the performance surface.
32. Run a language and runtime smell pass when applicable:
   - TypeScript and JavaScript: repeated `includes` or `find`, unbounded `Promise.all`, `forEach(async ...)`, ORM N+1, object spread clones, JSON deep clone, repeated `new Date`, `console.log(JSON.stringify(...))`, per-request clients, large sync JSON or file work, and CPU work on the event loop.
   - Go: goroutine per item, missing `context` or timeout, per-call `http.Client`, `io.ReadAll` on growing input, slice growth without capacity, one mutex around a large map, and synchronous logging or formatting in hot loops.
   - Rust: `.clone()` to silence ownership design, unnecessary `collect`, repeated `Regex::new`, `Arc<Mutex<_>>` as a default, `join_all` over unbounded futures, CPU-bound work on async executors, and missing `with_capacity` for large collections.
   - Python: list membership in loops, sequential `requests` calls without session reuse, unbounded `asyncio.gather`, full `read()` or `json.load()` on growing files, `deepcopy`, repeated `datetime.strptime`, f-string logging at disabled levels, row-wise pandas loops, and CPU work on the event loop.
33. Measure when possible. Use the narrowest configured command intent that exercises the path. If measurement is unavailable, report the result as complexity evidence rather than a speed claim. Do not compare local microbenchmarks to production user experience unless data size, cache state, network, concurrency, and tail-latency conditions are comparable.
34. Treat deploys, restarts, migrations, rebalances, and cache warmups as performance events. A path that is fast only after warm caches, settled JIT, stable replicas, or completed compaction should report cold-start and recovery risk separately from steady-state speed.
35. Keep large performance architecture changes separate. Watcher refresh, bulk IPC commands, projection caches, virtualized lists, worker offload, queue introduction, cache layers, CDN behavior, sharding, and storage redesigns should be independent changes unless the repository evidence proves they must land together.

<!-- mustflow-section: postconditions -->
## Postconditions

- The hot path, cost multiplier, and affected input scale are explicit.
- The optimization goal is explicit: user-perceived speed, server cost, p95 or p99 stability, failure isolation, memory headroom, or developer-loop speed.
- The wall-time breakdown, CPU-versus-wait classification, saturation signal, and resource bottleneck class are explicit when evidence exists.
- Speed, memory, bundle, payload, query-count, render, CPU locality, allocation, lock, pool, queue, or I/O claims are backed by measurement or labeled as complexity-only.
- N+1 work, hidden quadratic scans, unbounded materialization, repeated serialization, repeated allocation, client/session churn, broad rendering, and unbounded or accidentally sequential async work are removed or reported.
- Caches, queues, batching, concurrency, workers, streams, CDN or HTTP caching, media optimization, and projections have invalidation, ordering, duplicate, partial-failure, cancellation, backpressure, capacity, stale-data, and memory behavior defined where relevant.
- Correctness, security, durability, privacy, and user-visible semantics remain intact or are explicitly reported as tradeoffs.

<!-- mustflow-section: verification -->
## Verification

Use configured oneshot command intents when available:

- `changes_status`
- `changes_diff_summary`
- `build`
- `test_related`
- `docs_validate_fast`
- `test_release`
- `mustflow_check`

Use the narrowest configured test, build, docs, release, or mustflow intent that proves the changed performance surface. Do not infer raw benchmark, profiler, browser, database, package-manager, server, or watcher commands.

<!-- mustflow-section: failure-handling -->
## Failure Handling

- If metrics vary by local hardware or concurrent process load, state the measurement boundary and avoid broad claims.
- If timings are distorted by an orphaned, overlapping, or stale build/test process, classify the measurement as invalid before taking a new baseline.
- If the hot path, input scale, or invalidation rule is unknown, prefer a small semantics-preserving cleanup or report the missing evidence instead of adding cache or concurrency complexity.
- If correctness conflicts with performance, prioritize correctness and report the tradeoff.
- If configured verification is missing, report the missing command intent instead of inventing a raw command.

<!-- mustflow-section: output-format -->
## Output Format

- Performance surface and hot path
- Cost multiplier and input scale
- Time breakdown and resource bottleneck class
- Optimization goal and ROI priority
- Performance evidence: measured, complexity-only, or unverified
- Semantics preserved: order, duplicates, IDs, consistency, partial failure, cancellation, and stale result handling
- Optimization applied or recommended
- Cache, queue, batching, concurrency, projection, UI, payload, media, memory, runtime, lock, pool, stream, retry, timeout, deployment, sharding, and I/O notes where relevant
- Command intents run
- Skipped measurements and reasons
- Remaining performance risk
