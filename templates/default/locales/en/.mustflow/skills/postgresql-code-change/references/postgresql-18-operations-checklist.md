---
mustflow_doc: skill.postgresql-code-change.postgresql-18-operations-checklist
locale: en
canonical: true
revision: 1
lifecycle: mustflow-owned
authority: reference
---

# PostgreSQL 18 Operations Checklist

Use this reference when code, schema, infrastructure, runbooks, monitoring, authentication, replication, or migrations depend on PostgreSQL 18 behavior, or when upgrading from PostgreSQL 17 to 18.

## Contents

1. Freshness and classification
2. Asynchronous I/O
3. Planner and B-tree skip scan
4. UUIDv7, generated columns, and DML return values
5. Major-version upgrade and recovery
6. Logical replication and WAL retention
7. Authentication and TLS
8. EXPLAIN, I/O, and VACUUM observability
9. Verification matrix
10. Primary anchors

## 1. Freshness and Classification

- Treat the major release notes, current 18.x minor release notes, and current manuals as separate evidence. Major notes define feature and migration changes; minor notes define later correctness and security fixes.
- Refresh the latest supported 18.x minor before making a production recommendation. The snapshot verified on 2026-08-02 was PostgreSQL 18.4, released 2026-05-14. Do not preserve `18.4` as an undated permanent latest-version claim.
- Prefer the newest supported minor for production and reproduce a reported issue on that minor before attributing it to the 18.0 design.
- Distinguish features introduced in 18 from older PostgreSQL capabilities that only interact differently with 18. Do not market every useful PostgreSQL technique as an 18 feature.
- Record server version, client-tool versions, provider version, build options, extension versions, driver, ORM, pooler mode, operating system, filesystem, storage class, and rollback boundary.
- Read intervening minor notes when upgrading from 18.0 or 18.1. Minor fixes can materially change AIO, generated-column, backup, authentication, planner, or replication behavior.

## 2. Asynchronous I/O

- Treat AIO as a targeted read-path and maintenance capability, not a universal PostgreSQL speed switch. Candidate beneficiaries include sequential scans, bitmap heap scans, and VACUUM; cache-resident point lookups and WAL/fsync-bound commits may not benefit.
- Establish `io_method = sync` as a diagnostic baseline, compare the default `worker` method, and test `io_uring` only when the deployed build has liburing support.
- Keep these controls distinct:
  - `io_method` selects `worker`, `io_uring`, or synchronous execution for AIO-eligible work;
  - `io_workers` sizes the worker pool and only affects `worker` mode;
  - `io_max_concurrency` caps simultaneous operations per process;
  - `effective_io_concurrency` governs query-side issuance and can be set per tablespace;
  - `maintenance_io_concurrency` governs maintenance work and can be set per tablespace;
  - `io_combine_limit` and `io_max_combine_limit` bound combined request size rather than operation count.
- Start from deployed defaults, then change one control at a time. Do not select a value from device marketing labels such as “NVMe” or from a single-session benchmark.
- Test concurrent workload mixes. Faster analytics or VACUUM can increase queue depth and OLTP p99 on the same storage.
- Compare throughput, p50, p95, p99, CPU, device latency, queue depth, bandwidth, checkpoint behavior, and unrelated-query latency. Separate warm-cache and cold-cache runs.
- Use `pg_stat_io` for cumulative completed activity and `pg_aios` for current AIO handle state. PostgreSQL cannot by itself prove whether a requested read came from physical media or the operating-system page cache.
- Keep `sync` as a bounded rollback and attribution mode. Do not permanently disable AIO merely to hide an unmeasured storage or concurrency problem.

## 3. Planner and B-tree Skip Scan

- Skip scan does not remove the leftmost-column rule. It can generate repeated equality probes for missing or weakly constrained prefix columns when later-column predicates make those probes cheaper.
- Expect the best fit when omitted prefix columns have few distinct values. High-cardinality omitted prefixes can make repeated probes more expensive than a sequential scan or a dedicated suffix index.
- Inspect `Index Searches`, index conditions, filters, rows, loops, heap fetches, and buffers together. Multiple searches can also come from `IN` or `ANY`, so `Index Searches > 1` alone is not proof of skip scan.
- Do not drop a suffix-only index because one sampled query used skip scan. Compare representative parameter distributions, write amplification, index size, visibility-map behavior, and p95/p99 under concurrency.
- Review `pg_stats`, column statistics targets, extended statistics, and actual data distribution before adding an index or forcing a plan.
- Treat prepared-statement generic plans as a separate risk. Compare custom and generic behavior when tenant or customer cardinality is highly skewed; use `plan_cache_mode` only as a diagnostic control unless a durable policy is justified.
- Use planner toggles such as `enable_seqscan`, `enable_distinct_reordering`, or other `enable_*` settings to isolate causes, not as the default production fix.
- Do not tune global cost constants to make one query win. Calibrate them from representative cache and storage evidence across the workload.
- Remember that `INCLUDE` increases index size and can disable B-tree deduplication. Index-only scans still depend on heap-page visibility.

