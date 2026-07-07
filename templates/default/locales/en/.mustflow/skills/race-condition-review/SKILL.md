---
mustflow_doc: skill.race-condition-review
locale: en
canonical: true
revision: 3
lifecycle: mustflow-owned
authority: procedure
name: race-condition-review
description: Apply this skill when code is created, changed, reviewed, or reported and shared state can be observed across interleaving execution flows, including check-then-act, read-modify-write, stale reads after await or I/O, lock scope and order, tryLock, timeout or retry behavior, cache miss fill, lazy initialization, atomics and memory ordering, database transaction races, uniqueness, distributed locks, fencing tokens, idempotency state records, atomic file creation, event or outbox ordering, inbox or dedupe consumers, per-key serialization, queue duplicates, shutdown, cancellation, timers, close/send races, shared collections, object reuse, fake immutability, sleep-based race tests, log ordering, and state-machine transitions.
metadata:
  mustflow_schema: "1"
  mustflow_kind: procedure
  pack_id: mustflow.core
  skill_id: mustflow.core.race-condition-review
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

# Race Condition Review

<!-- mustflow-section: purpose -->
## Purpose

Find race conditions by tracing which shared facts can become stale before code acts on them.

The review question is not "does this code use threads?" The stronger question is "does code read a shared value, keep a meaning in its head for more than one step, and then let another execution flow change that meaning before the action?" Race bugs appear in async servers, queues, database writes, caches, filesystems, timers, shutdown paths, and event streams even when the language runtime has a single event loop.

<!-- mustflow-section: use-when -->
## Use When

- Code is created, changed, reviewed, or reported and shared state, durable state, cached state, process state, collection state, socket state, file state, queue state, or lifecycle state can be touched by more than one request, worker, callback, timer, retry, queue delivery, or async continuation.
- Code reads state and later acts on that read after `await`, I/O, a database call, callback invocation, event publish, lock release, timer scheduling, queue insertion, retry, cancellation, shutdown, or another function call.
- Code uses check-then-act, read-modify-write, `++`, `+=`, `push`, `append`, `map[key] = value`, `get` then `set`, lazy initialization, double-checked locking, cache miss fill, sequence generation, state status changes, close/send operations, or object pooling.
- Code adds or changes locks, mutexes, synchronized blocks, distributed locks, atomic values, compare-and-swap, transaction isolation, row locks, unique constraints, idempotency keys, outbox or inbox processing, retry policies, queue consumers, timers, cancellation, or shutdown behavior.
- A review or final report claims a path is race-free, atomic, thread-safe, event-loop-safe, idempotent, lock-protected, transaction-protected, retry-safe, or safe under concurrent requests.

<!-- mustflow-section: do-not-use-when -->
## Do Not Use When

- The task only changes local immutable values inside one call stack with no shared owner, durable store, callback, async yield, queue, timer, lock, or lifecycle boundary.
- The task is only object retention or cleanup risk; use `memory-lifetime-review` first and this skill only if cleanup races, cancellation races, or close/send races also matter.
- The task is only expected failure, retry, idempotency, cache, queue, or outbox behavior in a backend surface; use `backend-reliability-change` first and this skill as the interleaving adjunct.
- The task is only lifecycle transition modeling; use `state-machine-pattern` first and this skill only when stale concurrent transitions or duplicate side effects matter.
- The only concern is query speed, allocation churn, or hot-path latency with no stale-read or shared-state interleaving risk.

<!-- mustflow-section: required-inputs -->
## Required Inputs

