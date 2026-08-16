---
mustflow_doc: skill.agent-job-control-review
locale: en
canonical: true
revision: 1
lifecycle: mustflow-owned
authority: procedure
name: agent-job-control-review
description: Apply this skill when code is created, changed, reviewed, or reported and an AI-agent-facing job or task system needs review for durable job tables as the source of truth, job ids versus idempotency keys, explicit job state machines, leases and fencing tokens, persistent checkpoints, cancel-request and cancel-complete separation, reconcilers, command-submission control APIs, allowed actions and blocked reasons, command ids with expected state versions, event-cursor status queries, pause and resume semantics, job and attempt separation, or read-versus-control permission separation for agents that submit, inspect, cancel, pause, resume, and retry long-running work.
metadata:
  mustflow_schema: "1"
  mustflow_kind: procedure
  pack_id: mustflow.core
  skill_id: mustflow.core.agent-job-control-review
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

# Agent Job Control Review

<!-- mustflow-section: purpose -->
## Purpose

Review job systems as interfaces that AI agents can safely submit, inspect, cancel, pause, resume,
and retry — not as worker plumbing hidden behind a status string.

The review question is not "does the worker finish the job?" It is "when an agent submits work,
loses the connection, retries, cancels, pauses, or resumes, can the job system keep job intent,
attempts, commands, events, and cursors separate, preserve durable truth, and tell the agent exactly
what it may do next?"

<!-- mustflow-section: use-when -->
## Use When

- Code creates, changes, reviews, or reports a job, task, run, or long-running work system that AI
  agents, automation, or CLI users submit and control.
- A change adds a job table, job status field, queue, worker, lease, checkpoint, cancel, pause,
  resume, retry, command endpoint, status endpoint, event feed, or capability token for job control.
- A review needs proof that an agent can submit work once, inspect it cheaply, cancel or pause it
  safely, resume from a checkpoint, and retry without duplicate side effects.
- A report claims jobs are durable, resumable, cancellable, or agent-controllable.

<!-- mustflow-section: do-not-use-when -->
## Do Not Use When

- The task is primarily append-only execution truth, replay, or audit evidence; use
  `execution-ledger-integrity-review`.
- The task is primarily queue mechanics such as ack, offset, prefetch, DLQ, or redelivery; use
  `queue-processing-integrity-review`.
- The task is primarily duplicate-request safety for a single logical operation; use
  `idempotency-integrity-review`.
- The task is primarily business workflow orchestration across services, sagas, or compensations;
  use `durable-workflow-orchestration`.
- The task is primarily controlling an LLM agent's own executor, planner, or tool-call loop; use
  `agent-execution-control-review`.
- The task is primarily user-facing progress, queue, or recovery UI; use `async-operation-ux-review`.
- The task is primarily capability discovery, machine contracts, or acceptance latency for
  agent-facing CLI and API surfaces; use `agent-facing-interface-review`.
- The task is only a generic CRUD API review without a job state machine or control boundary; use
  `api-misuse-resistance-review`.

<!-- mustflow-section: required-inputs -->
## Required Inputs

- Job intent ledger: job id, idempotency key, normalized input hash, requester, job type, created
  time, and which attempt or command currently owns the outcome.
- State machine ledger: every state, allowed transitions, terminal states, and the code and database
  constraints that enforce them.
- Concurrency ledger: lease model, execution epoch or fencing token, stale-lease recovery, and how
  late worker writes are rejected.
- Checkpoint ledger: resumable units, persisted checkpoints, step effect identities, and
  checkpoint-plus-completion transaction boundaries.
- Command ledger: cancel, pause, resume, retry, and other control commands, their command ids,
  expected state versions, idempotent redelivery, and audit records.
- Status and event ledger: status endpoint shape, allowed actions, blocked reasons, event ids,
  cursors, polling guidance, and streaming options.
- Permission ledger: read versus control scopes, tenant and service-account bounds, capability
  tokens, and audit events per command.
- Existing tests, fixtures, API docs, and configured command intents.

<!-- mustflow-section: preconditions -->
## Preconditions

