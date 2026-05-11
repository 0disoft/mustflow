---
mustflow_doc: skill.strategy-pattern
locale: hi
canonical: false
revision: 3
lifecycle: mustflow-owned
authority: procedure
name: strategy-pattern
description: Apply this skill when code has multiple interchangeable algorithms, policies, calculations, provider choices, scoring methods, sorting methods, recommendation methods, pricing rules, discount rules, shipping methods, notification methods, permission policies, feature-flag variants, or repeated if/switch branches that choose how to do the same kind of work.
metadata:
  mustflow_schema: "1"
  mustflow_kind: procedure
  pack_id: mustflow.core
  skill_id: mustflow.core.strategy-pattern
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

# Strategy Pattern

<!-- mustflow-section: purpose -->
## Purpose

Separate changeable algorithms, policies, calculations, and execution methods from the stable workflow that uses them.

The strategy pattern applies when several implementations serve the same purpose but differ in how they calculate, decide, rank, price, discount, ship, pay, notify, authorize, search, recommend, or call a provider. The caller should depend on a shared strategy contract, not on concrete implementation branches.

Use this skill to reduce repeated `if` and `switch` branches, keep policy changes out of core flow code, add new variants with minimal existing-code edits, and test each policy independently.

<!-- mustflow-section: use-when -->
## Use When

- Several implementations do the same kind of work, such as pricing, discounts, shipping fees, payment handling, permission checks, ranking, search, recommendation, notification, file conversion, retry policy, or provider selection.
- Branches differ by method, plan, region, country, user tier, feature flag, experiment group, input type, provider, format, or business policy.
- `if`, `else if`, `switch`, `case`, or dictionary dispatch repeatedly chooses the variant and then runs variant-specific logic inline.
- Adding a new variant requires modifying a central service, handler, controller, command handler, or pure decision function.
- Variant selection and variant execution are mixed in one function.
- Variant-specific tests would be clearer than testing one large branching function.
- A feature would otherwise introduce subclasses, template methods, or base classes just to reuse or swap behavior.
- Runtime configuration or feature flags choose between old and new algorithms.
- One variant is an honest no-op, disabled, identity, empty, or zero policy that shares the same contract as real variants.

<!-- mustflow-section: do-not-use-when -->
## Do Not Use When

- There is only one implementation or two stable branches with little chance of growth.
- Branches perform different user intents or different use cases rather than different methods for the same purpose.
- Lifecycle state and allowed transitions are the main concern; use `state-machine-pattern`.
- Object construction is the only thing that varies; use a factory or local construction helper instead.
- External provider shape, protocol, SDK response, timeout, retry, or error translation is the main concern; use `adapter-boundary`.
- A state-changing operation needs payload, actor context, transaction, idempotency, audit, retry, and outbox semantics; use `command-pattern`.
- A caller needs one stable high-level operation that coordinates several dependencies or subsystem steps; use `facade-pattern` and keep strategies only for interchangeable policies inside that workflow.
- A pure business decision is mixed with I/O; use `pure-core-imperative-shell` first.
- The strategy variants would combine many independent dimensions into an exploding list of classes; split the dimensions into smaller policies instead.

<!-- mustflow-section: required-inputs -->
## Required Inputs

- The stable workflow that needs variable behavior.
- The variants and the shared purpose they serve.
- Current branch locations, strategy-like implementations, and selection logic.
- Common input facts each variant needs.
- Common output shape and expected failure model.
- Selection criteria, such as validated user option, server-side policy, config value, feature flag, region, plan, or provider capability.
- Local patterns for functions, policy objects, registries, dependency injection, decorators, `Result`, tests, and observability.
- Relevant command-intent contract entries for verification.

<!-- mustflow-section: preconditions -->
## Preconditions

