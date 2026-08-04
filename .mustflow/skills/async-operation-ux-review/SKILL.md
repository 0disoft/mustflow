---
mustflow_doc: skill.async-operation-ux-review
locale: en
canonical: true
revision: 2
lifecycle: mustflow-owned
authority: procedure
name: async-operation-ux-review
description: Apply this skill when a user-facing asynchronous operation needs truthful progress, phase, queue, delay, cancellation, retry, resume, background completion, partial-result, offline, or failure UX. Do not use it to design the durable workflow, queue, cache, or first-render mechanism itself; use the owning backend or frontend skill for those contracts.
metadata:
  mustflow_schema: "1"
  mustflow_kind: procedure
  pack_id: mustflow.core
  skill_id: mustflow.core.async-operation-ux-review
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

# Async Operation UX Review

<!-- mustflow-section: purpose -->
## Purpose

Make long or uncertain operations understandable and controllable without fabricating progress or
success. The UI must reflect durable operation truth, distinguish waiting from working, preserve
usable state during refresh, and give the user a safe next action when work slows, disconnects,
fails, is cancelled, or continues in the background.

<!-- mustflow-section: use-when -->
## Use When

- A user starts an import, export, upload, generation, conversion, analysis, migration, report,
  checkout-adjacent task, or other operation that outlives one immediate UI response.
- The UI shows progress bars, phases, queue position, ETA, heartbeat, cancel, pause, resume, retry,
  background completion, notifications, partial results, or a global job tray.
- Loading can become slow, offline, stale, server-failed, or partially usable and the product must
  decide what remains visible and actionable.
- Optimistic feedback or cached data could make a pending or stale fact look server-confirmed.

<!-- mustflow-section: do-not-use-when -->
## Do Not Use When

- The task is to make work survive process loss, deployment, callbacks, timers, or compensation;
  use `durable-workflow-orchestration` for the workflow and this skill only for its user surface.
- The task is queue delivery, lease, fencing, duplicate execution, idempotency, or state-transition
  correctness; use `queue-processing-integrity-review`, `idempotency-integrity-review`, or
  `state-machine-pattern`.
- The task is cache freshness, invalidation, stale-while-revalidate, or optimistic cache merging;
  use `cache-integrity-review` and apply this skill only to user-visible truth and controls.
- The task is first-render delivery, LCP, streaming HTML, prefetch cost, or layout stability without
  a user-facing operation lifecycle; use `web-render-performance-review` or
  `frontend-render-stability`.
- A short local interaction completes synchronously and has no meaningful waiting, ambiguity,
  cancellation, retry, or background state.

<!-- mustflow-section: required-inputs -->
## Required Inputs

- Operation ledger: operation ID, actor and tenant, accepted time, durable handoff evidence,
  lifecycle state, phase, completed and total work when knowable, revision or event sequence,
  heartbeat, terminal result, and expiry.
- Progress model: measurable units, phase weights or indeterminate phases, sampling window, ETA
  confidence, queue and dependency waits, and user-consumable completion predicate.
- Control model: cancel request, cancellation acknowledgement, irreversible boundary, pause, resume,
  retry, checkpoint, duplicate action, navigation-away, and notification behavior.
- Failure model: slow-but-live, stale heartbeat, offline client, server or provider failure,
  authorization loss, validation failure, exhausted retry, partial result, and recovery action.
- Presentation model: initial load, background refresh, stale content, partial content, global job
  tray, accessibility announcements, reduced motion, and which consequential actions require fresh
  confirmed data.
- Screen-state model: initial load, compatible refresh, pagination, data, first-use empty, filtered
  empty, search empty, permission denial, partial failure, full failure, cached content, offline
  capability, queued local mutations, conflict, and region ownership.
- Existing frontend, API, workflow, queue, cache, state-machine, tests, docs, and configured command
  intents for the changed boundary.

<!-- mustflow-section: preconditions -->
## Preconditions

- Identify the authoritative operation-state owner before editing UI state.
- Verify that a background-completion promise is backed by a durable handoff, not an in-memory
  promise or the lifetime of the accepting HTTP request.
