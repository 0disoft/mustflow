---
mustflow_doc: skill.agent-execution-control-review
locale: en
canonical: true
revision: 5
lifecycle: mustflow-owned
authority: procedure
name: agent-execution-control-review
description: Apply this skill when autonomous or semi-autonomous LLM agents, agentic workflows, planners, executors, verifiers, runtime-computed tool and transition policies, tool-call gates, risk-tiered approval or interrupt flows, reversible and irreversible effects, durable agent state, handoffs, guardrails, autonomy budgets, retry policies, trace evaluation, or agent outcome metrics are created, changed, reviewed, or reported and the risk is uncontrolled agent behavior.
metadata:
  mustflow_schema: "1"
  mustflow_kind: procedure
  pack_id: mustflow.core
  skill_id: mustflow.core.agent-execution-control-review
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

# Agent Execution Control Review

<!-- mustflow-section: purpose -->
## Purpose

Review agent systems as controlled workbenches, not smarter chat prompts. An agentic path should make bad choices hard by separating workflow selection, planning, execution, verification, tools, risk and reversibility classification, just-in-time approvals, durable state, guardrails, budgets, retries, traces, and outcome evaluation.

<!-- mustflow-section: use-when -->
## Use When

- A change adds, edits, reviews, or reports an autonomous or semi-autonomous LLM agent, agent loop, planner, executor, verifier, evaluator, router, handoff, tool-calling workflow, or long-running AI task runner.
- A task asks whether an AI agent should be a fixed workflow, dynamic agent, prompt chain, routed worker, tool user, human-approved assistant, or multi-step automation.
- Tool definitions, tool names, tool argument schemas, tool-call guards, server-known arguments, tool-result summarization, or unsafe tool execution policies change.
- Code computes which tools, transitions, privileges, retries, or autonomous steps are currently
  available from workflow state, remaining budget, approval, and observed reliability.
- The system can write data, send messages, delete or mutate resources, spend money, call external services, open support tickets, start jobs, or perform any external side effect through model-directed steps.
- Human approval, interrupt or resume behavior, durable checkpoints, state versioning, memory, trace telemetry, loop limits, retry policy, or agent evals affect agent correctness.
- Approval fatigue, over-broad standing permission, approval-to-execution drift, fake undo claims, compensation, delayed commit, policy approval, or independent postcondition verification affects whether an external action is safe.

<!-- mustflow-section: do-not-use-when -->
## Do Not Use When

- The main risk is prompt function boundaries, authority separation, output schema quality, model settings, or eval fixture wording without autonomous control flow; use `prompt-contract-quality-review`.
- The main risk is unsupported factual output, fabricated citations, weak retrieval, claim maps, evidence IDs, or abstain behavior; use `llm-hallucination-control-review`.
- The main risk is token spend, prompt-cache cost, history bloat, RAG context size, model routing cost, reasoning budget, retry replay, or cost observability; use `llm-token-cost-control-review`.
- The main risk is time to first token, first useful output, LLM round trips, tool wait, streaming latency, prompt-cache latency, or user-perceived response speed; use `llm-response-latency-review`.
- The main risk is chat, prompt composer, streaming UI, citation display, progress state, history UX, or manual fallback UI; use `llm-service-ux-review`.
- The main risk is agent eval integrity, trace or trajectory grading, judge-model calibration, final environment state scoring, golden or dirty eval sets, pass@k or pass^k metrics, shadow environments, or production-monitoring-to-eval feedback; use `agent-eval-integrity-review`.
- The main risk is persistent user memory, conversation-history compaction, memory extraction, consolidation, retrieval, supersession, expiry, deletion, or memory-to-context access control; use `agent-memory-context-governance-review`.
- The main risk is packaging model, prompt, tool, policy, retrieval, memory, runtime, and evaluator
  versions into one immutable release and promoting it through replay, shadow, canary, or rollback;
  use `agent-release-bundle-rollout-review`.
- The main risk is balancing a stable global goal with rolling detailed plans, event-triggered
  replanning, deterministic replay, compact prompt reconstruction, and effect identity across
  replans; use `agent-planning-recovery-review`.
- The main risk is selecting, cascading, escalating, or falling back among models by quality, cost,
  latency, verifier result, or distribution shift; use `llm-model-routing-integrity-review`.
