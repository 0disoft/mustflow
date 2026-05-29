---
mustflow_doc: skill.database-migration-change
locale: en
canonical: true
revision: 1
lifecycle: mustflow-owned
authority: procedure
name: database-migration-change
description: Apply this skill when database migration files, schema migration history, ORM schema migrations, generated clients, schema dumps, SQL snapshots, backfills, rolling deploy compatibility, expand-and-contract changes, destructive database changes, migration rollback claims, or production database migration procedures are created, changed, reviewed, or reported.
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

Keep database migrations safe for running systems by checking deploy compatibility, data preservation, backfill behavior, generated artifacts, ORM contracts, and rollback reality.

Do not treat migration authoring as "make a file that applies locally." Treat it as "old code and new code must survive the same database during rollout."

<!-- mustflow-section: use-when -->
## Use When

- A database migration file, migration history entry, schema dump, ORM schema, SQL snapshot, generated client, seed, fixture, schema validator, or migration documentation is created or changed.
- A change adds, removes, renames, splits, merges, backfills, rewrites, validates, constrains, indexes, foreign-keys, type-changes, defaults, nullable rules, enum values, tables, columns, generated columns, triggers, views, functions, row-level policies, or data migrations.
- A task mentions rolling deploy, expand-and-contract, online migration, backfill, production schema change, rollback, down migration, migration lock, DDL transaction, generated ORM client, migration drift, schema drift, or database migration safety.
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
- Database engine and operational surface: PostgreSQL, MySQL, SQLite, SQL Server, managed database, migration lock behavior, DDL transaction behavior, online DDL options, table size, expected lock time, statement timeout, lock timeout, and restore capability when known.
- Data preservation needs, compatibility window, backfill size, batch strategy, restart marker, validation query, rollback type, and whether old code can run after the new schema lands.
- Relevant command-intent entries for build, generated-output checks, tests, docs, release, and mustflow validation.

<!-- mustflow-section: preconditions -->
## Preconditions

- The task matches the Use When conditions and does not match the Do Not Use When exclusions.
- Higher-priority instructions and `.mustflow/config/commands.toml` have been checked for the current scope.
- The migration is classified before editing as expand, backfill, switch, contract, destructive, data-only, schema-only, generated-output-only, ORM metadata-only, or rollback documentation.
- If personal data, tenant isolation, authorization, audit, retention, or secrets are involved, also use `security-privacy-review`.
- If public API response shape changes because of the migration, also use `api-contract-change`.
- If file paths or storage keys change with the database migration, also use `file-path-cross-platform-change`.

<!-- mustflow-section: allowed-edits -->
## Allowed Edits

