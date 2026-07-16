---
mustflow_doc: skill.command-pattern
locale: en
canonical: true
revision: 14
lifecycle: mustflow-owned
authority: procedure
name: command-pattern
description: Apply this skill when a state-changing user or system intent needs to become one traceable, retryable, idempotent, authorized, transactional, auditable, observable, replayable, and testable execution unit, especially for payment, credit, point, inventory, entitlement, subscription, permission, document, prompt, AI cost-bearing work, AI budget reservation, agent loop execution, long-running job, queue message contract, external-side-effect workflow, provider intent record, webhook follow-up, cron work, worker work, manual recovery action, or core-state change that should accept work in HTTP and hand off analytics, email, AI, search indexing, statistics, cache rebuild, or other auxiliary work after commit while preserving request, trace, causation, and job identifiers.
metadata:
  mustflow_schema: "1"
  mustflow_kind: procedure
  pack_id: mustflow.core
  skill_id: mustflow.core.command-pattern
  command_intents:
    - changes_status
    - changes_diff_summary
    - test_related
    - test
    - lint
    - build
    - docs_validate_fast
    - test_release
    - mustflow_check
---

# Command Pattern

<!-- mustflow-section: purpose -->
## Purpose

Model one accepted state-changing user or system intent and its local commit as one clear execution unit. This skill does not own the full durable lifecycle after acceptance.

A command is not a decorative wrapper around a button handler or function. It is the application-level unit that gathers input validation, authorization, domain object loading, domain rule execution, state changes, transaction boundaries, idempotency, audit evidence, event recording, failure handling, retry decisions, and observability around one intent.

Use commands to make these questions answerable later:

- Who requested this work?
- What resource was affected?
- Which command attempted the change?
- Did it succeed, fail permanently, or fail retryably?
- Is a duplicate request safe?
- Which event or follow-up work was produced?

<!-- mustflow-section: use-when -->
## Use When

- A request creates, updates, deletes, approves, cancels, captures, refunds, archives, sends, publishes, imports, exports, or otherwise changes durable state.
- A request changes payment, point, credit, inventory, coupon, subscription, entitlement, permission, AI prompt version, document version, policy version, or automation rule state.
- A request starts, retries, cancels, records, or limits an AI operation where model usage, token cost, cache behavior, retry cost, plan limits, or provider-call reconciliation matters.
- A request starts an agentic or multi-step AI operation where maximum steps, tool calls, tokens, cost, time, model fallback, policy decisions, or emergency stop behavior must be recorded before work fan-out.
- A request consumes high-cost resources such as AI calls, image or video conversion, search, automation, file processing, webhooks, realtime fan-out, or provider calls that need credits, quotas, tenant limits, or usage records.
- A user or system action calls an external service, sends a message, writes a file, sends email, charges payment, publishes a webhook, or schedules work.
- A user or system action depends on an external API and must preserve the product's intent before the provider call so failed, unknown, delayed, or duplicate work can be retried, reconciled, or manually recovered later.
- An operator needs to replay a failed email, reprocess a webhook, retry an AI job, rebuild a search index, disable an external feature, reconcile a payment, or move an exhausted job out of manual review without guessing from logs.
- The operation needs authorization, audit logs, idempotency, retry classification, concurrency protection, an outbox, or a transaction boundary.
- The operation must update several local records atomically and then coordinate with email, notification, webhook, analytics, payment, AI, or other external systems after commit.
- A user request currently waits for auxiliary work such as analytics logging, search indexing, recommendation refresh, statistics aggregation, email delivery, AI summarization, file conversion, cache purge, or reporting updates even though the core state change could safely complete first.
- An HTTP route should accept a long-running or externally dependent operation, persist the requested work, and return a queued, processing, or accepted result instead of completing email, AI, embedding, import, export, webhook follow-up, or statistics work inline.
- A worker job, outbox dispatcher, webhook processor, or retryable background step needs durable status, duplicate prevention, attempts, locking, retry time, and dead-letter behavior.
- A queue system, worker framework, or scheduler is introduced or replaced and the service needs job message shape, schema versioning, idempotency, retry, dead-letter, ordering, priority, observability, or manual replay to remain product-owned rather than queue-product-owned.
- HTTP, queue, cron, CLI, or worker entrypoints should run the same state-changing intent.
- An existing handler, job, service, or controller mixes intent parsing, authorization, domain decisions, persistence, side effects, event publishing, and error mapping.
- A command bus may be justified because many commands repeat the same tracing, logging, idempotency, or middleware concerns.