- The main risk is deciding whether several production runtime agents beat one and defining worker
  topology, role diversity, artifacts, correlation, and central verification; use
  `agent-runtime-multi-worker-review`.
- The main risk is durable state outside short-lived workers, capability queues, ephemeral
  sandboxes, temporary credentials, or brokered production effects; use
  `agent-runtime-isolation-review`.
- The task coordinates several repository workers or subagents for one coding task rather than designing a product/runtime agent; use `multi-agent-work-coordination`.
- The task is ordinary idempotency, retry, queue, approval, state-machine, or workflow code with no LLM-directed agent behavior; use the narrower integrity or pattern skill first.
- The main problem is non-LLM parent-child lifetime, join, cancellation, deadline, or orphan prevention; use `structured-concurrency-supervision-review`.
- The main problem is deterministic multi-step resume, callback correlation, or compensation; use `durable-workflow-orchestration`.
- The main problem is generic run, attempt, checkpoint, or effect truth; use `execution-ledger-integrity-review`.
- The main problem is reusable allow, deny, limit, downgrade, or obligation evaluation; use `policy-decision-integrity-review`. Keep this skill for agent-specific application of that decision.

<!-- mustflow-section: required-inputs -->
## Required Inputs

- Autonomy ledger: task goal, why a fixed workflow is insufficient, allowed decisions, forbidden decisions, dynamic steps, deterministic steps, stop conditions, and human-owner boundary.
- Policy-graph ledger: authoritative state, allowed transitions, tool preconditions, privilege and
  risk class, remaining capability, cost and harm budgets, approval and consent state, postcondition,
  next-state reducer, and fail-closed behavior when any input is unknown.
- Autonomy-evidence ledger: externally verified decision and postcondition success, harmful-effect
  rate, uncertainty bound, task and risk cohort, sample support, dependency between consecutive
  decisions, checkpoint spacing, and the rule that shortens or stops an autonomous interval.
- Stage gate ledger: requirement extraction, plan, route, tool selection, tool arguments, execution, verification, final response, and which gate can reject or revise each artifact.
- Role separation ledger: planner, executor, verifier, evaluator, deterministic validators, human reviewers, and any self-check limitations.
- Tool contract ledger: tool names, descriptions, argument schema, trusted server-known arguments, model-supplied arguments, unsafe actions, preconditions, postconditions, idempotency key, timeout, partial result, and error states.
- Capability ledger: tenant and resource scope, permitted effects, expiry, call count, token or cost ceiling, attenuation chain, server-known arguments, and the exact policy decision and tool call the capability authorizes.
- Effect ledger: draft versus execute mode, external side effects, database writes, emails, payments, deletes, job starts, queue publishes, cache invalidations, idempotency key source, approval requirement, and side-effect position relative to interrupts.
- Approval and reversibility ledger: meaningful user action, target and audience, scope and count, amount or quota, data sensitivity, privilege level, intent uncertainty, detectability, forced-approval condition, risk tier, exact rollback path, compensating action, irreversible boundary, delay or undo window, approval policy, and escalation owner.
- State and resume ledger: run ID, thread ID, checkpoint store, state schema version, migration or compatibility rule, resume owner, pending side effects, completed side effects, and recovery behavior.
- Planning ledger: global goal, invariants, milestone DAG, irreversible checkpoints, rolling plan,
  replan triggers, plan version, workflow, step, effect and attempt identities, and UNKNOWN-effect
  reconciliation; use `agent-planning-recovery-review` when planning and recovery are primary.
- Release-bundle ledger: immutable bundle ID, model, rendered prompt, tool and policy versions,
  retrieval and memory versions, runtime lock, evaluator, candidate and stable assignment, and
  rollback target; use `agent-release-bundle-rollout-review` when rollout is primary.
