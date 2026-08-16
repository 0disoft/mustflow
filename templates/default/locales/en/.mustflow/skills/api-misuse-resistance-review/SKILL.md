---
mustflow_doc: skill.api-misuse-resistance-review
locale: en
canonical: true
revision: 2
lifecycle: mustflow-owned
authority: procedure
name: api-misuse-resistance-review
description: Apply this skill when code is created, changed, reviewed, or reported and an API, SDK, function boundary, service method, endpoint, command method, DTO, request shape, response shape, pagination contract, summary-versus-detail view, field selection, expand limits, indexable filters, change-sync or ETag behavior, response budgets, idempotency behavior, async job boundary, versioning policy, deprecation path, rate-limit rule, retry rule, observability surface, or caller-facing contract needs review for caller ergonomics, misuse resistance, hidden state machines, ambiguous parameters, internal model leakage, and operation-centered design.
metadata:
  mustflow_schema: "1"
  mustflow_kind: procedure
  pack_id: mustflow.core
  skill_id: mustflow.core.api-misuse-resistance-review
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

# API Misuse Resistance Review

<!-- mustflow-section: purpose -->
## Purpose

Review APIs from the caller's side, not from the implementer's convenience.

The review question is not "does this endpoint or method work?" It is "can a tired caller use this
API without memorizing hidden order, internal tables, boolean meanings, null folklore, retry traps,
or Slack-thread failure semantics?"

<!-- mustflow-section: use-when -->
## Use When

- Code review, implementation, or refactor work touches public or internal APIs, service methods,
  SDKs, generated clients, controller methods, RPC procedures, command methods, function signatures,
  request schemas, response DTOs, error envelopes, pagination, filtering, sorting, idempotency,
  retries, async jobs, bulk operations, cache headers, versioning, deprecation, rate limits,
  observability fields, or caller-facing documentation.
- An API appears technically compatible but may invite caller mistakes through implementation-leaking
  names, ordering requirements, boolean flags, broad options objects, nullable semantics, raw table
  fields, status mutation, PATCH-as-command behavior, time or money primitives, closed enum
  assumptions, overlarge responses, overfragmented calls, internal/external API mixing, or untested
  failure cases.
- A review needs to decide whether to apply `api-contract-change`, `type-state-modeling-review`,
  `business-rule-leakage-review`, `error-message-integrity-review`, `backend-reliability-change`,
  `cache-integrity-review`, `security-flow-review`, `result-option`, or `state-machine-pattern`.

<!-- mustflow-section: do-not-use-when -->
## Do Not Use When

- The main task is API source-of-truth synchronization, status/schema compatibility, generated
  client drift, OpenAPI or protobuf compatibility, or endpoint migration; use `api-contract-change`
  first and this skill only for caller misuse traps.
- The main task is making impossible domain states unrepresentable in types; use
  `type-state-modeling-review` first.
- The main task is failure content quality; use `error-message-integrity-review`.
- The main task is false success, partial state, retry exhaustion, or failure integrity; use
  `failure-integrity-review` or `backend-reliability-change`.
- The API is private implementation glue with no stable caller, no reusable boundary, no docs, and
  no expected independent evolution.

<!-- mustflow-section: required-inputs -->
## Required Inputs

- User goal, current diff or target files, and every changed caller-facing boundary.
- Caller ledger: human caller, frontend, mobile app, CLI, worker, SDK user, partner integration,
  internal service, batch job, webhook sender, support tool, or generated client.
- Operation ledger: what the caller is trying to accomplish, the minimal operation name, required
  inputs, optional inputs, side effects, ordering constraints, sync or async completion, and retry
  or cancellation expectations.
- Shape ledger: names, parameters, option objects, DTO fields, status fields, null and empty values,
  error shape, pagination fields, sorting and filtering fields, money and time units, enum values,
  bulk result shape, cache headers, versioning, deprecation, rate-limit hints, and observability
  identifiers.
- Existing contract source, local API style, SDK conventions, generated client behavior, docs,
  examples, tests, and configured command intents.

<!-- mustflow-section: preconditions -->
## Preconditions

- The task matches the Use When conditions and does not match the Do Not Use When exclusions.
- Higher-priority instructions and `.mustflow/config/commands.toml` have been checked for the
  current scope.
