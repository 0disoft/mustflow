---
mustflow_doc: skill.credit-monetization-integrity-review
locale: en
canonical: true
revision: 1
lifecycle: mustflow-owned
authority: procedure
name: credit-monetization-integrity-review
description: Apply this skill when a product changes credit-pack offers, offer timing, price-discount versus bonus-credit framing, pack count or spacing, first-purchase recommendations, purchased-credit expiry, subscription-credit rollover, promotional balances, spend order, credit price disclosure, variable-cost estimates, quote and reservation UX, breakage, repurchase, retention, or credit-monetization experiments and must optimize long-horizon contribution without deceptive equivalence, balance-rights drift, surprise deductions, or survivor-biased metrics.
metadata:
  mustflow_schema: "1"
  mustflow_kind: procedure
  pack_id: mustflow.core
  skill_id: mustflow.core.credit-monetization-integrity-review
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

# Credit Monetization Integrity Review

<!-- mustflow-section: purpose -->
## Purpose

Sell and spend product credits without optimizing a checkout click, early breakage, or raw execution
count at the expense of customer rights, useful output, repurchase, retention, or long-horizon
contribution. Keep offer design, balance-class policy, user-visible price authorization, technical
ledger integrity, payment processing, accounting, and legal or platform compliance as connected but
separately owned contracts.

<!-- mustflow-section: use-when -->
## Use When

- A credit or usage-pack offer changes timing, trigger, eligibility, discount, bonus, limit, expiry,
  urgency, recommendation, or first-purchase treatment.
- A product compares price-discount and bonus-credit framing or changes how credits translate into
  images, minutes, tasks, API calls, documents, generations, or other user-recognizable output.
- The first-purchase screen changes between three, five, seven, custom, tiered, decoy, anchored, or
  recommended credit packs, or changes price and unit-price spacing.
- Purchased top-up, subscription-included, promotional, referral, trial, refund, or enterprise
  credits change expiry, rollover, cancellation, downgrade, transfer, refund, or spend-order policy.
- A feature changes from hidden or post-execution deduction to an exact or bounded pre-execution
  quote, maximum authorization, reservation, success-based capture, partial settlement, or release.
- Credit conversion, repurchase, breakage, retained use, contribution, variable cost, refund, support,
  or experiment definitions are created, changed, reviewed, or reported.

<!-- mustflow-section: do-not-use-when -->
## Do Not Use When

- The main risk is atomic balance mutation, lot allocation, reservation state, idempotency,
  concurrency, expiry races, refunds, reconciliation, or admin adjustment; use
  `credit-ledger-integrity-review` as the technical owner.
- The main risk is checkout, provider payment, tax, invoice, receipt, refund, dispute, chargeback,
  fraud, or payment webhook correctness; use `payment-integrity-review`.
- The main risk is cancellation, pause, downgrade, dormant-user win-back, or save-offer profit; use
  `subscription-retention-profit-review`.
- The main risk is signup, pre-account activation, first-owned value, or onboarding questions without
  a credit purchase or spend policy; use `product-onboarding-activation-review`.
- The task only estimates internal model or compute cost and does not change a user credit right,
  price, purchase, or deduction; use the matching cost-control skill.
- The task requests jurisdiction-specific legal, tax, accounting, or unclaimed-property advice. Use
  qualified authority and current primary rules; this skill supplies the product evidence packet but
  does not decide legal classification.

<!-- mustflow-section: required-inputs -->
## Required Inputs

- Eligible-cohort ledger: eligibility, assignment unit and time, holdout, exposure, offer trigger,
  identity joins, exclusions, prior-purchase state, product-value state, traffic, and denominator.
- Offer ledger: offer version, trigger, surface, interruption cost, real start and expiry, pack scope,
  discount or bonus, cap, eligibility, cooldown, price history, and suppression.
- Value and usage ledger: first owned result, recognizable output units, free and paid usage, expected
  cadence, depletion, active-user usage distribution, useful-result rate, and abandoned or failed use.
- Pack ledger: price, credits, unit price, output-equivalent range, variable cost, margin, recommended
  segment, lower and upper alternatives, custom amount, refundability, and historical selection.
- Balance-rights ledger: acquisition class, consideration paid, policy and price version, expiry,
  rollover, cancellation or downgrade behavior, refund, transfer, spend priority, platform rule,
  jurisdiction review, and accounting treatment.
