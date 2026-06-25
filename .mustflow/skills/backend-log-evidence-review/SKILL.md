---
mustflow_doc: skill.backend-log-evidence-review
locale: en
canonical: true
revision: 3
lifecycle: mustflow-owned
authority: procedure
name: backend-log-evidence-review
description: Apply this skill when backend code is created, changed, reviewed, or reported and request logs, error logs, structured event names, log schema versions, trace/span/request IDs, correlation and causation IDs, outcome or reason fields, external API logs, database write logs, transaction or state-transition logs, retry or timeout logs, queue or batch logs, audit logs, auth or validation logs, cache or lock logs, release/config/feature-flag logs, log pipeline canaries, collector accepted/sent/stored counts, timestamp versus observed timestamp, parser or mapping failures, log levels, duplicate logs, redaction, log-injection safety, sampling, or log searchability need review for whether an operator can reconstruct why a backend request, job, or data change reached its final state and whether the evidence actually survived the logging pipeline.
metadata:
  mustflow_schema: "1"
  mustflow_kind: procedure
  pack_id: mustflow.core
  skill_id: mustflow.core.backend-log-evidence-review
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

# Backend Log Evidence Review

<!-- mustflow-section: purpose -->
## Purpose

Review backend logs as evidence for reconstructing a request, job, or data mutation, not as decorative messages near the error line.

The review question is: "If this backend path fails, times out, retries, silently skips work, or changes the wrong state at 3 AM, can an operator follow the event trail from entry to exit and explain the branch, dependency result, database effect, retry history, authorization decision, cache path, release/config context, and final outcome without leaking sensitive data?"

<!-- mustflow-section: use-when -->
## Use When

- Backend handlers, services, repositories, adapters, workers, schedulers, webhooks, migrations, scripts, or batch jobs add, remove, review, or depend on logs.
- A change claims that a path is logged, traceable, easy to debug, auditable, operationally safe, or diagnosable from logs.
- Request start or finish logs, event names, schema versions, severity fields, trace or span IDs, error handling, error wrapping, external API calls, DB writes, transactions, status transitions, early returns, retries, timeouts, queues, async jobs, batches, audit events, auth, validation, cache, distributed locks, idempotency, feature flags, configuration, releases, migrations, or background promises are involved.
- Log ingestion, parsing, buffering, shipping, storage, searchability, retention, rotation, multiline parsing, canary logs, dropped-log counters, timestamp skew, or log sink visibility affects whether backend evidence can be trusted.
- A review needs to decide whether logs explain why the system reached a state, not only where the exception was thrown.

<!-- mustflow-section: do-not-use-when -->
## Do Not Use When

- The task is primarily metrics, traces, dashboards, alerts, sampling, or telemetry cardinality; use `observability-debuggability-review` first and this skill only for backend log evidence.
- The task is primarily public error wording or support-facing error contracts; use `error-message-integrity-review` first and this skill only for internal operator logs.
- The task is primarily failure propagation, rollback, queue settlement, retry policy, idempotency, transaction integrity, cache correctness, or access control. Use the matching integrity or security skill first and this skill for the logs that prove the path.
- The code path is a pure deterministic calculation with no request, job, dependency, state change, permission decision, operational boundary, or support need.
- The repository has no logging convention and the user did not ask to introduce one. Report the missing log-evidence boundary instead of sprinkling ad hoc logs.

<!-- mustflow-section: required-inputs -->
## Required Inputs

- Backend path under review: request route, command handler, worker, scheduler, webhook, migration, script, repository method, or external adapter.
- Event contract: stable `event_name`, event family, `message` as secondary prose, schema version, severity or level, event timestamp, observed timestamp when collection delay matters, service or resource identity, environment, region, service version, and release or git SHA already available.
- Correlation model: request id, trace id, span id, correlation id, causation id, job id, message id, batch run id, tenant id, user or actor id, resource id, provider request id, and safe business identifiers already available.
- Request lifecycle evidence: start log, finish log, status code or result type, outcome, reason code, duration measured from a monotonic clock when possible, main operation name, important input identifiers, and final resource identifiers.
- Error evidence: thrown errors, catches, wrappers, causes, stack preservation, error categories, public versus internal messages, and log boundary ownership.
- Decision evidence: branches, early returns, validation failures, auth decisions, feature flags, state transitions, cache paths, retry decisions, timeout classes, and fallback decisions.
- Side-effect evidence: external API calls with dependency name, operation, timeout, latency, status class, retry count, circuit state, and provider request id; DB affected rows; transaction begin/commit/rollback evidence; queue enqueue and consume; idempotency decisions; locks; migrations; batch summaries; release/config/feature-flag events; and configuration snapshots.
- Pipeline integrity evidence when logs leave the process: generated count, collector accepted count, exporter sent count, stored count, searchable count, canary event id, sequence gaps, duplicate rate, timestamp and observed timestamp drift, queue oldest age, DLQ oldest age, parser failures, mapping conflicts, dropped or sampled counts, rotation or restart boundary, multiline grouping, and storage retention boundary.
- Safety constraints: secrets, tokens, cookies, auth headers, passwords, raw payloads, personal data, payment data, provider response bodies, full SQL, log injection through control characters or ANSI escapes, high-cardinality indexing cost, sampling policy, and retention policy.
- Local conventions: logger API, structured field names, severity levels, redaction helpers, error serialization, test helpers, snapshots or fixtures, and configured command intents.

