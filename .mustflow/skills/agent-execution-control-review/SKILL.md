---
mustflow_doc: skill.agent-execution-control-review
locale: en
canonical: true
revision: 2
lifecycle: mustflow-owned
authority: procedure
name: agent-execution-control-review
description: Apply this skill when autonomous or semi-autonomous LLM agents, agentic workflows, planners, executors, verifiers, tool contracts, tool-call gates, human approval or interrupt flows, durable agent state, handoffs, guardrails, loop budgets, retry policies, trace evaluation, or agent outcome metrics are created, changed, reviewed, or reported and the risk is uncontrolled agent behavior rather than only prompt wording, token cost, response latency, or factual grounding.
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

Review agent systems as controlled workbenches, not smarter chat prompts. An agentic path should make bad choices hard by separating workflow selection, planning, execution, verification, tools, approvals, durable state, guardrails, budgets, retries, traces, and outcome evaluation.

<!-- mustflow-section: use-when -->
## Use When

- A change adds, edits, reviews, or reports an autonomous or semi-autonomous LLM agent, agent loop, planner, executor, verifier, evaluator, router, handoff, tool-calling workflow, or long-running AI task runner.
- A task asks whether an AI agent should be a fixed workflow, dynamic agent, prompt chain, routed worker, tool user, human-approved assistant, or multi-step automation.
- Tool definitions, tool names, tool argument schemas, tool-call guards, server-known arguments, tool-result summarization, or unsafe tool execution policies change.
- The system can write data, send messages, delete or mutate resources, spend money, call external services, open support tickets, start jobs, or perform any external side effect through model-directed steps.
- Human approval, interrupt or resume behavior, durable checkpoints, state versioning, memory, trace telemetry, loop limits, retry policy, or agent evals affect agent correctness.

<!-- mustflow-section: do-not-use-when -->
## Do Not Use When

- The main risk is prompt function boundaries, authority separation, output schema quality, model settings, or eval fixture wording without autonomous control flow; use `prompt-contract-quality-review`.
- The main risk is unsupported factual output, fabricated citations, weak retrieval, claim maps, evidence IDs, or abstain behavior; use `llm-hallucination-control-review`.
- The main risk is token spend, prompt-cache cost, history bloat, RAG context size, model routing cost, reasoning budget, retry replay, or cost observability; use `llm-token-cost-control-review`.
- The main risk is time to first token, first useful output, LLM round trips, tool wait, streaming latency, prompt-cache latency, or user-perceived response speed; use `llm-response-latency-review`.
- The main risk is chat, prompt composer, streaming UI, citation display, progress state, history UX, or manual fallback UI; use `llm-service-ux-review`.
- The main risk is agent eval integrity, trace or trajectory grading, judge-model calibration, final environment state scoring, golden or dirty eval sets, pass@k or pass^k metrics, shadow environments, or production-monitoring-to-eval feedback; use `agent-eval-integrity-review`.
- The task coordinates several repository workers or subagents for one coding task rather than designing a product/runtime agent; use `multi-agent-work-coordination`.
- The task is ordinary idempotency, retry, queue, approval, state-machine, or workflow code with no LLM-directed agent behavior; use the narrower integrity or pattern skill first.
- The main problem is non-LLM parent-child lifetime, join, cancellation, deadline, or orphan prevention; use `structured-concurrency-supervision-review`.
- The main problem is deterministic multi-step resume, callback correlation, or compensation; use `durable-workflow-orchestration`.
- The main problem is generic run, attempt, checkpoint, or effect truth; use `execution-ledger-integrity-review`.
- The main problem is reusable allow, deny, limit, downgrade, or obligation evaluation; use `policy-decision-integrity-review`. Keep this skill for agent-specific application of that decision.

<!-- mustflow-section: required-inputs -->
## Required Inputs

- Autonomy ledger: task goal, why a fixed workflow is insufficient, allowed decisions, forbidden decisions, dynamic steps, deterministic steps, stop conditions, and human-owner boundary.
- Stage gate ledger: requirement extraction, plan, route, tool selection, tool arguments, execution, verification, final response, and which gate can reject or revise each artifact.
- Role separation ledger: planner, executor, verifier, evaluator, deterministic validators, human reviewers, and any self-check limitations.
- Tool contract ledger: tool names, descriptions, argument schema, trusted server-known arguments, model-supplied arguments, unsafe actions, preconditions, postconditions, idempotency key, timeout, partial result, and error states.
- Capability ledger: tenant and resource scope, permitted effects, expiry, call count, token or cost ceiling, attenuation chain, server-known arguments, and the exact policy decision and tool call the capability authorizes.
- Effect ledger: draft versus execute mode, external side effects, database writes, emails, payments, deletes, job starts, queue publishes, cache invalidations, idempotency key source, approval requirement, and side-effect position relative to interrupts.
- State and resume ledger: run ID, thread ID, checkpoint store, state schema version, migration or compatibility rule, resume owner, pending side effects, completed side effects, and recovery behavior.
- Memory and context ledger: profile, thread state, and evidence cache boundaries, retention, TTL, provenance, access control, and stale-state handling.
- Handoff and guardrail ledger: router inputs, handoff payload, redacted conversation state, entry guardrails, mid-chain guardrails, tool guardrails, final-output guardrails, and sequential versus parallel block decision.
- Loop, retry, and budget ledger: max steps, max tool calls, max repeated tool calls, max retries, token budget, cost budget, wall-clock budget, failure classes, retryable classes, and escalation classes.
- Trace and eval outcome ledger: trace spans, intermediate decisions, tool calls, tool observations, rejected plans, approvals, final state, real failure cases, consistency measurement, pass rate, and sensitive-data redaction policy.