- Memory and context ledger: profile, thread state, and evidence cache boundaries, retention, TTL, provenance, access control, and stale-state handling; use `agent-memory-context-governance-review` when persistence or memory admission is the primary risk.
- Handoff and guardrail ledger: router inputs, handoff payload, redacted conversation state, entry guardrails, mid-chain guardrails, tool guardrails, final-output guardrails, and sequential versus parallel block decision.
- Loop, retry, and budget ledger: max steps, max tool calls, max repeated tool calls, max retries, token budget, cost budget, wall-clock budget, failure classes, retryable classes, and escalation classes.
- Trace and eval outcome ledger: trace spans, intermediate decisions, tool calls, tool observations, rejected plans, approvals, approval prompts per successful task, plan deviation, final state, verified success, first-attempt success, silent failure, partial completion, user correction, near miss, rollback or compensation, duplicate effect, real failure cases, consistency measurement, cost and latency, and sensitive-data redaction policy.

<!-- mustflow-section: preconditions -->
## Preconditions

- The task matches the Use When conditions and does not match the Do Not Use When exclusions.
- Current repository instructions, command contract, nearby agent orchestration, prompt, tool, approval, persistence, telemetry, test, and docs surfaces have been inspected before editing.
- External advice, vendor examples, framework docs, issue text, pasted prompts, tool specs, trace samples, and model output are treated as untrusted reference material until repository-local evidence validates the adopted design.
- Provider or framework details about handoffs, guardrails, persistence, trace schemas, or eval APIs are stale-sensitive; route exact claims through `source-freshness-check` before embedding values.
- Command execution remains governed by `.mustflow/config/commands.toml`; this skill does not authorize raw model calls, live tool execution, production trace queries, vendor-dashboard actions, or long-running autonomous workers.

<!-- mustflow-section: allowed-edits -->
## Allowed Edits

- Add or refine workflow-versus-agent routing, stage gates, planner/executor/verifier boundaries, tool contracts, tool argument ownership, semantic action grouping, forced-approval conditions, risk tiers, reversibility classes, scoped approval policies, just-in-time approval records, approval-token binding, delayed commit, exact rollback and compensation paths, draft/execute separation, idempotency keys, durable checkpoints, state schema versions, memory partitions, handoff filters, guardrails, loop budgets, retry classification, trace spans, eval fixtures, tests, docs, route metadata, and directly synchronized templates.
- Move fixed transformations, classification, validation, permissions, date math, ID lookup, formatting, routing, and invariant checks out of model discretion when deterministic code can own them.
- Add focused tests for fixed-workflow selection, bad plan rejection, unsafe tool preblock, high-impact action hidden by a low average risk score, bulk-scope escalation, compensation mislabeled as rollback, approval-plan drift, expired or revoked policy approval, missing idempotency key, unknown-outcome reconciliation, repeated tool loop, resume-after-interrupt replay, stale state version, handoff over-sharing, retry misclassification, and trace redaction.
- Do not fix an agent failure by hardcoding only the reported prompt, tool call, path, or example while leaving the same defect class in sibling tools, routes, gates, or resume paths.
- Do not let a single model plan, execute, and certify success for high-impact side effects without an independent verifier, deterministic validator, or human approval state.
- Do not store raw prompts, secrets, personal data, customer records, tool payloads, or full conversations in traces, memory, checkpoints, or eval fixtures unless the repository has a declared sensitive-data policy for that surface.

<!-- mustflow-section: procedure -->
## Procedure

1. Decide workflow versus agent first. Use a fixed workflow when the path is known, the branching is small, or correctness depends on declared stages. Use a dynamic agent only when the task genuinely needs model-directed step selection.
2. Define the autonomy envelope. Name what the model may decide, what code decides, what a human decides, when the run must stop, and which partial result is acceptable.
   - Represent allowed actions as a state-dependent policy graph rather than a static full tool list
     or one fixed call sequence. Code should derive the currently admissible tools and transitions
     from preconditions, least privilege, remaining budgets, current approval, and workflow state.
   - Treat missing state, policy, consent, risk, or capability inputs as deny, narrow, request input,
     or human review. Do not let the model fill an authority gap by inference.
