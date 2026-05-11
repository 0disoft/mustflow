---
mustflow_doc: skill.facade-pattern
locale: es
canonical: false
revision: 1
lifecycle: mustflow-owned
authority: procedure
name: facade-pattern
description: Apply this skill when a controller, handler, command, service, or UI event needs a stable high-level entry point over a complex subsystem, repeated multi-step workflow, multiple dependencies, external services, repositories, queues, caches, file storage, transactions, idempotency, retries, logging, or normalized results, without turning that entry point into a god service or hiding domain rules.
metadata:
  mustflow_schema: "1"
  mustflow_kind: procedure
  pack_id: mustflow.core
  skill_id: mustflow.core.facade-pattern
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

# Facade Pattern

<!-- mustflow-section: purpose -->
## Purpose

Provide one simple, stable public entry point in front of a complex subsystem or repeated workflow.

A facade is not a convenient name for a large service class. It is a thin application-level coordinator that hides internal ordering, external provider details, retries, transactions, logging, idempotency, and result normalization from callers while keeping domain decisions visible in domain objects, pure functions, policies, strategies, commands, or state machines.

Use this skill to make callers say what they want done while the facade controls where the subsystem complexity lives.

<!-- mustflow-section: use-when -->
## Use When

- One user or system action requires three or more internal steps.
- One operation coordinates two or more dependencies such as repositories, gateways, storage, queues, caches, validators, scanners, compressors, event publishers, or external services.
- The same internal sequence is repeated across controllers, handlers, workers, UI event handlers, or services.
- Callers know too much about implementation order, provider SDKs, database records, file storage, cache keys, queues, or external response shapes.
- Failure handling, retry, timeout, logging, transactions, idempotency, cache invalidation, or event publishing differs between call sites for the same operation.
- A controller, route, job, command handler, or UI event handler directly performs subsystem orchestration instead of delegating to a stable entry point.
- The internal implementation is likely to change while the caller-facing operation should remain stable.

<!-- mustflow-section: do-not-use-when -->
## Do Not Use When

- The facade would only call one method with a different name.
- The caller is already simple and does not know internal subsystem details.
- The intent is to hide messy code without clarifying ownership, tests, or boundaries.
- Domain rules, pricing, permissions, eligibility, validation policy, or state transitions are the main problem; use `pure-core-imperative-shell`, `strategy-pattern`, or `state-machine-pattern` as appropriate.
- Several interchangeable algorithms or policies are the main problem; use `strategy-pattern`.
- A single external API or protocol needs translation into an internal shape; use `adapter-boundary`.
- One state-changing intent needs payload, context, transaction, idempotency, audit, retry, outbox, and traceability semantics; use `command-pattern`, and place a facade below it only when there is a real subsystem workflow to simplify.
- The proposed facade would become `AppFacade`, `SystemFacade`, `CommonService`, `Manager`, `Helper`, or another catch-all container.

<!-- mustflow-section: required-inputs -->
## Required Inputs

- The caller surface that should become simpler: controller, router, UI handler, command handler, worker, job, or service.
- The high-level operation name and the user or system purpose it represents.
- The current internal sequence, repeated call sites, or leaked subsystem details.
- Dependencies involved and whether each is a domain service, pure policy, repository port, gateway port, adapter, queue, cache, transaction manager, idempotency store, logger, or event publisher.
- Expected success response and expected failure cases.
- Authorization, idempotency, retry, transaction, observability, security, and performance requirements.
- Local conventions for request objects, context objects, `Result` values, ports, adapters, dependency injection, commands, events, and tests.
- Relevant command-intent contract entries for verification.

<!-- mustflow-section: preconditions -->
## Preconditions

- Higher-priority instructions and `.mustflow/config/commands.toml` have been checked for the current scope.
- The operation has enough real subsystem complexity to justify a facade.
- The facade boundary is a feature area or workflow boundary, not a whole application boundary.
- If preserving existing behavior, `behavior-preserving-refactor` has been applied before moving orchestration.
- If external systems cross the boundary, `adapter-boundary` and `dependency-injection` have been applied so the facade depends on internal ports rather than SDK clients.
- If expected failure or absence is part of the contract, `result-option` has been applied to the return shape.
- If the operation is a traceable state-changing intent, `command-pattern` has been considered so the facade does not replace command semantics.

