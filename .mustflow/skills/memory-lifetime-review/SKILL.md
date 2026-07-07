---
mustflow_doc: skill.memory-lifetime-review
locale: en
canonical: true
revision: 3
lifecycle: mustflow-owned
authority: procedure
name: memory-lifetime-review
description: Apply this skill when code is created, changed, reviewed, or reported and object lifetime, retained references, cleanup symmetry, event listeners, timers, subscriptions, goroutines, threads, workers, streams, native handles, caches, queues, or memory/resource leak risk may matter.
metadata:
  mustflow_schema: "1"
  mustflow_kind: procedure
  pack_id: mustflow.core
  skill_id: mustflow.core.memory-lifetime-review
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

# Memory Lifetime Review

<!-- mustflow-section: purpose -->
## Purpose

Find memory and resource leaks by tracing what still retains a value, handle, task, listener, or buffer after the useful work is done.

The question is not only "where was it allocated?" The stronger review question is "which longer-lived owner can still reach it?" In garbage-collected languages, an unused object remains alive when a live object still references it. In non-GC or native-resource paths, the same shape appears as a missing close, cancel, release, unsubscribe, shutdown, or ownership-transfer rule.

<!-- mustflow-section: use-when -->
## Use When

- Code creates, changes, reviews, or reports event listeners, observers, subscriptions, intervals, timeouts, animation frames, effects, ref callbacks, registries, caches, maps, queues, pools, workers, threads, goroutines, futures, tasks, streams, sockets, files, database cursors, image or GPU handles, native handles, or external client sessions.
- A long-lived object such as a singleton, static field, module cache, process-level registry, service, worker, ViewModel, global store, connection pool, scheduler, or background task can retain a request, response, user session, DOM node, UI component, Activity, Fragment, context, socket, buffer, payload, or closure.
- Code adds lifecycle setup such as `new`, `open`, `connect`, `subscribe`, `observe`, `addEventListener`, `setInterval`, `setTimeout`, `context.WithCancel`, `ThreadLocal.set`, `malloc`, `retain`, `shared_ptr`, `Rc`, task spawning, stream creation, or cache insertion.
- Code uses closures, callbacks, lambdas, async work, promises, channels, effects, refs, logging queues, metrics queues, debug arrays, maps, or registries that may capture or store large or short-lived objects.
- A review or final report claims that a path is leak-free, bounded, cleaned up, disposable, safe for repeated mount/unmount, safe for long-running processes, safe under retries, or safe for repeated requests.

<!-- mustflow-section: do-not-use-when -->
## Do Not Use When

- The task is only about CPU time, latency, query count, bundle size, or payload size with no retained-reference, cleanup, or resource-lifetime risk; use `performance-budget-check`.
- The task is only ordinary ownership or borrowing inside one language-specific change and the matching language skill fully covers the risk; use this skill only if the retention or cleanup boundary crosses callbacks, async tasks, process lifetime, UI lifecycle, native handles, or shared registries.
- The task is only database schema, migration, authorization, or API contract work with no long-lived process, stream, queue, cache, or resource handle; use the more specific skill.
- The only evidence is a vague worry about memory without code paths, retained owners, repeated lifecycle actions, or resource handles to inspect.

<!-- mustflow-section: required-inputs -->
## Required Inputs

- Lifetime surface: UI mount/unmount, request/response, job, worker, stream, queue, cache, pool, process, test runner, CLI command, background task, native resource, or application shutdown.
- Setup sites: allocation, registration, subscription, listener attachment, timer creation, task spawn, context creation, handle open, cache insert, registry add, ref storage, or ownership transfer.
- Cleanup sites: remove, abort, cancel, close, clear, unsubscribe, dispose, release, terminate, join, shutdown, delete, weak ownership, eviction, TTL expiry, bounded queue drop, stream return, or final response cleanup.
- Retainer graph: the longer-lived owner, the shorter-lived object, the reference path between them, and the expected point where that reference should be severed.
- Repetition path: repeated requests, screen open/close, route changes, tab switches, reconnects, retries, scheduled runs, test cases, or long-running sessions that can accumulate retained state.
- Error and success paths: normal completion, early return, partial read, cancellation, timeout, retry, exception, unmount, shutdown, and dependency failure behavior.
- Diagnostic evidence for native or low-level memory faults: first sanitizer or memory-checker report, invalid write/read address, watchpoint condition, allocator or quarantine behavior, fuzzing input, core dump, symbols, build id, shared library list, and configured or manual diagnostic boundary.
- Relevant command-intent contract entries for tests, builds, docs, release checks, and mustflow validation.

