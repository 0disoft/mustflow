---
mustflow_doc: skill.payment-integrity-review
locale: en
canonical: true
revision: 4
lifecycle: mustflow-owned
authority: procedure
name: payment-integrity-review
description: Apply this skill when payment, checkout, authorization, capture, refund, partial refund, subscription, invoice, credit note, receipt, tax document, trial, grace period, coupon, promotion, inventory reservation, fulfillment, entitlement, settlement, fee, payout, chargeback, dispute, fraud review, card testing, provider webhook, payment outbox, payment session, payment link, payment-provider integration, admin manual payment operation, payment logs, PCI-sensitive data handling, or payment-related tests need review for money-event integrity, idempotency, ordering, ownership, amount, currency, retry, reconciliation, ledger, or audit risk.
metadata:
  mustflow_schema: "1"
  mustflow_kind: procedure
  pack_id: mustflow.core
  skill_id: mustflow.core.payment-integrity-review
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

# Payment Integrity Review

<!-- mustflow-section: purpose -->
## Purpose

Review payment code as money-event integrity, not provider API success. The core question is whether each money-related state change happens once, for the right actor and resource, with the right amount and currency, even when provider responses, webhooks, databases, queues, retries, redirects, and operators arrive duplicated, late, out of order, or not at all.

<!-- mustflow-section: use-when -->
## Use When

- Payment, checkout, payment-session, payment-link, authorization, capture, refund, partial refund, dispute, chargeback, settlement, fee, payout, receipt, invoice, credit note, tax document, entitlement, fulfillment, subscription, trial, grace period, coupon, promotion, fraud review, card testing, or inventory reservation logic is created, changed, reviewed, or reported.
- Provider webhook handling, provider callback handling, payment outbox records, payment retry handling, timeout handling, provider reconciliation, or async payment method handling can change internal money state.
- Client-supplied amount, currency, quantity, product, discount, shipping, tax, order, subscription, refund, or customer identifiers can influence a payment action.
- Manual admin payment operations, payment logs, audit trails, or payment-related tests need review.

<!-- mustflow-section: do-not-use-when -->
## Do Not Use When

- The task only reviews general business-rule placement with no payment, provider, ledger, webhook, fulfillment, or money-event surface; use `business-rule-leakage-review`.
- The task only designs a generic lifecycle state table with no payment-specific amount, provider, ledger, or fulfillment risk; use `state-machine-pattern`.
- The task only reviews object authorization, tenant isolation, JWTs, sessions, or API access control; use `api-access-control-review` or `auth-permission-change`.
- The task only reviews file upload, storage, preview, or download behavior; use `file-upload-security-review`.
- The task requires live provider account actions, real payment execution, refunds, settlements, secret rotation, or production data changes without explicit user approval and configured command support.

<!-- mustflow-section: required-inputs -->
## Required Inputs

- Money-event ledger: every create, authorize, capture, fulfill, refund, partial refund, tax reversal, credit note, receipt, dispute, chargeback, settlement, payout, adjustment, cancellation, expiration, and entitlement event that can move money, evidence, or access.
- Provider interaction ledger: payment provider calls, webhook event types, redirect handlers,
  polling, reconciliation jobs, SDK clients, idempotency keys, internal order IDs, internal payment
  IDs, attempt IDs, provider object IDs, provider reference IDs, and provider environment selection.
- State-transition ledger: internal states, provider states, allowed transitions, terminal states,
  retry states, async states, hold states, kill-switch states, and transition owners.
- Event log ledger: request submission, provider response, redirect, webhook receipt, webhook
  application, state transition, outbox event, queue handoff, reconciliation decision, fulfillment,
  refund, dispute, admin override, and correction events with ordering, actor, reason, event type,
  and immutable evidence.
- Outbox event-type ledger: allowed internal event type vocabulary, enum or constant registry,
  parser or validator, database constraint when available, and the rejection path for unknown,
  stale, misspelled, or provider-shaped event types.
