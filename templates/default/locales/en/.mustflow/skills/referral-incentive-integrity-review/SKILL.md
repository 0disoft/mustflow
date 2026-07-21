---
mustflow_doc: skill.referral-incentive-integrity-review
locale: en
canonical: true
revision: 2
lifecycle: mustflow-owned
authority: procedure
name: referral-incentive-integrity-review
description: Apply this skill when a product changes inviter-only, invitee-only, dual-sided, tiered, or milestone referral rewards; referral attribution; invite links or codes; valid-referral qualification; pending, vested, or reversed rewards; self-referral and reward farming controls; rolling thresholds; referral incrementality; or referred-user contribution and must grow without paying for natural signups, fraudulent identities, refundable purchases, or vanity referral counts.
metadata:
  mustflow_schema: "1"
  mustflow_kind: procedure
  pack_id: mustflow.core
  skill_id: mustflow.core.referral-incentive-integrity-review
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

# Referral Incentive Integrity Review

<!-- mustflow-section: purpose -->
## Purpose

Reward incremental, durable referrals without confusing reward direction with tiering, paying both
sides for disposable signup identities, crediting users who would have joined anyway, or treating
referred-user revenue as causal growth. Preserve transparent eligibility, reversible reward state,
privacy, appeals, and unit economics.

<!-- mustflow-section: use-when -->
## Use When

- A program changes inviter-only, invitee-only, dual-sided, shared-budget, tiered, milestone, cash,
  credit, discount, premium-time, access, badge, or partner rewards.
- Invite links, codes, attribution windows, late code entry, pre-existing accounts, channel conflicts,
  last-click or first-touch rules, or referral ownership change.
- A valid referral depends on signup, verification, first owned value, retained use, purchase, refund
  window, subscription survival, or another downstream event.
- Self-referral, account farms, shared devices, households, payment overlap, refund or chargeback,
  reward reversal, manual review, appeal, or referral incrementality is implemented or reported.

<!-- mustflow-section: do-not-use-when -->
## Do Not Use When

- The task only changes promotional-credit balance rights, expiry, spend order, or settlement; use
  `credit-monetization-integrity-review` and `credit-ledger-integrity-review`.
- The task only changes signup, authentication, identity linking, or onboarding without a referral
  reward or attribution policy; use `product-onboarding-activation-review` and the identity owner.
- The task is affiliate, influencer, reseller, creator, sales-partner, recurring-commission, or
  owned-product cross-promotion policy rather than a customer referral reward; use
  `growth-distribution-integrity-review` plus the matching payment, tax, contract, and legal owners.
- The task requests jurisdiction-specific sweepstakes, marketing, tax, privacy, anti-spam, or
  consumer-law advice. Use current qualified authority; this skill supplies the product evidence.

<!-- mustflow-section: required-inputs -->
## Required Inputs

- Actor ledger: inviter, invitee, account age, identity assurance, customer type, geography,
  household or organization relationship, prior account, prior invitation, eligibility, and consent.
- Attribution ledger: code or link, issuer, channel, creation and click time, signup and qualifying
  time, window, priority, late entry, conflicting claims, pre-existing intent, and version.
- Qualification ledger: verification, first owned value, retained activity, purchase, refund and
  chargeback horizon, subscription survival, excluded behavior, invalidation, and evidence owner.
- Reward ledger: recipient, type, face value, expected cost, transferability, expiry, cap, pending,
  vested, granted, consumed, reversed, appealed, and accounting, tax, platform, or legal review.
- Tier ledger: valid-referral count, rolling window, thresholds, marginal and cumulative reward,
  reset, cap, manual review, downgrade, and campaign version.
- Abuse ledger: identity, device, payment, billing, phone, network, address, behavior and velocity
  signals, graph links, false-positive risk, reason code, reviewer, appeal, and retention limits.
- Experiment ledger: eligible population, assignment, no-program or business-as-usual holdout,
  reward-budget parity, exposure, natural signup, channel cannibalization, horizon, contribution,
  and promotion rule.

<!-- mustflow-section: preconditions -->
## Preconditions

- Separate who receives a reward, when it qualifies, when it vests, and how tiers accumulate. These
  are independent axes.
- Define the incremental growth outcome and valid-referral event before issuing reward value.
- Preserve a stable program and attribution version across invite, qualification, vesting, reversal,
  and appeal.
- Treat copied split ratios, reward amounts, signup conditions, day counts, tier thresholds, rolling
  windows, and benchmark lifts as hypotheses, not defaults.
- Refresh current privacy, identity, messaging, platform, tax, accounting, and jurisdiction rules;
  this skill does not authorize outbound invitations, live rewards, payments, experiments, or bans.

<!-- mustflow-section: allowed-edits -->
## Allowed Edits

- Add or refine referral eligibility, attribution, valid-referral qualification, pending and vesting
  states, reversal, tiering, caps, anti-abuse evidence, appeals, experiment assignment, contribution
  metrics, fixtures, tests, docs, route metadata, and synchronized templates.
- Replace signup-only cash-like grants, permanent lifetime tier accumulation, single-signal bans,
  or gross referred revenue claims with bounded downstream qualification and causal evidence.
- Do not silently reassign an earned referral, expose private abuse signals, auto-ban from one weak
  signal, or reverse consumed value without an explicit lawful negative-balance or recovery policy.

<!-- mustflow-section: procedure -->
## Procedure

1. Split four decisions: reward direction, qualifying event, vesting and reversal, and tier schedule.
   Dual-sided and tiered rewards are not competing alternatives.
2. Define the headline result as incremental contribution per eligible participant or acquired user
   over a declared horizon. Include reward cost, variable service cost, refunds, chargebacks,
   support, fraud loss, messaging cost, channel cannibalization, retained value, and later revenue.
