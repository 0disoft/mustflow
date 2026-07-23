---
mustflow_doc: skill.connection-lifecycle-integrity-review
locale: en
canonical: true
revision: 2
lifecycle: mustflow-owned
authority: procedure
name: connection-lifecycle-integrity-review
description: Apply this skill when TCP sockets, HTTP keep-alive or pooling, HTTP/2 streams or sessions, Node.js streams, Web Streams readers or writers, FIN/RST handling, half-close behavior, destroy or abort races, unconsumed response bodies, backpressure, connection shutdown, transport resource leaks, fault injection, soak tests, or connection-lifetime resolution claims are created, changed, reviewed, debugged, validated, or reported.
metadata:
  mustflow_schema: "1"
  mustflow_kind: procedure
  pack_id: mustflow.core
  skill_id: mustflow.core.connection-lifecycle-integrity-review
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

# Connection Lifecycle Integrity Review

<!-- mustflow-section: purpose -->
## Purpose

Keep physical connections, transport read and write sides, logical requests, response bodies,
reader or writer ownership, pool eligibility, and process shutdown from being collapsed into one
misleading lifecycle flag.

The central invariant is not that every connection is destroyed. Graceful FIN paths may never call
`destroy`. The stronger invariant is that every owned connection record is finalized exactly once,
and an abortive destroy or reset action is accepted at most once.

<!-- mustflow-section: use-when -->
## Use When

- TCP, TLS, HTTP/1.1 keep-alive, HTTP/2 multiplexing, HTTP clients, servers, agents, dispatchers,
  connection pools, upgraded sockets, WebSocket, CONNECT, or raw stream transports change.
- Code handles `end`, `finish`, `error`, `close`, FIN, RST, timeout, abort, `destroy`,
  `resetAndDestroy`, half-close, pending writes, drain, or shutdown deadlines.
- A logical request, response body, body reader, stream, or HTTP/2 stream can finish or cancel while
  its physical connection or session remains alive.
- Response bodies can be partially read, paused, abandoned, discarded, cancelled, or left locked.
- Slow consumers, backpressure, retries, transforms, adapters, or observability capture can retain
  unbounded buffers.
- A review or report claims that sockets are leak-free, safely reusable, fully drained, naturally
  terminating, or closed exactly once.

<!-- mustflow-section: do-not-use-when -->
## Do Not Use When

- The task only changes HTTP schemas, status codes, or headers with no connection, body, pooling,
  cancellation, streaming, or shutdown behavior; use `api-contract-change` or
  `http-api-semantics-review`.
- The task only changes compression, CDN caching, SSE replay, WebTransport delivery choice, or proxy
  buffering without transport lifetime risk; use `http-delivery-streaming`.
- The task is a general retained-object or cleanup review without network or stream lifecycle
  semantics; use `memory-lifetime-review`.
- The task models a durable business entity lifecycle rather than independently closing transport
  dimensions; use `state-machine-pattern`.
- No connection, request, body, stream, pool, timer, listener, buffer, or shutdown boundary is
  present to inspect.

<!-- mustflow-section: required-inputs -->
## Required Inputs

- Protocol and role: raw TCP, TLS, HTTP/1.1, HTTP/2, WebSocket, CONNECT, client, server, proxy, or
  adapter.
- Ownership ledger for the physical connection or session, logical request, response body, reader,
  writer, pool slot, timers, listeners, retry entries, and buffer reservations.
- Event and action ledger distinguishing observed events from local actions such as graceful end,
  cancel, destroy, reset, quarantine, pool return, or forced shutdown.
- State dimensions for transport, readable side, writable side, pool membership, request, body
  disposition, reader or writer lock, and server or client shutdown when each is relevant.
- Terminal-cause policy, including which contender records the primary cause and how later causes
  are retained for diagnostics without repeating side effects.
- Reuse criteria, parser or framing boundary evidence, pending write state, buffered bytes, protocol
  corruption state, and body disposition.
