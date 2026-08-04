---
mustflow_doc: skill.payment-provider-underwriting-readiness-review
locale: en
canonical: true
revision: 1
lifecycle: mustflow-owned
authority: procedure
name: payment-provider-underwriting-readiness-review
description: Apply this skill when payment processor, acquirer, merchant-of-record, marketplace, app-store, bank-transfer, invoice, or merchant-account underwriting, domain review, KYB or KYC, product approval, rejection, reserve, suspension, payout hold, remediation, appeal, approved-scope gating, or multi-provider merchant risk must be aligned with truthful business facts and actual server behavior. Do not use it to disguise a prohibited business, transaction-launder through another account or MID, evade a suspension, fabricate operating history, or optimize wording while the product remains outside the provider's current approved scope.
metadata:
  mustflow_schema: "1"
  mustflow_kind: procedure
  pack_id: mustflow.core
  skill_id: mustflow.core.payment-provider-underwriting-readiness-review
  command_intents:
    - changes_status
    - changes_diff_summary
    - lint
    - build
    - test_related
    - test
    - test_audit
    - docs_validate_fast
    - test_release
    - mustflow_check
---

# Payment Provider Underwriting Readiness Review

<!-- mustflow-section: purpose -->
## Purpose

Keep merchant applications, provider approvals, product behavior, customer-facing policies, risk
controls, and launch configuration consistent and auditable.

A provider rejection is evidence about that provider's current risk appetite and submitted scope.
It is not by itself a legal judgment, proof that every provider will reject the business, or
permission to route the same activity through another account.

<!-- mustflow-section: use-when -->
## Use When

- A payment processor, acquirer, merchant of record, marketplace, app store, bank-transfer provider,
  invoice channel, or merchant account reviews a business, legal entity, owner, domain, product,
  SKU, country, payment method, refund policy, delivery model, dispute risk, or projected volume.
- A merchant application, domain-review page, review account, product demonstration, risk register,
  approval matrix, reserve proposal, launch gate, rejection response, appeal packet, suspension
  runbook, or phased resumption is created or reviewed.
- Several providers or merchant accounts must receive consistent business facts and must not become
  a mechanism for approval shopping, card testing, transaction laundering, or policy evasion.
- Product, pricing, geography, marketing, seller role, credits, marketplace behavior, AI features,
  fulfillment, refund, or cancellation behavior changes after approval.

<!-- mustflow-section: do-not-use-when -->
## Do Not Use When

- The task is payment authorization, capture, webhook, refund execution, subscription state,
  settlement, ledger, reconciliation, or dispute-processing correctness; use
  `payment-integrity-review`.
- The task determines consumer law, privacy, age, AI disclosure, refund-right, tax, stored-value, or
  jurisdiction applicability; use `jurisdictional-product-compliance-review` and qualified review.
- The task primarily designs provider portability, token migration, alternate-provider restoration,
  or exit drills; use `vendor-portability-exit-readiness-review`.
- The task is credit-lot accounting, balance invariants, expiry, allocation, or chargeback debt; use
  `credit-ledger-integrity-review`.
- The requested tactic hides actual functionality, misstates the seller or product, changes facts
  between providers, creates a shell account, uses another merchant's account, or reroutes activity
  that a provider suspended for policy, fraud, dispute, or network risk.

<!-- mustflow-section: required-inputs -->
## Required Inputs

- Canonical merchant facts: legal and trading names, legal form, registration and tax identifiers,
  beneficial owners and controllers, addresses, support contacts, domains, bank account ownership,
  seller and merchant roles, related entities, prior processors, terminations, reserves, disputes,
  and unresolved verification issues.
- Product and transaction map: product family, SKU, buyer, price and currency, billing cadence,
  trial, delivery and fulfillment timing, usage unit, transferability, redemption, cancellation,
  refund, countries, acquisition channels, marketing claims, support, and evidence of delivery.
