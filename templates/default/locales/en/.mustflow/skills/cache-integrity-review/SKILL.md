---
mustflow_doc: skill.cache-integrity-review
locale: en
canonical: true
revision: 2
lifecycle: mustflow-owned
authority: procedure
name: cache-integrity-review
description: Apply this skill when code is created, changed, reviewed, or reported and cache behavior can spread stale, wrong, private, overbroad, tenant-crossing, permission-wrong, version-incompatible, or source-overloading values through cache keys, query normalization, key versions, TTL and jitter, soft and hard TTL, stale-while-revalidate, stampede protection, request coalescing, negative caching, invalidation order, list or page caches, tag invalidation, L1/L2 cache layers, Redis fallback, cache-status ledgers such as hit, miss, bypass, stale, refresh, error, set-failed, evicted, or expired, origin-cost observability, value size, eviction policy, TTL-less keys, KEYS/SCAN use, hot keys, Redis Cluster hash tags, replica lag, Redis latency, HTTP Vary/no-cache/no-store semantics, permission caches, cache warming, or failure-path cache tests.
metadata:
  mustflow_schema: "1"
  mustflow_kind: procedure
  pack_id: mustflow.core
  skill_id: mustflow.core.cache-integrity-review
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

# Cache Integrity Review

<!-- mustflow-section: purpose -->
## Purpose

Review cache changes as truth and failure-boundary changes, not only as speed changes.

A cache is a second truth store. The review question is not only "did the second request get faster?"
It is "which value can be wrong, who can see it, how long can it survive, how quietly can it spread,
and what happens to the source system when the cache misses or fails?"

<!-- mustflow-section: use-when -->
## Use When

- Code creates, changes, reviews, or reports cache keys, cache reads, cache writes, cache invalidation,
  cache TTLs, Redis or Memcached use, local in-memory caches, CDN or HTTP cache headers, cache tags,
  cache warming, cache fallback, negative caching, stale-while-revalidate, request coalescing, or
  cache observability.
- A route, worker, query, permission check, feature flag, entitlement, inventory value, search result,
  listing, feed, recommendation, API response, rendered page, generated artifact, or provider response
  is cached.
- Cache behavior can vary by tenant, actor, login state, membership tier, country, language, locale,
  A/B test, feature flag, adult verification, inventory policy, authorization, subscription, or
  request headers.
- A review or final report claims that caching is safe, fast, resilient, correct, isolated, warmed,
  invalidated, observable, or harmless under deploy, rollback, source failure, Redis failure, or
  concurrent updates.

<!-- mustflow-section: do-not-use-when -->
## Do Not Use When

- The only concern is ordinary repeated work with no stale data, authority, invalidation, permission,
  tenant, source-protection, or cache-failure risk; use `hot-path-performance-review`.
- The only concern is object lifetime, cache size, eviction cleanup, or retained memory without data
  correctness or source-protection risk; use `memory-lifetime-review`.
- The only concern is HTTP streaming, compression, proxy buffering, or delivery transport behavior;
  use `http-delivery-streaming` first and this skill only for cache reuse correctness.
- The task is a broad performance budget, profiling, benchmark, or load-test design; use
  `performance-budget-check` first and this skill for cache integrity boundaries.

<!-- mustflow-section: required-inputs -->
## Required Inputs

- Cache surface: local memory, process L1, external L2, Redis, Memcached, CDN, browser cache, HTTP
  cache, ORM query cache, generated state, read model, or framework cache.
- Source of truth: database, provider, file, auth service, entitlement system, inventory source,
  canonical event stream, generated artifact, or other owner.
- Cached value shape: detail item, list, page, search result, permission decision, session, rate
  limit, inventory, feature flag, API response, rendered HTML, or derived aggregate.
- Key dimensions: tenant, actor, viewer context, login state, membership tier, country, language,
  locale, A/B test, feature flag, adult verification, inventory policy, authorization state, headers,
  query parameters, schema version, and value version.
- Freshness contract: change frequency, stale tolerance, soft TTL, hard TTL, invalidation trigger,
  source protection need, and deploy or rollback compatibility.
