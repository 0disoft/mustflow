# Two-Phase Transition Checklist

Use this reference to inspect an authority handoff that prepares a target and then activates it.
This is not a claim that every handoff uses a distributed transaction coordinator.

## Contents

1. [Authority invariant](#authority-invariant)
2. [Transition record](#transition-record)
3. [Phase and command matrix](#phase-and-command-matrix)
4. [Prepare evidence](#prepare-evidence)
5. [Commit predicate and atomic mutation](#commit-predicate-and-atomic-mutation)
6. [Lease and fencing matrix](#lease-and-fencing-matrix)
7. [Live-input handoff](#live-input-handoff)
8. [Abort, expiry, cleanup, and reversal](#abort-expiry-cleanup-and-reversal)
9. [Reads, events, and caches](#reads-events-and-caches)
10. [Conflict taxonomy](#conflict-taxonomy)
11. [Failure-injection matrix](#failure-injection-matrix)
12. [Invariant monitoring](#invariant-monitoring)
13. [Skill handoffs](#skill-handoffs)

## Authority invariant

Write the invariant before reviewing code:

- Before commit, the source remains the sole committed authority.
- A prepared target may hold data or reservations but cannot accept authoritative writes.
- One conditional atomic commit changes the authority pointer and monotonically advances its fence.
- After commit, the source may continue running but every authoritative sink rejects its old fence.
- Cleanup can lag without changing which owner is authoritative.

Identify the concrete record that answers `who may write now?`. A process-local flag, service
discovery entry, cache value, or notification is insufficient when a stale process can still reach
the durable sink.

## Transition record

Record the fields needed to distinguish intent, attempt, and authority:

| Field | Review question |
| --- | --- |
| `transition_id` | Is one handoff attempt uniquely addressable across retries and cleanup? |
| `request_id` | Can duplicate client intent replay the prior response without creating a new attempt? |
| `object_id` | Is the authority domain scoped to one object, session, shard, or resource? |
| `source_version` | Can commit prove it prepared from the state that is still current? |
| `target_owner` or `target_state` | Is the prepared destination immutable? |
| `request_hash` | Do all security- and business-relevant inputs participate in mismatch detection? |
| `phase` | Are `PREPARING`, `PREPARED`, `COMMITTED`, `ABORTED`, and `EXPIRED` distinguishable? |
| `lease_expires_at` | Does abandoned preparation terminate without relying on process memory? |
| `fencing_token` | Is authority monotonic across retry, expiry, and reversal? |
| timestamps | Can operators distinguish slow work, abandoned work, and delayed cleanup? |

Keep the prepared snapshot immutable. If the target, amount, permission set, configuration, base
version, or normalized input changes, require a new transition or return a mismatch conflict.

## Phase and command matrix

Define outcomes rather than letting handlers improvise:

| Current phase | Prepare same input | Prepare different input | Commit | Abort or expire |
| --- | --- | --- | --- | --- |
| absent | create `PREPARING` | create `PREPARING` | not prepared | no-op or not found |
| `PREPARING` | return progress | conflict | not ready | conditional abort or expiry |
| `PREPARED` | replay prepared response | conflict | conditional commit | conditional abort or expiry |
| `COMMITTED` | replay committed result | conflict | replay committed result | reject; use reverse transition |
| `ABORTED` | return terminal result or start a new ID | conflict on reused ID | reject | replay aborted result |
| `EXPIRED` | return terminal result or start a new ID | conflict on reused ID | reject | replay expired result |

Combine this table with an object-level active-transition slot. A unique transition ID alone does
not prevent two different transitions from preparing the same object concurrently.

## Prepare evidence

Check that prepare establishes readiness without changing committed truth:

- reserve or allocate resources under the transition ID;
- copy or reconstruct state from the recorded source version;
- validate permissions and business inputs that commit will later bind;
- prove capacity, dependencies, and target-specific readiness;
- record checksums, schema versions, or watermarks required to detect drift;
- keep ordinary reads on the committed owner or state;
- expose preparation details only through an explicit operational view;
- define deterministic cleanup for every allocated object.

A target process answering a health probe proves only that the probe ran. It does not prove that the
right state, epoch, permissions, capacity, dependencies, or pending input are present.

## Commit predicate and atomic mutation

Revalidate these conditions immediately before commit:

- object committed version still equals `source_version`;
- object `active_transition_id` still equals this transition;
- transition phase is `PREPARED`;
- lease has not expired and renewal outcome is known;
- request hash and prepared snapshot are unchanged;
- target generation is the next permitted generation;
- target readiness evidence is still within its validity contract.

The atomic mutation should cover every local fact whose disagreement would make authority
ambiguous:

- committed owner or state;
- object version and owner epoch or generation;
- active-transition slot;
- transition phase and committed result;
- outbox record required to announce the new generation.

Keep this boundary short. Do not copy data, wait for drains, call another service, poll readiness, or
delete the source while holding it. If an external system commits independently, model convergence
rather than pretending the entire operation has one atomic boundary.

## Lease and fencing matrix

| Mechanism | What it proves | What it does not prove |
| --- | --- | --- |
| lease | an owner may act until a bounded expiry under known clock assumptions | an expired process has stopped or cannot write |
| heartbeat | an owner recently reported liveness | current authority at the durable sink |
| notification | a source was asked to stop | that the source received or obeyed the request |
| epoch or generation | which authority is newer | rejection unless every sink compares it |
| fencing check | a sink rejects commands older than its current generation | exactly-once execution or complete event delivery |

Carry the fence through database writes, object-store manifests, provider commands, cache mutations,
queued work, and any downstream effect that can outlive the owner. If renewal times out, stop effects
and reread authority before continuing; treating a timeout as either success or failure creates a
split-brain window.

## Live-input handoff

For sessions and active writers, define a sequence timeline:

1. Choose and durably record a cutoff sequence.
2. Let the source finish or durably record work before the cutoff.
3. Route work after the cutoff into a durable log or buffer owned by the transition or next epoch.
4. Capture state together with the last processed sequence.
5. Restore the target from that pair and replay only later sequences.
6. Run shadow computation without externally visible effects when comparison is useful.
7. Commit owner and epoch atomically.
8. Release buffered input to the target under the new epoch.
9. Reject late source acknowledgements or writes carrying the old epoch.

Include session ID, epoch, input sequence, and request identity in commands. A snapshot without its
watermark admits duplicates or gaps; a watermark stored separately from the snapshot can describe a
state that never existed.

## Abort, expiry, cleanup, and reversal

- Abort or expiry must conditionally close only the matching active transition.
- Prepared resources must be tagged with the transition ID and target generation.
- Cleanup must verify those tags before deletion so it cannot remove a newer transition's resource.
- After commit, cleanup is retriable work; it does not restore old authority.
- Revoke the source fence immediately, but delay destructive deletion through the required
  observation, rollback, audit, or forensics window.
- Reverse a committed cutover through a new transition with a higher generation. Never rewrite the
  old committed result into an aborted state.

## Reads, events, and caches

Default reads should expose committed state only. Operational APIs may reveal preparation phase,
lease, target, progress, and cleanup state when access control permits it.

Attach object version and authority generation to outbox events, cache entries, projections, and
subscriber updates. Consumers should apply monotonic comparison rules and discard stale arrivals.
Backoff reduces contention; it does not repair missing conditional writes or missing fences.

## Conflict taxonomy

Return explicit outcomes for:

- another active transition owns the object;
- source version changed after prepare;
- request identity was reused with different immutable input;
- transition expired before commit;
- stale owner or stale generation attempted a write;
- command is invalid for the current transition phase;
- commit outcome is already recorded and the response should be replayed;
- external delivery outcome remains unknown after local commit.

Use per-object serialization or conditional writes where contention is real. Avoid broad locks, and
never keep a lock across a network call. Revalidate after any work performed outside the lock.

## Failure-injection matrix

| Injection | Required observation |
| --- | --- |
| crash before prepared record | source remains authoritative; abandoned resources expire |
| crash after prepared record | retry observes the same immutable snapshot |
| lease expires during prepare | old or newer authority wins; expired attempt cannot commit |
| crash immediately before commit | either old authority remains or commit is durably visible |
| crash after commit before response | retry replays committed result without a second cutover |
| commit response lost | request and transition identity recover the recorded outcome |
| stale source writes after commit | authoritative sink rejects old epoch |
| target receives duplicated input | sequence and request identity suppress duplicate effect |
| target receives reordered input | sequence policy buffers, rejects, or deterministically reorders |
| outbox delivery is delayed | committed reads are correct; consumers later converge monotonically |
| cleanup repeatedly fails | new authority stays valid; cleanup remains observable and retryable |
| reverse transition races cleanup | transition tags and higher generation protect new resources |

Prefer model-based state exploration, controlled schedulers, barriers, and fault injection over sleep
timing. Preserve the failing transition ID, seed or schedule, phase, and epoch so the interleaving can
be reproduced.

## Invariant monitoring

Continuously query or derive:

- no object has more than one committed owner for the same generation;
- no object has more than one active transition slot;
- no uncommitted target has authoritative writes;
- no accepted write carries an epoch below the current fence;
- every committed transition agrees with the object's owner and generation;
- every expired or aborted transition eventually reaches bounded cleanup or a named terminal alert;
- every committed outbox record eventually delivers or remains in a visible retry or dead-letter
  state.

Alert on invariant violations, not only handler errors. A quiet service can still hold split state.

## Skill handoffs

- Use `state-machine-pattern` for one entity's ordinary lifecycle table.
- Use `durable-workflow-orchestration` for multi-step persisted business progress, callbacks,
  compensation, and resume.
- Use `dual-write-consistency` for local commit plus independent publication, projection, or provider
  convergence.
- Use `idempotency-integrity-review` for duplicate logical intent, request hashing, and response
  replay details.
- Use `concurrency-invariant-review` when the wider problem is shared-state synchronization rather
  than an authority handoff.
- Use `transaction-boundary-integrity-review` for atomic local invariants that do not move authority.
