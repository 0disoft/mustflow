---
mustflow_doc: skill.rate-limit-integrity-review
locale: en
canonical: true
revision: 1
lifecycle: mustflow-owned
authority: procedure
name: rate-limit-integrity-review
description: Apply this skill when code is created, changed, reviewed, or reported and rate limits, throttling, quotas, API usage limits, request costs, token buckets, leaky buckets, fixed windows, sliding windows, GCRA, Redis counters, edge or gateway limits, per-tenant or per-user limits, 429 responses, Retry-After, RateLimit headers, shadow enforcement, operator resets, async enqueue limits, or concurrency limits need review for protected-resource fit, key design, atomic counting, layered enforcement, client contract, and abuse or overload safety.
metadata:
  mustflow_schema: "1"
  mustflow_kind: procedure
  pack_id: mustflow.core
  skill_id: mustflow.core.rate-limit-integrity-review
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

# Rate Limit Integrity Review

<!-- mustflow-section: purpose -->
## Purpose

Review rate limiting as protection for a named scarce resource, not as an algorithm decoration.

The review question is not "did we add a limiter?" It is "does this policy protect the real thing
that gets exhausted, with the right key, cost, layer, storage atomicity, fail mode, response
contract, observability, and operator escape hatch?"

<!-- mustflow-section: use-when -->
## Use When

- Code creates, changes, reviews, or reports rate limits, throttling, quotas, request budgets,
  abuse limits, API usage limits, request cost weights, token bucket, leaky bucket, fixed window,
  sliding window counter, sliding window log, GCRA, Redis counter, Lua or EVAL counter update,
  CDN or WAF limit, gateway limit, service-level limit, database bottleneck limit, external API
  protection, per-tenant limit, per-user limit, per-api-key limit, route-group limit, or IP limit.
- A public or internal API emits or depends on 429 responses, `Retry-After`, `RateLimit`,
  `RateLimit-Policy`, legacy `X-RateLimit-*` headers, retry hints, blocked-decision caches,
  shadow mode, enforcement ramp, policy IDs, or operator lookup and reset tools.
- Async jobs, queues, webhooks, batch endpoints, expensive exports, search, login, signup, OTP,
  payment, email, SMS, AI, third-party API, or database-heavy paths can be overloaded by request
  count, request cost, concurrency, retries, cache misses, or one noisy actor.
- A final report claims an API is rate-limited, protected from abuse, quota-safe, retry-friendly,
  fair by tenant, protected at the edge, globally limited, or safe under load.

<!-- mustflow-section: do-not-use-when -->
## Do Not Use When

- The task is primarily retry amplification, backoff, `Retry-After` consumption by a caller, or
  SDK retry behavior; use `retry-policy-integrity-review` first and this skill for the server-side
  limit policy and response contract.
- The task is primarily duplicate business intent, idempotency keys, replay, or unknown side-effect
  outcomes; use `idempotency-integrity-review` first and this skill for quota burning and limiter
  keys.
- The task is primarily API naming, DTO shape, pagination, versioning, or caller ergonomics; use
  `api-misuse-resistance-review` first and this skill for rate-limit contract details.
- The task is primarily cloud bill control rather than runtime overload or abuse control; use
  `cloud-cost-guardrail-review` first and this skill only for per-request quota mechanics.
- The operation is a pure local calculation with no shared resource, external dependency, abuse
  surface, fairness requirement, or caller-visible limit.

<!-- mustflow-section: required-inputs -->
## Required Inputs

- Protected resource ledger: DB, cache, queue, worker pool, external API, login or OTP channel,
  payment provider, email or SMS provider, search backend, AI quota, tenant fairness budget,
  account-security surface, or public API availability.
- Cost-weighted request ledger: route template, method, actor, tenant, API key, user, IP or IP
  prefix, feature, request body size, requested page size, batch size, export size, cache hit or
  miss, async job fan-out, provider call count, and per-request cost.
- Layer model: CDN, WAF, load balancer, gateway, service, route group, worker, queue producer,
  queue consumer, database, Redis, external provider, local fuse, and central or global limiter.
- Key model: tenant, account, API key, user, route template, method, route group, resource id, IP
  prefix, region, environment, plan tier, feature flag, and whether missing, empty, duplicate, or
  conflicting identity headers are denied, normalized, or ignored.
- Algorithm and storage model: fixed window, token bucket, leaky bucket, sliding window counter,
  sliding window log, GCRA, Redis key shape, TTL, storage time source, counter cardinality, atomic
  operation, Redis Cluster hash slot or hash tag, local cache, and clock-skew behavior.
- Failure mode model: fail open or fail closed per policy, Redis or storage outage behavior,
  already-blocked cache behavior, allow-decision cache avoidance, shadow mode, ramp, bypass,
  rollback, and operator reset scope.
