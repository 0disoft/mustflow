---
mustflow_doc: skill.structure-discovery-gate
locale: en
canonical: true
revision: 28
lifecycle: mustflow-owned
authority: procedure
name: structure-discovery-gate
description: Apply this skill before introducing new feature structure, ownership boundaries, data models, integration choices, or platform decisions that may create long-term architecture commitments.
metadata:
  mustflow_schema: "1"
  mustflow_kind: procedure
  pack_id: mustflow.core
  skill_id: mustflow.core.structure-discovery-gate
  command_intents:
    - changes_status
    - changes_diff_summary
    - docs_validate_fast
    - test_release
    - mustflow_check
---

# Structure Discovery Gate

<!-- mustflow-section: purpose -->
## Purpose

Find hidden structure decisions before coding so new files, folders, names, routing, data models, and integration boundaries reduce future change cost instead of producing a neat but brittle tree.

This is the pre-implementation design gate for work where the agent might otherwise shrink the user's
problem into an easy toy version. It should expose the agent's current understanding, classify the
work by risk, and stop before coding only when the next design choice can change compatibility,
data, authorization, failure behavior, scale, operations, or long-term structure.

<!-- mustflow-section: use-when -->
## Use When

- The task asks for a new feature, module, folder layout, architecture, scaffold, refactor, API integration, website, app flow, routing structure, data model, state model, or file split.
- The user asks for a broad or ambiguous capability and coding immediately would require guessing
  success criteria, scope boundaries, users or roles, data lifecycle, failure policy, scale target,
  existing conventions, non-negotiable constraints, test proof, or operational recovery behavior.
- A named technology or service may be only an implementation choice rather than the product domain, such as AdSense, Stripe, Supabase, Firebase, Resend, SendGrid, Google Analytics, Plausible, or a CMS.
- The request may hide costly structural decisions around localization, SEO, authentication, authorization, payments, ads, analytics, admin workflows, deployment, content management, storage, retention, or external service replacement.
- A website, content system, marketplace, comparison site, review site, knowledge base, documentation site, or data-backed product may later need filtering, search, localization, SEO, public APIs, apps, content revisions, data verification, redirects, or cache invalidation.
- A collected, curated, comparison, recommendation, community, or direct-visit content product may later need typed content relationships, controlled taxonomy, source provenance, verification status, user activity, comments, bookmarks, reports, follows, or personalized feeds.
- A website may later need structured body blocks, type-specific fields, structured data generation, advertisement slots, faceted filters, SEO landing pages, normalized cache keys, admin audit logs, cache purge, search reindexing, or ranking snapshots.
- A content or comparison product may later need lifecycle states beyond published or deleted, reusable image or file assets, policy or legal claim references, versioned comparison methodology, affiliate relationship records, or bulk impact analysis after changing facts.
- A product may later need to distinguish core request paths from auxiliary systems such as behavior analytics, search indexing, recommendation, statistics, email, AI post-processing, cache rebuilds, or admin reporting.
- A product may need to decide whether HTTP requests complete external work inline or accept work, persist a job or outbox event, and let workers perform email, AI, embedding, statistics, webhook follow-up, import, export, or file conversion.
- A data-backed system may need to distinguish current operational state from future analytics data, prove restore capability instead of only backup existence, or limit the failure radius of external services.
- A product or infrastructure choice may need to prove that the service can leave the current tool, vendor, hosted platform, CMS, analytics provider, observability backend, authentication provider, file store, or automation system without losing product meaning, operating state, or cost control.
- An external service, SaaS dashboard, hosted platform, no-code tool, CMS, email tool, analytics tool, search engine, queue, logging backend, or storage provider could become the source of truth for customers, rights, money, files, core content, ranking rules, failure handling, or operating records.
- A managed database, authentication provider, storage provider, CDN, or backend-as-a-service feature could turn provider ids, provider auth functions, row-level policies, generated APIs, raw storage URLs, console-only settings, or proprietary extensions into product contracts.
- A file, image, avatar, attachment, public share, email template, mobile app, search engine, or Open Graph surface could expose a provider URL or CDN transform syntax instead of an application-owned public URL contract.
- A runtime, framework, hosted platform, or language choice needs to prove supported-version policy, security patch path, smoke test, rollback, and whether experimental technology belongs outside core authentication, payment, authorization, database, migration, or security paths.
- User, file, organization, entitlement, billing, analytics, search, AI, support, log, backup, or webhook data may need a location policy that separates operating region, storage region, backup region, log region, analytics region, AI processing region, support-tool region, and payment or tax data region.
- An AI-backed feature may need a product-owned gateway that can estimate cost before a provider call, enforce user, organization, feature, token, tool-call, agent-step, and monthly budget limits, downgrade or block requests, and record actual usage afterward.
- Search, queue, log, metric, or analytics choices may hide product rules rather than only data: search ranking and relevance policy, queue message and retry contracts, dead-letter and replay procedure, event definitions, retention rules, or operator dashboards.
- A tool or platform has a free tier, self-hosting story, export button, or open-source claim that may hide lock-in through incomplete data export, cloud-only operational features, provider-owned identifiers, dashboard-only configuration, or pricing units that grow differently from the product's revenue.
- A deployed service may need request, trace, user, organization, job, webhook, and cron identifiers to survive a change in logging, error tracking, tracing, or metrics backend.
- A deployment platform may hide environment variables, secret names, domains, DNS records, cron jobs, build settings, runtime versions, regions, routes, cache rules, worker settings, queue settings, or rollback rules outside code.
- A local development setup may differ from production in database engine, HTTPS, filesystem durability, number of processes, runtime, cron, webhook verification, cache, timeout, or timezone behavior in ways that could hide production failures.
- A data-backed system may need to choose SQLite, PostgreSQL, MySQL, a managed database, a local file store, object storage, or another persistence surface before implementation.
- A data-backed system may later serve multiple locales, countries, currencies, timezones, tax rules, market prices, or reporting calendars, even if the initial UI and market are local-only.
- A service may later run more than one backend process or server, or may need shared sessions, refresh-token revocation, rate limits, scheduled jobs, background work, uploaded files, or webhook deduplication that cannot live in process memory.
- A service may start on one larger server or simple server shape but should not block later horizontal scaling, worker separation, or queue isolation.
- A runtime or framework choice may hide coupling between business logic and delivery mechanisms such as server actions, route handlers, edge functions, queue workers, command-line handlers, or Web-standard HTTP adapters.
- A framework convenience feature, ORM model, runtime API, or platform object could become the place where pricing, permissions, payment state transitions, entitlement changes, or other product rules live.
- An AI-backed feature may need cost attribution, plan limits, feature-level budgets, provider pricing snapshots, retry-cost accounting, cache-hit tracking, or a single internal AI call boundary before provider calls spread through the codebase.
- Pricing may need to separate the value unit users understand from the internal cost units that protect margin, such as seats, workspaces, storage, search, automation, file conversion, AI calls, tokens, bandwidth, events, or support load.
- CI/CD, deployment, migration, health-check, environment, secret, domain, cron, or rollback behavior may be hidden in a hosted platform dashboard instead of being reproducible from repository contracts and operations documents.
- A new technology, platform, package, or small maintainer-owned library may sit on a core survival path such as authentication, payment, database, migration, authorization, security, deployment, queueing, or file storage.
- A feature accepts user-supplied resource ids, roles, prices, statuses, file uploads, downloads, private assets, or API response shapes that may hide authorization, storage, or public contract decisions.
- The user asks which frontend, backend, database, CMS, hosting, rendering, search, analytics, or infrastructure approach to choose before implementation.
- The agent is about to create new top-level folders, shared modules, providers, adapters, services, constants, or public names.

