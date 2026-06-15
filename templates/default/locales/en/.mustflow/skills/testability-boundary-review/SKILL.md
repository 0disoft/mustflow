---
mustflow_doc: skill.testability-boundary-review
locale: en
canonical: true
revision: 1
lifecycle: mustflow-owned
authority: procedure
name: testability-boundary-review
description: Apply this skill when code is created, changed, reviewed, or reported and testability needs review for hidden decision inputs, direct time or randomness, direct I/O, constructor side effects, static or singleton state, oversized private logic, branch policy sprawl, boolean mode flags, broad option objects, implicit environment or request context, void side effects, swallowed errors, log-only outcomes, cache order dependence, ORM lazy loading, transaction and external-call coupling, hidden event publication, fire-and-forget async work, real-time retry waits, nondeterministic collection order, hidden defaults, mixed validation and policy, scattered authorization, framework magic, smart controllers, conditional DTO mapping, mock-heavy classes, call-order assertions, inheritance coupling, or reflection-only tests.
metadata:
  mustflow_schema: "1"
  mustflow_kind: procedure
  pack_id: mustflow.core
  skill_id: mustflow.core.testability-boundary-review
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

# Testability Boundary Review

<!-- mustflow-section: purpose -->
## Purpose

Review whether code can be forced into the important conditions needed for deterministic tests.

The review question is not only "is the logic correct?" It is "can a test stop time, force failure,
replace the external world, fix random output, run the core decision without a database, and observe
the result without peeking through private seams?"

<!-- mustflow-section: use-when -->
## Use When

- Code review, implementation, or refactor work touches business decisions, validators, services,
  handlers, repositories, entities, jobs, workers, events, retries, caches, controllers, DTO mappers,
  framework hooks, constructors, global state, static helpers, or tests.
- A test would need real time, random values, UUIDs, database sessions, external APIs, files, queues,
  mail, logs, sleeps, framework containers, reflection, broad mocks, or internal call-order assertions.
- A class or function looks simple but hides decision inputs in environment variables, current user,
  locale, timezone, config files, global caches, default values, static singletons, or framework
  context.
- A review needs to decide whether to use `dependency-injection`, `pure-core-imperative-shell`,
  `state-machine-pattern`, `strategy-pattern`, `result-option`, `auth-permission-change`,
  `failure-integrity-review`, `cache-integrity-review`, or `test-design-guard`.

<!-- mustflow-section: do-not-use-when -->
## Do Not Use When

- The task is only designing test cases or classifying RED evidence; use `test-design-guard`.
- The task is only updating stale, duplicated, flaky, or obsolete tests; use `test-maintenance`.
- The only issue is hidden construction of a direct external dependency; use `dependency-injection`
  as the primary skill and this skill only for the broader testability review.
- The main work is separating deterministic business decisions from side effects; use
  `pure-core-imperative-shell` as the primary skill.
- The code is a trivial pure helper with explicit inputs, deterministic output, no hidden state, and
  no meaningful branch or side effect.

<!-- mustflow-section: required-inputs -->
## Required Inputs

- User goal, current diff or target files, and the behavior or decision that should be testable.
- Decision-input ledger: explicit parameters, hidden reads, time, randomness, identifiers, config,
  environment, locale, timezone, current actor, permissions, feature flags, cache, and defaults.
- Side-effect ledger: database, ORM lazy loading, network, filesystem, queue, mail, logs, metrics,
  events, transactions, retries, timers, background work, and external providers.
- Observability ledger: returned value, typed error, emitted event, state change, persisted record,
  outbox message, public response, log-only outcome, or private reflection-only state.
- Test friction evidence: mocks required, sleeps, framework container setup, reflection, call-order
  assertions, real infrastructure, test ordering dependence, shared state cleanup, and existing tests.
- Relevant command-intent contract entries for tests, lint, build, docs, release, and mustflow checks.

<!-- mustflow-section: preconditions -->
## Preconditions

- The task matches the Use When conditions and does not match the Do Not Use When exclusions.
- Higher-priority instructions and `.mustflow/config/commands.toml` have been checked for the
  current scope.
- Required inputs are available, or missing hidden-input, side-effect, observability, or test-friction
  evidence can be reported without guessing.
- If the review finds a concrete dependency, pure-core, failure, cache, concurrency, authorization,
  state-machine, strategy, or test-design issue, use the narrower skill before editing that part.

<!-- mustflow-section: allowed-edits -->
## Allowed Edits

- Make decision inputs explicit through parameters, narrow context values, fixed clocks, fixed
  identifier or random providers, policy objects, strategy objects, state tables, or small value
  objects.
