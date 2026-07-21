---
mustflow_doc: skill.subscription-retention-profit-review
locale: en
canonical: true
revision: 1
lifecycle: mustflow-owned
authority: procedure
name: subscription-retention-profit-review
description: Apply this skill when a subscription product designs, implements, experiments on, or reports cancellation flows, churn reasons, save offers, downgrades, pauses, trial extensions, discounts, usage credits, dormant-user reactivation, win-back campaigns, offer sequencing, resumed billing, retention, CLTV, or incremental contribution profit and must avoid counting natural returners, paused users, or discounted would-have-stayed subscribers as causal saves.
metadata:
  mustflow_schema: "1"
  mustflow_kind: procedure
  pack_id: mustflow.core
  skill_id: mustflow.core.subscription-retention-profit-review
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

# Subscription Retention Profit Review

<!-- mustflow-section: purpose -->
## Purpose

Choose cancellation, pause, downgrade, reactivation, credit, discount, or no-offer policies by
incremental contribution profit and durable paid behavior rather than offer acceptance or apparent
save rate. Keep cancellation easy while preventing discounts from cannibalizing full-price revenue.

<!-- mustflow-section: use-when -->
## Use When

- A product adds or changes cancellation reasons, save offers, downgrade, pause, extension, credit,
  discount, support, feature-remediation, or cancellation confirmation flows.
- Dormant active subscribers, expired subscribers, churned payers, trial users, unactivated payers,
  or seasonal users receive re-engagement or win-back treatment.
- Offer eligibility, ordering, personalization, holdouts, control groups, observation horizons,
  retention metrics, reactivation metrics, CLTV, or contribution-margin decisions change.
- A report claims a pause reduced churn, a discount saved customers, a credit increased return, or a
  campaign improved lifetime value.

<!-- mustflow-section: do-not-use-when -->
## Do Not Use When

- The main risk is invoice, entitlement, renewal, proration, tax, refund, chargeback, provider state,
  webhook, or subscription-state correctness; use `payment-integrity-review`.
- The main risk is credit reservation, grant, expiry, balance, capture, reversal, or settlement
  correctness; use `credit-ledger-integrity-review`.
- The main risk is email, SMS, push, webhook, in-app notification delivery, deduplication, consent,
  suppression, or provider receipt; use `notification-delivery-integrity-review`.
- The main risk is new-user signup activation rather than post-purchase retention or reactivation;
  use `product-onboarding-activation-review`.
- The task is involuntary churn caused by failed payment and does not change voluntary retention
  policy; use payment, retry, dunning, and notification skills as appropriate.

<!-- mustflow-section: required-inputs -->
## Required Inputs

- Eligibility ledger: subscription state, plan and billing period, trial or paid state, cancellation
  status, payment health, last core-value event, expected usage cadence, tenure, prior offers,
  discount or credit history, churn reason, geography, consent, and exclusion rules.
- State ledger: active paid, inactive paid, cancel scheduled, paused, resumed-unbilled, first resumed
  payment, later resumed payment, expired, churned, reactivated, refunded, disputed, and terminal
  states with source-of-truth ownership.
- Treatment ledger: no contact, feature or task reminder, support, usage credit, downgrade, pause,
  discount, trial or free-time extension, plan change, and cancellation; eligibility, cost, duration,
  order, exclusivity, and cooldown for each.
- Causal ledger: assignment unit, randomization, no-offer or business-as-usual holdout, exposure,
  natural return, would-have-stayed users, interference, sample-ratio integrity, delayed outcomes,
  and analysis policy.
- Profit ledger: collected revenue, refunds, chargebacks, taxes and fees where applicable, variable
  service cost, credit consumption cost, discount cost, support cost, messaging cost, payment cost,
  reactivation cost, and contribution margin per eligible assigned user.
- Pause ledger: eligible plans, start boundary, duration choices, access and entitlement behavior,
  usage metering, resume date and amount, reminders, extension, early resume, cancellation, payment
  authentication, dispute risk, and post-resume success definition.