<!-- mustflow-section: do-not-use-when -->
## Do Not Use When

- The task is a tiny mechanical edit with an obvious target file and no new boundary.
- The user explicitly asks for a disposable prototype, spike, or one-off example where future structure is out of scope.
- A structure decision has already been made in current project instructions, accepted design docs, or the immediately preceding user answer.
- The task is only to match an existing local pattern; use `pattern-scout` unless hidden product assumptions may still change the shape.

<!-- mustflow-section: required-inputs -->
## Required Inputs

- User request and intended product or code change.
- Design gate classification: `simple_patch`, `bounded_feature`, `structural_change`, or
  `risk_change`, with a short reason for the classification.
- The agent's current understanding of the requirement in four sentences or fewer.
- Candidate success criteria, non-goals, and compatibility boundaries that could change the design.
- Current project instructions, relevant context, and nearby implementation patterns when available.
- Known target platform, language, framework, package, or deployment constraints.
- Any named external services, content sources, user roles, locales, data stores, algorithms, policies, feature flags, or revenue surfaces in the request.
- Expected content or resource identity, URL shape, localization plan, SEO/indexing rules, filterable fields, update history, API/app reuse, rendering strategy, cache freshness, migration path, and ownership of changing facts when the task has content or data-product shape.
- Expected storage strategy for long-form body, metadata, facts, relationships, site-specific overrides, admin workflow, search index, analytics events, comments, notifications, paywall, and future file-to-database migration when the product may scale beyond a single simple site.
- Expected relationship model, taxonomy governance, source collection and verification model, search-engine versus direct-visit entry model, user-state surfaces, and aggregate-versus-event ownership when content is a reusable graph or collected data product.
- Expected body representation, content block vocabulary, type-specific fields, advertisement and affiliate policy, filter URL normalization, curated SEO landing-page policy, cache layers, cache invalidation, admin operation controls, and audit needs when the product depends on content operations.
- Expected lifecycle states, content graph navigation, asset storage and variant strategy, policy or fact registry, comparison methodology versioning, affiliate disclosure, data ownership boundaries, and export or rollback expectations when the product may become an operated content asset.
- Expected core path, auxiliary path, analytics storage, cache role, backup scope, restore target, recovery-time expectation, recovery-point expectation, and dependency failure policy when the product stores durable data or calls external systems.
- Expected vendor or platform exit boundary, including whether export preserves relationships, permissions, files, events, audit history, automations, external id mappings, schemas, restore or import procedures, and whether a realistic self-hosted or replacement path exists.
- Expected external-service truth boundary, including which core facts must remain inside the product database even when an external provider processes or displays them: internal user ids, provider id mappings, entitlements, plan state, consent state, file ownership and storage metadata, processed event ids, audit records, and core content identity.
- Expected borrowed-versus-owned boundary, including which operations may be delegated to managed services and which user-visible contracts the product owns: internal identifiers, data meaning, permissions, public URLs, event names, entitlement state, and file identity.
- Expected managed-database dependency boundary, including extensions, provider-specific functions, generated APIs, console-only policies, row-level security rules, triggers, stored procedures, and whether migrations still run in a plain database environment or an explicit replacement environment.
- Expected authentication identity boundary, including app-owned user ids, provider subject mappings, social identity records, email-change behavior, session migration expectations, token normalization, membership and permission ownership, and which metadata must not be trusted as product authority.
- Expected public URL boundary, including whether storage provider URLs, bucket names, object keys, signed URL shapes, CDN query parameters, image transform options, mutable avatar URLs, and immutable file variants leak into content, email, mobile, API, SEO, or browser contracts.
- Expected data-residency boundary, including data classification, home region, storage region, processing region, backup region, log region, analytics region, AI provider region, support access region, retention policy, deletion expectations, and which system metadata may still leave the chosen region.
- Expected AI gateway and cost-stop boundary, including preflight cost estimation, hard budget enforcement, feature policy, model fallback, provider budget limitations, agent loop caps, tool-call caps, timeout caps, emergency kill switches, and post-call usage reconciliation.
- Expected search, queue, log, metric, and analytics portability boundary, including search document generation, ranking and synonym policy, search quality examples, job message envelope, schema version, idempotency key, retry and dead-letter policy, core event list, event schema version, retention, and raw export or replay path.
- Expected operating-state reproduction boundary, including environment variable schema, secret names and rotation notes, DNS and domain records, cron or scheduled jobs, build and runtime settings, regions, storage buckets, queues, worker settings, observability routes, deployment hooks, and rollback procedure.
- Expected observability identifier flow, including request id, trace id, span id, user or anonymous id, tenant or organization id, command or job run id, webhook event id, and which values must not enter logs, baggage, traces, metrics, or external headers.
- Expected cost-growth boundary, including whether vendor pricing grows by seats, users, API calls, events, storage, bandwidth, workspaces, advanced permissions, audit logs, exports, AI tokens, or other units that match or conflict with the product's revenue model.
- Expected async work boundary, including whether HTTP should return immediate success, queued, processing, or accepted status; which work needs job rows, outbox events, idempotency keys, worker locks, retry budgets, dead-letter states, and provider reconciliation.
- Expected database operating shape, including single-server versus multi-server deployment, concurrent write pressure, restore expectations, managed-service needs, local-file durability, and whether the data represents validation state, money, rights, contracts, or legal responsibility.
- Expected global data boundary, including whether locale, country, billing country, currency, timezone, local date, UTC instant, recurring local schedule, market-specific price, tax inclusion, rounding, exchange-rate snapshot, or translated slug/name values must be independent from one another.
- Expected server state boundary, including whether sessions, refresh tokens, rate limits, scheduled tasks, jobs, file uploads, cache, locks, presence, webhooks, and AI work can survive server restart, redeploy, and multiple app servers.
- Expected scaling path, including whether the first deployment is one larger server, serverless functions, edge functions, or multiple app servers; which state must be outside process memory; which work can move from web process to worker process without changing use cases; and which database connection, cron, file, session, and job assumptions would fail when a second server appears.
- Expected runtime portability boundary, including whether core or application code imports runtime, framework, ORM, or platform-specific APIs such as `next/*`, request or response objects, ORM clients, file-system APIs, environment reads, platform queue or storage clients, or edge-only globals.
- Expected delivery boundary, including which code belongs in UI, server actions, route handlers, Hono or Web API adapters, CLI commands, workers, admin tools, application use cases, core decisions, and infrastructure adapters.
- Expected AI usage boundary, including whether all provider calls pass through one gateway, whether usage is recorded per user request and provider call, and whether feature, model, cache, retry, and pricing-snapshot data is needed for cost control.
- Expected pricing and metering boundary, including the user-facing value unit, internal cost units, plan limits, free-plan maximum loss, tenant-level controls, credit or quota policy, and which high-cost actions must be measured before pricing can stay defensible.
- Expected CI/CD and deployment reproducibility boundary, including whether build, test, migration, deployment, health check, smoke test, environment schema, secret inventory, domain records, scheduled jobs, and rollback rules live in repository-controlled contracts or only in a platform dashboard.
- Expected dependency placement boundary, including whether new or experimental technology belongs in a differentiating feature or a survival path, whether failure cases and migration stories are searchable, and whether a single maintainer or small project would own a critical path.
- Expected authorization boundary, including whether the frontend only hides controls or the server checks actor, resource owner, tenant, membership, capability, and action for reads, writes, deletes, uploads, downloads, and admin operations.
- Expected file handling, including whether original bytes live on local disk, database blobs, or object storage; whether uploads are direct-to-storage with signed URLs; and which metadata, status, scanning, conversion, cleanup, and private download rules are required.
- Expected API contract boundary, including whether responses are public, mobile, admin, integration, automation, or internal web-only; whether they expose domain resources or screen-component fields; and how errors, pagination, identifiers, and sensitive fields are handled.
- Risk surfaces that could require a plan/apply gate, capability object, Result or Option return shape, command execution unit, facade entry point, invariant policy, state machine, pure core with an imperative shell, dependency injection boundary, adapter boundary, composition over inheritance, injected clock, state transition table, or idempotency ledger.
- Optional collaborators whose absence might require a null object, disabled implementation, identity implementation, deny-all policy, or explicit failure.
- Relevant command-intent contract entries for later verification.