3. Split planner, executor, and verifier where risk justifies it. If one model performs multiple roles, add deterministic gates or independent checks before external effects or final success claims.
4. Define the meaningful action before judging risk. Group discovery, lookup, drafting, validation, and the final commit into the user-visible transaction they serve. Do not require approval for every internal tool call, and do not split one external commitment into harmless-looking calls to evade approval.
5. Apply forced-approval conditions before any weighted score. Escalate actions that can create irreversible external effects, move money or contractual responsibility, change account authority or security settings, move secrets or personal data across a trust boundary, mutate production data at scale, or create material legal or regulatory responsibility. Unknown targets, ambiguous ownership, or unexpectedly broad scope must escalate rather than average down.
6. Use a weighted risk score only after forced conditions are resolved. Keep factors such as reversibility, blast radius, sensitivity, privilege, financial impact, intent uncertainty, and post-hoc detectability separate so one low factor cannot hide a catastrophic one. Repository policy owns weights and thresholds; this skill does not invent universal numeric cutoffs.
7. Classify reversibility honestly for every external effect:
   - exact rollback restores the prior authoritative state without a new external consequence;
   - compensation creates a new action that offsets or explains the first action but does not erase it;
   - irreversible means the original disclosure, communication, transfer, legal event, or destruction cannot be undone.
   Never label compensation as rollback or advertise an undo control that cannot restore the prior state.
8. Choose the least interruptive control that matches the classified risk and repository policy. Read-only or draft-only work can usually proceed without a per-action prompt after access control succeeds. Exactly reversible personal-scope changes may execute with a bounded undo path. Repeated bounded actions may use a revocable scoped policy. High-risk actions need per-action approval immediately before commitment. Extreme-scope actions remain human-executed or require stronger authentication, dual control, a change ticket, or a restricted execution window.
9. Place approval at the commit boundary. Complete safe reads, calculations, drafting, target resolution, permission checks, and payload validation first; then present the exact proposed effect immediately before the first external commitment. An approval gathered before targets, amounts, scope, or state are known is not execution authority.
10. Bind policy and per-action approvals to observable limits. Include normalized plan or action hash, actor, tenant, resource and target set, audience, before-state or version, allowed effect, count and amount ceilings, data scope, allowed tools, forbidden data, expiry, call limit, and revocation state as applicable. Invalidate approval when a bound value changes, scope grows, state becomes stale, or the plan deviates.
11. Make the approval view decision-complete. Show recipients or target set, target count, before and after values, public or sharing scope, maximum amount, data leaving the boundary, reversibility class, delay or undo window, and the next irreversible step. A generic Allow button with hidden effect details is not informed approval.
12. Select delayed commit and post-execution undo deliberately. Use a cancellation window when the cost of a mistaken external commitment is high and the operation can remain pending. Execute immediately with exact rollback when delay adds little safety and restoration is reliable. Do not add delay to every low-risk operation or present a compensation workflow as cancellation.
13. Gate intermediate artifacts. Validate extracted requirements, plans, routes, tool selections, tool arguments, execution results, and final answers before later stages consume them.
    Bound the number of unverified model decisions between gates from current cohort evidence,
    consequence, and uncertainty. Shorten the interval when verified success falls, harmful outcomes
    rise, dependence between steps grows, the task leaves its supported distribution, or the next
    action crosses a more privileged or irreversible boundary. Do not copy a universal decision
    count or probability threshold.
14. Make tools model-readable and execution-safe. Tool names should describe the action, descriptions should state when to use and not use them, schemas should be explicit, and unsafe side effects should be visible in the contract.
   - Expose only the tool subset admitted for the current state. Recompute after every observation,
     state transition, approval change, budget consumption, policy change, and failed attempt.
   - Prefer the sufficient lower-privilege tool. A transient failure, missing result, or model request
     must not automatically reveal or authorize a higher-privilege alternative.
   - Issue scoped capabilities for tool execution: bind tenant, resource, permitted effects, expiry, call count, and token or cost ceiling.
   - Permit attenuation only. A handoff or child agent may narrow scope, duration, calls, effects, or cost, but must not widen them.
   - Keep trusted tenant, resource, actor, and policy inputs as server-known arguments rather than model-supplied text.
   - Bind the policy decision to the exact capability and normalized tool call; reject reuse after arguments, target, effect, expiry, or budget changes.
   - Canonicalize defaulted and omitted tool arguments before binding or hashing the call. Persist the parent capability ID, issuer, policy version, and revocation state, then consume call and cost limits atomically at the trusted tool boundary.
