---
mustflow_doc: skill.session-handoff-integrity-review
locale: en
canonical: true
revision: 2
lifecycle: mustflow-owned
authority: procedure
name: session-handoff-integrity-review
description: Apply this skill when a live user, service, device, game, remote-control, streaming, or AI-agent session moves between processes, nodes, runtimes, regions, edges, or agents and correctness depends on one current owner, monotonic epochs, snapshot-plus-delta or multi-store cursor continuity, in-flight command and effect recovery, target acceptance, fencing, authorization freshness, target-bound resume credentials, bidirectional application acknowledgments, draining, reconnection, reconciliation, or split-brain fault evidence.
metadata:
  mustflow_schema: "1"
  mustflow_kind: procedure
  pack_id: mustflow.core
  skill_id: mustflow.core.session-handoff-integrity-review
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

# Session Handoff Integrity Review

<!-- mustflow-section: purpose -->
## Purpose

Review session handoff as an authority cutover with state and effect continuity, not as a blob-copy
operation. Preserve exactly one valid writer, keep accepted commands recoverable, make stale owners
harmless at the final effect boundary, and force every handoff to reach a durable terminal state.

Treat session data, derived caches, deletion records, expiry, coordination ownership, in-flight
commands, external effects, runtime-only capabilities, authorization grants, connection cursors,
model-visible context, artifacts, approvals, and policy state as distinct transfer classes. A target
process being alive, a snapshot upload completing, or a transport write succeeding does not prove
that the target can safely own, resume, or acknowledge the session.

<!-- mustflow-section: use-when -->
## Use When

- A live session moves between workers, servers, regions, devices, runtimes, agent processes, or
  model agents while requests can still arrive.
- Code implements or reviews prepare, quiesce, snapshot, catch-up, import, accept, owner commit,
  drain, redirect, abort, quarantine, resume, or forward recovery.
- Correctness depends on one session writer, monotonic owner epochs, stale-writer rejection,
  snapshot and event-log continuity, command replay, response continuity, or split-brain safety.
- Session state includes caches, leases, locks, queue offsets, unacknowledged messages, streaming
  output, tool calls, external effects, files, artifacts, approvals, secrets, or scoped authority.
- Authentication grants, handoff or resume tickets, refresh capability, delegation chains, current
  policy, revocation, sender binding, or target-specific credentials cross the owner boundary.
- WebSocket, server-sent event, RPC stream, media stream, gateway-backed connection, reconnect, or
  make-before-break behavior depends on bidirectional sequence and application-acknowledgment state.
- An AI-agent handoff transfers goals, explicit constraints, decisions, evidence, conversation
  cursors, tool ledgers, artifact references, guardrails, pending approvals, or model-visible context.
- Timeout, response loss, process death, pause, lease expiry, network partition, stale routing,
  schema mismatch, duplicate delivery, or partial state transfer can make ownership or effects
  ambiguous.

<!-- mustflow-section: do-not-use-when -->
## Do Not Use When

- A local Codex or Hermes transcript is referenced read-only for evidence; use
  `cross-agent-session-reference`.
- An incomplete coding task needs a bounded restart summary; use `restricted-handoff-resume`.
- Agent A hands a design or private plan to Agent B for later implementation without transferring a
  live runtime session; use `design-implementation-handoff`.
- A non-session authority changes through prepare and commit; use
  `two-phase-transition-integrity-review` as the primary skill.
- Only duplicate request handling is in scope; use `idempotency-integrity-review`.
- Only database-to-broker publication convergence is in scope; use `dual-write-consistency`.

<!-- mustflow-section: required-inputs -->
## Required Inputs

- Session identity and current owner record, including owner instance identity, epoch or generation,
  state version, protocol version, lease identity and authority, and authoritative storage.
- Handoff identity ledger: session, logical handoff, attempt, phase, command, effect, artifact,
  approval, output stream, and correlation identities plus their retention rules.
- Protocol state machine, legal transitions, rollback boundary, commit linearization point, terminal
  states, and which actor may perform each transition.
- State inventory split into durable source state, immutable artifacts, derived caches, tombstones,
  absolute expiry, timers and retry position, coordination leases or locks, queued and in-flight
  commands, external effects, runtime-only objects, model-visible context, credentials, approvals,
  and policy state.
- Snapshot revision or per-store cursor vector, delta or event-log range, cursor inclusivity,
  manifest and content hashes, schema and writer versions, required features, queue offsets,
  tombstone retention, command ledger, and canonical validation evidence.
- Admission and quiesce rules for new commands, ordering domain, source drain behavior, stale-route
  behavior, redirect or forwarding contract, connection generation, client-to-server and
  server-to-client sequence and application acknowledgments, replay window, resume-too-old path,
  and response or media-stream boundary.
