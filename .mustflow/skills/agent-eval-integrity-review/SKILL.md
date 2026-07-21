---
mustflow_doc: skill.agent-eval-integrity-review
locale: en
canonical: true
revision: 2
lifecycle: mustflow-owned
authority: procedure
name: agent-eval-integrity-review
description: Apply this skill when LLM agent evaluation loops, deterministic gates, trace or trajectory grading, LLM judges, verifier agents, repair cascades, outcome scoring, tool-call prechecks or postchecks, fixed, replay, or generated eval datasets, pass@k or pass^k metrics, shadow environments, production-monitoring-to-eval pipelines, or agent regression gates are created, changed, reviewed, or reported and the risk is false confidence, false rejection, stale eval truth, or correlated verification rather than runtime execution control alone.
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

Review agent evaluation as an asymmetric evidence cascade, not a judge-model opinion. Deterministic rules should reject reproducible failures first, evidence-backed repair should run only after failure, independent semantic verification should cover what rules cannot express, and ambiguous disagreement should remain held or receive bounded adjudication instead of becoming a confident pass or fail. A real agent eval should also test final environment state, trajectory, tool boundaries, recovery, repeatability, dataset freshness, contamination, sensitive-data handling, and how confirmed failures become future regression cases.

<!-- mustflow-section: use-when -->
## Use When

- A change adds, edits, reviews, or reports agent evals, verifier agents, judge prompts, trace graders, trajectory scoring, outcome metrics, eval fixtures, benchmark harnesses, or production agent quality gates.
- A task asks whether an agent actually completed a workflow, not only whether the final response sounded correct.
- Tool calls, handoffs, guardrails, custom events, human approvals, retries, checkpoints, or external effects should be captured and graded as part of the agent run.
- An eval can depend on final database state, queue state, email state, payment state, file state, test results, permissions, rollback evidence, or another observable environment result.
- Agent failures, human overrides, user complaints, tool errors, timeouts, cost spikes, repeated retries, or rollbacks should feed future eval candidates.
- False-positive and false-negative costs, verifier disagreement, correlated judge errors, self-review, evidence-backed repair, dataset contamination, oracle expiry, or stale expected answers affect release decisions.

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
- Decision-loss ledger: false-positive cost, false-negative cost, execution and review cost, risk class, hard-block invariants, diagnostic-only findings, abstain or hold state, adjudication owner, and release consequence.
- Trace ledger: model calls, tool calls, handoffs, guardrails, approvals, retries, custom events, tool observations, intermediate plans, rejected actions, and final response.
- Oracle ledger: deterministic checks, schemas, static analysis, tests, state queries, regex or exact matchers, semantic verifiers, secondary adjudicators, sampled human review, evidence type, expected independence, known shared failure modes, and which oracle owns each claim.
- Tool-boundary ledger: precheck, postcheck, permission check, idempotency check, state-before, state-after, changed fields, evidence references, tool error, timeout, and token size.
- Dataset ledger: fixed regression set, recent real-traffic replay set, generated or perturbed exploration set, representative and risk-biased sampling strata, capability set, manual smoke cases, source of each case, labels, expected outcomes, grouping keys, sealed holdout status, validity interval, tool and policy versions, flakiness, and release-gate status.
- Metric ledger: verified task success, first-attempt success, silent failure, partial completion, user correction, plan deviation, pass@k, pass^k, per-task trial count, final-state success, trajectory safety, tool count, unnecessary tool calls, runtime distribution, approval wait, token consumption, cost per verified success, tool errors by class, retries, duplicate effects, human overrides, near misses, rollback and compensation rate, approval prompts, and approval rejection or cancellation.
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