- Idempotency and uniqueness ledger: logical operation IDs, provider idempotency keys, database uniqueness constraints, webhook event dedupe keys, fulfillment dedupe keys, and retry behavior.
- Amount and currency ledger: product/cart snapshot, invoice and line-item snapshot, server-side calculation path, quantity, discounts, coupons, tax, shipping, minor-unit representation, currency, provider amount, internal ledger amount, receipt amount, refund amount, dispute amount, payout amount, and settlement amount.
- Invoice, receipt, and tax ledger: invoice status, invoice line items, credit notes, receipt generation, receipt delivery, receipt lookup identifiers, tax behavior, tax jurisdiction, tax-exemption evidence, tax-rate snapshots, tax reversals, and tax-document issuance state.
- Dispute and fraud ledger: dispute reason, evidence deadline, evidence packet inputs, refund-dispute collision policy, fraud review state, card-testing defenses, risk holds, descriptor or customer-communication evidence, and network-monitoring exposure when available.
- Ownership ledger: user, tenant, account, order, payment session, refund, subscription, invoice, entitlement, admin actor, and provider customer ownership checks.
- Fulfillment and entitlement ledger: when access, inventory, shipment, credits, licenses, notifications, or downstream side effects are granted or revoked.
- Webhook and retry ledger: signature verification, raw-body handling, event storage, queue handoff, duplicate and out-of-order handling, timeout classification, backoff, and dead-letter behavior.
- Audit and sensitive-data ledger: logs, metrics, traces, segmented approval or decline metrics,
  payment-path segments, orphan authorization monitors, admin overrides, before/after values, reason
  fields, approval paths, rollback paths, and payment-sensitive data redaction.

<!-- mustflow-section: preconditions -->
## Preconditions

- The payment surface and provider boundary are identifiable from the current diff, target files, tests, docs, or user request.
- Required ledgers can be collected from repository evidence or reported as missing without guessing.
- Command execution remains governed by `.mustflow/config/commands.toml`; this skill does not authorize live provider calls or raw commands.

<!-- mustflow-section: allowed-edits -->
## Allowed Edits

- Tighten payment state machines, server-side amount calculation, invoice and line-item snapshots, minor-unit money handling, tax snapshots and reversals, receipt delivery tracking, ownership checks, idempotency keys, provider-ID uniqueness, webhook signature verification, webhook dedupe, outbox event-type validation, queue handoff, one-time fulfillment, async payment handling, authorization/capture distinction, refund/dispute/subscription transitions, inventory and coupon reservation, timeout and retry classification, payout reconciliation, append-only ledgers, secret and card-data redaction, fraud and card-testing defenses, admin audit trails, stale payment endpoint cleanup notes, focused nightmare-path tests, and directly synchronized docs or templates.
- Do not replace a focused payment-integrity fix with a broad payment platform rewrite unless the current code cannot preserve money correctness with a smaller boundary.
- Do not add live payment secrets, real card data, real refunds, real charges, or live-provider side effects.

<!-- mustflow-section: procedure -->
## Procedure

1. Model payment as a state machine. Reject a single `paid`, `success`, or `active` boolean when the code must distinguish created, pending, authorized, captured, failed, cancelled, expired, refunded, partially refunded, disputed, unpaid, retrying, grace, or settled states.
2. Separate the identifiers. Do not let one `order_id` or provider session ID stand in for every
   concept. Track order ID, payment ID, attempt ID, provider customer ID, provider payment/session
   ID, provider refund ID, provider event ID, and internal ledger entry ID separately so retries,
   provider redirects, webhooks, refunds, and reconciliation do not overwrite each other.
3. Keep an immutable event trail. Store request submission, provider response, redirect, webhook,
   state transition, queue handoff, reconciliation, fulfillment, refund, dispute, and admin override
   events with actor, reason, timestamp, provider reference, and before/after state when relevant.
   - For internal outbox rows, validate `event_type` against the owned payment event vocabulary
     before deriving idempotency keys, publishing, or persisting follow-up work. Do not let free-form
     strings, provider event names, stale constants, or user-controlled values become trusted outbox
     operation types.