<!-- mustflow-section: do-not-use-when -->
## Do Not Use When

- The operation is a read-only query, list, search, lookup, or report.
- The code is a pure calculation, formatter, parser, mapper, validator, state-transition function, or local UI state change.
- The work is trivial pass-through create, update, or delete behavior with no meaningful authorization, audit, idempotency, transaction, event, retry, or business branching pressure.
- The only problem is expected failure or absence shape; use `result-option`.
- The only problem is business logic mixed with I/O; use `pure-core-imperative-shell` first and let this skill shape the shell execution unit when state changes need command semantics.
- The only problem is provider, SDK, database, file, webhook, queue, cache, or framework object leakage; use `adapter-boundary` and `dependency-injection`.
- The only problem is that several already-owned subsystem steps need one stable caller-facing entry point; use `facade-pattern` unless the operation also needs command payload, context, idempotency, audit, retry, transaction, outbox, or queue semantics.
- The work spans multiple durable steps, checkpoints, process loss, callbacks, or compensation; use `durable-workflow-orchestration`. The command may accept or start that workflow, but does not redefine its lifecycle.
- The main contract is truthful run, attempt, checkpoint, or effect evidence across executions; use `execution-ledger-integrity-review`.
- The main contract derives allow, deny, limit, downgrade, or obligation decisions; use `policy-decision-integrity-review`. The command consumes the decision.

<!-- mustflow-section: required-inputs -->
## Required Inputs

- The user or system intent and the command name that would describe it with an imperative verb and target noun.
- The source boundary: HTTP, queue, cron, CLI, worker, test, webhook, or internal system action.
- The command payload, actor, tenant, request identifier, correlation identifier, causation identifier, source, and current time.
- Trace or observability identifiers when relevant: trace id, span id, request id, command id, job run id, webhook event id, cron run id, user or anonymous id, tenant or organization id, and which identifiers are safe to log or propagate.
- The durable resources loaded or changed by the command.
- Authorization policy, domain rules, lifecycle state transitions, transaction needs, outbox or event needs, audit requirements, idempotency needs, retry policy, and concurrency risks.
- Core state that must be committed before response, auxiliary work that can run after commit, acceptable delay or loss for each follow-up, and the dependency failure policy.
- Provider intent and recovery policy, including the internal operation id, provider operation, safe payload hash, provider id when known, idempotency key, unknown-result handling, retry budget, reconciliation rule, manual replay rule, and whether a provider swap is an immediate fallback or a later migration path.
- Work-acceptance response policy, such as immediate success, queued status, processing status, or accepted response; job status vocabulary; deduplication key; attempt limit; next-run time; lock expiry; dead-letter handling; and worker ownership.
- Queue contract details when work crosses a queue: queue name, business urgency, job id, job type, schema version, created time, run-after time, attempt count, idempotency key, request or trace context, safe payload reference, retry categories, timeout, dead-letter target, ordering requirement, and manual replay rule.
- AI work accounting when relevant: feature key, model key, usage ledger entry, user request id, provider call id, pricing snapshot, cache-hit type, retry grouping, cost limit, and whether failed or unknown calls require reconciliation before retry.
- AI policy decision when relevant: the already-derived allow, deny, limit, downgrade, or obligation result that the command consumes without redefining policy.
- Cost-bearing work accounting when relevant: value unit, cost unit, workspace or account quota, shared tenant credit pool, free-plan limit, user-action fan-out, usage event, rollup target, and whether retries or duplicate jobs can double-count cost.
- Idempotency layers for request acceptance, job execution, provider calls, and incoming webhooks, including scope, request hash, duplicate result behavior, and different-payload conflict behavior.
- Existing local conventions for result types, option types, domain errors, repositories, gateways, unit of work, outbox, audit logs, command buses, and tests.
- Relevant command-intent contract entries for verification.

