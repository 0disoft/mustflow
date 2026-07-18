---
mustflow_doc: skill.idempotency-integrity-review
locale: en
canonical: true
revision: 3
lifecycle: mustflow-owned
authority: procedure
name: idempotency-integrity-review
description: Apply this skill when code is created, changed, reviewed, or reported and repeated or out-of-order requests, retries, webhooks, queue delivery, schedulers, batch replays, callbacks, timeouts, or stale asynchronous completions could apply one logical business operation more than once, regress aggregate state, or let an old decision overwrite newer authority.
metadata:
  mustflow_schema: "1"
  mustflow_kind: procedure
  pack_id: mustflow.core
  skill_id: mustflow.core.idempotency-integrity-review
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

# Idempotency Integrity Review

<!-- mustflow-section: purpose -->
## Purpose

Review idempotency as operation identity plus state-validity integrity, not as an HTTP method
checklist.

The review question is not only "is this POST protected?" It is "if the same business intent is
delivered twice, completes out of order, or acts on authority that has changed, which durable gate
deduplicates the operation or rejects the stale result?"

<!-- mustflow-section: use-when -->
## Use When

- Code creates, changes, reviews, or reports POST, PATCH, DELETE, webhook, callback, queue consumer, scheduler, batch, retry, timeout recovery, mobile app retry, browser refresh, double-click, provider callback, external API call, background job, or late asynchronous completion behavior.
- The operation can charge, capture, refund, withdraw, grant points, deduct credits, deduct stock, issue coupons, send email, create shipments, grant entitlements, change status, publish events, acknowledge messages, or call providers.
- Idempotency keys, event IDs, message IDs, request IDs, operation or attempt IDs, provider object IDs, aggregate versions, generation or fencing tokens, inbox or outbox records, dedupe tables, processing states, retry libraries, locks, ordering groups, or duplicate request responses are introduced, changed, reviewed, or claimed safe.
- A review or final report claims an operation is idempotent, retry-safe, duplicate-safe, exactly-once, safe to replay, safe to reprocess, safe after timeout, protected by frontend disabling, protected by Redis, protected by a lock, or protected by provider idempotency.

<!-- mustflow-section: do-not-use-when -->
## Do Not Use When

- The task is primarily payment-provider, checkout, refund, subscription, settlement, chargeback, or fulfillment integrity; use `payment-integrity-review` first and this skill only for generic duplicate-intent details not covered there.
- The task is primarily credit, point, wallet, balance, stored-value, ledger, expiry, or reservation integrity; use `credit-ledger-integrity-review` first and this skill only for generic duplicate-intent details not covered there.
- The task is primarily read -> decision -> write atomicity, isolation, locks, rollback, transaction propagation, or after-commit ordering; use `transaction-boundary-integrity-review` first and this skill as the duplicate-delivery adjunct.
- The task is primarily stale shared state, lock scope, or generic interleaving with no duplicate logical operation or retry surface; use `race-condition-review` or `concurrency-invariant-review`.
- The task is primarily swallowed failures, false success, timeout honesty, queue ack/nack honesty, fallback defaults, or public error contracts; use `failure-integrity-review`.
- The operation is a pure read with no hidden write, usage charge, read receipt, analytics commitment, cache mutation that matters, external call, or durable side effect.
- The main failure is divergence after two systems can commit independently; use `dual-write-consistency` first. Keep duplicate delivery and duplicate intent handling here.
- The main failure is a lying or incomplete run, attempt, checkpoint, or effect receipt; use `execution-ledger-integrity-review`.

<!-- mustflow-section: required-inputs -->
## Required Inputs

- Operation identity ledger: logical operation, attempt, effect, actor, tenant, target resource, business operation type, canonical payload hash, idempotency key, event ID, message ID, provider object ID, batch key, scheduler run key, and retry source.
- Ordering and authority ledger: aggregate key, ordering scope, observed state, expected state, aggregate version, sequence, generation, fencing token, gap policy, stale-result decision, and authoritative conditional write.
- Side-effect ledger: every charge, refund, balance change, stock change, coupon issue, shipment, email, notification, entitlement, status transition, file write, queue publish, cache change, provider call, and audit entry.
- Durable dedupe evidence: unique constraints, idempotency table, inbox table, outbox table, applied event table, ledger source key, conditional update, state guard, provider idempotency key, and response record.
- Duplicate response policy: cached success response, duplicate conflict response, in-progress response, payload mismatch response, failed validation response, unknown outcome recovery, and caller-visible retry contract.
- Concurrency and recovery evidence: simultaneous duplicate requests, process restart, TTL expiry, `PROCESSING` stuck state, lease, heartbeat, retry budget, timeout classification, provider lookup, reconciliation, and lock fallback.
- Queue, webhook, scheduler, and batch evidence: ack timing, redelivery semantics, event ordering scope, partition or group key derivation, missing-sequence handling, signature checks, event storage, per-aggregate ordering, reprocessing rules, and run-level uniqueness.
- Test evidence: duplicate request tests, concurrent duplicate tests, timeout-then-retry tests, external-success-internal-failure tests, DB-success-response-failure tests, duplicate webhook tests, stale event tests, ack-failure tests, and configured command intents.

