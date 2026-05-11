---
mustflow_doc: skill.null-object-pattern
locale: fr
canonical: false
revision: 1
lifecycle: mustflow-owned
authority: procedure
name: null-object-pattern
description: Apply this skill when repeated null, undefined, None, or nil checks, optional dependencies, disabled integrations, no-op collaborators, identity processors, null loggers, null analytics, null caches, or optional notifications could be replaced by a safe neutral implementation of the same interface without hiding required failures, security checks, payments, persistence, file uploads, audit trails, or not-found results.
metadata:
  mustflow_schema: "1"
  mustflow_kind: procedure
  pack_id: mustflow.core
  skill_id: mustflow.core.null-object-pattern
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

# Null Object Pattern

<!-- mustflow-section: purpose -->
## Purpose

Replace repeated absence checks for optional collaborators with a same-interface object that performs an honest neutral behavior.

Use this skill when "no collaborator" is a normal configured state and the caller should keep the same workflow whether the real implementation is present or not. A null object is not a way to hide failure. It is only valid when doing nothing, returning a cache miss, returning a skipped outcome, or returning the input unchanged is domain-correct.

Null Object means "this optional thing is intentionally absent." It must never mean "a required thing failed, so pretend everything is fine."

<!-- mustflow-section: use-when -->
## Use When

- Code repeatedly checks `null`, `undefined`, `None`, or `nil` before calling the same optional collaborator.
- A logger, product analytics client, optional notification sender, optional webhook publisher, optional scheduler, optional metrics sink, or optional post-processor may be disabled without breaking the main operation.
- A cache can be disabled while the source-of-truth lookup still works; the neutral cache behavior is always miss.
- A post-processor, transformer, or policy can safely return the input unchanged or a true zero value.
- A feature is explicitly disabled by configuration and the disabled behavior is a stable part of the system contract.
- A strategy family needs a no-op, disabled, identity, empty, or zero policy implementation that is honest about what happened.

<!-- mustflow-section: do-not-use-when -->
## Do Not Use When

- The missing collaborator is required for correctness, durability, security, money movement, legal traceability, or data integrity.
- The area is payment, authentication, authorization, permission enforcement, persistence, file storage, audit logging, security event recording, or required external delivery.
- The caller must know whether a value exists, a resource was found, or an operation actually happened; use `result-option` instead.
- A dependency is missing because configuration is wrong or initialization failed; fail at startup or return a required-configuration error instead.
- A repository lookup returns no user, order, file, subscription, entitlement, or domain entity; use `Option`, `Result`, or a local lookup result.
- The null object would return a fake success, fake identifier, fake URL, fake saved row, fake paid transaction, fake permission grant, or fake sent message.
- The implementation needs request-specific mutable state; use a fake, mock, spy, or real collaborator instead.

<!-- mustflow-section: required-inputs -->
## Required Inputs

- The collaborator or object whose absence is being modeled.
- The repeated null checks, optional type, or disabled integration path being changed.
- Whether absence is a normal configured state or a missing required dependency.
- Whether the caller needs to know if the operation was performed, skipped, absent, denied, or failed.
- The side effects involved, especially writes, payments, file storage, external sends, audit logs, and security checks.
- Existing local interfaces, dependency injection, strategy, `Result`, `Option`, configuration, fake, mock, and test patterns.
- Relevant command-intent contract entries for verification.

<!-- mustflow-section: preconditions -->
## Preconditions

- Higher-priority instructions and `.mustflow/config/commands.toml` have been checked for the current scope.
- The target absence satisfies all of these conditions:
  - Absence is a normal state.
  - Doing nothing or returning a neutral value is correct.
  - The caller does not need to branch on presence.
  - The neutral return value does not claim work was performed.
  - No security, payment, storage, file-upload, audit, or required-delivery responsibility is hidden.
  - The null object can satisfy the same interface contract as the real implementation.
- If the caller must branch on absence, use `result-option`.
- If concrete selection should happen at an assembly boundary, use `dependency-injection`.
- If the neutral implementation is one variant in a family of interchangeable behavior, use `strategy-pattern`.

<!-- mustflow-section: allowed-edits -->
## Allowed Edits

- Add same-interface implementations named `Null*`, `Noop*`, `Disabled*`, `Identity*`, `Empty*`, `DenyAll*`, or `Failing*` when the name matches the behavior.
- Replace nullable collaborator types with non-null interface types at call sites.
- Move real-versus-neutral implementation selection to an assembly root, dependency-injection registration, factory, or module initialization boundary.
- Return honest neutral outcomes such as skipped, disabled, cache miss, empty result, zero amount, or unchanged input.
- Add tests for callability, neutral return values, no external side effects, caller behavior without presence checks, and no fake success.
- Do not use null objects to swallow runtime exceptions, hide initialization failures, skip required persistence, bypass authorization, or forge successful side effects.