<!-- mustflow-section: preconditions -->
## Preconditions

- The task matches the Use When conditions and does not match the Do Not Use When exclusions.
- Higher-priority instructions and `.mustflow/config/commands.toml` have been checked for the current scope.
- Required inputs are available, or missing inputs can be reported without guessing.
- If authorization, secrets, personal data, telemetry, or audit records are retained, also use `security-privacy-review`.
- If queue, cache, retry, worker, health, or operational behavior changes, also use `backend-reliability-change`.
- If user-perceived latency, throughput, allocation churn, GC pressure, or memory budget is claimed, also use `performance-budget-check`.
- If UI lifecycle, rendering, or browser behavior changes, also use the matching UI or framework skill.

<!-- mustflow-section: allowed-edits -->
## Allowed Edits

- Add or tighten teardown, cancellation, ownership, weak-reference, eviction, queue-bound, stream-close, worker-shutdown, and lifecycle-symmetry code tied to the task.
- Refactor setup and cleanup into a shared lifecycle boundary when it prevents duplicate registration or forgotten teardown.
- Add focused tests, fixtures, probes, or docs that prove cleanup symmetry, bounded retention, repeated lifecycle behavior, or native-resource disposal when repository evidence supports them.
- Do not hide leak warnings by raising listener limits, disabling strict lifecycle checks, adding finalizers as primary cleanup, or weakening tests.
- Do not add object pools as a default leak or GC fix. Pool only heavy buffers, large arrays, native handles, or repeatedly allocated expensive objects after allocation evidence shows churn; ordinary short-lived records are often cheaper to let the generational collector reclaim.
- Do not use weak references as a design cover-up when the real owner and cleanup point should be explicit.

<!-- mustflow-section: procedure -->
## Procedure

1. Name the lifetime boundary. State which object or resource should die at request end, unmount, stream close, job completion, retry cancellation, test end, worker shutdown, or process exit.
2. Build a retainer ledger.
   - For each setup site, record the long-lived owner, the short-lived object or resource, the reference path, and the intended cleanup owner.
   - Treat singletons, static maps, module-level arrays, registries, caches, listeners, stores, workers, ViewModels, thread pools, goroutines, and scheduler state as long-lived until proven otherwise.
   - Treat requests, responses, DOM nodes, UI components, Activity or Fragment instances, contexts, buffers, payloads, streams, sockets, cursors, and per-job state as short-lived unless the product explicitly says they are durable.
3. Check setup and cleanup symmetry in the same change.
   - `addEventListener` needs a stable removal path or an `AbortSignal` tied to teardown.
   - `setInterval`, repeated `setTimeout`, animation frames, schedulers, and cron-like loops need clear, cancel, shutdown, or bounded end behavior.
   - `subscribe`, `observe`, websocket, EventSource, stream, file, DB cursor, socket, and provider client handles need unsubscribe, close, dispose, or abort behavior.
   - `context.WithCancel`, `WithTimeout`, or `WithDeadline` needs cancel on all paths that stop needing the child context.
   - `ThreadLocal.set` in pooled threads needs a `remove` path in a finally-like boundary.
4. Review normal repeated paths before rare error paths. Screen open/close loops, route changes, tab switches, request loops, reconnect loops, scheduled jobs, queue redeliveries, and test reruns often expose leaks better than exceptional returns.
5. Inspect closure capture.
   - A small callback may retain `this`, request, response, context, session, view, DOM event, buffer, large array, database row, or provider payload.
   - If the callback is stored in a long-lived emitter, timer, queue, cache, worker, or registry, shrink captures to stable identifiers or copied scalar values.