- Failure and concurrency contract: miss behavior, concurrent miss behavior, source timeout, Redis
  failure, source failure, negative cache policy, update race behavior, invalidation ordering, and
  stale serve policy.
- Observability evidence: hit, miss, bypass, stale, refresh, negative-hit, set-failed, error,
  eviction, expiry, and fallback metrics; miss cost; hit-rate cost by endpoint or tenant; value
  size; key count; source query time; source call count; origin saturation; Redis client wait,
  round-trip latency, command latency, serialization cost, Slow Log limits, replica lag, shard
  imbalance, and set success.
- Relevant command-intent contract entries for tests, builds, docs, release checks, and mustflow
  validation.

<!-- mustflow-section: preconditions -->
## Preconditions

- The task matches the Use When conditions and does not match the Do Not Use When exclusions.
- Higher-priority instructions and `.mustflow/config/commands.toml` have been checked for the current
  scope.
- Required inputs are available, or missing cache authority, key, TTL, invalidation, fallback,
  observability, or test evidence can be reported without guessing.
- If cache behavior affects authentication, authorization, personal data, tenant separation, sessions,
  entitlement, payment, inventory, or admin operations, also use the relevant security, auth, backend,
  database, or failure-integrity skill.

<!-- mustflow-section: allowed-edits -->
## Allowed Edits

- Add or tighten cache key construction, query normalization, key versioning, TTL and jitter,
  soft/hard TTL handling, stale-while-revalidate, request coalescing, singleflight, bounded fallback,
  load shedding, negative-cache policy, invalidation ordering, version checks, tag invalidation,
  cache warming, cache observability, and focused tests tied to the changed cache surface.
- Split cache policy by success, not-found, permission-denied, temporary failure, stale value, and
  unknown outcome when those outcomes need different behavior.
- Add tests for tenant separation, permission changes, stale value bounds, concurrent misses, source
  failures, Redis failures, synchronized expiry, old-version cached values, update races, delete and
  recreate flows, and deploy rollback when feasible.
- Do not add speculative cache layers, global flush buttons, unbounded fallback to the source, broad
  cache bypasses, or TTL guesses without an explicit source-of-truth and stale-tolerance contract.
- Do not trade authorization, privacy, money, entitlement, inventory, ordering, or user trust for
  hit rate without explicit product acceptance.

<!-- mustflow-section: procedure -->
## Procedure

1. Name the second truth store. State the source of truth, cached value, allowed stale duration, and
   whether the cached value is disposable or can affect security, money, entitlement, inventory, or
   user-visible facts.
2. Check key truth before speed.
   - The key must include every dimension that changes meaning or visibility: tenant, actor, viewer
     context, login state, membership tier, country, language, locale, A/B test, feature flag, adult
     verification, inventory policy, authorization state, and relevant request headers.
   - A key such as `product:{id}` is unsafe when the response varies by the viewer.
3. Check query normalization.
   - Sort order-insensitive query parameters, remove defaults, normalize types, define empty value
     handling, and state whether array order is meaningful.
   - Treat raw `JSON.stringify(query)` as suspect until key stability, default handling, and array
     semantics are explicit.
4. Check key version and schema version.
   - Cache keys or values need a version when response shape, serialization, permission meaning,
     query semantics, or source fields change.
   - During deploy and rollback, old and new code must either read both formats safely, reject old
     values clearly, or use separate versioned keys.
5. Check TTL as a contract.
   - TTL is not a guess like "five minutes". Tie it to data change rate, stale tolerance, and source
     protection.
   - Add TTL jitter when many keys are filled together so synchronized expiry does not become an
     expiry bomb.
   - Separate soft TTL from hard TTL when stale-while-revalidate or stale serve during source failure
     is allowed.
6. Check miss collapse and stampede control.
   - A miss path of `get -> source -> set` is incomplete for hot keys.
   - Look for lock, lease, singleflight, request coalescing, bounded regeneration, early refresh,
     prewarm, or another mechanism that stops one expired hot key from sending every caller to the
     source.
