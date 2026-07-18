# Nested Modal State and Lifetime Checklist

Use this checklist when a modal or secondary event loop can mutate the caller, owner, collection,
input generation, completion path, or destruction schedule before the blocking API returns.

## Contents

1. [Execution model](#execution-model)
2. [Session admission](#session-admission)
3. [Invariant snapshot](#invariant-snapshot)
4. [Non-user reentry](#non-user-reentry)
5. [Object and collection lifetime](#object-and-collection-lifetime)
6. [Completion and commit authority](#completion-and-commit-authority)
7. [Nested ownership](#nested-ownership)
8. [Focus, capture, and input generation](#focus-capture-and-input-generation)
9. [Hidden, closed, and reused dialogs](#hidden-closed-and-reused-dialogs)
10. [Deferred destruction and shutdown](#deferred-destruction-and-shutdown)
11. [Async continuation ordering](#async-continuation-ordering)
12. [Fault matrix](#fault-matrix)
13. [Invariants](#invariants)
14. [Skill handoffs](#skill-handoffs)

## Execution model

Keep these facts separate:

- a blocking API can delay its caller's return while the same UI thread continues executing;
- a nested loop is another dispatch frame on the same thread, not a new UI thread;
- modality usually restricts user input to selected owners, not timers, IPC, automation, tray,
  network, accessibility, callbacks or programmatic commands;
- posted work can run inside the nested loop before the blocking call returns;
- synchronous or nonqueued calls can bypass assumptions derived from posted-message FIFO;
- active modes, contexts, priorities and filters decide which source classes make progress;
- nested sessions form a depth stack and outer callers normally cannot resume through a live inner
  session;
- application shutdown and modal-session exit are separate protocols;
- deferred destruction follows event-loop and framework rules, not lexical scope alone.

Thread-affinity checks can all pass while the same logical state machine is active recursively.

## Session admission

Create modal session state before the first API that can pump or invoke callbacks:

- session ID and generation;
- parent session and modal depth;
- owner ID and owner-lifecycle generation;
- dialog or interaction ID;
- loop object and session-specific exit token;
- request state and completion authority;
- owner-disable lease and capture snapshot;
- input generation;
- cancellation source and cleanup owner;
- commit authority;
- creation call site and expected result.

A guard set after the blocking call returns provides no admission protection.

Avoid one global `currentLoop`, `isModal` or `isBusy`. Nested sessions overwrite global identity
and let an old completion close or mutate the wrong current session.

## Invariant snapshot

Before pumping:

1. complete the current multi-field state transition or roll it back;
2. publish one coherent snapshot;
3. release application locks;
4. stop holding mutable iterators and indexes;
5. record stable entity IDs and expected revisions;
6. mark the command session active;
7. define which reentrant commands are coalesced, rejected or queued.

Do not expose combinations such as new document state with old selection and undo history.

If mutation must remain provisional, isolate it in a private draft that reentrant readers cannot
mistake for committed state.

## Non-user reentry

Disabling the owner window does not block:

- timers and idle callbacks;
- queued signals and dispatcher work;
- tray or menu callbacks;
- automation and accessibility commands;
- message-only or service windows;
- IPC, COM, D-Bus or plugin callbacks;
- background completion;
- auto-save and synchronization;
- programmatic command dispatch.

Protect the domain command or request state, not only its button. Repeated save, delete, close,
apply or submit intent must join, reject or idempotently observe the existing session.

## Object and collection lifetime

After nested dispatch, revalidate:

- owner and dialog still exist;
- weak reference resolves to the same lifecycle generation;
- native peer or handle was not recreated;
- parent, scene or visual-tree attachment is current;
- entity still exists at the expected revision;
- collection generation is unchanged;
- iterator or index remains valid;
- cancellation and terminal state still permit continuation.

Prefer immutable collection snapshots or defer mutations until the outer frame is gone. A single
thread prevents data races, not iterator invalidation or logical reentrancy.

A blocking call's return is not proof that `this`, its parent, or captured raw pointers survived.

## Completion and commit authority

Route all terminal contenders through one operation:

`TryComplete(sessionId, expectedGeneration, result)`

Contenders can include:

- user accept or cancel;
- window close;
- cancellation callback;
- worker success or failure;
- timeout;
- owner disposal;
- application shutdown;
- provider or portal response.

Only one wins. Losers are observable idempotent no-ops.

Choose one model commit owner:

- completion callback or signal commits; the synchronous return path only observes terminal state;
  or
- the synchronous return path commits; completion callbacks only stop the loop and store result.

Never commit in both a finished callback and code after the blocking return.

Cleanup belongs to one owner and is idempotent. Inner close callbacks and outer `finally` must not
double-release native handles, registrations, subscriptions, owner-disable leases or cancellation
resources.

## Nested ownership

Model owner disable, capture and session depth as owned resources.

For each owner record which session actually disabled it. A session re-enables only the owner state
it acquired. Nested dialogs must not wake a window still blocked by an outer session.

A Boolean cannot represent multiple modal owners. Use framework ownership or explicit session leases
or counts with identity.

Bind loop exit to the exact session. A completion for outer A cannot terminate inner B merely because
B is now the globally visible loop object.

## Focus, capture, and input generation

Modal creation can trigger capture cancellation, owner disable, activation, focus loss, validation,
auto-save and close callbacks before construction or presentation finishes.

Treat those callbacks as reentrant state transitions. Guard initialization and define which
validation or save work can run during presentation.

When modal entry or exit changes focus, capture, enabled windows or visual targets:

- increment or transfer input generation;
- cancel active gestures when required;
- reject deferred input from the prior generation;
- separate activation click from command activation;
- process dialog navigation keys exactly once;
- do not replay input deferred by filters into an unrelated post-modal target.

Input disappearing during the modal and stale input applying after it closes are two sides of the
same ownership error.

## Hidden, closed, and reused dialogs

Define lifecycle states explicitly:

- constructed;
- presenting;
- visible;
- hidden with reusable state;
- closing;
- closed or disposed;
- destroyed.

A framework may hide a modal instance rather than destroy it. Reuse requires:

- new display-session generation;
- reset result and request state;
- fresh cancellation ownership;
- cleared or deliberately retained fields;
- subscription dedupe;
- no old worker or progress producer;
- new input and owner generation;
- stale callback rejection.

Object equality does not distinguish two presentations of the same instance.

## Deferred destruction and shutdown

Do not infer exact destruction time from a deferred-delete API name. Record:

- which loop or context accepted the delete;
- current nested depth;
- when control returns to the owning loop;
- whether deeper loops can trigger earlier processing;
- weak-reference invalidation;
- cleanup and completion ordering.

Shutdown must preserve both protocols:

- session-specific loops receive their own exit or cancellation;
- outer application quit remains visible to the owning main loop;
- dialogs and owners are not destroyed before local requests terminate;
- manual loops do not swallow global shutdown;
- callbacks arriving during shutdown observe terminal generations.

A general quit signal is not a substitute for dialog result completion.

## Async continuation ordering

Task, future, promise or queued completion does not imply another thread. The continuation may run
inside the nested loop before code after the blocking call.

Do not use blocking source order as an async fence:

`post work -> show modal -> code after modal`

The posted work may execute during the modal. Record causal request and session state explicitly.

Avoid sync-over-async waits. Spinning a secondary loop until a task completes trades deadlock for
full UI reentrancy.

For progress streams:

- keep only latest current-session value;
- cap update rate and queue age;
- invalidate progress at terminal completion;
- preserve boundary states;
- reject old-session updates after reuse;
- ensure the final result cannot be followed by stale progress.

## Fault matrix

Cover applicable schedules:

| Schedule or fault | Required result |
| --- | --- |
| same command reenters before guard assignment | admission occurs before pumping |
| inner callback reads half-updated model | only coherent state is visible |
| timer or IPC repeats disabled-button command | domain request rejects or joins |
| owner deletes itself during nested loop | post-return continuation rejects weak generation |
| collection mutates during outer iteration | snapshot or generation guard prevents invalid access |
| signal and return path both observe accept | model commits once |
| cancel and success race | one TryComplete winner |
| nested B closes while A remains | owner stays disabled for A |
| old completion exits current loop | session token rejects it |
| focus callback fires during dialog construction | initialization invariant holds |
| modal hides rather than destroys | next presentation receives new generation |
| inner cleanup and outer finally both run | cleanup remains idempotent |
| deferred delete runs at surprising depth | weak lifetime guard prevents access |
| global shutdown occurs inside modal | inner and outer protocols both terminate correctly |
| queued click survives filtered modal input | old input generation cannot affect new target |
| continuation runs before modal return | explicit state permits it |
| progress floods the nested loop | input, render and terminal state retain bounded progress |

## Invariants

Choose applicable executable invariants:

- session admission precedes every pumping API;
- no partial application invariant or lock crosses nested dispatch;
- one logical command has one active session or explicit duplicate policy;
- every loop exit token closes only its session;
- every modal result commits at most once;
- every owned disable, capture and cleanup resource releases exactly once by its owner;
- caller, owner and collection generations are validated after nested return;
- hidden dialog reuse cannot accept old-session callbacks;
- deferred destruction cannot leave a usable strong pointer in resumed outer code;
- old input generation cannot execute against the post-modal target;
- progress cannot follow terminal state;
- shutdown cannot lose either inner session exit or outer application quit.

## Skill handoffs

- Use `ui-dispatch-lifecycle-review` for stale queued callbacks, view epochs, close state and progress
  when no nested loop is primary.
- Use `input-event-synchronization-review` for capture, gesture and input-generation semantics.
- Use `idempotency-integrity-review` when repeated modal commands have durable side effects.
- Use `race-condition-review` for parallel interleavings beyond single-thread reentrancy.
- Use `state-machine-pattern` to implement modal session and completion transitions.
- Use `memory-lifetime-review` when raw pointers, native handles or use-after-free dominate.

