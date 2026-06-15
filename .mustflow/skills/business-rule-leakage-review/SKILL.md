---
mustflow_doc: skill.business-rule-leakage-review
locale: en
canonical: true
revision: 1
lifecycle: mustflow-owned
authority: procedure
name: business-rule-leakage-review
description: Apply this skill when code is created, changed, reviewed, or reported and business rules may leak into the wrong layer, entrypoint, query, mapper, cache, batch, webhook, report, admin tool, UI guard, status assignment, date calculation, default value, DTO update, exception handler, transaction, event publisher, search index, or external integration. Use for rules involving money, permissions, ownership, state, settlement, discounts, coupons, refunds, inventory, notifications, subscriptions, visibility, eligibility, tenant scope, expiry, price, tax, fees, points, reports, and other product or domain facts that must be enforced consistently across API, admin, mobile, batch, webhook, migration, import, export, support, and direct data paths.
metadata:
  mustflow_schema: "1"
  mustflow_kind: procedure
  pack_id: mustflow.core
  skill_id: mustflow.core.business-rule-leakage-review
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

# Business Rule Leakage Review

<!-- mustflow-section: purpose -->
## Purpose

Review whether product and business rules are enforced at the real source of truth instead of
leaking into UI conditions, controllers, ad hoc queries, mappers, batches, webhooks, caches,
reports, and support tools.

The review question is not "is the code clean?" It is "where does the company decide money,
permission, ownership, state, settlement, discount, inventory, visibility, and eligibility, and can
every entrypoint bypass or reuse that decision consistently?"

<!-- mustflow-section: use-when -->
## Use When

- Code review, implementation, or refactor work touches money, permission, ownership, state,
  settlement, discount, coupon, refund, inventory, notification, subscription, visibility,
  eligibility, expiry, pricing, tax, fee, point, report, tenant, workspace, organization, or product
  rules.
- Rules appear in UI guards, controllers, query filters, mappers, DTO defaults, entities, service
  helpers, admin APIs, mobile APIs, batches, webhooks, search indexes, reports, exports, imports,
  support tools, migrations, direct SQL, or tests.
- A route, batch, webhook, admin tool, or support script can perform the same business action through
  a different entrance.
- A review needs to decide whether to use `auth-permission-change`, `state-machine-pattern`,
  `failure-integrity-review`, `cache-integrity-review`, `database-query-bottleneck-review`,
  `database-migration-change`, `result-option`, `type-state-modeling-review`,
  `testability-boundary-review`, or `change-blast-radius-review`.

<!-- mustflow-section: do-not-use-when -->
## Do Not Use When

- The only issue is authorization mechanics, role or tenant enforcement, or permission-cache
  behavior; use `auth-permission-change` as the primary skill.
- The only issue is lifecycle transition modeling; use `state-machine-pattern`.
- The only issue is false success, rollback, retry, or swallowed failure; use
  `failure-integrity-review`.
- The only issue is stale or unsafe cache truth; use `cache-integrity-review`.
- The only issue is broad future change spread or deletion cost; use `change-blast-radius-review`.
- The code is a pure calculation with explicit inputs and all callers already share one policy
  owner.

<!-- mustflow-section: required-inputs -->
## Required Inputs

- User goal, current diff or target files, and the business rule being created, changed, or reviewed.
- Rule ledger: money, permission, ownership, state, settlement, discount, coupon, refund, inventory,
  notification, subscription, visibility, eligibility, expiry, pricing, tax, fee, point, report, or
  tenant fact under review.
- Entrypoint ledger: user API, admin API, mobile API, internal script, migration, batch, webhook,
  support tool, CSV upload, import, export, test endpoint, direct SQL, and data correction path.
- Enforcement ledger: UI guard, controller, service, domain object, policy object, repository query,
  database constraint or policy, mapper, cache, search index, report query, event handler, and test.
- Consistency ledger: list/detail scope, create/update path, admin/user path, API/batch path,
  DB/search index path, cache/source path, webhook/manual replay path, and old/new migration path.
- Evidence for state changes, transaction boundaries, event timing, idempotency, error messages,
  default values, nullable meanings, and configured command intents.

<!-- mustflow-section: preconditions -->
## Preconditions

- The task matches the Use When conditions and does not match the Do Not Use When exclusions.
- Higher-priority instructions and `.mustflow/config/commands.toml` have been checked for the
  current scope.
- Required inputs are available, or missing rule, entrypoint, enforcement, or consistency evidence
  can be reported without guessing.
- If the review finds a concrete auth, state-machine, failure, cache, migration, result, type, or
  testability issue, use the narrower skill before editing that part.

<!-- mustflow-section: allowed-edits -->
## Allowed Edits