- Provider source ledger: current official terms, acceptable-use and restricted-business policy,
  onboarding requirements, approved roles and countries, information-request history, policy
  version, checked date, provider decision, written exceptions, and reviewer or case identifiers.
- Approval-scope matrix: provider and account, legal seller, domain, product, SKU, country, currency,
  payment method, amount or volume constraints, billing model, descriptor, refund-policy version,
  approval status, effective window, reserve or payout conditions, and change-notification duties.
- Risk evidence: transaction and amount counts, approval and decline reasons, fraud, disputes,
  refunds, cancellations, delivery and usage, support response, cohorts, network or provider notices,
  and control changes with before-and-after evidence.
- Current website, review account, checkout, receipt, statement descriptor, cancellation, refund,
  privacy, terms, support, server gates, product catalog, feature flags, deployment rules, incident
  states, and configured command intents.

<!-- mustflow-section: preconditions -->
## Preconditions

- Verify time-sensitive provider policies, required facts, thresholds, countries, categories,
  notice periods, reserve terms, and appeal routes against current official sources.
- Treat submitted facts, provider emails, dashboards, contracts, and product runtime as separate
  evidence. Reconcile them before changing wording or routing.
- Do not infer a rejection reason that the provider did not state. Separate confirmed reason,
  evidence-backed hypothesis, missing information, and unknown.
- Keep live applications, provider messages, charges, refunds, traffic shifts, feature restrictions,
  customer notices, and account changes behind their existing approval boundaries.

<!-- mustflow-section: allowed-edits -->
## Allowed Edits

- Add or refine canonical merchant facts, provider-source records, product transaction maps,
  approval-scope matrices, review pages, test-account instructions, policy parity checks, launch
  gates, server restrictions, risk metrics, remediation evidence, incident states, fixtures, tests,
  docs, and synchronized templates.
- Narrow product, SKU, country, amount, payment method, acquisition channel, or capability scope only
  when the restriction is real, server-enforced, customer-visible, documented, and operationally
  supported.
- Do not fabricate history, omit related entities or prior terminations, relabel stored value as a
  usage unit without changing behavior, submit false screenshots, use production card data in
  fixtures, or create live merchant accounts and transactions.

<!-- mustflow-section: procedure -->
## Procedure

1. Create one canonical underwriting facts source.
   - Normalize identity, ownership, domain, seller role, product, price, billing, delivery, refund,
     geography, marketing, projected volume, existing processing, and historical incident facts.
   - Map each provider questionnaire to this source instead of authoring a more favorable version
     per provider. Record ranges and assumptions for forecasts; do not manufacture precision.
2. Reconcile the merchant identity graph.
   - Compare legal name, trading name, beneficial owners, controllers, registration, tax identity,
     address, phone, domain registration, support email, terms seller, bank account, descriptor,
     related companies, and prior merchant relationships.
   - Classify discrepancies as legitimate alias, stale record, provider format difference, missing
     proof, or contradiction. Fix the source record or disclose the relationship rather than
     creating another identity.
3. Describe transactions instead of marketing categories.
   - For every SKU, state the buyer, exact right or deliverable, price, billing event, delivery time,
     usage or completion proof, transferability, expiry, cancellation outcome, refund decision,
     seller, country, and support path.
   - Separate software, human service, marketplace, third-party fulfillment, stored value, reusable
     credits, donations, advertising, financial activity, and regulated or restricted functions by
     actual behavior. A product name does not change its risk class.
4. Build a reviewable product path.
   - Provide a safe review account or fixture, login path, representative input, expected output,
     checkout and post-purchase flow, usage evidence, cancellation, refund request, reporting or
     moderation controls, and support contacts.
   - Make pricing, deliverables, terms, privacy, refund and cancellation policy, seller identity,
     descriptor, and support easy to find. Do not expose secrets, real customer data, or production
     payment credentials to a reviewer.
