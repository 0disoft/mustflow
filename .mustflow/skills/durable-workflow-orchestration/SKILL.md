---
mustflow_doc: skill.durable-workflow-orchestration
locale: en
canonical: true
revision: 1
lifecycle: mustflow-owned
authority: procedure
name: durable-workflow-orchestration
description: Apply this skill when one business outcome spans multiple commands, persisted entities, services, callbacks, timers, approvals, retries, or compensations and must resume after process loss or deployment through a versioned durable workflow instance.
metadata:
  mustflow_schema: "1"
  mustflow_kind: procedure
  pack_id: mustflow.core
  skill_id: mustflow.core.durable-workflow-orchestration
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

# Durable Workflow Orchestration

<!-- mustflow-section: purpose -->
## Purpose

Own long-running progress across several transaction and resource boundaries. Make workflow state,
waits, retries, compensation, forward recovery, resume compatibility, and operator intervention
durable without pretending external effects can be rolled back like one database transaction.

<!-- mustflow-section: use-when -->
## Use When

- One business goal crosses two or more commands, persisted entities, services, or providers.
- The flow waits for callbacks, timers, approvals, retries, leases, or human intervention.
- A process restart or deployment must resume the exact safe step without repeating completed
  external effects.
- The design uses a saga, process manager, workflow instance, durable checkpoint, compensation, or
  manual-recovery state.

<!-- mustflow-section: do-not-use-when -->
## Do Not Use When

- One accepted intent and local commit boundary is the whole operation; use `command-pattern`.
- One entity transition table owns the lifecycle; use `state-machine-pattern`.
- The main failure is a database-and-publish split; use `dual-write-consistency`.
- The main failure is queue settlement, duplicate logical delivery, or child-task lifetime; use
  `queue-processing-integrity-review`, `idempotency-integrity-review`, or
  `structured-concurrency-supervision-review` respectively.
- LLM autonomy, tool choice, or approval of model-directed work is the main concern; use
  `agent-execution-control-review` and apply this skill only to the durable workflow underneath it.
- An order with one local `PENDING -> PAID -> SHIPPED` transition table is not automatically a
  durable workflow. A callback-driven payment and fulfillment process across checkpoints is.

<!-- mustflow-section: required-inputs -->
## Required Inputs

- Workflow identity and definition-version ledger.
- Step ledger: input snapshot, command ID, dependency, deadline, attempt, owner, allowed next events,
  and durable completion evidence.
- Effect classification ledger: `reversible`, `compensatable`, `forward-recovery-only`, or
  `manual-intervention`.
- Checkpoint and resume-compatibility ledger for code, state schema, configuration, and policy.
- Compensation ledger linking each compensating command to its original effect and idempotency key.
- Timer, lease, cancellation, late-event, terminal-state, and reconciliation ledgers.

<!-- mustflow-section: preconditions -->
## Preconditions

- Read the nearest instructions, command contract, participating commands and state machines,
  persistence model, queue or timer path, external effects, operator tools, and current tests.
- Name the business outcome and every independently owned participant before designing the workflow.
- Treat a compensation as a new effect with its own failure modes, never as time reversal.

<!-- mustflow-section: allowed-edits -->
## Allowed Edits

- Add or tighten workflow instances, step records, checkpoints, timers, leases, compensation
  commands, resume compatibility, cancellation, manual-intervention, reconciliation, tests, metrics,
  docs, and directly synchronized templates.
- Keep individual command payloads and entity transition rules in their owning command and state
  machine layers.
- Do not serialize arbitrary runtime objects, closures, clients, credentials, hidden reasoning, or
  raw conversations as workflow state.

<!-- mustflow-section: procedure -->
## Procedure

1. State the business outcome and list each participant, transaction boundary, external effect, wait,
   callback, timer, and operator decision.
2. Check whether one command or one entity state machine is sufficient. Do not introduce a durable
   workflow for a local sequence that cannot survive or need process loss.
3. Create a stable workflow instance ID and pin the workflow definition, state schema, code,
   configuration, and policy versions required for safe resume.
4. Record each step's normalized input snapshot, command identity, dependency, deadline, attempt,
   owner, next permitted events, and durable completion evidence.
5. Persist step completion and the next durable work request atomically where possible. Route any
   independent commit split through `dual-write-consistency`.
6. Classify every effect as reversible, compensatable, forward-recovery-only, or
   manual-intervention. Do not label email, payment, published data, or external user-visible effects
   rollback-safe without provider-specific proof.
7. Model compensation as a separate idempotent command tied to the original command, resource,
   amount or scope, workflow instance, and reason. Give compensation its own retry and terminal state.
   Use a distinct operation type and idempotency namespace or key for the compensation; never reuse
   the original effect key without an explicit operation discriminator.
8. Store semantic workflow state and ledger positions in checkpoints. Rebuild runtime clients and
   transient caches on resume instead of serializing them.
9. On resume, verify workflow definition, schema, code, configuration, and policy compatibility.
   Migrate, continue under the pinned version, or stop for intervention; never guess through drift.
10. Fence stale owners and reject late callbacks, timers, or completions from an older workflow
    generation or already-closed step.
11. Define cancellation separately from compensation. State which pending work stops, which accepted
    external effects continue, which compensations start, and when cancellation becomes terminal.
12. Preserve partial completion and compensation failure as observable outcomes such as
    `FORWARD_RECOVERY_REQUIRED` or `MANUAL_INTERVENTION`, not generic failure or false rollback.
13. Test restart before and after every step, duplicate and late completion, version drift, timer
    expiry, stale owner, cancellation, compensation failure, reconciliation, and manual resume.
    - This skill owns workflow-step, terminal-state, and compensation-state recovery. Route
      delivery, consumer-application, and projection convergence across independent commits to
      `dual-write-consistency`.

<!-- mustflow-section: postconditions -->
## Postconditions

- Every step has durable identity, owner, state, version, and completion evidence.
- Resume does not silently replay an already completed external effect.
- Every reachable branch terminates as succeeded, compensated, forward-recovery-required,
  cancelled with declared residual effects, or manual-intervention.
- Workflow orchestration does not replace command, state-machine, delivery, ledger, or policy owners.

<!-- mustflow-section: verification -->
## Verification

- Use configured `changes_status` and `changes_diff_summary` for scope evidence.
- Use `lint`, `build`, and `test_related` for implementation and restart fixtures; use `test` or
  `test_audit` when orchestration is shared or test coverage claims are broad.
- Use `docs_validate_fast`, `test_release`, and `mustflow_check` for public, package, template, or
  Mustflow changes.
- Report unavailable multi-process, deployment-resume, clock, provider, or operator evidence rather
  than replacing it with raw commands.

<!-- mustflow-section: failure-handling -->
## Failure Handling

- If participant ownership or compensation semantics are unknown, stop workflow expansion and list
  the missing business decisions.
- If resume compatibility is unprovable, preserve the run under manual intervention rather than
  loading it into new code optimistically.
- If compensation can fail without a terminal recovery path, report the workflow as incomplete.
- If a configured check fails, preserve the workflow state and failure boundary, then use
  `failure-triage` before broadening the edit.

<!-- mustflow-section: output-format -->
## Output Format

- Workflow goal, instance identity, definition version, participants, and boundaries
- Step, checkpoint, timer, lease, cancellation, and resume decisions
- Effect classifications, compensation commands, and terminal outcomes
- Restart, duplicate, late-event, drift, compensation, and manual-recovery evidence
- Files changed and compatibility impact
- Command intents run, skipped checks, and remaining durable-workflow risk