- Move business decisions to a named policy, domain, application, transition, or database boundary
  that every relevant entrypoint can reuse.
- Replace UI-only, controller-only, query-only, mapper-only, report-only, admin-only, or batch-only
  rules with shared enforcement or explicit second-line validation.
- Add or tighten list/detail consistency, create/update field restrictions, admin/support tool
  validation, webhook verification and deduplication, event timing, outbox usage, idempotency,
  transaction boundaries, default-value ownership, nullable result shapes, search rechecks, and
  report calculation owners.
- Add focused tests that prove the rule through at least the real policy owner and the highest-risk
  bypass entrypoint.
- Do not solve leakage by copying the same condition into more places unless the duplicate is an
  explicit defense layer whose owner and drift risk are named.

<!-- mustflow-section: procedure -->
## Procedure

1. Name the business rule before reading style.
   - Identify the rule that affects money, permission, ownership, state, settlement, discount,
     coupon, refund, inventory, notification, subscription, visibility, eligibility, expiry, pricing,
     tax, fee, points, reports, or tenants.
   - If the rule cannot be named, report that the business source of truth is unclear.
2. Trace every entrance to the same action.
   - Check user API, admin API, mobile API, internal scripts, migrations, batches, webhooks, support
     tools, CSV uploads, imports, exports, test endpoints, direct SQL, and data correction paths.
   - Ask whether the same decision is enforced after bypassing the UI or ordinary API route.
3. Reject UI-only enforcement.
   - A disabled button is not a rule. Coupons, ownership, cancellation windows, inventory limits,
     and visibility must be enforced server-side or by a shared durable boundary.
   - Follow matching API, batch, admin, mobile, and support paths.
4. Keep controllers from judging business eligibility.
   - `if user.role == admin`, refund permission, coupon eligibility, cancellation allowance, and
     inventory decisions in controllers are leakage candidates.
   - Prefer a policy or application boundary used by all controllers.
5. Review state changes as business commands.
   - Direct `status = "DONE"` or scattered status assignment can bypass audit logs, settlement,
     inventory restoration, point reversal, notifications, and domain events.
   - Prefer commands such as `completeOrder`, `cancelOrder`, or `refundPayment` with transition
     rules and effects.
6. Compare list and detail rules.
   - A list may hide records while detail `findById` still exposes them.
   - Compare ownership, tenant, visibility, expiry, deletion, and permission predicates on list,
     detail, export, search, and autocomplete paths.
7. Treat query predicates as policy.
   - `deleted_at is null`, `tenant_id = ?`, `visible = true`, `expires_at > now()`, and
     `status in (...)` are not just filters.
   - Give these predicates one owner or reusable scope so they do not disappear from another query.
8. Treat admin paths as business paths.
   - Admin and support tools still need refund, settlement, inventory, account suspension, and
     irreversible-action rules.
   - Verify admin can do what the business allows, not everything the database allows.
9. Review batches and schedulers.
   - Expiry, auto-refund, subscription renewal, point expiration, settlement, reminder, cleanup, and
     reconciliation rules often live outside request handlers.
   - Check whether batch logic uses the same policy as online actions and handles stale data.
10. Place tests at the rule owner.
    - If `should not allow expired coupon` exists only in controller tests, the rule can vanish when
      routing changes.
    - Prefer domain, policy, service, API, and bypass-entry tests according to where enforcement
      truly belongs.
11. Hunt duplicated business constants.
    - Repeated `30`, `7`, `10000`, `0.1`, `3`, and similar values may be trial length, refund days,
      minimum payment, fee rate, retry count, grace period, or limit.
    - Name the rule and centralize or explicitly duplicate with drift protection.
12. Review date and timezone policy.
    - Refund windows, coupon expiry, attendance, subscription renewal, and settlement cutoff depend
      on which event time and timezone count.
    - Direct `now()` in business decisions is leakage unless the time policy is captured at the
      boundary.
13. Open helper names such as `isActive`, `isValid`, and `canUse`.
    - These names hide whether active means paid, approved, undeleted, unexpired, unsuspended, or
      visible.
    - Split or rename when different callers need different meanings.
14. Separate authentication, authorization, ownership, and eligibility.
    - Logged-in, admin, owner, tenant member, coupon eligible, refund approver, and settlement
      operator are different facts.
    - Use `auth-permission-change` when permission or tenant scope is the primary risk.
15. Restrict mutable fields after creation.
    - Create paths often validate price, owner, payment state, settlement status, and product facts,
      while update paths accept broad DTOs.
    - Deny updates to immutable business fields by input shape, policy, or database rule.
16. Make PATCH semantics explicit.
    - Missing field, explicit `null`, clear value, keep value, reset default, and remove relation are
      different requests.
    - Model partial update intent instead of merging DTOs blindly.
