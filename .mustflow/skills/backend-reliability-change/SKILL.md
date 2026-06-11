---
mustflow_doc: skill.backend-reliability-change
locale: en
canonical: true
revision: 1
lifecycle: mustflow-owned
authority: procedure
name: backend-reliability-change
description: Apply this skill when backend APIs, workers, jobs, queues, caches, database write paths, external service calls, health checks, observability, feature flags, idempotency, retries, outbox/inbox processing, or operational failure handling are created, changed, reviewed, or reported.
metadata:
  mustflow_schema: "1"
  mustflow_kind: procedure
  pack_id: mustflow.core
  skill_id: mustflow.core.backend-reliability-change
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

# Backend Reliability Change

<!-- mustflow-section: purpose -->
## Purpose

Keep backend changes safe under retries, slow dependencies, duplicate messages, partial failures,
cache misses, operational probes, and production debugging pressure.

Backend reliability is not a framework feature. It is the set of small contracts that stop one
request, job, tenant, cache miss, retry loop, or external provider outage from turning into a
system-wide incident. Prefer explicit idempotency, bounded waiting, database-enforced facts,
low-cardinality telemetry, and reversible rollout switches over optimistic controller code.

<!-- mustflow-section: use-when -->
## Use When

- A backend route, RPC handler, command handler, webhook, mutation, job, worker, queue consumer,
  scheduled task, or integration path is created, changed, reviewed, or reported.
- Code handles write APIs, retries, timeouts, cancellation, external HTTP/RPC/database/cache calls,
  payment or provider calls, health checks, readiness, startup, graceful degradation, or fallback
  behavior.
- Code changes idempotency keys, request fingerprints, duplicate handling, final response replay,
  outbox publishing, inbox deduplication, dead-letter queues, poison messages, queue retention,
  backoff, jitter, or consumer concurrency.
- Code changes database uniqueness, constraints, indexes, soft-delete uniqueness, cursor
  pagination, lock usage, table-backed queues, `FOR UPDATE SKIP LOCKED`, advisory locks,
  distributed locks, or transaction boundaries.
- Code changes cache keys, cache TTLs, negative caching, request coalescing, stampede prevention,
  cache authority, tenant-aware caching, or stale-data behavior.
- Code changes logs, metrics, traces, correlation ids, OpenTelemetry baggage, audit records,
  alert inputs, feature flags, rollout gates, kill switches, or operational admin actions.
- A final report claims a backend path is safe to retry, resilient, scalable, observable,
  production-ready, fault-tolerant, idempotent, cache-safe, queue-safe, or easy to debug.

<!-- mustflow-section: do-not-use-when -->
## Do Not Use When

- The task is only an architecture split or service ownership decision with no concrete backend
  implementation surface; use `service-boundary-architecture`.
- The task is only an API schema/status/header change with no operational failure behavior; use
  `api-contract-change`.
- The task is only database-engine-specific DDL, query, or migration work; use the matching
  database skill first, then this skill only for retries, queues, cache, observability, or
  operational behavior around that database path.
- The task is purely frontend rendering, styling, or browser delivery behavior.

<!-- mustflow-section: required-inputs -->
## Required Inputs

- Backend surface: route, handler, worker, queue, scheduled job, database write path, cache path,
  provider integration, health probe, feature flag, or admin operation.
- Trigger shape: user request, webhook, retry, scheduled run, queue message, backfill, migration,
  manual operator action, startup, shutdown, or dependency callback.
- Idempotency boundary: principal, tenant, resource, action, request fingerprint, key storage,
  in-progress state, final response, conflict behavior, TTL, and replay contract.
- External-call boundary: dependency owner, deadline, cancellation propagation, connect/request/read
  or write timeout support, retryable errors, retry budget, backoff, jitter, and fallback behavior.
- Persistence and transaction boundary: unique facts, constraints, indexes, lock scope, transaction
  length, outbox/inbox tables, query evidence, pagination keys, and migration safety needs.
