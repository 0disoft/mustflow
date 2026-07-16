---
mustflow_doc: skill.credit-ledger-integrity-review
locale: en
canonical: true
revision: 2
lifecycle: mustflow-owned
authority: procedure
name: credit-ledger-integrity-review
description: Apply this skill when credits, points, wallet balances, reward points, prepaid credits, usage credits, bonus credits, loyalty points, stored-value balances, balance deductions, accruals, refunds, reversals, expirations, reservations, captures, releases, admin adjustments, ledger tables, balance caches, reconciliation jobs, settlement reports, or credit-related tests need review for ledger integrity, idempotency, atomic balance changes, concurrency, ordering, ownership, amount precision, policy snapshots, expiry lots, failure recovery, audit evidence, or reconciliation risk.
metadata:
  mustflow_schema: "1"
  mustflow_kind: procedure
  pack_id: mustflow.core
  skill_id: mustflow.core.credit-ledger-integrity-review
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

# Credit Ledger Integrity Review

<!-- mustflow-section: purpose -->
## Purpose

Review credit, point, and wallet balance code as an accounting ledger, not a balance subtraction. The core question is whether every balance-changing event has a durable cause, happens once, preserves non-negative and unit invariants under concurrency, can be reversed or reconciled after failure, and leaves enough evidence for support, audit, and settlement.

<!-- mustflow-section: use-when -->
## Use When

- Credit, point, wallet, reward, prepaid, usage, bonus, loyalty, stored-value, quota-like paid credit, or internal money-equivalent balance logic is created, changed, reviewed, or reported.
- Balance deduction, accrual, refund, reversal, expiration, reservation, capture, release, adjustment, transfer, coupon-backed credit, item purchase, game purchase, subscription credit, or order credit logic can change a user or tenant balance.
- Code touches ledger tables, balance columns, balance caches, idempotency keys, source IDs, conditional updates, locks, transactions, queue consumers, expiry batches, reconciliation jobs, settlement reports, or admin tools for credits or points.
- Tests need to prove duplicate requests, concurrent deductions, partial refunds, expiration races, failure injection, cache or replica staleness, or ledger-vs-balance reconciliation.

<!-- mustflow-section: do-not-use-when -->
## Do Not Use When

- The task only reviews payment-provider calls, checkout redirects, card payments, provider webhooks, authorization, capture, settlement, or chargebacks; use `payment-integrity-review`.
- The task only reviews general business-rule placement without a balance, ledger, wallet, credit, point, or reconciliation surface; use `business-rule-leakage-review`.
- The task only designs a generic lifecycle state machine with no ledger, amount, idempotency, balance, reservation, expiry, or reconciliation risk; use `state-machine-pattern`.
- The task only reviews cache correctness for a non-balance value; use `cache-integrity-review`.
- The task only reviews soft token, step, concurrency, request-count, or rate budgets that are not prepaid or money-equivalent; use the relevant LLM cost, agent execution, concurrency, or rate-limit skill.
- The task requires production balance corrections, real refunds, data migrations, or direct database repair without explicit user approval and configured command support.

<!-- mustflow-section: required-inputs -->
## Required Inputs

- Balance surface ledger: balance columns, wallet rows, account rows, point buckets, credit lots, cached balances, read models, and derived totals.
- Ledger-entry ledger: every earn, grant, charge, deduct, reserve, capture, release, expire, refund, reverse, adjust, transfer, settlement, and correction entry.
- Source identity ledger: order ID, payment ID, usage ID, subscription ID, coupon ID, item ID, event ID, request ID, idempotency key, admin action ID, and source type.
- Atomicity ledger: transaction boundaries, conditional updates, row locks, optimistic versions, uniqueness constraints, affected-row checks, and retry policy.
- Amount and unit ledger: integer unit or decimal representation, maximum amount, rounding rules, conversion rates, bonus rules, policy version, product price snapshot, and campaign snapshot.
- Ownership ledger: user, tenant, wallet, account, team, family, organization, operator, source object, and current actor checks.
- Expiry and lot ledger: FIFO, LIFO, earliest-expiry-first, bucket allocation, expiry batch, lot-level consumption, partial use, partial refund, and lot restoration behavior.
- Reservation ledger: reserved, captured, released, failed, expired, cancelled, partially refunded, and reversed states, plus the owner of each transition.
- Queue and cache ledger: producer events, consumer idempotency, partitioning, outbox or inbox records, read-replica routing, cache invalidation, and balance display semantics.
- Audit and reconciliation ledger: logs, metrics, support IDs, before/after values, daily balance-vs-ledger checks, settlement reports, and manual adjustment evidence.

