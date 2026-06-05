---
mustflow_doc: skill.postgresql-code-change
locale: en
canonical: true
revision: 1
lifecycle: mustflow-owned
authority: procedure
name: postgresql-code-change
description: Apply this skill when PostgreSQL-specific schema, query, transaction, migration, indexing, extension, role, row-level security, connection pooling, replication, backup, restore, managed Postgres, or Postgres runtime behavior is created, changed, reviewed, or reported.
metadata:
  mustflow_schema: "1"
  mustflow_kind: procedure
  pack_id: mustflow.core
  skill_id: mustflow.core.postgresql-code-change
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

# PostgreSQL Code Change

<!-- mustflow-section: purpose -->
## Purpose

Keep PostgreSQL changes explicit about server version, operational topology, connection pressure, lock behavior, planner evidence, transaction semantics, role boundaries, extension ownership, and restore reality.

PostgreSQL is not just "SQL with more features." Most production damage comes from unbounded locks, accidental table rewrites, connection storms, search-path surprises, extension drift, false rollback claims, or treating managed-service defaults as application design.

<!-- mustflow-section: use-when -->
## Use When

- PostgreSQL schema, queries, indexes, constraints, migrations, generated SQL, transactions, roles, RLS policies, extensions, functions, triggers, views, materialized views, partitions, replication, backups, or restore behavior are introduced, changed, reviewed, or reported.
- Code uses PostgreSQL through an ORM, query builder, migration tool, driver, connection pool, serverless adapter, PgBouncer, managed Postgres provider, read replica, or extension-backed feature.
- A task mentions locking, isolation, advisory locks, row locks, deadlocks, serialization retries, `search_path`, RLS, `timestamptz`, JSONB, GIN, GiST, BRIN, full-text search, generated columns, partial indexes, expression indexes, concurrent indexes, partitions, logical replication, PITR, or extension versions.
- Documentation or final reports claim a PostgreSQL change is online, safe, fast, indexed, scalable, version-compatible, migration-safe, role-safe, or recoverable.

<!-- mustflow-section: do-not-use-when -->
## Do Not Use When

- The task is database-backed but not PostgreSQL-specific; use `database-change-safety`.
- The task only changes database migrations without PostgreSQL-specific lock, validation, rewrite, generated-output, online-index, or rollout behavior; use `database-migration-change` first.
- The task only selects or upgrades a Postgres client, ORM, or extension package; use `dependency-reality-check`, `dependency-upgrade-review`, or `version-freshness-check`.
- The task only changes non-Postgres SQL examples with no project behavior claim.

<!-- mustflow-section: required-inputs -->
## Required Inputs

- PostgreSQL role: primary source of truth, reporting replica, read model, queue store, analytics store, temporary scratch database, or managed-service dependency.
- Server identity: major and minor version, managed provider constraints, extension inventory and versions, schemas in use, driver, ORM, pooler, and deployment environment.
- Topology: app instances, worker count, connection pool size, PgBouncer or provider pool mode, read replicas, failover model, backup/PITR expectation, and whether migrations run during rolling deploys.
- Schema and data rules: constraints, foreign keys, indexes, identity generation, UUID policy, enum or lookup-table choice, JSONB boundaries, timestamp semantics, money or decimal policy, tenant isolation, RLS, and privilege model.
- Query evidence: affected query paths, representative parameters, row counts or cardinality assumptions when known, plan evidence when available, index usage, sort or join pressure, statistics needs, and read/write frequency.
- Transaction and retry rules: isolation level, lock expectations, timeout policy, idempotency, external side effects, retryable database failures, and deadlock or serialization handling.
- Migration and recovery needs: lock or rewrite risk, validation phase, backfill strategy, deploy compatibility, rollback classification, invalid-index cleanup, backup and restore evidence, and dependent services.
- Relevant command-intent contract entries for tests, builds, docs, release checks, and mustflow validation.

<!-- mustflow-section: preconditions -->
## Preconditions