- Queue or async boundary: delivery semantics, ordering assumptions, duplicate handling, poison
  handling, dead-letter policy, retention, backlog metrics, consumer concurrency, and replay tools.
- Cache boundary: key dimensions, tenant/auth scope, TTL, jitter, negative caching, coalescing,
  stale/error behavior, invalidation, and whether cached data is allowed to be wrong.
- Observability boundary: request id, trace id, correlation id, log fields, metrics labels,
  alert inputs, sensitive data exclusions, audit fields, and debugging path.
- Rollout boundary: feature flag, kill switch, default state, rollout scope, rollback or disable
  behavior, and user-visible degradation.
- Relevant command-intent contract entries for tests, builds, docs, release checks, and mustflow
  validation.

<!-- mustflow-section: preconditions -->
## Preconditions

- The task matches the Use When conditions and does not match the Do Not Use When exclusions.
- Higher-priority instructions and `.mustflow/config/commands.toml` have been checked for the
  current scope.
- If request/response schema, status code, headers, pagination, cache headers, or generated clients
  change, also use `api-contract-change`.
- If service ownership, data source of truth, tenant isolation, event contract, or module split
  decisions change, also use `service-boundary-architecture`.
- If database schema, migration, query plan, index, transaction isolation, or engine-specific lock
  behavior changes, also use `database-migration-change`, `database-change-safety`, or the matching
  database engine skill.
- If authentication, authorization, object-level access, tenant isolation, secrets, personal data,
  logs, telemetry, retention, or audit behavior changes, also use `auth-permission-change`,
  `security-privacy-review`, or `security-regression-tests`.
- If performance, p95/p99 latency, throughput, queue depth, connection pool pressure, cache hit
  rate, or cost is claimed, also use `performance-budget-check`.

<!-- mustflow-section: allowed-edits -->
## Allowed Edits

- Update backend handlers, services, workers, retry policy, timeout policy, idempotency storage,
  outbox/inbox code, cache boundaries, health endpoints, observability fields, flags, tests, docs,
  and directly synchronized templates tied to the reliability behavior.
- Add or tighten tests for duplicate requests, retry replay, same idempotency key with a different
  request fingerprint, timeout/cancellation, dependency failure, queue redelivery, cache miss,
  stale data, object-level denial, DTO allowlists, and kill-switch behavior.
- Do not replace missing reliability contracts with comments that say "should be idempotent",
  "eventually consistent", "handled by the queue", or "covered by Kubernetes" without executable
  behavior, storage constraints, or operational evidence.

<!-- mustflow-section: procedure -->
## Procedure

1. Classify the backend surface and failure multiplier. Name whether the change is a write API,
   read API, webhook, provider call, worker, queue consumer, cache path, database write path, health
   probe, admin action, or rollout gate. Identify what repeats under failure: user retries,
   client retries, load balancer retries, server retries, queue redelivery, scheduled reruns, or
   operator replay.
2. For write APIs and side effects, build an idempotency ledger.
   - Scope the idempotency key by tenant, principal, action, and resource so one actor cannot replay
     another actor's operation.
   - Store the idempotency key, request fingerprint or hash, processing state, final status/body or
     result reference, timestamps, TTL, and owner.
   - Return the saved result for the same key and same request fingerprint after the operation
     commits. Reject or conflict the same key with a different request fingerprint.
   - Define the in-progress response when the first request is still running. Avoid running the
     side effect twice just because the first response was lost.
3. Bound all external waiting.
   - Propagate an end-to-end deadline or cancellation signal across internal calls, DB calls, cache
     calls, provider calls, and queue work when the platform supports it.
   - Configure connect, request, read, and write timeouts separately when the client exposes them;
     otherwise document the closest supported boundary.
   - Retry only operations that are idempotent or guarded by an idempotency key. Use bounded retry
     counts, exponential backoff, jitter, and a retry budget. Avoid stacked retries at every layer.
   - Define fallback, degradation, or user-visible failure behavior instead of waiting forever.