<!-- mustflow-section: preconditions -->
## Preconditions

- Higher-priority instructions and `.mustflow/config/commands.toml` have been checked for the current scope.
- The operation is a state-changing or side-effecting intent, not a read-only query.
- If the command changes existing behavior, current behavior is protected with tests, fixtures, examples, or explicit verification evidence.
- If expected failures, meaningful absence, null returns, or thrown business errors are involved, `result-option` has been applied to the return contract.
- If business decisions are mixed with shell work, `pure-core-imperative-shell` has been applied so the command handler orchestrates and delegates instead of owning all domain policy.
- If the command changes lifecycle state, status, phase, step, or stage and allowed actions depend on current state, `state-machine-pattern` has been applied so the handler dispatches explicit events instead of assigning state directly.
- If the command must choose among interchangeable algorithms, policies, provider choices, pricing rules, or feature-flag variants, `strategy-pattern` has been applied so the handler selects and calls a policy instead of owning variant branches.
- If the command handler would otherwise contain a repeated multi-step subsystem workflow, `facade-pattern` has been considered for a lower-level entry point that keeps the handler focused on command semantics.
- If external services or provider data cross the boundary, `adapter-boundary` and `dependency-injection` have been applied for gateways, ports, and construction.
- Actor, role, tenant, and current time come from trusted server-side context, not raw client payload.

<!-- mustflow-section: allowed-edits -->
## Allowed Edits

- Add or update command payload types, command envelopes, command context types, command result types, command error types, and handler interfaces.
- Add one handler per command when command structure is warranted.
- Add idempotency stores, outbox records, audit records, unit-of-work calls, retry classification, and concurrency guards when the operation requires them.
- Add a command bus only when repeated command concerns justify it.
- Add controller, worker, queue, or cron adapters that construct commands and contexts, then map `Result` values to caller responses.
- Add tests for command success, expected failures, idempotency, transactions, outbox records, dependency failures, retryability, and concurrency behavior.
- Do not turn pure reads, pure calculations, or tiny helper functions into commands.
- Do not add a global command bus, broad service locator, or base command class before repeated local pressure exists.

<!-- mustflow-section: procedure -->
## Procedure

1. Classify the operation.
   - Use a command when durable state changes, external side effects, audit evidence, authorization, retry, idempotency, transaction boundaries, or cross-entrypoint execution matter.
   - Keep read-only operations as queries or lookup functions.
   - Keep pure calculations, formatting, parsing, mapping, and validation as functions or pure core decisions.
2. Name the command precisely.
   - Prefer imperative verb plus target noun, such as `CreateProjectCommand`, `ApproveInvoiceCommand`, `CancelSubscriptionCommand`, `CapturePaymentCommand`, or `RefundOrderCommand`.
   - Avoid vague names such as `ProjectService`, `UserManager`, `InvoiceProcessor`, `DataHandler`, `DoSomethingCommand`, `UpdateCommand`, and `CommonCommand`.
   - Split commands when one name hides multiple user intents, multiple transaction boundaries, multiple authorization policies, or multiple audit facts.