- Add or refine outcome oracles, asymmetric verification cascades, trace schemas, trajectory graders, deterministic checkers, evidence-backed repair inputs, semantic-verifier rubrics, secondary adjudication, human-review sampling, tool prechecks and postchecks, tool-result evidence packets, fixed regression, recent replay, and generated exploration sets, contamination controls, oracle validity metadata, shadow-environment adapters, monitoring-to-eval candidate flows, tests, docs, route metadata, and directly synchronized templates.
- Split side-effect tools into prepare, verify, and commit phases when eval evidence needs a safe pre-execution artifact and a post-execution state check.
- Add focused fixtures for false-success final answers, false rejection without a reproducible violation, missing environment state, unsafe tool path, bad tool argument, over-trusting a judge model, correlated judges, self-review certifying its own output, ambiguous verifier disagreement, stale expected truth, train-eval leakage, trace redaction leaks, repeated tool loops, fragile tool-order assertions, flaky real-traffic cases, and pass@k versus pass^k drift.
- Do not treat an LLM judge, self-reflection step, reasoning trace, or final answer as proof without observable state, deterministic checks, calibrated rubric evidence, or human review.
- Do not force one exact tool sequence when several safe paths can satisfy the task; grade required evidence, forbidden actions, final state, approvals, cost bounds, and safety constraints instead.
- Do not store raw prompts, tool payloads, database rows, personal data, secrets, or full conversations in traces or eval fixtures unless the repository has an explicit sensitive-data policy for that surface.

<!-- mustflow-section: procedure -->
## Procedure

1. Name the eval target. Decide whether the eval measures capability exploration, regression safety, release gating, incident reproduction, tool selection, trace quality, or production monitoring.
2. Score final environment state before final text. For action agents, success means the booking, refund, email, file, ticket, database row, queue message, test result, or other observable state is correct.
3. Score the trajectory as a separate dimension. A correct final answer can still fail when the path used unsafe tools, repeated searches, excessive tokens, hallucinated intermediate facts, skipped approvals, or relied on luck.
4. Define the decision loss before choosing an oracle. Estimate false-rejection, defect-escape, execution, latency, and human-review costs by task risk. A threshold cannot minimize false positives and false negatives independently; it implements a declared tradeoff. Safety invariants, payment, permission, destructive, and disclosure failures usually assign much higher cost to a missed defect than to a held result.
5. Build an asymmetric cascade:
   - run deterministic hard rules and high-reproducibility tests first;
   - when they fail, give the generator only the concrete failure evidence or smallest counterexample needed for bounded repair;
   - after hard gates pass, use an independent semantic verifier for claims rules cannot express;
   - when the verifier and deterministic evidence disagree or the verdict is ambiguous, call a bounded secondary adjudicator or hold for human review.
   Do not pay for every stage on every case when a cheaper conclusive stage already owns the verdict.
