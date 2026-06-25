---
mustflow_doc: skill.observability-debuggability-review
locale: en
canonical: true
revision: 2
lifecycle: mustflow-owned
authority: procedure
name: observability-debuggability-review
description: Apply this skill when code is created, changed, reviewed, or reported and logs, metrics, traces, spans, events, dashboards, alerts, runbooks, telemetry context, collectors, exporters, telemetry queues, canaries, sampling, redaction, external dependency calls, queues, batch jobs, caches, pools, rate limits, feature flags, releases, or partial-success paths need review for whether an operator can narrow an incident quickly without high-cardinality metric explosions, missing denominators, lost trace context, silent telemetry loss, or unsafe telemetry data.
metadata:
  mustflow_schema: "1"
  mustflow_kind: procedure
  pack_id: mustflow.core
  skill_id: mustflow.core.observability-debuggability-review
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

# Observability Debuggability Review

<!-- mustflow-section: purpose -->
## Purpose

Review observability as incident narrowing evidence, not as "there is a log line."

The review question is not "does the code emit telemetry?" It is "when this path fails, slows down, retries, backs up, or half-succeeds at 3 AM, can an operator narrow the failing dependency, operation, tenant, release, queue, pool, attempt, and partial state in minutes without leaking sensitive data or exploding metric cardinality?"

<!-- mustflow-section: use-when -->
## Use When

- Code creates, changes, reviews, or reports logs, structured events, metrics, spans, traces, trace context, baggage, telemetry attributes, dashboards, alerts, runbooks, sampling, redaction, observability exporters, or custom collectors.
- HTTP handlers, API clients, database calls, cache layers, queues, workers, cron jobs, batch jobs, pipelines, webhook handlers, payment or order flows, file processing, feature flags, experiments, rate limits, pools, or external dependencies need incident evidence.
- Code claims a path is observable, debuggable, monitored, traced, metered, alerted, operationally safe, SLO-ready, dashboard-ready, or easy to troubleshoot.
- The telemetry pipeline itself can drop, delay, sample, parse-fail, mis-route, or hide logs, metrics, traces, events, or dashboards while product systems appear healthy.
- A change adds retries, timeouts, cancellation, queue settlement, idempotency, external side effects, partial completion, fallback behavior, cache fallback, rate limiting, or release gating where telemetry can hide or reveal the real failure.

<!-- mustflow-section: do-not-use-when -->
## Do Not Use When

- The task is only public error wording, validation text, or recovery guidance; use `error-message-integrity-review` first and this skill only for operator telemetry and incident evidence.
- The task is primarily swallowed exceptions, false success, partial state, timeout honesty, cancellation, fallback, or queue ack behavior; use `failure-integrity-review` first and this skill for observability evidence.
- The task is primarily retry amplification, queue settlement, cache truth, API request latency, web rendering, or database query speed; use the matching specialized skill first and this skill for logs, metrics, traces, alerts, and cardinality.
- The code path is a pure local calculation with no operational boundary, dependency, request, job, batch, queue, cache, pool, user-visible outcome, or incident response value.
- The repository has no telemetry implementation pattern and the user only asked for behavior changes. Report missing observability evidence instead of inventing a new telemetry stack.

<!-- mustflow-section: required-inputs -->
## Required Inputs

- Incident question: what an operator must narrow first, such as failing dependency, route, tenant, user cohort, release, job, queue, pool, retry attempt, idempotency key, message, side effect, or partial state.
- Signal inventory: logs, metrics, traces, spans, structured events, audit logs, dashboards, alerts, runbooks, profiling, health checks, custom collectors, and exporter self-metrics already present or changed.
- Request or job identity: request id, trace id, span id, correlation id, causation id, tenant or organization id, user or anonymous id, job id, message id, idempotency key, dedupe key, batch run id, webhook id, and safe business keys.
- Metric model: counters, gauges, histograms, summaries, denominators, latency distributions, outcome labels, status classes, route templates, dependency names, operation names, and cardinality constraints.
- Trace and event model: span boundaries, parent-child relationships, async propagation, queue or worker propagation, external call spans, per-attempt spans, span events, feature flag attributes, release attributes, and sampling policy.
- Log model: event names, stable error categories, reason codes, severity, structured fields, safe identifiers, redaction, public versus internal message split, and whether matching counters exist for repeated log events.
- Operational domains: HTTP golden signals, dependency health, DB queries, transactions, queues, batch jobs, pipelines, caches, pools, rate limits, feature flags, releases, migrations, partial-success and compensation paths.
- Telemetry pipeline evidence: generated signals, accepted signals, dropped signals, export failures, queue utilization, queue oldest age, retry backlog, scrape failures, collector restarts, ingestion canary lag, parser or mapping failures, searchable count, DLQ oldest age, sampling keeps and drops, storage retention, and dashboard read-path status.
- Privacy and retention constraints: secrets, tokens, cookies, authorization headers, raw request bodies, personal data, payment data, prompt or document text, baggage propagation, telemetry sink boundary, and retention policy.
- Verification evidence: existing tests, schema checks, telemetry fixtures, instrumentation tests, runbook docs, dashboard definitions, alert rules, configured command intents, and any manual-only production evidence boundary.