<!-- mustflow-section: preconditions -->
## Preconditions

- The task matches the Use When conditions and does not match the Do Not Use When exclusions.
- Required inputs are available from current context or can be stated as unknown without guessing.
- Higher-priority instructions and `.mustflow/config/commands.toml` have been checked for the current scope.

<!-- mustflow-section: allowed-edits -->
## Allowed Edits

- Use this skill to shape the plan, questions, assumptions, file boundaries, and the smallest resulting implementation.
- Edit only files needed for the accepted or reasonably assumed structure.
- Do not create broad design documents, policy files, shared folders, provider systems, or abstractions just because they sound tidy.
- Do not treat this skill as permission to delay every task for a long interview; ask only questions that can change the structure.

<!-- mustflow-section: procedure -->
## Procedure

1. Classify the work before designing:
   - `simple_patch`: one obvious target, existing local pattern, low reversibility cost, no new
     contract, data, permission, dependency, or architecture decision. Do not run a design interview;
     inspect files and fix it.
   - `bounded_feature`: a focused capability with a few missing product or verification decisions.
     Produce a compact gate with at most five design-shaping questions.
   - `structural_change`: new boundaries, data models, public contracts, workflows, services, or
     cross-module responsibilities are likely. Do not edit until the design gate has a selected
     implementation boundary.
   - `risk_change`: the work touches database schema, auth, permissions, billing, personal data,
     destructive actions, public APIs, migrations, dependencies on survival paths, external side
     effects, or operational recovery. Treat editing as blocked until the risky decisions are
     resolved or explicitly scoped out.
