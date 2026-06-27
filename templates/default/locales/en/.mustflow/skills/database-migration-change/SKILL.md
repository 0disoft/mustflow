---
mustflow_doc: skill.database-migration-change
locale: en
canonical: true
revision: 3
lifecycle: mustflow-owned
authority: procedure
name: database-migration-change
description: Apply this skill when database migration files, schema migration history, ORM schema migrations, generated clients, schema dumps, SQL snapshots, online DDL, large indexes, constraints, state-dependent CHECK constraints, backfills, rolling deploy compatibility, expand-and-contract changes, destructive database changes, migration rollback or roll-forward claims, cut-over plans, lock or timeout policy, replication lag risk, migration observability, or production database migration procedures are created, changed, reviewed, or reported.
metadata:
  mustflow_schema: "1"
  mustflow_kind: procedure
  pack_id: mustflow.core
  skill_id: mustflow.core.database-migration-change
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

# Database Migration Change

<!-- mustflow-section: purpose -->
## Purpose

Keep database migrations safe for running systems by checking deploy compatibility, data preservation, lock behavior, online DDL limits, backfill behavior, generated artifacts, ORM contracts, observability, and recovery reality.

Do not treat migration authoring as "make a file that applies locally." Treat it as "old code and new code must survive the same database during rollout."
Migration incidents usually happen in the interval where old code, new code, old data, and new data are all alive at once. Design that interval first.

<!-- mustflow-section: use-when -->
## Use When

- A database migration file, migration history entry, schema dump, ORM schema, SQL snapshot, generated client, seed, fixture, schema validator, or migration documentation is created or changed.
- A change adds, removes, renames, splits, merges, backfills, rewrites, validates, constrains, indexes, foreign-keys, type-changes, defaults, nullable rules, enum values, tables, columns, generated columns, triggers, views, functions, row-level policies, or data migrations.
- A task mentions rolling deploy, expand-and-contract, online migration, backfill, production schema change, rollback, roll-forward, down migration, migration lock, lock timeout, statement timeout, DDL transaction, `CREATE INDEX CONCURRENTLY`, MySQL `ALGORITHM=INSTANT`, MySQL `LOCK=NONE`, generated ORM client, migration drift, schema drift, or database migration safety.
- Prisma, Drizzle, TypeORM, Rails Active Record, Django migrations, Alembic, Diesel, Ecto, Flyway, Liquibase, Knex, Sequelize, SQLx, or another migration tool changes schema, generated output, migration metadata, or deployment behavior.
- A final report claims a database migration is safe, reversible, applied, validated, production-ready, no-downtime, rollback-safe, or tested from an old schema.

<!-- mustflow-section: do-not-use-when -->
## Do Not Use When

- The change only edits query logic or persisted data model code without a migration, generated schema artifact, or migration claim; use `database-change-safety`.
- The migration is not database-backed, such as file layout, template, cache, content, URL, export, import, or platform migration; use `migration-safety-check`.
- The task only discusses database design without changing or reporting migration behavior.

<!-- mustflow-section: required-inputs -->
## Required Inputs

- Source schema, target schema, migration files, migration history table or metadata, generated clients, schema dumps, SQL snapshots, seeds, fixtures, and affected queries.
- Migration tool and ecosystem: Prisma, Drizzle, TypeORM, Rails, Django, Alembic, Diesel, Ecto, Flyway, Liquibase, Knex, Sequelize, SQLx, raw SQL, or another declared tool.
- Deployment shape: single-step deploy, rolling deploy, blue-green, multiple app versions, background workers, read replicas, multiple services, serverless functions, mobile clients, or external integrations.
- Database engine and operational surface: PostgreSQL, MySQL, SQLite, SQL Server, managed database, migration lock behavior, DDL transaction behavior, online DDL options, table size, write load, long-running transactions, replication or CDC topology, expected lock time, statement timeout, lock timeout, and restore capability when known.
- Data preservation needs, compatibility window, backfill size, batch strategy, cursor or checkpoint marker, validation query, observability query, rollback or roll-forward type, cut-over control, and whether old code can run after the new schema lands.
- State and timestamp invariant matrix when a migration introduces lifecycle statuses, terminal
  timestamps, retry or dead-letter states, delivery states, soft-delete states, approval states, or
  other columns whose valid nullability depends on status.
- Relevant command-intent entries for build, generated-output checks, tests, docs, release, and mustflow validation.

<!-- mustflow-section: preconditions -->
## Preconditions