<!-- mustflow-section: preconditions -->
## Preconditions

- Keep cancellation available without requiring offer acceptance, support contact, hidden steps, or
  repeated persuasion. Retention optimization does not authorize dark patterns.
- Separate observed acceptance, resumed billing, later paid survival, and incremental causal profit.
  None proves another without the declared evidence.
- Treat vendor benchmarks, case studies, aggregate pause-return rates, churn reasons, discount
  acceptance, and reactivation rates as priors, not transferable effect sizes or default policy.
- Keep command execution under `.mustflow/config/commands.toml`; this skill does not authorize live
  campaigns, production billing changes, credits, discounts, messages, data queries, or experiments.

<!-- mustflow-section: allowed-edits -->
## Allowed Edits

- Add or refine retention policy, churn-reason routing, offer eligibility, experiment assignment,
  holdouts, pause lifecycle, downgrade and credit rules, contribution-margin metrics, event schemas,
  tests, docs, route metadata, and synchronized templates.
- Add a no-contact or business-as-usual control when outreach itself can remind inactive subscribers
  to cancel or natural reactivation can be mistaken for treatment lift.
- Remove broad discounts or fixed offer ladders that ignore current state, churn reason, prior
  behavior, cost, or cannibalization.
- Do not silently alter billing, entitlement, refund, tax, credit, notification consent, or legal
  cancellation behavior while changing the product-policy layer.

<!-- mustflow-section: procedure -->
## Procedure

1. Define the decision unit and business outcome. Use incremental contribution margin per eligible
   assigned user over a declared horizon, with retention and paid survival as explanatory outcomes.
   Offer acceptance and interrupted cancellation are not the optimization target.
2. Segment by authoritative lifecycle state before choosing a treatment. Distinguish active but
   inactive subscribers, cancel-scheduled subscribers, paused subscribers, expired or churned former
   payers, trial users, never-activated payers, and involuntary payment failures.
3. Define inactivity from missing core-value behavior relative to expected product or user cadence.
   Do not make a universal last-login day count authoritative for daily, seasonal, project-based,
   annual, or episodic products.
4. Preserve a no-offer or business-as-usual holdout. Measure natural continuation, natural return,
   cancellation triggered by outreach, and treatment cannibalization. Keep holdout eligibility and
   assignment stable long enough to observe the declared money outcome.
5. Calculate incremental profit from all assigned users. Include collected full-price and discounted
   revenue, pause deferral, refunds, disputes, variable service and credit cost, payment and messaging
   fees, support, and later re-churn. Do not condition the headline result on opening, accepting,
   resuming, or paying.
6. Collect one low-friction cancellation reason when it changes the next remedy, while preserving a
   direct cancellation path and an unknown or decline-to-answer route. Treat free text as evidence,
   not permission to infer sensitive facts or force an offer.
7. Match remedy to mechanism. Use a smaller plan for durable price or capacity mismatch, pause for a
   temporary need gap, task-specific onboarding or support for unrealized value, feature remediation
   for a missing or broken capability, and a bounded price concession only where price sensitivity
   is supported and full-price alternatives are unsuitable.
8. Avoid discount-first policy. An accepted discount may include users who would have stayed or
   returned at full price. Compare it with no offer, downgrade, pause, credit, support, or task
   reminder on incremental contribution rather than acceptance count.
9. Distinguish active-subscriber re-engagement from post-churn win-back. For inactive current payers,
   compare relevant task or feature help with silence before adding a monetary concession. For former
   payers, test full-price re-entry and product-use incentives separately from subscription-price
   discounts.
10. Price usage credits as real variable cost. Bind credit to a value-producing action when useful,
    declare expiry from local cadence and user expectation, prevent cash-like substitution unless
    intended, and route balance correctness through `credit-ledger-integrity-review`.
