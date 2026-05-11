---
mustflow_doc: skill.pure-core-imperative-shell
locale: zh
canonical: false
revision: 6
lifecycle: mustflow-owned
authority: procedure
name: pure-core-imperative-shell
description: Apply this skill when business decisions, validation, authorization, pricing, eligibility, state transitions, domain events, effect descriptions, or calculations are mixed with I/O such as databases, HTTP handlers, repositories, SDK calls, files, queues, logs, metrics, clocks, randomness, environment reads, payments, emails, or framework request/response objects.
metadata:
  mustflow_schema: "1"
  mustflow_kind: procedure
  pack_id: mustflow.core
  skill_id: mustflow.core.pure-core-imperative-shell
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

# Pure Core, Imperative Shell

<!-- mustflow-section: purpose -->
## Purpose

Separate code that decides from code that does.

The pure core owns business rules, calculations, validation, authorization decisions, pricing, eligibility, state transitions, domain events, effect descriptions, and deterministic reducers. The imperative shell owns databases, HTTP, files, network calls, logging, metrics, payments, emails, queues, caches, clocks, generated identifiers, randomness, environment variables, transactions, retries, idempotency, and framework-specific objects.

Core decides. Shell does.

<!-- mustflow-section: use-when -->
## Use When

- Business rules are mixed with database access, HTTP handlers, repositories, external SDK calls, framework objects, logs, metrics, clocks, randomness, generated identifiers, environment reads, payments, emails, files, queues, or caches.
- Code contains meaningful `if`, `switch`, pricing, permission, eligibility, expiration, quota, scoring, matching, validation, or state-transition logic and also performs side effects.
- Several pricing, discount, permission, scoring, matching, recommendation, or provider-choice policies need to remain pure while being selected at runtime.
- Core tests require database mocks, HTTP mocks, SDK mocks, clock mocks, logger mocks, or framework request objects.
- A handler, repository, adapter, worker, or event consumer hides business policy.
- A state change must produce domain events or effect descriptions without executing those effects immediately.
- Retrying, idempotency, stale writes, or outbox behavior depends on distinguishing the decision from its execution.
- A state-changing shell action needs command semantics for payload, context, authorization, transaction boundaries, idempotency, audit logs, retries, concurrency, outbox records, queue reuse, or worker execution.
- A domain lifecycle uses status, state, phase, step, or stage values and state transitions need to be pure, explicit, and table-driven.
- A shell repeatedly coordinates several ports, adapters, repositories, queues, caches, or effect executors and needs a stable caller-facing entry point without absorbing the pure decision.

<!-- mustflow-section: do-not-use-when -->
## Do Not Use When

- The change is trivial pass-through CRUD with no meaningful decision beyond raw input shape checks.
- The only issue is direct construction or hidden dependency lookup; use `dependency-injection` first.
- The only issue is external format, protocol, provider error, timeout, retry, security, or observability translation; use `adapter-boundary` first.
- The task is pure refactoring with behavior preservation risks but no decision/execution split; use `behavior-preserving-refactor`.
- The decision boundary is already clear and the requested edit only updates a single pure calculation.

<!-- mustflow-section: required-inputs -->
## Required Inputs

- The business action, command, workflow, or state change being implemented or refactored.
- The decision the domain must make and the facts needed to make it.
- The current side effects, including persistence, external calls, messages, logs, metrics, generated identifiers, time, randomness, and environment reads.
- Local patterns for result types, domain errors, events, effects, outbox messages, repositories, adapters, mappers, and tests.
- Existing behavior evidence when refactoring code that already runs.
- Relevant command-intent contract entries for verification.

<!-- mustflow-section: preconditions -->
## Preconditions