- Success, half-close, timeout, abort, peer reset, writer error, reader cancel, unconsumed body,
  slow-consumer, and shutdown paths that the implementation supports.
- Relevant command-intent contract entries for tests, build, docs, release checks, and mustflow
  validation.
- For Node.js, Web Streams, or Undici-specific work, read
  `references/node-stream-transport-lifecycle-checklist.md` before changing event-order,
  cancellation, body-consumption, active-resource, or natural-exit behavior.
- For repeated fault injection, soak testing, resource-growth gates, runtime or library attribution,
  operational containment, or permanent-resolution claims, read
  `references/connection-fault-injection-resource-lifetime-validation.md` before designing the
  campaign or accepting its conclusion.

<!-- mustflow-section: preconditions -->
## Preconditions

- Higher-priority instructions and `.mustflow/config/commands.toml` have been checked for the
  selected repository.
- Required inputs are available, or missing protocol and ownership decisions can be reported
  without inventing behavior.
- Version-sensitive runtime behavior is tied to current official documentation or repository tests;
  supplied reference material is guidance, not proof that every runtime version behaves identically.
- If general retained-reference risk dominates, also use `memory-lifetime-review`.
- If races between termination contenders dominate, also use `race-condition-review`.
- If delivery, cache, reconnect, or proxy semantics dominate, also use `http-delivery-streaming`.

<!-- mustflow-section: allowed-edits -->
## Allowed Edits

- Add or tighten lifecycle state, terminal-cause arbitration, connection and request scopes, body
  lease policy, pool quarantine, buffer budgets, shutdown phases, diagnostics, and focused tests.
- Separate physical connection finalization from logical request and body settlement.
- Centralize graceful-end and abortive-termination actions so timers, abort signals, writer errors,
  and shutdown do not each perform duplicate cleanup.
- Add bounded discard, cancellation, drain, grace, or force deadlines where protocol semantics allow.
- Do not call `destroy` from every completion path merely because repeated destruction is a runtime
  no-op.
- Do not remove a connection from the active registry before its physical close event is observed.
- Do not return a connection to a pool from writable/readable flags alone without parser or framing
  boundary and body-disposition evidence.
- Do not use `unref`, garbage collection, finalization registries, or process exit as connection
  cleanup.
- Do not weaken event-count, callback-settlement, buffer-bound, natural-exit, or open-handle tests.
- Do not treat static review, one green reproducer, a flat RSS graph, a restart, or traffic limiting
  as proof that a connection-lifetime defect is permanently resolved.

<!-- mustflow-section: procedure -->
## Procedure

1. Draw the ownership layers before editing.
   - Separate physical connection or HTTP/2 session, logical request, response body or stream,
     reader and writer locks, pool lease, and process or server lifecycle.
   - Name which layer owns each timer, listener, pending callback, retry item, buffer reservation,
     and registry entry.
2. Replace a single closing enum with orthogonal dimensions where shutdown can happen
   independently.
   - Model transport, read side, write side, pool membership, request state, body disposition, and
     reader or writer ownership separately when the protocol permits independent progress.
   - Treat remote and local half-close as valid combinations, not impossible intermediate states.
3. Separate events from actions.
   - Treat EOF or `end`, write completion or `finish`, `error`, and physical `close` as observed
     events.
   - Treat graceful `end`, cancel, discard, quarantine, `destroy`, reset, and force-close as local
     actions whose admission must be controlled.
   - Do not require an abortive action on a graceful path.
4. Centralize terminal-cause arbitration.
   - Route timeout, abort signal, writer error, protocol error, peer reset, body abandonment, and
     forced shutdown through one termination admission function.
   - Atomically accept the first terminal cause and at most one abortive action.
   - Record later competing causes as secondary diagnostics without repeating destroy, reset,
     callback settlement, metrics, or registry removal.