<!-- mustflow-section: allowed-edits -->
## Allowed Edits

- Add or update a narrow facade in an application or feature boundary.
- Add request, response, context, and facade error types.
- Add or update ports, injected collaborators, mapper functions, error normalizers, idempotency handling, transaction orchestration, retry policy calls, event publishing, cache invalidation, and logging directly needed by the facade.
- Move repeated subsystem ordering out of controllers, handlers, workers, command handlers, or UI event handlers into the facade.
- Add tests with fake dependencies for success, validation, permission, dependency failure, error normalization, idempotency, event publishing, transaction behavior, and sensitive-log protection.
- Do not move domain rules into the facade just because the facade coordinates the operation.
- Do not expose private subsystem steps as public facade methods.

<!-- mustflow-section: procedure -->
## Procedure

1. Classify the need.
   - Use a facade when the caller needs one stable high-level operation but currently knows internal ordering or multiple subsystem details.
   - Do not use a facade for a one-line wrapper, a pure policy, a provider translation, a lifecycle transition table, or a command execution unit by itself.
2. Name the facade by feature area or workflow.
   - Prefer names such as `FileUploadFacade`, `CheckoutFacade`, `BillingFacade`, `ReportExportFacade`, or `SignupFacade`.
   - Avoid broad names such as `AppFacade`, `SystemFacade`, `CommonService`, `Manager`, `Helper`, and `Util`.
3. Name public methods by caller intent.
   - Use names such as `uploadImage`, `checkout`, `createInvoice`, `refundPayment`, `exportReport`, or `sendWelcomeNotification`.
   - Avoid public methods named after internal steps such as `compress`, `scan`, `saveMetadata`, `publishEvent`, or `invalidateCache`.
   - Keep public methods few. A facade with many public methods probably owns more than one workflow.
4. Define request and context shapes.
   - Accept one request object for operation data.
   - Accept a separate context object for actor, request identifier, correlation identifier, tenant or account scope, idempotency key, source, and trusted server-side execution facts.
   - Do not pass long primitive parameter lists, framework request objects, response objects, ORM entities, SDK clients, database connections, file streams, or loggers as request payload.
5. Define normalized response and failure shapes.
   - Return the minimum caller-needed success facts.
   - Return expected failures as `Result` values or the local equivalent.
   - Do not return provider SDK responses, ORM models, full database rows, internal domain entities, raw exception objects, secrets, internal file paths, or unnecessary metadata.
6. Keep dependencies explicit and replaceable.
   - Inject collaborators through constructors or function parameters.
   - Depend on role interfaces or ports, not concrete SDK clients or framework objects.
   - Wrap external SDKs in adapters before they reach the facade.
   - Avoid facade-to-facade dependency chains. If two facades need the same lower-level behavior, extract a shared lower-level service, port, or pure function.
7. Keep the facade stateless per request.
   - Store injected dependencies, immutable configuration, and read-only policy objects only.
   - Do not store current user, current request, current file, current transaction, intermediate result, last response, or mutable request-specific collections in facade fields.
8. Delegate domain decisions.
   - The facade may perform basic input checks, call validators, pass context, check permissions through a policy, coordinate dependencies, normalize errors, and return results.
   - It must not become the home for pricing formulas, eligibility rules, permission policy, lifecycle transitions, state mutation rules, or complex calculations.
   - Use pure core functions, policies, strategies, commands, or state machines for domain decisions and have the facade call them.
9. Control transactions carefully.
   - Use transactions for fast local persistence that must commit together.
   - Do not hold a database transaction open while calling slow external APIs, email, webhooks, file uploads, payment providers, AI calls, or other long network work.
   - When local state and external work must coordinate, use idempotency keys, pending states, action ledgers, outbox records, sagas, compensation commands, or worker jobs.
