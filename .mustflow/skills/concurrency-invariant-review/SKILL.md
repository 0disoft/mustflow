---
mustflow_doc: skill.concurrency-invariant-review
locale: en
canonical: true
revision: 1
lifecycle: mustflow-owned
authority: procedure
name: concurrency-invariant-review
description: Apply this skill when code is created, changed, reviewed, or reported and concurrency correctness depends on whether invariants still hold after time order changes, including shared ownership, hidden writes in getters or lazy initialization, check-then-act, read-modify-write, lock identity, lock order, lock scope, condition variables, lost notifications, atomics mixed with ordinary state, CAS ABA, double-checked locking, object publication, fake immutability, concurrent collection iteration, cache stampede, application-only uniqueness, transaction isolation, distributed lock leases, idempotency keys, queue duplicate delivery, state-machine transitions, scheduler overlap, shutdown drain, lock or semaphore release, thread-local leakage, async await interleavings, and deterministic concurrency tests.
metadata:
  mustflow_schema: "1"
  mustflow_kind: procedure
  pack_id: mustflow.core
  skill_id: mustflow.core.concurrency-invariant-review
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

# Concurrency Invariant Review

<!-- mustflow-section: purpose -->
## Purpose

Review concurrency by changing the time order in your head and checking whether the invariant still holds.

The review question is not "is the code correct in this order?" The stronger question is "if execution A pauses here, execution B changes the shared world, and A resumes, does the system still tell the truth?" Use this skill for concurrency design and primitive discipline. Use `race-condition-review` for a focused stale-read or check-then-act path.

<!-- mustflow-section: use-when -->
## Use When

- Code is created, changed, reviewed, or reported and more than one request, thread, async task, worker, callback, scheduler, queue consumer, process, or service instance can touch the same value, object, cache key, queue item, database row, file, socket, session, lock, or lifecycle flag.
- A review needs to establish the owner of shared state and the invariant that must survive different time orders.
- Code claims to be safe because it has a lock, atomic, transaction, concurrent collection, distributed lock, idempotency key, queue, scheduler, shutdown flag, or concurrency test.
- Code uses condition variables, wait/notify, semaphores, read-write locks, atomics, CAS, double-checked locking, thread-local context, lazy initialization, cache fills, object pools, reusable buffers, or mutable shared DTOs.
- A failure, retry, timeout, cancellation, shutdown, duplicate queue delivery, scheduler overlap, or async `await` can run concurrently with the normal path.

<!-- mustflow-section: do-not-use-when -->
## Do Not Use When

- The task only changes local immutable values inside one call stack and no shared owner, durable store, callback, async yield, queue, timer, or lifecycle boundary exists.
- The concern is one concrete stale read, check-then-act, read-modify-write, close/send race, or database uniqueness race; use `race-condition-review` first and this skill only if primitive discipline or ownership is also unclear.
- The task is only memory retention, listener cleanup, timer cleanup, or native resource lifetime; use `memory-lifetime-review` first unless cleanup can race with concurrent work.
- The task is only backend retries, queues, idempotency, outbox, health, cache, or external-call deadlines; use `backend-reliability-change` first and this skill only for concurrent ownership and invariant timing.
- The task is only error handling truthfulness; use `failure-integrity-review` first.

<!-- mustflow-section: required-inputs -->
## Required Inputs

- Shared state inventory: variables, objects, caches, queues, database rows, files, sessions, singleton services, static fields, Redis keys, global settings, thread-local context, and external side effects.
- Ownership rule: who owns each shared state item, whether ownership is single-writer, lock-protected, transaction-protected, atomic-only, message-serialized, immutable, or undefined.
- Invariant: the business or data fact that must remain true across multiple fields, rows, messages, callbacks, operations, or lifecycle states.
- Time-order points: `await`, I/O, DB calls, callbacks, event listeners, plugin hooks, logging, metrics, lock release, condition wait, notify, retry, timeout, queue ack, scheduler tick, cancellation, shutdown, close, send, and publication.
- Synchronization evidence: exact lock identity, lock order, condition predicate, atomic memory-ordering story, transaction isolation, row lock, unique constraint, fencing token, idempotency record, queue dedupe, or deterministic test harness.
- Runtime and deployment shape: single thread, worker pool, process pool, multi-instance service, distributed cache, database, queue, scheduler, coroutine runtime, or reactive runtime.

<!-- mustflow-section: preconditions -->
## Preconditions