5. Define finalization boundaries.
   - Finalize and remove a physical connection record once, after physical close is observed.
   - Permit a request to settle earlier after its request-scoped timers, listeners, retries, body
     lease, and user result are finalized.
   - Keep connection-core close and error observation alive even after request cleanup.
6. Write the protocol-specific reuse gate as a conjunction of observable conditions.
   - Require open transport sides, parser or framing boundary, terminal body disposition, no pending
     writes, no reserved buffers, no terminal cause, no protocol corruption, and correct pool owner.
   - Quarantine any HTTP/1.1 connection that observed premature close, truncated framing, parser
     failure, content-length mismatch, reset, or unrecoverable body abandonment.
   - Apply cancellation and reuse at HTTP/2 stream scope unless connection-level GOAWAY, session
     error, or flow-control corruption invalidates the whole session.
7. Give every response body a disposition and deadline.
   - Require consume, bounded discard, protocol-specific cancel, or failure.
   - Use both byte and wall-clock limits for discard; endless discard is a denial-of-service path.
   - Settle cancellation separately from releasing a reader lock, and release the owner in a
     finally-like boundary.
8. Make write and backpressure accounting explicit.
   - Stop or pause production after a write or enqueue signal reports backpressure.
   - Settle every accepted write callback or promise exactly once as success or failure.
   - Reserve bytes before enqueueing across readable, writable, adapter, parser, transform, retry,
     discard, and observability layers; do not mistake a high-water mark for a global hard limit.
9. Build connection and request resource scopes.
   - Register timers, listener removers, retry tokens, body leases, locks, pending writes, buffer
     reservations, and close waiters at creation time.
   - Make disposal idempotent and keep request cleanup from deleting connection-core observers.
10. Define server and client shutdown as bounded phases.
    - Stop new accepts or requests first, then drain idle and active work, reject new HTTP/2 streams
      when applicable, escalate after a deadline, and wait for physical closes.
    - Track WebSocket, CONNECT, HTTP/2, and other upgraded or separately owned transports explicitly;
      generic HTTP close-all helpers may not own them.
11. Add observable conservation and cleanup invariants.
    - Compare created, active, and closed connections; started and terminal requests; accepted and
      settled writes; opened and disposed body leases; reserved, current, and released buffers.
    - Keep identifiers in logs or traces and metric labels bounded to reason, protocol, role, or
      mode.
12. Test races and partial orders, not one pretty sequence.
    - Cover local-first, remote-first, simultaneous FIN, RST, timeout plus abort, pending write plus
      reset, body end plus cancel, paused read, unconsumed body, slow consumer, and shutdown races.
    - Assert event counts, primary cause, accepted destroy count, request result, pool state,
      registry size, pending writes, body disposition, lock ownership, and peak reserved bytes.
    - Add a child-process natural-exit test without `process.exit` when configured test surfaces can
      exercise event-loop handle leaks.
13. Separate heap retention from event-loop liveness and native resource leakage.
    - An unresolved promise alone does not keep the event loop alive, but a reachable promise chain
      can retain request state.
    - Check active timers, sockets, DNS/TLS work, file descriptors or handles, and heap retaining
      paths with the configured diagnostics available to the repository.
14. Design fault campaigns around closed cohorts and uncontaminated resource evidence when the task
    requires more than focused lifecycle tests.
    - Separate the system under test from load generators, raw fault peers, proxies, and packet or
      network injectors so their timers and handles do not enter the system ledger.
    - Give each request deterministic bytes, digest, idempotency identity, lifecycle timestamps, and
      exactly one terminal outcome; compare clean and faulted traffic under predeclared load, seed,
      duration, and statistical gates.
    - Keep explicit-agent teardown campaigns separate from pool-reuse steady-state campaigns.
15. Attribute the owner with differential reproduction before choosing a fix.
    - Repeat the same fault schedule through the full application, a library-only reproducer, a
      runtime-core reproducer, and direct versus production-like network paths where available.
    - Classify application, library, runtime, or environment cause only from the layer where the
      failure appears or disappears, retaining-path evidence, version bisect, or reproducible
      infrastructure mechanics.
