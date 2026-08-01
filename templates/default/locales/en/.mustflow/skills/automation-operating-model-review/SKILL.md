---
mustflow_doc: skill.automation-operating-model-review
locale: en
canonical: true
revision: 1
lifecycle: mustflow-owned
authority: procedure
name: automation-operating-model-review
description: Apply this skill when production automation, scheduled jobs, cron, polling, webhooks, events, queues, workers, durable workflows, approval steps, connectors, or operational pipelines are designed, changed, reviewed, or reported and the task must choose trigger responsibilities, prevent missed or duplicate work, detect silent wrong results, place human approval at the irreversible boundary, minimize credentials and personal data, control useful-effect cost, and keep an owned versioned automation registry.
metadata:
  mustflow_schema: "1"
  mustflow_kind: procedure
  pack_id: mustflow.core
  skill_id: mustflow.core.automation-operating-model-review
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

# Automation Operating Model Review

<!-- mustflow-section: purpose -->
## Purpose

Design automation as an owned operating system rather than one large script. Assign discovery,
transport, progress, authority, sensitive-data access, external effects, reconciliation, cost, and
shutdown to explicit components so the automation remains observable and recoverable when events
are missed, messages repeat, workers die, credentials expire, inputs drift, or technically
successful runs produce wrong business results.

<!-- mustflow-section: use-when -->
## Use When

- A task chooses between scheduled execution, polling, webhook or event intake, a task queue, a
  worker, or a durable workflow.
- A production automation may silently stop running, process stale input, emit wrong results while
  returning success, duplicate an external effect, or spread bad output before an operator reacts.
- Human approval, exception routing, shadow execution, canary rollout, kill switches, or staged
  autonomy must be designed around irreversible or broad effects.
- Automation credentials, personal data, queue payloads, provider connectors, logging, rotation,
  egress, or per-run authority need an operating boundary.
- Polling, batching, retries, waiting, cache keys, API calls, LLM tokens, queue workers, or metrics
  need cost controls tied to useful effects rather than raw run count.
- A team needs a versioned automation registry, owner, runbook, review date, schema contract,
  failure policy, or retirement rule.

<!-- mustflow-section: do-not-use-when -->
## Do Not Use When

- The only decision is whether the automation is economically worth building. Use
  `automation-investment-case-review` first.
- The main defect is queue acknowledgement, visibility timeout, offset commit, ordering,
  redelivery, poison-message, or DLQ behavior. Use `queue-processing-integrity-review`.
- The main defect is multi-step checkpoint, timer, callback, compensation, cancellation, or resume
  compatibility. Use `durable-workflow-orchestration`.
- The main defect is duplicate business intent or ambiguous external-effect outcome. Use
  `idempotency-integrity-review` or `execution-ledger-integrity-review`.
- The task is browser-driving reliability. Use `browser-automation-reliability-review`.
- The task only changes cloud spend, secrets, privacy, authorization, retries, notification
  delivery, or deployment rollout after the operating model is already fixed. Use the matching
  specialist skill.

<!-- mustflow-section: required-inputs -->
## Required Inputs

- Business outcome, owner, affected actors, maximum tolerable loss, reversibility, and required
  completion evidence.
- Trigger ledger: time rule, source event, source-of-truth query, replay capability, reconciliation
  window, event occurrence time, arrival time, expected completion time, and missed-run policy.
- Work-transport ledger: intake, dedupe, queue or stream, partition or group key, backlog pattern,
  concurrency, worker, durable workflow, retry owner, DLQ, and manual replay boundary.
- Effect ledger: operation identity, side effect, provider, current state, `UNKNOWN` behavior,
  approval requirement, compensation or forward recovery, receipt, and reconciliation source.
- Automation registry entry: id, owner, purpose, environment, trigger, runtime, schema and code
  versions, data classification, permissions, timeout, budget, retry and failure policy, retention,
  runbook, review deadline, last healthy completion, and retirement state.
- Identity and data ledger: workload identity, credential issuer and TTL, secret reference, broker,
  connector capability, queue fields, personal-data fields, just-in-time access, egress, logging,
  rotation, revocation, and incident owner.
- Observability and cost ledger: expected-run heartbeat, freshness, invariant counters, synthetic
  canary, independent reconciliation, user corrections, provider calls, retries, bytes, compute,
  tokens, useful effects, budgets, metric labels, and automated stop thresholds.

<!-- mustflow-section: preconditions -->
## Preconditions

- Read the current automation definition, event and queue contracts, persistence and effect state,
  provider adapters, identity and secret path, observability, operator controls, tests, and command
  contract before editing.
- Treat exact provider limits, batch sizes, polling recommendations, credential features, pricing,
  and runtime behavior as stale-sensitive evidence that requires current authoritative verification.
- Keep command execution under `.mustflow/config/commands.toml`. This skill does not authorize live
  schedulers, workers, queues, provider calls, credentials, replay, deployment, or production
  mutation.

<!-- mustflow-section: allowed-edits -->
## Allowed Edits

