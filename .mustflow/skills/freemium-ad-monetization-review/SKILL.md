---
mustflow_doc: skill.freemium-ad-monetization-review
locale: en
canonical: true
revision: 2
lifecycle: mustflow-owned
authority: procedure
name: freemium-ad-monetization-review
description: Apply this skill when a product changes free-tier generosity, hard or soft limits, ad-supported access, interstitial or rewarded-ad placement, first-value ad suppression, frequency caps, result gates, premium ad removal, free-user variable cost, ad cannibalization, conversion, retention, or per-eligible-user contribution and must monetize free use without holding core value hostage or optimizing impression revenue at the expense of durable product value.
metadata:
  mustflow_schema: "1"
  mustflow_kind: procedure
  pack_id: mustflow.core
  skill_id: mustflow.core.freemium-ad-monetization-review
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

# Freemium Ad Monetization Review

<!-- mustflow-section: purpose -->
## Purpose

Design free access, product limits, and advertising as separate levers. Let eligible users receive
enough owned value to judge the product, then monetize repeat use or scale without interrupting active
work, withholding a completed core result, or mistaking ad impressions and paywall conversion for
long-horizon contribution.

<!-- mustflow-section: use-when -->
## Use When

- A product compares generous ad-supported free use with ad-free limited use, a hard paywall, a
  metered free plan, or a mixed free tier.
- Free access changes feature, usage, speed, batch, quality, export, storage, automation,
  collaboration, history, API, or support limits.
- Interstitial, app-open, pre-content, mid-task, processing-wait, pre-result, post-result, or rewarded
  ad placement, eligibility, frequency, suppression, or failure behavior changes.
- A report compares free-to-paid conversion, ad revenue, user acquisition, retained value, server
  cost, ad SDK cost, or contribution per eligible user.

<!-- mustflow-section: do-not-use-when -->
## Do Not Use When

- The main risk is game death, lives, energy, revive, progression fairness, or finite-content pacing;
  use `game-economy-monetization-review`.
- The task only chooses product price, billing cadence, trial card collection, or subscription versus
  usage pricing; use `pricing-model-integrity-review`.
- The task only changes signup, sample-to-own transfer, or first-value onboarding without a free-plan
  or advertising decision; use `product-onboarding-activation-review`.
- The main risk is ad SDK integration, provider fill, callback integrity, consent collection,
  tracking, attribution, child-directed treatment, or platform policy. Use the matching advertising,
  privacy, security, or provider owner.
- The task is result watermarking, embedded service attribution, affiliate or influencer commission,
  or promotion between owned products rather than paid or rewarded advertising inventory; use
  `growth-distribution-integrity-review`.

<!-- mustflow-section: required-inputs -->
## Required Inputs

- Value ledger: eligible user, core job, first owned result, completion, export or possession,
  time-to-value, repeat cadence, retained use, and paid value.
- Free-tier ledger: features, usage, scale, speed, quality, export, storage, history, automation,
  collaboration, API, support, reset, abuse controls, and variable cost.
- Ad ledger: format, placement, natural transition, explicit choice, reward, eligibility, first-value
  suppression, frequency, session and time caps, load state, failure path, latency, revenue, fees,
  privacy, consent, age, accessibility, and platform constraints.
- Paid ledger: price, entitlement, ad removal, lifted limits, conversion, churn, refunds, disputes,
  support, variable cost, and retained contribution.
- Experiment ledger: pre-gate assignment, holdout, exposure, free-plan and ad versions, traffic,
  horizon, interference, guardrails, and promotion rule.

<!-- mustflow-section: preconditions -->
## Preconditions

- Separate how much free value exists, whether ads exist, which ad format is used, where it appears,
  and how often it appears. These are not one binary decision.
- Define an observable user-owned value event before setting the first restriction or forced ad.
- Assign before the first free limit, paywall, or ad opportunity and retain abandoners in the
  intent-to-treat denominator.
- Treat hard-paywall benchmarks, ad revenue averages, first-result counts, task intervals, minute
  caps, and another product's limit as hypotheses, not defaults.
- Refresh current ad-platform, privacy, consent, age, accessibility, and jurisdiction constraints;
  this skill does not authorize live ads, tracking, prices, experiments, or messages.

<!-- mustflow-section: allowed-edits -->
## Allowed Edits

- Add or refine free-value boundaries, repeat or scale limits, ad placement and suppression,
  voluntary rewards, failure-safe continuation, frequency policy, premium treatment, contribution
  metrics, experiment events, fixtures, tests, docs, route metadata, and synchronized templates.
- Remove first-value interception, mid-edit interruption, pre-result hostage ads, fake rewarded-ad
  choice, ad-load blocking, or limits that prevent a user from evaluating the core job.
- Do not conceal an ad behind a product action, delay a ready result to finish an ad, or claim that a
  paid plan is ad-free when ads or equivalent sponsored interruptions remain.

<!-- mustflow-section: procedure -->
## Procedure

1. Split five decisions: free value, repeat or scale limit, ad format, ad placement, and frequency.
   Do not compare bundles without naming which mechanism changed.