- Move I/O, framework objects, caches, logs, metrics, event publication, timers, retries,
  transactions, and background execution into shell or adapter boundaries when directly tied to
  testability.
- Return observable results such as values, typed errors, state transitions, domain events, effect
  descriptions, outbox messages, or command results instead of requiring tests to inspect logs,
  private fields, or collaborator call order.
- Add or adjust focused tests only when they prove the reviewed testability boundary and follow
  `test-design-guard`.
- Do not add broad dependency bags, speculative abstractions, global test hooks, sleeps, reflection
  helpers, or mock-only tests just to make one test pass.

<!-- mustflow-section: procedure -->
## Procedure

1. Ask what the test must be able to control.
   - Name the conditions a test should force: current time, timezone, random value, UUID, external
     failure, retry timing, DB result, permission, locale, feature flag, cache state, event output,
     ordering, or provider response.
   - If those conditions cannot be controlled without real infrastructure or sleeps, testability is
     already leaking.
2. Find hidden decision inputs.
   - Flag direct `new Date()`, `Date.now()`, `LocalDateTime.now()`, `System.currentTimeMillis()`,
     `Math.random()`, UUID generation, environment reads, config reads, current-user lookups, locale,
     timezone, global cache reads, and framework request context inside business decisions.
   - Prefer passing captured values, a narrow time context, a fixed generator, or an explicit policy
     input from the boundary.
3. Split decision from contact with the outside world.
   - A function that decides and also queries a database, calls an API, reads a file, sends mail,
     writes a queue, or logs the only outcome forces unit tests into mini integration tests.
   - Use `pure-core-imperative-shell` when business decisions and side effects are mixed.
4. Inspect constructors.
   - Constructors should accept ingredients, not start cooking.
   - Treat constructors that connect to databases, read files, read environment, fill caches, spawn
     threads, start timers, or perform network setup as testability hazards.
5. Inspect static, singleton, and global state.
   - Shared mutable state makes test order part of behavior.
   - Look for global registries, mutable singletons, module-level caches, static config, process-wide
     current user, and global loggers that hold test-specific state.
6. Treat large private methods as trapped responsibility.
   - Do not test private methods through reflection.
   - If private logic has meaningful policy, calculation, parsing, validation, or branching, extract
     the responsibility behind a small public or module-local boundary with explicit inputs.
7. Count policy branches, not just branch count.
   - Nested `if`, `switch`, `when`, or pattern matching may mean different policies are welded into
     one function.
   - Use strategy, rule table, state machine, or named policy object when each branch represents a
     different reason to change or a different test matrix.
8. Replace boolean mode flags with named concepts.
   - Flag signatures like `process(user, true, false)`.
   - Two or more boolean inputs create hidden modes. Use named variants, explicit option types, or
     separate functions when modes have different behavior contracts.
9. Shrink trash-can option and context objects.
   - Broad `RequestOptions`, `Config`, `Context`, or dependency bags hide which fields affect the
     result.
   - Keep only the facts required for the decision, and give test fixtures small builders or explicit
     values instead of giant fake objects.
10. Make outputs observable.
    - Void functions that update DB rows, publish events, delete caches, send logs, and call providers
      force tests to spy on internals.
    - Prefer returning decision results, typed errors, domain events, effect descriptions, state
      changes, or command outcomes that shell code can execute.
11. Do not swallow failures into logs.
    - `catch { log.warn(...) }` with no returned failure makes tests assert log text instead of
      behavior.
    - Use `failure-integrity-review` or `result-option` when expected failures need to be visible as
      values or errors.
12. Keep cache outside the policy.
    - If first call and second call differ because a hidden cache changed, tests become order
      dependent.
    - Core decisions should return the same output for the same input whether cache is present or
      not; cache belongs in the shell or adapter.
13. Keep ORM behavior out of unit decisions.
    - Lazy loading, entity hooks, DB sessions, generated row types, and active-record saves can pull
      real persistence into tests.
    - Entities may own state and invariants, but query composition and external dependencies belong
      at repository or service boundaries.
14. Check transaction and external-call coupling.
    - External API calls inside DB transactions create test and production uncertainty.
    - Prefer local state plus outbox or effect descriptions, then execute external effects after
      commit with idempotency.
15. Make events visible at one boundary.
    - Hidden event publication in the middle of a function makes tests verify every side channel.
    - Prefer returning domain events or publishing once at a clear shell boundary.
16. Remove fire-and-forget timing from core logic.
    - `setTimeout`, background job launch, coroutine launch, thread start, unawaited promises, and
      detached tasks make tests sleep.
    - Inject a scheduler or executor, or return work descriptions so tests can run them
      synchronously.
