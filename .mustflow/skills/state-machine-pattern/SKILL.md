---
mustflow_doc: skill.state-machine-pattern
locale: en
canonical: true
revision: 4
lifecycle: mustflow-owned
authority: procedure
name: state-machine-pattern
description: Apply this skill when domain objects, jobs, external API calls, uploads, webhooks, or processing workflows have lifecycle state, deletion or restore flow, allowed actions depend on state, status changes are scattered, or state transitions need explicit events, guards, effects, history, idempotency, retry, reconciliation, and concurrency control.
metadata:
  mustflow_schema: "1"
  mustflow_kind: procedure
  pack_id: mustflow.core
  skill_id: mustflow.core.state-machine-pattern
  command_intents:
    - changes_status
    - changes_diff_summary
    - test_related
    - test
    - lint
    - build
    - docs_validate_fast
    - test_release
    - mustflow_check
---

# State Machine Pattern

<!-- mustflow-section: purpose -->
## Purpose

Keep lifecycle state changes in one explicit rule system.

The state machine pattern applies when an entity moves through meaningful lifecycle states and the allowed actions, errors, follow-up work, or audit expectations depend on the current state. The core artifact is not a class hierarchy. The core artifact is the transition table: current state, event, guard, next state, and effects as data.

Use this skill to prevent scattered `if`, `switch`, direct assignment, silent no-op transitions, duplicate webhook damage, and state changes that bypass audit, outbox, or concurrency rules.

<!-- mustflow-section: use-when -->
## Use When

- A domain object has three or more states, or fields named `status`, `state`, `phase`, `step`, or `stage`.
- State determines which actions, API calls, buttons, jobs, events, or commands are allowed.
- The lifecycle includes cancel, approve, reject, expire, retry, fail, refund, suspend, restore, archive, delete, publish, ship, or deliver flows.
- Delete, restore, purge, archive, deprecate, redirect, suspend, unsubscribe, revoke, or anonymize behavior has different access, retention, audit, search, support, or recovery consequences.
- State changes must produce history, audit records, domain events, outbox messages, or external effects.
- Multiple users, workers, queues, webhooks, or external systems can attempt transitions on the same entity.
- External service results change state and require pending, success, and failure states.
- Jobs, outbox deliveries, webhook processing, external API calls, AI processing, email delivery, imports, exports, or file conversions need queued, running, retrying, succeeded, failed, dead-letter, or unknown/reconciliation states.
- File uploads, asset processing, image resizing, virus scanning, document conversion, private download readiness, or storage deletion have pending, uploaded, processing, ready, failed, deleted, or purged states.
- Code repeatedly asks whether an action is possible from the current state.
- State rules are scattered across handlers, repositories, jobs, UI code, adapters, SQL queries, or broad services.
- Several booleans actually encode one lifecycle and can create impossible combinations.

<!-- mustflow-section: do-not-use-when -->
## Do Not Use When

- The value is simple display state rather than domain lifecycle state.
- The state is a simple two-value toggle with no lifecycle rules, history, side effects, concurrency risk, or irreversible transition.
- State does not affect allowed actions.
- The code is a pure calculation, formatter, mapper, parser, or local UI-only state update.
- A simple create, read, update, delete flow only distinguishes active and deleted and has no meaningful transition rules, recovery behavior, retention behavior, or audit need.

Two states can still require this skill when the lifecycle is meaningful, such as active to suspended to deleted, deleted being irreversible, or suspension requiring audit and authorization.

<!-- mustflow-section: required-inputs -->
## Required Inputs

- The entity and state field under change.
- Complete state list and which states are terminal.
- Complete event list and the facts each event carries.
- Current places that change state, validate actions, check state, or render available actions.
- Guards, authorization facts, time facts, external facts, and loaded domain data needed to decide transitions.
- Effects, domain events, outbox records, audit records, transition history, idempotency keys, and concurrency protections required by the lifecycle.
- Retry and reconciliation rules, including which states can retry, which states are terminal, which states require manual review, and which external outcomes are unknown rather than failed.
- Existing local patterns for `Result`, events, outbox, repositories, command handlers, pure core decisions, transition tables, tests, and documentation.
- Relevant command-intent contract entries for verification.

<!-- mustflow-section: preconditions -->
## Preconditions

- Higher-priority instructions and `.mustflow/config/commands.toml` have been checked for the current scope.
- If changing existing behavior is not the goal, current behavior is protected with tests, fixtures, examples, or explicit verification evidence.
- If the state-changing operation is a user or system command, `command-pattern` has been used for payload, context, authorization, transaction, idempotency, audit, retry, and outbox execution.
- If the transition decision is mixed with I/O, `pure-core-imperative-shell` has been used so the transition function stays deterministic and the shell handles persistence and effects.
- If expected failures or meaningful absence are involved, `result-option` has been used for the error and absence shape.
- If external services or provider responses influence transitions, `adapter-boundary` and `dependency-injection` have been used before provider facts enter the transition function.

<!-- mustflow-section: allowed-edits -->
## Allowed Edits