- Higher-priority instructions and `.mustflow/config/commands.toml` have been checked for the current scope.
- If changing existing behavior is not the goal, `behavior-preserving-refactor` has been used to protect the current behavior first.
- If external systems cross the boundary, `adapter-boundary` has been used for provider containment.
- If the code constructs, resolves, or imports external tools inside core logic, `dependency-injection` has been used for construction and collaborator flow.
- If normal failures, meaningful absence, null returns, thrown business failures, or error response shapes are part of the decision boundary, `result-option` has been used for the return-shape contract.
- If the shell action is a state-changing user or system intent with transaction, idempotency, audit, retry, outbox, queue, worker, or external side-effect concerns, `command-pattern` has been used to shape the execution unit.
- If the core decision changes lifecycle state and allowed events depend on current state, `state-machine-pattern` has been used to define the transition table, guards, effects, and invalid-transition errors.
- If the pure decision has several interchangeable algorithms or policies for the same purpose, `strategy-pattern` has been used to separate selection from execution.
- If the shell needs one stable high-level entry point over a repeated multi-step subsystem workflow, `facade-pattern` has been used so callers stay simple while business decisions remain in the core.
- The target business decision can be described without naming a database table, HTTP route, framework object, or provider SDK.

<!-- mustflow-section: allowed-edits -->
## Allowed Edits

- Extract deterministic decision functions, policy functions, state-transition functions, or reducers.
- Define explicit input facts, decision output, domain events, effect descriptions, and typed business errors.
- Move database access, network access, logging, metrics, clocks, generated identifiers, randomness, environment reads, transactions, retries, and idempotency handling into the shell.
- Add boundary mappers between external data and core input, and between core output and persistence, messages, or responses.
- Add fast core tests without mocks and narrower shell tests for mapping, persistence, effects, idempotency, and error translation.
- Do not add broad service classes, global containers, event buses, or abstractions just to make the tree look layered.

<!-- mustflow-section: procedure -->
## Procedure

1. Locate the mixed responsibility.
   - Decision signals: `if`, `switch`, status checks, role checks, amount calculations, eligibility checks, validation rules, state transitions, deadline rules, quota rules, and domain error choices.
   - Execution signals: `await`, database access, external SDK calls, HTTP clients, file access, logging, metrics, email sending, message publishing, cache access, `new Date()`, `Date.now()`, generated identifiers, randomness, and environment reads.
2. Name the pure decision.
   - Prefer verbs such as `decide`, `calculate`, `derive`, `validate`, `transition`, `classify`, `price`, `score`, `select`, `can`, `is`, or `has`.
   - Avoid naming the core after a route, ORM model, SDK method, provider, or transport operation.
3. Define explicit core input.
   - Include every fact the decision needs: actor, domain state, loaded external facts, policy mode, current timestamp, business date, time zone, generated identifiers, random value, feature-flag result, and idempotency-relevant facts.
   - Do not let the core reach outward to obtain missing facts.
4. Define typed output.
   - Use local `Result` or equivalent for expected business outcomes.
   - Use local `Option` or equivalent when absence is meaningful and not an error.
   - Return typed business errors for normal failures such as not found, denied access, invalid state, expired input, insufficient balance, quota exceeded, duplicate command, and stale business rule conditions.
   - Throw only for programmer errors or impossible internal invariant violations.
5. Keep the core deterministic.
   - The core must not perform I/O, log, read time, generate identifiers, use direct randomness, read environment variables, mutate external state, or depend on request, response, ORM, SDK, database-row, or framework objects.
   - Time should enter as epoch milliseconds, business date, ISO string, or explicit time context.
   - Money should use integer minor units, explicit currency, and explicit rounding or tax policy.
6. Return state changes, events, and effects as data.
   - Domain events describe what happened.
   - Effect descriptions describe what the shell should do.
   - The core may create those values, but it must not persist, publish, send, charge, upload, delete, log, or schedule them.
7. Shape the imperative shell.
   - Parse raw input.
   - Authenticate the actor.
   - Load required facts.
   - Resolve time, identifiers, config, feature flags, randomness, and idempotency records.
   - Map external data to core input.
   - Call the pure core at the decision point.
   - Map core errors to transport or caller errors.
   - Persist state changes and outbox records.
   - Execute or enqueue effect descriptions.
   - Record logs, metrics, retries, and idempotency outcomes.
8. Split validation and authorization.
   - Structural validation belongs in the shell: JSON shape, route parameter shape, required fields, upload size, unsupported content type, and transport limits.
   - Business validation belongs in the core: eligibility, status, deadline, quota, refundability, inventory, coupon applicability, and domain invariants.
   - Authentication belongs in the shell. Business authorization belongs in the core.