2. Define the full-funnel outcome per eligible assigned user. Include first owned value, retained
   use, paid conversion, subscription and purchase net revenue, ad net revenue, refunds, support,
   variable service cost, reward cost, ad SDK cost, latency, and long-horizon contribution.
3. Give enough free access to complete and possess a representative core result where product cost,
   safety, and abuse permit. Restrict later repetition, scale, speed, batch, premium quality,
   advanced export, storage, automation, collaboration, or API according to product value and cost.
4. Do not universalize one free result. Derive the evaluation allowance from time-to-value, result
   variance, trust needed, marginal cost, abuse, and whether one result is representative.
5. Price the ad-supported audience honestly. Compare cumulative ad net revenue with lost paid
   conversion, delayed payment, variable service and support cost, performance harm, retention, and
   acquisition value. Ad gross revenue is not free-user profit.
6. Match the free model to product physics. High-frequency, low-marginal-cost content can support
   more ad-funded use; episodic or variable-cost production may need tighter repeat or scale limits.
   Treat this as a candidate model, not a product-category law.
7. Place forced interstitials only at a genuine natural transition after the current value has been
   delivered, such as leaving a completed result or moving to a new unit. Do not interrupt input,
   editing, active problem solving, checkout, safety actions, or accessibility flows.
8. Never hold the completed core result behind a forced ad. Let the user inspect and retain what the
   product promised before monetizing the transition to another task or optional benefit.
9. Treat pre-content ads as context-dependent. They can fit expected long-form consumption after the
   user understands the service, but not an unfamiliar product's first attempt or first owned value.
10. Treat processing time as an ad opportunity only when input is complete, the ad does not delay
    the result, declining or ad failure does not delay it, and the user will not wait twice. Do not
    add artificial processing time.
11. Keep rewarded ads genuinely optional. Name the incremental benefit before choice, preserve the
    ordinary path, and do not call a required ad rewarded merely because it unlocks the core result.
12. Make ad unavailability failure-safe. If a forced ad is not ready or cannot display, continue the
    product transition; if a voluntary reward cannot be earned, explain that state without consuming
    the attempt or withholding already earned value.
13. Derive frequency from cumulative harm and value cadence. Use first-value suppression, minimum
    spacing, session caps, consecutive-ad prevention, and context cancellation where supported, but
    do not copy universal task counts or minute intervals.
14. Keep premium treatment explicit. Define whether payment removes forced ads, rewarded-ad choices,
    both, or neither; if a subscriber receives a no-ad reward, preserve the declared eligibility and
    economic cap rather than creating unlimited value accidentally.
15. Measure ad displacement by declared pre-experiment payer state and purchase propensity without
    applying hidden rules to payers. Track first-purchase delay, plan conversion, downgrade, IAP,
    reward use, and retained contribution.
16. Account for privacy, age, consent, accessibility, data transfer, SDK startup, crashes, binary
    size, battery, network use, and page or app performance as product costs and release guardrails.
17. Keep placement, plan, frequency, and reward versions reconstructable across exposure and payment.
    Sequence tests when traffic cannot identify several mechanisms at once.
18. Promote only a reversible policy that improves eligible-user contribution without lowering
    first owned value, holding results hostage, interrupting active work, or violating current ad,
    privacy, age, accessibility, and platform authority.

<!-- mustflow-section: postconditions -->
## Postconditions

- Free value, limits, ad presence, format, placement, and frequency remain separate decisions.
- A representative owned result precedes the first forced monetization boundary where allowed.
- Forced ads use natural transitions and do not block input, active work, or result inspection.
- Rewarded ads are optional and ad unavailability cannot consume earned product value.
- The headline result uses eligible users and net contribution with conversion, retention, cost,
  performance, privacy, and ad-cannibalization guardrails.

<!-- mustflow-section: verification -->
## Verification

Use configured oneshot command intents when available: `changes_status`, `changes_diff_summary`,
`lint`, `build`, `test_related`, `test`, `docs_validate_fast`, `test_release`, and `mustflow_check`.
Do not infer live ad-network, analytics, consent, billing, experiment, deployment, or production
commands.

<!-- mustflow-section: failure-handling -->
## Failure Handling

- If the first owned value event is undefined, do not introduce a forced ad or harsher free limit.
- If ad and limit variants change together, report the result as a bundle effect and do not claim the
  winning mechanism is known.
- If only exposed ad viewers are analyzed, report observational evidence rather than eligible-user
  incrementality.
- If an ad is unavailable and the product path blocks, restore failure-safe continuation before
  tuning fill or revenue.
- If net ad revenue rises while first value, retained use, paid contribution, performance, privacy,
  accessibility, or support guardrails worsen, reject or narrow the policy.

<!-- mustflow-section: output-format -->
## Output Format

- Eligible cohort, first owned value, free allowance, limits, and variable cost
- Ad-supported versus restricted contribution and cannibalization result
- Ad format, placement, natural transition, first-value suppression, and failure path
- Reward, opt-in, frequency, spacing, cap, premium treatment, and accessibility policy
- Paid conversion, ad net revenue, retained value, cost, privacy, and performance evidence
- Files changed
- Command intents run and skipped checks
- Remaining freemium-ad monetization risk
