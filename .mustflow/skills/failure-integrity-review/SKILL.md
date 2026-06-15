---
mustflow_doc: skill.failure-integrity-review
locale: en
canonical: true
revision: 1
lifecycle: mustflow-owned
authority: procedure
name: failure-integrity-review
description: Apply this skill when code is created, changed, reviewed, or reported and exception or failure handling can make the system lie about success, state, data, money, permissions, locks, queues, logs, metrics, or user-visible results, including broad catch blocks, swallowed exceptions, log-and-continue paths, return null/false/empty defaults, finally masking, unsafe retry, missing timeout, cancellation swallowing, async task failures, queue ack/nack, lost causes, raw internal errors, partial state changes, transaction rollback, lock/resource cleanup, parsing defaults, fail-open authorization, unsafe cache fallback, fallback defaults, stable error codes, and missing failure-path observability.
metadata:
  mustflow_schema: "1"
  mustflow_kind: procedure
  pack_id: mustflow.core
  skill_id: mustflow.core.failure-integrity-review
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

# Failure Integrity Review

<!-- mustflow-section: purpose -->
## Purpose

Review failure handling by asking what lie the system tells after something fails.

The question is not whether a `try`/`catch` exists. The stronger question is whether a failed step can leave data, state, money, permissions, locks, queues, logs, metrics, or user-visible responses pretending the operation succeeded. Good failure handling makes failure honest, bounded, observable, and recoverable.

<!-- mustflow-section: use-when -->
## Use When

- Code creates, changes, reviews, or reports exception handling, `catch`, `finally`, `retry`, `timeout`, `fallback`, `rollback`, `ack`, `nack`, `close`, `cancel`, `ignore`, `default`, `return null`, `return false`, empty collections, or `log.error` paths.
- A workflow has multiple steps where one step can fail after another step changed internal state, external state, a transaction, a queue, a cache, a lock, a file, a payment, an entitlement, or a user-visible result.
- Code handles external APIs, databases, files, streams, locks, queues, async tasks, cancellation, parsing, validation, authentication, authorization, cache fallback, payment, inventory, email, notification, or admin operations.
- Public API, CLI, UI, queue, or webhook boundaries expose error codes, messages, statuses, responses, acknowledgements, logs, metrics, trace ids, request ids, or incident evidence.
- A review or final report claims a path is safe, handled, resilient, graceful, retried, rolled back, logged, observable, idempotent, or successful despite possible failures.

<!-- mustflow-section: do-not-use-when -->
## Do Not Use When

- The task only models expected failures, meaningful absence, `null`, `undefined`, boolean flags, or public error envelopes as typed values; use `result-option` first and this skill only for swallowed failures, partial state, or operational honesty.
- The task only changes backend retries, idempotency, queues, caches, health checks, provider calls, or outbox/inbox behavior; use `backend-reliability-change` first and this skill as an adjunct for failure truthfulness.
- The task only changes object lifetime or resource cleanup; use `memory-lifetime-review` first and this skill only when cleanup failure can hide the original failure or leave false success.
- The task only changes authorization, personal data, secret logging, or fail-closed policy; use `security-privacy-review` first and this skill only for error-path integrity around that boundary.
- The task is a pure calculation with no fallible dependency, side effect, status, observable response, or failure branch.

<!-- mustflow-section: required-inputs -->
## Required Inputs

- Failure surface: exception type, error value, rejected promise, timeout, cancellation, parse failure, validation failure, provider response, queue delivery failure, transaction failure, lock failure, cleanup failure, or fallback trigger.
- Truth surface: what the caller, user, operator, queue, database, cache, ledger, metric, audit log, or downstream service will believe after the failure.
- State-change ledger: every mutation, external call, enqueue, publish, ack, lock acquire, file write, cache write, status change, response send, and metric/log emission before and after each fallible step.
- Error classification: expected rejection, validation error, permission denial, transient dependency failure, permanent dependency failure, unknown outcome, programmer bug, corrupted data, or cancellation.
- Boundary rules: transaction rollback, compensation, idempotency, retry budget, timeout, fallback safety, fail-open or fail-closed behavior, public error code, safe message, cause preservation, redaction, and observability.
- Relevant command-intent contract entries for tests, builds, docs, release checks, and mustflow validation.

<!-- mustflow-section: preconditions -->
## Preconditions

- The task matches the Use When conditions and does not match the Do Not Use When exclusions.
- Higher-priority instructions and `.mustflow/config/commands.toml` have been checked for the current scope.
- Required inputs are available, or missing failure, state, rollback, idempotency, timeout, fallback, redaction, or observability facts can be reported without guessing.
- Existing local patterns for typed errors, result values, transaction wrappers, idempotency, retries, queue consumers, cancellation, cleanup, logging, metrics, and public error envelopes have been searched before adding new shapes.
- If the failure path crosses money, entitlement, authorization, personal data, external providers, or durable events, also apply the relevant backend, security, database, API, state-machine, or result skill.

