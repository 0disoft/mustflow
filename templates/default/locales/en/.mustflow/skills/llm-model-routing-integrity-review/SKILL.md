---
mustflow_doc: skill.llm-model-routing-integrity-review
locale: en
canonical: true
revision: 2
lifecycle: mustflow-owned
authority: procedure
name: llm-model-routing-integrity-review
description: Apply this skill when an LLM system selects, cascades, escalates, falls back, or switches models by task, stage, confidence, verifier result, distribution shift, cost, latency, quality, safety, or context handoff and must optimize total cost per accepted outcome without hiding route-specific failures.
metadata:
  mustflow_schema: "1"
  mustflow_kind: procedure
  pack_id: mustflow.core
  skill_id: mustflow.core.llm-model-routing-integrity-review
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

# LLM Model Routing Integrity Review

<!-- mustflow-section: purpose -->
## Purpose

Choose the least expensive model path that still satisfies measured outcome, latency, and safety
requirements. Prevent a cheap per-call route from becoming expensive after retries and repairs, and
prevent a strong-model default from becoming an unevaluated permanent tax.

<!-- mustflow-section: use-when -->
## Use When

- A system adds or changes a model router, small-to-large cascade, escalation threshold, fallback,
  provider or region route, stage-specific model, ensemble, speculative path, or confidence gate.
- Planning, retrieval, coding, validation, summarization, classification, or tool-use stages may use
  different models and context can be lost when the route changes.
- Routing depends on cost, latency, accepted-outcome probability, external verifier results,
  uncertainty, risk, task value, traffic volume, or distribution shift.
- A claim says a smaller model is sufficient, a stronger model is worth the premium, or a routing
  system pays for its own fixed evaluation and operating cost.

<!-- mustflow-section: do-not-use-when -->
## Do Not Use When

- The main risk is prompt payload size, cacheability, token budgets, reasoning spend, or retry replay
  rather than route correctness; use `llm-token-cost-control-review`.
- The main risk is response speed, streaming, speculative cancellation, or time to first useful
  output; use `llm-response-latency-review`.
- The main risk is agent tool authority, approval, side effects, or autonomy; use
  `agent-execution-control-review`.
- The main risk is selling standard versus premium outcomes, charging for automatic escalation,
  task-unit price, managed provider cost, or BYOK packaging; use
  `llm-product-monetization-review`. Keep this skill for route correctness and total route cost.
- The task chooses a provider or technology stack for strategic reasons rather than routing requests
  among already supported models; use `technology-stack-selection`.

<!-- mustflow-section: required-inputs -->
## Required Inputs

- Outcome contract: accepted task result, deterministic and semantic validators, safety floor,
  latency objective, abstain or escalation state, and value or loss of a wrong result.
- Route ledger: task and stage types, candidate models and versions, route features, baseline route,
  escalation and fallback rules, context handoff, retry owner, route version, and stable assignment.
- Evidence ledger: per-route accepted-outcome rate, confidence interval or conservative bound,
  false-accept and false-reject rates, route coverage, sample size, task mix, risk mix, and evaluator
  independence.
- Cost and latency ledger: model, router, verifier, retry, repair, handoff, supervision, and fixed
  evaluation, adapter, monitoring, migration, and maintenance cost.
- Distribution ledger: training and evaluation distribution, production feature distribution,
  missing-feature behavior, out-of-distribution detector, drift monitor, and safe fallback.
- Safety ledger: tasks that require a fixed strong route, deterministic path, human decision, or
  hard refusal regardless of expected financial utility.

<!-- mustflow-section: preconditions -->
## Preconditions

- Establish a capable-model baseline and accepted-outcome evaluator before claiming a cheaper route
  preserves quality.
- Treat model self-confidence, verbal certainty, token probability, and router score as uncalibrated
  until matched to external outcome evidence on the current task distribution.
- Refresh provider model, price, latency, retention, and endpoint claims before embedding exact
  values. Do not copy benchmark percentages or universal thresholds into reusable policy.
- Keep command execution under `.mustflow/config/commands.toml`; this skill does not authorize live
  model calls, traffic routing, billing access, or production rollout.

<!-- mustflow-section: allowed-edits -->
## Allowed Edits

- Add or refine route schemas, features, baseline and candidate policies, external verifiers,
  escalation and abstain states, context handoff, OOD fallback, metrics, eval fixtures, shadow
  comparisons, tests, docs, route metadata, and synchronized templates.
- Move deterministic classification, validation, policy, arithmetic, schema checking, and database
  postconditions out of model routing when code can decide them.
