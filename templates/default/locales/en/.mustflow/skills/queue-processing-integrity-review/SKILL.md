---
mustflow_doc: skill.queue-processing-integrity-review
locale: en
canonical: true
revision: 1
lifecycle: mustflow-owned
authority: procedure
name: queue-processing-integrity-review
description: Apply this skill when code is created, changed, reviewed, or reported and queue, stream, pub/sub, broker, worker, task, job, consumer, producer, webhook handoff, DLQ, retry, redelivery, visibility timeout, offset commit, message ack, nack, reject, delete, publisher confirm, prefetch, rebalance, FIFO group, deduplication, or worker-loss behavior can lose work, duplicate work, hide poison messages, reorder state, exhaust consumers, or falsely claim processing success.
metadata:
  mustflow_schema: "1"
  mustflow_kind: procedure
  pack_id: mustflow.core
  skill_id: mustflow.core.queue-processing-integrity-review
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

# Queue Processing Integrity Review

<!-- mustflow-section: purpose -->
## Purpose

Review queue processing by starting at the success boundary, not at dashboard lag or the top of the handler.

The core question is not "is the worker running?" It is "when does this code declare the message finished, and what state or side effect can still be missing, duplicated, reordered, or invisible after that declaration?"

<!-- mustflow-section: use-when -->
## Use When

- Code creates, changes, reviews, or reports queue consumers, producers, stream processors, task workers, pub/sub handlers, delayed jobs, schedulers, webhooks handed to queues, DLQ replayers, retry workers, or batch consumers.
- Code calls or configures message acknowledgement, negative acknowledgement, reject, delete, visibility timeout, offset commit, publisher confirm, prefetch, concurrency, rebalance listeners, FIFO message groups, deduplication IDs, task acknowledgements, worker-loss behavior, dead-letter routing, or poison-message handling.
- Kafka, RabbitMQ, SQS, Celery, BullMQ, Sidekiq, Redis streams, Pub/Sub, NATS, Kinesis, Azure queues, or local equivalents appear in the changed path.
- A review or final report claims queue work is processed, durable, at-least-once, exactly-once, idempotent, retry-safe, backpressured, ordered, dead-lettered, observable, or safe after worker crash.

<!-- mustflow-section: do-not-use-when -->
## Do Not Use When

- The task is primarily duplicate business intent across HTTP retries, webhooks, schedulers, or batch replays; use `idempotency-integrity-review` first and this skill for queue-specific delivery boundaries.
- The task is primarily swallowed exceptions, false success, unsafe fallback, timeout honesty, cancellation, or public error shape; use `failure-integrity-review` first and this skill for message settlement behavior.
- The task is primarily transaction isolation, rollback, outbox, after-commit, or read-decision-write atomicity; use `transaction-boundary-integrity-review` first and this skill for broker settlement.
- The task is primarily database query speed, cache correctness, API latency, or generic hot-path performance with no broker, worker, or redelivery surface.
- The queue path is read-only telemetry where dropped or duplicate messages are explicitly acceptable and no state, audit, billing, permission, notification, or external side effect depends on it.

<!-- mustflow-section: required-inputs -->
## Required Inputs

- Broker and delivery model: queue or stream type, at-least-once or at-most-once assumptions, message identity, partition or group key, ordering requirement, redelivery behavior, and retention or visibility rules.
- Success boundary: exact ack, delete, commit, confirm, mark-complete, task-ack, batch-commit, or checkpoint call and every fallible operation before and after it.
- Producer boundary: enqueue, publish, send, transaction commit, outbox write, publisher confirm, broker response, retry behavior, and what happens when DB commit and publish split.
- Consumer state ledger: DB writes, external calls, emails, payments, inventory, cache writes, file writes, queue publishes, metrics, logs, audit entries, idempotency records, inbox records, and outbox records.
- Failure and retry policy: transient versus permanent failure, poison message classification, retry budget, backoff, jitter, DLQ threshold, requeue behavior, visibility extension, stuck in-flight recovery, and manual replay policy.
- Concurrency and ordering evidence: consumer parallelism, batch size, prefetch, thread pool, async handler ownership, per-key ordering, FIFO group cardinality, rebalance behavior, partition revoke handling, and in-progress commit fences.
- Observability evidence: message id, correlation id, attempt, age or queue delay, processing time, ack or commit decision, retry-after, DLQ reason, poison classification, worker-loss signal, and reconciliation signal.
- Test evidence: ack-before-work tests, work-before-ack crash tests, duplicate redelivery tests, poison message tests, visibility timeout tests, offset commit tests, publisher failure tests, rebalance tests, DLQ replay tests, and configured command intents.

<!-- mustflow-section: preconditions -->
## Preconditions

