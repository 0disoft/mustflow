---
mustflow_doc: skill.database-change-safety
locale: hi
canonical: false
revision: 1
lifecycle: mustflow-owned
authority: procedure
name: database-change-safety
description: Apply this skill when database schema, queries, transactions, ORM models, repositories, stores, indexes, cache-backed read models, retention, pagination, concurrency, idempotency, audit logs, or persistence boundaries are introduced, changed, reviewed, or reported.
metadata:
  mustflow_schema: "1"
  mustflow_kind: procedure
  pack_id: mustflow.core
  skill_id: mustflow.core.database-change-safety
  command_intents:
    - changes_status
    - changes_diff_summary
    - test_related
    - test
    - lint
    - build
    - docs_validate_fast
    - test_release
    - mustflow_check
---

# Database Change Safety

<!-- mustflow-section: purpose -->
## Purpose

Keep database-backed behavior explicit, scoped, recoverable where possible, and verifiable without treating database rows, ORM models, generated caches, or read models as domain truth.

Use the smallest persistence boundary that proves the risk. Do not introduce repositories, services, transactions, migrations, outbox machinery, or read models when a direct scoped query or fixture update is enough.

<!-- mustflow-section: use-when -->
## Use When

- A schema, migration, table, collection, ORM model, query, repository, store, transaction, index, cache, read model, audit log, or retention rule is introduced or changed.
- Code reads from or writes to a database, browser storage, cache, local SQLite file, external database, or generated data store.
- A task changes authorization, tenant scoping, pagination, sorting, soft delete, status filters, idempotency, duplicate handling, retry, or concurrency behavior around persisted data.
- Documentation, tests, or final reports claim that a database change is safe, fast, indexed, migrated, reversible, idempotent, or verified.

<!-- mustflow-section: do-not-use-when -->
## Do Not Use When

- The change is pure in-memory logic with no persisted, cached, indexed, or generated state.
- The task only changes external protocol mapping and no database-backed state; use `adapter-boundary`.
- The task only changes file or template migration behavior and no database or persistence surface; use `migration-safety-check`.
- The change only documents general database advice without touching or claiming project behavior.

<!-- mustflow-section: required-inputs -->
## Required Inputs

- Database role: source of truth, rebuildable cache, read model, runtime state, analytics store, external provider, or browser storage.
- Data owner and affected tables, collections, stores, indexes, caches, generated files, or read models.
- Read and write paths, query or ORM behavior, authorization scope, tenant or user scope, and retention expectations.
- Transaction boundary, idempotency, retry, duplicate-delivery, concurrency, migration, rollback, or rebuild expectations.
- Local database, ORM, repository, fixture, migration, cache, and test patterns.
- Relevant command-intent contract entries for tests, builds, docs, release checks, and mustflow validation.

<!-- mustflow-section: preconditions -->
## Preconditions

- The task matches the Use When conditions and does not match the Do Not Use When exclusions.
- Required inputs are available, or missing inputs can be reported without guessing.
- Higher-priority instructions and `.mustflow/config/commands.toml` have been checked for the current scope.
- If database clients, ORM types, rows, browser storage, cache values, or provider data cross into core logic, also use `adapter-boundary`.
- If hidden construction or global lookup creates the database dependency, also use `dependency-injection`.
- If schema, data, cache, or generated state changes must move from an old state to a new state, also use `migration-safety-check`.
- If personal data, authentication, authorization, retention, logs, telemetry, or secret-like values are involved, also use `security-privacy-review`.
- If index, query-time, startup, package-size, search, count, or read-model performance claims are involved, also use `performance-budget-check`.

<!-- mustflow-section: allowed-edits -->
## Allowed Edits

- Update schema, query, repository, store, transaction, index, cache, read-model, fixture, test, documentation, and directly synchronized template surfaces tied to the task.
- Add or tighten constraints, scoping, pagination, ordering, idempotency keys, concurrency guards, retention checks, and redaction behavior when the changed surface justifies it.
- Mark rollback, migration, performance, privacy, or concurrency gaps as unverified when they cannot be proven.
- Do not expose database rows, ORM models, query builders, or provider clients as domain objects.
- Do not treat generated caches or read models as source of truth.
- Do not add broad repository methods that accept arbitrary filters unless authorization, tenant scope, and caller ownership are explicit.
- Do not call external APIs inside a database transaction unless a local rule explicitly accepts the coupling and a recovery path exists.
- Do not store raw logs, secrets, hidden reasoning, full transcripts, unnecessary provider payloads, or unbounded personal data in local state or caches.