- Quote and execution ledger: input parameters, exact or estimated charge, estimate range, maximum
  authorization, quote ID and expiry, price version, reservation, actual charge, usable-result
  predicate, partial-result rule, release, reversal, and retry identity.
- Economics ledger: cash collected, payment and refund cost, variable service cost, support and
  dispute cost, bonus liability, deferred or recognized revenue boundary, breakage, repurchase,
  retention, and contribution per eligible unit over declared horizons.
- Experiment ledger: control and variants, sequencing, power assumptions, exposure integrity,
  cannibalization, stockpiling, delayed repurchase, guardrails, segment policy, and promotion rule.

<!-- mustflow-section: preconditions -->
## Preconditions

- Define the user-owned value event, balance classes, and usable-result predicate before changing an
  offer, expiry, rollover, pack, or deduction policy.
- Assign experiments before a behavior-dependent offer trigger. Keep assigned users who never reach
  the trigger in the intent-to-treat denominator, while recording trigger reach and exposure
  separately.
- Refresh current platform, app-store, jurisdiction, contract, accounting, and tax constraints before
  changing purchased-value expiry, cancellation forfeiture, restore, refund, or price representation.
- Treat vendor policies, academic studies, benchmark rates, sample prices, pack ratios, and another
  product's rollover cap as hypotheses or comparators, not repository defaults.
- Keep command execution under `.mustflow/config/commands.toml`; this skill does not authorize live
  price changes, promotions, balance mutations, payments, messages, experiments, or legal filings.

<!-- mustflow-section: allowed-edits -->
## Allowed Edits

- Add or refine offer eligibility and timing, equivalent-value calculation, pack construction and
  recommendation, output-unit translations, balance-class policy, expiry and rollover rules,
  user-visible quote and authorization, contribution metrics, experiment assignment, guardrails,
  fixtures, tests, docs, route metadata, and synchronized templates.
- Add explicit handoffs to credit-ledger, payment, accounting, tax, privacy, consumer-protection, or
  platform review when those owners must implement or approve the policy.
- Remove fake urgency, economically unequal framing tests presented as copy tests, dominated decoy
  packs, hidden deductions, unsupported exact estimates, or breakage targets that reward unused value.
- Do not retroactively rewrite purchased rights, expire balances contrary to an applicable platform
  or legal rule, hide a required total price, or capture credits for an unusable result merely because
  an internal provider incurred cost.

<!-- mustflow-section: procedure -->
## Procedure

1. Separate six decisions: offer timing, economic framing, pack architecture, balance rights,
   user-visible spend authorization, and ledger settlement. Do not let one winning purchase metric
   silently choose the other five.
2. Define the headline outcome per eligible assigned user. Prefer incremental contribution over a
   declared short and long horizon, supported by paid conversion, useful paid output, depletion-
   adjusted repurchase, retained use, refunds, disputes, support, and variable cost. Treat offer open,
   checkout start, raw purchase rate, raw executions, and breakage as diagnostic events.
3. Randomize before the offer can become eligible. Compare a no-offer or business-as-usual holdout
   with bounded timing policies such as account completion, first owned value, a declared depletion
   state, or a time-based reminder. Do not analyze only users who reached first success or depleted a
   free balance.
4. Price interruption cost. Before value, a full-screen offer can block activation; after value, an
   offer may extend a proven job; near depletion, exposed users are fewer but intent may be stronger.
   Preserve a nonblocking path and do not copy a universal best trigger.
5. Anchor any real deadline to the event that creates eligibility and disclose the exact expiry.
   Preserve the offer after refresh and across devices when promised. Do not restart countdowns,
   invent scarcity, or begin a value-dependent offer before the user could receive value.
6. Normalize economic value before testing copy. For price discount `d`, the paid unit-price factor
   is `1 - d`. For bonus fraction `b`, it is `1 / (1 + b)` and the effective unit discount is
   `b / (1 + b)`. An equivalent bonus for discount `d` is `d / (1 - d)`. Hold unit economics equal
   when the question is framing, or label the test as an offer-value test.
7. Translate credits into user-recognizable output. Show total credits, unit price or savings, and a
   bounded result-equivalent derived from current product prices. Use ranges when input length,
   duration, model, quality, or external calls vary; do not promise one exact output count from an
   unstable mix.
