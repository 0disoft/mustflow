---
mustflow_doc: skill.migration-safety-check
locale: en
canonical: true
revision: 9
lifecycle: mustflow-owned
authority: procedure
name: migration-safety-check
description: Apply this skill when code, data, schema, configuration, file layout, template, content frontmatter, file-to-database, SQLite-to-PostgreSQL, local-disk-to-object-storage, tenant-boundary, URL, slug, content lifecycle, asset path or variant, claim or fact extraction, global-ready time money locale or currency backfills, API projection compatibility, public identifier changes, provider id mappings, event-schema changes, search index or ranking migration, queue message or retry-policy migration, log or analytics migration, observability identifier continuity, deployment-state reproduction, generated-state, backup or restore proof, expand-migrate-contract deployment, destructive schema rollback, semantic export, import, platform exit, or cache migrations are planned, edited, documented, or reported.
metadata:
  mustflow_schema: "1"
  mustflow_kind: procedure
  pack_id: mustflow.core
  skill_id: mustflow.core.migration-safety-check
  command_intents:
    - changes_status
    - changes_diff_summary
    - docs_validate_fast
    - test_release
    - mustflow_check
---

# Migration Safety Check

<!-- mustflow-section: purpose -->
## Purpose

Keep migrations reversible, scoped, and verified before they affect data, schemas, configuration, templates, generated state, or file layout.

<!-- mustflow-section: use-when -->
## Use When

- A change moves, renames, deletes, transforms, backfills, or rewrites files, data, schemas, configuration, template state, generated state, or persisted metadata.
- A task mentions migration, upgrade, conversion, import, export, reindexing, backfill, cleanup, lock refresh, or baseline regeneration.
- Content moves between inline code, Markdown/MDX files, CMS documents, database rows, generated indexes, site-specific overrides, central facts, redirects, or reusable content blocks.
- Existing content must gain lifecycle states, redirects, topic aliases, relationship records, asset metadata, immutable originals, variants, claim or fact references, comparison methodology records, affiliate link records, or exportable ownership metadata.
- Existing APIs, mobile clients, integrations, analytics events, cache keys, public identifiers, read models, generated indexes, or reporting tables must survive a schema or storage shape change.
- Existing product state must survive leaving a CMS, hosted database, authentication provider, payment provider, file store, analytics tool, observability backend, deployment platform, or closed automation tool.
- Existing search quality, search ranking policy, search documents, synonyms, query logs, click logs, queue messages, retry policy, dead-letter history, product events, audit events, billing events, job events, or operator troubleshooting records must survive leaving a search engine, queue, log backend, analytics SaaS, or dashboard-driven automation.
- Existing request ids, trace ids, job ids, webhook ids, event ids, user ids, organization ids, or provider id mappings must survive a log, trace, metrics, event, job, webhook, export, or import migration.
- Existing local SQLite files, local upload directories, object-storage keys, public file URLs, tenant or workspace fields, server-side authorization scope, or API response shapes must survive a persistence or deployment change.
- Existing timestamp, date-only, timezone, currency, price, exchange-rate, tax, locale, country, account-default, user-preference, or AI-pricing fields must be split, backfilled, snapshotted, or made globally safe.
- A migration touches destructive schema changes such as dropping columns, changing column types, setting `NOT NULL`, adding constraints, creating large indexes, rewriting many rows, or claiming that a `down` migration makes rollback safe.
- Documentation or final reports claim that backup, restore, cache rebuild, index rebuild, or analytics migration is safe, tested, repeatable, or complete.
- Documentation or final reports claim that a migration is safe, complete, reversible, idempotent, or already applied.
- A change could make older installed projects, existing lock files, generated files, caches, or user-edited documents incompatible.
- Persisted workflow, checkpoint, run, attempt, or execution-ledger schema versions need an old-to-new transformation while preserving in-flight data.

<!-- mustflow-section: do-not-use-when -->
## Do Not Use When

- The change is a small local refactor with no persisted, generated, installed, or user data surface.
- The task only edits inert documentation and makes no claim about applying or validating a migration.
- The migration would require live production access, destructive actions, or manual operator approval that is outside the current command contract.
- The task defines workflow progression, checkpoint semantics, compensation order, run truth, attempt truth, effect truth, or public JSON meaning. Use the owning workflow, execution-ledger, or public-contract skill; this skill owns only the old-to-new transformation.

<!-- mustflow-section: required-inputs -->
## Required Inputs

