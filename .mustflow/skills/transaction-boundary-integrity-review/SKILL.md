---
mustflow_doc: skill.transaction-boundary-integrity-review
locale: en
canonical: true
revision: 2
lifecycle: mustflow-owned
authority: procedure
name: transaction-boundary-integrity-review
description: Apply this skill when code is created, changed, reviewed, or reported and transaction boundaries, database write paths, ORM atomic blocks, unit-of-work code, lock usage, isolation levels, retry handling, rollback behavior, after-commit side effects, outbox patterns, framework transaction annotations, or transactional tests can break business invariants despite a transaction existing.
metadata:
  mustflow_schema: "1"
  mustflow_kind: procedure
  pack_id: mustflow.core
  skill_id: mustflow.core.transaction-boundary-integrity-review
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

# Transaction Boundary Integrity Review

<!-- mustflow-section: purpose -->
## Purpose

Review transactions by asking whether the whole business action stays true under failure, concurrency, retries, framework behavior, and external side effects.

The review question is not "is there a transaction?" It is "does the read -> decision -> write sequence, plus every side effect and retry, still preserve the invariant when another request, worker, or failure changes the timing?"

<!-- mustflow-section: use-when -->
## Use When

- Code creates, changes, reviews, or reports a database transaction, ORM transaction, unit of work, repository write path, service write workflow, command handler, webhook processor, queue consumer, checkout, credit, inventory, booking, entitlement, permission, approval, status transition, or multi-step business action.
- The risk is read -> decision -> write integrity, check-then-insert, count-before-add, row lock scope, missing durable constraints, isolation-level assumptions, retry behavior, deadlock handling, rollback behavior, transaction propagation, nested transaction semantics, savepoints, after-commit side effects, outbox or inbox boundaries, external API calls inside transactions, or tests that hide commit behavior.
- Code or docs claim a path is atomic, transactional, serialized, locked, retry-safe, rollback-safe, isolated, idempotent, durable, committed, or protected from concurrent requests.
- A transaction-related review needs a focused integrity pass before deeper database-engine, race-condition, backend-reliability, payment, credit-ledger, or state-machine review.

<!-- mustflow-section: do-not-use-when -->
## Do Not Use When

- The task is only query latency, index fit, plan shape, projection, pagination, or N+1 behavior; use `database-query-bottleneck-review`.
- The task is only general stale shared state or lock ordering outside a database or unit-of-work boundary; use `race-condition-review` or `concurrency-invariant-review`.
- The task is primarily exception honesty, swallowed errors, false success, fallback defaults, or public error shape; use `failure-integrity-review`.
- The task is primarily retries, queue reliability, provider deadlines, health checks, outbox processing, or operational failure handling; use `backend-reliability-change`.
- The task is payment, credit, wallet, or ledger specific and the transaction issue is only one part of money-event integrity; use `payment-integrity-review` or `credit-ledger-integrity-review` first.
- The transaction is a tiny single-row write with no prior decision, no concurrency-sensitive invariant, no external side effect, no retry, and no framework propagation risk.
- The main problem is convergence after a database, broker, provider, or second database commits independently; use `dual-write-consistency`. This skill owns each local transaction boundary only.
- The main problem is compensation order or resumable recovery across those commits; use `durable-workflow-orchestration`.

<!-- mustflow-section: required-inputs -->
## Required Inputs

- Business invariant: balance cannot go negative, member count cannot exceed a limit, email must be unique, one coupon can be redeemed once, one order can be fulfilled once, status transitions must be legal, or equivalent rule.
- Transaction boundary: where the transaction starts and ends, which repository, ORM session, connection, data source, transaction manager, isolation level, propagation mode, savepoint, and lock scope are active.
- Decision ledger: reads, existence checks, counts, predicate checks, business validations, authorization checks, state reads, and the writes or side effects that depend on them.
- Durable guard evidence: unique constraints, exclusion constraints, conditional updates, version columns, row locks, parent-row locks, predicate locking, atomic upsert, idempotency records, outbox or inbox records, and affected-row checks.
- Framework behavior: Spring `@Transactional`, `rollbackFor`, self-invocation, `readOnly`, `REQUIRES_NEW`, `NESTED`, rollback-only, `UnexpectedRollbackException`, Django `atomic()`, `transaction.on_commit()`, SQLAlchemy `Session`, Hibernate flush and `@Version`, or local equivalents.
- Side-effect ledger: email, cache invalidation, queue publish, message ack, HTTP API call, payment provider call, object storage, file upload, search indexing, notification, analytics, and any after-commit callback.
- Failure and retry evidence: `serialization_failure`, `deadlock_detected`, optimistic-lock failure, timeout, unknown external outcome, retry budget, idempotency key, compensation, reconciliation, and manual recovery.
- Test evidence: concurrency tests, transactional tests, commit-time constraint tests, after-commit callback tests, query-count tests, framework integration tests, and configured command intents.

<!-- mustflow-section: preconditions -->
## Preconditions

