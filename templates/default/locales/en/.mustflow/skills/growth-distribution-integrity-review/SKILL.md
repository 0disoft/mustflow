---
mustflow_doc: skill.growth-distribution-integrity-review
locale: en
canonical: true
revision: 1
lifecycle: mustflow-owned
authority: procedure
name: growth-distribution-integrity-review
description: Apply this skill when a product changes free-result watermarking or embedded attribution, public-share branding, affiliate or influencer compensation, partner attribution and clawbacks, recurring or lifetime commission, owned-product cross-promotion, portfolio promotion frequency, brand relationship disclosure, incremental acquisition, channel cannibalization, or retained portfolio contribution and must grow distribution without degrading the result users share, paying for natural demand, confusing product identity, or damaging the source product.
metadata:
  mustflow_schema: "1"
  mustflow_kind: procedure
  pack_id: mustflow.core
  skill_id: mustflow.core.growth-distribution-integrity-review
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

# Growth Distribution Integrity Review

<!-- mustflow-section: purpose -->
## Purpose

Review embedded result attribution, commercial partners, and owned-product cross-promotion as
different distribution mechanisms with one economic standard: incremental retained contribution
after source-product harm, partner cost, fraud, support, privacy, and brand confusion. Do not turn
useful output into an ad, grant perpetual commission for nonincremental demand, or call internal
inventory free when it damages the product that owns the user relationship.

<!-- mustflow-section: use-when -->
## Use When

- A free result adds, removes, resizes, relocates, or gates a visible service name, watermark, footer,
  end card, attribution link, metadata mark, removal entitlement, or branded export.
- A product recruits influencers, creators, affiliates, comparison publishers, agencies, resellers,
  integration partners, or other commercial acquisition partners and changes fixed fees, CPA,
  first-payment share, recurring commission, lifetime commission, attribution, or clawbacks.
- One owned service recommends another through a dashboard, success screen, result surface, account
  hub, email, notification, modal, interstitial, or contextual next step.
- A report compares organic acquisition, affiliate CAC, external paid acquisition, cross-promotion,
  brand lift, portfolio revenue, fatigue, cannibalization, or retained contribution.

<!-- mustflow-section: do-not-use-when -->
## Do Not Use When

- The task is a customer-to-customer referral reward, invite code, dual-sided incentive, reward tier,
  valid-referral event, or self-referral control; use
  `referral-incentive-integrity-review`.
- The task is a paid ad or rewarded-ad placement inside a free tier, result gate, ad SDK, premium ad
  removal, or ad-funded access decision; use `freemium-ad-monetization-review`.
- The task only changes trademark ownership, generic visual identity, SEO, ad creative, marketing
  copy, public-relations messaging, or analytics implementation with no distribution policy; use the
  narrower brand, content, attribution, privacy, security, or data procedure.
- The task requests jurisdiction-specific affiliate, advertising, tax, contract, privacy, or AI
  marking advice. Use current qualified authority; this skill supplies the product evidence packet.

<!-- mustflow-section: required-inputs -->
## Required Inputs

- Artifact ledger: result type, ownership, public or private use, export path, share rate, recipient
  reach, attribution visibility and persistence, placement, removal, editability, accessibility,
  quality, privacy, professional-use risk, and AI-origin or provenance requirement.
- Partner ledger: partner identity and type, audience, channel, content lifetime, claimed reach,
  attribution window and priority, click, signup, qualification, payment, refund, chargeback,
  retained revenue, commission, cap, duration, termination, clawback, disclosure, approval, brand
  safety, prohibited claim, support, tax, contract, and jurisdiction review.
- Cross-promotion ledger: source and target product, user and job adjacency, product relationship,
  placement, success state, eligibility, exposure sequence, frequency, suppression, account and data
  continuity, consent, external-acquisition alternative, and source-product opportunity cost.
- Causal ledger: pre-exposure assignment, persistent holdout, natural discovery, existing intent,
  channel overlap, incremental activation and payment, retained contribution, cannibalization,
  source-product completion and retention, complaints, hides, unsubscribes, and brand-understanding.
- Economics ledger: partner and creative cost, net revenue, variable service and payment cost,
  refund, chargeback, support, fraud, commission liability, source-product lost value, external CAC,
  portfolio contribution, horizon, and uncertainty.
- Version ledger: artifact policy, campaign, partner contract, attribution rule, disclosure, source
  and target eligibility, frequency, suppression, experiment, and current authority version.

<!-- mustflow-section: preconditions -->
## Preconditions

- Separate embedded attribution, partner compensation, and owned cross-promotion. A shared growth
  goal does not make their rights, risks, or attribution rules interchangeable.
- Define the source product's completed value and the incremental target outcome before adding a
  brand mark, partner payment, or cross-promotion exposure.