6. Check anonymous or unstable listener identities. A listener added with a fresh anonymous function in a loop or mount path usually cannot be removed by function identity. Prefer a stable callback reference or a scoped abort controller when the platform supports it.
7. Treat timeout wrappers as incomplete cancellation. `Promise.race` or equivalent timeout selection does not stop the losing work by itself. Verify that fetches, DB calls, streams, workers, goroutines, futures, or background tasks receive a real abort, cancel, close, or done signal.
8. Check streams and async iterators. Early break, partial read, error, or return paths must close, cancel, drain, or otherwise release upstream sockets, file descriptors, buffers, goroutines, and listeners.
9. Bound caches, registries, debug stores, logs, and queues.
   - Caches need max entries or bytes, TTL, eviction, key cardinality review, authorization dimensions, and stale behavior.
   - Debug arrays such as recent requests, events, responses, payloads, traces, or errors need a cap and should store small copied facts rather than live large objects.
   - Logs, metrics, traces, and dead-letter queues should not retain raw requests, responses, DOM events, exception graphs, payload bodies, tokens, or personal data.
   - Producer-consumer queues need a capacity, drop or backpressure policy, timeout, and consumer shutdown path.
10. Check language and runtime traps where applicable.
    - JavaScript and TypeScript: `addEventListener`, EventEmitter listeners, `setMaxListeners`, timers, intervals, unresolved promises, `AbortSignal`, React effects, ref arrays, module caches, maps, and logging queues.
    - JavaScript metadata: use `WeakMap` or `WeakSet` for metadata attached to DOM nodes, AST nodes, request objects, sockets, or component instances when the metadata should die with the object; use a normal `Map` only when retention is intentional and bounded.
    - JavaScript allocation and GC: avoid turning small short-lived records into long-lived pooled objects without evidence; check large temporary arrays, buffers, object graphs, array method chains, and old-generation retention before tuning `--max-old-space-size` or `--max-semi-space-size`.
    - React and similar UI runtimes: effects that touch the outside world need cleanup that reverses setup; ref callbacks and registries must remove old nodes and survive strict double-invocation checks.
    - Android: ViewModel or application-scope objects must not retain Activity, Fragment, View, lifecycle owner, or short-lived context; use lifecycle cleanup such as `onCleared` where appropriate.
    - Java and Kotlin: thread pools plus `ThreadLocal`, static caches, listener registries, executors, cursors, streams, and closeable resources need explicit release.
    - Go: goroutines must exit on their own, channels need a done or cancellation path when downstream stops early, contexts need cancel, and finalizers are not primary cleanup.
    - C and C++: ownership transfer must be explicit across raw pointers, containers, callbacks, and failure paths; `shared_ptr` cycles need `weak_ptr` or a different ownership shape.
    - Rust: `Rc`, `Arc`, `RefCell`, task handles, channels, and cycles can leak even when memory safety is preserved; use weak ownership or explicit shutdown when ownership is not truly shared.
    - Python: weak references are useful for caches and observer maps, but not as a substitute for a clear lifetime owner; check global dicts, LRU caches, callbacks, generators, files, and async tasks.
11. For native or low-level memory corruption, chase the first invalid access instead of the crash line.
    - Treat the crash line as a victim until the first invalid write, invalid read, use-after-free, double free, uninitialized value, or ownership violation is identified.
    - Prefer the first sanitizer, memory-checker, or watchpoint report over later cascade failures.
    - Use watchpoint, reverse-debugging, core dump, symbol, build-id, allocator, quarantine, or memory-poison evidence only through configured or manual diagnostics; do not infer raw commands from tool names.
12. Separate diagnostic build axes when they exist.
    - ASan/UBSan/LSan, TSan, MSan, release-with-asserts, debug allocator, guard-page allocator, hardware tagging, and fuzzing-with-sanitizers expose different bug classes and usually should be reported as separate configured or manual evidence surfaces.
    - Do not claim memory-corruption proof from a normal unit test unless it actually exercises the ownership and lifetime boundary.