3. Model command data separately from execution.
   - Prefer command data plus handler separation.
   - Command payloads must be serializable data.
   - Do not put request objects, response objects, ORM entities, database connections, file streams, SDK clients, functions, class instances, or loggers in the payload.
   - Use an envelope when the command may be queued, retried, audited, or stored: command type, schema version, command identifier, optional idempotency key, and payload.
   - Use a job envelope when work is queued or scheduled: job id, job type, schema version, idempotency key, created time, run-after time, attempt, trace or request context, and a safe payload or payload reference.
4. Model execution context separately from payload.
   - Context should carry trusted actor, request identifier, correlation identifier, optional causation identifier, current time or time context, source, and tenant or account scope.
   - When observability continuity matters, context should also carry or create safe trace, command, job run, webhook, or cron identifiers. Use internal ids or hashes for user and tenant context when those identifiers can leave the protected boundary.
   - Do not trust client-supplied actor identifiers, roles, or tenant identifiers without server-side authentication and membership checks.
   - Inject time through context. Do not read current time inside the handler except at the outer boundary that builds the context.
5. Define the handler contract.
   - A handler receives command data and command context.
   - A handler returns `Promise<Result<TResult, CommandError>>` or the local equivalent.
   - Success results should contain only the minimum caller-needed facts, such as created identifier, affected resource identifier, status, and version.
   - Do not return `void`, `any`, raw ORM entities, full database rows, raw provider responses, or framework response objects.
6. Keep dependencies explicit.
   - Inject repositories, policies, gateways, unit of work, outbox, idempotency store, audit writer, logger, clock, identifier generator, or command bus through constructors or function parameters.
   - Do not construct SDK clients, database clients, email senders, payment clients, or global containers inside handlers.
   - Handler dependencies should express roles, not providers, unless the handler itself is inside an infrastructure adapter.
7. Keep the handler an orchestrator.
   - The handler may validate application-level preconditions, load resources, check authorization, call domain decisions, manage transactions, persist state, record outbox events, record audits, classify failures, and return results.
   - The handler should not become the only place where domain invariants, pricing, eligibility, permission rules, or state-transition rules live.
   - Move domain rules into domain objects, pure decision functions, policy objects, or state-transition modules.
   - Use `state-machine-pattern` when the command changes lifecycle state through status, phase, stage, step, or allowed-action transitions.
   - Use `strategy-pattern` when the command selects among interchangeable algorithms, policies, pricing rules, provider choices, or feature-flag variants that share one purpose.
   - Use `facade-pattern` below the handler only when a complex subsystem workflow should be hidden behind one stable operation; avoid chaining command handlers through multiple facades.
8. Follow the command lifecycle.
   - Check command metadata and schema version.
   - Validate payload shape at the boundary and application-level constraints in the handler.
   - Start trace logging without sensitive data.
   - Check authorization before state change.
   - Check idempotency before harmful duplicate work.
   - Load required domain objects.
   - Run domain decisions or invariants.
   - Start the transaction only around local state changes.
   - Save state and outbox records in the same transaction.
   - Commit before publishing external messages or sending external effects.
   - Record audit evidence for security, payment, permission, and administrator commands.
   - Schedule follow-up work only after the command decision is persisted.
   - For payment, point, credit, inventory, entitlement, subscription, coupon, and refund commands, prefer append-only ledgers or action records as the evidence source. Treat summary balances or statuses as derived or transactionally updated read state.
   - For ordinary content, account, and workflow commands, persist the core state and outbox or job records before triggering analytics, email, search indexing, AI processing, statistics, cache purge, or feed refresh work.
   - For cost-bearing AI commands, persist accepted work and reservation consumption before a worker performs model calls. `credit-ledger-integrity-review` owns prepaid or money-equivalent reserve, capture, and release invariants; `llm-token-cost-control-review` owns token estimates and caps.
   - For agentic AI commands, consume and persist the policy decision and accepted-work limits before the first model call. Route policy derivation to `policy-decision-integrity-review` and multi-step resume or compensation to `durable-workflow-orchestration`.
   - A command may consume an existing reservation or quota allocation, but it must not redefine credit-ledger balance invariants. Keep accepted-work reservation persistence here and reserve, capture, and release accounting in `credit-ledger-integrity-review`.
   - When one command creates many internal jobs, record the causation relationship so thumbnails, OCR, AI calls, embeddings, search indexing, notifications, logs, analytics exports, and webhooks can be attributed to the original user action without losing retry or cost detail.
   - For HTTP acceptance of long-running work, persist the command result, job row, or outbox row in the same local transaction, then return the created resource identifier and current status. Do not make the HTTP request wait for the worker's external side effect unless the product contract truly requires immediate completion.
   - For external API work, persist the internal intent before the provider call becomes the only record. Payment, email, map, AI, search, file, and webhook follow-up commands should leave enough local evidence to answer what was attempted, why, for whom, and how to retry or reconcile it later.
