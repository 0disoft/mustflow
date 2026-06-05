---
mustflow_doc: skill.sqlite-code-change
locale: en
canonical: true
revision: 1
lifecycle: mustflow-owned
authority: procedure
name: sqlite-code-change
description: Apply this skill when SQLite-specific schema, query, transaction, migration, indexing, extension, WAL, local-file persistence, embedded database, mobile database, browser OPFS/WASM SQLite, cache index, or SQLite runtime behavior is created, changed, reviewed, or reported.
metadata:
  mustflow_schema: "1"
  mustflow_kind: procedure
  pack_id: mustflow.core
  skill_id: mustflow.core.sqlite-code-change
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

# SQLite Code Change

<!-- mustflow-section: purpose -->
## Purpose

Keep SQLite changes honest about the real runtime, file ownership, concurrency shape, type semantics, query plan, durability, and recovery path.

SQLite is not "small PostgreSQL." It is an embedded library plus a database file. Most mistakes come from pretending it has a server, a remote connection pool, unlimited concurrent writers, or identical feature support in every binding.

<!-- mustflow-section: use-when -->
## Use When

- SQLite schema, migrations, queries, indexes, transactions, connection setup, pragmas, journal mode, backup, restore, cache index, or local database files are introduced, changed, reviewed, or reported.
- A project uses SQLite through an ORM, native binding, bundled library, system library, mobile SDK, Electron or desktop app, WebAssembly build, OPFS-backed browser storage, or Cloudflare/D1-like SQLite surface.
- A task mentions WAL, foreign keys, `STRICT`, JSON, JSONB, FTS, RTree, generated columns, expression indexes, partial indexes, upsert, busy handling, checkpoints, vacuuming, attached databases, or live database backups.
- Code treats SQLite as source of truth, rebuildable cache, offline-first store, local search index, test database, edge database, or synchronization replica.
- Documentation or final reports claim a SQLite change is durable, concurrent, portable, fast, indexed, version-compatible, migration-safe, or recoverable.

<!-- mustflow-section: do-not-use-when -->
## Do Not Use When

- The task is database-backed but not SQLite-specific; use `database-change-safety`.
- The task only changes database migrations without engine-specific SQLite behavior; use `database-migration-change` first and this skill only for SQLite-specific lock, rewrite, file, pragma, or runtime details.
- SQLite appears only as an implementation detail of mustflow's own local index and the change is about command authority or generated search metadata rather than SQLite behavior.
- The task is only dependency version research for a SQLite binding; use `dependency-reality-check` or `version-freshness-check`.

<!-- mustflow-section: required-inputs -->
## Required Inputs

- SQLite role: source of truth, local-only cache, read model, sync replica, test fixture, analytics scratch store, or packaged seed database.
- Runtime identity: SQLite library version, binding or driver, bundled versus system library, compile options when observable, and whether the runtime is native, mobile, WASM, OPFS, edge-hosted, or managed.
- File ownership: database path, storage medium, backup surface, whether the file is local disk, ephemeral storage, synced folder, network filesystem, container volume, mobile sandbox, or browser origin storage.
- Concurrency shape: process count, thread model, expected write bursts, single-writer acceptance, busy timeout or retry policy, transaction length, checkpoint owner, and whether readers must keep working during writes.
- Schema and data rules: foreign key enforcement, affinity expectations, `STRICT` use, `CHECK` constraints, uniqueness, rowid policy, timestamp policy, generated columns, JSON validity, collation, and null semantics.
- Query and index evidence: affected query paths, expected filters, joins, sorts, counts, pagination, full-text search needs, `EXPLAIN QUERY PLAN` observations when available, and write-cost tradeoffs.
- Migration and recovery needs: `user_version` or migration ledger, rebuild versus in-place migration, live-data backup method, integrity checks, rollback expectation, and sidecar file handling.
- Relevant command-intent contract entries for tests, builds, docs, release checks, and mustflow validation.

<!-- mustflow-section: preconditions -->
## Preconditions

- The task matches the Use When conditions and does not match the Do Not Use When exclusions.
- Higher-priority instructions and `.mustflow/config/commands.toml` have been checked for the current scope.
- If SQLite stores product or customer data, also use `database-change-safety`.
- If SQLite schema or data must move from an old shape to a new shape, also use `database-migration-change`.
- If runtime versions, bundled binaries, packages, or extension availability are asserted, also use `version-freshness-check` or `dependency-reality-check`.
- If personal data, secrets, audit logs, retention, tenant isolation, or local-device privacy are involved, also use `security-privacy-review`.

<!-- mustflow-section: allowed-edits -->
## Allowed Edits

- Update SQLite schema, query, connection setup, transaction handling, pragmas, indexes, migrations, fixtures, tests, docs, and directly synchronized template surfaces tied to the task.
- Add explicit runtime, file, concurrency, migration, backup, and verification notes when SQLite behavior depends on deployment shape.
- Do not treat a SQLite skill as permission to run raw SQLite tools, migration commands, package scripts, or live database operations outside configured command intents.
- Do not delete, rewrite, copy, or vacuum live database files unless the user explicitly asked and the repository has a configured, safe command intent or documented manual boundary.
- Do not use SQLite-specific behavior to silently weaken authorization, tenant scope, durability, privacy, or migration expectations.

<!-- mustflow-section: procedure -->
## Procedure