10. Make harmful duplicate execution safe.
    - Require idempotency for payments, refunds, order creation, account creation, file uploads, email sends, coupon use, point grants, external sync, and webhook handling.
    - Scope idempotency by actor, tenant, workspace, account, owner, or other trust boundary.
    - Store stable payload hashes rather than raw sensitive payloads.
    - Return existing results for the same key and same payload hash, and return conflicts for the same key with different payload.
11. Apply retry only when safe.
    - Retry transient network, timeout, rate-limit, provider outage, and read operations when the operation is safe or idempotent.
    - Do not retry invalid input, denied access, unsupported formats, domain-rule failures, terminal state transitions, or unsafe writes without idempotency.
    - Return retryability in failure results when callers or workers need it.
12. Add safe observability.
    - Log high-level operation start, success, failure, duration, request identifier, actor identifier, resource identifier, error code, retry count, and idempotency-key presence when useful.
    - Do not log passwords, tokens, cookies, API keys, raw card data, raw personal data, raw file content, full provider responses, full request bodies, or raw external exceptions.
    - Use consistent event names such as `<domain>.<operation>.started`, `<domain>.<operation>.succeeded`, and `<domain>.<operation>.failed`.
13. Keep performance visible.
    - If the operation is expensive or long-running, name it with words such as `request`, `schedule`, `enqueue`, or `start`, then return a job identifier or queued status.
    - Add timeouts to external calls.
    - Avoid hidden N+1 behavior behind a simple facade method.
    - Limit response data to what the caller needs.
14. Document the public facade contract when the method is new or changed.
    - Include purpose, input, output, failure codes, side effects, idempotency, transaction behavior, external dependencies, synchronous or asynchronous behavior, and security requirements.
    - Keep comments concise and attached to public API surfaces rather than private implementation details.
15. Test at the facade boundary.
    - Use fake repositories, gateways, storage, scanners, event publishers, idempotency stores, transaction runners, and loggers.
    - Cover success, validation failure, permission denial, missing resource, dependency failure, error normalization, event or outbox creation, idempotency hit, idempotency conflict, dangerous missing key, transaction rollback when relevant, and no sensitive logging.
    - Do not call real external APIs, real payments, real email, real large uploads, or private methods directly in facade unit tests.

<!-- mustflow-section: postconditions -->
## Postconditions

- Callers invoke a high-level operation and no longer know internal subsystem order.
- Public facade methods express caller intent, not internal steps.
- Request data and execution context are separated.
- Success responses and expected failures are normalized.
- External SDK types, provider errors, ORM models, framework objects, and internal paths do not cross the facade boundary.
- Dependencies are injected and test-replaceable.
- Domain decisions remain outside the facade.
- Transactions, idempotency, retry, logging, security, and performance behavior are explicit where the operation needs them.
- Tests cover the facade's observable result and side effects through fake dependencies.

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

Choose the narrowest configured verification that covers changed facade code, dependencies, tests, templates, docs, release metadata, and mustflow routing.

<!-- mustflow-section: failure-handling -->
## Failure Handling

- If the facade is a one-method pass-through wrapper, remove it or merge it back into the caller.
- If the facade grows into a god service, split it by workflow or feature area.
- If the facade hides domain rules, extract those rules into pure functions, policy objects, strategies, state machines, or domain services.
- If public methods expose internal steps, make them private or move them to lower-level collaborators.
- If provider objects or errors leak through the facade result, add adapters and error mappers.
- If the facade must call another facade, check for a lower-level shared dependency before accepting the coupling.
- If idempotency or retry cannot be made safe for a harmful side effect, fail closed and report the manual or workflow gap.

<!-- mustflow-section: output-format -->
## Output Format

- Facade need and selected workflow boundary
- Caller surface simplified
- Request, context, response, and failure shapes
- Dependencies injected and lower-level collaborators used
- Domain decisions delegated out of the facade
- Adapter, command, strategy, state-machine, or pure-core boundaries used with this skill
- Transaction, idempotency, retry, logging, security, and performance choices
- Tests or verification evidence
- Skipped checks and remaining facade risk
