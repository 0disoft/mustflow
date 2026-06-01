---
mustflow_doc: skill.database-change-safety
locale: en
canonical: true
revision: 16
lifecycle: mustflow-owned
authority: procedure
name: database-change-safety
description: Apply this skill when database schema, database engine choice, managed database extensions, provider-specific database features, SQLite or PostgreSQL suitability, queries, transactions, ORM models, repositories, stores, indexes, cache-backed read models, read/write models, content metadata, content block records, content graph records, lifecycle states, versioned records, ledgers, job tables, outbox events, inbox events, idempotency records, processed webhook records, external API call records, provider intent records, manual recovery records, usage metering records, plan-limit records, AI budget and feature-policy records, cost rollups, claim or fact registries, comparison methodology records, affiliate links, filter URL policies, SEO landing records, source provenance, admin audit logs, behavior analytics events, core event stores, search document or ranking metadata, semantic export and import data, provider id mappings, app-owned identity records, public URL and storage metadata records, data residency records, external-service truth ownership, operational versus analytics data boundaries, cache-as-store decisions, API response projections, cache invalidation data, user activity state, global-ready locale country currency timezone and money models, AI usage and pricing ledgers, hybrid file/database storage, file metadata records, retention, pagination, concurrency, idempotency, audit logs, data ownership boundaries, or persistence boundaries are introduced, changed, reviewed, or reported.
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
- A content, product, review, comparison, marketplace, knowledge-base, search, API, analytics, localization, SEO, redirect, or CMS-like data model is introduced, changed, reviewed, or reported.
- Long-form content may stay in files or a CMS while metadata, facts, relationships, site exposure, permissions, workflow state, search fields, or analytics dimensions need queryable persistence.
- Content relationships, controlled tags, aliases, category hierarchy, typed filter attributes, source collection records, verification states, comments, likes, bookmarks, user activity events, or aggregate counters are introduced, changed, reviewed, or reported.
- Structured content blocks, type-specific content fields, advertisement slots, SEO metadata, filter definitions, URL normalization policy, curated landing pages, cache keys, cache tags, ranking snapshots, search index jobs, or admin audit logs are introduced, changed, reviewed, or reported.
- Content lifecycle states, image or file assets, claim registries, policy references, source references, effective dates, risk tiers, review owners, comparison methodology versions, affiliate relationship records, or bulk update jobs are introduced, changed, reviewed, or reported.
- Identity, privacy, editorial, catalog, community, analytics, billing, messaging, or audit data ownership boundaries are introduced, mixed, split, reviewed, or reported.
- Behavior logs, domain events, audit logs, analytics stores, reporting aggregates, event schemas, cache-backed state, public identifiers, or API response projections are introduced, mixed, split, reviewed, or reported.
- Data export, import, restore, provider migration, self-hosting migration, internal id ownership, external provider id mapping, relationship portability, permission portability, file portability, audit/event portability, or automation-rule portability is introduced, changed, reviewed, or reported.
- An external provider, hosted dashboard, no-code tool, CMS, email system, analytics system, search engine, queue, log store, file store, authentication provider, or payment provider could become the only owner of a core customer, entitlement, consent, file, content, event, audit, ranking, or retry fact.
- Search documents, ranking snapshots, synonym or boost policy references, query logs, click logs, queue job envelopes, dead-letter records, product events, billing events, job events, or security events are introduced, changed, reviewed, or reported.
- SQLite, PostgreSQL, MySQL, local-file persistence, managed database operations, backup and restore expectations, concurrent writes, tenant scoping, or database-as-operations-center choices are planned, edited, reviewed, or reported.
- Managed PostgreSQL or another database service uses extensions, provider auth functions, generated APIs, row-level security policies, triggers, stored procedures, console-only settings, vector search, spatial search, full-text search, or other provider-specific conveniences that could become domain rules or migration blockers.
- User identity, provider identities, emails, sessions, memberships, roles, permissions, entitlements, file ownership, public resource URLs, storage object keys, or provider ids are persisted or referenced by other records.
- Data residency, processing region, storage region, backup region, log region, analytics region, AI processing location, retention policy, or external processing permission is modeled or claimed.
- Locale, country, billing country, residence or operating country, currency, timezone, date-only values, recurring local-time schedules, money, taxes, exchange rates, historical price snapshots, or global-ready storage models are introduced, changed, reviewed, or reported.
- AI usage, AI model pricing, model call cost, token accounting, provider-call cost, feature-level cost, plan limits, retry cost, cache-hit savings, or usage-ledger records are introduced, changed, reviewed, or reported.
- AI budget, AI feature policy, AI policy decision, provider budget reliance, hard-limit enforcement, model fallback, token cap, tool-call cap, agent-step cap, timeout cap, or emergency disable state is introduced, changed, reviewed, or reported.
- Product usage metering, customer cost estimation, plan margin analysis, free-plan limits, credit pools, tenant quotas, high-cost feature limits, or cost rollup records are introduced, changed, reviewed, or reported.
- File upload metadata, object-storage keys, signed upload or download flows, local disk storage, database blob storage, asset status, orphan cleanup, or storage/database consistency rules are introduced, changed, reviewed, or reported.
- Deletion, restore, purge, versioning, payment, point, credit, inventory, entitlement, subscription, coupon, prompt, document, policy, or automation-rule behavior is introduced, changed, reviewed, or reported.
- Background jobs, outbox dispatch, dead-letter state, retry scheduling, worker locks, external API call tracking, webhook receipt tracking, or request idempotency records are introduced, changed, reviewed, or reported.
- A list, feed, search, admin table, dashboard, or API response may risk hidden N+1 queries, ORM lazy-loading surprises, unbounded relation loading, expensive counts, or screen-shaped persistence.
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
- Database operating model: SQLite file, managed PostgreSQL, self-managed PostgreSQL, MySQL, local disk, object metadata store, or other store; single server or many app servers; concurrent write pressure; backup and restore target; and whether the deployment can preserve local files safely.
- Event role: operational event, audit log, behavior analytics event, integration outbox message, reporting aggregate, or replayable domain event.
- Data owner and affected tables, collections, stores, indexes, caches, generated files, or read models.
- Entity identity rules, including stable ids, external provider ids, mutable slugs, titles, locale-specific addresses, redirects, and public API identifiers when content or user-facing resources are involved.
- Exit and restore rules, including whether exported data preserves relationships, permissions, files, versions, events, audit history, automation rules, provider id mappings, schema metadata, and enough import or restore evidence to reconstruct product state.
- Identifier ownership rules, including which ids are product-owned, which ids are public, which ids are provider mappings, and whether external auth, payment, CRM, analytics, storage, or CMS ids can change without breaking internal references.
- Authentication identity rules, including app-owned user id, provider subject records, email-as-attribute behavior, social provider subject preservation, account merge or relink policy, session migration expectations, and whether memberships, roles, permissions, and entitlements live in product-owned tables rather than only provider metadata.
- Managed database dependency rules, including extension inventory, provider-specific function usage, generated API usage, row-level policy ownership, trigger or stored-procedure ownership, console-only schema or permission settings, and whether a plain or explicitly equivalent database migration rehearsal exists.
- File and URL ownership rules, including public URL owner, storage provider, bucket, object key, content type, checksum, visibility, file status, variant name, storage region, immutable versioning, private download authorization, and whether raw storage URLs or CDN transform syntax may appear in persisted content.
- Data location rules, including data classification, home region, storage region, processing region, backup region, log region, analytics region, AI provider region, support-tool access, external transfer notice, deletion path, and whether provider system metadata is outside the selected residency scope.
- Core-state ownership rules for external services, including which facts must be stored internally even when a provider handles the workflow: entitlement state, plan state, payment event cursor, consent and unsubscribe state, file owner and storage metadata, customer status, search index source document metadata, processed job or webhook state, and administrator audit evidence.
- External API recovery rules, including which internal intent, attempt, job, webhook receipt, provider reference, dead-letter, manual-review, and reconciliation records are needed before a provider result or dashboard becomes the only evidence.
- Search, queue, log, metric, and analytics data rules, including search document source, ranking or boost metadata, event names and versions, event retention, job schema versions, idempotency keys, dead-letter retention, and whether SaaS-held data is also exportable or stored internally.
- Storage split rules for body files, frontmatter, database rows, generated indexes, site-specific overrides, central facts, and external source data when a hybrid model is used.
- Filter, sort, search, localization, SEO, analytics, revision, source, and cache-invalidation needs that could turn display-only values into persisted typed data.
- Content graph rules, taxonomy governance, source and collection provenance, verification states, user or anonymous actor state, comment moderation, and aggregate-versus-event ownership when those surfaces exist.
- Body block vocabulary, block schema versions, content-type-specific fields, filter definition policy, SEO landing policy, cache key normalization, invalidation tags, admin operation logs, and generated-index ownership when those surfaces exist.
- Lifecycle status vocabulary, delete alternatives, asset original and variant ownership, claim or fact registry shape, source reference shape, jurisdiction, risk tier, effective dates, verification cadence, review owner, usage mapping, bulk update job model, comparison methodology, affiliate link policy, and data-domain owner when those surfaces exist.
- Read and write paths, query or ORM behavior, authorization scope, tenant or user scope, and retention expectations.
- Read and write workload shape, including repeated reads, freshness requirements, same-row write conflicts, write bursts, retry safety, index write cost, and whether a ledger, read model, or projection is needed.
- Global data shape, including locale, country, billing country, currency, timezone, local date, local time, UTC instant, market-specific price, tax inclusion, rounding, exchange-rate snapshot, and whether account defaults differ from user preferences.
- Money and value movement rules, including minor-unit integer storage, decimal calculation precision, currency-code ownership, non-two-decimal currency support, tax, discount, refund, exchange-rate, and historical snapshot policy.
- AI usage and cost ownership, including feature key, account or workspace scope, user request id, provider call id, idempotency key, model, token counts, cache-hit type, pricing snapshot, cost integer unit, retry cost, and per-plan budget limits.
- AI policy ownership, including budget records, feature policies, preflight policy decisions, hard limit versus provider alert behavior, selected model, fallback model, blocked reason, remaining budget, maximum input and output tokens, maximum tool calls, maximum agent steps, maximum retries, timeout, and emergency disable state.
- Usage metering ownership, including account, workspace or organization id, user id, feature key, request type, input size, output size, processing time, external API call flag, retry count, failure count, plan at time of use, credit or quota source, rollup period, and whether user actions fan out into multiple cost records.
- Plan economics ownership, including which records support customer-level variable cost, contribution margin, P50/P90/P99 usage analysis, free-plan loss ceilings, and plan-limit enforcement without relying only on provider dashboards or monthly invoices.
- Operational query path versus analytics or reporting path, including whether large scans, grouped aggregates, dashboards, experiments, or behavior logs share operational database resources.
- Cache role and rebuild expectation, including whether the cache can be cleared without losing logical service state.
- Public API, mobile API, admin API, integration API, search projection, and internal model boundaries when persisted values leave the database layer.
- Delete lifecycle, versioning rule, ledger rule, read-model shape, expected query count, ORM dependency boundary, transaction boundary, idempotency, retry, duplicate-delivery, concurrency, migration, rollback, or rebuild expectations.
- Job and integration tables when relevant: queue, job type, deduplication key, payload shape, status values, attempt count, maximum attempts, next run time, lock expiry, last safe error, dead-letter state, outbox publication state, inbox or webhook receipt state, processed webhook identifiers, manual replay state, and external provider call outcome.
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
   - Provenance store: records sources, collection runs, raw items, field-level evidence, verification, and source changes.
   - User state store: records actor-specific reactions, bookmarks, comments, reports, read state, follows, notifications, and personalization inputs.
   - Analytics store, external provider, or browser storage: owned outside the core domain boundary.
   - Behavior analytics store: records high-volume user actions, impressions, searches, scrolls, clicks, experiments, and attribution data without becoming part of the core write path.
   - Audit log store: records high-impact human or system changes that must be attributable, bounded, and more durable than ordinary behavior analytics.