<!-- mustflow-section: preconditions -->
## Preconditions

- The task matches the Use When conditions and does not match the Do Not Use When exclusions.
- Higher-priority instructions and `.mustflow/config/commands.toml` have been checked for the current scope.
- Existing logger wrappers, error conventions, redaction helpers, request-context propagation, and tests have been searched before adding or changing log shapes.
- Required path, correlation, lifecycle, error, decision, side-effect, safety, and local-convention inputs are available, or missing inputs can be reported without guessing.
- If log changes touch secrets, personal data, auth, payments, queues, retries, transactions, idempotency, cache, locks, or external providers, also apply the relevant security or integrity skill.

<!-- mustflow-section: allowed-edits -->
## Allowed Edits

- Add or tighten structured log events, stable event names, schema versions, safe identifiers, trace/span/request/correlation/causation IDs, result summaries, outcome and reason fields, duration fields, deployment/resource attributes, affected-row counts, transition fields, retry attempt fields, dependency metadata, queue and batch summary fields, audit fields, and focused tests when local logging patterns exist.
- Preserve stack traces and error causes by using the repository's logger and error APIs correctly.
- Replace raw payloads, raw provider bodies, raw SQL, tokens, passwords, cookies, auth headers, personal data, payment data, user-controlled control characters, and high-cardinality indexed values with redacted summaries, stable codes, hashed values, bounded classifications, route templates, query hashes, or safe IDs.
- Remove or lower duplicate noisy logs only when a higher boundary already logs the same failure with better context.
- Do not add a new logging vendor, daemon, sink, background worker, live log query, production dashboard dependency, or raw command outside the configured command contract.
- Do not turn logs into the only correctness mechanism. Logs may prove or reveal a problem; they do not replace durable state, authorization, idempotency, transactions, reconciliation, or tests.

<!-- mustflow-section: procedure -->
## Procedure

1. Name the reconstruction question.
   - State what an operator must reconstruct: which request entered, which branch ran, which dependency answered, which rows changed, which retry happened, which permission failed, which cache path was used, or which final state was returned.
   - If the log change does not answer a reconstruction question, classify it as decorative.
   - Treat logs as event records. Require a stable `event_name`; keep human prose in `message` as secondary, not as the alert or dashboard contract.
   - Keep event names stable and moderately broad: use `auth.login.failed` plus fields such as `failure_reason`, `client_type`, and `identity_provider` instead of encoding every attribute into the name.
   - Check schema version, severity or level, event timestamp, observed timestamp when useful, service name, service version, git SHA or release id, environment, region, and resource identity when local conventions expose them.
2. Check request start logs.
   - A route-only log is weak evidence.
   - Require safe fields such as request id, trace id, span id, correlation id, tenant id, actor or user id when allowed, operation name, route template, route pattern instead of full URL, query key summary or query hash, and key resource identifiers.
   - Avoid raw payloads; keep only identifiers and classified input shape needed to reproduce or search the incident.
3. Check request finish logs.
   - Pair start logs with finish logs when the framework does not already provide them.
   - Require status code or result type, outcome, reason code, duration, final state, and created or modified resource identifiers when safe.
   - Distinguish success, expected denial, validation failure, timeout, cancellation, dependency failure, and unexpected exception.
   - Sample high-volume success summaries intentionally, but do not silently sample away failures, security events, payment events, admin actions, state transitions, or audit events.
4. Preserve error evidence.
   - Reject `logger.error(error.message)` or string-only logging when it drops stack, cause, code, status, or metadata.
   - Error wrappers should preserve the original cause.
   - Log an unexpected exception once at the boundary that can attach request, tenant, actor, operation, and resource context.
5. Review external API call logs.
   - Before calls, capture dependency name, provider, operation or endpoint template, method, timeout, attempt, circuit state, and safe business id.
   - After calls, capture status code or status class, latency, provider request id, retry count, retryability decision, circuit state, and bounded provider error code.
   - Do not dump provider request or response bodies; preserve only safe failure codes and correlation handles.