11. Treat pause as a distinct nonpaying or deferred-paying state, not an active retained customer.
    Track pause entry, scheduled resume, actual resume, first successful resumed payment, later paid
    survival, early cancellation, refund, and dispute separately.
12. Choose pause duration and defaults from billing period, need cadence, seasonality, resume risk,
    cash-flow cost, and provider constraints. Do not copy a universal one-month or three-month order.
    State the resume date and amount clearly and notify the user before automatic resumption under
    applicable consent and consumer rules.
13. Keep offer ownership singular. Prefer one reason-matched primary remedy over a parade of offers.
    If a fallback sequence is necessary, record how earlier offers change eligibility and prevent a
    later discount from taking credit for a user already retained by another mechanism.
14. Preserve stable assignment and treatment history across devices, campaigns, support contacts,
    cancellation retries, plan changes, and later reactivation. Enforce cooldowns so repeated entry
    cannot farm discounts, extensions, pauses, or credits.
15. Use an observation horizon that covers the product's billing and usage cycle plus meaningful
    post-treatment survival. Early save rate, pause acceptance, first resumed payment, or short-term
    reactivation remains preliminary until the declared contribution outcome matures.
16. Analyze heterogeneity only with declared segments and enough support. Plan period, category,
    tenure, prior value, reason, cadence, geography, and cost can change treatment effect; do not turn
    a post-hoc winning slice into automatic eligibility without new validation.
17. Separate policy from execution. Route invoice, entitlement, provider, proration, and refund
    correctness to `payment-integrity-review`; notification delivery and consent to
    `notification-delivery-integrity-review`; credit accounting to `credit-ledger-integrity-review`.
18. Promote a policy only when incremental contribution and guardrails improve for the eligible
    cohort or a preregistered supported segment. Preserve easy cancellation, privacy, support,
    refund, dispute, and reactivation guardrails.

<!-- mustflow-section: postconditions -->
## Postconditions

- Retention policy is state- and reason-aware and has a no-offer or business-as-usual causal baseline.
- The headline metric is incremental contribution per eligible assigned user, not offer acceptance,
  interrupted cancellation, or acceptor-only revenue.
- Natural returners, would-have-stayed subscribers, pause states, resumed billing, later paid
  survival, refunds, and re-churn remain distinguishable.
- Discounts, credits, downgrade, pause, support, and reminders have explicit cost, eligibility,
  cooldown, and cannibalization treatment.
- Cancellation remains direct and user-controlled.

<!-- mustflow-section: verification -->
## Verification

Use configured oneshot command intents when available: `changes_status`, `changes_diff_summary`,
`lint`, `build`, `test_related`, `test`, `docs_validate_fast`, `test_release`, and `mustflow_check`.
Do not infer raw billing, payment-provider, warehouse, campaign, credit, experiment, or production
commands.

<!-- mustflow-section: failure-handling -->
## Failure Handling

- If no holdout or credible causal comparison exists, report acceptance and cohort outcomes as
  observational and do not label them incremental saves or profit.
- If billing or entitlement state is ambiguous, stop offer automation until the authoritative state
  is reconciled.
- If pause resume, later payments, refunds, or disputes have not matured, keep the result preliminary.
- If a monetary offer wins only on save rate but loses contribution margin, reject it as a profit
  policy.
- If cancellation requires accepting or exhausting offers, restore a direct path before optimizing
  retention.

<!-- mustflow-section: output-format -->
## Output Format

- Eligible lifecycle states, cadence, and assignment unit
- Holdout, exposure, natural-return, and cannibalization evidence
- Churn reason and reason-matched treatment policy
- Incremental contribution components and observation horizon
- Pause, resume, payment-survival, refund, and re-churn states
- Discount, downgrade, credit, support, reminder, and no-offer decisions
- Billing, credit, notification, privacy, and cancellation boundaries
- Files changed
- Command intents run and skipped checks
- Remaining subscription-retention profit risk