2. Classify the database operating model before treating the store as a neutral implementation detail.
   - SQLite is a serverless relational database, not merely a toy store. It can be a strong default for a single durable server, a solo or small operator, mostly-read workloads, modest concurrent writes, simple local development, and product-validation phases where simpler operations reduce failure cost.
   - Prefer PostgreSQL or another server database when the system already needs multiple app servers, high concurrent writes, team or tenant access, payment, credit, point, entitlement, permission, settlement, external operators, read replicas, point-in-time restore, managed backups, database-level collaboration, or stronger locking and operational tooling.
   - Treat deployment as part of the database decision. A local SQLite file is risky when containers, serverless hosts, redeploys, or ephemeral volumes can lose or split the file. A managed PostgreSQL service can be operationally simpler than SQLite when backups, dashboards, access control, and restore tooling are already provided.
   - Check SQLite backup details when SQLite is used. A live database with a write-ahead log needs SQLite's backup mechanism or a storage snapshot that captures the database and log consistently; copying only one visible file can be unsafe.
   - Do not choose PostgreSQL only because the product might grow. Choose it when operating shape, concurrent writes, data responsibility, restore needs, or collaboration pressure already justify the cost.
3. Identify the data owner and derived surfaces. Name which table, file, provider, event log, configuration, or generated artifact owns each value.
   - Keep app-owned identity separate from provider identity. Product tables should reference the internal user or organization id; external auth, payment, CRM, analytics, storage, and support ids should live in mapping records.
   - Treat email as a mutable contact attribute, not as a permanent user identifier. Preserve provider subject ids when social login or authentication-provider migration might need account relinking.
   - Keep memberships, roles, permissions, plan entitlements, and product access decisions in product-owned records. Provider tokens or metadata may carry hints, but they should not be the only authority.
   - Inventory managed-database dependencies separately from domain meaning. Extensions, provider auth functions, row-level policies, generated APIs, triggers, stored procedures, and console-created settings are acceptable only when their purpose, migration path, and replacement risk are explicit.
   - Keep storage object identity separate from public resource identity. Persist storage provider, bucket, object key, checksum, content type, size, visibility, status, region, and variant metadata without making raw storage URLs or CDN transformation syntax the public contract.
   - Add data-location fields when customer, legal, or AI-processing requirements need proof of where data lives or is processed. Home region, storage region, processing region, retention policy, and external-processing permission belong with the entity or organization that governs the data.
   - Model AI cost control as data, not only code. Budgets, feature policies, policy decisions, usage ledgers, provider-call outcomes, blocked reasons, and fallback decisions need records when AI cost or compliance matters.
   For hybrid content systems, state which values are owned by:
   - The body document, such as Markdown, MDX, CMS rich text, or editor blocks.
   - Strict frontmatter, such as stable id, type, locale, title, slug, summary, status, author, tags, category, related entities, and SEO defaults.
   - Database tables, such as permissions, workflow, site exposure, publication targets, redirects, facts, relationships, analytics, and operational queries.
   - Structured block records, such as headings, images, review boxes, comparison tables, maps, video, FAQ, quotes, call-to-action blocks, ad placeholders, gated sections, and their schema versions when they must be queried or reused.
   - Generated indexes or projections, such as search documents, sitemap records, feeds, API views, static page dependencies, landing pages, ranking snapshots, cache entries, and admin lists.
   - Domain-owned data areas, such as identity, privacy and consent, editorial content, catalog facts, comparison results, community content, analytics events, billing references, messaging logs, and audit records. Keep these boundaries explicit even when they share one physical database.
   - API projection owners, such as public resource responses, admin views, mobile responses, search documents, and integration payloads. Treat these as contracts over source data, not direct exposure of current tables.
   - Exit-owned data areas, such as export manifests, import manifests, relationship maps, permission maps, file inventories, version or event streams, automation rules, external integration mappings, and schema descriptions. Treat these as reconstruction evidence, not as a decorative download.
   - Provider id mappings, such as payment customer ids, authentication subject ids, storage object ids, CRM contact ids, analytics user ids, and CMS entry ids. Internal ids should remain stable when any provider id changes.
   - External-service core facts, such as current entitlement, subscription or plan state, processed payment event id, email consent state, customer lifecycle state, file identity and ownership, search source document metadata, job processing state, and audit evidence. Do not let a provider dashboard be the only place that can explain these facts.
   - Search and queue reconstruction records, such as index document builders, ranking or synonym policy versions, search logs, queue message schema versions, job idempotency keys, retry state, dead-letter state, and manual replay markers.
