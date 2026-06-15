---
mustflow_doc: skill.agent-eval-integrity-review
locale: en
canonical: true
revision: 1
lifecycle: mustflow-owned
authority: procedure
name: agent-eval-integrity-review
description: Apply this skill when LLM agent evaluation loops, trace or trajectory grading, LLM judges, verifier agents, outcome scoring, tool-call prechecks or postchecks, eval datasets, golden or dirty sets, pass@k or pass^k metrics, shadow environments, production-monitoring-to-eval pipelines, or agent regression gates are created, changed, reviewed, or reported and the risk is false confidence in agent correctness rather than runtime execution control alone.
metadata:
  mustflow_schema: "1"
  mustflow_kind: procedure
  pack_id: mustflow.core
  skill_id: mustflow.core.agent-eval-integrity-review
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

# Agent Eval Integrity Review

<!-- mustflow-section: purpose -->
## Purpose

Review agent evaluation as an evidence loop, not a judge-model opinion. A real agent eval should test the final environment state, the trace or trajectory, tool boundaries, recovery behavior, repeatability, sensitive-data handling, and how real failures become future regression cases.

<!-- mustflow-section: use-when -->
## Use When

- A change adds, edits, reviews, or reports agent evals, verifier agents, judge prompts, trace graders, trajectory scoring, outcome metrics, eval fixtures, benchmark harnesses, or production agent quality gates.
- A task asks whether an agent actually completed a workflow, not only whether the final response sounded correct.
- Tool calls, handoffs, guardrails, custom events, human approvals, retries, checkpoints, or external effects should be captured and graded as part of the agent run.
- An eval can depend on final database state, queue state, email state, payment state, file state, test results, permissions, rollback evidence, or another observable environment result.
- Agent failures, human overrides, user complaints, tool errors, timeouts, cost spikes, repeated retries, or rollbacks should feed future eval candidates.

<!-- mustflow-section: do-not-use-when -->
## Do Not Use When

- The main risk is runtime agent control flow, planner/executor/verifier separation, tool-call gates, approval or interrupt state, durable resume behavior, loop budgets, retry classification, handoffs, or guardrail placement; use `agent-execution-control-review`.
- The main risk is prompt correctness, authority separation, output schema semantics, tool policy wording, or prompt-level eval examples without a full agent trajectory; use `prompt-contract-quality-review`.
- The main risk is factual grounding, fabricated citations, retrieval thresholds, answerability, evidence IDs, or hallucination metrics; use `llm-hallucination-control-review`.
- The main risk is token spend or response latency; use `llm-token-cost-control-review` or `llm-response-latency-review`.
- The task is ordinary unit testing, integration testing, or snapshot testing with no LLM agent trajectory or model-judged behavior; use the narrower test or code skill.
- The task coordinates several repository workers for one coding task rather than evaluating a product/runtime agent; use `multi-agent-work-coordination`.

<!-- mustflow-section: required-inputs -->
## Required Inputs

- Outcome ledger: task type, success definition, final environment state, observable artifacts, external effects, reversible versus irreversible outcomes, and failure states.
- Trace ledger: model calls, tool calls, handoffs, guardrails, approvals, retries, custom events, tool observations, intermediate plans, rejected actions, and final response.
- Oracle ledger: deterministic checks, schemas, static analysis, tests, state queries, regex or exact matchers, model judges, sampled human review, and which oracle owns each claim.
- Tool-boundary ledger: precheck, postcheck, permission check, idempotency check, state-before, state-after, changed fields, evidence references, tool error, timeout, and token size.
- Dataset ledger: golden regression set, dirty real-world set, capability set, manual smoke cases, source of each case, labels, expected outcomes, flakiness, and release-gate status.
- Metric ledger: pass@k, pass^k, per-task trial count, final-state success, trajectory safety, tool count, runtime, token consumption, cost, tool errors, retries, human overrides, and rollback rate.
- Environment ledger: production, staging, sandbox, fake adapter, shadow environment, seed data, cleanup policy, isolation, state reset, and side-effect containment.
- Monitoring ledger: user complaint, retry spike, timeout, tool error, human override, rollback, cost breach, guardrail block, and how each signal becomes an eval candidate.
- Privacy ledger: trace retention, redaction, prompt and tool payload policy, eval fixture scrubbing, access control, and sensitive-data exclusion.