- Do not weaken quality or safety validators to make a cheaper route appear successful.
- Do not route high-impact decisions by average utility when a hard safety or authorization gate
  fails.

<!-- mustflow-section: procedure -->
## Procedure

1. Define the accepted outcome before selecting a model. Include final-state correctness, safety,
   latency, abstention, and repair rules rather than counting a syntactically valid response.
2. Establish the baseline with the most capable practical route and current evals. Only then replace
   bounded task classes or stages with smaller models where accepted outcomes remain sufficient.
3. Route deterministic work to code first. Do not pay a model or router to decide values that a
   schema, compiler, test, database lookup, permission engine, or exact rule can determine.
4. Choose route granularity from real context boundaries. Keep tightly coupled planning and
   execution on one model when switching would lose hidden constraints or require replaying most of
   the context. Split classification, retrieval-query generation, formatting, or verification when
   their inputs and outputs are explicit and independently checkable.
5. Measure route quality with external evidence. Calibrate router scores against tests, schema and
   business validation, source agreement, database postconditions, human adjudication, or another
   independent oracle. Preserve false-accept cost separately from ordinary failure.
6. Optimize total cost per accepted outcome. Include router, verifier, failed cheap attempts,
   escalation, retries, repair, context transfer, supervision, latency loss, and fixed operating
   cost. A lower model price is not a saving when acceptance falls or repair rises.
7. Apply hard constraints before utility. Authorization, privacy, irreversible effects, safety
   invariants, and maximum tolerable loss can force a deterministic, strong-model, human, or refusal
   route even when a cheaper path has positive expected value.
8. Build cheap-first cascades only when the acceptance gate can reject bad cheap outputs with known
   false-accept behavior. Without an external verifier, repeated sampling and self-critique do not
   prove which candidate is correct.
9. Escalate from observed evidence, not model preference. Use validator failure, missing required
   facts, task complexity, risk class, OOD state, repeated error signature, or explicit uncertainty
   features. Do not escalate privileges when escalating model capability.
10. Handle distribution shift explicitly. Compare production features and outcomes with the route's
    evaluation distribution. Send missing, novel, drifted, or low-support cases to the safe baseline
    route, deterministic review, or human owner.
11. Account for context handoff loss. Version the handoff schema, preserve verified facts and hard
    constraints, avoid summary-on-summary drift, and measure whether route switches cause omissions
    or contradictory plans.
12. Keep route and retry ownership separate. A route change may be a recovery action, but it must
    share the workflow's attempt budget and idempotency state rather than restarting the task as a
    new operation.
13. Compare candidates in shadow or replay before promotion. Pin model and route versions, use the
    same representative task mix, preserve delayed outcomes, and route rollout details through
    `agent-release-bundle-rollout-review` when the router is part of an agent bundle.
14. Recalculate routing economics when traffic, task distribution, models, prices, verifier quality,
    repair rate, or maintenance burden changes. Route broad investment decisions to
    `automation-investment-case-review`.

<!-- mustflow-section: postconditions -->
## Postconditions

- Every route has an accepted-outcome contract, external evidence, safe fallback, and versioned
  decision reason.
- Cost comparisons include failed attempts, verification, escalation, repair, context handoff, and
  fixed operating cost.
- OOD and hard-safety cases cannot silently enter a cheap route.
- Model self-confidence is not treated as outcome probability without calibration.

<!-- mustflow-section: verification -->
## Verification

Use configured oneshot command intents when available: `changes_status`, `changes_diff_summary`,
`lint`, `build`, `test_related`, `test`, `docs_validate_fast`, `test_release`, and `mustflow_check`.
Do not infer raw provider, model, billing, traffic, eval, or rollout commands.

<!-- mustflow-section: failure-handling -->
## Failure Handling

- If no accepted-outcome evaluator exists, keep the baseline route and report the missing gate.
- If route evidence is sparse or distribution support is missing, abstain from the cheaper route.
- If false accepts can create high-impact harm, treat the route as unsafe until a hard gate or human
  decision closes the boundary.
- If route savings depend on stale price or benchmark data, mark the economic claim unverified.

<!-- mustflow-section: output-format -->
## Output Format

- Outcome contract and baseline route
- Candidate route, features, version, and context boundary
- External calibration, false-accept, OOD, and drift evidence
- Total cost-per-accepted-outcome and latency findings
- Hard safety, escalation, fallback, and abstain decisions
- Command intents run and skipped checks
- Remaining model-routing risk
