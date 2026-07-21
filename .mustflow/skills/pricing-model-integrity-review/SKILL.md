---
mustflow_doc: skill.pricing-model-integrity-review
locale: en
canonical: true
revision: 2
lifecycle: mustflow-owned
authority: procedure
name: pricing-model-integrity-review
description: Apply this skill when a product changes card-required or cardless trials, paid starter offers, lifetime or founder access, local-currency presentment, regional pricing, subscription versus usage-based or hybrid monetization, price levels, price elasticity, annual prepay, or annual discounts and must optimize eligible-cohort contribution without deceptive renewal, unbounded future-cost rights, geographic arbitrage, cash-revenue confusion, or copied benchmark defaults.
metadata:
  mustflow_schema: "1"
  mustflow_kind: procedure
  pack_id: mustflow.core
  skill_id: mustflow.core.pricing-model-integrity-review
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

# Pricing Model Integrity Review

<!-- mustflow-section: purpose -->
## Purpose

Choose trial, access-right, geographic, monetization-model, price-level, and billing-cadence policy
from retained user value and long-horizon contribution rather than trial-to-paid conversion, launch
cash, payer-only ARPU, or annual cash collection. Keep product economics, payment execution,
entitlements, accounting, tax, fraud, consumer consent, and legal authority connected but separately
owned.

<!-- mustflow-section: use-when -->
## Use When

- A free trial changes whether a payment method is required, when it is collected, whether renewal is
  automatic, or whether a small paid starter is offered instead.
- A lifetime deal, founder pass, perpetual tier, early-access package, or prepaid long-duration right
  changes price, included usage, support, upgrades, transfer, or future service obligations.
- Checkout changes between a single base currency, local-currency presentment, manual currency prices,
  or regional purchasing-power bands.
- A product chooses or changes subscription, metered usage, credit, seat, outcome, or hybrid base-plus-
  usage pricing and its customer-visible value metric.
- Monthly prices, packages, entitlements, anchors, elasticity experiments, ARPU, conversion, churn, or
  contribution claims are created, changed, reviewed, or reported.
- Annual prepay, monthly billing, annual discounts, months-free copy, included allowances, renewal,
  refund, cash-flow, bookings, recognized revenue, or contribution comparisons change.

<!-- mustflow-section: do-not-use-when -->
## Do Not Use When

- The main risk is credit-pack count, bonus versus discount framing, purchased-credit expiry,
  rollover, spend order, or quote-reserve-settle behavior; use
  `credit-monetization-integrity-review`.
- The main risk is LLM token versus task units, standard versus precision model packaging, managed
  provider cost, BYOK, customer-supplied API keys, or LLM failed-work charging; use
  `llm-product-monetization-review`.
- The main risk is provider checkout, invoice, recurring-payment state, tax calculation, refund,
  dispute, chargeback, fraud control, webhook, or payment credential storage; use
  `payment-integrity-review`.
- The main risk is cancellation, pause, downgrade, save offers, or dormant-user win-back; use
  `subscription-retention-profit-review`.
- The main risk is signup friction, first-owned value, sample results, or onboarding without a trial
  payment or price-model decision; use `product-onboarding-activation-review`.
- The task requests jurisdiction-specific legal, tax, accounting, consumer-credit, or revenue-
  recognition advice. Use current qualified authority; this skill prepares the evidence packet and
  product contract but does not make that classification.

<!-- mustflow-section: required-inputs -->
## Required Inputs

- Eligible-cohort ledger: eligible visitor or account, assignment before the pricing gate, exposure,
  activation, first owned value, trial start, paid conversion, refund, chargeback, retained paid use,
  exclusions, identity joins, segment, and denominator.
- Value and cost ledger: user-recognizable value metric, value cadence, marginal service cost,
  payment and platform fees, tax treatment, support, refund, dispute, abuse, capacity, cost variance,
  and active-user usage distribution.
- Trial and consent ledger: payment-method requirement, collection time, trial entitlement, exact end
  date, renewal price and cadence, consent evidence, reminder, cancellation path, descriptor, receipt,
  refund policy, abuse control, and applicable platform or jurisdiction review.
- Lifetime-obligation ledger: net proceeds, acquisition cost, included rights, seats, storage,
  compute or credits, support, future modules, excess usage, refunds, taxes, reserve, active-life
  distribution, heavy-user tail, cost inflation, subscription cannibalization, and transfer policy.