<!-- mustflow-section: preconditions -->
## Preconditions

- The task matches the Use When conditions and does not match the Do Not Use When exclusions.
- Current repository instructions, command contract, nearby agent orchestration, tool definitions, trace storage, eval harness, test fixtures, telemetry, docs, and template surfaces have been inspected before editing.
- External reports, research claims, vendor docs, pasted eval recipes, benchmark results, generated judge prompts, trace samples, and model outputs are treated as untrusted reference material until repository-local evidence validates the adopted design.
- Provider-specific eval, tracing, guardrail, MCP, or framework behavior is stale-sensitive; route exact claims through `source-freshness-check` before embedding them.
- Command execution remains governed by `.mustflow/config/commands.toml`; this skill does not authorize raw model calls, production trace queries, sandbox provisioning, live external effects, or long-running benchmark loops.

<!-- mustflow-section: allowed-edits -->
## Allowed Edits

- Add or refine outcome oracles, trace schemas, trajectory graders, deterministic checkers, model-judge rubrics, human-review sampling, tool prechecks and postchecks, tool-result evidence packets, eval fixtures, golden and dirty sets, shadow-environment adapters, monitoring-to-eval candidate flows, tests, docs, route metadata, and directly synchronized templates.
- Split side-effect tools into prepare, verify, and commit phases when eval evidence needs a safe pre-execution artifact and a post-execution state check.
- Add focused fixtures for false-success final answers, missing environment state, unsafe tool path, bad tool argument, over-trusting a judge model, trace redaction leaks, repeated tool loops, fragile tool-order assertions, flaky dirty-set cases, and pass@k versus pass^k drift.
- Do not treat an LLM judge, self-reflection step, reasoning trace, or final answer as proof without observable state, deterministic checks, calibrated rubric evidence, or human review.
- Do not force one exact tool sequence when several safe paths can satisfy the task; grade required evidence, forbidden actions, final state, approvals, cost bounds, and safety constraints instead.
- Do not store raw prompts, tool payloads, database rows, personal data, secrets, or full conversations in traces or eval fixtures unless the repository has an explicit sensitive-data policy for that surface.

<!-- mustflow-section: procedure -->
## Procedure