- The task matches the Use When conditions and does not match the Do Not Use When exclusions.
- Higher-priority instructions and `.mustflow/config/commands.toml` have been checked for the current scope.
- If PostgreSQL stores product or customer data, also use `database-change-safety`.
- If schema or data changes must move from an old shape to a new shape, also use `database-migration-change`.
- If roles, RLS, tenant isolation, personal data, credentials, audit logs, or retention are involved, also use `security-privacy-review`.
- If version-specific PostgreSQL features, extensions, managed-provider behavior, or dependency support are asserted, also use `version-freshness-check` or `dependency-reality-check`.
- If performance, query-time, index, partitioning, or scaling claims are made, also use `performance-budget-check`.

<!-- mustflow-section: allowed-edits -->
## Allowed Edits

- Update PostgreSQL schema, queries, migrations, generated SQL, connection setup, pool settings, roles, RLS policies, extension declarations, tests, docs, and directly synchronized template surfaces tied to the task.
- Add explicit version, provider, lock, pool, transaction, role, extension, restore, and verification notes when behavior depends on deployment shape.
- Do not treat this skill as permission to run raw PostgreSQL tools, migration commands, package scripts, admin SQL, live database operations, or provider console actions outside configured command intents.
- Do not weaken tenant isolation, role separation, durability, backup, or migration safety to make a local test pass.

<!-- mustflow-section: procedure -->
## Procedure

1. Classify the PostgreSQL role and topology. Name whether the database is primary truth, reporting replica, job store, analytics store, managed provider surface, or temporary store.
2. Identify the actual version and provider constraints. Check server major/minor version, official PostgreSQL release notes for version-dependent behavior, extension versions, managed-service limitations, driver behavior, ORM behavior, and pooler mode before relying on new features.
3. Check connection pressure. Count app instances, workers, background jobs, migrations, admin tasks, and pooler behavior. Prevent connection storms by bounding pool sizes and avoiding one pool per hot request path or serverless invocation when the platform cannot sustain it.
4. Check transaction boundaries. Keep transactions short, avoid user interaction or external I/O while holding locks, and define isolation, timeout, retry, and idempotency behavior for conflicts, deadlocks, and serialization failures.
5. Check lock behavior before changing schema. Decide whether an operation blocks reads, writes, both, or only metadata. For live tables, separate expand, backfill, validate, switch, and contract phases when needed.
6. Check online index and constraint patterns. Use staged validation or concurrent index patterns when the database and migration tool support them, and respect transaction-boundary restrictions. Plan cleanup for invalid indexes or failed validations.
7. Check table rewrites and scans. Type changes, defaults, generated columns, constraints, backfills, and index builds can rewrite or scan large tables. Do not claim production safety without table-size, lock, timeout, and rollout evidence.
8. Check schema ownership. Prefer constraints, foreign keys, unique indexes, exclusion constraints, and check constraints for facts the database must enforce. Add child-side foreign-key indexes when query and lock behavior need them.
9. Check identity and identifiers. Distinguish identity columns, sequences, UUIDs, natural keys, public ids, provider ids, and idempotency keys. Version-gated UUID generation, sequence ownership, and public-id exposure need explicit decisions.
10. Check type semantics. Use `timestamptz` for instants, separate local schedule values from instants, use numeric types intentionally for money and measurements, avoid `money` unless the product accepts its locale and formatting behavior, and avoid JSONB as a dumping ground for query-critical facts.
11. Check enum and domain modeling. Database enums are easy to add to but awkward to remove or rename. Use lookup tables or check constraints when lifecycle, localization, tenant customization, or compatibility needs are likely.
12. Check JSONB, arrays, full-text, vector, geospatial, and extension-backed features. Confirm extension availability, schema ownership, index type, operator class, query shape, backup/restore inclusion, and exit path before relying on provider-specific convenience.
13. Check query plans with real shape. Prefer representative parameters and data distribution. Separate estimates from actual work, inspect filter versus index conditions when plan evidence exists, and add extended statistics when correlated columns mislead the planner.
14. Match indexes to workload. Review equality, range, sort, join, partial predicate, expression, multicolumn ordering, GIN/GiST/BRIN tradeoffs, uniqueness, and write amplification. Do not add indexes just because a column is frequently mentioned.
15. Check partitioning only with a lifecycle reason. Partitioning helps when pruning, retention, load, or maintenance boundaries match the partition key. It can make queries, uniqueness, foreign keys, and operations worse when added as generic scale theater.
16. Check autovacuum and bloat surfaces. Hot updates, dead tuples, long transactions, queue tables, and repeated deletes can hurt plans and storage. If the change increases churn, name vacuum, retention, and batching assumptions.
17. Check roles and privileges. Runtime roles should not be owners or superusers. Separate owner, migrator, runtime, read-only, and maintenance roles when the project supports it. Avoid application SQL that depends on a privileged console role.
18. Check `search_path` and schema qualification. Do not let untrusted or mutable search paths choose functions, tables, extensions, or security-sensitive objects. Schema-qualify sensitive database objects where local practice requires it.
19. Check RLS and tenant isolation. If RLS protects tenant or user data, verify policy coverage for read, write, update, delete, service roles, migrations, maintenance jobs, and bypass paths. Do not treat application filters as equivalent to RLS.
20. Check generated SQL and ORM behavior. Review actual generated queries, default transaction wrapping, migration DDL, null handling, relation loading, batching, prepared statement behavior, and pool use. Do not assume the ORM generated the online-safe PostgreSQL pattern.
21. Check backup and restore. A useful restore includes roles, owners, privileges, extensions, schemas, sequences, RLS policies, data, jobs, and application smoke behavior. Do not treat app-level exports or ad hoc selects as a PostgreSQL backup.
22. Check replication and read replicas. Reads from replicas may be stale. Failover can break session state, advisory locks, prepared statements, and connection pools. Name freshness and failover assumptions when reads or jobs use replicas.
23. Select verification from the command contract. Use configured test, build, docs, release, and mustflow intents only; report missing PostgreSQL-specific verification instead of inventing raw database commands.

