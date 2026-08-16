---
mustflow_doc: skill.error-message-integrity-review
locale: en
canonical: true
revision: 5
lifecycle: mustflow-owned
authority: procedure
name: error-message-integrity-review
description: Apply this skill when code is created, changed, reviewed, or reported and error messages, error codes, validation errors, parse errors, API or CLI error envelopes, public user-facing errors, logs, structured diagnostics, exception wrapping, provider errors, retryability, side-effect state, next-action candidates, recovery identifiers, idempotency errors, queue or batch failures, partial failures, permission errors, conflict errors, impossible-state errors, security redaction, support-facing IDs, monitoring fields, or troubleshooting text need review for actionability, recoverability, observability, stable contracts, and safe disclosure.
metadata:
  mustflow_schema: "1"
  mustflow_kind: procedure
  pack_id: mustflow.core
  skill_id: mustflow.core.error-message-integrity-review
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

# Error Message Integrity Review

<!-- mustflow-section: purpose -->
## Purpose

Review error messages as recovery and evidence contracts, not as friendly prose.

The review question is not "does this sound nice?" It is "when this fails, can the user, caller,
operator, support person, monitoring rule, or future developer know what action failed, why it was
rejected, what was expected, what actually happened, whether retry is safe, where to look, and what
must not be leaked?"

<!-- mustflow-section: use-when -->
## Use When

- Code review, implementation, or refactor work touches error text, error codes, exception classes,
  validation messages, parse errors, API error envelopes, CLI errors, queue or batch job errors,
  webhook failures, provider errors, retry behavior, idempotency errors, conflict errors, logs,
  structured diagnostics, support codes, user-facing messages, docs examples, or tests that assert
  failure output.
- A change adds or modifies `throw`, `catch`, error wrapping, logging, redaction, public error
  mapping, provider response mapping, status codes, retry flags, error-code enums, validation
  aggregation, or troubleshooting guidance.
- A review needs to decide whether to use `failure-integrity-review`, `security-privacy-review`,
  `api-contract-change`, `cli-output-contract-review`, `result-option`, `test-design-guard`,
  `business-rule-leakage-review`, or `backend-reliability-change`.

<!-- mustflow-section: do-not-use-when -->
## Do Not Use When

- The main issue is whether failure leaves false success or partial state; use
  `failure-integrity-review` first.
- The main issue is API schema, status, or response compatibility; use `api-contract-change` first
  and this skill for the error content contract.
- The main issue is CLI stdout/stderr, exit code, JSON, JSONL, help text, or automation output; use
  `cli-output-contract-review` first and this skill for error content quality.
- The main issue is secret, personal data, or disclosure risk with no changed error surface; use
  `security-privacy-review`.
- The change only adjusts private debug wording that is not emitted, logged, tested, documented, or
  consumed by humans or automation.

<!-- mustflow-section: required-inputs -->
## Required Inputs

- User goal, current diff or target files, and every changed error surface.
- Error audience ledger: end user, API caller, CLI user, support agent, operator, queue worker,
  dashboard, monitoring rule, developer log, provider dashboard, or test fixture.
- Error contract ledger: stable code, message, HTTP status or exit code, machine fields, retryable
  flag, cause, support ID, request ID, correlation ID, provider code, and documentation link.
- Disclosure ledger: public versus internal message, safe identifiers, sensitive values, masking,
  raw provider payloads, stack traces, SQL, environment values, tokens, personal data, and secrets.
- Recovery ledger: expected value, actual value, failed operation, reason, next action, retry policy,
  idempotency state, partial failure state, and escalation path.
- Relevant command-intent contract entries for tests, lint, build, docs, release, and mustflow checks.

<!-- mustflow-section: preconditions -->
## Preconditions

- The task matches the Use When conditions and does not match the Do Not Use When exclusions.
- Higher-priority instructions and `.mustflow/config/commands.toml` have been checked for the
  current scope.
- Required inputs are available, or missing audience, contract, disclosure, or recovery evidence can
  be reported without guessing.
- If the review finds concrete false-success, security, API, CLI, result-type, backend reliability,
  or business-rule risk, use the narrower skill before editing that part.

<!-- mustflow-section: allowed-edits -->
## Allowed Edits

- Add or tighten stable error codes, expected and actual fields, failed-operation context, reason,
  safe identifiers, retryability, idempotency metadata, provider metadata, parse position, range
  details, conflict details, partial-failure summaries, structured log fields, public/internal error
  mapping, and focused tests.