<!-- mustflow-section: preconditions -->
## Preconditions

- The task matches the Use When conditions and does not match the Do Not Use When exclusions.
- Higher-priority instructions and `.mustflow/config/commands.toml` have been checked for the current scope.
- Required inputs are available, or missing operation identity, durable dedupe, response replay, timeout recovery, queue, webhook, scheduler, batch, or test evidence can be reported without guessing.
- Existing local patterns for idempotency keys, operation IDs, inbox, outbox, provider keys, ledgers, locks, retries, processing leases, duplicate responses, and reconciliation have been searched before adding new shapes.
- If the duplicate operation affects money, credits, permissions, personal data, inventory, orders, external providers, or durable events, also apply the relevant payment, credit, security, transaction, state-machine, cache, or failure skill.

<!-- mustflow-section: allowed-edits -->
## Allowed Edits

- Add or tighten durable idempotency records, canonical payload hash comparison, user and tenant binding, operation-type binding, target-resource binding, unique non-null constraints, atomic insert-or-return behavior, aggregate versions, generation or fencing tokens, gap handling, conditional state guards, affected-row checks, inbox records, outbox records, applied-event ledgers, provider result lookup, response replay, processing lease recovery, and focused duplicate or stale-order tests.
- Move external side effects behind durable operation records or outbox records when local style supports it.
- Make retry classification explicit for validation failure, transient failure, timeout with unknown outcome, provider success with local failure, local success with missing response, duplicate in progress, and duplicate completed.
- Do not treat frontend button disabling, debounce, in-memory flags, Redis TTL alone, provider idempotency alone, or distributed locks alone as final proof of idempotency.
- Do not treat cancellation, process-local single-flight, FIFO naming, timestamps, arrival order, or auto-increment identifiers as durable proof that a late result is current.
- Do not make duplicate protection by returning a different success shape unless the caller contract can safely reconcile it.

<!-- mustflow-section: procedure -->
## Procedure

1. Name the logical operation, not only the endpoint.
   - POST, PATCH, DELETE, webhook, queue consumer, scheduler, batch replay, retry wrapper, and callback handlers can all carry the same duplicate-intent risk.
   - Ask what "same intent" means in business terms: same order payment attempt, same refund, same point grant, same coupon redemption, same shipment, same notification, same state transition, same imported row, or same provider event.
   - Separate the stable operation ID from attempt, message, event, effect, trace, worker, and provider IDs. Generate a new attempt ID for a retry without generating a new business operation.
2. Start at the side effect.
   - Find calls and writes named like `charge`, `capture`, `refund`, `withdraw`, `grantPoint`, `deductStock`, `issueCoupon`, `sendEmail`, `createShipment`, `publish`, `ack`, `markPaid`, `fulfill`, and local equivalents.
   - For each side effect, ask what happens if the exact surrounding handler runs twice, runs concurrently, or runs after the first response is lost.
3. Review idempotency key scope.
   - A key is not enough unless it is bound to actor, tenant, operation type, target resource, and request body hash or equivalent semantic fingerprint.
   - Duplicate key plus changed amount, resource, user, tenant, product, operation, or payload should become a stable mismatch response, not a new operation or silent old response.
   - Do not accept memory-only stores, process-local maps, or Redis TTL alone for operations that can be retried after restart, failover, delayed callback, or TTL expiry.
   - Keep the operation key stable across request, durable operation record, inbox or outbox, external effect, result lookup, and response replay.
4. Require durable uniqueness at the operation boundary.
   - App-only `if exists return` followed by `insert` is a race. Use a unique constraint, atomic insert, upsert, conditional write, or durable ledger key.
   - Review migrations or schema definitions, not just service code, for keys such as `order_id`, `payment_id`, `refund_id`, `event_id`, `message_id`, `idempotency_key`, `campaign_id + user_id`, and `settlement_date + merchant_id`.
   - Where the key is required, verify that the authoritative uniqueness field cannot be null and that a matching key with a different canonical payload or binding is rejected.
