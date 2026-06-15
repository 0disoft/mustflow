---
mustflow_doc: skill.database-query-bottleneck-review
locale: en
canonical: true
revision: 2
lifecycle: mustflow-owned
authority: procedure
name: database-query-bottleneck-review
description: Apply this skill when code is created, changed, reviewed, or reported and database query performance risk can be spotted from the diff, including join fan-out, N+1 calls, over-eager loading, SELECT *, unstable LIMIT, OFFSET pagination, composite index fit, range predicates, functions on indexed columns, parameter type mismatch, wildcard search, OR predicates, large IN lists, COUNT for existence, NOT IN with NULL, LEFT JOIN filters, pre-aggregation, latest-row queries, wide sort/group/distinct, JSON filters, tenant and soft-delete scope, estimated-versus-actual row drift, statistics, plan-cache skew, missing-index recommendations, plan forcing, and long transactions.
metadata:
  mustflow_schema: "1"
  mustflow_kind: procedure
  pack_id: mustflow.core
  skill_id: mustflow.core.database-query-bottleneck-review
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

# Database Query Bottleneck Review

<!-- mustflow-section: purpose -->
## Purpose

Find database bottleneck candidates from code shape before reaching for live execution plans.

The review question is: "How many rows can this request touch, how many times can it repeat, and can the available indexes follow the same path as the query?" Execution plans are evidence, but PR diffs often already reveal cardinality explosion, unbounded scans, index defeat, N+1 access, unstable pagination, and long transaction waits.

<!-- mustflow-section: use-when -->
## Use When

- Code is created, changed, reviewed, or reported and the risk is database query latency, row explosion, index mismatch, ORM query shape, resolver fan-out, transaction wait, pagination cost, or plan instability.
- A list, feed, search, report, dashboard, export, admin table, GraphQL resolver, serializer, worker, queue consumer, background sync, import, API endpoint, repository, ORM model, query builder, raw SQL, stored procedure, or database-backed cache path is introduced or changed.
- Code or docs claim a query is indexed, fast, paginated, batched, preloaded, eager-loaded, tenant-scoped, safe for large data, or covered by an execution plan.
- The database engine is unknown or mixed, and the review must stay engine-agnostic while preserving hooks for PostgreSQL, SQLite, MySQL, SQL Server, or ORM-specific follow-up.

<!-- mustflow-section: do-not-use-when -->
## Do Not Use When

- The task changes database ownership, schema, migrations, persistence boundaries, data lifecycle, restore, export, or cache-as-store behavior; use `database-change-safety` or `database-migration-change` first and this skill only for query bottleneck adjunct review.
- The task is PostgreSQL-specific, SQLite-specific, MySQL-specific, SQL Server-specific, or engine-feature-specific; use the matching engine skill first and this skill only for generic query-shape checks.
- The task is a full measurement, benchmark, profiling, p95 or p99 performance budget, or production-tuning project; use `performance-budget-check` first.
- The only database path is a tiny hard-capped lookup table, static seed list, or one-off admin maintenance query whose bounded size and manual nature are explicit.

<!-- mustflow-section: required-inputs -->
## Required Inputs

- Query surface: raw SQL, ORM call, query builder, repository method, resolver, serializer, worker, import/export path, report, dashboard, or transaction block under review.
- Cardinality shape: starting rows, join fan-out, relation counts, tenant or user scope, filter selectivity, sort/group/distinct width, pagination depth, and data skew assumptions when known.
- Repetition shape: loops, resolvers, serializers, lazy relations, per-item queries, queue consumers, retries, workers, pages, tenants, or nested calls that multiply query count.
- Index and plan evidence when available: indexes, constraints, query plans, estimated and actual rows, loops, buffers, temp files, statistics freshness, extended statistics, covering-index expectations, plan-cache behavior, and missing-index recommendations.
- Database and ORM context: engine, version when known, ORM eager or lazy loading behavior, generated SQL, parameter binding types, transaction defaults, connection pool limits, and read replica or plan cache behavior.
- Correctness boundaries: tenant isolation, authorization, soft delete, retention, stable ordering, duplicate handling, null semantics, consistency, stale data, partial failure, and transaction semantics.
- Relevant command-intent contract entries for build, tests, docs, release checks, and mustflow validation.

<!-- mustflow-section: preconditions -->
## Preconditions

- The task matches the Use When conditions and does not match the Do Not Use When exclusions.
- Higher-priority instructions and `.mustflow/config/commands.toml` have been checked for the current scope.
- Required inputs are available, or missing row-count, index, ORM, or engine evidence can be reported without guessing.
- If the query changes persisted behavior, migrations, authorization, tenant scope, privacy, or public API output, also apply the relevant database, security, migration, or API skill.
- If engine-specific claims are made, use the matching engine skill before claiming feature support or plan behavior.