- The task matches the Use When conditions and does not match the Do Not Use When exclusions.
- Higher-priority instructions and `.mustflow/config/commands.toml` have been checked for the current scope.
- The migration is classified before editing as expand, backfill, switch, contract, destructive, data-only, schema-only, generated-output-only, ORM metadata-only, cut-over, or recovery documentation.
- If personal data, tenant isolation, authorization, audit, retention, or secrets are involved, also use `security-privacy-review`.
- If public API response shape changes because of the migration, also use `api-contract-change`.
- If file paths or storage keys change with the database migration, also use `file-path-cross-platform-change`.

<!-- mustflow-section: allowed-edits -->
## Allowed Edits

- Update migration files, ORM schema files, generated client expectations, schema dumps, SQL snapshots, seeds, fixtures, compatibility code, backfill code, validation checks, docs, and tests directly required by the migration.
- Prefer expand-and-contract for live systems: add compatible shape, dual-write or compatibility-read where needed, backfill safely, switch reads and writes, then contract only after compatibility is proven.
- Keep destructive cleanup separate from expansion unless the repository explicitly proves a single-step deployment is safe.
- Do not weaken tests, delete migration history, hand-edit generated client output, suppress migration drift, or claim rollback safety for lossy changes.

<!-- mustflow-section: procedure -->
## Procedure

1. Classify the migration surface: schema DDL, data migration, backfill, generated client, schema dump, ORM metadata, seed, fixture, migration docs, or deploy procedure.
2. Read the tool-specific source of truth before editing.
   - Prisma: schema file, migrations directory, generated client use, migration history expectations, production deploy flow, and drift behavior.
   - Drizzle: schema exports, generated SQL, snapshot or meta files, migration journal, generated client or query types, and runtime schema imports.
   - TypeORM: entity metadata, migration files, data-source config, production synchronization setting, generated SQL, and runtime entity loading.
   - Rails: migration files, schema dump, model validations, historical migration model usage, seeds, fixtures, callbacks, and deploy order.
   - Django: migration files, state operations, historical models, schema editor behavior, generated SQL when relevant, and data migration functions.
   - Alembic or SQLAlchemy: migration revisions, autogenerate output, branch heads, model metadata, downgrade functions, naming conventions, and generated SQL.
   - Diesel, Ecto, Flyway, Liquibase, Knex, Sequelize, SQLx, and raw SQL: migration history, checked-in SQL, generated metadata, compile-time query checks, rollback files, and schema dumps.
3. Build a migration ledger: old shape, new shape, rows affected, old code behavior, new code behavior, rollback expectation, generated artifact changes, dependent callers, and validation query.
4. Classify compatibility.
   - Old code on old schema.
   - Old code on expanded schema.
   - New code on expanded schema.
   - New code after backfill.
   - New code after contract.
   If any required state fails, the migration is not rolling-deploy safe.
5. Split the deployment plan into expand, backfill, switch, and contract phases.
   - Expansion adds shapes old code can ignore and new code can start writing.
   - Backfill is bounded, restartable, idempotent, observable, and separately validated.
   - Switch changes read paths through a feature flag, rollout gate, tenant gate, or compatible deploy step where possible.
   - Contract removes old shapes only after at least one compatibility window proves no code, job, report, or manual SQL still depends on them.
6. For column add, decide nullability, default behavior, backfill strategy, write path, read fallback, index need, and when a future `NOT NULL` or constraint can be enforced.
   - Add nullable first unless a proven engine/version/table-size path makes the non-null default safe.
   - Do not assume a database default backfills existing rows or matches ORM, API, batch, or application defaults.
   - Enforce `NOT NULL` only after new writes populate the column, old rows are backfilled, and missing-value validation has passed.
7. For column drop, first prove all reads, writes, generated clients, old app versions, jobs, analytics, exports, seeds, fixtures, docs, BI queries, support SQL, and external consumers stopped using the column. Treat `DROP COLUMN` as a contract phase, not as the first migration.
8. For rename, do not implement rename as drop plus add unless data loss is explicitly intended and approved. Prefer add new column, dual-write or copy, backfill, switch reads, validate, then drop old column later.
9. For type changes, check whether the database rewrites the table, whether old values can fail conversion, whether indexes or constraints rebuild, whether application serializers change, and whether API or generated client types change.
10. For nullable and default changes, distinguish schema default from application default. Change application writes first when defaults must stay compatible across old and new versions.
11. For constraints and foreign keys, use staged validation when the database supports it.
    - PostgreSQL `NOT VALID` constraints and later `VALIDATE CONSTRAINT` can avoid validating old rows during the first lock-sensitive change while still protecting new writes.
    - Foreign keys on large or hot tables need separate add, repair/backfill, validate, and fallback planning rather than one heroic migration.
    - CHECK constraints must reject impossible domain states, not only prove column types. For
      lifecycle tables, build a status matrix before writing the constraint: each status should name
      which timestamps or reason fields are required, forbidden, or still pending. For example,
      a delivered row should not also have a dead-letter timestamp, and a dead-lettered row should
      not also look delivered unless the domain explicitly has a separate correction state.
    - When existing rows may already violate the new matrix, split the change into repair, add
      unvalidated constraint where supported, validate, and then rely on the constraint as the last
      gate. Do not let application comments or happy-path tests stand in for the database invariant.
