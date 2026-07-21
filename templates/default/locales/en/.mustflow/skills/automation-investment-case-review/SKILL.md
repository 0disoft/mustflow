---
mustflow_doc: skill.automation-investment-case-review
locale: en
canonical: true
revision: 1
lifecycle: mustflow-owned
authority: procedure
name: automation-investment-case-review
description: Apply this skill when deciding whether an AI agent, workflow automation, internal tool, or operational integration is economically worth building, expanding, replacing, or retiring by comparing expected cost per accepted outcome, human alternatives, supervision, failure recovery, maintenance, break-even volume, throughput value, effective lifetime, NPV, and independent safety gates.
metadata:
  mustflow_schema: "1"
  mustflow_kind: procedure
  pack_id: mustflow.core
  skill_id: mustflow.core.automation-investment-case-review
  command_intents:
    - changes_status
    - changes_diff_summary
    - docs_validate_fast
    - test_release
    - mustflow_check
---

# Automation Investment Case Review

<!-- mustflow-section: purpose -->
## Purpose

Decide whether automation produces cheaper accepted outcomes, useful capacity, or strategic value
after supervision, failure recovery, maintenance, redesign, and safety costs are included. Prevent a
cheap model call or impressive throughput demo from being mistaken for a viable operating system.

<!-- mustflow-section: use-when -->
## Use When

- A team asks whether to build, buy, expand, replace, or retire an AI agent, workflow automation,
  integration, internal tool, or operational pipeline.
- A proposal compares automation cost with human work, headcount, outsourcing, queue delay,
  conversion, revenue, SLA, error cost, or throughput.
- The decision needs expected cost per accepted outcome, break-even volume, implementation and
  maintenance cost, effective lifetime, scenario analysis, discounting, or NPV.
- A claimed saving excludes supervision, retries, manual review, incident response, rejected output,
  redesign, vendor changes, security, compliance, or rollback cost.

<!-- mustflow-section: do-not-use-when -->
## Do Not Use When

- The task only optimizes LLM token spend, prompt caching, model routing, or per-request inference
  cost inside an already-approved product; use `llm-token-cost-control-review`.
- The task only analyzes cloud infrastructure spend; use `cloud-cost-guardrail-review`.
- The task only selects a vendor, framework, runtime, or platform; use
  `technology-stack-selection` and use this skill only for the investment model.
- The task only evaluates technical agent quality or safety; use the matching agent, eval, security,
  privacy, or rollout skill. Economic return never overrides a failed safety gate.

<!-- mustflow-section: required-inputs -->
## Required Inputs

- Outcome contract: one accepted business outcome, rejection or correction rule, quality floor,
  latency or SLA, volume, demand pattern, current backlog, and value owner.
- Automation cost ledger: model, tool, API, compute, storage, network, observability, licenses,
  implementation, integration, data preparation, eval, security, compliance, supervision, manual
  review, failure recovery, incident response, support, maintenance, retraining, migration, and exit.
- Human comparator: labor time and loaded cost, tooling, management, training, queue delay, error and
  rework rates, review, escalation, coverage, turnover, and capacity constraints.
- Reliability ledger: success, accepted without correction, accepted after correction, rejected,
  silent failure, duplicate or harmful effect, rollback or compensation, incident probability, and
  cost distribution.
- Investment assumptions: up-front cost, recurring cost, volume scenarios, adoption ramp, effective
  lifetime before redesign, discount rate, residual value, opportunity cost, and confidence range.
- Safety gate: legal, privacy, security, authorization, irreversibility, human-oversight, audit, and
  rollback requirements that must pass independently of ROI.

<!-- mustflow-section: preconditions -->
## Preconditions

- Define accepted outcome and the current alternative before comparing model or vendor prices.
- Refresh price, wage, contract, volume, error, and lifecycle assumptions from current authoritative
  sources when the decision is current or material.
- Label unknowns and ranges. Do not turn a vendor benchmark, example number, or one pilot into a
  universal production rate.
- Keep command execution under `.mustflow/config/commands.toml`; this skill does not authorize
  purchases, contracts, staffing changes, production rollout, or releases.

<!-- mustflow-section: allowed-edits -->
## Allowed Edits

- Add or refine decision records, assumptions, cost models, scenario tables, break-even analysis,
  NPV models, evidence links, sensitivity analysis, safety gates, tests for calculation logic, docs,
  route metadata, and synchronized templates.
- Separate measured, quoted, estimated, inferred, and unknown values.
- Do not embed universal numeric thresholds, vendor prices, wage rates, error rates, discount rates,
  or useful-life assumptions in reusable policy.