- Update migration files, ORM schema files, generated client expectations, schema dumps, SQL snapshots, seeds, fixtures, compatibility code, backfill code, validation checks, docs, and tests directly required by the migration.
- Prefer expand-and-contract for live systems: add compatible shape, backfill safely, switch reads and writes, then contract only after compatibility is proven.
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
5. For column add, decide nullability, default behavior, backfill strategy, write path, read fallback, index need, and when a future `NOT NULL` or constraint can be enforced.
6. For column drop, first prove all reads, writes, generated clients, old app versions, jobs, analytics, exports, seeds, fixtures, docs, and external consumers stopped using the column. Treat drop as a contract phase, not as the first migration.
7. For rename, do not implement rename as drop plus add unless data loss is explicitly intended and approved. Prefer add new column, dual-write or copy, backfill, switch reads, validate, then drop old column later.
8. For type changes, check whether the database rewrites the table, whether old values can fail conversion, whether indexes or constraints rebuild, whether application serializers change, and whether API or generated client types change.
9. For nullable and default changes, distinguish schema default from application default. Avoid assuming existing rows are backfilled by a new default.
10. For constraints and foreign keys, use staged validation when the database supports it. Add the constraint without validating existing rows when appropriate, backfill or repair data, then validate in a separate phase.
11. For indexes, check table size, write load, lock behavior, concurrent or online index support, uniqueness validation, existing duplicates, and whether generated ORM queries will use the index.
12. For enum changes, check old code behavior, generated client unions, database enum migration limits, default values, serialization, API compatibility, and whether removing or renaming values requires a data migration first.
13. For table split, table merge, or relationship rewrite, preserve stable identifiers, foreign keys, audit references, external IDs, permissions, search documents, exports, and old-to-new mapping until all callers switch.
14. For backfills, make them bounded, restartable, observable, and validated. Define batch size, ordering key, checkpoint, retry behavior, idempotency, timeout, lock expectation, dead-letter or manual review behavior, and validation queries.
15. Do not run or recommend full-table updates on production-sized data without measured volume, lock expectation, batch plan, timeout policy, and recovery plan.
16. Keep external side effects out of database migrations unless the repository has an explicit recovery model. Sending emails, calling payment APIs, deleting files, or mutating external providers from a migration usually breaks rollback.
17. Check generated surfaces after schema changes: ORM clients, types, SQL snapshots, schema dumps, OpenAPI or GraphQL projections, API mocks, fixtures, seeds, admin screens, analytics, ETL, BI queries, and docs examples.
18. Review ORM-specific traps.
   - Prisma generated client and migration history must match the migration files that production applies.
   - Drizzle schema exports and generated SQL or snapshots must not drift.
   - TypeORM production `synchronize` must not be used as a migration strategy.
   - Django rename detection and autogeneration must be reviewed so rename does not become delete and create.
   - Alembic autogenerate output is a candidate, not a reviewed migration.
   - Rails migrations should not depend on current model callbacks or validations when historical data can outlive current model code.
19. Decide rollback honestly.
   - Reversible: schema-only and data-preserving.
   - Forward-fix preferred: partial live migration can be corrected without restoring.
   - Restore required: deletes, table merges, generated IDs, hashing, encryption, irreversible type conversions, external side effects, or lossy transforms.
   Do not promise rollback for changes that cannot reconstruct old values.
20. Rehearse from the previous production-like schema when possible. A migration that only applies to a freshly generated schema is not enough.
21. Check dependent surfaces: application code, background jobs, cron tasks, workers, ETL, reports, admin tools, data exports, imports, mobile or older clients, webhooks, API clients, generated SDKs, test fixtures, seeds, docs, and monitoring.
22. Select verification from the command contract. Major schema changes, generated client changes, rollback-sensitive changes, security-sensitive migrations, and production deployment changes need broader verification than local schema-only edits.

<!-- mustflow-section: postconditions -->
## Postconditions

- Source schema, target schema, migration files, generated artifacts, schema dumps, seeds, fixtures, and dependent code agree.
- Expand, backfill, switch, and contract phases are separated or explicitly proven unnecessary.
- Old-code/new-schema and new-code/expanded-schema compatibility is classified.
- Backfill and validation behavior is bounded, restartable, and checkable where relevant.
- Rollback claims distinguish schema rollback, data rollback, app rollback, forward-fix, and restore-required cases.
- Destructive changes and production lock risks are either deferred, measured, or reported as remaining risk.

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
- If an autogenerator proposes drop/create for a rename, stop and rewrite the migration plan.
- If a migration is lossy, do not claim rollback beyond restore or forward corrective migration.
- If generated clients or schema dumps drift, fix the source of truth and regenerated surfaces together.
- If configured verification is missing, report the missing command intent instead of inferring package-manager, ORM, or migration-tool commands.

<!-- mustflow-section: output-format -->
## Output Format

- Database migration changed
- Tool and database engine surface inspected
- Source schema, target schema, and migration phase
- Old-code/new-schema and new-code/expanded-schema compatibility
- Backfill, validation, lock, timeout, and rollback classification
- ORM/generated client/schema dump/snapshot surfaces synchronized
- Dependent surfaces checked
- Command intents run
- Skipped migration checks and reasons
- Remaining database migration risk