7. Check negative and failure caching.
   - Negative cache can protect the source for expensive misses, but success, `404`, `403`, temporary
     failure, timeout, and unknown outcome need separate TTLs and separate meanings.
   - Do not let a transient outage become a long-lived "not found" or "not allowed" fact.
8. Check invalidation ordering.
   - Delete-before-commit can resurrect old values when another request refills from the old source
     value before the commit lands.
   - Prefer commit-after-delete, outbox-driven invalidation, version compare, write-through, or a
     local pattern that prevents old values from winning after the durable write.
9. Check update races.
   - Updating the cache after a write is not automatically safe. A slower older write can overwrite
     a newer value.
   - Use updatedAt, monotonic version, CAS, conditional write, compare-and-set, or cache delete when
     ordering cannot be proven.
10. Check list, query, and page caches separately from detail caches.
    - List caches are harder than detail caches because latest, popular, tag, author, search, filter,
      and page keys all change when one entity changes.
    - Page-number caches are vulnerable to insertions and deletions. Prefer cursor keys, baseline
      time, snapshot token, or explicit duplicate and gap behavior for feeds and infinite scroll.
    - If tag-based invalidation is missing for compound queries, expect global flush pressure and
      report the operational cost.
11. Check cache layers.
    - Local in-memory cache splits truth per server. L1, L2, and DB each need TTL, invalidation,
      bypass, and failure behavior.
    - Deleting L2 while L1 survives can leave "sometimes stale" bugs that depend on load-balancer
      routing.
12. Check cache outage fallback.
    - Redis down plus unbounded DB fallback can kill the source. Fallback needs rate limit, load
      shedding, stale serve, circuit breaker, bulkhead, or another source-protection mechanism.
    - Decide whether cache failure is disposable or correctness-sensitive. Sessions, permissions,
      rate limits, inventory, idempotency, and dedupe caches are not ordinary performance caches.
    - Compare normal cached traffic with an allowed bypass path or known miss path when evidence is
      available. If bypass is faster, fresher, or more correct, the cache policy itself is suspect.
13. Check Redis keyspace and memory behavior.
    - Review value size, key size, key schema, bounded key cardinality, max memory, eviction policy,
      expired keys, evicted keys, and whether TTL-less keys are turning cache into state storage.
    - `noeviction` makes writes fail at memory limit. `volatile-*` policies only evict keys with TTL,
      so TTL-less keys can crowd out real cache behavior.
    - `KEYS *` in application code is a production bomb. Use `SCAN` only from bounded admin or
      maintenance paths with explicit limits.
14. Check Redis latency, replication, and distribution.
    - Redis Slow Log does not include client round-trip time, connection wait, serialization,
      application loop overhead, DNS, TLS, or network path time. Do not use it as the only latency
      proof.
    - Review replica lag, failover behavior, cold replica warmup, persistence spikes, memory
      fragmentation, client connection pools, shard imbalance, and command mix when a cache incident
      is operational rather than semantic.
15. Check hot keys and Redis Cluster distribution.
    - Sharding does not save one hot key. Use replicas, local L1, request coalescing, prewarm,
      chunking, or workload-specific splitting where semantics allow it.
    - Redis Cluster hash tags are useful for intentional multi-key locality, but overusing the same
      tag can force too many keys into one slot.
16. Check HTTP cache semantics.
    - If responses vary by `Authorization`, `Cookie`, `Accept-Language`, `Accept-Encoding`, content
      negotiation, or user context, verify `Vary` and cache-control behavior.
    - `no-cache` means revalidate before reuse. `no-store` means do not store. Do not use one when
      the other is required.
    - Check freshness, validation, private versus public cacheability, CDN behavior, browser behavior,
      and generated-client or proxy expectations.
17. Check permission and entitlement caches as security boundaries.
    - A permission cache, role cache, organization-membership cache, subscription cache, admin cache,
      or entitlement cache must be invalidated by revocation, role change, organization move,
      subscription expiry, ownership change, and emergency access changes.
    - Short TTL alone is not enough for decisions that should fail closed or revoke promptly.