- Preserve causes while redacting public responses and unsafe logs.
- Split public user messages from internal diagnostic messages when one string cannot safely serve
  both audiences.
- Update docs, fixtures, API examples, CLI tests, support text, or dashboards that depend on the
  same error contract.
- Do not add raw secrets, personal data, full provider payloads, stack traces, SQL, environment
  values, internal hostnames, hidden reasoning, or exploit hints to public or broadly retained
  messages.

<!-- mustflow-section: procedure -->
## Procedure

1. Reject empty failure labels.
   - Messages like `"failed"`, `"invalid value"`, `"bad request"`, `"upload failed"`, and
     `"something went wrong"` are usually evidence-free.
   - Name the failed operation, the reason, and the condition that would have succeeded.
2. Require `expected` and `actual` when a value is rejected.
   - Prefer "expected status to be one of [draft, published], got archived" over "invalid status".
   - Use machine fields as well as readable text when the output has structured form.
3. Put the failed action in the message.
   - "user not found" is weaker than "cannot create invoice because user 123 was not found".
   - Include operation context such as invoice creation, webhook parsing, migration application, or
     provider synchronization.
4. Explain cause, not only result.
   - "upload rejected because file size 28MB exceeds limit 20MB" is actionable.
   - "upload failed" repeats what the caller already knows.
5. Add human-readable work context.
   - Prefer context such as "while syncing Stripe customer", "while parsing webhook payload", or
     "while applying migration 202406_add_plan_id".
   - Function names alone rarely explain the failed business or operational action.
6. Split public and internal messages.
   - Public messages should be safe and user-actionable.
   - Internal logs should keep diagnostic fields such as provider, providerCode, status, requestId,
     operation, attempt, duration, and cause.
7. Redact sensitive values.
   - Treat email, phone, token, session, card, address, personal identifiers, request bodies, SQL,
     secrets, and credentials as unsafe unless a narrow redaction policy says otherwise.
   - Mask, hash, truncate, or omit values according to the local privacy rule.
8. Keep safe identifiers.
   - Removing sensitive data does not mean removing all evidence.
   - Preserve safe identifiers such as userId, orderId, requestId, jobId, tenantId, provider,
     providerRequestId, fileId, and operation name when useful.
9. Expose retryability deliberately.
   - A timeout can be retryable; validation failure usually is not.
   - Queue, batch, webhook, payment, provider, and external API errors should expose retryable,
     attempt, maxAttempts, nextRunAt, or deadLetter state when relevant.
10. Stop abusing "try again later".
    - If the user can fix input, say what to fix.
    - If the user cannot fix it, provide a safe request or support ID and make sure internal logs can
      find the failure.
11. Separate stable error codes from messages.
    - Messages may change; codes should remain stable for search, docs, support macros, monitoring,
      API clients, dashboards, and tests.
    - Prefer domain codes such as `PAYMENT_CARD_DECLINED`, `USER_EMAIL_ALREADY_EXISTS`, and
      `WEBHOOK_SIGNATURE_INVALID` over only `BAD_REQUEST` or `INTERNAL_ERROR`.
12. Avoid overbroad error code buckets.
    - HTTP status and CLI exit code categories are not enough.
    - A domain error code should name the actual failure class.
13. Choose validation aggregation intentionally.
    - Form validation can report multiple field errors at once.
    - Authentication, authorization, account discovery, and security-sensitive validation may need
      intentionally vague or single-error output to avoid giving attackers hints.
14. Put location in parse errors.
    - JSON, CSV, SQL, regex, config, markdown, and template parse errors should include line,
      column, byte offset, field path, or nearby token when safe.
    - "parse failed" is not enough for recovery.
15. Put bounds in range errors.
    - Include current value and allowed range: "max 100 items allowed, got 143".
    - For durations, sizes, counts, quotas, price limits, and attempts, include units.
16. Include time basis in time errors.
    - "expired" is too thin.
    - Include relevant timestamps, timezone or UTC basis, server time, and clock-skew context when
      safe and useful.
17. Preserve provider diagnostics in structured form.
    - Wrap external errors into local domain errors without losing provider, providerCode, status,
      requestId, retryability, and sanitized response category.
    - Do not dump raw provider payloads into public responses or broad logs.
18. Preserve original causes.
    - `catch (e) { throw new Error("failed") }` destroys evidence.
    - Link causes, suppressed errors, or structured cause fields so stack, category, and provider
      context survive safely.