<!-- mustflow-section: allowed-edits -->
## Allowed Edits

- Replace swallowed exceptions, log-and-continue paths, and fake success returns with explicit failure propagation, typed error values, rollback, compensation, fail-closed behavior, or honest degraded responses.
- Split error categories and public error mapping when different failures need different caller behavior, retry behavior, monitoring, or user-visible status.
- Preserve original causes while keeping raw stack traces, SQL, provider payloads, secrets, tokens, request bodies, and personal data out of public responses and unsafe logs.
- Add or tighten timeout, retry budget, backoff, jitter, idempotency, cancellation propagation, queue ack/nack, dead-letter, lock release, resource cleanup, and failure-path observability tied to the changed surface.
- Add focused tests for representative failure branches, partial-step failures, retry exhaustion, timeout, cancellation, rollback, cleanup, fallback, stable error codes, and false-success prevention.
- Do not fix failure handling with arbitrary sleeps, broad catch-all branches, default values, comments that say "should not happen", or logs that cannot drive operator action.

<!-- mustflow-section: procedure -->
## Procedure

1. Ask the lie question first. If this step fails, what will the user, caller, database, cache, queue, ledger, metric, log, or operator believe happened?
2. Classify every caught failure.
   - Avoid one broad `catch (Exception)`, `catch (error)`, or equivalent path that erases file-not-found, permission denied, timeout, validation, corrupted data, dependency failure, and programmer bugs into the same behavior.
   - Separate expected rejection, transient dependency failure, permanent dependency failure, unknown outcome, cancellation, and bug because each needs different propagation, retry, and monitoring.
3. Reject log-and-continue fake success.
   - A caught error followed by `return success`, `return null`, `return false`, `return []`, or continuing to the next side effect usually turns failure into a false fact.
   - Distinguish "no data" from "failed to load data", "not sent" from "sent", and "not applied" from "applied".
4. Review `finally` and cleanup masking.
   - Cleanup must run, but cleanup failure should not hide the original failure without preserving it as primary cause or suppressed context.
   - Check file close, stream close, transaction end, lock release, temp-file cleanup, and connection release paths.
5. Preserve diagnostic identity without leaking secrets.
   - Logs should include safe identifiers such as request id, order id, file id, provider name, retry count, state, operation name, and result class when useful.
   - Do not log passwords, tokens, session cookies, payment details, full request bodies, raw provider payloads, personal data, or full exception graphs unless a narrow redacted retention rule exists.
6. Check transaction honesty.
   - Catching inside a transaction and returning normally can commit partial failure.
   - Fail by throwing or returning an error that forces rollback, or explicitly roll back before converting the error.
   - If only part of the workflow can be atomic, name the compensation, reconciliation, or manual recovery path.
7. Check external side-effect ordering.
   - If internal state says "paid", "sent", "saved", "processed", "approved", or "complete", verify the corresponding external or durable side effect is actually known to have happened.
   - Unknown provider outcomes need reconciliation before repeating money, entitlement, inventory, or privacy-impacting actions.
8. Review retry and timeout behavior.
   - A network timeout often means "unknown outcome", not "safe failure".
   - Retry only when the operation is idempotent or guarded by durable idempotency. Add bounded attempts, timeout, backoff, jitter, and stop conditions.
   - Missing timeout means failure may never become an exception; check thread, connection, worker, and pool exhaustion risk.
9. Preserve cancellation semantics.
   - `InterruptedException`, `CancellationException`, `AbortError`, cancelled promises, context cancellation, and stop signals are control flow from above, not ordinary failures.
   - Restore interrupt status, rethrow, return a cancellation result, or propagate the cancellation according to local style.
10. Check async failure ownership.
    - For `Promise`, `Future`, `Task`, coroutine, goroutine, thread, event handler, and background job paths, ask who observes the failure.
    - Avoid fire-and-forget work unless failure is deliberately logged, counted, bounded, and safe to lose.
11. Review queue and event acknowledgement.
    - Ack after failure drops work. Blind nack on every failure can poison the queue.
    - Define retry count, visibility timeout, dead-letter behavior, idempotent consumer state, duplicate handling, and safe operator evidence.
12. Preserve causes when converting errors.
    - Wrapping an error should retain the cause or equivalent diagnostic context.
    - Public errors should expose stable safe codes and messages, while internal logs or traces retain the raw cause under privacy rules.
