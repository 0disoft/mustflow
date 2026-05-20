---
mustflow_doc: skill.performance-budget-check
locale: en
canonical: true
revision: 12
lifecycle: mustflow-owned
authority: procedure
name: performance-budget-check
description: Apply this skill when performance budgets, query-count budgets, N+1 risk, read/write workload shape, database concurrency pressure, app-server scaling, vertical versus horizontal scaling, process count, connection-pool pressure, read-model cost, operational database reporting load, analytics-query isolation, cache strategy, cache keys, cache invalidation, cache stampede, hot keys, stale fallback, ranking snapshots, search API cost, search index rebuild cost, search quality regression set, file upload bandwidth, external-dependency timeout cost, retry storms, worker queue starvation, provider rate limits, queue backlog or dead-letter growth, pricing-growth cost, vendor free-tier limits, value-pricing units, internal cost units, tenant usage limits, user-action fan-out, contribution margin, P50/P90/P99 heavy-user costs, AI usage cost budgets, AI gateway hard limits, provider budget guardrails, agent loop caps, model-call retries, token-cost tracking, bundle size, page weight, startup time, command duration, memory use, asset size, throughput, latency, benchmark output, or performance claims are planned, edited, reviewed, or reported.
metadata:
  mustflow_schema: "1"
  mustflow_kind: procedure
  pack_id: mustflow.core
  skill_id: mustflow.core.performance-budget-check
  command_intents:
    - changes_status
    - changes_diff_summary
    - build
    - test_related
    - docs_validate_fast
    - test_release
    - mustflow_check
---

# Performance Budget Check

<!-- mustflow-section: purpose -->
## Purpose

Keep performance claims and budgets tied to declared thresholds, reproducible measurements, and explicit tradeoffs instead of guessing from local impressions.

<!-- mustflow-section: use-when -->
## Use When

- A task changes or reports performance budgets, bundle size, page weight, startup time, command duration, memory use, asset size, throughput, latency, search index size, build time, or benchmark output.
- A change adds heavier dependencies, generated assets, static pages, search indexes, startup work, file scanning, command fan-out, or repeated process spawning.
- A change introduces or reports caching, cache-control headers, cache keys, cache tags, purge rules, stale fallback, precomputed ranking, search-result caching, faceted-filter caching, CDN caching, or private versus shared cache behavior.
- A list, feed, search, admin table, dashboard, or API response introduces relation loading, ORM includes, lazy loading, per-row counts, viewer-specific flags, aggregate counters, or read models that can hide N+1 queries or unbounded query cost.
- A behavior analytics, dashboard, reporting, search ranking, event log, or experiment analysis path may scan operational tables, consume the same connection pool as user requests, or run grouped aggregates on high-growth data.
- A database or storage choice is justified by "read-heavy", "write-heavy", "SQLite is enough", "PostgreSQL is safer", "cache it", "direct upload", or "local file upload" performance assumptions.
- A performance issue is framed as "scale up", "add servers", "move to serverless", "move to edge", "add workers", or "use a larger instance" before CPU, database, external dependency, regional latency, and process-state bottlenecks are separated.
- App servers may be multiplied and could increase database connections, queue load, retry volume, cron duplication, cache pressure, or external API calls instead of improving throughput.
- A file upload, download, resize, conversion, object-storage, CDN, or app-server streaming path could consume request time, memory, bandwidth, or worker capacity.
- A cache, queue, search service, analytics store, AI provider, email service, or other auxiliary dependency might cause core user requests to wait, retry, stampede, or fail.
- HTTP requests perform AI, email, embedding, statistics, webhook follow-up, import, export, file conversion, or other slow work inline instead of accepting work and handing it to a bounded worker path.
- A retry policy, worker pool, or provider integration can create retry storms, rate-limit feedback loops, dead-letter buildup, or queue starvation across unrelated work.
- Search ranking, query behavior, search index rebuild, queue partitioning, job retry policy, dead-letter retention, log volume, or analytics event volume may affect latency, worker capacity, provider cost, storage cost, or operational visibility.
- AI, embedding, reranking, image, audio, or tool-call features can create provider cost, token cost, retry cost, cache savings, rate-limit pressure, free-plan abuse, or worker starvation that needs a budget, usage ledger, or limit.
- AI requests need a gateway-level cost stop before provider calls, including estimated-cost checks, hard budget decisions, model downgrade rules, request-size caps, token caps, tool-call caps, agent-step caps, timeout caps, or an emergency disable switch.
- A third-party tool, hosted platform, analytics service, observability vendor, automation provider, database, file store, email provider, authentication provider, or AI provider has a free tier, seat price, API-call price, event price, storage price, bandwidth price, workspace price, audit-log price, export price, or usage limit that can become a product margin or growth bottleneck.
- A pricing or plan design must compare the value unit users understand with the cost units the system consumes, such as seats, workspaces, requests, storage, bandwidth, AI tokens, search queries, image conversions, automation runs, events, realtime connections, or support.
- A user action can fan out into several internal jobs such as thumbnail generation, OCR, AI summary, embeddings, search indexing, notifications, logs, analytics events, or webhook calls.
- Free, unlimited, or generous plan limits touch high-cost surfaces such as AI calls, media conversion, file storage, download traffic, search, automation, webhooks, realtime connections, or log retention.
- A margin claim depends on average customers but could be dominated by heavy users, high-volume tenants, or P90/P99 usage.
- A report claims that a path is faster, slower, lightweight, optimized, cached, parallelized, cheap, expensive, within budget, or over budget.
- A failure or slowdown suggests that measurement scope, command selection, concurrency, caching, or generated output size needs review.

