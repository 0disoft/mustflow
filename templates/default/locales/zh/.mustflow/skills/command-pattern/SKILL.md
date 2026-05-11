---
mustflow_doc: skill.command-pattern
locale: zh
canonical: false
revision: 4
lifecycle: mustflow-owned
authority: procedure
name: command-pattern
description: Apply this skill when a state-changing user or system intent needs to become one traceable, retryable, idempotent, authorized, transactional, and testable execution unit.
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

Model a state-changing user or system intent as one clear execution unit.

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
- A user or system action calls an external service, sends a message, writes a file, sends email, charges payment, publishes a webhook, or schedules work.
- The operation needs authorization, audit logs, idempotency, retry classification, concurrency protection, an outbox, or a transaction boundary.
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

<!-- mustflow-section: required-inputs -->
## Required Inputs

- The user or system intent and the command name that would describe it with an imperative verb and target noun.
- The source boundary: HTTP, queue, cron, CLI, worker, test, webhook, or internal system action.
- The command payload, actor, tenant, request identifier, correlation identifier, causation identifier, source, and current time.
- The durable resources loaded or changed by the command.
- Authorization policy, domain rules, lifecycle state transitions, transaction needs, outbox or event needs, audit requirements, idempotency needs, retry policy, and concurrency risks.
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
4. Model execution context separately from payload.
   - Context should carry trusted actor, request identifier, correlation identifier, optional causation identifier, current time or time context, source, and tenant or account scope.
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
9. Keep external effects out of local transactions.
   - Do not send email, webhooks, push notifications, SMS, files, AI requests, long network requests, payment captures, or refunds while holding a database transaction open.
   - Use outbox records, pending-effect records, job records, or a later worker command when local state and external work must both be reliable.
   - For payment or other harmful repeated effects, store a pending state or action ledger, pass idempotency keys to the provider when supported, and confirm the result through a follow-up command or workflow step.
10. Make idempotency explicit.
    - Require idempotency keys for payments, refunds, order creation, subscription starts, invite emails, password reset emails, file upload confirmation, external webhooks, point grants, coupon issuance, and administrator approvals.
    - Scope idempotency by actor, tenant, workspace, account, or other ownership boundary. Do not treat a raw idempotency key as globally safe.
    - Store a stable payload hash rather than raw sensitive payload.
    - Return the previous success result for the same scope, type, key, and payload hash.
    - Return an idempotency conflict for the same scope, type, and key with a different payload hash.
    - Distinguish in-progress, succeeded, final failure, and retryable failure records.
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
13. Protect concurrency.
    - Use unique constraints, optimistic locking, pessimistic locking, conditional updates, state-transition checks, idempotency keys, or compare-and-swap saves when simultaneous commands may affect the same resource.
    - If a version conflict occurs, reload and recompute, return a conflict, enqueue a retry, or apply a domain-specific merge only when that policy is explicit.
14. Add observability and audit evidence.
    - Logs should include command type, command identifier, schema version, actor identifier, tenant identifier, request identifier, correlation identifier, causation identifier, source, affected resource identifier, duration, outcome, error kind, and error code.
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
- Expected command failures are returned as typed values.
- External effects do not run inside local database transactions.
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
- Command bus used or intentionally avoided
- Tests or verification evidence
- Skipped checks and remaining command safety risk