<!-- mustflow-section: preconditions -->
## Preconditions

- The credit or point surface is identifiable from the current diff, target files, tests, docs, or user request.
- Required ledgers can be collected from repository evidence or reported as missing without guessing.
- Command execution remains governed by `.mustflow/config/commands.toml`; this skill does not authorize production balance changes, real refunds, migrations, or raw commands.

<!-- mustflow-section: allowed-edits -->
## Allowed Edits

- Tighten ledger-entry models, source identifiers, idempotency comparison, conditional balance updates, database constraints, transaction boundaries, row-lock targets, optimistic-lock retry classification, amount validation, rounding policy, non-negative invariants, refund and reversal modeling, partial-use handling, expiry lot allocation, reservation/capture/release transitions, queue idempotency and ordering, cache invalidation, replica-read routing, admin adjustment audit trails, reconciliation checks, evidence logs, focused concurrency and failure tests, and directly synchronized docs or templates.
- Do not replace a focused balance-integrity fix with a broad wallet rewrite unless current code cannot preserve ledger correctness with a smaller boundary.
- Do not add real user balance data, production correction scripts, live settlement actions, or secret-bearing provider payloads.

<!-- mustflow-section: procedure -->
## Procedure

1. Treat balance as a derived fact. Prefer append-only ledger entries plus a maintained or checked balance over a lone mutable `balance` column. Flag any path where a balance can change without a durable cause record.
2. Require an external source key. Every balance-changing request needs a stable source identity such as order ID, payment ID, usage ID, event ID, subscription ID, coupon ID, admin action ID, or idempotency key.
3. Compare idempotency payloads. If a duplicate key appears, verify the existing entry has the same user, tenant, wallet, source, amount, unit, product, policy version, and state before returning success.
4. Make insufficient-balance checks atomic. Reject read-then-update subtraction. Look for conditional updates, row locks, serializable ledger insertion, or equivalent storage-level protection that checks availability and changes balance as one fact.
5. Verify affected rows. Conditional deductions must check that exactly the intended row changed. Zero affected rows should become an explicit insufficient-balance, stale-version, or conflict result.
6. Follow the transaction boundary. Deduction, ledger insert, order creation, coupon state, reservation, capture, refund, and event publication must not commit as unrelated fragments unless compensation and reconciliation are explicit.
7. Lock the contested resource. A lock on an order row does not protect a wallet balance. Check whether the wallet, balance row, credit lot, or unique ledger key is the actual contention point.
8. Classify optimistic-lock retries. Retry only the same logical request after technical conflict. Do not turn separate user clicks, duplicated business requests, or stale client retries into multiple successful deductions by accident.
9. Use exact amount units. Credits and points should use integer smallest units or decimal types with explicit scale. Reject float, double, locale-formatted strings, and rounded-late arithmetic.
10. Centralize rounding policy. Identify where fractional bonuses, exchange rates, discounts, and refunds round. The service path, batch path, admin path, and report path must use the same policy and policy version.
11. Validate amount shape at every entrypoint. Reject negative, zero when invalid, fractional when invalid, too-large, wrong-unit, wrong-currency, overflow-prone, or client-trusted amounts before they reach balance mutation code.
12. Add database-level invariants where possible. Look for `CHECK (balance >= 0)`, conditional updates, uniqueness constraints, ledger sum checks, or equivalent persistence guards instead of app-only promises.
13. Enforce unique ledger identity. Use database uniqueness for combinations such as user, wallet, source type, source ID, operation type, and reversal target where duplicates would double-spend or double-refund.
14. Model refunds as reversals. Refunds, cancellations, and corrections should reference the original ledger entry or reservation, not call a generic balance increase with no causal link.
15. Test partial use and partial refund. Exercise cases where only part of a balance, lot, coupon, order, or mixed payment is used or refunded. Full-cancel-only assumptions are not enough.
16. Consume expiry lots deliberately. When credits expire, inspect FIFO, LIFO, earliest-expiry-first, or policy-specific lot allocation. Record lot-level consumption so later refund and audit can reconstruct the path.
17. Race expiry and usage. Expiry batches must use the same ledger, lock, idempotency, and conditional update rules as user requests. Flag direct batch subtraction that bypasses wallet safeguards.
18. Separate reservation from capture. Model reserved, captured, released, failed, expired, cancelled, and partially refunded states when credits are held before final purchase, fulfillment, or external payment completion.
    - This ledger owns atomic reserve, capture, and release and the balance invariant. Commands and durable workflows may consume those operations but must not redefine balance availability, ownership, or accounting transitions.