<!-- mustflow-section: preconditions -->
## Preconditions

- The task matches the Use When conditions and does not match the Do Not Use When exclusions.
- Higher-priority instructions and `.mustflow/config/commands.toml` have been checked for the current scope.
- Required incident question, signal inventory, identity model, metric model, trace model, log model, privacy constraints, and verification evidence are available, or missing evidence can be reported without guessing.
- Existing local telemetry wrappers, logger conventions, metric naming, trace propagation, redaction helpers, alert files, dashboard files, and tests have been searched before adding new shapes.
- If observability touches authorization, personal data, payments, credits, secrets, queues, retries, cache truth, or external provider state, also apply the relevant security, payment, retry, queue, cache, adapter, or failure skill.

<!-- mustflow-section: allowed-edits -->
## Allowed Edits

- Add or tighten structured log fields, event names, safe reason codes, low-cardinality metric labels, counters with denominators, histograms, span attributes, span events, dependency names, operation names, trace context propagation, sampling rules, redaction, and focused tests when the repository already has a local pattern.
- Add or update docs, runbook notes, alert metadata, dashboard definitions, telemetry fixtures, or schema tests when they are directly tied to the changed telemetry contract.
- Replace raw URL, raw SQL, raw user id, raw request body, token, cookie, authorization header, or unbounded object labels with route templates, query names, safe ids, hashed or classified values, and redacted structured fields.
- Do not add a new observability vendor, exporter, collector, agent, daemon, background process, dashboard service, live dependency call, load test, profiler, or production query outside the configured command contract.
- Do not treat telemetry as a substitute for correct state, idempotency, transaction integrity, authorization, reconciliation, or failure handling.
- Do not increase metric cardinality for debugging convenience when the same evidence belongs in traces, structured events, sampled logs, or an internal audit store.

<!-- mustflow-section: procedure -->
## Procedure

1. Start with the incident-narrowing question.
   - Name what an operator must decide first: dependency down, route slow, queue backed up, one tenant affected, one release regressed, one feature flag cohort broken, one job stalled, one retry layer storming, or one partial side effect missing.
   - If no operator question exists, report that the telemetry change is decorative until the incident question is defined.
2. Build a signal ledger.
   - List logs, metrics, traces, spans, events, audit entries, alerts, dashboards, runbooks, and exporter self-metrics touched by the path.
   - Mark each signal as symptom, cause evidence, correlation evidence, saturation evidence, recovery evidence, or noise.
   - A success-only log is not enough; failure classification and missing-work evidence matter more.
3. Check metrics for numerator and denominator.
   - Error counters need total attempt counters so an operator can compute rates.
   - Cache hits need total lookups, fill errors, stale-served counts, origin latency, and eviction or lock-wait evidence when cache correctness matters.
   - Rate limits need allowed, blocked, shadow-blocked, delayed, retry-after, policy, and key-type evidence rather than only `rate_limited_total`.
4. Reject average-only latency.
   - Prefer histograms or equivalent distribution evidence for p95, p99, and tail behavior.
   - Separate success latency from error latency; fast failures should not make the service look healthy.
   - Label outcome and status class with bounded cardinality where the local metric system supports it.
5. Protect metric cardinality.
   - Do not put raw URL paths, query strings, user ids, order ids, emails, message ids, idempotency keys, exception messages, SQL text, or arbitrary provider codes into metric labels.
   - Use route templates, dependency names, operation names, status classes, bounded reason enums, policy names, and feature flag names.
   - Keep high-cardinality fields in traces, structured events, audit records, or sampled logs when they are safe and needed for narrowing.