- Assign experiments before the mark or promotion is visible where feasible, and preserve eligible
  nonsharers, nonclickers, nonbuyers, and source-product abandoners in the relevant denominator.
- Treat copied watermark sizes, share rates, commission percentages, attribution windows, lifetime
  terms, exposure counts, fit scores, CAC, and conversion thresholds as hypotheses, not defaults.
- Refresh current endorsement, advertising, consumer, privacy, accessibility, platform, tax,
  contract, trademark, and AI-origin marking rules for the relevant role, content, channel,
  geography, and date.
- This skill does not authorize live marks, partner recruitment, contracts, payments, tracking,
  cross-product data sharing, campaigns, experiments, messages, or production changes.

<!-- mustflow-section: allowed-edits -->
## Allowed Edits

- Add or refine artifact branding eligibility, placement and removal, share and recipient events,
  partner qualification and compensation, attribution, disclosure, fraud and clawback controls,
  cross-promotion eligibility and suppression, relationship explanations, experiment assignment,
  contribution metrics, fixtures, tests, docs, route metadata, and synchronized templates.
- Replace universal watermarking, gross attributed revenue, last-click poaching, uncapped lifetime
  commission, source-product interruption, or raw cross-product clicks with bounded rights and
  causal portfolio economics.
- Do not insert private identifiers or covert user tracking into exported artifacts, misrepresent
  authorship, suppress required disclosure, transfer account data without authority, or impair the
  result users completed merely to make brand removal a paid feature.

<!-- mustflow-section: procedure -->
## Procedure

1. Split the review into artifact attribution, partner compensation, and owned cross-promotion.
   Evaluate each independently before comparing their contribution as acquisition channels.
2. Define the headline result as incremental retained contribution per eligible source user or
   acquisition opportunity over a declared horizon. Include target revenue and service cost,
   partner cost, refunds, disputes, fraud, support, source-product lost value, and cannibalization.
3. Classify the artifact. Estimate whether it is privately stored, internally circulated, sent to a
   small known group, published repeatedly, or distributed to a broad public audience.
   Do not infer reach from export count alone.
4. Build the artifact acquisition path from created result to external share, unique recipient,
   visible attribution, attributable visit, activated user, payer, and retained contribution. Keep
   original-user conversion and retention loss in the same calculation.
5. Use visible branding only when attribution can survive a real public distribution path and its
   incremental value exceeds quality, sharing, conversion, accessibility, privacy, and support harm.
   A watermark on a private or low-reach artifact is not a growth engine by default.
6. Preserve the completed result. Keep branding outside critical content where possible, readable
   but not dominant, accessible, and compatible with professional use. Never obscure evidence,
   damage legibility, imply false authorship, or block export solely to force removal payment.
7. Choose the least harmful attribution carrier that can work. A small footer, end card, adjacent
   share link, or approved metadata can be a candidate; visible and machine-readable marks solve
   different problems and neither proves compliance with every current AI-origin rule.
8. Do not embed user, recipient, prompt, tenant, or private tracking data in exported files. Define
   whether attribution survives editing, screenshots, transcoding, printing, and platform stripping,
   and measure the actual recipient path rather than assumed virality.
9. Classify the partner's continuing work. Short-lived sponsored reach, durable search or tutorial
   content, ongoing implementation, reseller support, and customer-success work justify different
   compensation shapes.
10. Compare fixed production cost, qualified CPA, first-payment share, and bounded recurring share at
    equal expected budget and qualification quality. Do not call a higher-spend arm more persuasive
    without separating spend from contract shape.
11. Calculate partner economics from incremental customers. Exclude or discount existing demand,
    branded-search interception, leaked coupons, self-referral, duplicate partners, pre-existing
    accounts, refund-window purchases, and customers who would have converted through another owned
    or paid channel.
12. Bind compensation to a qualified event and net revenue. Version attribution priority, window,
    product scope, refund and chargeback treatment, tax, currency, minimum payout, cap, termination,
    inactivity, content removal, and clawback before value vests.
13. Treat lifetime commission as a long-lived liability, not a free acquisition rate. Use it only
    when the partner continues to create attributable value or service after acquisition and the
    agreement has explicit scope, activity, cap or review, termination, transfer, audit, and margin
    protection. A bounded recurring term is a candidate, not a universal duration.
14. Make commercial relationships clear and conspicuous near the endorsement or link as required by
    current authority. Train and monitor partners, preserve content evidence, prohibit unsupported
    claims, and define brand-safety escalation rather than relying only on a platform disclosure UI.
15. Prevent attribution abuse with deterministic rules and multiple signals. Cover cookie stuffing,
    forced redirects, toolbar or extension injection, trademark bidding, last-click poaching,
    coupon leakage, fake leads, duplicate identities, self-dealing, and partner collusion while
    preserving review and appeal for legitimate conflicts.