4. Check schema shape: primary keys, foreign keys, unique constraints, nullable fields, defaults, check constraints, status values, timestamps, soft delete fields, tenant scope, audit fields, and retention rules.
   - Treat deletion as lifecycle when recovery, audit, search behavior, support handling, or retention matters. Consider `deleted_at`, `deleted_by`, `delete_reason`, `restored_at`, `restored_by`, and `purge_after` instead of a lone boolean or timestamp.
   - Separate business records that should be soft-deleted or archived from personal data that should be anonymized, purged, or retained under a narrower legal rule.
   - Treat mutable high-value records as versioned when reproducibility matters, such as AI prompts, documents, contracts, price policies, experiment configs, comparison data, permission policies, automation rules, and model settings. Prefer a stable parent row with a current-version pointer plus immutable version rows.
   - Use ledgers for money-like or quota-like balances, such as points, credits, inventory reservations, refunds, coupon issuance, entitlement grants, and manual adjustments. Treat cached balances as derived from ledger entries unless the local design proves otherwise.
   - For audit logs, store actor type, actor id when safe, action, target type and id, bounded before and after values, reason, request id, idempotency key, and timestamp in the same local transaction as the audited change when possible. Audit logs should be append-only to normal operators and should redact or omit personal data that is not needed to explain the change.
   - Keep ledgers and audit logs separate. Audit logs explain who changed what and why; ledgers explain how money-like, quota-like, inventory-like, or entitlement-like value moved.
   - Use tenant, workspace, organization, or team scope keys early when a product can become B2B, team-based, workspace-based, or account-scoped. Retrofitting tenant boundaries later is usually a data migration and authorization rewrite, not a small column add.
   - Separate locale, country, billing country, currency, and timezone. Language is a display preference, country is a rule boundary, currency is a money unit, and timezone is a date boundary; do not infer one from another.
   - Store UTC instants for events such as creation, payment, refund, login, and update times. Store date-only values as dates, not midnight timestamps. Store recurring or locally scheduled work as local time plus IANA timezone and recurrence rule, with the next UTC run time as a derived execution aid.
   - Store final charge, refund, ledger, and invoice values as integer minor units plus currency code. Use decimal or numeric precision for intermediate unit prices, rates, tax, and exchange calculations, then persist the rounded final amount with the rounding policy that produced it.
   - Do not assume all currencies have two decimal places. Treat currency exponent, tax inclusion, discount order, refund basis, and negative amount direction as explicit policy.
   - Snapshot historical prices, taxes, discounts, exchange rates, payment fees, and AI model pricing when those values explain past orders, ledgers, or provider costs. Do not recompute old business records from current prices or current exchange rates.
   - Keep account defaults and user preferences separate when a team, workspace, or organization can have billing currency, reporting timezone, country, or locale defaults that differ from an individual user's UI language or timezone.