6. Check trace and log correlation.
   - Logs should include trace id and span id, or the local equivalent, when distributed tracing exists.
   - Spans should include dependency name, operation name, route template, outcome, safe error type, retry attempt, timeout or cancellation class, and release or environment attributes when useful.
   - If a log line cannot be joined to a request, job, message, or batch run, it is weak incident evidence.
7. Check async and queue context propagation.
   - HTTP to worker, queue, stream, pub/sub, webhook, cron, and batch boundaries should propagate or intentionally fork trace context.
   - Producers should inject safe context into messages when the system needs end-to-end diagnosis; consumers should extract it before doing work.
   - A new trace at the worker boundary can be correct only when the handoff is intentionally modeled and linked by message, job, or causation id.
8. Separate attempt from operation.
   - Retries should expose each dependency attempt and the final logical operation result.
   - A final success after two failed attempts is a business success and a dependency warning.
   - Record attempt number, max attempts, retry decision, delay, retry-after use, dependency name, and final exhaustion reason with bounded labels.
9. Classify timeout, cancellation, and deadline.
   - User cancellation, upstream deadline, server timeout, dependency timeout, pool acquire timeout, queue visibility expiry, and shutdown cancellation are different events.
   - Do not merge all of them into one generic error metric or log reason.
   - Preserve cancellation semantics without turning intentional caller cancellation into a dependency incident.
10. Review external dependency spans and metrics.
    - `GET https://api.vendor.example` is not enough; add a stable dependency name and operation name.
    - Track attempts, latency distribution, status class, retryable decision, timeout class, circuit-open decisions, and provider request id when safe.
    - Keep provider host, endpoint, and response details out of metric labels when they are unbounded or sensitive.
11. Review database and transaction evidence.
    - Avoid raw SQL in logs and telemetry where it can contain personal data or secrets.
    - Prefer query name, table or collection, operation, rows returned, rows affected, duration, timeout class, and safe error category.
    - Transaction flows should expose begin, commit, rollback, retry, after-commit side effects, external-call-before-commit risk, and compensation or reconciliation evidence when relevant.
12. Review idempotency and partial-success evidence.
    - Payment, order, entitlement, file, webhook, queue, and batch paths need idempotency key, dedupe key, message id, request id, attempt, side-effect state, and unknown-outcome markers where safe.
    - Ask where evidence remains when DB write succeeds but event publish fails, provider call succeeds but local state fails, cache write succeeds but origin rollback happens, or compensation fails.
    - Metrics and logs should distinguish attempt, success, failure, compensation, retry exhausted, and unknown outcome.
13. Review queue, stream, and batch signals.
    - Consumers need queue delay or message age, processing duration, inflight count, ack or commit failures, redelivery count, retry count, DLQ count, poison reason, and oldest message age where supported.
    - Batch jobs need last success timestamp, last completion timestamp, duration, processed count, failed count, skipped count, and stale-job alert evidence.
    - Silent pipelines need heartbeat or synthetic item evidence when "no input" can look like success.
14. Review pools and saturation.
    - CPU can be low while worker, thread, DB connection, HTTP connection, queue, semaphore, or rate-limit pools are saturated.
    - Track active, max, queued, queue wait, acquire duration, timeout count, rejection count, and per-dependency pool names with bounded labels.
    - Missing saturation evidence should downgrade performance and reliability claims.
15. Review feature, config, release, and migration attribution.
    - Logs, traces, and metrics should carry service version, git sha or release id, deployment environment, region, schema or migration version, config version, and relevant feature flag or experiment variant when local policy allows.
    - If a 5 percent feature flag cohort can fail separately, the telemetry must let operators split healthy and broken cohorts.
16. Check alert and runbook usefulness.
    - Every new critical metric should answer what panel, alert, or runbook sentence it supports.
    - Pager alerts should indicate user impact or clear operator action, not only "a counter changed."
    - Logs that page humans should have matching counters or rates so operators can see when the event started and how fast it is happening.
17. Check telemetry self-observability.
    - Exporters, collectors, custom metric collectors, log sinks, trace queues, and sampling pipelines need dropped, failed, queued, scrape error, and export latency evidence when they can blind operators.
    - If telemetry failure can hide product failure, treat missing self-metrics as an operational risk.
