---
mustflow_doc: skill.payment-integrity-review
locale: en
canonical: true
revision: 1
lifecycle: mustflow-owned
authority: procedure
name: payment-integrity-review
description: Apply this skill when payment, checkout, authorization, capture, refund, partial refund, subscription, invoice, trial, grace period, coupon, promotion, inventory reservation, fulfillment, entitlement, settlement, fee, chargeback, dispute, provider webhook, payment session, payment link, payment-provider integration, admin manual payment operation, payment logs, PCI-sensitive data handling, or payment-related tests need review for money-event integrity, idempotency, ordering, ownership, amount, currency, retry, reconciliation, ledger, or audit risk.
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

- Payment, checkout, payment-session, payment-link, authorization, capture, refund, partial refund, dispute, chargeback, settlement, fee, receipt, entitlement, fulfillment, subscription, invoice, trial, grace period, coupon, promotion, or inventory reservation logic is created, changed, reviewed, or reported.
- Provider webhook handling, provider callback handling, payment retry handling, timeout handling, provider reconciliation, or async payment method handling can change internal money state.
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

- Money-event ledger: every create, authorize, capture, fulfill, refund, dispute, chargeback, settlement, adjustment, cancellation, expiration, and entitlement event that can move money or access.
- Provider interaction ledger: payment provider calls, webhook event types, redirect handlers, polling, reconciliation jobs, SDK clients, idempotency keys, provider object IDs, and provider environment selection.
- State-transition ledger: internal states, provider states, allowed transitions, terminal states, retry states, async states, and transition owners.
- Idempotency and uniqueness ledger: logical operation IDs, provider idempotency keys, database uniqueness constraints, webhook event dedupe keys, fulfillment dedupe keys, and retry behavior.
- Amount and currency ledger: product/cart snapshot, server-side calculation path, quantity, discounts, coupons, tax, shipping, minor-unit representation, currency, provider amount, internal ledger amount, receipt amount, and settlement amount.
- Ownership ledger: user, tenant, account, order, payment session, refund, subscription, invoice, entitlement, admin actor, and provider customer ownership checks.
- Fulfillment and entitlement ledger: when access, inventory, shipment, credits, licenses, notifications, or downstream side effects are granted or revoked.
- Webhook and retry ledger: signature verification, raw-body handling, event storage, queue handoff, duplicate and out-of-order handling, timeout classification, backoff, and dead-letter behavior.
- Audit and sensitive-data ledger: logs, metrics, traces, admin overrides, before/after values, reason fields, approval paths, rollback paths, and payment-sensitive data redaction.

<!-- mustflow-section: preconditions -->
## Preconditions

- The payment surface and provider boundary are identifiable from the current diff, target files, tests, docs, or user request.
- Required ledgers can be collected from repository evidence or reported as missing without guessing.
- Command execution remains governed by `.mustflow/config/commands.toml`; this skill does not authorize live provider calls or raw commands.

<!-- mustflow-section: allowed-edits -->
## Allowed Edits

- Tighten payment state machines, server-side amount calculation, minor-unit money handling, ownership checks, idempotency keys, provider-ID uniqueness, webhook signature verification, webhook dedupe, queue handoff, one-time fulfillment, async payment handling, authorization/capture distinction, refund/dispute/subscription transitions, inventory and coupon reservation, timeout and retry classification, append-only ledgers, secret and card-data redaction, admin audit trails, stale payment endpoint cleanup notes, focused nightmare-path tests, and directly synchronized docs or templates.
- Do not replace a focused payment-integrity fix with a broad payment platform rewrite unless the current code cannot preserve money correctness with a smaller boundary.
- Do not add live payment secrets, real card data, real refunds, real charges, or live-provider side effects.

<!-- mustflow-section: procedure -->
## Procedure

