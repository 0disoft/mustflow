---
mustflow_doc: skill.retry-policy-integrity-review
locale: en
canonical: true
revision: 1
lifecycle: mustflow-owned
authority: procedure
name: retry-policy-integrity-review
description: Apply this skill when code is created, changed, reviewed, or reported and retry loops, SDK or client retry configs, backoff, jitter, timeout, deadline, Retry-After, retry predicates, layered retries, circuit breakers, bulkheads, token buckets, queue redelivery, broker retries, cancellation-aware sleeps, or retry observability can amplify failure, duplicate side effects, hide permanent errors, exhaust pools, or overload dependencies.
metadata:
  mustflow_schema: "1"
  mustflow_kind: procedure
  pack_id: mustflow.core
  skill_id: mustflow.core.retry-policy-integrity-review
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

# Retry Policy Integrity Review

<!-- mustflow-section: purpose -->
## Purpose

Review retries as failure amplification control, not as "try again because something failed."

The review question is not "does this code retry?" It is "when the dependency is slow, down, rate-limited, partially successful, or overloaded, does this retry policy reduce harm or multiply the outage across attempts, layers, pools, locks, queues, and side effects?"

<!-- mustflow-section: use-when -->
## Use When

- Code creates, changes, reviews, or reports retry loops, SDK retry options, client retry middleware, `while true`, `for (;;)`, recursive retry, `maxAttempts`, `maxRetries`, `maxElapsedTime`, `deadline`, `timeout`, `sleep`, `delay`, backoff, jitter, `Retry-After`, circuit breaker, bulkhead, token bucket, rate limiter, or cancellation-aware retry behavior.
- HTTP, database, Redis, queue, stream, object storage, payment, email, notification, file upload, webhook, scheduler, batch, worker, or provider calls can be repeated after failure, timeout, cancellation, rate limit, lock conflict, transaction retry, or redelivery.
- A workflow has retries in more than one layer, such as caller retry plus service retry plus SDK retry plus load balancer retry plus queue redelivery plus broker retry.
- A review or final report claims a path is resilient, retry-safe, backoff-protected, rate-limit-aware, idempotent, transient-only, bounded, cancellation-safe, or protected by a circuit breaker, bulkhead, pool, timeout, or queue retry policy.

<!-- mustflow-section: do-not-use-when -->
## Do Not Use When

- The task is primarily duplicate business intent, webhook replay, queue redelivery, batch rerun, or timeout recovery that can move the same logical operation twice; use `idempotency-integrity-review` first and this skill for the retry budget and policy mechanics.
- The task is primarily broker settlement, ack, nack, delete, offset commit, visibility timeout, DLQ, consumer loss, or producer confirmation; use `queue-processing-integrity-review` first and this skill for application-level retry overlap.
- The task is primarily swallowed exceptions, false success, missing timeout honesty, cancellation swallowing, fallback defaults, or public error shape; use `failure-integrity-review` first and this skill for bounded retry behavior.
- The task is primarily read-decision-write atomicity, transaction isolation, after-commit ordering, or transaction retry semantics; use `transaction-boundary-integrity-review` first and this skill for retry placement and budget.
- The operation is a pure local calculation with no fallible dependency, wait, side effect, shared pool, cancellation source, or retry loop.

<!-- mustflow-section: required-inputs -->
## Required Inputs