4. Calculate amount on the server. Treat client-supplied amount, currency, quantity, discount, coupon, tax, shipping, product ID, plan ID, or cart totals as input claims only; rebuild the payable total from trusted product, cart, account, and policy snapshots.
   - Freeze the cart, order, invoice, subscription period, product, price, discount, shipping, tax behavior, tax rate, exchange rate, and entitlement snapshot used for the payment. Do not recalculate paid orders, refunds, chargebacks, receipts, or tax documents from current product tables.
   - For partial refunds, calculate from line items and tax lines, not only from a manual total. Preserve refunded quantity, refunded subtotal, tax reversal, discount allocation, shipping decision, credit note link, and refund reason.
5. Bind every payment object to its owner. Verify user, tenant, order, payment session, refund, subscription, invoice, provider customer, and admin actor ownership before read, write, refund, cancel, fulfillment, or entitlement changes.
6. Compare every amount ledger. Trace order amount, provider request amount, provider response amount, internal money ledger, receipt, settlement, fee, refund, and entitlement amount. Flag any path where one amount can drift without reconciliation.
   - Distinguish gross charge, captured amount, processor fee, application or platform fee, tax collected, tax liability, refund, tax reversal, dispute withdrawal, dispute fee, dispute reinstatement, payout, payout failure, reserve, and negative provider balance. Provider dashboard totals and bank deposits are not the same fact as revenue.
7. Use integer minor units. Reject float, double, string-concatenated, rounded-late, locale-formatted, or JavaScript-number money math when it can cross currency or precision boundaries.
8. Make payment creation idempotent. Use a stable key for one logical payment attempt, not a fresh UUID per retry. Include operation identity such as order or attempt ID, but do not include secrets or raw personal data.
9. Use database uniqueness as the last gate. Add or verify unique constraints for provider payment IDs, provider session IDs, provider event IDs, provider refund IDs, internal ledger IDs, and fulfillment records where duplicates would move money or access twice.
10. Assume webhooks are duplicated. Store event IDs or object/type pairs before applying effects, make handlers idempotent, and treat duplicate delivery as expected behavior.
11. Assume webhooks are out of order. Do not let a late `created`, `pending`, or stale failure event overwrite a captured, refunded, disputed, or terminal internal state. Re-fetch provider state when event order is insufficient.
12. Verify webhook signatures on the raw body. Check signatures before JSON mutation, parsing wrappers, body normalizers, or middleware that changes bytes. Do not keep a debug path that disables signature verification.
13. Return from webhook endpoints quickly. Persist the event, enqueue durable work, and return a provider-acceptable response without doing slow fulfillment, network fan-out, file work, or long transactions in the webhook request.
14. Never use success redirects as proof. Treat checkout success pages, return URLs, frontend callbacks, and local storage flags as user navigation only; fulfillment must depend on verified provider state or signed server-side evidence.
15. Run fulfillment exactly once. Guard entitlement grants, shipments, credit issuance, license creation, invoice finalization, emails with money meaning, and inventory release with unique records or state transitions.
   - Keep internal entitlement state separate from provider subscription state. `past_due`, `unpaid`, grace period, restricted access, revocation, reactivation, and manual invoice-paid events should map through product policy rather than a direct provider-status copy.
16. Handle asynchronous payment methods. Do not fulfill on checkout completion when the provider can still move through pending, requires_action, processing, delayed success, delayed failure, or expiry states.
17. Separate authorization from capture. Do not treat an authorization hold as captured money. Review capture windows, partial captures, expired authorizations, cancellations, orphan authorized-but-not-captured operations, and post-authorization amount changes.
18. Review refunds as money-out events. Check requested, pending, completed, failed, cancelled, and partial refund states; double refunds; refund failures; refund idempotency; refund ownership; refund amount/currency; ledger reversal; entitlement revocation; and receipt updates.
   - Treat refund requests and provider refunds as separate records when provider outcomes can be pending, require customer action, fail, cancel, or arrive through provider dashboards. Use refund-request idempotency keys, not a fresh key per click and not the whole order ID when multiple partial refunds are valid.
   - Lock or reserve refundable balance while a refund is pending when concurrent operators, jobs, or customer flows can otherwise exceed the captured amount.
