---
mustflow_doc: skill.database-lock-contention-review
locale: en
canonical: true
revision: 1
lifecycle: mustflow-owned
authority: procedure
name: database-lock-contention-review
description: Apply this skill when code is created, changed, reviewed, or reported and database lock contention, hot rows, deadlocks, lock waits, row locks, gap or next-key locks, metadata locks, DDL locks, `SELECT ... FOR UPDATE`, `SKIP LOCKED`, optimistic locking, conditional updates, queue table claiming, counter caches, stock or balance updates, long transactions, lock timeouts, idle-in-transaction sessions, or lock observability can make database-backed work block, serialize, deadlock, or overload under concurrent traffic.
metadata:
  mustflow_schema: "1"
  mustflow_kind: procedure
  pack_id: mustflow.core
  skill_id: mustflow.core.database-lock-contention-review
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

# Database Lock Contention Review

<!-- mustflow-section: purpose -->
## Purpose

Review database-backed write paths by asking whether traffic is forced through the same row, range, index prefix, metadata lock, queue head, or long transaction.

The review question is not "is the database slow?" It is "which shared database resource are concurrent requests waiting on, and can the data shape, lock strength, lock order, transaction width, retry policy, and observability make that wait bounded and intentional?"

<!-- mustflow-section: use-when -->
## Use When

- Code creates, changes, reviews, or reports a database write path, queue table, worker claim query, counter cache, balance or stock update, reservation flow, idempotency record, ledger projection, status transition, batch update, delete job, online DDL path, migration plan, or lock-sensitive read path.
- The risk is hot-row contention, parent-row counters, shared aggregate rows, `SELECT ... FOR UPDATE`, `FOR NO KEY UPDATE`, `FOR SHARE`, `FOR KEY SHARE`, `NOWAIT`, `SKIP LOCKED`, optimistic version checks, conditional updates, advisory locks, distributed locks backed by database state, MySQL gap or next-key locks, SQL Server lock escalation, PostgreSQL DDL lock levels, MySQL metadata locks, deadlocks, lock waits, pool waits, or idle transactions.
- Code or docs claim a path is safe under high write concurrency, deadlock-safe, lock-efficient, no-downtime, queue-consumer safe, stock-safe, balance-safe, order-preserving, or low-lock.
- A database review needs a contention pass separate from query latency, migration compatibility, transaction correctness, generic race conditions, or backend observability.

<!-- mustflow-section: do-not-use-when -->
## Do Not Use When

- The task is only query latency, cardinality, projection width, pagination, N+1 access, or plan shape without blocking or lock contention risk; use `database-query-bottleneck-review`.
- The task is primarily old-code/new-schema compatibility, DDL rollout, backfill, generated clients, or destructive migration safety; use `database-migration-change` first and this skill only for lock-contention adjunct review.
- The task is primarily read -> decision -> write correctness, durable constraints, rollback behavior, transaction propagation, or after-commit side effects; use `transaction-boundary-integrity-review` first and this skill only for blocking, deadlock, or hot-resource pressure.
- The task is generic in-memory, filesystem, queue, socket, timer, or distributed shared-state interleaving with no database lock surface; use `race-condition-review` or `concurrency-invariant-review`.
- The database work is a one-off, manually bounded maintenance action on tiny data with no concurrent application traffic and no production-safety claim.

<!-- mustflow-section: required-inputs -->
## Required Inputs