6. Define verdict logic explicitly. A pass requires every applicable hard gate to pass and no confirmed semantic violation. A fail requires a reproducible violation, an unambiguous safety invariant breach, or an independent adjudication that owns the disputed claim. Everything else remains `held`, `needs_review`, or another explicit non-passing, non-failing state.
7. Build oracle layers. Prefer deterministic checks for schemas, exact state, permissions, idempotency, static analysis, unit tests, properties, invariants, and numeric rules. Use semantic verifiers for rubric-heavy cases and sampled humans for calibration and high-risk ambiguity.
8. Make semantic verification independent in inputs, not just agent count. Give the verifier the original requirements, final artifact, observable state, and evidence packet; hide generator identity, chain-of-thought, persuasive self-justification, and irrelevant trace prose. Split the rubric into factuality, omission, forbidden behavior, side effects, reversibility, and other task-owned dimensions.
9. Treat multiple similar judges as correlated evidence until calibration proves otherwise. Model-family labels, prompt variants, or vote count alone do not create independent oracles. Prefer a different evidence type, deterministic counterexample, state query, or human review over adding more judges that share the same blind spot.
10. Keep self-reflection out of final judgment. Use it as a repair worker only after a test, counterexample, tool receipt, source conflict, or verifier finding identifies what must change. Do not let the generator certify that its own repair succeeded.
11. Calibrate semantic verifiers and adjudicators. Compare outputs with deterministic checks or human review, track false-rejection and defect-escape rates separately, measure disagreement by rubric dimension, and avoid treating one judge score as a stable product metric.
12. Add prechecks and postchecks around tools. Validate tool arguments before execution and validate state, evidence references, errors, and permissions after execution.
13. Keep destructive actions sequentially gated. For irreversible or costly actions, block before model calls or tool execution when possible; do not rely on a late parallel guardrail after cost or side effects have already happened.
14. Split side effects into prepare, verify, and commit. Evaluate the prepared payload or diff before the commit phase, then evaluate the committed state afterward.
15. Make tool results evidence packets. Include state before, state after, changed fields, evidence refs, permission scope, idempotency key, and structured error or timeout state instead of only a friendly success sentence.
16. Fuzz tool schemas. Test missing fields, wrong enum values, similar IDs, empty strings, long queries, unauthorized resource IDs, deleted objects, stale objects, and ambiguous names.
17. Test tool names and namespaces. When multiple tools overlap, use service or resource prefixes and eval whether routing improves without overfitting to one prompt.
18. Track tool payload size. Large tool responses are eval failures when they hide evidence, waste context, or cause the model to miss the relevant fields; use pagination, filtering, truncation, or summaries with source IDs.
19. Use shadow environments first. Evaluate payment, email, CRM, repository, file, database, and external mutations against sandbox or fake adapters before connecting to production systems.
20. Require checkpoints for human-in-the-loop. Human approval or correction should point to a durable state snapshot that can resume, replay safely, or roll back.
21. Classify failure handling by risk. High-risk tasks fail closed on verification gaps; reversible drafting, search, and classification can fail soft with a visible `needs_review` state.
22. Keep three dataset roles separate:
   - fixed regression cases cover core flows, confirmed incidents, permissions, duplicate effects, rollback, wrong targets, and other known defects;
   - recent real-traffic replay cases estimate current distribution in a side-effect-free shadow environment, with representative and risk-biased samples reported separately;
   - generated or perturbed exploration cases vary scope, similar identities, time zones, permissions, timeouts, stale state, ambiguity, and other long-tail conditions around explicit invariants.
   Do not average one easy set over a regression in another set.