- Add or update state unions, event unions, transition tables, guard functions, effect descriptions, transition result types, and state-machine errors.
- Replace direct state assignment with a transition function.
- Add dispatch or shell code that loads the entity, applies the pure transition, saves state, records transition history, stores idempotency records, and writes outbox rows in one transaction.
- Add available-action helpers derived from the transition table when UI or API callers need possible actions.
- Add tests for valid transitions, invalid transitions, guard success and failure, terminal states, generated effects, duplicate events, concurrency conflicts, and transition history.
- Add lifecycle documentation or diagrams only when this repository already documents domain state machines or the changed domain needs an operational reference.
- Do not create a class hierarchy just to represent states.
- Do not duplicate the server state machine in UI logic.

<!-- mustflow-section: procedure -->
## Procedure

1. Decide whether the lifecycle warrants a state machine.
   - Apply it when state controls allowed actions, external work, audit, retries, concurrency, or long-running lifecycle behavior.
   - Avoid it for simple display values and toggles without transition rules.
2. Replace boolean clusters with explicit state.
   - Convert combinations such as `isPaid`, `isCancelled`, `isShipped`, and `isRefunded` into one lifecycle state or several independent state machines.
   - Make states mutually exclusive within one state machine.
3. Name states by domain meaning.
   - Prefer states such as `DRAFT`, `PENDING_REVIEW`, `APPROVED`, `PAYMENT_PENDING`, `PAID`, `FULFILLMENT_PENDING`, `SHIPPED`, `DELIVERED`, `CANCELLED`, `REFUND_PENDING`, `REFUNDED`, `EXPIRED`, or `ARCHIVED`.
   - For deletion-like lifecycles, distinguish states such as `ACTIVE`, `ARCHIVED`, `DEPRECATED`, `PRIVATE`, `SOFT_DELETED`, `PURGE_PENDING`, `PURGED`, `REDIRECTED`, `GONE`, `SUSPENDED`, and `ANONYMIZED` when those states differ in visibility, recovery, retention, indexing, or legal meaning.
   - For uploaded assets, distinguish states such as `PENDING_UPLOAD`, `UPLOADED`, `SCANNING`, `PROCESSING`, `READY`, `FAILED`, `DELETE_PENDING`, and `DELETED` when storage, scanning, conversion, visibility, cleanup, or download access differs.
   - Avoid UI or placeholder names such as `STEP_1`, `STEP_2`, `BUTTON_DISABLED`, `GRAY`, `READY2`, `TEMP`, and broad states such as `PROCESSING` when a more specific waiting state exists.
4. Name events as facts that happened.
   - Prefer events such as `PAYMENT_STARTED`, `PAYMENT_SUCCEEDED`, `PAYMENT_FAILED`, `CANCEL_REQUESTED`, `REFUND_APPROVED`, `SHIPMENT_CREATED`, `DELIVERY_CONFIRMED`, `TIMEOUT_REACHED`, and `EMAIL_VERIFIED`.
   - Avoid command-like or meaningless events such as `SET_STATUS`, `CHANGE_STATUS`, `UPDATE_STATE`, `MAKE_ACTIVE`, `NEXT`, and `UPDATE`.
   - Distinguish commands from events: commands request work, events record what happened.
5. Write the transition table first.
   - Include every source state, allowed event, guard name, target state, and effect description.
   - Include terminal states explicitly with no outgoing transitions when they are truly terminal.
   - Do not hide transition rules inside handler branches, repository filters, database queries, adapter code, or UI code.
   - Do not let direct `deleted_at` assignment bypass allowed archive, soft-delete, restore, purge, anonymize, or redirect transitions when deletion is a meaningful lifecycle.
6. Keep guards pure.
   - Guards may inspect entity state, event data, context facts, loaded external facts, current time passed through context, and authorization facts passed through context.
   - Guards must not query databases, call SDKs, send messages, write logs, mutate state, read current time directly, generate random values, or trigger external work.
   - If a guard needs an external fact, load it before transition and pass the normalized fact through context.
7. Model external work with pending, success, and failure events.
   - Do not jump directly from request to success for payment, refund, shipment, email, file processing, AI processing, or other external operations.
   - Use states such as `PAYMENT_PENDING`, `REFUND_PENDING`, `FULFILLMENT_PENDING`, or `ANALYSIS_PENDING`, then model provider success and failure as separate events.
   - For files, model upload URL issuance, upload confirmation, scan success or failure, variant generation, ready publication, failed retry, and storage deletion as separate events when those steps can fail independently.
   - For jobs and outbox delivery, model queued, claimed or running, retry scheduled, succeeded, failed, and dead-letter or manual-review states when attempts and worker ownership matter.
   - For provider mutations, model unknown completion separately from failure. An unknown state means the provider call may have succeeded and must be reconciled before another attempt can safely run.
8. Model time as events.
   - Expiration, scheduled cancellation, automatic approval, automatic archive, retry window elapsed, and timeout should enter the state machine as events.
   - Do not scatter direct time checks that assign state outside the transition function.