- Contended resource: row, parent row, counter row, index prefix, range predicate, gap, queue head, table, partition, metadata lock, migration lock, advisory lock key, or connection pool that concurrent work can wait on.
- Workload shape: write rate, same-tenant or same-resource concentration, queue consumer count, batch size, worker parallelism, retry behavior, traffic spikes, table size, and whether old transactions or long reports can overlap.
- Database engine and version when known: PostgreSQL, MySQL/InnoDB, SQL Server, SQLite, managed database, ORM behavior, isolation level, lock wait timeout, statement timeout, transaction timeout, and pool limit.
- Locking path: exact SQL or ORM calls, selected indexes, predicates, `FOR UPDATE` variant, isolation level, update order, lock order, transaction start and end, and external calls or calculations inside the transaction.
- Data-shape alternatives: sharded counters, append-only ledgers, reservation tables, materialized summaries, per-tenant or per-shard queue lanes, partitioning, CQRS/read models, stage-specific tables, and conditional updates.
- Failure and retry evidence: deadlock classification, serialization failures, lock timeout handling, optimistic-lock row count checks, full-command retry budget, idempotency keys, poison or starvation handling, and manual recovery.
- Observability evidence: lock-wait logs, blocked-by and blocking query context, transaction age, pool wait metrics, deadlock logs, queue lag by shard, batch progress, migration lock waits, and configured command intents.

<!-- mustflow-section: preconditions -->
## Preconditions

- The task matches the Use When conditions and does not match the Do Not Use When exclusions.
- Higher-priority instructions and `.mustflow/config/commands.toml` have been checked for the current scope.
- Required inputs are available, or missing engine, isolation, index, workload, lock-order, timeout, or observability evidence can be reported without guessing.
- Existing local patterns for ledgers, reservations, counters, queue claiming, conditional updates, optimistic locks, outbox, retry classification, lock timeouts, and lock diagnostics have been searched before adding new shapes.
- If the contention path affects money, credits, inventory, permissions, tenant data, or external side effects, also apply the relevant payment, credit-ledger, business-rule, security, transaction, idempotency, queue, or observability skill.

<!-- mustflow-section: allowed-edits -->
## Allowed Edits

- Replace shared hot-row updates with append-only events, sharded counters, reservations, snapshots, materialized summaries, or stage-specific rows when local ownership and correctness allow it.
- Replace select-then-update with conditional updates, atomic upserts, optimistic version checks, affected-row checks, or database constraints when they preserve the invariant and reduce waiting.
- Narrow transaction scope by moving calculations, external API calls, object storage, email, webhooks, sleeps, slow serialization, and user-controlled work outside the lock-holding window.
- Choose weaker database locks, stable lock order, `NOWAIT`, `SKIP LOCKED`, chunked batch writes, partitioned work, queue shard keys, and lock timeout policy only when the semantic tradeoff is explicit.
- Add focused tests, fixtures, docs, or telemetry assertions for lock-timeout handling, deadlock retry, queue claiming, conditional-update failure, optimistic-lock conflicts, and synchronized template surfaces when local patterns support them.
- Do not add speculative indexes, global serializable isolation, process-local mutexes, distributed locks, lock hints, or retries as magic fixes without naming the contended resource, correctness invariant, lock order, timeout behavior, and evidence gap.

<!-- mustflow-section: procedure -->
## Procedure

1. Name the contended database resource.
   - Identify the row, range, index prefix, parent row, counter, queue head, table, partition, metadata object, advisory lock key, or connection pool that concurrent executions can wait on.
   - Treat `users.balance`, `products.stock`, `counters.value`, `posts.like_count`, queue `status = 'PENDING'`, and migration metadata as contention candidates even when each single statement looks cheap.
2. Map the write concentration.
   - Separate evenly distributed writes from same-account, same-product, same-tenant, same-campaign, same-post, same-day, or same-queue-head writes.
   - If many requests must update one row to preserve a visible aggregate, ask whether the aggregate can be appended, sharded, reserved, summarized, or made eventually consistent.
3. Prefer append or reservation models for durable histories.
   - Money, credits, stock, coupons, usage, entitlement, and audit-sensitive paths usually need a ledger, event, reservation, capture, or release record before a mutable current-value row.
   - Keep snapshot or cache updates separate from the durable fact when exact current display is less valuable than write throughput and auditability.
