---
mustflow_doc: skill.modal-loop-reentrancy-review
locale: en
canonical: true
revision: 2
lifecycle: mustflow-owned
authority: procedure
name: modal-loop-reentrancy-review
description: Apply this skill when desktop or embedded UI code creates, changes, reviews, debugs, or reports modal dialogs, nested event loops, message pumping, synchronous UI waits, run-loop modes, dispatcher frames, local event loops, dialog exec APIs, synchronous cross-thread messages or RPC, file-picker portals, tracking loops, or callbacks that can reenter code before the outer handler returns and cause deadlock, livelock, starvation, stale-state mutation, or owner-lifecycle corruption.
metadata:
  mustflow_schema: "1"
  mustflow_kind: procedure
  pack_id: mustflow.core
  skill_id: mustflow.core.modal-loop-reentrancy-review
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

# Modal Loop Reentrancy Review

<!-- mustflow-section: purpose -->
## Purpose

Review modal and nested event-loop behavior as synchronous call-stack reentrancy, not as an
application pause.

A modal loop can keep an outer handler, lock, iterator, routed event, COM or IPC callback, and
partially updated model alive on the stack while dispatching another event inside it. The review
question is whether any reentered path can observe invalid intermediate state, wait on the outer
frame, starve the only exit source, or resume the outer frame against a changed owner.

<!-- mustflow-section: use-when -->
## Use When

- Code uses blocking dialog, modal window, nested dispatcher frame, local event loop, manual
  `processEvents`, message pump, synchronous file picker, menu or drag tracking loop, COM or RPC
  call that pumps messages, or cross-thread synchronous UI messaging.
- UI code waits synchronously for a task, future, worker, dispatcher callback, portal response,
  network result, lock, event, thread, or another UI thread.
- A callback opens UI before returning to WebView, browser, accessibility, IPC, D-Bus, framework,
  plugin, or native host code that may serialize or prohibit reentrancy.
- A bug reports frozen dialog, responsive-but-never-finishing UI, nested confirmations, stale event
  continuation, callback starvation, wrong owner disable, lost capture, late completion, or
  platform-specific modal behavior.
- Code or docs claim a modal dialog pauses the app, a recursive lock fixes reentrancy, pumping events
  makes a wait safe, or one framework's nested-loop behavior applies to every platform.

<!-- mustflow-section: do-not-use-when -->
## Do Not Use When

- The task is dialog semantics, focus order, Escape behavior, accessible naming, or keyboard
  navigation without nested-loop or reentrancy risk; use `frontend-accessibility-tree-review`.
- The task is only animation interruption or nonblocking overlay motion; use
  `motion-system-contract-review`.
- The main problem is parallel shared-memory execution with no nested dispatch on one call stack;
  use `race-condition-review` or `concurrency-invariant-review`.
- The main problem is fixed sleeps, readiness polling, or ordinary asynchronous timing without
  nested pumping; use `async-timing-boundary-review`.
- The deadlock is primarily database locks or transaction isolation; use the database lock or
  transaction integrity skill.
- The task merely styles a CSS modal or renders a dialog component whose result is already
  nonblocking and lifecycle-safe.

<!-- mustflow-section: required-inputs -->
## Required Inputs

- Entry ledger: outer handler or callback, call stack, UI thread, owner, request, modal depth,
  current state and locks, nested-loop API, and exact return or exit condition.
- Dispatch ledger: queued and synchronous messages, callbacks, timers, sockets, I/O sources,
  accessibility or IPC sources, run-loop mode or main context, dispatcher priority, filters, and
  source thread or affinity.
- Wait-for ledger: threads, tasks, locks, events, synchronous messages, RPC or COM calls, dispatcher
  operations, portal requests, completion callbacks, and the context required to run each one.
- Reentrancy invariant: fields that must change together, transient state exposed across the nested
  loop, stale iterators or object references, allowed nested callbacks, and forbidden reentry.
- Request lifecycle: stable request and owner IDs, state machine, generation, cancellation,
  single-flight or queue policy, exactly-once result, late-completion behavior, and owner disposal.
- Modal session ledger: session-specific loop and exit token, nested depth and parent session,
  completion and commit authority, owner-disable and capture ownership, input generation, hidden
  versus closed state, deferred destruction, weak owner reference, and idempotent cleanup owner.
- Platform ledger: framework and version, backend, native versus portal dialog, process boundary,
  apartment or thread-affinity model, event-loop modes, and current official or repository-owned
  behavior evidence.
- Diagnostic and test evidence: modal spans, loop depth, call and wait graphs, source priority and
  context, low-overhead event ring, stacks, CPU state, system trace correlation, deterministic
  reentry fixtures, and configured command intents.

<!-- mustflow-section: preconditions -->
## Preconditions

- The task matches the Use When conditions and does not match the exclusions.
- Higher-priority instructions and `.mustflow/config/commands.toml` have been checked.
- The actual nested-loop or synchronous wait boundary is identified before changing dialog code.
- Platform behavior is matched to the repository's framework, backend, apartment and version.
  External examples are evidence only and are not copied as universal rules.