<!-- mustflow-section: procedure -->
## Procedure

1. Classify the absence.
   - Normal optional collaborator: null object may be valid.
   - Meaningful missing value: use `Option` or a local lookup result.
   - Expected failure: use `Result`.
   - Required dependency missing: fail at startup or return a required-configuration failure.
   - Security default: use an explicit deny-all policy, not a permissive null object.
2. Check the risk boundary.
   - Reject null objects for payments, authentication, authorization, required persistence, file uploads, audit trails, legal logs, required notifications, and required provider calls.
   - If the absence can lose data, lose money, grant access, skip accountability, or corrupt state, do not use this pattern.
3. Define or reuse the interface first.
   - The real object and the null object must implement the same consumer-facing contract.
   - Do not add a special `doNothing` API that forces callers to branch again.
4. Choose the honest neutral behavior.
   - Optional notification disabled: return `skipped` or a local disabled outcome, not `sent`.
   - Cache disabled: return miss, not a hit with `undefined`.
   - Analytics disabled: no-op without per-call noise.
   - Post-processor absent: return the input unchanged.
   - Discount absent: return a true zero discount.
   - Permission system unavailable: deny, fail closed, or fail startup; never allow by default.
5. Name the implementation by what it does.
   - Use `Null*` for object absence.
   - Use `Noop*` when calls intentionally do nothing.
   - Use `Disabled*` when configuration turns the feature off.
   - Use `Identity*` when input is returned unchanged.
   - Use `Empty*` for a true empty collection or empty domain result.
   - Use `DenyAll*` for fail-closed security policy.
   - Use `Failing*` when a required dependency is missing and should fail loudly.
6. Remove nullable types from callers.
   - Constructor or function dependencies should become the interface type, not `Interface | null` or an optional parameter.
   - Callers should invoke the collaborator directly and should not contain presence checks for that collaborator.
7. Select implementations at the assembly boundary.
   - Choose the real implementation or the null object in bootstrap, dependency-injection registration, module setup, factory setup, or test setup.
   - Do not make business services read configuration and construct their own null objects.
8. Keep null objects stateless.
   - Store no current user, request, file, transaction state, intermediate result, or call history.
   - A stateless null object can usually be reused as a singleton.
   - If call recording is needed, that object is a fake, mock, spy, or metrics tool, not the production null object.
9. Do not swallow construction or runtime failures.
   - Use a null object only when a feature is explicitly disabled.
   - Do not catch a failed real implementation constructor and silently replace it with a null object.
10. Keep persistence and serialization honest.
    - Do not persist a null object instance.
    - Persist configuration or domain facts such as `notificationsEnabled = false`.
11. Add observability at the right level.
    - It is acceptable to log once at startup or expose health/status that an optional feature is disabled.
    - Do not make the null object emit a warning for every skipped call unless the local system explicitly requires it.
12. Test the contract.
    - Test that the null object can be called through the shared interface.
    - Test the neutral return value.
    - Test that no external collaborator is called.
    - Test that the main caller works without a null check.
    - Test that fake success is not returned.

<!-- mustflow-section: postconditions -->
## Postconditions

- Optional collaborator absence is represented by a same-interface neutral implementation.
- Callers no longer carry nullable dependency types or repeated presence checks for the optional collaborator.
- The neutral implementation does not fake success, forge identifiers, grant permission, skip required persistence, or hide required side effects.
- Real versus neutral implementation selection is visible at an assembly or configuration boundary.
- Tests cover callability, neutral return values, no side effects, caller behavior, and no fake success.

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

Prefer focused tests for the caller whose nullable dependency was removed and for the neutral implementation. Use release or documentation checks when templates, public docs, package metadata, skill routes, or installed-file surfaces change.

<!-- mustflow-section: failure-handling -->
## Failure Handling

- If the neutral object would hide a required failure, stop and use startup validation, `Result`, `Option`, `DenyAll*`, or `Failing*` instead.
- If the caller still needs to know whether work happened, return an explicit skipped or disabled outcome rather than pretending success.
- If the local interface cannot support an honest neutral implementation, redesign the interface or keep explicit `Result`/`Option` handling.
- If a null object was introduced to recover from an exception, remove the fallback and expose the initialization or configuration failure.
- If a null object grows mutable state or call history, split that behavior into a test fake, mock, spy, or metrics decorator.

<!-- mustflow-section: output-format -->
## Output Format

- Absence classified as optional, meaningful absence, expected failure, required dependency, or security default
- Null Object used or deliberately rejected
- Interface and neutral implementation added or reused
- Assembly or configuration boundary used for selection
- Nullable caller types or checks removed
- Result, Option, Strategy, Dependency Injection, or Adapter boundaries used with this skill
- Tests or verification evidence
- Skipped checks and remaining hidden-failure risk