2. Restate the requested change as the product capability or code responsibility, not just the named technology. Keep the restatement to four sentences or fewer so the user can correct an early misunderstanding quickly.
3. Identify hidden decisions that could change routing, folder names, file boundaries, data model, state ownership, environment variables, tests, deployment, SEO, localization, external integrations, or legal and policy requirements.
   Always check whether the design changes along these axes before asking:
   - observable success criteria and verification proof;
   - scope and non-scope, including public API, URL, schema, event, and stored-data compatibility;
   - actor roles, tenant or ownership boundaries, and server-side authorization;
   - data creation, state transition, deletion, retention, migration, and recovery lifecycle;
   - failure mode, retry, idempotency, partial success, rollback, operator visibility, and manual recovery;
   - expected scale, performance floor, pagination, indexing, caching, and queue or batch throughput;
   - existing local conventions, nearby precedents, naming, error shapes, folder layout, and test style;
   - constraints such as no new dependency, no migration, no public contract change, browser/runtime support, SEO, SSR, and privacy boundaries;
   - tests or invariants that prove the behavior, not only happy-path examples;
   - logging, metrics, audit, trace identifiers, alerts, and operational repair paths.
   For content-heavy products, treat these as structural decisions, not later feature polish:
   - Permanent identity: distinguish stable ids from titles, slugs, display names, routes, and provider ids.
   - Addressing: decide canonical URLs, locale routes, slug history, redirects, filter URLs, sitemap inclusion, `noindex`, and canonical behavior.
   - Content modeling: separate content type, category, tag, typed attribute, status, relation, author, asset, and fact/source data instead of collapsing them into tags or page-specific fields.
   - Semantic body: decide whether body content is prose, structured blocks, or mixed; do not collapse review boxes, comparison tables, maps, video, FAQ, call-to-action blocks, ad placeholders, and access-controlled sections into opaque HTML when later filtering, search, ads, analytics, structured data, or reuse may need them.
   - Type-specific fields: decide which content types need dedicated fields, such as review target and rating, comparison items and criteria, place address and coordinates, video duration and captions, course lessons and progress, product price, or update event date.
   - Content graph: decide whether posts, items, concepts, products, places, people, tags, categories, series, comparisons, collections, redirects, and source records are first-class nodes with typed relationships instead of loose id arrays.
   - Relationship semantics: distinguish directed from undirected links, ordered from unordered links, manual from automatic links, relationship type, confidence, weight, reason, creator, and allowed relation vocabulary before building related-content, series, comparison, or internal-link features.
   - Editorial navigation: require explicit paths such as parent topic, series order, previous and next item, prerequisite, replacement, updated-by, canonical, and next action when the product should remain navigable without a recommendation algorithm.
   - Taxonomy governance: prefer controlled tags with aliases, synonym handling, merge history, status, approval, parent relationships, and indexable topic-hub rules; do not let category hierarchy become the permanent owner of content identity or URLs.
   - Lifecycle policy: model draft, scheduled, published, unlisted, private, archived, deprecated, redirected, gone, and soft-deleted states separately when they affect access, search indexing, redirects, retention, or recovery; do not collapse them into a single boolean.
   - Storage split: decide whether the body belongs in Markdown/MDX, a CMS, or a database, and whether metadata, facts, relationships, site exposure, workflow state, and permissions need a stricter store.
   - Localization: separate canonical content identity from translations, locale slugs, UI strings, region-specific prices, dates, currencies, legal text, and search indexing.
   - Global primitives: separate locale, country, billing country, currency, and timezone. Store UTC instants for events, local dates for date-only values, local time plus IANA timezone for recurring schedules, and integer minor-unit money plus currency code for final charges and ledgers.
   - Historical money and pricing: decide how price, tax, discount, fee, exchange-rate, and AI model-pricing snapshots explain old orders, refunds, ledger entries, and provider costs. Do not let current price tables rewrite history.
   - Revision and fact freshness: distinguish text edits from fact changes, source checks, observed dates, effective dates, corrections, and user-visible "last updated" claims.
   - API and app reuse: design domain resources and projections before screen-specific fields; keep web URLs separate from API ids; include pagination, filtering, sorting, public/admin field boundaries, and versioning when future API reuse is plausible.
   - Rendering and caching: decide SSG, ISR, SSR, client fetch, API cache, and cache invalidation by data fragment, not by the whole site in one bucket.
   - Page dependencies: record which pages, indexes, feeds, sitemaps, caches, and API projections depend on changing data when selective regeneration may matter.
   - Media and assets: model assets with metadata such as dimensions, alt text, captions, license, ownership, focal point, and reuse context instead of storing only a display URL.
   - Asset durability: keep asset identity and storage keys independent from post slugs or titles; preserve immutable originals and treat resized or converted variants as rebuildable derived files.
   - Multi-site reuse: decide whether content is copied per site or centrally referenced with site-specific title, slug, SEO, call-to-action, access, and publish overrides.
   - Search and discovery: decide searchable fields, admin-only search, language-specific search needs, tag normalization, popularity signals, recommendation inputs, and indexed versus live query data.
   - SEO and structured data: separate display title from search title, social sharing metadata, canonical target, robots behavior, sitemap inclusion, breadcrumb title, and structured-data type; decide automatic defaults versus per-content overrides.
   - Faceted URL policy: distinguish shareable filter state, curated SEO landing pages, and temporary UI state; require canonical filter ordering, default-value removal, allowed keys, invalid-value behavior, and `noindex` or crawl-control rules for low-value combinations.
   - Monetization slots: model advertisements, affiliate disclosures, sponsored content, disabled slots, and brand-safety categories as policy and slot data instead of embedding provider code directly in body content.
   - Admin control plane: decide which operations need a safe admin surface instead of direct database edits, such as slug changes, redirects, SEO fields, filter definitions, ad slots, cache purge, search reindexing, ranking refresh, and role changes.
   - Cache strategy: decide cache layers, cache keys, normalized filter state, cache tags, invalidation rules, stale fallback, and admin or personalized `no-store` or private-cache boundaries before depending on traffic-sensitive pages or APIs.
   - Entry model: decide whether the product is primarily search-engine entry, direct-visit entry, or hybrid; every indexable page should stand alone, while feeds, saved views, recent activity, and personalization belong to a separate user-state layer.
   - Source and verification: for collected or curated data, separate raw source records from canonical records and decide collection runs, source trust, source conflicts, verification states, source removal, stale data, field-level provenance, and public exposure limits for raw snapshots.
   - Policy and fact registry: for legal, policy, price, rating, availability, model-spec, or compliance claims, decide central claim or fact records with source, jurisdiction, risk tier, effective dates, review owner, verification date, and usage tracking before placing claims directly in prose.
   - Comparison methodology: for reviews, rankings, and comparisons, decide versioned criteria, weights, excluded factors, evidence references, affiliate policy, and reviewed results before encoding rank or score only in body text.
   - Data ownership boundaries: separate identity, privacy, editorial content, catalog or product facts, community content, analytics, billing, messaging, and audit responsibilities even when they start in one application and one database.
   - Exit-ready ownership: keep product identity, internal ids, permission models, file metadata, audit or event history, automation rules, and provider id mappings under product control so export can reconstruct the service state rather than only dump isolated tables.
   - Business logic ownership: keep core pricing, entitlement, workflow, moderation, notification, billing, and automation decisions in product-controlled code or documented rules. External tools may execute work, but should not become the only hidden place where the business decides what happens.
   - Database operating shape: choose SQLite, PostgreSQL, MySQL, managed database, or another store from deployment and operational pressure, not from "small versus big" labels alone. SQLite is reasonable for a single durable server, low write contention, mostly-read validation work, and simple operator ownership; PostgreSQL is usually safer when multi-server access, concurrent writes, payments, credits, permissions, team workspaces, point-in-time recovery, database collaboration, or managed operations matter from the start.
   - Read and write shape: distinguish read-heavy projections, repeated reads, freshness requirements, write contention, same-row updates, retry safety, and index write cost before choosing caches, ledgers, read models, or database engines.
   - Multi-server state: decide what can live in stateless app servers and what must move to shared stores. Process memory should not own login sessions, refresh-token revocation, rate limits, background job state, uploaded files, duplicate-webhook guards, scheduled job ownership, or user-visible processing state.
   - Server-side authorization: treat the frontend as presentation only. Decide where the server checks session actor, tenant or workspace membership, resource ownership, action capability, and list/download/search scoping before creating APIs that accept resource ids from clients.
   - File uploads and downloads: decide whether files are product data or a tiny prototype shortcut. For product files, separate object storage bytes from database metadata, use upload states, inspect file type and size, avoid user-controlled storage paths, and issue private downloads through short-lived authorized URLs.
   - API response contracts: design product resources, stable public ids, status codes, pagination, safe error codes, and response mappers before returning raw database rows, ORM entities, internal storage keys, or component-shaped fields.
   - User state: keep likes, bookmarks, comments, reads, reports, notifications, follows, saved searches, hidden items, anonymous identity, and account-merge behavior separate from canonical content and from cached aggregates.
   - Core versus auxiliary path: decide which operations must complete inside the user request and which should become events, jobs, queues, indexes, reports, or rebuildable projections. Do not let analytics, email, AI, search, statistics, or cache refresh failure block core writes unless that dependency is truly part of the product guarantee.
   - HTTP-to-worker boundary: for slow or externally dependent work, prefer request validation, authorization, idempotency check, durable state or job creation, outbox recording, and a queued or processing response. Workers should execute email, AI, embeddings, imports, exports, webhooks, statistics, and other side effects with retry, deduplication, and status transitions.
   - Retry and provider uncertainty: decide where request idempotency, job deduplication, provider idempotency keys, processed webhook event ids, unknown provider outcomes, reconciliation, and dead-letter handling live before calling external services that can charge money, send messages, consume AI budget, or change rights.
   - AI cost control: decide whether AI calls are routed through one internal client or gateway that records account, user, feature, model, token usage, cache-hit type, provider call, retry grouping, pricing snapshot, integer cost, and plan-limit outcome.
   - Operational versus analytics data: keep the current service state separate from future analysis events and aggregates. Avoid designing operational tables as the long-term home for high-volume page views, clicks, searches, scrolls, impressions, experiments, and dashboard scans.
   - Cache role: decide whether cache contents are disposable derived data or a real state store. If clearing Redis or another cache would erase service state, design it as storage with backup, high availability, key policy, memory policy, and recovery expectations instead of calling it a cache.
   - API boundary: decide public, admin, mobile, integration, and internal response models as product contracts instead of returning database rows or ORM entities directly.
   - Recovery and restore: decide what must be restorable beyond the primary database, such as uploaded files, secrets and environment configuration, migration history, queue state, external service settings, operator accounts, and any cache used as storage.
   - Tool and platform exit: decide whether a future migration needs semantic export and import, not just CSV. Preserve relationships, permissions, files, comments, versions, state history, automations, external integration mappings, schemas, and restore procedures when those define the product state.
   - Self-hosting and replacement path: treat self-hosting as a negotiation and recovery option. Check license, deploy method, database schema, migrations, authentication, file storage, observability, backup and restore, support, and cloud versus self-host feature gaps before relying on a platform as core infrastructure.
   - Deployment-state reproducibility: keep operating state reproducible from code and docs, not only dashboard memory. Environment variable schemas, secret names, domain and DNS records, cron schedules, runtime versions, storage, queues, workers, observability, and rollback steps need an owner when they affect production.
   - Observability identity flow: design request and trace propagation across HTTP, frontend, API, database, queues, workers, cron, and webhooks before choosing a logging or tracing vendor. Dashboards can be rebuilt; broken identifier flow usually cannot be recovered from old logs.
   - Development and production parity: decide which production differences must be represented locally and which require staging. SQLite versus PostgreSQL, HTTP versus HTTPS, local disk versus object storage, single process versus many servers, cron, webhooks, caches, timeouts, edge runtimes, and timezones are structural differences, not cosmetic ones.
   - Failure radius: decide timeout, retry, circuit-breaker, feature-flag, stale fallback, degraded mode, and resource-pool boundaries so one auxiliary dependency does not make unrelated core functions fail.
   - Operations: decide status workflow, ownership, created/updated actors, permissions, audit logs, preview needs, admin filters, analytics event identity, privacy, deletion, anonymization, retention, backup, and migration expectations before adding user or content data.
   - Interaction and monetization: decide whether accounts, anonymous identity linking, comments, moderation, reports, notifications, newsletter sends, paywalls, access levels, plans, and previews require data fields now even when the UI is deferred.