- Existing async dialog, request state-machine, owner lifecycle, cancellation, dispatcher,
  instrumentation and test patterns have been searched.

<!-- mustflow-section: allowed-edits -->
## Allowed Edits

- Replace blocking result APIs with future, task, callback or signal result APIs.
- Post presentation until the current callback has returned; add request state machines, owner-scoped
  single-flight or queue policy, stable IDs and revisions, exactly-once completion, cancellation,
  late-result guards, narrow window or document scope, and focused fixtures.
- Move locks, mutable iterators, partial model changes, synchronous I/O, remote validation, and
  long-running work outside nested dispatch windows.
- Add modal-depth spans, dispatcher or source lifecycle records, wait-for edges, low-overhead event
  rings, state hashes, and watchdog evidence collection.
- Add pre-pump admission guards, atomic pre-modal snapshots, session-scoped `TryComplete`, one
  commit observer, weak-reference plus generation checks, nested owner-disable accounting,
  session-specific exit tokens, stale-input invalidation, and idempotent finalization.
- Prefer inline confirmation, undo, soft delete, staged apply, sheets, or nonblocking overlays when
  they preserve the product contract.
- Do not replace a nonrecursive lock with a recursive lock as proof of safety.
- Do not add manual event pumping, busy `processEvents` loops, sleeps, or global reentrancy booleans
  as generic fixes.

<!-- mustflow-section: procedure -->
## Procedure

1. Find every nested dispatch and sync-over-async boundary.
   - Search blocking dialog and file-picker calls, local loop execution, dispatcher frames, message
     pumping, synchronous cross-thread messaging, task or future waits, joins, RPC, COM calls, and
     callbacks that open UI before returning.
   - Include menu, drag, resize and event-tracking loops even when no dialog is visible.
2. Capture the outer frame that stays alive.
   - Record handler, event, owner, request, locks, iterators, mutable references, partial state,
     transaction or callback contract, and code that resumes after the nested loop exits.
   - State the invariant reentered code is forbidden to observe.
3. Close lock and partial-state windows before pumping.
   - Release locks and finish or roll back multi-field mutation before entering any nested dispatch.
   - A recursive lock removes self-wait while exposing intermediate state; it does not restore the
     invariant.
4. Build a wait-for graph that includes delivery context.
   - Add edges for thread waits, locks, synchronous sent messages, callbacks posted to the UI,
     dispatcher operations, RPC or COM callbacks, portal responses and owner-close paths.
   - Mark which run-loop mode, main context, priority, event class, thread affinity or message path
     must execute each completion.
5. Classify the failure precisely.
   - Deadlock has a closed wait cycle.
   - Starvation has a required ready source that the active loop, filter, priority or context does
     not dispatch.
   - Livelock keeps dispatching or reposting without advancing the request state.
   - Stale continuation resumes an old outer frame after owner, model, selection or visual tree
     authority changed.
6. Review nested-loop admission and exit.
   - Name the only APIs or signals that actually end the inner loop. General application quit,
     cancellation request, owner disposal or transport close may not be that signal.
   - Ensure filters, input disable, capture and owner selection do not remove the human or automated
     path that creates exit.
7. Reject manual pumping as completion proof.
   - A loop that repeatedly processes events can starve lower-priority work, mishandle deferred
     destruction, admit more producers than it drains, or keep the request state unchanged.
   - Replace it with an explicit asynchronous completion and a bounded owner lifecycle.
8. Treat platform behavior as a matrix.
   - Distinguish queued messages from synchronous calls, broad message pumps from mode-filtered run
     loops, framework dispatcher frames from native loops, recursive main contexts from portal
     process boundaries, and blocking dialog APIs from callback or signal APIs.
   - Read [Modal Loop and Reentrancy Checklist](references/modal-loop-reentrancy-checklist.md) for
     the framework, design and diagnostic matrices.
   - Distinguish synchronous return from thread sleep, input modality from state isolation, posted
     work from synchronous or nonqueued dispatch, outer loop shutdown from inner session exit, and
     deferred destruction from function-scope lifetime.
9. Break the current callback stack before presenting interactive UI.
   - Copy stable request data, return from the host callback, then enqueue presentation on the
     owning UI context.
   - Do not hide the same nested loop behind a future immediately blocked by `.wait`, `.get`,
     `.Result`, or equivalent synchronization.
10. Model each interactive request explicitly.
    - Transition owner-scoped state through idle, presenting, awaiting result, applying or canceled,
      and done. Enter presenting before any call that can reenter.
   - Give every request and owner a generation. Coalesce equivalent requests, queue ordered work,
     or return busy according to policy; do not create unbounded dialog stacks.
   - Set the admission state before any call that may pump. Bind loop object, exit token, parent
     session, owner-disable lease, capture state and input generation to that session.
   - Route user close, cancellation and worker completion through one atomic
     `TryComplete(sessionId, result)`. Choose one commit owner: completion signal or synchronous
     return path, not both.