8. Measure bonus inventory correctly. Extra credits can delay the next purchase without reducing
   satisfaction. Track consumption velocity, balance depletion, repurchase after comparable
   depletion, cumulative cash, contribution, and retained useful output rather than declaring an
   early repurchase decline a retention failure.
9. Price promotional cannibalization and stockpiling. Include buyers who would have paid full price,
   bonus credits actually consumed, future purchases displaced, refund and support cost, and heavy
   users who pull demand forward. Cap scope from observed economics, not a universal percentage.
10. Build pack candidates from usage and willingness evidence. Use the lower pack for safe entry, the
    recommended pack for a declared typical segment or task horizon, and the upper pack for genuine
    high usage. Price gaps, credit gaps, and unit discounts must be legible and economically viable.
11. Start with the smallest pack set that represents materially different jobs. Three packs are a
    useful first-purchase hypothesis, not a law. Compare three with five when added tiers map to real
    segments; expose more tiers or custom amounts to repeat or high-variance buyers when evidence
    supports them. Do not add seven merely to create an anchor.
12. Reject fake decoys. A deliberately dominated pack can make the entire credit system look
    manipulated. Each displayed pack needs a plausible buyer, a clear output-equivalent, and a reason
    to exist other than making another pack look cheap.
13. Keep recommendation honest. Name the usage basis, avoid preselecting a pack that exceeds the
    represented need, make every alternative and unit price visible, and measure regret, refunds,
    support, depletion, and repeat purchase by selected pack.
14. Classify every balance lot by acquired right. Separate purchased top-up, subscription-included,
    promotional or referral, trial, refund, enterprise commitment, and admin grant when consideration,
    expiry, rollover, restore, cancellation, accounting, platform, or legal rights differ.
15. Do not treat purchased-credit expiry as free margin. Cash arrives at purchase; unused rights can
    change future service cost and revenue recognition but can also reduce conversion, trust,
    repurchase, and retained value. Compare lawful policy variants by long-horizon contribution and
    never use breakage alone as the objective.
16. Gate expiry through current authority. Record platform and jurisdiction, product classification,
    customer type, contract version, notice, restore, refund, inactivity, unclaimed-property, and
    accounting treatment. If authority is unresolved, preserve the more durable purchased right and
    keep promotional or subscription policy separate rather than guessing.
17. Derive subscription rollover from cost and retention evidence. Compare full reset, bounded
    rollover, and other lawful policies using maximum liability, usage bursts, concurrency, capacity,
    cancellation or downgrade behavior, and long-horizon cohort contribution. A one-cycle or
    multiple-of-quota cap is a candidate, not a universal default.
18. Spend lots by explicit rights. Prefer the balance that would lawfully expire sooner when doing so
    preserves user value, but keep refunds, tax, enterprise commitments, negative balances, plan
    changes, and policy snapshots reconstructable. Never consume durable purchased value first merely
    to manufacture subscription breakage.
19. Preserve price-version meaning. Snapshot the feature price, pack price, bonus, output-equivalent,
    policy, and conversion rule used at purchase and execution. Review whether later feature-price
    changes lawfully alter old credit purchasing power; do not hide retroactive devaluation behind a
    nominally unchanged balance.
20. Show spend before execution. Display an exact charge when inputs fix the cost. Otherwise show a
    defensible range and maximum authorization, the factors that can change it, remaining balance,
    and what happens on failure or cancellation. Price visibility need not require a blocking modal
    for every low-cost repeat action.
21. Use a quote-reserve-settle flow. Create an expiring `quote_id` bound to actor, product, input hash,
    price version, policy, exact or maximum amount, and idempotency identity; reserve atomically;
    execute once; capture the allowed actual amount for a usable result; and release the remainder on
    lower usage, failure, cancellation, or recovered timeout. Route ledger correctness through
    `credit-ledger-integrity-review`.
22. Define usable and partial results before charging. Distinguish full success, declared partial
    value, user cancellation, safety refusal, provider failure, product defect, timeout with unknown
    outcome, and duplicate retry. Internal compute cost does not by itself prove customer value or
    authorize a deduction.
23. Add confirmation only when consequence warrants it. Consider spend share, cash top-up, unusual
    model or quality, irreversible output, variable maximum, or first use. Let users remember a safe
    choice with an accessible way to inspect and change it; do not copy a universal balance percentage.
