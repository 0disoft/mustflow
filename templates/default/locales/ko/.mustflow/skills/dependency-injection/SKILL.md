---
mustflow_doc: skill.dependency-injection
locale: ko
canonical: false
revision: 3
lifecycle: mustflow-owned
authority: procedure
name: dependency-injection
description: Apply this skill when core or application logic creates, imports, resolves, or hides external dependencies such as databases, APIs, SDKs, filesystems, clocks, random generators, identifiers, loggers, configuration, framework request objects, AI clients, queues, or payment/email providers.
metadata:
  mustflow_schema: "1"
  mustflow_kind: procedure
  pack_id: mustflow.core
  skill_id: mustflow.core.dependency-injection
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

# Dependency Injection

<!-- mustflow-section: purpose -->
## Purpose

Keep business logic from creating, finding, or importing the tools it needs. External-world objects belong at assembly boundaries; core logic receives narrow ports, explicit values, or request context from the outside.

Dependency injection is not an abstraction quota. Use it to keep replaceable infrastructure, hidden global state, and side effects from leaking into domain and use-case code.

<!-- mustflow-section: use-when -->
## Use When

- Core, domain, application, service, or use-case code directly constructs a database client, external SDK, queue, file storage, logger, clock, random generator, identifier generator, AI model client, email sender, payment gateway, HTTP client, or framework object.
- Code reads `process.env`, current time, random values, UUIDs, files, local storage, global containers, or global loggers away from the assembly boundary.
- A refactor aims to make behavior easier to test without real databases, network calls, API keys, filesystem writes, current time, or random identifiers.
- New ports, adapters, provider modules, transaction runners, or composition roots are being introduced.
- A function's signature hides required collaborators or accepts broad technical objects instead of the narrow capability it actually needs.
- An optional collaborator should be wired as a real implementation or a safe null, no-op, disabled, identity, empty, deny-all, or failing implementation at the assembly boundary.

<!-- mustflow-section: do-not-use-when -->
## Do Not Use When

- The code is a pure function, value object, entity constructor, small data formatter, or internal helper with no external dependency.
- The task is a disposable one-off script that is not imported, tested, repeated, used in production, or connected to external services.
- A framework's dependency injection mechanism is already confined to the application boundary and does not leak into domain code.
- The only change needed is to confirm a package or tool exists; use `dependency-reality-check`.

<!-- mustflow-section: required-inputs -->
## Required Inputs

- The target code area and the direct dependency, global state, or hidden collaborator being introduced or removed.
- The intended business capability and which layer owns the rule: domain, application, infrastructure, adapter, route, worker, or assembly root.
- Existing local patterns for ports, adapters, fakes, transaction runners, clocks, configuration loading, and test setup.
- Current changed files and command-intent contract entries relevant to tests, builds, docs, release metadata, and mustflow validation.

<!-- mustflow-section: preconditions -->
## Preconditions

- The task matches the Use When conditions and does not match the Do Not Use When exclusions.
- Higher-priority instructions and `.mustflow/config/commands.toml` have been checked for the current scope.
- If the local structure is unfamiliar, use `pattern-scout` or `codebase-orientation` before introducing new folders or naming conventions.

<!-- mustflow-section: allowed-edits -->
## Allowed Edits

- Define narrow consumer-owned ports where core logic needs external behavior.
- Move concrete client creation, environment reads, lifecycle setup, and disposal to assembly boundaries.
- Add infrastructure adapters that implement the ports and translate external rows, responses, errors, and identifiers into internal types.
- Add local fakes, fixed clocks, fixed identifiers, and contract tests when needed to preserve behavior.
- Wire optional collaborators with `null-object-pattern` when absence is explicit, safe, and should not leak nullable checks into business logic.
- Do not add a service locator, global container access, broad application dependency bag, framework decorator in domain code, or speculative interface for every class.
- When the dependency also crosses an external protocol, provider, database, webhook, queue, file, cache, AI model, or framework boundary, use `adapter-boundary` for the translation and failure-handling rules.

<!-- mustflow-section: procedure -->
## Procedure

1. Classify the code under change:
   - Core logic: domain rules, use cases, state transitions, policy checks, calculations, and business decisions.
   - Edge logic: routes, controllers, workers, command handlers, adapters, repositories, SDK wrappers, and assembly roots.