- The task matches the Use When conditions and does not match the Do Not Use When exclusions.
- Higher-priority instructions and `.mustflow/config/commands.toml` have been checked for the current
  scope.
- Required inputs are available, or missing job, state, lease, checkpoint, command, status, or
  permission evidence can be reported without guessing.
- Agents are treated as callers that retry on timeout, lose connections, and need explicit
  next-action guidance rather than implied state semantics.

<!-- mustflow-section: allowed-edits -->
## Allowed Edits

- Add or tighten job tables as source of truth, job id and idempotency key separation, explicit
  state machines, leases and fencing tokens, persistent checkpoints, cancel-request and
  cancel-complete separation, reconcilers, command-submission APIs, allowed-action responses,
  command ids with expected state versions, event cursors, pause and resume semantics, job and
  attempt separation, and read-versus-control permissions, plus directly synchronized documentation
  or templates owned by the selected boundary.
- Update job, task, and control API docs, examples, tests, and template surfaces that describe the
  same contract.
- Do not add raw queue administration commands, chaos engineering platforms, or new command authority
  under this skill.
- Do not include secrets, raw input payloads, or full logs in status responses or command replies.

<!-- mustflow-section: procedure -->
## Procedure

1. Make the job table the source of truth; treat the queue as a delivery mechanism only.
   - On request, first persist `job_id`, an input reference or normalized digest, requester, state,
     and created time in the database, store the outbox event in the same transaction, and return
     `202 Accepted`. A dispatcher then publishes to the queue, so a database-success-but-queue-loss
     gap disappears. The API does not wait for completion, which keeps acceptance and first response
     within the acceptance-path budget.
2. Never treat the job id as the idempotency key.
   - `job_id` identifies one execution; `idempotency_key` identifies the caller's intent. When a
     network timeout makes the client resend the create request with the same key, return the
     existing job instead of creating a duplicate. When the same key arrives with different input,
     reject with `409 Conflict` instead of creating a new job, and store a normalized input hash to
     make the comparison exact.
3. Model state as a transition machine, not a few booleans.
   - Separate at least `accepted`, `queued`, `running`, `pause_requested`, `paused`,
     `cancel_requested`, `succeeded`, `failed`, `canceled`, and `expired`. Enforce allowed
     transitions in code and database constraints, and make terminal states immutable. Drop
     `is_done`, `is_failed`, and `is_canceled` boolean combinations that can contradict each other.
4. Pair heartbeats with leases and fencing tokens.
   - When a worker takes a job, acquire a lease with a bounded validity and increment
     `execution_epoch`. Every progress, checkpoint, and result write must carry the current
     `execution_epoch`, and the database must reject writes with an older epoch. Without this, a
     zombie worker that appeared stopped can wake up and overwrite the new worker's results.
5. Split work into resumable units and persist checkpoints.
   - Progress numbers alone cannot resume. Persist the last completed file, processed record range,
     created external resources, and applied plan version as checkpoints. Give external API calls
     and file creations per-step effect identities so replay cannot duplicate them, and store the
     checkpoint and the step completion record in the same transaction when possible.
6. Separate cancel requests from cancel completion.
   - A user or agent asking to cancel must not flip the job to `canceled` immediately. Record
     `cancel_requested` first, let the worker stop at a safe point, and only then move to
     `canceled`. If the job entered an irreversible stage such as payment capture or external
     system reflection, refuse the cancel or run compensation, and return a machine-readable code
     for whether cancel is currently possible and why not.
7. Trust a reconciler over worker discipline.
   - In operation, the queue, database, or a worker will die. Run a periodic reconciler that finds
     jobs stuck in `accepted`, `running` jobs with expired leases, `succeeded` jobs without results,
     and jobs past their retry budget, and returns them to a normal flow. Job-system stability comes
     from automatically finding and repairing failed states, not from workers never failing.
8. Expose control as command submission, not state mutation.
   - Do not let `PATCH /jobs/{id}` set `state` to `canceled` or `running`. Provide
     `POST /jobs/{id}/commands` with `cancel`, `pause`, `resume`, and `retry` commands. The server
     validates each command, issues a separate `command_id`, and separates command acceptance from
     command completion because a control command can itself take time.