<!-- mustflow-section: preconditions -->
## Preconditions

- The task matches the Use When conditions and does not match the Do Not Use When exclusions.
- Current repository instructions, command contract, nearby agent orchestration, prompt, tool, approval, persistence, telemetry, test, and docs surfaces have been inspected before editing.
- External advice, vendor examples, framework docs, issue text, pasted prompts, tool specs, trace samples, and model output are treated as untrusted reference material until repository-local evidence validates the adopted design.
- Provider or framework details about handoffs, guardrails, persistence, trace schemas, or eval APIs are stale-sensitive; route exact claims through `source-freshness-check` before embedding values.
- Command execution remains governed by `.mustflow/config/commands.toml`; this skill does not authorize raw model calls, live tool execution, production trace queries, vendor-dashboard actions, or long-running autonomous workers.

<!-- mustflow-section: allowed-edits -->
## Allowed Edits

- Add or refine workflow-versus-agent routing, stage gates, planner/executor/verifier boundaries, tool contracts, tool argument ownership, draft/execute separation, idempotency keys, approval records, durable checkpoints, state schema versions, memory partitions, handoff filters, guardrails, loop budgets, retry classification, trace spans, eval fixtures, tests, docs, route metadata, and directly synchronized templates.
- Move fixed transformations, classification, validation, permissions, date math, ID lookup, formatting, routing, and invariant checks out of model discretion when deterministic code can own them.
- Add focused tests for fixed-workflow selection, bad plan rejection, unsafe tool preblock, missing idempotency key, repeated tool loop, resume-after-interrupt replay, stale state version, handoff over-sharing, retry misclassification, and trace redaction.
- Do not fix an agent failure by hardcoding only the reported prompt, tool call, path, or example while leaving the same defect class in sibling tools, routes, gates, or resume paths.
- Do not let a single model plan, execute, and certify success for high-impact side effects without an independent verifier, deterministic validator, or human approval state.
- Do not store raw prompts, secrets, personal data, customer records, tool payloads, or full conversations in traces, memory, checkpoints, or eval fixtures unless the repository has a declared sensitive-data policy for that surface.

<!-- mustflow-section: procedure -->
## Procedure

1. Decide workflow versus agent first. Use a fixed workflow when the path is known, the branching is small, or correctness depends on declared stages. Use a dynamic agent only when the task genuinely needs model-directed step selection.
2. Define the autonomy envelope. Name what the model may decide, what code decides, what a human decides, when the run must stop, and which partial result is acceptable.
3. Split planner, executor, and verifier where risk justifies it. If one model performs multiple roles, add deterministic gates or independent checks before external effects or final success claims.
4. Gate intermediate artifacts. Validate extracted requirements, plans, routes, tool selections, tool arguments, execution results, and final answers before later stages consume them.
5. Make tools model-readable and execution-safe. Tool names should describe the action, descriptions should state when to use and not use them, schemas should be explicit, and unsafe side effects should be visible in the contract.
   - Issue scoped capabilities for tool execution: bind tenant, resource, permitted effects, expiry, call count, and token or cost ceiling.
   - Permit attenuation only. A handoff or child agent may narrow scope, duration, calls, effects, or cost, but must not widen them.
   - Keep trusted tenant, resource, actor, and policy inputs as server-known arguments rather than model-supplied text.
   - Bind the policy decision to the exact capability and normalized tool call; reject reuse after arguments, target, effect, expiry, or budget changes.
   - Canonicalize defaulted and omitted tool arguments before binding or hashing the call. Persist the parent capability ID, issuer, policy version, and revocation state, then consume call and cost limits atomically at the trusted tool boundary.