16. Classify source-target fit before cross-promotion. Use audience overlap, adjacent user job,
    brand promise, account and data relationship, and target readiness as evidence; ownership by the
    same operator alone does not make two products relevant.
17. Deliver the source product's primary value before promotion. Prefer a contextual next step after
    success or in a clearly separate portfolio surface. Do not interrupt first value, active work,
    checkout, cancellation, safety, privacy, or accessibility flows.
18. Explain the relationship honestly. State whether the target is another product, an optional
    companion, or part of a suite; do not imply shared entitlements, identity, data, support, or
    warranties that the current contract does not provide.
19. Make cross-product data movement explicit. Define consent, purpose, tenant and account boundaries,
    deletion, suppression, and access before transferring user input or state. A click may deep-link
    without silently provisioning or copying private data.
20. Derive fatigue from marginal value by exposure sequence. Track incremental activation and target
    contribution against source completion, retention, hides, complaints, unsubscribes, and support
    after each exposure. Stop when marginal portfolio value is nonpositive; do not copy a universal
    session, week, or month cap.
21. Suppress irrelevant repetition. Stop or cool down after conversion, purchase, explicit rejection,
    repeated nonresponse, source-product distress, target ineligibility, or relationship mismatch.
    Keep campaign and suppression versions reconstructable across channels.
22. Compare owned inventory with external acquisition using opportunity cost. Internal exposure is
    not free: include source-product lost value, displaced product messages, creative and operations,
    and portfolio cannibalization alongside the target's external incremental CAC.
23. Use persistent holdouts where feasible to estimate natural sharing, partner incrementality, cross-
    product discovery, and source-product damage. Observed clicks, attributed revenue, or users of two
    products do not prove the channel caused portfolio growth.
24. Promote only a reversible policy that improves incremental portfolio contribution while
    preserving useful artifacts, honest commercial disclosure, deterministic attribution, partner
    quality, source-product value, brand clarity, privacy, accessibility, and current authority.

<!-- mustflow-section: postconditions -->
## Postconditions

- Artifact attribution, partner compensation, and owned cross-promotion remain distinct contracts.
- Visible branding is limited to an evidence-backed distribution path and does not degrade or
  misrepresent the completed result.
- Partner rewards use deterministic attribution, qualified net value, bounded liability, disclosure,
  fraud controls, clawbacks, and review.
- Cross-promotion follows source value, explains product relationships, respects account and data
  boundaries, suppresses fatigue, and includes source-product opportunity cost.
- Headline growth uses causal portfolio contribution rather than exports, impressions, clicks,
  attributed gross revenue, or users observed in multiple products.

<!-- mustflow-section: verification -->
## Verification

Use configured oneshot command intents when available: `changes_status`, `changes_diff_summary`,
`lint`, `build`, `test_related`, `test`, `docs_validate_fast`, `test_release`, and
`mustflow_check`. Do not infer live export, affiliate, payment, tracking, campaign, analytics,
cross-product data, messaging, deployment, or production commands.

<!-- mustflow-section: failure-handling -->
## Failure Handling

- If recipient reach, partner qualification, or source-product damage cannot be measured, keep the
  policy reversible and report association rather than claiming incremental acquisition.
- If branding reduces utility, accessibility, privacy, sharing, conversion, or professional use more
  than attributable retained contribution, remove or narrow it instead of optimizing removal sales.
- If partner attribution cannot exclude existing intent, refunds, self-dealing, or channel overlap,
  keep compensation pending or cap it under the current contract; do not grant unbounded liability.
- If commercial disclosure, claim substantiation, tax, contract, or jurisdiction authority is
  unresolved, do not launch or expand the affected partner treatment.
- If cross-promotion improves the target while reducing source or portfolio contribution, reject or
  narrow the placement even when click-through and target revenue rise.
- If account or data relationships are ambiguous, use a separate optional link and do not transfer
  identity or private state.

<!-- mustflow-section: output-format -->
## Output Format

- Artifact type, ownership, distribution path, recipient reach, attribution, placement, removal,
  quality, accessibility, privacy, AI-origin, and contribution decision
- Partner type, continuing work, qualification, compensation shape, equal-budget comparison,
  attribution, disclosure, cap, duration, termination, clawback, fraud, and incrementality decision
- Source and target product fit, relationship, placement, success state, account and data boundary,
  frequency, suppression, source-product harm, external-CAC comparison, and portfolio decision
- Experiment assignment, holdout, horizon, natural demand, cannibalization, retained contribution,
  guardrails, and uncertainty
- Files changed
- Command intents run and skipped checks
- Remaining growth-distribution risk