11. Revalidate state after user think time.
    - Store stable entity IDs, capability tokens and expected revisions rather than indexes,
      iterators, object pointers, transient paths or selected-object copies.
    - Before applying the result, verify owner existence, generation, entity revision, permission
      and destination. Recompute or reject stale results.
12. Tie cancellation to owner lifecycle.
    - Owner close, document replacement, shutdown and explicit cancel complete the local request
      exactly once. A provider or portal response is not required to arrive after cancellation.
   - Late success, failure or response signals become idempotent no-ops after terminal completion.
   - Treat hidden and closed as different lifecycles. A reusable dialog gets a new display
     generation, fresh cancellation ownership and explicit subscription reset every time.
   - Validate weak owner or dialog identity and session generation after the nested call returns;
     return does not prove the caller object survived inner dispatch.
13. Keep long or failure-prone work outside the dialog callback.
    - Return the user's choice, close presentation, then perform file I/O, parsing, network or remote
      validation in owned asynchronous work. Report failures inline instead of recursively opening
      another blocking dialog.
14. Preserve capability-bearing picker results.
    - Do not collapse URI, access token, sandbox grant, remote object or provider handle into a
      local path string when later access depends on that authority.
15. Instrument reentrancy without changing it.
    - Record modal enter and exit, depth, owner, request, call site, mode or context, exit reason,
      queued versus synchronous dispatch, callback start and end, wait edges and state hashes in a
      bounded low-overhead ring.
    - Correlate stacks, CPU state and system traces. A watchdog gathers evidence; it does not
    forcibly dismiss destructive UI.
16. Read [Nested Modal State and Lifetime Checklist](references/nested-modal-state-lifetime-checklist.md) when nested sessions can mutate owners, collections, input generations, commit paths, deferred deletion, or shutdown state.
17. Require adversarial evidence.
    - Force callback reentry before outer return, completion on an excluded mode or context,
      high-priority source starvation, synchronous call cycles, repeated confirmation, owner close,
      stale entity revision, cancellation without provider response, immediate provider response,
      nested input capture and shutdown during presentation.
    - Assert bounded modal depth, state progress, exactly-once completion, no held lock across nested
      dispatch, no stale result application, no orphan owner disable or capture, and a replayable
      wait or causal graph.
    - Also force parent deletion, collection mutation during the nested call, double completion,
      nested owner disable, wrong-session exit, deferred deletion, stale queued input after modal
      exit, dialog reuse, continuation-before-return, and progress backlog.
    - If configured proof is unavailable, report static reentrancy risk instead of approving the
      path.

<!-- mustflow-section: postconditions -->
## Postconditions

- Nested dispatch, outer stack, modal depth, owner, request, invariants, dispatch contexts, wait
  graph, exit condition, platform behavior, request state machine, cancellation, stale-result guard,
  diagnostics and tests are explicit.
- Lock-held modal entry, sync-over-async UI wait, synchronous call cycles, wrong run-loop mode or
  context, priority starvation, manual-pump livelock, recursive confirmation, wrong owner disable,
  callback-hosted modal UI, stale routed event, quit-as-dialog-exit, late provider response and
  capability loss are fixed or reported.
- Session admission after the pump starts, half-applied invariants, duplicated domain commands,
  caller deletion, iterator invalidation, double commit, Boolean modal ownership, focus-triggered
  mutation during construction, hidden-instance reuse, double cleanup, wrong-loop exit and
  post-modal stale input are fixed or reported.
- Reentrancy safety claims are backed by configured tests, framework evidence matched to current
  code, causal or wait traces, or labeled as static review risk.

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

Prefer the narrowest configured intent that covers the changed UI reentrancy boundary and template
surfaces. Do not infer raw profilers, message hooks, system traces, live dialogs, portal calls,
watchers, or platform diagnostics outside the command contract.

<!-- mustflow-section: failure-handling -->
## Failure Handling

- If the nested loop, outer frame, exit condition or required delivery context cannot be named,
  report the path as unreviewable for reentrancy.
- If safe repair requires framework migration, async public API change, native instrumentation,
  system tracing, portal integration or a deterministic harness outside scope, report that boundary.
- If diagnostics alter timing, allocate, block, acquire application locks or consume messages in the
  hot hook, remove or redesign the observer before trusting its result.
- If configured tests cannot force nested dispatch, report the missing manual or integration
  evidence and do not infer a raw command.
- If a configured command fails, preserve the failing invariant, request trace and first relevant
  output before editing again.

<!-- mustflow-section: output-format -->
## Output Format

- Modal-loop reentrancy boundary reviewed
- Outer stack, modal depth, owner, request, invariant, dispatch context, wait graph, exit condition,
  platform, modal session, completion and commit authority, owner-disable and capture ownership,
  object lifetime, deferred deletion, input generation, request-state, cancellation, stale-result,
  capability, diagnostic and test findings
- Reentrancy fixes made or recommended
- Evidence level: configured-test evidence, framework evidence, causal or wait trace, static review
  risk, manual-only, missing, or not applicable
- Command intents run
- Skipped reentrancy diagnostics and reasons
- Remaining modal-loop reentrancy risk