9. Keep external effects out of local transactions.
   - Do not send email, webhooks, push notifications, SMS, files, AI requests, long network requests, payment captures, or refunds while holding a database transaction open.
   - Use outbox records, pending-effect records, job records, or a later worker command when local state and external work must both be reliable.
   - For payment or other harmful repeated effects, store a pending state or action ledger, pass idempotency keys to the provider when supported, and confirm the result through a follow-up command or workflow step.
   - For workflows such as "payment approved then grant credits", persist the attempt, provider reference, ledger entry, balance/status update, and outbox event inside the local transaction after the provider result is known; send receipts, notifications, and analytics through outbox or worker steps after commit.
   - Do not let optional analytics, email, AI, search, statistics, cache, or recommendation dependencies decide whether the core command succeeded. Record retryable follow-up work or a degraded status instead.
   - Do not treat queue publication alone as proof that work exists. When possible, store the job or outbox record durably first so a dispatcher can recover after a process crash or queue-publish failure.
   - Prefer single-provider plus adapter, failure queue, replay, and reconciliation over premature multi-provider orchestration unless the product contract truly needs live failover. Multiple providers do not remove the need for local intent records, idempotency, and manual recovery.
10. Make idempotency explicit.
    - Require idempotency keys for payments, refunds, order creation, subscription starts, invite emails, password reset emails, file upload confirmation, external webhooks, point grants, coupon issuance, and administrator approvals.
    - Scope idempotency by actor, tenant, workspace, account, or other ownership boundary. Do not treat a raw idempotency key as globally safe.
    - Store a stable payload hash rather than raw sensitive payload.
    - Return the previous success result for the same scope, type, key, and payload hash.
    - Return an idempotency conflict for the same scope, type, and key with a different payload hash.
    - Distinguish in-progress, succeeded, final failure, and retryable failure records.
    - For retryable jobs, use durable deduplication keys and database uniqueness where possible. Assume queues and workers can deliver or run a job more than once.
    - For provider calls, store the provider, operation, local idempotency key, safe request hash, provider object identifier when known, outcome, and last safe error. Distinguish `failed` from `unknown`: `failed` means the provider is known not to have completed the effect; `unknown` means reconciliation is required before retrying.
    - For provider webhooks, store provider event ids or normalized event hashes so duplicate callbacks cannot double-charge, double-grant, double-refund, or repeat a state transition.
    - For provider replacement, keep idempotency and operation ids in product language first. Provider-specific payment ids, message ids, place ids, model call ids, and search task ids are mappings, not the command identity.
11. Record events safely.
    - Command names are imperative. Event names are past-tense facts.
    - Store domain events or outbox messages only after the state change decision succeeds.
    - Save state and outbox records in one transaction.
    - Publish events externally only after commit.
    - Keep event payloads minimal and omit passwords, tokens, raw payment details, secrets, and unnecessary personal data.