## 4. UUIDv7, Generated Columns, and DML Return Values

- Use `uuidv7()` when time-local B-tree insertion is useful, but keep explicit `created_at` and domain-event timestamps. UUID ordering is not commit order or business-event order.
- Treat UUIDv7 as time-revealing rather than opaque. `uuid_extract_timestamp()` can expose approximate creation time; use a separate random public token where timing disclosure matters.
- Make generated-column storage explicit in PostgreSQL 18. Omitting the kind now means `VIRTUAL`; write `VIRTUAL` or `STORED` deliberately in migrations and schema generators.
- Use virtual generated columns only within their restrictions: immutable expressions, current-row inputs, no generated-column chaining, no partition key, and built-in types/functions for virtual expressions.
- Do not assume virtual generated columns are suitable for frequent filtering, joins, or ordering. Check indexing and statistics support for the exact current minor; consider a stored column, expression index, or explicit normalized value.
- Keep parent and child or partition generation expressions aligned even where PostgreSQL only requires the same generated kind.
- Logical publication of generated values currently applies to stored generated columns. Test publisher/subscriber schema combinations, column lists, initial synchronization, and pre-18 subscribers.
- Do not treat generated-column privileges as automatic non-interference. Virtual expressions are only fully safe for privilege separation when their functions are leakproof, and PostgreSQL does not fully enforce that property for the design.
- Use `RETURNING OLD/NEW` to obtain atomic before/after row values without an extra read. Remember that triggers can modify the returned row and external event publication still needs an outbox or equivalent durable handoff.
- In `INSERT ... ON CONFLICT DO UPDATE`, distinguish insert, update, and no-row-returned cases. A false conflict `WHERE` condition can lock a row without producing a `RETURNING` row.
- Recheck current minor notes for generated-column fixes. PostgreSQL 18.4 fixed virtual-column handling involving `EXCLUDED`, rewrite-rule `NEW`, and several spurious rejection paths; those fixes do not imply every virtual-column limitation was removed.

## 5. Major-Version Upgrade and Recovery

- Inventory the old cluster before creating the target: checksums, encoding, locale and collation provider/version, extensions, preload libraries, custom dictionaries, tablespaces, WAL placement, replication, roles, and client tools.
- PostgreSQL 18 enables data checksums by default for newly initialized clusters. `pg_upgrade` requires compatible cluster settings and does not combine a major upgrade with an implicit checksum conversion. Separate checksum policy changes from the major upgrade.
- Treat `pg_upgrade --check` as necessary but insufficient. It cannot prove binary compatibility or runtime correctness of external modules. Verify PostgreSQL 18 packages and support for every C extension and preload library.
- PostgreSQL 18 preserves most optimizer statistics, but not explicit extended statistics created with `CREATE STATISTICS`, extension-defined custom statistics, or cumulative statistics. Run the generated post-upgrade statistics commands and recheck critical plans before full traffic.
- Reindex full-text-search and `pg_trgm` indexes when the official migration notes require it for the source collation provider. Rehearse schema restore and search correctness, not only `pg_upgrade --check`.
- Keep server and operational clients compatible. PostgreSQL 18 migration notes warn that old `psql` clients can mishandle some `\copy` input; align `psql`, `pg_dump`, batch containers, and automation with the target major unless compatibility is proven.
- Review changed defaults and semantics in generated DDL and automation: virtual generated columns, recursive VACUUM/ANALYZE behavior, subscription streaming defaults, triggers, time-zone abbreviations, and unsupported table forms.
- Choose file-transfer mode as a recovery decision:
  - copy is slower but independent;
  - `--clone`/reflink can retain the old cluster when the filesystem supports it;
  - link becomes unsafe for the old cluster after the new cluster writes shared files;
  - `--swap` destructively changes the old cluster once transfer begins;
  - `--no-sync` weakens crash durability and is not a production shortcut.
