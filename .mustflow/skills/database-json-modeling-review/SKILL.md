---
mustflow_doc: skill.database-json-modeling-review
locale: en
canonical: true
revision: 1
lifecycle: mustflow-owned
authority: procedure
name: database-json-modeling-review
description: Apply this skill when code, schema, migrations, repositories, ORM models, SQL, docs, tests, or reviews introduce, change, or assess database JSON, jsonb, metadata, extra, options, settings, attributes, properties, raw payload, event context, dynamic field, generated column, computed column, expression index, JSON search index, JSON path query, schemaVersion, JSON key registry, or JSON-to-column promotion behavior.
metadata:
  mustflow_schema: "1"
  mustflow_kind: procedure
  pack_id: mustflow.core
  skill_id: mustflow.core.database-json-modeling-review
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

# Database JSON Modeling Review

<!-- mustflow-section: purpose -->
## Purpose

Keep JSON columns from becoming a place where schema, ownership, validation, indexing, retention, and product decisions disappear.

The review question is: "Is this value truly document-shaped context, or is it a real domain field pretending to be flexible?" JSON is acceptable for bounded optional context, raw external evidence, event-specific details, rare settings, or payloads that are inspected by humans. A key that drives filters, ordering, joins, permissions, uniqueness, status, dates, money, tenant scope, deletion, audit, or calculations is no longer harmless metadata.

<!-- mustflow-section: use-when -->
## Use When

- A database column, ORM field, migration, fixture, repository, query, generated client, seed, or docs surface uses `JSON`, `jsonb`, `json`, `metadata`, `extra`, `options`, `settings`, `attributes`, `properties`, `payload`, `raw_payload`, `context`, `details`, or similar flexible fields.
- Code filters, sorts, groups, joins, aggregates, validates, authorizes, displays, exports, deletes, audits, or backfills data inside a JSON column.
- A JSON key might become a status, tenant key, permission bit, date, numeric value, money amount, uniqueness rule, foreign key, lifecycle state, search dimension, reporting dimension, or retention trigger.
- A raw provider payload, webhook body, import row, API response, analytics event, audit detail, or event context is persisted and might be confused with operational truth.
- A migration, review, or performance claim mentions generated columns, computed columns, expression indexes, GIN indexes, `jsonb_path_ops`, JSON search indexes, `JSON_VALUE`, `JSON_EXTRACT`, `ISJSON`, check constraints, schema versions, or key registries.
- A JSON blob holds arrays of objects, mutable and immutable data together, multiple domains, unbounded maps, user-defined keys, or values owned by different teams or services.

<!-- mustflow-section: do-not-use-when -->
## Do Not Use When

- The task only changes public API JSON, CLI JSON output, config files, serialization, parsing, or TypeScript object shapes with no database persistence; use the relevant API, CLI, config, or type skill.
- The task is only database query latency, plan shape, N+1, pagination, or index-fit review; use `database-query-bottleneck-review` first and this skill only when JSON keys hide schema decisions.
- The task is only migration rollout, online DDL, backfill safety, old/new code compatibility, or destructive schema change; use `database-migration-change` first and this skill as an adjunct for JSON field promotion or shape changes.
- The task is generic persistence ownership with no flexible JSON column, JSON path, or raw payload surface; use `database-change-safety`.
- The JSON is a small, bounded, never-queried fixture literal or test-only object whose shape is not persisted or exposed as product behavior.

<!-- mustflow-section: required-inputs -->
## Required Inputs

- JSON column role: raw external payload, optional context, event details, rare settings, dynamic attributes, cache snapshot, API projection, audit diff, or operational state.
- Database engine and feature set when known: PostgreSQL `jsonb` versus `json`, MySQL generated columns, SQL Server computed columns and `ISJSON`, Oracle JSON search indexes, SQLite JSON functions, ORM support, and migration tooling.
- Key inventory: allowed keys, value types, null policy, default policy, units, precision, timezone or date-only policy, owner, reader, writer, removal policy, and schema version.
- Query and behavior paths: JSON keys used in `WHERE`, `ORDER BY`, `GROUP BY`, joins, foreign keys, uniqueness, status transitions, permissions, tenant scope, retention, deletion, audit, reporting, search, or calculations.
- Raw versus operational truth split: which fields are copied into typed columns or child tables, which payload remains immutable evidence, and how drift is reconciled.
- Cardinality and shape: scalar values, bounded arrays, unbounded arrays, arrays of objects, free-form maps, nested objects, per-domain subdocuments, and expected growth.
- Migration and compatibility expectations: existing rows, missing keys, old writers, new readers, backfill, dual-write, validation, rollback or roll-forward, generated/computed column deployment, index creation, and cleanup.
- Tests, fixtures, docs, and configured command-intent contract entries relevant to schema, query, migration, release, and mustflow validation.