5. Check query semantics: authorization scope, tenant or user scope, role or visibility filters, deleted or archived rows, draft or unpublished rows, effective dates, null handling, stale-data behavior, and error or absence handling.
   For content and data-product models, check that:
   - Stable ids do not depend on title, slug, URL, locale, provider display name, category, or current screen placement.
   - Slug and redirect history can survive title changes, localization, section moves, and canonical URL changes.
   - Content type, workflow status, category, tag, typed attribute, relation, author, editor, asset, and source data are separate when they have different query, filtering, permission, localization, or retention behavior.
   - Values likely to be filtered, sorted, aggregated, compared, localized, or verified use typed columns or typed attribute records instead of free-form tags or display strings.
   - Localized display names, translated slugs, labels, and formatted money or date strings are not stable identity. Use internal ids for joins and references, and treat localized names or slugs as projection or localization records.
   - User-visible locale-aware sorting may differ from stable database pagination. Use deterministic secondary ordering, such as a stable id, so pages do not duplicate or skip rows when display strings collide or collation behavior changes.
   - Local-day reporting should convert the user's or workspace's timezone-local half-open day range into UTC and query with `>= start` and `< end`; avoid inclusive `23:59:59` style endings.
   - Semantic body units that drive filtering, search, advertisements, analytics, structured data, access control, or reuse are represented as typed blocks or structured fields instead of opaque `body_html`.
   - Content block records have stable ids, order, type, schema version, visibility or access policy, and enough data shape to migrate old blocks safely.
   - Type-specific fields are not hidden in body text when the type depends on them, such as review ratings, comparison criteria, place coordinates, video duration, course lesson state, product prices, FAQ items, or event dates.
   - Post, item, concept, product, place, person, series, comparison, collection, and redirect relationships use typed relationship records when direction, order, confidence, source, creator, or reason matters.
   - Generic "related content" arrays do not hide distinct relations such as sequel, prerequisite, update, replacement, comparison target, same-series item, rebuttal, summary, or same-topic item.
   - Lifecycle states such as draft, scheduled, published, unlisted, private, archived, deprecated, redirected, gone, and soft-deleted are distinct when they differ in search indexing, access, redirect behavior, retention, or recovery.
   - Tags are governed records with stable ids, slugs, aliases, status, parent links, and merge history when they affect search, filters, topic hubs, recommendations, analytics, or SEO.
   - Categories, navigation, URL hierarchy, and topic taxonomy are not collapsed into one mutable field when a section move should not rewrite content identity.
   - Filter attributes such as region, price range, difficulty, audience, platform, availability, reading time, evergreen status, and download/video availability are typed data, not tags.
   - Translations model "one entity with multiple representations" instead of adding a new schema column per language.
   - SEO metadata, canonical URL, robots behavior, sitemap inclusion, and structured-data type are not buried inside body text.
   - SEO metadata supports automatic defaults and manual overrides without making generated values indistinguishable from editor-provided values.
   - Media assets have enough metadata for accessibility, responsive display, reuse, rights, and ownership instead of only storing an image URL.
   - Media assets keep immutable originals separate from rebuildable variants, and asset storage keys do not depend on mutable post slugs, titles, categories, or locale paths.
   - Site-specific title, slug, SEO text, call-to-action, access level, publish status, and display overrides are separate from canonical content when the same content can appear in multiple sites.
   - Content reuse is represented by references to central content, blocks, entities, or facts rather than copied articles that drift independently.