- Higher-priority instructions and `.mustflow/config/commands.toml` have been checked for the current scope.
- The variants have one shared purpose. If they do not, split the workflow into separate use cases instead of forcing a strategy abstraction.
- If preserving existing behavior, use `behavior-preserving-refactor` before moving branch bodies.
- If the strategy depends on external systems, use `adapter-boundary` and `dependency-injection` so provider details stay outside the strategy contract.
- If normal business failures or unsupported variants are expected, use `result-option` for explicit return and error shapes.
- If one strategy represents intentional absence or disabled behavior, use `null-object-pattern` to verify that the neutral behavior does not fake success or hide a required failure.
- If a strategy affects lifecycle transitions, use `state-machine-pattern` for the transition table and use strategies only for replaceable calculations or policies inside that lifecycle.
- If the strategy is only one part of a larger multi-step subsystem workflow, use `facade-pattern` for the caller-facing workflow and keep the strategy behind its contract.

<!-- mustflow-section: allowed-edits -->
## Allowed Edits

- Add or update strategy function types, interfaces, policy objects, concrete strategies, selectors, resolvers, registries, decorators, and focused tests.
- Move inline variant logic from handlers, services, command handlers, or core decision functions into named strategies.
- Keep simple strategies as functions when they are pure calculations.
- Use classes only when dependencies, framework injection, complex helpers, or test doubles justify them.
- Add observability around selected strategy keys when it helps operations and does not leak sensitive data.
- Do not create broad `Manager`, `Processor`, `Handler`, `Advanced`, `Special`, or `New` strategy names.
- Do not add strategy ceremony for trivial stable branches.

<!-- mustflow-section: procedure -->
## Procedure

1. Classify the branch.
   - Use strategy when branches choose how to do the same work.
   - Do not use strategy when branches choose different user intents, object creation only, external shape translation, lifecycle transitions, or command execution units.
2. Name the strategy family by business purpose.
   - Prefer names such as `ShippingFeeStrategy`, `DiscountPolicy`, `PaymentCaptureStrategy`, `RecommendationRankingStrategy`, or `PermissionPolicy`.
   - Avoid vague names such as `Strategy1`, `NewStrategy`, `AdvancedStrategy`, `SpecialStrategy`, `Handler`, `Processor`, and `Manager`.
3. Define one shared contract.
   - Fix the input type, output type, and expected error shape.
   - Keep the input object narrow enough to describe the strategy family, not the entire application context.
   - Every strategy in the family must accept the same input shape and return the same output shape.
4. Prefer function strategies for simple pure policies.
   - Use a function type when the policy is stateless, deterministic, and has no external dependency.
   - Use a class or object when the strategy needs injected collaborators, configuration, complex helpers, lifecycle management, or framework container integration.
5. Separate selection from execution.
   - A selector or resolver chooses the strategy key or strategy implementation.
   - The strategy executes the variant-specific behavior.
   - The context or service owns the workflow and calls the selected strategy through the shared contract.
   - Conditions do not need to disappear; they should move to selection and stop containing variant execution details.
6. Keep the context ignorant of concrete strategies.
   - The context may depend on a selector, resolver, registry, or one injected strategy contract.
   - It should not instantiate concrete strategies or branch on concrete strategy names.
7. Keep strategy registration discoverable.
   - Register strategy implementations in one searchable registry, module, dependency-injection assembly, or configuration binding.
   - Adding a strategy should usually require only a new implementation, registration, and tests, plus a typed key update when the key set is closed.
8. Treat unknown strategy keys explicitly.
   - Do not silently fall back when a provided key is invalid.
   - Distinguish missing optional input that should use an explicit default from unsupported input that should return an error.
   - Validate user-provided keys before resolving a strategy.
   - Keep explicit default strategies separate from invalid-key fallback. A no-op or disabled strategy is valid only when it is selected by an explicit rule.
9. Do not let user input directly select privileged behavior.
   - A request may contain a desired option, but server-side validation and business rules must decide the final strategy.
   - This matters for pricing, discounts, payment methods, authorization, shipping, quotas, experiments, and provider selection.
