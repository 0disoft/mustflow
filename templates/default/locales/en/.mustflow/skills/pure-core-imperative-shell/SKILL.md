---
mustflow_doc: skill.pure-core-imperative-shell
locale: en
canonical: true
revision: 8
lifecycle: mustflow-owned
authority: procedure
name: pure-core-imperative-shell
description: Apply this skill when business decisions, validation, authorization, pricing, discounts, credits, permissions, eligibility, state transitions, domain events, effect descriptions, or calculations are mixed with I/O such as databases, ORM entities, HTTP handlers, repositories, SDK calls, files, queues, logs, metrics, clocks, randomness, environment reads, payments, emails, or framework objects; also apply when legacy effects must be characterized and extracted safely, a formerly pure module may gain new capabilities, or effect plans, import boundaries, snapshot/version commits, shadow comparison, and purity evidence need explicit contracts.
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
- ORM models, entity hooks, lifecycle hooks, decorators, lazy-loaded relations, or active-record methods contain pricing, permissions, discounts, credits, entitlement, subscription, point, or state-transition decisions.
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
- Effect dictionary and graph when available: direct and transitive database, network, filesystem,
  process, queue, cache, clock, randomness, environment, global-state, framework, telemetry, ORM hook,
  decorator, listener, lazy-load, and constructor effects with entrypoints and call paths.
- Legacy effect transcript when behavior already runs: input, observed external facts, decision, effect
  targets, order, count, transaction and retry context, final result, and known bug-versus-contract
  classification.
- Irreversible and ambiguity cut points: commit, replace, publish, charge, send, expose, acknowledge,
  timeout-after-send, crash-before-receipt, and cancellation-versus-completion boundaries.
- Current and proposed core capability surface: imports, constructor dependencies, arguments, callbacks,
  globals, generated code, runtime plugins, and allowed effect set.
- Snapshot and commit evidence: state version, policy/config version, observed time, expected version,
  uniqueness or idempotency identity, and stale-decision retry policy.
- ORM-specific behavior involved in the current decision, such as relation includes, lazy loading, model methods, hooks, transactions, repository calls, and generated database row types.
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
- Add bounded effect declarations, import or dependency rules, effect-graph comparisons, environment
  isolation, input freezing, runtime effect counters, characterization transcripts, shadow-plan
  comparisons, and failpoint fixtures when the repository has an owning convention or configured tool.
- Treat any new effect reachable from a previously pure function as an architecture-contract change,
  not a small implementation detail. Require an explicit owner, effect scope, failure policy, and test.
- Do not add broad service classes, global containers, event buses, or abstractions just to make the tree look layered.
- Do not create permanent effect manifests or CI gates solely for ceremony. Persist them only when a
  repository convention can keep paths, symbols, exceptions, and generated evidence synchronized.

<!-- mustflow-section: procedure -->
## Procedure

1. Locate the mixed responsibility.
   - Decision signals: `if`, `switch`, status checks, role checks, amount calculations, eligibility checks, validation rules, state transitions, deadline rules, quota rules, and domain error choices.
   - Execution signals: `await`, database access, ORM relation access, active-record model methods, ORM hooks, external SDK calls, HTTP clients, file access, logging, metrics, email sending, message publishing, cache access, `new Date()`, `Date.now()`, generated identifiers, randomness, and environment reads.
   - Trace effects in execution order from each entrypoint, including wrappers, callbacks, hooks,
     decorators, lazy relations, constructors, plugins, telemetry, and transitive helpers. Mark the
     irreversible or outcome-ambiguous point before deciding a file or class boundary.
   - For legacy behavior, capture `input -> observed external facts -> decision -> effects -> effect
     order and count -> final result`. Normalize time, generated IDs, and nondeterministic fields, and
     classify known defects separately from behavior that must remain compatible.
2. Name the pure decision.
   - Prefer verbs such as `decide`, `calculate`, `derive`, `validate`, `transition`, `classify`, `price`, `score`, `select`, `can`, `is`, or `has`.
   - Avoid naming the core after a route, ORM model, SDK method, provider, or transport operation.
3. Define explicit core input.
   - Include every fact the decision needs: actor, domain state, loaded external facts, policy mode, current timestamp, business date, time zone, generated identifiers, random value, feature-flag result, and idempotency-relevant facts.
   - Do not let the core reach outward to obtain missing facts.
   - Pass immutable observed values, not capability bags. A repository, client, service, container,
     logger, clock function, random generator, framework context, lazy entity, callback, or closure can
     smuggle effects through an apparently explicit parameter.
   - Separate value context such as locale, time zone, policy version, observed timestamp, actor facts,
     and feature decisions from shell-only runtime capabilities such as database, network, logging,
     cancellation, tracing, or secrets.