19. Handle disputes and chargebacks. Ensure dispute events affect access, account risk, support workflow, ledger entries, settlement reports, and customer-visible state without pretending the original capture still stands unchanged.
   - Define the refund-dispute collision policy. A pending or completed refund can collide with a dispute; avoid double compensation, preserve refund IDs and receipt evidence, and decide whether to accept, contest, or block new refunds while a dispute is open.
   - Track evidence deadlines, reason categories, evidence packet fields, customer communications, receipt and invoice links, refund history, shipping or delivery proof, usage logs, login or download evidence, cancellation evidence, and support decisions. Winning a dispute does not erase the operational need to prevent future dispute-rate or fraud-rate exposure.
20. Review subscriptions as state machines. Separate trialing, active, incomplete, incomplete_expired, past_due, grace, unpaid, cancelled, pending cancellation, retrying, upgraded, downgraded, invoice-open, invoice-paid, and invoice-failed states.
   - Model dunning and entitlement policy explicitly: first-payment failure, off-session authentication required, hard decline, soft decline, retry schedule, payment-method update link, reminder sequence, grace period, restriction, revocation, reactivation, and manual invoice resolution.
   - Review plan changes as money and entitlement events. Upgrades, downgrades, seat-count changes, proration, coupon changes, tax changes, account credits, and mid-cycle cancellations must update invoice, entitlement, credit, and refund ledgers consistently.
21. Reserve inventory before confirming it. Check that payment, inventory, cancellation, expiration, refund, and fulfillment cannot oversell, lose stock, or keep stock reserved after an abandoned payment.
22. Reserve coupons before consuming them. Under concurrent attempts, a coupon should not be spent twice or lost forever after a failed or expired payment. Review reservation, consumption, release, and expiry paths.
23. Treat timeouts as unknown outcomes. A provider timeout after request submission is not a failure proof. Verify by idempotency key, provider object lookup, webhook, or reconciliation before retrying or cancelling.
24. Classify retries by failure kind. Separate retryable network failures, provider rate limits, validation failures, authentication-required states, insufficient funds, issuer declines, suspected fraud, duplicate operation responses, and unknown outcomes with bounded backoff.
25. Segment the payment path. When diagnosing approval rate or decline spikes, separate frontend validation, backend request creation, provider gateway, acquirer, card network, issuer, bank, 3DS or additional authentication, and settlement evidence instead of reading one blended failure count.
26. Keep an append-only money ledger. Prefer immutable entries for payment, capture, refund, fee, settlement, chargeback, adjustment, and correction. Flag mutable balance-only code with no event history.
27. Reconcile provider and internal state. Check scheduled or manual reconciliation for missed webhooks, stale internal states, provider-side refunds, settlement fees, disputes, orphan authorizations, and permanently unknown operations.
   - Reconcile payouts separately from sales. A payout is movement from provider balance to a bank account, not revenue. Check payout failure, negative provider balance, reserves, platform or connected-account liability, refunded-after-payout flows, and dispute-after-payout recovery.
   - Reconcile provider-dashboard manual actions back into local state. Provider-side refunds, subscription cancellations, invoice voids, paid invoice overrides, dispute decisions, and tax document changes need webhook ingestion, reconciliation jobs, or explicit manual import evidence.
28. Redact payment-sensitive data. Never log card numbers, CVV, track data, PINs, raw payment credentials, webhook secrets, bearer tokens, provider secret keys, or full provider payloads containing sensitive fields.
   - Keep PCI scope intentionally small. Hosted checkout, tokenized payment methods, mandates, and provider components are preferable when they keep raw card data away from application servers. Never store CVC/CVV after authorization, even for recurring payments.
29. Separate test and live payment planes. Verify API keys, webhook secrets, product IDs, price IDs, environment flags, provider account IDs, and fixtures cannot cross between test and live modes.
30. Audit manual payment operations. Require role, reason, target object, before/after values, approver or policy evidence, operator identity, timestamp, and rollback or correction path for admin overrides.
   - Separate admin abilities for refund, credit, invoice void, tax document reissue, dispute evidence access, subscription cancellation, entitlement override, and provider-dashboard action reconciliation. Money operations need least privilege and audit evidence, not one broad support-admin flag.
