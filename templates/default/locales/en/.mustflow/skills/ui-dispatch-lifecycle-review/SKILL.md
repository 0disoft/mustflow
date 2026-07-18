---
mustflow_doc: skill.ui-dispatch-lifecycle-review
locale: en
canonical: true
revision: 2
lifecycle: mustflow-owned
authority: procedure
name: ui-dispatch-lifecycle-review
description: Apply this skill when desktop, mobile, embedded, or rich-client UI code creates or accesses thread-affine UI objects, native handles, bound models, timers, resources, dispatchers, event loops, Invoke or posted callbacks, synchronization contexts, main queues, actors, progress reporters, background results, cancellation, closing, or shutdown and code can run on the wrong owner thread, create affinity on the wrong thread, outlive its event loop, apply stale data, reorder state, flood the queue, freeze input, or touch a destroyed owner.
metadata:
  mustflow_schema: "1"
  mustflow_kind: procedure
  pack_id: mustflow.core
  skill_id: mustflow.core.ui-dispatch-lifecycle-review
  command_intents:
    - changes_status
    - changes_diff_summary
    - lint
    - build
    - test_related
    - test
    - test_audit
    - docs_validate_fast
    - test_release
    - mustflow_check
---

# UI Dispatch Lifecycle Review

<!-- mustflow-section: purpose -->
## Purpose

Review UI dispatch as scheduling onto an affinity context, not as proof of freshness, lifecycle,
ordering, cancellation, ownership transfer, or visible completion.

A callback can execute on the correct UI thread and still belong to an old operation, closed view,
recreated native handle, stale user-edit version, canceled request, superseded progress stream, or
partially torn snapshot. The review question is which generation and state preconditions are checked
at actual application time.

<!-- mustflow-section: use-when -->
## Use When

- Code posts or invokes work through a UI dispatcher, synchronization context, main queue, actor,
  event queue, binding callback, progress reporter, observable, timer, or framework scheduling API.
- Background search, validation, synchronization, loading, parsing, device, network, database, or
  worker results update a window, view, control, scene, model, binding, collection, progress
  indicator, busy state, selection, editor, or rendered peer.
- A view can close, reopen, detach, reattach, recreate its native handle, change owner, change scene,
  replace its model, or begin a newer operation before an old callback runs.
- Closing, cancel, restart, duplicate close, subscription disposal, timer shutdown, semaphore,
  busy-gate, resource cleanup, app shutdown, queue backlog, GUI freeze, input delay, layout storm,
  GPU wait, or thread-pool starvation affects UI work.
- Code or docs claim dispatching to the UI thread makes data race-free, FIFO preserves request order,
  cancellation removes queued callbacks, an object reference proves one lifecycle, or low UI-thread
  CPU proves the UI pipeline is healthy.

<!-- mustflow-section: do-not-use-when -->
## Do Not Use When

- A blocking dialog, nested event loop, message pump, synchronous UI wait, run-loop mode, local loop,
  or host callback reenters before the outer handler returns; use
  `modal-loop-reentrancy-review` first.
- The task is ordinary browser component state ownership with no native or dispatcher lifecycle;
  use `frontend-state-ownership-review`.
- The main problem is layout, paint, compositing, hydration or frame work rather than dispatch
  freshness and lifecycle; use `frame-render-performance-review`.
- The main problem is a background service process, OS supervisor, durable checkpoint or restart;
  use `desktop-background-process-stability-review`.
- The main problem is generic shared-memory synchronization without a UI dispatch target; use
  `race-condition-review` or `concurrency-invariant-review`.
- The callback consumes a current immutable snapshot under a verified live owner and generation,
  with no cancellation, queue, closing, binding, progress, or shutdown risk.

<!-- mustflow-section: required-inputs -->
## Required Inputs

- Dispatch ledger: scheduling API, target UI context or actor, priority, enqueue time, execution
  start, application time, render or presentation evidence, nested-pump depth, and rejection or
  cancellation behavior.