<!-- mustflow-section: do-not-use-when -->
## Do Not Use When

- The task only changes wording and does not make a performance or size claim.
- The number is only a local fixture or example with no budget or public reporting meaning.
- The change is only image asset conversion; use `web-asset-optimization` for that asset pipeline and this skill only for budget reporting.

<!-- mustflow-section: required-inputs -->
## Required Inputs

- The performance surface, such as command, page, asset, bundle, startup path, query, build, or generated output.
- The budget source, if one exists: repository config, documented threshold, user-provided limit, benchmark baseline, package metadata, or current command result.
- Measurement method, environment boundary, warm or cold run expectation, and whether the result is deterministic, sampled, local-only, or approximate.
- Cache layer, cache key source, cache version, TTL or freshness rule, invalidation trigger, stale fallback, private or no-store boundary, and rebuild source when a cache or precomputed read model is involved.
- Cache failure behavior, hot-key risk, stampede risk, TTL jitter or lock strategy, cache flush tolerance, and whether the cache is disposable or runtime storage.
- Expected query count, row count, relation loading shape, aggregate strategy, read-model owner, and whether the measurement can detect query growth when a database-backed read path is involved.
- Read/write workload profile, including repeated reads, freshness requirement, write bursts, same-row contention, index maintenance cost, ledger or audit write amplification, and whether a read projection can replace per-request calculation.
- Operational database versus analytics or reporting boundary, including read replica, precomputed aggregate, queue, event store, separate connection pool, or external analytics system when available.
- Timeout, retry, circuit-breaker, stale-response, feature-flag, and degraded-mode policy when an auxiliary dependency can affect the critical path.
- Worker and provider capacity boundary, including queue separation, concurrency limits, retry delay, backoff with jitter, circuit-breaker threshold, dead-letter behavior, and whether one provider can consume shared worker or database resources.
- Scaling boundary, including current process count, CPU and memory pressure, connection-pool limits, database maximum connections, serverless or edge timeout limits, worker concurrency, cron ownership, and whether adding app servers would increase pressure on the real bottleneck.
- Search capacity and quality boundary, including index rebuild time, partial reindex trigger, query log volume, ranking snapshot cost, representative query set, and whether relevance changes are measured or only observed anecdotally.
- Log and analytics volume boundary, including which events must be retained internally, which can be sampled or dropped, retention window, storage cost, and whether analysis scans are isolated from core user requests.
- AI cost boundary, including feature key, account or workspace scope, request count, input and output token limits, cached-input treatment, provider price snapshot, retry grouping, cache-hit type, model tier, plan limit, and whether failed or cancelled provider calls can still cost money.
- AI gateway boundary, including preflight estimated cost, hard limit decision, remaining budget, model downgrade, feature policy, provider budget role, maximum tool calls, maximum agent steps, maximum total tokens, timeout, and emergency kill switch.
- Vendor cost boundary, including whether cost grows by users, seats, workspaces, API calls, events, storage, bandwidth, active users, projects, advanced permissions, audit logs, exports, AI tokens, or support tier, and whether that growth follows the product's revenue model.
- Pricing and margin boundary, including the user-facing value unit, internal cost unit, included quota or credit pool, overuse policy, tenant-level limit, free-plan maximum loss, and customer contribution margin formula.
- Usage metering boundary, including workspace or organization id, user id, feature key, request type, input size, output size, processing time, external API usage, retries, failures, plan, and whether one user action can create multiple billable or cost-bearing internal operations.
- Heavy-user boundary, including P50, P90, and P99 customer cost, whether a few users can dominate provider or infrastructure bills, and which high-cost actions require hard limits instead of only reporting.
- Free-to-paid transition boundary, including which operationally required features are outside the free tier, what usage cliffs exist, and whether growth creates a gradual cost curve or a sudden platform migration or plan upgrade.
- Relevant command-intent contract entries for status, diff, build, tests, docs, release, or mustflow validation.