2. Find direct external dependencies before editing. Look for concrete SDK construction, database clients, HTTP clients, file APIs, environment reads, current-time calls, random or UUID generation, global loggers, global containers, framework request or response objects, and external error types.
3. Decide whether dependency injection is warranted. Inject only collaborators that cross a boundary, are hard to test, may change implementation, or represent hidden global state. Do not wrap pure helpers, value objects, or stable internal data structures just to add ceremony.
4. Define ports from the consumer's need, not from the provider's API.
   - Prefer `PaymentGateway`, `UserRepository`, `EmailSender`, `ImageStorage`, or `TextGenerator`.
   - Avoid provider-shaped ports such as `StripeService`, `PrismaUserStore`, `ResendMailer`, `S3ImageStorage`, or `OpenAITextGenerator` at the core boundary.
5. Choose the injection style:
   - Use constructor injection or a dependency object for classes with stable collaborators.
   - Use function-closure injection for small use cases or function-oriented modules.
   - Use method parameters for per-call data such as actor, tenant, locale, request id, pagination, filters, or command input.
   - Use factories only when runtime values decide the implementation, lifecycle, or resource handle.
6. Keep construction at the assembly boundary. Create concrete clients, load and validate configuration, register containers, open connections, and wire adapters in files such as bootstrap, server setup, worker setup, route setup, module registration, or test setup.
   - If a dependency is optional and disabled by explicit configuration, choose the real collaborator or the safe neutral implementation here, not inside business logic.
   - If a dependency is required, validate configuration here and fail early instead of injecting a null object.
7. Treat time, random values, identifiers, configuration, logging, transactions, and framework objects as dependencies.
   - For domain decisions, prefer an already captured instant or time context over passing a clock that can be queried inside the domain.
   - Pass fixed implementations in tests so time, identifiers, and random choices are reproducible.
8. Keep adapters responsible for translation. Repositories and provider adapters should convert database rows, external responses, external errors, and provider identifiers before returning to core logic.
9. If the injected collaborator is an external boundary, apply `adapter-boundary` before finalizing the port and adapter. Dependency injection decides how core logic receives the collaborator; adapter boundaries decide how external protocols, data, errors, timeouts, retries, idempotency, security, and observability are translated.
10. Keep transaction ownership explicit. Inject a transaction runner when a use case needs atomic persistence across multiple repositories. Do not hide transaction boundaries inside repositories when the use case owns the unit of work, and do not call external APIs inside a database transaction.
11. Reject hidden dependency patterns:
    - no property injection for required collaborators
    - no service locator or `container.resolve` in core logic
    - no process-wide mutable singleton holding request state
    - no broad `AppDeps` object when a use case needs only a few collaborators
    - no circular service dependencies unless a smaller use case, shared policy, or event boundary has been considered first
12. Keep tests honest. Unit tests for core logic should use fakes or fixed collaborators and should not require a real database, real network, real API key, real email, real payment, real filesystem side effect, current time, or random UUID. Test real adapters separately with integration or contract coverage.
13. Verify with the narrowest configured command intents that cover the changed code, tests, template files, docs, and release metadata.

<!-- mustflow-section: postconditions -->
## Postconditions

- Core logic declares its collaborators through constructor parameters, function parameters, or narrow context objects.
- Concrete external implementation creation is easy to find at assembly boundaries.
- Core logic does not import provider SDKs, database clients, framework request or response objects, global containers, or external provider error types.
- Tests can replace external collaborators, time, identifiers, and random values without live infrastructure.
- Adapter boundaries translate external data and failures before they reach core logic.

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

Prefer the narrowest configured test or build intent that proves the affected boundary. Use documentation and release checks when templates, skill routes, public docs, package metadata, or installed-file surfaces change.

<!-- mustflow-section: failure-handling -->
## Failure Handling

- If extracting a port would duplicate an existing local interface, reuse or narrow the existing local pattern instead of creating a parallel abstraction.
- If a class needs many collaborators, stop before adding a giant dependency object and look for mixed responsibilities, smaller use cases, or adapter boundaries.
- If a framework forces decorators or container registration, keep that integration in the application boundary and do not let it shape domain types.
- If a direct dependency cannot be removed in one safe step, first wrap it at the smallest local boundary and report the remaining leakage.
- If tests still need real infrastructure after the refactor, report which dependency is still not injectable and why.

<!-- mustflow-section: output-format -->
## Output Format

- Dependency boundary reviewed
- Direct external dependencies found
- Injection style selected
- Ports and adapters added or reused
- Assembly boundary used
- External data or error translation handled
- Tests, fakes, or fixed collaborators added or reused
- Command intents run
- Skipped checks and reasons
- Remaining dependency leakage or lifecycle risk