4. Split operational health checks.
   - Keep `/live` shallow: process is running and the event loop or runtime is not wedged. Do not
     put database, cache, or external-provider checks in liveness.
   - Put dependency availability in `/ready` only when traffic should be removed if the dependency
     is unavailable. Make readiness cheap, bounded, and resistant to cascading probe load.
   - Use `/startup` or an equivalent startup probe when initialization can legitimately take longer
     than normal liveness timing.
5. Enforce facts in the database, not only in application code.
   - Use a unique constraint or unique index for facts that must be globally unique. Do not rely on
     a read-then-insert check in application code.
   - For soft deletes, use a partial unique index or an explicit active-state uniqueness strategy
     when the database supports it.
   - Handle duplicate-key conflicts as a normal path. Convert the database decision into the same
     domain result a retried request should see.
   - For PostgreSQL query and index changes, gather `EXPLAIN ANALYZE` with buffer evidence when
     available, inspect `pg_stat_statements` or equivalent workload evidence when present, and
     respect online index, lock-timeout, and expand-contract migration procedures.
   - For pagination, prefer a stable compound cursor over deep `OFFSET` when data can grow or
     mutate while users page.
6. Keep observability useful and low-risk.
   - Use structured logs with request id, trace id, correlation id, tenant-safe identifiers, route
     name, operation name, dependency name, result class, duration, retry count, and idempotency
     outcome where useful.
   - Do not put secrets, tokens, raw request bodies, full personal data, payment data, or unbounded
     payloads in logs, traces, metrics, OpenTelemetry baggage, queue dead letters, or audit comments.
   - Keep metrics labels low-cardinality. Do not label metrics by user id, email, raw URL, request
     body, trace id, order id, idempotency key, or provider payload id. Put high-cardinality details
     in logs or traces instead.
   - Follow one request through API, queue, worker, provider, and database with the same correlation
     or trace id when possible.
7. Treat cache as a consistency and failure contract.
   - Include tenant, auth, locale, variant, and resource dimensions in cache keys when they affect
     visibility or meaning.
   - Define TTL, invalidation, stale-data allowance, error fallback, hit/miss metrics, max size, and
     cache authority. Name when a cached value may be wrong and for how long.
   - Add stampede protection: request coalescing, single-flight, prewarming, TTL jitter, soft TTLs,
     or bounded regeneration. Use negative caching for expensive missing values only with a short
     and intentional TTL.
8. Make async consumers safe for at-least-once delivery.
   - Assume messages can be delivered more than once, out of order, after the original request
     timed out, or after a deploy.
   - Use an inbox table or equivalent durable deduplication keyed by event id or message id for
     side-effecting consumers.
   - Use an outbox pattern or equivalent transactional publication when a database state change and
     event publish must agree.
   - Define poison-message handling, dead-letter storage, retry schedule, jitter, retention, replay,
     backlog age, and consumer scaling triggers.
   - For PostgreSQL table-backed queues, prefer row locks such as `FOR UPDATE SKIP LOCKED` when the
     schema and workload fit. Treat distributed locks as a last resort after unique constraints,
     state machines, row locks, or advisory locks are ruled out.
9. Keep authorization and DTO boundaries server-side.
   - Check object-level authorization on every backend path that accepts a resource id, event id,
     object id, file id, tenant id, or provider id. Do not trust client-side filtering or hidden UI.
   - Return allowlisted DTOs instead of raw ORM entities, provider payloads, or internal records.
     Keep public response fields separate from database columns.
10. Put risky behavior behind controllable rollout gates.
   - Use server-side feature flags for risky paths, external provider changes, queue consumers,
     cache authority changes, and new failure behavior.
   - Include a kill switch, safe default, rollout scope, audit or metric evidence, and cleanup plan.
     Do not use a flag to hide an unsafe migration or permanent forked behavior.