<!-- mustflow-section: preconditions -->
## Preconditions

- The task matches the Use When conditions and does not match the Do Not Use When exclusions.
- Required inputs are available, or missing inputs can be reported without guessing.
- Higher-priority instructions and `.mustflow/config/commands.toml` have been checked for the current scope.

<!-- mustflow-section: allowed-edits -->
## Allowed Edits

- Add or tighten budget checks, measurement notes, thresholds, cache boundaries, dependency tradeoff notes, tests, docs, and reports tied to the changed performance surface.
- Replace vague claims such as "fast" or "lightweight" with measured, bounded, or explicitly unverified wording.
- Prefer existing configured command intents and repository-local measurement paths before adding new tools.
- Do not invent thresholds, benchmark numbers, hardware assumptions, network conditions, or release-blocking budgets without a source of truth.

<!-- mustflow-section: procedure -->
## Procedure

1. Identify the performance surface and whether the task affects runtime, build time, test time, docs generation, asset weight, package size, or user-facing load behavior.
2. Find the budget source before changing thresholds or claims. If no budget exists, report that the work is budget-discovery or measurement-only.
3. Check nearby code, docs, templates, tests, and command metadata for duplicated performance statements or stale thresholds.
4. Classify the measurement as deterministic, sampled, local-only, externally dependent, or unmeasured.
5. If the change adds dependencies, generated output, or repeated work, identify the likely cost path and whether an existing alternative is available.
6. For database-backed lists, feeds, search, dashboards, or admin tables, define the intended query shape before accepting a performance claim.
   - Count queries separately from returned rows when the local tooling supports it.
   - Watch for per-row author, tag, attachment, permission, count, reaction, bookmark, or viewer-state lookups.
   - Prefer joins for small required one-to-one data, batch queries for one-to-many data, aggregate or cached counters for counts, and read models or projections for complex feeds.
   - Treat ORM lazy loading as a performance risk until the query count is bounded or measured.
   - Treat repeated `GROUP BY`, `COUNT`, `SUM`, large date windows, free-form filtering, and dashboard scans on high-growth tables as reporting load. Prefer precomputed aggregates, read replicas, analytics stores, or bounded query windows over user-request database resources.
   - Protect core user requests from analytics or reporting load with separate connection pools, read-only replicas, queued jobs, cached summaries, or explicit rate limits when the architecture has those tools.
7. For read-heavy and write-heavy workload claims, check the ordering of mitigations before accepting the design.
   - For read-heavy paths, first stabilize query patterns, then indexes, then precomputed read tables or projections, then caches, then replicas or separate search engines. Do not add cache first when invalidation is unclear.
   - For write-heavy paths, account for index write cost, audit-log amplification, ledger writes, lock contention, hot counters, same-row balance or inventory updates, and retry or idempotency overhead.
   - Treat current-value fields such as balances, counts, or rankings as derived when a ledger, event, or snapshot is the real evidence source.
8. For caching work, classify the cache layer: browser, CDN, server response, query-result cache, search index, precomputed ranking or statistics, generated page, or generated API projection.
9. Check whether the cache key comes from normalized input rather than raw URL order, casing, default values, arbitrary range values, or temporary UI state. Include a cache version when the response shape, filter logic, ranking formula, or visibility rule can change.
10. Check invalidation before accepting a cache: name the source data, affected cache tags or dependencies, purge trigger, rebuild source, stale-response behavior, and whether failures degrade safely.
   - Ask whether the cache can be flushed. If flushing only increases latency, report it as cache; if it destroys sessions, queues, locks, rate-limit state, user state, or permissions, report it as runtime storage and require a different durability budget.
   - Check hot keys such as global home feeds, popular lists, pricing data, and common search terms. Report sharding, replication, request coalescing, local memoization, or CDN strategy when one key can receive disproportionate traffic.
   - Check stampede behavior. Prefer TTL jitter, single-flight refresh, stale-while-revalidate, background refresh, or prewarming over letting simultaneous misses hit the origin together.