5. Build the approval-scope matrix before the payment router.
   - Route only combinations approved for the legal seller, provider account, domain, product, SKU,
     country, currency, payment method, billing model, amount or volume band, and effective policy.
   - Treat sandbox availability, API capability, dashboard configuration, or a technically accepted
     request as different from underwriting approval.
   - Fail closed for an unknown or expired approval record and give operators a reason code and
     bounded escalation path.
6. Enforce scope across every product surface.
   - Keep catalog, pricing, signup, checkout, server API, entitlement, content delivery, background
     jobs, marketing, app-store listing, terms, refund rules, support tooling, and review materials
     aligned with the approved matrix.
   - Hiding a button, using an unpublished URL, or disabling only checkout does not remove an
     unapproved capability. Remove or deny the server route, purchasable SKU, fulfillment path, and
     conflicting public claim when scope is intentionally narrowed.
7. Separate legitimate product boundaries from evasion.
   - Separate accounts or legal entities only when seller, contracts, products, operations,
     accounting, tax, support, data boundaries, and provider disclosure genuinely require it.
   - Never process another entity's or product's transactions through an approved account, change
     descriptors or domains to disguise origin, split volume to evade monitoring, or recreate an
     account for a suspended user without written provider approval.
8. Stage applications and changes for consistency.
   - Use bounded review waves when simultaneous information requests would make facts or public
     surfaces drift. Freeze or version the submitted product snapshot and record every material
     change after submission.
   - Notify affected providers through their current required path before or when changing legal
     entity, ownership, product class, domain, country, pricing, volume, marketing, refund,
     fulfillment, credits, marketplace behavior, or other material facts.
9. Classify rejection and suspension precisely.
   - Distinguish domain or product evidence gap, business-model or acceptable-use mismatch, KYB,
     KYC or beneficial-owner verification, bank or payout mismatch, country or sanctions exposure,
     prior-processing history, fraud, disputes, fulfillment, support, commercial risk appetite,
     reserve or capacity decision, network listing, and unknown.
   - Separate provider outage, commercial termination, verification hold, policy violation, fraud
     spike, dispute spike, reserve, payout hold, and network action. They do not authorize the same
     failover or customer response.
10. Analyze risk by cause and cohort.
    - Break fraud, disputes, refunds, declines, cancellation failures, unrecognized charges,
      non-delivery, and duplicate payments down by count and amount, reason, country, SKU,
      acquisition channel, payment method, first versus renewal payment, account age, amount band,
      device, and delivery or usage state.
    - Treat network and provider thresholds as intervention boundaries, not safe operating targets.
      Derive internal alerts and stops from observed loss, volume uncertainty, provider contract,
      customer harm, and recovery capacity rather than copying generic percentages.
11. Fix the cause before preparing an appeal.
    - Improve the actual control: seller identity, SKU scope, server gating, delivery proof,
      descriptor, receipt, renewal notice, cancellation, refund response, fraud checks, acquisition
      channel, fulfillment, moderation, support, or evidence retention.
    - Preserve before-and-after dates, code or configuration versions, affected populations,
      measurements, false-positive cost, rollback, and owner. A rewritten policy page without an
      enforced operational change is not remediation.
12. Submit a bounded evidence packet.
    - State confirmed provider reason, other hypotheses, affected scope, actual fixes, current
      product and review path, identity evidence, approved and requested combinations, recent
      metrics with denominators, operating limits, monitoring, and unresolved risks.
    - Appeal through the existing case or official review route when possible. Do not submit
      repeated new accounts or contradictory applications while one case remains unresolved.
13. Control multi-provider retry and failover.
    - Keep a shared product-owned risk ledger using tokenized or provider-safe identifiers; never
      retain PAN, CVC, raw credentials, or sensitive payloads merely to correlate providers.
    - Bind each payment attempt to one provider. Do not automatically cascade an issuer decline,
      failed authentication, fraud block, policy rejection, or unknown side effect across providers.
    - Move eligible traffic only after the alternate provider approved the same seller, product,
      geography, and operating conditions and the initiating incident permits failover.