- Retry surface: each retry loop, SDK retry configuration, middleware, queue redelivery policy, broker retry, load balancer retry, database retry, transaction retry, circuit breaker, bulkhead, token bucket, and wrapper around the changed path.
- Layered retry ledger: caller, API handler, service, SDK, driver, proxy, load balancer, queue, worker, scheduler, and provider retries with per-layer max attempts and elapsed-time budget.
- Attempt budget: max attempts, max elapsed time, per-attempt timeout, total deadline, cancellation signal, sleep behavior, and whether DNS, TLS, connection checkout, pool wait, request body upload, response streaming, and response parsing are inside the budget.
- Retry predicate: exception types, status codes, provider errors, timeout classes, rate-limit responses, transient versus permanent failure, unknown outcome, cancellation, validation errors, authorization errors, and programmer bugs.
- Side-effect and idempotency ledger: logical operation, idempotency key, key scope, request body hash, conditional write, transaction boundary, lock boundary, provider call, stream or upload body replayability, queue ack or commit, and committed response boundary.
- Backoff and jitter policy: fixed sleep, exponential backoff, cap, jitter type, `Retry-After` parsing, clock skew, maximum delay, per-key backoff, global backoff, and reset after success.
- Overload and throttling evidence: pool sizes, concurrency limit, bulkhead, token bucket, circuit breaker state, retry queue size, rate-limit budget, per-tenant or per-key fairness, and dependency-specific limits.
- Observability and test evidence: attempt logs, per-attempt spans, retry metrics, retry exhaustion metrics, `Retry-After` values, request id, correlation id, cancellation tests, permanent-failure tests, timeout-budget tests, and configured command intents.

<!-- mustflow-section: preconditions -->
## Preconditions

- The task matches the Use When conditions and does not match the Do Not Use When exclusions.
- Higher-priority instructions and `.mustflow/config/commands.toml` have been checked for the current scope.
- Required retry surface, layered retry ledger, attempt budget, retry predicate, side-effect ledger, backoff, throttling, observability, and test evidence is available, or missing evidence can be reported without guessing.
- Existing local retry, timeout, backoff, idempotency, queue redelivery, circuit breaker, bulkhead, cancellation, logging, and metrics patterns have been searched before adding new shapes.
- If repeated attempts move money, credits, permissions, inventory, personal data, provider state, queue settlement, or durable business state, also apply the relevant payment, credit, security, idempotency, queue, transaction, or failure skill.

<!-- mustflow-section: allowed-edits -->
## Allowed Edits

- Add or tighten bounded attempts, total deadline, per-attempt timeout, cancellation propagation, exponential backoff with jitter, `Retry-After` handling, retry predicates, dependency-specific policy, idempotency key reuse, safe body replay checks, and focused retry tests.
- Remove or bound infinite retry loops, nested retry multiplication, broad catch-and-retry branches, fixed sleeps that synchronize callers, retries inside transactions or locks, and retry wrappers that erase diagnostic cause, status code, retry-after, or request id.
- Move retry policy to a caller-owned or dependency-owned boundary when local architecture requires one source of truth instead of several hidden layers.
- Add observability for attempts, final exhaustion, cancellation, retry-after, delay, dependency name, operation name, request id, safe business key, and retry decision.
- Do not add live provider calls, load tests, local servers, queue workers, watchers, or manual dashboards outside the configured command contract.
- Do not treat a retry policy as proof of idempotency, queue safety, transaction safety, circuit-breaker safety, or overload protection without the matching evidence.

<!-- mustflow-section: procedure -->
## Procedure

1. Count the retry layers before judging one loop.
   - Build the chain from caller to dependency: UI, API gateway, handler, service, repository, SDK, driver, proxy, queue, worker, and provider.
   - Multiply the attempts. Three layers with three attempts each can turn one user action into 27 dependency calls.
   - Treat SDK defaults as real retries until current code or documentation proves they are disabled or bounded.
2. Check for infinite or open-ended retry.
   - Search around `while true`, `for (;;)`, recursive retry, `retryUntilSuccess`, `do while`, `catch` followed by sleep, and framework retry annotations.
   - Require both max attempts and max elapsed time when the path can hold a request, worker, connection, lock, transaction, or queue slot.
   - A capped backoff without a stop condition is still an infinite retry with nicer pacing.
3. Separate per-attempt timeout from total deadline.
   - A 3 second per-attempt timeout with 5 attempts can exceed the caller's useful deadline.
   - Include DNS lookup, TCP connect, TLS handshake, connection pool wait, request body upload, response header wait, response streaming, and response parsing in the budget where the client supports it.
   - If the caller cancels, retry sleep and in-flight attempts should stop.