- The task matches the Use When conditions and does not match the Do Not Use When exclusions.
- Higher-priority instructions and `.mustflow/config/commands.toml` have been checked for the current scope.
- Required inputs are available, or missing owner, invariant, lock identity, isolation, queue, scheduler, or test evidence can be reported without guessing.
- Existing local patterns for locks, atomics, transactions, state machines, queues, idempotency, cancellation, shutdown, and deterministic tests have been searched before adding new primitives.

<!-- mustflow-section: allowed-edits -->
## Allowed Edits

- Add or tighten ownership boundaries, immutable snapshots, single-writer serialization, scoped locks, lock ordering, condition predicates, atomic conditional writes, transactions, row locks, unique constraints, idempotency records, fencing tokens, state-transition guards, queue dedupe, shutdown drains, and deterministic concurrency tests tied to the reviewed invariant.
- Move callbacks, plugin hooks, event listeners, HTTP calls, database calls, logging, metrics, JSON conversion, compression, image processing, or other external code outside locks when the invariant allows it.
- Replace fake safety such as comments, `Thread.sleep`, best-effort retries, app-only duplicate checks, process-local locks for multi-instance data, or log-order reasoning with durable or deterministic evidence.
- Do not invent raw stress-test, load-test, thread-sanitizer, profiler, server, watcher, or database commands outside configured command intents.

<!-- mustflow-section: procedure -->
## Procedure

1. Color every shared value.
   - Include referenced objects, singleton services, static fields, DI-managed services, caches, queues, database rows, files, sessions, Redis keys, global config, sockets, and thread-local context.
   - Treat "read-only" helpers as suspicious until getters, `find`, `load`, `resolve`, `toString`, `hashCode`, memoization, lazy init, counters, and connection refresh paths are checked for hidden writes.
2. Name the owner and the invariant.
   - If a value has one owner, preserve that ownership.
   - If several flows own it, require a lock, transaction, atomic operation, message serialization, immutable snapshot, durable constraint, or state-machine transition.
   - If the owner cannot be named, report that the concurrency surface is not reviewable yet.
3. Build a time-order table.
   - Pick two executions, A and B.
   - Pause A after each shared read, condition check, lock release, `await`, I/O, callback, notify, queue ack, scheduler tick, cancellation check, or state publication.
   - Let B mutate or observe the same state, then resume A and check the invariant.
4. Catch check-then-act and read-modify-write.
   - Treat `if (!exists) create`, `if (balance >= amount) withdraw`, `if (map.get(k) == null) put`, `if (!closed) send`, `count++`, `x = x + 1`, `size()` then `add()`, and version read then update as unsafe until the whole operation is atomic.
   - Use atomic conditional update, compare-and-swap, row lock, unique constraint, transaction isolation, or one correctly scoped lock.
5. Verify lock identity and lock scope.
   - A lock helps only when every read and write of the protected invariant uses the same lock or an explicitly ordered lock set.
   - A one-line lock can still be too narrow when `orders` plus `total`, status plus timestamp, queue plus offset, or cache plus index must change together.
   - A wide lock can turn a performance bug into an outage when it holds while doing network, DB, disk, compression, JSON parsing, image processing, logging, metrics, callbacks, or plugin code.
6. Build the lock-order table.
   - Record nested acquisition order such as `account lock -> ledger lock -> notification lock`.
   - Reject paths that acquire the same pair in reverse order unless the runtime and lock type make that impossible.
   - Check reentrant callbacks and external code called under a lock for hidden reacquisition.
7. Check condition variables and notifications by state, not signal.
    - A condition variable wait should be inside a loop that rechecks the predicate.
    - The loop must tolerate spurious wakeup, another waiter consuming the work first, and notifications that arrive before this worker starts waiting.
    - `notify` and state changes should happen under the same synchronization boundary.
    - A lost notification is possible when code trusts the signal instead of a persistent state predicate.
8. Check atomics, memory visibility, and CAS.
   - Atomics protect one value, not the surrounding object graph.
   - Do not mix `AtomicBoolean closed` with ordinary `socket`, `buffer`, or `currentUser` state unless another boundary protects the combined invariant.
   - CAS on stacks, queues, free lists, and state machines needs an ABA story such as version, stamp, generation, or immutable node identity.
   - Double-checked locking needs a language-specific memory model and publication guarantee.
9. Check object publication and immutability.
   - Constructors should not publish `this` to event buses, global maps, callbacks, threads, or async work before construction completes.
   - `final`, `readonly`, or `const` is not enough when the object contains mutable arrays, lists, maps, buffers, or handles.
   - Share immutable snapshots or freeze the reachable state when lock-free sharing is intended.
