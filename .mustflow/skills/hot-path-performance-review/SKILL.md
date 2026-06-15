---
mustflow_doc: skill.hot-path-performance-review
locale: en
canonical: true
revision: 1
lifecycle: mustflow-owned
authority: procedure
name: hot-path-performance-review
description: Apply this skill when code is created, changed, reviewed, or reported and the main performance risk is ordinary work repeated many times, such as repeated I/O, repeated scans, hidden quadratic lookup, per-item allocation, lock hold time, sequential async waits, unbounded fan-out, or missing observability for hot paths.
metadata:
  mustflow_schema: "1"
  mustflow_kind: procedure
  pack_id: mustflow.core
  skill_id: mustflow.core.hot-path-performance-review
  command_intents:
    - changes_status
    - changes_diff_summary
    - lint
    - build
    - test_related
    - test
    - docs_validate_fast
    - test_release
    - mustflow_check
---

# Hot Path Performance Review

<!-- mustflow-section: purpose -->
## Purpose

Catch performance bottlenecks caused by small ordinary operations running many times, waiting on slow boundaries, copying too much data, or holding shared resources too long.

The review question is not only "which line looks slow?" It is "how often does this run, what does each run allocate or fetch, does it cross an external boundary, and does it block a shared resource while waiting?"

<!-- mustflow-section: use-when -->
## Use When

- Code is created, changed, reviewed, or reported and the likely risk is repeated work, data-size growth, external round trips, lock or pool wait, allocation churn, serialization cost, cache behavior, queue throughput, retries, timeouts, or missing hot-path instrumentation.
- A loop, mapper, reducer, stream, LINQ pipeline, iterator chain, ORM access, request handler, worker, queue consumer, renderer, export, report, import, sync, or batch job processes many items.
- Code calls a database, ORM relation, Redis, filesystem, HTTP API, RPC, object storage, child process, provider SDK, logger, metrics sink, parser, formatter, serializer, compressor, cryptographic function, image processor, or lock from a repeated path.
- A review or final report claims that a path is fast enough, scalable, bounded, batched, cached, parallel, safe under p95 or p99 load, or not worth optimizing.

<!-- mustflow-section: do-not-use-when -->
## Do Not Use When

- The task is a full performance optimization, benchmark design, latency budget, profiling, bundle-budget, media-delivery, or p95/p99 measurement project; use `performance-budget-check` as the main route.
- The task only changes cleanup, cancellation, retained references, native handles, or resource lifetime without throughput or latency risk; use `memory-lifetime-review`.
- The task only changes database schema or query correctness with no hot-path or repeated-access concern; use the matching database skill.
- The only concern is vague "make it faster" wording without code paths, input scale, repeated execution, external boundaries, or measurement evidence to inspect.

<!-- mustflow-section: required-inputs -->
## Required Inputs

- Hot path: the request, loop, render, job, export, import, queue consumer, sync, report, or command path under review.
- Multipliers: requests, rows, items, files, users, tenants, retries, pages, renders, workers, queue messages, shards, or nested loops that multiply the work.
- Per-iteration cost: external calls, queries, filesystem reads, allocations, clones, DTO conversions, JSON parse/stringify, logging, formatting, regex, sorting, hashing, image or crypto work, and lock hold time.
- Boundary ledger: DB, network, cache, filesystem, IPC, provider SDK, queue, logger, metrics sink, transaction, pool, mutex, thread, goroutine, task, or UI main thread crossed by the path.
- Data-size and tail-latency evidence when available: p50, p95, p99, row count, payload size, allocation count, query count, round-trip count, queue depth, pool wait, lock wait, cache hit rate, retry count, or timeout behavior.
- Correctness boundaries: order, duplicates, idempotency, authorization, tenant isolation, consistency, partial failure, stale data, cancellation, retry semantics, and error behavior.
- Relevant command-intent contract entries for build, tests, docs, release checks, and mustflow validation.

<!-- mustflow-section: preconditions -->
## Preconditions