- Required inputs are available, or missing caller, operation, shape, or compatibility evidence can
  be reported without guessing.
- If the review finds concrete schema compatibility, security, state-machine, result-type, cache,
  failure-integrity, or backend reliability risk, use the narrower skill before editing that part.

<!-- mustflow-section: allowed-edits -->
## Allowed Edits

- Rename APIs toward caller intent, split hidden modes into separate operations, replace ambiguous
  booleans with named options or distinct methods, narrow option bags, clarify null and patch
  semantics, separate internal and public DTOs, add stable error codes, add idempotency or retry
  metadata, expose async job resources, represent partial failures, tighten pagination, add cache
  and rate-limit hints, and add focused contract tests.
- Update docs, examples, SDK wrappers, generated client fixtures, API schemas, mocks, changelog
  notes, deprecation notes, and tests that describe the same caller contract.
- Keep changes scoped to the boundary under review and its synchronized surfaces.
- Do not silently break existing public callers, widen responses with internal data, turn every
  helper into a public API, or hide a breaking design change behind naming polish.

<!-- mustflow-section: procedure -->
## Procedure

1. Read the call site aloud.
   - If the call reads like a wiring diagram, the API is leaking implementation.
   - `createUserWithValidationAndEmailSend` tells the caller to remember internal steps.
   - Prefer operation intent such as `registerUser`, `inviteUser`, `payOrder`, or `startReport`.
2. Separate purpose from mechanism in names.
   - Names should say what the caller wants, not DB, Redis, Kafka, email, validation, batch, cache,
     queue, or storage details.
   - Keep implementation details in internals, logs, or diagnostics unless the caller genuinely
     controls that mechanism.
3. Expose hidden state machines.
   - APIs that require `init`, `setConfig`, `connect`, `start`, `flush`, and `close` in one exact
     sequence are unsafe unless the type, builder, lifecycle object, or command model enforces the
     sequence.
   - Ask what happens if a caller skips, repeats, or reorders each step.
4. Hunt boolean parameters.
   - `getUsers(true)`, `sendEmail(false)`, and `createOrder(order, true, false)` are call-site
     riddles.
   - Replace with named options, separate operations, or domain variants when the boolean changes
     behavior.
5. Audit option objects as mode bags.
   - `skipValidation`, `sendWelcomeEmail`, `createdByAdmin`, `importMode`, `dryRun`, and
     `temporaryPassword` in one object often means several workflows share one unsafe door.
   - Split by use case when options describe different business operations instead of incidental
     configuration.
6. Give absence one meaning per boundary.
   - Count `null`, `undefined`, empty string, empty array, omitted field, and default value.
   - If they mean delete, keep, clear, unknown, not loaded, or not applicable differently, model that
     with explicit types, commands, or patch operations.
7. Stop leaking storage rows as response DTOs.
   - Fields like `deleted_at`, `status_code`, `type_flag`, raw foreign keys, provider IDs, and
     internal timestamps can freeze database design into the API contract.
   - Public DTOs should represent caller concepts, not table plumbing.
8. Treat error shape as part of usability.
   - A string-only error blocks client branching, retry decisions, localization, support, and
     monitoring.
   - Ensure stable code, readable message, cause category, retryability, and safe request or support
     ID exist where callers need them.
9. Model failure as carefully as success.
   - Include permission denied, duplicate request, already processed, missing resource, conflict,
     provider timeout, cancelled resource, partial success, and validation failure where relevant.
   - If the response model cannot describe these states, the API will lie later.
10. Require idempotency for networked creation with side effects.
    - Orders, payments, invites, subscriptions, refunds, and external writes need duplicate-request
      safety because clients cannot know whether a timeout happened before or after commit.
    - Button disabling is not an idempotency strategy.
11. Make pagination stable under moving data.
    - Offset pagination is unsafe for feeds, orders, notifications, logs, and any list that changes
      while the user pages through it.
    - Cursor pagination still needs an immutable or stable sort key, tie-breaker, page limit, and
      empty-page semantics.
12. Define sorting and filtering as contracts.
    - A list without default order, tie-breaker, max size, allowed filter set, unknown-filter
      behavior, null ordering, case sensitivity, timezone, and locale behavior is a random API.