11. For ranking, trending, search, and faceted-list APIs, prefer precomputed snapshots, generated indexes, or bounded caches over per-request full aggregation when traffic can spike.
12. For file upload and download paths, identify whether the app server handles raw bytes or only issues signed object-storage URLs.
   - Large uploads, image processing, document conversion, video conversion, and archive extraction should not monopolize request memory or bandwidth when they can be direct-to-storage or worker-driven.
   - Treat app-local file serving as a scalability and failure-isolation risk once user files are a product feature, especially with multiple servers, redeploys, or CDN needs.
13. Ensure admin, private, authenticated, or personalized responses use no shared cache. Require `no-store` or private-cache behavior where leaking data would be worse than serving slower responses.
14. For external or auxiliary dependencies on a critical path, check timeout, retry, backoff, circuit-breaker, fallback, and feature-flag behavior. A slow AI, search, analytics, email, or statistics dependency should not consume the whole request budget unless the user-visible operation truly depends on it.
15. For scaling choices, locate the bottleneck before accepting the mitigation.
   - If CPU is the bottleneck, consider a larger instance, more processes, worker processes, or worker threads for CPU-heavy work before distributing state across many app hosts.
   - If the database is the bottleneck, check query shape, indexes, slow queries, transaction length, connection pooling, and N+1 behavior before adding app servers that may exhaust connections faster.
   - If an external API is the bottleneck, use queueing, timeout budgets, limited retries, circuit breakers, degraded behavior, and rate limits rather than letting user requests wait indefinitely.
   - If regional latency is the bottleneck, consider edge or regional routing only for short, independent paths. Do not move database-write-heavy or dependency-heavy business logic to edge runtime only because the edge is faster for simple responses.
   - Treat serverless and edge scaling as capacity tools with their own limits: cold starts, timeouts, connection reuse, provider compatibility, bundle size, and cost cliffs still need budgets.
16. For worker and retry paths, check whether retryable work is bounded.
   - Prefer accepting work quickly, persisting a job or outbox record, and returning a queued or processing status over making HTTP wait for slow external completion.
   - Use backoff with jitter so many failing jobs or clients do not retry at the same time.
   - Separate queues, worker pools, rate limits, or concurrency budgets when AI, email, analytics, embeddings, webhooks, billing, and imports have different urgency or failure policies.
   - Report dead-letter growth, retry exhaustion, provider rate limits, and unknown provider outcomes as capacity and reliability risks, not just error-handling details.
   - Check that queues with different urgency do not share an unbounded worker pool when one backlog can delay payments, entitlement grants, password resets, webhook processing, or other critical work.
   - Treat manual replay and dead-letter review as operational capacity. A dead-letter queue that no one watches is a delayed outage, not a solved failure.
17. For search and analytics volume, check whether derived systems can be rebuilt and observed without overwhelming the core path.
   - Search indexes should be rebuildable from source records, and full or partial reindex cost should be bounded before relying on provider search as the only serving path.
   - Search relevance claims should cite a representative query set, expected top results, or explicit unmeasured status instead of relying on a dashboard impression.
   - Logs and analytics events should not grow without retention, sampling, aggregation, export, or cold-storage policy when storage, query, or SaaS event pricing can become the bottleneck.