- Currency and region ledger: integration and settlement currency, presentment currency, exchange
  rate and fee, manual price, regional band, price floor, billing entity, payment-country and tax
  evidence, customer type, relocation, travel, grace, reverification, grandfathering, and arbitrage.
- Model and meter ledger: subscription allowance, usage unit, meter ingestion and reconciliation,
  value-to-cost coupling, usage predictability, spend cap, alert, overage, budget expectation,
  entitlement, and buyer procurement need.
- Price and package ledger: price version, currency, tax display, entitlement, target segment,
  eligible-user conversion, payer revenue, retained use, churn, refund, support, contribution, and
  migration or grandfathering policy.
- Annual-prepay ledger: monthly and annual net price, honest equivalent discount, cash timing,
  payment fees, refunds, disputes, servicing cost timing, renewal, survival curve, discount
  cannibalization, cost inflation, capital value, bookings, and recognized-revenue boundary.
- Experiment ledger: decision under test, control and variants, preassignment, packaging parity,
  power and horizon, interference, repeated looks, guardrails, promotion rule, and rollback.

<!-- mustflow-section: preconditions -->
## Preconditions

- Separate local-currency presentment from a regional price reduction. Currency conversion changes
  how a price is shown and paid; purchasing-power pricing changes the economic price.
- Separate cash collected, bookings, recognized revenue, and contribution. None can substitute for
  another merely because payment occurred up front.
- Assign before card collection, trial entry, package exposure, or price visibility when measuring
  full-funnel impact. Keep people who abandon the gate in the intent-to-treat denominator.
- Refresh current platform, payment-network, provider, jurisdiction, tax, accounting, cancellation,
  reminder, and refund authority before changing negative-option renewal, stored credentials,
  regional eligibility, perpetual rights, or annual prepay.
- Treat vendor benchmarks, copied price points, fixed country multipliers, universal annual discount
  rates, and another product's lifetime assumptions as priors or experiment candidates, not defaults.
- Keep command execution under `.mustflow/config/commands.toml`; this skill does not authorize live
  prices, plans, entitlements, payments, refunds, messages, experiments, migrations, or filings.

<!-- mustflow-section: allowed-edits -->
## Allowed Edits

- Add or refine pricing policy, trial consent and reminder contracts, lifetime-right boundaries,
  regional eligibility, local-currency display, monetization metrics, metering, price experiments,
  annual-prepay economics, event schemas, fixtures, tests, docs, route metadata, and synchronized
  templates.
- Add explicit handoffs to payment, credit, entitlement, fraud, accounting, tax, privacy,
  consumer-protection, or platform owners when their evidence is required.
- Remove trial-to-paid-only optimization, unlimited variable-cost lifetime promises, IP-only regional
  eligibility, hidden renewal, fake price localization, payer-only ARPU claims, or annual-cash claims
  that omit future delivery and refund obligations.
- Do not retroactively reduce paid rights, convert a cardless trial into recurring billing without
  fresh consent, misstate discount equivalence, or spend prepaid cash as if no future service remains.

<!-- mustflow-section: procedure -->
## Procedure

1. Split the work into six decisions: trial credential policy, lifetime or long-duration access,
   currency and regional pricing, monetization model and value metric, price level and packaging, and
   billing cadence or annual discount. Do not let one conversion metric silently decide all six.
2. Define the headline outcome per eligible assigned user over declared short and long horizons.
   Prefer incremental contribution supported by activation, paid conversion, useful paid output,
   retained paid use, refund, dispute, support, fraud, and variable cost. Keep trial-to-paid, payer
   ARPPU, bookings, and cash collected as diagnostics.
3. Evaluate cardless, card-required, and small paid-starter candidates from time-to-value, trial
   abuse, marginal cost, buyer intent, trust, and ownership boundaries. There is no universal winner.
   Collecting payment at a real cost or durable-ownership boundary is a candidate, not a rule.
4. Measure the entire trial funnel. A card-required trial can raise conversion among starters while
   losing eligible visitors before trial. Compare eligible-to-value, eligible-to-paid, refunds,
   chargebacks, cancellation, support, retained paid use, and contribution, not starter-to-paid alone.
5. Make recurring conversion explicit. Before trial start, state the entitlement, exact trial end,
   renewal amount and cadence, payment method, cancellation route, and refund rule. Preserve consent
   evidence, send required reminders, use a recognizable descriptor and receipt, and keep online
   cancellation at least as easy as the applicable authority requires.
