# Modal Loop and Reentrancy Checklist

Use this checklist when one event-processing stack can dispatch another event before the outer
handler returns. Confirm framework and version behavior from current repository or official sources;
do not treat this matrix as a substitute for platform evidence.

## Contents

1. [Failure classification](#failure-classification)
2. [Outer-frame inventory](#outer-frame-inventory)
3. [Wait and delivery graph](#wait-and-delivery-graph)
4. [Framework behavior matrix](#framework-behavior-matrix)
5. [Unsafe patterns](#unsafe-patterns)
6. [Asynchronous interaction contract](#asynchronous-interaction-contract)
7. [State and owner revalidation](#state-and-owner-revalidation)
8. [File-picker authority](#file-picker-authority)
9. [Tracing without observer effects](#tracing-without-observer-effects)
10. [Platform diagnostic routing](#platform-diagnostic-routing)
11. [Fault matrix](#fault-matrix)
12. [Invariants](#invariants)
13. [Skill handoffs](#skill-handoffs)

## Failure classification

Distinguish these outcomes before changing code:

| Class | Observable structure |
| --- | --- |
| deadlock | a closed wait cycle prevents required progress |
| starvation | required work is ready or posted but the active mode, context, priority or filter never dispatches it |
| livelock | callbacks and messages run while the request state never advances |
| stale continuation | the outer handler resumes after owner or model authority changed |
| reentrant corruption | an inner callback observes or mutates a partially updated invariant |
| human-path starvation | wrong owner, capture or disable policy removes the only user exit |

A responsive window, nonzero CPU, or active message stream does not rule out livelock or starvation.

## Outer-frame inventory

At each nested-loop boundary record:

- outer handler and originating event;
- current thread and affinity;
- call site and modal depth;
- owner, document, surface and request identity;
- locks, transactions and guards still held;
- iterators, object pointers, visual elements and selected items still referenced;
- multi-field state currently between valid states;
- callbacks or host contracts waiting for the outer return;
- code that resumes after the inner loop exits;
- actual exit signal and terminal-result owner.

Attack the assumption that a local variable remains valid merely because its stack frame still
exists.

## Wait and delivery graph

Model both waits and the context needed to satisfy them.

Nodes can include:

- UI and worker threads;
- mutexes, events, semaphores and condition variables;
- tasks, futures and dispatcher operations;
- queued messages and synchronous sent messages;
- COM, RPC, IPC and plugin calls;
- run-loop modes, main contexts and source priorities;
- portal or provider request handles;
- dialog owner, capture and input-disable state;
- user action required to close the request.

For each completion edge, record:

- who is waiting;
- what must run;
- target thread or context;
- required mode and priority;
- whether it is queued, sent, invoked, signaled or polled;
- which filter can defer or consume it;
- whether owner shutdown removes the callback path.

A posted completion is not progress evidence when its context is not active.

## Framework behavior matrix

Use this as a question list, not a frozen compatibility promise:

| Family | Boundary to verify |
| --- | --- |
| native Windows dialog | owner disable, nested message dispatch, queued versus synchronous messages, actual dialog termination |
| dispatcher-based Windows UI | nested dispatcher frame, priorities, routed-event continuation, deferred operations |
| COM apartment UI | apartment type, outgoing-call pumping, callback delivery and synchronous call cycles |
| AppKit | modal versus sheet API, active run-loop mode, tracking modes and source registration |
| Qt | blocking dialog execution, local loop flags, deferred deletion, thread affinity and queued signals |
| GLib or GTK | recursive main loop, selected main context, source priority, recursion policy and portal boundary |
| desktop portal | process boundary, response subscription ordering, cancel semantics and capability result |
| embedded browser or WebView | callback serialization, host return requirement, UI posting and reentrancy restrictions |

Do not describe all platforms as one global message queue. Mode filters, recursive contexts,
synchronous calls, thread affinity and external portal processes create different failure shapes.

## Unsafe patterns

Reject or prove safe:

- lock held while opening a blocking dialog;
- partially updated model exposed across nested dispatch;
- UI thread waiting for a completion posted to the UI thread;
- two threads or components issuing synchronous calls back into each other;
- completion source attached only to a mode or context not run by the modal loop;
- always-ready high-priority source starving completion or cancel;
- loop flags excluding the only socket, input or close event;
- `while (!done) processEvents()` or equivalent busy pumping;
- confirmation handler opening another confirmation before changing state;
- wrong owner, capture or disable target;
- callback opening blocking UI before returning to a serialized host;
- general application quit treated as the nested dialog's exit;
- future-returning wrapper immediately blocked by the caller;
- global `isDialogOpen` or reentrancy boolean without owner and generation;
- iterator, selected index or object pointer retained across user think time;
- cancellation waiting forever for an optional provider response.

## Asynchronous interaction contract

Prefer a nonblocking request:

`Idle -> Presenting -> AwaitingResult -> Applying | Cancelled -> Done`

Required properties:

- enter `Presenting` before any call that can synchronously invoke callbacks;
- stable request, owner and generation identity;
- exactly one terminal result;
- explicit duplicate policy: coalesce, queue or busy;
- bounded queue and no recursive dialog stack;
- presentation posted after the current callback returns;
- result delivered by task, future, signal or callback without sync-over-async;
- owner close and explicit cancel complete locally;
- late result is an idempotent no-op;
- apply step revalidates target and authority;
- long work begins after presentation closes.

Scope modal behavior to the affected window or document when product semantics allow unrelated work
to continue.

Prefer reversal and recovery over confirmation theater: undo, soft delete, versioning, preview,
staged apply and atomic replace can remove the need for a blocking question.

## State and owner revalidation

Snapshot stable intent, not transient objects:

- entity or document ID;
- expected revision or generation;
- requested action and parameters;
- owner ID and lifecycle generation;
- permission or capability identity;
- request ID and creation context.

After completion verify:

- owner still exists and owns the request;
- target still exists;
- expected revision or precondition still holds;
- permission or capability remains valid;
- destination surface or document is current;
- result has not already completed or been canceled.

Recompute against current state or reject. Do not blindly continue the old routed event or mutate
the old selection.

## File-picker authority

A picker result can include authority beyond a path:

- URI or provider identifier;
- display name and metadata;
- sandbox grant, bookmark, token or file descriptor;
- remote object or lazy provider handle;
- capability lifetime and persistence rule.

Preserve the authority-bearing result type. A local path string may not remain accessible across
processes, sandbox boundaries, remote providers or later runs.

Portal-like flows need:

- response subscription before or atomically with request publication;
- stable request handle and owner;
- local cancel completion even when no later response arrives;
- late response suppression;
- capability cleanup;
- result schema and lifecycle evidence.

## Tracing without observer effects

Record a modal or interaction span with:

- monotonic time and global or thread-local sequence;
- request, owner, dialog and event identity;
- UI thread and source thread;
- call site and modal depth;
- current mode, main context or dispatcher priority;
- enter, callback, wait, wake, exit and completion events;
- exit or cancellation reason;
- state hash before and after reentrant callbacks;
- queued versus synchronous dispatch;
- target thread and wait edge.

Use fixed-size numeric records in a bounded memory ring on hot hooks. Avoid file I/O, formatting,
allocation, application locks and state mutation in the observer.

Capture full thread stacks and CPU state at the hang point. Busy repeated frames indicate a
different class than a low-CPU blocking wait.

Build a wait-for graph from both system objects and application-level tasks, dispatchers, RPCs and
request handles.

## Platform diagnostic routing

Select only diagnostics authorized by the command contract and current platform:

- Windows: queued-message, sent-message and modal-filter paths are distinct; correlate application
  spans with thread waits and system traces.
- Dispatcher frameworks: record operation posted, started, completed or aborted, priority, nested
  frame depth and resumed event age.
- AppKit: record run-loop activities, active mode, local event dispatch and signposted interaction
  spans.
- Qt: record loop depth, dispatcher sleep and wake, filtered framework events and bounded native
  events.
- GLib or GTK: name sources and record context, priority, recursion, callback duration and readiness.
- Portals: record request publication, response subscription, returned handle, cancellation and
  terminal local task state.

Observers must forward or preserve events. A diagnostic hook that consumes an event or changes
priority invalidates the reproduction.

## Fault matrix

Cover relevant cases:

| Fault | Expected result |
| --- | --- |
| callback reenters before outer return | invariant remains valid or reentry is deferred |
| lock held at modal entry | assertion or structural prevention fires |
| UI waits on UI-posted completion | wait graph exposes and implementation avoids cycle |
| completion registered in inactive mode | request remains observable and design routes correctly |
| high-priority source reposts continuously | completion and cancellation have bounded progress |
| input or socket class excluded | exit path remains available |
| manual pump receives new work continuously | state still terminates or manual pump is absent |
| confirmation double click | one owner request is admitted |
| owner closes while awaiting result | request cancels exactly once |
| stale model revision after think time | result is recomputed or rejected |
| provider responds immediately | subscription or continuation does not miss response |
| provider omits response after cancel | local cancellation still completes |
| old completion arrives after new generation | new request state is unchanged |
| shutdown during presentation | no orphan disable, capture, task or callback remains |
| tracing enabled | failure class and timing remain representative |

Prefer deterministic reentry hooks and fake request providers over arbitrary sleeps.

## Invariants

Choose applicable executable invariants:

- modal depth is bounded by policy;
- no application lock or partial invariant crosses nested dispatch;
- every interactive request has one owner and one terminal completion;
- owner closure cannot leave an awaiting request alive;
- old generations cannot apply results;
- request state advances or reaches a bounded terminal state;
- the exit event's source remains dispatchable;
- cancellation does not depend on an optional remote response;
- presentation does not occur inside a host callback that forbids reentrancy;
- capability-bearing results retain required authority;
- tracing does not block, allocate unboundedly, consume events or acquire application locks.

## Skill handoffs

- Use `race-condition-review` for parallel interleavings, happens-before, atomics and data races.
- Use `concurrency-invariant-review` for lock order, condition variables, resource ownership and
  shutdown outside the modal boundary.
- Use `async-timing-boundary-review` for readiness, polling and waits after nested-loop risk is
  removed.
- Use `state-machine-pattern` to implement the interactive request lifecycle.
- Use `frontend-accessibility-tree-review` for dialog semantics, focus trap, announcements and
  keyboard behavior.
- Use `file-path-handling` or the platform adapter skill for picker URI, capability and path
  boundaries.
- Use `provenance-license-gate` before copying platform hook or diagnostic examples.