10. Check collections, caches, and lazy loading.
    - Iteration while another flow can add or remove needs a lock, snapshot, copy-on-write, version check, or verified concurrent collection semantics.
    - A concurrent collection makes single methods safe; it does not make multi-method business rules safe.
    - Cache `get-or-load` should collapse same-key misses, avoid partially initialized values, and define stale-read and delete/recreate behavior.
11. Check database and distributed boundaries.
    - Application locks do not protect multi-instance uniqueness; unique facts belong in a durable constraint or single-writer authority.
    - Review isolation level, `SELECT` then `UPDATE`, row locks, optimistic version columns, phantom reads, lost updates, and conditional writes.
    - Distributed locks are leases. Check expiry, process pauses, network delay, clock skew, and fencing tokens before trusting external side effects.
12. Check duplicate execution and state transitions.
    - Retries and timeouts can mean "completed but response lost", not "did not happen".
    - Queue consumers should assume at-least-once delivery, late ack, redelivery, and concurrent same-resource work.
    - Status fields need allowed transitions when payment, cancellation, shipping, deletion, processing, or closure can happen at the same time.
13. Check time-based ownership.
    - `if (now - lastRun > interval) run()` can let several executions pass together.
    - Cron, scheduler, timer, and lease-based work should acquire execution ownership atomically and tolerate clock skew where relevant.
    - Old timers should not update new state after ownership changes.
14. Check shutdown, cancellation, and resource release.
    - Shutdown should define stop-accepting, drain, cancel, flush, close, and in-flight side-effect ownership.
    - `closed = true` is not enough if futures, workers, sockets, buffers, queues, or async continuations keep running.
    - Mutexes, semaphores, read-write locks, connection checkouts, rate-limit tokens, and permits must release on every exception path.
15. Check thread-local and async context.
    - Thread-local context is hidden global state in thread pools.
    - Clear request, tenant, auth, transaction, and locale context before the thread is reused.
    - Async, coroutine, virtual-thread, and reactive runtimes can break assumptions that thread-local state follows logical work.
    - Treat every `await` as a point where the world can change before the continuation resumes.
16. Check concurrency tests as evidence, not decoration.
    - `Thread.sleep(100)` is not deterministic proof.
    - Prefer barriers, latches, fake schedulers, deterministic executors, controlled promises, transactional fixtures, version assertions, queue dedupe fixtures, and explicit interleaving tests.
    - Use stress or repeated tests only as supplementary evidence when deterministic ordering is unavailable.

<!-- mustflow-section: postconditions -->
## Postconditions

- Shared state, owners, invariants, and time-order points are named or missing evidence is reported.
- Locks, atomics, conditions, transactions, distributed leases, queues, schedulers, shutdown, thread-local context, async yields, collections, caches, and tests are checked where relevant.
- The chosen fix or recommendation preserves the whole invariant, not just one field or one method call.
- Deterministic evidence covers the highest-risk interleaving when the repository has a configured way to exercise it.

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

Prefer the narrowest configured test, build, docs, release, or mustflow intent that proves the changed concurrency invariant. Report skipped manual diagnostics such as stress tests, load tests, thread sanitizers, database isolation harnesses, scheduler fuzzers, and live multi-instance checks when no configured intent exists.

<!-- mustflow-section: failure-handling -->
## Failure Handling

- If a configured command fails, preserve the failing intent, output tail, and invariant under test before editing again.
- If the owner or invariant cannot be named, stop the concurrency claim and report the missing design fact.
- If a process-local lock cannot protect multi-instance data, report the missing durable boundary instead of pretending the lock solves it.
- If deterministic proof is unavailable, state the remaining manual evidence gap and complete the configured checks that are available.

<!-- mustflow-section: output-format -->
## Output Format

- Shared state inventory and owner decision
- Invariant and time-order table reviewed
- Check-then-act and read-modify-write findings
- Lock identity, lock scope, lock order, condition variable, atomics, memory visibility, CAS ABA, publication, immutability, collections, cache, database, distributed lock, idempotency, queue duplicate, state transition, scheduler, shutdown, resource release, thread-local, async `await`, and test-evidence checks where relevant
- Concurrency fixes made or recommended
- Tests or verification evidence
- Command intents run
- Skipped concurrency diagnostics and reasons
- Remaining concurrency-invariant risk
