---
mustflow_doc: skill.composition-over-inheritance
locale: ko
canonical: false
revision: 4
lifecycle: mustflow-owned
authority: procedure
name: composition-over-inheritance
description: Apply this skill when code introduces, extends, reviews, or refactors class inheritance, base classes, abstract classes, template methods, protected state, mixins, framework subclasses, or subtype hierarchies, especially when behavior reuse, feature variants, provider implementations, policies, strategies, adapters, or test seams could be expressed with composition instead.
metadata:
  mustflow_schema: "1"
  mustflow_kind: procedure
  pack_id: mustflow.core
  skill_id: mustflow.core.composition-over-inheritance
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

# Composition Over Inheritance

<!-- mustflow-section: purpose -->
## Purpose

Treat inheritance as an exception, not the default way to reuse implementation. Prefer explicit collaborators: small role objects, functions, policies, strategies, adapters, state machines, decorators, and injected dependencies.

The goal is to keep change dimensions separate, avoid fragile parent-child coupling, make tests easy to assemble, and prevent subclass counts from growing with every feature combination.

<!-- mustflow-section: use-when -->
## Use When

- New code introduces `extends`, `abstract class`, `Base*`, `Abstract*`, `Common*`, `Core*`, mixins, template methods, `protected` fields, or deep class hierarchies.
- Existing code is being refactored from inheritance, template methods, no-op overrides, or shared base classes.
- A feature has multiple change dimensions such as format, storage, notification, provider, environment, permission policy, pricing policy, state transition, or retry behavior.
- Framework code requires subclassing, but business logic should stay outside the framework subclass.
- Tests are hard to write because parent setup, `super()` order, protected state, or subclass-specific behavior is entangled.
- The design could use strategy objects, policy objects, adapters, decorators, state machines, discriminated unions, functions, or dependency injection instead of inheritance.
- State-specific subclasses are proposed or already exist to represent lifecycle behavior that could be expressed as an explicit transition table.

<!-- mustflow-section: do-not-use-when -->
## Do Not Use When

- The code has no inheritance, base-class, subtype, or behavior-combination decision.
- The inheritance is a shallow and conventional language or ecosystem type, such as `Error`, `Exception`, a required test framework base class, or a required framework lifecycle class.
- The task is only about external provider boundaries; use `adapter-boundary`.
- The task is only about hidden dependency construction or global lookup; use `dependency-injection`.
- The task is a pure data or function refactor where no type hierarchy or collaborator split is being considered.

<!-- mustflow-section: required-inputs -->
## Required Inputs

- The class or module under change and any existing inheritance chain, base class, template method, mixin, or protected state.
- The behavior that needs reuse and the change dimensions that may vary independently.
- Local patterns for functions, policies, strategies, adapters, state machines, decorators, dependency injection, and tests.
- Compatibility constraints: public API, framework inheritance requirements, migration wrappers, and existing tests.
- Relevant command-intent contract entries for tests, builds, docs, templates, release metadata, and mustflow validation.

<!-- mustflow-section: preconditions -->
## Preconditions

- Higher-priority instructions and `.mustflow/config/commands.toml` have been checked for the current scope.
- The intended behavior is understood well enough to avoid changing semantics while changing structure.
- If the existing area is unfamiliar, use `pattern-scout` or `codebase-orientation` before changing type boundaries.
- If the refactor must preserve behavior, use `behavior-preserving-refactor` together with this skill.
- If multiple algorithms, policies, scoring methods, pricing rules, provider choices, or feature variants share one purpose, use `strategy-pattern` before inventing subclasses.

<!-- mustflow-section: allowed-edits -->
## Allowed Edits

- Replace implementation inheritance with functions, role interfaces, policies, strategies, adapters, decorators, state machines, discriminated unions, or small orchestrating objects.
- Keep required framework subclasses thin and delegate business behavior to injected use cases or collaborators.
- Add temporary compatibility wrappers when needed for a safe migration away from existing subclasses.
- Add focused tests or fixtures that lock current behavior before changing inheritance structure.
- Do not create broad `Base`, `Abstract`, `Common`, `Core`, or `Manager` classes to share miscellaneous methods.

<!-- mustflow-section: procedure -->
## Procedure

1. Identify why inheritance is present or being proposed.
   - Allowed reasons: required framework base class, conventional error or exception type, required test framework base class, sealed or closed type hierarchy, or a true substitutable subtype relationship.
   - Suspicious reasons: sharing common methods, toggling optional behavior, swapping providers, reducing conditionals, hiding setup, reusing validation, or grouping unrelated helpers.
2. Apply the substitution check before keeping inheritance.
   - A child must be safe everywhere the parent is expected.
   - The child must not require stricter inputs, return weaker outputs, no-op parent behavior, throw for normal parent methods, or require callers to check `instanceof`, class name, kind, mode, or type before use.