18. For AI cost and provider-usage budgets, treat cost as a first-class performance and product limit.
   - Do not rely on provider dashboards as the only source for user, workspace, feature, model, cache, retry, or plan-level cost decisions.
   - Prefer a single AI call boundary that records request-level usage before cost is summarized. Scattered direct SDK calls hide feature economics and retry amplification.
   - Track user request id separately from provider call id so one user action with retries, fallbacks, embeddings, tool calls, or evaluations can be costed without being counted as multiple user actions.
   - Store usage in integer cost units plus a pricing snapshot or version reference. Do not recompute historical costs from the current provider price sheet.
   - Distinguish app response cache, provider prompt cache, embedding cache, and search-result cache. A cache hit that avoids a provider call is not the same as a discounted provider input.
   - Apply preflight limits for plan, account, request length, model tier, monthly cost, request count, input tokens, and output tokens; record actual usage afterward and update rollups or limits.
   - Treat provider console budgets, account-level spend caps, and rate-limit headers as secondary guardrails unless they are proven hard stops. Product-owned limits should block, downgrade, queue, or reject high-cost work before the provider call.
   - For agentic or multi-call AI work, cap steps, tool calls, total tokens, total estimated cost, and total time. One visible user request can create many provider calls, so request-count limits alone are not enough.
   - Keep budget decisions inspectable. Record allow, block, downgrade, or emergency-disable decisions with safe identifiers, estimated cost, remaining budget, selected model, and blocked reason.
   - Include failed, timed-out, cancelled, and retried calls in the budget review when they may consume provider quota or money.
19. For vendor pricing and free-tier claims, compare the tool's pricing unit with the product's revenue unit.
   - Check whether the product earns by customer, workspace, seat, transaction, storage, content item, automation run, active user, or AI usage, then compare that with how the vendor charges.
   - Treat user-seat, monthly-active-user, API-call, event, storage, bandwidth, workspace, project, advanced-permission, audit-log, export, and overage pricing as structural risk when the product can grow in a different direction.
   - Identify operationally required features that are plan-gated, such as backups, audit logs, SSO, role management, webhooks, API limits, data export, retention, monitoring, or support. A generous free tier can still be risky when the paid cliff lands on a feature that is hard to replace later.
   - Report pricing cliffs and unverified provider terms as margin risk rather than performance risk alone. "Cheap now" is not evidence that the tool remains cheap at the product's next scale.
20. For pricing and internal metering claims, separate user-perceived value from system cost.
   - Identify the value unit: seat, workspace, project, document, transaction, plan, or another unit customers can understand.
   - Identify the cost units: storage, transfer, database usage, search, AI or external API calls, log or analytics volume, email or notification sends, automation runs, file conversions, queue work, payment fees, and support load.
   - Prefer simple external plans plus internal limits for cost-bearing resources. A seat or workspace plan can include storage, AI credits, search quotas, automation runs, and shared tenant pools without exposing every raw request count to the customer.
   - Treat "unlimited" as a claim that must have a natural human limit, fair-use policy, rate limit, abuse detection, or hard internal cap. Do not let unlimited AI, media conversion, storage, traffic, search, automation, realtime, webhook, or log retention become an unbounded liability.
   - Model contribution margin as customer revenue minus customer variable cost. Report which variable costs are included and which are unmeasured.
   - Compare P50, P90, and P99 users or tenants when possible. Averages can hide a small number of heavy users who destroy margin.
   - Meter by workspace or organization as well as user when team usage is pooled. Seat-level credits may be sold, but shared tenant pools often better match real usage.
21. For user-action fan-out, count internal work rather than only the visible request.
   - Name the jobs triggered by one action, such as uploads, transforms, OCR, AI calls, embeddings, search indexing, notification sends, event writes, log writes, analytics exports, and webhook deliveries.
   - Identify which fan-out work is synchronous, queued, retryable, deduplicated, rate-limited, or skipped under load.
   - Treat hidden retries, failed calls, and duplicate worker execution as cost multipliers when they consume provider quota or infrastructure.
22. Keep claims conservative: state the command, input scope, query-count boundary, cache boundary, worker boundary, search rebuild or quality boundary, log and analytics volume boundary, AI cost boundary, vendor cost boundary, pricing value/cost boundary, critical-path dependency boundary, and whether caching, warm runs, parallelism, stale responses, precomputed snapshots, generated files, queues, provider limits, pricing cliffs, user-action fan-out, or external services influenced the result.
23. If a budget is exceeded, report the affected surface, budget source, measured value or unavailable measurement, likely cause, and smallest follow-up.
24. Run the narrowest configured verification that proves the changed performance, package, docs, or mustflow surface.

<!-- mustflow-section: postconditions -->
## Postconditions