<!-- mustflow-section: allowed-edits -->
## Allowed Edits

- Narrow projection, add stable ordering, convert offset pagination to keyset or cursor pagination, batch per-item queries, replace lazy relation access with explicit loading, push joins and aggregation to the database, pre-aggregate before joining, and shorten transactions when semantics are clear.
- Add or adjust index declarations, generated columns, expression indexes, partial indexes, composite index order, query hints, statistics notes, or plan evidence only when the repository owns that surface and the engine-specific skill supports the change.
- Add focused tests or fixtures for query count, stable ordering, tenant scope, authorization, pagination, null semantics, duplicate handling, and generated SQL when local patterns support them.
- Do not add speculative indexes, caches, denormalization, materialized views, plan forcing, read replicas, or search infrastructure without workload evidence and ownership of write cost, freshness, and invalidation.
- Do not trade correctness, tenant isolation, authorization, null semantics, stable pagination, or transaction safety for a faster-looking query.

<!-- mustflow-section: procedure -->
## Procedure

1. Start with cardinality, not SQL prettiness. Multiply parent rows by child rows and joined relation counts. A path like user to orders to items to options can explode before any single predicate looks suspicious.
2. Count query repetition.
   - Treat DB calls inside `for`, `map`, `forEach`, streams, serializers, resolvers, template rendering, and queue consumers as N+1 candidates.
   - Open helper and ORM relation bodies; property access can be a query when lazy loading is enabled.
3. Check eager loading with suspicion.
   - Eager loading, `includes`, `preload`, `join fetch`, and `select_related` can replace N+1 with overfetching.
   - Verify the screen, API, worker, or report needs the loaded relations and columns.
4. Check projection width.
   - Flag unbounded `SELECT *`, full entity hydration, wide DTOs, large JSON, TEXT, BLOB, image, metadata, and audit columns in list or sort paths.
   - Prefer thin keys and required columns first, then fetch detail columns only after narrowing the row set.
5. Check deterministic ordering.
   - `LIMIT` without stable `ORDER BY` is not a real pagination contract.
   - `ORDER BY` with `LIMIT` needs an index-compatible ordering or the database may sort a large working set to return a few rows.
6. Check offset pagination.
   - Large `OFFSET ... LIMIT ...` usually means the database counts and discards earlier rows.
   - Prefer keyset or cursor pagination with a stable tie-breaker such as `(created_at, id)` when arbitrary page jumps are not a product requirement.
7. Match composite indexes to query shape.
   - Review equality predicates, range predicates, join keys, sort keys, and grouping keys in order.
   - Do not assume "all WHERE columns are in the index" means the index is useful.
   - Identify where the index stops narrowing and starts scanning, especially after range predicates.
8. Look for index defeat.
   - Functions or casts around columns, such as `LOWER(email)`, `DATE(created_at)`, `CAST(id AS text)`, timezone conversion, arithmetic, or JSON extraction can prevent ordinary index use.
   - Use normalized stored values, generated columns, expression indexes, or query rewrites when the engine and workload justify them.
9. Check parameter and type mismatch.
   - UUID versus text, integer versus string, timezone-aware versus local timestamp, decimal versus float, collation mismatch, and enum/string mismatch can distort plans or force casts.
   - Bind parameters in the column's native type where the driver and ORM allow it.
10. Classify search patterns.
    - Prefix search and contains search are different workloads.
    - Leading wildcard `LIKE '%term%'`, case-insensitive search, trigram, full-text, search-engine, and separate search-table paths need explicit ownership.
11. Check `OR`, `IN`, and existence shapes.
    - `OR` across different columns can confuse index choice; consider separate queries or `UNION ALL` only when duplicate and ordering semantics are clear.
    - Very large `IN` lists can hurt parsing, planning, network transfer, and cache behavior; consider temp tables, array parameters, table-valued parameters, bulk insert plus join, or batching.
    - Use `EXISTS` for existence checks instead of `COUNT(*) > 0` when exact counts are unnecessary.
12. Check negative logic and null semantics.
    - `NOT IN` with NULLs can return surprising results; prefer `NOT EXISTS` or explicit NULL policy.
    - `LEFT JOIN` followed by `WHERE right_table.col = ...` often turns into an inner join. Decide whether null-preserving behavior belongs in the join condition or the result filter.
13. Aggregate before join fan-out.
    - Avoid joining several one-to-many tables and grouping only at the end when each table can be pre-aggregated to the needed grain first.
    - Check whether `DISTINCT` is hiding accidental duplicate multiplication instead of solving the query shape.
14. Check latest-row and per-parent subqueries.
    - A correlated subquery that asks for the latest child row per parent can become one lookup per parent.
    - Prefer window functions, `DISTINCT ON`, lateral joins, grouped max joins, or precomputed current rows when the engine and semantics support them.