- The task matches the Use When conditions and does not match the Do Not Use When exclusions.
- Higher-priority instructions and `.mustflow/config/commands.toml` have been checked for the current scope.
- Required broker, success-boundary, producer-boundary, retry, ordering, and observability evidence is available, or the missing evidence can be reported without guessing.
- Existing local patterns for consumers, producers, inbox, outbox, idempotency, retry, DLQ, partition or group ordering, worker shutdown, and metrics have been searched before adding new shapes.
- If queue processing moves money, credits, permissions, inventory, personal data, customer notifications, or provider calls, also apply the relevant payment, credit, security, idempotency, transaction, failure, or business-rule skill.

<!-- mustflow-section: allowed-edits -->
## Allowed Edits

- Move ack, delete, commit, or task acknowledgement after durable processing when the local broker contract requires it, and make redelivery safe with idempotent handlers or inbox records.
- Add or tighten publisher confirmation, outbox writes, inbox or applied-message records, unique message or event keys, conditional state transitions, DLQ routing, poison-message classification, retry budgets, visibility extension, bounded concurrency, prefetch limits, rebalance hooks, and shutdown drains.
- Separate transient failures from permanent payload failures so invalid messages do not loop forever and temporary outages do not vanish as successful work.
- Add focused tests for the changed settlement, redelivery, ordering, retry, DLQ, and producer-confirm boundary.
- Do not replace durable message integrity with dashboard lag checks, log-only errors, frontend disabling, memory-only dedupe, unlimited parallelism, infinite requeue, or broad catch-and-ack behavior.
- Do not introduce live broker, server, watcher, tunnel, load-test, or manual replay commands outside the configured command contract.

<!-- mustflow-section: procedure -->
## Procedure

1. Start at the settlement call.
   - Search the changed path for `ack`, `nack`, `reject`, `deleteMessage`, `commitSync`, `commitAsync`, `commit`, `checkpoint`, `confirm`, `task ack`, `acks_late`, `autoAck`, `auto.commit`, `visibility`, `prefetch`, `maxReceiveCount`, `MessageGroupId`, `deduplication`, and local equivalents.
   - Treat these terms as anchors, not automatic bugs.
2. Build the message lifecycle.
   - Name the producer, broker, consumer, business handler, durable writes, external side effects, retry path, DLQ path, replay path, and final operator-visible state.
   - Mark which component owns "received", "started", "durably applied", "externally applied", "settled", "retried", "dead-lettered", and "reconciled".
3. Reject ack-before-truth.
   - Ack, delete, commit, or mark-complete before durable work can lose the message when the next line fails.
   - A `finally` block that always acknowledges is usually a discard policy disguised as cleanup.
   - A catch block that logs and returns normally can have the same effect if the framework auto-acks normal returns.
4. Reject unbounded redelivery loops.
   - Blind nack, reject, requeue, or retry on every failure can keep one poison message burning CPU, network, logs, and downstream systems.
   - Require permanent-failure classification, retry count, backoff, jitter, DLQ threshold, and a reason that helps replay or discard safely.
5. Check producer confirmation.
   - A producer that only calls `send` or `publish` may not know the broker durably accepted the message.
   - If local DB commit and queue publish are separate, require outbox, transactional publish support, reconciliation, or a reported split-brain risk.
6. Review async handler ownership.
   - If processing returns a promise, future, coroutine, goroutine, thread, or background task, settlement must wait for the actual work or explicitly record durable handoff.
   - Fire-and-forget work after ack is message loss unless the handoff itself is durable and observable.
7. Review batch settlement.
   - Batch commit after mixed success can skip failed items.
   - Per-item failure handling, partial commit boundaries, ordered stop-on-failure behavior, or replay-safe idempotency should be explicit.
   - Check off-by-one semantics where a committed offset or checkpoint means the next message to read, not the last item processed.
8. Review SQS-style visibility and delete behavior.
   - Receiving a message is not finishing it; delete is the success boundary.
   - Visibility timeout should cover high-percentile processing or be extended with a heartbeat while avoiding recovery delays that are too long.
   - Check stale receipt handles, in-flight limits, DLQ redrive thresholds, and duplicate processing after timeout.
9. Review RabbitMQ-style ack behavior.
   - `autoAck` or equivalent automatic acknowledgement is a loss-prone default for important work.
   - `multiple=true` or bulk ack can acknowledge earlier concurrent deliveries that have not finished.
   - Ack should happen on the owning channel or equivalent delivery context.
   - Prefetch should bound unacknowledged work instead of loading unlimited messages into consumer memory.
10. Review Kafka-style offset behavior.
    - Auto-commit can move the durable cursor ahead of handler completion.
    - Manual commits should reflect only records actually processed.
    - Long processing should respect poll intervals, pause or resume behavior, worker handoff, and rebalance revoke handling so ownership changes do not lose or duplicate in-flight records unexpectedly.
