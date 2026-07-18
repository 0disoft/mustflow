# UI Dispatch and Lifecycle Checklist

Use this checklist when work is scheduled onto a UI affinity context and can outlive the operation,
view, native peer, edit version, cancellation source, or queue budget that created it.

## Contents

1. [Authority model](#authority-model)
2. [Application-time guard](#application-time-guard)
3. [Immutable payloads](#immutable-payloads)
4. [Ordering and ABA](#ordering-and-aba)
5. [User edits and remote results](#user-edits-and-remote-results)
6. [View and handle generations](#view-and-handle-generations)
7. [Cancellation ownership](#cancellation-ownership)
8. [Closing state machine](#closing-state-machine)
9. [Subscriptions, gates, and shutdown](#subscriptions-gates-and-shutdown)
10. [Queue pressure and progress](#queue-pressure-and-progress)
11. [Responsiveness diagnosis](#responsiveness-diagnosis)
12. [Deterministic fault matrix](#deterministic-fault-matrix)
13. [Invariants](#invariants)
14. [Skill handoffs](#skill-handoffs)

## Authority model

Keep these identities distinct:

| Identity | Meaning |
| --- | --- |
| operation ID | one logical load, validation, synchronization or save |
| attempt ID | one execution try |
| view instance ID | one constructed UI owner |
| attachment epoch | one native handle, peer, scene or window attachment |
| operation generation | current winner among superseding work |
| state version | UI state assumed by the result |
| edit version | local user-edit state assumed by background work |
| source version | server, file, device or model authority used for computation |
| close request ID | one shared asynchronous close sequence |

A dispatcher ensures only the scheduled execution context. It does not choose the current operation
or view generation.

## Application-time guard

Validate inside the UI callback immediately before mutation:

- owner is still open;
- view instance matches;
- attachment or handle epoch matches;
- operation is still current;
- cancellation has not become terminal;
- expected state and edit versions still match;
- target entity still exists;
- result has not already applied;
- terminal state does not forbid the transition.

A check before enqueue is useful for avoiding obvious work but is not a correctness gate.

Log rejection with stable reason such as `owner_closed`, `view_epoch_mismatch`,
`operation_superseded`, `edit_conflict`, `canceled` or `terminal_state`.

## Immutable payloads

Construct one immutable result before enqueue. Include every field that must agree:

- item collection and count;
- ordering and grouping;
- totals and derived values;
- selected stable ID;
- loading, error and completion state;
- source and edit versions;
- operation and view generations.

Do not capture a mutable model, list, builder, iterator or child graph that a worker can continue
changing. Copying only the outer object reference does not transfer ownership.

Prefer one UI state replacement to several property notifications whose intermediate combinations
can trigger bindings, converters, validation or commands.

## Ordering and ABA

A FIFO dispatcher orders enqueue operations, not background task start order or source causality.

Give superseding work a monotonic generation. A repeated value does not prove the same generation:

`A request 17 -> B request 18 -> A request 19`

Result 17 must not pass merely because the current visible value is A.

Define a terminal precedence table. Completion, cancellation, failure and progress must not regress
each other. An obsolete progress callback cannot follow a terminal result.

## User edits and remote results

Capture:

- edit version at background-work start;
- source version;
- target range or stable field identity;
- composition or selection state when relevant;
- local dirty or uncommitted status.

At application choose one explicit policy:

- local edit wins and remote result becomes stale;
- merge by domain rule;
- show conflict without overwriting;
- restart computation against the current edit;
- apply only untouched fields.

Do not overwrite active composition, caret, selection or uncommitted text solely because a server
response completed later.

## View and handle generations

Increment an attachment epoch on applicable events:

- native handle recreation;
- detach and reattach;
- scene or window change;
- owner or parent change;
- view reuse;
- close and reopen;
- model replacement;
- display or rendering-peer recreation.

Object reference equality, same title, same entity ID or reused view model does not prove the same
rendering lifetime.

Callbacks carry both view instance and attachment epoch. A callback from a retired epoch cannot
mutate the new peer.

## Cancellation ownership

Cancellation is a request to cooperate. It does not:

- remove already queued UI callbacks;
- prove the worker stopped;
- authorize disposal of resources still in use;
- clear an operation's busy state;
- guarantee a callback runs later or on another thread.

Each operation owns a local cancellation source. An old `finally` disposes only its captured source
and clears shared fields only through compare-by-identity or generation.

Treat cancellation callbacks as potentially synchronous at registration or cancel call. Keep them
small, nonblocking and free of complex UI or lock reentry.

For semaphores and gates, track acquisition locally. Release only after successful acquisition and
only once. Prefer an owner-bearing lease for complex gates.

## Closing state machine

Use:

`Open -> Closing -> Closed`

When the framework close event is synchronous:

1. first request cancels immediate destruction;
2. atomically enter Closing and store one close task;
3. reject new work and input admission;
4. request cancellation from owned operations;
5. await owned completion without blocking the UI affinity context;
6. dispose lifetime subscriptions, timers and resources;
7. flush required state;
8. request final framework close once;
9. enter Closed.

Additional close requests during Closing return or join the same close task.

Every continuation checks close state and view generation. Queued callbacks after Closing are
rejected even if their worker succeeded.

## Subscriptions, gates, and shutdown

Bind event, timer, observable, message-bus, progress and global-service subscriptions to one lifetime
container. Dispose the container at close, while retaining callback generation guards for work
already queued.

Zombie views are correctness bugs, not only leaks: a retained closed view can consume events and
race a newly opened view.

Order application shutdown:

1. block new UI and background work;
2. stop periodic and event-driven producers;
3. request cancellation;
4. drain owned tasks to a bounded deadline;
5. persist required durable state;
6. stop services in dependency order;
7. destroy views and dispatch infrastructure;
8. finalize diagnostics.

Avoid relying on one long last-second save. Use normal-operation journaling or atomic persistence
where durability matters.

## Queue pressure and progress

Record enqueue, start and apply time per callback. Queue delay is `start - enqueue`.

Coalesce supersedable updates:

- progress retains latest current-generation value;
- pointer or high-rate input follows its semantic compaction policy;
- status boundaries and terminal states are never discarded;
- final completion invalidates older queued progress;
- per-source update rate is bounded;
- queue age and oldest useful work are bounded.

Different dispatcher priorities can reorder visible outcomes. Include priority in the contract and
trace.

## Responsiveness diagnosis

Correlate these stages:

`created -> worker_started -> dispatch_enqueued -> ui_started -> state_applied -> layout -> paint -> presented`

Classify delay:

| Delay surface | Evidence |
| --- | --- |
| worker start | thread-pool queue age and worker availability |
| UI queue | enqueue-to-start latency and priority |
| lock or sync call | off-CPU wait and owner chain |
| allocation or GC | allocation types before pause and stop timeline |
| layout | invalidation source and pass fan-out |
| paint | damage region, layers and overdraw |
| GPU | fence, readback, upload and presentation waits |
| external component | RPC, COM, IME, accessibility, clipboard, shell or driver wait |
| input storm | event rate, work per event and starvation of render or idle |

Low CPU can mean blocked or starved work. Short callbacks can still form a long queue.

Use a UI heartbeat to retain traces when tail queue delay crosses a product threshold. Track tail
and consecutive delays, not only averages.

## Deterministic fault matrix

Use a controllable dispatcher, virtual clock and explicit barriers:

| Schedule or fault | Required result |
| --- | --- |
| old result completes after new result | old generation is rejected |
| value A returns after A-B-A | ABA generation rejects first A |
| view closes after enqueue before run | callback performs no mutation |
| native peer recreates before run | old attachment epoch is rejected |
| cancel occurs after enqueue | callback checks terminal cancellation |
| mutable source changes after enqueue | immutable payload remains coherent |
| progress backlog precedes completion | terminal state cannot regress |
| old finally runs after new start | new owner state remains intact |
| close requested twice | one close task and cleanup sequence |
| cancellation callback runs inline | no lock or UI reentry corruption |
| semaphore wait cancels before acquire | permit count remains correct |
| subscription retains closed view | lifetime invariant detects leak |
| thread pool is saturated | worker-start delay is visible |
| layout or input storm floods queue | queue age and compaction show cause |
| shutdown destroys service early | dependency-order invariant fails |

Preserve schedule decisions and state transitions when a fixture fails.

## Invariants

Choose applicable invariants:

- closed or retired views receive zero state mutations;
- an old operation or attachment generation cannot apply;
- UI state snapshots are internally coherent;
- one current operation owns busy, cancellation and cleanup state;
- a terminal state cannot transition back to progress or loaded work from an old generation;
- cancellation request is not reported as completed cleanup;
- no operation releases a gate it did not acquire;
- every lifetime subscription returns to baseline after close;
- Closing admits no new owned work;
- shutdown destroys dependencies only after their owned users drain or reach a documented bound;
- queue age and callback production remain bounded;
- each interaction trace can distinguish worker, dispatcher, layout, paint and presentation delay.

## Skill handoffs

- Use `modal-loop-reentrancy-review` when nested pumping or a blocking dialog keeps the outer
  callback stack active.
- Use `race-condition-review` for general interleavings and happens-before evidence.
- Use `frontend-state-ownership-review` for browser state duplication without native lifecycle.
- Use `frame-render-performance-review` for layout, paint and compositing remediation after the
  dispatch delay is localized.
- Use `performance-measurement-integrity-review` for latency units, tail metrics, clock domains and
  benchmark comparability.
- Use `input-event-synchronization-review` for high-rate device-event compaction and input-session
  epochs.
- Use `state-machine-pattern` to implement close or operation lifecycle transitions.