16. Calibrate the conclusion to the evidence.
    - Distinguish fix candidate, mitigation, symptom suppression, and permanent resolution.
    - Require pre-fix failure, post-fix success, compatible correctness and performance regression,
      bounded repeated and soak evidence, and a causal owner before claiming permanent resolution.
    - Treat long-running soak, packet, native-handle, heap, or production-path checks as manual-only
      or missing unless the selected repository configures them.
17. Verify through configured command intents and report unavailable protocol, fault-injection,
    active-resource, heap, file-descriptor, or natural-exit evidence instead of inventing commands.

<!-- mustflow-section: postconditions -->
## Postconditions

- Physical connection, request, body, stream, lock, pool, and shutdown ownership are distinct where
  their lifetimes can diverge.
- Every connection record has one observable finalization path; graceful paths do not require
  destroy, and abortive paths accept at most one destroy or reset action.
- Primary terminal cause, secondary contenders, event counts, callback settlement, and registry
  removal are deterministic under supported races.
- Connection reuse requires framing completion, terminal body disposition, clean transport state,
  zero pending writes or reservations, and protocol-specific eligibility.
- Response bodies, locks, timers, listeners, retries, buffers, and upgraded connections have bounded
  ownership and shutdown behavior.
- Tests or explicitly reported evidence gaps cover the highest-risk FIN, RST, timeout, abort,
  cancellation, backpressure, and shutdown paths.
- Fault and soak conclusions preserve the tested protocol, role, environment, cohort, seed,
  duration, measurement gate, and causal-owner boundary instead of generalizing from one run.

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

Prefer the narrowest configured tests that exercise the changed protocol and lifecycle boundary.
Do not infer raw packet tools, load generators, heap profilers, active-handle inspectors, open-FD
commands, or child-process harnesses from this skill.

<!-- mustflow-section: failure-handling -->
## Failure Handling

- If protocol and ownership boundaries are unknown, stop and list the missing decisions before
  inventing a universal state machine.
- If observed event order differs across valid runs, encode the supported partial order and event
  counts instead of forcing one total order.
- If a second termination contender repeats side effects, centralize admission before patching each
  callback independently.
- If safe reuse cannot be proved from parser or framing and body evidence, quarantine the connection.
- If a body cannot be consumed, discarded, or cancelled within bounds, fail the body and retire the
  owning stream or connection at the narrowest safe protocol scope.
- If shutdown passes only after adding `unref` or `process.exit`, keep the test failing and report the
  live handle or missing owner.
- If exact runtime behavior is version-sensitive and current official evidence is unavailable,
  narrow the claim and report the freshness gap.
- If a reproducer turns green without retained-owner, handle, version, or infrastructure evidence,
  report a fix candidate rather than a resolved root cause.
- If only traffic limiting, isolation, version pinning, or process restart prevents exhaustion,
  report mitigation and preserve the unresolved ownership risk.

<!-- mustflow-section: output-format -->
## Output Format

- Protocol, role, and ownership layers reviewed
- Transport, read, write, pool, request, body, lock, and shutdown states
- Event versus action ledger
- Primary and secondary termination-cause policy
- Finalization and destroy or reset admission result
- Reuse and quarantine gate
- Body disposition, reader or writer ownership, and backpressure or buffer budget
- Resource scopes, timers, listeners, retries, registries, and upgraded transports
- Shutdown phases and escalation deadline
- Invariants, fault matrix, event counts, and natural-exit or active-resource evidence
- Harness isolation, closed-cohort ledger, repeated-fault and soak gates, and clean-traffic isolation
- Application, library, runtime, or environment attribution evidence
- Fix candidate, mitigation, symptom suppression, or permanent-resolution classification
- Command intents run
- Skipped diagnostics and reasons
- Remaining connection lifecycle risk