19. Control template string composition.
    - Ad hoc `"Invalid " + field + " for " + thing` messages often become unsearchable, broken, or
      inconsistent.
    - Prefer named error constructors, controlled templates, and structured fields.
20. Structure logs for machines.
    - Keep human text, but put `error_code`, `user_id`, `order_id`, `tenant_id`, `provider`,
      `retryable`, `attempt`, `duration_ms`, and `request_id` in fields.
    - Do not make operations parse prose with regular expressions.
21. Keep user messages free of internal jargon.
    - Users usually do not need to see internal system names, buckets, regions, class names, or
      provider implementation details.
    - Internal logs may need those details after redaction.
22. Make permission errors intentionally safe.
    - Sometimes "not found" is safer than "forbidden" because it avoids confirming resource
      existence.
    - Decide disclosure policy for authentication, authorization, ownership, tenant, and account
      discovery errors.
23. Ban vague impossible-state text.
    - "this should never happen" does not help.
    - Name the broken invariant: "expected exactly one active subscription for user 123, found 2".
24. Name concurrency conflict facts.
    - "conflict" is weak.
    - Include version, idempotency key, lock owner, reservation id, stock unit, or expected/current
      state when safe: "version conflict: expected document version 17, got 19".
25. Include idempotency history.
    - "duplicate request" is not enough in payment and order flows.
    - Include key, prior operation, prior resource, and prior status when safe.
26. Put attempts in job and queue errors.
    - "job failed on attempt 3 of 5; next retry at ..." tells operators whether to wait or act.
    - Include dead-letter state when the job will not retry.
27. Represent partial failure honestly.
    - For bulk work, say how many succeeded and failed.
    - Include failed item identifiers when safe, or a retrievable failure report id.
28. Test error contracts.
    - Avoid over-snapshotting prose, but test stable error codes, expected and actual fields,
      retryable, redaction, parse location, provider metadata, and support IDs where consumers rely
      on them.
29. Ask the 30-second action question.
    - What can the receiver do in the next 30 seconds?
    - Fix input, request permission, retry, wait, inspect request ID, search provider dashboard,
      send support code, or stop and escalate should be clear.
30. Check architecture ownership.
    - Error quality depends on error type, code taxonomy, public/internal mapping, logging fields,
      redaction, retry policy, docs, monitoring, and tests.
    - If every call site invents messages, add or recommend a shared error boundary instead of
      polishing one string.
31. Use a stable problem-details envelope for external API errors.
    - Return RFC 9457 `application/problem+json` (which supersedes RFC 7807) with a stable error
      code, HTTP status, generalized human detail, and a server-generated request id when the API
      has a public error envelope.
    - Never serialize the exception object. Class names, file paths, SQL, internal hostnames,
      library versions, and stack traces stay in the restricted internal store, not in the response.
32. Prevent error responses from becoming existence oracles.
    - Attackers compare not only 404 versus 403 versus 401 but response body length, headers, and
      processing time to learn whether users, orders, invite codes, or another tenant's objects exist.
    - Merge not-found, access-denied, and other-tenant ownership into the same public error when the
      client does not need to distinguish; record `OBJECT_NOT_FOUND`, `TENANT_MISMATCH`, or
      `POLICY_DENIED` only in internal logs.
33. Design logs as an allowlist, not a denylist.
    - Logging everything and then masking tokens with regular expressions fails; define a permitted
      event schema and pass only those fields to the logger.
    - Do not log `Authorization`, cookies, session ids, access tokens, passwords, encryption keys,
      database connection strings, payment data, personal data, or upload bodies by default. Use
      hashes or internal reference ids when an identifier is needed for investigation.
34. Treat logged values as attacker input.
    - Headers, URLs, usernames, and error messages can carry newlines or delimiters that forge log
      lines or disrupt analysis systems.
    - Use structured JSON logs, normalize newlines and control characters, cap field lengths, and
      never pass user input into a log template or string-substitution sink.
35. Keep debug modes off by default and not request-switchable.
    - `?debug=true`, `X-Debug`, debug cookies, and admin-IP conditions that return detailed errors
      must be removed from production.
    - When debugging is needed, activate it from a restricted control plane, bound its lifetime,
      audit-log the activation, and send output only to the internal log store. Apply the same rule
      to GraphQL introspection, Swagger test consoles, framework developer consoles, and verbose
      error pages.