- Target capability, current grant and policy evaluation, subject and actor delegation, permission,
  dependency, resource, schema, artifact, tool, credential exchange, connection, and deadline checks
  plus explicit acceptance or rejection evidence.
- Commit predicate, owner compare-and-swap, new epoch issuance, outbox or inbox records, and every
  storage, queue, file, tool, or external-effect sink that must reject stale epochs.
- Timeout and absolute-deadline model, retry owner, retry and recovery budgets, outcome-certainty
  classes, status lookup, rollback, compensation, forward recovery, quarantine, and reconciler.
- Structured transition events, append-only owner audit, trace and span-link model, invariant
  metrics, privacy controls, deterministic failpoints, history checker, and operating objectives.
- Configured command intents for the selected repository.

Read [Session Handoff Protocol Checklist](references/session-handoff-protocol-checklist.md) when the
handoff crosses a process boundary, carries live commands or AI-agent state, or makes safety,
continuity, rollback, retry, timeout, observability, or fault-tolerance claims.

Read [Session Authorization and Stream Resume Checklist](references/session-auth-stream-resume-checklist.md)
when state spans multiple stores, expiry or deletion must survive transfer, authorization or token
state crosses the boundary, or a live connection, bidirectional stream, replay window, application
acknowledgment, compression context, or media timeline must resume.

<!-- mustflow-section: preconditions -->
## Preconditions

- The task matches the Use When conditions and does not match the exclusions.
- The authoritative owner record and the final sinks able to reject stale epochs are identified, or
  their absence is reported as the primary split-brain risk.
- Current repository instructions and the selected repository command contract have been checked.

<!-- mustflow-section: allowed-edits -->
## Allowed Edits

- Update session and handoff records, owner compare-and-swap logic, fencing checks, snapshot and
  delta transfer, manifests, inboxes, command and tool ledgers, target acceptance, redirectors,
  reconcilers, recovery workers, audit events, diagnostics, tests, and directly synchronized docs
  or templates.
- Add explicit context-envelope, artifact-reference, approval-state, secret-reference, permission,
  and policy-version contracts for AI-agent sessions.
- Add deterministic failpoints, virtual time, fake coordination services, network fault fixtures,
  history properties, and invariant assertions within the repository's established test surfaces.
- Do not serialize live locks, database connections, tool clients, tracing handles, raw secrets, or
  other runtime objects as transferable session state.
- Do not implement dual writers as a handoff shortcut or restore the old owner after the authority
  commit. Recover forward under the committed epoch.

<!-- mustflow-section: procedure -->
## Procedure

1. State the safety and continuity invariants before choosing mechanics.
   - At most one epoch may produce accepted effects for a session.
   - Owner epoch and state version never move backward.
   - A command acknowledged as successful remains represented by a durable terminal effect.
   - One command identity produces at most one accepted external effect.
   - Every handoff eventually reaches a named terminal or quarantined state.
2. Separate control plane from data plane.
   - Keep owner, epoch, state version, protocol state, commit decision, and target acceptance in the
     strongly coordinated authority record.
   - Keep large immutable history, files, model outputs, and artifact chunks behind versioned
     manifests. Do not make eventual-consistency storage the owner authority.
3. Keep identities distinct. Do not collapse session, owner instance, handoff, attempt, phase,
   command, effect, output stream, connection generation, authorization grant, policy, lease,
   artifact, approval, and epoch into one correlation ID. Preserve the same logical handoff identity
   across safe retries while giving each execution attempt and process boot its own identity.
4. Persist a recoverable state machine before starting transfer. Model preparation, quiescence,
   import, catch-up, target acceptance, owner commit, drain, abort, quarantine, and terminal cleanup
   as durable transitions with typed transition authority.
5. Classify every state item before transfer.
   - Copy durable source facts and immutable artifacts with versions and hashes.
   - Rebuild derived caches under the committed state version.
   - Reacquire leases and locks under the new epoch; never deserialize old coordination ownership.
   - Reconcile in-flight commands and external effects through durable ledgers.
   - Reconstruct runtime-only clients and credentials from scoped references.
   - Preserve absolute expiry, tombstones, timer intent, retry position, rate-limit state, random
     seed, pending callbacks, and subscriptions when they affect future behavior; do not reset them
     silently as a side effect of import.
6. Pair every snapshot with a source revision and an ordered catch-up range. When state spans stores
   without one global revision, bind a per-store cursor vector and activation predicate. Define
   `applied_through`, `next_expected`, or equivalent inclusive semantics explicitly. The target must
   prove which snapshot it imported, which deltas and deletions it applied, and the final version
   vector it validated. A revisionless state dump or near-simultaneous multi-store read is not a
   handoff boundary.