1. Classify the SQLite role. Decide whether the database is authoritative, disposable, a local replica, or a generated index. If clearing the file loses product meaning, treat it as durable data.
2. Identify the actual runtime before relying on features. Check the binding, bundled or system SQLite library, compile options when observable, and official SQLite release history for any version-dependent feature. Do not assume the newest SQLite documentation matches the deployed runtime.
3. Check deployment file reality. A local SQLite file behaves differently on laptop disk, mobile sandbox, container volume, synced folder, network filesystem, browser OPFS, and ephemeral serverless storage. Report unsupported or unproven storage shapes.
4. Decide concurrency honestly. SQLite permits many readers and one writer. WAL improves reader/writer coexistence; it does not turn SQLite into a multi-writer server. Keep write transactions short, avoid external I/O inside transactions, and define busy handling or retry behavior.
5. Check connection lifecycle. Prefer a small, explicit connection strategy that matches the binding. Avoid accidental many-writer pools, global hidden connections, or per-request open/close churn when the local pattern already owns connection reuse.
6. Check durability pragmas. Treat journal mode, synchronous behavior, temp store, locking mode, cache size, mmap, checkpointing, and vacuum settings as deployment choices. Do not disable journaling or durability for source-of-truth data unless the loss model is explicit and accepted.
7. Check foreign keys and constraints. SQLite foreign key enforcement can depend on connection setup. Verify it is enabled where needed, and encode important invariants with constraints instead of relying only on application checks.
8. Check type semantics. SQLite affinity is permissive unless the schema uses stricter constructs. Use `STRICT`, `CHECK`, generated columns, and canonical serialization where the product needs predictable booleans, timestamps, decimal values, JSON validity, enums, or identifiers.
9. Check row identity. Decide rowid, integer primary key, autoincrement, UUID, natural key, or composite identity intentionally. Do not assume autoincrement semantics match other databases.
10. Check SQL construction. Bind values through the local driver or ORM. Build identifiers only from allowlisted names. Do not concatenate user input into raw SQL, FTS queries, pragma names, attached database names, or file paths.
11. Check upsert and conflict behavior. Make uniqueness constraints match the intended conflict target, and define whether a conflict should insert, update, ignore, or fail. Check triggers and change counters when application behavior depends on affected-row counts.
12. Check JSON and extension features. JSON, JSONB, FTS, RTree, generated columns, expression indexes, partial indexes, session/change-set features, and vector or custom extensions require runtime support and real query need. Gate them by deployed runtime, binding exposure, and migration fallback.
13. Check full-text search separately from ordinary indexes. FTS tables need their own content ownership, tokenizer behavior, rebuild path, delete/update handling, and query escaping. Do not treat FTS output as product truth unless the architecture says so.
14. Match indexes to the actual workload. Review filters, joins, sorts, pagination, uniqueness, and write cost. Use query-plan evidence when available, but do not snapshot `EXPLAIN QUERY PLAN` text as a public API.
15. Bound reads and writes. Avoid unbounded scans, unbounded result sets, N+1 loops, high-cardinality counts on hot paths, and row-by-row writes when batching is safer.
16. Check migrations with SQLite limits in mind. Some schema changes require table rebuilds. Preserve data, indexes, triggers, foreign keys, generated columns, collations, and constraints during rebuilds. Keep the migration ledger or `user_version` synchronized.
17. Check live backup and restore. Use an official backup-style approach or a proven application backup path. Do not copy only the main database file while WAL or shared-memory sidecar files may contain live state. Do not delete sidecar files as "cleanup."
18. Check integrity and recovery. For durable data, define integrity checks, crash recovery assumptions, restore rehearsal status, and what happens after partial writes, disk-full errors, lock timeouts, interrupted migrations, and failed checkpoints.
19. Check portability. SQLite SQL, pragmas, collations, extensions, and date/time behavior do not automatically port to PostgreSQL or other engines. If portability is a goal, name the accepted SQLite-specific decisions.
20. Select verification from the command contract. Use configured test, build, docs, release, and mustflow intents only; report missing SQLite-specific verification instead of inventing raw database commands.

<!-- mustflow-section: postconditions -->
## Postconditions

- SQLite runtime, binding, file owner, deployment storage, and feature gates are explicit.
- Source-of-truth, cache, replica, or generated-index role is named.
- Transaction length, busy handling, write concurrency, WAL/checkpoint ownership, and durability settings are intentional.
- Schema constraints, affinity, foreign keys, identity, JSON, FTS, indexes, and migration behavior match product rules.
- Backup, restore, sidecar-file, integrity, and portability risks are proven or reported as unverified.
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

Prefer the narrowest configured test or build intent that exercises the changed SQLite path. Do not infer raw SQLite shell, package-manager, migration, benchmark, or backup commands.

<!-- mustflow-section: failure-handling -->
## Failure Handling

- If the actual SQLite runtime or binding cannot be identified, do not claim version-specific feature support.
- If storage is ephemeral, networked, synced, or shared across machines, do not claim ordinary SQLite durability or locking safety without project-specific proof.
- If concurrent writes, long transactions, WAL checkpointing, or busy handling are unknown, report the concurrency risk instead of assuming defaults are fine.
- If foreign keys, constraints, or `STRICT` behavior cannot be confirmed, avoid claiming data integrity.
- If backup, restore, migration idempotency, or sidecar-file handling cannot be proven, mark recovery as unverified.
- If configured verification is missing, report the missing command intent instead of running raw database commands.

<!-- mustflow-section: output-format -->
## Output Format

- SQLite role and runtime inspected
- File ownership, storage, WAL, and concurrency classification
- Schema, type, constraint, identity, JSON, FTS, and index decisions
- Transaction, busy handling, durability, checkpoint, and migration notes
- Backup, restore, integrity, portability, and sidecar-file status
- Command intents run
- Skipped SQLite checks and reasons
- Remaining SQLite risk