9. Keep persistence honest.
   - Map database rows to domain input before calling core.
   - Map decisions to persistence commands after core returns.
   - Database constraints can protect integrity, but they must not be the only place where business policy exists.
   - Use optimistic locking, version checks, unique constraints, and transactions in the shell when stale decisions or duplicates are possible.
10. Keep external side effects outside local transactions.
    - Do not hold a database transaction open while calling slow network services.
    - When local state and external messages must both be reliable, save state and outbox messages in one transaction, then publish after commit.
    - For payments, refunds, account closure, file deletion, and other harmful repeated effects, combine deterministic core decisions with shell-side idempotency or an action ledger.
11. Use state machines for lifecycle transitions when needed.
    - If status, state, phase, step, or stage controls allowed actions, use `state-machine-pattern` to define the transition table, event names, guards, terminal states, effect descriptions, invalid transitions, and tests.
    - Keep the transition function pure and let the shell persist state, transition history, idempotency records, and outbox rows.
12. Use strategies for interchangeable pure policies when needed.
    - If pricing, discount, scoring, ranking, matching, permission, recommendation, or provider-choice logic has several methods with one shared purpose, use `strategy-pattern`.
    - Keep strategy selection in a selector, resolver, or shell boundary and keep strategy execution behind a shared pure contract when possible.
13. Use command structure for state-changing shell units when needed.
    - If one user or system intent needs explicit payload, context, authorization, transaction, idempotency, outbox, audit, retry, concurrency, or queue and worker reuse, use `command-pattern` to shape the shell execution unit.
    - Keep the pure core as the decision maker and the command handler as the orchestrator.
14. Use facades for repeated subsystem workflows when needed.
    - If callers need one stable high-level operation over several shell collaborators, use `facade-pattern`.
    - Keep the facade as an orchestration boundary; it may call the pure core, adapters, repositories, outbox, and idempotency stores, but it must not become the place where domain policy lives.
15. Test at the right layer.
    - Core tests should be fast, deterministic, table-driven when useful, and free of mocks, databases, networks, queues, caches, servers, and framework runtime.
    - Shell tests should verify input mapping, error mapping, persistence, transactions, effect execution or enqueueing, retries, idempotency, observability, and provider boundary behavior.
    - Use property-based tests for pricing, discounts, rounding, ranking, state transitions, allocation, quota, and scoring when combinations are large.
15. Avoid ceremony when there is no real decision.
    - Do not invent a pure core for simple create, list, update, delete flows that only pass validated fields through.
    - Extract a core as soon as the flow gains meaningful business branching.

<!-- mustflow-section: postconditions -->
## Postconditions

- Given the same input, the core returns the same output.
- The core can run without a database, network, file system, queue, cache, server, framework, logger, clock, environment variables, random generator, or generated identifier service.
- Business rules are visible in core functions, not hidden inside handlers, repositories, adapters, or database queries.
- The shell owns all I/O, boundary mapping, persistence, transactions, retries, idempotency, logs, metrics, and side-effect execution.
- Business rule tests do not require mocks.

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

Prefer focused core tests for decision behavior and focused shell tests for boundary behavior. Use release or documentation checks when the change affects templates, package metadata, public docs, schemas, CLI behavior, or skill routing.

<!-- mustflow-section: failure-handling -->
## Failure Handling

- If required facts cannot be loaded or represented explicitly, stop and report the missing boundary.
- If expected behavior is unknown, add characterization coverage or report the verification gap before extracting broad structure.
- If extraction changes behavior, separate the behavior fix from the pure-core refactor.
- If the shell still contains business branches after extraction, continue until only orchestration and transport checks remain or report the remaining policy explicitly.
- If the core still imports infrastructure, reapply `dependency-injection` and `adapter-boundary`.

<!-- mustflow-section: output-format -->
## Output Format

- Decision being isolated
- Side effects moved or kept in shell
- Core input facts and typed outputs introduced
- Events or effect descriptions introduced
- State-machine transition table introduced or reused
- Strategy family introduced or reused
- Facade boundary introduced or intentionally avoided
- Shell responsibilities and boundary mappers
- Business failures represented as values
- Tests or verification evidence
- Skipped checks and remaining mixed-logic risk