18. Check signal pipeline loss and read-path visibility.
    - Compare produced, accepted, exported, stored, and query-visible signal counts when the path depends on logs, metrics, traces, or events for diagnosis.
    - Use canary events or synthetic heartbeats when "no telemetry" could mean no traffic, collector failure, broken parser, dropped queue, retention gap, or dashboard read failure.
    - Track event timestamp versus observed timestamp, queue oldest age, DLQ oldest age, parser or mapping failures by service and version, and duplicate or sequence-gap evidence.
    - Separate telemetry write-path health from read-path health. A sink can store data that dashboards cannot query, and dashboards can be healthy while new signals are not arriving.
    - If collector, sink, dashboard, or production telemetry checks are outside repository commands, report the manual-only boundary.
19. Check sampling policy.
    - Head sampling can drop rare errors and slow traces.
    - Error, slow, retry-exhausted, high-latency, partial-success, DLQ, and compensation-failure traces often need keep rules, tail sampling, or explicit event evidence.
    - If sampling is outside the repository, report the manual-only evidence boundary instead of assuming critical traces are retained.
20. Check privacy before telemetry leaves the process.
    - Redact or classify tokens, passwords, authorization headers, cookies, raw bodies, emails, phone numbers, payment data, personal identifiers, prompt text, confidential document text, provider payloads, and full SQL before logger, metric, trace, baggage, or exporter entry.
    - Baggage should be small, safe, low-lifetime, and intentional. Do not use it as a general request metadata bag.
    - Report sink-side masking as insufficient when sensitive data can already leave the process unredacted.
21. Require telemetry tests or contract evidence where feasible.
    - Good tests assert stable event names, bounded label values, denominator counters, trace-context propagation, redaction, sampling flags, feature flag attributes, release attributes, and failure-category mapping.
    - Source-level guards can prevent raw URL or user id metric labels when runtime telemetry tests are not available.
    - If dashboards, alerts, production traces, or load evidence are manual-only, complete available checks and report the evidence gap.

<!-- mustflow-section: postconditions -->
## Postconditions

- The changed path has an incident question, signal ledger, metric model, trace and log correlation model, telemetry pipeline survival boundary, cardinality boundary, privacy boundary, and evidence level.
- Missing denominators, average-only latency, success-only logs, uncorrelated logs, raw URL labels, raw user labels, raw SQL telemetry, lost async trace context, attempt and operation collapse, generic timeout or cancellation buckets, missing dependency names, missing queue age, missing batch last-success timestamp, missing pool saturation, missing release attribution, decorative metrics, unsafe baggage, telemetry self-blindness, and sampling that drops critical failures are fixed or reported.
- Observability claims are backed by configured tests, schema or fixture evidence, local telemetry conventions, dashboard or alert files, static review evidence, or labeled as manual-only or missing.

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

Prefer the narrowest configured test, build, docs, release, or mustflow intent that covers the changed telemetry contract and synchronized template surfaces. Do not infer raw production dashboards, live traces, log searches, load tests, profilers, local servers, collectors, or manual alert checks outside the command contract.

<!-- mustflow-section: failure-handling -->
## Failure Handling

- If a configured command fails, preserve the failing intent, failing assertion or output tail, and the observability contract it exercised before editing again.
- If the incident question cannot be named, report that the telemetry is not reviewable for debuggability yet.
- If local telemetry conventions are missing, recommend the smallest boundary or wrapper decision instead of sprinkling ad hoc logs and metrics through business code.
- If a safe fix requires a telemetry SDK, collector, dashboard, alerting system, production traces, RUM, live log search, sampling configuration, privacy approval, or data-retention decision outside the current scope, report the missing boundary.
- If deterministic telemetry proof is not configured, complete available verification and report the missing manual or integration evidence.

<!-- mustflow-section: output-format -->
## Output Format

- Observability boundary reviewed
- Incident question, signal ledger, metric model, trace and log correlation, cardinality, identity propagation, attempts versus operation, timeout or cancellation classification, external dependency, DB and transaction, idempotency and partial success, queue or batch, cache, pool saturation, rate limit, feature or release attribution, alert or runbook, telemetry self-observability, signal pipeline survival, sampling, privacy, and test evidence findings
- Observability fixes made or recommended
- Evidence level: configured-test evidence, telemetry fixture evidence, dashboard or alert file evidence, static review risk, manual-only, missing, or not applicable
- Command intents run
- Skipped observability diagnostics and reasons
- Remaining observability-debuggability risk