3. Count independent change dimensions.
   - If format, storage, notification, provider, policy, environment, permission, state, retry, logging, caching, or transport can change independently, do not encode the combination as subclasses.
   - Split each meaningful dimension into a role object, function, strategy, policy, adapter, decorator, state machine, or data field.
4. Inspect the inheritance depth and coupling.
   - Application code should have inheritance depth 0 or 1.
   - Reject chains where behavior depends on `super()` order, parent constructor side effects, protected mutable state, or parent methods calling overridable child methods.
5. Replace shared implementation with simpler composition first.
   - Use pure functions for stateless calculations and formatting.
   - Use role objects for replaceable collaborators.
   - Use policy objects for business decisions.
   - Use strategy objects for algorithms, policies, scoring methods, provider choices, and feature variants. Use `strategy-pattern` before adding or refactoring a strategy family.
   - Use facade objects for stable high-level subsystem entry points that coordinate several collaborators. Use `facade-pattern` before adding or refactoring a facade.
   - Use adapters for external services and provider-specific data.
   - Use decorators for cross-cutting behavior such as logging, caching, retry, rate limiting, timing, and authorization.
   - Use state machines or transition tables when state controls allowed actions. Use `state-machine-pattern` before editing lifecycle state transitions, status fields, guards, terminal states, or transition effects.
   - Use discriminated unions or sealed types for closed data variants when the language supports them.
6. Keep orchestration explicit. A composed object may own the workflow, but it should delegate each variable behavior to a collaborator rather than reaching into subclass hooks.
7. Keep construction outside the core object when collaborators are replaceable or external. If the change introduces injected collaborators, apply `dependency-injection`; if those collaborators cross provider or protocol boundaries, also apply `adapter-boundary`.
8. Keep framework subclasses thin when inheritance is unavoidable.
   - They may parse requests, extract framework context, call use cases, and map responses.
   - They should not contain domain policy, external API calls, database queries, complex state transitions, or provider-specific translation.
9. Use temporary wrappers only for migration.
   - A legacy subclass may delegate to a new composed implementation to preserve public API.
   - New code should use the composed implementation directly.
   - Remove wrappers after callers have migrated.
10. Guard against over-composition.
    - Do not create interfaces for one-line pure functions, stable internal helpers, or single implementations with no external boundary and no test replacement need.
    - If every class only delegates once, constructor setup becomes harder than the business logic, or a dependency object becomes broad, simplify.
11. Protect behavior with tests.
    - Before refactoring an inheritance tree, add or reuse tests around the observable behavior.
    - Prefer fake collaborators over parent-state setup.
    - Add tests for each extracted policy, strategy, adapter, decorator, or state transition when the behavior is meaningful.
12. Verify with the narrowest configured command intents that cover changed source, tests, templates, docs, release metadata, and mustflow checks.

<!-- mustflow-section: postconditions -->
## Postconditions

- New application code does not add inheritance for implementation reuse.
- Any remaining inheritance is shallow, justified, and isolated to framework, error, test, or closed-type cases.
- Shared behavior lives in functions, role objects, policies, strategies, adapters, decorators, state machines, or explicit data structures.
- Variable behavior is selected by composition rather than subclass explosion.
- There is no protected mutable state, no-op override, parent-child type check, or `super()` call-order dependency in core logic.
- Tests can replace collaborators without constructing a fragile parent hierarchy.

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

Prefer the narrowest configured test or build intent that proves the affected behavior. Use documentation and release checks when skill routes, templates, public docs, package metadata, or installed-file surfaces change.

<!-- mustflow-section: failure-handling -->
## Failure Handling

- If inheritance is required by a framework, keep the subclass as an adapter and move business behavior to composed collaborators.
- If an inheritance refactor would break public API, add a temporary wrapper and report the migration path.
- If extracted collaborators are too many or too vague, collapse them into fewer functions or role objects with clearer ownership.
- If tests require protected state or parent internals, add higher-level behavior tests before changing structure.
- If a class still needs many collaborators after composition, look for mixed responsibilities and split the use case rather than adding a broad dependency bag.
- If local language features make a sealed hierarchy or discriminated union clearer than strategy objects, use the simpler closed-data representation and report why.

<!-- mustflow-section: output-format -->
## Output Format

- Inheritance or base-class surface reviewed
- Reason for keeping or replacing inheritance
- Change dimensions identified
- Composition pattern selected
- Framework or error inheritance exceptions, if any
- Collaborators, functions, policies, strategies, facades, adapters, decorators, or state machines added or reused
- Temporary compatibility wrappers, if any
- Tests added or reused
- Command intents run
- Skipped checks and reasons
- Remaining inheritance or composition risk
