---
mustflow_doc: skill.game-economy-monetization-review
locale: en
canonical: true
revision: 2
lifecycle: mustflow-owned
authority: procedure
name: game-economy-monetization-review
description: Apply this skill when a game changes paid revives, rewarded-ad revives, lives, energy, natural recovery, credit refills, unlimited play, VIP or subscription benefits, failure monetization, content-consumption pacing, pay-to-win boundaries, IAP cannibalization, ARPDAU, retained play, or long-horizon player LTV and must preserve meaningful failure, fair competition, content life, and a sustainable game economy.
metadata:
  mustflow_schema: "1"
  mustflow_kind: procedure
  pack_id: mustflow.core
  skill_id: mustflow.core.game-economy-monetization-review
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

# Game Economy Monetization Review

<!-- mustflow-section: purpose -->
## Purpose

Monetize recovery and play pacing without turning avoidable frustration into a bill, selling ranked
outcomes, erasing the meaning of failure, burning finite content, or replacing high-value consumable
spend with a cheap unlimited subscription. Judge rewarded ads, credits, energy, and membership from
incremental long-horizon contribution and durable play rather than one-day revenue.

<!-- mustflow-section: use-when -->
## Use When

- Death, failure, timeout, or loss can trigger a credit revive, rewarded-ad revive, free insurance,
  retry, checkpoint restore, extra move, or subscription benefit.
- A lives or energy system changes natural recovery, capacity, refill size, price, rewarded-ad refill,
  cooldown, overflow, notification, or unlimited-play treatment.
- A VIP pass or subscription bundles revives, energy, ad removal, daily currency, progression,
  convenience, cosmetics, event access, or loyalty rewards.
- A game-economy experiment compares ARPDAU, ad revenue, IAP, subscription, retention, content
  completion, progression, competition, or long-horizon player contribution.

<!-- mustflow-section: do-not-use-when -->
## Do Not Use When

- The task only changes generic credit packs, expiry, rollover, spend order, or quote settlement;
  use `credit-monetization-integrity-review`.
- The task only chooses subscription, usage, price level, annual billing, or geographic pricing
  outside a game loop; use `pricing-model-integrity-review`.
- The main risk is battle-pass or membership cadence, cosmetics, power goods, deterministic bundles,
  paid or free randomized rewards, loot boxes, odds, pity, or liveops content production; use
  `game-liveops-commerce-integrity-review`.
- The main risk is ad SDK loading, consent, attribution, provider callbacks, payment settlement,
  refunds, chargebacks, or fraud; use the advertising, payment, privacy, or provider owner.
- The main risk is cancellation, pause, downgrade, or save offers; use
  `subscription-retention-profit-review`.
- The task requests a jurisdiction- or age-specific gambling, loot-box, advertising, consumer, tax,
  or accounting decision. Use current qualified authority; this skill prepares the product evidence.

<!-- mustflow-section: required-inputs -->
## Required Inputs

- Loop ledger: genre, mode, session goal, failure meaning, checkpoint, retry cadence, skill and luck,
  competitive consequence, progression, content supply, repeatability, and user-generated content.
- Failure ledger: cause, run age, progress at risk, game defect or latency, prior revives, revive value,
  price, cooldown, per-run and daily limits, outcome after revive, and later return.
- Energy ledger: capacity, natural recovery, satisfying-session allowance, refill source and amount,
  overflow, stockpiling, notification, progression velocity, concurrency, and content-burn rate.
- Ad ledger: eligibility, explicit choice, reward, storage, per-run and time cap, availability,
  completion, failure, revenue, latency, IAP displacement, privacy, age, and platform constraints.
- Credit ledger: acquired-right class, revive or refill price, balance, depletion, purchase, useful
  play after spend, reversal, and variable or content cost.
- Membership ledger: included benefits, caps, ad treatment, daily grants, cosmetics, event access,
  renewal, member and nonmember spend, IAP cannibalization, tenure, and content consumption.
- Experiment ledger: pre-eligibility assignment, mode and payer strata, holdout, exposure, progression,
  content version, economy version, observation horizon, guardrails, and promotion rule.

<!-- mustflow-section: preconditions -->
## Preconditions

- Define what failure teaches or protects before selling a way around it.
- Establish a playable natural-recovery or ordinary-retry baseline that can deliver a satisfying
  session before the first monetization gate.
- Assign experiments before death, depletion, ad choice, or membership eligibility; retain users who
  never reach the trigger in the intent-to-treat denominator.
- Treat copied revive counts, refill ratios, subscription prices, ad caps, benchmark uplifts, and
  renewal horizons as hypotheses, not defaults.
- Keep live economy changes, prices, grants, ads, experiments, and messages under configured command
  and product authority; this skill grants none of them.

<!-- mustflow-section: allowed-edits -->
## Allowed Edits

- Add or refine recovery policy, energy pacing, rewarded-ad and credit differentiation, membership
  benefits, economy events, content-burn measures, experiment assignment, guardrails, fixtures,
  tests, docs, route metadata, and synchronized templates.
- Remove paid correction of product defects, forced rewarded ads, unlimited competitive advantage,
  uncapped repeat revives, hidden energy gates, or subscriptions that merely discount unlimited
  consumables below existing payer spend.
- Do not sell an outcome in ranked competition, charge for a failure caused by a confirmed product
  defect, or silently change purchased balances and membership rights.

<!-- mustflow-section: procedure -->
## Procedure

1. Separate five decisions: ordinary recovery, credit recovery, rewarded-ad recovery, energy pacing,
   and membership benefits. Do not make one short-term revenue winner choose the other four.
2. Classify the loop before monetizing it. Distinguish ranked competition, cooperative play,
   roguelike or permadeath identity, stage-based casual play, finite narrative content, and renewable
   PvE, PvP, or user-generated content.