4. Review retry predicates.
   - Retry transient dependency failures, rate limits, and specific timeout classes only when the operation is safe to repeat.
   - Do not retry validation errors, authorization failures, not-found errors that mean permanent absence, payload errors, deterministic constraint violations, cancellation, or programmer bugs.
   - Broad `catch (Exception)`, `catch (error)`, or equivalent retry can turn bad input and bugs into traffic storms.
5. Treat unknown outcomes as dangerous.
   - A timeout after sending a request is not proof that the provider did nothing.
   - Before retrying payment, email, shipment, entitlement, file creation, external object creation, or any non-idempotent provider command, require idempotency, provider lookup, reconciliation, or a reported unknown-outcome risk.
6. Check idempotency key reuse.
   - A new key per attempt defeats provider idempotency.
   - A key that is not bound to actor, tenant, operation type, target resource, and payload fingerprint can replay the wrong operation.
   - Conditional idempotency should be explicit for POST, PATCH, webhook, queue, batch, and scheduler retries, not only for "unsafe" HTTP verbs.
7. Keep retries out of transactions and locks unless deliberately bounded.
   - Retrying while holding a DB transaction, row lock, mutex, semaphore, distributed lock, or advisory lock can hold scarce resources while waiting.
   - If the retry is a transaction retry, retry the whole transaction from a clean start and verify side effects happen after commit or through an outbox.
   - If the retry is inside a lock, name why the lock must be held and prove the wait is short and bounded.
8. Check pool and concurrency pressure.
   - Retrying after timeouts can keep sockets, DB connections, workers, threads, or queue in-flight slots occupied longer than the original call.
   - Bound concurrent retries with a bulkhead, semaphore, worker pool, token bucket, or dependency-specific limiter sized to downstream capacity.
   - Avoid unbounded `Promise.all`, goroutine, task, or thread fan-out wrapped in retry.
9. Review backoff and jitter.
   - Fixed sleeps synchronize clients and create waves.
   - Exponential backoff needs jitter and a cap, but the cap does not replace max attempts or max elapsed time.
   - Respect `Retry-After` for 429 and 503 when trusted, parse both seconds and dates if the stack requires it, clamp unreasonable values, and record the decision.
10. Separate global and per-key throttling.
    - A global token bucket can let one noisy tenant spend the whole retry budget.
    - A per-key backoff can protect one hot resource while allowing unrelated traffic to continue.
    - Reset per-key failure counters after a confirmed success; stale failure counters can punish healthy traffic long after recovery.
11. Order resilience tools deliberately.
    - Timeout, retry, circuit breaker, bulkhead, token bucket, and fallback are not interchangeable.
    - Prefer a clear order such as acquire bulkhead capacity, enforce total deadline, attempt with per-attempt timeout, classify error, apply retry budget and backoff, and let circuit breaker observe final or configured per-attempt outcomes according to local policy.
    - A circuit breaker outside a retry loop sees one final failure; inside it sees every failed attempt. Pick intentionally.
12. Preserve error identity through wrappers.
    - Retry wrappers should keep cause, status code, retry-after, provider error code, request id, correlation id, attempt count, and final exhaustion reason.
    - Do not replace every exhausted retry with a generic "failed" error that hides whether the caller should retry, fix input, wait, or open an incident.
13. Check committed responses and streaming bodies.
    - Once a response is committed to a client, retrying the next side effect can create server truth that the caller cannot observe.
    - Request or upload bodies may not be replayable after the first attempt unless buffered safely and within memory limits.
    - Streaming downloads, uploads, and partial writes need explicit resume, restart, or no-retry policy.
14. Review queue and broker overlap.
    - Application retry plus broker redelivery plus DLQ retry can multiply attempts and delay poison-message isolation.
    - Ack, delete, commit, side effect, and retry ordering should be explicit so a retry does not both duplicate work and hide failure from the broker.
    - Treat broker retry count and app retry count as one combined budget when possible.