6. Review database write evidence.
   - Important writes should expose matched, affected, modified, inserted, deleted, or returned row counts as local conventions allow.
   - Treat 0 affected rows and unexpectedly high affected rows as review points, not boring implementation details.
   - Prefer query or operation names and table or collection names over raw SQL.
7. Review transaction and state-transition logs.
   - Multi-step state changes should leave evidence for begin, important step, commit, rollback, compensation, and after-commit side effects when useful.
   - State transitions should include from state, to state, reason, actor, and resource id.
   - Logs should show whether a path reached commit, rolled back, or stopped before any durable change.
8. Review silent early returns.
   - Inspect `return null`, `return false`, empty returns, guard clauses, permission denials, missing data branches, empty collections, and no-op cases.
   - Important early exits need a reason code at debug, info, or warn level according to local severity policy.
   - Avoid logging harmless hot-path absences at noisy levels.
9. Review retry and timeout logs.
   - Retry logs should include attempt, max attempts, backoff, next retry decision, error type, dependency name, and final exhaustion reason.
   - Timeout logs should include configured timeout, actual duration when available, timeout class, and whether the operation was cancelled, retried, or surfaced.
   - Separate caller cancellation, upstream deadline, dependency timeout, pool timeout, queue visibility expiry, and shutdown cancellation.
   - Avoid warning on every expected retry attempt when the policy treats those attempts as normal; raise severity at final exhaustion, degradation, or user-impact boundaries.
10. Review queue and async handoff logs.
    - Enqueue logs should connect producer, queue name, job or message id, delay, dedupe key, visibility timeout, request id, correlation id, tenant, and causation id when safe.
    - Consume logs should connect consumer, queue name, job or message id, attempt, max attempts, delay or age, processing duration, result, retry, ack or commit outcome, dead-letter reason, and poison-message classification.
    - Preserve correlation across fire-and-forget promises, event listeners, callbacks, workers, emails, webhooks, and background jobs.
11. Review batch and migration logs.
    - Batch jobs need total, success, failed, skipped, duration, last-success, and representative failed item identifiers when safe.
    - Data fixes and migrations need dry-run selection counts, apply counts, skip reasons, affected ids or safe samples, and rollback or recovery handles.
    - `done` is not an operational summary.
12. Review auth, authorization, and validation logs.
    - Authorization failures should classify actor, required permission, resource, decision, and reason without exposing secrets.
    - Authentication failures should be internally classified without creating account-enumeration or password hints in public responses.
    - Validation failures should summarize field names, failure categories, client or SDK version hints, and safe request identifiers without raw sensitive input.
    - Treat administrator changes, refunds, token issuance, personal-data access, permission changes, and security-sensitive denials as audit events with actor, authority, target, outcome, and tamper-resistant retention expectations instead of ordinary debug logs.
13. Review cache, lock, and idempotency logs.
    - Cache paths should expose hit, miss, stale, fill, fallback, TTL, and safe cache-key class where useful.
    - Lock logs should expose lock key class, wait time, TTL, owner class, acquired status, release result, and failure reason.
    - Idempotency logs should distinguish new request, duplicate replay, conflict, previous-result return, in-progress duplicate, and key or payload mismatch.
14. Review feature flag, config, and environment logs.
    - Feature flag branches should expose flag name, variant, rule or cohort class, and operation path when safe.
    - Startup config logs should summarize mode, endpoints, timeout values, enabled integrations, region, and feature toggles without secrets.
    - Runtime config reads that affect behavior should be traceable to a safe config identity or version.
    - Releases, migrations, feature-flag changes, and config changes should leave event records such as deployment started or completed, config changed, migration started or completed, and rollout variant updated.
15. Review log levels and duplicate ownership.
    - Use info for lifecycle summaries, debug for branch details, warn for recoverable or degraded failures, and error for failed requests, failed jobs, or possible data damage.
    - Avoid logging the same exception as error in controller, service, and repository layers.
    - Internal layers should add context through causes, structured metadata, or lower-level logs without drowning the boundary error.
16. Review structure and searchability.
    - Prefer stable event names and structured fields over prose-only messages; do not build alerts, dashboards, or runbook queries from mutable message text.
    - Require domain identifiers: order id, payment id, file id, job id, tenant id, actor id, or resource id where safe and relevant.
    - Check that a single customer issue can be searched by request id, resource id, provider request id, or job id without guessing text fragments.
    - Keep frequently aggregated fields low-cardinality. Use route templates, dependency names, bounded reason enums, and status classes; keep request ids, user ids, order ids, stack traces, full URLs, and arbitrary provider text out of indexed labels unless the storage policy explicitly supports them.
17. Review redaction before the log leaves the process.
    - Redact or classify tokens, passwords, auth headers, cookies, raw request bodies, emails, phone numbers, payment data, provider bodies, and full SQL before handing data to the logger.
    - Normalize or escape user-controlled strings such as filenames, user agents, nicknames, referers, and queries so newlines, tabs, control characters, and ANSI escapes cannot forge log entries.
    - Sink-side masking is not enough when sensitive data has already crossed the process boundary.
    - Tests or static guards should cover sensitive log fields when feasible.