- The source state, target state, and the files or data that would change.
- The owner of the migration surface: code, schema, template, lock file, generated state, cache, package, or docs.
- Content identity, slug, URL, frontmatter schema, relationship, fact, source, search index, sitemap, analytics, and cache dependency expectations when content or site migrations are involved.
- Lifecycle state mapping, asset path mapping, original versus variant ownership, topic or tag merge history, policy or fact extraction, comparison methodology backfill, affiliate link classification, export shape, and deletion or anonymization expectations when those surfaces are involved.
- API response compatibility, public id mapping, client version support, analytics event versioning, cache key versioning, search index rebuild, reporting aggregate rebuild, and projection backfill expectations when those surfaces are involved.
- Database engine mapping, local file path mapping, object-storage key mapping, tenant or workspace ownership mapping, private download URL behavior, and API response mapper compatibility when those surfaces are involved.
- Restore-test evidence or restore gap, including database, files, secrets or environment configuration, migration history, external service settings, queue or job state, and cache storage when the migration depends on recovery guarantees.
- Export/import reconstruction evidence or gap, including relationships, permissions, files, versions, event history, audit history, automation rules, external integration mappings, provider id mappings, schemas, and whether imported data can rebuild a working service elsewhere.
- Search, queue, log, and analytics reconstruction evidence or gap, including search document structure, ranking or boost policy, representative query expectations, queue message envelope and schema versions, idempotency keys, retry and dead-letter rules, internal event list, retention windows, and raw event export or replay paths.
- Deployment-state migration evidence or gap, including environment variable schema, secret names, DNS records, domains, SSL assumptions, redirects, cron schedules, runtime versions, build commands, regions, storage, queues, worker settings, observability routing, and rollback behavior.
- Rollback type expected: schema rollback, data rollback, application rollback, operational restore, forward corrective migration, or explicit no-rollback boundary.
- Deployment compatibility rule: whether old application code can run on the new schema, whether new application code can run while old fields remain, and when destructive cleanup is safe.
- Operational safety limits for live databases: rehearsal dataset, expected lock time, statement timeout, lock timeout, batch size, restart marker, validation query, and point-in-time restore availability when applicable.
- Idempotency, rollback, backup, dry-run, compatibility, and failure behavior expectations.
- Relevant command-intent contract entries for status, diff, docs, release, build, or mustflow validation.

<!-- mustflow-section: preconditions -->
## Preconditions

- The task matches the Use When conditions and does not match the Do Not Use When exclusions.
- Required inputs are available, or missing inputs can be reported without guessing.
- Higher-priority instructions and `.mustflow/config/commands.toml` have been checked for the current scope.

<!-- mustflow-section: allowed-edits -->
## Allowed Edits

- Add or tighten migration plans, compatibility notes, dry-run behavior, validation checks, lock metadata, tests, and docs tied to the changed surface.
- Prefer idempotent, explicit, and inspectable migration behavior over implicit one-way rewrites.
- Mark rollback, backup, or compatibility gaps as unverified when they cannot be proven.
- Do not run destructive migrations, delete user data, rewrite generated state broadly, or claim live migration success without configured evidence.

<!-- mustflow-section: procedure -->
## Procedure

1. Identify the migration surface and classify it as code, schema, data, configuration, template, generated state, cache, package metadata, or documentation.
   For content systems, also classify whether it touches inline page content, body files, frontmatter, lifecycle states, slug history, redirects, taxonomy, assets, facts, claims, sources, site exposure, search index, feeds, sitemaps, analytics events, exports, or public API projections.
2. Record the source state, target state, expected affected paths, and whether the change must support old and new states during transition.
   - For persisted workflow, checkpoint, run, attempt, or execution-ledger versions, preserve identity, ownership, terminal-state meaning, and referential links while transforming old records to the new schema. Do not redefine workflow semantics or ledger truth in the migration.
   - Prefer an expand, backfill, switch, and shrink sequence for live schema and API changes: add the new shape, support old and new reads or writes, migrate data, switch readers, then remove the old shape only after compatibility is proven.
   - Treat rollback as more than `down` migration. Distinguish schema rollback, data rollback, app rollback, and operational restore. A `down` file does not recover deleted or overwritten data unless the original values were preserved.
   - Prefer forward-only recovery for live systems: if a change fails after partial application, use a corrective migration or compatibility patch unless a tested restore path proves a rewind is safer.
   - Delay destructive cleanup such as `DROP COLUMN`, type changes, `SET NOT NULL`, irreversible rewrites, and old-field removal until at least one compatible application version and validation window have proven the new shape.
   - For large tables, separate schema expansion from data backfill. Make backfills restartable, bounded by batches, and validated with queries that count missing, malformed, duplicate, or conflicting rows.
   - For globally safe data fixes, backfill time, money, locale, country, currency, and timezone from explicit evidence only. If a value was previously inferred, mark confidence or require review instead of silently treating inference as fact.