- Shared state surface: variable, object, collection, cache, file, socket, stream, database row, table, queue, message, state field, lock, atomic, timer, cancellation token, shutdown flag, or external side effect.
- Invariant: the fact that must stay true across more than one line, field, row, message, event, callback, or operation.
- Interleaving points: `await`, I/O, database calls, callbacks, hooks, plugin calls, event publish, queue insert, lock release, timer scheduling, retry, cancellation, shutdown, close, send, and other function calls after a state read.
- Synchronization boundary: lock scope, atomic operation, compare-and-swap, transaction, row lock, unique constraint, conditional update, singleflight, idempotency record, outbox, or file atomic create/rename behavior.
- Ordering and duplication rules: event order, queue delivery semantics, duplicate messages, same-user or same-resource concurrency, retry replay, cancellation timing, timer overlap, and shutdown drain behavior.
- Idempotency and ownership rule: business idempotency key, processing/succeeded/failed record state, duplicate-in-progress behavior, fencing token or generation owner, and whether same-key work is serialized while unrelated keys can run concurrently.
- Evidence surface: existing tests, fixtures, schema constraints, command intents, logs, metrics, sequence numbers, request ids, transaction ids, versions, or manual-only concurrency evidence.
- Incident file when a concurrency failure was observed: test name, seed, worker or thread count, scheduler settings, timeout, input, build hash, OS/runtime version, environment slice, and exact failure time when available.

<!-- mustflow-section: preconditions -->
## Preconditions

- The task matches the Use When conditions and does not match the Do Not Use When exclusions.
- Higher-priority instructions and `.mustflow/config/commands.toml` have been checked for the current scope.
- Required inputs are available, or missing state, invariant, isolation, lock, idempotency, or ordering facts can be reported without guessing.
- Existing local patterns for locks, atomics, database transactions, state machines, idempotency, queues, outbox/inbox, cancellation, shutdown, tests, and logging have been searched before adding new primitives.
- If the race affects authorization, personal data, money, orders, external side effects, or audit records, also apply the relevant security, backend reliability, database, or API skill.

<!-- mustflow-section: allowed-edits -->
## Allowed Edits

- Replace check-then-act and read-modify-write sequences with atomic create, atomic conditional update, compare-and-swap, row lock, unique constraint, idempotency guard, singleflight, or a correctly scoped lock when local style supports it.
- Narrow lock scope to protect the whole invariant and remove slow callbacks, hooks, events, network calls, logs, JSON conversion, or plugin execution from inside locks where possible.
- Add global lock order, state transition guards, outbox or inbox guards, duplicate-message handling, cancellation and close idempotence, timer ownership checks, iterator snapshot handling, snapshot iteration, copy-on-write, or object ownership boundaries tied to the task.
- Add focused tests, fixtures, schema constraints, or docs that prove the concurrency invariant when the repository has a configured way to exercise it.
- Do not replace a real atomicity requirement with `sleep`, arbitrary delay, best-effort retry, log ordering, comments, or a distributed lock that is not backed by a durable data invariant.

<!-- mustflow-section: procedure -->
## Procedure

1. Preserve the incident file before changing code when a race was observed.
   - Capture the failing test or workflow name, random seed, worker or thread count, scheduler or CPU-affinity setting when relevant, timeout, input, build hash, OS/runtime version, environment variables that affect scheduling, and exact failure time.
   - Do not replace a missing incident file with "ran many times"; repeated passing runs are weaker than one reproducible failing condition.
2. Name the shared fact. State the exact value or invariant another execution flow could change: balance, status, cache entry, uniqueness, queue offset, file existence, socket state, collection membership, timer owner, shutdown flag, or object ownership.
3. Build a stale-read ledger.
   - For each shared state read, mark every later `await`, I/O, DB call, callback, event publish, queue insertion, lock release, timer, retry, cancellation, shutdown, close, send, or function call before the action.
   - Ask whether the read is still true after each interleaving point. If the answer relies on hope, the path is not race-safe.
4. Catch check-then-act.
   - Treat patterns such as `if exists then create`, `if balance >= amount then withdraw`, `if status == pending then approve`, duplicate email checks, coupon redemption, order number generation, and filesystem `exists` then `open` as unsafe until proven atomic.
   - Prefer atomic conditional updates, atomic create, insert with unique constraint, compare-and-swap, row locks, or file creation modes that fail when the target already exists.