15. Keep sorts, groups, and distinct narrow.
    - Sorting, grouping, or de-duplicating wide rows with large text, JSON, or blob columns burns memory and temp storage.
    - Narrow to keys first, then join or fetch large columns after the winning rows are known.
16. Treat JSON filters as schema decisions.
    - A frequently queried JSON path is no longer "just metadata".
    - Promote it to a real column, generated column, expression index, GIN-style index, or search surface when query volume and engine support justify it.
17. Check tenant and soft-delete scope.
    - Multi-tenant reads, updates, deletes, counts, and background jobs need tenant or account scope unless a cross-tenant operation is explicit and bounded.
    - Soft-delete predicates such as `deleted_at IS NULL` often belong in partial indexes, default scopes, and tests, but default scopes must not hide admin or retention semantics.
18. Separate planner evidence from wishful thinking.
    - Compare estimated rows and actual rows when plan evidence exists; large gaps point to stale statistics, missing extended statistics, correlation mistakes, or data-skew problems, not only missing indexes.
    - Treat `EXPLAIN` without runtime evidence as a hypothesis. Prefer representative runtime evidence such as PostgreSQL `EXPLAIN ANALYZE`, MySQL `EXPLAIN ANALYZE`, SQL Server actual execution plans, Query Store history, ORM query-count traces, or production telemetry when the repository has safe access to it.
    - Check loops, rows examined, rows returned, buffers, temp files, sort method, lock waits, pool waits, and query count when available.
19. Treat plan cache, parameter skew, and missing-index advice carefully.
    - Prepared statements and cached plans can regress when parameter values are skewed by tenant, status, country, or time.
    - Missing-index recommendations are candidates, not commands; check overlap with existing indexes, write amplification, sort coverage, filtered or partial-index fit, and composite merge opportunities.
    - Plan forcing is a last resort with monitoring and fallback, not proof that the query shape is healthy. It can freeze yesterday's good plan into tomorrow's outage when data shape changes.
20. Check transaction scope.
    - Long transactions, row locks, `SELECT FOR UPDATE`, external API calls, file upload waits, network calls, serialization, logging, and user-controlled waits inside a transaction can make a fast query produce slow service behavior.
    - Shorten the transaction and move external effects after commit through outbox, job, or reconciliation patterns when needed.
21. Label evidence honestly.
    - Static diff review can identify likely bottlenecks but cannot prove actual latency.
    - Use plan or production evidence only when representative parameters, data size, cache state, and engine version are known.

<!-- mustflow-section: postconditions -->
## Postconditions

- Query cardinality, repetition count, projection width, pagination shape, index-fit assumptions, and transaction scope are explicit.
- N+1 access, over-eager loading, `SELECT *`, unstable `LIMIT`, large offset pagination, join fan-out, wide sort/group/distinct, bad existence checks, null-sensitive negative logic, unbounded `IN`, and long transactions are fixed or reported.
- Index, statistics, extended-statistics, plan-cache, search, JSON, tenant, soft-delete, plan-forcing, and engine-specific claims are tied to evidence or marked as unverified.
- Correctness, tenant isolation, authorization, ordering, null semantics, duplicates, stale data, and partial failure remain intact or are reported as tradeoffs.

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

Use the narrowest configured test, build, docs, release, or mustflow intent that covers the changed query path. Do not infer raw database shells, live query plans, migrations, profilers, load tests, or package-manager commands outside the command contract.

<!-- mustflow-section: failure-handling -->
## Failure Handling

- If row counts, index definitions, generated SQL, or ORM loading behavior are unknown, report static risk rather than claiming a query is safe or slow.
- If a query change needs engine-specific feature support, stop at the generic recommendation and use the matching engine skill before editing.
- If an index would improve reads but hurt writes or migrations, report the tradeoff and require workload evidence.
- If the safe fix requires live database access, destructive migration, provider console action, or unconfigured plan commands, report the manual boundary instead of running raw commands.
- If a configured test or build fails, preserve the failing intent and output tail, then fix only the query behavior or contract exercised by the failure.

<!-- mustflow-section: output-format -->
## Output Format

- Query path reviewed
- Cardinality and repetition ledger
- Projection, ordering, pagination, join fan-out, eager or lazy loading, index fit, search, JSON, tenant or soft-delete, plan evidence, estimated-versus-actual rows, statistics, plan-cache, missing-index, plan-forcing, and transaction checks where relevant
- Query, index, batching, pagination, projection, aggregation, or transaction change made or recommended
- Evidence level: static diff risk, configured-test evidence, plan evidence, measured production evidence, manual-only, missing, or not applicable
- Command intents run
- Skipped database measurements and reasons
- Remaining database bottleneck risk