3. Check identity preservation. Stable ids, content groups, entity ids, author ids, asset ids, and API ids should survive title, slug, file path, locale, category, site, or provider changes.
   - If internal numeric ids are replaced or hidden by public ids, preserve mapping, redirects or aliases, audit references, API compatibility, and analytics continuity.
4. Check whether the migration is idempotent: a second run should either do nothing or report an already-applied state without extra diffs.
5. Check rollback or recovery expectations: backup, restore path, manual fallback, redirect fallback, old/new schema compatibility, or explicit "not reversible" report.
   - Before risky live database work, require recent backup or point-in-time restore capability, rehearsal on production-like data when possible, expected lock behavior, statement and lock timeouts, and a documented stop condition.
6. Prefer dry-run or read-only inspection before apply behavior when a command or workflow exists for it.
7. For file-to-database or database-to-file content migration, verify that strict metadata is preserved or intentionally introduced: id, type, status, locale, slug, summary, author, created/updated actors, category, tags, related entities, SEO fields, canonical group, site exposure, and access level where relevant.
8. For lifecycle migration, map old booleans or ad hoc flags into explicit states such as draft, scheduled, published, unlisted, private, archived, deprecated, redirected, gone, and soft-deleted without losing search, access, retention, or recovery semantics.
9. For URL or slug migration, verify canonical targets, old-to-new redirects, duplicate handling, sitemap and canonical updates, analytics continuity, and cache invalidation.
10. For asset migration, preserve immutable originals, introduce stable asset ids, avoid storage keys tied to mutable slugs, rebuild variants from originals, carry alt text, license, credit, dimensions, hash, focal point, and usage references, and report any missing metadata that cannot be inferred safely.
11. For taxonomy or relationship migration, preserve tag aliases, merge history, topic-hub indexability, relationship type, direction, order, confidence, manual or automatic source, reason, and creator when those fields affect search, navigation, analytics, or SEO.
12. For fact, claim, policy, comparison, or affiliate extraction, verify that changing facts move to typed entity, claim, source, methodology, result, or affiliate records with source, observed or effective dates, jurisdiction, risk tier, reviewer, relationship policy, and usage mappings while historical prose remains intentionally preserved or annotated.
13. For export or platform-exit migration, verify that content, assets, redirects, tag merges, claim references, source references, revisions, and page dependencies can be exported or rebuilt without relying on the current CMS screen layout.
   - Treat CSV-only export as insufficient for product-state migration when relationships, permissions, comments, files, history, automations, provider mappings, or audit trails define the service meaning.
   - Preserve product-owned stable ids and map provider ids separately. Payment, authentication, CRM, storage, analytics, observability, and CMS ids should be replaceable without breaking internal references.
   - Verify import or restore shape, not only download shape. If data cannot be loaded into another environment or self-hosted replacement, report the export as partial.
   - Treat provider dashboards and no-code screens as migration inputs only when their hidden rules can be represented as data, configuration, code, or documented operator procedure. Manual refund, permission repair, file deletion, customer verification, and email automation habits need an owner before tool replacement.
   - For search migration, rebuild the index from source records and compare representative queries or expected top results before claiming quality continuity. Search settings changed only through a hosted dashboard need a captured policy or change log.
   - For queue migration, preserve a versioned message envelope, job type list, retry policy, timeout, dead-letter state, ordering requirement, idempotency key, and manual replay procedure. Do not claim queue replacement is safe from message transport alone.
   - For log or analytics migration, separate raw historical events from dashboards. Keep event names, schema versions, request or trace ids, retention rules, and core billing, entitlement, file, security, job, search, and support events available outside the SaaS.