17. Decouple retry, backoff, timeout, and expiration from real time.
    - Waiting 30 seconds to prove a retry is not a useful test.
    - Model retry policy as data or a deterministic calculator, and advance fake time in tests.
18. Stabilize collection ordering.
    - If order matters, code should sort with a named key.
    - If order does not matter, tests should assert as a set or multiset rather than relying on DB,
      map, set, or parallel iteration order.
19. Make defaults explicit.
    - Hidden defaults such as server timezone, default admin, default shipping, default permission,
      default locale, default currency, and default cache policy multiply test cases silently.
    - Put defaults at the boundary, name them, and test the fallback path deliberately.
20. Separate input shape validation from business judgment.
    - Email format, JSON shape, file size, or required field checks are not the same as eligibility,
      permission, balance, quota, status, or domain invariants.
    - Separate structural validation, authorization, and policy decisions so failure reasons can be
      tested directly.
21. Centralize authorization evidence.
    - Scattered controller, service, and repository permission checks create test holes.
    - Use `auth-permission-change` when protected actions need one policy source, denial cases, or
      consistent server/database enforcement.
22. Keep framework magic at the edge.
    - Annotations, decorators, AOP, interceptors, middleware, dependency containers, ORM hooks, and
      lifecycle callbacks should not be required to run core decision tests.
    - A useful testability check is whether the decision can run without the framework container.
23. Keep controllers as translators.
    - Controllers should parse requests, call an application boundary, and map results to responses.
    - If they own business decisions, permissions, error mapping, response formatting, and external
      calls, tests have to fake a web server to prove a rule.
24. Treat conditional DTO mapping as policy.
    - Mapping code that hides fields by status, role, flag, or permission is no longer simple
      mapping.
    - Move the policy to a named owner and keep DTO mapping mechanical where possible.
25. Use mocks as a design sensor.
    - If a unit test needs more than three mocks, inspect responsibility boundaries.
    - If it needs five or more mocks, the class is probably talking to too many collaborators.
    - Prefer fewer, narrower ports and pure decision tests over broad mock choreography.
26. Prefer outcome assertions over call-order assertions.
    - Some protocols require order tests. Most business logic should be tested by result, final
      state, emitted event, persisted command, or rejected effect.
    - Frequent `A before B` assertions usually mean the responsibility boundary is too procedural.
27. Prefer composition over deep inheritance for test setup.
    - Parent constructors, protected state, template methods, and partial overrides create hidden
      dependencies.
    - Use composition when tests need to swap behavior or observe a small collaborator.
28. Treat reflection-only tests as a design failure.
    - Tests that set private fields, call private methods, or mutate hidden state through reflection
      are using a back door.
    - Create a real boundary for the behavior or report that the current design cannot be tested
      naturally.
29. Pick the smallest response.
    - If one hidden input blocks testing, inject that one value instead of reshaping the whole module.
    - If several smells point to the same root, name the root boundary and fix there.
    - If changing structure is too risky now, report the exact condition that remains hard to force
      in tests.

<!-- mustflow-section: postconditions -->
## Postconditions

- Important test conditions can be forced without real time, real randomness, live infrastructure,
  sleeps, reflection, broad framework containers, or hidden global state.
- Decision inputs are explicit or the remaining hidden inputs are named.
- Core decision behavior has observable values, typed failures, events, effects, or state changes.
- External I/O, transactions, retries, caches, logging, metrics, scheduling, and framework magic are
  kept at boundary code or explicitly reported as remaining testability risk.
- Any new or changed tests assert observable behavior rather than only mock choreography.

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

Prefer focused tests that prove the newly controllable condition and observable outcome. Use
`test-design-guard` before adding or reshaping tests.

<!-- mustflow-section: failure-handling -->
## Failure Handling

- If the behavior cannot be tested without reflection, sleeps, broad mocks, or live infrastructure,
  report the exact hidden decision input or side effect instead of claiming the testability issue is
  solved.
- If extracting a boundary changes behavior, stop and use `behavior-preserving-refactor` or
  `repro-first-debug` before continuing.
- If tests still require the framework container, report which framework dependency remains inside
  the decision.
- If a command fails, use `failure-triage` before further edits.

<!-- mustflow-section: output-format -->
## Output Format

- Testability boundary reviewed
- Conditions tests must control
- Hidden decision inputs found
- Side effects and framework dependencies found
- Observability gaps found
- Mocks, sleeps, reflection, call-order, or global-state risks
- Fixes made or recommendation
- Tests or behavior evidence
- Command intents run
- Skipped checks and reasons
- Remaining testability risk
