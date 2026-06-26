---
mustflow_doc: skill.api-request-performance-review
locale: en
canonical: true
revision: 2
lifecycle: mustflow-owned
authority: procedure
name: api-request-performance-review
description: Apply this skill when API endpoints, handlers, controllers, resolvers, serializers, mappers, service methods, or route-level request paths are created, changed, reviewed, or reported and the main latency risk is repeated work inside one request, including per-request I/O counts, DB or ORM fan-out, Redis fan-out, external API calls, transaction scope, pool acquire wait, cache miss paths, serialization, response size, request-path CPU work, or missing trace evidence.
metadata:
  mustflow_schema: "1"
  mustflow_kind: procedure
  pack_id: mustflow.core
  skill_id: mustflow.core.api-request-performance-review
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

# API Request Performance Review

<!-- mustflow-section: purpose -->
## Purpose

Review API latency as repeated work inside one request, not as a search for an ugly slow function.

The core question is: "For one request, how many times do we repeat the same I/O, data fetch, serialization, lock wait, transaction wait, or CPU-heavy operation before sending the response?"

<!-- mustflow-section: use-when -->
## Use When

- An API endpoint, handler, controller, route, resolver, serializer, mapper, service method, middleware, webhook receiver, backend-for-frontend path, admin API, or request-scoped worker path is created, changed, reviewed, or reported.
- The likely risk is per-request I/O, DB query count, ORM lazy loading, Redis fan-out, external API calls, filesystem reads, transaction scope, pool acquire wait, cache miss behavior, JSON serialization, response bytes, DTO mapping, compression, crypto, image/file processing, or missing spans.
- Code or docs claim an API path is fast, paginated, cached, batched, preloaded, streaming, bounded, safe at p95 or p99, or protected by instrumentation.
- A route-level performance finding needs a request cost ledger before a broader performance-budget, load-test, database-plan, or profiling project.

<!-- mustflow-section: do-not-use-when -->
## Do Not Use When

- The task is a general hot-path review without an API request boundary; use `hot-path-performance-review`.
- The task is only database query shape, migration safety, or engine-specific query tuning with no route-level request path; use `database-query-bottleneck-review` or the matching database skill.
- The task is primarily cache correctness, stale data spread, permission leakage, or invalidation order; use `cache-integrity-review`.
- The task is primarily reliability, retry, timeout, queue, health-check, or operational failure handling rather than per-request latency; use `backend-reliability-change`.
- The task is a full measurement, benchmark, production profiling, load-test, service-level objective, or p95/p99 performance-budget project; use `performance-budget-check` as the main route.
- The route-level request path is slow mainly because of LLM response latency, time to first token, first useful output, streaming, LLM round trips, tool-call wait, prompt-cache latency, model routing speed, realtime continuation, priority tier, or predicted-output behavior; use `llm-response-latency-review`.
- The API path is explicitly tiny, hard-capped, offline-only, or manual-only and the bounded request size is documented.

<!-- mustflow-section: required-inputs -->
## Required Inputs

- Request path: endpoint, route, handler, controller, resolver, serializer, mapper, middleware, service method, response builder, and downstream calls under review.
- Request cost ledger inputs: route span, DB query count, Redis call count, external API call count, filesystem or object-storage calls, payload size, response bytes, JSON serialization time, DTO mapping time, cache hit or miss, queue time, pool acquire wait, transaction duration, lock wait, and request-path CPU work when available.
- Data shape: request parameters, page size, relation counts, tenant or user scope, expected result size, maximum payload, large JSON/TEXT/BLOB fields, and response projection.
- ORM behavior: lazy loading, eager loading, generated SQL, relation access in serializers or templates, `include` versus explicit `select`, relation load strategy, Django `select_related` and `prefetch_related`, Rails `includes`, `preload`, `eager_load`, and `strict_loading`, or equivalent framework behavior.
- Database evidence when available: actual SQL, query count, repeated `SELECT ... WHERE id = ?`, `SELECT *`, app-side filtering or sorting, deep `OFFSET`, `COUNT(*)`, index fit for `WHERE` plus `ORDER BY` plus `LIMIT`, `EXPLAIN`, scan type, sort method, estimated rows, actual rows, join cardinality, and selectivity.
- Cache and Redis evidence: request-scope cache, key dimensions, cache miss path, `MGET`, pipeline behavior, Redis round trips, Redis Slow Log limitations, hot keys, fallback behavior, and stampede controls.
- Correctness boundaries: authorization, tenant isolation, ordering, duplicates, pagination stability, consistency, idempotency, timeout, cancellation, partial failure, stale data, and response contract.
- Relevant command-intent contract entries for build, tests, docs, release checks, and mustflow validation.