4. Define typed output.
   - Use local `Result` or equivalent for expected business outcomes.
   - Use local `Option` or equivalent when absence is meaningful and not an error.
   - Return typed business errors for normal failures such as not found, denied access, invalid state, expired input, insufficient balance, quota exceeded, duplicate command, and stale business rule conditions.
   - Throw only for programmer errors or impossible internal invariant violations.
5. Keep the core deterministic.
   - The core must not perform I/O, log, read time, generate identifiers, use direct randomness, read environment variables, mutate external state, or depend on request, response, ORM, SDK, database-row, or framework objects.
   - Time should enter as epoch milliseconds, business date, ISO string, or explicit time context.
   - Money should use integer minor units, explicit currency, and explicit rounding or tax policy.
   - Enforce dependency direction so core packages cannot import ORM, HTTP, filesystem, queue,
     environment, logger, telemetry, clock, random, framework, or concrete adapter packages. A mocked
     repository injected into the core is still an effectful core.
   - Treat mutable inputs, module globals, singletons, hidden memoization, locale, current directory,
     process settings, and runtime initialization as possible effects, not merely network and disk I/O.
6. Return state changes, events, and effects as data.
   - Domain events describe what happened.
   - Effect descriptions describe what the shell should do.
   - The core may create those values, but it must not persist, publish, send, charge, upload, delete, log, or schedule them.
   - Effect plans must be closed, immutable, and serializable data. Do not put callbacks, closures,
     repositories, SQL, SDK requests, framework objects, or executable commands inside the plan.
   - Record business meaning, prerequisite state/version, ordering or independence, idempotency identity,
     stop conditions, and required evidence. Storage syntax and provider translation belong to the shell.
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
   - Centralize plan execution in one owner or a small set of capability-specific executors. The shell
     owns transaction scope, expected-version commit, timeout, retry budget, cancellation, idempotency,
     outbox/inbox, receipts, reconciliation, and effect observability; controllers must not each
     reinterpret the same plan independently.
8. Split validation and authorization.
   - Structural validation belongs in the shell: JSON shape, route parameter shape, required fields, upload size, unsupported content type, and transport limits.
   - Business validation belongs in the core: eligibility, status, deadline, quota, refundability, inventory, coupon applicability, and domain invariants.
   - Authentication belongs in the shell. Business authorization belongs in the core.
9. Keep persistence honest.
   - Map database rows to domain input before calling core.
   - Map decisions to persistence commands after core returns.
   - Database constraints can protect integrity, but they must not be the only place where business policy exists.
   - Use optimistic locking, version checks, unique constraints, and transactions in the shell when stale decisions or duplicates are possible.
   - Use `read versioned snapshot -> decide next state and effect plan -> conditional commit against
     expected version`. On conflict, reload and recompute instead of committing a clean decision made
     from stale facts.
   - Record the policy/config version and observed time that shaped a durable decision when later
     replay, audit, or mixed-version execution could otherwise reinterpret it.
   - Keep ORM syntax, eager-loading choices, lazy-loading behavior, model hooks, decorators, and generated entity types out of business rules. Treat the ORM as a persistence tool, not the owner of domain policy.
   - Do not hide notifications, payments, credit grants, permission changes, audit writes, or other business effects in ORM create, update, or delete hooks.
   - For complex reads, allow a query service, projection, or explicit SQL-style read model instead of forcing all screens through the write-domain model.
10. Keep external side effects outside local transactions.
    - Do not hold a database transaction open while calling slow network services.
    - When local state and external messages must both be reliable, save state and outbox messages in one transaction, then publish after commit.
   - For payments, refunds, account closure, file deletion, and other harmful repeated effects, combine deterministic core decisions with shell-side idempotency or an action ledger.
   - Persist intent and stable operation identity before an external mutation, call the provider
     outside the database transaction, then persist the provider receipt or `outcome_unknown` state.
     Reconciliation, not blind replay, closes timeout-after-send ambiguity.
   - Treat a write receipt as the effect boundary: operation ID, expected and committed version,
     provider or message ID, affected count, and result state should prove what actually happened.
11. Use state machines for lifecycle transitions when needed.
    - If status, state, phase, step, or stage controls allowed actions, use `state-machine-pattern` to define the transition table, event names, guards, terminal states, effect descriptions, invalid transitions, and tests.
    - Keep the transition function pure and let the shell persist state, transition history, idempotency records, and outbox rows.