13. Show authorization shape in the API.
    - `updateUser(userId, payload)` hides whether the caller edits self, a team member, or any user
      as an admin.
    - Prefer operation or route shapes that make permission mode visible, such as `updateMyProfile`
      versus `adminUpdateUser`.
14. Review state changes as commands.
    - `updateOrderStatus(orderId, status)` lets callers request illegal transitions.
    - Prefer command operations such as `payOrder`, `cancelOrder`, `shipOrder`, and `refundOrder`
      where guards and effects have a home.
15. Keep PATCH from becoming a command bus.
    - Partial field updates should not secretly perform account closure, email verification,
      payment cancellation, invitation acceptance, permission changes, or lifecycle transitions.
    - Important behavior deserves an operation name.
16. Specify time values fully.
    - Time values need UTC basis or explicit timezone, ISO format, precision, server clock behavior,
      expiration semantics, and display responsibility.
    - Local strings without timezone are delayed bugs.
17. Keep money out of floating-point shapes.
    - Use minor-unit integers or decimal-safe representations plus currency.
    - Include rounding, tax, fee, discount, and precision rules where the API participates in money
      movement.
18. Treat external enums as open.
    - Public or provider-facing clients must survive unknown future values.
    - Internal closed enums still need a boundary decision for unknown, deprecated, or provider-only
      statuses.
19. Draw the sync or async boundary.
    - Image processing, reports, email delivery, bulk imports, external settlement, and long-running
      work need job ID, state query, completion signal, cancellation semantics, timeout behavior,
      and failure reason.
    - `200 OK` must not imply finished when the work only started.
20. Represent partial failure honestly.
    - Bulk APIs need item-level results and aggregate summary.
    - "All failed" can duplicate successful items on retry; "all succeeded" loses failed items.
21. Ask whether the response can be cached.
    - GET APIs should define freshness, cache key, user or tenant variance, ETag or Last-Modified,
      cache-control, and invalidation boundaries when the response is expensive or frequently read.
22. Balance response size and call count by caller task.
    - Overfriendly list APIs that include every relation become slow.
    - Overfragmented APIs that force the frontend to assemble one screen from many calls move backend
      workflow into the client.
    - Shape endpoints around caller tasks, with explicit includes or field selection when useful.
23. Separate internal and external APIs.
    - Internal APIs can change faster and carry richer operational context.
    - External APIs need slower evolution, compatibility, documentation, and deprecation policy.
    - One shared shape usually damages both.
24. Treat version labels as policy, not decoration.
    - `/v1` does not protect callers if field meanings, enum behavior, pagination, or errors change
      under the same version.
    - Define what counts as breaking, how long old versions live, how usage is monitored, and how
      migration is communicated.
25. Make deprecation measurable.
    - A deprecated field or endpoint without usage tracking cannot be removed safely.
    - Capture client, field, endpoint, version, and volume evidence where privacy policy allows.
26. Define rate limits and retry hints.
    - Limits without `Retry-After`, reset time, retryable classification, and client guidance punish
      well-behaved callers.
    - No limits lets buggy clients harm everyone else.
27. Make the API observable.
    - Request ID, caller ID, operation, latency, status, error code, downstream result, retry count,
      cache hit, and job ID should be traceable where relevant.
    - If operations cannot be traced, the API cannot be operated.
28. Test through the caller contract.
    - Success examples alone do not prove an API design.
    - Cover duplicate request, missing resource, permission denied, unknown enum, invalid cursor,
      large page size, timeout, retry, partial success, already processed, and deprecation behavior
      where relevant.
29. Check SDK ergonomics.
    - If a typed SDK method name, input type, return type, or error handling becomes awkward, the
      original HTTP, RPC, or service shape may be wrong.
    - Generated types should reduce mistakes, not require callers to memorize transport details.
30. Finish with the first-time caller question.
    - What will a new caller misunderstand?
    - If the likely mistake costs money, permissions, data, duplicate work, broken pagination, stale
      cache, or unretryable failure, fix the API shape instead of adding prose warnings.
31. Make the default response a summary view, not full detail.
    - An agent checking job status does not need the input payload, logs, checkpoints, and result
      metadata. Keep the default response to identity, state, current stage, progress, last change
      time, and available next actions, and return detail only when explicitly requested via
      `view=detail` or an equivalent. Do not force admin screens and agent APIs to share one
      fat default.