6. Check pagination and ordering. Lists need deterministic ordering; cursor pagination needs a stable tie breaker such as a unique id in addition to a timestamp.
   - For list and feed APIs, define the intended read model and expected query shape before returning full ORM entities. A list response should usually fetch only fields, aggregates, and viewer-specific flags required by that response.
   - Look for N+1 risks from lazy-loaded relations, per-row author lookups, counts, viewer-specific reaction checks, tags, attachments, permissions, or nested data. Prefer explicit joins for small required relations, batch queries for one-to-many data, aggregate or denormalized counters for counts, and query services or read models for complex feeds.
   - Do not expose ORM relation loading style as the public contract of a service. Complex admin, search, reporting, and feed queries may need a dedicated query service, projection, materialized view, or raw SQL with explicit authorization and pagination.
7. Check revision, fact, and source semantics when data changes independently from prose.
   - Distinguish record creation time, publish time, meaningful content update time, fact verification time, observation time, source retrieval time, effective date, archive time, deletion time, and anonymization time.
   - Use content revisions for body or editorial changes, and fact/version records for prices, legal requirements, model specs, ratings, availability, release dates, compliance status, or other changing facts.
   - Store source records with origin, retrieval time, hash or version metadata when trust, audit, correction, or refresh behavior matters.
   - Do not claim a page was substantively updated when only formatting, copyright year, or copy polish changed.
   - Distinguish current facts from historical facts so reviews, comparisons, and archive content do not silently rewrite past context.
   - Prefer entity-id references for products, companies, plans, features, people, services, prices, ratings, release dates, support status, and availability; names and display text can change.
   - Use a central claim, fact, or policy registry for legal, privacy, finance, health, price, eligibility, risk-disclosure, compliance, product-spec, and recommendation claims that may need impact analysis.
   - Claim or fact records should carry source references, jurisdiction or market, risk tier, effective dates, verification date, review owner, status, and usage mappings such as post-claim or block-claim records.
   - Bulk policy, price, legal, or fact updates should be modeled as jobs with affected records, proposed changes, reviewer, result, rollback or recovery notes, and cache or index invalidation targets.
   - Comparison and ranking data should preserve methodology id, methodology version, criteria, weights, excluded factors, evidence references, score, rank, calculation time, affiliate policy, and reviewer rather than storing only prose order.
   - Affiliate links should store destination, relationship type, campaign or provider metadata, active status, and outbound-link policy such as sponsored or user-generated link treatment.
8. Check source collection and verification semantics when data comes from external pages, feeds, APIs, users, crawlers, or imports.
   - Separate raw collected records from canonical records shown to users. A canonical item may have many source records, and a source record should not automatically become trusted display data.
   - Model source, collection run, raw collected item, canonical item, verification record, and change history separately when source trust, deduplication, conflict handling, or refresh behavior matters.
   - Distinguish source published time, source modified time, collection time, parse time, verification time, stale time, source removal time, and rejection time.
   - Use a verification state flow when needed, such as collected, parsed, auto-verified, human-verified, stale, disputed, source-changed, source-removed, and rejected.
   - Store field-level provenance for high-risk values such as price, address, availability, ratings, legal requirements, official status, feature support, and dates when different fields can come from different sources.
   - Define official versus unofficial source priority, conflict resolution, source takedown behavior, and whether raw snapshots are internal evidence or public content.
9. Check user activity and community state separately from canonical content.
   - Store likes, bookmarks, comments, reports, reads, follows, notifications, saved searches, hidden items, and direct-visit state in separate records from content rows.
   - Treat aggregate counts such as likes, comments, views, saves, and recent activity as caches or read models unless the local architecture intentionally makes them the source of truth.
   - Use uniqueness rules for actor-content reactions, cancellation or undo semantics, and deterministic rebuild paths for aggregates.
   - Allow the actor model to represent a signed-in user, anonymous session, admin, system process, crawler, or importer when those actions need attribution or later merging.
   - Treat comments as user-generated content with status, parent relationship, moderation reason, report count, edit/delete timestamps, and parent-deletion behavior instead of as a simple reaction counter.
10. Check API and projection boundaries. Public, admin, search, analytics, feed, sitemap, and frontend views should be projections over source data, not copies of the current page layout.
   - Public APIs need stable resource identifiers, schema versioning, pagination, allowed filters and sorts, visibility rules, deleted/private/redirected states, and public/admin field separation.
   - Do not return raw database rows, ORM entities, table column names, internal booleans, or mutable implementation ids as the external contract when a response mapper can expose product concepts instead.
   - Do not shape persisted records or API responses around the current frontend component tree. A screen-specific endpoint can exist, but it should still return domain resources, stable ids, machine-readable statuses, safe labels, pagination, and explicit errors rather than card titles, button text, modal flags, internal storage keys, or display-only color decisions.
   - Keep database refactors and API compatibility separate where possible. Table splits, joins, column renames, or subscription-model changes should be absorbed by projections before they force client changes.
   - Use public identifiers or stable resource ids when exposing user-facing resources; avoid making predictable internal numeric ids the only external handle unless the product deliberately accepts that disclosure.
   - Analytics events should reference stable entity ids and typed dimensions instead of mutable URLs or display text when later attribution, filtering, or aggregation matters.
   - Analytics and experimentation events should avoid direct personal data such as email, names, phone numbers, or payment identifiers; reference anonymous ids or internal user ids and keep re-identification inside the identity boundary.
   - Analytics event records should carry event name, event schema version, occurrence time, source, actor or anonymous id, object type and id, and typed properties. Do not let renamed JSON keys silently mix incompatible event eras.
   - Core events that support billing, entitlement, permission, file lifecycle, search, queue recovery, security, and customer support should not live only in an analytics SaaS. Keep an internal event, audit, billing, job, or product-event record when the event is needed to reconstruct what happened.
   - Email-platform tags, analytics cohorts, search ranking settings, no-code views, and provider dashboard fields should usually be derived from internal state. If any of them becomes source of truth, document the recovery and export path explicitly.
   - Account deletion, anonymization, retention, and export behavior should be defined per data owner, because identity, consent, billing, community content, analytics, messaging, and audit records rarely share one deletion rule.
   - Separate behavior analytics logs from audit logs. Behavior analytics can often tolerate delay or bounded loss; audit logs for administrator, payment, permission, publication, or data-access changes usually require stronger durability, attribution, and retention.
   - Keep behavior logs off the synchronous core write path when losing a click, view, search, or impression event should not fail signup, payment, publish, save, or permission changes.