17. Keep mappers mechanical.
    - `toResponse`, `fromRequest`, and `mapper` code should not calculate price, filter by
      permission, change state, or decide defaults.
    - If mapping changes business meaning, move the decision to the rule owner.
18. Own defaults in one place.
    - `role = USER`, `status = ACTIVE`, `visible = true`, and `quantity = 1` are policy.
    - DB, ORM, API, frontend, fixture, and migration defaults must agree or the creation path changes
      the object identity.
19. Check error messages against actual checks.
    - User-facing error text is operational policy documentation.
    - Verify "coupon already used" does not actually mean "expired only", and that hidden checks are
      visible enough for support and operators.
20. Do not swallow business failures.
    - Payment, notification, inventory, point, and settlement failures cannot be logged away while
      the order looks successful.
    - Use `failure-integrity-review` when failure can leave false money, state, or entitlement.
21. Align transaction boundary with the business action.
    - Order creation, payment reflection, inventory decrement, coupon use, and point grant may be one
      business success unit or several explicit units.
    - State what rolls back, what compensates, and what reconciles after partial failure.
22. Review event timing.
    - Publishing `OrderPaidEvent` before durable save, before commit, or without an outbox can make
      subscribers act on facts that roll back.
    - Name whether events are domain facts, integration outbox messages, or best-effort signals.
23. Assume duplicate requests.
    - `refund`, `pay`, `useCoupon`, `grantPoint`, notification send, and settlement apply must
      tolerate double-clicks, retries, webhook repeats, and manual replay.
    - Require idempotency keys, unique records, transition guards, or dedupe tables where needed.
24. Treat webhooks as external APIs.
    - Verify signature, event identity, duplicate handling, ordering, stale event rejection, and
      current-state guard before mutating internal state.
    - Do not trust provider payloads as the only truth for internal business facts.
25. Check out-of-order events.
    - Payment success, order-created, shipment-started, shipment-completed, subscription-canceled,
      and renewal events can arrive out of order.
    - State transitions must inspect current state and reject illegal or stale moves.
26. Treat cache invalidation as policy.
    - Permissions, price, inventory, subscription state, and usable coupons cached under the wrong key
      can apply another viewer's rule.
    - Use `cache-integrity-review` when cache freshness or dimensions control the business decision.
27. Compare search index and database truth.
    - Search may still show hidden, adult-only, stopped, out-of-stock, region-limited, or deleted
      products.
    - Recheck critical visibility and eligibility on detail and action routes.
28. Review reports and settlement harder than services.
    - Read-only report SQL may calculate revenue, refunds, fees, tax, partner settlement, and payout.
    - Treat reporting formulas as business rules with tests and owners, not harmless queries.
29. Ask which rules are duplicated in text.
    - Docs, help text, error strings, support macros, admin labels, and API examples may encode
      rules that drift from code.
    - Update or flag public-facing rule text when enforcement changes.
30. Finish with the bypass question.
    - Ask: "Is there another entrance that can perform this action without this rule?"
    - If yes, route the entrance through the rule owner, add a guard at the durable boundary, or
      report the remaining bypass explicitly.

<!-- mustflow-section: postconditions -->
## Postconditions

- The business rule has a named source of truth or the missing owner is reported.
- User, admin, mobile, batch, webhook, support, migration, import/export, search, and direct-data
  paths are checked for bypass risk according to scope.
- List/detail, create/update, DB/search, cache/source, webhook/manual replay, and old/new migration
  consistency risks are fixed or named.
- State transitions, transaction boundaries, event timing, idempotency, defaults, nullable meanings,
  and error messages are aligned with the rule or documented as remaining risk.
- Tests or behavior evidence cover the rule owner and the highest-risk bypass path.

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

Prefer checks that prove the rule owner and at least one bypass-prone path such as detail lookup,
admin action, batch, webhook, search result, report query, or update DTO.

<!-- mustflow-section: failure-handling -->
## Failure Handling

- If the rule owner cannot be found, report the missing source of truth instead of adding another
  scattered condition.
- If an entrypoint cannot be inspected, report that the bypass status is unknown.
- If fixing leakage would change public behavior, use `repro-first-debug`,
  `behavior-preserving-refactor`, or the narrower domain skill before continuing.
- If a command fails, use `failure-triage` before further edits.

<!-- mustflow-section: output-format -->
## Output Format

- Business rule leakage reviewed
- Business rule and source of truth
- Entrypoints inspected
- Enforcement locations and bypass risks
- List/detail, create/update, admin/user, batch/API, webhook, cache, search, report, migration, or
  support-tool consistency notes
- Fixes made or recommendation
- Tests or behavior evidence
- Command intents run
- Skipped checks and reasons
- Remaining business-rule leakage risk