3. Define referral eligibility before attribution. State whether existing accounts, prior visitors,
   employees, partners, same organization, same household, minors, prior payers, or previously invited
   users can participate and which actor is ineligible.
4. Make attribution deterministic. Version code and link ownership, time window, channel priority,
   late code entry, multiple inviters, cross-device joins, account merges, and pre-existing account
   behavior. Do not let support choose winners without a recorded rule and audit trail.
5. Do not equate signup with a valid referral. Choose a downstream event that represents real product
   value and resists cheap identity creation, such as verified first owned value, retained use, or a
   payment that has survived the applicable refund and dispute conditions.
6. Give invitee value when it improves honest activation, but keep it bounded, nontransferable where
   appropriate, and tied to the product. Delay inviter vesting until the invitee reaches the declared
   durable condition. This sequence is a candidate, not a universal reward direction.
7. Keep reward states explicit: proposed, pending, qualified, vested, granted, partly consumed,
   reversed, expired, appealed, restored, and terminal. Use idempotent identities and preserve the
   event and policy version that authorized each transition.
8. Define reversal before launch. Cover failed verification, duplicate identity, refund, chargeback,
   subscription cancellation, account deletion, policy violation, provider reversal, and later fraud
   evidence. Separate unvested cancellation from clawing back vested or consumed rights.
9. Hold economic value only as long as qualification needs. State the expected delay before invite,
   explain pending status to both actors, and avoid an indefinite fraud-review state.
10. Compare reward directions at equal expected total budget when the question is who should receive
    value. If one arm spends more, label it a budget-and-direction test rather than a framing test.
11. Add tiers only to valid referrals. Use a declared rolling or campaign window, cap, reset, and
    marginal reward schedule. Do not let lifetime signup count create permanent high-yield farming.
12. Keep higher tiers economically bounded. Prefer product value with controlled expected cost when
    appropriate, but include service liability, credit consumption, subscription displacement,
    transferability, and tax or accounting treatment rather than calling it free.
13. Detect abuse from multiple consistent signals and behavior. Use identity assurance, device,
    payment, billing, phone, network, address, velocity, graph, refund, and usage evidence
    proportionately; one shared IP, device, or household is not sufficient proof by itself.
14. Design for legitimate collisions. Cover families, schools, offices, shared devices, travel,
    recycled phone numbers, privacy relays, payment by another household member, and accessibility
    support. Record reason codes, manual-review thresholds, and an appeal path.
15. Limit disclosure. Tell users the eligibility or review outcome and actionable remedy without
    revealing thresholds, graph features, private identifiers, or a recipe for evasion.
16. Separate invitation delivery from referral attribution. Respect consent, anti-spam, suppression,
    sender identity, frequency, and channel rules; do not import contacts or message third parties
    merely because a referral reward exists.
17. Measure incrementality with a no-program, no-reward, or business-as-usual comparison where
    feasible. Track natural signup, users who add a code after deciding to join, organic and paid
    channel displacement, and inviter behavior. Referred-versus-organic revenue alone is observational.
18. Preserve experiment assignment before reward exposure and keep nonclickers, nonjoiners,
    unqualified invites, and invalid referrals in the relevant intent-to-treat denominator.
19. Predeclare guardrails: spam complaints, blocks, privacy requests, false-positive reviews, appeal
    reversals, account farms, reward cost, refund and chargeback, low-quality activity, support,
    concentration, and downstream retained value.
20. Promote only a reversible, versioned program whose incremental contribution and quality improve
    without paying for disposable identities, natural signups, refundable transactions, or hidden
    messaging and privacy costs.

<!-- mustflow-section: postconditions -->
## Postconditions

- Reward direction, valid-referral qualification, vesting, reversal, and tiering remain distinct.
- Attribution, conflicts, late entry, account merges, and pre-existing users have deterministic rules.
- Reward states are reconstructable and downstream qualification precedes durable inviter value.
- Abuse decisions use multiple signals, legitimate-collision handling, bounded review, and appeals.
- Headline growth uses causal eligible-population contribution rather than raw invites, signups,
  referred-user revenue, or reward claims.

<!-- mustflow-section: verification -->
## Verification

Use configured oneshot command intents when available: `changes_status`, `changes_diff_summary`,
`lint`, `build`, `test_related`, `test`, `docs_validate_fast`, `test_release`, and `mustflow_check`.
Do not infer live reward, credit, payment, identity, messaging, analytics, experiment, deployment, or
production commands.

<!-- mustflow-section: failure-handling -->
## Failure Handling

- If attribution or qualification cannot be reconstructed, pause new vesting rather than guessing
  the inviter or granting duplicate value.
- If only signup or referred-versus-organic revenue exists, report acquisition association and do not
  claim incremental growth or profitable referrals.
- If abuse evidence relies on one weak signal, keep the reward pending for bounded review or allow it;
  do not auto-ban without corroboration and an appeal path.
- If reversal rights for vested or consumed rewards are unresolved, preserve the current right and
  route future policy to credit, payment, accounting, tax, platform, or legal owners.
- If higher tiers increase low-quality or fraudulent referrals faster than incremental contribution,
  cap, reset, or remove the tier rather than optimizing claimed referral count.

<!-- mustflow-section: output-format -->
## Output Format

- Eligible inviter and invitee, attribution, conflicts, window, and program version
- Valid-referral event, pending period, vesting, grant, consumption, reversal, and appeal
- Reward direction, equal-budget comparison, cost, transferability, and rights
- Tier window, thresholds, marginal rewards, cap, reset, and review
- Abuse signals, legitimate collisions, privacy, messaging, false positives, and reason codes
- Incremental contribution, natural signup, channel displacement, quality, and guardrails
- Files changed
- Command intents run and skipped checks
- Remaining referral-incentive risk