15. Review dependency-specific configuration.
    - HTTP, DB, Redis, object storage, message brokers, payment providers, email services, search services, and caches have different safe retry status codes, timeout fields, request replay rules, and rate-limit headers.
    - Avoid one generic retry helper for every dependency unless the dependency policy is injected or selected explicitly.
16. Require retry observability.
    - Logs should distinguish attempt, delay, status, dependency, operation, retryable decision, final exhaustion, cancellation, and safe request identity.
    - Metrics should expose attempts_total, retry_exhausted_total, retry_delay, retry_after_used, cancellation, circuit-open decisions, and dependency-specific labels with bounded cardinality.
    - A single final error log after all retries is often too late to explain an incident.
17. Require tests beyond "two failures then success."
    - Good tests cover permanent failure not retried, max attempts, max elapsed time, total deadline, cancellation during sleep, retry-after parsing and clamping, jitter boundedness, idempotency key reuse, unknown outcome, pool or concurrency limit, and wrapper cause preservation.
    - If deterministic timing tests are hard, use fake clocks, injected sleeper, injected retry policy, or local test helpers already present in the repository.
    - If configured integration evidence is missing, report static risk and the missing manual or integration proof instead of approving the retry path.

<!-- mustflow-section: postconditions -->
## Postconditions

- Retry layers, attempt multiplication, max attempts, max elapsed time, per-attempt timeout, total deadline, retry predicate, backoff, jitter, `Retry-After`, cancellation behavior, side-effect replay safety, idempotency key reuse, transaction or lock placement, pool pressure, throttling, circuit-breaker ordering, wrapper diagnostics, queue overlap, dependency policy, observability, and retry tests are explicit.
- Infinite retry, broad catch-and-retry, permanent-error retry, unknown-outcome replay, new idempotency key per attempt, fixed-sleep herd behavior, retry inside long transaction or lock, pool exhaustion, app-plus-broker retry multiplication, stale failure counters, wrapper cause loss, committed-response retry, non-replayable body retry, cancellation-ignoring sleep, and missing retry metrics are fixed or reported.
- Retry-safety claims are backed by configured tests, dependency or framework evidence matched to current code, schema or idempotency evidence, static review evidence, or labeled as manual-only or missing.

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

Prefer the narrowest configured test, build, docs, release, or mustflow intent that covers the changed retry policy and synchronized template surfaces. Do not infer raw load tests, live dependency calls, queue servers, local watchers, browser sessions, chaos tests, or manual dashboards outside the command contract.

<!-- mustflow-section: failure-handling -->
## Failure Handling

- If a configured command fails, preserve the failing intent, failing assertion or output tail, and the retry invariant it exercised before editing again.
- If retry layers cannot be enumerated, report that the path is not reviewable for retry amplification yet.
- If the retry predicate cannot distinguish transient from permanent failure, report the missing classification instead of accepting a broad retry.
- If safe repair requires provider idempotency, durable operation records, queue or broker configuration, circuit-breaker architecture, dependency-specific client policy, fake-clock test infrastructure, load testing, or integration replay outside the current scope, report the missing boundary.
- If deterministic retry proof is not configured, complete available verification and report the missing manual or integration evidence.

<!-- mustflow-section: output-format -->
## Output Format

- Retry policy boundary reviewed
- Retry surface, layered retry ledger, attempt budget, timeout and deadline, retry predicate, unknown outcome, side-effect and idempotency key, transaction or lock placement, pool and concurrency pressure, backoff and jitter, `Retry-After`, global or per-key throttling, resilience-tool ordering, wrapper diagnostics, committed response or streaming body, queue or broker overlap, dependency policy, observability, and test evidence findings
- Retry-policy fixes made or recommended
- Evidence level: configured-test evidence, dependency or framework evidence, schema or idempotency evidence, static review risk, manual-only, missing, or not applicable
- Command intents run
- Skipped retry diagnostics and reasons
- Remaining retry-policy-integrity risk