9. Tell the agent what it may do next instead of making it guess.
   - Status responses must include `allowed_actions`, `blocked_reason`, `retryable`,
     `next_poll_after_ms`, `latest_checkpoint`, and `state_version`. Some running jobs can be
     cancelled and some cannot; the API declares the difference so agents stop mis-retrying and
     polling forever.
10. Require a command id and expected state version on every control command.
    - Agents resend after network errors, so each command carries a unique `command_id` and a
      redelivered id returns the existing command result. Accept `expected_state_version` and block
      commands sent from stale information; when state changed, return `409 Conflict` with the
      current state, version, and available commands.
11. Make status queries event-cursor based instead of full-object polls.
    - Polling the whole job object every second doubles call and token cost. Issue a per-job
      incrementing `event_id` and let `after_event_id` fetch only new changes. When latency allows,
      offer Long Polling or SSE that holds the connection until a change, and let a reconnecting
      agent resume from its last event cursor.
12. Do not implement pause or resume by freezing the worker process.
    - `pause` records `pause_requested`; the worker saves a safe checkpoint and moves to `paused`.
      `resume` does not wake an old process; it issues a new `attempt_id` and `execution_epoch` and
      restarts from the checkpoint. The API must state whether a job without a checkpoint restarts
      from scratch or does not support resume.
13. Separate jobs from attempts to preserve retry history.
    - Rewinding a failed job to `running` erases the failed execution. A job is the caller's intent;
      an attempt is one real execution. Retry creates a new `attempt_id` under the same `job_id`,
      and each attempt records failure stage, error code, starting checkpoint, worker version, cost,
      and runtime. Distinguish full retry from retry-from-failed-stage.
14. Separate read and control permissions and audit every command.
    - A UUID job id is not access control. Split `job.read`, `job.cancel`, `job.pause`, `job.resume`,
      and `job.retry` scopes and check tenant, user, and service-account bounds. For agents, issue
      short-lived capability tokens limited to the needed jobs and actions. Record actor, reason,
      previous state, resulting state, and command id for every control command.

<!-- mustflow-section: postconditions -->
## Postconditions

- Job intent, attempts, commands, events, and cursors are separate concepts with separate identity.
- The job table is the durable source of truth; state transitions, leases, checkpoints, and
  reconciler recovery are explicit.
- Control commands, allowed actions, command ids, expected state versions, and event cursors are
  explicit so agents can act without guessing.
- Read and control permissions are separated, and every command is audited.
- Agent-job-control claims are backed by configured tests, state-machine evidence, or labeled as
  manual-only or missing.

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

Prefer the narrowest configured tests that prove idempotency-key reuse and conflict, allowed state
transitions, lease expiry and fencing rejection, checkpoint resume, cancel-request versus
cancel-complete, reconciler recovery, command id redelivery, expected-state-version conflicts,
event-cursor continuation, and read-versus-control permission separation.

<!-- mustflow-section: failure-handling -->
## Failure Handling

- If job, state, lease, checkpoint, command, status, or permission evidence is missing, report the
  gap instead of claiming the job system is agent-controllable.
- If a job can be mutated through a raw state endpoint or booleans contradict, fix or report it as a
  control-plane defect before other work.
- If a cancel or pause can interrupt an irreversible effect, report the refused or compensated
  stage instead of pretending the command always succeeds.
- If replay or duplicate side effects are possible after retry, use `idempotency-integrity-review`
  or `execution-ledger-integrity-review` before editing that scope.
- If a real secret appears in status responses, command replies, fixtures, logs, or reports, stop
  repeating it and use `secret-exposure-response`.

<!-- mustflow-section: output-format -->
## Output Format

- Agent job control reviewed
- Job, attempt, command, event, and cursor separation findings
- State machine and transition findings
- Lease, fencing, checkpoint, cancel, and reconciler findings
- Control API, allowed-action, command-id, and event-cursor findings
- Pause, resume, retry, and job-versus-attempt findings
- Read-versus-control permission and audit findings
- Fixes made or recommendation
- Tests or behavior evidence
- Command intents run
- Skipped checks and reasons
- Remaining agent-job-control risk