- Treat user-provided timings and percentages as hypotheses unless the implementation exposes the
  corresponding measurable work.
- Apply the narrower workflow, queue, idempotency, cache, state, accessibility, or performance skill
  when this review crosses its ownership boundary.

<!-- mustflow-section: allowed-edits -->
## Allowed Edits

- Add or tighten operation-state APIs, progress and phase fields, event sequences, heartbeat and
  staleness handling, cancellation controls, retry-from-checkpoint behavior, background job trays,
  partial-result presentation, stale-content labeling, focused tests, and synchronized docs.
- Replace fabricated percentages, timer-driven progress, ambiguous spinners, premature success,
  destructive optimistic state, and generic retry controls with evidence-backed states and actions.
- Preserve stable content, focus, selection, scroll position, and non-conflicting controls while a
  refresh or background operation runs.
- Do not invent backend durability in UI code, make irreversible actions optimistic, retry
  non-idempotent effects blindly, or disable the whole application because one operation is pending.

<!-- mustflow-section: procedure -->
## Procedure

1. Name the operation and its truth owner.
   - Use a stable operation ID scoped to actor and tenant, and identify the authoritative status
     record or endpoint.
   - Polling, SSE, WebSocket, and push notification are transports. They do not own truth.
2. Map lifecycle states before drawing controls.
   - Distinguish accepted, queued, waiting on dependency, running, retry-wait, finalizing,
     cancel-requested, succeeded, failed-final, cancelled, and expired where they are real.
   - Do not collapse `cancel requested` into `cancelled` or a timeout into terminal failure.
3. Prove progress from real work.
   - Prefer bytes, records, files, frames, pages, batches, or other counted units.
   - When total work is unknown, show an indeterminate phase or completed-unit count instead of a
     timer-driven percentage.
   - If phases have different cost or unknown totals, show phase-local progress and name the phase;
     do not manufacture one smooth global percentage.
4. Make completion mean usable completion.
   - Show `100%` or success only after the result, artifact, receipt, or committed state the user
     needs exists and is retrievable.
   - Finalization, indexing, publication, or replication is still work when it blocks use.
5. Treat ETA as an estimate with confidence.
   - Wait for enough completed work before estimating, use recent throughput, and show a range or
     qualitative bound when variance is high.
   - Show `calculating` or omit ETA when the sample is too small, the phase changes, the queue is
     blocked, or progress is not measurable.
6. Separate slow, stalled, offline, and failed.
   - A live heartbeat with advancing revision is slow, not stalled. A missing heartbeat beyond the
     declared threshold is stale, not automatically failed.
   - Client offline state, server unreachability, provider failure, validation failure, and
     authorization loss need different messages and recovery actions.
   - Treat offline as an operating mode. Name which reads and writes remain safe, whether a write is
     only local or durably queued, how many operations are pending, and how conflicts are resolved.
     Network attachment alone is not proof that the service is reachable.
7. Design cancellation as a protocol.
   - On click, show `cancel requested`; keep the operation pending until the worker or authority
     confirms cancellation or reports the irreversible boundary.
   - State what has already completed, what will be retained, and whether compensation or manual
     cleanup is required.
8. Make retry resume safely.
   - Retry from the last durable checkpoint when supported and preserve the same logical operation
     or idempotency identity according to the owning contract.
   - Do not present retry for an ambiguous or non-idempotent effect until status lookup or
     reconciliation decides whether it already happened.
9. Permit navigation without abandoning truth.
   - Once durable handoff is confirmed, allow the user to leave, reopen status by operation ID, and
     surface active work in a global job tray or equivalent persistent area.
   - Persist notification preference and terminal-result retention deliberately; do not promise a
     notification channel that is not configured.
