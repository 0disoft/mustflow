# Operation Identity, Ordering, and Stale-Write Checklist

Use this checklist when duplicate delivery, out-of-order completion, and stale decisions can affect
the same business operation. Keep database isolation, broker settlement, distributed protocol, and
memory-model work in their owning skills; this reference connects those boundaries through stable
operation identity and storage-enforced state validity.

## Contents

1. [One failure model](#one-failure-model)
2. [Identity ledger](#identity-ledger)
3. [Atomic duplicate admission](#atomic-duplicate-admission)
4. [Ordering scope](#ordering-scope)
5. [Causal tokens and gaps](#causal-tokens-and-gaps)
6. [Stale completion rejection](#stale-completion-rejection)
7. [UI and asynchronous completion](#ui-and-asynchronous-completion)
8. [External effects and settlement](#external-effects-and-settlement)
9. [Locks and request coalescing](#locks-and-request-coalescing)
10. [Commutative operations and ledgers](#commutative-operations-and-ledgers)
11. [Transaction traps](#transaction-traps)
12. [Adversarial tests](#adversarial-tests)
13. [Reconciliation invariants](#reconciliation-invariants)
14. [AI-generated code review](#ai-generated-code-review)
15. [Skill handoffs](#skill-handoffs)

## One failure model

Treat duplicate execution, reversed completion order, and stale writes as variants of one question:

> Which durable authority proves that the state observed before an action is still valid when the
> action attempts to commit?

For every state-changing path, identify:

- the logical business operation;
- the attempt that is currently executing;
- the aggregate or resource whose order matters;
- the state, version, generation, or fence observed before work;
- the conditional commit that accepts or rejects the result;
- the stable result returned after duplicate or ambiguous delivery.

A mutex, queue, transaction wrapper, cancellation signal, or request-coalescing helper may reduce
overlap. None of them replaces the durable authority check when work crosses processes, storage,
leases, retries, or external effects.

## Identity ledger

Keep these identities separate:

| Identity | Stable scope | Unsafe substitution |
| --- | --- | --- |
| operation ID | one business intent | per-attempt request ID |
| attempt ID | one execution try | operation ID reused as a trace span |
| message or event ID | one delivery artifact | aggregate ID |
| effect ID | one externally visible effect | worker or process ID |
| aggregate ID | one ordering domain | tenant-wide global key by default |
| sequence or version | one aggregate authority revision | wall-clock timestamp |
| generation | one latest-result admission domain | cancellation state |
| fencing token | one lease or ownership generation | boolean lock-held flag |

Generate the operation ID outside retry loops and propagate it through request, durable operation
record, inbox or outbox, provider call, result lookup, and response replay. A new attempt gets a new
attempt ID while retaining the operation ID.

Bind an idempotency claim to actor, tenant, operation type, target aggregate, and a canonical
semantic payload hash. Reusing one key with a different binding is a conflict, not a duplicate
success and not a new operation.

## Atomic duplicate admission

Make duplicate admission a storage decision:

- require the operation key where the contract requires idempotency;
- make the durable uniqueness field non-null;
- enforce uniqueness at the authoritative store;
- store the semantic payload hash and binding fields with the claim;
- insert the claim and apply the local business mutation in one atomic boundary when both live in
  the same transactional store;
- distinguish an existing matching claim from an existing conflicting claim;
- persist the replayable outcome or stable status lookup contract.

Do not record only "seen" before applying the local mutation unless a durable recovery owner can
prove and finish the missing work. Do not apply the mutation and record "seen" later unless repeat
application is independently safe.

## Ordering scope

Name the smallest domain that actually requires order. Common domains are one order, account,
document, device, session, subscription, or resource owner. A global ordering key can create an
avoidable bottleneck; unrelated aggregates usually do not need serialization.

Transport order is evidence only within the broker's documented grouping or partition boundary.
It does not prove:

- one aggregate always maps to the same group;
- producers cannot send conflicting sequence values;
- redelivery cannot repeat an older event;
- consumers apply effects in delivery order;
- external effects complete in send order.

Record the aggregate key derivation and test hot-key behavior as the cost of the chosen ordering
scope, not as an excuse to silently weaken correctness.

## Causal tokens and gaps

Use a token created for ordering, such as an aggregate version, store revision, generation, or
fencing token. Do not infer causality from wall-clock timestamps, retry timestamps, arrival time,
or auto-increment identifiers.

For an incoming aggregate sequence, define all three branches:

| Incoming relation | Required decision |
| --- | --- |
| older than or equal to applied authority | dedupe, replay, or reject without regression |
| exactly next | apply through a conditional authority update |
| ahead with a gap | buffer, quarantine, or refresh authoritative state before deciding |

Do not silently skip a gap and call the aggregate current. Bound buffers and retries, name the
resynchronization owner, and expose stuck-gap age.

## Stale completion rejection

Carry the observed authority token to the final write. Make the authoritative store accept the
result only when the expected state, version, generation, ownership fence, and other business
preconditions still hold.

Treat zero affected rows or a failed compare-and-swap as a stale-decision result. It is not enough
to retry the same calculation blindly. Re-read current authority, decide whether the operation is
already satisfied, invalid, superseded, compensatable, or eligible for a new calculation, and then
use a new attempt under the same logical operation when appropriate.

Put irreversible side effects behind durable intent or effect records when the store cannot reject
the side effect itself. Use stable effect IDs and lookup-before-retry for ambiguous outcomes.

## UI and asynchronous completion

Cancellation requests resource cleanup; it does not revoke already completed callbacks, cache
writes, state commits, or external effects. Use a generation token or expected-state token at every
state surface that can accept a late result.

Review UI state, client cache, server state, and external effects separately. Blocking a stale UI
render does not prove a stale cache update or server mutation was blocked.

## External effects and settlement

When local state and another system commit independently:

- record local business state and an outbox or effect intent atomically;
- make relays and consumers tolerate repeat delivery;
- record inbox admission and local application atomically when one store owns both;
- settle or acknowledge delivery only after the authoritative local outcome is durable;
- preserve the same operation and effect identity across ambiguous retries;
- look up a provider result before replaying an effect whose request may have succeeded.

An outbox closes one local commit-to-publish loss window. It does not make consumers idempotent or
make external providers part of the local transaction.

## Locks and request coalescing

Treat process-local single-flight and request coalescing as load controls. They lose authority at
process, instance, restart, failover, and leader-change boundaries.

Treat leases and distributed locks as admission controls. A paused old owner may resume after a
lease expires, so authoritative writes still need a fencing token or another monotonic ownership
check. If the destination cannot check the fence, state that the lock reduces overlap but does not
prove stale-writer exclusion.

## Commutative operations and ledgers

Before imposing order, ask whether the mutation can become an immutable operation with a stable
operation ID. Appending independently identified deltas, facts, or set members can reduce ordering
sensitivity compared with replacing a whole snapshot.

Commutativity does not remove duplicate risk. Deduplicate the operation identity, define reversal
as another identified operation, and reconcile derived totals or projections against the immutable
source.

## Transaction traps

Escalate these cases to `transaction-boundary-integrity-review`:

- existence check followed by insert without a durable unique constraint;
- read-modify-write that can lose a concurrent update;
- a multi-row invariant vulnerable to write skew;
- an absent-row lock that protects no future row;
- an isolation assumption not matched to the engine and statement shape;
- retrying only the failed statement instead of the complete read-decision-write action;
- executing an external effect inside a transaction callback that may rerun;
- assuming syntactically similar upsert operations have identical concurrency semantics;
- using queue-claiming skip behavior as a general consistent-read mechanism.

## Adversarial tests

Define a forbidden outcome before choosing a harness. Cover the smallest relevant set:

- the same operation delivered twice sequentially and concurrently;
- one key reused with a different semantic payload;
- a later aggregate version applied before an earlier version;
- a missing-version gap and bounded resynchronization;
- two attempts reading the same authority before either writes;
- a stale worker completing after a newer owner or generation;
- request delivered but response lost;
- local commit followed by process death before response or settlement;
- external effect accepted followed by lost response;
- outbox publication repeated before its completion marker;
- lock or lease expiry during a process pause;
- shutdown with in-flight work and subsequent recovery.

Use deterministic barriers or controlled schedules around read, decision, commit, publish, effect,
and settlement boundaries. Preserve the input, operation identity, actor decisions, schedule or
fault plan, and forbidden outcome. Hand schedule exploration, memory ordering, linearizability,
and sanitizer work to `race-condition-review`.

## Reconciliation invariants

Name an invariant that detects silent convergence failures, such as:

- at most one terminal effect for one operation identity;
- every acknowledged operation has a durable outcome;
- every completed operation has its required result or effect receipt;
- aggregate version never regresses;
- every applied effect has one originating operation;
- immutable ledger entries and derived totals agree;
- stale, conflicting, or gap-blocked work remains visible to a recovery owner.

Record the reconciliation owner, cadence or trigger, repair authority, quarantine path, and maximum
unowned age. Reconciliation is a protocol component, not a dashboard note.

## AI-generated code review

Reject these patterns unless durable evidence closes the named gap:

- a concurrent collection around a multi-step check-then-act operation;
- one atomic field standing in for a multi-field invariant;
- different lock instances guarding the same shared fact;
- a lock held across callbacks, waits, or external I/O without stale-result validation;
- fire-and-forget work with no join, failure, shutdown, or recovery owner;
- an idempotency key generated inside a retry callback;
- cancellation described as rollback;
- timestamps used for latest-wins authority;
- a transaction context assumed to cross a helper or background boundary without connection
  evidence;
- a concurrency test whose operations never actually overlap;
- local lock order that conflicts with another entry point;
- ordinary unit tests or a quiet race detector presented as complete logical-race proof.

## Skill handoffs

- Use `transaction-boundary-integrity-review` for database isolation, lock targets, constraints,
  commit behavior, and full-transaction retries.
- Use `queue-processing-integrity-review` for broker settlement, visibility, rebalance, poison
  messages, ordering configuration, and shutdown drain.
- Use `dual-write-consistency` for independently committed local and external systems.
- Use `race-condition-review` for deterministic interleavings, happens-before evidence, memory
  ordering, linearizability, and schedule replay.
- Use `two-phase-transition-integrity-review` when admission and commit form an explicit durable
  transition protocol with recovery ownership.
- Use `execution-ledger-integrity-review` when attempts, effects, receipts, and terminal outcomes
  require append-only execution truth.