4. Classify each decision:
   - Blocking: the answer can change the basic structure and cannot be safely assumed.
   - Structure-impacting: the answer changes boundaries, but a conservative default can be stated if the user does not answer.
   - Preference: the answer affects styling, wording, or minor details and should not block structure.
5. Ask only questions whose answers can change the design. Each question must include the decision,
   why it matters, the recommended default, and how at least one alternative changes the implementation.
   Do not ask about facts that current files, docs, tests, schemas, or conventions can answer.
6. Ask at most five high-value questions before coding. Prioritize localization, authentication, authorization, payments, ads, personal data, destructive data actions, admin workflows, SEO, content storage, external service replacement, failure policy, operational recovery, and verification proof.
7. For any question not asked, state the default assumption briefly. Defaults should keep future changes possible without adding speculative layers.
   For a content or data-product default, prefer:
   - Stable internal ids plus mutable slugs.
   - Explicit lifecycle states and delete alternatives, such as archive, private, redirect, gone, and soft delete, before adding a destructive remove path.
   - Structured content blocks with schema versions when the body contains reusable semantic units; simple Markdown remains acceptable for prose-only sites.
   - Typed fields for values likely to be filtered, sorted, aggregated, localized, or verified.
   - Separate public, admin, API, search, and analytics projections over one screen-shaped record.
   - Revision/fact/source placeholders when the domain includes prices, legal requirements, product specs, AI model data, ratings, availability, or other changing facts.
   - Central policy, legal, price, or fact references with impact lookup when changing a claim should reveal every affected page before publication.
   - Hybrid rendering: static or incrementally regenerated content for stable public pages, API or server-rendered fragments for volatile facts and user-specific data, and explicit cache invalidation dependencies.
   - Hybrid storage for multi-site or fact-heavy products: keep long-form body in an editor-friendly document when useful, but keep identity, state, relationships, facts, site exposure, permissions, analytics, and verification data queryable and typed.
   - Reuse by reference, not copy, when the same content may appear in many sites or products.
   - Typed content relationships over generic `related_items` arrays when relationships affect navigation, recommendations, comparison pages, series order, update chains, or internal links.
   - Intentional content graph fields for topic hubs, series, prerequisites, replacements, canonical versions, and next actions before relying on later recommendation logic.
   - Controlled taxonomy with aliases and merge history over free-form tags when tags influence search, filters, topic pages, recommendations, analytics, or SEO.
   - Asset records with immutable originals, rebuildable variants, alt text, license, credit, focal point, and usage references before storing only inline URLs.
   - Raw collection records, source checks, verification records, and canonical display records as separate responsibilities when the product collects external data.
   - Separate user-state records and cached aggregates when reactions, comments, bookmarks, reports, reads, or personalization may exist.
   - Normalized filter state as the source for shareable URLs, analytics dimensions, and cache keys; promote only high-value combinations into curated SEO landing pages.
   - Admin operations with audit and rollback or preview paths for high-impact content, SEO, redirect, filter, ad, cache, search, ranking, and permission changes.
   - Human review gates for high-risk policy, legal, health, finance, privacy, comparison, affiliate, and bulk content changes; automation may find candidates and impact scope, but should not silently publish high-risk rewrites.
   - Cache tags and dependency records for public pages, lists, search indexes, sitemaps, feeds, ranking snapshots, and API projections that need selective invalidation.
   - A bounded modular monolith before distributed services: keep one codebase or one server when that is simpler, but preserve module, data, and failure boundaries so later separation does not require reinterpreting every request path.
   - Simple deployment with strict internal boundaries before platform complexity: for small teams, prefer one larger server or a small server set plus managed data stores when that is enough, but keep web request handling, worker processing, persistence, object storage, and external calls separable from the start.
   - Fail closed for authentication, authorization, payment, entitlement, and destructive admin decisions; degrade or defer search assistance, recommendations, statistics, analytics, email, AI summaries, and other auxiliary outputs when they are not required for the core state change.
   - Separate urgent queues or worker capacity for payment, webhook, email, AI, embedding, analytics, and dead-letter work when one delayed dependency could starve another.
   - SQLite plus explicit backup and restore can be a strong validation default for a single-server product; managed PostgreSQL can be the simpler operational default when backup, access tooling, concurrency, point-in-time restore, and external operator access are already required.
   - Stateless app servers by default: keep the server replaceable by storing durable state in the database, object storage, queue, Redis or another intentionally operated runtime store, and treat any Redis value that cannot be flushed as storage with matching recovery expectations.
   - Web and worker separation by contract, not necessarily by host: the web process may share a machine with workers early on, but HTTP handlers should accept or validate work, call use cases, and return state while workers own email, payment follow-up, file conversion, AI, search indexing, imports, exports, and retries.
   - AI provider usage as a ledger: record AI cost-causing actions per request and provider call before building summaries. Free or unlimited AI paths need request, token, model, and cost limits from the start.
   - Pricing structure as two linked models: expose a simple value unit such as seat, workspace, plan, project, document, or transaction when it matches customer value, but internally meter cost units such as AI tokens, search requests, file bytes, transformations, automation runs, events, bandwidth, queue work, and support load.
   - Hybrid billing by default for cost-bearing products: base plan or seat/workspace fee plus included limits, shared tenant credits or quotas for high-cost features, and explicit overuse behavior such as hard stop, rate limit, credit purchase, or upgrade prompt. Avoid "unlimited" for AI, media conversion, file storage, download traffic, search, automation, webhooks, realtime connections, or log retention unless fair-use and enforcement exist.
   - Free-plan loss budget: decide how much storage, AI, search, automation, file size, traffic, and retention a free account can consume before the product attracts users whose cost grows without revenue.
   - Heavy-user shape: design tenant and feature metering so P50, P90, and P99 customers can be compared against contribution margin. Do not rely only on average usage when a small number of users can dominate AI, file, search, or automation cost.
   - Exit-friendly vendor defaults: keep stable internal ids and store external provider ids as mappings; keep business rules outside closed SaaS automations; document export/import or restore gaps early; and prefer pricing units that grow in the same direction as the product's revenue.
   - Repository-owned delivery defaults: use managed deploy platforms when useful, but keep build, test, migration, deployment handoff, health-check, environment, domain, cron, and rollback knowledge reconstructable from repository contracts and operations notes. A dashboard button may execute the process; it should not be the only place the process is defined.
   - Technology-risk placement: choose boring, well-supported dependencies for authentication, payment, database, migration, authorization, security, and core deployment paths. Put experimental technology in differentiating product surfaces and isolate it behind boundaries so failure does not threaten core state.
   - Runtime-portable core defaults: keep core and application code free of framework, ORM, runtime, and platform imports. Put server actions, route handlers, edge functions, Hono or Web API adapters, cookies, redirects, cache invalidation, raw database clients, object storage clients, queues, and provider SDKs in delivery or infrastructure layers.
   - Framework convenience boundaries: use server actions, route handlers, ORM relation helpers, and framework caches as delivery or persistence conveniences, not as the home for pricing, permissions, entitlement decisions, payment state transitions, idempotency, or durable business facts.
   - Maintainer-risk boundary: small libraries are acceptable when they are pure, peripheral, replaceable, understandable, and safe to fork or reimplement. Treat single-maintainer dependencies on money, identity, permissions, durable data, cryptography, migration, queueing, or file ownership as structural risk.
   - Core-state ownership defaults: external services may process payments, send email, host files, search documents, visualize analytics, or run automations, but the product should still explain who the customer is, what they can access, what they paid for, which files and content they own, which important events were processed, and which operator changed high-impact state.
   - Borrowed operations, owned contracts: managed services may run infrastructure, but the product should own user-visible contracts, data meaning, identifiers, permission decisions, public URLs, internal event names, and entitlement state.
   - Managed database defaults: keep core tables understandable without provider-only concepts; document extensions and provider features by purpose; keep console-created schemas, indexes, policies, and functions in migrations; treat provider auth functions, generated APIs, and row-level policies as explicit dependencies rather than invisible portability.
   - Authentication identity defaults: use an app-owned user id as the stable product identity; store external provider subjects and emails as identity mappings; keep memberships, roles, permissions, and entitlement decisions in product-owned data; normalize token shapes into an internal current-user context before application code sees them.
   - Public URL defaults: expose file and image URLs through application-owned domains or routes; store object keys and providers as internal metadata; use immutable variant names for derived images; issue private downloads through an authorized short-lived URL boundary.
   - Data location defaults: do not start with full multi-region complexity, but classify sensitive, personal, usage, and public data; record where primary data, backups, logs, analytics, AI processing, support access, and payment or tax data live when those facts can affect sales, privacy, or regulation.
   - AI gateway defaults: route cost-bearing AI through one internal boundary that applies feature, tenant, token, model, retry, tool-call, agent-step, and budget limits before provider calls; treat provider console budgets as secondary alarms unless they are proven hard stops.
   - Tool-exit note: for each core external tool, record its role, data stored there, internal core state copy, data to move when leaving, derived data safe to skip, outage impact, replacement candidates, migration effort across data/code/operations, current adoption reason, and likely regret source.
   - Search portability: treat the index as rebuildable derived data, keep the search document generator and ranking policy in code or versioned configuration, and keep representative queries or expected results when search quality matters.
   - Queue portability: define the job contract before the queue product contract. Use a versioned envelope with job id, job type, schema version, idempotency key, creation time, run-after time, attempt, trace or request context, and payload reference when work must survive retries or queue replacement.
   - Operational data portability: keep critical product, billing, permission, file, search, job, webhook, and security events in an internal store or exportable stream before relying on analytics or logging SaaS as the only historical record.
   - Operations-as-code-lite before infrastructure-as-code: even without Terraform or OpenTofu, require an environment schema, secret inventory, domain notes, cron definitions, deployment steps, observability notes, and smoke-test expectations when the platform can become a hidden source of truth.
   - Domain-shaped API responses over screen-shaped payloads; screen-specific endpoints are acceptable when labeled internal and still expose resources, states, errors, and pagination rather than card titles, button text, or storage implementation details.
   Do not add full implementations of these surfaces unless the task needs them now.