- Affinity ledger: toolkit-defined owner for each UI instance and object graph, main thread versus
  UI event thread, native-handle or peer creation point, bound model and collection ownership,
  mutable framework resources, worker objects, active event loop, getter side effects, deletion
  context, and affinity assertions.
- Identity ledger: operation, attempt, view instance, owner, native handle or peer generation,
  attachment or scene generation, state version, edit version, request key, and correlation ID.
- Payload ledger: values captured by the callback, mutable aliases, collections, ownership transfer,
  snapshot construction, notification order, and fields that must change atomically.
- Freshness ledger: latest-operation rule, ABA protection, expected view and state generations,
  current selection or edit preconditions, server and local edit versions, and stale-result policy.
- Lifecycle ledger: open, closing and closed states; close request identity; cancellation source
  ownership; queued continuations; subscriptions; timers; semaphore or gate ownership; worker drain;
  service disposal; and shutdown order.
- Pressure ledger: progress and high-rate update producers, coalescing, queue age, priority,
  thread-pool start delay, lock owners, allocation, layout invalidation, paint damage, GPU waits,
  external synchronous calls, and input-event rate.
- Test and observability evidence: deterministic dispatcher, virtual clock, barriers, fault hooks,
  state-transition invariants, environment matrix, lifecycle and queue telemetry, and configured
  command intents.

<!-- mustflow-section: preconditions -->
## Preconditions

- The task matches the Use When conditions and does not match the exclusions.
- Higher-priority instructions and `.mustflow/config/commands.toml` have been checked.
- The actual dispatch target, view lifecycle, operation owner and application point are identified.
- Framework affinity, cancellation and closing behavior is taken from current repository or
  authoritative version-matched evidence rather than API-name folklore.
- Existing immutable-result, generation, close-state, lifetime subscription, coalescing, telemetry
  and deterministic scheduler patterns have been searched.

<!-- mustflow-section: allowed-edits -->
## Allowed Edits

- Add operation and view generations, immutable UI snapshots, execution-time freshness checks,
  conditional application, owner-scoped cancellation, close state machines, exactly-once cleanup,
  lifetime-bound subscriptions, coalescing, batch state replacement, queue telemetry, deterministic
  dispatch abstractions, virtual clocks, and focused race fixtures.
- Move UI state ownership to one UI reducer and make workers return immutable results or effect
  descriptions.
- Add bounded shutdown sequencing: stop admission, request cancellation, await owned completion,
  release subscriptions and resources, stop services, then destroy UI.
- Add queue-delay, wait-chain, allocation, layout, GPU and input-pressure evidence when the symptom
  is a freeze or responsiveness regression.
- Add instance-owner assertions, early owner-thread handle creation, object-graph affinity rules,
  pure-data transfer boundaries, framework-approved frozen resources, worker-object isolation,
  await-boundary context checks, owner-loop deletion, and event-loop liveness gates.
- Do not add repeated liveness checks only before dispatch, global cancellation-source fields without
  owner comparison, unlimited per-item progress posts, sync-over-async waits, or sleeps as fixes.

<!-- mustflow-section: procedure -->
## Procedure

1. Identify the actual UI application point.
   - Distinguish process main thread from the toolkit's UI event thread. Resolve affinity from the
     owning object instance or framework assertion, not class name, thread name, or a generic
     synchronization context.
   - Identify when native handle, peer, dispatcher, looper or scene affinity becomes fixed. Prevent
     lazy UI creation on a worker after an ambiguous early affinity check.
   - A worker-side liveness check followed by dispatch has a time-of-check gap. Recheck owner,
     view-instance, attachment or handle generation, operation generation, cancellation and state
     preconditions inside the UI callback immediately before mutation.
   - Treat enqueue success as scheduling evidence only.
2. Separate operation identity from displayed value.
   - Assign a monotonic operation or request generation. Compare generation, not only search text,
     item ID, path or selection value, because values can leave and return through an ABA cycle.
   - Define whether stale completion is dropped, merged, shown as conflict, cached without display,
     or recomputed.