36. Extend the same boundary to tracing, APM, and metrics.
    - Response masking is undone when OpenTelemetry exporters, error-tracking SDKs, proxy access
      logs, or database traces collect request bodies, SQL parameters, external API responses, or
      auth headers.
    - Apply the identical field policy to those surfaces, validate or replace client-supplied
      request ids and trace baggage, and keep high-cardinality unique values out of metric labels.
37. Test the full request path for leakage.
    - The application handler is only one layer; gateways, CDNs, reverse proxies, framework parsers,
      auth middleware, and upstream services can each return different error shapes.
    - Send malformed JSON, unsupported content types, oversized requests, expired tokens, wrong HTTP
      methods, upstream timeouts, and database failures through the real path, and assert that
      responses and headers contain no stack traces, internal paths, SQL, hostnames, versions, or
      debug information.
38. Treat URLs, headers, and exception objects as separate leak paths.
    - Reset tokens or invite codes in query strings survive application-log masking in CDN, load
      balancer, web server, and APM logs. Mask `Authorization`, `Cookie`, `Set-Cookie`, and
      `X-API-Key` by default, and never serialize the full request object or SQL bindings in
      exception handlers.
    - Do not log raw external API error responses; the upstream may include personal data or
      credentials.
39. Use keyed correlation identifiers in logs, not recoverable hashes.
    - Email, phone, and session tokens in logs force rewriting every index and archive when a
      deletion request arrives. Plain `SHA-256` of a predictable user id is not anonymization.
    - Use a purpose-specific keyed HMAC or a separate short-lived correlation id, and keep the key
      and mapping table separate from the log system.
40. Treat backups as more locked than production data.
    - Backups contain pre-deletion records, old permissions, past credentials, and temporary tables.
      Store them under a separate account and vault with a separate KMS key, a restore-only role,
      access audit, and immutable retention.
    - Set retention per data class before locking, because an eternal WORM lock can block deletion
      obligations.
41. Treat cache, queue, and DLQ copies as data at risk.
    - Redis can persist to RDB or AOF and propagate to replicas and backups, so cached sessions,
      OTPs, and personal data become durable data. Namespace keys per workload, restrict ACL users
      by key prefix, and keep authentication data on a separate instance.
    - Event payloads should carry subject id, kind, and version rather than the full user object.
      Failed messages linger longer in the DLQ where operators read them, and reprocessing can push
      deleted data back; consumers must check deletion tombstones before applying old messages, and
      queue and DLQ retention is capped by the shorter of processing need and privacy policy.
42. Keep the log store outside operational accounts.
    - If servers and the log store share a cloud account and admin rights, an operational account
      compromise deletes the evidence too. Put logs in a log-only account or security tenant where
      operators may search but cannot delete, change retention, or stop collection, and forward
      cloud control-plane and IdP logs directly without passing through production servers.
43. Treat local logs as temporary buffers and absence as an alert.
    - A server admin can edit local logs, journald, Event Log, or stop agents; forward important
      records immediately and keep only a short buffer for network outages, retaining unmodified
      raw originals alongside parsed data.
    - Treat a missing heartbeat, sequence gap, volume drop, time skew, parser failure, queue delay,
      or storage-write failure as a security event, and alert through a channel separate from the
      operational path when agents, filters, SIEM rules, or retention policies change.
44. Separate audited roles from audit-log administration.
    - The operator whose actions are recorded must not administer the recording system. Split log
      configuration, collection, detection, query, export, retention, and deletion rights across
      different roles, give analysts read-only access, and require two independent approvals to
      delete logs or shrink retention.
45. Prove log continuity with chained signed manifests.
    - Encryption does not reveal deleted middle records. Chain each batch to the previous hash with
      a monotonic sequence, collection time, and source count, sign manifests, and pin periodic
      roots in a separate account or external store so an attacker who rewrites both the log and
      the chain is detected.
46. Record at policy enforcement points and use independent sensors.
    - Application success and failure logs miss bypass APIs, internal tools, direct database
      access, and console operations. Record at the IdP, API gateway, cloud control plane,
      Kubernetes audit, database audit, secret access, DNS, egress proxy, CI/CD, and backup console
      with immutable user ids, delegated subjects, targets, allow or deny results, policy versions,
      before and after values, and request ids.
    - Collect host process logs, network flows, DNS queries, IdP authentication, cloud API calls,
      and storage access from separate administrative domains as independent witnesses, and plant
      decoy accounts, secrets, and files that alert on any use.
