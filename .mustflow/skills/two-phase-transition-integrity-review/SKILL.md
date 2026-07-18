---
mustflow_doc: skill.two-phase-transition-integrity-review
locale: en
canonical: true
revision: 2
lifecycle: mustflow-owned
authority: procedure
name: two-phase-transition-integrity-review
description: Apply this skill when a state, session, resource, writer, leader, configuration, file set, payment, or other authority moves through admission or prepare and then commit or activate, especially when correctness depends on one durable commit decision, immutable admitted inputs and participants, ambiguous-outcome recovery, separate authority and execution states, leases and fencing epochs, stale-owner rejection, roll-forward effects, reconciliation, or post-commit cleanup.
metadata:
  mustflow_schema: "1"
  mustflow_kind: procedure
  pack_id: mustflow.core
  skill_id: mustflow.core.two-phase-transition-integrity-review
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

# Two-Phase Transition Integrity Review

<!-- mustflow-section: purpose -->
## Purpose

Review generalized prepare-and-commit transitions without confusing them with database distributed
two-phase commit. Preserve the old committed authority during preparation, move authority and its
generation at one atomic conditional commit, reject stale writers at the effect boundary, and keep
post-commit cleanup outside the correctness-critical cutover.

Treat admission as a durable promise that commit prerequisites and reversible resources are bound.
Treat commit as the one durable decision after which the protocol rolls forward even when later
effects, publication, cleanup, or the client response remain incomplete. Keep an observer's
`UNKNOWN` outcome separate from server authority.

<!-- mustflow-section: use-when -->
## Use When

- A session, shard, leader, writer, resource, configuration, file tree, payment state, or service
  ownership moves from one authority to another.
- A workflow has `prepare`, `ready`, `commit`, `activate`, `cutover`, `handoff`, `promote`, or
  equivalent phases even when those names are implicit.
- Correctness claims include one active owner, zero-gap cutover, no split brain, stale-owner
  rejection, immutable prepared state, live-input continuity, or safe delayed cleanup.
- Leases, epochs, generations, fencing tokens, snapshot offsets, input cutoffs, shadow execution,
  or authority pointers participate in the transition.
- A timeout, lost response, half-open connection, retry, recovery worker, manual force decision,
  protocol upgrade, or stuck admitted or committed operation can make the result ambiguous.

<!-- mustflow-section: do-not-use-when -->
## Do Not Use When

- One entity changes ordinary local lifecycle state without transferring authority; use
  `state-machine-pattern`.
- A business outcome spans independently persisted steps, callbacks, timers, retries, and
  compensation; use `durable-workflow-orchestration` as the primary skill and this skill only when
  an authority cutover is one of its steps.
- Local commit and independently committed publication or projection are the main gap; use
  `dual-write-consistency` for delivery convergence and this skill only for the authority swap.
- Duplicate logical requests are the only risk; use `idempotency-integrity-review`.
- The change is only an ordinary transaction boundary with no old-to-new authority handoff; use
  `transaction-boundary-integrity-review`.

<!-- mustflow-section: required-inputs -->
## Required Inputs

- Authoritative object and currently committed owner, state, version, epoch, or generation.
- Transition identity, request identity, immutable request hash, source version, target state or
  owner, phase, lease expiry, fencing token, and timestamps.
- Prepare-time reservations, copied state, readiness evidence, and externally visible read rules.
- Commit predicate, linearization point, atomic writes, outbox records, and conflict responses.
- Every mutation or effect sink that must enforce the current fence.
- Live-input cutoff, drain, durable buffer or log, snapshot and last-processed sequence pairing, and
  shadow-mode effect policy when applicable.
- Abort, expiry, cleanup, observation-window, and reverse-transition behavior.
- Deterministic crash, retry, stale-owner, response-loss, and event-reordering evidence.
- Authority state, execution state, and observer knowledge state, including which one each timeout,
  retry, cancellation, expiry, and operator action may change.
- Operation, attempt, idempotency, participant, effect, decision-sequence, resource-version, and
  protocol-version identities plus their retention policy.
- Recovery ownership, retry budget, progress timestamps, in-doubt admission gate, transition
  journal, invariant checker, and safety and liveness evidence.
- Configured command intents for the selected repository.

Read [references/two-phase-transition-checklist.md](references/two-phase-transition-checklist.md)
when the transition crosses processes, accepts live input, allocates resources during prepare, or
claims race-safe cutover.

Read [references/admission-decision-recovery-checklist.md](references/admission-decision-recovery-checklist.md)
when admission survives a request, commit effects can finish later, an external participant can
return an ambiguous result, or a reconciler, operator action, protocol upgrade, or fault-injection
plan is part of the design.

