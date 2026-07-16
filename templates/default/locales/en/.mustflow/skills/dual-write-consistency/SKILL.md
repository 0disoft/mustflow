---
mustflow_doc: skill.dual-write-consistency
locale: en
canonical: true
revision: 1
lifecycle: mustflow-owned
authority: procedure
name: dual-write-consistency
description: Apply this skill when one logical operation changes durable state and separately publishes, projects, calls, or writes to another independently committed system, including database-plus-broker outbox or inbox flows, CDC, relay workers, event application ledgers, split outcomes, eventual convergence, reconciliation, and crash-point verification.
metadata:
  mustflow_schema: "1"
  mustflow_kind: procedure
  pack_id: mustflow.core
  skill_id: mustflow.core.dual-write-consistency
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

# Dual Write Consistency

<!-- mustflow-section: purpose -->
## Purpose

Keep one logical result truthful when it crosses independently committed databases, brokers,
indexes, files, or providers. Own the delivery and convergence protocol; do not pretend two commits
are one transaction or that broker delivery alone proves business convergence.

<!-- mustflow-section: use-when -->
## Use When

- A durable mutation and an event publish, projection update, webhook, provider mutation, or second
  store write belong to one logical outcome but cannot commit atomically.
- Code introduces an outbox, inbox, relay, CDC stream, publisher claim, applied-event ledger,
  reconciliation worker, or eventual-convergence claim.
- The path can crash between local commit, publish acceptance, publish recording, consumer effect,
  consumer commit, and broker acknowledgement.

<!-- mustflow-section: do-not-use-when -->
## Do Not Use When

- One database transaction with no independent commit boundary owns the whole invariant; use
  `transaction-boundary-integrity-review`.
- The main failure is one logical request repeating; use `idempotency-integrity-review`.
- The main failure is broker acknowledgement, visibility, prefetch, poison-message, or DLQ behavior;
  use `queue-processing-integrity-review`.
- The path is an old/new schema migration dual-write; use `migration-safety-check`.
- The path is a multi-step resumable saga with waits or compensation; use
  `durable-workflow-orchestration`.
- Two writes happen in one local transaction, such as an order row and its audit row. That is not a
  dual write merely because two tables changed.

<!-- mustflow-section: required-inputs -->
## Required Inputs

- Consistency-surface ledger: authoritative mutation, derived destinations, and every independent
  commit boundary.
- Identity ledger: operation, event, causation, correlation, aggregate, ordering, payload hash, and
  schema-version identities.
- Outbox and inbox ledger: unique keys, states, owner, claim lease, attempts, timestamps, and stale
  claim recovery.
- Delivery ledger: producer confirmation, consumer transaction, acknowledgement position,
  duplication, ordering, and redelivery contract.
- Convergence ledger: acceptable lag, drift detector, reconciliation owner, repair direction, and
  operator-visible terminal or unresolved state.
- Failure-injection ledger: expected durable state after every crash boundary.

<!-- mustflow-section: preconditions -->
## Preconditions

- Read the nearest instructions, command contract, source-of-truth model, producer, consumer,
  persistence schema, and retry or replay paths.
- Name one authoritative fact and every derived fact. If authority is peer-to-peer or bidirectional,
  define conflict resolution before implementation.
- Treat provider, broker, and database guarantees as unverified until matched to the configured
  code path and current deployment contract.

<!-- mustflow-section: allowed-edits -->
## Allowed Edits

- Add or tighten outbox, inbox, applied-event, relay-claim, delivery-state, drift-detection,
  reconciliation, repair-command, and focused crash-injection surfaces.
- Synchronize event envelopes, schemas, migrations, tests, docs, metrics, and templates that own the
  same convergence contract.
- Do not hide split outcomes behind a broad transaction wrapper, memory-only flag, best-effort log,
  or broker exactly-once marketing claim.

<!-- mustflow-section: procedure -->
## Procedure

1. Draw the logical operation and every independent commit boundary.
2. Choose the source of truth and label each destination authoritative, derived, cached, indexed,
   externally owned, or observational.
3. Put the authoritative mutation and outgoing intent record in one local transaction when that
   store supports it. If not, name the unavoidable gap and repair protocol.
4. Give each logical event a stable ID, causation ID, correlation ID, aggregate or ordering key,
   payload hash, and schema version required by its consumers.
5. Make relay claims durable and bounded. Record owner, lease or generation, attempt, next eligible
   time, and stale-claim recovery; a process-local lock is not ownership proof.
6. Treat a crash after publish but before publish-success recording as duplicate-possible. Resume by
   identity and confirmation or reconciliation, not by assuming the publish failed.
7. Put the consumer inbox or applied-event unique constraint and irreversible business effect in one
   transaction when possible. An application-level `if exists` is not durable uniqueness.
8. Separate per-aggregate ordering from globally unordered delivery. Reject or defer stale events
   when state depends on sequence; make commutative consumers explicit when order is irrelevant.
9. Preserve original identity through poison classification, schema rejection, DLQ transfer, and
   replay. A replay creates a new attempt, not a new logical event.
10. Define reconciliation for missing, duplicate, stale, unknown, and divergent states. State which
    side wins, which repair command runs, who approves destructive repair, and how convergence is
    rechecked.
    - This skill owns delivery, consumer-application, and projection convergence across independent
      commits. Route workflow-step, terminal-state, and compensation-state recovery to
      `durable-workflow-orchestration`.
11. Distinguish transport settlement, consumer commit, business convergence, and operator closure.
    Do not report one as proof of the next.
12. Inject crashes after local commit, before and after publish, after consumer effect, after consumer
    commit, and before acknowledgement. Also test duplicate, reordered, poison, stale-lease, and DLQ
    replay paths.

<!-- mustflow-section: postconditions -->
## Postconditions

- Every crash point leaves the operation durably pending, duplicate-safe, reconciliable, or
  explicitly unresolved; no state silently disappears.
- Relay and consumer ownership, event application, and repair are protected by durable identities,
  constraints, leases or generations, and bounded retries.
- Outbox-only implementations do not claim completion without consumer duplicate control and a
  reconciliation story.
- Evidence distinguishes local commit, delivery, application, convergence, and closure.

<!-- mustflow-section: verification -->
## Verification

- Use configured `changes_status` and `changes_diff_summary` for scope evidence.
- Use `lint`, `build`, and `test_related` for changed implementation and focused crash paths; use
  `test` or `test_audit` when shared reliability coverage or test claims require it.
- Use `docs_validate_fast`, `test_release`, and `mustflow_check` when contracts, templates, package
  output, or Mustflow surfaces change.
- Record unavailable broker, multi-process, chaos, or live-provider evidence instead of inventing
  commands or approving a static claim as runtime proof.

<!-- mustflow-section: failure-handling -->
## Failure Handling

- If the source of truth or repair direction is unknown, stop convergence edits and report the
  conflicting authorities.
- If one split outcome cannot be detected, preserve it as an explicit unknown state and add an
  operator repair boundary before claiming safety.
- If an implementation relies only on an outbox, broker exactly-once mode, Redis TTL, logs, or an
  application check, report the missing durable consumer or reconciliation proof.
- If verification fails, preserve the crash point and invariant, then use `failure-triage` before
  broadening the change.

<!-- mustflow-section: output-format -->
## Output Format

- Logical operation, source of truth, and independent commit boundaries
- Event identity, outbox, relay, inbox, ordering, settlement, and convergence decisions
- Crash, duplicate, stale-owner, poison, replay, and reconciliation evidence
- Files changed and compatibility impact
- Command intents run, skipped checks, and reasons
- Remaining split-brain or convergence risk