- Performance claims have a budget source, measurement method, or explicit unverified status.
- Database-backed read paths have an explicit query-count, row-count, relation-loading, or unmeasured-risk note when N+1 or aggregate cost is plausible.
- Read-heavy and write-heavy claims identify query patterns, indexes, projections, cache invalidation, write contention, audit or ledger amplification, and retry overhead before claiming a store or cache is sufficient.
- File upload and download paths identify app-server bandwidth, memory, conversion, object-storage, CDN, and worker boundaries when those costs are plausible.
- Cache behavior has an owner, key source, freshness rule, invalidation path, private/shared boundary, and rebuild or fallback story when cache is part of the claim.
- Analytics, dashboard, and reporting paths do not silently share unbounded operational query cost with core user requests, or the remaining risk is reported.
- Critical-path external dependencies have timeout, retry, fallback, feature-flag, or degraded-mode boundaries when performance or availability can affect core use.
- Vertical scaling, horizontal scaling, serverless, edge, worker, and process-count claims identify the actual bottleneck and the state, connection, cron, queue, or provider limits that could make the chosen scaling path worse.
- Worker queues, retry policies, provider rate limits, and dead-letter paths have capacity boundaries when auxiliary work can starve core flows.
- Search index rebuilds, search quality checks, log volume, analytics event volume, and queue dead-letter review have explicit measured or unmeasured status when they affect latency, cost, or operational visibility.
- AI usage and cost claims have request, provider-call, feature, model, cache, retry, pricing-snapshot, and plan-limit boundaries when model calls can affect cost or quota.
- AI gateway claims have preflight hard-limit, provider-budget, downgrade, agent-step, tool-call, timeout, and emergency-disable boundaries when autonomous or high-cost model work can affect margin.
- Vendor pricing, free-tier, plan-gated feature, and usage-growth claims are tied to the product's revenue unit or reported as unverified margin risk.
- Pricing claims separate customer-visible value units from internal cost units, and identify included limits, credit pools, overuse behavior, tenant-level controls, free-plan loss budget, and unverified margin risk.
- Usage-cost claims account for user-action fan-out, hidden retries, P50/P90/P99 heavy-user shape, and contribution margin when high-cost actions can dominate customer economics.
- Thresholds and benchmark-facing docs, tests, package metadata, generated output notes, and command contracts are synchronized where they overlap.
- Final reports separate measured evidence from estimates, local observations, and suggested follow-up work.

<!-- mustflow-section: verification -->
## Verification

Use configured oneshot command intents when available:

- `changes_status`
- `changes_diff_summary`
- `build`
- `test_related`
- `docs_validate_fast`
- `test_release`
- `mustflow_check`

Use a narrower configured benchmark, asset, build, docs, or test intent when it better proves the changed performance surface.

<!-- mustflow-section: failure-handling -->
## Failure Handling

- If no budget source exists, do not invent one. Report the missing source and keep the claim qualitative or measurement-only.
- If a measurement depends on local hardware, cache state, network, registry state, or generated output from a previous run, state that boundary.
- If verification is too slow or no configured command exists, report the missing or skipped intent instead of running an inferred command.
- If a performance fix conflicts with correctness, security, accessibility, or data safety, preserve the stricter correctness boundary and report the tradeoff.

<!-- mustflow-section: output-format -->
## Output Format

- Performance surface reviewed
- Budget source or missing budget
- Measurement method and boundary
- Query-count, N+1, read-model, and aggregate-cost boundary when relevant
- Operational versus analytics query boundary when relevant
- Cache layer, key, freshness, invalidation, hot-key, stampede, flush-tolerance, and private/shared boundary when relevant
- Critical-path external dependency timeout, retry, fallback, worker, queue, rate-limit, and dead-letter boundary when relevant
- Scaling bottleneck, process-count, database-connection, serverless, edge, worker, and cron-ownership boundary when relevant
- Search rebuild, search quality, log volume, analytics retention, queue backlog, and dead-letter review boundary when relevant
- AI usage, token, provider-call, model-tier, retry-cost, cache-hit, pricing-snapshot, and plan-limit boundary when relevant
- AI gateway hard limit, provider budget guardrail, model downgrade, agent loop, tool-call, timeout, and emergency kill-switch boundary when relevant
- Vendor pricing unit, customer value unit, internal cost unit, tenant limit, free-tier cliff, plan-gated operations feature, contribution-margin, P50/P90/P99 heavy-user, and revenue-alignment boundary when relevant
- User-action fan-out, hidden retry, and internal work amplification when relevant
- Thresholds, claims, or metadata synchronized
- Command intents run
- Skipped measurements and reasons
- Remaining performance risk