- Snapshot PGDATA, WAL, and every tablespace consistently. Define the last safe rollback point before allowing writes to the new cluster.
- Do not open full traffic when the server first starts. Complete rebuild scripts, statistics, extension checks, client tests, critical-query plans, replication checks, backup/restore proof, and application smoke tests first.

## 6. Logical Replication and WAL Retention

- Define one authoritative writer per replicated key. Conflict logging is forensic evidence, not a substitute for a write-ownership contract.
- Enable and validate the evidence needed before an incident. Conflict diagnosis can depend on commit timestamps, origin identity, relation identity, replica identity, and subscriber statistics.
- Monitor conflict classes and resolution effects, not only an aggregate apply error count. Detect insert-exists, update/delete-missing, update/delete-origin-differs, and constraint conflicts where applicable.
- Treat replication slots as both WAL-retention and vacuum-horizon owners. Monitor `restart_lsn`, `confirmed_flush_lsn`, `xmin`, `catalog_xmin`, activity, invalidation reason, and retained bytes.
- Use `max_slot_wal_keep_size` as a disk-protection fuse that can invalidate a slot, not as a promise to preserve that amount. Pair any finite cap with reseed and slot-recreation procedures.
- Treat `idle_replication_slot_timeout` as abandoned-inactive-slot cleanup. It does not detect a connected consumer whose flush LSN has stopped advancing, and invalidation is checkpoint-driven.
- Separate high WAL generation from failure to remove WAL. Use backend and cluster WAL/I/O statistics for generation and slot LSN gaps for retention.
- Review `synchronized_standby_slots` dependencies. A missing or lagging physical standby slot can block logical senders and look like a subscriber problem.
- Make `CREATE SUBSCRIPTION ... streaming` explicit when worker budgets or rollout behavior matter; PostgreSQL 18 changed the default for newly created subscriptions to `parallel`.

## 7. Authentication and TLS

- Treat PostgreSQL 18 OAuth as a validator-module integration surface, not a bundled identity provider or complete SSO product. The server cannot validate bearer tokens without an installed validator named in `oauth_validator_libraries` and matching HBA configuration.
- Model issuer, audience, signature or introspection, expiration, scope, client identity, role mapping, revocation, key rotation, validator failure, timeout, and fallback behavior.
- Keep database role authorization separate from token validity. Delegated identity mapping must have explicit role allowlists, tenant boundaries, negative tests, and least-privilege defaults.
- Separate human device authorization from headless service authentication. Verify client-platform support and custom hooks before selecting the built-in device flow for automation.
- Migrate MD5 verifiers as stored credentials, not just `pg_hba.conf` text. Changing `password_encryption` only affects newly set passwords; inventory and rotate existing login-role verifiers before requiring SCRAM.
- Require server identity verification, normally `sslmode=verify-full`, where TLS is a security boundary. Encryption without certificate and hostname verification does not prove the peer is the intended server.
- Consider `channel_binding=require` for compatible SCRAM clients. OAuth bearer authentication has a stronger dependency on correct TLS server verification.
- Configure TLS 1.3 suites with `ssl_tls13_ciphers`; `ssl_ciphers` governs older TLS versions. Review `ssl_groups` and actual client compatibility before narrowing groups.
- Observe negotiated TLS version, cipher, certificate identity, and authentication path. TLS 1.3 evidence does not prove OAuth, SCRAM, role mapping, or authorization correctness.

## 8. EXPLAIN, I/O, and VACUUM Observability

- Remember that `EXPLAIN ANALYZE` executes the statement. Use a transaction and rollback for diagnostic writes only when triggers, external side effects, sequences, and locks make that rehearsal safe.
- Choose options for the question. For plan shape and resource work, consider `ANALYZE`, `BUFFERS`, `WAL`, `SETTINGS`, `TIMING OFF`, `SUMMARY`, and structured output. Serialization measurement still excludes network transfer.
- Read `actual rows * loops` before focusing on one node's displayed average time. Compare estimates with actual rows to locate the first cardinality error.
- Do not add parent and child buffer counters as independent I/O. Parent plan-node counters include descendant work.
- Interpret `shared read` as a PostgreSQL read request, not proof of a physical-device read. Correlate `pg_stat_io`, per-backend I/O/WAL functions, and operating-system or provider storage telemetry.
- Update dashboards for PostgreSQL 18 statistics changes. WAL I/O timing and activity moved toward `pg_stat_io`, byte counters were added, and query-id continuity across major upgrades must not be assumed.
- Separate VACUUM work from cost-delay sleep. Use progress fields, delay timing, dead-tuple memory, index vacuum count, XID age, and table churn together.
- Do not increase autovacuum workers first. Keep `autovacuum_worker_slots`, `autovacuum_max_workers`, per-table thresholds and caps, memory, maintenance I/O, and worker concurrency consistent with shared storage pressure.
- Make `ONLY` explicit when PostgreSQL 18 recursive VACUUM or ANALYZE behavior would otherwise include inheritance children or partitions.