8. Select structure patterns only when the task's risk shape requires them:
   - Use a plan/apply gate for destructive, bulk, migration, billing, permission, publishing, or external-send operations that need review before execution.
   - Use a capability object when a function should require a specific granted action instead of reading broad user or role state.
   - Use Result and Option values for expected business failures, meaningful absence, not found, invalid input, denied access, stale state, or blocked policy. Use `result-option` before editing that return-shape contract.
   - Use a Null Object only when an optional collaborator can safely implement the same interface with honest neutral behavior and the caller should not branch on presence. Use `null-object-pattern` before editing that optional dependency boundary.
   - Use a command pattern when a state-changing user or system intent needs explicit payload, context, authorization, transaction, idempotency, outbox, audit, retry, concurrency, or queue and worker reuse. Use `command-pattern` before editing that execution unit.
   - Use a facade pattern when controllers, handlers, workers, command handlers, services, or UI events need one stable high-level entry point over a repeated multi-step subsystem workflow. Use `facade-pattern` before editing that entry point.
   - Use invariant policy modules when a state change must preserve non-negotiable rules, such as last-owner, paid-order, refund, or entitlement constraints.
   - Use a state machine when status, state, phase, step, or stage controls allowed events, terminal states, guards, effects, transition history, duplicate-event handling, or concurrency. Use `state-machine-pattern` before editing that lifecycle.
   - Use a strategy pattern when several algorithms, policies, calculations, provider choices, feature-flag variants, or scoring methods share one purpose and should not keep branching inside the stable workflow. Use `strategy-pattern` before editing that strategy family.
   - Use pure core with an imperative shell when business decisions, validation, authorization, pricing, eligibility, state transitions, domain events, or effect descriptions would otherwise be mixed with I/O, clocks, generated identifiers, randomness, environment reads, or framework objects.
   - Use composition over inheritance when behavior varies by multiple dimensions, class inheritance is proposed for implementation reuse, or framework subclasses could stay thin by delegating to explicit collaborators.
   - Use dependency injection when core logic would otherwise construct, import, resolve, or hide databases, SDKs, clocks, random generators, configuration, loggers, framework objects, filesystems, queues, AI clients, payment gateways, or email senders.
   - Use an adapter boundary when external APIs, databases, model responses, webhooks, files, queues, caches, framework objects, or command output cross into internal logic or leave it.
   - Use `database-change-safety` when stable identity, slugs, taxonomy, typed attributes, revisions, facts, source records, API projections, pagination, deletion policy, or page-dependency data will be persisted or queried.
   - Use `migration-safety-check` when an early shortcut would force later URL rewrites, content backfills, slug migrations, locale table splits, metadata extraction, cache rebuilds, or schema/data conversions.
   - Inject time or a time context when expiration, scheduling, retries, leases, or rate windows affect behavior.
   - Use explicit state transitions when three or more states have meaningful allowed moves.
   - Use an action ledger or idempotency key when repeating a side effect would be harmful.