4. Shorten the lock window.
   - Finish price calculation, discount evaluation, permission checks, payload validation, and derived data construction before acquiring the lock when the decision can be revalidated cheaply.
   - Keep only the final conditional write, version check, claim, or state transition inside the shortest transaction that preserves the invariant.
   - Move HTTP calls, payment provider calls, email, webhooks, S3/object storage, search indexing, and queue publishing to after-commit or outbox paths.
5. Challenge `SELECT ... FOR UPDATE`.
   - Do not treat `FOR UPDATE` as a general safety blanket. Check whether the selected row is the real invariant owner and whether a weaker lock, conditional update, unique constraint, optimistic version, or parent guard is sufficient.
   - In PostgreSQL, distinguish `FOR UPDATE`, `FOR NO KEY UPDATE`, `FOR SHARE`, and `FOR KEY SHARE` when key changes and foreign-key protection matter.
   - Remember that row locks block competing writes and locks, not ordinary MVCC reads.
6. Review MySQL/InnoDB index and range locking.
   - Treat row locks as index-record locks. If the predicate lacks the right index, the engine may scan and lock more records than the business object implies.
   - Check gap and next-key locks for range predicates under InnoDB defaults. A range can block inserts into values that do not yet exist.
   - Consider `READ COMMITTED` only after deciding whether phantom rows are acceptable for the business rule.
7. Match indexes to lock footprint, not only speed.
   - For updates and deletes, ask how many index records the engine must inspect before finding the target set.
   - Add or reshape indexes only when the predicate, write cost, uniqueness, migration lock behavior, and workload justify reducing the lock footprint.
8. Make uniqueness and conditional writes do the guarding.
   - Replace `SELECT missing -> INSERT` with unique constraints and insert-or-conflict handling.
   - Replace stock, capacity, status, lease, and version updates with single conditional updates whose affected-row count is checked.
   - For long user think-time, use optimistic version checks instead of holding database locks across the think time.
9. Design queue tables around claiming, not polling.
   - Use `SKIP LOCKED` or equivalent only for queue claiming where incomplete views are expected.
   - Avoid one global `PENDING` lane that all workers scrape from the same index head. Add shard keys, `available_at`, priority, attempt count, `locked_at`, and deterministic ordering when the queue table is the contention point.
   - Check starvation and fairness when high-priority or old locked rows can hide lower-priority work.
10. Fix deadlock shape before blaming the engine.
    - Establish a global order for touching accounts, products, rows, tables, partitions, or advisory lock keys.
    - Do not trust `WHERE id IN (...)` or unordered ORM collections to acquire locks in a stable order when many rows are updated.
    - Treat deadlock and serialization failures as normal retry branches only when the whole command is idempotent and retryable.
11. Chunk large writes and deletes.
    - Large `UPDATE` and `DELETE` operations can hold many locks, inflate undo or WAL, lag replicas, block vacuum or purge, and escalate locks on engines that support escalation.
    - Prefer bounded key-range batches, checkpoints, pause or resume controls, and validation counts instead of one heroic statement on production-sized data.
12. Use partitioning and table splits as contention boundaries.
    - Partition by date, tenant, region, shard, or lifecycle stage only when it separates write conflicts and still fits the query model.
    - Split state-machine rows into payments, fulfillments, shipments, settlements, or similar stage tables when independent workflows should not rewrite the same row.
13. Review foreign-key and parent-row side effects.
    - Parent deletes, key updates, child inserts, and child updates can create hidden locks around referential integrity.
    - High-traffic child event tables that all reference a hot parent row may need a different ownership model, deferred aggregate, or explicit parent-row contention budget.
14. Treat DDL and metadata locks as production traffic.
    - Online index creation, concurrent index creation, constraint validation, metadata commits, and table rewrites can still wait on old transactions or briefly block application queries.
    - Kill or drain `idle in transaction` and long-running transactions before migration windows when the repository owns that operational procedure; treat idle-in-transaction blockers as lock-contention inputs, not post-incident trivia.
    - Prefer short lock timeouts for online DDL attempts that should back off rather than queue behind production traffic.