18. Review log pipeline survival when the task depends on searchable logs.
    - Compare generated, accepted, sent, stored, and searchable counts by service, environment, version, and event family instead of trusting one total.
    - A synthetic canary log with a unique id and increasing sequence can expose loss, duplication, reorder, and search visibility lag.
    - Distinguish event timestamp from observed timestamp; large drift points to clock skew, buffer delay, backpressure, or collector backlog.
    - Queue size alone is weak. Check queue utilization, oldest queued event age, enqueue failures, exporter failures, receiver refusals, DLQ size, and DLQ oldest age.
    - Parser failures, mapping conflicts, multiline splits, log rotation, container restart, pod deletion, disk buffer exhaustion, and retention or rollover drift can silently erase the evidence operators think they have.
    - If pipeline checks require live collectors, sinks, dashboards, or production search, report them as manual-only instead of claiming log evidence survived.
19. Require evidence.
    - Prefer focused tests, log fixtures, snapshot assertions, redaction tests, source-level guards, or local logger contract tests for stable event names and fields.
    - Prefer tests that pin `event_name`, schema version, required fields, redaction, bounded reason codes, and message-independent query fields rather than exact prose.
    - If logs depend on runtime middleware, production log routing, sink configuration, or manual log search outside the repository, report that evidence as manual-only.
    - Do not claim a path is diagnosable when only happy-path logs exist.

<!-- mustflow-section: postconditions -->
## Postconditions

- The reviewed backend path has a reconstruction question, event contract, request lifecycle evidence, correlation and causation model, decision evidence, side-effect evidence, error and cause preservation, pipeline survival boundary, redaction boundary, level ownership, sampling boundary, and evidence level.
- Missing start or finish logs, message-only contracts, unstable event names, missing schema version, missing trace or span id, missing correlation or causation id, string-only errors, lost causes, missing external-call before and after logs, raw provider body logs, missing affected-row counts, invisible transaction or state transitions, silent early returns, attempt-free retries, duration-free timeouts, enqueue or consume gaps, broken async correlation, empty batch summaries, missing auth or validation reasons, ordinary logs for audit events, cache or lock blind spots, idempotency ambiguity, feature flag opacity, release or config opacity, secret-bearing config logs, migration `done` logs, swallowed async errors, all-info or all-error severity, duplicate error spam, prose-only messages, high-cardinality indexed fields, log injection exposure, unsafe sampling, and missing identifiers are fixed or reported.
- Named review smells such as broken async request id, auth or validation failures, cache hits or misses, lock acquisition, idempotency outcomes, config startup summaries, release and migration event gaps, migration dry-run and apply logs, message-based dashboards, prose-only log, and sink-side-only masking are fixed or reported when present.
- Log changes are backed by local logger conventions, tests, fixtures, source review evidence, or labeled as manual-only or missing.

<!-- mustflow-section: verification -->
## Verification

Use configured oneshot command intents when available:

- `changes_status`
- `changes_diff_summary`
- `lint`
- `build`
- `test_related`
- `test`
- `docs_validate_fast`
- `test_release`
- `mustflow_check`

Prefer the narrowest configured checks that cover the changed logging contract and synchronized template surfaces. Do not infer live log searches, production incidents, dashboards, collectors, servers, or manual sink checks outside the command contract.

<!-- mustflow-section: failure-handling -->
## Failure Handling

- If a configured command fails, preserve the failing intent and the log contract it was exercising before editing again.
- If no logger convention exists, recommend the smallest wrapper or boundary decision instead of scattering inconsistent log calls.
- If redaction cannot be proven, treat the log change as unsafe until sensitive values are removed before the logger boundary.
- If a path cannot expose identifiers because of privacy or product policy, report the alternate safe correlation handle or the remaining searchability gap.
- If deterministic log proof is not configured, complete available verification and report the missing manual or integration evidence.

<!-- mustflow-section: output-format -->
## Output Format

- Backend log boundary reviewed
- Reconstruction question, event contract, request lifecycle, correlation and causation, error and cause preservation, external API, database write, transaction, state transition, early return, retry, timeout, queue or async handoff, batch or migration, audit, auth, validation, cache, lock, idempotency, feature flag, release, config, pipeline survival, level ownership, structure, cardinality, sampling, log-injection safety, redaction, and test evidence findings
- Log fixes made or recommended
- Evidence level: configured-test evidence, log fixture evidence, source review evidence, manual-only, missing, or not applicable
- Command intents run
- Skipped log diagnostics and reasons
- Remaining backend-log-evidence risk