12. For indexes, check table size, write load, lock behavior, concurrent or online index support, uniqueness validation, existing duplicates, and whether generated ORM queries will use the index.
    - PostgreSQL `CREATE INDEX CONCURRENTLY` avoids blocking ordinary writes but still scans more than once, waits for old transactions, consumes I/O, and cannot run inside a transaction block.
    - MySQL online DDL and `ALGORITHM=INSTANT` have version, row-format, index, row-size, and operation limits; specify `ALGORITHM=INSTANT` or `LOCK=NONE` only when unsupported fallback should fail instead of silently rebuilding a table.
    - Treat index deletion as a separate risk: usage counters can lie after restarts, stats resets, monthly jobs, or emergency queries.
13. Review lock and timeout policy.
    - PostgreSQL `ALTER TABLE` often takes strong locks unless a subcommand documents a lower level.
    - Use short `lock_timeout` and an appropriate `statement_timeout` policy when the repository owns that migration surface.
    - Do not wrap several DDL statements in one transaction just because the file looks cleaner; locks held until commit can block unrelated traffic.
    - Very short metadata-only changes on the same table may be bundled only after engine/version/table-state evidence shows each subcommand stays metadata-only.
14. For enum, partition, and table-ownership changes, check engine-specific limits.
    - Enum value additions, removals, or renames can break old code, generated unions, rollback, defaults, and storage layout.
    - Partition attach can scan existing rows unless a suitable `CHECK` constraint proves the range first.
    - Table split, table merge, or relationship rewrite must preserve stable identifiers, foreign keys, audit references, external IDs, permissions, search documents, exports, and old-to-new mapping until all callers switch.
15. For backfills, make them bounded, restartable, observable, and validated. Define batch size, cursor-based ordering key such as `id > last_id`, checkpoint, retry behavior, idempotency, timeout, lock expectation, throttle or pause/resume control, dead-letter or manual review behavior, and validation queries.
16. Do not run or recommend full-table updates on production-sized data without measured volume, lock expectation, WAL or undo impact, replication lag risk, batch plan, timeout policy, and recovery plan.
17. Review replication, CDC, and long-running transaction interactions.
    - Online DDL can leave replicas, read traffic, backups, CDC connectors, or failover readiness behind even when the primary looks healthy.
    - PostgreSQL concurrent index builds can wait on old transactions, idle-in-transaction sessions, backups, or long reports.
    - MySQL online DDL can still need short exclusive locks at the beginning or final phase; plan cut-over timing rather than trusting ETA.
18. Review cut-over control for ghost-table, copy-and-swap, or dual-write migrations.
    - The dangerous moment is usually the final swap, name change, or read-path flip, not the long copy.
    - Preserve a postpone, pause, resume, throttle, or manual approval point when the repository's migration tool supports it.
    - Monitor dual-write mismatch and sample old/new values during the compatibility window; code intent is not proof that every path writes both sides.
19. Prepare observability before apply.
    - Pair the migration with read-only progress and safety queries for lock waits, index build progress, replication lag, backfill cursor, skipped rows, failed rows, duplicate rows, missing rows, dead tuples, or estimated remaining range when the engine supports them.
    - Log or report dry-run selection counts, apply counts, skip reasons, batch durations, and recovery handles.
    - A final `done` line is not enough evidence for a live migration.
20. Decide rollback honestly and prefer roll-forward for partial live changes.
    - Reversible: schema-only and data-preserving.
    - App rollback: old and new code both tolerate the expanded shape, so the read path can move back without losing new writes.
    - Forward-fix preferred: partial live migration can be corrected without restoring.
    - Restore required: deletes, table merges, generated IDs, hashing, encryption, irreversible type conversions, external side effects, or lossy transforms.
    Do not promise rollback for changes that cannot reconstruct old values.