32. Offer field selection as a validated schema, not string truncation.
    - Accept `fields=job_id,state,progress.percent,error.code` style selection, validate against an
      allowed field list and nesting depth, and reject unknown fields instead of silently ignoring
      them. Always include fields required to interpret the response such as `job_id`,
      `schema_version`, and `state_version` regardless of selection, and normalize field order so
      identical requests can hit caches.
33. Never auto-expand related objects.
    - One job lookup must not pull in the attempt list, full logs, input data, result files, and
      user info. Require explicit `expand=latest_attempt,error`, cap allowed expansion depth and
      counts, and keep logs and result data behind separate endpoints with their own pagination.
      Forbid recursive nested expansion.
34. Allow only indexable filters, not free-form query syntax.
    - Generic JSONPath or arbitrary SQL filters add implementation cost and security risk. Permit
      only fields that have real indexes such as `state`, `updated_after`, `created_before`,
      `owner_id`, `job_type`, and `retryable`. Let repeated complex conditions be saved server-side
      as a `filter_id`, and echo the normalized applied filter in the response so agents cannot
      misunderstand their own condition.
35. Use signed stable cursors instead of offset pagination.
    - `page=17` or `offset=1600` duplicates and drops rows as data changes. Encode the sort key,
      unique id, and query-time boundary into an opaque server-signed cursor, sort by a tie-breaker
      such as `updated_at` plus `job_id` rather than one timestamp, and expose only `next_cursor` to
      agents instead of the internal structure.
36. Provide change-sync instead of full re-list.
    - Agents should not re-fetch jobs they have already seen. Offer a `changes?after={cursor}`
      feed, attach `ETag` to individual resources and honor `If-None-Match` with `304 Not Modified`
      when nothing changed, and support batch lookup by job id array plus an event feed when
      watching many jobs. This alone cuts call volume sharply.
37. Include a response budget in the API contract.
    - Let callers set `max_items`, `max_bytes`, `max_log_lines`, `include_total`, and `verbosity`.
      When a budget is exceeded, stop at a record boundary — never mid-string — and return
      `truncated`, `next_cursor`, and `omitted_fields`. For aggregate questions such as failed-job
      counts, return the number and representative samples from an aggregate endpoint instead of
      one thousand job rows; dumping raw data and making agents summarize is the most expensive
      shape of all.

<!-- mustflow-section: postconditions -->
## Postconditions

- The API expresses caller intent rather than internal implementation sequence.
- Ordering requirements, lifecycle states, side effects, retries, idempotency, async completion,
  permission modes, cacheability, pagination, filtering, sorting, and deprecation rules are explicit.
- Summary-versus-detail views, validated field selection, bounded expansion, indexable filters,
  change-sync and ETag behavior, and response budgets resist caller and agent token waste.
- Parameter shapes, option objects, null semantics, DTO boundaries, time values, money values, enums,
  errors, bulk results, and job states resist common caller mistakes.
- Internal and external API needs are separated or intentionally aligned with compatibility evidence.
- Tests, examples, SDKs, schemas, mocks, docs, and observability fields cover the changed caller
  contract where relevant.

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

Prefer tests that exercise the API from the caller's perspective: SDK calls, generated clients,
contract fixtures, request/response examples, failure states, pagination behavior, duplicate
requests, rate limits, async job transitions, and docs examples that callers copy.

<!-- mustflow-section: failure-handling -->
## Failure Handling

- If the caller, compatibility promise, version policy, or source of truth is unknown, report the
  missing contract instead of guessing.
- If fixing misuse resistance would break current callers, classify the break and use
  `api-contract-change` before editing the public shape.
- If a command fails, use `failure-triage` before further edits.

<!-- mustflow-section: output-format -->
## Output Format

- API misuse resistance reviewed
- Caller and operation ledger
- Names, order requirements, parameters, options, absence semantics, DTO leakage, errors,
  idempotency, pagination, sorting, filtering, auth shape, state commands, PATCH semantics, time,
  money, enum, async, bulk, cache, response size, internal/external, version, deprecation, rate
  limit, observability, SDK, and test findings
- Fixes made or recommendation
- Compatibility and synchronized surface notes
- Tests or behavior evidence
- Command intents run
- Skipped checks and reasons
- Remaining API misuse risk