9. Prefer the smallest local version of the selected pattern. Do not add a framework, base class, service locator, global event bus, broad repository layer, or abstract factory when a plain function, table, adapter, or narrow policy object is enough.
10. Separate product domains from vendor implementations. Use broad names at the product boundary and specific names inside provider or adapter internals.
   - Prefer `monetization/ads/providers/adsense` over top-level `adsense`.
   - Prefer `payments/providers/stripe` over top-level `stripe`.
   - Prefer `notifications/email/providers/resend` over top-level `resend`.
   - Prefer `analytics/providers/google-analytics` over top-level `googleAnalytics`.
11. Propose the smallest folder and file structure that follows the answers and assumptions. For each new file or folder, state its responsibility and what it must not contain.
12. Check the structure against local precedent with `pattern-scout` when the repository already has a nearby pattern.
13. If the selected structure changes expected failure, meaningful absence, thrown business errors, null returns, or public error mapping, use `result-option` before editing that scope.
14. If the selected structure creates or repairs a state-changing execution unit, use `command-pattern` before editing that scope.
15. If the selected structure introduces or repairs lifecycle state transitions, use `state-machine-pattern` before editing that scope.
16. If the selected structure introduces interchangeable algorithms, policies, calculations, provider choices, or feature-flag variants, use `strategy-pattern` before editing that scope.
17. If the selected structure introduces one high-level entry point over several subsystem collaborators, use `facade-pattern` before editing that scope.
18. If the selected structure separates business decisions from execution, use `pure-core-imperative-shell` before editing that scope.
19. If the selected structure introduces inheritance, base classes, protected state, or subclass variants, use `composition-over-inheritance` before editing that scope.
20. If the selected structure introduces or repairs an external dependency boundary, use `dependency-injection` for construction and collaborator flow, and `adapter-boundary` for external data, protocol, error, timeout, retry, idempotency, security, and observability handling.
21. Implement only after the questions, assumptions, structure, dependency direction, and verification surface are clear enough for the task size.