## 9. Verification Matrix

| Change | Minimum evidence |
| --- | --- |
| AIO or I/O settings | Same snapshot, sync baseline, worker comparison, optional io_uring build proof, concurrent mixed workload, device telemetry, p95/p99 guardrail |
| Skip scan or index removal | Representative distributions, `EXPLAIN ANALYZE`, `Index Searches`, heap fetches, buffers, writes, index size, custom/generic plan check |
| UUIDv7 adoption | Internal/public identifier split, time-disclosure decision, mixed v4/v7 behavior, explicit event timestamps |
| Virtual generated column | Explicit kind, expression restrictions, index/statistics plan, partition consistency, privilege review, replication behavior |
| `RETURNING OLD/NEW` | Insert/update/delete/upsert/no-row cases, trigger-modified values, outbox or external-effect boundary |
| 17-to-18 upgrade | Latest minor, checksums, extensions, collation/reindex, stats rebuild, client tools, transfer-mode rollback, restore and app smoke |
| Logical replication | Writer ownership, conflict classes, slot WAL/xmin, stalled-active consumer, finite-cap reseed, standby-slot dependency |
| OAuth or TLS | Validator provenance, issuer/audience/scope, role mapping, revocation/rotation, failure mode, verify-full, client compatibility |
| Monitoring migration | Versioned SQL, changed/removed columns, query-id reset, per-backend and OS correlation, dashboard empty-series alarms |

Reject a production-ready claim when the relevant row has no configured verification path. Do not invent raw database, benchmark, migration, or provider-console commands outside the repository command contract.

## 10. Primary Anchors

- [PostgreSQL versioning policy](https://www.postgresql.org/support/versioning/) for supported majors, minor releases, and update expectations.
- [PostgreSQL 18 release notes](https://www.postgresql.org/docs/18/release-18.html) for major features and migration hazards.
- [PostgreSQL 18 minor release archive](https://www.postgresql.org/docs/18/release.html) for current correctness and security fixes.
- [PostgreSQL 18.4 release notes](https://www.postgresql.org/docs/release/18.4/) for the dated 2026-08-02 snapshot and later-18 fixes known at that point.
- [Resource consumption and AIO settings](https://www.postgresql.org/docs/18/runtime-config-resource.html), [`pg_aios`](https://www.postgresql.org/docs/18/view-pg-aios.html), and [monitoring statistics](https://www.postgresql.org/docs/18/monitoring-stats.html).
- [Multicolumn indexes](https://www.postgresql.org/docs/18/indexes-multicolumn.html) and [Using EXPLAIN](https://www.postgresql.org/docs/18/using-explain.html) for skip scan and `Index Searches`.
- [UUID functions](https://www.postgresql.org/docs/18/functions-uuid.html), [generated columns](https://www.postgresql.org/docs/18/ddl-generated-columns.html), and [DML RETURNING](https://www.postgresql.org/docs/18/dml-returning.html).
- [`pg_upgrade`](https://www.postgresql.org/docs/18/pgupgrade.html), [data checksums](https://www.postgresql.org/docs/18/checksums.html), and [`vacuumdb`](https://www.postgresql.org/docs/18/app-vacuumdb.html).
- [Logical replication conflicts](https://www.postgresql.org/docs/18/logical-replication-conflicts.html), [replication settings](https://www.postgresql.org/docs/18/runtime-config-replication.html), [replication slots](https://www.postgresql.org/docs/18/view-pg-replication-slots.html), and [generated-column replication](https://www.postgresql.org/docs/18/logical-replication-gencols.html).
- [OAuth authentication](https://www.postgresql.org/docs/18/auth-oauth.html), [OAuth validator modules](https://www.postgresql.org/docs/18/oauth-validators.html), [libpq OAuth](https://www.postgresql.org/docs/18/libpq-oauth.html), [password authentication](https://www.postgresql.org/docs/18/auth-password.html), and [libpq SSL](https://www.postgresql.org/docs/18/libpq-ssl.html).