<!-- mustflow-section: preconditions -->
## Preconditions

- The task matches the Use When conditions and does not match the Do Not Use When exclusions.
- Higher-priority instructions and `.mustflow/config/commands.toml` have been checked for the current scope.
- Required inputs are available, or missing route, query-count, trace, cache, or payload evidence can be reported without guessing.
- If database query shape is changed, also apply the matching database skill.
- If cache correctness or invalidation behavior changes, also apply `cache-integrity-review`.
- If retry, timeout, queue, health, idempotency, or external-service failure behavior changes, also apply `backend-reliability-change`.
- If authorization, tenant scope, personal data, logs, telemetry, or cache keys affect the API path, also apply the relevant security or privacy skill.

<!-- mustflow-section: allowed-edits -->
## Allowed Edits

- Narrow projection, remove route-level overfetching, batch per-item database or Redis calls, replace repeated external calls with bounded aggregation, add request-scope memoization, move app-side filtering or sorting into the right data layer, shorten transactions, and add bounded concurrency where semantics are clear.
- Add or tighten route-level observability for route span timing, DB query count, pool acquire wait, Redis count, cache hit or miss, external latency, response bytes, JSON serialization time, queue time, and request-path CPU work when local patterns support it.
- Add focused tests or fixtures for query count, lazy-loading prevention, pagination stability, response projection, authorization scope, cache key dimensions, timeout behavior, serialization shape, or error boundaries when repository patterns support them.
- Do not add speculative caches, unbounded eager loading, unbounded concurrency, broad denormalization, new infrastructure, raw load tests, or profiling hooks without evidence and ownership of invalidation, backpressure, and failure behavior.
- Do not trade correctness, authorization, tenant isolation, response contract, idempotency, ordering, or partial-failure behavior for a faster-looking request path.

<!-- mustflow-section: procedure -->
## Procedure

1. Name the API request boundary first. Include the route, handler, controller, resolver, serializer, mapper, service method, response builder, and downstream calls that run before the response is committed.
2. Build a Request cost ledger. Record DB query count, Redis round trips, external API calls, filesystem or object-storage calls, cache hit or miss, payload size, response bytes, JSON serialization time, DTO mapping time, pool acquire wait, transaction duration, lock wait, queue time, and request-path CPU work. Mark unavailable values as missing evidence rather than inventing them.
3. Count repeated I/O before reading abstraction names.
   - A loop, mapper, serializer, resolver, template, or DTO builder that calls DB, Redis, HTTP, RPC, filesystem, object storage, provider SDK, queue, logger, metrics, crypto, compression, or image processing is the first suspect.
   - Sequential `await` inside a loop is still serial request latency unless the operations are order-dependent.
   - Unbounded fan-out is not a fix. Use bounded concurrency only when the downstream resource and failure behavior are understood.
4. Inspect ORM serializer and mapper paths.
   - Property reads such as `user.team.name`, `order.items`, `post.comments`, or equivalent relation access can be hidden queries.
   - In Django, choose `select_related` for single-valued relations and `prefetch_related` for multi-valued relations when the route actually needs them.
   - In Rails, compare `includes`, `preload`, `eager_load`, and `strict_loading`; use strict loading or query-count tests where local patterns support them.
   - Treat eager loading too much as a separate bug. It can replace N+1 with row explosion, duplicate parents, memory bloat, or huge response mapping.
   - For Prisma-style APIs, do not trust `include` as a performance proof. Compare actual SQL, query count, selected columns, relation load strategy, and response shape.
   - Treat repeated `count`, `exists`, `sum`, `latest`, or `first` queries in list serialization as N+1 candidates; prefer grouped aggregation, batched lookup, or database-side projection when semantics match.