13. Separate public and internal error shapes.
    - Do not leak `NullPointerException`, SQL syntax, S3 access errors, stack traces, filesystem paths, storage keys, or provider payloads through public APIs.
    - Do not make clients branch on free-form text. Public failure contracts need stable machine-readable codes.
14. Separate business rejections from system failures.
    - Insufficient balance, invalid input, duplicate request, and permission denial are not the same as Redis down, DB unavailable, provider timeout, corrupted data, or programmer bugs.
    - Map input validation to client-correctable errors and system failure to server/dependency errors.
15. Trace partial state after every fallible line.
    - After setting `PROCESSING`, writing a DB row, reserving inventory, acquiring a lock, opening a file, sending a response, or publishing an event, ask where state lands if the next line fails.
    - Close states explicitly as failed, rolled back, pending reconciliation, or unknown instead of leaving them stuck in-progress.
16. Check locks and resources from the acquisition line.
    - The release guarantee should start immediately after `lock()`, semaphore acquire, distributed lock acquire, file lock, advisory lock, connection checkout, file open, stream open, temp file create, or cursor open.
    - Normal-only `close()` paths are failure bugs. Use the local equivalent of scoped resource management.
17. Review parsing and default values.
    - A dangerous default value is usually worse than a loud failure for money, quantity, date, role, permission, or policy inputs.
    - Missing JSON fields, malformed dates, unknown time zones, missing prices, missing quantities, and invalid permissions should not silently become `0`, current time, free, public, allowed, or empty.
    - Defaults are safe only when the wrong value has bounded harmless impact.
18. Check fail-open paths.
    - Authentication, authorization, payment, entitlement, rate limit, destructive admin, and privacy decisions should normally fail closed.
    - Recommendation, analytics, email, and non-critical display features may degrade only when the fallback cannot change protected state or mislead the user.
19. Review cache and fallback truth.
    - Cache failure is a performance problem only when cache data is disposable. If cache stores sessions, permissions, rate limits, inventory, idempotency, or deduplication, failure is a correctness boundary.
    - Fallback must be a safe degraded value, not a convenient default that can sell for zero, grant access, hide missing data, or mark work complete.
20. Require failure-path evidence.
    - Tests should cover DB save failure, external timeout, second-step failure, retry exhaustion, cancellation, malformed input, queue consumer failure, rollback, cleanup, and stable public error code where relevant.
    - Metrics should expose retry exhaustion, fallback activation, dead-letter insert, compensation failure, unknown provider outcome, and data inconsistency when those states matter.
21. Report missing evidence honestly. If the repository lacks configured integration, provider, queue, database, chaos, or load checks, complete available verification and name the remaining manual evidence gap.

<!-- mustflow-section: postconditions -->
## Postconditions

- Failure paths no longer produce false success, false completion, false empty data, false authorization, false delivery, or false durable state.
- Expected rejection, transient failure, permanent failure, unknown outcome, cancellation, bug, and corrupted data are separated where they affect behavior.
- Transactions, external side effects, retries, timeouts, queues, locks, resources, parsing defaults, fallbacks, and public error shapes are checked where relevant.
- Logs, metrics, traces, and audit records provide safe incident evidence without leaking sensitive data.
- Focused tests or configured verification cover the highest-risk failure branch when feasible.

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

Prefer the narrowest configured test, build, docs, release, or mustflow intent that proves false-success prevention and changed failure contracts. Do not infer raw provider, database, queue, load, chaos, server, watcher, or manual incident commands outside the command contract.

<!-- mustflow-section: failure-handling -->
## Failure Handling

- If a configured command fails, preserve the failing intent, failing assertion or output tail, and the failure contract it exercised before editing again.
- If the failure outcome cannot be classified, report the missing domain or operational decision instead of hiding it behind a catch-all branch.
- If fixing failure integrity requires a transaction boundary, idempotency store, outbox, dead-letter queue, reconciliation job, stable error catalog, or monitoring pipeline outside the current scope, report the missing durable boundary.
- If deterministic failure proof is not configured, report the missing manual evidence and complete the configured checks that are available.

<!-- mustflow-section: output-format -->
## Output Format

- Failure surface and lie checked
- Error categories and boundaries reviewed
- False success, swallowed exception, null/false/empty default, finally masking, transaction, side-effect ordering, retry/timeout, cancellation, async ownership, queue ack/nack, cause preservation, public/internal error shape, partial state, lock/resource cleanup, parsing default, fail-open, cache/fallback, and observability checks where relevant
- Failure-integrity fixes made or recommended
- Tests or verification evidence
- Command intents run
- Skipped failure diagnostics and reasons
- Remaining failure-integrity risk