- Response contract: 429 status, `Retry-After`, `RateLimit`, `RateLimit-Policy`, legacy header
  compatibility, machine-readable error code, retryable classification, reset or wait semantics,
  jitter or backoff guidance, and information-disclosure boundary.
- Observability and operator evidence: policy id, key hash or safe key, layer, quota, remaining
  budget where safe, reset, request cost, route template, actor or tenant safe id, shadow decision,
  block reason, metric cardinality, lookup tool, reset tool, audit log, and tests.

<!-- mustflow-section: preconditions -->
## Preconditions

- The task matches the Use When conditions and does not match the Do Not Use When exclusions.
- Higher-priority instructions and `.mustflow/config/commands.toml` have been checked for the
  current scope.
- Required protected-resource, cost, layer, key, algorithm, storage, fail-mode, response,
  observability, and operator evidence is available, or missing evidence can be reported without
  guessing.
- Existing local limiter, quota, plan-tier, API error, retry, Redis, cache, observability,
  operator-tool, and abuse-defense patterns have been searched before adding new shapes.
- If limits affect money, credits, permissions, auth, personal data, provider state, queue
  settlement, or durable business state, also apply the relevant payment, credit, security,
  idempotency, queue, transaction, or failure skill.

<!-- mustflow-section: allowed-edits -->
## Allowed Edits

- Add or tighten protected-resource definitions, cost weights, per-key policy, layered limit
  placement, route-template keys, atomic counter updates, TTLs, storage-time use, fail-open or
  fail-closed policy, blocked-decision cache, shadow mode, 429 response shape, observability,
  operator lookup or reset behavior, and focused tests.
- Replace raw URL keys, IP-only limits, request-count-only limits, non-atomic Redis read-modify-write
  counters, app-server clock resets, missing TTLs, allow-decision caches, hidden fail-open behavior,
  unlimited queue enqueue, and misleading `X-RateLimit-*` assumptions when they are in scope.
- Do not add live provider calls, load tests, dashboards, WAF rules, CDN settings, cluster changes,
  background workers, local servers, or raw Redis operations outside the configured command contract.
- Do not treat rate limiting as authorization, fraud prevention, exact cost accounting, idempotency,
  retry safety, queue backpressure, or concurrency control without the matching evidence.

<!-- mustflow-section: procedure -->
## Procedure

1. Do not choose the algorithm first.
   - Name the protected resource before discussing fixed window, token bucket, sliding window,
     GCRA, or Redis.
   - A DB-heavy report endpoint, login OTP provider, public API tenant budget, and expensive AI call
     usually need different keys, costs, layers, and fail modes.
   - If the protected resource is unknown, report that the limiter cannot be judged yet.
2. Count cost, not only requests.
   - One request can be one cheap cache hit or thousands of DB rows, provider calls, queued jobs,
     emails, tokens, or export bytes.
   - Add request cost weights for batch size, page size, body size, expensive route group, cache
     miss, async fan-out, provider action, AI token use, or report size where the resource cost
     differs materially.
   - Keep cost units simple enough for operators to explain.
3. Place limits in layers deliberately.
   - CDN and WAF limits are good for blunt IP, bot, path, and geographic pressure.
   - Gateway limits are good for API key, tenant, plan, route group, and coarse global budgets.
   - Service limits are good for user, feature, resource, business rule, and request cost.
   - Dependency-protection limits are good near DB, Redis, queue, worker, and external provider
     bottlenecks.
   - Layered limits should not all count the same thing unless that duplication is intentional.
4. Design keys as policy, not plumbing.
   - Avoid IP-only keys for authenticated APIs; NAT, mobile networks, and shared offices make IP a
     bad user identity.
   - Include tenant, account, API key, user, route group, method, route template, plan tier, and
     resource id only when each dimension changes fairness or protected-resource pressure.
   - Use route templates such as `/orders/{id}` instead of raw URLs so one actor cannot create
     unbounded limiter keys through path values.
   - Define missing, empty, duplicate, conflicting, or spoofable identity headers. A limiter that
     silently falls back to IP may become a bypass or collateral-damage machine.
5. Review algorithm fit.
   - Fixed window is simple but allows a boundary burst: a caller can spend almost two windows of
     quota around the reset edge.
   - Token bucket handles burst plus steady rate and is a good default when short bursts are
     acceptable.
   - Sliding window counter smooths boundary effects with lower storage than exact logs.
   - Sliding window log is accurate but costly; reserve it for low-volume, high-risk paths where
     exact decisions justify per-request storage.
   - GCRA or equivalent virtual-schedule limiters can be compact and precise, but only if the local
     team understands the timestamp math and test cases.