9. Keep transition functions pure.
   - Inputs are entity, event, and context.
   - Success returns previous state, next state, updated entity or patch, transition log data, domain events, and effect descriptions.
   - Failure returns a typed error such as invalid transition, guard failed, concurrent transition, or duplicate event conflict.
   - The pure transition function must not persist, publish, send, call providers, log, read environment variables, read current time directly, or mutate external state.
10. Separate transition from persistence and effects.
    - Application or shell code loads the entity, calls the pure transition, and persists the result.
    - State update, version update, transition log, processed event record, and outbox record should be saved in one transaction when the state is durable.
    - External effects should run after commit through an outbox, pending effect table, queue, or worker.
11. Protect durable state with concurrency control.
    - Use optimistic version checks, compare-and-swap saves, unique constraints, row locks, or conditional updates.
    - If another transition wins first, return a conflict, reload and recompute, or enqueue a domain-specific retry only when that policy is explicit.
12. Make duplicate events safe.
    - Include idempotency keys, provider event identifiers, webhook identifiers, command identifiers, or an equivalent deduplication key.
    - Same key and same payload should return the prior result.
    - Same key and different payload should return a duplicate conflict.
    - Different key with an impossible current state should return invalid transition rather than silently succeeding.
    - Duplicate queued jobs, webhook callbacks, provider events, and slow worker completions should either return the already-applied transition, conflict on changed payload, or be ignored as stale by version or expected-state checks.
13. Record transition history when the lifecycle matters operationally.
    - History should include entity type, entity identifier, from state, event type, to state, actor identifier when known, idempotency key, payload hash, reason when safe, and timestamp from context.
    - Use transition history for debugging, customer support, dispute handling, audit, and security review.
    - Deletion and restore history should include actor, reason, recovery or purge deadline, and whether personal data was anonymized, hard-deleted, retained, or separated from the business record.
14. Derive available actions from the state machine.
    - UI or API layers may display available actions, but they must not own an independent copy of transition rules.
    - Prefer a server-side helper that evaluates possible events or exposes allowed actions derived from the transition table.
    - Treat UI checks as guidance only. Server transition validation remains authoritative.
15. Split state machines when one state string explodes.
    - If payment, fulfillment, refund, moderation, or account status change independently, use separate state machines.
    - State-machine splits require explicit cross-machine invariants, such as fulfillment not shipping before payment succeeds.
    - Put cross-machine coordination in a domain service, command handler, workflow, or pure policy that calls the smaller machines.
16. Document only the useful lifecycle contract.
    - For important domains, document state list, event list, transition table, terminal states, guards, effects, concurrency method, duplicate-event handling, and any cross-machine invariants.
    - Diagrams are secondary. The code transition table is the source of truth.
17. Test from the transition table.
    - Test every valid transition.
    - Test representative invalid transitions, especially terminal states and dangerous skipped states.
    - Test guard success and guard failure separately.
    - Test that successful transitions produce the expected effects or outbox descriptions.
    - Test that failed transitions produce no effects.
    - Test duplicate events, duplicate conflicts, transition history, and concurrency behavior when the state is persisted.

<!-- mustflow-section: postconditions -->
## Postconditions

- State cannot be changed outside the transition function or dispatch path.
- Every allowed transition is visible in one transition table.
- Impossible transitions return explicit errors instead of being ignored.
- Guards are pure and external facts are passed through context.
- External work is represented through pending, success, and failure events, with effects executed after persistence.
- Retryable work, dead-letter states, and unknown provider outcomes are represented explicitly when external work can be repeated or ambiguous.
- Durable state transitions use concurrency control and duplicate-event handling when needed.
- Important lifecycle changes leave transition history and outbox or effect records.
- Tests cover the transition table and the highest-risk invalid, duplicate, and concurrent paths.

<!-- mustflow-section: verification -->
## Verification

Use configured oneshot command intents when available:

- `changes_status`
- `changes_diff_summary`
- `test_related`
- `test`
- `lint`
- `build`
- `docs_validate_fast`
- `test_release`
- `mustflow_check`

Choose the narrowest configured verification that covers the changed state machine, dispatch path, tests, templates, docs, release metadata, and mustflow routing.

<!-- mustflow-section: failure-handling -->
## Failure Handling

- If states or events are unknown, stop and list the missing lifecycle decisions before coding.
- If direct assignment remains outside the transition path, report the remaining bypass or finish removing it before claiming the state machine is enforced.
- If a guard needs I/O, move the I/O to the shell and pass the result as context.
- If external effects cannot be made reliable through outbox, pending actions, provider idempotency, or compensation, report the reliability gap.
- If duplicate-event handling is missing for webhook, queue, payment, refund, or worker flows, do not call the transition safe to retry.
- If a single state machine is becoming unreadable, split independent lifecycle dimensions and document cross-machine invariants.

<!-- mustflow-section: output-format -->
## Output Format

- Entity and lifecycle modeled
- States, terminal states, and events introduced or changed
- Transition table location and source-of-truth note
- Guards and context facts
- Effects, outbox, history, idempotency, retry, reconciliation, dead-letter, and concurrency choices
- Direct state assignments removed or remaining bypasses
- Tests or verification evidence
- Skipped checks and remaining state-machine risk