<!-- mustflow-section: preconditions -->
## Preconditions

- The task matches the Use When conditions and does not match the Do Not Use When exclusions.
- The committed authority and the storage or effect boundary able to reject stale generations can
  be identified, or their absence is reported as the primary gap.
- Higher-priority instructions and the selected repository command contract have been checked.

<!-- mustflow-section: allowed-edits -->
## Allowed Edits

- Update transition records, conditional state changes, owner or generation checks, admission
  snapshots, decision records, durable input handoff, outbox or inbox records, recovery workers,
  cleanup workers, conflict mappings, invariant journals, deterministic fixtures, tests, and
  directly synchronized docs or templates.
- Do not broaden a local transition into distributed orchestration, introduce network calls inside
  the commit critical section, or claim exactly-once execution from retries or fencing alone.
- Do not delete the old resource merely because commit succeeded; first revoke its authority and
  preserve any required observation or recovery window.

<!-- mustflow-section: procedure -->
## Procedure

1. Name the single externally authoritative fact: owner, active version, leader epoch, payment
   state, active file generation, or equivalent. Separately name what the client currently knows;
   a timeout may make observer knowledge `UNKNOWN` without changing authority.
2. Model authority and execution on separate axes. Use one durable authority decision such as
   `PENDING`, `ADMITTED`, `COMMITTED`, or `ABORTED`, and a separate progress state such as `IDLE`,
   `RUNNING`, `RETRY_WAIT`, `BLOCKED`, or `DONE`. Keep operation, request, transition, and attempt
   identities distinct.
3. Acquire at most one active transition slot per object with a conditional write against the
   committed source version. Return a typed conflict when another incompatible transition owns it.
4. Freeze the admitted request and participant snapshot. Bind tenant, subject, target, permissions,
   amount, configuration, policy version, participant set, source version, protocol version, and
   canonical input hash so commit and recovery cannot silently change what admission approved.
5. Keep the old committed owner authoritative while preparation copies state, reserves resources,
   warms caches, or proves readiness. Admission may acquire only reversible resources. Persist the
   operation before returning its identity, and do not expose admitted state as committed truth by
   default.
6. Make readiness evidence specific to the target operation. A process health response alone does
   not prove that state, permissions, capacity, dependencies, or input continuity are ready.
7. Bound preparation with a lease or expiry. Separate client wait timeout, admission lease, external
   call timeout, convergence objective, and operator-escalation age. Define who stops waiting and
   which state change, if any, each deadline permits. If lease renewal has an ambiguous result, stop
   writes and reread the authoritative fence before resuming.
8. Issue a monotonically increasing epoch, generation, or fencing token and enforce it at every
   authoritative storage or external-effect boundary. Notifications to old owners are an
   optimization, not the rejection mechanism.
9. Define live-input behavior before cutover: select a cutoff sequence, drain pre-cutoff work,
   durably buffer or log post-cutoff input, and bind the snapshot to its last processed sequence in
   one consistent record.
10. Keep shadow execution read-only or effect-suppressed. Include session, epoch, input sequence,
    and request identity in commands so late or duplicate input can be rejected deterministically.
11. Immediately before commit, revalidate the source version, active transition ID, immutable
    request hash, lease, readiness evidence, and target generation.
12. Use one short atomic conditional commit as the linearization point. Persist the irreversible
    commit decision and decision sequence, change committed owner or state, increment the
    generation, clear or close `active_transition_id`, record the canonical result, and persist
    required outbox records in the same atomic boundary. Effects incomplete after this point change
    only execution progress and must roll forward; they do not turn authority into `ABORTED`.
13. Keep network calls, target probes, drains, data copies, and cleanup outside the commit lock or
    transaction. Revalidate any fact that may have changed while those operations ran.
14. Make admission and commit idempotent. Scope keys by tenant and command, bind them to a canonical
    payload hash, atomically claim the operation, and replay the recorded status and canonical
    result. A reused key with different immutable inputs must conflict. Keep business uniqueness and
    deterministic per-effect identity separate from transport idempotency.
15. Acknowledge input or commit only after the authoritative state, log entry, or result needed for
    recovery is durable. A lost response produces an unknown observer outcome, not a server failure.
    Before retrying an external effect with an ambiguous response, query by its stable effect or
    provider reference when possible; otherwise require an adapter ledger or serialized authority.