11. Select verification from the command contract.
   - Prefer focused tests that prove duplicate execution, timeout, retry, queue redelivery, cache
     miss, BOLA denial, DTO allowlist, health-probe split, and kill-switch behavior.
   - Run configured test, build, docs, release, and mustflow intents only. Report missing backend
     reliability verification instead of inventing raw service, database, or cluster commands.

<!-- mustflow-section: forbidden-patterns -->
## Strongly Avoid

- Accepting the same idempotency key with a different request fingerprint.
- Retrying a non-idempotent provider call without an idempotency key or durable side-effect guard.
- Adding retries without a deadline, bounded attempt count, backoff, jitter, and retry budget.
- Letting every layer retry the same failing dependency.
- Putting database, cache, provider, or queue checks in liveness.
- Treating a queue as proof that backpressure, retention, dead letters, or replay are solved.
- Publishing an event outside the same durable boundary as the state change it describes when the
  event is critical.
- Using application read-then-insert logic as the uniqueness guarantee.
- Returning raw ORM entities or provider payloads from an API.
- Logging tokens, raw request bodies, personal data, or high-cardinality metric labels.
- Using distributed locks as the first solution to duplicate work.
- Relying on `OFFSET` pagination for large or frequently mutated result sets.

<!-- mustflow-section: verification -->
## Verification

- Prefer the narrowest configured test intent that exercises the changed reliability contract:
  duplicate request replay, different request fingerprint conflict, dependency timeout, bounded
  retry, queue redelivery, cache miss or stampede guard, health-probe split, object-level denial,
  DTO allowlist, and kill-switch behavior.
- Use `test_related` for code or behavior changes when related tests cover the touched backend
  surface. Use `test` only when the reliability behavior crosses broad shared infrastructure.
- Use `docs_validate_fast` when skill, workflow, docs, examples, or template text changes.
- Use `test_release` when package metadata, template manifest, install surface, release notes, or
  version metadata changes.
- Use `mustflow_check` after mustflow-owned skill, route, template, or command-contract changes.
- Report missing evidence explicitly when the repository has no configured provider, database,
  queue, load, cluster, or integration check for the changed reliability surface.

<!-- mustflow-section: failure-handling -->
## Failure Handling

- If verification fails, preserve the failing intent, failing assertion or output tail, and the
  backend reliability surface it exercised before editing again.
- If the failure involves missing or stale required skill sections, route metadata, template
  manifest entries, i18n metadata, or installed-template sync, fix the contract surface first and
  rerun the same configured intent.
- If a runtime test reveals duplicate execution, unbounded retry, stale cache authority, liveness
  dependency checks, missing object-level authorization, raw DTO exposure, or telemetry leakage,
  treat the failure as a contract bug. Do not weaken the test without stronger repository evidence.
- If the needed proof requires live provider, queue, database, Kubernetes, or load-test access not
  configured in `.mustflow/config/commands.toml`, stop at local verification and report the missing
  operational evidence instead of inventing commands.

<!-- mustflow-section: postconditions -->
## Postconditions

- Idempotency, retry, timeout, queue, cache, database, health-probe, observability, auth, DTO, and
  rollout behavior have been classified or explicitly marked out of scope.
- Duplicate execution, partial failure, slow dependency, redelivery, stale cache, and operational
  debugging paths have concrete behavior, not just prose promises.
- Sensitive data and high-cardinality telemetry risks have been checked.
- Tests, docs, templates, and release metadata changed by the backend reliability behavior are
  synchronized.

<!-- mustflow-section: output-format -->
## Output Format

Include in the final report when this skill is used:

- Backend surface and selected reliability boundary.
- Idempotency, retry/timeout, queue/cache/database, health-probe, observability, auth/DTO, and
  rollout decisions that changed or were verified.
- Tests or configured command intents run.
- Remaining backend reliability risk, especially missing load, provider, database, or cluster
  evidence.