- Do not convert throughput into value unless demand, queue, revenue, SLA, risk, or another binding
  constraint makes extra completed work valuable.

<!-- mustflow-section: procedure -->
## Procedure

1. Define one accepted outcome. Count the business result that passes the quality and safety bar,
   not a model response, tool call, attempted task, or superficially completed workflow.
2. Model automation expected variable cost per accepted outcome. Include ordinary execution,
   supervision, review, retries, rejected work, failure recovery, rollback or compensation, and the
   probability-weighted tail of incidents. Preserve distributions where rare failures dominate.
3. Add fixed and step-fixed costs. Include design, implementation, integration, data work, evals,
   security, compliance, rollout, training, change management, monitoring, maintenance, vendor and
   model migrations, and decommissioning.
4. Build the human or current-system comparator on the same outcome contract. Include loaded labor,
   tools, review, rework, delay, error cost, escalation, management, training, and capacity limits.
   Do not compare automation's perfect-path variable cost with a human's fully loaded cost.
5. Separate substitution, assistance, and new capability. An assistant may save minutes without
   removing a role; a new service may create demand rather than replace cost; a constrained queue may
   make throughput valuable even when unit cost is higher.
6. Value throughput only when a binding constraint exists. Tie added capacity to observed backlog,
   avoided SLA penalties, faster cash collection, additional conversion or revenue, reduced risk,
   or another evidence-backed outcome. Otherwise report it as unused headroom.
7. Calculate break-even with ranges. Compare fixed investment with the expected per-accepted-outcome
   advantage across conservative, base, and optimistic volume, quality, supervision, and failure
   scenarios. Report when the denominator is zero, negative, or too uncertain for a meaningful
   break-even point.
8. Use effective lifetime, not accounting optimism. Estimate how long the automation remains useful
   before a product redesign, policy change, provider change, data drift, integration replacement,
   or maintenance burden requires material reinvestment.
9. Discount scenario cash flows when timing matters. Show NPV and payback under explicit assumptions,
   including ramp-up, delayed benefits, recurring maintenance, redesign, migration, and exit cost.
10. Run sensitivity and threshold analysis. Identify which assumptions can reverse the decision:
    accepted-outcome rate, review time, incident cost, volume, demand value, maintenance burden,
    vendor pricing, lifetime, or discount rate. Ask for evidence on those first.
11. Keep safety as a hard independent gate. Reject, narrow, or keep human execution when the design
    cannot meet authorization, privacy, legal, irreversible-effect, audit, reconciliation, or
    rollback requirements, even if the expected financial return is positive.
12. Choose a reversible next step. Prefer a bounded pilot or shadow measurement that resolves the
    largest decision uncertainty without creating an irreversible operational dependency. Define
    the evidence required to expand, redesign, pause, or stop.

<!-- mustflow-section: postconditions -->
## Postconditions

- Automation and the current alternative use the same accepted-outcome definition.
- Variable, fixed, supervision, failure, maintenance, redesign, and exit costs are visible.
- Break-even, throughput value, effective lifetime, and NPV use explicit ranges and evidence levels.
- Safety and legal feasibility remain hard gates independent of financial return.

<!-- mustflow-section: verification -->
## Verification

Use configured oneshot command intents when available: `changes_status`, `changes_diff_summary`,
`docs_validate_fast`, `test_release`, and `mustflow_check`. Use narrower configured calculation,
data-quality, or decision-record checks when available. Do not infer purchasing, billing, staffing,
production, deployment, or vendor commands.

<!-- mustflow-section: failure-handling -->
## Failure Handling

- If accepted outcome, comparator, volume, or safety gate is missing, report the case as
  non-decision-ready instead of manufacturing a return.
- If one uncertain assumption dominates the result, provide the threshold at which the decision
  changes and propose the smallest measurement that can resolve it.
- If benefits depend on unproven demand or queue value, separate operational capacity from financial
  benefit.
- If a positive case requires ignoring rare catastrophic loss, keep the tail risk explicit and hand
  the safety decision to the named authority.

<!-- mustflow-section: output-format -->
## Output Format

- Accepted outcome and current comparator
- Fixed, variable, supervision, failure, maintenance, redesign, and exit costs
- Volume, quality, demand, lifetime, and discount assumptions with evidence levels
- Break-even, payback, NPV, sensitivity, and throughput-value findings
- Independent safety-gate result
- Reversible next experiment and stop or expansion criteria
- Command intents run and skipped checks
- Remaining automation-investment uncertainty
