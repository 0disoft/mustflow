# Admission, Decision, and Recovery Checklist

Use this reference when admission outlives a request, commit effects complete asynchronously, an
external participant may return an ambiguous result, or recovery and operator intervention are part
of the protocol.

## Contents

1. [Three state axes](#three-state-axes)
2. [Operation record](#operation-record)
3. [Admission contract](#admission-contract)
4. [Commit decision and roll-forward](#commit-decision-and-roll-forward)
5. [Unknown outcomes](#unknown-outcomes)
6. [Recovery ownership and backpressure](#recovery-ownership-and-backpressure)
7. [Identity and idempotency](#identity-and-idempotency)
8. [External effects, release, and compensation](#external-effects-release-and-compensation)
9. [Timeout matrix](#timeout-matrix)
10. [Operator decisions](#operator-decisions)
11. [Journal and telemetry](#journal-and-telemetry)
12. [Fault-injection matrix](#fault-injection-matrix)
13. [Safety and liveness](#safety-and-liveness)
14. [Skill handoffs](#skill-handoffs)

## Three state axes

Do not flatten different facts into one status string:

| Axis | Example states | Authority |
| --- | --- | --- |
| authority decision | `PENDING`, `ADMITTED`, `COMMITTED`, `ABORTED` | durable protocol truth |
| execution progress | `IDLE`, `RUNNING`, `RETRY_WAIT`, `BLOCKED`, `DONE` | work still required to realize the decision |
| observer knowledge | `KNOWN_PENDING`, `KNOWN_COMMITTED`, `KNOWN_ABORTED`, `UNKNOWN` | what one client or caller can prove |

A lost response may move the caller to `UNKNOWN` while the durable authority is already
`COMMITTED`. An effect failure after the commit decision may move execution to `RETRY_WAIT`
without changing authority. A timer must not convert observer uncertainty or slow progress into an
abort.

## Operation record

Keep the record sufficient for a different process and code version to recover it:

| Group | Fields |
| --- | --- |
| logical identity | `operation_id`, tenant, resource, command type, idempotency-key hash |
| execution identity | `attempt_id`, recovery owner, recovery generation |
| immutable contract | canonical payload hash, subject, permissions, policy version, participant-set hash |
| resource contract | expected resource version, reservations, target generation, admission expiry |
| protocol | protocol version, authority state, execution state, state version |
| decision | decision sequence, decision timestamp, canonical result |
| effects | stable participant and effect IDs, effect sequence, observed external references |
| recovery | next retry, last progress, blocked reason, retry budget, quarantine owner |
| evidence | journal sequence, last error class, created, admitted, committed, and terminal timestamps |

Store the operation before returning its identity. Keep a thin terminal tombstone beyond the longest
queue, dead-letter, backup restore, manual replay, and audit window even when detailed response data
must expire.

## Admission contract

Admission is not merely successful validation. It should establish a durable, reviewable promise:

- the operation identity and immutable payload are stored;
- the subject, tenant, target resource, policy version, and expected resource version are bound;
- the participant set and deterministic effect identities are frozen;
- commit prerequisites are satisfied or represented by durable reservations;
- every acquired resource is reversible before the decision;
- one active admission policy per resource is enforced through a conditional or unique durable rule;
- the protocol version and recovery compatibility are recorded;
- normal reads continue to expose committed truth.

If admission conditions may legitimately change before commit, name exactly which conditions are
revalidated and which transition follows a failed revalidation. Rechecking arbitrary current policy,
price, participant configuration, or resource selection makes the admission promise meaningless.

An admission token or server record must bind the immutable contract. Possession of an operation ID
alone must not let another tenant, subject, or changed payload commit the operation.

## Commit decision and roll-forward

The linearization point is the durable decision, not an RPC response or the last participant reply.
The local atomic boundary should include the facts that must never disagree:

- `decision=COMMIT` and monotonic decision sequence;
- authority state, resource owner or active version, and generation;
- operation state version and canonical result;
- closure of the active-admission slot;
- outbox entries required to drive or announce effects.

Before this write, the protocol may abort and release admitted resources. After this write, it must
roll forward. Failed provider calls, delayed messages, cleanup errors, or a missing response change
execution progress only. Do not create hybrid authority states such as `COMMIT_FAILED` or rewrite
the committed decision into `ABORTED`.

Prepared data may remain private or staged. Prefer swapping a small committed pointer or generation
over copying a large body of data inside the decision transaction.

## Unknown outcomes

Treat timeout and connection loss as loss of knowledge unless durable evidence proves an outcome:

1. return or preserve the stable operation identity;
2. expose a status query that reads durable authority;
3. let a retry with the same scoped idempotency identity observe the existing operation;
4. replay the recorded canonical result when terminal;
5. keep a duplicate caller as an observer rather than a second executor.

Do not start a new operation merely because the caller timed out. Do not mark the server operation
failed to make the response easier.

For an ambiguous external effect, query the participant by deterministic effect ID, provider
reference, or resource ID before retrying. If the participant provides neither idempotent execution
nor outcome lookup, place a durable adapter ledger or single-writer serialization boundary in front
of it and report the residual ambiguity.

## Recovery ownership and backpressure

The reconciler is part of the protocol:

- scan admitted, aborting, committed-but-incomplete, retry-wait, and blocked work;
- claim recovery with a conditional generation or fencing token;
- invoke the same transition functions used by the online path;
- record next retry, last progress, attempt identity, and categorized failure;
- stop on protocol violation or unknown immutable input rather than guessing;
- retain an explicit quarantine owner and operator deadline for work that cannot auto-converge.

Use bounded backoff and jitter as load control, not correctness. Keep one retry owner across SDK,
service, queue, and reconciler layers so retry multiplication cannot explode.

Define admission backpressure by resource or participant. When in-doubt count, oldest age, locked
capacity, or recovery load crosses its reviewed threshold, reject new admissions for that path while
allowing status queries and recovery to continue.

## Identity and idempotency

Separate identities by purpose:

| Identity | Purpose |
| --- | --- |
| operation ID | one logical user or business intent |
| attempt ID | one execution or recovery attempt |
| scoped idempotency key | duplicate admission lookup within tenant and command namespace |
| payload hash | rejects key reuse with changed immutable meaning |
| participant ID | one frozen commit participant |
| effect ID | one deterministic materialized effect |
| event ID | one outbox delivery unit |
| generation | rejects stale owners and recovery workers |
| protocol version | selects compatible state-transition semantics |

Claim the operation through a unique durable rule rather than select-then-insert. Persist the first
local effect and operation claim in one transaction when they must not diverge. Replay the original
meaningful response, including deterministic rejection when the contract requires it.

Transport idempotency does not replace business uniqueness. Enforce facts such as one active
migration per account or one authorization per order independently of whether callers reuse keys.

Route detailed key scope, duplicate-in-progress responses, payload canonicalization, result replay,
retention, and provider idempotency through `idempotency-integrity-review`.

## External effects, release, and compensation

Derive stable effect identity from operation, participant, effect type, and step sequence. Record
effect intent before or with the durable handoff. Apply an inbox, participant lookup, or idempotent
sink so redelivery cannot rematerialize the same effect.

A reservation release is an effect too. Give it a stable release identity and a durable applied
record. Verify decision and generation so an expiry worker cannot release a reservation after commit
and repeated recovery cannot restore capacity twice.

After commit, reversal is a new operation:

- preserve the original commit;
- allocate a new operation and higher generation;
- freeze new participants and current reverse intent;
- record new effect identities;
- classify irreversible or partially compensable effects explicitly.

Route commit-to-publication gaps through `dual-write-consistency` and multi-step compensation
ownership through `durable-workflow-orchestration`.

## Timeout matrix

| Deadline | Who stops waiting | Permitted state effect |
| --- | --- | --- |
| client response timeout | caller | observer knowledge may become `UNKNOWN`; authority unchanged |
| admission lease | admission owner | blocks new commit attempt after expiry; abort remains conditional |
| participant call timeout | current attempt | outcome becomes retryable or ambiguous; durable decision unchanged |
| retry backoff | recovery worker | schedules next attempt; grants no correctness guarantee |
| convergence objective | operations owner | alert, quarantine, or admission backpressure |
| operator escalation age | support or control plane | permits reviewed evidence gathering, not blind force |
| retention horizon | storage owner | may compact detail while preserving required identity and terminal truth |

Expiry is a predicate, not a background right to overwrite state. Cancel is a command. Both must
check current authority, state version, decision absence, and generation before leading to abort.

## Operator decisions

A force-commit or force-abort path should require an evidence packet:

- operation and protocol version;
- immutable payload and participant-set hashes;
- durable coordinator decision or proof that none exists;
- participant observations and their freshness;
- current resource version and generation;
- effect and reservation records;
- requested action, actor, reason, and approval evidence;
- predicted invariant impact and recovery plan.

Reject a force-abort after a durable commit decision. Reject a force decision when evidence is
contradictory or stale. Preserve operator action in the append-only transition journal rather than
rewriting the prior history.

## Journal and telemetry

Record transition facts in append-only order:

- journal sequence and operation ID;
- from and to authority state;
- execution-state change;
- decision and decision sequence;
- actor, attempt, participant, effect, resource, and generation;
- stable reason and error class;
- durable timestamp.

Emit success language only after the authoritative write. Distinguish requested, decision persisted,
effect applied, convergence complete, and cleanup complete.

Keep high-cardinality operation and attempt identities in logs and traces rather than metric labels.
Separate operation correlation from attempt spans; link attempts to the shared operation when a
single parent trace would become misleading or unbounded.

Measure:

- count and oldest age by authority and execution state;
- admission, decision persistence, effect application, and full convergence latency separately;
- in-doubt and blocked counts;
- stale-generation rejection;
- recovery attempts, progress age, and participant load;
- admission backpressure and quarantine count.

Run an invariant checker over the journal or durable state. Detect conflicting terminal decisions,
commit without matching admission contract, terminal-state regression, stale-generation effects,
missing recovery ownership, and silently abandoned nonterminal work.

## Fault-injection matrix

| Injection point | Required observation |
| --- | --- |
| before operation record | no returned operation identity and no effect |
| after record before admission response | retry finds the same operation |
| before and after each participant admission | reversible reservations remain attributable |
| immediately before decision | either admitted authority remains or commit is visible |
| after decision before response | retry returns committed canonical result |
| after external effect before acknowledgement | lookup or inbox prevents rematerialization |
| before and after outbox or inbox write | local truth and delivery evidence do not split silently |
| one-way request loss | participant has no new effect or durable lookup proves it |
| one-way response loss | observer is unknown while durable authority remains queryable |
| half-open connection | bounded call stops waiting without inventing an outcome |
| duplicate or reordered delivery | effect identity, state version, and generation reject damage |
| pause across lease expiry | stale recovery owner cannot write |
| stale replica read | commit path revalidates against authoritative storage |
| recovery takeover | one generation owns progress and old attempts are fenced |
| cleanup or release replay | no over-release or deletion of newer resources |
| protocol upgrade with old work | only a compatible recovery implementation claims it |

Use configured failure-injection surfaces only. Production experiments require explicit scope,
abort conditions, impact limits, and automatic recovery owned by the relevant operational procedure.

## Safety and liveness

Check safety and liveness separately.

Safety examples:

- commit and abort decisions do not coexist;
- commit uses the admitted immutable contract;
- no effect below the current fence is accepted;
- one business effect identity materializes at most once;
- ordinary reads never expose admitted private state as committed truth.

Liveness examples:

- every admitted operation eventually commits, aborts, or enters owned quarantine;
- every committed operation's required effects eventually converge or remain visibly blocked;
- reservations do not leak silently;
- recovery does not amplify load until normal traffic collapses;
- admission backpressure activates before limbo consumes the resource budget.

A system that prevents duplicate commit by never completing any operation is not correct.

## Skill handoffs

- Use `idempotency-integrity-review` for duplicate logical intent, canonical payload binding,
  replayed responses, retention, and provider idempotency.
- Use `dual-write-consistency` for local decision plus independently committed message,
  projection, or provider convergence.
- Use `durable-workflow-orchestration` for long-running multi-step progress, compensation, timers,
  approvals, and versioned resume.
- Use `execution-ledger-integrity-review` for append-only run, attempt, checkpoint, effect, and
  receipt truth.
- Use `retry-policy-integrity-review` for retry ownership, classification, backoff, jitter, and
  amplification budgets.
- Use `state-machine-pattern` for an entity's ordinary lifecycle table.
- Use `observability-debuggability-review` for wider trace, log, metric, and incident-diagnostic
  design.
- Use `two-phase-transition-integrity-review` as the owner of the admission promise, irreversible
  decision, authority cutover, fencing, and recovery semantics described here.