<!-- mustflow-section: postconditions -->
## Postconditions

- The final structure follows an explicit set of answers or assumptions.
- Top-level names reflect product responsibilities rather than replaceable vendor names unless the vendor is the product itself.
- New folders and files have clear responsibilities, non-responsibilities, and dependency direction.
- Content, data, API, rendering, and infrastructure choices either support future extension without re-dissecting existing records or are explicitly scoped as a short-lived prototype.
- Lifecycle, asset, claim, comparison, data-ownership, and content-graph decisions are either modeled now or explicitly deferred with migration risk.
- Core request paths, auxiliary systems, analytics stores, cache roles, API contracts, restore surfaces, and failure-isolation assumptions are either modeled now or explicitly deferred with operational risk.
- HTTP acceptance, worker handoff, outbox, idempotency, retry, dead-letter, and provider-reconciliation assumptions are either modeled now or explicitly deferred with reliability risk.
- Global-ready time, money, locale, country, currency, timezone, local-date, historical price, exchange-rate, and AI-pricing assumptions are either modeled now or explicitly deferred with data-recovery risk.
- Multi-server state ownership and AI cost-tracking assumptions are either modeled now or explicitly deferred with operational or margin risk.
- Vendor exit, semantic export or import, self-hosting or replacement, deployment-state reproduction, observability identifier flow, and dev/prod parity assumptions are either modeled now or explicitly deferred with lock-in or operational recovery risk.
- Pricing value units, internal cost units, free-plan loss budget, tenant limits, credit or quota policies, and heavy-user margin assumptions are either modeled now or explicitly deferred with margin risk.
- CI/CD reproducibility, environment validation, dashboard-only deployment settings, and rollback assumptions are either modeled now or explicitly deferred with operational recovery risk.
- New technology, ecosystem maturity, maintainer concentration, and critical-path dependency placement are either modeled now or explicitly deferred with maintainability or recovery risk.
- External-service truth ownership, internal identifier ownership, managed-database dependency, public URL ownership, data location policy, search ranking reproducibility, queue message and failure policy, and log or analytics event ownership are either modeled now or explicitly deferred with lock-in, support, privacy, or incident-reconstruction risk.
- Runtime patchability and AI cost stoppability are either modeled now or explicitly deferred with security, regulatory, or margin risk.
- Vertical-to-horizontal growth, web/worker separation, runtime portability, and framework-magic boundaries are either modeled now or explicitly deferred with operational recovery risk.
- Any skipped question, deferred decision, or intentionally narrow assumption is reported.

<!-- mustflow-section: verification -->
## Verification

Use configured oneshot command intents when available:

- `changes_status`
- `changes_diff_summary`
- `docs_validate_fast`
- `test_release`
- `mustflow_check`

Also run narrower configured tests or builds required by the changed source, template, documentation, or public contract.

<!-- mustflow-section: failure-handling -->
## Failure Handling

- If too many structural unknowns remain, ask only the highest-impact blocking questions and report the assumptions that are unsafe to make.
- If the user does not answer non-blocking questions, proceed with conservative defaults and keep the first implementation small.
- If a vendor name has already leaked into broad public structure, either localize it inside a provider or report why renaming is out of scope.
- If a proposed abstraction has only one known use and no likely replacement pressure, keep it close to the feature instead of moving it to shared code.
- If this skill overlaps with `codebase-orientation`, use orientation to map the existing area first, then return to this skill for the structure decision.

<!-- mustflow-section: output-format -->
## Output Format

- Design gate classification and reason
- Restated requirement in four sentences or fewer
- Capability or responsibility being built
- Blocking questions asked, or none
- Recommended defaults and tradeoffs for each blocking question
- Success criteria, non-goals, and compatibility boundaries
- Structure-impacting assumptions
- Proposed files and responsibilities
- Upfront structure decisions versus deferred features
- Borrowed service responsibilities versus product-owned contracts when relevant
- Dependency direction
- Structural patterns selected or intentionally skipped
- Local pattern used or reason no pattern applies
- Command intents run
- Skipped checks and remaining structure risk