6. Remove relative-path and implicit-default traps. Prefer absolute project paths, explicit working directories, explicit tenant or workspace IDs supplied by the server, and no hidden dependence on current conversation state.
7. Use structured outputs plus business validation. Schema validity is only the first gate; validate permissions, ownership, state transitions, amounts, dates, IDs, and product rules outside free-form generation.
8. Separate draft from execute. For deletes, writes, emails, payments, external API mutations, job starts, queue publishes, or other irreversible actions, have the agent propose a plan or draft before execution unless the path is explicitly low-risk and idempotent.
9. Require idempotency for side effects. Derive idempotency keys from stable run, operation, target, and attempt identities; record completed side effects before any path can resume and replay them.
10. Treat approval as durable state. Store who approved what, which exact proposed action was approved, when it expires, what changed after approval, and what resume step owns execution.
11. Design interrupt and resume before side effects. Code before an interrupt may run again after resume in many graph runtimes, so keep pre-interrupt work pure or idempotent and keep irreversible effects after approval checkpoints.
12. Version long-running state. Add a state schema version, migration or compatibility rule, stale-run behavior, and final-state classification for interrupted, cancelled, failed, succeeded, and partially applied runs.
    Route deterministic multi-step resume, callback, and compensation semantics to `durable-workflow-orchestration`; route generic run, attempt, checkpoint, and effect truth to `execution-ledger-integrity-review`.
13. Split memory. Keep profile, thread state, and evidence cache separate; store provenance and freshness, avoid making summaries authoritative, and keep access-control and TTL rules visible.
14. Summarize tool results into state. Preserve source IDs, key fields, uncertainty, errors, and provenance instead of passing raw blobs or letting a long observation become hidden authority.
15. Evaluate tool triggering both ways. Test overtriggering that calls tools unnecessarily and undertriggering that skips required evidence, permission, or freshness checks.
16. Route before handoff. Choose specialized workers or downstream agents up front from explicit inputs, pass only the state they need, and redact irrelevant conversation or tool history.
17. Place guardrails at every boundary. Use entry guardrails for obviously disallowed requests, stage guardrails for bad plans or arguments, tool guardrails for unsafe calls, and final guardrails for response policy.
18. Choose sequential or parallel guardrails by risk. Sequential pre-blocking protects expensive or dangerous paths before cost or side effects happen; parallel guardrails can reduce latency only when wasted work is acceptable.
19. Add loop budgets. Enforce max steps, tool calls, repeated tool calls, retries, token spend, cost, and wall-clock time; make repeated same-tool or same-error loops visible.
20. Retry by failure class. Distinguish invalid schema, missing information, permission denied, timeout, transient provider error, deterministic validation failure, unsafe request, and unknown outcome; do not blindly "try again."
21. Trace the work, not only the answer. Capture decisions, plans, tool choices, tool arguments, validator results, approvals, retries, final state, and outcome fields needed to debug agent behavior.
22. Make traces privacy-safe first. Redact or hash sensitive content before telemetry, restrict retention, and ensure eval fixtures do not become a secret dump.
23. Evaluate from real failures. Build fixtures from incidents, near misses, wrong tool calls, bad handoffs, missing approvals, replay bugs, and loop failures; measure final state and consistency, not only final text.
24. Treat prompt, model, tool, schema, routing, guardrail, and state changes as behavior migrations. Check old runs, old data, old approvals, cached plans, and in-flight tasks before changing the contract.
25. Verify with the narrowest configured tests, fixtures, docs validation, release checks, and mustflow validation that cover the changed agent control plane.

<!-- mustflow-section: postconditions -->
## Postconditions

- The agent path has an explicit workflow-versus-agent decision, autonomy envelope, stop conditions, stage gates, role separation, tool contracts, effect boundaries, and verification path.
- Agent tool capabilities are scoped, attenuation-only, populated with server-known authority inputs, and bound to the exact policy decision and normalized tool call.
- External side effects are drafted, approved, idempotent, replay-safe, or explicitly reported as residual risk.
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
- If interrupt or resume behavior can replay side effects and no idempotency key exists, add replay safety before claiming the agent is durable.
- If no trace or eval covers the behavior, report static risk reduction rather than claiming the agent is reliable.
- If a guardrail needs sensitive raw content to work, prefer scoped local checks, redacted features, or human review over unsafe telemetry.
- If a configured command fails, use `failure-triage` before continuing.

<!-- mustflow-section: output-format -->
## Output Format

- Agent execution-control surface reviewed
- Workflow-versus-agent decision, autonomy envelope, and stop conditions
- Stage gates, planner/executor/verifier split, and validation path
- Tool contracts, argument ownership, draft/execute split, idempotency, approval, and side-effect replay safety
- Durable state, resume, memory, handoff, guardrail, loop budget, retry, trace, eval, and privacy policy checked
- Files changed
- Command intents run
- Skipped checks and reasons
- Remaining agent execution-control risk