- The task matches the Use When conditions and does not match the Do Not Use When exclusions.
- Higher-priority instructions and `.mustflow/config/commands.toml` have been checked for the current scope.
- Required inputs are available, or missing invariant, isolation, lock, propagation, side-effect, retry, or test evidence can be reported without guessing.
- Existing local patterns for transactions, unit of work, idempotency, outbox, locks, optimistic locking, retry classification, and transactional tests have been searched before adding new shapes.
- If the transaction crosses money, authorization, personal data, multi-tenant data, or durable events, also apply the relevant payment, credit, security, database, backend, API, state-machine, or failure skill.

<!-- mustflow-section: allowed-edits -->
## Allowed Edits

- Move the whole read -> decision -> write sequence into the correct transaction, replace app-only checks with durable constraints, add atomic upsert or conditional updates, check affected row counts, add version checks, lock the right row before the decision, narrow transaction scope, and move external side effects to after-commit or outbox patterns when local style supports it.
- Add retry classification for serialization failures, deadlocks, optimistic-lock failures, and unknown external outcomes only when the full transaction or command can be retried idempotently.
- Add focused tests for duplicate concurrent inserts, count-limit races, rollback behavior, after-commit behavior, commit-time constraints, transaction propagation, savepoint behavior, optimistic locking, and external side-effect ordering when configured tests can exercise them.
- Do not add broad SERIALIZABLE, distributed locks, `SELECT ... FOR UPDATE`, `SKIP LOCKED`, `REQUIRES_NEW`, retries, or after-commit callbacks as magic fixes without naming the invariant, lock target, failure behavior, and side-effect ordering.
- Do not trade correctness, authorization, tenant isolation, idempotency, auditability, or user-visible truth for shorter code or a narrower transaction.

<!-- mustflow-section: procedure -->
## Procedure

1. Name the business invariant before judging the transaction. If the invariant cannot be stated, the transaction cannot be reviewed.
2. Draw the decision ledger.
   - Mark every read, `exists()`, `count`, `findBy`, status check, balance check, permission check, uniqueness check, and validation.
   - Mark the write, insert, update, delete, publish, send, cache change, and response that depends on each decision.
   - The true boundary is read -> decision -> write, not only the final `UPDATE`.
3. Reject app-only check-then-act for durable facts.
   - `exists()` then `insert()` needs a unique constraint, atomic upsert, insert-or-ignore, or equivalent durable guard.
   - `count < limit` then add may need a parent row lock, counter row, conditional update, exclusion constraint, SERIALIZABLE with retry, or another durable single-writer authority.
   - "No row found" is not locked by `SELECT ... FOR UPDATE`; absent future rows need constraints, parent locks, predicate protection, or atomic create.
4. Check lock target and lock timing.
   - Pessimistic locks are most useful when acquired before the business decision.
   - A lock after reading and validating can protect the write while leaving the decision stale.
   - PostgreSQL row locks do not block ordinary reads. Do not assume `FOR UPDATE` makes the row invisible.
   - `SKIP LOCKED` intentionally skips locked rows and can produce an incomplete view; use it for queue claiming, not ordinary consistency checks.
5. Check isolation-level assumptions by engine and framework.
   - READ COMMITTED does not mean one stable world for the whole transaction.
   - PostgreSQL and MySQL InnoDB REPEATABLE READ differ, especially when locking reads or writes mix with ordinary reads.
   - SERIALIZABLE is not a global mutex. It can abort the transaction and require a full retry.
   - Report engine-specific uncertainty instead of claiming isolation behavior from memory.
6. Review full-transaction retry semantics.
   - Retry the full transaction or command decision, not only the last failed statement.
   - Treat `serialization_failure`, `deadlock_detected`, optimistic-lock failure, lock timeout, and unknown provider outcome as separate categories.
   - Retrying without idempotency can duplicate side effects; not retrying serialization failures can surface false 500s for normal concurrency.
7. Review rollback triggers and swallowed exceptions.
   - Frameworks often decide rollback from whether an exception escapes the transactional boundary.
   - Catching inside the transaction and returning success can commit partial failure.
   - Spring defaults roll back on runtime exceptions and errors, not every checked exception; review `rollbackFor` and local rules.
8. Review transaction proxy and propagation behavior.
   - Spring self-invocation can bypass `@Transactional` proxy behavior.
   - `readOnly` is usually a hint, not a guaranteed write blocker.
   - Isolation declarations usually apply only when a new transaction starts.
   - Inner rollback-only markers can make an outer `REQUIRED` commit fail with `UnexpectedRollbackException`.
   - `REQUIRES_NEW` commits independently and consumes another connection while the outer transaction may still hold resources.
   - `NESTED` is typically a savepoint, not an independent commit.
9. Review Django, SQLAlchemy, and Hibernate lifecycle traps when relevant.
   - Nested Django `atomic()` blocks do not make inner work durable if an outer block rolls back; `transaction.on_commit()` runs only after a successful outer commit.
   - SQLAlchemy `Session` can begin transactions implicitly; absence of an explicit `begin` is not proof there is no transaction.
   - Hibernate flush is not commit. Flush can occur before commit and before queries, so constraint failures or SQL effects may appear earlier than code order suggests.
   - Hibernate `@Version` or equivalent optimistic lock checks are needed for long user think-time updates where last writer would otherwise win.