10. Keep strategies stateless per request.
    - Store dependencies, immutable configuration, and static lookup data on strategy instances.
    - Do not store current user, current order, request body, transaction state, intermediate result, or other request-specific data in strategy fields.
    - Pass request-specific facts through the input object.
11. Split validation correctly.
    - Common validation belongs before selection or before strategy execution.
    - Variant-specific validation belongs inside the strategy.
    - Expected business failures should return typed `Result` values or local equivalents, not raw strings or normal-flow exceptions.
    - A no-op, disabled, identity, empty, or zero strategy must return an honest neutral result and must not pretend that a side effect, payment, permission grant, save, upload, or audit record happened.
12. Avoid strategy combination explosion.
    - If strategy names grow by combining region, plan, item type, speed, provider, and user tier, split those dimensions into smaller policies and compose them.
    - Use a composite strategy only when each sub-policy has one clear responsibility.
13. Keep configuration in the right role.
    - Configuration may choose a strategy key or enable a feature-flag variant.
    - Do not hide complex business rules as untyped string expressions in config files.
    - Feature flags should usually be read by the selector or shell, not inside individual strategies.
    - Remove obsolete experiment strategies after the experiment ends.
14. Add observability at the context or decorator boundary when useful.
    - Record selected strategy key, safe selection reason, duration, outcome, and error code.
    - Do not log secrets, raw personal data, payment payloads, tokens, or sensitive provider responses.
    - Prefer decorators for repeated logging, timing, retry, caching, or metrics behavior across strategies.
15. Test the layers separately.
    - Strategy contract tests verify every strategy returns the expected shape.
    - Strategy-specific tests verify each policy's unique behavior.
    - Selector tests verify which strategy is chosen for each selection condition.
    - Context tests use fake strategies and verify orchestration, not policy internals.
16. Refactor incrementally.
    - Extract one strategy family at a time.
    - Move existing branch bodies into strategies without changing behavior unless the task explicitly asks for a behavior fix.
    - Remove dead branches and direct concrete strategy knowledge from the context after tests pass.

<!-- mustflow-section: postconditions -->
## Postconditions

- Strategy variants have one shared purpose and one shared contract.
- The stable context no longer contains variant-specific execution branches.
- Strategy selection is centralized in a selector, resolver, registry, or assembly boundary.
- Unknown or unauthorized strategy choices fail explicitly.
- User input is validated before it affects strategy choice.
- Strategies do not store request-specific mutable state.
- New variants can be added with minimal changes to existing workflow code.
- Tests cover strategy behavior, selection behavior, and context orchestration at the right layers.

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

Choose the narrowest configured verification that covers changed strategy code, selectors, registries, tests, templates, docs, release metadata, and mustflow routing.

<!-- mustflow-section: failure-handling -->
## Failure Handling

- If variants do not share a purpose, stop and split the use cases instead of forcing a strategy interface.
- If input or output cannot be made common without a giant dependency object, split the strategy family into smaller policies.
- If the context still knows concrete strategy names, move that knowledge into a selector, resolver, registry, or assembly root.
- If unknown keys silently default, replace the fallback with an explicit default case for missing input or an explicit error for unsupported input.
- If strategy count is growing by combinations, decompose independent dimensions before adding more classes.
- If a strategy needs I/O but the decision should be pure, move I/O to the shell or adapter and pass normalized facts into the strategy.

<!-- mustflow-section: output-format -->
## Output Format

- Strategy family and shared purpose
- Contract input, output, and failure shape
- Strategies added, reused, or deliberately avoided
- Selector, resolver, registry, or assembly location
- User-input validation and default behavior
- State, command, adapter, or pure-core boundaries used with this skill
- Facade boundary used or intentionally avoided
- Tests or verification evidence
- Skipped checks and remaining strategy risk