31. Add a payment hold or kill-switch path for unsafe flows. Risky provider migrations, webhook
    regressions, reconciliation uncertainty, fraud spikes, or duplicate-money incidents need a way
    to hold fulfillment, stop captures, pause refunds, or disable a provider path without corrupting
    ledger state.
   - Treat fraud review and card testing as payment integrity risks. High failure velocity, repeated card fingerprints, bot-like checkout attempts, high-risk score, mismatched geography, descriptor confusion, unusually fast disputes, and chargeback-rate monitoring need hold, review, rate-limit, or provider-rule evidence before fulfillment.
32. Search for stale payment endpoints. Review old checkout paths, hidden callback URLs, deprecated provider versions, old mobile endpoints, webhook v1 handlers, and manual scripts that still mutate money state.
33. Check invoice, receipt, and tax-document delivery. Payment success is separate from receipt generation, receipt email delivery, invoice finalization, credit note issuance, refund receipt delivery, and tax document issuance. Support should be able to find records by order ID, payment ID, invoice number, receipt number, provider object, safe customer identifier, and correlation ID.
34. Check public errors and support evidence. Payment failures must not lie about success, leak sensitive payment facts, or leave support with no safe correlation ID, provider object ID, receipt or invoice ID, dispute ID, refund ID, or internal event ID.
35. Test the nightmare paths. Include repeated pay-button clicks, replayed webhooks, out-of-order webhooks, success redirect plus database failure, database success plus provider timeout, amount or currency tampering, wrong order ID, concurrent double refund, pay then cancel, expired-session completion, partial refund tax reversal, refund failure, refund then dispute, dispute then refund attempt, subscription retry and dunning, provider-side manual refund, receipt delivery failure, tax-document gap, payout failure, card-testing spike, orphan authorization cleanup, provider kill switch or hold state, and admin override rollback.

<!-- mustflow-section: postconditions -->
## Postconditions

- The payment surface has a money-event map, provider interaction map, identifier map,
  state-transition map, immutable event log, idempotency and uniqueness map, amount and currency map,
  invoice/receipt/tax map, ownership map, fulfillment and entitlement map, webhook/retry map,
  outbox event-type validation map, reconciliation and hold-state map, dispute/fraud map, payout
  map, and audit/sensitive-data map.
- Any false success, duplicate money movement, duplicate fulfillment, wrong-owner action, wrong amount, wrong currency, stale event overwrite, timeout misclassification, or missing reconciliation is fixed or reported with evidence.
- Tests or explicit verification cover the highest-risk nightmare paths available in the current scope.

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

Prefer focused tests for duplicate operations, webhook replay, out-of-order events, ownership denial, amount tampering, timeout unknowns, one-time fulfillment, partial refunds, failed refunds, refund-dispute collisions, subscription retry and dunning, receipt delivery failure, tax reversal, payout reconciliation, fraud holds, and card-testing controls. Use broader checks when payment integrity touches shared state machines, provider adapters, database migrations, or template surfaces.

<!-- mustflow-section: failure-handling -->
## Failure Handling

- If amount, currency, ownership, or provider-state evidence is missing, report the missing ledger instead of approving the payment path.
- If a provider outcome is unknown, do not mark it failed or paid without reconciliation evidence.
- If webhook signature verification cannot be proven because middleware hides the raw body, report that as a blocking integrity risk.
- If duplicate prevention relies only on in-memory flags, frontend disabling, or sequential UI behavior, report the missing durable idempotency gate.
- If invoice, receipt, tax, dispute, payout, or provider-dashboard manual-action evidence is missing, report the missing operational ledger instead of treating provider success as complete payment evidence.
- If tests cannot hit live-provider behavior, use provider fixtures, signed webhook fixtures, fake adapters, or state-machine tests and report remaining live integration risk.

<!-- mustflow-section: output-format -->
## Output Format

- Payment surface and provider boundary reviewed
- Money-event, provider, identifier, state, event-log, outbox event-type, idempotency, amount, invoice, receipt, tax, ownership, fulfillment, webhook, retry, dispute, fraud, payout, reconciliation, hold-state, audit, and sensitive-data ledgers
- Findings or fixes for duplicate, late, out-of-order, wrong-actor, wrong-amount, wrong-currency, timeout, retry, refund, subscription, tax, receipt, chargeback, fraud, payout, reconciliation, and audit risks
- Nightmare-path tests or evidence added, run, skipped, or still missing
- Command intents run
- Remaining payment-integrity risk