- Add or refine automation registries, trigger and event contracts, intake validation, queue
  envelopes, workflow boundaries, effect ledgers, approval records, connector ports, secret
  references, budgets, observability, kill switches, runbooks, fixtures, tests, docs, route metadata,
  and directly synchronized templates.
- Separate business policy, orchestration, and provider adapters without changing unrelated domain
  behavior.
- Store references and bounded metadata in queue, log, trace, and metric surfaces; do not copy raw
  credentials or unnecessary personal data into new operational stores.
- Do not silently enable automatic execution, production replay, destructive effects, credential
  access, external delivery, deployment, migration, or vendor configuration.

<!-- mustflow-section: procedure -->
## Procedure

1. Confirm that the work is worth automating. If value, accepted outcome, human comparator, or
   maintenance case is unsettled, use `automation-investment-case-review` and keep this review at
   architecture-draft status.
2. Create or inspect the automation registry before designing runtime pieces. Require a stable id,
   owner, purpose, environment, trigger, runtime, data classification, permissions, version,
   timeout, retry and failure policy, cost budget, retention, runbook, review deadline, and last
   healthy completion. Block new work when ownership or required review has expired according to
   repository policy.
3. Classify why execution begins.
   - Use a schedule when clock time or a closed business interval is the cause.
   - Use an event when a state change or fact occurrence is the cause.
   - Use a queue when already-discovered work must survive bursts, backpressure, worker loss, or
     controlled concurrency.
   - Use a durable workflow when several steps, waits, callbacks, approvals, or compensations must
     preserve progress across process loss.
   Do not treat a queue as event discovery or a cron expression as durable progress.
4. Combine roles when loss cost requires it. Use an event for fast reaction and a scheduled
   reconciliation scan for missed or unprocessed facts when the source of truth can be queried.
   If the provider cannot replay an event and no source query exists, classify the intake as
   lossy and add an external receipt, bounded raw reference, or explicit manual recovery path.
5. Keep event time distinct from delivery time. Compute business intervals, accounting periods,
   expiry, and daily boundaries from the authoritative occurrence timestamp and declared timezone
   policy, not queue arrival or worker start time. Pin the input and policy versions used to close
   each interval.
6. Keep intake short and fail closed. Authenticate or verify the source, validate the envelope and
   schema, normalize identity, record safe receipt evidence, deduplicate the source event, enqueue a
   reference-based work item, and return. Do not perform broad provider calls or long business work
   inside a burst-facing intake handler.
7. Design queue behavior through `queue-processing-integrity-review`. Preserve event id, entity
   version, operation key, tenant or partition scope, attempt, and schema version separately. Merge
   superseded observations only when the business operation is safely coalescible; never collapse
   money movement, entitlement, deletion, or another distinct effect merely because a newer event
   exists.
8. Design multi-step progress through `durable-workflow-orchestration`. Let a scheduler discover
   due work, a queue transport independent work units, and a workflow own step state, waits,
   approval, resume, and compensation. Do not leave a server process alive only to sleep or poll for
   a distant completion when a durable timer, delayed message, callback, or resumable wait exists.
9. Make external effects traceable. Record `PLANNED`, `EXECUTING`, `COMMITTED`, `FAILED`, `UNKNOWN`,
   and `RECONCILING` or repository-equivalent states with a stable operation identity. On timeout or
   lost response, query or reconcile provider state before retrying. Route detailed proof through
   `execution-ledger-integrity-review` and `idempotency-integrity-review`.
10. Detect absence, not only errors. Record next expected execution, last started execution, last
    healthy completion, latest source event time, latest processed event time, and freshness lag.
    Alert when expected evidence is missing even if failure count is zero.
11. Verify business invariants independently. Reconcile discovered, accepted, skipped, succeeded,
    failed, pending, and quarantined counts; preserve ledger totals; compare source and result
    freshness; and sample results through an independent query, calculation, or source. A process
    exit code, HTTP 200, queue ACK, or shared implementation is not business-correctness proof.
12. Send synthetic canaries through the real path when safe. Exclude them from billing and product
    analytics while preserving actual intake, queue, workflow, connector, storage, and notification
    boundaries. Record the expected terminal evidence and maximum arrival time.
13. Install brakes before acceleration. When duplicate rate, invariant drift, freshness lag, cost,
    permission failures, or harmful-result signals exceed a declared threshold, stop new effects,
    pause or reduce consumption, quarantine work, preserve inputs and versions, and page the owner.
    Repeated alerts without automatic containment are observation, not control.
14. Place human authority at the commit boundary. Base approval on reversibility, blast radius,
    money, permissions, deletion, public communication, and legal or contractual effect—not task
    complexity or whether AI is involved. Let automation gather, calculate, validate, and prepare;
    require approval only immediately before the irreversible effect. Bind approval to normalized
    action input, target, policy and version hash, expiry, and approver identity.
15. Route exceptions instead of approval theater. Automatically execute the proven low-risk normal
    lane, escalate novel, conflicting, incomplete, high-value, or threshold-adjacent cases, and
    calibrate confidence against observed error by segment. Randomly inspect a bounded sample of the
    automatic lane and return a segment to approval mode when drift appears.
