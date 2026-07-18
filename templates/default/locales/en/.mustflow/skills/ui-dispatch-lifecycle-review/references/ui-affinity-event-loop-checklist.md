# UI Affinity and Event Loop Checklist

Use this checklist when UI ownership, native peer creation, object graphs, bound models, await
continuations, synchronous marshaling, timers, deletion, or event-loop availability are in scope.
Confirm toolkit behavior against the repository's actual framework and version.

## Contents

1. [Owner identity](#owner-identity)
2. [Affinity creation](#affinity-creation)
3. [Object graphs and bound models](#object-graphs-and-bound-models)
4. [Worker transfer boundary](#worker-transfer-boundary)
5. [Await and continuation context](#await-and-continuation-context)
6. [Event-loop availability](#event-loop-availability)
7. [Send, post, and timers](#send-post-and-timers)
8. [Blocking and wait graphs](#blocking-and-wait-graphs)
9. [Deletion and shutdown](#deletion-and-shutdown)
10. [Responsiveness evidence](#responsiveness-evidence)
11. [Fault matrix](#fault-matrix)
12. [Invariants](#invariants)
13. [Skill handoffs](#skill-handoffs)

## Owner identity

Do not collapse these concepts:

- process entry or main thread;
- toolkit UI event thread;
- owner dispatcher, looper, actor or serial queue;
- rendering or compositor thread;
- worker thread and its event loop;
- object instance affinity;
- native handle or peer ownership.

Ask which dispatcher or thread owns this exact instance. Two objects of the same class can have
different owners.

Use toolkit assertions or stored owner identity. Thread name, class name, generic synchronization
context and “main” naming are not sufficient proof.

## Affinity creation

Identify when affinity becomes fixed:

- object construction;
- native handle or peer creation;
- attachment to a scene, window or parent;
- dispatcher or looper registration;
- first property access that lazily realizes native state;
- binding or event-source attachment.

An early affinity predicate can be ambiguous before a handle exists. Prevent workers from touching
properties that can create the handle or peer on the wrong thread.

Create UI roots and native peers deliberately on their owner context before exposing them to workers.

Treat recreation, reparenting, detach and reattach as new attachment generations.

## Object graphs and bound models

Affinity can cover an ownership graph:

- parent and child controls;
- timer and event source;
- socket or notifier;
- image, brush, font and native resource;
- model or collection consumed by bindings;
- layout, template and accessibility caches.

Do not move only the root while children or resources remain owned elsewhere. Move a supported whole
graph or recreate it on the destination.

A plain model or collection becomes affinity-sensitive when the UI enumerates it or consumes its
change events. Thread-safe container methods do not make one coherent rendering snapshot.

Treat getters as potentially active. They can realize templates, create handles, calculate layout,
populate caches, query native state or emit messages.

## Worker transfer boundary

Workers should return pure data:

- bytes or immutable pixel buffers;
- strings and numbers;
- immutable DTOs;
- immutable collection snapshots;
- effect descriptions.

Do not transfer mutable toolkit resources merely because construction finished. Use only
framework-documented frozen, detached or transferable forms and prove the freeze happened before
publication.

After ownership transfer, the producer must not continue mutating the same graph.

Publish one result snapshot with operation, view, attachment, edit and source versions.

## Await and continuation context

An async method starts on its caller until the first incomplete suspension. Continuation destination
depends on the runtime, captured context, explicit executor or actor, and code path.

At every suspension boundary ask:

- which context is captured;
- whether continuation is allowed to resume elsewhere;
- whether the destination loop is alive;
- whether the target owner and generation remain current;
- whether locks or gates cross the wait;
- whether terminal paths complete on success, failure and cancellation.

A synchronization context is a scheduling address, not a universal UI-thread identity card. It can
be absent during startup, custom in tests or hosts, and stale during shutdown.

Complete promises or task sources outside locks when continuations can run inline. Prefer explicit
asynchronous continuation scheduling for infrastructure primitives where supported.

## Event-loop availability

A thread's existence does not prove it consumes queued callbacks.

Verify:

- event loop was started;
- correct context or dispatcher is active;
- target object still has that affinity;
- loop has not begun shutdown;
- priority or mode permits the callback;
- queued deletion and timers can run;
- shutdown rejects or drains work observably.

A queue post can succeed while no consumer ever executes it. Missing completion can be starvation or
an absent terminal path, not a lock deadlock.

Separate worker-thread controller objects from worker objects that actually live on the target
thread. A thread wrapper instance can itself remain owned by the creator thread.

## Send, post, and timers

Classify delivery:

| Delivery | Structure |
| --- | --- |
| direct call | same caller stack and immediate reentrancy |
| synchronous send or invoke | caller waits for target completion |
| asynchronous post | caller returns; target loop executes later |
| timer | callback becomes eligible after a time condition; execution may be delayed or coalesced |
| paint or layout invalidation | request is recorded and often merged for a later frame |

Submitting synchronously to the same serial queue is self-deadlock. Cross-thread synchronous marshal
can deadlock when UI waits for the caller or its lock.

Asynchronous post is not parallel work. CPU-heavy code posted to the UI remains UI-thread work.

Use monotonic elapsed time for animation or timeout decisions. Timer intervals do not guarantee
exact execution times or tick counts.

## Blocking and wait graphs

Include these patterns:

- UI waits synchronously for a continuation targeting UI;
- worker synchronously invokes UI while UI joins worker;
- serial queue synchronously submits to itself;
- UI and model locks are acquired in opposite order;
- a logical async gate is held across work that needs the same gate;
- completion runs a continuation inline under a lock;
- destination loop does not run queued completion;
- one success-only completion source leaves failure or cancel waiting forever;
- bounded queue producer waits for space while consumer waits for UI approval;
- cleanup or native release needs the UI or STA context while UI waits for cleanup;
- thread-pool workers are consumed by sync-over-async waits.

Distinguish blocking deadlock, missing completion, loop starvation and pool starvation.

Do not use manual pumping to make a synchronous wait appear responsive; route that case to the modal
reentrancy review.

## Deletion and shutdown

Creation, timers, queued signals, native release and deletion can all require owner affinity.

For deferred deletion record:

- owner loop;
- whether it has started;
- shutdown state;
- queued-delete identity;
- outstanding callbacks and timers;
- confirmation or observable terminal state.

A deferred delete posted to a stopped loop is not cleanup.

Shutdown sequence:

1. stop new admissions;
2. stop producers and timers;
3. request cancellation;
4. drain or reject queued callbacks;
5. await owned tasks without blocking their completion context;
6. release resources on required owners;
7. delete object graphs;
8. stop event loops and dispatchers;
9. verify no queued lifetime work remains.

A rendering thread or mutex does not authorize general UI-object access.

## Responsiveness evidence

Record:

`created -> worker_started -> enqueued -> ui_started -> state_applied -> layout -> paint -> presented`

Also retain:

- target dispatcher and priority;
- queue age and depth by priority;
- event-loop heartbeat delay;
- worker queue age and active pool size;
- lock owner and hold duration;
- allocation types before GC pauses;
- invalidation origin and layout pass count;
- damaged region and overdraw;
- GPU fence, readback and upload waits;
- synchronous external-process calls;
- high-rate input and progress production.

A low-CPU UI can be blocked. A high-CPU UI can be live but starve input and rendering.

## Fault matrix

| Fault | Required result |
| --- | --- |
| main thread is not toolkit UI thread | owner assertion routes correctly |
| affinity checked before native handle exists | worker cannot create the handle |
| child resource has another owner | graph audit rejects or recreates |
| getter invoked from worker | affinity assertion catches active read |
| bound collection mutates from worker | immutable snapshot boundary holds |
| mutable image or font crosses thread | transfer contract rejects it |
| continuation resumes after context change | application guard revalidates |
| synchronization context is null or custom | owner identity does not depend on it |
| target loop never started | queued work is rejected or diagnosed |
| loop shuts down with queued deletion | cleanup remains observable and bounded |
| synchronous invoke targets same queue | self-deadlock prevention fires |
| UI waits while worker invokes UI | wait graph exposes the cycle |
| completion runs inline under lock | continuation cannot reenter protected state |
| one task path omits completion | terminal-path invariant fails |
| bounded queue and UI approval cycle | protocol avoids circular backpressure |
| timer fires late or coalesces | elapsed-time logic remains correct |
| high-priority work floods dispatcher | lower-priority progress remains bounded |

## Invariants

Choose applicable invariants:

- every UI or bound object has one known owner;
- no worker creates a native UI peer accidentally;
- every owned object graph has compatible affinity;
- only pure or explicitly frozen data crosses worker-to-UI boundary;
- every continuation has an observable destination and terminal path;
- queued work requires a live consuming event loop;
- no synchronous dispatch targets its current serial queue;
- no wait cycle depends on a blocked UI context;
- deletion and timer shutdown execute on required owners;
- stopped loops retain no unaccounted queued lifetime work;
- timer and dispatcher delay cannot masquerade as physical elapsed time;
- affinity assertions remain enabled in development and representative tests.

## Skill handoffs

- Use `ui-dispatch-lifecycle-review` for freshness, view epochs, cancellation, closing and queue
  pressure.
- Use `modal-loop-reentrancy-review` for nested pumping and same-stack reentry.
- Use `race-condition-review` for memory ordering and parallel interleavings.
- Use `frame-render-performance-review` after delay is localized to layout, paint or GPU work.
- Use `memory-lifetime-review` for raw pointer and native-resource lifetime.
- Use the framework-specific skill when exact toolkit or runtime behavior determines the fix.