<!-- mustflow-section: postconditions -->
## Postconditions

- PostgreSQL version, provider, extension, pooler, topology, and role boundaries are explicit.
- Schema constraints, identity, type, timestamp, JSONB, enum, extension, RLS, and privilege decisions match product rules.
- Lock, rewrite, validation, online-index, backfill, transaction, retry, and timeout behavior is proven or reported as risk.
- Query plan, index, statistics, partitioning, autovacuum, bloat, and replica-freshness claims are tied to evidence or marked unverified.
- Backup, restore, roles, privileges, extension, sequence, and failover assumptions are explicit.
- Verification uses configured command intents only.

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

Prefer the narrowest configured test or build intent that exercises the changed PostgreSQL path. Do not infer raw PostgreSQL shell, package-manager, migration, benchmark, backup, or provider-console commands.

<!-- mustflow-section: failure-handling -->
## Failure Handling

- If server version, provider constraints, extension versions, or pooler mode cannot be identified, do not claim feature support or production equivalence.
- If lock behavior, table size, backfill volume, timeout, or online DDL behavior is unknown, mark the migration or schema change as production-risky.
- If roles, RLS, `search_path`, or tenant isolation cannot be proven, fail closed or report the security boundary gap.
- If query-plan evidence is unavailable, avoid claiming an index or rewrite is faster.
- If backup and restore evidence is missing, do not claim recovery readiness.
- If configured verification is missing, report the missing command intent instead of running raw database or provider commands.

<!-- mustflow-section: output-format -->
## Output Format

- PostgreSQL role, version, provider, extension, and topology inspected
- Pooling, transaction, lock, retry, timeout, and migration classification
- Schema, identity, type, timestamp, JSONB, enum, constraint, RLS, role, and privilege decisions
- Query plan, index, statistics, partitioning, autovacuum, bloat, and replica notes
- Backup, restore, failover, and managed-provider status
- Command intents run
- Skipped PostgreSQL checks and reasons
- Remaining PostgreSQL risk