<!-- mustflow-section: preconditions -->
## Preconditions

- The task matches the Use When conditions and does not match the Do Not Use When exclusions.
- Required inputs are available, or missing JSON role, key ownership, engine, workload, or migration evidence can be reported without guessing.
- Higher-priority instructions and `.mustflow/config/commands.toml` have been checked for the current scope.
- If JSON keys affect authorization, personal data, secrets, retention, audit, tenant scope, or provider payloads, also use the relevant security, privacy, or adapter-boundary skill.
- If JSON key promotion changes old/new schema compatibility, also use `database-migration-change`.
- If JSON path predicates, indexes, generated columns, or planner claims are made, also use the matching database engine skill or `database-query-bottleneck-review` before claiming runtime behavior.

<!-- mustflow-section: allowed-edits -->
## Allowed Edits

- Add or change schema, migrations, ORM models, generated/computed columns, check constraints, JSON key validation, child tables, indexes, repositories, tests, fixtures, docs, and directly synchronized template surfaces tied to the task.
- Promote JSON keys into typed columns or child tables when they drive query, integrity, lifecycle, authorization, reporting, or high-volume behavior.
- Preserve raw external payloads separately from operational columns when evidence or replay value is needed.
- Add key registries, schema versions, owner documentation, and promotion criteria where flexible fields remain.
- Do not treat "flexibility" as sufficient justification for storing business state in a JSON blob.
- Do not add engine-specific JSON indexes, generated columns, computed columns, or search indexes without naming the query shape, write cost, migration path, and engine support boundary.

<!-- mustflow-section: procedure -->
## Procedure

1. Classify the JSON column role.
   - Raw evidence: provider payload, webhook body, import row, API response, or audit before/after detail. Keep immutable where possible and copy operational facts into typed fields.
   - Optional context: bounded details that are displayed or logged but do not control product behavior.
   - Rare settings: low-cardinality, low-query settings that have owners, defaults, validation, and a migration path.
   - Dynamic attributes: customer-defined or integration-defined values. Keep query and authorization promises explicit before accepting the shape.
   - Cache or projection: rebuildable data. State the source of truth and invalidation path.
2. Run the promotion test for every JSON key mentioned by the diff.
   Promote or duplicate into typed schema when a key is used for:
   - `WHERE`, `ORDER BY`, `GROUP BY`, joins, foreign keys, uniqueness, search ranking, or report grouping.
   - Status, workflow, permission, entitlement, tenant scope, ownership, visibility, delete lifecycle, retention, or audit policy.
   - Numeric calculations, money, quota, inventory, dates, timestamps, timezones, durations, or service-level objectives.
   - High-volume access, concurrency control, idempotency, retry state, reconciliation, or operator dashboards.
3. Separate raw payload from operational truth.
   - Store provider or event payloads as evidence, not as the only current state.
   - Copy stable provider identifiers, event ids, status, amounts, timestamps, tenant ids, and reconciliation cursors into typed fields when code depends on them.
   - Never require future maintainers to remember which nested path is the real customer status, permission bit, or deletion marker.
4. Check shape and cardinality.
   - Scalars may stay in JSON only when they are not behavior-driving and remain validated.
   - Bounded arrays of simple values need a documented maximum and duplicate/null policy.
   - Arrays of objects usually want child tables when they need filtering, joining, ordering, uniqueness, independent updates, audit, or growth.
   - Unbounded maps need ownership, key namespace rules, quotas, validation, and export semantics.
   - Split mutable data from static evidence so updates do not rewrite large raw payloads or blur audit history.
   - Split unrelated domains. Payment details, UI preferences, AI policy state, security flags, and provider payloads do not belong in one shared `metadata` blob.