15. Set lock timeout policy by operation.
    - Interactive requests, checkout, admin jobs, backfills, migrations, and reconciliation should not share one infinite wait policy.
    - Distinguish lock timeout, statement timeout, transaction timeout, pool wait timeout, and provider timeout in logs and retry handling.
16. Separate lock waits from connection-pool waits.
    - A request can look like a database lock incident while it is actually stuck waiting for a connection held by wide transactions, `REQUIRES_NEW`, per-item transactions, or slow external calls inside transactions.
    - Review pool size, transaction width, nested transaction behavior, and per-request database checkout count before changing SQL locks.
17. Add observability that names both waiter and blocker.
    - Logs should identify operation, resource key, transaction age, lock wait duration, timeout class, retry attempt, idempotency key, queue shard, batch cursor, and blocking query or session when available.
    - Metrics should avoid unbounded labels but preserve table or operation class, lock-wait bucket, pool-wait bucket, deadlock count, timeout count, and queue lag by bounded shard.
    - For PostgreSQL, MySQL, SQL Server, or managed database diagnostics, use repository-approved observability paths and report manual-only diagnostics when no configured command exists.
18. Label evidence honestly.
    - Static review can identify likely lock contention but cannot prove p95 lock wait, deadlock rate, gap-lock behavior, or migration lock safety under production data.
    - Treat engine docs, plan output, deadlock logs, `pg_locks`, InnoDB status, SQL Server DMVs, Query Store, APM traces, and production telemetry as stronger evidence only when they match the repository engine, version, schema, and workload.

<!-- mustflow-section: postconditions -->
## Postconditions

- The contended resource, workload concentration, lock path, lock order, transaction width, timeout policy, retry behavior, queue claim model, DDL or metadata lock exposure, and observability evidence are explicit.
- Hot rows, mutable counter caches, select-then-update races, over-strong locks, missing lock-footprint indexes, range or gap-lock surprises, unordered multi-row updates, large unchunked writes, queue head contention, hidden FK or parent-row locks, and idle-transaction DDL blockers are fixed or reported.
- Correctness, auditability, idempotency, ordering, tenant isolation, and user-visible truth remain intact or are reported as tradeoffs.
- Lock-safety claims are backed by configured tests, engine evidence, observability evidence, or labeled as static review risk.

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

Use the narrowest configured test, build, docs, release, or mustflow intent that covers the changed lock-sensitive path and synchronized template surfaces. Do not infer raw database shells, live lock dashboards, production lock queries, migration execution, load tests, stress tests, server processes, watcher processes, or package-manager commands outside the command contract.

<!-- mustflow-section: failure-handling -->
## Failure Handling

- If a configured command fails, preserve the failing intent, failing assertion or output tail, and the lock-sensitive invariant it exercised before editing again.
- If the engine, isolation level, index shape, workload, table size, lock timeout, or observability surface is unknown, report static lock-contention risk instead of claiming the path is safe.
- If a safe fix requires schema changes, online DDL, partitioning, queue redesign, outbox workers, materialized summaries, load tests, production diagnostics, or provider-console changes outside the current scope, report the missing boundary.
- If no configured command can prove concurrent lock behavior, report the missing manual evidence and complete the configured checks that are available.

<!-- mustflow-section: output-format -->
## Output Format

- Database lock-contention surface reviewed
- Contended resource, workload concentration, lock path, engine and isolation evidence
- Hot-row, event or reservation model, conditional write, lock strength, index lock footprint, gap or next-key lock, queue claim, lock order, batch chunking, partition, FK or parent-row, DDL or metadata lock, timeout, pool wait, retry, and observability findings
- Lock-contention fix made or recommended
- Evidence level: configured-test evidence, engine evidence, production telemetry, static review risk, manual-only, missing, or not applicable
- Command intents run
- Skipped lock diagnostics and reasons
- Remaining database lock-contention risk