5. Catch read-modify-write.
   - `++`, `+=`, `push`, `append`, `map[key] = value`, collection mutation, get-then-set, and counter updates are shared-state writes, not harmless syntax.
   - Use atomic operations only when the invariant is one variable. If the invariant spans fields, rows, objects, or messages, use a transaction, lock, state machine, or conditional write that protects the whole fact.
6. Do not trust a single event loop after `await`.
   - In JavaScript, Python async, UI runtimes, and coroutine systems, a state read before `await` can be stale after the continuation resumes.
   - Re-read, validate a version, hold the correct synchronization boundary, or move the decision into an atomic operation.
7. Review lock scope by invariant, not by field.
   - A lock around one setter does not protect a multi-field or multi-row rule if reads and writes outside the lock can observe intermediate state.
   - Keep callbacks, hooks, events, plugin calls, external I/O, logging, JSON conversion, and long calculations outside locks unless the invariant truly requires them.
   - Define and follow a global lock order when more than one lock can be acquired.
8. Treat `tryLock`, timeout, and retry as risk multipliers.
   - Check what partial state remains when lock acquisition fails, times out, or is retried.
   - Verify rollback, idempotency, duplicate side-effect prevention, and retry budget. A retry can make a race rarer or louder, not correct.
9. Review cache miss fill and lazy initialization.
   - Multiple misses for the same key should not all rebuild, fetch, insert, or publish the same value unless duplication is harmless and bounded.
   - Use singleflight, promise memoization with failure cleanup, once initialization, durable uniqueness, or explicit cache-authority rules.
   - Double-checked locking needs a memory-ordering story in runtimes where construction visibility is not automatically safe.
10. Review atomics and memory ordering.
   - Atomics protect a specific operation on a specific value. They do not automatically make surrounding objects, arrays, maps, or multi-field invariants safe.
   - Check acquire/release or stronger memory ordering where the language exposes it, and report missing expertise or evidence instead of guessing.
11. Review database races.
    - A database transaction does not erase a race by itself. Check isolation level, row locks, predicate locks, uniqueness, conditional updates, and whether `SELECT` then `UPDATE` can be invalidated before commit.
    - Prefer `UPDATE ... WHERE status = ...`, insert-or-ignore/upsert with unique constraints, version columns, row locks, or serializable isolation when the invariant requires it.
    - Application-level duplicate checks are advisory only; unique facts belong in the database or another durable single-writer authority.
12. Review distributed locks as debt.
   - Lock expiry, process pauses, network delay, clock skew, and split ownership can let two workers believe they own the same work.
   - Keep data correct if the distributed lock breaks: unique constraints, idempotency keys, fencing tokens, conditional writes, or state transitions should still reject stale owners.
13. Review event, queue, and outbox ordering.
   - Publishing an event before or after a state change can split the world unless a durable outbox or equivalent boundary ties them together.
   - Queue consumers should assume duplicates, reordering, delayed delivery, redelivery after timeout, and concurrent work for the same user or resource.
   - Use inbox deduplication, per-aggregate ordering, per-key serialization, conditional state transitions, or idempotent side effects where needed.
   - Same-key work should expose whether the current record is processing, succeeded, failed, cancelled, or dead. A duplicate arriving while the first attempt is still processing is not the same as replaying a completed result.
   - Business idempotency keys should describe the intended operation, not just the transport request id, when retries or duplicate submissions must return the same logical result.
14. Review filesystem races.
    - `exists` then `open`, temp file name selection, cleanup by path, and replace-in-place can race.
    - Prefer atomic create, safe temporary file APIs, same-directory temp files, fsync where durability matters, and atomic rename or replace semantics appropriate to the platform.
15. Review shutdown, cancellation, timers, close, and send.
    - Shutdown should define who stops accepting work, who drains, who cancels, and who owns in-flight side effects.
    - Cancellation must be idempotent and safe when completion happens at the same time.
    - Timers and schedulers need one current owner; old timers should not update new state.
    - WebSocket, channel, stream, socket, queue, and emitter paths need a clear rule for close/send races and double close.