5. Define the JSON contract if JSON remains.
   - Document allowed keys, type, unit, default, nullability, owner, reader, writer, retention, deletion, and deprecation policy.
   - Add `schemaVersion` or an equivalent version field when shape can evolve.
   - Add validation at the database, model, or write-boundary level. Application-only comments are not a contract.
   - Keep unknown-key behavior explicit: reject, ignore, preserve, namespace, or quarantine.
6. Review engine-specific storage and indexing.
   - PostgreSQL: prefer `jsonb` for queryable JSON, use ordinary columns for hot keys, use expression indexes for scalar paths, choose GIN only for containment/search shapes, and check whether `jsonb_path_ops` fits containment at the cost of operator coverage.
   - MySQL: use generated columns for indexed JSON paths, keep path expressions stable, and verify type/collation casts before claiming index use.
   - SQL Server: use `ISJSON` checks where appropriate, computed columns for indexed JSON values, and `JSON_VALUE`/`OPENJSON` paths with explicit type and length behavior.
   - Oracle: distinguish function-based indexes for known scalar paths from JSON search indexes for broader document search, and document which query class each supports.
   - SQLite: JSON functions are not a schema substitute; expression indexes and generated columns need version and runtime support checks.
7. Check integrity, migrations, and compatibility.
   - Backfill promoted columns from JSON with missing-key, malformed-value, duplicate, timezone, precision, and default handling.
   - Keep old and new app versions compatible when rolling deploys can read or write both shapes.
   - Decide whether JSON remains as raw evidence, becomes derived cache, or is removed after promotion.
   - Add constraints and tests for typed promoted values, not only JSON parser success.
8. Check observability and operations.
   - Add visibility for malformed JSON, unknown keys, rejected keys, backfill counts, promoted-field drift, and JSON path query latency when the repository has such patterns.
   - Make operator-facing docs and dashboards use typed fields for operational truth instead of nested-path folklore.

<!-- mustflow-section: postconditions -->
## Postconditions

- JSON column role, key ownership, allowed shape, schema version, and raw-versus-operational split are explicit.
- Behavior-driving JSON keys are promoted, duplicated into typed fields, or reported with a clear reason they remain JSON.
- Engine-specific JSON indexing, generated/computed columns, validation, and migration claims are tied to evidence or marked unverified.
- Existing rows, old/new writers, backfill, validation, rollback or roll-forward, and cleanup expectations are addressed.
- Remaining JSON modeling risk is named instead of hidden under "flexibility".

<!-- mustflow-section: verification -->
## Verification

- Run the narrowest configured tests covering schema, repository, migration, query, validation, fixtures, docs, and template packaging changed by the task.
- Prefer assertions that prove promoted columns, child tables, key validation, schema versions, malformed-value handling, old-shape compatibility, and raw payload preservation.
- Use configured docs and release checks when skill text, routes, templates, package metadata, or user-facing docs change.
- If live database plans or provider payload samples are unavailable, report static-review evidence level rather than claiming production safety.

<!-- mustflow-section: failure-handling -->
## Failure Handling

- If the engine or ORM feature support is unknown, stop at the modeling recommendation and report the engine-specific verification gap.
- If promotion would require destructive or long-running migration work, report the expand/backfill/contract path instead of collapsing it into one step.
- If a JSON blob is intentionally flexible for customer-defined fields, require namespace, quotas, validation, export, and query promises before accepting it.
- If a configured test or build fails, preserve the failing intent and output tail, then fix only the JSON modeling contract or synchronized surface exercised by the failure.

<!-- mustflow-section: output-format -->
## Output Format

Report:

- JSON surface reviewed
- JSON role and key inventory
- Promotion decisions: typed column, child table, generated/computed column, expression index, JSON index, raw evidence, or remain JSON
- Raw payload versus operational truth split
- Engine-specific storage, validation, and index notes
- Migration, backfill, compatibility, and cleanup status
- Tests and command intents run
- Evidence level: static diff risk, configured-test evidence, engine-feature evidence, plan evidence, production evidence, manual-only, missing, or not applicable
- Remaining JSON modeling risk