13. Treat dangling references as ownership failures.
    - Ask which owner promised the object would remain alive across async callbacks, observer lists, event buses, lambda captures, coroutines, workers, caches, intrusive lists, and queues.
    - Prefer stable handles, owner id plus generation id, unregister-on-drop or RAII boundaries, weak-reference lock windows, and queueing copied identifiers instead of raw object pointers or references when local style supports them.
14. Preserve production crash evidence when reproduction is unavailable.
    - Core dump, exact binary, symbols, build id, shared library list, process maps, allocator state, failing input, and deployment version can be the only evidence for a memory fault.
    - If those artifacts are unavailable or manual-only, report that boundary instead of implying the crash was diagnosed from logs alone.
15. Reject finalizers as the main plan. Finalizers, destructors, drop hooks, or weak callbacks can be last-resort diagnostics or safety nets, but the review should still identify deterministic cleanup for resources and reference removal.
16. Separate allocation churn from retained memory. High allocation rate, GC pauses, retained heap, external memory, and RSS growth point to different fixes. Prefer allocation timeline, heap snapshot, retaining-path, `--trace-gc`, sanitizer, or runtime memory evidence when configured; report unconfigured tools as manual evidence instead of guessing from RSS alone.
17. Add a repeated-lifecycle proof when feasible. Prefer a focused test or probe that repeats the risky lifecycle, then asserts listener count, registry size, cache size, goroutine/task completion, handle closure, queue depth, or retained object count. If heap snapshots, leak profilers, sanitizer runs, memory-checker runs, fuzzers, core dump inspection, or platform-specific diagnostics are not configured intents, report them as manual evidence gaps instead of running raw commands.

<!-- mustflow-section: postconditions -->
## Postconditions

- Every setup site has a cleanup owner, cleanup trigger, and repeated-path behavior, or the missing evidence is reported.
- Long-lived owners no longer retain short-lived objects beyond their intended lifecycle, or the remaining retention is intentional and bounded.
- Caches, queues, registries, debug stores, and logging or telemetry buffers have capacity, eviction, truncation, or copied-value boundaries where they can grow.
- Weak metadata, object pooling, allocation churn, GC flags, and retained-heap claims are backed by ownership or diagnostic evidence rather than folklore.
- Async, stream, worker, goroutine, thread, and native-resource paths have deterministic cancellation, close, shutdown, or release behavior where the platform supports it.
- Native or low-level memory fault analysis names the first invalid access evidence or reports the missing diagnostic boundary instead of blaming the final crash line.
- Tests or configured verification cover the highest-risk repeated lifecycle when feasible.

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

Use the narrowest configured test, build, docs, release, or mustflow intent that proves the changed lifetime surface. Do not infer raw heap snapshot, profiler, sanitizer, browser, device, server, database, or load-test commands.

<!-- mustflow-section: failure-handling -->
## Failure Handling

- If a configured test or build fails, preserve the failing intent and output tail, then fix the lifecycle boundary that the failure exercised before broad refactors.
- If no cleanup owner can be identified, stop and report the retainer path and missing lifecycle decision instead of hiding it behind weak references or comments.
- If setup and cleanup live in separate owners, make the ownership transfer explicit or report the split as a residual leak risk.
- If repeated-lifecycle proof requires unconfigured heap, profiler, sanitizer, browser, device, or load-test access, report the missing manual evidence and complete the configured checks that are available.
- If leak reduction conflicts with product semantics, authorization, durability, observability, or retry behavior, use the relevant stronger skill and report the tradeoff.

<!-- mustflow-section: output-format -->
## Output Format

- Lifetime boundary reviewed
- Setup sites and cleanup owners
- Retainer paths found or ruled out
- Long-lived owners and short-lived objects checked
- Timers, listeners, subscriptions, streams, workers, goroutines, threads, native handles, caches, queues, registries, closures, and logs checked where relevant
- Weak metadata, object pooling, allocation churn, and GC diagnostics checked where relevant
- First invalid access, diagnostic build axis, dangling ownership, fuzzing or core-dump evidence where relevant
- Cleanup symmetry changes made or recommended
- Repeated-lifecycle proof: configured, manual-only, missing, or not applicable
- Command intents run
- Skipped diagnostics and reasons
- Remaining memory or resource lifetime risk