5. Check response replay.
   - Idempotency is often needed because the caller did not receive the first response.
   - A duplicate completed request should usually return the original response or an equivalent stable result the caller can reconcile.
   - A duplicate in-progress request should have an explicit wait, poll, retry-later, or conflict response contract.
6. Classify failed attempts.
   - Validation failures, authorization failures, duplicate-key payload mismatches, technical failures before side effects, unknown outcomes after side effects, and durable completed failures need different caching and retry rules.
   - Caching every failure can block recovery. Re-executing every failure can duplicate side effects.
7. Treat timeouts as unknown outcomes.
   - A timeout after submitting a provider request is not proof of failure.
   - Before retrying charge, refund, shipment, SMS, email, entitlement, or external creation calls, look up provider state by operation key, provider object ID, or idempotency key, then continue from the known result.
8. Check external API ordering.
   - External API call before durable local operation record creates duplicate risk when the local process times out or crashes before saving success.
   - Provider idempotency can protect the provider call while internal follow-up work still duplicates. Internal idempotency remains required.
9. Define the ordering scope and authority token.
   - Name the smallest aggregate whose operations require order. Transport grouping or partitioning proves order only inside its documented scope and does not prove that application or external effects complete in that order.
   - Prefer an aggregate version, store revision, generation, or fencing token created for authority. Do not infer causality from wall-clock time, retry time, arrival time, or auto-increment identifiers.
   - Define older-or-equal, exactly-next, and ahead-with-a-gap branches. Bound buffering or retry, name the resynchronization owner, and keep stuck gaps observable.
10. Review state transitions as conditional operations.
   - `UPDATE ... SET status = PAID WHERE id = ?` is weaker than `WHERE id = ? AND status = PENDING` or an equivalent state-machine guard.
   - Carry expected state, version, generation, or fence to the authoritative write. Treat zero affected rows or a failed compare-and-swap as a stale decision that requires re-reading authority, not blind replay of the old calculation.
   - Late duplicate events should not overwrite terminal, newer, or higher-order states. Event time alone is not an authority token.
11. Separate cancellation and request coalescing from correctness.
   - Cancellation requests cleanup; it does not revoke callbacks, cache writes, durable commits, or external effects that already completed.
   - Process-local single-flight reduces duplicate load but loses authority across instances, restart, failover, and leader change. Keep durable operation identity and storage guards behind it.
12. Prefer order-insensitive mutations when the domain permits them.
   - An immutable operation or ledger entry with a stable operation ID can be safer than replacing a full snapshot.
   - Commutative application does not remove duplicate risk. Deduplicate operation identity and model reversal or compensation as another identified operation.
13. Review increments and ledger entries.
    - `+=`, balance increases, point grants, stock deductions, usage counters, retry counters, and mutable totals duplicate naturally.
    - Require an applied-event table, source ledger key, unique entry identity, conditional update, or state transition that records the event already moved the number.
14. Review deletion and "read" endpoints for hidden side effects.
    - DELETE may be final-state idempotent while refund, notification, inventory restoration, audit, or permission side effects still duplicate.
    - GET endpoints that mark read, accept invites, decrement quota, create download usage, or mutate analytics are not harmless reads under crawler, preview, refresh, or retry behavior.
15. Review queues and consumers as at-least-once by default.
    - Consumer code should assume duplicate messages, delayed redelivery, concurrent workers, ack failure after commit, and process death after side effects.
    - Store message ID, event ID, business key, or source ledger key in an inbox or applied-event table before applying irreversible effects.
16. Review ack timing.
    - Ack before durable commit can lose work.
    - Ack after durable commit can redeliver work.
    - Prefer accepting redelivery and making the handler idempotent, with dead-letter and retry evidence for poison messages.
17. Review webhook handlers as replay surfaces.
    - External providers resend callbacks when they miss acceptable responses.
    - Store event IDs or provider object/type pairs, verify signatures, bind the event to the expected business object, and guard state transitions against duplicates and stale event order.
18. Review schedulers and batches.
    - Jobs are rerun after deploys, crashes, partial failures, and manual operator actions.
    - Use business keys such as `settlement_date + merchant_id`, `campaign_id + user_id`, import file row identity, period key, or run source ID instead of loose "already processed yesterday" checks.
19. Review outbox and inbox pairing.
    - DB change plus message publish can split when either side succeeds alone.
    - Route the convergence protocol for independently committed effects to `dual-write-consistency`. Keep inbox, applied-event, and duplicate-delivery handling in this skill.
20. Review saga compensation.
    - Route compensation order and resumable saga state to `durable-workflow-orchestration`. Compensation actions such as cancel, refund, release stock, revoke entitlement, or restore credits still need idempotency keys tied to the original action here.
    - Double compensation can be worse than the original failure.