11. Check filter, URL, landing-page, and crawl policy data.
   - Filter definitions name allowed keys, allowed values or value ranges, default behavior, canonical order, multi-value ordering, invalid-value behavior, and whether values belong in the URL.
   - Shareable filter-state URLs, curated SEO landing pages, and temporary UI state are different records or policies when they differ in canonical URL, sitemap, indexing, analytics, or cache behavior.
   - Canonical filter state removes defaults, normalizes case and numeric ranges, sorts multi-values, rejects or drops unknown keys intentionally, and produces one stable URL and one stable analytics/cache shape for the same meaning.
   - Curated landing pages own their path, filter preset, search title, description, canonical target, indexability, and sitemap inclusion instead of being every possible filter combination.
12. Check admin-controlled operations and audit data.
   - Admin changes to content status, slug, redirect, canonical URL, robots policy, SEO metadata, filter definitions, advertisement slots, cache purge, search reindexing, ranking refresh, and role assignments need authorization, reason, before/after evidence, and rollback or recovery expectations.
   - Audit snapshots are bounded and redacted where needed; they should explain what changed without turning logs into a raw content or personal-data archive.
13. Check rendering, cache, and dependency invalidation data. If changed data should refresh static pages, API caches, search indexes, feeds, sitemaps, ranking snapshots, or comparison pages, model the dependency or report the missing invalidation path.
   - Cache keys for filter, search, listing, and comparison APIs are derived from normalized state and include a version when logic or response shape can change.
   - Cache entries, cache tags, purge rules, page dependencies, search index jobs, sitemap rebuild jobs, and ranking snapshots are derived surfaces unless explicitly designated as source of truth.
   - Admin and personalized responses are not stored in shared caches; private or no-store behavior belongs with the response or route policy, not only with caller convention.
   - Use the cache flush question as a boundary test: if clearing Redis or another cache only makes the service slower, it is a cache; if it loses sessions, queues, rate-limit state, permissions, payment state, or user-visible state, document it as runtime storage and design durability accordingly.
   - Do not use cache as the sole authority for permissions, ownership, subscription, payment, entitlement, inventory, or destructive-action decisions unless the cache is intentionally operated as the authoritative store with backup and recovery guarantees.
14. Check file-based and uploaded-asset limits when files own content data or user-uploaded bytes. A file-only model needs strict metadata validation, stable ids, deterministic derived indexes, and an explicit escape path once admin filtering, multi-author workflow, multi-site reuse, fact updates, source verification, user state, structured blocks, or cross-content queries outgrow scripts.
   - User-uploaded originals should usually live in object storage when uploads are a product feature. Store metadata, ownership, storage key, size, content type, checksum, visibility, status, dimensions, and timestamps in the database; do not store large original bytes in ordinary relational rows unless the product has a deliberate blob-storage reason.
   - Model upload and processing states such as pending, uploaded, processing, ready, failed, and deleted when the database and storage cannot commit atomically.
   - Define cleanup for stale pending uploads, storage objects without database records, database records without storage objects, failed conversions, and deleted assets waiting for physical removal.
15. Check transaction boundaries. Keep database writes and external side effects separate by default; use explicit states, an outbox, an action ledger, or reconciliation when both must be coordinated.
   - Classify which writes must succeed or fail together. Payment, point, credit, inventory, entitlement, subscription, coupon, refund, and permission changes usually need a transaction for local state and a separate outbox or action ledger for external work.
   - Do not call payment providers, email services, notification services, AI providers, webhooks, or other slow external systems while holding a database transaction open. Persist local state and outbox records first, then let follow-up work run after commit.