18. Check cache warming and cold-start behavior.
    - Deployment, autoscale, failover, and rollback can create synchronized cold caches that push
      traffic to the source.
    - Prewarm only keys with clear ownership and backpressure. Do not build an unbounded warming job
      that becomes the outage.
    - Load-test or smoke the cold, warm, failover, replica-lag, source-slow, and cache-down scenarios
      when the repository has configured evidence. Otherwise report those as manual operational gaps.
19. Check observability.
    - Hit rate alone lies. Break down hits, misses, bypasses, stale serves, refreshes, negative hits,
      refresh failures, evictions, expirations, fallback serves, Redis errors, and set failures by
      endpoint, key-pattern, tenant, status-code, and cache layer where useful.
    - Log or measure miss cost: source query time, source call count, value size, generation time,
      and set success.
    - Track hit-rate cost: origin load avoided, origin load caused by misses, miss amplification,
      cache write failures, and whether a high hit rate hides a small set of expensive miss paths.
    - Keep cache metrics labels bounded; put high-cardinality keys in logs or traces only when the
      repository privacy rules allow it.
20. Check tests beyond the happy path.
    - "Second call is faster" is not enough.
    - Cover concurrent misses, update during read, delete then recreate, source failure, Redis
      failure, synchronized TTL expiry, old-version cached value, permission change, tenant
      separation, list invalidation, negative-cache classification, deploy rollback, and cache-layer
      bypass when those risks exist.
21. Label evidence honestly. If the repository lacks deterministic cache, Redis, CDN, HTTP, browser,
    or load tests, report the missing evidence instead of claiming the cache is safe.

<!-- mustflow-section: postconditions -->
## Postconditions

- Cache source of truth, value shape, key dimensions, stale tolerance, TTL, invalidation, fallback,
  and observability are explicit or reported as missing.
- Tenant, viewer, permission, entitlement, feature-flag, locale, query, schema-version, and header
  variance cannot silently share the wrong value.
- Stampede, synchronized expiry, negative cache, invalidation ordering, update race, list cache,
  page cache, tag invalidation, L1/L2 layering, Redis outage, hot key, Redis Cluster, and HTTP cache
  semantics are fixed or reported where relevant.
- Permission and entitlement caches fail closed or invalidate promptly where stale values are unsafe.
- Cache claims are backed by configured evidence or labeled as static review risk, manual-only, or
  missing evidence.

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

Prefer the narrowest configured test, build, docs, release, or mustflow intent that covers the changed
cache key, stale-data, invalidation, fallback, or observability contract. Do not infer raw Redis, CDN,
browser, server, benchmark, or load-test commands outside the command contract.

<!-- mustflow-section: failure-handling -->
## Failure Handling

- If verification fails, preserve the failing intent, failing assertion or output tail, and the cache
  contract it exercised before editing again.
- If key dimensions, source-of-truth ownership, stale tolerance, invalidation trigger, or permission
  revocation behavior are unknown, report the missing decision instead of adding a cache or guessing a
  TTL.
- If safe cache behavior requires a tag index, outbox, versioned read model, CAS support, circuit
  breaker, bounded fallback, or operational Redis/CDN evidence outside the current scope, report the
  missing boundary and keep local changes narrow.
- If deterministic cache proof requires live Redis, CDN, browser, load-test, or production telemetry
  not configured in `.mustflow/config/commands.toml`, complete available local verification and report
  the manual evidence gap.

<!-- mustflow-section: output-format -->
## Output Format

- Cache surface reviewed
- Source of truth, cached value, key dimensions, stale tolerance, TTL, invalidation, and fallback
  decisions
- Key normalization, key version, query normalization, viewer context, tenant and permission boundary
  checks
- Stampede, negative-cache, invalidation-order, update-race, list/page/tag, L1/L2, Redis, hot-key,
  HTTP cache, permission-cache, warming, and observability checks where relevant
- Cache-integrity fixes made or recommended
- Evidence level: configured-test evidence, static review risk, manual-only, missing, or not applicable
- Command intents run
- Skipped cache diagnostics and reasons
- Remaining cache-integrity risk