23. Promote confirmed failures. A generated or noisy replay failure becomes a fixed regression only after a deterministic counterexample, independent confirmation, or human review establishes the expected behavior. Critical security, permission, financial, privacy, and irreversible-effect invariants may hard-block immediately when their truth is unambiguous.
24. Keep capability evals separate from regression gates. Capability sets may start hard and improve over time; fixed regression cases for confirmed critical defects should remain fully passing before release. Quarantine flaky replay cases as diagnostic evidence rather than weakening the fixed gate.
25. Prevent contamination. Group near-duplicate cases by user, task family, source artifact, template, and workflow lineage before splitting. Use time-based sealed holdouts when evaluating future behavior, keep private evaluation cases out of prompts, retrieval memory, fine-tuning, and generated examples, and record normalized-input hashes or similarity evidence where leakage matters.
26. Version expected truth. Record source, collection time, valid-from and valid-to bounds, tool schema, policy version, environment snapshot, time zone, oracle version, label owner, and training-use status as applicable. Expire or quarantine cases whose world, API, policy, or oracle changed instead of counting stale expectations as model regressions.
27. Prefer invariant-based expected outcomes over brittle exact prose. Grade allowed targets, required state, forbidden duplicate effects, approval boundaries, amount or count constraints, and recovery obligations unless exact text or exact tool order is itself the contract.
28. Run multiple trials where model variance matters. Use pass@k for `can solve at least once` capability claims and pass^k for `reliably solves every time` customer-facing claims.
29. Keep operational metric families separate. Report outcomes, process, safety, efficiency, and approval experience independently. Do not combine them into one score that lets high search success, low cost, or easy traffic hide a high-risk miss.
30. Measure verified success rather than self-reported completion. Track first-attempt success, silent failure, partial completion, user correction with mind-change separated from defect correction, plan deviation, repeated identical error, duplicate effect, rollback and compensation, near misses, unnecessary tool calls, and cost per verified success. Use task-specific latency percentiles and separate approval wait from execution time.
31. Define alerts with both absolute rules and baseline movement. A single clear safety-invariant breach may block immediately. Rate-based alerts should declare minimum sample size, comparison window, segmentation, and both absolute and relative change so tiny samples and large baseline regressions are not treated alike.
32. Segment by task type, risk tier, tool, model and prompt version, customer group, region, and language when those dimensions can hide localized regressions. Mark release and configuration changes on the same evidence timeline.
33. Promote production failures into eval candidates. Mine complaints, retries, timeouts, tool errors, human overrides, rollbacks, compensations, cost breaches, approval rejection, and guardrail blocks into reviewed cases.
34. Let evals improve tool design. When failures cluster around ambiguous names, huge outputs, weak errors, missing fields, bad descriptions, or fuzzy parameters, fix the tool contract rather than blaming the model.
35. Keep traces and datasets privacy-safe first. Store spans, IDs, hashes, sizes, versions, state classifications, and redacted reason codes by default; scrub or exclude sensitive raw content from eval fixtures and minimize production data retained for replay.
36. Treat prompt, model, tool, verifier, adjudicator, rubric, dataset, metric, policy, and environment changes as eval migrations. Recompare baselines and validity metadata before claiming improvement.
37. Verify with the narrowest configured tests, fixtures, docs validation, release checks, and mustflow validation that cover the changed eval integrity contract.

<!-- mustflow-section: postconditions -->
## Postconditions

- The eval loop grades final state, trajectory quality, tool-boundary evidence, recovery behavior, repeatability, and sensitive-data handling where relevant.
- Deterministic checks, semantic verifiers, secondary adjudicators, and human review have explicit ownership, verdict branches terminate, and model count is not treated as oracle independence.
- Fixed regression, recent replay, generated exploration, representative and risk-biased strata, contamination, expiry, capability, pass@k, pass^k, shadow environment, production-monitoring, and trace-retention decisions are explicit when they affect agent quality claims.
- Outcome, process, safety, efficiency, and approval-experience measures remain separate, with hard safety blocks distinguished from rate-based alerts.
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
- If a semantic verifier reports a defect without a reproducible violation or independent confirmation, hold or adjudicate the case instead of converting suspicion directly into a hard failure.
- If an expected answer or environment snapshot is stale, quarantine and relabel the case before attributing the result to model regression.
- If training, prompt, retrieval-memory, or template leakage can expose eval cases, stop using the affected score as a generalization claim until grouped or time-based separation is restored.
- If production traces contain sensitive raw content, stop copying that content into evals and add redaction, hashing, or fixture scrubbing first.
- If a dirty case is flaky, quarantine it as diagnostic evidence instead of weakening the golden regression gate.
- If a configured command fails, use `failure-triage` before continuing.

<!-- mustflow-section: output-format -->
## Output Format

- Agent eval-integrity surface reviewed
- Outcome oracle, final-state checks, and trajectory checks
- Decision-loss model, asymmetric cascade, pass, fail, and hold logic
- Deterministic, semantic-verifier, secondary-adjudicator, and human-review oracle split and independence evidence
- Tool prechecks, postchecks, schema fuzzing, evidence packets, and payload-size checks
- Fixed regression, recent replay, generated exploration, contamination, expiry, capability, pass@k, pass^k, shadow environment, monitoring-to-eval, operational metrics, alerting, trace, and privacy decisions
- Files changed
- Command intents run
- Skipped checks and reasons
- Remaining agent eval-integrity risk