12. Classify errors and retries.
    - Return typed command errors for validation, authorization, not found, conflict, invariant, idempotency, dependency, and internal failures.
    - Do not throw for expected business failures.
    - Mark dependency failures as retryable or non-retryable.
   - Retry transient network, timeout, rate-limit, lock-contention, queue-delay, or temporary persistence failures only when duplicate execution is safe.
   - Do not retry invalid input, denied access, missing resource, domain-rule violation, idempotency conflict, or already-processed terminal states.
   - Give external dependencies explicit timeouts, retry budgets, backoff with jitter, and retryable error categories. Do not allow an auxiliary dependency to consume the whole user-request budget unless the command's core outcome depends on it.
   - Classify follow-up failures separately from command failures. A failed email, analytics event, search index update, cache purge, or AI summary usually means pending or degraded follow-up work, not a failed core state change.
   - Do not retry invalid input, denied authorization, permission rejection, malformed provider requests, or idempotency conflicts. Retry transient network failures, timeouts, rate limits, and temporary provider outages only when duplicate effects are prevented.
13. Protect concurrency.
    - Use unique constraints, optimistic locking, pessimistic locking, conditional updates, state-transition checks, idempotency keys, or compare-and-swap saves when simultaneous commands may affect the same resource.
    - If a version conflict occurs, reload and recompute, return a conflict, enqueue a retry, or apply a domain-specific merge only when that policy is explicit.
    - For slow worker or AI results, include the command version, target version, or expected state so stale results cannot overwrite newer state.
14. Add observability and audit evidence.
    - Logs should include command type, command identifier, schema version, actor identifier, tenant identifier, request identifier, correlation identifier, causation identifier, source, affected resource identifier, duration, outcome, error kind, and error code.
    - For commands that cross HTTP, queue, worker, cron, or webhook boundaries, keep the request id, trace id, causation id, command id, job run id, and webhook event id linked so a later backend change does not break incident reconstruction.
    - Logs and audits must not include passwords, tokens, cookies, raw card data, raw personal data, raw files, security answers, or raw sensitive provider responses.
    - Audit logs are required for permission changes, administrator invites, organization deletion, payment capture, refund, subscription cancellation, personal data export, account deletion, security setting changes, API key creation, and API key revocation.
15. Introduce a command bus only with evidence.
    - Consider a bus when there are many commands and tracing, logging, idempotency, middleware, queue and HTTP reuse, or error handling repeats.
    - The bus may locate handlers, apply middleware, add common tracing, and normalize outer errors.
    - The bus must not own domain rules, know every handler branch, centralize business logic, or force one transaction policy on all commands.
16. Split long-running work.
   - Do not make a user request wait for bulk email, bulk file processing, AI document analysis, large imports, or external synchronization.
   - Use a start command to create a job and return a queued status.
   - Use worker commands for processing steps and completion or failure transitions.
   - Keep worker commands idempotent, version-aware, and stale-result safe so a slow AI, import, search, or conversion result cannot overwrite newer user state.
   - Separate queues or worker pools when one class of work can starve another. Payment, webhook, email, AI, embedding, analytics, and dead-letter processing should not all compete for one unbounded worker path when delay or failure policy differs.
   - Name queues by business domain, urgency, and failure policy where useful, such as billing webhook critical, transactional email, marketing email, media conversion, search reindex, analytics rollup, and dead-letter review. Avoid a single vague default queue when unrelated work can block critical rights, payment, or security updates.
   - Put exhausted or poison jobs into a dead-letter or manual-review state with safe error metadata instead of retrying forever.
   - Treat a queued failure as hidden until metrics, alerts, or operator review make it visible. Track queue depth, job age, retry count, failure rate, dead-letter growth, provider rate-limit pressure, and manual replay results for important queues.
   - Define the smallest operator actions that make the command recoverable at 03:00: resend a specific email, reprocess a specific webhook, retry a specific AI job, rebuild a specific search index, reconcile a specific payment attempt, or temporarily disable one provider-backed feature.
   - When these steps must resume deterministically across process loss, callbacks, checkpoints, or compensation, hand the accepted command to `durable-workflow-orchestration`. When run, attempt, checkpoint, and effect receipts are the source of truth, use `execution-ledger-integrity-review`.