- The task matches the Use When conditions and does not match the Do Not Use When exclusions.
- Higher-priority instructions and `.mustflow/config/commands.toml` have been checked for the current scope.
- Required inputs are available, or missing inputs can be reported without guessing.
- If a real optimization, measurement plan, benchmark, profiling change, latency budget, or performance claim is being implemented, also use `performance-budget-check`.
- If cache, queue, retry, timeout, health, worker, external call, or operational behavior changes, also use `backend-reliability-change`.
- If database query shape, index fit, transaction scope, pagination, or migration behavior changes, also use the matching database skill.
- If personal data, authorization variance, tenant keys, logs, or telemetry are part of the performance path, also use `security-privacy-review`.

<!-- mustflow-section: allowed-edits -->
## Allowed Edits

- Add or tighten batching, projection, lookup tables, bounded concurrency, timeout or cancellation wiring, bulk writes, cache-key boundaries, queue backpressure, transaction or lock narrowing, and focused hot-path tests tied to the task.
- Add lightweight observability for query count, external-call count, payload size, cache hit rate, queue depth, retry count, pool wait, lock wait, or function timing when repository evidence supports it.
- Replace repeated scans, per-item clients, unbounded materialization, per-item logging, or repeated parsing with existing project patterns.
- Do not add speculative caches, broad rewrites, unbounded parallelism, new infrastructure, or benchmark-only code without evidence for the hot path and invalidation boundary.
- Do not trade correctness, authorization, privacy, ordering, durability, partial-failure behavior, or user trust for speed without explicit product acceptance.

<!-- mustflow-section: procedure -->
## Procedure

1. Count the path before judging it. State how many times the code can run after multiplying by requests, rows, items, retries, renders, jobs, pages, tenants, and nested loops.
2. Build a cost ledger with five columns: iteration count, data size, round-trip count, wait time, and copy or allocation count.
3. Check repeated external access first.
   - A loop around DB, ORM, Redis, HTTP, RPC, filesystem, object storage, IPC, provider SDK, logging sink, or child process is the first suspect.
   - ORM relation access can be a query even when it looks like a property read; treat lazy loading as guilty until query count evidence says otherwise.
4. Check multi-pass collection code. `map`, `filter`, `reduce`, `forEach`, LINQ, streams, iterator chains, and comprehensions can traverse data several times. Count passes and intermediate arrays before admiring the one-liner.
5. Check hidden quadratic lookup. A loop containing `includes`, `contains`, `find`, `indexOf`, `some`, `filter`, list membership, row-wise DataFrame work, or another linear scan is often `O(n^2)`. Prefer `Set`, `Map`, lookup tables, sorted merge, or database-side join when semantics match.
6. Preserve semantics when changing data structures. State order, duplicates, first or last winner, missing IDs, stable sort, tie-breakers, and authorization visibility before replacing arrays with maps or sets.
7. Check database shape.
   - Avoid unbounded `SELECT *`, full entity hydration, large JSON/TEXT/BLOB columns, `findAll`, row-by-row saves, and per-item relation access.
   - Check whether predicates can use indexes. Functions around indexed columns, leading wildcard search, unselective filters, implicit casts, and mismatched sort order often defeat indexes.
   - Treat large `OFFSET ... LIMIT ...` pages as linearly expensive unless the product truly needs arbitrary jumps. Prefer stable keyset or cursor pagination when possible.