14. For deployment-platform migration, verify that operating state is reproducible from code and docs rather than dashboard memory. Preserve or recreate environment variable schemas, secret names, domain and DNS records, redirects, SSL assumptions, cron jobs, build commands, runtime versions, regions, storage buckets, queues, worker settings, observability routing, deployment hooks, and rollback procedure.
15. For observability migration, preserve request id, trace id, span id, user or anonymous id, tenant or organization id, command id, job run id, webhook event id, and event schema version continuity. Do not migrate logs or traces in a way that replaces internal ids with email, token, payment customer id, or other sensitive provider identifiers.
16. For database-engine migration, such as SQLite to PostgreSQL, preserve schema constraints, transaction semantics, public ids, timestamps, JSON handling, unique indexes, idempotency keys, audit references, and backup or restore expectations. Check write-concurrency behavior, locking assumptions, and any code that depended on local file paths or process-local database access.
17. For local-disk to object-storage migration, preserve stable asset ids, owner or workspace scope, original filenames as metadata, storage keys independent from mutable user input, visibility, status, checksums, variants, signed download behavior, and cleanup of stale local files or orphaned remote objects.
18. For tenant-boundary migration, verify that every affected read, list, search, mutation, upload, download, admin operation, audit log, idempotency key, cache key, and analytics event maps to the correct workspace, organization, team, or account before enforcing the new scope.
19. Keep compatibility claims tied to fixtures, lock metadata, tests, generated output, or documented command results.
20. For API or projection migration, verify that database table splits, column renames, status remaps, relationship moves, storage-key changes, and internal identifier changes are absorbed by response mappers or versioned contracts before they break clients.
21. For analytics or event migration, keep event names and schema versions explicit. Do not mix old and new event payload meanings under one unversioned JSON shape.
22. For cache migration, version cache keys when response shape, visibility, filter normalization, ranking formula, or source-of-truth rules change. Define whether old keys can expire naturally or need an explicit purge.
23. For backup or restore claims, require evidence from a clean-environment restore or report the missing drill. A backup file, snapshot setting, or managed-service checkbox is not enough to claim restore readiness.
24. For AI usage or model-pricing migrations, preserve request identity, provider-call identity, feature key, pricing snapshot, retry grouping, cache-hit type, and historical cost units. Do not recalculate past AI costs from only the current provider price sheet.
25. If the migration changes public docs, installed templates, package contents, or lock files, synchronize the related metadata and version surfaces.
26. Run the narrowest configured verification that proves the migrated surface and its metadata still agree.

<!-- mustflow-section: postconditions -->
## Postconditions

- The migration surface, source state, target state, and compatibility boundary are named.
- Content identity, lifecycle, URL, slug, asset, metadata, taxonomy, relationship, claim, fact, search, cache, sitemap, export, and public API continuity are preserved or explicitly marked out of scope when relevant.
- Semantic export or import, provider id mappings, self-hosted or replacement restore shape, deployment-state reproduction, and observability identifier continuity are preserved or explicitly marked out of scope when relevant.
- Idempotency, rollback, backup, restore, dry-run, old/new compatibility, and verification status are either proven or explicitly left as remaining risk.
- Rollback claims distinguish schema, data, app, and operational recovery, and destructive changes are delayed or explicitly marked as requiring restore/manual recovery.
- API projections, public identifiers, analytics event versions, cache keys, read models, and generated indexes keep compatibility or carry an explicit migration risk.
- Database engine changes, local-disk to object-storage moves, tenant-boundary retrofits, and API response reshapes preserve compatibility or carry an explicit migration risk.
- Final reports do not imply that a live or destructive migration ran unless configured evidence proves it.

<!-- mustflow-section: verification -->
## Verification

Use configured oneshot command intents when available:

- `changes_status`
- `changes_diff_summary`
- `docs_validate_fast`
- `test_release`
- `mustflow_check`

Use a narrower configured test, build, migration dry-run, or documentation intent when it better proves the changed migration surface.

<!-- mustflow-section: failure-handling -->
## Failure Handling

- If the migration has no rollback or dry-run path, report that risk before applying broader changes.
- If a migration check fails, stop at the first affected surface and avoid cascading rewrites.
- If old and new states conflict, preserve user data and lock metadata before updating generated or derived files.
- If verification requires live data, operator approval, or destructive access, stop at that boundary and report the skipped check.

<!-- mustflow-section: output-format -->
## Output Format

- Migration surface reviewed
- Source and target state
- Identity, lifecycle, slug, URL, asset, metadata, taxonomy, relationship, claim, fact, index, cache, export, and redirect continuity where relevant
- API projection, public id, event schema, restore, and generated-state continuity where relevant
- Semantic export/import, provider-id mapping, deployment-state reproduction, observability identifier, and platform-exit continuity where relevant
- Search ranking, search quality set, queue message contract, dead-letter or replay procedure, log or analytics event ownership, and operator procedure continuity where relevant
- Idempotency, expand-migrate-contract compatibility, rollback type, backup, restore, rehearsal, timeout, backfill, and validation-query status
- Compatibility or lock metadata updated
- Command intents run
- Skipped checks and reasons
- Remaining migration risk