5. Check query projection and response projection together.
   - Flag `SELECT *`, full entity hydration, unbounded DTOs, and list endpoints that fetch large JSON, TEXT, BLOB, image, metadata, audit, or internal columns.
   - Fetch detail fields only after narrowing the row set when the route returns a list, feed, search result, or admin table.
6. Push filtering, sorting, grouping, and distinct work to the right layer.
   - App-side filtering after loading many rows usually hides a database or cache misuse.
   - App-side sorting, grouping, or `distinct` after join fan-out can turn a small response into a large server memory job.
   - Preserve authorization, tenant scope, null semantics, duplicates, and stable ordering when moving work.
7. Review pagination and counts as latency surfaces.
   - Deep `OFFSET` pages usually make the database count and discard earlier rows.
   - Prefer keyset or cursor pagination with stable tie-breakers when arbitrary page jumps are not a product requirement.
   - Expensive `COUNT(*)` for every request needs a product reason, approximate or cached count policy, or deferred count behavior.
8. Match indexes to the whole request query.
   - Check `WHERE`, `ORDER BY`, and `LIMIT` together instead of asking only whether one predicate has an index.
   - Prefer query-shaped index review over column-name index decoration: composite indexes often need equality predicates first, range or ordering columns next, and stable tie-breakers for pagination.
   - Functions around columns, implicit casts, `LOWER(email)`, `DATE(created_at)`, timezone conversion, `%keyword%`, low-selectivity predicates, and mismatched sort order can defeat useful index access. Expression indexes, range predicates, or search-specific indexes may be needed when the database owns that capability.
   - For soft-delete, tenant, status, or visibility predicates that appear on nearly every request, review partial or filtered indexes where the database supports them.
   - For list projections, check whether a covering or index-only access path is possible before fetching large JSON, TEXT, BLOB, HTML, metadata, or audit columns.
   - When plan evidence exists, compare `EXPLAIN` estimated rows with actual rows, join cardinality, loops, rows examined, rows returned, buffers, temp files, sort method, and lock or pool wait.
9. Keep external calls out of transactions.
   - Do not hold a DB transaction while waiting for an external API, file upload, object storage, Redis fallback, image processing, logging sink, or user-controlled operation.
   - Move external effects after commit with an outbox, job, reconciliation record, or idempotent follow-up only when the repository already owns that pattern.
10. Separate database execution time from pool acquire wait.
    - A query can look fast while the request waits for a saturated connection pool.
    - Review pool acquire time, pool size, transaction duration, connection leaks, per-request client creation, and slow downstream calls holding connections.
11. Check Redis as a network service, not as free memory.
    - Redis calls inside loops are request latency. Prefer `MGET`, pipelining, batching, or request-scope cache when semantics allow.
    - Redis Slow Log does not include client round-trip time, connection wait, serialization, or application loop overhead.
    - Review cache miss path, fallback DB pressure, stampede control, hot keys, and key cardinality before calling the cache safe.
12. Review cache key scope and miss behavior.
    - A key that is too narrow can leak or serve wrong data; a key that is too wide can explode cardinality and never hit.
    - Count what happens on miss: DB calls, external calls, serialization, lock or singleflight behavior, early refresh, negative caching, stale serve, and timeout.
13. Count JSON, DTO, and response building costs.
    - Repeated JSON parse/stringify, broad DTO-to-DTO mapping, deep clone, object spread over large arrays, and whole-object logging can dominate route CPU.
    - Large response bytes increase server serialization, compression, network transfer, browser parse, and client cache pressure.