14. Resume in observable stages.
    - Reopen only the approved country, product, SKU, amount, channel, or billing slice. Define stop
      conditions from current risk evidence and provider requirements, then increase scope only
      after the agreed observation window has valid denominators and reconciliation.
    - Keep refunds, disputes, reconciliation, evidence submission, customer support, cancellation,
      data access, and export available for old transactions even when new sales are paused.
15. Treat alternative payment channels as new contracts.
    - Bank transfer, virtual accounts, invoices, app-store billing, marketplaces, or direct acquiring
      change seller, tax, receipt, refund, reconciliation, entitlement, customer-support, and
      distribution obligations. Model them explicitly rather than calling them processor-free.
16. Test approval-policy-runtime parity.
    - Cover approved and unapproved seller/domain/product/SKU/country/currency/method combinations,
      stale approval, material product change, hidden API access, review-account paths, conflicting
      identity facts, provider suspension classes, issuer decline, unknown outcome, phased resume,
      refunds during sales pause, and alternate-channel entitlement mapping.
    - Assert that router decisions, checkout, server fulfillment, customer text, support tools,
      deployment gates, and audit receipts use the same approval and policy versions.
17. Label evidence and remaining judgment.
    - Separate provider approval, technical readiness, implemented restriction, tested behavior,
      legal conclusion, and qualified compliance review.
    - Never report that approval is guaranteed, a rejection was cleared, a network record was
      corrected, or a merchant account is safe until the responsible provider evidence proves it.

<!-- mustflow-section: postconditions -->
## Postconditions

- Merchant facts, identity evidence, transaction maps, websites, policies, product runtime, and
  provider submissions agree or remaining discrepancies are explicit.
- Every live payment combination has a current approval-scope record or fails closed before
  checkout and fulfillment.
- Rejection and suspension states lead to bounded remediation, appeal, pause, or approved failover
  paths without transaction laundering or repeated account creation.
- Risk claims include denominators, cohorts, evidence windows, provider-source versions, and owners.

<!-- mustflow-section: verification -->
## Verification

Use configured oneshot command intents when available:

- `changes_status`
- `changes_diff_summary`
- `lint`
- `build`
- `test_related`
- `test`
- `test_audit`
- `docs_validate_fast`
- `test_release`
- `mustflow_check`

Use the narrowest configured product, payment, catalog, policy, docs, routing, fixture, integration,
or release check that covers the changed underwriting boundary. Do not invent live applications,
provider probes, account creation, traffic shifts, customer notices, charges, or refunds outside
the command contract.

<!-- mustflow-section: failure-handling -->
## Failure Handling

- If official policy, approval scope, provider reason, merchant identity, or actual product behavior
  is unknown, stop the approval or clearance claim and name the missing owner or evidence.
- If provider submissions contradict one another, reconcile the canonical facts and disclose the
  correction rather than choosing the easiest version to defend.
- If the product is structurally prohibited or unapproved, keep the affected combination closed and
  seek a genuinely different approved channel or product decision; do not optimize wording.
- If remediation lacks implemented and measured controls, classify it as proposed rather than
  appeal-ready.
- If live provider communication, legal review, production restriction, reserve negotiation,
  payment migration, or customer action is required, stop at that authority boundary with a
  bounded evidence packet.

<!-- mustflow-section: output-format -->
## Output Format

- Merchant and provider-review scope
- Canonical facts and identity discrepancies
- Product transaction map and approval-scope matrix
- Website-policy-runtime parity findings
- Rejection or suspension classification and evidence level
- Risk cohorts, denominators, control changes, and remediation evidence
- Application, appeal, pause, resume, or approved-failover decision
- Qualified legal, compliance, or provider review required
- Command intents run and skipped checks
- Remaining underwriting, payment, fraud, dispute, policy, or authority risk