16. Check durable job, outbox, and provider-call state when HTTP requests hand work to workers.
   - Store the existence of accepted work before depending on a queue publish. Durable job or outbox rows should be recoverable by a dispatcher if the process dies after commit.
   - Job records should carry queue, type, safe payload reference, status, attempts, maximum attempts, run-at time, lock expiry, last safe error, and deduplication key when repeating the work could duplicate effects.
   - Outbox records should identify the aggregate, event type, safe payload, idempotency key when relevant, creation time, and publication state. Outbox publication is derived delivery state, not the domain event source of truth unless the local architecture says so.
   - External provider call records should distinguish `pending`, `succeeded`, `failed`, and `unknown`. Unknown means the system must reconcile with the provider before retrying because the provider may have completed the effect.
   - Processed webhook records should store provider, event id, event type, object id when safe, and receipt time. If the provider can send equivalent events with different event ids, also define a normalized deduplication key.
   - Payment data should separate internal order or entitlement state from provider attempts, provider object ids, webhook receipts, state history, and reconciliation status. Provider payment ids are mappings, not the product's order identity.
   - Email data should separate the product event that requested delivery from provider message ids, template keys, recipient snapshots, retry attempts, bounce events, and manual resend state.
   - AI job data should separate the user request from provider calls, prompt version, input hash, selected model, result state, error state, cost estimate, actual usage, and retry grouping.
   - Search and map data should remain reconstructable from product-owned source records. Search indexes, search jobs, external place ids, geocode payloads, ranking snapshots, and click logs are derived or mapping data unless explicitly made a source of truth.
   - Dead-letter or manual-review records should preserve enough safe metadata to diagnose exhausted retries without storing secrets, raw payment data, full prompts, or unnecessary personal data.
   - AI usage records should be written through one application-owned AI call boundary, not scattered provider SDK calls. At minimum, track account or workspace, user when safe, request id, idempotency key, feature key, provider, model, input and output usage, cached input usage when available, cache-hit type, status, latency, pricing snapshot, and integer cost unit.
   - Distinguish one user request from one or more provider calls. Retries, fallbacks, tool calls, embeddings, reranking, image or audio processing, evaluations, vector storage, and logging can all change cost without changing the user's perceived action count.
   - Store pricing snapshots or pricing version references for AI cost calculations. Current model prices should not rewrite the meaning of historical usage.
   - Store cache key hashes or safe cache identifiers for AI and embedding caches. Do not persist raw prompts, confidential documents, personal data, or provider request bodies merely to explain cache behavior.
   - General usage records should support product economics as well as enforcement. Store tenant scope, user scope when safe, feature key, request type, input and output size, duration, external provider involvement, retry and failure counts, plan snapshot, and quota or credit source when those fields explain cost or limit decisions.
   - Separate raw usage events from rollups. Raw or bounded events explain disputes and debugging; daily or monthly rollups support plan limits, contribution margin, and P50/P90/P99 heavy-user analysis.
   - Do not make provider dashboards, monthly invoices, analytics SaaS reports, or log-search queries the only source for customer-level usage, high-cost feature use, or plan-limit enforcement.
17. Check idempotency, retries, duplicate delivery, and concurrency. Look for webhook duplicates, double-clicks, job retries, import reruns, payment callbacks, upload confirmations, optimistic locks, compare-and-swap updates, unique-constraint races, and double state transitions.
   - Use idempotency keys, provider event ids, unique constraints, optimistic locking, row locks, version numbers, processed-event records, or ledger source identifiers when repeating a request could create duplicate money, credit, entitlement, coupon, email, file, or state-change effects.
   - Store a request hash with request idempotency keys. Same scope, operation, and key with the same hash can return the prior result; the same key with a different hash should conflict.
   - Use conditional state updates or insert-on-conflict records for repeated effects. Avoid direct arithmetic updates for value movement unless a ledger or unique source record prevents duplicate application.
   - Define the correct outcome for simultaneous updates by two users, two admins, two webhooks, or a slow worker result arriving after a newer result. Return conflict, retry, merge, ignore stale result, or apply a state-machine event intentionally.
18. Check indexes and workload cost. Match indexes to `WHERE`, `JOIN`, `ORDER BY`, and `GROUP BY` behavior, but account for write cost. Look for N+1 queries, expensive counts, full scans, materialized read-model needs, graph traversal needs, aggregate rebuilds, ranking recomputation, and search-index boundaries.
   - Set an expected query-count budget for high-traffic list APIs when possible. Query count should not grow linearly with rows because an ORM relation is accessed inside a loop.
   - Classify large scans, grouped aggregates, long time windows, experiment reports, search-term rankings, and repeated admin dashboards as analytics or reporting work unless they are required for one current user or resource.
   - If an operational database must temporarily support reporting queries, bound them by time, index, row count, connection pool, read replica, or precomputed aggregate and report the escape path.
   - For read-heavy paths, prefer query-pattern clarity, indexes, and precomputed projections before adding caches. A cache without a clear invalidation owner becomes data debt.
   - For write-heavy paths, account for index maintenance, audit writes, lock contention, same-row counters, balance or inventory conflicts, and retry safety before claiming the database is sufficient.
19. Check privacy and retention. Prefer omission or bounded metadata over storing raw payloads. Do not persist secrets, hidden reasoning, full transcripts, unbounded logs, unnecessary raw source copies, unnecessary audit snapshots, or personal data without a clear product rule and retention path. Distinguish soft delete, hard delete, anonymization, archive, legal retention, and user-visible removal.
   - Do not let user profile rows become the dumping ground for consent, billing, analytics, editorial authorship, messaging, or audit state when those records have different access, retention, deletion, or legal requirements.
   - Treat content versions, claim snapshots, methodology snapshots, and audit logs as bounded evidence records; they should support rollback and review without becoming unbounded archives of personal data or raw provider payloads.
20. Check migration, rollback, and rebuild paths. If a migration claim exists, prove idempotency and recovery with `migration-safety-check` or report the gap. If the store is a cache, name the rebuild source and stale-index detection.
21. Check backup and restore assumptions when data durability is claimed. Name the restore surface, including database, uploaded files, environment and secret configuration, migration history, external service settings, queue or job state, and any cache used as storage. Do not treat "backup exists" as evidence until restore has been tested or the gap is reported.
   - Check export and import assumptions separately from backup. A useful export should preserve product meaning, including relationships, permissions, files, states, versions, events, audits, automations, provider mappings, and schema notes. A backup proves recovery inside the same system; an export proves the product can leave or be reconstructed elsewhere.
   - Check whether open-source, self-hosted, or replacement deployments can read the exported shape. If the hosted product relies on cloud-only permission, audit, SSO, backup, webhook, bulk-processing, or admin features, report that the data model may not have a real exit path.