47. Classify error codes by recovery action, not exception class.
    - `NullPointerException`, `DatabaseError`, and `InternalError` do not tell a caller or agent
      what to do next. Use codes that bind cause to action such as `AUTH_EXPIRED`,
      `PERMISSION_DENIED`, `RATE_LIMITED`, `RESOURCE_CONFLICT`, `INPUT_INVALID`,
      `DEPENDENCY_UNAVAILABLE`, and `JOB_ALREADY_RUNNING`. Keep internal exceptions in server logs
      and return the stable code on the external contract.
48. Make retryability explicit instead of guessable.
    - Do not make agents infer retry from prose. Return a machine retry policy: `retryable`,
      `retryAfterMs`, `maxRecommendedAttempts`, `backoff`, and `retryScope` such as `same_request`,
      `new_authentication`, or `switch_to_lookup`. Distinguish resending the same request from
      re-authenticating or switching to a status query.
49. Report the side-effect state of a failed request.
    - The hardest case for an agent is not that a request failed but whether any change was applied.
      For payment, file move, deploy, and account creation, return `notApplied`, `fullyApplied`,
      `partiallyApplied`, or `commitUnknown`, plus the applied resource ids and failed stage. On
      `commitUnknown`, direct the next action to a lookup command or idempotency-key reuse, never to
      blind resend that can duplicate payment or creation.
50. Provide structured next-action candidates instead of prose.
    - `try again later` cannot drive agent control. Return structured candidates such as
      `nextActions` with `action`, `priority`, `requiresConfirmation`, `afterMs`, and
      `reuseIdempotencyKey` so the agent can select by priority and condition, and only risky
      actions such as delete or payment ask for user confirmation.
51. Include a cause chain and the reasoning behind the top error.
    - One top-level error forces agents to search logs for the real cause. Provide a `causes`
      array ordered from the failed stage, dependency service, observed state, and related resource
      down to the root, each with a stable code and short description, stripped of stack traces,
      tokens, raw SQL, and internal addresses.
52. Return the state snapshot at failure time.
    - Agents need current state, not only the cause, to choose the next action. Include
      `resourceId`, `resourceVersion`, `currentState`, `quotaRemaining`, and `failedStage` when
      relevant, so an already-rolling-back deploy is not rolled back again and a stale version does
      not overwrite a changed resource.
53. Provide recovery identifiers for resume and duplicate prevention.
    - Long-running work must not restart from scratch after a mid-run failure. Include
      `operationId`, `jobId`, `idempotencyKey`, `checkpoint`, and `resumeToken` in error responses
      so the agent can decide between `job status`, `job resume`, and `job retry`. An error without
      recovery identifiers effectively disables automatic recovery.

<!-- mustflow-section: postconditions -->
## Postconditions

- The failed operation, reason, expected value, actual value, and next safe action are explicit when
  they can be safely disclosed.
- Public and internal error surfaces are separated where disclosure or debugging needs differ.
- Stable error codes and machine fields exist for consumers that need search, monitoring, support,
  API handling, CLI automation, dashboards, or documentation.
- Sensitive values are redacted while safe identifiers and correlation fields remain available.
- External error envelopes, log fields, debug switches, tracing surfaces, and the full request path
  are checked so disclosure boundaries survive beyond the handler.
- Causes, retryability, idempotency, provider details, parse location, range bounds, time basis,
  conflict facts, attempts, and partial failure state are preserved where relevant.
- Side-effect state, structured next-action candidates, failure-time state snapshots, and recovery
  identifiers let an agent or caller choose the next safe action without guessing.

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

Prefer tests that assert stable codes, structured fields, redaction, retryability, cause preservation,
and contract shape instead of full prose snapshots unless the repository already treats prose as a
public contract.

<!-- mustflow-section: failure-handling -->
## Failure Handling

- If the audience, disclosure policy, retry policy, or code taxonomy is unknown, report the missing
  contract rather than inventing one silently.
- If improving the message would expose sensitive data, choose safe identifiers and internal
  diagnostics instead.
- If a command fails, use `failure-triage` before further edits.

<!-- mustflow-section: output-format -->
## Output Format

- Error message integrity reviewed
- Error surfaces and audiences
- Error code and message contract
- Expected, actual, operation, cause, retryability, idempotency, provider, parse, range, time,
  conflict, attempt, or partial-failure findings
- Public/internal split and redaction notes
- Fixes made or recommendation
- Tests or behavior evidence
- Command intents run
- Skipped checks and reasons
- Remaining error-message integrity risk