10. Move external side effects out of the transaction boundary.
    - Email, cache eviction, queue publish, HTTP API calls, payment provider calls, object storage writes, file uploads, and search indexing do not roll back with the database.
    - Prefer after-commit hooks for non-critical callbacks and outbox records for durable side effects that must eventually happen.
    - Remember that an after-commit callback failure does not roll back an already committed database transaction.
    - When the database and external system can commit independently, route convergence to `dual-write-consistency`; keep this review limited to the local transaction's reads, decisions, writes, commit, and after-commit handoff.
11. Review transaction width and resource pressure.
    - Do not hold locks or connections across HTTP API calls, file uploads, sleeps, large loops, slow calculations, logging sinks, JSON serialization, queue waits, or user-controlled waits.
    - Timeouts do not undo already-sent external effects.
    - `REQUIRES_NEW`, nested service calls, and transaction-per-item loops can exhaust connection pools.
12. Review multi-database and transaction-manager scope.
    - A transaction annotation or helper may cover only one data source, ORM session, connection, or transaction manager.
    - Cross-database, broker, and provider convergence belongs to `dual-write-consistency`; ordered compensation and resumable recovery belong to `durable-workflow-orchestration`. Do not pretend one local transaction owns either protocol.
13. Review advisory and distributed locks.
    - PostgreSQL session-level advisory locks can survive rollback and require release or session end.
    - Transaction-level advisory locks release at transaction end and are usually safer for short critical sections.
    - Distributed locks need durable backstops such as fencing tokens, idempotency keys, conditional writes, unique constraints, or state transitions.
14. Review transaction tests with suspicion.
    - Spring transactional tests commonly roll back after each test.
    - Django `TestCase` wraps tests in transactions and may not run real commit behavior or `on_commit()` callbacks.
    - Tests that never commit can miss commit-time constraints, after-commit callbacks, lock behavior, deadlocks, serialization failures, and pool pressure.
15. Check grep bait near the transaction.
    - Review code around `exists`, `count`, `findBy`, `save`, `flush`, `catch`, `rollbackFor`, `REQUIRES_NEW`, `NESTED`, `readOnly`, `FOR UPDATE`, `SKIP LOCKED`, `on_commit`, `afterCommit`, `@Async`, `Executor`, `RestTemplate`, `WebClient`, `send`, `publish`, and `cache.evict`.
    - These terms are not bugs by themselves. They are anchors for read-decision-write, propagation, external side-effect, and rollback review.
16. Label evidence honestly.
    - Static review can identify transaction boundary risk but cannot prove concurrency safety.
    - Engine docs, framework docs, plan output, integration tests, and production traces are stronger evidence only when they match the repository version and workload.

<!-- mustflow-section: postconditions -->
## Postconditions

- The business invariant, transaction boundary, decision ledger, durable guard, side-effect ledger, retry rule, and test evidence are explicit.
- App-only `exists()`/`count` checks, stale read -> decision -> write sequences, row-lock gaps, isolation assumptions, swallowed rollback triggers, propagation surprises, premature side effects, wide transactions, connection-pool pressure, multi-database drift, advisory-lock scope, and transactional-test blind spots are fixed or reported.
- External side effects are after commit, outbox-backed, idempotent, compensatable, or explicitly marked as manual recovery risk.
- Correctness, authorization, tenant isolation, idempotency, ordering, auditability, and user-visible truth remain intact or are reported as tradeoffs.
- Transaction safety claims are backed by configured evidence, representative framework or database evidence, or labeled as static review risk.

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

Use the narrowest configured test, build, docs, release, or mustflow intent that covers the changed transaction boundary and synchronized template surfaces. Do not infer raw database shells, live lock tests, load tests, chaos tests, provider calls, server processes, watcher processes, or package-manager commands outside the command contract.

<!-- mustflow-section: failure-handling -->
## Failure Handling

- If a configured command fails, preserve the failing intent, failing assertion or output tail, and the transaction invariant it exercised before editing again.
- If the invariant, transaction manager, isolation level, propagation mode, or durable guard is unknown, report static risk instead of claiming the transaction is safe.
- If a safe fix requires a schema constraint, engine-specific isolation change, outbox worker, idempotency store, saga, compensation path, or provider reconciliation outside the current scope, report the missing durable boundary.
- If deterministic concurrency or commit-time proof is not configured, report the missing manual evidence and complete the configured checks that are available.

<!-- mustflow-section: output-format -->
## Output Format

- Transaction boundary reviewed
- Business invariant and decision ledger
- Durable guard, lock target, isolation, retry, rollback, propagation, savepoint, framework lifecycle, external side-effect, transaction width, multi-database, advisory or distributed lock, and transactional-test findings
- Transaction-boundary fix made or recommended
- Evidence level: configured-test evidence, framework evidence, database evidence, static review risk, manual-only, missing, or not applicable
- Command intents run
- Skipped transaction diagnostics and reasons
- Remaining transaction-boundary integrity risk