1. Model payment as a state machine. Reject a single `paid`, `success`, or `active` boolean when the code must distinguish created, pending, authorized, captured, failed, cancelled, expired, refunded, partially refunded, disputed, unpaid, retrying, grace, or settled states.
2. Calculate amount on the server. Treat client-supplied amount, currency, quantity, discount, coupon, tax, shipping, product ID, plan ID, or cart totals as input claims only; rebuild the payable total from trusted product, cart, account, and policy snapshots.
3. Bind every payment object to its owner. Verify user, tenant, order, payment session, refund, subscription, invoice, provider customer, and admin actor ownership before read, write, refund, cancel, fulfillment, or entitlement changes.
4. Compare every amount ledger. Trace order amount, provider request amount, provider response amount, internal money ledger, receipt, settlement, fee, refund, and entitlement amount. Flag any path where one amount can drift without reconciliation.
5. Use integer minor units. Reject float, double, string-concatenated, rounded-late, locale-formatted, or JavaScript-number money math when it can cross currency or precision boundaries.
6. Make payment creation idempotent. Use a stable key for one logical payment attempt, not a fresh UUID per retry. Include operation identity such as order or attempt ID, but do not include secrets or raw personal data.
7. Use database uniqueness as the last gate. Add or verify unique constraints for provider payment IDs, provider session IDs, provider event IDs, provider refund IDs, internal ledger IDs, and fulfillment records where duplicates would move money or access twice.
8. Assume webhooks are duplicated. Store event IDs or object/type pairs before applying effects, make handlers idempotent, and treat duplicate delivery as expected behavior.
9. Assume webhooks are out of order. Do not let a late `created`, `pending`, or stale failure event overwrite a captured, refunded, disputed, or terminal internal state. Re-fetch provider state when event order is insufficient.
10. Verify webhook signatures on the raw body. Check signatures before JSON mutation, parsing wrappers, body normalizers, or middleware that changes bytes. Do not keep a debug path that disables signature verification.
11. Return from webhook endpoints quickly. Persist the event, enqueue durable work, and return a provider-acceptable response without doing slow fulfillment, network fan-out, file work, or long transactions in the webhook request.
12. Never use success redirects as proof. Treat checkout success pages, return URLs, frontend callbacks, and local storage flags as user navigation only; fulfillment must depend on verified provider state or signed server-side evidence.
13. Run fulfillment exactly once. Guard entitlement grants, shipments, credit issuance, license creation, invoice finalization, emails with money meaning, and inventory release with unique records or state transitions.
14. Handle asynchronous payment methods. Do not fulfill on checkout completion when the provider can still move through pending, requires_action, processing, delayed success, delayed failure, or expiry states.
15. Separate authorization from capture. Do not treat an authorization hold as captured money. Review capture windows, partial captures, expired authorizations, cancellations, and post-authorization amount changes.
16. Review refunds as money-out events. Check partial refunds, double refunds, refund failures, refund idempotency, refund ownership, refund amount/currency, ledger reversal, entitlement revocation, and receipt updates.
17. Handle disputes and chargebacks. Ensure dispute events affect access, account risk, support workflow, ledger entries, settlement reports, and customer-visible state without pretending the original capture still stands unchanged.
18. Review subscriptions as state machines. Separate trialing, active, past_due, grace, unpaid, cancelled, pending cancellation, retrying, upgraded, downgraded, invoice-open, invoice-paid, and invoice-failed states.
19. Reserve inventory before confirming it. Check that payment, inventory, cancellation, expiration, refund, and fulfillment cannot oversell, lose stock, or keep stock reserved after an abandoned payment.
20. Reserve coupons before consuming them. Under concurrent attempts, a coupon should not be spent twice or lost forever after a failed or expired payment. Review reservation, consumption, release, and expiry paths.
21. Treat timeouts as unknown outcomes. A provider timeout after request submission is not a failure proof. Verify by idempotency key, provider object lookup, webhook, or reconciliation before retrying or cancelling.
22. Classify retries by failure kind. Separate retryable network failures, provider rate limits, validation failures, insufficient funds, authentication failures, duplicate operation responses, and unknown outcomes with bounded backoff.
23. Keep an append-only money ledger. Prefer immutable entries for payment, capture, refund, fee, settlement, chargeback, adjustment, and correction. Flag mutable balance-only code with no event history.
24. Reconcile provider and internal state. Check scheduled or manual reconciliation for missed webhooks, stale internal states, provider-side refunds, settlement fees, disputes, and permanently unknown operations.
25. Redact payment-sensitive data. Never log card numbers, CVV, track data, PINs, raw payment credentials, webhook secrets, bearer tokens, provider secret keys, or full provider payloads containing sensitive fields.
26. Separate test and live payment planes. Verify API keys, webhook secrets, product IDs, price IDs, environment flags, provider account IDs, and fixtures cannot cross between test and live modes.
27. Audit manual payment operations. Require role, reason, target object, before/after values, approver or policy evidence, operator identity, timestamp, and rollback or correction path for admin overrides.
28. Search for stale payment endpoints. Review old checkout paths, hidden callback URLs, deprecated provider versions, old mobile endpoints, webhook v1 handlers, and manual scripts that still mutate money state.
29. Check public errors and support evidence. Payment failures must not lie about success, leak sensitive payment facts, or leave support with no safe correlation ID, provider object ID, or internal event ID.
30. Test the nightmare paths. Include repeated pay-button clicks, replayed webhooks, out-of-order webhooks, success redirect plus database failure, database success plus provider timeout, amount or currency tampering, wrong order ID, concurrent double refund, pay then cancel, expired-session completion, subscription retry, provider missed webhook, and admin override rollback.

<!-- mustflow-section: postconditions -->
## Postconditions

- The payment surface has a money-event map, provider interaction map, state-transition map, idempotency and uniqueness map, amount and currency map, ownership map, fulfillment and entitlement map, webhook/retry map, and audit/sensitive-data map.
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

Prefer focused tests for duplicate operations, webhook replay, out-of-order events, ownership denial, amount tampering, timeout unknowns, and one-time fulfillment. Use broader checks when payment integrity touches shared state machines, provider adapters, database migrations, or template surfaces.

<!-- mustflow-section: failure-handling -->
## Failure Handling

- If amount, currency, ownership, or provider-state evidence is missing, report the missing ledger instead of approving the payment path.
- If a provider outcome is unknown, do not mark it failed or paid without reconciliation evidence.
- If webhook signature verification cannot be proven because middleware hides the raw body, report that as a blocking integrity risk.
- If duplicate prevention relies only on in-memory flags, frontend disabling, or sequential UI behavior, report the missing durable idempotency gate.
- If tests cannot hit live-provider behavior, use provider fixtures, signed webhook fixtures, fake adapters, or state-machine tests and report remaining live integration risk.

<!-- mustflow-section: output-format -->
## Output Format

- Payment surface and provider boundary reviewed
- Money-event, provider, state, idempotency, amount, ownership, fulfillment, webhook, retry, audit, and sensitive-data ledgers
- Findings or fixes for duplicate, late, out-of-order, wrong-actor, wrong-amount, wrong-currency, timeout, retry, reconciliation, and audit risks
- Nightmare-path tests or evidence added, run, skipped, or still missing
- Command intents run
- Remaining payment-integrity risk