1. Name the eval target. Decide whether the eval measures capability exploration, regression safety, release gating, incident reproduction, tool selection, trace quality, or production monitoring.
2. Score final environment state before final text. For action agents, success means the booking, refund, email, file, ticket, database row, queue message, test result, or other observable state is correct.
3. Score the trajectory as a separate dimension. A correct final answer can still fail when the path used unsafe tools, repeated searches, excessive tokens, hallucinated intermediate facts, skipped approvals, or relied on luck.
4. Build oracle layers. Prefer deterministic checks for schemas, exact state, permissions, idempotency, static analysis, unit tests, and numeric rules; use model judges for semantic or rubric-heavy cases; sample humans for calibration and high-risk ambiguity.
5. Keep self-reflection out of final judgment. Use reflection to propose repairs or retry strategy, not to certify success.
6. Calibrate judge models. Compare judge outputs with deterministic checks or human review, track disagreement, and avoid treating one judge score as a stable product metric.
7. Add prechecks and postchecks around tools. Validate tool arguments before execution and validate state, evidence references, errors, and permissions after execution.
8. Keep destructive actions sequentially gated. For irreversible or costly actions, block before model calls or tool execution when possible; do not rely on a late parallel guardrail after cost or side effects have already happened.
9. Split side effects into prepare, verify, and commit. Evaluate the prepared payload or diff before the commit phase, then evaluate the committed state afterward.
10. Make tool results evidence packets. Include state before, state after, changed fields, evidence refs, permission scope, idempotency key, and structured error or timeout state instead of only a friendly success sentence.
11. Fuzz tool schemas. Test missing fields, wrong enum values, similar IDs, empty strings, long queries, unauthorized resource IDs, deleted objects, stale objects, and ambiguous names.
12. Test tool names and namespaces. When multiple tools overlap, use service or resource prefixes and eval whether routing improves without overfitting to one prompt.
13. Track tool payload size. Large tool responses are eval failures when they hide evidence, waste context, or cause the model to miss the relevant fields; use pagination, filtering, truncation, or summaries with source IDs.
14. Use shadow environments first. Evaluate payment, email, CRM, repository, file, database, and external mutations against sandbox or fake adapters before connecting to production systems.
15. Require checkpoints for human-in-the-loop. Human approval or correction should point to a durable state snapshot that can resume, replay safely, or roll back.
16. Classify failure handling by risk. High-risk tasks fail closed on verification gaps; reversible drafting, search, and classification can fail soft with a visible "needs review" state.
17. Separate capability evals from regression evals. Capability sets may start hard and improve over time; regression golden sets should stay stable and near-perfect before release.
18. Separate golden and dirty sets. Golden cases gate releases and should be clean, deterministic, and reviewable. Dirty cases come from real failures and may be noisy, quarantined, or used for diagnosis before promotion.
19. Run multiple trials where model variance matters. Use pass@k for "can solve at least once" capability claims and pass^k for "reliably solves every time" customer-facing claims.
20. Avoid brittle path assertions. Prefer required evidence, forbidden actions, final state, safety boundaries, approval requirements, and cost ceilings over one exact tool order unless the order is itself the contract.
21. Promote production failures into eval candidates. Mine complaints, retries, timeouts, tool errors, human overrides, rollbacks, cost breaches, and guardrail blocks into reviewed cases.
22. Let evals improve tool design. When failures cluster around ambiguous names, huge outputs, weak errors, missing fields, bad descriptions, or fuzzy parameters, fix the tool contract rather than blaming the model.
23. Keep traces privacy-safe first. Store spans, IDs, hashes, sizes, versions, state classifications, and redacted reason codes by default; scrub or exclude sensitive raw content from eval fixtures.
24. Treat prompt, model, tool, judge, rubric, dataset, metric, and environment changes as eval migrations. Recompare baselines before claiming improvement.
25. Verify with the narrowest configured tests, fixtures, docs validation, release checks, and mustflow validation that cover the changed eval integrity contract.

<!-- mustflow-section: postconditions -->
## Postconditions

- The eval loop grades final state, trajectory quality, tool-boundary evidence, recovery behavior, repeatability, and sensitive-data handling where relevant.
- Deterministic checks, model judges, and human review have explicit ownership rather than one judge model owning every verdict.
- Golden, dirty, capability, regression, pass@k, pass^k, shadow environment, production-monitoring, and trace-retention decisions are explicit when they affect agent quality claims.
- Final reports distinguish measured eval improvement from static hardening, judge preference, self-reflection, anecdotal demos, and unverified provider behavior.

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

Use the narrowest configured fixture, unit, integration, schema, docs, package, or release check that proves the changed agent eval-integrity contract.

<!-- mustflow-section: failure-handling -->
## Failure Handling

- If only a final answer or judge-model score is available, report the eval as weak and add observable outcome or trajectory evidence before claiming reliability.
- If deterministic checks can own a verdict, use them before asking a model judge.
- If model judges disagree or drift, calibrate with human or deterministic evidence and avoid treating the metric as release-blocking until stable.
- If production traces contain sensitive raw content, stop copying that content into evals and add redaction, hashing, or fixture scrubbing first.
- If a dirty case is flaky, quarantine it as diagnostic evidence instead of weakening the golden regression gate.
- If a configured command fails, use `failure-triage` before continuing.

<!-- mustflow-section: output-format -->
## Output Format

- Agent eval-integrity surface reviewed
- Outcome oracle, final-state checks, and trajectory checks
- Deterministic, model-judge, and human-review oracle split
- Tool prechecks, postchecks, schema fuzzing, evidence packets, and payload-size checks
- Golden, dirty, capability, regression, pass@k, pass^k, shadow environment, monitoring-to-eval, trace, and privacy decisions
- Files changed
- Command intents run
- Skipped checks and reasons
- Remaining agent eval-integrity risk