10. Preserve usable content during refresh.
    - Keep the previous semantic snapshot visible while a compatible refresh runs, label its age or
      refresh state, and replace it atomically when the new complete snapshot is ready.
    - Clear or isolate data when tenant, actor, resource identity, authorization, or schema meaning
      changes. Old data from another context is not a friendly placeholder.
    - On refresh failure, retain safe stale content but block money, permission, inventory,
      destructive, or other consequential decisions that require current confirmed facts.
    - Keep initial load, background refresh, pagination, first-use empty, filtered or search empty,
      permission denial, partial failure, and full failure as distinct states. A request in one region
      must not blank or disable independent regions.
11. Bound optimistic feedback.
    - Allow optimism only for reversible, low-harm actions with a visible pending marker, stable
      temporary identity, rollback, duplicate-submit rule, and server-confirmation merge.
    - Do not optimistically confirm payments, scarce inventory, external delivery, permission
      changes, permanent deletion, or legal, medical, or similarly consequential submissions.
12. Reveal partial value in stable order.
    - Show independently usable content as it becomes valid, but preserve ordering and reserve
      geometry so late sections do not scramble the page, focus, or scroll position.
    - Keep non-conflicting controls active and disable only actions whose invariant is actually
      pending.
13. Design progressive delay feedback.
    - Acknowledge input immediately, then escalate from subtle pending feedback to phase detail,
      delay explanation, and recovery controls as evidence crosses product-defined thresholds.
    - Avoid skeleton flashes for operations likely to complete before the delay threshold.
14. Write recovery-first error copy.
    - Start with whether existing data and completed work are safe, then say what failed, what the
      system will do next, and what the user can do now.
    - Use action-specific controls such as retry upload, reconnect, reauthenticate, download partial
      result, resume, cancel, or contact support with an operation ID.
15. Test lifecycle boundaries, not just snapshots.
    - Cover queued versus running, unknown total, phase transition, late obsolete event, heartbeat
      staleness, disconnect and reconnect, navigation away and return, cancel acknowledgement,
      irreversible cancellation, checkpoint retry, duplicate submit, partial result, stale-data
      action blocking, terminal retention, and `100%` without a consumable result.
16. Label evidence honestly.
    - Distinguish implemented and tested operation truth from proposed UX, static code evidence,
      browser-observed behavior, live-service evidence, and missing backend capability.

<!-- mustflow-section: postconditions -->
## Postconditions

- Progress, phase, ETA, queue, heartbeat, cancellation, retry, background completion, partial result,
  stale data, and terminal success are derived from named authorities or reported as unavailable.
- The UI does not turn elapsed time, request acceptance, transport delivery, optimistic intent, a
  stale snapshot, or `100%` work count into false completion.
- Users can understand what is happening, leave safely after durable handoff, recover from known
  failure classes, and keep using unrelated parts of the product.
- High-consequence actions never rely silently on stale or merely optimistic facts.

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

Use the narrowest configured unit, component, integration, browser, workflow, docs, release, or
mustflow intent that covers the changed operation lifecycle. Do not invent raw dev-server, browser,
worker, queue, provider, or package-manager commands outside the command contract.

<!-- mustflow-section: failure-handling -->
## Failure Handling

- If the backend has no durable operation identity or status authority, do not simulate one in the
  frontend. Report the missing backend capability and keep the UI indeterminate and honest.
- If total work, phase cost, heartbeat threshold, cancellation boundary, checkpoint, or terminal
  result predicate is unknown, omit the unsupported precision and report the missing contract.
- If safe retry or optimistic behavior depends on idempotency, reconciliation, cache versioning, or
  workflow changes outside scope, hand off to the owning skill and keep the user-facing action
  disabled or explicitly uncertain.
- If browser, reconnect, offline, worker-loss, or provider-failure proof requires an unconfigured
  environment, complete local contract verification and report the manual evidence gap.

<!-- mustflow-section: output-format -->
## Output Format

- Async operation surface reviewed
- Operation authority and lifecycle map
- Progress, phase, ETA, queue, heartbeat, completion, cancellation, retry, background, partial-result,
  stale-data, optimistic, offline, and recovery decisions
- UX or contract changes made or recommended
- Evidence level and focused verification
- Command intents run
- Skipped runtime checks and reasons
- Remaining async-operation UX or backend-capability risk