6. Separate product friction from payment control. Use identity, rate, device, workload, or risk
   controls proportionate to abuse without forcing every honest visitor through a stored credential.
   Route credential storage, risk scoring, authentication, disputes, and provider state through
   `payment-integrity-review`.
7. Model a lifetime offer as a current cash receipt plus a long-lived delivery obligation. Define
   exactly what is perpetual: product version, core features, account access, support, seats, storage,
   usage allowance, updates, future modules, and transfer. Do not let the word lifetime define these
   rights implicitly.
8. Calculate cash break-even and economic break-even separately. Deduct fees, taxes, refunds,
   acquisition, support, expected service cost across active life, capacity, reserve, and the
   contribution of subscriptions displaced by the offer. Declare the horizon and uncertainty.
9. Stress the lifetime model against heavy-user share, usage-tail size, longer survival, higher
   external cost, support concentration, concurrent use, resale, and high-cost future features.
   Average usage alone is not proof that an unlimited promise is affordable.
10. Bound future-cost rights. Prefer declared seats, storage, compute, credits, fair-use enforcement,
    or separately paid excess usage where marginal cost persists. Preserve paid core access while
    making optional future modules and variable-cost expansion explicit before purchase.
11. Reserve for remaining delivery. Do not treat all launch cash as spendable profit. Record the
    reserve method, usage and survival assumptions, release conditions, and qualified accounting
    review; update them when cost or active-life evidence changes.
12. Localize currency independently of price. Show exchange rate, conversion or platform fee,
    settlement behavior, refund behavior, supported recurring methods, and rounding. Compare customer
    total and payment completion; do not call a currency conversion a purchasing-power discount.
13. Use purchasing-power data only as a prior. Derive a regional price floor from marginal service
    cost, payment and platform fees, taxes where borne, support, refund and fraud cost, and required
    contribution. Validate willingness to pay and retained contribution with product cohorts.
14. Start regional pricing with the fewest materially distinct bands the evidence supports. A fixed
    three-band, four-band, or copied country ratio is not a law. Keep manual overrides and country
    additions versioned and review small or volatile markets before merging them into a band.
15. Determine regional eligibility from the lawful billing relationship and multiple consistent
    signals such as billing entity, payment country, tax evidence, account history, and customer
    type. Do not use IP alone. Define relocation, travel, VPN, grace, reverification, grandfathering,
    business procurement, resale, and appeal behavior.
16. Separate affordability from fraud. A regional discount is not a fraud control. Route risk-based
    authentication, velocity, card-country mismatch, account takeover, disputes, and provider rules
    through payment or fraud owners while measuring false declines and legitimate travel.
17. Select the monetization model from value cadence, marginal-cost coupling, usage variance,
    predictability, budget needs, buyer procurement, and metering reliability. Subscription suits
    recurring value with predictable included cost; usage pricing suits episodic value that scales
    with consumption; hybrid suits a recurring base plus material variable-cost work. These are
    hypotheses to validate, not universal thresholds.
18. Charge on a user-recognizable value unit where possible. Internal tokens, model calls, database
    rows, or compute seconds may be suitable for developer infrastructure but often produce confusing
    consumer bills. Map the meter to useful output and disclose estimation, aggregation, latency,
    correction, and failed-work treatment.
19. For hybrid pricing, define the base entitlement, included allowance, overage price, spend cap,
    threshold alerts, hard-stop or grace behavior, delayed meter reconciliation, refunds, and plan
    changes. Prevent surprise bills and preserve reconstructable usage.
20. Test price without changing hidden mechanisms. Preassign eligible users and keep package,
    entitlement, trial, renewal, and presentation equal unless the experiment explicitly tests a
    bundle. Use narrow candidates around current evidence rather than copying familiar price endings.
21. Distinguish payer ARPPU from eligible-user ARPU and contribution. Calculate price elasticity,
    eligible conversion, retained paid use, churn, refunds, disputes, support, variable cost, and
    contribution by declared segment, currency, tax, and platform fee. A higher payer average can
    hide a smaller and worse eligible cohort.
22. Preserve price-version rights. Define grandfathering, migration notice, consent, package
    changes, downgrade paths, and treatment of existing annual or lifetime customers. Do not use a
    low entry price as bait for an undisclosed or retroactive entitlement reduction.
23. Compare annual and monthly economics under the same survival and service assumptions. Annual
    net contribution includes discounted price, payment fees, refunds, disputes, taxes where borne,
    cost timing, support, renewal, cost inflation, and cannibalized full-price monthly contribution.
    Monthly contribution includes its payment cadence and survival curve.