16. Publish post-commit events through the committed outbox and carry object version plus epoch in
    events and cache entries. Consumers must reject or ignore older generations and deduplicate
    application through an inbox or equivalent durable effect record when delivery can repeat.
17. Define command-by-phase outcomes for prepare, commit, abort, expiry, retry, and reverse. Map
    stale version, lease expiry, immutable-input mismatch, and competing transition to explicit
    conflicts rather than generic server failures.
18. Tag prepare-time resources with the transition ID and make release an idempotent durable action.
    Abort, expiry, or cleanup must verify decision and generation so repeated recovery cannot
    over-release or delete resources belonging to a newer transition.
19. Treat reconciliation and cleanup as protocol components, not operator folklore. Persist recovery
    owner, generation, next retry, last progress, and blocked reason; reuse the same state-transition
    functions as the online path. Cleanup failure must not roll back committed authority. When
    in-doubt count or age exceeds its bounded policy, close admission for the affected resource or
    participant while recovery continues.
20. Model rollback or compensation after commit as a new operation with a higher generation and
    stable effect identities. Preserve the original committed decision and audit history.
21. Delay destructive deletion until the observation or recovery window closes, while revoking old
    authority immediately at commit.
22. Test every durable boundary before and after its write: operation creation, admission response,
    participant preparation, commit decision, external effect, outbox, inbox, and acknowledgement.
    Include response loss, asymmetric network failure, half-open connections, duplicate and reordered
    messages, lease-edge pauses, stale reads, recovery takeover, cleanup failure, and reverse or
    compensation transitions with deterministic interleavings or bounded failure injection.
23. Append a transition journal with operation, attempt, participant, effect, generation, decision,
    actor, reason, and sequence identities. Monitor state age, in-doubt count, recovery progress,
    stale-fence rejection, and admission backpressure. Check both safety and liveness: no conflicting
    authority or duplicate effect, and every nonterminal operation either converges or enters an
    explicit bounded quarantine with an owner.

<!-- mustflow-section: postconditions -->
## Postconditions

- Preparation leaves the old committed authority intact and binds an immutable target snapshot.
- One named atomic conditional boundary moves authority, generation, transition state, and required
  outbox evidence together.
- Stale owners are rejected by authoritative storage or effect sinks rather than best-effort
  notifications.
- Abort, expiry, cleanup, and reverse transitions have terminating, observable behavior.
- Authority, execution progress, and observer knowledge cannot contradict each other through one
  overloaded status field.
- Ambiguous outcomes remain queryable and recoverable through stable identities, durable decisions,
  reconciliation ownership, and versioned protocol evidence.
- The stated invariants are backed by deterministic tests or named evidence gaps.

<!-- mustflow-section: verification -->
## Verification

Use the narrowest configured oneshot intents that cover the changed surface:

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

Do not infer missing commands. Prefer deterministic interleaving tests over timing sleeps.

<!-- mustflow-section: failure-handling -->
## Failure Handling

- If no authoritative fence can reject a stale writer, report split-brain exposure instead of
  treating lease expiry or owner notification as sufficient.
- If prepare mutates externally visible truth, either move that mutation into the atomic commit or
  classify it as a separately compensatable workflow effect.
- If commit spans network calls or multiple independent commit authorities, narrow the claimed
  linearization point and route delivery gaps through `dual-write-consistency` or multi-step recovery
  through `durable-workflow-orchestration`.
- If lease ownership or commit outcome is ambiguous, stop new effects and reread durable authority;
  do not guess, retry blindly, or clean up until identity and generation are known.
- If a manual force decision lacks durable coordinator evidence, participant observations, payload
  hash, generation, and protocol version, reject the action rather than inventing certainty.
- If in-doubt work exceeds the configured age or count policy, stop affected admissions and keep
  recovery running instead of allowing reservation and retry debt to grow without bound.
- If deterministic concurrency coverage is unavailable, report the untested interleavings and do
  not claim race-safe cutover.

<!-- mustflow-section: output-format -->
## Output Format

- Transition and authoritative fact reviewed
- Prepared snapshot and visibility rules
- Commit predicate and atomic linearization point
- Lease, epoch, and fencing enforcement sites
- Live-input cutoff, snapshot, sequence, buffer, and shadow behavior
- Idempotency, conflicts, outbox, caches, and events
- Authority, execution, and observer-knowledge states
- Operation, attempt, participant, effect, decision, and protocol identities
- Reconciler ownership, ambiguity handling, admission backpressure, journal, and invariant checks
- Abort, expiry, cleanup, observation window, and reverse transition
- Failure-injection and invariant evidence
- Command intents run and skipped
- Remaining authority-transition risk
