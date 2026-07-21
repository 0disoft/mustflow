---
mustflow_doc: skill.agent-planning-recovery-review
locale: en
canonical: true
revision: 1
lifecycle: mustflow-owned
authority: procedure
name: agent-planning-recovery-review
description: Apply this skill when a long-running LLM agent or agentic workflow needs a stable global goal, constraints, milestones, dependency graph, irreversible checkpoints, a short rolling plan, event-triggered replanning, compact context reconstruction, deterministic replay, or safe recovery across interruptions and unknown effects.
metadata:
  mustflow_schema: "1"
  mustflow_kind: procedure
  pack_id: mustflow.core
  skill_id: mustflow.core.agent-planning-recovery-review
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

# Agent Planning Recovery Review

<!-- mustflow-section: purpose -->
## Purpose

Keep long-horizon agent work stable without freezing a detailed plan that becomes wrong or
replanning every step until the goal drifts. Preserve a fixed global contract and dependency graph,
execute from a short evidence-bounded plan, and rebuild current state from durable events after
interruptions.

<!-- mustflow-section: use-when -->
## Use When

- An agent task spans many steps, tools, milestones, context windows, process restarts, approvals,
  callbacks, or external effects.
- The design chooses between up-front plans, rolling plans, replanning triggers, dependency DAGs,
  irreversible checkpoints, prompt compaction, snapshots, event logs, or resume behavior.
- A restart or context rebuild must distinguish completed, pending, failed, unknown, compensated,
  and superseded work without asking a model to reconstruct truth from prose.
- A replan must preserve the identity of an already admitted business effect while allowing a new
  execution attempt or plan version.

<!-- mustflow-section: do-not-use-when -->
## Do Not Use When

- The main problem is deterministic service orchestration, timers, callbacks, saga state, or
  compensation with no LLM planning; use `durable-workflow-orchestration`.
- The main problem is generic run, attempt, checkpoint, effect, receipt, or replay truth; use
  `execution-ledger-integrity-review`.
- The main problem is tool authority, approval, capability, or side-effect risk inside one plan; use
  `agent-execution-control-review`.
- The main problem is persistent user memory or context admission; use
  `agent-memory-context-governance-review`.

<!-- mustflow-section: required-inputs -->
## Required Inputs

- Global contract: goal, non-goals, invariants, constraints, acceptance criteria, milestones,
  dependency DAG, risk limits, irreversible checkpoints, stop conditions, and human owner.
- Rolling-plan ledger: plan ID and version, current horizon, selected steps, dependency and evidence
  for each step, expected observation, effect class, approval boundary, and replan trigger.
- Event contract: workflow ID, sequence, event type and schema version, plan and step IDs, effect and
  attempt IDs, causation and correlation IDs, payload reference, authoritative time, and redaction.
- Projection contract: reducer version, snapshot schema, cursor, rebuild procedure, consistency rule,
  unknown-effect set, derived prompt view, and artifact references.
- Recovery contract: replay boundary, pending and UNKNOWN reconciliation, lease or fence, version
  compatibility, safe replan point, compensation owner, and manual-review state.

<!-- mustflow-section: preconditions -->
## Preconditions

- Define the authoritative business goal and irreversible effects before selecting a planning
  algorithm or context size.
- Treat prompt text, summaries, and model reasoning as temporary views, not durable workflow truth.
- Keep command execution under `.mustflow/config/commands.toml`; this skill does not authorize live
  workers, background loops, model calls, external effects, or production replay.

<!-- mustflow-section: allowed-edits -->
## Allowed Edits

- Add or refine global-plan schemas, milestone DAGs, rolling-plan records, replan triggers, event
  envelopes, reducers, projections, snapshots, prompt-view builders, effect identity, recovery,
  reconciliation, tests, docs, route metadata, and synchronized templates.
- Move state derivation, dependency checks, event ordering, effect reconciliation, and invariant
  validation into deterministic code where possible.
- Do not persist free-form chain-of-thought as workflow state or require it for replay.
- Do not let a replan create a second effect identity for the same admitted business intent.

<!-- mustflow-section: procedure -->
## Procedure

1. Freeze the global contract, not the detailed route. Keep goal, invariants, constraints,
   acceptance criteria, milestone DAG, irreversible checkpoints, budgets, and stop conditions stable
   until a higher-authority change explicitly versions them.
2. Plan only to the next meaningful uncertainty boundary. Choose the rolling horizon from the next
   unknown observation, dependency uncertainty, irreversible effect, approval point, context budget,
   and recovery cost. Do not copy a universal step count or horizon formula.