3. Preserve outcome integrity. Exclude paid revives or paid play-volume advantages where they decide
   ranked results or materially compound competitive progression. In a death-defined loop, test
   checkpoint or meta-progression help before a revive that erases the core consequence.
4. Preserve a satisfying free session. Set natural retry or recovery from observed time-to-fun,
   session completion, progression, and return cadence. Do not place the first depletion wall before
   the player can understand and enjoy the loop.
5. Classify failure cause. Separate player choice, learnable mistake, bad luck, accessibility need,
   network failure, latency, crash, unclear rule, and product defect. Repair or compensate product-
   caused loss; do not present a paid cure as proof the failure was fair.
6. Bound revives by loop meaning. Define checkpoint, retained progress, reward at risk, price, per-run
   count, escalating or fixed cost, and post-revive outcome. A one-revive policy can be a candidate,
   not a universal rule.
7. Differentiate rewarded ads from credits. Keep an ad reward immediate, nontransferable, and usually
   bound to the current run or a partial refill; let paid credits provide faster or more flexible
   recovery. Do not make a repeatable ad and paid credit perfectly interchangeable.
8. Keep rewarded ads voluntary. Show the reward and consequence before choice, grant it once from an
   authoritative completion event, and preserve the ordinary path when the ad is unavailable,
   fails, or the user declines.
9. Measure ad incrementality as ad net revenue plus later contribution minus displaced IAP,
   delayed first purchase, reward cost, economy inflation, latency, support, and retained-play harm.
   Segment declared payers and nonpayers without hiding a rule from one group.
10. Treat energy as a pacing control, not proof of demand. Compare natural recovery, paid refill,
    limited rewarded refill, larger capacity, faster member recovery, and bounded play windows using
    retained play, progression quality, and content supply.
11. Stress content burn. Measure stage completion, event exhaustion, matchmaking supply, progression
    gaps, update cadence, and support load when energy or play limits are relaxed. Finite authored
    content and renewable competitive or user-generated content need different caps.
12. Make membership a broad recurring-value contract. Combine suitable convenience, ad treatment,
    capacity or recovery benefit, bounded insurance, daily value, cosmetics, loyalty, or event access
    so skilled players can value it without needing to fail repeatedly.
13. Avoid unlimited consumable arbitrage. Compare member price with the distribution of displaced
    revive, refill, and ad value, especially repeat spenders and heavy users. Cap or meter benefits
    when unlimited use would collapse IAP, pacing, competition, or capacity.
14. If members receive an ad-free version of a rewarded benefit, apply the same economic eligibility
    and cap unless the membership contract explicitly prices a different right. Do not create an
    unbounded grant merely by removing the ad playback.
15. Keep economy versions reconstructable. Snapshot prices, rewards, recovery rates, caps,
    subscription benefits, content version, and eligibility at assignment and use.
16. Analyze from pre-trigger assignment over multiple content and billing cycles. Include total IAP,
    ad net revenue, subscription net revenue, refunds, chargebacks, variable cost, retained play,
    progression, content burn, payer migration, and contribution per eligible player.
17. Predeclare fairness and quality guardrails: win rate by spend, progression spread, frustration,
    defect-linked offers, accessibility, ad opt-out, session abandonment, content exhaustion,
    economy inflation, and support complaints.
18. Promote only a reversible policy that improves long-horizon eligible-player contribution without
    selling competitive outcomes, monetizing defects, erasing meaningful failure, or exhausting the
    content and economy faster than the product can sustain.

<!-- mustflow-section: postconditions -->
## Postconditions

- Ordinary recovery, credits, ads, energy, and membership have separate rights, limits, and metrics.
- Ranked outcome, meaningful-death, defect, accessibility, and content-supply boundaries are explicit.
- Rewarded ads are voluntary, bounded, economically distinct from paid credits, and failure-safe.
- Membership value is not an uncapped discounted substitute for revive or refill spend.
- The headline result uses pre-trigger eligible players and long-horizon contribution with IAP
  cannibalization, content burn, retained play, and fairness guardrails.

<!-- mustflow-section: verification -->
## Verification

Use configured oneshot command intents when available: `changes_status`, `changes_diff_summary`,
`lint`, `build`, `test_related`, `test`, `docs_validate_fast`, `test_release`, and `mustflow_check`.
Do not infer live economy, ad-network, billing, analytics, grant, experiment, deployment, or production
commands.

<!-- mustflow-section: failure-handling -->
## Failure Handling

- If the mode or failure meaning is unknown, keep monetization bounded and do not add unlimited play
  or repeated revives.
- If an offer follows crashes, latency, or confirmed defects, suppress charging and route recovery to
  compensation and incident owners.
- If ad viewers and nonviewers were compared only after self-selection, report observational
  association rather than ad lift.
- If membership growth is offset by lost IAP, faster content exhaustion, unfair progression, or lower
  retained contribution, reject or narrow the benefit.
- If age, privacy, ad, gambling, or platform authority is unresolved, preserve the lower-risk current
  path and escalate instead of launching the treatment.

<!-- mustflow-section: output-format -->
## Output Format

- Game mode, loop, failure meaning, recovery baseline, and satisfying-session boundary
- Revive cause, checkpoint, price, cap, defect, accessibility, and competitive decision
- Energy capacity, recovery, refill, ad, member, pacing, and content-burn decision
- Rewarded-ad choice, reward, cap, failure path, IAP displacement, and net contribution
- Membership benefits, limits, payer migration, renewal, fairness, and content-life result
- Eligible cohort, experiment horizon, metrics, guardrails, and rollback
- Files changed
- Command intents run and skipped checks
- Remaining game-economy monetization risk