21. Keep external side effects out of database migrations unless the repository has an explicit recovery model. Sending emails, calling payment APIs, deleting files, or mutating external providers from a migration usually breaks rollback.
22. Check generated surfaces after schema changes: ORM clients, types, SQL snapshots, schema dumps, OpenAPI or GraphQL projections, API mocks, fixtures, seeds, admin screens, analytics, ETL, BI queries, and docs examples.
23. Review ORM-specific traps.
   - Prisma generated client and migration history must match the migration files that production applies.
   - Drizzle schema exports and generated SQL or snapshots must not drift.
   - TypeORM production `synchronize` must not be used as a migration strategy.
   - Django rename detection and autogeneration must be reviewed so rename does not become delete and create.
   - Alembic autogenerate output is a candidate, not a reviewed migration.
   - Rails migrations should not depend on current model callbacks or validations when historical data can outlive current model code.
24. Add or check automated guardrails when the repository owns migration linting.
   - Flag raw `CREATE INDEX` on large PostgreSQL tables when `CONCURRENTLY` is expected.
   - Flag first-phase `DROP COLUMN`, large-table `SET NOT NULL`, unvalidated foreign keys, transaction-wrapped concurrent index creation, unbounded `UPDATE`, offset-based backfills, and unchecked destructive operations.
25. Rehearse from the previous production-like schema when possible. A migration that only applies to a freshly generated schema is not enough.
26. Check dependent surfaces: application code, background jobs, cron tasks, workers, ETL, reports, admin tools, data exports, imports, mobile or older clients, webhooks, API clients, generated SDKs, test fixtures, seeds, docs, and monitoring.
27. Select verification from the command contract. Major schema changes, generated client changes, rollback-sensitive changes, security-sensitive migrations, and production deployment changes need broader verification than local schema-only edits.

<!-- mustflow-section: postconditions -->
## Postconditions

- Source schema, target schema, migration files, generated artifacts, schema dumps, seeds, fixtures, and dependent code agree.
- Expand, backfill, switch, and contract phases are separated or explicitly proven unnecessary.
- Old-code/new-schema and new-code/expanded-schema compatibility is classified.
- Backfill and validation behavior is cursor-based or otherwise bounded, restartable, idempotent, observable, and checkable where relevant.
- State-dependent CHECK constraints, terminal timestamp exclusivity, and valid nullability matrices
  are explicit where status columns can otherwise contradict timestamp or reason columns.
- Lock levels, online DDL support, long-running transaction waits, replication lag, cut-over control, timeout policy, and observability queries are explicit where production data may be affected.
- Rollback claims distinguish schema rollback, data rollback, app rollback, roll-forward, forward-fix, and restore-required cases.
- Destructive changes and production lock risks are either deferred, measured, guarded, or reported as remaining risk.

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

Prefer configured migration dry-run, generated-output, schema-diff, or database test intents when the command contract exposes them. Do not invent raw migration commands inside the skill.

<!-- mustflow-section: failure-handling -->
## Failure Handling

- If old/new application compatibility is unknown, do not call the migration rolling-deploy safe.
- If production table size, lock behavior, or validation cost is unknown, report the operation as production-risky.
- If online DDL support, long-running transaction behavior, replication lag, or cut-over control is unknown, report the migration as operationally unproven.
- If an autogenerator proposes drop/create for a rename, stop and rewrite the migration plan.
- If a migration is lossy, do not claim rollback beyond restore or forward corrective migration.
- If a backfill is not idempotent, restartable, observable, and throttled or bounded, keep it out of a production migration claim.
- If generated clients or schema dumps drift, fix the source of truth and regenerated surfaces together.
- If configured verification is missing, report the missing command intent instead of inferring package-manager, ORM, or migration-tool commands.

<!-- mustflow-section: output-format -->
## Output Format

- Database migration changed
- Tool and database engine surface inspected
- Source schema, target schema, and migration phase
- Old-code/new-schema and new-code/expanded-schema compatibility
- Expand/backfill/switch/contract plan and destructive cleanup timing
- Backfill cursor, idempotency, throttle, pause/resume, validation, lock, timeout, replication, cut-over, and observability classification
- Status, timestamp, CHECK constraint, and existing-row validation matrix where relevant
- Rollback, app rollback, roll-forward, forward-fix, and restore-required classification
- ORM/generated client/schema dump/snapshot surfaces synchronized
- Dependent surfaces checked
- Command intents run
- Skipped migration checks and reasons
- Remaining database migration risk