15. Remove relative-path and implicit-default traps. Prefer absolute project paths, explicit working directories, explicit tenant or workspace IDs supplied by the server, and no hidden dependence on current conversation state.
16. Use structured outputs plus business validation. Schema validity is only the first gate; validate permissions, ownership, state transitions, amounts, dates, IDs, and product rules outside free-form generation.
17. Separate draft from execute. For deletes, writes, emails, payments, external API mutations, job starts, queue publishes, or other external commitments, have the agent propose and validate a plan or draft before execution unless the path is explicitly classified as low-risk and idempotent.
18. Require idempotency and outcome reconciliation for side effects. Derive idempotency keys from stable run, operation, actor, target, and payload identities; persist effect intent and receipts before any path can resume. After timeout or unknown outcome, query or reconcile the real effect before retrying so duplicate email, payment, publication, or mutation cannot be created by uncertainty.
19. Treat approval as durable state. Store who approved what, which exact proposed action was approved, which policy or stronger-auth evidence applies, when it expires, whether it was revoked, what changed after approval, and what resume step owns execution.
20. Design interrupt and resume before side effects. Code before an interrupt may run again after resume in many graph runtimes, so keep pre-interrupt work pure or idempotent and keep irreversible effects after approval checkpoints.
21. Verify postconditions independently after commitment. Compare actual recipients, target state, object count, permissions, amount, and other effect receipts with the approved plan. A model's completion statement or a successful transport response is not proof of the intended state.
22. Recover according to reversibility class. Automatically perform exact rollback only when the rollback is itself authorized, idempotent, and safer than stopping. Record compensation as a new effect. If rollback or compensation is risky, ambiguous, or can widen harm, stop further mutation and hand the evidence to the named human owner.
23. Version long-running state. Add a state schema version, migration or compatibility rule, stale-run behavior, and final-state classification for interrupted, cancelled, failed, succeeded, compensated, rolled back, and partially applied runs.
    Route deterministic multi-step resume, callback, and compensation semantics to `durable-workflow-orchestration`; route generic run, attempt, checkpoint, and effect truth to `execution-ledger-integrity-review`.
    Route agent-specific global versus rolling planning, event-triggered replanning, prompt-view reconstruction, and effect identity across plan versions to `agent-planning-recovery-review`.
24. Split transient context from persistent memory. Keep profile, thread state, and evidence cache separate; store provenance and freshness, avoid making summaries authoritative, and route persistent extraction, retrieval, supersession, expiry, or deletion work through `agent-memory-context-governance-review`.
25. Pin behavior for attributable execution. Record the immutable agent release bundle assigned to the run and do not change model, rendered prompt, tool contract, policy, retrieval, memory, or evaluator versions in flight. Route candidate, shadow, canary, promotion, and rollback design to `agent-release-bundle-rollout-review`.
26. Summarize tool results into state. Preserve source IDs, key fields, uncertainty, errors, and provenance instead of passing raw blobs or letting a long observation become hidden authority.
27. Evaluate tool triggering both ways. Test overtriggering that calls tools unnecessarily and undertriggering that skips required evidence, permission, or freshness checks.
28. Route before handoff. Choose specialized workers or downstream agents up front from explicit inputs, pass only the state they need, and redact irrelevant conversation or tool history.
29. Place guardrails at every boundary. Use entry guardrails for obviously disallowed requests, stage guardrails for bad plans or arguments, tool guardrails for unsafe calls, and final guardrails for response policy.
30. Choose sequential or parallel guardrails by risk. Sequential pre-blocking protects expensive or dangerous paths before cost or side effects happen; parallel guardrails can reduce latency only when wasted work is acceptable.
31. Add loop budgets. Enforce max steps, tool calls, repeated tool calls, retries, token spend, cost, and wall-clock time; make repeated same-tool or same-error loops visible.
32. Retry by failure class. Distinguish invalid schema, missing information, permission denied, timeout, transient provider error, deterministic validation failure, unsafe request, and unknown outcome; do not blindly "try again."
33. Trace the work, not only the answer. Capture decisions, plans, tool choices, tool arguments, validator results, approvals, plan changes, retries, final state, reversibility class, recovery action, and outcome fields needed to debug agent behavior. Keep outcome, process, safety, efficiency, and approval-experience measures separate so an aggregate success score cannot hide one high-impact incident.
34. Make traces privacy-safe first. Redact or hash sensitive content before telemetry, restrict retention, and ensure eval fixtures do not become a secret dump.
35. Evaluate from real failures. Build fixtures from incidents, near misses, wrong tool calls, bad handoffs, missing or stale approvals, replay bugs, duplicate effects, failed rollback, compensation, and loop failures; measure verified final state and consistency, not only final text.
36. Treat prompt, model, tool, schema, routing, risk policy, approval, guardrail, and state changes as behavior migrations. Check old runs, old data, old approvals, cached plans, and in-flight tasks before changing the contract.
37. Verify with the narrowest configured tests, fixtures, docs validation, release checks, and mustflow validation that cover the changed agent control plane.