6. Make counter storage atomic.
   - Redis operation atomicity matters. Split read, compare, increment, and expire steps can allow
     more requests than the policy says or leave keys without expiry.
   - Use one atomic operation pattern for the decision and update, such as a single Redis script or
     an equivalent repository-supported primitive.
   - `INCR` plus `EXPIRE` needs a safe first-write and failure path; do not leave counters immortal
     if the expire step is skipped.
   - In Redis Cluster, multi-key checks need keys in the same hash slot or a deliberate hash tag.
     Otherwise "global plus per-key" policy may fail only after production sharding.
7. Use storage time, not app server time.
   - Multiple app servers with skewed clocks can disagree about reset time and token refill.
   - Prefer Redis, database, or central storage time where the storage primitive supports it.
   - If app time is unavoidable, clamp skew and test reset-boundary behavior.
8. Separate local fuses from global limits.
   - Local limits are not global limits. One process-local bucket multiplied by many pods is a
     rough fuse, not a tenant quota.
   - Use local fuses for emergency self-protection, CPU protection, and storage-outage fallback.
   - Use central or coordinated counters for user, tenant, account, API key, or paid-plan budgets.
   - Edge limits are not precise global counters; treat CDN or WAF limits as approximate layers
     unless the provider contract proves global precision for the chosen key and window.
9. Choose fail open or fail closed per policy.
   - Cheap public reads may fail open with a local fuse when the limiter store is down.
   - Login, signup, OTP, payment, provider-spend, admin, expensive export, AI, and abuse-sensitive
     actions often need fail closed or degraded mode.
   - Name the user-visible behavior, operator alert, and rollback path for limiter-store outage.
10. Count failed responses intentionally.
    - Counting only successful responses can let attackers hammer validation, auth, login, search,
      and not-found paths for free.
    - Counting every failure can punish normal callers during provider outages or reveal whether a
      target exists through quota differences.
    - Decide by route and failure class: validation, auth denial, not found, provider timeout,
      business conflict, 5xx, and cancelled requests may deserve different counting.
11. Separate rate limits from concurrency limits.
    - Rate limit controls how many operations enter over time.
    - Concurrency limit controls how many operations run at once.
    - Slow expensive jobs can obey a request rate and still exhaust DB connections, workers, or
      provider slots. Add a semaphore, queue depth, pool, worker concurrency, or bulkhead when the
      protected resource is simultaneous work.
12. Make 429 useful but not leaky.
    - Emit a machine-readable error code and `Retry-After` when a well-behaved client can wait.
    - If `Retry-After` and `RateLimit` hints disagree, `Retry-After` should govern immediate client
      behavior.
    - Standards-track `RateLimit` and `RateLimit-Policy` headers may coexist with legacy
      `X-RateLimit-*`, but do not assume every client or proxy gives legacy headers the same
      meaning.
    - Do not reveal exact internal capacity, shard counts, provider quotas, attack thresholds, or
      sensitive account state in public responses.
    - During active abuse, silent drop, generic denial, or coarser hints can be safer than a perfect
      quota tutorial for the attacker.
13. Add jitter and client backoff guidance.
    - If many clients get the same reset timestamp, they may all retry at once.
    - Add jitter to server-side refill or client guidance where the contract supports it.
    - Clamp untrusted `Retry-After` dates or provider reset values before passing them downstream.
14. Manage counter cardinality and TTL.
    - Every counter needs a TTL or lifecycle. Missing TTL turns rate limiting into unbounded storage
      growth.
    - Raw URL, request body, user agent, trace id, email, or unbounded resource id in keys can
      create key explosions or sensitive storage.
    - Cache already-blocked decisions briefly when it reduces Redis pressure, but do not cache allow
      decisions unless the policy explicitly tolerates overshoot.
15. Roll out enforcement safely.
    - Use shadow mode before blocking when policy impact is uncertain.
    - Compare shadow decisions with actual traffic, tenant, route group, plan tier, failure class,
      and support signals.
    - Ramp enforcement by route, actor type, plan, tenant, or percentage, with a fast disable path.
16. Make logs and metrics answer the policy question.
    - 429 logs should include policy id, layer, route template, method, safe actor or tenant id,
      key hash, request cost, quota, reset or wait, remaining budget when safe, decision, shadow or
      enforce mode, and reason.
    - Metrics should use bounded labels: policy id, route template, layer, decision, plan, and
      result class. Put high-cardinality keys in logs or traces.
    - Log both blocks and surprising allows, such as limiter-store fail-open or shadow-mode would
      block.
17. Provide operator lookup and reset.
    - Operators need to answer: which policy blocked this actor, why, until when, and what safe
      reset or override exists?
    - Reset by scoped policy and key, not raw Redis `DEL` against guessed patterns.
    - Audit every reset, override, bypass, and policy change with actor, reason, scope, expiry, and
      before or after evidence.