8. Check transaction and lock hold time. Do not hold DB transactions, mutexes, synchronized blocks, distributed locks, or global locks across network calls, file uploads, JSON conversion, logs, long computation, or user-controlled waits.
9. Check async shape. Sequential `await` in a loop is still serial work. Independent I/O usually needs bounded concurrency, while `Promise.all` over thousands of items, unbounded goroutines, unbounded futures, or thread-pool bypasses can melt the shared resource.
10. Reuse expensive clients and sessions. Per-request or per-item HTTP clients, DB clients, ORM clients, SDK clients, connection pools, TLS handshakes, regexes, date formatters, and thread pools are performance traps unless the API requires that lifecycle.
11. Check cache honesty. A cache needs a bounded key space, invalidation or TTL, max size, authorization dimensions, negative-cache policy, stale behavior, and cache stampede protection such as locking, singleflight, early refresh, or request coalescing.
12. Check logging and telemetry in hot paths. Repeated debug logs, eager log-string creation, whole-object serialization, high-cardinality metrics, and JSON formatting for discarded logs can dominate CPU and I/O during incidents.
13. Check string, JSON, DTO, and clone churn. Repeated string concatenation, `JSON.parse(JSON.stringify(...))`, `cloneDeep`, broad object spread, deep copy, repeated DTO-to-DTO conversion, and repeated serialization can move the bottleneck into "clean" mapping code.
14. Check large value passing and materialization. In value-copy languages or APIs, large structs, arrays, buffers, spread copies, full file reads, full JSON loads, and eager `collect` calls can turn neat code into memory traffic.
15. Check regex, parsing, formatting, and locale work. Nested or ambiguous regexes, repeated date parsing, timezone conversion, numeric or locale formatting, and per-row formatter creation should be reviewed with worst-case input in mind.
16. Check CPU-heavy work in request or UI paths. Image resizing, compression, encryption, hashing, diffing, report generation, spreadsheet export, and search indexing may need batching, worker offload, queueing, or streaming, but only with clear backpressure and failure behavior.
17. Check queues and workers. Moving work to a queue only moves the bottleneck unless consumers batch DB writes, bulk external calls where safe, bound retries, apply jitter, define poison-message handling, and expose backlog.
18. Check retry and timeout multiplication. A request with several calls, long timeouts, and several retries can become a tail-latency monster. Count worst-case wait and verify idempotency before adding more attempts.
19. Review tail behavior, not just average. p50 can look fine while p95 or p99 holds locks, connections, workers, or thread-pool slots long enough to hurt everyone else.
20. Add observability before large optimization when evidence is missing. Prefer query count, external-call count, payload bytes, allocation count, cache hit rate, queue backlog, pool wait, lock wait, retry count, and span timing over guessing.
21. Rank the likely payoff. Usually fix repeated external round trips, N+1 access, hidden quadratic scans, overfetching, wide transactions, lock hold time, unbounded fan-out, and missing timeouts before micro-optimizing arithmetic.
22. Label evidence honestly. If there is no configured benchmark or production trace, report the finding as static complexity or hot-path risk, not measured speedup.

<!-- mustflow-section: postconditions -->
## Postconditions

- Hot path, cost multipliers, data size, round-trip count, wait points, and copy or allocation points are explicit.
- N+1 queries, repeated external calls, hidden quadratic scans, unbounded materialization, sequential waits, unbounded fan-out, per-item client creation, broad logging, repeated serialization, and lock or transaction hold time are fixed or reported.
- Cache, queue, retry, timeout, batching, bulk-write, concurrency, pagination, projection, index-fit, and observability behavior are explicit where relevant.
- Correctness, authorization, tenant isolation, ordering, duplicates, partial failure, cancellation, and stale-data behavior remain intact or are called out as tradeoffs.
- Performance claims are backed by configured evidence or labeled as static review risk.

<!-- mustflow-section: verification -->
## Verification

Use configured oneshot command intents when available:

- `changes_status`
- `changes_diff_summary`
- `lint`
- `build`
- `test_related`
- `test`
- `docs_validate_fast`
- `test_release`
- `mustflow_check`

Use the narrowest configured test, build, docs, release, or mustflow intent that covers the changed hot path. Do not infer raw benchmark, profiler, database, server, browser, load-test, or package-manager commands.

<!-- mustflow-section: failure-handling -->
## Failure Handling

- If a configured test or build fails, preserve the failing intent and output tail, then fix only the behavior or contract exercised by the failure.
- If the hot path, multiplier, or data-size boundary is unknown, report the missing evidence instead of adding caches, workers, or concurrency complexity.
- If optimization conflicts with correctness, authorization, privacy, durability, or ordering, keep correctness and report the tradeoff.
- If measurement requires unconfigured benchmark, profiler, production trace, database, browser, load-test, or server access, report it as manual evidence instead of running raw commands.

<!-- mustflow-section: output-format -->
## Output Format

- Hot path reviewed
- Cost ledger: iteration count, data size, round trips, wait time, copy or allocation count
- Repeated external access, N+1, hidden quadratic scans, and multi-pass collection findings
- DB, pagination, index-fit, transaction, lock, async, client reuse, cache, queue, retry, timeout, logging, serialization, clone, regex, parsing, formatting, and CPU-heavy work checked where relevant
- Optimization or review recommendation
- Evidence level: measured, configured-test evidence, static complexity risk, manual-only, missing, or not applicable
- Command intents run
- Skipped measurements and reasons
- Remaining hot-path performance risk