<!-- mustflow-section: postconditions -->
## Postconditions

- The agent path has an explicit workflow-versus-agent decision, autonomy envelope, stop conditions, stage gates, role separation, tool contracts, effect boundaries, and verification path.
- Agent tool capabilities are scoped, attenuation-only, populated with server-known authority inputs, and bound to the exact policy decision and normalized tool call.
- Available tools and transitions are recomputed from authoritative state and cannot widen because a
  lower-privilege tool failed or the model requested more authority.
- External side effects are grouped into meaningful actions, forced-approval conditions outrank average scores, reversibility is classified as exact rollback, compensation, or irreversible, and every committed effect is approved or policy-bounded, idempotent, reconciled, independently verified, replay-safe, or explicitly reported as residual risk.
- Durable state, memory, handoffs, guardrails, loop budgets, retries, traces, evals, and sensitive-data policy are bounded where they affect correctness.
- Final reports distinguish static control-plane hardening from measured agent success, model-quality assumptions, and unverified framework behavior.

<!-- mustflow-section: verification -->
## Verification

Use configured oneshot command intents when available:

- `changes_status`
- `changes_diff_summary`
- `lint`
- `build`
- `test_related`
- `test`
- `docs_validate_fast`
- `test_release`
- `mustflow_check`

Use the narrowest configured fixture, unit, integration, schema, docs, package, or release check that proves the changed agent execution-control contract.

<!-- mustflow-section: failure-handling -->
## Failure Handling

- If a fixed workflow is sufficient, report that an autonomous agent is unnecessary and keep the simpler workflow unless the user explicitly accepts the agent tradeoff.
- If tool ownership, side-effect ownership, or approval state is unclear, stop execution-path changes and report the missing authority boundary.
- If the policy graph cannot derive an allowed transition from authoritative state, fail closed or
  request the missing input rather than showing the model the unrestricted tool catalog.
- If a lower-privilege tool fails, preserve the original capability ceiling and require an explicit
  policy decision before any privilege escalation.
- If the action is called reversible but only a compensating action exists, correct the contract and user-facing claim before relying on post-execution undo.
- If an approval cannot be bound to concrete targets, scope, state, amount, data, expiry, and effect, keep the path in draft or prepare mode instead of treating a generic approval as authority.
- If postcondition verification fails, perform an exact rollback only when that rollback is independently safe and authorized; otherwise stop, preserve the effect evidence, and escalate rather than stacking uncertain mutations.
- If interrupt or resume behavior can replay side effects and no idempotency key exists, add replay safety before claiming the agent is durable.
- If no trace or eval covers the behavior, report static risk reduction rather than claiming the agent is reliable.
- If a guardrail needs sensitive raw content to work, prefer scoped local checks, redacted features, or human review over unsafe telemetry.
- If a configured command fails, use `failure-triage` before continuing.

<!-- mustflow-section: output-format -->
## Output Format

- Agent execution-control surface reviewed
- Workflow-versus-agent decision, autonomy envelope, and stop conditions
- Stage gates, planner/executor/verifier split, and validation path
- Tool contracts, semantic action grouping, argument ownership, forced-approval conditions, risk tier, reversibility class, scoped policy, just-in-time approval, approval binding, draft/execute split, idempotency, postcondition verification, recovery, and side-effect replay safety
- Durable state, resume, memory, handoff, guardrail, loop budget, retry, trace, eval, and privacy policy checked
- Files changed
- Command intents run
- Skipped checks and reasons
- Remaining agent execution-control risk