18. Burn tokens before enqueueing async work.
    - A queue does not protect the producer side if unlimited jobs can be enqueued.
    - Burn request or cost tokens before enqueue for expensive async work, then use concurrency
      limits at execution.
    - Decide whether retries, redeliveries, deduped messages, and cancelled jobs spend quota.
19. Decide whether cached hits count.
    - CDN-cached hits may not touch the protected origin resource, so origin-protection limits may
      not count them.
    - Business quotas, paid API limits, abuse limits, or fairness budgets may count cached CDN hits
      because the caller still consumed a product allowance.
    - Name which resource each layer protects before counting or ignoring cached responses.
20. Keep boundaries honest.
    - Rate limit is not authorization. A caller who should not access a resource must be denied
      before or independently of quota.
    - Rate limit is not a hard cost-control ceiling; provider bills, retries, async fan-out, logs,
      egress, and queues can spend money outside the request counter.
    - Rate limit is not proof of idempotency, bot defense, fraud prevention, fairness, or overload
      safety unless the matching evidence exists.
21. Test the ugly edges.
    - Cover boundary burst, concurrent calls at the quota edge, missing TTL, Redis or store outage,
      fail-open or fail-closed behavior, missing or duplicate identity headers, route-template key
      normalization, request cost weights, shadow-to-enforce switch, 429 response shape,
      `Retry-After`, storage time, hash tag or cluster key constraints, and operator reset audit.
    - If deterministic timing tests are hard, use fake clocks, injected storage time, or repository
      test helpers already present in the project.
    - If load, CDN, WAF, provider, or Redis Cluster evidence is not configured, report that boundary
      as manual-only instead of approving it from local unit tests.

<!-- mustflow-section: postconditions -->
## Postconditions

- Protected resource, cost model, layer placement, key design, algorithm, storage atomicity, TTL,
  time source, local versus global scope, fail-open or fail-closed policy, failed-response counting,
  concurrency limit needs, response contract, jitter, blocked cache, shadow rollout, observability,
  operator lookup and reset, async enqueue quota, cached-hit policy, and authorization or cost
  boundaries are explicit.
- IP-only authenticated limits, raw URL keys, fixed-window boundary bursts, non-atomic Redis
  counters, missing TTLs, app-clock reset drift, process-local "global" quotas, approximate edge
  limits treated as precise, hidden fail-open behavior, free failed requests, rate/concurrency
  confusion, unhelpful 429s, capacity-leaking headers, synchronized retries, allow-decision caches,
  unbounded shadow enforcement, missing policy id logs, unsafe raw Redis resets, unlimited async
  enqueue, cached-hit ambiguity, and rate-limit-as-authorization claims are fixed or reported.
- Rate-limit-safety claims are backed by configured tests, storage or framework evidence matched
  to current code, API contract evidence, operational evidence, static review evidence, or labeled
  as manual-only or missing.

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

Prefer the narrowest configured test, build, docs, release, or mustflow intent that covers the
changed rate-limit policy and synchronized template surfaces. Do not infer raw load tests, live
provider calls, CDN or WAF changes, Redis Cluster checks, local servers, queue workers, browser
sessions, chaos tests, or manual dashboards outside the command contract.

<!-- mustflow-section: failure-handling -->
## Failure Handling

- If a configured command fails, preserve the failing intent, failing assertion or output tail, and
  the rate-limit invariant it exercised before editing again.
- If the protected resource cannot be named, report that the limit policy is not reviewable yet.
- If key identity is spoofable, missing, or ambiguous, report the bypass or collateral-damage risk
  before tuning quotas.
- If safe repair requires WAF or CDN configuration, provider quota changes, Redis Cluster topology,
  load testing, production traffic replay, operator dashboard work, billing controls, or live
  integration proof outside the current scope, complete local verification and report the missing
  operational evidence.
- If deterministic limiter proof is not configured, complete available verification and report the
  missing manual, integration, or load evidence.

<!-- mustflow-section: output-format -->
## Output Format

- Rate-limit policy boundary reviewed
- Protected resource, cost model, layer model, key model, algorithm and storage model, atomicity,
  TTL, time source, local or global scope, fail mode, failed-response counting, concurrency limit,
  response contract, jitter, blocked-decision cache, shadow rollout, observability, operator reset,
  async enqueue quota, cached-hit policy, authorization and cost-control boundary, and test evidence
  findings
- Rate-limit fixes made or recommended
- Evidence level: configured-test evidence, storage or framework evidence, API contract evidence,
  operational evidence, static review risk, manual-only, missing, or not applicable
- Command intents run
- Skipped rate-limit diagnostics and reasons
- Remaining rate-limit-integrity risk