21. Review `PROCESSING` and lease recovery.
    - A `PROCESSING` row without lease, heartbeat, timeout, owner, or reconciliation can permanently block retries after a crash.
    - A stale processing record should recover by verifying side effects and either completing, failing safely, or allowing one fenced owner to continue.
22. Review locks as helpers, not proof.
    - Distributed locks can expire, split ownership, or pause through stop-the-world events.
    - Keep durable uniqueness, conditional writes, state guards, idempotency records, or fencing tokens as the final defense.
23. Read [Operation Identity, Ordering, and Stale-Write Checklist](references/operation-ordering-stale-write-checklist.md) when duplicate delivery, out-of-order completion, aggregate sequencing, or stale writes intersect.
24. Check grep bait near the operation.
    - Review code around `Idempotency-Key`, `request_id`, `event_id`, `message_id`, `operation_id`, `attempt_id`, `effect_id`, `aggregate_version`, `generation`, `fencing`, `dedupe`, `inbox`, `outbox`, `retry`, `timeout`, `Promise.all`, `ack`, `nack`, `visibility timeout`, `webhook`, `scheduler`, `batch`, `cron`, `PROCESSING`, `SUCCEEDED`, `FAILED`, `lock`, `singleflight`, `Redis`, `send`, `publish`, `charge`, `refund`, `grant`, `deduct`, `createShipment`, and `cache`.
    - These terms are anchors, not automatic bugs.
25. Require duplicate, ordering, and stale-write evidence.
    - Good tests include same request twice, concurrent duplicate requests, duplicate key with changed payload, later aggregate version before an earlier version, a missing-version gap, two attempts reading one authority, stale completion after a new generation or owner, first response lost, external success followed by DB failure, DB success followed by response failure, webhook replay, consumer commit followed by ack failure, batch rerun, and processing-stuck recovery.
    - If deterministic proof is not configured, report static risk and missing manual or integration evidence instead of approving the path.

<!-- mustflow-section: postconditions -->
## Postconditions

- The logical operation and attempt identities, duplicate sources, ordering aggregate, authority token, gap policy, stale-result decision, side effects, durable operation key, payload binding, response replay contract, timeout recovery, processing recovery, queue or webhook dedupe, scheduler or batch dedupe, outbox or inbox boundary, and adversarial tests are explicit.
- Duplicate business requests, changed-payload key reuse, concurrent `exists` then `insert`, per-retry operation IDs, duplicate increments, timestamp ordering, sequence gaps, stale state overwrites, cancellation-as-rollback, single-flight-as-proof, provider timeout retries, pre-record external calls, duplicate webhook delivery, queue redelivery, scheduler reruns, double compensation, stuck processing rows, weak locks, and frontend-only guards are fixed or reported.
- Duplicate safety claims are backed by configured tests, schema evidence, framework evidence, provider documentation matched to current code, or labeled as static review risk.

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

Prefer the narrowest configured test, build, docs, release, or mustflow intent that covers the changed idempotency boundary and synchronized template surfaces. Do not infer raw load tests, live provider calls, queue servers, database shells, webhook tunnels, schedulers, watchers, or manual replay commands outside the command contract.

<!-- mustflow-section: failure-handling -->
## Failure Handling

- If a configured command fails, preserve the failing intent, failing assertion or output tail, and the duplicate-intent invariant it exercised before editing again.
- If the logical operation identity cannot be named, report that the path is not reviewable for idempotency yet.
- If duplicate prevention depends only on frontend disabling, in-memory flags, cache TTL, provider idempotency, distributed locks, or app-only checks, report the missing durable idempotency gate.
- If a safe fix requires a schema migration, durable idempotency store, inbox, outbox, reconciliation worker, provider lookup, saga state, or integration replay harness outside the current scope, report the missing durable boundary.
- If deterministic duplicate proof is not configured, report the missing manual evidence and complete the configured checks that are available.

<!-- mustflow-section: output-format -->
## Output Format

- Idempotency boundary reviewed
- Logical operation and attempt identity, duplicate sources, ordering aggregate, authority token, gap policy, stale-result decision, side effects, durable dedupe, payload binding, response replay, failure caching, timeout recovery, external provider, state-transition, increment or ledger, DELETE or hidden-read side-effect, queue, webhook, scheduler or batch, outbox/inbox, compensation, processing lease, lock, and test evidence findings
- Idempotency fixes made or recommended
- Evidence level: configured-test evidence, schema evidence, provider or framework evidence, static review risk, manual-only, missing, or not applicable
- Command intents run
- Skipped idempotency diagnostics and reasons
- Remaining idempotency-integrity risk