24. Separate product, ledger, payment, and accounting evidence. A product experiment can recommend a
    policy but cannot prove atomic balances, provider settlement, tax treatment, or revenue
    recognition. Require the matching specialist evidence before reporting the full system ready.
25. Predeclare guardrails and analysis. Include activation interruption, useful-output rate, latency,
    stockpiling, depletion, unit cost, p95 cost, refunds, support, disputes, accessibility, platform
    rejection, legal review, accounting uncertainty, and segment heterogeneity. Correct repeated
    peeking and do not ship a post-hoc segment as established.
26. Promote only a reversible policy whose eligible-cohort contribution improves without violating
    purchased rights, transparent pricing, useful-result charging, ledger integrity, or platform and
    legal constraints. Preserve old policy snapshots and a rollback path for future transactions.

<!-- mustflow-section: postconditions -->
## Postconditions

- Offer timing uses pre-trigger assignment, a holdout, an eligible-cohort denominator, and both
  activation and long-horizon contribution guardrails.
- Discount and bonus framing is compared at equal unit economics or explicitly labeled unequal.
- Pack count and spacing follow real usage segments, legible unit economics, and non-dominated jobs
  rather than a universal tier count or copied price ratio.
- Purchased, subscription, promotional, trial, enterprise, refund, and admin balances retain distinct
  policy snapshots, expiry or rollover rights, and spend order where their contracts differ.
- Expiry and rollover decisions name current platform, jurisdiction, accounting, cost, capacity,
  cancellation, and long-horizon retention evidence or remain unresolved.
- Every execution shows an exact or bounded price before authorization and settles a quote through
  reserve, usable-result capture, and release or reversal.
- Breakage, raw execution, checkout start, and trigger-reached conversion remain diagnostics rather
  than standalone proof of monetization success.

<!-- mustflow-section: verification -->
## Verification

Use configured oneshot command intents when available: `changes_status`, `changes_diff_summary`,
`lint`, `build`, `test_related`, `test`, `docs_validate_fast`, `test_release`, and `mustflow_check`.
Do not infer raw analytics, warehouse, payment-provider, balance-mutation, accounting, experiment,
deployment, or production commands.

<!-- mustflow-section: failure-handling -->
## Failure Handling

- If discount and bonus variants have different unit economics, stop calling the result a framing
  effect and report the actual effective discount and margin difference.
- If assignment begins after first value or depletion, report trigger-conditioned evidence and do
  not generalize it to the eligible signup or visitor cohort.
- If traffic cannot support timing, framing, and pack tests together, sequence them and keep the
  remaining decisions as hypotheses rather than bundling mechanisms into one opaque variant.
- If purchased-right expiry or cancellation forfeiture lacks current platform, jurisdiction,
  contract, and accounting evidence, preserve the existing durable right and route the decision to
  qualified authority.
- If balance classes cannot be reconstructed, do not introduce a new expiry, rollover, or spend-order
  policy until the ledger can preserve acquisition source and policy version.
- If a variable-cost action cannot produce a defensible estimate, set a conservative authorized
  maximum or block the paid path; do not advertise fake precision or surprise-charge afterward.
- If execution outcome is unknown, keep the reservation pending or reconcile it under a bounded
  policy; do not capture or release based only on a client timeout.
- If short-horizon purchase or breakage rises while useful output, contribution, repurchase,
  retention, refunds, disputes, support, or trust guardrails worsen, reject or narrow the treatment.

<!-- mustflow-section: output-format -->
## Output Format

- Eligible cohort, assignment, trigger, exposure, holdout, and denominator
- Offer timing, interruption, urgency, eligibility, and suppression decision
- Discount and bonus economic-equivalence calculation and framing result
- Pack count, segment, output-equivalent, price spacing, recommendation, and margin decision
- Balance classes, purchased rights, expiry, rollover, cancellation, restore, and spend-order policy
- Exact or bounded quote, maximum authorization, reserve, usable-result capture, and release contract
- Short- and long-horizon contribution, depletion-adjusted repurchase, cost, refund, support, dispute,
  activation, retention, platform, legal, accounting, and trust evidence
- Files changed
- Command intents run and skipped checks
- Remaining credit-monetization risk