12. Use strategies for interchangeable pure policies when needed.
   - If pricing, discount, scoring, ranking, matching, permission, recommendation, or provider-choice logic has several methods with one shared purpose, use `strategy-pattern`.
   - Keep strategy selection in a selector, resolver, or shell boundary and keep strategy execution behind a shared pure contract when possible.
   - Return explainable policy results for pricing, discounts, credits, entitlements, and permissions, such as original amount, applied rules, rejected rules, final amount, tax, rounding, and reason codes, so UI, receipts, refunds, support, and analytics do not recalculate the rule independently.
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
   - Run core tests with external capabilities absent or denied when the host and repository can
     provide that environment: no credentials, network, database, writable filesystem, ambient home,
     environment lookup, real clock, random source, or telemetry. A pure test should not need mocks.
   - Deep-freeze or otherwise protect inputs and compare globals, registries, caches, and singleton
     state before and after. Include mutable containers such as maps, sets, dates, and nested objects.
   - Repeat the same input while varying time zone, locale, environment, current directory, network,
     database, filesystem, clock, and random state. Output, typed failure, and input state must remain
     identical unless the changed fact is an explicit input.
   - At the shell layer, compare the complete effect transcript, including unexpected effects,
     targets, order when meaningful, counts, transaction scope, authorization position, retries, and
     negative assertions such as no write after denial or no publish after cancellation.
   - Inject failure immediately before, during, and after each irreversible effect, before and after
     receipt persistence, and at cancellation-versus-completion races. Re-run, overlap, crash, and
     resume with the same operation identity and assert bounded effect counts and final state.
16. Avoid ceremony when there is no real decision.
   - Do not invent a pure core for simple create, list, update, delete flows that only pass validated fields through.
   - Extract a core as soon as the flow gains meaningful business branching.
17. Guard the effect boundary during review and CI when the repository owns such checks.
   - Compare effect graphs before and after the change: effect kind, target, reachable entrypoints,
     call count, order, transaction scope, retry owner, authority position, retention, and downstream
     consumers. Moving code to another file does not remove a transitive effect.
   - Fail a pure-area change when it gains effectful imports, capability arguments, callbacks,
     mutable globals, direct clock/random/environment access, async initialization, concrete adapters,
     or a new path to a registered effect sink without an approved boundary change.
   - Combine static import/AST/call-graph checks with runtime file, socket, DNS, database, process,
     queue, and telemetry counters when configured. Either alone can miss dynamic behavior.
   - Effect allowlists and exceptions need owner, reason, scope, compensating tests, and expiry or review
     condition. Do not reduce this to a checkbox or trust an agent claim of `effects: []`.
18. Migrate legacy decisions by shadowing plans, not effects.
   - Keep the old path as the only effect executor while the new core receives the same normalized
     snapshot and computes a plan. Compare legacy effect transcript with the new plan without running
     payments, writes, publishes, emails, or other effects twice.
   - Record the input snapshot, normalized legacy transcript, proposed plan, rule difference, and
     known-bug classification. Move one decision at a time, then canary the new executor behind a
     reversible switch only after plan differences are understood.

<!-- mustflow-section: postconditions -->
## Postconditions

- Given the same input, the core returns the same output.
- The core can run without a database, network, file system, queue, cache, server, framework, logger, clock, environment variables, random generator, or generated identifier service.
- The core receives immutable values rather than effect capabilities, callbacks, lazy entities,
  service containers, or executable plans, and its effect plan is closed serializable business data.
- Core import and reachable-effect graphs remain empty or match an explicitly reviewed pure capability
  policy; runtime effect counters and environment perturbation expose hidden dependencies when configured.
- Business rules are visible in core functions, not hidden inside handlers, repositories, adapters, or database queries.
- Business rules are not hidden inside ORM models, relation loading, lifecycle hooks, decorators, or generated entity methods.
- The shell owns all I/O, boundary mapping, persistence, transactions, retries, idempotency, logs, metrics, and side-effect execution.
- Snapshot versions, conditional commits, operation identities, receipts, outbox/inbox records,
  unknown outcomes, retry ownership, and reconciliation remain shell responsibilities.
- Legacy extraction preserves a classified effect transcript, and shadow validation compares plans
  without executing the new side effects twice.
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
- Legacy effect transcript, irreversible cut points, and known bug-versus-contract classification
- Side-effect dictionary and before/after effect graph
- Side effects moved or kept in shell, their single execution owner, and allowed effect contract
- Core input facts and typed outputs introduced
- Value context versus runtime capability boundary
- Serializable events or effect plans introduced, with prerequisites, ordering, identity, and evidence
- State-machine transition table introduced or reused
- Strategy family introduced or reused
- Facade boundary introduced or intentionally avoided
- Shell responsibilities and boundary mappers
- Snapshot/version commit, transaction, retry, timeout, idempotency, receipt, outbox, and reconciliation ownership
- Business failures represented as values
- Sealed-environment, input/global mutation, environment-perturbation, effect-transcript, negative-effect,
  failpoint, repeated/concurrent/resume, static graph, and runtime counter evidence where available
- Shadow-plan comparison and canary or rollback status for legacy migration
- Skipped checks and remaining mixed-logic risk