3. Transfer immutable payload ownership.
   - Freeze the values and collection snapshot before enqueue. A captured object reference is not a
     snapshot when the worker can continue mutating its fields, children or list.
   - Publish one coherent UI state instead of combining a count, items, selection and totals from
     different moments.
   - Treat UI getters and bound models as affinity-sensitive unless the framework explicitly says
     otherwise. A getter can create handles, realize templates, calculate layout, query native
     state or mutate caches.
   - Transfer pure bytes, pixels, strings or immutable DTOs from workers. Do not pass mutable image,
     brush, font, timer, model, collection or framework resources across owners unless the toolkit
     provides and the code proves a frozen cross-thread contract.
4. Revalidate user-edit assumptions.
   - Carry the UI or document version observed before background work and the server or source
     version used for computation.
   - At application time choose user-edit priority, merge, conflict display or restart. Do not
     overwrite composition, cursor, selection or uncommitted input merely because the remote result
     arrived later.
5. Treat native handles and visual attachment as generations.
   - Object identity does not prove the same native peer, scene, window attachment, DPI generation
     or owner lifetime.
   - Increment a view or attachment epoch on recreation, detach, reparent, reopen or model
     replacement and reject callbacks from older epochs.
   - Audit the whole owned object graph. Moving or recreating one node while children, timers,
     sockets, models or native resources remain on another owner can split affinity.
6. Keep cancellation checks at every authority boundary.
   - Cancellation before scheduling does not remove a callback already queued. Check before work,
     before enqueue and inside the UI callback, together with operation and view generations.
   - A cancellation request is not task completion and does not authorize resource disposal.
   - Re-evaluate execution context after every suspension boundary that can resume elsewhere.
     Captured context is a scheduling address, not identity proof, and a queued continuation needs
     the destination event loop to remain alive and consuming work.
7. Batch dependent state transitions.
   - Replace multiple order-sensitive property notifications with one immutable state update or an
     explicit UI-thread batch whose intermediate states are not observable.
   - Record invalid transitions such as closing to loaded or completed to progress.
8. Coalesce progress and live updates.
   - Keep the newest supersedable value, preserve required boundary transitions and cap visible
     update frequency.
   - Ensure a final state cannot be followed by queued obsolete progress. Bound by queue age and
     generation, not only item count.
9. Model closing asynchronously.
   - If the framework's closing event is synchronous, cancel the first close, enter
     `Open -> Closing`, stop new work, request cancellation, await owned tasks without blocking the
     UI context, release lifetime resources, then request the one final close.
   - A second close during `Closing` joins the existing completion instead of starting cleanup
     again.
10. Keep cancellation and gate ownership local to the operation.
    - Capture each cancellation source, task, semaphore acquisition and lease in local operation
      state. An old `finally` cannot dispose a replacement source or reset a new operation.
    - Release a permit only when that operation actually acquired it and still owns the shared busy
      state it clears.
11. Bound callbacks to owner lifetime.
    - Tie event subscriptions, observables, timers, progress reporters and message-bus listeners to
      one view lifetime and dispose them as a group.
    - Already queued callbacks still require generation checks. Collection or event-source disposal
      alone is not enough.
12. Order application shutdown.
    - Block new input and work admission, stop producing UI callbacks, request cancellation, drain
      owned work to a bounded deadline, flush required durable state, stop dependent services, then
      destroy views and dispatch infrastructure.
   - Do not destroy UI, logging, storage or worker resources while owned tasks can still use them.
   - Stop timers, drain or reject queued signals, release native resources and delete objects on the
     owning context when required. Deferred deletion posted to a stopped or never-started loop is
     not completed cleanup.
13. Diagnose responsiveness as a pipeline.
    - Record created, worker-started, dispatch-enqueued, UI-started, state-applied, layout, paint and
      presented stages. Queue delay is start minus enqueue, not callback duration.
    - Build wait chains through lock owners, thread-pool queues, synchronous dispatch, RPC or COM,
      external input components and GPU fences. Low UI CPU can mean blocked or starved work.
   - Correlate allocation bursts, layout invalidation fan-out, paint damage, GPU synchronization and
     input storms with the same frame and interaction trace.
   - Include sync-over-async waits, synchronous marshal to the same serial queue, reverse UI-worker
     waits, locks across await, inline continuation completion, missing task terminal paths,
     bounded-queue approval cycles and thread-pool starvation in the wait graph.