7. Define live-input behavior before quiescence. Keep one writer, durably admit new commands with
   stable logical-session-scoped command IDs, establish a cutoff, drain or record pre-cutoff work,
   and make post-cutoff ownership explicit. Name the ordering domain and serialize replay within it;
   parallelize only across keys proven independent. Do not hide conflicting dual writes or reordered
   replay behind later merge logic.
8. Make target readiness session-specific. Start the target in shadow or import mode without
   authority to execute user commands or external effects. Validate state hash, schema, event and
   command positions, tombstones and expiry, current grant and policy, subject and actor delegation,
   tools, resources, artifacts, connection resume state, and remaining deadline, then persist
   explicit acceptance or a typed rejection.
9. Commit ownership once with an atomic conditional decision. Bind the expected source owner,
   source epoch, source state version, accepted target, target protocol version, and handoff identity.
   Issue the next monotonic epoch in the same authority decision.
10. Enforce fencing at final sinks. Storage engines, queues, file writers, tool executors, gateways,
    routers, and external-effect adapters must reject lower or mismatched epochs. Cache owner maps
    with their revision and refresh them after stale-owner rejection. Revoking a lease, relying on
    connection affinity, or notifying the source is not sufficient when a paused process can resume.
11. Treat timeout and lost response as observer `UNKNOWN`, not protocol failure. Query durable
    handoff status, owner, epoch, state version, acceptance, and effect receipts before retrying,
    aborting, compensating, or declaring success.
12. Give retry policy one owner. Propagate one absolute deadline, reserve time for status lookup and
    recovery, classify outcomes as safe-to-retry, query-required, compensation-required, or
    terminal, use jitter and a bounded retry budget, and prevent retry multiplication across layers.
13. Separate rollback, compensation, and forward recovery.
    - Before owner commit, release reversible preparation and reactivate only the still-authoritative
      source under the same valid epoch.
    - After owner commit, do not resurrect the source. Resume, repair, compensate, or hand off again
      from the committed target epoch.
14. Couple the authority decision to durable publication. When other systems learn through events,
    record the owner change and outbox event atomically, deduplicate consumption through an inbox or
    processing ledger, and keep publication progress separate from authority truth.
15. Preserve command, effect, and acknowledgment continuity. Record received, started,
    effect-committed, response-durable, sent, and application-acknowledged stages where relevant.
    Send success only after the durable point able to replay the same result. On takeover, query
    ambiguous external effects and replay only durable output beyond the peer's application ACK.
    Queue, socket, transport, or ping success does not prove application completion.
16. Version caches and immutable artifacts. Select caches through the authoritative state version,
    preserve versioned tombstones longer than the maximum stale-replica and handoff window, carry
    authoritative absolute expiry instead of resetting TTL, verify manifest and chunk hashes, reject
    unsupported schema or required features before commit, and let old namespaces expire only after
    they are no longer referenced.
17. Drain the source without letting it execute. Keep a bounded redirect or forwarding window for
    stale routes, publish the last accepted client sequence, last emitted server sequence, target,
    epoch, and resume deadline where the protocol permits, preserve the original command identity,
    and observe traffic that continues after the grace window.
18. For AI-agent sessions, separate runtime context from model-visible context.
    - Transfer goals, explicit constraints, accepted decisions, rejected options, evidence links,
      cursors, pending work, and policy state through a typed envelope.
    - Recreate database, tool, tracing, and credential objects locally from references.
    - Keep original events authoritative and summaries derived with source event references.
19. Preserve tool, artifact, output, and approval boundaries.
    - Record tool call identity, idempotency key, status including `UNKNOWN`, external resource or
      effect receipt, and retry policy.
    - Reference artifacts by immutable identity, hash, media type, schema version, and source events.
    - Transfer pending approval identity, requested action, approver scope, expiry, and policy
      version without converting a wait state into approval.
    - Stop streaming at a durable output boundary; do not splice two owners into one unversioned
      response stream.
20. Transfer capability, not secrets. Negotiate target tools, schemas, permissions, and resource
    limits before acceptance. Use a one-purpose, one-time handoff or resume ticket bound to session,
    handoff, target, epoch, nonce, and short expiry; exchange credential references for target-bound,
    least-privilege, preferably sender-bound authority. Preserve original authentication time and
    strength, separate user subject from service actors, re-evaluate current grants and policy before
    activation, and propagate revocation to every owner and gateway. Do not copy bearer or refresh
    credentials into prompts, logs, traces, queues, URLs, or handoff records.
21. Give orphan recovery one durable owner. A reconciler must fence itself, inspect authoritative
    state and effect receipts, choose resume, pre-commit abort, forward recovery, or quarantine, and
    avoid blind force decisions when evidence is incomplete.