<!-- mustflow-section: procedure -->
## Procedure

1. Classify the database role.
   - Source of truth: owns current business state.
   - Rebuildable cache: can be deleted and regenerated from files, provider data, or another source.
   - Read model: derived for lookup, search, reporting, or dashboard use.
   - Runtime state: coordinates in-flight work, locks, sessions, jobs, or retries.
   - Analytics store, external provider, or browser storage: owned outside the core domain boundary.
2. Identify the data owner and derived surfaces. Name which table, file, provider, event log, configuration, or generated artifact owns each value.
3. Check schema shape: primary keys, foreign keys, unique constraints, nullable fields, defaults, check constraints, status values, timestamps, soft delete fields, tenant scope, audit fields, and retention rules.
4. Check query semantics: authorization scope, tenant or user scope, role or visibility filters, deleted or archived rows, draft or unpublished rows, effective dates, null handling, stale-data behavior, and error or absence handling.
5. Check pagination and ordering. Lists need deterministic ordering; cursor pagination needs a stable tie breaker such as a unique id in addition to a timestamp.
6. Check transaction boundaries. Keep database writes and external side effects separate by default; use explicit states, an outbox, an action ledger, or reconciliation when both must be coordinated.
7. Check idempotency, retries, duplicate delivery, and concurrency. Look for webhook duplicates, job retries, import reruns, payment callbacks, optimistic locks, compare-and-swap updates, unique-constraint races, and double state transitions.
8. Check indexes and workload cost. Match indexes to `WHERE`, `JOIN`, `ORDER BY`, and `GROUP BY` behavior, but account for write cost. Look for N+1 queries, expensive counts, full scans, materialized read-model needs, and search-index boundaries.
9. Check privacy and retention. Prefer omission or bounded metadata over storing raw payloads. Do not persist secrets, hidden reasoning, full transcripts, unbounded logs, or personal data without a clear product rule and retention path.
10. Check migration, rollback, and rebuild paths. If a migration claim exists, prove idempotency and recovery with `migration-safety-check` or report the gap. If the store is a cache, name the rebuild source and stale-index detection.
11. Check tests and fixtures. Reuse or add repository/store tests, migration fixtures, query fixtures, adapter fixtures, permission regressions, idempotency or concurrency regressions, and cache rebuild checks as justified by the risk.
12. Verify and report. Separate proven behavior from unverified rollback, migration, privacy, performance, live-data, or concurrency risks.

<!-- mustflow-section: postconditions -->
## Postconditions

- The database role and source of truth are explicit.
- Database rows, ORM models, generated caches, and read models do not leak into domain truth unless the local architecture intentionally owns that boundary.
- Queries preserve authorization, tenant or user scope, deterministic ordering, expected absence behavior, and retention rules.
- Transaction, external side effect, idempotency, duplicate, retry, and concurrency decisions are intentional and reported.
- Index, query-cost, migration, rollback, rebuild, privacy, and verification claims are tied to evidence or marked as unverified.

<!-- mustflow-section: verification -->
## Verification

Use configured oneshot command intents when available:

- `changes_status`
- `changes_diff_summary`
- `test_related`
- `test`
- `lint`
- `build`
- `docs_validate_fast`
- `test_release`
- `mustflow_check`

Prefer the narrowest configured test, build, docs, release, or mustflow intent that proves the changed persistence surface. Do not infer raw database, migration, package, or benchmark commands.

<!-- mustflow-section: failure-handling -->
## Failure Handling

- If the source of truth is unclear, stop changing persistence behavior and report the competing owners.
- If authorization, tenant scope, soft delete, or retention behavior cannot be confirmed, fail closed or report the missing project rule.
- If rollback, migration idempotency, rebuild, or stale-cache detection cannot be proven, avoid claiming safety and name the remaining recovery risk.
- If a performance claim lacks a configured measurement path, report it as unmeasured instead of inventing a budget.
- If sensitive data appears in queries, fixtures, logs, generated state, package contents, or final output, route that surface through `security-privacy-review` before continuing.
- If the safest fix would require live data access, destructive migration, dependency installation, or unavailable credentials, stop at that boundary and report the skipped check.

<!-- mustflow-section: output-format -->
## Output Format

- Database role and owner
- Affected read and write paths
- Schema, constraint, and query semantics reviewed
- Authorization, tenant scope, retention, and privacy checks
- Transaction, idempotency, retry, and concurrency decisions
- Index, pagination, and performance notes
- Migration, rollback, dry-run, rebuild, or compatibility status
- Tests, fixtures, or verification command intents run
- Skipped checks and reasons
- Remaining database risk