16. Increase authority in stages: shadow comparison, recommendation, approval-gated execution,
    bounded automatic execution, then evidence-backed expansion. Keep per-run, per-actor, per-tenant,
    per-day, and per-version caps plus an immediate stop path. Separate requester and approver for
    effects whose insider-abuse risk remains material.
17. Minimize identity and data through `security-privacy-review`. Prefer workload identity,
    short-lived tokens, dynamic credentials, then static keys in that order when supported. Give
    each automation and environment its own identity. Put provider keys behind a connector or
    broker with a narrow command vocabulary, recipient or resource limits, rate and cost limits,
    egress controls, audit, and revocation.
18. Keep queues and diagnostics reference-based. Store job, tenant, subject, input, policy, schema,
    and dedupe references rather than raw credentials, full request bodies, email content, private
    documents, or unnecessary personal data. Fetch only the fields needed by the current step just
    in time, and use allowlisted log schemas instead of dumping request, error, or context objects.
19. Reduce cost without weakening correctness. Prefer events over wasteful polling; when polling is
    unavoidable, use a durable cursor, conditional request, provider interval, and adaptive backoff.
    Coalesce only semantically replaceable work, batch by compatible tenant and operation with
    per-item results, cache the complete normalized computation contract, suspend durable waits, and
    assign retry ownership to one layer with an end-to-end budget.
20. Measure useful effects. Record triggered, deduplicated, unchanged, provider-call, retry, byte,
    compute, wall-time, token, estimated-cost, and useful-effect counts. Enforce declared per-run,
    provider, tenant, and daily limits. Keep high-cardinality identities in bounded logs or traces,
    not metric labels.
21. Keep the operating definition versioned. Store trigger, filter, schema, timeout, retry,
    concurrency, queue, permission references, provider adapter version, environment overlay, and
    rollout policy in reviewable source. Pin in-flight work to compatible code, schema, policy, and
    provider contracts; move new work through shadow, canary, ramp, rollback, or retirement states.
22. Test the nightmare path. Cover missed schedule, lost and duplicate event, stale and out-of-order
    delivery, burst backlog, worker death, partial batch success, unknown provider outcome, expired
    credential, blocked egress, personal-data deletion before retry, stale workflow version,
    invariant failure, canary absence, budget breach, approval expiry, kill switch, and safe resume.

<!-- mustflow-section: postconditions -->
## Postconditions

- Schedule, event, queue, workflow, broker, connector, ledger, reconciler, and human approval have
  explicit non-overlapping responsibilities where those components exist.
- Missing execution, stale input, wrong business result, duplicate effect, unknown outcome,
  credential misuse, privacy spread, cost runaway, and harmful-output expansion have observable
  detection and bounded containment paths.
- The automation has a current owner, versioned registry entry, budgets, runbook, review deadline,
  rollout state, stop path, and retirement decision or named gaps.
- Specialist queue, workflow, idempotency, security, retry, notification, and deployment claims are
  backed by their owning procedures rather than this coordinator alone.

<!-- mustflow-section: verification -->
## Verification

Use configured oneshot command intents when available: `changes_status`, `changes_diff_summary`,
`lint`, `build`, `test_related`, `test`, `docs_validate_fast`, `test_release`, and `mustflow_check`.
Use the owning specialist's configured queue, workflow, security, failure, retry, integration,
schema, cost, rollout, or reconciliation checks. Do not infer raw scheduler, queue, worker, webhook,
provider, replay, credential, or production commands.

<!-- mustflow-section: failure-handling -->
## Failure Handling

- If the owner, source of truth, accepted outcome, maximum loss, start signal, completion evidence,
  or stop authority is unknown, report the automation as non-operable instead of filling the gap
  with a generic cron job or alert.
- If a provider event cannot be replayed or reconciled, label the path lossy and retain human or
  scheduled verification until an authoritative recovery source exists.
- If external outcome is `UNKNOWN`, block blind replay and move to reconciliation or auditable
  manual intervention.
- If approval volume makes reviewers rubber-stamp work, narrow automatic eligibility and improve
  exception classification; do not add more approval clicks.
- If credentials, personal data, egress, logs, or queue payloads cannot be bounded, keep execution
  manual or move the effect behind a stronger broker and isolation boundary.
- If cost controls would drop required reconciliation, security, deletion, billing, or other
  correctness work, preserve the invariant and reduce optional load elsewhere.

<!-- mustflow-section: output-format -->
## Output Format

- Automation outcome, owner, environment, registry state, and maximum loss
- Trigger classification and schedule, event, queue, workflow, connector, broker, ledger, and
  reconciliation responsibilities
- Start, completion, freshness, invariant, canary, feedback, and containment evidence
- Human approval boundary, staged-authority state, caps, and stop path
- Identity, credential, data-minimization, queue-payload, logging, egress, and rotation decisions
- Useful-effect cost, polling, batching, caching, waiting, retry-owner, and budget decisions
- Versioning, rollout, nightmare-path tests, specialist handoffs, commands, and remaining risk