19. Draw allowed state transitions. Prevent arbitrary `status = REFUNDED`, `status = CAPTURED`, or `status = EXPIRED` writes. Each transition should have a guard, cause, effect, and idempotency rule.
20. Preserve queue ordering or tolerate reordering. If deduction, cancellation, refund, or expiry events use a queue, prove user, wallet, or transaction-level ordering, or make each consumer robust to reordered events.
21. Treat message redelivery as normal. Producers, queues, schedulers, and webhooks can duplicate events. Consumer-side ledger mutation must be idempotent with durable dedupe records.
22. Do not decide deduction from cache. Balance caches and Redis totals are display or acceleration surfaces only. Final availability checks must happen in the authoritative store.
23. Handle read-replica lag. After a deduction, API responses and next actions should not read stale replica balances in a way that invites duplicate clicks or false support claims.
24. Route admin adjustments through the same ledger. Manual grants, penalties, refunds, corrections, and support actions need role checks, reason, source identity, before/after values, operator ID, approval evidence, and rollback or correction path.
25. Bind actor to wallet ownership. Validate user, tenant, team, family, organization, wallet, and source object ownership. Do not trust request-body `user_id`, `wallet_id`, or `tenant_id` without actor-context checks.
26. Snapshot price and policy inputs. Store product price, discount, exchange rate, bonus rule, campaign ID, policy version, and calculated result at transaction time. Do not recalculate old transactions from current product or policy tables.
27. Inject failure at split points. Review or add tests for ledger insert followed by order failure, order creation followed by deduction failure, deduction success followed by timeout, refund success followed by event failure, and event publish failure after commit.
28. Reconcile ledger and balance independently. Require scheduled or manual checks that compare current balance to ledger sums, lot sums, reservation sums, and settlement reports, then surface drift with enough identifiers to repair safely.
29. Log evidence, not vibes. Balance-changing logs should include safe user, wallet, amount, before, after, source type, source ID, idempotency key, request ID, transaction ID, policy version, and operator ID when applicable.
30. Test the nightmare paths. Include concurrent overdraw attempts, repeated submit clicks, duplicate idempotency key with changed amount, duplicate queue delivery, out-of-order cancellation and deduction, expiry batch racing usage, partial refund, cache stale display, replica stale read, admin adjustment, and reconciliation drift.

<!-- mustflow-section: postconditions -->
## Postconditions

- The credit surface has balance, ledger-entry, source identity, atomicity, amount/unit, ownership, expiry/lot, reservation, queue/cache, audit, and reconciliation maps.
- Any mutable-balance-only path, missing source key, weak idempotency comparison, non-atomic deduction, wrong lock target, float amount, hidden rounding policy, missing DB invariant, duplicate ledger risk, generic refund, expiry race, cache-trusted deduction, stale replica read, unaudited admin adjustment, or missing reconciliation is fixed or reported with evidence.
- Tests or explicit verification cover the highest-risk concurrency, failure, duplicate, expiry, reservation, refund, cache, and reconciliation paths available in the current scope.
- Soft operational budgets remain outside this ledger unless they represent prepaid or money-equivalent value.

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

Prefer focused tests for concurrent deductions, duplicate idempotency keys, affected-row checks, partial refunds, expiry races, queue redelivery, failure injection, admin adjustments, cache invalidation, replica reads, and ledger-vs-balance reconciliation. Use broader checks when credit integrity touches shared state machines, provider adapters, database migrations, template surfaces, or release output.

<!-- mustflow-section: failure-handling -->
## Failure Handling

- If the source key, ledger entry, amount policy, transaction boundary, or ownership evidence is missing, report the missing ledger instead of approving the deduction path.
- If duplicate prevention relies only on frontend button disabling, in-memory flags, read-before-insert checks, or queue producer promises, report the missing durable idempotency gate.
- If balance drift is found, do not invent a correction. Report the drift evidence and the missing reconciliation or correction workflow.
- If concurrency behavior cannot be tested directly, use storage-level constraints, deterministic fake repositories, transaction fixtures, or explicit reasoning from current code, and report remaining live concurrency risk.
- If sensitive user or financial data appears in logs or test fixtures, redact it and summarize safely.

<!-- mustflow-section: output-format -->
## Output Format

- Credit or wallet surface reviewed
- Balance, ledger-entry, source identity, atomicity, amount/unit, ownership, expiry/lot, reservation, queue/cache, audit, and reconciliation ledgers
- Findings or fixes for duplicate, concurrent, wrong-owner, wrong-amount, rounding, expiry, reservation, refund, cache, replica, failure-recovery, admin, and reconciliation risks
- Nightmare-path tests or evidence added, run, skipped, or still missing
- Command intents run
- Remaining credit-ledger integrity risk