3. Give each planned step a precondition, expected observation, effect class, verification, and
   completion predicate. Omit speculative detail that depends on an observation not yet available.
4. Replan on declared events, not on every step and not only on catastrophic failure. Trigger when
   observed state diverges from the plan, a new unknown appears, a tool fails or returns UNKNOWN, a
   milestone completes, an invariant changes, or the next step crosses an irreversible boundary.
5. Keep one append-only event stream authoritative. Record business intent and observed facts with
   ordered sequence and schema version. Derive snapshots, dashboards, summaries, and prompt context
   from the stream rather than editing them as competing truth.
6. Separate identifiers:
   - keep `workflow_id` stable for the business workflow;
   - identify the logical planned unit with `step_id` and the plan revision with `plan_id` or
     `plan_version`;
   - keep `effect_id` stable across replans for the same business intent;
   - create a new `attempt_id` for each execution try.
7. Persist effect intent before commitment. Bind the effect to tenant, actor, target, operation type,
   canonical request fingerprint, approval, and policy. Use durable uniqueness and idempotent result
   replay; route duplicate and stale-write detail to `idempotency-integrity-review`.
8. Treat transport timeout and process loss as UNKNOWN until reconciled. Do not let a replan infer
   failure and issue a second payment, email, publication, mutation, or other side effect.
9. Build snapshots as disposable projections. Store the stream cursor and reducer version, verify
   snapshot integrity, and support rebuilding from the canonical event stream. Use snapshots for
   speed, never as an irreplaceable source of truth.
10. Rebuild prompt context as a temporary view. Include the global goal and invariants, current
    verified snapshot, rolling plan, relevant verified facts, pending and UNKNOWN effects, recent
    failures, and artifact references. Exclude raw logs, obsolete plans, huge tool output, duplicate
    history, secrets, and free-form reasoning.
11. Resume deterministically before invoking a model. Load the compatible reducer, replay events,
    verify sequence and snapshot cursor, reacquire ownership with a lease or fence, and reconcile
    pending or UNKNOWN effects. Only then create a new plan revision.
12. Make compensation a new idempotent effect linked to the original effect. Preserve why exact
    rollback is unavailable and prevent duplicate compensation after retries or replans.
13. Keep external delivery reliable. When durable state and message publication are separate, use a
    transactional outbox or equivalent convergence boundary and idempotent consumers.
14. Test plan drift and recovery, not only happy-path planning. Cover new evidence, tool failure,
    milestone transition, irreversible checkpoint, crash before and after effect commitment,
    timeout with unknown outcome, replay under a compatible reducer, incompatible schema, stale
    owner, replan with stable effect ID, duplicate attempt, and compensation retry.
15. Route generic durable callbacks, timers, saga state, and compensation sequencing to
    `durable-workflow-orchestration`; route event and receipt truth to
    `execution-ledger-integrity-review`; route memory lifecycle to
    `agent-memory-context-governance-review`.

<!-- mustflow-section: postconditions -->
## Postconditions

- The global contract remains stable while rolling plans are short, evidence-bounded, and versioned.
- Replanning is event-triggered and preserves admitted effect identity.
- Append-only events are authoritative; snapshots and prompt context are rebuildable projections.
- Resume performs deterministic replay and effect reconciliation before model planning or mutation.

<!-- mustflow-section: verification -->
## Verification

Use configured oneshot command intents when available: `changes_status`, `changes_diff_summary`,
`lint`, `build`, `test_related`, `test`, `docs_validate_fast`, `test_release`, and `mustflow_check`.
Do not infer raw workflow replay, queue, database, model, worker, or production commands.

<!-- mustflow-section: failure-handling -->
## Failure Handling

- If the event stream has a sequence gap or incompatible schema, stop automatic resume and preserve
  the last verified cursor.
- If an effect outcome is UNKNOWN, reconcile authoritative external state before replan or retry.
- If the reducer needs a model or external call, reject it as nondeterministic recovery logic.
- If a plan change would widen the goal, constraints, permissions, or irreversible effect set,
  require a new global-contract version and the appropriate approval owner.

<!-- mustflow-section: output-format -->
## Output Format

- Global contract, milestones, DAG, and irreversible checkpoints
- Rolling horizon and event-triggered replan decision
- Event, projection, snapshot, prompt-view, and identifier contracts
- Resume, reconciliation, idempotency, outbox, and compensation findings
- Recovery tests and evidence level
- Command intents run and skipped checks
- Remaining agent-planning recovery risk