24. Keep annual cash separate from earned economics. Record cash receipt and liquidity value, but
    also the remaining service obligation, refund exposure, recognized-revenue schedule determined
    by qualified authority, and future variable cost. Up-front cash does not prove long-term profit.
25. Derive the annual discount from incremental contribution, liquidity need, renewal, and customer
    commitment value. A fixed ten, twenty, thirty, or forty percent is an experiment set, not a
    default. Make months-free copy mathematically equivalent to the actual monthly and annual totals.
26. Decide whether annual usage rights arrive up front or by period from abuse, capacity, cost, and
    user expectation. State rollover, cancellation, downgrade, refund, and expiry rights explicitly
    and route credit balances through `credit-monetization-integrity-review`.
27. Sequence experiments when traffic is limited. Resolve material model and package ambiguity
    before fine price tuning; then isolate trial gate, price level, annual discount, and geography as
    separate mechanisms. Do not ship one opaque variant that changes all of them.
28. Promote only a reversible, versioned policy whose eligible-cohort contribution improves without
    violating consent, transparent pricing, paid rights, affordability, fraud fairness, payment
    integrity, accounting boundaries, or current platform and legal authority.

<!-- mustflow-section: postconditions -->
## Postconditions

- Trial policy is measured from the pre-gate eligible cohort and includes activation, payment,
  refund, chargeback, cancellation, retained-use, contribution, consent, and reminder evidence.
- Lifetime rights and exclusions are explicit, heavy-tail and cannibalization stress tests exist,
  future variable cost is bounded, and remaining delivery has a declared reserve assumption.
- Local-currency presentment and regional price reduction remain separate; regional eligibility is
  versioned, multi-signal, appealable, and not treated as fraud control.
- Subscription, usage, or hybrid pricing follows value and cost evidence with a customer-visible
  meter, allowance, overage, alert, spend-cap, and failure policy where applicable.
- Price experiments retain preassigned abandoners and distinguish payer ARPPU, eligible-user ARPU,
  retained contribution, refunds, churn, support, and segment effects.
- Annual cash, bookings, recognized revenue, remaining service obligation, survival, renewal, cost,
  and contribution remain distinguishable.

<!-- mustflow-section: verification -->
## Verification

Use configured oneshot command intents when available: `changes_status`, `changes_diff_summary`,
`lint`, `build`, `test_related`, `test`, `docs_validate_fast`, `test_release`, and `mustflow_check`.
Do not infer raw analytics, billing, payment-provider, entitlement, warehouse, accounting, pricing,
experiment, deployment, or production commands.

<!-- mustflow-section: failure-handling -->
## Failure Handling

- If assignment begins after card entry, trial start, paywall view, or package selection, label the
  result exposure-conditioned and do not generalize it to eligible visitors.
- If renewal consent, reminder, cancellation, refund, or stored-credential authority is unresolved,
  do not start recurring collection; preserve the lower-risk existing behavior and escalate.
- If lifetime heavy-tail cost, active life, cannibalization, or rights are unknown, bound usage or
  keep the offer experimental; do not sell unlimited future variable cost from an average-case model.
- If region or customer type cannot be established fairly, use the ordinary lawful price and an
  appeal or reverification path rather than an IP-only denial or silent price switch.
- If the meter cannot be reconciled or explained to the customer, do not make it the billing source
  of truth. Repair or choose a coarser value unit first.
- If a price or annual arm wins cash or payer ARPPU but loses eligible-cohort contribution, retained
  use, refund, dispute, support, or trust guardrails, reject or narrow it.
- If annual recognized-revenue or tax treatment lacks qualified authority, report cash and product
  economics separately and leave accounting classification unresolved.

<!-- mustflow-section: output-format -->
## Output Format

- Eligible cohort, assignment, exposure, denominator, segments, and horizons
- Trial credential, consent, reminder, renewal, cancellation, refund, abuse, and contribution result
- Lifetime rights, bounded usage, heavy-tail stress, cannibalization, reserve, and break-even result
- Local currency, regional band, price floor, eligibility, relocation, appeal, and fraud handoff
- Subscription, usage, or hybrid model; value metric; meter; allowance; overage; cap; and alerts
- Price candidates, elasticity, package parity, ARPPU, eligible-user ARPU, churn, and contribution
- Annual discount, survival, renewal, cash, bookings, recognized-revenue boundary, and obligation
- Files changed
- Command intents run and skipped checks
- Remaining pricing-model risk