11. Review Celery-style task acknowledgement.
    - Default early acknowledgement can mark a task complete before work runs.
    - Late acknowledgement helps only when tasks are idempotent and worker-loss behavior is configured for the desired redelivery semantics.
    - Broad auto-retry over every exception can turn invalid payloads into poison-message loops.
12. Review ordering and concurrency.
    - FIFO groups, Kafka partitions, per-tenant locks, entity keys, and aggregate ordering should match the business ordering requirement.
    - One global group can serialize the whole system; a unique group for every message can destroy per-entity ordering.
    - Parallel consumers need idempotency and conditional state transitions for redelivery and out-of-order completion.
13. Review side-effect ordering.
    - Email, payment, entitlement, stock, file conversion, webhooks, provider calls, and downstream publishes should not be able to run twice without a durable operation key.
    - If side effects happen before completion markers, crash recovery needs idempotency, provider lookup, reconciliation, or compensation.
14. Review DLQ as a workflow, not a bucket.
    - DLQ entries need reason, attempt count, original queue, message identity, safe payload summary, replay eligibility, and alerting or ownership.
    - A DLQ consumer or replay tool can repeat the same bug if it lacks idempotency, ordering, and poison classification.
15. Review backpressure and resource bounds.
    - Unlimited `Promise.all`, unbounded goroutines, huge prefetch, large batch size, or worker pools detached from DB and HTTP pool limits can move the bottleneck from broker lag to consumer collapse.
    - Bound concurrency by downstream capacity and message processing cost.
16. Review shutdown, cancellation, and worker loss.
    - A worker should stop receiving new work, finish or safely abandon in-progress work, and avoid acknowledging work that did not complete.
    - Cancellation should not be swallowed as success.
17. Review observability at decision points.
    - Logs and metrics should record the decision: processed, acknowledged, committed, retried, delayed, dead-lettered, discarded, or unknown.
    - Useful fields include message id, correlation id, attempt, queue delay, processing duration, ack or commit result, retry-after, DLQ reason, and safe business key.
    - "Received message" alone is not incident evidence.
18. Require replay-path evidence.
    - Good tests or integration checks cover duplicate delivery, handler failure before settlement, settlement failure after durable commit, poison payload, delayed redelivery, visibility expiry, rebalance, worker crash, DLQ replay, and producer publish failure.
    - If deterministic broker evidence is not configured, report static risk and missing manual or integration proof instead of approving the path.

<!-- mustflow-section: postconditions -->
## Postconditions

- The producer acceptance boundary, consumer settlement boundary, durable state boundary, retry or DLQ policy, ordering guarantee, resource bounds, shutdown behavior, and replay story are explicit.
- Ack-before-work, catch-and-ack, finally-ack, auto-ack, stale receipt handle, premature offset commit, batch partial-failure skip, unbounded requeue, poison-message loops, unsafe visibility timeout, in-flight saturation, FIFO group misuse, worker-loss false success, producer publish split, side-effect duplication, and observability gaps are fixed or reported.
- Queue safety claims are backed by configured tests, broker or framework evidence matched to current code, schema or idempotency evidence, static review evidence, or labeled as manual-only or missing.

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

Prefer the narrowest configured test, build, docs, release, or mustflow intent that covers the changed queue processing boundary and synchronized template surfaces. Do not infer raw broker commands, local servers, live queue workers, replay scripts, load tests, watchers, tunnels, or manual dashboards outside the command contract.

<!-- mustflow-section: failure-handling -->
## Failure Handling

- If a configured command fails, preserve the failing intent, failing assertion or output tail, and the queue-processing invariant it exercised before editing again.
- If the success boundary cannot be found, report that the queue path is not reviewable for processing integrity yet.
- If the broker delivery semantics are unknown, report the missing broker contract instead of assuming exactly-once behavior.
- If safe repair requires schema migration, outbox, inbox, durable dedupe, broker configuration, DLQ operator workflow, visibility heartbeat, rebalance architecture, or integration replay harness outside the current scope, report the missing durable boundary.
- If deterministic broker proof is not configured, complete available verification and report the missing manual or integration evidence.

<!-- mustflow-section: output-format -->
## Output Format

- Queue processing boundary reviewed
- Broker model, producer confirm, consumer settlement, durable state, side effects, retry or DLQ policy, visibility or offset or ack behavior, batch behavior, ordering, concurrency, shutdown, observability, and replay evidence findings
- Queue-processing fixes made or recommended
- Evidence level: configured-test evidence, schema or idempotency evidence, broker or framework evidence, static review risk, manual-only, missing, or not applicable
- Command intents run
- Skipped queue diagnostics and reasons
- Remaining queue-processing-integrity risk