22. Check tests and fixtures. Reuse or add repository/store tests, migration fixtures, query fixtures, adapter fixtures, permission regressions, idempotency or concurrency regressions, job-state fixtures, outbox fixtures, webhook-deduplication fixtures, provider-unknown-outcome fixtures, event-schema fixtures, API-projection fixtures, restore drills, and cache rebuild checks as justified by the risk.
23. Verify and report. Separate proven behavior from unverified rollback, migration, restore, privacy, performance, live-data, or concurrency risks.

<!-- mustflow-section: postconditions -->
## Postconditions

- The database role and source of truth are explicit.
- Database rows, ORM models, generated caches, and read models do not leak into domain truth unless the local architecture intentionally owns that boundary.
- Queries preserve authorization, tenant or user scope, deterministic ordering, expected absence behavior, and retention rules.
- Content and resource models separate stable identity from mutable titles, slugs, URLs, translations, display fields, revisions, facts, sources, projections, and analytics dimensions when those concerns exist.
- Content graph, taxonomy, source provenance, verification, user-state, and aggregate records are separated when their ownership, lifecycle, permissions, query load, privacy, or trust behavior differs.
- Hybrid file/database systems have clear ownership: documents for authoring, typed stores for facts and operations, generated projections for delivery, and migration paths for limits.
- Filtering, sorting, searching, localization, SEO, API, cache-invalidation, and rendering needs are represented by typed data or explicitly deferred before display-only shortcuts become migration debt.
- Structured body blocks, filter definitions, curated landing pages, admin audit logs, cache entries, search index jobs, and ranking snapshots are treated as typed records or derived surfaces with explicit owners.
- Lifecycle states, asset originals and variants, central claims or facts, comparison methodologies, affiliate links, data-domain owners, deletion rules, and bulk update jobs are explicit when those concerns exist.
- SQLite, PostgreSQL, managed database, local file, object storage, and other persistence choices are tied to operating shape, concurrent-write pressure, restore expectations, and data responsibility rather than vague size assumptions.
- Locale, country, billing country, currency, timezone, local date, UTC instant, local recurring schedule, and formatted display values are separated when global-ready storage matters.
- Money, exchange rates, taxes, discounts, refunds, AI model prices, and other cost values have currency or unit ownership, precision policy, rounding policy, and historical snapshots when old records must stay explainable.
- Transaction, external side effect, idempotency, duplicate, retry, and concurrency decisions are intentional and reported.
- Job, outbox, processed-webhook, external-provider-call, dead-letter, and reconciliation records are explicit when asynchronous or external work needs durable recovery.
- Payment attempts, email deliveries, AI jobs, search indexing, map or location provider references, and manual recovery records preserve internal ids, provider mappings, idempotency, status, retry, and reconciliation evidence when those providers can fail or be replaced.
- AI usage, provider-call, retry, cache-hit, feature-level cost, pricing snapshot, and budget-limit records are explicit when AI calls can affect user limits, plan economics, or operational cost.
- Usage metering, quota, credit, rollup, and plan-snapshot records are explicit when customer-level cost, free-plan loss, contribution margin, heavy-user behavior, or limit enforcement affects product viability.
- Delete lifecycle, versioned update behavior, ledger ownership, read/write model split, ORM boundary, N+1 risk, transaction scope, external side-effect handoff, idempotency, duplicate, retry, and concurrency decisions are intentional and reported.
- Behavior analytics, audit logs, operational data, reporting aggregates, cache-backed state, API projections, and public identifiers have explicit owners when those surfaces exist.
- Product-owned identifiers, provider id mappings, semantic export or import records, relationship maps, permission maps, file inventories, automation rules, and event or audit histories have explicit owners when exit or restore is part of the data responsibility.
- App-owned user ids, provider identity mappings, email-as-attribute behavior, membership and permission records, managed-database feature inventory, public URL records, storage object metadata, data-location fields, and AI budget or feature-policy records are explicit when those concerns exist.
- Core customer, entitlement, consent, file, content, search, queue, billing, and audit facts are not owned only by external SaaS dashboards or proprietary tool formats unless that lock-in is explicitly accepted and reported.
- Operational databases are not silently made responsible for high-volume future analytics or reporting scans without a bounded escape path.
- Caches are classified as disposable derived data or intentional runtime storage with matching durability expectations.
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
- Identity, slug, lifecycle, asset, body block, taxonomy, relationship, attribute, filter URL, landing-page, translation, locale, country, currency, timezone, local-date, money, price snapshot, revision, claim, fact, source, collection, verification, comparison methodology, affiliate link, data-ownership, behavior analytics, audit log, API projection, public identifier, backup or restore, bulk update, admin audit, user-state, aggregate, cache-key, projection, and cache-invalidation checks where relevant
- Export, import, product-owned id, provider-id mapping, relationship, permission, file, automation, event-history, and reconstruction checks where relevant
- Authorization, tenant scope, retention, and privacy checks
- Delete lifecycle, versioning, money, usage metering, quota or credit, AI usage ledger, job and outbox state, provider-call reconciliation, transaction, idempotency, retry, and concurrency decisions
- App-owned identity, provider mapping, managed-database dependency, public URL, storage metadata, data residency, and AI budget or policy-decision checks where relevant
- Read/write model, ORM boundary, N+1 risk, index, pagination, and performance notes
- Migration, rollback, dry-run, rebuild, or compatibility status
- Tests, fixtures, or verification command intents run
- Skipped checks and reasons
- Remaining database risk