14. Read [UI Dispatch and Lifecycle Checklist](references/ui-dispatch-lifecycle-checklist.md) for
    the freshness, close-state, queue-pressure, diagnostic and fault matrices.
15. Read [UI Affinity and Event Loop Checklist](references/ui-affinity-event-loop-checklist.md) when ownership, native handle creation, bound models, framework resources, worker objects, event-loop availability, synchronous marshaling, timers, deletion, or await continuations are in scope.
16. Require deterministic evidence.
    - Use a controllable dispatcher and virtual clock to force old-result-after-new-result,
      close-after-enqueue-before-run, handle recreation, cancellation-after-enqueue, old-finally
      after new-start, duplicate close, immediate cancellation callback, queue-flood-before-final,
      subscription-after-close and shutdown races.
    - Assert that closed views never mutate, old epochs never apply, exactly one current operation
      owns busy and cancellation state, queued work drains or is rejected, subscriptions return to
      baseline, and every invalid transition is observable.
    - If configured proof is unavailable, report static UI-dispatch risk instead of approving the
      path.

<!-- mustflow-section: postconditions -->
## Postconditions

- Dispatch target, priority, enqueue and apply stages, operation and view generations, immutable
  payload, freshness rule, edit conflict policy, cancellation ownership, close state, subscription
  lifetime, shutdown order, queue pressure, responsiveness evidence and tests are explicit.
- UI owner thread, instance and object-graph affinity, handle or peer creation, getter and binding
  behavior, worker transfer boundary, continuation destination, event-loop liveness, resource
  deletion and affinity assertions are explicit.
- Pre-dispatch-only liveness checks, out-of-order result overwrite, mutable closure capture, stale
  read-compute-write, ABA value checks, canceled queued callbacks, handle-generation reuse, torn
  collection snapshots, notification-order exposure, progress backlog, old-finally cleanup,
  unowned permit release, zombie view subscriptions, sync close waits and torn shutdown are fixed or
  reported.
- UI-thread safety claims are backed by configured tests, framework evidence matched to current
  code, queue and wait traces, or labeled as static review risk.

<!-- mustflow-section: verification -->
## Verification

Use configured oneshot command intents when available:

- `changes_status`
- `changes_diff_summary`
- `lint`
- `build`
- `test_related`
- `test`
- `test_audit`
- `docs_validate_fast`
- `test_release`
- `mustflow_check`

Prefer the narrowest configured intent that covers the changed dispatch lifecycle and template
surfaces. Do not infer raw GUI sessions, profilers, system traces, live device tests, watchers or
manual stress commands outside the command contract.

<!-- mustflow-section: failure-handling -->
## Failure Handling

- If the current operation owner, view generation or actual application point cannot be named,
  report that queued UI work has no freshness authority.
- If closing cannot be awaited by framework contract, cancel the initial close and move cleanup to
  an explicit asynchronous state machine rather than relying on an ignored continuation.
- If safe repair requires public API change, view-model ownership redesign, dispatcher abstraction,
  native tracing or real-device coverage outside scope, report the missing boundary.
- If instrumentation changes priority, allocation, locking or queue behavior materially, redesign
  the observer before trusting its result.
- If a configured command fails, preserve the failing lifecycle invariant and deterministic
  schedule before editing again.

<!-- mustflow-section: output-format -->
## Output Format

- UI dispatch lifecycle boundary reviewed
- Dispatch context, operation/view generation, immutable payload, freshness, edit conflict,
  cancellation, close state, subscriptions, gate ownership, shutdown, queue pressure,
  responsiveness, diagnostic and test findings
- Affinity, event-loop and UI dispatch lifecycle fixes made or recommended
- Evidence level: configured-test evidence, framework evidence, affinity assertion, queue or wait trace, static review
  risk, manual-only, missing, or not applicable
- Command intents run
- Skipped GUI diagnostics and reasons
- Remaining UI-dispatch lifecycle risk