14. Check request-path CPU before offloading blame to the database.
    - Compression, crypto, hashing, image resize, PDF or spreadsheet generation, diffing, regex, report rendering, and large locale formatting can block the request.
    - For Node, look for event-loop blocking and flame graph evidence when available. For Go, use pprof evidence when available. For MongoDB, inspect `explain()` evidence when the route depends on MongoDB query shape.
15. Treat observability as part of the fix when evidence is missing.
    - Add OpenTelemetry or existing tracing spans only through local patterns.
    - Prefer route span, DB query count, Redis count, external-call count, pool acquire wait, cache hit or miss, external latency, response bytes, JSON serialization time, queue time, timeout count, and error category over vague "seems slow" comments.
16. Rank fixes by request payoff.
    - Usually fix per-item DB or Redis calls, ORM lazy loading, app-side filtering after overfetch, deep offset pagination, expensive counts, external calls inside transactions, pool waits, unbounded fan-out, huge responses, and missing spans before micro-optimizing helper code.
17. Label evidence honestly.
    - Static review can identify likely API latency risks but cannot prove speedup.
    - A trace from a tiny fixture, warm local cache, or empty database is not representative production evidence.
    - If actual SQL, query-count, or query-plan evidence is missing, say so instead of treating tidy ORM code as proof of efficient database behavior.

<!-- mustflow-section: postconditions -->
## Postconditions

- The API request boundary and Request cost ledger are explicit.
- DB query count, Redis call count, external API call count, cache hit or miss behavior, response bytes, serialization cost, transaction scope, pool acquire wait, and request-path CPU work are fixed, bounded, instrumented, or reported.
- ORM lazy loading, eager-loading overfetch, repeated count or aggregate queries, actual SQL and query count, `SELECT *`, app-side filtering or sorting, deep `OFFSET`, expensive `COUNT(*)`, index mismatch, composite/partial/expression/covering index fit, external call inside transaction, Redis loop, and cache miss amplification are checked where relevant.
- Correctness, authorization, tenant isolation, idempotency, ordering, pagination stability, partial failure, cancellation, timeout, and stale-data behavior remain intact or are reported as tradeoffs.
- API performance claims are backed by configured evidence, trace evidence, plan evidence, or labeled as static review risk.

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

Use the narrowest configured test, build, docs, release, or mustflow intent that covers the changed API request path. Do not infer raw server, load-test, benchmark, profiler, database shell, Redis shell, browser, or package-manager commands outside the command contract.

<!-- mustflow-section: failure-handling -->
## Failure Handling

- If route-level traces, query counts, payload size, cache behavior, or pool wait evidence are missing, report static risk instead of claiming measured latency.
- If the safe fix requires engine-specific database features, use the matching database skill before editing those surfaces.
- If the safe fix requires production traces, load tests, flame graphs, pprof captures, MongoDB `explain()` from live data, Redis Slow Log access, provider dashboards, or unconfigured commands, report the manual evidence boundary instead of running raw commands.
- If optimization conflicts with correctness, authorization, tenant isolation, idempotency, ordering, partial failure, or the response contract, keep correctness and report the tradeoff.
- If a configured test, build, docs, release, or mustflow command fails, preserve the failing intent and output tail, then fix only the behavior or contract exercised by the failure.

<!-- mustflow-section: output-format -->
## Output Format

- API request path reviewed
- Request cost ledger: route span, DB query count, Redis count, external API calls, filesystem or object-storage calls, payload size, response bytes, JSON serialization time, DTO mapping time, cache hit or miss, queue time, pool acquire wait, transaction duration, lock wait, and request-path CPU work
- ORM lazy loading, eager loading, actual SQL, query count, projection, pagination, count, index fit, app-side filtering or sorting, transaction, pool, Redis, cache miss, serialization, response size, CPU-heavy request work, and observability findings
- API request performance change made or recommended
- Evidence level: measured trace, configured-test evidence, plan evidence, static review risk, manual-only, missing, or not applicable
- Command intents run
- Skipped measurements and reasons
- Remaining API request performance risk