17. Test command behavior.
    - Cover success, required input absence, invalid input, unauthorized actor, missing resource, state conflict, domain invariant failure, duplicate retry with same payload, duplicate key with different payload, transaction rollback, outbox creation, dependency failure, retryability, non-retryability, and concurrency conflicts.
    - Use fake repositories and gateways for handler unit tests.
    - Use integration tests for real transaction behavior and adapter or contract tests for external APIs.
    - Fix time through command context and inject identifiers or make them predictable in tests.

<!-- mustflow-section: postconditions -->
## Postconditions

- The command represents one clear user or system intent.
- The payload is serializable and free of framework, ORM, SDK, connection, stream, and function objects.
- The handler has injected dependencies and handles one command.
- Authorization, idempotency, transaction boundaries, outbox behavior, retry classification, concurrency protection, observability, and audit requirements are explicit where relevant.
- Request, trace, command, job, cron, webhook, correlation, and causation identifiers are explicit where the command crosses asynchronous or external boundaries.
- HTTP acceptance and the local durable handoff are explicit; full multi-step resume, checkpoint, callback, and compensation semantics are owned by `durable-workflow-orchestration`.
- Credit, quota, tenant-limit, usage-event, fan-out attribution, and retry-cost behavior are explicit when one command consumes high-cost resources or creates multiple internal jobs.
- Expected command failures are returned as typed values.
- External effects do not run inside local database transactions.
- Auxiliary work that can lag, retry, degrade, or be lost is separated from the core command outcome instead of blocking the user request.
- The final response reports any command bus, outbox, idempotency, audit, or retry behavior that was intentionally skipped because the operation did not need it.

<!-- mustflow-section: verification -->
## Verification

Use configured oneshot command intents when available:

- `changes_status`
- `changes_diff_summary`
- `test_related`
- `test`
- `lint`
- `build`
- `docs_validate_fast`
- `test_release`
- `mustflow_check`

Choose the narrowest configured verification that proves the changed command path. Use release or documentation checks when command structure is installed by templates, changes public docs, changes schemas, changes CLI behavior, or changes package metadata.

<!-- mustflow-section: failure-handling -->
## Failure Handling

- If the operation is actually a query or pure function, stop using this skill and keep the simpler structure.
- If one command hides multiple intents, split it before adding idempotency, audit, or transaction machinery.
- If payload or context would need raw framework, ORM, SDK, stream, connection, or function objects, move that data conversion to a boundary adapter first.
- If idempotency cannot be defined for a harmful repeated side effect, do not call the command safely retryable.
- If an external effect must happen with a state change but no outbox, pending action, provider idempotency, or compensation path exists, report the reliability gap.
- If tests cannot cover transaction or concurrency behavior at the handler level, add focused integration coverage or report the remaining risk.

<!-- mustflow-section: output-format -->
## Output Format

- Command intent and name
- Payload and context shape
- Handler dependencies and responsibilities
- Domain decisions delegated out of the handler
- State-machine transitions used or intentionally avoided
- Strategy family used or intentionally avoided
- Facade workflow used or intentionally avoided
- Transaction, outbox, idempotency, retry, concurrency, audit, and observability choices
- Job, worker, queue, deduplication, dead-letter, and provider reconciliation choices when relevant
- AI or other high-cost usage ledger, pricing snapshot, cache-hit, credit, quota, tenant-limit, fan-out, retry-cost, provider-call, and limit-enforcement choices when relevant
- AI policy decision, preflight budget, agent-step, tool-call, token, cost, timeout, fallback, and emergency-stop choices when relevant
- Core versus auxiliary work split, including delayed, degraded, or lossy follow-up behavior when relevant
- Command bus used or intentionally avoided
- Tests or verification evidence
- Skipped checks and remaining command safety risk