16. Review shared collections and object reuse.
    - Iteration over a collection that another flow can mutate needs a lock, snapshot, immutable copy, version check, or concurrent collection semantics.
    - Object pooling, buffer reuse, mutable DTO reuse, and reused request contexts are unsafe if async work can still hold references.
    - Fake immutable objects with mutable internals, getters, shared maps, or cached arrays should be treated as mutable shared state.
17. Review tests and logs with suspicion.
    - `sleep`-based race tests are usually probability tests. Prefer deterministic barriers, fake schedulers, controlled promises, version assertions, unique constraints, or repeated stress only as supplementary evidence.
    - Shake the schedule, not only the load: widen context-switch windows with configured deterministic barriers, fake schedulers, controlled yields, delay injection, or repeated stress harnesses only when the repository command contract allows them.
    - Logging can hide or change a race. Log order is not event order across threads, processes, async tasks, buffers, or machines.
    - Use happens-before logs at handoff points such as queue push/pop, mutex unlock/lock, atomic release/acquire, promise/future completion, channel send/receive, callback registration/execution, plus monotonic sequence numbers, request ids, transaction ids, version columns, or state transition logs when ordering is evidence.
    - Treat race detectors, thread sanitizers, deterministic record/replay, profilers, kernel tracing, or stress tools as configured or manual diagnostics only; never infer raw commands from the tool names.
18. Escalate broad status fields into state-machine review.
    - If values such as `pending`, `processing`, `done`, `failed`, `cancelled`, `closed`, or `deleted` drive behavior, draw allowed transitions and reject stale concurrent transitions.
    - Use `state-machine-pattern` when the race fix needs a transition table, event union, transition log, retry reconciliation, or effect ordering.

<!-- mustflow-section: postconditions -->
## Postconditions

- Shared state reads, interleaving points, and stale-read risks are identified or ruled out.
- Observed concurrency failures preserve the incident file needed to reproduce the same timing envelope when available.
- Check-then-act and read-modify-write paths are atomic, guarded, constrained, or explicitly reported as residual risk.
- Locks protect whole invariants, have a clear ordering rule, and avoid slow or reentrant work where possible.
- Database, cache, queue, event, filesystem, cancellation, shutdown, timer, close/send, collection, and object-reuse races are checked where relevant.
- Idempotency processing states, duplicate-in-progress behavior, fencing tokens, outbox/inbox handoffs, and per-key serialization are checked where relevant.
- Tests or configured verification cover the highest-risk concurrency invariant when feasible.

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

Prefer the narrowest configured test, build, docs, release, or mustflow intent that proves the changed concurrency invariant. Do not infer raw stress, load, database, queue, thread sanitizer, profiler, server, watcher, or sleep-loop commands outside the command contract.

<!-- mustflow-section: failure-handling -->
## Failure Handling

- If a configured command fails, preserve the failing intent, failing assertion or output tail, and the shared-state invariant it exercised before editing again.
- If the invariant cannot be named, stop and report that the code is not reviewable for races yet.
- If a fix requires a schema constraint, isolation change, outbox, queue contract, state-machine transition, or idempotency store outside the current scope, report the missing durable boundary instead of adding a local lock that cannot enforce it.
- If deterministic race proof is not configured, report the missing manual evidence and complete the configured checks that are available.

<!-- mustflow-section: output-format -->
## Output Format

- Shared state and invariant reviewed
- Incident file captured or reported missing
- Interleaving points checked
- Check-then-act and read-modify-write findings
- Async stale-read, lock scope/order, tryLock/timeout/retry, cache/lazy init, atomic/memory ordering, database transaction, uniqueness, distributed lock, idempotency, filesystem, event/outbox, queue, shutdown, cancellation, timer, close/send, shared collection, object reuse, fake immutable, test, log, and state-machine checks where relevant
- Idempotency record states, fencing token, inbox or dedupe, per-key serialization, and duplicate-in-progress checks where relevant
- Race fixes made or recommended
- Tests or verification evidence
- Command intents run
- Skipped concurrency diagnostics and reasons
- Remaining race-condition risk