22. Make transitions and invariants observable. Emit structured state-transition events, preserve
    an append-only owner and epoch audit, link asynchronous attempts causally, retain exceptional
    traces without propagating sensitive baggage, and measure split-brain attempts, stale rejects,
    hash mismatches, nonterminal age, duplicate effects, and manual recovery.
23. Test the history, not only the final row. Place deterministic failpoints before and after every
    durable write and authority decision. Combine response loss, asymmetric partitions, process
    pause and restart, lease expiry, stale cache reads, event reordering, schema mismatch, and clock
    anomalies. Preserve the seed and actual fault schedule, then check the full command and owner
    history against the named invariants.
24. Model real-time resume above the transport.
    - Keep a stable edge or gateway connection when true connection continuity is required; switch
      only the backend logical stream. Otherwise promise reconnect and application resume, not socket
      migration.
    - Track independent client-to-server and server-to-client sequence and application-ACK spaces,
      connection generation, subscription and channel cursors, replay retention, and an explicit
      resume-too-old response that triggers full state synchronization.
    - For make-before-break, allow overlapping connections but one write epoch. Activate the new
      path only after catch-up and a switch barrier is acknowledged.
25. Cut over only at complete application boundaries. Do not transfer a partial logical message,
    compression dictionary, batch, RPC item, or media dependency chain as if it were independent
    state. Reinitialize or negotiate compression context, and move audio or video at a decodable
    segment or keyframe boundary with an explicit discontinuity when continuity cannot be preserved.
26. Treat replayable early connection data as hostile to side effects. Keep owner activation,
    ticket consumption, payments, writes, and other irreversible commands out of replayable early
    data unless the complete path enforces a stable idempotency and anti-replay contract.

<!-- mustflow-section: postconditions -->
## Postconditions

- Owner authority, epoch, commit point, target acceptance, stale-writer rejection, and terminal
  recovery states are explicit and backed by named durable evidence.
- Snapshot, multi-store cursor, delta, tombstone, expiry, command, effect, application ACK,
  artifact, cache, lock, runtime-context, model-context, authorization, approval, credential, and
  secret-transfer policies are separated.
- Timeout, retry, rollback, compensation, forward recovery, drain, and quarantine actions are
  selected from durable authority and outcome evidence rather than caller observation alone.
- AI-agent summaries remain derived context, pending approvals remain pending, tool outcomes remain
  queryable, and target capability is proven before ownership commit.
- Authorization is recalculated for the target, stale grants and epochs are rejected, revocation
  reaches old owners, and real-time resume uses explicit bidirectional cursors and replay bounds.
- Safety and liveness claims are tied to structured events, append-only owner history, invariant
  metrics, deterministic fault schedules, and configured verification evidence.

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

Prefer deterministic protocol, crash-point, response-loss, stale-epoch, command-replay, target-
acceptance, context-envelope, approval-resume, and history-property tests exposed by the selected
repository command contract.

<!-- mustflow-section: failure-handling -->
## Failure Handling

- If no authoritative owner record or sink-level fence exists, report split-brain safety as
  unproven instead of approving a lease-only design.
- If snapshot revision, delta boundary, command ledger, or effect receipts are missing, stop before
  owner commit or route the session to quarantine.
- If target capability, schema, permissions, artifacts, or remaining deadline cannot be proven,
  reject target acceptance while the source remains authoritative.
- If commit outcome is unknown, query authority and receipts before retry, rollback, compensation,
  or manual force.
- If original events, approval state, or tool outcomes are unavailable, label transferred summaries
  as incomplete and block irreversible continuation that depends on the missing evidence.
- If current grant, target audience, sender binding, revocation, application ACK, replay window, or
  stream boundary cannot be proven, reject activation or require full reauthentication or state
  synchronization instead of silently resuming.
- If deterministic fault or history evidence is unavailable, report the exact untested cutover and
  recovery branches rather than using repeated happy-path runs as proof.

<!-- mustflow-section: output-format -->
## Output Format

- Session and handoff boundary
- Owner authority, epoch, state version, commit point, and target acceptance
- State, tombstone, expiry, cache, lock, command, effect, artifact, runtime-context, and model-context inventory
- Snapshot, cursor vector, delta, manifest, schema, quiesce, drain, and stale-route behavior
- Timeout, retry, rollback, compensation, forward-recovery, reconciler, and quarantine decisions
- AI envelope, tool ledger, authorization grant, delegation, credential exchange, approval,
  permission, revocation, and secret handling
- Connection generation, bidirectional sequence and application ACK, replay, resume ticket,
  make-before-break, message or media boundary, and resume-too-old behavior
- Structured transition, audit, trace, metric, failpoint, fault schedule, and history evidence
- Files changed
- Command intents run
- Skipped checks and reasons
- Remaining split-brain, state-loss, duplicate-effect, context, privacy, or liveness risk
